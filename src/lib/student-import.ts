import fs from 'fs/promises'
import path from 'path'
import { invalidatePublicData } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import {
  normalizeOptionalStudentText,
  normalizeStudentBirthDay,
  normalizeStudentName,
  studentImageUrl,
  studentPortraitUrl,
} from '@/lib/students'

export const STUDENT_IMPORT_ID = 'schaledb-students'
const SCHALE_STUDENTS_URL = 'https://schaledb.com/data/en/students.min.json'
const MEMORIAL_LOBBY_VIDEOS_DIR = path.join(process.cwd(), 'Development_data', 'lobbies')
const OPTIMIZED_MEMORIAL_LOBBY_VIDEOS_DIR = path.join(process.cwd(), 'Development_data', 'lobbies-optimized')
const BATCH_SIZE = 50

type SchaleStudent = {
  Id?: unknown
  Name?: unknown
  FamilyName?: unknown
  PersonalName?: unknown
  School?: unknown
  Club?: unknown
  SchoolYear?: unknown
  CharacterAge?: unknown
  CharacterVoice?: unknown
  Birthday?: unknown
  BirthDay?: unknown
  Hobby?: unknown
  CharHeightMetric?: unknown
  WeaponType?: unknown
  TacticRole?: unknown
  Position?: unknown
  Weapon?: { Name?: unknown } | null
}

export function defaultStudentImportState() {
  return {
    id: STUDENT_IMPORT_ID,
    status: 'idle',
    total: 0,
    processed: 0,
    added: 0,
    skipped: 0,
    error: null as string | null,
    startedAt: null as Date | null,
    completedAt: null as Date | null,
  }
}

export async function getStudentImportState() {
  return (await prisma.studentImportState.findUnique({
    where: { id: STUDENT_IMPORT_ID },
  })) || defaultStudentImportState()
}

async function ensureStudentImportState() {
  await prisma.studentImportState.upsert({
    where: { id: STUDENT_IMPORT_ID },
    update: {},
    create: {
      id: STUDENT_IMPORT_ID,
      status: 'idle',
      updatedAt: new Date(),
    },
  })
}

export async function startStudentImport() {
  await ensureStudentImportState()

  const lock = await prisma.studentImportState.updateMany({
    where: { id: STUDENT_IMPORT_ID, NOT: { status: 'running' } },
    data: {
      status: 'running',
      total: 0,
      processed: 0,
      added: 0,
      skipped: 0,
      error: null,
      startedAt: new Date(),
      completedAt: null,
    },
  })

  if (lock.count === 0) return false

  void runStudentImport()
  return true
}

function parseMemorialVideoStudentName(filename: string) {
  const parsed = path.parse(filename)
  if (parsed.ext.toLowerCase() !== '.mp4') return null

  return filename
    .replace(/\.mp4$/i, '')
    .replace(/^Blue Archive\s*-\s*/i, '')
    .replace(/\s*Live2D$/i, '')
    .trim()
}

function memorialVideoUrl(filename: string) {
  return `/api/memorial-video?file=${encodeURIComponent(filename)}`
}

function normalizeMemorialStudentName(value: string) {
  return normalizeStudentName(value)
    .replace(/\b(swimsuit|summer)\b/g, 'summer')
    .replace(/\b(battle|armed|tactical)\b/g, 'battle')
    .replace(/\bpart\s*(timer|time job)\b/g, 'part timer')
    .replace(/\bbunny\s+girl\b/g, 'bunny')
    .replace(/\b(school|uniform)\b/g, 'school')
    .replace(/\b(camp|camping)\b/g, 'camp')
    .replace(/\bpajamas?\b/g, 'pajama')
    .replace(/\bpop\s+idol\b/g, 'idol')
    .replace(/\b(track|sportswear)\b/g, 'track')
    .replace(/\bcasual\s+clothes\b/g, 'casual')
    .replace(/\b(cycling|cyclist\s+ver)\b/g, 'cycling')
    .replace(/\b(small|little\s+girl)\b/g, 'small')
    .replace(/\b(chear|cheer)\s+(squard|squad)\b/g, 'cheerleader')
    .replace(/\bchearleader\b/g, 'cheerleader')
    .trim()
    .replace(/\s+/g, ' ')
}

async function loadMemorialLobbyVideos() {
  const memorials = new Map<string, string>()
  const videoDirs = [OPTIMIZED_MEMORIAL_LOBBY_VIDEOS_DIR, MEMORIAL_LOBBY_VIDEOS_DIR]

  for (const videoDir of videoDirs) {
    let entries: Array<import('fs').Dirent>
    try {
      entries = await fs.readdir(videoDir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const studentName = parseMemorialVideoStudentName(entry.name)
      if (!studentName) continue
      const normalized = normalizeMemorialStudentName(studentName)
      if (normalized && !memorials.has(normalized)) memorials.set(normalized, memorialVideoUrl(entry.name))
    }
  }

  return memorials
}

async function loadMemorialLobbyUrls() {
  try {
    const memorials = await loadMemorialLobbyVideos()
    if (memorials.size > 0) return { memorials, warning: null as string | null }
    return { memorials: null, warning: 'No memorial lobby videos were found in Development_data/lobbies.' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Could not read memorial lobby videos.'
    return {
      memorials: null,
      warning: `Memorial video import skipped: ${reason}`,
    }
  }
}

async function runStudentImport() {
  let processed = 0
  let added = 0
  let skipped = 0
  let memorialWarning: string | null = null

  try {
    const memorialResult = await loadMemorialLobbyUrls()
    const memorials = memorialResult.memorials
    memorialWarning = memorialResult.warning

    const res = await fetch(SCHALE_STUDENTS_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`SchaleDB request failed with ${res.status}`)

    const raw = (await res.json()) as Record<string, SchaleStudent>
    const students = Object.values(raw)
      .map((student) => {
        const id = Number(student.Id)
        const name = typeof student.Name === 'string' ? student.Name.trim() : ''
        if (!Number.isInteger(id) || id <= 0 || !name) return null
        return {
          id,
          name,
          image: studentImageUrl(id),
          portrait: studentPortraitUrl(id),
          memorial: memorials?.get(normalizeMemorialStudentName(name)) || null,
          familyName: normalizeOptionalStudentText(student.FamilyName),
          personalName: normalizeOptionalStudentText(student.PersonalName),
          school: normalizeOptionalStudentText(student.School),
          club: normalizeOptionalStudentText(student.Club),
          schoolYear: normalizeOptionalStudentText(student.SchoolYear),
          characterAge: normalizeOptionalStudentText(student.CharacterAge),
          characterVoice: normalizeOptionalStudentText(student.CharacterVoice),
          birthday: normalizeOptionalStudentText(student.Birthday),
          birthDay: normalizeStudentBirthDay(student.BirthDay),
          hobby: normalizeOptionalStudentText(student.Hobby),
          heightMetric: normalizeOptionalStudentText(student.CharHeightMetric),
          weaponType: normalizeOptionalStudentText(student.WeaponType),
          tacticRole: normalizeOptionalStudentText(student.TacticRole),
          position: normalizeOptionalStudentText(student.Position),
          weaponName: normalizeOptionalStudentText(student.Weapon?.Name),
        }
      })
      .filter((student): student is NonNullable<typeof student> => Boolean(student))

    await prisma.studentImportState.update({
      where: { id: STUDENT_IMPORT_ID },
      data: { total: students.length },
    })

    const existing = await prisma.student.findMany({
      where: { id: { in: students.map((student) => student.id) } },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((student) => student.id))

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE)
      await prisma.$transaction(
        batch.map((student) => prisma.student.upsert({
          where: { id: student.id },
          create: student,
          update: {
            name: student.name,
            image: student.image,
            portrait: student.portrait,
            ...(memorials ? { memorial: student.memorial } : {}),
            familyName: student.familyName,
            personalName: student.personalName,
            school: student.school,
            club: student.club,
            schoolYear: student.schoolYear,
            characterAge: student.characterAge,
            characterVoice: student.characterVoice,
            birthday: student.birthday,
            birthDay: student.birthDay,
            hobby: student.hobby,
            heightMetric: student.heightMetric,
            weaponType: student.weaponType,
            tacticRole: student.tacticRole,
            position: student.position,
            weaponName: student.weaponName,
          },
        }))
      )

      const newRows = batch.filter((student) => !existingIds.has(student.id)).length
      processed += batch.length
      added += newRows
      skipped += batch.length - newRows

      await prisma.studentImportState.update({
        where: { id: STUDENT_IMPORT_ID },
        data: { processed, added, skipped },
      })
    }

    await prisma.$executeRaw`
      UPDATE "Player" AS p
      SET "favouriteStudentId" = s."id"
      FROM "Student" AS s
      WHERE p."favouriteStudentId" IS NULL
        AND p."favouriteStudent" IS NOT NULL
        AND lower(p."favouriteStudent") = lower(s."name")
    `

    await prisma.studentImportState.update({
      where: { id: STUDENT_IMPORT_ID },
      data: {
        status: 'completed',
        processed,
        added,
        skipped,
        error: memorialWarning,
        completedAt: new Date(),
      },
    })
    invalidatePublicData()
  } catch (error) {
    await prisma.studentImportState.update({
      where: { id: STUDENT_IMPORT_ID },
      data: {
        status: 'failed',
        processed,
        added,
        skipped,
        error: error instanceof Error ? error.message : 'Import failed',
        completedAt: new Date(),
      },
    })
  }
}
