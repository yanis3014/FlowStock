-- V033__create_feedback.sql
-- Table feedback pour les retours utilisateurs (suggestions, bugs, améliorations)

CREATE TABLE IF NOT EXISTS feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'amelioration')),
  message       TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'lu', 'traite')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id  ON feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status     ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
