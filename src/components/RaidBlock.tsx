'use client'
import { useState } from 'react'
import { RaidBanner } from '@/components/RaidBanner'
import { LeaderboardTable, type TableEntry } from '@/components/LeaderboardTable'
import { RaidDetailModal } from '@/components/RaidDetailModal'

interface Raid {
  id: string
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  status: string
  color: string
  color2: string
  pattern: string
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface Props {
  raid: Raid
  entries: TableEntry[]
  onPlayerClick?: (playerId: string) => void
  capRows?: number
  defaultOpen?: boolean
}

export function RaidBlock({ raid, entries, onPlayerClick, capRows, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [showDetail, setShowDetail] = useState(false)
  const [hideGuests, setHideGuests] = useState(false)

  const filteredEntries = hideGuests
    ? entries.filter((e) => e.isGuild).map((e, i) => ({ ...e, rank: i + 1 }))
    : entries
  const topPlayer = filteredEntries[0]
    ? { name: filteredEntries[0].name, score: filteredEntries[0].score }
    : null

  return (
    <div className="fade-up mb-5 sm:mb-6">
      <div className="relative">
        <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">
          <RaidBanner raid={raid} topPlayer={topPlayer} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setHideGuests((v) => !v) }}
          className={`absolute bottom-3.5 left-4 sm:bottom-4 sm:left-5 z-10 text-[11px] px-2.5 py-1 rounded border font-semibold tracking-[0.04em] transition-colors backdrop-blur-sm ${
            hideGuests
              ? 'bg-accent/20 border-accent/35 text-accent'
              : 'bg-black/40 border-white/10 text-muted hover:text-muted2 hover:border-white/20'
          }`}
        >
          {hideGuests ? 'Guild Only' : 'All Players'}
        </button>
      </div>

      {open && (
        <div
          className="bg-card border border-t-0 rounded-b-xl overflow-hidden"
          style={{ borderColor: `${raid.color}25` }}
        >
          <LeaderboardTable
            players={filteredEntries}
            accent={raid.color}
            onPlayerClick={onPlayerClick}
            cap={capRows}
          />
          <div className="border-t border-border px-3 py-3 sm:px-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setShowDetail(true)}
              className="rounded-md px-4 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 border w-full sm:w-auto transition-colors"
              style={{
                background: `${raid.color}15`,
                borderColor: `${raid.color}35`,
                color: raid.color,
              }}
            >
              View Full Rankings (Top 50) →
            </button>
            <button
              onClick={() => setOpen(false)}
              className="bg-transparent border border-border rounded-md px-3.5 py-1 text-muted text-xs hover:text-text hover:border-border2 transition-colors w-full sm:w-auto"
            >
              Collapse ▲
            </button>
          </div>
        </div>
      )}

      {!open && (
        <div
          className="bg-card border border-t-0 rounded-b-xl px-3 py-2.5 sm:px-4 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center"
          style={{ borderColor: `${raid.color}25` }}
        >
          <span className="text-xs text-muted">
            Top: {topPlayer?.name} ({topPlayer?.score.toLocaleString()} pts)
          </span>
          <button
            onClick={() => setOpen(true)}
            className="bg-transparent border border-border rounded-md px-3.5 py-1 text-muted text-xs hover:text-text hover:border-border2 transition-colors w-full sm:w-auto"
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
          hideGuests={hideGuests}
          onToggleGuests={() => setHideGuests((v) => !v)}
        />
      )}
    </div>
  )
}
