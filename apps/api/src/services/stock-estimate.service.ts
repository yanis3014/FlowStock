import { getDatabase } from '../database/connection';
import { getProductById } from './product.service';

// ============================================================================
// Types
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

export interface StockEstimate {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  unit: string;
  avg_daily_consumption: number | null;
  days_remaining: number | null;
  estimated_stockout_date: string | null;
  confidence_level: ConfidenceLevel;
  sales_days_count: number;
  period_days: number;
}

interface SalesAggregation {
  total_sold: number;
  distinct_days: number;
}

// ============================================================================
// Confidence level computation
// ============================================================================

/**
 * Compute confidence level based on the number of distinct sales days
 * relative to the analysis period.
 *
 * - high:         >= 20 distinct days
 * - medium:       7..19 distinct days
 * - low:          1..6 distinct days
 * - insufficient: 0 (no sales data)
 */
export function computeConfidenceLevel(salesDaysCount: number): ConfidenceLevel {
  if (salesDaysCount >= 20) return 'high';
  if (salesDaysCount >= 7) return 'medium';
  if (salesDaysCount >= 1) return 'low';
  return 'insufficient';
}

// ============================================================================
// Sales aggregation queries
// ============================================================================

/**
 * Fetch aggregated sales data for ALL products in a tenant for a given period.
 * Returns a Map keyed by product_id with { total_sold, distinct_days }.
 *
 * Uses a single SQL query with GROUP BY — no N+1.
 */
export async function getSalesAggregationBatch(
  tenantId: string,
  periodDays: number
): Promise<Map<string, SalesAggregation>> {
  const db = getDatabase();
  const result = await db.queryWithTenant<{
    product_id: string;
    total_sold: string;
    distinct_days: string;
  }>(
    tenantId,
    `SELECT
       product_id,
       COALESCE(SUM(quantity_sold), 0) AS total_sold,
       COUNT(DISTINCT sale_date) AS distinct_days
     FROM sales
     WHERE sale_date >= CURRENT_DATE - $1::int
     GROUP BY product_id`,
    [periodDays]
  );

  const map = new Map<string, SalesAggregation>();
  for (const row of result.rows) {
    map.set(row.product_id, {
      total_sold: parseFloat(row.total_sold),
      distinct_days: parseInt(row.distinct_days, 10),
    });
  }
  return map;
}

/**
 * Fetch aggregated sales data for a SINGLE product.
 */
export async function getSalesAggregationForProduct(
  tenantId: string,
  productId: string,
  periodDays: number
): Promise<SalesAggregation> {
  const db = getDatabase();
  const result = await db.queryWithTenant<{
    total_sold: string;
    distinct_days: string;
  }>(
    tenantId,
    `SELECT
       COALESCE(SUM(quantity_sold), 0) AS total_sold,
       COUNT(DISTINCT sale_date) AS distinct_days
     FROM sales
     WHERE product_id = $1
       AND sale_date >= CURRENT_DATE - $2::int`,
    [productId, periodDays]
  );

  const row = result.rows[0];
  return {
    total_sold: parseFloat(row?.total_sold ?? '0'),
    distinct_days: parseInt(row?.distinct_days ?? '0', 10),
  };
}

// ============================================================================
// Build a StockEstimate from product + sales aggregation
// ============================================================================

function buildEstimate(
  productId: string,
  productName: string,
  sku: string,
  currentStock: number,
  unit: string,
  salesAgg: SalesAggregation | undefined,
  periodDays: number
): StockEstimate {
  const totalSold = salesAgg?.total_sold ?? 0;
  const distinctDays = salesAgg?.distinct_days ?? 0;

  const avgDailyConsumption = periodDays > 0 ? totalSold / periodDays : 0;
  const confidenceLevel = computeConfidenceLevel(distinctDays);

  let daysRemaining: number | null = null;
  let estimatedStockoutDate: string | null = null;

  if (avgDailyConsumption > 0) {
    daysRemaining = Math.round((currentStock / avgDailyConsumption) * 10) / 10;
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + Math.ceil(daysRemaining));
    estimatedStockoutDate = stockoutDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  return {
    product_id: productId,
    product_name: productName,
    sku,
    current_stock: currentStock,
    unit,
    avg_daily_consumption: avgDailyConsumption > 0
      ? Math.round(avgDailyConsumption * 1000) / 1000
      : null,
    days_remaining: daysRemaining,
    estimated_stockout_date: estimatedStockoutDate,
    confidence_level: confidenceLevel,
    sales_days_count: distinctDays,
    period_days: periodDays,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get stock time estimate for a single product.
 */
export async function getProductStockEstimate(
  tenantId: string,
  productId: string,
  periodDays: number = 30
): Promise<StockEstimate | null> {
  const product = await getProductById(tenantId, productId);
  if (!product) return null;

  const salesAgg = await getSalesAggregationForProduct(tenantId, productId, periodDays);

  return buildEstimate(
    product.id,
    product.name,
    product.sku,
    product.quantity,
    product.unit,
    salesAgg,
    periodDays
  );
}

/**
 * Get stock time estimates for ALL active products of a tenant.
 * Sorted by urgency: days_remaining ASC (nulls last).
 */
export async function getAllStockEstimates(
  tenantId: string,
  periodDays: number = 30
): Promise<StockEstimate[]> {
  const db = getDatabase();

  // Fetch all active products in a single query (explicit tenant filter + RLS)
  const productsResult = await db.queryWithTenant<{
    id: string;
    name: string;
    sku: string;
    quantity: string;
    unit: string;
  }>(
    tenantId,
    `SELECT id, name, sku, quantity, unit
     FROM products
     WHERE tenant_id = $1 AND is_active = true
     ORDER BY name`,
    [tenantId]
  );

  if (productsResult.rows.length === 0) return [];

  // Fetch all sales aggregation in a single batch query
  const salesMap = await getSalesAggregationBatch(tenantId, periodDays);

  // Build estimates
  const estimates: StockEstimate[] = productsResult.rows.map((row) => {
    const salesAgg = salesMap.get(row.id);
    return buildEstimate(
      row.id,
      row.name,
      row.sku,
      parseFloat(row.quantity),
      row.unit,
      salesAgg,
      periodDays
    );
  });

  // Sort by urgency: days_remaining ASC, nulls last
  estimates.sort((a, b) => {
    if (a.days_remaining === null && b.days_remaining === null) return 0;
    if (a.days_remaining === null) return 1;
    if (b.days_remaining === null) return -1;
    return a.days_remaining - b.days_remaining;
  });

  return estimates;
}
