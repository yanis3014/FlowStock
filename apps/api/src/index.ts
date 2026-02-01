import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runMigrations } from './database/migrations';
import { validateJwtSecret } from './utils/jwt';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 3000;

// Read version from package.json
let appVersion = '0.1.0';
try {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf-8')
  );
  appVersion = packageJson.version || process.env.APP_VERSION || '0.1.0';
} catch (error) {
  // Fallback to env or default
  appVersion = process.env.APP_VERSION || '0.1.0';
}

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'bmad-stock-agent-api',
    version: appVersion,
    timestamp: new Date().toISOString()
  });
});

// Auth routes
import authRoutes from './routes/auth.routes';
app.use('/auth', authRoutes);

// TODO: plug routers for /api/products, /api/sales, /api/orders, /api/invoices, /api/ml, etc.

if (require.main === module) {
  // Run migrations on startup (in production, migrations should be run separately)
  // For development, this is convenient
  if (process.env.RUN_MIGRATIONS_ON_STARTUP !== 'false') {
    runMigrations()
      .then(() => {
        console.log('✅ Database migrations completed');
        startServer();
      })
      .catch((error) => {
        console.error('❌ Migration error:', error);
        // In production, fail fast if migrations fail
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        } else {
          // In development, start server anyway (migrations might have already run)
          console.warn('⚠️ Starting server despite migration errors (development mode)');
          startServer();
        }
      });
  } else {
    startServer();
  }
}

function startServer() {
  validateJwtSecret();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

export default app;

