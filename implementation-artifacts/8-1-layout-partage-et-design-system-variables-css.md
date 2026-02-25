# Story 8.1: Layout Partagé et Design System (variables CSS)

> **Changement stratégique (2026-02-16) :** L'Epic 8 a été refocalisée sur **Tailwind CSS** (abandon des variables CSS natives). Les specs à jour sont dans `planning-artifacts/epics.md` et `docs/stories/8.1.story.md` à `8.5.story.md`. Ce document reste en archive pour l’historique (layout partagé déjà livré ; la charte et les styles seront migrés vers Tailwind dans les nouvelles stories 8.1–8.5).

**Status:** superseded (Epic 8 Tailwind)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** utilisateur,  
**I want** une barre de navigation et un header commun sur toutes les pages métier,  
**so that** je navigue de façon cohérente et l'identité visuelle est unifiée.

## Acceptance Criteria

1. **Given** je suis sur une page métier (dashboard, stats, chat, formules, import, etc.) **When** la page est chargée **Then** un layout partagé affiche la barre de navigation (liens Dashboard, Stats, Prévisions, Chat, Formules, Ventes, Imports, Mouvements, Référentiels) **And** le header affiche le titre de la page courante et un lien Déconnexion (ou profil) si authentifié.
2. **And** les pages login et register n'affichent pas la nav applicative.
3. **And** un fichier design-system.css centralise toutes les variables CSS (couleurs, typo, espacements).
4. **And** les couleurs utilisent les variables (--color-primary, --color-success, --color-warning, --color-error, --color-text, --color-bg-page, --color-bg-card, --color-border).
5. **And** un changement de variable (ex. bleu primaire) se répercute sur toutes les pages utilisant le layout.
6. **And** les contrastes pour les badges d'alerte respectent ≥ 4,5:1 (WCAG AA).

## Tasks / Subtasks

- [x] Task 1 (AC: layout partagé nav + header)
  - [x] Créer layout.js (ou composant équivalent) avec barre de navigation et zone header
  - [x] Inclure le layout sur toutes les pages sous `apps/api/public/` sauf login.html et register.html
  - [x] Navigation : Dashboard, Stats, Prévisions (forecast), Estimations (stock-estimates), Chat, Formules, Ventes, Imports, Mouvements, Référentiels (locations, suppliers)
  - [x] Header : titre de la page courante + lien Déconnexion si authentifié
  - [x] Adapter pour mobile : menu burger si nécessaire (breakpoint < 768px)

- [x] Task 2 (AC: design-system.css et variables)
  - [x] Créer design-system.css avec variables (couleurs, typo, espacements)
  - [x] Définir --color-primary, --color-secondary, --color-success, --color-warning, --color-error, --color-text, --color-text-muted, --color-bg-page, --color-bg-card, --color-border
  - [x] Définir --font-size-*, --line-height-*, --space-* selon docs/front-end-spec.md §7
  - [x] Valeurs d'exemple alignées avec l'existant : primary #3b82f6, success #10b981, warning #f59e0b, error #ef4444, text #1e293b, muted #64748b, bg-page #f5f5f5, bg-card #ffffff, border #e2e8f0
  - [x] Vérifier contrastes badges (high/medium/low) ≥ 4,5:1

- [x] Task 3 (AC: intégration pages existantes)
  - [x] Remplacer les nav/header dupliqués dans chaque HTML par l'inclusion du layout partagé
  - [x] Remplacer les styles inline et `<style>` par page par des classes utilisant les variables du design-system.css
  - [x] S'assurer qu'un changement de variable (ex. --color-primary) met à jour toutes les pages concernées

## Dev Notes

### Contexte Epic 8

- **Epic 8 : Professionalisation UI/UX & Architecture Front-end** — Référence docs/front-end-spec.md. Valeur : interface unifiée, résiliente, actionnable, UX soignée.
- **Stories suivantes :** 8.2 (api-client 401/403 + spinner), 8.3 (dashboard actionnable + chat contexte), 8.4 (what-if + confiance IA), 8.5 (skeletons + nettoyage import IA). Cette story pose les fondations (layout + design system) utilisées par toutes les autres.

### État actuel du front (apps/api/public)

- **Existant :** Pages HTML avec styles inline ou `<style>` par page (ex. dashboard.html : couleurs en dur #3b82f6, #10b981, #f5f5f5, etc.). Pas de layout partagé ; chaque page répète sa propre structure (header, couleurs). api-client.js chargé sur les pages métier.
- **Fichiers clés :** dashboard.html, stats.html, forecast.html, chat.html, formulas.html, locations.html, suppliers.html, login.html, register.html, api-client.js. Pas encore de css/ ni de js/layout.js.
- **À préserver :** Ne pas casser le comportement des pages (auth, appels API). Login et register doivent rester sans nav applicative.

### Architecture & contraintes techniques

- **Stack front :** HTML/CSS/JS vanilla dans `apps/api/public/`. Pas de librairie tierce imposée pour le layout et le design system (spec §6).
- **Layout :** Un seul composant (layout.js ou équivalent) rend la nav + header ; inclus sur toutes les pages sauf login/register. [Source: docs/front-end-spec.md §3.2, §6]
- **Design system :** Fichier unique design-system.css avec variables CSS ; un changement (ex. bleu primaire) met à jour toute l’app. [Source: docs/front-end-spec.md §7.1, §12 point 2]
- **Accessibilité :** Contraste ≥ 4,5:1 pour les badges d’alerte (high/medium/low). [Source: docs/front-end-spec.md §8]
- **Responsive :** Breakpoints mobile < 768px, tablette 768–1024px, desktop > 1024px ; nav en barre horizontale sur desktop, menu repliable (burger) sur mobile. [Source: docs/front-end-spec.md §9]

### File Structure (obligatoire)

- **À créer :**
  - `apps/api/public/css/design-system.css` — variables : --color-primary, --color-secondary, --color-success, --color-warning, --color-error, --color-text, --color-text-muted, --color-bg-page, --color-bg-card, --color-border ; --font-size-*, --line-height-*, --space-* ; valeurs §7.1 spec.
  - `apps/api/public/js/layout.js` (ou équivalent) — injection de la barre de navigation + header (titre page, lien Déconnexion), lecture du titre depuis data-attribute ou config par page.
- **À modifier :** Toutes les pages métier dans `apps/api/public/` : inclure `<link rel="stylesheet" href="/css/design-system.css">` et le script layout ; retirer duplication nav/header et remplacer couleurs en dur par classes utilisant les variables (ex. .stat-card { border-left-color: var(--color-primary); }).
- **Ne pas modifier (structure) :** login.html, register.html — ne pas y inclure la nav applicative.

### Composants Design System (spec §6)

- **Layout (nav + header) :** Desktop = barre horizontale ; mobile = menu repliable (burger). Inclus sur toutes les pages sauf login/register.
- **Page container :** Zone de contenu principal sous le header (max-width, padding cohérent).
- **Palette (variables) :** [Source: docs/front-end-spec.md §7.1] primary, secondary, success, warning, error, text, text-muted, bg-page, bg-card, border. Exemple de valeurs : primary #3b82f6, success #10b981, warning #f59e0b, error #ef4444, text #1e293b, muted #64748b, bg-page #f5f5f5, bg-card #ffffff, border #e2e8f0. Vérifier contraste 4,5:1 sur badges.

### Testing Requirements

- Vérification manuelle : toutes les pages métier affichent la même nav et le header avec titre correct ; login/register sans nav.
- Vérification : modifier --color-primary dans design-system.css et constater le changement sur plusieurs pages.
- Accessibilité : vérifier contraste des badges (ex. dashboard alertes high/medium/low) avec outil type Lighthouse ou axe-core (≥ 4,5:1).
- Optionnel : test E2E Playwright sur une page (dashboard) pour nav visible et lien Déconnexion présent si authentifié.

### Références

- [Source: planning-artifacts/epics.md] — Epic 8, Story 8.1 (AC complets)
- [Source: docs/front-end-spec.md] — §3.1 Site Map, §3.2 Navigation Structure, §6 Component Library, §7 Branding & Style Guide, §8 Accessibility, §9 Responsiveness, §12 Next Steps (points 1–2)
- [Source: docs/stories/8.1.story.md] — Tasks détaillées et Dev Notes
- [Source: apps/api/public/dashboard.html] — Exemple de structure et couleurs actuelles à migrer vers variables

## Dev Agent Record

### Agent Model Used

create-story (BMad workflow)

### Debug Log References

(Aucun)

### Completion Notes List

- Layout partagé : `js/layout.js` injecte la nav (liens Dashboard, Stats, Prévisions, etc.) et le header (titre depuis data-page-title + lien Déconnexion). Menu burger sur mobile (< 768px).
- Design system : `css/design-system.css` avec variables (couleurs, typo, espacements), classes .app-nav, .app-header, .page-container, .stat-card, badges alertes (contraste ≥ 4,5:1).
- Intégration : 13 pages métier modifiées (dashboard, stats, forecast, chat, formulas, locations, suppliers, stock-estimates, sales, custom-formulas, movements, import-stocks, import-sales). Login et register laissés sans nav.
- Vérification manuelle : ouvrir une page métier → nav + header visibles ; modifier --color-primary dans design-system.css → changement visible sur les pages.

### File List

**Nouveaux fichiers :**
- apps/api/public/css/design-system.css
- apps/api/public/js/layout.js

**Fichiers modifiés :**
- apps/api/public/dashboard.html
- apps/api/public/stats.html
- apps/api/public/forecast.html
- apps/api/public/chat.html
- apps/api/public/formulas.html
- apps/api/public/locations.html
- apps/api/public/suppliers.html
- apps/api/public/stock-estimates.html
- apps/api/public/sales.html
- apps/api/public/custom-formulas.html
- apps/api/public/movements.html
- apps/api/public/import-stocks.html
- apps/api/public/import-sales.html
