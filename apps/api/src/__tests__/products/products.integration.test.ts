import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Products Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let otherAccessToken: string;
  let otherTenantId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'prodtest@example.com',
        password: 'Test1234',
        first_name: 'Prod',
        last_name: 'Test',
        company_name: 'Prod Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'prodtest@example.com',
    ]);

    const otherRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'prodother@example.com',
        password: 'Test1234',
        company_name: 'Prod Other Company',
      });
    expect(otherRes.status).toBe(201);
    otherAccessToken = otherRes.body.data.access_token;
    otherTenantId = otherRes.body.data.tenant.id;
    await db.queryWithTenant(otherTenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'prodother@example.com',
    ]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM locations');
    await pool.query('DELETE FROM suppliers');
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'prod-test%' OR slug LIKE 'prod-other%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /products', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with empty list when authenticated and no products', async () => {
      const res = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('POST /products', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/products')
        .send({ sku: 'SKU-1', name: 'Product 1' });
      expect(res.status).toBe(401);
    });

    it('should return 400 when sku or name missing', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Only Name' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 201 and create product', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'SKU-001',
          name: 'Arabica Coffee',
          description: 'Premium beans',
          unit: 'kg',
          quantity: 50,
          min_quantity: 10,
          lead_time_days: 7,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.sku).toBe('SKU-001');
      expect(res.body.data.name).toBe('Arabica Coffee');
      expect(res.body.data.quantity).toBe(50);
      expect(res.body.data.unit).toBe('kg');
      expect(res.body.data.stock_status).toMatch(/ok|low|critical/);
      expect(res.body.data.is_active).toBe(true);
    });

    it('should return 409 when SKU already exists for same tenant', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sku: 'SKU-001', name: 'Another Product' });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('SKU');
    });
  });

  describe('GET /products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sku: 'SKU-002', name: 'Product For Get' });
      productId = create.body.data.id;
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get(`/products/${productId}`);
      expect(res.status).toBe(401);
    });

    it('should return 200 with product when authenticated', async () => {
      const res = await request(app)
        .get(`/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.sku).toBe('SKU-002');
      expect(res.body.data.name).toBe('Product For Get');
    });

    it('should return 404 for non-existent product id', async () => {
      const res = await request(app)
        .get('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('PUT /products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sku: 'SKU-003', name: 'Product For Update' });
      productId = create.body.data.id;
    });

    it('should return 200 and update product', async () => {
      const res = await request(app)
        .put(`/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Product Updated', quantity: 25 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Product Updated');
      expect(res.body.data.quantity).toBe(25);
      expect(res.body.data.sku).toBe('SKU-003');
    });

    it('should return 404 for non-existent product id', async () => {
      const res = await request(app)
        .put('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Any' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sku: 'SKU-004', name: 'Product For Delete' });
      productId = create.body.data.id;
    });

    it('should return 204 and soft delete product', async () => {
      const res = await request(app)
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(204);
      const getRes = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`);
      const found = getRes.body.data.find((p: { id: string }) => p.id === productId);
      expect(found).toBeUndefined();
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app)
        .delete('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Tenant isolation', () => {
    let productIdTenantA: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sku: 'SKU-ISOLATION', name: 'Tenant A Product' });
      productIdTenantA = create.body.data.id;
    });

    it('should not return product of tenant A when tenant B lists products', async () => {
      const res = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${otherAccessToken}`);
      expect(res.status).toBe(200);
      const found = res.body.data.find((p: { id: string }) => p.id === productIdTenantA);
      expect(found).toBeUndefined();
    });

    it('should return 404 when tenant B gets product of tenant A by id', async () => {
      const res = await request(app)
        .get(`/products/${productIdTenantA}`)
        .set('Authorization', `Bearer ${otherAccessToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 404 when tenant B updates product of tenant A', async () => {
      const res = await request(app)
        .put(`/products/${productIdTenantA}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ name: 'Hacked' });
      expect(res.status).toBe(404);
    });

    it('should return 404 when tenant B deletes product of tenant A', async () => {
      const res = await request(app)
        .delete(`/products/${productIdTenantA}`)
        .set('Authorization', `Bearer ${otherAccessToken}`);
      expect(res.status).toBe(404);
      const getRes = await request(app)
        .get(`/products/${productIdTenantA}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(productIdTenantA);
    });
  });

  describe('Stock movements (Story 2.4)', () => {
    let movementProductId: string;

    it('should create product and log creation movement', async () => {
      const createRes = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sku: 'SKU-MOV-1', name: 'Product for movements', quantity: 20 });
      expect(createRes.status).toBe(201);
      movementProductId = createRes.body.data.id;

      const movRes = await request(app)
        .get(`/products/${movementProductId}/movements`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(movRes.status).toBe(200);
      expect(movRes.body.success).toBe(true);
      expect(Array.isArray(movRes.body.data)).toBe(true);
      expect(movRes.body.data.length).toBeGreaterThanOrEqual(1);
      const creation = movRes.body.data.find((m: { movement_type: string }) => m.movement_type === 'creation' || m.movement_type === 'import');
      expect(creation).toBeDefined();
      expect(movRes.body.retention_days).toBeDefined();
    });

    it('should log quantity_update when quantity changes', async () => {
      const updateRes = await request(app)
        .put(`/products/${movementProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ quantity: 15, reason: 'Inventaire' });
      expect(updateRes.status).toBe(200);

      const movRes = await request(app)
        .get(`/products/${movementProductId}/movements`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(movRes.status).toBe(200);
      const quantityUpdate = movRes.body.data.find((m: { movement_type: string }) => m.movement_type === 'quantity_update');
      expect(quantityUpdate).toBeDefined();
      expect(quantityUpdate.quantity_before).toBe(20);
      expect(quantityUpdate.quantity_after).toBe(15);
      expect(quantityUpdate.reason).toBe('Inventaire');
    });

    it('should return 404 for movements when product not found', async () => {
      const fakeId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // valid UUID, no product
      const res = await request(app)
        .get(`/products/${fakeId}/movements`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });

    it('should export movements as CSV', async () => {
      const res = await request(app)
        .get(`/products/${movementProductId}/movements/export?format=csv`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('date');
      expect(res.text).toContain('type');
    });

    it('should accept movement_type=pos_sale filter (Story 3.4)', async () => {
      const res = await request(app)
        .get(`/products/${movementProductId}/movements?movement_type=pos_sale`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
