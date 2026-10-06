'use client'

import Link from 'next/link'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { Check, RefreshCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CHIBI_ACTIONS, emptyChibiProfile, type ChibiInteractionState, type ChibiProfile } from '@/lib/chibi/types'
import { imageSrc } from '@/lib/utils'
import type { ChibiReadinessDiagnostic, ChibiWorkerReadiness } from '@/lib/chibi/worker-readiness'
import type { ChibiProgressEntry } from '@/lib/chibi/import-progress'
import { ChibiImportProgress } from './ChibiImportProgress'

type Job = { id: string; mode: string; status: string; stage: string; total: number; processed: number; imported: number; updated: number; reused: number; skipped: number; unavailable: number; reviewRequired: number; failed: number; error: string | null; createdAt: string; startedAt: string | null; completedAt: string | null; heartbeatAt: string | null }
type RosterStudent = {
  id: number; name: string; pathName: string | null; image: string; portrait: string | null
  chibiBinding: null | { status: string; sourceIdentity: string | null; identityPath: string | null; profile: ChibiProfile; diagnostic: string | null; provenance: string; asset: null | { published: boolean; validation: unknown } }
  chibiImportItems: { status: string; stage: string; diagnostic: string | null }[]
}
type Candidate = { sourceIdentity: string; fingerprint: string; conflict: boolean; clips: string[] }
type JobItem = { id: string; studentId: number; status: string; stage: string; diagnostic: string | null; asset: null | { validation: unknown } }
type Status = { checkedAt: number; ready: boolean; pauseSupported: boolean; readiness: { ready: boolean; diagnostics: ChibiReadinessDiagnostic[] }; lastSuccessfulImport: string | null; job: Job | null; processingStartedAt: string | null; progress: ChibiProgressEntry[]; activeItems: { studentId: number; stage: string; student: { name: string } }[]; workers: { id: string; platform: string; online: boolean; ready: boolean; details: unknown; readiness: ChibiWorkerReadiness }[] }
type AdminDataLoadState = 'loading' | 'error' | 'loaded'

export function getAdminChibiDataLabels(state: AdminDataLoadState, workerReady: boolean | null) {
  if (state === 'loading') return { worker: 'Checking import service…', roster: 'Loading students…' }
  if (state === 'error') return { worker: 'Import service status unavailable', roster: 'Student list unavailable' }
  return {
    worker: workerReady === null ? 'Import service status unavailable' : workerReady ? 'Ready to import' : 'Import service needs attention',
    roster: null,
  }
}

const field = 'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text'
const button = 'rounded-lg border border-border px-3 py-2 text-sm hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40'

export function getAdminChibiStudentStatus(student: Pick<RosterStudent, 'pathName' | 'chibiBinding'>) {
  const binding = student.chibiBinding
  if (!binding) return 'Not imported yet'
  const identityMatches = (binding.identityPath || '').trim().toLowerCase() === (student.pathName || '').trim().toLowerCase()
  if (binding.status === 'available' && binding.asset?.published && summarizeValidation(binding.asset.validation).valid === true && identityMatches) return 'Ready to view'
  return ({ unavailable: 'Source unavailable', failed: 'Needs attention', 'review-required': 'Needs review', unresolved: 'Needs review', blocked: 'Needs attention', pending: 'Waiting for import' } as Record<string, string>)[binding.status] || 'Not ready to view'
}

export function SelectedChibiStudents({ students, selected, disabled, hiddenCount = 0, onRemove, onClear, onRebuild }: {
  students: readonly Pick<RosterStudent, 'id' | 'name' | 'image' | 'portrait'>[]; selected: readonly number[]; disabled: boolean; hiddenCount?: number
  onRemove: (id: number) => void; onClear: () => void; onRebuild: () => void
}) {
  return <aside className="rounded-2xl border border-violet-400/25 bg-violet-400/[0.04] p-4 xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1" aria-label="Selected students">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Selected students <span className="ml-1 rounded-full bg-violet-400/15 px-2 py-0.5 text-xs text-violet-200">{selected.length}</span></h3><button type="button" className="min-h-11 text-xs text-muted2 hover:text-white disabled:opacity-40" disabled={disabled || !selected.length} onClick={onClear}>Clear selection</button></div>
    <p className="mt-2 text-xs leading-5 text-muted2">Only the students in this list will be rebuilt. Your selection stays here when you search for someone else.</p>
    <ul className="mt-3 max-h-80 space-y-2 overflow-auto" aria-label="Students selected for rebuild">
      {selected.map(id => {
        const student = students.find(student => student.id === id)
        const name = student?.name || `Student ${id}`
        return <li key={id} className="flex items-center gap-3 rounded-xl border border-violet-400/15 bg-bg/50 p-2"><Check size={14} className="shrink-0 text-violet-300" aria-hidden="true" />{student && <ProgressiveImage src={imageSrc(student.image)} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md object-cover object-top" />}<span className="min-w-0 flex-1"><strong className="block text-sm font-medium">{name}</strong><span className="text-[11px] text-muted2">Student {id}</span></span><button type="button" aria-label={`Remove ${name} (${id})`} title={`Remove ${name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/5 disabled:opacity-40" disabled={disabled} onClick={() => onRemove(id)}><X size={16} /></button></li>
      })}
    </ul>
    {!selected.length && <p className="mt-3 rounded-xl border border-dashed border-violet-400/20 p-4 text-center text-sm text-muted2">No students selected yet. Tick students in the roster to add them here.</p>}
    {hiddenCount > 0 && <p role="status" className="mt-3 text-xs text-violet-200">{hiddenCount} selected {hiddenCount === 1 ? 'student is' : 'students are'} outside the current search.</p>}
    <button type="button" className={`${button} mt-4 min-h-11 w-full border-violet-400/40 bg-violet-400/15 text-violet-100`} disabled={disabled || !selected.length} onClick={onRebuild}>Rebuild selected models ({selected.length})</button>
    <p className="mt-2 text-xs leading-5 text-muted2">Creates fresh versions for these students, even if their source files have not changed. This can take longer than a normal update.</p>
  </aside>
}

type JsonObject = Record<string, unknown>
type ValidationSummary = {
  valid: boolean | null
  warnings: string[]
  policyVersion: string | null
  blockers: string[]
  excludedRenderers: JsonObject[]
  excludedChildRendererEvents: JsonObject[]
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null
}

function asObjectArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => !!asObject(item)) : []
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function firstArray(records: JsonObject[], key: string): JsonObject[] {
  let empty: JsonObject[] = []
  for (const record of records) {
    if (Array.isArray(record[key])) {
      const items = asObjectArray(record[key])
      if (items.length) return items
      empty = items
    }
  }
  return empty
}

function firstStrings(records: JsonObject[], keys: string[]): string[] {
  let empty: string[] = []
  for (const record of records) {
    for (const key of keys) {
      if (Array.isArray(record[key])) {
        const items = strings(record[key])
        if (items.length) return items
        empty = items
      }
    }
  }
  return empty
}

function firstString(records: JsonObject[], key: string): string | null {
  for (const record of records) if (typeof record[key] === 'string' && record[key]) return record[key] as string
  return null
}

function summarizeValidation(value: unknown): ValidationSummary {
  const root = asObject(value)
  if (!root) return { valid: null, warnings: [], policyVersion: null, blockers: [], excludedRenderers: [], excludedChildRendererEvents: [] }
  const nestedValidation = asObject(root.validation)
  const renderingProfile = asObject(root.renderingProfile) ?? asObject(root.profile)
  const policy = asObject(root.policy)
  const records = [root, nestedValidation, renderingProfile, policy].filter((record): record is JsonObject => !!record)
  const validRecord = records.find(record => typeof record.valid === 'boolean')
  return {
    valid: validRecord ? validRecord.valid as boolean : null,
    warnings: strings(asObject(root.incompleteImport)?.warnings),
    policyVersion: firstString(records, 'policyVersion'),
    blockers: firstStrings(records, ['unresolved', 'blockers', 'coreBlockers']),
    excludedRenderers: firstArray(records, 'excludedRenderers'),
    excludedChildRendererEvents: firstArray(records, 'excludedChildRendererEvents'),
  }
}

function objectText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null
  try { return JSON.stringify(value) } catch { return null }
}

function exclusionLabel(item: JsonObject): { title: string; detail: string; evidence: string[]; source: string | null } {
  const name = typeof item.name === 'string' && item.name ? item.name : 'Unnamed renderer'
  const hierarchyPath = typeof item.hierarchyPath === 'string' && item.hierarchyPath ? item.hierarchyPath : null
  const reasonCode = typeof item.reasonCode === 'string' && item.reasonCode ? item.reasonCode : 'presentation-only evidence'
  return {
    title: hierarchyPath ? `${name} · ${hierarchyPath}` : name,
    detail: reasonCode,
    evidence: strings(item.evidence),
    source: objectText(item.sourceReference),
  }
}

function ValidationDiagnostics({ value, compact = false }: { value: unknown; compact?: boolean }) {
  const summary = summarizeValidation(value)
  const hasDiagnostics = summary.policyVersion || summary.valid !== null || summary.blockers.length || summary.excludedRenderers.length || summary.excludedChildRendererEvents.length
  const blocked = summary.valid === false || summary.blockers.length > 0
  if (!hasDiagnostics) return null
  return <div className={`${compact ? 'mt-1' : 'mt-2'} space-y-1 text-xs`} aria-label="Chibi validation diagnostics">
    <p className={summary.warnings.length ? 'text-amber-200' : blocked ? 'text-red-300' : summary.valid === true ? 'text-emerald-300' : 'text-amber-200'}>
      {summary.warnings.length ? 'Imported with warnings · source completeness unresolved' : blocked ? `Core blockers (${summary.blockers.length})` : summary.valid === true ? 'Core validation passed' : 'Core validation unresolved'}
      {summary.policyVersion ? ` · policy ${summary.policyVersion}` : ''}
    </p>
    {!!summary.warnings.length && <details className="rounded border border-amber-400/20 px-2 py-1">
      <summary className="cursor-pointer text-amber-200">Import warnings ({summary.warnings.length})</summary>
      <ul className="mt-1 space-y-1 text-amber-200">{summary.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
    </details>}
    {!!summary.blockers.length && <details open={blocked} className="rounded border border-red-400/20 px-2 py-1">
      <summary className="cursor-pointer text-red-300">Core blockers ({summary.blockers.length})</summary>
      <ul className="mt-1 space-y-1 text-red-200">{summary.blockers.map((blocker, index) => <li key={`${blocker}-${index}`}>{blocker}</li>)}</ul>
    </details>}
    {!!summary.excludedRenderers.length && <details className="rounded border border-amber-400/20 px-2 py-1">
      <summary className="cursor-pointer text-amber-200">Presentation-only exclusions ({summary.excludedRenderers.length})</summary>
      <ul className="mt-1 space-y-2 text-amber-100">{summary.excludedRenderers.map((item, index) => { const detail = exclusionLabel(item); return <li key={`${detail.title}-${index}`}><p>{detail.title} · {detail.detail}</p>{detail.source && <p className="break-all font-mono text-[10px] text-amber-200/70">source: {detail.source}</p>}{detail.evidence.length > 0 && <p className="text-amber-200/80">Evidence: {detail.evidence.join(' · ')}</p>}</li> })}</ul>
    </details>}
    {!!summary.excludedChildRendererEvents.length && <details className="rounded border border-amber-400/20 px-2 py-1">
      <summary className="cursor-pointer text-amber-200">Excluded presentation events ({summary.excludedChildRendererEvents.length})</summary>
      <ul className="mt-1 space-y-2 text-amber-100">{summary.excludedChildRendererEvents.map((item, index) => { const detail = exclusionLabel(item); const clip = typeof item.clip === 'string' ? item.clip : 'unknown clip'; return <li key={`${clip}-${index}`}><p>{clip} · {detail.title} · {detail.detail}</p>{detail.source && <p className="break-all font-mono text-[10px] text-amber-200/70">source: {detail.source}</p>}{detail.evidence.length > 0 && <p className="text-amber-200/80">Evidence: {detail.evidence.join(' · ')}</p>}</li> })}</ul>
    </details>}
  </div>
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Request failed.')
  return body
}
const jsonRequest = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export function AdminChibi() {
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [status, setStatus] = useState<Status | null>(null)
  const [dataLoadState, setDataLoadState] = useState<AdminDataLoadState>('loading')
  const [dataLoadError, setDataLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [review, setReview] = useState<RosterStudent | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candidateQuery, setCandidateQuery] = useState('')
  const [identity, setIdentity] = useState('')
  const [profile, setProfile] = useState<ChibiProfile>(emptyChibiProfile())
  const [previewJob, setPreviewJob] = useState<string | null>(null)
  const [items, setItems] = useState<JobItem[]>([])
  const [page, setPage] = useState(1)
  const [itemTotal, setItemTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const recordsFolder = useRef<HTMLInputElement>(null)
  const load = useCallback(async () => {
    try {
      const [roster, current] = await Promise.all([
        fetchJson<{ students: RosterStudent[] }>('/api/admin/chibi/students'),
        fetchJson<Status>('/api/admin/chibi/import/status'),
      ])
      setStudents(roster.students)
      setStatus(current)
      setDataLoadState('loaded')
      setDataLoadError(null)
    } catch (reason) {
      setDataLoadState('error')
      setDataLoadError(reason instanceof Error ? reason.message : 'Unable to load Chibi import status.')
      throw reason
    }
  }, [])
  useEffect(() => {
    let stopped = false
    const refresh = () => { if (!stopped) load().catch(() => undefined) }
    refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => { stopped = true; window.clearInterval(timer) }
  }, [load])
  useEffect(() => {
    if (!review) return
    const controller = new AbortController()
    fetchJson<{ candidates: Candidate[] }>(`/api/admin/chibi/candidates?studentId=${review.id}`, { signal: controller.signal })
      .then(body => { setCandidates(body.candidates) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
    return () => controller.abort()
  }, [review])
  const jobId = status?.job?.id
  const processed = status?.job?.processed
  useEffect(() => {
    if (!jobId) return
    const controller = new AbortController()
    fetchJson<{ items: JobItem[]; total: number }>(`/api/admin/chibi/import/jobs/${jobId}?page=${page}&pageSize=25`, { signal: controller.signal })
      .then(body => { setItems(body.items); setItemTotal(body.total) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
    return () => controller.abort()
  }, [jobId, processed, page])
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null)
    try { await work(); await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Request failed.') }
    finally { setBusy(false) }
  }
  const enqueue = (mode: string) => run(async () => {
    await fetchJson<{ jobId: string }>('/api/admin/chibi/import', jsonRequest('POST', { mode, studentIds: mode === 'force-rebuild' ? selected : [] }))
    setPage(1); setMessage(mode === 'download-assets' ? 'Japan AssetBundle download queued. When it finishes, choose an update option to import the new assets.' : mode === 'force-rebuild' ? `Rebuild queued for ${selected.length} selected students. Your selection stays visible below.` : mode === 'update-missing-animations' ? 'Update queued for students missing Idle, Walk, Pickup or Touch. Students with all four are skipped.' : mode === 'update' ? 'Full-roster update queued. Only new or changed models need processing.' : mode === 'audit' ? 'Source scan queued. This checks which models are available.' : 'Retry queued for students whose last import failed.')
  })
  const controlJob = (action: 'pause' | 'resume') => run(async () => {
    if (!status?.job) return
    await fetchJson(`/api/admin/chibi/import/jobs/${status.job.id}/control`, jsonRequest('POST', { action }))
    setMessage(action === 'pause' ? 'Pause requested. Wait for Paused before shutting down; current characters will finish first.' : 'Resume queued. Completed characters are kept; processing continues with the remaining students.')
  })
  const exportRecords = () => run(async () => {
    const result = await fetchJson<{ folder: string; students: number; models: number }>('/api/admin/chibi/records', jsonRequest('POST', { action: 'export' }))
    setMessage(`Exported ${result.students} students and ${result.models} model records to ${result.folder}. Copy this folder and the published model files to your host, then import the records folder there.`)
  })
  const importRecords = (files: File[]) => run(async () => {
    const manifests = files.filter(file => file.name === 'records.json')
    if (manifests.length !== 1) throw new Error('Choose one exported folder containing records.json.')
    if (manifests[0].size >= 64 * 1024 * 1024 - 1024) throw new Error('The records package exceeds 64 MB.')
    const records: unknown = JSON.parse(await manifests[0].text())
    const result = await fetchJson<{ students: number; models: number }>('/api/admin/chibi/records', jsonRequest('POST', { action: 'import', records }))
    setMessage(`Imported ${result.students} student bindings and ${result.models} model records. The gallery can use your copied models immediately; no conversion was run.`)
  })
  const cleanupFiles = () => run(async () => {
    const result = await fetchJson<{ removedFiles: number; freedBytes: number }>('/api/admin/chibi/records', jsonRequest('POST', { action: 'cleanup' }))
    setMessage(`Removed ${result.removedFiles} old model files and freed ${(result.freedBytes / 1024 ** 3).toFixed(2)} GiB. Current models, previews and saved exports were kept.`)
  })
  const candidate = candidates.find(value => value.sourceIdentity === identity)
  const visible = students.filter(student => `${student.id} ${student.name} ${student.pathName || ''}`.toLowerCase().includes(query.toLowerCase()))
  const beginReview = (student: RosterStudent) => {
    setReview(student); setCandidates([]); setCandidateQuery(''); setIdentity(student.chibiBinding?.sourceIdentity || '')
    setProfile(student.chibiBinding?.profile?.interactions ? student.chibiBinding.profile : emptyChibiProfile(student.pathName || String(student.id)))
    setPreviewJob(null)
  }
  const updateInteraction = (action: typeof CHIBI_ACTIONS[number], update: Partial<ChibiProfile['interactions'][typeof action]>) => {
    setProfile(current => ({ ...current, interactions: { ...current.interactions, [action]: { ...current.interactions[action], ...update } } }))
    setPreviewJob(null)
  }
  const saveMapping = () => run(async () => {
    if (!review || !candidate) return
    const body = await fetchJson<{ jobId: string }>(`/api/admin/chibi/students/${review.id}/mapping`, jsonRequest('PUT', { sourceIdentity: identity, fingerprint: candidate.fingerprint, profile }))
    setMessage(`Mapping approved for ${review.id}; validation queued (${body.jobId}).`)
  })
  const preview = () => run(async () => {
    if (!review) return
    const body = await fetchJson<{ jobId: string }>('/api/admin/chibi/preview', jsonRequest('POST', { studentId: review.id, sourceIdentity: identity, profile }))
    setPreviewJob(body.jobId); setMessage('Candidate preview queued. Open the preview to follow conversion.')
  })
  const active = ['queued', 'running', 'paused'].includes(status?.job?.status || '')
  const controlsDisabled = busy || active || dataLoadState !== 'loaded'
  const dataLabels = getAdminChibiDataLabels(dataLoadState, status?.ready ?? null)
  return <section className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">3D student models</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted2">Keep the student collection up to date, or choose specific students to rebuild their models.</p></div><Link className={button} href="/3D">Open 3D gallery ↗</Link></header>
    {(error || dataLoadError) && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300"><p>{error || dataLoadError}</p>{dataLoadError && <><p className="mt-2">Your selection is preserved. The information below may be out of date; update actions are paused until the connection returns.</p><button className={`${button} mt-3`} onClick={() => void load().catch(() => undefined)}>Try again</button></>}</div>}
    {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300">{message}</p>}
    <section className="rounded-2xl border border-border bg-white/[0.025] p-5" aria-label="Transfer Chibi database records">
      <h3 className="text-lg font-semibold">Move finished models to another server</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted2">Export the database records into Development_data/chibi-record-exports. Copy the exported folder and Development_data/chibi/published to your host, then select the records folder here. Import checks the copied model files and restores animation settings, visibility and adjustments without rebuilding models. It replaces settings for the included students; other website data stays in place.</p>
      <div className="mt-4 flex flex-wrap gap-3"><button className={button} disabled={busy || dataLoadState !== 'loaded'} onClick={exportRecords}>Export database records</button><button className={button} disabled={controlsDisabled} onClick={() => recordsFolder.current?.click()}>Import records folder</button></div>
      <input ref={recordsFolder} type="file" className="hidden" aria-label="Choose exported Chibi records folder" multiple {...{ webkitdirectory: '', directory: '' }} onChange={event => { const files = Array.from(event.currentTarget.files || []); event.currentTarget.value = ''; if (files.length) void importRecords(files) }} />
      {busy && <p role="status" className="mt-3 text-xs text-muted2">Working… Model file verification can take a few minutes. Keep this page open.</p>}
    </section>
    <section className="rounded-2xl border border-border bg-white/[0.025] p-5" aria-label="Clean up model storage">
      <h3 className="text-lg font-semibold">Keep model storage small</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted2">Removes older model revisions that are no longer used. Current student models, private previews, saved exports and files from the last 24 hours are kept. Copied models awaiting record import are also kept. Cleanup runs automatically when the import worker starts and after imports, once no jobs are waiting. Import history stays available, but removed revisions can no longer be opened.</p>
      <button className={`${button} mt-4`} disabled={controlsDisabled} onClick={cleanupFiles}>Clean up old model files</button>
    </section>
    <section className="rounded-2xl border border-border bg-white/[0.025] p-5" aria-label="Download source assets">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Step 1 · Get the latest assets</p><h3 className="mt-2 text-lg font-semibold">Download Japan AssetBundles</h3><p className="mt-2 text-sm leading-6 text-muted2">Downloads the latest model source files with BA-AD. Audio, videos and game tables are excluded. Downloads can take a while; current models stay available. After it finishes, choose Update missing animations or Update all students below.</p></div><button className={`${button} min-h-11 border-cyan-400/40 bg-cyan-400/10 text-cyan-100`} disabled={controlsDisabled} onClick={() => enqueue('download-assets')}>Redownload AssetBundles</button></div>
      {status?.job?.mode === 'download-assets' && status.job.status === 'completed' && <p role="status" className="mt-3 text-sm text-emerald-300">Download complete. Your source files are ready—choose an update option below to build the models.</p>}
    </section>
    <section className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] p-5" aria-label="Update missing animations">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Only incomplete students</p><h3 className="mt-2 text-lg font-semibold">Fill in missing animations</h3><p className="mt-2 text-sm leading-6 text-muted2">Checks only students missing Idle, Walk, Pickup or Touch, including students not imported yet. Students with all four available are skipped. To repair a model that already has all four, use Rebuild selected models below.</p><p className="mt-2 text-xs leading-5 text-muted2">Download the latest AssetBundles first when new game assets are released. Animations absent from the source files may still remain unavailable.</p></div><button className={`${button} flex min-h-11 items-center gap-2 border-emerald-400/40 bg-emerald-400/15 text-emerald-100`} disabled={controlsDisabled} onClick={() => enqueue('update-missing-animations')}><RefreshCw size={16} aria-hidden="true" />Update missing animations</button></div>
    </section>
    <section className="rounded-2xl border border-border bg-white/[0.025] p-5" aria-label="Update the full collection">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Whole collection</p><h3 className="mt-2 text-lg font-semibold">Import new models and update changed ones</h3><p className="mt-2 text-sm leading-6 text-muted2">This checks every student. Models that are already up to date are reused. To rebuild only a few students, use the selection list below.</p></div><button className={`${button} flex min-h-11 items-center gap-2 border-violet-400/40 bg-violet-400/15 text-violet-100`} disabled={controlsDisabled} onClick={() => enqueue('update')}><RefreshCw size={16} aria-hidden="true" />Update all students</button></div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs"><p className={dataLoadState === 'loaded' ? status?.ready ? 'text-emerald-300' : 'text-amber-200' : 'text-muted2'}>{dataLabels.worker}</p><p className="text-muted2">Last successful update: {dataLoadState === 'loaded' ? status?.lastSuccessfulImport ? new Date(status.lastSuccessfulImport).toLocaleString() : 'None yet' : dataLoadState === 'loading' ? 'Loading…' : 'Unavailable'}</p></div>
      {dataLoadState === 'loaded' && !status?.ready && <p className="mt-2 text-xs text-amber-200">The import service needs attention. Queued updates will wait until it is ready. Open service details below for the next steps.</p>}
      <details className="mt-4 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm text-muted2">Other actions &amp; service details</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><button className={button} disabled={controlsDisabled} onClick={() => enqueue('audit')}>Check source files</button><p className="mt-2 text-xs leading-5 text-muted2">Find available models in the local source files without rebuilding the collection.</p></div><div><button className={button} disabled={controlsDisabled} onClick={() => enqueue('retry-failed')}>Retry failed imports</button><p className="mt-2 text-xs leading-5 text-muted2">Try again only for students whose previous import failed.</p></div></div>
        {!!status?.readiness.diagnostics.length && <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100"><p className="font-semibold">Service setup: next steps</p><ul className="mt-2 space-y-2">{status.readiness.diagnostics.map((diagnostic, index) => <li key={`${diagnostic.id}-${index}`}><p>{diagnostic.label}: {diagnostic.detail}</p>{diagnostic.remediation && <p>Next step: {diagnostic.remediation}</p>}</li>)}</ul></div>}
        {status?.workers.filter(worker => worker.online).map(worker => <details key={worker.id} className="mt-3 text-xs text-muted2"><summary className="cursor-pointer">Processing service · {worker.platform} · {worker.readiness.ready ? 'ready' : 'setup needed'}</summary>{!!worker.readiness.failures.length && <ul className="mt-2 space-y-2 text-amber-200">{worker.readiness.failures.map((diagnostic, index) => <li key={`${diagnostic.id}-${index}`}><p>{diagnostic.label}: {diagnostic.detail}</p>{diagnostic.remediation && <p>Next step: {diagnostic.remediation}</p>}</li>)}</ul>}<pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap">{JSON.stringify(worker.details, null, 2)}</pre></details>)}
        {!!status?.workers.some(worker => !worker.online) && <details className="mt-3 text-xs text-muted2"><summary className="cursor-pointer">Previous service sessions ({status.workers.filter(worker => !worker.online).length})</summary><p className="mt-1">Historical records; you do not need to start an extra service for each entry.</p>{status.workers.filter(worker => !worker.online).map(worker => <p key={worker.id} className="mt-1">{worker.id} · {worker.platform} · offline</p>)}</details>}
      </details>
    </section>
    {status?.job && <section className="space-y-3 rounded-2xl border border-border p-5" aria-label="Latest update"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{status.job.status === 'paused' ? 'Update paused' : active ? 'Update in progress' : 'Latest update'}</h3>
      {active && status.job.mode !== 'download-assets' && <button className={button} disabled={busy || dataLoadState !== 'loaded' || status.job.stage === 'pause-requested'} onClick={() => void controlJob(status.job!.status === 'paused' ? 'resume' : 'pause')}>{status.job.stage === 'pause-requested' ? 'Pausing…' : status.job.status === 'paused' ? 'Resume process' : 'Pause process'}</button>}
      </div>
      <ChibiImportProgress job={status.job} progress={status.progress} activeItems={status.activeItems} now={status.checkedAt} processingStartedAt={status.processingStartedAt} />
      {status.job.status === 'running' && status.pauseSupported === false && <p className="text-xs text-amber-200">This worker started before pause support was added. Request a pause, then restart the worker once to apply it. Saved character results are kept.</p>}
      {status.job.mode !== 'download-assets' && <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted2">{(['imported', 'updated', 'reused', 'skipped', 'unavailable', 'reviewRequired', 'failed'] as const).map(key => <span key={key}>{({ imported: 'New models', updated: 'Updated', reused: 'Already up to date', skipped: 'Skipped', unavailable: 'Source unavailable', reviewRequired: 'Needs review', failed: 'Failed' })[key]}: {status.job![key]}</span>)}</div>}
      {status.job.error && <p className="text-sm text-red-300">{status.job.error}</p>}
      <details><summary className="cursor-pointer text-xs text-muted2">Technical results ({itemTotal})</summary><p className="mt-2 text-xs text-muted2">Job {status.job.id} · {status.job.mode} · {status.job.status} · {status.job.stage}</p><div className="mt-3 space-y-3 text-xs">{items.map(item => <div key={item.id}><p><Link className="text-violet-300" href={`/3D?student=${item.studentId}`}>{students.find(student => student.id === item.studentId)?.name || item.studentId}</Link> · {item.status} / {item.stage} · {item.diagnostic || 'No item diagnostic.'}</p><ValidationDiagnostics value={item.asset?.validation} compact /></div>)}</div><div className="mt-3 flex items-center gap-3"><button className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous page</button><span className="text-xs">Page {page}</span><button className={button} disabled={page * 25 >= itemTotal} onClick={() => setPage(page + 1)}>Next page</button></div></details>
    </section>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <SelectedChibiStudents students={students} selected={selected} disabled={controlsDisabled} hiddenCount={selected.filter(id => !visible.some(student => student.id === id)).length} onRemove={id => setSelected(current => current.filter(value => value !== id))} onClear={() => setSelected([])} onRebuild={() => enqueue('force-rebuild')} />
      <section className="min-w-0 xl:col-start-1 xl:row-start-1" aria-label="Choose students">
        <h3 className="font-semibold">Choose students to rebuild</h3><p className="mt-2 text-sm text-muted2">Tick a student to add them to your selection. You can search again without losing your choices.</p>
        <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-bg px-3"><Search size={18} className="text-muted2" aria-hidden="true" /><span className="sr-only">Find a student</span><input id="chibi-admin-search" className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or student ID…" /></label>
        <p className="my-3 text-xs text-muted2">{dataLabels.roster ?? `${visible.length} of ${students.length} students`}</p>
        <div className="max-h-[36rem] space-y-2 overflow-auto rounded-xl border border-border p-2">
          {visible.map(student => {
            const validation = summarizeValidation(student.chibiBinding?.asset?.validation)
            const modelStatus = getAdminChibiStudentStatus(student)
            return <article key={student.id} className={`rounded-xl border p-3 ${selected.includes(student.id) ? 'border-violet-400/40 bg-violet-400/5' : 'border-border bg-white/[0.015]'}`}>
              <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 shrink-0 accent-violet-400" aria-label={`Select ${student.name} (${student.id})`} disabled={busy || active || dataLoadState !== 'loaded'} checked={selected.includes(student.id)} onChange={event => setSelected(current => event.target.checked ? [...current, student.id] : current.filter(id => id !== student.id))} /><ProgressiveImage src={imageSrc(student.image)} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg object-cover object-top" /><span className="min-w-0 flex-1"><strong className="block text-sm font-medium">{student.name}</strong><span className="mt-1 block text-[11px] text-muted2">Student {student.id}</span></span><span className={`max-w-28 text-right text-xs ${modelStatus === 'Ready to view' ? 'text-emerald-300' : 'text-amber-200'}`}>{modelStatus}</span></label>
              {validation.warnings.length > 0 && <p className="mt-2 text-xs text-amber-200">Imported with {validation.warnings.length} warnings. Open model details for more information.</p>}
              <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-t border-border pt-2"><details className="min-w-0 flex-1 text-xs text-muted2"><summary className="cursor-pointer">Advanced model details</summary><p className="mt-2 break-words">Source path: {student.pathName || 'Not set'}</p><p className="mt-2 break-words">{student.chibiImportItems[0]?.diagnostic || student.chibiBinding?.diagnostic}</p><ValidationDiagnostics value={student.chibiBinding?.asset?.validation} compact /><button className={`${button} mt-3`} onClick={() => beginReview(student)}>Review source mapping</button></details>{modelStatus === 'Ready to view' && <Link className="shrink-0 text-xs text-violet-300" href={`/3D?student=${student.id}`}>View in 3D ↗</Link>}</div>
            </article>
          })}
          {!visible.length && <p className="p-5 text-sm text-muted2">{dataLoadState === 'loaded' ? 'No students match your search.' : dataLoadState === 'loading' ? 'Loading students…' : 'Student list unavailable.'}</p>}
        </div>
      </section>
    </div>
    {review && <section className="space-y-4 rounded-xl border border-violet-400/30 p-5" aria-label="Mapping review">
      <div className="flex items-start gap-4"><ProgressiveImage src={imageSrc(review.portrait || review.image)} alt={review.name} width={80} height={112} className="h-28 w-20 rounded-lg object-contain" /><div><h3 className="text-lg font-semibold">Advanced model setup: {review.name} · {review.id}</h3><p className="mt-1 font-mono text-sm text-muted2">{review.pathName || 'No identity path'}</p><p className="mt-2 text-sm text-muted2">Use this only to troubleshoot an incorrect student or outfit. Preview the source model before approving it; previews remain private.</p></div><button className={`${button} ml-auto`} onClick={() => setReview(null)}>Close</button></div>
      <label className="block text-sm">Search source models<input className={`${field} mt-1 w-full`} value={candidateQuery} onChange={event => setCandidateQuery(event.target.value)} /></label>
      <label className="block text-sm">Source model<select className={`${field} mt-1 w-full`} value={identity} onChange={event => { setIdentity(event.target.value); setProfile(emptyChibiProfile(review.pathName || String(review.id))); setPreviewJob(null) }}><option value="">Choose a source model</option>{candidates.filter(value => value.sourceIdentity === identity || value.sourceIdentity.toLowerCase().includes(candidateQuery.toLowerCase())).map(value => <option key={value.sourceIdentity} value={value.sourceIdentity} disabled={value.conflict}>{value.sourceIdentity}{value.conflict ? ' · SOURCE CONFLICT' : ''} · {value.clips.length} clips</option>)}</select></label>
      {!candidates.length && <p className="text-sm text-amber-200">No indexed candidates yet. Use Check source files above to find available source models.</p>}
      {candidate && <>
        <details className="text-sm"><summary>Available source clips ({candidate.clips.length})</summary><p className="mt-2 break-words font-mono text-xs text-muted2">{candidate.clips.join(', ') || 'No animation clips indexed'}</p></details>
        <label className="block text-sm">Model display label<input className={`${field} mt-1 w-full`} value={profile.label} onChange={event => setProfile({ ...profile, label: event.target.value })} /></label>
        <label className="block text-sm">Starting pose<select className={`${field} mt-1 w-full`} value={profile.initialPose || ''} onChange={event => setProfile({ ...profile, initialPose: event.target.value || null })}><option value="">Static model preview</option>{candidate.clips.map(clip => <option key={clip}>{clip}</option>)}</select></label>
        <label className="block text-sm">Default animation label<input className={`${field} mt-1 w-full`} value={profile.idleLabel} onChange={event => setProfile({ ...profile, idleLabel: event.target.value })} /></label>
        <div className="grid gap-3 md:grid-cols-2">{CHIBI_ACTIONS.map(action => <fieldset key={action} className="rounded-lg border border-border p-3"><legend className="px-2 text-sm capitalize">{action}</legend>
          <label className="block text-xs text-muted2">Availability<select className={`${field} mt-1 w-full`} value={profile.interactions[action].state} onChange={event => updateInteraction(action, { state: event.target.value as ChibiInteractionState })}>{['available', 'unsupported', 'unresolved', 'failed'].map(state => <option key={state} value={state}>{({ available: 'Ready', unsupported: 'Not supported', unresolved: 'Needs review', failed: 'Failed' } as Record<string, string>)[state]}</option>)}</select></label>
          {profile.interactions[action].state === 'available' ? <><label className="mt-2 block text-xs text-muted2">Animation clip<select className={`${field} mt-1 w-full`} value={profile.interactions[action].clip || ''} onChange={event => updateInteraction(action, { clip: event.target.value })}><option value="">Select a verified clip</option>{candidate.clips.map(clip => <option key={clip}>{clip}</option>)}</select></label><label className="mt-2 block text-xs text-muted2">Playback speed<input type="number" min="0.1" max="4" step="0.1" className={`${field} mt-1 w-full`} value={profile.interactions[action].speed ?? 1} onChange={event => updateInteraction(action, { speed: Number(event.target.value) })} /></label></> : <label className="mt-2 block text-xs text-muted2">Reason<input className={`${field} mt-1 w-full`} value={profile.interactions[action].reason || ''} onChange={event => updateInteraction(action, { reason: event.target.value })} /></label>}
        </fieldset>)}</div>
        <div className="flex flex-wrap items-center gap-3"><button className={button} disabled={controlsDisabled || candidate.conflict} onClick={preview}>Create private preview</button>{previewJob && <Link target="_blank" rel="noreferrer" className="text-sm text-violet-300" href={`/admin/chibi/preview?job=${previewJob}`}>Open private preview ↗</Link>}<button className={button} disabled={controlsDisabled || candidate.conflict} onClick={saveMapping}>Approve this model mapping</button></div>
      </>}
    </section>}
  </section>
}
