import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const tabularProxyTarget = env.VITE_TABULAR_API_PROXY_TARGET
  const ragProxyTarget = env.VITE_RAG_API_PROXY_TARGET

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

  addProxy(env.VITE_TABULAR_API_BASE_URL, tabularProxyTarget)
  addProxy(env.VITE_RAG_API_BASE_URL, ragProxyTarget)

  return {
    plugins: [react()],
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
