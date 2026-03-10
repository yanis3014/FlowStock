/**
 * OpenAPI 3.0 specification for bmad-stock-agent API.
 * Served at /api-docs and /api-docs/openapi.json
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'bmad-stock-agent API',
    version: '1.0.0',
    description: 'API REST de gestion de stocks (auth, produits, abonnements). Authentification JWT. CSRF requis pour les requêtes mutantes.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
  tags: [
    { name: 'Health', description: 'Santé du service' },
    { name: 'Webhooks', description: 'Webhooks POS (Story 2.1) — pas de CSRF' },
    { name: 'Auth', description: 'Inscription, connexion, tokens' },
    { name: 'Products', description: 'CRUD produits' },
    { name: 'Locations', description: 'Emplacements (entrepôts, magasins) - Story 2.3' },
    { name: 'Suppliers', description: 'Fournisseurs - Story 2.5' },
    { name: 'Sales', description: 'Ventes (saisie manuelle) - Story 3.1' },
    { name: 'Subscriptions', description: 'Abonnements tenant' },
    { name: 'Dashboard', description: 'Dashboard et statut POS (Story 2.5)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string' },
                    version: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/webhooks/pos': {
      post: {
        tags: ['Webhooks'],
        summary: 'Réception événement de vente POS',
        description:
          "Endpoint webhook pour les systèmes POS (Lightspeed, L'Addition, Square). Authentification : X-Tenant-Id + Authorization: Bearer <webhook_secret>. Pas de CSRF. " +
          "The API always returns 200 with a detailed body (processed_lines, unmapped_lines, errors) to prevent unnecessary POS retries on partial failures; the POS system should inspect the body to determine if lines were processed.",
        security: [{ webhookBearer: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID du tenant' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['external_id', 'lines', 'sold_at'],
                properties: {
                  external_id: { type: 'string', description: 'Identifiant externe de la vente (idempotence)' },
                  lines: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['quantity'],
                      properties: {
                        product_id: { type: 'string' },
                        sku: { type: 'string' },
                        quantity: { type: 'number', minimum: 1 },
                      },
                    },
                  },
                  sold_at: { type: 'string', description: 'Date/heure de vente (ISO 8601 ou timestamp)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Événement reçu (ou déjà reçu, idempotence). Détail : processed_lines, unmapped_lines, errors, details si échec partiel.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PosWebhook200Response' },
              },
            },
          },
          '400': { description: 'Payload invalide (external_id, lines, sold_at requis et valides) ou X-Tenant-Id non UUID' },
          '401': { description: 'X-Tenant-Id ou Authorization Bearer manquant' },
          '403': { description: 'Tenant introuvable ou secret webhook invalide' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/webhooks/pos/lightspeed': {
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook Lightspeed (Story 2.3)',
        description:
          'Endpoint dédié aux webhooks Lightspeed X-Series (sale:complete, sale:update). ' +
          'Body: JSON ou application/x-www-form-urlencoded avec champ "payload" (JSON). ' +
          'Auth: X-Tenant-Id + Authorization: Bearer <webhook_secret> ; tenant_pos_config doit avoir pos_type=lightspeed. ' +
          'Réponse 2xx sous 5 s recommandée (limite Lightspeed). Idempotence via sale ID → external_id. ' +
          'Mapping Lightspeed product ID → Flowstock via table pos_product_mapping (API /pos-mapping).',
        security: [{ webhookBearer: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': { schema: { type: 'object', description: 'Sale payload (saleID, lineItems with itemID/productID, quantity, createTime)' } },
            'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { payload: { type: 'string', description: 'JSON string of sale payload' } } } },
          },
        },
        responses: {
          '200': {
            description: 'Événement reçu et traité (même format que POST /webhooks/pos)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PosWebhook200Response' } },
            },
          },
          '400': { description: 'Payload Lightspeed invalide ou vide' },
          '401': { description: 'X-Tenant-Id ou Bearer manquant' },
          '403': { description: 'Secret invalide ou pos_type != lightspeed' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/webhooks/pos/laddition': {
      post: {
        tags: ['Webhooks'],
        summary: "Webhook L'Addition (Story 2.4)",
        description:
          "Endpoint dédié aux webhooks L'Addition. Body: JSON ou application/x-www-form-urlencoded avec champ \"payload\" (JSON). " +
          "Auth: X-Tenant-Id + Authorization: Bearer <webhook_secret> ; tenant_pos_config pos_type=laddition. " +
          "Réponse 2xx rapidement. Idempotence via sale/order ID → external_id. Mapping via pos_product_mapping (API /pos-mapping).",
        security: [{ webhookBearer: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': { schema: { type: 'object', description: "Sale payload (sale_id/order_id, line_items/lines avec product_id/sku, quantity, created_at)" } },
            'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { payload: { type: 'string', description: 'JSON string of sale payload' } } } },
          },
        },
        responses: {
          '200': { description: 'Événement reçu et traité (même format que POST /webhooks/pos)' },
          '400': { description: "Payload L'Addition invalide ou vide" },
          '401': { description: 'X-Tenant-Id ou Bearer manquant' },
          '403': { description: "Secret invalide ou pos_type != laddition" },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/webhooks/pos/square': {
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook Square (Story 2.4)',
        description:
          'Endpoint dédié aux webhooks Square Orders API (order.created / order.updated). Body: JSON. ' +
          'Auth: X-Tenant-Id + Authorization: Bearer <webhook_secret> ; tenant_pos_config pos_type=square. ' +
          'Réponse 2xx rapidement. Idempotence via order ID / event_id → external_id. Mapping via pos_product_mapping (API /pos-mapping).',
        security: [{ webhookBearer: [] }],
        parameters: [
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': { schema: { type: 'object', description: 'Square event (event_id, created_at, data.object with order/order_updated, line_items)' } },
          },
        },
        responses: {
          '200': {
            description: 'Événement reçu et traité (même format que POST /webhooks/pos). Si square_signature_key et square_notification_url sont configurés, la signature x-square-hmacsha256-signature est vérifiée.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PosWebhook200Response' } },
            },
          },
          '400': { description: 'Payload Square invalide ou vide' },
          '401': { description: 'X-Tenant-Id ou Bearer manquant, ou signature Square invalide' },
          '403': { description: 'Secret invalide ou pos_type != square' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/pos-mapping': {
      get: {
        tags: ['Webhooks'],
        summary: 'Liste des mappings POS → Flowstock (Story 2.3)',
        description: 'Liste les mappings par tenant. Filtre optionnel: ?pos_type=lightspeed. Auth JWT requise.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'pos_type', in: 'query', schema: { type: 'string', enum: ['lightspeed', 'laddition', 'square', 'manual'] } },
        ],
        responses: { '200': { description: 'Liste des mappings' } },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Créer un mapping POS → Flowstock',
        description: 'Body: pos_type, pos_identifier, flowstock_product_id (optionnel), flowstock_sku (optionnel). Au moins un des deux Flowstock requis.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pos_type', 'pos_identifier'],
                properties: {
                  pos_type: { type: 'string', enum: ['lightspeed', 'laddition', 'square', 'manual'] },
                  pos_identifier: { type: 'string' },
                  flowstock_product_id: { type: 'string', format: 'uuid' },
                  flowstock_sku: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Mapping créé' }, '400': { description: 'Validation ou doublon' } },
      },
    },
    '/pos-mapping/{id}': {
      delete: {
        tags: ['Webhooks'],
        summary: 'Supprimer un mapping',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Supprimé' }, '404': { description: 'Non trouvé' } },
      },
    },
    '/dashboard/pos-sync-status': {
      get: {
        tags: ['Dashboard'],
        summary: 'Statut de synchro POS (Story 2.5)',
        description: 'Retourne is_degraded, last_event_at, degraded_since, failure_count pour le tenant. Utilisé pour afficher le bandeau "Synchro POS interrompue" et les métriques support.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Statut POS sync',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        is_degraded: { type: 'boolean', description: 'true si mode dégradé actif' },
                        last_event_at: { type: 'string', format: 'date-time', nullable: true, description: 'Dernier événement reçu' },
                        degraded_since: { type: 'string', format: 'date-time', nullable: true, description: 'Depuis quand le mode dégradé est actif' },
                        failure_count: { type: 'integer', description: 'Nombre d\'échecs webhook (récent)' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/csrf-token': {
      get: {
        tags: ['Auth'],
        summary: 'Obtenir un token CSRF',
        description: 'À appeler avant toute requête POST/PUT/DELETE. Envoyer le token dans l’en-tête X-CSRF-Token et les cookies de la réponse.',
        responses: {
          '200': {
            description: 'Token CSRF',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { csrfToken: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Inscription',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'first_name', 'last_name', 'company_name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  company_name: { type: 'string' },
                  industry: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Compte créé' },
          '400': { description: 'Validation échouée' },
          '409': { description: 'Email déjà utilisé' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connexion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tokens retournés' },
          '401': { description: 'Identifiants invalides' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Utilisateur courant',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Profil utilisateur' },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rafraîchir l’access token',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: { refresh_token: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Nouveau access token' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Déconnexion',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refresh_token: { type: 'string' } },
              },
            },
          },
        },
        responses: { '204': { description: 'OK' } },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'Liste des produits',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'location_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'supplier_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'low_stock', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['created_at', 'updated_at', 'name', 'sku', 'quantity'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { '200': { description: 'Liste paginée' } },
      },
      post: {
        tags: ['Products'],
        summary: 'Créer un produit',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sku', 'name', 'unit'],
                properties: {
                  sku: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  unit: { type: 'string', enum: ['piece', 'kg', 'liter', 'box', 'pack'] },
                  quantity: { type: 'number' },
                  min_quantity: { type: 'number' },
                  location_id: { type: 'string', format: 'uuid' },
                  supplier_id: { type: 'string', format: 'uuid' },
                  purchase_price: { type: 'number' },
                  selling_price: { type: 'number' },
                  lead_time_days: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Produit créé' }, '400': { description: 'Validation' } },
      },
    },
    '/products/import/template': {
      get: {
        tags: ['Products'],
        summary: 'Télécharger le template CSV d\'import',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Fichier CSV (attachment)', content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } } },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/products/import/preview': {
      post: {
        tags: ['Products'],
        summary: 'Prévisualiser un fichier CSV/Excel (colonnes, mapping suggéré, aperçu)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary', description: 'Fichier .csv, .xlsx ou .xls' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Colonnes, lignes échantillon, mapping suggéré',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        columns: { type: 'array', items: { type: 'string' } },
                        sampleRows: { type: 'array', items: { type: 'object' } },
                        suggestedMapping: { type: 'object', additionalProperties: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Fichier absent ou type non autorisé' },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/products/import': {
      post: {
        tags: ['Products'],
        summary: 'Exécuter l\'import produits (CSV/Excel)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Fichier .csv, .xlsx ou .xls' },
                  mapping: { type: 'string', description: 'JSON optionnel: mapping colonne → champ produit' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Rapport d\'import',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        imported: { type: 'integer' },
                        errors: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              row: { type: 'integer' },
                              value: { type: 'string' },
                              message: { type: 'string' },
                            },
                          },
                        },
                        ignored: { type: 'integer' },
                        totalRows: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Fichier absent ou type non autorisé' },
          '401': { description: 'Non authentifié' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Détail produit',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' } },
      },
      put: {
        tags: ['Products'],
        summary: 'Modifier un produit',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  unit: { type: 'string', enum: ['piece', 'kg', 'liter', 'box', 'pack'] },
                  quantity: { type: 'number' },
                  min_quantity: { type: 'number' },
                  location_id: { type: 'string', format: 'uuid' },
                  supplier_id: { type: 'string', format: 'uuid' },
                  purchase_price: { type: 'number' },
                  selling_price: { type: 'number' },
                  lead_time_days: { type: 'integer' },
                  is_active: { type: 'boolean' },
                  reason: { type: 'string', description: 'Raison optionnelle pour le mouvement (modification quantité)' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' } },
      },
      delete: {
        tags: ['Products'],
        summary: 'Supprimer (soft) un produit',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Supprimé' }, '404': { description: 'Non trouvé' } },
      },
    },
    '/products/{id}/movements': {
      get: {
        tags: ['Products'],
        summary: 'Historique des mouvements d’un produit (Story 2.4)',
        description: 'Liste paginée des mouvements (création, modification quantité, suppression). Rétention selon abonnement (30/90/365 jours).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'movement_type', in: 'query', schema: { type: 'string', enum: ['creation', 'quantity_update', 'deletion', 'import'] } },
          { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          product_id: { type: 'string', format: 'uuid' },
                          movement_type: { type: 'string', enum: ['creation', 'quantity_update', 'deletion', 'import'] },
                          quantity_before: { type: 'number', nullable: true },
                          quantity_after: { type: 'number', nullable: true },
                          user_id: { type: 'string', format: 'uuid', nullable: true },
                          user_email: { type: 'string', nullable: true },
                          reason: { type: 'string', nullable: true },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, total_pages: { type: 'integer' } } },
                    retention_days: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { description: 'Non authentifié' },
          '404': { description: 'Produit non trouvé' },
        },
      },
    },
    '/products/{id}/movements/export': {
      get: {
        tags: ['Products'],
        summary: 'Exporter l’historique des mouvements en CSV (Story 2.4)',
        description: 'Même rétention et filtres que la liste. Limité à 10 000 lignes.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv'] } },
          { name: 'movement_type', in: 'query', schema: { type: 'string', enum: ['creation', 'quantity_update', 'deletion', 'import'] } },
          { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': { description: 'Fichier CSV (Content-Disposition: attachment)' },
          '401': { description: 'Non authentifié' },
          '404': { description: 'Produit non trouvé' },
        },
      },
    },
    '/locations': {
      get: {
        tags: ['Locations'],
        summary: 'Liste des emplacements',
        description: 'Retourne les emplacements du tenant avec total_quantity (somme des quantités produits).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Non authentifié' } },
      },
      post: {
        tags: ['Locations'],
        summary: 'Créer un emplacement',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  location_type: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Créé' }, '400': { description: 'Validation' }, '409': { description: 'Nom déjà existant pour ce tenant' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/locations/{id}': {
      get: {
        tags: ['Locations'],
        summary: 'Détail emplacement',
        description: 'Inclut total_quantity (somme des quantités produits à cet emplacement).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' }, '401': { description: 'Non authentifié' } },
      },
      put: {
        tags: ['Locations'],
        summary: 'Modifier un emplacement',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  location_type: { type: 'string' },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' }, '409': { description: 'Nom déjà existant' }, '401': { description: 'Non authentifié' } },
      },
      delete: {
        tags: ['Locations'],
        summary: 'Supprimer (soft) un emplacement',
        description: 'Met is_active à false. Les produits conservent leur location_id.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Supprimé' }, '404': { description: 'Non trouvé' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/suppliers': {
      get: {
        tags: ['Suppliers'],
        summary: 'Liste des fournisseurs',
        description: 'Retourne les fournisseurs du tenant avec products_count (nombre de produits liés).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Non authentifié' } },
      },
      post: {
        tags: ['Suppliers'],
        summary: 'Créer un fournisseur',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  contact_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Créé' }, '400': { description: 'Validation / email invalide' }, '409': { description: 'Nom déjà existant pour ce tenant' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/suppliers/{id}': {
      get: {
        tags: ['Suppliers'],
        summary: 'Détail fournisseur',
        description: 'Inclut products_count (nombre de produits liés).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' }, '401': { description: 'Non authentifié' } },
      },
      put: {
        tags: ['Suppliers'],
        summary: 'Modifier un fournisseur',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  contact_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  notes: { type: 'string' },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' }, '409': { description: 'Nom déjà existant' }, '400': { description: 'Validation / email invalide' }, '401': { description: 'Non authentifié' } },
      },
      delete: {
        tags: ['Suppliers'],
        summary: 'Supprimer (soft) un fournisseur',
        description: 'Met is_active à false. Les produits conservent leur supplier_id.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Supprimé' }, '404': { description: 'Non trouvé' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/sales/stats': {
      get: {
        tags: ['Sales'],
        summary: 'Statistiques rapides ventes',
        description: 'Quantités et montants : aujourd\'hui, hier, cette semaine, ce mois.',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/sales/summary': {
      get: {
        tags: ['Sales'],
        summary: 'Agrégations ventes',
        description: 'Ventes groupées par jour, produit ou emplacement.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'product_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'location_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'group_by', in: 'query', schema: { type: 'string', enum: ['day', 'product', 'location'] } },
        ],
        responses: { '200': { description: 'OK' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/sales': {
      get: {
        tags: ['Sales'],
        summary: 'Liste des ventes',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'product_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'location_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['sale_date', 'created_at', 'quantity_sold', 'total_amount'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { '200': { description: 'Liste paginée' }, '401': { description: 'Non authentifié' } },
      },
      post: {
        tags: ['Sales'],
        summary: 'Créer une vente (saisie manuelle)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['product_id', 'quantity_sold'],
                properties: {
                  product_id: { type: 'string', format: 'uuid' },
                  sale_date: { type: 'string', format: 'date-time' },
                  quantity_sold: { type: 'number', minimum: 0.01 },
                  unit_price: { type: 'number', minimum: 0 },
                  location_id: { type: 'string', format: 'uuid' },
                  metadata: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Créé' }, '400': { description: 'Validation' }, '404': { description: 'Produit ou emplacement non trouvé' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/sales/{id}': {
      get: {
        tags: ['Sales'],
        summary: 'Détail d\'une vente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' }, '401': { description: 'Non authentifié' } },
      },
      put: {
        tags: ['Sales'],
        summary: 'Modifier une vente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  product_id: { type: 'string', format: 'uuid' },
                  sale_date: { type: 'string', format: 'date-time' },
                  quantity_sold: { type: 'number', minimum: 0.01 },
                  unit_price: { type: 'number', minimum: 0 },
                  location_id: { type: 'string', format: 'uuid' },
                  metadata: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' }, '404': { description: 'Non trouvé' }, '400': { description: 'Validation' }, '401': { description: 'Non authentifié' } },
      },
      delete: {
        tags: ['Sales'],
        summary: 'Supprimer une vente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Supprimé' }, '404': { description: 'Non trouvé' }, '401': { description: 'Non authentifié' } },
      },
    },
    '/subscriptions/current': {
      get: {
        tags: ['Subscriptions'],
        summary: 'Abonnement courant',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Aucun abonnement' } },
      },
    },
    '/subscriptions/upgrade': {
      post: {
        tags: ['Subscriptions'],
        summary: 'Changer de tier',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['new_tier'],
                properties: {
                  new_tier: { type: 'string', enum: ['normal', 'premium', 'premium_plus'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  components: {
    schemas: {
      /** Réponse 200 commune aux webhooks POS (générique, Lightspeed, L\'Addition, Square). En cas d\'échec partiel (lignes non mappées ou stock insuffisant), l\'API renvoie 200 avec processed_lines / unmapped_lines / errors pour éviter les retries massifs côté POS. */
      PosWebhook200Response: {
        type: 'object',
        properties: {
          received: { type: 'boolean', example: true },
          duplicate: { type: 'boolean', description: 'Présent si l’événement était déjà traité (idempotence)' },
          processed_lines: { type: 'integer', description: 'Nombre de lignes décrémentées avec succès' },
          unmapped_lines: { type: 'integer', description: 'Nombre de lignes sans mapping POS → Flowstock' },
          errors: { type: 'integer', description: 'Nombre d’erreurs (ex. stock insuffisant)' },
          details: {
            type: 'object',
            description: 'Présent si unmapped_lines > 0 ou errors > 0',
            properties: {
              unmapped: { type: 'array', items: { type: 'object' }, description: 'Lignes non mappées' },
              insufficient_stock: { type: 'array', items: { type: 'object' }, description: 'Erreurs stock insuffisant' },
            },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT retourné par /auth/login ou /auth/register',
      },
      webhookBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque',
        description: 'Secret webhook configuré par tenant (tenant_pos_config.webhook_secret). En-tête: Authorization: Bearer <secret>.',
      },
    },
  },
} as const;
