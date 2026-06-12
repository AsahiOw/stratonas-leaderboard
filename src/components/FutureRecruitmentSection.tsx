'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { dateKeyFromDate } from '@/lib/recruitments'
import { fmtDate, imageSrc } from '@/lib/utils'

export interface FutureRecruitmentSchedule {
  id: string
  dateKey: string
  recruitments: FutureRecruitment[]
}

interface FutureRecruitment {
  id: string
  bannerPath: string
  animationPath: string
  student: {
    id: number
    name: string
    characterVoice?: string | null
  }
}

interface Props {
  schedule?: FutureRecruitmentSchedule | null
}

function countdownTarget(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).getTime()
}

function formatCountdown(dateKey: string, now: number) {
  const remaining = Math.max(0, countdownTarget(dateKey) - now)
  const totalMinutes = Math.floor(remaining / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const seconds = Math.floor((remaining % 60000) / 1000)

  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

export function FutureRecruitmentSection({ schedule }: Props) {
  const [currentSchedule, setCurrentSchedule] = useState<FutureRecruitmentSchedule | null>(schedule || null)
  const currentScheduleDateKey = currentSchedule?.dateKey
  const recruitments = useMemo(() => currentSchedule?.recruitments || [], [currentSchedule?.recruitments])
  const videoStageRef = useRef<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState(recruitments[0]?.id || '')
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [videoHeight, setVideoHeight] = useState<number | null>(null)

  useEffect(() => {
    setCurrentSchedule(schedule || null)
  }, [schedule])

  useEffect(() => {
    setActiveId(recruitments[0]?.id || '')
    setReady(false)
  }, [currentSchedule?.id, recruitments])

  async function refreshFutureRecruitment() {
    const params = new URLSearchParams({
      todayKey: dateKeyFromDate(),
      t: String(Date.now()),
    })
    const res = await fetch(`/api/recruitments/future?${params}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Future recruitment lookup failed')
    const nextSchedule = await res.json() as FutureRecruitmentSchedule | null
    setCurrentSchedule(nextSchedule)
  }

  useEffect(() => {
    if (currentScheduleDateKey && currentScheduleDateKey > dateKeyFromDate()) return
    refreshFutureRecruitment().catch(() => undefined)
  }, [currentScheduleDateKey])

  useEffect(() => {
    if (!currentSchedule || recruitments.length === 0) return

    let cancelled = false
    Promise.all(
      recruitments.flatMap((recruitment) => [
        fetch(imageSrc(recruitment.bannerPath))
          .then((res) => res.blob())
          .catch(() => null),
        fetch(imageSrc(recruitment.animationPath))
          .then((res) => res.blob())
          .catch(() => null),
      ])
    ).then(() => {
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [currentSchedule, recruitments])

  useEffect(() => {
    if (!currentSchedule) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [currentSchedule])

  useEffect(() => {
    if (!currentSchedule) return
    const delay = Math.max(0, countdownTarget(currentSchedule.dateKey) - Date.now()) + 1000
    const timer = window.setTimeout(() => {
      refreshFutureRecruitment().catch(() => undefined)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [currentSchedule])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') refreshFutureRecruitment().catch(() => undefined)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    const stage = videoStageRef.current
    if (!stage) return
    const observedStage = stage

    function updateVideoHeight() {
      setVideoHeight(observedStage.getBoundingClientRect().height)
    }

    updateVideoHeight()
    const resizeObserver = new ResizeObserver(updateVideoHeight)
    resizeObserver.observe(stage)
    window.addEventListener('resize', updateVideoHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateVideoHeight)
    }
  }, [ready])

  if (!currentSchedule || recruitments.length === 0 || !ready) return null

  const activeRecruitment = recruitments.find((recruitment) => recruitment.id === activeId) || recruitments[0]

  return (
    <section className="fade-up mb-3 mt-5 md:mb-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted2">
          Future Recruitment
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {formatCountdown(currentSchedule.dateKey, now)}
        </div>
      </div>

      <div className="future-recruitment-layout">
        <div ref={videoStageRef} className="future-recruitment-video relative overflow-hidden rounded-xl bg-bg">
          <video
            src={imageSrc(activeRecruitment.animationPath)}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(8,8,12,0.72),transparent_44%)]" />
          <div className="absolute bottom-3 left-3 max-w-[min(82%,360px)] rounded-lg border border-white/15 bg-white/88 px-3 py-2 text-accent shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="truncate text-sm font-bold leading-tight">{activeRecruitment.student.name}</div>
            <div className="mt-0.5 truncate text-[11px] font-semibold text-accent">
              CV. {activeRecruitment.student.characterVoice || '—'}
            </div>
            <div className="mt-1 font-mono text-[10px] font-semibold text-accent">
              {fmtDate(currentSchedule.dateKey)}
            </div>
          </div>
        </div>

        <div
          className="future-recruitment-rail scrollbar-hidden flex gap-2 overflow-x-auto pb-1 pl-1 md:flex-col md:overflow-x-visible md:overflow-y-auto md:pb-0 md:pl-4"
          style={{ maxHeight: videoHeight ? `${videoHeight}px` : undefined }}
        >
          {recruitments.map((recruitment) => {
            const selected = recruitment.id === activeRecruitment.id
            return (
              <button
                key={recruitment.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveId(recruitment.id)}
                className={`relative h-24 min-w-[180px] overflow-hidden rounded-xl bg-transparent transition-transform duration-200 ease-out md:aspect-[16/6] md:h-auto md:min-h-[96px] md:min-w-0 md:shrink-0 ${selected ? '-translate-y-1.5 md:translate-y-0 md:-translate-x-3' : 'hover:-translate-y-1 md:hover:translate-y-0 md:hover:-translate-x-1'
                  }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc(recruitment.bannerPath)}
                  alt={recruitment.student.name}
                  className="h-full w-full object-cover"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
