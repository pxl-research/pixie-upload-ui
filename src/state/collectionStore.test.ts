import { describe, expect, it } from 'vitest'
import type { DocumentDto } from '@/api/types'
import { useCollectionStore } from '@/state/collectionStore'

describe('collectionStore', () => {
  it('manages selected collection', () => {
    const state = useCollectionStore.getState()
    expect(state.selectedCollection).toBeUndefined()
    state.setSelectedCollection('demo')
    expect(useCollectionStore.getState().selectedCollection).toBe('demo')
  })

  it('stores pending document for deletion', () => {
    const document = {
      id: 1,
      file_name: 'file.csv',
      collection: 'demo',
      row_count: 10,
      columns: [],
      storage_target: 'pixie-tabular-db',
      planned_storage_targets: [],
      file_extension: '.csv',
      original_file_type: 'text/csv',
      requires_preprocessing: false,
      language: null,
      description: null,
    } as DocumentDto
    useCollectionStore.getState().requestDeleteDocument(document)
    expect(useCollectionStore.getState().pendingDeleteDocument).toBe(document)
    useCollectionStore.getState().resetPendingDeleteDocument()
    expect(useCollectionStore.getState().pendingDeleteDocument).toBeUndefined()
  })
})
