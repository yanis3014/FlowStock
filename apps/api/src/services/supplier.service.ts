import { getDatabase } from '../database/connection';
import type { Supplier, SupplierCreateInput, SupplierUpdateInput } from '@bmad/shared';

export interface SupplierListFilters {
  page?: number;
  limit?: number;
  is_active?: boolean;
}

export interface SupplierListResult {
  data: Supplier[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface SupplierRow {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  products_count: string;
  created_at: Date;
  updated_at: Date;
}

const productsCountSubquery = `(SELECT COUNT(*)::integer FROM products p WHERE p.supplier_id = s.id AND p.is_active = true) AS products_count`;

function rowToSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contact_name: row.contact_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    is_active: row.is_active,
    products_count: parseInt(row.products_count, 10),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * List suppliers for tenant with optional pagination and is_active filter
 */
export async function listSuppliers(
  tenantId: string,
  filters: SupplierListFilters = {}
): Promise<SupplierListResult> {
  const db = getDatabase();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['s.tenant_id = $1'];
  const values: (string | number | boolean)[] = [tenantId];
  let paramIndex = 2;
  if (filters.is_active !== undefined) {
    conditions.push(`s.is_active = $${paramIndex}`);
    values.push(filters.is_active);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');
  const countResult = await db.queryWithTenant<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM suppliers s WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const rows = await db.queryWithTenant<SupplierRow>(
    tenantId,
    `SELECT s.id, s.name, s.contact_name, s.email, s.phone, s.address, s.notes, s.is_active, s.created_at, s.updated_at,
            ${productsCountSubquery}
     FROM suppliers s
     WHERE ${whereClause}
     ORDER BY s.name ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows.rows.map(rowToSupplier),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get a single supplier by id (tenant-scoped), 404 if not found
 */
export async function getSupplierById(
  tenantId: string,
  supplierId: string
): Promise<Supplier | null> {
  const db = getDatabase();
  const result = await db.queryWithTenant<SupplierRow>(
    tenantId,
    `SELECT s.id, s.name, s.contact_name, s.email, s.phone, s.address, s.notes, s.is_active, s.created_at, s.updated_at,
            ${productsCountSubquery}
     FROM suppliers s
     WHERE s.id = $1 AND s.tenant_id = $2`,
    [supplierId, tenantId]
  );
  if (result.rows.length === 0) return null;
  return rowToSupplier(result.rows[0]);
}

/** Error code for duplicate supplier name (unique constraint) */
export const DUPLICATE_SUPPLIER_NAME_CODE = 'DUPLICATE_NAME';

function isDuplicateNameError(err: unknown): boolean {
  const pg = err as { code?: string; constraint?: string };
  return pg?.code === '23505' && (pg?.constraint?.includes('name') ?? false);
}

/** Basic email format check (optional field; if provided must be valid) */
function isValidEmail(email: string | null | undefined): boolean {
  if (email == null || email.trim() === '') return true;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Create a supplier (name required, unique per tenant; email format validated if provided)
 */
export async function createSupplier(
  tenantId: string,
  input: SupplierCreateInput
): Promise<Supplier> {
  const db = getDatabase();
  const name = input.name?.trim();
  if (!name) {
    const err = new Error('name is required');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }
  if (!isValidEmail(input.email)) {
    const err = new Error('Invalid email format');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }

  try {
    const result = await db.queryWithTenant<{ id: string }>(
      tenantId,
      `INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        tenantId,
        name,
        input.contact_name?.trim() || null,
        input.email?.trim() || null,
        input.phone?.trim() || null,
        input.address?.trim() || null,
        input.notes?.trim() || null,
      ]
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Failed to create supplier');
    const sup = await getSupplierById(tenantId, id);
    if (!sup) throw new Error('Failed to load created supplier');
    return sup;
  } catch (err: unknown) {
    if (isDuplicateNameError(err)) {
      const e = new Error('A supplier with this name already exists');
      (e as Error & { code?: string }).code = DUPLICATE_SUPPLIER_NAME_CODE;
      throw e;
    }
    throw err;
  }
}

/**
 * Update a supplier (soft delete = is_active = false)
 */
export async function updateSupplier(
  tenantId: string,
  supplierId: string,
  input: SupplierUpdateInput
): Promise<Supplier | null> {
  const db = getDatabase();
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    const name = input.name?.trim();
    if (name === '') {
      const err = new Error('name cannot be empty');
      (err as Error & { code?: string }).code = 'VALIDATION';
      throw err;
    }
    updates.push(`name = $${idx++}`);
    values.push(name ?? null);
  }
  if (input.contact_name !== undefined) {
    updates.push(`contact_name = $${idx++}`);
    values.push(input.contact_name?.trim() || null);
  }
  if (input.email !== undefined) {
    if (!isValidEmail(input.email)) {
      const err = new Error('Invalid email format');
      (err as Error & { code?: string }).code = 'VALIDATION';
      throw err;
    }
    updates.push(`email = $${idx++}`);
    values.push(input.email?.trim() || null);
  }
  if (input.phone !== undefined) {
    updates.push(`phone = $${idx++}`);
    values.push(input.phone?.trim() || null);
  }
  if (input.address !== undefined) {
    updates.push(`address = $${idx++}`);
    values.push(input.address?.trim() || null);
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${idx++}`);
    values.push(input.notes?.trim() || null);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${idx++}`);
    values.push(input.is_active);
  }

  if (updates.length === 0) {
    return getSupplierById(tenantId, supplierId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(supplierId, tenantId);

  try {
    const result = await db.queryWithTenant<SupplierRow>(
      tenantId,
      `UPDATE suppliers
       SET ${updates.join(', ')}
       WHERE id = $${idx} AND tenant_id = $${idx + 1}
       RETURNING id, name, contact_name, email, phone, address, notes, is_active, created_at, updated_at,
                 (SELECT COUNT(*)::integer FROM products p WHERE p.supplier_id = suppliers.id AND p.is_active = true) AS products_count`,
      values
    );
    if (result.rows.length === 0) return null;
    return rowToSupplier(result.rows[0]);
  } catch (err: unknown) {
    if (isDuplicateNameError(err)) {
      const e = new Error('A supplier with this name already exists');
      (e as Error & { code?: string }).code = DUPLICATE_SUPPLIER_NAME_CODE;
      throw e;
    }
    throw err;
  }
}

/**
 * Soft delete: set is_active = false. Products keep supplier_id (ON DELETE SET NULL not triggered).
 */
export async function deleteSupplier(tenantId: string, supplierId: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.queryWithTenant<{ id: string }>(
    tenantId,
    `UPDATE suppliers SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2
     RETURNING id`,
    [supplierId, tenantId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
