'use client'

import { useEffect, useState } from 'react'
import { getNextBirthdayRefreshDelay } from '@/lib/birthdays'
import { BirthdayTicket, type BirthdayStudent } from '@/components/BirthdayTicket'

interface BirthdayResponse {
  birthdayKey: string
  nextRefreshAt: string
  students: BirthdayStudent[]
}

function formatBirthdayKey(key: string) {
  const [monthRaw, dayRaw] = key.split('/')
  const date = new Date(Date.UTC(2024, Number(monthRaw) - 1, Number(dayRaw)))
  if (!Number.isFinite(date.getTime())) return key
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function BirthdaySection() {
  const [data, setData] = useState<BirthdayResponse | null>(null)

  useEffect(() => {
    let alive = true
    let timer: number | undefined

    async function loadBirthdays() {
      const res = await fetch(`/api/birthdays/today?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Birthday lookup failed')
      const body = (await res.json()) as BirthdayResponse
      if (alive) setData(body)
    }

    function scheduleNextRefresh() {
      timer = window.setTimeout(() => {
        loadBirthdays().catch(() => {
          if (alive) setData(null)
        }).finally(() => {
          if (alive) scheduleNextRefresh()
        })
      }, getNextBirthdayRefreshDelay())
    }

    loadBirthdays().catch(() => {
      if (alive) setData(null)
    })
    scheduleNextRefresh()

    return () => {
      alive = false
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  if (!data?.students.length) return null

  return (
    <section className="fade-up mt-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <div className="rounded-md bg-card2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted2">
          {formatBirthdayKey(data.birthdayKey)} Birthdays
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.students.map((student) => (
          <BirthdayTicket key={student.id} student={student} />
        ))}
      </div>
    </section>
  )
}
