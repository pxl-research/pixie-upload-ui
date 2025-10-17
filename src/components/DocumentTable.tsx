import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Skeleton,
  Table,
  VStack,
} from '@chakra-ui/react'
import type { DocumentDto } from '@/api/types'

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
        ) : documents.length === 0 ? (
          <Placeholder message="Er zijn nog geen documenten in deze collectie." />
        ) : (
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
                      {Number.isFinite(document.row_count)
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
