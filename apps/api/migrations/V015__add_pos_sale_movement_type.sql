-- Migration: V015__add_pos_sale_movement_type.sql
-- Description: Add 'pos_sale' to movement_type enum for POS sale traceability (Story 2.2)
-- Author: BMAD Dev Agent
-- Date: 2026-02-26

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'pos_sale'
  ) THEN
    ALTER TYPE movement_type ADD VALUE 'pos_sale';
  END IF;
END
$$;

COMMENT ON TYPE movement_type IS 'Stock movement type: creation, quantity_update, deletion, import, pos_sale (Story 2.2).';
