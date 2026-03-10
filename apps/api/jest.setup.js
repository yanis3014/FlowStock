/**
 * Load env before any test (and thus before config/connection are used).
 * 1. Load repo root .env (base).
 * 2. Load repo root .env.test if present (overrides for DB credentials etc.).
 * In CI, rely on injected environment variables from the workflow.
 * Ensures getDatabaseUrl() and test pools use the same DATABASE_URL.
 */
const path = require('path');
const root = path.resolve(__dirname, '../..');

if (!process.env.CI) {
  require('dotenv').config({ path: path.join(root, '.env') });
  require('dotenv').config({ path: path.join(root, '.env.test'), override: true });
}
