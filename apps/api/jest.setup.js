/**
 * Load root env files before any test so all DB consumers
 * (config, migrations, pools) resolve the same connection settings.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
const envTestPath = path.resolve(__dirname, '../../.env.test');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// In test mode, .env.test must win over .env.
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
}
