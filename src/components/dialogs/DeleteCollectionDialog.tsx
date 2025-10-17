import {
  Button,
  Dialog,
  Text,
} from '@chakra-ui/react'

export interface DeleteCollectionDialogProps {
  collectionName?: string
  isOpen: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteCollectionDialog({
  collectionName,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteCollectionDialogProps) {
  if (!collectionName) {
    return null
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => e.open ? undefined : onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>Collectie verwijderen</Dialog.Header>
          <Dialog.CloseTrigger disabled={isDeleting} />
          <Dialog.Body>
            <Text>Weet je zeker dat je collectie {collectionName} wilt verwijderen?</Text>
            <Text mt={2} fontSize="sm" color="gray.500">
              Dit verwijdert ook alle documenten binnen deze collectie.
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
