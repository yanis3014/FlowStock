# 🟡 FlowStock — Prompt Cursor : Sprint 3 (V1 solide)

> Copie ce prompt entier dans Cursor (Composer, mode Agent).
> Prerequis : Sprint 1 et Sprint 2 termines.
> Ce sprint contient 6 taches. Certaines sont independantes — tu peux les parallelliser si tu travailles sur plusieurs fichiers en meme temps. L'ordre recommande est 13 → 12 → 17 → 14 → 16 → 15 (du plus rapide au plus long).

---

## Contexte general

Tu travailles sur **FlowStock**, un SaaS de gestion de stocks pour restaurateurs independants.
Stack : Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui.
Structure monorepo : `apps/web/src` (frontend), `apps/api/src` (backend Express).

Design system Warm Tech (deja applique depuis Sprint 2) :
- Fond : `bg-cream`, texte : `text-charcoal`, accent : `text-green-deep`, CTA : `bg-green-deep text-cream`
- Titres : `font-display font-bold`
- Erreurs : `text-terracotta`, warnings : `text-gold`

Pages de reference :
- Design : `apps/web/src/app/(app)/stocks/page.tsx`
- Pattern API fetch : `apps/web/src/app/(app)/movements/page.tsx`
- Pattern CRUD modal : `apps/web/src/app/(app)/suppliers/page.tsx`

---

## TACHE 13 — Ajouter `sonner` pour des toasts coherents dans toute l'app

### Probleme
Il n'y a pas de systeme de notifications unifie. Chaque page gere ses retours utilisateur differemment (alert(), console.log, etats d'erreur dans le DOM, rien du tout). Le resultat est incoherent et non professionnel.

### Ce que tu dois faire

**Etape 13.1 — Installer sonner**

```bash
npm install sonner
# ou
pnpm add sonner
```

**Etape 13.2 — Ajouter le Toaster dans le layout racine**

Ouvre le layout racine de l'app. C'est l'un de ces fichiers (cherche dans l'ordre) :
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/(app)/layout.tsx`

Ajoute le composant `<Toaster>` de sonner a la fin du `<body>`, avant la fermeture :

```tsx
import { Toaster } from 'sonner'

// Dans le JSX, apres {children} :
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: '#F7F2E8',   // bg-cream
      color: '#1C2B2A',        // text-charcoal
      border: '1px solid #1E4A3A20',
      fontFamily: 'DM Sans, sans-serif',
    },
    classNames: {
      success: 'border-l-4 border-l-[#1E4A3A]',
      error: 'border-l-4 border-l-[#C1440E]',
      warning: 'border-l-4 border-l-[#D4A843]',
    },
  }}
/>
```

**Etape 13.3 — Remplacer les feedbacks utilisateur existants dans les pages CRUD**

Cherche dans ces fichiers tous les patterns de feedback utilisateur a remplacer :

Fichiers prioritaires (pages avec actions CRUD) :
- `apps/web/src/app/(app)/stocks/page.tsx`
- `apps/web/src/app/(app)/suppliers/page.tsx`
- `apps/web/src/app/(app)/locations/page.tsx`
- `apps/web/src/app/(app)/movements/page.tsx`

Patterns a remplacer :

```tsx
// Cherche et remplace :
alert('...')                           → toast('...')
alert('Erreur : ...')                  → toast.error('...')
console.error('...')                   → toast.error('...') (si l'utilisateur doit le voir)
setSuccessMessage('Sauvegarde...')     → toast.success('Sauvegarde.')
setError('Erreur lors de...')          → toast.error('Erreur lors de...')

// Apres une creation reussie :
toast.success('Produit cree avec succes.')

// Apres une modification :
toast.success('Modifications sauvegardees.')

// Apres une suppression :
toast.success('Element supprime.')

// En cas d'erreur API :
toast.error('Une erreur est survenue. Veuillez reessayer.')

// Import de sonner dans chaque fichier modifie :
import { toast } from 'sonner'
```

**Etape 13.4 — Supprimer les etats de feedback devenus inutiles**

Pour chaque page modifiee, si tu as supprime des `setSuccessMessage` / `setError` en faveur de toast :
- Cherche les `useState` correspondants (`successMessage`, `errorMessage`, `apiError`...)
- Supprime le `useState` et le JSX qui l'affichait (`{successMessage && <div>...}`)
- Ne supprime que les etats qui ne servent plus — garde ceux qui gèrent l'affichage conditionnel du formulaire

**Critere de succes Tache 13** : Toutes les actions CRUD (creer, modifier, supprimer) dans les pages stocks, suppliers, locations, movements declenchent un toast visible en haut a droite. Aucun `alert()` ne subsiste.

---

## TACHE 12 — Extraire le pattern CRUD modal en hook `useCrudModal<T>`

### Probleme
Le meme bloc de logique est copie-colle dans au moins 3 pages (`stocks`, `locations`, `suppliers`) :
```typescript
const [modalOpen, setModalOpen] = useState(false)
const [editingItem, setEditingItem] = useState<T | null>(null)
const [form, setForm] = useState<FormState>(defaultForm)
const [submitLoading, setSubmitLoading] = useState(false)
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
```
C'est de la duplication pure. Chaque correction ou amelioration doit etre faite en 3 endroits.

### Ce que tu dois faire

**Etape 12.1 — Lire les trois pages pour comprendre le pattern exact**

Ouvre et lis attentivement :
- `apps/web/src/app/(app)/stocks/page.tsx`
- `apps/web/src/app/(app)/suppliers/page.tsx`
- `apps/web/src/app/(app)/locations/page.tsx`

Pour chaque page, note :
- Les noms exacts des etats CRUD (ils peuvent varier entre pages)
- Les fonctions de gestion (`handleEdit`, `handleDelete`, `handleSubmit`, etc.)
- Ce qui est commun entre les trois pages
- Ce qui est specifique a chaque page (les champs du formulaire, les appels API)

**Etape 12.2 — Creer le fichier du hook**

Cree `apps/web/src/hooks/useCrudModal.ts` :

```typescript
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseCrudModalOptions<T, F> {
  // Fonction pour transformer un item en form state (pour l'edition)
  itemToForm: (item: T) => F
  // Form state par defaut (pour la creation)
  defaultForm: F
  // Callbacks pour les operations API
  onCreate: (form: F) => Promise<void>
  onUpdate: (id: string, form: F) => Promise<void>
  onDelete: (id: string) => Promise<void>
  // Messages de toast personnalisables
  messages?: {
    created?: string
    updated?: string
    deleted?: string
    createError?: string
    updateError?: string
    deleteError?: string
  }
}

export function useCrudModal<T extends { id: string }, F>({
  itemToForm,
  defaultForm,
  onCreate,
  onUpdate,
  onDelete,
  messages = {},
}: UseCrudModalOptions<T, F>) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [form, setForm] = useState<F>(defaultForm)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const openCreate = useCallback(() => {
    setEditingItem(null)
    setForm(defaultForm)
    setModalOpen(true)
  }, [defaultForm])

  const openEdit = useCallback((item: T) => {
    setEditingItem(item)
    setForm(itemToForm(item))
    setModalOpen(true)
  }, [itemToForm])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingItem(null)
    setForm(defaultForm)
  }, [defaultForm])

  const handleSubmit = useCallback(async () => {
    setSubmitLoading(true)
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, form)
        toast.success(messages.updated ?? 'Modifications sauvegardees.')
      } else {
        await onCreate(form)
        toast.success(messages.created ?? 'Element cree avec succes.')
      }
      closeModal()
    } catch (err) {
      const errorMsg = editingItem
        ? (messages.updateError ?? 'Erreur lors de la modification.')
        : (messages.createError ?? 'Erreur lors de la creation.')
      toast.error(errorMsg)
      console.error(err)
    } finally {
      setSubmitLoading(false)
    }
  }, [editingItem, form, onCreate, onUpdate, closeModal, messages])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return
    try {
      await onDelete(deleteConfirmId)
      toast.success(messages.deleted ?? 'Element supprime.')
      setDeleteConfirmId(null)
    } catch (err) {
      toast.error(messages.deleteError ?? 'Erreur lors de la suppression.')
      console.error(err)
    }
  }, [deleteConfirmId, onDelete, messages])

  return {
    // Etats
    modalOpen,
    editingItem,
    form,
    setForm,
    submitLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    // Actions
    openCreate,
    openEdit,
    closeModal,
    handleSubmit,
    handleDeleteConfirm,
    // Helper
    isEditing: editingItem !== null,
  }
}
```

**Etape 12.3 — Refactorer `suppliers/page.tsx` (page pilote)**

Commence par `suppliers/page.tsx`. C'est la page pilote — si ca marche ici, tu appliques le meme pattern aux deux autres.

Dans `suppliers/page.tsx` :

1. Supprime les `useState` CRUD individuels (modalOpen, editingItem, form, submitLoading, deleteConfirmId)

2. Definis les callbacks :
```typescript
const handleCreate = async (form: SupplierForm) => {
  await api.post('/suppliers', form) // adapte avec ton pattern useApi existant
}

const handleUpdate = async (id: string, form: SupplierForm) => {
  await api.put(`/suppliers/${id}`, form)
}

const handleDelete = async (id: string) => {
  await api.delete(`/suppliers/${id}`)
  // Recharge la liste
  await refetch()
}
```

3. Initialise le hook :
```typescript
const {
  modalOpen, editingItem, form, setForm,
  submitLoading, deleteConfirmId, setDeleteConfirmId,
  openCreate, openEdit, closeModal, handleSubmit, handleDeleteConfirm,
  isEditing,
} = useCrudModal<Supplier, SupplierForm>({
  defaultForm: { name: '', contact: '', email: '', phone: '' }, // adapte aux vrais champs
  itemToForm: (supplier) => ({
    name: supplier.name,
    contact: supplier.contact ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
  }),
  onCreate: handleCreate,
  onUpdate: handleUpdate,
  onDelete: handleDelete,
  messages: {
    created: 'Fournisseur ajoute.',
    updated: 'Fournisseur mis a jour.',
    deleted: 'Fournisseur supprime.',
  },
})
```

4. Remplace les appels directs aux anciens handlers par les nouvelles fonctions du hook.

5. Verifie que la page compile et fonctionne comme avant.

**Etape 12.4 — Appliquer le meme refactor a `locations/page.tsx` et `stocks/page.tsx`**

Une fois `suppliers/page.tsx` valide, applique le meme pattern aux deux autres pages.
Adapte les types (`Location`, `Stock`), les champs de formulaire et les endpoints API.

**Etape 12.5 — Verifier qu'il n'y a pas d'autres pages avec le meme pattern**

```bash
grep -rn "deleteConfirmId\|submitLoading.*useState\|editingItem.*useState" apps/web/src/app/ --include="*.tsx"
```

Si d'autres pages apparaissent, applique le meme refactor.

**Critere de succes Tache 12** : Le fichier `hooks/useCrudModal.ts` existe. Les pages `stocks`, `suppliers`, `locations` n'ont plus de `useState` CRUD individuels. Les comportements CRUD sont identiques a avant.

---

## TACHE 17 — Supprimer le fallback mock du dashboard

### Probleme
Dans `dashboard/page.tsx`, il y a une condition qui affiche des donnees mockees meme quand l'API retourne de vraies donnees :
```typescript
const useMock = !summary?.alerts?.length && ...
```
De plus, une suggestion IA hardcodee avec "saumon" est toujours affichee, quel que soit le restaurant.

### Ce que tu dois faire

**Etape 17.1 — Lire le fichier en entier**

Ouvre `apps/web/src/app/(app)/dashboard/page.tsx`.

Cherche et note tous les endroits ou :
- Une variable `useMock` (ou similaire) est definie ou utilisee
- Des constantes `MOCK_*` sont definies
- Des conditions comme `useMock ? mockData : realData` existent
- `MOCK_SUGGESTION_IA` ou tout objet de suggestion hardcode avec un nom de plat specifique

**Etape 17.2 — Supprimer la logique `useMock`**

Trouve la definition de `useMock` :
```typescript
// Quelque chose comme :
const useMock = !summary?.alerts?.length && !summary?.lowStockCount
// ou
const useMock = process.env.NODE_ENV === 'development' && !summary
```

Supprime cette variable et **toutes les expressions ternaires** qui l'utilisent.
Remplace `useMock ? mockData : realData` par `realData` directement.

Si `realData` peut etre `undefined` ou `null`, gere ce cas proprement :
```typescript
// Avant (avec mock fallback)
const alerts = useMock ? MOCK_ALERTS : summary?.alerts ?? []

// Apres (sans mock, avec gestion propre du cas vide)
const alerts = summary?.alerts ?? []
// Si vide, le JSX affiche un etat vide : "Aucune alerte pour le moment"
```

**Etape 17.3 — Supprimer `MOCK_SUGGESTION_IA`**

Cherche la constante `MOCK_SUGGESTION_IA` ou tout objet similaire avec un plat hardcode.
Supprime-la.

Pour la section "Suggestion IA" du dashboard, remplace par l'une de ces deux options :

**Option A (recommandee) — Appel API pour la suggestion**

Si un endpoint `/suggestions` ou `/dashboard/suggestion` existe dans le backend (verifie dans `apps/api/src/routes/`) :
```typescript
const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
const [suggestionLoading, setSuggestionLoading] = useState(true)

useEffect(() => {
  api.get('/dashboard/suggestion') // ou /suggestions?limit=1
    .then(data => setSuggestion(data))
    .catch(() => setSuggestion(null))
    .finally(() => setSuggestionLoading(false))
}, [])

// Dans le JSX :
{suggestionLoading && <Skeleton className="h-16 w-full" />}
{!suggestionLoading && suggestion && <SuggestionCard suggestion={suggestion} />}
{!suggestionLoading && !suggestion && null} // Masque la section si pas de suggestion
```

**Option B (si pas d'endpoint disponible) — Masquer la section**

Commente ou supprime le bloc JSX de la suggestion IA jusqu'a ce que l'endpoint existe.
Ajoute un commentaire : `{/* TODO Sprint 3 : connecter au vrai endpoint /suggestions */}`

**Etape 17.4 — Supprimer les autres constantes MOCK_***

Cherche toutes les constantes `MOCK_*` restantes dans le fichier.
Pour chacune :
- Si elle est utilisee dans une condition `useMock ? ... : ...` → tu l'as deja supprimee a l'etape 17.2
- Si elle est utilisee directement sans condition → c'est un cas a corriger : remplace par l'appel API reel ou par `null`/`[]` avec un etat vide propre

**Etape 17.5 — Verifier les etats loading/empty/error du dashboard**

Apres suppression des mocks, assure-toi que le dashboard gere correctement :
- **Loading** : skeleton ou spinner pendant le fetch
- **Erreur API** : message d'erreur avec bouton "Recharger"
- **Donnees vides** : si un restaurant nouveau n'a aucun stock/vente, le dashboard affiche des etats vides propres ("Aucun mouvement ce mois-ci") au lieu de planter ou d'afficher des donnees fictives

**Critere de succes Tache 17** : Le dashboard n'affiche jamais de donnees hardcodees. Si l'API retourne des donnees vides, on voit des etats vides. Si l'API est en erreur, on voit un message d'erreur. Aucune occurrence de `useMock`, `MOCK_ALERTS`, `MOCK_SUGGESTION_IA` dans le fichier.

---

## TACHE 14 — Connecter `/parametres` a l'API

### Probleme
La page `/parametres/page.tsx` n'effectue aucun appel API. Les preferences de l'utilisateur ne sont pas sauvegardees — si l'utilisateur recharge la page, tout est perdu.

### Ce que tu dois faire

**Etape 14.1 — Identifier ce que la page expose**

Ouvre `apps/web/src/app/(app)/parametres/page.tsx`.
Liste toutes les sections et champs de la page (ex: nom, email, mot de passe, langue, notifications, preferences...).

**Etape 14.2 — Trouver les endpoints disponibles dans le backend**

Cherche dans `apps/api/src/routes/` un fichier `auth.routes.ts` ou `user.routes.ts` ou `settings.routes.ts`.

Identifie les routes disponibles pour la gestion du profil. Probable :
- `GET /auth/me` ou `GET /users/me` — recuperer le profil actuel
- `PUT /auth/profile` ou `PATCH /users/me` — mettre a jour le profil
- `POST /auth/change-password` ou similaire — changer le mot de passe

Si aucune route de mise a jour n'existe, note-le et utilise l'option de sauvegarde locale ci-dessous.

**Etape 14.3 — Charger les donnees existantes au montage**

Au chargement de la page, pre-remplis les champs avec les donnees de l'utilisateur connecte :

```typescript
const { user } = useAuth()

// Option A : si useAuth() retourne deja toutes les infos du profil
const [form, setForm] = useState({
  name: user?.name ?? '',
  email: user?.email ?? '',
  // autres champs...
})

// Option B : si les infos completes necessitent un appel supplementaire
useEffect(() => {
  api.get('/auth/me').then(data => {
    setForm({
      name: data.name ?? '',
      email: data.email ?? '',
      // ...
    })
  })
}, [])
```

**Etape 14.4 — Connecter le bouton "Sauvegarder"**

Si un endpoint de mise a jour existe :

```typescript
const handleSave = async () => {
  setSaveLoading(true)
  try {
    await api.put('/auth/profile', {
      name: form.name,
      // autres champs modifiables...
    })
    toast.success('Profil mis a jour.')
  } catch (err) {
    toast.error('Erreur lors de la sauvegarde.')
  } finally {
    setSaveLoading(false)
  }
}
```

Si aucun endpoint n'existe : sauvegarde dans `localStorage` et ajoute un TODO :
```typescript
localStorage.setItem('flowstock_user_prefs', JSON.stringify(form))
toast.success('Preferences sauvegardees localement.')
// TODO Sprint 4 : migrer vers PUT /users/me quand l'endpoint sera disponible
```

**Etape 14.5 — Connecter le changement de mot de passe**

Si un champ "nouveau mot de passe" existe dans la page et qu'un endpoint correspondant existe dans le backend :

```typescript
const handlePasswordChange = async () => {
  if (newPassword !== confirmPassword) {
    toast.error('Les mots de passe ne correspondent pas.')
    return
  }
  if (newPassword.length < 8) {
    toast.error('Le mot de passe doit contenir au moins 8 caracteres.')
    return
  }
  try {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    toast.success('Mot de passe mis a jour.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  } catch (err) {
    toast.error('Mot de passe actuel incorrect.')
  }
}
```

**Etape 14.6 — Ajouter les etats loading**

- Pendant le chargement initial des donnees : afficher un skeleton sur les champs
- Pendant la sauvegarde : desactiver le bouton et afficher un spinner dessus
- Apres la sauvegarde : le toast sonner gere le feedback (voir Tache 13)

**Critere de succes Tache 14** : Modifier le nom dans les parametres et cliquer "Sauvegarder" persiste le changement (via API ou localStorage). Recharger la page reaffiche la valeur sauvegardee. Le bouton affiche un etat loading pendant l'appel.

---

## TACHE 16 — Connecter `/suggestions` a une logique reelle

### Probleme
La page `/suggestions/page.tsx` est entierement mockee. Elle n'est jamais connectee a aucune logique reelle, alors que c'est une surface IA centrale du produit.

### Ce que tu dois faire

**Etape 16.1 — Identifier ce qui existe dans le backend**

Cherche dans `apps/api/src/routes/` un fichier `suggestions.routes.ts` ou similaire.
Si un endpoint `/suggestions` existe, identifie :
- La route GET et ses parametres
- La structure de la reponse (champs retournes)
- Les filtres disponibles (categorie, priorite, date...)

**Etape 16.2 — Cas A : un endpoint `/suggestions` existe**

Connecte la page directement :

```typescript
const [suggestions, setSuggestions] = useState<Suggestion[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  api.get('/suggestions')
    .then(data => setSuggestions(data.suggestions ?? data))
    .catch(() => setError('Impossible de charger les suggestions.'))
    .finally(() => setLoading(false))
}, [])
```

**Etape 16.3 — Cas B : aucun endpoint `/suggestions` n'existe encore**

Construis un endpoint minimal cote frontend base sur les donnees de stock deja disponibles.
L'algorithme est simple : identifier les produits dont le stock est sous le seuil d'alerte.

Cree un hook `apps/web/src/hooks/useSuggestions.ts` :

```typescript
import { useEffect, useState } from 'react'

interface Suggestion {
  id: string
  type: 'restock' | 'overstock' | 'expiry'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  productId?: string
  productName?: string
  currentQty?: number
  threshold?: number
  unit?: string
}

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Recupere les produits avec stock bas depuis l'API produits existante
    // L'endpoint /products ou /stocks est deja connecte (cf Sprint 1)
    api.get('/products?lowStock=true')
      .then(data => {
        const products = data.products ?? data ?? []
        // Transforme les produits a stock bas en suggestions
        const restockSuggestions: Suggestion[] = products
          .filter((p: any) => p.quantity <= p.threshold)
          .map((p: any) => ({
            id: `restock-${p.id}`,
            type: 'restock',
            priority: p.quantity === 0 ? 'high' : p.quantity < p.threshold * 0.5 ? 'high' : 'medium',
            title: `Reapprovisionner ${p.name}`,
            description: `Stock actuel : ${p.quantity} ${p.unit}. Seuil d'alerte : ${p.threshold} ${p.unit}.`,
            productId: p.id,
            productName: p.name,
            currentQty: p.quantity,
            threshold: p.threshold,
            unit: p.unit,
          }))
        setSuggestions(restockSuggestions)
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
  }, [])

  return { suggestions, loading }
}
```

**Etape 16.4 — Mettre a jour `suggestions/page.tsx`**

Remplace les donnees mockees par le hook :

```typescript
// Supprime les MOCK_SUGGESTIONS, MOCK_ITEMS, etc.
// Remplace par :
const { suggestions, loading } = useSuggestions()
```

Adapte le JSX pour :
- Afficher un skeleton pendant `loading`
- Afficher un etat vide si `suggestions.length === 0` : "Tout est sous controle ! Aucune suggestion pour le moment."
- Afficher les suggestions reelles sinon

Preserve le design et la mise en page existants — change uniquement la source des donnees.

**Etape 16.5 — Ajouter un filtre par priorite si la page en a un**

Si la page expose des filtres (ex: boutons "Haute priorite", "Moyenne", "Faible"), connecte-les au filtre local :

```typescript
const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

const filteredSuggestions = priorityFilter === 'all'
  ? suggestions
  : suggestions.filter(s => s.priority === priorityFilter)
```

**Critere de succes Tache 16** : La page `/suggestions` affiche des donnees issues de l'API (produits a stock bas, ou suggestions retournees par le backend). Aucune occurrence de `MOCK_SUGGESTIONS` ou de noms de plats hardcodes. L'etat vide et le loading sont geres.

---

## TACHE 15 — Corriger l'onboarding pour persister les donnees detectees

### Probleme
L'onboarding est la premiere experience de l'utilisateur avec FlowStock. Or :
- Etape 1 : l'analyse de la carte retourne `MOCK_PLATS` hardcodes, jamais envoyes a l'API
- Etape 2 : redirige vers `/import-stocks` mais les ingredients detectes ne sont pas pre-remplis
- Etape 3 : le statut POS est local au composant, non persiste
- Etape 4 : le recapitulatif est affiche mais aucune donnee n'est sauvegardee — l'utilisateur repart avec un compte vide

C'est la tache la plus complexe du sprint. Procede etape par etape.

### Ce que tu dois faire

**Etape 15.1 — Lire entierement `onboarding/page.tsx`**

Ouvre et lis le fichier en entier. Identifie :
- Le nombre d'etapes (steps) et leur structure
- Les variables d'etat pour chaque etape
- Les fonctions de transition entre etapes
- Les appels API existants (s'il y en a)
- Les constantes `MOCK_*`

**Etape 15.2 — Creer un etat global d'onboarding**

L'onboarding doit accumuler les donnees entre les etapes. Cree un objet d'etat unique :

```typescript
interface OnboardingState {
  step: number
  restaurantName: string
  // Etape 1 : ingredients detectes depuis la carte
  detectedIngredients: DetectedIngredient[]
  menuAnalysisCompleted: boolean
  // Etape 2 : import des stocks
  stocksImported: boolean
  // Etape 3 : statut POS
  posConnected: boolean
  posType: string | null
  // Etape 4 : confirmation finale
  completed: boolean
}

interface DetectedIngredient {
  name: string
  estimatedQty?: number
  unit?: string
  category?: string
}

const [onboardingState, setOnboardingState] = useState<OnboardingState>({
  step: 1,
  restaurantName: '',
  detectedIngredients: [],
  menuAnalysisCompleted: false,
  stocksImported: false,
  posConnected: false,
  posType: null,
  completed: false,
})
```

**Etape 15.3 — Corriger l'etape 1 : analyse de la carte**

Cherche dans l'etape 1 la logique d'analyse de la carte (upload de fichier PDF/image ou saisie manuelle).

Cherche si un endpoint d'analyse de carte existe dans le backend :
- `apps/api/src/routes/` — cherche `menu`, `analysis`, `ocr`, `scan`

**Si un endpoint existe** (`POST /menu/analyze` ou similaire) :
```typescript
const handleMenuAnalysis = async (file: File) => {
  setAnalysisLoading(true)
  try {
    const formData = new FormData()
    formData.append('menu', file)
    const result = await api.post('/menu/analyze', formData)
    // Stocke les ingredients detectes dans l'etat global
    setOnboardingState(prev => ({
      ...prev,
      detectedIngredients: result.ingredients ?? [],
      menuAnalysisCompleted: true,
    }))
    toast.success(`${result.ingredients?.length ?? 0} ingredients detectes.`)
  } catch {
    toast.error("L'analyse de la carte a echoue. Vous pouvez continuer manuellement.")
  } finally {
    setAnalysisLoading(false)
  }
}
```

**Si aucun endpoint n'existe** : supprime `MOCK_PLATS` et laisse un tableau vide avec un TODO :
```typescript
// Remplace MOCK_PLATS par :
const detectedIngredients: DetectedIngredient[] = []
// TODO : connecter a POST /menu/analyze quand disponible

// Met quand meme a jour l'etat pour que l'etape 2 sache qu'on a fait l'etape 1
setOnboardingState(prev => ({ ...prev, menuAnalysisCompleted: true }))
```

**Etape 15.4 — Corriger l'etape 2 : pre-remplir l'import des stocks**

Actuellement, la page redirige vers `/import-stocks` avec `router.push('/import-stocks')`.
Les ingredients detectes sont perdus.

**Option A (recommandee) — Passer les donnees via query params**

```typescript
// Au lieu de router.push('/import-stocks')
const ingredientsParam = encodeURIComponent(JSON.stringify(onboardingState.detectedIngredients))
router.push(`/import-stocks?prefill=${ingredientsParam}&from=onboarding`)
```

Dans `apps/web/src/app/(app)/import-stocks/page.tsx`, lis ce param :
```typescript
const searchParams = useSearchParams()
const prefillParam = searchParams.get('prefill')
const fromOnboarding = searchParams.get('from') === 'onboarding'

useEffect(() => {
  if (prefillParam && fromOnboarding) {
    try {
      const ingredients = JSON.parse(decodeURIComponent(prefillParam))
      // Pre-remplis le formulaire d'import avec ces ingredients
      // (adapte selon la structure du formulaire d'import existant)
      setPrefillData(ingredients)
    } catch { /* ignore */ }
  }
}, [prefillParam, fromOnboarding])
```

**Option B (si la redirection est trop complexe) — Integrer l'import dans l'onboarding**

Si l'etape 2 est censee rester dans l'onboarding (sans redirection), affiche directement dans le wizard un resume des ingredients detectes avec des champs editables pour les quantites initiales.

**Etape 15.5 — Corriger l'etape 3 : persister le statut POS**

Remplace le statut POS local par une mise a jour de l'etat global :
```typescript
// Quand l'utilisateur selectionne un POS :
setOnboardingState(prev => ({
  ...prev,
  posConnected: true,
  posType: selectedPosType, // 'lightspeed', 'zelty', 'l_addition', 'manual'...
}))
```

Si un endpoint `/pos-mapping` existe dans le backend (`apps/api/src/routes/`) :
```typescript
// Appelle l'API pour sauvegarder la config POS
await api.post('/pos-mapping', { posType: selectedPosType })
```

**Etape 15.6 — Corriger l'etape 4 : sauvegarder les donnees en base**

C'est l'etape la plus critique. A la fin de l'onboarding, quand l'utilisateur clique "Terminer" :

```typescript
const handleCompleteOnboarding = async () => {
  setCompletingLoading(true)
  try {
    // 1. Marquer l'onboarding comme complete dans le backend
    // Cherche un endpoint PUT /auth/profile ou PATCH /users/me avec onboardingCompleted: true
    await api.patch('/users/me', { onboardingCompleted: true })

    // 2. Sauvegarder les ingredients detectes comme stock initial si non deja fait
    if (onboardingState.detectedIngredients.length > 0 && !onboardingState.stocksImported) {
      await api.post('/products/batch', {
        products: onboardingState.detectedIngredients.map(ing => ({
          name: ing.name,
          quantity: ing.estimatedQty ?? 0,
          unit: ing.unit ?? 'kg',
          category: ing.category ?? 'Ingredients',
        }))
      })
    }

    // 3. Marquer localement comme complete (cf Tache 9)
    localStorage.setItem('flowstock_onboarding_completed', 'true')

    toast.success('Configuration terminee ! Bienvenue sur FlowStock.')
    router.push('/dashboard')
  } catch (err) {
    toast.error('Erreur lors de la finalisation. Veuillez reessayer.')
    console.error(err)
  } finally {
    setCompletingLoading(false)
  }
}
```

Si certains endpoints n'existent pas encore, commente les appels manquants avec des TODO et assure-toi d'au moins appeler `localStorage.setItem('flowstock_onboarding_completed', 'true')` et rediriger vers `/dashboard`.

**Etape 15.7 — Ajouter la persistance entre rechargements**

Si l'utilisateur recharge la page pendant l'onboarding, il repart du debut. Pour eviter ca, sauvegarde l'etat en `sessionStorage` :

```typescript
// A chaque changement d'etape :
useEffect(() => {
  sessionStorage.setItem('flowstock_onboarding_progress', JSON.stringify(onboardingState))
}, [onboardingState])

// Au montage, restaure si disponible :
useEffect(() => {
  const saved = sessionStorage.getItem('flowstock_onboarding_progress')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (!parsed.completed) {
        setOnboardingState(parsed)
      }
    } catch { /* ignore */ }
  }
}, [])
```

**Critere de succes Tache 15** :
- Un utilisateur qui fait l'onboarding complet repart avec un compte non vide
- L'etape 2 (import stocks) est pre-remplie avec les ingredients de l'etape 1
- Le statut POS est persiste (en base si possible, sinon en localStorage)
- A la fin, `onboardingCompleted` est marque (en base ou localStorage)
- L'onboarding disparait de la sidebar (grace a la Tache 9)

---

## Verifications finales Sprint 3

1. **Build** : `pnpm build` dans `apps/web/`. Zero erreur TypeScript. Zero `any` non justifie introduit.

2. **Toasts** : Fais une action CRUD dans stocks, suppliers, locations. Des toasts apparaissent en haut a droite avec le style Warm Tech.

3. **Hook CRUD** : `grep -rn "deleteConfirmId.*useState\|submitLoading.*useState" apps/web/src/app/` ne retourne rien.

4. **Dashboard propre** : `grep -n "useMock\|MOCK_" apps/web/src/app/\(app\)/dashboard/page.tsx` ne retourne rien.

5. **Parametres** : Modifie un champ dans les parametres, sauvegarde, recharge la page. La valeur est conservee.

6. **Suggestions** : La page `/suggestions` n'affiche plus de noms de plats hardcodes. Si l'API retourne des produits a stock bas, ils apparaissent. Sinon, un etat vide propre est affiche.

7. **Onboarding** : Va sur `/onboarding`, complete toutes les etapes. A la fin, `/dashboard` s'affiche. L'entree "Configuration initiale" disparait de la sidebar. Verifie dans les DevTools Network qu'un appel API a ete fait pour persister l'etat.

---

## Notes importantes pour Cursor

- La Tache 15 (onboarding) est la plus risquee — certains endpoints backend n'existent peut-etre pas encore. Dans ce cas, utilise `localStorage`/`sessionStorage` comme fallback et pose des TODO clairs. L'important est que l'utilisateur ne repart plus avec un compte completement vide.
- La Tache 13 (sonner) est un prerequis pour les Taches 12, 14, 16 — les handlers de ces taches utilisent `toast`. Fais-la en premier.
- Ne change pas le design ou la logique metier des pages — seulement la source des donnees et les feedbacks utilisateur.
- Si un endpoint backend n'existe pas pour une fonctionnalite, note-le avec un TODO et utilise un fallback local plutot que de bloquer.
- Commits apres chaque tache :
  - `feat: add sonner toast system with warm tech styling`
  - `refactor: extract crud modal pattern into useCrudModal hook`
  - `fix: remove mock fallback from dashboard`
  - `feat: connect parametres page to API`
  - `feat: connect suggestions page to real stock data`
  - `feat: fix onboarding data persistence and prefill flow`
