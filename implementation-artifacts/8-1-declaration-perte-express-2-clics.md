# Story 8.1: Déclaration perte express 2 clics

Status: done

## Story

As a **gérant de restaurant**,
I want **déclarer une perte en 2 clics depuis la page stocks ou le dashboard**,
so that **je peux tracer rapidement les pertes (péremption, casse, vol, erreur) sans friction**.

## Acceptance Criteria

1. **Given** je suis sur la page Stocks ou le Dashboard  
   **When** je clique sur "Déclarer une perte"  
   **Then** un modal léger s'ouvre avec un formulaire minimal : produit (autocomplete SKU/nom), quantité, motif

2. **Given** le modal est ouvert  
   **When** je soumets le formulaire (produit valide, quantité > 0, motif sélectionné)  
   **Then** le stock est décrémenté immédiatement  
   **And** un mouvement de type `loss` est créé avec le motif et le timestamp

3. **Given** la perte est déclarée avec succès  
   **When** le modal se ferme  
   **Then** un toast de confirmation s'affiche  
   **And** la liste de stocks est rafraîchie

4. **Given** je suis sur mobile  
   **When** je navigue dans l'application  
   **Then** le bouton "Déclarer une perte" est accessible depuis la navbar

## Tasks / Subtasks

- [x] Task 1 — Migration DB : ajouter `loss` à l'enum movement_type  
  - [x] 1.1 Créer `apps/api/migrations/V020__add_loss_movement_type.sql`

- [x] Task 2 — Shared types  
  - [x] 2.1 Ajouter `'loss'` à `MovementType` dans `packages/shared/src/types/index.ts`  
  - [x] 2.2 Ajouter types `LossReason`, `LossDeclarationInput`, `LossDeclaration`

- [x] Task 3 — Backend service + route  
  - [x] 3.1 Créer `apps/api/src/services/loss.service.ts` : déclaration perte (décrémentation stock + logMovement)  
  - [x] 3.2 Créer `apps/api/src/routes/losses.routes.ts` : `POST /losses`  
  - [x] 3.3 Enregistrer `/losses` dans `apps/api/src/index.ts`

- [x] Task 4 — Frontend composant  
  - [x] 4.1 Créer `apps/web/src/components/stocks/LossDeclarationModal.tsx`  
  - [x] 4.2 Ajouter bouton "Déclarer une perte" dans `apps/web/src/app/(app)/stocks/page.tsx`  
  - [x] 4.3 Ajouter bouton "Déclarer une perte" dans `apps/web/src/app/(app)/dashboard/page.tsx`

- [x] Task 5 — Navigation  
  - [x] 5.1 Ajouter entrée "Pertes & Écarts" dans `apps/web/src/lib/nav-config.ts`

## Dev Agent Record

### Agent: BMAD Cloud Agent — 2026-03-13

- Créé migration V020__add_loss_movement_type.sql
- Étendu MovementType + ajouté LossReason/LossDeclarationInput dans shared types
- Créé loss.service.ts (décrémentation atomique + logMovement type loss)
- Créé losses.routes.ts (POST /losses avec validation express-validator)
- Enregistré route /losses dans index.ts
- Créé LossDeclarationModal.tsx (autocomplete produits, motifs, confirmation)
- Ajouté bouton terracotta "Déclarer une perte" dans stocks/page.tsx et dashboard/page.tsx
- Ajouté entrée navigation "Pertes & Écarts" dans nav-config.ts

## File List

### Created
- `apps/api/migrations/V020__add_loss_movement_type.sql`
- `apps/api/src/services/loss.service.ts`
- `apps/api/src/routes/losses.routes.ts`
- `apps/web/src/components/stocks/LossDeclarationModal.tsx`

### Modified
- `packages/shared/src/types/index.ts`
- `apps/api/src/index.ts`
- `apps/web/src/app/(app)/stocks/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/lib/nav-config.ts`

## Change Log

- 2026-03-13: Story créée et implémentée (BMAD Cloud Agent)
