import { z } from 'zod'
import { request } from '@/api/client'
import { routes } from '@/api/routes'

export const RagJobResponseSchema = z.object({
  job_id: z.string().optional(),
  id: z.string().optional(),
  status: z.string().optional(),
  detail: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  result: z
    .object({
      documents: z.array(z.string()).optional(),
      file_names: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  documents: z.array(z.string()).nullable().optional(),
})

export type RagJobResponse = z.infer<typeof RagJobResponseSchema>

export type RagJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'unknown'

export interface RagJobSnapshot {
  id: string
  status: RagJobStatus
  rawStatus: string
  detail?: string | null
  error?: string | null
  documents: string[]
}

export function normalizeRagJobStatus(rawStatus?: string): RagJobStatus {
  const status = rawStatus?.toLowerCase() ?? ''
  if (['pending', 'queued', 'waiting'].some((value) => status.includes(value))) return 'queued'
  if (
    ['running', 'processing', 'in_progress', 'in-progress', 'active', 'started'].some((value) =>
      status.includes(value),
    )
  )
    return 'running'
  if (['succeeded', 'success', 'completed', 'complete', 'done', 'finished'].some((value) => status.includes(value)))
    return 'succeeded'
  if (['failed', 'error', 'errored', 'terminated', 'timeout'].some((value) => status.includes(value))) return 'failed'
  if (['cancelled', 'canceled', 'aborted'].some((value) => status.includes(value))) return 'cancelled'
  return 'unknown'
}

export function normalizeRagJob(data: RagJobResponse): RagJobSnapshot {
  const documents = [
    ...(data.documents ?? []),
    ...(data.result?.documents ?? []),
    ...(data.result?.file_names ?? []),
  ].filter(Boolean)

  const id = data.job_id ?? data.id ?? ''
  const status = normalizeRagJobStatus(data.status)

  return {
    id,
    status,
    rawStatus: data.status ?? 'unknown',
    detail: data.detail ?? data.message ?? null,
    error: data.error ?? data.error_message ?? null,
    documents: Array.from(new Set(documents)),
  }
}

export function isRagJobDone(status: RagJobStatus) {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled'
}

export function isRagJobSuccessful(status: RagJobStatus) {
  return status === 'succeeded'
}

export async function fetchRagJobStatus(jobId: string): Promise<RagJobSnapshot> {
  const data = await request<unknown>({
    url: routes.ragJob(jobId),
    method: 'GET',
    target: 'rag',
    timeout: 15_000,
  })

  const parsed = RagJobResponseSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error('Ongeldig antwoord van RAG job status endpoint')
  }

  const snapshot = normalizeRagJob(parsed.data)
  return snapshot.id ? snapshot : { ...snapshot, id: jobId }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('Polling geannuleerd'))
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

export interface WaitForRagJobOptions {
  pollIntervalMs?: number
  timeoutMs?: number
  signal?: AbortSignal
  onUpdate?: (snapshot: RagJobSnapshot) => void
  initialSnapshot?: RagJobSnapshot
}

export async function waitForRagJobCompletion(
  jobId: string,
  options: WaitForRagJobOptions = {},
): Promise<RagJobSnapshot> {
  const intervalMs = options.pollIntervalMs ?? 2_000
  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1_000
  const startedAt = Date.now()

  let snapshot = options.initialSnapshot ?? (await fetchRagJobStatus(jobId))
  options.onUpdate?.(snapshot)

  while (!isRagJobDone(snapshot.status)) {
    if (options.signal?.aborted) {
      throw new Error('Polling geannuleerd')
    }
    const elapsed = Date.now() - startedAt
    if (elapsed > timeoutMs) {
      throw new Error(`RAG job ${jobId} haalde geen eindstatus binnen ${Math.round(timeoutMs / 1000)}s`)
    }

    await sleep(intervalMs, options.signal)
    snapshot = await fetchRagJobStatus(jobId)
    options.onUpdate?.(snapshot)
  }

  return snapshot
}
