import { useEffect, useMemo, useState } from 'react'
import { Stack } from '@chakra-ui/react'
import { CollectionSelector } from '@/components/CollectionSelector'
import { DocumentTable } from '@/components/DocumentTable'
import { UploadPanel } from '@/components/UploadPanel'
import { CreateCollectionDialog } from '@/components/dialogs/CreateCollectionDialog'
import { DeleteCollectionDialog } from '@/components/dialogs/DeleteCollectionDialog'
import { DeleteDocumentDialog } from '@/components/dialogs/DeleteDocumentDialog'
import type { DocumentDto } from '@/api/types'
import { useCollectionsQuery, useDeleteCollectionMutation } from '@/hooks/useCollections'
import { useDeleteDocumentMutation, useDocumentsQuery } from '@/hooks/useDocuments'
import { useToast } from '@/hooks/useToast'
import { useCollectionStore } from '@/state/collectionStore'

export function CollectionDashboard() {
  const toast = useToast()
  const {
    selectedCollection,
    setSelectedCollection,
    isCreateDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    pendingDeleteCollection,
    requestDeleteCollection,
    resetPendingDeleteCollection,
    pendingDeleteDocument,
    requestDeleteDocument,
    resetPendingDeleteDocument,
    highlightCollection,
    setHighlightCollection,
  } = useCollectionStore()

  const [highlightedDocumentId, setHighlightedDocumentId] = useState<number | undefined>()

  const collectionsQuery = useCollectionsQuery()
  const documentsQuery = useDocumentsQuery(selectedCollection)
  const deleteCollectionMutation = useDeleteCollectionMutation()
  const deleteDocumentMutation = useDeleteDocumentMutation(selectedCollection)

  useEffect(() => {
    setHighlightedDocumentId(undefined)
  }, [selectedCollection])

  const collections = useMemo(() => {
    const data = collectionsQuery.data ?? []
    return [...data].sort((a, b) => a.name.localeCompare(b.name))
  }, [collectionsQuery.data])
  const documents = documentsQuery.data ?? []

  const deletingDocumentId = useMemo(() => {
    if (!deleteDocumentMutation.isPending) return undefined
    return deleteDocumentMutation.variables ?? undefined
  }, [deleteDocumentMutation.isPending, deleteDocumentMutation.variables])

  const handleCollectionCreated = (collectionName: string) => {
    setSelectedCollection(collectionName)
    setHighlightCollection(collectionName)
  }

  const handleCollectionDeleteConfirm = async () => {
    if (!pendingDeleteCollection) return
    try {
      await deleteCollectionMutation.mutateAsync({ name: pendingDeleteCollection })
      if (selectedCollection === pendingDeleteCollection) {
        setSelectedCollection(undefined)
      }
      setHighlightCollection(undefined)
      toast({
        title: 'Collectie verwijderd',
        description: `${pendingDeleteCollection} is verwijderd`,
        status: 'success',
      })
      resetPendingDeleteCollection()
    } catch (error) {
      const description =
        error instanceof Error ? error.message : 'Kon collectie niet verwijderen'
      toast({
        title: 'Verwijderen mislukt',
        description,
        status: 'error',
      })
    }
  }

  const handleDocumentDeleteConfirm = async () => {
    if (!pendingDeleteDocument) return
    try {
      await deleteDocumentMutation.mutateAsync(pendingDeleteDocument.id)
      toast({
        title: 'Document verwijderd',
        description: `${pendingDeleteDocument.file_name} is verwijderd`,
        status: 'success',
      })
      resetPendingDeleteDocument()
    } catch (error) {
      const description =
        error instanceof Error ? error.message : 'Kon document niet verwijderen'
      toast({
        title: 'Verwijderen mislukt',
        description,
        status: 'error',
      })
    }
  }

  const handleUploadCompleted = (documents: DocumentDto[]) => {
    const firstDocument = documents[0]
    if (firstDocument) {
      setHighlightedDocumentId(firstDocument.id)
    }
    if (selectedCollection) {
      setHighlightCollection(selectedCollection)
    }
  }

  useEffect(() => {
    if (!highlightCollection) {
      return
    }

    const timeout = window.setTimeout(() => setHighlightCollection(undefined), 4000)
    return () => window.clearTimeout(timeout)
  }, [highlightCollection, setHighlightCollection])

  useEffect(() => {
    if (!highlightedDocumentId) {
      return
    }

    const timeout = window.setTimeout(() => setHighlightedDocumentId(undefined), 4000)
    return () => window.clearTimeout(timeout)
  }, [highlightedDocumentId])

  return (
    <Stack gap={6} pb={8}>
      <CollectionSelector
        collections={collections}
        isLoading={collectionsQuery.isLoading}
        onCreateClick={openCreateDialog}
        onSelect={setSelectedCollection}
        onDeleteRequest={requestDeleteCollection}
        selectedCollection={selectedCollection}
        highlightCollection={highlightCollection}
      />

      <UploadPanel
        collectionName={selectedCollection}
        onUploadCompleted={handleUploadCompleted}
      />

      <DocumentTable
        collectionName={selectedCollection}
        documents={documents}
        isLoading={documentsQuery.isLoading}
        onDeleteRequest={requestDeleteDocument}
        deletingDocumentId={deletingDocumentId}
        highlightedDocumentId={highlightedDocumentId}
      />

      <CreateCollectionDialog
        isOpen={isCreateDialogOpen}
        onClose={closeCreateDialog}
        onCreated={handleCollectionCreated}
      />

      <DeleteCollectionDialog
        collectionName={pendingDeleteCollection}
        isOpen={Boolean(pendingDeleteCollection)}
        isDeleting={deleteCollectionMutation.isPending}
        onClose={resetPendingDeleteCollection}
        onConfirm={handleCollectionDeleteConfirm}
      />

      <DeleteDocumentDialog
        collectionName={selectedCollection}
        document={pendingDeleteDocument}
        isOpen={Boolean(pendingDeleteDocument)}
        isDeleting={deleteDocumentMutation.isPending}
        onClose={resetPendingDeleteDocument}
        onConfirm={handleDocumentDeleteConfirm}
      />
    </Stack>
  )
}

export default CollectionDashboard
