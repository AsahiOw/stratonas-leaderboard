import assert from 'node:assert/strict'
import test, { mock } from 'node:test'
import { ChibiInputError } from '@/lib/chibi/api-input'

const state = { authorized: true, calls: [] as string[], activities: 0 }
mock.module('@/lib/chibi/server', { namedExports: {
  controlChibiJob: async (id: string, action: string) => { state.calls.push(`${id}:${action}`); return { id, status: action === 'pause' ? 'paused' : 'queued', leaseToken: 'private' } },
  publicJob: ({ leaseToken: _lease, ...job }: any) => job,
} })
mock.module('@/lib/chibi/http', { namedExports: {
  adminChibiRequest: async (handler: () => Promise<Response>) => {
    if (!state.authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    try { return await handler() } catch (error) {
      if (error instanceof ChibiInputError || error instanceof SyntaxError) return Response.json({ error: 'Invalid input' }, { status: 400 })
      throw error
    }
  },
  noStoreJson: (data: unknown, status: number) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }),
} })
mock.module('@/lib/admin-activity', { namedExports: { recordAdminActivity: async () => { state.activities++ } } })
let route: typeof import('./[jobId]/control/route')
test.before(async () => { route = await import('./[jobId]/control/route') })
test.beforeEach(() => { state.authorized = true; state.calls = []; state.activities = 0 })
const context = () => ({ params: Promise.resolve({ jobId: 'job-1' }) })
const request = (body: unknown) => new Request('http://localhost/control', { method: 'POST', body: JSON.stringify(body) })

test('pause and resume are admin guarded, audited, and never expose the lease', async () => {
  for (const action of ['pause', 'resume']) {
    const response = await route.POST(request({ action }), context())
    assert.equal(response.status, 202)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.equal((await response.json()).job.leaseToken, undefined)
  }
  assert.deepEqual(state.calls, ['job-1:pause', 'job-1:resume'])
  assert.equal(state.activities, 2)
  state.authorized = false
  assert.equal((await route.POST(request({ action: 'pause' }), context())).status, 401)
  assert.equal(state.activities, 2)
})

test('invalid actions and null input cannot mutate a job', async () => {
  for (const body of [null, {}, { action: 'delete' }]) assert.equal((await route.POST(request(body), context())).status, 400)
  assert.deepEqual(state.calls, [])
})
