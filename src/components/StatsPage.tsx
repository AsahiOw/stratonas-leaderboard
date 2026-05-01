'use client'
import { useEffect, useState } from 'react'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { StatCard } from '@/components/ui/StatCard'
import { BarChart } from '@/components/ui/BarChart'
import { fmtDate } from '@/lib/utils'

interface ChartItem {
  name: string
  val: number
}

interface CurrentRaidLeader {
  id: string
  boss: string
  season: number
  type: string
  server: string
  color: string
  entryCount: number
  topPlayer: { name: string; playerId: string; score: number } | null
}

interface TopPlayer {
  rank: number
  playerId: string
  name: string
  club: string
  totalScore: number
  entryCount: number
  averageScore: number
  bestRank: number | null
  podiums: number
}

interface ClubStanding {
  rank: number
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
    activeRaids: number
    completedRaids: number
    uniqueClubs: number
    averageEntriesPerRaid: number
  }
  currentRaidLeaders: CurrentRaidLeader[]
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

function fmtNum(n: number) {
  return n.toLocaleString()
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

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats)
  }, [])

  if (!stats) {
    return <div className="text-center text-muted py-16">Loading stats...</div>
  }

  return (
    <div className="mx-auto max-w-[1040px] pb-10">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <StatCard icon="◎" label="Players" value={fmtNum(stats.snapshot.totalPlayers)} sub="Registered players" color="var(--accent)" />
        <StatCard icon="⊞" label="Entries" value={fmtNum(stats.snapshot.totalEntries)} sub="Submitted scores" color="var(--green)" />
        <StatCard icon="⬡" label="Active Raids" value={fmtNum(stats.snapshot.activeRaids)} sub="Currently live" color="#f87171" />
        <StatCard icon="◈" label="Completed" value={fmtNum(stats.snapshot.completedRaids)} sub="Archived raids" color="#a78bfa" />
        <StatCard icon="◉" label="Clubs" value={fmtNum(stats.snapshot.uniqueClubs)} sub="Including guests" color="var(--gold)" />
        <StatCard icon="▦" label="Avg Entries" value={fmtNum(stats.snapshot.averageEntriesPerRaid)} sub="Per raid" color="#38bdf8" />
      </div>

      <section className={`${sectionClass} mb-5`}>
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <div className="font-bold text-[15px]">Current Raid Leaders</div>
            <div className="text-xs text-muted mt-1">Live raid leaders and participation at a glance</div>
          </div>
        </div>
        {stats.currentRaidLeaders.length === 0 ? (
          <EmptyBlock>No active raids right now.</EmptyBlock>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.currentRaidLeaders.map((raid) => (
              <div
                key={raid.id}
                className="border rounded-xl p-4 bg-bg/40"
                style={{ borderColor: `${raid.color}35` }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-bold text-base break-words">{raid.boss}</div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted mt-1">
                      <span>S{raid.season} · {raid.type}</span>
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
          <div className="text-xs text-muted mb-4">Most active raid boards</div>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border2">
                  {['#','PLAYER','CLUB','TOTAL','ENTRIES','AVG','BEST','PODIUMS'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.topPlayers.map((player, index) => (
                  <tr key={player.playerId} className={index < stats.topPlayers.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-3 py-3 font-mono text-muted2">#{player.rank}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <PlayerButton name={player.name} playerId={player.playerId} onPlayerClick={onPlayerClick} />
                    </td>
                    <td className="px-3 py-3 text-muted2">{player.club}</td>
                    <td className="px-3 py-3 font-mono font-bold text-accent">{fmtNum(player.totalScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.entryCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.averageScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{player.bestRank ? `#${player.bestRank}` : '-'}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.podiums)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${sectionClass} mb-5`}>
        <div className="font-bold text-[15px] mb-1">Club Standings</div>
        <div className="text-xs text-muted mb-4">Total contribution and participation by club</div>
        {stats.clubStandings.length === 0 ? (
          <EmptyBlock>No club data yet.</EmptyBlock>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border2">
                  {['#','CLUB','TOTAL SCORE','PLAYERS','ENTRIES','AVG ENTRY'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.clubStandings.map((club, index) => (
                  <tr key={club.name} className={index < stats.clubStandings.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-3 py-3 font-mono text-muted2">#{club.rank}</td>
                    <td className="px-3 py-3 font-semibold whitespace-nowrap">{club.name}</td>
                    <td className="px-3 py-3 font-mono font-bold text-accent">{fmtNum(club.totalScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(club.playerCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(club.entryCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(club.averageScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <div className="font-bold text-[15px] mb-1">Raid Breakdown</div>
        <div className="text-xs text-muted mb-4">Participation and winning scores across every raid</div>
        {stats.raidBreakdown.length === 0 ? (
          <EmptyBlock>No raids yet.</EmptyBlock>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border2">
                  {['RAID','SERVER','DATES','ENTRIES','PLAYERS','CLUBS','TOP PLAYER','AVG SCORE'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.07em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.raidBreakdown.map((raid, index) => (
                  <tr key={raid.id} className={index < stats.raidBreakdown.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-3 py-3">
                      <div className="font-semibold whitespace-nowrap">{raid.boss} S{raid.season}</div>
                      <div className="text-[11px] text-muted">{raid.type} · {raid.isActive ? 'Live' : 'Archived'}</div>
                    </td>
                    <td className="px-3 py-3"><ServerBadge server={raid.server} /></td>
                    <td className="px-3 py-3 text-muted font-mono text-[11px] whitespace-nowrap">
                      {fmtDate(raid.startDate)} - {fmtDate(raid.endDate)}
                    </td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(raid.entryCount)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(raid.uniquePlayers)}</td>
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
          </div>
        )}
      </section>
    </div>
  )
}
