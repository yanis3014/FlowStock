-- Migration: V020__create_recipes.sql
-- Description: Create recipes and recipe_ingredients tables (Epic 5 - Scan-to-Recipe)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

-- 1. Recipes table (fiches techniques)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    source VARCHAR(50) DEFAULT 'manual',
    confidence VARCHAR(20),
    ai_note TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recipes_source_check CHECK (source IN ('manual', 'scan_ia')),
    CONSTRAINT recipes_confidence_check CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_active ON recipes(tenant_id) WHERE is_active = true;

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON recipes;
CREATE POLICY tenant_isolation_policy ON recipes
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE recipes IS 'Fiches techniques / recettes par plat (Epic 5 - Scan-to-Recipe).';

-- 2. Recipe ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'kg',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recipe_ingredient_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_tenant ON recipe_ingredients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product ON recipe_ingredients(product_id) WHERE product_id IS NOT NULL;

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON recipe_ingredients;
CREATE POLICY tenant_isolation_policy ON recipe_ingredients
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE recipe_ingredients IS 'Ingrédients d''une fiche technique, avec lien optionnel vers le catalogue produits.';
