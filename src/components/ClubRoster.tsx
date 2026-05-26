'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'

interface RosterPlayer {
  id: string
  ign: string
  username: string
  userID?: string | null
  favouriteStudent?: string | null
  favouriteStudentImage?: string | null
  totalScore: number
  totalEntries: number
  averageScore: number
  bestRank: number | null
  podiums: number
}

interface Props {
  roster: RosterPlayer[]
  clubColor: string
}

function fmtNum(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '-'
}

export function ClubRoster({ roster, clubColor }: Props) {
  const [query, setQuery] = useState('')
  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => b.totalScore - a.totalScore || b.totalEntries - a.totalEntries || a.ign.localeCompare(b.ign)),
    [roster]
  )
  const filteredRoster = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return sortedRoster
    return sortedRoster.filter((player) => [
      player.ign,
      player.username,
      player.userID,
      player.favouriteStudent,
    ].some((value) => String(value || '').toLowerCase().includes(normalized)))
  }, [query, sortedRoster])

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold">Roster</h2>
          <div className="mt-1 text-xs text-muted">Search IGN, username, UID, or favorite student.</div>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player..."
          className="w-full rounded-lg border border-border bg-bg px-3.5 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-accent/60 sm:w-[260px]"
        />
      </div>
      {filteredRoster.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">No players match your search.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border2">
                {['PLAYER', 'TOTAL', 'ENTRIES', 'AVG', 'BEST', 'PODIUMS'].map((head) => (
                  <th key={head} className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.07em] text-muted">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRoster.map((player, index) => {
                const initials = ((player.favouriteStudent || player.ign).slice(0, 2)).toUpperCase()
                return (
                  <tr key={player.id} className={index < filteredRoster.length - 1 ? 'border-b border-border' : ''}>
                    <td className="px-3 py-3">
                      <Link href={`/players/${player.id}`} className="flex items-center gap-2.5 text-text no-underline hover:underline">
                        <Avatar initials={initials} color={clubColor} image={player.favouriteStudentImage} alt={player.favouriteStudent || player.ign} />
                        <span>
                          <span className="block font-semibold">{player.ign}</span>
                          <span className="block text-[11px] text-muted">@{player.username}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-accent">{fmtNum(player.totalScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.totalEntries)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.averageScore)}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{player.bestRank ? `#${player.bestRank}` : '-'}</td>
                    <td className="px-3 py-3 font-mono text-muted2">{fmtNum(player.podiums)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
