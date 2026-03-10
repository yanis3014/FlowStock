/**
 * Lightspeed POS Adapter (Story 2.3)
 * Transforms Lightspeed webhook payloads into internal PosWebhookPayload.
 * Uses pos_product_mapping to resolve Lightspeed product IDs to Flowstock product_id or sku.
 */
import type { PosWebhookPayload, PosWebhookLine } from '../pos-webhook.service';
import { getMappingForPosIdentifier } from '../pos-product-mapping.service';

/** Normalized sale from Lightspeed payload (flexible field names). */
export interface LightspeedSale {
  saleId: string;
  lineItems: Array<{ posProductId: string; quantity: number }>;
  soldAt: string;
}

/**
 * Parse raw body from Lightspeed webhook.
 * Supports: JSON body, or application/x-www-form-urlencoded with a "payload" field (JSON string).
 */
export function parseLightspeedPayload(rawBody: unknown): LightspeedSale | null {
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

  // Lightspeed sometimes sends payload in a "payload" field (e.g. form-urlencoded)
  const payloadObj = (obj.payload != null && typeof obj.payload === 'object')
    ? (obj.payload as Record<string, unknown>)
    : obj;

  const saleId =
    typeof payloadObj.saleID === 'string' ? payloadObj.saleID :
    typeof payloadObj.saleId === 'string' ? payloadObj.saleId :
    typeof payloadObj.sale_id === 'string' ? payloadObj.sale_id :
    typeof payloadObj.id === 'string' ? payloadObj.id :
    null;

  if (!saleId || saleId.trim() === '') return null;

  const rawLines =
    Array.isArray(payloadObj.lineItems) ? payloadObj.lineItems :
    Array.isArray(payloadObj.line_items) ? payloadObj.line_items :
    Array.isArray(payloadObj.SaleLines) ? payloadObj.SaleLines :
    Array.isArray(payloadObj.lines) ? payloadObj.lines :
    [];

  const lineItems: Array<{ posProductId: string; quantity: number }> = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line == null || typeof line !== 'object') continue;
    const rec = line as Record<string, unknown>;
    const posId =
      typeof rec.itemID === 'string' ? rec.itemID :
      typeof rec.itemId === 'string' ? rec.itemId :
      typeof rec.productID === 'string' ? rec.productID :
      typeof rec.product_id === 'string' ? rec.product_id :
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
    typeof payloadObj.createTime === 'string' ? payloadObj.createTime :
    typeof payloadObj.completedAt === 'string' ? payloadObj.completedAt :
    typeof payloadObj.sold_at === 'string' ? payloadObj.sold_at :
    new Date().toISOString();

  return { saleId, lineItems, soldAt };
}

/**
 * Transform a parsed Lightspeed sale into internal PosWebhookPayload using tenant mapping.
 * Unmapped lines get sku "LSP-{posProductId}" so they appear in unmapped_lines from processPosSaleEvent.
 */
export async function transformToInternalPayload(
  tenantId: string,
  sale: LightspeedSale
): Promise<PosWebhookPayload> {
  const lines: PosWebhookLine[] = [];

  for (const item of sale.lineItems) {
    const mapping = await getMappingForPosIdentifier(tenantId, 'lightspeed', item.posProductId);
    if (mapping && (mapping.product_id || mapping.sku)) {
      lines.push({
        product_id: mapping.product_id,
        sku: mapping.sku,
        quantity: item.quantity,
      });
    } else {
      lines.push({
        sku: `LSP-${item.posProductId}`,
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
