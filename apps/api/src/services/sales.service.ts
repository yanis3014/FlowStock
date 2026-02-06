import { getDatabase } from '../database/connection';
import { getProductById } from './product.service';
import { getLocationById } from './location.service';
import { computeTotalAmount } from '../utils/sales.utils';
import type {
  Sale,
  SaleCreateInput,
  SaleUpdateInput,
  SaleListFilters,
  SaleSummaryFilters,
} from '@bmad/shared';

export interface SaleListResult {
  data: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SaleSummaryResult {
  groups: Array<{
    key: string;
    label?: string;
    quantity_sold: number;
    total_amount: number | null;
    count: number;
  }>;
}

export interface SaleStatsResult {
  today: { quantity_sold: number; total_amount: number | null; count: number };
  yesterday: { quantity_sold: number; total_amount: number | null; count: number };
  this_week: { quantity_sold: number; total_amount: number | null; count: number };
  this_month: { quantity_sold: number; total_amount: number | null; count: number };
}

interface SaleRow {
  id: string;
  product_id: string;
  product_name: string | null;
  sale_date: Date;
  quantity_sold: string;
  unit_price: string | null;
  total_amount: string | null;
  location_id: string | null;
  location_name: string | null;
  source: string | null;
  user_id: string | null;
  created_at: Date;
}

function rowToSale(row: SaleRow): Sale {
  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name ?? undefined,
    sale_date: row.sale_date.toISOString(),
    quantity_sold: parseFloat(row.quantity_sold),
    unit_price: row.unit_price != null ? parseFloat(row.unit_price) : null,
    total_amount: row.total_amount != null ? parseFloat(row.total_amount) : null,
    location_id: row.location_id,
    location_name: row.location_name ?? undefined,
    source: (row.source as Sale['source']) ?? 'manual',
    user_id: row.user_id,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * List sales for tenant with pagination and filters
 */
export async function listSales(
  tenantId: string,
  filters: SaleListFilters = {}
): Promise<SaleListResult> {
  const db = getDatabase();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const offset = (page - 1) * limit;
  const sortField = filters.sort ?? 'sale_date';
  const order = filters.order === 'asc' ? 'asc' : 'desc';
  const validSortFields = ['sale_date', 'created_at', 'quantity_sold', 'total_amount'];
  const orderBy = validSortFields.includes(sortField) ? sortField : 'sale_date';

  const conditions: string[] = ['s.tenant_id = $1'];
  const values: (string | number)[] = [tenantId];
  let paramIndex = 2;

  if (filters.product_id) {
    conditions.push(`s.product_id = $${paramIndex++}`);
    values.push(filters.product_id);
  }
  if (filters.date_from) {
    conditions.push(`s.sale_date >= $${paramIndex++}::timestamptz`);
    values.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`s.sale_date <= $${paramIndex++}::timestamptz`);
    values.push(filters.date_to);
  }
  if (filters.location_id) {
    conditions.push(`s.location_id = $${paramIndex++}`);
    values.push(filters.location_id);
  }

  const whereClause = conditions.join(' AND ');
  const countResult = await db.queryWithTenant<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM sales s WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const rows = await db.queryWithTenant<SaleRow>(
    tenantId,
    `SELECT s.id, s.product_id, p.name AS product_name, s.sale_date, s.quantity_sold::text,
            s.unit_price::text, s.total_amount::text, s.location_id, l.name AS location_name,
            s.source, s.user_id, s.created_at
     FROM sales s
     LEFT JOIN products p ON p.id = s.product_id AND p.tenant_id = s.tenant_id
     LEFT JOIN locations l ON l.id = s.location_id AND l.tenant_id = s.tenant_id
     WHERE ${whereClause}
     ORDER BY s.${orderBy} ${order}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows.rows.map(rowToSale),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get a single sale by id (tenant-scoped), null if not found
 */
export async function getSaleById(tenantId: string, saleId: string): Promise<Sale | null> {
  const db = getDatabase();
  const result = await db.queryWithTenant<SaleRow>(
    tenantId,
    `SELECT s.id, s.product_id, p.name AS product_name, s.sale_date, s.quantity_sold::text,
            s.unit_price::text, s.total_amount::text, s.location_id, l.name AS location_name,
            s.source, s.user_id, s.created_at
     FROM sales s
     LEFT JOIN products p ON p.id = s.product_id AND p.tenant_id = s.tenant_id
     LEFT JOIN locations l ON l.id = s.location_id AND l.tenant_id = s.tenant_id
     WHERE s.id = $1 AND s.tenant_id = $2`,
    [saleId, tenantId]
  );
  if (result.rows.length === 0) return null;
  return rowToSale(result.rows[0]);
}

export interface SaleServiceContext {
  userId?: string | null;
  source?: 'manual' | 'csv' | 'terminal';
}

/**
 * Create a sale (validates product_id exists, optional location_id; source = 'manual')
 */
export async function createSale(
  tenantId: string,
  input: SaleCreateInput,
  context?: SaleServiceContext
): Promise<Sale> {
  const db = getDatabase();
  const product = await getProductById(tenantId, input.product_id);
  if (!product) {
    const err = new Error('Product not found');
    (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  if (input.quantity_sold <= 0) {
    const err = new Error('quantity_sold must be greater than 0');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  const saleDate = input.sale_date ? new Date(input.sale_date) : new Date();
  if (isNaN(saleDate.getTime())) {
    const err = new Error('Invalid sale_date');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  if (input.unit_price != null && input.unit_price < 0) {
    const err = new Error('unit_price must be >= 0');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  if (input.location_id) {
    const loc = await getLocationById(tenantId, input.location_id);
    if (!loc) {
      const err = new Error('Location not found');
      (err as Error & { code?: string }).code = 'LOCATION_NOT_FOUND';
      throw err;
    }
  }

  const totalAmount = computeTotalAmount(input.quantity_sold, input.unit_price);

  const source = context?.source ?? 'manual';
  const result = await db.queryWithTenant<SaleRow>(
    tenantId,
    `INSERT INTO sales (tenant_id, product_id, sale_date, quantity_sold, unit_price, total_amount, location_id, source, user_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING id, product_id, sale_date, quantity_sold::text, unit_price::text, total_amount::text, location_id, source, user_id, created_at`,
    [
      tenantId,
      input.product_id,
      saleDate.toISOString(),
      input.quantity_sold,
      input.unit_price ?? null,
      totalAmount,
      input.location_id ?? null,
      source,
      context?.userId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error('Failed to create sale');
  const sale = await getSaleById(tenantId, row.id);
  if (!sale) throw new Error('Failed to load created sale');
  return sale;
}

/**
 * Update a sale (recomputes total_amount if unit_price changed)
 */
export async function updateSale(
  tenantId: string,
  saleId: string,
  input: SaleUpdateInput
): Promise<Sale | null> {
  const db = getDatabase();
  const existing = await getSaleById(tenantId, saleId);
  if (!existing) return null;

  if (input.quantity_sold != null && input.quantity_sold <= 0) {
    const err = new Error('quantity_sold must be greater than 0');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  if (input.unit_price != null && input.unit_price < 0) {
    const err = new Error('unit_price must be >= 0');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  if (input.product_id) {
    const product = await getProductById(tenantId, input.product_id);
    if (!product) {
      const err = new Error('Product not found');
      (err as Error & { code?: string }).code = 'PRODUCT_NOT_FOUND';
      throw err;
    }
  }
  if (input.location_id !== undefined && input.location_id !== null) {
    const loc = await getLocationById(tenantId, input.location_id);
    if (!loc) {
      const err = new Error('Location not found');
      (err as Error & { code?: string }).code = 'LOCATION_NOT_FOUND';
      throw err;
    }
  }

  const quantitySold = input.quantity_sold ?? existing.quantity_sold;
  const unitPrice = input.unit_price !== undefined ? input.unit_price : existing.unit_price;
  const totalAmount = computeTotalAmount(quantitySold, unitPrice);
  const productId = input.product_id ?? existing.product_id;
  const saleDate = input.sale_date ?? existing.sale_date;
  const locationId = input.location_id !== undefined ? input.location_id : existing.location_id;
  const metadata = input.metadata !== undefined ? JSON.stringify(input.metadata) : null;

  const result = await db.queryWithTenant<SaleRow>(
    tenantId,
    `UPDATE sales SET product_id = $2, sale_date = $3::timestamptz, quantity_sold = $4, unit_price = $5, total_amount = $6, location_id = $7, metadata = COALESCE($8::jsonb, metadata)
     WHERE id = $1 AND tenant_id = $9
     RETURNING id`,
    [saleId, productId, saleDate, quantitySold, unitPrice, totalAmount, locationId, metadata, tenantId]
  );
  if (result.rows.length === 0) return null;
  const withJoins = await getSaleById(tenantId, result.rows[0].id);
  return withJoins;
}

/**
 * Delete a sale (hard delete)
 */
export async function deleteSale(tenantId: string, saleId: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.queryWithTenant<{ id: string }>(
    tenantId,
    'DELETE FROM sales WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [saleId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get sales summary (aggregations by day, product, or location)
 */
export async function getSalesSummary(
  tenantId: string,
  filters: SaleSummaryFilters = {}
): Promise<SaleSummaryResult> {
  const db = getDatabase();
  const conditions: string[] = ['s.tenant_id = $1'];
  const values: (string | number)[] = [tenantId];
  let paramIndex = 2;
  if (filters.date_from) {
    conditions.push(`s.sale_date >= $${paramIndex++}::timestamptz`);
    values.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`s.sale_date <= $${paramIndex++}::timestamptz`);
    values.push(filters.date_to);
  }
  if (filters.product_id) {
    conditions.push(`s.product_id = $${paramIndex++}`);
    values.push(filters.product_id);
  }
  if (filters.location_id) {
    conditions.push(`s.location_id = $${paramIndex++}`);
    values.push(filters.location_id);
  }
  const whereClause = conditions.join(' AND ');
  const groupBy = filters.group_by ?? 'day';
  let groupExpr: string;
  let keyLabel: string;
  switch (groupBy) {
    case 'product':
      groupExpr = 's.product_id';
      keyLabel = 'product_id';
      break;
    case 'location':
      groupExpr = 's.location_id';
      keyLabel = 'location_id';
      break;
    default:
      groupExpr = "date_trunc('day', s.sale_date AT TIME ZONE 'UTC')";
      keyLabel = 'day';
  }

  const result = await db.queryWithTenant<{ key: string; quantity_sold: string; total_amount: string | null; count: string }>(
    tenantId,
    `SELECT ${groupExpr}::text AS key,
            SUM(s.quantity_sold)::text AS quantity_sold,
            SUM(s.total_amount)::text AS total_amount,
            COUNT(*)::text AS count
     FROM sales s
     WHERE ${whereClause}
     GROUP BY ${groupExpr}
     ORDER BY quantity_sold DESC`,
    values
  );

  const groups = result.rows.map((r) => ({
    key: r.key,
    quantity_sold: parseFloat(r.quantity_sold),
    total_amount: r.total_amount != null ? parseFloat(r.total_amount) : null,
    count: parseInt(r.count, 10),
  }));
  return { groups };
}

/**
 * Get quick stats (today, yesterday, this calendar week, this calendar month)
 * - today: jour courant
 * - yesterday: jour précédent
 * - this_week: semaine calendaire (lundi à aujourd'hui)
 * - this_month: mois en cours (1er du mois à aujourd'hui)
 */
export async function getSalesStats(tenantId: string): Promise<SaleStatsResult> {
  const db = getDatabase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  // Semaine calendaire : lundi = premier jour (locale FR)
  const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  // Mois en cours : 1er du mois
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const query = `SELECT
    SUM(CASE WHEN s.sale_date >= $2::timestamptz AND s.sale_date < $3::timestamptz THEN s.quantity_sold ELSE 0 END)::text AS today_qty,
    SUM(CASE WHEN s.sale_date >= $2 AND s.sale_date < $3 THEN s.total_amount ELSE 0 END)::text AS today_amt,
    COUNT(CASE WHEN s.sale_date >= $2 AND s.sale_date < $3 THEN 1 END)::text AS today_count,
    SUM(CASE WHEN s.sale_date >= $4 AND s.sale_date < $2 THEN s.quantity_sold ELSE 0 END)::text AS yesterday_qty,
    SUM(CASE WHEN s.sale_date >= $4 AND s.sale_date < $2 THEN s.total_amount ELSE 0 END)::text AS yesterday_amt,
    COUNT(CASE WHEN s.sale_date >= $4 AND s.sale_date < $2 THEN 1 END)::text AS yesterday_count,
    SUM(CASE WHEN s.sale_date >= $5 AND s.sale_date < $3 THEN s.quantity_sold ELSE 0 END)::text AS week_qty,
    SUM(CASE WHEN s.sale_date >= $5 AND s.sale_date < $3 THEN s.total_amount ELSE 0 END)::text AS week_amt,
    COUNT(CASE WHEN s.sale_date >= $5 AND s.sale_date < $3 THEN 1 END)::text AS week_count,
    SUM(CASE WHEN s.sale_date >= $6 AND s.sale_date < $3 THEN s.quantity_sold ELSE 0 END)::text AS month_qty,
    SUM(CASE WHEN s.sale_date >= $6 AND s.sale_date < $3 THEN s.total_amount ELSE 0 END)::text AS month_amt,
    COUNT(CASE WHEN s.sale_date >= $6 AND s.sale_date < $3 THEN 1 END)::text AS month_count
  FROM sales s
  WHERE s.tenant_id = $1`;
  const result = await db.queryWithTenant<{
    today_qty: string;
    today_amt: string | null;
    today_count: string;
    yesterday_qty: string;
    yesterday_amt: string | null;
    yesterday_count: string;
    week_qty: string;
    week_amt: string | null;
    week_count: string;
    month_qty: string;
    month_amt: string | null;
    month_count: string;
  }>(tenantId, query, [
    tenantId,
    todayStart.toISOString(),
    tomorrow.toISOString(),
    yesterdayStart.toISOString(),
    weekStart.toISOString(),
    monthStart.toISOString(),
  ]);
  const r = result.rows[0];
  const parse = (qty: string, amt: string | null, count: string) => ({
    quantity_sold: parseFloat(qty || '0'),
    total_amount: amt != null ? parseFloat(amt) : null,
    count: parseInt(count || '0', 10),
  });
  return {
    today: parse(r?.today_qty ?? '0', r?.today_amt ?? null, r?.today_count ?? '0'),
    yesterday: parse(r?.yesterday_qty ?? '0', r?.yesterday_amt ?? null, r?.yesterday_count ?? '0'),
    this_week: parse(r?.week_qty ?? '0', r?.week_amt ?? null, r?.week_count ?? '0'),
    this_month: parse(r?.month_qty ?? '0', r?.month_amt ?? null, r?.month_count ?? '0'),
  };
}
