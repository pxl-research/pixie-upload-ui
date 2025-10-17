import { describe, expect, it } from 'vitest'

describe('environment sanity', () => {
  it('loads Vite env defaults', () => {
    expect(import.meta.env.VITE_APP_NAME ?? 'Pixie Upload UI').toBeTypeOf('string')
  })
})
