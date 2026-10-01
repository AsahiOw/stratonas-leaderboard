import assert from 'node:assert/strict'
import test from 'node:test'
import { appendChibiProgress, estimateChibiRemainingMs, readChibiProgress, type ChibiProgressEntry } from './import-progress'

test('ETA uses processing wall time and throughput, excluding inventory and queue time', () => {
  const now = Date.parse('2026-09-28T08:00:00Z')
  const job = { status: 'running', stage: 'mapping', total: 100, processed: 25, heartbeatAt: new Date(now - 5000).toISOString() }
  assert.equal(estimateChibiRemainingMs(job, '2026-09-28T07:00:00Z', now), 3 * 60 * 60 * 1000)
  assert.equal(estimateChibiRemainingMs({ ...job, processed: 50 }, '2026-09-28T07:00:00Z', now), 60 * 60 * 1000)
  assert.equal(estimateChibiRemainingMs({ ...job, processed: 100 }, '2026-09-28T07:00:00Z', now), 0)
  for (const change of [{ stage: 'inventory' }, { status: 'queued' }, { status: 'completed' }, { processed: 2 }, { total: 0 }, { heartbeatAt: null }, { heartbeatAt: '2026-09-28T07:58:00Z' }]) {
    assert.equal(estimateChibiRemainingMs({ ...job, ...change }, '2026-09-28T07:00:00Z', now), null)
  }
  for (const start of [null, 'invalid', '2026-09-28T09:00:00Z']) assert.equal(estimateChibiRemainingMs(job, start, now), null)
})

test('progress stays bounded and never leaks messages from a previous job', () => {
  let progress: ChibiProgressEntry[] = []
  for (let index = 0; index < 25; index++) progress = appendChibiProgress(progress, `File ${index}`, new Date(index * 1000))
  assert.equal(progress.length, 20)
  assert.equal(progress[0].message, 'File 5')
  assert.equal(appendChibiProgress(progress, 'x'.repeat(2000)).at(-1)?.message.length, 1000)
  assert.deepEqual(readChibiProgress({ jobId: 'old', progress }, 'new'), [])
  assert.deepEqual(readChibiProgress({ jobId: 'new', progress }, 'new'), progress)
  assert.deepEqual(readChibiProgress({ jobId: 'new', progress: [null, { at: 'invalid', message: 'broken' }] }, 'new'), [])
})
