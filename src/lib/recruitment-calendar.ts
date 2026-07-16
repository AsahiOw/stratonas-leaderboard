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

export function daysBetweenDateKeys(dateKey: string, todayKey: string) {
  if (!isValidDateKey(dateKey) || !isValidDateKey(todayKey)) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const [todayYear, todayMonth, todayDay] = todayKey.split('-').map(Number)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 86_400_000)
}

export function recruitmentReleaseLabel(days: number) {
  if (days === 0) return 'Releases today'
  if (days === 1) return 'Releases tomorrow'
  if (days === -1) return 'Released yesterday'
  if (days > 1) return `Releases in ${days} days`
  return `Released ${Math.abs(days)} days ago`
}

/**
 * Distribute a queue across the requested number of rows with no partial rows.
 * Extra items are placed from the outside inward so three-row groups retain the
 * planner's balanced patterns: 5 => 2/1/2, 7 => 3/2/2, 8 => 3/2/3.
 */
export function arrangeRecruitmentQueue(itemCount: number, requestedRows: number) {
  if (itemCount <= 0) return []

  const rowCount = Math.max(1, Math.min(Math.floor(requestedRows), itemCount))
  const baseSize = Math.floor(itemCount / rowCount)
  let remainder = itemCount % rowCount
  const rows = Array.from({ length: rowCount }, () => baseSize)
  const outsideInOrder: number[] = []

  for (let offset = 0; outsideInOrder.length < rowCount; offset += 1) {
    const left = offset
    const right = rowCount - 1 - offset
    if (left <= right) outsideInOrder.push(left)
    if (right > left) outsideInOrder.push(right)
  }

  for (const rowIndex of outsideInOrder) {
    if (remainder === 0) break
    rows[rowIndex] += 1
    remainder -= 1
  }

  return rows
}

export function pairedRecruitmentRowCount(itemCount: number, pairedItemCount: number) {
  return Math.max(1, Math.ceil(Math.max(itemCount, pairedItemCount) / 3))
}
