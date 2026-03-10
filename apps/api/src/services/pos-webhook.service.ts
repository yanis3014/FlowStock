/**
 * POS Webhook service (Story 2.1)
 * Validates incoming POS sale events, resolves tenant, enforces idempotence.
 */
import * as crypto from 'crypto';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Verify Square webhook signature (Story 2.4 H1).
 * Square: x-square-hmacsha256-signature = base64(HMAC-SHA256(notificationUrl + rawBody, signatureKey)).
 * @see https://developer.squareup.com/docs/webhooks/step3validate
 */
export function verifySquareSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  signingKey: string,
  notificationUrl: string
): boolean {
  if (!signatureHeader?.trim() || !signingKey.trim() || !notificationUrl.trim()) return false;
  const payload = notificationUrl.trim() + rawBody.toString('utf8');
  const expected = crypto
    .createHmac('sha256', signingKey.trim())
    .update(payload, 'utf8')
    .digest('base64');
  const a = Buffer.from(signatureHeader.trim(), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type PosType = 'lightspeed' | 'laddition' | 'square' | 'manual';

export interface TenantPosConfigRow {
  id: string;
  tenant_id: string;
  pos_type: string;
  webhook_secret: string;
  is_active: boolean;
  square_signature_key?: string | null;
  square_notification_url?: string | null;
}

/** Minimal payload schema for POS sale event (common across adapters) */
export interface PosWebhookLine {
  product_id?: string;
  sku?: string;
  quantity: number;
}

export interface PosWebhookPayload {
  external_id: string;
  lines: PosWebhookLine[];
  sold_at: string; // ISO 8601 or timestamp
}

export interface PayloadValidationResult {
  ok: true;
  payload: PosWebhookPayload;
}
export interface PayloadValidationError {
  ok: false;
  error: string;
}

/**
 * Resolve tenant and validate webhook secret.
 * Expects X-Tenant-Id header + Authorization: Bearer <webhook_secret>.
 */
export async function getConfigByTenantAndSecret(
  tenantId: string,
  secret: string
): Promise<TenantPosConfigRow | null> {
  const db = getDatabase();
  const result = await db.query<TenantPosConfigRow>(
    `SELECT id, tenant_id, pos_type, webhook_secret, is_active, square_signature_key, square_notification_url
     FROM tenant_pos_config
     WHERE tenant_id = $1 AND webhook_secret = $2 AND is_active = true`,
    [tenantId, secret]
  );
  return result.rows[0] ?? null;
}

/**
 * Validate payload: external_id (string), lines (array with quantity, product_id or sku), sold_at (string).
 */
export function validatePayload(body: unknown): PayloadValidationResult | PayloadValidationError {
  if (body == null || typeof body !== 'object') {
    return { ok: false, error: 'Payload must be a JSON object' };
  }
  const o = body as Record<string, unknown>;
  const external_id = o.external_id;
  if (typeof external_id !== 'string' || !external_id.trim()) {
    return { ok: false, error: 'external_id is required and must be a non-empty string' };
  }
  const lines = o.lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, error: 'lines is required and must be a non-empty array' };
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line == null || typeof line !== 'object') {
      return { ok: false, error: `lines[${i}] must be an object` };
    }
    const l = line as Record<string, unknown>;
    const q = l.quantity;
    if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) {
      return { ok: false, error: `lines[${i}].quantity must be a positive number` };
    }
    const hasRef = (typeof l.product_id === 'string' && l.product_id.length > 0) ||
      (typeof l.sku === 'string' && l.sku.length > 0);
    if (!hasRef) {
      return { ok: false, error: `lines[${i}] must have product_id or sku` };
    }
  }
  const sold_at = o.sold_at;
  if (typeof sold_at !== 'string' || !sold_at.trim()) {
    return { ok: false, error: 'sold_at is required and must be a non-empty string (ISO date or timestamp)' };
  }
  return {
    ok: true,
    payload: {
      external_id: external_id.trim(),
      lines: lines.map((l: Record<string, unknown>) => ({
        product_id: typeof l.product_id === 'string' ? l.product_id : undefined,
        sku: typeof l.sku === 'string' ? l.sku : undefined,
        quantity: (l.quantity as number),
      })),
      sold_at: (sold_at as string).trim(),
    },
  };
}

/**
 * Record event for idempotence. Returns 'inserted' if new, 'duplicate' if already seen.
 * Uses INSERT ... ON CONFLICT DO NOTHING so that concurrent requests are safe.
 */
export async function recordEventIdempotent(
  tenantId: string,
  externalId: string
): Promise<'inserted' | 'duplicate'> {
  const db = getDatabase();
  const result = await db.queryWithTenant<{ id: string }>(
    tenantId,
    `INSERT INTO pos_events_received (tenant_id, external_id) VALUES ($1, $2)
     ON CONFLICT (tenant_id, external_id) DO NOTHING
     RETURNING id`,
    [tenantId, externalId]
  );
  return result.rowCount != null && result.rowCount > 0 ? 'inserted' : 'duplicate';
}

/**
 * Check if we already received this event (for logging only; recordEventIdempotent does the real work).
 */
export async function isEventAlreadyReceived(tenantId: string, externalId: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.queryWithTenant<{ id: string }>(
    tenantId,
    'SELECT id FROM pos_events_received WHERE tenant_id = $1 AND external_id = $2',
    [tenantId, externalId]
  );
  return result.rows.length > 0;
}

export function logWebhookError(
  statusCode: number,
  tenantId: string | null,
  externalId: string | null,
  errorType: string,
  message: string
): void {
  logger.warn('POS webhook error', {
    statusCode,
    tenant_id: tenantId ?? undefined,
    external_id: externalId ?? undefined,
    error_type: errorType,
    message,
  });
}
