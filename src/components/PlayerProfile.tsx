'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { RankBadge } from '@/components/ui/RankBadge'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { fmtDate, imageSrc, memorialPosterSrc } from '@/lib/utils'

interface RaidInfo {
  id: string
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  isActive: boolean
  color: string
  color2: string
  startDate?: string | null
  endDate?: string | null
}

interface EntryWithRaid {
  id: string
  score: number
  rank: number
  raid: RaidInfo
}

interface PlayerData {
  id: string
  ign: string
  username: string
  favouriteStudent?: string | null
  favouriteStudentId?: number | null
  favouriteStudentData?: { id: number; name: string; image: string; memorial?: string | null } | null
  joinedDate?: string | null
  club?: string | null
  clubID?: string | null
  clubId?: string | null
  clubData?: { id: string; name: string; color?: string | null; logo?: string | null } | null
  userID?: string | null
  entries: EntryWithRaid[]
  journey?: {
    totalEntries: number
    totalScore: number
    averageScore: number
    bestRank: number | null
    podiums: number
    rankOnes: number
    top10s: number
    top50s: number
    averageRank: number
    bestScore: number | null
    bestScoreRaid: string | null
    participationRate: number
    latestRank: number | null
    latestRaid: string | null
  }
}

interface Props {
  playerId: string
  onClose: () => void
}

function fmtCompactScore(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}K`
  return value.toLocaleString()
}

export function PlayerProfile({ playerId, onClose }: Props) {
  const [player, setPlayer] = useState<PlayerData | null>(null)
  // Portal into document.body so this overlay sits above any other modal
  // (e.g. the full-rankings RaidDetailModal at z-[300]) and is not bounded
  // by an ancestor that creates a containing block for fixed elements.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    fetch(`/api/players/${playerId}`)
      .then((r) => r.json())
      .then(setPlayer)
  }, [playerId])

  if (!mounted) return null

  if (!player) {
    return createPortal(
      <div
        className="fixed inset-0 z-[400] bg-black/[0.78] flex items-center justify-center"
        onClick={onClose}
      >
        <div className="text-muted text-sm">Loading...</div>
      </div>,
      document.body
    )
  }

  const favouriteStudentName = player.favouriteStudentData?.name || player.favouriteStudent
  const initials = ((favouriteStudentName || player.ign).slice(0, 2)).toUpperCase()
  const latestEntries = player.entries.filter((e) => e.raid.isActive)
  const historyEntries = player.entries.filter((e) => !e.raid.isActive)
  const clubId = player.clubId || player.clubData?.id || null
  const clubName = player.clubData?.name || player.club || 'Guest'
  const accent = player.clubData?.color || '#4f8ef7'
  const cover = memorialPosterSrc(player.favouriteStudentData?.memorial, imageSrc(player.favouriteStudentData?.image))

  const totalScore = player.entries.reduce((s, e) => s + e.score, 0)
  const bestRank = player.entries.length ? Math.min(...player.entries.map((e) => e.rank)) : null

  const summaryStats = [
    { label: 'Total Score', val: fmtCompactScore(player.journey?.totalScore ?? totalScore), color: accent },
    { label: 'Best Rank', val: (player.journey?.bestRank ?? bestRank) ? `#${player.journey?.bestRank ?? bestRank}` : '—', color: 'var(--gold)' },
    { label: 'Entries', val: String(player.journey?.totalEntries ?? player.entries.length), color: 'var(--green)' },
    { label: 'Podiums', val: String(player.journey?.podiums ?? 0), color: '#a78bfa' },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[400] bg-black/[0.78] flex items-stretch sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="scrollbar-hidden bg-card border-0 sm:border sm:border-border2 sm:rounded-[18px] w-full h-full sm:h-auto sm:max-w-[600px] sm:max-h-[88vh] overflow-auto shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative min-h-[150px] overflow-hidden border-b border-border bg-bg">
          {cover && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,13,19,0.18),rgba(13,13,19,0.9))]" />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: `linear-gradient(to top,${accent}24,transparent)` }} />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 border-b border-border" style={{ background: `linear-gradient(to_bottom,${accent}12,transparent)` }}>
          <div className="flex justify-between items-start mb-4 gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
              <Avatar
                initials={initials}
                color={accent}
                size={56}
                image={player.favouriteStudentData?.image}
                alt={favouriteStudentName || player.ign}
              />
              <div className="min-w-0">
                <div className="font-bold text-xl sm:text-[22px] tracking-[-0.02em] break-words">
                  {player.ign}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  @{player.username} · {clubId ? (
                    <Link href={`/clubs/${clubId}`} className="text-muted2 hover:text-text hover:underline">
                      {clubName}
                    </Link>
                  ) : clubName}{' '}
                  <span className="text-border2">({player.clubID})</span>
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  Fav: <span style={{ color: accent }}>{favouriteStudentName || '—'}</span>
                  {' · '}UID: {player.userID}
                  {' · '}Added Date: {fmtDate(player.joinedDate)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="bg-transparent border-0 text-muted hover:text-text cursor-pointer text-xl leading-none w-9 h-9 inline-flex items-center justify-center rounded-md hover:bg-card2 transition-colors shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2.5 mb-5 sm:grid-cols-4">
            {summaryStats.map((s) => (
              <div
                key={s.label}
                className="bg-card2 border border-border rounded-xl p-3 text-center"
              >
                <div
                  className="font-mono font-bold text-xl sm:text-[22px]"
                  style={{ color: s.color }}
                >
                  {s.val}
                </div>
                <div className="text-[11px] text-muted mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5">
          {player.journey && (
            <div className="mb-5 sm:mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold text-muted tracking-[0.1em]">PLAYER JOURNEY</div>
                <Link href={`/players/${player.id}`} className="text-[11px] font-semibold hover:underline" style={{ color: accent }}>
                  Open full profile
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ['Average Score', player.journey.averageScore.toLocaleString()],
                  ['Average Rank', player.journey.averageRank ? `#${player.journey.averageRank}` : '-'],
                  ['Top 10 Finishes', player.journey.top10s.toLocaleString()],
                  ['Top 50 Finishes', player.journey.top50s.toLocaleString()],
                  ['Best Score', player.journey.bestScore ? player.journey.bestScore.toLocaleString() : '-'],
                  ['Participation Rate', `${player.journey.participationRate}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-card2 px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
                    <div className="mt-1 truncate text-sm text-muted2">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participation */}
          {latestEntries.length > 0 && (
            <div className="mb-5 sm:mb-6">
              <div className="text-[11px] font-bold text-green tracking-[0.1em] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
                MOST RECENT PARTICIPATION
              </div>
              <div className="flex flex-col gap-2.5">
                {latestEntries.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border"
                    style={{
                      background: `linear-gradient(to right,${accent}12,var(--card2))`,
                      borderColor: `${accent}30`,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm">{e.raid.raidBoss.name}</span>
                        <span
                          className="text-[11px]"
                          style={{ color: `${accent}cc` }}
                        >
                          S{e.raid.season} · {e.raid.terrain.name}
                        </span>
                        <ServerBadge server={e.raid.server.name} />
                      </div>
                      <div className="text-[11px] text-muted font-mono">
                        {fmtDate(e.raid.startDate)} — {fmtDate(e.raid.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:shrink-0">
                      <RankBadge rank={e.rank} />
                      <div
                        className="font-mono font-bold text-base"
                        style={{ color: accent }}
                      >
                        {e.score.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {historyEntries.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-muted tracking-[0.1em] mb-3">
                HISTORY PARTICIPATION
              </div>
              <div className="flex flex-col gap-2">
                {historyEntries.map((e) => (
                  <div
                    key={e.id}
                    className="bg-card2 border border-border rounded-xl px-4 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between opacity-90"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-[13px]">{e.raid.raidBoss.name}</span>
                        <span className="text-[11px] text-muted">S{e.raid.season} · {e.raid.terrain.name}</span>
                        <ServerBadge server={e.raid.server.name} />
                      </div>
                      <div className="text-[11px] text-muted font-mono">
                        {fmtDate(e.raid.startDate)} — {fmtDate(e.raid.endDate)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:shrink-0">
                      <RankBadge rank={e.rank} size="sm" />
                      <span className="font-mono font-bold text-muted2 text-sm">
                        {e.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {player.entries.length === 0 && (
            <div className="text-center text-muted py-6 text-sm">
              No raid history found.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
