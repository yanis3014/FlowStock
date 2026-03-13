/**
 * Crée un utilisateur de test via l'API.
 * Usage: node scripts/create-user.js
 * Prérequis: API sur http://localhost:3000 (npm run dev)
 */
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const url = new URL(API_URL);

const USER = {
  email: 'demo@flowstock.local',
  password: 'Demo1234!',
  first_name: 'Demo',
  last_name: 'Utilisateur',
  company_name: 'Restaurant Demo',
};

function parseCookie(setCookie) {
  if (!setCookie) return '';
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return String(raw).split(';')[0].trim();
}

function request(method, path, body, cookie, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: path,
      method,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
    };
    if (cookie) opts.headers['Cookie'] = cookie;
    if (body && method !== 'GET') opts.headers['Content-Length'] = Buffer.byteLength(body);

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        resolve({
          status: res.statusCode,
          body: data,
          cookie: setCookie ? parseCookie(setCookie) : null,
        });
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout connexion API'));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function verifyEmailDev(email, cookie, csrfToken) {
  const res = await request('POST', '/auth/dev/verify-email', JSON.stringify({ email }), cookie, {
    'X-CSRF-Token': csrfToken,
  });
  if (res.status !== 200) {
    console.warn('Vérification email (dev) échouée:', res.status, res.body);
  }
}

async function createUser() {
  console.log('Création utilisateur:', USER.email);
  console.log('API:', API_URL);

  // 1. CSRF
  const csrfRes = await request('GET', '/csrf-token');
  if (csrfRes.status !== 200) throw new Error(`CSRF failed: ${csrfRes.status} - ${csrfRes.body}`);
  const csrfData = JSON.parse(csrfRes.body || '{}');
  const csrfToken = csrfData.csrfToken;
  if (!csrfToken) throw new Error('Pas de token CSRF dans la réponse');
  const cookie = csrfRes.cookie;

  // 2. Register
  const regRes = await request('POST', '/auth/register', JSON.stringify(USER), cookie, {
    'X-CSRF-Token': csrfToken,
  });
  let regData = {};
  try {
    regData = JSON.parse(regRes.body || '{}');
  } catch (_) {
    regData = { error: regRes.body };
  }

  if (regRes.status === 201) {
    const verifyToken = regData?.data?.email_verification_token;
    if (verifyToken) {
      const verifyRes = await request('GET', `/auth/verify-email?token=${encodeURIComponent(verifyToken)}`, null, cookie);
      if (verifyRes.status !== 200) {
        await verifyEmailDev(USER.email, cookie, csrfToken);
      }
    } else {
      await verifyEmailDev(USER.email, cookie, csrfToken);
    }
    console.log('\n--- Utilisateur créé ---');
    console.log('Email:', USER.email);
    console.log('Mot de passe:', USER.password);
    console.log('\nSi la vérification email a échoué (API en Docker/production), exécutez: npm run verify-demo-email');
    console.log('Puis connectez-vous sur http://localhost:3002/login');
    return;
  }

  if (regRes.status === 409 || (regData?.error || '').toLowerCase().includes('exist')) {
    await verifyEmailDev(USER.email, cookie, csrfToken);
    console.log('\n--- Utilisateur existe déjà (email vérifié) ---');
    console.log('Email:', USER.email);
    console.log('Mot de passe:', USER.password);
    console.log('\nConnectez-vous sur http://localhost:3002/login');
    return;
  }

  throw new Error(`Inscription échouée: ${regRes.status} - ${regData?.error || regRes.body}`);
}

createUser().catch((err) => {
  console.error('Erreur:', err?.message || err?.code || String(err));
  process.exit(1);
});
