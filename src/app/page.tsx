import { prisma } from '@/lib/prisma'
import { LeaderboardApp } from '@/components/LeaderboardApp'

export const dynamic = 'force-dynamic'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
} as const

export default async function Home() {
  const [raids, players] = await Promise.all([
    prisma.raid.findMany({
      include: raidInclude,
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    }),
    prisma.player.findMany({
      where: { isGuildMember: true },
      orderBy: { ign: 'asc' },
      select: { id: true, ign: true, favouriteStudent: true },
    }),
  ])

  return (
    <LeaderboardApp
      initialRaids={raids.map((r) => ({
        ...r,
        startDate: r.startDate?.toISOString() ?? null,
        endDate: r.endDate?.toISOString() ?? null,
      }))}
      initialPlayers={players}
    />
  )
}
