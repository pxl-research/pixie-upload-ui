import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isRagJobSuccessful, waitForRagJobCompletion, type RagJobSnapshot } from '@/api/ragJobs'
import { queryKeys } from '@/api/queryKeys'
import { useToast } from '@/hooks/useToast'

interface WatchOptions {
  fileName?: string
}

export function useRagJobWatcher(collectionName?: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const isActiveRef = useRef(true)

  useEffect(() => {
    return () => {
      isActiveRef.current = false
    }
  }, [])

  const watchJobs = useCallback(
    (jobs: RagJobSnapshot[], options?: WatchOptions) => {
      if (!collectionName || jobs.length === 0) return

      jobs.forEach((job) => {
        const run = async () => {
          try {
            const finalStatus = await waitForRagJobCompletion(job.id, {
              initialSnapshot: job,
            })

            if (!isActiveRef.current) return

            if (isRagJobSuccessful(finalStatus.status)) {
              toast({
                title: 'RAG ingest afgerond',
                description: options?.fileName
                  ? `${options.fileName} is verwerkt in de RAG backend`
                  : `Job ${finalStatus.id} is afgerond`,
                status: 'success',
              })
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.documents(collectionName) }),
                queryClient.invalidateQueries({ queryKey: queryKeys.collections }),
              ])
            } else {
              const description = finalStatus.detail || finalStatus.error || `Job ${finalStatus.id} is mislukt`
              toast({
                title: 'RAG ingest mislukt',
                description,
                status: 'error',
              })
            }
          } catch (error) {
            if (!isActiveRef.current) return

            const description =
              error instanceof Error ? error.message : 'Kon de status van de RAG ingest niet controleren.'
            toast({
              title: 'RAG status onbekend',
              description,
              status: 'warning',
            })
          }
        }

        void run()
      })
    },
    [collectionName, queryClient, toast],
  )

  return { watchJobs }
}
