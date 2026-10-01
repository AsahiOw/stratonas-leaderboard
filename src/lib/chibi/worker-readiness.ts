export type ChibiReadinessDiagnostic = { id: string; label: string; detail: string; remediation?: string }
export type ChibiWorkerReadiness = { ready: boolean; checkedAt: string | null; failures: ChibiReadinessDiagnostic[] }

export function currentChibiReadinessDiagnostics(workers: { id: string; online: boolean; readiness: ChibiWorkerReadiness }[], activeWorkerId?: string | null) {
  const relevant = workers.filter(worker => worker.online || worker.id === activeWorkerId)
  return (relevant.length ? relevant : workers.slice(0, 1)).flatMap(worker => worker.readiness.failures)
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function diagnosticValue(value: unknown): ChibiReadinessDiagnostic | null {
  const record = objectValue(value)
  if (!record || typeof record.id !== 'string' || typeof record.label !== 'string' || typeof record.detail !== 'string') return null
  return {
    id: record.id,
    label: record.label,
    detail: record.detail,
    ...(typeof record.remediation === 'string' ? { remediation: record.remediation } : {}),
  }
}

export function assessChibiWorkerReadiness(worker: { id: string; ready: boolean; lastHeartbeat: Date; details: unknown }, now = Date.now()): ChibiWorkerReadiness {
  const details = objectValue(worker.details)
  const preflight = objectValue(details?.preflight)
  const failures = Array.isArray(preflight?.failures)
    ? preflight.failures.map(diagnosticValue).filter((value): value is ChibiReadinessDiagnostic => value !== null)
    : []
  const online = now - worker.lastHeartbeat.getTime() < 90_000
  const diagnostics: ChibiReadinessDiagnostic[] = [...(!online ? [{ id: 'worker-offline', label: 'worker heartbeat', detail: `Worker ${worker.id} has not sent a heartbeat within 90 seconds.`, remediation: 'Start the Chibi worker and inspect its logs.' }] : [])]
  if (!preflight) diagnostics.push({ id: 'preflight-missing', label: 'worker preflight', detail: 'This worker did not report the source/tool/database preflight result.', remediation: 'Restart the worker after installing the Phase 4 readiness checks.' })
  diagnostics.push(...failures)
  if (preflight && preflight.ready !== true && failures.length === 0) diagnostics.push({ id: 'preflight-not-ready', label: 'worker preflight', detail: 'The worker reported that preflight is not ready, but supplied no individual failures.', remediation: 'Inspect the worker logs for the failed readiness check.' })
  if (worker.ready && preflight?.ready === true && !diagnostics.length) return { ready: online, checkedAt: typeof preflight.checkedAt === 'string' ? preflight.checkedAt : null, failures: [] }
  if (!worker.ready && preflight?.ready === true) diagnostics.push({ id: 'worker-not-ready', label: 'worker state', detail: 'The worker is online but has not advertised itself as ready.', remediation: 'Inspect the worker logs and resolve the reported startup error.' })
  return { ready: false, checkedAt: typeof preflight?.checkedAt === 'string' ? preflight.checkedAt : null, failures: diagnostics }
}
