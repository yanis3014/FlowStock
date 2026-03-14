-- Migration V032 : onboarding support
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS type_cuisine VARCHAR(100);

COMMENT ON COLUMN tenants.onboarding_completed
  IS 'true once all mandatory onboarding steps are completed';
COMMENT ON COLUMN tenants.type_cuisine
  IS 'Denormalized from settings.onboarding.profil.type_cuisine for server-side use';
