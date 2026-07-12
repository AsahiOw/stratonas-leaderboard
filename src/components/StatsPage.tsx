'use client'
import { Archive, ChartColumn, ClipboardList, Landmark, Swords, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ReturnLocationLink } from '@/components/ReturnLocationLink'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { StatCard } from '@/components/ui/StatCard'
import { BarChart } from '@/components/ui/BarChart'
import { fmtDate } from '@/lib/utils'

interface ChartItem {
  name: string
  val: number
}

interface LatestRaidLeader {
  id: string
  boss: string
  season: number
  type: string
  server: string
  terrain: string
  color: string
  entryCount: number
  topPlayer: { name: string; playerId: string; score: number } | null
}

interface TopPlayer {
  rank: number
  playerId: string
  name: string
  club: string
  clubId?: string | null
  totalScore: number
  entryCount: number
  averageScore: number
  bestRank: number | null
  podiums: number
}

interface ClubStanding {
  rank: number
  id?: string | null
  name: string
  totalScore: number
  entryCount: number
  playerCount: number
  averageScore: number
}

interface RaidBreakdown {
  id: string
  boss: string
  season: number
  type: string
  server: string
  terrain: string
  isActive: boolean
  color: string
  startDate?: string | null
  endDate?: string | null
  entryCount: number
  uniquePlayers: number
  uniqueClubs: number
  averageScore: number
  topPlayer: { name: string; playerId: string; score: number } | null
}

interface StatsData {
  snapshot: {
    totalPlayers: number
    totalEntries: number
    latestRaids: number
    completedRaids: number
    uniqueClubs: number
    averageEntriesPerRaid: number
  }
  currentRaidLeaders: LatestRaidLeader[]
  topPlayers: TopPlayer[]
  clubStandings: ClubStanding[]
  raidBreakdown: RaidBreakdown[]
  charts: {
    topPlayerScores: ChartItem[]
    entriesByRaid: ChartItem[]
    clubParticipation: ChartItem[]
  }
}

interface Props {
  onPlayerClick?: (playerId: string) => void
}

const sectionClass = 'bg-card border border-border rounded-2xl p-4 sm:p-5'
const INITIAL_VISIBLE_ROWS = 10
const SHOW_MORE_ROWS = 50
type PagedSection = 'currentRaidLeaders' | 'topPlayers' | 'clubStandings' | 'raidBreakdown'

function fmtNum(n: number) {
  return n.toLocaleString('en-US')
}

function PlayerButton({ name, playerId, onPlayerClick }: { name: string; playerId: string; onPlayerClick?: (playerId: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPlayerClick?.(playerId)}
      className="bg-transparent border-0 p-0 text-left font-semibold text-text hover:text-accent hover:underline transition-colors"
    >
      {name}
    </button>
  )
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-muted text-sm py-8">{children}</div>
}

export function StatsPage({ onPlayerClick }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [visibleRows, setVisibleRows] = useState<Record<PagedSection, number>>({
    currentRaidLeaders: INITIAL_VISIBLE_ROWS,
    topPlayers: INITIAL_VISIBLE_ROWS,
    clubStandings: INITIAL_VISIBLE_ROWS,
    raidBreakdown: INITIAL_VISIBLE_ROWS,
  })

  useEffect(() => {
    fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()).then(setStats)
  }, [])

  if (!stats) {
    return <div className="text-center text-muted py-16">Loading stats...</div>
  }

  const visibleCurrentRaidLeaders = stats.currentRaidLeaders.slice(0, visibleRows.currentRaidLeaders)
  const visibleTopPlayers = stats.topPlayers.slice(0, visibleRows.topPlayers)
  const visibleClubStandings = stats.clubStandings.slice(0, visibleRows.clubStandings)
  const visibleRaidBreakdown = stats.raidBreakdown.slice(0, visibleRows.raidBreakdown)

  function showMore(section: PagedSection) {
    setVisibleRows((prev) => ({ ...prev, [section]: prev[section] + SHOW_MORE_ROWS }))
  }

  function showLess(section: PagedSection) {
    setVisibleRows((prev) => ({ ...prev, [section]: Math.max(INITIAL_VISIBLE_ROWS, prev[section] - SHOW_MORE_ROWS) }))
  }

  function PageSummary({ shown, total }: { shown: number; total: number }) {
    if (total <= INITIAL_VISIBLE_ROWS) return null
    return (
      <div className="text-[12px] text-muted mb-3">
        Showing {Math.min(shown, total)} of {total}
      </div>
    )
  }

  function PagingControls({ section, shown, total }: { section: PagedSection; shown: number; total: number }) {
    const canShowMore = shown < total
    const canShowLess = shown > INITIAL_VISIBLE_ROWS
    if (!canShowMore && !canShowLess) return null

    return (
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        {canShowMore && (
          <button
            type="button"
            onClick={() => showMore(section)}
            className="w-full sm:w-auto bg-card2 border border-border rounded-lg px-4 py-2 text-sm font-semibold text-muted2 hover:text-text hover:border-border2 transition-colors"
          >
            Show more
          </button>
        )}
        {canShowLess && (
          <button
            type="button"
            onClick={() => showLess(section)}
            className="w-full sm:w-auto bg-transparent border border-border rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:text-text hover:border-border2 transition-colors"
          >
            Show less
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1040px] pb-10">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <StatCard icon={<UsersRound size={18} aria-hidden />} label="Players" value={fmtNum(stats.snapshot.totalPlayers)} sub="Registered players" color="var(--accent)" />
        <StatCard icon={<ClipboardList size={18} aria-hidden />} label="Entries" value={fmtNum(stats.snapshot.totalEntries)} sub="Submitted scores" color="var(--green)" />
        <StatCard icon={<Swords size={18} aria-hidden />} label="Latest Raids" value={fmtNum(stats.snapshot.latestRaids)} sub="Shown on leaderboard" color="#f87171" />
        <StatCard icon={<Archive size={18} aria-hidden />} label="Archived" value={fmtNum(stats.snapshot.completedRaids)} sub="Previous results" color="#a78bfa" />
        <StatCard icon={<Landmark size={18} aria-hidden />} label="Clubs" value={fmtNum(stats.snapshot.uniqueClubs)} sub="Excluding guests" color="var(--gold)" />
        <StatCard icon={<ChartColumn size={18} aria-hidden />} label="Avg Entries" value={fmtNum(stats.snapshot.averageEntriesPerRaid)} sub="Per raid" color="#38bdf8" />
      </div>

      <section className={`${sectionClass} mb-5`}>
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <div className="font-bold text-[15px]">Latest Raid Leaders</div>
            <div className="text-xs text-muted mt-1">Most recent raid results by server</div>
          </div>
        </div>
        {stats.currentRaidLeaders.length === 0 ? (
          <EmptyBlock>No latest raid results yet.</EmptyBlock>
        ) : (
          <>
            <PageSummary shown={visibleCurrentRaidLeaders.length} total={stats.currentRaidLeaders.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleCurrentRaidLeaders.map((raid) => (
                <div
                  key={raid.id}
                  className="border rounded-xl p-4 bg-bg/40"
                  style={{ borderColor: `${raid.color}35` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="font-bold text-base break-words">{raid.boss}</div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted mt-1">
                        <span>S{raid.season} · {raid.type} · {raid.terrain}</span>
                        <ServerBadge server={raid.server} />
                      </div>
                    </div>
                    <div
                      className="font-mono text-[12px] rounded-md px-2 py-1 border shrink-0"
                      style={{ color: raid.color, borderColor: `${raid.color}45`, background: `${raid.color}12` }}
                    >
                      {fmtNum(raid.entryCount)} entries
                    </div>
                  </div>
                  {raid.topPlayer ? (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] text-muted uppercase tracking-[0.08em]">Leader</div>
                        <PlayerButton name={raid.topPlayer.name} playerId={raid.topPlayer.playerId} onPlayerClick={onPlayerClick} />
                      </div>
                      <div className="font-mono font-bold text-lg" style={{ color: raid.color }}>
                        {fmtNum(raid.topPlayer.score)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted py-2">No entries yet</div>
                  )}
                </div>
              ))}
            </div>
            <PagingControls section="currentRaidLeaders" shown={visibleCurrentRaidLeaders.length} total={stats.currentRaidLeaders.length} />
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <section className={sectionClass}>
          <div className="font-bold text-[15px] mb-1">Top Player Scores</div>
          <div className="text-xs text-muted mb-4">Combined score across all raids</div>
          {stats.charts.topPlayerScores.length > 0 ? (
            <BarChart data={stats.charts.topPlayerScores} color="var(--accent)" />
          ) : (
            <EmptyBlock>No score data yet.</EmptyBlock>
          )}
        </section>
        <section className={sectionClass}>
          <div className="font-bold text-[15px] mb-1">Entries by Raid</div>
          <div className="text-xs text-muted mb-4">Raid boards with the most entries</div>
          {stats.charts.entriesByRaid.length > 0 ? (
            <BarChart data={stats.charts.entriesByRaid} color="var(--green)" />
          ) : (
            <EmptyBlock>No entries yet.</EmptyBlock>
          )}
        </section>
        <section className={sectionClass}>
          <div className="font-bold text-[15px] mb-1">Club Participation</div>
          <div className="text-xs text-muted mb-4">Entry volume by club</div>
          {stats.charts.clubParticipation.length > 0 ? (
            <BarChart data={stats.charts.clubParticipation} color="#a78bfa" />
          ) : (
            <EmptyBlock>No club entries yet.</EmptyBlock>
          )}
        </section>
      </div>

      <section className={`${sectionClass} mb-5`}>
        <div className="font-bold text-[15px] mb-1">Top Players</div>
        <div className="text-xs text-muted mb-4">Ranked by total score, with consistency markers</div>
        {stats.topPlayers.length === 0 ? (
          <EmptyBlock>No player entries yet.</EmptyBlock>
        ) : (
          <div className="horizontal-scrollbar overflow-x-auto overflow-y-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border2">
                  {['#', 'PLAYER', 'CLUB', 'TOTAL', 'ENTRIES', 'AVG', 'BEST', 'PODIUMS'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTopPlayers.map((player, index) => (
                  <tr key={player.playerId} className={index < visibleTopPlayers.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-3 py-3 font-mono text-muted2">#{player.rank}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <PlayerButton name={player.name} playerId={player.playerId} onPlayerClick={onPlayerClick} />
                    </td>
                    <td className="px-3 py-3 text-muted2">
                      {player.clubId ? (
                        <ReturnLocationLink href={`/clubs/${player.clubId}`} returnTab="stats" className="text-muted2 hover:text-text hover:underline">
                          {player.club}
                        </ReturnLocationLink>
                      ) : player.club}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-accent">{fmtNum(player.totalScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.entryCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.averageScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{player.bestRank ? `#${player.bestRank}` : '-'}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.podiums)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PageSummary shown={visibleTopPlayers.length} total={stats.topPlayers.length} />
            <PagingControls section="topPlayers" shown={visibleTopPlayers.length} total={stats.topPlayers.length} />
          </div>
        )}
      </section>

      <section className={`${sectionClass} mb-5`}>
        <div className="font-bold text-[15px] mb-1">Club Standings</div>
        <div className="text-xs text-muted mb-4">Total contribution and participation by club</div>
        {stats.clubStandings.length === 0 ? (
          <EmptyBlock>No club data yet.</EmptyBlock>
        ) : (
          <div className="horizontal-scrollbar overflow-x-auto overflow-y-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border2">
                  {['#', 'CLUB', 'TOTAL SCORE', 'PLAYERS', 'ENTRIES', 'AVG ENTRY'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleClubStandings.map((club, index) => (
                  <tr key={club.name} className={index < visibleClubStandings.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-3 py-3 font-mono text-muted2">#{club.rank}</td>
                    <td className="px-3 py-3 font-semibold whitespace-nowrap">
                      {club.id ? (
                        <ReturnLocationLink href={`/clubs/${club.id}`} returnTab="stats" className="text-text hover:text-accent hover:underline">
                          {club.name}
                        </ReturnLocationLink>
                      ) : club.name}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-accent">{fmtNum(club.totalScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(club.playerCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(club.entryCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(club.averageScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PageSummary shown={visibleClubStandings.length} total={stats.clubStandings.length} />
            <PagingControls section="clubStandings" shown={visibleClubStandings.length} total={stats.clubStandings.length} />
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <div className="font-bold text-[15px] mb-1">Raid Breakdown</div>
        <div className="text-xs text-muted mb-4">Participation and winning scores across every raid</div>
        {stats.raidBreakdown.length === 0 ? (
          <EmptyBlock>No raids yet.</EmptyBlock>
        ) : (
          <div className="horizontal-scrollbar overflow-x-auto overflow-y-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border2">
                  {['RAID', 'SERVER', 'DATES', 'ENTRIES', 'CLUBS', 'TOP PLAYER', 'AVG SCORE'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRaidBreakdown.map((raid, index) => (
                  <tr key={raid.id} className={index < visibleRaidBreakdown.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-3 py-3">
                      <div className="font-semibold whitespace-nowrap">{raid.boss} S{raid.season}</div>
                      <div className="text-[11px] text-muted">{raid.type} · {raid.terrain} · {raid.isActive ? 'Latest' : 'Archived'}</div>
                    </td>
                    <td className="px-3 py-3"><ServerBadge server={raid.server} /></td>
                    <td className="px-3 py-3 text-muted font-mono text-[11px] whitespace-nowrap">
                      {fmtDate(raid.startDate)} - {fmtDate(raid.endDate)}
                    </td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(raid.entryCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(raid.uniqueClubs)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {raid.topPlayer ? (
                        <div>
                          <PlayerButton name={raid.topPlayer.name} playerId={raid.topPlayer.playerId} onPlayerClick={onPlayerClick} />
                          <div className="font-mono text-[11px] text-muted">{fmtNum(raid.topPlayer.score)}</div>
                        </div>
                      ) : (
                        <span className="text-muted">No entries</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(raid.averageScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PageSummary shown={visibleRaidBreakdown.length} total={stats.raidBreakdown.length} />
            <PagingControls section="raidBreakdown" shown={visibleRaidBreakdown.length} total={stats.raidBreakdown.length} />
          </div>
        )}
      </section>
    </div>
  )
}
