import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

const raidInclude = { raidBoss: true, type: true, server: true, terrain: true } as const

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const entries = await prisma.raidEntry.findMany({
    include: { player: { include: { favouriteStudentData: true } }, raid: { include: raidInclude } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard
  const body = await req.json()
  const entry = await prisma.raidEntry.upsert({
    where: { playerId_raidId: { playerId: body.playerId, raidId: body.raidId } },
    update: { score: Number(body.score) || 0 },
    create: {
      playerId: body.playerId,
      raidId:   body.raidId,
      score:    Number(body.score) || 0,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
