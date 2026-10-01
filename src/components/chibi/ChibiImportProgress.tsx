import { estimateChibiRemainingMs, type ChibiProgressEntry } from '@/lib/chibi/import-progress'

type ProgressJob = {
  status: string; stage: string; total: number; processed: number
  createdAt: string; startedAt: string | null; completedAt: string | null; heartbeatAt: string | null
}
type ActiveItem = { studentId: number; stage: string; student: { name: string } }

function duration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function ChibiImportProgress({ job, progress, activeItems, now, processingStartedAt = null }: {
  job: ProgressJob; progress: ChibiProgressEntry[]; activeItems: ActiveItem[]; now: number; processingStartedAt?: string | null
}) {
  const active = job.status === 'queued' || job.status === 'running'
  const scanning = job.status === 'running' && job.stage === 'inventory'
  const heartbeatAge = job.heartbeatAt ? now - Date.parse(job.heartbeatAt) : null
  const heartbeatMissing = job.status === 'running' && (heartbeatAge === null || heartbeatAge >= 90_000)
  const elapsedSeconds = Math.max(0, Math.floor(((job.completedAt ? Date.parse(job.completedAt) : now) - Date.parse(job.startedAt || job.createdAt)) / 1000))
  const elapsed = `${Math.floor(elapsedSeconds / 3600)}h ${Math.floor(elapsedSeconds % 3600 / 60)}m ${elapsedSeconds % 60}s`
  const remaining = estimateChibiRemainingMs(job, processingStartedAt, now)
  const minutesRemaining = remaining === null ? 0 : Math.max(1, Math.ceil(remaining / 60_000))
  const eta = minutesRemaining < 60 ? `${minutesRemaining}m` : `${Math.floor(minutesRemaining / 60)}h ${minutesRemaining % 60}m`
  return <div className="space-y-2 rounded-lg border border-border bg-white/[0.025] p-3" aria-label="Import activity">
    <p className="font-medium">{scanning ? 'Scanning source files' : job.status === 'queued' ? 'Waiting for the worker' : activeItems.length ? 'Processing characters' : `Import ${job.status}`}</p>
    <p className="text-xs text-muted2">Elapsed: {elapsed}{job.status === 'running' && <> · {heartbeatAge === null ? 'Waiting for worker heartbeat' : `Worker heartbeat ${duration(heartbeatAge)} ago`} · Refreshes every 5 seconds</>}</p>
    {active && <div className="space-y-1 text-xs text-muted2">
      {remaining === null ? <p>Estimated remaining: {heartbeatMissing ? 'unavailable until the worker heartbeat returns' : scanning || job.status === 'queued' ? 'available once character processing starts' : 'calculating after the first few students…'}</p>
        : remaining === 0 ? <p>Finishing import…</p> : <><p className="text-violet-200">Estimated remaining: about {eta} · Estimated finish: {new Date(now + remaining).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</p><p>Based on this import’s average processing pace. Individual models may take longer or finish sooner.</p></>}
    </div>}
    {heartbeatMissing && <p role="alert" className="text-xs text-amber-200">The worker has stopped reporting a heartbeat. Check its terminal logs before starting another import.</p>}
    {scanning && <p className="text-xs text-muted2">Reading archives and model metadata before counting students. This can take several minutes; student progress starts after the scan finishes.</p>}
    <progress className={`w-full ${active && !job.total ? 'motion-safe:animate-pulse' : ''}`} value={active && !job.total ? undefined : job.processed} max={Math.max(job.total, 1)} aria-label={scanning ? 'Source inventory in progress' : 'Chibi import progress'} />
    {job.total > 0 && <p className="text-xs text-muted2">{job.processed} / {job.total} students processed</p>}
    {activeItems.length > 0 && <ul className="space-y-1 text-xs">{activeItems.map(item => <li key={item.studentId}>{item.student.name} · {item.studentId} · {item.stage}</li>)}</ul>}
    {progress.length > 0 ? <details><summary className="cursor-pointer text-xs font-medium">Detailed activity ({progress.length})</summary><ol className="mt-1 max-h-48 space-y-1 overflow-auto text-xs text-muted2">{progress.map((entry, index) => <li key={`${entry.at}-${index}`} className="break-words"><time dateTime={entry.at}>{new Date(entry.at).toLocaleTimeString()}</time> · {entry.message}</li>)}</ol></details> : scanning && <p className="text-xs text-muted2">Detailed scan messages appear after the worker next starts with progress reporting. Heartbeats above still update for this import.</p>}
    {active && <p className="text-xs text-muted2">Import controls are disabled while this job is active to prevent duplicate imports.</p>}
  </div>
}
