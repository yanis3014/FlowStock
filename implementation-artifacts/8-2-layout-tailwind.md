# Story 8.2: Refonte du Layout partagé — Navigation et header en Tailwind

**Status:** Done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** utilisateur,  
**I want** une barre de navigation et un header commun sur toutes les pages métier, stylés avec des classes utilitaires Tailwind,  
**so that** je navigue de façon cohérente et l'identité visuelle est unifiée sans CSS custom ni variables CSS natives.

## Acceptance Criteria

1. **Given** je suis sur une page métier (dashboard, stats, chat, formules, import, etc.) **When** la page est chargée **Then** un layout partagé affiche la barre de navigation (liens Dashboard, Stats, Prévisions, Chat, Formules, Ventes, Imports, Mouvements, Référentiels) **And** le header affiche le titre de la page courante et un lien Déconnexion (ou profil) si authentifié **And** la navigation et le header utilisent **exclusivement** des classes utilitaires Tailwind (remplacement du CSS custom) **And** les pages login et register n'affichent pas la nav applicative **And** les contrastes pour les badges d'alerte respectent ≥ 4,5:1 (WCAG AA).

## Tasks / Subtasks

- [x] Task 1 — Identifier et remplacer le CSS du layout
  - Repérer le layout partagé actuel : `apps/api/public/js/layout.js` (injecte nav + header), styles dans `apps/api/public/css/design-system.css` (.app-nav, .app-header, .nav-toggle, .logout-link, .active, media 767px)
  - Remplacer les classes CSS custom par des classes Tailwind dans layout.js : au lieu de `navEl.className = 'app-nav'`, utiliser des classes Tailwind (ex. bg-white border-b border-gray-200 px-4 py-2, flex, gap-2, etc.)
  - Supprimer ou commenter dans design-system.css uniquement les règles liées au layout (nav + header) ; garder le reste (variables, .page-container, .stat-card, etc.) pour les stories 8.3–8.5

- [x] Task 2 — Navigation et header en Tailwind
  - Barre de navigation : conteneur flex, liens avec padding/rounded, hover (bg-gray-100 ou bg-secondary), lien actif (bg-primary text-white) — classes Tailwind uniquement
  - Header : flex justify-between items-center, titre (text-xl font-semibold text-gray-800), lien Déconnexion (text-primary, hover:bg-gray-100)
  - Menu burger mobile : conserver le comportement (bouton .nav-toggle, ul ouvert avec .open) ; styler le toggle et la liste avec Tailwind (md:flex, hidden, etc. pour responsive)

- [x] Task 3 — Exclusions et accessibilité
  - Vérifier que login.html et register.html n'incluent pas la nav (aucun #layout-nav / #layout-header ou script layout sur ces pages)
  - Vérifier contrastes : si le layout affiche des badges (alerte), utiliser bg-success/text-white, bg-warning avec texte sombre, bg-error/text-white pour ≥ 4,5:1

## Dev Notes

### Contexte (Story 8.1 livrée)

- **Story 8.1** : Tailwind CDN + tailwind.config.js avec charte (primary #3b82f6, success #10b981, warning #f59e0b, error #ef4444). Les 13 pages métier chargent déjà le script Tailwind et design-system.css. [Source: implementation-artifacts/8-1-tailwind-init.md]
- **Layout actuel** : `layout.js` définit `navEl.className = 'app-nav'`, `headerEl.className = 'app-header'`, et génère du HTML avec classes `nav-toggle`, `logout-link`, `active`. Le CSS dans design-system.css (lignes ~55–138) style .app-nav, .app-header, .nav-toggle, media (max-width: 767px) pour le burger.

### Mapping CSS → Tailwind (référence)

| Actuel (design-system.css)     | Équivalent Tailwind (ex.) |
|--------------------------------|----------------------------|
| .app-nav (bg-card, border, padding) | bg-white border-b border-gray-200 px-4 py-2 |
| .app-nav ul (flex, gap)        | flex flex-wrap gap-2 items-center |
| .app-nav a (primary, rounded)  | text-primary px-4 py-2 rounded-md font-medium text-sm |
| .app-nav a:hover               | hover:bg-gray-100 |
| .app-nav a.active              | bg-primary text-white |
| .app-header (flex, space-between) | flex justify-between items-center flex-wrap gap-2 px-4 py-4 border-b border-gray-200 bg-white |
| .app-header h1                 | text-xl font-semibold text-gray-800 m-0 |
| .app-header .logout-link       | text-primary text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-100 |
| Mobile .app-nav ul              | hidden md:flex ; .open → flex flex-col |
| .nav-toggle                    | md:hidden inline-flex p-2 rounded ... |

Utiliser les couleurs de la charte (primary, success, warning, error) depuis tailwind.config.js ; pour gray, utiliser gray-100, gray-200, gray-800 selon la spec.

### Références

- [Source: docs/stories/8.2.story.md] — AC et Tasks
- [Source: docs/front-end-spec.md] — §3.2 Navigation, §6 Layout, §7 Palette, §8 Accessibilité
- [Source: apps/api/public/css/design-system.css] — règles à remplacer (lignes 55–138, section Layout + media)
- [Source: apps/api/public/js/layout.js] — fichier à modifier (remplacer className et classes dans le HTML généré)

### File Structure

- **À modifier :**
  - `apps/api/public/js/layout.js` — remplacer les classes CSS (app-nav, app-header, nav-toggle, logout-link, active) par des classes Tailwind dans les chaînes HTML et dans className assignés à navEl / headerEl.
  - `apps/api/public/css/design-system.css` — supprimer ou commenter les règles .app-nav, .app-header, .nav-toggle, .logout-link, .app-nav a.active, et le bloc @media (max-width: 767px) relatif au layout. Ne pas supprimer :root, .page-container, .stat-card, etc.
- **À ne pas modifier :**
  - Comportement de layout.js (init, getPageTitle, currentPath, escapeHtml, navLinks, burger toggle). Seul le rendu visuel (classes) change.
  - login.html, register.html (pas de nav) — vérification uniquement.

### Testing Requirements

- Vérification manuelle : chaque page métier (dashboard, stats, forecast, chat, formulas, sales, import-stocks, import-sales, movements, locations, suppliers, stock-estimates, custom-formulas) affiche la nav et le header avec le style Tailwind ; lien actif visible ; Déconnexion cliquable ; sur mobile, menu burger ouvre/ferme la liste.
- Vérification : login et register n'affichent pas la barre de navigation.
- Accessibilité : contraste des liens et du lien actif ≥ 4,5:1 (outil type axe ou Lighthouse).

## Dev Agent Record

### Completion Notes List

- **layout.js** : navEl avec `bg-white border-b border-gray-200 px-4 py-2` ; headerEl avec `flex justify-between items-center flex-wrap gap-2 px-4 py-4 border-b border-gray-200 bg-white`. Liens nav : `text-primary px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-100`, actif `bg-primary text-white`. Burger : `nav-toggle md:hidden inline-flex ...`, liste `hidden md:flex flex-wrap gap-2 ...`. Comportement toggle .open conservé.
- **design-system.css** : Règles .app-nav, .app-header, .nav-toggle, .logout-link, .active et media 768px supprimées. Conservé : une seule règle mobile `#layout-nav-list.open { display: flex; flex-direction: column; align-items: stretch; }` pour le menu burger. .page-container et tout le reste (variables, .stat-card, badges) inchangés.
- **login.html / register.html** : Vérifiés — pas de #layout-nav, #layout-header ni script layout.

### File List

**Fichiers modifiés :**
- apps/api/public/js/layout.js
- apps/api/public/css/design-system.css

## Change Log

| Date       | Version | Description                | Auteur   |
|------------|---------|----------------------------|----------|
| 2026-02-16 | 0.1     | Création artifact Story 8.2 (create-story) | BMAD/CE  |
| 2026-02-16 | 0.2     | Implémentation : layout Tailwind + design-system allégé | dev-story |
