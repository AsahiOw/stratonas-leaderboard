import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { resolveClub } from '@/lib/clubs'
import { resolveRaidServer, resolveRaidTerrain, resolveRaidType } from '@/lib/raid-lookups'

type ParsedRaidTitle = {
  type: string
  season: number
  bossName: string
  terrainName: string
}

type RequiredColumn = 'UserId' | 'Username' | 'IGN' | 'Score' | 'Club' | 'Rank' | 'FavoriteStudent'

type ImportRow = {
  userID: string
  username: string
  ign: string
  score: number
  club: string
  rank: number
  favouriteStudent: string
}

type StudentRecord = { id: number; name: string }

type StudentLookup = {
  aliases: Map<string, StudentRecord>
  variantsByBase: Map<string, StudentRecord[]>
}

export type XlsxRaidImportResult = {
  raid: {
    id: string
    title: string
    created: boolean
  }
  rowsRead: number
  rowsImported: number
  playersCreated: number
  playersUpdated: number
  clubsCreated: number
  clubsReused: number
  entriesCreated: number
  entriesUpdated: number
  skippedRows: Array<{ row: number; reason: string }>
  unmatchedFavoriteStudents: string[]
}

const REQUIRED_COLUMNS: RequiredColumn[] = ['UserId', 'Username', 'IGN', 'Score', 'Club', 'Rank', 'FavoriteStudent']
const TERRAIN_NAMES = ['Urban', 'Indoor', 'Outdoor']

const VARIANT_PREFIXES: Record<string, string[]> = {
  Swimsuit: ['S'],
  Maid: ['M'],
  'New Year': ['NY'],
  HotSpring: ['HS'],
  'Hot Spring': ['HS'],
  Dress: ['D'],
  Band: ['B'],
  Bunny: ['B'],
  Casual: ['C'],
  'Cheer Squad': ['C'],
  'Pop Idol': ['I'],
  Pajamas: ['P'],
  Magical: ['M'],
  School: ['U'],
  Track: ['T'],
  Camp: ['C'],
  Idol: ['I'],
  Pajama: ['P'],
  Uniform: ['U'],
}

const MANUAL_STUDENT_ALIASES: Record<string, string> = {
  'b hoshino': 'Hoshino (Swimsuit)',
  'c sena': 'Sena (Casual)',
  'i sakurako': 'Sakurako (Pop Idol)',
  kuroko: 'Shiroko*Terror',
  'm reisa': 'Reisa (Magical)',
  miku: 'Hatsune Miku',
  'p noa': 'Noa (Pajamas)',
  'p yuuka': 'Yuuka (Pajamas)',
  'u akane': 'Akane (School)',
}

const MANUAL_RAID_BOSS_ALIASES: Record<string, string> = {
  kaiten: 'KAITEN FX Mk.0',
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') return value.text.trim()
  if (typeof value === 'object' && 'result' in value) return stringValue(value.result)
  return String(value).trim()
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') return value
  const parsed = Number(stringValue(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseRaidTitleFromFilename(filename: string): ParsedRaidTitle {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/\s*\(copy\)\s*$/i, '')
    .trim()
  const match = base.match(/^(.+?)\s+S(\d+)[\s:_-]+(.+)$/i)
  if (!match) {
    throw new Error('Filename must look like "Total Assault S81_ Kurokage Urban.xlsx".')
  }
  const raidName = match[3].trim()
  const terrainMatch = raidName.match(new RegExp(`\\s(${TERRAIN_NAMES.join('|')})(?:\\s*\\([^)]*\\))*$`, 'i'))
  const terrain = TERRAIN_NAMES.find((name) => name.toLowerCase() === terrainMatch?.[1]?.toLowerCase())
  if (!terrain || !terrainMatch) {
    throw new Error(`Filename raid name must end with terrain: ${TERRAIN_NAMES.join(', ')}.`)
  }
  const bossName = raidName.slice(0, terrainMatch.index).trim()
  if (!bossName) {
    throw new Error('Filename must include a raid boss before the terrain.')
  }

  return {
    type: match[1].trim(),
    season: Number(match[2]),
    bossName,
    terrainName: terrain,
  }
}

export function normalizeStudentLookup(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeRaidBossLookup(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

async function resolveRaidBossByName(name: string) {
  const alias = MANUAL_RAID_BOSS_ALIASES[normalizeRaidBossLookup(name)]
  if (alias) return resolveRaidBossByName(alias)

  const exact = await prisma.raidBoss.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (exact) return exact

  const normalizedName = normalizeRaidBossLookup(name)
  if (!normalizedName) return null

  const bosses = await prisma.raidBoss.findMany()
  return bosses.find((boss) => normalizeRaidBossLookup(boss.name) === normalizedName) || null
}

function studentVariant(name: string) {
  const variantMatch = name.match(/^(.+?)\s*\((.+)\)$/)
  if (!variantMatch) return null
  return {
    base: variantMatch[1].trim(),
    variant: variantMatch[2].trim(),
  }
}

function variantPrefixes(variant: string): string[] {
  const configured = VARIANT_PREFIXES[variant] || []
  const normalized = normalizeStudentLookup(variant)
  const words = normalized.split(' ').filter(Boolean)
  const firstWordInitial = words[0]?.slice(0, 1).toUpperCase()
  const acronym = words.map((word) => word[0]).join('').toUpperCase()

  return Array.from(new Set([
    ...configured,
    firstWordInitial,
    acronym,
  ].filter((prefix): prefix is string => Boolean(prefix))))
}

function studentAliases(name: string): string[] {
  const aliases = new Set([name])
  const variantData = studentVariant(name)
  if (variantData) {
    variantPrefixes(variantData.variant).forEach((prefix) => {
      const base = variantData.base
      aliases.add(`${prefix} ${base}`)
      aliases.add(`${prefix}.${base}`)
    })
  }
  return Array.from(aliases)
}

function findPrefixedVariant(normalized: string, studentLookup: StudentLookup) {
  const match = normalized.match(/^([a-z]{1,3})\s+(.+)$/)
  if (!match) return null

  const prefix = match[1].toUpperCase()
  const base = match[2]
  const variants = studentLookup.variantsByBase.get(base) || []
  if (variants.length === 0) return null

  const matchingVariants = variants.filter((student) => {
    const variantData = studentVariant(student.name)
    return variantData ? variantPrefixes(variantData.variant).includes(prefix) : false
  })
  if (matchingVariants.length === 1) return matchingVariants[0]

  // If there is only one variant for that base, prefer it over the plain base
  // because the imported value carried a prefix.
  if (matchingVariants.length === 0 && variants.length === 1) return variants[0]
  return null
}

async function resolveFavoriteStudent(raw: string, studentLookup: StudentLookup) {
  const normalized = normalizeStudentLookup(raw)
  if (!normalized) return { favouriteStudent: '', favouriteStudentId: null as number | null }
  const manualAlias = MANUAL_STUDENT_ALIASES[normalized]
  const student = (manualAlias ? studentLookup.aliases.get(normalizeStudentLookup(manualAlias)) : null)
    || studentLookup.aliases.get(normalized)
    || findPrefixedVariant(normalized, studentLookup)
  if (!student) return { favouriteStudent: raw, favouriteStudentId: null as number | null }
  return { favouriteStudent: student.name, favouriteStudentId: student.id }
}

async function buildStudentLookup() {
  const students = await prisma.student.findMany({ select: { id: true, name: true } })
  const aliases = new Map<string, StudentRecord>()
  const variantsByBase = new Map<string, StudentRecord[]>()
  students.forEach((student) => {
    studentAliases(student.name).forEach((alias) => {
      aliases.set(normalizeStudentLookup(alias), student)
    })
    const variantData = studentVariant(student.name)
    if (!variantData) return
    const normalizedBase = normalizeStudentLookup(variantData.base)
    const variants = variantsByBase.get(normalizedBase) || []
    variants.push(student)
    variantsByBase.set(normalizedBase, variants)
  })
  return { aliases, variantsByBase }
}

function columnMap(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1)
  const map = new Map<string, number>()
  header.eachCell((cell, colNumber) => {
    const key = stringValue(cell.value)
    if (key) map.set(key, colNumber)
  })

  const missing = REQUIRED_COLUMNS.filter((column) => !map.has(column))
  if (missing.length > 0) {
    throw new Error(`Members sheet is missing columns: ${missing.join(', ')}`)
  }
  return map as Map<RequiredColumn, number>
}

function readImportRows(sheet: ExcelJS.Worksheet) {
  const columns = columnMap(sheet)
  const rows: Array<{ rowNumber: number; row: ImportRow | null; reason?: string }> = []

  sheet.eachRow((worksheetRow, rowNumber) => {
    if (rowNumber === 1) return
    const rank = numberValue(worksheetRow.getCell(columns.get('Rank')!).value)
    if (!rank || rank > 50) return

    const row = {
      userID: stringValue(worksheetRow.getCell(columns.get('UserId')!).value),
      username: stringValue(worksheetRow.getCell(columns.get('Username')!).value),
      ign: stringValue(worksheetRow.getCell(columns.get('IGN')!).value),
      score: Math.round(numberValue(worksheetRow.getCell(columns.get('Score')!).value)),
      club: stringValue(worksheetRow.getCell(columns.get('Club')!).value),
      rank,
      favouriteStudent: stringValue(worksheetRow.getCell(columns.get('FavoriteStudent')!).value),
    }

    if (!row.userID && !row.username && !row.ign) {
      rows.push({ rowNumber, row: null, reason: 'Missing player identity.' })
      return
    }
    if (!row.username || !row.ign) {
      rows.push({ rowNumber, row: null, reason: 'Missing username or IGN.' })
      return
    }

    rows.push({ rowNumber, row })
  })

  return rows
}

async function findPlayer(row: ImportRow) {
  if (row.userID) {
    const byUserId = await prisma.player.findUnique({ where: { userID: row.userID } })
    if (byUserId) return byUserId
  }
  const byUsername = await prisma.player.findUnique({ where: { username: row.username } }).catch(() => null)
  if (byUsername) return byUsername
  return prisma.player.findUnique({ where: { ign: row.ign } }).catch(() => null)
}

export async function importRaidXlsx(options: {
  buffer: ArrayBuffer
  filename: string
  server: string
  startDate: string
  endDate: string
}): Promise<XlsxRaidImportResult> {
  const parsed = parseRaidTitleFromFilename(options.filename)
  const workbook = new ExcelJS.Workbook()
  await (workbook.xlsx as { load: (buffer: unknown) => Promise<ExcelJS.Workbook> }).load(options.buffer)

  const members = workbook.getWorksheet('Members')
  if (!members) throw new Error('Workbook must contain a Members sheet.')

  const type = await resolveRaidType(parsed.type)
  const server = await resolveRaidServer(options.server)
  const terrain = await resolveRaidTerrain(parsed.terrainName)
  if (!type || !server || !terrain) throw new Error('Raid type, server, and terrain are required.')

  const boss = await resolveRaidBossByName(parsed.bossName)
  if (!boss) throw new Error(`Raid boss "${parsed.bossName}" does not exist. Import raid bosses first or add it in Bosses.`)

  const existingRaid = await prisma.raid.findFirst({
    where: {
      raidBossId: boss.id,
      typeId: type.id,
      serverId: server.id,
      terrainId: terrain.id,
      season: parsed.season,
    },
  })

  const raid = existingRaid || await prisma.raid.create({
    data: {
      raidBossId: boss.id,
      typeId: type.id,
      serverId: server.id,
      terrainId: terrain.id,
      season: parsed.season,
      color: boss.color,
      color2: boss.color2,
      pattern: boss.pattern,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
    },
  })

  if (existingRaid) {
    await prisma.raid.update({
      where: { id: existingRaid.id },
      data: {
        startDate: new Date(options.startDate),
        endDate: new Date(options.endDate),
        terrainId: terrain.id,
      },
    })
  }

  const rows = readImportRows(members)
  const studentLookup = await buildStudentLookup()
  const skippedRows: XlsxRaidImportResult['skippedRows'] = []
  const unmatchedFavoriteStudents = new Set<string>()
  const seenClubs = new Set<string>()
  let playersCreated = 0
  let playersUpdated = 0
  let clubsCreated = 0
  let clubsReused = 0
  let entriesCreated = 0
  let entriesUpdated = 0
  let rowsImported = 0

  for (const importRow of rows) {
    if (!importRow.row) {
      skippedRows.push({ row: importRow.rowNumber, reason: importRow.reason || 'Skipped row.' })
      continue
    }

    const row = importRow.row
    const clubBefore = row.club
      ? await prisma.club.findFirst({ where: { name: { equals: row.club, mode: 'insensitive' } } })
      : null
    const club = await resolveClub(row.club)
    if (club && !seenClubs.has(club.id)) {
      if (clubBefore) clubsReused += 1
      else clubsCreated += 1
      seenClubs.add(club.id)
    }

    const favorite = await resolveFavoriteStudent(row.favouriteStudent, studentLookup)
    if (row.favouriteStudent && !favorite.favouriteStudentId) unmatchedFavoriteStudents.add(row.favouriteStudent)

    const player = await findPlayer(row)
    const playerData = {
      ign: row.ign,
      username: row.username,
      userID: row.userID || null,
      favouriteStudent: favorite.favouriteStudent || row.favouriteStudent || null,
      favouriteStudentId: favorite.favouriteStudentId,
      club: club?.name || row.club || 'Guest',
      clubID: null,
      clubId: club?.id || null,
      isGuildMember: Boolean(club),
    }

    const savedPlayer = player
      ? await prisma.player.update({ where: { id: player.id }, data: playerData })
      : await prisma.player.create({ data: playerData })

    if (player) playersUpdated += 1
    else playersCreated += 1

    const existingEntry = await prisma.raidEntry.findUnique({
      where: { playerId_raidId: { playerId: savedPlayer.id, raidId: raid.id } },
    })
    await prisma.raidEntry.upsert({
      where: { playerId_raidId: { playerId: savedPlayer.id, raidId: raid.id } },
      update: { score: row.score },
      create: { playerId: savedPlayer.id, raidId: raid.id, score: row.score },
    })

    if (existingEntry) entriesUpdated += 1
    else entriesCreated += 1
    rowsImported += 1
  }

  return {
    raid: {
      id: raid.id,
      title: `${parsed.type} S${parsed.season}: ${boss.name} (${parsed.terrainName})`,
      created: !existingRaid,
    },
    rowsRead: rows.length,
    rowsImported,
    playersCreated,
    playersUpdated,
    clubsCreated,
    clubsReused,
    entriesCreated,
    entriesUpdated,
    skippedRows,
    unmatchedFavoriteStudents: Array.from(unmatchedFavoriteStudents).sort(),
  }
}
