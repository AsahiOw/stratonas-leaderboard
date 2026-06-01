'use client'

import { useEffect, useRef, useState } from 'react'
import type { TableEntry } from '@/components/LeaderboardTable'

export type LeaderboardFilterTransitionPhase = 'idle' | 'toGuild' | 'settleGuild' | 'makeSpace' | 'toAll'

function getFilteredEntries(entries: TableEntry[], hideGuests: boolean) {
  return hideGuests
    ? entries.filter((entry) => entry.isGuild).map((entry, index) => ({ ...entry, rank: index + 1 }))
    : entries
}

function getEntryKey(entry: TableEntry) {
  return entry.playerId || `${entry.name}-${entry.score}-${entry.club || ''}`
}

export function useLeaderboardFilterTransition(entries: TableEntry[], hideGuests: boolean) {
  const [displayEntries, setDisplayEntries] = useState(() => getFilteredEntries(entries, hideGuests))
  const [phase, setPhase] = useState<LeaderboardFilterTransitionPhase>('idle')
  const [promotedEntryKeys, setPromotedEntryKeys] = useState<Set<string>>(() => new Set())
  const previousHideGuests = useRef(hideGuests)

  useEffect(() => {
    const directionChanged = previousHideGuests.current !== hideGuests
    previousHideGuests.current = hideGuests
    const timeouts: number[] = []
    const hasGuests = entries.some((entry) => !entry.isGuild)

    if (!directionChanged || !hasGuests) {
      setDisplayEntries(getFilteredEntries(entries, hideGuests))
      setPhase('idle')
      setPromotedEntryKeys(new Set())
      return undefined
    }

    if (hideGuests) {
      const previousPodiumKeys = new Set(entries.slice(0, 3).map(getEntryKey))
      const filteredEntries = getFilteredEntries(entries, true)
      const nextPromotedKeys = new Set(
        filteredEntries
          .slice(0, 3)
          .map(getEntryKey)
          .filter((key) => !previousPodiumKeys.has(key)),
      )

      setDisplayEntries(entries)
      setPhase('toGuild')
      setPromotedEntryKeys(new Set())
      timeouts.push(
        window.setTimeout(() => {
          setDisplayEntries(filteredEntries)
          setPromotedEntryKeys(nextPromotedKeys)
          setPhase('settleGuild')
        }, 620),
        window.setTimeout(() => {
          setPhase('idle')
          setPromotedEntryKeys(new Set())
        }, 1220),
      )
    } else {
      setDisplayEntries(entries)
      setPhase('makeSpace')
      setPromotedEntryKeys(new Set())
      timeouts.push(
        window.setTimeout(() => {
          setPhase('toAll')
        }, 260),
        window.setTimeout(() => {
          setPhase('idle')
        }, 1120),
      )
    }

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
    }
  }, [entries, hideGuests])

  return { displayEntries, phase, promotedEntryKeys }
}
