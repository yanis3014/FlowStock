/**
 * Square POS Adapter (Story 2.4)
 * Transforms Square Orders API webhook payloads (order.created / order.updated) into internal PosWebhookPayload.
 * Uses pos_product_mapping pos_type=square. Unmapped lines → sku SQ-{id}.
 * Ref: https://developer.squareup.com/reference/square/orders-api/webhooks
 */
import type { PosWebhookPayload, PosWebhookLine } from '../pos-webhook.service';
import { getMappingForPosIdentifier } from '../pos-product-mapping.service';

/** Normalized order from Square payload. */
export interface SquareOrder {
  orderId: string;
  lineItems: Array<{ posProductId: string; quantity: number }>;
  soldAt: string;
}

/**
 * Parse raw body from Square webhook.
 * Supports: type, event_id, created_at, data.object (order_updated or order with line_items).
 * event_id used for idempotence (external_id). Line items from data.object.order_updated or data.order.line_items.
 */
export function parseSquarePayload(rawBody: unknown): SquareOrder | null {
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

  const data = (obj.data != null && typeof obj.data === 'object') ? obj.data as Record<string, unknown> : obj;
  const eventId = typeof obj.event_id === 'string' ? obj.event_id : null;
  const createdAt = typeof obj.created_at === 'string' ? obj.created_at : new Date().toISOString();

  let orderId: string | null = eventId;
  let rawLines: unknown[] = [];
  let orderCreatedAt = createdAt;

  const orderUpdated = data?.object != null && typeof data.object === 'object'
    ? (data.object as Record<string, unknown>).order_updated
    : undefined;
  if (orderUpdated != null && typeof orderUpdated === 'object') {
    const ou = orderUpdated as Record<string, unknown>;
    if (typeof ou.order_id === 'string') orderId = ou.order_id;
    if (typeof ou.created_at === 'string') orderCreatedAt = ou.created_at;
  }

  const order = (data?.object != null && typeof data.object === 'object')
    ? (data.object as Record<string, unknown>).order
    : data?.order;
  if (order != null && typeof order === 'object') {
    const o = order as Record<string, unknown>;
    if (typeof o.id === 'string') orderId = o.id;
    if (typeof o.created_at === 'string') orderCreatedAt = o.created_at;
    const items = o.line_items ?? o.lineItems;
    if (Array.isArray(items)) rawLines = items;
  }

  if (!orderId || orderId.trim() === '') return null;

  const lineItems: Array<{ posProductId: string; quantity: number }> = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line == null || typeof line !== 'object') continue;
    const rec = line as Record<string, unknown>;
    const posId =
      typeof rec.catalog_object_id === 'string' ? rec.catalog_object_id :
      typeof rec.catalogObjectId === 'string' ? rec.catalogObjectId :
      typeof rec.product_id === 'string' ? rec.product_id :
      typeof rec.sku === 'string' ? rec.sku :
      null;
    const q = typeof rec.quantity === 'string' ? parseInt(rec.quantity, 10) : typeof rec.quantity === 'number' ? rec.quantity : 0;
    if (posId && posId.trim() !== '' && Number.isFinite(q) && q > 0) {
      lineItems.push({ posProductId: String(posId).trim(), quantity: q });
    }
  }

  if (lineItems.length === 0) return null;

  return {
    orderId,
    lineItems,
    soldAt: orderCreatedAt,
  };
}

/**
 * Transform a parsed Square order into internal PosWebhookPayload using tenant mapping.
 * Unmapped lines get sku "SQ-{posProductId}" for unmapped_lines.
 */
export async function transformToInternalPayload(
  tenantId: string,
  order: SquareOrder
): Promise<PosWebhookPayload> {
  const lines: PosWebhookLine[] = [];

  for (const item of order.lineItems) {
    const mapping = await getMappingForPosIdentifier(tenantId, 'square', item.posProductId);
    if (mapping && (mapping.product_id || mapping.sku)) {
      lines.push({
        product_id: mapping.product_id,
        sku: mapping.sku,
        quantity: item.quantity,
      });
    } else {
      lines.push({
        sku: `SQ-${item.posProductId}`,
        quantity: item.quantity,
      });
    }
  }

  return {
    external_id: order.orderId,
    lines,
    sold_at: order.soldAt,
  };
}
