import type { AxiosProgressEvent } from 'axios'
import type { DocumentDto, UploadMetadata } from '@/api/types'
import { request } from '@/api/client'
import { routes } from '@/api/routes'
import { UploadResponseSchema } from '@/api/types'
import type { StorageTarget } from '@/utils/fileValidation'
import { RagJobResponseSchema, normalizeRagJob, type RagJobSnapshot } from '@/api/ragJobs'
import { z } from 'zod'

export interface UploadDocumentInput extends UploadMetadata {
  file: File
  document_id?: string
}

export interface UploadDocumentOptions {
  onUploadProgress?: (event: AxiosProgressEvent) => void
  signal?: AbortSignal
}

export type UploadTargetResult =
  | {
      target: 'pixie-tabular-db'
      documents: DocumentDto[]
      ragJob?: undefined
    }
  | {
      target: 'pixie-rag-db'
      documents: DocumentDto[]
      ragJob?: RagJobSnapshot
    }

export async function uploadDocumentToTarget(
  target: StorageTarget,
  collectionName: string,
  payload: UploadDocumentInput,
  options?: UploadDocumentOptions,
): Promise<UploadTargetResult> {
  if (target === 'pixie-rag-db') {
    return uploadToRag(collectionName, payload, options)
  }

  return uploadToTabular(collectionName, payload, options)
}

async function uploadToTabular(
  collectionName: string,
  payload: UploadDocumentInput,
  options?: UploadDocumentOptions,
): Promise<UploadTargetResult> {
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
    target: 'tabular',
  })

  return {
    target: 'pixie-tabular-db' as const,
    documents: UploadResponseSchema.parse(data),
  }
}

async function uploadToRag(
  collectionName: string,
  payload: UploadDocumentInput,
  options?: UploadDocumentOptions,
): Promise<UploadTargetResult> {
  const body = new FormData()
  body.append('file', payload.file)
  if (collectionName) {
    body.append('collection_name', collectionName)
  }
  if (payload.document_id) {
    body.append('document_id', payload.document_id)
  }

  const response = await request<unknown>({
    url: '/documents/upload',
    method: 'POST',
    data: body,
    onUploadProgress: options?.onUploadProgress,
    signal: options?.signal,
    timeout: 30_000,
    target: 'rag',
  })

  const ack = RagJobResponseSchema.catchall(z.unknown()).safeParse(response)
  if (!ack.success) {
    // Best-effort: geen job_id, maar upload is wel geaccepteerd
    // eslint-disable-next-line no-console
    console.warn('RAG upload: onverwacht antwoord', ack.error)
    return {
      target: 'pixie-rag-db' as const,
      documents: [],
      ragJob: undefined,
    }
  }

  const job = normalizeRagJob(ack.data)
  if (!job.id) {
    // Geen job_id, maar we melden geen fout om de UI niet te blokkeren
    return {
      target: 'pixie-rag-db' as const,
      documents: [],
      ragJob: undefined,
    }
  }

  return {
    target: 'pixie-rag-db' as const,
    documents: [], // RAG API returns ack, not documents list
    ragJob: job,
  }
}
