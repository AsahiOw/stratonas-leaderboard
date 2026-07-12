import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { RankBadge } from '@/components/ui/RankBadge'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { PublicHeader } from '@/components/PublicHeader'
import { PlayerBackLink } from '@/components/PlayerBackLink'
import { fmtDate, imageSrc, memorialPosterSrc } from '@/lib/utils'
import { getPublicPlayerProfile } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

type PlayerProfileData = NonNullable<Awaited<ReturnType<typeof getPublicPlayerProfile>>>
type PlayerEntry = PlayerProfileData['entries'][number]

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
  const mostRecent = player.entries[0] || null
  const history = player.entries.slice(1)

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

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6">
            {[
              ['Average Score', fmtNum(journey?.averageScore)],
              ['Average Rank', journey?.averageRank ? `#${journey.averageRank}` : '-'],
              ['Top 10 Finishes', fmtNum(journey?.top10s)],
              ['Top 50 Finishes', fmtNum(journey?.top50s)],
              ['Best Score', journey?.bestScore ? fmtNum(journey.bestScore) : '-'],
              ['Participation Rate', `${journey?.participationRate ?? 0}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card2 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
                <div className="mt-1 truncate text-sm font-semibold text-muted2">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-1 text-base font-bold">Participation</h2>
          <div className="mb-4 text-xs text-muted">Most recent result first, followed by historical participation.</div>
          {!mostRecent ? (
            <div className="py-10 text-center text-sm text-muted">No raid participation found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              <ParticipationRow entry={mostRecent} accent={accent} featured />
              {history.length > 0 && (
                <div className="mt-1 flex flex-col gap-2">
                  {history.map((entry) => (
                    <ParticipationRow key={entry.id} entry={entry} accent={accent} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function ParticipationRow({
  entry,
  accent,
  featured = false,
}: {
  entry: PlayerEntry
  accent: string
  featured?: boolean
}) {
  return (
    <Link
      href={`/leaderboard/${entry.raid.id}`}
      className={`rounded-xl border no-underline hover:border-border2 ${featured ? 'bg-bg/55 px-4 py-4' : 'bg-bg/30 px-4 py-3'}`}
      style={{ borderColor: featured ? `${accent}45` : undefined }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {featured && <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ background: `${accent}18`, color: accent }}>Most Recent</span>}
            <span className="font-semibold text-text">{entry.raid.raidBoss.name}</span>
            <span className="text-xs text-muted">S{entry.raid.season} · {entry.raid.terrain.name}</span>
            <ServerBadge server={entry.raid.server.name} />
          </div>
          <div className="text-[11px] font-mono text-muted">{fmtDate(entry.raid.startDate)} - {fmtDate(entry.raid.endDate)}</div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <RankBadge rank={entry.rank} size={featured ? undefined : 'sm'} />
          <span className="font-mono text-sm font-bold" style={{ color: accent }}>{fmtNum(entry.score)}</span>
        </div>
      </div>
    </Link>
  )
}
