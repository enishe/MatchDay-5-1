/**
 * Bazë URL për API (pa slash në fund).
 * Parazgjedhja: `/api` (e njëjtë origjinë) — në dev Vite e proxy-n te porti 5000 (shiko vite.config.js).
 * Në prod me frontend të ndarë nga API, vendos VITE_API_URL (p.sh. https://api-xxx.onrender.com ose .../api).
 */
export function getApiBase() {
  if (import.meta.env.DEV) return 'http://localhost:5000/api';
  return 'https://matchday-5-1.onrender.com/api';
}

/**
 * @param {string} path - rrugë relative pas /api (p.sh. "/matches" ose "matches")
 * @param {{ token?: string, method?: string, body?: unknown, headers?: Record<string,string> }} [options]
 */
/** Përdoret edhe nga authStore për të njëjtën sjellje si apiFetch. */
export async function parseResponseJson(res) {
  const text = await res.text();
  try {
    return text && text.trim() ? JSON.parse(text) : {};
  } catch {
    return { _nonJson: text };
  }
}

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
    throw new Error('Nuk u arrit serveri. Kontrollo që API të jetë e ndezur.');
  }
  const data = await parseResponseJson(res);
  if (!res.ok) {
    const raw = data._nonJson;
    const msg =
      typeof data.error === 'string' && data.error.trim() !== ''
        ? data.error
        : typeof raw === 'string' && raw.trim() && !raw.trimStart().startsWith('<')
          ? raw.trim().slice(0, 200)
          : `Gabim ${res.status}`;
    throw new Error(msg);
  }
  if (data._nonJson !== undefined) {
    throw new Error('Përgjigje e pavlefshme nga serveri.');
  }
  return data;
}
