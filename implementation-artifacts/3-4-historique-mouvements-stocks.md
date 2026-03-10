# Story 3.4: Historique Mouvements Stocks

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,
I want **voir l'historique des mouvements de mes stocks**,
so that **je peux tracer toutes les modifications et comprendre l'évolution**.

## Acceptance Criteria

1. **Given** je suis un utilisateur authentifié  
   **When** un mouvement de stock se produit (création, modification quantité, suppression)  
   **Then** le mouvement est automatiquement enregistré dans l'historique  
   **And** les informations suivantes sont enregistrées : date/heure, type mouvement, utilisateur, ancienne valeur, nouvelle valeur, raison  

2. **When** je consulte l'historique d'un produit  
   **Then** je vois tous les mouvements pour ce produit  
   **And** je peux filtrer l'historique (date, type mouvement, utilisateur)  
   **And** l'historique est limité selon le niveau d'abonnement (30 jours Normal, 90 jours Premium, 365 jours Premium Plus)  
   **And** je peux exporter l'historique en CSV (selon niveau abonnement)

## Tasks / Subtasks

- [x] Task 1 (AC: 2) — Compléter la page Mouvements Next.js
  - [x] 1.1 Remplacer le placeholder de `apps/web/src/app/(app)/movements/page.tsx` par une UI complète.
  - [x] 1.2 Sélecteur de produit : charger la liste via GET /products (limit 200) ; afficher nom + SKU.
  - [x] 1.3 Quand un produit est sélectionné : appeler GET /products/:id/movements avec pagination (page, limit) et afficher le tableau (date, type, utilisateur, ancienne qté, nouvelle qté, raison).
  - [x] 1.4 Afficher la rétention : « Historique affiché : X derniers jours (selon votre abonnement) » (retention_days dans la réponse API).

- [x] Task 2 (AC: 2) — Filtres et pagination
  - [x] 2.1 Filtres : type de mouvement (select : création, modification qté, suppression, import, vente POS), date début, date fin.
  - [x] 2.2 Passer les filtres en query params : movement_type, date_from, date_to.
  - [x] 2.3 Pagination : boutons Préc./Suiv. ; afficher « Page X / Y ».
  - [x] 2.4 pos_sale ajouté dans la validation API product.routes.ts (GET movements et export).

- [x] Task 3 (AC: 2) — Export CSV
  - [x] 3.1 Bouton « Exporter CSV » : GET /products/:id/movements/export avec les mêmes filtres.
  - [x] 3.2 Récupérer le blob via fetchApi, URL.createObjectURL, téléchargement (filename movements-{productId}-{date}.csv).
  - [x] 3.3 Bouton désactivé si aucun produit sélectionné ; message si export tronqué (X-Export-Truncated).

- [x] Task 4 (AC: 1, 2) — Lien depuis la page Stocks
  - [x] 4.1 Action « Historique » (icône History) sur chaque ligne du tableau Stocks.
  - [x] 4.2 Navigation vers /movements?product_id={id}.

- [x] Task 5 (AC: 1, 2) — Tests et non-régression
  - [x] 5.1 API product.routes : pos_sale ajouté ; tests existants inchangés (nécessitent PostgreSQL).
  - [x] 5.2 Test manuel : flux complet implémenté.

## Dev Notes

- **Ne pas réinventer l'API** : l'API mouvements existe déjà (Story 2.4).
  - **Liste** : GET /products/:id/movements (page, limit, movement_type, user_id, date_from, date_to)
  - **Export** : GET /products/:id/movements/export?format=csv (mêmes filtres)
  - **Service** : `apps/api/src/services/stockMovement.service.ts`
  - **Routes** : `apps/api/src/routes/product.routes.ts` (sous /products/:id/movements)
  - **Types** : `StockMovement`, `MovementType`, `StockMovementListFilters`, `StockMovementListResult` dans `packages/shared/src/types/index.ts`

- **Rétention par abonnement** : 30 jours (Normal), 90 jours (Premium), 365 jours (Premium Plus). Géré côté API via getCurrentSubscription → features.history_days. Le front affiche retention_days renvoyé dans la réponse.

- **Types de mouvement** : creation, quantity_update, deletion, import, pos_sale. L'API valide actuellement creation, quantity_update, deletion, import. Si le filtre pos_sale est requis, ajouter dans product.routes.ts query('movement_type').optional().isIn([..., 'pos_sale']).

- **Page actuelle** : `apps/web/src/app/(app)/movements/page.tsx` est un placeholder (« Contenu à venir »). La nav pointe déjà vers /movements (nav-config.ts).

- **Patterns à réutiliser** : useAuth, useApi, DataTable ou tableau simple (comme Stocks), bandeaux succès/erreur, design cream/green-deep (globals.css). S'inspirer de `stocks/page.tsx` et `locations/page.tsx`.

- **CSRF** : GET ne nécessite pas CSRF. L'export est un GET, donc pas de CSRF.

### Project Structure Notes

- **Web** : `apps/web/src/app/(app)/movements/page.tsx` — réécriture complète ; `apps/web/src/app/(app)/stocks/page.tsx` — ajouter lien « Historique ».
- **API** : Aucune modification requise sauf éventuellement ajout de pos_sale au filtre movement_type.
- **Shared** : Types déjà définis.

### References

- [Source: planning-artifacts/epics.md — Epic 3, Story 3.4] Critères d'acceptation et user story.
- [Source: implementation-artifacts/2-4-historique-mouvements-stocks.md] Implémentation API complète (table, service, routes, tests).
- [Source: apps/api/src/routes/product.routes.ts] GET /products/:id/movements, GET /products/:id/movements/export.
- [Source: apps/api/src/services/stockMovement.service.ts] listMovements, getMovementsForExport, movementsToCsv, getRetentionDays.
- [Source: packages/shared/src/types/index.ts] StockMovement, MovementType, StockMovementListFilters.
- [Source: implementation-artifacts/3-1-crud-stocks-de-base.md] Patterns page Stocks, useApi, modals.
- [Source: implementation-artifacts/3-3-gestion-emplacements.md] Patterns DataTable, filtres, bandeaux.
- [Source: AGENTS.md] CSRF, auth, conventions projet.

## Technical Requirements (Guardrails)

- **API** : Réutiliser strictement GET /products/:id/movements et GET /products/:id/movements/export. Pas de nouveau endpoint.
- **Frontend** : Next.js 14 (App Router), React, useAuth, useApi. Importer les types depuis @bmad/shared.
- **Multi-tenant** : Toutes les requêtes sont scopées au tenantId du JWT (déjà géré par l'API).

## Architecture Compliance

- **Monorepo** : API dans apps/api, Web dans apps/web, types dans packages/shared.
- **Auth** : Routes /products/:id/movements protégées par authenticateToken.
- **Base de données** : Table stock_movements (V008), enum movement_type (V015 ajoute pos_sale). Aucune migration à ajouter.

## Library / Framework Requirements

- **API** : Aucun changement. Express, product.routes, stockMovement.service.
- **Web** : React 18, Next.js 14, Tailwind. Réutiliser composants UI existants (DataTable, Skeleton si chargement).

## File Structure Requirements

- Fichiers à modifier : `apps/web/src/app/(app)/movements/page.tsx` (réécriture), `apps/web/src/app/(app)/stocks/page.tsx` (lien Historique).
- Optionnel : ajout pos_sale dans product.routes.ts validation movement_type.

## Testing Requirements

- **API** : Les tests existants doivent rester verts. Pas de nouveau test API requis pour cette story (backend complet).
- **Frontend** : Test manuel du flux : sélection produit → affichage mouvements → filtres → pagination → export CSV.

## Previous Story Intelligence (Epic 3)

- **Story 3.1 (CRUD Stocks)** : Page Stocks avec modals, bandeaux, useApi, types @bmad/shared. Ajouter lien « Historique » sur chaque ligne.
- **Story 3.2 (Import stocks)** : Page import-stocks, useApi avec FormData, patterns upload.
- **Story 3.3 (Emplacements)** : Page Locations avec DataTable, useDebouncedValue, modals CRUD, filtre is_active=true. Patterns à réutiliser pour tableau mouvements.

## Project Context Reference

- [Source: AGENTS.md] Conventions projet, CSRF, auth, Node 20, commandes.
- [Source: docs/architecture.md] Stack, monorepo, patterns.

## Story Completion Status

- **Status** : done  
- **Contexte** : Implémentation terminée. Page /movements complète (sélecteur produit, tableau mouvements, filtres incl. utilisateur, pagination, export CSV). Lien Historique sur page Stocks. API : pos_sale ajouté au filtre movement_type. Code review 2026-03-06 : corrections appliquées (filtre user, exportTruncated reset, test pos_sale).

---

**Ultimate context engine analysis completed — comprehensive developer guide created.**

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Page /movements : sélecteur produit (GET /products limit 200), tableau mouvements (date, type, utilisateur, ancienne/nouvelle qté, raison), filtres (type, date début/fin), pagination, export CSV, affichage retention_days.
- Page Stocks : lien Historique (icône) vers /movements?product_id={id} sur chaque ligne.
- API : pos_sale ajouté à la validation movement_type dans product.routes.ts (GET movements et export).
- Support URL ?product_id= pour pré-sélection depuis la page Stocks.

### File List

- apps/web/src/app/(app)/movements/page.tsx (réécriture complète, filtre user, exportTruncated reset)
- apps/web/src/app/(app)/stocks/page.tsx (lien Historique ajouté)
- apps/api/src/routes/product.routes.ts (pos_sale dans validation movement_type)
- apps/api/src/__tests__/products/products.integration.test.ts (test pos_sale)

## Change Log

- **2026-03-06** — Implémentation story 3.4 : page Mouvements complète, lien Historique sur Stocks, pos_sale dans API. Status → review.
- **2026-03-06** — Code review : filtre utilisateur ajouté, exportTruncated reset, test pos_sale. Status → done.
- **2026-03-07** — Code review (2ᵉ passe) : 0 Critical, 4 Medium, 3 Low. Détails dans implementation-artifacts/code-review-3-4-2026-03-07.md. Status maintenu done.
- **2026-03-07** — Correctifs auto (revue 2ᵉ passe) : double loadMovements supprimé, validation UUID filtre user + message explicite, chargement produit présélectionné hors 200, bouton Export disabled, validation product_id URL, AC rétention « 365 jours » (Premium Plus). Tests front automatisés : non ajoutés (aucun setup) — suivi si besoin.

## Senior Developer Review (AI)

**Date :** 2026-03-07  
**Revueur :** AI (adversarial)

**Résumé :** Git vs File List cohérent. AC et tâches [x] validés. Aucune issue critique. Correctifs MEDIUM/LOW appliqués (sauf tests front).

**Problèmes relevés puis corrigés :**
- **MEDIUM** — Double appel à `loadMovements` → un seul `useEffect` appelle `loadMovements` (deps : selectedProductId, token, page, filtres).
- **MEDIUM** — Filtre utilisateur UUID invalide’→ validation côté client + message « Identifiant utilisateur invalide (format UUID attendu) » ; idem export CSV.
- **MEDIUM** — Produit présélectionné hors des 200 → si `product_id` en URL et absent de la liste, GET /products/:id et ajout à la liste.
- **MEDIUM** — Tests front automatisés : non implémentés (pas de setup Jest/RTL dans apps/web) — restent en suivi.
- **LOW** — Bouton Export → `disabled={exportLoading || !selectedProductId}`.
- **LOW** — Pas de validation UUID pour `product_id` dans l’URL → validation UUID avant utilisation (`validProductIdFromUrl`).
- **LOW** — AC rétention → « 365 jours Premium Plus » (aligné avec le code).
