import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { withAdminMutationAudit } from '@/lib/admin-activity'

async function post(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const sourcePlayerId = typeof body.sourcePlayerId === 'string' ? body.sourcePlayerId.trim() : ''
  const targetPlayerId = typeof body.targetPlayerId === 'string' ? body.targetPlayerId.trim() : ''
  if (!sourcePlayerId || !targetPlayerId || sourcePlayerId === targetPlayerId) {
    return NextResponse.json({ error: 'Select two different players: the old account and the new account.' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const source = await tx.player.findUnique({ where: { id: sourcePlayerId }, include: { entries: true } })
      const target = await tx.player.findUnique({ where: { id: targetPlayerId }, include: { entries: true } })
      if (!source || !target) return null

      const skipped = await tx.raidEntry.deleteMany({
        where: { playerId: sourcePlayerId, raidId: { in: target.entries.map(entry => entry.raidId) } },
      })
      const transferred = await tx.raidEntry.updateMany({
        where: { playerId: sourcePlayerId }, data: { playerId: targetPlayerId },
      })
      const reviews = await tx.xlsxImportReviewItem.updateMany({
        where: { playerId: sourcePlayerId }, data: { playerId: targetPlayerId },
      })
      await tx.player.delete({ where: { id: sourcePlayerId } })
      return {
        id: target.id,
        sourcePlayer: source,
        targetPlayer: target,
        transferredEntries: transferred.count,
        skippedEntries: skipped.count,
        transferredReviews: reviews.count,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (!result) return NextResponse.json({ error: 'One of these players no longer exists. Refresh the player list.' }, { status: 404 })
    invalidatePublicData()
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002', 'P2025', 'P2003'].includes(error.code)) {
      return NextResponse.json({ error: 'Player data changed during the merge. Refresh the player list and try again.' }, { status: 409 })
    }
    throw error
  }
}

export const POST = withAdminMutationAudit({ action: 'UPDATE', entityType: 'player merge', summary: 'Merged old player account into new account' }, post)
