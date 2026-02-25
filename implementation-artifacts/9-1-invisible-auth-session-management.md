# Story 9.1: Invisible Auth & Session Management

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** utilisateur,  
**I want** une authentification transparente où le token JWT n'est jamais affiché à l'écran,  
**so that** je peux utiliser FlowStock sans être confronté à des champs techniques ou des manipulations manuelles de token.

## Acceptance Criteria

1. **Given** un utilisateur qui se connecte via login **When** la connexion réussit **Then** le JWT est stocké de façon sécurisée (httpOnly cookie ou sessionStorage selon architecture) **And** un AuthProvider React fournit le token à toute l'application sans exposition à l'utilisateur **And** tous les appels API passent automatiquement par le contexte d'authentification.
2. **When** l'utilisateur navigue entre les pages **Then** aucun champ de saisie de token JWT n'est visible (Dashboard, Ventes, Fournisseurs, Emplacements, Mouvements, Import, Formules, Chat) **And** en cas de 401/403, l'utilisateur est redirigé vers login avec message « Session expirée » **And** la logique de api-client.js est migrée vers un hook useApi ou équivalent intégré à l'AuthProvider **And** les pages login et register n'affichent pas de champ token manuel.

## Tasks / Subtasks

- [x] Task 1 — Créer le projet Next.js et AuthProvider
  - Initialiser l'app Next.js (App Router) dans `apps/web` ou `packages/web` avec TypeScript et Tailwind
  - Créer `AuthProvider` React : état `{ user, token, isLoading }`, fonctions `login(email, password)`, `logout()`
  - Stocker le token en sessionStorage (ou httpOnly cookie si l'API le supporte — actuellement l'API renvoie `access_token` en JSON)
  - Exposer `useAuth()` pour accéder au contexte depuis les composants
  - Wrapper l'application avec `<AuthProvider>` dans layout racine

- [x] Task 2 — Migrer la logique api-client vers useApi
  - Créer le hook `useApi()` ou client fetch centralisé qui lit le token depuis l'AuthProvider (jamais depuis un input DOM)
  - Reproduire la logique de `api-client.js` : CSRF (appel `/csrf-token`, header `X-CSRF-Token`), `credentials: 'include'`, header `Authorization: Bearer <token>`
  - Intercepteur 401/403 : redirection vers `/login` avec message « Session expirée » (via URL query ou state) ; exclure les routes `/auth/*` de la redirection
  - Conserver le retry CSRF sur 403 si le message contient "CSRF" (voir api-client.js lignes 107–124)

- [x] Task 3 — Pages login et register Next.js
  - Créer la page `/login` (Next.js) : formulaire email + mot de passe uniquement ; aucun champ token
  - Créer la page `/register` (Next.js) : formulaire inscription ; aucun champ token
  - Après succès login : stocker le token via AuthProvider, rediriger vers `/` ou `/dashboard`
  - Les appels API pour login/register utilisent le client centralisé (sans token pour login, avec token pour les autres)

- [x] Task 4 — Page(s) protégée(s) de démonstration et validation
  - Créer au moins une route protégée (ex. `/dashboard`) qui consomme `useApi` pour un appel API (ex. `/dashboard/summary`)
  - Aucun input/textarea pour token JWT sur cette page
  - Vérifier le flux complet : login → navigation → 401 simulé → redirection login avec « Session expirée »
  - (Optionnel pour 9.1 : route guard / middleware Next.js pour rediriger les non-authentifiés vers /login)

## Dev Notes

### Contexte Epic 9

- **Objectif** : Migrer de pages HTML isolées (apps/api/public/*.html) vers une SPA Next.js professionnelle. [Source: docs/epic-9-migration-nextjs.md]
- **Problème actuel** : 11+ pages affichent un champ de saisie JWT (dashboard, stats, sales, suppliers, locations, movements, import-stocks, import-sales, formulas, custom-formulas, chat). L'utilisateur doit coller le token manuellement après connexion.
- **API backend** : Reste inchangée (apps/api Express). Endpoints auth : `POST /auth/login`, `POST /auth/register`. Réponse login : `{ success: true, data: { access_token: "..." } }`. [Source: apps/api/src/routes/auth.routes.ts]

### Logique api-client.js à reproduire

| Comportement | Implémentation actuelle (api-client.js) |
|--------------|----------------------------------------|
| Stockage token | `localStorage.bmad_jwt_token` via `saveTokenToStorage` / `loadTokenFromStorage` |
| Token getter | `BmadApiClient.setTokenGetter(fn)` — chaque page définit une fn (input DOM ou localStorage) |
| CSRF | `GET /csrf-token` → header `X-CSRF-Token` sur POST/PUT/PATCH/DELETE |
| 401/403 | Redirection `window.location.href = loginRedirectUrl` ; exclusion des URLs contenant `auth/` |
| Retry CSRF | Sur 403 avec message "CSRF", refresh CSRF puis retry une fois |

Pour Next.js : préférer **sessionStorage** pour le token (évite persistance cross-tab ; plus cohérent avec une session). Si l'API devait supporter httpOnly cookies plus tard, l'AuthProvider pourrait être adapté.

### Références

- [Source: apps/api/public/api-client.js] — Client API actuel à migrer
- [Source: docs/front-end-spec.md §4.4] — Session expirée (401/403) → redirection login, message « Session expirée »
- [Source: docs/epic-9-migration-nextjs.md] — Architecture cible : AuthProvider, useAuth, useApi
- [Source: docs/frontend-react-next-avis.md] — Recommandation Next.js, migration progressive
- [Source: planning-artifacts/epics.md] — Epic 9, Stories 9.1–9.5

### Pages HTML actuelles avec champs JWT (audit — pour référence)

Ces pages seront migrées dans les stories 9.2–9.5. La story 9.1 pose uniquement les fondations (auth, hooks).

| Page | Champ JWT | Mécanisme actuel |
|------|-----------|------------------|
| dashboard.html | #tokenInput | getToken() → input ou localStorage |
| stats.html | #tokenInput | idem |
| sales.html | #token | tokenEl.value |
| suppliers.html | #token | idem |
| locations.html | #token | idem |
| movements.html | #token | idem |
| import-stocks.html | #token | idem |
| import-sales.html | #token | idem |
| formulas.html | #token | idem |
| custom-formulas.html | #token | idem |
| chat.html | #token | tokenInput + chat_token localStorage |
| stock-estimates.html | (aucun input visible si BmadApiClient) | loadTokenFromStorage |
| forecast.html | (idem) | loadTokenFromStorage |

### File Structure (cible)

- **À créer :**
  - `apps/web/` — Projet Next.js (ou `packages/web`)
  - `apps/web/src/app/layout.tsx` — Layout racine avec AuthProvider
  - `apps/web/src/contexts/AuthContext.tsx` — AuthProvider + useAuth
  - `apps/web/src/hooks/useApi.ts` — Hook useApi (fetch + token + CSRF + 401/403)
  - `apps/web/src/app/login/page.tsx` — Page login
  - `apps/web/src/app/register/page.tsx` — Page register
  - `apps/web/src/app/page.tsx` ou `apps/web/src/app/dashboard/page.tsx` — Page protégée de démo
- **Référence (à ne pas modifier dans 9.1) :**
  - `apps/api/public/api-client.js` — Source de vérité pour la logique à migrer
  - `apps/api` — Backend Express inchangé

### Architecture technique (Next.js)

- **App Router** : `app/` directory, layouts, Server Components par défaut. Les pages login/register et dashboard seront Client Components (useState, useAuth).
- **Proxy API** : En dev, configurer `next.config.js` pour proxy `/api` et `/auth` vers l'API Express (ex. `http://localhost:3001`). En prod, même origine ou CORS configuré.
- **Tailwind** : Intégré au build (comme Epic 8). Réutiliser la charte (primary, success, warning, error) de `tailwind.config.js` si partagé.

### Testing Requirements

- **Manuel** : login avec email/password → redirection dashboard → appel API réussi (données affichées) ; aucun champ token visible
- **Manuel** : simulation 401 (token invalide ou expiré) → redirection /login avec message « Session expirée »
- **Manuel** : page register → inscription → pas de champ token
- **E2E (optionnel)** : Playwright sur login → dashboard → vérifier absence d'input token

## Dev Agent Record

### Agent Model Used

Auto (Cursor Agent)

### Debug Log References

### Completion Notes List

- **apps/web** : Projet Next.js 14 (App Router) avec TypeScript et Tailwind. AuthProvider (AuthContext) stocke le token en sessionStorage, expose useAuth avec login/logout. Hook useApi : fetchApi (avec token) + fetchApiGuest (sans token) ; CSRF, 401/403 → redirection /login?session_expired=1. Pages login, register, dashboard sans aucun champ JWT visible.
- **login** : Suspense autour de LoginForm pour useSearchParams. Message « Session expirée » affiché quand session_expired=1.
- **register** : Utilise useApi().fetchApiGuest pour /auth/register et /auth/verify-email (client centralisé sans token).
- **Post-review** : README apps/web (ports, NEXT_PUBLIC_API_URL), .env.local.example documenté ; fetchApiGuest ajouté ; AuthContext isLoading corrigé si /auth/me échoue.

### File List

**Fichiers créés :**
- apps/web/package.json
- apps/web/tsconfig.json
- apps/web/next.config.mjs
- apps/web/tailwind.config.ts
- apps/web/postcss.config.mjs
- apps/web/next-env.d.ts
- apps/web/.eslintrc.json
- apps/web/.env.local
- apps/web/.env.local.example
- apps/web/src/app/globals.css
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/web/src/app/login/page.tsx
- apps/web/src/app/register/page.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/contexts/AuthContext.tsx
- apps/web/src/hooks/useApi.ts

**Fichiers ajoutés/modifiés (post-review 2026-02-18) :**
- apps/web/README.md (doc ports, NEXT_PUBLIC_API_URL)
- apps/web/.env.local.example (commentaires)
- apps/web/src/hooks/useApi.ts (fetchApiGuest)
- apps/web/src/app/register/page.tsx (useApi().fetchApiGuest)

## Change Log

| Date       | Version | Description                             | Auteur   |
|------------|---------|-----------------------------------------|----------|
| 2026-02-18 | 0.1     | Création artifact Story 9.1 (create-story) | BMAD/CE  |
| 2026-02-18 | 0.2     | Implémentation : Next.js, AuthProvider, useApi, login, register, dashboard | dev-story |
| 2026-02-18 | 0.3     | Post-review : doc NEXT_PUBLIC_API_URL/ports (README, .env.example), fetchApiGuest, register centralisé ; story 9.1 → done | BMAD/CE  |
