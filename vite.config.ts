import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import {
  RAG_API_BASE_URL,
  RAG_API_PROXY_TARGET,
  TABULAR_API_BASE_URL,
  TABULAR_API_PROXY_TARGET,
} from './src/config/constants'

// https://vite.dev/config/
export default defineConfig(() => {
  const proxies: Record<string, string | ProxyOptions> = {}

  const addProxy = (basePath: string | undefined, target: string | undefined) => {
    if (!basePath || !target) return
    if (!basePath.startsWith('/')) return
    proxies[basePath] = {
      target,
      changeOrigin: true,
      rewrite: (incomingPath: string) => incomingPath.replace(basePath, ''),
    }
  }

  addProxy(TABULAR_API_BASE_URL, TABULAR_API_PROXY_TARGET)
  addProxy(RAG_API_BASE_URL, RAG_API_PROXY_TARGET)

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'TABULAR_', 'RAG_', 'LOG_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server:
      Object.keys(proxies).length > 0
        ? {
            proxy: proxies,
          }
        : undefined,
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
