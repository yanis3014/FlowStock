# Story 3.5: Calculs Basiques Temps Stock (Sans IA)

Status: Done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,  
I want **voir une estimation basique du temps de stock disponible**,  
so that **je peux avoir une idée même sans IA encore calibrée**.

## Acceptance Criteria

**Given** je suis un utilisateur authentifié avec des stocks et des ventes  
**When** je consulte un produit  
**Then** le calcul de consommation moyenne basique fonctionne (moyenne ventes 30 derniers jours)  
**And** le calcul jours de stock restant fonctionne (stock_actuel / consommation_quotidienne_moyenne)  
**And** l'estimation temps stock par produit est affichée  
**And** un indicateur visuel s'affiche si estimation non fiable (pas assez de données)  
**And** un message clair indique que c'est une estimation basique qui s'améliorera avec IA

## Tasks / Subtasks

- [x] Task 1: Service d'estimation temps stock (AC: calcul consommation moyenne, jours stock restant)
  - [x] 1.1 Créer stock-estimate.service.ts avec fonction getProductStockEstimate(tenantId, productId, periodDays?) → StockEstimate
  - [x] 1.2 StockEstimate contient : product_id, product_name, current_stock, avg_daily_consumption, days_remaining (number | null), confidence_level ('high' | 'medium' | 'low' | 'insufficient'), estimated_stockout_date (Date | null)
  - [x] 1.3 Calcul consommation moyenne : SUM(sales.quantity_sold) WHERE sale_date >= NOW() - periodDays (défaut 30), divisé par periodDays. Réutiliser pattern de getSalesSumForPeriod de formula.service.ts
  - [x] 1.4 Calcul jours stock restant : products.quantity / consommation_quotidienne_moyenne. Si consommation <= 0 → days_remaining = null (stock illimité ou pas de données)
  - [x] 1.5 Calcul date estimée rupture : Date.now() + days_remaining * 86400000 (millisecondes/jour)
  - [x] 1.6 Niveau de confiance basé sur quantité de données :
    - 'high' : >= 20 jours de ventes sur la période (ex: 20+ ventes distinctes sur 30 jours)
    - 'medium' : entre 7 et 19 jours de ventes
    - 'low' : entre 1 et 6 jours de ventes
    - 'insufficient' : 0 jour de vente (aucune donnée)
  - [x] 1.7 Compter les jours de vente distincts via COUNT(DISTINCT sale_date) pour calculer le confidence_level

- [x] Task 2: Estimation batch pour tous les produits (AC: estimation par produit affichée)
  - [x] 2.1 Ajouter getAllStockEstimates(tenantId, periodDays?) → StockEstimate[] : récupérer tous les produits actifs du tenant, calculer l'estimation pour chacun
  - [x] 2.2 Optimiser les requêtes : une seule requête agrégée pour toutes les ventes (GROUP BY product_id) au lieu de N requêtes individuelles
  - [x] 2.3 Requête SQL optimisée : SELECT product_id, SUM(quantity_sold), COUNT(DISTINCT sale_date) FROM sales WHERE tenant_id AND sale_date >= NOW() - interval GROUP BY product_id
  - [x] 2.4 Fusionner les données ventes avec les données produits (quantity, name) pour construire les StockEstimate[]
  - [x] 2.5 Trier les résultats par urgence : days_remaining ASC (les plus urgents en premier), NULL en dernier

- [x] Task 3: API Endpoints (AC: affichage estimation)
  - [x] 3.1 GET /stock-estimates → getAllStockEstimates(tenantId) : retourne toutes les estimations, protégé par authenticateToken
  - [x] 3.2 GET /stock-estimates/:productId → getProductStockEstimate(tenantId, productId) : estimation pour un produit spécifique
  - [x] 3.3 Query params optionnels : period_days (number, défaut 30, min 7, max 365)
  - [x] 3.4 Créer stock-estimate.routes.ts avec validation express-validator (period_days: optional int, min 7, max 365 ; productId: UUID)
  - [x] 3.5 Enregistrer routes dans index.ts : app.use('/stock-estimates', stockEstimateRoutes)

- [x] Task 4: Interface utilisateur (AC: estimation affichée, indicateur visuel, message IA)
  - [x] 4.1 Créer page stock-estimates.html avec tableau des estimations temps stock par produit
  - [x] 4.2 Tableau avec colonnes : Produit, Stock Actuel, Consommation Moy./Jour, Jours Restants, Date Rupture Estimée, Fiabilité
  - [x] 4.3 Code couleur par urgence dans colonne Jours Restants :
    - Rouge : < 7 jours (rupture imminente)
    - Orange : 7-14 jours (attention)
    - Jaune : 15-30 jours (à surveiller)
    - Vert : > 30 jours (OK)
    - Gris : null (pas de données ou stock illimité)
  - [x] 4.4 Badge indicateur de fiabilité :
    - 'high' → badge vert "Fiable"
    - 'medium' → badge jaune "Modéré"
    - 'low' → badge orange "Peu fiable"
    - 'insufficient' → badge rouge "Données insuffisantes"
  - [x] 4.5 Bannière informative en haut de page : "📊 Estimations basiques — Ces calculs sont basés sur la consommation moyenne des 30 derniers jours. Les estimations s'amélioreront avec le moteur IA (disponible avec l'abonnement Premium)."
  - [x] 4.6 Sélecteur de période : dropdown ou input pour changer la période d'analyse (7, 14, 30, 60, 90 jours), rafraîchissement automatique du tableau
  - [x] 4.7 Tri et recherche : possibilité de trier par colonne (nom, jours restants, stock actuel) et recherche par nom de produit
  - [x] 4.8 Affichage conditionnel : si un produit n'a aucune vente, afficher "—" pour consommation et jours restants avec tooltip explicatif "Aucune vente enregistrée sur cette période"
  - [x] 4.9 Ajouter route /stock-estimates-page dans index.ts servant stock-estimates.html

- [x] Task 5: Tests (AC: tests unitaires et intégration)
  - [x] 5.1 Tests unitaires stock-estimate.service.test.ts :
    - Calcul consommation moyenne : 150 unités vendues sur 30 jours → 5 unités/jour
    - Calcul jours restants : stock 100, consommation 5/jour → 20 jours
    - Calcul date rupture estimée : date actuelle + 20 jours
    - Confidence level high : 25 jours de ventes distincts sur 30
    - Confidence level medium : 12 jours de ventes distincts sur 30
    - Confidence level low : 3 jours de ventes distincts sur 30
    - Confidence level insufficient : 0 jour de vente
    - Cas edge : stock 0 → 0 jours
    - Cas edge : pas de ventes → consommation null, jours null, confidence 'insufficient'
    - Cas edge : consommation 0 → days_remaining null
  - [x] 5.2 Tests batch getAllStockEstimates :
    - Retourne estimations pour tous les produits actifs
    - Tri par urgence (days_remaining ASC, null en dernier)
    - Optimisation : vérifier une seule requête agrégée (pas N+1)
  - [x] 5.3 Tests intégration stock-estimates.integration.test.ts :
    - GET /stock-estimates (200, retourne liste estimations)
    - GET /stock-estimates/:productId (200, estimation unique)
    - GET /stock-estimates?period_days=7 (200, période personnalisée)
    - GET /stock-estimates?period_days=3 (400, période trop courte)
    - GET /stock-estimates sans auth (401)
    - Multi-tenant : estimations isolées par tenant
  - [x] 5.4 Vérifier non-régression : tests existants (formulas, sales, products) toujours passants

## Dev Notes

- **Contexte Epic 3 :** Stories 3.1 (saisie manuelle ventes), 3.2 (import CSV ventes), 3.3 (formules prédéfinies) et 3.4 (formules personnalisées) sont done. Les données sales et products sont disponibles. Les formules de calcul `computeDaysOfStockRemaining` et `computeConsumptionAverage` existent dans formula.service.ts et peuvent servir de référence, mais la Story 3.5 nécessite un service dédié optimisé pour le calcul batch (toutes les estimations d'un coup).
- **Différence avec formulas :** formula.service.ts calcule une formule à la fois (un produit, un calcul). Story 3.5 fournit une vue d'ensemble batch de TOUS les produits avec indicateurs de confiance. Le service stock-estimate.service.ts est distinct pour éviter le couplage et les requêtes N+1.
- **Tables utilisées :**
  - `products` (V007) : id, tenant_id, name, sku, quantity, min_quantity, is_active. quantity = stock actuel.
  - `sales` (V009) : id, tenant_id, product_id, sale_date, quantity_sold. Agrégation par période et par produit.
- **RLS :** Toutes les requêtes via db.queryWithTenant(tenantId) pour isolation multi-tenant.
- **Préparation Epic 4 :** Cette story prépare le terrain pour le Dashboard (Story 4.2) qui affichera ces estimations dans la vue d'ensemble. Le service sera réutilisé directement.

### Project Structure Notes

- **Service :** apps/api/src/services/stock-estimate.service.ts (nouveau)
- **Routes :** apps/api/src/routes/stock-estimate.routes.ts (nouveau)
- **Page HTML :** apps/api/public/stock-estimates.html (nouveau)
- **Tests unitaires :** apps/api/src/__tests__/services/stock-estimate.service.test.ts (nouveau)
- **Tests intégration :** apps/api/src/__tests__/stock-estimates/stock-estimates.integration.test.ts (nouveau)
- **Modifié :** apps/api/src/index.ts (nouvelles routes + page)

### Architecture Compliance

- **Multi-tenant :** Toutes les requêtes (products, sales) via db.queryWithTenant(tenantId). Estimations isolées par tenant.
- **Authentification :** Routes protégées par authenticateToken ; tenant_id depuis req.user.tenantId.
- **Base de données :** PostgreSQL. Pas de migration supplémentaire nécessaire — utilise les tables existantes products (V007) et sales (V009).
- **API REST :** Patterns existants (products, sales, formulas). GET pour lecture. Express-validator pour validation query params.
- **Performance :** Requête batch agrégée (une seule requête SQL pour toutes les ventes) au lieu de N requêtes. Important pour NFR1 (< 2s réponse).

### Library & Framework Requirements

- **Backend :** Express.js 4.18+ avec TypeScript, express-validator pour validation
- **Base de données :** node-postgres (pg), db.queryWithTenant pour RLS
- **Calculs :** TypeScript pur (pas besoin de mathjs — calculs simples)
- **Tests :** Jest + Supertest
- **Frontend :** HTML/CSS/JS vanilla (pattern pages existantes), fetch API avec Bearer token

### File Structure Requirements

- **Service :** apps/api/src/services/stock-estimate.service.ts
  - Interface StockEstimate { product_id, product_name, sku, current_stock, unit, avg_daily_consumption, days_remaining, estimated_stockout_date, confidence_level, sales_days_count, period_days }
  - getProductStockEstimate(tenantId, productId, periodDays?) → StockEstimate
  - getAllStockEstimates(tenantId, periodDays?) → StockEstimate[]
  - Fonctions internes : getSalesAggregation(tenantId, periodDays, productId?) → Map<productId, { total_sold, distinct_days }>
  - computeConfidenceLevel(salesDaysCount, periodDays) → ConfidenceLevel

- **Routes :** apps/api/src/routes/stock-estimate.routes.ts
  - GET /stock-estimates
  - GET /stock-estimates/:productId

- **Page HTML :** apps/api/public/stock-estimates.html

### Testing Requirements

- **Tests unitaires :** stock-estimate.service.test.ts
  - Test consommation moyenne avec données mock
  - Test jours restants avec cas nominaux et edge cases
  - Test confidence levels (high, medium, low, insufficient)
  - Test batch avec optimisation requêtes
  - Test tri par urgence
- **Tests intégration :** stock-estimates.integration.test.ts
  - GET /stock-estimates (200, retourne estimations)
  - GET /stock-estimates/:productId (200, 404)
  - Validation period_days (min 7, max 365)
  - Auth 401
  - Multi-tenant isolation
- **Frameworks :** Jest + Supertest
- **Emplacement :** apps/api/src/__tests__/services/ (unitaires), apps/api/src/__tests__/stock-estimates/ (intégration)
- **Coverage :** 80%+ pour logique de calcul et confiance

### Previous Story Intelligence

- **Story 3.1 (Saisie Manuelle Ventes) :** sales.service.ts avec listSales(tenantId, filters), getSaleStats. Table sales avec sale_date, product_id, quantity_sold. Utiliser pattern de requête agrégée similaire à getSaleStats.
- **Story 3.2 (Import CSV Ventes) :** Données sales historiques disponibles. Import CSV alimenté. sales-import.service.ts pattern de validation.
- **Story 3.3 (Formules Prédéfinies) :** formula.service.ts avec computeDaysOfStockRemaining(tenantId, productId, dateFrom, dateTo) et computeConsumptionAverage. Ces fonctions calculent par produit individuel — Story 3.5 nécessite batch optimisé. Réutiliser la LOGIQUE mais pas les fonctions directement (éviter N+1).
- **Story 3.4 (Formules Personnalisées) :** custom-formula-engine.ts, resolveVariables avec STOCK_ACTUEL, VENTES_7J, VENTES_30J. Les variables VENTES_7J/30J font des requêtes individuelles — ne pas suivre ce pattern pour batch.
- **Story 2.1 (CRUD Stocks) :** product.service.ts avec listProducts, getProductById. products.quantity = stock actuel, products.is_active pour filtrer.

**Apprentissages clés :**
- db.queryWithTenant(tenantId, query, params) pour toutes les requêtes DB
- authenticateToken middleware donne req.user.tenantId et req.user.userId
- Pages HTML : fetch API avec `Authorization: Bearer ${token}`, token depuis localStorage
- Routes : express-validator pour validation, authenticateToken pour protection
- Pattern routes existantes : router.get('/', authenticateToken, [validations], async (req, res) => { ... })
- getSalesSumForPeriod dans formula.service.ts fait SELECT SUM(quantity_sold) FROM sales WHERE product_id AND sale_date BETWEEN — bon pattern de référence pour la requête unitaire, mais utiliser GROUP BY product_id pour le batch

### References

- [Source: planning-artifacts/epics.md#Epic 3 - Story 3.5]
- [Source: docs/prd.md#Estimations Temps Stock Basiques]
- [Source: apps/api/src/services/formula.service.ts - computeDaysOfStockRemaining, computeConsumptionAverage]
- [Source: apps/api/src/services/sales.service.ts - getSaleStats, listSales]
- [Source: apps/api/src/services/product.service.ts - listProducts, getProductById]
- [Source: apps/api/migrations/V007__create_locations_suppliers_products.sql - Table products]
- [Source: apps/api/migrations/V009__create_sales.sql - Table sales]
- [Source: apps/api/src/index.ts - Routes et pages HTML]

## Dev Agent Record

### Agent Model Used

Claude claude-4.6-opus (Cursor)

### Debug Log References

### Completion Notes List

- stock-estimate.service.ts créé avec types StockEstimate, ConfidenceLevel et fonctions batch-optimisées
- Calcul consommation moyenne : SUM(quantity_sold) / periodDays avec période configurable (défaut 30, min 7, max 365)
- Calcul jours restant : current_stock / avg_daily_consumption, arrondi 1 décimale
- Date rupture estimée : calculée en YYYY-MM-DD depuis jours restants
- Confidence level basé sur COUNT(DISTINCT sale_date) : high (>=20), medium (7-19), low (1-6), insufficient (0)
- Batch optimisé : 2 requêtes SQL seulement (1 products + 1 sales GROUP BY) au lieu de N+1
- Filtre explicite tenant_id dans la requête products pour isolation multi-tenant fiable (RLS + WHERE)
- Tri par urgence : days_remaining ASC, nulls last
- stock-estimate.routes.ts : GET /stock-estimates et GET /stock-estimates/:productId avec validation express-validator
- stock-estimates.html : tableau avec code couleur urgence (rouge/orange/jaune/vert/gris), badges fiabilité, sélecteur de période, tri par colonnes, recherche par nom, tooltips, bannière IA, escape HTML
- 19 tests unitaires passants (computeConfidenceLevel, getSalesAggregation, getProductStockEstimate, getAllStockEstimates)
- 13 tests intégration passants (endpoints, auth 401, validation 400, 404, multi-tenant isolation)
- 0 erreur ESLint
- Non-régression confirmée : 34 tests formulas + 81 tests sales/products passants

### File List

- apps/api/src/services/stock-estimate.service.ts (nouveau)
- apps/api/src/routes/stock-estimate.routes.ts (nouveau)
- apps/api/public/stock-estimates.html (nouveau)
- apps/api/src/index.ts (modifié — import stockEstimateRoutes, route /stock-estimates, page /stock-estimates-page)
- apps/api/src/__tests__/services/stock-estimate.service.test.ts (nouveau — 19 tests)
- apps/api/src/__tests__/stock-estimates/stock-estimates.integration.test.ts (nouveau — 13 tests)
