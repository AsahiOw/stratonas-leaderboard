import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { ChibiInputError } from './api-input'
import { emptyChibiProfile, type ChibiCatalogStudent, type ChibiProfile } from './types'
import { mergeChibiArrangementDelta, parseChibiArrangementDelta } from './arrangement'

export const eligibleStudentsWhere = { id: { gte: 10000, lte: 99999 } }
export const activeJobWhere = { status: { in: ['queued', 'running'] } }
// Separate from the worker's session lock; serializes all enqueue operations.
export const CHIBI_ENQUEUE_LOCK = 724_310_002
export class ChibiJobConflict extends Error {
  constructor(public jobId: string) { super('A chibi import is already active.') }
}
export function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function getPublicChibiStudents(db = prisma): Promise<ChibiCatalogStudent[]> {
  const rows = await db.student.findMany({
    where: eligibleStudentsWhere, orderBy: [{ name: 'asc' }, { id: 'asc' }],
    // The active binding is the public source of truth. Failed or private
    // replacement jobs intentionally leave the previous published revision
    // active until a new verified binding is published.
    select: { id: true, name: true, pathName: true, image: true, portrait: true, chibiBinding: { include: { asset: true } } },
  })
  return rows.flatMap(({ chibiBinding: binding, ...student }) => {
    const asset = binding?.asset
    const identityMatches = (binding?.identityPath || '').trim().toLowerCase() === (student.pathName || '').trim().toLowerCase()
    const viewable = identityMatches && binding?.catalogVisible !== false && binding?.status === 'available' && !!asset?.published && (asset.validation as { valid?: boolean })?.valid === true
    if (!viewable || !asset) return []
    return [{
      ...student, status: 'viewable', diagnostic: null,
      model: {
        assetId: asset.id, revision: asset.checksum,
        url: `/assets/chibi/${asset.id}/${asset.checksum}.glb`, sourceIdentity: asset.sourceIdentity,
        profile: binding?.profile as unknown as ChibiProfile || emptyChibiProfile(),
        arrangement: mergeChibiArrangementDelta(asset.arrangementDefault ?? {}, binding?.arrangementOverride ?? {}),
        arrangementDefault: parseChibiArrangementDelta(asset.arrangementDefault ?? {}),
      },
    }]
  })
}

export async function enqueueChibiJob(input: {
  mode: string; studentIds: number[]; requesterId: string | null; candidate?: unknown
}, db = prisma) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHIBI_ENQUEUE_LOCK})`
    if (!['preview', 'mapping'].includes(input.mode)) {
      const active = await tx.chibiImportJob.findFirst({ where: { ...activeJobWhere, mode: { notIn: ['preview', 'mapping'] } }, orderBy: { createdAt: 'asc' } })
      if (active) throw new ChibiJobConflict(active.id)
    }
    let ids = input.studentIds
    if (ids.length) {
      const count = await tx.student.count({ where: { id: { ...eligibleStudentsWhere.id, in: ids } } })
      if (count !== ids.length) throw new ChibiInputError('One or more selected students do not exist.')
    }
    if (input.mode === 'retry-failed' && !ids.length) {
      const items = await tx.chibiImportItem.findMany({
        where: { job: { mode: { notIn: ['audit', 'preview'] } }, studentId: { gte: 10000, lte: 99999 } },
        orderBy: { updatedAt: 'desc' }, distinct: ['studentId'], select: { studentId: true, status: true },
      })
      ids = items.filter(item => item.status === 'failed').map(item => item.studentId)
      if (!ids.length) throw new ChibiInputError('No failed students to retry.')
    }
    return tx.chibiImportJob.create({ data: {
      mode: input.mode, requesterId: input.requesterId, selection: ids,
      ...(input.candidate ? { candidate: jsonValue(input.candidate) } : {}),
    } })
  })
}

export function publicJob(job: Awaited<ReturnType<typeof enqueueChibiJob>>) {
  const { leaseToken: _lease, ...safe } = job
  return safe
}
