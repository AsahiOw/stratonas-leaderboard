export const MAINTENANCE_WINDOW_MS = 10 * 60 * 1000

export type MaintenanceJobId = 'radio' | 'students' | 'bosses' | 'plana' | 'memorial'

export type MaintenanceSchedule = {
  id: MaintenanceJobId
  label: string
  utcDay: number
  utcHour: number
}

export const MAINTENANCE_SCHEDULES: MaintenanceSchedule[] = [
  { id: 'radio', label: 'Radio OST', utcDay: 2, utcHour: 19 },
  { id: 'students', label: 'SchaleDB Students', utcDay: 2, utcHour: 20 },
  { id: 'bosses', label: 'SchaleDB Raid Bosses', utcDay: 2, utcHour: 21 },
  { id: 'plana', label: 'Plana Stats Raid', utcDay: 2, utcHour: 22 },
  { id: 'memorial', label: 'Memorial Lobby Media', utcDay: 3, utcHour: 17 },
]

export function latestScheduledAt(schedule: MaintenanceSchedule, now: Date) {
  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    schedule.utcHour,
    0,
    0,
    0
  ))
  const dayOffset = (candidate.getUTCDay() - schedule.utcDay + 7) % 7
  candidate.setUTCDate(candidate.getUTCDate() - dayOffset)
  if (candidate > now) candidate.setUTCDate(candidate.getUTCDate() - 7)
  return candidate
}

export function isWithinMaintenanceWindow(schedule: MaintenanceSchedule, now: Date) {
  const scheduledAt = latestScheduledAt(schedule, now)
  return {
    scheduledAt,
    eligible: now.getTime() < scheduledAt.getTime() + MAINTENANCE_WINDOW_MS,
  }
}
