'use client'
import { useEffect, useState } from 'react'
import { StModal } from '@/components/ui/StModal'
import { LeaderboardTable, type TableEntry } from '@/components/LeaderboardTable'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { fmtDate } from '@/lib/utils'

interface Raid {
  id: string
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  color: string
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface Props {
  raid: Raid
  onClose: () => void
  onPlayerClick?: (playerId: string) => void
  hideGuests: boolean
  onToggleGuests: () => void
  initialEntries?: TableEntry[]
  returnTab?: string
}

export function RaidDetailModal({ raid, onClose, onPlayerClick, hideGuests, onToggleGuests, initialEntries = [], returnTab = 'leaderboard' }: Props) {
  const [full, setFull] = useState<TableEntry[]>(initialEntries)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (initialEntries.length > 0) {
      setFull(initialEntries)
      return
    }

    fetch(`/api/raids/${raid.id}/entries`)
      .then((r) => r.json())
      .then((data: TableEntry[]) => setFull(data))
      .catch(() => undefined)
  }, [initialEntries, raid.id])

  const filteredFull = (hideGuests
    ? full.filter((e) => e.isGuild).map((e, i) => ({ ...e, rank: i + 1 }))
    : full
  )
  const searchTerm = search.trim().toLowerCase()
  const searchedFull = searchTerm
    ? filteredFull.filter((e) => e.name.toLowerCase().includes(searchTerm))
    : filteredFull

  return (
    <StModal
      title={`${raid.raidBoss.name} — S${raid.season} · Full Table`}
      onClose={onClose}
      fullScreen
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3.5 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <ServerBadge server={raid.server.name} />
          <span className="text-xs text-muted">
            {raid.type.name} · {raid.terrain.name} · {fmtDate(raid.startDate)} — {fmtDate(raid.endDate)}
          </span>
          <span className="text-xs text-muted2">
            <span className="font-mono text-text">{searchedFull.length}</span> entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search player"
            aria-label="Search player name"
            className="w-36 rounded border border-border bg-card2 px-2.5 py-1 text-xs text-text outline-none transition-colors placeholder:text-muted focus:border-border2 sm:w-44"
          />
          <button
            onClick={onToggleGuests}
            aria-pressed={hideGuests}
            className={`text-[11px] px-2.5 py-1 rounded border font-semibold tracking-[0.04em] transition-colors ${hideGuests
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-transparent border-border text-muted hover:text-muted2 hover:border-border2'
              }`}
          >
            {hideGuests ? 'Guild Only' : 'All Players'}
          </button>
        </div>
      </div>
      <div className="scrollbar-hidden flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border">
        <div key={hideGuests ? 'guild-only' : 'all-players'} className="leaderboard-filter-transition">
          {searchedFull.length > 0 ? (
            <LeaderboardTable players={searchedFull} accent={raid.color} onPlayerClick={onPlayerClick} returnTab={returnTab} />
          ) : (
            <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-sm text-muted">
              No players found for "{search.trim()}".
            </div>
          )}
        </div>
      </div>
    </StModal>
  )
}
