export type StorageTarget = 'pixie-tabular-db' | 'pixie-rag-db'

export type FileCategory = 'tabular' | 'unstructured'

export interface FileHandlingPlan {
  extension: string
  label: string
  category: FileCategory
  activeTargets: StorageTarget[]
  plannedTargets: StorageTarget[]
  status: 'supported' | 'comingSoon'
  requiresPreprocessing: boolean
}

interface FileHandlingRule {
  extensions: string[]
  label: string
  category: FileCategory
  activeTargets: StorageTarget[]
  plannedTargets?: StorageTarget[]
  status: FileHandlingPlan['status']
  requiresPreprocessing?: boolean
}

const FILE_HANDLING_RULES: FileHandlingRule[] = [
  {
    extensions: ['.csv', '.tsv'],
    label: 'CSV/TSV',
    category: 'tabular',
    activeTargets: ['pixie-tabular-db'],
    status: 'supported',
  },
  {
    extensions: ['.xls', '.xlsx'],
    label: 'Excel',
    category: 'tabular',
    activeTargets: ['pixie-tabular-db'],
    plannedTargets: ['pixie-rag-db'],
    status: 'supported',
    requiresPreprocessing: true,
  },
  {
    extensions: ['.md'],
    label: 'Markdown',
    category: 'unstructured',
    activeTargets: [],
    plannedTargets: ['pixie-rag-db'],
    status: 'comingSoon',
    requiresPreprocessing: true,
  },
  {
    extensions: ['.docx'],
    label: 'Word',
    category: 'unstructured',
    activeTargets: [],
    plannedTargets: ['pixie-rag-db'],
    status: 'comingSoon',
    requiresPreprocessing: true,
  },
  {
    extensions: ['.pdf'],
    label: 'PDF',
    category: 'unstructured',
    activeTargets: [],
    plannedTargets: ['pixie-rag-db'],
    status: 'comingSoon',
    requiresPreprocessing: true,
  },
]

const EXTENSION_RULE_MAP = new Map<string, FileHandlingRule>()
FILE_HANDLING_RULES.forEach((rule) => {
  rule.extensions.forEach((extension) => {
    EXTENSION_RULE_MAP.set(extension, rule)
  })
})

const MIME_TYPE_FALLBACK = new Map<string, FileHandlingRule>([
  [
    'text/csv',
    FILE_HANDLING_RULES[0],
  ],
  [
    'application/vnd.ms-excel',
    FILE_HANDLING_RULES[1],
  ],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    FILE_HANDLING_RULES[1],
  ],
])

export const ACCEPTED_EXTENSIONS = Array.from(EXTENSION_RULE_MAP.keys())

function extractExtension(fileName: string) {
  const index = fileName.lastIndexOf('.')
  if (index === -1) return ''
  return fileName.slice(index).toLowerCase()
}

export function getFileHandlingPlan(file: File): FileHandlingPlan | null {
  const extension = extractExtension(file.name)
  const extensionRule = EXTENSION_RULE_MAP.get(extension)
  if (extensionRule) {
    return {
      extension,
      label: extensionRule.label,
      category: extensionRule.category,
      activeTargets: extensionRule.activeTargets,
      plannedTargets: extensionRule.plannedTargets ?? [],
      status: extensionRule.status,
      requiresPreprocessing: Boolean(extensionRule.requiresPreprocessing),
    }
  }

  if (file.type) {
    const mimeRule = MIME_TYPE_FALLBACK.get(file.type)
    if (mimeRule) {
      return {
        extension,
      label: mimeRule.label,
      category: mimeRule.category,
      activeTargets: mimeRule.activeTargets,
      plannedTargets: mimeRule.plannedTargets ?? [],
      status: mimeRule.status,
      requiresPreprocessing: Boolean(mimeRule.requiresPreprocessing),
      }
    }
  }

  return null
}

export function describeAcceptedFileTypes() {
  const supported = FILE_HANDLING_RULES.filter((rule) => rule.status === 'supported')
    .map((rule) => rule.label)
  const inProgress = FILE_HANDLING_RULES.filter((rule) => rule.status === 'comingSoon').map(
    (rule) => rule.label,
  )

  const supportedPart =
    supported.length > 0 ? `Ondersteund: ${supported.join(', ')}.` : 'Geen ondersteunde types.'
  const inProgressPart =
    inProgress.length > 0
      ? `Binnenkort beschikbaar: ${inProgress.join(', ')}.`
      : 'Geen toekomstige types gepland.'

  return `${supportedPart} ${inProgressPart}`
}
