import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios'
import axios, { AxiosHeaders } from 'axios'
import { env } from '@/config/env'
import { log } from '@/utils/logger'

const API_KEY_HEADER = 'X-API-Key'

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

const client = axios.create({
  baseURL: env.tabularApiBaseUrl,
  timeout: 30_000,
  headers: {
    [API_KEY_HEADER]: env.tabularApiKey,
  },
})

client.interceptors.request.use((config) => {
  const headers = config.headers instanceof AxiosHeaders
    ? config.headers
    : AxiosHeaders.from(config.headers as AxiosRequestHeaders | undefined)

  headers.set(API_KEY_HEADER, env.tabularApiKey)
  return {
    ...config,
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

export function request<T>(config: AxiosRequestConfig) {
  return client.request<T>(config).then((response) => response.data)
}

export { client as apiClient }
