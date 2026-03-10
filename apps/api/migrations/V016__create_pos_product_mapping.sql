-- Migration: V016__create_pos_product_mapping.sql
-- Description: POS product mapping for adapters (Lightspeed, L'Addition, Square) — Story 2.3
-- Author: BMAD Dev Agent
-- Date: 2026-02-27

CREATE TABLE IF NOT EXISTS pos_product_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pos_type VARCHAR(50) NOT NULL,
    pos_identifier VARCHAR(255) NOT NULL,
    flowstock_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    flowstock_sku VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_pos_identifier UNIQUE (tenant_id, pos_type, pos_identifier),
    CONSTRAINT mapping_must_have_flowstock_ref CHECK (
        flowstock_product_id IS NOT NULL OR (flowstock_sku IS NOT NULL AND flowstock_sku <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_pos_product_mapping_tenant ON pos_product_mapping(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_product_mapping_tenant_type ON pos_product_mapping(tenant_id, pos_type);
CREATE INDEX IF NOT EXISTS idx_pos_product_mapping_lookup ON pos_product_mapping(tenant_id, pos_type, pos_identifier);

ALTER TABLE pos_product_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON pos_product_mapping;
CREATE POLICY tenant_isolation_policy ON pos_product_mapping
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE pos_product_mapping IS 'Mapping POS product identifiers to Flowstock products (Story 2.3). Used by Lightspeed and other POS adapters.';
COMMENT ON COLUMN pos_product_mapping.pos_identifier IS 'POS-side product ID or SKU (e.g. Lightspeed item ID).';
COMMENT ON COLUMN pos_product_mapping.flowstock_product_id IS 'Flowstock product UUID; use when mapping by product_id.';
COMMENT ON COLUMN pos_product_mapping.flowstock_sku IS 'Flowstock product SKU; use when mapping by sku.';
