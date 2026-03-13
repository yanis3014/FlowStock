-- Migration V020: Create alert_reads table for Story 4.4 (Alertes visuelles)
-- Stores which dynamically-generated alert IDs have been marked as read by users.
-- Alert IDs are stable: alert_{product_id}_{type} (e.g. alert_uuid_critical)

CREATE TABLE IF NOT EXISTS alert_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, alert_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_reads_tenant_user ON alert_reads(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_alert_reads_alert_id ON alert_reads(tenant_id, alert_id);

-- RLS: each user can only see their own reads; tenants are isolated
ALTER TABLE alert_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_reads_tenant_isolation ON alert_reads
  USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
