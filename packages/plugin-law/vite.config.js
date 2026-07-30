import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: __dirname + 'src/index.ts',
      name: 'LawPlugin',
      formats: ['iife'],
      fileName: 'law',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@trustgraph/trustkit',
        '@trustgraph/react-provider',
        '@trustgraph/react-state',
      ],
      output: {
        globals: {
          'react': 'TrustKitShared.React',
          'react/jsx-runtime': 'TrustKitShared.ReactJSX',
          'react-dom': 'TrustKitShared.ReactDOM',
          '@trustgraph/trustkit': 'TrustKitShared.TrustKit',
          '@trustgraph/react-provider': 'TrustKitShared.ReactProvider',
          '@trustgraph/react-state': 'TrustKitShared.ReactState',
        },
      },
    },
  },
})
