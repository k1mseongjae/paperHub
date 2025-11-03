import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  
  login: (token) => {
    localStorage.setItem('authToken', token); 
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ token: null, isAuthenticated: false });
  },

  initialize: () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },
}));