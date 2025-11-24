import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios'
import axios, { AxiosHeaders } from 'axios'
import { env } from '@/config/env'
import { log } from '@/utils/logger'

const API_KEY_HEADER = 'X-API-Key'

export type ApiTarget = 'tabular' | 'rag'

export type ApiErrorDetail =
  | string
  | Record<string, unknown>
  | Array<string | Record<string, unknown>>

export interface ApiErrorPayload {
  detail?: ApiErrorDetail
  message?: string
  status_code?: number
}

export class ApiError extends Error {
  public readonly status?: number

  public readonly payload?: ApiErrorPayload

  constructor(message: string, status?: number, payload?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

const apiConfigs: Record<ApiTarget, { baseURL?: string; apiKey?: string }> = {
  tabular: {
    baseURL: env.tabularApiBaseUrl,
    apiKey: env.tabularApiKey,
  },
  rag: {
    baseURL: env.ragApiBaseUrl,
    apiKey: env.ragApiKey,
  },
}

const apiClients: Partial<Record<ApiTarget, AxiosInstance>> = {}

function getClient(target: ApiTarget): AxiosInstance {
  if (apiClients[target]) return apiClients[target] as AxiosInstance

  const config = apiConfigs[target]
  if (!config?.baseURL) {
    throw new Error(`API base URL ontbreekt voor target ${target}`)
  }
  if (!config?.apiKey) {
    throw new Error(`API key ontbreekt voor target ${target}`)
  }

  const client = axios.create({
    baseURL: config.baseURL,
    timeout: 30_000,
  })

  client.interceptors.request.use((requestConfig) => {
    const headers = requestConfig.headers instanceof AxiosHeaders
      ? requestConfig.headers
      : AxiosHeaders.from(requestConfig.headers as AxiosRequestHeaders | undefined)

    headers.set(API_KEY_HEADER, config.apiKey)

    return {
      ...requestConfig,
      headers,
    }
  })

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status
      const payload = error.response?.data

      const resolveDetail = (value: ApiErrorDetail | undefined): string | undefined => {
        if (!value) return undefined
        if (typeof value === 'string') return value
        if (Array.isArray(value)) {
          return value
            .map((item) => {
              if (typeof item === 'string') return item
              try {
                return JSON.stringify(item)
              } catch {
                return String(item)
              }
            })
            .join('\n')
        }
        try {
          return JSON.stringify(value)
        } catch {
          return String(value)
        }
      }

      const message =
        resolveDetail(payload?.detail) ??
        payload?.message ??
        error.message ??
        'Unexpected API error'

      log.error('API request failed', {
        message,
        status,
        url: error.config?.url,
        method: error.config?.method,
      })

      return Promise.reject(new ApiError(message, status, payload))
    },
  )

  apiClients[target] = client
  return client
}

export interface RequestConfig<T = unknown> extends AxiosRequestConfig<T> {
  target?: ApiTarget
}

export function request<T>(config: RequestConfig) {
  const target = config.target ?? 'tabular'
  const client = getClient(target)
  return client.request<T>(config).then((response) => response.data)
}

export { getClient as apiClient }
