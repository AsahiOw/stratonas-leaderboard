'use client'
import { useState, useEffect } from 'react'
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
  color: string
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface Props {
  raid: Raid
  onClose: () => void
  onPlayerClick?: (name: string) => void
}

export function RaidDetailModal({ raid, onClose, onPlayerClick }: Props) {
  const [full, setFull] = useState<TableEntry[]>([])

  useEffect(() => {
    fetch(`/api/raids/${raid.id}/entries`)
      .then((r) => r.json())
      .then((data: TableEntry[]) => setFull(data))
  }, [raid.id])

  return (
    <StModal
      title={`${raid.raidBoss.name} — S${raid.season} · Full Rankings (Top 50)`}
      onClose={onClose}
      wide
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ServerBadge server={raid.server.name} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {raid.type.name} · {fmtDate(raid.startDate)} — {fmtDate(raid.endDate)}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted2)' }}>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>GUILD</span> badge = your members
        </span>
      </div>
      <div style={{ maxHeight: '62vh', overflowY: 'auto', overscrollBehavior: 'contain', borderRadius: 10, border: '1px solid var(--border)' }}>
        <LeaderboardTable players={full} accent={raid.color} onPlayerClick={onPlayerClick} />
      </div>
    </StModal>
  )
}
