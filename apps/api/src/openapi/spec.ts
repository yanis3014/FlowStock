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
