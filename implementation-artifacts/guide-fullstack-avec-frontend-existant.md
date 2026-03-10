# Guide : brancher le full-stack sur le frontend existant

**Contexte :** Le frontend MVP (18 écrans) est livré dans `apps/web` avec **données mock**. Ce document décrit comment développer le full-stack et l’adapter au frontend sans refaire l’UI.

**Références :**
- Plan full-stack : `implementation-artifacts/mvp-restaurant-implementation-plan.md`
- Plan frontend-only (déjà fait) : `implementation-artifacts/mvp-restaurant-implementation-plan-frontend-only.md`
- API existante : `apps/api` (Express, PostgreSQL, auth JWT, multi-tenant)

---

## 1. Principes

1. **Garder l’UI telle quelle** — Les pages déjà construites (design Warm Tech, routes, composants) restent la cible. On ne refait pas les écrans.
2. **Remplacer les mocks par des appels API** — Là où il y a `MOCK_*`, on appelle l’API via `useApi().fetchApi(...)` et on affiche la réponse. Garder un **fallback mock** si l’API est indisponible ou renvoie vide (comme sur le Dashboard).
3. **Même pattern partout** — Chargement → `fetchApi(endpoint)` → si `res.ok` et `json.success` et `json.data`, utiliser `json.data` ; sinon (erreur ou vide) garder le mock ou afficher un message d’erreur.
4. **Backend d’abord quand c’est nouveau** — Pour un écran qui n’a pas encore d’endpoint (ex. Fiches techniques, Suggestions IA), créer la route + service + éventuellement la table en base, puis brancher le frontend.

---

## 2. Infra déjà en place

### Frontend (`apps/web`)

- **`useApi()`** (`src/hooks/useApi.ts`) — `fetchApi(url, { method, body })` : envoie le token JWT, gère CSRF (GET `/csrf-token` puis header `X-CSRF-Token` sur POST/PUT/DELETE), redirige vers `/login` en 401/403. Utiliser pour toutes les pages protégées.
- **`fetchApiGuest(url, options)`** — Pour login, register, verify-email (sans token).
- **Auth** — `AuthContext` : `token`, `user`, `login`, `logout`, `setToken`. En mode démo, `token === 'demo'` affiche un user mock sans appeler l’API.
- **Variable d’environnement** — `NEXT_PUBLIC_API_URL` (ex. `http://localhost:3000`) pour pointer vers l’API.

### Backend (`apps/api`)

- **Routes montées** : `/auth`, `/dashboard`, `/products`, `/locations`, `/suppliers`, `/sales`, `/formulas`, `/stock-estimates`, `/subscriptions`.
- **Auth** — JWT dans `Authorization: Bearer <token>`, middleware `authenticateToken`, `req.user` avec `tenantId`, `userId`.
- **Réponses** — Format recommandé : `{ success: true, data: ... }` ou `{ success: false, error: "..." }`.
- **CSRF** — GET `/csrf-token` puis header `X-CSRF-Token` sur les requêtes mutantes (hors GET/HEAD/OPTIONS). En `NODE_ENV=test`, CSRF est désactivé.

---

## 3. Ordre de branchement recommandé

Suivre l’ordre du plan full-stack pour limiter les dépendances.

| Phase | Objectif | Backend | Frontend |
|-------|----------|--------|----------|
| **1** | Auth & Onboarding | Auth déjà en place ; compléter register (first_name, last_name, company_name). Optionnel : étapes onboarding en BDD. | Login/Register déjà branchés ; garder mode démo. Onboarding : sauvegarder l’étape (POST si endpoint) ou state local. |
| **2** | Dashboard & Stocks | `/dashboard/summary` existe. Enrichir si besoin (KPIs métier). | Dashboard **déjà branché** (fallback mock). Page Stocks : appeler `GET /products` (existant), mapper vers le tableau (nom, quantité, unité, statut, etc.). |
| **3** | Mode Rush | **Nouveau** : WebSockets ou SSE pour alertes temps réel ; endpoint `GET /rush/alertes` ou équivalent ; cache côté serveur pour mode dégradé. | Remplacer les mocks Rush par abonnement SSE/WS + `GET /rush/alertes`. Afficher « Données en cache — dernière synchro il y a X min » si pas de mise à jour récente. `/rush/stocks` : données depuis produits/stock (ex. `GET /products` avec seuils). |
| **4** | Fiches techniques | **Nouveau** : tables (ex. `recipes`, `recipe_ingredients`), `GET/POST/PUT/DELETE /fiches-techniques`, `GET /fiches-techniques/:id`. Calcul coût matière, alerte ingrédient absent (comparaison avec stock). | Liste : `fetchApi('/fiches-techniques')`. Détail : `fetchApi(\`/fiches-techniques/${id}\`)`. Garder mock en fallback. |
| **5** | Suggestions IA | **Nouveau** : service IA (ou mock structuré) pour « plat du jour » ; endpoint `GET /suggestions/plat-du-jour`, `POST /suggestions/valider`, historique. | Remplacer MOCK_PLAT_DU_JOUR, MOCK_INGREDIENTS_A_ECOULER, MOCK_HISTORIQUE par appels API. |
| **6** | Paramètres & Abonnement | **Nouveau** : `GET/PUT /tenant/settings` (nom, adresse, horaires, seuils, notifs) ; Stripe (webhooks, abonnements). | Paramètres : charger/sauvegarder via API. Abonnement : plan actuel + historique depuis API ; bouton « Passer en Pro » → Stripe Checkout ou équivalent. |
| **7** | Admin | **Nouveau** : auth admin (rôle `founder` ou whitelist IP), routes `/admin/*` (clients, abonnements, feedback, moniteur). Données agrégées depuis BDD. | Protéger les routes `/admin/*` (redirect si pas admin). Remplacer les mocks par `fetchApi('/admin/...')` (avec token admin). |

---

## 4. Par écran : ce qui existe, ce qu’il faut faire

### 4.1 Dashboard Accueil (`/dashboard`)

- **Backend :** `GET /dashboard/summary` existe ; retourne `sales_yesterday`, `current_stock`, `alerts`, etc.
- **Frontend :** Déjà branché : appel `fetchApi('/dashboard/summary')`, affichage de `json.data` ; si vide ou erreur, utilisation des `MOCK_*`. Rien à changer sauf si vous ajoutez de nouveaux KPIs côté API.

### 4.2 Page Stocks (`/stocks`)

- **Backend :** `GET /products` existe (liste produits avec quantité, unité, stock_status, etc.). Possibilité d’ajouter `PATCH /products/:id` pour édition quantité en ligne.
- **Frontend :** Remplacer `MOCK_STOCKS` par un `useEffect` qui appelle `fetchApi('/products?limit=500')`, mappe les champs (nom, quantity, unit, DLC si dispo, levelPct dérivé, status, category). Garder un fallback mock si `!res.ok` ou `!data?.length`. Édition quantité : `fetchApi(\`/products/${id}\`, { method: 'PATCH', body: JSON.stringify({ quantity }) })` si l’API l’expose.

### 4.3 Mode Rush (`/rush`, `/rush/stocks`)

- **Backend à créer :**
  - Endpoint `GET /rush/alertes` (ou équivalent) renvoyant les alertes calculées à partir des produits sous les seuils.
  - **WebSockets ou SSE** pour pousser les mises à jour en temps réel (plan exige SSE/WS en Sprint 2).
  - Stratégie de cache + indicateur « dernière synchro » pour le mode dégradé.
- **Frontend :** Consommer SSE/WS pour mettre à jour la liste d’alertes ; en fallback, appeler `GET /rush/alertes` au chargement et éventuellement polling. Page `/rush/stocks` : données depuis `GET /products` (ou endpoint dédié) avec filtres/recherche côté client ou serveur.

### 4.4 Fiches techniques (`/fiches-techniques`, `/fiches-techniques/[id]`)

- **Backend à créer :**
  - Modèle : recettes (nom, tenant_id) + lignes (recipe_id, product_id, quantity, unit).
  - `GET /fiches-techniques`, `GET /fiches-techniques/:id`, `POST /fiches-techniques`, `PUT /fiches-techniques/:id`, `DELETE`, éventuellement duplication.
  - Calcul coût matière (prix produits × quantités) ; alerte « ingrédient absent » si produit en rupture ou absent du stock.
- **Frontend :** Liste et détail en `fetchApi(...)`, même UI ; fallback mock si API absente.

### 4.5 Suggestions IA (`/suggestions`)

- **Backend à créer :**
  - `GET /suggestions/plat-du-jour` (ou appel au service ML).
  - `POST /suggestions/valider` / refus, historique stocké.
  - Liste ingrédients à écouler (DLC < 48h) : dérivée des produits/stock ou endpoint dédié.
- **Frontend :** Remplacer tous les `MOCK_*` par ces appels ; garder mock si pas de réponse.

### 4.6 Paramètres (`/parametres`)

- **Backend à créer :** `GET /tenant/settings` (ou `/me/settings`), `PUT /tenant/settings` (nom, adresse, type, horaires, seuils alertes, préférences notifs, langue, fuseau). Table `tenants` ou `tenant_settings` à étendre.
- **Frontend :** Charger au montage, sauvegarder au clic « Enregistrer » ; toggles et champs déjà en state, il suffit de les lier à l’API.

### 4.7 Abonnement & Facturation (`/abonnement`)

- **Backend :** Intégration Stripe (abonnements, webhooks), `GET /subscriptions/me` (plan actuel, prochaine facturation, historique). Routes subscription existantes à vérifier/étendre.
- **Frontend :** Plan actuel et historique depuis API ; bouton « Passer en Pro » → redirection Stripe Checkout ; résiliation → appel API + modal déjà en place.

### 4.8 Admin (Dashboard, Clients, Moniteur, Abonnements, Feedback)

- **Backend à créer :**
  - Middleware ou guard **auth admin** (rôle `founder` / `admin` ou whitelist IP).
  - Routes `/admin/clients`, `/admin/clients/:id`, `/admin/abonnements`, `/admin/feedback`, `/admin/moniteur` (agrégations, listes, stats depuis la BDD).
- **Frontend :** Vérifier le rôle (ou token dédié) avant d’afficher les pages admin ; remplacer les mocks par `fetchApi('/admin/...')`.

---

## 5. Pattern type pour une page actuellement en mock

```ts
// 1. Importer useApi
import { useApi } from '@/hooks/useApi';

// 2. Dans le composant
const { fetchApi } = useApi();
const [data, setData] = useState<MonType[] | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => {
  if (!token) return;
  let cancelled = false;
  setLoading(true);
  fetchApi('/mon-endpoint')
    .then((res) => res.ok ? res.json() : null)
    .then((json) => {
      if (cancelled) return;
      if (json?.success && json?.data) setData(json.data);
      else setData(null); // ou garder mock
    })
    .catch(() => { if (!cancelled) setData(null); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [token, fetchApi]);

// 3. Afficher : si loading → skeleton ; si error → message ; sinon data ?? MOCK_DATA
```

---

## 6. Points techniques à respecter

- **CSRF** : Pour tout POST/PUT/PATCH/DELETE, le frontend doit avoir fait un GET `/csrf-token` (avec `credentials: 'include'`) et envoyer le token dans `X-CSRF-Token`. Le hook `useApi` s’en charge.
- **Multi-tenant** : L’API filtre par `req.user.tenantId`. Pas de changement côté frontend si les routes sont déjà protégées par le JWT.
- **Format des réponses** : Préférer `{ success: true, data: ... }` pour que le frontend puisse faire `json?.success && json?.data` partout.
- **Mode démo** : Garder le `token === 'demo'` dans `AuthContext` pour permettre l’accès sans API ; les pages qui appellent `fetchApi` avec `token === 'demo'` peuvent soit ne pas appeler l’API (garder mock), soit appeler et ignorer 401 (affichage mock).

---

## 7. Résumé des priorités

1. **Stocks** — Brancher `/stocks` sur `GET /products` (API existante) ; optionnel PATCH quantité.
2. **Rush** — Créer endpoint alertes + SSE/WS + mode dégradé ; brancher le frontend Rush.
3. **Fiches techniques** — Nouveau module backend (tables + CRUD) puis brancher liste/détail.
4. **Suggestions IA** — Endpoints + logique métier (ou mock serveur) puis brancher la page Suggestions.
5. **Paramètres & Abonnement** — Settings tenant + Stripe ; brancher Paramètres et Abonnement.
6. **Admin** — Auth admin + routes admin ; brancher les vues admin.

En suivant ce guide, le frontend déjà développé reste la base : on ajoute le backend et on remplace progressivement les mocks par des appels API en gardant le même rendu et, si besoin, un fallback mock pour la résilience ou la démo.
