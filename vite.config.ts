import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    envPrefix: ['TABULAR_', 'RAG_', 'LOG_', 'ENABLED_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        reporter: ['text', 'lcov'],
        provider: 'v8',
      },
    },
  }
})
