/**
 * Vérifie l'email du compte demo directement en base.
 * Usage: node scripts/verify-demo-email.js
 * Prérequis: PostgreSQL accessible (docker compose up -d postgres)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const EMAIL = process.env.DEMO_EMAIL || 'demo@flowstock.local';

async function main() {
  const databaseUrl = process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5433'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();

    // Appliquer la migration si la fonction n'existe pas
    const checkFn = await client.query(
      "SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'dev_verify_email_by_address'"
    );
    if (checkFn.rows.length === 0) {
      const migrationPath = path.join(__dirname, '..', 'apps', 'api', 'migrations', 'V019__dev_verify_email_by_address.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await client.query(sql);
      console.log('Migration V019 appliquée.');
    }

    const res = await client.query('SELECT dev_verify_email_by_address($1) AS updated', [EMAIL]);
    const updated = res.rows[0]?.updated ?? 0;
    if (updated > 0) {
      console.log(`Email ${EMAIL} vérifié.`);
    } else {
      console.log(`Aucun utilisateur trouvé pour ${EMAIL}.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
