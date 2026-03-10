# Story 2.4: Adapteurs POS — L'Addition & Square

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **utilisateur ayant des caisses L'Addition ou Square**,
I want **connecter ma caisse à Flowstock**,
so that **mes ventes sont synchronisées sans saisie manuelle**.

## Acceptance Criteria

1. **Given** un tenant ayant choisi L'Addition ou Square  
   **When** l'utilisateur configure la connexion (webhook / API selon fournisseur)  
   **Then** un adapteur dédié transforme les payloads en événements internes (même format que Story 2.2)  
   **And** le mapping produits POS → Flowstock est configurable  
   **And** le comportement (décrémentation, idempotence) est identique à Lightspeed  
   **And** les deux connecteurs peuvent coexister (même code métier, adapters différents)

## Tasks / Subtasks

- [x] Task 1: Réception et vérification webhook L'Addition (AC: connexion, sécurité)
  - [x] 1.1 Exposer un endpoint dédié L'Addition (ex. POST /webhooks/pos/laddition). Auth : X-Tenant-Id + Bearer webhook_secret ; tenant_pos_config pos_type=laddition.
  - [x] 1.2 Parser le payload L'Addition (format à documenter selon doc fournisseur ou Chift) : extraire identifiant vente, line items (product id ou sku, quantity), date/heure.
  - [x] 1.3 Répondre 2xx rapidement pour éviter les retries côté émetteur.
- [x] Task 2: Réception et vérification webhook Square (AC: connexion, sécurité)
  - [x] 2.1 Exposer un endpoint dédié Square (ex. POST /webhooks/pos/square). Auth : X-Tenant-Id + Bearer webhook_secret ; tenant_pos_config pos_type=square.
  - [x] 2.2 Parser le payload Square (Orders API : order.created / order.updated ; structure event_id, data.order, line items). Extraire order ID → external_id, line items → product_id ou sku, quantity, created_at.
  - [x] 2.3 Vérifier la signature Square si documentée (X-Signature ou header dédié). Répondre 2xx rapidement.
- [x] Task 3: Transformation payload → format interne (AC: même format que 2.2)
  - [x] 3.1 Créer `pos-adapters/laddition.adapter.ts` : parseLadditionPayload(rawBody), transformToInternalPayload(tenantId, sale) utilisant getMappingForPosIdentifier(tenantId, 'laddition', posIdentifier). Lignes non mappées → sku préfixé (ex. LADD-{id}) pour unmapped_lines.
  - [x] 3.2 Créer `pos-adapters/square.adapter.ts` : parseSquarePayload(rawBody), transformToInternalPayload(tenantId, order) avec résolution via pos_product_mapping pos_type=square. Même chaîne recordEventIdempotent + processPosSaleEvent.
  - [x] 3.3 Ne pas dupliquer la logique métier : réutiliser pos-webhook.service (recordEventIdempotent), pos-sale-decrement.service (processPosSaleEvent), pos-product-mapping.service (getMappingForPosIdentifier).
- [x] Task 4: Mapping et coexistence (AC: mapping configurable, comportement identique Lightspeed)
  - [x] 4.1 Réutiliser la table pos_product_mapping et l’API /pos-mapping : pos_type=laddition et pos_type=square déjà supportés (POS_TYPES dans pos-mapping.routes). Aucune migration supplémentaire.
  - [x] 4.2 Dans chaque route /webhooks/pos/laddition et /webhooks/pos/square, vérifier config.pos_type puis parser → transform → recordEventIdempotent → processPosSaleEvent ; réponse 200 avec processed_lines, unmapped_lines, errors comme Lightspeed.
- [x] Task 5: Documentation et tests (AC: deux connecteurs coexistent)
  - [x] 5.1 Documenter dans OpenAPI (spec.ts) : POST /webhooks/pos/laddition, POST /webhooks/pos/square (description, auth, body, réponses). Documenter limites (réponse 2xx, idempotence via external_id).
  - [x] 5.2 Tests d’intégration : auth, payload invalide, unmapped sans mapping, décrément avec mapping, idempotence pour L'Addition et Square (fixtures réalistes ou simulées). Nettoyer pos_product_mapping et pos_events_received en afterAll.

## Dev Notes

- **Contexte Epic 2** : Stories 2.1 (endpoint générique + auth), 2.2 (décrémentation, unmapped_lines), 2.3 (adapteur Lightspeed, pos_product_mapping, /pos-mapping) sont livrées. Cette story ajoute **deux adapteurs** (L'Addition, Square) sur le même modèle que Lightspeed : endpoint dédié par POS, parser → format interne PosWebhookPayload, mapping via pos_product_mapping, même chaîne idempotence + processPosSaleEvent.
- **Adapter Pattern** : Même code métier (webhooks.pos.routes, pos-webhook.service, pos-sale-decrement.service, pos-product-mapping.service). Seuls les parsers/adapters diffèrent : lightspeed.adapter.ts (existant), laddition.adapter.ts (nouveau), square.adapter.ts (nouveau). PosType déjà défini : 'lightspeed' | 'laddition' | 'square' | 'manual'.
- **L'Addition** : Documentation webhook/API limitée en public ; intégrations souvent via plateformes (ex. Chift). Adapter flexible : parser le body (JSON ou form) pour extraire sale id, line items (product id/sku, quantity), date. En cas d’absence de doc officielle, définir un contrat minimal et documenter dans Dev Notes / OpenAPI.
- **Square** : Orders API webhooks (order.created, order.updated, order.fulfillment.updated). Payload : merchant_id, type, event_id, created_at, data (Order). Utiliser event_id ou order.id pour idempotence (external_id). Line items dans data.order.line_items (catalog_object_id, quantity, etc.). Doc : https://developer.squareup.com/reference/square/orders-api/webhooks
- **Mapping** : Table pos_product_mapping (tenant_id, pos_type, pos_identifier, flowstock_product_id | flowstock_sku). pos_type=laddition et square déjà autorisés. API GET/POST/DELETE /pos-mapping inchangée.
- **Réutilisation stricte** : Ne pas dupliquer recordEventIdempotent, processPosSaleEvent, validatePayload (pour payload déjà transformé). Routes /webhooks/pos/laddition et /webhooks/pos/square montées dans webhooks.pos.routes.ts comme /lightspeed.

### Project Structure Notes

- **apps/api** : Nouveaux fichiers `src/services/pos-adapters/laddition.adapter.ts`, `src/services/pos-adapters/square.adapter.ts`. Extension de `src/routes/webhooks.pos.routes.ts` : ajout router.post('/laddition', ...) et router.post('/square', ...). Aucune nouvelle migration (pos_product_mapping et tenant_pos_config déjà en place).
- **Réutilisation** : pos-webhook.service.ts (getConfigByTenantAndSecret, recordEventIdempotent, logWebhookError, types PosWebhookPayload, PosWebhookLine), pos-sale-decrement.service.ts (processPosSaleEvent), pos-product-mapping.service.ts (getMappingForPosIdentifier), utils/validation (isValidUuid).
- **Tests** : Étendre ou dupliquer le pattern de pos-webhook.integration.test.ts : describe pour POST /webhooks/pos/laddition et POST /webhooks/pos/square (auth, payload invalide, unmapped, mapping + décrément, idempotence). Fixtures L'Addition/Square selon format documenté ou simulé.

### References

- [Source: planning-artifacts/epics.md#Epic 2 Story 2.4] — Critères d'acceptation et coexistence
- [Source: implementation-artifacts/2-2-decrementation-automatique-du-stock-evenement-vente.md] — Format interne, processPosSaleEvent
- [Source: implementation-artifacts/2-3-adapteur-pos-lightspeed.md] — Pattern adapteur, pos_product_mapping, routes dédiées
- [Source: apps/api/src/services/pos-webhook.service.ts] — PosType, PosWebhookPayload, recordEventIdempotent
- [Source: apps/api/src/services/pos-adapters/lightspeed.adapter.ts] — Pattern parse + transformToInternalPayload
- [Source: apps/api/src/routes/webhooks.pos.routes.ts] — Montage /lightspeed, auth, réponse 200 détaillée
- [Square Orders API Webhooks] — https://developer.squareup.com/reference/square/orders-api/webhooks
- [L'Addition / Chift] — https://docs.chift.eu/connectors/pos/laddition (intégration possible)

## Dev Agent Record

### Agent Model Used

(Cursor / Auto ou modèle utilisé lors du dev-story)

### Debug Log References

### Completion Notes List

- POST /webhooks/pos/laddition et POST /webhooks/pos/square exposés ; auth X-Tenant-Id + Bearer, vérification pos_type.
- Adapteurs laddition.adapter.ts et square.adapter.ts : parse flexible (sale_id/order_id, line_items, product_id/catalog_object_id), transformToInternalPayload avec getMappingForPosIdentifier, unmapped LADD-*/SQ-*.
- Réutilisation recordEventIdempotent, processPosSaleEvent, pos_product_mapping (pas de nouvelle migration).
- OpenAPI : paths /webhooks/pos/laddition et /webhooks/pos/square documentés.
- Tests d’intégration : describe L'Addition et Square (401, 403, 400, unmapped, mapping + décrément, idempotence) ; cleanup afterAll.

### File List

- apps/api/src/services/pos-adapters/laddition.adapter.ts (créé)
- apps/api/src/services/pos-adapters/square.adapter.ts (créé)
- apps/api/src/routes/webhooks.pos.routes.ts (modifié — routes /laddition, /square ; helper handleDedicatedPosWebhook ; vérif. signature Square)
- apps/api/src/openapi/spec.ts (modifié — paths laddition, square ; schéma PosWebhook200Response)
- apps/api/src/__tests__/webhooks/pos-webhook.integration.test.ts (modifié — suites L'Addition, Square ; test 403 pos_type !== square)
- apps/api/src/services/pos-webhook.service.ts (modifié — verifySquareSignature, TenantPosConfigRow square_signature_key/square_notification_url)
- apps/api/src/index.ts (modifié — middleware raw body POST /webhooks/pos/square, json conditionnel)
- apps/api/migrations/V017__add_square_signature_key.sql (créé — colonnes square_signature_key, square_notification_url)

## Senior Developer Review (AI)

- **2026-02-28** — Revu adverse (workflow code-review). Rapport : `implementation-artifacts/code-review-2-4-2026-02-28.md`. Findings : 1 HIGH, 4 MEDIUM, 4 LOW. **Correctifs appliqués (option 1)** : H1 — Vérification signature Square (migration V017 square_signature_key + square_notification_url, middleware raw body pour POST /webhooks/pos/square, verifySquareSignature). M1 — Schéma OpenAPI PosWebhook200Response et $ref sur les 4 paths webhook. M2 — Helper handleDedicatedPosWebhook (lightspeed, laddition, square). M3 — externalId dans catch via getExternalIdForLog. M4 — Test « should return 403 when pos_type is not square ». Status → done après validation des correctifs.

## Change Log

- **2026-02-28** — Code review : correctifs validés. Story passée en **done**. Sprint synced.
- **2026-02-28** — Code review (adversarial) : 9 issues. Correctifs auto appliqués (H1, M1–M4). Voir code-review-2-4-2026-02-28.md. Migration V017, helper POS, OpenAPI PosWebhook200Response, test 403 Square.
- **2026-02-27** — Implémentation dev-story (Story 2.4) : adapteurs L'Addition et Square, routes POST /webhooks/pos/laddition et /square, OpenAPI, tests d’intégration. Status → review.
