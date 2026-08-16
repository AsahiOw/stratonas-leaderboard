import { RaidDataPage } from '@/components/RaidDataPage'
import { getPublicRaids } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
}: {
  params: Promise<{ raid?: string[] }>
}) {
  const [{ raid }, raids] = await Promise.all([params, getPublicRaids()])
  const initialRaidId = raid?.[0] ? decodeURIComponent(raid[0]) : undefined

  return (
    <RaidDataPage
      initialRaidId={initialRaidId}
      previousRaidCount={raids.filter((item) => !item.isActive).length}
    />
  )
}
