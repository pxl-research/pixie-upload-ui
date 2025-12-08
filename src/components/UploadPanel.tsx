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
import { env } from '@/config/env'
import {
  getAcceptedExtensions,
  getFileRule,
  describeAcceptedFileTypes,
  getFileHandlingPlan,
  type FileHandlingPlan,
  type StorageTarget,
} from '@/utils/fileValidation'
import { useRagJobWatcher } from '@/hooks/useRagJobWatcher'
import type { RagJobSnapshot } from '@/api/ragJobs'

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

interface SelectedUpload {
  id: string
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
  const [selectedUploads, setSelectedUploads] = useState<SelectedUpload[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const mutation = useUploadDocumentMutation(collectionName)
  const enabledTargets = env.enabledTargets
  const { watchJobs } = useRagJobWatcher(collectionName)

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
      setSelectedUploads([])
    }
  }, [collectionName, reset])

  const isUploading = mutation.isPending || isSubmitting

  const acceptExtensions = useMemo(() => getAcceptedExtensions(enabledTargets), [enabledTargets])
  const acceptAttribute = useMemo(() => acceptExtensions.join(','), [acceptExtensions])
  const acceptedExtensionsDescription = useMemo(
    () => describeAcceptedFileTypes(enabledTargets),
    [enabledTargets],
  )

  const resetUploadState = () => {
    setSelectedUploads([])
    abortControllerRef.current = null
    reset({ language: '' })
  }

  const addFile = (file: File) => {
    const plan = getFileHandlingPlan(file, enabledTargets)
    if (!plan) {
      const rule = getFileRule(file)
      if (rule) {
        const backendDescription =
          rule.category === 'tabular'
            ? env.isTabularEnabled
              ? null
              : 'tabular backend staat uit'
            : env.isRagEnabled
              ? null
              : 'rag backend staat uit'

        toast({
          title: 'Opslag niet geactiveerd',
          description:
            backendDescription ??
            'Dit bestandstype kan niet worden opgeslagen met de huidige configuratie.',
          status: 'warning',
        })
        return
      }

      toast({
        title: 'Bestand niet ondersteund',
        description: acceptedExtensionsDescription,
        status: 'warning',
      })
      return
    }

    if (plan.status === 'comingSoon') {
      const plannedText = formatStorageTargetsSentence(plan.plannedTargets)
      toast({
        title: `${plan.label} opslag is in ontwikkeling`,
        description: plannedText
          ? `We zorgen ervoor dat deze bestanden binnenkort automatisch naar ${plannedText} worden verwerkt.`
          : 'We zorgen ervoor dat deze bestanden binnenkort automatisch verwerkt worden.',
        status: 'info',
      })
      return
    }

    const activeTargetsText =
      plan.activeTargets.length > 0 ? formatStorageTargetsSentence(plan.activeTargets) : null

    setSelectedUploads((previous) => [...previous, { id: crypto.randomUUID(), file, plan }])

    if (plan.plannedTargets.length > 0) {
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
    const files = event.target.files
    if (files?.length) {
      Array.from(files).forEach(addFile)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!event.dataTransfer.files?.length) return
    Array.from(event.dataTransfer.files).forEach(addFile)
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!collectionName) {
      toast({
        title: 'Selecteer eerst een collectie',
        status: 'info',
      })
      return
    }

    if (selectedUploads.length === 0) {
      toast({
        title: 'Geen bestand gekozen',
        description: acceptedExtensionsDescription,
        status: 'warning',
      })
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const documentsAdded: DocumentDto[] = []
    const ragJobs: Array<{ jobs: RagJobSnapshot[]; fileName: string }> = []

    try {
      toast({
        title: 'Upload gestart',
        description: `${selectedUploads.length} bestand(en) worden verwerkt`,
        status: 'success',
      })

      for (const upload of selectedUploads) {
        const payload: UploadDocumentVariables = {
          file: upload.file,
          language: values.language,
          signal: controller.signal,
          targets:
            upload.plan.activeTargets.length > 0
              ? upload.plan.activeTargets
              : (['pixie-tabular-db'] as StorageTarget[]),
        }

        try {
          const result = await mutation.mutateAsync(payload)
          documentsAdded.push(...result.documents)
          if (result.ragJobs.length > 0) {
            ragJobs.push({ jobs: result.ragJobs, fileName: upload.file.name })
          }
        } catch (error) {
          if (error instanceof Error && (error.name === 'CanceledError' || error.message === 'canceled')) {
            throw error
          }
          const description =
            error instanceof Error ? error.message : 'Upload mislukt, probeer het opnieuw.'
          toast({
            title: 'Upload mislukt',
            description: `${upload.file.name}: ${description}`,
            status: 'error',
          })
        }
      }

      if (ragJobs.length > 0) {
        const label =
          ragJobs.length === 1 ? ragJobs[0]?.fileName : `${ragJobs.length} RAG-bestanden`
        toast({
          title: 'RAG ingest draait asynchroon',
          description: `${label} volgen via job polling; we melden het als dit klaar is.`,
          status: 'info',
        })
        ragJobs.forEach(({ jobs, fileName }) => watchJobs(jobs, { fileName }))
      }

      if (documentsAdded.length > 0) {
        onUploadCompleted?.(documentsAdded)
      }
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
              borderColor={selectedUploads.length > 0 ? 'green.300' : 'purple.200'}
              borderRadius="lg"
              p={6}
              textAlign="center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              bg={selectedUploads.length > 0 ? 'green.50' : undefined}
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
                  <Input
                    type="file"
                    display="none"
                    multiple
                    accept={acceptAttribute}
                    onChange={handleFileChange}
                  />
                </Button>
                {selectedUploads.length > 0 ? (
                  <Stack gap={2} align="center" w="100%">
                    <Text fontSize="sm" color="green.600">
                      Geselecteerd: {selectedUploads.length} bestand(en)
                    </Text>
                    <Stack gap={1} maxH="160px" overflowY="auto" w="100%">
                      {selectedUploads.map((upload) => (
                        <Text key={upload.id} fontSize="xs" color="gray.700" textAlign="center">
                          {upload.file.name} ·{' '}
                          {upload.plan.activeTargets.length > 0
                            ? `Actief: ${formatStorageTargetsInline(upload.plan.activeTargets)}`
                            : 'Actieve opslag volgt'}
                          {upload.plan.plannedTargets.length > 0
                            ? ` · Gepland: ${formatStorageTargetsInline(upload.plan.plannedTargets)}`
                            : ''}
                          {upload.plan.requiresPreprocessing ? ' · Voorbewerking nodig' : ''}
                        </Text>
                      ))}
                    </Stack>
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
                <Button variant="ghost" onClick={resetUploadState} disabled={selectedUploads.length === 0}>
                  Wissen
                </Button>
              )}
              <Button
                type="submit"
                colorScheme="purple"
                loading={isUploading}
                loadingText="Uploaden"
                disabled={selectedUploads.length === 0}
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
