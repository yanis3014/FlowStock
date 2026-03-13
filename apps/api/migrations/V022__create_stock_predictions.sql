-- Migration: V022__create_stock_predictions.sql
-- Description: Create stock_predictions table for rupture predictions (Story 6-3)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

CREATE TABLE IF NOT EXISTS stock_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    days_until_stockout INTEGER,
    confidence_score DECIMAL(5,4),
    predicted_stockout_date DATE,
    alert_level VARCHAR(20) DEFAULT 'ok',
    prediction_method VARCHAR(20) DEFAULT 'fallback',
    gpt_reasoning TEXT,
    CONSTRAINT unique_stock_prediction UNIQUE (tenant_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_predictions_tenant ON stock_predictions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_predictions_alert ON stock_predictions(tenant_id, alert_level)
    WHERE alert_level != 'ok';
CREATE INDEX IF NOT EXISTS idx_stock_predictions_product ON stock_predictions(tenant_id, product_id);

ALTER TABLE stock_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON stock_predictions;
CREATE POLICY tenant_isolation_policy ON stock_predictions
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE stock_predictions IS 'GPT-4o stock rupture predictions per product (Story 6-3).';
