# Story 4.4: Alertes Visuelles

**Status:** in-progress

## Story

**As a** gérant de PME,
**I want** un système d'alertes visuelles in-app clair,
**so that** je suis immédiatement informé des situations critiques (ruptures, POS, etc.).

## Acceptance Criteria

1. **Given** utilisateur authentifié **When** des alertes sont actives **Then** un badge compteur s'affiche dans la navigation (sidebar et mobile nav).
2. **And** les alertes sont catégorisées : rouge (stock < min), orange (stock à 150% du seuil), grisée (produit dormant), système (POS).
3. **And** un composant `<AlertBanner />` réutilisable affiche les alertes avec couleurs et icônes appropriées.
4. **And** le gérant peut marquer une alerte comme lue (persisté en base).
5. **And** les alertes lues ne s'affichent plus dans le compteur.

## Tasks / Subtasks

- [ ] Task 1 — Migration V020 : table alert_reads
  - [ ] Créer apps/api/migrations/V020__create_alert_reads.sql
  - [ ] Colonnes : id, tenant_id, user_id, alert_id, read_at

- [ ] Task 2 — Endpoint POST /dashboard/alerts/read
  - [ ] Ajouter dans dashboard.routes.ts
  - [ ] Ajouter fonction markAlertAsRead dans dashboard.service.ts
  - [ ] Modifier getDashboardSummary pour filtrer les alertes lues

- [ ] Task 3 — Composant AlertBanner réutilisable
  - [ ] Créer apps/web/src/components/ui/AlertBanner.tsx
  - [ ] Props : alerts[], onMarkRead callback, showAll boolean
  - [ ] Couleurs : rouge (high), orange (medium), grisé (low)

- [ ] Task 4 — Badge compteur dans navigation
  - [ ] Créer hook useAlertCount dans apps/web/src/hooks/useAlertCount.ts
  - [ ] Afficher badge sur item "Dashboard" dans AppSidebar.tsx
  - [ ] Afficher badge dans MobileBottomNav si applicable

- [ ] Task 5 — Intégration dans dashboard
  - [ ] Utiliser composant AlertBanner dans dashboard/page.tsx
  - [ ] Connecter action "Marquer comme lue" au nouvel endpoint

## Dev Notes

- Les alertes sont dynamiquement générées (non persistées) avec des IDs stables (alert_${product.id}_type)
- La table alert_reads stocke uniquement les IDs lus (pattern soft-mark)
- Le badge est alimenté par le count d'alertes non lues du dashboard summary
- POS sync alert : déjà dans le dashboard, intégrer dans AlertBanner

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
| 2026-03-13 | 0.1     | Création story 4.4 (create-story) | BMAD/CE  |
