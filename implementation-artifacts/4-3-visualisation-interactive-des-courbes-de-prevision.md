# Story 4.3: Visualisation Interactive des Courbes de Prévision

**Status:** Done

## Story

**As a** gérant de PME,
**I want** voir des courbes de prévision de consommation par produit,
**so that** je peux anticiper les ruptures de stock.

## Acceptance Criteria

1. **Given** utilisateur authentifié **When** j'accède aux prévisions **Then** les courbes de consommation s'affichent par produit (LineChart Recharts).
2. **And** un sélecteur de période (7j / 30j / 90j) est disponible.
3. **And** un skeleton loader s'affiche pendant le chargement.
4. **And** un tableau de détail par produit est affiché (stock actuel, jours restants, date rupture estimée, confiance).
5. **And** les données de prévision sont basées sur la moyenne mobile (ML réel en Epic 6).

## Tasks / Subtasks

- [x] Task 1 — Page `forecast/page.tsx` avec LineChart Recharts (implémentée dans story 9.5)
- [x] Task 2 — Sélecteur de période (7j / 30j / 90j / 365j)
- [x] Task 3 — Skeleton loader pendant chargement
- [x] Task 4 — Sélecteur de produits à comparer
- [x] Task 5 — Tableau de détail par produit avec niveaux de confiance
- [x] Task 6 — Indicateur "estimation basique" (précision améliorée en Epic 6)

## Dev Notes

- Implémenté dans le cadre de la story 9.5 (migration Next.js)
- Page : `apps/web/src/app/(app)/forecast/page.tsx`
- Librairie : Recharts (LineChart, ReferenceLine pour date courante)
- Backend : GET /stock-estimates (existant dans stock-estimate.routes.ts)

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (Cursor) — story 9.5

### Completion Notes List

- Page forecast/page.tsx créée avec LineChart Recharts
- Sélecteur de période, sélecteur de produits avec checkboxes
- Tableau détail avec confidence_level coloré
- Skeleton loader avec Skeleton component réutilisable
- ReferenceLine pour date courante sur le graphe

### File List

| Fichier | Rôle |
|---------|------|
| `apps/web/src/app/(app)/forecast/page.tsx` | Page prévisions complète |

## Change Log

| Date       | Version | Description                              | Auteur   |
|------------|---------|------------------------------------------|----------|
| 2026-03-13 | 0.1     | Création artifact story 4.3 (done via 9.5) | BMAD/CE  |
