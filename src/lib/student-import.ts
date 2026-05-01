import { prisma } from '@/lib/prisma'
import { studentImageUrl } from '@/lib/students'

export const STUDENT_IMPORT_ID = 'schaledb-students'
const SCHALE_STUDENTS_URL = 'https://schaledb.com/data/en/students.min.json'
const BATCH_SIZE = 50

type SchaleStudent = {
  Id?: unknown
  Name?: unknown
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

async function runStudentImport() {
  let processed = 0
  let added = 0
  let skipped = 0

  try {
    const res = await fetch(SCHALE_STUDENTS_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`SchaleDB request failed with ${res.status}`)

    const raw = (await res.json()) as Record<string, SchaleStudent>
    const students = Object.values(raw)
      .map((student) => {
        const id = Number(student.Id)
        const name = typeof student.Name === 'string' ? student.Name.trim() : ''
        if (!Number.isInteger(id) || id <= 0 || !name) return null
        return { id, name, image: studentImageUrl(id) }
      })
      .filter((student): student is { id: number; name: string; image: string } => Boolean(student))

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
      const rowsToCreate = batch.filter((student) => !existingIds.has(student.id))
      const result = rowsToCreate.length
        ? await prisma.student.createMany({ data: rowsToCreate, skipDuplicates: true })
        : { count: 0 }

      processed += batch.length
      added += result.count
      skipped += batch.length - result.count

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
        error: null,
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
