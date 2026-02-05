import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Suppliers Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let otherAccessToken: string;
  let otherTenantId: string;
  let otherTenantSupplierId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'suppliertest@example.com',
        password: 'Test1234',
        first_name: 'Supplier',
        last_name: 'Test',
        company_name: 'Supplier Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'suppliertest@example.com',
    ]);

    const otherRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'supplierother@example.com',
        password: 'Test1234',
        company_name: 'Supplier Other Company',
      });
    expect(otherRes.status).toBe(201);
    otherAccessToken = otherRes.body.data.access_token;
    otherTenantId = otherRes.body.data.tenant.id;
    await db.queryWithTenant(otherTenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'supplierother@example.com',
    ]);
    const otherSup = await request(app)
      .post('/suppliers')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({ name: 'Other Tenant Supplier For 404' });
    otherTenantSupplierId = otherSup.body.data.id;
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
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'supplier-test%' OR slug LIKE 'supplier-other%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /suppliers', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/suppliers');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with empty list when authenticated and no suppliers', async () => {
      const res = await request(app)
        .get('/suppliers')
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

  describe('POST /suppliers', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/suppliers')
        .send({ name: 'Supplier A' });
      expect(res.status).toBe(401);
    });

    it('should return 400 when name missing', async () => {
      const res = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when email is invalid', async () => {
      const res = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Supplier', email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/email|invalid/i);
    });

    it('should return 201 and create supplier', async () => {
      const res = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Grossiste Principal',
          contact_name: 'Jean Dupont',
          email: 'jean@fournisseur.com',
          phone: '+33 1 23 45 67 89',
          address: '10 Rue Commerce',
          notes: 'Fournisseur préféré',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'Grossiste Principal',
        contact_name: 'Jean Dupont',
        email: 'jean@fournisseur.com',
        phone: '+33 1 23 45 67 89',
        address: '10 Rue Commerce',
        notes: 'Fournisseur préféré',
        is_active: true,
      });
      expect(res.body.data.id).toBeDefined();
      expect(typeof res.body.data.products_count).toBe('number');
      expect(res.body.data.products_count).toBe(0);
    });

    it('should return 409 when name already exists for same tenant', async () => {
      const res = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Grossiste Principal' });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });

    it('should allow same name for different tenant', async () => {
      const res = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ name: 'Grossiste Principal' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Grossiste Principal');
    });
  });

  describe('GET /suppliers/:id', () => {
    let supplierId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Magasin Fournisseur' });
      supplierId = create.body.data.id;
    });

    it('should return 404 for non-existent or other-tenant id', async () => {
      const res = await request(app)
        .get(`/suppliers/${otherTenantSupplierId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 200 and supplier with products_count', async () => {
      const res = await request(app)
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(supplierId);
      expect(res.body.data.name).toBe('Magasin Fournisseur');
      expect(res.body.data).toHaveProperty('products_count');
    });
  });

  describe('PUT /suppliers/:id', () => {
    let supplierId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'To Update Supplier' });
      supplierId = create.body.data.id;
    });

    it('should return 200 and update supplier', async () => {
      const res = await request(app)
        .put(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Supplier Name', contact_name: 'Marie Martin', email: 'marie@sup.com' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Supplier Name');
      expect(res.body.data.contact_name).toBe('Marie Martin');
      expect(res.body.data.email).toBe('marie@sup.com');
    });

    it('should return 404 for non-existent or other-tenant id', async () => {
      const res = await request(app)
        .put(`/suppliers/${otherTenantSupplierId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Any' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /suppliers/:id', () => {
    let supplierId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'To Delete Supplier' });
      supplierId = create.body.data.id;
    });

    it('should return 204 and soft-delete', async () => {
      const res = await request(app)
        .delete(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(204);
      const getOne = await request(app)
        .get(`/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getOne.body.data.is_active).toBe(false);
    });

    it('should return 404 for non-existent or other-tenant id', async () => {
      const res = await request(app)
        .delete(`/suppliers/${otherTenantSupplierId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('products_count and product association', () => {
    it('should include products_count in list and reflect product link', async () => {
      const supRes = await request(app)
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Supplier With Products' });
      const supId = supRes.body.data.id;

      await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'SUP-PROD-1',
          name: 'Product from supplier',
          quantity: 5,
          supplier_id: supId,
        });

      const listRes = await request(app)
        .get('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`);
      const sup = listRes.body.data.find((s: { id: string }) => s.id === supId);
      expect(sup).toBeDefined();
      expect(sup.products_count).toBe(1);

      const getRes = await request(app)
        .get(`/suppliers/${supId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getRes.body.data.products_count).toBe(1);

      const productsRes = await request(app)
        .get(`/products?supplier_id=${supId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(productsRes.status).toBe(200);
      expect(productsRes.body.data.length).toBe(1);
      expect(productsRes.body.data[0].supplier?.id).toBe(supId);
    });
  });
});
