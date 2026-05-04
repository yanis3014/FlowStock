import crypto from 'crypto';
import { getDatabase } from '../database/connection';

export async function generateRushToken(tenantId: string, label = 'Écran cuisine') {
  const db = getDatabase();
  const token = crypto.randomBytes(32).toString('hex'); // 64 chars URL-safe
  const result = await db.query<{ id: string; token: string }>(
    `INSERT INTO rush_tokens (tenant_id, token, label)
     VALUES ($1, $2, $3)
     RETURNING id, token`,
    [tenantId, token, label]
  );
  return result.rows[0];
}

export async function getRushTokensForTenant(tenantId: string) {
  const db = getDatabase();
  const result = await db.query(
    `SELECT id, token, label, is_active, created_at, last_used_at
     FROM rush_tokens
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows;
}

export async function revokeRushToken(tenantId: string, tokenId: string) {
  const db = getDatabase();
  await db.query(
    `UPDATE rush_tokens SET is_active = false WHERE id = $1 AND tenant_id = $2`,
    [tokenId, tenantId]
  );
}

export async function validateRushToken(token: string) {
  const db = getDatabase();
  const result = await db.query<{ tenant_id: string; id: string }>(
    `UPDATE rush_tokens
     SET last_used_at = NOW()
     WHERE token = $1
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
     RETURNING tenant_id, id`,
    [token]
  );
  return result.rows[0] ?? null;
}

