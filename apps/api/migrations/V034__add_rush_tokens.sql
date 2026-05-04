CREATE TABLE rush_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(100) DEFAULT 'Écran cuisine',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ -- NULL = permanent
);

CREATE INDEX idx_rush_tokens_token ON rush_tokens(token);
CREATE INDEX idx_rush_tokens_tenant ON rush_tokens(tenant_id);

