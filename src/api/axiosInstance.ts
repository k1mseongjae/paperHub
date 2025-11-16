// src/api/axiosInstance.ts

import axios from 'axios';

const axiosInstance = axios.create({
  // Vite dev 서버에서는 /api 요청이 proxy를 통해 백엔드(8080)으로 전달되고,
  // 배포 환경에서는 프론트와 백엔드를 같은 도메인에서 서빙한다는 가정으로
  // 절대 URL이 아닌 상대 경로를 사용합니다.
  baseURL: '',
});

axiosInstance.interceptors.request.use(
  (config) => {
    // 수정된 부분: 'auth-storage' 대신 'authToken'을 직접 가져옵니다.
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
