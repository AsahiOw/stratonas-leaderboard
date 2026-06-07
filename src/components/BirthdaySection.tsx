'use client'

import { useEffect, useRef, useState } from 'react'
import { getNextBirthdayRefreshDelay } from '@/lib/birthdays'
import { BirthdayTicket, UpcomingBirthdayCard, type BirthdayStudent } from '@/components/BirthdayTicket'

interface BirthdayResponse {
  birthdayKey: string
  nextRefreshAt: string
  students: BirthdayStudent[]
}

interface UpcomingBirthdayResponse extends BirthdayResponse {
  maxDays: number
}

interface BirthdaySectionProps {
  initialData?: BirthdayResponse | null
  initialUpcomingData?: UpcomingBirthdayResponse | null
}

function formatBirthdayKey(key: string) {
  const [monthRaw, dayRaw] = key.split('/')
  const date = new Date(Date.UTC(2024, Number(monthRaw) - 1, Number(dayRaw)))
  if (!Number.isFinite(date.getTime())) return key
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function BirthdaySection({ initialData = null, initialUpcomingData = null }: BirthdaySectionProps) {
  const [data, setData] = useState<BirthdayResponse | null>(initialData)
  const [upcomingData, setUpcomingData] = useState<UpcomingBirthdayResponse | null>(initialUpcomingData)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0 })

  useEffect(() => {
    let alive = true
    let refreshTimer: number | undefined
    let retryTimer: number | undefined

    async function loadBirthdayEndpoint<T>(url: string) {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('Birthday lookup failed')
      return res.json() as Promise<T>
    }

    async function loadBirthdays() {
      const cacheBust = Date.now()
      const [todayResult, upcomingResult] = await Promise.allSettled([
        loadBirthdayEndpoint<BirthdayResponse>(`/api/birthdays/today?t=${cacheBust}`),
        loadBirthdayEndpoint<UpcomingBirthdayResponse>(`/api/birthdays/upcoming?days=60&t=${cacheBust}`),
      ])
      if (todayResult.status === 'rejected' && upcomingResult.status === 'rejected') throw new Error('Birthday lookup failed')
      if (alive) {
        if (todayResult.status === 'fulfilled') setData(todayResult.value)
        if (upcomingResult.status === 'fulfilled') setUpcomingData(upcomingResult.value)
      }
    }

    function scheduleNextRefresh() {
      refreshTimer = window.setTimeout(() => {
        loadBirthdays().finally(() => {
          if (alive) scheduleNextRefresh()
        })
      }, getNextBirthdayRefreshDelay())
    }

    loadBirthdays().catch(() => {
      if (alive) retryTimer = window.setTimeout(() => loadBirthdays().catch(() => undefined), 5000)
    })
    scheduleNextRefresh()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') loadBirthdays().catch(() => undefined)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      alive = false
      if (refreshTimer) window.clearTimeout(refreshTimer)
      if (retryTimer) window.clearTimeout(retryTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const birthdayStudents = data?.students || []
  const upcomingStudents = upcomingData?.students || []

  if (!birthdayStudents.length && !upcomingStudents.length) return null

  function handleScrollPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = scrollRef.current
    if (!target) return

    dragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: target.scrollLeft,
    }
    target.setPointerCapture(event.pointerId)
  }

  function handleScrollPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const target = scrollRef.current
    const drag = dragRef.current
    if (!target || !drag.active) return

    event.preventDefault()
    target.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX)
  }

  function stopScrollDrag(event: React.PointerEvent<HTMLDivElement>) {
    const target = scrollRef.current
    dragRef.current.active = false
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
  }

  return (
    <section className="fade-up mt-6">
      {birthdayStudents.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <div className="rounded-md bg-card2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted2">
              {formatBirthdayKey(data?.birthdayKey || '')} Birthdays
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {birthdayStudents.map((student) => (
              <BirthdayTicket key={student.id} student={student} />
            ))}
          </div>
        </>
      )}

      {upcomingStudents.length > 0 && (
        <div className={birthdayStudents.length > 0 ? 'mt-3' : ''}>
          <div className="mb-3 flex items-center gap-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted2">
              Upcoming Birthday · next {upcomingData?.maxDays || 60} days
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {String(upcomingStudents.length).padStart(2, '0')} upcoming
            </div>
          </div>
          <div
            ref={scrollRef}
            className="birthday-scrollbar w-full cursor-grab touch-pan-x select-none overflow-x-auto pb-2 active:cursor-grabbing"
            onPointerDown={handleScrollPointerDown}
            onPointerMove={handleScrollPointerMove}
            onPointerUp={stopScrollDrag}
            onPointerCancel={stopScrollDrag}
            onPointerLeave={stopScrollDrag}
          >
            <div className="flex w-max min-w-full flex-nowrap gap-3">
              {upcomingStudents.map((student) => (
                <UpcomingBirthdayCard key={student.id} student={student} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
