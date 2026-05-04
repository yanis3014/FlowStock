-- =============================================================
-- FLOWSTOCK — DEMO SEED DATA
-- Tenant : Le Comptoir des Saveurs
-- User   : demo@flowstock.io / Demo123!
-- =============================================================

BEGIN;

-- ─── 1. TENANT ───────────────────────────────────────────────
INSERT INTO tenants (id, company_name, slug, industry, is_active)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Le Comptoir des Saveurs',
  'comptoir-des-saveurs',
  'restaurant',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Set RLS context for all subsequent inserts
SELECT set_tenant_context('aaaaaaaa-0000-0000-0000-000000000001'::uuid);

-- ─── 2. USER ─────────────────────────────────────────────────
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'demo@flowstock.io',
  '$2b$12$MgZYRmt/7pm7VCvxE4ad9e/oPGgbH5ih/huZzopcCyaTTdHrX6PYG',
  'Sophie',
  'Durand',
  'owner',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. SUBSCRIPTION ─────────────────────────────────────────
INSERT INTO subscriptions (tenant_id, tier, status, trial_ends_at)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'premium',
  'active',
  NULL
)
ON CONFLICT (tenant_id) DO UPDATE SET tier = 'premium', status = 'active';

-- ─── 4. FOURNISSEURS ─────────────────────────────────────────
INSERT INTO suppliers (id, tenant_id, name, contact_name, email, phone, address, notes, is_active) VALUES
  ('cccc0001-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Métro Cash & Carry', 'Jean-Paul Moreau', 'jp.moreau@metro.fr', '04 93 12 34 56',
   'Zone Industrielle, 06200 Nice', 'Livraison mardi et vendredi matin', true),

  ('cccc0002-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Cave Dupont', 'Marie Dupont', 'contact@cave-dupont.fr', '04 93 98 76 54',
   '12 Rue de la Libération, 06300 Nice', 'Vins et spiritueux, commande min 6 bouteilles', true),

  ('cccc0003-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Boucherie Martin', 'Pierre Martin', 'pierre@boucherie-martin.fr', '06 12 34 56 78',
   'Marché du Cours Saleya, Nice', 'Viandes premium, livraison quotidienne 7h', true),

  ('cccc0004-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Primeurs Côte d''Azur', 'Fatima Benali', 'f.benali@primeurs-ca.fr', '04 93 55 44 33',
   'MIN de Nice, 06200 Nice', 'Fruits et légumes frais, livraison lundi/mercredi/vendredi', true);

-- ─── 5. EMPLACEMENTS ─────────────────────────────────────────
INSERT INTO locations (id, tenant_id, name, location_type, is_active) VALUES
  ('dddd0001-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Cuisine principale', 'kitchen', true),
  ('dddd0002-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Bar', 'bar', true),
  ('dddd0003-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Cave à vins', 'storage', true),
  ('dddd0004-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Réserve sèche', 'storage', true);

-- ─── 6. PRODUITS ─────────────────────────────────────────────
-- Statuts variés : critique (qty < min), faible (qty ~ min), ok
INSERT INTO products (id, tenant_id, sku, name, description, unit, quantity, min_quantity, location_id, supplier_id, purchase_price, selling_price, lead_time_days, is_active) VALUES

  -- CRITIQUE (qty < min_quantity)
  ('eeee0001-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'BRE-001', 'Beurre AOP 500g', 'Beurre de qualité supérieure pour pâtisserie et cuisine',
   'piece', 3, 10, 'dddd0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   1.80, NULL, 2, true),

  ('eeee0002-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'VIF-001', 'Viande de bœuf haché 1kg', 'Bœuf haché frais 15% MG',
   'kg', 1.5, 5, 'dddd0001-0000-0000-0000-000000000001', 'cccc0003-0000-0000-0000-000000000001',
   12.50, NULL, 1, true),

  ('eeee0003-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'CRF-001', 'Crème fraîche 30cl', 'Crème fraîche épaisse 30% MG',
   'piece', 4, 12, 'dddd0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   0.95, NULL, 2, true),

  -- FAIBLE (qty juste au-dessus de min)
  ('eeee0004-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'FAR-001', 'Farine T55 5kg', 'Farine de blé tout usage',
   'piece', 6, 5, 'dddd0004-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   3.20, NULL, 3, true),

  ('eeee0005-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'OEU-001', 'Œufs frais calibre M (boîte 12)', 'Œufs de poules élevées en plein air',
   'box', 5, 4, 'dddd0001-0000-0000-0000-000000000001', 'cccc0004-0000-0000-0000-000000000001',
   3.60, NULL, 1, true),

  ('eeee0006-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'TOM-001', 'Tomates cerises 500g', 'Tomates cerises de saison',
   'piece', 8, 6, 'dddd0001-0000-0000-0000-000000000001', 'cccc0004-0000-0000-0000-000000000001',
   2.40, NULL, 1, true),

  ('eeee0007-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'VIN-ROU-001', 'Côtes de Provence Rouge 75cl', 'Cuvée domaine local, rouge structuré',
   'piece', 12, 10, 'dddd0003-0000-0000-0000-000000000001', 'cccc0002-0000-0000-0000-000000000001',
   6.50, 24.00, 5, true),

  -- OK (stock confortable)
  ('eeee0008-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'HUI-001', 'Huile d''olive extra vierge 5L', 'Huile AOC première pression à froid',
   'piece', 8, 2, 'dddd0004-0000-0000-0000-000000000001', 'cccc0004-0000-0000-0000-000000000001',
   18.90, NULL, 5, true),

  ('eeee0009-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'PAT-001', 'Pâtes linguine 5kg', 'Pâtes sèches qualité trattoria',
   'piece', 15, 4, 'dddd0004-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   7.80, NULL, 3, true),

  ('eeee0010-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'RIZ-001', 'Riz arborio 5kg', 'Riz pour risotto',
   'piece', 10, 3, 'dddd0004-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   9.50, NULL, 3, true),

  ('eeee0011-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'VIN-BLA-001', 'Chablis Premier Cru 75cl', 'Vin blanc de Bourgogne',
   'piece', 24, 6, 'dddd0003-0000-0000-0000-000000000001', 'cccc0002-0000-0000-0000-000000000001',
   14.00, 38.00, 7, true),

  ('eeee0012-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'CHA-001', 'Champagne Brut 75cl', 'Champagne maison pour apéritifs',
   'piece', 18, 6, 'dddd0003-0000-0000-0000-000000000001', 'cccc0002-0000-0000-0000-000000000001',
   22.00, 65.00, 7, true),

  ('eeee0013-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'SAU-001', 'Saumon fumé 200g', 'Saumon d''Écosse fumé à froid',
   'piece', 20, 8, 'dddd0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   5.80, NULL, 2, true),

  ('eeee0014-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'AGN-001', 'Gigot d''agneau 2kg', 'Agneau de lait des Pyrénées',
   'kg', 6, 4, 'dddd0001-0000-0000-0000-000000000001', 'cccc0003-0000-0000-0000-000000000001',
   18.00, NULL, 1, true),

  ('eeee0015-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'CHO-001', 'Chocolat noir Valrhona 70% 1kg', 'Couverture professionnelle pâtisserie',
   'piece', 7, 2, 'dddd0004-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   16.50, NULL, 4, true),

  ('eeee0016-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'CAF-001', 'Café en grains 1kg', 'Mélange arabica/robusta torréfaction artisanale',
   'piece', 12, 3, 'dddd0004-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   12.90, NULL, 3, true),

  ('eeee0017-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'SRV-001', 'Serviettes en lin (paquet 50)', 'Serviettes de table blanches',
   'pack', 30, 5, 'dddd0004-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   8.50, NULL, 7, true),

  ('eeee0018-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'EAU-001', 'Eau minérale Evian 6x1.5L', 'Eau plate en bouteilles',
   'pack', 40, 10, 'dddd0002-0000-0000-0000-000000000001', 'cccc0002-0000-0000-0000-000000000001',
   4.20, 18.00, 2, true),

  ('eeee0019-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'POI-001', 'Filet de dorade 1kg', 'Dorade royale fraîche de Méditerranée',
   'kg', 4, 2, 'dddd0001-0000-0000-0000-000000000001', 'cccc0003-0000-0000-0000-000000000001',
   16.00, NULL, 1, true),

  ('eeee0020-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'SUC-001', 'Sucre semoule 5kg', 'Sucre blanc pour pâtisserie',
   'piece', 9, 2, 'dddd0004-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001',
   4.10, NULL, 3, true);

-- ─── 7. MOUVEMENTS DE STOCK (45 jours d'historique) ──────────
-- Créations initiales (J-45)
INSERT INTO stock_movements (id, tenant_id, product_id, movement_type, quantity_before, quantity_after, reason, created_at) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', 'creation', 0, 24, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001', 'creation', 0, 15, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0003-0000-0000-0000-000000000001', 'creation', 0, 30, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0004-0000-0000-0000-000000000001', 'creation', 0, 20, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0005-0000-0000-0000-000000000001', 'creation', 0, 24, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0006-0000-0000-0000-000000000001', 'creation', 0, 18, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', 'creation', 0, 48, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0008-0000-0000-0000-000000000001', 'creation', 0, 12, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0009-0000-0000-0000-000000000001', 'creation', 0, 30, 'Stock initial ouverture', NOW() - INTERVAL '45 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0010-0000-0000-0000-000000000001', 'creation', 0, 20, 'Stock initial ouverture', NOW() - INTERVAL '45 days');

-- Livraisons (J-30)
INSERT INTO stock_movements (id, tenant_id, product_id, movement_type, quantity_before, quantity_after, reason, created_at) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', 'livraison', 14, 26, 'Livraison Métro — bon de livraison #BL2026-0312', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001', 'livraison', 8, 18, 'Livraison Boucherie Martin', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', 'livraison', 22, 48, 'Livraison Cave Dupont — commande mensuelle vins', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', 'livraison', 10, 36, 'Livraison Cave Dupont — Chablis', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', 'livraison', 6, 24, 'Livraison Cave Dupont — Champagne', NOW() - INTERVAL '30 days');

-- Livraisons (J-15)
INSERT INTO stock_movements (id, tenant_id, product_id, movement_type, quantity_before, quantity_after, reason, created_at) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0003-0000-0000-0000-000000000001', 'livraison', 10, 22, 'Livraison Métro — crème fraîche', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0004-0000-0000-0000-000000000001', 'livraison', 9, 20, 'Livraison Métro — farine', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', 'livraison', 8, 28, 'Livraison Métro — saumon fumé', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0014-0000-0000-0000-000000000001', 'livraison', 2, 10, 'Livraison Boucherie Martin — gigots', NOW() - INTERVAL '15 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0019-0000-0000-0000-000000000001', 'livraison', 1, 8, 'Livraison Boucherie Martin — dorades', NOW() - INTERVAL '15 days');

-- Pertes (J-10)
INSERT INTO stock_movements (id, tenant_id, product_id, movement_type, quantity_before, quantity_after, reason, created_at) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0006-0000-0000-0000-000000000001', 'perte', 16, 14, 'Tomates abîmées — lot non conforme à réception', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001', 'perte', 12, 10, 'Bœuf haché — DLC dépassée (non détecté à temps)', NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0003-0000-0000-0000-000000000001', 'perte', 18, 16, 'Crème fraîche ouverte non consommée', NOW() - INTERVAL '8 days');

-- Consommation quotidienne récente (J-7 à J-1) — simulée comme pos_sale
INSERT INTO stock_movements (id, tenant_id, product_id, movement_type, quantity_before, quantity_after, reason, created_at) VALUES
  -- J-7
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', 'pos_sale', 22, 19, 'Service du soir — tartes tatin', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0009-0000-0000-0000-000000000001', 'pos_sale', 25, 23, 'Service du midi — pasta', NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', 'pos_sale', 42, 38, 'Ventes vins rouge service complet', NOW() - INTERVAL '7 days'),
  -- J-6
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', 'pos_sale', 19, 16, 'Service du soir — crêpes + tarte', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0003-0000-0000-0000-000000000001', 'pos_sale', 16, 13, 'Service — sauces et gratins', NOW() - INTERVAL '6 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', 'pos_sale', 24, 21, 'Entrées saumon fumé — service complet', NOW() - INTERVAL '6 days'),
  -- J-5
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001', 'pos_sale', 10, 7, 'Burgers maison — service midi + soir', NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', 'pos_sale', 30, 27, 'Ventes Chablis — service complet', NOW() - INTERVAL '5 days'),
  -- J-4
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', 'pos_sale', 16, 12, 'Weekend — pâtisseries du chef', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0014-0000-0000-0000-000000000001', 'pos_sale', 8, 7, 'Plat du weekend — gigot d''agneau', NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', 'pos_sale', 20, 18, 'Champagne — apéritifs groupe', NOW() - INTERVAL '4 days'),
  -- J-3
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0003-0000-0000-0000-000000000001', 'pos_sale', 13, 10, 'Service lundi — crèmes et velouté', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0009-0000-0000-0000-000000000001', 'pos_sale', 23, 20, 'Service lundi — pasta al dente', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0019-0000-0000-0000-000000000001', 'pos_sale', 7, 6, 'Dorade en papillote — service midi', NOW() - INTERVAL '3 days'),
  -- J-2
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001', 'pos_sale', 7, 5, 'Service mardi — tartare et burger', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0004-0000-0000-0000-000000000001', 'pos_sale', 14, 10, 'Pains maison et pâtisserie', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', 'pos_sale', 38, 32, 'Ventes vins rouge mardi soir', NOW() - INTERVAL '2 days'),
  -- J-1 (hier)
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', 'pos_sale', 12, 8, 'Hier soir — tarte tatin et fondants', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0003-0000-0000-0000-000000000001', 'pos_sale', 10, 7, 'Hier — sauces crémées', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0002-0000-0000-0000-000000000001', 'pos_sale', 5, 3, 'Hier soir — viande service complet', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', 'pos_sale', 27, 24, 'Hier — Chablis service dîner', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', 'pos_sale', 21, 18, 'Hier — saumon entrée', NOW() - INTERVAL '1 day');

-- Ajustement inventaire (J-2)
INSERT INTO stock_movements (id, tenant_id, product_id, movement_type, quantity_before, quantity_after, reason, created_at) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0005-0000-0000-0000-000000000001', 'ajustement', 8, 5, 'Inventaire physique — écart constaté', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0016-0000-0000-0000-000000000001', 'ajustement', 14, 12, 'Inventaire physique — café comptoir', NOW() - INTERVAL '2 days');

-- ─── 8. VENTES (30 jours) ────────────────────────────────────
-- Génération des ventes sur 30 jours pour les produits principaux
INSERT INTO sales (id, tenant_id, product_id, sale_date, quantity_sold, unit_price, total_amount, location_id, source) VALUES
  -- Beurre (eeee0001)
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days', 2, 1.80, 3.60, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '28 days', 3, 1.80, 5.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days', 2, 1.80, 3.60, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '21 days', 4, 1.80, 7.20, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '18 days', 3, 1.80, 5.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', 3, 1.80, 5.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '10 days', 4, 1.80, 7.20, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days', 3, 1.80, 5.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days', 4, 1.80, 7.20, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 4, 1.80, 7.20, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  -- Vins rouges (eeee0007)
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '29 days', 4, 24.00, 96.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '26 days', 6, 24.00, 144.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '22 days', 5, 24.00, 120.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '17 days', 8, 24.00, 192.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '12 days', 6, 24.00, 144.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days', 6, 24.00, 144.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days', 4, 24.00, 96.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days', 6, 24.00, 144.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0007-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 5, 24.00, 120.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  -- Champagne (eeee0012)
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', NOW() - INTERVAL '27 days', 3, 65.00, 195.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days', 4, 65.00, 260.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', NOW() - INTERVAL '13 days', 2, 65.00, 130.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', NOW() - INTERVAL '6 days', 3, 65.00, 195.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days', 2, 65.00, 130.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0012-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 2, 65.00, 130.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  -- Chablis (eeee0011)
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', NOW() - INTERVAL '28 days', 3, 38.00, 114.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', NOW() - INTERVAL '21 days', 4, 38.00, 152.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', 3, 38.00, 114.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days', 3, 38.00, 114.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days', 2, 38.00, 76.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days', 3, 38.00, 114.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0011-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 3, 38.00, 114.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  -- Saumon fumé (eeee0013)
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', NOW() - INTERVAL '27 days', 3, 5.80, 17.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', NOW() - INTERVAL '20 days', 4, 5.80, 23.20, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', 4, 5.80, 23.20, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days', 3, 5.80, 17.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days', 3, 5.80, 17.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0013-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 3, 5.80, 17.40, 'dddd0001-0000-0000-0000-000000000001', 'manual'),
  -- Eau minérale (eeee0018)
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0018-0000-0000-0000-000000000001', NOW() - INTERVAL '29 days', 4, 18.00, 72.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0018-0000-0000-0000-000000000001', NOW() - INTERVAL '22 days', 5, 18.00, 90.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0018-0000-0000-0000-000000000001', NOW() - INTERVAL '15 days', 6, 18.00, 108.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0018-0000-0000-0000-000000000001', NOW() - INTERVAL '8 days', 5, 18.00, 90.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0018-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days', 4, 18.00, 72.00, 'dddd0002-0000-0000-0000-000000000001', 'manual'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'eeee0018-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', 3, 18.00, 54.00, 'dddd0002-0000-0000-0000-000000000001', 'manual');

-- ─── 9. ONBOARDING COMPLET ───────────────────────────────────
UPDATE tenants
SET onboarding_completed = true
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

COMMIT;

-- Vérification rapide
SELECT
  (SELECT COUNT(*) FROM products WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001') AS produits,
  (SELECT COUNT(*) FROM suppliers WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001') AS fournisseurs,
  (SELECT COUNT(*) FROM locations WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001') AS emplacements,
  (SELECT COUNT(*) FROM stock_movements WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001') AS mouvements,
  (SELECT COUNT(*) FROM sales WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001') AS ventes;
