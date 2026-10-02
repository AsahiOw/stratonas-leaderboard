import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ChibiAsset, StudentChibiBinding } from '@/generated/prisma/client'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { ChibiInputError, record } from './api-input'
import { CHIBI_ENQUEUE_LOCK, activeJobWhere, ChibiJobConflict } from './server'
import { existingArtifactPath, artifactPath } from './storage'

export const CHIBI_RECORD_LIMIT = 64 * 1024 * 1024
type StudentIdentity = { id: number; name: string; pathName: string | null }
type Records = {
  format: 'stratonas-chibi-records'; schemaVersion: 1; exportedAt: string
  students: StudentIdentity[]
  assets: (Omit<ChibiAsset, 'createdAt'> & { createdAt: string })[]
  bindings: Omit<StudentChibiBinding, 'updatedAt'>[]
}
const assetFields = ['id', 'sourceIdentity', 'fingerprint', 'coreFingerprint', 'coreFingerprintSchemaVersion', 'dependencyFingerprint', 'exporterVersion', 'checksum', 'fileKey', 'clips', 'materials', 'validation', 'arrangementDefault', 'published', 'createdAt'] as const
const bindingFields = ['studentId', 'assetId', 'sourceIdentity', 'identityPath', 'profile', 'provenance', 'overrides', 'arrangementOverride', 'catalogVisible', 'status', 'diagnostic'] as const
const pick = (row: Record<string, unknown>, fields: readonly string[]) => Object.fromEntries(fields.map(key => [key, row[key]]))
function ensure(valid: unknown, message: string): asserts valid { if (!valid) throw new ChibiInputError(message) }
const text = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 2000
const nullableText = (value: unknown) => value === null || text(value)
const object = (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value)
const identity = (value: string | null) => (value ?? '').trim().toLowerCase()

export function readChibiRecords(input: unknown): Records {
  const body = record(input)
  ensure(body.format === 'stratonas-chibi-records' && body.schemaVersion === 1, 'Choose a supported Chibi records export folder.')
  ensure(typeof body.exportedAt === 'string' && Number.isFinite(Date.parse(body.exportedAt)), 'Invalid export date.')
  for (const key of ['students', 'assets', 'bindings']) ensure(Array.isArray(body[key]) && body[key].length > 0 && body[key].length <= 1000, `Invalid ${key} list.`)
  const assets = (body.assets as unknown[]).map(value => {
    const row = record(value)
    for (const key of ['id', 'sourceIdentity', 'fingerprint', 'dependencyFingerprint', 'exporterVersion', 'fileKey']) ensure(text(row[key]), `Invalid model ${key}.`)
    ensure(typeof row.checksum === 'string' && /^[a-f0-9]{64}$/.test(row.checksum), 'Invalid model checksum.')
    ensure((row.fileKey as string).startsWith('published/'), 'Only published model files can be transferred.')
    artifactPath(row.fileKey as string)
    ensure(row.published === true && nullableText(row.coreFingerprint), 'Invalid published model metadata.')
    ensure(row.coreFingerprintSchemaVersion === null || Number.isInteger(row.coreFingerprintSchemaVersion), 'Invalid model fingerprint version.')
    ensure(typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt)), 'Invalid model date.')
    ensure(Array.isArray(row.clips) && row.clips.every(text), 'Invalid animation list.')
    for (const key of ['materials', 'validation', 'arrangementDefault']) ensure(object(row[key]), `Invalid model ${key}.`)
    return pick(row, assetFields) as unknown as Records['assets'][number]
  })
  const assetMap = new Map(assets.map(row => [row.id, row]))
  ensure(assetMap.size === assets.length, 'Duplicate model records.')
  const students = (body.students as unknown[]).map(value => {
    const row = record(value)
    ensure(Number.isInteger(row.id) && Number(row.id) >= 10000 && Number(row.id) <= 99999 && text(row.name) && nullableText(row.pathName), 'Invalid student identity.')
    return pick(row, ['id', 'name', 'pathName']) as StudentIdentity
  })
  const studentMap = new Map(students.map(row => [row.id, row]))
  ensure(studentMap.size === students.length, 'Duplicate student records.')
  const bindings = (body.bindings as unknown[]).map(value => {
    const row = record(value)
    ensure(studentMap.has(Number(row.studentId)) && Number.isInteger(row.studentId), 'Binding has no matching student.')
    ensure(text(row.assetId) && assetMap.has(row.assetId as string), 'Binding has no matching model.')
    for (const key of ['sourceIdentity', 'identityPath', 'diagnostic']) ensure(row[key] === null || typeof row[key] === 'string', `Invalid binding ${key}.`)
    ensure(row.sourceIdentity === assetMap.get(row.assetId as string)!.sourceIdentity, 'Binding and model source identities differ.')
    ensure(text(row.provenance) && typeof row.catalogVisible === 'boolean' && ['available', 'unavailable', 'failed', 'review-required', 'unresolved', 'blocked', 'pending'].includes(String(row.status)), 'Invalid binding settings.')
    for (const key of ['profile', 'overrides', 'arrangementOverride']) ensure(object(row[key]), `Invalid binding ${key}.`)
    return pick(row, bindingFields) as Records['bindings'][number]
  })
  ensure(new Set(bindings.map(row => row.studentId)).size === bindings.length && bindings.length === students.length, 'Duplicate or unmatched bindings.')
  ensure(new Set(bindings.map(row => row.assetId)).size === assets.length, 'Unreferenced model records.')
  return { format: 'stratonas-chibi-records', schemaVersion: 1, exportedAt: body.exportedAt, students, assets, bindings }
}

export async function exportChibiRecords(db = prisma, root = path.resolve('Development_data/chibi-record-exports')) {
  // Bindings and their immutable assets are read in one consistent snapshot.
  const rows = await db.$transaction(tx => tx.studentChibiBinding.findMany({ where: { asset: { published: true } }, include: { asset: true, student: { select: { id: true, name: true, pathName: true } } }, orderBy: { studentId: 'asc' } }), { isolationLevel: 'RepeatableRead' })
  ensure(rows.length, 'There are no finished Chibi models to export.')
  const exportedAt = new Date().toISOString()
  const assets = [...new Map(rows.map(row => [row.asset!.id, { ...row.asset!, createdAt: row.asset!.createdAt.toISOString() }])).values()]
  const records = readChibiRecords({ format: 'stratonas-chibi-records', schemaVersion: 1, exportedAt, students: rows.map(row => row.student), assets, bindings: rows.map(row => pick(row, bindingFields)) })
  const data = JSON.stringify(records)
  ensure(Buffer.byteLength(data) < CHIBI_RECORD_LIMIT - 1024, 'The records export exceeds the supported 64 MB transfer size.')
  const folderName = `${exportedAt.replaceAll(':', '-')}-${randomUUID()}`
  const folder = path.join(root, folderName)
  await mkdir(folder, { recursive: true })
  await writeFile(path.join(folder, 'records.json'), data, { flag: 'wx' })
  return { folder: `Development_data/chibi-record-exports/${folderName}`, students: records.bindings.length, models: records.assets.length, bytes: Buffer.byteLength(data) }
}

async function verifyModel(asset: Records['assets'][number]) {
  try {
    const file = await existingArtifactPath(asset.fileKey)
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(file)) hash.update(chunk)
    ensure(hash.digest('hex') === asset.checksum, `Model checksum differs: ${asset.fileKey}. Copy the matching model file first.`)
  } catch (error) {
    if (error instanceof ChibiInputError) throw error
    throw new ChibiInputError(`Model file is missing or unreadable: ${asset.fileKey}. Copy the exported models into Development_data/chibi/published first.`)
  }
}

export async function importChibiRecords(input: unknown, db = prisma, verify = verifyModel) {
  const records = readChibiRecords(input)
  // No database changes are made until all referenced files pass verification.
  for (const asset of records.assets) await verify(asset)
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHIBI_ENQUEUE_LOCK})`
    const active = await tx.chibiImportJob.findFirst({ where: activeJobWhere, select: { id: true } })
    if (active) throw new ChibiJobConflict(active.id)
    const targets = await tx.student.findMany({ where: { id: { in: records.students.map(row => row.id) } }, select: { id: true, pathName: true } })
    for (const student of records.students) {
      const target = targets.find(row => row.id === student.id)
      ensure(target && identity(target.pathName) === identity(student.pathName), `Student ${student.name} (${student.id}) is missing or differs on this host. Sync the student roster first.`)
    }
    const existing = await tx.chibiAsset.findMany({ where: { id: { in: records.assets.map(row => row.id) } } })
    for (const asset of records.assets) {
      const old = existing.find(row => row.id === asset.id)
      ensure(!old || (old.checksum === asset.checksum && old.fileKey === asset.fileKey && old.sourceIdentity === asset.sourceIdentity), `Model ID ${asset.id} conflicts with a different existing model.`)
    }
    for (const asset of records.assets) {
      const data = { ...asset, createdAt: new Date(asset.createdAt) } as Prisma.ChibiAssetUncheckedCreateInput
      await tx.chibiAsset.upsert({ where: { id: asset.id }, create: data, update: data })
    }
    for (const binding of records.bindings) {
      const data = binding as Prisma.StudentChibiBindingUncheckedCreateInput
      await tx.studentChibiBinding.upsert({ where: { studentId: binding.studentId }, create: data, update: data })
    }
    return { students: records.bindings.length, models: records.assets.length }
  }, { maxWait: 30_000, timeout: 120_000 })
}
