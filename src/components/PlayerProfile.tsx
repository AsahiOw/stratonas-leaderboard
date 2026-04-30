'use client'
import { useState, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { RankBadge } from '@/components/ui/RankBadge'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { WinRate } from '@/components/ui/WinRate'
import { fmtDate } from '@/lib/utils'

interface RaidInfo {
  id: string
  name: string
  episode?: string | null
  season?: string | null
  server: string
  status: string
  color: string
  color2: string
  startDate?: string | null
  endDate?: string | null
}

interface EntryWithRaid {
  id: string
  score: number
  wins: number
  losses: number
  streak: number
  rank: number
  raid: RaidInfo
}

interface PlayerData {
  id: string
  ign: string
  username: string
  favouriteStudent?: string | null
  joinedDate?: string | null
  club?: string | null
  clubID?: string | null
  userID?: string | null
  status: string
  entries: EntryWithRaid[]
}

interface Props {
  playerId: string
  onClose: () => void
}

export function PlayerProfile({ playerId, onClose }: Props) {
  const [player, setPlayer] = useState<PlayerData | null>(null)

  useEffect(() => {
    fetch(`/api/players/${playerId}`)
      .then((r) => r.json())
      .then(setPlayer)
  }, [playerId])

  if (!player) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  const initials = ((player.favouriteStudent || player.ign).slice(0, 2)).toUpperCase()
  const activeEntries = player.entries.filter((e) => e.raid.status === 'CURRENT')
  const historyEntries = player.entries.filter((e) => e.raid.status === 'PREVIOUS')

  const totalScore = player.entries.reduce((s, e) => s + e.score, 0)
  const bestRank = player.entries.length ? Math.min(...player.entries.map((e) => e.rank)) : null
  const totalW = player.entries.reduce((s, e) => s + e.wins, 0)
  const totalL = player.entries.reduce((s, e) => s + e.losses, 0)
  const winRate = totalW + totalL > 0 ? Math.round((totalW / (totalW + totalL)) * 100) : 0
  const bestStreak = player.entries.length ? Math.max(...player.entries.map((e) => e.streak)) : 0

  const summaryStats = [
    { label: 'Total Score',  val: totalScore.toLocaleString(), color: 'var(--accent)'  },
    { label: 'Best Rank',    val: bestRank ? `#${bestRank}` : '—', color: 'var(--gold)' },
    { label: 'Win Rate',     val: `${winRate}%`,                color: 'var(--green)'  },
    { label: 'Best Streak',  val: bestStreak,                   color: 'var(--accent2)' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 18,
          width: '100%', maxWidth: 600, maxHeight: '88vh', overflow: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0', background: 'linear-gradient(to bottom,rgba(79,142,247,0.07),transparent)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar initials={initials} color="var(--accent)" size={56} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>{player.ign}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  @{player.username} · {player.club} <span style={{ color: 'var(--border2)' }}>({player.clubID})</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Fav: <span style={{ color: 'var(--accent)' }}>{player.favouriteStudent}</span>
                  {' · '}UID: {player.userID}
                  {' · '}Joined {fmtDate(player.joinedDate)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, padding: 4, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {summaryStats.map((s) => (
              <div key={s.label} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Active raids */}
          {activeEntries.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                ACTIVE RAIDS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeEntries.map((e) => (
                  <div key={e.id} style={{
                    background: `linear-gradient(to right,${e.raid.color}12,var(--card2))`,
                    border: `1px solid ${e.raid.color}30`, borderRadius: 10, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{e.raid.name}</span>
                        <span style={{ fontSize: 11, color: `${e.raid.color}cc` }}>{e.raid.episode}</span>
                        <ServerBadge server={e.raid.server} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
                        {fmtDate(e.raid.startDate)} — {fmtDate(e.raid.endDate)}
                      </div>
                      <WinRate w={e.wins} l={e.losses} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <RankBadge rank={e.rank} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: e.raid.color, fontSize: 16 }}>
                          {e.score.toLocaleString()}
                        </div>
                        <div style={{ marginTop: 3 }}><StreakBadge streak={e.streak} /></div>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
                RAID HISTORY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historyEntries.map((e) => (
                  <div key={e.id} style={{
                    background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '10px 16px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', opacity: 0.88,
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{e.raid.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{e.raid.episode}</span>
                        <ServerBadge server={e.raid.server} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 2 }}>
                        {fmtDate(e.raid.startDate)} — {fmtDate(e.raid.endDate)}
                      </div>
                      <WinRate w={e.wins} l={e.losses} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <RankBadge rank={e.rank} size="sm" />
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--muted2)', fontSize: 14 }}>
                        {e.score.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {player.entries.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0', fontSize: 14 }}>
              No raid history found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
