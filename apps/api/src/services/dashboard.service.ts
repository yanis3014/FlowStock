import { getDatabase } from '../database/connection';
import { getSalesStats } from './sales.service';
import { listProducts } from './product.service';

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
  pending_orders: number;
  pending_invoices: number;
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
 * Get dashboard summary data for a tenant
 */
export async function getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
  const db = getDatabase();

  // Get tenant alert threshold
  const alertThreshold = await getTenantAlertThreshold(tenantId);

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

  // Sort alerts by severity (high first) and limit to 10 most recent
  alerts.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

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
    alerts: alerts.slice(0, 10), // Limit to 10 alerts
    pending_orders: 0, // TODO: Implement when orders feature is available
    pending_invoices: 0, // TODO: Implement when invoices feature is available
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
