-- Migration: V008__create_stock_movements.sql
-- Description: Stock movement history for traceability (Story 2.4)
-- Author: BMAD Dev Agent
-- Date: 2026-02-04

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE movement_type AS ENUM ('creation', 'quantity_update', 'deletion', 'import');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type movement_type NOT NULL,
    quantity_before DECIMAL(10,2),
    quantity_after DECIMAL(10,2),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(tenant_id, product_id, created_at DESC);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON stock_movements;
CREATE POLICY tenant_isolation_policy ON stock_movements
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE stock_movements IS 'History of product quantity changes for traceability (Story 2.4).';
