import axios from 'axios';
import { useAuthStore } from '../state/authStore';

const axiosInstance = axios.create({
  baseURL: '/', // Vite 프록시가 /api 경로를 가로챕니다.
});

// 모든 API 요청이 보내지기 전에 이 코드가 먼저 실행됩니다.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
