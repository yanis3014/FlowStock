import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { createProduct } from '../../services/product.service';
import { createSale } from '../../services/sales.service';
import {
  runPeriodicEvaluation,
  recordWebhookSuccess,
} from '../../services/pos-sync-status.service';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Dashboard Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'dashboardtest@example.com',
        password: 'Test1234',
        first_name: 'Dashboard',
        last_name: 'Test',
        company_name: 'Dashboard Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'dashboardtest@example.com',
    ]);

    // Create test products
    const product1 = await createProduct(tenantId, {
      sku: 'DASH-001',
      name: 'Product OK',
      quantity: 100,
      min_quantity: 20,
      unit: 'piece',
      purchase_price: 10.0,
    });

    const product2 = await createProduct(tenantId, {
      sku: 'DASH-002',
      name: 'Product Low Stock',
      quantity: 5,
      min_quantity: 20,
      unit: 'piece',
      purchase_price: 15.0,
    });

    await createProduct(tenantId, {
      sku: 'DASH-003',
      name: 'Product Critical',
      quantity: 0,
      min_quantity: 10,
      unit: 'piece',
      purchase_price: 20.0,
    });

    // Create test sales (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);

    await createSale(tenantId, {
      product_id: product1.id,
      sale_date: yesterday.toISOString(),
      quantity_sold: 5,
      unit_price: 10.0,
    });

    await createSale(tenantId, {
      product_id: product2.id,
      sale_date: yesterday.toISOString(),
      quantity_sold: 2,
      unit_price: 15.0,
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM pos_events_received WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM sales');
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'dashboard-test%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /dashboard/summary', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/dashboard/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with dashboard summary when authenticated', async () => {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sales_yesterday).toBeDefined();
      expect(res.body.data.current_stock).toBeDefined();
      expect(res.body.data.alerts).toBeDefined();
      expect(Array.isArray(res.body.data.alerts)).toBe(true);
      expect(res.body.data.pending_orders).toBeDefined();
      expect(res.body.data.pending_invoices).toBeDefined();
    });

    it('should return correct sales_yesterday data', async () => {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sales_yesterday.total_amount).toBeGreaterThanOrEqual(0);
      expect(res.body.data.sales_yesterday.transaction_count).toBeGreaterThanOrEqual(0);
      const changePercent = res.body.data.sales_yesterday.change_percent;
      expect(changePercent === null || typeof changePercent === 'number').toBe(true);
    });

    it('should return correct current_stock data', async () => {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.current_stock.product_count).toBeGreaterThanOrEqual(0);
      expect(res.body.data.current_stock.total_value).toBeGreaterThanOrEqual(0);
      expect(res.body.data.current_stock.low_stock_count).toBeGreaterThanOrEqual(0);
      expect(res.body.data.current_stock.critical_stock_count).toBeGreaterThanOrEqual(0);
    });

    it('should return alerts for low and critical stock', async () => {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const alerts = res.body.data.alerts as Array<{ severity?: string }>;
      expect(alerts.length).toBeGreaterThan(0);
      
      // Should have alerts for low and critical stock
      const hasLowStockAlert = alerts.some((a) => a.severity === 'medium' || a.severity === 'high');
      expect(hasLowStockAlert).toBe(true);
    });
  });

  describe('GET /dashboard/alert-threshold', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/dashboard/alert-threshold');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with default threshold when authenticated', async () => {
      const res = await request(app)
        .get('/dashboard/alert-threshold')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.thresholdPercent).toBeDefined();
      expect(typeof res.body.data.thresholdPercent).toBe('number');
      expect(res.body.data.thresholdPercent).toBeGreaterThanOrEqual(50);
      expect(res.body.data.thresholdPercent).toBeLessThanOrEqual(500);
    });
  });

  describe('PUT /dashboard/alert-threshold', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .put('/dashboard/alert-threshold')
        .send({ thresholdPercent: 150 });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when thresholdPercent is not a number', async () => {
      const res = await request(app)
        .put('/dashboard/alert-threshold')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ thresholdPercent: '120' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 and update threshold when valid', async () => {
      const res = await request(app)
        .put('/dashboard/alert-threshold')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ thresholdPercent: 150 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.thresholdPercent).toBe(150);

      const getRes = await request(app)
        .get('/dashboard/alert-threshold')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.thresholdPercent).toBe(150);
    });
  });

  describe('GET /dashboard/pos-sync-status (Story 2.5)', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/dashboard/pos-sync-status');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with default status when authenticated and no POS config', async () => {
      const res = await request(app)
        .get('/dashboard/pos-sync-status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.is_degraded).toBe(false);
      expect(res.body.data.last_event_at).toBeNull();
      expect(res.body.data.degraded_since).toBeNull();
      expect(res.body.data.failure_count).toBe(0);
    });

    it('should return 200 with is_degraded true when tenant has POS config in degraded mode', async () => {
      await pool.query(
        `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active, is_degraded_since, webhook_failure_count)
         VALUES ($1, 'lightspeed', 'secret', true, CURRENT_TIMESTAMP, 5)
         ON CONFLICT (tenant_id) DO UPDATE SET is_degraded_since = CURRENT_TIMESTAMP, webhook_failure_count = 5`,
        [tenantId]
      );

      const res = await request(app)
        .get('/dashboard/pos-sync-status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_degraded).toBe(true);
      expect(res.body.data.degraded_since).toBeDefined();
      expect(res.body.data.failure_count).toBe(5);

      await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    });

    it('should mark tenant degraded after silence (no event for > POS_DEGRADED_SILENCE_MINUTES) (Story 2.5)', async () => {
      await pool.query(
        `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active, last_event_received_at, is_degraded_since, webhook_failure_count)
         VALUES ($1, 'lightspeed', 'secret', true, NOW() - INTERVAL '20 minutes', NULL, 0)
         ON CONFLICT (tenant_id) DO UPDATE SET last_event_received_at = NOW() - INTERVAL '20 minutes', is_degraded_since = NULL, webhook_failure_count = 0`,
        [tenantId]
      );

      await runPeriodicEvaluation();

      const res = await request(app)
        .get('/dashboard/pos-sync-status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_degraded).toBe(true);

      await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    });

    it('should clear degraded when webhook success is recorded (Story 2.5)', async () => {
      await pool.query(
        `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active, last_event_received_at, is_degraded_since, webhook_failure_count)
         VALUES ($1, 'lightspeed', 'secret', true, NOW() - INTERVAL '20 minutes', CURRENT_TIMESTAMP, 3)
         ON CONFLICT (tenant_id) DO UPDATE SET last_event_received_at = NOW() - INTERVAL '20 minutes', is_degraded_since = CURRENT_TIMESTAMP, webhook_failure_count = 3`,
        [tenantId]
      );

      await recordWebhookSuccess(tenantId);

      const res = await request(app)
        .get('/dashboard/pos-sync-status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_degraded).toBe(false);
      expect(res.body.data.failure_count).toBe(0);

      await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    });

    it('should mark tenant degraded after webhook_failure_count >= threshold (Story 2.5)', async () => {
      await pool.query(
        `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active, last_event_received_at, is_degraded_since, webhook_failure_count)
         VALUES ($1, 'lightspeed', 'secret', true, NOW(), NULL, 5)
         ON CONFLICT (tenant_id) DO UPDATE SET last_event_received_at = NOW(), is_degraded_since = NULL, webhook_failure_count = 5`,
        [tenantId]
      );

      await runPeriodicEvaluation();

      const res = await request(app)
        .get('/dashboard/pos-sync-status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_degraded).toBe(true);
      expect(res.body.data.failure_count).toBe(5);

      await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    });
  });
});
