import {
  Button,
  Input,
  Dialog,
  Text,
  Field,
} from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCreateCollectionMutation } from '@/hooks/useCollections'
import { useToast } from '@/hooks/useToast'

const schema = z.object({
  name: z
    .string()
    .min(3, 'Minimaal 3 karakters')
    .max(64, 'Maximaal 64 karakters')
    .regex(/^[\w\- ]+$/, 'Alleen letters, cijfers, spaties en streepjes'),
})

type FormValues = z.infer<typeof schema>

export interface CreateCollectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (collectionName: string) => void
}

export function CreateCollectionDialog({ isOpen, onClose, onCreated }: CreateCollectionDialogProps) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    defaultValues: { name: '' },
    resolver: zodResolver(schema),
  })

  const mutation = useCreateCollectionMutation()

  useEffect(() => {
    if (!isOpen) {
      reset({ name: '' })
    }
  }, [isOpen, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync({ name: values.name })
      toast({
        title: 'Collectie aangemaakt',
        description: `Collectie ${result.name} is aangemaakt in Pixie Tabular DB en RAG DB.`,
        status: 'success',
      })
      onCreated?.(result.name)
      onClose()
    } catch (error) {
      const description =
        error instanceof Error ? error.message : 'Kon collectie niet aanmaken'
      toast({
        title: 'Aanmaken deels of geheel mislukt',
        description,
        status: 'error',
      })
    }
  })

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => e.open ? undefined : onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>Nieuwe collectie</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body as="form" id="create-collection-form" onSubmit={onSubmit}>
            <Field.Root invalid={Boolean(errors.name)}>
              <Field.Label>Naam van de collectie</Field.Label>
              <Input
                autoFocus
                placeholder="Bijv. product-catalogus"
                {...register('name')}
              />
              <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
              <Text fontSize="xs" color="gray.500" mt={2}>
                Gebruik een beschrijvende naam die overeenkomt met de dataset.
              </Text>
            </Field.Root>
            <Text fontSize="sm" color="gray.600" mt={4}>
              Collecties worden nu aangemaakt in zowel Pixie Tabular DB als Pixie RAG DB.
            </Text>
          </Dialog.Body>
          <Dialog.Footer gap={2}>
            <Button variant="ghost" onClick={onClose}>
              Annuleren
            </Button>
            <Button
              type="submit"
              form="create-collection-form"
              colorScheme="purple"
              loading={isSubmitting || mutation.isPending}
            >
              Aanmaken
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
