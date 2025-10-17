import { describe, expect, it } from 'vitest'
import { describeAcceptedFileTypes, isTabularFile } from '@/utils/fileValidation'

function makeFile(name: string, type: string) {
  return new File(['dummy'], name, { type })
}

describe('isTabularFile', () => {
  it('accepts csv files by extension', () => {
    const file = makeFile('data.csv', 'application/octet-stream')
    expect(isTabularFile(file)).toBe(true)
  })

  it('accepts xlsx files by mime type', () => {
    const file = makeFile(
      'report.unknown',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(isTabularFile(file)).toBe(true)
  })

  it('rejects unsupported files', () => {
    const file = makeFile('image.png', 'image/png')
    expect(isTabularFile(file)).toBe(false)
  })
})

describe('describeAcceptedFileTypes', () => {
  it('returns a helpful message', () => {
    expect(describeAcceptedFileTypes()).toContain('CSV')
  })
})
