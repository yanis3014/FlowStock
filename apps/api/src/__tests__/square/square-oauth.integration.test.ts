import request from 'supertest';
import { resolve } from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { runMigrations } from '../../database/migrations';
import { getDatabase, closeDatabase } from '../../database/connection';
import app from '../../index';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Square OAuth (integrations + callback)', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;
  const originalFetch = global.fetch;

  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const email = `square-oauth-${Date.now()}@example.com`;
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email,
        password: 'Test1234',
        first_name: 'Sq',
        last_name: 'OAuth',
        company_name: 'Square OAuth Co',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [email]);

    global.fetch = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/oauth2/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
            merchant_id: 'merchant_test_123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (originalFetch) {
        return originalFetch(url);
      }
      throw new Error(`Unexpected fetch: ${u}`);
    }) as unknown as typeof fetch;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await pool.query('DELETE FROM tenant_pos_config WHERE tenant_id = $1', [tenantId]);
    await pool.query('DELETE FROM square_oauth_states WHERE tenant_id = $1', [tenantId]);
    await pool.end();
    await closeDatabase();
  });

  it('returns authorizeUrl from GET /integrations/square/oauth-url (auth required)', async () => {
    const res = await request(app)
      .get('/integrations/square/oauth-url')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const url = res.body.data?.authorizeUrl as string;
    expect(url).toMatch(/^https:\/\/connect\.squareup(sandbox)?\.com\/oauth2\/authorize\?/);
    expect(url).toContain('state=');
  });

  it('rejects GET /integrations/square/oauth-url without token', async () => {
    const res = await request(app).get('/integrations/square/oauth-url');
    expect(res.status).toBe(401);
  });

  it('redirects callback with error when state is invalid', async () => {
    const res = await request(app).get('/auth/square/callback?code=abc&state=invalid-state-token');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/parametres?square=error');
  });

  it('completes OAuth callback and stores encrypted tokens', async () => {
    const start = await request(app)
      .get('/integrations/square/oauth-url')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(start.status).toBe(200);
    const authorizeUrl = start.body.data.authorizeUrl as string;
    const state = new URL(authorizeUrl).searchParams.get('state');
    expect(state).toBeTruthy();

    const cb = await request(app).get(
      `/auth/square/callback?code=test-auth-code&state=${encodeURIComponent(state!)}`
    );
    expect(cb.status).toBe(302);
    expect(cb.headers.location).toContain('/parametres?square=connected');

    const row = await pool.query(
      `SELECT square_merchant_id, square_access_token_encrypted, square_refresh_token_encrypted
       FROM tenant_pos_config WHERE tenant_id = $1`,
      [tenantId]
    );
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].square_merchant_id).toBe('merchant_test_123');
    expect(row.rows[0].square_access_token_encrypted).toBeTruthy();
    expect(String(row.rows[0].square_access_token_encrypted)).not.toContain('test-access-token');
    expect(row.rows[0].square_refresh_token_encrypted).toBeTruthy();
  });
});
