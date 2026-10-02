import type { ChibiCatalogStudent } from './types'

export type ChibiAvailabilityFilter = 'all' | 'viewable' | 'unavailable'

export interface ChibiBrowserQuery {
  search: string
  availability: ChibiAvailabilityFilter
  studentId: number | null
  invalidStudent: string | null
}

// Public catalog responses contain successful/viewable rows only. Keep
// `viewable` as a backwards-compatible URL value, but ignore the old
// unavailable view so stale links cannot hide the whole public catalog.
const availabilityValues = new Set<ChibiAvailabilityFilter>(['all', 'viewable'])

export function readChibiBrowserQuery(params: URLSearchParams): ChibiBrowserQuery {
  const availability = params.get('availability') as ChibiAvailabilityFilter | null
  const rawStudent = params.get('student')
  const studentId = rawStudent && /^\d{5}$/.test(rawStudent) ? Number(rawStudent) : null
  return {
    search: params.get('q')?.trim() || '',
    availability: availability && availabilityValues.has(availability) ? availability : 'all',
    studentId,
    invalidStudent: rawStudent && studentId === null ? rawStudent : null,
  }
}

export function filterChibiStudents(
  students: readonly ChibiCatalogStudent[],
  query: Pick<ChibiBrowserQuery, 'search' | 'availability'>,
) {
  const needle = query.search.trim().toLocaleLowerCase()
  return students
    .filter((student) => {
      if (student.status !== 'viewable' || !student.model) return false
      if (needle && ![student.name, String(student.id), student.pathName || '']
        .some((value) => value.toLocaleLowerCase().includes(needle))) return false
      return true
    })
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.id - right.id)
}

export function resolveChibiSelection(
  students: readonly ChibiCatalogStudent[],
  filtered: readonly ChibiCatalogStudent[],
  query: Pick<ChibiBrowserQuery, 'studentId' | 'invalidStudent'>,
) {
  if (query.invalidStudent) return { selected: null, requested: null, problem: `“${query.invalidStudent}” is not a valid five-digit student ID.` }
  const requested = query.studentId === null ? null : students.find((student) => student.id === query.studentId) || null
  if (query.studentId !== null && !requested) return { selected: null, requested: null, problem: `Student ${query.studentId} has no published model in the catalog.` }
  if (requested && !filtered.some((student) => student.id === requested.id)) return { selected: null, requested, problem: `${requested.name} is excluded by the current search or filters.` }
  return { selected: requested, requested, problem: null }
}

export function writeChibiBrowserQuery(query: Omit<ChibiBrowserQuery, 'invalidStudent'>) {
  const params = new URLSearchParams()
  if (query.search) params.set('q', query.search)
  if (query.availability === 'viewable') params.set('availability', query.availability)
  if (query.studentId !== null) params.set('student', String(query.studentId))
  return params
}
