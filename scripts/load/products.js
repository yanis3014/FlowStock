/**
 * k6 - Tests de charge sur les endpoints produits (avec auth).
 * Prérequis: API démarrée, base avec au moins un utilisateur/tenant.
 * Lancer: k6 run scripts/load/products.js
 * Avec compte existant: BASE_URL=... AUTH_EMAIL=... AUTH_PASSWORD=... k6 run scripts/load/products.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_EMAIL = __ENV.AUTH_EMAIL;
const AUTH_PASSWORD = __ENV.AUTH_PASSWORD;

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.2'],
  },
};

function getCsrfToken() {
  const res = http.get(`${BASE_URL}/csrf-token`);
  if (!check(res, { 'csrf 200': (r) => r.status === 200 })) return null;
  const body = JSON.parse(res.body);
  const cookie = res.headers['Set-Cookie'];
  return { token: body.csrfToken, cookie: cookie ? (Array.isArray(cookie) ? cookie.join('; ') : cookie) : '' };
}

function loginOrRegister(csrf) {
  if (AUTH_EMAIL && AUTH_PASSWORD) {
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: AUTH_EMAIL, password: AUTH_PASSWORD }), {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token, ...(csrf.cookie ? { Cookie: csrf.cookie } : {}) },
    });
    if (res.status === 200) return JSON.parse(res.body).data?.access_token;
    return null;
  }
  const payload = JSON.stringify({
    email: `products-load-${Date.now()}-${__VU}@example.com`,
    password: 'SecurePass123!',
    first_name: 'Load',
    last_name: 'User',
    company_name: `Products Load ${__VU}`,
  });
  const res = http.post(`${BASE_URL}/auth/register`, payload, {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token, ...(csrf.cookie ? { Cookie: csrf.cookie } : {}) },
  });
  if (res.status !== 201) return null;
  return JSON.parse(res.body).data?.access_token;
}

export default function () {
  const csrf = getCsrfToken();
  if (!csrf) {
    sleep(1);
    return;
  }

  const token = loginOrRegister(csrf);
  if (!token) {
    sleep(1);
    return;
  }

  const listRes = http.get(`${BASE_URL}/products?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(listRes, { 'GET /products 200': (r) => r.status === 200 });

  if (listRes.status === 200) {
    const data = JSON.parse(listRes.body);
    const items = data.data || [];
    if (items.length > 0 && items[0].id) {
      const getRes = http.get(`${BASE_URL}/products/${items[0].id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      check(getRes, { 'GET /products/:id 200': (r) => r.status === 200 });
    }
  }

  sleep(0.5);
}
