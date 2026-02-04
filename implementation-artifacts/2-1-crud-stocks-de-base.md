# Story 2.1: CRUD Stocks de Base

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,  
I want **créer, voir, modifier et supprimer mes stocks**,  
so that **je peux gérer mon inventaire de base**.

## Acceptance Criteria

**Given** je suis un utilisateur authentifié  
**When** je crée un nouveau stock  
**Then** je peux saisir les informations produit (nom, description, SKU, quantité, unité, emplacement)  
**And** la validation des données fonctionne (quantité >= 0, champs obligatoires)  
**And** le stock est enregistré en base de données avec association au tenant  
**When** je consulte mes stocks  
**Then** je vois la liste de tous mes stocks avec leurs informations  
**When** je modifie un stock  
**Then** je peux mettre à jour toutes les informations  
**And** les modifications sont enregistrées  
**When** je supprime un stock  
**Then** je reçois une confirmation avant suppression  
**And** le stock est supprimé de la base de données  
**And** les messages de confirmation sont affichés pour toutes les actions  
**And** les erreurs sont gérées gracieusement (produit inexistant, validation échouée)  
**And** les tests unitaires et integration pour CRUD sont passants

## Tasks / Subtasks

- [ ] Task 1: Vérifier/compléter l’API CRUD produits (AC: création, consultation, modification, suppression)
  - [ ] Vérifier que POST /products crée bien un produit avec tenant_id, SKU, nom, description, quantité, unité, emplacement (location_id)
  - [ ] Vérifier validation (quantité >= 0, champs obligatoires sku/name)
  - [ ] Vérifier GET /products (liste avec pagination/filtres) et GET /products/:id
  - [ ] Vérifier PUT /products/:id pour mise à jour complète
  - [ ] Vérifier DELETE /products/:id (soft delete ou hard delete selon convention ; AC dit "supprimé de la base" – actuellement soft delete)
  - [ ] S’assurer que toutes les réponses API sont cohérentes (success, data, error) pour messages côté client

- [ ] Task 2: Confirmation avant suppression (AC: confirmation avant suppression)
  - [ ] Côté API : soit garder DELETE direct (la confirmation est côté client), soit exposer un endpoint de préparation si besoin
  - [ ] Documenter que le client (web/mobile) doit afficher une modale de confirmation avant d’appeler DELETE

- [ ] Task 3: Messages de confirmation et gestion d’erreurs (AC: messages affichés, erreurs gérées)
  - [ ] Vérifier que l’API retourne des messages d’erreur clairs (400 validation, 404 not found, 409 SKU duplicate)
  - [ ] Si un frontend existe : afficher toasts/messages de succès (création, modification, suppression) et erreurs

- [ ] Task 4: Tests CRUD (AC: tests unitaires et integration passants)
  - [ ] S’assurer que les tests existants dans `apps/api/src/__tests__/products/` et `product.service.test.ts` couvrent tous les cas (create, read, update, delete, validation, 404, 409)
  - [ ] Ajouter ou compléter les cas manquants (ex: suppression, produit inexistant, autre tenant)

## Dev Notes

- **Backend déjà en place :** Migration `V007__create_locations_suppliers_products.sql` crée les tables `products`, `locations`, `suppliers` avec RLS et tenant_id. Service `apps/api/src/services/product.service.ts` et routes `apps/api/src/routes/product.routes.ts` implémentent list/get/create/update/delete (soft delete). Types partagés dans `packages/shared/src/types/index.ts` (Product, ProductCreateInput, ProductUpdateInput, ProductUnit, StockStatus).
- **Authentification :** Toutes les routes produits sont protégées par `authenticateToken` ; le `tenant_id` est pris de `req.user.tenantId`. La connexion DB utilise `queryWithTenant(tenantId, ...)` pour appliquer le contexte RLS (`app.current_tenant`).
- **Convention suppression :** Actuellement `deleteProduct` fait un soft delete (`is_active = false`). Les AC disent "le stock est supprimé de la base" – valider avec le PO si on garde soft delete (recommandé pour traçabilité) ou si on exige hard delete ; dans les deux cas, la "confirmation avant suppression" est côté client.
- **Unité (unit) :** Enum `product_unit` en base : 'piece', 'kg', 'liter', 'box', 'pack'. À réutiliser côté client pour listes déroulantes.
- **Emplacement :** `location_id` optionnel sur product ; table `locations` déjà créée (Story 2.3). Pour 2.1, on peut laisser location_id optionnel et ne pas exposer encore de CRUD emplacements si hors scope.

### Project Structure Notes

- API : `apps/api/src/` — routes sous `routes/`, logique métier dans `services/`, middleware auth dans `middleware/auth.ts`.
- Migrations : `apps/api/migrations/` — ordre V001…V007. Ne pas ajouter de nouvelle migration pour le schéma products sauf évolution explicite.
- Tests : `apps/api/src/__tests__/products/` (intégration), `__tests__/services/product.service.test.ts` (unit).

### References

- [Source: planning-artifacts/epics.md#Epic 2 - Story 2.1]
- [Source: apps/api/migrations/V007__create_locations_suppliers_products.sql]
- [Source: packages/shared/src/types/index.ts]
- [Source: apps/api/src/services/product.service.ts]
- [Source: apps/api/src/routes/product.routes.ts]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
