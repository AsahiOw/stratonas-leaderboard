'use client'
import { useState } from 'react'
import { RankBadge } from '@/components/ui/RankBadge'
import { Avatar } from '@/components/ui/Avatar'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { WinRate } from '@/components/ui/WinRate'
import { hexToRgb } from '@/lib/utils'

export interface TableEntry {
  rank: number
  name: string
  score: number
  w: number
  l: number
  streak: number
  isGuild: boolean
  favouriteStudent?: string | null
}

interface Props {
  players: TableEntry[]
  accent: string
  onPlayerClick?: (name: string) => void
  cap?: number
}

const LAST_ACTIVE = ['30m', '1h', '2h', '3h', '5h', '8h', '1d', '1d', '2d', '2d']

export function LeaderboardTable({ players, accent, onPlayerClick, cap }: Props) {
  const [hov, setHov] = useState<number | null>(null)
  const shown = cap ? players.slice(0, cap) : players
  const glow = `rgba(${hexToRgb(accent)},0.07)`

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border2)' }}>
            {['RANK', 'PLAYER', 'SCORE', 'W/L', 'STREAK', 'LAST ACTIVE'].map((h) => (
              <th key={h} style={{
                padding: '10px 14px',
                textAlign: h === 'RANK' ? 'center' : 'left',
                color: 'var(--muted)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.08em', whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((p, i) => {
            const isHov = hov === i
            const initials = ((p.favouriteStudent || p.name).slice(0, 2)).toUpperCase()
            return (
              <tr
                key={`${p.name}-${i}`}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
                style={{
                  background: isHov ? 'rgba(255,255,255,0.03)' : p.rank <= 3 ? glow : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.15s', cursor: 'default',
                }}
              >
                <td style={{ padding: '12px 14px', textAlign: 'center', width: 56 }}>
                  <RankBadge rank={p.rank} />
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={initials} color={accent} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {p.isGuild
                        ? (
                          <button
                            onClick={() => onPlayerClick?.(p.name)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              fontWeight: 600, color: isHov ? accent : 'var(--text)',
                              fontSize: 14, fontFamily: 'var(--font), Space Grotesk, sans-serif',
                              transition: 'color 0.15s',
                              textDecoration: isHov ? 'underline' : 'none',
                              textDecorationColor: accent,
                            }}
                          >
                            {p.name}
                          </button>
                        )
                        : (
                          <span style={{ fontWeight: 500, color: 'var(--muted2)', fontSize: 14 }}>{p.name}</span>
                        )
                      }
                      {p.isGuild && (
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 3,
                          background: 'rgba(52,211,153,0.12)', color: 'var(--green)',
                          border: '1px solid rgba(52,211,153,0.25)', fontWeight: 600, letterSpacing: '0.05em',
                        }}>
                          GUILD
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontWeight: 700,
                    color: p.isGuild ? accent : 'var(--muted2)', fontSize: 15,
                  }}>
                    {p.score.toLocaleString()}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}><WinRate w={p.w} l={p.l} /></td>
                <td style={{ padding: '12px 14px' }}><StreakBadge streak={p.streak} /></td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                  {LAST_ACTIVE[i % LAST_ACTIVE.length]} ago
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
