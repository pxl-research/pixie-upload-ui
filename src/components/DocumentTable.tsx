import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Skeleton,
  Stack,
  Table,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { DocumentDto, StorageTargetId } from '@/api/types'

export interface DocumentTableProps {
  collectionName?: string
  documents: DocumentDto[]
  isLoading?: boolean
  onDeleteRequest?: (document: DocumentDto) => void
  onSelectDocument?: (document: DocumentDto) => void
  deletingDocumentId?: number | string
  highlightedDocumentId?: number | string
}

export function DocumentTable({
  collectionName,
  documents,
  isLoading = false,
  onDeleteRequest,
  onSelectDocument,
  deletingDocumentId,
  highlightedDocumentId,
}: DocumentTableProps) {
  const tabularDocuments = documents.filter(
    (document) => document.storage_target === 'pixie-tabular-db',
  )
  const ragDocuments = documents.filter(
    (document) => document.storage_target === 'pixie-rag-db',
  )
  const otherDocuments = documents.filter(
    (document) =>
      document.storage_target !== 'pixie-tabular-db' &&
      document.storage_target !== 'pixie-rag-db',
  )
  const hasDocuments =
    tabularDocuments.length > 0 || ragDocuments.length > 0 || otherDocuments.length > 0

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Flex align="center" justify="space-between">
          <Heading as="h2" size="md">
            Documenten
          </Heading>
          <Badge colorScheme={documents.length > 0 ? 'purple' : 'gray'}>
            {documents.length} items
          </Badge>
        </Flex>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <TableSkeleton />
        ) : !collectionName ? (
          <Placeholder message="Selecteer een collectie om de documenten te bekijken." />
        ) : !hasDocuments ? (
          <Placeholder message="Er zijn nog geen documenten in deze collectie." />
        ) : (
          <Stack gap={6}>
            {tabularDocuments.length > 0 ? (
              <StorageSection title="Pixie Tabular DB">
                <TabularDocumentTable
                  documents={tabularDocuments}
                  highlightedDocumentId={highlightedDocumentId}
                  deletingDocumentId={deletingDocumentId}
                  onDeleteRequest={onDeleteRequest}
                  onSelectDocument={onSelectDocument}
                />
              </StorageSection>
            ) : null}

            {ragDocuments.length > 0 ? (
              <StorageSection title="Pixie RAG DB" subtitle="Voor ongestructureerde documenten">
                <SimpleDocumentList
                  documents={ragDocuments}
                  onDeleteRequest={onDeleteRequest}
                  deletingDocumentId={deletingDocumentId}
                  emptyMessage="Geen documenten in pixie-rag-db."
                />
              </StorageSection>
            ) : null}

            {otherDocuments.length > 0 ? (
              <StorageSection title="Overige opslag" subtitle="Documenten met een onbekend doel">
                <SimpleDocumentList
                  documents={otherDocuments}
                  onDeleteRequest={onDeleteRequest}
                  deletingDocumentId={deletingDocumentId}
                  emptyMessage="Geen overige documenten."
                />
              </StorageSection>
            ) : null}
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  )
}

function TableSkeleton() {
  return (
    <VStack gap={3}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton height="40px" key={String(index)} />
      ))}
    </VStack>
  )
}

function Placeholder({ message }: { message: string }) {
  return (
    <Box borderWidth="1px" borderStyle="dashed" borderRadius="md" p={6} textAlign="center">
      {message}
    </Box>
  )
}

function ColumnChips({ columnNames }: { columnNames: string[] }) {
  if (!columnNames?.length) {
    return <Box color="gray.500">n.v.t.</Box>
  }

  return (
    <VStack align="flex-start" gap={1}>
      {columnNames.slice(0, 3).map((column) => (
        <Badge key={column} variant="subtle" colorScheme="purple">
          {column}
        </Badge>
      ))}
      {columnNames.length > 3 ? (
        <Badge variant="outline">+{columnNames.length - 3} meer</Badge>
      ) : null}
    </VStack>
  )
}

interface StorageSectionProps {
  title: string
  subtitle?: string
  children: ReactNode
}

function StorageSection({ title, subtitle, children }: StorageSectionProps) {
  return (
    <Stack gap={3}>
      <Stack gap={0}>
        <Heading as="h3" size="sm">
          {title}
        </Heading>
        {subtitle ? (
          <Text fontSize="xs" color="gray.500">
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {children}
    </Stack>
  )
}

interface TabularDocumentTableProps {
  documents: DocumentDto[]
  deletingDocumentId?: number | string
  highlightedDocumentId?: number | string
  onDeleteRequest?: (document: DocumentDto) => void
  onSelectDocument?: (document: DocumentDto) => void
}

function TabularDocumentTable({
  documents,
  deletingDocumentId,
  highlightedDocumentId,
  onDeleteRequest,
  onSelectDocument,
}: TabularDocumentTableProps) {
  return (
    <Table.ScrollArea>
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Productnaam</Table.ColumnHeader>
            <Table.ColumnHeader>Bestandsnaam</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Rijen</Table.ColumnHeader>
            <Table.ColumnHeader>Kolommen</Table.ColumnHeader>
            <Table.ColumnHeader>Acties</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {documents.map((document) => (
            <Table.Row
              key={document.id}
              bg={
                highlightedDocumentId === document.id
                  ? 'green.50'
                  : undefined
              }
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              onClick={() => onSelectDocument?.(document)}
            >
              <Table.Cell>{document.product ?? 'n.v.t.'}</Table.Cell>
              <Table.Cell>{document.file_name}</Table.Cell>
              <Table.Cell textAlign="right">
                {typeof document.row_count === 'number' && Number.isFinite(document.row_count)
                  ? document.row_count.toLocaleString('nl-NL')
                  : '—'}
              </Table.Cell>
              <Table.Cell>
                <ColumnChips columnNames={document.columns ?? []} />
              </Table.Cell>
              <Table.Cell>
                <Button
                  size="xs"
                  colorScheme="red"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteRequest?.(document)
                  }}
                  loading={deletingDocumentId === document.id}
                  loadingText="Verwijderen"
                >
                  Verwijderen
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}

interface SimpleDocumentListProps {
  documents: DocumentDto[]
  deletingDocumentId?: number | string
  onDeleteRequest?: (document: DocumentDto) => void
  emptyMessage?: string
}

function SimpleDocumentList({
  documents,
  deletingDocumentId,
  onDeleteRequest,
  emptyMessage,
}: SimpleDocumentListProps) {
  if (documents.length === 0) {
    return emptyMessage ? <Text color="gray.500">{emptyMessage}</Text> : null
  }

  return (
    <VStack align="stretch" gap={3}>
      {documents.map((document) => {
        const plannedTargets = document.planned_storage_targets ?? []
        return (
          <Box key={document.id} borderWidth="1px" borderRadius="md" p={3}>
            <Stack gap={3}>
              <HStack align="flex-start" justify="space-between">
                <Stack gap={1}>
                  <Text fontWeight="semibold">{document.file_name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    Opslag: {describeTarget(document.storage_target)}
                  </Text>
                  {plannedTargets.length > 0 ? (
                    <Text fontSize="xs" color="orange.600">
                      Gepland: {describeTargets(plannedTargets)} (under construction)
                    </Text>
                  ) : null}
                </Stack>
                <Button
                  size="xs"
                  colorScheme="red"
                  variant="outline"
                  onClick={() => onDeleteRequest?.(document)}
                  loading={deletingDocumentId === document.id}
                  loadingText="Verwijderen"
                >
                  Verwijderen
                </Button>
              </HStack>
              <Wrap gap={2}>
                {document.requires_preprocessing ? (
                  <WrapItem>
                    <Badge colorScheme="purple" variant="subtle">
                      Voorbewerking vereist
                    </Badge>
                  </WrapItem>
                ) : null}
                {document.language ? (
                  <WrapItem>
                    <Badge variant="outline">Taal: {document.language}</Badge>
                  </WrapItem>
                ) : null}
              </Wrap>
              {document.description ? (
                <Text fontSize="sm">{document.description}</Text>
              ) : null}
            </Stack>
          </Box>
        )
      })}
    </VStack>
  )
}
const STORAGE_TARGET_LABELS: Record<StorageTargetId, string> = {
  'pixie-tabular-db': 'Pixie Tabular DB',
  'pixie-rag-db': 'Pixie RAG DB',
}

function formatList(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0] ?? ''
  if (values.length === 2) return `${values[0]} en ${values[1]}`
  return `${values.slice(0, -1).join(', ')} en ${values[values.length - 1]}`
}

function describeTarget(target: StorageTargetId | undefined) {
  if (!target) return 'Onbekende opslag'
  return STORAGE_TARGET_LABELS[target] ?? target
}

function describeTargets(targets: StorageTargetId[]) {
  return formatList(targets.map((target) => describeTarget(target)))
}
