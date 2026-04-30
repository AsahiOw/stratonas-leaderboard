'use client'
import { useState, useEffect } from 'react'
import { StatCard } from '@/components/ui/StatCard'
import { BarChart } from '@/components/ui/BarChart'

interface StatsData {
  topClub: { name: string; count: number }
  topSubmitClub: { name: string; count: number }
  activePlayers: number
  rank1Global: { name: string; playerId: string; raid: string } | null
  rank1JP: { name: string; playerId: string; raid: string } | null
  topByScore: { name: string; val: number }[]
  clubDist: { name: string; val: number }[]
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
      <div className="text-center text-muted py-16">Loading stats...</div>
    )
  }

  return (
    <div className="mx-auto max-w-[920px] pb-10">
      {/* 5 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard icon="🏅" label="Highest Club Participants" value={stats.topClub.name} sub={`${stats.topClub.count} players registered`} color="var(--gold)" />
        <StatCard icon="⚔️" label="Top Submitting Club (Global)" value={stats.topSubmitClub.name} sub={`${stats.topSubmitClub.count} total entries`} color="#a78bfa" />
        <StatCard icon="👥" label="Active Players" value={stats.activePlayers} sub="Registered & active" color="var(--green)" />
        <StatCard icon="🌐" label="Rank 1 — Global" value={stats.rank1Global?.name ?? '—'} sub={stats.rank1Global?.raid ?? 'No active raid'} color="var(--accent)" />
        <StatCard icon="🎌" label="Rank 1 — JP" value={stats.rank1JP?.name ?? '—'} sub={stats.rank1JP?.raid ?? 'No active raid'} color="#f87171" />
      </div>

      {/* Score bar chart */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 mb-4">
        <div className="font-bold text-[15px] mb-1">Total Score by Player</div>
        <div className="text-xs text-muted mb-4 sm:mb-5">Combined across all raids · Click player names to view profile</div>
        <BarChart data={stats.topByScore} color="var(--accent)" />
      </div>

      {/* Club distribution */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <div className="font-bold text-[15px] mb-4 sm:mb-5">Club Distribution</div>
        <BarChart data={stats.clubDist} color="#a78bfa" />
      </div>
    </div>
  )
}
