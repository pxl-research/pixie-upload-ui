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
    target: 'tabular',
  })

  return DocumentListSchema.parse(data)
}

export async function fetchRagDocuments(collectionName: string) {
  const data = await request<{ documents: string[] }>({
    url: '/documents',
    method: 'GET',
    params: { collection_name: collectionName },
    target: 'rag',
  })

  const documents = (data.documents ?? []).map((fileName, index) =>
    DocumentSchema.parse({
      id: index,
      file_name: fileName,
      collection: collectionName,
      storage_target: 'pixie-rag-db',
      planned_storage_targets: [],
      file_extension: fileName.split('.').pop(),
      columns: [],
      row_count: null,
      description: null,
      language: null,
      requires_preprocessing: false,
    }),
  )

  return DocumentListSchema.parse(documents)
}

export async function deleteDocument(
  collectionName: string,
  documentId: string | number,
) {
  await request<void>({
    url: routes.collectionDocument(collectionName, String(documentId)),
    method: 'DELETE',
    target: 'tabular',
  })
}

export async function deleteRagDocument(collectionName: string, fileName: string) {
  await request<void>({
    url: '/documents',
    method: 'DELETE',
    data: {
      collection_name: collectionName,
      file_name: fileName,
    },
    target: 'rag',
  })
}

export async function updateDocument(
  collectionName: string,
  documentId: string | number,
  payload: DocumentUpdateInput,
) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('updateDocument payload', payload)
  }
  const data = await request<DocumentDto>({
    url: routes.collectionDocument(collectionName, String(documentId)),
    method: 'PATCH',
    data: DocumentUpdateSchema.parse(payload),
    target: 'tabular',
  })

  return DocumentSchema.parse(data)
}
