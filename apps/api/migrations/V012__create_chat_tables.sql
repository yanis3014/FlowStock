-- Migration: V012__create_chat_tables.sql
-- Description: Create chat tables for Epic 4 Story 4.1 (Chat IA conversationnel avec mémoire contextuelle)
-- Author: BMAD Dev Agent
-- Date: 2026-02-06

-- Table: chat_conversations
-- Stores conversation sessions between users and the AI chat
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for lookups
    CONSTRAINT idx_chat_conversations_tenant_user UNIQUE (tenant_id, user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_tenant_id ON chat_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON chat_conversations(created_at DESC);

-- Table: chat_messages
-- Stores individual messages in conversations (both user and assistant messages)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for lookups
    CONSTRAINT idx_chat_messages_conversation_role_created UNIQUE (conversation_id, role, created_at, id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- Table: chat_context
-- Stores contextual information for conversations (products mentioned, filters, etc.)
-- Used for memory contextuelle - expires after 1 hour by default
CREATE TABLE IF NOT EXISTS chat_context (
    conversation_id UUID PRIMARY KEY REFERENCES chat_conversations(id) ON DELETE CASCADE,
    context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    
    -- conversation_id is already PRIMARY KEY, no extra unique constraint needed
    CONSTRAINT chk_chat_context_expires CHECK (expires_at > '2020-01-01'::timestamptz)
);

CREATE INDEX IF NOT EXISTS idx_chat_context_expires_at ON chat_context(expires_at);

-- Enable Row-Level Security (RLS) on all chat tables and create policies
-- RLS Policy: chat_conversations - tenant isolation
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON chat_conversations;
CREATE POLICY tenant_isolation_policy ON chat_conversations
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- RLS Policy: chat_messages - tenant isolation via conversation
-- Users can only access messages from conversations in their tenant
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON chat_messages;
CREATE POLICY tenant_isolation_policy ON chat_messages
    USING (
        EXISTS (
            SELECT 1 FROM chat_conversations
            WHERE chat_conversations.id = chat_messages.conversation_id
            AND chat_conversations.tenant_id = current_setting('app.current_tenant', true)::UUID
        )
    );

-- RLS Policy: chat_context - tenant isolation via conversation
ALTER TABLE chat_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON chat_context;
CREATE POLICY tenant_isolation_policy ON chat_context
    USING (
        EXISTS (
            SELECT 1 FROM chat_conversations
            WHERE chat_conversations.id = chat_context.conversation_id
            AND chat_conversations.tenant_id = current_setting('app.current_tenant', true)::UUID
        )
    );

-- Function to update updated_at timestamp on chat_conversations
CREATE OR REPLACE FUNCTION update_chat_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at when a message is added
DROP TRIGGER IF EXISTS chat_messages_update_conversation_timestamp ON chat_messages;
CREATE TRIGGER chat_messages_update_conversation_timestamp
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_conversations_updated_at();

-- Comments for documentation
COMMENT ON TABLE chat_conversations IS 'Stores conversation sessions between users and AI chat. Each conversation belongs to a tenant and user.';
COMMENT ON TABLE chat_messages IS 'Stores individual messages in conversations. Role can be "user" or "assistant". Metadata can store additional context like product IDs mentioned.';
COMMENT ON TABLE chat_context IS 'Stores contextual information for conversations (products mentioned, filters, etc.) for memory contextuelle. Expires after 1 hour by default.';
COMMENT ON COLUMN chat_messages.role IS 'Message role: "user" for user messages, "assistant" for AI responses';
COMMENT ON COLUMN chat_messages.metadata IS 'JSONB field for storing additional context like product IDs mentioned, intent detected, etc.';
COMMENT ON COLUMN chat_context.context_data IS 'JSONB field storing structured context: products mentioned, active filters, last query type, etc.';
COMMENT ON COLUMN chat_context.expires_at IS 'Timestamp when context expires. Default: 1 hour from creation. Used for cleanup of stale contexts.';
