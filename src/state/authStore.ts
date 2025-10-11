// src/state/authStore.ts

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
    // localStorage에 'authToken' 키로 저장
    localStorage.setItem('authToken', token); 
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ token: null, isAuthenticated: false });
  },

  // 이 함수를 다시 추가하고 채워주세요!
  initialize: () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },
}));