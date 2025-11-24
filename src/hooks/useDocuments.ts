import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CollectionDto, DocumentDto } from '@/api/types'
import { deleteDocument, fetchDocuments, updateDocument } from '@/api/documents'
import { queryKeys } from '@/api/queryKeys'
import {
  uploadDocumentToTarget,
  type UploadDocumentInput,
  type UploadDocumentOptions,
} from '@/api/uploads'
import type { StorageTarget } from '@/utils/fileValidation'
import type { DocumentUpdateInput } from '@/api/types'

export function useDocumentsQuery(collectionName?: string) {
  return useQuery({
    queryKey: collectionName ? queryKeys.documents(collectionName) : ['documents'],
    queryFn: () => {
      if (!collectionName) {
        return Promise.resolve([])
      }

      return fetchDocuments(collectionName)
    },
    enabled: Boolean(collectionName),
  })
}

export interface UploadDocumentVariables extends UploadDocumentInput, UploadDocumentOptions {
  targets?: StorageTarget[]
}

export function useUploadDocumentMutation(collectionName?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UploadDocumentVariables) => {
      if (!collectionName) {
        return Promise.reject(new Error('collectionName is required'))
      }
      const { onUploadProgress, signal, targets: targetInput, ...payload } = input
      const targets = targetInput && targetInput.length > 0
        ? targetInput
        : (['pixie-tabular-db'] as StorageTarget[])

      return Promise.all(
        targets.map((target) =>
          uploadDocumentToTarget(target, collectionName, payload, {
            onUploadProgress,
            signal,
          }),
        ),
      ).then((results) => {
        const tabularResult = results.find((result) => result.target === 'pixie-tabular-db')
        return tabularResult?.documents ?? results[0]?.documents ?? []
      })
    },
    onSuccess: async (documents) => {
      if (!collectionName) return

      let addedCount = 0

      queryClient.setQueryData<DocumentDto[]>(
        queryKeys.documents(collectionName),
        (previous = []) => {
          const byId = new Map(previous.map((doc) => [doc.id, doc]))
          documents.forEach((doc) => {
            const existed = byId.has(doc.id)
            byId.set(doc.id, doc)
            if (!existed) {
              addedCount += 1
            }
          })
          return Array.from(byId.values())
        },
      )

      if (addedCount > 0) {
        queryClient.setQueryData<CollectionDto[]>(
          queryKeys.collections,
          (previousCollections) => {
            if (!previousCollections) {
              return previousCollections
            }
            return previousCollections.map((collection) =>
              collection.name === collectionName
                ? {
                    ...collection,
                    document_count: collection.document_count + addedCount,
                  }
                : collection,
            )
          },
        )
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents(collectionName),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections,
        }),
      ])
    },
  })
}

export function useDeleteDocumentMutation(collectionName?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: number | string) => {
      if (!collectionName) {
        return Promise.reject(new Error('collectionName is required'))
      }
      return deleteDocument(collectionName, documentId)
    },
    onSuccess: async () => {
      if (!collectionName) return

      await queryClient.invalidateQueries({
        queryKey: queryKeys.documents(collectionName),
      })
    },
  })
}

export interface UpdateDocumentVariables {
  documentId: number | string
  data: DocumentUpdateInput
}

export function useUpdateDocumentMutation(collectionName?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ documentId, data }: UpdateDocumentVariables) => {
      if (!collectionName) {
        return Promise.reject(new Error('collectionName is required'))
      }
      return updateDocument(collectionName, documentId, data)
    },
    onSuccess: async (updatedDocument) => {
      if (!collectionName) return

      queryClient.setQueryData<DocumentDto[]>(
        queryKeys.documents(collectionName),
        (previous = []) =>
          previous.map((document) =>
            document.id === updatedDocument.id ? updatedDocument : document,
          ),
      )
    },
  })
}
