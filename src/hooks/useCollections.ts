import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCollection,
  deleteCollection,
  fetchCollections,
  type CreateCollectionInput,
} from '@/api/collections'
import { queryKeys } from '@/api/queryKeys'

export function useCollectionsQuery() {
  return useQuery({
    queryKey: queryKeys.collections,
    queryFn: fetchCollections,
    staleTime: 60_000,
  })
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCollectionInput) => createCollection(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.collections })
    },
  })
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name }: { name: string }) => deleteCollection(name),
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
