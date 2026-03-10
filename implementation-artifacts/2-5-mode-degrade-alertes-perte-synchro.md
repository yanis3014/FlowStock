# Story 2.5: Mode dégradé et alertes perte de synchro

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **restaurateur**,
I want **être alerté si la synchro POS est perdue et pouvoir basculer en saisie manuelle**,
so that **je ne perds pas la traçabilité en cas de panne**.

## Acceptance Criteria

1. **Given** un connecteur POS actif pour le tenant  
   **When** aucun événement n'est reçu pendant une durée configurée (ex. 15 min) ou les webhooks renvoient des erreurs  
   **Then** le système passe en mode dégradé (indicateur visible sur le Dashboard)  
   **And** l'utilisateur est notifié (alerte in-app ou optionnellement email)  
   **And** la saisie manuelle des ventes reste disponible (FR21) pour continuer à mettre à jour le stock  
   **And** lorsque les webhooks reprennent, le mode dégradé est levé et l'utilisateur est informé  
   **And** les métriques (dernier événement reçu, nombre d'échecs) sont exposées pour le support

## Tasks / Subtasks

- [x] Task 1: Détection perte de synchro (AC: durée configurée, erreurs webhooks)
  - [x] 1.1 Définir seuil configurable « silence » (ex. 15 min) : config par tenant ou env (ex. POS_DEGRADED_SILENCE_MINUTES).
  - [x] 1.2 Exposer une requête ou job qui, pour chaque tenant avec connecteur POS actif, compare « dernier événement reçu » (MAX(received_at) sur pos_events_received) à maintenant ; si dépassement → marquer mode dégradé.
  - [x] 1.3 Lors des erreurs 4xx/5xx ou rejets dans les routes webhook (webhooks.pos.routes), enregistrer un compteur ou timestamp d'échec par tenant (table ou colonne dédiée) ; seuil d'échecs consécutifs ou sur fenêtre glissante → mode dégradé.
- [x] Task 2: Persistance et état mode dégradé (AC: indicateur, levée quand webhooks reprennent)
  - [x] 2.1 Ajouter colonnes ou table pour état dégradé par tenant : ex. pos_sync_status (tenant_id, is_degraded, degraded_since, last_event_at, last_failure_at, failure_count) ou étendre tenant_pos_config (last_event_received_at, is_degraded_since, webhook_failure_count).
  - [x] 2.2 À chaque événement webhook traité avec succès (recordEventIdempotent + processPosSaleEvent OK), mettre à jour last_event_received_at et clear is_degraded si besoin.
  - [x] 2.3 Job ou middleware qui évalue périodiquement (ex. toutes les 1–2 min) le silence + échecs et met à jour is_degraded / degraded_since.
- [x] Task 3: Indicateur sur le Dashboard et notifications (AC: indicateur visible, notification in-app / email optionnel)
  - [x] 3.1 API : GET /api/pos-sync-status ou inclure pos_sync_status dans un endpoint existant (ex. dashboard ou tenant config) : retourner is_degraded, last_event_at, failure_count pour le tenant.
  - [x] 3.2 Frontend (apps/web) : afficher un bandeau ou badge « Synchro POS interrompue » sur le Dashboard (rush/dashboard) quand is_degraded=true, avec lien vers saisie manuelle des ventes (Story 3.6 quand dispo) ou message explicite.
  - [x] 3.3 Notification in-app : au passage en dégradé, créer une alerte ou notification (table notifications / toast) pour le tenant. Optionnel : envoi email si configuré.
  - [x] 3.4 À la levée du mode dégradé (premier événement reçu après dégradé), notifier l'utilisateur (in-app + optionnel email).
- [x] Task 4: Saisie manuelle et métriques support (AC: saisie manuelle dispo, métriques exposées)
  - [x] 4.1 S'assurer que la saisie manuelle des ventes (FR21 / Story 3.6) est accessible depuis l'UI (lien depuis le bandeau mode dégradé ou menu). Si Story 3.6 pas encore livrée, documenter le contrat (route / page) et afficher un message « Saisie manuelle bientôt disponible » ou placeholder.
  - [x] 4.2 Exposer les métriques pour le support : dernier événement reçu (timestamp), nombre d'échecs (sur 24 h ou configurable), statut dégradé. Endpoint dédié (ex. GET /api/pos-sync-status avec détails) ou section admin, protégé par auth tenant/admin.
- [x] Task 5: Tests et documentation (AC: comportement vérifiable)
  - [x] 5.1 Tests unitaires ou intégration : passage en dégradé après silence (mock pas d'événement depuis X min), levée après réception d'un webhook valide ; échecs répétés → dégradé.
  - [x] 5.2 OpenAPI / docs : documenter GET /api/pos-sync-status (ou équivalent), champs retournés (is_degraded, last_event_at, failure_count).
  - [x] 5.3 Mettre à jour AGENTS.md / docs si nouveaux endpoints ou variables d'environnement.

## Dev Notes

- **Contexte Epic 2** : Stories 2.1 (endpoint webhook, validation, idempotence), 2.2 (décrémentation, mouvements), 2.3 (Lightspeed), 2.4 (L'Addition, Square) sont livrées. Cette story ajoute la **détection de perte de synchro**, le **mode dégradé** (indicateur + notifications) et l’**exposition de métriques** pour le support, sans changer le flux webhook existant.
- **Réutilisation stricte** : `pos-webhook.service` (recordEventIdempotent, getConfigByTenantAndSecret, logWebhookError), table `pos_events_received` (received_at = timestamp de réception — utiliser pour « dernier événement reçu »). Ne pas dupliquer la logique de traitement des webhooks ; uniquement ajouter mise à jour last_event_at à l’insert dans pos_events_received ou table dédiée, et lecture pour calcul dégradé.
- **Architecture** : NFR21 (mode dégradé, offline-first, pas de perte de données) et FR23 (Connecteur Universel, alerte perte de synchro). Uptime Connecteur 99.9% — la détection rapide et l’indicateur permettent à l’utilisateur d’agir (saisie manuelle) sans perdre la traçabilité.
- **Saisie manuelle (FR21)** : Story 3.6 « Saisie Manuelle Ventes » fait partie de l’Epic 3. Pour 2.5, garantir que l’UI en mode dégradé pointe vers cette fonctionnalité (route ou page) dès qu’elle existe ; sinon afficher un message clair et documenter le contrat pour le frontend.
- **Seuils** : Durée de silence (ex. 15 min) et seuil d’échecs webhook configurables (env ou tenant_pos_config) pour éviter des faux positifs en environnement peu actif.

### Project Structure Notes

- **apps/api** : Nouveau ou étendu : service « pos-sync-status » (ou étendre pos-webhook.service) pour calcul is_degraded, last_event_at, failure_count ; lecture pos_events_received (MAX(received_at)), écriture à chaque webhook réussi. Option : migration pour table pos_sync_status ou colonnes tenant_pos_config (last_event_received_at, is_degraded_since, webhook_failure_count). Route GET /pos-sync-status ou /api/tenant/me/pos-sync-status (authentifiée). Job périodique (setInterval, node-cron, ou worker externe) pour recalcul dégradé.
- **apps/web** : Composant bandeau/alerte « Synchro POS interrompue » sur le layout Dashboard/Rush ; appel API pos-sync-status ; lien « Saisir des ventes manuellement » vers la page/route de saisie (3.6).
- **Réutilisation** : pos-webhook.service.ts (recordEventIdempotent, logWebhookError), pos_events_received.received_at, webhooks.pos.routes (après traitement réussi, appeler mise à jour last_event).

### References

- [Source: planning-artifacts/epics.md#Epic 2 Story 2.5] — Critères d'acceptation mode dégradé et alertes
- [Source: docs/architecture.md] — Connecteur Universel, NFR21, uptime 99.9%
- [Source: implementation-artifacts/2-2-decrementation-automatique-du-stock-evenement-vente.md] — processPosSaleEvent, recordEventIdempotent
- [Source: implementation-artifacts/2-4-adapteurs-pos-l-addition-square.md] — Routes webhook, pos_events_received, tenant_pos_config
- [Source: apps/api/src/services/pos-webhook.service.ts] — recordEventIdempotent, pos_events_received, logWebhookError
- [Source: apps/api/migrations/V014__create_pos_webhook_tables.sql] — pos_events_received.received_at, tenant_pos_config
- FR21 / Story 3.6 — Saisie manuelle ventes (à référencer depuis l’UI mode dégradé)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Migration V018 : colonnes last_event_received_at, is_degraded_since, webhook_failure_count, last_webhook_failure_at sur tenant_pos_config.
- Config : POS_DEGRADED_SILENCE_MINUTES (défaut 15), POS_DEGRADED_FAILURE_THRESHOLD (défaut 5).
- pos-sync-status.service : recordWebhookSuccess, recordWebhookFailure, getSyncStatus, evaluateDegradedForTenant, runPeriodicEvaluation.
- Routes webhook : enregistrement succès/échec après chaque traitement ; job périodique toutes les 2 min (hors test).
- GET /dashboard/pos-sync-status (auth) : retourne is_degraded, last_event_at, degraded_since, failure_count.
- Frontend dashboard : bandeau « Synchro POS interrompue » + lien /sales (saisie manuelle).
- OpenAPI : path /dashboard/pos-sync-status documenté. AGENTS.md : variables Story 2.5.
- Tests : dashboard.integration (GET pos-sync-status 401, 200 sans config, 200 avec is_degraded ; silence → dégradé, recovery après recordWebhookSuccess, failures ≥ threshold → dégradé).
- **Correctifs revue 2026-03-04** : (H1/H2) Notifications in-app au passage dégradé/rétabli (bandeaux toast sur dashboard). (H3) Trois tests d’intégration ajoutés (silence, recovery, failures). (M1) Détection silence avec created_at si last_event_received_at null. (M2) Bandeau : lien « Voir les ventes », texte « saisie manuelle prochainement (Story 3.6) ». (M3) Note File List hors périmètre 2.5.

### File List

*(Fichiers modifiés dans le même dépôt mais hors périmètre Story 2.5 : login, register, package.json, etc. — voir git status.)*

- apps/api/migrations/V018__add_pos_sync_status_columns.sql (créé)
- apps/api/src/config/index.ts (modifié — POS_DEGRADED_SILENCE_MINUTES, POS_DEGRADED_FAILURE_THRESHOLD)
- apps/api/src/services/pos-sync-status.service.ts (créé)
- apps/api/src/routes/webhooks.pos.routes.ts (modifié — recordWebhookSuccess, recordWebhookFailure)
- apps/api/src/routes/dashboard.routes.ts (modifié — GET /pos-sync-status)
- apps/api/src/index.ts (modifié — runPeriodicEvaluation toutes les 2 min)
- apps/api/src/openapi/spec.ts (modifié — path /dashboard/pos-sync-status, tag Dashboard)
- apps/web/src/app/(app)/dashboard/page.tsx (modifié — fetch pos-sync-status, bandeau mode dégradé, lien /sales)
- apps/api/src/__tests__/dashboard/dashboard.integration.test.ts (modifié — describe GET /dashboard/pos-sync-status)
- AGENTS.md (modifié — variables Story 2.5)

## Senior Developer Review (AI)

- **2026-03-04** — Code review (adversarial). Rapport : `implementation-artifacts/code-review-2-5-2026-03-04.md`. Correctifs option 1 appliqués (H1–H3, M1–M3). Status → done.

## Change Log

- **2026-03-04** — Correctifs revue (AI) : notifications in-app dégradé/rétabli, tests silence/recovery/failures, silence avec created_at, bandeau et File List. Status → done.
- **2026-03-04** — Correctifs revue appliqués ; story passée en done.
- **2026-03-03** — Implémentation dev-story (Story 2.5) : mode dégradé POS, GET /dashboard/pos-sync-status, bandeau dashboard, job périodique, tests. Status → review.
