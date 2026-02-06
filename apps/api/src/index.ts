import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { runMigrations } from './database/migrations';
import { closeDatabase } from './database/connection';
import { config } from './config';
import { validateJwtSecret } from './utils/jwt';
import { logger, logError } from './utils/logger';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { csrfProtection, csrfErrorHandler } from './middleware/csrf';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes';
import subscriptionRoutes from './routes/subscription.routes';
import productRoutes from './routes/product.routes';
import locationRoutes from './routes/location.routes';
import supplierRoutes from './routes/supplier.routes';
import salesRoutes from './routes/sales.routes';
import formulaRoutes from './routes/formula.routes';
import stockEstimateRoutes from './routes/stock-estimate.routes';
import { openApiDocument } from './openapi/spec';
import type { HealthResponse } from '@bmad/shared';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(metricsMiddleware);

const PORT = config.PORT;
const appVersion = config.APP_VERSION;

app.get('/health', (_req, res) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'bmad-stock-agent-api',
    version: appVersion,
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(body);
});

app.get('/metrics', metricsHandler);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get('/api-docs/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(openApiDocument, null, 2));
});

app.get('/csrf-token', (req, res, next) => {
  if (config.NODE_ENV === 'test') return res.json({ csrfToken: 'test-token' });
  csrfProtection(req, res, (err) => {
    if (err) return next(err);
    res.json({ csrfToken: (req as express.Request & { csrfToken: () => string }).csrfToken() });
  });
});

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (config.NODE_ENV === 'test') return next();
  csrfProtection(req, res, next);
});

app.use('/auth', authRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/products', productRoutes);
app.use('/locations', locationRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/sales', salesRoutes);
app.use('/formulas', formulaRoutes);
app.use('/stock-estimates', stockEstimateRoutes);

// Story 2.2: Import stocks page
app.get('/import-stocks', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'import-stocks.html'));
});

// Story 2.3: Locations (emplacements) page
app.get('/locations-page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'locations.html'));
});

// Story 2.4: Stock movements history page
app.get('/movements-page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'movements.html'));
});

// Story 2.5: Suppliers (fournisseurs) page
app.get('/suppliers-page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'suppliers.html'));
});

// Story 3.1: Sales (ventes) page
app.get('/sales-page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'sales.html'));
});

// Story 3.2: Import sales page
app.get('/import-sales', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'import-sales.html'));
});

// Story 3.3: Formulas (formules prédéfinies) page
app.get('/formulas-page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'formulas.html'));
});

// Story 3.4: Custom formulas (formules personnalisées) page
app.get('/custom-formulas-page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'custom-formulas.html'));
});

// Story 3.5: Stock estimates (estimations temps stock) page
app.get('/stock-estimates-page', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'stock-estimates.html'));
});

app.use(csrfErrorHandler);

// Global error handler (multer fileFilter, etc.) — returns JSON for API clients
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = message.includes('CSRF') ? 403 : message.includes('file') || message.includes('allowed') ? 400 : 500;
  if (!res.headersSent) {
    res.status(status).json({ success: false, error: message });
  }
});

let server: ReturnType<typeof app.listen> | null = null;

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
    server = null;
  }

  try {
    await closeDatabase();
    logger.info('Database connections closed');
  } catch (error) {
    logError(error, { context: 'graceful_shutdown_database' });
  }

  process.exit(0);
}

if (require.main === module) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logError(error, { context: 'uncaughtException' });
    void gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection', { reason, promise: String(promise) });
    void gracefulShutdown('UNHANDLED_REJECTION');
  });

  if (config.RUN_MIGRATIONS_ON_STARTUP) {
    runMigrations()
      .then(() => {
        logger.info('Database migrations completed');
        startServer();
      })
      .catch((error) => {
        logError(error, { context: 'migrations_startup' });
        if (config.NODE_ENV === 'production') {
          process.exit(1);
        } else {
          logger.warn('Starting server despite migration errors (development mode)');
          startServer();
        }
      });
  } else {
    startServer();
  }
}

function startServer(): void {
  validateJwtSecret();
  server = app.listen(PORT, () => {
    logger.info(`API server listening on http://localhost:${PORT}`);
  });
}

export default app;

