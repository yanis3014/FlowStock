/**
 * POS Sale Decrement Service (Story 2.2)
 * Resolves POS line items to Flowstock products, decrements stock, and logs pos_sale movements.
 * All mutations run inside a single transaction for consistency.
 */
import { PoolClient } from 'pg';
import { getDatabase } from '../database/connection';
import { logger } from '../utils/logger';
import { isValidUuid } from '../utils/validation';
import type { PosWebhookPayload, PosWebhookLine } from './pos-webhook.service';

export interface ProcessedLine {
  product_id: string;
  sku: string;
  quantity_sold: number;
}

export interface UnmappedLine {
  line_index: number;
  product_id?: string;
  sku?: string;
  quantity: number;
  reason: 'product_not_found';
}

export interface InsufficientStockError {
  line_index: number;
  product_id: string;
  sku: string;
  quantity_sold: number;
  reason: 'insufficient_stock';
}

export interface ProcessPosSaleResult {
  processed_lines: ProcessedLine[];
  unmapped_lines: UnmappedLine[];
  errors: InsufficientStockError[];
}

interface ProductRow {
  id: string;
  sku: string;
  quantity: string;
}

/**
 * Resolve a webhook line to a Flowstock product using the transaction client.
 * By product_id (UUID) or by sku (tenant-scoped). Caller must have set tenant context on client.
 */
async function resolveProductWithClient(
  client: PoolClient,
  tenantId: string,
  line: PosWebhookLine
): Promise<{ id: string; sku: string; quantity: number } | null> {
  if (line.product_id?.trim()) {
    const id = line.product_id.trim();
    if (!isValidUuid(id)) return null;
    const r = await client.query<ProductRow>(
      `SELECT id, sku, quantity::text AS quantity FROM products
       WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
      [id, tenantId]
    );
    if (r.rows.length > 0) {
      const row = r.rows[0];
      return { id: row.id, sku: row.sku, quantity: parseFloat(row.quantity) };
    }
  }
  if (line.sku?.trim()) {
    const sku = line.sku.trim();
    const r = await client.query<ProductRow>(
      `SELECT id, sku, quantity::text AS quantity FROM products
       WHERE tenant_id = $1 AND sku = $2 AND is_active = true`,
      [tenantId, sku]
    );
    if (r.rows.length > 0) {
      const row = r.rows[0];
      return { id: row.id, sku: row.sku, quantity: parseFloat(row.quantity) };
    }
  }
  return null;
}

/**
 * Process a validated POS sale event inside a single transaction: resolve products,
 * decrement stock, log pos_sale movements. Products not found → unmapped_lines;
 * insufficient stock → errors (no decrement).
 */
export async function processPosSaleEvent(
  tenantId: string,
  payload: PosWebhookPayload
): Promise<ProcessPosSaleResult> {
  const processed_lines: ProcessedLine[] = [];
  const unmapped_lines: UnmappedLine[] = [];
  const errors: InsufficientStockError[] = [];
  const db = getDatabase();

  await db.transactionWithTenant(tenantId, async (client) => {
    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];
      const product = await resolveProductWithClient(client, tenantId, line);

      if (!product) {
        unmapped_lines.push({
          line_index: i,
          product_id: line.product_id,
          sku: line.sku,
          quantity: line.quantity,
          reason: 'product_not_found',
        });
        continue;
      }

      if (product.quantity < line.quantity) {
        errors.push({
          line_index: i,
          product_id: product.id,
          sku: product.sku,
          quantity_sold: line.quantity,
          reason: 'insufficient_stock',
        });
        logger.warn('POS sale insufficient stock', {
          tenant_id: tenantId,
          external_id: payload.external_id,
          product_id: product.id,
          sku: product.sku,
          current_quantity: product.quantity,
          requested: line.quantity,
        });
        continue;
      }

      const quantitySold = line.quantity;
      const updateResult = await client.query<{ id: string; quantity: string }>(
        `UPDATE products SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3 AND quantity >= $1
         RETURNING id, quantity::text AS quantity`,
        [quantitySold, product.id, tenantId]
      );

      if (updateResult.rows.length === 0) {
        errors.push({
          line_index: i,
          product_id: product.id,
          sku: product.sku,
          quantity_sold: quantitySold,
          reason: 'insufficient_stock',
        });
        continue;
      }

      const quantityAfter = parseFloat(updateResult.rows[0].quantity);
      const quantityBefore = quantityAfter + quantitySold;
      const reason = `POS sale (external_id: ${payload.external_id})`;
      await client.query(
        `INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity_before, quantity_after, user_id, reason)
         VALUES ($1, $2, 'pos_sale', $3, $4, NULL, $5)`,
        [tenantId, product.id, quantityBefore, quantityAfter, reason]
      );

      processed_lines.push({
        product_id: product.id,
        sku: product.sku,
        quantity_sold: quantitySold,
      });
    }
  });

  return { processed_lines, unmapped_lines, errors };
}
