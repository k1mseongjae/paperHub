import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Spring Boot 서버 8080
    proxy: {
      '/api': {
        target: 'https://4999224c-8916-4d5c-9aa8-4d9495780de7.mock.pstmn.io',
        changeOrigin: true,
        // '/api' 접두사 제거해야 Spring Boot가 올바르게 라우팅해야하는데
        //rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})