import type { ChibiAction, ChibiCatalogStudent } from './types'

export type ChibiAvailabilityFilter = 'all' | 'viewable' | 'unavailable'
export type ChibiInteractionFilter = 'all' | ChibiAction

export interface ChibiBrowserQuery {
  search: string
  availability: ChibiAvailabilityFilter
  interaction: ChibiInteractionFilter
  studentId: number | null
  invalidStudent: string | null
}

// Public catalog responses contain successful/viewable rows only. Keep
// `viewable` as a backwards-compatible URL value, but ignore the old
// unavailable view so stale links cannot hide the whole public catalog.
const availabilityValues = new Set<ChibiAvailabilityFilter>(['all', 'viewable'])
const interactionValues = new Set<ChibiInteractionFilter>(['all', 'idle', 'walk', 'pickup', 'touch'])

export function readChibiBrowserQuery(params: URLSearchParams): ChibiBrowserQuery {
  const availability = params.get('availability') as ChibiAvailabilityFilter | null
  const interaction = params.get('interaction') as ChibiInteractionFilter | null
  const rawStudent = params.get('student')
  const studentId = rawStudent && /^\d{5}$/.test(rawStudent) ? Number(rawStudent) : null
  return {
    search: params.get('q')?.trim() || '',
    availability: availability && availabilityValues.has(availability) ? availability : 'all',
    interaction: interaction && interactionValues.has(interaction) ? interaction : 'all',
    studentId,
    invalidStudent: rawStudent && studentId === null ? rawStudent : null,
  }
}

export function filterChibiStudents(
  students: readonly ChibiCatalogStudent[],
  query: Pick<ChibiBrowserQuery, 'search' | 'availability' | 'interaction'>,
) {
  const needle = query.search.trim().toLocaleLowerCase()
  return students
    .filter((student) => {
      if (student.status !== 'viewable' || !student.model) return false
      if (needle && ![student.name, String(student.id), student.pathName || '']
        .some((value) => value.toLocaleLowerCase().includes(needle))) return false
      if (query.interaction !== 'all' && student.model.profile.interactions[query.interaction].state !== 'available') return false
      return true
    })
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.id - right.id)
}

export function defaultChibiStudent(students: readonly ChibiCatalogStudent[]) {
  return students.find((student) => student.id === 10002 && student.model)
    || students.find((student) => student.model)
    || students[0]
    || null
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
  return { selected: requested || defaultChibiStudent(filtered), requested, problem: null }
}

export function writeChibiBrowserQuery(query: Omit<ChibiBrowserQuery, 'invalidStudent'>) {
  const params = new URLSearchParams()
  if (query.search) params.set('q', query.search)
  if (query.availability === 'viewable') params.set('availability', query.availability)
  if (query.interaction !== 'all') params.set('interaction', query.interaction)
  if (query.studentId !== null) params.set('student', String(query.studentId))
  return params
}
