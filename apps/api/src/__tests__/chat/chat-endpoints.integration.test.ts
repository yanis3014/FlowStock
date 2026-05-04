import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Chat Phase 1 — endpoints integration', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  let productId: string;

  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'chatphase1@example.com',
        password: 'Test1234',
        first_name: 'Chat',
        last_name: 'Phase1',
        company_name: 'Chat Phase1 Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'chatphase1@example.com',
    ]);

    const productRes = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: 'CHAT-SKU-001',
        name: 'Tomates',
        unit: 'kg',
        quantity: 10,
        min_quantity: 5,
        purchase_price: 2.5,
      });
    expect(productRes.status).toBe(201);
    productId = productRes.body.data.id;

    // Seed sales data so snapshots/analytics can compute something meaningful
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      await request(app)
        .post('/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          sale_date: d.toISOString(),
          quantity_sold: i < 7 ? 2 : 1,
          unit_price: 10,
        });
    }

    // Compute daily snapshots, analytics and predictions (fallback)
    await request(app)
      .post('/predictions/snapshots/compute')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    await request(app)
      .post('/predictions/analytics/compute')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    await request(app)
      .post('/predictions/compute')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    // Create a recipe with one ingredient linked to the product
    const recipeRes = await request(app)
      .post('/recipes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Salade tomates',
        category: 'Entrée',
        source: 'manual',
        ingredients: [
          {
            ingredient_name: 'Tomates',
            quantity: 0.2,
            unit: 'kg',
            product_id: productId,
          },
        ],
      });
    expect(recipeRes.status).toBe(201);

    // Declare a loss so GET /losses is non-empty
    const lossRes = await request(app)
      .post('/losses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        product_id: productId,
        quantity: 1,
        reason: 'expired',
        notes: 'Test',
      });
    expect(lossRes.status).toBe(201);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM stock_predictions');
    await pool.query('DELETE FROM product_analytics');
    await pool.query('DELETE FROM daily_snapshots');
    await pool.query('DELETE FROM sales');
    await pool.query('DELETE FROM recipe_ingredients');
    await pool.query('DELETE FROM recipes');
    await pool.query('DELETE FROM stock_movements');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'chat-phase1%'");
    await pool.end();
    await closeDatabase();
  });

  it('GET /predictions returns success + array rows', async () => {
    const res = await request(app).get('/predictions').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('product_id');
      expect(res.body.data[0]).toHaveProperty('product_name');
      expect(res.body.data[0]).toHaveProperty('current_stock');
      expect(res.body.data[0]).toHaveProperty('days_until_stockout');
      expect(res.body.data[0]).toHaveProperty('alert_level');
    }
  });

  it('GET /predictions/analytics returns success + array analytics', async () => {
    const res = await request(app).get('/predictions/analytics').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('product_id');
      expect(res.body.data[0]).toHaveProperty('trend_direction');
    }
  });

  it('GET /losses?limit=100 returns success + non-empty array', async () => {
    const res = await request(app)
      .get('/losses?limit=100')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('product_name');
    expect(res.body.data[0]).toHaveProperty('quantity_lost');
    expect(res.body.data[0]).toHaveProperty('reason');
  });

  it('GET /recipes?limit=50 returns recipes with ingredients array', async () => {
    const res = await request(app)
      .get('/recipes?limit=50')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data[0].ingredients)).toBe(true);
  });

  it('GET /products?search matches on sku and name', async () => {
    const bySku = await request(app)
      .get('/products?search=CHAT-SKU-001&limit=5')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(bySku.status).toBe(200);
    expect(bySku.body.success).toBe(true);
    expect(Array.isArray(bySku.body.data)).toBe(true);
    expect(bySku.body.data.length).toBeGreaterThan(0);

    const byName = await request(app)
      .get('/products?search=Tomates&limit=5')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(byName.status).toBe(200);
    expect(byName.body.success).toBe(true);
    expect(Array.isArray(byName.body.data)).toBe(true);
    expect(byName.body.data.length).toBeGreaterThan(0);
  });
});

