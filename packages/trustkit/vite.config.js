import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: __dirname + 'src/index.ts',
      name: 'TrustKit',
      formats: ['es'],
      fileName: 'trustkit',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@trustgraph/react-provider',
        '@trustgraph/react-state',
        '@tanstack/react-query',
        'zustand',
      ],
    },
  },
})
