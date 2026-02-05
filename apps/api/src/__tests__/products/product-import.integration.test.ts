import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Product Import Integration Tests', () => {
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
        email: 'importtest@example.com',
        password: 'Test1234',
        first_name: 'Import',
        last_name: 'Test',
        company_name: 'Import Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'importtest@example.com',
    ]);

    const otherRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'importother@example.com',
        password: 'Test1234',
        company_name: 'Import Other Company',
      });
    expect(otherRes.status).toBe(201);
    otherAccessToken = otherRes.body.data.access_token;
    otherTenantId = otherRes.body.data.tenant.id;
    await db.queryWithTenant(otherTenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'importother@example.com',
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
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'import-test%' OR slug LIKE 'import-other%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /products/import/template', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/products/import/template');
      expect(res.status).toBe(401);
    });

    it('should return CSV template when authenticated', async () => {
      const res = await request(app)
        .get('/products/import/template')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('sku,name');
      expect(res.text).toContain('SKU001');
    });
  });

  describe('POST /products/import/preview', () => {
    it('should return 401 without token', async () => {
      const csv = Buffer.from('sku,name,quantity\nSKU1,Product 1,10');
      const res = await request(app)
        .post('/products/import/preview')
        .attach('file', csv, 'test.csv');
      expect(res.status).toBe(401);
    });

    it('should return 400 when no file uploaded', async () => {
      const res = await request(app)
        .post('/products/import/preview')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No file');
    });

    it('should return 400 when file type is not allowed (e.g. .txt)', async () => {
      const textFile = Buffer.from('not a csv');
      const res = await request(app)
        .post('/products/import/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', textFile, 'data.txt');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/CSV|Excel|allowed/i);
    });

    it('should parse CSV and return preview', async () => {
      const csv = Buffer.from('sku,name,quantity,unit\nSKU1,Product 1,10,piece\nSKU2,Product 2,20,kg');
      const res = await request(app)
        .post('/products/import/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', csv, 'products.csv');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toEqual(['sku', 'name', 'quantity', 'unit']);
      expect(res.body.data.sampleRows).toHaveLength(2);
      expect(res.body.data.suggestedMapping).toEqual({
        sku: 'sku',
        name: 'name',
        quantity: 'quantity',
        unit: 'unit',
      });
    });
  });

  describe('POST /products/import', () => {
    it('should return 401 without token', async () => {
      const csv = Buffer.from('sku,name,quantity\nSKU1,Product 1,10');
      const res = await request(app)
        .post('/products/import')
        .attach('file', csv, 'test.csv');
      expect(res.status).toBe(401);
    });

    it('should return 400 when no file uploaded', async () => {
      const res = await request(app)
        .post('/products/import')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
    });

    it('should import valid CSV and create products', async () => {
      const csv = Buffer.from(
        'sku,name,quantity,unit\nIMP-SKU1,Import Product 1,10,piece\nIMP-SKU2,Import Product 2,5,kg'
      );
      const res = await request(app)
        .post('/products/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', csv, 'import.csv');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(2);
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.errors).toHaveLength(0);

      const listRes = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`);
      const products = listRes.body.data.filter(
        (p: { sku: string }) => p.sku === 'IMP-SKU1' || p.sku === 'IMP-SKU2'
      );
      expect(products).toHaveLength(2);
    });

    it('should report errors for invalid rows but import valid ones', async () => {
      const csv = Buffer.from(
        'sku,name,quantity\n' +
          'OK-SKU,Valid Product,10\n' +
          ',Missing SKU,5\n' +
          'OK-SKU2,Valid 2,20'
      );
      const res = await request(app)
        .post('/products/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', csv, 'mixed.csv');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(2);
      expect(res.body.data.errors).toHaveLength(1);
      expect(res.body.data.errors[0].message).toContain('SKU');
    });

    it('should not expose tenant A products to tenant B', async () => {
      const csvA = Buffer.from('sku,name,quantity\nTENANT-A-SKU,Tenant A Only,10');
      const importA = await request(app)
        .post('/products/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', csvA, 'tenant-a.csv');
      expect(importA.status).toBe(200);
      expect(importA.body.data.imported).toBe(1);

      const listB = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${otherAccessToken}`);
      const found = listB.body.data.find((p: { sku: string }) => p.sku === 'TENANT-A-SKU');
      expect(found).toBeUndefined();
    });

    it('should import with custom mapping override', async () => {
      const csv = Buffer.from('ref,nom,stock\nCUSTOM-SKU1,Produit Custom 1,15');
      const customMapping = { ref: 'sku', nom: 'name', stock: 'quantity' };
      const res = await request(app)
        .post('/products/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('mapping', JSON.stringify(customMapping))
        .attach('file', csv, 'custom-mapping.csv');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(1);

      const listRes = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`);
      const product = listRes.body.data.find((p: { sku: string }) => p.sku === 'CUSTOM-SKU1');
      expect(product).toBeDefined();
      expect(product.name).toBe('Produit Custom 1');
      expect(product.quantity).toBe(15);
    });

    it('should resolve location and supplier names', async () => {
      const db = getDatabase();
      // Create test location and supplier
      const locRes = await db.queryWithTenant<{ id: string }>(
        tenantId,
        "INSERT INTO locations (tenant_id, name, is_active) VALUES ($1, 'Test Location', true) RETURNING id",
        [tenantId]
      );
      const locationId = locRes.rows[0].id;

      const supRes = await db.queryWithTenant<{ id: string }>(
        tenantId,
        "INSERT INTO suppliers (tenant_id, name, is_active) VALUES ($1, 'Test Supplier', true) RETURNING id",
        [tenantId]
      );
      const supplierId = supRes.rows[0].id;

      const csv = Buffer.from(
        'sku,name,quantity,location_name,supplier_name\nLOC-SUP-SKU,Product with Loc/Supp,10,Test Location,Test Supplier'
      );
      const res = await request(app)
        .post('/products/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', csv, 'location-supplier.csv');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(1);

      const listRes = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`);
      const product = listRes.body.data.find((p: { sku: string }) => p.sku === 'LOC-SUP-SKU');
      expect(product).toBeDefined();
      expect(product.location?.id).toBe(locationId);
      expect(product.supplier?.id).toBe(supplierId);
    });

    it('should handle missing location/supplier gracefully', async () => {
      const csv = Buffer.from(
        'sku,name,quantity,location_name,supplier_name\nNO-LOC-SKU,Product No Loc,10,NonExistent Location,NonExistent Supplier'
      );
      const res = await request(app)
        .post('/products/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', csv, 'no-location.csv');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(1);

      const listRes = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`);
      const product = listRes.body.data.find((p: { sku: string }) => p.sku === 'NO-LOC-SKU');
      expect(product).toBeDefined();
      expect(product.location).toBeNull();
      expect(product.supplier).toBeNull();
    });
  });
});
