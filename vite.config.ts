import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Spring Boot 서버 8080
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // '/api' 접두사 제거해야 Spring Boot가 올바르게 라우팅해야하는데
        //rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
