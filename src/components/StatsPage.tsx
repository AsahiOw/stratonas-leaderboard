'use client'
import { useState, useEffect } from 'react'
import { StatCard } from '@/components/ui/StatCard'
import { BarChart } from '@/components/ui/BarChart'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { StreakBadge } from '@/components/ui/StreakBadge'

interface StatsData {
  topClub: { name: string; count: number }
  topSubmitClub: { name: string; count: number }
  activePlayers: number
  rank1Global: { name: string; playerId: string; raid: string } | null
  rank1JP: { name: string; playerId: string; raid: string } | null
  topByScore: { name: string; val: number }[]
  clubDist: { name: string; val: number }[]
  liveStreaks: { name: string; playerId: string; streak: number; raid: string; server: string }[]
}

interface Props {
  onPlayerClick?: (playerId: string) => void
}

export function StatsPage({ onPlayerClick }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats)
  }, [])

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 0' }}>Loading stats...</div>
    )
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 40 }}>
      {/* 5 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon="🏅" label="Highest Club Participants" value={stats.topClub.name} sub={`${stats.topClub.count} players registered`} color="var(--gold)" />
        <StatCard icon="⚔️" label="Top Submitting Club (Global)" value={stats.topSubmitClub.name} sub={`${stats.topSubmitClub.count} total entries`} color="#a78bfa" />
        <StatCard icon="👥" label="Active Players" value={stats.activePlayers} sub="Registered & active" color="var(--green)" />
        <StatCard icon="🌐" label="Rank 1 — Global" value={stats.rank1Global?.name ?? '—'} sub={stats.rank1Global?.raid ?? 'No active raid'} color="var(--accent)" />
        <StatCard icon="🎌" label="Rank 1 — JP" value={stats.rank1JP?.name ?? '—'} sub={stats.rank1JP?.raid ?? 'No active raid'} color="#f87171" />
      </div>

      {/* Score bar chart */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Total Score by Player</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>Combined across all raids · Click player names to view profile</div>
        <BarChart data={stats.topByScore} color="var(--accent)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Club distribution */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Club Distribution</div>
          <BarChart data={stats.clubDist} color="#a78bfa" />
        </div>

        {/* Live streaks */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Live Streaks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.liveStreaks.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No active streaks.</div>
            )}
            {stats.liveStreaks.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => onPlayerClick?.(s.playerId)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontWeight: 600, fontSize: 13, color: 'var(--text)',
                    fontFamily: 'var(--font), Space Grotesk, sans-serif',
                  }}
                >
                  {s.name}
                </button>
                <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}>{s.raid}</span>
                <ServerBadge server={s.server} />
                <StreakBadge streak={s.streak} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
