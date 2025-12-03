import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { RAG_API_BASE_URL, RAG_PROXY_TARGET, TABULAR_API_BASE_URL, TABULAR_PROXY_TARGET } from './src/config/constants'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const proxies: Record<string, string | ProxyOptions> = {}

  const addProxy = (basePath: string | undefined, target: string | undefined) => {
    if (!basePath || !basePath.startsWith('/')) return
    if (!target) return
    proxies[basePath] = {
      target,
      changeOrigin: true,
      rewrite: (incomingPath: string) => incomingPath.replace(basePath, ''),
    }
  }

  addProxy(env.TABULAR_API_BASE_URL || TABULAR_API_BASE_URL, TABULAR_PROXY_TARGET)
  addProxy(env.RAG_API_BASE_URL || RAG_API_BASE_URL, RAG_PROXY_TARGET)

  return {
    plugins: [react()],
    envPrefix: ['TABULAR_', 'RAG_', 'LOG_', 'ENABLED_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: Object.keys(proxies).length > 0 ? { proxy: proxies } : undefined,
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
