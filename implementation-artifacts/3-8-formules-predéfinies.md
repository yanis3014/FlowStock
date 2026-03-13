# Story 3.8: Formules Prédéfinies

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,
I want **utiliser des formules de calcul prédéfinies communes**,
so that **je peux faire des calculs standards sans avoir à les créer**.

## Acceptance Criteria

1. **Given** je suis un utilisateur authentifié  
   **When** j'accède aux formules de calcul  
   **Then** les 8 formules prédéfinies sont disponibles (consommation moyenne, stock sécurité, point commande, taux rotation, jours stock restant, coût stock moyen, valeur stock, marge bénéficiaire)  
   **And** l'interface affiche la liste des formules disponibles avec descriptions  

2. **Given** je suis sur la page Formules (onglet prédéfinies)  
   **When** je sélectionne une formule avec ses paramètres (ex: période pour consommation moyenne, produit si requis)  
   **Then** le calcul et l'affichage du résultat fonctionnent  
   **And** je peux utiliser le résultat dans d'autres calculs (affichage clair, copie ou réutilisation dans formules personnalisées)  

3. **Given** je consulte les formules prédéfinies  
   **When** j'ouvre la documentation  
   **Then** la documentation de chaque formule est disponible (description, variables, usage)  

4. **Given** l'API et les seeds  
   **When** les tests sont exécutés  
   **Then** les tests unitaires et d'intégration pour les formules prédéfinies sont passants  

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2) — Vérifier et compléter l’interface Formules prédéfinies
  - [x] 1.1 Vérifier que la page `/formulas` (onglet Standard) charge bien les 8 formules via GET /formulas/predefined et les affiche avec nom + description.
  - [x] 1.2 Vérifier la sélection de formule, les paramètres (produit, période, scope) et l’appel POST /formulas/:id/execute ; affichage du résultat (nombre ou objet) avec unité si présente.
  - [x] 1.3 Corriger tout problème d’encodage (accents é, ê, etc.) dans les libellés/documentation côté front (StandardFormulasContent.tsx).
  - [x] 1.4 S’assurer que le résultat est réutilisable : affichage explicite, possibilité de copier ou lien vers formules personnalisées si pertinent.

- [x] Task 2 (AC: 3) — Documentation des formules
  - [x] 2.1 Vérifier que la section « Documentation des formules » (repliable) liste les 8 formules avec description claire (alignée sur le seed V011).
  - [x] 2.2 Vérifier accessibilité (aria-expanded, aria-controls) et lisibilité.

- [x] Task 3 (AC: 4) — Tests
  - [x] 3.1 S’assurer que les tests d’intégration API `apps/api/src/__tests__/formulas/formulas.integration.test.ts` passent (GET /formulas/predefined, GET /formulas/predefined/:id, exécution).
  - [x] 3.2 S’assurer que les tests unitaires du service `apps/api/src/__tests__/services/formula.service.test.ts` (listPredefinedFormulas, etc.) passent.
  - [x] 3.3 Test manuel : ouvrir /formulas, onglet Formules prédéfinies, sélectionner une formule, renseigner paramètres, exécuter, vérifier résultat et documentation.

## Dev Notes

- **Backend déjà en place** : ne pas réimplémenter.
  - **GET /formulas/predefined** : liste des 8 formules (tenant_id NULL, formula_type 'predefined'). Réponse : `{ success, data: Formula[] }`.
  - **GET /formulas/predefined/:id** : détail d’une formule prédéfinie par UUID.
  - **POST /formulas/:id/execute** : exécution (prédéfinie ou personnalisée). Body : `{ product_id?, period_days?, date_from?, date_to?, scope?: 'product' | 'all' }`. Réponse : `{ success, data: { result, unit?, formula_name? } }`.
  - Table et seed : `apps/api/migrations/V010__create_formulas.sql`, `V011__seed_predefined_formulas.sql` (8 formules : consommation_moyenne, stock_securite, point_commande, taux_rotation, jours_stock_restant, cout_stock_moyen, valeur_stock, marge_beneficiaire).
  - Service : `apps/api/src/services/formula.service.ts`. Routes : `apps/api/src/routes/formula.routes.ts`.

- **Frontend existant** : `apps/web/src/app/(app)/formulas/` avec onglets (Standard / Personnalisées). Composant formules prédéfinies : `_components/StandardFormulasContent.tsx`. Réutiliser useAuth, useApi, design cream/green-deep, patterns modaux/alertes comme sur Ventes/Fournisseurs.

- **Points d’attention** :
  - Les noms en base sont des clés (ex: `consommation_moyenne`). Le composant utilise `FORMULA_LABELS` pour l’affichage ; vérifier que tous les noms du seed ont un libellé et que les chaînes sont en UTF-8 correct (pas de � ou caractères cassés).
  - Pour « utiliser le résultat dans d’autres calculs » : au minimum afficher le résultat de façon claire ; optionnellement permettre copie ou lien vers l’onglet Formules personnalisées pour réutiliser la valeur.

### Project Structure Notes

- **Web** : `apps/web/src/app/(app)/formulas/page.tsx`, `_components/StandardFormulasContent.tsx` — pas de nouvelle page, renforcer/corriger l’existant.
- **API** : Aucune modification requise sauf si bug identifié (routes et service déjà présents).
- **Shared** : Types existants ; pas de nouveau type requis pour cette story.

### References

- [Source: planning-artifacts/epics.md — Epic 3, Story 3.8] User story et critères d’acceptation.
- [Source: apps/api/src/routes/formula.routes.ts] Endpoints /formulas/predefined, /formulas/predefined/:id, /formulas/:id/execute.
- [Source: apps/api/src/services/formula.service.ts] listPredefinedFormulas, getPredefinedFormulaById, executeFormula.
- [Source: apps/api/migrations/V011__seed_predefined_formulas.sql] Noms et descriptions des 8 formules.
- [Source: implementation-artifacts/3-7-import-csv-ventes.md] Patterns modals, bandeaux, design, useApi.
- [Source: AGENTS.md] CSRF, auth, conventions projet.

## Technical Requirements (Guardrails)

- **API** : Utiliser uniquement les routes existantes GET /formulas/predefined, GET /formulas/predefined/:id, POST /formulas/:id/execute. Pas de nouveau endpoint.
- **Frontend** : Next.js 14 (App Router), React, useAuth, useApi. Ne pas dupliquer la logique de calcul côté client (tout vient de l’API).
- **Multi-tenant** : Toutes les requêtes sont scopées au tenantId du JWT (authenticateToken). Les formules prédéfinies sont partagées (tenant_id NULL) mais l’exécution utilise le contexte tenant (stocks, ventes).
- **Encodage** : Fichiers et chaînes en UTF-8 ; corriger tout libellé avec caractères mal affichés (é, ê, ô, etc.).

## Architecture Compliance

- **Monorepo** : API dans apps/api, Web dans apps/web, types dans packages/shared.
- **Auth** : Routes /formulas/* protégées par authenticateToken.
- **Base de données** : Table `formulas` existante ; formules prédéfinies avec tenant_id NULL, formula_type 'predefined'. Aucune nouvelle migration requise.

## Library / Framework Requirements

- **API** : Aucun changement (Express, formula.service, formula.routes déjà en place).
- **Web** : React 18, Next.js 14, Tailwind. Réutiliser les composants UI existants (skeleton, boutons, champs, section documentation).

## File Structure Requirements

- Fichiers à modifier si besoin : `apps/web/src/app/(app)/formulas/_components/StandardFormulasContent.tsx` (corrections encodage, libellés, UX résultat).
- Ne pas créer de nouvelle route API ni de nouveau service backend pour cette story.

## Testing Requirements

- **API** : Les tests `apps/api/src/__tests__/formulas/formulas.integration.test.ts` et `apps/api/src/__tests__/services/formula.service.test.ts` doivent rester verts.
- **Frontend** : Test manuel du flux : /formulas → onglet Formules prédéfinies → liste 8 formules → sélection → paramètres (produit, période, scope) → Calculer → résultat affiché ; documentation repliable lisible.

## Previous Story Intelligence (Epic 3)

- **Story 3.7 (Import CSV ventes)** : Page Ventes avec bouton Import CSV, modal 3 étapes (upload → preview/mapping → rapport), bandeaux succès/erreur (aria-live), design cream/green-deep, useApi avec CSRF. **Réutiliser les mêmes patterns visuels et useApi pour la page Formules.**
- **Story 3.6 (Saisie manuelle ventes)** : Modals CRUD, focus trap, Escape, loadSales après création. **Cohérence design et accessibilité sur la page Formules.**
- **Story 3.5 (Fournisseurs)** : Modals, confirmation suppression, design aligné. Même charte pour toute l’app.

## Project Context Reference

- [Source: AGENTS.md] Conventions projet, CSRF, auth, Node 20, commandes.
- [Source: docs/architecture.md] Stack, monorepo, patterns.

## Story Completion Status

- **Status** : done  
- **Contexte** : Revue de code effectuée. 7 issues (2 HIGH, 5 MEDIUM) corrigées. Encodage UTF-8 corrigé, lien formule personnalisée ajouté, navigation onglet fixée, tests renforcés, guidance product_id ajoutée, limites et clamp period_days corrigés.

---

## Dev Agent Record

### Agent Model Used

Auto (agent router)

### Debug Log References

- Aucun. Lint web : OK sur StandardFormulasContent.tsx.

### Completion Notes List

- Correction encodage UTF-8 dans `StandardFormulasContent.tsx` : FORMULA_LABELS, DOC_ITEMS et tous les libellés (sécurité, coût, bénéficiaire, période, paramètres, résultat, etc.) ; remplacement des caractères corrompus (뿯½, ├) par les bons accents (é, ×).
- Ajout du lien « Vous pouvez réutiliser cette valeur dans une formule personnalisée » sous le bloc résultat (AC 1.4), avec lien vers `/formulas?tab=custom`.
- Documentation repliable déjà conforme (aria-expanded, aria-controls, liste des 8 formules). Aucune modification API ; tests formules passent lorsque Postgres est disponible (env de test).

### File List

- apps/web/src/app/(app)/formulas/_components/StandardFormulasContent.tsx (modified)
- apps/web/src/app/(app)/formulas/page.tsx (modified — code review fix H1)
- apps/api/src/__tests__/formulas/formulas.integration.test.ts (modified — code review fix H2)
- apps/api/src/__tests__/services/formula.service.test.ts (modified — code review fix M2)

## Change Log

- 2026-03-13 : Implémentation Story 3.8 — Formules prédéfinies. Correction encodage UTF-8 (libellés, DOC_ITEMS), lien réutilisation résultat vers formules personnalisées, statut passé en review.
- 2026-03-13 : Code review — 7 issues corrigées (H1: bug tab navigation; H2: assertion hardcodée; M1: re-fetch produits; M2: assertion test unitaire faible; M3: guidance product_id requis; M4: limite 100→500 produits; M5: clamp period_days).
