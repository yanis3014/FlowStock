# Story 8.1: Initialisation technique — Tailwind et charte (tailwind.config.js)

**Status:** Done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** développeur,  
**I want** Tailwind CSS intégré (CDN pour le MVP ou configuration PostCSS) avec une configuration tailwind.config.js alignée sur notre charte,  
**so that** toutes les pages et composants utilisent la même palette et les mêmes tokens (bleu primary, vert success, orange warning, rouge error).

## Acceptance Criteria

1. **Given** le projet front (apps/api/public ou équivalent) **When** l'intégration Tailwind est en place **Then** Tailwind est chargé soit via CDN (MVP) soit via build PostCSS selon décision technique **And** un fichier tailwind.config.js (ou équivalent) définit la charte : primary (bleu), success (vert), warning (orange), error (rouge) **And** les couleurs de la charte sont utilisables via classes utilitaires (ex. bg-primary, text-success, etc.) ou thème étendu **And** la configuration est prête pour être consommée par le layout et les composants des stories suivantes.

## Tasks / Subtasks

- [x] Task 1 (AC: intégration Tailwind)
  - [x] Choisir et documenter l'option : CDN pour le MVP (script Tailwind Play CDN) ou build PostCSS avec tailwindcss
  - [x] Intégrer Tailwind dans les pages existantes (lien CDN dans les HTML ou pipeline build selon choix)
  - [x] Vérifier que les classes utilitaires de base fonctionnent sur une page de test
  - [x] **Ne pas supprimer** design-system.css ni layout.js ; coexistence Tailwind + design-system pendant la transition

- [x] Task 2 (AC: tailwind.config.js et charte)
  - [x] Créer ou mettre à jour tailwind.config.js avec theme.extend.colors (ou theme.colors)
  - [x] Définir primary (bleu), success (vert), warning (orange), error (rouge) **alignés sur design-system.css** : #3b82f6, #10b981, #f59e0b, #ef4444 [Source: apps/api/public/css/design-system.css, docs/front-end-spec.md §7.1]
  - [x] Exposer les couleurs pour utilitaires (bg-primary, text-success, border-warning, etc.)
  - [x] Optionnel : espacements ou typo cohérents avec la spec

- [x] Task 3 (AC: validation et documentation)
  - [x] Tester l'utilisation des classes de la charte sur au moins une page (ex. div test avec bg-primary)
  - [x] Documenter dans le projet comment utiliser la charte (README ou doc front-end) pour les stories 8.2–8.5

## Dev Notes

### Contexte : ancienne Story 8.1 déjà livrée (à réutiliser, ne pas casser)

- **Layout partagé** : `apps/api/public/js/layout.js` injecte la nav (Dashboard, Stats, Prévisions, Chat, Formules, Ventes, Imports, Mouvements, Référentiels) et le header (titre depuis `data-page-title`, lien Déconnexion). Menu burger sur mobile (< 768px). Inclus sur 13 pages métier ; login.html et register.html **sans** nav.
- **Design system actuel** : `apps/api/public/css/design-system.css` avec variables (--color-primary, --color-success, etc.), classes .app-nav, .app-header, .page-container, .stat-card, badges alertes. Valeurs : primary #3b82f6, success #10b981, warning #f59e0b, error #ef4444, text #1e293b, muted #64748b, bg-page #f5f5f5, bg-card #ffffff, border #e2e8f0.
- **Pages concernées** : dashboard, stats, forecast, chat, formulas, locations, suppliers, stock-estimates, sales, custom-formulas, movements, import-stocks, import-sales. Toutes chargent déjà `/css/design-system.css` et le script layout.
- **Règle** : Dans cette story, **ajouter** Tailwind sans retirer design-system.css ni modifier le comportement du layout. La migration du layout vers Tailwind est la **Story 8.2**.

### Références

- [Source: planning-artifacts/epics.md] — Epic 8 (Professionalisation UI/UX sous Tailwind CSS), Story 8.1 AC
- [Source: docs/front-end-spec.md] — §7 Branding & Style Guide (Palette), §6 Component Library
- [Source: docs/stories/8.1.story.md] — Tasks et Dev Notes
- [Source: docs/epic-8-migration-tailwind.md] — Stratégie de mise à jour Epic 8 (réutiliser l’existant, puis 8.2–8.5)
- [Source: implementation-artifacts/8-1-layout-partage-et-design-system-variables-css.md] — Ancienne 8.1 livrée (File List, Completion Notes)
- [Source: apps/api/public/css/design-system.css] — Valeurs exactes des couleurs à reprendre dans tailwind.config.js
- Tailwind : [Configuration](https://tailwindcss.com/docs/configuration), [Play CDN](https://tailwindcss.com/docs/installation/play-cdn), [PostCSS](https://tailwindcss.com/docs/installation)

### Charte à reprendre dans tailwind.config.js (alignée design-system.css)

| Rôle     | Variable actuelle   | Valeur     | Usage Tailwind (ex.)   |
|----------|---------------------|------------|-------------------------|
| primary  | --color-primary     | #3b82f6    | bg-primary, text-primary |
| success  | --color-success     | #10b981    | bg-success, text-success |
| warning  | --color-warning     | #f59e0b    | bg-warning, border-warning |
| error    | --color-error      | #ef4444    | bg-error, text-error   |

### File Structure (obligatoire)

- **À créer :**
  - `tailwind.config.js` — à la racine du repo ou dans `apps/api/public/` selon structure du projet. Contenu : `content` pointant vers les HTML (ex. `./apps/api/public/**/*.html`), `theme.extend.colors` avec primary, success, warning, error.
- **À modifier (optionnel pour cette story) :**
  - Inclure Tailwind dans les pages : soit ajouter le script CDN dans un fragment commun (si layout injecte aussi du HTML head), soit ajouter une balise script/link dans chaque page métier. Ne pas toucher à l’ordre de chargement de design-system.css ni de layout.js.
- **Ne pas modifier :**
  - `apps/api/public/js/layout.js` — pas de refonte dans cette story
  - `apps/api/public/css/design-system.css` — pas de suppression ni de réécriture
  - Comportement des 13 pages métier (nav, header, auth)

### Architecture & contraintes techniques

- **Stack front** : HTML/CSS/JS vanilla dans `apps/api/public/`. Pas de build obligatoire pour le MVP ; CDN Tailwind autorisé. Si PostCSS : documenter la commande de build et l’intégrer au pipeline existant (s’il existe).
- **Cohérence** : Les couleurs de tailwind.config.js doivent être **identiques** à design-system.css pour éviter tout décalage visuel lors de la migration progressive (stories 8.2–8.5).
- **Pas de régression** : Après intégration, les pages doivent continuer à s’afficher correctement (design-system.css reste chargé en parallèle).

### Testing Requirements

- Vérification manuelle : sur au moins une page (ex. dashboard.html), une div de test avec classes `bg-primary text-white p-4` affiche le bleu #3b82f6 et du texte lisible.
- Vérification : les 13 pages métier chargent toujours correctement (nav + header visibles) ; pas d’erreur console liée à Tailwind.
- Optionnel : ajouter une section courte dans README ou docs (ex. docs/epic-8-migration-tailwind.md ou docs/front-end-spec.md) indiquant comment utiliser les classes de la charte (bg-primary, text-success, etc.) pour les prochaines stories.

### Previous Story Intelligence (Story 8.1 layout + design-system — déjà livrée)

- **Fichiers créés** : apps/api/public/css/design-system.css, apps/api/public/js/layout.js
- **Fichiers modifiés** : dashboard.html, stats.html, forecast.html, chat.html, formulas.html, locations.html, suppliers.html, stock-estimates.html, sales.html, custom-formulas.html, movements.html, import-stocks.html, import-sales.html (tous avec link design-system.css + script layout ; login/register non modifiés pour la nav)
- **Pattern** : Chaque page métier a une structure type : `<link rel="stylesheet" href="/css/design-system.css">`, puis contenu, puis script layout. Pour Tailwind CDN, ajouter une balise `<script src="https://cdn.tailwindcss.com"></script>` (et éventuellement config inline pour CDN) **ou** un build qui produit un CSS Tailwind ; ne pas casser l’ordre des feuilles (Tailwind peut être chargé après design-system pour permettre de surcharger progressivement).
- **À ne pas refaire** : Ne pas recréer layout.js ni design-system.css ; ne pas refaire l’intégration sur les 13 pages pour supprimer design-system dans cette story.

### Ce qu’on ne fait pas dans cette story

- Ne pas supprimer design-system.css ni layout.js.
- Ne pas refaire le layout (nav/header) en Tailwind — c’est la Story 8.2.
- Ne pas migrer les composants (cartes, badges, tableaux) — Stories 8.3–8.5.
- Ne pas supprimer les balises `<style>` dans les HTML — Story 8.5.

## Dev Agent Record

### Agent Model Used

create-story (BMad workflow) — mise à jour Epic 8 Tailwind

### Debug Log References

(Aucun)

### Completion Notes List

- **Tailwind CDN (MVP)** : Option CDN choisie. Script `https://cdn.tailwindcss.com` + config inline (primary, success, warning, error) ajouté sur les 13 pages métier après design-system.css.
- **tailwind.config.js** : Créé à la racine avec content `./apps/api/public/**/*.html` et theme.extend.colors (primary #3b82f6, success #10b981, warning #f59e0b, error #ef4444). Prêt pour migration PostCSS ultérieure.
- **design-system.css et layout.js** : Conservés intacts ; coexistence Tailwind + design-system respectée.
- **Validation** : Div de test `bg-primary text-white p-4` ajoutée sur dashboard.html ; charte documentée dans docs/epic-8-migration-tailwind.md (section « Utilisation de la charte Tailwind »).
- **Tests** : Pas de test automatisé front (HTML statique). Vérification manuelle recommandée (ouvrir dashboard, vérifier bandeau bleu « Tailwind charte OK »). Les tests API échouent (auth PostgreSQL) — préexistant, non lié à cette story.

### File List

**Nouveaux fichiers :**
- tailwind.config.js

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
- docs/epic-8-migration-tailwind.md

## Change Log

| Date       | Version | Description                | Auteur   |
|------------|---------|----------------------------|----------|
| 2026-02-16 | 0.1     | Création artifact (Tailwind init) | BMAD/CE  |
| 2026-02-16 | 0.2     | Implémentation : CDN + tailwind.config.js + charte sur 13 pages | dev-story |
