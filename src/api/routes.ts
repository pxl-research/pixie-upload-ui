export const routes = {
  health: '/health',
  collections: () => '/collections/',
  collection: (collectionName: string) => `/collections/${encodeURIComponent(collectionName)}`,
  collectionDocuments: (collectionName: string) =>
    `/collections/${encodeURIComponent(collectionName)}/documents/`,
  collectionDocument: (collectionName: string, documentId: string | number) =>
    `/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(
      String(documentId),
    )}`,
  productQuery: (collectionName: string, productName: string) =>
    `/collections/${encodeURIComponent(collectionName)}/products/${encodeURIComponent(productName)}/query`,
} as const
