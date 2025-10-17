import {
  Button,
  Dialog,
  Text,
} from '@chakra-ui/react'
import type { DocumentDto } from '@/api/types'

export interface DeleteDocumentDialogProps {
  collectionName?: string
  document?: DocumentDto
  isOpen: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteDocumentDialog({
  collectionName,
  document,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteDocumentDialogProps) {
  if (!document || !collectionName) {
    return null
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => e.open ? undefined : onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>Document verwijderen</Dialog.Header>
          <Dialog.CloseTrigger disabled={isDeleting} />
          <Dialog.Body>
            <Text>
              Weet je zeker dat je het document {document.file_name} uit collectie {collectionName}
              wilt verwijderen?
            </Text>
          </Dialog.Body>
          <Dialog.Footer gap={2}>
            <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
              Annuleren
            </Button>
            <Button colorScheme="red" onClick={onConfirm} loading={isDeleting}>
              Verwijderen
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
