# Story 2.4: Historique Mouvements Stocks

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,  
I want **voir l'historique des mouvements de mes stocks**,  
so that **je peux tracer toutes les modifications et comprendre l'évolution**.

## Acceptance Criteria

**Given** je suis un utilisateur authentifié  
**When** un mouvement de stock se produit (création, modification quantité, suppression)  
**Then** le mouvement est automatiquement enregistré dans l'historique  
**And** les informations suivantes sont enregistrées : date/heure, type mouvement, utilisateur, ancienne valeur, nouvelle valeur, raison  
**When** je consulte l'historique d'un produit  
**Then** je vois tous les mouvements pour ce produit  
**And** je peux filtrer l'historique (date, type mouvement, utilisateur)  
**And** l'historique est limité selon le niveau d'abonnement (30 jours Normal, 90 jours Premium, illimité Premium Plus)  
**And** je peux exporter l'historique en CSV (selon niveau abonnement)

## Tasks / Subtasks

- [x] Task 1: Modèle de données et migration (AC: enregistrement automatique, champs)
  - [x] 1.1 Créer table `stock_movements` (id, tenant_id, product_id, movement_type, quantity_before, quantity_after, user_id, reason, created_at) avec RLS et index (tenant_id, product_id, created_at).
  - [x] 1.2 Types de mouvement : creation | quantity_update | deletion | import (enum movement_type).
  - [x] 1.3 Pour quantity_update : ancienne/nouvelle quantité ; creation : quantity_after ; deletion : quantity_before, quantity_after = 0.
  - [x] 1.4 user_id → users(id) ON DELETE SET NULL.

- [x] Task 2: Enregistrement automatique des mouvements (AC: mouvement enregistré à chaque action)
  - [x] 2.1 stockMovement.service : logMovement(tenantId, productId, type, quantityBefore, quantityAfter, userId?, reason?).
  - [x] 2.2 createProduct → logMovement(..., 'creation' ou 'import', null, quantity) selon context.reason.
  - [x] 2.3 updateProduct : si quantity changé → logMovement(..., 'quantity_update', oldQty, newQty, userId?, reason?) ; reason dans body PUT.
  - [x] 2.4 deleteProduct : récupérer quantité avant soft delete → logMovement(..., 'deletion', lastQty, 0).
  - [x] 2.5 importProducts : createProduct avec context { reason: 'Import initial', userId } → mouvement type import.

- [x] Task 3: API consultation et filtres (AC: consulter par produit, filtrer date/type/utilisateur)
  - [x] 3.1 GET /products/:id/movements : liste paginée, tenant-scoped.
  - [x] 3.2 Query params : page, limit, movement_type, user_id, date_from, date_to.
  - [x] 3.3 Rétention : getCurrentSubscription → features.history_days (30/90/365), filtre created_at >= (now - history_days).
  - [x] 3.4 Réponse : data, pagination, retention_days ; chaque mouvement avec user_email (JOIN users).

- [x] Task 4: Export CSV (AC: export selon niveau abonnement)
  - [x] 4.1 GET /products/:id/movements/export?format=csv, même rétention et filtres.
  - [x] 4.2 Content-Type: text/csv, Content-Disposition: attachment.
  - [x] 4.3 Max 10k lignes (truncated + header X-Export-Truncated).

- [x] Task 5: Interface utilisateur (AC: voir historique, filtres, export)
  - [x] 5.1 Page /movements-page (movements.html) : sélection produit, tableau mouvements (date, type, utilisateur, ancienne/nouvelle qté, raison).
  - [x] 5.2 Filtres : type, date début/fin.
  - [x] 5.3 Bouton Exporter CSV (fetch avec token + blob download).
  - [x] 5.4 Indication "Historique affiché : X derniers jours (selon abonnement)".

- [x] Task 6: Tests (AC: traçabilité et limites)
  - [x] 6.1 Tests unitaires stockMovement.service (getRetentionDays, listMovements, getMovementsForExport, movementsToCsv).
  - [x] 6.2 Tests intégration : création/modification/suppression produit → mouvements créés (creation, quantity_update, reason).
  - [x] 6.3 GET /products/:id/movements 404 si produit inexistant ; isolation tenant via getProductById.
  - [x] 6.4 Export CSV 200 + content-type text/csv.

## Dev Notes

- **Contexte Epic 2 :** Stories 2.1 (CRUD produits), 2.2 (import initial), 2.3 (emplacements) sont en place. Les modifications de quantité passent par product.service (createProduct, updateProduct, deleteProduct). Aucune table d’historique de mouvements n’existe encore.
- **Abonnements (Story 1.4) :** subscription.service expose getFeaturesForTier(tier) avec history_days : Normal 30, Premium 90, Premium Plus 365. Utiliser getCurrentSubscription(tenantId) puis features.history_days pour filtrer les mouvements.
- **Utilisateur :** req.user après authenticateToken contient userId (ou id), tenantId, email. Stocker user_id dans stock_movements pour traçabilité ; si appel sans user (ex. script), user_id peut être null.
- **Raison optionnelle :** Pour les mises à jour manuelles, un champ "reason" (ou "note") peut être passé dans le body de PUT /products/:id (ex. reason: "Inventaire") et propagé au mouvement. Sinon laisser null.
- **Soft delete :** deleteProduct fait un soft delete (is_active = false). Enregistrer un mouvement de type "deletion" avec quantity_before = quantité au moment de la suppression, quantity_after = 0 (ou null). Ne pas supprimer les mouvements historiques si le produit est soft-deleted.

### Project Structure Notes

- **API :** apps/api/src/ — routes sous routes/, services sous services/.
- **Nouveaux fichiers suggérés :**
  - apps/api/migrations/V008__create_stock_movements.sql (table + RLS + index).
  - apps/api/src/services/stockMovement.service.ts (logMovement, listMovements, getRetentionDays via subscription).
  - apps/api/src/routes/stockMovement.routes.ts ou extension de product.routes (GET /products/:id/movements, GET .../export). Monter sous /products ou /stock-movements dans index.
- **Modifications :** apps/api/src/services/product.service.ts (appels à logMovement après create/update/delete) ; passer userId et reason depuis les routes (req.user.id, req.body.reason).
- **Types partagés :** packages/shared/src/types/index.ts — ajouter StockMovement, MovementType, filtres liste mouvements.
- **Frontend / HTML :** Si page produit existante (ex. produits list + détail), ajouter onglet ou section "Historique" avec tableau + filtres + bouton export. Sinon page dédiée movements.html ou intégration dans une page produit existante (voir 2.1/2.3 pour patterns).
- **Tests :** apps/api/src/__tests__/services/stockMovement.service.test.ts, apps/api/src/__tests__/stock-movements/ ou sous __tests__/products/ pour intégration mouvements.

### Architecture Compliance

- **Multi-tenant :** Toutes les requêtes en RLS avec app.current_tenant ; db.queryWithTenant(tenantId, ...). Table stock_movements avec tenant_id (ou dérivé via product_id → products.tenant_id) ; politique RLS cohérente.
- **Authentification :** Routes protégées par authenticateToken ; tenant_id et user_id depuis req.user.
- **Subscription :** Utiliser getCurrentSubscription(tenantId) pour history_days ; pas de middleware requireTier pour la lecture d’historique (tous les tiers ont accès, la différence est la rétention). Export CSV soumis aux mêmes règles de rétention.

### Références

- [Source: planning-artifacts/epics.md#Epic 2 - Story 2.4]
- [Source: apps/api/migrations/V007__create_locations_suppliers_products.sql - schéma products]
- [Source: apps/api/src/services/product.service.ts - createProduct, updateProduct, deleteProduct]
- [Source: apps/api/src/services/subscription.service.ts - getFeaturesForTier, history_days]
- [Source: implementation-artifacts/2-3-gestion-emplacements.md - patterns API, locations]
- [Source: implementation-artifacts/2-2-import-initial-stocks-onboarding.md - import batch, option mouvement "import"]

## Dev Agent Record

### Agent Model Used

Auto

### Debug Log References

### Completion Notes List

- Migration V008 : table stock_movements (enum movement_type : creation, quantity_update, deletion, import), RLS, index. user_id FK users(id) ON DELETE SET NULL.
- stockMovement.service : logMovement, listMovements (pagination + retention via getCurrentSubscription), getMovementsForExport (cap 10k), movementsToCsv (séparateur ;).
- product.service : createProduct/updateProduct/deleteProduct acceptent optionnellement context { userId?, reason? } ; appels logMovement après create/update (si quantity changé)/delete. Import : reason "Import initial" → type import.
- Routes : GET /products/:id/movements, GET /products/:id/movements/export ; PUT /products/:id accepte body.reason ; POST/PUT/DELETE passent req.user.userId en context.
- Page movements.html : sélection produit, filtres type/date, tableau, export CSV (fetch + blob), indication rétention.
- Types partagés : StockMovement, MovementType, StockMovementListFilters, StockMovementListResult dans packages/shared (build requis).
- Tests : stockMovement.service.test.ts (getRetentionDays, listMovements, getMovementsForExport, movementsToCsv) ; products.integration (describe Stock movements : création → 1 mouvement, update quantity+reason → quantity_update avec reason, 404 pour produit inexistant, export CSV).

### File List

- apps/api/migrations/V008__create_stock_movements.sql (new)
- packages/shared/src/types/index.ts (modified – MovementType, StockMovement, StockMovementListFilters, StockMovementListResult)
- apps/api/src/services/stockMovement.service.ts (new)
- apps/api/src/services/product.service.ts (modified – logMovement, context userId/reason)
- apps/api/src/services/product-import.service.ts (modified – importProducts userId, createProduct context)
- apps/api/src/routes/product.routes.ts (modified – GET movements, GET movements/export, reason in PUT, context in create/update/delete)
- apps/api/src/index.ts (modified – GET /movements-page)
- apps/api/public/movements.html (new)
- apps/api/src/openapi/spec.ts (modified – paths /products/{id}/movements, /products/{id}/movements/export, reason in PUT body)
- apps/api/src/__tests__/services/stockMovement.service.test.ts (new)
- apps/api/src/__tests__/products/products.integration.test.ts (modified – describe Stock movements, afterAll DELETE stock_movements)
- apps/api/src/__tests__/locations/locations.integration.test.ts (modified – afterAll DELETE stock_movements)
- apps/api/src/__tests__/products/product-import.integration.test.ts (modified – afterAll DELETE stock_movements)
- implementation-artifacts/2-4-historique-mouvements-stocks.md (modified – tasks, status, completion notes, file list)
