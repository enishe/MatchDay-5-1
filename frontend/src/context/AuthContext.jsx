import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getApiBase } from '../lib/api';
import useAuthStore from '../store/authStore';

function syncZustandAuth() {
  try {
    useAuthStore.getState().initAuth();
  } catch {
    /* zustand opsionale */
  }
}

const AuthContext = createContext(null);

const STORAGE_USER = 'matchday_user';
const STORAGE_TOKEN = 'matchday_token';
const STORAGE_THEME = 'matchday_theme';

const MSG_LOGIN_FAIL = 'Ky\u00e7ja d\u00ebshtoi';
const MSG_REGISTER_FAIL = 'Regjistrimi d\u00ebshtoi';

/** Lexon p\u00ebrgjigjen JSON ose kthen mesazh nga trupi jo-JSON (p.sh. HTML nga proxy). */
async function readJsonResponse(res) {
  const text = await res.text();
  let data = {};
  try {
    data = text && text.trim() ? JSON.parse(text) : {};
  } catch {
    return { data: {}, raw: text };
  }
  return { data, raw: text };
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredToken() {
  return localStorage.getItem(STORAGE_TOKEN);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [token, setToken] = useState(() => readStoredToken());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    const base = getApiBase();
    try {
      let res;
      try {
        res = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ email, password }),
        });
      } catch {
        const m = 'Nuk u arrit serveri. Nis backend-in (port 5000) dhe rifresko faqen.';
        setError(m);
        throw new Error(m);
      }
      const { data, raw } = await readJsonResponse(res);
      if (!res.ok) {
        const serverMsg =
          typeof data.error === 'string' && data.error.trim() !== ''
            ? data.error
            : raw && raw.trim().length > 0 && !raw.trimStart().startsWith('<')
              ? raw.trim().slice(0, 200)
              : MSG_LOGIN_FAIL;
        throw new Error(serverMsg);
      }
      if (!data.token || !data.user) {
        throw new Error(MSG_LOGIN_FAIL);
      }
      localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
      localStorage.setItem(STORAGE_TOKEN, data.token);
      setUser(data.user);
      setToken(data.token);
      syncZustandAuth();
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : MSG_LOGIN_FAIL;
      setError(msg);
      throw e instanceof Error ? e : new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    const base = getApiBase();
    try {
      let res;
      try {
        res = await fetch(`${base}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(payload),
        });
      } catch {
        const m = 'Nuk u arrit serveri. Nis backend-in (port 5000) dhe rifresko faqen.';
        setError(m);
        throw new Error(m);
      }
      const { data, raw } = await readJsonResponse(res);
      if (!res.ok) {
        const serverMsg =
          typeof data.error === 'string' && data.error.trim() !== ''
            ? data.error
            : raw && raw.trim().length > 0 && !raw.trimStart().startsWith('<')
              ? raw.trim().slice(0, 200)
              : MSG_REGISTER_FAIL;
        throw new Error(serverMsg);
      }
      if (!data.token || !data.user) {
        throw new Error(MSG_REGISTER_FAIL);
      }
      localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
      localStorage.setItem(STORAGE_TOKEN, data.token);
      setUser(data.user);
      setToken(data.token);
      syncZustandAuth();
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : MSG_REGISTER_FAIL;
      setError(msg);
      throw e instanceof Error ? e : new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    setUser(null);
    setToken(null);
    setError(null);
    syncZustandAuth();
  }, []);

  const refreshUser = useCallback(() => {
    setUser(readStoredUser());
    syncZustandAuth();
  }, []);

  useEffect(() => {
    if (!token) return;
    const base = getApiBase();
    fetch(`${base}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.valid || !data?.user) {
          localStorage.removeItem(STORAGE_USER);
          localStorage.removeItem(STORAGE_TOKEN);
          setUser(null);
          setToken(null);
          syncZustandAuth();
          return;
        }
        if (data.user.id !== user?.id || data.user.role !== user?.role) {
          localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
          setUser(data.user);
          syncZustandAuth();
        }
      })
      .catch(() => {
        // Keep existing session on transient network errors.
      });
    // Run once on initial mount to validate restored session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeader = useCallback(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
      setError,
      authHeader,
      isAdmin: user?.role === 'admin' || user?.role === 'field_admin',
      isSuperAdmin: user?.role === 'superadmin',
      isFieldAdmin: user?.role === 'field_admin',
      isStaffAdmin:
        user?.role === 'admin' ||
        user?.role === 'field_admin' ||
        user?.role === 'superadmin',
    }),
    [user, token, isLoading, error, login, register, logout, refreshUser, authHeader]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth duhet p\u00ebrdorur brenda AuthProvider');
  }
  return ctx;
}

export function initThemeFromStorage() {
  const t = localStorage.getItem(STORAGE_THEME) || 'light';
  document.documentElement.setAttribute('data-theme', t);
}

export function toggleTheme() {
  const next =
    document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'light'
      : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_THEME, next);
}

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_THEME) || 'light';
}
