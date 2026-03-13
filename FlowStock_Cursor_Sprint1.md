# 🚀 FlowStock — Prompt Cursor : Sprint 1 (Fixes bloquants démo)

> Copie ce prompt entier dans Cursor (Composer, mode Agent).
> Chaque tâche est autonome et ordonnée par priorité. Exécute-les dans l'ordre.

---

## Contexte général

Tu travailles sur **FlowStock**, un SaaS de gestion de stocks pour restaurateurs.
Stack : Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui.
Structure : monorepo avec `apps/web/src` (frontend) et `apps/api/src` (backend Express).

Ce sprint corrige **4 problèmes bloquants** avant toute démo ou test utilisateur.
Ne touche à rien d'autre que ce qui est décrit dans chaque tâche.

---

## TÂCHE 1 — Page `/import-sales` : retirer de la nav ou afficher un état "bientôt disponible"

### Problème
La page `apps/web/src/app/(app)/import-sales/page.tsx` contient seulement :
```tsx
<p>Contenu à venir (Import ventes).</p>
```
Elle apparaît dans la navigation principale. Un utilisateur qui clique dessus tombe sur une page vide. C'est une perte de crédibilité immédiate.

### Ce que tu dois faire

**Étape 1.1 — Trouver l'entrée de navigation**

Cherche dans ces fichiers (dans cet ordre) la définition des items de navigation :
- `apps/web/src/lib/nav-config.ts`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/AppLayout.tsx`
- `apps/web/src/components/layout/Navigation.tsx`

Cherche la chaîne `import-sales` ou `Import ventes` ou `importSales`.

**Étape 1.2 — Masquer l'entrée de navigation**

Dans le fichier de config de navigation, trouve l'objet qui correspond à `/import-sales`.
Ajoute-lui la propriété `hidden: true` (si ce pattern existe déjà sur d'autres items).
Si ce pattern n'existe pas, commente simplement l'objet de l'entrée de nav avec le commentaire `// TODO Sprint 2 : Import ventes`.

Si la nav est construite directement dans le JSX (pas via une config), commente le `<NavItem>` ou `<SidebarItem>` correspondant.

**Étape 1.3 — Remplacer le contenu de la page**

Remplace le contenu de `apps/web/src/app/(app)/import-sales/page.tsx` par un composant "Bientôt disponible" propre au design system FlowStock :

```tsx
// Le composant doit :
// - Utiliser bg-cream, text-charcoal, text-green-deep (Warm Tech palette)
// - Afficher une icône (Clock ou Construction de lucide-react)
// - Titre en font-display : "Import des ventes"
// - Sous-titre : "Cette fonctionnalité arrive prochainement."
// - Description courte : "Vous pourrez bientôt importer vos données de ventes depuis votre caisse (CSV, Lightspeed, Zelty...)."
// - Un bouton secondaire "Voir l'import des stocks" qui navigue vers /import-stocks
// - Pas de formulaire, pas d'appel API
```

**Critère de succès** : L'entrée `/import-sales` n'apparaît plus dans la sidebar. Si l'utilisateur accède à l'URL directement, il voit un état "bientôt disponible" clair et cohérent visuellement avec le reste de l'app.

---

## TÂCHE 2 — Bug mobile : le lien "Profil" pointe vers `/dashboard` au lieu de `/parametres`

### Problème
Dans `apps/web/src/components/layout/MobileBottomNav.tsx` (ou un fichier similaire — cherche `MobileBottomNav` ou `BottomNav` dans `components/layout/`), le dernier item de la barre de navigation mobile (icône utilisateur / "Profil") a son `href` défini à `/dashboard` au lieu de `/parametres`.

### Ce que tu dois faire

**Étape 2.1 — Localiser le fichier**

Cherche dans `apps/web/src/components/layout/` un fichier contenant `BottomNav` dans son nom ou qui contient du JSX avec des classes comme `fixed bottom-0` ou `md:hidden` et qui liste des items de navigation.

**Étape 2.2 — Corriger le href**

Trouve l'item de navigation avec une icône de type `User`, `UserCircle`, `Person`, ou avec un label contenant "Profil", "Profile", ou "Compte".

Change son `href` de `/dashboard` (ou quelle que soit la valeur incorrecte) vers `/parametres`.

**Étape 2.3 — Vérifier le `isActive` de cet item**

Si l'item utilise `pathname.startsWith(href)` pour calculer son état actif, assure-toi que `href` est bien `/parametres` dans les deux endroits (la définition de l'item et la logique `isActive`).

**Étape 2.4 — Vérifier les autres items de la bottom nav**

Pendant que tu es dans ce fichier, vérifie que les autres items pointent vers les bonnes routes :
- Accueil / Dashboard → `/dashboard`
- Stocks → `/stocks`
- Rush → `/rush`
- Tout autre item présent

Ne change rien si c'est déjà correct.

**Critère de succès** : Sur mobile (ou en réduisant la fenêtre < 768px), cliquer sur l'icône "Profil" dans la barre du bas navigue vers `/parametres`.

---

## TÂCHE 3 — Protection des routes `/admin` par rôle utilisateur

### Problème
Les routes `/admin/*` sont accessibles à tout utilisateur connecté. Il n'y a pas de vérification de rôle. Un restaurateur lambda peut accéder au back-office admin.

### Ce que tu dois faire

**Étape 3.1 — Trouver la structure des routes admin**

Cherche dans `apps/web/src/app/` un dossier `admin` ou `(admin)`. Liste les fichiers qu'il contient.

**Étape 3.2 — Trouver comment le rôle utilisateur est stocké**

Cherche dans ces fichiers la structure de l'objet `user` :
- `apps/web/src/contexts/AuthContext.tsx` (ou `auth-context.tsx`)
- `apps/web/src/hooks/useAuth.ts` (ou `useUser.ts`)
- `apps/web/src/types/user.ts` (ou `types/index.ts`)

Identifie le nom du champ rôle : `role`, `userRole`, `permissions`, etc.
Identifie la valeur pour un admin : `"admin"`, `"ADMIN"`, `"superadmin"`, etc.

**Étape 3.3 — Créer ou modifier le layout admin**

Cherche si `apps/web/src/app/(admin)/layout.tsx` ou `apps/web/src/app/admin/layout.tsx` existe déjà.

**Si le layout existe déjà** : ajoute la guard de rôle dedans.

**Si le layout n'existe pas** : crée `apps/web/src/app/(admin)/layout.tsx` (ou dans le bon dossier selon la structure existante).

Le layout doit :
```tsx
// 1. Récupérer l'utilisateur depuis useAuth() ou le contexte existant
// 2. Si l'utilisateur n'est pas connecté → redirect('/login') ou redirect('/dashboard')
// 3. Si l'utilisateur est connecté mais role !== 'admin' → redirect('/dashboard')
//    + optionnellement un toast ou message "Accès refusé"
// 4. Sinon → afficher {children}
// Utilise le même pattern de guard que ce qui existe déjà dans les autres layouts
```

**Étape 3.4 — Vérifier qu'il n'y a pas déjà un middleware Next.js**

Cherche `apps/web/src/middleware.ts` ou `apps/web/middleware.ts`.
Si un middleware existe avec des règles sur `/admin`, ajoute la vérification de rôle dedans plutôt que dans le layout, en suivant le pattern existant.

**Critère de succès** : Un utilisateur connecté avec `role !== 'admin'` est redirigé vers `/dashboard` s'il essaie d'accéder à `/admin` ou n'importe quelle sous-route. Un utilisateur non connecté est redirigé vers `/login`.

---

## TÂCHE 4 — Connecter `/rush` aux vraies données de l'API

### Problème
C'est la tâche la plus importante. Le mode Rush est la **feature vitrine de FlowStock** — c'est ce que voit un restaurateur en service. Or, les données affichées dans `/rush` sont déconnectées de l'API `/products` réelle. Les stocks affichés sont statiques ou mockés.

### Ce que tu dois faire

**Étape 4.1 — Auditer le fichier actuel**

Ouvre `apps/web/src/app/(app)/rush/page.tsx`.

Cherche :
- Des constantes `MOCK_*`, des tableaux hardcodés, des `useState` initialisés avec des données en dur
- Des `useEffect` qui n'appellent pas l'API
- Des imports de données statiques depuis `lib/` ou `data/`

Note exactement ce qui est mocké.

Ouvre aussi `apps/web/src/app/(app)/rush/stocks/page.tsx` si ce fichier existe.

**Étape 4.2 — Identifier l'endpoint API correct**

Cherche dans `apps/api/src/routes/` le fichier qui gère les routes `/products` ou `/stocks` :
- Probablement `products.ts`, `stocks.ts`, ou `inventory.ts`

Identifie :
- La route GET principale (ex: `GET /api/products` ou `GET /api/stocks`)
- Les paramètres disponibles (filtre par location, par catégorie, seuil d'alerte...)
- La structure de la réponse (les champs : `id`, `name`, `quantity`, `unit`, `threshold`, `category`...)

Si tu ne trouves pas dans les routes API, cherche dans `apps/web/src/lib/api.ts` ou `apps/web/src/hooks/` un hook `useProducts` ou `useStocks` qui existe déjà et qui est utilisé dans d'autres pages comme `/stocks/page.tsx`.

**Étape 4.3 — Créer ou réutiliser le hook de données**

Regarde comment `/stocks/page.tsx` (la page principale de gestion des stocks) fetch ses données. Elle est déjà connectée à l'API.

**Si elle utilise un hook custom** (ex: `useStocks()`, `useProducts()`), importe et réutilise ce même hook dans `rush/page.tsx`.

**Si elle fetch directement** via `useEffect + fetch` ou `axios`, reproduis le même pattern dans `rush/page.tsx`.

**Étape 4.4 — Remplacer les données mockées**

Dans `rush/page.tsx` :

1. **Supprime** (ou commente avec `// REMOVED MOCK`) toutes les données hardcodées et constantes `MOCK_*`

2. **Ajoute** l'appel API pour récupérer les produits/stocks. La liste doit contenir au minimum : nom du produit, quantité actuelle, unité, seuil d'alerte (pour colorer en rouge/orange/vert)

3. **Ajoute les états de chargement** :
   - Pendant le fetch : affiche un skeleton ou un spinner (utilise le composant `Skeleton` existant si disponible)
   - En cas d'erreur : affiche un message d'erreur avec bouton "Réessayer"
   - Si la liste est vide : affiche un état vide "Aucun produit trouvé"

4. **Préserve l'UI et le design Rush** : ne change pas les classes CSS, les couleurs, la mise en page. Change uniquement la source des données.

**Étape 4.5 — Corriger `cacheMinutes` (bug secondaire)**

Dans `rush/page.tsx`, cherche :
```tsx
const [cacheMinutes, setCacheMinutes] = useState(2)
```
Cette valeur ne se met jamais à jour. Remplace-la par la vraie date de dernier fetch.

Change le pattern pour qu'il affiche l'heure réelle du dernier fetch :
```tsx
const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
// Après chaque fetch réussi : setLastFetchTime(new Date())
// Dans le JSX : affiche lastFetchTime ? `Mis à jour à ${lastFetchTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Chargement...'
```

**Étape 4.6 — Faire de même pour `rush/stocks/page.tsx`**

Si ce fichier existe, applique le même traitement (étapes 4.3 et 4.4) pour ce fichier.

**Critère de succès** :
- `/rush` affiche les vrais produits de la base de données
- L'indicateur de temps montre l'heure réelle du dernier fetch
- Les états loading/error/empty sont gérés
- Le design et les couleurs du mode Rush sont inchangés

---

## Vérifications finales (après les 4 tâches)

Avant de considérer le sprint terminé, vérifie ces points :

1. **Build** : Lance `pnpm build` (ou `npm run build`) dans `apps/web/`. S'assure qu'il n'y a aucune erreur TypeScript ou de build. Corrige les erreurs de types si nécessaire.

2. **Navigation mobile** : Dans le navigateur, réduis la fenêtre à < 768px et navigue via la bottom nav. Vérifie que "Profil" ouvre bien `/parametres`.

3. **Route admin** : Teste en étant connecté avec un compte non-admin. Essaie d'accéder à `/admin`. Tu dois être redirigé vers `/dashboard`.

4. **Page import-sales** : Va sur `/import-sales`. Tu dois voir la page "bientôt disponible" et non le contenu vide. Vérifie que la sidebar ne montre plus cette entrée.

5. **Rush** : Va sur `/rush`. Tu dois voir de vraies données ou un skeleton de chargement, jamais des données hardcodées avec des noms fictifs.

---

## Notes importantes pour Cursor

- **Ne refactore rien d'autre** que ce qui est décrit. Pas de renommage de fichiers, pas de restructuration de dossiers.
- **Préserve tous les designs existants** : ne change pas les classes Tailwind, les couleurs, les espacements, sauf si une tâche le demande explicitement.
- Si un fichier attendu n'existe pas à l'emplacement indiqué, cherche-le avec une recherche globale (`grep -r "nom"`) et adapte.
- En cas de doute sur un pattern, regarde comment `/stocks/page.tsx` est implémenté — c'est la page de référence, la mieux codée du projet.
- Commit après chaque tâche avec un message clair : `fix: remove import-sales from nav`, `fix: mobile bottom nav profil href`, `fix: protect admin routes`, `feat: connect rush to real API`.
