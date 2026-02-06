import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Stock Estimates Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let productId: string;
  let productId2: string;

  // Second tenant for multi-tenant test
  let accessToken2: string;
  let tenantId2: string;

  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    // --- Tenant 1 ---
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'stockest-t1@example.com',
        password: 'Test1234',
        first_name: 'StockEst',
        last_name: 'T1',
        company_name: 'StockEst Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'stockest-t1@example.com',
    ]);

    // Create product with stock 100
    const prodRes1 = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'STEST-PROD-1',
        name: 'Produit Estimation 1',
        unit: 'piece',
        quantity: 100,
        purchase_price: 10,
        selling_price: 15,
        lead_time_days: 7,
      });
    expect(prodRes1.status).toBe(201);
    productId = prodRes1.body.data.id;

    // Create product with stock 50, no sales will be added
    const prodRes2 = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'STEST-PROD-2',
        name: 'Produit Estimation 2',
        unit: 'piece',
        quantity: 50,
      });
    expect(prodRes2.status).toBe(201);
    productId2 = prodRes2.body.data.id;

    // Add sales for product 1: 10 sales, 5 units each, on distinct days
    for (let i = 1; i <= 10; i++) {
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - i);
      const dateStr = saleDate.toISOString().split('T')[0];
      await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          quantity_sold: 5,
          sale_date: dateStr,
          unit_price: 15,
        });
    }

    // --- Tenant 2 ---
    const registerRes2 = await request(app)
      .post('/auth/register')
      .send({
        email: 'stockest-t2@example.com',
        password: 'Test1234',
        first_name: 'StockEst',
        last_name: 'T2',
        company_name: 'StockEst Other Company',
      });
    expect(registerRes2.status).toBe(201);
    accessToken2 = registerRes2.body.data.access_token;
    tenantId2 = registerRes2.body.data.tenant.id;

    await db.queryWithTenant(tenantId2, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'stockest-t2@example.com',
    ]);
  }, 60000);

  afterAll(async () => {
    await pool.query('DELETE FROM sales');
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM locations');
    await pool.query('DELETE FROM suppliers');
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'stockest%'");
    await pool.end();
    await closeDatabase();
  });

  // ==========================================================================
  // GET /stock-estimates
  // ==========================================================================
  describe('GET /stock-estimates', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/stock-estimates');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with list of estimates for all products', async () => {
      const res = await request(app)
        .get('/stock-estimates')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      // Find product 1 (has sales)
      const est1 = res.body.data.find(
        (e: { product_id: string }) => e.product_id === productId
      );
      expect(est1).toBeDefined();
      expect(est1.current_stock).toBe(100);
      expect(est1.avg_daily_consumption).toBeGreaterThan(0);
      expect(est1.days_remaining).toBeGreaterThan(0);
      expect(est1.estimated_stockout_date).not.toBeNull();
      expect(est1.confidence_level).toBeDefined();
      expect(est1.period_days).toBe(30);

      // Find product 2 (no sales)
      const est2 = res.body.data.find(
        (e: { product_id: string }) => e.product_id === productId2
      );
      expect(est2).toBeDefined();
      expect(est2.current_stock).toBe(50);
      expect(est2.avg_daily_consumption).toBeNull();
      expect(est2.days_remaining).toBeNull();
      expect(est2.confidence_level).toBe('insufficient');
    });

    it('should accept period_days=7 as query param', async () => {
      const res = await request(app)
        .get('/stock-estimates?period_days=7')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.length).toBe(2);
      // Product 1 with 7-day period — should reflect only sales in last 7 days
      const est1 = data.find(
        (e: { product_id: string }) => e.product_id === productId
      );
      expect(est1.period_days).toBe(7);
    });

    it('should return 400 for period_days < 7', async () => {
      const res = await request(app)
        .get('/stock-estimates?period_days=3')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for period_days > 365', async () => {
      const res = await request(app)
        .get('/stock-estimates?period_days=500')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should sort by urgency (days_remaining ASC, nulls last)', async () => {
      const res = await request(app)
        .get('/stock-estimates')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      const data = res.body.data;

      // Product with sales (finite days_remaining) should come before product without sales (null)
      const firstHasDays = data[0].days_remaining !== null;
      const lastIsNull = data[data.length - 1].days_remaining === null;
      expect(firstHasDays).toBe(true);
      expect(lastIsNull).toBe(true);
    });
  });

  // ==========================================================================
  // GET /stock-estimates/:productId
  // ==========================================================================
  describe('GET /stock-estimates/:productId', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/stock-estimates/${productId}`);
      expect(res.status).toBe(401);
    });

    it('should return 200 with estimate for specific product', async () => {
      const res = await request(app)
        .get(`/stock-estimates/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product_id).toBe(productId);
      expect(res.body.data.product_name).toBe('Produit Estimation 1');
      expect(res.body.data.avg_daily_consumption).toBeGreaterThan(0);
      expect(res.body.data.days_remaining).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      const res = await request(app)
        .get(`/stock-estimates/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/stock-estimates/not-a-uuid')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should accept period_days query param', async () => {
      const res = await request(app)
        .get(`/stock-estimates/${productId}?period_days=14`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.period_days).toBe(14);
    });
  });

  // ==========================================================================
  // Multi-tenant isolation
  // ==========================================================================
  describe('Multi-tenant isolation', () => {
    it('should return empty estimates for tenant 2 (no products)', async () => {
      const res = await request(app)
        .get('/stock-estimates')
        .set('Authorization', `Bearer ${accessToken2}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should not see tenant 1 product from tenant 2', async () => {
      const res = await request(app)
        .get(`/stock-estimates/${productId}`)
        .set('Authorization', `Bearer ${accessToken2}`);
      expect(res.status).toBe(404);
    });
  });
});
