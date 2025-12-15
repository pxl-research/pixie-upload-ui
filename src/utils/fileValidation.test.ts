import { describe, expect, it } from 'vitest'
import {
  describeAcceptedFileTypes,
  getFileHandlingPlan,
  type FileHandlingPlan,
} from '@/utils/fileValidation'

function makeFile(name: string, type: string) {
  return new File(['dummy'], name, { type })
}

describe('getFileHandlingPlan', () => {
  it('accepts csv files by extension', () => {
    const file = makeFile('data.csv', 'application/octet-stream')
    const plan = getFileHandlingPlan(file)
    expect(plan).not.toBeNull()
    expect((plan as FileHandlingPlan).category).toBe('tabular')
    expect((plan as FileHandlingPlan).activeTargets).toContain('pixie-rag-db')
  })

  it('accepts xlsx files by mime type', () => {
    const file = makeFile(
      'report.unknown',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    const plan = getFileHandlingPlan(file)
    expect(plan).not.toBeNull()
    expect((plan as FileHandlingPlan).activeTargets).toEqual(
      expect.arrayContaining(['pixie-tabular-db', 'pixie-rag-db']),
    )
  })

  it('rejects unsupported files', () => {
    const file = makeFile('image.png', 'image/png')
    expect(getFileHandlingPlan(file)).toBeNull()
  })
})

describe('describeAcceptedFileTypes', () => {
  it('returns a helpful message', () => {
    expect(describeAcceptedFileTypes()).toContain('CSV')
  })
})
