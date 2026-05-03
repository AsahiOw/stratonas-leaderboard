'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RaidCard } from '@/components/RaidCard'
import { warmMemorialVideoCache } from '@/lib/memorial-video-cache'
import type { TableEntry } from '@/components/LeaderboardTable'

type VideoMode = 'poster' | 'preload' | 'active'

interface RaidCardRaid {
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  color: string
  color2: string
}

interface Division {
  name: string
  range: string
  icon: string
  elevated?: boolean
  minRank: number
  maxRank: number
}

interface VisibilitySnapshot {
  distance: number
  isNear: boolean
  ratio: number
  rank: number
}

interface Props {
  raid: RaidCardRaid
  entries: TableEntry[]
  divisions: Division[]
}

interface ManagedRaidCardProps {
  id: string
  raid: RaidCardRaid
  entry: TableEntry
  elevated?: boolean
  videoMode: VideoMode
  registerCard: (id: string, node: HTMLElement | null) => void
}

const NEAR_VIEWPORT_PX = 650

function cardKey(entry: TableEntry) {
  return entry.playerId || `${entry.rank}-${entry.name}`
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)

    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reducedMotion
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function ManagedRaidCard({
  id,
  raid,
  entry,
  elevated,
  videoMode,
  registerCard,
}: ManagedRaidCardProps) {
  const setRef = useCallback((node: HTMLDivElement | null) => {
    registerCard(id, node)
  }, [id, registerCard])

  return (
    <div ref={setRef}>
      <RaidCard
        raid={raid}
        entry={entry}
        elevated={elevated}
        videoMode={videoMode}
      />
    </div>
  )
}

export function LeaderboardCardGrid({ raid, entries, divisions }: Props) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const nodesRef = useRef(new Map<string, HTMLElement>())
  const entriesByKey = useMemo(() => new Map(entries.map((entry) => [cardKey(entry), entry])), [entries])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const rafRef = useRef<number | null>(null)
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [preloadIds, setPreloadIds] = useState<string[]>([])
  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds])
  const preloadIdSet = useMemo(() => new Set(preloadIds), [preloadIds])
  const memorialVideoUrls = useMemo(
    () => entries.map((entry) => entry.favouriteStudentMemorial).filter((url): url is string => Boolean(url)),
    [entries],
  )

  useEffect(() => {
    warmMemorialVideoCache(memorialVideoUrls)
  }, [memorialVideoUrls])

  const updatePlaybackModes = useCallback(() => {
    if (prefersReducedMotion || document.visibilityState === 'hidden') {
      setActiveIds((previous) => (previous.length ? [] : previous))
      setPreloadIds((previous) => (previous.length ? [] : previous))
      return
    }

    const viewportHeight = window.innerHeight || 1
    const viewportWidth = window.innerWidth || 1
    const viewportCenter = viewportHeight / 2
    const snapshots: Array<VisibilitySnapshot & { id: string }> = []

    nodesRef.current.forEach((node, id) => {
      const entry = entriesByKey.get(id)
      if (!entry?.favouriteStudentMemorial) return

      const rect = node.getBoundingClientRect()
      const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0))
      const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
      const area = Math.max(1, rect.width * rect.height)
      const ratio = (visibleWidth * visibleHeight) / area
      const center = rect.top + rect.height / 2

      snapshots.push({
        id,
        distance: Math.abs(center - viewportCenter),
        isNear: rect.bottom >= -NEAR_VIEWPORT_PX && rect.top <= viewportHeight + NEAR_VIEWPORT_PX,
        ratio,
        rank: entry.rank,
      })
    })

    const nextActive = snapshots
      .filter((snapshot) => snapshot.ratio > 0)
      .sort((a, b) => b.ratio - a.ratio || a.distance - b.distance || a.rank - b.rank)
      .map((snapshot) => snapshot.id)

    const activeSet = new Set(nextActive)
    const nextPreload = snapshots
      .filter((snapshot) => snapshot.isNear && !activeSet.has(snapshot.id))
      .sort((a, b) => a.distance - b.distance || b.ratio - a.ratio || a.rank - b.rank)
      .map((snapshot) => snapshot.id)

    setActiveIds((previous) => (sameList(previous, nextActive) ? previous : nextActive))
    setPreloadIds((previous) => (sameList(previous, nextPreload) ? previous : nextPreload))
  }, [entriesByKey, prefersReducedMotion])

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      updatePlaybackModes()
    })
  }, [updatePlaybackModes])

  useEffect(() => {
    scheduleUpdate()
  }, [entries, prefersReducedMotion, scheduleUpdate])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      scheduleUpdate()
      return
    }

    observerRef.current = new IntersectionObserver(() => scheduleUpdate(), {
      rootMargin: `${NEAR_VIEWPORT_PX}px 0px`,
      threshold: [0, 0.05, 0.25, 0.5, 0.75, 1],
    })

    nodesRef.current.forEach((node) => observerRef.current?.observe(node))
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [scheduleUpdate])

  useEffect(() => {
    const handleVisibility = () => scheduleUpdate()
    const handleResize = () => scheduleUpdate()
    const handleScroll = () => scheduleUpdate()
    const scrollOptions = { capture: true, passive: true }
    const refreshTimer = window.setInterval(scheduleUpdate, 350)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, scrollOptions)
    document.addEventListener('scroll', handleScroll, scrollOptions)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, scrollOptions)
      document.removeEventListener('scroll', handleScroll, scrollOptions)
      window.clearInterval(refreshTimer)
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    }
  }, [scheduleUpdate])

  const registerCard = useCallback((id: string, node: HTMLElement | null) => {
    const previous = nodesRef.current.get(id)
    if (previous) observerRef.current?.unobserve(previous)

    if (node) {
      nodesRef.current.set(id, node)
      observerRef.current?.observe(node)
    } else {
      nodesRef.current.delete(id)
    }

    scheduleUpdate()
  }, [scheduleUpdate])

  const modeFor = useCallback((id: string): VideoMode => {
    if (prefersReducedMotion) return 'poster'
    if (activeIdSet.has(id)) return 'preload'
    if (preloadIdSet.has(id)) return 'preload'
    return 'poster'
  }, [activeIdSet, preloadIdSet, prefersReducedMotion])

  return (
    <div className="flex flex-col gap-7">
      {divisions.map((division) => {
        const rows = entries.filter((entry) => entry.rank >= division.minRank && entry.rank <= division.maxRank)
        if (rows.length === 0) return null

        return (
          <section key={division.name}>
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={division.icon} alt="" className="h-9 w-9 object-contain" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  {division.range}
                </div>
                <h2 className="text-lg font-bold tracking-[-0.02em]">{division.name}</h2>
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div
              className={
                division.elevated
                  ? 'grid grid-cols-1 gap-4 lg:grid-cols-3'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
              }
            >
              {rows.map((entry) => {
                const id = cardKey(entry)
                return (
                  <ManagedRaidCard
                    key={id}
                    id={id}
                    raid={raid}
                    entry={entry}
                    elevated={division.elevated}
                    videoMode={modeFor(id)}
                    registerCard={registerCard}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
