'use client'

import { useEffect, useMemo, useState } from 'react'
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
}

function fmtNum(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '-'
}

const INITIAL_VISIBLE_CLUBS = 5

export function CommunityPage() {
  const [data, setData] = useState<CommunityData | null>(null)
  const [clubSearch, setClubSearch] = useState('')
  const [clubsExpanded, setClubsExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/community?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()).then(setData).catch(() => setData(null))
  }, [])

  useEffect(() => {
    setClubsExpanded(false)
  }, [clubSearch])

  const filteredClubs = useMemo(() => {
    const query = clubSearch.trim().toLowerCase()
    if (!query || !data) return data?.topClubs || []
    return data.topClubs.filter((club) => club.name.toLowerCase().includes(query))
  }, [clubSearch, data])

  const visibleClubs = clubsExpanded ? filteredClubs : filteredClubs.slice(0, INITIAL_VISIBLE_CLUBS)
  const visibleFeaturedPlayers = data?.featuredPlayers.slice(0, visibleClubs.length) || []
  const canShowMoreClubs = filteredClubs.length > visibleClubs.length

  if (!data) return <div className="py-16 text-center text-sm text-muted">Loading community archive...</div>

  return (
    <div className="mx-auto max-w-[1040px] pb-10">
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-muted">COMMUNITY ARCHIVE</div>
        <h2 className="text-xl font-bold tracking-[-0.02em] sm:text-2xl">Stratonas Community</h2>
        <p className="mt-1.5 text-[13px] text-muted2">Search clubs, open club pages, and find active player profiles.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold">Clubs</h3>
              <div className="mt-1 text-xs text-muted">Search by club name and open detailed roster pages.</div>
            </div>
            <input
              value={clubSearch}
              onChange={(event) => setClubSearch(event.target.value)}
              placeholder="Search clubs..."
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-accent/60 sm:w-[220px]"
            />
          </div>
          {filteredClubs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">No clubs match your search.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visibleClubs.map((club) => (
                <ReturnLocationLink key={club.id} href={`/clubs/${club.id}`} returnTab="community" className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-bg/35 px-4 py-3 no-underline transition-colors hover:border-border2 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
                  <div className="w-9 shrink-0 font-mono text-lg font-black" style={{ color: club.color }}>#{club.rank}</div>
                  {club.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageSrc(club.logo)} alt="" className="h-11 w-11 shrink-0 object-contain" />
                  ) : (
                    <div className="h-9 w-2 rounded-full" style={{ background: club.color }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-text">{club.name}</div>
                    <div className="text-xs text-muted">{club.activePlayerCount} players · {club.totalEntries} entries · {club.podiums} podiums</div>
                  </div>
                  <div className="col-span-3 font-mono text-sm font-bold text-accent sm:col-span-1 sm:text-right">{fmtNum(club.totalScore)}</div>
                </ReturnLocationLink>
              ))}
              {canShowMoreClubs && (
                <button
                  type="button"
                  onClick={() => setClubsExpanded(true)}
                  className="rounded-xl border border-border bg-bg/35 px-4 py-3 text-sm font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text"
                >
                  Show more clubs ({filteredClubs.length - visibleClubs.length})
                </button>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-1 text-base font-bold">Featured Journeys</h3>
          <div className="mb-4 text-xs text-muted">Players with strong overall contribution.</div>
          <div className="flex flex-col gap-2.5">
            {visibleFeaturedPlayers.map((player) => (
              <ReturnLocationLink key={player.playerId} href={`/players/${player.playerId}`} returnTab="community" className="flex items-center gap-3 rounded-xl border border-border bg-bg/35 px-4 py-3 no-underline hover:border-border2">
                <div className="font-mono text-lg font-black text-muted2">#{player.rank}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-text">{player.name}</div>
                  <div className="text-xs text-muted">{player.club} · {player.entryCount} entries · {player.podiums} podiums</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-accent">{fmtNum(player.totalScore)}</div>
                  <div className="text-[11px] text-muted">Best {player.bestRank ? `#${player.bestRank}` : '-'}</div>
                </div>
              </ReturnLocationLink>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
