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
import {
  ACCEPTED_EXTENSIONS,
  describeAcceptedFileTypes,
  getFileHandlingPlan,
  type FileHandlingPlan,
  type StorageTarget,
} from '@/utils/fileValidation'

interface UploadPanelProps {
  collectionName?: string
  onUploadCompleted?: (documents: DocumentDto[]) => void
}

const schema = z.object({
  language: z
    .string()
    .max(8, 'Maximaal 8 karakters')
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .optional(),
})

type FormValues = z.infer<typeof schema>

const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(',')

interface SelectedUpload {
  file: File
  plan: FileHandlingPlan
}

const STORAGE_TARGET_LABELS: Record<StorageTarget, string> = {
  'pixie-tabular-db': 'Pixie Tabular DB',
  'pixie-rag-db': 'Pixie RAG DB',
}

function formatList(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0] ?? ''
  if (values.length === 2) return `${values[0]} en ${values[1]}`
  return `${values.slice(0, -1).join(', ')} en ${values[values.length - 1]}`
}

function formatStorageTargetsSentence(targets: StorageTarget[]) {
  return formatList(targets.map((target) => STORAGE_TARGET_LABELS[target] ?? target))
}

function formatStorageTargetsInline(targets: StorageTarget[], delimiter = ' + ') {
  return targets
    .map((target) => STORAGE_TARGET_LABELS[target] ?? target)
    .join(delimiter)
}

export function UploadPanel({ collectionName, onUploadCompleted }: UploadPanelProps) {
  const toast = useToast()
  const [selectedUpload, setSelectedUpload] = useState<SelectedUpload | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const mutation = useUploadDocumentMutation(collectionName)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { language: '' },
  })

  useEffect(() => {
    if (!collectionName) {
      reset()
      setSelectedUpload(null)
    }
  }, [collectionName, reset])

  const isUploading = mutation.isPending || isSubmitting

  const acceptedExtensionsDescription = useMemo(
    () => describeAcceptedFileTypes(),
    [],
  )

  const resetUploadState = () => {
    setSelectedUpload(null)
    abortControllerRef.current = null
    reset({ language: '' })
  }

  const handleFile = (file: File) => {
    const plan = getFileHandlingPlan(file)
    if (!plan) {
      toast({
        title: 'Bestand niet ondersteund',
        description: acceptedExtensionsDescription,
        status: 'warning',
      })
      return
    }

    const plannedTargetsText =
      plan.plannedTargets.length > 0 ? formatStorageTargetsSentence(plan.plannedTargets) : null
    const activeTargetsText =
      plan.activeTargets.length > 0 ? formatStorageTargetsSentence(plan.activeTargets) : null

    setSelectedUpload({ file, plan })

    if (plan.status === 'comingSoon') {
      toast({
        title: `${plan.label} opslag is in ontwikkeling`,
        description: plannedTargetsText
          ? `We zorgen ervoor dat deze bestanden binnenkort automatisch naar ${plannedTargetsText} worden verwerkt.`
          : 'We zorgen ervoor dat deze bestanden binnenkort automatisch verwerkt worden.',
        status: 'info',
      })
    } else if (plan.plannedTargets.length > 0) {
      const plannedText = formatStorageTargetsSentence(plan.plannedTargets)
      toast({
        title: 'Extra opslag gepland',
        description: activeTargetsText
          ? `Naast ${activeTargetsText} plannen we ook ${plannedText}. Die stap wordt later geactiveerd.`
          : `We plannen opslag in ${plannedText}. Die stap wordt later geactiveerd.`,
        status: 'info',
      })
    }
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

    if (!selectedUpload) {
      toast({
        title: 'Geen bestand gekozen',
        description: acceptedExtensionsDescription,
        status: 'warning',
      })
      return
    }

    if (selectedUpload.plan.status === 'comingSoon') {
      const plannedText = formatStorageTargetsSentence(selectedUpload.plan.plannedTargets)
      toast({
        title: 'Opslag nog niet beschikbaar',
        description: plannedText
          ? `Bestanden van het type ${selectedUpload.plan.label} worden binnenkort opgeslagen in ${plannedText}.`
          : `Bestanden van het type ${selectedUpload.plan.label} worden binnenkort ondersteund.`,
        status: 'info',
      })
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const payload: UploadDocumentVariables = {
      file: selectedUpload.file,
      language: values.language,
      signal: controller.signal,
      targets:
        selectedUpload.plan.activeTargets.length > 0
          ? selectedUpload.plan.activeTargets
          : (['pixie-tabular-db'] as StorageTarget[]),
    }

    try {
      const result = await mutation.mutateAsync(payload)
      toast({
        title: 'Upload gestart',
        description: `${selectedUpload.file.name} wordt verwerkt`,
        status: 'success',
      })
      if (selectedUpload.plan.plannedTargets.length > 0) {
        const plannedText = formatStorageTargetsSentence(selectedUpload.plan.plannedTargets)
        const activeText =
          selectedUpload.plan.activeTargets.length > 0
            ? formatStorageTargetsSentence(selectedUpload.plan.activeTargets)
            : 'de primaire opslag'
        toast({
          title: 'Tweede opslag volgt',
          description: plannedText
            ? `De verwerking richting ${plannedText} wordt binnenkort toegevoegd. Voor nu staat alleen ${activeText} aan.`
            : 'Extra opslag wordt binnenkort toegevoegd. Voor nu staat slechts één doellocatie aan.',
          status: 'info',
        })
      }
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
              borderColor={selectedUpload ? 'green.300' : 'purple.200'}
              borderRadius="lg"
              p={6}
              textAlign="center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              bg={selectedUpload ? 'green.50' : undefined}
            >
              <Stack gap={3} align="center">
                <Icon as={LuUpload} boxSize={8} color="purple.500" />
                <Heading as="h3" size="sm">
                  Sleep een ondersteund bestand hierheen
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  {acceptedExtensionsDescription}
                </Text>
                <Button as="label" colorScheme="purple" cursor="pointer">
                  Kies bestand
                  <Input type="file" display="none" accept={ACCEPT_ATTRIBUTE} onChange={handleFileChange} />
                </Button>
                {selectedUpload ? (
                  <Stack gap={1} align="center">
                    <Text fontSize="sm" color="green.600">
                      Geselecteerd: {selectedUpload.file.name}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {selectedUpload.plan.activeTargets.length > 0
                        ? `Actief: ${formatStorageTargetsInline(selectedUpload.plan.activeTargets)}`
                        : 'Actieve opslag volgt'}
                    </Text>
                    {selectedUpload.plan.plannedTargets.length > 0 ? (
                      <Text fontSize="xs" color="orange.600">
                        Gepland: {formatStorageTargetsInline(selectedUpload.plan.plannedTargets)} (under
                        construction)
                      </Text>
                    ) : null}
                    {selectedUpload.plan.requiresPreprocessing ? (
                      <Text fontSize="xs" color="gray.500">
                        Voorbewerking is nodig voordat we alles opslaan.
                      </Text>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            </Box>

            <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
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

            <Flex justify="flex-end" gap={3}>
              {isUploading ? (
                <Button variant="ghost" onClick={handleCancel}>
                  Annuleren
                </Button>
              ) : (
                <Button variant="ghost" onClick={resetUploadState} disabled={!selectedUpload}>
                  Wissen
                </Button>
              )}
              <Button
                type="submit"
                colorScheme="purple"
                loading={isUploading}
                loadingText="Uploaden"
                disabled={!selectedUpload}
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
