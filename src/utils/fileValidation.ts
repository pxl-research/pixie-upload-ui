export type StorageTarget = 'pixie-tabular-db' | 'pixie-rag-db'
export const ALL_STORAGE_TARGETS: StorageTarget[] = ['pixie-tabular-db', 'pixie-rag-db']

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
    activeTargets: ['pixie-tabular-db', 'pixie-rag-db'],
    status: 'supported',
  },
  {
    extensions: ['.xls', '.xlsx'],
    label: 'Excel',
    category: 'tabular',
    activeTargets: ['pixie-tabular-db', 'pixie-rag-db'],
    status: 'supported',
    requiresPreprocessing: true,
  },
  {
    extensions: ['.md'],
    label: 'Markdown',
    category: 'unstructured',
    activeTargets: ['pixie-rag-db'],
    status: 'supported',
    requiresPreprocessing: true,
  },
  {
    extensions: ['.docx'],
    label: 'Word',
    category: 'unstructured',
    activeTargets: ['pixie-rag-db'],
    status: 'supported',
    requiresPreprocessing: true,
  },
  {
    extensions: ['.pdf'],
    label: 'PDF',
    category: 'unstructured',
    activeTargets: ['pixie-rag-db'],
    status: 'supported',
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

function filterTargets(targets: StorageTarget[], enabledTargets: StorageTarget[]) {
  return targets.filter((target) => enabledTargets.includes(target))
}

function findRule(file: File) {
  const extension = extractExtension(file.name)
  const extensionRule = EXTENSION_RULE_MAP.get(extension)
  if (extensionRule) {
    return { rule: extensionRule, extension }
  }

  if (file.type) {
    const mimeRule = MIME_TYPE_FALLBACK.get(file.type)
    if (mimeRule) {
      return { rule: mimeRule, extension }
    }
  }

  return null
}

export function getFileRule(file: File): { label: string; category: FileCategory } | null {
  const match = findRule(file)
  if (!match) return null
  return { label: match.rule.label, category: match.rule.category }
}

export function getAcceptedExtensions(enabledTargets: StorageTarget[] = ALL_STORAGE_TARGETS) {
  const accepted = new Set<string>()
  FILE_HANDLING_RULES.forEach((rule) => {
    if (filterTargets(rule.activeTargets, enabledTargets).length > 0) {
      rule.extensions.forEach((extension) => accepted.add(extension))
    }
  })
  return Array.from(accepted)
}

export function getFileHandlingPlan(
  file: File,
  enabledTargets: StorageTarget[] = ALL_STORAGE_TARGETS,
): FileHandlingPlan | null {
  const match = findRule(file)
  if (!match) return null

  const activeTargets = filterTargets(match.rule.activeTargets, enabledTargets)
  const plannedTargets = filterTargets(match.rule.plannedTargets ?? [], enabledTargets)

  if (activeTargets.length === 0) {
    return null
  }

  return {
    extension: match.extension,
    label: match.rule.label,
    category: match.rule.category,
    activeTargets,
    plannedTargets,
    status: match.rule.status,
    requiresPreprocessing: Boolean(match.rule.requiresPreprocessing),
  }
}

export function describeAcceptedFileTypes(
  enabledTargets: StorageTarget[] = ALL_STORAGE_TARGETS,
) {
  const activeRules = FILE_HANDLING_RULES.filter(
    (rule) => filterTargets(rule.activeTargets, enabledTargets).length > 0,
  )

  const supported = activeRules.filter((rule) => rule.status === 'supported').map((rule) => rule.label)
  const inProgress = activeRules.filter((rule) => rule.status === 'comingSoon').map((rule) => rule.label)

  const supportedPart =
    supported.length > 0 ? `Ondersteund: ${supported.join(', ')}.` : 'Geen ondersteunde types.'
  const inProgressPart =
    inProgress.length > 0
      ? `Binnenkort beschikbaar: ${inProgress.join(', ')}.`
      : 'Geen toekomstige types gepland.'

  return `${supportedPart} ${inProgressPart}`
}
