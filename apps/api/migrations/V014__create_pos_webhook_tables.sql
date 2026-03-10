-- Migration: V014__create_pos_webhook_tables.sql
-- Description: POS webhook config per tenant and idempotence store (Story 2.1)
-- Author: BMAD Dev Agent
-- Date: 2026-02-25

-- 1. Tenant POS config: webhook secret and type per tenant (one row per tenant for MVP)
CREATE TABLE IF NOT EXISTS tenant_pos_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pos_type VARCHAR(50) NOT NULL DEFAULT 'lightspeed',
    webhook_secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_pos_config UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_pos_config_tenant ON tenant_pos_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_pos_config_active ON tenant_pos_config(tenant_id) WHERE is_active = true;

COMMENT ON TABLE tenant_pos_config IS 'POS webhook configuration per tenant (Story 2.1). Used to validate incoming webhooks (X-Tenant-Id + Bearer webhook_secret).';
COMMENT ON COLUMN tenant_pos_config.pos_type IS 'lightspeed, laddition, square, or manual';
COMMENT ON COLUMN tenant_pos_config.webhook_secret IS 'Secret used to validate webhook requests (e.g. Bearer token or HMAC key).';

-- 2. Idempotence: events already received (tenant_id + external_id) to avoid double processing
CREATE TABLE IF NOT EXISTS pos_events_received (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_external_id UNIQUE (tenant_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_events_received_tenant ON pos_events_received(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_events_received_received_at ON pos_events_received(received_at);

ALTER TABLE pos_events_received ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON pos_events_received;
CREATE POLICY tenant_isolation_policy ON pos_events_received
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE pos_events_received IS 'Idempotence store for POS webhook events (Story 2.1). Retain 7 days recommended; cleanup can be added later.';
