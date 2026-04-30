import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const raidInclude = { raidBoss: true, type: true, server: true } as const

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const ign = searchParams.get('ign')

  const player = await prisma.player.findUnique({
    where: ign ? { ign } : { id: params.id },
    include: {
      entries: {
        include: { raid: { include: raidInclude } },
        orderBy: { score: 'desc' },
      },
    },
  })

  if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Compute per-raid ranks
  const entriesWithRank = await Promise.all(
    player.entries.map(async (entry) => {
      const raidEntries = await prisma.raidEntry.findMany({
        where: { raidId: entry.raidId },
        orderBy: { score: 'desc' },
      })
      const rank = raidEntries.findIndex((e) => e.playerId === player.id) + 1
      return { ...entry, rank }
    })
  )

  return NextResponse.json({ ...player, entries: entriesWithRank })
}
