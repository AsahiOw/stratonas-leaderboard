import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const entries = await prisma.raidEntry.findMany({
    where: { raidId: params.id },
    include: { player: true },
    orderBy: { score: 'desc' },
  })
  const ranked = entries.map((e, i) => ({
    rank: i + 1,
    name: e.player.ign,
    score: e.score,
    w: e.wins,
    l: e.losses,
    streak: e.streak,
    isGuild: true,
    favouriteStudent: e.player.favouriteStudent,
    playerId: e.player.id,
  }))
  return NextResponse.json(ranked)
}
