import 'dotenv/config'
import assert from 'node:assert/strict'
import test from 'node:test'
import { ChibiJobConflict, enqueueChibiJob } from './server'
import { CHIBI_ACTIONS, emptyChibiProfile } from './types'

function database(active: { id: string; mode: string } | null, students: { id: number; chibiBinding: unknown }[] = []) {
  let created = 0
  const tx = {
    $executeRaw: async () => 1,
    student: {
      findMany: async () => students,
      count: async ({ where }: { where: { id: { in: number[] } } }) => students.filter(student => where.id.in.includes(student.id)).length,
    },
    chibiImportJob: {
      findFirst: async ({ where }: { where: { mode?: string | { notIn: string[] } } }) => {
        if (!active) return null
        if (typeof where.mode === 'string') return active.mode === where.mode ? active : null
        if (where.mode?.notIn.includes(active.mode)) return null
        return active
      },
      create: async ({ data }: { data: object }) => { created++; return { id: 'download-job', ...data } },
    },
  }
  return { db: { $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx) }, created: () => created }
}

test('download queues a source-only job without student import items', async () => {
  const fake = database(null)
  const job = await enqueueChibiJob({ mode: 'download-assets', studentIds: [], requesterId: 'admin' }, fake.db as never)
  assert.equal(job.mode, 'download-assets')
  assert.deepEqual(job.selection, [])
  assert.equal(fake.created(), 1)
})

test('download cannot start while an import or preview is active', async () => {
  for (const mode of ['update', 'preview', 'download-assets']) {
    const fake = database({ id: 'active-job', mode })
    await assert.rejects(enqueueChibiJob({ mode: 'download-assets', studentIds: [], requesterId: 'admin' }, fake.db as never), ChibiJobConflict)
    assert.equal(fake.created(), 0)
  }
})

test('active downloads block updates and previews', async () => {
  for (const mode of ['update', 'update-missing-animations', 'preview']) {
    const fake = database({ id: 'active-job', mode: 'download-assets' })
    await assert.rejects(enqueueChibiJob({ mode, studentIds: [], requesterId: 'admin' }, fake.db as never), ChibiJobConflict)
    assert.equal(fake.created(), 0)
  }
})

test('missing-animation updates select new and incomplete students, skipping complete models even if broken', async () => {
  const complete = emptyChibiProfile()
  for (const action of CHIBI_ACTIONS) complete.interactions[action] = { state: 'available', clip: action }
  const students = [
    { id: 10000, chibiBinding: { profile: complete } },
    { id: 10001, chibiBinding: { profile: complete, status: 'failed', diagnostic: 'Manually repair this model.' } },
    { id: 10002, chibiBinding: null },
    ...CHIBI_ACTIONS.map((action, index) => ({
      id: 10003 + index,
      chibiBinding: { profile: { ...complete, interactions: { ...complete.interactions, [action]: { state: ['unresolved', 'failed', 'unsupported', 'unresolved'][index] } } } },
    })),
    { id: 10007, chibiBinding: { profile: {} } },
  ]
  const fake = database(null, students)
  const queued = await enqueueChibiJob({ mode: 'update-missing-animations', studentIds: [], requesterId: 'admin' }, fake.db as never)
  assert.deepEqual(queued.selection, [10002, 10003, 10004, 10005, 10006, 10007])
  assert.equal(queued.mode, 'update-missing-animations')
  assert.equal(fake.created(), 1)
})

test('a complete or empty roster never queues an empty selection that could become a full update', async () => {
  const complete = emptyChibiProfile()
  for (const action of CHIBI_ACTIONS) complete.interactions[action] = { state: 'available', clip: action }
  for (const students of [[], [{ id: 10002, chibiBinding: { profile: complete } }]]) {
    const fake = database(null, students)
    await assert.rejects(enqueueChibiJob({ mode: 'update-missing-animations', studentIds: [], requesterId: 'admin' }, fake.db as never), /nothing to update/)
    assert.equal(fake.created(), 0)
  }
})

test('missing-animation selection cannot be overridden by explicit student IDs', async () => {
  const fake = database(null)
  await assert.rejects(enqueueChibiJob({ mode: 'update-missing-animations', studentIds: [10002], requesterId: 'admin' }, fake.db as never), /selected automatically/)
  assert.equal(fake.created(), 0)
})
