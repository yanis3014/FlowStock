/**
 * Stock Movement Service - Story 2.4
 * Log and list product quantity movements with subscription-based retention.
 */
import { getDatabase } from '../database/connection';
import { getCurrentSubscription } from './subscription.service';
import type {
  StockMovement,
  StockMovementListFilters,
  StockMovementListResult,
  MovementType,
} from '@bmad/shared';

const MAX_EXPORT_ROWS = 10_000;

interface MovementRow {
  id: string;
  product_id: string;
  movement_type: string;
  quantity_before: string | null;
  quantity_after: string | null;
  user_id: string | null;
  user_email: string | null;
  reason: string | null;
  created_at: Date;
}

function rowToMovement(row: MovementRow): StockMovement {
  return {
    id: row.id,
    product_id: row.product_id,
    movement_type: row.movement_type as MovementType,
    quantity_before: row.quantity_before != null ? parseFloat(row.quantity_before) : null,
    quantity_after: row.quantity_after != null ? parseFloat(row.quantity_after) : null,
    user_id: row.user_id,
    user_email: row.user_email ?? null,
    reason: row.reason,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * Get retention days for tenant from subscription tier (Normal 30, Premium 90, Premium Plus 365).
 */
export async function getRetentionDays(tenantId: string): Promise<number> {
  const sub = await getCurrentSubscription(tenantId);
  return sub?.features?.history_days ?? 30;
}

/**
 * Build WHERE conditions and values for movement queries (retention + optional filters).
 * Used by listMovements and getMovementsForExport to avoid duplication.
 */
function buildMovementWhere(
  tenantId: string,
  productId: string,
  since: Date,
  filters: StockMovementListFilters
): { whereClause: string; values: (string | number | Date)[] } {
  const conditions: string[] = ['m.tenant_id = $1', 'm.product_id = $2', 'm.created_at >= $3'];
  const values: (string | number | Date)[] = [tenantId, productId, since];
  let paramIndex = 4;

  if (filters.movement_type) {
    conditions.push(`m.movement_type = $${paramIndex}`);
    values.push(filters.movement_type);
    paramIndex++;
  }
  if (filters.user_id) {
    conditions.push(`m.user_id = $${paramIndex}`);
    values.push(filters.user_id);
    paramIndex++;
  }
  if (filters.date_from) {
    conditions.push(`m.created_at >= $${paramIndex}`);
    values.push(filters.date_from);
    paramIndex++;
  }
  if (filters.date_to) {
    conditions.push(`m.created_at <= $${paramIndex}`);
    values.push(filters.date_to);
    paramIndex++;
  }

  return {
    whereClause: conditions.join(' AND '),
    values,
  };
}

/**
 * Log a stock movement (creation, quantity update, deletion, import).
 */
export async function logMovement(
  tenantId: string,
  productId: string,
  movementType: MovementType,
  quantityBefore: number | null,
  quantityAfter: number | null,
  userId?: string | null,
  reason?: string | null
): Promise<void> {
  const db = getDatabase();
  await db.queryWithTenant(
    tenantId,
    `INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity_before, quantity_after, user_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      tenantId,
      productId,
      movementType,
      quantityBefore,
      quantityAfter,
      userId ?? null,
      reason?.trim() || null,
    ]
  );
}

/**
 * List movements for a product with pagination and filters, respecting retention.
 */
export async function listMovements(
  tenantId: string,
  productId: string,
  filters: StockMovementListFilters = {}
): Promise<StockMovementListResult> {
  const db = getDatabase();
  const retentionDays = await getRetentionDays(tenantId);
  const since = new Date();
  since.setDate(since.getDate() - retentionDays);

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const { whereClause, values } = buildMovementWhere(tenantId, productId, since, filters);

  const countResult = await db.queryWithTenant<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM stock_movements m WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const listQuery = `
    SELECT m.id, m.product_id, m.movement_type, m.quantity_before::text, m.quantity_after::text,
           m.user_id, u.email AS user_email, m.reason, m.created_at
    FROM stock_movements m
    LEFT JOIN users u ON m.user_id = u.id AND u.tenant_id = m.tenant_id
    WHERE ${whereClause}
    ORDER BY m.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  const listValues = [...values, limit, offset];
  const result = await db.queryWithTenant<MovementRow>(tenantId, listQuery, listValues);

  return {
    data: result.rows.map(rowToMovement),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
    retention_days: retentionDays,
  };
}

/**
 * Get movements for CSV export (same filters + retention, capped at MAX_EXPORT_ROWS).
 */
export async function getMovementsForExport(
  tenantId: string,
  productId: string,
  filters: StockMovementListFilters = {}
): Promise<{ movements: StockMovement[]; retention_days: number; truncated: boolean }> {
  const retentionDays = await getRetentionDays(tenantId);
  const since = new Date();
  since.setDate(since.getDate() - retentionDays);

  const { whereClause, values } = buildMovementWhere(tenantId, productId, since, filters);
  const db = getDatabase();
  const query = `
    SELECT m.id, m.product_id, m.movement_type, m.quantity_before::text, m.quantity_after::text,
           m.user_id, u.email AS user_email, m.reason, m.created_at
    FROM stock_movements m
    LEFT JOIN users u ON m.user_id = u.id AND u.tenant_id = m.tenant_id
    WHERE ${whereClause}
    ORDER BY m.created_at DESC
    LIMIT ${MAX_EXPORT_ROWS + 1}
  `;
  const result = await db.queryWithTenant<MovementRow>(tenantId, query, values);
  const truncated = result.rows.length > MAX_EXPORT_ROWS;
  const rows = truncated ? result.rows.slice(0, MAX_EXPORT_ROWS) : result.rows;

  return {
    movements: rows.map(rowToMovement),
    retention_days: retentionDays,
    truncated,
  };
}

/**
 * Generate CSV string for movements (date, type, user, old value, new value, reason).
 */
export function movementsToCsv(movements: StockMovement[]): string {
  const header = 'date;type;utilisateur;ancienne_valeur;nouvelle_valeur;raison';
  const rows = movements.map((m) => {
    const date = m.created_at.replace('T', ' ').slice(0, 19);
    const user = (m.user_email ?? m.user_id ?? '').replace(/;/g, ',');
    const reason = (m.reason ?? '').replace(/;/g, ',').replace(/\n/g, ' ');
    return `${date};${m.movement_type};${user};${m.quantity_before ?? ''};${m.quantity_after ?? ''};${reason}`;
  });
  return '\uFEFF' + header + '\n' + rows.join('\n');
}
