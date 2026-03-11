import request from 'supertest';
import { resolve } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Admin API Integration Tests', () => {
  let pool: Pool;
  let adminToken: string;
  let nonAdminToken: string;
  let adminTenantId: string;
  let adminUserId: string;
  let nonAdminTenantId: string;

  const suffix = Date.now();
  const adminEmail = `admin-${suffix}@example.com`;
  const nonAdminEmail = `owner-${suffix}@example.com`;
  const adminSlug = `admintenant${suffix}`;
  const nonAdminSlug = `ownertenant${suffix}`;

  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const adminRegisterRes = await request(app).post('/auth/register').send({
      email: adminEmail,
      password: 'Test1234',
      first_name: 'Admin',
      last_name: 'Tester',
      company_name: adminSlug,
    });

    expect(adminRegisterRes.status).toBe(201);
    adminToken = adminRegisterRes.body.data.access_token;
    adminTenantId = adminRegisterRes.body.data.tenant.id as string;
    adminUserId = adminRegisterRes.body.data.user.id as string;

    const nonAdminRegisterRes = await request(app).post('/auth/register').send({
      email: nonAdminEmail,
      password: 'Test1234',
      first_name: 'Owner',
      last_name: 'Tester',
      company_name: nonAdminSlug,
    });

    expect(nonAdminRegisterRes.status).toBe(201);
    nonAdminToken = nonAdminRegisterRes.body.data.access_token;
    nonAdminTenantId = nonAdminRegisterRes.body.data.tenant.id as string;

    const db = getDatabase();
    await db.queryWithTenant(adminTenantId, 'UPDATE users SET role = $1, email_verified = true WHERE id = $2', [
      'admin',
      adminUserId,
    ]);
    await db.queryWithTenant(nonAdminTenantId, 'UPDATE users SET email_verified = true WHERE email = $1', [
      nonAdminEmail,
    ]);
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM subscription_changes
       WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ($1, $2))`,
      [adminSlug, nonAdminSlug]
    );
    await pool.query(
      `DELETE FROM subscriptions
       WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ($1, $2))`,
      [adminSlug, nonAdminSlug]
    );
    await pool.query(
      `DELETE FROM refresh_tokens
       WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))`,
      [adminEmail, nonAdminEmail]
    );
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [adminEmail, nonAdminEmail]);
    await pool.query('DELETE FROM tenants WHERE slug IN ($1, $2)', [adminSlug, nonAdminSlug]);
    await pool.end();
    await closeDatabase();
  });

  it('GET /api/admin/stats should return global stats for admin token', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(0);
    expect(res.body.data.totalRestaurants).toBeGreaterThanOrEqual(0);
    expect(res.body.data.subscriptions).toBeDefined();
    expect(typeof res.body.data.subscriptions.normal).toBe('number');
  });

  it('GET /api/admin/stats should return 403 for non-admin token', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/admin/users should return paginated users for admin', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
  });
});
