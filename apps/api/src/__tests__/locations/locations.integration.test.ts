import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Locations Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let otherAccessToken: string;
  let otherTenantId: string;
  let otherTenantLocationId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'loctest@example.com',
        password: 'Test1234',
        first_name: 'Loc',
        last_name: 'Test',
        company_name: 'Loc Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'loctest@example.com',
    ]);

    const otherRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'locother@example.com',
        password: 'Test1234',
        company_name: 'Loc Other Company',
      });
    expect(otherRes.status).toBe(201);
    otherAccessToken = otherRes.body.data.access_token;
    otherTenantId = otherRes.body.data.tenant.id;
    await db.queryWithTenant(otherTenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'locother@example.com',
    ]);
    const otherLoc = await request(app)
      .post('/locations')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({ name: 'Other Tenant Loc For 404' });
    otherTenantLocationId = otherLoc.body.data.id;
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
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'loc-test%' OR slug LIKE 'loc-other%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /locations', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/locations');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with empty list when authenticated and no locations', async () => {
      const res = await request(app)
        .get('/locations')
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

  describe('POST /locations', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/locations')
        .send({ name: 'Entrepôt A' });
      expect(res.status).toBe(401);
    });

    it('should return 400 when name missing', async () => {
      const res = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 201 and create location', async () => {
      const res = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Entrepôt Principal',
          address: '123 Rue Stock',
          location_type: 'entrepôt',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'Entrepôt Principal',
        address: '123 Rue Stock',
        location_type: 'entrepôt',
        is_active: true,
      });
      expect(res.body.data.id).toBeDefined();
      expect(typeof res.body.data.total_quantity).toBe('number');
      expect(res.body.data.total_quantity).toBe(0);
    });

    it('should return 409 when name already exists for same tenant', async () => {
      const res = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Entrepôt Principal' });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });

    it('should allow same name for different tenant', async () => {
      const res = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ name: 'Entrepôt Principal' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Entrepôt Principal');
    });
  });

  describe('GET /locations/:id', () => {
    let locationId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Magasin Centre' });
      locationId = create.body.data.id;
    });

    it('should return 404 for non-existent or other-tenant id', async () => {
      const res = await request(app)
        .get(`/locations/${otherTenantLocationId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 200 and location with total_quantity', async () => {
      const res = await request(app)
        .get(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(locationId);
      expect(res.body.data.name).toBe('Magasin Centre');
      expect(res.body.data).toHaveProperty('total_quantity');
    });

    it('should return 404 when location belongs to other tenant', async () => {
      const otherLoc = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ name: 'Other Tenant Loc' });
      const otherLocId = otherLoc.body.data.id;
      const res = await request(app)
        .get(`/locations/${otherLocId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /locations/:id', () => {
    let locationId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'To Update' });
      locationId = create.body.data.id;
    });

    it('should return 200 and update location', async () => {
      const res = await request(app)
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name', address: 'New Address' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.address).toBe('New Address');
    });

    it('should return 404 for non-existent or other-tenant id', async () => {
      const res = await request(app)
        .put(`/locations/${otherTenantLocationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Any' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /locations/:id', () => {
    let locationId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'To Delete' });
      locationId = create.body.data.id;
    });

    it('should return 204 and soft-delete', async () => {
      const res = await request(app)
        .delete(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(204);
      const getOne = await request(app)
        .get(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getOne.body.data.is_active).toBe(false);
    });

    it('should return 404 for non-existent or other-tenant id', async () => {
      const res = await request(app)
        .delete(`/locations/${otherTenantLocationId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('total_quantity and filter', () => {
    it('should include total_quantity in list and reflect product quantities', async () => {
      const locRes = await request(app)
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Loc With Products' });
      const locId = locRes.body.data.id;

      await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'LOC-PROD-1',
          name: 'Product at location',
          quantity: 10,
          location_id: locId,
        });

      const listRes = await request(app)
        .get('/locations')
        .set('Authorization', `Bearer ${accessToken}`);
      const loc = listRes.body.data.find((l: { id: string }) => l.id === locId);
      expect(loc).toBeDefined();
      expect(loc.total_quantity).toBe(10);

      const getRes = await request(app)
        .get(`/locations/${locId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(getRes.body.data.total_quantity).toBe(10);
    });
  });
});
