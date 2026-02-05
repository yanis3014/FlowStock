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
export type MovementType = 'creation' | 'quantity_update' | 'deletion' | 'import';

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
