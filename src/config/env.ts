import { z } from 'zod'
import {
  APP_NAME,
  RAG_API_BASE_URL,
  RAG_API_PROXY_TARGET,
  TABULAR_API_BASE_URL,
  TABULAR_API_PROXY_TARGET,
} from './constants'

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'] as const
type LogLevel = (typeof LOG_LEVELS)[number]

function normalizeLogLevel(value?: string): LogLevel | undefined {
  if (!value) return undefined
  return LOG_LEVELS.includes(value as LogLevel) ? (value as LogLevel) : undefined
}

const ENABLED_BACKENDS = ['both', 'tabular', 'rag'] as const
type EnabledBackends = (typeof ENABLED_BACKENDS)[number]

function normalizeEnabledBackends(value?: string): EnabledBackends | undefined {
  if (!value) return undefined
  return ENABLED_BACKENDS.includes(value as EnabledBackends) ? (value as EnabledBackends) : undefined
}

function resolveEnabledTargets(value: EnabledBackends): {
  enabledBackends: EnabledBackends
  isTabularEnabled: boolean
  isRagEnabled: boolean
  enabledTargets: Array<'pixie-tabular-db' | 'pixie-rag-db'>
} {
  const enabledBackends = value ?? 'both'
  const isTabularEnabled = enabledBackends === 'both' || enabledBackends === 'tabular'
  const isRagEnabled = enabledBackends === 'both' || enabledBackends === 'rag'

  const enabledTargets: Array<'pixie-tabular-db' | 'pixie-rag-db'> = []
  if (isTabularEnabled) enabledTargets.push('pixie-tabular-db')
  if (isRagEnabled) enabledTargets.push('pixie-rag-db')

  return {
    enabledBackends,
    isTabularEnabled,
    isRagEnabled,
    enabledTargets,
  }
}

const EnvSchema = z
  .object({
    TABULAR_API_BASE_URL: z.string().min(1).default(TABULAR_API_BASE_URL),
    TABULAR_API_KEY: z
      .string()
      .min(1, 'TABULAR_API_KEY is required for API access'),
    RAG_API_KEY: z.string().min(1).optional(),
    RAG_API_BASE_URL: z.string().min(1).default(RAG_API_BASE_URL),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    ENABLED_BACKENDS: z.enum(ENABLED_BACKENDS).default('both'),
  })
  .transform((raw) => ({
    appName: APP_NAME,
    tabularApiBaseUrl: raw.TABULAR_API_BASE_URL,
    tabularApiProxyTarget: TABULAR_API_PROXY_TARGET,
    tabularApiKey: raw.TABULAR_API_KEY,
    ragApiBaseUrl: raw.RAG_API_BASE_URL,
    ragApiProxyTarget: RAG_API_PROXY_TARGET,
    ragApiKey: raw.RAG_API_KEY,
    logLevel: raw.LOG_LEVEL,
    ...resolveEnabledTargets(raw.ENABLED_BACKENDS),
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
    TABULAR_API_BASE_URL: pickString('TABULAR_API_BASE_URL'),
    TABULAR_API_KEY: pickString('TABULAR_API_KEY'),
    RAG_API_KEY: pickString('RAG_API_KEY'),
    RAG_API_BASE_URL: pickString('RAG_API_BASE_URL'),
    LOG_LEVEL: normalizeLogLevel(pickString('LOG_LEVEL')) ?? undefined,
    ENABLED_BACKENDS: normalizeEnabledBackends(pickString('ENABLED_BACKENDS')),
  }
}

function resolveBuildTimeEnv(): Partial<EnvInput> {
  const nodeEnv = typeof process !== 'undefined' ? process.env : undefined

  const pickString = (source: Record<string, unknown> | undefined, key: string) => {
    const value = source?.[key]
    return typeof value === 'string' ? value : undefined
  }

  const importEnv = import.meta.env as unknown as Record<string, unknown>
  const tabularApiBaseUrl =
    pickString(importEnv, 'TABULAR_API_BASE_URL') ?? pickString(nodeEnv, 'TABULAR_API_BASE_URL')
  const tabularApiKey =
    pickString(importEnv, 'TABULAR_API_KEY') ?? pickString(nodeEnv, 'TABULAR_API_KEY')
  const ragApiBaseUrl =
    pickString(importEnv, 'RAG_API_BASE_URL') ?? pickString(nodeEnv, 'RAG_API_BASE_URL')
  const ragApiKey =
    pickString(importEnv, 'RAG_API_KEY') ?? pickString(nodeEnv, 'RAG_API_KEY')
  const logLevel = normalizeLogLevel(
    pickString(importEnv, 'LOG_LEVEL') ?? pickString(nodeEnv, 'LOG_LEVEL'),
  )
  const enabledBackends = normalizeEnabledBackends(
    pickString(importEnv, 'ENABLED_BACKENDS') ?? pickString(nodeEnv, 'ENABLED_BACKENDS'),
  )

  return {
    TABULAR_API_BASE_URL: tabularApiBaseUrl,
    TABULAR_API_KEY: tabularApiKey,
    RAG_API_BASE_URL: ragApiBaseUrl,
    RAG_API_KEY: ragApiKey,
    LOG_LEVEL: logLevel,
    ENABLED_BACKENDS: enabledBackends,
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
