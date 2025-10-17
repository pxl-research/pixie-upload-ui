const TABULAR_EXTENSIONS = ['.csv', '.tsv', '.xlsx', '.xls'] as const
const TABULAR_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

function extractExtension(fileName: string) {
  const index = fileName.lastIndexOf('.')
  if (index === -1) return ''
  return fileName.slice(index).toLowerCase()
}

export function isTabularFile(file: File) {
  const extension = extractExtension(file.name)
  if (TABULAR_EXTENSIONS.includes(extension as (typeof TABULAR_EXTENSIONS)[number])) {
    return true
  }

  if (file.type && TABULAR_MIME_TYPES.has(file.type)) {
    return true
  }

  return false
}

export function describeAcceptedFileTypes() {
  return 'Alleen CSV of Excel bestanden (CSV, XLS, XLSX)'
}
