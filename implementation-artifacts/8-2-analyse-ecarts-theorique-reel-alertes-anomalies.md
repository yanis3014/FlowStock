# Story 8.2: Analyse écarts théorique/réel + alertes anomalies

Status: done

## Story

As a **gérant de restaurant**,
I want **voir les écarts entre stock théorique et stock réel et être alerté des anomalies**,
so that **je peux détecter les vols, gaspillages et erreurs de saisie pour protéger mon activité**.

## Acceptance Criteria

1. **Given** j'ai des stocks avec des mouvements (entrées, sorties POS, pertes déclarées)  
   **When** je consulte la page "Pertes & Écarts"  
   **Then** je vois un tableau avec : produit, stock théorique, stock réel, écart, écart %, analyse IA

2. **Given** un produit dépasse le seuil d'anomalie (défaut 10%)  
   **When** l'analyse est calculée  
   **Then** le produit est mis en évidence comme anomalie  
   **And** une analyse GPT-4o est disponible pour les patterns détectés

3. **Given** un produit dépasse le seuil 3 jours de suite  
   **When** l'analyse est calculée  
   **Then** une alerte in-app/dashboard est générée pour ce produit

4. **Given** je consulte la page Pertes & Écarts  
   **When** je clique "Exporter PDF"  
   **Then** un rapport PDF de conformité AGEC est téléchargé avec les données d'écarts

## Tasks / Subtasks

- [x] Task 1 — Backend service discrepancy  
  - [x] 1.1 Créer `apps/api/src/services/discrepancy.service.ts`  
    - Calcul : `stock_theorique = stock_initial_creation + entrées - sorties_POS - pertes_déclarées`  
    - Écart = `stock_theorique - quantity_actuelle`  
    - Détection anomalie si |écart %| > seuil (défaut 10%)  
    - Appel GPT-4o pour analyse patterns si anomalies présentes  
  - [x] 1.2 Ajouter détection alertes anomalies dans `apps/api/src/services/dashboard.service.ts`

- [x] Task 2 — Backend routes discrepancy  
  - [x] 2.1 Créer `apps/api/src/routes/discrepancy.routes.ts`  
    - `GET /discrepancies` : liste écarts par produit  
    - `GET /discrepancies/report` : rapport complet pour export  
  - [x] 2.2 Enregistrer `/discrepancies` dans `apps/api/src/index.ts`

- [x] Task 3 — Shared types  
  - [x] 3.1 Ajouter types `StockDiscrepancy`, `DiscrepancyReport` dans `packages/shared/src/types/index.ts`

- [x] Task 4 — Frontend page  
  - [x] 4.1 Créer `apps/web/src/app/(app)/pertes/page.tsx`  
    - Tableau écarts (produit, stock théorique, réel, écart, écart %, analyse IA)  
    - Badge anomalie pour les produits hors seuil  
    - Bouton "Exporter PDF" (génération côté client via jsPDF)  
    - Bouton "Analyser avec IA" pour déclencher l'appel GPT-4o

## Dev Agent Record

### Agent: BMAD Cloud Agent — 2026-03-13

- Créé discrepancy.service.ts avec calcul stock théorique et appel GPT-4o
- Créé discrepancy.routes.ts avec GET /discrepancies et GET /discrepancies/analyze
- Mis à jour dashboard.service.ts pour alertes loss_anomaly
- Enregistré route /discrepancies dans index.ts
- Ajouté types StockDiscrepancy dans shared
- Créé page /pertes avec tableau, badges anomalie, export PDF (jsPDF)

## File List

### Created
- `apps/api/src/services/discrepancy.service.ts`
- `apps/api/src/routes/discrepancy.routes.ts`
- `apps/web/src/app/(app)/pertes/page.tsx`

### Modified
- `packages/shared/src/types/index.ts`
- `apps/api/src/services/dashboard.service.ts`
- `apps/api/src/index.ts`

## Change Log

- 2026-03-13: Story créée et implémentée (BMAD Cloud Agent)
