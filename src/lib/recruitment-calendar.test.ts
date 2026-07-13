import assert from 'node:assert/strict'
import test from 'node:test'
import { arrangeRecruitmentQueue, buildCalendarDays, daysBetweenDateKeys, groupSchedulesByDate, monthFromDateKey, pairedRecruitmentRowCount, recruitmentReleaseLabel, shiftMonth } from './recruitment-calendar'

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

test('describes upcoming and past recruitment dates from today', () => {
  assert.equal(daysBetweenDateKeys('2026-07-13', '2026-07-13'), 0)
  assert.equal(daysBetweenDateKeys('2026-07-24', '2026-07-13'), 11)
  assert.equal(daysBetweenDateKeys('2026-07-01', '2026-07-13'), -12)
  assert.equal(daysBetweenDateKeys('invalid', '2026-07-13'), null)
  assert.equal(recruitmentReleaseLabel(0), 'Releases today')
  assert.equal(recruitmentReleaseLabel(1), 'Releases tomorrow')
  assert.equal(recruitmentReleaseLabel(-1), 'Released yesterday')
  assert.equal(recruitmentReleaseLabel(11), 'Releases in 11 days')
  assert.equal(recruitmentReleaseLabel(-12), 'Released 12 days ago')
})

test('balances every recruitment queue arrangement across paired block rows', () => {
  const cases = [
    { count: 1, rows: 1, expected: [1] },
    { count: 2, rows: 1, expected: [2] },
    { count: 2, rows: 2, expected: [1, 1] },
    { count: 3, rows: 1, expected: [3] },
    { count: 3, rows: 2, expected: [2, 1] },
    { count: 4, rows: 2, expected: [2, 2] },
    { count: 5, rows: 3, expected: [2, 1, 2] },
    { count: 6, rows: 2, expected: [3, 3] },
    { count: 6, rows: 3, expected: [2, 2, 2] },
    { count: 7, rows: 3, expected: [3, 2, 2] },
    { count: 8, rows: 3, expected: [3, 2, 3] },
    { count: 9, rows: 3, expected: [3, 3, 3] },
    { count: 10, rows: 4, expected: [3, 2, 2, 3] },
  ]

  cases.forEach(({ count, rows, expected }) => {
    const arrangement = arrangeRecruitmentQueue(count, rows)
    assert.deepEqual(arrangement, expected)
    assert.equal(arrangement.reduce((total, rowSize) => total + rowSize, 0), count)
    assert.ok(arrangement.every((rowSize) => rowSize >= 1 && rowSize <= 3))
  })

  assert.deepEqual(arrangeRecruitmentQueue(0, 3), [])
})

test('supports every paired queue size without losing cards or creating partial rows', () => {
  for (let leftCount = 1; leftCount <= 30; leftCount += 1) {
    for (let rightCount = 1; rightCount <= 30; rightCount += 1) {
      const targetRows = pairedRecruitmentRowCount(leftCount, rightCount)

      for (const count of [leftCount, rightCount]) {
        const arrangement = arrangeRecruitmentQueue(count, targetRows)
        assert.equal(arrangement.length, Math.min(targetRows, count))
        assert.equal(arrangement.reduce((total, rowSize) => total + rowSize, 0), count)
        assert.ok(arrangement.every((rowSize) => rowSize >= 1 && rowSize <= 3))
        assert.ok(Math.max(...arrangement) - Math.min(...arrangement) <= 1)
        assert.ok(arrangement.every((rowSize) => 6 % rowSize === 0))
      }
    }
  }
})
