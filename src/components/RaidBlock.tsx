'use client'
import { useState } from 'react'
import { RaidBanner } from '@/components/RaidBanner'
import { LeaderboardTable, type TableEntry } from '@/components/LeaderboardTable'
import { RaidDetailModal } from '@/components/RaidDetailModal'

interface Raid {
  id: string
  name: string
  episode?: string | null
  season?: string | null
  server: string
  status: string
  color: string
  color2: string
  pattern: string
  desc?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface Props {
  raid: Raid
  entries: TableEntry[]
  onPlayerClick?: (name: string) => void
  capRows?: number
}

export function RaidBlock({ raid, entries, onPlayerClick, capRows }: Props) {
  const [open, setOpen] = useState(true)
  const [showDetail, setShowDetail] = useState(false)
  const topPlayer = entries[0] ? { name: entries[0].name, score: entries[0].score } : null

  return (
    <div className="fade-up" style={{ marginBottom: 22 }}>
      <div onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
        <RaidBanner raid={raid} topPlayer={topPlayer} participantCount={entries.length} />
      </div>

      {open && (
        <div style={{
          background: 'var(--card)',
          border: `1px solid ${raid.color}25`,
          borderTop: `1px solid ${raid.color}18`,
          borderRadius: '0 0 14px 14px',
          overflow: 'hidden',
        }}>
          <LeaderboardTable
            players={entries}
            accent={raid.color}
            onPlayerClick={onPlayerClick}
            cap={capRows}
          />
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <button
              onClick={() => setShowDetail(true)}
              style={{
                background: `${raid.color}15`, border: `1px solid ${raid.color}35`,
                borderRadius: 7, padding: '6px 16px', color: raid.color,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              View Full Rankings (Top 50) →
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 14px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
              }}
            >
              Collapse ▲
            </button>
          </div>
        </div>
      )}

      {!open && (
        <div style={{
          background: 'var(--card)',
          border: `1px solid ${raid.color}25`,
          borderTop: `1px solid ${raid.color}18`,
          borderRadius: '0 0 14px 14px',
          padding: '10px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {entries.length} guild participants · Top: {topPlayer?.name} ({topPlayer?.score.toLocaleString()} pts)
          </span>
          <button
            onClick={() => setOpen(true)}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '5px 14px', color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
            }}
          >
            Expand ▼
          </button>
        </div>
      )}

      {showDetail && (
        <RaidDetailModal
          raid={raid}
          onClose={() => setShowDetail(false)}
          onPlayerClick={onPlayerClick}
        />
      )}
    </div>
  )
}
