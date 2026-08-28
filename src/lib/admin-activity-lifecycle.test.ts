import 'dotenv/config'
import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { finishAdminActivity, recordAdminActivity } from './admin-activity'
import { presentAdminActivity } from './admin-activity-outcome'
import { prisma } from './prisma'
import { radioSyncTerminalStatus } from './radio-sync'

const jobs = [
  { action: 'IMPORT' as const, entityType: 'students', entityId: 'schaledb-students' },
  { action: 'IMPORT' as const, entityType: 'raid bosses', entityId: 'schaledb-raid-bosses' },
  { action: 'SYNC' as const, entityType: 'radio catalog', entityId: 'bluearchive-global-radio' },
  { action: 'SYNC' as const, entityType: 'Plana stats', entityId: 'plana-stats' },
  { action: 'SYNC' as const, entityType: 'memorial media', entityId: 'jaymie-memorial-media' },
]

const backgroundSources = [
  { route: 'students/import/route.ts', runner: 'student-import.ts' },
  { route: 'raid-bosses/import/route.ts', runner: 'raid-boss-import.ts' },
  { route: 'radio/sync/route.ts', runner: 'radio-sync.ts' },
  { route: 'plana/sync/route.ts', runner: 'plana-import.ts' },
  { route: 'memorial-media/sync/route.ts', runner: 'memorial-media-sync.ts' },
]

test('every manual background route requests lifecycle auditing and every runner closes it', async () => {
  for (const source of backgroundSources) {
    const route = await fs.readFile(path.join(process.cwd(), 'src', 'app', 'api', 'admin', source.route), 'utf8')
    const runner = await fs.readFile(path.join(process.cwd(), 'src', 'lib', source.runner), 'utf8')
    assert.match(route, /audit:\s*true/, `${source.route} must request a correlated activity`)
    assert.doesNotMatch(route, /withAdminMutationAudit/, `${source.route} must not create a second start-only activity`)
    assert.match(runner, /status:\s*'running'/, `${source.runner} must create a running activity`)
    assert.ok((runner.match(/finishAdminActivity\(/g) || []).length >= 2, `${source.runner} must close both success and failure paths`)
  }
})

test('dashboard presentation matches running, successful, failed, and warning terminal states', () => {
  const base = { action: 'IMPORT', entityType: 'students', details: null }
  assert.deepEqual(presentAdminActivity({ ...base, status: 'running', details: { result: { status: 'running', message: 'Still running.' } } }), {
    ...base, status: 'running', details: { result: { status: 'running', message: 'Still running.' } }, outcome: 'Still running.',
  })
  assert.equal(presentAdminActivity({ ...base, status: 'success', details: { result: { status: 'completed', message: 'Completed: 2 added.' } } }).outcome, 'Completed: 2 added.')
  assert.equal(presentAdminActivity({ ...base, status: 'failed', details: { result: { status: 'failed', message: 'Import failed.', error: 'Network unavailable.' } } }).outcome, 'Import failed. Network unavailable.')
  assert.equal(presentAdminActivity({ ...base, status: 'success', details: { result: { status: 'completed', message: 'Completed: 2 added.', error: 'Videos were skipped.' } } }).outcome, 'Completed: 2 added. Warning: Videos were skipped.')
  assert.equal(presentAdminActivity({ ...base, status: 'success', details: { result: { status: 'running', message: 'Legacy start.' } } }).status, 'started')
})

test('radio partial download failures are a failed terminal state', () => {
  assert.equal(radioSyncTerminalStatus(0), 'completed')
  assert.equal(radioSyncTerminalStatus(1), 'failed')
  assert.equal(radioSyncTerminalStatus(5), 'failed')
})

test('each background operation updates its own activity to its exact terminal state', async () => {
  const ids: string[] = []
  try {
    const activities = await Promise.all(jobs.flatMap((job) => [
      recordAdminActivity({
        actorType: 'AUTOMATION', ...job, status: 'running',
        summary: `Running success case for ${job.entityType}`,
        details: { result: { status: 'running', message: `${job.entityId} started` } },
      }),
      recordAdminActivity({
        actorType: 'AUTOMATION', ...job, status: 'running',
        summary: `Running failure case for ${job.entityType}`,
        details: { result: { status: 'running', message: `${job.entityId} started` } },
      }),
    ]))
    ids.push(...activities.map((activity) => activity.id))

    await Promise.all(jobs.flatMap((job, index) => {
      const success = activities[index * 2]
      const failure = activities[index * 2 + 1]
      return [
        finishAdminActivity(success.id, 'success', `Completed ${job.entityType}`, {
          status: 'completed', message: `${job.entityId} exact success`, marker: success.id,
        }),
        finishAdminActivity(failure.id, 'failed', `Failed ${job.entityType}`, {
          status: 'failed', message: `${job.entityId} exact failure`, marker: failure.id,
        }),
      ]
    }))

    const saved = await prisma.adminActivity.findMany({ where: { id: { in: ids } } })
    assert.equal(saved.length, jobs.length * 2)
    for (const activity of saved) {
      const result = (activity.details as { result?: { status?: string; message?: string; marker?: string } })?.result
      assert.equal(result?.marker, activity.id, 'a terminal result must not be written to another job record')
      assert.equal(activity.status, result?.status === 'completed' ? 'success' : 'failed')
      assert.match(result?.message || '', new RegExp(activity.entityId || 'never'))
    }
  } finally {
    if (ids.length) await prisma.adminActivity.deleteMany({ where: { id: { in: ids } } })
    await prisma.$disconnect()
  }
})
