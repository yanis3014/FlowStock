/**
 * Sales Import Service - Story 3.2
 * Import sales from CSV with column detection, mapping, validation, and batch import.
 */
import { parse } from 'csv-parse/sync';
import { getDatabase } from '../database/connection';
import { computeTotalAmount } from '../utils/sales.utils';
import type { SaleCreateInput } from '@bmad/shared';

/** Map user column headers to sale field names (case-insensitive, various languages) */
const COLUMN_ALIASES: Record<string, string> = {
  sale_date: 'sale_date',
  date: 'sale_date',
  vente_date: 'sale_date',
  'date de vente': 'sale_date',
  'date vente': 'sale_date',
  product_sku: 'product_sku',
  sku: 'product_sku',
  product: 'product_sku',
  produit: 'product_sku',
  code: 'product_sku',
  reference: 'product_sku',
  ref: 'product_sku',
  quantity_sold: 'quantity_sold',
  quantity: 'quantity_sold',
  qty: 'quantity_sold',
  qté: 'quantity_sold',
  quantité: 'quantity_sold',
  quantite: 'quantity_sold',
  unit_price: 'unit_price',
  price: 'unit_price',
  prix: 'unit_price',
  prix_vente: 'unit_price',
  'prix unitaire': 'unit_price',
  location_name: 'location_name',
  location: 'location_name',
  emplacement: 'location_name',
  metadata: 'metadata',
  'données supplémentaires': 'metadata',
};

export interface ImportPreviewResult {
  columns: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: Record<string, string>;
}

export interface ImportError {
  row: number;
  value?: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  errors: ImportError[];
  ignored: number;
  totalRows: number;
}

/** Parse CSV buffer to rows */
function parseCsv(buffer: Buffer): { headers: string[]; rows: string[][] } {
  const text = buffer.toString('utf-8');
  const firstLine = text.split('\n')[0] || '';
  
  // Improved delimiter detection: count occurrences and choose the most frequent
  let delimiter = ',';
  if (firstLine) {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    if (semicolonCount > commaCount) {
      delimiter = ';';
    }
  }
  
  const records = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  }) as string[][];
  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h) => (h || '').trim());
  const rows = records.slice(1);
  return { headers, rows };
}

/**
 * Parse file and return headers + rows
 */
export function parseFile(buffer: Buffer, originalName?: string): { headers: string[]; rows: string[][] } {
  // For MVP, only CSV is supported (Excel support can be added later if needed)
  return parseCsv(buffer);
}

/**
 * Suggest mapping from column headers to sale fields
 */
export function suggestMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const norm = h.toLowerCase().replace(/\s+/g, '_');
    const field = COLUMN_ALIASES[norm] ?? COLUMN_ALIASES[h.toLowerCase()];
    if (field) mapping[h] = field;
  }
  return mapping;
}

/**
 * Parse date string in various formats (ISO8601, DD/MM/YYYY, YYYY-MM-DD)
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;
  const trimmed = dateStr.trim();
  
  // Try ISO8601 first
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Try DD/MM/YYYY
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try YYYY-MM-DD
  const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Cache for product/location resolution during import (key: tenantId:sku/name -> id)
 * Cleared at the start of each import to ensure fresh data
 */
const productCache = new Map<string, string | null>();
const locationCache = new Map<string, string | null>();

/**
 * Find product_id by SKU for tenant
 */
async function resolveProductId(tenantId: string, sku: string): Promise<string | null> {
  if (!sku?.trim()) return null;
  const cacheKey = `${tenantId}:${sku.trim().toLowerCase()}`;
  if (productCache.has(cacheKey)) {
    return productCache.get(cacheKey) ?? null;
  }
  const db = getDatabase();
  const r = await db.queryWithTenant<{ id: string }>(
    tenantId,
    "SELECT id FROM products WHERE tenant_id = $1 AND LOWER(TRIM(sku)) = LOWER(TRIM($2)) AND is_active = true",
    [tenantId, sku.trim()]
  );
  const id = r.rows[0]?.id ?? null;
  productCache.set(cacheKey, id);
  return id;
}

/**
 * Find location_id by name for tenant (MVP: return null if not found)
 */
async function resolveLocationId(tenantId: string, name: string): Promise<string | null> {
  if (!name?.trim()) return null;
  const cacheKey = `${tenantId}:${name.trim().toLowerCase()}`;
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey) ?? null;
  }
  const db = getDatabase();
  const r = await db.queryWithTenant<{ id: string }>(
    tenantId,
    "SELECT id FROM locations WHERE tenant_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND is_active = true",
    [tenantId, name.trim()]
  );
  const id = r.rows[0]?.id ?? null;
  locationCache.set(cacheKey, id);
  return id;
}

/**
 * Validate a single row and convert to SaleCreateInput
 */
export async function validateRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
  tenantId: string,
  rowIndex: number
): Promise<{ ok: true; input: SaleCreateInput } | { ok: false; message: string }> {
  const get = (field: string): string => {
    const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
    return col ? String(row[col] ?? '').trim() : '';
  };

  const productSku = get('product_sku');
  if (!productSku) {
    return { ok: false, message: 'product_sku is required' };
  }

  // Resolve product_id from SKU
  const productId = await resolveProductId(tenantId, productSku);
  if (!productId) {
    return { ok: false, message: `Product with SKU "${productSku}" not found` };
  }

  const saleDateStr = get('sale_date');
  const saleDate = saleDateStr ? parseDate(saleDateStr) : new Date();
  if (saleDateStr && !saleDate) {
    return { ok: false, message: `Invalid date format: "${saleDateStr}" (expected ISO8601, DD/MM/YYYY, or YYYY-MM-DD)` };
  }

  const qtyStr = get('quantity_sold');
  const qty = qtyStr === '' ? 0 : parseFloat(qtyStr);
  if (Number.isNaN(qty) || qty <= 0) {
    return { ok: false, message: 'quantity_sold must be > 0' };
  }

  const unitPriceStr = get('unit_price');
  const unitPrice = unitPriceStr === '' ? null : parseFloat(unitPriceStr);
  if (unitPriceStr !== '' && (Number.isNaN(unitPrice!) || unitPrice! < 0)) {
    return { ok: false, message: 'unit_price must be >= 0' };
  }

  const locationName = get('location_name');
  let locationId: string | null = null;
  if (locationName) {
    locationId = await resolveLocationId(tenantId, locationName);
    // MVP: ignore if not found (don't create automatically)
  }

  const metadataStr = get('metadata');
  let metadata: Record<string, unknown> | undefined;
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr) as Record<string, unknown>;
    } catch {
      // If metadata is not valid JSON, ignore it
      metadata = undefined;
    }
  }

  const input: SaleCreateInput = {
    product_id: productId,
    sale_date: (saleDate ?? new Date()).toISOString(),
    quantity_sold: qty,
    unit_price: unitPrice ?? undefined,
    location_id: locationId ?? undefined,
    metadata,
  };

  return { ok: true, input };
}

/**
 * Get preview for import: columns, sample rows, suggested mapping
 */
export function getImportPreview(buffer: Buffer, originalName?: string): ImportPreviewResult {
  const { headers, rows } = parseFile(buffer, originalName);
  const suggestedMapping = suggestMapping(headers);
  const sampleRows: Record<string, string>[] = rows.slice(0, 20).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
  return { columns: headers, sampleRows, suggestedMapping };
}

/**
 * Import sales from parsed rows with mapping.
 * Uses batch transactions (100 rows) for performance.
 * Validates rows first, then imports valid ones in batches.
 */
export async function importSales(
  tenantId: string,
  buffer: Buffer,
  originalName: string | undefined,
  mappingOverride?: Record<string, string>,
  userId?: string | null
): Promise<ImportResult> {
  const { headers, rows } = parseFile(buffer, originalName);
  const mapping = mappingOverride ?? suggestMapping(headers);

  // Clear caches at start of import
  productCache.clear();
  locationCache.clear();

  const result: ImportResult = {
    imported: 0,
    errors: [],
    ignored: 0,
    totalRows: rows.length,
  };

  // First pass: validate all rows and collect valid inputs
  const validInputs: Array<{ input: SaleCreateInput; rowIndex: number }> = [];
  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2; // 1-based, +1 for header
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rows[i][idx] ?? '';
    });

    const validated = await validateRow(rowObj, mapping, tenantId, rowIndex);
    if (!validated.ok) {
      const errorValue = rowObj[Object.keys(mapping).find((k) => mapping[k] === 'product_sku') || ''] || 
                        `Row ${rowIndex}`;
      result.errors.push({ row: rowIndex, value: errorValue, message: validated.message });
      continue;
    }
    validInputs.push({ input: validated.input, rowIndex });
  }

  // Second pass: import valid rows in batches
  const BATCH_SIZE = 100;
  const db = getDatabase();

  for (let batchStart = 0; batchStart < validInputs.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, validInputs.length);
    const batch = validInputs.slice(batchStart, batchEnd);

    try {
      await db.transactionWithTenant(tenantId, async (client) => {
        for (const { input } of batch) {
          const saleDate = input.sale_date ? new Date(input.sale_date) : new Date();
          const totalAmount = computeTotalAmount(input.quantity_sold, input.unit_price);

          await client.query(
            `INSERT INTO sales (tenant_id, product_id, sale_date, quantity_sold, unit_price, total_amount, location_id, source, user_id, metadata)
             VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7, 'csv', $8, $9::jsonb)`,
            [
              tenantId,
              input.product_id,
              saleDate.toISOString(),
              input.quantity_sold,
              input.unit_price ?? null,
              totalAmount,
              input.location_id ?? null,
              userId ?? null,
              JSON.stringify(input.metadata ?? {}),
            ]
          );
        }
      });
      result.imported += batch.length;
    } catch (err) {
      // If batch transaction fails, mark all rows in batch as errors
      const msg = err instanceof Error ? err.message : 'Batch import failed';
      for (const { input, rowIndex } of batch) {
        result.errors.push({
          row: rowIndex,
          value: input.product_id,
          message: msg,
        });
      }
    }
  }

  result.ignored = result.totalRows - result.imported - result.errors.length;
  return result;
}

/** CSV template content (BOM for Excel compatibility) */
export const CSV_TEMPLATE =
  '\uFEFFsale_date,product_sku,quantity_sold,unit_price,location_name\n' +
  '2024-01-15,SKU001,5,12.50,Magasin Principal\n' +
  '2024-01-16,SKU002,3,8.00,\n';
