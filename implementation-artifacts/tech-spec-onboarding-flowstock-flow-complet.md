---
title: 'Onboarding FlowStock — Flow complet guidé 6 étapes'
slug: 'onboarding-flowstock-flow-complet'
created: '2026-03-13'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Next.js 14 App Router'
  - 'TypeScript (strict, no any)'
  - 'Tailwind CSS (tokens existants)'
  - 'Express.js 4 (API Gateway port 3000)'
  - 'PostgreSQL 15 (JSONB)'
  - 'OpenAI GPT-4o vision (eu.api.openai.com)'
files_to_modify:
  - 'apps/api/migrations/V032__add_onboarding_to_tenants.sql'
  - 'apps/api/src/routes/onboarding.routes.ts'
  - 'apps/api/src/index.ts'
  - 'apps/web/next.config.js'
  - 'apps/web/src/app/(app)/layout.tsx'
  - 'apps/web/src/types/onboarding.ts'
  - 'apps/web/src/app/(app)/onboarding/layout.tsx'
  - 'apps/web/src/app/(app)/onboarding/page.tsx'
  - 'apps/web/src/app/(app)/onboarding/menu/actions.ts'
  - 'apps/web/src/app/(app)/onboarding/profil/page.tsx'
  - 'apps/web/src/app/(app)/onboarding/menu/page.tsx'
  - 'apps/web/src/app/(app)/onboarding/emplacements/page.tsx'
  - 'apps/web/src/app/(app)/onboarding/stocks/page.tsx'
  - 'apps/web/src/app/(app)/onboarding/fournisseurs/page.tsx'
  - 'apps/web/src/app/(app)/onboarding/pos/page.tsx'
  - 'apps/web/src/app/(app)/onboarding/done/page.tsx'
  - 'apps/web/src/components/onboarding/StepProgress.tsx'
  - 'apps/web/src/components/onboarding/MenuCard.tsx'
  - 'apps/web/src/components/onboarding/EmplacementChip.tsx'
  - 'apps/web/src/components/onboarding/PosCard.tsx'
code_patterns:
  - "'use server' en tête des Server Actions (OpenAI uniquement)"
  - 'useApi().fetchApi() pour toutes les mutations REST (CSRF + JWT auto)'
  - "Machine d'état locale : type Step = 'IDLE' | 'X' | 'Y'"
  - 'Types partagés @bmad/shared : ExtractedDish, MenuExtractionResult, RecipeCreateInput, LocationCreateInput'
  - 'Tailwind tokens : bg-green-bright, bg-red-alert, bg-orange-warn, bg-cream, green-deep, text-charcoal'
  - 'db.query() (sans contexte tenant) pour UPDATE tenants — jamais db.queryWithTenant()'
test_patterns:
  - 'Tests manuels viewport 375px (Chrome DevTools device mode)'
  - 'Network tab : OPENAI_API_KEY absent du bundle client'
  - 'Test reprise : fermer onglet étape 3, rouvrir → reprend étape 3'
---

# Tech-Spec: Onboarding FlowStock — Flow complet guidé 6 étapes

**Created:** 2026-03-13 | **Status:** Ready for Development

---

## Overview

### Problem Statement

L'onboarding actuel de FlowStock est une simulation sans persistance ni données réelles. Un gérant qui s'inscrit arrive sur un dashboard vide — sans stocks, sans fiches techniques, sans fournisseurs — ce qui crée une expérience de première utilisation décevante et un taux d'abandon élevé. Le gérant ne comprend pas la valeur du produit avant d'avoir investi 30+ minutes de saisie manuelle.

### Solution

Remplacer la simulation par un **flow guidé en 6 étapes** (~15 min sur mobile) qui aboutit à un dashboard opérationnel dès la fin de la session. L'IA (GPT-4o vision) extrait automatiquement les fiches techniques depuis une photo du menu. Le pipeline CSV existant (`/import-stocks`) est réutilisé tel quel pour l'import de stocks. La progression est persistée dans `tenants.settings` (JSONB) via une nouvelle route Express, permettant la reprise à tout moment.

### Scope

**In Scope (MVP) :**
- Migration V032 : colonnes `onboarding_completed` + `type_cuisine` dans `tenants`
- Route Express `GET|PATCH /onboarding/progress` + `POST /onboarding/complete`
- Bypass AppShell dans `(app)/layout.tsx` pour les routes `/onboarding/*`
- `next.config.js` : augmenter `bodySizeLimit` pour Server Actions (images 15 Mo)
- Layout commun : barre de progression 6 pastilles, chrome Warm Tech, mobile-first 375px
- **Étape 1** — Profil restaurant : formulaire multi-champs complet, persisté en JSONB
- **Étape 2** — Photo menu : upload JPG/PNG, extraction GPT-4o vision, édition cards, sauvegarde `recipes`
- **Étape 3** — Emplacements : suggestions par type cuisine, chips éditables, sauvegarde `locations`
- **Étape 4** — Stocks : mode CSV (réutilise `/import-stocks` avec `?fromOnboarding=1`) ou saisie guidée par ingrédient
- **Étape 5** — Fournisseurs : squelette UI (formulaire visible + overlay "bientôt")
- **Étape 6** — POS : squelette UI (cartes POS → lien `/parametres`)
- Écran `done` : résumé + alerte stocks bas + CTA dashboard + `onboarding_completed = true`

**Out of Scope :**
- Upload PDF (étape 2)
- Flow OAuth POS (étape 6) — liens vers `/parametres` existants
- Table `onboarding_progress` dédiée
- Tests automatisés extraction IA

---

## Context for Development

### Codebase Patterns

- **Server Actions** : `'use server'` en en-tête, `OPENAI_API_KEY` jamais côté client. Uniquement pour OpenAI — pas d'accès DB depuis Server Action.
- **OpenAI endpoint EU** : `https://eu.api.openai.com/v1/chat/completions` — ⚠️ `import-stocks/actions.ts` utilise `api.openai.com` (sans `eu.`). Déclarer `EU_OPENAI_URL` comme constante **locale** dans `menu/actions.ts`, ne jamais importer depuis `import-stocks`.
- **`useApi()` hook** (`apps/web/src/hooks/useApi.ts`) : gère JWT + CSRF auto pour POST/PATCH/DELETE. `const { fetchApi } = useApi()` pour toutes les mutations.
- **`useAuth()` hook** : expose `user`, `token`, `isLoading`. JWT dans `sessionStorage`.
- **DB helper `tenants`** : la table `tenants` est au-dessus de la couche RLS. Pour toute requête `SELECT/UPDATE tenants`, utiliser **`db.query()`** (pas `db.queryWithTenant()`). Toujours valider `req.user.tenantId` comme UUID avant injection.
- **AppShell bypass** : `(app)/layout.tsx` → `usePathname()` + condition `pathname.startsWith('/onboarding')`. La vérification `onboarding_completed` ne doit s'exécuter **que si** `!pathname.startsWith('/onboarding')` pour éviter la boucle infinie.
- **Types GPT-4o dans `@bmad/shared`** : `ExtractedDish`, `ExtractedIngredient`, `MenuExtractionResult` — réutiliser, ne pas redéfinir.
- **`POST /products/import`** : multipart FormData `{ file: File, mapping: JSON string }`.
- **`import-stocks/page.tsx`** : supporte déjà `?fromOnboarding=1` — réutiliser via redirect.
- **`POST /recipes`** : `RecipeCreateInput` avec `source: 'scan_ia'`. Appels multiples via `Promise.allSettled` (jamais `Promise.all`) pour gestion erreur partielle.
- **`POST /locations`** : peut retourner 409 si le nom existe déjà pour ce tenant → ignorer le 409 (skip silencieux) et continuer.
- **Pagination `GET /recipes`** : la route est limitée à 20 résultats par défaut. Toujours appeler avec `?limit=100` pour éviter les ingrédients incomplets.
- **Design tokens** : `bg-cream` (fond), `text-charcoal`, `green-deep` (spinner), `bg-green-bright/15 text-green-bright` (succès), `bg-red-alert/15 text-red-alert` (erreur), `bg-orange-warn/15 text-orange-warn` (warning).
- **Migrations** : format Flyway `V{N}__description.sql`. Prochaine = V032.

### Files to Reference

| Fichier | Usage |
| ------- | ----- |
| `apps/web/src/app/(app)/stocks/page.tsx` | Design tokens Warm Tech, patterns hooks |
| `apps/web/src/app/(app)/import-stocks/page.tsx` | Machine d'état CSV + `POST /products/import` + `?fromOnboarding` |
| `apps/web/src/app/(app)/import-stocks/actions.ts` | Pattern `callOpenAI()` — endpoint **ne pas copier** |
| `apps/web/src/components/ui/FileUploadZone.tsx` | Props : `readAs`, `accept`, `maxSizeMb`, `onFileSelected(file, content)` |
| `apps/web/src/components/ui/AlertBanner.tsx` | Alertes stocks bas sur écran done |
| `apps/web/src/app/(app)/layout.tsx` | À modifier : bypass AppShell + redirect onboarding |
| `apps/api/src/index.ts` | À modifier : enregistrer `onboardingRoutes` |
| `apps/api/migrations/V001__create_tenants.sql` | Schema `tenants` (settings JSONB existant) |
| `apps/api/migrations/V023__create_recipes.sql` | Schema `recipes` + `recipe_ingredients` |
| `packages/shared/src/types/index.ts` | `ExtractedDish`, `MenuExtractionResult`, `RecipeCreateInput`, `LocationCreateInput`, `ProductCreateInput` |
| `apps/web/src/contexts/AuthContext.tsx` | `useAuth()` |
| `apps/web/src/hooks/useApi.ts` | `useApi()` |
| `apps/web/next.config.js` | À modifier : `experimental.serverActions.bodySizeLimit` |

### Technical Decisions

1. **Persistance** : `tenants.settings` JSONB via clé `onboarding`. Pas de nouvelle table. `PATCH` via Express `jsonb_set`.
2. **`onboarding_completed`** : colonne booléenne `tenants` (V032). Mise à `true` via `POST /onboarding/complete` depuis l'écran done.
3. **Route Express `onboarding.routes.ts`** : 3 endpoints (`GET`, `PATCH`, `POST`), tous protégés par `authenticateToken`. Utiliser `db.query()` — pas `db.queryWithTenant()` — pour les opérations sur `tenants`. Valider `req.user.tenantId` comme UUID dans chaque handler. Valider `req.body.onboarding` comme objet plain non-null dans le `PATCH`.
4. **Bypass AppShell** : dans `(app)/layout.tsx` — conditionner le bypass ET la vérification `onboarding_completed` sur `!pathname.startsWith('/onboarding')` pour éviter la boucle infinie.
5. **Guard double-call `/onboarding/complete`** : l'écran done doit d'abord lire `onboarding_completed` depuis la progression (`GET /onboarding/progress`). Si déjà `true`, ne pas appeler `POST /onboarding/complete`. Le `useRef` est un filet supplémentaire, pas le seul mécanisme.
6. **GPT-4o dataUrl parsing** : `mimeType = dataUrl.split(';')[0].slice(5)` et `base64 = dataUrl.split(',')[1]`.
7. **`bodySizeLimit` Next.js** : ajouter dans `next.config.js` : `experimental: { serverActions: { bodySizeLimit: '20mb' } }`.
8. **SKU génération mode guidé** : pour les produits créés depuis les ingrédients de recettes, générer le SKU automatiquement : `sku = ingredient_name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 6)`. Garantit l'unicité sans conflit.
9. **Catégories IA** : le system prompt doit contraindre les valeurs de `categorie` à `Entrées|Plats|Desserts|Boissons` et la langue de retour au français.
10. **`jours_fermeture`** : typer avec `('lun'|'mar'|'mer'|'jeu'|'ven'|'sam'|'dim')[]` dans `onboarding.ts` et les boutons UI doivent utiliser ces codes courts.
11. **Index SQL** : supprimer l'index partiel `WHERE onboarding_completed = false` — inutile pour les requêtes filtrées par PK. Le retirer de T1.
12. **Mode CSV étape 4** : rediriger vers `/import-stocks?fromOnboarding=1` (pas dupliquer le pipeline). Enregistrer `stocks_mode: 'csv'` dans la progression avant la redirection.

---

## Implementation Plan

### Tasks

> **Ordre de dépendance strict** : infrastructure → API → types → config → composants → pages

---

- [ ] **T1 — Migration V032**
  - **Fichier :** `apps/api/migrations/V032__add_onboarding_to_tenants.sql` *(créer)*
  - **Action :**
    ```sql
    -- Migration V032 : onboarding support
    ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS type_cuisine VARCHAR(100);

    COMMENT ON COLUMN tenants.onboarding_completed
      IS 'true once all mandatory onboarding steps are completed';
    COMMENT ON COLUMN tenants.type_cuisine
      IS 'Denormalized from settings.onboarding.profil.type_cuisine for server-side use';
    ```
  - **Note :** Pas d'index sur `onboarding_completed` — les requêtes sont toutes filtrées par PK UUID (`WHERE id = tenantId`), un index partiel serait inutile.

---

- [ ] **T2 — Route Express onboarding**
  - **Fichier :** `apps/api/src/routes/onboarding.routes.ts` *(créer)*
  - **Action :** Créer 3 endpoints. ⚠️ Utiliser `db.query()` (pas `db.queryWithTenant()`) — la table `tenants` est au-dessus de la couche RLS.

    ```typescript
    import { Router, Request, Response } from 'express';
    import { body, validationResult } from 'express-validator';
    import { authenticateToken } from '../middleware/auth';
    import { getDatabase } from '../database/connection';

    const router = Router();

    // GET /onboarding/progress
    router.get('/progress', authenticateToken, async (req: Request, res: Response) => {
      if (!req.user?.tenantId) { res.status(401).json({ success: false }); return; }
      const db = getDatabase();
      const result = await db.query<{ onboarding_data: unknown; onboarding_completed: boolean }>(
        `SELECT settings->'onboarding' AS onboarding_data, onboarding_completed
         FROM tenants WHERE id = $1`,
        [req.user.tenantId]
      );
      const row = result.rows[0];
      res.json({ success: true, data: row ?? { onboarding_data: null, onboarding_completed: false } });
    });

    // PATCH /onboarding/progress
    router.patch(
      '/progress',
      authenticateToken,
      [body('onboarding').notEmpty().isObject()], // F9 fix: validation body
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) { res.status(400).json({ success: false, error: 'Corps invalide' }); return; }
        if (!req.user?.tenantId) { res.status(401).json({ success: false }); return; }
        const db = getDatabase();
        await db.query(
          `UPDATE tenants
           SET settings = jsonb_set(COALESCE(settings, '{}'), '{onboarding}', $1::jsonb),
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(req.body.onboarding), req.user.tenantId]
        );
        res.json({ success: true });
      }
    );

    // POST /onboarding/complete
    router.post(
      '/complete',
      authenticateToken,
      [body('type_cuisine').optional().isString().trim()],
      async (req: Request, res: Response) => {
        if (!req.user?.tenantId) { res.status(401).json({ success: false }); return; }
        const db = getDatabase();
        await db.query(
          `UPDATE tenants
           SET onboarding_completed = true,
               type_cuisine = COALESCE($1, type_cuisine),
               updated_at = NOW()
           WHERE id = $2`,
          [req.body.type_cuisine ?? null, req.user.tenantId]
        );
        res.json({ success: true });
      }
    );

    export default router;
    ```

  - **Fichier :** `apps/api/src/index.ts` *(modifier)*
  - **Action :** Ajouter après les autres imports de routes :
    ```typescript
    import onboardingRoutes from './routes/onboarding.routes';
    // Dans la section app.use() des routes :
    app.use('/onboarding', onboardingRoutes);
    ```

---

- [ ] **T3 — Types TypeScript onboarding**
  - **Fichier :** `apps/web/src/types/onboarding.ts` *(créer)*
  - **Action :**
    ```typescript
    import type { ExtractedDish } from '@bmad/shared';

    export type OnboardingStep =
      | 'profil' | 'menu' | 'emplacements'
      | 'stocks' | 'fournisseurs' | 'pos' | 'done';

    export type CuisineType =
      | 'Française' | 'Italienne' | 'Japonaise'
      | 'Méditerranéenne' | 'Pizzeria' | 'Brasserie' | 'Autre';

    export type EmplacementType = 'froid' | 'sec' | 'cave' | 'cuisine' | 'autre';

    // F11 fix : type littéral, pas string[]
    export type JourSemaine = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim';

    export interface ProfilRestaurant {
      nom: string;
      type_cuisine: CuisineType;
      nb_couverts: number;       // 10–300
      service_midi: boolean;
      service_soir: boolean;
      jours_fermeture: JourSemaine[];
    }

    /** ExtractedDish + id local React key */
    export interface MenuPlatLocal extends ExtractedDish {
      id: string; // crypto.randomUUID() côté client
    }

    export interface Emplacement {
      id: string;
      nom: string;
      type: EmplacementType;
      temperature?: string;
    }

    export interface OnboardingProgressData {
      current_step: OnboardingStep;
      completed_steps: OnboardingStep[];
      profil?: ProfilRestaurant;
      menu_extracted?: boolean;
      menu_skipped?: boolean;
      emplacements_count?: number;
      stocks_mode?: 'csv' | 'guided';
      stocks_count?: number;
    }

    export interface OnboardingApiResponse {
      onboarding_data: OnboardingProgressData | null;
      onboarding_completed: boolean;
    }
    ```

---

- [ ] **T4 — `next.config.js` : bodySizeLimit Server Actions**
  - **Fichier :** `apps/web/next.config.js` *(modifier)*
  - **Action :** Ajouter dans la config existante :
    ```javascript
    experimental: {
      serverActions: {
        bodySizeLimit: '20mb', // F6 fix : images JPG/PNG jusqu'à 15 Mo → ~20 Mo base64
      },
    },
    ```
  - **Note :** Sans cette config, les images > 4 Mo en base64 échouent silencieusement côté Server Action.

---

- [ ] **T5 — Bypass AppShell + redirect onboarding**
  - **Fichier :** `apps/web/src/app/(app)/layout.tsx` *(modifier)*
  - **Action :** Remplacer le contenu par :
    ```tsx
    'use client';
    import { useEffect, useRef } from 'react';
    import { useRouter, usePathname } from 'next/navigation';
    import { useAuth } from '@/contexts/AuthContext';
    import { useApi } from '@/hooks/useApi';
    import { AppShell } from '@/components/layout/AppShell';

    export default function AppLayout({ children }: { children: React.ReactNode }) {
      const { user, isLoading } = useAuth();
      const { fetchApi } = useApi();
      const router = useRouter();
      const pathname = usePathname();
      const checkedRef = useRef(false);

      // Redirect to login if not authenticated
      useEffect(() => {
        if (!isLoading && !user) {
          router.push(pathname ? `/login?returnUrl=${encodeURIComponent(pathname)}` : '/login');
        }
      }, [user, isLoading, router, pathname]);

      // F4 fix : vérifier onboarding UNIQUEMENT hors des routes /onboarding
      useEffect(() => {
        if (isLoading || !user || pathname.startsWith('/onboarding') || checkedRef.current) return;
        checkedRef.current = true;
        fetchApi('/onboarding/progress')
          .then((r) => r.json())
          .then((data: { success: boolean; data?: { onboarding_completed: boolean } }) => {
            if (data?.data?.onboarding_completed === false) {
              router.push('/onboarding');
            }
          })
          .catch(() => { /* silencieux : ne pas bloquer l'app si la route est indisponible */ });
      }, [user, isLoading, pathname, fetchApi, router]);

      const isOnboarding = pathname.startsWith('/onboarding');

      if (isLoading) {
        return (
          <div className="min-h-screen bg-cream flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-deep border-t-transparent" />
          </div>
        );
      }
      if (!user) return null;

      // F4 fix : bypass AppShell pour les pages onboarding
      if (isOnboarding) return <>{children}</>;
      return <AppShell>{children}</AppShell>;
    }
    ```

---

- [ ] **T6 — Server Action extraction menu IA**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/menu/actions.ts` *(créer)*
  - **Action :**
    ```typescript
    'use server';
    import type { MenuExtractionResult } from '@bmad/shared';

    // F6 fix : URL EU locale — NE PAS importer depuis import-stocks/actions.ts
    const EU_OPENAI_URL = 'https://eu.api.openai.com/v1/chat/completions';

    export async function extractMenuWithAI(
      imageBase64: string,   // partie après la virgule dans la dataUrl
      mimeType: string,      // ex: 'image/jpeg' ou 'image/png'
      typeCuisine: string
    ): Promise<MenuExtractionResult> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey?.trim()) return { plats: [] };

      // F12 fix : system prompt contraint la langue ET les valeurs de categorie
      const systemPrompt = `Tu es un expert en restauration et gestion de stocks.
Analyse ce menu de restaurant et pour chaque plat identifié, propose une fiche technique
réaliste avec les ingrédients et quantités typiques pour une portion.
Tiens compte du type de cuisine : ${typeCuisine}.
RÈGLES IMPÉRATIVES :
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
- Utilise EXCLUSIVEMENT le français pour tous les noms et valeurs.
- La valeur de "categorie" doit être EXACTEMENT l'une de ces valeurs : Entrées, Plats, Desserts, Boissons.
- La valeur de "unite" doit être EXACTEMENT l'une de : kg, g, litre, cl, pièce.
- La valeur de "confiance" doit être EXACTEMENT : high, medium ou low.`;

      try {
        const res = await fetch(EU_OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                  },
                  {
                    type: 'text',
                    text: `Retourne un JSON avec cette structure exacte :
{ "plats": [{ "nom": "string", "categorie": "Entrées|Plats|Desserts|Boissons",
"ingredients": [{ "nom": "string", "quantite": number, "unite": "kg|g|litre|cl|pièce" }],
"confiance": "high|medium|low" }] }`,
                  },
                ],
              },
            ],
          }),
        });
        if (!res.ok) return { plats: [] };
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(content) as MenuExtractionResult;
        return parsed?.plats ? parsed : { plats: [] };
      } catch {
        return { plats: [] };
      }
    }
    ```

---

- [ ] **T7 — Composant StepProgress**
  - **Fichier :** `apps/web/src/components/onboarding/StepProgress.tsx` *(créer)*
  - **Action :**
    - Props : `steps: { id: OnboardingStep; label: string }[]`, `current: OnboardingStep`, `completed: OnboardingStep[]`
    - 6 pastilles numérotées (ou checkmark si complétée) reliées par une ligne `h-px`
    - Pastille complétée : `bg-green-bright text-white` + icône checkmark SVG inline
    - Pastille active : `bg-[#1C2B2A] text-white ring-2 ring-offset-2 ring-[#1C2B2A]`
    - Pastille future : `bg-charcoal/10 text-charcoal/40`
    - Ligne entre pastilles : `flex-1 h-px` — `bg-green-bright` si segment complété, sinon `bg-charcoal/15`
    - Label : `hidden sm:block text-xs text-center mt-1` (caché sur mobile)

---

- [ ] **T8 — Layout onboarding commun**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/layout.tsx` *(créer)*
  - **Action :**
    - `'use client'` + `usePathname()` pour déduire l'étape active depuis le pathname
    - Header fixe `bg-[#1C2B2A] text-white px-4 py-3 flex items-center justify-between` :
      - Logo "FlowStock" texte stylisé à gauche
      - "Configuration de votre restaurant" centré, `text-sm opacity-75`
    - `<StepProgress>` en-dessous du header (pas dans le header)
    - Zone contenu : `min-h-screen bg-cream` avec `pt-[hauteur-header]`
    - **Pas de footer de navigation global** — chaque page gère ses boutons Précédent/Continuer pour pouvoir valider avant de naviguer

---

- [ ] **T9 — Page `/onboarding` (redirect)**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/page.tsx` *(créer)*
  - **Action :**
    - `'use client'`, `useApi()`, `useRouter()`
    - Au montage : `GET /onboarding/progress`
    - **F10 fix** : en cas d'erreur réseau ou 500 → redirect `/onboarding/profil` (fallback)
    - Si `onboarding_data` null → redirect `/onboarding/profil`
    - Sinon redirect vers la première étape absent de `completed_steps`
    - Ordre : `['profil','menu','emplacements','stocks','fournisseurs','pos']`
    - Pendant le chargement : spinner centré `bg-cream`

---

- [ ] **T10 — Étape 1 : Profil (`/onboarding/profil`)**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/profil/page.tsx` *(créer)*
  - **Action :**
    - `'use client'`, state `ProfilRestaurant` initialisé avec defaults (`nb_couverts: 50`, `service_midi: true`, `service_soir: true`)
    - Au montage : `GET /onboarding/progress` → pré-remplir si `onboarding_data.profil` existe
    - **Section "Restaurant"** : `<input>` nom (required, placeholder "Le Bistrot de Paul"), `<select>` type_cuisine (7 options de `CuisineType`)
    - **Section "Services"** : slider `nb_couverts` (10–300, step 10, affiche la valeur), 2 toggles `service_midi` / `service_soir`
    - **Section "Fermeture"** : 7 boutons toggle multiselect — codes courts `JourSemaine` (`lun`–`dim`), labels affichés "Lun"–"Dim"
    - Validation inline : border rouge si `nom` vide + message "Nom du restaurant requis" ; erreur si `!service_midi && !service_soir`
    - Footer : bouton "Continuer →" (`bg-[#1C2B2A] text-white`, disabled si invalide) → `PATCH /onboarding/progress` avec `{ onboarding: { ...prev, profil: formData, completed_steps: [...prev.completed_steps, 'profil'], current_step: 'menu' } }` → `router.push('/onboarding/menu')`
    - Pas de bouton Précédent (première étape)

---

- [ ] **T11 — Composant MenuCard**
  - **Fichier :** `apps/web/src/components/onboarding/MenuCard.tsx` *(créer)*
  - **Action :**
    - Props : `plat: MenuPlatLocal`, `onUpdate: (p: MenuPlatLocal) => void`, `onDelete: () => void`
    - Card `bg-white rounded-xl border border-charcoal/10 p-4 shadow-sm`
    - Header : `<input>` nom du plat (édition inline) + badge catégorie + badge confiance (`bg-green-bright/15` / `bg-orange-warn/15` / `bg-red-alert/15`)
    - Liste ingrédients : `ingredient_name` (text input) + `quantite` (number input, min 0.001) + `unite` (text input) + bouton × supprimer
    - Bouton "+ Ingrédient" en bas de la liste (ajoute `{ nom: '', quantite: 0, unite: 'pièce' }`)
    - Bouton "Supprimer ce plat" (icon Trash2, `text-red-alert`) en bas de la card

---

- [ ] **T12 — Étape 2 : Menu (`/onboarding/menu`)**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/menu/page.tsx` *(créer)*
  - **Action :**
    - State machine : `type MenuStep = 'IDLE' | 'EXTRACTING' | 'REVIEW' | 'SAVING'`
    - State `plats: MenuPlatLocal[]`
    - **IDLE** : `<FileUploadZone readAs="dataUrl" accept={['.jpg','.jpeg','.png']} maxSizeMb={15} />` + lien "Passer et saisir manuellement"
    - **Sur `onFileSelected(_, dataUrl)`** :
      1. `const mimeType = dataUrl.split(';')[0].slice(5)` — ex: `'image/jpeg'`
      2. `const base64 = dataUrl.split(',')[1]`
      3. Récupérer `typeCuisine` depuis état local (chargé au montage depuis `GET /onboarding/progress`)
      4. Passer à `'EXTRACTING'` → `const result = await extractMenuWithAI(base64, mimeType, typeCuisine)`
      5. Mapper : `setPlats(result.plats.map(p => ({ ...p, id: crypto.randomUUID() })))`
      6. Passer à `'REVIEW'`
    - **EXTRACTING** : 3 `<Skeleton className="h-48 rounded-xl" />`
    - **REVIEW** : `grid grid-cols-1 sm:grid-cols-2 gap-4` de `<MenuCard>` + bouton "+ Ajouter un plat" + bouton "Valider et continuer"
    - **"Passer cette étape"** : `PATCH /onboarding/progress` `{ menu_skipped: true, completed_steps: [..., 'menu'] }` → redirect `/onboarding/emplacements`
    - **F5 fix — "Valider et continuer"** : passer à `'SAVING'` puis :
      ```typescript
      const results = await Promise.allSettled(
        plats.map(plat =>
          fetchApi('/recipes', {
            method: 'POST',
            body: JSON.stringify({
              name: plat.nom,
              category: plat.categorie,
              source: 'scan_ia',
              confidence: plat.confiance,
              ingredients: plat.ingredients.map((ing, i) => ({
                ingredient_name: ing.nom,
                quantity: ing.quantite,
                unit: ing.unite,
                sort_order: i,
              })),
            }),
          })
        )
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) toast.warning(`${plats.length - failed}/${plats.length} plats sauvegardés.`);
      ```
      Puis `PATCH /onboarding/progress` `{ menu_extracted: true, completed_steps: [..., 'menu'] }` → redirect emplacements (même si certains ont échoué)
    - Footer : bouton "← Précédent" → `/onboarding/profil`

---

- [ ] **T13 — Composant EmplacementChip**
  - **Fichier :** `apps/web/src/components/onboarding/EmplacementChip.tsx` *(créer)*
  - **Action :**
    - Props : `emp: Emplacement`, `onUpdate: (e: Emplacement) => void`, `onDelete: () => void`
    - Chip `bg-white border border-charcoal/15 rounded-lg px-3 py-2 flex items-center gap-2`
    - Icône SVG inline 16×16 selon `type` :
      - `froid` : flocon (chemin SVG simplifié)
      - `sec` : boîte
      - `cave` : verre
      - `cuisine` : flamme
      - `autre` : tag
    - Nom éditable inline (clic → input text remplace le span)
    - Bouton × à droite pour supprimer

---

- [ ] **T14 — Étape 3 : Emplacements (`/onboarding/emplacements`)**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/emplacements/page.tsx` *(créer)*
  - **Action :**
    - Au montage : charger `type_cuisine` depuis `GET /onboarding/progress`
    - Suggestions par `CuisineType` :
      ```typescript
      const SUGGESTIONS: Record<CuisineType, Pick<Emplacement, 'nom' | 'type'>[]> = {
        'Française':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cave', type: 'cave' }, { nom: 'Cuisine', type: 'cuisine' }],
        'Brasserie':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Cave/Bar', type: 'cave' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
        'Italienne':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cave', type: 'cave' }, { nom: 'Cuisine', type: 'cuisine' }],
        'Pizzeria':        [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
        'Japonaise':       [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
        'Méditerranéenne': [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cave', type: 'cave' }, { nom: 'Cuisine', type: 'cuisine' }],
        'Autre':           [{ nom: 'Chambre froide', type: 'froid' }, { nom: 'Réserve sèche', type: 'sec' }, { nom: 'Cuisine', type: 'cuisine' }],
      };
      ```
    - State `emplacements: Emplacement[]` initialisé avec les suggestions (chacune avec `crypto.randomUUID()`)
    - Liste de `<EmplacementChip>` + bouton "+ Ajouter un emplacement"
    - Message d'erreur inline si `emplacements.length === 0` au clic "Continuer"
    - **F8 fix — Sur "Continuer"** :
      ```typescript
      const results = await Promise.allSettled(
        emplacements.map(e =>
          fetchApi('/locations', {
            method: 'POST',
            body: JSON.stringify({ name: e.nom, location_type: e.type }),
          })
        )
      );
      // Ignorer les 409 (conflit nom déjà existant) — pas d'erreur bloquante
      const hardErrors = results.filter(r =>
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok && r.value.status !== 409)
      );
      if (hardErrors.length > 0) { setError('Erreur lors de la sauvegarde. Réessayez.'); return; }
      ```
      Puis `PATCH /onboarding/progress` → redirect `/onboarding/stocks`
    - Footer : "← Précédent" → `/onboarding/menu`

---

- [ ] **T15 — Étape 4 : Stocks (`/onboarding/stocks`)**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/stocks/page.tsx` *(créer)*
  - **Action :**
    - State `mode: 'SELECT' | 'CSV' | 'GUIDED'`
    - **SELECT** : deux cards cliquables (voir T12 design)
    - **Mode CSV** : `PATCH /onboarding/progress` `{ stocks_mode: 'csv' }` → `router.push('/import-stocks?fromOnboarding=1')`. Le flow `/import-stocks` gère le reste.
    - **Mode GUIDED** :
      1. **F7 fix** : `GET /recipes?limit=100` pour récupérer toutes les recettes
      2. Extraire ingrédients uniques (dédupliqués sur `ingredient_name.toLowerCase()`)
      3. Si aucun → `<EmptyState title="Aucune recette" description="..." />` + lien mode CSV
      4. Grouper par catégorie de recette
      5. Charger `GET /locations` pour le select emplacement
      6. Pour chaque ingrédient : label, input `number` (min 0, step 0.1, défaut 0), unité pré-remplie, `<select>` emplacement
      7. Progress bar `{renseignés}/{total}` (renseigné = quantité > 0)
      8. **F2 fix — Sur "Valider"** : pour chaque ingrédient, générer le SKU :
         ```typescript
         const sku = ingredient_name.toLowerCase()
           .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // diacritics
           .replace(/[^a-z0-9]/g, '-')
           .replace(/-+/g, '-').slice(0, 25)
           + '-' + Math.random().toString(36).slice(2, 6);
         ```
         Puis `POST /products` avec `{ sku, name: ingredient_name, unit, quantity, location_id }`
      9. `PATCH /onboarding/progress` `{ stocks_mode: 'guided', stocks_count: total }` → redirect `/onboarding/fournisseurs`
    - Footer : "← Précédent" → `/onboarding/emplacements`

---

- [ ] **T16 — Composant PosCard**
  - **Fichier :** `apps/web/src/components/onboarding/PosCard.tsx` *(créer)*
  - **Action :**
    - Props : `name: string`, `description: string`, `href: string`
    - Card `bg-white border border-charcoal/10 rounded-xl p-5 flex flex-col items-center gap-3 text-center`
    - Nom `font-semibold text-charcoal`, description `text-sm text-charcoal/60`
    - `<a href={href} className="text-sm text-green-deep underline">Configurer dans les paramètres</a>`

---

- [ ] **T17 — Étape 5 : Fournisseurs — squelette**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/fournisseurs/page.tsx` *(créer)*
  - **Action :**
    - Wrapper `relative overflow-hidden`
    - Formulaire désactivé (`pointer-events-none opacity-40`) : nom, téléphone, email, slider délai livraison (1–14j), checkboxes jours livraison
    - Overlay absolu `bg-cream/80 backdrop-blur-sm inset-0 z-10 flex flex-col items-center justify-center gap-3` :
      - Badge `bg-[#D4A843]/20 text-[#D4A843] text-xs font-semibold px-2 py-1 rounded` "Bientôt disponible"
      - Texte "La gestion complète des fournisseurs arrive prochainement."
    - Footer : "Continuer →" (actif) → `PATCH /onboarding/progress` `{ completed_steps: [..., 'fournisseurs'] }` → redirect `/onboarding/pos` ; "← Précédent" → `/onboarding/stocks`

---

- [ ] **T18 — Étape 6 : POS — squelette**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/pos/page.tsx` *(créer)*
  - **Action :**
    - Titre "Connexion à votre logiciel de caisse" + sous-titre explicatif
    - Grille `grid grid-cols-2 gap-4` de `<PosCard>` :
      - `{ name: 'Lightspeed', description: 'Caisse connectée', href: '/parametres' }`
      - `{ name: "L'Addition", description: 'Logiciel de caisse', href: '/parametres' }`
      - `{ name: 'Square', description: 'POS mobile', href: '/parametres' }`
      - `{ name: 'Autre / Manuel', description: 'Configuration manuelle', href: '/parametres' }`
    - Footer : "Continuer →" → `PATCH /onboarding/progress` `{ completed_steps: [..., 'pos'] }` → redirect `/onboarding/done` ; "← Précédent" → `/onboarding/fournisseurs` ; lien texte "Passer cette étape" `text-sm text-charcoal/50 underline`

---

- [ ] **T19 — Écran done (`/onboarding/done`)**
  - **Fichier :** `apps/web/src/app/(app)/onboarding/done/page.tsx` *(créer)*
  - **Action :**
    - `'use client'`, `useApi()`, `useRouter()`
    - State `summary: { plats: number; produits: number; alertes: number }`
    - **F3 fix — Guard double-call** :
      ```typescript
      const completedRef = useRef(false);
      useEffect(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        // 1. Vérifier si déjà complété (protection contre refresh)
        fetchApi('/onboarding/progress')
          .then(r => r.json())
          .then((data: { success: boolean; data?: OnboardingApiResponse }) => {
            if (!data?.data?.onboarding_completed) {
              // Pas encore complété → appeler complete
              const typeCuisine = data?.data?.onboarding_data?.profil?.type_cuisine;
              fetchApi('/onboarding/complete', {
                method: 'POST',
                body: JSON.stringify({ type_cuisine: typeCuisine }),
              });
            }
          });
        // 2. Charger résumé en parallèle
        Promise.all([
          fetchApi('/recipes?limit=100').then(r => r.json()),
          fetchApi('/products?limit=1&fields=count').then(r => r.json()),
        ]).then(([recipesRes, productsRes]) => {
          const platCount = recipesRes?.pagination?.total ?? 0;
          const prodCount = productsRes?.pagination?.total ?? 0;
          // stocks bas : filtrer sur stock_status !== 'ok' via GET /products?status=low
          fetchApi('/products?status=low').then(r => r.json()).then(lowRes => {
            setSummary({ plats: platCount, produits: prodCount, alertes: lowRes?.pagination?.total ?? 0 });
          });
        });
      }, []); // eslint-disable-line react-hooks/exhaustive-deps
      ```
    - Afficher résumé avec icônes checkmark SVG
    - Si `summary.alertes > 0` : `<AlertBanner type="warning">X produits sous le seuil minimum — à commander dès aujourd'hui</AlertBanner>`
    - Animation CSS `@keyframes fadeSlideIn` (opacity 0→1 + translateY 16px→0)
    - CTA "Voir mon dashboard →" `bg-[#1C2B2A] text-white rounded-xl px-6 py-3 font-semibold` → `router.push('/dashboard')`

---

### Acceptance Criteria

- [ ] **AC1 — Persistance progression**
  - *Given* un gérant complète l'étape 1 (profil) et ferme l'onglet
  - *When* il retourne sur `/onboarding`
  - *Then* il est redirigé vers `/onboarding/menu` et les champs de l'étape 1 sont pré-remplis

- [ ] **AC2 — Extraction IA menu**
  - *Given* un gérant uploade une image JPG d'un menu de restaurant
  - *When* l'extraction GPT-4o se termine
  - *Then* au moins 1 plat est affiché avec nom, catégorie valide (Entrées/Plats/Desserts/Boissons), liste d'ingrédients éditables et badge confiance

- [ ] **AC3 — Skeleton loader extraction**
  - *Given* un gérant vient de soumettre une image pour extraction
  - *When* la Server Action est en cours (état EXTRACTING)
  - *Then* 3 skeleton cards s'affichent pendant l'attente — aucun écran blanc

- [ ] **AC4 — Skip menu → stocks guidé vide**
  - *Given* un gérant clique "Passer cette étape" sur `/onboarding/menu`
  - *When* il arrive sur `/onboarding/stocks` et choisit le mode guidé
  - *Then* `<EmptyState>` s'affiche avec un lien vers le mode CSV

- [ ] **AC5 — Navigation Précédent sans perte**
  - *Given* un gérant a configuré 3 emplacements à l'étape 3 et navigue vers l'étape 2
  - *When* il revient sur l'étape 3 via "Continuer"
  - *Then* ses 3 emplacements sont toujours présents (rechargés depuis `GET /onboarding/progress`)

- [ ] **AC6 — Validation minimum emplacement**
  - *Given* un gérant supprime tous les emplacements à l'étape 3
  - *When* il clique "Continuer"
  - *Then* le message "Au moins un emplacement est requis" s'affiche inline — la navigation est bloquée

- [ ] **AC7 — Mode CSV → redirect `/import-stocks`**
  - *Given* un gérant choisit "Uploader un fichier CSV" à l'étape stocks
  - *When* il clique sur la card
  - *Then* il est redirigé vers `/import-stocks?fromOnboarding=1` et voit le lien "← Retour à l'onboarding"

- [ ] **AC8 — Complétion onboarding**
  - *Given* un gérant arrive sur `/onboarding/done` pour la première fois
  - *When* la page se charge
  - *Then* `tenants.onboarding_completed = true` est mis à jour en base ET un refresh ultérieur de la page ne rappelle pas `POST /onboarding/complete`

- [ ] **AC9 — Clé OpenAI jamais exposée**
  - *Given* le build compilé de l'application
  - *When* on inspecte les chunks JS dans `/_next/static/`
  - *Then* la chaîne `OPENAI_API_KEY` et tout token `sk-` sont absents

- [ ] **AC10 — Mobile 375px**
  - *Given* un viewport 375×667px (iPhone SE)
  - *When* on navigue sur chaque étape (1 à done)
  - *Then* aucun scroll horizontal, tous les boutons ont une zone de tap ≥ 44×44px, le texte est lisible

- [ ] **AC11 — AppShell absent sur onboarding**
  - *Given* un gérant authentifié visite `/onboarding/profil`
  - *When* la page se charge
  - *Then* la sidebar et le header AppShell sont absents — seul le layout onboarding (header Warm Tech + StepProgress) est visible

- [ ] **AC12 — Erreur partielle POST /recipes**
  - *Given* un gérant valide 5 plats à l'étape 2 et que 1 appel `POST /recipes` échoue
  - *When* la sauvegarde se termine
  - *Then* un toast `warning` s'affiche ("4/5 plats sauvegardés") et la navigation continue

- [ ] **AC13 — Pas de boucle de redirection**
  - *Given* un gérant non-onboardé (`onboarding_completed = false`) visite `/onboarding/profil`
  - *When* le layout `(app)/layout.tsx` se charge
  - *Then* aucune redirection infinie ne se produit — la page s'affiche normalement

---

## Additional Context

### Dependencies

**Existants (aucune installation requise) :**
- `OPENAI_API_KEY` dans `.env`
- `lucide-react` (icônes) — déjà dans `apps/web/package.json`
- Composants UI : `FileUploadZone`, `AlertBanner`, `Badge`, `Skeleton`, `EmptyState`
- Routes API : `POST /recipes`, `POST /locations`, `POST /products`, `POST /products/import`
- `transformCsvWithAI` dans `apps/web/src/app/(app)/import-stocks/actions.ts`

**Contrats API confirmés :**
- `POST /recipes` : `RecipeCreateInput` — `{ name, category?, source:'scan_ia', confidence?, ingredients:[{ingredient_name, quantity, unit, sort_order?}] }`
- `POST /locations` : `LocationCreateInput` — `{ name, location_type? }` — peut retourner **409** si nom déjà existant → ignorer
- `POST /products` : `ProductCreateInput` — `{ sku (obligatoire), name, unit?, quantity?, location_id? }` — générer le SKU automatiquement (voir T15)
- `GET /recipes` : **toujours appeler avec `?limit=100`** — la limite par défaut est 20
- `POST /products/import` : multipart `FormData { file: File, mapping: JSON string }`

**Nouvelles routes (T2) :**
- `GET /onboarding/progress` → `{ success: true, data: { onboarding_data, onboarding_completed } }`
- `PATCH /onboarding/progress` → body `{ onboarding: object }` (validé non-null)
- `POST /onboarding/complete` → body `{ type_cuisine?: string }`

### Testing Strategy

**Manuel (obligatoire avant merge) :**
1. Viewport 375×667px (Chrome DevTools > iPhone SE) sur chaque étape
2. Compléter étape 1, fermer l'onglet, rouvrir `/onboarding` → doit reprendre étape 2 avec données pré-remplies
3. Uploader une photo de menu → extraction + édition + sauvegarde
4. Tester "Passer cette étape" sur menu → stocks mode guidé doit afficher `<EmptyState>`
5. Network tab pendant extraction : confirmer que la requête OpenAI est une Server Action (pas une requête client directe)
6. Naviguer `/done` → retour arrière → `/done` → vérifier que `POST /onboarding/complete` n'est appelé qu'une seule fois
7. Vérifier que `/dashboard` ne redirige plus vers `/onboarding` après completion

### Notes

- ⚠️ `import-stocks/actions.ts` utilise `OPENAI_URL = 'https://api.openai.com/v1/...'` (sans `eu.`). Ne jamais importer cette constante — déclarer `EU_OPENAI_URL` localement dans `menu/actions.ts`.
- La page `/import-stocks` supporte déjà `?fromOnboarding=1` (ligne 224). Aucune modification nécessaire.
- `apps/web/next.config.js` : vérifier si le fichier est `.js` ou `.ts` avant modification — adapter la syntaxe en conséquence.
- Les étapes 5 et 6 sont volontairement en squelette avec overlay "bientôt" — ne pas bloquer la navigation.
- `db.query()` (sans contexte tenant) pour toutes les opérations sur la table `tenants` dans `onboarding.routes.ts`. Ne jamais utiliser `db.queryWithTenant()` pour cette table.
