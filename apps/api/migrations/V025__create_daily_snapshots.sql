-- Migration: V020__create_daily_snapshots.sql
-- Description: Create daily_snapshots table for ML predictions pipeline (Story 6-1)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

CREATE TABLE IF NOT EXISTS daily_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_start DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_end DECIMAL(10,2) NOT NULL DEFAULT 0,
    sales_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
    losses_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
    deliveries_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_daily_snapshot UNIQUE (tenant_id, date, product_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_tenant ON daily_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_product ON daily_snapshots(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_snapshots(tenant_id, date DESC);

ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON daily_snapshots;
CREATE POLICY tenant_isolation_policy ON daily_snapshots
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE daily_snapshots IS 'Daily aggregated stock/sales data per product for ML pipeline (Story 6-1).';
