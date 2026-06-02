import { LeaderboardApp } from '@/components/LeaderboardApp'
import { getPublicRaidEntries, getPublicRaids } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

export default async function Home() {
  const raids = await getPublicRaids()
  const activeRaids = raids.filter((raid) => raid.isActive)
  const activeRaidEntries = await Promise.all(
    activeRaids.map(async (raid) => [raid.id, await getPublicRaidEntries(raid.id)] as const)
  )

  return (
    <LeaderboardApp
      initialRaids={raids.map((r) => ({
        ...r,
        startDate: toIsoDate(r.startDate),
        endDate: toIsoDate(r.endDate),
      }))}
      initialRaidEntries={Object.fromEntries(activeRaidEntries)}
    />
  )
}
