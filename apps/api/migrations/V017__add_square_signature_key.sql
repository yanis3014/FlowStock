-- Migration: V017__add_square_signature_key.sql
-- Description: Optional Square webhook signature verification (Story 2.4 code review H1)
-- Square: x-square-hmacsha256-signature = base64(HMAC-SHA256(notification_url + raw_body, signature_key)).

ALTER TABLE tenant_pos_config
  ADD COLUMN IF NOT EXISTS square_signature_key VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS square_notification_url VARCHAR(512) NULL;

COMMENT ON COLUMN tenant_pos_config.square_signature_key IS 'Optional Square Signature Key from Dashboard; when set with square_notification_url, POST /webhooks/pos/square verifies x-square-hmacsha256-signature.';
COMMENT ON COLUMN tenant_pos_config.square_notification_url IS 'Full URL Square calls for this tenant (e.g. https://api.example.com/webhooks/pos/square); required for signature verification.';
