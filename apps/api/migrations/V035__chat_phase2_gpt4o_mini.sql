-- Migration: V035__chat_phase2_gpt4o_mini.sql
-- Description: Chat Phase 2 (GPT-4o-mini) - title column + indexes alignment
-- Author: BMAD Dev Agent
-- Date: 2026-03-18
--
-- NOTE:
-- Base chat tables already exist in V012__create_chat_tables.sql.
-- This migration is additive and must not break existing Phase 1/legacy chat.

-- 1) Add optional title to conversations (requested by Phase 2 spec)
ALTER TABLE IF EXISTS chat_conversations
  ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- 2) Ensure indexes requested by Phase 2 spec exist (names may differ from V012)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_tenant
  ON chat_conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created
  ON chat_messages(created_at);

