// src/api/axiosInstance.ts

import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080',
});

// 모든 API 요청이 보내지기 직전에 이 코드가 실행됩니다.
axiosInstance.interceptors.request.use(
  (config) => {
    // 1. 브라우저의 로컬 저장소에서 'auth-storage' 항목을 찾습니다.
    const authStorage = localStorage.getItem('auth-storage');
    let token = null;

    // 2. 항목이 존재하면,
    if (authStorage) {
      try {
        // 3. JSON 문자열을 객체로 변환합니다.
        const authState = JSON.parse(authStorage);
        
        // 4. ✨ Zustand의 구조에 맞춰 state 객체 안의 token을 꺼냅니다.
        token = authState?.state?.token;

      } catch (e) {
        console.error("Could not parse auth-storage from localStorage", e);
      }
    }

    // 5. 토큰이 성공적으로 꺼내졌다면 헤더에 추가합니다.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;