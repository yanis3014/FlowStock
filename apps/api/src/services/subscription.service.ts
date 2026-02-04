import { getDatabase } from '../database/connection';

export type SubscriptionTier = 'normal' | 'premium' | 'premium_plus';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trial';

export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  started_at: Date;
  trial_ends_at: Date | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancelled_at: Date | null;
  price_monthly: number | null;
  stripe_subscription_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionFeatures {
  ai_predictions: boolean;
  smart_orders: boolean;
  photo_invoice: boolean;
  auto_orders: boolean;
  history_days: number;
}

export interface CurrentSubscriptionResponse {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  started_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  price_monthly: number | null;
  features: SubscriptionFeatures;
  trial_ends_at?: string | null;
}

const TIER_ORDER: SubscriptionTier[] = ['normal', 'premium', 'premium_plus'];

/**
 * Features per tier (PRD: Normal, Premium, Premium Plus)
 */
export function getFeaturesForTier(tier: SubscriptionTier): SubscriptionFeatures {
  switch (tier) {
    case 'normal':
      return {
        ai_predictions: false,
        smart_orders: false,
        photo_invoice: false,
        auto_orders: false,
        history_days: 30,
      };
    case 'premium':
      return {
        ai_predictions: true,
        smart_orders: true,
        photo_invoice: false,
        auto_orders: false,
        history_days: 90,
      };
    case 'premium_plus':
      return {
        ai_predictions: true,
        smart_orders: true,
        photo_invoice: true,
        auto_orders: true,
        history_days: 365,
      };
    default:
      return getFeaturesForTier('normal');
  }
}

/**
 * Get current subscription for a tenant (with RLS)
 */
export async function getCurrentSubscription(tenantId: string): Promise<CurrentSubscriptionResponse | null> {
  const db = getDatabase();
  const result = await db.queryWithTenant<SubscriptionRow>(
    tenantId,
    `SELECT id, tenant_id, tier, status, started_at, trial_ends_at,
            current_period_start, current_period_end, cancelled_at,
            price_monthly, stripe_subscription_id, created_at, updated_at
     FROM subscriptions
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    tier: row.tier,
    status: row.status,
    started_at: row.started_at.toISOString(),
    current_period_start: row.current_period_start?.toISOString() ?? null,
    current_period_end: row.current_period_end?.toISOString() ?? null,
    price_monthly: row.price_monthly != null ? Number(row.price_monthly) : null,
    features: getFeaturesForTier(row.tier),
    trial_ends_at: row.trial_ends_at?.toISOString() ?? null,
  };
}

/**
 * Create a trial subscription for a new tenant (called from register)
 * Uses raw client with tenant context already set (inside transaction).
 */
export async function createTrialSubscriptionForTenant(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }> },
  tenantId: string
): Promise<SubscriptionRow | null> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const result = await client.query(
    `INSERT INTO subscriptions (tenant_id, tier, status, trial_ends_at)
     VALUES ($1, 'normal', 'trial', $2)
     RETURNING id, tenant_id, tier, status, started_at, trial_ends_at,
               current_period_start, current_period_end, cancelled_at,
               price_monthly, stripe_subscription_id, created_at, updated_at`,
    [tenantId, trialEndsAt]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0] as SubscriptionRow;
}

/**
 * Get subscription row for auth responses (by tenant_id, bypass RLS via same-tenant query)
 */
export async function getSubscriptionForAuth(tenantId: string): Promise<{
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_ends_at?: string | null;
} | null> {
  const sub = await getCurrentSubscription(tenantId);
  if (!sub) return null;
  return {
    tier: sub.tier,
    status: sub.status,
    trial_ends_at: sub.trial_ends_at ?? null,
  };
}

/**
 * Upgrade (or downgrade) subscription tier. Logs change to subscription_changes.
 */
export async function upgradeSubscription(
  tenantId: string,
  newTier: SubscriptionTier,
  userId: string
): Promise<{
  subscription_id: string;
  old_tier: SubscriptionTier;
  new_tier: SubscriptionTier;
  effective_date: string;
  prorated_amount: number;
}> {
  const db = getDatabase();

  const current = await getCurrentSubscription(tenantId);
  if (!current) {
    throw new Error('No subscription found for tenant');
  }

  const oldTier = current.tier;
  if (oldTier === newTier) {
    throw new Error('Subscription tier unchanged');
  }

  const effectiveDate = new Date();
  const periodEnd = new Date(effectiveDate);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_tenant_context($1::uuid)', [tenantId]);

    await client.query(
      `UPDATE subscriptions
       SET tier = $1, status = 'active', updated_at = CURRENT_TIMESTAMP,
           current_period_start = $2, current_period_end = $3
       WHERE tenant_id = $4
       RETURNING id`,
      [newTier, effectiveDate, periodEnd, tenantId]
    );

    const subResult = await client.query(
      'SELECT id FROM subscriptions WHERE tenant_id = $1',
      [tenantId]
    );
    const subscriptionId = subResult.rows[0]?.id;
    if (!subscriptionId) {
      await client.query('ROLLBACK');
      throw new Error('Subscription not found after update');
    }

    await client.query(
      `INSERT INTO subscription_changes (tenant_id, subscription_id, old_tier, new_tier, changed_by_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, subscriptionId, oldTier, newTier, userId]
    );

    await client.query('COMMIT');

    return {
      subscription_id: subscriptionId,
      old_tier: oldTier,
      new_tier: newTier,
      effective_date: effectiveDate.toISOString(),
      prorated_amount: 0,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Check if tenant's tier satisfies required tiers (tenant tier >= min of required)
 */
export function tierSatisfies(tenantTier: SubscriptionTier, requiredTiers: SubscriptionTier[]): boolean {
  if (requiredTiers.length === 0) return true;
  const tenantLevel = TIER_ORDER.indexOf(tenantTier);
  const minRequired = Math.min(...requiredTiers.map((t) => TIER_ORDER.indexOf(t)));
  return tenantLevel >= minRequired;
}
