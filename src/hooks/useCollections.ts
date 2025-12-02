import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCollection,
  createRagCollection,
  deleteCollection,
  deleteRagCollection,
  fetchRagCollections,
  fetchTabularCollections,
  type CreateCollectionInput,
} from '@/api/collections'
import { ApiError } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { CollectionDto, StorageTargetId } from '@/api/types'
import { env } from '@/config/env'

export function useCollectionsQuery() {
  return useQuery({
    queryKey: queryKeys.collections,
    queryFn: fetchUnifiedCollections,
    staleTime: 60_000,
  })
}

async function fetchUnifiedCollections(): Promise<CollectionDto[]> {
  const tasks: Array<Promise<CollectionDto[]>> = []
  const markers: Array<'tabular' | 'rag'> = []

  if (env.isTabularEnabled) {
    tasks.push(fetchTabularCollections())
    markers.push('tabular')
  }

  if (env.isRagEnabled) {
    tasks.push(fetchRagCollections())
    markers.push('rag')
  }

  if (tasks.length === 0) return []

  const results = await Promise.allSettled(tasks)
  let tabular: CollectionDto[] = []
  let rag: CollectionDto[] = []

  results.forEach((result, index) => {
    const marker = markers[index]
    if (result.status === 'fulfilled') {
      if (marker === 'tabular') tabular = result.value
      if (marker === 'rag') rag = result.value
    } else if (marker === 'rag') {
      // eslint-disable-next-line no-console
      console.warn('RAG collections fetch failed', result.reason)
    } else if (marker === 'tabular') {
      // eslint-disable-next-line no-console
      console.warn('Tabular collections fetch failed', result.reason)
    }
  })

  return mergeCollections(tabular, rag)
}

function mergeCollections(tabular: CollectionDto[], rag: CollectionDto[]): CollectionDto[] {
  const map = new Map<string, CollectionDto & { sources?: StorageTargetId[] }>()

  const add = (collection: CollectionDto, defaultTarget: StorageTargetId) => {
    const existing = map.get(collection.name)
    const storageTargets = new Set<StorageTargetId>(
      existing?.storage_targets ?? collection.storage_targets ?? [defaultTarget],
    )
    const plannedTargets = new Set<StorageTargetId>(
      existing?.planned_storage_targets ?? collection.planned_storage_targets ?? [],
    )

    collection.storage_targets?.forEach((target) => storageTargets.add(target))
    collection.planned_storage_targets?.forEach((target) => plannedTargets.add(target))

    const merged: CollectionDto = {
      ...collection,
      id: existing?.id ?? collection.id,
      name: collection.name,
      document_count: (existing?.document_count ?? 0) + (collection.document_count ?? 0),
      storage_targets: Array.from(storageTargets),
      planned_storage_targets: Array.from(plannedTargets),
    }

    map.set(collection.name, merged)
  }

  tabular.forEach((c) => add(c, 'pixie-tabular-db'))
  rag.forEach((c) => add(c, 'pixie-rag-db'))

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCollectionInput) => {
      if (!env.isTabularEnabled && !env.isRagEnabled) {
        throw new Error('Geen backends geactiveerd')
      }

      const results: CollectionDto[] = []
      const errors: string[] = []

      if (env.isTabularEnabled) {
        const tabular = await createCollection(input)
        results.push(tabular)
      }

      if (env.isRagEnabled) {
        try {
          const rag = await createRagCollection(input)
          results.push(rag)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'RAG-collectie aanmaken mislukt'
          if (env.isTabularEnabled) {
            throw new Error(`RAG mislukt: ${message}`)
          } else {
            errors.push(message)
          }
        }
      }

      if (results.length === 0 && errors.length > 0) {
        throw new Error(errors.join(' | '))
      }

      return results[0]
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.collections })
    },
  })
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!env.isTabularEnabled && !env.isRagEnabled) {
        throw new Error('Geen backends geactiveerd')
      }

      const errors: string[] = []
      let deletedSomewhere = false

      const tryDelete = async (fn: () => Promise<void>, label: string) => {
        try {
          await fn()
          deletedSomewhere = true
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            return
          }
          const message = error instanceof Error ? error.message : 'Onbekende fout'
          errors.push(`${label}: ${message}`)
        }
      }

      if (env.isTabularEnabled) {
        await tryDelete(() => deleteCollection(name), 'Tabular')
      }
      if (env.isRagEnabled) {
        await tryDelete(() => deleteRagCollection(name), 'RAG')
      }

      if (!deletedSomewhere && errors.length > 0) {
        throw new Error(errors.join(' | '))
      }
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.collections }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents(variables.name),
        }),
      ])
    },
  })
}
