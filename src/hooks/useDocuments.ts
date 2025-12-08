import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CollectionDto, DocumentDto } from '@/api/types'
import {
  deleteDocument,
  deleteRagDocument,
  fetchDocuments,
  fetchRagDocuments,
  updateDocument,
} from '@/api/documents'
import { queryKeys } from '@/api/queryKeys'
import {
  uploadDocumentToTarget,
  type UploadDocumentInput,
  type UploadDocumentOptions,
  type UploadTargetResult,
} from '@/api/uploads'
import type { StorageTarget } from '@/utils/fileValidation'
import type { DocumentUpdateInput } from '@/api/types'
import { env } from '@/config/env'
import type { RagJobSnapshot } from '@/api/ragJobs'

export function useDocumentsQuery(collectionName?: string) {
  const queryClient = useQueryClient()

  const query = useQuery<DocumentDto[]>({
    queryKey: collectionName ? queryKeys.documents(collectionName) : ['documents'],
    queryFn: () => fetchUnifiedDocuments(collectionName),
    enabled: Boolean(collectionName),
  })

  useEffect(() => {
    if (!collectionName) return
    const documents = query.data
    if (!documents) return

    queryClient.setQueryData<CollectionDto[]>(
      queryKeys.collections,
      (previousCollections) =>
        previousCollections?.map((collection) =>
          collection.name === collectionName
            ? { ...collection, document_count: documents.length }
            : collection,
        ) ?? previousCollections,
    )
  }, [collectionName, query.data, queryClient])

  return query
}

export interface UploadDocumentVariables extends UploadDocumentInput, UploadDocumentOptions {
  targets?: StorageTarget[]
}

export interface UploadMutationResult {
  documents: DocumentDto[]
  ragJobs: RagJobSnapshot[]
}

async function fetchUnifiedDocuments(collectionName?: string): Promise<DocumentDto[]> {
  if (!collectionName) return []

  const tasks: Array<Promise<DocumentDto[]>> = []
  const markers: Array<'tabular' | 'rag'> = []

  if (env.isTabularEnabled) {
    tasks.push(fetchDocuments(collectionName))
    markers.push('tabular')
  }

  if (env.isRagEnabled) {
    tasks.push(fetchRagDocuments(collectionName))
    markers.push('rag')
  }

  if (tasks.length === 0) return []

  const results = await Promise.allSettled(tasks)
  let tabular: DocumentDto[] = []
  let rag: DocumentDto[] = []

  results.forEach((result, index) => {
    const marker = markers[index]
    if (result.status === 'fulfilled') {
      if (marker === 'tabular') tabular = result.value
      if (marker === 'rag') rag = result.value
    } else if (marker === 'rag') {
      // eslint-disable-next-line no-console
      console.warn('RAG documents fetch failed', result.reason)
    } else if (marker === 'tabular') {
      // eslint-disable-next-line no-console
      console.warn('Tabular documents fetch failed', result.reason)
    }
  })

  return mergeDocuments(tabular, rag)
}

function mergeDocuments(tabular: DocumentDto[], rag: DocumentDto[]): DocumentDto[] {
  const map = new Map<string, DocumentDto>()

  const add = (doc: DocumentDto) => {
    const key = doc.id != null ? String(doc.id) : doc.file_name || crypto.randomUUID()
    if (!map.has(key)) {
      map.set(key, doc)
    }
  }

  tabular.forEach(add)
  rag.forEach(add)

  return Array.from(map.values())
}

export function useUploadDocumentMutation(collectionName?: string) {
  const queryClient = useQueryClient()

  return useMutation<UploadMutationResult, unknown, UploadDocumentVariables>({
    mutationFn: (input: UploadDocumentVariables) => {
      if (!collectionName) {
        return Promise.reject(new Error('collectionName is required'))
      }
      const { onUploadProgress, signal, targets: targetInput, ...payload } = input
      const targets = targetInput && targetInput.length > 0
        ? targetInput
        : (env.enabledTargets as StorageTarget[])

      if (targets.length === 0) {
        return Promise.reject(new Error('Geen opslagdoelen geactiveerd'))
      }

      return Promise.all(
        targets.map((target) =>
          uploadDocumentToTarget(target, collectionName, payload, {
            onUploadProgress,
            signal,
          }),
        ),
      ).then((results: UploadTargetResult[]) => {
        const tabularResult = results.find((result) => result.target === 'pixie-tabular-db')
        const ragJobs = results
          .map((result) => (result.target === 'pixie-rag-db' ? result.ragJob : undefined))
          .filter(Boolean) as RagJobSnapshot[]

        return {
          documents: tabularResult?.documents ?? results[0]?.documents ?? [],
          ragJobs,
        }
      })
    },
    onSuccess: async ({ documents }) => {
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
    mutationFn: async (document: DocumentDto) => {
      if (!collectionName) {
        return Promise.reject(new Error('collectionName is required'))
      }
      if (!env.isTabularEnabled && !env.isRagEnabled) {
        return Promise.reject(new Error('Geen opslagdoelen geactiveerd'))
      }
      const errors: string[] = []
      let deletedSomewhere = false

      const tryDelete = async (fn: () => Promise<void>) => {
        try {
          await fn()
          deletedSomewhere = true
        } catch (error) {
          errors.push(error instanceof Error ? error.message : 'Onbekende fout')
        }
      }

      if (env.isTabularEnabled && document.storage_target !== 'pixie-rag-db') {
        await tryDelete(() => deleteDocument(collectionName, document.id))
      }
      if (env.isRagEnabled && document.storage_target !== 'pixie-tabular-db') {
        await tryDelete(() => deleteRagDocument(collectionName, String(document.file_name)))
      }

      if (!deletedSomewhere && errors.length > 0) {
        throw new Error(errors.join(' | '))
      }
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
      if (!env.isTabularEnabled) {
        return Promise.reject(new Error('Tabular backend staat uit'))
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
