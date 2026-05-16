'use client'

import { useRef, useState } from 'react'
import { imageSrc } from '@/lib/utils'

export interface BirthdayStudent {
  id: number
  name: string
  image: string
  portrait?: string | null
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
}

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const SCHOOL_ACCENTS: Record<string, string> = {
  Millennium: 'oklch(0.62 0.18 240)',
  Trinity: 'oklch(0.72 0.13 85)',
  Gehenna: 'oklch(0.62 0.18 25)',
  Abydos: 'oklch(0.62 0.14 60)',
  Hyakkiyako: 'oklch(0.58 0.18 305)',
  'Red Winter': 'oklch(0.55 0.16 20)',
  Shanhaijing: 'oklch(0.62 0.16 145)',
  Valkyrie: 'oklch(0.55 0.14 270)',
  SRT: 'oklch(0.62 0.10 260)',
  Tokiwadai: 'oklch(0.62 0.16 325)',
}

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

function studentAccent(student: BirthdayStudent) {
  return student.school ? SCHOOL_ACCENTS[student.school] || 'oklch(0.55 0.10 250)' : 'oklch(0.55 0.10 250)'
}

function HoverVideo({
  video,
  poster,
  alt,
}: {
  video?: string | null
  poster: string
  alt: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const videoUrl = imageSrc(video)

  function handleEnter() {
    const current = videoRef.current
    if (!current) return
    current.currentTime = 0
    current.play().then(() => setPlaying(true)).catch(() => {})
  }

  function handleLeave() {
    const current = videoRef.current
    if (!current) return
    current.pause()
    setPlaying(false)
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={videoUrl ? handleEnter : undefined}
      onMouseLeave={videoUrl ? handleLeave : undefined}
    >
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
  const { month, day } = parseBirthday(student.birthDay)
  const accent = studentAccent(student)
  const poster = imageSrc(student.portrait || student.image)
  const fullName = [student.familyName, student.personalName].filter(Boolean).join(' · ') || student.name
  const primaryMeta = `${student.school || 'School unknown'} / ${formatClub(student.club)}`

  return (
    <article
      className="group relative grid min-h-[172px] w-full overflow-hidden rounded-md bg-[#f4f1ea] text-[#0d0d12] shadow-[0_14px_28px_-18px_rgba(0,0,0,0.42),0_0_0_1px_rgba(13,13,18,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-20px_rgba(0,0,0,0.5)]"
      style={{ '--birthday-accent': accent } as React.CSSProperties}
      aria-label={`Birthday card for ${student.name}`}
    >
      <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-[var(--birthday-accent)]" />
      <div className="grid min-h-[172px] grid-cols-[34%_19%_47%]">
        <div className="relative overflow-hidden bg-[#ebe6db]">
          <HoverVideo video={student.memorial} poster={poster} alt={student.name} />
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
