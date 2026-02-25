# Avis : repenser le front en React ou Next.js + Tailwind

**Contexte :** Pages HTML statiques + `layout.js` (nav partagée) + Tailwind CDN. Problèmes de style (nav/dashboard) liés à l’ordre de chargement Tailwind / contenu dynamique.

---

## Pourquoi passer à React ou Next.js + Tailwind a du sens

### 1. **Tailwind “pour de vrai” (build step)**
- Aujourd’hui : Tailwind CDN en JIT qui scanne le DOM au chargement → contenu injecté après (nav, données) n’était pas vu → correctif = charger Tailwind après le layout.
- Avec React/Next : Tailwind en build (Purge/JIT) scanne les **fichiers** (JSX/TSX). Toutes les classes utilisées sont dans le CSS final. Plus de problème “contenu ajouté après = pas stylé”.

### 2. **Un seul arbre de composants**
- Nav, header, pages = composants. Plus de `innerHTML` dans `layout.js`, plus de duplication de structure entre pages.
- Layout partagé = un composant `<Layout><Outlet /></Layout>` (React Router) ou `_app.tsx` + layouts (Next.js).

### 3. **État et données**
- État global (auth, user) ou par page (listes, filtres) avec hooks ou store. Plus de mélange de globals et de scripts inline par page.
- Appels API centralisés (hooks, services), gestion loading/erreur homogène.

### 4. **DX et maintenance**
- Composants réutilisables (boutons, cartes, tableaux, formulaires).
- Typage avec TypeScript.
- Hot reload, outillage (ESLint, tests composants) standard.

### 5. **Évolution produit**
- Chat, dashboard, prévisions, formulaires complexes se modélisent bien en composants et en routes.
- Possibilité d’ajouter du SSR ou du pré-rendu (Next.js) si besoin (SEO, perf).

---

## React (Vite + React Router) vs Next.js

| Critère | React (Vite + React Router) | Next.js |
|--------|-----------------------------|--------|
| **API actuelle** | Garde l’API Express telle quelle ; le front est une SPA qui appelle `localhost:3000/...` | Idem : front Next peut appeler la même API (pas besoin de tout migrer en API Routes) |
| **Routing** | React Router (client-side) | Fichiers dans `pages/` ou `app/` (routes + possibles API Routes) |
| **Build** | Vite : build rapide, sortie statique ou SPA | Build Next (SSR/SSG optionnel) |
| **Complexité** | Plus simple si tu veux “juste une SPA” | Plus de concepts (SSR, SSG, API Routes) si tu en profites |
| **Déploiement** | Build → servir les fichiers statiques (Express peut servir le `dist/` ou un autre serveur) | Idem ou déploiement Vercel/Node |

**Recommandation courte :**
- **React (Vite) + React Router** : si tu veux un front moderne, une seule app, sans besoin de SSR tout de suite. Tu gardes l’API Express, tu construis une SPA qui consomme cette API. Tailwind s’intègre parfaitement (build time).
- **Next.js** : si tu envisages du SSR, du pré-rendu de pages, ou une évolution “full-stack” dans le même repo (API Routes + pages). Un peu plus lourd pour une première migration.

---

## Migration progressive

1. **Phase 1 (court terme)**  
   - Garder l’API Express.
   - Créer un projet React (Vite) ou Next en parallèle (ex. `apps/frontend` ou `packages/web`).
   - Configurer Tailwind en build (content: `./src/**/*.{js,ts,jsx,tsx}`).
   - Reproduire une première page (ex. login ou dashboard) en composants, en appelant l’API existante.

2. **Phase 2**  
   - Migrer page par page (estimations, stats, chat, etc.) en composants.
   - Réutiliser le même `api-client` (fetch + token) ou le réécrire en hooks (`useAuth`, `useApi`).

3. **Phase 3**  
   - Servir la SPA depuis Express (ex. `app.use(express.static('apps/frontend/dist'))` pour la prod) ou déployer le front à part.
   - Désactiver progressivement les anciennes routes HTML si tout est migré.

---

## Conclusion

- **Oui**, repenser les pages en React ou Next.js + Tailwind est une bonne idée à moyen terme : plus de cohérence, plus de maintenabilité, et plus de problème de “Tailwind qui ne voit pas la nav”.
- **Court terme** : le correctif actuel (charger Tailwind après le layout) suffit pour que la nav et le dashboard s’affichent correctement avec le stack HTML actuel.
- **Choix pratique** : commencer par **React (Vite) + React Router + Tailwind**, en gardant l’API Express, puis envisager Next.js si besoin de SSR ou d’une stack “tout-en-un” plus tard.
