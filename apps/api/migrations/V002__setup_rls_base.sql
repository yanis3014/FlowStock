-- Migration: V002__setup_rls_base.sql
-- Description: Setup Row-Level Security (RLS) foundation for multi-tenancy
-- Author: BMAD Dev Agent
-- Date: 2026-01-28

-- Create function to set tenant context (helper for application)
-- This function will be called by the application before queries
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION set_tenant_context(UUID) IS 'Sets the current tenant context for RLS policies. Call this before queries on tenant-scoped tables.';

-- Note: RLS policies will be created for each table with tenant_id in future migrations
-- Template for future RLS policies:
-- ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_policy ON {table_name}
--     USING (tenant_id = current_setting('app.current_tenant')::UUID);
