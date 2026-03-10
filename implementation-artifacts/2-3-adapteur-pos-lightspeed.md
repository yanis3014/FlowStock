# Story 2.3: Adapteur POS — Lightspeed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **utilisateur ayant des caisses Lightspeed**,
I want **connecter mon compte Lightspeed à Flowstock**,
so that **mes ventes sont synchronisées automatiquement**.

## Acceptance Criteria

1. **Given** un tenant avec abonnement incluant le connecteur POS  
   **When** l'utilisateur configure la connexion Lightspeed (clé API / webhook)  
   **Then** l'adapteur transforme les payloads Lightspeed en événements internes (Adapter Pattern)  
   **And** le mapping catalogue Lightspeed → produits Flowstock est configurable (écran ou import)  
   **And** les ventes sont traitées en temps réel après réception du webhook  
   **And** la documentation des champs mappés et des limites (rate, format) est disponible

## Tasks / Subtasks

- [x] Task 1: Réception et vérification webhook Lightspeed (AC: connexion, sécurité)
  - [x] 1.1 Exposer un endpoint dédié Lightspeed (ex. POST /webhooks/pos/lightspeed) ou dispatcher par en-tête/pos_type vers un parser Lightspeed.
  - [x] 1.2 Vérifier la signature Lightspeed (X-Signature HMAC-SHA256 si documentée) ou authentification configurée (webhook_secret dans tenant_pos_config pour pos_type=lightspeed).
  - [x] 1.3 Parser le payload Lightspeed (sale:complete / sale:update) : format souvent application/x-www-form-urlencoded avec champ `payload` en JSON ; extraire sale ID, line items (product id, quantity), date/heure.
  - [x] 1.4 Répondre 2xx en moins de 5 secondes pour éviter les retries côté Lightspeed (limite documentée : 5 s).
- [x] Task 2: Transformation payload Lightspeed → format interne (AC: Adapter Pattern)
  - [x] 2.1 Créer un module adapteur (ex. `pos-adapters/lightspeed.adapter.ts` ou `services/pos-adapters/lightspeed.ts`) qui prend le body brut Lightspeed et retourne `PosWebhookPayload` : external_id (sale ID Lightspeed), lines[] avec product_id et/ou sku, sold_at (ISO).
  - [x] 2.2 Pour chaque line item Lightspeed, résoudre le produit Flowstock via le mapping configurable : Lightspeed product ID (ou SKU Lightspeed) → product_id Flowstock (UUID) ou sku Flowstock. Utiliser une table ou config par tenant (ex. `pos_product_mapping` : tenant_id, pos_type, pos_product_id, flowstock_product_id ou flowstock_sku).
  - [x] 2.3 En cas de ligne sans mapping, l’inclure dans les lignes non mappées (comportement existant Story 2.2 : unmapped_lines) ; ne pas faire échouer tout l’événement.
  - [x] 2.4 Après transformation, appeler la chaîne existante : recordEventIdempotent(tenantId, external_id) puis si 'inserted' processPosSaleEvent(tenantId, payload). Ne pas dupliquer la logique métier.
- [x] Task 3: Mapping catalogue Lightspeed → Flowstock (AC: configurable)
  - [x] 3.1 Permettre de configurer le mapping par tenant : soit écran (sélection produit Lightspeed → produit Flowstock), soit import CSV (pos_product_id ou sku_pos, flowstock_product_id ou flowstock_sku). (CRUD API livré ; import CSV optionnel.)
  - [x] 3.2 Persister le mapping (table ex. pos_product_mapping : tenant_id, pos_type, pos_identifier, flowstock_product_id ou flowstock_sku) avec contrainte d’unicité (tenant_id, pos_type, pos_identifier).
  - [x] 3.3 Utiliser ce mapping dans l’adapteur Lightspeed pour remplir product_id ou sku dans chaque PosWebhookLine avant d’appeler processPosSaleEvent.
- [x] Task 4: Documentation et limites (AC: documentation)
  - [x] 4.1 Documenter dans l’API (OpenAPI) ou Dev Notes : URL d’enregistrement webhook Lightspeed (notre endpoint), format attendu (sale:complete, structure payload), champs mappés (sale id → external_id, line items → lines avec product_id/sku, quantity, sold_at).
  - [x] 4.2 Documenter les limites : réponse 2xx sous 5 s, retries Lightspeed (jusqu’à 20 fois sur 48 h en cas d’échec), idempotence via external_id (éviter double décrémentation).
  - [ ] 4.3 Optionnel : documenter la configuration Lightspeed côté client (où saisir l’URL webhook et le secret dans le back-office Lightspeed si applicable).

## Dev Notes

- **Contexte Epic 2** : Stories 2.1 et 2.2 ont livré POST /webhooks/pos générique (auth X-Tenant-Id + Bearer webhook_secret), validation payload (external_id, lines avec product_id/sku, quantity, sold_at), idempotence et décrémentation. Cette story ajoute l’**adapteur Lightspeed** : recevoir le format spécifique Lightspeed, le transformer en format interne, puis réutiliser la même chaîne.
- **Adapter Pattern** : Un seul point d’entrée peut rester POST /webhooks/pos avec détection du type (en-tête ou param) pour choisir le parser ; ou un sous-route POST /webhooks/pos/lightspeed. Les deux approches sont acceptables ; le parser Lightspeed doit produire `PosWebhookPayload` et les lignes doivent contenir product_id ou sku résolus via le mapping.
- **Lightspeed (X-Series)** : Webhooks en POST, souvent `application/x-www-form-urlencoded` avec champ `payload` (JSON). Événements vente : sale:complete, sale:update, sale:discard. Réponse 2xx sous 5 s recommandée ; retries côté Lightspeed jusqu’à 20 fois sur 48 h. Vérification possible par X-Signature HMAC-SHA256 (à confirmer selon doc Lightspeed utilisée).
- **Mapping** : La story 2.2 attend des lignes avec product_id (UUID Flowstock) ou sku (Flowstock). L’adapteur doit donc soit envoyer product_id (après lookup dans pos_product_mapping → flowstock_product_id), soit sku (flowstock_sku). La table pos_product_mapping (ou équivalent) doit exister et être utilisée uniquement pour les adapters (Lightspeed, puis 2.4 L’Addition/Square).
- **Réutilisation** : pos-webhook.service (validatePayload, recordEventIdempotent, types PosWebhookPayload, PosWebhookLine), pos-sale-decrement.service (processPosSaleEvent), webhooks.pos.routes (auth tenant + secret). Ne pas dupliquer idempotence ni décrémentation.
- **tenant_pos_config** : Déjà utilisé pour webhook_secret et pos_type. Pour Lightspeed, pos_type = 'lightspeed' ; le même secret peut servir pour vérifier les requêtes (Bearer ou HMAC selon ce que Lightspeed envoie). Adapter la vérification dans la route Lightspeed si Lightspeed utilise HMAC au lieu de Bearer.

### Project Structure Notes

- **apps/api** : Nouveau module adapteur (ex. `src/services/pos-adapters/lightspeed.adapter.ts` ou `src/adapters/lightspeed-webhook.ts`) pour parser et transformer ; éventuellement nouvelle route `src/routes/webhooks.pos.lightspeed.routes.ts` ou extension de webhooks.pos.routes avec branche par pos_type. Migration pour table `pos_product_mapping` si pas encore présente.
- **Réutilisation** : `pos-webhook.service.ts` (types, recordEventIdempotent, validatePayload pour le payload déjà transformé), `pos-sale-decrement.service.ts` (processPosSaleEvent), `product.service.ts` (getProductBySku, getProductById pour résolution côté mapping).
- **Tests** : Tests d’intégration ou unitaires : payload Lightspeed réel ou fixture → transformation → même comportement que POST /webhooks/pos avec payload interne (idempotence, décrémentation, unmapped). Tester mapping manquant → lignes en unmapped.

### References

- [Source: planning-artifacts/epics.md#Epic 2 Story 2.3] — Critères d'acceptation et contexte
- [Source: implementation-artifacts/2-1-endpoint-webhook-pos-validation-des-payloads.md] — Endpoint webhook, auth, idempotence
- [Source: implementation-artifacts/2-2-decrementation-automatique-du-stock-evenement-vente.md] — Format interne, processPosSaleEvent, mapping product_id/sku
- [Source: apps/api/src/services/pos-webhook.service.ts] — PosWebhookPayload, PosWebhookLine, PosType, recordEventIdempotent
- [Source: apps/api/src/routes/webhooks.pos.routes.ts] — Auth X-Tenant-Id + Bearer, appel processPosSaleEvent
- [Source: apps/api/migrations/V014__create_pos_webhook_tables.sql] — tenant_pos_config (pos_type, webhook_secret)
- [Lightspeed X-Series Webhooks] — https://x-series-api.lightspeedhq.com/docs/webhooks (format, signature, retries)
- [Lightspeed Sale Hooks] — https://x-series-api.lightspeedhq.com/docs/client_api_sale_hooks (sale:complete, sale:update, structure)

## Dev Agent Record

### Agent Model Used

Cursor / Auto (dev-story workflow)

### Debug Log References

(Agent transcripts si besoin)

### Completion Notes List

- Endpoint POST /webhooks/pos/lightspeed avec auth X-Tenant-Id + Bearer (webhook_secret), vérification pos_type=lightspeed.
- Body JSON ou application/x-www-form-urlencoded (champ `payload` JSON). Parser flexible (saleID/saleId, lineItems/line_items, itemID/productID, quantity, createTime).
- Table pos_product_mapping (V016) ; API GET/POST/DELETE /pos-mapping (JWT). Adapteur Lightspeed transforme puis recordEventIdempotent + processPosSaleEvent.
- OpenAPI : POST /webhooks/pos/lightspeed et GET/POST/DELETE /pos-mapping documentés. Tests d’intégration Lightspeed : auth, payload invalide, unmapped sans mapping, décrément avec mapping, idempotence, form-urlencoded.

### File List

- apps/api/migrations/V016__create_pos_product_mapping.sql (créé)
- apps/api/src/services/pos-product-mapping.service.ts (créé)
- apps/api/src/services/pos-adapters/lightspeed.adapter.ts (créé)
- apps/api/src/routes/webhooks.pos.routes.ts (modifié — route Lightspeed)
- apps/api/src/routes/pos-mapping.routes.ts (créé)
- apps/api/src/utils/validation.ts (créé — isValidUuid utilisé par webhooks POS et pos-sale-decrement)
- apps/api/src/index.ts (modifié — urlencoded, mount pos-mapping)
- apps/api/src/openapi/spec.ts (modifié — paths Lightspeed + pos-mapping)
- apps/api/src/__tests__/webhooks/pos-webhook.integration.test.ts (modifié — suite Lightspeed + cleanup pos_product_mapping)

### Senior Developer Review (AI)

- **Date:** 2026-02-27
- **Findings:** 2 HIGH, 3 MEDIUM, 2 LOW. Corrections appliquées pour HIGH et MEDIUM.
- **Correctifs appliqués:**
  - **Duplicate mapping → 409** : violation de contrainte unique (code 23505 ou message "duplicate") renvoie désormais 409 avec message clair au lieu de 500 (pos-mapping.routes.ts).
  - **Validation produit existant** : createMapping vérifie que flowstock_product_id ou flowstock_sku existent dans products pour le tenant ; sinon erreur "Product not found" 400 (pos-product-mapping.service.ts).
  - **Code mort** : suppression de la branche duplicate createTime dans l’extraction soldAt (lightspeed.adapter.ts).
  - **File List** : ajout de apps/api/src/utils/validation.ts.

## Change Log

- **2026-02-27** — Création story (workflow create-story). Story 2.3 Adapteur POS Lightspeed. Sprint-status : 2-3 → ready-for-dev.
- **2026-02-27** — Implémentation dev-story : endpoint Lightspeed, adapteur, mapping, API pos-mapping, OpenAPI, tests. Status → review. Sprint-status : 2-3-adapteur-pos-lightspeed → review.
- **2026-02-27** — Code review (AI) : correctifs duplicate 409, validation produit à la création mapping, suppression code mort, File List complétée. Status → done. Sprint-status : 2-3-adapteur-pos-lightspeed → done.
