/**
 * Story 2.1 & 2.2: POS webhook integration tests (reception, idempotence, stock decrement)
 */
import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('POST /webhooks/pos (Story 2.1 & 2.2)', () => {
  let pool: Pool;
  let tenantId: string;
  let productIdNormal: string;
  const webhookSecret = 'test-webhook-secret-2-1';
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'poswebhook@example.com',
        password: 'Test1234',
        first_name: 'Pos',
        last_name: 'Webhook',
        company_name: 'POS Webhook Test',
      });
    expect(registerRes.status).toBe(201);
    tenantId = registerRes.body.data.tenant.id;

    await pool.query(
      `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active)
       VALUES ($1, 'lightspeed', $2, true)
       ON CONFLICT (tenant_id) DO UPDATE SET webhook_secret = $2, is_active = true`,
      [tenantId, webhookSecret]
    );

    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);
      const prodRes = await client.query(
        `INSERT INTO products (tenant_id, sku, name, unit, quantity)
         VALUES ($1, 'SKU-POS-1', 'Product POS', 'piece', 10)
         RETURNING id`,
        [tenantId]
      );
      productIdNormal = prodRes.rows[0].id;
      await client.query(
        `INSERT INTO products (tenant_id, sku, name, unit, quantity)
         VALUES ($1, 'SKU-LOW', 'Product Low Stock', 'piece', 1)`,
        [tenantId]
      );
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM stock_movements WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_product_mapping WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM products WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_events_received WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscription_changes WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)', [tenantId]);
    await pool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await closeDatabase();
  });

  const validPayload = {
    external_id: 'order-001',
    lines: [{ product_id: 'prod-1', quantity: 2 }, { sku: 'SKU-X', quantity: 1 }],
    sold_at: new Date().toISOString(),
  };

  it('should return 401 without X-Tenant-Id and Bearer', async () => {
    const res = await request(app)
      .post('/webhooks/pos')
      .send(validPayload);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/X-Tenant-Id|Bearer/);
  });

  it('should return 401 without Authorization Bearer', async () => {
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it('should return 403 for invalid webhook secret', async () => {
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', 'Bearer wrong-secret')
      .send(validPayload);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid payload (missing external_id)', async () => {
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send({ lines: validPayload.lines, sold_at: validPayload.sold_at });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/external_id/);
  });

  it('should return 400 for invalid payload (empty lines)', async () => {
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send({ external_id: 'x', lines: [], sold_at: validPayload.sold_at });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lines/);
  });

  it('should return 400 for invalid payload (missing sold_at)', async () => {
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send({ external_id: 'order-x', lines: validPayload.lines });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sold_at/);
  });

  it('should return 400 for invalid X-Tenant-Id (not a UUID)', async () => {
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', 'not-a-uuid')
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(validPayload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/UUID/);
  });

  it('should return 200 and received: true for valid payload shape (no product mapping)', async () => {
    const payload = { ...validPayload, external_id: 'order-first-' + Date.now() };
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.duplicate).toBeUndefined();
  });

  it('should return 200 with duplicate: true for same external_id (idempotence)', async () => {
    const externalId = 'order-idem-' + Date.now();
    const payload = { ...validPayload, external_id: externalId };
    const res1 = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res1.status).toBe(200);
    expect(res1.body.received).toBe(true);

    const res2 = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.received).toBe(true);
    expect(res2.body.duplicate).toBe(true);
  });

  it('should decrement stock and return processed_lines when line matches product by sku (Story 2.2)', async () => {
    const externalId = 'order-decrement-' + Date.now();
    const payload = {
      external_id: externalId,
      lines: [{ sku: 'SKU-POS-1', quantity: 2 }],
      sold_at: new Date().toISOString(),
    };
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(1);
    expect(res.body.unmapped_lines).toBe(0);
    expect(res.body.errors).toBe(0);

    const db = getDatabase();
    const productResult = await db.queryWithTenant<{ quantity: string }>(
      tenantId,
      'SELECT quantity::text AS quantity FROM products WHERE id = $1',
      [productIdNormal]
    );
    expect(parseFloat(productResult.rows[0].quantity)).toBe(8);

    const movementResult = await db.queryWithTenant<{ movement_type: string }>(
      tenantId,
      'SELECT movement_type FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
      [productIdNormal]
    );
    expect(movementResult.rows[0].movement_type).toBe('pos_sale');
  });

  it('should return unmapped_lines when sku does not exist (Story 2.2)', async () => {
    const payload = {
      external_id: 'order-unmapped-' + Date.now(),
      lines: [{ sku: 'UNKNOWN-SKU', quantity: 1 }],
      sold_at: new Date().toISOString(),
    };
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(0);
    expect(res.body.unmapped_lines).toBe(1);
    expect(res.body.details?.unmapped).toHaveLength(1);
    expect(res.body.details.unmapped[0].reason).toBe('product_not_found');
  });

  it('should return errors and not decrement when stock insufficient (Story 2.2)', async () => {
    const payload = {
      external_id: 'order-insufficient-' + Date.now(),
      lines: [{ sku: 'SKU-LOW', quantity: 3 }],
      sold_at: new Date().toISOString(),
    };
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(0);
    expect(res.body.errors).toBe(1);
    expect(res.body.details?.insufficient_stock).toHaveLength(1);
    expect(res.body.details.insufficient_stock[0].reason).toBe('insufficient_stock');

    const db = getDatabase();
    const productResult = await db.queryWithTenant<{ quantity: string }>(
      tenantId,
      "SELECT quantity::text AS quantity FROM products WHERE sku = 'SKU-LOW'",
      []
    );
    expect(parseFloat(productResult.rows[0].quantity)).toBe(1);
  });

  it('should decrement stock when line has valid product_id (UUID)', async () => {
    const db = getDatabase();
    const beforeResult = await db.queryWithTenant<{ quantity: string }>(
      tenantId,
      'SELECT quantity::text AS quantity FROM products WHERE id = $1',
      [productIdNormal]
    );
    const quantityBefore = parseFloat(beforeResult.rows[0].quantity);

    const payload = {
      external_id: 'order-by-product-id-' + Date.now(),
      lines: [{ product_id: productIdNormal, quantity: 1 }],
      sold_at: new Date().toISOString(),
    };
    const res = await request(app)
      .post('/webhooks/pos')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(1);
    expect(res.body.unmapped_lines).toBe(0);
    expect(res.body.errors).toBe(0);

    const afterResult = await db.queryWithTenant<{ quantity: string }>(
      tenantId,
      'SELECT quantity::text AS quantity FROM products WHERE id = $1',
      [productIdNormal]
    );
    expect(parseFloat(afterResult.rows[0].quantity)).toBe(quantityBefore - 1);
  });
});

describe('POST /webhooks/pos/lightspeed (Story 2.3)', () => {
  let pool: Pool;
  let tenantId: string;
  let productIdNormal: string;
  const webhookSecret = 'test-lightspeed-secret';
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'lightspeed-webhook@example.com',
        password: 'Test1234',
        first_name: 'Lightspeed',
        last_name: 'Test',
        company_name: 'Lightspeed Webhook Test',
      });
    expect(registerRes.status).toBe(201);
    tenantId = registerRes.body.data.tenant.id;

    await pool.query(
      `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active)
       VALUES ($1, 'lightspeed', $2, true)
       ON CONFLICT (tenant_id) DO UPDATE SET pos_type = 'lightspeed', webhook_secret = $2, is_active = true`,
      [tenantId, webhookSecret]
    );

    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);
      const prodRes = await client.query(
        `INSERT INTO products (tenant_id, sku, name, unit, quantity)
         VALUES ($1, 'SKU-LSP-1', 'Product LSP', 'piece', 20)
         RETURNING id`,
        [tenantId]
      );
      productIdNormal = prodRes.rows[0].id;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM stock_movements WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_product_mapping WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM products WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_events_received WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscription_changes WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)', [tenantId]);
    await pool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await closeDatabase();
  });

  const lightspeedPayload = (saleId: string, lineItems: Array<{ itemID: string; quantity: number }>, createTime?: string) => ({
    saleID: saleId,
    lineItems,
    createTime: createTime || new Date().toISOString(),
  });

  it('should return 401 without X-Tenant-Id and Bearer', async () => {
    const res = await request(app)
      .post('/webhooks/pos/lightspeed')
      .send(lightspeedPayload('sale-1', [{ itemID: '100', quantity: 1 }]));
    expect(res.status).toBe(401);
  });

  it('should return 403 for invalid webhook secret', async () => {
    const res = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', 'Bearer wrong-secret')
      .send(lightspeedPayload('sale-1', [{ itemID: '100', quantity: 1 }]));
    expect(res.status).toBe(403);
  });

  it('should return 400 for invalid payload (no sale ID)', async () => {
    const res = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send({ lineItems: [{ itemID: '100', quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it('should return 400 for empty line items', async () => {
    const res = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send({ saleID: 'sale-x', lineItems: [], createTime: new Date().toISOString() });
    expect(res.status).toBe(400);
  });

  it('should return 200 with unmapped_lines when no mapping exists (Story 2.3)', async () => {
    const saleId = 'lsp-unmapped-' + Date.now();
    const res = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(lightspeedPayload(saleId, [{ itemID: '999', quantity: 2 }]));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(0);
    expect(res.body.unmapped_lines).toBe(1);
    expect(res.body.details?.unmapped).toHaveLength(1);
    expect(res.body.details.unmapped[0].sku || res.body.details.unmapped[0].reason).toBeDefined();
  });

  it('should return 200 with processed_lines and decrement when mapping exists (Story 2.3)', async () => {
    await pool.query(
      `INSERT INTO pos_product_mapping (tenant_id, pos_type, pos_identifier, flowstock_product_id)
       VALUES ($1, 'lightspeed', 'LSP-200', $2)
       ON CONFLICT (tenant_id, pos_type, pos_identifier) DO UPDATE SET flowstock_product_id = $2`,
      [tenantId, productIdNormal]
    );

    const saleId = 'lsp-mapped-' + Date.now();
    const res = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(lightspeedPayload(saleId, [{ itemID: 'LSP-200', quantity: 3 }]));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(1);
    expect(res.body.unmapped_lines).toBe(0);

    const db = getDatabase();
    const productResult = await db.queryWithTenant<{ quantity: string }>(
      tenantId,
      'SELECT quantity::text AS quantity FROM products WHERE id = $1',
      [productIdNormal]
    );
    expect(parseFloat(productResult.rows[0].quantity)).toBe(17);
  });

  it('should return duplicate: true for same sale ID (idempotence)', async () => {
    const saleId = 'lsp-idem-' + Date.now();
    const payload = lightspeedPayload(saleId, [{ itemID: 'LSP-200', quantity: 1 }]);
    const res1 = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res1.status).toBe(200);
    expect(res1.body.received).toBe(true);

    const res2 = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.received).toBe(true);
    expect(res2.body.duplicate).toBe(true);
  });

  it('should accept form-urlencoded body with payload field', async () => {
    const saleId = 'lsp-form-' + Date.now();
    const payload = lightspeedPayload(saleId, [{ itemID: 'no-map', quantity: 1 }]);
    const res = await request(app)
      .post('/webhooks/pos/lightspeed')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .type('form')
      .send({ payload: JSON.stringify(payload) });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.unmapped_lines).toBe(1);
  });
});

describe('POST /webhooks/pos/laddition (Story 2.4)', () => {
  let pool: Pool;
  let tenantId: string;
  let productId: string;
  const webhookSecret = 'test-laddition-secret';
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'laddition-webhook@example.com',
        password: 'Test1234',
        first_name: 'LAddition',
        last_name: 'Test',
        company_name: 'LAddition Webhook Test',
      });
    expect(registerRes.status).toBe(201);
    tenantId = registerRes.body.data.tenant.id;

    await pool.query(
      `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active)
       VALUES ($1, 'laddition', $2, true)
       ON CONFLICT (tenant_id) DO UPDATE SET pos_type = 'laddition', webhook_secret = $2, is_active = true`,
      [tenantId, webhookSecret]
    );

    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);
      const prodRes = await client.query(
        `INSERT INTO products (tenant_id, sku, name, unit, quantity)
         VALUES ($1, 'SKU-LADD-1', 'Product LADD', 'piece', 15)
         RETURNING id`,
        [tenantId]
      );
      productId = prodRes.rows[0].id;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM stock_movements WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_product_mapping WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM products WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_events_received WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscription_changes WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)', [tenantId]);
    await pool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await closeDatabase();
  });

  const ladditionPayload = (saleId: string, lineItems: Array<{ product_id: string; quantity: number }>, created_at?: string) => ({
    sale_id: saleId,
    line_items: lineItems,
    created_at: created_at || new Date().toISOString(),
  });

  it('should return 401 without X-Tenant-Id and Bearer', async () => {
    const res = await request(app)
      .post('/webhooks/pos/laddition')
      .send(ladditionPayload('sale-1', [{ product_id: '100', quantity: 1 }]));
    expect(res.status).toBe(401);
  });

  it('should return 403 for invalid webhook secret', async () => {
    const res = await request(app)
      .post('/webhooks/pos/laddition')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', 'Bearer wrong-secret')
      .send(ladditionPayload('sale-1', [{ product_id: '100', quantity: 1 }]));
    expect(res.status).toBe(403);
  });

  it('should return 403 when pos_type is not laddition', async () => {
    await pool.query(
      `UPDATE tenant_pos_config SET pos_type = 'lightspeed' WHERE tenant_id = $1`,
      [tenantId]
    );
    const res = await request(app)
      .post('/webhooks/pos/laddition')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(ladditionPayload('sale-1', [{ product_id: '100', quantity: 1 }]));
    expect(res.status).toBe(403);
    await pool.query(
      `UPDATE tenant_pos_config SET pos_type = 'laddition' WHERE tenant_id = $1`,
      [tenantId]
    );
  });

  it('should return 400 for invalid payload (no sale id)', async () => {
    const res = await request(app)
      .post('/webhooks/pos/laddition')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send({ line_items: [{ product_id: '100', quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it('should return 200 with unmapped_lines when no mapping exists', async () => {
    const saleId = 'ladd-unmapped-' + Date.now();
    const res = await request(app)
      .post('/webhooks/pos/laddition')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(ladditionPayload(saleId, [{ product_id: '999', quantity: 2 }]));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(0);
    expect(res.body.unmapped_lines).toBe(1);
  });

  it('should return 200 with processed_lines and decrement when mapping exists', async () => {
    await pool.query(
      `INSERT INTO pos_product_mapping (tenant_id, pos_type, pos_identifier, flowstock_product_id)
       VALUES ($1, 'laddition', 'LADD-200', $2)
       ON CONFLICT (tenant_id, pos_type, pos_identifier) DO UPDATE SET flowstock_product_id = $2`,
      [tenantId, productId]
    );

    const saleId = 'ladd-mapped-' + Date.now();
    const res = await request(app)
      .post('/webhooks/pos/laddition')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(ladditionPayload(saleId, [{ product_id: 'LADD-200', quantity: 3 }]));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(1);
    expect(res.body.unmapped_lines).toBe(0);

    const db = getDatabase();
    const productResult = await db.queryWithTenant<{ quantity: string }>(
      tenantId,
      'SELECT quantity::text AS quantity FROM products WHERE id = $1',
      [productId]
    );
    expect(parseFloat(productResult.rows[0].quantity)).toBe(12);
  });

  it('should return duplicate: true for same sale ID (idempotence)', async () => {
    const saleId = 'ladd-idem-' + Date.now();
    const payload = ladditionPayload(saleId, [{ product_id: 'LADD-200', quantity: 1 }]);
    const res1 = await request(app)
      .post('/webhooks/pos/laddition')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res1.status).toBe(200);
    const res2 = await request(app)
      .post('/webhooks/pos/laddition')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);
  });
});

describe('POST /webhooks/pos/square (Story 2.4)', () => {
  let pool: Pool;
  let tenantId: string;
  let productId: string;
  const webhookSecret = 'test-square-secret';
  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'square-webhook@example.com',
        password: 'Test1234',
        first_name: 'Square',
        last_name: 'Test',
        company_name: 'Square Webhook Test',
      });
    expect(registerRes.status).toBe(201);
    tenantId = registerRes.body.data.tenant.id;

    await pool.query(
      `INSERT INTO tenant_pos_config (tenant_id, pos_type, webhook_secret, is_active)
       VALUES ($1, 'square', $2, true)
       ON CONFLICT (tenant_id) DO UPDATE SET pos_type = 'square', webhook_secret = $2, is_active = true`,
      [tenantId, webhookSecret]
    );

    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);
      const prodRes = await client.query(
        `INSERT INTO products (tenant_id, sku, name, unit, quantity)
         VALUES ($1, 'SKU-SQ-1', 'Product SQ', 'piece', 25)
         RETURNING id`,
        [tenantId]
      );
      productId = prodRes.rows[0].id;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM stock_movements WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_product_mapping WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM products WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM pos_events_received WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscription_changes WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM subscriptions WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1)', [tenantId]);
    await pool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await pool.end();
    await closeDatabase();
  });

  const squarePayload = (orderId: string, lineItems: Array<{ catalog_object_id: string; quantity: number }>, created_at?: string) => ({
    event_id: 'evt-' + orderId,
    created_at: created_at || new Date().toISOString(),
    data: {
      object: {
        order: {
          id: orderId,
          created_at: created_at || new Date().toISOString(),
          line_items: lineItems,
        },
      },
    },
  });

  it('should return 401 without X-Tenant-Id and Bearer', async () => {
    const res = await request(app)
      .post('/webhooks/pos/square')
      .send(squarePayload('ord-1', [{ catalog_object_id: 'cat-100', quantity: 1 }]));
    expect(res.status).toBe(401);
  });

  it('should return 403 for invalid webhook secret', async () => {
    const res = await request(app)
      .post('/webhooks/pos/square')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', 'Bearer wrong-secret')
      .send(squarePayload('ord-1', [{ catalog_object_id: 'cat-100', quantity: 1 }]));
    expect(res.status).toBe(403);
  });

  it('should return 403 when pos_type is not square (Story 2.4 M4)', async () => {
    await pool.query(
      `UPDATE tenant_pos_config SET pos_type = 'lightspeed' WHERE tenant_id = $1`,
      [tenantId]
    );
    const res = await request(app)
      .post('/webhooks/pos/square')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(squarePayload('ord-1', [{ catalog_object_id: 'cat-100', quantity: 1 }]));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Square/);
    await pool.query(
      `UPDATE tenant_pos_config SET pos_type = 'square' WHERE tenant_id = $1`,
      [tenantId]
    );
  });

  it('should return 400 for invalid payload (empty line items)', async () => {
    const res = await request(app)
      .post('/webhooks/pos/square')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send({
        event_id: 'evt-x',
        created_at: new Date().toISOString(),
        data: { object: { order: { id: 'ord-x', created_at: new Date().toISOString(), line_items: [] } } },
      });
    expect(res.status).toBe(400);
  });

  it('should return 200 with unmapped_lines when no mapping exists', async () => {
    const orderId = 'sq-unmapped-' + Date.now();
    const res = await request(app)
      .post('/webhooks/pos/square')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(squarePayload(orderId, [{ catalog_object_id: 'cat-999', quantity: 2 }]));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(0);
    expect(res.body.unmapped_lines).toBe(1);
  });

  it('should return 200 with processed_lines and decrement when mapping exists', async () => {
    await pool.query(
      `INSERT INTO pos_product_mapping (tenant_id, pos_type, pos_identifier, flowstock_product_id)
       VALUES ($1, 'square', 'SQ-200', $2)
       ON CONFLICT (tenant_id, pos_type, pos_identifier) DO UPDATE SET flowstock_product_id = $2`,
      [tenantId, productId]
    );

    const orderId = 'sq-mapped-' + Date.now();
    const res = await request(app)
      .post('/webhooks/pos/square')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(squarePayload(orderId, [{ catalog_object_id: 'SQ-200', quantity: 4 }]));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.processed_lines).toBe(1);
    expect(res.body.unmapped_lines).toBe(0);

    const db = getDatabase();
    const productResult = await db.queryWithTenant<{ quantity: string }>(
      tenantId,
      'SELECT quantity::text AS quantity FROM products WHERE id = $1',
      [productId]
    );
    expect(parseFloat(productResult.rows[0].quantity)).toBe(21);
  });

  it('should return duplicate: true for same order ID (idempotence)', async () => {
    const orderId = 'sq-idem-' + Date.now();
    const payload = squarePayload(orderId, [{ catalog_object_id: 'SQ-200', quantity: 1 }]);
    const res1 = await request(app)
      .post('/webhooks/pos/square')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res1.status).toBe(200);
    const res2 = await request(app)
      .post('/webhooks/pos/square')
      .set('X-Tenant-Id', tenantId)
      .set('Authorization', `Bearer ${webhookSecret}`)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);
  });
});
