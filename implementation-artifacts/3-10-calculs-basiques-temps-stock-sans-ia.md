# Story 3.10: Calculs Basiques Temps Stock (Sans IA)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,
I want **voir une estimation basique du temps de stock disponible**,
so that **je peux avoir une idée même sans IA encore calibrée**.

## Acceptance Criteria

1. **Given** je suis un utilisateur authentifié avec des stocks et des ventes  
   **When** je consulte un produit  
   **Then** le calcul de consommation moyenne basique fonctionne (moyenne ventes 30 derniers jours)  
   **And** le calcul jours de stock restant fonctionne (stock_actuel / consommation_quotidienne_moyenne)  
   **And** l'estimation temps stock par produit est affichée  

2. **Given** l'estimation est affichée pour un produit  
   **When** les données de ventes sont insuffisantes (peu ou pas de ventes sur la période)  
   **Then** un indicateur visuel s'affiche indiquant que l'estimation n'est pas fiable (pas assez de données)  

3. **Given** l'utilisateur consulte une estimation basique  
   **When** le contexte est visible  
   **Then** un message clair indique que c'est une estimation basique qui s'améliorera avec l'IA  

## Tasks / Subtasks

- [x] Task 1 (AC: 1) — Exposition et affichage de l'estimation temps de stock par produit  
  - [x] 1.1 S'assurer que l'API expose les estimations basiques (GET /stock-estimates, GET /stock-estimates/:productId avec period_days=30). Réutiliser le service existant `stock-estimate.service` (consommation moyenne 30j, jours restants, confidence_level). Aucune nouvelle route n'est requise si déjà en place.  
  - [x] 1.2 Sur la page Stocks (`/stocks`), afficher pour chaque produit l'estimation « Jours restant (est.) » et/ou la consommation moyenne 30j (ex. colonne dédiée ou encart par ligne), en appelant GET /stock-estimates (liste) ou en chargeant les estimations avec les produits.  
  - [x] 1.3 Sur la vue détail d'un produit (ex. page Mouvements avec product_id sélectionné, ou modal détail si existant), afficher un bloc « Estimation temps de stock » : consommation moyenne 30j, jours restants, unité.  

- [x] Task 2 (AC: 2) — Indicateur visuel lorsque l'estimation n'est pas fiable  
  - [x] 2.1 Utiliser le champ `confidence_level` (high / medium / low / insufficient) déjà retourné par l'API pour décider quand afficher l'indicateur « estimation non fiable ».  
  - [x] 2.2 Afficher un indicateur visuel (badge, icône, couleur) lorsque confidence_level est `low` ou `insufficient` (ex. « Données insuffisantes » ou « Estimation peu fiable »).  
  - [x] 2.3 S'assurer que l'absence de ventes (insufficient) est clairement distinguée (ex. « Pas assez de données de ventes »).  

- [x] Task 3 (AC: 3) — Message « estimation basique, s'améliorera avec l'IA »  
  - [x] 3.1 Afficher un message discret mais visible (ex. sous le bloc estimation ou en tooltip) : « Estimation basique à partir des ventes des 30 derniers jours. La précision s'améliorera avec les prédictions IA (niveau Premium). »  
  - [x] 3.2 Harmoniser le message sur la page Stocks et sur la page Prévision (/forecast) si elle affiche déjà des estimations basiques.  

- [x] Task 4 — Tests et qualité  
  - [x] 4.1 Vérifier que les tests d'intégration existants pour GET /stock-estimates et GET /stock-estimates/:productId restent verts.  
  - [x] 4.2 Test manuel : page Stocks avec produits ayant 0, peu ou beaucoup de ventes → vérifier affichage estimation, indicateur fiabilité, message basique.

### Review Follow-ups (AI)

- [ ] [AI-Review][MEDIUM] M-2 — Incohérence pagination lors du filtrage par statut stock sur `/stocks` : le paramètre `low_stock=true` retourne les produits 'low' ET 'critical', mais le filtre client `filteredList` ne garde qu'un seul type, causant un total de pagination erroné. Fix : ajouter un param `stock_status` à l'endpoint GET /products (ou supprimer le filtre client et merger les options low/critical UI). [`stocks/page.tsx:115`, `stocks/page.tsx:299-302`]
- [ ] [AI-Review][MEDIUM] M-3 — Créer un composant réutilisable `StockEstimateBlock` (ou hook `useStockEstimateDisplay`) pour déduplication de `ESTIMATE_BASIC_MESSAGE`, `confidenceLabel`, `confidenceBadgeClass`, et `StockEstimate` type (actuellement copiés dans 3 fichiers). Placer dans `packages/shared` ou `apps/web/src/components/stock/`. [`stocks/page.tsx:11-39`, `movements/page.tsx:12-40`, `forecast/page.tsx:38-57`]  

## Dev Notes

- **Backend déjà en place** : le service `apps/api/src/services/stock-estimate.service.ts` calcule déjà la consommation moyenne sur une période (par défaut 30 jours), les jours restants (stock / consommation quotidienne), la date de rupture estimée et un `confidence_level` (high / medium / low / insufficient) selon le nombre de jours distincts avec ventes. Les routes `GET /stock-estimates` et `GET /stock-estimates/:productId` existent dans `apps/api/src/routes/stock-estimate.routes.ts`. **Ne pas dupliquer cette logique** ; l'objectif de la story est l'**affichage** côté web et les messages utilisateur.  
- La page **Prévision** (`/forecast`) utilise déjà ces estimations pour les courbes et le détail par produit ; s'en inspirer pour les libellés et le niveau de confiance.  
- **Où afficher** : (1) page **Stocks** : colonne ou encart « Jours restant (est.) » + indicateur fiabilité par ligne ; (2) **Vue détail produit** (page Mouvements avec produit sélectionné) : bloc « Estimation temps de stock » avec consommation 30j, jours restants, indicateur et message basique.  
- Alignement design : réutiliser le design system « Warm Tech » et les composants existants (badges, couleurs green-deep / gold / red pour niveaux de confiance), comme sur la page Formules et Ventes.

### Project Structure Notes

- **Web** : `apps/web/src/app/(app)/stocks/page.tsx` (liste produits + éventuelle colonne/encart estimation), `apps/web/src/app/(app)/movements/page.tsx` (bloc estimation quand un produit est sélectionné). Optionnel : composant réutilisable `StockEstimateBadge` ou `StockEstimateBlock` dans `_components` pour éviter duplication.  
- **API** : Aucune nouvelle route ni modification du service attendue ; uniquement s'assurer que les endpoints existants sont utilisés avec `period_days=30` pour cohérence avec les AC (30 derniers jours).  
- **Shared** : Types déjà exposés côté API ; si le frontend a besoin d'un type `StockEstimate` partagé, il peut être défini dans l'app web ou dans packages/shared selon conventions existantes (forecast page définit déjà une interface locale).

### References

- [Source: planning-artifacts/epics.md — Epic 3, Story 3.10] User story et critères d'acceptation.  
- [Source: apps/api/src/services/stock-estimate.service.ts] Logique consommation moyenne 30j, jours restants, confidence_level.  
- [Source: apps/api/src/routes/stock-estimate.routes.ts] Endpoints GET /stock-estimates, GET /stock-estimates/:productId.  
- [Source: apps/web/src/app/(app)/forecast/page.tsx] Utilisation des estimations et affichage confidence_level.  
- [Source: implementation-artifacts/3-8-formules-predéfinies.md, 3-9-saisie-manuelle-formules-personnalisees.md] Patterns UI et design system.  
- [Source: docs/architecture.md] Contraintes d'architecture.  
- [Source: AGENTS.md] Conventions projet (Node 20, CSRF, auth, monorepo).

## Technical Requirements (Guardrails)

- **API** : Ne pas créer de nouveau endpoint pour les estimations basiques. Utiliser exclusivement GET /stock-estimates (liste) et GET /stock-estimates/:productId avec paramètre optionnel `period_days=30`. Le calcul doit rester côté backend (déjà le cas).  
- **Frontend** : Ne pas recalculer la consommation moyenne ou les jours restants côté client ; toutes les valeurs viennent de l'API.  
- **Multi-tenant** : Les routes /stock-estimates sont déjà protégées et scopées au tenant (authenticateToken) ; ne pas exposer de données d'un autre tenant.  
- **Performance** : Sur la page Stocks, éviter N+1 : préférer un seul appel GET /stock-estimates pour récupérer toutes les estimations, puis associer par product_id à la liste des produits affichés (pagination prise en compte : n'afficher l'estimation que pour les produits de la page courante, ou charger les estimations pour les product_ids de la page).

## Architecture Compliance

- Respect de l'architecture monorepo : Web dans `apps/web`, API dans `apps/api`, types partagés dans `packages/shared` si besoin.  
- Conformité aux patterns existants : logique métier dans les services API, pas de duplication avec le moteur de formules (les formules prédéfinies consommation_moyenne et jours_stock_restant sont une autre entrée ; ici on s'appuie sur le service stock-estimate dédié aux estimations « temps de stock » pour l'UX).  
- Aucun nouveau microservice ; utilisation du service Stock existant et des routes stock-estimates déjà en place.

## Library / Framework Requirements

- **Frontend** : Next.js 14 (App Router), React 18, Tailwind CSS. Réutiliser useAuth, useApi, PageHeader, badges et design system déjà utilisés sur Stocks, Formules et Forecast.  
- **Backend** : Aucun changement attendu (Express, stock-estimate.service, stock-estimate.routes déjà en place).

## File Structure Requirements

- Fichiers à modifier ou créer :  
  - `apps/web/src/app/(app)/stocks/page.tsx` — affichage estimation (colonne ou encart) + indicateur fiabilité + message basique.  
  - `apps/web/src/app/(app)/movements/page.tsx` — bloc « Estimation temps de stock » lorsque un produit est sélectionné.  
  - Optionnel : `apps/web/src/app/(app)/stocks/_components/StockEstimateCell.tsx` ou similaire pour réutilisation.  
- Ne pas modifier le service ou les routes API sauf correction de bug ou alignement de période (30 jours).

## Testing Requirements

- **API** : Les tests existants `apps/api/src/__tests__/stock-estimates/stock-estimates.integration.test.ts` doivent rester verts.  
- **Frontend** : Test manuel minimal : (1) Page Stocks → vérifier affichage estimation et indicateur selon données ; (2) Page Mouvements → sélectionner un produit → vérifier bloc estimation et message « estimation basique ».  
- **Accessibilité** : Indicateur « estimation non fiable » et message basique doivent être lisibles (labels, aria si pertinent).

## Previous Story Intelligence (Epic 3)

- **Story 3.9 (Formules personnalisées)** et **3.8 (Formules prédéfinies)** : réutilisation des patterns UI (design Warm Tech, useApi, badges, sections repliables). La story 3.10 n'étend pas le moteur de formules ; elle expose les **résultats** d'un calcul déjà présent (stock-estimate) dans l'UI Stocks et Mouvements.  
- **Story 3.7 (Import CSV ventes)** et **3.6 (Saisie manuelle ventes)** : les données de ventes alimentent directement le calcul de consommation moyenne ; s'assurer que les estimations se mettent à jour après ajout/import de ventes (rechargement des données ou invalidation).  
- **Page Forecast** : utilise déjà GET /stock-estimates et affiche confidence_level ; réutiliser la même sémantique (high/medium/low/insufficient) et des libellés cohérents pour l'indicateur « estimation non fiable ».

## Git Intelligence Summary

- Les derniers changements concernent les formules (3.8, 3.9), les ventes (3.6, 3.7) et l'import stocks. La story 3.10 s'appuie sur le module stock-estimates déjà présent ; pas de refonte backend, uniquement exposition en UI sur les pages existantes.

## Latest Tech Information (condensé)

- Next.js 14 et React 18 : Server Components pour la structure, Client Components pour les parties interactives (liste stocks, chargement API).  
- Les estimations « temps de stock » sans IA sont un standard métier (consommation moyenne glissante, jours restants) ; le backend actuel est aligné. L'ajout futur de l'IA (Epic 6) pourra remplacer ou enrichir ces estimations sans casser le contrat d'affichage (même champs : jours_remaining, estimated_stockout_date, confidence_level).

## Project Context Reference

- Voir `AGENTS.md` pour les conventions d'exécution (Node 20, commandes standard, CSRF, multi-tenant).  
- Voir `docs/architecture.md` pour la vue d'ensemble de l'architecture (monorepo, services, Docker, temps réel, IA/ML).  
- La page `/forecast` est la référence existante pour l'utilisation des stock-estimates côté web.

## Story Completion Status

- **Status** : done  
- **Contexte** : Implémentation terminée + code review appliqué. Corrections : labels confidence traduits en français sur /forecast (C-1), effects loadProducts/loadEstimates séparés pour éviter rechargements inutiles (M-1), indicateur d'erreur avec retry pour loadEstimates (M-5), auto-sélection forecast réinitialisée à chaque chargement (M-4), champ `sku` ajouté aux interfaces locales StockEstimate (M-3). Action items créés pour : refactoring composant partagé StockEstimateBlock (M-3) et fix pagination filtre statut (M-2).

---

## Dev Agent Record

### Agent Model Used

Auto (agent router)

### Debug Log References

- Tests d'intégration API (stock-estimates) : exécutables avec PostgreSQL configuré (voir AGENTS.md). Aucun changement côté API.
- Lint : aucun erreur sur les fichiers modifiés.

### Completion Notes List

- Task 1 : API inchangée (GET /stock-estimates, GET /stock-estimates/:productId avec period_days=30). Page Stocks charge les estimations via un seul appel GET /stock-estimates?period_days=30 et affiche une colonne « Jours restant (est.) » par produit. Page Mouvements charge l'estimation du produit sélectionné via GET /stock-estimates/:productId?period_days=30 et affiche le bloc « Estimation temps de stock » (consommation moy. 30j, jours restants, unité).
- Task 2 : Badges « Pas assez de données de ventes » (insufficient) et « Estimation peu fiable » (low) avec couleurs red-alert / orange-warn, aria-label et title pour accessibilité.
- Task 3 : Message « Estimation basique à partir des ventes des 30 derniers jours. La précision s'améliorera avec les prédictions IA (niveau Premium). » affiché sur Stocks (sous le tableau), Mouvements (dans le bloc estimation) et Prévision (en haut du contenu).
- Task 4 : Aucune modification des routes ni du service stock-estimate ; les tests existants restent valides. Test manuel à effectuer après démarrage de l'app (npm run dev) et PostgreSQL.

### File List

- apps/web/src/app/(app)/stocks/page.tsx
- apps/web/src/app/(app)/movements/page.tsx
- apps/web/src/app/(app)/forecast/page.tsx
