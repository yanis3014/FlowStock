/**
 * Product Import Service - Story 2.2
 * Import products from CSV/Excel with column detection, mapping, validation, and batch import.
 */
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { getDatabase } from '../database/connection';
import { createProduct } from './product.service';
import type { ProductCreateInput, ProductUnit } from '@bmad/shared';

/** Map user column headers to product field names (case-insensitive, various languages) */
const COLUMN_ALIASES: Record<string, string> = {
  sku: 'sku',
  ref: 'sku',
  code: 'sku',
  reference: 'sku',
  name: 'name',
  nom: 'name',
  product: 'name',
  produit: 'name',
  description: 'description',
  desc: 'description',
  unit: 'unit',
  unite: 'unit',
  quantity: 'quantity',
  qty: 'quantity',
  qté: 'quantity',
  quantité: 'quantity',
  quantite: 'quantity',
  stock: 'quantity',
  min_quantity: 'min_quantity',
  min_qty: 'min_quantity',
  min: 'min_quantity',
  seuil: 'min_quantity',
  location_name: 'location_name',
  location: 'location_name',
  emplacement: 'location_name',
  supplier_name: 'supplier_name',
  supplier: 'supplier_name',
  fournisseur: 'supplier_name',
  purchase_price: 'purchase_price',
  prix_achat: 'purchase_price',
  cost: 'purchase_price',
  selling_price: 'selling_price',
  prix_vente: 'selling_price',
  price: 'selling_price',
  lead_time_days: 'lead_time_days',
  lead_time: 'lead_time_days',
  délai: 'lead_time_days',
  delai: 'lead_time_days',
};

/** Unit normalization map */
const UNIT_NORMALIZE: Record<string, ProductUnit> = {
  pc: 'piece',
  pcs: 'piece',
  piece: 'piece',
  pieces: 'piece',
  kg: 'kg',
  kilo: 'kg',
  liter: 'liter',
  litre: 'liter',
  l: 'liter',
  box: 'box',
  boxes: 'box',
  pack: 'pack',
  packs: 'pack',
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

/** Detect file type from buffer (magic bytes or extension via originalname) */
function detectFileType(buffer: Buffer, originalName?: string): 'csv' | 'xlsx' {
  const ext = originalName?.toLowerCase().split('.').pop();
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return 'xlsx'; // ZIP header (xlsx)
  return 'csv';
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

/** Parse Excel buffer to rows (first sheet) */
function parseExcel(buffer: Buffer): { headers: string[]; rows: string[][] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];
  if (data.length === 0) return { headers: [], rows: [] };
  const headers = (data[0] || []).map((h) => String(h || '').trim());
  const rows = data.slice(1).map((row) => (Array.isArray(row) ? row : []).map((c) => String(c ?? '').trim()));
  return { headers, rows };
}

/**
 * Parse file and return headers + rows
 */
export function parseFile(buffer: Buffer, originalName?: string): { headers: string[]; rows: string[][] } {
  const type = detectFileType(buffer, originalName);
  if (type === 'xlsx') return parseExcel(buffer);
  return parseCsv(buffer);
}

/**
 * Suggest mapping from column headers to product fields
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

function normalizeUnit(val: string): ProductUnit {
  const v = String(val || '').toLowerCase().trim();
  return UNIT_NORMALIZE[v] ?? 'piece';
}

/**
 * Validate a single row and convert to ProductCreateInput
 */
export function validateRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
  rowIndex: number
): { ok: true; input: ProductCreateInput } | { ok: false; message: string } {
  const get = (field: string): string => {
    const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
    return col ? String(row[col] ?? '').trim() : '';
  };

  const sku = get('sku');
  const name = get('name');
  if (!sku) return { ok: false, message: 'SKU is required' };
  if (!name) return { ok: false, message: 'Name is required' };

  const qtyStr = get('quantity');
  const qty = qtyStr === '' ? 0 : parseFloat(qtyStr);
  if (Number.isNaN(qty) || qty < 0) return { ok: false, message: 'Quantity must be >= 0' };

  const minQtyStr = get('min_quantity');
  const minQty = minQtyStr === '' ? null : parseFloat(minQtyStr);
  if (minQtyStr !== '' && (Number.isNaN(minQty!) || minQty! < 0))
    return { ok: false, message: 'Min quantity must be >= 0' };

  const unitRaw = get('unit');
  const unit = unitRaw ? normalizeUnit(unitRaw) : 'piece';
  // normalizeUnit always returns a valid unit (defaults to 'piece'), so validation is implicit

  const purchasePriceStr = get('purchase_price');
  const purchasePrice = purchasePriceStr === '' ? null : parseFloat(purchasePriceStr);
  if (purchasePriceStr !== '' && (Number.isNaN(purchasePrice!) || purchasePrice! < 0))
    return { ok: false, message: 'Purchase price must be >= 0' };

  const sellingPriceStr = get('selling_price');
  const sellingPrice = sellingPriceStr === '' ? null : parseFloat(sellingPriceStr);
  if (sellingPriceStr !== '' && (Number.isNaN(sellingPrice!) || sellingPrice! < 0))
    return { ok: false, message: 'Selling price must be >= 0' };

  const leadTimeStr = get('lead_time_days');
  const leadTime = leadTimeStr === '' ? 7 : parseInt(leadTimeStr, 10);
  if (leadTimeStr !== '' && (Number.isNaN(leadTime) || leadTime < 0))
    return { ok: false, message: 'Lead time days must be >= 0' };

  const input: ProductCreateInput = {
    sku,
    name,
    description: get('description') || undefined,
    unit,
    quantity: qty,
    min_quantity: minQty ?? undefined,
    purchase_price: purchasePrice ?? undefined,
    selling_price: sellingPrice ?? undefined,
    lead_time_days: leadTime,
  };

  return { ok: true, input };
}

/**
 * Cache for location/supplier resolution during import (key: tenantId:name -> id)
 * Cleared at the start of each import to ensure fresh data
 */
const locationCache = new Map<string, string | null>();
const supplierCache = new Map<string, string | null>();

/**
 * Find location_id by name for tenant (MVP: return null if not found)
 * Uses cache to avoid repeated DB queries for same name
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
 * Find supplier_id by name for tenant (MVP: return null if not found)
 * Uses cache to avoid repeated DB queries for same name
 */
async function resolveSupplierId(tenantId: string, name: string): Promise<string | null> {
  if (!name?.trim()) return null;
  const cacheKey = `${tenantId}:${name.trim().toLowerCase()}`;
  if (supplierCache.has(cacheKey)) {
    return supplierCache.get(cacheKey) ?? null;
  }
  const db = getDatabase();
  const r = await db.queryWithTenant<{ id: string }>(
    tenantId,
    "SELECT id FROM suppliers WHERE tenant_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND is_active = true",
    [tenantId, name.trim()]
  );
  const id = r.rows[0]?.id ?? null;
  supplierCache.set(cacheKey, id);
  return id;
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
 * Import products from parsed rows with mapping
 */
export async function importProducts(
  tenantId: string,
  buffer: Buffer,
  originalName: string | undefined,
  mappingOverride?: Record<string, string>
): Promise<ImportResult> {
  const { headers, rows } = parseFile(buffer, originalName);
  const mapping = mappingOverride ?? suggestMapping(headers);

  // Clear caches at start of import
  locationCache.clear();
  supplierCache.clear();

  const result: ImportResult = {
    imported: 0,
    errors: [],
    ignored: 0,
    totalRows: rows.length,
  };

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2; // 1-based, +1 for header
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rows[i][idx] ?? '';
    });

    const validated = validateRow(rowObj, mapping, rowIndex);
    if (!validated.ok) {
      // Limit error value size to avoid huge error messages (keep only SKU and name if available)
      const errorValue = rowObj[Object.keys(mapping).find((k) => mapping[k] === 'sku') || ''] || 
                        rowObj[Object.keys(mapping).find((k) => mapping[k] === 'name') || ''] || 
                        `Row ${rowIndex}`;
      result.errors.push({ row: rowIndex, value: errorValue, message: validated.message });
      continue;
    }

    let input = validated.input;

    const locationName = Object.entries(mapping).find(([, f]) => f === 'location_name')?.[0];
    if (locationName && rowObj[locationName]?.trim()) {
      const locId = await resolveLocationId(tenantId, rowObj[locationName]);
      if (locId) input = { ...input, location_id: locId };
    }

    const supplierName = Object.entries(mapping).find(([, f]) => f === 'supplier_name')?.[0];
    if (supplierName && rowObj[supplierName]?.trim()) {
      const supId = await resolveSupplierId(tenantId, rowObj[supplierName]);
      if (supId) input = { ...input, supplier_id: supId };
    }

    try {
      await createProduct(tenantId, input);
      result.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push({ row: rowIndex, value: input.sku, message: msg });
    }
  }

  result.ignored = result.totalRows - result.imported;
  return result;
}

/** CSV template content (BOM for Excel compatibility) */
export const CSV_TEMPLATE =
  '\uFEFFsku,name,description,unit,quantity,min_quantity,location_name,supplier_name,purchase_price,selling_price,lead_time_days\n' +
  'SKU001,Product Example,Optional description,piece,10,2,,,10.50,15.00,7\n';
