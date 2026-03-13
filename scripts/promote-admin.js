/**
 * Donne le rôle admin à un utilisateur existant (par email).
 * Usage: node scripts/promote-admin.js [email]
 * Exemple: node scripts/promote-admin.js demo@flowstock.local
 * Prérequis: .env avec DATABASE_URL (ou POSTGRES_*) et utilisateur déjà créé.
 */
const { resolve } = require('path');
require('dotenv').config({ path: resolve(process.cwd(), '.env') });
const { Pool } = require('pg');

const email = process.argv[2] || 'demo@flowstock.local';

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'bmad'}:${process.env.POSTGRES_PASSWORD || 'bmad'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'bmad_stock_agent'}`;

async function promoteAdmin() {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const userRes = await pool.query('SELECT id, tenant_id FROM get_user_by_email_for_login($1)', [
      email,
    ]);
    if (userRes.rows.length === 0) {
      console.error(`Utilisateur non trouvé: ${email}`);
      console.error('Créez d\'abord l\'utilisateur avec: node scripts/create-user.js');
      process.exit(1);
    }
    const { id, tenant_id } = userRes.rows[0];
    await pool.query('SELECT set_tenant_context($1::uuid)', [tenant_id]);
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', id]);
    console.log(`Rôle admin attribué à: ${email}`);
    console.log('Connectez-vous sur http://localhost:3002/admin/login');
  } finally {
    await pool.end();
  }
}

promoteAdmin().catch((err) => {
  console.error('Erreur:', err?.message || err);
  process.exit(1);
});
