import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Subscriptions Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    // Register and verify a user to get token
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'subtest@example.com',
        password: 'Test1234',
        first_name: 'Sub',
        last_name: 'Test',
        company_name: 'Sub Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    // Verify email so login works
    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'subtest@example.com',
    ]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'sub-test%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /subscriptions/current', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/subscriptions/current');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with subscription data when authenticated', async () => {
      const res = await request(app)
        .get('/subscriptions/current')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.tier).toBe('normal');
      expect(res.body.data.status).toMatch(/trial|active/);
      expect(res.body.data.features).toBeDefined();
      expect(res.body.data.features.ai_predictions).toBe(false);
      expect(res.body.data.features.history_days).toBe(30);
    });
  });

  describe('POST /subscriptions/upgrade', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/subscriptions/upgrade')
        .send({ new_tier: 'premium' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid new_tier', async () => {
      const res = await request(app)
        .post('/subscriptions/upgrade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_tier: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 and update tier to premium', async () => {
      const res = await request(app)
        .post('/subscriptions/upgrade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_tier: 'premium' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.old_tier).toBe('normal');
      expect(res.body.data.new_tier).toBe('premium');
      expect(res.body.data.subscription_id).toBeDefined();
      expect(res.body.data.effective_date).toBeDefined();
    });

    it('should return 400 when tier unchanged', async () => {
      // Already premium from previous test; sending premium again
      const res = await request(app)
        .post('/subscriptions/upgrade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_tier: 'premium' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('unchanged');
    });
  });

  describe('GET /subscriptions/premium-only (requireTier middleware)', () => {
    it('should return 200 when tenant has premium tier', async () => {
      const res = await request(app)
        .get('/subscriptions/premium-only')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Premium');
    });
  });

  describe('requireTier 403 when tier insufficient', () => {
    let normalToken: string;

    beforeAll(async () => {
      const reg = await request(app)
        .post('/auth/register')
        .send({
          email: 'normalonly@example.com',
          password: 'Test1234',
          company_name: 'Normal Only Company',
        });
      expect(reg.status).toBe(201);
      normalToken = reg.body.data.access_token;
      const tid = reg.body.data.tenant.id;
      const db = getDatabase();
      await db.queryWithTenant(tid, `UPDATE users SET email_verified = true WHERE email = $1`, [
        'normalonly@example.com',
      ]);
    });

    it('should return 403 for premium-only route when tier is normal', async () => {
      const res = await request(app)
        .get('/subscriptions/premium-only')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('subscription tier');
    });

    afterAll(async () => {
      await pool.query("DELETE FROM subscription_changes WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = 'normal-only-company')");
      await pool.query("DELETE FROM subscriptions WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = 'normal-only-company')");
      await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)', ['normalonly@example.com']);
      await pool.query('DELETE FROM users WHERE email = $1', ['normalonly@example.com']);
      await pool.query("DELETE FROM tenants WHERE slug = 'normal-only-company'");
    });
  });
});
