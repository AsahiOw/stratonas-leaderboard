// Run with: node --experimental-test-module-mocks --import tsx --test scripts/test-player-merge.ts
// Uses temporary records inside a rolled-back transaction against the local dev database.
import 'dotenv/config'
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '../src/generated/prisma/client'

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
let transaction: Prisma.TransactionClient
let guard: Response | null = null
let invalidations = 0
mock.module('@/lib/prisma', { namedExports: { prisma: {
  $transaction: async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => callback(transaction),
} } })
mock.module('@/lib/auth-guard', { namedExports: { requireAdmin: async () => guard } })
mock.module('@/lib/cache', { namedExports: { invalidatePublicData: () => { invalidations++ } } })
mock.module('@/lib/admin-activity', { namedExports: {
  withAdminMutationAudit: (_config: unknown, handler: unknown) => handler,
} })

test('player merge transfers related records, keeps new-account conflicts and profile, and removes the old account', async () => {
  const { POST } = await import('../src/app/api/admin/players/merge/route')
  const rollback = new Error('Roll back merge test fixtures')
  const request = (body: unknown) => new Request('http://localhost/api/admin/players/merge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  try {
    await db.$transaction(async tx => {
      transaction = tx
      const raids = await tx.raid.findMany({ take: 2, select: { id: true } })
      assert.equal(raids.length, 2, 'Two existing raids are needed for this integration check')
      const suffix = crypto.randomUUID()
      const source = await tx.player.create({ data: { ign: 'Merge test old', username: `merge-old-${suffix}`, userID: `old-${suffix}`, favouriteStudent: 'Old favourite' } })
      const target = await tx.player.create({ data: { ign: 'Merge test new', username: `merge-new-${suffix}`, userID: `new-${suffix}`, favouriteStudent: 'New favourite' } })
      const oldConflict = await tx.raidEntry.create({ data: { playerId: source.id, raidId: raids[0].id, score: 900 } })
      const newConflict = await tx.raidEntry.create({ data: { playerId: target.id, raidId: raids[0].id, score: 100 } })
      const movable = await tx.raidEntry.create({ data: { playerId: source.id, raidId: raids[1].id, score: 500 } })
      const review = await tx.xlsxImportReviewItem.create({ data: { playerId: source.id, raidId: raids[0].id, rawFavoriteStudent: 'Keep this review' } })

      guard = Response.json({ error: 'Unauthorized' }, { status: 401 })
      assert.equal((await POST(request({ sourcePlayerId: source.id, targetPlayerId: target.id }))).status, 401)
      guard = null
      assert.equal((await POST(request({ sourcePlayerId: source.id, targetPlayerId: source.id }))).status, 400)
      assert.equal((await POST(request({}))).status, 400)
      assert.equal((await POST(request({ sourcePlayerId: 'missing', targetPlayerId: target.id }))).status, 404)
      assert.equal(invalidations, 0)

      const response = await POST(request({ sourcePlayerId: source.id, targetPlayerId: target.id }))
      assert.equal(response.status, 200)
      const result = await response.json()
      assert.equal(result.transferredEntries, 1)
      assert.equal(result.skippedEntries, 1)
      assert.equal(result.transferredReviews, 1)
      assert.equal(await tx.player.findUnique({ where: { id: source.id } }), null)
      assert.deepEqual(await tx.player.findUnique({ where: { id: target.id } }), target)
      assert.equal(await tx.raidEntry.findUnique({ where: { id: oldConflict.id } }), null)
      assert.deepEqual(await tx.raidEntry.findUnique({ where: { id: newConflict.id } }), newConflict)
      const moved = await tx.raidEntry.findUniqueOrThrow({ where: { id: movable.id } })
      assert.equal(moved.playerId, target.id)
      assert.equal(moved.score, movable.score)
      assert.equal(moved.createdAt.getTime(), movable.createdAt.getTime())
      assert.equal((await tx.xlsxImportReviewItem.findUniqueOrThrow({ where: { id: review.id } })).playerId, target.id)
      assert.equal(invalidations, 1)
      assert.equal((await POST(request({ sourcePlayerId: source.id, targetPlayerId: target.id }))).status, 404)
      throw rollback
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 })
  } catch (error) {
    if (error !== rollback) throw error
  } finally {
    await db.$disconnect()
  }
})
