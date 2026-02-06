# Story 3.1: Saisie Manuelle Ventes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,  
I want **saisir manuellement mes ventes quotidiennes**,  
so that **je peux alimenter le système avec mes données de ventes**.

## Acceptance Criteria

**Given** je suis un utilisateur authentifié  
**When** je saisis une vente  
**Then** je peux saisir la date, le produit, la quantité vendue, et le prix de vente (optionnel)  
**And** la validation des données fonctionne (produit existe, quantité > 0, date valide)  
**And** la vente est enregistrée en base de données time-series  
**And** je peux voir la liste des ventes récentes avec possibilité de modification/suppression  
**And** le calcul automatique des ventes totales par jour/produit fonctionne  
**And** les tests unitaires pour la logique de saisie sont passants

## Tasks / Subtasks

- [x] Task 1: API CRUD Ventes (AC: créer, modifier, supprimer, date, produit, quantité, prix)
  - [x] 1.1 GET /sales → liste des ventes du tenant (pagination, filtres: product_id, date_from, date_to, location_id)
  - [x] 1.2 GET /sales/:id → détail d'une vente (404 si autre tenant ou inexistant)
  - [x] 1.3 POST /sales → créer (body: product_id, sale_date, quantity_sold, unit_price?, location_id?, metadata?); validation product_id existe, quantity_sold > 0, sale_date valide; calcul total_amount = quantity_sold * unit_price si unit_price fourni
  - [x] 1.4 PUT /sales/:id → modifier (product_id, sale_date, quantity_sold, unit_price, location_id, metadata); recalcul total_amount si unit_price modifié
  - [x] 1.5 DELETE /sales/:id → suppression (hard delete acceptable pour ventes, pas de soft delete nécessaire)
  - [x] 1.6 Toutes les routes protégées par authenticateToken, tenant_id depuis req.user.tenantId, RLS via queryWithTenant

- [x] Task 2: Calculs automatiques ventes totales (AC: calcul ventes totales par jour/produit)
  - [x] 2.1 GET /sales/summary → agrégations (ventes totales par jour, par produit, par période); filtres: date_from, date_to, product_id, group_by (day, product, location)
  - [x] 2.2 Calcul côté DB avec GROUP BY et SUM pour performance
  - [x] 2.3 Endpoint optionnel GET /sales/stats → statistiques rapides (ventes aujourd'hui, hier, cette semaine, ce mois)

- [x] Task 3: Interface utilisateur (AC: liste ventes récentes, modification/suppression)
  - [x] 3.1 Page ou section "Ventes" : liste des ventes récentes (date, produit, quantité, prix, total, emplacement) avec pagination
  - [x] 3.2 Formulaire création/édition vente : sélection produit (dropdown avec recherche), date (date picker, défaut aujourd'hui), quantité (number input > 0), prix unitaire (number input optionnel), emplacement (dropdown optionnel)
  - [x] 3.3 Calcul automatique total = quantité × prix unitaire dans le formulaire (affichage en temps réel)
  - [x] 3.4 Actions sur chaque ligne : modifier, supprimer (avec confirmation)
  - [x] 3.5 Filtres : par produit, par date (date_from, date_to), par emplacement
  - [x] 3.6 Affichage statistiques rapides : total ventes aujourd'hui, hier, cette semaine

- [x] Task 4: Validation des données (AC: produit existe, quantité > 0, date valide)
  - [x] 4.1 Validation côté API : product_id requis et existe pour ce tenant (404 si inexistant), quantity_sold > 0 (CHECK constraint DB + validation API), sale_date valide (ISO8601 ou Date), unit_price >= 0 si fourni
  - [x] 4.2 Messages d'erreur clairs (400/404) pour l'interface
  - [x] 4.3 Validation frontend en temps réel (produit sélectionné, quantité > 0, date valide)

- [x] Task 5: Tests (AC: tests unitaires logique de saisie, tests intégration CRUD)
  - [x] 5.1 Tests unitaires sales.service (list, get, create, update, delete, validation product_id, quantity_sold, calcul total_amount)
  - [x] 5.2 Tests intégration : GET/POST/PUT/DELETE /sales, isolation tenant, 404/400, validation données invalides
  - [x] 5.3 Tests intégration : GET /sales/summary avec différents filtres et group_by
  - [x] 5.4 Tests calculs automatiques : vérifier total_amount = quantity_sold * unit_price, agrégations par jour/produit correctes

## Dev Notes

- **Contexte Epic 3 :** Cette story est la première de l'Epic 3 "Capture Données Ventes & Calculs Personnalisables". Elle établit la base pour capturer les données de ventes nécessaires pour alimenter le moteur IA (Epic 5) et les calculs basiques (Story 3.5). Les données de ventes sont critiques pour l'IA - chaque vente enregistrée améliore les prédictions futures.

- **Table `sales` existante :** La migration V009__create_sales.sql a déjà créé la table `sales` avec les colonnes suivantes :
  - `id` UUID PRIMARY KEY
  - `tenant_id` UUID NOT NULL (RLS activé)
  - `product_id` UUID NOT NULL REFERENCES products(id)
  - `sale_date` TIMESTAMP WITH TIME ZONE NOT NULL
  - `quantity_sold` DECIMAL(10,2) NOT NULL CHECK (quantity_sold > 0)
  - `unit_price` DECIMAL(10,2) (optionnel)
  - `total_amount` DECIMAL(10,2) (calculé ou fourni)
  - `location_id` UUID REFERENCES locations(id) (optionnel)
  - `source` VARCHAR(50) DEFAULT 'manual' (pour cette story, toujours 'manual')
  - `external_id` VARCHAR(255) (NULL pour saisie manuelle)
  - `metadata` JSONB DEFAULT '{}' (pour données flexibles futures)
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  - `user_id` UUID REFERENCES users(id) (utilisateur ayant créé la vente)
  
  Indexes : idx_sales_tenant_date, idx_sales_product_date, idx_sales_location
  RLS : tenant_isolation_policy activé

- **Authentification :** Toutes les routes /sales doivent être protégées par authenticateToken ; tenant_id depuis req.user.tenantId ; utiliser db.queryWithTenant pour RLS.

- **Calcul total_amount :** Si unit_price est fourni, calculer automatiquement total_amount = quantity_sold * unit_price. Si unit_price est NULL, total_amount peut être NULL ou 0 selon logique métier.

- **Source 'manual' :** Pour cette story, toutes les ventes créées auront source = 'manual'. Les stories suivantes (3.2 import CSV, 3.3 terminaux paiement) utiliseront d'autres valeurs.

- **Relation avec produits :** Vérifier que le product_id existe et appartient au tenant avant création. Utiliser la même logique que dans product.service pour vérifier l'existence.

- **Relation avec emplacements :** location_id est optionnel. Si fourni, vérifier qu'il existe et appartient au tenant (même logique que locations).

- **Données time-series :** Bien que la table soit dans PostgreSQL (pas TimescaleDB pour MVP), la structure est optimisée pour requêtes temporelles avec index sur sale_date. Les données seront également répliquées ou agrégées dans BigQuery pour analytics/ML dans Epic 5 (pas dans cette story).

- **Patterns établis :** Suivre les mêmes patterns que product.service et supplier.service :
  - Service dans apps/api/src/services/sales.service.ts
  - Routes dans apps/api/src/routes/sales.routes.ts
  - Types partagés dans packages/shared/src/types/index.ts
  - Tests unitaires dans apps/api/src/__tests__/services/sales.service.test.ts
  - Tests intégration dans apps/api/src/__tests__/sales/
  - Page HTML dans apps/api/public/sales.html (pattern identique à products.html, suppliers.html)

### Project Structure Notes

- **API :** apps/api/src/ — routes sous routes/, services sous services/.
- **Nouveaux fichiers suggérés :** apps/api/src/services/sales.service.ts, apps/api/src/routes/sales.routes.ts (montés sous /sales dans index.ts).
- **Pas de nouvelle migration** : table sales existe déjà (V009).
- **Types partagés :** packages/shared/src/types/index.ts — ajouter Sale, SaleCreateInput, SaleUpdateInput, SaleListFilters, SaleSummaryFilters.
- **Frontend / HTML :** Page dédiée sales.html ou équivalent, servie via GET /sales-page (pattern identique à products.html, suppliers.html).
- **Tests :** apps/api/src/__tests__/services/sales.service.test.ts, apps/api/src/__tests__/sales/ (intégration).

### Architecture Compliance

- **Multi-tenant :** Toutes les requêtes en RLS avec app.current_tenant ; db.queryWithTenant(tenantId, ...). Table sales a tenant_id ; politique RLS déjà en place (V009).
- **Authentification :** Routes protégées par authenticateToken ; tenant_id depuis req.user.
- **Base de données :** PostgreSQL pour MVP (pas TimescaleDB). Table sales optimisée pour requêtes temporelles avec index sur sale_date. Structure prête pour migration future vers TimescaleDB si nécessaire.
- **API REST :** Suivre les mêmes patterns que /products et /suppliers : pagination, filtres, validation express-validator, codes HTTP appropriés (200, 201, 400, 404, 409, 500).
- **Calculs :** Les agrégations (ventes totales par jour/produit) doivent être calculées côté DB pour performance (GROUP BY, SUM, COUNT). Éviter de charger toutes les ventes en mémoire pour calculer.

### Library & Framework Requirements

- **Backend :** Express.js 4.18+ avec TypeScript, express-validator pour validation
- **Base de données :** PostgreSQL 15+ avec pg (node-postgres) ou Prisma (selon stack existante)
- **Types :** TypeScript avec types partagés dans packages/shared
- **Tests :** Jest + Supertest pour tests intégration, tests unitaires pour logique métier
- **Frontend HTML :** Vanilla JS ou framework léger (selon pattern existant dans products.html/suppliers.html)

### File Structure Requirements

- **Service Layer :** apps/api/src/services/sales.service.ts
  - Fonctions : listSales(tenantId, filters), getSaleById(tenantId, saleId), createSale(tenantId, input, context), updateSale(tenantId, saleId, input), deleteSale(tenantId, saleId), getSalesSummary(tenantId, filters)
  - Validation métier : vérifier product_id existe, quantity_sold > 0, calcul total_amount
- **Route Layer :** apps/api/src/routes/sales.routes.ts
  - GET /sales (liste avec pagination et filtres)
  - GET /sales/:id (détail)
  - POST /sales (création)
  - PUT /sales/:id (modification)
  - DELETE /sales/:id (suppression)
  - GET /sales/summary (agrégations)
  - GET /sales/stats (statistiques rapides optionnel)
- **Types :** packages/shared/src/types/index.ts
  - Sale, SaleCreateInput, SaleUpdateInput, SaleListFilters, SaleSummaryFilters
- **Page HTML :** apps/api/public/sales.html
  - Liste ventes avec pagination, filtres, formulaire création/édition, statistiques rapides

### Testing Requirements

- **Tests unitaires :** sales.service.test.ts
  - Test listSales avec pagination et filtres
  - Test getSaleById (404 si inexistant ou autre tenant)
  - Test createSale avec validation (product_id existe, quantity_sold > 0, calcul total_amount)
  - Test updateSale (recalcul total_amount si unit_price modifié)
  - Test deleteSale
  - Test getSalesSummary avec différents group_by
- **Tests intégration :** sales.integration.test.ts
  - GET /sales (liste, pagination, filtres product_id, date_from, date_to, location_id)
  - GET /sales/:id (200, 404 si inexistant, 404 si autre tenant)
  - POST /sales (201, validation product_id existe, quantity_sold > 0, calcul total_amount, 400 si données invalides, 404 si product_id inexistant)
  - PUT /sales/:id (200, 404, 400)
  - DELETE /sales/:id (200, 404)
  - GET /sales/summary (agrégations par jour, par produit, filtres)
  - Isolation tenant (ventes d'un tenant invisibles pour autre tenant)
- **Coverage :** Viser 80%+ couverture pour logique métier critique (validation, calculs)

### Previous Story Intelligence

- **Story 2.1 (CRUD Stocks) :** Patterns établis pour CRUD API avec pagination, filtres, validation express-validator, RLS, tests unitaires et intégration. Réutiliser ces patterns pour sales.
- **Story 2.2 (Import Stocks) :** Patterns d'import CSV établis. Ne pas implémenter import CSV dans cette story (Story 3.2).
- **Story 2.3 (Gestion Emplacements) :** location_id optionnel dans sales, utiliser même logique de vérification existence emplacement.
- **Story 2.4 (Historique Mouvements) :** Patterns de liste avec filtres temporels (date_from, date_to) établis. Réutiliser pour filtres ventes par date.
- **Story 2.5 (Gestion Fournisseurs) :** Patterns de page HTML avec liste, formulaire création/édition, actions modifier/supprimer établis. Réutiliser pour sales.html.

**Apprentissages clés :**
- Toujours vérifier l'existence des entités liées (product_id, location_id) avant création/mise à jour
- Utiliser db.queryWithTenant pour toutes les requêtes (RLS automatique)
- Validation express-validator dans routes, validation métier dans services
- Tests unitaires pour logique métier, tests intégration pour routes complètes
- Page HTML avec Vanilla JS ou framework léger selon pattern existant

### References

- [Source: planning-artifacts/epics.md#Epic 3 - Story 3.1]
- [Source: docs/prd.md#FR21 - Saisie manuelle ventes]
- [Source: apps/api/migrations/V009__create_sales.sql - Table sales structure]
- [Source: docs/architecture.md#Sale Data Model - Structure données ventes]
- [Source: docs/database-schema.md#Sales Table - Schéma base de données]
- [Source: implementation-artifacts/2-1-crud-stocks-de-base.md - Patterns CRUD API]
- [Source: implementation-artifacts/2-3-gestion-emplacements.md - Patterns API CRUD, page HTML, tests]
- [Source: implementation-artifacts/2-5-gestion-fournisseurs.md - Patterns validation, tests intégration]
- [Source: apps/api/src/services/product.service.ts - Patterns service avec RLS]
- [Source: apps/api/src/routes/product.routes.ts - Patterns routes avec validation express-validator]
- [Source: apps/api/src/routes/supplier.routes.ts - Patterns routes CRUD]

## Dev Agent Record

### Agent Model Used

Auto

### Debug Log References

### Completion Notes List

- Types partagés : Sale, SaleCreateInput, SaleUpdateInput, SaleListFilters, SaleSummaryFilters, SaleSource dans packages/shared. Table sales existante (V009), pas de nouvelle migration.
- API CRUD : sales.service.ts (listSales, getSaleById, createSale, updateSale, deleteSale, getSalesSummary, getSalesStats) avec RLS et validation product_id/location_id. Routes GET/POST/PUT/DELETE /sales, GET /sales/stats, GET /sales/summary (définies avant /sales/:id pour éviter capture). total_amount calculé automatiquement (quantity_sold * unit_price).
- Page HTML /sales-page (public/sales.html) : liste ventes avec pagination et filtres date, formulaire création/édition (produit, date, quantité, prix unitaire, emplacement), total calculé en temps réel, stats rapides (aujourd'hui, hier, semaine, mois).
- OpenAPI : tag Sales, paths /sales/stats, /sales/summary, /sales, /sales/{id}.
- Tests : sales.service.test.ts (listSales, getSalesSummary, getSalesStats, createSale PRODUCT_NOT_FOUND). sales.integration.test.ts (CRUD, 401/404/400, isolation tenant, stats, summary, total_amount calculé).

### File List

- packages/shared/src/types/index.ts (modified – Sale, SaleCreateInput, SaleUpdateInput, SaleListFilters, SaleSummaryFilters, SaleSource)
- apps/api/src/services/sales.service.ts (new)
- apps/api/src/routes/sales.routes.ts (new)
- apps/api/src/index.ts (modified – mount /sales, GET /sales-page)
- apps/api/public/sales.html (new)
- apps/api/src/openapi/spec.ts (modified – tag Sales, paths /sales, /sales/stats, /sales/summary, /sales/{id})
- apps/api/src/__tests__/services/sales.service.test.ts (new)
- apps/api/src/__tests__/sales/sales.integration.test.ts (new)
- implementation-artifacts/3-1-saisie-manuelle-ventes.md (modified – tasks, status review, completion notes, file list)
