-- Migration: V001__create_tenants.sql
-- Description: Create tenants table for multi-tenancy foundation
-- Author: BMAD Dev Agent
-- Date: 2026-01-28

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    industry VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active) WHERE is_active = true;

-- Add comment to table
COMMENT ON TABLE tenants IS 'Foundation table for multi-tenancy. Represents each company/organization.';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier (e.g., cafe-paris-15)';
COMMENT ON COLUMN tenants.settings IS 'Flexible JSONB for tenant-specific configuration (timezone, currency, etc.)';
