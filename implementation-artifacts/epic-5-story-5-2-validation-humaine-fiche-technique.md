# Story 5.2 : Validation humaine + enregistrement fiche technique

Status: in-progress

## Story

As a **gérant de restaurant**,
I want **corriger les fiches techniques proposées par l'IA avant de les enregistrer**,
so that **mes fiches sont précises et liées à mes produits en stock**.

## Acceptance Criteria

1. **Given** les plats ont été extraits par l'IA
   **When** je consulte la liste de validation
   **Then** je peux modifier le nom, la quantité et l'unité de chaque ingrédient

2. **Given** je modifie un ingrédient
   **When** je tape le nom
   **Then** l'autocomplete propose les SKU du catalogue existant

3. **Given** je valide un plat
   **When** je clique "Valider cette fiche"
   **Then** la recette est enregistrée en base (table `recipes` + `recipe_ingredients`)

4. **Given** tous les plats sont affichés
   **When** je clique "Valider tout"
   **Then** tous les plats non-encore enregistrés sont sauvegardés en séquence

## Tasks / Subtasks

- [x] Task 1 — Migration base de données
  - [x] 1.1 Créer `V020__create_recipes.sql` (tables `recipes` + `recipe_ingredients` avec RLS)
- [x] Task 2 — Types partagés
  - [x] 2.1 Ajouter `Recipe`, `RecipeIngredient`, `RecipeCreateInput`, `RecipeUpdateInput` dans `@bmad/shared`
- [x] Task 3 — Service et routes API
  - [x] 3.1 Créer `apps/api/src/services/recipe.service.ts` (CRUD)
  - [x] 3.2 Créer `apps/api/src/routes/recipe.routes.ts` (GET/POST/PUT/DELETE /recipes)
  - [x] 3.3 Enregistrer les routes dans `apps/api/src/index.ts`
- [x] Task 4 — Interface de validation
  - [x] 4.1 UI éditable dans `menu-scan/page.tsx` : modifier nom, qté, unité par ingrédient
  - [x] 4.2 Autocomplete produit via `GET /products?search=...`
  - [x] 4.3 Bouton "Valider cette fiche" (par plat) et "Valider tout"
- [x] Task 5 — Page fiches-techniques réelle
  - [x] 5.1 Connecter `fiches-techniques/page.tsx` à `GET /recipes`
  - [x] 5.2 Connecter `fiches-techniques/[id]/page.tsx` à `GET /recipes/:id`

## Dev Notes

- RLS appliquée sur `recipes` et `recipe_ingredients` via `tenant_id`
- `product_id` est nullable (ingredient non encore matché avec un SKU)
- La suppression est soft (is_active = false)
- L'autocomplete appelle `GET /products?search=...&limit=5` existant

## File List

- `apps/api/migrations/V020__create_recipes.sql` [CREATED]
- `packages/shared/src/types/index.ts` [MODIFIED]
- `apps/api/src/services/recipe.service.ts` [CREATED]
- `apps/api/src/routes/recipe.routes.ts` [CREATED]
- `apps/api/src/index.ts` [MODIFIED]
- `apps/web/src/app/(app)/menu-scan/page.tsx` [MODIFIED]
- `apps/web/src/app/(app)/fiches-techniques/page.tsx` [MODIFIED]
- `apps/web/src/app/(app)/fiches-techniques/[id]/page.tsx` [MODIFIED]

## Dev Agent Record

- Agent: Claude Sonnet 4.6
- Date: 2026-03-13
- Status: review
