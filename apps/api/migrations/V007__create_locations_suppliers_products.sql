-- Migration: V007__create_locations_suppliers_products.sql
-- Description: Create locations, suppliers, products tables (Story 2.1 CRUD Stocks)
-- Author: BMAD Dev Agent
-- Date: 2026-02-01

-- 1. Locations table (support for product.location_id)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_location_name_per_tenant UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(tenant_id) WHERE is_active = true;

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON locations;
CREATE POLICY tenant_isolation_policy ON locations
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE locations IS 'Warehouses/stores for multi-location inventory (Story 2.3).';

-- 2. Suppliers table (support for product.supplier_id)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_supplier_name_per_tenant UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(tenant_id) WHERE is_active = true;

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON suppliers;
CREATE POLICY tenant_isolation_policy ON suppliers
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE suppliers IS 'Vendors for purchase orders (Story 2.5).';

-- 3. Product unit enum and products table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_unit') THEN
    CREATE TYPE product_unit AS ENUM ('piece', 'kg', 'liter', 'box', 'pack');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit product_unit NOT NULL DEFAULT 'piece',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(10,2) DEFAULT 0,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    lead_time_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sku_per_tenant UNIQUE (tenant_id, sku),
    CONSTRAINT quantity_non_negative CHECK (quantity >= 0),
    CONSTRAINT min_quantity_non_negative CHECK (min_quantity IS NULL OR min_quantity >= 0),
    CONSTRAINT prices_non_negative CHECK (
        (purchase_price IS NULL OR purchase_price >= 0) AND
        (selling_price IS NULL OR selling_price >= 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_location ON products(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(tenant_id)
    WHERE quantity <= min_quantity AND is_active = true;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON products;
CREATE POLICY tenant_isolation_policy ON products
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE products IS 'Core inventory items (Story 2.1 CRUD Stocks).';
