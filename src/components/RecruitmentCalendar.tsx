'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  CalendarDays,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crosshair,
  GraduationCap,
  IdCard,
  LayoutGrid,
  List,
  Maximize2,
  Paperclip,
  Radio,
  Sparkles,
  Star,
  Ticket,
} from 'lucide-react'
import { StModal } from '@/components/ui/StModal'
import { arrangeRecruitmentQueue, buildCalendarDays, daysBetweenDateKeys, groupSchedulesByDate, monthStart, pairedRecruitmentRowCount, recruitmentReleaseLabel, shiftMonth } from '@/lib/recruitment-calendar'
import { dateKeyFromDate } from '@/lib/recruitments'
import { parseBirthdayKey } from '@/lib/birthdays'
import { fmtDate, imageSrc } from '@/lib/utils'
import type { BirthdayStudent } from '@/components/BirthdayTicket'

export interface RecruitmentCalendarRecruitment {
  id: string
  bannerPath: string
  animationPath: string
  student: {
    id: number
    name: string
    image: string
    portrait?: string | null
    familyName?: string | null
    personalName?: string | null
    school?: string | null
    club?: string | null
    schoolYear?: string | null
    characterAge?: string | null
    characterVoice?: string | null
    birthday?: string | null
    birthDay?: string | null
    hobby?: string | null
    heightMetric?: string | null
    weaponType?: string | null
    tacticRole?: string | null
    position?: string | null
    weaponName?: string | null
    accentColor?: string | null
  }
}

export interface RecruitmentCalendarSchedule {
  id: string
  dateKey: string
  recruitments: RecruitmentCalendarRecruitment[]
}

interface Props {
  schedules: RecruitmentCalendarSchedule[]
  birthdayStudents?: BirthdayStudent[]
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
type StickerSlot = { x: string; y: string; angle: number; layer?: number }
type Selection = { recruitment: RecruitmentCalendarRecruitment; dateKey: string }
type CalendarMode = 'recruitment' | 'birthday'
type RecruitmentView = 'calendar' | 'list'
type MotionPhase = 'opening-start' | 'opening-move' | 'ready' | 'closing-move'
type FileMotion = Selection & {
  source: HTMLElement
  phase: MotionPhase
}

const stickerLayouts: Record<number, StickerSlot[]> = {
  1: [{ x: '25%', y: '5%', angle: -5 }],
  2: [
    { x: '6%', y: '6%', angle: -7 },
    { x: '55%', y: '6%', angle: 6 },
  ],
  3: [
    { x: '5%', y: '50%', angle: -7 },
    { x: '55%', y: '50%', angle: 5 },
    { x: '30%', y: '0%', angle: -3 },
  ],
  4: [
    { x: '2%', y: '38%', angle: -7, layer: 2 },
    { x: '27%', y: '0%', angle: 4, layer: 4 },
    { x: '52%', y: '38%', angle: -4, layer: 3 },
    { x: '73%', y: '0%', angle: 6, layer: 5 },
  ],
  5: [
    { x: '3%', y: '55%', angle: -7 },
    { x: '35%', y: '55%', angle: 4 },
    { x: '67%', y: '55%', angle: -4 },
    { x: '19%', y: '0%', angle: 6 },
    { x: '52%', y: '0%', angle: -5 },
  ],
  6: [
    { x: '3%', y: '55%', angle: -7 },
    { x: '35%', y: '55%', angle: 4 },
    { x: '67%', y: '55%', angle: -4 },
    { x: '3%', y: '0%', angle: 6 },
    { x: '35%', y: '0%', angle: -5 },
    { x: '67%', y: '0%', angle: 5 },
  ],
}

function stickerLayoutFor(count: number) {
  return stickerLayouts[Math.min(Math.max(count, 1), 6)]
}

function formatClub(value?: string | null) {
  return value?.replace(/([a-z])([A-Z])/g, '$1 $2') || 'Unlisted club'
}

function valueOrUnknown(value?: string | null) {
  return value?.trim() || 'Not on file'
}

function studentDisplayName(student: RecruitmentCalendarRecruitment['student']) {
  return [student.familyName, student.personalName].filter(Boolean).join(' · ') || student.name
}

function studentAccent(student: RecruitmentCalendarRecruitment['student']) {
  return student.accentColor || '#4f8ef7'
}

function stickerImage(student: RecruitmentCalendarRecruitment['student'], fallback: string) {
  return imageSrc(student.portrait || student.image, imageSrc(fallback))
}

function DocumentSection({
  title,
  icon,
  children,
  accent,
  className = '',
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  accent: string
  className?: string
}) {
  return (
    <section className={`dossier-section ${className}`} style={{ '--dossier-accent': accent } as CSSProperties}>
      <div className="dossier-section-title">
        <span aria-hidden="true">{icon}</span>
        <span>{title}</span>
        <i aria-hidden="true" />
      </div>
      {children}
    </section>
  )
}

function FieldCard({ label, value, accent }: { label: string; value?: string | null; accent: string }) {
  return (
    <div className="dossier-field" style={{ '--dossier-accent': accent } as CSSProperties}>
      <div>{label}</div>
      <strong>{valueOrUnknown(value)}</strong>
    </div>
  )
}

function CalendarStudentSticker({
  recruitment,
  dateKey,
  index,
  slot,
  onSelect,
}: {
  recruitment: RecruitmentCalendarRecruitment
  dateKey: string
  index: number
  slot: StickerSlot
  onSelect: (source: HTMLButtonElement) => void
}) {
  const accent = studentAccent(recruitment.student)
  const style = {
    '--sticker-x': slot.x,
    '--sticker-y': slot.y,
    '--sticker-angle': `${slot.angle + ((recruitment.student.id % 3) - 1)}deg`,
    '--sticker-accent': accent,
    zIndex: slot.layer ?? index + 2,
  } as CSSProperties

  return (
    <button
      type="button"
      onClick={(event) => onSelect(event.currentTarget)}
      style={style}
      className="calendar-student-sticker"
      aria-label={`Open ${recruitment.student.name}'s recruitment file, starting ${fmtDate(dateKey)}`}
      title={`${recruitment.student.name} — ${fmtDate(dateKey)}`}
    >
      <span className="calendar-sticker-tape" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={stickerImage(recruitment.student, recruitment.bannerPath)} alt="" loading="lazy" />
      <span className="sr-only">{recruitment.student.name}</span>
    </button>
  )
}

function StickerStack({
  recruitments,
  dateKey,
  onSelect,
  onViewMore,
}: {
  recruitments: RecruitmentCalendarRecruitment[]
  dateKey: string
  onSelect: (recruitment: RecruitmentCalendarRecruitment, source: HTMLButtonElement) => void
  onViewMore: () => void
}) {
  const dense = recruitments.length > 4
  const slots = stickerLayoutFor(recruitments.length)
  const visibleRecruitments = recruitments.slice(0, slots.length)
  const extraCount = recruitments.length - visibleRecruitments.length

  return (
    <div className={`calendar-sticker-stack calendar-sticker-stack-count-${Math.min(recruitments.length, 6)} ${dense ? 'calendar-sticker-stack-dense' : ''}`}>
      {visibleRecruitments.map((recruitment, index) => (
        <CalendarStudentSticker
          key={recruitment.id}
          recruitment={recruitment}
          dateKey={dateKey}
          index={index}
          slot={slots[index]}
          onSelect={(source) => onSelect(recruitment, source)}
        />
      ))}
      {extraCount > 0 && (
        <button
          type="button"
          onClick={onViewMore}
          className="calendar-extra-stickers"
          aria-label={`View ${extraCount} more recruitments starting ${fmtDate(dateKey)}`}
        >
          +{extraCount}
        </button>
      )}
      {recruitments.length > 4 && (
        <button
          type="button"
          onClick={onViewMore}
          className="calendar-more-mobile"
          aria-label={`View all ${recruitments.length} recruitments starting ${fmtDate(dateKey)}`}
        >
          +{recruitments.length - 4}
        </button>
      )}
    </div>
  )
}

function RecruitmentQueueList({
  schedules,
  todayKey,
  onSelect,
}: {
  schedules: RecruitmentCalendarSchedule[]
  todayKey: string
  onSelect: (recruitment: RecruitmentCalendarRecruitment, dateKey: string, source: HTMLButtonElement) => void
}) {
  const upcoming = schedules.filter((schedule) => schedule.dateKey >= todayKey)

  function renderQueues(queues: RecruitmentCalendarSchedule[]) {
    return queues.map((schedule, index) => {
      const days = daysBetweenDateKeys(schedule.dateKey, todayKey) ?? 0
      const pairedSchedule = queues[index % 2 === 0 ? index + 1 : index - 1]
      const pairedCount = pairedSchedule?.recruitments.length || schedule.recruitments.length
      const targetRows = pairedRecruitmentRowCount(schedule.recruitments.length, pairedCount)
      const rowSizes = arrangeRecruitmentQueue(schedule.recruitments.length, targetRows)
      const cardSpans = rowSizes.flatMap((rowSize) => Array.from({ length: rowSize }, () => 6 / rowSize))
      return (
        <article key={schedule.id} className="recruitment-queue">
          <header className="recruitment-queue-header">
            <div>
              <span className="recruitment-queue-kicker">Banner release</span>
              <h3>{fmtDate(schedule.dateKey)}</h3>
            </div>
            <span className={`recruitment-release-distance ${days < 0 ? 'is-past' : ''}`}>{recruitmentReleaseLabel(days)}</span>
          </header>
          <div className="recruitment-queue-items">
            {schedule.recruitments.map((recruitment, recruitmentIndex) => (
              <button
                key={recruitment.id}
                type="button"
                className={`recruitment-list-card recruitment-list-card-span-${cardSpans[recruitmentIndex]}`}
                onClick={(event) => onSelect(recruitment, schedule.dateKey, event.currentTarget)}
                aria-label={`Open ${recruitment.student.name}'s recruitment file, starting ${fmtDate(schedule.dateKey)}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stickerImage(recruitment.student, recruitment.bannerPath)} alt="" loading="lazy" />
                <span>
                  <strong>{recruitment.student.name}</strong>
                  <small>{[recruitment.student.school, formatClub(recruitment.student.club)].filter(Boolean).join(' · ')}</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </article>
      )
    })
  }

  return (
    <div className="recruitment-list-view" aria-label="Recruitment release list">
      <section className="recruitment-list-section">
        <div className="recruitment-list-heading">
          <span>Upcoming queue</span>
          <b>{upcoming.length}</b>
        </div>
        {upcoming.length > 0 ? <div className="recruitment-queue-grid">{renderQueues(upcoming)}</div> : <p className="recruitment-list-empty">No upcoming recruitment banners are scheduled.</p>}
      </section>
    </div>
  )
}

function BirthdayStickerStack({ students }: { students: BirthdayStudent[] }) {
  const slots = stickerLayoutFor(students.length)

  return (
    <div className={`birthday-sticker-stack birthday-sticker-stack-count-${Math.min(students.length, 6)}`}>
      {students.slice(0, slots.length).map((student, index) => (
        <article
          key={student.id}
          className="birthday-student-sticker"
          style={{
            '--birthday-sticker-x': slots[index].x,
            '--birthday-sticker-y': slots[index].y,
            '--birthday-sticker-angle': `${slots[index].angle}deg`,
          } as CSSProperties}
          title={`${student.name}'s birthday`}
        >
          <span className="birthday-sticker-tape" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc(student.image)} alt={`${student.name}'s portrait`} loading="lazy" />
          <span>{student.name}</span>
        </article>
      ))}
      {students.length > slots.length && <span className="birthday-sticker-more">+{students.length - slots.length}</span>}
    </div>
  )
}

function RecruitmentPicker({
  dateKey,
  recruitments,
  onClose,
  onSelect,
}: {
  dateKey: string
  recruitments: RecruitmentCalendarRecruitment[]
  onClose: () => void
  onSelect: (recruitment: RecruitmentCalendarRecruitment, source: HTMLButtonElement) => void
}) {
  return (
    <StModal title={`Recruitment files · ${fmtDate(dateKey)}`} onClose={onClose} wide variant="planner">
      <div className="space-y-2">
        {recruitments.map((recruitment) => (
          <button
            key={recruitment.id}
            type="button"
            onClick={(event) => onSelect(recruitment, event.currentTarget)}
            className="flex w-full items-center gap-3 rounded-xl border border-[#cfc2aa] bg-[#fbf6eb] p-3 text-left text-[#302d3b] shadow-[2px_3px_0_rgba(81,71,82,0.08)] transition hover:border-accent/50 hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(recruitment.student.image, imageSrc(recruitment.bannerPath))} alt="" className="h-14 w-12 rounded-lg object-cover object-top" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{recruitment.student.name}</span>
              <span className="mt-0.5 block truncate text-xs text-[#70697a]">{recruitment.student.school || 'School record pending'} · CV. {recruitment.student.characterVoice || '—'}</span>
            </span>
          </button>
        ))}
      </div>
    </StModal>
  )
}

function RecruitmentDossier({
  recruitment,
  dateKey,
  onClose,
  motionPhase,
  dossierRef,
}: {
  recruitment: RecruitmentCalendarRecruitment
  dateKey: string
  onClose: () => void
  motionPhase: MotionPhase
  dossierRef: React.RefObject<HTMLElement>
}) {
  const { student } = recruitment
  const accent = studentAccent(student)
  const style = { '--dossier-accent': accent } as CSSProperties
  const modalTransitionState = motionPhase === 'opening-start'
    ? 'from-bottom'
    : motionPhase === 'opening-move'
      ? 'rising'
      : motionPhase === 'closing-move'
        ? 'to-bottom'
        : undefined

  useEffect(() => {
    if (motionPhase !== 'ready') return
    const frame = window.requestAnimationFrame(() => dossierRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [dossierRef, motionPhase])

  return (
    <StModal
      title={`Recruitment planner file · ${student.name}`}
      onClose={onClose}
      extraWide
      variant="planner"
      transitionState={modalTransitionState}
    >
      <article
        ref={dossierRef}
        tabIndex={-1}
        className={`recruitment-dossier recruitment-dossier-motion-${motionPhase}`}
        style={style}
      >
        <div className="dossier-file-tab">SCHALE // RECRUITMENT</div>
        <div className="dossier-punch-holes" aria-hidden="true" />
        <header className="dossier-hero">
          <div className="dossier-portrait-card">
            <span className="dossier-paperclip" aria-hidden="true"><Paperclip size={24} /></span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stickerImage(student, recruitment.bannerPath)} alt={`${student.name} portrait`} />
            <span className="dossier-id-strip">ID · {student.id}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="dossier-eyebrow"><Sparkles size={13} aria-hidden="true" /> Banner recruitment record</div>
            <div className="dossier-nameplate">
              <span>Applicant</span>
              <h2>{student.name}</h2>
              <small>{studentDisplayName(student)}</small>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="dossier-chip"><GraduationCap size={13} aria-hidden="true" /> {valueOrUnknown(student.school)}</span>
              <span className="dossier-chip"><Star size={13} aria-hidden="true" /> {formatClub(student.club)}</span>
              <span className="dossier-chip dossier-chip-accent"><Ticket size={13} aria-hidden="true" /> Opens {fmtDate(dateKey)}</span>
            </div>
          </div>
          <div className="dossier-approved-stamp" aria-label="Recruitment reviewed and approved">
            <span>REVIEWED</span>
            <strong>APPROVED</strong>
            <small>{new Date(`${dateKey}T00:00:00`).getFullYear()}</small>
          </div>
        </header>

        <div className="dossier-grid">
          <DocumentSection title="Recruitment overview" icon={<ClipboardList size={15} />} accent={accent}>
            <div className="dossier-overview-note">
              <span className="dossier-note-pin" aria-hidden="true" />
              <strong>Availability logged</strong>
              <p>{student.name} is scheduled for banner recruitment beginning <b>{fmtDate(dateKey)}</b>. This file is attached to the Stratónas recruitment board.</p>
            </div>
            <div className="dossier-fields dossier-fields-three">
              <FieldCard label="School" value={student.school} accent={accent} />
              <FieldCard label="Club" value={formatClub(student.club)} accent={accent} />
              <FieldCard label="Voice" value={student.characterVoice ? `CV. ${student.characterVoice}` : null} accent={accent} />
            </div>
          </DocumentSection>

          <DocumentSection title="Combat assignment" icon={<Crosshair size={15} />} accent={accent}>
            <div className="dossier-fields dossier-fields-four">
              <FieldCard label="Role" value={student.tacticRole} accent={accent} />
              <FieldCard label="Position" value={student.position} accent={accent} />
              <FieldCard label="Weapon type" value={student.weaponType} accent={accent} />
              <FieldCard label="Weapon" value={student.weaponName} accent={accent} />
            </div>
          </DocumentSection>

          <DocumentSection title="Student identification" icon={<IdCard size={15} />} accent={accent}>
            <div className="dossier-fields dossier-fields-four">
              <FieldCard label="School year" value={student.schoolYear} accent={accent} />
              <FieldCard label="Birthday" value={student.birthday || student.birthDay} accent={accent} />
              <FieldCard label="Age" value={student.characterAge} accent={accent} />
              <FieldCard label="Height" value={student.heightMetric} accent={accent} />
            </div>
            {student.hobby && <p className="dossier-handwritten-note">Filed note: enjoys {student.hobby}.</p>}
          </DocumentSection>
        </div>

        <DocumentSection title="Archived recruitment broadcast" icon={<Radio size={15} />} accent={accent} className="mt-5">
          <div className="recruitment-terminal">
            <div className="recruitment-terminal-bar">
              <span><i aria-hidden="true" /> SCHALE MEDIA ARCHIVE</span>
              <span>REC · RECRUITMENT-{String(student.id).padStart(5, '0')}</span>
            </div>
            <video
              src={imageSrc(recruitment.animationPath)}
              poster={imageSrc(recruitment.bannerPath)}
              autoPlay
              muted
              loop
              controls
              playsInline
              preload="metadata"
              className="aspect-[4/3] w-full bg-[#070a12] object-cover"
            />
            <div className="recruitment-terminal-footer"><span>Playback controls available</span><span>Verified archive</span></div>
          </div>
          <div className="recruitment-banner-sticker">
            <span className="banner-sticker-tape banner-sticker-tape-left" aria-hidden="true" />
            <span className="banner-sticker-tape banner-sticker-tape-right" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(recruitment.bannerPath)} alt={`${student.name} recruitment banner`} loading="lazy" />
            <span className="banner-sticker-caption">Banner notice · opens {fmtDate(dateKey)}</span>
            <span className="banner-sticker-stamp" aria-hidden="true">SCHEDULED</span>
          </div>
        </DocumentSection>
      </article>
    </StModal>
  )
}

export function RecruitmentCalendar({ schedules, birthdayStudents = [] }: Props) {
  const todayKey = dateKeyFromDate()
  const todayMonth = monthStart(new Date())
  const [visibleMonth, setVisibleMonth] = useState(todayMonth)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [motion, setMotion] = useState<FileMotion | null>(null)
  const [picker, setPicker] = useState<{ dateKey: string; recruitments: RecruitmentCalendarRecruitment[] } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenScale, setFullscreenScale] = useState(1)
  const [mode, setMode] = useState<CalendarMode>('recruitment')
  const [recruitmentView, setRecruitmentView] = useState<RecruitmentView>('calendar')
  const [hasModeChanged, setHasModeChanged] = useState(false)
  const timersRef = useRef<number[]>([])
  const dossierRef = useRef<HTMLElement>(null)
  const fullscreenCanvasRef = useRef<HTMLDivElement>(null)
  const plannerBoardRef = useRef<HTMLElement>(null)
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const schedulesByDate = useMemo(() => groupSchedulesByDate(schedules), [schedules])
  const birthdaysByDate = useMemo(() => {
    const birthdays = new Map<string, BirthdayStudent[]>()
    birthdayStudents.forEach((student) => {
      const birthday = parseBirthdayKey(student.birthDay)
      if (!birthday) return
      const dateKey = `${visibleMonth.getFullYear()}-${String(birthday.month).padStart(2, '0')}-${String(birthday.day).padStart(2, '0')}`
      const current = birthdays.get(dateKey) || []
      current.push(student)
      birthdays.set(dateKey, current)
    })
    return birthdays
  }, [birthdayStudents, visibleMonth])
  const visibleMonthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const monthHasRecruitments = calendarDays.some((day) => day.isCurrentMonth && schedulesByDate.has(day.dateKey))
  const monthHasBirthdays = calendarDays.some((day) => day.isCurrentMonth && birthdaysByDate.has(day.dateKey))
  const isBirthdayMode = mode === 'birthday'
  const showingRecruitmentList = !isBirthdayMode && recruitmentView === 'list'

  function clearMotionTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }

  function changeMode(nextMode: CalendarMode) {
    if (nextMode !== mode) {
      setHasModeChanged(true)
      setMode(nextMode)
    }
  }

  useEffect(() => clearMotionTimers, [])

  useEffect(() => {
    if (!motion || !selected || motion.phase !== 'opening-start') return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMotion((current) => current ? { ...current, phase: 'opening-move' } : null))
    })
  }, [motion, selected])

  useEffect(() => {
    if (!motion || motion.phase !== 'opening-move') return
    timersRef.current.push(window.setTimeout(() => setMotion((current) => current ? { ...current, phase: 'ready' } : null), 460))
  }, [motion])

  useEffect(() => {
    if (!motion || motion.phase !== 'closing-move') return
    timersRef.current.push(window.setTimeout(() => {
      const source = motion.source
      setSelected(null)
      setMotion(null)
      if (source.isConnected) source.focus({ preventScroll: true })
    }, 420))
  }, [motion])

  useLayoutEffect(() => {
    if (!fullscreen) return

    let frame = 0
    let interval = 0
    let observer: ResizeObserver | null = null
    let fitBoard = () => undefined

    const connectFitter = () => {
      const canvas = fullscreenCanvasRef.current
      const board = plannerBoardRef.current
      if (!canvas || !board) {
        frame = window.requestAnimationFrame(connectFitter)
        return
      }

      fitBoard = () => {
        const nextScale = Math.min(1, (canvas.clientHeight / board.scrollHeight) * 0.995)
        setFullscreenScale((current) => Math.abs(current - nextScale) < 0.002 ? current : nextScale)
      }

      fitBoard()
      observer = new ResizeObserver(fitBoard)
      observer.observe(canvas)
      observer.observe(board)
      window.addEventListener('resize', fitBoard)
      interval = window.setInterval(fitBoard, 250)
    }

    connectFitter()
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(interval)
      observer?.disconnect()
      window.removeEventListener('resize', fitBoard)
    }
  }, [calendarDays.length, fullscreen, mode, visibleMonth])

  function selectRecruitment(recruitment: RecruitmentCalendarRecruitment, dateKey: string, source: HTMLButtonElement) {
    if (motion && motion.phase !== 'ready') return
    setPicker(null)
    const nextSelection = { recruitment, dateKey }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setSelected(nextSelection)
      setMotion({ ...nextSelection, source, phase: 'ready' })
      return
    }

    setSelected(nextSelection)
    setMotion({ ...nextSelection, source, phase: 'opening-start' })
  }

  function closeRecruitment() {
    if (!selected || !motion) {
      setSelected(null)
      return
    }
    if (motion.phase !== 'ready') return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSelected(null)
      setMotion(null)
      if (motion.source.isConnected) motion.source.focus({ preventScroll: true })
      return
    }

    clearMotionTimers()
    setMotion({ ...motion, phase: 'closing-move' })
  }

  return (
    <section className={`recruitment-calendar-view view-transition pt-7 ${hasModeChanged ? `calendar-mode-${mode}` : ''} ${isBirthdayMode ? 'birthday-calendar-view' : ''}`}>
      <header className="recruitment-planner-intro">
        <div className="recruitment-planner-title">
          <span className="planner-title-stamp">{isBirthdayMode ? <CakeSlice size={17} aria-hidden="true" /> : <CalendarDays size={17} aria-hidden="true" />} SCHALE NOTICEBOARD</span>
          <h1>{isBirthdayMode ? <>Birthday <em>calendar</em></> : <>Recruitment <em>planner</em></>}</h1>
          <p>{isBirthdayMode ? 'A month of Kivotos student birthdays. Portraits mark each student’s special day.' : 'Pinboard schedule for incoming banner records. Can be incorrect if Nexon decide to speed up Global releases.'}</p>
        </div>
        <div className="planner-controls">
          <div className="planner-mode-toggle" role="group" aria-label="Calendar type">
            <button type="button" className={!isBirthdayMode ? 'planner-mode-active' : ''} onClick={() => changeMode('recruitment')} aria-pressed={!isBirthdayMode}>Recruitment</button>
            <button type="button" className={isBirthdayMode ? 'planner-mode-active' : ''} onClick={() => changeMode('birthday')} aria-pressed={isBirthdayMode}>Birthdays</button>
          </div>
          {!isBirthdayMode && (
            <div className="planner-view-toggle" role="group" aria-label="Recruitment view">
              <button type="button" className={recruitmentView === 'calendar' ? 'planner-view-active' : ''} onClick={() => setRecruitmentView('calendar')} aria-pressed={recruitmentView === 'calendar'}><LayoutGrid size={14} aria-hidden="true" /> Calendar</button>
              <button type="button" className={recruitmentView === 'list' ? 'planner-view-active' : ''} onClick={() => setRecruitmentView('list')} aria-pressed={recruitmentView === 'list'}><List size={14} aria-hidden="true" /> List</button>
            </div>
          )}
          {!showingRecruitmentList && (
            <>
              <button type="button" onClick={() => setVisibleMonth(todayMonth)} className="planner-today-button">Today</button>
              <button type="button" onClick={() => setFullscreen(true)} className="planner-fullscreen-button"><Maximize2 size={14} aria-hidden="true" /> View fullscreen</button>
              <div className="planner-month-controls">
                <button type="button" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
                <button type="button" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
              </div>
            </>
          )}
        </div>
      </header>

      {showingRecruitmentList ? (
        <RecruitmentQueueList
          schedules={schedules}
          todayKey={todayKey}
          onSelect={(recruitment, dateKey, source) => selectRecruitment(recruitment, dateKey, source)}
        />
      ) : (() => {
        const plannerBoard = (
          <section
            ref={plannerBoardRef}
            className={`recruitment-planner ${isBirthdayMode ? 'birthday-planner' : ''}`}
            aria-label={`${isBirthdayMode ? 'Birthday calendar' : 'Recruitment planner'} for ${visibleMonthLabel}`}
          >
            <div className="planner-binder-holes" aria-hidden="true" />
            <div className="planner-top-strip">
              <span>{isBirthdayMode ? `BLUE ARCHIVE CALENDAR // ${visibleMonth.getFullYear()}` : `RECRUITMENT INTAKE // ${visibleMonth.getFullYear()}`}</span>
              <span>{isBirthdayMode ? <><CakeSlice size={13} aria-hidden="true" /> Birthday dates are marked</> : <><Ticket size={13} aria-hidden="true" /> Banner dates are marked</>}</span>
            </div>
            <div className="planner-month-heading">
              {isBirthdayMode && <span className="planner-month-number" aria-hidden="true">{visibleMonth.getMonth() + 1}</span>}
              <span className="planner-month-kicker">{isBirthdayMode ? 'Kivotos birthday calendar' : 'Kivotos student schedule'}</span>
              <h2>{visibleMonthLabel}</h2>
              <span className="planner-doodle" aria-hidden="true">✦</span>
              <span className="planner-paperclip" aria-hidden="true"><Paperclip size={30} /></span>
            </div>
            <div className="planner-weekdays">
              {weekdayLabels.map((label, index) => (
                <div key={label} className={index === 0 || index === 6 ? 'planner-weekend' : ''}>{label}</div>
              ))}
            </div>
            <div className="planner-days">
              {calendarDays.map((day, index) => {
                const scheduled = (schedulesByDate.get(day.dateKey) || []).flatMap((schedule) => schedule.recruitments)
                const birthdayStudentsForDay = birthdaysByDate.get(day.dateKey) || []
                const isToday = day.dateKey === todayKey
                const isWeekend = index % 7 === 0 || index % 7 === 6

                return (
                  <div
                    key={day.dateKey}
                    className={`planner-day ${day.isCurrentMonth ? '' : 'planner-day-outside'} ${isWeekend ? 'planner-day-weekend' : ''} ${isToday ? 'planner-day-today' : ''} ${!isBirthdayMode && scheduled.length ? 'planner-day-recruitment' : ''} ${isBirthdayMode && birthdayStudentsForDay.length ? 'planner-day-birthday' : ''}`}
                  >
                    <div className="planner-day-number">
                      <span>{day.day}</span>
                      {isToday && <b>Today</b>}
                    </div>
                    {!isBirthdayMode && scheduled.length > 0 && (
                      <>
                        <span className="sr-only">{scheduled.length} recruitment{scheduled.length === 1 ? '' : 's'} scheduled</span>
                        <StickerStack
                          recruitments={scheduled}
                          dateKey={day.dateKey}
                          onSelect={(recruitment, source) => selectRecruitment(recruitment, day.dateKey, source)}
                          onViewMore={() => setPicker({ dateKey: day.dateKey, recruitments: scheduled })}
                        />
                      </>
                    )}
                    {isBirthdayMode && birthdayStudentsForDay.length > 0 && <BirthdayStickerStack students={birthdayStudentsForDay} />}
                    {((!isBirthdayMode && !scheduled.length) || (isBirthdayMode && !birthdayStudentsForDay.length)) && day.isCurrentMonth && <span className="planner-empty-mark" aria-hidden="true">·</span>}
                  </div>
                )
              })}
            </div>
            {((!isBirthdayMode && !monthHasRecruitments) || (isBirthdayMode && !monthHasBirthdays)) && (
              <div className="planner-empty-note"><Sparkles size={15} aria-hidden="true" /> {isBirthdayMode ? 'No student birthdays are listed for this month yet.' : 'No banner notices pinned to this month yet.'}</div>
            )}
          </section>
        )

        return fullscreen ? (
          <StModal
            title={`${isBirthdayMode ? 'Birthday calendar' : 'Recruitment planner'} · ${visibleMonthLabel}`}
            headerActions={(
              <div className="calendar-fullscreen-toolbar">
                <div className="planner-mode-toggle" role="group" aria-label="Fullscreen calendar type">
                  <button type="button" className={!isBirthdayMode ? 'planner-mode-active' : ''} onClick={() => changeMode('recruitment')} aria-pressed={!isBirthdayMode}>Recruitment</button>
                  <button type="button" className={isBirthdayMode ? 'planner-mode-active' : ''} onClick={() => changeMode('birthday')} aria-pressed={isBirthdayMode}>Birthdays</button>
                </div>
                <button type="button" onClick={() => setVisibleMonth(todayMonth)} className="planner-today-button">Today</button>
                <div className="planner-month-controls">
                  <button type="button" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))} aria-label="Previous month in fullscreen"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))} aria-label="Next month in fullscreen"><ChevronRight size={18} /></button>
                </div>
              </div>
            )}
            onClose={() => setFullscreen(false)}
            fullScreen
            viewportFullScreen
            variant="planner"
          >
            <div className="calendar-fullscreen">
              <div ref={fullscreenCanvasRef} className="calendar-fullscreen-canvas">
                <div
                  className="calendar-fullscreen-board"
                  style={{ width: `${100 / fullscreenScale}%`, transform: `translateX(-50%) scale(${fullscreenScale})` }}
                >
                  {plannerBoard}
                </div>
              </div>
            </div>
          </StModal>
        ) : plannerBoard
      })()}

      {picker && (
        <RecruitmentPicker
          dateKey={picker.dateKey}
          recruitments={picker.recruitments}
          onClose={() => setPicker(null)}
          onSelect={(recruitment, source) => selectRecruitment(recruitment, picker.dateKey, source)}
        />
      )}
      {selected && motion && (
        <RecruitmentDossier
          recruitment={selected.recruitment}
          dateKey={selected.dateKey}
          onClose={closeRecruitment}
          motionPhase={motion.phase}
          dossierRef={dossierRef}
        />
      )}
    </section>
  )
}
