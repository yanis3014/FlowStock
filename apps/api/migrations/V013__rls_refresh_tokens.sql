-- Migration: V013__rls_refresh_tokens.sql
-- Description: Enable RLS on refresh_tokens for multi-tenant isolation (Story 1.2)
-- Author: BMAD Dev Agent
-- Date: 2026-02-24
-- Note: refresh_tokens is scoped by user_id; users has tenant_id. Lookup by token uses SECURITY DEFINER.

-- Function for auth: lookup refresh token by token string (no tenant context yet).
-- SECURITY DEFINER so it runs with definer rights and can read the single matching row.
-- Do not extend returned columns without a security review (sensitive auth data).
CREATE OR REPLACE FUNCTION get_refresh_token_info(p_token VARCHAR(500))
RETURNS TABLE(user_id UUID, tenant_id UUID, expires_at TIMESTAMP WITH TIME ZONE, revoked BOOLEAN) AS $$
  SELECT rt.user_id, u.tenant_id, rt.expires_at, rt.revoked
  FROM refresh_tokens rt
  JOIN users u ON u.id = rt.user_id
  WHERE rt.token = p_token AND rt.revoked = false
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_refresh_token_info(VARCHAR) IS 'Auth: lookup refresh token by token string; returns user_id and tenant_id. Bypasses RLS (SECURITY DEFINER).';

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: allow access only to refresh_tokens for users belonging to current tenant
DROP POLICY IF EXISTS tenant_isolation_policy ON refresh_tokens;
CREATE POLICY tenant_isolation_policy ON refresh_tokens
  FOR ALL
  USING (
    (SELECT tenant_id FROM users WHERE id = refresh_tokens.user_id LIMIT 1)
    = current_setting('app.current_tenant', true)::UUID
  )
  WITH CHECK (
    (SELECT tenant_id FROM users WHERE id = refresh_tokens.user_id LIMIT 1)
    = current_setting('app.current_tenant', true)::UUID
  );

COMMENT ON POLICY tenant_isolation_policy ON refresh_tokens IS 'RLS: isolate refresh tokens by tenant via users.tenant_id (Story 1.2).';
