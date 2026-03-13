import { getDatabase } from '../database/connection';

export interface DailySnapshot {
  id: string;
  tenant_id: string;
  date: string;
  product_id: string;
  stock_start: number;
  stock_end: number;
  sales_qty: number;
  losses_qty: number;
  deliveries_qty: number;
  created_at: string;
}

/**
 * Compute and upsert daily snapshots for all active products of a tenant.
 * Called by the CRON job at midnight or on demand.
 * Aggregates sales, losses and deliveries from the previous day.
 */
export async function computeDailySnapshots(
  tenantId: string,
  snapshotDate: string = new Date(Date.now() - 86400000).toISOString().split('T')[0]
): Promise<number> {
  const db = getDatabase();

  const result = await db.queryWithTenant<{ product_id: string }>(
    tenantId,
    `
    INSERT INTO daily_snapshots (tenant_id, date, product_id, stock_start, stock_end, sales_qty, losses_qty, deliveries_qty)
    SELECT
      p.tenant_id,
      $2::date AS date,
      p.id AS product_id,
      COALESCE(
        (SELECT sm.quantity_after
         FROM stock_movements sm
         WHERE sm.product_id = p.id
           AND sm.created_at < $2::date
         ORDER BY sm.created_at DESC
         LIMIT 1),
        p.quantity
      ) AS stock_start,
      p.quantity AS stock_end,
      COALESCE((
        SELECT SUM(s.quantity_sold)
        FROM sales s
        WHERE s.product_id = p.id
          AND s.sale_date = $2::date
      ), 0) AS sales_qty,
      COALESCE((
        SELECT SUM(ABS(COALESCE(sm.quantity_before, 0) - COALESCE(sm.quantity_after, 0)))
        FROM stock_movements sm
        WHERE sm.product_id = p.id
          AND sm.movement_type = 'perte'
          AND sm.created_at::date = $2::date
      ), 0) AS losses_qty,
      COALESCE((
        SELECT SUM(COALESCE(sm.quantity_after, 0) - COALESCE(sm.quantity_before, 0))
        FROM stock_movements sm
        WHERE sm.product_id = p.id
          AND sm.movement_type IN ('livraison', 'commande_en_cours')
          AND sm.created_at::date = $2::date
      ), 0) AS deliveries_qty
    FROM products p
    WHERE p.tenant_id = $1 AND p.is_active = true
    ON CONFLICT (tenant_id, date, product_id)
    DO UPDATE SET
      stock_end = EXCLUDED.stock_end,
      sales_qty = EXCLUDED.sales_qty,
      losses_qty = EXCLUDED.losses_qty,
      deliveries_qty = EXCLUDED.deliveries_qty
    RETURNING product_id
    `,
    [tenantId, snapshotDate]
  );

  return result.rows.length;
}

/**
 * Get daily snapshots for a product over the last N days.
 */
export async function getProductSnapshots(
  tenantId: string,
  productId: string,
  days: number = 30
): Promise<DailySnapshot[]> {
  const db = getDatabase();
  const result = await db.queryWithTenant<DailySnapshot>(
    tenantId,
    `SELECT * FROM daily_snapshots
     WHERE product_id = $1
       AND date >= CURRENT_DATE - $2::int
     ORDER BY date DESC`,
    [productId, days]
  );
  return result.rows;
}

/**
 * Compute snapshots for ALL active tenants (used by the CRON job).
 */
export async function computeAllTenantsSnapshots(
  snapshotDate?: string
): Promise<{ tenantId: string; count: number; error?: string }[]> {
  const db = getDatabase();
  const tenantsResult = await db.query<{ id: string }>(
    `SELECT id FROM tenants WHERE is_active = true`
  );

  const results: { tenantId: string; count: number; error?: string }[] = [];
  for (const tenant of tenantsResult.rows) {
    try {
      const count = await computeDailySnapshots(tenant.id, snapshotDate);
      results.push({ tenantId: tenant.id, count });
    } catch (err) {
      results.push({
        tenantId: tenant.id,
        count: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
  return results;
}
