# FlowStock — Front-end Next.js

Application Next.js (App Router) pour FlowStock. Authentification via AuthProvider et appels API centralisés via le hook `useApi`.

## Prérequis

- Node.js 18+
- L’API backend (`apps/api`) doit être démarrée pour les appels API (login, register, dashboard, etc.).

## Ports en développement

| Service | Port par défaut | Commande |
|--------|------------------|----------|
| **Next.js (ce front-end)** | **3001** | `npm run dev` (défini dans `package.json` : `next dev -p 3001`) |
| **API Express (backend)** | **3000** (ou autre selon config API) | `npm run dev` dans `apps/api` |

En dev, le front tourne donc sur `http://localhost:3001` et doit connaître l’URL de l’API (souvent `http://localhost:3000`).

## Variables d’environnement

Créer un fichier `.env.local` à la racine de `apps/web` (voir `.env.local.example`).

| Variable | Description | Exemple (dev) |
|----------|-------------|----------------|
| `NEXT_PUBLIC_API_URL` | URL de base de l’API Express (backend). Tous les appels (`/auth/login`, `/csrf-token`, `/dashboard/summary`, etc.) sont préfixés par cette URL. | `http://localhost:3000` |

- **En développement** : l’API tourne souvent sur le port **3000** et Next sur **3001**. Définir `NEXT_PUBLIC_API_URL=http://localhost:3000`.
- **En production** : mettre l’URL publique de l’API (même origine ou domaine configuré CORS côté API).

Le préfixe `NEXT_PUBLIC_` est requis pour que la variable soit disponible côté client (navigateur).

## Commandes

```bash
npm install
npm run dev    # Démarre le serveur de dev sur le port 3001
npm run build  # Build de production
npm run start  # Démarre le serveur en mode production (port 3001)
npm run lint   # ESLint
```

## Structure (auth & API)

- **Contexte auth** : `src/contexts/AuthContext.tsx` — AuthProvider, `useAuth()`, token en sessionStorage, login/logout.
- **Client API** : `src/hooks/useApi.ts` — `useApi()` expose `fetchApi` (avec token) et `fetchApiGuest` (sans token, pour login/register). CSRF, credentials, 401/403 → redirection login.
- **Pages** : login, register, dashboard ; aucune saisie de JWT visible.
