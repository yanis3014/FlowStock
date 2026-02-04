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
