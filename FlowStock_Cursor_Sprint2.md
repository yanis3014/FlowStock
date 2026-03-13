# 🟠 FlowStock — Prompt Cursor : Sprint 2 (Cohérence produit)

> Copie ce prompt entier dans Cursor (Composer, mode Agent).
> Prérequis : le Sprint 1 est terminé (tailwind.config.js corrigé, /rush connecté, bugs nav et admin fixés).
> Ce sprint contient 6 tâches ordonnées par priorité. Exécute-les dans l'ordre.

---

## Contexte général

Tu travailles sur **FlowStock**, un SaaS de gestion de stocks pour restaurateurs indépendants.
Stack : Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui.
Structure monorepo : `apps/web/src` (frontend), `apps/api/src` (backend Express).

Le design system cible s'appelle **"Warm Tech"** :
- Couleurs : `text-green-deep`, `bg-cream`, `text-charcoal`, `text-terracotta`, `text-gold`, `bg-charcoal`
- Typo titres : `font-display` (Sora)
- Typo corps : `font-sans` (DM Sans)
- Bouton primaire : fond `bg-green-deep`, texte `text-cream`, hover `bg-forest-green`
- Bouton secondaire : bordure `border-green-deep`, texte `text-green-deep`, fond transparent
- Fond de page : `bg-cream` ou `bg-charcoal` (dark)
- Cards : `bg-white` avec ombre douce ou `border border-cream`
- Erreur / alerte critique : `text-terracotta` / `bg-terracotta/10`
- Accent premium : `text-gold`

La famille "Generic SaaS" a abandonner :
- `text-primary`, `bg-error`, `text-success`, `text-warning`
- Boutons bleus (`bg-blue-*`, `text-blue-*`)
- Fonds blancs plats sans warmth

La page de reference pour le style est `apps/web/src/app/(app)/stocks/page.tsx` — la plus propre et la plus representative du design cible.

---

## TACHE 6 — Migrer les 6 pages "Generic SaaS" vers le vocabulaire Warm Tech

### Pages a migrer (dans cet ordre de priorite)
1. `apps/web/src/app/(app)/stats/page.tsx`
2. `apps/web/src/app/(app)/sales/page.tsx`
3. `apps/web/src/app/(app)/forecast/page.tsx`
4. `apps/web/src/app/(app)/chat/page.tsx`
5. `apps/web/src/app/(app)/formulas/page.tsx`
6. `apps/web/src/app/(app)/custom-formulas/page.tsx`

Note : les taches 7 (fusion formulas) et 6 se chevauchent. Fais la migration de style sur ces pages AVANT de les fusionner.

### Ce que tu dois faire pour CHAQUE page

**Etape 6.A — Identifier les tokens CSS "ancienne charte"**

Dans chaque fichier, cherche ces patterns et note leur occurrence :
```
text-primary    bg-primary    border-primary
text-success    bg-success
text-warning    bg-warning
text-error      bg-error
bg-blue-*       text-blue-*
text-gray-*     bg-gray-*   (sauf gray-50, gray-100 qui peuvent rester pour fonds neutres)
font-semibold   (sur les titres H1/H2 — les remplacer par font-display font-bold)
```

**Etape 6.B — Table de correspondance a appliquer**

| Ancienne classe | Nouvelle classe Warm Tech |
|---|---|
| `text-primary` | `text-green-deep` |
| `bg-primary` | `bg-green-deep` |
| `border-primary` | `border-green-deep` |
| `hover:bg-primary-dark` ou `hover:bg-primary/90` | `hover:bg-forest-green` |
| `text-success` | `text-green-deep` |
| `bg-success` | `bg-green-deep/10` |
| `text-warning` | `text-gold` |
| `bg-warning` | `bg-gold/10` |
| `text-error` | `text-terracotta` |
| `bg-error` | `bg-terracotta/10` |
| `bg-blue-600` / `bg-blue-500` | `bg-green-deep` |
| `text-blue-600` / `text-blue-500` | `text-green-deep` |
| `text-gray-900` (texte principal) | `text-charcoal` |
| `text-gray-600` / `text-gray-500` (secondaire) | `text-charcoal/60` |
| `bg-gray-50` / `bg-gray-100` (fond de page) | `bg-cream` |
| `bg-white` sur les cards | `bg-white` — garder tel quel |

**Etape 6.C — Corriger la typographie des titres**

Pour chaque `<h1>`, `<h2>`, `<h3>` et tout element qui fait office de titre de page ou de section :
- Remplace `font-semibold` par `font-display font-bold`
- Ajoute `text-charcoal` si aucune couleur n'est definie

```tsx
// Avant
<h1 className="text-2xl font-semibold text-gray-900">Statistiques</h1>
// Apres
<h1 className="text-2xl font-display font-bold text-charcoal">Statistiques</h1>
```

**Etape 6.D — Corriger les boutons principaux**

```tsx
// Avant (typique)
<button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
// Apres
<button className="bg-green-deep text-cream px-4 py-2 rounded-lg hover:bg-forest-green transition-colors">

// Boutons secondaires (outline)
// Avant
<button className="border border-primary text-primary ...">
// Apres
<button className="border border-green-deep text-green-deep hover:bg-green-deep/5 ...">
```

**Etape 6.E — Corriger le fond de page**

Si la page a un fond `bg-gray-50`, `bg-gray-100`, ou `bg-white` au niveau du container principal, remplace par `bg-cream`.

**Etape 6.F — Cas particulier : `chat/page.tsx`**

En plus de la migration de style, corrige ce bug critique :

```tsx
// Cherche cette ligne (ou similaire) :
const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000'

// Remplace par :
const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL

// Dans la fonction qui appelle ce service, ajoute une guard :
if (!ML_SERVICE_URL) {
  setError("Le service IA n'est pas configure. Contactez l'administrateur.")
  return
}
```

**Critere de succes Tache 6** : Naviguer de `/dashboard` vers `/stats`, `/sales`, `/forecast`, `/chat` doit donner l'impression d'etre dans le meme produit. Aucune couleur bleue, aucun bouton en `bg-primary` ne doit subsister dans ces 6 pages.

---

## TACHE 7 — Fusionner `/formulas` et `/custom-formulas` en une seule page a onglets

### Probleme
Deux entrees de navigation distinctes pour un meme domaine metier. Surcharge de navigation et double maintenance.

### Ce que tu dois faire

**Etape 7.1 — Auditer les deux pages**

Lis ces fichiers :
- `apps/web/src/app/(app)/formulas/page.tsx`
- `apps/web/src/app/(app)/custom-formulas/page.tsx`

Note pour chacun : le composant principal, les endpoints API appeles, l'etat local, les actions disponibles.

**Etape 7.2 — La page `/formulas` sera la page hote**

Route finale : `/formulas` uniquement.

**Etape 7.3 — Creer la page fusionnee**

Dans `apps/web/src/app/(app)/formulas/page.tsx`, remplace le contenu par une page a onglets :

```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Tab = 'standard' | 'custom'

export default function FormulasPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'standard'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <div className="p-6 bg-cream min-h-screen">
      <h1 className="text-2xl font-display font-bold text-charcoal mb-6">Formules</h1>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-charcoal/10 mb-6">
        {[
          { id: 'standard' as Tab, label: 'Formules standard' },
          { id: 'custom' as Tab, label: 'Formules personnalisees' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-green-deep text-green-deep'
                : 'border-transparent text-charcoal/60 hover:text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'standard' && <StandardFormulasContent />}
      {activeTab === 'custom' && <CustomFormulasContent />}
    </div>
  )
}
```

Deplace la logique de chaque ancienne page dans les composants `StandardFormulasContent` et `CustomFormulasContent`. Cree-les dans le meme fichier ou dans `_components/` si le code est volumineux.

**Etape 7.4 — Redirection depuis `/custom-formulas`**

Remplace `apps/web/src/app/(app)/custom-formulas/page.tsx` par :

```tsx
import { redirect } from 'next/navigation'
export default function CustomFormulasRedirect() {
  redirect('/formulas?tab=custom')
}
```

**Etape 7.5 — Mettre a jour la navigation**

Dans `apps/web/src/lib/nav-config.ts` :
- Supprime l'entree `/custom-formulas`
- Conserve uniquement l'entree `/formulas` avec le label "Formules"

**Critere de succes Tache 7** : La sidebar n'a plus qu'une seule entree "Formules". L'URL `/custom-formulas` redirige vers `/formulas`. Les deux contenus sont accessibles via onglets. Aucune regression fonctionnelle.

---

## TACHE 8 — Aligner les noms de tiers d'abonnement frontend/backend

### Probleme
Le backend (`subscription.service.ts`) utilise `normal` / `premium` / `premium_plus`.
Le frontend (`/abonnement/page.tsx`) envoie probablement `Standard` / `Premium` / `Enterprise`.
Ce mismatch fait echouer les appels API silencieusement avec une erreur 400.

### Ce que tu dois faire

**Etape 8.1 — Verifier les valeurs envoyees par le frontend**

Ouvre `apps/web/src/app/(app)/abonnement/page.tsx`.
Note exactement les strings utilisees dans les appels API.

**Etape 8.2 — Verifier les valeurs attendues par le backend**

Ouvre `apps/api/src/services/subscription.service.ts`.
Confirme les valeurs : `'normal'`, `'premium'`, `'premium_plus'`.

**Etape 8.3 — Creer les constantes**

Dans `apps/web/src/app/(app)/abonnement/page.tsx` (ou `lib/subscriptions.ts`) :

```typescript
export const SUBSCRIPTION_TIERS = {
  normal: 'normal',
  premium: 'premium',
  premium_plus: 'premium_plus',
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS

// Labels d'affichage (separes des valeurs API)
export const TIER_LABELS: Record<SubscriptionTier, string> = {
  normal: 'Starter',
  premium: 'Growth',
  premium_plus: 'Scale',
}
```

**Etape 8.4 — Remplacer les valeurs hardcodees**

- Les **valeurs envoyees a l'API** doivent etre `'normal'`, `'premium'`, `'premium_plus'`
- Les **labels affiches a l'utilisateur** utilisent `TIER_LABELS[tier]`

**Critere de succes Tache 8** : Un clic sur "Passer au plan Growth" envoie `{ tier: 'premium' }` a l'API. Verifiable dans les DevTools Network.

---

## TACHE 9 — Masquer `/onboarding` de la navigation une fois l'onboarding complete

### Probleme
L'entree `/onboarding` dans la sidebar est visible en permanence, meme pour les utilisateurs qui ont deja fait leur onboarding.

### Ce que tu dois faire

**Etape 9.1 — Trouver si un champ `onboardingCompleted` existe**

Cherche dans :
- `apps/web/src/contexts/AuthContext.tsx` — l'objet `user` a-t-il un champ `onboardingCompleted` ou `onboarding_completed` ?
- `apps/api/src/services/auth.service.ts` — ce champ est-il retourne par `/auth/me` ?

**Etape 9.2 — Cas A : le champ existe dans l'API**

Ajoute `hideWhenOnboarded: true` a l'item `/onboarding` dans `nav-config.ts`.
Dans `Sidebar.tsx`, filtre les items :
```tsx
const { user } = useAuth()
const visibleItems = navItems.filter(item => {
  if (item.hideWhenOnboarded && user?.onboardingCompleted) return false
  return true
})
```

**Etape 9.3 — Cas B : le champ n'existe pas**

Utilise `localStorage` comme solution temporaire :

Dans `onboarding/page.tsx`, a la derniere etape (bouton "Terminer") :
```typescript
localStorage.setItem('flowstock_onboarding_completed', 'true')
// puis router.push('/dashboard')
```

Dans `Sidebar.tsx` :
```tsx
const [onboardingDone, setOnboardingDone] = useState(false)
useEffect(() => {
  setOnboardingDone(localStorage.getItem('flowstock_onboarding_completed') === 'true')
}, [])

const visibleItems = navItems.filter(item => {
  if (item.hideWhenOnboarded && onboardingDone) return false
  return true
})
```

Ajoute un commentaire :
```typescript
// TODO Sprint 3 : remplacer localStorage par user.onboardingCompleted depuis l'API
```

**Etape 9.4 — Ne pas bloquer l'acces direct**

La page `/onboarding` doit rester accessible via URL directe. Ne pose aucune redirect. Masque-la seulement dans la sidebar.

**Critere de succes Tache 9** : Un utilisateur ayant complete l'onboarding ne voit plus "Configuration initiale" dans la sidebar. Un nouvel utilisateur la voit toujours.

---

## TACHE 10 — Centraliser le guard d'authentification dans `(app)/layout.tsx`

### Probleme
Le guard `if (!user) router.push('/login')` est repete sur chaque page. Toute nouvelle page oubliee devient accessible sans login.

### Ce que tu dois faire

**Etape 10.1 — Identifier le pattern de guard actuel**

Ouvre 2-3 pages (`stocks/page.tsx`, `dashboard/page.tsx`) et note la forme exacte du guard.

**Etape 10.2 — Verifier si `(app)/layout.tsx` existe**

Cherche `apps/web/src/app/(app)/layout.tsx`.

**Etape 10.3 — Implementer le guard dans le layout**

```tsx
// apps/web/src/app/(app)/layout.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext' // adapte le chemin

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-deep border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
```

Si ce layout contient deja la Sidebar et le layout principal, ne la retire pas — ajoute simplement le guard avant le return principal.

**Etape 10.4 — Supprimer les guards redondants dans les pages**

Cherche et supprime toutes les occurrences de guard d'auth dans les fichiers sous `apps/web/src/app/(app)/` :
```bash
grep -rn "router.push.*login\|redirect.*login\|requireAuth" apps/web/src/app/\(app\)/ --include="*.tsx"
```

Supprime ces blocs dans chaque page trouvee. Ne touche pas aux pages hors du dossier `(app)/`.

**Critere de succes Tache 10** : Le guard n'existe qu'en un seul endroit. La commande grep ci-dessus ne retourne que le layout.

---

## TACHE 11 — Grouper la sidebar en 5 sections avec labels

### Probleme
21 items plats sans groupement. Incomprehensible pour un restaurateur.

### Groupes cibles

| Groupe | Items |
|---|---|
| **Operations** | Mode Rush, Dashboard, Stocks, Ventes |
| **Analyses** | Stats & Previsions, Mouvements |
| **Configuration** | Fournisseurs, Emplacements, Fiches techniques, Import stocks |
| **Intelligence IA** | Suggestions IA, Chat IA, Formules |
| **Compte** | Parametres, Abonnement, Configuration initiale (conditionnel) |
| **Admin** *(role admin seulement)* | Administration |

### Ce que tu dois faire

**Etape 11.1 — Restructurer `nav-config.ts`**

```typescript
export interface NavItem {
  href: string
  label: string
  icon: string
  hideWhenOnboarded?: boolean
  adminOnly?: boolean
  hidden?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/rush', label: 'Mode Rush', icon: 'Zap' },
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { href: '/stocks', label: 'Stocks', icon: 'Package' },
      { href: '/sales', label: 'Ventes', icon: 'ShoppingCart' },
    ],
  },
  {
    label: 'Analyses',
    items: [
      { href: '/stats', label: 'Stats & Previsions', icon: 'BarChart2' },
      { href: '/movements', label: 'Mouvements', icon: 'ArrowLeftRight' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/suppliers', label: 'Fournisseurs', icon: 'Truck' },
      { href: '/locations', label: 'Emplacements', icon: 'MapPin' },
      { href: '/fiches-techniques', label: 'Fiches techniques', icon: 'FileText' },
      { href: '/import-stocks', label: 'Import stocks', icon: 'Upload' },
      { href: '/import-sales', label: 'Import ventes', icon: 'Upload', hidden: true },
    ],
  },
  {
    label: 'Intelligence IA',
    items: [
      { href: '/suggestions', label: 'Suggestions IA', icon: 'Lightbulb' },
      { href: '/chat', label: 'Chat IA', icon: 'MessageSquare' },
      { href: '/formulas', label: 'Formules', icon: 'Calculator' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { href: '/parametres', label: 'Parametres', icon: 'Settings' },
      { href: '/abonnement', label: 'Abonnement', icon: 'CreditCard' },
      { href: '/onboarding', label: 'Configuration initiale', icon: 'PlayCircle', hideWhenOnboarded: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin', label: 'Administration', icon: 'ShieldCheck', adminOnly: true },
    ],
  },
]

// Retrocompatibilite
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items)
```

**Etape 11.2 — Mettre a jour `Sidebar.tsx`**

```tsx
import { NAV_GROUPS } from '@/lib/nav-config'

// Dans le composant :
const filteredGroups = NAV_GROUPS.map(group => ({
  ...group,
  items: group.items.filter(item => {
    if (item.hidden) return false
    if (item.hideWhenOnboarded && onboardingDone) return false
    if (item.adminOnly && user?.role !== 'admin') return false
    return true
  }),
})).filter(group => group.items.length > 0)

// Dans le JSX :
<nav className="flex flex-col gap-1 px-3 py-4">
  {filteredGroups.map((group, groupIdx) => (
    <div key={group.label} className={groupIdx > 0 ? 'mt-5' : ''}>
      <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-charcoal/40">
        {group.label}
      </p>
      {group.items.map(item => (
        <SidebarItem key={item.href} item={item} />
      ))}
    </div>
  ))}
</nav>
```

**Etape 11.3 — Verifier la MobileBottomNav**

La `MobileBottomNav` n'affiche que 4-5 items. Elle ne doit pas utiliser `NAV_GROUPS`.
Si elle importe depuis `nav-config.ts`, assure-toi qu'elle utilise `NAV_ITEMS` (liste plate) ou une liste hardcodee des items principaux.

**Etape 11.4 — Verifier les autres imports de `nav-config.ts`**

```bash
grep -rn "nav-config\|navItems\|NAV_ITEMS" apps/web/src/ --include="*.tsx" --include="*.ts"
```

Mets a jour chaque fichier trouve pour utiliser le bon export (`NAV_ITEMS` ou `NAV_GROUPS`).

**Critere de succes Tache 11** : La sidebar affiche 5-6 sections avec des labels. Les items conditionnels sont correctement masques. La MobileBottomNav fonctionne toujours.

---

## Verifications finales Sprint 2

1. **Build** : `pnpm build` dans `apps/web/`. Zero erreur TypeScript.

2. **Coherence visuelle** : Ouvre `/dashboard`, `/stats`, `/sales`, `/forecast`, `/chat` en sequence. Memes couleurs, memes boutons, meme typo.

3. **Formules** : Une seule entree dans la sidebar. `/custom-formulas` redirige. Deux onglets fonctionnels.

4. **Abonnement** : Dans les DevTools Network, un clic sur changement de plan envoie `normal`, `premium`, ou `premium_plus`.

5. **Onboarding** : Apres `localStorage.setItem('flowstock_onboarding_completed', 'true')` + reload, l'entree disparait de la sidebar.

6. **Auth guard unique** : `grep -rn "router.push.*login" apps/web/src/app/\(app\)/` — seul le layout repond.

7. **Sidebar groupee** : 5-6 sections visibles avec labels, aucun item manquant, aucun doublon.

---

## Notes importantes pour Cursor

- Page de reference design : `apps/web/src/app/(app)/stocks/page.tsx`.
- Ne change pas la logique metier — uniquement les classes CSS et la structure de navigation.
- Ne fusionne pas `/stats` et `/forecast` en onglets dans ce sprint — c'est Sprint 3. Mets-les juste dans le meme groupe de nav "Analyses".
- Si un fichier n'est pas a l'emplacement indique, fais une recherche globale avant de le creer.
- Commits apres chaque tache :
  - `style: migrate stats/sales/forecast/chat to warm tech design system`
  - `feat: merge formulas pages into tabbed interface`
  - `fix: align subscription tier names with backend values`
  - `feat: hide onboarding from nav when completed`
  - `refactor: centralize auth guard in app layout`
  - `feat: group sidebar into 5 sections with labels`
