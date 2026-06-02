'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RaidBanner } from '@/components/RaidBanner'
import { LeaderboardTable, type TableEntry } from '@/components/LeaderboardTable'
import { RaidDetailModal } from '@/components/RaidDetailModal'
import { ReturnLocationLink } from '@/components/ReturnLocationLink'
import { imageSrc } from '@/lib/utils'

interface Raid {
  id: string
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  isActive: boolean
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
  returnTab?: string
}

const podiumRankStyles: Record<number, { rank: string; border: string; bg: string }> = {
  1: { rank: '#ffe45c', border: '#ffe45c66', bg: '#ffe45c14' },
  2: { rank: '#d8dee9', border: '#d8dee955', bg: '#d8dee90f' },
  3: { rank: '#ff9f6a', border: '#ff9f6a66', bg: '#ff9f6a12' },
}

function TopThreePodium({
  entries,
  accent,
  onPlayerClick,
  returnTab,
}: {
  entries: TableEntry[]
  accent: string
  onPlayerClick?: (playerId: string) => void
  returnTab: string
}) {
  if (entries.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-2.5 border-b border-border bg-[#11111a] p-3 sm:grid-cols-3 sm:p-3.5">
      {entries.map((entry) => {
        const style = podiumRankStyles[entry.rank] || podiumRankStyles[3]
        const clubColor = entry.clubColor || (entry.isGuild ? 'var(--green)' : 'var(--muted)')
        const portrait = imageSrc(entry.favouriteStudentImage || entry.favouriteStudentPortrait)

        return (
          <article
            key={`${entry.rank}-${entry.name}`}
            className="relative isolate min-h-[108px] overflow-hidden rounded-md border px-4 py-3"
            style={{
              borderColor: style.border,
              background: `linear-gradient(135deg, ${style.bg}, rgba(255,255,255,0.025) 44%, rgba(0,0,0,0.16))`,
              boxShadow: entry.rank === 1 ? `0 0 24px ${style.bg}` : undefined,
            }}
          >
            {portrait && (
              <div className="absolute inset-y-0 right-0 z-0 w-[58%] opacity-38">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portrait}
                  alt=""
                  className="h-full w-full object-cover object-[center_24%]"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,#11111a_0%,rgba(17,17,26,0.46)_48%,rgba(17,17,26,0.14)_100%)]" />
              </div>
            )}

            <div className="relative z-10 flex h-full items-center gap-3">
              <div
                className="font-mono text-[38px] font-black leading-none tracking-[-0.08em] sm:text-[42px]"
                style={{ color: style.rank, textShadow: `0 0 16px ${style.bg}` }}
              >
                {String(entry.rank).padStart(2, '0')}
              </div>
              <div className="min-w-0">
                <div className="mb-1 min-w-0">
                  {entry.playerId ? (
                    <button
                      type="button"
                      onClick={() => onPlayerClick?.(entry.playerId!)}
                      className="block max-w-[170px] truncate border-0 bg-transparent p-0 text-left text-sm font-extrabold text-text hover:underline"
                      style={{ textDecorationColor: entry.clubColor || accent }}
                    >
                      {entry.name}
                    </button>
                  ) : (
                    <div className="max-w-[170px] truncate text-sm font-extrabold text-text">{entry.name}</div>
                  )}
                  <div className="font-mono text-[13px] font-black tabular-nums" style={{ color: style.rank }}>
                    {entry.score.toLocaleString()}
                  </div>
                </div>
                {entry.clubId ? (
                  <ReturnLocationLink
                    href={`/clubs/${entry.clubId}`}
                    returnTab={returnTab}
                    className="inline-flex max-w-full rounded-sm border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      background: entry.clubColor ? `${entry.clubColor}18` : 'rgba(255,255,255,0.05)',
                      borderColor: entry.clubColor ? `${entry.clubColor}45` : 'var(--border2)',
                      color: clubColor,
                    }}
                  >
                    <span className="truncate">{entry.club || (entry.isGuild ? 'Guild' : 'Guest')}</span>
                  </ReturnLocationLink>
                ) : (
                  <span
                    className="inline-flex max-w-full rounded-sm border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      background: entry.clubColor ? `${entry.clubColor}18` : 'rgba(255,255,255,0.05)',
                      borderColor: entry.clubColor ? `${entry.clubColor}45` : 'var(--border2)',
                      color: clubColor,
                    }}
                  >
                    <span className="truncate">{entry.club || (entry.isGuild ? 'Guild' : 'Guest')}</span>
                  </span>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function RaidBlock({ raid, entries, onPlayerClick, capRows, defaultOpen = true, returnTab = 'leaderboard' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [showDetail, setShowDetail] = useState(false)
  const [hideGuests, setHideGuests] = useState(false)

  const filteredEntries = hideGuests
    ? entries.filter((e) => e.isGuild).map((e, i) => ({ ...e, rank: i + 1 }))
    : entries
  const podiumEntries = filteredEntries.slice(0, 3)
  const tableEntries = capRows ? filteredEntries.slice(3, capRows) : filteredEntries.slice(3)
  const hasEntries = entries.length > 0
  const topPlayer = filteredEntries[0]
    ? { name: filteredEntries[0].name, score: filteredEntries[0].score }
    : null

  return (
    <div className="fade-up mb-5 sm:mb-6">
      <div className="relative">
        <button
          type="button"
          onClick={() => router.push(`/leaderboard/${raid.id}`)}
          className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
          aria-label={`Open ${raid.raidBoss.name} S${raid.season} raid leaderboard`}
        >
          <RaidBanner raid={raid} topPlayer={topPlayer} />
        </button>
        {hasEntries && (
          <button
            onClick={(e) => { e.stopPropagation(); setHideGuests((v) => !v) }}
            aria-pressed={hideGuests}
            className={`absolute right-3 top-3 sm:right-auto sm:top-auto sm:left-5 sm:bottom-4 z-10 rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors backdrop-blur-sm ${
              hideGuests
                ? 'bg-accent/20 border-accent/35 text-accent'
                : 'bg-black/45 border-white/10 text-muted hover:text-muted2 hover:border-white/20'
            }`}
          >
            {hideGuests ? 'Guild Only' : 'All Players'}
          </button>
        )}
      </div>

      {open && (
        <div
          className="bg-card border border-t-0 rounded-b-xl overflow-hidden"
          style={{ borderColor: `${raid.color}25` }}
        >
          <div key={hideGuests ? 'guild-only' : 'all-players'} className="leaderboard-filter-transition">
            <TopThreePodium entries={podiumEntries} accent={raid.color} onPlayerClick={onPlayerClick} returnTab={returnTab} />
            <LeaderboardTable
              players={tableEntries}
              accent={raid.color}
              onPlayerClick={onPlayerClick}
              returnTab={returnTab}
            />
          </div>
          <div className="border-t border-border px-3 py-3 sm:px-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => router.push(`/leaderboard/${raid.id}`)}
              className="rounded-md px-4 py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 border w-full sm:w-auto transition-colors"
              style={{
                background: `${raid.color}15`,
                borderColor: `${raid.color}35`,
                color: raid.color,
              }}
            >
              View Card Rankings (Top 50) →
            </button>
            <button
              onClick={() => setShowDetail(true)}
              className="bg-transparent border border-border rounded-md px-3.5 py-1 text-muted text-xs hover:text-text hover:border-border2 transition-colors w-full sm:w-auto"
            >
              Table View
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
          <span key={hideGuests ? 'guild-only-summary' : 'all-players-summary'} className="leaderboard-filter-transition text-xs text-muted">
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
          initialEntries={entries}
          returnTab={returnTab}
        />
      )}
    </div>
  )
}
