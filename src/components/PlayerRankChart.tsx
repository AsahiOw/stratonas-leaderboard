'use client'

import { useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react'

type RankFilter = 'ALL' | 'GA' | 'TA'

export type PlayerRankPoint = {
  id: string
  rank: number
  date: string
  raidType: string
  label: string
}

const WIDTH = 800
const HEIGHT = 300
const MARGIN = { top: 20, right: 24, bottom: 48, left: 64 }

function subscribeToHydration() {
  return () => {}
}

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function expandedPath(points: Array<{ x: number; y: number }>, sampleCount = 25) {
  if (points.length === 0) return ''
  if (points.length === 1) return Array.from({ length: sampleCount }, (_, index) => `${index === 0 ? 'M' : 'L'} ${points[0].x} ${points[0].y}`).join(' ')
  return Array.from({ length: sampleCount }, (_, index) => {
    const point = points[Math.round((index / (sampleCount - 1)) * (points.length - 1))]
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  }).join(' ')
}

function raidMatchesFilter(raidType: string, filter: RankFilter) {
  if (filter === 'ALL') return true
  if (filter === 'GA') return raidType.toLowerCase().includes('grand')
  return raidType.toLowerCase().includes('total')
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

export function PlayerRankChart({ points, accent, raidTypesOnly = false }: { points: PlayerRankPoint[]; accent: string; raidTypesOnly?: boolean }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false)
  const reduceMotion = useSyncExternalStore(subscribeToReducedMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
  const [filter, setFilter] = useState<RankFilter>(() => raidTypesOnly ? points.some((point) => raidMatchesFilter(point.raidType, 'TA')) ? 'TA' : 'GA' : 'ALL')
  const [activeId, setActiveId] = useState<string | null>(null)
  const filtered = useMemo(() => points
    .filter((point) => point.rank > 0 && raidMatchesFilter(point.raidType, filter))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-25), [filter, points])

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const maxRank = Math.max(1, ...filtered.map((point) => point.rank))
  const x = (index: number) => MARGIN.left + (filtered.length <= 1 ? plotWidth / 2 : (index / (filtered.length - 1)) * plotWidth)
  const y = (rank: number) => MARGIN.top + ((rank - 1) / Math.max(1, maxRank - 1)) * plotHeight
  const coordinates = filtered.map((point, index) => ({ ...point, x: x(index), y: y(point.rank) }))
  const linearRgb = [1, 3, 5].map((offset) => {
    const channel = parseInt(accent.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * linearRgb[0] + 0.7152 * linearRgb[1] + 0.0722 * linearRgb[2]
  // Shade pale club colors and tint dark ones without introducing another hue.
  const grandLightness = luminance > 0.4 ? 'calc(l * 0.75)' : 'min(0.92, calc(l + 0.22))'
  const grandAccent = `oklch(from ${accent} ${grandLightness} c h)`
  const raidColors = [
    { type: 'TA' as const, label: 'Total Assault', color: accent },
    { type: 'GA' as const, label: 'Grand Assault', color: grandAccent },
  ]
  const pointColor = (raidType: string) => raidColors.find((raid) => raidMatchesFilter(raidType, raid.type))?.color || accent
  const yTicks = Array.from(new Set([1, Math.max(1, Math.round((maxRank + 1) / 2)), maxRank])).sort((a, b) => a - b)
  const xTickIndexes = filtered.length <= 5
    ? filtered.map((_, index) => index)
    : Array.from(new Set([
      0,
      Math.round((filtered.length - 1) / 4),
      Math.round((filtered.length - 1) / 2),
      Math.round(((filtered.length - 1) * 3) / 4),
      filtered.length - 1,
    ]))
  const active = coordinates.find((point) => point.id === activeId) || null

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card2/35 px-4 py-4 sm:px-5">
        <div className={raidTypesOnly ? 'min-w-0 sm:flex-1' : undefined}>
          <h2 className="text-base font-bold text-text">{raidTypesOnly ? 'Ranking history' : 'Ranking History'}</h2>
          <p className="mt-1 max-w-prose text-xs text-muted">{raidTypesOnly ? 'Placements within one raid type. Participant pools vary by season and server.' : 'Placement across raid seasons, with rank 1 at the top.'}</p>
        </div>
        <div className="inline-flex rounded-lg border border-border2 bg-bg p-1" aria-label="Filter ranking history by raid type">
          {(raidTypesOnly ? ['TA', 'GA'] as const : ['ALL', 'GA', 'TA'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => { setFilter(option); setActiveId(null) }}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${filter === option ? 'bg-accent text-white' : 'text-muted2 hover:text-text'}`}
            >
              {raidTypesOnly ? option === 'TA' ? 'Total Assault' : 'Grand Assault' : option}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted2" aria-label="Raid type colors">
          {raidColors.filter((raid) => filter === 'ALL' || filter === raid.type).map((raid) => (
            <span key={raid.type} className="inline-flex items-center gap-2">
              <svg width="32" height="12" viewBox="0 0 32 12" aria-hidden="true">
                <line x1="0" y1="6" x2="32" y2="6" stroke={raid.color} strokeWidth="3" />
                <circle cx="16" cy="6" r="4" fill={raid.color} />
              </svg>
              {raid.label}
            </span>
          ))}
        </div>
        {!hydrated ? (
          <div className="h-[300px] animate-pulse rounded-lg bg-bg/45" aria-hidden />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">No {filter === 'ALL' ? '' : `${filter} `}ranking history found.</div>
        ) : (
          <div className="relative">
            {active && (
              <div className="pointer-events-none absolute right-2 top-1 z-10 rounded-lg border border-border2 bg-card2 px-3 py-2 text-right shadow-lg">
                <div className="text-xs font-bold text-text">{active.label} · {active.raidType}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted2">#{active.rank} · {fullDate(active.date)}</div>
              </div>
            )}
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={`block h-auto w-full ${raidTypesOnly ? 'max-sm:[&_text]:text-[24px]' : ''}`} role="img" aria-label={`${filter} player ranking history line graph`}>
              <title>{filter} player ranking history</title>
              <desc>Raid ranks shown chronologically. Lower rank numbers are better and appear higher on the graph.</desc>
              <rect x={MARGIN.left} y={MARGIN.top} width={plotWidth} height={plotHeight} fill="var(--bg)" stroke="var(--border)" rx="8" />
              {yTicks.map((tick) => (
                <g key={tick}>
                  <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth="1" />
                  <text x={MARGIN.left - 12} y={y(tick) + 4} textAnchor="end" fill="var(--muted2)" fontSize="12">#{tick}</text>
                </g>
              ))}
              {xTickIndexes.map((index) => (
                <g key={index} className={raidTypesOnly && index !== 0 && index !== filtered.length - 1 ? 'max-sm:hidden' : undefined}>
                  <line
                    x1={coordinates[index].x}
                    x2={coordinates[index].x}
                    y1={coordinates[index].y}
                    y2={MARGIN.top + plotHeight}
                    stroke="var(--border2)"
                    strokeWidth="1"
                    strokeDasharray="5 5"
                  />
                  <text x={x(index)} y={HEIGHT - 18} textAnchor={index === 0 ? 'start' : index === filtered.length - 1 ? 'end' : 'middle'} fill="var(--muted2)" fontSize="12">
                    {shortDate(filtered[index].date)}
                  </text>
                </g>
              ))}
              {coordinates.slice(1).map((point, index) => {
                const path = expandedPath([coordinates[index], point])
                const pathStyle = {
                  d: `path("${path}")`,
                  transition: reduceMotion ? 'none' : 'd 450ms cubic-bezier(0.4, 0, 0.2, 1), stroke 450ms ease',
                } as CSSProperties & { d: string }
                // Match segments by chart position so GA and TA can animate between different raid IDs.
                return <path key={index} d={path} style={pathStyle} fill="none" stroke={pointColor(point.raidType)} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              })}
              {coordinates.map((point) => (
                <circle
                  key={point.id}
                  cx={point.x}
                  cy={point.y}
                  r={activeId === point.id ? 7 : 5}
                  fill={pointColor(point.raidType)}
                  stroke="var(--card)"
                  strokeWidth="3"
                  className="cursor-pointer outline-none transition-[r] focus:ring-2 focus:ring-accent"
                  tabIndex={0}
                  aria-label={`${point.label}, ${point.raidType}, rank ${point.rank}, ${fullDate(point.date)}`}
                  onMouseEnter={() => setActiveId(point.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onFocus={() => setActiveId(point.id)}
                  onBlur={() => setActiveId(null)}
                />
              ))}
              <text x="16" y={MARGIN.top + plotHeight / 2} transform={`rotate(-90 16 ${MARGIN.top + plotHeight / 2})`} textAnchor="middle" fill="var(--muted2)" fontSize="12">Rank</text>
              <text x={MARGIN.left + plotWidth / 2} y={HEIGHT - 1} textAnchor="middle" fill="var(--muted2)" fontSize="12">Raid date</text>
            </svg>
          </div>
        )}
      </div>
    </section>
  )
}
