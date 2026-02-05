-- Migration: V010__create_formulas.sql
-- Description: Formulas table for predefined and custom calculations (Epic 3 - Stories 3.3, 3.4)
-- Author: BMAD Dev Agent
-- Date: 2025-02-05

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'formula_type') THEN
    CREATE TYPE formula_type AS ENUM ('predefined', 'custom');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS formulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for predefined formulas
    name VARCHAR(255) NOT NULL,
    description TEXT,
    formula_type formula_type NOT NULL DEFAULT 'custom',
    formula_expression TEXT NOT NULL,
    variables_used TEXT[] DEFAULT '{}', -- Array of variable names used (e.g. STOCK_ACTUEL, VENTES_7J)
    is_active BOOLEAN DEFAULT true,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_formula_name_per_tenant UNIQUE (tenant_id, name),
    CONSTRAINT predefined_formulas_no_tenant CHECK (
        (formula_type = 'predefined' AND tenant_id IS NULL) OR
        (formula_type = 'custom' AND tenant_id IS NOT NULL)
    )
);

-- Partial unique index: predefined formulas (tenant_id NULL) must have unique names
CREATE UNIQUE INDEX IF NOT EXISTS idx_formulas_predefined_name ON formulas (name) WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_formulas_tenant ON formulas(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formulas_type ON formulas(formula_type);
CREATE INDEX IF NOT EXISTS idx_formulas_active ON formulas(is_active) WHERE is_active = true;

ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON formulas;
CREATE POLICY tenant_isolation_policy ON formulas
    USING (
        tenant_id IS NULL OR -- Predefined formulas visible to all tenants
        tenant_id = current_setting('app.current_tenant', true)::UUID
    );

COMMENT ON TABLE formulas IS 'Predefined and custom calculation formulas (Epic 3 - Stories 3.3, 3.4).';
COMMENT ON COLUMN formulas.formula_type IS 'predefined = shared system formulas, custom = user-created per tenant';
