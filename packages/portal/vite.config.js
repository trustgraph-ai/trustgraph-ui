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
        target: "http://localhost:8888/",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/demo-data": {
        target: "https://datasets.app.trustgraph.ai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/demo-data/, ""),
      },
      "/config-svc": {
        target: "https://config-svc.app.trustgraph.ai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/config-svc/, ""),
      },
    },
  },
})
