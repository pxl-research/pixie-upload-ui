import { describe, expect, it } from 'vitest'
import { env } from '@/config/env'
import { APP_NAME, RAG_API_BASE_URL, TABULAR_API_BASE_URL } from '@/config/constants'

describe('environment sanity', () => {
  it('exposes constant config', () => {
    expect(env.appName).toBe(APP_NAME)
    expect(env.tabularApiBaseUrl).toBe(TABULAR_API_BASE_URL)
    expect(env.ragApiBaseUrl).toBe(RAG_API_BASE_URL)
  })
})
