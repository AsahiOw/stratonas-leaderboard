import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getRankedRaidEntries } from '@/lib/raid-entries'
import { RaidCard } from '@/components/RaidCard'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { fmtDate, imageSrc } from '@/lib/utils'
import type { TableEntry } from '@/components/LeaderboardTable'

export const dynamic = 'force-dynamic'

const raidInclude = {
  raidBoss: true,
  type: true,
  server: true,
  terrain: true,
} as const

const divisions = [
  {
    name: 'Platinum Division',
    range: 'Ranks 1-3',
    icon: '/assets/Divisions/Platinum.webp',
    entries: (rows: TableEntry[]) => rows.filter((e) => e.rank <= 3),
    elevated: true,
  },
  {
    name: 'Gold Division',
    range: 'Ranks 4-10',
    icon: '/assets/Divisions/Gold.webp',
    entries: (rows: TableEntry[]) => rows.filter((e) => e.rank >= 4 && e.rank <= 10),
  },
  {
    name: 'Silver Division',
    range: 'Ranks 11-20',
    icon: '/assets/Divisions/Silver.webp',
    entries: (rows: TableEntry[]) => rows.filter((e) => e.rank >= 11 && e.rank <= 20),
  },
  {
    name: 'Bronze Division',
    range: 'Ranks 21-50',
    icon: '/assets/Divisions/Bronze.webp',
    entries: (rows: TableEntry[]) => rows.filter((e) => e.rank >= 21 && e.rank <= 50),
  },
]

export default async function RaidLeaderboardPage({ params }: { params: { id: string } }) {
  const raid = await prisma.raid.findUnique({
    where: { id: params.id },
    include: raidInclude,
  })
  if (!raid) notFound()

  const entries = (await getRankedRaidEntries(params.id, 50)) as TableEntry[]
  const topPlayer = entries[0]

  return (
    <main className="min-h-screen bg-bg pb-16">
      <div className="mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-5 sm:pt-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted2 hover:text-text transition-colors"
          >
            ← Back to leaderboard
          </Link>
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
          <div className="flex flex-col gap-7">
            {divisions.map((division) => {
              const rows = division.entries(entries)
              if (rows.length === 0) return null
              return (
                <section key={division.name}>
                  <div className="mb-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={division.icon} alt="" className="h-9 w-9 object-contain" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                        {division.range}
                      </div>
                      <h2 className="text-lg font-bold tracking-[-0.02em]">{division.name}</h2>
                    </div>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div
                    className={
                      division.elevated
                        ? 'grid grid-cols-1 gap-4 lg:grid-cols-3'
                        : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
                    }
                  >
                    {rows.map((entry) => (
                      <RaidCard key={entry.playerId || `${entry.rank}-${entry.name}`} raid={raid} entry={entry} elevated={division.elevated} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
