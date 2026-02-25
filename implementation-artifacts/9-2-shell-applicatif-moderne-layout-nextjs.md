# Story 9.2: Shell Applicatif Moderne (Layout Next.js)

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** utilisateur,  
**I want** un layout racine unifié avec Sidebar rétractable et Header dynamique,  
**so that** je navigue de façon fluide sans rechargement de page et avec une identité visuelle professionnelle.

## Acceptance Criteria

1. **Given** l'application Next.js **When** une page métier est affichée **Then** un Layout racine inclut une Sidebar rétractable (desktop) et un Header avec titre de page et actions utilisateur **And** la Sidebar utilise Tailwind et Shadcn UI (composants Button, Sheet pour mobile) **And** l'identité visuelle est cohérente avec la charte (primary, success, warning, error).
2. **When** l'utilisateur navigue entre Dashboard, Stats, Prévisions, Chat, Formules, Ventes, Imports, Mouvements, Référentiels **Then** seul le contenu central change (navigation client-side, pas de rechargement full page).
3. **When** l'utilisateur est sur login ou register **Then** la Sidebar et le Header applicatif ne sont pas affichés.
4. **When** l'utilisateur consulte l'application sur desktop **Then** la Sidebar est fixe avec un bouton pour rétracter/étendre ; sur mobile **Then** un menu burger ouvre un Sheet/Drawer (responsive).

## Tasks / Subtasks

- [x] Task 1 — Structure Layout racine Next.js (AC: 1, 3)
  - Créer un groupe de routes pour les pages métier avec layout commun : ex. `app/(app)/layout.tsx` qui affiche Sidebar + Header + `{children}` (contenu central).
  - Isoler les routes login et register dans un groupe sans ce layout : ex. `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` avec `app/(auth)/layout.tsx` minimal (pas de Sidebar ni Header), ou laisser login/register à la racine et n'appliquer le layout « app » qu'aux routes métier.
  - S'assurer que le layout racine `app/layout.tsx` conserve `<AuthProvider>` ; le layout (app) ne s'affiche que pour les routes protégées / métier.

- [x] Task 2 — Sidebar rétractable (AC: 1, 4)
  - Intégrer un composant Sidebar (Shadcn UI Sidebar ou équivalent Tailwind + composant Sheet pour mobile). [Shadcn Sidebar](https://ui.shadcn.com/docs/components/sidebar)
  - Liens de navigation vers : Dashboard, Stats, Prévisions, Chat, Formules, Formules personnalisées, Ventes, Import stocks, Import ventes, Mouvements, Emplacements, Fournisseurs (voir Routes à mapper ci-dessous).
  - Bouton pour rétracter/étendre la Sidebar sur desktop (icône ou toggle).
  - Sur mobile : menu burger qui ouvre un Sheet (drawer) contenant les mêmes liens ; fermeture au clic sur un lien ou en dehors.

- [x] Task 3 — Header dynamique (AC: 1)
  - Header avec titre de la page courante (dérivé de la route active ou d'un contexte/ métadonnée).
  - Lien « Déconnexion » (ou profil utilisateur) utilisant `useAuth().logout` et redirection vers `/login`.
  - Style cohérent avec la charte Tailwind (primary, success, warning, error) ; bordures, fond, typographie alignés avec `tailwind.config.ts` existant.

- [x] Task 4 — Navigation client-side et responsive (AC: 2, 4)
  - Utiliser `<Link>` de Next.js pour tous les liens de la Sidebar et du Header afin d'éviter le rechargement complet.
  - Vérifier que le contenu central (outlet) change sans recharger la Sidebar et le Header.
  - Tester sur desktop (sidebar fixe, rétractable) et mobile (burger + Sheet).

## Dev Notes

### Contexte Epic 9 et dépendance 9.1

- **Epic 9** : Migration vers SPA Next.js avec auth transparente, layout unifié, navigation fluide. [Source: docs/epic-9-migration-nextjs.md]
- **Story 9.1** (done) : AuthProvider, useApi, login, register, dashboard. Le layout (app) doit s'appuyer sur la structure existante : `app/layout.tsx` avec AuthProvider, `app/login`, `app/register`, `app/dashboard`. Les pages métier (dashboard, stats, etc.) sont déjà ou seront sous des routes Next.js ; le **shell** (Sidebar + Header) enveloppe uniquement ces routes métier, pas login/register.

### Navigation Structure (spec)

- **Navigation principale** : Barre ou sidebar avec liens vers Dashboard, Stats, Prévisions, Estimations, Chat, Formules (formulas + custom-formulas), Ventes, Imports (import-stocks, import-sales), Mouvements, Référentiels (locations, suppliers). Header : titre de la page courante et lien Déconnexion si authentifié. [Source: docs/front-end-spec.md §3.2]
- **Responsive** : Layout — navigation en barre ou sidebar sur desktop ; sur mobile, menu repliable (burger). [Source: docs/front-end-spec.md §6]

### Routes à mapper (liens Sidebar)

| Route | Label (ex.) |
|-------|-------------|
| /dashboard | Dashboard |
| /stats | Stats |
| /forecast | Prévisions |
| /chat | Chat |
| /formulas | Formules |
| /custom-formulas | Formules personnalisées |
| /sales | Ventes |
| /import-stocks | Import stocks |
| /import-sales | Import ventes |
| /movements | Mouvements |
| /locations | Emplacements |
| /suppliers | Fournisseurs |

Pour 9.2, les **pages cibles peuvent être des placeholders** (ex. titre + « Contenu à venir ») si les écrans complets sont prévus en 9.3–9.5 ; l’objectif est le **shell** (layout, sidebar, header, navigation client-side).

### Shadcn UI

- La story impose « Sidebar utilise Tailwind et Shadcn UI (composants Button, Sheet pour mobile) ». Shadcn UI n’est pas encore dans `apps/web` (pas de dépendance dans package.json). Options :
  - **Option A** : Ajouter Shadcn UI au projet (`npx shadcn@latest init` puis `npx shadcn@latest add sidebar button sheet`). Adapter la charte (primary, success, warning, error) dans `tailwind.config.ts` / `components.json` si nécessaire.
  - **Option B** : Implémenter une Sidebar et un drawer mobile en Tailwind seul (plus léger, sans Shadcn) si l’équipe préfère éviter une nouvelle lib ; dans ce cas documenter la déviation par rapport au critère « Shadcn UI » et valider avec le PO.

### File Structure (cible)

- **À créer ou modifier :**
  - `apps/web/src/app/(app)/layout.tsx` — Layout avec Sidebar + Header + `{children}` (ou structure équivalente selon regroupement de routes).
  - `apps/web/src/components/ui/sidebar.tsx` (ou `layout/sidebar.tsx`) — Composant Sidebar (liens, état rétracté, responsive).
  - `apps/web/src/components/ui/header.tsx` (ou `layout/header.tsx`) — Header avec titre dynamique et Déconnexion.
  - Optionnel : `apps/web/src/app/(auth)/layout.tsx` si login/register sont déplacés dans `(auth)` ; sinon laisser `app/login`, `app/register` sans layout applicatif (ils sont déjà sans sidebar/header).
- **Déplacer si nécessaire :** Pour appliquer le layout (app) uniquement aux routes métier : déplacer `app/page.tsx` (accueil), `app/dashboard/page.tsx` sous `app/(app)/` (ex. `app/(app)/page.tsx`, `app/(app)/dashboard/page.tsx`) et faire en sorte que `/` redirige vers `/dashboard` si authentifié ou affiche la landing ; login/register restent à la racine ou dans `(auth)`.

### Références

- [Source: docs/stories/9.2.story.md] — Story 9.2, critères et tasks
- [Source: docs/front-end-spec.md §3.2] — Navigation Structure
- [Source: docs/front-end-spec.md §6] — Responsive, menu mobile
- [Source: docs/epic-9-migration-nextjs.md] — Architecture cible, ordre des stories
- [Source: docs/epic-8-migration-tailwind.md] — Charte Tailwind (primary, success, warning, error)
- [Shadcn UI Sidebar](https://ui.shadcn.com/docs/components/sidebar)
- [Next.js App Router Layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)

### Testing Requirements

- **Manuel** : Ouvrir une page métier (ex. /dashboard) → Sidebar et Header visibles ; cliquer sur un lien (ex. Stats) → seul le contenu central change, pas de rechargement complet.
- **Manuel** : Desktop → rétracter/étendre la Sidebar ; Mobile → ouvrir le menu burger (Sheet), naviguer, fermer.
- **Manuel** : Aller sur /login et /register → pas de Sidebar ni Header applicatif.
- **Manuel** : Depuis une page métier, cliquer Déconnexion → redirection login, pas de shell sur la page login.

## Dev Agent Record

### Agent Model Used

(À remplir lors de l’implémentation)

### Debug Log References

### Completion Notes List

- Layout (app) : `app/(app)/layout.tsx` avec AppShell. Login/register à la racine sans shell.
- Sidebar : Tailwind + lucide-react (ChevronLeft, ChevronRight, X, Menu), rétractable desktop, drawer mobile (burger), 12 liens &lt;Link&gt;. Fermeture drawer au clavier (Escape). Drawer avec role="dialog", aria-modal, aria-label, id="mobile-sidebar" pour aria-controls.
- Header : titre via getPageTitle(pathname), Déconnexion. Burger avec aria-expanded, aria-controls, aria-label dynamique.
- Hydration : AppShell n’affiche le shell qu’après mounted pour éviter le flash layout mobile/desktop.
- Config : `src/lib/nav-config.ts`. Pages : dashboard sous (app), 11 placeholders.
- Accueil : redirect /dashboard si auth. Ancien app/dashboard/page.tsx supprimé.

### File List

Créés : nav-config.ts, AppSidebar.tsx, AppHeader.tsx, AppShell.tsx, (app)/layout.tsx, (app)/dashboard|stats|forecast|chat|formulas|custom-formulas|sales|import-stocks|import-sales|movements|locations|suppliers/page.tsx. Modifiés : app/page.tsx. Supprimés : app/dashboard/page.tsx. Dépendance : lucide-react.

## Change Log

| Date       | Version | Description                             | Auteur   |
|------------|---------|-----------------------------------------|----------|
| 2026-02-18 | 0.1     | Création artifact Story 9.2 (create-story) | BMAD/CE  |
| 2026-02-18 | 0.2     | Implémentation : layout (app), Sidebar, Header, placeholders, nav client-side | dev-story |
| 2026-02-18 | 0.3     | Post code-review : hydration (mounted), accessibilité (aria-expanded, Escape), icônes lucide-react | dev-story |
