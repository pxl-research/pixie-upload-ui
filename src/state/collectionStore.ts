import { create } from 'zustand'
import type { DocumentDto } from '@/api/types'

export interface CollectionUiState {
  selectedCollection?: string
  setSelectedCollection: (collectionName?: string) => void
  isCreateDialogOpen: boolean
  openCreateDialog: () => void
  closeCreateDialog: () => void
  pendingDeleteCollection?: string
  requestDeleteCollection: (collectionName: string) => void
  resetPendingDeleteCollection: () => void
  pendingDeleteDocument?: DocumentDto
  requestDeleteDocument: (document: DocumentDto) => void
  resetPendingDeleteDocument: () => void
  highlightCollection?: string
  setHighlightCollection: (collectionName?: string) => void
}

export const useCollectionStore = create<CollectionUiState>((set) => ({
  selectedCollection: undefined,
  setSelectedCollection: (collectionName) =>
    set({ selectedCollection: collectionName }),
  isCreateDialogOpen: false,
  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  pendingDeleteCollection: undefined,
  requestDeleteCollection: (collectionName) =>
    set({ pendingDeleteCollection: collectionName }),
  resetPendingDeleteCollection: () => set({ pendingDeleteCollection: undefined }),
  pendingDeleteDocument: undefined,
  requestDeleteDocument: (document) => set({ pendingDeleteDocument: document }),
  resetPendingDeleteDocument: () => set({ pendingDeleteDocument: undefined }),
  highlightCollection: undefined,
  setHighlightCollection: (collectionName) =>
    set({ highlightCollection: collectionName }),
}))
