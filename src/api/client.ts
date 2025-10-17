import type { AxiosError, AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { env } from '@/config/env'
import { log } from '@/utils/logger'

const API_KEY_HEADER = 'X-API-Key'

export interface ApiErrorPayload {
  detail?: string
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
  const nextConfig = {
    ...config,
    headers: {
      ...(config.headers ?? {}),
      [API_KEY_HEADER]: env.apiKey,
    },
  }

  return nextConfig
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
