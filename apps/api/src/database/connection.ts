import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logError } from '../utils/logger';
import { getDatabaseUrl } from '../config';

/**
 * Database connection pool for PostgreSQL
 * Manages connections with multi-tenant support via Row-Level Security (RLS)
 */
class DatabaseConnection {
  private pool: Pool;

  constructor() {
    const databaseUrl = getDatabaseUrl();

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: process.env.NODE_ENV === 'production' ? 5000 : 10000, // Longer timeout for dev
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logError(err, { context: 'database_pool_idle_client' });
      process.exit(-1);
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a query with tenant context
   * Sets app.current_tenant before executing the query for RLS filtering
   * 
   * @param tenantId - The tenant UUID
   * @param queryText - SQL query text
   * @param values - Query parameters
   * @returns Query result
   */
  async queryWithTenant<T extends QueryResultRow = any>(
    tenantId: string,
    queryText: string,
    values?: any[]
  ): Promise<QueryResult<T>> {
    const client = await this.getClient();
    try {
      // Set tenant context for RLS (cast to UUID so PostgreSQL accepts the param)
      await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);
      
      // Execute the actual query
      const result = await client.query<T>(queryText, values);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query without tenant context (for system/admin queries)
   * Use with caution - only for queries on tables without RLS (e.g., tenants table)
   * 
   * @param queryText - SQL query text
   * @param values - Query parameters
   * @returns Query result
   */
  async query<T extends QueryResultRow = any>(
    queryText: string,
    values?: any[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(queryText, values);
  }

  /**
   * Execute a transaction with tenant context
   * 
   * @param tenantId - The tenant UUID
   * @param callback - Transaction callback function
   * @returns Result from callback
   */
  async transactionWithTenant<T>(
    tenantId: string,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      // Set tenant context for RLS (cast to UUID so PostgreSQL accepts the param)
      await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections in the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get the underlying pool (for advanced usage)
   */
  getPool(): Pool {
    return this.pool;
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

/**
 * Get the database connection instance (singleton)
 */
export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
  }
  return dbInstance;
}

/**
 * Close the pool and clear the singleton (for tests so Jest can exit)
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

export default getDatabase;
