# Story 3.3: Formules Prédéfinies

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,  
I want **utiliser des formules de calcul prédéfinies communes**,  
so that **je peux faire des calculs standards sans avoir à les créer**.

## Acceptance Criteria

**Given** je suis un utilisateur authentifié  
**When** j'accède aux formules de calcul  
**Then** les 8 formules prédéfinies sont disponibles (consommation moyenne, stock sécurité, point commande, taux rotation, jours stock restant, coût stock moyen, valeur stock, marge bénéficiaire)  
**And** l'interface affiche la liste des formules disponibles avec descriptions  
**And** je peux sélectionner une formule avec ses paramètres (ex: période pour consommation moyenne)  
**And** le calcul et l'affichage du résultat fonctionnent  
**And** je peux utiliser le résultat dans d'autres calculs  
**And** la documentation de chaque formule est disponible  
**And** les tests unitaires pour chaque formule sont passants

## Tasks / Subtasks

- [x] Task 1: Seed des 8 formules prédéfinies en base (AC: formules disponibles)
  - [x] 1.1 Créer seed script ou migration de données pour insérer les 8 formules avec formula_type='predefined', tenant_id=NULL dans la table formulas (V010)
  - [x] 1.2 Consommation moyenne : formula_expression référence VENTES_PERIODE, PERIODE_JOURS. Description : "Moyenne des ventes quotidiennes sur une période (ex: 30 jours)"
  - [x] 1.3 Stock de sécurité : CONSOMMATION_MOYENNE * DELAI_LIVRAISON * 1.5
  - [x] 1.4 Point de commande : STOCK_SECURITE + (CONSOMMATION_MOYENNE * DELAI_LIVRAISON)
  - [x] 1.5 Taux de rotation : VENTES_PERIODE / STOCK_MOYEN
  - [x] 1.6 Jours stock restant : STOCK_ACTUEL / CONSOMMATION_QUOTIDIENNE
  - [x] 1.7 Coût stock moyen : SOMME(quantite * prix_achat) / SOMME(quantite)
  - [x] 1.8 Valeur stock : SOMME(quantite * prix_achat)
  - [x] 1.9 Marge bénéficiaire : (prix_vente - prix_achat) / prix_vente * 100

- [x] Task 2: Service de calcul des formules (AC: calcul et affichage)
  - [x] 2.1 Créer formula.service.ts : listPredefinedFormulas(), executeFormula(tenantId, formulaId, params)
  - [x] 2.2 Pour consommation moyenne : requêter sales (SUM quantity_sold) sur période, diviser par nombre de jours. Params : product_id, date_from, date_to (ou period_days)
  - [x] 2.3 Pour stock sécurité / point commande : utiliser CONSOMMATION_MOYENNE calculée + products.lead_time_days
  - [x] 2.4 Pour taux rotation : VENTES_PERIODE (sales) / STOCK_MOYEN (products.quantity moyen ou actuel)
  - [x] 2.5 Pour jours stock restant : products.quantity / consommation_quotidienne (conso moyenne sur période)
  - [x] 2.6 Pour coût stock moyen / valeur stock : agréger products (quantity, purchase_price) du tenant
  - [x] 2.7 Pour marge bénéficiaire : (selling_price - purchase_price) / selling_price * 100 par produit
  - [x] 2.8 Gérer les cas edge : pas de ventes → conso 0, division par zéro, valeurs nulles (prix_achat manquant)

- [x] Task 3: API Endpoints (AC: interface, paramètres)
  - [x] 3.1 GET /formulas/predefined → liste les 8 formules (id, name, description, formula_expression, variables_used)
  - [x] 3.2 POST /formulas/:id/execute (body: { product_id?: string, period_days?: number, date_from?: string, date_to?: string, scope?: 'product' | 'all' }) → exécute la formule et retourne { result: number | object, unit?: string }
  - [x] 3.3 GET /formulas/predefined/:id → détail d'une formule avec documentation
  - [x] 3.4 Routes protégées par authenticateToken, tenant_id depuis req.user.tenantId

- [x] Task 4: Interface utilisateur (AC: liste, sélection, paramètres, résultat)
  - [x] 4.1 Créer page HTML formulas.html ou formulas-predefined.html
  - [x] 4.2 Liste des 8 formules avec nom, description courte, lien "Calculer"
  - [x] 4.3 Formulaire de paramètres : sélection produit (dropdown), période en jours (number, défaut 30), scope (produit unique ou tous)
  - [x] 4.4 Bouton "Calculer" → appel POST /formulas/:id/execute, affichage du résultat
  - [x] 4.5 Section documentation : explication de chaque formule (formule mathématique, variables, exemples)
  - [x] 4.6 Résultat réutilisable : afficher le résultat avec possibilité de le copier ou l'utiliser dans une autre formule (Story 3.4 réutilisera)

- [x] Task 5: Tests (AC: tests unitaires passants)
  - [x] 5.1 Tests unitaires formula.service : chaque formule avec données mock (sales, products)
  - [x] 5.2 Cas limites : product sans ventes, product sans purchase_price, période sans données
  - [x] 5.3 Tests intégration : GET /formulas/predefined, POST /formulas/:id/execute avec token valide
  - [x] 5.4 Vérifier multi-tenant : résultats isolés par tenant

## Dev Notes

- **Contexte Epic 3 :** Stories 3.1 (saisie manuelle ventes) et 3.2 (import CSV ventes) sont done. Les données sales et products sont disponibles. Table formulas existe (V010) avec formula_type, tenant_id NULL pour prédéfinies.
- **Table formulas (V010) :** id, tenant_id (NULL pour prédéfinies), name, description, formula_type ('predefined'|'custom'), formula_expression, variables_used TEXT[], is_active. Contrainte : predefined → tenant_id NULL.
- **Sources de données :** products (quantity, purchase_price, selling_price, lead_time_days), sales (quantity_sold, sale_date, product_id). RLS appliqué via db.queryWithTenant.
- **Variables des formules :** STOCK_ACTUEL (products.quantity), VENTES_PERIODE (SUM sales.quantity_sold), CONSOMMATION_MOYENNE (ventes/jours), DELAI_LIVRAISON (products.lead_time_days), STOCK_SECURITE/PROINT_COMMANDE (calculés), STOCK_MOYEN (moyenne quantités ou stock actuel), PRIX_ACHAT/PRIX_VENTE (products).
- **Story 3.4 (formules personnalisées) :** utilisera mathjs pour parser/évaluer. Story 3.3 peut implémenter la logique métier en TypeScript pur (pas d'évaluation dynamique de chaîne pour les prédéfinies) OU préparer l'infrastructure mathjs pour cohérence avec 3.4.

### Project Structure Notes

- **Service :** apps/api/src/services/formula.service.ts (nouveau)
- **Routes :** apps/api/src/routes/formula.routes.ts (nouveau) ou formula.routes.ts
- **Page HTML :** apps/api/public/formulas.html ou formulas-predefined.html
- **Seed :** migration V010bis ou script seed, ou données dans migration V010 si pas encore exécutée en prod
- **Types :** packages/shared : Formula, FormulaExecuteParams, FormulaResult si besoin
- **Tests :** apps/api/src/__tests__/services/formula.service.test.ts, __tests__/formulas/formulas.integration.test.ts

### Architecture Compliance

- **Multi-tenant :** Toutes les requêtes (products, sales) via db.queryWithTenant(tenantId). Les formules prédéfinies sont en lecture seule (tenant_id NULL), mais l'exécution utilise les données du tenant.
- **Authentification :** Routes protégées par authenticateToken ; tenant_id depuis req.user.tenantId.
- **Base de données :** PostgreSQL. Table formulas déjà créée. Réutiliser sales pour agrégations ventes, products pour quantités et prix.
- **API REST :** Patterns existants (locations, products, sales). GET pour lecture, POST pour exécution (calcul avec paramètres).

### Library & Framework Requirements

- **Backend :** Express.js 4.18+ avec TypeScript, express-validator pour validation des paramètres
- **Base de données :** node-postgres (pg), db.queryWithTenant pour RLS
- **Formules prédéfinies :** Logique TypeScript pure (fonctions dédiées par formule). mathjs sera introduit en Story 3.4 pour formules personnalisées.
- **Tests :** Jest + Supertest

### File Structure Requirements

- **Service :** apps/api/src/services/formula.service.ts
  - listPredefinedFormulas(), getPredefinedFormulaById(id), executeFormula(tenantId, formulaId, params)
  - Fonctions internes : computeConsumptionAverage, computeSafetyStock, computeReorderPoint, computeTurnoverRate, computeDaysOfStockRemaining, computeAverageCost, computeStockValue, computeProfitMargin
- **Routes :** apps/api/src/routes/formula.routes.ts
  - GET /formulas/predefined, GET /formulas/predefined/:id, POST /formulas/:id/execute
- **Page HTML :** apps/api/public/formulas.html

### Testing Requirements

- **Tests unitaires :** formula.service.test.ts
  - Test chaque formule avec données mock (product avec quantity, lead_time_days, sales avec quantity_sold)
  - Test consommation moyenne : ventes 30 jours → résultat attendu
  - Test jours stock restant : stock 100, conso 5/jour → 20 jours
  - Test division par zéro, valeurs nulles
- **Tests intégration :** formulas.integration.test.ts
  - GET /formulas/predefined (200, 8 formules)
  - POST /formulas/:id/execute avec product_id, period_days
  - Isolation tenant
- **Coverage :** 80%+ pour logique métier des formules

### Previous Story Intelligence

- **Story 3.1 (Saisie Manuelle Ventes) :** API CRUD ventes, sales.service.ts, listSales avec filtres date_from/date_to/product_id. getSaleStats pour today, yesterday, this_week, this_month. Utiliser patterns similaires pour agrégations ventes par produit/période.
- **Story 3.2 (Import CSV Ventes) :** Données sales disponibles (manual + csv). Service sales-import. Page HTML avec formulaire, appel API. Réutiliser patterns de page (fetch avec Bearer token, affichage résultats).
- **Story 2.2 (Import Stocks) :** product-import.service, patterns de service avec validation.
- **Epic 2 Retro :** Migration V010 (table formulas) déjà créée. Les formules prédéfinies doivent être seedées (tenant_id NULL).

**Apprentissages clés :**
- Utiliser listSales avec date_from, date_to, product_id pour agrégations ventes
- products.quantity, purchase_price, selling_price, lead_time_days disponibles
- Page HTML : fetch API avec Authorization: Bearer token, formulaire, affichage dynamique
- Routes : authenticateToken, req.user.tenantId

### References

- [Source: planning-artifacts/epics.md#Epic 3 - Story 3.3]
- [Source: docs/prd.md#Formules Prédéfinies Disponibles]
- [Source: apps/api/migrations/V010__create_formulas.sql - Table formulas]
- [Source: apps/api/migrations/V009__create_sales.sql - Table sales]
- [Source: apps/api/migrations/V007__create_locations_suppliers_products.sql - Table products]
- [Source: apps/api/src/services/sales.service.ts - Agrégations ventes]
- [Source: apps/api/src/services/product.service.ts - Liste produits]
- [Source: docs/architecture.md - Formula Parser mathjs, CustomFormula model]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Migration V011 créée pour seed des 8 formules prédéfinies (consommation_moyenne, stock_securite, point_commande, taux_rotation, jours_stock_restant, cout_stock_moyen, valeur_stock, marge_beneficiaire)
- Service formula.service.ts créé avec listPredefinedFormulas, getPredefinedFormulaById, executeFormula et 8 fonctions de calcul
- Routes formula.routes.ts : GET /formulas/predefined, GET /formulas/predefined/:id, POST /formulas/:id/execute
- Page formulas.html avec liste formules, formulaire paramètres (produit, période, scope), bouton Calculer, documentation
- Tests unitaires formula.service.test.ts et intégration formulas.integration.test.ts (8 formules, 401, 404, execute valeur_stock, consommation_moyenne)

### File List

- apps/api/migrations/V011__seed_predefined_formulas.sql (nouveau)
- apps/api/src/services/formula.service.ts (nouveau)
- apps/api/src/routes/formula.routes.ts (nouveau)
- apps/api/src/index.ts (modifié - formula routes, /formulas-page)
- apps/api/public/formulas.html (nouveau)
- apps/api/src/__tests__/services/formula.service.test.ts (nouveau)
- apps/api/src/__tests__/formulas/formulas.integration.test.ts (nouveau)
