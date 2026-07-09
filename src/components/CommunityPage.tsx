'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Landmark, LayoutGrid, Search, UsersRound } from 'lucide-react'
import { ReturnLocationLink } from '@/components/ReturnLocationLink'
import { imageSrc } from '@/lib/utils'

interface CommunityData {
  topClubs: Array<{
    id: string
    rank: number
    name: string
    logo?: string | null
    color: string
    totalScore: number
    totalEntries: number
    activePlayerCount: number
    averageScore: number
    bestRank: number | null
    podiums: number
  }>
  featuredPlayers: Array<{
    rank: number
    playerId: string
    name: string
    club: string
    clubId?: string | null
    totalScore: number
    entryCount: number
    bestRank: number | null
    podiums: number
  }>
  players: Array<{
    rank: number | null
    playerId: string
    name: string
    username: string
    isGuildMember: boolean
    club: string
    clubId?: string | null
    favouriteStudent?: string | null
    favouriteStudentImage?: string | null
    totalScore: number
    entryCount: number
    averageScore: number
    bestRank: number | null
    podiums: number
  }>
}

type SearchMode = 'all' | 'clubs' | 'players'
type ClubSort = 'score-desc' | 'score-asc' | 'name-asc' | 'name-desc' | 'members-desc' | 'members-asc'
type PlayerSort = 'score-desc' | 'score-asc' | 'name-asc' | 'name-desc' | 'student-asc' | 'student-desc'
type PlayerScope = 'all' | 'members' | 'guests'

interface Props {
  onPlayerClick?: (playerId: string) => void
}

function fmtNum(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '-'
}

function fmtCompact(value: number | null | undefined) {
  return typeof value === 'number'
    ? Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : '-'
}

function includesQuery(fields: Array<string | number | null | undefined>, query: string) {
  if (!query) return true
  return fields.some((field) => String(field || '').toLowerCase().includes(query))
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' })
}

const INITIAL_VISIBLE = 6

export function CommunityPage({ onPlayerClick }: Props) {
  const [data, setData] = useState<CommunityData | null>(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<SearchMode>('all')
  const [clubSort, setClubSort] = useState<ClubSort>('score-desc')
  const [playerSort, setPlayerSort] = useState<PlayerSort>('score-desc')
  const [playerScope, setPlayerScope] = useState<PlayerScope>('all')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/community?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()).then(setData).catch(() => setData(null))
  }, [])

  useEffect(() => {
    setExpanded(false)
  }, [search, mode, clubSort, playerSort, playerScope])

  const query = search.trim().toLowerCase()
  const filteredClubs = useMemo(() => {
    if (!data || mode === 'players') return []
    const matches = data.topClubs.filter((club) => includesQuery([
      club.name,
      club.rank,
      club.totalScore,
      club.activePlayerCount,
    ], query))
    if (mode !== 'clubs') return matches

    return [...matches].sort((a, b) => {
      if (clubSort === 'score-asc') return a.totalScore - b.totalScore || compareText(a.name, b.name)
      if (clubSort === 'name-asc') return compareText(a.name, b.name)
      if (clubSort === 'name-desc') return compareText(b.name, a.name)
      if (clubSort === 'members-desc') return b.activePlayerCount - a.activePlayerCount || compareText(a.name, b.name)
      if (clubSort === 'members-asc') return a.activePlayerCount - b.activePlayerCount || compareText(a.name, b.name)
      return b.totalScore - a.totalScore || compareText(a.name, b.name)
    })
  }, [clubSort, data, mode, query])

  const filteredPlayers = useMemo(() => {
    if (!data || mode === 'clubs') return []
    const matches = data.players.filter((player) => {
      if (mode === 'players' && playerScope === 'members' && !player.isGuildMember) return false
      if (mode === 'players' && playerScope === 'guests' && player.isGuildMember) return false

      return includesQuery([
        player.name,
        player.username,
        player.club,
        player.favouriteStudent,
        player.rank,
      ], query)
    })
    if (mode !== 'players') return matches

    return [...matches].sort((a, b) => {
      if (playerSort === 'score-asc') return a.totalScore - b.totalScore || compareText(a.name, b.name)
      if (playerSort === 'name-asc') return compareText(a.name, b.name)
      if (playerSort === 'name-desc') return compareText(b.name, a.name)
      if (playerSort === 'student-asc') return compareText(a.favouriteStudent, b.favouriteStudent) || compareText(a.name, b.name)
      if (playerSort === 'student-desc') return compareText(b.favouriteStudent, a.favouriteStudent) || compareText(a.name, b.name)
      return b.totalScore - a.totalScore || compareText(a.name, b.name)
    })
  }, [data, mode, playerScope, playerSort, query])

  const visibleClubs = expanded ? filteredClubs : filteredClubs.slice(0, INITIAL_VISIBLE)
  const visiblePlayers = expanded ? filteredPlayers : filteredPlayers.slice(0, INITIAL_VISIBLE)
  const hiddenCount = (filteredClubs.length - visibleClubs.length) + (filteredPlayers.length - visiblePlayers.length)
  const memberCount = data?.players.filter((player) => player.isGuildMember).length || 0
  const guestCount = data ? data.players.length - memberCount : 0

  if (!data) return <div className="py-16 text-center text-sm text-muted">Loading community archive...</div>

  return (
    <div className="mx-auto max-w-[1120px] pb-10">
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">COMMUNITY ARCHIVE</div>
        <h2 className="text-xl font-bold tracking-[-0.02em] sm:text-2xl">Stratónas Community</h2>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
        <div className="relative border-b border-border bg-bg">
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_24%,rgba(79,142,247,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(52,211,153,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_46%)]" />
          <div className="relative px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                Clubs / Players
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted2" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search club, player, username, student..."
                  className="h-12 w-full rounded-xl border border-border2 bg-[#0d0d13] pl-10 pr-3 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] outline-none placeholder:text-muted focus:border-accent/70 focus:bg-[#0d0d13]"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ['all', LayoutGrid, `All ${data.topClubs.length + data.players.length}`],
                  ['clubs', Landmark, `Clubs ${data.topClubs.length}`],
                  ['players', UsersRound, `Players ${data.players.length}`],
                ].map(([id, Icon, label]) => (
                  <button
                    key={id as string}
                    type="button"
                    onClick={() => setMode(id as SearchMode)}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors ${mode === id
                      ? 'border-accent/60 bg-accent/15 text-text'
                      : 'border-border bg-card/70 text-muted2 hover:border-border2 hover:text-text'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label as string}
                  </button>
                ))}
              </div>
              {mode !== 'all' && (
                <div className="mt-3 max-w-4xl">
                  {mode === 'players' && (
                    <>
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Show</div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {[
                          ['all', `All players ${data.players.length}`],
                          ['members', `Members ${memberCount}`],
                          ['guests', `Guests ${guestCount}`],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPlayerScope(id as PlayerScope)}
                            className={`h-9 rounded-lg border px-3 text-xs font-bold transition-colors ${playerScope === id
                              ? 'border-accent/60 bg-accent/15 text-text'
                              : 'border-border bg-card/70 text-muted2 hover:border-border2 hover:text-text'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">Sort</div>
                  <div className="flex flex-wrap gap-2">
                    {(mode === 'clubs'
                      ? [
                        ['score-desc', 'Score high to low'],
                        ['score-asc', 'Score low to high'],
                        ['name-asc', 'Alphabet A to Z'],
                        ['name-desc', 'Alphabet Z to A'],
                        ['members-desc', 'Members high to low'],
                        ['members-asc', 'Members low to high'],
                      ]
                      : [
                        ['score-desc', 'Score high to low'],
                        ['score-asc', 'Score low to high'],
                        ['name-asc', 'Alphabet A to Z'],
                        ['name-desc', 'Alphabet Z to A'],
                        ['student-asc', 'Favourite student A to Z'],
                        ['student-desc', 'Favourite student Z to A'],
                      ]).map(([id, label]) => {
                        const active = mode === 'clubs' ? clubSort === id : playerSort === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              if (mode === 'clubs') setClubSort(id as ClubSort)
                              else setPlayerSort(id as PlayerSort)
                            }}
                            className={`h-9 rounded-lg border px-3 text-xs font-bold transition-colors ${active
                              ? 'border-accent/60 bg-accent/15 text-text'
                              : 'border-border bg-card/70 text-muted2 hover:border-border2 hover:text-text'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-0 ${mode === 'all' ? 'lg:grid-cols-[0.95fr_1.05fr]' : 'lg:grid-cols-1'}`}>
          {mode !== 'players' && (
            <div className={`border-b border-border p-4 sm:p-5 lg:border-b-0 ${mode === 'all' ? 'lg:border-r' : ''}`}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">Clubs</h3>
                  <div className="mt-1 text-xs text-muted">{filteredClubs.length} matches</div>
                </div>
              </div>
              {filteredClubs.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">No clubs match your search.</div>
              ) : (
                <div className="grid gap-2.5">
                  {visibleClubs.map((club) => (
                    <ReturnLocationLink
                      key={club.id}
                      href={`/clubs/${club.id}`}
                      returnTab="community"
                      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-bg/35 px-3 py-3 no-underline transition-colors hover:border-border2"
                    >
                      {club.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageSrc(club.logo)} alt="" className="h-14 w-14 shrink-0 object-contain" />
                      ) : (
                        <div className="h-12 w-2 shrink-0 rounded-full" style={{ background: club.color }} />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black" style={{ color: club.color }}>#{club.rank}</span>
                          <span className="truncate font-semibold text-text">{club.name}</span>
                        </div>
                        <div className="truncate text-xs text-muted">{club.activePlayerCount} players / {club.totalEntries} entries / {club.podiums} podiums</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-accent">{fmtCompact(club.totalScore)}</div>
                        <ArrowUpRight className="ml-auto mt-1 h-3.5 w-3.5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                      </div>
                    </ReturnLocationLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode !== 'clubs' && (
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">Players</h3>
                  <div className="mt-1 text-xs text-muted">{filteredPlayers.length} matches</div>
                </div>
              </div>
              {filteredPlayers.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">No players match your search.</div>
              ) : (
                <div className={`grid gap-2.5 sm:grid-cols-2 ${mode === 'players' ? 'lg:grid-cols-3' : ''}`}>
                  {visiblePlayers.map((player) => (
                    <button
                      key={player.playerId}
                      type="button"
                      onClick={() => onPlayerClick?.(player.playerId)}
                      className="group min-w-0 rounded-xl border border-border bg-bg/35 p-3 text-left no-underline transition-colors hover:border-border2"
                    >
                      <div className="flex items-start gap-3">
                        {mode === 'players' && player.favouriteStudentImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSrc(player.favouriteStudentImage)}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-lg object-cover object-top"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-text">{player.name}</div>
                              <div className="truncate text-xs text-muted">@{player.username} / {player.club}</div>
                            </div>
                            <div className="shrink-0 rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs font-black text-muted2">
                              {player.rank ? `#${player.rank}` : 'NEW'}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="font-mono font-bold text-accent">{fmtCompact(player.totalScore)}</div>
                              <div className="text-[11px] text-muted">Score</div>
                            </div>
                            <div>
                              <div className="font-mono font-bold text-text">{fmtNum(player.entryCount)}</div>
                              <div className="text-[11px] text-muted">Entries</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-gold">{player.bestRank ? `#${player.bestRank}` : '-'}</div>
                              <div className="text-[11px] text-muted">Best</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {player.favouriteStudent && (
                        <div className="mt-2 truncate border-t border-border pt-2 text-[11px] text-muted2">{player.favouriteStudent}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {hiddenCount > 0 && (
          <div className="border-t border-border px-4 py-4 sm:px-5">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg/35 px-4 py-3 text-sm font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Show more results ({hiddenCount})
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
