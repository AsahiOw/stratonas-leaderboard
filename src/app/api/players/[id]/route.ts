import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveRaidIds } from '@/lib/raid-activity'

export const dynamic = 'force-dynamic'

const raidInclude = { raidBoss: true, type: true, server: true } as const

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const ign = searchParams.get('ign')

  const player = await prisma.player.findUnique({
    where: ign ? { ign } : { id: params.id },
    include: {
      favouriteStudentData: true,
      entries: {
        include: { raid: { include: raidInclude } },
        orderBy: { score: 'desc' },
      },
    },
  })

  if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const raids = await prisma.raid.findMany({ select: { id: true, serverId: true, startDate: true } })
  const activeRaidIds = getActiveRaidIds(raids)

  // Compute per-raid ranks
  const entriesWithRank = await Promise.all(
    player.entries.map(async (entry) => {
      const raidEntries = await prisma.raidEntry.findMany({
        where: { raidId: entry.raidId },
        orderBy: { score: 'desc' },
      })
      const rank = raidEntries.findIndex((e) => e.playerId === player.id) + 1
      return { ...entry, rank, raid: { ...entry.raid, isActive: activeRaidIds.has(entry.raidId) } }
    })
  )

  return NextResponse.json({ ...player, entries: entriesWithRank })
}
