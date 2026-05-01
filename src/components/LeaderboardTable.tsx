'use client'
import { useState } from 'react'
import { RankBadge } from '@/components/ui/RankBadge'
import { Avatar } from '@/components/ui/Avatar'
import { hexToRgb } from '@/lib/utils'

export interface TableEntry {
  rank: number
  name: string
  score: number
  isGuild: boolean
  club?: string | null
  favouriteStudent?: string | null
  favouriteStudentImage?: string | null
  playerId?: string
}

interface Props {
  players: TableEntry[]
  accent: string
  onPlayerClick?: (playerId: string) => void
  cap?: number
}

export function LeaderboardTable({ players, accent, onPlayerClick, cap }: Props) {
  const [hov, setHov] = useState<number | null>(null)
  const shown = cap ? players.slice(0, cap) : players
  const glow = `rgba(${hexToRgb(accent)},0.07)`

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border2">
            <th className="sticky left-0 bg-card z-10 px-2 sm:px-3.5 py-2.5 text-center text-muted text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap w-12 sm:w-14">
              RANK
            </th>
            <th className="px-2 sm:px-3.5 py-2.5 text-left text-muted text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap">
              PLAYER
            </th>
            <th className="px-2 sm:px-3.5 py-2.5 text-right text-muted text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap">
              SCORE
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((p, i) => {
            const isHov = hov === i
            const initials = ((p.favouriteStudent || p.name).slice(0, 2)).toUpperCase()
            const rowBg = isHov ? 'rgba(255,255,255,0.03)' : p.rank <= 3 ? glow : 'transparent'
            return (
              <tr
                key={`${p.name}-${i}`}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
                className="border-b border-border transition-colors"
                style={{ background: rowBg }}
              >
                <td
                  className="sticky left-0 z-10 px-2 sm:px-3.5 py-3 text-center w-12 sm:w-14"
                  style={{ background: rowBg }}
                >
                  <RankBadge rank={p.rank} />
                </td>
                <td className="px-2 sm:px-3.5 py-3">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <Avatar initials={initials} color={accent} image={p.favouriteStudentImage} alt={p.favouriteStudent || p.name} />
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                      {p.playerId ? (
                        <button
                          onClick={() => onPlayerClick?.(p.playerId!)}
                          className={`bg-transparent border-0 cursor-pointer p-0 font-semibold text-sm font-sans transition-colors truncate max-w-[140px] sm:max-w-none ${
                            isHov ? 'underline' : ''
                          }`}
                          style={{
                            color: isHov
                              ? p.isGuild ? accent : 'var(--muted)'
                              : p.isGuild ? 'var(--text)' : 'var(--muted2)',
                            textDecorationColor: p.isGuild ? accent : 'var(--muted)',
                          }}
                        >
                          {p.name}
                        </button>
                      ) : (
                        <span className="font-medium text-muted2 text-sm truncate max-w-[140px] sm:max-w-none">
                          {p.name}
                        </span>
                      )}
                      {p.isGuild ? (
                        <span className="text-[10px] px-1.5 py-px rounded bg-green/[0.12] text-green border border-green/25 font-semibold tracking-[0.05em]">
                          {p.club || 'GUILD'}
                        </span>
                      ) : p.club ? (
                        <span className="text-[10px] px-1.5 py-px rounded bg-[rgba(255,255,255,0.05)] text-muted border border-border font-semibold tracking-[0.05em]">
                          {p.club}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-2 sm:px-3.5 py-3 text-right">
                  <span
                    className="font-mono font-bold text-[15px] tabular-nums"
                    style={{ color: p.isGuild ? accent : 'var(--muted2)' }}
                  >
                    {p.score.toLocaleString()}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
