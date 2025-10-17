export function estimateTimeRemainingMs(
  startedAt: number,
  loadedBytes: number,
  totalBytes?: number,
) {
  if (!totalBytes || totalBytes === 0 || loadedBytes === 0) {
    return undefined
  }

  const elapsedMs = performance.now() - startedAt
  const rate = loadedBytes / elapsedMs
  if (!Number.isFinite(rate) || rate <= 0) {
    return undefined
  }

  const remainingBytes = totalBytes - loadedBytes
  if (remainingBytes <= 0) {
    return 0
  }

  return remainingBytes / rate
}

export function formatDurationMs(durationMs?: number) {
  if (durationMs === undefined) {
    return 'onbekend'
  }

  const seconds = Math.ceil(durationMs / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}u ${remainingMinutes}m`
  }

  return `${minutes}m ${remainingSeconds}s`
}
