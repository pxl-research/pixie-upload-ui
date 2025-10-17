import {
  Alert,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Icon,
  Input,
  Stack,
  Text,
  Textarea,
  Field,
} from '@chakra-ui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ChangeEvent, DragEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuUpload } from 'react-icons/lu'
import { z } from 'zod'
import type { DocumentDto } from '@/api/types'
import { useUploadDocumentMutation, type UploadDocumentVariables } from '@/hooks/useDocuments'
import { useToast } from '@/hooks/useToast'
import { describeAcceptedFileTypes, isTabularFile } from '@/utils/fileValidation'

interface UploadPanelProps {
  collectionName?: string
  onUploadCompleted?: (documents: DocumentDto[]) => void
}

const schema = z.object({
  product_prefix: z
    .string()
    .max(64, 'Maximaal 64 karakters')
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .optional(),
  language: z
    .string()
    .max(8, 'Maximaal 8 karakters')
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .optional(),
  description: z
    .string()
    .max(256, 'Maximaal 256 karakters')
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .optional(),
})

type FormValues = z.infer<typeof schema>

const ACCEPT_ATTRIBUTE = '.csv,.tsv,.xls,.xlsx'

export function UploadPanel({ collectionName, onUploadCompleted }: UploadPanelProps) {
  const toast = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const mutation = useUploadDocumentMutation(collectionName)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { product_prefix: '', language: '', description: '' },
  })

  useEffect(() => {
    if (!collectionName) {
      reset()
      setSelectedFile(null)
    }
  }, [collectionName, reset])

  const isUploading = mutation.isPending || isSubmitting

  const acceptedExtensionsDescription = useMemo(
    () => describeAcceptedFileTypes(),
    [],
  )

  const resetUploadState = () => {
    setSelectedFile(null)
    abortControllerRef.current = null
    reset({ product_prefix: '', language: '', description: '' })
  }

  const handleFile = (file: File) => {
    if (!isTabularFile(file)) {
      toast({
        title: 'Bestand niet ondersteund',
        description: acceptedExtensionsDescription,
        status: 'warning',
      })
      return
    }

    setSelectedFile(file)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!event.dataTransfer.files?.length) return
    const file = event.dataTransfer.files[0]
    handleFile(file)
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!collectionName) {
      toast({
        title: 'Selecteer eerst een collectie',
        status: 'info',
      })
      return
    }

    if (!selectedFile) {
      toast({
        title: 'Geen bestand gekozen',
        description: 'Kies een CSV of Excel bestand om te uploaden.',
        status: 'warning',
      })
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const payload: UploadDocumentVariables = {
      file: selectedFile,
      product_prefix: values.product_prefix,
      description: values.description,
      language: values.language,
      signal: controller.signal,
    }

    try {
      const result = await mutation.mutateAsync(payload)
      toast({
        title: 'Upload gestart',
        description: `${selectedFile.name} wordt verwerkt`,
        status: 'success',
      })
      onUploadCompleted?.(result)
      resetUploadState()
    } catch (error) {
      if (error instanceof Error && (error.name === 'CanceledError' || error.message === 'canceled')) {
        return
      }
      const description =
        error instanceof Error ? error.message : 'Upload mislukt, probeer het opnieuw.'
      toast({
        title: 'Upload mislukt',
        description,
        status: 'error',
      })
      abortControllerRef.current = null
    }
  })

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    toast({
      title: 'Upload geannuleerd',
      status: 'info',
    })
    resetUploadState()
  }

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Heading as="h2" size="md">
          Upload nieuw document
        </Heading>
      </Card.Header>
      <Card.Body>
        {!collectionName ? (
          <Alert.Root status="info" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Selecteer eerst een collectie om te uploaden.</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        ) : (
          <Stack as="form" gap={5} onSubmit={onSubmit} id="upload-form">
            <Box
              borderWidth="2px"
              borderStyle="dashed"
              borderColor={selectedFile ? 'green.300' : 'purple.200'}
              borderRadius="lg"
              p={6}
              textAlign="center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              bg={selectedFile ? 'green.50' : undefined}
            >
              <Stack gap={3} align="center">
                <Icon as={LuUpload} boxSize={8} color="purple.500" />
                <Heading as="h3" size="sm">
                  Sleep een CSV of XLSX bestand hierheen
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  {acceptedExtensionsDescription}
                </Text>
                <Button as="label" colorScheme="purple" cursor="pointer">
                  Kies bestand
                  <Input type="file" display="none" accept={ACCEPT_ATTRIBUTE} onChange={handleFileChange} />
                </Button>
                {selectedFile ? (
                  <Text fontSize="sm" color="green.600">
                    Geselecteerd: {selectedFile.name}
                  </Text>
                ) : null}
              </Stack>
            </Box>

            <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
              <Field.Root invalid={Boolean(errors.product_prefix)}>
                <Field.Label>Product prefix (optioneel)</Field.Label>
                <Input placeholder="Bijv. SKU-" {...register('product_prefix')} />
                <Field.ErrorText>{errors.product_prefix?.message}</Field.ErrorText>
              </Field.Root>
              <Field.Root invalid={Boolean(errors.language)}>
                <Field.Label>Taal</Field.Label>
                <select 
                  {...register('language')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    borderWidth: '1px',
                    borderColor: errors.language ? '#e53e3e' : '#e2e8f0',
                    width: '100%',
                  }}
                >
                  <option value="">Selecteer</option>
                  <option value="NL">NL</option>
                  <option value="EN">EN</option>
                  <option value="FR">FR</option>
                  <option value="DE">DE</option>
                </select>
                <Field.ErrorText>{errors.language?.message}</Field.ErrorText>
              </Field.Root>
            </Stack>

            <Field.Root invalid={Boolean(errors.description)}>
              <Field.Label>Omschrijving</Field.Label>
              <Textarea
                placeholder="Interne beschrijving van het document"
                rows={3}
                {...register('description')}
              />
              <Field.ErrorText>{errors.description?.message}</Field.ErrorText>
            </Field.Root>

            <Flex justify="flex-end" gap={3}>
              {isUploading ? (
                <Button variant="ghost" onClick={handleCancel}>
                  Annuleren
                </Button>
              ) : (
                <Button variant="ghost" onClick={resetUploadState} disabled={!selectedFile}>
                  Wissen
                </Button>
              )}
              <Button
                type="submit"
                colorScheme="purple"
                loading={isUploading}
                loadingText="Uploaden"
                disabled={!selectedFile}
              >
                Uploaden
              </Button>
            </Flex>
          </Stack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
