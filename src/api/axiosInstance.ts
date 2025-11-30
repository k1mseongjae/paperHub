// src/api/axiosInstance.ts

import axios from 'axios';

const axiosInstance = axios.create({
  // Vite dev 서버: /api -> proxy -> 백엔드(8080)
  // 배포 환경: VITE_API_URL 사용
  baseURL: import.meta.env.VITE_API_URL || '',
});

axiosInstance.interceptors.request.use(
  (config) => {
    // 'auth-storage' 대신 'authToken' 직접 사용
    const token = localStorage.getItem('authToken');

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
