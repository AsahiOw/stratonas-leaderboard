import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveRaidIds } from '@/lib/raid-activity'

export const dynamic = 'force-dynamic'

const raidInclude = { raidBoss: true, type: true, server: true, terrain: true } as const

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const ign = searchParams.get('ign')
  const playerInclude = {
    include: {
      favouriteStudentData: true,
      clubData: true,
      entries: {
        include: { raid: { include: raidInclude } },
        orderBy: { score: 'desc' },
      },
    },
  } as const

  const player = ign
    ? await prisma.player.findFirst({ where: { ign }, ...playerInclude })
    : await prisma.player.findUnique({ where: { id }, ...playerInclude })

  if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const raids = await prisma.raid.findMany({ select: { id: true, serverId: true, startDate: true, endDate: true } })
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
