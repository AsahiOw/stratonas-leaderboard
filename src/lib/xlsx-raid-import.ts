import Anthropic from '@anthropic-ai/sdk'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { resolveClub } from '@/lib/clubs'
import { resolveRaidServer, resolveRaidTerrain, resolveRaidType } from '@/lib/raid-lookups'
import { buildStudentLookupFromRecords, resolveStudentFromLookup, type StudentLookup } from '@/lib/student-name-matcher'

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
  pfpUrl?: string
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

function extractImageUrl(cell: ExcelJS.Cell): string {
  const val = cell.value
  if (typeof val === 'object' && val !== null && 'formula' in val) {
    const formula = (val as { formula: string }).formula
    const match = formula.match(/IMAGE\("([^"]+)"/i)
    return match?.[1] ?? ''
  }
  const str = stringValue(val)
  const match = str.match(/IMAGE\("([^"]+)"/i)
  return match?.[1] ?? ''
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

async function identifyStudentFromPfp(pfpUrl: string, studentNames: string[]): Promise<string> {
  console.log(`[PFP] Fetching image: ${pfpUrl}`)
  let res: Response
  try {
    res = await fetch(pfpUrl)
  } catch (err) {
    console.log(`[PFP] Fetch failed: ${err}`)
    return ''
  }
  if (!res.ok) {
    console.log(`[PFP] HTTP ${res.status} for ${pfpUrl}`)
    return ''
  }

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const bytes = new Uint8Array(buffer)
  let contentType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) contentType = 'image/png'
  else if (bytes[0] === 0x47 && bytes[1] === 0x49) contentType = 'image/gif'
  else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) contentType = 'image/webp'
  console.log(`[PFP] Detected content type: ${contentType}, size: ${buffer.byteLength} bytes`)

  const client = new Anthropic()
  const nameList = studentNames.join('\n')
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: contentType, data: base64 } },
        { type: 'text', text: `This is a Blue Archive student profile picture. Which student from the list below does this image show? Reply with only the exact name from the list, nothing else.\n\n${nameList}` },
      ],
    }],
  })
  const textBlock = message.content.find(c => c.type === 'text')
  const identified = textBlock?.type === 'text' ? textBlock.text.trim() : ''
  console.log(`[PFP] Claude identified: "${identified}"`)
  return identified
}

async function resolveFavoriteStudent(
  raw: string,
  studentLookup: StudentLookup,
  options: { pfpUrl?: string; allowImageFallback?: boolean } = {},
) {
  let student = resolveStudentFromLookup(raw, studentLookup)
  if (!student && options.allowImageFallback && options.pfpUrl) {
    console.log(`[PFP] Name lookup failed for "${raw}", trying image match...`)
    const identified = await identifyStudentFromPfp(options.pfpUrl, studentLookup.students.map((record) => record.name))
    if (identified) {
      student = resolveStudentFromLookup(identified, studentLookup)
      console.log(`[PFP] DB match after image: ${student ? `"${student.name}" (id ${student.id})` : 'none'}`)
    }
  }

  if (!student) return { favouriteStudent: raw || '', favouriteStudentId: null as number | null }
  return { favouriteStudent: student.name, favouriteStudentId: student.id }
}

async function buildStudentLookup() {
  const students = await prisma.student.findMany({ select: { id: true, name: true } })
  return buildStudentLookupFromRecords(students)
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
  return map as Map<RequiredColumn | 'PFP', number>
}

function readImportRows(sheet: ExcelJS.Worksheet) {
  const columns = columnMap(sheet)
  const pfpCol = columns.get('PFP')
  const rows: Array<{ rowNumber: number; row: ImportRow | null; reason?: string }> = []

  sheet.eachRow((worksheetRow, rowNumber) => {
    if (rowNumber === 1) return
    const rank = numberValue(worksheetRow.getCell(columns.get('Rank')!).value)
    if (!rank || rank > 50) return

    const row: ImportRow = {
      userID: stringValue(worksheetRow.getCell(columns.get('UserId')!).value),
      username: stringValue(worksheetRow.getCell(columns.get('Username')!).value),
      ign: stringValue(worksheetRow.getCell(columns.get('IGN')!).value),
      score: Math.round(numberValue(worksheetRow.getCell(columns.get('Score')!).value)),
      club: stringValue(worksheetRow.getCell(columns.get('Club')!).value),
      rank,
      favouriteStudent: stringValue(worksheetRow.getCell(columns.get('FavoriteStudent')!).value),
      pfpUrl: pfpCol ? extractImageUrl(worksheetRow.getCell(pfpCol)) : undefined,
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
    const player = await findPlayer(row)
    const clubBefore = row.club
      ? await prisma.club.findFirst({ where: { name: { equals: row.club, mode: 'insensitive' } } })
      : null
    const club = await resolveClub(row.club)
    if (club && !seenClubs.has(club.id)) {
      if (clubBefore) clubsReused += 1
      else clubsCreated += 1
      seenClubs.add(club.id)
    }

    const favorite = await resolveFavoriteStudent(row.favouriteStudent, studentLookup, {
      pfpUrl: row.pfpUrl,
      allowImageFallback: !player,
    })
    if (row.favouriteStudent && !favorite.favouriteStudentId) unmatchedFavoriteStudents.add(row.favouriteStudent)

    const favouriteStudent = favorite.favouriteStudentId
      ? favorite.favouriteStudent
      : player
        ? player.favouriteStudent
        : favorite.favouriteStudent || row.favouriteStudent || null
    const favouriteStudentId = favorite.favouriteStudentId
      ? favorite.favouriteStudentId
      : player
        ? player.favouriteStudentId
        : null

    const playerData = {
      ign: row.ign,
      username: row.username,
      userID: row.userID || null,
      favouriteStudent,
      favouriteStudentId,
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
