import { request } from '@/api/client'
import { routes } from '@/api/routes'
import {
  DocumentListSchema,
  DocumentSchema,
  DocumentUpdateSchema,
  type DocumentDto,
  type DocumentUpdateInput,
} from '@/api/types'

export async function fetchDocuments(collectionName: string) {
  const data = await request<DocumentDto[]>({
    url: routes.collectionDocuments(collectionName),
    method: 'GET',
  })

  return DocumentListSchema.parse(data)
}

export async function deleteDocument(
  collectionName: string,
  documentId: string | number,
) {
  await request<void>({
    url: routes.collectionDocument(collectionName, String(documentId)),
    method: 'DELETE',
  })
}

export async function updateDocument(
  collectionName: string,
  documentId: string | number,
  payload: DocumentUpdateInput,
) {
  const data = await request<DocumentDto>({
    url: routes.collectionDocument(collectionName, String(documentId)),
    method: 'PATCH',
    data: DocumentUpdateSchema.parse(payload),
  })

  return DocumentSchema.parse(data)
}
