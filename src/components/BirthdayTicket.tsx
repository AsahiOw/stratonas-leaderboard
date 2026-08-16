'use client'

import { useEffect, useRef, useState } from 'react'
import { useStudentAccent } from '@/lib/student-accent'
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
  const [isPlaying, setIsPlaying] = useState(false)
  const { month, day } = parseBirthday(student.birthDay)
  const poster = imageSrc(student.image)
  const canPlayVideo = Boolean(imageSrc(student.memorial))
  const accent = useStudentAccent(student.id, poster, student.accentColor)
  const fullName = [student.familyName, student.personalName].filter(Boolean).join(' · ') || student.name
  const primaryMeta = `${student.school || 'School unknown'} / ${formatClub(student.club)}`
  const cardStyle = {
    '--birthday-accent': accent,
    borderColor: `color-mix(in oklab, ${accent} 45%, rgba(13,13,18,0.08))`,
    boxShadow: `0 14px 28px -18px rgba(0,0,0,0.42), 0 0 0 1px color-mix(in oklab, ${accent} 28%, rgba(13,13,18,0.06))`,
  } as React.CSSProperties

  const togglePlayback = () => {
    if (!canPlayVideo) return
    setIsPlaying((current) => !current)
  }

  return (
    <article
      className={`group relative grid min-h-[172px] w-full overflow-hidden rounded-md border bg-[#f4f1ea] text-[#0d0d12] transition hover:-translate-y-0.5 ${canPlayVideo ? 'cursor-pointer touch-manipulation' : ''}`}
      style={cardStyle}
      aria-label={`Birthday card for ${student.name}`}
      role={canPlayVideo ? 'button' : undefined}
      tabIndex={canPlayVideo ? 0 : undefined}
      aria-pressed={canPlayVideo ? isPlaying : undefined}
      onClick={togglePlayback}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        togglePlayback()
      }}
    >
      <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-[var(--birthday-accent)]" />
      <div className="grid min-h-[172px] grid-cols-[34%_19%_47%]">
        <div className="relative overflow-hidden bg-[#ebe6db]">
          <HoverVideo video={student.memorial} poster={poster} alt={student.name} active={isPlaying} />
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
  const accent = useStudentAccent(student.id, poster, student.accentColor)
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
