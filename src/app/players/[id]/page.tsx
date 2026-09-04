import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { PublicHeader } from '@/components/PublicHeader'
import { PlayerBackLink } from '@/components/PlayerBackLink'
import { PlayerRankChart } from '@/components/PlayerRankChart'
import { PlayerParticipation } from '@/components/PlayerParticipation'
import { fmtDate, imageSrc, memorialPosterSrc } from '@/lib/utils'
import { getPublicPlayerProfile } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

function fmtNum(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString('en-US') : '-'
}

function fmtCompactScore(value: number | null | undefined) {
  if (typeof value !== 'number') return '-'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}K`
  return value.toLocaleString('en-US')
}

function fmtRank(value: number | null | undefined) {
  return value ? `#${value.toLocaleString('en-US')}` : '-'
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await getPublicPlayerProfile(id)
  if (!player) notFound()

  const favouriteStudentName = player.favouriteStudentData?.name || player.favouriteStudent
  const initials = ((favouriteStudentName || player.ign).slice(0, 2)).toUpperCase()
  const clubId = player.clubId || player.clubData?.id || null
  const clubName = player.clubData?.name || player.club || 'Guest'
  const accent = player.clubData?.color || '#4f8ef7'
  const cover = memorialPosterSrc(player.favouriteStudentData?.memorial, imageSrc(player.favouriteStudentData?.image))
  const journey = player.journey
  const rankChange = journey?.rankChange
  const rankChangeLabel = rankChange === null || rankChange === undefined
    ? '-'
    : rankChange === 0
      ? 'No change'
      : `${rankChange > 0 ? 'Up' : 'Down'} ${Math.abs(rankChange).toLocaleString('en-US')}`
  const rankRange = journey?.bestRank && journey?.worstRank
    ? `${fmtRank(journey.bestRank)} – ${fmtRank(journey.worstRank)}`
    : '-'

  return (
    <main className="min-h-screen bg-bg pb-16">
      <PublicHeader
        actions={(
          <PlayerBackLink />
        )}
      />
      <div className="mx-auto w-full max-w-[1040px] px-4 pt-5 sm:px-5 sm:pt-7">
        <section className="mb-5 overflow-hidden rounded-2xl border bg-card" style={{ borderColor: `${accent}35` }}>
          <div className="relative min-h-[260px] bg-bg">
            {cover && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,13,19,0.24),rgba(13,13,19,0.96))] sm:bg-[linear-gradient(to_bottom,rgba(13,13,19,0.08),rgba(13,13,19,0.9))]" />
              </>
            )}
            <div className="absolute inset-x-0 bottom-0 px-5 py-5 [text-shadow:0_1px_12px_rgba(0,0,0,0.95)] sm:px-6 sm:[text-shadow:none]" style={{ background: `linear-gradient(to top,rgba(13,13,19,0.74),${accent}24,transparent)` }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar initials={initials} color={accent} size={68} image={player.favouriteStudentData?.image} alt={favouriteStudentName || player.ign} />
                  <div className="min-w-0 rounded-lg bg-bg/45 px-3 py-2 backdrop-blur-[2px] sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                    <h1 className="break-words text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{player.ign}</h1>
                    <div className="mt-1 text-sm [color:#d9d9e8] sm:text-muted2">
                      @{player.username} · {clubId ? (
                        <Link href={`/clubs/${clubId}`} className="hover:underline" style={{ color: accent }}>{clubName}</Link>
                      ) : clubName}
                    </div>
                    <div className="mt-1 text-xs [color:#c7c7d8] sm:text-muted">
                      Fav: <span className="[color:#f1f1fa] sm:text-muted2">{favouriteStudentName || '-'}</span> · Added {fmtDate(player.joinedDate)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-[300px] sm:grid-cols-4">
                  {[
                    ['Total', fmtCompactScore(journey?.totalScore), accent],
                    ['Best', journey?.bestRank ? `#${journey.bestRank}` : '-', 'var(--gold)'],
                    ['Entries', fmtNum(journey?.totalEntries), 'var(--green)'],
                    ['Podiums', fmtNum(journey?.podiums), '#a78bfa'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-lg border border-border bg-bg/75 px-3 py-2 text-center shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md sm:bg-bg/55 sm:shadow-none sm:backdrop-blur-sm">
                      <div className="font-mono text-lg font-bold" style={{ color }}>{value}</div>
                      <div className="text-[10px] uppercase tracking-[0.08em] text-muted2 sm:text-muted">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-text">Performance snapshot</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Average Score', fmtNum(journey?.averageScore)],
                ['Average Rank', fmtRank(journey?.averageRank)],
                ['Median Rank', fmtRank(journey?.medianRank)],
                ['Rank Range', rankRange],
                ['Podium Rate', `${journey?.podiumRate ?? 0}%`],
                ['Top 10 Rate', `${journey?.top10Rate ?? 0}%`],
                ['Top 50 Rate', `${journey?.top50Rate ?? 0}%`],
                ['Participation', `${journey?.participationRate ?? 0}%`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-xl border border-border bg-card2 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
                  <div className="mt-1 truncate font-mono text-base font-bold text-muted2">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-card2/35 px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold text-text">Recent form</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
            {[
              ['Latest Rank', fmtRank(journey?.latestRank)],
              ['Latest Percentile', journey?.latestPercentile ? `Top ${journey.latestPercentile}%` : '-'],
              ['Rank Change', rankChangeLabel],
              ['Last 5 Average', fmtRank(journey?.lastFiveAverageRank)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-border bg-card2 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
                <div className="mt-1 truncate font-mono text-lg font-bold" style={{ color: label === 'Rank Change' && rankChange ? (rankChange > 0 ? 'var(--green)' : '#f87171') : accent }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-card2/35 px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold text-text">Performance strengths</h2>
            <p className="mt-1 text-xs text-muted">Best average placements by raid category.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
            {[
              ['Best Raid Type', journey?.bestRaidType],
              ['Best Terrain', journey?.bestTerrain],
              ['Best Boss', journey?.bestBoss],
            ].map(([label, breakdown]) => {
              const value = typeof breakdown === 'object' && breakdown ? breakdown : null
              return (
                <div key={label as string} className="min-w-0 rounded-xl border border-border bg-card2 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label as string}</div>
                  <div className="mt-1 truncate text-sm font-bold text-text" title={value?.name}>{value?.name || '-'}</div>
                  <div className="mt-1 font-mono text-xs text-muted2">{value ? `${fmtRank(value.averageRank)} average · ${value.entries} ${value.entries === 1 ? 'entry' : 'entries'}` : 'No ranked entries'}</div>
                </div>
              )
            })}
          </div>
        </section>

        <PlayerRankChart
          accent={accent}
          points={player.entries
            .filter((entry) => entry.rank > 0 && entry.raid.startDate)
            .map((entry) => ({
              id: entry.id,
              rank: entry.rank,
              date: new Date(String(entry.raid.startDate)).toISOString(),
              raidType: entry.raid.type.name,
              label: `${entry.raid.raidBoss.name} S${entry.raid.season}`,
            }))}
        />

        <PlayerParticipation
          playerId={player.id}
          accent={accent}
          entries={player.entries.map((entry) => ({
            id: entry.id,
            rank: entry.rank,
            score: entry.score,
            raid: entry.raid,
          }))}
        />
      </div>
    </main>
  )
}
