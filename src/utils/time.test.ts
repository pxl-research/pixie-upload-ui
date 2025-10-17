import { describe, expect, it } from 'vitest'
import { estimateTimeRemainingMs, formatDurationMs } from '@/utils/time'

describe('estimateTimeRemainingMs', () => {
  it('estimates remaining time based on progress', () => {
    const started = performance.now() - 1000
    const estimate = estimateTimeRemainingMs(started, 50, 100)
    expect(estimate).toBeGreaterThan(900)
  })

  it('returns undefined for invalid totals', () => {
    const started = performance.now()
    expect(estimateTimeRemainingMs(started, 0, 0)).toBeUndefined()
  })
})

describe('formatDurationMs', () => {
  it('formats seconds', () => {
    expect(formatDurationMs(5000)).toBe('5s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDurationMs(125000)).toBe('2m 5s')
  })
})
