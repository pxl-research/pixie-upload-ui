import { request } from '@/api/client'
import { routes } from '@/api/routes'
import { CollectionSchema, type CollectionDto } from '@/api/types'

export async function fetchCollections() {
  const data = await request<CollectionDto[]>({
    url: routes.collections(),
    method: 'GET',
  })

  return data.map((item) => CollectionSchema.parse(item))
}

export interface CreateCollectionInput {
  name: string
}

export async function createCollection(payload: CreateCollectionInput) {
  return request<CollectionDto>({
    url: routes.collections(),
    method: 'POST',
    data: payload,
  }).then((item) => CollectionSchema.parse(item))
}

export async function deleteCollection(collectionName: string) {
  await request<void>({
    url: routes.collection(collectionName),
    method: 'DELETE',
  })
}
