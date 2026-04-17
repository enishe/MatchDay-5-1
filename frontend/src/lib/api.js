/**
 * Base URL for REST API (no trailing slash).
 * Dev: leave unset to use same-origin `/api` (Vite proxy → backend).
 * Prod: set VITE_API_URL if API is on another host.
 */
export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '');
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
    h['Content-Type'] = 'application/json';
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
