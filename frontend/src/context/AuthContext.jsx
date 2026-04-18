import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { getApiBase } from '../lib/api';

const AuthContext = createContext(null);

const STORAGE_USER = 'matchday_user';
const STORAGE_TOKEN = 'matchday_token';
const STORAGE_THEME = 'matchday_theme';

const MSG_LOGIN_FAIL = 'Kyçja dështoi';
const MSG_REGISTER_FAIL = 'Regjistrimi dështoi';

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
        const m = 'Nuk u arrit serveri. Kontrollo që backend-i të jetë i ndezur.';
        setError(m);
        throw new Error(m);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverMsg =
          typeof data.error === 'string' && data.error.trim() !== ''
            ? data.error
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
        const m = 'Nuk u arrit serveri. Kontrollo që backend-i të jetë i ndezur.';
        setError(m);
        throw new Error(m);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverMsg =
          typeof data.error === 'string' && data.error.trim() !== ''
            ? data.error
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
  }, []);

  const refreshUser = useCallback(() => {
    setUser(readStoredUser());
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
      isAdmin: user?.role === 'admin',
    }),
    [user, token, isLoading, error, login, register, logout, refreshUser, authHeader]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth duhet përdorur brenda AuthProvider');
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
