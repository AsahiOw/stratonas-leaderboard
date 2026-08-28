import assert from 'node:assert/strict'
import {
  isWithinMaintenanceWindow,
  latestScheduledAt,
  MAINTENANCE_SCHEDULES,
  MAINTENANCE_WINDOW_MS,
} from './maintenance-schedule'

const expected = new Map([
  ['radio', '2026-08-18T19:00:00.000Z'],
  ['students', '2026-08-18T20:00:00.000Z'],
  ['bosses', '2026-08-18T21:00:00.000Z'],
  ['plana', '2026-08-18T22:00:00.000Z'],
  ['memorial', '2026-08-19T17:00:00.000Z'],
])

for (const schedule of MAINTENANCE_SCHEDULES) {
  const scheduledAt = latestScheduledAt(schedule, new Date(expected.get(schedule.id)!))
  assert.equal(scheduledAt.toISOString(), expected.get(schedule.id))
  assert.equal(isWithinMaintenanceWindow(schedule, scheduledAt).eligible, true)
  assert.equal(isWithinMaintenanceWindow(schedule, new Date(scheduledAt.getTime() + MAINTENANCE_WINDOW_MS - 1)).eligible, true)
  assert.equal(isWithinMaintenanceWindow(schedule, new Date(scheduledAt.getTime() + MAINTENANCE_WINDOW_MS)).eligible, false)
}

const beforeRadio = new Date('2026-08-18T18:59:59.999Z')
assert.equal(isWithinMaintenanceWindow(MAINTENANCE_SCHEDULES[0], beforeRadio).eligible, false)
assert.equal(latestScheduledAt(MAINTENANCE_SCHEDULES[0], beforeRadio).toISOString(), '2026-08-11T19:00:00.000Z')

console.log('Maintenance schedule tests passed.')
