/**
 * Centralized API client.
 *
 * - Always sends cookies (`credentials: 'include'`) for the session.
 * - Parses JSON and surfaces a safe error message via `ApiError`.
 * - Emits an `auth:unauthorized` event on 401 so the app can redirect to login.
 */

export class ApiError extends Error {
  constructor(
    message,
    /** HTTP status code. */
    status,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(method, url, body, options = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json' },
    ...options,
  };

  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (res.status === 401) {
    // Notify the app to redirect to login (except for the auth endpoints).
    if (!url.includes('/api/auth/') && !url.includes('/api/setup/')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (isJson && data && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data;
}

export const api = {
  get: (url, options) => request('GET', url, undefined, options),
  post: (url, body, options) => request('POST', url, body, options),
  put: (url, body, options) => request('PUT', url, body, options),
  del: (url, options) => request('DELETE', url, undefined, options),
};

// ── Typed-ish helpers for the auth/setup flow ──
export const authApi = {
  me: () => api.get('/api/auth/me'),
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  logout: () => api.post('/api/auth/logout'),
};

export const setupApi = {
  status: () => api.get('/api/setup/status'),
  complete: (token, payload) =>
    api.post(`/api/setup/complete?token=${encodeURIComponent(token)}`, payload),
};
