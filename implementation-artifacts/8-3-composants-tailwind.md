# Story 8.3: Conversion des composants — Cartes, badges et tableaux en Tailwind

**Status:** Done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** utilisateur,  
**I want** les cartes du dashboard, les badges de fiabilité (estimations) et les lignes de tableau rendus avec des composants Tailwind harmonisés,  
**so that** l'interface est cohérente et facile à maintenir.

## Acceptance Criteria

1. **Given** je consulte le dashboard (cartes avec bordure, blocs d'alertes) **When** la page est affichée **Then** les cartes utilisent des classes Tailwind pour bordures, ombres et espacements (composants harmonisés).
2. **Given** je consulte les estimations (stock-estimates ou équivalent) avec badges de fiabilité **When** les niveaux de confiance sont affichés **Then** les badges utilisent les couleurs de la charte Tailwind (success, warning, error) de façon cohérente.
3. **Given** je consulte une page avec tableaux (lignes, en-têtes) **When** le tableau est rendu **Then** les lignes et en-têtes utilisent des classes Tailwind (bordures, padding, états hover) sans styles inline ni `<style>` internes.

## Tasks / Subtasks

- [x] Task 1 — Cartes du dashboard
  - Identifier les cartes (blocs avec bordure, fond, ombre) sur dashboard.html
  - Remplacer les styles (CSS custom ou variables) par classes Tailwind : border, rounded, shadow, p-*, bg-*, gap
  - Harmoniser l'apparence entre toutes les cartes (même système de bordures et espacements)

- [x] Task 2 — Badges de fiabilité (estimations)
  - Sur stock-estimates.html (ou page équivalente), identifier les badges de niveau de confiance (bas, moyen, élevé)
  - Appliquer les couleurs de la charte : success (élevé), warning (moyen), error (bas) via classes Tailwind (bg-success, text-warning, etc.)
  - Garder les contrastes ≥ 4,5:1 (WCAG AA)

- [x] Task 3 — Lignes de tableau
  - Repérer les tableaux dans l'app (dashboard, estimations, mouvements, référentiels, etc.)
  - Remplacer les styles des en-têtes et des lignes par Tailwind : table-auto ou grid, border, padding, hover:bg-*
  - Supprimer tout style inline ou `<style>` local utilisé pour ces tableaux

## Dev Notes

### Contexte (Stories 8.1 et 8.2 livrées)

- **Story 8.1** : Tailwind + charte (primary, success, warning, error). [Source: implementation-artifacts/8-1-tailwind-init.md]
- **Story 8.2** : Layout (nav + header) en Tailwind. design-system.css conserve .page-container, .stat-card, variables, etc. [Source: implementation-artifacts/8-2-layout-tailwind.md]

### Patterns Tailwind à réutiliser

| Composant | Classes recommandées (ex.) |
|-----------|----------------------------|
| Carte     | rounded-lg border border-gray-200 bg-white shadow p-4 (ou p-6), gap-4 pour contenu |
| Badge     | rounded-full px-2 py-0.5 text-xs font-medium ; bg-success text-white, bg-warning text-gray-900, bg-error text-white |
| Tableau   | table-auto w-full ; thead th: border-b border-gray-200 bg-gray-50 px-4 py-2 text-left ; tbody tr: border-b border-gray-100 hover:bg-gray-50 ; td: px-4 py-2 |

### Références

- [Source: docs/stories/8.3.story.md] — AC et Tasks
- [Source: docs/front-end-spec.md] — §6 Component Library, §7 Palette, §8 Accessibilité
- [Source: apps/api/public/css/design-system.css] — règles .stat-card, .page-container, variables à remplacer progressivement pour cartes/tableaux

### Fichiers concernés

- **Dashboard :** apps/api/public/dashboard.html — cartes et blocs d'alertes
- **Estimations :** apps/api/public/stock-estimates.html — badges de confiance
- **Tableaux :** dashboard, stock-estimates, movements.html, locations.html, suppliers.html, etc.

### Cohérence

- Réutiliser les mêmes patterns Tailwind pour cartes (ex. rounded-lg border bg-white shadow) et badges (rounded-full px-2 py-0.5 text-xs + couleur charte) sur tout le projet.

### Testing Requirements

- Vérification manuelle : dashboard affiche cartes harmonisées ; stock-estimates affiche badges success/warning/error lisibles ; tableaux avec bordures, padding et hover cohérents.
- Accessibilité : contrastes badges ≥ 4,5:1 (WCAG AA).

## Dev Agent Record

### Completion Notes

- **dashboard.html** : Bloc `<style>` supprimé. Cartes stats en `rounded-lg border border-gray-200 bg-white shadow p-5 border-l-4` (sales=border-l-success, stock=border-l-primary, alerts=border-l-error, actions=border-l-warning). Sections en même pattern. Alertes avec classes Tailwind (bg-red-50 border-l-error, badges bg-error text-white, etc.). Product cards et stock badges en Tailwind. Actions list en flex Tailwind.
- **stock-estimates.html** : Bloc `<style>` supprimé. Sections et bannière en Tailwind. Badges confiance : high=bg-success text-white, medium=bg-warning text-gray-900, low=bg-amber-200 text-amber-900, insufficient=bg-error text-white. Tableau avec thead th (border-b bg-gray-50 px-4 py-2), tbody tr (hover:bg-gray-50), td (px-4 py-2). Urgence jours en classes Tailwind.
- **movements.html, locations.html, suppliers.html** : Bloc `<style>` supprimé. Sections en `rounded-lg border border-gray-200 bg-white shadow p-5`. Tableaux avec classes Tailwind (thead th, tbody tr hover, td). Boutons en bg-primary / bg-error.
- **design-system.css** : Règles .card, .stat-card, .section et badges (alert-badge, stock-badge) commentées/supprimées (migrées Tailwind).

## Change Log

| Date       | Version | Description                | Auteur   |
|------------|---------|----------------------------|----------|
| 2026-02-16 | 0.1     | Création artifact Story 8.3 (create-story) | BMAD/CE  |
| 2026-02-16 | 0.2     | Implémentation : cartes, badges, tableaux Tailwind | dev-story |
