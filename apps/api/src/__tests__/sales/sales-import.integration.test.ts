import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Sales Import Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let productId: string;
  let productSku: string;
  let otherAccessToken: string;
  let otherTenantId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    // Create first tenant and user
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'salesimporttest@example.com',
        password: 'Test1234',
        first_name: 'Sales',
        last_name: 'Import',
        company_name: 'Sales Import Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'salesimporttest@example.com',
    ]);

    // Create a product for import testing
    const productRes = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'TEST-SKU-001',
        name: 'Test Product',
        quantity: 100,
        unit: 'piece',
      });
    expect(productRes.status).toBe(201);
    productId = productRes.body.data.id;
    productSku = 'TEST-SKU-001';

    // Create second tenant for multi-tenant test
    const registerRes2 = await request(app)
      .post('/auth/register')
      .send({
        email: 'salesimporttest2@example.com',
        password: 'Test1234',
        first_name: 'Sales',
        last_name: 'Import2',
        company_name: 'Sales Import Test Company 2',
      });
    expect(registerRes2.status).toBe(201);
    otherAccessToken = registerRes2.body.data.access_token;
    otherTenantId = registerRes2.body.data.tenant.id;

    await db.queryWithTenant(otherTenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'salesimporttest2@example.com',
    ]);
  });

  afterAll(async () => {
    await closeDatabase();
    await pool.end();
  });

  describe('GET /sales/import/template', () => {
    it('should return CSV template file', async () => {
      const res = await request(app)
        .get('/sales/import/template')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('sale_date');
      expect(res.text).toContain('product_sku');
      expect(res.text).toContain('quantity_sold');
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/sales/import/template');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /sales/import/preview', () => {
    it('should parse CSV and return preview', async () => {
      const csv = 'sale_date,product_sku,quantity_sold,unit_price\n2024-01-15,TEST-SKU-001,5,12.50';
      const res = await request(app)
        .post('/sales/import/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toEqual(['sale_date', 'product_sku', 'quantity_sold', 'unit_price']);
      expect(res.body.data.sampleRows).toHaveLength(1);
      expect(res.body.data.suggestedMapping).toBeDefined();
    });

    it('should require file upload', async () => {
      const res = await request(app)
        .post('/sales/import/preview')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No file uploaded');
    });

    it('should require authentication', async () => {
      const csv = 'sale_date,product_sku,quantity_sold\n2024-01-15,TEST-SKU-001,5';
      const res = await request(app)
        .post('/sales/import/preview')
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /sales/import', () => {
    it('should import valid CSV file', async () => {
      const csv = 'sale_date,product_sku,quantity_sold,unit_price\n2024-01-15,TEST-SKU-001,5,12.50';
      const res = await request(app)
        .post('/sales/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(1);
      expect(res.body.data.totalRows).toBe(1);
      expect(res.body.data.errors).toHaveLength(0);

      // Verify sale was created
      const salesRes = await request(app)
        .get('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ product_id: productId });
      expect(salesRes.status).toBe(200);
      expect(salesRes.body.data.length).toBeGreaterThan(0);
      const importedSale = salesRes.body.data.find((s: any) => s.source === 'csv');
      expect(importedSale).toBeDefined();
      expect(importedSale.quantity_sold).toBe(5);
    });

    it('should handle invalid product SKU', async () => {
      const csv = 'sale_date,product_sku,quantity_sold\n2024-01-15,INVALID-SKU,5';
      const res = await request(app)
        .post('/sales/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(0);
      expect(res.body.data.errors.length).toBeGreaterThan(0);
      expect(res.body.data.errors[0].message).toContain('not found');
    });

    it('should handle invalid date format', async () => {
      const csv = 'sale_date,product_sku,quantity_sold\ninvalid-date,TEST-SKU-001,5';
      const res = await request(app)
        .post('/sales/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(0);
      expect(res.body.data.errors.length).toBeGreaterThan(0);
      expect(res.body.data.errors[0].message).toContain('date');
    });

    it('should handle invalid quantity_sold', async () => {
      const csv = 'sale_date,product_sku,quantity_sold\n2024-01-15,TEST-SKU-001,0';
      const res = await request(app)
        .post('/sales/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(0);
      expect(res.body.data.errors.length).toBeGreaterThan(0);
      expect(res.body.data.errors[0].message).toContain('quantity_sold');
    });

    it('should handle custom mapping', async () => {
      const csv = 'date,sku,qty,price\n2024-01-15,TEST-SKU-001,3,8.00';
      const mapping = {
        date: 'sale_date',
        sku: 'product_sku',
        qty: 'quantity_sold',
        price: 'unit_price',
      };
      const res = await request(app)
        .post('/sales/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('mapping', JSON.stringify(mapping))
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported).toBe(1);
    });

    it('should enforce multi-tenant isolation', async () => {
      // Import sale for first tenant
      const csv = 'sale_date,product_sku,quantity_sold\n2024-01-15,TEST-SKU-001,2';
      await request(app)
        .post('/sales/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from(csv, 'utf-8'), 'test.csv');

      // Verify second tenant cannot see it
      const salesRes = await request(app)
        .get('/sales')
        .set('Authorization', `Bearer ${otherAccessToken}`);
      expect(salesRes.status).toBe(200);
      const otherTenantSales = salesRes.body.data.filter((s: any) => s.source === 'csv');
      expect(otherTenantSales.length).toBe(0);
    });
  });
});
