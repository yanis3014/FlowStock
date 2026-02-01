import { Pool } from 'pg';
import { resolve } from 'path';
import { runMigrations, getMigrationStatus } from '../../database/migrations';
import dotenv from 'dotenv';

// Load project root .env so DATABASE_URL matches migration runner
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Database Migrations', () => {
  let pool: Pool;
  const testDbUrl = process.env.DATABASE_URL || 
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up migrations table and tenants table before each test
    await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    await pool.query('DROP TABLE IF EXISTS tenants CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS set_tenant_context(UUID) CASCADE');
  });

  describe('Migration execution', () => {
    it('should create schema_migrations table', async () => {
      await runMigrations();
      
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'schema_migrations'
        )
      `);
      
      expect(result.rows[0].exists).toBe(true);
    });

    it('should create tenants table with correct structure', async () => {
      await runMigrations();
      
      // Check table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'tenants'
        )
      `);
      expect(tableExists.rows[0].exists).toBe(true);

      // Check columns
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'tenants'
        ORDER BY ordinal_position
      `);

      const columnNames = columns.rows.map(r => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('company_name');
      expect(columnNames).toContain('slug');
      expect(columnNames).toContain('industry');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
      expect(columnNames).toContain('is_active');
      expect(columnNames).toContain('settings');

      // Check constraints
      const constraints = await pool.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'tenants'
      `);
      
      const constraintTypes = constraints.rows.map(r => r.constraint_type);
      expect(constraintTypes).toContain('PRIMARY KEY');
      expect(constraintTypes).toContain('UNIQUE');
      expect(constraintTypes).toContain('CHECK');
    });

    it('should create indexes on tenants table', async () => {
      await runMigrations();
      
      const indexes = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'tenants'
      `);
      
      const indexNames = indexes.rows.map(r => r.indexname);
      expect(indexNames).toContain('idx_tenants_slug');
      expect(indexNames).toContain('idx_tenants_active');
    });

    it('should create set_tenant_context function', async () => {
      await runMigrations();
      
      const functions = await pool.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_name = 'set_tenant_context'
      `);
      
      expect(functions.rows.length).toBeGreaterThan(0);
    });

    it('should record migrations in schema_migrations table', async () => {
      await runMigrations();
      
      const migrations = await pool.query(`
        SELECT version, description, success
        FROM schema_migrations
        ORDER BY version
      `);
      
      expect(migrations.rows.length).toBeGreaterThanOrEqual(2);
      expect(migrations.rows.every(m => m.success === true)).toBe(true);
    });

    it('should be idempotent (can run multiple times)', async () => {
      await runMigrations();
      const firstRun = await getMigrationStatus();
      
      await runMigrations();
      const secondRun = await getMigrationStatus();
      
      expect(secondRun).toEqual(firstRun);
    });
  });

  describe('Migration status', () => {
    it('should return migration status', async () => {
      await runMigrations();
      
      const status = await getMigrationStatus();
      
      expect(status.length).toBeGreaterThanOrEqual(2);
      expect(status.every((s: { version: string; description: string; applied: boolean }) => s.applied === true)).toBe(true);
    });
  });
});
