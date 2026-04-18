import { create } from 'zustand';
import { getApiBase, parseResponseJson } from '../lib/api';

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }
  const token = localStorage.getItem('matchday_token');
  const userRaw = localStorage.getItem('matchday_user');
  if (token && userRaw) {
    try {
      return { user: JSON.parse(userRaw), token };
    } catch {
      localStorage.removeItem('matchday_token');
      localStorage.removeItem('matchday_user');
    }
  }
  return { user: null, token: null };
}

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  authHydrated: false,

  initAuth: () => {
    const { user, token } = readStoredAuth();
    set({ user, token, authHydrated: true });
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    const API = getApiBase();

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(userData),
      });

      const data = await parseResponseJson(response);

      if (!response.ok) {
        const raw = data._nonJson;
        throw new Error(
          typeof data.error === 'string' && data.error.trim()
            ? data.error
            : typeof raw === 'string' && raw.trim() && !raw.trimStart().startsWith('<')
              ? raw.trim().slice(0, 200)
              : 'Regjistrimi dështoi'
        );
      }

      localStorage.setItem('matchday_token', data.token);
      localStorage.setItem('matchday_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isLoading: false,
        authHydrated: true,
      });

      return data;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const API = getApiBase();

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseResponseJson(response);

      if (!response.ok) {
        const raw = data._nonJson;
        throw new Error(
          typeof data.error === 'string' && data.error.trim()
            ? data.error
            : typeof raw === 'string' && raw.trim() && !raw.trimStart().startsWith('<')
              ? raw.trim().slice(0, 200)
              : 'Kyçja dështoi'
        );
      }

      localStorage.setItem('matchday_token', data.token);
      localStorage.setItem('matchday_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        isLoading: false,
        authHydrated: true,
      });

      return data;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('matchday_token');
    localStorage.removeItem('matchday_user');
    set({
      user: null,
      token: null,
      error: null,
      authHydrated: true,
    });
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    const API = getApiBase();

    try {
      const { token } = get();

      const response = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await parseResponseJson(response);

      if (!response.ok) {
        const raw = data._nonJson;
        throw new Error(
          typeof data.error === 'string' && data.error.trim()
            ? data.error
            : typeof raw === 'string' && raw.trim() && !raw.trimStart().startsWith('<')
              ? raw.trim().slice(0, 200)
              : 'Përditësimi dështoi'
        );
      }

      localStorage.setItem('matchday_user', JSON.stringify(data));

      set({
        user: data,
        isLoading: false,
      });

      return data;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  searchUsers: async (query) => {
    const API = getApiBase();
    try {
      const { token } = get();

      const response = await fetch(`${API}/auth/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseJson(response);

      if (!response.ok) {
        const raw = data._nonJson;
        throw new Error(
          typeof data.error === 'string' && data.error.trim()
            ? data.error
            : typeof raw === 'string' && raw.trim() && !raw.trimStart().startsWith('<')
              ? raw.trim().slice(0, 200)
              : 'Kërkimi dështoi'
        );
      }

      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  hasRole: (role) => {
    const { user } = get();
    return user?.role === role;
  },

  isAdmin: () => get().hasRole('admin'),

  isOrganizer: () => get().hasRole('organizer'),

  isParticipant: () => {
    const { user } = get();
    return user?.role === 'participant' || user?.role === 'player';
  },
}));

export default useAuthStore;
