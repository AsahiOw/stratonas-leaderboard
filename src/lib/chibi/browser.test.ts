import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultChibiStudent, filterChibiStudents, readChibiBrowserQuery, resolveChibiSelection, writeChibiBrowserQuery } from './browser'
import type { ChibiCatalogStudent, ChibiInteraction, ChibiProfile } from './types'

const available: ChibiInteraction = { state: 'available', clip: 'clip' }
const unsupported: ChibiInteraction = { state: 'unsupported', reason: 'Not authored' }
const profile: ChibiProfile = {
  label: 'Original', initialPose: 'idle', idleLabel: 'Café idle',
  interactions: { idle: available, walk: available, pickup: unsupported, touch: available },
}
function student(id: number, name: string, pathName: string | null, viewable = true): ChibiCatalogStudent {
  return {
    id, name, pathName, image: '', portrait: null, status: viewable ? 'viewable' : 'unavailable', diagnostic: viewable ? null : 'Source model missing',
    model: viewable ? { assetId: String(id), revision: 'r1', url: `/${id}.glb`, sourceIdentity: pathName || String(id), profile } : null,
  }
}
const roster = [student(10003, 'Zeta', 'zeta'), student(10002, 'Haruna', 'haruna'), student(10005, 'Alpha', 'alpha')]
const blockedRoster = [...roster, student(10004, 'Alpha', null, false)]

test('filters name, id, and path then sorts by name and numeric id', () => {
  assert.deepEqual(filterChibiStudents(roster, { search: '10002', availability: 'all', interaction: 'all' }).map((row) => row.id), [10002])
  assert.deepEqual(filterChibiStudents(roster, { search: 'ZET', availability: 'all', interaction: 'all' }).map((row) => row.id), [10003])
  assert.deepEqual(filterChibiStudents(roster, { search: 'haruna', availability: 'all', interaction: 'all' }).map((row) => row.id), [10002])
  assert.deepEqual(filterChibiStudents(roster, { search: '', availability: 'all', interaction: 'all' }).map((row) => row.id), [10005, 10002, 10003])
})

test('filters supported interactions and keeps defensive availability handling deterministic', () => {
  assert.deepEqual(filterChibiStudents(blockedRoster, { search: '', availability: 'unavailable', interaction: 'all' }).map((row) => row.id), [10005, 10002, 10003])
  assert.deepEqual(filterChibiStudents(roster, { search: '', availability: 'all', interaction: 'pickup' }), [])
  assert.equal(filterChibiStudents(roster, { search: '', availability: 'all', interaction: 'touch' }).length, 3)
})

test('ignores the legacy unavailable URL filter for the successful-only public catalog', () => {
  const parsed = readChibiBrowserQuery(new URLSearchParams('availability=unavailable'))
  assert.equal(parsed.availability, 'all')
  assert.equal(writeChibiBrowserQuery(parsed).toString(), '')
})

test('keeps invalid, unknown, and filtered-out deep links explicit', () => {
  const filtered = filterChibiStudents(blockedRoster, { search: '', availability: 'viewable', interaction: 'all' })
  assert.match(resolveChibiSelection(roster, filtered, { studentId: null, invalidStudent: 'abc' }).problem || '', /not a valid/)
  assert.match(resolveChibiSelection(roster, filtered, { studentId: 99999, invalidStudent: null }).problem || '', /no published model/)
  const excluded = resolveChibiSelection(blockedRoster, filtered, { studentId: 10004, invalidStudent: null })
  assert.equal(excluded.selected, null)
  assert.equal(excluded.requested?.id, 10004)
  assert.match(excluded.problem || '', /excluded/)
})

test('prefers viewable Haruna and preserves valid URL state while rejecting invalid student ids', () => {
  assert.equal(defaultChibiStudent(roster)?.id, 10002)
  const parsed = readChibiBrowserQuery(new URLSearchParams('q=shun&availability=viewable&interaction=touch&student=10144'))
  assert.deepEqual(parsed, { search: 'shun', availability: 'viewable', interaction: 'touch', studentId: 10144, invalidStudent: null })
  assert.equal(writeChibiBrowserQuery(parsed).toString(), 'q=shun&availability=viewable&interaction=touch&student=10144')
  assert.equal(readChibiBrowserQuery(new URLSearchParams('student=Haruna')).invalidStudent, 'Haruna')
})
