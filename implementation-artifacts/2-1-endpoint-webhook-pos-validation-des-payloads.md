# Story 2.1: Endpoint Webhook POS & validation des payloads

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **système POS (Lightspeed, L'Addition, Square)**,
I want **envoyer les événements de vente à une URL webhook sécurisée**,
so that **Flowstock reçoit les ventes en temps réel sans polling**.

## Acceptance Criteria

1. **Given** le connecteur POS est configuré pour un tenant  
   **When** une vente est enregistrée en caisse  
   **Then** le POS envoie un POST vers l'endpoint webhook Flowstock (configurable par tenant)  
   **And** l'endpoint valide la signature / token selon le type de POS  
   **And** le payload est validé (champs obligatoires : id externe, ligne(s) de vente, date/heure)  
   **And** en cas de succès, l'API retourne 200 pour éviter les retries inutiles  
   **And** les requêtes sont idempotentes (même id externe = pas de double décrémentation)  
   **And** les erreurs 4xx/5xx sont loguées avec tenant_id pour diagnostic

## Tasks / Subtasks

- [x] Task 1: Modèle et configuration webhook par tenant (AC: endpoint configurable)
  - [x] 1.1 Définir ou étendre le schéma pour stocker l’URL webhook (ou identifiant de route) et le type POS par tenant (ex. table `tenant_pos_config` ou colonnes dans `tenants.settings`)
  - [x] 1.2 Migration SQL si nouvelle table/colonnes (tenant_id, pos_type, webhook_secret ou api_key, webhook_url si stockée, actif)
  - [x] 1.3 Documenter le format de configuration (Lightspeed vs L’Addition vs Square) pour les étapes suivantes
- [x] Task 2: Route POST webhook et identification tenant (AC: POST reçu, validation)
  - [x] 2.1 Créer une route POST dédiée (ex. `/webhooks/pos` ou `/api/webhooks/pos`) recevant le body brut + headers
  - [x] 2.2 Identifier le tenant à partir du payload ou d’un header (ex. X-Tenant-Id, ou token/signature contenant tenant_id) selon le type POS
  - [x] 2.3 Si authentification par signature : extraire et valider la signature (HMAC ou token) avec le secret configuré pour ce tenant
  - [x] 2.4 Répondre 401/403 si signature invalide ou tenant introuvable ; 200 uniquement après validation réussie
- [x] Task 3: Validation du payload (AC: champs obligatoires)
  - [x] 3.1 Définir un schéma de payload minimal commun (id externe, lignes de vente, date/heure) et des adapters par type POS (Story 2.3 pour Lightspeed détaillé)
  - [x] 3.2 Valider présence et format des champs obligatoires : id externe (string), lignes (array avec product_id ou sku, quantity), date/heure (ISO ou timestamp)
  - [x] 3.3 Répondre 400 avec message clair si payload invalide ; logger le tenant_id et l’erreur
- [x] Task 4: Idempotence (AC: même id externe = pas de double décrémentation)
  - [x] 4.1 Introduire un stockage des événements reçus par (tenant_id, id_externe) — ex. table `pos_events_received` ou utilisation d’un cache (Redis) avec TTL raisonnable
  - [x] 4.2 Avant tout traitement métier (décrémentation Story 2.2), vérifier si l’id externe a déjà été traité ; si oui, retourner 200 sans réappliquer la décrémentation
  - [ ] 4.3 Documenter la fenêtre d’idempotence (ex. 24h ou 7 jours selon contraintes métier)
- [x] Task 5: Réponses HTTP et logging (AC: 200 en succès, log erreurs 4xx/5xx)
  - [x] 5.1 En cas de succès (validation + idempotence OK, et si Story 2.2 prête : décrémentation acceptée), retourner 200 avec body optionnel (ex. `{ received: true }`)
  - [x] 5.2 Pour toute erreur 4xx/5xx, logger explicitement tenant_id, id externe si dispo, type d’erreur, message (sans exposer de données sensibles)
  - [x] 5.3 S’assurer que les retries côté POS ne sont pas déclenchés inutilement (200 cohérent, 5xx uniquement en cas d’échec réel serveur)

## Dev Notes

- **Contexte Epic 2** : Connecteur Universel POS (FR23). Cette story pose la base : réception sécurisée et validation des événements. La décrémentation effective du stock est dans la story 2.2 ; les adapters Lightspeed / L’Addition / Square seront détaillés en 2.3 et 2.4.
- **Lien frontend** : Le frontend MVP (pages `/rush`, `/rush/stocks`) est déjà en place avec des mocks. Une fois le webhook et la décrémentation en place, les alertes Rush pourront s’appuyer sur les vrais mouvements de stock (voir `implementation-artifacts/guide-fullstack-avec-frontend-existant.md`).
- **Sécurité** : Ne pas exposer de secrets dans les logs. Valider systématiquement la provenance (signature / token) pour éviter les envois forgés.
- **Multi-tenant** : Chaque requête webhook doit être associée à un tenant_id avant toute écriture ou décrémentation.
- **Fenêtre d’idempotence** : Les événements reçus sont conservés dans `pos_events_received` sans TTL automatique. Fenêtre recommandée : 7 jours ; une purge (cron ou job) pourra être ajoutée ultérieurement (voir commentaire dans V014).

### Project Structure Notes

- **apps/api** : Nouvelle route webhook (ex. `src/routes/webhooks.pos.routes.ts` ou sous-routes `webhooks/pos.routes.ts`), service de validation (ex. `src/services/pos-webhook.service.ts`), éventuellement adapters par type POS (stub pour 2.1, détaillé en 2.3).
- **Migrations** : Nouvelle migration pour table(s) config webhook et/ou événements reçus (idempotence).
- **Packages/shared** : Types pour payload webhook minimal (id externe, lignes, date) si partagés avec d’autres services.

### References

- [Source: planning-artifacts/epics.md#Epic 2 Story 2.1] — Critères d'acceptation
- [Source: implementation-artifacts/mvp-restaurant-implementation-plan.md] — Périmètre POS (Lightspeed prioritaire Sprint 1, L'Addition/Square après)
- [Source: implementation-artifacts/guide-fullstack-avec-frontend-existant.md] — Branchement Rush / stocks sur l'API

## Dev Agent Record

### File List (Story 2.1)

| Fichier | Statut |
|---------|--------|
| `apps/api/migrations/V014__create_pos_webhook_tables.sql` | Créé |
| `apps/api/src/routes/webhooks.pos.routes.ts` | Créé |
| `apps/api/src/services/pos-webhook.service.ts` | Créé |
| `apps/api/src/__tests__/webhooks/pos-webhook.integration.test.ts` | Créé |
| `apps/api/src/index.ts` | Modifié (montée route /webhooks/pos) |
| `apps/api/src/openapi/spec.ts` | Modifié (POST /webhooks/pos + securityScheme webhookBearer) |
| `implementation-artifacts/code-review-2-1-2026-02-26.md` | Créé (rapport code review) |

## Change Log

- **2026-02-26** — Code review (adversarial) : correctifs H1 (try/catch + log 5xx), H2 (validation UUID X-Tenant-Id), M4 (OpenAPI /webhooks/pos), M5 (test sold_at + test UUID invalide), M1–M3 (tasks cochées, File List, doc fenêtre idempotence). Rapport `code-review-2-1-2026-02-26.md`. Story 2.1 → done.
- **2026-02-25** — Dev-story : migration V014 (tenant_pos_config, pos_events_received), service pos-webhook (getConfigByTenantAndSecret, validatePayload, recordEventIdempotent, logWebhookError), route POST /webhooks/pos (montée avant CSRF), tests intégration pos-webhook.integration.test.ts. Story 2.1 → review.
- **2026-02-25** — Création story (workflow create-story) pour Epic 2. Story 2.1 Endpoint Webhook POS & validation des payloads. Sprint-status : epic-2 → in-progress, 2-1 → ready-for-dev.
