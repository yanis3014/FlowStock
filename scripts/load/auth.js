/**
 * k6 - Tests de charge sur les endpoints d'authentification.
 * Flux: Register (201) -> Verify email (200) -> Login (200) -> Me (200).
 * CSRF : on envoie X-CSRF-Token + Cookie avec uniquement name=value (sans attributs).
 * Lancer: k6 run scripts/load/auth.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

/** Extrait uniquement le name=value du premier Set-Cookie (sans Path; HttpOnly; etc.) */
function parseCookieHeader(setCookie) {
  if (!setCookie) return '';
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const first = String(raw).split(';')[0].trim();
  return first || '';
}

function getCsrfToken() {
  const res = http.get(`${BASE_URL}/csrf-token`);
  if (!check(res, { 'csrf status 200': (r) => r.status === 200 })) return null;
  const body = JSON.parse(res.body);
  const cookieValue = parseCookieHeader(res.headers['Set-Cookie']);
  return { token: body.csrfToken, cookie: cookieValue };
}

function register(csrf, email, password) {
  const payload = JSON.stringify({
    email,
    password,
    first_name: 'Load',
    last_name: 'User',
    company_name: `Load Company ${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  });
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf.token,
  };
  if (csrf.cookie) headers['Cookie'] = csrf.cookie;
  return http.post(`${BASE_URL}/auth/register`, payload, { headers });
}

function verifyEmail(token) {
  return http.get(`${BASE_URL}/auth/verify-email?token=${token}`);
}

function login(email, password, csrf) {
  const payload = JSON.stringify({ email, password });
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf.token,
  };
  if (csrf.cookie) headers['Cookie'] = csrf.cookie;
  return http.post(`${BASE_URL}/auth/login`, payload, { headers });
}

function me(accessToken) {
  return http.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export default function () {
  const csrf = getCsrfToken();
  if (!csrf) {
    sleep(1);
    return;
  }

  const email = `load-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@test.com`;
  const password = 'SecurePass123!';

  const regRes = register(csrf, email, password);
  check(regRes, { 'register 201': (r) => r.status === 201 });
  if (regRes.status !== 201) {
    sleep(1);
    return;
  }

  const regData = JSON.parse(regRes.body);
  const verificationToken = regData.data?.email_verification_token;
  if (!verificationToken) {
    sleep(1);
    return;
  }

  const verifyRes = verifyEmail(verificationToken);
  check(verifyRes, { 'verify-email 200': (r) => r.status === 200 });
  if (verifyRes.status !== 200) {
    sleep(1);
    return;
  }

  const loginRes = login(email, password, csrf);
  check(loginRes, { 'login 200': (r) => r.status === 200 });
  if (loginRes.status !== 200) {
    sleep(1);
    return;
  }

  const loginData = JSON.parse(loginRes.body);
  const accessToken = loginData.data?.access_token;
  if (accessToken) {
    const meRes = me(accessToken);
    check(meRes, { 'auth/me 200': (r) => r.status === 200 });
  }

  sleep(0.5);
}
