import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { withAdminMutationAudit } from '@/lib/admin-activity'

async function put(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  const body = await req.json()
  const score = Number(body.score)
  if (!body.playerId || !body.raidId || !Number.isFinite(score)) {
    return NextResponse.json({ error: 'Player, raid, and score are required.' }, { status: 400 })
  }
  try {
    const entry = await prisma.raidEntry.update({
      where: { id },
      data: {
        playerId: body.playerId,
        raidId: body.raidId,
        score,
      },
    })
    invalidatePublicData()
    return NextResponse.json(entry)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This player already has an entry for the selected raid.' }, { status: 409 })
    }
    throw error
  }
}

async function del(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard) return guard
  const { id } = await params
  const deleted = await prisma.raidEntry.delete({ where: { id } })
  invalidatePublicData()
  return NextResponse.json({ ok: true, deleted })
}

export const PUT = withAdminMutationAudit({ action: 'UPDATE', entityType: 'raid entry' }, put)
export const DELETE = withAdminMutationAudit({ action: 'DELETE', entityType: 'raid entry' }, del)
