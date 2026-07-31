import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api'
import { prisma } from '@/lib/prisma'

const PLANA_DATA_ROOT = path.join(process.cwd(), 'Development_data', 'plana-stats')
const queryQueues = new Map<string, Promise<unknown>>()

export const PLANA_RAID_TYPES = ['Total Assault', 'Grand Assault'] as const
export type PlanaRaidType = (typeof PLANA_RAID_TYPES)[number]

export interface PlanaRaidCatalogItem {
  id: string
  region: string
  raidType: PlanaRaidType
  raidDate: string
  season: string
  label: string
  internalName: string
  terrain: string
  source: string
  maxDifficulty: string | null
  armors: string[]
  difficulties: string[]
  startAt: string | null
  endAt: string | null
  emergingGlobal: boolean
  boss: {
    name: string
    image: string | null
    color: string
    color2: string
    pattern: string
  } | null
}

export interface PlanaStudentOption {
  id: number
  name: string
  image: string
  builds?: string[]
}

export interface PlanaStudentBuild extends PlanaStudentOption {
  build: string
  level: number
  slot: number
  assist: boolean
  skillOrder: number
}

export interface PlanaTeam {
  runId: number
  students: PlanaStudentBuild[]
}

export interface PlanaRankingPhase {
  armor: string | null
  score: number
  difficulty: string
  teams: PlanaTeam[]
}

export interface PlanaRanking {
  clearId: string
  rank: number
  score: number
  difficulty: string
  phases: PlanaRankingPhase[]
}

export interface PlanaDifficultyStat {
  label: string
  count: number
  minScore: number
  maxScore: number
  minRank: number | null
  maxRank: number | null
}

export type PlanaStudentFilter = {
  id: number
  mode: 'include' | 'exclude'
  build: string | null
  buildComparison: 'eq' | 'lte' | 'gte'
  usage: 'default' | 'self' | 'assist' | 'single' | 'twice'
}

export type PlanaFormationFilter = {
  strictOrder: boolean
  students: Array<{
    id: number
    slot: number
    startOrder: 'any' | 'start' | '1' | '2' | '3' | '4' | '5'
    borrowed: boolean
  }>
}

export interface PlanaUsedTeam {
  armor: string | null
  uses: number
  students: PlanaStudentOption[]
}

export interface PlanaRaidMeta {
  totalRankings: number
  maxRank: number
  difficultyStats: PlanaDifficultyStat[]
  students: PlanaStudentOption[]
  mostUsedTeams: PlanaUsedTeam[]
}

export interface PlanaRankingsPage {
  total: number
  page: number
  pageSize: number
  pageCount: number
  rankings: PlanaRanking[]
}

export interface PlanaUsedTeamsPage {
  total: number
  page: number
  pageSize: number
  pageCount: number
  teams: PlanaUsedTeam[]
}

type DatasetRow = {
  region: string
  raidType: string
  raidDate: string
  season: string
  label: string
  internalName: string
  terrain: string
  source: string
  maxDifficulty: string | null
  armors: unknown
  difficulties: unknown
  startAt: string | null
  endAt: string | null
  dbLocalPath: string | null
  status: string
}

type StudentRow = {
  sid: number
  build: string
  level: number
  slot: number
  assist: boolean
  skill_order: number
  runid: number
  armor?: string | null
  phase_score?: number | null
  difficulty_level?: string | null
}

type RankingRow = StudentRow & {
  crunid: string
  rank: number
  score: number
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function bossNameFromLabel(label: string) {
  return label.split(':').at(-1)?.trim() || label.trim()
}

function normalizedBossName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function emergingGlobalRaidIds(
  datasets: DatasetRow[],
  overrides: Partial<Record<PlanaRaidType, string | null>>,
) {
  const ids = new Set<string>()

  for (const raidType of PLANA_RAID_TYPES) {
    const override = overrides[raidType]
    if (override) {
      ids.add(override)
      continue
    }

    const latestGlobal = datasets
      .filter((dataset) => dataset.region !== 'JP' && dataset.raidType === raidType)
      .sort((a, b) => b.raidDate.localeCompare(a.raidDate))[0]
    if (!latestGlobal) continue

    const jpAnchor = datasets
      .filter((dataset) => (
        dataset.region === 'JP'
        && dataset.raidType === raidType
        && dataset.internalName === latestGlobal.internalName
        && dataset.raidDate < latestGlobal.raidDate
      ))
      .sort((a, b) => b.raidDate.localeCompare(a.raidDate))[0]
    if (!jpAnchor) continue

    const emerging = datasets
      .filter((dataset) => (
        dataset.region === 'JP'
        && dataset.raidType === raidType
        && dataset.raidDate > jpAnchor.raidDate
      ))
      .sort((a, b) => a.raidDate.localeCompare(b.raidDate))[0]
    if (emerging) ids.add(`${emerging.region}:${emerging.raidType}:${emerging.raidDate}`)
  }

  return ids
}

function isPlanaRaidType(value: string): value is PlanaRaidType {
  return PLANA_RAID_TYPES.includes(value as PlanaRaidType)
}

function safeIdentifier(value: string) {
  if (!/^[A-Za-z_]+$/.test(value)) throw new Error(`Unsupported Plana identifier: ${value}`)
  return `"${value}"`
}

function localDatabasePath(localPath: string | null) {
  if (!localPath) throw new Error('The selected Plana dataset has no local database.')
  const root = path.resolve(PLANA_DATA_ROOT)
  const file = path.resolve(root, ...localPath.split('/'))
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) {
    throw new Error('The selected Plana database is unavailable.')
  }
  return file
}

async function withDuckDb<T>(file: string, query: (connection: DuckDBConnection) => Promise<T>): Promise<T> {
  const previous = queryQueues.get(file) || Promise.resolve()
  const run = previous.catch(() => undefined).then(async () => {
    const instance = await DuckDBInstance.create(file, { access_mode: 'READ_ONLY' })
    const connection = await instance.connect()
    try {
      return await query(connection)
    } finally {
      connection.closeSync()
      instance.closeSync()
    }
  })

  queryQueues.set(file, run)
  try {
    return await run
  } finally {
    if (queryQueues.get(file) === run) queryQueues.delete(file)
  }
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function rowObjects<T>(reader: { getRowObjectsJson(): Record<string, unknown>[] }): T[] {
  return reader.getRowObjectsJson().map((row) => {
    const converted = Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (key === 'crunid') return [key, String(value)]
        if (typeof value === 'string' && /^-?\d+$/.test(value)) return [key, Number(value)]
        return [key, value]
      }),
    )
    return converted as T
  })
}

function difficultyForScore(score: number) {
  if (score >= 48_000_000) return 'Lunatic'
  if (score >= 30_000_000) return 'Torment'
  if (score >= 20_000_000) return 'Insane'
  if (score >= 9_000_000) return 'Extreme'
  if (score >= 4_500_000) return 'Hardcore'
  if (score >= 2_000_000) return 'Very Hard'
  if (score >= 1_000_000) return 'Hard'
  if (score > 0) return 'Normal'
  return 'Not cleared'
}

function difficultyForScoreSql(column: string) {
  return `CASE
    WHEN ${column} >= 48000000 THEN 'Lunatic'
    WHEN ${column} >= 30000000 THEN 'Torment'
    WHEN ${column} >= 20000000 THEN 'Insane'
    WHEN ${column} >= 9000000 THEN 'Extreme'
    WHEN ${column} >= 4500000 THEN 'Hardcore'
    WHEN ${column} >= 2000000 THEN 'Very Hard'
    WHEN ${column} >= 1000000 THEN 'Hard'
    WHEN ${column} > 0 THEN 'Normal'
    ELSE 'Not cleared'
  END`
}

function displayDifficulty(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return value.replaceAll('VeryHard', 'Very Hard')
}

async function studentMap(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id))))
  const students = uniqueIds.length
    ? await prisma.student.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, image: true },
    })
    : []

  return new Map<number, PlanaStudentOption>(
    uniqueIds.map((id) => {
      const student = students.find((item) => item.id === id)
      return [id, {
        id,
        name: student?.name || `Student ${id}`,
        image: student?.image || `https://schaledb.com/images/student/collection/${id}.webp`,
      }]
    }),
  )
}

async function readyDataset(region: string, raidType: string, raidDate: string) {
  if (!isPlanaRaidType(raidType)) throw new Error('Unsupported Plana raid type.')
  if (!/^[A-Z]{2}$/.test(region) || !/^\d{8}$/.test(raidDate)) {
    throw new Error('Invalid Plana raid selection.')
  }

  const dataset = await prisma.planaDataset.findUnique({
    where: { region_raidType_raidDate: { region, raidType, raidDate } },
  })
  if (!dataset || dataset.status !== 'ready') throw new Error('Plana raid data is not available.')
  return dataset as DatasetRow
}

export async function getPlanaRaidCatalog(): Promise<PlanaRaidCatalogItem[]> {
  const [datasets, bosses, importState] = await Promise.all([
    prisma.planaDataset.findMany({
      where: { status: 'ready' },
      orderBy: [{ raidDate: 'desc' }, { region: 'asc' }, { raidType: 'asc' }],
    }),
    prisma.raidBoss.findMany({
      select: { name: true, image: true, color: true, color2: true, pattern: true },
    }),
    prisma.planaImportState.findUnique({
      where: { id: 'plana-stats' },
      select: { emergingTotalRaidId: true, emergingGrandRaidId: true },
    }),
  ])
  const readyDatasets = datasets.filter((dataset) => isPlanaRaidType(dataset.raidType))
  const emergingIds = emergingGlobalRaidIds(readyDatasets as DatasetRow[], {
    'Total Assault': importState?.emergingTotalRaidId,
    'Grand Assault': importState?.emergingGrandRaidId,
  })

  return readyDatasets
    .map((dataset) => {
      const bossName = bossNameFromLabel(dataset.label)
      const normalizedName = normalizedBossName(bossName)
      const boss = bosses.find((item) => {
        const candidate = normalizedBossName(item.name)
        return normalizedName === candidate || normalizedName.endsWith(candidate)
      }) || null
      return {
        id: `${dataset.region}:${dataset.raidType}:${dataset.raidDate}`,
        region: dataset.region,
        raidType: dataset.raidType as PlanaRaidType,
        raidDate: dataset.raidDate,
        season: dataset.season,
        label: dataset.label,
        internalName: dataset.internalName,
        terrain: dataset.terrain === 'Street' ? 'Urban' : dataset.terrain,
        source: dataset.source,
        maxDifficulty: dataset.maxDifficulty,
        armors: stringArray(dataset.armors),
        difficulties: stringArray(dataset.difficulties).map(displayDifficulty),
        startAt: dataset.startAt,
        endAt: dataset.endAt,
        emergingGlobal: emergingIds.has(`${dataset.region}:${dataset.raidType}:${dataset.raidDate}`),
        boss,
      }
    })
}

function studentConditions(filter: PlanaStudentFilter, index: number) {
  const conditions = [`filter_students.sid = $studentId${index}`]
  if (filter.build) {
    const operator = filter.buildComparison === 'lte' ? '<=' : filter.buildComparison === 'gte' ? '>=' : '='
    conditions.push(`CASE CAST(filter_students.build AS VARCHAR)
      WHEN 'one' THEN 1
      WHEN 'two' THEN 2
      WHEN 'three' THEN 3
      WHEN 'four' THEN 4
      WHEN 'five' THEN 5
      WHEN 'UE30' THEN 6
      WHEN 'UE40' THEN 7
      WHEN 'UE50' THEN 8
      WHEN 'UE60' THEN 9
      ELSE 0
    END ${operator} $studentBuildRank${index}`)
  }
  if (filter.usage === 'self') conditions.push('NOT filter_students.assist')
  if (filter.usage === 'assist') conditions.push('filter_students.assist')
  return conditions.join(' AND ')
}

function studentCountComparison(filter: PlanaStudentFilter) {
  if (filter.mode === 'exclude') return '= 0'
  if (filter.usage === 'single') return '= 1'
  if (filter.usage === 'twice') return '= 2'
  return '> 0'
}

function totalStudentFilter(filters: PlanaStudentFilter[]) {
  return filters.map((filter, index) => ` AND (
      SELECT COUNT(*)
      FROM runs filter_runs
      JOIN students filter_students USING (runid)
      WHERE filter_runs.crunid = c.crunid AND ${studentConditions(filter, index)}
    ) ${studentCountComparison(filter)}`).join('')
}

function grandStudentFilter(armors: string[], filters: PlanaStudentFilter[]) {
  return filters.map((filter, index) => {
    const counts = armors.map((armor) => `(
      SELECT COUNT(*)
      FROM ${safeIdentifier(`runs_${armor}`)} filter_runs
      JOIN ${safeIdentifier(`students_${armor}`)} filter_students USING (runid)
      WHERE filter_runs.crunid = c.crunid AND ${studentConditions(filter, index)}
    )`)
    return counts.length ? ` AND (${counts.join(' + ')}) ${studentCountComparison(filter)}` : ''
  }).join('')
}

function rankWhere(
  raidType: PlanaRaidType,
  armors: string[],
  studentFilters: PlanaStudentFilter[],
  formationFilters: PlanaFormationFilter[],
  minRank: number,
  maxRank: number,
) {
  const studentFilter = raidType === 'Total Assault'
    ? totalStudentFilter(studentFilters)
    : grandStudentFilter(armors, studentFilters)
  const formationFilter = raidType === 'Total Assault'
    ? totalFormationFilter(formationFilters)
    : grandFormationFilter(armors, formationFilters)
  return `c.rank >= $minRank AND c.rank <= $maxRank${studentFilter}${formationFilter}`
}

function formationStudentConditions(
  formation: PlanaFormationFilter,
  formationIndex: number,
  studentIndex: number,
) {
  const student = formation.students[studentIndex]
  const conditions = [`formation_students.sid = $formation${formationIndex}Student${studentIndex}`]
  if (formation.strictOrder) conditions.push(`formation_students.slot = ${student.slot}`)
  if (student.borrowed) conditions.push('formation_students.assist')
  if (student.startOrder === 'start') {
    conditions.push('TRY_CAST(formation_students.mulligan AS INTEGER) > 0')
  } else if (student.startOrder !== 'any') {
    conditions.push(
      `TRY_CAST(formation_students.mulligan AS INTEGER) = $formation${formationIndex}Start${studentIndex}`,
    )
  }
  return conditions.join(' AND ')
}

function totalFormationFilter(formations: PlanaFormationFilter[]) {
  return formations.map((formation, formationIndex) => ` AND EXISTS (
    SELECT 1
    FROM runs formation_runs
    WHERE formation_runs.crunid = c.crunid
      ${formation.students.map((_, studentIndex) => `AND EXISTS (
        SELECT 1
        FROM students formation_students
        WHERE formation_students.runid = formation_runs.runid
          AND ${formationStudentConditions(formation, formationIndex, studentIndex)}
      )`).join('\n')}
  )`).join('')
}

function grandFormationFilter(armors: string[], formations: PlanaFormationFilter[]) {
  return formations.map((formation, formationIndex) => {
    const armorMatches = armors.map((armor) => `EXISTS (
      SELECT 1
      FROM ${safeIdentifier(`runs_${armor}`)} formation_runs
      WHERE formation_runs.crunid = c.crunid
        ${formation.students.map((_, studentIndex) => `AND EXISTS (
          SELECT 1
          FROM ${safeIdentifier(`students_${armor}`)} formation_students
          WHERE formation_students.runid = formation_runs.runid
            AND ${formationStudentConditions(formation, formationIndex, studentIndex)}
        )`).join('\n')}
    )`)
    return armorMatches.length ? ` AND (${armorMatches.join(' OR ')})` : ''
  }).join('')
}

function totalRankingSql(where: string, pageSize: number, offset: number) {
  return `
    WITH ranking_page AS (
      SELECT CAST(c.crunid AS VARCHAR) AS crunid, c.point AS score, c.rank
      FROM complete_runs c
      WHERE ${where}
      ORDER BY c.rank
      LIMIT ${pageSize} OFFSET ${offset}
    )
    SELECT
      page.crunid,
      page.score,
      page.rank,
      stats.difficulty_level,
      NULL::VARCHAR AS armor,
      page.score AS phase_score,
      runs.runid,
      students.sid,
      CAST(students.build AS VARCHAR) AS build,
      students.level,
      students.slot,
      students.assist,
      TRY_CAST(students.mulligan AS UTINYINT) AS skill_order
    FROM ranking_page page
    LEFT JOIN difficulty_stats stats ON page.rank BETWEEN stats.start_rank AND stats.end_rank
    LEFT JOIN runs ON CAST(runs.crunid AS VARCHAR) = page.crunid
    LEFT JOIN students USING (runid)
    ORDER BY page.rank, runs.runid, students.slot
  `
}

function grandRankingSql(armors: string[], where: string, pageSize: number, offset: number) {
  const pointColumns = armors
    .map((armor) => `c.${safeIdentifier(`${armor}_point`)} AS ${safeIdentifier(`${armor}_point`)}`)
    .join(', ')
  const selects = armors.map((armor) => `
    SELECT
      page.crunid,
      page.score,
      page.rank,
      NULL::VARCHAR AS difficulty_level,
      '${armor}' AS armor,
      page.${safeIdentifier(`${armor}_point`)} AS phase_score,
      runs.runid,
      students.sid,
      CAST(students.build AS VARCHAR) AS build,
      students.level,
      students.slot,
      students.assist,
      TRY_CAST(students.mulligan AS UTINYINT) AS skill_order
    FROM ranking_page page
    LEFT JOIN ${safeIdentifier(`runs_${armor}`)} runs ON CAST(runs.crunid AS VARCHAR) = page.crunid
    LEFT JOIN ${safeIdentifier(`students_${armor}`)} students USING (runid)
  `)

  return `
    WITH ranking_page AS (
      SELECT CAST(c.crunid AS VARCHAR) AS crunid, c.point AS score, c.rank, ${pointColumns}
      FROM complete_runs c
      WHERE ${where}
      ORDER BY c.rank
      LIMIT ${pageSize} OFFSET ${offset}
    )
    ${selects.join(' UNION ALL ')}
    ORDER BY rank, armor, runid, slot
  `
}

function groupRankings(rows: RankingRow[], students: Map<number, PlanaStudentOption>) {
  const rankings = new Map<string, PlanaRanking>()
  const phases = new Map<string, PlanaRankingPhase>()
  const teams = new Map<string, PlanaTeam>()

  rows.forEach((row) => {
    let ranking = rankings.get(row.crunid)
    if (!ranking) {
      ranking = {
        clearId: row.crunid,
        rank: numberValue(row.rank),
        score: numberValue(row.score),
        difficulty: displayDifficulty(row.difficulty_level) || difficultyForScore(numberValue(row.score)),
        phases: [],
      }
      rankings.set(row.crunid, ranking)
    }

    const armor = row.armor || null
    const phaseKey = `${row.crunid}:${armor || 'total'}`
    let phase = phases.get(phaseKey)
    if (!phase) {
      const phaseScore = numberValue(row.phase_score ?? row.score)
      phase = {
        armor,
        score: phaseScore,
        difficulty: armor ? difficultyForScore(phaseScore) : displayDifficulty(row.difficulty_level),
        teams: [],
      }
      phases.set(phaseKey, phase)
      ranking.phases.push(phase)
    }

    if (!Number.isInteger(row.runid) || !Number.isInteger(row.sid)) return
    const teamKey = `${phaseKey}:${row.runid}`
    let team = teams.get(teamKey)
    if (!team) {
      team = { runId: row.runid, students: [] }
      teams.set(teamKey, team)
      phase.teams.push(team)
    }

    const student = students.get(row.sid) || {
      id: row.sid,
      name: `Student ${row.sid}`,
      image: `https://schaledb.com/images/student/collection/${row.sid}.webp`,
    }
    team.students.push({
      ...student,
      build: row.build,
      level: numberValue(row.level),
      slot: numberValue(row.slot),
      assist: Boolean(row.assist),
      skillOrder: numberValue(row.skill_order),
    })
  })

  return Array.from(rankings.values()).sort((a, b) => a.rank - b.rank)
}

export async function getPlanaRankings(input: {
  region: string
  raidType: string
  raidDate: string
  page?: number
  pageSize?: number
  studentFilters?: PlanaStudentFilter[]
  formationFilters?: PlanaFormationFilter[]
  minRank?: number
  maxRank?: number
}): Promise<PlanaRankingsPage> {
  const dataset = await readyDataset(input.region, input.raidType, input.raidDate)
  const raidType = dataset.raidType as PlanaRaidType
  const armors = stringArray(dataset.armors)
  const page = Math.max(1, Math.floor(input.page || 1))
  const pageSize = Math.min(25, Math.max(5, Math.floor(input.pageSize || 10)))
  const filtered = rankingQueryFilters(input, raidType, armors)
  const { where, values } = filtered
  const offset = (page - 1) * pageSize
  const file = localDatabasePath(dataset.dbLocalPath)

  const queried = await withDuckDb(file, async (connection) => {
    const countReader = await connection.runAndReadAll(
      `SELECT COUNT(*) AS total FROM complete_runs c WHERE ${where}`,
      values,
    )
    const total = numberValue(rowObjects<{ total: number }>(countReader)[0]?.total)
    const sql = raidType === 'Total Assault'
      ? totalRankingSql(where, pageSize, offset)
      : grandRankingSql(armors, where, pageSize, offset)
    const rankingReader = await connection.runAndReadAll(sql, values)
    return { total, rows: rowObjects<RankingRow>(rankingReader) }
  })

  const students = await studentMap(queried.rows.map((row) => row.sid))
  return {
    total: queried.total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(queried.total / pageSize)),
    rankings: groupRankings(queried.rows, students),
  }
}

function rankingQueryFilters(
  input: {
    studentFilters?: PlanaStudentFilter[]
    formationFilters?: PlanaFormationFilter[]
    minRank?: number
    maxRank?: number
  },
  raidType: PlanaRaidType,
  armors: string[],
) {
  const minRank = Math.max(1, Math.floor(input.minRank || 1))
  const maxRank = Math.max(minRank, Math.floor(input.maxRank || 10_000_000))
  const studentFilters = (input.studentFilters || [])
    .filter((filter) => Number.isInteger(filter.id) && filter.id > 0)
    .slice(0, 12)
  const formationFilters = (input.formationFilters || [])
    .filter((formation) => formation.students.length > 0)
    .slice(0, 100)
  const where = rankWhere(raidType, armors, studentFilters, formationFilters, minRank, maxRank)
  const buildRanks = new Map([
    ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
    ['UE30', 6], ['UE40', 7], ['UE50', 8], ['UE60', 9],
  ])
  const values: Record<string, number | string> = { minRank, maxRank }
  studentFilters.forEach((filter, index) => {
    values[`studentId${index}`] = filter.id
    if (filter.build) values[`studentBuildRank${index}`] = buildRanks.get(filter.build) || 0
  })
  formationFilters.forEach((formation, formationIndex) => {
    formation.students.forEach((student, studentIndex) => {
      values[`formation${formationIndex}Student${studentIndex}`] = student.id
      if (/^[1-5]$/.test(student.startOrder)) {
        values[`formation${formationIndex}Start${studentIndex}`] = Number(student.startOrder)
      }
    })
  })
  return { where, values }
}

function filteredTotalUsageSql(where: string, pageSize: number, offset: number) {
  const teams = `
    WITH filtered_clears AS (
      SELECT CAST(c.crunid AS VARCHAR) AS crunid
      FROM complete_runs c
      WHERE ${where}
    ),
    teams AS (
      SELECT list(students.sid ORDER BY students.slot) AS student_ids
      FROM runs
      JOIN students USING (runid)
      JOIN filtered_clears ON CAST(runs.crunid AS VARCHAR) = filtered_clears.crunid
      GROUP BY runs.runid
    )
  `
  return {
    count: `${teams} SELECT COUNT(*) AS total FROM (SELECT student_ids FROM teams GROUP BY student_ids)`,
    page: `${teams}
      SELECT NULL::VARCHAR AS armor, student_ids, COUNT(*) AS uses
      FROM teams
      GROUP BY student_ids
      ORDER BY uses DESC, student_ids
      LIMIT ${pageSize} OFFSET ${offset}`,
  }
}

function filteredGrandUsageSql(
  armors: string[],
  armorFilter: string,
  where: string,
  pageSize: number,
  offset: number,
) {
  const visibleArmors = armorFilter ? armors.filter((armor) => armor === armorFilter) : armors
  const unions = visibleArmors.map((armor) => `
    SELECT
      '${armor}' AS armor,
      list(students.sid ORDER BY students.slot) AS student_ids
    FROM ${safeIdentifier(`students_${armor}`)} students
    JOIN ${safeIdentifier(`runs_${armor}`)} runs USING (runid)
    JOIN filtered_clears ON CAST(runs.crunid AS VARCHAR) = filtered_clears.crunid
    GROUP BY runs.runid
  `)
  const teams = `
    WITH filtered_clears AS (
      SELECT CAST(c.crunid AS VARCHAR) AS crunid
      FROM complete_runs c
      WHERE ${where}
    ),
    teams AS (${unions.join(' UNION ALL ')})
  `
  return {
    count: `${teams} SELECT COUNT(*) AS total FROM (
      SELECT armor, student_ids FROM teams GROUP BY armor, student_ids
    )`,
    page: `${teams}
      SELECT armor, student_ids, COUNT(*) AS uses
      FROM teams
      GROUP BY armor, student_ids
      ORDER BY uses DESC, armor, student_ids
      LIMIT ${pageSize} OFFSET ${offset}`,
  }
}

export async function getPlanaUsedTeams(input: {
  region: string
  raidType: string
  raidDate: string
  page?: number
  pageSize?: number
  studentFilters?: PlanaStudentFilter[]
  formationFilters?: PlanaFormationFilter[]
  minRank?: number
  maxRank?: number
  armor?: string
}): Promise<PlanaUsedTeamsPage> {
  const dataset = await readyDataset(input.region, input.raidType, input.raidDate)
  const raidType = dataset.raidType as PlanaRaidType
  const armors = stringArray(dataset.armors)
  const armor = raidType === 'Grand Assault' && armors.includes(input.armor || '') ? input.armor || '' : ''
  const page = Math.max(1, Math.floor(input.page || 1))
  const pageSize = Math.min(25, Math.max(5, Math.floor(input.pageSize || 10)))
  const { where, values } = rankingQueryFilters(input, raidType, armors)
  const offset = (page - 1) * pageSize
  const sql = raidType === 'Total Assault'
    ? filteredTotalUsageSql(where, pageSize, offset)
    : filteredGrandUsageSql(armors, armor, where, pageSize, offset)
  const file = localDatabasePath(dataset.dbLocalPath)
  const queried = await withDuckDb(file, async (connection) => {
    const countReader = await connection.runAndReadAll(sql.count, values)
    const pageReader = await connection.runAndReadAll(sql.page, values)
    return {
      total: numberValue(rowObjects<{ total: number }>(countReader)[0]?.total),
      rows: rowObjects<{ armor: string | null; student_ids: number[]; uses: number }>(pageReader),
    }
  })
  const students = await studentMap(queried.rows.flatMap((row) => row.student_ids))
  return {
    total: queried.total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(queried.total / pageSize)),
    teams: queried.rows.map((row) => ({
      armor: row.armor,
      uses: numberValue(row.uses),
      students: row.student_ids.map((id) => students.get(id)!).filter(Boolean),
    })),
  }
}

function totalUsageSql() {
  return `
    WITH teams AS (
      SELECT runs.runid, list(students.sid ORDER BY students.slot) AS student_ids
      FROM runs
      JOIN students USING (runid)
      GROUP BY runs.runid
    )
    SELECT NULL::VARCHAR AS armor, student_ids, COUNT(*) AS uses
    FROM teams
    GROUP BY student_ids
    ORDER BY uses DESC
    LIMIT 12
  `
}

function grandUsageSql(armors: string[]) {
  const unions = armors.map((armor) => `
    SELECT
      '${armor}' AS armor,
      runs.runid,
      list(students.sid ORDER BY students.slot) AS student_ids
    FROM ${safeIdentifier(`students_${armor}`)} students
    JOIN ${safeIdentifier(`runs_${armor}`)} runs USING (runid)
    GROUP BY runs.runid
  `)
  return `
    WITH teams AS (${unions.join(' UNION ALL ')})
    SELECT armor, student_ids, COUNT(*) AS uses
    FROM teams
    GROUP BY armor, student_ids
    ORDER BY uses DESC
    LIMIT 18
  `
}

export async function getPlanaRaidMeta(input: {
  region: string
  raidType: string
  raidDate: string
}): Promise<PlanaRaidMeta> {
  const dataset = await readyDataset(input.region, input.raidType, input.raidDate)
  const raidType = dataset.raidType as PlanaRaidType
  const armors = stringArray(dataset.armors)
  const file = localDatabasePath(dataset.dbLocalPath)

  const queried = await withDuckDb(file, async (connection) => {
    const totalReader = await connection.runAndReadAll(
      'SELECT COUNT(*) AS total, MAX(rank) AS max_rank FROM complete_runs',
    )
    const totals = rowObjects<{ total: number; max_rank: number }>(totalReader)[0]
    const totalRankings = numberValue(totals?.total)
    const maxRank = numberValue(totals?.max_rank)
    const difficultyReader = raidType === 'Total Assault'
      ? await connection.runAndReadAll(`
        SELECT
          difficulty_level AS label,
          run_count AS count,
          start_rank AS min_rank,
          end_rank AS max_rank,
          min_point AS min_score,
          max_point AS max_score
        FROM difficulty_stats
        ORDER BY start_rank
      `)
      : await connection.runAndReadAll(`
        SELECT
          concat_ws(' / ', ${armors.map((armor) => (
            difficultyForScoreSql(`c.${safeIdentifier(`${armor}_point`)}`)
          )).join(', ')}) AS label,
          COUNT(*) AS count,
          MIN(c.rank) AS min_rank,
          MAX(c.rank) AS max_rank,
          MIN(c.point) AS min_score,
          MAX(c.point) AS max_score
        FROM complete_runs c
        GROUP BY label
        ORDER BY min_rank
      `)
    const studentReader = raidType === 'Total Assault'
      ? await connection.runAndReadAll(`
        SELECT sid, CAST(build AS VARCHAR) AS build
        FROM students
        GROUP BY sid, build
        ORDER BY sid, build
      `)
      : await connection.runAndReadAll(`
        SELECT sid, build
        FROM (${armors.map((armor) => `
          SELECT sid, CAST(build AS VARCHAR) AS build
          FROM ${safeIdentifier(`students_${armor}`)}
        `).join(' UNION ALL ')})
        GROUP BY sid, build
        ORDER BY sid, build
      `)
    const usageReader = await connection.runAndReadAll(
      raidType === 'Total Assault' ? totalUsageSql() : grandUsageSql(armors),
    )

    return {
      totalRankings,
      maxRank,
      difficultyStats: rowObjects<{
        label: string
        count: number
        min_rank: number | null
        max_rank: number | null
        min_score: number
        max_score: number
      }>(difficultyReader),
      studentBuilds: rowObjects<{ sid: number; build: string }>(studentReader),
      usage: rowObjects<{ armor: string | null; student_ids: number[]; uses: number }>(usageReader),
    }
  })

  const students = await studentMap([
    ...queried.studentBuilds.map((row) => row.sid),
    ...queried.usage.flatMap((row) => row.student_ids),
  ])
  return {
    totalRankings: queried.totalRankings,
    maxRank: queried.maxRank,
    difficultyStats: queried.difficultyStats.map((stat) => ({
      label: displayDifficulty(stat.label),
      count: numberValue(stat.count),
      minScore: numberValue(stat.min_score),
      maxScore: numberValue(stat.max_score),
      minRank: stat.min_rank === null ? null : numberValue(stat.min_rank),
      maxRank: stat.max_rank === null ? null : numberValue(stat.max_rank),
    })),
    students: Array.from(new Set(queried.studentBuilds.map((row) => row.sid)))
      .map((id) => students.get(id)!)
      .filter(Boolean)
      .map((student) => ({
        ...student,
        builds: Array.from(new Set(
          queried.studentBuilds
            .filter((row) => row.sid === student.id)
            .map((row) => row.build),
        )),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    mostUsedTeams: queried.usage.map((row) => ({
      armor: row.armor,
      uses: numberValue(row.uses),
      students: row.student_ids.map((id) => students.get(id)!).filter(Boolean),
    })),
  }
}
