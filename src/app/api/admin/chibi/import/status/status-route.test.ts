import assert from 'node:assert/strict'
import test, { mock } from 'node:test'

const job = { id: 'job-1', workerId: 'current', status: 'running', leaseToken: 'private-lease' }
const entry = { at: '2026-09-28T02:30:00Z', message: 'Completed 10/517 archives/bundles' }
const processingStartedAt = new Date('2026-09-28T02:25:00Z')
const workers = () => [
  { id: 'current', ready: true, lastHeartbeat: new Date(), details: { jobId: job.id, progress: [entry], preflight: { ready: true } } },
  { id: 'old', ready: true, lastHeartbeat: new Date(0), details: {} },
]
const state = { workers: workers(), active: true, authorized: true, itemQuery: null as unknown }
mock.module('@/lib/prisma', { namedExports: { prisma: {
  chibiImportJob: { findFirst: async (query: any) => query.where?.status?.in ? state.active ? job : null : query.where?.status === 'completed' ? null : job },
  chibiWorkerState: { findMany: async () => state.workers },
  chibiImportItem: { findMany: async (query: unknown) => {
    state.itemQuery = query
    return [{ studentId: 10002, stage: 'conversion', student: { name: 'Haruna' } }]
  }, aggregate: async () => ({ _min: { createdAt: processingStartedAt } }) },
} } })
mock.module('@/lib/chibi/http', { namedExports: {
  adminChibiRequest: async (handler: () => Promise<Response>) => state.authorized ? handler() : Response.json({ error: 'Unauthorized' }, { status: 401 }),
  noStoreJson: (data: unknown) => Response.json(data, { headers: { 'Cache-Control': 'no-store' } }),
} })

let route: typeof import('./route')
test.before(async () => { route = await import('./route') })
test.beforeEach(() => { job.status = 'running'; state.workers = workers(); state.active = true; state.authorized = true; state.itemQuery = null })

test('status exposes the job-scoped scanner log and current students while excluding historical readiness warnings', async () => {
  const response = await route.GET()
  const body = await response.json()
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(body.ready, true)
  assert.deepEqual(body.readiness.diagnostics, [])
  assert.deepEqual(body.progress, [entry])
  assert.equal(body.activeItems[0].student.name, 'Haruna')
  assert.deepEqual((state.itemQuery as any).where, { jobId: job.id, status: 'running' })
  assert.equal(body.job.leaseToken, undefined)
  assert.ok(Number.isFinite(body.checkedAt))
  assert.equal(body.processingStartedAt, processingStartedAt.toISOString())
})

test('old-job logs cannot appear in the current import and an offline job owner remains actionable', async () => {
  state.workers[0].details.jobId = 'previous-job'
  state.workers[0].lastHeartbeat = new Date(0)
  const body = await (await route.GET()).json()
  assert.deepEqual(body.progress, [])
  assert.equal(body.readiness.diagnostics[0].id, 'worker-offline')
})

test('completed jobs keep their recent log without querying running students', async () => {
  state.active = false
  job.status = 'completed'
  const body = await (await route.GET()).json()
  assert.deepEqual(body.progress, [entry])
  assert.deepEqual(body.activeItems, [])
  assert.equal(state.itemQuery, null)
  assert.equal(body.processingStartedAt, null)
})

test('status remains admin guarded', async () => {
  state.authorized = false
  assert.equal((await route.GET()).status, 401)
  assert.equal(state.itemQuery, null)
})

test('status distinguishes old workers that need a restart before a pause can take effect', async () => {
  assert.equal((await (await route.GET()).json()).pauseSupported, false)
  Object.assign(state.workers[0].details, { importPauseSupported: true })
  assert.equal((await (await route.GET()).json()).pauseSupported, true)
})
