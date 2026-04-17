import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const API = 'https://matchday-5-1.onrender.com/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  // Initialize auth state from localStorage
  initAuth: () => {
    const token = localStorage.getItem('matchday_token');
    const user = localStorage.getItem('matchday_user');
    
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        set({ user: parsedUser, token });
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('matchday_token');
        localStorage.removeItem('matchday_user');
      }
    }
  },

  // Register new user
  register: async (userData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Save to localStorage
      localStorage.setItem('matchday_token', data.token);
      localStorage.setItem('matchday_user', JSON.stringify(data.user));

      set({ 
        user: data.user, 
        token: data.token, 
        isLoading: false 
      });

      return data;
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save to localStorage
      localStorage.setItem('matchday_token', data.token);
      localStorage.setItem('matchday_user', JSON.stringify(data.user));

      set({ 
        user: data.user, 
        token: data.token, 
        isLoading: false 
      });

      return data;
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('matchday_token');
    localStorage.removeItem('matchday_user');
    set({ 
      user: null, 
      token: null, 
      error: null 
    });
  },

  // Update user profile
  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    
    try {
      const { token } = get();
      
      const response = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed');
      }

      // Update localStorage
      localStorage.setItem('matchday_user', JSON.stringify(data));

      set({ 
        user: data, 
        isLoading: false 
      });

      return data;
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },

  // Search users by username
  searchUsers: async (query) => {
    try {
      const { token } = get();
      
      const response = await fetch(`${API}/auth/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Check if user has specific role
  hasRole: (role) => {
    const { user } = get();
    return user?.role === role;
  },

  // Check if user is admin
  isAdmin: () => get().hasRole('admin'),

  // Check if user is organizer
  isOrganizer: () => get().hasRole('organizer'),

  // Check if user is participant
  isParticipant: () => get().hasRole('participant'),
}));

export default useAuthStore;
