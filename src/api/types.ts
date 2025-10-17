import { z } from 'zod'

export const CollectionSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string(),
  document_count: z.number().int().nonnegative(),
})

export type CollectionDto = z.infer<typeof CollectionSchema>

const AttributeDescriptionSchema = z.object({}).catchall(z.unknown())

const AttributeDescriptionsSchema = z
  .object({})
  .catchall(AttributeDescriptionSchema)
  .nullable()
  .optional()

export const DocumentSchema = z.object({
  id: z.number().int().nonnegative(),
  file_name: z.string(),
  collection: z.string(),
  product: z.string().nullable().optional(),
  row_count: z.number().int().nonnegative(),
  columns: z.array(z.string()),
  attribute_descriptions: AttributeDescriptionsSchema,
  language: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

export type DocumentDto = z.infer<typeof DocumentSchema>

export const DocumentListSchema = z.array(DocumentSchema)

export const DocumentUpdateSchema = z.object({
  product: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  language: z.string().min(1).nullable().optional(),
  column_order: z.array(z.string().min(1)).min(1).optional(),
})

export const UploadMetadataSchema = z.object({
  product_prefix: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})

export type UploadMetadata = z.infer<typeof UploadMetadataSchema>

export const UploadResponseSchema = z.array(DocumentSchema)

export type DocumentListDto = z.infer<typeof DocumentListSchema>

export type UploadResponseDto = z.infer<typeof UploadResponseSchema>

export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>
