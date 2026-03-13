-- Migration: V021__create_extraction_feedback.sql
-- Description: Feedback loop for IA menu extraction corrections (Epic 5, Story 5-3)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

CREATE TABLE IF NOT EXISTS extraction_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plat_nom VARCHAR(255) NOT NULL,
    extraction_ia JSONB NOT NULL,
    correction_humaine JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_extraction_feedback_tenant ON extraction_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_extraction_feedback_recent ON extraction_feedback(tenant_id, created_at DESC);

ALTER TABLE extraction_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON extraction_feedback;
CREATE POLICY tenant_isolation_policy ON extraction_feedback
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE extraction_feedback IS 'Corrections humaines des fiches techniques extraites par IA — utilisées pour le few-shot learning (Epic 5, Story 5-3).';
