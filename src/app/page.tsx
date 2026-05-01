import { prisma } from '@/lib/prisma'
import { LeaderboardApp } from '@/components/LeaderboardApp'
import { withRaidActivity } from '@/lib/raid-activity'

export const dynamic = 'force-dynamic'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
  terrain: true,
} as const

export default async function Home() {
  const raids = await prisma.raid.findMany({
    include: raidInclude,
    orderBy: [{ startDate: 'asc' }, { season: 'asc' }],
  })
  const raidsWithActivity = withRaidActivity(raids)

  return (
    <LeaderboardApp
      initialRaids={raidsWithActivity.map((r) => ({
        ...r,
        startDate: r.startDate?.toISOString() ?? null,
        endDate: r.endDate?.toISOString() ?? null,
      }))}
    />
  )
}
