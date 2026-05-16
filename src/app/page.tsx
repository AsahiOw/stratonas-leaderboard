import { LeaderboardApp } from '@/components/LeaderboardApp'
import { getPublicRaids } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

export default async function Home() {
  const raids = await getPublicRaids()

  return (
    <LeaderboardApp
      initialRaids={raids.map((r) => ({
        ...r,
        startDate: toIsoDate(r.startDate),
        endDate: toIsoDate(r.endDate),
      }))}
    />
  )
}
