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
    { name: 'Auth', description: 'Inscription, connexion, tokens' },
    { name: 'Products', description: 'CRUD produits' },
    { name: 'Locations', description: 'Emplacements (entrepôts, magasins) - Story 2.3' },
    { name: 'Suppliers', description: 'Fournisseurs - Story 2.5' },
    { name: 'Subscriptions', description: 'Abonnements tenant' },
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
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT retourné par /auth/login ou /auth/register',
      },
    },
  },
} as const;
