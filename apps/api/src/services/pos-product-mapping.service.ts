/**
 * POS Product Mapping Service (Story 2.3)
 * Manages mapping of POS product identifiers (e.g. Lightspeed item ID) to Flowstock product_id or sku.
 */
import { getDatabase } from '../database/connection';
import type { PosType } from './pos-webhook.service';

export interface PosProductMappingRow {
  id: string;
  tenant_id: string;
  pos_type: string;
  pos_identifier: string;
  flowstock_product_id: string | null;
  flowstock_sku: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PosProductMappingCreate {
  pos_type: PosType;
  pos_identifier: string;
  flowstock_product_id?: string | null;
  flowstock_sku?: string | null;
}

export interface PosProductMapping {
  id: string;
  tenant_id: string;
  pos_type: string;
  pos_identifier: string;
  flowstock_product_id: string | null;
  flowstock_sku: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMapping(row: PosProductMappingRow): PosProductMapping {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    pos_type: row.pos_type,
    pos_identifier: row.pos_identifier,
    flowstock_product_id: row.flowstock_product_id,
    flowstock_sku: row.flowstock_sku,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Resolve a POS product identifier to Flowstock product_id or sku for use in webhook lines.
 * Returns { product_id, sku } (one or both) or null if no mapping.
 */
export async function getMappingForPosIdentifier(
  tenantId: string,
  posType: string,
  posIdentifier: string
): Promise<{ product_id?: string; sku?: string } | null> {
  if (!posIdentifier?.trim()) return null;
  const db = getDatabase();
  const result = await db.queryWithTenant<PosProductMappingRow>(
    tenantId,
    `SELECT id, tenant_id, pos_type, pos_identifier, flowstock_product_id, flowstock_sku, created_at, updated_at
     FROM pos_product_mapping
     WHERE tenant_id = $1 AND pos_type = $2 AND pos_identifier = $3`,
    [tenantId, posType, posIdentifier.trim()]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    ...(row.flowstock_product_id ? { product_id: row.flowstock_product_id } : {}),
    ...(row.flowstock_sku ? { sku: row.flowstock_sku } : {}),
  };
}

/**
 * List mappings for a tenant, optionally filtered by pos_type.
 */
export async function listMappings(
  tenantId: string,
  posType?: string
): Promise<PosProductMapping[]> {
  const db = getDatabase();
  const query = posType
    ? `SELECT id, tenant_id, pos_type, pos_identifier, flowstock_product_id, flowstock_sku, created_at, updated_at
       FROM pos_product_mapping WHERE tenant_id = $1 AND pos_type = $2 ORDER BY pos_identifier`
    : `SELECT id, tenant_id, pos_type, pos_identifier, flowstock_product_id, flowstock_sku, created_at, updated_at
       FROM pos_product_mapping WHERE tenant_id = $1 ORDER BY pos_type, pos_identifier`;
  const values = posType ? [tenantId, posType] : [tenantId];
  const result = await db.queryWithTenant<PosProductMappingRow>(tenantId, query, values);
  return result.rows.map(rowToMapping);
}

/**
 * Create a mapping. Either flowstock_product_id or flowstock_sku must be set.
 * Validates that the referenced product exists for the tenant.
 */
export async function createMapping(
  tenantId: string,
  input: PosProductMappingCreate
): Promise<PosProductMapping> {
  const db = getDatabase();
  const hasProductId = input.flowstock_product_id != null && input.flowstock_product_id.trim() !== '';
  const hasSku = input.flowstock_sku != null && input.flowstock_sku.trim() !== '';
  if (!hasProductId && !hasSku) {
    throw new Error('Either flowstock_product_id or flowstock_sku is required');
  }
  if (hasProductId) {
    const prod = await db.queryWithTenant<{ id: string }>(
      tenantId,
      'SELECT id FROM products WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [input.flowstock_product_id!.trim(), tenantId]
    );
    if (prod.rows.length === 0) {
      throw new Error('Product not found');
    }
  }
  if (hasSku) {
    const prod = await db.queryWithTenant<{ id: string }>(
      tenantId,
      'SELECT id FROM products WHERE tenant_id = $1 AND sku = $2 AND is_active = true',
      [tenantId, input.flowstock_sku!.trim()]
    );
    if (prod.rows.length === 0) {
      throw new Error('Product not found');
    }
  }
  const result = await db.queryWithTenant<PosProductMappingRow>(
    tenantId,
    `INSERT INTO pos_product_mapping (tenant_id, pos_type, pos_identifier, flowstock_product_id, flowstock_sku, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING id, tenant_id, pos_type, pos_identifier, flowstock_product_id, flowstock_sku, created_at, updated_at`,
    [
      tenantId,
      input.pos_type,
      input.pos_identifier.trim(),
      hasProductId ? input.flowstock_product_id!.trim() : null,
      hasSku ? input.flowstock_sku!.trim() : null,
    ]
  );
  return rowToMapping(result.rows[0]);
}

/**
 * Delete a mapping by id (tenant-scoped).
 */
export async function deleteMappingById(
  tenantId: string,
  mappingId: string
): Promise<boolean> {
  const db = getDatabase();
  const result = await db.queryWithTenant(
    tenantId,
    'DELETE FROM pos_product_mapping WHERE id = $1 AND tenant_id = $2',
    [mappingId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}
