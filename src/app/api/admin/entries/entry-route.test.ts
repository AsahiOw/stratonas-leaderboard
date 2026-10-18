import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { Prisma } from '@/generated/prisma/client'

const updates: unknown[] = []
let invalidations = 0
let updateError: Error | null = null
mock.module('@/lib/prisma', { namedExports: { prisma: {
  raidEntry: {
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      if (updateError) throw updateError
      updates.push(args)
      return { id: args.where.id, ...args.data }
    },
  },
} } })
mock.module('@/lib/auth-guard', { namedExports: { requireAdmin: async () => null } })
mock.module('@/lib/cache', { namedExports: { invalidatePublicData: () => { invalidations++ } } })
mock.module('@/lib/admin-activity', { namedExports: {
  withAdminMutationAudit: (_config: unknown, handler: unknown) => handler,
} })

test('editing an entry saves the selected player and raid along with its score', async () => {
  const { PUT } = await import('./[id]/route')
  const response = await PUT(new Request('http://localhost/api/admin/entries/entry-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'replacement-player', raidId: 'replacement-raid', score: '12345' }),
  }), { params: Promise.resolve({ id: 'entry-1' }) })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    id: 'entry-1', playerId: 'replacement-player', raidId: 'replacement-raid', score: 12345,
  })
  assert.equal(updates.length, 1)
  assert.equal(invalidations, 1)
})

test('a conflicting player and raid returns an error without invalidating data', async () => {
  const { PUT } = await import('./[id]/route')
  updateError = new Prisma.PrismaClientKnownRequestError('Duplicate entry', { code: 'P2002', clientVersion: 'test' })
  const previousInvalidations = invalidations
  try {
    const response = await PUT(new Request('http://localhost/api/admin/entries/entry-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: 'existing-player', raidId: 'existing-raid', score: '12345' }),
    }), { params: Promise.resolve({ id: 'entry-1' }) })
    assert.equal(response.status, 409)
    assert.deepEqual(await response.json(), { error: 'This player already has an entry for the selected raid.' })
    assert.equal(invalidations, previousInvalidations)
  } finally {
    updateError = null
  }
})
