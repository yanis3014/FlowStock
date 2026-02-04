/**
 * Load project root .env before any test (and thus before config/connection are used).
 * Ensures getDatabaseUrl() and test pools use the same DATABASE_URL.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
