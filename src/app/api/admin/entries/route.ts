import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'

const raidInclude = { raidBoss: true, type: true, server: true, terrain: true } as const

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const entries = await prisma.raidEntry.findMany({
    include: { player: { include: { favouriteStudentData: true } }, raid: { include: raidInclude } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const score = Number(body.score)
  if (!body.playerId || !body.raidId || !Number.isFinite(score)) {
    return NextResponse.json({ error: 'Player, raid, and score are required.' }, { status: 400 })
  }

  const entry = await prisma.raidEntry.upsert({
    where: { playerId_raidId: { playerId: body.playerId, raidId: body.raidId } },
    update: { score },
    create: {
      playerId: body.playerId,
      raidId:   body.raidId,
      score,
    },
  })
  invalidatePublicData()
  return NextResponse.json(entry, { status: 201 })
}
