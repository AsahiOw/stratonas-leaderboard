import assert from 'node:assert/strict'
import test from 'node:test'

import { assessChibiWorkerReadiness, currentChibiReadinessDiagnostics } from './worker-readiness'

const now = Date.parse('2026-09-16T00:00:00.000Z')

test('historical offline workers do not block a ready worker, but the active job owner remains actionable', () => {
  const ready = { id: 'current', online: true, readiness: { ready: true, checkedAt: null, failures: [] } }
  const offline = { id: 'old', online: false, readiness: { ready: false, checkedAt: null, failures: [{ id: 'worker-offline', label: 'worker', detail: 'offline' }] } }
  assert.deepEqual(currentChibiReadinessDiagnostics([ready, offline]), [])
  assert.deepEqual(currentChibiReadinessDiagnostics([ready, offline], 'old'), offline.readiness.failures)
  assert.deepEqual(currentChibiReadinessDiagnostics([offline]), offline.readiness.failures)
})

test('ready heartbeats without a preflight report are not considered ready', () => {
  const result = assessChibiWorkerReadiness({ id: 'legacy-worker', ready: true, lastHeartbeat: new Date(now), details: {} }, now)
  assert.equal(result.ready, false)
  assert.equal(result.failures[0]?.id, 'preflight-missing')
})

test('online preflight failures remain actionable in status data', () => {
  const result = assessChibiWorkerReadiness({
    id: 'worker',
    ready: false,
    lastHeartbeat: new Date(now),
    details: {
      preflight: {
        ready: false,
        checkedAt: '2026-09-16T00:00:00.000Z',
        failures: [{ id: 'source', label: 'source directory', detail: 'missing BAAD', remediation: 'Set CHIBI_SOURCE_DIR.' }],
      },
    },
  }, now)
  assert.equal(result.ready, false)
  assert.deepEqual(result.failures.map(failure => failure.id), ['source'])
  assert.equal(result.failures[0]?.remediation, 'Set CHIBI_SOURCE_DIR.')
})

test('an online worker is ready only with a successful preflight report', () => {
  const result = assessChibiWorkerReadiness({
    id: 'worker',
    ready: true,
    lastHeartbeat: new Date(now),
    details: { preflight: { ready: true, checkedAt: '2026-09-16T00:00:00.000Z', failures: [] } },
  }, now)
  assert.equal(result.ready, true)
  assert.equal(result.failures.length, 0)
})
