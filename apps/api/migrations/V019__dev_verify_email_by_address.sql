-- Migration: V019__dev_verify_email_by_address.sql
-- Description: SECURITY DEFINER function to verify email by address (dev/scripts only)
-- Usage: SELECT dev_verify_email_by_address('demo@flowstock.local');

CREATE OR REPLACE FUNCTION dev_verify_email_by_address(p_email VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
  updated INTEGER;
BEGIN
  UPDATE users
  SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP
  WHERE email = p_email AND is_active = true;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION dev_verify_email_by_address(VARCHAR) IS 'Dev/scripts: mark email as verified by address. Bypasses RLS.';
