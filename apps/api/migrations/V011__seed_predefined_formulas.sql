-- Migration: V011__seed_predefined_formulas.sql
-- Description: Seed 8 predefined formulas for Epic 3 Story 3.3
-- Author: BMAD Dev Agent
-- Date: 2026-02-06

-- Insert predefined formulas (tenant_id NULL, formula_type 'predefined')
-- Idempotent: only inserts if no predefined formulas exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM formulas WHERE formula_type = 'predefined' AND tenant_id IS NULL) THEN
    INSERT INTO formulas (tenant_id, name, description, formula_type, formula_expression, variables_used, is_active)
    VALUES
      (NULL, 'consommation_moyenne', 'Moyenne des ventes quotidiennes sur une période (ex: 30 jours)', 'predefined', 'VENTES_PERIODE / PERIODE_JOURS', ARRAY['VENTES_PERIODE', 'PERIODE_JOURS'], true),
      (NULL, 'stock_securite', 'Stock de sécurité = CONSOMMATION_MOYENNE * DELAI_LIVRAISON * 1.5', 'predefined', 'CONSOMMATION_MOYENNE * DELAI_LIVRAISON * 1.5', ARRAY['CONSOMMATION_MOYENNE', 'DELAI_LIVRAISON'], true),
      (NULL, 'point_commande', 'Point de commande = STOCK_SECURITE + (CONSOMMATION_MOYENNE * DELAI_LIVRAISON)', 'predefined', 'STOCK_SECURITE + (CONSOMMATION_MOYENNE * DELAI_LIVRAISON)', ARRAY['STOCK_SECURITE', 'CONSOMMATION_MOYENNE', 'DELAI_LIVRAISON'], true),
      (NULL, 'taux_rotation', 'Taux de rotation = VENTES_PERIODE / STOCK_MOYEN', 'predefined', 'VENTES_PERIODE / STOCK_MOYEN', ARRAY['VENTES_PERIODE', 'STOCK_MOYEN'], true),
      (NULL, 'jours_stock_restant', 'Jours de stock restant = STOCK_ACTUEL / CONSOMMATION_QUOTIDIENNE', 'predefined', 'STOCK_ACTUEL / CONSOMMATION_QUOTIDIENNE', ARRAY['STOCK_ACTUEL', 'CONSOMMATION_QUOTIDIENNE'], true),
      (NULL, 'cout_stock_moyen', 'Coût stock moyen = SOMME(quantite * prix_achat) / SOMME(quantite)', 'predefined', 'SOMME(quantite * prix_achat) / SOMME(quantite)', ARRAY['quantite', 'prix_achat'], true),
      (NULL, 'valeur_stock', 'Valeur stock = SOMME(quantite * prix_achat)', 'predefined', 'SOMME(quantite * prix_achat)', ARRAY['quantite', 'prix_achat'], true),
      (NULL, 'marge_beneficiaire', 'Marge bénéficiaire % = (prix_vente - prix_achat) / prix_vente * 100', 'predefined', '(prix_vente - prix_achat) / prix_vente * 100', ARRAY['prix_vente', 'prix_achat'], true);
  END IF;
END
$$;
