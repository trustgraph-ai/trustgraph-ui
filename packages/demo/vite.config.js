import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  server: {
    host: true,
    proxy: {
      "/api/v1": {
        target: "http://localhost:8088/",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
