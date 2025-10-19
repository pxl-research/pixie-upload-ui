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
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    [API_KEY_HEADER]: env.apiKey,
  },
})

client.interceptors.request.use((config) => {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set(API_KEY_HEADER, env.apiKey)
  } else {
    const headers: AxiosRequestHeaders = {
      ...(config.headers ?? {}),
      [API_KEY_HEADER]: env.apiKey,
    }
    config.headers = headers
  }

  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status
    const payload = error.response?.data

    const message =
      payload?.detail ??
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
