import { getDatabase } from '../database/connection';
import type { Location, LocationCreateInput, LocationUpdateInput } from '@bmad/shared';

export interface LocationListFilters {
  page?: number;
  limit?: number;
  is_active?: boolean;
}

export interface LocationListResult {
  data: Location[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  location_type: string | null;
  is_active: boolean;
  total_quantity: string;
  created_at: Date;
  updated_at: Date;
}

const totalQuantitySubquery = `(SELECT COALESCE(SUM(p.quantity), 0)::decimal FROM products p WHERE p.location_id = l.id AND p.is_active = true) AS total_quantity`;

function rowToLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    location_type: row.location_type,
    is_active: row.is_active,
    total_quantity: parseFloat(row.total_quantity),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * List locations for tenant with optional pagination and is_active filter
 */
export async function listLocations(
  tenantId: string,
  filters: LocationListFilters = {}
): Promise<LocationListResult> {
  const db = getDatabase();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['l.tenant_id = $1'];
  const values: (string | number | boolean)[] = [tenantId];
  let paramIndex = 2;
  if (filters.is_active !== undefined) {
    conditions.push(`l.is_active = $${paramIndex}`);
    values.push(filters.is_active);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');
  const countResult = await db.queryWithTenant<{ count: string }>(
    tenantId,
    `SELECT COUNT(*)::text AS count FROM locations l WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const rows = await db.queryWithTenant<LocationRow>(
    tenantId,
    `SELECT l.id, l.name, l.address, l.location_type, l.is_active, l.created_at, l.updated_at,
            ${totalQuantitySubquery}
     FROM locations l
     WHERE ${whereClause}
     ORDER BY l.name ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows.rows.map(rowToLocation),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get a single location by id (tenant-scoped), 404 if not found
 */
export async function getLocationById(
  tenantId: string,
  locationId: string
): Promise<Location | null> {
  const db = getDatabase();
  const result = await db.queryWithTenant<LocationRow>(
    tenantId,
    `SELECT l.id, l.name, l.address, l.location_type, l.is_active, l.created_at, l.updated_at,
            ${totalQuantitySubquery}
     FROM locations l
     WHERE l.id = $1 AND l.tenant_id = $2`,
    [locationId, tenantId]
  );
  if (result.rows.length === 0) return null;
  return rowToLocation(result.rows[0]);
}

/** Error code for duplicate location name (unique constraint) */
export const DUPLICATE_LOCATION_NAME_CODE = 'DUPLICATE_NAME';

function isDuplicateNameError(err: unknown): boolean {
  const pg = err as { code?: string; constraint?: string };
  return pg?.code === '23505' && (pg?.constraint?.includes('name') ?? false);
}

/**
 * Create a location (name required, unique per tenant)
 */
export async function createLocation(
  tenantId: string,
  input: LocationCreateInput
): Promise<Location> {
  const db = getDatabase();
  const name = input.name?.trim();
  if (!name) {
    const err = new Error('name is required');
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }

  try {
    const result = await db.queryWithTenant<{ id: string }>(
      tenantId,
      `INSERT INTO locations (tenant_id, name, address, location_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        tenantId,
        name,
        input.address?.trim() || null,
        input.location_type?.trim() || null,
      ]
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Failed to create location');
    const loc = await getLocationById(tenantId, id);
    if (!loc) throw new Error('Failed to load created location');
    return loc;
  } catch (err: unknown) {
    if (isDuplicateNameError(err)) {
      const e = new Error('A location with this name already exists');
      (e as Error & { code?: string }).code = DUPLICATE_LOCATION_NAME_CODE;
      throw e;
    }
    throw err;
  }
}

/**
 * Update a location (soft delete = is_active = false)
 */
export async function updateLocation(
  tenantId: string,
  locationId: string,
  input: LocationUpdateInput
): Promise<Location | null> {
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
    values.push(name);
  }
  if (input.address !== undefined) {
    updates.push(`address = $${idx++}`);
    values.push(input.address?.trim() || null);
  }
  if (input.location_type !== undefined) {
    updates.push(`location_type = $${idx++}`);
    values.push(input.location_type?.trim() || null);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${idx++}`);
    values.push(input.is_active);
  }

  if (updates.length === 0) {
    return getLocationById(tenantId, locationId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(locationId, tenantId);

  try {
    const result = await db.queryWithTenant<LocationRow>(
      tenantId,
      `UPDATE locations
       SET ${updates.join(', ')}
       WHERE id = $${idx} AND tenant_id = $${idx + 1}
       RETURNING id, name, address, location_type, is_active, created_at, updated_at,
                 (SELECT COALESCE(SUM(p.quantity), 0)::decimal FROM products p WHERE p.location_id = locations.id AND p.is_active = true) AS total_quantity`,
      values
    );
    if (result.rows.length === 0) return null;
    return rowToLocation(result.rows[0]);
  } catch (err: unknown) {
    if (isDuplicateNameError(err)) {
      const e = new Error('A location with this name already exists');
      (e as Error & { code?: string }).code = DUPLICATE_LOCATION_NAME_CODE;
      throw e;
    }
    throw err;
  }
}

/**
 * Soft delete: set is_active = false. Products at this location keep location_id (no cascade).
 */
export async function deleteLocation(tenantId: string, locationId: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.queryWithTenant<{ id: string }>(
    tenantId,
    `UPDATE locations SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2
     RETURNING id`,
    [locationId, tenantId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}
