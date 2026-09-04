'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { RaidDetailModal, type RaidDetailData } from '@/components/RaidDetailModal'
import { PlayerProfile } from '@/components/PlayerProfile'
import { RankBadge } from '@/components/ui/RankBadge'
import { ServerBadge } from '@/components/ui/ServerBadge'
import { fmtDate } from '@/lib/utils'

export type PlayerParticipationEntry = {
  id: string
  rank: number
  score: number
  raid: RaidDetailData
}

function ParticipationRow({ entry, accent, featured, onOpen }: {
  entry: PlayerParticipationEntry
  accent: string
  featured?: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative w-full overflow-hidden rounded-xl border border-border px-3.5 text-left transition duration-200 hover:-translate-y-px hover:bg-card2 hover:shadow-[0_10px_24px_rgba(0,0,0,0.16)] sm:px-4 ${featured ? 'py-4' : 'bg-bg/35 py-3'}`}
      style={featured ? {
        background: `linear-gradient(100deg,${accent}12,var(--bg) 48%,var(--bg))`,
        borderColor: `${accent}38`,
      } : undefined}
    >
      {featured && <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />}
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {featured && <span className="mb-1.5 inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]" style={{ background: `${accent}12`, borderColor: `${accent}28`, color: accent }}>Most Recent</span>}
            <div className="break-words text-sm font-bold leading-5 text-text">{entry.raid.raidBoss.name}</div>
          </div>
          <div className="shrink-0"><ServerBadge server={entry.raid.server.name} /></div>
        </div>
        <div className="mt-1 text-xs text-muted">S{entry.raid.season} · {entry.raid.terrain.name}</div>
        <div className="mt-1 font-mono text-[10px] leading-4 text-muted">{fmtDate(entry.raid.startDate)} — {fmtDate(entry.raid.endDate)}</div>
        <div className="mt-3 grid grid-cols-[1fr_auto_16px] items-end gap-3 border-t border-border pt-3">
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Rank</div>
            <RankBadge rank={entry.rank} size="sm" />
          </div>
          <div className="text-right">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Score</div>
            <div className="font-mono text-sm font-bold" style={{ color: accent }}>{entry.score.toLocaleString('en-US')}</div>
          </div>
          <ChevronRight size={16} className="mb-0.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-muted2" aria-hidden />
        </div>
      </div>

      <div className="hidden gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {featured && <span className="rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]" style={{ background: `${accent}12`, borderColor: `${accent}28`, color: accent }}>Most Recent</span>}
            <span className="font-bold text-text">{entry.raid.raidBoss.name}</span>
            <span className="text-xs text-muted">S{entry.raid.season} · {entry.raid.terrain.name}</span>
            <ServerBadge server={entry.raid.server.name} />
          </div>
          <div className="font-mono text-[11px] text-muted">{fmtDate(entry.raid.startDate)} — {fmtDate(entry.raid.endDate)}</div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
          <RankBadge rank={entry.rank} size={featured ? undefined : 'sm'} />
          <div className="text-right">
            <div className="font-mono text-sm font-bold" style={{ color: accent }}>{entry.score.toLocaleString('en-US')}</div>
            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">Score</div>
          </div>
          <ChevronRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-muted2" aria-hidden />
        </div>
      </div>
    </button>
  )
}

export function PlayerParticipation({ entries, playerId, accent }: {
  entries: PlayerParticipationEntry[]
  playerId: string
  accent: string
}) {
  const [selectedEntry, setSelectedEntry] = useState<PlayerParticipationEntry | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [hideGuests, setHideGuests] = useState(false)
  const mostRecent = entries[0] || null
  const history = entries.slice(1)

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border bg-card2/35 px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">Participation</h2>
          <div className="mt-1 text-xs text-muted">Select a result to open its full leaderboard and locate this player.</div>
        </div>
        {!mostRecent ? (
          <div className="py-10 text-center text-sm text-muted">No raid participation found.</div>
        ) : (
          <div className="flex flex-col gap-2.5 p-3 sm:p-4">
            <ParticipationRow entry={mostRecent} accent={accent} featured onOpen={() => setSelectedEntry(mostRecent)} />
            {history.length > 0 && (
              <div className="flex flex-col gap-2">
                {history.map((entry) => (
                  <ParticipationRow key={entry.id} entry={entry} accent={accent} onOpen={() => setSelectedEntry(entry)} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {selectedEntry && (
        <RaidDetailModal
          raid={selectedEntry.raid}
          onClose={() => setSelectedEntry(null)}
          hideGuests={hideGuests}
          onToggleGuests={() => setHideGuests((current) => !current)}
          onPlayerClick={setSelectedPlayerId}
          focusPlayerId={playerId}
          returnTab="leaderboard"
        />
      )}
      {selectedPlayerId && (
        <PlayerProfile
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
          returnTab="leaderboard"
        />
      )}
    </>
  )
}
