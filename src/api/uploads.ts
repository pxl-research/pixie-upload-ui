import type { AxiosProgressEvent } from 'axios'
import type { DocumentDto, UploadMetadata } from '@/api/types'
import { request } from '@/api/client'
import { routes } from '@/api/routes'
import { UploadResponseSchema } from '@/api/types'

export interface UploadDocumentInput extends UploadMetadata {
  file: File
}

export interface UploadDocumentOptions {
  onUploadProgress?: (event: AxiosProgressEvent) => void
  signal?: AbortSignal
}

export async function uploadDocument(
  collectionName: string,
  payload: UploadDocumentInput,
  options?: UploadDocumentOptions,
) {
  const body = new FormData()
  body.append('file', payload.file)

  if (payload.product_prefix) {
    body.append('product_prefix', payload.product_prefix)
  }

  if (payload.language) {
    body.append('language', payload.language)
  }

  if (payload.description) {
    body.append('description', payload.description)
  }

  const data = await request<DocumentDto[]>({
    url: routes.collectionDocuments(collectionName),
    method: 'POST',
    data: body,
    onUploadProgress: options?.onUploadProgress,
    signal: options?.signal,
    timeout: 120_000,
  })

  return UploadResponseSchema.parse(data)
}
