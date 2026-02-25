# Story 9.3: Refonte du Dashboard Actionnable

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** un dashboard moderne avec chargement automatique et boutons d'action intégrés,  
**so that** je vois immédiatement l'état de mes stocks et je peux agir sans clic superflu.

## Acceptance Criteria

1. **Given** un utilisateur authentifié **When** j'accède au dashboard **Then** des Skeletons avec effet shimmer s'affichent pendant le chargement des données.
2. **And** les données sont chargées automatiquement au montage (useEffect / Server Components selon architecture).
3. **And** aucune action manuelle type « Charger les estimations » ou « Rafraîchir » n'est requise pour voir les infos.
4. **And** chaque alerte de stock critique propose un bouton d'action stylisé (ex. « Commander ») avec états loading et confirmé.
5. **And** les cartes de données ont une hiérarchie visuelle claire (ombres, contrastes, iconographie).
6. **And** le design respecte les standards SaaS professionnels (Shadcn Card, Badge, Button — ou Tailwind équivalent si Shadcn non ajouté).

## Tasks / Subtasks

- [x] Task 1 — Chargement automatique des données (AC: 2, 3)
  - Appeler GET `/dashboard/summary` au montage via useApi (useEffect).
  - Supprimer tout bouton « Charger » ou « Rafraîchir ».
  - Gérer les états loading, error et success (pas de champ JWT manuel — 9.1 fait).

- [x] Task 2 — Skeletons avec effet shimmer (AC: 1)
  - Créer des Skeletons qui imitent la forme des cartes stats et du bloc alertes.
  - Appliquer un effet shimmer (animation CSS) pendant le chargement.
  - Référence : [Source: docs/front-end-spec.md §6] — blocs gris animés qui imitent la forme, jamais un simple « Chargement… ».

- [x] Task 3 — Cartes de données professionnelles (AC: 5, 6)
  - Utiliser composants Card (Shadcn ou Tailwind) pour ventes hier, stock actuel, alertes.
  - Appliquer ombres, contrastes, iconographie (lucide-react : TrendingUp, Package, AlertTriangle).
  - Hiérarchie visuelle : primary, success, warning, error selon la charte tailwind.config.ts.

- [x] Task 4 — Boutons d'action par alerte (AC: 4)
  - Chaque alerte de stock critique affiche un bouton « Commander » (ou « Voir commande »).
  - États : default, loading (spinner intégré), confirmé (check vert).
  - Intégrer le flux : lien vers une route de commande ou action simulée (placeholder si Epic 6 pas encore livré).

## Dev Notes

### Contexte Epic 9 et dépendances

- **Epic 9** : Migration SPA Next.js. [Source: docs/epic-9-migration-nextjs.md]
- **Story 9.1** (done) : AuthProvider, useApi, login, register.
- **Story 9.2** (done) : Shell (AppShell, AppSidebar, AppHeader), layout (app), navigation client-side. Le dashboard est déjà sous `app/(app)/dashboard/page.tsx`.

### API Dashboard existante

- **GET /dashboard/summary** — [Source: apps/api/src/routes/dashboard.routes.ts]  
  - Retourne : `{ success, data: { salesYesterday, currentStock, alerts: [{ level, message }] } }`.
  - Authentification JWT requise. Montée sous `/dashboard` (préfixe).
  - Le hook `useApi` fournit `fetchApi` avec headers Authorization automatiques.

### Structure actuelle du Dashboard (9.2)

- `apps/web/src/app/(app)/dashboard/page.tsx` — Page client, utilise useAuth, useApi, fetchApi('/dashboard/summary').
- Données affichées : ventes hier, stock actuel, liste d'alertes (level: high/medium/low).
- Chargement actuel : simple texte « Chargement des données… » — à remplacer par Skeletons.

### Skeletons et Design System

- [Source: docs/front-end-spec.md §6] — Skeleton : blocs gris animés (shimmer) qui imitent la forme des graphiques/cartes.
- Pattern shimmer : `@keyframes shimmer` + `animate-pulse` ou gradient animé sur fond gris.
- Option : composant Skeleton réutilisable dans `components/ui/Skeleton.tsx`.

### Boutons d'action (alertes)

- [Source: docs/front-end-spec.md §4.1] — Action immédiate : « Générer un bon de commande » à côté des alertes.
- [Source: docs/front-end-spec.md §6, tableau Composants] — Bouton : états loading (spinner intégré), confirmé (check vert).
- Pour MVP : bouton « Commander » avec état loading puis confirmé (simulé ou lien vers `/chat` / route commande future).

### Shadcn UI

- Story 9.2 a utilisé Tailwind + lucide-react (Option B). Pour 9.3 :
  - **Option A** : Ajouter Shadcn (`npx shadcn@latest add card skeleton badge button`) pour Card, Skeleton, Badge, Button.
  - **Option B** : Reste en Tailwind + lucide-react ; créer composants Card, Skeleton, Badge en Tailwind pur. Documenter la déviation.

### File Structure (cible)

- **À modifier :** `apps/web/src/app/(app)/dashboard/page.tsx`
- **À créer :**
  - `apps/web/src/components/ui/Skeleton.tsx` (ou `components/dashboard/DashboardSkeleton.tsx`) — Skeleton avec shimmer.
  - Optionnel : `apps/web/src/components/dashboard/StatCard.tsx`, `AlertCard.tsx` — cartes réutilisables.

### Références

- [Source: docs/stories/9.3.story.md] — Story 9.3
- [Source: docs/front-end-spec.md §4.1] — Action immédiate Dashboard
- [Source: docs/front-end-spec.md §6] — Skeleton, Card, Bouton états
- [Source: docs/api-specifications.md] — Dashboard API
- [Shadcn Card](https://ui.shadcn.com/docs/components/card), [Shadcn Skeleton](https://ui.shadcn.com/docs/components/skeleton)

### Testing Requirements

- **Manuel** : Accès /dashboard → Skeletons visibles pendant chargement → données s'affichent sans clic.
- **Manuel** : Chaque alerte a un bouton « Commander » ; clic → état loading → état confirmé.
- **Manuel** : Cartes avec ombres, icônes, hiérarchie visuelle (primary, success, warning, error).

## Dev Agent Record

### Agent Model Used

(À remplir lors de l'implémentation)

### Debug Log References

### Completion Notes List

- Chargement auto au montage via useEffect + fetchApi('/dashboard/summary'), pas de bouton Charger.
- Skeleton : composant ui/Skeleton.tsx avec animation shimmer (globals.css), DashboardSkeleton imite forme cartes + alertes.
- Cartes : Tailwind Card avec icônes lucide-react (TrendingUp, Package, AlertTriangle), hiérarchie primary/success/warning/error.
- Bouton Commander par alerte : états idle → loading (Loader2 spinner) → confirmed (Check vert). Action simulée (setTimeout) ; Epic 6 fournira le flux réel.
- API : structure sales_yesterday, current_stock, alerts (severity high/medium/low) conforme au backend.

### File List

Créés : components/ui/Skeleton.tsx, components/dashboard/DashboardSkeleton.tsx. Modifiés : app/(app)/dashboard/page.tsx, app/globals.css.

## Change Log

| Date       | Version | Description                             | Auteur   |
|------------|---------|-----------------------------------------|----------|
| 2026-02-18 | 0.1     | Création artifact Story 9.3 (create-story) | BMAD/CE  |
| 2026-02-18 | 0.2     | Implémentation : Skeletons shimmer, cartes pro, boutons Commander | dev-story |
