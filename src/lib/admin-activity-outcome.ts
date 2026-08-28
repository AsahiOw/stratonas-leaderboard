function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function numberValue(source: Record<string, unknown>, key: string) {
  return typeof source[key] === 'number' ? source[key] : 0
}

type Activity = { action: string; entityType: string; status: string; details: unknown }

export function adminActivityOutcome(activity: Activity) {
  if (activity.action !== 'IMPORT' && activity.action !== 'SYNC') return null
  const details = record(activity.details)
  const result = record(details?.result)
  const source = result || details
  if (!source) return null

  const message = typeof source.message === 'string' ? source.message.trim() : ''
  const error = typeof source.error === 'string' ? source.error.trim() : ''
  if (source.status === 'failed') {
    if (message && error && message !== error) return `${message} ${error}`
    return error || message || null
  }
  if (message) return error && message !== error ? `${message} Warning: ${error}` : message
  if (error) return error

  if (activity.entityType === 'raid XLSX') {
    const created = numberValue(source, 'playersCreated') + numberValue(source, 'clubsCreated')
      + numberValue(source, 'entriesCreated') + (record(source.raid)?.created === true ? 1 : 0)
    const updated = numberValue(source, 'playersUpdated') + numberValue(source, 'entriesUpdated')
    const skipped = Array.isArray(source.skippedRows) ? source.skippedRows.length : 0
    const review = Array.isArray(source.reviewItems) ? source.reviewItems.length : 0
    if (created + updated === 0) return `Import completed — no records changed${skipped ? `; ${skipped} rows skipped` : ''}.`
    return `Import completed — ${created} created, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}${review ? `, ${review} need review` : ''}.`
  }

  if (source.status === 'running') return `${activity.action === 'IMPORT' ? 'Import' : 'Sync'} started and is running in the background.`
  return null
}

export function presentAdminActivity<T extends Activity>(activity: T) {
  const result = record(record(activity.details)?.result)
  const status = activity.status === 'success' && result?.status === 'running' ? 'started' : activity.status
  return { ...activity, status, outcome: adminActivityOutcome(activity) }
}
