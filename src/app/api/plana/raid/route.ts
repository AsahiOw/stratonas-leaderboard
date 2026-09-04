import { jsonWithPublicCache } from '@/lib/cache'
import {
  getPlanaRaidMeta,
  getPlanaRankings,
  getPlanaUsedTeams,
  type PlanaFormationFilter,
  type PlanaStudentGroupFilter,
  type PlanaStudentFilter,
} from '@/lib/plana-public'

export const dynamic = 'force-dynamic'

function integerParam(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function studentFiltersParam(value: string | null): PlanaStudentFilter[] {
  if (!value) return []
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed)) throw new Error('Invalid student filters.')
  return parsed.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid student filter.')
    const candidate = item as Record<string, unknown>
    const id = Number(candidate.id)
    const mode = candidate.mode === 'exclude' ? 'exclude' : 'include'
    const build = typeof candidate.build === 'string' && candidate.build ? candidate.build : null
    const buildComparison = candidate.buildComparison === 'lte' || candidate.buildComparison === 'gte'
      ? candidate.buildComparison
      : 'eq'
    const allowedUsage = mode === 'exclude'
      ? ['default', 'self', 'assist']
      : ['default', 'self', 'assist', 'single', 'twice']
    const usage = typeof candidate.usage === 'string' && allowedUsage.includes(candidate.usage)
      ? candidate.usage as PlanaStudentFilter['usage']
      : 'default'
    if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid student filter.')
    return { id, mode, build, buildComparison, usage }
  })
}

function studentGroupFiltersParam(value: string | null): PlanaStudentGroupFilter[] {
  if (!value) return []
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed)) throw new Error('Invalid student group filters.')
  return parsed.slice(0, 12).map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid student group filter.')
    const candidate = item as Record<string, unknown>
    if (!Array.isArray(candidate.ids)) throw new Error('Invalid student group filter.')
    const ids = candidate.ids.map(Number)
    const count = Number(candidate.count)
    const usage = candidate.usage === 'self' || candidate.usage === 'assist' || candidate.usage === 'assistOnly'
      ? candidate.usage
      : 'default'
    if (ids.length < 2 || ids.length > 12 || new Set(ids).size !== ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new Error('A student group must contain 2 to 12 distinct students.')
    }
    if (!Number.isInteger(count) || count < 1 || count > ids.length) throw new Error('Invalid student group count.')
    return { ids, usage, count }
  })
}

function formationFiltersParam(value: string | null): PlanaFormationFilter[] {
  if (!value) return []
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed)) throw new Error('Invalid formation filters.')
  return parsed.slice(0, 100).map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid formation filter.')
    const candidate = item as Record<string, unknown>
    if (!Array.isArray(candidate.students)) throw new Error('Invalid formation students.')
    const seen = new Set<number>()
    const students = candidate.students.slice(0, 6).map((student) => {
      if (!student || typeof student !== 'object') throw new Error('Invalid formation student.')
      const entry = student as Record<string, unknown>
      const id = Number(entry.id)
      if (!Number.isInteger(id) || id <= 0 || seen.has(id)) throw new Error('Invalid formation student.')
      seen.add(id)
      const slot = Number(entry.slot)
      if (!Number.isInteger(slot) || slot < 0 || slot > 5) throw new Error('Invalid formation slot.')
      const startOrder = typeof entry.startOrder === 'string'
        && ['any', 'start', '1', '2', '3', '4', '5'].includes(entry.startOrder)
        ? entry.startOrder as PlanaFormationFilter['students'][number]['startOrder']
        : 'any'
      return { id, slot, startOrder, borrowed: entry.borrowed === true }
    })
    return { strictOrder: candidate.strictOrder === true, students }
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const region = url.searchParams.get('region') || ''
  const raidType = url.searchParams.get('raidType') || ''
  const raidDate = url.searchParams.get('raidDate') || ''
  const view = url.searchParams.get('view') || 'rankings'

  try {
    if (view === 'meta') {
      return jsonWithPublicCache(await getPlanaRaidMeta({ region, raidType, raidDate }))
    }
    const filteredInput = {
      region,
      raidType,
      raidDate,
      page: integerParam(url.searchParams.get('page')),
      pageSize: integerParam(url.searchParams.get('pageSize')),
      studentFilters: studentFiltersParam(url.searchParams.get('studentFilters')),
      formationFilters: formationFiltersParam(url.searchParams.get('formationFilters')),
      studentGroupFilters: studentGroupFiltersParam(url.searchParams.get('studentGroupFilters')),
      minRank: integerParam(url.searchParams.get('minRank')),
      maxRank: integerParam(url.searchParams.get('maxRank')),
    }
    if (view === 'usage') {
      return jsonWithPublicCache(await getPlanaUsedTeams({
        ...filteredInput,
        armor: url.searchParams.get('armor') || '',
      }))
    }
    if (view !== 'rankings') {
      return jsonWithPublicCache({ error: 'Unsupported Plana raid view.' }, { status: 400 })
    }

    return jsonWithPublicCache(await getPlanaRankings({
      ...filteredInput,
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read Plana raid data.'
    const status = message.includes('not available') || message.includes('unavailable') ? 404 : 400
    return jsonWithPublicCache({ error: message }, { status })
  }
}
