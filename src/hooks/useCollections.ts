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

export function useCollectionsQuery() {
  return useQuery({
    queryKey: queryKeys.collections,
    queryFn: fetchUnifiedCollections,
    staleTime: 60_000,
  })
}

async function fetchUnifiedCollections(): Promise<CollectionDto[]> {
  const [tabularResult, ragResult] = await Promise.allSettled([
    fetchTabularCollections(),
    fetchRagCollections(),
  ])

  const tabular = tabularResult.status === 'fulfilled' ? tabularResult.value : []
  const rag = ragResult.status === 'fulfilled' ? ragResult.value : []

  if (ragResult.status === 'rejected') {
    // eslint-disable-next-line no-console
    console.warn('RAG collections fetch failed', ragResult.reason)
  }

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
      const tabular = await createCollection(input)
      // Probeer dezelfde collectie in RAG; als het faalt, gooi een Error zodat caller kan tonen.
      try {
        await createRagCollection(input)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'RAG-collectie aanmaken mislukt'
        throw new Error(`Tabular aangemaakt, RAG mislukt: ${message}`)
      }

      return tabular
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

      await tryDelete(() => deleteCollection(name), 'Tabular')
      await tryDelete(() => deleteRagCollection(name), 'RAG')

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
