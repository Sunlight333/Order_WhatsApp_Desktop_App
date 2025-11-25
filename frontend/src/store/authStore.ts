import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, AuthState } from '../types/auth';
import api from '../lib/api';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true });
          
          const response = await api.post<{
            success: true;
            data: {
              user: User;
              token: string;
            };
            message: string;
          }>('/auth/login', credentials);

          const { user, token } = response.data.data;

          // Store token
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint (optional)
          await api.post('/auth/logout');
        } catch (error) {
          // Ignore logout errors
          console.error('Logout error:', error);
        } finally {
          // Clear local storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });

          const token = localStorage.getItem('auth_token');
          if (!token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          // Verify token by calling /me endpoint
          const response = await api.get<{
            success: true;
            data: User;
          }>('/auth/me');

          const user = response.data.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token invalid, clear auth
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

