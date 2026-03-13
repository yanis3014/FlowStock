/**
 * Types pour l'import CSV intelligent (mapping IA → format FlowStock produits).
 */

export type CsvMapping = {
  source: string;
  target: string;
  confidence: 'high' | 'medium' | 'low';
};

export type CsvTransformResult = {
  mapping: CsvMapping[];
  rows: Record<string, string>[];
  unmappedSourceColumns: string[];
  missingRequiredColumns: string[];
  note: string;
  totalRows: number;
};

export const TARGET_COLUMNS = [
  'sku',
  'name',
  'description',
  'unit',
  'quantity',
  'min_quantity',
  'location_name',
  'supplier_name',
  'purchase_price',
  'selling_price',
  'lead_time_days',
] as const;

export type TargetColumn = (typeof TARGET_COLUMNS)[number];
