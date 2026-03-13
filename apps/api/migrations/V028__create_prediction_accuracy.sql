-- Migration: V023__create_prediction_accuracy.sql
-- Description: Create prediction_accuracy table for ML monitoring (Story 6-4 & 6-5)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

CREATE TABLE IF NOT EXISTS prediction_accuracy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL,
    predicted_consumption DECIMAL(10,4),
    actual_consumption DECIMAL(10,4),
    accuracy_score DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_prediction_accuracy UNIQUE (tenant_id, product_id, evaluation_date)
);

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_tenant ON prediction_accuracy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_product ON prediction_accuracy(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_date ON prediction_accuracy(tenant_id, evaluation_date DESC);

ALTER TABLE prediction_accuracy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON prediction_accuracy;
CREATE POLICY tenant_isolation_policy ON prediction_accuracy
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE prediction_accuracy IS 'Daily accuracy scores for ML predictions (Story 6-4).';
