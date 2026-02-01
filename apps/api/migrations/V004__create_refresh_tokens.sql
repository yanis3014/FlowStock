-- Migration: V004__create_refresh_tokens.sql
-- Description: Create refresh_tokens table for JWT refresh token management
-- Author: BMAD Dev Agent
-- Date: 2026-01-28

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(user_id, revoked) WHERE revoked = false;

-- Add comments
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for session management. Tokens can be revoked for logout.';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Set to true when token is revoked (logout or password reset)';
