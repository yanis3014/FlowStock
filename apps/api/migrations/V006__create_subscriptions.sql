-- Migration: V006__create_subscriptions.sql
-- Description: Create subscriptions table and subscription_changes audit (Story 1.4)
-- Author: BMAD Dev Agent
-- Date: 2026-02-01

-- Create subscription_tier enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('normal', 'premium', 'premium_plus');
  END IF;
END
$$;

-- Create subscription_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trial');
  END IF;
END
$$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'normal',
    status subscription_status NOT NULL DEFAULT 'trial',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    price_monthly DECIMAL(10,2),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT one_subscription_per_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON subscriptions;
CREATE POLICY tenant_isolation_policy ON subscriptions
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE subscriptions IS 'Subscription tiers (Normal, Premium, Premium Plus) per tenant. One row per tenant.';

-- Audit table for subscription tier changes
CREATE TABLE IF NOT EXISTS subscription_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    old_tier subscription_tier,
    new_tier subscription_tier NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changed_by_user_id UUID REFERENCES users(id),
    CONSTRAINT subscription_changes_sub_fk FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_changes_tenant ON subscription_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_changed_at ON subscription_changes(changed_at);

-- RLS on subscription_changes
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON subscription_changes;
CREATE POLICY tenant_isolation_policy ON subscription_changes
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

COMMENT ON TABLE subscription_changes IS 'Audit log of subscription tier changes (upgrade/downgrade).';
