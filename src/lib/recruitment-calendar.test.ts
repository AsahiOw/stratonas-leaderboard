import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCalendarDays, groupSchedulesByDate, monthFromDateKey, shiftMonth } from './recruitment-calendar'

test('builds a Sunday-to-Saturday calendar grid across month boundaries', () => {
  const days = buildCalendarDays(new Date(2026, 2, 1))

  assert.equal(days.length, 42)
  assert.deepEqual(days.slice(0, 7).map((day) => day.dateKey), [
    '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07',
  ])
  assert.equal(days[31].dateKey, '2026-04-01')
  assert.equal(days[31].isCurrentMonth, false)
})

test('handles leap-year months and month navigation', () => {
  const days = buildCalendarDays(new Date(2028, 1, 1))
  const leapDay = days.find((day) => day.dateKey === '2028-02-29')

  assert.ok(leapDay)
  assert.equal(leapDay.isCurrentMonth, true)
  assert.equal(shiftMonth(new Date(2028, 0, 1), 1).getMonth(), 1)
  assert.equal(monthFromDateKey('2028-02-29')?.getMonth(), 1)
  assert.equal(monthFromDateKey('not-a-date'), null)
})

test('groups every scheduled recruitment under its start date', () => {
  const grouped = groupSchedulesByDate([
    { id: 'a', dateKey: '2026-07-20' },
    { id: 'b', dateKey: '2026-07-20' },
    { id: 'c', dateKey: '2026-07-27' },
  ])

  assert.deepEqual(grouped.get('2026-07-20')?.map((schedule) => schedule.id), ['a', 'b'])
  assert.deepEqual(grouped.get('2026-07-27')?.map((schedule) => schedule.id), ['c'])
})
