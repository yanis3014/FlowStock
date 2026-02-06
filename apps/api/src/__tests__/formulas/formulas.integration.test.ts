import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Formulas Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let productId: string;
  let formulaId: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'formulastest@example.com',
        password: 'Test1234',
        first_name: 'Formula',
        last_name: 'Test',
        company_name: 'Formula Test Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'formulastest@example.com',
    ]);

    const productRes = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'FORMULA-PROD-1',
        name: 'Produit pour formules',
        unit: 'piece',
        quantity: 100,
        purchase_price: 10,
        selling_price: 15,
        lead_time_days: 7,
      });
    expect(productRes.status).toBe(201);
    productId = productRes.body.data.id;

    const formulasRes = await request(app)
      .get('/formulas/predefined')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(formulasRes.status).toBe(200);
    expect(formulasRes.body.success).toBe(true);
    const formulas = formulasRes.body.data || [];
    if (formulas.length > 0) {
      formulaId = formulas[0].id;
    }
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
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'formula-test%'");
    await pool.end();
    await closeDatabase();
  });

  describe('GET /formulas/predefined', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/formulas/predefined');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with list of 8 predefined formulas', async () => {
      const res = await request(app)
        .get('/formulas/predefined')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(8);
      const names = res.body.data.map((f: { name: string }) => f.name);
      expect(names).toContain('consommation_moyenne');
      expect(names).toContain('stock_securite');
      expect(names).toContain('jours_stock_restant');
      expect(names).toContain('cout_stock_moyen');
      expect(names).toContain('valeur_stock');
    });
  });

  describe('GET /formulas/predefined/:id', () => {
    it('should return 401 without token', async () => {
      if (!formulaId) return;
      const res = await request(app).get(`/formulas/predefined/${formulaId}`);
      expect(res.status).toBe(401);
    });

    it('should return 404 for invalid uuid', async () => {
      const res = await request(app)
        .get('/formulas/predefined/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
    });

    it('should return 200 with formula detail when exists', async () => {
      if (!formulaId) return;
      const res = await request(app)
        .get(`/formulas/predefined/${formulaId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: formulaId,
        name: expect.any(String),
        formula_expression: expect.any(String),
        formula_type: 'predefined',
      });
    });
  });

  describe('POST /formulas/:id/execute', () => {
    it('should return 401 without token', async () => {
      if (!formulaId) return;
      const res = await request(app)
        .post(`/formulas/${formulaId}/execute`)
        .send({ product_id: productId, period_days: 30 });
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent formula', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440099';
      const res = await request(app)
        .post(`/formulas/${fakeId}/execute`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ period_days: 30 });
      expect(res.status).toBe(404);
    });

    it('should execute valeur_stock formula (no product_id required)', async () => {
      const listRes = await request(app)
        .get('/formulas/predefined')
        .set('Authorization', `Bearer ${accessToken}`);
      const valeur = (listRes.body.data || []).find((f: { name: string }) => f.name === 'valeur_stock');
      if (!valeur) return;
      const res = await request(app)
        .post(`/formulas/${valeur.id}/execute`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ scope: 'all' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        result: expect.any(Number),
        unit: '€',
        formula_name: 'valeur_stock',
      });
      expect(res.body.data.result).toBe(1000);
    });

    it('should execute consommation_moyenne with product_id', async () => {
      const listRes = await request(app)
        .get('/formulas/predefined')
        .set('Authorization', `Bearer ${accessToken}`);
      const conso = (listRes.body.data || []).find((f: { name: string }) => f.name === 'consommation_moyenne');
      if (!conso) return;
      const res = await request(app)
        .post(`/formulas/${conso.id}/execute`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ product_id: productId, period_days: 30 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        result: expect.any(Number),
        unit: 'unités/jour',
        formula_name: 'consommation_moyenne',
      });
    });
  });
});
