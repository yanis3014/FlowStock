-- Migration: V024__create_order_recommendations_and_ai_settings.sql
-- Description: Create order_recommendations table + AI autonomy settings (Stories 6-6, 6-7, 6-8)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

CREATE TABLE IF NOT EXISTS order_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    recommendations JSONB NOT NULL DEFAULT '[]',
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    total_estimated_cost DECIMAL(10,2),
    CONSTRAINT order_recommendations_status_check CHECK (
        status IN ('pending', 'validated', 'rejected', 'auto_executed')
    )
);

CREATE INDEX IF NOT EXISTS idx_order_recommendations_tenant ON order_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_recommendations_status ON order_recommendations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_recommendations_date ON order_recommendations(tenant_id, generated_at DESC);

ALTER TABLE order_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON order_recommendations;
CREATE POLICY tenant_isolation_policy ON order_recommendations
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- AI autonomy settings on tenants table
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS ai_autonomy_level INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS ai_auto_order_threshold DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMENT ON TABLE order_recommendations IS 'GPT-4o generated order recommendations (Story 6-6).';
COMMENT ON COLUMN tenants.ai_autonomy_level IS '1=suggest only, 2=auto order under threshold, 3=full auto (Stories 6-8, 6-9).';
COMMENT ON COLUMN tenants.ai_auto_order_threshold IS 'Amount threshold for auto-ordering at autonomy level 2+ (Story 6-8).';
