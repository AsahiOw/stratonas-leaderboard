import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

import { AdminChibi, getAdminChibiDataLabels, getAdminChibiStudentStatus, SelectedChibiStudents } from './AdminChibi'

test('initial admin markup does not claim the worker is offline or the roster is empty', () => {
  const markup = renderToStaticMarkup(createElement(AdminChibi))
  assert.match(markup, /Checking import service…/)
  assert.match(markup, /Redownload AssetBundles/)
  assert.match(markup, /Update missing animations/)
  assert.match(markup, /Students with all four available are skipped/)
  assert.match(markup, /Update all students/)
  assert.match(markup, /Export database records/)
  assert.match(markup, /Import records folder/)
  assert.match(markup, /Clean up old model files/)
  assert.match(markup, /webkitdirectory/)
  assert.match(markup, /After it finishes, choose Update missing animations or Update all students/)
  assert.match(markup, /Loading students…/)
  assert.doesNotMatch(markup, /Import service needs attention/)
  assert.doesNotMatch(markup, /0 of 0 eligible students/)
  assert.match(markup, /Loading students…/)
})

test('Chibi admin distinguishes loading and failed requests from worker offline', () => {
  assert.deepEqual(getAdminChibiDataLabels('loading', null), {
    worker: 'Checking import service…',
    roster: 'Loading students…',
  })
  assert.deepEqual(getAdminChibiDataLabels('error', null), {
    worker: 'Import service status unavailable',
    roster: 'Student list unavailable',
  })
  assert.deepEqual(getAdminChibiDataLabels('error', true), {
    worker: 'Import service status unavailable',
    roster: 'Student list unavailable',
  })
})

test('only a successfully loaded not-ready status is labeled worker offline', () => {
  assert.deepEqual(getAdminChibiDataLabels('loaded', false), {
    worker: 'Import service needs attention',
    roster: null,
  })
  assert.deepEqual(getAdminChibiDataLabels('loaded', true), {
    worker: 'Ready to import',
    roster: null,
  })
})

const selectionStudents = [
  { id: 10002, name: 'Haruna', image: '/haruna.png', portrait: null },
  { id: 10107, name: 'Chiaki', image: '/chiaki.png', portrait: null },
]
const selectionProps = { students: selectionStudents, selected: [10002, 10107], disabled: false, onRemove() {}, onClear() {}, onRebuild() {} }

test('selected students are named separately, including choices outside the current search', () => {
  const markup = renderToStaticMarkup(createElement(SelectedChibiStudents, { ...selectionProps, hiddenCount: 1 }))
  assert.match(markup, /aria-label="Selected students"/)
  assert.match(markup, /Haruna/); assert.match(markup, /Chiaki/)
  assert.match(markup, /Remove Haruna \(10002\)/)
  assert.match(markup, /Remove Chiaki \(10107\)/)
  assert.match(markup, /1 selected student is outside the current search/)
  assert.match(markup, /Rebuild selected models \(2\)/)
})

test('empty selections explain how to add students and cannot submit a rebuild', () => {
  const markup = renderToStaticMarkup(createElement(SelectedChibiStudents, { ...selectionProps, selected: [] }))
  assert.match(markup, /No students selected yet/)
  assert.match(markup, /<button[^>]*disabled=""[^>]*>Rebuild selected models \(0\)/)
})

test('selection controls remain visible but cannot change or submit during an active task or load failure', () => {
  const markup = renderToStaticMarkup(createElement(SelectedChibiStudents, { ...selectionProps, disabled: true }))
  assert.match(markup, /Haruna/); assert.match(markup, /Chiaki/)
  assert.equal(markup.match(/disabled=""/g)?.length, 4)
})

test('model readiness requires a published valid model matching the student identity', () => {
  const student = { pathName: 'haruna', chibiBinding: { status: 'available', identityPath: 'haruna', sourceIdentity: null, profile: {} as never, diagnostic: null, provenance: '', asset: { published: true, validation: { valid: true } } } }
  assert.equal(getAdminChibiStudentStatus(student), 'Ready to view')
  assert.equal(getAdminChibiStudentStatus({ ...student, chibiBinding: { ...student.chibiBinding, identityPath: 'chiaki' } }), 'Not ready to view')
  assert.equal(getAdminChibiStudentStatus({ ...student, chibiBinding: { ...student.chibiBinding, asset: { published: true, validation: { valid: false } } } }), 'Not ready to view')
  assert.equal(getAdminChibiStudentStatus({ ...student, chibiBinding: null }), 'Not imported yet')
})

test('a failed background refresh preserves the last roster and selected student IDs', async () => {
  const source = readFileSync(new URL('./AdminChibi.tsx', import.meta.url), 'utf8')
  const block = source.slice(source.indexOf('  const load = useCallback'), source.indexOf('  useEffect(() => {', source.indexOf('  const load = useCallback')))
  const js = ts.transpileModule(`${block}; return load`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const state: Record<string, unknown> = { students: selectionStudents, selected: [10002, 10107], status: { ready: true }, items: ['existing result'], itemTotal: 1 }
  const setters = ['Students', 'Status', 'Selected', 'Items', 'ItemTotal', 'DataLoadState', 'DataLoadError']
  const load = new Function('useCallback', 'fetchJson', ...setters.map(key => `set${key}`), js)(
    (callback: () => Promise<void>) => callback,
    async () => { throw new Error('Connection lost') },
    ...setters.map(key => (value: unknown) => { state[key[0].toLowerCase() + key.slice(1)] = value }),
  )
  await assert.rejects(load(), /Connection lost/)
  assert.deepEqual(state.selected, [10002, 10107])
  assert.deepEqual(state.students, selectionStudents)
  assert.deepEqual(state.status, { ready: true })
  assert.equal(state.dataLoadState, 'error')
  assert.equal(state.dataLoadError, 'Connection lost')
})

test('selected rebuild sends exactly the selected IDs, while whole-roster update keeps its existing scope', async () => {
  const source = readFileSync(new URL('./AdminChibi.tsx', import.meta.url), 'utf8')
  const block = source.slice(source.indexOf('  const enqueue ='), source.indexOf('  const candidate ='))
  const js = ts.transpileModule(`${block}; return enqueue`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const requests: { mode: string; studentIds: number[] }[] = []
  const enqueue = new Function('run', 'fetchJson', 'jsonRequest', 'selected', 'setPage', 'setMessage', js)(
    (work: () => Promise<void>) => work(), async (_url: string, body: { mode: string; studentIds: number[] }) => { requests.push(body) },
    (_method: string, body: unknown) => body, [10002, 10107], () => {}, () => {},
  )
  await enqueue('force-rebuild'); await enqueue('update'); await enqueue('update-missing-animations')
  assert.deepEqual(requests, [{ mode: 'force-rebuild', studentIds: [10002, 10107] }, { mode: 'update', studentIds: [] }, { mode: 'update-missing-animations', studentIds: [] }])
})
