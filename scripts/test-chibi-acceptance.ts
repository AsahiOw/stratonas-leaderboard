import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import {
  ACCEPTANCE_DATABASE_PREFIX,
  ACCEPTANCE_PROJECT_ROOT,
  assertAcceptanceEnvironment,
  assertAcceptancePhase,
  assertBaadSource,
  assertCheckpointState,
  assertExplicitOptIn,
  assertOnlyExpectedImportJob,
  assertOutsideNormalRoots,
  assertOutsideRepository,
  assertOutputEmpty,
  assertRepeatCheckpointChain,
  checkpointPath,
  outputEntries,
  type AcceptanceCheckpoint,
  type AcceptancePhase,
} from './chibi-acceptance-guards'
import {
  acceptanceRosterPlan,
  assertAcceptanceRosterMode,
  type AcceptanceRosterPlan,
} from './chibi-acceptance-roster'
import { CHIBI_RENDERING_POLICY_VERSION, CHIBI_RENDERING_PROFILE_VERSION } from '../src/lib/chibi/rendering-profile'
import acceptanceBlockerSnapshot from './chibi-acceptance-blockers.snapshot.json'
import path from 'node:path'
import {
  CHIBI_V12_MOTION_GATES,
  type SourceMotionModelHeightEvidenceV2,
} from './chibi-v12-motion-proof-core'
import {
  assertReviewedHanaeBodyRoleWitnessEvidence,
  assertReviewedHanaeBodyRoleWitnessMatchesProfile,
  verifyApprovedHanaeBodyRoleWitness,
} from './chibi-v12-body-role-witness'

const TERMINAL_JOB_STATES = new Set(['completed', 'failed'])
const SUCCESS_ITEM_STATES = new Set(['imported', 'updated', 'reused', 'skipped'])
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

type AcceptanceJob = {
  id: string
  mode: string
  status: string
  stage: string
  total: number
  processed: number
  imported: number
  updated: number
  reused: number
  skipped: number
  unavailable: number
  reviewRequired: number
  failed: number
  error: string | null
}

type AcceptanceItem = {
  id: string
  studentId: number
  stage: string
  status: string
  diagnostic: string | null
  sourceIdentity?: string | null
  fingerprint?: string | null
  candidates?: unknown
  assetId: string | null
  asset?: { id: string; checksum: string; fileKey: string; published: boolean; validation: unknown } | null
}

type JobResponse = { job: AcceptanceJob; items: AcceptanceItem[]; total: number }
type LegacyAcceptanceRecoveryProvenance = {
  version: 1
  phase: 'before-restart'
  jobId: string
  resumedAt: string
  observedTimeoutReason: string
  originalZeroStateObservation: string
  authenticationNote: string
  cleanPreflightMachineVerified: false
  cleanPreflightTranscript: 'unavailable'
}

type ResumeEvidenceReference = { path: string; bytes: number; sha256: string }

type AcceptanceRecoveryProvenance = {
  version: 2
  phase: 'before-restart'
  jobId: string
  resumedAt: string
  originalTimeoutMs: number | null
  originalTimeoutSource: 'operator-supplied' | 'not-provided'
  resumeWaitTimeoutMs: number
  evidenceReferences: ResumeEvidenceReference[]
  evidenceReferenceContentInspected: false
  originalZeroStateObservation: 'not-verified-by-resume-helper'
  authenticationNote: string
  cleanPreflightMachineVerified: false
  cleanPreflightTranscript: 'not-verified-by-resume-helper'
}

type SourceMotionProofReference = {
  path: string
  bytes: number
  sha256: string
  reportSha256: string
  schemaVersion: 2
  policyVersion: 'chibi-v12-source-motion-proof-v2'
  contentVerified: true
  consumedRows: string[]
  consumedProofs: Array<{ key: string; proofStatus: string; trackDispositions: Record<string, number> }>
}

type AcceptanceRecoveryProvenanceWithMotionProof = Omit<AcceptanceRecoveryProvenance, 'version'> & {
  version: 4
  sourceMotionProof: SourceMotionProofReference
}

type AnyAcceptanceRecoveryProvenance = LegacyAcceptanceRecoveryProvenance | AcceptanceRecoveryProvenance | AcceptanceRecoveryProvenanceWithMotionProof

type ResumeRecoveryOptions = {
  jobId: string | null
  originalTimeoutMs: number | null
  evidenceRoot: string | null
  evidencePaths: string[]
  sourceMotionProofSha256: string | null
}

type JsonRecord = Record<string, any>

type AcceptanceBlockerSnapshotRow = {
  studentId: number
  name: string
  sourceIdentity: string | null
  sourceFingerprint: string | null
  itemFingerprint: string | null
  prefabPath: string | null
  expectedStatus: 'unavailable' | 'review-required'
  diagnostic: string
}

type AcceptanceBlockerSnapshot = {
  schemaVersion: number
  snapshotVersion: string
  roster: { version: number; checksum: string; eligibleCount: number }
  source: { kind: string; inventoryVersion: number; inventorySha256: string; files: number; entries: number; candidates: number }
  profileVersion: string
  policyVersion: string
  counts: { eligible: number; mapped: number; successful: number; blocked: number; mappedBlocked: number; sourceUnavailable: number }
  rows: AcceptanceBlockerSnapshotRow[]
}

export type AcceptanceRenderingVersionContract = {
  profileVersion: string
  policyVersion: string
  jobId?: string
}

const CURRENT_RENDERING_VERSION_CONTRACT: AcceptanceRenderingVersionContract = {
  profileVersion: CHIBI_RENDERING_PROFILE_VERSION,
  policyVersion: CHIBI_RENDERING_POLICY_VERSION,
}
const V12_TERMINAL_RESUME_JOB_ID = 'cmug1gz1u0000hgkpxt74ocrt'
const V12_BLOCKER_SNAPSHOT_VERSION = 'chibi-acceptance-known-blockers-v6'
const V12_PROFILE_VERSION = 'chibi-rendering-profile-v9'
const V12_POLICY_VERSION = 'chibi-rendering-policy-v12'
const V12_ROSTER_CHECKSUM = 'f4b364bf6b0d35f41bc74c7e4bbe1aa48ded5d6c192393c910e71946211c7209'
const V12_INVENTORY_SHA256 = '9503a9218b6ebd3ce91c7b6317a0610c5f0f46332d1d70dbf1b04e0feb20d242'
const V12_BLOCKER_SNAPSHOT_SHA256 = '19857aa98b68349baf6540ce606c98af4d7a5fff8d167e26baeedbd5b9553602'
const V12_DATABASE_NAME = 'chibi-acceptance-v12-full-20260925-6d18e6c8'
const V12_RUN_ROOT = String.raw`D:\Temp\stratonas-chibi-v12-full-acceptance-20260925-6d18e6c8`
const V12_SOURCE_MOTION_PROOF_POLICY = 'chibi-v12-source-motion-proof-v2' as const
const V12_SOURCE_MOTION_PROOF_POLICY_V3 = 'chibi-v12-source-motion-proof-v3' as const
const V12_SOURCE_MOTION_PROOF_PATH = path.join(V12_RUN_ROOT, 'evidence', 'chibi-v12-source-motion-proof-v2.json')
const V12_MOTION_MATERIALITY_POLICY_ID = 'planning.md/v12-pragmatic-gates'
const V12_MOTION_GATES = CHIBI_V12_MOTION_GATES
const V12_TERMINAL_SIDECAR_SHA256 = '5c94f37650d8744a8c380eef1cd009ad5d63172a34ede34513fea7c49892cdcf'
const V12_STRUCTURAL_SWEEP_SHA256 = 'ad324ea0d3c98361048006f08d45343b34f75a2e975ec3d619382cb649c4e603'
const V12_FIVE_BUSINESS_DIGESTS = {
  ChibiAsset: { rows: 238, sha256: '14ba4af2770a755fbe0d9b1c106420f43d787ac9bcfc72e6b2f3f0ab9f837aaa' },
  StudentChibiBinding: { rows: 238, sha256: '7000ca47f1cd309a2371558cd883f826531e3d80c5945ab84b656f1d57c5af30' },
  ChibiImportJob: { rows: 1, sha256: '73e11bf553720f74678ebe99609b7bf4b5b405858027570f3d218c78b4810ed2' },
  ChibiImportItem: { rows: 275, sha256: '1434e4a15447d0ec97c0da1062bb22642d679597f5143ead658205c0c0ba5df5' },
  ChibiSourceCandidate: { rows: 871, sha256: '72bb9ffeeb89972f7bc541e3778f599df58c85e86606d9726183260332b4b385' },
} as const
const V12_METADATA_READER = '1.25.3+render-profile-v7-projectmx-weapon-e-standard-glitch-tex-matcap-additive-alpha-blend-add-equipment-renderer-references-v5'
type V12PinnedSnapshotInput = Omit<AcceptanceBlockerSnapshot, 'rows'> & { rows: readonly unknown[] }

export function v12ResumeRenderingVersionContract(
  jobId: string,
  snapshot: V12PinnedSnapshotInput = ACCEPTANCE_BLOCKER_SNAPSHOT,
): AcceptanceRenderingVersionContract {
  assert.equal(jobId, V12_TERMINAL_RESUME_JOB_ID, 'Historical v12 rendering versions are approved only for the exact terminal resume job.')
  assert.equal(snapshot.snapshotVersion, V12_BLOCKER_SNAPSHOT_VERSION, 'Historical v12 blocker snapshot version differs from the pinned terminal snapshot.')
  assert.equal(snapshot.roster.checksum, V12_ROSTER_CHECKSUM, 'Historical v12 blocker snapshot roster checksum differs from the pinned terminal snapshot.')
  assert.equal(snapshot.profileVersion, V12_PROFILE_VERSION, 'Historical v12 blocker snapshot profile version differs from the pinned terminal snapshot.')
  assert.equal(snapshot.policyVersion, V12_POLICY_VERSION, 'Historical v12 blocker snapshot policy version differs from the pinned terminal snapshot.')
  assert.equal(snapshot.source.inventorySha256, V12_INVENTORY_SHA256, 'Historical v12 blocker snapshot source inventory differs from the pinned terminal snapshot.')
  assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), V12_BLOCKER_SNAPSHOT_SHA256, 'Historical v12 blocker snapshot contents differ from the pinned terminal snapshot.')
  return { profileVersion: V12_PROFILE_VERSION, policyVersion: V12_POLICY_VERSION, jobId }
}

export function assertRepeatImportAllowed(firstJobId: string) {
  assert.notEqual(firstJobId, V12_TERMINAL_RESUME_JOB_ID, 'Repeat import is disabled for the historical v12 resume job; verify restart persistence read-only and defer repeat import to v13 acceptance or a frozen v12 worker.')
}

export function renderingVersionContractForPhase(phase: AcceptancePhase, jobId: string | null): AcceptanceRenderingVersionContract {
  if (phase === 'repeat') return CURRENT_RENDERING_VERSION_CONTRACT
  return jobId === V12_TERMINAL_RESUME_JOB_ID
    ? v12ResumeRenderingVersionContract(jobId)
    : CURRENT_RENDERING_VERSION_CONTRACT
}

/**
 * This is a generated, versioned source/profile contract.  It is deliberately
 * narrower than an "allow blocked" switch: only these exact source identities,
 * item fingerprints, statuses, and diagnostics may be recorded as blocked.
 */
const ACCEPTANCE_BLOCKER_SNAPSHOT = acceptanceBlockerSnapshot as AcceptanceBlockerSnapshot
const ACCEPTANCE_BLOCKERS_BY_STUDENT = new Map(ACCEPTANCE_BLOCKER_SNAPSHOT.rows.map(row => [row.studentId, row]))

const EXCLUSION_REASON_CODES = new Set([
  'PRESENTATION_SHADER_OR_MATERIAL',
  'PRESENTATION_MESH_10210_OR_HELPER',
])

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`) || process.argv.some(value => value.startsWith(`--${name}=`))
}

function optionValues(args: readonly string[], name: string) {
  const prefix = `--${name}=`
  const values: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument.startsWith(prefix)) values.push(argument.slice(prefix.length).trim())
    else if (argument === `--${name}`) {
      const value = args[index + 1]?.trim()
      const required = name === 'resume-job-id' ? 'a job id' : 'a value'
      assert.ok(value && !value.startsWith('--'), `--${name} requires ${required}.`)
      values.push(value)
      index += 1
    }
  }
  return values
}

function readOption(name: string, fallback: string) {
  const values = optionValues(process.argv, name)
  assert.ok(values.length <= 1, `--${name} may be provided only once.`)
  return values[0] || fallback
}

function integerOption(name: string, fallback: number) {
  const value = Number(readOption(name, String(fallback)))
  assert.ok(Number.isInteger(value) && value >= 10000 && value <= 99999, `--${name} must be an eligible five-digit student id.`)
  return value
}

function timeoutOption() {
  return timeoutMsOption(process.argv)
}

export function timeoutMsOption(args: readonly string[], fallback = DEFAULT_TIMEOUT_MS) {
  const values = optionValues(args, 'timeout-ms')
  assert.ok(values.length <= 1, '--timeout-ms may be provided only once.')
  const value = Number(values[0] || fallback)
  assert.ok(Number.isInteger(value) && value >= 5_000 && value <= 24 * 60 * 60 * 1000, '--timeout-ms must be between 5000 and 86400000.')
  return value
}

export function resumeJobIdOption(args: readonly string[], phase: AcceptancePhase) {
  const values = optionValues(args, 'resume-job-id')
  if (!values.length) return null
  assert.equal(values.length, 1, '--resume-job-id may be provided only once.')
  assert.equal(phase, 'before-restart', '--resume-job-id is only supported for --phase before-restart.')
  assert.match(values[0], /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/, '--resume-job-id must be an exact safe import job id.')
  return values[0]
}

function singleOptionalInteger(args: readonly string[], name: string, minimum: number, maximum: number) {
  const values = optionValues(args, name)
  assert.ok(values.length <= 1, `--${name} may be provided only once.`)
  if (!values.length) return null
  const value = Number(values[0])
  assert.ok(Number.isInteger(value) && value >= minimum && value <= maximum, `--${name} must be between ${minimum} and ${maximum}.`)
  return value
}

export function resumeRecoveryOptions(args: readonly string[], phase: AcceptancePhase): ResumeRecoveryOptions {
  const jobId = resumeJobIdOption(args, phase)
  const originalTimeoutMs = singleOptionalInteger(args, 'resume-original-timeout-ms', 5_000, 24 * 60 * 60 * 1000)
  const evidenceRootOptions = optionValues(args, 'resume-evidence-root')
  assert.ok(evidenceRootOptions.length <= 1, '--resume-evidence-root may be provided only once.')
  const evidenceRoot = evidenceRootOptions[0] || null
  if (evidenceRoot !== null) assert.ok(path.isAbsolute(evidenceRoot), '--resume-evidence-root must be absolute.')
  const evidencePaths = optionValues(args, 'resume-evidence-ref')
  assert.ok(evidencePaths.every(value => path.isAbsolute(value)), '--resume-evidence-ref paths must be absolute.')
  assert.equal(new Set(evidencePaths.map(value => path.resolve(value).toLowerCase())).size, evidencePaths.length, '--resume-evidence-ref may not contain duplicate paths.')
  const motionProofHashes = optionValues(args, 'resume-source-motion-proof-sha256')
  assert.ok(motionProofHashes.length <= 1, '--resume-source-motion-proof-sha256 may be provided only once.')
  const sourceMotionProofSha256 = motionProofHashes[0]?.toLowerCase() ?? null
  if (sourceMotionProofSha256 !== null) assert.match(sourceMotionProofSha256, /^[a-f0-9]{64}$/, '--resume-source-motion-proof-sha256 must be a SHA-256 digest.')
  const supplied = originalTimeoutMs !== null || evidenceRoot !== null || evidencePaths.length > 0 || sourceMotionProofSha256 !== null
  assert.ok(!supplied || jobId !== null, 'Resume timeout and evidence options require --resume-job-id.')
  assert.ok(evidencePaths.length === 0 || evidenceRoot !== null, '--resume-evidence-root is required when --resume-evidence-ref is used.')
  assert.ok(evidenceRoot === null || evidencePaths.length > 0, '--resume-evidence-root requires at least one --resume-evidence-ref.')
  if (jobId === V12_TERMINAL_RESUME_JOB_ID) {
    assert.equal(phase, 'before-restart', 'The v12 source-motion proof is consumed only while attaching to the exact before-restart job.')
    assert.ok(sourceMotionProofSha256, 'The exact v12 resume requires --resume-source-motion-proof-sha256 for the approved source-motion report.')
    assert.equal(path.resolve(evidenceRoot ?? '').toLowerCase(), path.resolve(V12_RUN_ROOT).toLowerCase(), 'The v12 source-motion proof requires the exact isolated evidence root.')
    assert.ok(evidencePaths.some(value => path.resolve(value).toLowerCase() === path.resolve(V12_SOURCE_MOTION_PROOF_PATH).toLowerCase()), 'The v12 source-motion proof file must be included in --resume-evidence-ref.')
  } else {
    assert.equal(sourceMotionProofSha256, null, 'The v12 source-motion proof may not be used for another job.')
  }
  return { jobId, originalTimeoutMs, evidenceRoot, evidencePaths, sourceMotionProofSha256 }
}

export function assertResumableJobIdentity(expectedJobId: string, job: Pick<AcceptanceJob, 'id' | 'mode'>) {
  assert.equal(job.id, expectedJobId, 'The Admin import endpoint returned a different job than --resume-job-id.')
  assert.equal(job.mode, 'update', 'Only an existing Import / Update job can be resumed by the acceptance harness.')
}

const RECOVERY_AUTHENTICATION_NOTE = 'The resumed browser uses CHIBI_TEST_EMAIL and CHIBI_TEST_PASSWORD for a fresh login; credential values are not recorded, and the helper does not determine whether the original session or credentials were available.'

export function createRecoveryProvenance(
  jobId: string,
  resumedAt = new Date().toISOString(),
  options: { originalTimeoutMs?: number | null; resumeWaitTimeoutMs?: number; evidenceReferences?: ResumeEvidenceReference[]; sourceMotionProof?: SourceMotionProofReference } = {},
): AcceptanceRecoveryProvenance | AcceptanceRecoveryProvenanceWithMotionProof {
  assert.match(jobId, /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/, 'Recovery provenance requires an exact safe import job id.')
  assert.ok(!Number.isNaN(Date.parse(resumedAt)), 'Recovery provenance requires a valid resume timestamp.')
  const originalTimeoutMs = options.originalTimeoutMs ?? null
  const resumeWaitTimeoutMs = options.resumeWaitTimeoutMs ?? DEFAULT_TIMEOUT_MS
  assert.ok(originalTimeoutMs === null || (Number.isInteger(originalTimeoutMs) && originalTimeoutMs >= 5_000 && originalTimeoutMs <= 24 * 60 * 60 * 1000), 'Recovery provenance original timeout is invalid.')
  assert.ok(Number.isInteger(resumeWaitTimeoutMs) && resumeWaitTimeoutMs >= 5_000 && resumeWaitTimeoutMs <= 24 * 60 * 60 * 1000, 'Recovery provenance resume wait timeout is invalid.')
  const provenance: AcceptanceRecoveryProvenance = {
    version: 2,
    phase: 'before-restart',
    jobId,
    resumedAt,
    originalTimeoutMs,
    originalTimeoutSource: originalTimeoutMs === null ? 'not-provided' : 'operator-supplied',
    resumeWaitTimeoutMs,
    evidenceReferences: options.evidenceReferences ?? [],
    evidenceReferenceContentInspected: false,
    originalZeroStateObservation: 'not-verified-by-resume-helper',
    authenticationNote: RECOVERY_AUTHENTICATION_NOTE,
    cleanPreflightMachineVerified: false,
    cleanPreflightTranscript: 'not-verified-by-resume-helper',
  }
  if (!options.sourceMotionProof) return provenance
  assert.equal(jobId, V12_TERMINAL_RESUME_JOB_ID, 'Source-motion proof provenance is limited to the exact historical v12 job.')
  assertSourceMotionProofReference(options.sourceMotionProof, options.evidenceReferences ?? [])
  return { ...provenance, version: 4, sourceMotionProof: options.sourceMotionProof }
}

function assertSourceMotionProofReference(value: unknown, evidenceReferences: readonly ResumeEvidenceReference[]) {
  const reference = asRecord(value, 'Source-motion proof provenance')
  assert.equal(path.resolve(reference.path).toLowerCase(), path.resolve(V12_SOURCE_MOTION_PROOF_PATH).toLowerCase(), 'Source-motion proof provenance path is not the pinned v12 report.')
  assert.ok(Number.isInteger(reference.bytes) && reference.bytes > 0, 'Source-motion proof provenance byte count is invalid.')
  assert.match(reference.sha256, /^[a-f0-9]{64}$/i, 'Source-motion proof provenance file SHA-256 is invalid.')
  assert.match(reference.reportSha256, /^[a-f0-9]{64}$/i, 'Source-motion proof provenance report SHA-256 is invalid.')
  assert.equal(reference.schemaVersion, 2, 'Source-motion proof provenance schema version is unsupported.')
  assert.equal(reference.policyVersion, V12_SOURCE_MOTION_PROOF_POLICY, 'Source-motion proof provenance policy version is unsupported.')
  assert.equal(reference.contentVerified, true, 'Source-motion proof provenance must disclose independent content verification.')
  assert.ok(Array.isArray(reference.consumedRows) && reference.consumedRows.length > 0 && reference.consumedRows.every((row: unknown) => typeof row === 'string' && row), 'Source-motion proof provenance must list consumed exact action rows.')
  assert.equal(new Set(reference.consumedRows).size, reference.consumedRows.length, 'Source-motion proof provenance repeats a consumed action row.')
  assert.deepEqual(reference.consumedRows, [...reference.consumedRows].sort(), 'Source-motion proof provenance consumed rows are not deterministic.')
  assert.ok(Array.isArray(reference.consumedProofs) && reference.consumedProofs.length === reference.consumedRows.length, 'Source-motion proof provenance must attest each consumed proof status and track disposition.')
  assert.deepEqual(reference.consumedProofs.map((item: JsonRecord) => item.key), [...reference.consumedRows].sort(), 'Source-motion proof status attestations do not match sorted consumed rows.')
  for (const [index, itemValue] of (reference.consumedProofs as unknown[]).entries()) {
    const item = asRecord(itemValue, `Source-motion proof provenance consumedProofs[${index}]`)
    assert.ok(['static', 'outside-subtree-untargeted'].includes(item.proofStatus), `Source-motion proof provenance consumed proof ${index} has an unsupported status.`)
    const dispositions = asRecord(item.trackDispositions, `Source-motion proof provenance consumedProofs[${index}].trackDispositions`)
    assert.ok(Object.entries(dispositions).every(([key, count]) =>
      ['preserved-glb', 'bounded-source-to-static'].includes(key) && Number.isInteger(count) && count >= 0), `Source-motion proof provenance consumed proof ${index} track dispositions are invalid.`)
  }
  assert.ok(evidenceReferences.some(item => path.resolve(item.path).toLowerCase() === path.resolve(reference.path).toLowerCase()
    && item.bytes === reference.bytes && item.sha256.toLowerCase() === reference.sha256.toLowerCase()), 'Source-motion proof provenance must match its hash-only evidence reference.')
  return reference as unknown as SourceMotionProofReference
}

function assertLegacyRecoveryProvenance(provenance: JsonRecord) {
  const jobId = provenance.jobId as string
  assert.equal(provenance.observedTimeoutReason, 'The original canonical before-restart waiter exited at its default 30-minute timeout before the durable import job reached terminal; no checkpoint was written.', 'Legacy recovery provenance timeout reason is unsupported.')
  assert.equal(provenance.originalZeroStateObservation, 'The original invocation reportedly checked zero state before queuing this job, but its transcript/report was not retained; this observation is not machine-verified.', 'Legacy recovery provenance zero-state caveat is unsupported.')
  assert.equal(provenance.authenticationNote, 'Recovery used a newly created disposable admin in the isolated acceptance database because the original session-only credentials were unavailable; the original login was not reused. The generated credentials are not recorded here.', 'Legacy recovery provenance authentication note is unsupported.')
  assert.equal(provenance.cleanPreflightMachineVerified, false, 'Legacy recovery provenance must not claim machine-verified clean preflight evidence.')
  assert.equal(provenance.cleanPreflightTranscript, 'unavailable', 'Legacy recovery provenance must disclose that its original preflight transcript was unavailable.')
  return provenance as unknown as LegacyAcceptanceRecoveryProvenance
}

export function assertRecoveryProvenance(value: unknown, expectedJobId?: string): AnyAcceptanceRecoveryProvenance {
  const provenance = asRecord(value, 'Recovery provenance')
  assert.ok(provenance.version === 1 || provenance.version === 2 || provenance.version === 4, 'Recovery provenance version is unsupported.')
  assert.equal(provenance.phase, 'before-restart', 'Recovery provenance phase is unsupported.')
  assert.match(provenance.jobId, /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/, 'Recovery provenance job id is invalid.')
  if (expectedJobId) assert.equal(provenance.jobId, expectedJobId, 'Recovery provenance belongs to a different import job.')
  assert.ok(typeof provenance.resumedAt === 'string' && !Number.isNaN(Date.parse(provenance.resumedAt)), 'Recovery provenance resume timestamp is invalid.')
  if (provenance.version === 1) return assertLegacyRecoveryProvenance(provenance)
  assert.ok(provenance.originalTimeoutMs === null || (Number.isInteger(provenance.originalTimeoutMs) && provenance.originalTimeoutMs >= 5_000 && provenance.originalTimeoutMs <= 24 * 60 * 60 * 1000), 'Recovery provenance original timeout is invalid.')
  assert.equal(provenance.originalTimeoutSource, provenance.originalTimeoutMs === null ? 'not-provided' : 'operator-supplied', 'Recovery provenance original timeout source is invalid.')
  assert.ok(Number.isInteger(provenance.resumeWaitTimeoutMs) && provenance.resumeWaitTimeoutMs >= 5_000 && provenance.resumeWaitTimeoutMs <= 24 * 60 * 60 * 1000, 'Recovery provenance resume wait timeout is invalid.')
  assert.ok(Array.isArray(provenance.evidenceReferences), 'Recovery provenance evidence references must be an array.')
  const references = provenance.evidenceReferences as JsonRecord[]
  for (const reference of references) {
    assert.ok(reference && typeof reference === 'object' && !Array.isArray(reference), 'Recovery evidence reference must be an object.')
    assert.ok(typeof reference.path === 'string' && path.isAbsolute(reference.path), 'Recovery evidence reference path must be absolute.')
    assert.ok(Number.isInteger(reference.bytes) && reference.bytes >= 0, 'Recovery evidence reference byte count is invalid.')
    assert.match(reference.sha256, /^[a-f0-9]{64}$/i, 'Recovery evidence reference SHA-256 is invalid.')
  }
  assert.equal(provenance.evidenceReferenceContentInspected, false, 'Recovery provenance may not claim that evidence contents were interpreted.')
  assert.equal(provenance.originalZeroStateObservation, 'not-verified-by-resume-helper', 'Recovery provenance must not assert an original zero-state observation.')
  assert.equal(provenance.authenticationNote, RECOVERY_AUTHENTICATION_NOTE, 'Recovery provenance authentication note is unsupported.')
  assert.equal(provenance.cleanPreflightMachineVerified, false, 'Recovery provenance must not claim machine-verified clean preflight evidence.')
  assert.equal(provenance.cleanPreflightTranscript, 'not-verified-by-resume-helper', 'Recovery provenance must not claim an original preflight transcript was verified.')
  if (provenance.version === 4) {
    assert.equal(provenance.jobId, V12_TERMINAL_RESUME_JOB_ID, 'Source-motion proof provenance is limited to the exact historical v12 job.')
    assertSourceMotionProofReference(provenance.sourceMotionProof, references as unknown as ResumeEvidenceReference[])
  }
  return provenance as unknown as AnyAcceptanceRecoveryProvenance
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function localOrigin() {
  const origin = process.env.CHIBI_TEST_ORIGIN || 'http://127.0.0.1:3000'
  const parsed = new URL(origin)
  assert.ok(['localhost', '127.0.0.1'].includes(parsed.hostname), 'Acceptance browser checks run against localhost only.')
  assert.ok(!parsed.username && !parsed.password, 'CHIBI_TEST_ORIGIN must not embed credentials.')
  return origin.replace(/\/$/, '')
}

function databaseClient() {
  const connectionString = process.env.DATABASE_URL
  assert.ok(connectionString, 'DATABASE_URL is required.')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

function acceptanceDatabaseScope(database: { databaseName: string; schema: string; searchPath: string }) {
  return ACCEPTANCE_DATABASE_PREFIX.test(database.schema)
    ? database.schema
    : ACCEPTANCE_DATABASE_PREFIX.test(database.searchPath)
      ? database.searchPath
      : database.schema || database.searchPath || 'public'
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? String(value)
}

function asRecord(value: unknown, label: string): JsonRecord {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object.`)
  return value as JsonRecord
}

function canonicalSourceMotionJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalSourceMotionJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
      .map(key => `${JSON.stringify(key)}:${canonicalSourceMotionJson((value as JsonRecord)[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? String(value)
}

export function sourceMotionProofReportSha256(value: unknown) {
  const report = asRecord(value, 'Source-motion proof report')
  const digestInput = { ...report }
  delete digestInput.generatedAt
  delete digestInput.reportSha256
  return createHash('sha256').update(canonicalSourceMotionJson(digestInput), 'utf8').digest('hex')
}

export function sourceMotionProofPathSha256(value: unknown) {
  assert.ok(Array.isArray(value), 'Source-motion proof path must be an array.')
  return createHash('sha256').update(canonicalSourceMotionJson(value), 'utf8').digest('hex')
}

function crc32Path(pathTokens: readonly string[]) {
  let crc = 0xffffffff
  for (const byte of Buffer.from(pathTokens.join('/'), 'utf8')) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function sourceMotionRowKey(row: JsonRecord) {
  return stableJson([
    row.studentId,
    sourceReferenceKey(row.renderer?.sourceReference, 'Source-motion proof renderer sourceReference'),
    row.action?.id,
    row.action?.clip,
  ])
}

function dispositionCounts(row: JsonRecord) {
  const counts: Record<string, number> = {}
  for (const track of row.tracks as JsonRecord[]) counts[track.disposition] = (counts[track.disposition] ?? 0) + 1
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)))
}

function sourcePathAnimatorRelation(animatorPathKeys: readonly string[], targetPathKeys: readonly string[]) {
  const animatorIsPrefix = animatorPathKeys.length <= targetPathKeys.length && animatorPathKeys.every((key, index) => targetPathKeys[index] === key)
  if (animatorIsPrefix) return 'inside-animator-subtree'
  const targetIsProperPrefix = targetPathKeys.length < animatorPathKeys.length && targetPathKeys.every((key, index) => animatorPathKeys[index] === key)
  return targetIsProperPrefix ? 'ancestor-of-animator-root' : 'disjoint'
}

function assertSourceMotionModelHeightEvidence(value: unknown, modelHeightUnits: number, label: string): SourceMotionModelHeightEvidenceV2 {
  const evidence = asRecord(value, `${label} modelHeightEvidence`)
  if (evidence.selector === 'reviewed-isolated-glb-body-role-witness-v1') {
    assertReviewedHanaeBodyRoleWitnessEvidence(evidence, modelHeightUnits, label)
    return evidence as SourceMotionModelHeightEvidenceV2
  }
  assert.equal(evidence.selector, 'equipmentBindingEvidence.bodyRendererReferences', `${label} model-height selector is unsupported.`)
  assert.ok(Array.isArray(evidence.rendererReferences) && evidence.rendererReferences.length > 0, `${label} body renderer references are missing.`)
  const referenceKeys = evidence.rendererReferences.map((reference: unknown, index: number) => sourceReferenceKey(reference, `${label} body renderer reference ${index}`))
  assert.equal(new Set(referenceKeys).size, referenceKeys.length, `${label} repeats a body renderer reference.`)
  assert.ok(Array.isArray(evidence.glbNodeIndices) && evidence.glbNodeIndices.length === referenceKeys.length
    && evidence.glbNodeIndices.every((node: unknown) => typeof node === 'number' && Number.isInteger(node) && node >= 0), `${label} body GLB nodes do not exactly cover its body renderer references.`)
  assert.equal(new Set(evidence.glbNodeIndices).size, evidence.glbNodeIndices.length, `${label} repeats a body GLB node.`)
  const measurement = asRecord(evidence.measurement, `${label} body measurement`)
  for (const field of ['minY', 'maxY', 'height'] as const) assert.ok(Number.isFinite(measurement[field]), `${label} body measurement ${field} is invalid.`)
  assert.ok(measurement.maxY > measurement.minY && measurement.height > 0, `${label} body height is not positive.`)
  assert.equal(measurement.height, measurement.maxY - measurement.minY, `${label} body measurement height differs from its extrema.`)
  assert.ok(Number.isInteger(measurement.vertexCount) && measurement.vertexCount > 0, `${label} body measurement vertex count is invalid.`)
  assert.equal(modelHeightUnits, measurement.height, `${label} modelHeightUnits differs from the exact body measurement.`)
  return evidence as unknown as SourceMotionModelHeightEvidenceV2
}

function assertMotionSample(value: unknown, label: string) {
  const sample = asRecord(value, label)
  assert.ok(Number.isFinite(sample.timeSec) && sample.timeSec >= 0, `${label}.timeSec is invalid.`)
  assert.ok(['key', 'midpoint', 'cubic-extremum'].includes(sample.kind), `${label}.kind is invalid.`)
  for (const space of ['source', 'glb']) {
    const transform = asRecord(sample[space], `${label}.${space}`)
    for (const [field, length] of [['translation', 3], ['rotation', 4], ['scale', 3]] as const) {
      assert.ok(Array.isArray(transform[field]) && transform[field].length === length
        && transform[field].every((item: unknown) => typeof item === 'number' && Number.isFinite(item)), `${label}.${space}.${field} is invalid.`)
    }
  }
  return sample
}

function assertSourceMotionProofRowShape(value: unknown, index: number, schemaVersion: 2 | 3) {
  const row = asRecord(value, `Source-motion proof row ${index}`)
  assert.ok(Number.isInteger(row.studentId) && row.studentId >= 10000 && row.studentId <= 99999, `Source-motion proof row ${index} studentId is invalid.`)
  assert.ok(typeof row.sourceIdentity === 'string' && row.sourceIdentity.trim(), `Source-motion proof row ${index} sourceIdentity is missing.`)
  const asset = asRecord(row.asset, `Source-motion proof row ${index} asset`)
  assert.ok(typeof asset.assetId === 'string' && asset.assetId, `Source-motion proof row ${index} assetId is missing.`)
  assert.ok(typeof asset.revision === 'string' && asset.revision, `Source-motion proof row ${index} asset revision is missing.`)
  assert.match(asset.sha256, /^[a-f0-9]{64}$/i, `Source-motion proof row ${index} asset SHA-256 is invalid.`)
  assert.match(row.profileSha256, /^[a-f0-9]{64}$/i, `Source-motion proof row ${index} profile SHA-256 is invalid.`)
  const renderer = asRecord(row.renderer, `Source-motion proof row ${index} renderer`)
  assert.ok(typeof renderer.sourceKey === 'string' && renderer.sourceKey, `Source-motion proof row ${index} renderer sourceKey is missing.`)
  assert.equal(sourceReferenceKey(renderer.sourceReference, `Source-motion proof row ${index} renderer sourceReference`), renderer.sourceKey, `Source-motion proof row ${index} renderer sourceKey differs from its exact source reference.`)
  const action = asRecord(row.action, `Source-motion proof row ${index} action`)
  assert.ok(typeof action.id === 'string' && action.id, `Source-motion proof row ${index} action id is missing.`)
  assert.ok(typeof action.clip === 'string' && action.clip, `Source-motion proof row ${index} action clip is missing.`)
  const selectedPrefab = asRecord(row.selectedPrefab, `Source-motion proof row ${index} selectedPrefab`)
  assert.ok(typeof selectedPrefab.path === 'string' && selectedPrefab.path, `Source-motion proof row ${index} selected prefab path is missing.`)
  sourceReferenceKey(selectedPrefab.sourceReference, `Source-motion proof row ${index} prefab sourceReference`)
  const rootTransformKey = sourceReferenceKey(selectedPrefab.rootTransformReference, `Source-motion proof row ${index} prefab rootTransformReference`)
  const animator = asRecord(row.animator, `Source-motion proof row ${index} animator`)
  const componentKey = sourceReferenceKey(animator.componentReference, `Source-motion proof row ${index} animator componentReference`)
  const animatorRootKey = sourceReferenceKey(animator.rootReference, `Source-motion proof row ${index} animator rootReference`)
  const controllerKey = sourceReferenceKey(animator.controllerReference, `Source-motion proof row ${index} animator controllerReference`)
  assert.equal(animator.matchingAnimatorCount, 1, `Source-motion proof row ${index} does not identify exactly one Animator bound to the selected clip.`)
  assert.equal(animator.matchingClipCount, 1, `Source-motion proof row ${index} controller graph does not identify exactly one effective selected clip.`)
  const controllerGraph = asRecord(animator.controllerGraph, `Source-motion proof row ${index} animator controllerGraph`)
  assert.equal(controllerGraph.complete, true, `Source-motion proof row ${index} controller graph is incomplete.`)
  assert.match(controllerGraph.sha256, /^[a-f0-9]{64}$/i, `Source-motion proof row ${index} controller graph SHA-256 is invalid.`)
  assert.ok(Array.isArray(controllerGraph.references) && controllerGraph.references.length > 0, `Source-motion proof row ${index} controller graph references are missing.`)
  const controllerGraphKeys = (controllerGraph.references as unknown[]).map((reference, refIndex) => sourceReferenceKey(reference, `Source-motion proof row ${index} controller graph reference ${refIndex}`))
  assert.equal(new Set(controllerGraphKeys).size, controllerGraphKeys.length, `Source-motion proof row ${index} controller graph repeats an exact reference.`)
  assert.ok(controllerGraphKeys.includes(controllerKey), `Source-motion proof row ${index} controller graph omits its exact selected controller.`)
  const clipReferenceLists = ['clipReferences', 'effectiveClipReferences'] as const
  for (const field of clipReferenceLists) {
    assert.ok(Array.isArray(controllerGraph[field]) && controllerGraph[field].length > 0, `Source-motion proof row ${index} controller graph ${field} are missing.`)
  }
  assert.ok(Array.isArray(animator.path) && animator.path.length > 0, `Source-motion proof row ${index} animator path is empty.`)
  const animatorPath = animator.path as unknown[]
  const animatorPathNames: string[] = []
  const animatorPathKeys = animatorPath.map((tokenValue, pathIndex) => {
    const token = asRecord(tokenValue, `Source-motion proof row ${index} animator path ${pathIndex}`)
    assert.ok(typeof token.name === 'string' && token.name, `Source-motion proof row ${index} animator path ${pathIndex} name is missing.`)
    animatorPathNames.push(token.name)
    return sourceReferenceKey(token.sourceReference, `Source-motion proof row ${index} animator path ${pathIndex} sourceReference`)
  })
  assert.equal(new Set(animatorPathKeys).size, animatorPathKeys.length, `Source-motion proof row ${index} animator path contains a cycle or duplicate source transform.`)
  assert.equal(animatorPathKeys[0], rootTransformKey, `Source-motion proof row ${index} animator path does not begin at its exact prefab root Transform.`)
  assert.equal(animatorPathKeys.at(-1), animatorRootKey, `Source-motion proof row ${index} animator path does not end at its exact rootReference.`)
  const sourceClip = asRecord(row.sourceClip, `Source-motion proof row ${index} sourceClip`)
  assert.equal(sourceClip.name, action.clip, `Source-motion proof row ${index} source clip differs from its persisted action profile.`)
  const sourceClipKey = sourceReferenceKey(sourceClip.sourceReference, `Source-motion proof row ${index} source clip sourceReference`)
  assert.equal(sourceReferenceKey(animator.selectedClipReference, `Source-motion proof row ${index} selectedClipReference`), sourceClipKey, `Source-motion proof row ${index} selected controller clip differs from its exact source clip.`)
  for (const field of clipReferenceLists) {
    const keys = (controllerGraph[field] as unknown[]).map((reference, referenceIndex) => sourceReferenceKey(reference, `Source-motion proof row ${index} controller graph ${field}[${referenceIndex}]`))
    assert.equal(new Set(keys).size, keys.length, `Source-motion proof row ${index} controller graph ${field} repeat an exact clip reference.`)
    assert.ok(keys.includes(sourceClipKey), `Source-motion proof row ${index} controller graph ${field} omit the selected source clip.`)
  }
  const clipRange = asRecord(row.sourceClipRange, `Source-motion proof row ${index} sourceClipRange`)
  assert.ok(Number.isFinite(clipRange.startTimeSec) && clipRange.startTimeSec >= 0, `Source-motion proof row ${index} source clip start time is invalid.`)
  assert.ok(Number.isFinite(clipRange.stopTimeSec) && clipRange.stopTimeSec >= clipRange.startTimeSec, `Source-motion proof row ${index} source clip stop time is invalid.`)
  assert.ok(['static', 'unresolved', 'outside-subtree-untargeted'].includes(row.proofStatus), `Source-motion proof row ${index} proofStatus is invalid.`)
  assert.ok(Array.isArray(row.scopeTransforms) && row.scopeTransforms.length > 0, `Source-motion proof row ${index} scopeTransforms is empty.`)
  const scopeByReference = new Map<string, JsonRecord>()
  for (const [scopeIndex, scopeValue] of (row.scopeTransforms as unknown[]).entries()) {
    const scope = asRecord(scopeValue, `Source-motion proof row ${index} scope transform ${scopeIndex}`)
    const scopeReference = sourceReferenceKey(scope.sourceReference, `Source-motion proof row ${index} scope transform ${scopeIndex} sourceReference`)
    assert.ok(typeof scope.name === 'string' && scope.name, `Source-motion proof row ${index} scope transform ${scopeIndex} name is missing.`)
    assert.ok(Array.isArray(scope.roles) && scope.roles.length > 0 && scope.roles.every((role: unknown) => typeof role === 'string' && role), `Source-motion proof row ${index} scope transform ${scopeIndex} roles are invalid.`)
    assert.ok(Array.isArray(scope.animationPathTokens) && scope.animationPathTokens.every((token: unknown) => typeof token === 'string' && token), `Source-motion proof row ${index} scope transform ${scopeIndex} animationPathTokens are invalid.`)
    assert.ok(Array.isArray(scope.path) && scope.path.length > 0, `Source-motion proof row ${index} scope transform ${scopeIndex} path is empty.`)
    const pathKeys: string[] = []
    for (const [pathIndex, tokenValue] of (scope.path as unknown[]).entries()) {
      const token = asRecord(tokenValue, `Source-motion proof row ${index} scope path ${scopeIndex}:${pathIndex}`)
      assert.ok(typeof token.name === 'string' && token.name, `Source-motion proof row ${index} scope path ${scopeIndex}:${pathIndex} name is missing.`)
      pathKeys.push(sourceReferenceKey(token.sourceReference, `Source-motion proof row ${index} scope path ${scopeIndex}:${pathIndex} sourceReference`))
    }
    assert.equal(new Set(pathKeys).size, pathKeys.length, `Source-motion proof row ${index} scope path ${scopeIndex} contains a cycle or duplicate source transform.`)
    assert.equal(pathKeys[0], sourceReferenceKey(selectedPrefab.rootTransformReference, `Source-motion proof row ${index} prefab rootTransformReference`), `Source-motion proof row ${index} scope path ${scopeIndex} does not begin at its exact selected prefab root transform.`)
    assert.equal(pathKeys[pathKeys.length - 1], scopeReference, `Source-motion proof row ${index} scope path ${scopeIndex} does not end at its exact transform.`)
    assert.equal((scope.path as JsonRecord[]).at(-1)?.name, scope.name, `Source-motion proof row ${index} scope path ${scopeIndex} leaf name differs from its transform.`)
    assert.match(scope.pathSha256, /^[a-f0-9]{64}$/i, `Source-motion proof row ${index} scope path ${scopeIndex} SHA-256 is invalid.`)
    assert.equal(sourceMotionProofPathSha256(scope.path), scope.pathSha256.toLowerCase(), `Source-motion proof row ${index} scope path ${scopeIndex} digest differs from its ordered exact path.`)
    assert.ok(!scopeByReference.has(scopeReference), `Source-motion proof row ${index} repeats a scope transform identity.`)
    const animatorRelation = sourcePathAnimatorRelation(animatorPathKeys, pathKeys)
    assert.equal(scope.animatorRelation, animatorRelation, `Source-motion proof row ${index} scope transform ${scopeIndex} Animator relation differs from its exact source-reference paths.`)
    let sharedPathLength = 0
    while (sharedPathLength < animatorPathKeys.length && sharedPathLength < pathKeys.length
      && animatorPathKeys[sharedPathLength] === pathKeys[sharedPathLength]) sharedPathLength += 1
    assert.deepEqual((scope.path as JsonRecord[]).slice(0, sharedPathLength).map(token => token.name), animatorPathNames.slice(0, sharedPathLength), `Source-motion proof row ${index} scope and Animator paths disagree on a shared Transform name.`)
    const expectedAnimationPathTokens = animatorRelation === 'inside-animator-subtree'
      ? (scope.path as JsonRecord[]).slice(animatorPath.length).map(token => token.name)
      : []
    if (scope.animationPathTokens !== undefined) assert.deepEqual(scope.animationPathTokens, expectedAnimationPathTokens, `Source-motion proof row ${index} scope path tokens do not match the exact Animator-root path suffix.`)
    assert.ok(Number.isInteger(scope.glbNodeIndex) && scope.glbNodeIndex >= 0, `Source-motion proof row ${index} scope transform ${scopeIndex} GLB node index is invalid.`)
    scopeByReference.set(scopeReference, scope)
  }
  const curveSet = asRecord(row.curveSet, `Source-motion proof row ${index} curveSet`)
  assert.ok(typeof curveSet.complete === 'boolean', `Source-motion proof row ${index} curve-set completeness is invalid.`)
  assert.ok(curveSet.coverageStatus === 'complete' || curveSet.coverageStatus === 'incomplete', `Source-motion proof row ${index} curve-set coverage status is invalid.`)
  assert.ok(Number.isInteger(curveSet.totalBindingCount) && curveSet.totalBindingCount >= 0, `Source-motion proof row ${index} totalBindingCount is invalid.`)
  assert.ok(Number.isInteger(curveSet.genericBindingCount) && curveSet.genericBindingCount >= 0, `Source-motion proof row ${index} genericBindingCount is invalid.`)
  assert.ok(Number.isInteger(curveSet.directCurveCount) && curveSet.directCurveCount >= 0, `Source-motion proof row ${index} directCurveCount is invalid.`)
  assert.equal(curveSet.genericBindingCount + curveSet.directCurveCount, curveSet.totalBindingCount, `Source-motion proof row ${index} generic/direct counts differ from totalBindingCount.`)
  assert.ok(Number.isInteger(curveSet.relevantTrackCount) && curveSet.relevantTrackCount >= 0 && curveSet.relevantTrackCount <= curveSet.totalBindingCount, `Source-motion proof row ${index} relevantTrackCount is invalid.`)
  assert.ok(Number.isInteger(curveSet.unresolvedRelevantCount) && curveSet.unresolvedRelevantCount >= 0, `Source-motion proof row ${index} unresolvedRelevantCount is invalid.`)
  assert.match(curveSet.sha256, /^[a-f0-9]{64}$/i, `Source-motion proof row ${index} curve-set SHA-256 is invalid.`)
  assert.ok(Array.isArray(curveSet.decoderDiagnostics) && curveSet.decoderDiagnostics.every((diagnostic: unknown) => typeof diagnostic === 'string'), `Source-motion proof row ${index} decoderDiagnostics are invalid.`)
  assert.ok(Array.isArray(row.tracks), `Source-motion proof row ${index} tracks must be an array.`)
  assert.equal(row.tracks.length, curveSet.totalBindingCount, `Source-motion proof row ${index} omits one or more source clip bindings.`)
  const requiredScopeKeys = new Set((row.scopeTransforms as JsonRecord[]).filter(scope =>
    Array.isArray(scope.roles) && scope.roles.some((role: string) => ['renderer', 'rootBone', 'rootBoneAncestry', 'skinJoint', 'ancestor'].includes(role)))
    .map(scope => sourceReferenceKey(scope.sourceReference, `Source-motion proof row ${index} required scope reference`)))
  const curveIndices = new Set<number>()
  for (const [trackIndex, trackValue] of (row.tracks as unknown[]).entries()) {
    const track = asRecord(trackValue, `Source-motion proof row ${index} track ${trackIndex}`)
    assert.ok(Number.isInteger(track.curveIndex) && track.curveIndex >= 0, `Source-motion proof row ${index} track ${trackIndex} curveIndex is invalid.`)
    assert.ok(!curveIndices.has(track.curveIndex), `Source-motion proof row ${index} repeats source curve index ${track.curveIndex}.`)
    curveIndices.add(track.curveIndex)
    assert.ok(track.bindingPathHash === null || (Number.isInteger(track.bindingPathHash) && track.bindingPathHash >= 0 && track.bindingPathHash <= 0xffffffff), `Source-motion proof row ${index} track ${trackIndex} bindingPathHash is invalid.`)
    assert.ok(track.pathTokens === null || (Array.isArray(track.pathTokens) && track.pathTokens.every((token: unknown) => typeof token === 'string' && token)), `Source-motion proof row ${index} track ${trackIndex} pathTokens are invalid.`)
    assert.ok(['constant', 'dynamic', 'unresolved'].includes(track.valueClass), `Source-motion proof row ${index} track ${trackIndex} valueClass is invalid.`)
    assert.ok(typeof track.component === 'string' && track.component, `Source-motion proof row ${index} track ${trackIndex} component is missing.`)
    assert.ok(typeof track.property === 'string' && track.property, `Source-motion proof row ${index} track ${trackIndex} property is missing.`)
    assert.ok(typeof track.bindingKind === 'string' && track.bindingKind, `Source-motion proof row ${index} track ${trackIndex} bindingKind is missing.`)
    assert.ok(typeof track.sourceKind === 'string' && track.sourceKind, `Source-motion proof row ${index} track ${trackIndex} sourceKind is missing.`)
    assert.ok(Array.isArray(track.sourceCurves), `Source-motion proof row ${index} track ${trackIndex} sourceCurves must be an array.`)
    assert.match(track.valuesSha256, /^[a-f0-9]{64}$/i, `Source-motion proof row ${index} track ${trackIndex} values SHA-256 is invalid.`)
    assert.ok(Number.isInteger(track.sampleCount) && track.sampleCount >= 0, `Source-motion proof row ${index} track ${trackIndex} sampleCount is invalid.`)
    const v2Dispositions = ['preserved-glb', 'bounded-source-to-static', 'exact-static', 'unresolved']
    const v3Dispositions = [...v2Dispositions, 'exact-static-channel', 'bounded-source-to-glb-channel']
    assert.ok((schemaVersion === 2 ? v2Dispositions : v3Dispositions).includes(track.disposition), `Source-motion proof row ${index} track ${trackIndex} disposition is invalid for schema ${schemaVersion}.`)
    assert.ok(Array.isArray(track.glbChannels), `Source-motion proof row ${index} track ${trackIndex} glbChannels must be an array.`)
    if (track.disposition === 'exact-static-channel' || track.disposition === 'bounded-source-to-glb-channel') {
      assert.equal(schemaVersion, 3, `Source-motion proof row ${index} track ${trackIndex} uses a v3 disposition in a legacy report.`)
      assert.equal(track.glbChannels.length, 1, `Source-motion proof row ${index} track ${trackIndex} mapped-channel disposition requires exactly one GLB channel.`)
      const channelComparison = asRecord(track.comparison, `Source-motion proof row ${index} track ${trackIndex} comparison`)
      const channelTiming = asRecord(channelComparison.timing, `Source-motion proof row ${index} track ${trackIndex} timing`)
      assert.equal(channelTiming.applicable, true, `Source-motion proof row ${index} track ${trackIndex} mapped channel has no timing evidence.`)
      if (track.disposition === 'exact-static-channel') {
        assert.equal(track.valueClass, 'constant', `Source-motion proof row ${index} exact-static-channel is not source-constant.`)
        assert.equal(channelComparison.mode, 'exact-motion-accounting', `Source-motion proof row ${index} exact-static-channel claims an approximation.`)
      } else {
        assert.equal(channelComparison.mode, 'policy-gated', `Source-motion proof row ${index} bounded mapped channel has no policy-gated comparison.`)
      }
    }
    if (track.disposition === 'unresolved') {
      assert.ok(track.sourceTarget === null || (track.sourceTarget && typeof track.sourceTarget === 'object' && !Array.isArray(track.sourceTarget)), `Source-motion proof row ${index} unresolved track ${trackIndex} sourceTarget is invalid.`)
      if (Array.isArray(track.pathTokens) && track.bindingPathHash !== null) assert.equal(crc32Path(track.pathTokens), track.bindingPathHash, `Source-motion proof row ${index} unresolved track ${trackIndex} known path hash differs from its path tokens.`)
      continue
    }
    assert.ok(Array.isArray(track.pathTokens), `Source-motion proof row ${index} resolved track ${trackIndex} pathTokens are invalid.`)
    assert.ok(Number.isInteger(track.bindingPathHash), `Source-motion proof row ${index} resolved track ${trackIndex} has no binding path hash.`)
    assert.equal(crc32Path(track.pathTokens), track.bindingPathHash, `Source-motion proof row ${index} track ${trackIndex} Unity binding path hash differs from its tokens.`)
    const sourceTransformReference = track.sourceTransformReference
    assert.ok(sourceTransformReference !== null && sourceTransformReference !== undefined, `Source-motion proof row ${index} resolved track ${trackIndex} omits its source Transform identity.`)
    assert.ok(track.sourceCurves.length > 0, `Source-motion proof row ${index} resolved track ${trackIndex} has no source component curves.`)
    assert.equal(track.sampleCount, track.sourceCurves.reduce((total: number, curve: JsonRecord) => total + ((curve.keys as unknown[]).length || (curve.initialValue !== null ? 1 : 0)), 0), `Source-motion proof row ${index} track ${trackIndex} sampleCount differs from its source component curves.`)
    assert.equal(track.valuesSha256.toLowerCase(), createHash('sha256').update(canonicalSourceMotionJson({ componentCurves: track.sourceCurves }), 'utf8').digest('hex'), `Source-motion proof row ${index} track ${trackIndex} source component digest differs from its exact curves.`)
    const transformReference = sourceReferenceKey(sourceTransformReference, `Source-motion proof row ${index} track ${trackIndex} sourceTransformReference`)
    const sourceTarget = asRecord(track.sourceTarget, `Source-motion proof row ${index} track ${trackIndex} sourceTarget`)
    assert.equal(sourceReferenceKey(sourceTarget.reference, `Source-motion proof row ${index} track ${trackIndex} sourceTarget reference`), transformReference, `Source-motion proof row ${index} track ${trackIndex} sourceTarget identity differs from its source transform.`)
    for (const [field, length] of [['translation', 3], ['rotation', 4], ['scale', 3]] as const) {
      const values = sourceMotionVector(asRecord(sourceTarget.sourceLocalTrs, `Source-motion proof row ${index} track ${trackIndex} sourceLocalTrs`)[field], length, `Source-motion proof row ${index} track ${trackIndex} sourceLocalTrs.${field}`)
      if (field === 'rotation') assert.ok(Math.hypot(...values) > 0, `Source-motion proof row ${index} track ${trackIndex} sourceLocalTrs rotation is zero.`)
    }
    const sourceCurveComponents = new Set<string>()
    for (const [curveIndex, curveValue] of (track.sourceCurves as unknown[]).entries()) {
      const curve = asRecord(curveValue, `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex}`)
      assert.ok(['x', 'y', 'z', 'w'].includes(curve.component), `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} component is invalid.`)
      assert.ok(!sourceCurveComponents.has(curve.component), `Source-motion proof row ${index} track ${trackIndex} repeats source curve component ${curve.component}.`)
      sourceCurveComponents.add(curve.component)
      assert.ok(['streamed', 'dense', 'constant', 'unresolved'].includes(curve.sourceKind), `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} sourceKind is invalid.`)
      assert.ok(curve.initialValue === null || (typeof curve.initialValue === 'number' && Number.isFinite(curve.initialValue)), `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} initialValue is invalid.`)
      assert.ok(Array.isArray(curve.keys), `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} keys must be an array.`)
      let priorKeyTime = -Infinity
      for (const [keyIndex, keyValue] of (curve.keys as unknown[]).entries()) {
        const sourceKey = asRecord(keyValue, `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} key ${keyIndex}`)
        assert.ok(Number.isFinite(sourceKey.time) && sourceKey.time >= clipRange.startTimeSec && sourceKey.time <= clipRange.stopTimeSec, `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} key ${keyIndex} is outside the exact clip range.`)
        assert.ok(sourceKey.time > priorKeyTime, `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} key times are not strictly increasing.`)
        assert.ok(Number.isFinite(sourceKey.value), `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} key ${keyIndex} value is invalid.`)
        assert.ok(sourceKey.coefficients === null || (Array.isArray(sourceKey.coefficients) && sourceKey.coefficients.length === 4 && sourceKey.coefficients.every((item: unknown) => typeof item === 'number' && Number.isFinite(item))), `Source-motion proof row ${index} track ${trackIndex} source curve ${curveIndex} key ${keyIndex} coefficients are invalid.`)
        if (sourceKey.coefficients !== null) assert.equal(curve.sourceKind, 'streamed', `Source-motion proof row ${index} track ${trackIndex} non-streamed curve has cubic coefficients.`)
        priorKeyTime = sourceKey.time
      }
      if (curve.sourceKind === 'constant') {
        const constantValue = curve.initialValue ?? (curve.keys as JsonRecord[])[0]?.value
        assert.ok(typeof constantValue === 'number' && Number.isFinite(constantValue), `Source-motion proof row ${index} track ${trackIndex} constant curve ${curveIndex} has no exact value.`)
        assert.ok((curve.keys as JsonRecord[]).every(key => key.value === constantValue && key.coefficients === null), `Source-motion proof row ${index} track ${trackIndex} constant curve ${curveIndex} contains changing keys.`)
      } else if (curve.sourceKind !== 'unresolved') {
        assert.ok((curve.keys as unknown[]).length > 0, `Source-motion proof row ${index} track ${trackIndex} non-constant curve ${curveIndex} has no keys.`)
      }
    }
    if (track.disposition !== 'unresolved') assert.ok((track.sourceCurves as JsonRecord[]).every(curve => curve.sourceKind !== 'unresolved'), `Source-motion proof row ${index} accepted track ${trackIndex} has an unresolved source curve.`)
    assert.ok(Array.isArray(sourceTarget.path) && sourceTarget.path.length > 0, `Source-motion proof row ${index} track ${trackIndex} sourceTarget path is missing.`)
    const targetPath = sourceTarget.path as unknown[]
    const targetPathKeys = targetPath.map((tokenValue, pathIndex) => {
      const token = asRecord(tokenValue, `Source-motion proof row ${index} track ${trackIndex} sourceTarget path ${pathIndex}`)
      assert.ok(typeof token.name === 'string' && token.name, `Source-motion proof row ${index} track ${trackIndex} sourceTarget path ${pathIndex} name is missing.`)
      return sourceReferenceKey(token.sourceReference, `Source-motion proof row ${index} track ${trackIndex} sourceTarget path ${pathIndex} sourceReference`)
    })
    assert.equal(targetPathKeys[0], rootTransformKey, `Source-motion proof row ${index} track ${trackIndex} sourceTarget path misses the exact prefab root.`)
    assert.equal(targetPathKeys.at(-1), transformReference, `Source-motion proof row ${index} track ${trackIndex} sourceTarget path does not end at its exact source transform.`)
    assert.equal(sourceMotionProofPathSha256(targetPath), String(sourceTarget.pathSha256).toLowerCase(), `Source-motion proof row ${index} track ${trackIndex} sourceTarget path digest is invalid.`)
    assert.equal(sourceTarget.animatorRelation, sourcePathAnimatorRelation(animatorPathKeys, targetPathKeys), `Source-motion proof row ${index} track ${trackIndex} Animator relation differs from exact source paths.`)
    assert.ok(Number.isInteger(sourceTarget.glbNodeIndex) && sourceTarget.glbNodeIndex >= 0, `Source-motion proof row ${index} track ${trackIndex} sourceTarget GLB node index is invalid.`)
    const targetNames = (targetPath as JsonRecord[]).map(token => token.name)
    const expectedPathTokens = sourceTarget.animatorRelation === 'inside-animator-subtree'
      ? targetNames.slice(animatorPath.length)
      : []
    assert.deepEqual(track.pathTokens, expectedPathTokens, `Source-motion proof row ${index} track ${trackIndex} Animator-relative binding path differs from its exact source path.`)
    if (track.disposition !== 'unresolved') {
      assert.equal(track.sourceTarget.animatorRelation, 'inside-animator-subtree', `Source-motion proof row ${index} track ${trackIndex} is not addressable from the selected Animator root.`)
      assert.equal(track.bindingKind, 'transform', `Source-motion proof row ${index} track ${trackIndex} has an unsupported non-Transform binding.`)
    }
    assert.ok(Array.isArray(track.sampleEvidence) && track.sampleEvidence.length > 0, `Source-motion proof row ${index} track ${trackIndex} has no source/GLB sample evidence.`)
    let priorSampleKey = ''
    let priorTime = -Infinity
    for (const [sampleIndex, sampleValue] of (track.sampleEvidence as unknown[]).entries()) {
      const sample = assertMotionSample(sampleValue, `Source-motion proof row ${index} track ${trackIndex} sample ${sampleIndex}`)
      assert.ok(sample.timeSec >= priorTime, `Source-motion proof row ${index} track ${trackIndex} samples are not time-sorted.`)
      const sampleKey = `${sample.timeSec}:${sample.kind}`
      assert.ok(sampleKey !== priorSampleKey, `Source-motion proof row ${index} track ${trackIndex} repeats a sample identity.`)
      priorTime = sample.timeSec
      priorSampleKey = sampleKey
    }
    assert.ok(new Set(track.sampleEvidence.map((sample: JsonRecord) => `${sample.timeSec}:${sample.kind}`)).size === track.sampleEvidence.length, `Source-motion proof row ${index} track ${trackIndex} repeats a sample identity.`)
    const comparison = asRecord(track.comparison, `Source-motion proof row ${index} track ${trackIndex} comparison`)
    assert.ok(['exact-motion-accounting', 'policy-gated'].includes(comparison.mode), `Source-motion proof row ${index} track ${trackIndex} comparison mode is invalid.`)
    assert.ok(['planning.md/v12-pragmatic-gates'].includes(comparison.policyId), `Source-motion proof row ${index} track ${trackIndex} materiality policy is unsupported.`)
    if (comparison.mode === 'exact-motion-accounting') {
      assert.equal(comparison.modelHeightUnits, null, `Source-motion proof row ${index} track ${trackIndex} exact comparison must not claim a model height.`)
      assert.equal(comparison.modelHeightEvidence, null, `Source-motion proof row ${index} track ${trackIndex} exact comparison must not claim model-height evidence.`)
    } else {
      assert.ok(typeof comparison.modelHeightUnits === 'number' && Number.isFinite(comparison.modelHeightUnits) && comparison.modelHeightUnits > 0, `Source-motion proof row ${index} track ${trackIndex} model height is invalid.`)
      const modelHeightEvidence = assertSourceMotionModelHeightEvidence(comparison.modelHeightEvidence, comparison.modelHeightUnits, `Source-motion proof row ${index} track ${trackIndex}`)
      if (modelHeightEvidence.selector === 'reviewed-isolated-glb-body-role-witness-v1') {
        assert.equal(modelHeightEvidence.witness.studentId, row.studentId, `Source-motion proof row ${index} reviewed body-role witness belongs to another student.`)
        assert.equal(modelHeightEvidence.witness.sourceIdentity, row.sourceIdentity, `Source-motion proof row ${index} reviewed body-role witness source differs from the row.`)
        assert.equal(modelHeightEvidence.witness.assetSha256.toLowerCase(), asset.sha256.toLowerCase(), `Source-motion proof row ${index} reviewed body-role witness asset differs from the row.`)
        assert.equal(sourceReferenceKey(modelHeightEvidence.witness.sourcePrefabReference, `Source-motion proof row ${index} reviewed witness prefab`), sourceReferenceKey(selectedPrefab.sourceReference, `Source-motion proof row ${index} selected prefab`), `Source-motion proof row ${index} reviewed witness prefab differs from selected prefab.`)
        assert.equal(modelHeightEvidence.witness.sourcePrefabPath, selectedPrefab.path, `Source-motion proof row ${index} reviewed witness prefab path differs from selected prefab.`)
      }
    }
  }
  assert.ok(Array.isArray(row.diagnosticCodes) && row.diagnosticCodes.every((code: unknown) => typeof code === 'string'), `Source-motion proof row ${index} diagnosticCodes are invalid.`)
  const relevantTracks = (row.tracks as JsonRecord[]).filter(track => track.sourceTransformReference !== null && track.sourceTransformReference !== undefined
    && requiredScopeKeys.has(sourceReferenceKey(track.sourceTransformReference, `Source-motion proof row ${index} relevant track sourceTransformReference`)))
  assert.equal(curveSet.relevantTrackCount, relevantTracks.length, `Source-motion proof row ${index} relevantTrackCount differs from exact required scope identities.`)
  if (row.proofStatus !== 'unresolved') {
    assert.equal(curveSet.complete, true, `Source-motion proof row ${index} accepted proof has incomplete curve coverage.`)
    assert.equal(curveSet.coverageStatus, 'complete', `Source-motion proof row ${index} accepted proof has incomplete curve coverage.`)
    assert.equal(curveSet.unresolvedRelevantCount, 0, `Source-motion proof row ${index} accepted proof has unresolved relevant curves.`)
    assert.ok((row.tracks as JsonRecord[]).every(track => track.disposition !== 'unresolved'), `Source-motion proof row ${index} accepted proof contains an unresolved track.`)
    assert.deepEqual(curveSet.decoderDiagnostics, [], `Source-motion proof row ${index} accepted proof contains decoder diagnostics.`)
    assert.deepEqual(row.diagnosticCodes, [], `Source-motion proof row ${index} accepted proof contains diagnostic codes.`)
  }
  if (row.proofStatus === 'static') {
    assert.ok(relevantTracks.every(track => track.valueClass === 'constant'
      || track.disposition === 'bounded-source-to-static'
      || (schemaVersion === 3 && track.disposition === 'bounded-source-to-glb-channel')), `Source-motion proof row ${index} static proof has relevant authored motion not bounded to static.`)
    assert.ok(relevantTracks.every(track => track.disposition !== 'preserved-glb' || track.valueClass === 'constant'), `Source-motion proof row ${index} static proof preserves a dynamic required-scope curve.`)
  }
  if (row.proofStatus === 'outside-subtree-untargeted') {
    assert.ok(relevantTracks.length === 0, `Source-motion proof row ${index} untargeted proof has tracks on the required scope.`)
    const requiredScopes = (row.scopeTransforms as JsonRecord[]).filter(scope =>
      Array.isArray(scope.roles) && scope.roles.some((role: string) => ['renderer', 'rootBone', 'rootBoneAncestry', 'skinJoint'].includes(role)))
    assert.ok(requiredScopes.length > 0 && requiredScopes.every(scope => ['ancestor-of-animator-root', 'disjoint'].includes(scope.animatorRelation)), `Source-motion proof row ${index} untargeted proof has a required transform inside or unresolved from the selected Animator.`)
  }
  return row
}

export type VerifiedV12SourceMotionProof = {
  jobId: string
  schemaVersion: 2 | 3
  reportSha256: string
  rowsByKey: ReadonlyMap<string, JsonRecord>
  consumedRows: Set<string>
  consumedProofs: Map<string, { key: string; proofStatus: string; trackDispositions: Record<string, number> }>
}

export function assertV12SourceMotionProofReport(value: unknown, expectedReportSha256: string, databaseName = V12_DATABASE_NAME): VerifiedV12SourceMotionProof {
  assert.match(expectedReportSha256, /^[a-f0-9]{64}$/i, 'Approved source-motion proof SHA-256 is invalid.')
  const report = asRecord(value, 'Source-motion proof report')
  assert.ok(report.schemaVersion === 2 || report.schemaVersion === 3, 'Source-motion proof schema version is unsupported.')
  assert.equal(report.kind, 'chibi-v12-source-motion-proof', 'Source-motion proof kind is unsupported.')
  assert.equal(report.policyVersion, report.schemaVersion === 2 ? V12_SOURCE_MOTION_PROOF_POLICY : V12_SOURCE_MOTION_PROOF_POLICY_V3, 'Source-motion proof policy version is unsupported for its schema.')
  assert.equal(databaseName, V12_DATABASE_NAME, 'Source-motion proof can be used only with the exact isolated v12 database.')
  assert.equal(report.databaseName, V12_DATABASE_NAME, 'Source-motion proof belongs to a different isolated database.')
  assert.equal(report.jobId, V12_TERMINAL_RESUME_JOB_ID, 'Source-motion proof belongs to a different import job.')
  assert.ok(typeof report.generatedAt === 'string' && !Number.isNaN(Date.parse(report.generatedAt)), 'Source-motion proof generatedAt is invalid.')
  assert.match(report.reportSha256, /^[a-f0-9]{64}$/i, 'Source-motion proof reportSha256 is invalid.')
  const actualReportSha256 = sourceMotionProofReportSha256(report)
  assert.equal(report.reportSha256.toLowerCase(), actualReportSha256, 'Source-motion proof canonical content digest is invalid.')
  assert.equal(actualReportSha256, expectedReportSha256.toLowerCase(), 'Source-motion proof differs from the explicitly approved report SHA-256.')
  const sidecar = asRecord(report.terminalSidecar, 'Source-motion proof terminalSidecar')
  assert.equal(sidecar.sha256, V12_TERMINAL_SIDECAR_SHA256, 'Source-motion proof terminal sidecar identity is not the pinned v12 sidecar.')
  assert.equal(sidecar.rowCount, 238, 'Source-motion proof terminal sidecar row count is not the pinned v12 count.')
  const sweep = asRecord(report.structuralSweep, 'Source-motion proof structuralSweep')
  assert.equal(sweep.sha256, V12_STRUCTURAL_SWEEP_SHA256, 'Source-motion proof structural sweep is not the pinned v12 sweep.')
  assert.equal(sweep.rowCount, 4, 'Source-motion proof structural sweep row count differs from the pinned v12 candidates.')
  assert.equal(sweep.selector, 'rows with category structural-action-no-nonzero-delta, independently rechecked as zero by GLB channel sampling', 'Source-motion proof uses an unsupported structural sweep selector.')
  const inventory = asRecord(report.sourceInventory, 'Source-motion proof sourceInventory')
  assert.equal(inventory.sha256, V12_INVENTORY_SHA256, 'Source-motion proof source inventory is not the pinned v12 inventory.')
  assert.equal(inventory.metadataReader, V12_METADATA_READER, 'Source-motion proof metadata reader differs from the pinned v12 reader.')
  assert.match(report.sourceBundleSetSha256, /^[a-f0-9]{64}$/i, 'Source-motion proof sourceBundleSetSha256 is invalid.')
  assert.deepEqual(report.fiveBusinessDigests, V12_FIVE_BUSINESS_DIGESTS, 'Source-motion proof five business-table digests differ from the read-only v12 baseline.')
  assert.ok(Array.isArray(report.rows) && report.rows.length >= sweep.rowCount, 'Source-motion proof rows omit one or more pinned structural candidates.')
  const rowsByKey = new Map<string, JsonRecord>()
  let priorKey = ''
  for (const [index, rowValue] of (report.rows as unknown[]).entries()) {
    const row = assertSourceMotionProofRowShape(rowValue, index, report.schemaVersion)
    const key = sourceMotionRowKey(row)
    assert.ok(index === 0 || key.localeCompare(priorKey) > 0, 'Source-motion proof rows are not sorted by their exact action identity.')
    assert.ok(!rowsByKey.has(key), `Source-motion proof repeats exact action row ${key}.`)
    rowsByKey.set(key, row)
    priorKey = key
  }
  return { jobId: V12_TERMINAL_RESUME_JOB_ID, schemaVersion: report.schemaVersion, reportSha256: actualReportSha256, rowsByKey, consumedRows: new Set<string>(), consumedProofs: new Map() }
}

function sourceReferenceKey(value: unknown, label: string) {
  const reference = asRecord(value, label)
  for (const field of ['bundleSha256', 'serializedFile', 'objectId']) {
    assert.ok(typeof reference[field] === 'string' && reference[field].trim(), `${label}.${field} must be a non-empty string.`)
  }
  return `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
}

function sortedExcludedRenderers(records: readonly JsonRecord[]) {
  return [...records].sort((left, right) => sourceReferenceKey(left.sourceReference, 'excluded renderer sourceReference').localeCompare(sourceReferenceKey(right.sourceReference, 'excluded renderer sourceReference'))
    || String(left.hierarchyPath ?? '').localeCompare(String(right.hierarchyPath ?? ''))
    || String(left.name ?? '').localeCompare(String(right.name ?? '')))
}

function sortedExcludedEvents(records: readonly JsonRecord[]) {
  return [...records].sort((left, right) => Number(left.time) - Number(right.time)
    || Number(left.order) - Number(right.order)
    || sourceReferenceKey(left.sourceRendererReference, 'excluded event sourceRendererReference').localeCompare(sourceReferenceKey(right.sourceRendererReference, 'excluded event sourceRendererReference')))
}

type CharacterContractOptions = {
  /**
   * Catalog-scale acceptance must prove every source-evidenced weapon relation.
   * The pilot intentionally keeps the older smoke-test semantics.
   */
  requireEquipmentRelations?: boolean
  /**
   * The persisted action profile is runtime evidence, not source assembly
  * metadata.  It is used only to select the authored clips whose embedded
  * animation channels must prove structural equipment movement.
  */
  actionProfile?: unknown
  renderingVersionContract?: AcceptanceRenderingVersionContract
  sourceIdentity?: string | null
  assetIdentity?: { assetId: string; revision: string; sha256: string }
  sourceMotionProof?: VerifiedV12SourceMotionProof
  reviewedBodyRoleWitness?: Extract<SourceMotionModelHeightEvidenceV2, { selector: 'reviewed-isolated-glb-body-role-witness-v1' }>
}

/**
 * Full-roster relation coverage is driven by source policy records, not by a
 * shader family alone.  A weapon shader is also used by retained bags,
 * mounts, and other source-bound renderers; those must remain core geometry
 * without being forced into a fabricated equipment attachment.  The profile
 * itself declares likely unresolved equipment through coreRendererBlockers,
 * while equipmentBindingEvidence declares exact or structural relations.
 */
function sourceDeclaredEquipmentRendererKeys(profile: JsonRecord, profileValidation: JsonRecord) {
  const markerKeys = new Set<string>()
  const bindingKeys = new Set<string>()
  for (const [recordLabel, values, isBinding] of [
    ['equipment binding evidence', profile.equipmentBindingEvidence, true],
    ['core renderer blockers', profile.coreRendererBlockers, false],
    ['validation equipment binding evidence', profileValidation.equipmentBindingEvidence, true],
    ['validation core renderer blockers', profileValidation.coreRendererBlockers, false],
  ] as const) {
    if (values === undefined) continue
    assert.ok(Array.isArray(values), `Student source profile ${recordLabel} must be an array.`)
    for (const [index, value] of values.entries()) {
      const record = asRecord(value, `Student source profile ${recordLabel} ${index}`)
      const key = sourceReferenceKey(record.sourceReference, `Student source profile ${recordLabel} ${index} sourceReference`)
      markerKeys.add(key)
      if (isBinding) bindingKeys.add(key)
    }
  }
  return { markerKeys, bindingKeys }
}

function sourceReferenceKeys(value: unknown, label: string, requireNonEmpty = true) {
  assert.ok(Array.isArray(value), `${label} must be an array.`)
  const keys = (value as unknown[]).map((item, index) => sourceReferenceKey(item, `${label}[${index}]`))
  if (requireNonEmpty) assert.ok(keys.length > 0, `${label} must not be empty.`)
  assert.equal(new Set(keys).size, keys.length, `${label} contains duplicate source identities.`)
  return keys
}

function profileReferenceKeys(value: unknown, label: string) {
  return sourceReferenceKeys(value, label, false).sort()
}

function orderedProfileReferenceKeys(value: unknown, label: string) {
  assert.ok(Array.isArray(value), `${label} must be an array.`)
  assert.ok(value.length > 0, `${label} must not be empty.`)
  return (value as unknown[]).map((item, index) => sourceReferenceKey(item, `${label}[${index}]`))
}

function materialSlotReferenceKeys(value: unknown, label: string, referenceField: string) {
  assert.ok(Array.isArray(value), `${label} must be an array.`)
  assert.ok(value.length > 0, `${label} must not be empty.`)
  const slots = (value as unknown[]).map((item, index) => {
    const slot = asRecord(item, `${label}[${index}]`)
    assert.ok(Number.isInteger(slot.slot) && (slot.slot as number) >= 0, `${label}[${index}].slot must be a non-negative integer.`)
    return {
      slot: slot.slot as number,
      sourceKey: sourceReferenceKey(slot[referenceField], `${label}[${index}].${referenceField}`),
    }
  }).sort((left, right) => left.slot - right.slot)
  assert.deepEqual(slots.map(slot => slot.slot), slots.map((_, index) => index), `${label} must contain each zero-based source material slot exactly once.`)
  return slots.map(slot => slot.sourceKey)
}

function profilePointerArray(value: unknown, label: string) {
  assert.ok(Array.isArray(value), `${label} must be an array.`)
  return value as unknown[]
}

function serializedPointerKey(value: unknown, label: string) {
  const pointer = asRecord(value, label)
  assert.ok(typeof pointer.file === 'string' && pointer.file.trim(), `${label}.file must be a non-empty string.`)
  assert.ok(typeof pointer.pathId === 'string' && pointer.pathId !== '0', `${label}.pathId must be a non-zero string.`)
  assert.ok(typeof pointer.name === 'string' && pointer.name.trim(), `${label}.name must be a non-empty string.`)
  return `${pointer.file.replaceAll('\\', '/').toLowerCase()}:${pointer.pathId}:${pointer.name.trim()}`
}

function serializedPointerKeys(value: unknown, label: string) {
  assert.ok(Array.isArray(value), `${label} must be an array.`)
  return (value as unknown[]).map((pointer, index) => serializedPointerKey(pointer, `${label}[${index}]`))
}

function exactSourcePointerKey(value: unknown, sourceReference: unknown, label: string) {
  const pointer = asRecord(value, label)
  const sourceFile = normalizedSourceFile(sourceReference, `${label} expected sourceReference`)
  assert.equal(normalizedPointerFile(pointer, label), sourceFile.serializedFile, `${label} is outside its exact source file.`)
  const pointerSourceKey = sourceReferenceKey(pointer.sourceReference, `${label} sourceReference`)
  assert.equal(pointerSourceKey, `${sourceFile.bundleSha256}:${sourceFile.serializedFile}:${pointer.pathId}`, `${label} has a mismatched exact source identity.`)
  return serializedPointerKey(pointer, label)
}

function normalizedPointerFile(value: unknown, label: string) {
  const pointer = asRecord(value, label)
  assert.ok(typeof pointer.file === 'string' && pointer.file.trim(), `${label}.file must be a non-empty string.`)
  assert.ok(typeof pointer.pathId === 'string' && pointer.pathId !== '0', `${label}.pathId must be a non-zero string.`)
  assert.ok(typeof pointer.name === 'string' && pointer.name.trim(), `${label}.name must be a non-empty string.`)
  return pointer.file.replaceAll('\\', '/').toLowerCase()
}

function normalizedSourceFile(value: unknown, label: string) {
  const reference = asRecord(value, label)
  assert.ok(typeof reference.bundleSha256 === 'string' && reference.bundleSha256.trim(), `${label}.bundleSha256 must be a non-empty string.`)
  assert.ok(typeof reference.serializedFile === 'string' && reference.serializedFile.trim(), `${label}.serializedFile must be a non-empty string.`)
  return {
    bundleSha256: reference.bundleSha256.toLowerCase(),
    serializedFile: reference.serializedFile.replaceAll('\\', '/').toLowerCase(),
  }
}

function assertStructuralSourceAncestry(studentId: number, sourceKey: string, record: JsonRecord, renderer: JsonRecord, assemblyRenderer: JsonRecord, assembly: JsonRecord, requireHierarchyMatch = true) {
  const rendererFile = normalizedSourceFile(renderer.sourceReference, `Student ${studentId} structural equipment renderer ${sourceKey} sourceReference`)
  const prefabReference = normalizedSourceFile(assembly.prefabReference, `Student ${studentId} structural equipment renderer ${sourceKey} source assembly prefabReference`)
  assert.equal(prefabReference.bundleSha256, rendererFile.bundleSha256, `Student ${studentId} structural equipment renderer ${sourceKey} source ancestry crosses bundle identities.`)
  assert.equal(prefabReference.serializedFile, rendererFile.serializedFile, `Student ${studentId} structural equipment renderer ${sourceKey} source ancestry crosses serialized-file identities.`)
  assert.equal(normalizedPointerFile(record.rootBone, `Student ${studentId} structural equipment evidence ${sourceKey} rootBone`), rendererFile.serializedFile, `Student ${studentId} structural equipment renderer ${sourceKey} rootBone is not in the source prefab file.`)
  const transformChain = profilePointerArray(record.transformChain, `Student ${studentId} structural equipment evidence ${sourceKey} transformChain`)
  const boneReferences = profilePointerArray(record.boneReferences, `Student ${studentId} structural equipment evidence ${sourceKey} boneReferences`)
  const allPointers = [record.rootBone, ...transformChain, ...boneReferences]
  allPointers.forEach((pointer, index) => assert.equal(normalizedPointerFile(pointer, `Student ${studentId} structural equipment evidence ${sourceKey} source pointer ${index}`), rendererFile.serializedFile, `Student ${studentId} structural equipment renderer ${sourceKey} source ancestry pointer ${index} is not in the source prefab file.`))
  assert.equal(normalizedPointerFile(assemblyRenderer.rootBone, `Student ${studentId} source assembly renderer ${sourceKey} rootBone`), rendererFile.serializedFile, `Student ${studentId} structural equipment renderer ${sourceKey} source assembly rootBone is not in the source prefab file.`)
  ;(assemblyRenderer.transformChain ?? []).forEach((pointer: unknown, index: number) => assert.equal(normalizedPointerFile(pointer, `Student ${studentId} source assembly renderer ${sourceKey} transformChain[${index}]`), rendererFile.serializedFile, `Student ${studentId} structural equipment renderer ${sourceKey} source assembly ancestry crosses serialized-file identities.`))
  ;(assemblyRenderer.boneReferences ?? []).forEach((pointer: unknown, index: number) => assert.equal(normalizedPointerFile(pointer, `Student ${studentId} source assembly renderer ${sourceKey} boneReferences[${index}]`), rendererFile.serializedFile, `Student ${studentId} structural equipment renderer ${sourceKey} source assembly bone ancestry crosses serialized-file identities.`))

  const hierarchyPath = typeof renderer.hierarchyPath === 'string' ? renderer.hierarchyPath : ''
  const assemblyRoot = typeof assembly.root === 'string' ? assembly.root.trim().toLowerCase() : ''
  const hierarchySegments = hierarchyPath.replaceAll('\\', '/').split('/').map(value => value.trim().toLowerCase()).filter(Boolean)
  const chainNames = transformChain.map((pointer, index) => {
    const value = asRecord(pointer, `Student ${studentId} structural equipment evidence ${sourceKey} transformChain[${index}]`).name
    assert.ok(typeof value === 'string' && value.trim(), `Student ${studentId} structural equipment evidence ${sourceKey} transformChain[${index}] has no name.`)
    return value.trim().toLowerCase()
  })
  const hierarchyPrefixMatch = hierarchySegments.length > 0 && hierarchySegments[0] === assemblyRoot
    && chainNames.length <= hierarchySegments.length
    && chainNames.every((name, index) => name === hierarchySegments[index])
  const sourceBoneChainMatch = hierarchySegments.length > 0 && hierarchySegments[0] === assemblyRoot
    && chainNames.includes('bone_root')
    && chainNames.some(name => name === 'bip001' || name.startsWith('bip001_'))
    && chainNames.some(name => /weapon|turret|grenade|toggle|robot/.test(name))
  const robotAncestry = hierarchySegments.some(name => name.includes('robot')) || chainNames.some(name => name.includes('robot'))
  if (requireHierarchyMatch) {
    assert.ok(hierarchyPrefixMatch || sourceBoneChainMatch || robotAncestry, `Student ${studentId} structural equipment renderer ${sourceKey} has no exact same-prefab transform ancestry.`)
  }
}

function assertExactSourceWeaponAncestry(studentId: number, sourceKey: string, record: JsonRecord, assemblyRenderer: JsonRecord, assembly: JsonRecord) {
  const rendererSource = normalizedSourceFile(record.sourceReference, `Student ${studentId} exact source weapon evidence ${sourceKey} sourceReference`)
  const prefabSource = normalizedSourceFile(assembly.prefabReference, `Student ${studentId} exact source weapon evidence ${sourceKey} prefabReference`)
  assert.deepEqual(prefabSource, rendererSource, `Student ${studentId} exact source weapon evidence ${sourceKey} crosses its selected prefab.`)

  exactSourcePointerKey(assemblyRenderer.rootBone, record.sourceReference, `Student ${studentId} source assembly renderer ${sourceKey} rootBone`)
  profilePointerArray(assemblyRenderer.transformChain ?? [], `Student ${studentId} source assembly renderer ${sourceKey} transformChain`)
    .forEach((pointer, index) => exactSourcePointerKey(pointer, record.sourceReference, `Student ${studentId} source assembly renderer ${sourceKey} transformChain[${index}]`))
  profilePointerArray(assemblyRenderer.boneReferences ?? [], `Student ${studentId} source assembly renderer ${sourceKey} boneReferences`)
    .forEach((pointer, index) => exactSourcePointerKey(pointer, record.sourceReference, `Student ${studentId} source assembly renderer ${sourceKey} boneReferences[${index}]`))

  assert.equal(assemblyRenderer.rootBoneAncestryComplete, true, `Student ${studentId} exact source weapon evidence ${sourceKey} has no complete rootBone ancestry.`)
  const evidenceAncestry = profilePointerArray(record.rootBoneAncestry, `Student ${studentId} exact source weapon evidence ${sourceKey} rootBoneAncestry`)
  const assemblyAncestry = profilePointerArray(assemblyRenderer.rootBoneAncestry, `Student ${studentId} source assembly renderer ${sourceKey} rootBoneAncestry`)
  assert.ok(evidenceAncestry.length > 0, `Student ${studentId} exact source weapon evidence ${sourceKey} has no rootBone ancestry.`)
  const evidenceAncestryKeys = evidenceAncestry.map((pointer, index) => exactSourcePointerKey(pointer, record.sourceReference, `Student ${studentId} exact source weapon evidence ${sourceKey} rootBoneAncestry[${index}]`))
  const assemblyAncestryKeys = assemblyAncestry.map((pointer, index) => exactSourcePointerKey(pointer, record.sourceReference, `Student ${studentId} source assembly renderer ${sourceKey} rootBoneAncestry[${index}]`))
  assert.equal(new Set(evidenceAncestryKeys).size, evidenceAncestryKeys.length, `Student ${studentId} exact source weapon evidence ${sourceKey} has duplicate rootBone ancestry pointers.`)
  assert.deepEqual(evidenceAncestryKeys, assemblyAncestryKeys, `Student ${studentId} exact source weapon evidence ${sourceKey} disagrees with the source assembly rootBone ancestry.`)

  const matchedPointers = profilePointerArray(record.matchedAncestorPointers, `Student ${studentId} exact source weapon evidence ${sourceKey} matchedAncestorPointers`)
  assert.equal(matchedPointers.length, 1, `Student ${studentId} exact source weapon evidence ${sourceKey} must identify exactly one matched weapon ancestor.`)
  const matchedPointer = asRecord(matchedPointers[0], `Student ${studentId} exact source weapon evidence ${sourceKey} matched ancestor`)
  const matchedKey = serializedPointerKey(matchedPointer, `Student ${studentId} exact source weapon evidence ${sourceKey} matched ancestor`)
  assert.equal(normalizedPointerFile(matchedPointer, `Student ${studentId} exact source weapon evidence ${sourceKey} matched ancestor`), rendererSource.serializedFile, `Student ${studentId} exact source weapon evidence ${sourceKey} matched ancestor is outside its selected source file.`)
  if (matchedPointer.sourceReference) exactSourcePointerKey(matchedPointer, record.sourceReference, `Student ${studentId} exact source weapon evidence ${sourceKey} matched ancestor`)
  assert.equal(assemblyAncestryKeys.filter(pointer => pointer === matchedKey).length, 1, `Student ${studentId} exact source weapon evidence ${sourceKey} matched ancestor is not unique in its exact source parent chain.`)

  const attachments = asRecord(assembly.attachments ?? {}, `Student ${studentId} exact source weapon evidence ${sourceKey} source attachments`)
  const authoredKeys: string[] = []
  for (const kind of ['mainWeapon', 'subWeapon']) {
    const values = attachments[kind]
    if (values === undefined) continue
    assert.ok(Array.isArray(values), `Student ${studentId} exact source weapon evidence ${sourceKey} ${kind} pointers must be an array.`)
    for (const [index, pointer] of (values as unknown[]).entries()) {
      authoredKeys.push(exactSourcePointerKey(pointer, record.sourceReference, `Student ${studentId} exact source weapon evidence ${sourceKey} ${kind}[${index}]`))
    }
  }
  assert.ok(authoredKeys.length > 0, `Student ${studentId} exact source weapon evidence ${sourceKey} has no authored mainWeapon/subWeapon pointer.`)
  assert.equal(new Set(authoredKeys).size, authoredKeys.length, `Student ${studentId} exact source weapon evidence ${sourceKey} has duplicate authored weapon pointers.`)
  const ancestryMatches = assemblyAncestryKeys.filter(ancestorKey => authoredKeys.includes(ancestorKey))
  assert.equal(ancestryMatches.length, 1, `Student ${studentId} exact source weapon evidence ${sourceKey} does not identify exactly one authored mainWeapon/subWeapon ancestor.`)
  assert.equal(ancestryMatches[0], matchedKey, `Student ${studentId} exact source weapon evidence ${sourceKey} matched ancestor differs from its authored weapon pointer.`)

  const claims = profilePointerArray(record.evidence, `Student ${studentId} exact source weapon evidence ${sourceKey} evidence`)
  assert.ok(claims.includes('body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique'), `Student ${studentId} exact source weapon evidence ${sourceKey} is missing its non-conflicting body m_Bones claim.`)
  assert.ok(claims.includes('unique non-conflicting full-source weapon ancestor relation'), `Student ${studentId} exact source weapon evidence ${sourceKey} is missing its unique source ancestry claim.`)
}

function inlineTransformDeltaHasMovement(value: unknown, epsilon = 1e-6): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) > epsilon
  if (Array.isArray(value)) {
    return value.some(item => inlineTransformDeltaHasMovement(item, epsilon))
  }
  if (!value || typeof value !== 'object') return false
  const record = value as JsonRecord
  if (typeof record.maxAbsDelta === 'number') return Number.isFinite(record.maxAbsDelta) && Math.abs(record.maxAbsDelta) > epsilon
  if (typeof record.maxAbs === 'number') return Number.isFinite(record.maxAbs) && Math.abs(record.maxAbs) > epsilon
  if ('from' in record && 'to' in record) {
    const from = Array.isArray(record.from) ? record.from : [record.from]
    const to = Array.isArray(record.to) ? record.to : [record.to]
    return from.length === to.length && from.some((item, index) => {
      const left = Number(item), right = Number(to[index])
      return Number.isFinite(left) && Number.isFinite(right) && Math.abs(right - left) > epsilon
    })
  }
  return ['translation', 'rotation', 'scale', 'transformDelta', 'delta'].some(key => key in record && inlineTransformDeltaHasMovement(record[key], epsilon))
}

function readEmbeddedAccessorFrames(glbJson: JsonRecord, accessorIndex: unknown): number[][] | null {
  const binary = glbJson.__chibiBinary
  if (!Buffer.isBuffer(binary) || !Number.isInteger(accessorIndex)) return null
  const accessor = Array.isArray(glbJson.accessors) ? glbJson.accessors[accessorIndex as number] : null
  const view = accessor && Array.isArray(glbJson.bufferViews) ? glbJson.bufferViews[accessor.bufferView] : null
  if (!accessor || !view || accessor.sparse || !Number.isInteger(accessor.count)) return null
  const componentSizes: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
  const componentCounts: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }
  const componentSize = componentSizes[accessor.componentType]
  const componentCount = componentCounts[accessor.type]
  if (!componentSize || !componentCount) return null
  const stride = Number.isInteger(view.byteStride) ? view.byteStride : componentSize * componentCount
  const start = Number(view.byteOffset ?? 0) + Number(accessor.byteOffset ?? 0)
  if (!Number.isInteger(start) || start < 0 || stride < componentSize * componentCount) return null
  const readComponent = (offset: number) => {
    if (offset < 0 || offset + componentSize > binary.length) return null
    switch (accessor.componentType) {
      case 5126: return binary.readFloatLE(offset)
      case 5125: return binary.readUInt32LE(offset)
      case 5123: return binary.readUInt16LE(offset)
      case 5122: return binary.readInt16LE(offset)
      case 5121: return binary.readUInt8(offset)
      case 5120: return binary.readInt8(offset)
      default: return null
    }
  }
  const rows: number[][] = []
  for (let row = 0; row < accessor.count; row += 1) {
    const values: number[] = []
    for (let component = 0; component < componentCount; component += 1) {
      const value = readComponent(start + row * stride + component * componentSize)
      if (value === null || !Number.isFinite(value)) return null
      values.push(value)
    }
    rows.push(values)
  }
  return rows
}

function animationChannelHasMovement(glbJson: JsonRecord, animation: JsonRecord, channel: JsonRecord, sampler: JsonRecord | undefined) {
  const inlineCandidates = [
    channel.transformDelta,
    channel.delta,
    channel.extras?.chibi?.transformDelta,
    channel.extras?.chibi?.delta,
    sampler?.transformDelta,
    sampler?.delta,
    sampler?.extras?.chibi?.transformDelta,
    sampler?.extras?.chibi?.delta,
  ]
  if (inlineCandidates.some(value => inlineTransformDeltaHasMovement(value))) return true
  const output = sampler?.output
  const inlineOutput = Array.isArray(output) && (Array.isArray(output[0]) || typeof output[0] === 'number')
    ? output as unknown[]
    : null
  const frames = inlineOutput
    ? (Array.isArray(inlineOutput[0]) ? inlineOutput as number[][] : [inlineOutput as number[]])
    : readEmbeddedAccessorFrames(glbJson, output)
  if (!frames || frames.length < 2 || !frames.every(frame => frame.every(value => typeof value === 'number' && Number.isFinite(value)))) return false
  const meaningfulFrames = sampler?.interpolation === 'CUBICSPLINE'
    ? frames.filter((_, index) => index % 3 === 1)
    : frames
  if (meaningfulFrames.length < 2) return false
  const first = meaningfulFrames[0]
  return meaningfulFrames.slice(1).some(frame => frame.length === first.length
    && frame.some((value, index) => Math.abs(value - first[index]) > 1e-6))
}

function authoredActionEntries(actionProfile: unknown, animations: readonly JsonRecord[]) {
  const profile = actionProfile && typeof actionProfile === 'object' && !Array.isArray(actionProfile)
    ? actionProfile as JsonRecord
    : null
  const actions: Array<{ id: string; clip: string }> = []
  if (profile?.initialPose && typeof profile.initialPose === 'string') actions.push({ id: 'initialPose', clip: profile.initialPose })
  const interactions = profile?.interactions && typeof profile.interactions === 'object' && !Array.isArray(profile.interactions)
    ? profile.interactions as JsonRecord
    : null
  if (interactions) {
    for (const [id, interaction] of Object.entries(interactions)) {
      if (!interaction || typeof interaction !== 'object' || Array.isArray(interaction)) continue
      const record = interaction as JsonRecord
      if (record.state === 'available' && typeof record.clip === 'string' && record.clip) actions.push({ id, clip: record.clip })
    }
  }
  // A persisted action profile is authoritative about which authored clips
  // were selected.  Do not substitute every exported animation when that
  // profile explicitly records only unsupported interactions: doing so would
  // fabricate movement coverage for actions that were not authored/available.
  if (profile) return actions
  return animations.map(animation => animation.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .map(name => ({ id: name, clip: name }))
}

function assertStructuralEquipmentEvidence(
  studentId: number,
  profile: JsonRecord,
  profileValidation: JsonRecord,
  glbJson: JsonRecord,
  renderers: readonly JsonRecord[],
  assemblyRenderers: readonly JsonRecord[],
  coreKeys: ReadonlySet<string>,
  excludedKeys: ReadonlySet<string>,
  exactEquipmentKeys: ReadonlySet<string>,
  options: CharacterContractOptions,
) {
  const raw = profile.equipmentBindingEvidence
  if (raw === undefined) return new Set<string>()
  assert.ok(Array.isArray(raw), `Student ${studentId} equipment binding evidence must be an array.`)
  assert.ok(Array.isArray(profileValidation.equipmentBindingEvidence), `Student ${studentId} validation equipment binding evidence must be an array.`)
  assert.equal(stableJson(profileValidation.equipmentBindingEvidence), stableJson(raw), `Student ${studentId} profile and validation equipment binding evidence differ.`)
  const sourceAssembly = asRecord(profile.assembly, `Student ${studentId} structural equipment source assembly`)
  const coreBlockerKeys = new Set<string>()
  for (const [label, blockers] of [['profile', profile.coreRendererBlockers], ['validation', profileValidation.coreRendererBlockers]] as const) {
    if (!Array.isArray(blockers)) continue
    for (const [index, blocker] of blockers.entries()) {
      const record = asRecord(blocker, `Student ${studentId} ${label} core renderer blocker ${index}`)
      coreBlockerKeys.add(sourceReferenceKey(record.sourceReference, `Student ${studentId} ${label} core renderer blocker ${index} sourceReference`))
    }
  }
  const structuralKeys = new Set<string>()
  const seenKeys = new Set<string>()
  for (const [index, value] of (raw as unknown[]).entries()) {
    const record = asRecord(value, `Student ${studentId} equipment binding evidence ${index}`)
    assert.ok(record.classification === 'exact-equipment-renderer'
      || record.classification === 'exact-main-sub-equipment'
      || record.classification === 'structurally-bound-equipment', `Student ${studentId} equipment binding evidence ${index} has an unsupported classification.`)
    assert.ok(typeof record.reasonCode === 'string' && record.reasonCode, `Student ${studentId} equipment binding evidence ${index} has no reason code.`)
    assert.ok(typeof record.reason === 'string' && record.reason, `Student ${studentId} equipment binding evidence ${index} has no reason.`)
    assert.ok(typeof record.name === 'string' && record.name, `Student ${studentId} equipment binding evidence ${index} has no renderer name.`)
    assert.ok(record.hierarchyPath === null || typeof record.hierarchyPath === 'string', `Student ${studentId} equipment binding evidence ${index} has an invalid hierarchy path.`)
    assert.ok(Array.isArray(record.evidence) && record.evidence.length > 0 && record.evidence.every((item: unknown) => typeof item === 'string' && item), `Student ${studentId} equipment binding evidence ${index} is missing evidence.`)
    const key = sourceReferenceKey(record.sourceReference, `Student ${studentId} equipment binding evidence ${index} sourceReference`)
    assert.ok(!seenKeys.has(key), `Student ${studentId} has duplicate equipment binding evidence for ${key}.`)
    seenKeys.add(key)
    const rendererMatches = (renderers as JsonRecord[]).filter(renderer => sourceReferenceKey(renderer.sourceReference, `Student ${studentId} equipment renderer sourceReference`) === key)
    const assemblyMatches = (assemblyRenderers as JsonRecord[]).filter(renderer => sourceReferenceKey(renderer.sourceReference, `Student ${studentId} assembly equipment sourceReference`) === key)
    assert.equal(rendererMatches.length, 1, `Student ${studentId} equipment binding evidence ${key} does not identify exactly one core renderer.`)
    assert.equal(assemblyMatches.length, 1, `Student ${studentId} equipment binding evidence ${key} does not identify exactly one source assembly renderer.`)
    assert.ok(coreKeys.has(key) && !excludedKeys.has(key) && !coreBlockerKeys.has(key), `Student ${studentId} equipment binding evidence ${key} conflicts with excluded/core renderer classification.`)
    const renderer = rendererMatches[0]
    const assemblyRenderer = assemblyMatches[0]
    assert.equal(record.name, renderer.name, `Student ${studentId} equipment binding evidence ${key} has a mismatched renderer name.`)
    assert.equal(record.hierarchyPath, renderer.hierarchyPath, `Student ${studentId} equipment binding evidence ${key} has a mismatched hierarchy path.`)
    const isStructural = record.classification === 'structurally-bound-equipment'
    if (isStructural) assert.ok(!exactEquipmentKeys.has(key), `Student ${studentId} structural equipment evidence ${key} is duplicated by exact equipmentRendererReferences.`)
    if (!isStructural) {
      assert.equal(record.reasonCode, record.classification === 'exact-equipment-renderer'
        ? 'EXACT_EQUIPMENT_RENDERER_REFERENCE'
        : 'EXACT_MAIN_SUB_ATTACHMENT_POINTER', `Student ${studentId} exact equipment evidence ${key} has a reason code that does not match its classification.`)
      if (record.sourceMeshReference !== null && record.sourceMeshReference !== undefined) {
        const sourceMeshKey = sourceReferenceKey(record.sourceMeshReference, `Student ${studentId} equipment binding evidence ${key} sourceMeshReference`)
        assert.equal(sourceMeshKey, sourceReferenceKey(renderer.sourceMesh?.sourceReference, `Student ${studentId} equipment renderer ${key} source mesh`), `Student ${studentId} equipment binding evidence ${key} source mesh identity differs from its core renderer.`)
      }
      continue
    }
    assert.equal(assemblyRenderer.rendererType, 'SkinnedMeshRenderer', `Student ${studentId} structural equipment evidence ${key} is not source-skinned.`)
    assert.equal(renderer.rendererType, 'SkinnedMeshRenderer', `Student ${studentId} structural equipment evidence ${key} is not exported as skinned.`)
    const sourceMeshKey = sourceReferenceKey(record.sourceMeshReference, `Student ${studentId} equipment binding evidence ${key} sourceMeshReference`)
    assert.equal(sourceMeshKey, sourceReferenceKey(renderer.sourceMesh?.sourceReference, `Student ${studentId} equipment renderer ${key} source mesh`), `Student ${studentId} equipment binding evidence ${key} source mesh identity differs from its core renderer.`)
    assert.equal(sourceMeshKey, sourceReferenceKey(assemblyRenderer.meshSourceReference, `Student ${studentId} assembly renderer ${key} source mesh`), `Student ${studentId} equipment binding evidence ${key} source mesh identity differs from its source assembly.`)
    const materialLabel = `Student ${studentId} equipment binding evidence ${key} sourceMaterialReferences`
    const materialKeys = orderedProfileReferenceKeys(record.sourceMaterialReferences, materialLabel)
    const rendererMaterialKeys = materialSlotReferenceKeys(renderer.materialSlots, `Student ${studentId} renderer ${key} material slots`, 'sourceMaterialReference')
    const assemblyMaterialKeys = materialSlotReferenceKeys(assemblyRenderer.materialSlots, `Student ${studentId} assembly renderer ${key} material slots`, 'sourceMaterialReference')
    assert.deepEqual(materialKeys, rendererMaterialKeys, `Student ${studentId} equipment binding evidence ${key} material slot identities differ from its core renderer.`)
    assert.deepEqual(materialKeys, assemblyMaterialKeys, `Student ${studentId} equipment binding evidence ${key} material slot identities differ from its source assembly.`)
    const shaderKeys = orderedProfileReferenceKeys(record.sourceShaderReferences, `Student ${studentId} equipment binding evidence ${key} sourceShaderReferences`)
    const rendererShaderKeys = materialSlotReferenceKeys(renderer.materialSlots, `Student ${studentId} renderer ${key} material slots`, 'sourceShaderReference')
    assert.deepEqual(shaderKeys, rendererShaderKeys, `Student ${studentId} equipment binding evidence ${key} shader slot identities differ from its core renderer.`)
    assert.equal(serializedPointerKey(record.rootBone, `Student ${studentId} equipment binding evidence ${key} rootBone`), serializedPointerKey(assemblyRenderer.rootBone, `Student ${studentId} source assembly renderer ${key} rootBone`), `Student ${studentId} equipment binding evidence ${key} rootBone differs from source assembly.`)
    assert.deepEqual(serializedPointerKeys(record.transformChain, `Student ${studentId} equipment binding evidence ${key} transformChain`), serializedPointerKeys(assemblyRenderer.transformChain ?? [], `Student ${studentId} source assembly renderer ${key} transformChain`), `Student ${studentId} equipment binding evidence ${key} transformChain differs from source assembly.`)
    assert.deepEqual(serializedPointerKeys(record.boneReferences, `Student ${studentId} equipment binding evidence ${key} boneReferences`), serializedPointerKeys(assemblyRenderer.boneReferences ?? [], `Student ${studentId} source assembly renderer ${key} boneReferences`), `Student ${studentId} equipment binding evidence ${key} boneReferences differs from source assembly.`)
    const exactSourceWeaponAncestry = record.reasonCode === 'EXACT_SOURCE_WEAPON_ANCESTRY'
    assert.ok(exactSourceWeaponAncestry || record.reasonCode === 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY', `Student ${studentId} structural equipment evidence ${key} has an invalid reason code.`)
    const matchedPointers = profilePointerArray(record.matchedAncestorPointers, `Student ${studentId} equipment binding evidence ${key} matchedAncestorPointers`)
    assert.ok(matchedPointers.length > 0, `Student ${studentId} structural equipment evidence ${key} has no matched source ancestor.`)
    const sourcePointers = [record.rootBone, ...profilePointerArray(record.transformChain, `Student ${studentId} equipment binding evidence ${key} transformChain`), ...profilePointerArray(record.boneReferences, `Student ${studentId} equipment binding evidence ${key} boneReferences`)]
      .filter(pointer => pointer !== null && pointer !== undefined)
      .map((pointer, index) => serializedPointerKey(pointer, `Student ${studentId} equipment binding evidence ${key} source pointer ${index}`))
    const matchedPointerKeys = matchedPointers.map((pointer, index) => serializedPointerKey(pointer, `Student ${studentId} equipment binding evidence ${key} matchedAncestorPointers[${index}]`))
    assert.equal(new Set(matchedPointerKeys).size, matchedPointers.length, `Student ${studentId} structural equipment evidence ${key} has duplicate matched source ancestors.`)
    if (exactSourceWeaponAncestry) {
      assertExactSourceWeaponAncestry(studentId, key, record, assemblyRenderer, sourceAssembly)
    } else {
      assert.ok(matchedPointerKeys.every(pointer => sourcePointers.includes(pointer)), `Student ${studentId} structural equipment evidence ${key} has a matched ancestor outside its exact source transform/bone identities.`)
    }
    const bodyKeys = profileReferenceKeys(record.bodyRendererReferences, `Student ${studentId} equipment binding evidence ${key} bodyRendererReferences`)
    assert.ok(bodyKeys.every(bodyKey => bodyKey !== key && coreKeys.has(bodyKey) && !excludedKeys.has(bodyKey) && !coreBlockerKeys.has(bodyKey)), `Student ${studentId} structural equipment evidence ${key} has a body renderer conflict.`)
    assertStructuralSourceAncestry(studentId, key, record, renderer, assemblyRenderer, sourceAssembly, !exactSourceWeaponAncestry)
    structuralKeys.add(key)
    assertStructuralEquipmentMovement(studentId, key, renderer, record, assemblyRenderer, sourceAssembly, glbJson, options.actionProfile, options)
  }
  return structuralKeys
}

function sourceValidatedAncestorNodes(
  studentId: number,
  sourceKey: string,
  renderer: JsonRecord,
  record: JsonRecord,
  assemblyRenderer: JsonRecord,
  assembly: JsonRecord,
  nodes: readonly JsonRecord[],
  rendererNodeIndex: number,
  skinNodes: readonly number[],
) {
  const label = `Student ${studentId} structural equipment renderer ${sourceKey} source rootBone ancestry`
  assert.equal(assemblyRenderer.rootBoneAncestryComplete, true, `${label} is incomplete.`)
  assert.ok(Array.isArray(assemblyRenderer.rootBoneAncestry), `${label} must be an array.`)
  const ancestry = assemblyRenderer.rootBoneAncestry as unknown[]
  assert.ok(ancestry.length > 0, `${label} is empty.`)
  const sourceFile = normalizedSourceFile(renderer.sourceReference, `${label} renderer sourceReference`)
  const prefabFile = normalizedSourceFile(assembly.prefabReference, `${label} prefabReference`)
  assert.deepEqual(prefabFile, sourceFile, `${label} crosses the selected source prefab.`)
  const ancestryKeys = ancestry.map((pointer, index) => exactSourcePointerKey(pointer, renderer.sourceReference, `${label}[${index}]`))
  const ancestryNames = ancestry.map((pointer, index) => {
    const value = asRecord(pointer, `${label}[${index}]`).name
    assert.ok(typeof value === 'string' && value.trim(), `${label}[${index}] has no exact transform name.`)
    return value.trim()
  })
  assert.equal(new Set(ancestryKeys).size, ancestryKeys.length, `${label} contains duplicate exact source pointers.`)
  assert.equal(ancestryNames[0], assembly.root, `${label} does not begin at the selected prefab root.`)
  const evidenceAncestry = profilePointerArray(record.rootBoneAncestry, `${label} evidence rootBoneAncestry`)
  if (evidenceAncestry.length > 0) {
    const evidenceKeys = evidenceAncestry.map((pointer: unknown, index: number) => {
      const evidencePointer = asRecord(pointer, `${label} evidence[${index}]`)
      if (evidencePointer.sourceReference !== undefined && evidencePointer.sourceReference !== null) {
        return exactSourcePointerKey(evidencePointer, renderer.sourceReference, `${label} evidence[${index}]`)
      }
      assert.equal(normalizedPointerFile(evidencePointer, `${label} evidence[${index}]`), sourceFile.serializedFile, `${label} legacy evidence[${index}] is outside its exact source file.`)
      return serializedPointerKey(evidencePointer, `${label} evidence[${index}]`)
    })
    assert.deepEqual(evidenceKeys, ancestryKeys, `${label} differs from the source evidence chain.`)
  } else {
    assert.equal(record.reasonCode, 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY', `${label} is empty outside structural fallback evidence.`)
  }

  const rootBoneKey = exactSourcePointerKey(assemblyRenderer.rootBone, renderer.sourceReference, `${label} rootBone`)
  assert.ok(!ancestryKeys.includes(rootBoneKey), `${label} must describe the root-to-parent chain, not include the rootBone itself.`)
  const rootBoneName = asRecord(assemblyRenderer.rootBone, `${label} rootBone`).name
  assert.ok(typeof rootBoneName === 'string' && rootBoneName.trim(), `${label} rootBone has no exact transform name.`)

  // v12 records exact source bone references but not a source parent chain for each joint.
  // Validate each exported joint against one unique source bone identity and the selected
  // prefab root; only the separately evidenced rootBone ancestry is required to be contiguous.
  const sourceBonePointers = profilePointerArray(assemblyRenderer.boneReferences, `${label} source boneReferences`)
  assert.ok(sourceBonePointers.length > 0, `${label} has no source bone references.`)
  const sourceBones = sourceBonePointers.map((pointer: unknown, index: number) => ({
    key: exactSourcePointerKey(pointer, renderer.sourceReference, `${label} source boneReferences[${index}]`),
    name: asRecord(pointer, `${label} source boneReferences[${index}]`).name as string,
  }))
  const sourceBoneKeys = sourceBones.map(pointer => pointer.key)
  assert.equal(new Set(sourceBoneKeys).size, sourceBoneKeys.length, `${label} contains duplicate exact source bone references.`)
  const sourceBoneNames = sourceBones.map(pointer => pointer.name.trim())
  assert.equal(new Set(sourceBoneNames).size, sourceBoneNames.length, `${label} has ambiguous source skin-joint names.`)
  const sourceBoneKeysByName = new Map(sourceBones.map(pointer => [pointer.name.trim(), pointer.key]))

  const nodesByName = new Map<string, number[]>()
  for (const [index, node] of nodes.entries()) {
    if (typeof node?.name !== 'string') continue
    const matches = nodesByName.get(node.name) ?? []
    matches.push(index)
    nodesByName.set(node.name, matches)
  }

  const parents = nodes.map(() => [] as number[])
  for (const [parentIndex, node] of nodes.entries()) {
    if (node.children === undefined) continue
    assert.ok(Array.isArray(node.children), `${label} GLB node ${parentIndex} children must be an array.`)
    for (const child of node.children as unknown[]) {
      assert.ok(Number.isInteger(child) && (child as number) >= 0 && (child as number) < nodes.length, `${label} GLB node ${parentIndex} has an invalid child.`)
      parents[child as number].push(parentIndex)
    }
  }
  const prefabRootName = assembly.root
  assert.ok(typeof prefabRootName === 'string' && prefabRootName.trim(), `${label} has no prefab-root name.`)
  const prefabRootMatches = nodesByName.get(prefabRootName)
  assert.equal(prefabRootMatches?.length, 1, `${label} selected prefab root ${prefabRootName} is not uniquely mapped in the GLB node table.`)
  const rootIndex = prefabRootMatches![0]
  const pathToPrefabRoot = (start: number): number[] | null => {
    const reversePath: number[] = []
    const seen = new Set<number>()
    let current = start
    while (!seen.has(current)) {
      seen.add(current)
      reversePath.push(current)
      if (current === rootIndex) return reversePath.reverse()
      if (parents[current].length !== 1) return null
      current = parents[current][0]
    }
    return null
  }
  const rendererPath = pathToPrefabRoot(rendererNodeIndex)
  assert.ok(rendererPath && rendererPath[0] === rootIndex, `${label} renderer is outside the selected GLB prefab root.`)
  const ancestryNodeIndices = [rootIndex]
  for (let index = 1; index < ancestryNames.length; index++) {
    const parentIndex = ancestryNodeIndices[index - 1]
    const candidates = ((nodes[parentIndex]?.children as number[] | undefined) ?? [])
      .filter(childIndex => nodes[childIndex]?.name === ancestryNames[index])
    assert.equal(candidates.length, 1, `${label} transform ${ancestryNames[index]} is not uniquely mapped on the GLB ancestry path under ${nodes[parentIndex]?.name}.`)
    const candidate = candidates[0]
    assert.deepEqual(parents[candidate], [parentIndex], `${label} does not map contiguously onto the GLB hierarchy at ${ancestryNames[index]}.`)
    ancestryNodeIndices.push(candidate)
  }
  const rootBoneParentIndex = ancestryNodeIndices[ancestryNodeIndices.length - 1]
  const rootBoneMatches = ((nodes[rootBoneParentIndex]?.children as number[] | undefined) ?? [])
    .filter(childIndex => nodes[childIndex]?.name === rootBoneName.trim())
  assert.equal(rootBoneMatches.length, 1, `${label} rootBone ${rootBoneName} is not uniquely mapped on the GLB ancestry path under ${nodes[rootBoneParentIndex]?.name}.`)
  const rootBoneNodeIndex = rootBoneMatches[0]
  assert.deepEqual(parents[rootBoneNodeIndex], [rootBoneParentIndex], `${label} rootBone does not follow its exact GLB parent ancestry.`)
  const rootBonePath = pathToPrefabRoot(rootBoneNodeIndex)
  assert.ok(rootBonePath && rootBonePath[0] === rootIndex, `${label} rootBone is outside the selected prefab root.`)

  assert.ok(skinNodes.length > 0, `${label} GLB skin has no joints.`)
  assert.equal(new Set(skinNodes).size, skinNodes.length, `${label} GLB skin has duplicate joint nodes.`)
  const mappedSourceBoneKeys = new Set<string>()
  let rootBonePathMatched = false
  for (const skinNodeIndex of skinNodes) {
    assert.ok(Number.isInteger(skinNodeIndex) && nodes[skinNodeIndex], `${label} GLB skin joint ${skinNodeIndex} is missing.`)
    const path = pathToPrefabRoot(skinNodeIndex)
    assert.ok(path && path[0] === rootIndex, `${label} GLB skin joint ${skinNodeIndex} is outside the selected prefab root.`)
    const seedName = nodes[skinNodeIndex]?.name
    assert.ok(typeof seedName === 'string' && sourceBoneKeysByName.has(seedName), `${label} GLB skin node ${skinNodeIndex} is not uniquely identified by source bone references.`)
    assert.equal(nodesByName.get(seedName)?.length, 1, `${label} GLB skin node ${skinNodeIndex} is not uniquely mapped to its source bone reference.`)
    const sourceBoneKey = sourceBoneKeysByName.get(seedName)!
    assert.ok(!mappedSourceBoneKeys.has(sourceBoneKey), `${label} maps multiple GLB joints to the same exact source bone reference.`)
    mappedSourceBoneKeys.add(sourceBoneKey)
    if (path.includes(rootBoneNodeIndex)
      && ancestryNames.every((name, index) => nodes[path[index]]?.name === name)) rootBonePathMatched = true
  }
  assert.ok(rootBonePathMatched, `${label} does not map contiguously onto any GLB skin-joint parent path through its rootBone.`)
  return new Set<number>([...ancestryNodeIndices, rootBoneNodeIndex])
}

function closeSourceMotionMetric(actual: unknown, expected: number | null, label: string) {
  if (expected === null) {
    assert.equal(actual, null, `${label} must be null when no matching samples exist.`)
    return
  }
  assert.ok(typeof actual === 'number' && Number.isFinite(actual), `${label} must be finite.`)
  const tolerance = 1e-9 * Math.max(1, Math.abs(actual), Math.abs(expected))
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} differs from independently recomputed samples.`)
}

function sourceMotionVector(value: unknown, length: number, label: string): number[] {
  assert.ok(Array.isArray(value) && value.length === length && value.every((item: unknown) => typeof item === 'number' && Number.isFinite(item)), `${label} is invalid.`)
  return value as number[]
}

function glbSerializedFloat(value: number) {
  const rounded = Math.fround(value)
  return rounded === 0 ? 0 : rounded
}

function normalizedQuaternion(value: unknown, label: string) {
  const quaternion = sourceMotionVector(value, 4, label)
  const length = Math.hypot(...quaternion)
  assert.ok(length > 0, `${label} has zero length.`)
  return quaternion.map(component => component / length)
}

function quaternionAngularDistanceDegrees(leftValue: unknown, rightValue: unknown, label: string) {
  const left = normalizedQuaternion(leftValue, `${label} left quaternion`)
  const right = normalizedQuaternion(rightValue, `${label} right quaternion`)
  const dot = Math.min(1, Math.max(0, Math.abs(left.reduce((sum, component, index) => sum + component * right[index], 0))))
  return 2 * Math.acos(dot) * 180 / Math.PI
}

function vectorDistance(left: readonly number[], right: readonly number[]) {
  return Math.hypot(...left.map((component, index) => component - right[index]))
}

function maxPairwise<T>(values: readonly T[], distance: (left: T, right: T) => number) {
  let maximum = 0
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) maximum = Math.max(maximum, distance(values[left], values[right]))
  }
  return maximum
}

function motionSampleGroups(samples: readonly JsonRecord[], metric: (sample: JsonRecord) => number) {
  const values = (kind: string) => {
    const matching = samples.filter(sample => sample.kind === kind).map(metric)
    return matching.length ? Math.max(...matching) : null
  }
  return {
    maxKeyError: values('key'),
    maxMidpointError: values('midpoint'),
    maxCubicExtremumError: values('cubic-extremum'),
    maxSampleError: Math.max(...samples.map(metric)),
  }
}

function inlineOrAccessorFrames(glbJson: JsonRecord, value: unknown): number[][] | null {
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    if (value.every(row => typeof row === 'number' && Number.isFinite(row))) return (value as number[]).map(item => [item])
    if (value.every(row => Array.isArray(row) && row.every((item: unknown) => typeof item === 'number' && Number.isFinite(item)))) return value as number[][]
    return null
  }
  return Number.isInteger(value) ? readEmbeddedAccessorFrames(glbJson, value) : null
}

function sampleGltfSampler(glbJson: JsonRecord, sampler: JsonRecord, timeSec: number, label: string, quaternion: boolean) {
  const inputs = inlineOrAccessorFrames(glbJson, sampler.input)
  const outputs = inlineOrAccessorFrames(glbJson, sampler.output)
  assert.ok(inputs && outputs && inputs.length > 0 && inputs.every(frame => frame.length === 1), `${label} input/output accessors are incomplete.`)
  const times = inputs!.map(frame => frame[0])
  assert.ok(times.every(Number.isFinite) && times.every((time, index) => index === 0 || time > times[index - 1]), `${label} input times are not strictly increasing.`)
  const interpolation = sampler.interpolation ?? 'LINEAR'
  assert.ok(['STEP', 'LINEAR', 'CUBICSPLINE'].includes(interpolation), `${label} interpolation is unsupported.`)
  const cubic = interpolation === 'CUBICSPLINE'
  assert.equal(outputs!.length, cubic ? times.length * 3 : times.length, `${label} output count does not match its input keys.`)
  const outputValue = (index: number) => outputs![cubic ? index * 3 + 1 : index]
  const finish = (value: number[]) => quaternion ? normalizedQuaternion(value, `${label} sampled rotation`) : value
  if (times.length === 1 || timeSec <= times[0]) return finish(outputValue(0))
  if (timeSec >= times[times.length - 1]) return finish(outputValue(times.length - 1))
  let keyIndex = 0
  while (keyIndex + 1 < times.length && times[keyIndex + 1] < timeSec) keyIndex += 1
  const deltaTime = times[keyIndex + 1] - times[keyIndex]
  const amount = (timeSec - times[keyIndex]) / deltaTime
  const start = outputValue(keyIndex)
  const end = outputValue(keyIndex + 1)
  assert.equal(start.length, end.length, `${label} output vector dimensions differ.`)
  let result: number[]
  if (interpolation === 'STEP') result = start
  else if (cubic) {
    const startOut = outputs![keyIndex * 3 + 2]
    const endIn = outputs![(keyIndex + 1) * 3]
    const t2 = amount * amount
    const t3 = t2 * amount
    const h00 = 2 * t3 - 3 * t2 + 1
    const h10 = t3 - 2 * t2 + amount
    const h01 = -2 * t3 + 3 * t2
    const h11 = t3 - t2
    result = start.map((value, index) => h00 * value + h10 * deltaTime * startOut[index] + h01 * end[index] + h11 * deltaTime * endIn[index])
  } else if (quaternion) {
    const left = normalizedQuaternion(start, `${label} start rotation`)
    const right = normalizedQuaternion(end, `${label} end rotation`)
    let dot = left.reduce((sum, component, index) => sum + component * right[index], 0)
    const adjusted = right.slice()
    if (dot < 0) {
      dot = -dot
      for (let index = 0; index < adjusted.length; index += 1) adjusted[index] *= -1
    }
    if (dot > 0.9995) result = normalizedQuaternion(left.map((value, index) => value + amount * (adjusted[index] - value)), `${label} interpolated rotation`)
    else {
      const angle = Math.acos(Math.min(1, Math.max(-1, dot)))
      const denominator = Math.sin(angle)
      result = normalizedQuaternion(left.map((value, index) => Math.sin((1 - amount) * angle) / denominator * value
        + Math.sin(amount * angle) / denominator * adjusted[index]), `${label} interpolated rotation`)
    }
  } else result = start.map((value, index) => value + (end[index] - value) * amount)
  return finish(result)
}

function sampleGltfTransform(glbJson: JsonRecord, animation: JsonRecord, nodeIndex: number, timeSec: number, label: string) {
  const node = (glbJson.nodes as JsonRecord[])[nodeIndex]
  assert.ok(node, `${label} GLB target node is missing.`)
  assert.ok(!Object.hasOwn(node, 'matrix'), `${label} GLB target node uses a matrix-authored transform that this verifier cannot safely decompose.`)
  const result: JsonRecord = {
    translation: sourceMotionVector(node.translation ?? [0, 0, 0], 3, `${label} base translation`),
    rotation: normalizedQuaternion(node.rotation ?? [0, 0, 0, 1], `${label} base rotation`),
    scale: sourceMotionVector(node.scale ?? [1, 1, 1], 3, `${label} base scale`),
  }
  const seenPaths = new Set<string>()
  const samplers = Array.isArray(animation.samplers) ? animation.samplers as JsonRecord[] : []
  for (const [index, channel] of (Array.isArray(animation.channels) ? animation.channels as JsonRecord[] : []).entries()) {
    if (channel.target?.node !== nodeIndex || !['translation', 'rotation', 'scale'].includes(channel.target?.path)) continue
    const property = channel.target.path as string
    assert.ok(!seenPaths.has(property), `${label} GLB animation has duplicate ${property} channels for one node.`)
    seenPaths.add(property)
    const samplerIndex = channel.sampler
    assert.ok(Number.isInteger(samplerIndex) && samplers[samplerIndex], `${label} GLB channel ${index} has no sampler.`)
    result[property] = sampleGltfSampler(glbJson, samplers[samplerIndex], timeSec, `${label} GLB ${property}`, property === 'rotation')
  }
  return result
}

function sourceTrackProperty(track: JsonRecord, label: string) {
  assert.equal(track.bindingKind, 'transform', `${label} is not a Transform binding.`)
  assert.equal(track.component, 'Transform', `${label} uses an unsupported Transform component.`)
  const property = String(track.property).toLowerCase()
  const path = property === 'translation' || /(?:m_)?localposition(?:\.|$)|(?:^|\.)position(?:\.|$)/.test(property) ? 'translation'
    : /(?:m_)?localrotation(?:\.|$)|(?:^|\.)rotation(?:\.|$)/.test(property) ? 'rotation'
      : /(?:m_)?localscale(?:\.|$)|(?:^|\.)scale(?:\.|$)/.test(property) ? 'scale'
        : null
  assert.ok(path, `${label} has an unsupported source Transform property.`)
  const suffix = property.match(/\.([xyzw])$/)?.[1]
  const axis = suffix ? ({ x: 0, y: 1, z: 2, w: 3 } as const)[suffix as 'x' | 'y' | 'z' | 'w'] : null
  assert.ok(axis === null || (path === 'rotation' ? axis <= 3 : axis <= 2), `${label} property component is invalid for ${path}.`)
  return { path: path as 'translation' | 'rotation' | 'scale', axis }
}

function sourceCurveValue(curve: JsonRecord, timeSec: number, label: string) {
  const keys = curve.keys as JsonRecord[]
  if (!keys.length) {
    assert.ok(typeof curve.initialValue === 'number' && Number.isFinite(curve.initialValue), `${label} has neither keys nor an initial value.`)
    return curve.initialValue as number
  }
  if (curve.sourceKind === 'constant') return (curve.initialValue ?? keys[0].value) as number
  if (timeSec < keys[0].time) return (curve.initialValue ?? keys[0].value) as number
  const exactKey = keys.find(key => key.time === timeSec)
  if (exactKey) return exactKey.value as number
  if (timeSec > keys[keys.length - 1].time) return keys.at(-1)!.value as number
  let leftIndex = 0
  while (leftIndex + 1 < keys.length && keys[leftIndex + 1].time < timeSec) leftIndex += 1
  const left = keys[leftIndex]
  const right = keys[leftIndex + 1]
  const deltaTime = (right.time as number) - (left.time as number)
  assert.ok(deltaTime > 0, `${label} has a non-increasing key interval.`)
  const offset = timeSec - (left.time as number)
  if (left.coefficients !== null) {
    const [cubic, quadratic, linear, start] = left.coefficients as number[]
    return ((cubic * offset + quadratic) * offset + linear) * offset + start
  }
  const amount = offset / deltaTime
  return (left.value as number) + ((right.value as number) - (left.value as number)) * amount
}

function sourceCurveEvents(curve: JsonRecord, clipStart: number, clipStop: number, label: string) {
  const events = new Map<string, { timeSec: number; kind: string }>()
  const add = (timeSec: number, kind: string) => {
    assert.ok(Number.isFinite(timeSec) && timeSec >= clipStart && timeSec <= clipStop, `${label} generated a sample outside the exact source clip range.`)
    events.set(`${timeSec}:${kind}`, { timeSec, kind })
  }
  add(clipStart, 'key')
  add(clipStop, 'key')
  const keys = curve.keys as JsonRecord[]
  for (const key of keys) add(key.time as number, 'key')
  for (let index = 0; index + 1 < keys.length; index += 1) {
    const left = keys[index]
    const right = keys[index + 1]
    const span = (right.time as number) - (left.time as number)
    assert.ok(span > 0, `${label} has a non-increasing key interval.`)
    add(((left.time as number) + (right.time as number)) / 2, 'midpoint')
    if (left.coefficients === null) continue
    const [cubic, quadratic, linear] = left.coefficients as number[]
    const a = 3 * cubic
    const b = 2 * quadratic
    const c = linear
    const roots = a === 0
      ? (b === 0 ? [] : [-c / b])
      : (() => {
          const discriminant = b * b - 4 * a * c
          if (discriminant < 0) return []
          const root = Math.sqrt(discriminant)
          return discriminant === 0 ? [-b / (2 * a)] : [(-b - root) / (2 * a), (-b + root) / (2 * a)]
        })()
    for (const offset of roots) if (offset > 0 && offset < span) add((left.time as number) + offset, 'cubic-extremum')
  }
  return [...events.values()].sort((left, right) => left.timeSec - right.timeSec || left.kind.localeCompare(right.kind))
}

function sourceCurveAxis(track: JsonRecord, curve: JsonRecord, label: string) {
  const property = sourceTrackProperty(track, label)
  const component = curve.component as string
  const axisByComponent: Record<string, number> = { x: 0, y: 1, z: 2, w: 3 }
  const axis = property.axis ?? axisByComponent[component]
  assert.ok(Number.isInteger(axis), `${label} source curve component does not map to a Transform axis.`)
  assert.equal(component, ['x', 'y', 'z', 'w'][axis], `${label} source curve component differs from its Transform property axis.`)
  assert.ok(property.path === 'rotation' || axis < 3, `${label} has a quaternion-only component on a non-rotation property.`)
  return { property, axis }
}

function unityToGltfLocalTrs(raw: JsonRecord, label: string) {
  const translation = sourceMotionVector(raw.translation, 3, `${label} source local translation`)
  const rotation = normalizedQuaternion(raw.rotation, `${label} source local rotation`)
  const scale = sourceMotionVector(raw.scale, 3, `${label} source local scale`)
  return {
    translation: [-translation[0] / 100, translation[1] / 100, translation[2] / 100],
    rotation: normalizedQuaternion([rotation[0], -rotation[1], -rotation[2], rotation[3]], `${label} converted source local rotation`),
    scale: [...scale],
  }
}

function recomputeSourceSamples(row: JsonRecord, label: string) {
  const clipRange = asRecord(row.sourceClipRange, `${label} source clip range`)
  const clipStart = clipRange.startTimeSec as number
  const clipStop = clipRange.stopTimeSec as number
  const tracks = row.tracks as JsonRecord[]
  const byTransform = new Map<string, JsonRecord[]>()
  for (const track of tracks) {
    if (track.sourceTransformReference === null || track.sourceTransformReference === undefined) continue
    const key = sourceReferenceKey(track.sourceTransformReference, `${label} source Transform reference`)
    const group = byTransform.get(key) ?? []
    group.push(track)
    byTransform.set(key, group)
  }
  const result = new Map<string, JsonRecord[]>()
  for (const [reference, group] of byTransform) {
    const target = asRecord(group[0].sourceTarget, `${label} ${reference} sourceTarget`)
    const rawBase = asRecord(target.sourceLocalTrs, `${label} ${reference} sourceLocalTrs`)
    const base = {
      translation: [...sourceMotionVector(rawBase.translation, 3, `${label} ${reference} base translation`)],
      rotation: [...sourceMotionVector(rawBase.rotation, 4, `${label} ${reference} base rotation`)],
      scale: [...sourceMotionVector(rawBase.scale, 3, `${label} ${reference} base scale`)],
    }
    const curves: Array<{ track: JsonRecord; curve: JsonRecord; path: 'translation' | 'rotation' | 'scale'; axis: number }> = []
    const boundComponents = new Set<string>()
    for (const [trackIndex, track] of group.entries()) {
      const trackLabel = `${label} ${reference} track ${track.curveIndex ?? trackIndex}`
      const currentTarget = asRecord(track.sourceTarget, `${trackLabel} sourceTarget`)
      assert.equal(canonicalSourceMotionJson(currentTarget.sourceLocalTrs), canonicalSourceMotionJson(rawBase), `${trackLabel} source local rest TRS differs from sibling bindings.`)
      const property = sourceTrackProperty(track, trackLabel)
      const sourceCurves = track.sourceCurves as JsonRecord[]
      const expectedComponents = property.axis === null
        ? (property.path === 'rotation' ? ['x', 'y', 'z', 'w'] : ['x', 'y', 'z'])
        : [['x', 'y', 'z', 'w'][property.axis]]
      assert.deepEqual(sourceCurves.map(curve => curve.component).sort(), [...expectedComponents].sort(), `${trackLabel} source component curves do not cover its exact Transform binding.`)
      for (const curve of sourceCurves) {
        assert.notEqual(curve.sourceKind, 'unresolved', `${trackLabel} has an unresolved source component curve.`)
        const mapped = sourceCurveAxis(track, curve, trackLabel)
        const componentKey = `${mapped.property.path}:${mapped.axis}`
        assert.ok(!boundComponents.has(componentKey), `${trackLabel} duplicates a source Transform component binding.`)
        boundComponents.add(componentKey)
        curves.push({ track, curve, path: mapped.property.path, axis: mapped.axis })
      }
      const curveValues = sourceCurves.map(curve => sourceCurveEvents(curve, clipStart, clipStop, `${trackLabel} value-class sample`).map(event => sourceCurveValue(curve, event.timeSec, `${trackLabel} value-class sample`)))
      assert.ok(curveValues.every(values => values.length > 0), `${trackLabel} has no scalar samples for its source value class.`)
      const valueClass = curveValues.some(values => values.some(value => value !== values[0])) ? 'dynamic' : 'constant'
      assert.equal(track.valueClass, valueClass, `${trackLabel} source valueClass differs from its decoded scalar curves.`)
    }
    const eventMap = new Map<string, { timeSec: number; kind: string }>()
    for (const event of sourceCurveEvents({ keys: [] }, clipStart, clipStop, `${label} ${reference} clip range`)) eventMap.set(`${event.timeSec}:${event.kind}`, event)
    for (const { curve } of curves) for (const event of sourceCurveEvents(curve, clipStart, clipStop, `${label} ${reference} curve`)) eventMap.set(`${event.timeSec}:${event.kind}`, event)
    const events = [...eventMap.values()].sort((left, right) => left.timeSec - right.timeSec || left.kind.localeCompare(right.kind))
    const samples = events.map(event => {
      const raw = { translation: [...base.translation], rotation: [...base.rotation], scale: [...base.scale] }
      for (const { curve, path, axis } of curves) raw[path][axis] = sourceCurveValue(curve, event.timeSec, `${label} ${reference} ${path}.${axis}`)
      const source = unityToGltfLocalTrs(raw, `${label} ${reference} at ${event.timeSec}`)
      return { timeSec: event.timeSec, kind: event.kind, source }
    })
    for (const track of group) {
      const evidence = track.sampleEvidence as JsonRecord[]
      assert.equal(evidence.length, samples.length, `${label} ${reference} sample evidence omits or adds source events.`)
      for (const [index, expected] of samples.entries()) {
        const actual = evidence[index]
        assert.equal(actual.timeSec, expected.timeSec, `${label} ${reference} sample ${index} time differs from independently generated source events.`)
        assert.equal(actual.kind, expected.kind, `${label} ${reference} sample ${index} kind differs from independently generated source events.`)
        for (const field of ['translation', 'rotation', 'scale'] as const) {
          const values = sourceMotionVector(asRecord(actual.source, `${label} ${reference} sample ${index} source`)[field], field === 'rotation' ? 4 : 3, `${label} ${reference} sample ${index} source ${field}`)
          expected.source[field].forEach((component, componentIndex) => closeSourceMotionMetric(values[componentIndex], component, `${label} ${reference} sample ${index} source ${field}[${componentIndex}]`))
        }
      }
      result.set(String(track.curveIndex), samples)
    }
  }
  return result
}

function sampledPropertyValues(samples: readonly JsonRecord[], space: 'source' | 'glb', path: 'translation' | 'rotation' | 'scale', axis: number | null) {
  const values = samples.map(sample => sourceMotionVector(sample[space]?.[path], path === 'rotation' ? 4 : 3, `${space}.${path}`))
  return axis === null ? values : values.map(value => [value[axis]])
}

function sampledPropertyExcursion(samples: readonly JsonRecord[], space: 'source' | 'glb', property: { path: 'translation' | 'rotation' | 'scale'; axis: number | null }, label: string) {
  const values = sampledPropertyValues(samples, space, property.path, property.axis)
  if (property.path === 'rotation') return maxPairwise(values, (left, right) => quaternionAngularDistanceDegrees(left, right, label))
  return maxPairwise(values, vectorDistance)
}

function gltfSamplerFrames(glbJson: JsonRecord, sampler: JsonRecord, label: string) {
  const input = inlineOrAccessorFrames(glbJson, sampler.input)
  const output = inlineOrAccessorFrames(glbJson, sampler.output)
  assert.ok(input && output && input.length > 0 && input.every(frame => frame.length === 1), `${label} input/output accessors are incomplete.`)
  const times = input!.map(frame => frame[0])
  assert.ok(times.every(Number.isFinite) && times.every((time, index) => index === 0 || time > times[index - 1]), `${label} input times are not strictly increasing.`)
  const cubic = (sampler.interpolation ?? 'LINEAR') === 'CUBICSPLINE'
  assert.ok(['STEP', 'LINEAR', 'CUBICSPLINE'].includes(sampler.interpolation ?? 'LINEAR'), `${label} interpolation is unsupported.`)
  assert.equal(output!.length, cubic ? times.length * 3 : times.length, `${label} output count does not match its input keys.`)
  return { times, output: output!, cubic }
}

function assertGltfChannelPropertyStatic(glbJson: JsonRecord, animation: JsonRecord, channel: JsonRecord, label: string, axis: number | null) {
  const sampler = (animation.samplers as JsonRecord[] | undefined)?.[channel.sampler]
  assert.ok(sampler, `${label} has no sampler.`)
  const { output, cubic } = gltfSamplerFrames(glbJson, sampler, label)
  const width = channel.target?.path === 'rotation' ? 4 : 3
  const component = axis === null ? null : axis
  const valueAt = (keyIndex: number) => output[cubic ? keyIndex * 3 + 1 : keyIndex]
  const first = valueAt(0)
  assert.equal(first.length, width, `${label} output dimensions differ from the target path.`)
  for (let keyIndex = 1; keyIndex < (cubic ? output.length / 3 : output.length); keyIndex += 1) {
    const current = valueAt(keyIndex)
    if (channel.target.path === 'rotation' && component === null) {
      assert.ok(quaternionAngularDistanceDegrees(first, current, label) <= 1e-7, `${label} rotation channel changes orientation.`)
    } else {
      const indices = component === null ? first.map((_, index) => index) : [component]
      assert.ok(indices.every(index => Math.abs(first[index] - current[index]) <= 1e-7), `${label} channel changes its bound component.`)
    }
  }
  if (cubic) {
    const tangentIndices = output.map((_, index) => index).filter(index => index % 3 !== 1)
    const components = component === null ? first.map((_, index) => index) : [component]
    assert.ok(tangentIndices.every(index => components.every(axisIndex => Math.abs(output[index][axisIndex]) <= 1e-7)), `${label} cubic tangent can create movement between keys.`)
  }
}

function assertMappedChannelUnboundComponentsMatchSourceRest(
  row: JsonRecord,
  track: JsonRecord,
  glbJson: JsonRecord,
  animation: JsonRecord,
  channel: JsonRecord,
  channelIndex: number,
  property: { path: 'translation' | 'rotation' | 'scale'; axis: number | null },
  label: string,
) {
  if (property.axis === null || property.path === 'rotation') return
  const target = asRecord(track.sourceTarget, `${label} sourceTarget`)
  const nodeIndex = target.glbNodeIndex as number
  const rawRest = asRecord(target.sourceLocalTrs, `${label} source local rest TRS`)
  const expectedTrs = unityToGltfLocalTrs(rawRest, `${label} source local rest`)
  const expected = expectedTrs[property.path]
  const coveredAxes = new Set<number>()
  for (const [candidateIndex, candidateValue] of (row.tracks as unknown[]).entries()) {
    const candidate = asRecord(candidateValue, `${label} sibling source track ${candidateIndex}`)
    if (asRecord(candidate.sourceTarget, `${label} sibling sourceTarget`).glbNodeIndex !== nodeIndex) continue
    const candidateProperty = sourceTrackProperty(candidate, `${label} sibling source track ${candidateIndex}`)
    if (candidateProperty.path !== property.path) continue
    for (const mappingValue of candidate.glbChannels as unknown[]) {
      const mapping = asRecord(mappingValue, `${label} sibling mapped channel`)
      if (mapping.channelIndex !== channelIndex) continue
      assert.equal(mapping.targetNodeIndex, nodeIndex, `${label} sibling mapping targets a different GLB node.`)
      assert.equal(mapping.targetPath, property.path, `${label} sibling mapping targets a different GLB property.`)
      if (candidateProperty.axis === null) for (let axis = 0; axis < 3; axis += 1) coveredAxes.add(axis)
      else coveredAxes.add(candidateProperty.axis)
    }
  }
  assert.ok(coveredAxes.has(property.axis), `${label} mapped channel does not cover its bound component.`)
  const samplerIndex = channel.sampler as number
  const sampler = (animation.samplers as JsonRecord[] | undefined)?.[samplerIndex]
  assert.ok(sampler, `${label} mapped channel has no sampler.`)
  const { output, cubic } = gltfSamplerFrames(glbJson, sampler, label)
  const keyCount = cubic ? output.length / 3 : output.length
  for (let keyIndex = 0; keyIndex < keyCount; keyIndex += 1) {
    const value = output[cubic ? keyIndex * 3 + 1 : keyIndex]
    for (let axis = 0; axis < 3; axis += 1) {
      if (coveredAxes.has(axis)) continue
      assert.equal(glbSerializedFloat(value[axis]), glbSerializedFloat(expected[axis]), `${label} unbound ${property.path}[${axis}] differs from source rest at sampler key ${keyIndex}.`)
      if (cubic) {
        assert.equal(glbSerializedFloat(output[keyIndex * 3][axis]), 0, `${label} unbound ${property.path}[${axis}] has an incoming cubic tangent.`)
        assert.equal(glbSerializedFloat(output[keyIndex * 3 + 2][axis]), 0, `${label} unbound ${property.path}[${axis}] has an outgoing cubic tangent.`)
      }
    }
  }
}

function assertGltfNodeStatic(glbJson: JsonRecord, animation: JsonRecord, nodeIndex: number, label: string, boundedChannelIndices = new Set<number>()) {
  const channels = Array.isArray(animation.channels) ? animation.channels as JsonRecord[] : []
  for (const [index, channel] of channels.entries()) {
    if (boundedChannelIndices.has(index)) continue
    if (channel.target?.node !== nodeIndex || !['translation', 'rotation', 'scale'].includes(channel.target?.path)) continue
    assertGltfChannelPropertyStatic(glbJson, animation, channel, `${label} channel ${index}`, null)
  }
}

function recomputeSourceMotionTiming(track: JsonRecord, glbJson: JsonRecord, animation: JsonRecord, clipRange: JsonRecord, label: string, includeClipEndpoints = true) {
  const sourceTimes = [...new Set((track.sourceCurves as JsonRecord[]).flatMap(curve => (curve.keys as JsonRecord[]).map(key => key.time as number)))].sort((left, right) => left - right)
  assert.ok(Number.isFinite(clipRange.startTimeSec) && Number.isFinite(clipRange.stopTimeSec)
    && clipRange.startTimeSec >= 0 && clipRange.stopTimeSec >= clipRange.startTimeSec, `${label} source clip range is invalid for timing proof.`)
  assert.equal(track.glbChannels.length, 1, `${label} mapped source binding does not map to exactly one GLB channel.`)
  const mapping = asRecord(track.glbChannels[0], `${label} preserved GLB channel`)
  const sampler = (animation.samplers as JsonRecord[] | undefined)?.[mapping.samplerIndex]
  assert.ok(sampler, `${label} preserved source binding maps to a missing GLB sampler.`)
  const { times: glbTimes } = gltfSamplerFrames(glbJson, sampler, `${label} preserved GLB sampler`)
  const timingPoints = includeClipEndpoints
    ? [...new Set([clipRange.startTimeSec, ...sourceTimes, clipRange.stopTimeSec])].sort((left, right) => left - right)
    : sourceTimes
  assert.ok(timingPoints.length > 0, `${label} source clip has no timing points.`)
  const offsets = timingPoints.map(sourceTime => {
    const distances = glbTimes.map(glbTime => Math.abs(glbTime - sourceTime))
    const nearestDistance = Math.min(...distances)
    assert.equal(distances.filter(distance => distance === nearestDistance).length, 1, `${label} preserved source key has an ambiguous nearest GLB sampler input.`)
    const selectedTime = glbTimes[distances.indexOf(nearestDistance)]
    return (selectedTime - sourceTime) * 1000
  })
  return {
    maxAbsDeltaMs: Math.max(...offsets.map(Math.abs)),
    cumulativeDriftMs: offsets.at(-1)! - offsets[0],
  }
}

function assertBoundedPropertyMatchesNodeDefault(sample: JsonRecord, glbJson: JsonRecord, nodeIndex: number, property: { path: 'translation' | 'rotation' | 'scale'; axis: number | null }, label: string) {
  const node = (glbJson.nodes as JsonRecord[] | undefined)?.[nodeIndex]
  assert.ok(node && typeof node === 'object' && !Object.hasOwn(node, 'matrix'), `${label} has no safely decomposable GLB node default.`)
  const defaults = {
    translation: sourceMotionVector(node.translation ?? [0, 0, 0], 3, `${label} node-default translation`),
    rotation: normalizedQuaternion(node.rotation ?? [0, 0, 0, 1], `${label} node-default rotation`),
    scale: sourceMotionVector(node.scale ?? [1, 1, 1], 3, `${label} node-default scale`),
  }
  const sampled = sourceMotionVector(sample.glb?.[property.path], property.path === 'rotation' ? 4 : 3, `${label} sampled GLB ${property.path}`)
  const expected = defaults[property.path]
  if (property.axis !== null) {
    closeSourceMotionMetric(sampled[property.axis], expected[property.axis], `${label} sampled GLB ${property.path}[${property.axis}] node default`)
  } else if (property.path === 'rotation') {
    assert.ok(quaternionAngularDistanceDegrees(sampled, expected, label) <= 1e-7, `${label} sampled GLB rotation differs from the node default.`)
  } else {
    sampled.forEach((value, index) => closeSourceMotionMetric(value, expected[index], `${label} sampled GLB ${property.path}[${index}] node default`))
  }
}

function assertSourceGlbPropertySerializedEqual(
  sourceValue: unknown,
  glbValue: unknown,
  property: { path: 'translation' | 'rotation' | 'scale'; axis: number | null },
  label: string,
) {
  const source = sourceMotionVector(asRecord(sourceValue, `${label} source TRS`)[property.path], property.path === 'rotation' ? 4 : 3, `${label} source ${property.path}`)
  const glb = sourceMotionVector(asRecord(glbValue, `${label} GLB TRS`)[property.path], property.path === 'rotation' ? 4 : 3, `${label} GLB ${property.path}`)
  if (property.path === 'rotation') {
    const roundedSource = source.map(glbSerializedFloat)
    const roundedGlb = glb.map(glbSerializedFloat)
    const same = roundedSource.every((value, index) => value === roundedGlb[index])
      || roundedSource.every((value, index) => value === -roundedGlb[index])
    assert.ok(same, `${label} source and GLB serialized rotation differ.`)
    return
  }
  const indices = property.axis === null ? source.map((_, index) => index) : [property.axis]
  for (const index of indices) assert.equal(glbSerializedFloat(source[index]), glbSerializedFloat(glb[index]), `${label} source and GLB serialized ${property.path}[${index}] differ.`)
}

function assertMotionBodySelectorMatchesProfile(
  value: unknown,
  modelHeightUnits: number,
  profile: JsonRecord,
  equipmentRendererKey: string,
  label: string,
  studentId: number,
  glbJson: JsonRecord,
  options: CharacterContractOptions,
) {
  const evidence = assertSourceMotionModelHeightEvidence(value, modelHeightUnits, label)
  if (evidence.selector === 'reviewed-isolated-glb-body-role-witness-v1') {
    assert.ok(options.reviewedBodyRoleWitness, `${label} reviewed body-role artifacts were not independently verified from disk and the full GLB.`)
    return assertReviewedHanaeBodyRoleWitnessMatchesProfile({
      value: evidence,
      modelHeightUnits,
      studentId,
      sourceIdentity: options.sourceIdentity,
      assetSha256: options.assetIdentity?.sha256,
      profile,
      glbJson,
      verifiedWitness: options.reviewedBodyRoleWitness,
      label,
    })
  }

  const equipmentRows = (Array.isArray(profile.equipmentBindingEvidence) ? profile.equipmentBindingEvidence : []) as JsonRecord[]
  const matches = equipmentRows.filter(candidate => sourceReferenceKey(candidate.sourceReference, `${label} profile equipment sourceReference`) === equipmentRendererKey)
  assert.equal(matches.length, 1, `${label} does not resolve to exactly one persisted equipmentBindingEvidence record.`)
  const declared = matches[0].bodyRendererReferences
  assert.ok(Array.isArray(declared) && declared.length > 0, `${label} exact bodyRendererReferences selector is absent in the persisted profile.`)
  const declaredKeys = declared.map((reference: unknown, index: number) => sourceReferenceKey(reference, `${label} profile body renderer ${index}`))
  const proofKeys = (evidence.rendererReferences as unknown[]).map((reference, index) => sourceReferenceKey(reference, `${label} proof body renderer ${index}`))
  assert.equal(new Set(declaredKeys).size, declaredKeys.length, `${label} persisted body-renderer selector is ambiguous.`)
  assert.deepEqual([...proofKeys].sort(), [...declaredKeys].sort(), `${label} source-motion proof body-renderer selector differs from the persisted equipment evidence.`)
  const renderers = (Array.isArray(profile.renderers) ? profile.renderers : []) as JsonRecord[]
  const nodeIndices = proofKeys.map((key, index) => {
    const rendererMatches = renderers.filter(candidate => sourceReferenceKey(candidate.sourceReference, `${label} profile renderer ${index} sourceReference`) === key)
    assert.equal(rendererMatches.length, 1, `${label} body renderer ${key} is not unique in the persisted profile.`)
    const renderer = rendererMatches[0]
    assert.equal(renderer.rendererType, 'SkinnedMeshRenderer', `${label} body selector contains a non-skinned renderer.`)
    assert.ok(Number.isInteger(renderer.glbNodeIndex) && renderer.glbNodeIndex >= 0, `${label} body renderer ${key} has no exact GLB node.`)
    return renderer.glbNodeIndex as number
  })
  assert.deepEqual(evidence.glbNodeIndices, nodeIndices, `${label} body GLB node selector differs from exact persisted renderer identities.`)
  return evidence
}

function assertSourceMotionComparison(row: JsonRecord, track: JsonRecord, animation: JsonRecord, glbJson: JsonRecord, clipRange: JsonRecord, schemaVersion: 2 | 3, label: string, recomputedSourceSamples: readonly JsonRecord[]) {
  const comparison = asRecord(track.comparison, `${label} comparison`)
  assert.equal(comparison.policyId, V12_MOTION_MATERIALITY_POLICY_ID, `${label} materiality policy differs from the frozen v12 planning policy.`)
  const mode = comparison.mode
  assert.ok(mode === 'exact-motion-accounting' || mode === 'policy-gated', `${label} comparison mode is unsupported.`)
  if (mode === 'exact-motion-accounting') {
    assert.equal(comparison.modelHeightUnits, null, `${label} exact comparison must not claim a model height.`)
    assert.equal(comparison.modelHeightEvidence, null, `${label} exact comparison must not claim body-height evidence.`)
  } else {
    assert.ok(typeof comparison.modelHeightUnits === 'number' && Number.isFinite(comparison.modelHeightUnits) && comparison.modelHeightUnits > 0, `${label} model height is invalid.`)
    assertSourceMotionModelHeightEvidence(comparison.modelHeightEvidence, comparison.modelHeightUnits, label)
  }
  const samples = (track.sampleEvidence as JsonRecord[]).map((sample, index) => assertMotionSample(sample, `${label} sample ${index}`))
  const nodeIndex = asRecord(track.sourceTarget, `${label} sourceTarget`).glbNodeIndex as number
  const property = sourceTrackProperty(track, label)
  assert.equal(samples.length, recomputedSourceSamples.length, `${label} sample evidence differs from independently recomputed source events.`)
  const actualSamples = samples.map((sample, index) => {
    const expectedSource = recomputedSourceSamples[index]
    assert.equal(sample.timeSec, expectedSource.timeSec, `${label} sample ${index} source time differs from independently recomputed source events.`)
    assert.equal(sample.kind, expectedSource.kind, `${label} sample ${index} source event kind differs from independently recomputed source events.`)
    for (const field of ['translation', 'rotation', 'scale'] as const) {
      const claimed = sourceMotionVector(sample.source[field], field === 'rotation' ? 4 : 3, `${label} sample ${index} claimed source ${field}`)
      const expectedValues = sourceMotionVector(expectedSource.source[field], field === 'rotation' ? 4 : 3, `${label} sample ${index} recomputed source ${field}`)
      expectedValues.forEach((component: number, componentIndex: number) => closeSourceMotionMetric(claimed[componentIndex], component, `${label} sample ${index} independently recomputed source ${field}[${componentIndex}]`))
    }
    const actual = sampleGltfTransform(glbJson, animation, nodeIndex, expectedSource.timeSec, `${label} sample ${index}`)
    for (const field of ['translation', 'rotation', 'scale'] as const) {
      const claimed = sample.glb[field] as number[]
      const values = actual[field] as number[]
      for (let component = 0; component < values.length; component += 1) closeSourceMotionMetric(claimed[component], values[component], `${label} GLB ${field}[${component}] sample ${index}`)
    }
    return { ...sample, source: expectedSource.source, glb: actual } as JsonRecord
  })
  const translationMetric = asRecord(comparison.translation, `${label} translation comparison`)
  const quaternionMetric = asRecord(comparison.quaternion, `${label} quaternion comparison`)
  const scaleMetric = asRecord(comparison.scale, `${label} scale comparison`)
  assert.equal(translationMetric.unit, 'glb-model-units', `${label} translation units are unsupported.`)
  assert.equal(quaternionMetric.unit, 'degrees', `${label} quaternion units are unsupported.`)
  assert.equal(scaleMetric.unit, 'dimensionless', `${label} scale units are unsupported.`)
  const translationErrors = motionSampleGroups(actualSamples, sample => vectorDistance(sample.source.translation, sample.glb.translation))
  const quaternionErrors = motionSampleGroups(actualSamples, sample => quaternionAngularDistanceDegrees(sample.source.rotation, sample.glb.rotation, label))
  const translationExcursion = maxPairwise(actualSamples.map(sample => sample.source.translation as number[]), vectorDistance)
  const quaternionExcursion = maxPairwise(actualSamples.map(sample => sample.source.rotation as number[]), (left, right) => quaternionAngularDistanceDegrees(left, right, label))
  const modelHeightUnits = mode === 'policy-gated' ? comparison.modelHeightUnits as number : 0
  const translationGate = Math.min(V12_MOTION_GATES.translationMaxHeightFraction * modelHeightUnits,
    V12_MOTION_GATES.translationBaseHeightFraction * modelHeightUnits + V12_MOTION_GATES.excursionFraction * translationExcursion)
  const quaternionGate = Math.min(V12_MOTION_GATES.quaternionMaxDegrees,
    V12_MOTION_GATES.quaternionBaseDegrees + V12_MOTION_GATES.excursionFraction * quaternionExcursion)
  for (const [name, metric, expected, gate] of [
    ['translation', translationMetric, translationErrors, translationGate],
    ['quaternion', quaternionMetric, quaternionErrors, quaternionGate],
  ] as const) {
    for (const field of ['maxKeyError', 'maxMidpointError', 'maxCubicExtremumError', 'maxSampleError'] as const) closeSourceMotionMetric(metric[field], expected[field], `${label} ${name}.${field}`)
    closeSourceMotionMetric(metric.sourceExcursion, name === 'translation' ? translationExcursion : quaternionExcursion, `${label} ${name}.sourceExcursion`)
    if (mode === 'policy-gated') {
      closeSourceMotionMetric(metric.gate, gate, `${label} ${name}.gate`)
      closeSourceMotionMetric(metric.errorGateRatio, expected.maxSampleError / gate, `${label} ${name}.errorGateRatio`)
      if (schemaVersion === 2) assert.ok(expected.maxSampleError <= gate, `${label} ${name} error exceeds the frozen v12 materiality gate.`)
    } else {
      assert.equal(metric.gate, null, `${label} exact ${name} comparison must not invent a numeric gate.`)
      assert.equal(metric.errorGateRatio, null, `${label} exact ${name} comparison must not invent a materiality ratio.`)
    }
  }
  const axes = asRecord(scaleMetric.axes, `${label} scale axes`)
  for (const [axisIndex, axis] of (['x', 'y', 'z'] as const).entries()) {
    const metric = asRecord(axes[axis], `${label} scale.${axis}`)
    const errors = motionSampleGroups(actualSamples, sample => Math.abs(sample.source.scale[axisIndex] - sample.glb.scale[axisIndex]))
    const sourceScales = actualSamples.map(sample => sample.source.scale[axisIndex])
    const sourceMagnitude = Math.max(...sourceScales.map(value => Math.abs(value)))
    const gate = Math.min(...sourceScales.map(value => Math.max(V12_MOTION_GATES.scaleAbsoluteFloor, V12_MOTION_GATES.scaleRelativeFraction * Math.abs(value))))
    for (const field of ['maxKeyError', 'maxMidpointError', 'maxCubicExtremumError', 'maxSampleError'] as const) closeSourceMotionMetric(metric[field], errors[field], `${label} scale.${axis}.${field}`)
    closeSourceMotionMetric(metric.sourceMagnitude, sourceMagnitude, `${label} scale.${axis}.sourceMagnitude`)
    if (mode === 'policy-gated') {
      closeSourceMotionMetric(metric.gate, gate, `${label} scale.${axis}.gate`)
      closeSourceMotionMetric(metric.errorGateRatio, errors.maxSampleError / gate, `${label} scale.${axis}.errorGateRatio`)
      if (schemaVersion === 2) assert.ok(errors.maxSampleError <= gate, `${label} scale.${axis} error exceeds the frozen v12 materiality gate.`)
    } else {
      assert.equal(metric.gate, null, `${label} exact scale.${axis} comparison must not invent a numeric gate.`)
      assert.equal(metric.errorGateRatio, null, `${label} exact scale.${axis} comparison must not invent a materiality ratio.`)
    }
  }
  assert.ok(Array.isArray(comparison.scaleSignZeroTransitions) && comparison.scaleSignZeroTransitions.length === 0, `${label} has an unexpected scale-sign/zero transition.`)
  for (const axis of [0, 1, 2]) {
    const sourceValues = actualSamples.map(sample => sample.source.scale[axis])
    const glbValues = actualSamples.map(sample => sample.glb.scale[axis])
    const sourceSigns = new Set(sourceValues.map(value => Math.sign(value)))
    const glbSigns = new Set(glbValues.map(value => Math.sign(value)))
    assert.ok(sourceValues.every(value => Math.abs(value) > 1e-9) && glbValues.every(value => Math.abs(value) > 1e-9), `${label} has a sampled scale value at or near zero.`)
    assert.equal(sourceSigns.size, 1, `${label} source scale changes sign within the sampled action.`)
    assert.equal(glbSigns.size, 1, `${label} GLB scale changes sign within the sampled action.`)
    assert.equal([...sourceSigns][0], [...glbSigns][0], `${label} source and GLB scale signs differ.`)
  }
  assert.equal(comparison.visibilityChanges, false, `${label} changes visibility on a required core transform.`)
  const timing = asRecord(comparison.timing, `${label} timing comparison`)
  assert.equal(timing.gateMs, V12_MOTION_GATES.timingMaxMs, `${label} timing gate differs from the frozen v12 planning policy.`)
  if (mode === 'policy-gated' && schemaVersion === 3) {
    const withinBoundGate = property.path === 'translation'
      ? translationErrors.maxSampleError <= translationGate
      : property.path === 'rotation'
        ? quaternionErrors.maxSampleError <= quaternionGate
        : (property.axis === null ? (['x', 'y', 'z'] as const) : [['x', 'y', 'z'][property.axis] as 'x' | 'y' | 'z'])
          .every(axis => {
            const metric = asRecord(axes[axis], `${label} scale.${axis}`)
            return Number(metric.maxSampleError) <= Number(metric.gate)
          })
    assert.ok(withinBoundGate, `${label} bound ${property.path}${property.axis === null ? '' : `.${['x', 'y', 'z', 'w'][property.axis]}`} error exceeds the frozen v12 materiality gate.`)
  }
  const sourceExcursion = sampledPropertyExcursion(actualSamples, 'source', property, label)
  const glbExcursion = sampledPropertyExcursion(actualSamples, 'glb', property, label)
  if (track.valueClass === 'constant') assert.equal(sourceExcursion, 0, `${label} is classified constant but its sampled source property moves.`)
  if (track.disposition === 'exact-static') {
    assert.equal(mode, 'exact-motion-accounting', `${label} exact-static disposition has a materiality-gated comparison.`)
    assert.equal(track.valueClass, 'constant', `${label} exact-static disposition is not source-constant.`)
    assert.equal(track.glbChannels.length, 0, `${label} exact-static disposition unexpectedly claims an animation channel.`)
    if (schemaVersion === 2) {
      assert.equal((animation.channels as JsonRecord[]).some(channel => channel.target?.node === nodeIndex), false, `${label} exact-static GLB node has an animation channel.`)
      for (const sample of actualSamples) {
        const expected = sample.source as JsonRecord
        const expectedRotation = normalizedQuaternion((expected.rotation as number[]).map(glbSerializedFloat), `${label} rounded source rotation`)
        for (const [field, rounded] of [
          ['translation', (expected.translation as number[]).map(glbSerializedFloat)],
          ['rotation', expectedRotation],
          ['scale', (expected.scale as number[]).map(glbSerializedFloat)],
        ] as const) assert.deepEqual(sample.glb[field], rounded, `${label} source ${field} does not equal the exact serialized GLB node default.`)
      }
    } else {
      assert.equal((animation.channels as JsonRecord[]).some(channel => channel.target?.node === nodeIndex && channel.target?.path === property.path), false, `${label} exact-static GLB property has an animation channel.`)
      for (const sample of actualSamples) assertSourceGlbPropertySerializedEqual(sample.source, sample.glb, property, `${label} exact-static`)
    }
  } else if (track.disposition === 'bounded-source-to-static') {
    assert.equal(mode, 'policy-gated', `${label} bounded source-to-static disposition lacks an exact body-height gate.`)
    if (schemaVersion === 3) assert.equal(track.glbChannels.length, 0, `${label} bounded source-to-static disposition unexpectedly maps a GLB channel.`)
    assert.equal(timing.applicable, false, `${label} bounded-to-static timing must be explicitly inapplicable.`)
    assert.equal(timing.maxAbsDeltaMs, null, `${label} bounded-to-static timing must not invent a zero delta.`)
    assert.equal(timing.cumulativeDriftMs, null, `${label} bounded-to-static timing must not invent zero cumulative drift.`)
    assert.equal(glbExcursion, 0, `${label} bounded source track is not static in the published GLB.`)
    for (const sample of actualSamples) assertBoundedPropertyMatchesNodeDefault(sample, glbJson, nodeIndex, property, label)
  } else if (track.disposition === 'exact-static-channel') {
    assert.equal(mode, 'exact-motion-accounting', `${label} exact-static-channel disposition has a materiality-gated comparison.`)
    assert.equal(track.valueClass, 'constant', `${label} exact-static-channel disposition is not source-constant.`)
    assert.equal(track.glbChannels.length, 1, `${label} exact-static-channel must identify exactly one GLB channel.`)
    assert.equal(timing.applicable, true, `${label} exact-static-channel timing comparison is missing.`)
    const expectedTiming = recomputeSourceMotionTiming(track, glbJson, animation, clipRange, label, schemaVersion === 3)
    closeSourceMotionMetric(timing.maxAbsDeltaMs, expectedTiming.maxAbsDeltaMs, `${label} exact-static-channel timing maxAbsDeltaMs`)
    closeSourceMotionMetric(timing.cumulativeDriftMs, expectedTiming.cumulativeDriftMs, `${label} exact-static-channel timing cumulativeDriftMs`)
    assert.ok(Math.abs(Number(timing.maxAbsDeltaMs)) <= V12_MOTION_GATES.timingMaxMs && Math.abs(Number(timing.cumulativeDriftMs)) <= V12_MOTION_GATES.timingMaxMs, `${label} exact-static-channel timing exceeds the frozen v12 planning policy.`)
    const mapping = asRecord(track.glbChannels[0], `${label} exact-static mapped GLB channel`)
    const channel = (animation.channels as JsonRecord[] | undefined)?.[mapping.channelIndex]
    assert.ok(channel && channel.target?.node === nodeIndex && channel.target?.path === property.path, `${label} exact-static mapped GLB channel targets the wrong property.`)
    assertGltfChannelPropertyStatic(glbJson, animation, channel, `${label} exact-static mapped channel`, property.axis)
    assertMappedChannelUnboundComponentsMatchSourceRest(row, track, glbJson, animation, channel, mapping.channelIndex as number, property, `${label} exact-static mapped channel`)
    for (const sample of actualSamples) assertSourceGlbPropertySerializedEqual(sample.source, sample.glb, property, `${label} exact-static-channel`)
  } else if (track.disposition === 'bounded-source-to-glb-channel') {
    assert.equal(mode, 'policy-gated', `${label} bounded source-to-GLB-channel disposition lacks a body-height gate.`)
    assert.equal(track.glbChannels.length, 1, `${label} bounded source-to-GLB-channel must identify exactly one GLB channel.`)
    assert.equal(timing.applicable, true, `${label} bounded mapped channel timing comparison is missing.`)
    const expectedTiming = recomputeSourceMotionTiming(track, glbJson, animation, clipRange, label, true)
    closeSourceMotionMetric(timing.maxAbsDeltaMs, expectedTiming.maxAbsDeltaMs, `${label} bounded mapped channel timing maxAbsDeltaMs`)
    closeSourceMotionMetric(timing.cumulativeDriftMs, expectedTiming.cumulativeDriftMs, `${label} bounded mapped channel timing cumulativeDriftMs`)
    assert.ok(Math.abs(Number(timing.maxAbsDeltaMs)) <= V12_MOTION_GATES.timingMaxMs && Math.abs(Number(timing.cumulativeDriftMs)) <= V12_MOTION_GATES.timingMaxMs, `${label} bounded mapped channel timing exceeds the frozen v12 planning policy.`)
    const mapping = asRecord(track.glbChannels[0], `${label} bounded mapped GLB channel`)
    const channel = (animation.channels as JsonRecord[] | undefined)?.[mapping.channelIndex]
    assert.ok(channel && channel.target?.node === nodeIndex && channel.target?.path === property.path, `${label} bounded mapped GLB channel targets the wrong property.`)
    assertMappedChannelUnboundComponentsMatchSourceRest(row, track, glbJson, animation, channel, mapping.channelIndex as number, property, `${label} bounded mapped channel`)
    if (track.valueClass === 'constant') assertGltfChannelPropertyStatic(glbJson, animation, channel, `${label} bounded constant mapped channel`, property.axis)
  } else {
    assert.equal(track.disposition, 'preserved-glb', `${label} has an unsupported motion disposition.`)
    assert.equal(mode, 'exact-motion-accounting', `${label} preserved GLB disposition uses an unsupported comparison mode.`)
    assert.equal(timing.applicable, true, `${label} preserved GLB timing comparison is missing.`)
    const expectedTiming = recomputeSourceMotionTiming(track, glbJson, animation, clipRange, label, schemaVersion === 3)
    closeSourceMotionMetric(timing.maxAbsDeltaMs, expectedTiming.maxAbsDeltaMs, `${label} preserved GLB timing maxAbsDeltaMs`)
    closeSourceMotionMetric(timing.cumulativeDriftMs, expectedTiming.cumulativeDriftMs, `${label} preserved GLB timing cumulativeDriftMs`)
    assert.ok(typeof timing.maxAbsDeltaMs === 'number' && Math.abs(timing.maxAbsDeltaMs) <= V12_MOTION_GATES.timingMaxMs, `${label} preserved GLB timing exceeds the frozen v12 planning policy.`)
    assert.ok(typeof timing.cumulativeDriftMs === 'number' && Math.abs(timing.cumulativeDriftMs) <= V12_MOTION_GATES.timingMaxMs, `${label} preserved GLB cumulative drift exceeds the frozen v12 planning policy.`)
    assert.ok(sourceExcursion > 0, `${label} claims preserved motion but the exact source property is static.`)
    assert.ok(glbExcursion > 0, `${label} claims preserved motion but the published GLB property is static.`)
    if (schemaVersion === 3) for (const sample of actualSamples) assertSourceGlbPropertySerializedEqual(sample.source, sample.glb, property, `${label} preserved GLB`)
  }
  return actualSamples
}

function assertV12StructuralEquipmentMotionProof(
  studentId: number,
  sourceKey: string,
  action: { id: string; clip: string },
  actionProfile: unknown,
  renderer: JsonRecord,
  assemblyRenderer: JsonRecord,
  assembly: JsonRecord,
  profile: JsonRecord,
  glbJson: JsonRecord,
  animation: JsonRecord,
  sourceAncestorNodes: ReadonlySet<number>,
  options: CharacterContractOptions,
) {
  const proof = options.sourceMotionProof
  assert.ok(proof, `Student ${studentId} structural equipment renderer ${sourceKey} authored action ${action.clip} has no relevant animation channel with a non-zero transform delta.`)
  assert.equal(proof!.jobId, V12_TERMINAL_RESUME_JOB_ID, 'Source-motion proof is not pinned to the exact v12 terminal job.')
  assert.equal(options.renderingVersionContract?.jobId, V12_TERMINAL_RESUME_JOB_ID, 'Source-motion proof cannot be used outside the historical v12 rendering contract.')
  assert.ok(typeof options.sourceIdentity === 'string' && options.sourceIdentity, `Student ${studentId} source identity is required for source-motion proof.`)
  assert.ok(options.assetIdentity, `Student ${studentId} asset identity is required for source-motion proof.`)
  const sourceReference = renderer.sourceReference
  const key = stableJson([studentId, sourceKey, action.id, action.clip])
  const row = proof!.rowsByKey.get(key)
  assert.ok(row, `Student ${studentId} structural equipment renderer ${sourceKey} authored action ${action.id}/${action.clip} has no exact source-motion proof row.`)
  assert.ok(['static', 'outside-subtree-untargeted'].includes(row!.proofStatus), `Student ${studentId} structural equipment renderer ${sourceKey} authored action ${action.id}/${action.clip} is ${row!.proofStatus}, which cannot discharge the zero-motion assertion.`)
  assert.equal(row!.sourceIdentity, options.sourceIdentity, `Student ${studentId} source-motion proof source identity differs from its persisted binding.`)
  assert.equal(profile.sourceIdentity, options.sourceIdentity, `Student ${studentId} embedded rendering profile source identity differs from its persisted binding.`)
  assert.equal(row!.asset.assetId, options.assetIdentity!.assetId, `Student ${studentId} source-motion proof asset id differs from its persisted asset.`)
  assert.equal(row!.asset.revision, options.assetIdentity!.revision, `Student ${studentId} source-motion proof asset revision differs from its persisted asset.`)
  assert.equal(row!.asset.sha256.toLowerCase(), options.assetIdentity!.sha256.toLowerCase(), `Student ${studentId} source-motion proof asset checksum differs from its persisted asset.`)
  assert.equal(row!.renderer.sourceKey, sourceKey, `Student ${studentId} source-motion proof renderer key differs from the structural equipment renderer.`)
  assert.equal(sourceReferenceKey(row!.renderer.sourceReference, `Student ${studentId} source-motion proof renderer sourceReference`), sourceReferenceKey(sourceReference, `Student ${studentId} structural equipment sourceReference`), `Student ${studentId} source-motion proof renderer identity differs from the embedded profile.`)
  assert.deepEqual(row!.action, action, `Student ${studentId} source-motion proof action differs from its persisted action profile.`)
  assert.equal(row!.profileSha256, createHash('sha256').update(canonicalSourceMotionJson(actionProfile), 'utf8').digest('hex'), `Student ${studentId} source-motion proof action-profile digest differs from the persisted binding.`)
  const sourcePrefab = asRecord(profile.sourcePrefab, `Student ${studentId} embedded sourcePrefab`)
  const selectedPrefab = asRecord(row!.selectedPrefab, `Student ${studentId} source-motion proof selectedPrefab`)
  assert.equal(selectedPrefab.path, sourcePrefab.path, `Student ${studentId} source-motion proof selected prefab path differs from the embedded rendering profile.`)
  const selectedPrefabKey = sourceReferenceKey(selectedPrefab.sourceReference, `Student ${studentId} source-motion proof prefab sourceReference`)
  assert.equal(selectedPrefabKey, sourceReferenceKey(sourcePrefab.reference, `Student ${studentId} embedded sourcePrefab reference`), `Student ${studentId} source-motion proof prefab identity differs from the embedded rendering profile.`)
  assert.equal(selectedPrefabKey, sourceReferenceKey(assembly.prefabReference, `Student ${studentId} assembly prefabReference`), `Student ${studentId} source-motion proof prefab identity differs from the selected assembly.`)

  const proofTracks = row!.tracks as JsonRecord[]
  const boundedTracks = proofTracks.filter(track => track.disposition === 'bounded-source-to-static'
    || (proof!.schemaVersion === 3 && track.disposition === 'bounded-source-to-glb-channel'))
  for (const track of boundedTracks) {
    const comparison = asRecord(track.comparison, `Student ${studentId} bounded source-motion comparison`)
    assert.equal(comparison.mode, 'policy-gated', `Student ${studentId} bounded source approximation has no policy-gated comparison.`)
    assertMotionBodySelectorMatchesProfile(comparison.modelHeightEvidence, comparison.modelHeightUnits, profile, sourceKey,
      `Student ${studentId} bounded source-motion track ${track.curveIndex}`, studentId, glbJson, options)
  }
  const recomputedSamplesByTrack = recomputeSourceSamples(row!, `Student ${studentId} source-motion proof`)

  const nodes = Array.isArray(glbJson.nodes) ? glbJson.nodes as JsonRecord[] : []
  const rendererNodeIndex = renderer.glbNodeIndex as number
  const rendererNode = nodes[rendererNodeIndex]
  const skin = Array.isArray(glbJson.skins) && Number.isInteger(rendererNode?.skin) ? glbJson.skins[rendererNode.skin] as JsonRecord : null
  assert.ok(skin && Array.isArray(skin.joints), `Student ${studentId} source-motion proof renderer has no exact GLB skin scope.`)
  const rootName = assembly.root
  assert.ok(typeof rootName === 'string' && rootName, `Student ${studentId} source-motion proof has no selected prefab root name.`)
  const rootMatches = nodes.flatMap((node, index) => node.name === rootName ? [index] : [])
  assert.equal(rootMatches.length, 1, `Student ${studentId} static-motion proof prefab root is not uniquely mapped in the GLB.`)
  const rootIndex = rootMatches[0]
  const transformChain = profilePointerArray(assemblyRenderer.transformChain, `Student ${studentId} source-motion renderer transformChain`)
  const rootBoneAncestry = profilePointerArray(assemblyRenderer.rootBoneAncestry, `Student ${studentId} source-motion renderer rootBoneAncestry`)
  const rootBone = asRecord(assemblyRenderer.rootBone, `Student ${studentId} source-motion renderer rootBone`)
  const boneReferences = profilePointerArray(assemblyRenderer.boneReferences, `Student ${studentId} source-motion renderer boneReferences`)
  const rootTransformReference = sourceReferenceKey(selectedPrefab.rootTransformReference, `Student ${studentId} source-motion prefab rootTransformReference`)
  const rendererSourceFile = normalizedSourceFile(renderer.sourceReference, `Student ${studentId} source-motion renderer sourceReference`)
  assert.ok(transformChain.length > 0 && rootBoneAncestry.length > 0, `Student ${studentId} source-motion profile paths are incomplete.`)
  assert.equal(sourceReferenceKey(asRecord(transformChain[0], 'Source-motion first transform').sourceReference, 'Source-motion first transform sourceReference'), rootTransformReference, `Student ${studentId} source-motion transform chain does not begin at the selected prefab root.`)
  assert.equal(sourceReferenceKey(asRecord(rootBoneAncestry[0], 'Source-motion first rootBone ancestry').sourceReference, 'Source-motion first rootBone ancestry sourceReference'), rootTransformReference, `Student ${studentId} source-motion rootBone ancestry does not begin at the selected prefab root.`)
  assert.equal(asRecord(transformChain[0], 'Source-motion root transform').name, rootName, `Student ${studentId} source-motion root transform name differs from the selected prefab.`)

  const scopeByReference = new Map<string, JsonRecord>()
  for (const scopeValue of row!.scopeTransforms as unknown[]) {
    const scope = asRecord(scopeValue, `Student ${studentId} source-motion scope transform`)
    const scopeKey = sourceReferenceKey(scope.sourceReference, `Student ${studentId} source-motion scope sourceReference`)
    assert.ok(!scopeByReference.has(scopeKey), `Student ${studentId} source-motion proof repeats scope transform ${scopeKey}.`)
    scopeByReference.set(scopeKey, scope)
  }
  const animator = asRecord(row!.animator, `Student ${studentId} source-motion animator`)
  sourceReferenceKey(animator.componentReference, `Student ${studentId} source-motion Animator componentReference`)
  const animatorRootKey = sourceReferenceKey(animator.rootReference, `Student ${studentId} source-motion animator rootReference`)
  assert.equal(sourceReferenceKey((animator.path as JsonRecord[]).at(-1)?.sourceReference, `Student ${studentId} source-motion Animator path leaf`), animatorRootKey)
  const pointerKey = (pointer: unknown, label: string) => sourceReferenceKey(asRecord(pointer, label).sourceReference, `${label} sourceReference`)
  const expectedRoles = new Map<string, Set<string>>()
  const requiredPathByReference = new Map<string, readonly unknown[]>()
  const addRequired = (pointer: unknown, role: string, pathToPointer?: readonly unknown[]) => {
    const pointerValue = asRecord(pointer, `Student ${studentId} expected source-motion ${role}`)
    const pointerIdentity = pointerKey(pointerValue, `Student ${studentId} expected source-motion ${role}`)
    const roles = expectedRoles.get(pointerIdentity) ?? new Set<string>()
    roles.add(role)
    expectedRoles.set(pointerIdentity, roles)
    if (pathToPointer) requiredPathByReference.set(pointerIdentity, pathToPointer)
  }
  for (const [index, pointer] of transformChain.entries()) addRequired(pointer, index === transformChain.length - 1 ? 'renderer' : 'ancestor', transformChain.slice(0, index + 1))
  for (const [index, pointer] of rootBoneAncestry.entries()) addRequired(pointer, 'rootBoneAncestry', rootBoneAncestry.slice(0, index + 1))
  for (const pointer of boneReferences) addRequired(pointer, 'skinJoint')
  const rootBonePath = [...rootBoneAncestry, rootBone]
  addRequired(rootBone, 'rootBone', rootBonePath)
  for (const [identity, roles] of expectedRoles) {
    const scope = scopeByReference.get(identity)
    assert.ok(scope, `Student ${studentId} source-motion proof omitted profile-known scope transform ${identity}.`)
    for (const role of roles) assert.ok((scope!.roles as string[]).includes(role), `Student ${studentId} source-motion scope transform ${identity} omitted role ${role}.`)
    const expectedPath = requiredPathByReference.get(identity)
    if (expectedPath) {
      assert.deepEqual((scope!.path as JsonRecord[]).map(token => ({ name: token.name, source: sourceReferenceKey(token.sourceReference, 'Source-motion path token sourceReference') })),
        expectedPath.map(pointer => {
          const expectedPointer = asRecord(pointer, 'Student source profile path pointer')
          return { name: expectedPointer.name, source: pointerKey(expectedPointer, 'Student source profile path pointer') }
        }),
        `Student ${studentId} source-motion scope transform ${identity} path differs from the exact persisted source profile chain.`)
    }
  }

  const parents = nodes.map(() => [] as number[])
  for (const [parentIndex, node] of nodes.entries()) {
    for (const child of (Array.isArray(node.children) ? node.children : [])) {
      assert.ok(Number.isInteger(child) && child >= 0 && child < nodes.length, `Student ${studentId} GLB hierarchy contains an invalid child node.`)
      parents[child].push(parentIndex)
    }
  }
  const nodePathFromRoot = (target: number) => {
    const reversed: number[] = []
    const seen = new Set<number>()
    let current = target
    while (!seen.has(current)) {
      seen.add(current)
      reversed.push(current)
      if (current === rootIndex) return reversed.reverse()
      assert.equal(parents[current].length, 1, `Student ${studentId} source-motion scope node ${current} has an ambiguous GLB parent.`)
      current = parents[current][0]
    }
    assert.fail(`Student ${studentId} source-motion scope contains a GLB hierarchy cycle.`)
  }
  const mapSourcePathToNode = (pathValue: unknown, label: string) => {
    assert.ok(Array.isArray(pathValue) && pathValue.length > 0, `${label} is empty.`)
    const pathEntries = pathValue as JsonRecord[]
    const pathKeys: string[] = []
    for (const [pathIndex, tokenValue] of pathEntries.entries()) {
      const token = asRecord(tokenValue, `${label}[${pathIndex}]`)
      assert.ok(typeof token.name === 'string' && token.name, `${label}[${pathIndex}] has no Transform name.`)
      const tokenKey = sourceReferenceKey(token.sourceReference, `${label}[${pathIndex}] sourceReference`)
      assert.deepEqual(normalizedSourceFile(token.sourceReference, `${label}[${pathIndex}] sourceReference`), rendererSourceFile, `${label}[${pathIndex}] crosses the selected prefab serialized file.`)
      pathKeys.push(tokenKey)
    }
    assert.equal(new Set(pathKeys).size, pathKeys.length, `${label} contains a source Transform cycle or duplicate.`)
    assert.equal(pathKeys[0], rootTransformReference, `${label} does not begin at the exact selected prefab root Transform.`)
    let current = rootIndex
    assert.equal(nodes[current]?.name, pathEntries[0].name, `${label} root name differs from the GLB prefab root.`)
    for (let pathIndex = 1; pathIndex < pathEntries.length; pathIndex += 1) {
      const candidates = ((nodes[current].children as number[] | undefined) ?? []).filter(child => nodes[child]?.name === pathEntries[pathIndex].name)
      assert.equal(candidates.length, 1, `${label} is not unique below ${nodes[current]?.name}.`)
      const next = candidates[0]
      assert.deepEqual(parents[next], [current], `${label} does not follow the actual GLB parent chain.`)
      current = next
    }
    return current
  }
  const sourceNodeByReference = new Map<string, number>()
  const referenceBySourceNode = new Map<number, string>()
  const recordSourceNode = (reference: unknown, nodeIndex: number, label: string) => {
    const identity = sourceReferenceKey(reference, `${label} sourceReference`)
    const priorNode = sourceNodeByReference.get(identity)
    assert.ok(priorNode === undefined || priorNode === nodeIndex, `${label} source reference maps to multiple GLB nodes.`)
    const priorIdentity = referenceBySourceNode.get(nodeIndex)
    assert.ok(priorIdentity === undefined || priorIdentity === identity, `${label} GLB node maps from multiple exact source references.`)
    sourceNodeByReference.set(identity, nodeIndex)
    referenceBySourceNode.set(nodeIndex, identity)
  }
  const animatorNodeIndex = mapSourcePathToNode(animator.path, `Student ${studentId} exact source Animator path`)
  assert.equal(sourceReferenceKey((animator.path as JsonRecord[]).at(-1)?.sourceReference, `Student ${studentId} source Animator path leaf`), animatorRootKey)
  assert.equal(nodes[animatorNodeIndex]?.name, (animator.path as JsonRecord[]).at(-1)?.name, `Student ${studentId} Animator root does not map to the exact GLB path leaf.`)
  recordSourceNode((animator.path as JsonRecord[]).at(-1)?.sourceReference, animatorNodeIndex, `Student ${studentId} Animator root`)
  const expectedScopeNodes = new Set<number>()
  for (const target of [rendererNodeIndex, ...(skin!.joints as number[]), ...sourceAncestorNodes]) {
    for (const nodeIndex of nodePathFromRoot(target)) expectedScopeNodes.add(nodeIndex)
  }
  const mappedScopeNodes = new Set<number>()
  const mappedScopeNodeByReference = new Map<string, number>()
  for (const [scopeKey, scope] of scopeByReference) {
    const pathEntries = scope.path as JsonRecord[]
    const current = mapSourcePathToNode(pathEntries, `Student ${studentId} exact source-motion scope path ${scopeKey}`)
    assert.equal(nodes[current].name, scope.name, `Student ${studentId} source-motion scope ${scopeKey} maps to a different GLB node name.`)
    assert.ok(expectedScopeNodes.has(current), `Student ${studentId} source-motion scope ${scopeKey} maps outside the exact renderer/skin/rootBone ancestry.`)
    assert.equal(scope.glbNodeIndex, current, `Student ${studentId} source-motion scope ${scopeKey} GLB node index differs from its exact path.`)
    recordSourceNode(scope.sourceReference, current, `Student ${studentId} source-motion scope ${scopeKey}`)
    mappedScopeNodes.add(current)
    mappedScopeNodeByReference.set(scopeKey, current)
  }
  assert.equal(mappedScopeNodes.size, scopeByReference.size, `Student ${studentId} source-motion proof maps multiple source transforms to one GLB node.`)
  assert.deepEqual([...mappedScopeNodes].sort((left, right) => left - right), [...expectedScopeNodes].sort((left, right) => left - right), `Student ${studentId} source-motion scope omits or invents an exact renderer/skin/ancestor node.`)
  assert.equal(sourceReferenceKey(row!.selectedPrefab.rootTransformReference, `Student ${studentId} proof root transform`), rootTransformReference)

  const clipAnimations = (Array.isArray(glbJson.animations) ? glbJson.animations : []) as JsonRecord[]
  assert.equal(clipAnimations.filter(candidate => candidate.name === action.clip).length, 1, `Student ${studentId} source-motion action ${action.clip} is not uniquely embedded.`)
  assert.equal(animation.name, action.clip)
  const requiredSourceKeys = new Set(expectedRoles.keys())
  const relevantTracks = (row!.tracks as JsonRecord[]).filter(track => track.sourceTransformReference !== null
    && requiredSourceKeys.has(sourceReferenceKey(track.sourceTransformReference, `Student ${studentId} source-motion relevant track sourceReference`)))
  assert.equal(row!.curveSet.relevantTrackCount, relevantTracks.length, `Student ${studentId} source-motion relevant track count differs from exact required source transforms.`)
  if (row!.proofStatus === 'static') assert.ok(relevantTracks.every(track => track.valueClass === 'constant'
    || track.disposition === 'bounded-source-to-static'
    || (proof!.schemaVersion === 3 && track.disposition === 'bounded-source-to-glb-channel')), `Student ${studentId} static proof contains relevant authored motion not bounded to static.`)
  if (row!.proofStatus === 'outside-subtree-untargeted') {
    assert.equal(relevantTracks.length, 0, `Student ${studentId} untargeted proof has a source track on required renderer/skin scope.`)
    const requiredScopes = [...scopeByReference.values()].filter(scope => (scope.roles as string[]).some(role => ['renderer', 'rootBone', 'rootBoneAncestry', 'skinJoint'].includes(role)))
    assert.ok(requiredScopes.length > 0 && requiredScopes.every(scope => ['ancestor-of-animator-root', 'disjoint'].includes(scope.animatorRelation)), `Student ${studentId} untargeted proof includes a required source scope inside/unresolved from the selected Animator.`)
  }
  const boundedMappedChannelIndices = new Set<number>()

  for (const [trackIndex, trackValue] of (row!.tracks as unknown[]).entries()) {
    const track = asRecord(trackValue, `Student ${studentId} source-motion track ${trackIndex}`)
    assert.notEqual(track.disposition, 'unresolved', `Student ${studentId} source-motion track ${trackIndex} is unresolved.`)
    const trackLabel = `Student ${studentId} source-motion track ${trackIndex}`
    const target = asRecord(track.sourceTarget, `${trackLabel} sourceTarget`)
    const mappedSourceNode = mapSourcePathToNode(target.path, `${trackLabel} exact source Transform path`)
    assert.equal(mappedSourceNode, target.glbNodeIndex, `${trackLabel} source Transform path does not uniquely map to its claimed GLB node.`)
    assert.equal(sourceReferenceKey(target.reference, `${trackLabel} target reference`), sourceReferenceKey(track.sourceTransformReference, `${trackLabel} source Transform reference`))
    recordSourceNode(track.sourceTransformReference, mappedSourceNode, trackLabel)
    assert.equal(target.animatorRelation, 'inside-animator-subtree', `${trackLabel} is not uniquely addressable under the selected Animator root.`)
    const expectedTrackPath = (target.path as JsonRecord[]).slice((animator.path as JsonRecord[]).length).map(token => token.name)
    assert.deepEqual(track.pathTokens, expectedTrackPath, `${trackLabel} binding path tokens differ from the exact Animator-relative source path.`)
    const property = sourceTrackProperty(track, trackLabel)
    const actualSamples = assertSourceMotionComparison(row!, track, animation, glbJson, row!.sourceClipRange, proof!.schemaVersion, trackLabel, recomputedSamplesByTrack.get(String(track.curveIndex)) ?? [])
    if (track.valueClass === 'constant') assert.equal(sampledPropertyExcursion(actualSamples, 'source', property, trackLabel), 0, `${trackLabel} source constant curve changes its bound property.`)
    if (track.disposition === 'exact-static') {
      assert.equal(track.valueClass, 'constant', `${trackLabel} exact-static track is not constant.`)
      assert.equal(track.glbChannels.length, 0, `${trackLabel} exact-static track maps an unexpected GLB channel.`)
    }
    if (track.disposition === 'bounded-source-to-static') {
      assert.ok(track.glbChannels.length === 0 || track.glbChannels.every((channelValue: unknown) => {
        const mapped = asRecord(channelValue, `${trackLabel} mapped static GLB channel`)
        const channel = (animation.channels as JsonRecord[])[mapped.channelIndex]
        return Boolean(channel && !animationChannelHasMovement(glbJson, animation, channel, (animation.samplers as JsonRecord[])[mapped.samplerIndex]))
      }), `${trackLabel} bounded source curve has a moving mapped GLB channel.`)
    }
    for (const [channelIndex, mappedValue] of (track.glbChannels as unknown[]).entries()) {
      const mapped = asRecord(mappedValue, `Student ${studentId} source-motion mapped GLB channel ${channelIndex}`)
      assert.equal(mapped.animationName, action.clip, `Student ${studentId} source-motion mapped channel names a different animation.`)
      assert.ok(Number.isInteger(mapped.channelIndex) && Number.isInteger(mapped.samplerIndex) && Number.isInteger(mapped.targetNodeIndex), `Student ${studentId} source-motion mapped GLB channel indices are invalid.`)
      const channel = (animation.channels as JsonRecord[] | undefined)?.[mapped.channelIndex]
      assert.ok(channel && channel.sampler === mapped.samplerIndex, `Student ${studentId} source-motion mapped GLB sampler differs from the embedded channel.`)
      assert.equal(channel.target?.node, mapped.targetNodeIndex, `Student ${studentId} source-motion mapped GLB target node differs from the embedded channel.`)
      assert.equal(channel.target?.path, mapped.targetPath, `Student ${studentId} source-motion mapped GLB target path differs from the embedded channel.`)
      assert.ok(['translation', 'rotation', 'scale'].includes(mapped.targetPath), `Student ${studentId} source-motion mapped GLB channel is not a Transform animation.`)
      assert.equal(mapped.targetNodeIndex, mappedSourceNode, `${trackLabel} mapped GLB channel does not target its exact source Transform node.`)
      assert.equal(mapped.targetPath, property.path, `${trackLabel} mapped GLB channel path differs from its source Transform property.`)
      if (track.disposition === 'bounded-source-to-static') assertGltfChannelPropertyStatic(glbJson, animation, channel, `${trackLabel} bounded GLB channel ${channelIndex}`, property.axis)
      if (track.disposition === 'bounded-source-to-glb-channel') boundedMappedChannelIndices.add(mapped.channelIndex)
    }
    if (track.disposition === 'preserved-glb') assert.ok(track.glbChannels.length > 0, `${trackLabel} claims preserved source motion without a mapped GLB channel.`)
  }
  for (const scopeNode of expectedScopeNodes) assertGltfNodeStatic(glbJson, animation, scopeNode, `Student ${studentId} required renderer/skin scope node ${scopeNode}`, boundedMappedChannelIndices)
  proof!.consumedRows.add(key)
  proof!.consumedProofs.set(key, { key, proofStatus: row!.proofStatus, trackDispositions: dispositionCounts(row!) })
}

function assertStructuralEquipmentMovement(studentId: number, sourceKey: string, renderer: JsonRecord, record: JsonRecord, assemblyRenderer: JsonRecord, assembly: JsonRecord, glbJson: JsonRecord, actionProfile: unknown, options: CharacterContractOptions) {
  const nodeIndex = renderer.glbNodeIndex
  assert.ok(Number.isInteger(nodeIndex), `Student ${studentId} structural equipment renderer ${sourceKey} has no GLB node binding.`)
  const nodes = Array.isArray(glbJson.nodes) ? glbJson.nodes : []
  const node = nodes[nodeIndex as number]
  assert.ok(node && typeof node === 'object' && !Array.isArray(node), `Student ${studentId} structural equipment renderer ${sourceKey} has no embedded GLB node.`)
  assert.ok(Number.isInteger(node.mesh), `Student ${studentId} structural equipment renderer ${sourceKey} has no GLB mesh binding.`)
  const nodeProvenance = node.extras?.chibi?.sourceRenderer
  assert.equal(sourceReferenceKey(nodeProvenance?.sourceReference, `Student ${studentId} structural equipment renderer ${sourceKey} GLB source renderer`), sourceKey, `Student ${studentId} structural equipment renderer ${sourceKey} lost its exact GLB source renderer identity.`)
  const rendererMeshKey = sourceReferenceKey(renderer.sourceMesh?.sourceReference, `Student ${studentId} structural equipment renderer ${sourceKey} source mesh`)
  assert.equal(sourceReferenceKey(nodeProvenance?.sourceMeshReference, `Student ${studentId} structural equipment renderer ${sourceKey} GLB source mesh`), rendererMeshKey, `Student ${studentId} structural equipment renderer ${sourceKey} lost its exact GLB source mesh identity.`)
  const mesh = Array.isArray(glbJson.meshes) ? glbJson.meshes[node.mesh] : null
  assert.ok(mesh && Array.isArray(mesh.primitives) && mesh.primitives.length > 0, `Student ${studentId} structural equipment renderer ${sourceKey} has no GLB mesh primitives.`)
  const slots = renderer.materialSlots
  assert.ok(Array.isArray(slots) && slots.length > 0, `Student ${studentId} structural equipment renderer ${sourceKey} has no source material slots.`)
  const claimedPrimitives = new Map<number, { materialKey: string; materialIndex: number; slotIndex: number }>()
  for (const [slotIndex, slotValue] of (slots as unknown[]).entries()) {
    const slot = asRecord(slotValue, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex}`)
    const materialKey = sourceReferenceKey(slot.sourceMaterialReference, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} source material`)
    const binding = asRecord(slot.glb, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} GLB binding`)
    assert.equal(binding.nodeIndex, nodeIndex, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has a mismatched GLB node binding.`)
    assert.equal(binding.meshIndex, node.mesh, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has a mismatched GLB mesh binding.`)
    assert.ok(Array.isArray(binding.primitiveIndices) && binding.primitiveIndices.length > 0, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has no GLB primitive binding.`)
    assert.ok(Array.isArray(binding.materialIndices) && binding.materialIndices.length === binding.primitiveIndices.length, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has incomplete GLB material indices.`)
    assert.equal(binding.materialIndex, binding.materialIndices[0], `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has an inconsistent GLB material index.`)
    const slotPrimitiveIndices = new Set<number>()
    for (const [offset, primitiveIndex] of (binding.primitiveIndices as unknown[]).entries()) {
      assert.ok(typeof primitiveIndex === 'number' && Number.isInteger(primitiveIndex) && primitiveIndex >= 0, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has an invalid GLB primitive index.`)
      const primitive = mesh.primitives[primitiveIndex]
      const materialIndex: unknown = binding.materialIndices[offset]
      assert.ok(primitive && Number.isInteger(materialIndex), `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has an invalid GLB material binding.`)
      assert.equal(primitive.material, materialIndex, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} GLB primitive material differs from its exact binding.`)
      assert.ok(!slotPrimitiveIndices.has(primitiveIndex as number), `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} claims a GLB primitive more than once.`)
      slotPrimitiveIndices.add(primitiveIndex as number)
      const priorClaim = claimedPrimitives.get(primitiveIndex as number)
      assert.ok(!priorClaim || (priorClaim.slotIndex !== slotIndex
        && priorClaim.materialKey === materialKey
        && priorClaim.materialIndex === materialIndex), `Student ${studentId} structural equipment renderer ${sourceKey} maps one GLB primitive to conflicting source material slots.`)
      if (!priorClaim) claimedPrimitives.set(primitiveIndex as number, { materialKey, materialIndex: materialIndex as number, slotIndex })
      const material = Array.isArray(glbJson.materials) ? glbJson.materials[materialIndex as number] : null
      assert.ok(material && typeof material === 'object' && !Array.isArray(material), `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} has no GLB material.`)
      assert.equal(material.name, slot.sourceMaterialName, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} GLB material name differs from its exact source material.`)
      assert.equal(sourceReferenceKey(material.extras?.chibi?.sourceMaterialReference, `Student ${studentId} structural equipment renderer ${sourceKey} GLB material ${materialIndex} source material`), materialKey, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} lost its exact GLB source material identity.`)
      if (slot.sourceShaderReference !== null && slot.sourceShaderReference !== undefined) {
        assert.equal(sourceReferenceKey(material.extras?.chibi?.sourceShaderReference, `Student ${studentId} structural equipment renderer ${sourceKey} GLB material ${materialIndex} source shader`), sourceReferenceKey(slot.sourceShaderReference, `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} source shader`), `Student ${studentId} structural equipment renderer ${sourceKey} material slot ${slotIndex} lost its exact GLB source shader identity.`)
      }
    }
  }
  assert.equal(claimedPrimitives.size, mesh.primitives.length, `Student ${studentId} structural equipment renderer ${sourceKey} has omitted or unbound GLB material primitives.`)
  assert.ok(Number.isInteger(node.skin), `Student ${studentId} structural equipment renderer ${sourceKey} has no GLB skin binding.`)
  const skins = Array.isArray(glbJson.skins) ? glbJson.skins : []
  const skin = skins[node.skin]
  assert.ok(skin && Array.isArray(skin.joints) && skin.joints.length > 0 && skin.joints.every((joint: unknown) => Number.isInteger(joint)), `Student ${studentId} structural equipment renderer ${sourceKey} has an empty GLB skin.`)
  assert.ok(skin.joints.every((joint: number) => nodes[joint] && typeof nodes[joint] === 'object' && !Array.isArray(nodes[joint])), `Student ${studentId} structural equipment renderer ${sourceKey} has a GLB skin joint that is not bound to a node.`)
  const skeletonNodes = skin.skeleton === undefined || skin.skeleton === null ? [] : [skin.skeleton]
  if (skeletonNodes.length) {
    assert.ok(Number.isInteger(skeletonNodes[0]) && nodes[skeletonNodes[0]] && typeof nodes[skeletonNodes[0]] === 'object' && !Array.isArray(nodes[skeletonNodes[0]]), `Student ${studentId} structural equipment renderer ${sourceKey} has an invalid GLB skin skeleton binding.`)
  }
  const relevantNodes = new Set<number>([nodeIndex as number, ...skin.joints])
  const sourceAncestorNodes = sourceValidatedAncestorNodes(
    studentId, sourceKey, renderer, record, assemblyRenderer, assembly, nodes, nodeIndex as number,
    skin.joints as number[],
  )
  const animations = Array.isArray(glbJson.animations) ? glbJson.animations as JsonRecord[] : []
  const authoredActions = authoredActionEntries(actionProfile, animations)
  assert.ok(authoredActions.length > 0, `Student ${studentId} structural equipment renderer ${sourceKey} has no authored actions to prove movement.`)
  for (const action of authoredActions) {
    const { id, clip } = action
    const matchingAnimations = animations.filter(item => item && item.name === clip)
    assert.equal(matchingAnimations.length, 1, `Student ${studentId} structural equipment renderer ${sourceKey} does not have exactly one embedded authored action ${clip}.`)
    const animation = matchingAnimations[0]
    const channels = Array.isArray(animation!.channels) ? animation!.channels as JsonRecord[] : []
    const samplers = Array.isArray(animation!.samplers) ? animation!.samplers as JsonRecord[] : []
    const channelHasMovementOn = (relevantNodeSet: ReadonlySet<number>) => channels.some(channel => {
      const target = channel.target
      if (!target || typeof target !== 'object' || Array.isArray(target) || !Number.isInteger(target.node)
        || !['translation', 'rotation', 'scale'].includes(target.path)) return false
      if (!relevantNodeSet.has(target.node)) return false
      const samplerIndex = channel.sampler
      const sampler = Number.isInteger(samplerIndex) ? samplers[samplerIndex] : undefined
      return animationChannelHasMovement(glbJson, animation!, channel, sampler)
    })
    let movingChannel = channelHasMovementOn(relevantNodes)
    if (!movingChannel) movingChannel = channelHasMovementOn(sourceAncestorNodes)
    if (!movingChannel) {
      assertV12StructuralEquipmentMotionProof(studentId, sourceKey, { id, clip }, actionProfile, renderer, assemblyRenderer, assembly, embeddedRenderingProfile(studentId, glbJson), glbJson, animation!, sourceAncestorNodes, options)
    }
  }
}

/**
 * Validate the source-evidenced presentation-policy contract retained in an
 * exported GLB.  This deliberately duplicates the small public validation
 * contract instead of trusting only `valid: true`: acceptance must prove the
 * current policy, deterministic exclusion records, and complete core/profile
 * coverage for every successful roster item.
 */
export function assertEmbeddedCharacterContract(studentId: number, assetValidation: unknown, glbJson: unknown, options: CharacterContractOptions = {}) {
  const validation = asRecord(assetValidation, `Student ${studentId} asset validation`)
  assert.equal(validation.valid, true, `Student ${studentId} asset validation is not valid.`)
  if (Array.isArray(validation.unresolved)) assert.deepEqual(validation.unresolved, [], `Student ${studentId} asset validation has unresolved blockers.`)
  const profile = embeddedRenderingProfile(studentId, glbJson)
  const validationRendering = asRecord(validation.renderingProfile, `Student ${studentId} policy diagnostics`)
  const profileValidation = asRecord(profile.validation, `Student ${studentId} rendering profile validation`)
  const versionContract = options.renderingVersionContract ?? CURRENT_RENDERING_VERSION_CONTRACT
  assert.equal(profile.schemaVersion, 2, `Student ${studentId} rendering profile has an unsupported schema version.`)
  assert.equal(profile.profileVersion, versionContract.profileVersion, `Student ${studentId} rendering profile uses a stale profileVersion.`)
  assert.equal(profile.policyVersion, versionContract.policyVersion, `Student ${studentId} rendering profile uses a stale policyVersion.`)
  assert.equal(validationRendering.policyVersion, versionContract.policyVersion, `Student ${studentId} asset diagnostics use a stale policyVersion.`)
  if (Array.isArray(validationRendering.unresolved)) {
    assert.deepEqual(validationRendering.unresolved, [], `Student ${studentId} asset policy diagnostics have unresolved blockers.`)
  }
  assert.equal(profileValidation.valid, true, `Student ${studentId} rendering profile is not valid.`)
  assert.ok(Array.isArray(profileValidation.unresolved), `Student ${studentId} rendering profile is missing unresolved diagnostics.`)
  assert.deepEqual(profileValidation.unresolved, [], `Student ${studentId} rendering profile has unresolved/core blockers.`)

  const excludedRenderers = profile.excludedRenderers
  const excludedEvents = profile.excludedChildRendererEvents
  const validationExcludedRenderers = validationRendering.excludedRenderers
  const validationExcludedEvents = validationRendering.excludedChildRendererEvents
  assert.ok(Array.isArray(excludedRenderers), `Student ${studentId} rendering profile is missing excluded renderer diagnostics.`)
  assert.ok(Array.isArray(excludedEvents), `Student ${studentId} rendering profile is missing excluded child-event diagnostics.`)
  assert.ok(Array.isArray(validationExcludedRenderers), `Student ${studentId} asset diagnostics are missing excluded renderer records.`)
  assert.ok(Array.isArray(validationExcludedEvents), `Student ${studentId} asset diagnostics are missing excluded child-event records.`)
  assert.equal(stableJson(validationExcludedRenderers), stableJson(excludedRenderers), `Student ${studentId} asset and embedded exclusion records differ.`)
  assert.equal(stableJson(validationExcludedEvents), stableJson(excludedEvents), `Student ${studentId} asset and embedded excluded-event records differ.`)
  assert.equal(stableJson(profileValidation.excludedRenderers), stableJson(excludedRenderers), `Student ${studentId} profile validation exclusions differ from profile exclusions.`)
  assert.equal(stableJson(profileValidation.excludedChildRendererEvents), stableJson(excludedEvents), `Student ${studentId} profile validation events differ from profile exclusions.`)
  assert.equal(stableJson(excludedRenderers), stableJson(sortedExcludedRenderers(excludedRenderers as JsonRecord[])), `Student ${studentId} excluded renderers are not deterministic.`)
  assert.equal(stableJson(excludedEvents), stableJson(sortedExcludedEvents(excludedEvents as JsonRecord[])), `Student ${studentId} excluded child events are not deterministic.`)

  const excludedKeys = new Set<string>()
  for (const [index, excluded] of (excludedRenderers as JsonRecord[]).entries()) {
    const key = sourceReferenceKey(excluded.sourceReference, `Student ${studentId} excluded renderer ${index}`)
    assert.ok(!excludedKeys.has(key), `Student ${studentId} has duplicate excluded renderer identity ${key}.`)
    excludedKeys.add(key)
    assert.ok(typeof excluded.name === 'string' && excluded.name, `Student ${studentId} excluded renderer ${index} has no source name.`)
    assert.ok(excluded.hierarchyPath === null || typeof excluded.hierarchyPath === 'string', `Student ${studentId} excluded renderer ${index} has an invalid hierarchy path.`)
    assert.ok(EXCLUSION_REASON_CODES.has(excluded.reasonCode), `Student ${studentId} has an unsupported exclusion reason ${String(excluded.reasonCode)}.`)
    assert.ok(Array.isArray(excluded.evidence) && excluded.evidence.length > 0 && excluded.evidence.every((item: unknown) => typeof item === 'string' && item.length > 0), `Student ${studentId} excluded renderer ${index} is missing source evidence.`)
    assert.ok(Array.isArray(excluded.materials), `Student ${studentId} excluded renderer ${index} is missing material evidence.`)
  }
  for (const [index, event] of (excludedEvents as JsonRecord[]).entries()) {
    const key = sourceReferenceKey(event.sourceRendererReference, `Student ${studentId} excluded child event ${index}`)
    assert.ok(excludedKeys.has(key), `Student ${studentId} excluded child event targets a renderer outside the exclusion set.`)
    assert.equal(event.reasonCode, 'PRESENTATION_CHILD_RENDERER_EVENT', `Student ${studentId} excluded child event ${index} has an invalid reason.`)
    assert.ok(typeof event.clip === 'string' && event.clip, `Student ${studentId} excluded child event ${index} has no clip.`)
    assert.ok(event.action === 'enable' || event.action === 'disable', `Student ${studentId} excluded child event ${index} has an invalid action.`)
    assert.ok(Array.isArray(event.evidence) && event.evidence.length > 0, `Student ${studentId} excluded child event ${index} is missing source evidence.`)
  }

  const renderers = profile.renderers
  const assembly = asRecord(profile.assembly, `Student ${studentId} rendering profile assembly`)
  const assemblyRenderers = assembly.renderers
  assert.ok(Array.isArray(renderers) && renderers.length > 0, `Student ${studentId} rendering profile has no core renderers.`)
  assert.ok(Array.isArray(assemblyRenderers), `Student ${studentId} rendering profile has no source assembly renderer records.`)
  const coreKeys = new Set<string>()
  for (const [index, renderer] of (renderers as JsonRecord[]).entries()) {
    const key = sourceReferenceKey(renderer.sourceReference, `Student ${studentId} core renderer ${index}`)
    assert.ok(!excludedKeys.has(key), `Student ${studentId} core renderer ${key} is also excluded.`)
    assert.ok(!coreKeys.has(key), `Student ${studentId} has duplicate core renderer identity ${key}.`)
    coreKeys.add(key)
    assert.ok(typeof renderer.hierarchyPath === 'string' && renderer.hierarchyPath, `Student ${studentId} core renderer ${index} has no hierarchy path.`)
    assert.ok(Number.isInteger(renderer.glbNodeIndex), `Student ${studentId} core renderer ${renderer.hierarchyPath} has no embedded GLB node binding.`)
  }
  const assemblyKeys = new Set<string>()
  for (const [index, renderer] of (assemblyRenderers as JsonRecord[]).entries()) {
    const key = sourceReferenceKey(renderer.sourceReference, `Student ${studentId} assembly renderer ${index}`)
    assert.ok(!assemblyKeys.has(key), `Student ${studentId} source assembly has duplicate renderer identity ${key}.`)
    assemblyKeys.add(key)
  }
  assert.equal(stableJson([...assemblyKeys].sort()), stableJson([...new Set([...coreKeys, ...excludedKeys])].sort()), `Student ${studentId} core/excluded profile coverage omits or invents a source renderer.`)

  const attachments = asRecord(assembly.attachments ?? {}, `Student ${studentId} assembly attachments`)
  const mouthReference = profile.mouth?.sourceRendererReference
  if (mouthReference) {
    const mouthKey = sourceReferenceKey(mouthReference, `Student ${studentId} mouth sourceRendererReference`)
    assert.ok(!excludedKeys.has(mouthKey) && coreKeys.has(mouthKey), `Student ${studentId} mouth renderer is not represented by a core profile binding.`)
  }
  for (const [index, mouthRenderer] of (Array.isArray(attachments.mouthRenderer) ? attachments.mouthRenderer : []).entries()) {
    if (!mouthRenderer?.sourceReference) continue
    const mouthKey = sourceReferenceKey(mouthRenderer.sourceReference, `Student ${studentId} mouth renderer ${index}`)
    assert.ok(!excludedKeys.has(mouthKey) && coreKeys.has(mouthKey), `Student ${studentId} mouth renderer attachment is not represented by a core profile binding.`)
  }
  const equipmentNames = Array.isArray(attachments.equipmentRenderers) ? attachments.equipmentRenderers : []
  const equipmentReferences = Array.isArray(attachments.equipmentRendererReferences) ? attachments.equipmentRendererReferences : []
  const ambiguities = Array.isArray(attachments.equipmentRendererAmbiguities) ? attachments.equipmentRendererAmbiguities : []
  assert.deepEqual(ambiguities, [], `Student ${studentId} has ambiguous equipment renderer attachments.`)
  if (equipmentNames.length) assert.equal(equipmentReferences.length, equipmentNames.length, `Student ${studentId} has equipment renderer names without one exact source reference each.`)
  const equipmentKeys = new Set<string>()
  for (const [index, reference] of equipmentReferences.entries()) {
    const key = sourceReferenceKey(reference, `Student ${studentId} equipment renderer ${index}`)
    assert.ok(!equipmentKeys.has(key), `Student ${studentId} has duplicate exact equipment renderer identity ${key}.`)
    equipmentKeys.add(key)
    assert.ok(!excludedKeys.has(key), `Student ${studentId} equipment renderer ${key} is excluded by the presentation policy.`)
    assert.equal([...coreKeys].filter(candidate => candidate === key).length, 1, `Student ${studentId} equipment renderer ${key} is not represented by one core renderer binding.`)
    const assemblyMatch: JsonRecord[] = (assemblyRenderers as JsonRecord[]).filter((renderer: JsonRecord) => sourceReferenceKey(renderer.sourceReference, `Student ${studentId} assembly renderer`) === key)
    assert.equal(assemblyMatch.length, 1, `Student ${studentId} equipment renderer ${key} is not represented by one source assembly renderer.`)
  }
  const structuralKeys = options.requireEquipmentRelations
    ? assertStructuralEquipmentEvidence(studentId, profile, profileValidation, asRecord(glbJson, `Student ${studentId} GLB JSON`), renderers as JsonRecord[], assemblyRenderers as JsonRecord[], coreKeys, excludedKeys, equipmentKeys, options)
    : new Set<string>()
  if (options.requireEquipmentRelations) {
    const { markerKeys, bindingKeys } = sourceDeclaredEquipmentRendererKeys(profile, profileValidation)
    for (const key of markerKeys) {
      assert.ok(!excludedKeys.has(key), `Student ${studentId} source-declared equipment renderer ${key} is excluded by the presentation policy.`)
      assert.ok(coreKeys.has(key), `Student ${studentId} source-declared equipment renderer ${key} is not represented by a core renderer binding.`)
      assert.ok(equipmentKeys.has(key) || structuralKeys.has(key) || bindingKeys.has(key), `Student ${studentId} has an unresolved equipment renderer relation for source-declared renderer ${key}.`)
    }
  }
  return {
    policyVersion: versionContract.policyVersion,
    excludedRenderers: excludedRenderers as JsonRecord[],
    excludedChildRendererEvents: excludedEvents as JsonRecord[],
    equipmentRendererReferences: [...equipmentKeys].sort(),
    structurallyBoundEquipmentReferences: [...structuralKeys].sort(),
    coreRendererReferences: [...coreKeys].sort(),
  }
}

function embeddedRenderingProfile(studentId: number, glbJson: unknown) {
  const root = asRecord(glbJson, `Student ${studentId} GLB JSON`)
  const sceneIndex = Number.isInteger(root.scene) ? root.scene : 0
  return asRecord(root.scenes?.[sceneIndex]?.extras?.chibi?.renderingProfile, `Student ${studentId} embedded rendering profile`)
}

function assertActionProfileContract(studentId: number, bindingProfile: unknown, assetValidation: JsonRecord) {
  const binding = asRecord(bindingProfile, `Student ${studentId} persisted action profile`)
  assert.ok(typeof binding.label === 'string' && binding.label, `Student ${studentId} persisted action profile has no label.`)
  assert.ok(binding.initialPose === null || typeof binding.initialPose === 'string', `Student ${studentId} persisted action profile has an invalid initial pose.`)
  const animations = Array.isArray(assetValidation.animations) ? assetValidation.animations : []
  if (binding.initialPose) assert.ok(animations.includes(binding.initialPose), `Student ${studentId} initial pose ${binding.initialPose} is not present in the published animation set.`)
  const interactions = asRecord(binding.interactions, `Student ${studentId} persisted action interactions`)
  for (const action of ['idle', 'walk', 'pickup', 'touch']) {
    const interaction = asRecord(interactions[action], `Student ${studentId} ${action} interaction`)
    assert.ok(interaction.state === 'available' || interaction.state === 'unsupported' || interaction.state === 'unresolved' || interaction.state === 'failed', `Student ${studentId} ${action} interaction has an invalid state.`)
    assert.notEqual(interaction.state, 'unresolved', `Student ${studentId} ${action} interaction is unresolved.`)
    assert.notEqual(interaction.state, 'failed', `Student ${studentId} ${action} interaction failed.`)
    if (interaction.state === 'available') {
      assert.ok(typeof interaction.clip === 'string' && interaction.clip, `Student ${studentId} ${action} interaction has no clip.`)
      assert.ok(animations.includes(interaction.clip), `Student ${studentId} ${action} clip ${interaction.clip} is not present in the published animation set.`)
    }
  }
}

function parseEmbeddedGlbJson(bytes: Buffer, studentId: number) {
  assert.ok(bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'glTF' && bytes.readUInt32LE(4) === 2, `Artifact for student ${studentId} is not a GLB 2.0 file.`)
  const declaredLength = bytes.readUInt32LE(8)
  assert.equal(declaredLength, bytes.length, `Artifact for student ${studentId} has an invalid GLB declared length.`)
  let offset = 12
  let json: unknown = null
  let binary: Buffer | null = null
  while (offset < bytes.length) {
    assert.ok(offset + 8 <= bytes.length, `Artifact for student ${studentId} has a truncated GLB chunk header.`)
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const end = offset + 8 + length
    assert.ok(end <= bytes.length && length % 4 === 0, `Artifact for student ${studentId} has an invalid GLB chunk.`)
    if (type === 0x4e4f534a) json = JSON.parse(bytes.toString('utf8', offset + 8, end).replace(/[\u0000 ]+$/, ''))
    if (type === 0x004e4942) binary = bytes.subarray(offset + 8, end)
    offset = end
  }
  assert.ok(json, `Artifact for student ${studentId} has no GLB JSON chunk.`)
  if (binary && typeof json === 'object' && json !== null) {
    Object.defineProperty(json, '__chibiBinary', { value: binary, enumerable: false, configurable: false, writable: false })
  }
  return json
}

async function assertDatabaseIsClean(prisma: PrismaClient, expectedStudents: AcceptanceRosterPlan['students'], studentId: number) {
  await prisma.$queryRaw`SELECT 1`
  const [assets, bindings, jobs, items, candidates, students] = await Promise.all([
    prisma.chibiAsset.count(),
    prisma.studentChibiBinding.count(),
    prisma.chibiImportJob.count(),
    prisma.chibiImportItem.count(),
    prisma.chibiSourceCandidate.count(),
    prisma.student.findMany({ where: { id: { gte: 10000, lte: 99999 } }, select: { id: true, name: true, pathName: true }, orderBy: { id: 'asc' } }) as Promise<Array<{ id: number; name: string; pathName: string | null }>>,
  ])
  assert.equal(assets, 0, 'Acceptance must start with an empty ChibiAsset table.')
  assert.equal(bindings, 0, 'Acceptance must start with an empty StudentChibiBinding table.')
  assert.equal(jobs, 0, 'Acceptance must start with an empty ChibiImportJob table.')
  assert.equal(items, 0, 'Acceptance must start with an empty ChibiImportItem table.')
  assert.equal(candidates, 0, 'Acceptance must start with an empty ChibiSourceCandidate table.')
  const typedStudents = students as Array<{ id: number; name: string; pathName: string | null }>
  assert.deepEqual(typedStudents.map(student => student.id), expectedStudents.map(student => student.id), 'Acceptance database roster does not exactly match the selected deterministic acceptance roster.')
  const target = typedStudents.find(student => student.id === studentId)
  assert.ok(target, `Acceptance roster does not contain student ${studentId}; run the deterministic fixture preparer first.`)
  return { students: typedStudents, target }
}

async function assertResumableDatabase(prisma: PrismaClient, expectedJobId: string, expectedStudents: AcceptanceRosterPlan['students'], studentId: number) {
  await prisma.$queryRaw`SELECT 1`
  const [jobs, itemStudentIds, students] = await Promise.all([
    prisma.chibiImportJob.findMany({ select: { id: true, mode: true, status: true, total: true, processed: true } }),
    prisma.chibiImportItem.findMany({ where: { jobId: expectedJobId }, select: { studentId: true }, orderBy: { studentId: 'asc' } }),
    prisma.student.findMany({ where: { id: { gte: 10000, lte: 99999 } }, select: { id: true, name: true, pathName: true }, orderBy: { id: 'asc' } }) as Promise<Array<{ id: number; name: string; pathName: string | null }>>,
  ])
  assert.equal(jobs.length, 1, 'Resume requires the one import job created by the original clean acceptance invocation.')
  const job = jobs[0]
  assertResumableJobIdentity(expectedJobId, job)
  assert.ok(['queued', 'running', 'completed', 'failed'].includes(job.status), `Import job ${expectedJobId} has unsupported status ${job.status}.`)
  assert.equal(job.total, expectedStudents.length, `Import job ${expectedJobId} does not cover the selected deterministic roster.`)
  assert.ok(job.processed <= job.total, `Import job ${expectedJobId} reports more processed rows than its roster total.`)
  assert.deepEqual(itemStudentIds.map(item => item.studentId), expectedStudents.map(student => student.id), `Import job ${expectedJobId} item rows do not exactly match the selected deterministic roster.`)
  const typedStudents = students as Array<{ id: number; name: string; pathName: string | null }>
  assert.deepEqual(typedStudents.map(student => student.id), expectedStudents.map(student => student.id), 'Acceptance database roster does not exactly match the selected deterministic acceptance roster.')
  const target = typedStudents.find(student => student.id === studentId)
  assert.ok(target, `Acceptance roster does not contain student ${studentId}; run the deterministic fixture preparer first.`)
  return { job, students: typedStudents, target }
}

type AcceptanceAsset = NonNullable<AcceptanceItem['asset']>
type AcceptanceDbItem = { studentId: number; status: string; diagnostic: string | null; sourceIdentity: string | null; fingerprint: string | null; assetId: string | null; asset: AcceptanceAsset | null }
type AcceptanceBinding = { studentId: number; status: string; sourceIdentity: string | null; profile: unknown; asset: AcceptanceAsset | null }

export const V12_ACCEPTANCE_ASSET_SELECT = {
  id: true,
  checksum: true,
  fileKey: true,
  published: true,
  validation: true,
} as const

export const V12_ACCEPTANCE_IMPORT_ITEM_SELECT = {
  studentId: true,
  status: true,
  diagnostic: true,
  sourceIdentity: true,
  fingerprint: true,
  assetId: true,
  asset: { select: V12_ACCEPTANCE_ASSET_SELECT },
} as const

export const V12_ACCEPTANCE_BINDING_SELECT = {
  studentId: true,
  status: true,
  sourceIdentity: true,
  profile: true,
  asset: { select: V12_ACCEPTANCE_ASSET_SELECT },
} as const

async function snapshotAsset(dataDir: string, studentId: number, asset: AcceptanceAsset, bindingProfile?: unknown, options: CharacterContractOptions = {}) {
  assert.equal(asset.published, true, `Student ${studentId} asset is not published.`)
  const validation = asRecord(asset.validation, `Student ${studentId} asset validation`)
  assert.equal(validation.valid, true, `Student ${studentId} asset validation is not valid.`)
  assert.ok(!asset.fileKey.includes('\\') && !asset.fileKey.includes(':') && !asset.fileKey.startsWith('/'), `Artifact file key is not a safe relative path: ${asset.fileKey}`)
  assert.ok(asset.fileKey.split('/').every(segment => segment && segment !== '.' && segment !== '..'), `Artifact file key is not a normalized relative path: ${asset.fileKey}`)
  const root = path.resolve(dataDir)
  const artifact = path.resolve(root, ...asset.fileKey.split('/'))
  const relative = path.relative(root, artifact)
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Artifact path escapes CHIBI_DATA_DIR: ${asset.fileKey}`)
  const artifactStat = await lstat(artifact)
  assert.ok(artifactStat.isFile() && !artifactStat.isSymbolicLink(), `Artifact for student ${studentId} must be a regular file inside CHIBI_DATA_DIR.`)
  const bytes = await readFile(artifact)
  const checksum = createHash('sha256').update(bytes).digest('hex')
  assert.equal(checksum, asset.checksum, `Artifact checksum mismatch for student ${studentId}.`)
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF', `Artifact for student ${studentId} is not a binary GLB.`)
  const canonicalRoot = await realpath(root)
  const canonicalArtifact = await realpath(artifact)
  const canonicalRelative = path.relative(canonicalRoot, canonicalArtifact)
  assert.ok(canonicalRelative && !canonicalRelative.startsWith('..') && !path.isAbsolute(canonicalRelative), `Artifact real path escapes CHIBI_DATA_DIR: ${asset.fileKey}`)
  const glbJson = parseEmbeddedGlbJson(bytes, studentId)
  const consumesReviewedHanaeWitness = [...(options.sourceMotionProof?.rowsByKey.values() ?? [])].some(row =>
    row.studentId === studentId
    && row.asset?.sha256?.toLowerCase() === checksum.toLowerCase()
    && Array.isArray(row.tracks)
    && row.tracks.some((track: JsonRecord) => track.disposition === 'bounded-source-to-static'
      && track.comparison?.modelHeightEvidence?.selector === 'reviewed-isolated-glb-body-role-witness-v1'))
  const reviewedBodyRoleWitness = consumesReviewedHanaeWitness
    ? await verifyApprovedHanaeBodyRoleWitness({
      projectRoot: ACCEPTANCE_PROJECT_ROOT,
      studentId,
      sourceIdentity: options.sourceIdentity,
      assetSha256: checksum,
      fullGlbBytes: bytes,
    })
    : undefined
  const embeddedContract = assertEmbeddedCharacterContract(studentId, validation, glbJson, {
    ...options,
    actionProfile: bindingProfile,
    assetIdentity: { assetId: asset.id, revision: asset.checksum, sha256: asset.checksum },
    reviewedBodyRoleWitness,
  })
  if (bindingProfile !== undefined) assertActionProfileContract(studentId, bindingProfile, validation)
  return { assetId: asset.id, checksum: asset.checksum, fileKey: asset.fileKey, bytes: bytes.length, bytesHash: checksum }
}

type AcceptanceArtifactSnapshot = Awaited<ReturnType<typeof snapshotAsset>>

async function snapshotSuccessfulRosterArtifacts(
  prisma: PrismaClient,
  dataDir: string,
  job: JobResponse,
  roster: AcceptanceRosterPlan,
  outcome: ReturnType<typeof assertTerminalOutcome>,
  versionContract: AcceptanceRenderingVersionContract = CURRENT_RENDERING_VERSION_CONTRACT,
  sourceMotionProof?: VerifiedV12SourceMotionProof,
) {
  const ids = roster.students.map(student => student.id)
  const dbItems = await prisma.chibiImportItem.findMany({
    where: { jobId: job.job.id },
    orderBy: { studentId: 'asc' },
    select: V12_ACCEPTANCE_IMPORT_ITEM_SELECT,
  }) as AcceptanceDbItem[]
  assert.deepEqual(dbItems.map(item => item.studentId), [...ids].sort((left, right) => left - right), `Persisted import items do not exactly match the ${roster.mode} acceptance roster.`)
  const bindings = await prisma.studentChibiBinding.findMany({
    where: { studentId: { in: ids } },
    select: V12_ACCEPTANCE_BINDING_SELECT,
    orderBy: { studentId: 'asc' },
  }) as AcceptanceBinding[]
  const bindingsByStudent = new Map(bindings.map((binding: AcceptanceBinding) => [binding.studentId, binding] as const))
  const reportedItems = new Map(job.items.map(item => [item.studentId, item]))
  const expectedBlocked = new Set(outcome.knownBlocked.map(item => item.studentId))
  const artifacts = new Map<number, AcceptanceArtifactSnapshot>()
  for (const item of dbItems) {
    const reported = reportedItems.get(item.studentId)
    assert.ok(reported, `Chibi job ${job.job.id} omitted persisted student ${item.studentId} from its response.`)
    assert.equal(reported!.status, item.status, `Chibi job ${job.job.id} status differs for student ${item.studentId}.`)
    const blockedExpectation = knownBlockerExpectation(roster, item as unknown as AcceptanceItem)
    if (blockedExpectation) {
      assert.equal(item.sourceIdentity, blockedExpectation.sourceIdentity, `Known blocked student ${item.studentId} persisted the wrong source identity.`)
      assert.equal(item.fingerprint, blockedExpectation.itemFingerprint, `Known blocked student ${item.studentId} persisted the wrong source/profile fingerprint.`)
      assert.equal(item.diagnostic, blockedExpectation.diagnostic, `Known blocked student ${item.studentId} persisted the wrong diagnostic.`)
      assert.equal(item.assetId, null, `Known blocked student ${item.studentId} unexpectedly has a published asset.`)
      assert.equal(item.asset, null, `Known blocked student ${item.studentId} unexpectedly has an asset record.`)
      continue
    }
    if (expectedBlocked.has(item.studentId)) throw new Error(`Known blocked student ${item.studentId} failed the exact blocked-row contract.`)
    assert.ok(SUCCESS_ITEM_STATES.has(item.status), `Student ${item.studentId} has persisted non-success status ${item.status}.`)
    assert.ok(item.asset, `Student ${item.studentId} has no persisted asset record after a successful import.`)
    assert.equal(item.assetId, item.asset.id, `Student ${item.studentId} import item points at the wrong asset record.`)
    assert.equal(reported!.assetId, item.asset.id, `Chibi job ${job.job.id} reported the wrong asset for student ${item.studentId}.`)
    const binding = bindingsByStudent.get(item.studentId)
    assert.ok(binding, `Student ${item.studentId} has no persisted Chibi binding.`)
    assert.equal(binding!.sourceIdentity, item.sourceIdentity, `Student ${item.studentId} import item and binding source identities differ.`)
    artifacts.set(item.studentId, await snapshotAsset(dataDir, item.studentId, item.asset, binding!.profile, {
      requireEquipmentRelations: roster.mode === 'full',
      renderingVersionContract: versionContract,
      sourceIdentity: item.sourceIdentity,
      sourceMotionProof,
    }))
  }
  assert.equal(artifacts.size, outcome.successful.length, `Successful roster item count does not match persisted published assets.`)

  for (const studentId of ids) {
    const binding = bindingsByStudent.get(studentId)
    if (expectedBlocked.has(studentId)) {
      assert.ok(!binding || (binding.status !== 'available' && !binding.asset), `Known blocked student ${studentId} has an active published binding.`)
      continue
    }
    assert.ok(binding, `Student ${studentId} has no persisted Chibi binding.`)
    assert.equal(binding!.status, 'available', `Student ${studentId} binding is ${binding!.status}, not available.`)
    assert.ok(binding!.asset, `Student ${studentId} binding has no persisted asset.`)
    assert.equal(binding!.asset!.id, artifacts.get(studentId)?.assetId, `Student ${studentId} binding does not point at its validated asset.`)
  }
  return artifacts
}

async function snapshotActiveRosterBindings(
  prisma: PrismaClient,
  dataDir: string,
  roster: AcceptanceRosterPlan,
  versionContract: AcceptanceRenderingVersionContract = CURRENT_RENDERING_VERSION_CONTRACT,
  sourceMotionProof?: VerifiedV12SourceMotionProof,
) {
  const ids = roster.students.map(student => student.id)
  const blockedItems = await prisma.chibiImportItem.findMany({
    where: { studentId: { in: ids }, status: { in: ['unavailable', 'review-required'] } },
    orderBy: { updatedAt: 'desc' },
    select: { studentId: true, status: true, diagnostic: true, sourceIdentity: true, fingerprint: true, assetId: true, job: { select: { id: true, status: true, failed: true } } },
  }) as Array<{ studentId: number; status: string; diagnostic: string | null; sourceIdentity: string | null; fingerprint: string | null; assetId: string | null; job: { id: string; status: string; failed: number } }>
  const expectedBlockedIds = new Set(roster.mode === 'full' ? ACCEPTANCE_BLOCKER_SNAPSHOT.rows.map(row => row.studentId) : [])
  const latestBlocked = new Map<number, (typeof blockedItems)[number]>()
  for (const item of blockedItems) {
    if (!latestBlocked.has(item.studentId)) latestBlocked.set(item.studentId, item)
    if (!expectedBlockedIds.has(item.studentId)) throw new Error(`Unexpected persisted blocked item ${item.studentId} exists after restart.`)
  }
  const knownBlocked = [...expectedBlockedIds].map(studentId => {
    const item = latestBlocked.get(studentId)
    assert.ok(item, `Known blocked student ${studentId} has no persisted blocked item after restart.`)
    const expectation = knownBlockerExpectation(roster, item as unknown as AcceptanceItem)
    assert.ok(expectation, `Known blocked student ${studentId} does not match the versioned status, source identity, fingerprint, and diagnostic after restart.`)
    assert.equal(item!.job.status, 'completed', `Known blocked student ${studentId} is not recorded by a completed import job.`)
    assert.equal(item!.job.failed, 0, `Known blocked student ${studentId} is recorded by a job with failed items.`)
    assert.equal(item!.assetId, null, `Known blocked student ${studentId} has a persisted asset after restart.`)
    return { studentId, status: item!.status, sourceIdentity: item!.sourceIdentity, fingerprint: item!.fingerprint, diagnostic: item!.diagnostic }
  })
  const bindings = await prisma.studentChibiBinding.findMany({
    where: { studentId: { in: ids } },
    select: V12_ACCEPTANCE_BINDING_SELECT,
    orderBy: { studentId: 'asc' },
  }) as AcceptanceBinding[]
  const byStudent = new Map(bindings.map((binding: AcceptanceBinding) => [binding.studentId, binding] as const))
  const artifacts = new Map<number, AcceptanceArtifactSnapshot>()
  for (const studentId of ids) {
    const binding = byStudent.get(studentId)
    if (expectedBlockedIds.has(studentId)) {
      assert.ok(!binding || (binding.status !== 'available' && !binding.asset), `Known blocked student ${studentId} has an active published binding.`)
      continue
    }
    assert.ok(binding, `Student ${studentId} has no persisted Chibi binding after restart.`)
    assert.equal(binding!.status, 'available', `Student ${studentId} binding is ${binding!.status}, not available.`)
    assert.ok(binding!.asset, `Student ${studentId} binding has no persisted asset after restart.`)
    artifacts.set(studentId, await snapshotAsset(dataDir, studentId, binding!.asset!, binding!.profile, {
      requireEquipmentRelations: roster.mode === 'full',
      renderingVersionContract: versionContract,
      sourceIdentity: binding!.sourceIdentity,
      sourceMotionProof,
    }))
  }
  return {
    artifacts,
    allowedUnavailable: knownBlocked.filter(item => !item.sourceIdentity).map(item => ({
      studentId: item.studentId,
      status: item.status,
      reasonCode: 'NO_EXACT_CANONICAL_SOURCE',
      diagnostic: item.diagnostic,
    })),
    knownBlocked,
  }
}

async function assertPersistedTerminalJob(prisma: PrismaClient, studentId: number, assetId: string, expectedJobId: string) {
  const item = await prisma.chibiImportItem.findFirst({
    where: { studentId, jobId: expectedJobId, status: { in: [...SUCCESS_ITEM_STATES] }, job: { status: 'completed', failed: 0 } },
    orderBy: { updatedAt: 'desc' },
    select: { jobId: true, assetId: true, status: true, job: { select: { status: true, failed: true } } },
  })
  assert.ok(item, `Student ${studentId} has no persisted successful terminal import item after restart.`)
  assert.equal(item.job.status, 'completed', `Persisted import job ${item.jobId} is not completed.`)
  assert.equal(item.job.failed, 0, `Persisted import job ${item.jobId} reported failed items.`)
  assert.equal(item.assetId, assetId, `Persisted import item ${item.jobId} does not point to the active asset.`)
  return item
}

async function assertOnlyExpectedJob(prisma: PrismaClient, expectedJobId: string) {
  const jobs = await prisma.chibiImportJob.findMany({ select: { id: true } })
  assertOnlyExpectedImportJob(jobs.map(job => job.id), expectedJobId)
}

async function fetchJob(page: Page, origin: string, jobId: string): Promise<JobResponse> {
  const first = await page.evaluate(async ({ origin: base, jobId: id }) => {
    const response = await fetch(`${base}/api/admin/chibi/import/jobs/${id}?page=1&pageSize=100`)
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || `Job request failed (${response.status}).`)
    return body
  }, { origin, jobId }) as JobResponse
  if (first.total <= first.items.length) return first
  const pages = await Promise.all(Array.from({ length: Math.ceil(first.total / 100) - 1 }, (_, index) => page.evaluate(async ({ origin: base, jobId: id, pageNumber }) => {
    const response = await fetch(`${base}/api/admin/chibi/import/jobs/${id}?page=${pageNumber}&pageSize=100`)
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || `Job request failed (${response.status}).`)
    return body.items as AcceptanceItem[]
  }, { origin, jobId, pageNumber: index + 2 }) as Promise<AcceptanceItem[]>))
  return { ...first, items: [first.items, ...pages].flat() }
}

async function fetchJobProgress(page: Page, origin: string, jobId: string): Promise<Pick<JobResponse, 'job' | 'total'>> {
  return page.evaluate(async ({ origin: base, jobId: id }) => {
    const response = await fetch(`${base}/api/admin/chibi/import/jobs/${id}?page=1&pageSize=1`)
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || `Job request failed (${response.status}).`)
    return { job: body.job, total: body.total }
  }, { origin, jobId }) as Promise<Pick<JobResponse, 'job' | 'total'>>
}

async function waitForJob(page: Page, origin: string, jobId: string, timeoutMs: number): Promise<JobResponse> {
  const deadline = Date.now() + timeoutMs
  let latest: AcceptanceJob | null = null
  while (Date.now() < deadline) {
    const progress = await fetchJobProgress(page, origin, jobId)
    latest = progress.job
    if (TERMINAL_JOB_STATES.has(progress.job.status)) return fetchJob(page, origin, jobId)
    await delay(Math.min(2_000, Math.max(250, deadline - Date.now())))
  }
  throw new Error(`Timed out waiting for chibi job ${jobId}; last state: ${latest?.status || 'unknown'} / ${latest?.stage || 'unknown'}.`)
}

async function assertPublicCatalogDelivery(
  origin: string,
  roster: AcceptanceRosterPlan,
  artifacts: Map<number, AcceptanceArtifactSnapshot>,
  allowedUnavailable: readonly { studentId: number; reasonCode: string; diagnostic: string | null }[],
  knownBlocked: readonly { studentId: number }[] = [],
) {
  const catalogResponse = await fetch(`${origin}/api/chibi/students`)
  assert.equal(catalogResponse.status, 200, 'Public Chibi catalog did not respond successfully.')
  const catalog = await catalogResponse.json() as { students?: Array<{ id: number; status?: string; model?: { assetId: string; revision: string; url: string } | null }> }
  const rows = catalog.students ?? []
  const expectedIds = [...artifacts.keys()].sort((left, right) => left - right)
  assert.deepEqual(rows.map(student => student.id).sort((left, right) => left - right), expectedIds, `Public catalog does not list exactly the successfully imported ${roster.mode} students.`)
  assert.deepEqual(rows.filter(student => student.status !== 'viewable' || !student.model), [], 'Public catalog contains a blocked or unavailable row.')
  for (const studentId of expectedIds) {
    const row = rows.find(student => student.id === studentId)
    assert.ok(row, `Public catalog omitted successfully imported student ${studentId}.`)
    const expected = artifacts.get(studentId)
    assert.ok(expected, `Student ${studentId} has no locally validated artifact for catalog delivery.`)
    assert.equal(row!.status, 'viewable', `Student ${studentId} is not marked viewable in the public catalog.`)
    assert.equal(row!.model?.assetId, expected!.assetId, `Public catalog exposes the wrong asset for student ${studentId}.`)
    assert.equal(row!.model?.revision, expected!.checksum, `Public catalog revision mismatch for student ${studentId}.`)
    assert.ok(row!.model?.url, `Public catalog has no model URL for student ${studentId}.`)
    const artifactResponse = await fetch(new URL(row!.model!.url, origin))
    assert.equal(artifactResponse.status, 200, `Public model URL for student ${studentId} is not ready.`)
    assert.equal(artifactResponse.headers.get('Content-Type'), 'model/gltf-binary', `Public model URL for student ${studentId} has the wrong content type.`)
    const bytes = Buffer.from(await artifactResponse.arrayBuffer())
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected!.bytesHash, `Public model bytes differ for student ${studentId}.`)
  }
  for (const item of allowedUnavailable) {
    assert.equal(rows.some(student => student.id === item.studentId), false, `Source-unavailable student ${item.studentId} unexpectedly appears in the public catalog.`)
  }
  for (const item of knownBlocked) {
    assert.equal(rows.some(student => student.id === item.studentId), false, `Known blocked student ${item.studentId} unexpectedly appears in the public catalog.`)
  }
}

async function loginAndOpenChibi(browser: Browser, origin: string) {
  const email = process.env.CHIBI_TEST_EMAIL?.trim()
  const password = process.env.CHIBI_TEST_PASSWORD
  assert.ok(email && password, 'Set CHIBI_TEST_EMAIL and CHIBI_TEST_PASSWORD to the fixture admin credentials.')
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 })
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle2' })
  await page.type('input[type="email"]', email)
  await page.type('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.pathname.includes('login'))
  await page.goto(`${origin}/admin`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.innerText.trim() === 'Chibi'))
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Chibi')!.click())
  await page.waitForSelector('#chibi-admin-search')
  return page
}

async function clickImport(page: Page, origin: string) {
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(value => value.innerText.trim() === 'Import / Update' && !(value as HTMLButtonElement).disabled)
    if (!button) throw new Error('Import / Update is unavailable; verify the worker is ready and no job is active.')
    button.click()
  })
  await page.waitForFunction(() => /Queued update · \S+/.test(document.body.innerText), { timeout: 30_000 })
  const jobId = await page.evaluate(() => document.querySelector('[role="status"]')?.textContent?.match(/Queued update · (\S+)/)?.[1] || '')
  assert.ok(jobId, 'Admin Import / Update did not expose a job id.')
  const job = await waitForJob(page, origin, jobId, timeoutOption())
  return { jobId, job }
}

function assertKnownBlockerSnapshot(roster: AcceptanceRosterPlan, versionContract: AcceptanceRenderingVersionContract) {
  if (roster.mode !== 'full') return null
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.schemaVersion, 1, 'Known blocker snapshot schema is unsupported.')
  assert.match(ACCEPTANCE_BLOCKER_SNAPSHOT.snapshotVersion, /^chibi-acceptance-known-blockers-v\d+$/, 'Known blocker snapshot version is unsupported.')
  if (versionContract.jobId === V12_TERMINAL_RESUME_JOB_ID) {
    assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.snapshotVersion, V12_BLOCKER_SNAPSHOT_VERSION, 'Historical v12 resume requires its original frozen blocker snapshot.')
  } else {
    assert.notEqual(ACCEPTANCE_BLOCKER_SNAPSHOT.snapshotVersion, V12_BLOCKER_SNAPSHOT_VERSION, 'The frozen v12 blocker snapshot cannot authorize a new import; regenerate a current rendering-policy snapshot after rebuilding the inventory.')
  }
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.roster.version, roster.version, 'Known blocker snapshot roster version differs from the selected acceptance roster.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.roster.checksum, roster.checksum, 'Known blocker snapshot roster checksum differs from the selected acceptance roster.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.roster.eligibleCount, roster.students.length, 'Known blocker snapshot roster count differs from the selected acceptance roster.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.profileVersion, versionContract.profileVersion, 'Known blocker snapshot rendering profile version differs from the approved acceptance contract.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.policyVersion, versionContract.policyVersion, 'Known blocker snapshot rendering policy version differs from the approved acceptance contract.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.source.kind, 'BAAD', 'Known blocker snapshot source kind is unsupported.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.source.inventoryVersion, 2, 'Known blocker snapshot inventory schema is unsupported.')
  assert.match(ACCEPTANCE_BLOCKER_SNAPSHOT.source.inventorySha256, /^[a-f0-9]{64}$/i, 'Known blocker snapshot source fingerprint is invalid.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.counts.eligible, roster.students.length, 'Known blocker snapshot eligible count is invalid.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.counts.successful + ACCEPTANCE_BLOCKER_SNAPSHOT.counts.blocked, roster.students.length, 'Known blocker snapshot success/blocked counts do not cover the roster.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.rows.length, ACCEPTANCE_BLOCKER_SNAPSHOT.counts.blocked, 'Known blocker snapshot row count differs from its blocked count.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.rows.filter(row => row.sourceIdentity).length, ACCEPTANCE_BLOCKER_SNAPSHOT.counts.mappedBlocked, 'Known blocker snapshot mapped-blocked count differs from its rows.')
  assert.equal(ACCEPTANCE_BLOCKER_SNAPSHOT.rows.filter(row => !row.sourceIdentity).length, ACCEPTANCE_BLOCKER_SNAPSHOT.counts.sourceUnavailable, 'Known blocker snapshot source-unavailable count differs from its rows.')
  const rosterIds = new Set(roster.students.map(student => student.id))
  const rowIds = ACCEPTANCE_BLOCKER_SNAPSHOT.rows.map(row => row.studentId)
  assert.equal(new Set(rowIds).size, rowIds.length, 'Known blocker snapshot contains duplicate student IDs.')
  for (const row of ACCEPTANCE_BLOCKER_SNAPSHOT.rows) {
    assert.ok(rosterIds.has(row.studentId), `Known blocker snapshot student ${row.studentId} is outside the selected roster.`)
    assert.ok(row.name.trim(), `Known blocker snapshot student ${row.studentId} has no name.`)
    assert.ok(row.diagnostic.trim(), `Known blocker snapshot student ${row.studentId} has no strict diagnostic.`)
    assert.ok(row.expectedStatus === 'unavailable' || row.expectedStatus === 'review-required', `Known blocker snapshot student ${row.studentId} has unsupported status ${row.expectedStatus}.`)
    if (row.sourceIdentity) {
      assert.match(row.sourceFingerprint ?? '', /^[a-f0-9]{64}$/i, `Known blocker snapshot student ${row.studentId} has no source fingerprint.`)
      assert.match(row.itemFingerprint ?? '', /^[a-f0-9]{64}$/i, `Known blocker snapshot student ${row.studentId} has no item fingerprint.`)
      assert.ok(row.prefabPath, `Known blocker snapshot student ${row.studentId} has no prefab path.`)
    } else {
      assert.equal(row.sourceFingerprint, null, `Known source-unavailable student ${row.studentId} unexpectedly has a source fingerprint.`)
      assert.equal(row.itemFingerprint, null, `Known source-unavailable student ${row.studentId} unexpectedly has an item fingerprint.`)
      assert.equal(row.prefabPath, null, `Known source-unavailable student ${row.studentId} unexpectedly has a prefab path.`)
    }
  }
  return ACCEPTANCE_BLOCKER_SNAPSHOT
}

export function assertKnownBlockerAcknowledgement(
  roster: AcceptanceRosterPlan,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  versionContract: AcceptanceRenderingVersionContract = CURRENT_RENDERING_VERSION_CONTRACT,
) {
  const snapshot = assertKnownBlockerSnapshot(roster, versionContract)
  if (!snapshot) return null
  assert.equal(environment.CHIBI_ACCEPTANCE_ALLOW_BLOCKED, 'true', 'Full-roster acceptance records the versioned known blocker snapshot only when CHIBI_ACCEPTANCE_ALLOW_BLOCKED=true is explicitly set.')
  return snapshot
}

function knownBlockerExpectation(roster: AcceptanceRosterPlan, item: AcceptanceItem) {
  if (roster.mode !== 'full') return null
  const expected = ACCEPTANCE_BLOCKERS_BY_STUDENT.get(item.studentId)
  if (!expected || item.status !== expected.expectedStatus || item.assetId || item.asset) return null
  if ((item.diagnostic ?? null) !== expected.diagnostic) return null
  if (expected.sourceIdentity) {
    if ((item.sourceIdentity ?? null) !== expected.sourceIdentity) return null
    if ((item.fingerprint ?? null) !== expected.itemFingerprint) return null
  } else if (item.sourceIdentity || item.fingerprint) {
    return null
  }
  return { ...expected, diagnostic: item.diagnostic }
}

function sourceUnavailableExpectation(roster: AcceptanceRosterPlan, item: AcceptanceItem) {
  const expected = knownBlockerExpectation(roster, item)
  if (!expected || expected.sourceIdentity) return null
  return {
    studentId: item.studentId,
    status: item.status,
    reasonCode: 'NO_EXACT_CANONICAL_SOURCE',
    diagnostic: item.diagnostic,
  }
}

export function assertTerminalOutcome(
  job: JobResponse,
  roster: AcceptanceRosterPlan,
  selectedStudentId = roster.students[0]?.id,
  versionContract: AcceptanceRenderingVersionContract = CURRENT_RENDERING_VERSION_CONTRACT,
) {
  const blockerSnapshot = assertKnownBlockerSnapshot(roster, versionContract)
  if (versionContract.jobId) assert.equal(job.job.id, versionContract.jobId, 'Historical rendering versions cannot validate a different import job.')
  assert.equal(job.job.status, 'completed', `Chibi job ${job.job.id} ended ${job.job.status}: ${job.job.error || 'no job error'}`)
  assert.equal(job.job.failed, 0, `Chibi job ${job.job.id} reported ${job.job.failed} failed item(s).`)
  const expectedIds = roster.students.map(student => student.id)
  assert.equal(job.job.total, expectedIds.length, `Chibi job ${job.job.id} total does not match the selected ${roster.mode} acceptance roster.`)
  assert.equal(job.job.processed, expectedIds.length, `Chibi job ${job.job.id} did not process every selected roster item.`)
  const actualIds = job.items.map(item => item.studentId)
  assert.deepEqual(actualIds, [...expectedIds].sort((left, right) => left - right), `Chibi job ${job.job.id} did not produce exactly the selected ${roster.mode} acceptance roster.`)
  assert.equal(new Set(actualIds).size, actualIds.length, `Chibi job ${job.job.id} contains duplicate student items.`)
  const expectedKnownBlockerIds = new Set(blockerSnapshot?.rows.map(row => row.studentId) ?? [])
  const knownSuccesses = job.items.filter(item => expectedKnownBlockerIds.has(item.studentId) && SUCCESS_ITEM_STATES.has(item.status))
  assert.deepEqual(knownSuccesses, [], `Chibi job ${job.job.id} unexpectedly published a known blocked student: ${knownSuccesses.map(item => item.studentId).join(', ')}`)
  const unresolved = job.items.filter(item => !SUCCESS_ITEM_STATES.has(item.status) && !knownBlockerExpectation(roster, item))
  assert.deepEqual(unresolved, [], `Chibi job ${job.job.id} contains failed, review-required, unresolved, or unapproved unavailable item(s): ${unresolved.map(item => `${item.studentId}:${item.status}:${item.diagnostic || 'no diagnostic'}`).join(', ')}`)
  const successful = job.items.filter(item => SUCCESS_ITEM_STATES.has(item.status))
  const knownBlocked = job.items.filter(item => knownBlockerExpectation(roster, item)).map(item => ({
    studentId: item.studentId,
    status: item.status,
    sourceIdentity: item.sourceIdentity ?? null,
    fingerprint: item.fingerprint ?? null,
    diagnostic: item.diagnostic,
  }))
  const allowedUnavailable = job.items.filter(item => sourceUnavailableExpectation(roster, item)).map(item => sourceUnavailableExpectation(roster, item)!)
  if (blockerSnapshot) {
    assert.equal(successful.length, blockerSnapshot.counts.successful, `Chibi job ${job.job.id} successful item count differs from the versioned blocker snapshot.`)
    assert.equal(knownBlocked.length, blockerSnapshot.counts.blocked, `Chibi job ${job.job.id} known blocked item count differs from the versioned blocker snapshot.`)
    assert.equal(knownBlocked.filter(item => item.sourceIdentity).length, blockerSnapshot.counts.mappedBlocked, `Chibi job ${job.job.id} mapped-blocked count differs from the versioned blocker snapshot.`)
    assert.equal(allowedUnavailable.length, blockerSnapshot.counts.sourceUnavailable, `Chibi job ${job.job.id} source-unavailable count differs from the versioned blocker snapshot.`)
  }
  const expectedCounters = {
    imported: successful.filter(item => item.status === 'imported').length,
    updated: successful.filter(item => item.status === 'updated').length,
    reused: successful.filter(item => item.status === 'reused').length,
    skipped: successful.filter(item => item.status === 'skipped').length,
    unavailable: job.items.filter(item => item.status === 'unavailable').length,
    reviewRequired: job.items.filter(item => item.status === 'review-required').length,
    failed: job.items.filter(item => item.status === 'failed').length,
  }
  for (const [counter, expected] of Object.entries(expectedCounters)) assert.equal(job.job[counter as keyof AcceptanceJob], expected, `Chibi job ${job.job.id} ${counter} counter does not match its exact item statuses.`)
  const target = job.items.find(item => item.studentId === selectedStudentId)
  assert.ok(target, `Chibi job ${job.job.id} did not create an item for student ${selectedStudentId}.`)
  assert.ok(SUCCESS_ITEM_STATES.has(target.status) || Boolean(knownBlockerExpectation(roster, target)), `Student ${selectedStudentId} ended ${target.status}: ${target.diagnostic || 'no diagnostic'}`)
  return { target, allowedUnavailable, knownBlocked, successful }
}

async function assertPublicDelivery(origin: string, studentId: number, expected: { assetId: string; checksum: string; bytesHash: string }, page: Page) {
  const catalogResponse = await fetch(`${origin}/api/chibi/students`)
  assert.equal(catalogResponse.status, 200)
  const catalog = await catalogResponse.json() as { students?: Array<{ id: number; model?: { assetId: string; revision: string; url: string } | null }> }
  const row = catalog.students?.find(student => student.id === studentId)
  assert.equal(row?.model?.assetId, expected.assetId, `Public catalog does not expose the isolated asset for ${studentId}.`)
  assert.equal(row?.model?.revision, expected.checksum, `Public catalog revision mismatch for ${studentId}.`)
  assert.ok(row?.model?.url, `Public catalog has no model URL for ${studentId}.`)
  const artifactResponse = await fetch(new URL(row!.model!.url, origin))
  assert.equal(artifactResponse.status, 200)
  assert.equal(artifactResponse.headers.get('Content-Type'), 'model/gltf-binary')
  const bytes = Buffer.from(await artifactResponse.arrayBuffer())
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.bytesHash)
  await page.goto(`${origin}/3D?student=${studentId}`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('#chibi-search')
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(value => value.textContent?.includes('Model ready')), { timeout: 60_000 })
  assert.ok((await page.$eval('main', element => element.innerText)).includes(String(studentId)))
}

function requestedPhase(): AcceptancePhase {
  const hasExplicitPhase = process.argv.some(value => value === '--phase' || value.startsWith('--phase='))
  let requested = hasFlag('repeat') ? 'repeat' : 'before-restart'
  const inline = process.argv.find(value => value.startsWith('--phase='))
  if (inline) {
    requested = inline.slice('--phase='.length).trim()
  } else {
    const index = process.argv.indexOf('--phase')
    if (index >= 0) {
      const candidate = process.argv[index + 1]?.trim()
      assert.ok(candidate && !candidate.startsWith('--'), '--phase requires a value.')
      requested = candidate
    }
  }
  const phase = assertAcceptancePhase(requested)
  if (hasFlag('repeat') && hasExplicitPhase && phase !== 'repeat') throw new Error('--repeat is only compatible with --phase repeat.')
  return phase
}

function requestedRoster(): AcceptanceRosterPlan {
  const inline = process.argv.find(value => value.startsWith('--roster='))
  let requested: string | undefined
  if (inline) {
    requested = inline.slice('--roster='.length).trim()
  } else {
    const index = process.argv.indexOf('--roster')
    if (index >= 0) {
      const candidate = process.argv[index + 1]?.trim()
      assert.ok(candidate && !candidate.startsWith('--'), '--roster requires a value.')
      requested = candidate
    }
  }
  const mode = assertAcceptanceRosterMode(requested || process.env.CHIBI_ACCEPTANCE_ROSTER)
  return acceptanceRosterPlan(mode)
}

function selectedStudentId(roster: AcceptanceRosterPlan) {
  const fallback = roster.students[0]?.id
  assert.ok(fallback !== undefined, 'The selected acceptance roster is empty.')
  const studentId = integerOption('student-id', fallback)
  assert.ok(roster.students.some(student => student.id === studentId), `Student ${studentId} is not in the selected ${roster.mode} acceptance roster.`)
  return studentId
}

function isMissingFile(error: unknown) {
  return error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
}

async function readCheckpoint(context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>, phase: AcceptanceCheckpoint['phase'], roster: AcceptanceRosterPlan, studentId: number) {
  const file = checkpointPath(context.dataDir, phase)
  let raw: string
  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Acceptance checkpoint is not valid JSON: ${file}`)
  }
  return assertCheckpointState(parsed, {
    phase,
    dataDir: context.dataDir,
    sourceDir: context.sourceDir,
    databaseName: context.database.databaseName,
    schema: acceptanceDatabaseScope(context.database),
    rosterMode: roster.mode,
    rosterVersion: roster.version,
    rosterChecksum: roster.checksum,
    studentId,
  })
}

async function requireCheckpoint(context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>, phases: AcceptanceCheckpoint['phase'][], roster: AcceptanceRosterPlan, studentId: number) {
  for (const phase of phases) {
    const checkpoint = await readCheckpoint(context, phase, roster, studentId)
    if (checkpoint) return checkpoint
  }
  throw new Error('No acceptance checkpoint exists below CHIBI_DATA_DIR. Run --run --phase before-restart first, then restart services before --phase after-restart.')
}

function recoveryProvenancePath(context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>) {
  return path.join(path.dirname(checkpointPath(context.dataDir, 'before-restart')), 'before-restart-provenance.json')
}

function isWithinPath(parent: string, candidate: string) {
  const relative = path.relative(parent, candidate)
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
}

export async function snapshotEvidenceFiles(evidenceRootInput: string, dataDirInput: string, evidencePaths: readonly string[]): Promise<ResumeEvidenceReference[]> {
  assert.ok(evidencePaths.length > 0, 'At least one resume evidence file is required.')
  const evidenceRoot = path.resolve(evidenceRootInput)
  assertOutsideRepository('Resume evidence root', assertOutsideNormalRoots('Resume evidence root', evidenceRoot))
  const rootStat = await lstat(evidenceRoot)
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Resume evidence root must be a real directory.')
  const physicalRoot = await realpath(evidenceRoot)
  assertOutsideRepository('Resume evidence root', assertOutsideNormalRoots('Resume evidence root', physicalRoot))
  const physicalDataDir = await realpath(dataDirInput)
  assert.ok(isWithinPath(physicalRoot, physicalDataDir), 'Resume evidence root must contain the isolated CHIBI_DATA_DIR.')
  const references: ResumeEvidenceReference[] = []
  for (const inputPath of evidencePaths) {
    const target = path.resolve(inputPath)
    assert.ok(isWithinPath(evidenceRoot, target), 'Resume evidence references must stay below the isolated evidence root.')
    const before = await lstat(target)
    assert.ok(before.isFile() && !before.isSymbolicLink() && before.nlink <= 1, 'Resume evidence references must be private regular files, not links.')
    const physicalTarget = await realpath(target)
    assert.ok(isWithinPath(physicalRoot, physicalTarget), 'Resume evidence reference resolves outside the isolated evidence root.')
    const bytes = await readFile(physicalTarget)
    const after = await lstat(physicalTarget)
    assert.ok(after.isFile() && !after.isSymbolicLink() && after.nlink <= 1, 'Resume evidence file changed type while it was being hashed.')
    assert.equal(after.size, bytes.length, 'Resume evidence file changed size while it was being hashed; retry after it is stable.')
    assert.equal(after.mtimeMs, before.mtimeMs, 'Resume evidence file changed while it was being hashed; retry after it is stable.')
    references.push({ path: physicalTarget, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  return references
}

async function snapshotResumeEvidence(
  context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>,
  options: ResumeRecoveryOptions,
): Promise<ResumeEvidenceReference[]> {
  if (options.evidencePaths.length === 0) return []
  assert.ok(options.evidenceRoot, '--resume-evidence-root is required when evidence references are supplied.')
  return snapshotEvidenceFiles(options.evidenceRoot, context.dataDir, options.evidencePaths)
}

type LoadedV12SourceMotionProof = {
  verified: VerifiedV12SourceMotionProof
  evidenceReference: ResumeEvidenceReference
}

async function loadV12SourceMotionProof(
  context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>,
  expectedReportSha256: string,
  evidenceReferences: readonly ResumeEvidenceReference[],
  persistedReference?: SourceMotionProofReference,
): Promise<LoadedV12SourceMotionProof> {
  assert.equal(context.database.databaseName, V12_DATABASE_NAME, 'Source-motion proof is restricted to the exact v12 isolated database.')
  assert.equal(path.resolve(context.dataDir).toLowerCase(), path.resolve(V12_RUN_ROOT, 'data').toLowerCase(), 'Source-motion proof is restricted to the exact v12 isolated data root.')
  const target = path.resolve(V12_SOURCE_MOTION_PROOF_PATH)
  assert.equal(path.resolve(target).toLowerCase(), path.resolve(V12_RUN_ROOT, 'evidence', 'chibi-v12-source-motion-proof-v2.json').toLowerCase(), 'Source-motion proof target differs from the pinned v12 report path.')
  const evidenceReference = evidenceReferences.find(reference => path.resolve(reference.path).toLowerCase() === target.toLowerCase())
  assert.ok(evidenceReference, 'Pinned v12 source-motion proof is missing from hash-only evidence references.')
  const before = await lstat(target)
  assert.ok(before.isFile() && !before.isSymbolicLink() && before.nlink <= 1, 'Source-motion proof must be a private regular file, not a link.')
  const bytes = await readFile(target)
  const after = await lstat(target)
  assert.ok(after.isFile() && !after.isSymbolicLink() && after.nlink <= 1, 'Source-motion proof changed type while it was being read.')
  assert.equal(after.size, bytes.length, 'Source-motion proof changed size while it was being read.')
  assert.equal(after.mtimeMs, before.mtimeMs, 'Source-motion proof changed while it was being read.')
  const fileSha256 = createHash('sha256').update(bytes).digest('hex')
  assert.equal(evidenceReference!.bytes, bytes.length, 'Source-motion proof byte count differs from its hash-only evidence reference.')
  assert.equal(evidenceReference!.sha256.toLowerCase(), fileSha256, 'Source-motion proof file hash differs from its hash-only evidence reference.')
  if (persistedReference) {
    assertSourceMotionProofReference(persistedReference, evidenceReferences)
    assert.equal(persistedReference.bytes, bytes.length, 'Source-motion proof byte count differs from recovery provenance.')
    assert.equal(persistedReference.sha256.toLowerCase(), fileSha256, 'Source-motion proof file hash differs from recovery provenance.')
    assert.equal(persistedReference.reportSha256.toLowerCase(), expectedReportSha256.toLowerCase(), 'Approved source-motion report SHA differs from recovery provenance.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error('Pinned v12 source-motion proof is not valid JSON.')
  }
  const verified = assertV12SourceMotionProofReport(parsed, expectedReportSha256, context.database.databaseName)
  assert.equal(verified.schemaVersion, 2, 'Pinned v12 resume path accepts only the immutable v2 source-motion proof.')
  if (persistedReference) {
    assert.deepEqual(persistedReference.consumedRows, [...persistedReference.consumedRows].sort(), 'Recovery provenance source-motion action rows are not deterministic.')
    assert.ok(persistedReference.consumedRows.every(key => verified.rowsByKey.has(key)), 'Recovery provenance names a source-motion action row outside the verified report.')
    for (const attestation of persistedReference.consumedProofs) {
      const row = verified.rowsByKey.get(attestation.key)!
      assert.equal(attestation.proofStatus, row.proofStatus, 'Recovery provenance source-motion status differs from the verified report.')
      const dispositions = dispositionCounts(row)
      assert.deepEqual(attestation.trackDispositions, dispositions, 'Recovery provenance source-motion track dispositions differ from the verified report.')
    }
  }
  return { verified, evidenceReference: evidenceReference! }
}

async function readRecoveryProvenance(context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>) {
  const file = recoveryProvenancePath(context)
  try {
    const fileStat = await lstat(file)
    assert.ok(fileStat.isFile() && !fileStat.isSymbolicLink() && fileStat.nlink <= 1, 'Recovery provenance must be a private regular file, not a link to another path.')
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    throw new Error(`Acceptance recovery provenance is not valid JSON: ${file}`)
  }
  return assertRecoveryProvenance(parsed)
}

async function writeRecoveryProvenance(
  context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>,
  jobId: string,
  options: { originalTimeoutMs: number | null; resumeWaitTimeoutMs: number; evidenceReferences: ResumeEvidenceReference[]; sourceMotionProof?: SourceMotionProofReference },
) {
  const file = recoveryProvenancePath(context)
  const directory = path.dirname(file)
  await mkdir(directory, { recursive: true })
  const directoryStat = await lstat(directory)
  assert.ok(directoryStat.isDirectory() && !directoryStat.isSymbolicLink(), 'Acceptance provenance directory must be a real directory below CHIBI_DATA_DIR.')
  try {
    const existing = await lstat(file)
    assert.ok(existing.isFile() && !existing.isSymbolicLink() && existing.nlink <= 1, 'Recovery provenance must be a private regular file, not a link to another path.')
    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(file, 'utf8'))
    } catch {
      throw new Error(`Acceptance recovery provenance is not valid JSON: ${file}`)
    }
    const existingProvenance = assertRecoveryProvenance(parsed, jobId)
    if (existingProvenance.version === 1) {
      assert.ok(options.originalTimeoutMs === null && options.evidenceReferences.length === 0 && !options.sourceMotionProof, 'Existing legacy recovery provenance lacks the requested timeout/evidence fields; refusing to overwrite it.')
      return existingProvenance
    }
    assert.equal(existingProvenance.originalTimeoutMs, options.originalTimeoutMs, 'Existing recovery provenance records a different original timeout; refusing to overwrite it.')
    assert.equal(existingProvenance.resumeWaitTimeoutMs, options.resumeWaitTimeoutMs, 'Existing recovery provenance records a different resume wait timeout; refusing to overwrite it.')
    assert.deepEqual(existingProvenance.evidenceReferences, options.evidenceReferences, 'Existing recovery provenance records different evidence references; refusing to overwrite it.')
    if (options.sourceMotionProof) {
      assert.equal(existingProvenance.version, 4, 'Existing recovery provenance lacks the source-motion proof attestation; refusing to overwrite it.')
      assert.deepEqual(existingProvenance.sourceMotionProof, options.sourceMotionProof, 'Existing recovery provenance records a different source-motion proof attestation; refusing to overwrite it.')
    } else {
      assert.notEqual(existingProvenance.version, 4, 'Existing recovery provenance contains an unexpected source-motion proof attestation.')
    }
    return existingProvenance
  } catch (error) {
    if (!isMissingFile(error)) throw error
  }
  const provenance = createRecoveryProvenance(jobId, new Date().toISOString(), options)
  await writeFile(file, `${JSON.stringify(provenance, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  return provenance
}

async function writeCheckpoint(
  context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>,
  phase: AcceptanceCheckpoint['phase'],
  roster: AcceptanceRosterPlan,
  studentId: number,
  artifact: AcceptanceCheckpoint['artifact'],
  jobId?: string,
  requireAbsent = false,
) {
  assert.ok(context.sourceDir, 'CHIBI_SOURCE_DIR is required for an acceptance checkpoint.')
  const state: AcceptanceCheckpoint = {
    version: 1,
    phase,
    ...(jobId ? { jobId } : {}),
    dataDir: path.resolve(context.dataDir),
    sourceDir: path.resolve(context.sourceDir),
    databaseName: context.database.databaseName,
    schema: acceptanceDatabaseScope(context.database),
    rosterMode: roster.mode,
    rosterVersion: roster.version,
    rosterChecksum: roster.checksum,
    studentId,
    artifact,
  }
  const validated = assertCheckpointState(state, {
    phase,
    dataDir: context.dataDir,
    sourceDir: context.sourceDir,
    databaseName: context.database.databaseName,
    schema: acceptanceDatabaseScope(context.database),
    rosterMode: roster.mode,
    rosterVersion: roster.version,
    rosterChecksum: roster.checksum,
    studentId,
  })
  const file = checkpointPath(context.dataDir, phase)
  const directory = path.dirname(file)
  await mkdir(directory, { recursive: true })
  const directoryStat = await lstat(directory)
  assert.ok(directoryStat.isDirectory() && !directoryStat.isSymbolicLink(), 'Acceptance checkpoint directory must be a real directory below CHIBI_DATA_DIR.')
  try {
    const existing = await lstat(file)
    assert.ok(!requireAbsent, 'Refusing to overwrite an acceptance checkpoint created during recovery.')
    assert.ok(existing.isFile() && !existing.isSymbolicLink() && existing.nlink <= 1, 'Acceptance checkpoint must be a private regular file, not a link to another path.')
  } catch (error) {
    if (!isMissingFile(error)) throw error
  }
  if (requireAbsent) await writeFile(file, `${JSON.stringify(validated, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  else await writeFile(file, `${JSON.stringify(validated, null, 2)}\n`, 'utf8')
  return { file, state: validated }
}

async function assertWorkerReady(page: Page, origin: string) {
  const status = await page.evaluate(async base => {
    const response = await fetch(`${base}/api/admin/chibi/import/status`)
    const body = await response.json() as { ready?: boolean; readiness?: { ready?: boolean }; workers?: Array<{ online?: boolean; readiness?: { ready?: boolean } }> }
    return { status: response.status, body }
  }, origin)
  assert.equal(status.status, 200, `Chibi worker status endpoint returned HTTP ${status.status}.`)
  assert.equal(status.body.ready, true, 'The restarted Chibi worker is not ready; inspect its doctor/readiness diagnostics before continuing.')
  assert.equal(status.body.readiness?.ready, true, 'The restarted Chibi worker readiness report is not ready.')
  assert.equal(status.body.workers?.filter(worker => worker.online && worker.readiness?.ready).length, 1, 'Acceptance requires exactly one online ready Chibi worker.')
}

async function runSelectiveRebuildGate(context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>) {
  const result = {
    phase: 'selective-rebuild',
    status: 'unmet',
    sourceDir: context.sourceDir,
    dataDir: context.dataDir,
    reason: 'No deterministic disposable BAAD mirror or controlled source-mutation fixture is shipped. The supplied BAAD tree is read-only and is never mutated by this harness.',
  }
  console.log(JSON.stringify(result, null, 2))
  throw new Error('Selective rebuild acceptance gate is unmet; no source mutation was attempted.')
}

async function runAcceptancePhased(context: Awaited<ReturnType<typeof assertAcceptanceEnvironment>>, phase: AcceptancePhase, roster: AcceptanceRosterPlan, resumeOptions: ResumeRecoveryOptions) {
  const resumeJobId = resumeOptions.jobId
  assertExplicitOptIn(process.argv, process.env)
  assert.equal(process.env.CHIBI_TEST_ISOLATED, 'true', 'Run mode requires CHIBI_TEST_ISOLATED=true.')
  if (phase === 'before-restart' || phase === 'repeat') assert.equal(process.env.CHIBI_TEST_TRIGGER_IMPORT, 'true', 'Importing phases require CHIBI_TEST_TRIGGER_IMPORT=true.')
  assert.ok(process.env.CHIBI_TEST_DATABASE_URL && process.env.CHIBI_TEST_DATABASE_URL === process.env.DATABASE_URL, 'Run mode requires CHIBI_TEST_DATABASE_URL to match the app DATABASE_URL.')
  if (phase === 'selective-rebuild') return runSelectiveRebuildGate(context)
  const origin = localOrigin()
  const studentId = selectedStudentId(roster)
  const beforeCheckpoint = phase === 'before-restart' ? null : await requireCheckpoint(context, ['before-restart'], roster, studentId)
  const versionContract = renderingVersionContractForPhase(phase, resumeJobId ?? beforeCheckpoint?.jobId ?? null)
  assertKnownBlockerAcknowledgement(roster, process.env, versionContract)
  const resumeWaitTimeoutMs = resumeJobId ? timeoutOption() : null
  const evidenceReferences = resumeJobId ? await snapshotResumeEvidence(context, resumeOptions) : []
  const beforeRestartMotionProof = resumeJobId === V12_TERMINAL_RESUME_JOB_ID
    ? await loadV12SourceMotionProof(context, resumeOptions.sourceMotionProofSha256!, evidenceReferences)
    : null
  const prisma = databaseClient()
  let browser: Browser | null = null
  let page: Page | null = null
  try {
    assert.ok(context.sourceDir, 'CHIBI_SOURCE_DIR is required for acceptance.')
    if (phase === 'before-restart') {
      if (resumeJobId) {
        assert.equal(await readCheckpoint(context, 'before-restart', roster, studentId), null, 'Cannot resume because a before-restart checkpoint already exists.')
        await assertResumableDatabase(prisma, resumeJobId, roster.students, studentId)
      } else {
        const beforeEntries = await outputEntries(context.dataDir)
        assert.deepEqual(beforeEntries, [], 'Acceptance output must be empty before the first Admin import.')
        await assertDatabaseIsClean(prisma, roster.students, studentId)
      }
      browser = await puppeteer.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
      page = await loginAndOpenChibi(browser, origin)
      if (!resumeJobId) assert.deepEqual(await outputEntries(context.dataDir), [], 'Starting the app and opening Admin must not generate chibi output.')
      await assertWorkerReady(page, origin)
      let first: { jobId: string; job: JobResponse }
      if (resumeJobId) {
        const attached = await fetchJobProgress(page, origin, resumeJobId)
        assertResumableJobIdentity(resumeJobId, attached.job)
        assert.equal(attached.total, roster.students.length, `Import job ${resumeJobId} does not cover the selected deterministic roster.`)
        console.log(JSON.stringify({ phase, recoveryAttachment: { jobId: resumeJobId, mode: attached.job.mode, status: attached.job.status, stage: attached.job.stage, total: attached.total, processed: attached.job.processed } }, null, 2))
        first = { jobId: resumeJobId, job: TERMINAL_JOB_STATES.has(attached.job.status) ? await fetchJob(page, origin, resumeJobId) : await waitForJob(page, origin, resumeJobId, resumeWaitTimeoutMs!) }
      } else {
        first = await clickImport(page, origin)
      }
      if (resumeJobId) assertResumableJobIdentity(resumeJobId, first.job.job)
      const firstOutcome = assertTerminalOutcome(first.job, roster, studentId, versionContract)
      assert.equal(first.jobId, first.job.job.id, 'The observed first import job id differs from its terminal job record.')
      const firstArtifacts = await snapshotSuccessfulRosterArtifacts(prisma, context.dataDir, first.job, roster, firstOutcome, versionContract, beforeRestartMotionProof?.verified)
      const firstArtifact = firstArtifacts.get(studentId)
      assert.ok(firstArtifact, `Selected student ${studentId} must be a successful/published item in ${roster.mode} acceptance.`)
      assert.equal(firstOutcome.target.assetId, firstArtifact!.assetId)
      await assertPublicCatalogDelivery(origin, roster, firstArtifacts, firstOutcome.allowedUnavailable, firstOutcome.knownBlocked)
      await assertPublicDelivery(origin, studentId, firstArtifact, page)
      let sourceMotionProofReference: SourceMotionProofReference | undefined
      if (beforeRestartMotionProof) {
        const consumedRows = [...beforeRestartMotionProof.verified.consumedRows].sort()
        assert.ok(consumedRows.length > 0, 'The pinned v12 source-motion report was not consumed by any zero-delta structural equipment assertion.')
        assert.deepEqual(consumedRows, [...beforeRestartMotionProof.verified.rowsByKey.keys()].sort(), 'The pinned v12 source-motion report contains action rows not consumed by the exact terminal artifact assertions.')
        const consumedProofs = consumedRows.map(key => beforeRestartMotionProof!.verified.consumedProofs.get(key)!)
        assert.equal(consumedProofs.length, consumedRows.length, 'Source-motion proof provenance is missing a consumed proof status.')
        sourceMotionProofReference = {
          ...beforeRestartMotionProof.evidenceReference,
          reportSha256: beforeRestartMotionProof.verified.reportSha256,
          schemaVersion: 2,
          policyVersion: V12_SOURCE_MOTION_PROOF_POLICY,
          contentVerified: true,
          consumedRows,
          consumedProofs,
        }
      }
      const recoveryProvenance = resumeJobId ? await writeRecoveryProvenance(context, resumeJobId, {
        originalTimeoutMs: resumeOptions.originalTimeoutMs,
        resumeWaitTimeoutMs: resumeWaitTimeoutMs!,
        evidenceReferences,
        sourceMotionProof: sourceMotionProofReference,
      }) : null
      const checkpoint = await writeCheckpoint(context, 'before-restart', roster, studentId, firstArtifact, first.jobId, Boolean(resumeJobId))
      console.log(JSON.stringify({
        phase,
        origin,
        database: context.database.databaseName,
        sourceDir: context.sourceDir,
        dataDir: context.dataDir,
        roster: { mode: roster.mode, version: roster.version, checksum: roster.checksum, eligibleCount: roster.students.length },
        first: { jobId: first.jobId, status: first.job.job.status, itemStatus: firstOutcome.target.status, artifact: firstArtifact, validatedItems: firstArtifacts.size, allowedUnavailable: firstOutcome.allowedUnavailable, knownBlocked: firstOutcome.knownBlocked },
        checkpoint: checkpoint.file,
        recovery: recoveryProvenance,
        next: 'Stop and restart the app and exactly one worker, then run --run --phase after-restart with the same isolated variables.',
      }, null, 2))
      return
    }

    assert.ok(beforeCheckpoint, 'A before-restart checkpoint is required for this acceptance phase.')
    const recoveryProvenance = await readRecoveryProvenance(context)
    const firstJobId = recoveryProvenance?.jobId ?? beforeCheckpoint.jobId
    assert.ok(firstJobId, 'The before-restart run does not pin its exact import job id; refusing restart or repeat acceptance.')
    if (beforeCheckpoint.jobId) assert.equal(firstJobId, beforeCheckpoint.jobId, 'Recovery provenance and before-restart checkpoint refer to different jobs.')
    if (phase === 'repeat') assertRepeatImportAllowed(firstJobId)
    let afterRestartMotionProof: LoadedV12SourceMotionProof | null = null
    if (firstJobId === V12_TERMINAL_RESUME_JOB_ID) {
      assert.equal(recoveryProvenance?.version, 4, 'The v12 after-restart phase requires separately verified source-motion proof provenance.')
      const proofProvenance = recoveryProvenance as AcceptanceRecoveryProvenanceWithMotionProof
      afterRestartMotionProof = await loadV12SourceMotionProof(context, proofProvenance.sourceMotionProof.reportSha256,
        proofProvenance.evidenceReferences, proofProvenance.sourceMotionProof)
    }
    const checkpoint = phase === 'after-restart'
      ? beforeCheckpoint
      : await requireCheckpoint(context, ['after-restart'], roster, studentId)
    if (phase === 'repeat') {
      const repeatCheckpoint = await readCheckpoint(context, 'repeat', roster, studentId)
      assertRepeatCheckpointChain(beforeCheckpoint, checkpoint, repeatCheckpoint)
      if (recoveryProvenance) assert.equal(checkpoint.jobId, recoveryProvenance.jobId, 'After-restart checkpoint and recovery provenance refer to different first jobs.')
    }
    await assertOnlyExpectedJob(prisma, firstJobId)
    const current = await snapshotActiveRosterBindings(prisma, context.dataDir, roster, versionContract, afterRestartMotionProof?.verified)
    if (afterRestartMotionProof) {
      const provenanceRows = (recoveryProvenance as AcceptanceRecoveryProvenanceWithMotionProof).sourceMotionProof.consumedRows
      assert.deepEqual([...afterRestartMotionProof.verified.consumedRows].sort(), provenanceRows, 'After-restart source-motion proof consumption differs from before-restart provenance.')
      assert.deepEqual(provenanceRows.map(key => afterRestartMotionProof!.verified.consumedProofs.get(key)),
        (recoveryProvenance as AcceptanceRecoveryProvenanceWithMotionProof).sourceMotionProof.consumedProofs,
        'After-restart source-motion proof status/disposition consumption differs from before-restart provenance.')
    }
    const currentArtifact = current.artifacts.get(studentId)
    assert.ok(currentArtifact, `Selected student ${studentId} has no active published artifact after restart.`)
    for (const [boundStudentId, artifact] of current.artifacts) await assertPersistedTerminalJob(prisma, boundStudentId, artifact.assetId, firstJobId)
    assert.deepEqual(currentArtifact, checkpoint.artifact, `Persisted ${phase} binding/artifact differs from the before-restart checkpoint.`)
    browser = await puppeteer.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
    page = await loginAndOpenChibi(browser, origin)
    if (phase === 'after-restart') {
      await assertWorkerReady(page, origin)
      await assertPublicCatalogDelivery(origin, roster, current.artifacts, current.allowedUnavailable, current.knownBlocked)
      await assertPublicDelivery(origin, studentId, currentArtifact, page)
      const afterCheckpoint = await writeCheckpoint(context, 'after-restart', roster, studentId, currentArtifact, firstJobId)
      console.log(JSON.stringify({ phase, origin, database: context.database.databaseName, sourceDir: context.sourceDir, dataDir: context.dataDir, roster: { mode: roster.mode, version: roster.version, checksum: roster.checksum, eligibleCount: roster.students.length }, artifact: currentArtifact, validatedItems: current.artifacts.size, allowedUnavailable: current.allowedUnavailable, knownBlocked: current.knownBlocked, checkpoint: afterCheckpoint.file, recovery: recoveryProvenance, restartPersistence: 'verified' }, null, 2))
      return
    }

    await assertWorkerReady(page, origin)
    const assetCountBefore = await prisma.chibiAsset.count()
    const second = await clickImport(page, origin)
    assert.notEqual(second.jobId, firstJobId, 'Repeat Import / Update did not create a new job distinct from the pinned first job.')
    assert.equal(second.jobId, second.job.job.id, 'The observed repeat job id differs from its terminal job record.')
    const secondOutcome = assertTerminalOutcome(second.job, roster, studentId, versionContract)
    const secondArtifacts = await snapshotSuccessfulRosterArtifacts(prisma, context.dataDir, second.job, roster, secondOutcome, versionContract)
    assert.deepEqual(secondOutcome.knownBlocked, current.knownBlocked, 'Repeat import changed the versioned blocked-row status, source identity, fingerprint, or diagnostic.')
    for (const item of secondOutcome.successful) {
      assert.ok(['skipped', 'reused'].includes(item.status), `Repeat Import / Update must skip or reuse student ${item.studentId}; got ${item.status}.`)
      assert.deepEqual(secondArtifacts.get(item.studentId), current.artifacts.get(item.studentId), `Repeat import changed student ${item.studentId}'s active artifact or checksum.`)
    }
    const secondArtifact = secondArtifacts.get(studentId)
    assert.ok(secondArtifact, `Selected student ${studentId} has no repeat artifact.`)
    assert.deepEqual(secondArtifact, checkpoint.artifact, 'Repeat import changed the selected active artifact or checksum.')
    assert.equal(await prisma.chibiAsset.count(), assetCountBefore, 'Repeat import created a duplicate asset revision.')
    await assertPublicCatalogDelivery(origin, roster, secondArtifacts, secondOutcome.allowedUnavailable, secondOutcome.knownBlocked)
    await assertPublicDelivery(origin, studentId, secondArtifact, page)
    const repeatCheckpoint = await writeCheckpoint(context, 'repeat', roster, studentId, secondArtifact, second.jobId)
    console.log(JSON.stringify({
      phase,
      origin,
      database: context.database.databaseName,
      sourceDir: context.sourceDir,
      dataDir: context.dataDir,
      roster: { mode: roster.mode, version: roster.version, checksum: roster.checksum, eligibleCount: roster.students.length },
      repeat: { jobId: second.jobId, status: second.job.job.status, itemStatus: secondOutcome.target.status, artifact: secondArtifact, validatedItems: secondArtifacts.size, allowedUnavailable: secondOutcome.allowedUnavailable, knownBlocked: secondOutcome.knownBlocked },
      checkpoint: repeatCheckpoint.file,
      recovery: recoveryProvenance,
      reuse: 'verified',
    }, null, 2))
  } finally {
    await page?.close()
    await browser?.close()
    await prisma.$disconnect()
  }
}

async function main() {
  if (hasFlag('help')) {
    console.log('Dry preflight by default. Select --roster pilot for the explicit Haruna pilot or --roster full for the committed 275-row catalog snapshot. Use --run --phase before-restart for the first Admin import; only to attach to that exact existing Import / Update job without clicking again, use --run --phase before-restart --resume-job-id <job-id>. The exact historical v12 resume additionally requires --resume-source-motion-proof-sha256 <approved-report-sha256> and the pinned report among --resume-evidence-ref values under --resume-evidence-root. Optional --resume-original-timeout-ms records the caller-reported original wait budget; repeat --resume-evidence-ref <absolute-file> with --resume-evidence-root <isolated-run-root> to record local evidence file hashes. --timeout-ms independently controls this invocation\'s wait budget. Use --run --phase after-restart after manually restarting app/worker, --run --phase repeat for reuse, or --run --phase selective-rebuild to record the currently unmet source-change gate.')
    return
  }
  const phase = requestedPhase()
  const resumeOptions = resumeRecoveryOptions(process.argv, phase)
  const resumeJobId = resumeOptions.jobId
  if (resumeJobId) assert.ok(hasFlag('run'), '--resume-job-id requires --run; it cannot be used for dry preflight.')
  const roster = requestedRoster()
  const context = assertAcceptanceEnvironment({
    sourceDir: process.env.CHIBI_SOURCE_DIR,
    dataDir: process.env.CHIBI_DATA_DIR,
    toolsDir: process.env.CHIBI_TOOLS_DIR,
    databaseUrl: process.env.DATABASE_URL,
  })
  assert.equal(process.env.CHIBI_SOURCE_READ_ONLY, 'true', 'Set CHIBI_SOURCE_READ_ONLY=true only after the supplied BAAD tree is mounted or ACL-protected read-only.')
  await assertBaadSource(context.sourceDir!)
  if (phase === 'before-restart' && !resumeJobId) await assertOutputEmpty(context.dataDir)
  if (!hasFlag('run')) {
    console.log(JSON.stringify({ mode: 'preflight', phase, roster: { mode: roster.mode, version: roster.version, checksum: roster.checksum, eligibleCount: roster.students.length, source: roster.source, eligibility: roster.eligibility }, projectRoot: ACCEPTANCE_PROJECT_ROOT, sourceDir: context.sourceDir, dataDir: context.dataDir, toolsDir: context.toolsDir, database: context.database.databaseName, schema: acceptanceDatabaseScope(context.database), maintenance: process.env.MAINTENANCE_SCHEDULER, output: phase === 'before-restart' ? 'empty' : 'not-checked', next: 'Start exactly one app and worker, then set CHIBI_ACCEPTANCE_RUN=true, keep --roster pilot (or the audited full snapshot mode), and pass --run --phase before-restart. After the manual restart, use --phase after-restart, then --phase repeat.' }, null, 2))
    return
  }
  await runAcceptancePhased(context, phase, roster, resumeOptions)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
}
