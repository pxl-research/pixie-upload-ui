import { z } from 'zod'

const EnvSchema = z
  .object({
    VITE_APP_NAME: z.string().min(1).default('Pixie Upload UI'),
    VITE_TABULAR_API_BASE_URL: z
      .string()
      .min(1, 'VITE_TABULAR_API_BASE_URL is required for API access')
      .default('http://localhost:8000'),
    VITE_TABULAR_API_PROXY_TARGET: z.string().min(1).optional(),
    VITE_TABULAR_API_KEY: z
      .string()
      .min(1, 'VITE_TABULAR_API_KEY is required for API access'),
    VITE_LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'silent'])
      .default('info'),
  })
  .transform((raw) => ({
    appName: raw.VITE_APP_NAME || 'Pixie Upload UI',
    tabularApiBaseUrl: raw.VITE_TABULAR_API_BASE_URL,
    tabularApiProxyTarget: raw.VITE_TABULAR_API_PROXY_TARGET,
    tabularApiKey: raw.VITE_TABULAR_API_KEY,
    logLevel: raw.VITE_LOG_LEVEL,
  }))

type EnvInput = z.input<typeof EnvSchema>
type EnvConfig = z.infer<typeof EnvSchema>

declare global {
  interface Window {
    __PIXIE_UPLOAD_UI_ENV__?: Partial<EnvInput>
    __ENV?: Partial<EnvInput>
  }
}

let cachedEnv: EnvConfig | null = null

function resolveRuntimeEnv(): Partial<EnvInput> {
  if (typeof window === 'undefined') {
    return {}
  }

  const runtimeEnv = window.__PIXIE_UPLOAD_UI_ENV__ ?? window.__ENV
  if (!runtimeEnv || typeof runtimeEnv !== 'object') {
    return {}
  }

  return runtimeEnv
}

function resolveBuildTimeEnv(): Partial<EnvInput> {
  return {
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_TABULAR_API_BASE_URL: import.meta.env.VITE_TABULAR_API_BASE_URL,
    VITE_TABULAR_API_PROXY_TARGET: import.meta.env.VITE_TABULAR_API_PROXY_TARGET,
    VITE_TABULAR_API_KEY: import.meta.env.VITE_TABULAR_API_KEY,
    VITE_LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL,
  }
}

export function getEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv
  }

  const mergedEnv = {
    ...resolveBuildTimeEnv(),
    ...resolveRuntimeEnv(),
  }

  const parsed = EnvSchema.safeParse(mergedEnv)

  if (!parsed.success) {
    console.error('Environment validation failed', parsed.error.flatten())
    throw new Error('Invalid environment configuration')
  }

  cachedEnv = parsed.data
  return cachedEnv
}

export const env = getEnv()
