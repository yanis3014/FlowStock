/**
 * POS Sync Status service (Story 2.5)
 * Tracks last event received, webhook failures, and degraded mode for POS sync.
 */
import { getDatabase } from '../database/connection';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface PosSyncStatus {
  is_degraded: boolean;
  last_event_at: string | null;
  degraded_since: string | null;
  failure_count: number;
}

const SILENCE_MS = () => (config.POS_DEGRADED_SILENCE_MINUTES ?? 15) * 60 * 1000;
const FAILURE_THRESHOLD = () => config.POS_DEGRADED_FAILURE_THRESHOLD ?? 5;

/**
 * Update tenant_pos_config after a successful webhook processing.
 * Sets last_event_received_at, clears is_degraded_since and resets failure count.
 */
export async function recordWebhookSuccess(tenantId: string): Promise<void> {
  const db = getDatabase();
  await db.query(
    `UPDATE tenant_pos_config
     SET last_event_received_at = CURRENT_TIMESTAMP,
         is_degraded_since = NULL,
         webhook_failure_count = 0,
         updated_at = CURRENT_TIMESTAMP
     WHERE tenant_id = $1`,
    [tenantId]
  );
}

/**
 * Record a webhook failure (4xx/5xx or processing error) for the tenant.
 */
export async function recordWebhookFailure(tenantId: string): Promise<void> {
  const db = getDatabase();
  await db.query(
    `UPDATE tenant_pos_config
     SET webhook_failure_count = webhook_failure_count + 1,
         last_webhook_failure_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE tenant_id = $1`,
    [tenantId]
  );
}

/**
 * Get current sync status for a tenant (for GET /dashboard/pos-sync-status).
 */
export async function getSyncStatus(tenantId: string): Promise<PosSyncStatus | null> {
  const db = getDatabase();
  const result = await db.query<{
    last_event_received_at: Date | null;
    is_degraded_since: Date | null;
    webhook_failure_count: number;
  }>(
    `SELECT last_event_received_at, is_degraded_since, webhook_failure_count
     FROM tenant_pos_config
     WHERE tenant_id = $1 AND is_active = true`,
    [tenantId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    is_degraded: row.is_degraded_since != null,
    last_event_at: row.last_event_received_at ? row.last_event_received_at.toISOString() : null,
    degraded_since: row.is_degraded_since ? row.is_degraded_since.toISOString() : null,
    failure_count: row.webhook_failure_count ?? 0,
  };
}

/**
 * Evaluate and update degraded state for one tenant (silence + failure threshold).
 */
export async function evaluateDegradedForTenant(tenantId: string): Promise<void> {
  const db = getDatabase();
  const silenceMs = SILENCE_MS();
  const threshold = FAILURE_THRESHOLD();

  const row = await db.query<{
    last_event_received_at: Date | null;
    is_degraded_since: Date | null;
    webhook_failure_count: number;
    created_at: Date;
  }>(
    `SELECT last_event_received_at, is_degraded_since, webhook_failure_count, created_at
     FROM tenant_pos_config
     WHERE tenant_id = $1 AND is_active = true`,
    [tenantId]
  );
  const r = row.rows[0];
  if (!r) return;

  const now = Date.now();
  const lastEventMs = r.last_event_received_at ? r.last_event_received_at.getTime() : null;
  const referenceMs = lastEventMs ?? (r.created_at ? r.created_at.getTime() : null);
  const silenceExceeded =
    referenceMs != null && now - referenceMs > silenceMs;
  const failuresExceeded = (r.webhook_failure_count ?? 0) >= threshold;
  const shouldBeDegraded = silenceExceeded || failuresExceeded;

  if (shouldBeDegraded && r.is_degraded_since == null) {
    await db.query(
      `UPDATE tenant_pos_config
       SET is_degraded_since = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1`,
      [tenantId]
    );
    logger.info('POS sync marked degraded (silence or failures)', { tenant_id: tenantId });
  } else if (!shouldBeDegraded && r.is_degraded_since != null) {
    await db.query(
      `UPDATE tenant_pos_config
       SET is_degraded_since = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $1`,
      [tenantId]
    );
    logger.info('POS sync recovered from degraded', { tenant_id: tenantId });
  }
}

/**
 * Run evaluation for all tenants with active POS config (called periodically).
 */
export async function runPeriodicEvaluation(): Promise<void> {
  const db = getDatabase();
  const tenants = await db.query<{ tenant_id: string }>(
    `SELECT tenant_id FROM tenant_pos_config WHERE is_active = true`
  );
  for (const { tenant_id } of tenants.rows) {
    try {
      await evaluateDegradedForTenant(tenant_id);
    } catch (err) {
      logger.warn('POS sync evaluation failed for tenant', { err, tenant_id });
    }
  }
}
