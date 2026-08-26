import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'
import { jsonWithNoStore } from '@/lib/cache'
import { getActiveRaidIds } from '@/lib/raid-activity'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const [players, clubs, raids, entries, recentActivity] = await Promise.all([
    prisma.player.count(),
    prisma.club.count(),
    prisma.raid.findMany({ select: { id: true, serverId: true, startDate: true } }),
    prisma.raidEntry.count(),
    prisma.adminActivity.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return jsonWithNoStore({
    counts: { players, clubs, activeRaids: getActiveRaidIds(raids).size, entries },
    recentActivity,
  })
}
