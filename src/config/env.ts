import { z } from 'zod'

const EnvSchema = z
  .object({
    VITE_APP_NAME: z.string().min(1).default('Pixie Upload UI'),
    VITE_API_BASE_URL: z.string().min(1).default('http://localhost:8000'),
    VITE_API_PROXY_TARGET: z.string().min(1).optional(),
    VITE_API_KEY: z.string().min(1, 'VITE_API_KEY is required for API access'),
    VITE_LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'silent'])
      .default('info'),
  })
  .transform((raw) => ({
    appName: raw.VITE_APP_NAME || 'Pixie Upload UI',
    apiBaseUrl: raw.VITE_API_BASE_URL,
    apiProxyTarget: raw.VITE_API_PROXY_TARGET,
    apiKey: raw.VITE_API_KEY,
    logLevel: raw.VITE_LOG_LEVEL,
  }))

type EnvConfig = z.infer<typeof EnvSchema>

let cachedEnv: EnvConfig | null = null

export function getEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv
  }

  const parsed = EnvSchema.safeParse(import.meta.env)

  if (!parsed.success) {
    console.error('Environment validation failed', parsed.error.flatten())
    throw new Error('Invalid environment configuration')
  }

  cachedEnv = parsed.data
  return cachedEnv
}

export const env = getEnv()
