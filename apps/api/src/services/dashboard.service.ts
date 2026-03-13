import { getDatabase } from '../database/connection';
import { getSalesStats } from './sales.service';
import { listProducts } from './product.service';
import { getLossAnomalyAlerts } from './discrepancy.service';

export interface DashboardSummary {
  sales_yesterday: {
    total_amount: number;
    transaction_count: number;
    change_percent: number | null;
  };
  current_stock: {
    total_value: number;
    product_count: number;
    low_stock_count: number;
    critical_stock_count: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    product: {
      id: string;
      name: string;
    };
    message: string;
    created_at: string;
  }>;
  unread_alert_count: number;
  pending_orders: number;
  pending_invoices: number;
}

export interface RecentMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: string;
  quantity_before: number | null;
  quantity_after: number | null;
  reason: string | null;
  created_at: string;
}

export interface DailyConsumption {
  date: string;
  quantity_sold: number;
  total_amount: number | null;
}

/**
 * Get tenant alert threshold from settings (default: 1.2 = 120% of min_quantity)
 */
async function getTenantAlertThreshold(tenantId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.query<{ settings: any }>(
    'SELECT settings FROM tenants WHERE id = $1',
    [tenantId]
  );
  
  if (result.rows.length === 0) {
    return 1.2; // Default threshold: 120% of min_quantity
  }
  
  const settings = result.rows[0].settings || {};
  // Threshold can be a multiplier (e.g., 1.2 = 120% of min_quantity) or absolute value
  // For MVP, we use multiplier: if quantity <= min_quantity * threshold, alert is triggered
  return settings.lowStockThresholdPercent != null 
    ? parseFloat(settings.lowStockThresholdPercent) / 100 
    : 1.2; // Default: 120%
}

/**
 * Check if product should trigger low stock alert based on configurable threshold.
 * Note: The product list uses computeStockStatus(quantity <= min_quantity) for the "low" badge.
 * The dashboard uses this configurable threshold (e.g. 120% of min_quantity), so a product can
 * show an alert here while still displaying "OK" on the product list — this is intentional
 * (early warning) until/unless the product list is updated to use the same tenant threshold.
 */
function shouldTriggerLowStockAlert(
  quantity: number,
  minQuantity: number | null,
  threshold: number
): boolean {
  if (quantity <= 0) return true; // Always alert for zero stock
  if (minQuantity == null || minQuantity <= 0) return false; // No threshold configured
  
  // Alert if quantity <= min_quantity * threshold
  // Example: threshold = 1.2 means alert when quantity <= 120% of min_quantity
  return quantity <= minQuantity * threshold;
}

/**
 * Get IDs of alerts already read by user in this tenant
 */
async function getReadAlertIds(tenantId: string, userId: string): Promise<Set<string>> {
  const db = getDatabase();
  const result = await db.query<{ alert_id: string }>(
    'SELECT alert_id FROM alert_reads WHERE tenant_id = $1 AND user_id = $2',
    [tenantId, userId]
  );
  return new Set(result.rows.map((r) => r.alert_id));
}

/**
 * Mark an alert as read for a user in a tenant
 */
export async function markAlertAsRead(tenantId: string, userId: string, alertId: string): Promise<void> {
  const db = getDatabase();
  await db.query(
    `INSERT INTO alert_reads (tenant_id, user_id, alert_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, user_id, alert_id) DO NOTHING`,
    [tenantId, userId, alertId]
  );
}

/**
 * Get the 5 most recent stock movements across all products for a tenant
 */
export async function getRecentMovements(tenantId: string, limit = 5): Promise<RecentMovement[]> {
  const db = getDatabase();
  const result = await db.query<{
    id: string;
    product_id: string;
    product_name: string;
    movement_type: string;
    quantity_before: string | null;
    quantity_after: string | null;
    reason: string | null;
    created_at: Date;
  }>(
    `SELECT m.id, m.product_id, p.name AS product_name,
            m.movement_type, m.quantity_before, m.quantity_after,
            m.reason, m.created_at
     FROM stock_movements m
     JOIN products p ON p.id = m.product_id
     WHERE m.tenant_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  return result.rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_name: r.product_name,
    movement_type: r.movement_type,
    quantity_before: r.quantity_before != null ? parseFloat(r.quantity_before) : null,
    quantity_after: r.quantity_after != null ? parseFloat(r.quantity_after) : null,
    reason: r.reason,
    created_at: r.created_at.toISOString(),
  }));
}

/**
 * Get daily sales consumption for the last N days (for the météo stock widget)
 */
export async function getDailyConsumption(tenantId: string, days = 7): Promise<DailyConsumption[]> {
  const db = getDatabase();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const result = await db.query<{
    sale_date: string;
    quantity_sold: string;
    total_amount: string | null;
  }>(
    `SELECT DATE(created_at AT TIME ZONE 'UTC') AS sale_date,
            COALESCE(SUM(quantity_sold), 0) AS quantity_sold,
            SUM(unit_price * quantity_sold) AS total_amount
     FROM sales
     WHERE tenant_id = $1 AND created_at >= $2
     GROUP BY DATE(created_at AT TIME ZONE 'UTC')
     ORDER BY sale_date ASC`,
    [tenantId, dateFrom.toISOString()]
  );

  // Fill missing days with 0
  const resultMap = new Map(result.rows.map((r) => [r.sale_date, r]));
  const allDays: DailyConsumption[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const row = resultMap.get(key);
    allDays.push({
      date: key,
      quantity_sold: row ? parseFloat(row.quantity_sold) : 0,
      total_amount: row?.total_amount != null ? parseFloat(row.total_amount) : null,
    });
  }
  return allDays;
}

/**
 * Get dashboard summary data for a tenant
 */
export async function getDashboardSummary(tenantId: string, userId?: string): Promise<DashboardSummary> {
  const db = getDatabase();

  // Get tenant alert threshold
  const alertThreshold = await getTenantAlertThreshold(tenantId);
  const readAlertIds = userId ? await getReadAlertIds(tenantId, userId) : new Set<string>();

  // Get sales stats (yesterday data)
  const salesStats = await getSalesStats(tenantId);
  const yesterdayAmount = salesStats.yesterday.total_amount ?? 0;
  const yesterdayCount = salesStats.yesterday.count;
  
  // Calculate change percent (yesterday vs day before yesterday)
  // For MVP, we'll use a simple calculation: compare yesterday with average of last 7 days
  // For now, we'll set it to null if we don't have enough data
  let changePercent: number | null = null;
  if (salesStats.this_week.total_amount != null && salesStats.this_week.count > 0) {
    const weekAverage = (salesStats.this_week.total_amount ?? 0) / Math.max(salesStats.this_week.count, 1);
    if (weekAverage > 0) {
      changePercent = ((yesterdayAmount - weekAverage) / weekAverage) * 100;
    }
  }

  // Get products to calculate stock statistics (capped for performance)
  const MAX_PRODUCTS_FOR_DASHBOARD = 5000;
  const productsResult = await listProducts(tenantId, {
    page: 1,
    limit: MAX_PRODUCTS_FOR_DASHBOARD,
  });

  const products = productsResult.data;
  let totalValue = 0;
  let lowStockCount = 0;
  let criticalStockCount = 0;

  const alerts: DashboardSummary['alerts'] = [];

  for (const product of products) {
    // Calculate product value
    if (product.purchase_price != null) {
      totalValue += product.purchase_price * product.quantity;
    }

    // Count low/critical stock
    if (product.stock_status === 'low') {
      lowStockCount++;
    } else if (product.stock_status === 'critical') {
      criticalStockCount++;
    }

    // Generate alerts for low/critical stock using configurable threshold
    // Use threshold to determine if alert should be triggered (even if stock_status is 'ok')
    const shouldAlert = shouldTriggerLowStockAlert(
      product.quantity,
      product.min_quantity,
      alertThreshold
    );
    
    if (product.quantity === 0 || product.stock_status === 'critical') {
      // Critical: zero stock or already marked as critical
      alerts.push({
        id: `alert_${product.id}_critical`,
        type: 'critical_stock',
        severity: 'high',
        product: {
          id: product.id,
          name: product.name,
        },
        message: product.quantity === 0 
          ? 'Stock épuisé' 
          : `Stock critique (${product.quantity} ${product.unit} restant${product.quantity > 1 ? 's' : ''})`,
        created_at: new Date().toISOString(),
      });
    } else if (shouldAlert || product.stock_status === 'low') {
      // Low stock: triggered by threshold or already marked as low
      alerts.push({
        id: `alert_${product.id}_low`,
        type: 'low_stock',
        severity: 'medium',
        product: {
          id: product.id,
          name: product.name,
        },
        message: `Stock faible (${product.quantity} ${product.unit} restant${product.quantity > 1 ? 's' : ''})`,
        created_at: new Date().toISOString(),
      });
    }
    
    // Rupture imminente: only when stock is already low/critical and lead_time_days is set.
    // Full prediction (days remaining) will come from IA in Epic 5.
    if (
      product.lead_time_days != null &&
      product.lead_time_days > 0 &&
      (product.stock_status === 'low' || product.stock_status === 'critical') &&
      product.quantity > 0
    ) {
      alerts.push({
        id: `alert_${product.id}_rupture`,
        type: 'rupture_imminente',
        severity: 'high',
        product: {
          id: product.id,
          name: product.name,
        },
        message: `Rupture imminente possible — délai fournisseur: ${product.lead_time_days}j (prédiction IA à venir)`,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Epic 8.2: add loss anomaly alerts (products with high loss rates last 7 days)
  try {
    const lossAlerts = await getLossAnomalyAlerts(tenantId, 10);
    alerts.push(...lossAlerts);
  } catch {
    // Non-blocking: loss anomaly alerts are best-effort
  }

  // Sort alerts by severity (high first) and limit to 10 most recent
  alerts.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const allAlerts = alerts.slice(0, 10);
  const unreadAlerts = allAlerts.filter((a) => !readAlertIds.has(a.id));
  const unreadCount = unreadAlerts.length;

  return {
    sales_yesterday: {
      total_amount: yesterdayAmount,
      transaction_count: yesterdayCount,
      change_percent: changePercent,
    },
    current_stock: {
      total_value: totalValue,
      product_count: products.length,
      low_stock_count: lowStockCount,
      critical_stock_count: criticalStockCount,
    },
    alerts: unreadAlerts,
    unread_alert_count: unreadCount,
    pending_orders: 0, // TODO: Implement when orders feature is available (Epic 6)
    pending_invoices: 0, // TODO: Implement when invoices feature is available (Epic 7)
  };
}

/**
 * Update tenant alert threshold setting
 */
export async function updateTenantAlertThreshold(
  tenantId: string,
  thresholdPercent: number
): Promise<void> {
  if (thresholdPercent < 50 || thresholdPercent > 500) {
    throw new Error('Threshold must be between 50% and 500%');
  }
  
  const db = getDatabase();
  const result = await db.query<{ settings: any }>(
    'SELECT settings FROM tenants WHERE id = $1',
    [tenantId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Tenant not found');
  }
  
  const currentSettings = result.rows[0].settings || {};
  const updatedSettings = {
    ...currentSettings,
    lowStockThresholdPercent: thresholdPercent,
  };
  
  await db.query(
    'UPDATE tenants SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [JSON.stringify(updatedSettings), tenantId]
  );
}

/**
 * Get tenant alert threshold setting
 */
export async function getTenantAlertThresholdSetting(tenantId: string): Promise<number> {
  const threshold = await getTenantAlertThreshold(tenantId);
  // Return as percentage (e.g., 120 instead of 1.2)
  return threshold * 100;
}
