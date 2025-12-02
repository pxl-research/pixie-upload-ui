import { z } from 'zod'
import {
  APP_NAME,
  RAG_API_BASE_URL,
  RAG_API_PROXY_TARGET,
  TABULAR_API_BASE_URL,
  TABULAR_API_PROXY_TARGET,
} from './constants'

const EnvSchema = z
  .object({
    TABULAR_API_KEY: z
      .string()
      .min(1, 'TABULAR_API_KEY is required for API access'),
    RAG_API_KEY: z.string().min(1).optional(),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'silent'])
      .default('info'),
  })
  .transform((raw) => ({
    appName: APP_NAME,
    tabularApiBaseUrl: TABULAR_API_BASE_URL,
    tabularApiProxyTarget: TABULAR_API_PROXY_TARGET,
    tabularApiKey: raw.TABULAR_API_KEY,
    ragApiBaseUrl: RAG_API_BASE_URL,
    ragApiProxyTarget: RAG_API_PROXY_TARGET,
    ragApiKey: raw.RAG_API_KEY,
    logLevel: raw.LOG_LEVEL,
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

  const pickString = (key: string) => {
    const value = (runtimeEnv as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : undefined
  }

  return {
    TABULAR_API_KEY: pickString('TABULAR_API_KEY') ?? pickString('VITE_TABULAR_API_KEY'),
    RAG_API_KEY: pickString('RAG_API_KEY') ?? pickString('VITE_RAG_API_KEY'),
    LOG_LEVEL: pickString('LOG_LEVEL') ?? pickString('VITE_LOG_LEVEL'),
  }
}

function resolveBuildTimeEnv(): Partial<EnvInput> {
  const nodeEnv = typeof process !== 'undefined' ? process.env : undefined

  const pickString = (source: Record<string, unknown> | undefined, key: string) => {
    const value = source?.[key]
    return typeof value === 'string' ? value : undefined
  }

  const importEnv = import.meta.env as unknown as Record<string, unknown>
  const tabularApiKey =
    pickString(importEnv, 'TABULAR_API_KEY') ??
    pickString(importEnv, 'VITE_TABULAR_API_KEY') ??
    pickString(nodeEnv, 'TABULAR_API_KEY') ??
    pickString(nodeEnv, 'VITE_TABULAR_API_KEY')
  const ragApiKey =
    pickString(importEnv, 'RAG_API_KEY') ??
    pickString(importEnv, 'VITE_RAG_API_KEY') ??
    pickString(nodeEnv, 'RAG_API_KEY') ??
    pickString(nodeEnv, 'VITE_RAG_API_KEY')
  const logLevel =
    pickString(importEnv, 'LOG_LEVEL') ??
    pickString(importEnv, 'VITE_LOG_LEVEL') ??
    pickString(nodeEnv, 'LOG_LEVEL') ??
    pickString(nodeEnv, 'VITE_LOG_LEVEL')

  return {
    TABULAR_API_KEY: tabularApiKey,
    RAG_API_KEY: ragApiKey,
    LOG_LEVEL: logLevel,
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
