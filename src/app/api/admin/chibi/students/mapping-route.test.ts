import assert from 'node:assert/strict'
import { mock } from 'node:test'
import test from 'node:test'

type Binding = {
  studentId: number
  sourceIdentity: string | null
  identityPath: string | null
  provenance: string
  overrides: Record<string, unknown>
  status: string
  diagnostic: string | null
}

type TestState = {
  binding: Binding | null
  upsertCalls: Array<{ where: unknown; create: Record<string, unknown>; update: Record<string, unknown> }>
  jobs: Array<Record<string, unknown>>
  transactionErrors: number
  commits: number
}

type UpsertInput = { where: unknown; create: Record<string, unknown>; update: Record<string, unknown> }
type FakeDatabase = {
  $transaction: (callback: (tx: FakeDatabase) => Promise<unknown>) => Promise<unknown>
  $executeRaw: () => Promise<number>
  student: { findUnique: () => Promise<{ id: number; pathName: string }> }
  chibiSourceCandidate: { findUnique: () => Promise<{ sourceIdentity: string; fingerprint: string; conflict: boolean; metadata: { clips: string[] } }> }
  studentChibiBinding: { upsert: (input: UpsertInput) => Promise<Binding> }
  chibiImportJob: { create: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> }
}

const state: TestState = {
  binding: null,
  upsertCalls: [],
  jobs: [],
  transactionErrors: 0,
  commits: 0,
}

const database: FakeDatabase = {
  $transaction: async (callback: (tx: FakeDatabase) => Promise<unknown>) => {
    try {
      const result = await callback(database)
      state.commits += 1
      return result
    } catch (error) {
      state.transactionErrors += 1
      throw error
    }
  },
  $executeRaw: async () => 0,
  student: {
    findUnique: async () => ({ id: 10001, pathName: 'haruna' }),
  },
  chibiSourceCandidate: {
    findUnique: async () => ({
      sourceIdentity: 'haruna_original', fingerprint: 'candidate-v2', conflict: false, metadata: { clips: [] },
    }),
  },
  studentChibiBinding: {
    upsert: async (input: UpsertInput) => {
      state.upsertCalls.push(input)
      state.binding = {
        studentId: 10001,
        sourceIdentity: String(input.update.sourceIdentity ?? input.create.sourceIdentity),
        identityPath: String(input.update.identityPath ?? input.create.identityPath),
        provenance: String(input.update.provenance ?? input.create.provenance),
        overrides: (input.update.overrides ?? input.create.overrides) as Record<string, unknown>,
        status: state.binding?.status ?? String(input.create.status),
        diagnostic: (input.update.diagnostic ?? state.binding?.diagnostic ?? null) as string | null,
      }
      return state.binding
    },
  },
  chibiImportJob: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const job = { id: `job-${state.jobs.length + 1}`, status: 'queued', ...data }
      state.jobs.push(job)
      return job
    },
  },
}

mock.module('@/lib/prisma', { namedExports: { prisma: database } })
mock.module('@/lib/auth', { namedExports: { auth: async () => ({ user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' } }) } })
mock.module('@/lib/auth-guard', { namedExports: { requireAdmin: async () => null } })
mock.module('@/lib/admin-activity', { namedExports: { recordAdminActivity: async () => undefined } })
mock.module('@/lib/chibi/server', {
  namedExports: {
    CHIBI_ENQUEUE_LOCK: 724_310_002,
    ChibiJobConflict: class ChibiJobConflict extends Error {},
    jsonValue: (value: unknown) => JSON.parse(JSON.stringify(value)),
    publicJob: (job: Record<string, unknown>) => {
      const { leaseToken: _leaseToken, ...safe } = job
      return safe
    },
  },
})

let route: { PUT: (request: Request, context: { params: Promise<{ studentId: string }> }) => Promise<Response> }
test.before(async () => {
  const loaded: unknown = await import('./[studentId]/mapping/route')
  route = ((loaded as { default?: typeof route }).default ?? loaded) as typeof route
})

function reviewInput(profile = {
  label: 'Haruna reviewed', idleLabel: 'Static preview', initialPose: null,
  interactions: {
    idle: { state: 'unsupported', reason: 'No verified idle clip.' },
    walk: { state: 'unsupported', reason: 'No verified walk clip.' },
    pickup: { state: 'unsupported', reason: 'No verified pickup clip.' },
    touch: { state: 'unsupported', reason: 'No verified touch clip.' },
  },
}) {
  return { sourceIdentity: 'haruna_original', fingerprint: 'candidate-v2', profile }
}

function resetState(binding: Binding | null = null) {
  state.binding = binding
  state.upsertCalls.length = 0
  state.jobs.length = 0
  state.transactionErrors = 0
  state.commits = 0
}

async function put(input: unknown) {
  return route.PUT(new Request('http://localhost/api/admin/chibi/students/10001/mapping', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  }), { params: Promise.resolve({ studentId: '10001' }) })
}

test('manual mapping keeps an available binding active while updating reviewed overrides', async () => {
  resetState({
    studentId: 10001, sourceIdentity: 'old_source', identityPath: 'haruna', provenance: 'canonical',
    overrides: {}, status: 'available', diagnostic: null,
  })

  const response = await put(reviewInput())

  assert.equal(response.status, 202)
  assert.equal(state.commits, 1)
  assert.equal(state.jobs.length, 1)
  assert.equal(state.binding?.status, 'available')
  assert.equal(state.upsertCalls.length, 1)
  assert.deepEqual(state.upsertCalls[0]?.create.status, 'queued')
  assert.equal('status' in (state.upsertCalls[0]?.update ?? {}), false)
  assert.deepEqual(state.binding?.overrides, {
    sourceIdentity: 'haruna_original', identityPath: 'haruna', profile: reviewInput().profile, approvedCandidateFingerprint: 'candidate-v2',
  })
  assert.equal(state.binding?.diagnostic, 'Reviewed mapping queued for validation; any previous revision with the same student identity remains active.')
})

test('manual mapping queues a new binding and fences approval to the reviewed candidate fingerprint', async () => {
  resetState()

  const response = await put(reviewInput())

  assert.equal(response.status, 202)
  assert.equal(state.binding?.status, 'queued')
  assert.deepEqual(state.binding?.overrides, {
    sourceIdentity: 'haruna_original', identityPath: 'haruna', profile: reviewInput().profile, approvedCandidateFingerprint: 'candidate-v2',
  })
  assert.equal(state.jobs[0]?.mode, 'mapping')
  assert.deepEqual(state.jobs[0]?.candidate, {
    studentId: 10001, sourceIdentity: 'haruna_original', fingerprint: 'candidate-v2', profile: reviewInput().profile,
  })
})

test('invalid reviewed profile is rejected before any binding or job write', async () => {
  resetState({
    studentId: 10001, sourceIdentity: 'old_source', identityPath: 'haruna', provenance: 'canonical',
    overrides: {}, status: 'available', diagnostic: null,
  })

  const response = await put(reviewInput({
    label: '', idleLabel: 'Static preview', initialPose: null,
    interactions: {
      idle: { state: 'unsupported', reason: 'No verified idle clip.' },
      walk: { state: 'unsupported', reason: 'No verified walk clip.' },
      pickup: { state: 'unsupported', reason: 'No verified pickup clip.' },
      touch: { state: 'unsupported', reason: 'No verified touch clip.' },
    },
  }))

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'Enter a profile label.' })
  assert.equal(state.transactionErrors, 1)
  assert.equal(state.commits, 0)
  assert.equal(state.upsertCalls.length, 0)
  assert.equal(state.jobs.length, 0)
  assert.equal(state.binding?.status, 'available')
})
