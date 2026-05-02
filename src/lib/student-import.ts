import fs from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { normalizeStudentName, studentImageUrl, studentPortraitUrl } from '@/lib/students'

export const STUDENT_IMPORT_ID = 'schaledb-students'
const SCHALE_STUDENTS_URL = 'https://schaledb.com/data/en/students.min.json'
const WIKI_API_URL = 'https://bluearchive.wiki/w/api.php'
const MEMORIAL_LOBBIES_PATH = path.join(process.cwd(), 'Development_data', 'memorial-lobbies.json')
const BATCH_SIZE = 50

type SchaleStudent = {
  Id?: unknown
  Name?: unknown
}

type WikiAllImagesResponse = {
  query?: {
    allimages?: Array<{
      name?: unknown
      url?: unknown
    }>
  }
  continue?: {
    continue?: unknown
    aicontinue?: unknown
  }
}

type MemorialLobbyJsonEntry = {
  studentName?: unknown
  imageUrl?: unknown
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

function parseMemorialStudentName(filename: string) {
  if (!filename.startsWith('Memorial_Lobby_')) return null
  return filename
    .replace(/^Memorial_Lobby_/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .trim()
}

async function fetchMemorialLobbyUrls() {
  const memorials = new Map<string, string>()
  let aiContinue: string | null = null
  let queryContinue: string | null = null

  do {
    const params = new URLSearchParams({
      action: 'query',
      list: 'allimages',
      aiprefix: 'Memorial_Lobby_',
      ailimit: '500',
      aiprop: 'url',
      format: 'json',
    })
    if (aiContinue) params.set('aicontinue', aiContinue)
    if (queryContinue) params.set('continue', queryContinue)

    const res = await fetch(`${WIKI_API_URL}?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'MyScript/1.0',
        'Accept': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`Blue Archive Wiki request failed with ${res.status}`)

    const body = (await res.json()) as WikiAllImagesResponse
    for (const image of body.query?.allimages || []) {
      if (typeof image.name !== 'string' || typeof image.url !== 'string') continue
      const studentName = parseMemorialStudentName(image.name)
      if (!studentName) continue
      const normalized = normalizeStudentName(studentName)
      if (normalized && !memorials.has(normalized)) memorials.set(normalized, image.url)
    }

    aiContinue = typeof body.continue?.aicontinue === 'string' ? body.continue.aicontinue : null
    queryContinue = typeof body.continue?.continue === 'string' ? body.continue.continue : null
  } while (aiContinue)

  return memorials
}

async function readMemorialLobbyJson() {
  const raw = await fs.readFile(MEMORIAL_LOBBIES_PATH, 'utf8')
  const entries = JSON.parse(raw) as MemorialLobbyJsonEntry[]
  if (!Array.isArray(entries)) throw new Error('memorial-lobbies.json must contain an array.')

  const memorials = new Map<string, string>()
  for (const entry of entries) {
    if (typeof entry.studentName !== 'string' || typeof entry.imageUrl !== 'string') continue
    const normalized = normalizeStudentName(entry.studentName)
    if (normalized && !memorials.has(normalized)) memorials.set(normalized, entry.imageUrl)
  }

  return memorials
}

async function loadMemorialLobbyUrls() {
  try {
    const memorials = await readMemorialLobbyJson()
    if (memorials.size > 0) return { memorials, warning: null as string | null }
    return { memorials: null, warning: 'Memorial JSON was empty; falling back to wiki API.' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Could not read memorial JSON.'
    try {
      return { memorials: await fetchMemorialLobbyUrls(), warning: null as string | null }
    } catch (wikiError) {
      const wikiReason = wikiError instanceof Error ? wikiError.message : 'Wiki API request failed.'
      return {
        memorials: null,
        warning: `Memorial import skipped: ${reason}; ${wikiReason}`,
      }
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
          memorial: memorials?.get(normalizeStudentName(name)) || null,
        }
      })
      .filter((student): student is { id: number; name: string; image: string; portrait: string; memorial: string | null } => Boolean(student))

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
