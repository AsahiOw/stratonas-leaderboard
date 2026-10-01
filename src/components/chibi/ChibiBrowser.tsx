'use client'

import { useEffect, useState } from 'react'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Menu, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import styles from './ChibiBrowser.module.css'
import { ChibiViewer } from './ChibiViewer'
import { mergeChibiArrangementDocuments, type ChibiArrangementDocument, type ChibiArrangementRecord } from './chibi-arrangement'
import { filterChibiStudents, readChibiBrowserQuery, resolveChibiSelection, writeChibiBrowserQuery, type ChibiInteractionFilter } from '@/lib/chibi/browser'
import { CHIBI_ACTIONS, emptyChibiProfile, type ChibiCatalogStudent, type ChibiProfile } from '@/lib/chibi/types'
import { imageSrc } from '@/lib/utils'

const interactionLabels: Record<Exclude<ChibiInteractionFilter, 'all'>, string> = {
  idle: 'Idle', walk: 'Walk', pickup: 'Pickup', touch: 'Touch',
}

type AdminCatalogStudent = ChibiCatalogStudent & { catalogVisible: boolean; arrangement: ChibiArrangementRecord | null }

export function ChibiBrowser({ students, loadError = null, adminEnabled = false }: { students: ChibiCatalogStudent[]; loadError?: string | null; adminEnabled?: boolean }) {
  const [adminStudents, setAdminStudents] = useState<AdminCatalogStudent[]>([])
  const [adminLoadError, setAdminLoadError] = useState<string | null>(null)
  const [rosterOpen, setRosterOpen] = useState(false)
  const pathname = usePathname(), searchParams = useSearchParams()
  useEffect(() => {
    if (!adminEnabled) { setAdminStudents([]); setAdminLoadError(null); return }
    const controller = new AbortController()
    void fetchAdminRoster(controller.signal).then(value => { if (!controller.signal.aborted) { setAdminStudents(value); setAdminLoadError(null) } }).catch(cause => { if (!controller.signal.aborted) setAdminLoadError(cause instanceof Error ? cause.message : 'The admin roster could not be loaded.') })
    return () => controller.abort()
  }, [adminEnabled])
  const query = readChibiBrowserQuery(new URLSearchParams(searchParams.toString()))
  const catalogStudents = adminEnabled ? mergeAdminStudents(students, adminStudents) : students
  const filtered = filterChibiStudents(catalogStudents, query)
  const { selected, problem: selectionProblem } = resolveChibiSelection(catalogStudents, query.studentId === null ? filtered : catalogStudents, query)
  const selectedIndex = selected ? filtered.findIndex((student) => student.id === selected.id) : -1

  function navigate(next: Partial<Pick<typeof query, 'search' | 'availability' | 'interaction' | 'studentId'>>, push = false) {
    const params = writeChibiBrowserQuery({ ...query, ...next })
    const href = params.size ? `${pathname}?${params}` : pathname
    if (push) window.history.pushState(null, '', href)
    else window.history.replaceState(null, '', href)
  }
  function choose(studentId: number) { navigate({ studentId }, true); setRosterOpen(false) }
  function move(offset: number) {
    const next = filtered[selectedIndex + offset]
    if (next) choose(next.id)
  }

  function filter(next: Partial<Pick<typeof query, 'search' | 'interaction'>>) {
    navigate({ studentId: selected?.id ?? query.studentId, ...next })
  }
  const rosterError = loadError && !(adminEnabled && adminStudents.length > 0) ? loadError : null

  return <div className={`${styles.browser} ${rosterOpen ? styles.rosterOpen : ''}`}>
    <section className={styles.gallery} aria-label="3D student viewer">
      <div className={styles.studentHeader}>
        <div className="min-w-0"><p className={styles.eyebrow}><Sparkles size={12} aria-hidden="true" /> Meet your students</p><h2 className={styles.studentName}>{selected?.name || 'Student gallery'}</h2></div>
        <div className={styles.navigation}>
          <button type="button" className={styles.rosterToggle} aria-label={rosterOpen ? 'Close student search' : 'Open student search'} aria-expanded={rosterOpen} aria-controls="chibi-roster" onClick={() => setRosterOpen(value => !value)}>{rosterOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <button type="button" aria-label="Previous student" disabled={selectedIndex <= 0} onClick={() => move(-1)}><ArrowLeft size={18} /></button>
          <span>{selectedIndex >= 0 ? `${selectedIndex + 1} / ${filtered.length}` : `${filtered.length} students`}</span>
          <button type="button" aria-label="Next student" disabled={!filtered.length || selectedIndex >= filtered.length - 1} onClick={() => move(1)}><ArrowRight size={18} /></button>
        </div>
      </div>
      <div className={styles.modelArea}>
        {rosterError ? <Message title="Students unavailable" detail={rosterError} /> : selectionProblem ? <Message title="Student unavailable" detail={selectionProblem} /> : selected?.model ? <ChibiViewer key={`${selected.id}:${selected.model.assetId}:${selected.model.revision}`} model={selected.model} className={styles.viewer} showDiagnostics={adminEnabled} /> : <Message title="Find your next student" detail="Try another name or clear the filters to explore the collection." />}
      </div>
      {adminEnabled && selected?.model && <details className={styles.diagnostics}>
        <summary>Admin · Model details</summary>
        <dl><div><dt>Student ID / path</dt><dd>{selected.id} · {selected.pathName}</dd></div><div><dt>Source profile</dt><dd>{selected.model.profile.label} · {selected.model.profile.idleLabel}</dd></div><div><dt>Source identity</dt><dd>{selected.model.sourceIdentity}</dd></div><div><dt>Published revision</dt><dd>{selected.model.revision}</dd></div></dl>
      </details>}
    </section>
    <aside id="chibi-roster" className={styles.roster} aria-label="Browse students">
      <div className={styles.rosterHeading}><h2>Find a student</h2><span>{filtered.length} students</span></div>
      <div className={styles.filters}>
        <div className={styles.search}><Search size={17} aria-hidden="true" /><input id="chibi-search" aria-label="Search students" type="search" value={searchParams.get('q') ?? ''} onChange={event => filter({ search: event.target.value })} placeholder="Search students…" /></div>
        <label className={styles.interactionFilter}><SlidersHorizontal size={16} aria-hidden="true" /><span className="sr-only">Filter by interaction</span><select value={query.interaction} onChange={event => filter({ interaction: event.target.value as ChibiInteractionFilter })}><option value="all">All interactions</option>{CHIBI_ACTIONS.map(action => <option key={action} value={action}>{interactionLabels[action]}</option>)}</select></label>
      </div>
      {adminLoadError && adminEnabled && <p role="status" className="px-4 text-xs text-amber-200">Admin roster unavailable: {adminLoadError}</p>}
      <div className={styles.results} aria-label="Student results">
        {filtered.map(student => <button key={student.id} type="button" onClick={() => choose(student.id)} aria-current={selected?.id === student.id ? 'true' : undefined} className={styles.studentCard}>
          <span className={styles.portrait}>{imageSrc(student.image) ? <ProgressiveImage src={imageSrc(student.image)} alt="" fill sizes="(max-width: 767px) 48px, 52px" /> : <Sparkles size={22} aria-hidden="true" />}</span>
          <strong>{student.name}</strong><ArrowRight className={styles.cardArrow} size={16} aria-hidden="true" />
        </button>)}
        {!filtered.length && <div role="status" className={styles.empty}><p>No students found.</p><button type="button" onClick={() => filter({ search: '', interaction: 'all' })}>Clear filters</button></div>}
      </div>
      <p className={styles.rosterHint}>Choose a student. Discover a little personality.</p>
    </aside>
  </div>
}

async function fetchAdminRoster(signal?: AbortSignal) {
  const response = await fetch('/api/admin/chibi/students', { cache: 'no-store', ...(signal ? { signal } : {}) })
  const body = await response.json().catch(() => null) as unknown
  if (!response.ok) throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'The admin roster could not be loaded.')
  if (!isRecord(body) || !Array.isArray(body.students)) throw new Error('The admin roster response was invalid.')
  return body.students.map(value => adminCatalogStudent(value)).filter((value): value is AdminCatalogStudent => !!value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function arrangementDocument(value: unknown): ChibiArrangementDocument {
  if (!isRecord(value) || !isRecord(value.nodes)) return { schemaVersion: 1, nodes: {} }
  return { schemaVersion: 1, nodes: value.nodes as ChibiArrangementDocument['nodes'] }
}

function normalizeArrangementRecord(value: unknown, fallback: ChibiArrangementRecord | null): ChibiArrangementRecord | null {
  if (!isRecord(value)) return fallback
  const assetId = typeof value.assetId === 'string' ? value.assetId : fallback?.assetId
  const checksum = typeof value.checksum === 'string' ? value.checksum : fallback?.checksum
  if (!assetId || !checksum) return fallback
  const arrangementDefault = arrangementDocument(value.arrangementDefault)
  const effectiveArrangement = arrangementDocument(value.effectiveArrangement)
  const allowedNodes: ChibiArrangementRecord['allowedNodes'] = Array.isArray(value.allowedNodes) ? value.allowedNodes.flatMap(node => {
    if (!isRecord(node) || typeof node.key !== 'string' || (node.kind !== 'model' && node.kind !== 'equipment' && node.kind !== 'face-layer') || typeof node.label !== 'string') return []
    return [{ key: node.key, kind: node.kind as 'model' | 'equipment' | 'face-layer', label: node.label }]
  }) : (fallback?.allowedNodes ?? [])
  return { assetId, checksum, arrangementDefault, effectiveArrangement, allowedNodes }
}

function adminCatalogStudent(value: unknown): AdminCatalogStudent | null {
  if (!isRecord(value) || !Number.isInteger(value.id) || typeof value.name !== 'string') return null
  const binding = isRecord(value.chibiBinding) ? value.chibiBinding : null
  const asset = binding && isRecord(binding.asset) ? binding.asset : null
  const pathName = typeof value.pathName === 'string' ? value.pathName : null
  const identityPath = binding && typeof binding.identityPath === 'string' ? binding.identityPath : null
  // Keep the admin preview's active-binding eligibility identical to the
  // public mapper. A missing identity is not evidence that the asset belongs
  // to this student, even though the guarded admin roster includes the row.
  const identityMatches = (identityPath || '').trim().toLowerCase() === (pathName || '').trim().toLowerCase()
  const published = asset?.published === true
  const valid = isRecord(asset?.validation) && asset.validation.valid === true
  const available = identityMatches && binding?.status === 'available' && published && valid
  const assetId = typeof asset?.id === 'string' ? asset.id : null
  const checksum = typeof asset?.checksum === 'string' ? asset.checksum : null
  const rawArrangement = isRecord(value.arrangement) ? value.arrangement : binding && isRecord(binding.arrangement) ? binding.arrangement : null
  const rawDefault = rawArrangement?.arrangementDefault ?? asset?.arrangementDefault ?? binding?.arrangementDefault
  const rawEffective = rawArrangement?.effectiveArrangement
  const defaultDocument = arrangementDocument(rawDefault)
  const overrideDocument = arrangementDocument(binding?.arrangementOverride)
  const effectiveDocument = rawEffective ? arrangementDocument(rawEffective) : mergeChibiArrangementDocuments(defaultDocument, overrideDocument)
  const arrangement = assetId && checksum ? normalizeArrangementRecord({
    assetId, checksum, arrangementDefault: defaultDocument, effectiveArrangement: effectiveDocument,
    allowedNodes: rawArrangement?.allowedNodes,
  }, null) : null
  const catalogVisible = typeof value.catalogVisible === 'boolean' ? value.catalogVisible : typeof binding?.catalogVisible === 'boolean' ? binding.catalogVisible : true
  const profile = binding?.profile as ChibiProfile | undefined
  const model = available && assetId && checksum ? {
    assetId, revision: checksum, url: `/api/admin/chibi/assets/${assetId}/${checksum}.glb`,
    sourceIdentity: typeof asset?.sourceIdentity === 'string' ? asset.sourceIdentity : '',
    profile: profile || emptyChibiProfile(),
  } : null
  return {
    id: value.id as number, name: value.name, pathName,
    image: typeof value.image === 'string' ? value.image : '', portrait: typeof value.portrait === 'string' ? value.portrait : null,
    status: model ? 'viewable' : typeof binding?.status === 'string' ? binding.status : 'unavailable',
    diagnostic: typeof value.diagnostic === 'string' ? value.diagnostic : null,
    model, catalogVisible, arrangement,
  }
}

function mergeAdminStudents(publicStudents: ChibiCatalogStudent[], adminStudents: AdminCatalogStudent[]) {
  if (!adminStudents.length) return publicStudents
  const byId = new Map(publicStudents.map(student => [student.id, student]))
  for (const student of adminStudents) if (student.model) byId.set(student.id, student)
  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name) || left.id - right.id)
}

function Message({ title, detail }: { title: string; detail: string }) {
  return <div role="status" className={styles.message}><h2>{title}</h2><p>{detail}</p></div>
}
