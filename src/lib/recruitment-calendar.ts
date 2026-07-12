import { isValidDateKey } from './recruitments'

export interface CalendarDay {
  dateKey: string
  day: number
  isCurrentMonth: boolean
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthFromDateKey(dateKey: string) {
  if (!isValidDateKey(dateKey)) return null
  const [year, month] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

export function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function buildCalendarDays(month: Date): CalendarDay[] {
  const firstDay = monthStart(month)
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    return {
      dateKey: localDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === firstDay.getMonth(),
    }
  })
}

export function groupSchedulesByDate<T extends { dateKey: string }>(schedules: T[]) {
  return schedules.reduce((groups, schedule) => {
    const current = groups.get(schedule.dateKey) || []
    current.push(schedule)
    groups.set(schedule.dateKey, current)
    return groups
  }, new Map<string, T[]>())
}
