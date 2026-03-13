# Story 4.5: Statistiques Essentielles

**Status:** Done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** voir des statistiques de mes ventes et stocks,  
**so that** je peux comprendre mes tendances basiques.

## Acceptance Criteria

**Given** je suis un utilisateur authentifié  
**When** je consulte les statistiques  
**Then** les ventes de la veille sont affichées  
**And** un graphique des ventes sur période (7 jours, 30 jours) est disponible  
**And** le stock actuel total est affiché (valeur, quantité)  
**And** le top produits vendus est affiché (selon niveau abonnement)  
**And** l'interface statistiques est simple et claire  
**And** l'export des données en CSV fonctionne (selon niveau abonnement)

## Tasks / Subtasks

- [x] Task 1 (AC: ventes veille) – Réutiliser / exposer ventes veille
  - [x] S’appuyer sur GET `/dashboard/summary` (déjà : `sales_yesterday.total_amount`, `transaction_count`, `change_percent`) ou GET `/sales/stats` (yesterday)
  - [x] Afficher dans la section statistiques / dashboard existant si pas de page dédiée

- [x] Task 2 (AC: graphique ventes 7j / 30j) – Graphique des ventes sur période
  - [x] Appeler GET `/sales/summary?group_by=day` avec `date_from` / `date_to` (7 derniers jours et 30 derniers jours)
  - [x] Afficher un graphique (ex. courbe ou barres) : axe X = jour, axe Y = montant ou quantité
  - [x] Sélecteur ou onglets 7j / 30j pour la période
  - [x] Gérer états vides (aucune vente sur la période)

- [x] Task 3 (AC: stock actuel total) – Stock actuel (valeur, quantité)
  - [x] Réutiliser `current_stock` de GET `/dashboard/summary` (total_value, product_count, low_stock_count, critical_stock_count)
  - [x] Afficher dans la vue statistiques de façon lisible

- [x] Task 4 (AC: top produits vendus) – Top produits vendus
  - [x] Appeler GET `/sales/summary?group_by=product` avec `date_from` / `date_to` (ex. 7j ou 30j)
  - [x] Trier par quantité vendue ou montant (desc), limiter (ex. top 10)
  - [x] Restriction selon niveau abonnement si définie (ex. Premium pour top produits détaillé) ; sinon afficher pour tous en MVP
  - [x] Afficher liste ou tableau : produit (nom/SKU), quantité vendue, montant

- [x] Task 5 (AC: interface simple et claire) – UI statistiques
  - [x] Page ou section dédiée « Statistiques » (ex. `stats.html` ou section dans dashboard)
  - [x] Design cohérent avec dashboard (palette, cartes, responsive)
  - [x] Accessibilité WCAG AA (labels, contrastes) [Source: docs/prd.md]

- [x] Task 6 (AC: export CSV) – Export CSV
  - [x] Bouton « Exporter en CSV » pour les données affichées (ventes par jour et/ou top produits)
  - [x] Restriction selon niveau abonnement si définie ; sinon activer pour tous en MVP
  - [x] Génération côté client (données déjà chargées) ou endpoint GET `/sales/summary` + export CSV côté API (optionnel)

## Dev Notes

### Previous Story Insights (4.4, 4.2)

- **Story 4.4** : Dashboard avec section Alertes, filtres (sessionStorage), seuil configurable, notifications. Fichiers : `apps/api/public/dashboard.html`, `apps/api/src/services/dashboard.service.ts`, `apps/api/src/routes/dashboard.routes.ts`. Tests : `dashboard.integration.test.ts`, `e2e/tests/dashboard.spec.ts`. Pas de TypeScript dans les scripts HTML (JS pur).
- **Story 4.2** : GET `/dashboard/summary` livre déjà `sales_yesterday`, `current_stock`, `alerts`, `pending_orders`. Cartes stats sur le dashboard. Réutiliser le même pattern (api-client.js, JWT, responsive).
- **API existantes** : GET `/dashboard/summary` (ventes hier, stock, alertes), GET `/sales/stats` (today, yesterday, this_week, this_month), GET `/sales/summary?group_by=day|product|location` avec `date_from`, `date_to` [Source: apps/api/src/routes/sales.routes.ts, sales.service.ts].

### Data Models & API

- **Dashboard summary** : [Source: docs/api-specifications.md#10-dashboard-service]  
  - `sales_yesterday`: total_amount, transaction_count, change_percent  
  - `current_stock`: total_value, product_count, low_stock_count, critical_stock_count  
- **GET /sales/stats** : today, yesterday, this_week, this_month (quantity_sold, total_amount, count) [Source: apps/api/src/services/sales.service.ts getSalesStats].  
- **GET /sales/summary** : query `group_by=day|product|location`, `date_from`, `date_to`. Réponse `groups[]` : key, quantity_sold, total_amount, count [Source: apps/api/src/routes/sales.routes.ts, sales.service.ts getSalesSummary].  
- **Abonnement** : GET `/subscriptions/current` pour restreindre top produits / export selon tier (Normal / Premium / Premium+) si besoin [Source: docs/api-specifications.md].

### File Locations

- **Frontend** : [Source: docs/architecture.md, Story 4.2/4.4]  
  - Page ou section stats : `apps/api/public/stats.html` ou extension de `dashboard.html` (lien « Statistiques »).  
  - Même stack : HTML + api-client.js, JWT, CSS inline ou commun.  
  - Graphique : librairie légère (Chart.js, ou SVG/Canvas manuel pour MVP).  
- **Backend** : Aucune nouvelle route obligatoire pour MVP ; utiliser GET `/dashboard/summary`, GET `/sales/stats`, GET `/sales/summary`. Si export CSV côté serveur : optionnel GET `/sales/export?format=csv&group_by=day&date_from=&date_to=`.

### Technical Constraints

- **Accessibilité** : WCAG AA (contrastes, labels) [Source: docs/prd.md].  
- **Responsive** : Desktop + mobile [Source: planning-artifacts/ux-design-specification.md].  
- **Performance** : Éviter surcharge ; réutiliser cache ou requêtes existantes (dashboard summary déjà chargé).  
- **NFR1** : Temps de chargement < 2 secondes pour les vues principales.

### Architecture Compliance

- Pas de nouveau service backend requis si utilisation exclusive de `dashboard.service` et `sales.service` existants.  
- Frontend : même convention que dashboard (apps/api/public/*.html, BmadApiClient, token getter).  
- Multi-tenant : toutes les APIs sont déjà scopées par tenant (JWT).

### Testing Requirements

- **Backend** : Les endpoints utilisés sont déjà couverts (dashboard.integration.test.ts, sales.integration.test.ts GET /sales/summary). Ajouter si besoin un test d’intégration pour une éventuelle route d’export CSV.  
- **Frontend** : Tests manuels ou E2E pour : ouverture page/section stats, affichage ventes veille, graphique 7j/30j, top produits, export CSV (si implémenté).  
- **E2E** : Scénario Playwright : utilisateur authentifié ouvre Statistiques, voit ventes veille + graphique + stock total + top produits, clique export CSV si disponible.

### References

- [Source: docs/api-specifications.md#10-dashboard-service] — Dashboard summary  
- [Source: docs/api-specifications.md] — Sales (GET /sales, GET /sales/stats, GET /sales/summary)  
- [Source: docs/prd.md] — FR16 (statistiques essentielles, tendances basiques ; analyses avancées en V2)  
- [Source: planning-artifacts/epics.md] — Epic 4, Story 4.5  
- [Source: apps/api/src/services/sales.service.ts] — getSalesStats, getSalesSummary  
- [Source: apps/api/src/services/dashboard.service.ts] — getDashboardSummary

## Dev Agent Record

### Agent Model Used

Dev-story workflow (BMad).

### Debug Log References

*(Aucun)*

### Completion Notes List

- Page `stats.html` créée : ventes hier et stock actuel via GET `/dashboard/summary`, graphique 7j/30j via GET `/sales/summary?group_by=day`, top produits via GET `/sales/summary?group_by=product` + mapping noms via GET `/products`. Export CSV côté client (ventes par jour + top produits). Chart.js (CDN) pour le graphique en barres. Lien « Statistiques » ajouté sur le dashboard. Route `/stats-page` dans index.ts. Tests E2E dans `e2e/tests/stats.spec.ts`.

### File List

| Fichier | Rôle |
|---------|------|
| `apps/api/public/stats.html` | Page Statistiques : ventes hier, stock actuel, graphique 7j/30j (Chart.js), top produits, export CSV. |
| `apps/api/src/index.ts` | Route GET `/stats-page` → stats.html. |
| `apps/api/public/dashboard.html` | Lien « Statistiques » vers /stats-page. |
| `e2e/tests/stats.spec.ts` | E2E : chargement stats, ventes/stock, onglets chart, top produits, bouton export. |

## Change Log

| Date       | Version | Description                | Author   |
|------------|---------|----------------------------|----------|
| 2026-02-09 | 0.1     | Création story 4.5 (create-story) | BMad SM  |
| 2026-02-09 | 0.2     | Implémentation complète (stats.html, graphique, top produits, export CSV, E2E) | Dev Agent |
