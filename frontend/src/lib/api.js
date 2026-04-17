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
