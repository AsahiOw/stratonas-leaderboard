import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard
  const entries = await prisma.raidEntry.findMany({
    include: { player: true, raid: true },
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
    update: {
      score: Number(body.score) || 0,
      wins: Number(body.wins) || 0,
      losses: Number(body.losses) || 0,
      streak: Number(body.streak) || 0,
    },
    create: {
      playerId: body.playerId,
      raidId: body.raidId,
      score: Number(body.score) || 0,
      wins: Number(body.wins) || 0,
      losses: Number(body.losses) || 0,
      streak: Number(body.streak) || 0,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
