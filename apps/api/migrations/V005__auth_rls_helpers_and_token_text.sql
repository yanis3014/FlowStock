-- Migration: V005__auth_rls_helpers_and_token_text.sql
-- Description: SECURITY DEFINER helpers for auth lookups (bypass RLS) + refresh_tokens.token as TEXT
-- Author: BMAD Code Review fixes
-- Date: 2026-01-29

-- =============================================================================
-- 1. SECURITY DEFINER functions for auth flows (bypass RLS when tenant unknown)
-- =============================================================================

-- Get user row by email for login (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_by_email_for_login(p_email VARCHAR(255))
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role,
  is_active BOOLEAN,
  email_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.tenant_id, u.email, u.password_hash, u.first_name, u.last_name,
         u.role, u.is_active, u.email_verified
  FROM users u
  WHERE u.email = p_email AND u.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_by_email_for_login(VARCHAR) IS 'Auth: get user by email for login (bypasses RLS)';

-- Get tenant_id by user id (for verify-email, reset-password, refresh)
CREATE OR REPLACE FUNCTION get_tenant_id_for_user(p_user_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = p_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_tenant_id_for_user(UUID) IS 'Auth: get tenant_id by user id (bypasses RLS)';

-- Get user id, tenant_id, email for forgot-password (send reset email)
CREATE OR REPLACE FUNCTION get_user_for_password_reset(p_email VARCHAR(255))
RETURNS TABLE (id UUID, tenant_id UUID, email VARCHAR(255)) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.tenant_id, u.email
  FROM users u
  WHERE u.email = p_email AND u.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_for_password_reset(VARCHAR) IS 'Auth: get user id/tenant/email for password reset (bypasses RLS)';

-- Check user active by id (for refresh token flow)
CREATE OR REPLACE FUNCTION get_user_active_and_tenant(p_user_id UUID)
RETURNS TABLE (tenant_id UUID, is_active BOOLEAN) AS $$
  SELECT u.tenant_id, u.is_active FROM users u WHERE u.id = p_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_active_and_tenant(UUID) IS 'Auth: get tenant_id and is_active by user id (bypasses RLS)';

-- =============================================================================
-- 2. refresh_tokens.token: VARCHAR(500) -> TEXT (JWT can exceed 500 chars)
-- =============================================================================
ALTER TABLE refresh_tokens ALTER COLUMN token TYPE TEXT;
