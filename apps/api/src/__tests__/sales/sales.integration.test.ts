import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Sales Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let productId: string;
  let otherAccessToken: string;
  let otherTenantId: string;
  let otherTenantSaleId: string;
  let otherTenantProductId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'salestest@example.com',
        password: 'Test1234',
        first_name: 'Sales',
        last_name: 'Test',
        company_name: 'Sales Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'salestest@example.com',
    ]);

    const productRes = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'SALES-PROD-1',
        name: 'Produit pour ventes',
        unit: 'piece',
        quantity: 100,
      });
    expect(productRes.status).toBe(201);
    productId = productRes.body.data.id;

    const otherRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'salesother@example.com',
        password: 'Test1234',
        company_name: 'Sales Other Company',
      });
    expect(otherRes.status).toBe(201);
    otherAccessToken = otherRes.body.data.access_token;
    otherTenantId = otherRes.body.data.tenant.id;
    await db.queryWithTenant(otherTenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'salesother@example.com',
    ]);
    const otherProductRes = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({ sku: 'OTHER-1', name: 'Other Product', unit: 'piece', quantity: 10 });
    expect(otherProductRes.status).toBe(201);
    otherTenantProductId = otherProductRes.body.data.id;
    const otherSaleRes = await request(app)
      .post('/sales')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({
        product_id: otherProductRes.body.data.id,
        quantity_sold: 2,
        unit_price: 5,
      });
    expect(otherSaleRes.status).toBe(201);
    otherTenantSaleId = otherSaleRes.body.data.id;
  });

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
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'sales-test%' OR slug LIKE 'sales-other%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /sales', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/sales');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with empty list when no sales', async () => {
      const res = await request(app)
        .get('/sales')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('POST /sales', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/sales')
        .send({ product_id: productId, quantity_sold: 5 });
      expect(res.status).toBe(401);
    });

    it('should return 400 when product_id missing', async () => {
      const res = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ quantity_sold: 5 });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when quantity_sold is 0', async () => {
      const res = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ product_id: productId, quantity_sold: 0 });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when product_id does not exist (other tenant product)', async () => {
      const res = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: otherTenantProductId,
          quantity_sold: 5,
        });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/product|not found/i);
    });

    it('should return 201 and create sale with total_amount computed', async () => {
      const res = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          sale_date: new Date().toISOString(),
          quantity_sold: 3,
          unit_price: 10.5,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        product_id: productId,
        quantity_sold: 3,
        unit_price: 10.5,
        total_amount: 31.5,
        source: 'manual',
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.sale_date).toBeDefined();
      expect(res.body.data.product_name).toBeDefined();
    });

    it('should return 201 when unit_price is omitted (total_amount null)', async () => {
      const res = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          quantity_sold: 2,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.quantity_sold).toBe(2);
      expect(res.body.data.unit_price).toBeNull();
      expect(res.body.data.total_amount).toBeNull();
    });
  });

  describe('GET /sales/:id', () => {
    let saleId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ product_id: productId, quantity_sold: 1, unit_price: 5 });
      saleId = create.body.data.id;
    });

    it('should return 404 for other tenant sale', async () => {
      const res = await request(app)
        .get(`/sales/${otherTenantSaleId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 200 and sale with product_name', async () => {
      const res = await request(app)
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(saleId);
      expect(res.body.data.product_id).toBe(productId);
      expect(res.body.data.product_name).toBeDefined();
    });
  });

  describe('PUT /sales/:id', () => {
    let saleId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ product_id: productId, quantity_sold: 4, unit_price: 2 });
      saleId = create.body.data.id;
    });

    it('should return 200 and update sale (recompute total_amount)', async () => {
      const res = await request(app)
        .put(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ quantity_sold: 5, unit_price: 3 });
      expect(res.status).toBe(200);
      expect(res.body.data.quantity_sold).toBe(5);
      expect(res.body.data.unit_price).toBe(3);
      expect(res.body.data.total_amount).toBe(15);
    });

    it('should return 404 for other tenant sale', async () => {
      const res = await request(app)
        .put(`/sales/${otherTenantSaleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ quantity_sold: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /sales/:id', () => {
    let saleId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ product_id: productId, quantity_sold: 1 });
      saleId = create.body.data.id;
    });

    it('should return 204 and delete sale', async () => {
      const res = await request(app)
        .delete(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(204);
      const getOne = await request(app)
        .get(`/sales/${saleId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getOne.status).toBe(404);
    });

    it('should return 404 for other tenant sale', async () => {
      const res = await request(app)
        .delete(`/sales/${otherTenantSaleId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /sales/stats', () => {
    it('should return 200 with today, yesterday, this_week, this_month', async () => {
      const res = await request(app)
        .get('/sales/stats')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('today');
      expect(res.body.data).toHaveProperty('yesterday');
      expect(res.body.data).toHaveProperty('this_week');
      expect(res.body.data).toHaveProperty('this_month');
      expect(res.body.data.today).toMatchObject({
        quantity_sold: expect.any(Number),
        count: expect.any(Number),
      });
    });
  });

  describe('GET /sales/summary', () => {
    it('should return 200 with groups array', async () => {
      const res = await request(app)
        .get('/sales/summary?group_by=day')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('groups');
      expect(Array.isArray(res.body.data.groups)).toBe(true);
    });

    it('should return 200 with group_by=product', async () => {
      const res = await request(app)
        .get('/sales/summary?group_by=product')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.groups).toBeDefined();
    });
  });
});
