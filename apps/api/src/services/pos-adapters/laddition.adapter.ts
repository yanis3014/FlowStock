/**
 * L'Addition POS Adapter (Story 2.4)
 * Transforms L'Addition webhook payloads into internal PosWebhookPayload.
 * Uses pos_product_mapping to resolve L'Addition product IDs to Flowstock product_id or sku.
 * Contract flexible (JSON/form); doc fournisseur ou Chift. Unmapped lines → sku LADD-{id}.
 */
import type { PosWebhookPayload, PosWebhookLine } from '../pos-webhook.service';
import { getMappingForPosIdentifier } from '../pos-product-mapping.service';

/** Normalized sale from L'Addition payload (flexible field names). */
export interface LadditionSale {
  saleId: string;
  lineItems: Array<{ posProductId: string; quantity: number }>;
  soldAt: string;
}

/**
 * Parse raw body from L'Addition webhook.
 * Supports: JSON body, or application/x-www-form-urlencoded with "payload" (JSON string).
 * Flexible fields: sale_id / order_id / id, line_items / lines / items, product_id / sku / item_id, quantity, created_at / sold_at.
 */
export function parseLadditionPayload(rawBody: unknown): LadditionSale | null {
  let obj: Record<string, unknown> | null = null;

  if (rawBody != null && typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    obj = rawBody as Record<string, unknown>;
  } else if (typeof rawBody === 'string') {
    try {
      obj = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (!obj) return null;

  const payloadObj = (obj.payload != null && typeof obj.payload === 'object')
    ? (obj.payload as Record<string, unknown>)
    : obj;

  const saleId =
    typeof payloadObj.sale_id === 'string' ? payloadObj.sale_id :
    typeof payloadObj.saleId === 'string' ? payloadObj.saleId :
    typeof payloadObj.order_id === 'string' ? payloadObj.order_id :
    typeof payloadObj.orderId === 'string' ? payloadObj.orderId :
    typeof payloadObj.id === 'string' ? payloadObj.id :
    null;

  if (!saleId || saleId.trim() === '') return null;

  const rawLines =
    Array.isArray(payloadObj.line_items) ? payloadObj.line_items :
    Array.isArray(payloadObj.lineItems) ? payloadObj.lineItems :
    Array.isArray(payloadObj.lines) ? payloadObj.lines :
    Array.isArray(payloadObj.items) ? payloadObj.items :
    [];

  const lineItems: Array<{ posProductId: string; quantity: number }> = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line == null || typeof line !== 'object') continue;
    const rec = line as Record<string, unknown>;
    const posId =
      typeof rec.product_id === 'string' ? rec.product_id :
      typeof rec.productId === 'string' ? rec.productId :
      typeof rec.item_id === 'string' ? rec.item_id :
      typeof rec.itemId === 'string' ? rec.itemId :
      typeof rec.sku === 'string' ? rec.sku :
      null;
    const q = typeof rec.quantity === 'number' && Number.isFinite(rec.quantity) ? rec.quantity :
      typeof rec.Quantity === 'number' && Number.isFinite(rec.Quantity) ? rec.Quantity : 0;
    if (posId && posId.trim() !== '' && q > 0) {
      lineItems.push({ posProductId: String(posId).trim(), quantity: q });
    }
  }

  if (lineItems.length === 0) return null;

  const soldAt =
    typeof payloadObj.created_at === 'string' ? payloadObj.created_at :
    typeof payloadObj.createdAt === 'string' ? payloadObj.createdAt :
    typeof payloadObj.sold_at === 'string' ? payloadObj.sold_at :
    typeof payloadObj.soldAt === 'string' ? payloadObj.soldAt :
    typeof payloadObj.date === 'string' ? payloadObj.date :
    new Date().toISOString();

  return { saleId, lineItems, soldAt };
}

/**
 * Transform a parsed L'Addition sale into internal PosWebhookPayload using tenant mapping.
 * Unmapped lines get sku "LADD-{posProductId}" for unmapped_lines.
 */
export async function transformToInternalPayload(
  tenantId: string,
  sale: LadditionSale
): Promise<PosWebhookPayload> {
  const lines: PosWebhookLine[] = [];

  for (const item of sale.lineItems) {
    const mapping = await getMappingForPosIdentifier(tenantId, 'laddition', item.posProductId);
    if (mapping && (mapping.product_id || mapping.sku)) {
      lines.push({
        product_id: mapping.product_id,
        sku: mapping.sku,
        quantity: item.quantity,
      });
    } else {
      lines.push({
        sku: `LADD-${item.posProductId}`,
        quantity: item.quantity,
      });
    }
  }

  return {
    external_id: sale.saleId,
    lines,
    sold_at: sale.soldAt,
  };
}
