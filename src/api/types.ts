import { z } from 'zod'

export const StorageTargetSchema = z.enum(['pixie-tabular-db', 'pixie-rag-db'])
export type StorageTargetId = z.infer<typeof StorageTargetSchema>

export const CollectionSchema = z
  .object({
    id: z.number().int().nonnegative(),
    name: z.string(),
    document_count: z.number().int().nonnegative(),
    storage_targets: z.array(StorageTargetSchema).optional().default(['pixie-tabular-db']),
    planned_storage_targets: z.array(StorageTargetSchema).optional().default([]),
  })
  .transform((collection) => ({
    ...collection,
    storage_targets:
      collection.storage_targets && collection.storage_targets.length > 0
        ? collection.storage_targets
        : (['pixie-tabular-db'] as StorageTargetId[]),
  }))

export type CollectionDto = z.infer<typeof CollectionSchema>

const AttributeDescriptionSchema = z.object({}).catchall(z.unknown())

const AttributeDescriptionsSchema = z
  .object({})
  .catchall(AttributeDescriptionSchema)
  .nullable()
  .optional()

const AttributeRankUpdateSchema = z.object({}).catchall(z.number().int().positive())

export const DocumentSchema = z
  .object({
    id: z.number().int().nonnegative(),
    file_name: z.string(),
    collection: z.string(),
    storage_target: StorageTargetSchema.optional().default('pixie-tabular-db'),
    planned_storage_targets: z.array(StorageTargetSchema).optional().default([]),
    file_extension: z.string().optional().nullable(),
    original_file_type: z.string().optional().nullable(),
    product: z.string().nullable().optional(),
    row_count: z.number().int().nonnegative().nullable().optional().default(null),
    columns: z.array(z.string()).optional().default([]),
    attribute_descriptions: AttributeDescriptionsSchema,
    language: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    requires_preprocessing: z.boolean().optional().default(false),
  })
  .transform((document) => ({
    ...document,
    columns: Array.isArray(document.columns) ? document.columns : [],
    row_count:
      typeof document.row_count === 'number' && Number.isFinite(document.row_count)
        ? document.row_count
        : null,
  }))

export type DocumentDto = z.infer<typeof DocumentSchema>

export const DocumentListSchema = z.array(DocumentSchema)

export const DocumentUpdateSchema = z.object({
  product: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  language: z.string().min(1).nullable().optional(),
  attribute_ranks: AttributeRankUpdateSchema.optional(),
})

export const UploadMetadataSchema = z.object({
  product_prefix: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ocr_enabled: z.boolean().optional(),
  ocr_lang: z.string().nullable().optional(),
})

export type UploadMetadata = z.infer<typeof UploadMetadataSchema>

export const UploadResponseSchema = z.array(DocumentSchema)

export type DocumentListDto = z.infer<typeof DocumentListSchema>

export type UploadResponseDto = z.infer<typeof UploadResponseSchema>

export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>
