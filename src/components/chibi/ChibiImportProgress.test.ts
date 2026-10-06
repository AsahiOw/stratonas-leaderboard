import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChibiImportProgress } from './ChibiImportProgress'

const now = Date.parse('2026-09-28T02:30:00Z')
const job = {
  status: 'running', stage: 'inventory', total: 0, processed: 0,
  createdAt: '2026-09-28T02:23:00Z', startedAt: '2026-09-28T02:24:00Z', completedAt: null,
  heartbeatAt: '2026-09-28T02:29:50Z',
}

test('pausing tells users to wait; paused confirms shutdown is safe without a stale worker warning or ETA', () => {
  const props = { job: { ...job, stage: 'pause-requested', total: 276, processed: 93 }, now, activeItems: [], progress: [] }
  const pausing = renderToStaticMarkup(createElement(ChibiImportProgress, props))
  assert.match(pausing, /Wait for Paused before/)
  assert.doesNotMatch(pausing, /Estimated remaining/)
  const paused = renderToStaticMarkup(createElement(ChibiImportProgress, { ...props, job: { ...props.job, status: 'paused', stage: 'paused', heartbeatAt: null } }))
  assert.match(paused, /Progress is saved/)
  assert.match(paused, /shut down now/)
  assert.match(paused, /93 \/ 276 students processed/)
  assert.doesNotMatch(paused, /stopped reporting|Estimated remaining/)
})

test('download jobs show source activity and the separate import next step', () => {
  const markup = renderToStaticMarkup(createElement(ChibiImportProgress, {
    job: { ...job, mode: 'download-assets', stage: 'download' }, now, activeItems: [], progress: [],
  }))
  assert.match(markup, /Downloading Japan AssetBundles/)
  assert.doesNotMatch(markup, /students processed|Processing characters/)
  const complete = renderToStaticMarkup(createElement(ChibiImportProgress, {
    job: { ...job, mode: 'download-assets', status: 'completed', total: 204, processed: 204 }, now, activeItems: [], progress: [],
  }))
  assert.match(complete, /204 archives\/bundles ready/)
  assert.match(complete, /Choose Update all students/)
})

test('inventory shows liveness and recent scan messages without a misleading zero-percent bar', () => {
  const markup = renderToStaticMarkup(createElement(ChibiImportProgress, {
    job, now, activeItems: [], progress: [{ at: job.heartbeatAt, message: 'Completed 10/517 archives/bundles' }],
  }))
  assert.match(markup, /Scanning source files/)
  assert.match(markup, /Elapsed: 0h 6m 0s/)
  assert.match(markup, /Worker heartbeat 10s ago/)
  assert.match(markup, /Completed 10\/517 archives\/bundles/)
  assert.match(markup, /<progress[^>]*aria-label="Source inventory in progress"/)
  assert.doesNotMatch(markup, /<progress[^>]*value=/)
  assert.doesNotMatch(markup, /0 \/ 0/)
  assert.doesNotMatch(markup, /stopped reporting/)
})

test('old workers show a useful fallback and stale heartbeats show an actionable warning', () => {
  const markup = renderToStaticMarkup(createElement(ChibiImportProgress, {
    job: { ...job, heartbeatAt: '2026-09-28T02:28:00Z' }, now, activeItems: [], progress: [],
  }))
  assert.match(markup, /stopped reporting a heartbeat/)
  assert.match(markup, /Detailed scan messages appear after the worker next starts/)
})

test('conversion shows the current character and completed student count', () => {
  const markup = renderToStaticMarkup(createElement(ChibiImportProgress, {
    job: { ...job, stage: 'mapping', total: 275, processed: 12 }, now, progress: [],
    activeItems: [{ studentId: 10002, stage: 'conversion', student: { name: 'Haruna' } }],
  }))
  assert.match(markup, /Haruna · 10002 · conversion/)
  assert.match(markup, /12 \/ 275 students processed/)
  assert.match(markup, /<progress[^>]*value="12"/)
  assert.doesNotMatch(markup, /Scanning source files/)
})

test('processing shows an approximate ETA and finish time, without publishing stale or terminal estimates', () => {
  const props = {
    job: { ...job, stage: 'mapping', total: 275, processed: 55 }, now, progress: [], activeItems: [],
    processingStartedAt: '2026-09-28T02:00:00Z',
  }
  const markup = renderToStaticMarkup(createElement(ChibiImportProgress, props))
  assert.match(markup, /Estimated remaining: about 2h 0m/)
  assert.match(markup, /Estimated finish:/)
  assert.match(markup, /average processing pace/)
  const stale = renderToStaticMarkup(createElement(ChibiImportProgress, { ...props, job: { ...props.job, heartbeatAt: '2026-09-28T02:28:00Z' } }))
  assert.match(stale, /unavailable until the worker heartbeat returns/)
  assert.doesNotMatch(stale, /Estimated finish:/)
  const completed = renderToStaticMarkup(createElement(ChibiImportProgress, { ...props, job: { ...props.job, status: 'completed' } }))
  assert.doesNotMatch(completed, /Estimated remaining:/)
})
