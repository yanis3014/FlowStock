/**
 * Loss Service — Epic 8, Story 8.1
 * Declares a stock loss: decrements product quantity atomically and logs a 'loss' movement.
 */
import { getDatabase } from '../database/connection';
import type { LossDeclaration, LossDeclarationInput, LossReason } from '@bmad/shared';

export const VALID_LOSS_REASONS: LossReason[] = ['expired', 'broken', 'theft', 'prep_error', 'other'];

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  expired: 'Périmé',
  broken: 'Cassé',
  theft: 'Vol',
  prep_error: 'Erreur de préparation',
  other: 'Autre',
};

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  quantity: string;
  unit: string;
}

/**
 * Declare a stock loss for a product.
 * Decrements product quantity by the given amount (min 0) and logs a 'loss' movement.
 * Returns the created LossDeclaration.
 * Throws if product not found or quantity is invalid.
 */
export async function declareLoss(
  tenantId: string,
  input: LossDeclarationInput,
  userId?: string | null
): Promise<LossDeclaration> {
  const db = getDatabase();

  if (input.quantity <= 0) {
    throw new Error('La quantité de perte doit être supérieure à 0.');
  }

  const reasonLabel = LOSS_REASON_LABELS[input.reason] ?? input.reason;
  const movementReason = input.notes
    ? `Perte — ${reasonLabel} : ${input.notes}`
    : `Perte — ${reasonLabel}`;

  return db.transactionWithTenant(tenantId, async (client) => {
    const productResult = await client.query<ProductRow>(
      `SELECT id, name, sku, quantity::text, unit
       FROM products
       WHERE id = $1 AND tenant_id = $2 AND is_active = true
       FOR UPDATE`,
      [input.product_id, tenantId]
    );

    if (productResult.rows.length === 0) {
      throw new Error('Produit introuvable ou inactif.');
    }

    const product = productResult.rows[0];
    const quantityBefore = parseFloat(product.quantity);
    const quantityAfter = Math.max(0, quantityBefore - input.quantity);

    await client.query(
      `UPDATE products
       SET quantity = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [quantityAfter, input.product_id, tenantId]
    );

    const movementResult = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO stock_movements
         (tenant_id, product_id, movement_type, quantity_before, quantity_after, user_id, reason)
       VALUES ($1, $2, 'loss', $3, $4, $5, $6)
       RETURNING id, created_at`,
      [tenantId, input.product_id, quantityBefore, quantityAfter, userId ?? null, movementReason]
    );

    const row = movementResult.rows[0];

    return {
      id: row?.id ?? '',
      product_id: input.product_id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: input.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: input.reason,
      notes: input.notes ?? null,
      user_id: userId ?? null,
      created_at: row?.created_at?.toISOString() ?? new Date().toISOString(),
    };
  });
}
