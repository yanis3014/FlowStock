/**
 * Client API partagé : injecte JWT + CSRF + credentials sur toutes les requêtes.
 * URLs relatives à l'origine (base ''). Pour un préfixe (ex. /api), utiliser BmadApiClient.setBaseUrl('/api').
 * Usage : BmadApiClient.setTokenGetter(() => BmadApiClient.loadTokenFromStorage());
 *         BmadApiClient.fetch('/locations', { method: 'POST', body: JSON.stringify({...}) });
 */
(function () {
  'use strict';

  /** Base URL des appels API (vide = relative à l'origine). */
  let apiBase = '';
  const JWT_STORAGE_KEY = 'bmad_jwt_token';
  const CSRF_HEADER = 'X-CSRF-Token';
  /** Timeout par défaut des requêtes (ms). En cas de dépassement, la requête est annulée. */
  const DEFAULT_FETCH_TIMEOUT_MS = 30000;

  let tokenGetter = null;
  let csrfToken = '';
  /** URL de redirection en cas de 401/403 (hors routes auth). */
  let loginRedirectUrl = '/login.html';
  /** Callback optionnelle en cas d'erreur auth ; si absente, redirection vers loginRedirectUrl. */
  let onAuthError = null;

  function getBaseUrl() {
    return apiBase;
  }

  function setBaseUrl(url) {
    apiBase = typeof url === 'string' ? url : '';
  }

  function extractJWT(raw) {
    if (!raw || typeof raw !== 'string') return '';
    raw = raw.trim();
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.access_token) return String(parsed.access_token).trim();
    } catch (_) {}
    const jwtMatch = raw.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (jwtMatch) return jwtMatch[0];
    return raw;
  }

  function getToken() {
    const raw = tokenGetter ? tokenGetter() : '';
    return extractJWT(raw);
  }

  async function ensureCsrf() {
    const r = await fetch(apiBase + '/csrf-token', { credentials: 'include' });
    if (!r.ok) throw new Error('Impossible d\'obtenir le token CSRF');
    try {
      const j = await r.json();
      csrfToken = (j && j.csrfToken) ? String(j.csrfToken) : '';
    } catch (_) {
      throw new Error('Réponse CSRF invalide');
    }
  }

  /**
   * Body is safe to replay on retry (string, or no body). Stream/FormData must not be retried.
   */
  function isBodyReplayable(body) {
    if (body == null) return true;
    return typeof body === 'string';
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    const method = (options.method || 'GET').toUpperCase();
    const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_FETCH_TIMEOUT_MS;

    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', 'Bearer ' + token);
    if (needsCsrf && csrfToken) headers.set(CSRF_HEADER, csrfToken);

    const fetchOpts = {
      ...options,
      headers,
      credentials: 'include',
    };

    if (needsCsrf && !csrfToken) {
      await ensureCsrf();
      headers.set(CSRF_HEADER, csrfToken);
    }

    const controller = new AbortController();
    let timeoutId;
    if (!options.signal) {
      timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs);
    }
    const signal = options.signal || controller.signal;

    let res;
    try {
      res = await fetch(apiBase + url, { ...fetchOpts, signal });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (res.status === 403 && needsCsrf && isBodyReplayable(options.body)) {
      try {
        const j = await res.clone().json();
        if (j && j.error && String(j.error).includes('CSRF')) {
          csrfToken = '';
          await ensureCsrf();
          headers.set(CSRF_HEADER, csrfToken);
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(function () { retryController.abort(); }, timeoutMs);
          try {
            res = await fetch(apiBase + url, { ...fetchOpts, headers, signal: retryController.signal });
          } finally {
            clearTimeout(retryTimeoutId);
          }
        }
      } catch (_) {}
    }

    // 401/403 → redirection login (sauf sur les routes auth) — spec §2.2 Résilience
    if (res.status === 401 || res.status === 403) {
      var path = (url || '').split('?')[0].replace(/^\//, '');
      var isAuthRoute = path.indexOf('auth/') === 0 || path === 'auth';
      if (!isAuthRoute) {
        saveTokenToStorage('');
        if (typeof onAuthError === 'function') {
          onAuthError(res);
        } else {
          window.location.href = loginRedirectUrl || '/login.html';
        }
      }
    }

    return res;
  }

  function saveTokenToStorage(value) {
    try {
      if (value) localStorage.setItem(JWT_STORAGE_KEY, value);
      else localStorage.removeItem(JWT_STORAGE_KEY);
    } catch (_) {}
  }

  function loadTokenFromStorage() {
    try {
      return localStorage.getItem(JWT_STORAGE_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  window.BmadApiClient = {
    setTokenGetter: function (fn) { tokenGetter = fn; },
    getToken: getToken,
    extractJWT: extractJWT,
    fetch: apiFetch,
    ensureCsrf: ensureCsrf,
    saveTokenToStorage: saveTokenToStorage,
    loadTokenFromStorage: loadTokenFromStorage,
    getCsrfToken: function () { return csrfToken; },
    getBaseUrl: getBaseUrl,
    setBaseUrl: setBaseUrl,
    /** Définit l\'URL de redirection en cas de 401/403 (défaut: /login.html). */
    setLoginRedirectUrl: function (url) { loginRedirectUrl = typeof url === 'string' ? url : '/login.html'; },
    /** Définit un callback appelé en cas de 401/403 (reçoit la Response). Si non défini, redirection vers loginRedirectUrl. */
    setOnAuthError: function (fn) { onAuthError = typeof fn === 'function' ? fn : null; },
  };
})();
