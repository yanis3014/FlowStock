# 🔧 Plan d'Action - Améliorations Code Review
**Date**: 1er février 2026  
**Basé sur**: Revue de Code Complète du 1er février 2026

---

## 📋 Vue d'Ensemble

Ce document fournit un plan d'action détaillé avec des exemples de code concrets pour implémenter les améliorations identifiées lors de la revue de code.

### Priorités
- 🚨 **P0 - Critique** : À faire immédiatement (cette semaine)
- ⚠️ **P1 - Important** : Dans les 2 prochaines semaines
- 📋 **P2 - Souhaitable** : Dans le mois

---

## 🚨 P0 - Actions Critiques

### 1. Graceful Shutdown de la Base de Données

**Fichier** : `apps/api/src/index.ts`

**Problème** : Le pool de connexions DB n'est pas fermé proprement lors de l'arrêt du serveur.

**Solution** :
```typescript
// apps/api/src/index.ts (ajouter après la ligne 83)

import { closeDatabase } from './database/connection';

let server: ReturnType<typeof app.listen>;

function startServer() {
  validateJwtSecret();
  server = app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

// Graceful shutdown handlers
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  // 1. Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
  }
  
  // 2. Close database connections
  try {
    await closeDatabase();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
  
  // 3. Exit process
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
```

**Test** :
```bash
# Démarrer le serveur
npm run dev

# Dans un autre terminal, envoyer SIGTERM
kill -TERM $(lsof -ti:3000)

# Vérifier les logs : doit afficher "Database connections closed"
```

---

### 2. Monitoring avec Prometheus

**Fichier** : `apps/api/src/middleware/metrics.ts` (nouveau)

```typescript
import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Créer un registre pour les métriques
export const register = new promClient.Registry();

// Métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({ register });

// Métrique : Durée des requêtes HTTP
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Métrique : Nombre de requêtes HTTP
export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Métrique : Connexions DB actives
export const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Métrique : Erreurs d'authentification
export const authErrors = new promClient.Counter({
  name: 'auth_errors_total',
  help: 'Total number of authentication errors',
  labelNames: ['error_type'],
  registers: [register],
});

// Middleware pour capturer les métriques HTTP
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
}

// Endpoint pour exposer les métriques
export async function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
```

**Intégration dans `index.ts`** :
```typescript
// apps/api/src/index.ts (ajouter après la ligne 20)

import { metricsMiddleware, metricsHandler } from './middleware/metrics';

// Ajouter le middleware de métriques
app.use(metricsMiddleware);

// Endpoint /metrics pour Prometheus
app.get('/metrics', metricsHandler);
```

**Fichier** : `apps/api/package.json` (ajouter dépendance)
```json
{
  "dependencies": {
    "prom-client": "^15.1.0"
  }
}
```

**Configuration Prometheus** : `infrastructure/prometheus.yml` (nouveau)
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'bmad-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
```

**Docker Compose** : Ajouter Prometheus et Grafana
```yaml
# docker-compose.yml (ajouter ces services)

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - bmad-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - bmad-network
    depends_on:
      - prometheus

volumes:
  prometheus-data:
  grafana-data:
```

**Test** :
```bash
docker-compose up -d prometheus grafana
# Accéder à http://localhost:9090 (Prometheus)
# Accéder à http://localhost:3001 (Grafana, admin/admin)
```

---

### 3. Logging Structuré avec Winston

**Fichier** : `apps/api/src/utils/logger.ts` (nouveau)

```typescript
import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// Format pour la console (développement)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${meta}`;
  })
);

// Créer le logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'bmad-api' },
  transports: [
    // Fichier pour toutes les erreurs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Fichier pour tous les logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Console en développement
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Helper pour logger les erreurs avec contexte
export function logError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    logger.error(error.message, {
      ...context,
      stack: error.stack,
      name: error.name,
    });
  } else {
    logger.error('Unknown error', { error, ...context });
  }
}

// Helper pour logger les requêtes HTTP
export function logRequest(req: any, duration?: number) {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    duration,
    userId: req.user?.userId,
    tenantId: req.user?.tenantId,
  });
}

export default logger;
```

**Remplacement dans le code existant** :

```typescript
// AVANT (apps/api/src/services/auth.service.ts:178-180)
console.log(`📧 [MOCK] Email verification sent to ${user.email}`);
console.log(`   Token: ${emailVerificationToken}`);
console.log(`   Verification URL: http://localhost:3000/auth/verify-email?token=${emailVerificationToken}`);

// APRÈS
import { logger } from '../utils/logger';

logger.info('Email verification sent', {
  email: user.email,
  userId: user.id,
  tenantId: user.tenant_id,
  verificationUrl: `http://localhost:3000/auth/verify-email?token=${emailVerificationToken}`,
});
```

```typescript
// AVANT (apps/api/src/index.ts:56)
console.log('✅ Database migrations completed');

// APRÈS
logger.info('Database migrations completed');
```

```typescript
// AVANT (apps/api/src/database/connection.ts:29)
console.error('Unexpected error on idle client', err);

// APRÈS
import { logError } from '../utils/logger';
logError(err, { context: 'database_pool_idle_client' });
```

**Fichier** : `apps/api/package.json` (ajouter dépendance)
```json
{
  "dependencies": {
    "winston": "^3.11.0"
  }
}
```

**Créer le dossier logs** :
```bash
mkdir -p apps/api/logs
echo "logs/" >> apps/api/.gitignore
```

---

## ⚠️ P1 - Actions Importantes

### 4. Configuration Centralisée avec Validation

**Fichier** : `apps/api/src/config/index.ts` (nouveau)

```typescript
import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Charger .env
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

// Schéma de validation
const configSchema = z.object({
  // Environnement
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Base de données
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().transform(Number).default('5432'),
  POSTGRES_USER: z.string().default('bmad'),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().default('bmad_stock_agent'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_EMAIL_VERIFICATION_EXPIRES_IN: z.string().default('24h'),
  JWT_PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),
  
  // ML Service
  ML_SERVICE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // GCP
  GCP_PROJECT_ID: z.string().optional(),
  GCP_REGION: z.string().default('europe-west1'),
  
  // Application
  APP_VERSION: z.string().default('0.1.0'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  RUN_MIGRATIONS_ON_STARTUP: z.string().transform(val => val !== 'false').default('true'),
});

// Valider et exporter la configuration
export type Config = z.infer<typeof configSchema>;

let config: Config;

try {
  config = configSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Configuration validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// Validation supplémentaire en production
if (config.NODE_ENV === 'production') {
  if (!config.DATABASE_URL && !config.POSTGRES_PASSWORD) {
    console.error('❌ DATABASE_URL or POSTGRES_PASSWORD must be set in production');
    process.exit(1);
  }
  
  if (config.JWT_SECRET.includes('fallback') || config.JWT_SECRET.includes('change')) {
    console.error('❌ JWT_SECRET must be changed in production');
    process.exit(1);
  }
}

export { config };

// Helper pour obtenir l'URL de la base de données
export function getDatabaseUrl(): string {
  if (config.DATABASE_URL) {
    return config.DATABASE_URL;
  }
  return `postgresql://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`;
}
```

**Utilisation dans le code** :

```typescript
// AVANT (apps/api/src/index.ts:22)
const PORT = process.env.PORT || 3000;

// APRÈS
import { config } from './config';
const PORT = config.PORT;
```

```typescript
// AVANT (apps/api/src/database/connection.ts:17-18)
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER || 'bmad'}:...`;

// APRÈS
import { getDatabaseUrl } from '../config';
const databaseUrl = getDatabaseUrl();
```

**Fichier** : `apps/api/package.json` (ajouter dépendance)
```json
{
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

---

### 5. Protection CSRF

**Fichier** : `apps/api/src/middleware/csrf.ts` (nouveau)

```typescript
import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// Configuration CSRF
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// Middleware pour ajouter le token CSRF dans les réponses
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  res.locals.csrfToken = req.csrfToken();
  next();
}

// Handler d'erreur CSRF
export function csrfErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
    });
    return;
  }
  next(err);
}
```

**Intégration dans `index.ts`** :
```typescript
// apps/api/src/index.ts (ajouter après la ligne 19)

import cookieParser from 'cookie-parser';
import { csrfProtection, csrfTokenMiddleware, csrfErrorHandler } from './middleware/csrf';

app.use(cookieParser());

// Endpoint pour obtenir le token CSRF
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Appliquer CSRF sur toutes les routes sauf GET/HEAD/OPTIONS
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  csrfProtection(req, res, next);
});

// ... routes ...

// Handler d'erreur CSRF (à la fin, avant le handler d'erreur global)
app.use(csrfErrorHandler);
```

**Fichier** : `apps/api/package.json` (ajouter dépendances)
```json
{
  "dependencies": {
    "csurf": "^1.11.0",
    "cookie-parser": "^1.4.6"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.6",
    "@types/csurf": "^1.11.5"
  }
}
```

**Test** :
```typescript
// apps/api/src/__tests__/csrf.test.ts
import request from 'supertest';
import app from '../index';

describe('CSRF Protection', () => {
  it('should require CSRF token for POST requests', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Invalid CSRF token');
  });
  
  it('should accept valid CSRF token', async () => {
    // 1. Obtenir le token CSRF
    const tokenResponse = await request(app).get('/csrf-token');
    const csrfToken = tokenResponse.body.csrfToken;
    const cookies = tokenResponse.headers['set-cookie'];
    
    // 2. Faire une requête POST avec le token
    const response = await request(app)
      .post('/auth/login')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).not.toBe(403);
  });
});
```

---

### 6. Tests E2E avec Playwright

**Fichier** : `e2e/playwright.config.ts` (nouveau)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Fichier** : `e2e/tests/auth-flow.spec.ts` (nouveau)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register a new user', async ({ page }) => {
    // 1. Obtenir le token CSRF
    const csrfResponse = await page.goto('http://localhost:3000/csrf-token');
    const csrfData = await csrfResponse?.json();
    const csrfToken = csrfData.csrfToken;
    
    // 2. S'inscrire
    const response = await page.request.post('http://localhost:3000/auth/register', {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
        company_name: `Test Company ${Date.now()}`,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.access_token).toBeDefined();
  });
  
  test('should login with valid credentials', async ({ page }) => {
    // Créer un utilisateur d'abord
    const email = `test-${Date.now()}@example.com`;
    const password = 'SecurePass123!';
    
    // ... (code d'inscription)
    
    // Se connecter
    const csrfResponse = await page.goto('http://localhost:3000/csrf-token');
    const csrfData = await csrfResponse?.json();
    
    const response = await page.request.post('http://localhost:3000/auth/login', {
      headers: {
        'X-CSRF-Token': csrfData.csrfToken,
      },
      data: { email, password },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.access_token).toBeDefined();
  });
  
  test('should reject invalid credentials', async ({ page }) => {
    const csrfResponse = await page.goto('http://localhost:3000/csrf-token');
    const csrfData = await csrfResponse?.json();
    
    const response = await page.request.post('http://localhost:3000/auth/login', {
      headers: {
        'X-CSRF-Token': csrfData.csrfToken,
      },
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      },
    });
    
    expect(response.status()).toBe(401);
  });
});
```

**Fichier** : `package.json` (ajouter scripts et dépendances)
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

**Installation** :
```bash
npm install -D @playwright/test
npx playwright install
```

---

## 📋 P2 - Actions Souhaitables

### 7. Documentation API avec Swagger

**Fichier** : `apps/api/src/swagger.ts` (nouveau)

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BMAD Stock Agent API',
      version: config.APP_VERSION,
      description: 'API de gestion de stocks pour PME avec IA prédictive',
      contact: {
        name: 'BMAD Team',
        email: 'support@bmad.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.bmad-stock-agent.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/services/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
```

**Ajouter des annotations dans les routes** :

```typescript
// apps/api/src/routes/auth.routes.ts

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - company_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               company_name:
 *                 type: string
 *                 example: Acme Corp
 *               industry:
 *                 type: string
 *                 example: retail
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [owner, admin, user]
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     expires_in:
 *                       type: number
 *                       example: 900
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already exists
 */
router.post('/register', registerRateLimiter, validateRegister, handleValidationErrors, async (req, res) => {
  // ...
});
```

**Intégration dans `index.ts`** :
```typescript
// apps/api/src/index.ts

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'BMAD Stock Agent API Docs',
}));

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
```

**Fichier** : `apps/api/package.json` (ajouter dépendances)
```json
{
  "dependencies": {
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.6"
  }
}
```

**Accès** : http://localhost:3000/api-docs

---

### 8. Tests de Charge avec k6

**Fichier** : `load-tests/auth-load.js` (nouveau)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métriques personnalisées
const errorRate = new Rate('errors');

// Configuration du test
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Montée en charge
    { duration: '1m', target: 50 },   // Charge stable
    { duration: '30s', target: 100 }, // Pic de charge
    { duration: '30s', target: 0 },   // Descente
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% des requêtes < 500ms
    http_req_failed: ['rate<0.01'],   // < 1% d'erreurs
    errors: ['rate<0.05'],            // < 5% d'erreurs métier
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Fonction pour obtenir un token CSRF
function getCsrfToken() {
  const res = http.get(`${BASE_URL}/csrf-token`);
  check(res, { 'CSRF token obtained': (r) => r.status === 200 });
  const cookies = res.cookies;
  const csrfToken = res.json('csrfToken');
  return { csrfToken, cookies };
}

export default function () {
  // 1. Obtenir le token CSRF
  const { csrfToken, cookies } = getCsrfToken();
  
  // 2. S'inscrire
  const email = `loadtest-${__VU}-${__ITER}@example.com`;
  const registerPayload = JSON.stringify({
    email,
    password: 'LoadTest123!',
    first_name: 'Load',
    last_name: 'Test',
    company_name: `LoadTest Company ${__VU}-${__ITER}`,
  });
  
  const registerParams = {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v[0].value}`).join('; '),
    },
  };
  
  const registerRes = http.post(`${BASE_URL}/auth/register`, registerPayload, registerParams);
  
  const registerSuccess = check(registerRes, {
    'register status 201': (r) => r.status === 201,
    'register has token': (r) => r.json('data.access_token') !== undefined,
  });
  
  errorRate.add(!registerSuccess);
  
  if (!registerSuccess) {
    console.error(`Registration failed: ${registerRes.status} ${registerRes.body}`);
    return;
  }
  
  const accessToken = registerRes.json('data.access_token');
  
  // 3. Accéder à /auth/me
  const meParams = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  const meRes = http.get(`${BASE_URL}/auth/me`, meParams);
  
  const meSuccess = check(meRes, {
    'me status 200': (r) => r.status === 200,
    'me has userId': (r) => r.json('data.userId') !== undefined,
  });
  
  errorRate.add(!meSuccess);
  
  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

**Fichier** : `load-tests/products-load.js` (nouveau)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN; // À fournir via -e ACCESS_TOKEN=...

export default function () {
  if (!ACCESS_TOKEN) {
    console.error('ACCESS_TOKEN environment variable is required');
    return;
  }
  
  const params = {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  
  // 1. Lister les produits
  const listRes = http.get(`${BASE_URL}/products?page=1&limit=20`, params);
  check(listRes, {
    'list status 200': (r) => r.status === 200,
    'list has data': (r) => r.json('data') !== undefined,
  });
  
  // 2. Créer un produit
  const createPayload = JSON.stringify({
    sku: `SKU-${__VU}-${__ITER}`,
    name: `Product ${__VU}-${__ITER}`,
    unit: 'piece',
    quantity: Math.floor(Math.random() * 100),
    min_quantity: 10,
  });
  
  const createRes = http.post(`${BASE_URL}/products`, createPayload, params);
  const createSuccess = check(createRes, {
    'create status 201': (r) => r.status === 201,
    'create has id': (r) => r.json('data.id') !== undefined,
  });
  
  errorRate.add(!createSuccess);
  
  if (createSuccess) {
    const productId = createRes.json('data.id');
    
    // 3. Récupérer le produit
    const getRes = http.get(`${BASE_URL}/products/${productId}`, params);
    check(getRes, {
      'get status 200': (r) => r.status === 200,
    });
  }
  
  sleep(1);
}
```

**Installation et exécution** :
```bash
# Installer k6 (macOS)
brew install k6

# Installer k6 (Windows)
choco install k6

# Exécuter le test
k6 run load-tests/auth-load.js

# Avec options
k6 run --vus 100 --duration 2m load-tests/auth-load.js

# Test produits (nécessite un token)
ACCESS_TOKEN="your-token-here" k6 run load-tests/products-load.js
```

---

## 📊 Checklist d'Implémentation

### P0 - Critique (Cette Semaine)
- [ ] Implémenter graceful shutdown (1h)
- [ ] Ajouter monitoring Prometheus (2h)
- [ ] Intégrer logging structuré Winston (2h)
- [ ] Tester en local avec Docker Compose (1h)

### P1 - Important (2 Semaines)
- [ ] Créer module de configuration centralisée (1h)
- [ ] Ajouter protection CSRF (2h)
- [ ] Configurer tests E2E Playwright (3h)
- [ ] Écrire 10 tests E2E de base (4h)

### P2 - Souhaitable (1 Mois)
- [ ] Générer documentation Swagger (3h)
- [ ] Annoter toutes les routes avec JSDoc (4h)
- [ ] Créer tests de charge k6 (2h)
- [ ] Exécuter tests de charge et optimiser (4h)

---

## 🎯 Résultats Attendus

Après implémentation de toutes les actions :

### Métriques de Qualité
- **Couverture de tests** : 85%+ (actuellement ~60%)
- **Temps de réponse P95** : < 300ms (actuellement ~200ms)
- **Disponibilité** : 99.9% (avec monitoring et alerting)
- **Sécurité** : Score A+ sur Mozilla Observatory

### Observabilité
- Logs structurés avec contexte (userId, tenantId, requestId)
- Métriques Prometheus exportées
- Dashboards Grafana pour monitoring
- Alertes configurées (latence, erreurs, saturation)

### Documentation
- API documentée avec Swagger/OpenAPI
- Runbooks pour incidents courants
- Guide de contribution
- Changelog maintenu

---

**Prochaine Étape** : Commencer par les actions P0 (critiques) cette semaine.

---

*Document créé le 1er février 2026*  
*Basé sur la revue de code complète du 1er février 2026*
