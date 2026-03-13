-- Migration: V020__add_loss_movement_type.sql
-- Description: Add 'loss' to movement_type enum for loss declaration (Epic 8, Story 8.1)
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'loss'
  ) THEN
    ALTER TYPE movement_type ADD VALUE 'loss';
  END IF;
END
$$;

COMMENT ON TYPE movement_type IS 'Stock movement type: creation, quantity_update, deletion, import, pos_sale, loss (Epic 8 Story 8.1).';
