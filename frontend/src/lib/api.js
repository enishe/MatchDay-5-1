/**
 * Bazë URL për API (pa slash në fund).
 * Development: http://localhost:5000/api
 * Production: vendos VITE_API_URL me origjinën e Render-it (p.sh. https://matchday-api.onrender.com)
 *             — path-i përfundon gjithmonë me /api.
 */
export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw != null && String(raw).trim() !== '') {
    const trimmed = String(raw).trim().replace(/\/+$/, '');
    try {
      const url = new URL(trimmed);
      const path = (url.pathname || '/').replace(/\/+$/, '') || '/';
      if (path === '/') {
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
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
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
  if (body !== undefined && body != null && !h['Content-Type']) {
    h['Content-Type'] = 'application/json; charset=utf-8';
  }
  let res;
  try {
    res = await fetch(`${getApiBase()}${p}`, {
      method,
      headers: h,
      body: body !== undefined && body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Nuk u arrit serveri. Kontrollo lidhjen.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data.error === 'string' && data.error.trim() !== '' ? data.error : `Gabim ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
