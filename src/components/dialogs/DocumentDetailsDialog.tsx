import {
  Box,
  Badge,
  Button,
  Dialog,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  useToken,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DragEvent } from 'react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { DocumentDto, DocumentUpdateInput } from '@/api/types'

const schema = z.object({
  product: z.string().max(128, 'Maximaal 128 karakters').optional(),
  language: z.string().max(8, 'Maximaal 8 karakters').optional(),
})

type FormValues = z.infer<typeof schema>

export interface DocumentDetailsDialogProps {
  document?: DocumentDto
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: DocumentUpdateInput) => void
}

type AttributeDescriptions = NonNullable<DocumentDto['attribute_descriptions']>

const getAttributeRank = (
  descriptions: AttributeDescriptions | undefined,
  key: string,
): number | undefined => {
  const raw = descriptions?.[key]
  if (typeof raw === 'object' && raw !== null && 'rank' in raw) {
    const rankValue = (raw as { rank?: unknown }).rank
    return typeof rankValue === 'number' ? rankValue : undefined
  }
  return undefined
}

const sortColumnsByRank = (document: DocumentDto | undefined) => {
  if (!document) {
    return [] as string[]
  }

  const rankMap = document.attribute_descriptions ?? undefined

  return [...document.columns].sort((a, b) => {
    const rankA = getAttributeRank(rankMap ?? undefined, a)
    const rankB = getAttributeRank(rankMap ?? undefined, b)
    if (rankA === rankB) {
      return a.localeCompare(b)
    }
    if (rankA === undefined || rankA === null) {
      return 1
    }
    if (rankB === undefined || rankB === null) {
      return -1
    }
    return rankA - rankB
  })
}

const computeAttributeRankUpdates = (
  order: string[],
  descriptions?: DocumentDto['attribute_descriptions'],
) => {
  if (!descriptions) {
    return {}
  }

  const updates: Record<string, number> = {}

  order.forEach((column, index) => {
    const originalRank = getAttributeRank(
      descriptions as AttributeDescriptions | undefined,
      column,
    )
    if (typeof originalRank === 'number' && originalRank > 0) {
      const nextRank = index + 1
      if (nextRank !== originalRank) {
        updates[column] = nextRank
      }
    }
  })

  return updates
}

export function DocumentDetailsDialog({
  document,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: DocumentDetailsDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      product: document?.product ?? '',
      language: document?.language ?? '',
    },
  })

  const [columnOrder, setColumnOrder] = useState<string[]>(() => sortColumnsByRank(document))
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [borderColor] = useToken('colors', ['purple.500'])

  const isDropActive = dropIndex !== null

  useEffect(() => {
    if (!document) {
      reset({ product: '', language: '' })
      setColumnOrder([])
      return
    }

    reset({
      product: document.product ?? '',
      language: document.language ?? '',
    })

    setColumnOrder(sortColumnsByRank(document))
  }, [document, reset])

  const attributeRankUpdates = useMemo(() => {
    if (!document) return {}
    return computeAttributeRankUpdates(columnOrder, document.attribute_descriptions ?? undefined)
  }, [columnOrder, document])

  if (!document) {
    return null
  }

  const handleDragStart = (column: string) => (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', column)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingColumn(column)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
  }

  const moveColumn = (source: string, target?: string) => {
    setColumnOrder((previous) => {
      if (!previous.includes(source)) {
        return previous
      }
      const next = previous.filter((column) => column !== source)
      if (target) {
        const targetIndex = next.indexOf(target)
        if (targetIndex === -1) {
          next.push(source)
        } else {
          next.splice(targetIndex, 0, source)
        }
      } else {
        next.push(source)
      }
      return next
    })
  }

  const handleDragEnterItem = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDropIndex(index)
  }

  const handleDropOnItem = (targetColumn: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const source = event.dataTransfer.getData('text/plain') || draggingColumn
    if (!source || source === targetColumn) {
      setDraggingColumn(null)
      setDropIndex(null)
      return
    }
    moveColumn(source, targetColumn)
    setDraggingColumn(null)
    setDropIndex(null)
  }

  const handleDropOnContainer = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const source = event.dataTransfer.getData('text/plain') || draggingColumn
    if (!source) {
      setDraggingColumn(null)
      setDropIndex(null)
      return
    }
    moveColumn(source)
    setDraggingColumn(null)
    setDropIndex(null)
  }

  const handleDragEnd = () => {
    setDraggingColumn(null)
    setDropIndex(null)
  }

  const handleFormSubmit = handleSubmit((values) => {
    const payload: DocumentUpdateInput = {}
    const trimmedProduct = values.product?.trim() ?? ''
    const trimmedLanguage = values.language?.trim() ?? ''
    const currentProduct = document.product ?? ''
    const currentLanguage = document.language ?? ''

    if (trimmedProduct !== currentProduct) {
      payload.product = trimmedProduct.length > 0 ? trimmedProduct : null
    }

    if (trimmedLanguage !== currentLanguage) {
      payload.language = trimmedLanguage.length > 0 ? trimmedLanguage : null
    }

    const normalizedAttributeRanks = Object.entries(attributeRankUpdates).reduce<
      Record<string, number>
    >((accumulator, [key, value]) => {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed > 0) {
        accumulator[key] = parsed
      }
      return accumulator
    }, {})

    if (Object.keys(normalizedAttributeRanks).length > 0) {
      payload.attribute_ranks = normalizedAttributeRanks
    }

    onSubmit(payload)
  })

  return (
    <Dialog.Root open={isOpen} onOpenChange={(event) => (event.open ? undefined : onClose())}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="lg">
          <Dialog.Header>
            <Heading size="md">Documentdetails</Heading>
          </Dialog.Header>
          <Dialog.CloseTrigger disabled={isSaving} />
          <Dialog.Body as="form" id="document-details-form" onSubmit={handleFormSubmit}>
            <Stack gap={5}>
              <Stack gap={1} fontSize="sm">
                <Text color="gray.500">Bestandsnaam</Text>
                <Text fontWeight="medium">{document.file_name}</Text>
              </Stack>

              <Flex gap={6} fontSize="sm">
                <Stack>
                  <Text color="gray.500">Rijen</Text>
                  <Text fontWeight="medium">
                    {Number.isFinite(document.row_count)
                      ? document.row_count.toLocaleString('nl-NL')
                      : '—'}
                  </Text>
                </Stack>
                <Stack>
                  <Text color="gray.500">Kolommen</Text>
                  <Text fontWeight="medium">{document.columns.length}</Text>
                </Stack>
                <Stack>
                  <Text color="gray.500">Document ID</Text>
                  <Text fontWeight="medium">{document.id}</Text>
                </Stack>
              </Flex>

              <Stack gap={2}>
                <Heading as="h3" size="sm">
                  Bijwerken
                </Heading>
                <Field.Root invalid={Boolean(errors.product)}>
                  <Field.Label>Productnaam</Field.Label>
                  <Input placeholder="Bijv. computermonitor" {...register('product')} />
                  <Field.ErrorText>{errors.product?.message}</Field.ErrorText>
                </Field.Root>
                <Field.Root invalid={Boolean(errors.language)}>
                  <Field.Label>Taal</Field.Label>
                  <Input placeholder="Bijv. NL" maxLength={8} {...register('language')} />
                  <Field.ErrorText>{errors.language?.message}</Field.ErrorText>
                </Field.Root>
              </Stack>

              <Stack gap={2}>
                <Heading as="h3" size="sm">
                  Kolomvolgorde
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  Sorteer op basis van belang; sleep de tags om de volgorde aan te passen.
                </Text>
                {columnOrder.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">
                    Geen kolommen beschikbaar.
                  </Text>
                ) : (
                  <Wrap
                    gap={2}
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnContainer}
                    onDragEnter={() => setDropIndex(columnOrder.length)}
                    py={1}
                  >
                    {columnOrder.map((column, index) => (
                      <Fragment key={column}>
                        {isDropActive && dropIndex === index ? (
                          <WrapItem pointerEvents="none">
                            <Box
                              borderWidth="2px"
                              borderStyle="dashed"
                              borderColor={borderColor}
                              borderRadius="md"
                              minH="32px"
                              minW="60px"
                            />
                          </WrapItem>
                        ) : null}
                        <WrapItem>
                          <Badge
                            draggable
                            onDragStart={handleDragStart(column)}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnterItem(index)}
                            onDrop={handleDropOnItem(column)}
                            onDragEnd={handleDragEnd}
                            variant={draggingColumn === column ? 'solid' : 'subtle'}
                            colorScheme="purple"
                            cursor="grab"
                            userSelect="none"
                          >
                            #{index + 1} · {column}
                          </Badge>
                        </WrapItem>
                      </Fragment>
                    ))}
                    {isDropActive && dropIndex === columnOrder.length ? (
                      <WrapItem pointerEvents="none">
                        <Box
                          borderWidth="2px"
                          borderStyle="dashed"
                          borderColor={borderColor}
                          borderRadius="md"
                          minH="32px"
                          minW="60px"
                        />
                      </WrapItem>
                    ) : null}
                  </Wrap>
                )}
              </Stack>
            </Stack>
          </Dialog.Body>
          <Dialog.Footer gap={2}>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Annuleren
            </Button>
            <Button
              type="submit"
              form="document-details-form"
              colorScheme="purple"
              loading={isSaving || isSubmitting}
            >
              Opslaan
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
