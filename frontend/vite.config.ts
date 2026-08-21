import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
      // Only proxy the Google OAuth start — NOT /auth/callback
      '/auth/google': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})