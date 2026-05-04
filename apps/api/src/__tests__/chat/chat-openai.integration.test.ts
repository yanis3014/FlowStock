jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Réponse mock GPT-4o-mini' } }],
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          }),
        },
      },
    })),
  };
});

import request from 'supertest';
import { resolve } from 'path';
import app from '../../index';
import { getDatabase, closeDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrations';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

describe('Chat Phase 2 — OpenAI routes integration (mocked)', () => {
  let pool: Pool;
  let accessToken: string;
  let tenantId: string;

  const testDbUrl =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDbUrl });
    await runMigrations();

    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'chatgptphase2@example.com',
        password: 'Test1234',
        first_name: 'Chat',
        last_name: 'Phase2',
        company_name: 'Chat Phase2 Company',
      });
    expect(registerRes.status).toBe(201);
    accessToken = registerRes.body.data.access_token;
    tenantId = registerRes.body.data.tenant.id;

    const db = getDatabase();
    await db.queryWithTenant(tenantId, `UPDATE users SET email_verified = true WHERE email = $1`, [
      'chatgptphase2@example.com',
    ]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM chat_messages');
    await pool.query('DELETE FROM chat_context');
    await pool.query('DELETE FROM chat_conversations');
    await pool.query('DELETE FROM subscription_changes');
    await pool.query('DELETE FROM subscriptions');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM users');
    await pool.query("DELETE FROM tenants WHERE slug LIKE 'chat-phase2%'");
    await pool.end();
    await closeDatabase();
  });

  it('POST /chat/message creates conversation and returns mocked response', async () => {
    const res = await request(app)
      .post('/chat/message')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'Bonjour, quel est mon stock critique ?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.conversation_id).toBe('string');
    expect(res.body.data.response).toBe('Réponse mock GPT-4o-mini');
    expect(res.body.data.tokens_used).toBe(150);
  });

  it('GET /chat/conversations returns at least one conversation', async () => {
    const res = await request(app)
      .get('/chat/conversations')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.conversations)).toBe(true);
    expect(res.body.data.conversations.length).toBeGreaterThan(0);
  });

  it('GET /chat/history returns persisted messages', async () => {
    const create = await request(app)
      .post('/chat/message')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: 'Test historique' });
    const convId = create.body.data.conversation_id as string;

    const res = await request(app)
      .get(`/chat/history?conversation_id=${encodeURIComponent(convId)}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.messages)).toBe(true);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(2);
  });
});

