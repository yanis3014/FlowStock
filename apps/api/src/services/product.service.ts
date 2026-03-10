import { getDatabase } from '../database/connection';
import { logMovement } from './stockMovement.service';
import type {
  ProductUnit,
  StockStatus,
  Product,
  ProductCreateInput,
  ProductUpdateInput,
} from '@bmad/shared';
import type { MovementType } from '@bmad/shared';

export interface ProductServiceContext {
  userId?: string | null;
  reason?: string | null;
}

export const VALID_UNITS: ProductUnit[] = ['piece', 'kg', 'liter', 'box', 'pack'];

export interface ProductListFilters {
  page?: number;
  limit?: number;
  search?: string;
  location_id?: string;
  supplier_id?: string;
  low_stock?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProductListResult {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ProductRow {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: ProductUnit;
  quantity: string;
  min_quantity: string | null;
  location_id: string | null;
  supplier_id: string | null;
  location_name: string | null;
  supplier_name: string | null;
  purchase_price: string | null;
  selling_price: string | null;
  lead_time_days: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function computeStockStatus(quantity: number, minQuantity: number | null): StockStatus {
  if (quantity <= 0) return 'critical';
  if (minQuantity != null && quantity <= minQuantity) return 'low';
  return 'ok';
}

function rowToProduct(row: ProductRow): Product {
  const quantity = parseFloat(row.quantity);
  const minQuantity = row.min_quantity != null ? parseFloat(row.min_quantity) : null;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    unit: row.unit,
    quantity,
    min_quantity: minQuantity,
    location: row.location_id && row.location_name
      ? { id: row.location_id, name: row.location_name }
      : null,
    supplier: row.supplier_id && row.supplier_name
      ? { id: row.supplier_id, name: row.supplier_name }
      : null,
    purchase_price: row.purchase_price != null ? parseFloat(row.purchase_price) : null,
    selling_price: row.selling_price != null ? parseFloat(row.selling_price) : null,
    lead_time_days: row.lead_time_days,
    is_active: row.is_active,
    stock_status: computeStockStatus(quantity, minQuantity),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function validateUnit(unit: string): unit is ProductUnit {
  return VALID_UNITS.includes(unit as ProductUnit);
}

/**
 * List products with pagination and filters (tenant-scoped via RLS)
 */
export async function listProducts(
  tenantId: string,
  filters: ProductListFilters = {}
): Promise<ProductListResult> {
  const db = getDatabase();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;
  const sortField = filters.sort ?? 'created_at';
  const order = filters.order === 'asc' ? 'asc' : 'desc';
  const validSortFields = ['created_at', 'updated_at', 'name', 'sku', 'quantity'];
  const orderBy = validSortFields.includes(sortField) ? sortField : 'created_at';

  const conditions: string[] = ['p.is_active = true', 'p.tenant_id = $1'];
  const values: (string | number | boolean)[] = [tenantId];
  let paramIndex = 2;

  if (filters.search?.trim()) {
    conditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`);
    values.push(`%${filters.search.trim()}%`);
    paramIndex++;
  }
  if (filters.location_id) {
    conditions.push(`p.location_id = $${paramIndex}`);
    values.push(filters.location_id);
    paramIndex++;
  }
  if (filters.supplier_id) {
    conditions.push(`p.supplier_id = $${paramIndex}`);
    values.push(filters.supplier_id);
    paramIndex++;
  }
  if (filters.low_stock === true) {
    conditions.push('p.min_quantity IS NOT NULL AND p.quantity <= p.min_quantity');
  }

  const whereClause = conditions.join(' AND ');
  const countResult = await db.queryWithTenant<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text as count FROM products p WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const listQuery = `
    SELECT p.id, p.tenant_id, p.sku, p.name, p.description, p.unit, p.quantity::text, p.min_quantity::text,
           p.location_id, p.supplier_id, l.name as location_name, s.name as supplier_name,
           p.purchase_price::text, p.selling_price::text, p.lead_time_days, p.is_active,
           p.created_at, p.updated_at
    FROM products p
    LEFT JOIN locations l ON p.location_id = l.id AND l.tenant_id = p.tenant_id
    LEFT JOIN suppliers s ON p.supplier_id = s.id AND s.tenant_id = p.tenant_id
    WHERE ${whereClause}
    ORDER BY p.${orderBy} ${order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  const listValues = [...values, limit, offset];
  const result = await db.queryWithTenant<ProductRow>(tenantId, listQuery, listValues);

  const data = result.rows.map(rowToProduct);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get a single product by SKU (tenant-scoped). SKU is unique per tenant.
 */
export async function getProductBySku(tenantId: string, sku: string): Promise<Product | null> {
  if (!sku?.trim()) return null;
  const db = getDatabase();
  const query = `
    SELECT p.id, p.tenant_id, p.sku, p.name, p.description, p.unit, p.quantity::text, p.min_quantity::text,
           p.location_id, p.supplier_id, l.name as location_name, s.name as supplier_name,
           p.purchase_price::text, p.selling_price::text, p.lead_time_days, p.is_active,
           p.created_at, p.updated_at
    FROM products p
    LEFT JOIN locations l ON p.location_id = l.id AND l.tenant_id = p.tenant_id
    LEFT JOIN suppliers s ON p.supplier_id = s.id AND s.tenant_id = p.tenant_id
    WHERE p.tenant_id = $1 AND p.sku = $2 AND p.is_active = true
  `;
  const result = await db.queryWithTenant<ProductRow>(tenantId, query, [tenantId, sku.trim()]);
  if (result.rows.length === 0) return null;
  return rowToProduct(result.rows[0]);
}

/**
 * Get a single product by id (tenant-scoped)
 */
export async function getProductById(tenantId: string, productId: string): Promise<Product | null> {
  const db = getDatabase();
  const query = `
    SELECT p.id, p.tenant_id, p.sku, p.name, p.description, p.unit, p.quantity::text, p.min_quantity::text,
           p.location_id, p.supplier_id, l.name as location_name, s.name as supplier_name,
           p.purchase_price::text, p.selling_price::text, p.lead_time_days, p.is_active,
           p.created_at, p.updated_at
    FROM products p
    LEFT JOIN locations l ON p.location_id = l.id AND l.tenant_id = p.tenant_id
    LEFT JOIN suppliers s ON p.supplier_id = s.id AND s.tenant_id = p.tenant_id
    WHERE p.id = $1 AND p.tenant_id = $2
  `;
  const result = await db.queryWithTenant<ProductRow>(tenantId, query, [productId, tenantId]);
  if (result.rows.length === 0) return null;
  return rowToProduct(result.rows[0]);
}

/**
 * Create a new product (tenant-scoped) and log creation movement.
 */
export async function createProduct(
  tenantId: string,
  input: ProductCreateInput,
  context?: ProductServiceContext
): Promise<Product> {
  const db = getDatabase();

  if (!input.sku?.trim() || !input.name?.trim()) {
    throw new Error('SKU and name are required');
  }
  if (input.quantity != null && input.quantity < 0) {
    throw new Error('Quantity must be >= 0');
  }
  if (input.min_quantity != null && input.min_quantity < 0) {
    throw new Error('Min quantity must be >= 0');
  }
  const unit = input.unit ?? 'piece';
  if (!validateUnit(unit)) {
    throw new Error(`Invalid unit. Must be one of: ${VALID_UNITS.join(', ')}`);
  }

  const quantity = input.quantity ?? 0;
  const movementType: MovementType = context?.reason === 'Import initial' ? 'import' : 'creation';

  const insertQuery = `
    INSERT INTO products (tenant_id, sku, name, description, unit, quantity, min_quantity,
                          location_id, supplier_id, purchase_price, selling_price, lead_time_days)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, tenant_id, sku, name, description, unit, quantity::text, min_quantity::text,
              location_id, supplier_id, purchase_price::text, selling_price::text, lead_time_days,
              is_active, created_at, updated_at
  `;
  const values = [
    tenantId,
    input.sku.trim(),
    input.name.trim(),
    input.description?.trim() || null,
    unit,
    quantity,
    input.min_quantity ?? null,
    input.location_id || null,
    input.supplier_id || null,
    input.purchase_price ?? null,
    input.selling_price ?? null,
    input.lead_time_days ?? 7,
  ];

  try {
    const result = await db.queryWithTenant<ProductRow & { location_name: null; supplier_name: null }>(
      tenantId,
      insertQuery,
      values
    );
    const row = result.rows[0];
    await logMovement(
      tenantId,
      row.id,
      movementType,
      null,
      quantity,
      context?.userId ?? null,
      context?.reason ?? null
    );
    const withNames = await getProductById(tenantId, row.id);
    return withNames!;
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr.code === '23505' && pgErr.constraint?.includes('unique_sku')) {
      throw new Error('SKU already exists for this tenant');
    }
    throw err;
  }
}

/**
 * Update a product (tenant-scoped) and log quantity change if applicable.
 */
export async function updateProduct(
  tenantId: string,
  productId: string,
  input: ProductUpdateInput,
  context?: ProductServiceContext
): Promise<Product | null> {
  const db = getDatabase();
  const existing = await getProductById(tenantId, productId);
  if (!existing) return null;

  if (input.quantity != null && input.quantity < 0) {
    throw new Error('Quantity must be >= 0');
  }
  if (input.min_quantity != null && input.min_quantity < 0) {
    throw new Error('Min quantity must be >= 0');
  }
  if (input.unit != null && !validateUnit(input.unit)) {
    throw new Error(`Invalid unit. Must be one of: ${VALID_UNITS.join(', ')}`);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let idx = 1;
  const set = (col: string, val: string | number | null) => {
    updates.push(`${col} = $${idx}`);
    values.push(val);
    idx++;
  };
  if (input.sku !== undefined) set('sku', input.sku.trim());
  if (input.name !== undefined) set('name', input.name.trim());
  if (input.description !== undefined) set('description', input.description?.trim() ?? null);
  if (input.unit !== undefined) set('unit', input.unit);
  if (input.quantity !== undefined) set('quantity', input.quantity);
  if (input.min_quantity !== undefined) set('min_quantity', input.min_quantity);
  if (input.location_id !== undefined) set('location_id', input.location_id ?? null);
  if (input.supplier_id !== undefined) set('supplier_id', input.supplier_id ?? null);
  if (input.purchase_price !== undefined) set('purchase_price', input.purchase_price ?? null);
  if (input.selling_price !== undefined) set('selling_price', input.selling_price ?? null);
  if (input.lead_time_days !== undefined) set('lead_time_days', input.lead_time_days);
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(productId, tenantId);

  const updateQuery = `
    UPDATE products SET ${updates.join(', ')}
    WHERE id = $${idx} AND tenant_id = $${idx + 1}
    RETURNING id, tenant_id, sku, name, description, unit, quantity::text, min_quantity::text,
              location_id, supplier_id, purchase_price::text, selling_price::text, lead_time_days,
              is_active, created_at, updated_at
  `;
  const result = await db.queryWithTenant<ProductRow & { location_name: null; supplier_name: null }>(
    tenantId,
    updateQuery,
    values
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const newQuantity = parseFloat(row.quantity);
  if (input.quantity !== undefined && existing.quantity !== newQuantity) {
    await logMovement(
      tenantId,
      productId,
      'quantity_update',
      existing.quantity,
      newQuantity,
      context?.userId ?? null,
      context?.reason ?? null
    );
  }
  const withNames = await getProductById(tenantId, row.id);
  return withNames;
}

/**
 * Soft delete a product (set is_active = false) and log deletion movement.
 */
export async function deleteProduct(
  tenantId: string,
  productId: string,
  context?: ProductServiceContext
): Promise<boolean> {
  const db = getDatabase();
  const existing = await getProductById(tenantId, productId);
  const result = await db.queryWithTenant(
    tenantId,
    'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2',
    [productId, tenantId]
  );
  if ((result.rowCount ?? 0) > 0 && existing) {
    await logMovement(
      tenantId,
      productId,
      'deletion',
      existing.quantity,
      0,
      context?.userId ?? null,
      null
    );
  }
  return (result.rowCount ?? 0) > 0;
}
