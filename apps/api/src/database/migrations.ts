import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load .env from project root
// Try multiple paths: project root (3 levels up from src/database), or current working directory
const possibleEnvPaths = [
  resolve(process.cwd(), '../../.env'), // From apps/api/ to project root
  resolve(process.cwd(), '.env'), // Current directory
  resolve(__dirname, '../../../.env'), // From dist/database/ to project root
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log(`📄 Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  // Fallback: try default dotenv behavior (current directory)
  config();
  console.log(`⚠️  .env not found in standard locations, using default dotenv behavior`);
}

/**
 * Simple migration runner compatible with Flyway naming convention
 * Migrations are stored in migrations/ directory with format: V{version}__{description}.sql
 */
class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;

  constructor() {
    // Try to construct database URL from environment variables
    const host = process.env.POSTGRES_HOST || 'localhost';
    const port = process.env.POSTGRES_PORT || '5432';
    const user = process.env.POSTGRES_USER || 'bmad';
    const password = process.env.POSTGRES_PASSWORD || 'bmad';
    const database = process.env.POSTGRES_DB || 'bmad_stock_agent';
    
    const databaseUrl = process.env.DATABASE_URL || 
      `postgresql://${user}:${password}@${host}:${port}/${database}`;

    // Debug: Show connection URL (mask password)
    const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`🔗 Connecting to database: ${maskedUrl}`);
    console.log(`📄 DATABASE_URL from env: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`📄 POSTGRES_HOST: ${host}, PORT: ${port}, USER: ${user}, DB: ${database}`);
    console.log(`📄 POSTGRES_PASSWORD: ${password ? 'SET' : 'NOT SET'}`);
    
    // Remove ?schema=public if present (can cause connection issues)
    const cleanDatabaseUrl = databaseUrl.replace(/\?schema=.*$/, '');

    this.pool = new Pool({
      connectionString: cleanDatabaseUrl,
      // Add connection retry logic
      connectionTimeoutMillis: 10000,
      // Don't fail immediately on connection errors
      allowExitOnIdle: false,
    });

    // Resolve migrations directory relative to this file
    this.migrationsPath = join(__dirname, '../../migrations');
  }

  /**
   * Create migrations tracking table if it doesn't exist
   */
  private async ensureMigrationsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        description VARCHAR(255),
        installed_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT true
      )
    `);
  }

  /**
   * Get list of already applied migrations
   */
  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.pool.query<{ version: string }>(
      'SELECT version FROM schema_migrations WHERE success = true ORDER BY version'
    );
    return result.rows.map(row => row.version);
  }

  /**
   * Parse migration filename to extract version and description
   * Format: V{version}__{description}.sql
   */
  private parseMigrationFilename(filename: string): { version: string; description: string } | null {
    const match = filename.match(/^V(\d+)__(.+)\.sql$/);
    if (!match) {
      return null;
    }
    return {
      version: match[1],
      description: match[2].replace(/_/g, ' '),
    };
  }

  /**
   * Get all migration files sorted by version
   */
  private async getMigrationFiles(): Promise<Array<{ filename: string; version: string; description: string }>> {
    const files = await readdir(this.migrationsPath);
    const migrations = files
      .map(filename => {
        const parsed = this.parseMigrationFilename(filename);
        if (!parsed) return null;
        return { filename, ...parsed };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => parseInt(a.version) - parseInt(b.version));

    return migrations;
  }

  /**
   * Run a single migration
   */
  private async runMigration(
    filename: string,
    version: string,
    description: string,
    sql: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(sql);
      
      // Record migration
      await client.query(
        'INSERT INTO schema_migrations (version, description, success) VALUES ($1, $2, true) ON CONFLICT (version) DO NOTHING',
        [version, description]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${version} (${description}) applied successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      // Record failed migration with detailed error info
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Migration ${version} (${description}) failed:`, errorMessage);
      
      await client.query(
        'INSERT INTO schema_migrations (version, description, success) VALUES ($1, $2, false) ON CONFLICT (version) DO UPDATE SET success = false',
        [version, description]
      );
      
      // Re-throw with more context
      const enhancedError = new Error(
        `Migration ${version} (${description}) failed: ${errorMessage}`
      );
      if (error instanceof Error && error.stack) {
        enhancedError.stack = error.stack;
      }
      throw enhancedError;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    try {
      await this.ensureMigrationsTable();
      const appliedMigrations = await this.getAppliedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      const pendingMigrations = migrationFiles.filter(
        m => !appliedMigrations.includes(m.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }

      console.log(`📦 Found ${pendingMigrations.length} pending migration(s)`);

      for (const migration of pendingMigrations) {
        const sql = await readFile(
          join(this.migrationsPath, migration.filename),
          'utf-8'
        );
        await this.runMigration(migration.filename, migration.version, migration.description, sql);
      }

      console.log('✅ All migrations applied successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async status(): Promise<Array<{ version: string; description: string; applied: boolean }>> {
    await this.ensureMigrationsTable();
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    return migrationFiles.map(m => ({
      version: m.version,
      description: m.description,
      applied: appliedMigrations.includes(m.version),
    }));
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Run migrations (can be called from CLI or application startup)
 */
export async function runMigrations(): Promise<void> {
  const runner = new MigrationRunner();
  try {
    await runner.migrate();
  } finally {
    await runner.close();
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<Array<{ version: string; description: string; applied: boolean }>> {
  const runner = new MigrationRunner();
  try {
    return await runner.status();
  } finally {
    await runner.close();
  }
}

// CLI support: run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export default MigrationRunner;
