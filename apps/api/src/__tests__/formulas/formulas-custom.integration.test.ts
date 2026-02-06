import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Custom Formulas Integration Tests', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let productId: string;
  let accessToken2: string;
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    // Register tenant 1
    const regRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'customformula1@example.com',
        password: 'Test1234',
        first_name: 'Custom',
        last_name: 'Formula',
        company_name: 'Custom Formula Co 1',
      });
    expect(regRes.status).toBe(201);
    accessToken = regRes.body.data.access_token;
    tenantId = regRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'customformula1@example.com',
    ]);

    // Create a product
    const prodRes = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'CUSTOM-FORM-1',
        name: 'Produit Custom',
        unit: 'piece',
        quantity: 200,
        purchase_price: 10,
        selling_price: 25,
        lead_time_days: 5,
      });
    expect(prodRes.status).toBe(201);
    productId = prodRes.body.data.id;

    // Register tenant 2 for multi-tenant tests
    const regRes2 = await request(app)
      .post('/auth/register')
      .send({
        email: 'customformula2@example.com',
        password: 'Test1234',
        first_name: 'Other',
        last_name: 'Tenant',
        company_name: 'Custom Formula Co 2',
      });
    expect(regRes2.status).toBe(201);
    accessToken2 = regRes2.body.data.access_token;
    const tenantId2 = regRes2.body.data.tenant.id;

    await db.queryWithTenant(tenantId2, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'customformula2@example.com',
    ]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM formulas WHERE formula_type = 'custom'");
    await pool.query('DELETE FROM sales');
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM locations');
    await pool.query('DELETE FROM suppliers');
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'custom-formula%'");
    await pool.end();
    await closeDatabase();
  });

  // ==========================================================================
  // GET /formulas/custom/variables
  // ==========================================================================
  describe('GET /formulas/custom/variables', () => {
    it('should return available variables and functions', async () => {
      const res = await request(app)
        .get('/formulas/custom/variables')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.variables)).toBe(true);
      expect(Array.isArray(res.body.data.functions)).toBe(true);
      expect(res.body.data.variables.length).toBeGreaterThanOrEqual(8);
      expect(res.body.data.functions).toContain('SUM');
      expect(res.body.data.functions).toContain('IF');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/formulas/custom/variables');
      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // POST /formulas/custom/validate
  // ==========================================================================
  describe('POST /formulas/custom/validate', () => {
    it('should validate a correct expression', async () => {
      const res = await request(app)
        .post('/formulas/custom/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ expression: 'STOCK_ACTUEL * PRIX_ACHAT' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.variables_detected).toContain('STOCK_ACTUEL');
      expect(res.body.data.variables_detected).toContain('PRIX_ACHAT');
    });

    it('should reject invalid expression with unknown variable', async () => {
      const res = await request(app)
        .post('/formulas/custom/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ expression: 'STOCK_ACTUEL + BOGUS_VAR' });
      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.error).toContain('Variable inconnue');
    });

    it('should reject empty expression', async () => {
      const res = await request(app)
        .post('/formulas/custom/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ expression: '' });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // POST /formulas/custom (create)
  // ==========================================================================
  let createdFormulaId: string;

  describe('POST /formulas/custom', () => {
    it('should create a custom formula', async () => {
      const res = await request(app)
        .post('/formulas/custom')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bénéfice unitaire',
          description: 'Calcul du bénéfice par unité',
          formula_expression: 'PRIX_VENTE - PRIX_ACHAT',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Bénéfice unitaire');
      expect(res.body.data.formula_type).toBe('custom');
      expect(res.body.data.variables_used).toContain('PRIX_VENTE');
      expect(res.body.data.variables_used).toContain('PRIX_ACHAT');
      createdFormulaId = res.body.data.id;
    });

    it('should reject formula with invalid syntax', async () => {
      const res = await request(app)
        .post('/formulas/custom')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Invalid formula',
          formula_expression: '2 +',
        });
      expect(res.status).toBe(400);
    });

    it('should reject formula with unknown variable', async () => {
      const res = await request(app)
        .post('/formulas/custom')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bad variables',
          formula_expression: 'STOCK_ACTUEL + FAKE_VAR',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Variable inconnue');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/formulas/custom')
        .send({
          name: 'No auth',
          formula_expression: '2 + 2',
        });
      expect(res.status).toBe(401);
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .post('/formulas/custom')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          formula_expression: '2 + 2',
        });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /formulas/custom (list)
  // ==========================================================================
  describe('GET /formulas/custom', () => {
    it('should list custom formulas for the tenant', async () => {
      const res = await request(app)
        .get('/formulas/custom')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const names = res.body.data.map((f: { name: string }) => f.name);
      expect(names).toContain('Bénéfice unitaire');
    });

    it('should not show formulas from another tenant', async () => {
      const res = await request(app)
        .get('/formulas/custom')
        .set('Authorization', `Bearer ${accessToken2}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET /formulas/custom/:id
  // ==========================================================================
  describe('GET /formulas/custom/:id', () => {
    it('should return a custom formula by id', async () => {
      const res = await request(app)
        .get(`/formulas/custom/${createdFormulaId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdFormulaId);
      expect(res.body.data.name).toBe('Bénéfice unitaire');
    });

    it('should return 404 for another tenant', async () => {
      const res = await request(app)
        .get(`/formulas/custom/${createdFormulaId}`)
        .set('Authorization', `Bearer ${accessToken2}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app)
        .get('/formulas/custom/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // PUT /formulas/custom/:id
  // ==========================================================================
  describe('PUT /formulas/custom/:id', () => {
    it('should update a custom formula', async () => {
      const res = await request(app)
        .put(`/formulas/custom/${createdFormulaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Bénéfice total',
          formula_expression: '(PRIX_VENTE - PRIX_ACHAT) * QUANTITE',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Bénéfice total');
      expect(res.body.data.variables_used).toContain('QUANTITE');
    });

    it('should reject invalid expression on update', async () => {
      const res = await request(app)
        .put(`/formulas/custom/${createdFormulaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          formula_expression: '2 +',
        });
      expect(res.status).toBe(400);
    });

    it('should return 404 for another tenant', async () => {
      const res = await request(app)
        .put(`/formulas/custom/${createdFormulaId}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send({ name: 'Hacked' });
      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // POST /formulas/custom/preview
  // ==========================================================================
  describe('POST /formulas/custom/preview', () => {
    it('should preview a formula with product', async () => {
      const res = await request(app)
        .post('/formulas/custom/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          expression: 'PRIX_VENTE - PRIX_ACHAT',
          product_id: productId,
          scope: 'product',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // selling_price=25, purchase_price=10 → result=15
      expect(res.body.data.result).toBe(15);
    });

    it('should preview a simple arithmetic expression', async () => {
      const res = await request(app)
        .post('/formulas/custom/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          expression: '2 + 3 * 4',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.result).toBe(14);
    });

    it('should reject invalid expression in preview', async () => {
      const res = await request(app)
        .post('/formulas/custom/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ expression: 'STOCK_ACTUEL + FAKE' });
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // POST /formulas/:id/execute (custom)
  // ==========================================================================
  describe('POST /formulas/:id/execute (custom)', () => {
    it('should execute a custom formula on a product', async () => {
      const res = await request(app)
        .post(`/formulas/${createdFormulaId}/execute`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          scope: 'product',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // (25 - 10) * 200 = 3000
      expect(res.body.data.result).toBe(3000);
    });

    it('should return 404 for non-existent formula', async () => {
      const res = await request(app)
        .post('/formulas/550e8400-e29b-41d4-a716-446655440099/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ scope: 'all' });
      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // DELETE /formulas/custom/:id
  // ==========================================================================
  describe('DELETE /formulas/custom/:id', () => {
    it('should return 404 for another tenant', async () => {
      const res = await request(app)
        .delete(`/formulas/custom/${createdFormulaId}`)
        .set('Authorization', `Bearer ${accessToken2}`);
      expect(res.status).toBe(404);
    });

    it('should soft-delete a custom formula', async () => {
      const res = await request(app)
        .delete(`/formulas/custom/${createdFormulaId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's no longer in the list
      const listRes = await request(app)
        .get('/formulas/custom')
        .set('Authorization', `Bearer ${accessToken}`);
      const ids = (listRes.body.data || []).map((f: { id: string }) => f.id);
      expect(ids).not.toContain(createdFormulaId);
    });
  });
});
