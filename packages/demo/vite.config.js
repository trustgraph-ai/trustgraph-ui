import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  server: {
    proxy: {
      "/api/socket": {
        target: "ws://localhost:8088/",
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path.replace("/api/socket", "/api/v1/socket"),
      },
      "/api/export-core": {
        target: "http://localhost:8088/",
        changeOrigin: true,
        secure: false,
        rewrite: (x) => x.replace("/api/export-core", "/api/v1/export-core"),
      },
      "/api/import-core": {
        target: "http://localhost:8088/",
        changeOrigin: true,
        secure: false,
        rewrite: (x) => x.replace("/api/import-core", "/api/v1/import-core"),
      },
    },
  },
})
