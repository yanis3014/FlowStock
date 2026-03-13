/**
 * Discrepancy Service — Epic 8, Story 8.2
 *
 * Calculates stock discrepancies (écarts théorique/réel) per product over a period.
 *
 * Formula:
 *   stock_theorique = stock_reel + total_declared_losses
 *   (i.e., what you'd have if there were zero waste/losses)
 *   ecart = total_declared_losses
 *   ecart_pct = total_declared_losses / max(1, total_throughput) × 100
 *   total_throughput = total_entries + total_pos_sales + total_losses (volume traité)
 *
 * Anomaly: ecart_pct > anomaly_threshold_pct (default: 10%)
 */
import { getDatabase } from '../database/connection';
import { getOpenAIClient } from '../lib/openai';
import type { StockDiscrepancy, DiscrepancyReport } from '@bmad/shared';

const DEFAULT_PERIOD_DAYS = 30;
const DEFAULT_ANOMALY_THRESHOLD_PCT = 10;

interface ProductMovementStats {
  product_id: string;
  product_name: string;
  product_sku: string;
  unit: string;
  current_qty: string;
  total_losses: string;
  total_pos_sales: string;
  total_entries: string;
}

/**
 * Analyze anomalous products with GPT-4o and return concise actionable insights.
 */
async function analyzeAnomaliesWithAI(
  anomalies: StockDiscrepancy[]
): Promise<{ summary: string; perProduct: Record<string, string> }> {
  const openai = getOpenAIClient();
  if (!openai || anomalies.length === 0) {
    return { summary: null as unknown as string, perProduct: {} };
  }

  const dataForAI = anomalies.map((a) => ({
    produit: `${a.product_name} (${a.product_sku})`,
    stock_theorique: a.stock_theorique,
    stock_reel: a.stock_reel,
    ecart: a.ecart,
    ecart_pct: `${a.ecart_pct.toFixed(1)}%`,
    total_entries: a.total_entries,
    total_pos_sales: a.total_pos_sales,
    total_losses: a.total_losses,
    unite: a.unit,
  }));

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Tu es un expert en gestion de stocks de restaurant. Analyse les écarts de stock ' +
            'suivants et identifie les patterns anormaux (vol récurrent, produit à risque, ' +
            'erreur systématique de saisie). Sois concis et actionnable. ' +
            'Réponds en JSON avec les champs: "resume" (string, max 200 chars, synthèse globale) ' +
            'et "par_produit" (objet {sku: string analyse courte max 80 chars}).',
        },
        {
          role: 'user',
          content: JSON.stringify(dataForAI),
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { summary: null as unknown as string, perProduct: {} };

    const parsed = JSON.parse(content) as {
      resume?: string;
      par_produit?: Record<string, string>;
    };

    return {
      summary: parsed.resume ?? '',
      perProduct: parsed.par_produit ?? {},
    };
  } catch {
    return { summary: null as unknown as string, perProduct: {} };
  }
}

/**
 * Calculate stock discrepancies for all active products of a tenant.
 */
export async function getDiscrepancies(
  tenantId: string,
  options: {
    period_days?: number;
    anomaly_threshold_pct?: number;
    with_ai?: boolean;
  } = {}
): Promise<DiscrepancyReport> {
  const periodDays = options.period_days ?? DEFAULT_PERIOD_DAYS;
  const anomalyThresholdPct = options.anomaly_threshold_pct ?? DEFAULT_ANOMALY_THRESHOLD_PCT;
  const withAI = options.with_ai ?? false;
  const db = getDatabase();

  const statsResult = await db.queryWithTenant<ProductMovementStats>(
    tenantId,
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       p.sku AS product_sku,
       p.unit,
       p.quantity::text AS current_qty,
       COALESCE(SUM(
         CASE WHEN m.movement_type = 'loss'
              THEN GREATEST(0, (m.quantity_before::numeric - m.quantity_after::numeric))
         END
       ), 0)::text AS total_losses,
       COALESCE(SUM(
         CASE WHEN m.movement_type = 'pos_sale'
              THEN GREATEST(0, (m.quantity_before::numeric - m.quantity_after::numeric))
         END
       ), 0)::text AS total_pos_sales,
       COALESCE(SUM(
         CASE WHEN m.movement_type IN ('creation', 'import', 'quantity_update')
                   AND m.quantity_after::numeric > COALESCE(m.quantity_before::numeric, 0)
              THEN (m.quantity_after::numeric - COALESCE(m.quantity_before::numeric, 0))
         END
       ), 0)::text AS total_entries
     FROM products p
     LEFT JOIN stock_movements m
       ON m.product_id = p.id
       AND m.tenant_id = p.tenant_id
       AND m.created_at >= NOW() - ($2 || ' days')::interval
     WHERE p.tenant_id = $1 AND p.is_active = true
     GROUP BY p.id, p.name, p.sku, p.unit, p.quantity
     ORDER BY total_losses DESC, p.name`,
    [tenantId, periodDays]
  );

  const items: StockDiscrepancy[] = statsResult.rows.map((row) => {
    const stockReel = parseFloat(row.current_qty);
    const totalLosses = parseFloat(row.total_losses);
    const totalPosSales = parseFloat(row.total_pos_sales);
    const totalEntries = parseFloat(row.total_entries);

    const stockTheorique = stockReel + totalLosses;
    const ecart = totalLosses;
    const totalThroughput = totalEntries + totalPosSales + totalLosses;
    const ecartPct = totalThroughput > 0 ? (totalLosses / totalThroughput) * 100 : 0;
    const isAnomaly = ecartPct > anomalyThresholdPct;

    return {
      product_id: row.product_id,
      product_name: row.product_name,
      product_sku: row.product_sku,
      unit: row.unit,
      stock_theorique: Math.round(stockTheorique * 100) / 100,
      stock_reel: Math.round(stockReel * 100) / 100,
      ecart: Math.round(ecart * 100) / 100,
      ecart_pct: Math.round(ecartPct * 10) / 10,
      is_anomaly: isAnomaly,
      anomaly_threshold_pct: anomalyThresholdPct,
      total_entries: Math.round(totalEntries * 100) / 100,
      total_pos_sales: Math.round(totalPosSales * 100) / 100,
      total_losses: Math.round(totalLosses * 100) / 100,
      ai_analysis: null,
    };
  });

  const anomalyCount = items.filter((i) => i.is_anomaly).length;
  let aiSummary: string | null = null;

  if (withAI) {
    const anomalies = items.filter((i) => i.is_anomaly);
    if (anomalies.length > 0) {
      const aiResult = await analyzeAnomaliesWithAI(anomalies);
      aiSummary = aiResult.summary || null;

      items.forEach((item) => {
        if (item.is_anomaly && aiResult.perProduct[item.product_sku]) {
          item.ai_analysis = aiResult.perProduct[item.product_sku];
        }
      });
    }
  }

  return {
    generated_at: new Date().toISOString(),
    period_days: periodDays,
    anomaly_threshold_pct: anomalyThresholdPct,
    items,
    anomaly_count: anomalyCount,
    ai_summary: aiSummary,
  };
}

/**
 * Get loss anomaly alerts for dashboard integration.
 * Returns products with high loss rates (> threshold) over the last 7 days.
 */
export async function getLossAnomalyAlerts(
  tenantId: string,
  thresholdPct: number = DEFAULT_ANOMALY_THRESHOLD_PCT
): Promise<
  Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    product: { id: string; name: string };
    message: string;
    created_at: string;
  }>
> {
  const report = await getDiscrepancies(tenantId, {
    period_days: 7,
    anomaly_threshold_pct: thresholdPct,
    with_ai: false,
  });

  return report.items
    .filter((item) => item.is_anomaly)
    .slice(0, 5)
    .map((item) => ({
      id: `loss_anomaly_${item.product_id}`,
      type: 'loss_anomaly',
      severity: item.ecart_pct > thresholdPct * 2 ? ('high' as const) : ('medium' as const),
      product: { id: item.product_id, name: item.product_name },
      message: `Pertes anormales : ${item.ecart.toFixed(1)} ${item.unit} (${item.ecart_pct.toFixed(1)}% du débit)`,
      created_at: report.generated_at,
    }));
}
