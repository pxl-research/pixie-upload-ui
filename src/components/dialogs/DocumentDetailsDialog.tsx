import {
  Badge,
  Button,
  Dialog,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
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

const sortColumnsByRank = (document: DocumentDto | undefined) => {
  if (!document) {
    return [] as string[]
  }

  const rankMap = document.attribute_descriptions ?? undefined

  return [...document.columns].sort((a, b) => {
    const rankA = rankMap?.[a]?.rank
    const rankB = rankMap?.[b]?.rank
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

const equalOrder = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false
  }
  return a.every((value, index) => b[index] === value)
}

const preparePayloadColumnOrder = (
  order: string[],
  rankMap?: DocumentDto['attribute_descriptions'],
) => {
  if (!order.length) {
    return undefined
  }
  const seen = new Set<string>()
  const next = []

  for (const column of order) {
    if (seen.has(column)) {
      continue
    }
    seen.add(column)
    next.push(column)
  }

  for (const column of rankMap ? Object.keys(rankMap) : []) {
    if (!seen.has(column)) {
      next.push(column)
      seen.add(column)
    }
  }

  return next
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
  const initialColumnOrderRef = useRef<string[]>(sortColumnsByRank(document))

  useEffect(() => {
    if (!document) {
      reset({ product: '', language: '' })
      setColumnOrder([])
      initialColumnOrderRef.current = []
      return
    }

    reset({
      product: document.product ?? '',
      language: document.language ?? '',
    })

    const nextOrder = sortColumnsByRank(document)
    setColumnOrder(nextOrder)
    initialColumnOrderRef.current = nextOrder
  }, [document, reset])

  if (!document) {
    return null
  }

  const columnOrderChanged =
    columnOrder.length > 0 && !equalOrder(columnOrder, initialColumnOrderRef.current)

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

  const handleDropOnItem = (targetColumn: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const source = event.dataTransfer.getData('text/plain') || draggingColumn
    if (!source || source === targetColumn) {
      setDraggingColumn(null)
      return
    }
    moveColumn(source, targetColumn)
    setDraggingColumn(null)
  }

  const handleDropOnContainer = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const source = event.dataTransfer.getData('text/plain') || draggingColumn
    if (!source) {
      setDraggingColumn(null)
      return
    }
    moveColumn(source)
    setDraggingColumn(null)
  }

  const handleDragEnd = () => {
    setDraggingColumn(null)
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

    if (columnOrderChanged) {
      payload.column_order = preparePayloadColumnOrder(
        columnOrder,
        document.attribute_descriptions,
      )
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
                    spacing={2}
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnContainer}
                    py={1}
                  >
                    {columnOrder.map((column, index) => (
                      <WrapItem key={column}>
                        <Badge
                          draggable
                          onDragStart={handleDragStart(column)}
                          onDragOver={handleDragOver}
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
                    ))}
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
