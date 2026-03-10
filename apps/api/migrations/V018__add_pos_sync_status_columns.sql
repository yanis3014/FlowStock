-- Migration: V018__add_pos_sync_status_columns.sql
-- Description: POS sync status and degraded mode (Story 2.5)
-- Author: BMAD Dev Agent
-- Date: 2026-03-03

-- Extend tenant_pos_config with sync status for degraded mode detection
ALTER TABLE tenant_pos_config
  ADD COLUMN IF NOT EXISTS last_event_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_degraded_since TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS webhook_failure_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_webhook_failure_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN tenant_pos_config.last_event_received_at IS 'Last time a POS webhook event was successfully processed (Story 2.5).';
COMMENT ON COLUMN tenant_pos_config.is_degraded_since IS 'When degraded mode was entered (null = not degraded).';
COMMENT ON COLUMN tenant_pos_config.webhook_failure_count IS 'Consecutive or recent webhook failures (reset on success).';
COMMENT ON COLUMN tenant_pos_config.last_webhook_failure_at IS 'Last webhook failure timestamp.';
