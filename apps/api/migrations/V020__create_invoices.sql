-- Migration: V020__create_invoices.sql
-- Description: Create invoices and invoice_lines tables for Epic 7 (facture OCR)
-- Also adds 'entree_livraison' to movement_type enum

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'movement_type' AND e.enumlabel = 'entree_livraison'
  ) THEN
    ALTER TYPE movement_type ADD VALUE 'entree_livraison';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  invoice_date DATE,
  file_name TEXT,
  file_data TEXT,
  file_mime TEXT,
  total_ht NUMERIC(14, 2),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'traitee', 'erreur')),
  ocr_raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  designation TEXT NOT NULL,
  quantite NUMERIC(14, 3) NOT NULL DEFAULT 0,
  unite TEXT,
  prix_unitaire_ht NUMERIC(14, 2),
  montant_ht NUMERIC(14, 2),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
CREATE POLICY tenant_isolation_invoices ON invoices
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation_invoice_lines ON invoice_lines;
CREATE POLICY tenant_isolation_invoice_lines ON invoice_lines
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_tenant_id ON invoice_lines(tenant_id);
