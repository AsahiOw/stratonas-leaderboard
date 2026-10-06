import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { ChibiInputError } from './api-input'
import { CHIBI_ACTIONS, emptyChibiProfile, type ChibiCatalogStudent, type ChibiProfile } from './types'
import { mergeChibiArrangementDelta, parseChibiArrangementDelta } from './arrangement'

export const eligibleStudentsWhere = { id: { gte: 10000, lte: 99999 } }
export const activeJobWhere = { status: { in: ['queued', 'running', 'paused'] } }
// Separate from the worker's session lock; serializes all enqueue operations.
export const CHIBI_ENQUEUE_LOCK = 724_310_002
export class ChibiJobConflict extends Error {
  constructor(public jobId: string) { super('A Chibi import or source download is already active.') }
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
    const modeFilter = input.mode === 'download-assets' ? {}
      : ['preview', 'mapping'].includes(input.mode) ? { mode: 'download-assets' }
      : { mode: { notIn: ['preview', 'mapping'] } }
    const active = await tx.chibiImportJob.findFirst({ where: { ...activeJobWhere, ...modeFilter }, orderBy: { createdAt: 'asc' } })
    if (active) throw new ChibiJobConflict(active.id)
    let ids = input.studentIds
    if (input.mode === 'update-missing-animations') {
      if (ids.length) throw new ChibiInputError('Students missing animations are selected automatically.')
      const students = await tx.student.findMany({
        where: eligibleStudentsWhere, orderBy: { id: 'asc' },
        select: { id: true, chibiBinding: { select: { profile: true } } },
      })
      ids = students.filter(student => {
        const profile = student.chibiBinding?.profile as unknown as ChibiProfile | undefined
        return !CHIBI_ACTIONS.every(action => profile?.interactions?.[action]?.state === 'available')
      }).map(student => student.id)
      if (!ids.length) throw new ChibiInputError('All students already have Idle, Walk, Pickup and Touch available. There is nothing to update.')
    }
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

export async function controlChibiJob(jobId: string, action: 'pause' | 'resume', db = prisma) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHIBI_ENQUEUE_LOCK})`
    const job = await tx.chibiImportJob.findUnique({ where: { id: jobId } })
    if (!job || job.mode === 'download-assets') throw new ChibiInputError('Choose an existing character import job.')
    const allowed = action === 'pause' ? ['queued', 'running', 'paused'] : ['paused', 'queued']
    if (!allowed.includes(job.status)) throw new ChibiJobConflict(jobId)
    const data = action === 'resume'
      ? { status: 'queued', stage: 'resuming', completedAt: null, error: null }
      : job.status === 'running' ? { stage: 'pause-requested' }
      : { status: 'paused', stage: 'paused', leaseToken: null, workerId: null, heartbeatAt: null }
    const changed = await tx.chibiImportJob.updateMany({ where: { id: jobId, status: job.status, leaseToken: job.leaseToken }, data })
    if (changed.count !== 1) throw new ChibiJobConflict(jobId)
    return tx.chibiImportJob.findUniqueOrThrow({ where: { id: jobId } })
  })
}
