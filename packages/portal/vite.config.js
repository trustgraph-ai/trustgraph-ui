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
        target: "https://github.com/trustgraph-ai/demo-standard/raw/refs/heads/master/datasets",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/demo-data/, ""),
      },
    },
  },
})
