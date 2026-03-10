# Story 2.2: Décrémentation automatique du stock à partir d'un événement vente

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **restaurateur**,
I want **que chaque vente enregistrée en caisse décrémente automatiquement mon stock**,
so that **je n'ai pas à saisir manuellement les sorties**.

## Acceptance Criteria

1. **Given** un événement vente validé (Story 2.1) et un mapping produit POS → produit Flowstock  
   **When** le service traite l'événement  
   **Then** les quantités vendues sont déduites des stocks concernés (unités et/ou volumes)  
   **And** un mouvement de type "vente POS" est enregistré dans l'historique (FR18)  
   **And** les produits non mappés sont listés dans un rapport ou alerte (pas de silencieux drop)  
   **And** la cohérence multi-tenant est garantie (isolation par tenant_id)  
   **And** en cas d'erreur (stock insuffisant, produit inconnu), l'événement est mis en file pour retry ou manuel

## Tasks / Subtasks

- [x] Task 1: Résolution produit POS → Flowstock (AC: mapping)
  - [x] 1.1 Définir la stratégie de mapping : par `product_id` (UUID Flowstock) ou par `sku` (string) dans le payload webhook (Story 2.1 : lignes avec product_id ou sku).
  - [x] 1.2 Pour chaque ligne de vente, résoudre le produit Flowstock : si product_id fourni, vérifier qu'il existe pour le tenant ; si sku fourni, lookup par (tenant_id, sku) dans `products`. Rejeter ou alerter si non trouvé (pas de drop silencieux).
  - [x] 1.3 Documenter dans Dev Notes ou API le format attendu (product_id vs sku) pour les adapters (Story 2.3/2.4).
- [x] Task 2: Décrémentation de stock et mouvement (AC: déduction + historique)
  - [x] 2.1 Après validation + idempotence (Story 2.1), pour chaque ligne mappée : décrémenter `products.quantity` du tenant (quantity - quantity_sold), avec contrainte quantity >= 0 (gérer stock insuffisant → alerte/retry).
  - [x] 2.2 Ajouter un type de mouvement `pos_sale` (ou équivalent) au type ENUM `movement_type` si absent (migration ALTER TYPE movement_type ADD VALUE 'pos_sale').
  - [x] 2.3 Pour chaque ligne traitée, enregistrer un enregistrement dans `stock_movements` : movement_type = pos_sale, quantity_before, quantity_after, reason optionnel (ex. "POS sale", external_id). Utiliser `logMovement` (stockMovement.service) ou équivalent avec queryWithTenant.
  - [x] 2.4 Garantir isolation tenant : toutes les lectures/écritures via queryWithTenant(tenantId, ...) ou contexte RLS.
- [x] Task 3: Produits non mappés et erreurs (AC: rapport/alerte, retry)
  - [x] 3.1 Collecter les lignes dont le produit n'existe pas (product_id invalide ou sku introuvable). Ne pas décrémenter ; retourner ou logger une structure listant ces lignes (ex. unmapped_products ou alertes).
  - [x] 3.2 En cas de stock insuffisant (quantity - quantity_sold < 0), ne pas appliquer la décrémentation ; logger l'erreur avec tenant_id, product_id, external_id ; option : enregistrer l'événement en échec pour retry manuel ou file (table/fifo à définir pour "event en file" si scope MVP).
  - [x] 3.3 Réponse 200 uniquement si au moins une ligne a été traitée avec succès (ou 200 + body avec warnings si partiel). En cas d'échec total (tous non mappés ou tous stock insuffisant), retourner 200 + détail des erreurs pour éviter retries inutiles côté POS, ou 409/422 selon convention.
- [x] Task 4: Intégration dans la route webhook (AC: flux end-to-end)
  - [x] 4.1 Dans la route POST /webhooks/pos (webhooks.pos.routes.ts), après recordEventIdempotent et si résultat 'inserted', appeler le nouveau service de décrémentation (ex. processPosSaleEvent(tenantId, payload)).
  - [x] 4.2 Ne pas appeler la décrémentation si idempotence retourne 'duplicate' (déjà fait en 2.1).
  - [x] 4.3 Conserver le comportement 200 + { received: true } (et duplicate: true si idempotent) ; optionnellement étendre le body avec { processed_lines, unmapped_lines, errors } pour transparence.
- [x] Task 5: Tests et cohérence (AC: multi-tenant, historique)
  - [x] 5.1 Tests unitaires ou intégration : événement valide → décrémentation + mouvement pos_sale enregistré ; produit inconnu → pas de décrémentation + alerte/liste unmapped ; stock insuffisant → pas de décrémentation + log/erreur.
  - [x] 5.2 Vérifier que les mouvements sont visibles via l'API existante (historique mouvements / stock_movements) et que le dashboard Rush (frontend) pourra afficher les stocks à jour après une vente POS.

## Dev Notes

- **Contexte Epic 2** : Story 2.1 a livré la réception webhook (POST /webhooks/pos), la validation du payload (external_id, lines avec product_id/sku, quantity, sold_at) et l'idempotence (pos_events_received). Cette story ajoute la **décrémentation effective** et l'historique "vente POS".
- **Dépendances** : Réutiliser `pos-webhook.service` (validatePayload, recordEventIdempotent), types PosWebhookPayload / PosWebhookLine. Réutiliser `stockMovement.service` (logMovement ou équivalent) et `product.service` (lecture/mise à jour quantité produit). Ne pas dupliquer la logique d'idempotence.
- **Mapping produit** : Le payload webhook (Story 2.1) contient des lignes avec `product_id` (optionnel) et/ou `sku` (optionnel). Pour MVP, résolution par `sku` (unique par tenant dans `products`) ou par `product_id` (UUID Flowstock). Les adapters Lightspeed/L'Addition/Square (2.3, 2.4) enverront l'un ou l'autre selon leur mapping.
- **Type mouvement** : L'ENUM `movement_type` (V008) contient aujourd'hui 'creation', 'quantity_update', 'deletion', 'import'. Ajouter 'pos_sale' via migration (ALTER TYPE movement_type ADD VALUE 'pos_sale') pour tracer les ventes caisse dans l'historique (FR18).
- **Stock insuffisant** : Décision métier : soit refuser la décrémentation et logger (alerte), soit autoriser stock négatif temporairement (contourner la contrainte CHECK). Préférer refuser + alerte pour MVP sauf spécification contraire.
- **Frontend** : Les pages Rush (/rush, /rush/stocks) consomment déjà les API produits et mouvements. Aucun changement frontend requis pour cette story ; une fois la décrémentation en place, les données affichées refléteront les ventes POS.

### Project Structure Notes

- **apps/api** : Nouveau service (ex. `pos-sale-decrement.service.ts` ou extension de `pos-webhook.service`) pour processPosSaleEvent(tenantId, payload). Migration pour ALTER TYPE movement_type ADD VALUE 'pos_sale'. Route webhook existante (webhooks.pos.routes.ts) à étendre pour appeler ce service après idempotence.
- **Réutilisation** : `stockMovement.service.ts` (logMovement), `product.service.ts` (getById ou getBySku, update quantity), `pos-webhook.service.ts` (types, recordEventIdempotent). Ne pas réinventer la gestion tenant (queryWithTenant, RLS).
- **Tests** : Étendre ou ajouter tests dans `apps/api/src/__tests__/webhooks/` (ex. pos-webhook.integration.test.ts) : scénario "valid payload → stock decremented and movement created", "unknown sku → 200 + unmapped list", "insufficient stock → no decrement + error logged".

### References

- [Source: planning-artifacts/epics.md#Epic 2 Story 2.2] — Critères d'acceptation et contexte
- [Source: implementation-artifacts/2-1-endpoint-webhook-pos-validation-des-payloads.md] — Payload, idempotence, route /webhooks/pos
- [Source: apps/api/src/services/pos-webhook.service.ts] — PosWebhookPayload, PosWebhookLine, recordEventIdempotent
- [Source: apps/api/src/services/stockMovement.service.ts] — logMovement, movement_type
- [Source: apps/api/migrations/V008__create_stock_movements.sql] — ENUM movement_type, table stock_movements
- [Source: apps/api/migrations/V007__create_locations_suppliers_products.sql] — products.sku, products.quantity, contrainte quantity >= 0

## Dev Agent Record

### Agent Model Used

(Dev-story workflow)

### File List

| Fichier | Statut |
|---------|--------|
| `apps/api/migrations/V015__add_pos_sale_movement_type.sql` | Créé |
| `packages/shared/src/types/index.ts` | Modifié (MovementType + pos_sale) |
| `apps/api/src/services/product.service.ts` | Modifié (getProductBySku) |
| `apps/api/src/services/pos-sale-decrement.service.ts` | Créé |
| `apps/api/src/routes/webhooks.pos.routes.ts` | Modifié (appel processPosSaleEvent, body détaillé) |
| `apps/api/src/__tests__/webhooks/pos-webhook.integration.test.ts` | Modifié (setup produits, tests 2.2) |
| `apps/api/src/index.ts` | Modifié (webhook route mount) |
| `apps/api/src/openapi/spec.ts` | Modifié (POST /webhooks/pos documentation) |

### Completion Notes List

- Migration V015 : ajout valeur ENUM `pos_sale` pour mouvement_type.
- Service pos-sale-decrement : résolution produit par product_id ou sku, décrémentation atomique (UPDATE ... WHERE quantity >= $1), logMovement pos_sale, retour processed_lines / unmapped_lines / errors.
- Route webhook : après idempotence inserted, appel processPosSaleEvent ; réponse 200 avec processed_lines, unmapped_lines, errors et optionnel details (unmapped, insufficient_stock).
- Tests : décrémentation par sku + vérification quantité et mouvement pos_sale ; unmapped (sku inconnu) ; stock insuffisant (pas de décrément, détail erreur).

## Change Log

- **2026-02-27** — Code review (adversarial) : correctifs C1 (transaction processPosSaleEvent), H2 (validation UUID centralisée), H1 (doc 200), M2/M3 (tests), M1 (File List). Story 2.2 → done.
- **2026-02-26** — Dev-story : migration V015, service pos-sale-decrement, getProductBySku, intégration route webhook, tests intégration (décrément, unmapped, insufficient stock). Story 2.2 → review.
- **2026-02-26** — Création story (workflow create-story). Story 2.2 Décrémentation automatique du stock à partir d'un événement vente. Sprint-status : 2-2 → ready-for-dev.
