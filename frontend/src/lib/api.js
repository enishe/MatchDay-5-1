/**
 * Base URL for REST API (no trailing slash).
 * Dev: leave unset → same-origin `/api` (Vite proxy → http://localhost:5000/api).
 * Prod: set VITE_API_URL to the API origin, e.g. https://your-host.com or http://localhost:5000
 *      (this helper ensures the path always ends with `/api` to match Express `app.use('/api', …)`).
 */
export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw != null && String(raw).trim() !== '') {
    const trimmed = String(raw).trim().replace(/\/+$/, '');
    try {
      const url = new URL(trimmed);
      const path = (url.pathname || '/').replace(/\/+$/, '') || '/';
      if (path === '/' ) {
        url.pathname = '/api';
      }
      return `${url.origin}${url.pathname}`.replace(/\/+$/, '') || `${url.origin}/api`;
    } catch {
      if (!trimmed.toLowerCase().endsWith('/api')) {
        return `${trimmed}/api`;
      }
      return trimmed;
    }
  }
  return '/api';
}

/**
 * @param {string} path - rrugë relative pas /api (p.sh. "/matches" ose "matches")
 * @param {{ token?: string, method?: string, body?: unknown, headers?: Record<string,string> }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { token, method = 'GET', body, headers = {} } = options;
  const p = path.startsWith('/') ? path : `/${path}`;
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined && body !== null && !h['Content-Type']) {
    h['Content-Type'] = 'application/json; charset=utf-8';
  }
  const res = await fetch(`${getApiBase()}${p}`, {
    method,
    headers: h,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gabim ${res.status}`);
  return data;
}
