-- Square OAuth (Connect) : états CSRF et stockage tokens chiffrés côté serveur
-- Author: BMAD
-- Date: 2026-03-21

CREATE TABLE IF NOT EXISTS square_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_token VARCHAR(128) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_square_oauth_states_expires ON square_oauth_states(expires_at);

COMMENT ON TABLE square_oauth_states IS 'Jetons state OAuth Square (usage unique, TTL court) ; associés à tenant_id pour le callback sans JWT.';

ALTER TABLE tenant_pos_config
  ADD COLUMN IF NOT EXISTS square_merchant_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS square_access_token_encrypted TEXT NULL,
  ADD COLUMN IF NOT EXISTS square_refresh_token_encrypted TEXT NULL,
  ADD COLUMN IF NOT EXISTS square_token_expires_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN tenant_pos_config.square_merchant_id IS 'Merchant ID Square après OAuth Connect.';
COMMENT ON COLUMN tenant_pos_config.square_access_token_encrypted IS 'AES-GCM ciphertext (iv+tag+payload), jamais en clair.';
COMMENT ON COLUMN tenant_pos_config.square_refresh_token_encrypted IS 'Refresh token OAuth Square chiffré.';
COMMENT ON COLUMN tenant_pos_config.square_token_expires_at IS 'Expiration du access token Square.';
