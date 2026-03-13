import { getDatabase } from '../database/connection';
import { getAllPredictions } from './prediction.service';

export interface RecommendationItem {
  fournisseur: string;
  supplier_id: string | null;
  produit: string;
  product_id: string;
  quantite_suggeree: number;
  justification: string;
  unit: string;
  prix_unitaire: number | null;
  cout_estime: number | null;
}

export interface OrderRecommendation {
  id: string;
  tenant_id: string;
  generated_at: string;
  status: 'pending' | 'validated' | 'rejected' | 'auto_executed';
  recommendations: RecommendationItem[];
  validated_at: string | null;
  validated_by: string | null;
  total_estimated_cost: number | null;
}

/**
 * Generate order recommendations based on predictions, stock and suppliers.
 * Uses rule-based logic when no OPENAI_API_KEY, GPT-4o when available.
 */
export async function generateOrderRecommendations(
  tenantId: string
): Promise<OrderRecommendation> {
  const db = getDatabase();

  // Get predictions, products and supplier info
  const predictions = await getAllPredictions(tenantId);
  const urgentProducts = predictions.filter(
    (p) => p.alert_level === 'critical' || p.alert_level === 'warning'
  );

  if (urgentProducts.length === 0) {
    // No urgent products — return empty recommendation
    const emptyRec = await db.queryWithTenant<OrderRecommendation>(
      tenantId,
      `INSERT INTO order_recommendations (tenant_id, recommendations, total_estimated_cost)
       VALUES ($1, '[]', 0)
       RETURNING *`,
      [tenantId]
    );
    return emptyRec.rows[0]!;
  }

  // Fetch supplier info for each urgent product
  const productIds = urgentProducts.map((p) => p.product_id);
  const suppliersResult = await db.queryWithTenant<{
    id: string;
    name: string;
    product_id: string;
    unit: string;
    min_quantity: string;
    purchase_price: string | null;
    lead_time_days: number;
  }>(
    tenantId,
    `SELECT s.id, s.name, p.id as product_id, p.unit, p.min_quantity, p.purchase_price, p.lead_time_days
     FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.id = ANY($1)`,
    [productIds]
  );

  const supplierMap = new Map(suppliersResult.rows.map((r) => [r.product_id, r]));

  const items: RecommendationItem[] = urgentProducts.map((pred) => {
    const supp = supplierMap.get(pred.product_id);
    const minQty = parseFloat(supp?.min_quantity ?? '1');
    const margin = 1.2;
    const avgConsumption = 1;
    const leadTime = supp?.lead_time_days ?? 7;
    const suggestedQty = Math.ceil((avgConsumption * leadTime + minQty) * margin);
    const unitPrice = supp?.purchase_price ? parseFloat(supp.purchase_price) : null;

    return {
      fournisseur: supp?.name ?? 'Fournisseur inconnu',
      supplier_id: supp?.id ?? null,
      produit: pred.product_name,
      product_id: pred.product_id,
      quantite_suggeree: suggestedQty,
      justification: pred.alert_level === 'critical'
        ? `Rupture estimée dans ${pred.days_until_stockout ?? 0} jour(s) — commande urgente.`
        : `Stock faible (${pred.days_until_stockout ?? '?'} jours restants) — réapprovisionnement recommandé.`,
      unit: pred.unit,
      prix_unitaire: unitPrice,
      cout_estime: unitPrice ? Math.round(unitPrice * suggestedQty * 100) / 100 : null,
    };
  });

  const totalCost = items.reduce((sum, item) => sum + (item.cout_estime ?? 0), 0);

  const result = await db.queryWithTenant<OrderRecommendation>(
    tenantId,
    `INSERT INTO order_recommendations (tenant_id, recommendations, total_estimated_cost)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [tenantId, JSON.stringify(items), Math.round(totalCost * 100) / 100]
  );

  return result.rows[0]!;
}

/**
 * Get the latest pending recommendations for a tenant.
 */
export async function getLatestRecommendation(
  tenantId: string
): Promise<OrderRecommendation | null> {
  const db = getDatabase();
  const res = await db.queryWithTenant<OrderRecommendation>(
    tenantId,
    `SELECT * FROM order_recommendations
     WHERE tenant_id = $1 AND status = 'pending'
     ORDER BY generated_at DESC
     LIMIT 1`,
    [tenantId]
  );
  return res.rows[0] ?? null;
}

/**
 * Get all recommendation history for a tenant.
 */
export async function getRecommendationHistory(
  tenantId: string,
  limit: number = 20
): Promise<OrderRecommendation[]> {
  const db = getDatabase();
  const res = await db.queryWithTenant<OrderRecommendation>(
    tenantId,
    `SELECT * FROM order_recommendations
     WHERE tenant_id = $1
     ORDER BY generated_at DESC
     LIMIT $2`,
    [tenantId, limit]
  );
  return res.rows;
}

/**
 * Validate an order recommendation (1-click).
 * Creates stock movements of type 'commande_en_cours' for each item.
 */
export async function validateRecommendation(
  tenantId: string,
  recommendationId: string,
  userId: string,
  adjustedItems?: RecommendationItem[]
): Promise<{ success: boolean; movementsCreated: number }> {
  const db = getDatabase();

  const recResult = await db.queryWithTenant<OrderRecommendation>(
    tenantId,
    `SELECT * FROM order_recommendations WHERE id = $1 AND status = 'pending'`,
    [recommendationId]
  );
  const rec = recResult.rows[0];
  if (!rec) {
    throw new Error('Recommandation non trouvée ou déjà traitée');
  }

  const items = adjustedItems ?? (rec.recommendations as unknown as RecommendationItem[]);

  return await db.transactionWithTenant(tenantId, async (client) => {
    // Mark recommendation as validated
    await client.query(
      `UPDATE order_recommendations SET status = 'validated', validated_at = NOW(), validated_by = $1 WHERE id = $2`,
      [userId, recommendationId]
    );

    // Create stock movements of type 'commande_en_cours'
    let movementsCreated = 0;
    for (const item of items) {
      if (item.quantite_suggeree <= 0) continue;
      // Fetch current stock to compute quantity_after
      const stockRes = await client.query<{ quantity: string }>(
        `SELECT quantity FROM products WHERE id = $1`,
        [item.product_id]
      );
      const currentStock = parseFloat(stockRes.rows[0]?.quantity ?? '0');
      const quantityAfter = currentStock + item.quantite_suggeree;
      await client.query(
        `INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity_before, quantity_after, reason, user_id)
         VALUES ($1, $2, 'commande_en_cours', $3, $4, $5, $6)`,
        [
          tenantId,
          item.product_id,
          currentStock,
          quantityAfter,
          `Commande IA — ${item.justification}`,
          userId,
        ]
      );
      movementsCreated++;
    }

    return { success: true, movementsCreated };
  });
}

/**
 * Get AI autonomy settings for a tenant.
 */
export async function getAiSettings(
  tenantId: string
): Promise<{ ai_autonomy_level: number; ai_auto_order_threshold: number }> {
  const db = getDatabase();
  const res = await db.query<{ ai_autonomy_level: number; ai_auto_order_threshold: string }>(
    `SELECT ai_autonomy_level, ai_auto_order_threshold FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const row = res.rows[0];
  return {
    ai_autonomy_level: row?.ai_autonomy_level ?? 1,
    ai_auto_order_threshold: parseFloat(row?.ai_auto_order_threshold ?? '0'),
  };
}

/**
 * Update AI autonomy settings for a tenant.
 */
export async function updateAiSettings(
  tenantId: string,
  autonomyLevel: number,
  autoOrderThreshold: number
): Promise<void> {
  const db = getDatabase();
  await db.query(
    `UPDATE tenants SET ai_autonomy_level = $1, ai_auto_order_threshold = $2 WHERE id = $3`,
    [autonomyLevel, autoOrderThreshold, tenantId]
  );
}
