import { request } from '@/api/client'
import { routes } from '@/api/routes'
import { CollectionSchema, type CollectionDto } from '@/api/types'

export interface CreateCollectionInput {
  name: string
}

// Tabular API: returns full collection objects
export async function fetchTabularCollections() {
  const data = await request<CollectionDto[]>({
    url: routes.collections(),
    method: 'GET',
    target: 'tabular',
  })
  return data.map((item) => CollectionSchema.parse(item))
}

// RAG API: returns { collections: string[] }
export async function fetchRagCollections(): Promise<CollectionDto[]> {
  const data = await request<{ collections: string[] }>({
    url: routes.collections(),
    method: 'GET',
    target: 'rag',
  })

  return (data.collections ?? []).map((name, index) =>
    CollectionSchema.parse({
      id: index,
      name,
      document_count: 0,
      storage_targets: ['pixie-rag-db'],
      planned_storage_targets: [],
    }),
  )
}

export async function createCollection(payload: CreateCollectionInput) {
  return request<CollectionDto>({
    url: routes.collections(),
    method: 'POST',
    data: payload,
    target: 'tabular',
  }).then((item) => CollectionSchema.parse(item))
}

export async function createRagCollection(payload: CreateCollectionInput) {
  const data = await request<{ collection: string; status: string }>({
    url: routes.collections(),
    method: 'POST',
    data: payload,
    target: 'rag',
  })

  return CollectionSchema.parse({
    id: Date.now(),
    name: data.collection ?? payload.name,
    document_count: 0,
    storage_targets: ['pixie-rag-db'],
    planned_storage_targets: [],
  })
}

export async function deleteCollection(collectionName: string) {
  await request<void>({
    url: routes.collection(collectionName),
    method: 'DELETE',
    target: 'tabular',
  })
}

export async function deleteRagCollection(collectionName: string) {
  await request<void>({
    url: routes.collection(collectionName),
    method: 'DELETE',
    target: 'rag',
  })
}
