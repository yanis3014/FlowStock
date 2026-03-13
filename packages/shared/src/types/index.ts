// Shared TypeScript types across the monorepo

export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  version: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Story 2.1: Products / Stocks
export type ProductUnit = 'piece' | 'kg' | 'liter' | 'box' | 'pack';

export type StockStatus = 'ok' | 'low' | 'critical';

export interface LocationRef {
  id: string;
  name: string;
}

export interface SupplierRef {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: ProductUnit;
  quantity: number;
  min_quantity: number | null;
  location: LocationRef | null;
  supplier: SupplierRef | null;
  purchase_price: number | null;
  selling_price: number | null;
  lead_time_days: number;
  is_active: boolean;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductCreateInput {
  sku: string;
  name: string;
  description?: string | null;
  unit?: ProductUnit;
  quantity?: number;
  min_quantity?: number | null;
  location_id?: string | null;
  supplier_id?: string | null;
  purchase_price?: number | null;
  selling_price?: number | null;
  lead_time_days?: number;
}

export interface ProductUpdateInput {
  sku?: string;
  name?: string;
  description?: string | null;
  unit?: ProductUnit;
  quantity?: number;
  min_quantity?: number | null;
  location_id?: string | null;
  supplier_id?: string | null;
  purchase_price?: number | null;
  selling_price?: number | null;
  lead_time_days?: number;
}

// Story 2.3: Locations (emplacements)
export interface Location {
  id: string;
  name: string;
  address: string | null;
  location_type: string | null;
  is_active: boolean;
  total_quantity?: number; // computed: sum of products.quantity at this location
  created_at: string;
  updated_at: string;
}

export interface LocationCreateInput {
  name: string;
  address?: string | null;
  location_type?: string | null;
}

export interface LocationUpdateInput {
  name?: string;
  address?: string | null;
  location_type?: string | null;
  is_active?: boolean;
}

// Story 2.5: Suppliers (fournisseurs)
export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  products_count?: number; // computed: count of products linked to this supplier
  created_at: string;
  updated_at: string;
}

export interface SupplierCreateInput {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface SupplierUpdateInput {
  name?: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

// Story 2.4: Stock movement history
// Epics 6+7+8: combined movement types (canonical set)
export type MovementType =
  | 'creation'
  | 'quantity_update'
  | 'deletion'
  | 'import'
  | 'pos_sale'
  | 'loss'
  | 'perte'
  | 'entree_livraison'
  | 'livraison'
  | 'commande_en_cours';

// Epic 8.1: Loss declaration
export type LossReason = 'expired' | 'broken' | 'theft' | 'prep_error' | 'other';

export interface LossDeclarationInput {
  product_id: string;
  quantity: number;
  reason: LossReason;
  notes?: string | null;
}

export interface LossDeclaration {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reason: LossReason;
  notes: string | null;
  user_id: string | null;
  created_at: string;
}

// Epic 8.2: Stock discrepancy analysis
export interface StockDiscrepancy {
  product_id: string;
  product_name: string;
  product_sku: string;
  unit: string;
  stock_theorique: number;
  stock_reel: number;
  ecart: number;
  ecart_pct: number;
  is_anomaly: boolean;
  anomaly_threshold_pct: number;
  total_entries: number;
  total_pos_sales: number;
  total_losses: number;
  ai_analysis: string | null;
}

export interface DiscrepancyReport {
  generated_at: string;
  period_days: number;
  anomaly_threshold_pct: number;
  items: StockDiscrepancy[];
  anomaly_count: number;
  ai_summary: string | null;
}

// Epic 7: Invoice / Facture OCR
export type InvoiceConfidence = 'high' | 'medium' | 'low';
export type InvoiceStatus = 'pending' | 'reviewing' | 'traitee' | 'erreur';

export interface InvoiceLine {
  id?: string;
  designation: string;
  quantite: number;
  unite: string | null;
  prix_unitaire_ht: number | null;
  montant_ht: number | null;
  product_id?: string | null;
}

export interface Invoice {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_date: string | null;
  file_name: string | null;
  file_mime: string | null;
  total_ht: number | null;
  confidence: InvoiceConfidence | null;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceOcrResult {
  invoice_id: string;
  fournisseur: string | null;
  date_facture: string | null;
  lignes: InvoiceLine[];
  total_ht: number | null;
  confiance: InvoiceConfidence;
}

export interface ValidateInvoiceInput {
  lines: InvoiceLine[];
  supplier_name?: string | null;
  invoice_date?: string | null;
}

export interface ValidateInvoiceResult {
  updated: Array<{ product_id: string; product_name: string; qty_added: number }>;
  unmatched: Array<{ designation: string; quantite: number }>;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity_before: number | null;
  quantity_after: number | null;
  user_id: string | null;
  user_email?: string | null;
  reason: string | null;
  created_at: string;
}

export interface StockMovementListFilters {
  page?: number;
  limit?: number;
  movement_type?: MovementType;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface StockMovementListResult {
  data: StockMovement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  retention_days: number;
}

// Story 3.1: Sales (ventes)
export type SaleSource = 'manual' | 'csv_import' | 'pos_terminal' | 'api';

export interface Sale {
  id: string;
  product_id: string;
  product_name?: string;
  sale_date: string;
  quantity_sold: number;
  unit_price: number | null;
  total_amount: number | null;
  location_id: string | null;
  location_name?: string | null;
  source: SaleSource;
  user_id: string | null;
  created_at: string;
}

export interface SaleCreateInput {
  product_id: string;
  /** Optionnel côté API : défaut = aujourd'hui */
  sale_date?: string;
  quantity_sold: number;
  unit_price?: number | null;
  location_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SaleUpdateInput {
  product_id?: string;
  sale_date?: string;
  quantity_sold?: number;
  unit_price?: number | null;
  location_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SaleListFilters {
  page?: number;
  limit?: number;
  product_id?: string;
  date_from?: string;
  date_to?: string;
  location_id?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SaleSummaryFilters {
  date_from?: string;
  date_to?: string;
  product_id?: string;
  location_id?: string;
  group_by?: 'day' | 'product' | 'location';
}

// === Epic 5 — Scan-to-Recipe (fiches techniques IA) ===

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  tenant_id: string;
  product_id: string | null;
  ingredient_name: string;
  quantity: number;
  unit: string;
  sort_order: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  tenant_id: string;
  name: string;
  category: string | null;
  source: 'manual' | 'scan_ia';
  confidence: 'high' | 'medium' | 'low' | null;
  ai_note: string | null;
  is_active: boolean;
  ingredients: RecipeIngredient[];
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredientInput {
  product_id?: string | null;
  ingredient_name: string;
  quantity: number;
  unit: string;
  sort_order?: number;
}

export interface RecipeCreateInput {
  name: string;
  category?: string;
  source?: 'manual' | 'scan_ia';
  confidence?: 'high' | 'medium' | 'low';
  ai_note?: string;
  ingredients: RecipeIngredientInput[];
}

export interface RecipeUpdateInput {
  name?: string;
  category?: string;
  ai_note?: string;
  ingredients?: RecipeIngredientInput[];
}

export interface ExtractedIngredient {
  nom: string;
  quantite: number;
  unite: string;
}

export interface ExtractedDish {
  nom: string;
  categorie?: string;
  ingredients: ExtractedIngredient[];
  confiance: 'high' | 'medium' | 'low';
  note?: string;
}

export interface MenuExtractionResult {
  plats: ExtractedDish[];
}

export interface ExtractionFeedback {
  id: string;
  tenant_id: string;
  plat_nom: string;
  extraction_ia: ExtractedDish;
  correction_humaine: ExtractedDish;
  created_at: string;
}

export interface ExtractionFeedbackCreateInput {
  plat_nom: string;
  extraction_ia: ExtractedDish;
  correction_humaine: ExtractedDish;
}
