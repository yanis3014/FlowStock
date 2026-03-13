-- Migration: V021__create_product_analytics.sql
-- Description: Create product_analytics table for trend analysis (Story 6-2)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

CREATE TABLE IF NOT EXISTS product_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    avg_7d DECIMAL(10,4),
    avg_30d DECIMAL(10,4),
    coeff_variation DECIMAL(10,4),
    weekday_seasonality JSONB DEFAULT '{}',
    trend_direction VARCHAR(20) DEFAULT 'stable',
    anomaly_count INTEGER DEFAULT 0,
    gpt_analysis JSONB,
    CONSTRAINT unique_product_analytics UNIQUE (tenant_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_tenant ON product_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics(tenant_id, product_id);

ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON product_analytics;
CREATE POLICY tenant_isolation_policy ON product_analytics
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE product_analytics IS 'Rolling averages, seasonality and trend metrics per product (Story 6-2).';
