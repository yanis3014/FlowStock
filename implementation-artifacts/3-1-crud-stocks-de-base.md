# Story 3.1: CRUD Stocks de Base

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,
I want **créer, voir, modifier et supprimer mes stocks**,
so that **je peux gérer mon inventaire de base**.

## Acceptance Criteria

1. **Given** je suis un utilisateur authentifié  
   **When** je crée un nouveau stock  
   **Then** je peux saisir les informations produit (nom, description, SKU, quantité, unité, emplacement)  
   **And** la validation des données fonctionne (quantité >= 0, champs obligatoires)  
   **And** le stock est enregistré en base de données avec association au tenant  

2. **When** je consulte mes stocks  
   **Then** je vois la liste de tous mes stocks avec leurs informations  

3. **When** je modifie un stock  
   **Then** je peux mettre à jour toutes les informations  
   **And** les modifications sont enregistrées  

4. **When** je supprime un stock  
   **Then** je reçois une confirmation avant suppression  
   **And** le stock est supprimé de la base de données  

5. **And** les messages de confirmation sont affichés pour toutes les actions  
6. **And** les erreurs sont gérées gracieusement (produit inexistant, validation échouée)  
7. **And** les tests unitaires et d’intégration pour le CRUD sont passants  

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2) — Connecter la page Stocks à l’API produits existante
  - [x] 1.1 Remplacer les MOCK_STOCKS par des appels à GET /products (pagination, filtres search, low_stock si besoin).
  - [x] 1.2 Afficher la liste des produits avec colonnes : nom, SKU, quantité, unité, statut (ok/low/critical), emplacement (optionnel).
- [x] Task 2 (AC: 1) — Formulaire de création de stock
  - [x] 2.1 Page ou modal « Nouveau produit » avec champs : nom, description, SKU, quantité, unité (piece, kg, liter, box, pack), min_quantity, emplacement (select locations), fournisseur (select suppliers), purchase_price, selling_price, lead_time_days.
  - [x] 2.2 Validation côté client : quantité >= 0, nom et SKU obligatoires, unité valide.
  - [x] 2.3 POST /products avec body conforme à ProductCreateInput (@bmad/shared) ; afficher message de succès ou erreur (toast ou bandeau).
- [x] Task 3 (AC: 3) — Édition de stock
  - [x] 3.1 Formulaire d’édition (même champs que création) pré-rempli via GET /products/:id.
  - [x] 3.2 PUT /products/:id ; messages de succès/erreur.
- [x] Task 4 (AC: 4) — Suppression avec confirmation
  - [x] 4.1 Avant DELETE /products/:id : afficher une confirmation (modal ou confirm()) « Êtes-vous sûr de vouloir supprimer ce stock ? ».
  - [x] 4.2 Après suppression, retirer l’élément de la liste ou recharger la liste ; message de confirmation.
- [x] Task 5 (AC: 5, 6, 7) — Messages, erreurs et tests
  - [x] 5.1 Afficher messages de confirmation pour création, modification, suppression (in-app).
  - [x] 5.2 Gérer les erreurs API (404 produit inexistant, 400 validation échouée) avec messages clairs.
  - [x] 5.3 Vérifier / compléter les tests d’intégration API (apps/api) pour CRUD produits ; tests unitaires front si applicable.

## Dev Notes

- **Réutilisation obligatoire** : ne pas recréer l’API produits. L’API existe déjà : `apps/api/src/routes/product.routes.ts`, `apps/api/src/services/product.service.ts`. Endpoints : GET /products (liste + filtres), GET /products/:id, POST /products, PUT /products/:id, DELETE /products/:id. Tous sous authentification (Bearer) et scope tenant.
- **Modèle existant** : table `products` (migration V007), champs : tenant_id, sku, name, description, unit (enum piece|kg|liter|box|pack), quantity, min_quantity, location_id, supplier_id, purchase_price, selling_price, lead_time_days, is_active. Types partagés : `Product`, `ProductCreateInput`, `ProductUpdateInput`, `ProductUnit` dans `packages/shared/src/types/index.ts`.
- **Page actuelle** : `apps/web/src/app/(app)/stocks/page.tsx` affiche des **mocks** (MOCK_STOCKS). Objectif : remplacer par les appels API et ajouter création / édition / suppression avec confirmation.
- **Navigation** : lien « Stocks » pointe déjà vers /stocks (nav-config.ts). Conserver la route et le layout (app) existants.
- **CSRF** : pour POST/PUT/DELETE, le front doit avoir récupéré le jeton CSRF (GET /csrf-token) et envoyer l’en-tête CSRF-Token (voir AGENTS.md).

### Project Structure Notes

- **API** : aucun nouveau service à créer ; étendre ou réutiliser `product.service.ts` et `product.routes.ts` si des validations ou réponses doivent être alignées avec les AC (ex. messages d’erreur explicites).
- **Web** : `apps/web/src/app/(app)/stocks/page.tsx` — brancher sur l’API ; ajouter si besoin `apps/web/src/app/(app)/stocks/new/page.tsx` ou modal pour création, et `apps/web/src/app/(app)/stocks/[id]/edit/page.tsx` ou modal pour édition. Préférer modals si le design actuel reste une liste centrée.
- **Shared** : types déjà définis ; pas de changement requis sauf si nouveaux champs métier.

### References

- [Source: planning-artifacts/epics.md — Epic 3, Story 3.1] Critères d’acceptation et user story.
- [Source: apps/api/src/routes/product.routes.ts] Endpoints et validation express-validator.
- [Source: apps/api/src/services/product.service.ts] listProducts, createProduct, updateProduct, deleteProduct, getProductById.
- [Source: packages/shared/src/types/index.ts] Product, ProductCreateInput, ProductUpdateInput, ProductUnit.
- [Source: apps/api/migrations/V007__create_locations_suppliers_products.sql] Schéma table products.
- [Source: AGENTS.md] CSRF, auth, conventions projet.

## Technical Requirements (Guardrails)

- **API** : Réutiliser strictement les routes existantes `GET/POST/PUT/DELETE /products`. Validation côté API déjà en place (express-validator) ; s’assurer que les réponses 400 exposent un message d’erreur lisible (ex. `error` ou `message` dans le JSON).
- **Frontend** : Next.js 14 (App Router), React, `useAuth` et `useApi` (hooks existants) pour les appels authentifiés. Pas de nouvelle librairie requise pour le CRUD ; formulaires contrôlés avec validation (quantité >= 0, champs requis).
- **Multi-tenant** : Toutes les requêtes produits sont déjà scopées au `tenantId` du JWT ; ne pas exposer de tenant_id dans l’URL ou le body côté client.

## Architecture Compliance

- **Monorepo** : API dans `apps/api`, Web dans `apps/web`, types partagés dans `packages/shared`. Ne pas dupliquer les types Product côté web.
- **Auth** : Toutes les routes /products sont protégées par `authenticateToken` ; le front doit envoyer `Authorization: Bearer <access_token>` (déjà géré par useApi si configuré avec le token).
- **Base de données** : PostgreSQL, table `products` avec RLS / tenant_id. Aucune migration à ajouter pour cette story.

## Library / Framework Requirements

- **Côté API** : Express, existing product.service + product.routes ; pas de nouveau framework.
- **Côté Web** : React 18, Next.js 14, Tailwind (déjà en place). Utiliser les composants UI existants (DataTable, formulaires) si présents dans `apps/web/src/components` pour garder la cohérence.

## File Structure Requirements

- Fichiers à modifier / créer : `apps/web/src/app/(app)/stocks/page.tsx` (liste + appels API) ; optionnellement `apps/web/src/app/(app)/stocks/new/page.tsx` ou modal dans page.tsx pour création ; idem pour édition `stocks/[id]/edit` ou modal. Ne pas créer de nouveaux services API ni de nouvelles routes API pour le CRUD.

## Testing Requirements

- **API** : Les tests existants dans `apps/api/src/__tests__/products/` (products.integration.test.ts, product.service tests) doivent rester verts. Compléter si des cas AC manquent (ex. suppression retourne 204 ou 200, message d’erreur 404 pour produit inexistant).
- **Frontend** : Tests unitaires ou composant pour la validation des formulaires (optionnel pour MVP) ; au minimum vérifier manuellement création, édition, suppression, messages de succès/erreur.

## Previous Story Intelligence (Epic 2 / codebase)

- Epic 2 (POS, webhooks, mode dégradé) a livré des routes et services dans `apps/api` ; le frontend utilise déjà `useAuth`, `useApi`, et des pages protégées (dashboard, sales, etc.). Réutiliser les mêmes patterns : `fetchApi('/products')`, gestion loading/error, redirection vers login si non authentifié.
- La page `/stocks` existe avec un shell UI (mocks) ; la structure (filtres, recherche, liste) peut être conservée en remplaçant les données par l’API.

## Project Context Reference

- [Source: AGENTS.md] Conventions projet, CSRF, auth, Node 20, commandes.
- [Source: docs/ ou planning-artifacts/] PRD FR1, FR18 — CRUD stocks et traçabilité.

## Story Completion Status

- **Status** : done  
- **Contexte** : Implémentation dev-story terminée. Page Stocks connectée à l'API produits (liste, création, édition, suppression avec confirmation). Tous les AC couverts ; tests API produits passants. L’implémentation consiste à connecter l’UI Stocks à l’API produits existante et à ajouter les flux création / édition / suppression avec validation et confirmation, sans recréer l’API.

---

**Ultimate context engine analysis completed — comprehensive developer guide created.**

## Change Log

- **2026-03-04** — Implémentation dev-story (Story 3.1) : page Stocks CRUD (liste API, modals création/édition, suppression avec confirmation, messages). Status → review.
- **2026-03-06** — Code review : commentaire limitation filtre statut OK (client-side).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Page Stocks connectée à GET /products (pagination, search, filtre low_stock). Liste avec colonnes nom, SKU, quantité, unité, emplacement, statut, actions.
- Modal « Nouveau produit » : tous les champs (nom, SKU, description, quantité, unité, min_quantity, emplacement, fournisseur, prix, lead_time_days). Validation client (nom/SKU obligatoires, quantité >= 0). POST /products avec body snake_case.
- Modal « Modifier » : même formulaire pré-rempli via GET /products/:id ; PUT /products/:id. SKU non modifiable en édition.
- Suppression : confirm() « Êtes-vous sûr de vouloir supprimer ce stock ? » puis DELETE /products/:id ; rechargement liste + message succès.
- Bandeaux succès/erreur (messageSuccess, messageError) pour création, modification, suppression et erreurs API (400, 404, 409).
- Locations et fournisseurs chargés via GET /locations et GET /suppliers pour les selects. Tests API produits (21 tests) passants.

### File List

- apps/web/src/app/(app)/stocks/page.tsx (modifié — liste API, modals création/édition, suppression avec confirmation, messages)
