import { notFound } from 'next/navigation'
import { ClubRoster } from '@/components/ClubRoster'
import { ReturnBackLink } from '@/components/PlayerBackLink'
import { PublicHeader } from '@/components/PublicHeader'
import { imageSrc } from '@/lib/utils'
import { getPublicClubProfile } from '@/lib/public-data'

export const dynamic = 'force-dynamic'

function fmtNum(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '-'
}

function fmtCompactScore(value: number | null | undefined) {
  if (typeof value !== 'number') return '-'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}K`
  return value.toLocaleString()
}

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const club = await getPublicClubProfile(id)
  if (!club) notFound()

  const topContributor = [...club.roster].sort((a, b) => b.totalScore - a.totalScore || a.ign.localeCompare(b.ign))[0] || null
  const mostActive = [...club.roster].sort((a, b) => b.totalEntries - a.totalEntries || a.ign.localeCompare(b.ign))[0] || null
  const bestAverage = [...club.roster]
    .filter((player) => player.totalEntries > 0)
    .sort((a, b) => b.averageScore - a.averageScore || b.totalEntries - a.totalEntries || a.ign.localeCompare(b.ign))[0] || null
  const podiumLeader = [...club.roster].sort((a, b) => b.podiums - a.podiums || b.totalScore - a.totalScore || a.ign.localeCompare(b.ign))[0] || null

  return (
    <main className="min-h-screen bg-bg pb-16">
      <PublicHeader
        actions={(
          <ReturnBackLink />
        )}
      />
      <div className="mx-auto w-full max-w-[1120px] px-4 pt-5 sm:px-5 sm:pt-7">
        <section
          className="mb-5 overflow-hidden rounded-2xl border bg-card"
          style={{ borderColor: `${club.color}35` }}
        >
          <div
            className="px-5 py-5 sm:px-6"
            style={{ background: `linear-gradient(135deg,${club.color}22,rgba(255,255,255,0.02))` }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {club.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageSrc(club.logo)} alt="" className="h-20 w-20 shrink-0 object-contain" />
                ) : (
                  <div className="h-16 w-3 rounded-full" style={{ background: club.color }} />
                )}
                <div className="min-w-0">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: club.color }}>Club Archive</div>
                  <h1 className="break-words text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{club.name}</h1>
                  <div className="mt-1 text-sm text-muted2">{club.uid ? `UID ${club.uid}` : 'Stratonas club page'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[360px] sm:grid-cols-4">
                {[
                  ['Total Score', fmtCompactScore(club.stats.totalScore), 'var(--accent)'],
                  ['Entries', fmtNum(club.stats.totalEntries), 'var(--green)'],
                  ['Players', fmtNum(club.stats.activePlayerCount), club.color],
                  ['Podiums', fmtNum(club.stats.podiums), '#a78bfa'],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-lg border border-border bg-bg/35 px-3 py-2 text-center">
                    <div className="font-mono text-lg font-bold" style={{ color }}>{value}</div>
                    <div className="text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            {[
              ['Average Entry', fmtNum(club.stats.averageScore)],
              ['Best Rank', club.stats.bestRank ? `#${club.stats.bestRank}` : '-'],
              ['Top Contributor', topContributor?.ign || '-', topContributor ? fmtNum(topContributor.totalScore) : 'Total score'],
              ['Most Total Entries', mostActive ? fmtNum(mostActive.totalEntries) : '-'],
              ['Best Average', bestAverage?.ign || '-', bestAverage ? fmtNum(bestAverage.averageScore) : 'Average score'],
              ['Podium Leader', podiumLeader?.ign || '-', podiumLeader ? `${fmtNum(podiumLeader.podiums)} podiums` : 'Podiums'],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-xl border border-border bg-card2 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
                <div className={`mt-1 truncate font-semibold text-muted2 ${detail ? 'text-sm' : 'text-lg'}`}>{value}</div>
                {detail && <div className="mt-0.5 truncate font-mono text-xs text-muted">{detail}</div>}
              </div>
            ))}
          </div>
        </section>

        <ClubRoster roster={club.roster} clubColor={club.color} />
      </div>
    </main>
  )
}
