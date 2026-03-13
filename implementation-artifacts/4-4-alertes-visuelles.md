# Story 4.4: Alertes Visuelles

**Status:** Done

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

- [x] Task 1 — Migration V020 : table alert_reads
  - [x] apps/api/migrations/V020__create_alert_reads.sql créé
  - [x] Colonnes : id, tenant_id, user_id, alert_id, read_at + UNIQUE constraint
  - [x] RLS activé sur alert_reads

- [x] Task 2 — Endpoint POST /dashboard/alerts/read
  - [x] Ajouté dans dashboard.routes.ts
  - [x] Fonction markAlertAsRead dans dashboard.service.ts (INSERT ON CONFLICT DO NOTHING)
  - [x] getDashboardSummary filtre les alertes lues + retourne unread_alert_count

- [x] Task 3 — Composant AlertBanner réutilisable
  - [x] apps/web/src/components/ui/AlertBanner.tsx créé
  - [x] Props : alerts[], onMarkRead?, showAll?, maxVisible?
  - [x] Couleurs : rouge/terracotta (high), or/gold (medium), grisé (low)
  - [x] Bouton "Marquer comme lu" par alerte + "Tout marquer" bulk

- [x] Task 4 — Badge compteur dans navigation
  - [x] Hook useAlertCount créé dans apps/web/src/hooks/useAlertCount.ts
  - [x] Badge rouge affiché sur icône Dashboard dans AppSidebar.tsx
  - [x] Affiche "9+" si > 9 alertes

- [x] Task 5 — Intégration dans dashboard
  - [x] AlertBanner utilisé dans dashboard/page.tsx
  - [x] Mise à jour optimiste locale après mark-as-read

## Dev Notes

- Les alertes sont dynamiquement générées (non persistées) avec des IDs stables (alert_${product.id}_type)
- La table alert_reads stocke uniquement les IDs lus (pattern soft-mark)
- Le badge est alimenté par le count d'alertes non lues du dashboard summary
- POS sync alert : déjà dans le dashboard, intégrer dans AlertBanner

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6 (Cursor Cloud)

### Completion Notes List

- Migration V020 : table alert_reads avec RLS multi-tenant, UNIQUE(tenant_id, user_id, alert_id) pour idempotence
- getDashboardSummary accepte maintenant userId optionnel pour filtrer les alertes lues
- AlertBanner : composant entièrement réutilisable avec gestion d'état locale (optimistic UI)
- Badge dans sidebar : hook useAlertCount poll le dashboard/summary toutes les 2 min
- Mark-as-read persisté en DB via INSERT ON CONFLICT DO NOTHING

### File List

| Fichier | Rôle |
|---------|------|
| `apps/api/migrations/V020__create_alert_reads.sql` | Table alert_reads avec RLS |
| `apps/api/src/services/dashboard.service.ts` | markAlertAsRead, getReadAlertIds, getDashboardSummary(userId) |
| `apps/api/src/routes/dashboard.routes.ts` | POST /dashboard/alerts/read |
| `apps/web/src/components/ui/AlertBanner.tsx` | Composant AlertBanner réutilisable |
| `apps/web/src/hooks/useAlertCount.ts` | Hook pour le badge nav |
| `apps/web/src/components/layout/AppSidebar.tsx` | Badge compteur sur icône Dashboard |

## Change Log

| Date       | Version | Description                     | Auteur   |
|------------|---------|---------------------------------|----------|
| 2026-03-13 | 0.1     | Création story 4.4 (create-story) | BMAD/CE  |
