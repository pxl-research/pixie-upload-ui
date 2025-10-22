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
  Text,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import type { CollectionDto, StorageTargetId } from '@/api/types'

const STORAGE_TARGET_LABELS: Record<StorageTargetId, string> = {
  'pixie-tabular-db': 'Pixie Tabular DB',
  'pixie-rag-db': 'Pixie RAG DB',
}

function describeTarget(target: StorageTargetId | undefined) {
  if (!target) return 'Onbekende opslag'
  return STORAGE_TARGET_LABELS[target] ?? target
}

export interface CollectionSelectorProps {
  collections: CollectionDto[]
  selectedCollection?: string
  onSelect: (collectionName: string) => void
  onCreateClick: () => void
  onDeleteRequest?: (collectionName: string) => void
  highlightCollection?: string
  isLoading?: boolean
}

export function CollectionSelector({
  collections,
  selectedCollection,
  onSelect,
  onCreateClick,
  onDeleteRequest,
  highlightCollection,
  isLoading = false,
}: CollectionSelectorProps) {
  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Flex justify="space-between" align="center">
          <Heading as="h2" size="md">
            Collecties
          </Heading>
          <Button colorScheme="purple" onClick={onCreateClick}>
            Nieuwe collectie
          </Button>
        </Flex>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <Stack>
            <Skeleton height="42px" />
            <Skeleton height="42px" />
            <Skeleton height="42px" />
          </Stack>
        ) : collections.length === 0 ? (
          <EmptyHint />
        ) : (
          <VStack align="stretch" gap={2}>
            {collections.map((collection) => (
              <CollectionRow
                key={collection.name}
                collection={collection}
                isActive={collection.name === selectedCollection}
                isHighlighted={collection.name === highlightCollection}
                onSelect={() => onSelect(collection.name)}
                onDelete={() => onDeleteRequest?.(collection.name)}
              />
            ))}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}

function EmptyHint() {
  return (
    <Box borderWidth="1px" borderStyle="dashed" borderRadius="md" p={6} textAlign="center">
      <Heading as="h3" size="sm" mb={2}>
        Nog geen collecties
      </Heading>
      <Text fontSize="sm" color="gray.500">
        Maak een nieuwe collectie aan om documenten te uploaden.
      </Text>
    </Box>
  )
}

interface CollectionRowProps {
  collection: CollectionDto
  isActive: boolean
  isHighlighted?: boolean
  onSelect: () => void
  onDelete?: () => void
}

function CollectionRow({
  collection,
  isActive,
  isHighlighted = false,
  onSelect,
  onDelete,
}: CollectionRowProps) {
  const documentCount = collection.document_count ?? 0
  const storageTargets = collection.storage_targets ?? ['pixie-tabular-db']
  const plannedTargets = collection.planned_storage_targets ?? []
  return (
    <Card.Root
      variant="subtle"
      borderColor={isActive ? 'purple.500' : isHighlighted ? 'green.400' : 'gray.200'}
      borderWidth={isActive || isHighlighted ? '2px' : '1px'}
      cursor="pointer"
      onClick={onSelect}
      _hover={{ borderColor: 'purple.400' }}
      transition="border-color 0.2s ease"
    >
      <Card.Body>
        <HStack justify="space-between" align="flex-start">
          <Stack gap={0}>
            <Text fontWeight="semibold">{collection.name}</Text>
            <Wrap spacing={1} pt={1}>
              {storageTargets.map((target) => (
                <WrapItem key={`active-${target}`}>
                  <Badge colorScheme="purple" variant="subtle">
                    {describeTarget(target)}
                  </Badge>
                </WrapItem>
              ))}
              {plannedTargets.map((target) => (
                <WrapItem key={`planned-${target}`}>
                  <Badge colorScheme="orange" variant="outline">
                    {describeTarget(target)} gepland
                  </Badge>
                </WrapItem>
              ))}
            </Wrap>
          </Stack>
          <HStack gap={2} align="center">
            <Badge colorScheme={documentCount > 0 ? 'purple' : 'gray'}>
              {documentCount} documenten
            </Badge>
            {onDelete ? (
              <Button size="xs" variant="ghost" colorScheme="red" onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}>
                Verwijderen
              </Button>
            ) : null}
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
