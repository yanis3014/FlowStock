# Story 4.2: Dashboard Principal avec Vue d'Ensemble

**Status:** in-progress

## Story

**As a** gérant de PME,
**I want** un dashboard avec tous les éléments clés visibles en un coup d'œil,
**so that** je peux comprendre l'état de mon restaurant sans navigation.

## Acceptance Criteria

1. **Given** utilisateur authentifié **When** j'accède au dashboard **Then** les 4 KPIs s'affichent (CA hier, valeur stock, alertes, transactions).
2. **And** un widget "5 derniers mouvements de stock" est présent avec lien vers la page mouvements.
3. **And** un widget "météo stock" affiche la consommation des 7 derniers jours (graphe barres simplifié).
4. **And** le `<ChatPanel />` (bouton flottant) est accessible depuis le dashboard.
5. **And** le widget alertes stock bas contient un lien vers la page stocks filtrée.
6. **And** l'interface est responsive mobile prioritaire.

## Tasks / Subtasks

- [x] Task 1 — 4 KPIs et alertes (déjà implémenté dans story 9.3)
- [x] Task 2 — Widget alertes stock bas avec lien vers /stocks
- [ ] Task 3 — Widget "5 derniers mouvements"
  - [ ] Ajouter endpoint GET /dashboard/recent-movements dans dashboard.routes.ts
  - [ ] Ajouter fonction getRecentMovements dans dashboard.service.ts
  - [ ] Afficher widget dans dashboard/page.tsx
- [ ] Task 4 — Widget "météo stock" (consommation 7j)
  - [ ] Appeler GET /sales/summary?group_by=day pour les 7 derniers jours
  - [ ] Afficher micro-graphe barres (Recharts) dans dashboard/page.tsx
- [ ] Task 5 — Bouton flottant ChatIA
  - [ ] Créer composant ChatFAB (Floating Action Button) pointant vers /chat
  - [ ] Intégrer dans dashboard/page.tsx

## Dev Notes

- Référence design : `apps/web/src/app/(app)/stocks/page.tsx` (Warm Tech palette)
- Recharts déjà dans le stack (utilisé dans stats et forecast pages)
- Le widget mouvements utilise l'endpoint GET /dashboard/recent-movements (nouveau)
- Le ChatFAB est un bouton fixe en bas à droite sur mobile

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6 (Cursor Cloud)

### Completion Notes List

*(À remplir lors de l'implémentation)*

### File List

*(À remplir lors de l'implémentation)*

## Change Log

| Date       | Version | Description                     | Auteur   |
|------------|---------|---------------------------------|----------|
| 2026-03-13 | 0.1     | Création story 4.2 (create-story) | BMAD/CE  |
