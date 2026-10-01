import assert from 'node:assert/strict'
import { mock } from 'node:test'
import test from 'node:test'

const equipment = {
  bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId: '42',
}
const equipmentKey = `${'a'.repeat(64)}:cab/prefab:42`
const baseArrangement = { schemaVersion: 1, nodes: { '$model': { position: [0.1, 0, 0] } } }

type BindingState = {
  studentId: number
  assetId: string
  arrangementOverride: unknown
  catalogVisible: boolean
  asset: { id: string; checksum: string; arrangementDefault: unknown; validation: unknown }
}
type Database = {
  $transaction: (callback: (tx: Database) => Promise<unknown>) => Promise<unknown>
  studentChibiBinding: {
    findUnique: () => Promise<BindingState>
    updateMany: (args: { where: { studentId: number; assetId: string; asset: { checksum: string } }; data: Record<string, unknown> }) => Promise<{ count: number }>
  }
}
const state: { binding: BindingState; updates: Array<Record<string, unknown>>; allowUpdate: boolean; bumpChecksumAfterRead: boolean } = {
  binding: {
    studentId: 10001, assetId: 'asset-1', arrangementOverride: {}, catalogVisible: true,
    asset: {
      id: 'asset-1', checksum: 'revision-1', arrangementDefault: baseArrangement,
      validation: { renderingProfile: { equipmentBindingEvidence: [{ sourceReference: equipment, name: 'Weapon', hierarchyPath: 'Cafe/Weapon' }] } },
    },
  },
  updates: [], allowUpdate: true, bumpChecksumAfterRead: false,
}

const database: Database = {
  $transaction: async callback => callback(database),
  studentChibiBinding: {
    findUnique: async () => {
      const snapshot = structuredClone(state.binding)
      if (state.bumpChecksumAfterRead) state.binding.asset.checksum = 'replacement-revision'
      return snapshot
    },
    updateMany: async ({ where, data }: { where: { studentId: number; assetId: string; asset: { checksum: string } }; data: Record<string, unknown> }) => {
      if (!state.allowUpdate || where.studentId !== state.binding.studentId || where.assetId !== state.binding.assetId || where.asset.checksum !== state.binding.asset.checksum) return { count: 0 }
      state.updates.push(data)
      Object.assign(state.binding, data)
      return { count: 1 }
    },
  },
}

mock.module('@/lib/prisma', { namedExports: { prisma: database } })
mock.module('@/lib/auth', { namedExports: { auth: async () => ({ user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' } }) } })
mock.module('@/lib/auth-guard', { namedExports: { requireAdmin: async () => null } })
mock.module('@/lib/admin-activity', { namedExports: { recordAdminActivity: async () => undefined } })

let arrangementRoute: { PUT: (request: Request, context: { params: Promise<{ studentId: string }> }) => Promise<Response> }
let visibilityRoute: { PUT: (request: Request, context: { params: Promise<{ studentId: string }> }) => Promise<Response> }
test.before(async () => {
  arrangementRoute = (await import('./[studentId]/arrangement/route')) as typeof arrangementRoute
  visibilityRoute = (await import('./[studentId]/visibility/route')) as typeof visibilityRoute
})

function reset() {
  state.binding = {
    studentId: 10001, assetId: 'asset-1', arrangementOverride: {}, catalogVisible: true,
    asset: {
      id: 'asset-1', checksum: 'revision-1', arrangementDefault: baseArrangement,
      validation: { renderingProfile: { equipmentBindingEvidence: [{ sourceReference: equipment, name: 'Weapon', hierarchyPath: 'Cafe/Weapon' }] } },
    },
  }
  state.updates.length = 0
  state.allowUpdate = true
  state.bumpChecksumAfterRead = false
}

function request(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}
const context = { params: Promise.resolve({ studentId: '10001' }) }

test('arrangement PUT accepts reserved controls and exact equipment keys and returns the merged record', async () => {
  reset()
  const response = await arrangementRoute.PUT(request('/api/admin/chibi/students/10001/arrangement', {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1',
    override: { schemaVersion: 1, nodes: { '$model': { visible: false }, [equipmentKey]: { scale: [1.1, 1, 1] } } },
  }), context)
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.deepEqual(body.arrangement.effectiveArrangement.nodes['$model'], { position: [0.1, 0, 0], visible: false })
  assert.deepEqual(body.arrangement.effectiveArrangement.nodes[equipmentKey], { scale: [1.1, 1, 1] })
  assert.equal(state.updates.length, 1)
})

test('face depth settings persist through guarded arrangement PUT with immutable defaults', async () => {
  reset()
  const face = { depthTest: true, depthOffset: -2 }
  const response = await arrangementRoute.PUT(request('/api/admin/chibi/students/10001/arrangement', {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1',
    override: { schemaVersion: 1, nodes: { '$eyes': face } },
  }), context)
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.deepEqual(body.arrangement.effectiveArrangement.nodes.$eyes, face)
  assert.deepEqual(state.binding.arrangementOverride, { schemaVersion: 1, nodes: { '$eyes': face } })
  assert.deepEqual(state.binding.asset.arrangementDefault, baseArrangement)
})

test('arrangement PUT rejects a hierarchy/name alias before writing', async () => {
  reset()
  const response = await arrangementRoute.PUT(request('/api/admin/chibi/students/10001/arrangement', {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1',
    override: { schemaVersion: 1, nodes: { Weapon: { visible: false } } },
  }), context)
  assert.equal(response.status, 400)
  assert.equal(state.updates.length, 0)
})

test('arrangement PUT rejects transforms outside the bounded correction controls before writing', async () => {
  const overrides = [
    { '$model': { position: [100000, 0, 0] } },
    { [equipmentKey]: { rotation: [1, 0, 0, 0] } },
    { [equipmentKey]: { rotation: [0, 0, 0, 0] } },
    { [equipmentKey]: { scale: [2, 1, 1] } },
    { [equipmentKey]: { position: [Number.NaN, 0, 0] } },
  ]
  for (const nodes of overrides) {
    reset()
    const response = await arrangementRoute.PUT(request('/api/admin/chibi/students/10001/arrangement', {
      schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1', override: { schemaVersion: 1, nodes },
    }), context)
    assert.equal(response.status, 400)
    assert.equal(state.updates.length, 0)
  }
})

test('arrangement and visibility edits fail with 409 when the active asset/checksum is stale', async () => {
  reset()
  const staleArrangement = await arrangementRoute.PUT(request('/api/admin/chibi/students/10001/arrangement', {
    schemaVersion: 1, assetId: 'old-asset', checksum: 'old-revision', override: {},
  }), context)
  assert.equal(staleArrangement.status, 409)
  state.allowUpdate = false
  const staleVisibility = await visibilityRoute.PUT(request('/api/admin/chibi/students/10001/visibility', {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1', catalogVisible: false,
  }), context)
  assert.equal(staleVisibility.status, 409)
  assert.equal(state.binding.catalogVisible, true)
})

test('arrangement and visibility edits fence a checksum change on the same asset ID', async () => {
  reset()
  state.bumpChecksumAfterRead = true
  const staleArrangement = await arrangementRoute.PUT(request('/api/admin/chibi/students/10001/arrangement', {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1', override: {},
  }), context)
  assert.equal(staleArrangement.status, 409)
  assert.equal(state.updates.length, 0)

  reset()
  state.bumpChecksumAfterRead = true
  const staleVisibility = await visibilityRoute.PUT(request('/api/admin/chibi/students/10001/visibility', {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1', catalogVisible: false,
  }), context)
  assert.equal(staleVisibility.status, 409)
  assert.equal(state.updates.length, 0)
  assert.equal(state.binding.catalogVisible, true)
})

test('visibility PUT changes catalog visibility without changing the arrangement override', async () => {
  reset()
  state.binding.arrangementOverride = { schemaVersion: 1, nodes: { '$model': { visible: false } } }
  const response = await visibilityRoute.PUT(request('/api/admin/chibi/students/10001/visibility', {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'revision-1', catalogVisible: false,
  }), context)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).catalogVisible, false)
  assert.deepEqual(state.binding.arrangementOverride, { schemaVersion: 1, nodes: { '$model': { visible: false } } })
})
