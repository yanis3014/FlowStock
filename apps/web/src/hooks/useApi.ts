'use client';

import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const LOGIN_REDIRECT = '/login';

function isAuthRoute(path: string): boolean {
  const p = (path || '').split('?')[0].replace(/^\//, '');
  return p.indexOf('auth/') === 0 || p === 'auth';
}

/** Body is replayable for CSRF retry. FormData cannot be replayed. */
function isBodyReplayable(body: unknown): boolean {
  if (body == null) return true;
  return typeof body === 'string';
}

export function useApi() {
  const { token, setToken } = useAuth();
  const csrfRef = useRef<string>('');

  const ensureCsrf = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const r = await fetch(`${apiUrl}/csrf-token`, { credentials: 'include' });
    if (!r.ok) throw new Error('Impossible d\'obtenir le token CSRF');
    const j = await r.json();
    csrfRef.current = (j?.csrfToken && String(j.csrfToken)) || '';
    return csrfRef.current;
  }, []);

  const fetchApi = useCallback(
    async (
      url: string,
      options: RequestInit & { timeoutMs?: number } = {}
    ): Promise<Response> => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      const method = (options.method || 'GET').toUpperCase();
      const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0
        ? options.timeoutMs
        : 30000;

      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (needsCsrf && csrfRef.current) headers.set('X-CSRF-Token', csrfRef.current);

      if (needsCsrf && !csrfRef.current) {
        await ensureCsrf();
        headers.set('X-CSRF-Token', csrfRef.current);
      }

      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (!options.signal) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }
      const signal = options.signal || controller.signal;

      let res: Response;
      try {
        res = await fetch(fullUrl, {
          ...options,
          headers,
          credentials: 'include',
          signal,
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      if (res.status === 403 && needsCsrf && isBodyReplayable(options.body)) {
        try {
          const j = await res.clone().json();
          if (j?.error && String(j.error).includes('CSRF')) {
            csrfRef.current = '';
            await ensureCsrf();
            headers.set('X-CSRF-Token', csrfRef.current);
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), timeoutMs);
            try {
              res = await fetch(fullUrl, {
                ...options,
                headers,
                credentials: 'include',
                signal: retryController.signal,
              });
            } finally {
              clearTimeout(retryTimeoutId);
            }
          }
        } catch {}
      }

      if (res.status === 401 || res.status === 403) {
        if (res.status === 403) {
          try {
            const j = await res.clone().json();
            if (j?.error && String(j.error).toLowerCase().includes('csrf')) {
              return res;
            }
          } catch {}
        }
        const path = (url || '').split('?')[0];
        if (!isAuthRoute(path)) {
          setToken(null);
          const returnUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '';
          const separator = LOGIN_REDIRECT.includes('?') ? '&' : '?';
          const redirect = `${LOGIN_REDIRECT}${separator}session_expired=1${returnUrl ? `&returnUrl=${returnUrl}` : ''}`;
          if (typeof window !== 'undefined') {
            window.location.href = redirect;
          }
        }
      }

      return res;
    },
    [token, setToken, ensureCsrf]
  );

  /** Appels API sans token (login, register, verify-email). Même client : CSRF, credentials, retry CSRF ; pas de 401/403 redirect. */
  const fetchApiGuest = useCallback(
    async (
      url: string,
      options: RequestInit & { timeoutMs?: number } = {}
    ): Promise<Response> => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      const method = (options.method || 'GET').toUpperCase();
      const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0
        ? options.timeoutMs
        : 30000;

      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      if (needsCsrf && csrfRef.current) headers.set('X-CSRF-Token', csrfRef.current);

      if (needsCsrf && !csrfRef.current) {
        await ensureCsrf();
        headers.set('X-CSRF-Token', csrfRef.current);
      }

      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (!options.signal) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }
      const signal = options.signal || controller.signal;

      let res: Response;
      try {
        res = await fetch(fullUrl, {
          ...options,
          headers,
          credentials: 'include',
          signal,
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      if (res.status === 403 && needsCsrf && isBodyReplayable(options.body)) {
        try {
          const j = await res.clone().json();
          if (j?.error && String(j.error).includes('CSRF')) {
            csrfRef.current = '';
            await ensureCsrf();
            headers.set('X-CSRF-Token', csrfRef.current);
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), timeoutMs);
            try {
              res = await fetch(fullUrl, {
                ...options,
                headers,
                credentials: 'include',
                signal: retryController.signal,
              });
            } finally {
              clearTimeout(retryTimeoutId);
            }
          }
        } catch {}
      }

      return res;
    },
    [ensureCsrf]
  );

  return { fetchApi, fetchApiGuest, token };
}
