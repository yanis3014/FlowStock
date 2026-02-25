# Story 9.5: Graphiques et Prévisions Immersives

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** des courbes de prévision et des graphiques interactifs de qualité professionnelle,  
**so that** je comprends visuellement les tendances et les prévisions de rupture.

## Acceptance Criteria

1. **Given** les pages Stats et Prévisions (forecast) **When** je consulte les courbes ou graphiques **Then** les visualisations utilisent Recharts (ou équivalent) pour un rendu professionnel et interactif.
2. **And** les courbes de prévision montrent la tendance, le niveau de confiance et les dates de rupture estimées.
3. **And** les interactions (zoom, survol pour détails, comparaison de produits) sont disponibles.
4. **And** les graphiques se chargent automatiquement sans bouton « Charger ».
5. **And** un design immersif et cohérent avec la charte (couleurs, typographie) est appliqué.
6. **And** l'accessibilité des graphiques est respectée (labels, aria-live pour mises à jour).

## Tasks / Subtasks

- [x] Task 1 — Page Statistiques (stats) (AC: 1, 4, 5, 6)
  - Remplacer le placeholder `app/(app)/stats/page.tsx`.
  - Appels au montage : GET `/sales/stats`, GET `/sales/summary?group_by=day&date_from=&date_to=` (7j ou 30j), GET `/dashboard/summary` (optionnel pour ventes hier / stock).
  - Graphique des ventes sur période (courbe ou barres par jour) avec Recharts (LineChart ou BarChart).
  - Cartes récap : ventes hier, stock actuel (réutiliser style 9.3 ou dashboard summary).
  - Top produits vendus : GET `/sales/summary?group_by=product` + affichage tableau ou barres.
  - Skeleton pendant chargement. Aucun bouton « Charger ».

- [x] Task 2 — Page Prévisions (forecast) (AC: 1, 2, 3, 4, 5, 6)
  - Remplacer le placeholder `app/(app)/forecast/page.tsx`.
  - Appel GET `/stock-estimates?period_days=30` (ou 7–365 configurable) au montage.
  - Courbes de prévision par produit : tendance de consommation, date de rupture estimée (estimated_stockout_date), niveau de confiance (confidence_level : high/medium/low/insufficient).
  - Comparaison multi-produits : sélection de produits (checkboxes ou multi-select) pour afficher plusieurs courbes.
  - Interactions : survol (tooltip) pour détails ; zoom si Recharts le permet (Brush ou ResponsiveContainer).
  - Couleurs par niveau de confiance : primary/success (high), warning (medium), error (low/insufficient).

- [x] Task 3 — Cohérence visuelle et accessibilité (AC: 5, 6)
  - Appliquer la charte Tailwind (primary, success, warning, error) aux séries et légendes.
  - Labels explicites sur les axes (X : dates, Y : quantités / jours restants).
  - aria-live ou rôle status pour annoncer le chargement et les mises à jour des graphiques.
  - Réduire les animations si `prefers-reduced-motion: reduce` (optionnel).

- [x] Task 4 — Dépendance Recharts
  - Ajouter `recharts` au projet (`npm install recharts`).
  - Utiliser ResponsiveContainer, LineChart/BarChart, XAxis, YAxis, Tooltip, Legend, Line, Bar selon les écrans.

## Dev Notes

### Contexte Epic 9 et dépendances

- **Epic 9** : Migration SPA Next.js. [Source: docs/epic-9-migration-nextjs.md]
- **Stories 9.1–9.4** (done) : Auth, Shell, Dashboard (Skeletons, cartes), Tableaux (DataTable, suppliers, locations, sales).

### APIs existantes

| Endpoint | Rôle |
|----------|------|
| GET `/sales/stats` | Stats rapides : today, yesterday, this_week, this_month (quantity_sold, total_amount, count). |
| GET `/sales/summary` | Agrégations. Query : date_from, date_to, group_by=day \| product \| location. Réponse : groups[] { key, label?, quantity_sold, total_amount, count }. |
| GET `/dashboard/summary` | Résumé dashboard (sales_yesterday, current_stock, alerts) — optionnel pour Stats. |
| GET `/stock-estimates` | Liste estimations par produit. Query : period_days (7–365, défaut 30). |
| GET `/stock-estimates/:productId` | Détail estimation pour un produit. Query : period_days. |

**Réponse GET /stock-estimates** : `{ success, data: [{ product_id, product_name, sku, current_stock, unit, avg_daily_consumption, days_remaining, estimated_stockout_date, confidence_level, sales_days_count, period_days }] }`

[Source: apps/api/src/routes/sales.routes.ts, stock-estimate.routes.ts] — [Source: apps/api/src/services/stock-estimate.service.ts]

### Structure des pages actuelles

- Placeholders : `app/(app)/stats/page.tsx`, `app/(app)/forecast/page.tsx` — texte « Contenu à venir ».
- Réutiliser : useAuth, useApi, Skeleton, charte Tailwind (primary, success, warning, error).

### Recharts

- [Recharts](https://recharts.org/) — Composants React (LineChart, BarChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer).
- Axes : format des dates (fr-FR), format des nombres.
- Tooltip personnalisé pour afficher date, valeur, produit, niveau de confiance selon le graphique.

### Prévisions (courbes)

- Données stock-estimates : pour chaque produit, current_stock, days_remaining, estimated_stockout_date, confidence_level.
- Courbe « tendance » : représentation linéaire de la consommation (stock actuel → 0 à estimated_stockout_date) ou points (aujourd’hui, date rupture). Comparaison = plusieurs lignes (une par produit sélectionné).
- Légende : nom produit + badge confiance (couleur). Tooltip au survol : produit, jours restants, date rupture, niveau de confiance.

### Fichiers cibles

- **À modifier :** `app/(app)/stats/page.tsx`, `app/(app)/forecast/page.tsx`.
- **À créer :** composants optionnels `components/stats/SalesChart.tsx`, `components/forecast/ForecastChart.tsx` si les pages deviennent lourdes.
- **Dépendance :** recharts.

### Références

- [Source: docs/stories/9.5.story.md]
- [Source: docs/front-end-spec.md §4.3] — Courbes de prévision
- [Source: docs/front-end-spec.md §4.5] — Statistiques essentielles
- [Recharts](https://recharts.org/)

### Testing Requirements

- **Manuel** : Stats — chargement auto, graphique ventes par jour, cartes récap, top produits.
- **Manuel** : Prévisions — chargement auto, courbes par produit, sélection multi-produits, tooltip au survol, couleurs par confiance.
- **Manuel** : Accessibilité — axes et légendes lisibles, annonce chargement (aria-live si implémenté).

## Dev Agent Record

### Agent Model Used

(À remplir lors de l'implémentation)

### Debug Log References

### Completion Notes List

- Recharts ajouté (package.json). Stats : GET /sales/stats, /sales/summary?group_by=day (7j/30j), /sales/summary?group_by=product + /products pour noms ; BarChart ventes par jour, BarChart top 10 produits ; cartes récap (ventes hier, semaine, mois, aujourd’hui) ; Skeletons ; aria-live, role region.
- Prévisions : GET /stock-estimates?period_days (7/30/90/365) ; sélection multi-produits (checkboxes) ; LineChart tendance stock (today → date rupture) avec couleurs par confidence_level ; tableau détail produit ; ReferenceLine « aujourd’hui ».

### File List

Modifiés : app/(app)/stats/page.tsx, app/(app)/forecast/page.tsx. Dépendance : recharts (package.json).

## Change Log

| Date       | Version | Description                             | Auteur   |
|------------|---------|-----------------------------------------|----------|
| 2026-02-18 | 0.1     | Création artifact Story 9.5 (create-story) | BMAD/CE  |
| 2026-02-18 | 0.2     | Implémentation : Stats (Recharts, cartes, top produits), Prévisions (courbes, comparaison) | dev-story |
