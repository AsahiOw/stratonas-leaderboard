export type ChibiProgressEntry = { at: string; message: string }

export function estimateChibiRemainingMs(job: {
  status: string; stage: string; total: number; processed: number; heartbeatAt: string | null
}, processingStartedAt: string | null, now: number): number | null {
  if (job.status !== 'running' || job.stage === 'inventory' || job.total <= 0
    || !job.heartbeatAt || now - Date.parse(job.heartbeatAt) >= 90_000) return null
  if (job.processed >= job.total) return 0
  const elapsed = processingStartedAt ? now - Date.parse(processingStartedAt) : 0
  if (job.processed < 3 || !Number.isFinite(elapsed) || elapsed <= 0) return null
  return elapsed / job.processed * (job.total - job.processed)
}

export function appendChibiProgress(entries: ChibiProgressEntry[], message: string, now = new Date()) {
  return [...entries, { at: now.toISOString(), message: message.slice(0, 1000) }].slice(-20)
}

export function readChibiProgress(details: unknown, jobId: string): ChibiProgressEntry[] {
  if (!details || typeof details !== 'object') return []
  const record = details as { jobId?: unknown; progress?: unknown }
  if (record.jobId !== jobId || !Array.isArray(record.progress)) return []
  return record.progress.filter((entry): entry is ChibiProgressEntry =>
    !!entry && typeof entry.at === 'string' && Number.isFinite(Date.parse(entry.at)) && typeof entry.message === 'string',
  ).slice(-20).map(entry => ({ at: entry.at, message: entry.message.slice(0, 1000) }))
}
