const BASE = '/api';

let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${BASE}/csrf-token`, { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken();
}

export async function refreshCsrf(): Promise<void> {
  csrfToken = null;
  await fetchCsrfToken();
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {} } = opts;

  const token = localStorage.getItem('access_token');
  const reqHeaders: Record<string, string> = {
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    reqHeaders['CSRF-Token'] = await getCsrfToken();
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: reqHeaders,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 403) {
    const data = await res.json();
    if (data.error === 'Invalid CSRF token') {
      await refreshCsrf();
      reqHeaders['CSRF-Token'] = csrfToken!;
      const retry = await fetch(`${BASE}${path}`, {
        method,
        headers: reqHeaders,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retry.ok) {
        const errData = await retry.json().catch(() => ({}));
        throw new ApiError(retry.status, errData.error || 'Request failed', errData.details);
      }
      return retry.json();
    }
    throw new ApiError(403, data.error, data.details);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || 'Request failed', data.details);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
