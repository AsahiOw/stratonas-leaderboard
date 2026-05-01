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
}

export function RaidDetailModal({ raid, onClose, onPlayerClick, hideGuests, onToggleGuests }: Props) {
  const [full, setFull] = useState<TableEntry[]>([])

  useEffect(() => {
    fetch(`/api/raids/${raid.id}/entries`)
      .then((r) => r.json())
      .then((data: TableEntry[]) => setFull(data))
  }, [raid.id])

  const filteredFull = (hideGuests
    ? full.filter((e) => e.isGuild).map((e, i) => ({ ...e, rank: i + 1 }))
    : full
  ).slice(0, 50)

  return (
    <StModal
      title={`${raid.raidBoss.name} — S${raid.season} · Top 50`}
      onClose={onClose}
      fullScreen
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3.5 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <ServerBadge server={raid.server.name} />
          <span className="text-xs text-muted">
            {raid.type.name} · {raid.terrain.name} · {fmtDate(raid.startDate)} — {fmtDate(raid.endDate)}
          </span>
          <span className="text-xs text-muted2 ml-auto sm:ml-0">
            <span className="font-mono text-text">{filteredFull.length}</span> entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleGuests}
            className={`text-[11px] px-2.5 py-1 rounded border font-semibold tracking-[0.04em] transition-colors ${
              hideGuests
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-transparent border-border text-muted hover:text-muted2 hover:border-border2'
            }`}
          >
            {hideGuests ? 'Guild Only' : 'All Players'}
          </button>
          <span className="text-xs text-muted2">
            <span className="text-green font-semibold">GUILD</span> badge = your members
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border">
        <LeaderboardTable players={filteredFull} accent={raid.color} onPlayerClick={onPlayerClick} />
      </div>
    </StModal>
  )
}
