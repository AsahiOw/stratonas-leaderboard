'use client'

import { useEffect, useRef, useState } from 'react'
import { imageSrc } from '@/lib/utils'

export interface BirthdayStudent {
  id: number
  name: string
  image: string
  memorial?: string | null
  familyName?: string | null
  personalName?: string | null
  school?: string | null
  club?: string | null
  schoolYear?: string | null
  birthday?: string | null
  birthDay?: string | null
  heightMetric?: string | null
  weaponType?: string | null
  tacticRole?: string | null
  weaponName?: string | null
  accentColor?: string | null
  daysUntilBirthday?: number
}

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const FALLBACK_ACCENT = 'oklch(0.55 0.10 250)'
const accentCache = new Map<string, string | null>()

function formatClub(club?: string | null) {
  return club?.replace(/([a-z])([A-Z])/g, '$1 $2') || 'Club unknown'
}

function shortYear(year?: string | null) {
  return year?.replace(/\s*year\s*$/i, '').trim() || 'Year unknown'
}

function parseBirthday(birthday?: string | null) {
  if (!birthday) return { month: '---', day: '--' }
  const [monthRaw, dayRaw] = birthday.split('/')
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  return {
    month: MONTH_ABBR[month - 1] || '---',
    day: Number.isInteger(day) ? String(day).padStart(2, '0') : '--',
  }
}

function countdownLabel(days?: number | null) {
  if (days == null) return ''
  if (days === 0) return 'TODAY'
  if (days === 1) return 'TOMORROW'
  if (days < 7) return `IN ${days} DAYS`
  if (days < 14) return '1 WEEK'
  if (days < 30) return `IN ${Math.round(days / 7)} WKS`
  if (days < 60) return '1 MONTH'
  return `IN ${Math.round(days / 30)} MOS`
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  if (max === min) return { hue: 0, saturation: 0, lightness }

  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue = 0

  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0)
  if (max === g) hue = (b - r) / delta + 2
  if (max === b) hue = (r - g) / delta + 4

  return { hue: hue * 60, saturation, lightness }
}

function isSkinTone(hue: number, saturation: number, lightness: number) {
  return hue >= 5 && hue <= 50 && saturation >= 0.1 && saturation <= 0.55 && lightness >= 0.45 && lightness <= 0.88
}

function rgbToOklchString(r: number, g: number, b: number) {
  const sr = r / 255
  const sg = g / 255
  const sb = b / 255
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const lr = lin(sr)
  const lg = lin(sg)
  const lb = lin(sb)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)
  const okL = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot
  const okA = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot
  const okB = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
  const chroma = Math.sqrt(okA * okA + okB * okB)
  let hue = Math.atan2(okB, okA) * 180 / Math.PI
  if (hue < 0) hue += 360

  return `oklch(${Math.max(0.42, Math.min(0.72, okL)).toFixed(3)} ${Math.min(0.2, chroma).toFixed(3)} ${hue.toFixed(1)})`
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

async function extractAccent(url: string) {
  if (!url) return null
  if (accentCache.has(url)) return accentCache.get(url) || null

  try {
    const image = await loadImage(url)
    const width = 80
    const height = Math.max(1, Math.round(width * image.height / image.width))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, width, height)

    const data = context.getImageData(0, 0, width, height).data
    const buckets = new Map<string, { count: number; r: number; g: number; b: number; saturation: number }>()

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha < 128) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const { hue, saturation, lightness } = rgbToHsl(r, g, b)
      if (saturation < 0.18) continue
      if (lightness < 0.12 || lightness > 0.92) continue
      if (isSkinTone(hue, saturation, lightness)) continue

      const hueKey = Math.round(hue / 15) * 15
      const lightnessKey = Math.round(lightness * 10) / 10
      const key = `${hueKey}|${lightnessKey}`
      const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, saturation: 0 }
      bucket.count += 1
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.saturation += saturation
      buckets.set(key, bucket)
    }

    const best = Array.from(buckets.values())
      .map((bucket) => {
        const avgSaturation = bucket.saturation / bucket.count
        return {
          r: Math.round(bucket.r / bucket.count),
          g: Math.round(bucket.g / bucket.count),
          b: Math.round(bucket.b / bucket.count),
          score: bucket.count * avgSaturation * avgSaturation,
        }
      })
      .sort((a, b) => b.score - a.score)[0]

    const accent = best ? rgbToOklchString(best.r, best.g, best.b) : null
    accentCache.set(url, accent)
    return accent
  } catch {
    accentCache.set(url, null)
    return null
  }
}

function useSampledAccent(studentId: number, imageUrl: string, storedAccent?: string | null) {
  const [accent, setAccent] = useState(storedAccent || FALLBACK_ACCENT)

  useEffect(() => {
    let alive = true
    if (storedAccent) {
      setAccent(storedAccent)
      return () => {
        alive = false
      }
    }

    setAccent(FALLBACK_ACCENT)
    extractAccent(imageUrl).then((sampled) => {
      if (!alive || !sampled) return
      setAccent(sampled)
      void fetch('/api/birthdays/accent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, accentColor: sampled }),
      }).catch(() => {})
    })
    return () => {
      alive = false
    }
  }, [imageUrl, storedAccent, studentId])

  return accent
}

function HoverVideo({
  video,
  poster,
  alt,
  active,
}: {
  video?: string | null
  poster: string
  alt: string
  active: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const videoUrl = imageSrc(video)

  useEffect(() => {
    const current = videoRef.current
    if (!current || !videoUrl) return

    if (!active) {
      current.pause()
      setPlaying(false)
      return
    }

    current.currentTime = 0
    current.play().then(() => setPlaying(true)).catch(() => {})
  }, [active, videoUrl])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover object-[center_30%] transition duration-300 ${playing ? 'opacity-0' : 'opacity-100 hover:scale-[1.04]'}`}
      />
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          loop
          preload="metadata"
          className={`absolute inset-0 h-full w-full object-cover object-[center_30%] transition-opacity duration-300 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {videoUrl && !playing && (
        <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-[3px] bg-black/75 px-1.5 py-1 font-mono text-[8px] font-bold tracking-[0.18em] text-[#f4f1ea] backdrop-blur-sm">
          <span className="text-[var(--birthday-accent)]">▶</span>
          <span>LIVE</span>
        </div>
      )}
    </div>
  )
}

export function BirthdayTicket({ student }: { student: BirthdayStudent }) {
  const [isHovered, setIsHovered] = useState(false)
  const { month, day } = parseBirthday(student.birthDay)
  const poster = imageSrc(student.image)
  const accent = useSampledAccent(student.id, poster, student.accentColor)
  const fullName = [student.familyName, student.personalName].filter(Boolean).join(' · ') || student.name
  const primaryMeta = `${student.school || 'School unknown'} / ${formatClub(student.club)}`
  const cardStyle = {
    '--birthday-accent': accent,
    borderColor: `color-mix(in oklab, ${accent} 45%, rgba(13,13,18,0.08))`,
    boxShadow: `0 14px 28px -18px rgba(0,0,0,0.42), 0 0 0 1px color-mix(in oklab, ${accent} 28%, rgba(13,13,18,0.06))`,
  } as React.CSSProperties

  return (
    <article
      className="group relative grid min-h-[172px] w-full overflow-hidden rounded-md border bg-[#f4f1ea] text-[#0d0d12] transition hover:-translate-y-0.5"
      style={cardStyle}
      aria-label={`Birthday card for ${student.name}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-[var(--birthday-accent)]" />
      <div className="grid min-h-[172px] grid-cols-[34%_19%_47%]">
        <div className="relative overflow-hidden bg-[#ebe6db]">
          <HoverVideo video={student.memorial} poster={poster} alt={student.name} active={isHovered} />
          <div className="absolute inset-y-0 left-0 z-20 w-[3px] bg-[var(--birthday-accent)]" />
        </div>

        <div className="flex flex-col items-center justify-center border-x border-dashed border-black/15 bg-[#f7f3ec] px-1.5 text-center leading-none">
          <div className="font-mono text-[10px] font-bold tracking-[0.24em] text-[var(--birthday-accent)]">{month}</div>
          <div className="my-1 font-serif text-[clamp(48px,7vw,64px)] italic leading-none tracking-[-0.04em]">{day}</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-black/50">Birthday</div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 px-3.5 py-3.5 sm:px-4">
          <div className="flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-[0.18em]">
            <span className="truncate font-bold text-[var(--birthday-accent)]">No. {student.id}</span>
            <span className="max-w-[96px] truncate rounded-full border border-black/15 px-1.5 py-0.5 text-black/50">
              {student.tacticRole || 'Role'}
            </span>
          </div>

          <div className="min-w-0 leading-none">
            <div className="truncate font-serif text-[clamp(31px,4.8vw,42px)] italic tracking-[-0.015em]">{student.name}</div>
            <div className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-black/50">{fullName}</div>
          </div>

          <div className="relative my-1 h-px bg-black/15 before:absolute before:left-0 before:top-0 before:h-px before:w-5 before:bg-[var(--birthday-accent)]" />

          <div className="mt-auto min-w-0 space-y-1">
            <div className="truncate text-[11px] font-semibold tracking-[0.01em]">{primaryMeta}</div>
            <div className="flex min-w-0 gap-2.5 overflow-hidden font-mono text-[8.5px] uppercase tracking-[0.14em] text-black/50">
              <span className="shrink-0">{shortYear(student.schoolYear)}</span>
              <span className="shrink-0">{student.heightMetric || 'Height unknown'}</span>
              <span className="truncate">{student.weaponType || student.weaponName || 'Weapon unknown'}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export function UpcomingBirthdayCard({ student }: { student: BirthdayStudent }) {
  const { month, day } = parseBirthday(student.birthDay)
  const poster = imageSrc(student.image)
  const accent = useSampledAccent(student.id, poster, student.accentColor)
  const countdown = countdownLabel(student.daysUntilBirthday)
  const isToday = student.daysUntilBirthday === 0
  const cardStyle = {
    '--birthday-accent': accent,
    borderColor: `color-mix(in oklab, ${accent} 34%, rgba(13,13,18,0.08))`,
  } as React.CSSProperties

  return (
    <article
      className="relative flex w-[140px] shrink-0 flex-col overflow-hidden rounded-[5px] border bg-[#f4f1ea] text-[#0d0d12] shadow-[0_10px_20px_-16px_rgba(0,0,0,0.42)]"
      style={cardStyle}
      aria-label={`Upcoming birthday for ${student.name}${student.birthday || student.birthDay ? ` on ${student.birthday || student.birthDay}` : ''}`}
    >
      <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-[var(--birthday-accent)]" />
      <div className="relative aspect-square overflow-hidden bg-[#ebe6db]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,color-mix(in_oklab,var(--birthday-accent)_18%,rgba(13,13,18,0.05))_100%)]" />
        {countdown && (
          <div className={`absolute bottom-1.5 left-1.5 z-10 inline-flex max-w-[calc(100%-12px)] items-center gap-1.5 rounded-[3px] px-1.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm ${isToday ? 'bg-[var(--birthday-accent)] text-[#0d0d12]' : 'bg-black/80 text-[#f4f1ea]'}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isToday ? 'animate-pulse bg-[#0d0d12]' : 'bg-[var(--birthday-accent)]'}`} />
            <span className="truncate">{countdown}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 px-2.5 pb-2.5 pt-2">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="font-mono text-[8.5px] font-bold tracking-[0.22em] text-[var(--birthday-accent)]">{month}</span>
          <span className="font-serif text-[26px] italic leading-none tracking-[-0.03em]">{day}</span>
        </div>
        <div className="truncate font-serif text-[19px] italic leading-none tracking-[-0.015em]">{student.name}</div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[8px] uppercase tracking-[0.16em] text-black/50 before:h-px before:w-2.5 before:shrink-0 before:bg-[var(--birthday-accent)]">
          <span className="truncate">{student.school || 'School unknown'}</span>
        </div>
      </div>
    </article>
  )
}
