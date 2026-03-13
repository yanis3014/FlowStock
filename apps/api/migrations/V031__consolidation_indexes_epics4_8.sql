-- Migration: V031__consolidation_indexes_epics4_8.sql
-- Description: Consolidation indexes and schema fixes for Epics 4-8 integration
-- Author: Integration Agent
-- Date: 2026-03-13

-- Ensure composite (tenant_id, created_at) indexes on high-volume tables
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_created ON invoices(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_tenant_created ON invoice_lines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_created ON stock_movements(tenant_id, created_at DESC);

-- Ensure (tenant_id, created_at) index on daily_snapshots exists
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_tenant_created ON daily_snapshots(tenant_id, created_at DESC);

-- Ensure extraction_feedback has tenant isolation index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'extraction_feedback'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_extraction_feedback_tenant_created ON extraction_feedback(tenant_id, created_at DESC)';
  END IF;
END
$$;

-- Add perte movement_type value if not already present (consolidate epic 6+8)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'perte'
  ) THEN
    ALTER TYPE movement_type ADD VALUE 'perte';
  END IF;
END
$$;

-- Add ajustement movement_type value (spec-required)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'ajustement'
  ) THEN
    ALTER TYPE movement_type ADD VALUE 'ajustement';
  END IF;
END
$$;

COMMENT ON TABLE stock_movements IS 'History of product quantity changes. Types: creation, quantity_update, deletion, import, pos_sale, loss, perte, entree_livraison, livraison, commande_en_cours, ajustement.';
