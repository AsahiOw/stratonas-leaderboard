import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import { artifactIsIntact, annotateProjectMxSourceMeshEvidence, buildFingerprint, CHIBI_CORE_CONVERTER_VERSION, CHIBI_EXPORTER_VERSION, CHIBI_MATERIAL_VERSION, ChibiArtifactValidationError, convertCandidate, getChibiConversionTiming, getChibiCoreConverterIdentity, profilesEqual, selectAnimator, validateGlb, type ChibiConversionTiming } from './engine'
import { defaultProfile, mapStudentToSources, sourceAnimationClips, type ExistingBinding, type MappingStudent } from './mapping'
import type { InventoryReport, SourceCandidate } from './inventory'
import { buildChibiRenderingProfile, CHIBI_SHADER_ADAPTER_VERSION } from './rendering-profile'
import { parseChibiArrangementDelta } from './arrangement'
import { isCompleteChibiArrangementDefault, rebaseChibiArrangementOverride } from './arrangement-default'
import {
  assertGlbCoreProfileMatches, assertPinnedV12GlbProfile, buildCoreFingerprint, buildPinnedV12Fingerprint,
  CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION, effectiveClipSelection, PINNED_V12_EXPORTER_VERSION,
  pinnedV12AssetMatches, rewriteGlbDiagnostics,
} from './core-cache'
import { artifactPath, chibiRoots } from './storage'

export { CHIBI_WORKER_LOCK, acquireWorkerLock } from './worker-lock'
export const LEASE_TIMEOUT_MS = 90_000
const WORKER_TRANSACTION_OPTIONS = { maxWait: 30_000, timeout: 30_000 } as const
type ImportTimingStage = 'toolchainIdentity' | 'mapping' | 'renderingProfile' | 'coreFingerprint' | 'cacheLookup' | 'artifactChecksum'
  | 'metadataRewrite' | 'metadataValidation' | 'metadataArtifactPublication' | 'conversion' | 'databasePublication'
type ImportTiming = {
  startedAt: number
  stagesMs: Record<ImportTimingStage, number>
  conversion?: ChibiConversionTiming
  cacheFallbackReason?: string
  cacheCandidate?: 'core-fingerprint' | 'legacy-v12-version-pinned'
}

export type ChibiJobProcessingTiming = {
  schemaVersion: 1
  totalMs: number
  stagesMs: {
    candidateSync: number
    jobInitialization: number
    toolIdentity: number
    itemQueue: number
    finalProgress: number
  }
  outcome: 'success' | 'failure' | 'aborted'
}

type ProcessJobOptions = {
  signal?: AbortSignal
  convert?: typeof convertCandidate
  artifactIntact?: typeof artifactIsIntact
  coreConverterIdentity?: () => Promise<string>
  publishMetadataArtifact?: (bytes: Buffer) => Promise<{ checksum: string; fileKey: string; validation: unknown }>
  onJobTiming?: (timing: ChibiJobProcessingTiming) => void
}

function newImportTiming(toolchainIdentityMs = 0): ImportTiming {
  return { startedAt: performance.now() - toolchainIdentityMs, stagesMs: {
    toolchainIdentity: toolchainIdentityMs, mapping: 0, renderingProfile: 0, coreFingerprint: 0, cacheLookup: 0, artifactChecksum: 0,
    metadataRewrite: 0, metadataValidation: 0, metadataArtifactPublication: 0, conversion: 0, databasePublication: 0,
  } }
}

function persistImportTiming(timing: ImportTiming) {
  const conversion = getChibiConversionTiming({ chibiConversionTiming: timing.conversion })
  return {
    schemaVersion: 1,
    totalMs: Math.round(Math.max(0, performance.now() - timing.startedAt) * 10) / 10,
    stagesMs: Object.fromEntries(Object.entries(timing.stagesMs).map(([stage, duration]) => [stage, Math.round(Math.max(0, duration) * 10) / 10])),
    ...(conversion ? { conversion } : {}),
    ...(timing.cacheFallbackReason ? { cacheFallbackReason: timing.cacheFallbackReason } : {}),
    ...(timing.cacheCandidate ? { cacheCandidate: timing.cacheCandidate } : {}),
  }
}

function recordCacheFallback(timing: ImportTiming, reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason)
  timing.cacheFallbackReason = message.slice(0, 500)
}

async function measureImportStage<T>(timing: ImportTiming, stage: ImportTimingStage, action: () => Promise<T>): Promise<T> {
  const startedAt = performance.now()
  try { return await action() }
  finally { timing.stagesMs[stage] += performance.now() - startedAt }
}

function importedArrangementDefault(value: unknown, validation: unknown) {
  if (!isCompleteChibiArrangementDefault(value, validation)) throw new Error('Imported arrangement default does not cover the exact allowlisted nodes.')
  const baseline = parseChibiArrangementDelta(value, 'arrangementDefault')
  return baseline
}

type Db = any
export class StaleChibiMappingError extends Error {}

export async function recoverExpiredLeases(db: Db, now = new Date()) {
  const stale = new Date(now.getTime() - LEASE_TIMEOUT_MS)
  await db.chibiImportJob.updateMany({
    where: { status: 'running', stage: 'pause-requested', OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: stale } }] },
    data: { status: 'paused', stage: 'paused', leaseToken: null, workerId: null, heartbeatAt: null },
  })
  return db.chibiImportJob.updateMany({
    where: { status: 'running', OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: stale } }] },
    data: { status: 'queued', stage: 'recovered', leaseToken: null, workerId: null, heartbeatAt: null },
  })
}

export async function pauseAtCheckpoint(db: Db, jobId: string, leaseToken: string) {
  const result = await db.chibiImportJob.updateMany({
    where: { id: jobId, status: 'running', stage: 'pause-requested', leaseToken },
    data: { status: 'paused', stage: 'paused', leaseToken: null, workerId: null, heartbeatAt: null },
  })
  return result.count === 1
}

export async function claimNextJob(db: Db, workerId: string, now = new Date()) {
  return db.$transaction(async (tx: Db) => {
    const jobs = await tx.$queryRawUnsafe(
      `SELECT id FROM "ChibiImportJob" WHERE status = 'queued' ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`,
    ) as Array<{ id: string }>
    if (!jobs[0]) return null
    const leaseToken = randomUUID()
    const claimed = await tx.chibiImportJob.updateMany({
      where: { id: jobs[0].id, status: 'queued' },
      data: { status: 'running', stage: 'inventory', leaseToken, workerId, heartbeatAt: now, startedAt: now, error: null },
    })
    if (claimed.count !== 1) return null
    return tx.chibiImportJob.findUnique({ where: { id: jobs[0].id } })
  }, WORKER_TRANSACTION_OPTIONS)
}

export async function renewLease(db: Db, jobId: string, leaseToken: string, now = new Date()) {
  const result = await db.chibiImportJob.updateMany({ where: { id: jobId, status: 'running', leaseToken }, data: { heartbeatAt: now } })
  if (result.count !== 1) throw new Error('Import job lease was lost.')
}

export async function syncCandidates(db: Db, report: InventoryReport) {
  // A full BA-AD inventory can contain hundreds of candidates.  Keep each
  // idempotent batch below Prisma's default transaction timeout;
  // a later batch can safely resume after a worker restart.
  for (let offset = 0; offset < report.candidates.length; offset += 20) {
    const batch = report.candidates.slice(offset, offset + 20)
    await db.$transaction(batch.map(candidate => db.chibiSourceCandidate.upsert({
      where: { sourceIdentity: candidate.sourceIdentity },
      // The complete candidate (including dependency parts and material tables)
      // remains in the local inventory report used by the worker.  Keep only
      // review-facing metadata in PostgreSQL so a full BA-AD scan does not
      // duplicate tens of megabytes of source metadata in every row.
      create: { sourceIdentity: candidate.sourceIdentity, fingerprint: candidate.fingerprint, metadata: candidateReference(candidate), conflict: candidate.conflict },
      update: { fingerprint: candidate.fingerprint, metadata: candidateReference(candidate), conflict: candidate.conflict },
    })))
  }
}

function candidateReference(candidate: SourceCandidate) {
  return {
    clips: candidate.clips,
    objectNames: candidate.objectNames,
    materials: candidate.materials,
    prefabPaths: candidate.prefabPaths ?? [],
    assembly: candidate.assembly ?? [],
  }
}

function sourceProfileDecision(candidate: SourceCandidate, profile: ReturnType<typeof defaultProfile>) {
  const animator = selectAnimator(candidate, profile)
  if (!animator.prefabPath) {
    return { renderingProfile: null, gap: {
      status: 'unavailable' as const,
      reason: `No authoritative character prefab or animator was indexed for ${candidate.sourceIdentity}; AssetStudio cannot export a verified model.`,
    } }
  }
  const renderingProfile = annotateProjectMxSourceMeshEvidence(buildChibiRenderingProfile(candidate, animator.prefabPath, profile))
  return { renderingProfile, gap: null }
}

export function sourceGap(candidate: SourceCandidate, profile: ReturnType<typeof defaultProfile>) {
  return sourceProfileDecision(candidate, profile).gap
}

export async function fencedPublish(db: Db, input: {
  jobId: string; leaseToken: string; itemId: string; student: MappingStudent; candidate: SourceCandidate
  profile: unknown; fingerprint: string; artifact: { checksum: string; fileKey: string; validation: unknown; clips: string[]; materials?: unknown; arrangementDefault?: unknown }
  dependencyFingerprint: string; coreFingerprint?: string | null; coreFingerprintSchemaVersion?: number | null
  previousAssetId?: string | null; provenance: string; identityPath: string | null; overrides: unknown
  expectedBindingUpdatedAt?: Date | null; resultStatus?: 'imported' | 'updated' | 'reused'; existingAssetId?: string
  processingTiming?: ImportTiming
}) {
  const publicationStartedAt = performance.now()
  let recordedPublicationMs = 0
  try {
    return await db.$transaction(async (tx: Db) => {
      const fence = await tx.chibiImportJob.updateMany({
        where: { id: input.jobId, status: 'running', leaseToken: input.leaseToken }, data: { heartbeatAt: new Date() },
      })
      if (fence.count !== 1) throw new Error('Import job lease was lost before publication.')
      const student = await tx.student.findUnique({ where: { id: input.student.id }, select: { pathName: true, devName: true } })
      if (!student || student.pathName !== input.identityPath || (student.devName ?? null) !== (input.student.devName ?? null)) throw new StaleChibiMappingError('Student identity changed during conversion.')
      const currentBinding = await tx.studentChibiBinding.findUnique({ where: { studentId: input.student.id }, select: {
        updatedAt: true, arrangementOverride: true, catalogVisible: true,
        asset: { select: { arrangementDefault: true } },
      } })
      const expectedTime = input.expectedBindingUpdatedAt?.getTime() ?? null
      const currentTime = currentBinding?.updatedAt?.getTime() ?? null
      if (expectedTime !== currentTime) throw new StaleChibiMappingError('Chibi mapping approval changed during conversion.')
      const asset = input.existingAssetId
        ? await tx.chibiAsset.findFirstOrThrow({ where: { id: input.existingAssetId, fingerprint: input.fingerprint, published: true } })
        : await tx.chibiAsset.create({ data: {
          sourceIdentity: input.candidate.sourceIdentity, fingerprint: input.fingerprint,
          coreFingerprint: input.coreFingerprint ?? null,
          coreFingerprintSchemaVersion: input.coreFingerprint
            ? input.coreFingerprintSchemaVersion ?? CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION : null,
          dependencyFingerprint: input.dependencyFingerprint, exporterVersion: CHIBI_EXPORTER_VERSION,
          checksum: input.artifact.checksum, fileKey: input.artifact.fileKey, clips: input.artifact.clips,
          materials: input.artifact.materials ?? { source: input.candidate.materialMetadata ?? [], output: (input.artifact.validation as any)?.materials ?? [] },
          validation: input.artifact.validation,
          arrangementDefault: importedArrangementDefault(input.artifact.arrangementDefault, input.artifact.validation), published: true,
        } })
      const nextArrangementDefault = input.existingAssetId
        ? importedArrangementDefault((asset as { arrangementDefault?: unknown }).arrangementDefault, (asset as { validation?: unknown }).validation)
        : parseChibiArrangementDelta(input.artifact.arrangementDefault, 'arrangementDefault')
      const bindingData = {
        assetId: asset.id, sourceIdentity: input.candidate.sourceIdentity, identityPath: input.identityPath,
        profile: input.profile, provenance: input.provenance, overrides: input.overrides,
        arrangementOverride: currentBinding
          ? rebaseChibiArrangementOverride(currentBinding.asset?.arrangementDefault ?? {}, currentBinding.arrangementOverride ?? {}, nextArrangementDefault)
          : {},
        catalogVisible: currentBinding?.catalogVisible ?? true,
        status: 'available', diagnostic: (input.artifact.validation as { incompleteImport?: { warnings: string[] } })?.incompleteImport?.warnings.join(' ') || null,
      }
      if (currentBinding) {
        const updated = await tx.studentChibiBinding.updateMany({ where: { studentId: input.student.id, updatedAt: input.expectedBindingUpdatedAt }, data: bindingData })
        if (updated.count !== 1) throw new StaleChibiMappingError('Chibi mapping approval changed during publication.')
      } else {
        await tx.studentChibiBinding.create({ data: { studentId: input.student.id, ...bindingData } })
      }
      const processingTiming = input.processingTiming ? (() => {
        recordedPublicationMs = performance.now() - publicationStartedAt
        input.processingTiming!.stagesMs.databasePublication += recordedPublicationMs
        return persistImportTiming(input.processingTiming!)
      })() : undefined
      await tx.chibiImportItem.update({ where: { id: input.itemId }, data: {
        assetId: asset.id, fingerprint: input.fingerprint, stage: 'complete',
        status: input.resultStatus ?? (input.previousAssetId ? 'updated' : 'imported'), diagnostic: (input.artifact.validation as { incompleteImport?: { warnings: string[] } })?.incompleteImport?.warnings.join(' ') || null,
        ...(processingTiming ? { processingTiming } : {}),
      } })
      return asset
    }, WORKER_TRANSACTION_OPTIONS)
  } catch (error) {
    if (input.processingTiming) {
      input.processingTiming.stagesMs.databasePublication -= recordedPublicationMs
      input.processingTiming.stagesMs.databasePublication += performance.now() - publicationStartedAt
    }
    throw error
  }
}

async function checksumVerifiedArtifact(asset: { fileKey: string; checksum: string }, timing: ImportTiming) {
  return measureImportStage(timing, 'artifactChecksum', async () => {
    try {
      const bytes = await readFile(artifactPath(asset.fileKey))
      return createHash('sha256').update(bytes).digest('hex') === asset.checksum ? bytes : null
    } catch { return null }
  })
}

async function publishMetadataRevision(bytes: Buffer, timing: ImportTiming) {
  const dataRoot = chibiRoots().data
  const work = path.join(dataRoot, 'work')
  const temporaryPath = path.join(work, `metadata-${randomUUID()}.glb`)
  await measureImportStage(timing, 'metadataRewrite', async () => {
    await mkdir(work, { recursive: true })
    await writeFile(temporaryPath, bytes, { flag: 'wx' })
  })
  try {
    let validation: Awaited<ReturnType<typeof validateGlb>>
    try {
      validation = await measureImportStage(timing, 'metadataValidation', () => validateGlb(temporaryPath))
    } catch (error) {
      throw new ChibiArtifactValidationError(error instanceof Error ? error.message : String(error), { cause: error })
    }
    const checksum = createHash('sha256').update(bytes).digest('hex')
    const fileKey = `published/${checksum}/metadata.glb`
    const destination = artifactPath(fileKey, dataRoot)
    await measureImportStage(timing, 'metadataArtifactPublication', async () => {
      await mkdir(path.dirname(destination), { recursive: true })
      try {
        await writeFile(destination, bytes, { flag: 'wx' })
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error
        const publishedBytes = await readFile(destination)
        if (createHash('sha256').update(publishedBytes).digest('hex') !== checksum) {
          throw new Error('A metadata revision already exists at its content-addressed key with different bytes.')
        }
      }
    })
    return { checksum, fileKey, validation }
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

export async function refreshJobProgress(db: Db, jobId: string, leaseToken: string, terminal = false) {
  const counts = await db.chibiImportItem.groupBy({ by: ['status'], where: { jobId }, _count: true })
  const totals = Object.fromEntries(counts.map((entry: any) => [entry.status, Number(entry._count)]))
  const processed = Object.entries(totals).filter(([status]) => !['pending', 'running'].includes(status)).reduce((sum, [, count]) => sum + Number(count), 0)
  const result = await db.chibiImportJob.updateMany({ where: { id: jobId, status: 'running', leaseToken }, data: {
    ...(terminal ? { status: 'completed', stage: 'completed', completedAt: new Date() } : {}), processed,
    imported: totals.imported ?? 0, updated: totals.updated ?? 0, reused: totals.reused ?? 0, skipped: totals.skipped ?? 0,
    unavailable: totals.unavailable ?? 0, reviewRequired: totals['review-required'] ?? 0, failed: totals.failed ?? 0,
  } })
  if (result.count !== 1) throw new Error('Import job lease was lost while updating progress.')
}

async function finishItem(db: Db, jobId: string, leaseToken: string, itemId: string, status: string, diagnostic: string | null, extra: Record<string, unknown> = {}, timing?: ImportTiming) {
  const publicationStartedAt = performance.now()
  let recordedPublicationMs = 0
  try {
    return await db.$transaction(async (tx: Db) => {
      const fence = await tx.chibiImportJob.updateMany({ where: { id: jobId, status: 'running', leaseToken }, data: { heartbeatAt: new Date() } })
      if (fence.count !== 1) throw new Error('Import job lease was lost.')
      if (timing) {
        recordedPublicationMs = performance.now() - publicationStartedAt
        timing.stagesMs.databasePublication += recordedPublicationMs
      }
      await tx.chibiImportItem.update({ where: { id: itemId }, data: {
        stage: 'complete', status, diagnostic, ...extra,
        ...(timing ? { processingTiming: persistImportTiming(timing) } : {}),
      } })
    }, WORKER_TRANSACTION_OPTIONS)
  } catch (error) {
    if (timing) {
      timing.stagesMs.databasePublication -= recordedPublicationMs
      timing.stagesMs.databasePublication += performance.now() - publicationStartedAt
    }
    throw error
  }
}

async function acquireJobFingerprintLock(locks: Map<string, Promise<void>>, key: string) {
  const previous = locks.get(key) ?? Promise.resolve()
  let releaseCurrent!: () => void
  const current = new Promise<void>(resolve => { releaseCurrent = resolve })
  const tail = previous.then(() => current)
  locks.set(key, tail)
  await previous
  return () => {
    releaseCurrent()
    if (locks.get(key) === tail) locks.delete(key)
  }
}

async function processBoundedQueue<T>(
  items: readonly T[],
  concurrency: number,
  externalSignal: AbortSignal | undefined,
  worker: (item: T, signal: AbortSignal) => Promise<void>,
  shouldStop: () => Promise<boolean>,
) {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(externalSignal?.reason)
  if (externalSignal?.aborted) abortFromCaller()
  else externalSignal?.addEventListener('abort', abortFromCaller, { once: true })

  let nextIndex = 0
  let hasFailure = false
  let failure: unknown
  const runWorker = async () => {
    while (!controller.signal.aborted) {
      const index = nextIndex++
      if (index >= items.length) return
      try {
        if (await shouldStop()) return
        await worker(items[index], controller.signal)
      } catch (error) {
        if (!hasFailure) {
          hasFailure = true
          failure = error
          controller.abort(error)
        }
        return
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
    if (externalSignal?.aborted) externalSignal.throwIfAborted()
    if (hasFailure) throw failure
  } finally {
    externalSignal?.removeEventListener('abort', abortFromCaller)
  }
}

export async function processJob(db: Db, job: any, report: InventoryReport, options: ProcessJobOptions = {}) {
  const startedAt = performance.now()
  const timing: ChibiJobProcessingTiming = {
    schemaVersion: 1,
    totalMs: 0,
    stagesMs: { candidateSync: 0, jobInitialization: 0, toolIdentity: 0, itemQueue: 0, finalProgress: 0 },
    outcome: 'failure',
  }
  try {
    const paused = await processJobWithTiming(db, job, report, options, timing)
    timing.outcome = 'success'
    return paused
  } catch (error) {
    timing.outcome = options.signal?.aborted ? 'aborted' : 'failure'
    throw error
  } finally {
    timing.totalMs = Math.max(0, performance.now() - startedAt)
    try {
      options.onJobTiming?.({ ...timing, stagesMs: { ...timing.stagesMs } })
    } catch {
      // A benchmark observer must never alter import completion or mask its failure.
    }
  }
}

async function processJobWithTiming(db: Db, job: any, report: InventoryReport, options: ProcessJobOptions, jobTiming: ChibiJobProcessingTiming) {
  const leaseToken = job.leaseToken as string
  if (await pauseAtCheckpoint(db, job.id, leaseToken)) return true
  const candidates = report.candidates
  const candidateSyncStartedAt = performance.now()
  try { await syncCandidates(db, report) }
  finally { jobTiming.stagesMs.candidateSync = performance.now() - candidateSyncStartedAt }
  let items: any[] = []
  const jobInitializationStartedAt = performance.now()
  try {
    const selection = Array.isArray(job.selection) ? job.selection.filter((id: unknown): id is number => Number.isInteger(id)) : []
    if (job.mode === 'update-missing-animations' && !selection.length) throw new Error('Missing-animation updates require an explicit student selection.')
    const roster = await db.student.findMany({ where: { id: selection.length ? { in: selection } : { gte: 10000, lte: 99999 } }, select: { id: true } })
    await db.chibiImportItem.createMany({ data: roster.map((student: { id: number }) => ({ jobId: job.id, studentId: student.id })), skipDuplicates: true })
    const initialized = await db.chibiImportJob.updateMany({ where: { id: job.id, status: 'running', leaseToken }, data: { total: roster.length } })
    if (initialized.count !== 1) throw new Error('Import job lease was lost during initialization.')
    await db.chibiImportJob.updateMany({ where: { id: job.id, status: 'running', leaseToken, stage: { not: 'pause-requested' } }, data: { stage: 'mapping' } })
    items = await db.chibiImportItem.findMany({ where: { jobId: job.id, status: { in: ['pending', 'running'] } }, orderBy: { studentId: 'asc' }, include: { student: true } })
  } finally { jobTiming.stagesMs.jobInitialization = performance.now() - jobInitializationStartedAt }
  let coreConverterIdentity: string | null = null
  let coreConverterIdentityError: unknown = null
  let coreConverterIdentityMs = 0
  const identityPreflightRequired = job.mode !== 'audit' && items.length > 0
  if (identityPreflightRequired) {
    const startedAt = performance.now()
    try {
      const identity = await (options.coreConverterIdentity ?? getChibiCoreConverterIdentity)()
      if (!/^toolchain-v1:[0-9a-f]{64}$/.test(identity)) throw new Error('Core converter identity has an unsupported format.')
      coreConverterIdentity = identity
    } catch (error) {
      coreConverterIdentityError = error
    } finally {
      coreConverterIdentityMs = performance.now() - startedAt
    }
  }
  jobTiming.stagesMs.toolIdentity = coreConverterIdentityMs
  let preflightTimingAssigned = false
  const coreFingerprintLocks = new Map<string, Promise<void>>()
  const coreFingerprintReleasesByItemId = new Map<string, () => void>()
  const processItem = async (item: (typeof items)[number], signal: AbortSignal) => {
    // Job-level preflight is accounted once on the first row, not multiplied across the roster.
    const includeIdentityPreflight = identityPreflightRequired && !preflightTimingAssigned
    if (includeIdentityPreflight) preflightTimingAssigned = true
    const timing = newImportTiming(includeIdentityPreflight ? coreConverterIdentityMs : 0)
    if (!coreConverterIdentity && coreConverterIdentityError) {
      recordCacheFallback(timing, `Core converter identity could not be verified; cache reuse is disabled: ${coreConverterIdentityError instanceof Error ? coreConverterIdentityError.message : String(coreConverterIdentityError)}`)
    }
    signal.throwIfAborted()
    await renewLease(db, job.id, leaseToken)
    await db.chibiImportItem.update({ where: { id: item.id }, data: { stage: 'mapping', status: 'running', attempts: { increment: 1 } } })
    const finish = async (status: string, diagnostic: string | null, extra: Record<string, unknown> = {}) => finishItem(
      db, job.id, leaseToken, item.id, status, diagnostic, extra, timing,
    )
    let binding: ExistingBinding | null = null
    let decision: ReturnType<typeof mapStudentToSources> | { status: 'mapped'; source: SourceCandidate; provenance: 'manual'; profile: any }
    const mappingStartedAt = performance.now()
    binding = await db.studentChibiBinding.findUnique({ where: { studentId: item.studentId } }) as ExistingBinding | null
    const preview = job.mode === 'preview' && job.candidate && typeof job.candidate === 'object' ? job.candidate as any : null
    const previewSource = preview ? candidates.find(source => source.sourceIdentity === preview.sourceIdentity) : null
    decision = preview
      ? previewSource && preview.fingerprint === previewSource.fingerprint
        ? { status: 'mapped' as const, source: previewSource, provenance: 'manual' as const, profile: preview.profile ?? defaultProfile(previewSource) }
        : { status: 'review-required' as const, candidates: previewSource ? [previewSource] : [], reason: 'Preview candidate is missing or changed.' }
      : mapStudentToSources(item.student, candidates, binding)
    timing.stagesMs.mapping += performance.now() - mappingStartedAt
    if (decision.status !== 'mapped') {
      await finish(decision.status, decision.reason, { candidates: decision.candidates.map(candidateReference) })
      await refreshJobProgress(db, job.id, leaseToken)
      return
    }
    const candidate = decision.source
    const dependencyFingerprint = candidate.fingerprint
    let profileDecision: ReturnType<typeof sourceProfileDecision>
    try {
      profileDecision = await measureImportStage(timing, 'renderingProfile', async () => sourceProfileDecision(candidate, decision.profile))
    } catch (error) {
      await finish('failed', error instanceof Error ? error.message : String(error), { candidates: [candidateReference(candidate)] })
      await refreshJobProgress(db, job.id, leaseToken)
      return
    }
    const gap = profileDecision.gap
    let fingerprint: string
    try {
      fingerprint = buildFingerprint({ fingerprint: dependencyFingerprint }, decision.profile, binding?.overrides ?? {}, profileDecision.renderingProfile ?? undefined)
    } catch (error) {
      await finish('failed', error instanceof Error ? error.message : String(error), { candidates: [candidateReference(candidate)] })
      await refreshJobProgress(db, job.id, leaseToken)
      return
    }
    await db.chibiImportItem.update({ where: { id: item.id }, data: { sourceIdentity: candidate.sourceIdentity, candidates: [candidateReference(candidate)], fingerprint, stage: job.mode === 'audit' ? 'audited' : 'conversion' } })
    if (gap) {
      await finish(gap.status, gap.reason, { fingerprint })
      await refreshJobProgress(db, job.id, leaseToken)
      return
    }
    if (job.mode === 'audit') {
      await finish('skipped', 'Exact source mapping found; audit does not publish.', { fingerprint })
      await refreshJobProgress(db, job.id, leaseToken)
      return
    }
    let coreFingerprint: string | null = null
    const clipSelection = { ...effectiveClipSelection(decision.profile), clips: sourceAnimationClips(candidate, decision.profile) }
    if (coreConverterIdentity && profileDecision.renderingProfile?.validation.valid) {
      try {
        coreFingerprint = await measureImportStage(timing, 'coreFingerprint', async () => buildCoreFingerprint({
          sourceIdentity: candidate.sourceIdentity,
          dependencyFingerprint,
          converterVersion: `${CHIBI_CORE_CONVERTER_VERSION};exporter=${CHIBI_EXPORTER_VERSION};toolchain=${coreConverterIdentity}`,
          materialVersion: CHIBI_MATERIAL_VERSION,
          adapterVersion: CHIBI_SHADER_ADAPTER_VERSION,
          exportOverrides: binding?.overrides && typeof binding.overrides === 'object' && 'export' in binding.overrides
            ? (binding.overrides as { export: unknown }).export : {},
          profile: profileDecision.renderingProfile,
          ...clipSelection,
        }))
      } catch (error) {
        await finish('failed', error instanceof Error ? error.message : String(error), { fingerprint })
        await refreshJobProgress(db, job.id, leaseToken)
        return
      }
    }

    if (coreFingerprint && !['force-rebuild', 'preview'].includes(job.mode)) {
      const lockStartedAt = performance.now()
      try { coreFingerprintReleasesByItemId.set(item.id, await acquireJobFingerprintLock(coreFingerprintLocks, coreFingerprint)) }
      finally { timing.stagesMs.cacheLookup += performance.now() - lockStartedAt }
      signal.throwIfAborted()
    }

    let existing: any = null
    let legacyV12 = false
    const reuseAllowed = !['force-rebuild', 'preview'].includes(job.mode) && coreFingerprint !== null
    if (reuseAllowed) {
      existing = await measureImportStage(timing, 'cacheLookup', () => db.chibiAsset.findFirst({
        where: {
          sourceIdentity: candidate.sourceIdentity,
          dependencyFingerprint,
          coreFingerprint,
          coreFingerprintSchemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
          published: true,
        }, orderBy: { createdAt: 'desc' },
      }))
      if (existing) timing.cacheCandidate = 'core-fingerprint'
      if (!existing && binding) {
        const pinnedFingerprint = buildPinnedV12Fingerprint(dependencyFingerprint, binding.overrides ?? {})
        const legacy = await measureImportStage<any>(timing, 'cacheLookup', () => db.chibiAsset.findFirst({
          where: {
            sourceIdentity: candidate.sourceIdentity, dependencyFingerprint,
            exporterVersion: PINNED_V12_EXPORTER_VERSION, fingerprint: pinnedFingerprint, published: true,
          }, orderBy: { createdAt: 'desc' },
        }))
        if (legacy && legacy.coreFingerprint == null && legacy.coreFingerprintSchemaVersion == null
          && pinnedV12AssetMatches({
            asset: legacy, binding, candidate, overrides: binding.overrides ?? {}, effectiveProfile: decision.profile,
          })) {
          existing = legacy
          legacyV12 = true
          timing.cacheCandidate = 'legacy-v12-version-pinned'
        }
      }
    }
    const existingDefaultIsComplete = !!existing && isCompleteChibiArrangementDefault(existing.arrangementDefault, existing.validation)
    const sameClipSelection = !!existing && Array.isArray(existing.clips) && existing.clips.every((clip: unknown) => typeof clip === 'string')
      && new Set(existing.clips).size === existing.clips.length
      && JSON.stringify([...existing.clips].sort()) === JSON.stringify([...clipSelection.clips].sort())
    let directCacheHit = false
    let metadataArtifact: any = null
    if (reuseAllowed && existing && existingDefaultIsComplete && sameClipSelection) {
      const oldBytes = await checksumVerifiedArtifact(existing, timing)
      if (!oldBytes) {
        recordCacheFallback(timing, 'A candidate cache artifact failed its immutable checksum check.')
      } else {
        if (legacyV12 || (existing.coreFingerprint === coreFingerprint
          && existing.coreFingerprintSchemaVersion === CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION)) {
          if (!legacyV12 && existing.fingerprint === fingerprint
            && await (options.artifactIntact ?? artifactIsIntact)(existing.fileKey, existing.checksum)) {
            try {
              assertGlbCoreProfileMatches(oldBytes, profileDecision.renderingProfile)
              directCacheHit = true
            } catch (error) {
              recordCacheFallback(timing, error)
            }
          }
          if (!directCacheHit) {
            let rewritten: ReturnType<typeof rewriteGlbDiagnostics> | null = null
            try {
              rewritten = await measureImportStage(timing, 'metadataRewrite', async () => {
                if (legacyV12) assertPinnedV12GlbProfile(oldBytes, candidate.sourceIdentity, dependencyFingerprint)
                return rewriteGlbDiagnostics(oldBytes, profileDecision.renderingProfile)
              })
            } catch (error) {
              recordCacheFallback(timing, error)
            }
            if (rewritten) {
              try {
                const published = options.publishMetadataArtifact
                  ? await measureImportStage(timing, 'metadataArtifactPublication', () => options.publishMetadataArtifact!(rewritten!.bytes))
                  : await publishMetadataRevision(rewritten.bytes, timing)
                metadataArtifact = {
                  ...published, clips: existing.clips, materials: existing.materials,
                  arrangementDefault: existing.arrangementDefault,
                }
              } catch (error) {
                if (error instanceof ChibiArtifactValidationError) {
                  recordCacheFallback(timing, `Current GLB validation rejected metadata-only reuse: ${error.message}`)
                } else {
                  const diagnostic = `Metadata-only artifact publication failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 1000)
                  try {
                    await finish('failed', diagnostic, { fingerprint })
                    await refreshJobProgress(db, job.id, leaseToken)
                  } catch (recordingError) {
                    console.error(`Failed to record Chibi metadata publication failure for item ${item.id}.`, recordingError)
                    throw error
                  }
                  return
                }
              }
            }
          }
        } else {
          recordCacheFallback(timing, 'A candidate cache row has an unknown or mismatched core fingerprint schema.')
        }
      }
    }
    if (metadataArtifact) {
      try {
        await fencedPublish(db, {
          jobId: job.id, leaseToken, itemId: item.id, student: item.student, candidate,
          profile: decision.profile, fingerprint, coreFingerprint,
          coreFingerprintSchemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
          artifact: metadataArtifact, dependencyFingerprint, previousAssetId: binding?.assetId,
          provenance: decision.provenance, identityPath: item.student.pathName,
          overrides: binding?.overrides ?? {}, expectedBindingUpdatedAt: (binding as any)?.updatedAt ?? null,
          resultStatus: 'reused', processingTiming: timing,
        })
      } catch (error) {
        const status = error instanceof StaleChibiMappingError ? 'review-required' : 'failed'
        const diagnostic = `Metadata-only database publication failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 1000)
        try {
          await finish(status, diagnostic, { fingerprint })
          await refreshJobProgress(db, job.id, leaseToken)
        } catch (recordingError) {
          console.error(`Failed to record Chibi metadata database publication failure for item ${item.id}.`, recordingError)
          throw error
        }
        return
      }
      await refreshJobProgress(db, job.id, leaseToken)
      return
    }
    if (directCacheHit && existing) {
      const unchanged = !!binding && binding.assetId === existing.id && profilesEqual(binding.profile, decision.profile)
        && binding.sourceIdentity === candidate.sourceIdentity && binding.identityPath === item.student.pathName
      if (unchanged) await finish('skipped', 'Published asset and profile are unchanged.', { assetId: existing.id, fingerprint })
      else await fencedPublish(db, {
        jobId: job.id, leaseToken, itemId: item.id, student: item.student, candidate,
        profile: decision.profile, fingerprint, coreFingerprint,
        coreFingerprintSchemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
        artifact: { checksum: existing.checksum, fileKey: existing.fileKey, validation: existing.validation, clips: existing.clips, materials: existing.materials, arrangementDefault: existing.arrangementDefault },
        dependencyFingerprint, previousAssetId: binding?.assetId, provenance: decision.provenance,
        identityPath: item.student.pathName, overrides: binding?.overrides ?? {},
        expectedBindingUpdatedAt: (binding as any)?.updatedAt ?? null, resultStatus: 'reused',
        existingAssetId: existing.id, processingTiming: timing,
      })
      await refreshJobProgress(db, job.id, leaseToken)
      return
    }
    try {
      const artifact = await measureImportStage(timing, 'conversion', () => (options.convert ?? convertCandidate)({ candidate, profile: decision.profile, signal }))
      if (artifact.conversionTiming) timing.conversion = artifact.conversionTiming
      if (job.mode === 'preview') {
        const publicationStartedAt = performance.now()
        await db.$transaction(async (tx: Db) => {
          const fence = await tx.chibiImportJob.updateMany({ where: { id: job.id, status: 'running', leaseToken }, data: { heartbeatAt: new Date() } })
          if (fence.count !== 1) throw new Error('Import job lease was lost before preview publication.')
          const asset = await tx.chibiAsset.create({ data: {
            sourceIdentity: candidate.sourceIdentity, fingerprint: `${fingerprint}:preview:${job.id}`,
            coreFingerprint, coreFingerprintSchemaVersion: coreFingerprint ? CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION : null,
            dependencyFingerprint, exporterVersion: CHIBI_EXPORTER_VERSION, checksum: artifact.checksum,
            fileKey: artifact.fileKey, clips: artifact.clips, materials: artifact.materials,
            validation: artifact.validation, arrangementDefault: importedArrangementDefault(artifact.arrangementDefault, artifact.validation), published: false,
          } })
          timing.stagesMs.databasePublication += performance.now() - publicationStartedAt
          await tx.chibiImportItem.update({ where: { id: item.id }, data: {
            assetId: asset.id, fingerprint, stage: 'complete', status: 'preview-ready', diagnostic: null,
            processingTiming: persistImportTiming(timing),
          } })
        }, WORKER_TRANSACTION_OPTIONS)
      } else {
        await fencedPublish(db, {
          jobId: job.id, leaseToken, itemId: item.id, student: item.student, candidate,
          profile: decision.profile, fingerprint, coreFingerprint,
          coreFingerprintSchemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
          artifact, dependencyFingerprint, previousAssetId: binding?.assetId,
          provenance: decision.provenance, identityPath: item.student.pathName,
          overrides: binding?.overrides ?? {}, expectedBindingUpdatedAt: (binding as any)?.updatedAt ?? null,
          processingTiming: timing,
        })
      }
    } catch (error) {
      timing.conversion = getChibiConversionTiming(error)
      try {
        await finish(error instanceof StaleChibiMappingError ? 'review-required' : 'failed', error instanceof Error ? error.message : String(error), { fingerprint })
      } catch (recordingError) {
        console.error(`Failed to record Chibi import item ${item.id} after its processing error.`, recordingError)
        throw error
      }
    }
    await refreshJobProgress(db, job.id, leaseToken)
  }
  const configuredConcurrency = Number.parseInt(process.env.CHIBI_CONCURRENCY ?? '1', 10)
  const concurrency = Number.isInteger(configuredConcurrency) ? Math.min(2, Math.max(1, configuredConcurrency)) : 1
  const itemQueueStartedAt = performance.now()
  try {
    await processBoundedQueue<any>(items, concurrency, options.signal, async (item, signal) => {
      try { await processItem(item, signal) }
      finally {
        const release = coreFingerprintReleasesByItemId.get(item.id)
        coreFingerprintReleasesByItemId.delete(item.id)
        release?.()
      }
    }, async () => {
      const current = await db.chibiImportJob.findUnique({ where: { id: job.id }, select: { stage: true } })
      return current?.stage === 'pause-requested'
    })
  } finally { jobTiming.stagesMs.itemQueue = performance.now() - itemQueueStartedAt }
  if (await pauseAtCheckpoint(db, job.id, leaseToken)) return true
  const finalProgressStartedAt = performance.now()
  try { await refreshJobProgress(db, job.id, leaseToken, true) }
  finally { jobTiming.stagesMs.finalProgress = performance.now() - finalProgressStartedAt }
  return false
}
