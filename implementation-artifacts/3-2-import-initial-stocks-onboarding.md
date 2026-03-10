# Story 3.2: Import Initial Stocks (Onboarding)

Status: done

## Story

As a **nouvel utilisateur**,
I want **importer mes stocks existants depuis Excel/CSV**,
so that **je n'ai pas à tout saisir manuellement au démarrage**.

## Acceptance Criteria

1. **Given** je suis un nouvel utilisateur authentifié  
   **When** j'upload un fichier CSV/Excel  
   **Then** l'interface permet l'upload de fichier  
   **And** le parser détecte automatiquement les colonnes  
   **And** je peux mapper les colonnes vers les champs produits (nom, quantité, etc.)  
   **And** une prévisualisation des données est affichée avant import  
   **And** la validation des données importées fonctionne (format, valeurs)  
   **And** l'import en batch gère les erreurs (lignes valides importées, erreurs reportées)  
   **And** un rapport d'import est généré (succès, erreurs, lignes ignorées)  
   **And** un template CSV/Excel est fourni en téléchargement

## Tasks / Subtasks

- [x] Task 1 (AC: 1) — Finaliser la page `/import-stocks` côté Web (UI + flux complet)
  - [x] 1.1 Remplacer le placeholder de `apps/web/src/app/(app)/import-stocks/page.tsx` par une UI d’import (upload + preview + import + report).
  - [x] 1.2 Contraintes d’upload visibles et appliquées côté UI : extensions `.csv`, `.xlsx`, `.xls`, taille max **5MB** (alignée avec `multer` côté API).
  - [x] 1.3 Télécharger un template : bouton “Télécharger le template CSV” (GET `/products/import/template`) et expliquer que le fichier doit contenir au minimum `sku` + `name` (quantité optionnelle).

- [x] Task 2 (AC: 1) — Prévisualisation + mapping colonnes
  - [x] 2.1 POST `/products/import/preview` en `multipart/form-data` (champ `file`) et afficher :
    - [x] colonnes détectées
    - [x] tableau preview (20 lignes max renvoyées par l’API)
    - [x] mapping suggéré (`suggestedMapping`)
  - [x] 2.2 UI de mapping : pour chaque colonne, permettre de choisir un champ cible (liste contrôlée) ou “ignorer”.
  - [x] 2.3 Champs cibles supportés (alignés service import produits) : `sku`, `name`, `description`, `unit`, `quantity`, `min_quantity`, `location_name`, `supplier_name`, `purchase_price`, `selling_price`, `lead_time_days`.
  - [x] 2.4 Validation UI avant import : au minimum, vérifier que le mapping contient `sku` et `name` (ou afficher un blocage clair).

- [x] Task 3 (AC: 1) — Exécuter l’import + rapport
  - [x] 3.1 POST `/products/import` en `multipart/form-data` avec :
    - [x] `file`
    - [x] `mapping` (string JSON) si l’utilisateur a modifié le mapping
  - [x] 3.2 Afficher le rapport d’import : `imported`, `totalRows`, `ignored`, liste `errors` (ligne, valeur, message).
  - [x] 3.3 UX “résiliente” : possibilité de relancer l’import après correction (reset de l’état, nouveau fichier).

- [x] Task 4 (AC: 1) — Onboarding : point d’entrée cohérent
  - [x] 4.1 Dans `apps/web/src/app/onboarding/page.tsx` (Étape 2/4 “Stocks initiaux”), faire pointer l’option “Import fichier” vers le vrai flux :
    - [x] soit navigation vers `/import-stocks` (recommandé MVP), avec retour possible vers l’onboarding
    - [x] soit intégration directe du composant d’import si on veut une expérience “tout-en-un”
  - [x] 4.2 Copywriting : rappeler que l’import est optionnel (“vous pouvez passer cette étape et compléter plus tard”) et que l’import crée des produits + quantités initiales.

- [x] Task 5 (AC: 1) — Tests minimaux et non-régression
  - [x] 5.1 Vérifier que les tests d’intégration API existants restent verts : `apps/api/src/__tests__/products/product-import.integration.test.ts`.
  - [x] 5.2 Ajouter/ajuster au besoin 1 test Web (optionnel MVP) ou au minimum un test manuel reproductible (cf. Test plan ci-dessous).

## Dev Notes

- **Ne pas réinventer l’import** : l’API d’import produits est déjà en place.
  - **Template** : `GET /products/import/template`
  - **Preview** : `POST /products/import/preview` (`multipart/form-data`, `file`)
  - **Import** : `POST /products/import` (`multipart/form-data`, `file` + `mapping` JSON optionnel)
  - **Implémentation** : `apps/api/src/services/product-import.service.ts`, route `apps/api/src/routes/product.routes.ts`
  - **Spec OpenAPI** : `apps/api/src/openapi/spec.ts` (paths `/products/import/*`)

- **Formats supportés** :
  - **CSV** (détection délimiteur `,` vs `;`, BOM supportée pour Excel)
  - **Excel** (`.xlsx`/`.xls`) via `xlsx` (première feuille seulement)
  - **Limite** : upload **5MB** côté API (multer memoryStorage). Prévenir l’utilisateur côté UI.

- **Mapping & tolérance colonnes** :
  - L’API propose un `suggestedMapping` basé sur alias FR/EN (ex. `ref` → `sku`, `nom` → `name`, `stock` → `quantity`).
  - Les unités sont normalisées côté API (`pc`, `pcs`, `litre`, `l`, etc.) vers `piece|kg|liter|box|pack`.

- **Validation & erreurs** :
  - Ligne invalide → reportée dans `errors[]` avec `row` et `message` ; l’import continue pour les lignes valides (comportement attendu AC).
  - SKU déjà existant sur le tenant → erreur “SKU already exists for this tenant” (à afficher proprement).
  - `location_name` / `supplier_name` :
    - Si le nom existe déjà, l’API rattache l’ID.
    - Sinon, l’API **n’en crée pas** et importe le produit sans lien (comportement “graceful”). L’UI doit l’expliquer (ex. “Emplacement inconnu → ignoré”).

- **Stock movements / traçabilité** :
  - L’import appelle `createProduct(..., { reason: 'Import initial' })` et le service produit logge un mouvement de type `import`.
  - Vérifier ensuite via `GET /products/{id}/movements` si besoin.

- **Sécurité / Auth / CSRF** :
  - Les endpoints sont protégés JWT (`Authorization: Bearer <token>`).
  - Les POST nécessitent CSRF : utiliser `useApi().fetchApi` (qui gère `GET /csrf-token`, cookie jar, et `X-CSRF-Token`).
  - Attention : pour `FormData`, ne **pas** forcer `Content-Type` (laisser le navigateur gérer le boundary).

- **Tech watch (2026-03)** :
  - `xlsx@0.18.5` et `csv-parse@6.1.0` sont alignés sur les versions courantes.
  - `multer` a des releases 2.1.x (patchs sécurité DoS). Le repo est en `^2.0.2` : planifier un bump avant prod (hors scope story si on reste sur MVP).

## Project Structure Notes

- **Web (Next.js 14 App Router)** :
  - Page cible : `apps/web/src/app/(app)/import-stocks/page.tsx`
  - Utilitaires réseau : `apps/web/src/hooks/useApi.ts` (auth + CSRF + retry CSRF pour bodies rejouables)
  - Navigation : `apps/web/src/lib/nav-config.ts` contient déjà `/import-stocks`
  - Point d’entrée onboarding : `apps/web/src/app/onboarding/page.tsx` (Étape 2/4)

- **API (Express)** :
  - Routes : `apps/api/src/routes/product.routes.ts` (multer, endpoints `/products/import/*`)
  - Service import : `apps/api/src/services/product-import.service.ts`
  - Tests existants : `apps/api/src/__tests__/products/product-import.integration.test.ts`

## References

- [Source: planning-artifacts/epics.md — Epic 3, Story 3.2] Critères d’acceptation (upload + mapping + preview + validation + rapport + template).
- [Source: docs/prd.md — FR24] Import initial stocks (Excel/CSV) pour onboarding.
- [Source: docs/front-end-spec.md — “Import avec étape de nettoyage des données (IA)”] Flow import : upload → preview → (nettoyage optionnel) → confirmer import.
- [Source: apps/api/src/routes/product.routes.ts] Endpoints `/products/import/template`, `/products/import/preview`, `/products/import`.
- [Source: apps/api/src/services/product-import.service.ts] Parsing CSV/Excel, alias colonnes, validation, import, template CSV.
- [Source: apps/api/src/__tests__/products/product-import.integration.test.ts] Comportements attendus (preview, mapping custom, tenant isolation, location/supplier).
- [Source: apps/web/src/hooks/useApi.ts] CSRF + auth + credentials; contraintes FormData.
- [Source: implementation-artifacts/3-1-crud-stocks-de-base.md] Patterns front existants (auth, useApi, /stocks) et conventions (snake_case côté API).

## Test plan (manuel)

- Se connecter (user normal).
- Aller sur `/import-stocks`.
- Télécharger le template CSV, le modifier avec 3 produits (avec/sans quantity, unit).
- Uploader le CSV → vérifier preview + mapping suggéré.
- Changer un mapping (ex. `ref` → `sku`) → lancer import → vérifier rapport.
- Vérifier que les produits apparaissent dans `/stocks` (GET /products) et que les mouvements `import` sont visibles sur un produit.
- Tester un fichier avec une ligne invalide (SKU vide) : import partiel + error row affichée.

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Cursor)

### Debug Log References

- n/a

### Completion Notes List

- Story créée à partir du backlog `3-2-import-initial-stocks-onboarding` détecté dans `implementation-artifacts/sprint-status.yaml`.
- Contexte réel du repo : endpoints d’import produits déjà implémentés côté API (CSV + Excel) ; page Web `/import-stocks` encore placeholder.
- Implémentation (dev-story) : page /import-stocks complète ; onboarding Étape 2 lié ; tests product-import verts.

### File List

- implementation-artifacts/3-2-import-initial-stocks-onboarding.md
- apps/web/src/app/(app)/import-stocks/page.tsx
- apps/web/src/app/onboarding/page.tsx
- apps/api/src/__tests__/products/product-import.integration.test.ts

### Change Log

- 2026-03-06: Implémentation story 3.2 — page import stocks, lien onboarding, tests API verts.
- 2026-03-06: Code review — commentaire useApi FormData/CSRF retry.
