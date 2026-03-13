# Story 3.7: Import CSV Ventes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,
I want **importer mes ventes depuis un fichier CSV**,
so that **je peux importer mes données historiques ou mes exports d'autres systèmes**.

## Acceptance Criteria

1. **Given** je suis un utilisateur authentifié  
   **When** j'upload un fichier CSV de ventes  
   **Then** l'interface permet l'upload de fichier CSV  
   **And** le parser CSV détecte automatiquement les colonnes (date, produit, quantité, prix)  
   **And** je peux mapper les colonnes vers les champs ventes  
   **And** une prévisualisation des données est affichée avant import  
   **And** la validation des données fonctionne (produits existent, dates valides)  
   **And** l'import en batch gère les erreurs (succès, erreurs reportées)  
   **And** un rapport d'import est généré (succès, erreurs)  
   **And** un template CSV est fourni en téléchargement

## Tasks / Subtasks

- [x] Task 1 (AC: 1) — Bouton et flux d'import CSV sur la page Ventes
  - [x] 1.1 Ajouter un bouton « Importer CSV » (ou « Import CSV ») en haut de page à côté de « Nouvelle vente », ouvrant un modal ou une étape d'upload.
  - [x] 1.2 Étape 1 : zone d'upload (drag & drop ou sélection), limite 5 Mo, types .csv uniquement. Appeler POST /sales/import/preview avec le fichier.
  - [x] 1.3 Étape 2 : afficher colonnes détectées, lignes d’aperçu (sampleRows), et mapping suggéré (suggestedMapping) ; permettre à l’utilisateur de modifier le mapping (colonnes CSV → champs : sale_date, product_sku, quantity_sold, unit_price, location_name).
  - [x] 1.4 Étape 3 : bouton « Lancer l’import » qui appelle POST /sales/import avec le fichier et le mapping (body form-data : file + mapping en JSON). Afficher le rapport (imported, errors[], totalRows) et option « Télécharger le template » (GET /sales/import/template).
  - [x] 1.5 Lien « Télécharger le template CSV » visible même avant import (en bas du modal ou dans la page).

- [x] Task 2 (AC: 1) — UX et cohérence
  - [x] 2.1 Messages d’erreur clairs (fichier invalide, colonnes manquantes, lignes en erreur avec numéro de ligne et message).
  - [x] 2.2 Bandeaux succès/erreur (aria-live) comme sur la page Ventes (Story 3.6). Design cream/green-deep aligné avec le reste de l’app.
  - [x] 2.3 Après import réussi : fermer le modal, rafraîchir la liste des ventes (loadSales(1)) et afficher un résumé (ex. « X ventes importées, Y erreurs »).

- [x] Task 3 (AC: 1) — Tests et non-régression
  - [x] 3.1 S’assurer que les tests d’intégration API existants pour l’import restent verts : `apps/api/src/__tests__/sales/sales-import.integration.test.ts`.
  - [x] 3.2 Test manuel : upload CSV, mapping, import, rapport, téléchargement template ; vérifier que les ventes importées apparaissent dans la liste avec source appropriée.

## Dev Notes

- **API déjà en place** : ne pas réimplémenter le backend.
  - **GET /sales/import/template** : téléchargement du template CSV (BOM UTF-8).
  - **POST /sales/import/preview** : body form-data `file` ; réponse `{ columns, sampleRows, suggestedMapping }`.
  - **POST /sales/import** : body form-data `file` + optionnel `mapping` (JSON string). Réponse `{ imported, errors[], ignored, totalRows }`. Champs de mapping autorisés : `sale_date`, `product_sku`, `quantity_sold`, `unit_price`, `location_name`, `metadata`.
  - Service : `apps/api/src/services/sales-import.service.ts` (parseFile, getImportPreview, importSales, CSV_TEMPLATE). Routes : `apps/api/src/routes/sales.routes.ts` (upload multer 5 Mo, .csv uniquement).

- **Page à modifier** : `apps/web/src/app/(app)/sales/page.tsx`. Ajouter le flux d’import (bouton + modal multi-étapes ou drawer) sans casser les modals CRUD existants (Nouvelle vente, Modifier, Supprimer).

- **Patterns à réutiliser** : useAuth, useApi, design cream/green-deep, bandeaux succès/erreur, modals comme sur Fournisseurs/Locations/Story 3.6. Pour le multi-step (upload → preview/mapping → import → rapport), s’inspirer du flux existant ou d’un stepper simple (états locaux étape 1/2/3).

- **CSRF** : POST nécessite le jeton CSRF (GET /csrf-token, header). Déjà géré par useApi.

- **Validation côté API** : produits résolus par SKU (product_sku obligatoire), dates (ISO8601, DD/MM/YYYY, YYYY-MM-DD), quantity_sold > 0, unit_price >= 0, location_name optionnel (résolu par nom). Les erreurs renvoyées par l’API contiennent `row`, `value`, `message`.

### Project Structure Notes

- **Web** : `apps/web/src/app/(app)/sales/page.tsx` — ajouter bouton Import CSV, modal stepper (upload → preview/mapping → import → rapport) + lien template.
- **API** : Aucune modification requise (routes et service déjà présents).
- **Shared** : Types existants (Sale, SaleCreateInput, etc.) ; pas de nouveau type côté front pour l’import (utiliser les réponses API telles quelles).

### References

- [Source: planning-artifacts/epics.md — Epic 3, Story 3.7] Critères d’acceptation et user story.
- [Source: apps/api/src/routes/sales.routes.ts] Endpoints /sales/import/template, /sales/import/preview, /sales/import.
- [Source: apps/api/src/services/sales-import.service.ts] getImportPreview, importSales, suggestMapping, CSV_TEMPLATE, ImportPreviewResult, ImportResult.
- [Source: implementation-artifacts/3-6-saisie-manuelle-ventes.md] Patterns modals, bandeaux, design, loadSales.
- [Source: AGENTS.md] CSRF, auth, conventions projet.

## Technical Requirements (Guardrails)

- **API** : Utiliser uniquement les routes existantes GET /sales/import/template, POST /sales/import/preview, POST /sales/import. Pas de nouveau endpoint.
- **Frontend** : Next.js 14 (App Router), React, useAuth, useApi. Pas de duplication de logique de parsing CSV côté client (tout est côté API).
- **Multi-tenant** : Toutes les requêtes sont scopées au tenantId du JWT (géré par l’API avec authenticateToken).
- **Fichier** : Max 5 Mo, .csv uniquement (aligné multer côté API).

## Architecture Compliance

- **Monorepo** : API dans apps/api, Web dans apps/web, types dans packages/shared.
- **Auth** : Routes /sales/import/* protégées par authenticateToken.
- **Base de données** : Table sales existante, source='csv' pour les lignes importées ; pas de nouvelle migration.

## Library / Framework Requirements

- **API** : Aucun changement (Express, multer, sales-import.service déjà en place).
- **Web** : React 18, Next.js 14, Tailwind. Réutiliser les composants UI existants (modals, boutons, bandeaux). Pour l’upload fichier : input type file ou zone drag-and-drop avec FormData pour les POST.

## File Structure Requirements

- Fichier à modifier : `apps/web/src/app/(app)/sales/page.tsx` (ajout du flux d’import).
- Optionnel : extraire un composant `SalesImportModal` ou `SalesImportStepper` dans le même dossier ou `@/components/` si le flux devient volumineux ; pas obligatoire pour MVP.

## Testing Requirements

- **API** : Les tests `apps/api/src/__tests__/sales/sales-import.integration.test.ts` doivent rester verts. Ne pas modifier le contrat API.
- **Frontend** : Test manuel du flux complet (upload → preview → mapping → import → rapport + téléchargement template). Vérifier affichage des erreurs par ligne et rafraîchissement de la liste après import.

## Previous Story Intelligence (Epic 3)

- **Story 3.6 (Saisie manuelle ventes)** : Page Ventes avec modals CRUD (création, édition, suppression), bandeaux succès/erreur (aria-live), design cream/green-deep, pagination 25/page, focus trap et Escape dans les modals. Après création : `loadSales(1)` pour éviter race condition. Colonne Produit sans sortKey (API ne supporte pas product_name). **Réutiliser les mêmes patterns pour le modal d’import et les bandeaux.**
- **Story 3.5 (Fournisseurs)** : Modals, confirmation suppression, design aligné — même charte pour le modal d’import.
- **Story 3.2 (Import initial stocks)** : Si un flux d’import avec preview/mapping existe déjà pour les stocks, s’en inspirer pour l’UX (stepper, mapping, rapport).

## Project Context Reference

- [Source: AGENTS.md] Conventions projet, CSRF, auth, Node 20, commandes.
- [Source: docs/architecture.md] Stack, monorepo, patterns.

## Story Completion Status

- **Status** : done  
- **Contexte** : Implémentation complète. Revue de code : correctifs HIGH/MEDIUM appliqués. Flux d’import CSV côté frontend (bouton, modal 3 étapes, rapport, template). API inchangée.

---

## Dev Agent Record

### Agent Model Used

Auto (agent router)

### Debug Log References

- Tests d’intégration API : exécutés via `npm run test -- --testPathPattern="sales-import"` (nécessite Postgres). Aucune modification API.
- Lint web : pas d’erreurs sur `apps/web/src/app/(app)/sales/page.tsx`.

### Completion Notes List

- Bouton « Importer CSV » ajouté à côté de « Nouvelle vente » (design border green-deep).
- Modal Import CSV en 3 étapes : (1) upload fichier .csv max 5 Mo → POST /sales/import/preview ; (2) mapping colonnes (suggestedMapping modifiable) + aperçu 5 lignes → POST /sales/import avec file + mapping ; (3) rapport (imported, errors, totalRows) avec aria-live, bouton Fermer.
- Lien « Télécharger le template CSV » en bas du modal (GET /sales/import/template via fetch + blob download).
- Après import réussi : fermeture modal, loadSales(1), toast avec résumé (X ventes importées, Y erreurs).
- formatSource étendu avec 'csv' → « Import CSV » (aligné API qui enregistre source='csv').
- Design cream/green-deep, messages d’erreur (fichier invalide, trop volumineux, erreurs par ligne), focus Escape pour fermer le modal.

- Revue de code (2026-03-13) — correctifs : libellé aperçu 5 lignes, toast si 0 importé + erreurs, focus trap modal Import, garde-fou mapping product_sku, indentation loadSales.

### File List

- apps/web/src/app/(app)/sales/page.tsx (modified)

## Change Log

- 2026-03-13 : Implémentation Story 3.7 — Import CSV ventes. Bouton Importer CSV, modal 3 étapes (upload → preview/mapping → résultat), téléchargement template, bandeaux et refresh liste.
- 2026-03-13 : Revue de code — correctifs HIGH/MEDIUM : libellé aperçu 5 lignes, toast si 0 importé + erreurs, focus trap modal Import, garde-fou mapping product_sku, indentation loadSales.
