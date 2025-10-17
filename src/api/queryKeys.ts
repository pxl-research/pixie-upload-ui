export const queryKeys = {
  collections: ['collections'] as const,
  documents: (collectionName: string) => ['documents', collectionName] as const,
}
