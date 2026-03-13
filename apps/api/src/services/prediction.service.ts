import { getDatabase } from '../database/connection';
import { getProductSnapshots } from './daily-snapshot.service';

export interface ProductAnalytics {
  id: string;
  tenant_id: string;
  product_id: string;
  computed_at: string;
  avg_7d: number | null;
  avg_30d: number | null;
  coeff_variation: number | null;
  weekday_seasonality: Record<string, number>;
  trend_direction: 'up' | 'down' | 'stable';
  anomaly_count: number;
  gpt_analysis: Record<string, unknown> | null;
}

export interface StockPrediction {
  id: string;
  tenant_id: string;
  product_id: string;
  predicted_at: string;
  days_until_stockout: number | null;
  confidence_score: number | null;
  predicted_stockout_date: string | null;
  alert_level: 'ok' | 'warning' | 'critical';
  prediction_method: 'gpt4o' | 'fallback';
  gpt_reasoning: string | null;
}

export interface PredictionAccuracy {
  id: string;
  tenant_id: string;
  product_id: string;
  evaluation_date: string;
  predicted_consumption: number | null;
  actual_consumption: number | null;
  accuracy_score: number | null;
}

// ============================================================================
// Product Analytics (Story 6-2)
// ============================================================================

/**
 * Compute and store product analytics: rolling averages, variation coefficient,
 * weekday seasonality, trend direction. Uses daily_snapshots data.
 */
export async function computeProductAnalytics(
  tenantId: string,
  productId: string
): Promise<ProductAnalytics | null> {
  const db = getDatabase();
  const snapshots = await getProductSnapshots(tenantId, productId, 30);
  if (snapshots.length === 0) return null;

  const salesValues = snapshots.map((s) => s.sales_qty);
  const avg30d = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;

  const recent7 = salesValues.slice(0, 7);
  const avg7d = recent7.length > 0
    ? recent7.reduce((a, b) => a + b, 0) / recent7.length
    : avg30d;

  const mean = avg30d;
  const variance = salesValues.length > 1
    ? salesValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (salesValues.length - 1)
    : 0;
  const stddev = Math.sqrt(variance);
  const coeffVariation = mean > 0 ? stddev / mean : 0;

  // Weekday seasonality: average sales per day of week
  const weekdaySums: Record<number, number[]> = {};
  for (const snap of snapshots) {
    const day = new Date(snap.date).getDay();
    if (!weekdaySums[day]) weekdaySums[day] = [];
    weekdaySums[day].push(snap.sales_qty);
  }
  const weekdaySeasonality: Record<string, number> = {};
  for (const [day, vals] of Object.entries(weekdaySums)) {
    weekdaySeasonality[day] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // Trend: compare avg of last 7 days vs avg of previous 7 days
  const prev7 = salesValues.slice(7, 14);
  const prevAvg = prev7.length > 0
    ? prev7.reduce((a, b) => a + b, 0) / prev7.length
    : avg7d;
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (avg7d > prevAvg * 1.1) trendDirection = 'up';
  else if (avg7d < prevAvg * 0.9) trendDirection = 'down';

  // Anomaly: values > 2 std deviations from mean
  const anomalyCount = salesValues.filter((v) => Math.abs(v - mean) > 2 * stddev).length;

  await db.queryWithTenant(
    tenantId,
    `INSERT INTO product_analytics (tenant_id, product_id, computed_at, avg_7d, avg_30d,
      coeff_variation, weekday_seasonality, trend_direction, anomaly_count)
     VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tenant_id, product_id)
     DO UPDATE SET
       computed_at = NOW(),
       avg_7d = EXCLUDED.avg_7d,
       avg_30d = EXCLUDED.avg_30d,
       coeff_variation = EXCLUDED.coeff_variation,
       weekday_seasonality = EXCLUDED.weekday_seasonality,
       trend_direction = EXCLUDED.trend_direction,
       anomaly_count = EXCLUDED.anomaly_count`,
    [
      tenantId, productId,
      Math.round(avg7d * 10000) / 10000,
      Math.round(avg30d * 10000) / 10000,
      Math.round(coeffVariation * 10000) / 10000,
      JSON.stringify(weekdaySeasonality),
      trendDirection,
      anomalyCount,
    ]
  );

  const res = await db.queryWithTenant<ProductAnalytics>(
    tenantId,
    `SELECT * FROM product_analytics WHERE product_id = $1`,
    [productId]
  );
  return res.rows[0] ?? null;
}

/**
 * Get analytics for all products of a tenant.
 */
export async function getAllProductAnalytics(tenantId: string): Promise<ProductAnalytics[]> {
  const db = getDatabase();
  const res = await db.queryWithTenant<ProductAnalytics>(
    tenantId,
    `SELECT pa.*, p.name as product_name
     FROM product_analytics pa
     JOIN products p ON p.id = pa.product_id
     WHERE pa.tenant_id = $1
     ORDER BY p.name`,
    [tenantId]
  );
  return res.rows;
}

// ============================================================================
// Stock Predictions (Story 6-3)
// ============================================================================

/**
 * Compute stock prediction for a product using fallback method:
 * jours_restants = stock_actuel / (avg_consumption_7j + 1)
 */
export async function computeStockPredictionFallback(
  tenantId: string,
  productId: string,
  currentStock: number,
  avg7d: number | null
): Promise<StockPrediction> {
  const db = getDatabase();
  const consumption = (avg7d ?? 0) + 1;
  const daysUntilStockout = Math.max(0, Math.floor(currentStock / consumption));
  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + daysUntilStockout);

  let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
  if (daysUntilStockout <= 3) alertLevel = 'critical';
  else if (daysUntilStockout <= 7) alertLevel = 'warning';

  await db.queryWithTenant(
    tenantId,
    `INSERT INTO stock_predictions (tenant_id, product_id, predicted_at, days_until_stockout,
       confidence_score, predicted_stockout_date, alert_level, prediction_method)
     VALUES ($1, $2, NOW(), $3, $4, $5, $6, 'fallback')
     ON CONFLICT (tenant_id, product_id)
     DO UPDATE SET
       predicted_at = NOW(),
       days_until_stockout = EXCLUDED.days_until_stockout,
       confidence_score = EXCLUDED.confidence_score,
       predicted_stockout_date = EXCLUDED.predicted_stockout_date,
       alert_level = EXCLUDED.alert_level,
       prediction_method = 'fallback',
       gpt_reasoning = NULL`,
    [
      tenantId, productId,
      daysUntilStockout,
      0.6,
      predictedDate.toISOString().split('T')[0],
      alertLevel,
    ]
  );

  const res = await db.queryWithTenant<StockPrediction>(
    tenantId,
    `SELECT * FROM stock_predictions WHERE product_id = $1`,
    [productId]
  );
  return res.rows[0]!;
}

/**
 * Get all predictions for a tenant (sorted by urgency).
 */
export async function getAllPredictions(tenantId: string): Promise<
  (StockPrediction & { product_name: string; sku: string; unit: string; current_stock: number })[]
> {
  const db = getDatabase();
  const res = await db.queryWithTenant<
    StockPrediction & { product_name: string; sku: string; unit: string; current_stock: number }
  >(
    tenantId,
    `SELECT sp.*, p.name as product_name, p.sku, p.unit, p.quantity as current_stock
     FROM stock_predictions sp
     JOIN products p ON p.id = sp.product_id
     WHERE sp.tenant_id = $1
     ORDER BY
       CASE alert_level WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
       sp.days_until_stockout ASC NULLS LAST`,
    [tenantId]
  );
  return res.rows;
}

// ============================================================================
// Prediction Accuracy (Story 6-4)
// ============================================================================

/**
 * Evaluate yesterday's predictions against actual consumption.
 * Stores accuracy score in prediction_accuracy table.
 */
export async function evaluatePredictionAccuracy(
  tenantId: string,
  evaluationDate: string = new Date(Date.now() - 86400000).toISOString().split('T')[0]
): Promise<number> {
  const db = getDatabase();

  const result = await db.queryWithTenant(
    tenantId,
    `INSERT INTO prediction_accuracy
       (tenant_id, product_id, evaluation_date, predicted_consumption, actual_consumption, accuracy_score)
     SELECT
       sp.tenant_id,
       sp.product_id,
       $2::date,
       pa.avg_7d AS predicted_consumption,
       ds.sales_qty AS actual_consumption,
       CASE
         WHEN pa.avg_7d > 0 AND ds.sales_qty >= 0 THEN
           GREATEST(0, 1.0 - ABS(pa.avg_7d - ds.sales_qty) / GREATEST(pa.avg_7d, 0.001))
         ELSE NULL
       END AS accuracy_score
     FROM stock_predictions sp
     JOIN daily_snapshots ds ON ds.product_id = sp.product_id AND ds.date = $2::date AND ds.tenant_id = $1
     LEFT JOIN product_analytics pa ON pa.product_id = sp.product_id AND pa.tenant_id = $1
     WHERE sp.tenant_id = $1
     ON CONFLICT (tenant_id, product_id, evaluation_date)
     DO UPDATE SET
       predicted_consumption = EXCLUDED.predicted_consumption,
       actual_consumption = EXCLUDED.actual_consumption,
       accuracy_score = EXCLUDED.accuracy_score
     RETURNING product_id`,
    [tenantId, evaluationDate]
  );

  return result.rows.length;
}

/**
 * Get average accuracy per product for a tenant (last N days).
 */
export async function getAccuracyReport(
  tenantId: string,
  days: number = 30
): Promise<{
  product_id: string;
  product_name: string;
  avg_accuracy: number;
  low_accuracy_alert: boolean;
  samples: number;
}[]> {
  const db = getDatabase();
  const res = await db.queryWithTenant<{
    product_id: string;
    product_name: string;
    avg_accuracy: string;
    samples: string;
  }>(
    tenantId,
    `SELECT
       pa.product_id,
       p.name as product_name,
       AVG(pa.accuracy_score) as avg_accuracy,
       COUNT(*) as samples
     FROM prediction_accuracy pa
     JOIN products p ON p.id = pa.product_id
     WHERE pa.tenant_id = $1
       AND pa.evaluation_date >= CURRENT_DATE - $2::int
       AND pa.accuracy_score IS NOT NULL
     GROUP BY pa.product_id, p.name
     ORDER BY AVG(pa.accuracy_score) ASC`,
    [tenantId, days]
  );

  return res.rows.map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name,
    avg_accuracy: Math.round(parseFloat(r.avg_accuracy) * 10000) / 10000,
    low_accuracy_alert: parseFloat(r.avg_accuracy) < 0.7,
    samples: parseInt(r.samples, 10),
  }));
}
