# Story 8.4: UI Agentique & Responsive — Boutons d'action et Chat (flex/grid Tailwind)

**Status:** Done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** les boutons d'action (ex. « Générer un bon de commande ») et le Chat utilisant les composants flex et grid de Tailwind,  
**so that** l'adaptabilité mobile est parfaite et l'interface reste actionnable sur tous les écrans.

## Acceptance Criteria

1. **Given** je suis sur le dashboard avec des alertes **When** je vois un bouton d'action (ex. « Générer un bon de commande ») **Then** le bouton et son conteneur utilisent flex/grid Tailwind pour un placement correct sur desktop et mobile **And** le bouton reste utilisable et lisible sur petit écran (pas de débordement, espacement adapté).
2. **Given** j'ouvre la page Chat (chat.html) **When** la page est affichée **Then** la zone de conversation et les contrôles utilisent flex/grid Tailwind pour une mise en page responsive **And** sur mobile, la disposition s'adapte sans perte de lisibilité ni d'accessibilité aux actions.

## Tasks / Subtasks

- [x] Task 1 — Boutons d'action dashboard (flex/grid Tailwind)
  - Sur dashboard.html, pour chaque alerte avec bouton d'action (ex. « Générer un bon de commande »), structurer le conteneur en flex ou grid Tailwind
  - Utiliser flex-wrap, gap, et breakpoints (sm:, md:) pour que le bouton et le texte de l'alerte restent bien alignés et accessibles sur mobile
  - Éviter débordements (text truncate ou line-clamp si besoin) et garder la zone cliquable suffisante sur tactile (min touch target ~44px)

- [x] Task 2 — Page Chat (layout responsive Tailwind)
  - Sur chat.html, structurer la zone de conversation (messages) et la zone de saisie/contrôles avec flex ou grid Tailwind
  - S'assurer que la liste des messages et l'input + boutons s'adaptent en hauteur et largeur (flex-1, min-h-0 si scroll, grid-cols-1 sur mobile si besoin)
  - Vérifier sur viewport étroit : pas de chevauchement, actions visibles sans scroll horizontal

- [x] Task 3 — Vérification cross-viewport
  - Tester dashboard (alertes + boutons) et chat sur largeur réduite (ex. 320px, 375px) et tablette
  - Confirmer que les composants flex/grid Tailwind suffisent sans media queries custom ; documenter toute exception

## Dev Notes

### Contexte (Stories 8.1–8.3 livrées)

- **Story 8.1** : Tailwind + charte. **8.2** : Layout nav/header Tailwind. **8.3** : Cartes, badges, tableaux Tailwind. [Source: implementation-artifacts/8-1 à 8-3]
- **Comportement existant** : Ne pas modifier la logique des boutons (spinner, état confirmé, appel API) ni du chat (contexte, envoi messages) ; uniquement le layout et les classes Tailwind pour le responsive.

### Patterns Tailwind recommandés (responsive)

| Objectif | Classes (ex.) |
|----------|----------------|
| Conteneur alerte + bouton | flex flex-wrap items-start gap-2 sm:gap-3 ; sur mobile le bouton peut passer en dessous (flex-wrap) |
| Bouton d'action | px-4 py-2 min-h-[44px] (touch), text-sm font-medium rounded-md, truncate ou line-clamp-2 sur libellé long |
| Zone chat (messages) | flex flex-col flex-1 min-h-0 overflow-y-auto |
| Zone saisie + envoi | flex flex-wrap gap-2 items-end (ou grid grid-cols-1 sm:grid-cols-[1fr_auto]) |
| Éviter débordement | overflow-hidden, truncate, max-w-full |

### Références

- [Source: docs/stories/8.4.story.md] — AC et Tasks
- [Source: docs/front-end-spec.md] — §4.1 Action immédiate Dashboard, §4.2 Chat, §6 Boutons/layout, §9 Responsive
- **Fichiers concernés :** apps/api/public/dashboard.html (alertes + boutons), apps/api/public/chat.html (messages + saisie)

### File Structure

- **À modifier :**
  - `apps/api/public/dashboard.html` — conteneurs des alertes et boutons d'action : ajouter/remplacer par classes flex/grid Tailwind (flex, flex-wrap, gap, sm:, md:). Ne pas toucher à la logique JS (spinner, états).
  - `apps/api/public/chat.html` — structure de la zone messages et zone saisie/contrôles : flex ou grid Tailwind pour responsive (flex-1, min-h-0, overflow-y-auto, etc.).
- **À ne pas modifier :**
  - Logique métier (handlers, API, état des boutons). Uniquement structure et classes CSS.

### Testing Requirements

- Vérification manuelle : dashboard avec alertes — bouton « Générer un bon de commande » (ou équivalent) visible et cliquable sur desktop et mobile ; pas de débordement.
- Chat : liste des messages scrollable ; zone saisie et bouton d'envoi visibles sur mobile ; pas de scroll horizontal.
- Viewports : tester 320px, 375px, 768px, 1024px (outil DevTools ou redimensionnement fenêtre).

## Dev Agent Record

### Completion Notes List

- **dashboard.html** : Alertes : li avec `flex flex-wrap items-start gap-2 sm:gap-3`, contenu avec `flex-1 min-w-0 break-words`, zone boutons avec `flex gap-1 flex-shrink-0 items-center min-h-[44px] sm:min-h-0`, boutons avec `min-h-[44px] sm:min-h-0` pour touch. Actions recommandées : `flex flex-wrap justify-between items-center gap-2 sm:gap-3`, lien « Voir » avec `min-h-[44px]`. Bouton « Mettre à jour » seuil : `min-h-[44px] sm:min-h-0`.
- **chat.html** : Suppression du bloc `<style>`. Body : `flex flex-col min-h-screen bg-gray-100`. Main : `flex flex-col flex-1 min-h-0`. Header chat : `flex justify-between items-center px-4 py-4 bg-primary text-white`. Zone messages : `flex flex-col flex-1 min-h-0 overflow-y-auto p-4 gap-4`. Zone saisie : `flex flex-wrap gap-2 sm:gap-3 p-4 bg-white border-t items-end`, input `flex-1 min-w-0`, bouton Envoyer `min-h-[44px]`. Messages (JS) : classes Tailwind selon role (user: self-end bg-primary text-white, assistant: self-start bg-white border). Typing indicator en Tailwind.

### File List

**Fichiers modifiés :**
- apps/api/public/dashboard.html
- apps/api/public/chat.html

## Change Log

| Date       | Version | Description                | Auteur   |
|------------|---------|----------------------------|----------|
| 2026-02-16 | 0.1     | Création artifact Story 8.4 (create-story) | BMAD/CE  |
| 2026-02-16 | 0.2     | Implémentation : dashboard alertes + chat layout Tailwind | dev-story |
