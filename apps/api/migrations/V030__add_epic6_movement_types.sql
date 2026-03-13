-- Migration: V025__add_epic6_movement_types.sql
-- Description: Add perte, livraison, commande_en_cours movement types for Epic 6
-- Author: BMAD Dev Agent
-- Date: 2026-03-13

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'livraison'
  ) THEN
    ALTER TYPE movement_type ADD VALUE 'livraison';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'commande_en_cours'
  ) THEN
    ALTER TYPE movement_type ADD VALUE 'commande_en_cours';
  END IF;
END
$$;

COMMENT ON TYPE movement_type IS 'Stock movement types including Epic 6 types: perte, livraison, commande_en_cours.';
