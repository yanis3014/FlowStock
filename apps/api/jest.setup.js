/**
 * Load env before any test (and thus before config/connection are used).
 * 1. Load repo root .env (base).
 * 2. Load repo root .env.test if present (overrides for DB credentials etc.).
 * In CI, rely on injected environment variables from the workflow.
 * Ensures getDatabaseUrl() and test pools use the same DATABASE_URL.
 */
const path = require('path');
const root = path.resolve(__dirname, '../..');
const apiRoot = path.resolve(__dirname, '.');

if (!process.env.CI) {
  require('dotenv').config({ path: path.join(root, '.env') });
  require('dotenv').config({ path: path.join(root, '.env.test'), override: true });
  // Load API-specific secrets (e.g., OPENAI_API_KEY) for local tests.
  require('dotenv').config({ path: path.join(apiRoot, '.env') });
}

// Square OAuth tests / chiffrement tokens (valeurs factices — jamais de vrai secret)
if (!process.env.TOKEN_ENCRYPTION_KEY) {
  process.env.TOKEN_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}
if (!process.env.SQUARE_APPLICATION_ID) {
  process.env.SQUARE_APPLICATION_ID = 'sandbox_sq0idb_test';
}
if (!process.env.SQUARE_APPLICATION_SECRET) {
  process.env.SQUARE_APPLICATION_SECRET = 'sandbox_test_secret';
}
if (!process.env.SQUARE_REDIRECT_URI) {
  process.env.SQUARE_REDIRECT_URI = 'http://127.0.0.1:3000/auth/square/callback';
}
if (!process.env.FRONTEND_APP_URL) {
  process.env.FRONTEND_APP_URL = 'http://localhost:3002';
}
