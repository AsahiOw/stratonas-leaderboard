import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicRaid, getPublicRaidEntries } from '@/lib/public-data'
import { LeaderboardCardGrid } from '@/components/LeaderboardCardGrid'
import { RaidCardDownloadButton } from '@/components/RaidCardDownloadModal'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { PublicHeader } from '@/components/PublicHeader'
import { fmtDate, imageSrc } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const divisions = [
  {
    name: 'Platinum Division',
    range: 'Ranks 1-3',
    icon: '/assets/Divisions/Platinum.webp',
    minRank: 1,
    maxRank: 3,
    elevated: true,
  },
  {
    name: 'Gold Division',
    range: 'Ranks 4-10',
    icon: '/assets/Divisions/Gold.webp',
    minRank: 4,
    maxRank: 10,
  },
  {
    name: 'Silver Division',
    range: 'Ranks 11-20',
    icon: '/assets/Divisions/Silver.webp',
    minRank: 11,
    maxRank: 20,
  },
  {
    name: 'Bronze Division',
    range: 'Ranks 21-50',
    icon: '/assets/Divisions/Bronze.webp',
    minRank: 21,
    maxRank: 50,
  },
]

export default async function RaidLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const raid = await getPublicRaid(id)
  if (!raid) notFound()

  const entries = await getPublicRaidEntries(id, 50, true)
  const topPlayer = entries[0]
  const cardRaid = {
    raidBoss: raid.raidBoss,
    season: raid.season,
    type: raid.type,
    server: raid.server,
    terrain: raid.terrain,
    color: raid.color,
    color2: raid.color2,
  }

  return (
    <main className="min-h-screen bg-bg pb-16">
      <PublicHeader
        actions={(
          <div className="flex items-center gap-2">
            <RaidCardDownloadButton raid={cardRaid} entries={entries} />
            <Link href="/" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted2 transition-colors hover:text-text">
              Back to leaderboard
            </Link>
          </div>
        )}
      />
      <div className="mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-5 sm:pt-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
            <span>{fmtDate(raid.startDate)}</span>
            <span>→</span>
            <span>{fmtDate(raid.endDate)}</span>
          </div>
        </div>

        <section
          className="relative overflow-hidden rounded-2xl border px-4 py-5 sm:px-6 sm:py-6 mb-6"
          style={{
            borderColor: `${raid.color}35`,
            background: `linear-gradient(135deg,${raid.color}1f 0%,${raid.color2}14 45%,var(--card) 100%)`,
          }}
        >
          {raid.raidBoss.image && (
            <div
              className="absolute inset-y-0 right-0 w-full sm:w-3/5 opacity-30 pointer-events-none"
              style={{
                backgroundImage: `url("${imageSrc(raid.raidBoss.image)}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                maskImage: 'linear-gradient(to right, transparent, black 60%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)',
              }}
            />
          )}
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ServerBadge server={raid.server.name} />
                <span
                  className="text-[11px] font-bold tracking-[0.12em] uppercase"
                  style={{ color: raid.color }}
                >
                  S{raid.season} · {raid.type.name} · {raid.terrain.name}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] leading-tight">
                {raid.raidBoss.name} Top 50
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted2">
                Honor tier standings for this raid. Each card uses the player&apos;s club color, club insignia, and favorite student portrait.
              </p>
            </div>
            <div
              className="rounded-lg border bg-black/25 px-4 py-3 lg:text-right"
              style={{ borderColor: `${raid.color}35` }}
            >
              <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">Current Leader</div>
              <div className="mt-1 font-bold text-lg">{topPlayer?.name || '—'}</div>
              <div className="font-mono text-sm font-bold" style={{ color: raid.color }}>
                {topPlayer ? topPlayer.score.toLocaleString() : 'No score'} pts
              </div>
            </div>
          </div>
        </section>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted">
            No entries found for this raid.
          </div>
        ) : (
          <LeaderboardCardGrid raid={cardRaid} entries={entries} divisions={divisions} />
        )}
      </div>
    </main>
  )
}
