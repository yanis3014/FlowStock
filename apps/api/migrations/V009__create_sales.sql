-- Migration: V009__create_sales.sql
-- Description: Sales table for historical sales data (Epic 3 - Stories 3.1, 3.2)
-- Author: BMAD Dev Agent
-- Date: 2025-02-05
-- Note: PostgreSQL only for MVP (no TimescaleDB)

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    quantity_sold DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    source VARCHAR(50), -- 'manual', 'csv_import', 'pos_terminal', 'api'
    external_id VARCHAR(255), -- ID from external system (POS, Shopify, etc.)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User who recorded the sale
    CONSTRAINT quantity_sold_positive CHECK (quantity_sold > 0),
    CONSTRAINT sales_prices_non_negative CHECK (
        (unit_price IS NULL OR unit_price >= 0) AND
        (total_amount IS NULL OR total_amount >= 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_date ON sales(tenant_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_product_date ON sales(product_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_location ON sales(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_external ON sales(external_id) WHERE external_id IS NOT NULL;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON sales;
CREATE POLICY tenant_isolation_policy ON sales
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE sales IS 'Historical sales data for ML/AI training and basic calculations (Epic 3).';
COMMENT ON COLUMN sales.source IS 'manual | csv_import | pos_terminal | api';
