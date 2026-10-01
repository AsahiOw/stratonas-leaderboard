import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertRepeatImportAllowed,
  assertEmbeddedCharacterContract,
  assertKnownBlockerAcknowledgement,
  assertRecoveryProvenance,
  assertResumableJobIdentity,
  assertV12SourceMotionProofReport,
  assertTerminalOutcome,
  createRecoveryProvenance,
  resumeJobIdOption,
  resumeRecoveryOptions,
  renderingVersionContractForPhase,
  snapshotEvidenceFiles,
  sourceMotionProofPathSha256,
  sourceMotionProofReportSha256,
  timeoutMsOption,
  V12_ACCEPTANCE_ASSET_SELECT,
  V12_ACCEPTANCE_BINDING_SELECT,
  V12_ACCEPTANCE_IMPORT_ITEM_SELECT,
  v12ResumeRenderingVersionContract,
} from './test-chibi-acceptance'
import { policyGatedComparisonForSamples } from './chibi-v12-motion-proof'
import { verifyApprovedHanaeBodyRoleWitness } from './chibi-v12-body-role-witness'
import { HANAE_BODY_ROLE_REVIEW_PINS } from './chibi-v12-body-role-review'
import { acceptanceRosterPlan } from './chibi-acceptance-roster'
import { CHIBI_RENDERING_POLICY_VERSION, CHIBI_RENDERING_PROFILE_VERSION } from '../src/lib/chibi/rendering-profile'
import blockerSnapshot from './chibi-acceptance-blockers.snapshot.json'

const fullRoster = acceptanceRosterPlan('full')
const v12ResumeJobId = 'cmug1gz1u0000hgkpxt74ocrt'
const v12RenderingVersionContract = v12ResumeRenderingVersionContract(v12ResumeJobId, blockerSnapshot)
const jobShape = {
  id: v12ResumeJobId, mode: 'import', status: 'completed', stage: 'completed', total: fullRoster.students.length,
  processed: fullRoster.students.length, imported: fullRoster.students.length, updated: 0, reused: 0, skipped: 0,
  unavailable: 0, reviewRequired: 0, failed: 0, error: null,
}

test('resume option is exact, single-use, and limited to the before-restart run phase', () => {
  const jobId = 'cmuf4j6fw0000g0kp90stvsrs'
  assert.equal(resumeJobIdOption(['--resume-job-id', jobId], 'before-restart'), jobId)
  assert.equal(resumeJobIdOption([`--resume-job-id=${jobId}`], 'before-restart'), jobId)
  assert.equal(resumeJobIdOption([], 'before-restart'), null)
  assert.throws(() => resumeJobIdOption(['--resume-job-id'], 'before-restart'), /requires a job id/)
  assert.throws(() => resumeJobIdOption(['--resume-job-id', '--run'], 'before-restart'), /requires a job id/)
  assert.throws(() => resumeJobIdOption(['--resume-job-id', jobId, `--resume-job-id=${jobId}`], 'before-restart'), /provided only once/)
  assert.throws(() => resumeJobIdOption(['--resume-job-id', 'bad/id'], 'before-restart'), /exact safe import job id/)
  assert.throws(() => resumeJobIdOption(['--resume-job-id', jobId], 'after-restart'), /only supported for --phase before-restart/)
})

test('legacy resume keeps the 30-minute waiter default and leaves unknown provenance unknown', () => {
  const jobId = 'cmuf4j6fw0000g0kp90stvsrs'
  const options = resumeRecoveryOptions(['--resume-job-id', jobId], 'before-restart')
  assert.equal(options.jobId, jobId)
  assert.equal(options.originalTimeoutMs, null)
  assert.deepEqual(options.evidencePaths, [])
  assert.equal(timeoutMsOption(['--resume-job-id', jobId]), 30 * 60 * 1000)
  const provenance = createRecoveryProvenance(jobId, '2026-09-24T12:00:00.000Z')
  assert.equal(provenance.originalTimeoutMs, null)
  assert.equal(provenance.originalTimeoutSource, 'not-provided')
  assert.equal(provenance.resumeWaitTimeoutMs, 30 * 60 * 1000)
  assert.equal(provenance.originalZeroStateObservation, 'not-verified-by-resume-helper')
  assert.equal(provenance.cleanPreflightMachineVerified, false)
  assert.equal(provenance.cleanPreflightTranscript, 'not-verified-by-resume-helper')
  assert.equal(provenance.evidenceReferenceContentInspected, false)
  assert.equal(assertRecoveryProvenance(provenance, jobId).version, 2)
})

test('v12 resume records the caller-reported 2-hour original budget, local evidence hashes, and independent wait budget', () => {
  const jobId = 'cmug1gz1u0000hgkpxt74ocrt'
  const evidenceRoot = String.raw`D:\Temp\stratonas-chibi-v12-full-acceptance-20260925-6d18e6c8`
  const setupLog = `${evidenceRoot}\\logs\\setup.log`
  const harnessLog = `${evidenceRoot}\\logs\\harness.log`
  const earlyRow = `${evidenceRoot}\\evidence\\early-public-row-10000.json`
  const motionProof = `${evidenceRoot}\\evidence\\chibi-v12-source-motion-proof-v2.json`
  const motionProofSha256 = 'a'.repeat(64)
  const args = [
    '--resume-job-id', jobId,
    '--resume-original-timeout-ms', '7200000',
    '--resume-evidence-root', evidenceRoot,
    '--resume-evidence-ref', setupLog,
    '--resume-evidence-ref', harnessLog,
    '--resume-evidence-ref', earlyRow,
    '--resume-evidence-ref', motionProof,
    '--resume-source-motion-proof-sha256', motionProofSha256,
    '--timeout-ms', '86400000',
  ]
  const options = resumeRecoveryOptions(args, 'before-restart')
  assert.equal(options.jobId, jobId)
  assert.equal(options.originalTimeoutMs, 7200000)
  assert.equal(options.evidenceRoot, evidenceRoot)
  assert.deepEqual(options.evidencePaths, [setupLog, harnessLog, earlyRow, motionProof])
  assert.equal(options.sourceMotionProofSha256, motionProofSha256)
  assert.equal(timeoutMsOption(args), 86400000, 'Resume wait budget must not silently inherit the shorter original import budget.')
  const evidenceReferences = options.evidencePaths.map((value, index) => ({ path: value, bytes: index + 1, sha256: String(index + 1).repeat(64) }))
  const motionEvidenceReference = evidenceReferences.at(-1)!
  const provenance = createRecoveryProvenance(jobId, '2026-09-25T12:00:00.000Z', {
    originalTimeoutMs: options.originalTimeoutMs,
    resumeWaitTimeoutMs: timeoutMsOption(args),
    evidenceReferences,
    sourceMotionProof: {
      ...motionEvidenceReference,
      reportSha256: motionProofSha256,
      schemaVersion: 2,
      policyVersion: 'chibi-v12-source-motion-proof-v2',
      contentVerified: true,
      consumedRows: ['[10018,"bundle:cab:renderer","idle","Fixture_Idle"]'],
      consumedProofs: [{
        key: '[10018,"bundle:cab:renderer","idle","Fixture_Idle"]',
        proofStatus: 'static',
        trackDispositions: { 'preserved-glb': 2 },
      }],
    },
  })
  assert.equal(provenance.originalTimeoutMs, 7200000)
  assert.equal(provenance.originalTimeoutSource, 'operator-supplied')
  assert.equal(provenance.resumeWaitTimeoutMs, 86400000)
  assert.deepEqual(provenance.evidenceReferences, evidenceReferences)
  assert.equal(provenance.evidenceReferenceContentInspected, false)
  assert.equal(provenance.originalZeroStateObservation, 'not-verified-by-resume-helper')
  assert.equal(provenance.cleanPreflightMachineVerified, false)
  assert.equal(provenance.version, 4)
  assert.equal(provenance.sourceMotionProof.contentVerified, true)
  assert.deepEqual(provenance.sourceMotionProof.consumedRows, ['[10018,"bundle:cab:renderer","idle","Fixture_Idle"]'])
  assert.equal(assertRecoveryProvenance(provenance, jobId).version, 4)
  assert.throws(() => assertRecoveryProvenance({ ...provenance, evidenceReferenceContentInspected: true }), /may not claim that evidence contents were interpreted/)
  assert.throws(() => assertRecoveryProvenance(provenance, 'another-job'), /different import job/)
  assert.throws(() => assertRecoveryProvenance({ ...provenance, sourceMotionProof: { ...provenance.sourceMotionProof, contentVerified: false } }, jobId), /independent content verification/)
  assert.throws(() => assertRecoveryProvenance({ ...provenance, sourceMotionProof: { ...provenance.sourceMotionProof, sha256: 'b'.repeat(64) } }, jobId), /match its hash-only evidence reference/)
})

test('existing v1 v11 recovery provenance remains readable without rewriting its recorded caveats', () => {
  const jobId = 'legacy-v11-job'
  const provenance = {
    version: 1,
    phase: 'before-restart',
    jobId,
    resumedAt: '2026-09-24T12:00:00.000Z',
    observedTimeoutReason: 'The original canonical before-restart waiter exited at its default 30-minute timeout before the durable import job reached terminal; no checkpoint was written.',
    originalZeroStateObservation: 'The original invocation reportedly checked zero state before queuing this job, but its transcript/report was not retained; this observation is not machine-verified.',
    authenticationNote: 'Recovery used a newly created disposable admin in the isolated acceptance database because the original session-only credentials were unavailable; the original login was not reused. The generated credentials are not recorded here.',
    cleanPreflightMachineVerified: false,
    cleanPreflightTranscript: 'unavailable',
  }
  assert.equal(assertRecoveryProvenance(provenance, jobId).version, 1)
})

test('resume evidence options are fail-closed and constrained to an explicit isolated root', () => {
  const jobId = 'cmuf4j6fw0000g0kp90stvsrs'
  assert.throws(() => resumeRecoveryOptions(['--resume-original-timeout-ms', '7200000'], 'before-restart'), /require --resume-job-id/)
  assert.throws(() => resumeRecoveryOptions(['--resume-job-id', jobId, '--resume-evidence-ref', 'relative.log'], 'before-restart'), /paths must be absolute/)
  assert.throws(() => resumeRecoveryOptions(['--resume-job-id', jobId, '--resume-evidence-root', String.raw`D:\Temp\run`], 'before-restart'), /requires at least one/)
  assert.throws(() => resumeRecoveryOptions(['--resume-job-id', jobId, '--resume-evidence-root', String.raw`D:\Temp\run`, '--resume-evidence-ref', String.raw`D:\Temp\run\a.log`, '--resume-evidence-ref', String.raw`D:\Temp\run\a.log`], 'before-restart'), /duplicate paths/)
  assert.throws(() => resumeRecoveryOptions(['--resume-job-id', 'cmuf4j6fw0000g0kp90stvsrs', '--resume-source-motion-proof-sha256', 'a'.repeat(64)], 'before-restart'), /may not be used for another job/)
  assert.throws(() => resumeRecoveryOptions(['--resume-job-id', v12ResumeJobId, '--resume-source-motion-proof-sha256', 'bad'], 'before-restart'), /must be a SHA-256 digest/)
})

test('resume evidence snapshots hash regular files under the isolated run root without interpreting contents', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chibi-acceptance-evidence-'))
  try {
    const dataDir = path.join(root, 'data')
    const logsDir = path.join(root, 'logs')
    await mkdir(dataDir)
    await mkdir(logsDir)
    const logPath = path.join(logsDir, 'setup.log')
    const contents = 'durable isolated-run evidence\n'
    await writeFile(logPath, contents, 'utf8')
    const [reference] = await snapshotEvidenceFiles(root, dataDir, [logPath])
    assert.equal(reference.path, await realpath(logPath))
    assert.equal(reference.bytes, Buffer.byteLength(contents))
    assert.equal(reference.sha256, createHash('sha256').update(contents).digest('hex'))
    const outsidePath = path.join(path.dirname(root), `${path.basename(root)}-outside.log`)
    await writeFile(outsidePath, contents, 'utf8')
    try {
      await assert.rejects(snapshotEvidenceFiles(root, dataDir, [outsidePath]), /stay below the isolated evidence root/)
    } finally {
      await rm(outsidePath, { force: true })
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('resume identity remains bound to the exact update job', () => {
  const jobId = 'cmuf4j6fw0000g0kp90stvsrs'
  assert.doesNotThrow(() => assertResumableJobIdentity(jobId, { id: jobId, mode: 'update' }))
  assert.throws(() => assertResumableJobIdentity(jobId, { id: 'another-job', mode: 'update' }), /different job/)
  assert.throws(() => assertResumableJobIdentity(jobId, { id: jobId, mode: 'import' }), /Import \/ Update job/)
})

type TestItem = { id: string; studentId: number; stage: string; status: string; diagnostic: string | null; sourceIdentity?: string | null; fingerprint?: string | null; assetId: string | null }

function item(studentId: number, status = 'imported', overrides: Partial<TestItem> = {}): TestItem {
  return { id: `item-${studentId}`, studentId, stage: 'complete', status, diagnostic: null, assetId: `asset-${studentId}`, ...overrides }
}

function job(items: TestItem[]) {
  return {
    job: {
      ...jobShape,
      total: items.length,
      processed: items.length,
      imported: items.filter(value => value.status === 'imported').length,
      updated: items.filter(value => value.status === 'updated').length,
      reused: items.filter(value => value.status === 'reused').length,
      skipped: items.filter(value => value.status === 'skipped').length,
      unavailable: items.filter(value => value.status === 'unavailable').length,
      reviewRequired: items.filter(value => value.status === 'review-required').length,
      failed: items.filter(value => value.status === 'failed').length,
    },
    items,
    total: items.length,
  } as Parameters<typeof assertTerminalOutcome>[0]
}

const knownBlockedRows = blockerSnapshot.rows as Array<{
  studentId: number
  sourceIdentity: string | null
  itemFingerprint: string | null
  expectedStatus: 'unavailable' | 'review-required'
  diagnostic: string
}>

function knownBlockedItem(row: (typeof knownBlockedRows)[number]) {
  return item(row.studentId, row.expectedStatus, {
    assetId: null,
    diagnostic: row.diagnostic,
    sourceIdentity: row.sourceIdentity,
    fingerprint: row.itemFingerprint,
  })
}

function fullMixedItems() {
  const blockedByStudent = new Map(knownBlockedRows.map(row => [row.studentId, row]))
  return fullRoster.students.map(student => blockedByStudent.has(student.id) ? knownBlockedItem(blockedByStudent.get(student.id)!) : item(student.id))
}

test('frozen v12 blocker snapshot v6 retains its original profile and policy versions', () => {
  assert.equal(blockerSnapshot.snapshotVersion, 'chibi-acceptance-known-blockers-v6')
  assert.equal(blockerSnapshot.profileVersion, 'chibi-rendering-profile-v9')
  assert.equal(blockerSnapshot.policyVersion, 'chibi-rendering-policy-v12')
  assert.deepEqual(blockerSnapshot.counts, {
    eligible: 275,
    mapped: 274,
    successful: 238,
    blocked: 37,
    mappedBlocked: 36,
    sourceUnavailable: 1,
  })
  assert.equal(blockerSnapshot.source.inventorySha256, '9503a9218b6ebd3ce91c7b6317a0610c5f0f46332d1d70dbf1b04e0feb20d242')
  const blockedIds = new Set(blockerSnapshot.rows.map(row => row.studentId))
  assert.equal(blockedIds.has(10002), false)
  assert.equal(blockedIds.has(10020), false)
  assert.equal(blockedIds.has(10033), false)
  assert.equal(blockedIds.has(10048), false, 'Saori should be importable with the exact source-proven arrangement warning.')
  assert.equal(blockedIds.has(20049), false, 'Misaki Swimsuit should be importable with the exact source-pinned weapon-group warning.')
  assert.equal(blockedIds.has(23008), false, 'Mari should be importable with the exact source-pinned weapon-group warning.')
  assert.equal(blockedIds.has(20061), true, 'Source-absent Kasumi (Swimsuit) must remain the sole unmapped row.')
  const sena = blockerSnapshot.rows.find(row => row.studentId === 20012)
  assert.equal(sena?.sourceIdentity, 'ch0081')
  assert.equal(sena?.sourceFingerprint, 'd45c3398b5c4d54498c0531f5c96e062f87d9b01aef3da3798e0007b68408d16')
  assert.equal(sena?.expectedStatus, 'unavailable')
  assert.equal(sena?.prefabPath, 'Assets/_MX/AddressableAsset/Character/CH0081/Cafe/Cafe_CH0081.prefab')
  assert.match(sena?.diagnostic ?? '', /source-complete but visually unacceptable/)
  assert.match(sena?.diagnostic ?? '', /0\.1780399764 Unity mesh units gap, and 0 bridging triangles/)
})

test('historical rendering versions require the exact v12 job and pinned blocker snapshot identity', () => {
  assert.deepEqual(v12RenderingVersionContract, {
    profileVersion: 'chibi-rendering-profile-v9',
    policyVersion: 'chibi-rendering-policy-v12',
    jobId: v12ResumeJobId,
  })
  assert.throws(() => v12ResumeRenderingVersionContract('another-terminal-job', blockerSnapshot), /only for the exact terminal resume job/)
  assert.throws(() => v12ResumeRenderingVersionContract(v12ResumeJobId, { ...blockerSnapshot, snapshotVersion: 'chibi-acceptance-known-blockers-v7' }), /snapshot version differs/)
  assert.throws(() => v12ResumeRenderingVersionContract(v12ResumeJobId, { ...blockerSnapshot, profileVersion: CHIBI_RENDERING_PROFILE_VERSION }), /profile version differs/)
  assert.throws(() => v12ResumeRenderingVersionContract(v12ResumeJobId, { ...blockerSnapshot, policyVersion: CHIBI_RENDERING_POLICY_VERSION }), /policy version differs/)
  assert.throws(() => v12ResumeRenderingVersionContract(v12ResumeJobId, { ...blockerSnapshot, roster: { ...blockerSnapshot.roster, checksum: '0'.repeat(64) } }), /roster checksum differs/)
  assert.throws(() => v12ResumeRenderingVersionContract(v12ResumeJobId, { ...blockerSnapshot, source: { ...blockerSnapshot.source, inventorySha256: '0'.repeat(64) } }), /source inventory differs/)
  const changedBlockerRow = structuredClone(blockerSnapshot)
  changedBlockerRow.rows[0].diagnostic += ' tampered'
  assert.throws(() => v12ResumeRenderingVersionContract(v12ResumeJobId, changedBlockerRow), /contents differ/)
  assert.deepEqual(renderingVersionContractForPhase('after-restart', v12ResumeJobId), v12RenderingVersionContract)
  assert.deepEqual(renderingVersionContractForPhase('repeat', v12ResumeJobId), {
    profileVersion: CHIBI_RENDERING_PROFILE_VERSION,
    policyVersion: CHIBI_RENDERING_POLICY_VERSION,
  }, 'A repeat phase creates a new import and must use the current rendering contract.')
  assert.throws(() => assertRepeatImportAllowed(v12ResumeJobId), /Repeat import is disabled for the historical v12 resume job/)
  assert.doesNotThrow(() => assertRepeatImportAllowed('future-v13-job'))
  assert.throws(() => assertKnownBlockerAcknowledgement(fullRoster, { CHIBI_ACCEPTANCE_ALLOW_BLOCKED: 'true' }, renderingVersionContractForPhase('repeat', v12ResumeJobId)), /frozen v12 blocker snapshot cannot authorize a new import/)
})

test('full acceptance accepts only the exact versioned blocked roster plus successful rows', () => {
  const items = fullMixedItems()
  const outcome = assertTerminalOutcome(job(items), fullRoster, 10000, v12RenderingVersionContract)
  assert.equal(outcome.successful.length, blockerSnapshot.counts.successful)
  assert.equal(outcome.knownBlocked.length, blockerSnapshot.counts.blocked)
  assert.deepEqual(outcome.allowedUnavailable, [{
    studentId: 20061,
    status: 'unavailable',
    reasonCode: 'NO_EXACT_CANONICAL_SOURCE',
    diagnostic: 'No exact canonical source identity was found.',
  }])

  assert.throws(() => assertTerminalOutcome(job(items.map(value => value.studentId === 10013 ? { ...value, status: 'review-required', assetId: null } : value)), fullRoster, 10000, v12RenderingVersionContract), /failed, review-required, unresolved/)
  assert.throws(() => assertTerminalOutcome(job(items.map(value => value.studentId === 10040 ? { ...value, status: 'imported', assetId: `asset-${value.studentId}` } : value)), fullRoster, 10000, v12RenderingVersionContract), /unexpectedly published a known blocked student/)
  const wrongJob = job(items)
  wrongJob.job.id = 'another-terminal-job'
  assert.throws(() => assertTerminalOutcome(wrongJob, fullRoster, 10000, v12RenderingVersionContract), /cannot validate a different import job/)
})

test('pilot acceptance keeps its one-row selection semantics', () => {
  const pilot = acceptanceRosterPlan('pilot')
  const outcome = assertTerminalOutcome({
    job: { ...jobShape, total: 1, processed: 1, imported: 1 },
    items: [item(10002)],
    total: 1,
  } as Parameters<typeof assertTerminalOutcome>[0], pilot, 10002)
  assert.equal(outcome.target.studentId, 10002)
  assert.equal(outcome.successful.length, 1)
})

test('full acceptance permits only the recorded source-unavailable row and diagnostic shape', () => {
  const items = fullMixedItems()
  const outcome = assertTerminalOutcome(job(items), fullRoster, 10000, v12RenderingVersionContract)
  assert.deepEqual(outcome.allowedUnavailable, [{
    studentId: 20061,
    status: 'unavailable',
    reasonCode: 'NO_EXACT_CANONICAL_SOURCE',
    diagnostic: 'No exact canonical source identity was found.',
  }])
  assert.throws(() => assertTerminalOutcome(job(items.map(value => value.studentId === 20061 ? { ...value, diagnostic: 'No exact canonical source identity was found for another row.' } : value)), fullRoster, 10000, v12RenderingVersionContract), /failed, review-required, unresolved/)
  assert.throws(() => assertTerminalOutcome(job(items.map(value => value.studentId === 20061 ? { ...value, sourceIdentity: 'ch0264', fingerprint: 'a'.repeat(64) } : value)), fullRoster, 10000, v12RenderingVersionContract), /failed, review-required, unresolved/)
})

test('full known-blocker acknowledgement is explicit and cannot broaden the snapshot', () => {
  assert.throws(() => assertKnownBlockerAcknowledgement(fullRoster, { CHIBI_ACCEPTANCE_ALLOW_BLOCKED: 'false' }, v12RenderingVersionContract), /CHIBI_ACCEPTANCE_ALLOW_BLOCKED=true/)
  assert.doesNotThrow(() => assertKnownBlockerAcknowledgement(fullRoster, { CHIBI_ACCEPTANCE_ALLOW_BLOCKED: 'true' }, v12RenderingVersionContract))
  assert.throws(() => assertKnownBlockerAcknowledgement(fullRoster, { CHIBI_ACCEPTANCE_ALLOW_BLOCKED: 'true' }), /frozen v12 blocker snapshot cannot authorize a new import/)
})

function sourceReference(objectId: string) {
  return { bundleSha256: objectId.repeat(Math.ceil(64 / objectId.length)).slice(0, 64), serializedFile: 'CAB-character', objectId }
}

function motionProofSourceReference(objectId: string) {
  return { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-character', objectId }
}

function canonicalTestJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalTestJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalTestJson((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? String(value)
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function proofRow(studentId: number) {
  const rendererReference = motionProofSourceReference(`renderer-${studentId}`)
  const rootReference = motionProofSourceReference(`root-${studentId}`)
  const action = { id: 'idle', clip: `Fixture_Idle_${studentId}` }
  const rootPath = [{ name: 'Character', sourceReference: rootReference }]
  const clipReference = motionProofSourceReference(`clip-${studentId}`)
  const controllerReference = motionProofSourceReference(`controller-${studentId}`)
  return {
    studentId,
    sourceIdentity: `source-${studentId}`,
    asset: { assetId: `asset-${studentId}`, revision: 'b'.repeat(64), sha256: 'b'.repeat(64) },
    profileSha256: 'c'.repeat(64),
    renderer: { sourceKey: `${rendererReference.bundleSha256}:cab-character:${rendererReference.objectId}`, sourceReference: rendererReference },
    action,
    selectedPrefab: { path: `Assets/Fixture_${studentId}.prefab`, sourceReference: motionProofSourceReference(`prefab-${studentId}`), rootTransformReference: rootReference },
    animator: {
      componentReference: motionProofSourceReference(`animator-${studentId}`),
      rootReference,
      path: rootPath,
      controllerReference,
      controllerGraph: {
        complete: true,
        // Controller identities and source clips are reported in separate lists,
        // matching the pinned v2 report's actual shape.
        references: [controllerReference],
        clipReferences: [{ ...clipReference }],
        effectiveClipReferences: [{ ...clipReference }],
        sha256: 'f'.repeat(64),
      },
      selectedClipReference: { ...clipReference },
      matchingAnimatorCount: 1,
      matchingClipCount: 1,
    },
    sourceClip: { name: action.clip, sourceReference: { ...clipReference } },
    sourceClipRange: { startTimeSec: 0, stopTimeSec: 1 },
    proofStatus: 'static',
    scopeTransforms: [{
      roles: ['prefabRoot'], sourceReference: rootReference, name: 'Character', path: rootPath,
      pathSha256: sourceMotionProofPathSha256(rootPath), animationPathTokens: [], animatorRelation: 'inside-animator-subtree', glbNodeIndex: 0,
    }],
    curveSet: { complete: true, coverageStatus: 'complete', totalBindingCount: 0, relevantTrackCount: 0, unresolvedRelevantCount: 0, genericBindingCount: 0, directCurveCount: 0, decoderDiagnostics: [], sha256: 'd'.repeat(64) },
    tracks: [],
    diagnosticCodes: [],
  }
}

function disjointAnimatorScopeProofRow(studentId: number) {
  const row: any = proofRow(studentId)
  const prefabRoot = row.selectedPrefab.rootTransformReference
  const animatorRoot = motionProofSourceReference(`animator-root-${studentId}`)
  const scopeTransform = motionProofSourceReference(`weapon-transform-${studentId}`)
  const animatorPath = [
    { name: 'Character', sourceReference: prefabRoot },
    { name: 'FXRoot', sourceReference: animatorRoot },
  ]
  const scopePath = [
    { name: 'Character', sourceReference: prefabRoot },
    { name: 'Weapon', sourceReference: scopeTransform },
  ]
  row.animator.rootReference = animatorRoot
  row.animator.path = animatorPath
  row.scopeTransforms = [{
    roles: ['renderer'],
    sourceReference: scopeTransform,
    name: 'Weapon',
    path: scopePath,
    pathSha256: sourceMotionProofPathSha256(scopePath),
    animationPathTokens: [],
    animatorRelation: 'disjoint',
    glbNodeIndex: 1,
  }]
  return row
}

function v12SourceMotionProofReport(rows: any[] = [10000, 10001, 10002, 10003].map(proofRow)) {
  const report: any = {
    schemaVersion: 2,
    kind: 'chibi-v12-source-motion-proof',
    policyVersion: 'chibi-v12-source-motion-proof-v2',
    databaseName: 'chibi-acceptance-v12-full-20260925-6d18e6c8',
    jobId: v12ResumeJobId,
    terminalSidecar: { sha256: '5c94f37650d8744a8c380eef1cd009ad5d63172a34ede34513fea7c49892cdcf', rowCount: 238 },
    structuralSweep: {
      sha256: 'ad324ea0d3c98361048006f08d45343b34f75a2e975ec3d619382cb649c4e603',
      rowCount: 4,
      selector: 'rows with category structural-action-no-nonzero-delta, independently rechecked as zero by GLB channel sampling',
    },
    sourceInventory: {
      sha256: '9503a9218b6ebd3ce91c7b6317a0610c5f0f46332d1d70dbf1b04e0feb20d242',
      metadataReader: '1.25.3+render-profile-v7-projectmx-weapon-e-standard-glitch-tex-matcap-additive-alpha-blend-add-equipment-renderer-references-v5',
    },
    sourceBundleSetSha256: 'e'.repeat(64),
    fiveBusinessDigests: {
      ChibiAsset: { rows: 238, sha256: '14ba4af2770a755fbe0d9b1c106420f43d787ac9bcfc72e6b2f3f0ab9f837aaa' },
      StudentChibiBinding: { rows: 238, sha256: '7000ca47f1cd309a2371558cd883f826531e3d80c5945ab84b656f1d57c5af30' },
      ChibiImportJob: { rows: 1, sha256: '73e11bf553720f74678ebe99609b7bf4b5b405858027570f3d218c78b4810ed2' },
      ChibiImportItem: { rows: 275, sha256: '1434e4a15447d0ec97c0da1062bb22642d679597f5143ead658205c0c0ba5df5' },
      ChibiSourceCandidate: { rows: 871, sha256: '72bb9ffeeb89972f7bc541e3778f599df58c85e86606d9726183260332b4b385' },
    },
    generatedAt: '2026-09-26T00:00:00.000Z',
    rows,
  }
  report.reportSha256 = sourceMotionProofReportSha256(report)
  return report
}

function v3SourceMotionProofReport(rows: any[]) {
  const report = v12SourceMotionProofReport(rows)
  report.schemaVersion = 3
  report.policyVersion = 'chibi-v12-source-motion-proof-v3'
  report.reportSha256 = sourceMotionProofReportSha256(report)
  return report
}

function staticMotionProofFixture() {
  const fixture = structuralEvidenceProfile() as any
  const profile = fixture.profile
  const assemblyRenderer = profile.assembly.renderers[1]
  const actionProfile = {
    label: 'Fixture',
    initialPose: 'Fixture_Idle',
    interactions: {
      idle: { state: 'unsupported', reason: 'No separate idle action.' },
      walk: { state: 'unsupported', reason: 'No walk motion authored.' },
      pickup: { state: 'unsupported', reason: 'No pickup motion authored.' },
      touch: { state: 'unsupported', reason: 'No touch motion authored.' },
    },
  }
  const sourceIdentity = 'fixture-source-identity'
  const assetIdentity = { assetId: 'asset-10002', revision: 'f'.repeat(64), sha256: 'f'.repeat(64) }
  profile.sourceIdentity = sourceIdentity
  profile.sourcePrefab = { path: 'Assets/Fixture.prefab', reference: profile.assembly.prefabReference }
  profile.profileVersion = 'chibi-rendering-profile-v9'
  profile.policyVersion = 'chibi-rendering-policy-v12'
  profile.validation.policyVersion = 'chibi-rendering-policy-v12'
  fixture.validation.renderingProfile.policyVersion = 'chibi-rendering-policy-v12'
  fixture.glbJson.nodes[2].name = 'Fixture_Weapon'
  fixture.glbJson.nodes[0].children = [1, 3]
  fixture.glbJson.nodes[5].children = [2, 6]
  fixture.glbJson.animations[0].channels[0].transformDelta = [0, 0, 0, 0]
  fixture.glbJson.animations[0].samplers[0].output = [[0, 0, 0, 1], [0, 0, 0, 1]]

  const bySource = new Map<string, any>()
  const addPath = (pointers: any[], leafRole: string, prefixRole?: string) => {
    for (let index = 0; index < pointers.length; index += 1) {
      const pointer = pointers[index]
      const key = `${pointer.sourceReference.bundleSha256.toLowerCase()}:${pointer.sourceReference.serializedFile.toLowerCase()}:${pointer.sourceReference.objectId}`
      const path = pointers.slice(0, index + 1).map(entry => ({ name: entry.name, sourceReference: entry.sourceReference }))
      const existing = bySource.get(key)
      const roles = new Set<string>(existing?.roles ?? [])
      roles.add(index === pointers.length - 1 ? leafRole : prefixRole ?? 'ancestor')
      bySource.set(key, {
        roles: [...roles].sort(), sourceReference: pointer.sourceReference, name: pointer.name, path,
        pathSha256: sourceMotionProofPathSha256(path), animationPathTokens: path.slice(1).map(token => token.name),
      })
    }
  }
  addPath(assemblyRenderer.transformChain, 'renderer', 'ancestor')
  addPath(assemblyRenderer.rootBoneAncestry, 'rootBoneAncestry', 'rootBoneAncestry')
  addPath([...assemblyRenderer.rootBoneAncestry, assemblyRenderer.rootBone], 'rootBone', 'rootBoneAncestry')
  for (const bone of assemblyRenderer.boneReferences) addPath([...assemblyRenderer.rootBoneAncestry, bone], 'skinJoint', 'rootBoneAncestry')

  const rootTransformReference = assemblyRenderer.transformChain[0].sourceReference
  const action = { id: 'initialPose', clip: 'Fixture_Idle' }
  const clipReference = motionProofSourceReference('fixture-clip')
  const controllerReference = motionProofSourceReference('fixture-controller')
  const rootBoneScopeKey = `${assemblyRenderer.rootBone.sourceReference.bundleSha256.toLowerCase()}:${assemblyRenderer.rootBone.sourceReference.serializedFile.toLowerCase()}:${assemblyRenderer.rootBone.sourceReference.objectId}`
  const rootBoneScope = bySource.get(rootBoneScopeKey)
  assert.ok(rootBoneScope)
  const nodeIndexForPath = (path: any[]) => {
    const nodes = fixture.glbJson.nodes as any[]
    let current = nodes.findIndex(node => node.name === profile.assembly.root)
    for (const token of path.slice(1)) {
      const matches = (nodes[current].children ?? []).filter((child: number) => nodes[child]?.name === token.name)
      assert.equal(matches.length, 1)
      current = matches[0]
    }
    return current
  }
  for (const scope of bySource.values()) {
    scope.animatorRelation = 'inside-animator-subtree'
    scope.glbNodeIndex = nodeIndexForPath(scope.path)
  }
  const rootScope = [...bySource.values()].find(scope => scope.name === 'Character')
  assert.ok(rootScope)
  const sample = {
    timeSec: 0,
    kind: 'key',
    source: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    glb: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  }
  const comparison = (timingApplicable: boolean) => ({
    mode: 'exact-motion-accounting',
    policyId: 'planning.md/v12-pragmatic-gates',
    modelHeightUnits: null,
    modelHeightEvidence: null,
    translation: { unit: 'glb-model-units', maxKeyError: 0, maxMidpointError: null, maxCubicExtremumError: null, maxSampleError: 0, sourceExcursion: 0, gate: null, errorGateRatio: null },
    quaternion: { unit: 'degrees', maxKeyError: 0, maxMidpointError: null, maxCubicExtremumError: null, maxSampleError: 0, sourceExcursion: 0, gate: null, errorGateRatio: null },
    scale: { unit: 'dimensionless', axes: Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, { maxKeyError: 0, maxMidpointError: null, maxCubicExtremumError: null, maxSampleError: 0, sourceMagnitude: 1, gate: null, errorGateRatio: null }])) },
    timing: { applicable: timingApplicable, maxAbsDeltaMs: timingApplicable ? 0 : null, gateMs: 16.7, cumulativeDriftMs: timingApplicable ? 0 : null },
    scaleSignZeroTransitions: [],
    visibilityChanges: false,
  })
  const samples = [structuredClone(sample), { ...structuredClone(sample), timeSec: 1 }]
  const rootBoneCurves = ['x', 'y', 'z', 'w'].map(component => ({ component, sourceKind: 'constant', initialValue: component === 'w' ? 1 : 0, keys: [] }))
  const rootPositionCurves = ['x', 'y', 'z'].map(component => ({ component, sourceKind: 'constant', initialValue: 0, keys: [] }))
  const rendererReference = profile.renderers[1].sourceReference
  const row = {
    studentId: 10002,
    sourceIdentity,
    asset: { ...assetIdentity },
    profileSha256: sha256(canonicalTestJson(actionProfile)),
    renderer: {
      sourceKey: `${rendererReference.bundleSha256.toLowerCase()}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`,
      sourceReference: rendererReference,
    },
    action,
    selectedPrefab: {
      path: profile.sourcePrefab.path,
      sourceReference: profile.sourcePrefab.reference,
      rootTransformReference,
    },
    animator: {
      componentReference: motionProofSourceReference('fixture-animator'),
      rootReference: rootTransformReference,
      path: [{ name: 'Character', sourceReference: rootTransformReference }],
      controllerReference,
      controllerGraph: {
        complete: true,
        references: [controllerReference, clipReference],
        clipReferences: [clipReference],
        effectiveClipReferences: [clipReference],
        sha256: 'a'.repeat(64),
      },
      selectedClipReference: clipReference,
      matchingAnimatorCount: 1,
      matchingClipCount: 1,
    },
    sourceClip: { name: action.clip, sourceReference: clipReference },
    sourceClipRange: { startTimeSec: 0, stopTimeSec: 1 },
    proofStatus: 'static',
    scopeTransforms: [...bySource.values()],
    curveSet: { complete: true, coverageStatus: 'complete', totalBindingCount: 2, relevantTrackCount: 2, unresolvedRelevantCount: 0, genericBindingCount: 2, directCurveCount: 0, decoderDiagnostics: [], sha256: '9'.repeat(64) },
    tracks: [{
      curveIndex: 0,
      bindingPathHash: 0,
      pathTokens: rootBoneScope.animationPathTokens,
      sourceTransformReference: assemblyRenderer.rootBone.sourceReference,
      sourceTarget: {
        reference: assemblyRenderer.rootBone.sourceReference,
        sourceLocalTrs: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        path: rootBoneScope.path,
        pathSha256: rootBoneScope.pathSha256,
        animatorRelation: 'inside-animator-subtree',
        glbNodeIndex: rootBoneScope.glbNodeIndex,
      },
      component: 'Transform',
      property: 'm_LocalRotation',
      bindingKind: 'transform',
      sourceKind: 'generic',
      sourceCurves: rootBoneCurves,
      sampleCount: 4,
      valueClass: 'constant',
      disposition: 'exact-static',
      valuesSha256: sha256(canonicalTestJson({ componentCurves: rootBoneCurves })),
      sampleEvidence: samples,
      comparison: comparison(false),
      glbChannels: [],
    }, {
      curveIndex: 1,
      bindingPathHash: 0,
      pathTokens: [],
      sourceTransformReference: rootTransformReference,
      sourceTarget: {
        reference: rootTransformReference,
        sourceLocalTrs: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
        path: rootScope.path,
        pathSha256: rootScope.pathSha256,
        animatorRelation: 'inside-animator-subtree',
        glbNodeIndex: rootScope.glbNodeIndex,
      },
      component: 'Transform',
      property: 'm_LocalPosition',
      bindingKind: 'transform',
      sourceKind: 'generic',
      sourceCurves: rootPositionCurves,
      sampleCount: 3,
      valueClass: 'constant',
      disposition: 'exact-static',
      valuesSha256: sha256(canonicalTestJson({ componentCurves: rootPositionCurves })),
      sampleEvidence: samples,
      comparison: comparison(false),
      glbChannels: [],
    }],
    diagnosticCodes: [],
  }
  fixture.glbJson.animations[0].channels = []
  fixture.glbJson.animations[0].samplers = []
  // The Unity generic-binding CRC32 is asserted by the consumer; calculate it
  // here from the same path tokens without sharing production implementation.
  let crc = 0xffffffff
  for (const byte of Buffer.from(rootBoneScope.animationPathTokens.join('/'), 'utf8')) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  row.tracks[0].bindingPathHash = (crc ^ 0xffffffff) >>> 0
  const report = v12SourceMotionProofReport([row, ...[10003, 10004, 10005].map(proofRow)])
  return { fixture, actionProfile, sourceIdentity, assetIdentity, report }
}

test('v12 source-motion report requires its exact job, read-only snapshot pins, and canonical content digest', () => {
  const report = v12SourceMotionProofReport()
  const verified = assertV12SourceMotionProofReport(report, report.reportSha256)
  assert.equal(verified.jobId, v12ResumeJobId)
  assert.equal(verified.rowsByKey.size, 4)
  const actualShapeRow = report.rows[0]
  const controllerGraph = actualShapeRow.animator.controllerGraph
  const clipKey = `${actualShapeRow.sourceClip.sourceReference.bundleSha256}:${actualShapeRow.sourceClip.sourceReference.serializedFile}:${actualShapeRow.sourceClip.sourceReference.objectId}`
  assert.equal(controllerGraph.references.some((reference: any) => `${reference.bundleSha256}:${reference.serializedFile}:${reference.objectId}` === clipKey), false)
  assert.equal(controllerGraph.clipReferences.filter((reference: any) => `${reference.bundleSha256}:${reference.serializedFile}:${reference.objectId}` === clipKey).length, 1)
  assert.equal(controllerGraph.effectiveClipReferences.filter((reference: any) => `${reference.bundleSha256}:${reference.serializedFile}:${reference.objectId}` === clipKey).length, 1)

  const missingController = structuredClone(report)
  missingController.rows[0].animator.controllerGraph.references = []
  missingController.reportSha256 = sourceMotionProofReportSha256(missingController)
  assert.throws(() => assertV12SourceMotionProofReport(missingController, missingController.reportSha256), /controller graph references are missing/)

  const missingClip = structuredClone(report)
  missingClip.rows[0].animator.controllerGraph.clipReferences = []
  missingClip.reportSha256 = sourceMotionProofReportSha256(missingClip)
  assert.throws(() => assertV12SourceMotionProofReport(missingClip, missingClip.reportSha256), /controller graph clipReferences are missing/)

  const duplicateClip = structuredClone(report)
  duplicateClip.rows[0].animator.controllerGraph.effectiveClipReferences.push(structuredClone(duplicateClip.rows[0].animator.controllerGraph.effectiveClipReferences[0]))
  duplicateClip.reportSha256 = sourceMotionProofReportSha256(duplicateClip)
  assert.throws(() => assertV12SourceMotionProofReport(duplicateClip, duplicateClip.reportSha256), /repeat an exact clip reference/)

  const crossBundleClip = structuredClone(report)
  crossBundleClip.rows[0].animator.controllerGraph.effectiveClipReferences[0].bundleSha256 = '0'.repeat(64)
  crossBundleClip.reportSha256 = sourceMotionProofReportSha256(crossBundleClip)
  assert.throws(() => assertV12SourceMotionProofReport(crossBundleClip, crossBundleClip.reportSha256), /omit the selected source clip/)

  const wrongJob = structuredClone(report)
  wrongJob.jobId = 'different-terminal-job'
  wrongJob.reportSha256 = sourceMotionProofReportSha256(wrongJob)
  assert.throws(() => assertV12SourceMotionProofReport(wrongJob, wrongJob.reportSha256), /different import job/)

  const wrongInventory = structuredClone(report)
  wrongInventory.sourceInventory.sha256 = '0'.repeat(64)
  wrongInventory.reportSha256 = sourceMotionProofReportSha256(wrongInventory)
  assert.throws(() => assertV12SourceMotionProofReport(wrongInventory, wrongInventory.reportSha256), /source inventory/)

  const incompleteStatic = structuredClone(report)
  incompleteStatic.rows[0].curveSet.complete = false
  incompleteStatic.reportSha256 = sourceMotionProofReportSha256(incompleteStatic)
  assert.throws(() => assertV12SourceMotionProofReport(incompleteStatic, incompleteStatic.reportSha256), /accepted proof has incomplete curve coverage/)

  const mismatchedAnimatorPath = structuredClone(report)
  mismatchedAnimatorPath.rows[0].animator.path[0].name = 'UnrelatedRoot'
  mismatchedAnimatorPath.reportSha256 = sourceMotionProofReportSha256(mismatchedAnimatorPath)
  assert.throws(() => assertV12SourceMotionProofReport(mismatchedAnimatorPath, mismatchedAnimatorPath.reportSha256), /scope and Animator paths disagree|leaf name differs/)

  const wrongAnimatorTokens = structuredClone(report)
  wrongAnimatorTokens.rows[0].scopeTransforms[0].animationPathTokens = ['unexpected']
  wrongAnimatorTokens.reportSha256 = sourceMotionProofReportSha256(wrongAnimatorTokens)
  assert.throws(() => assertV12SourceMotionProofReport(wrongAnimatorTokens, wrongAnimatorTokens.reportSha256), /scope path tokens do not match/)

  const staleDigest = structuredClone(report)
  staleDigest.rows[0].asset.sha256 = '0'.repeat(64)
  assert.throws(() => assertV12SourceMotionProofReport(staleDigest, report.reportSha256), /canonical content digest is invalid/)
})

test('v12 source-motion paths allow disjoint Animator branches but compare names on their exact shared prefix', () => {
  const disjoint = disjointAnimatorScopeProofRow(10000)
  const report = v12SourceMotionProofReport([disjoint, ...[10001, 10002, 10003].map(proofRow)])
  assert.equal(assertV12SourceMotionProofReport(report, report.reportSha256).rowsByKey.size, 4)

  const mismatchedSharedName = structuredClone(report)
  mismatchedSharedName.rows[0].scopeTransforms[0].path[0].name = 'RenamedCharacter'
  mismatchedSharedName.rows[0].scopeTransforms[0].pathSha256 = sourceMotionProofPathSha256(mismatchedSharedName.rows[0].scopeTransforms[0].path)
  mismatchedSharedName.reportSha256 = sourceMotionProofReportSha256(mismatchedSharedName)
  assert.throws(() => assertV12SourceMotionProofReport(mismatchedSharedName, mismatchedSharedName.reportSha256), /scope and Animator paths disagree on a shared Transform name/)

  const wrongRelation = structuredClone(report)
  wrongRelation.rows[0].scopeTransforms[0].animatorRelation = 'inside-animator-subtree'
  wrongRelation.reportSha256 = sourceMotionProofReportSha256(wrongRelation)
  assert.throws(() => assertV12SourceMotionProofReport(wrongRelation, wrongRelation.reportSha256), /Animator relation differs from its exact source-reference paths/)
})

test('schema 2 rejects v3 channel dispositions while schema 3 validates their explicit shape', () => {
  const { report: sourceReport } = staticMotionProofFixture()
  const v2Report = structuredClone(sourceReport)
  const row = v2Report.rows.find((candidate: any) => candidate.studentId === 10002)
  const track = row.tracks[0]
  track.disposition = 'exact-static-channel'
  track.glbChannels = [{ animationName: row.action.clip, channelIndex: 0, samplerIndex: 0, targetNodeIndex: track.sourceTarget.glbNodeIndex, targetPath: 'rotation' }]
  track.comparison.timing = { applicable: true, maxAbsDeltaMs: 0, gateMs: 16.7, cumulativeDriftMs: 0 }
  v2Report.reportSha256 = sourceMotionProofReportSha256(v2Report)
  assert.throws(() => assertV12SourceMotionProofReport(v2Report, v2Report.reportSha256), /disposition is invalid for schema 2/)

  const v3Report = v3SourceMotionProofReport(v2Report.rows)
  const verified = assertV12SourceMotionProofReport(v3Report, v3Report.reportSha256)
  assert.equal(verified.schemaVersion, 3)
  assert.equal([...verified.rowsByKey.values()].find((candidate: any) => candidate.studentId === 10002)?.tracks[0].disposition, 'exact-static-channel')

  const forged = structuredClone(v3Report)
  const forgedTrack = forged.rows.find((candidate: any) => candidate.studentId === 10002).tracks[0]
  forgedTrack.disposition = 'bounded-source-to-glb-channel'
  forgedTrack.comparison.mode = 'exact-motion-accounting'
  forged.reportSha256 = sourceMotionProofReportSha256(forged)
  assert.throws(() => assertV12SourceMotionProofReport(forged, forged.reportSha256), /bounded mapped channel has no policy-gated comparison/)
})

test('source-proven static v12 motion bypass is limited to the exact action, source chain, asset, and sampled GLB channels', () => {
  const { fixture, actionProfile, sourceIdentity, assetIdentity, report } = staticMotionProofFixture()
  const verified = assertV12SourceMotionProofReport(report, report.reportSha256)
  const options = {
    requireEquipmentRelations: true,
    actionProfile,
    sourceIdentity,
    assetIdentity,
    renderingVersionContract: { profileVersion: 'chibi-rendering-profile-v9', policyVersion: 'chibi-rendering-policy-v12', jobId: v12ResumeJobId },
    sourceMotionProof: verified,
  }
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, options))
  assert.equal(verified.consumedRows.size, 1)

  const matrixAuthoredGlb = structuredClone(fixture.glbJson)
  const targetNodeIndex = report.rows[0].tracks[0].sourceTarget.glbNodeIndex
  matrixAuthoredGlb.nodes[targetNodeIndex].matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  assert.throws(() => assertEmbeddedCharacterContract(10002, fixture.validation, matrixAuthoredGlb, { ...options, sourceMotionProof: { ...verified, consumedRows: new Set<string>() } }), /matrix-authored transform that this verifier cannot safely decompose/)

  const wrongAsset = { ...options, sourceMotionProof: { ...verified, consumedRows: new Set<string>() }, assetIdentity: { ...assetIdentity, sha256: '0'.repeat(64) } }
  assert.throws(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, wrongAsset), /asset checksum differs/)

  const wrongVersion = { ...options, sourceMotionProof: { ...verified, consumedRows: new Set<string>() }, renderingVersionContract: { profileVersion: 'chibi-rendering-profile-v9', policyVersion: 'chibi-rendering-policy-v12' } }
  assert.throws(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, wrongVersion), /outside the historical v12 rendering contract/)

  const wrongChannelReport = structuredClone(report)
  wrongChannelReport.rows[0].tracks[0].glbChannels = [{ animationName: 'Fixture_Idle', channelIndex: 0, samplerIndex: 0, targetNodeIndex: 5, targetPath: 'rotation' }]
  wrongChannelReport.reportSha256 = sourceMotionProofReportSha256(wrongChannelReport)
  const wrongChannelProof = assertV12SourceMotionProofReport(wrongChannelReport, wrongChannelReport.reportSha256)
  assert.throws(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { ...options, sourceMotionProof: wrongChannelProof }), /exact-static disposition unexpectedly claims an animation channel/)

  const wrongSourceCurveReport = structuredClone(report)
  const wrongSourceCurve = wrongSourceCurveReport.rows[0].tracks[1].sourceCurves[0]
  wrongSourceCurve.initialValue = 0.25
  wrongSourceCurveReport.rows[0].tracks[1].valuesSha256 = sha256(canonicalTestJson({ componentCurves: wrongSourceCurveReport.rows[0].tracks[1].sourceCurves }))
  wrongSourceCurveReport.reportSha256 = sourceMotionProofReportSha256(wrongSourceCurveReport)
  const wrongSourceCurveProof = assertV12SourceMotionProofReport(wrongSourceCurveReport, wrongSourceCurveReport.reportSha256)
  assert.throws(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { ...options, sourceMotionProof: wrongSourceCurveProof }), /source translation\[0\] differs from independently recomputed samples/)

  const wrongSourcePathReport = structuredClone(report)
  const boneRootScope = wrongSourcePathReport.rows[0].scopeTransforms.find((scope: any) => scope.name === 'bone_root')
  assert.ok(boneRootScope)
  boneRootScope.sourceReference = { ...boneRootScope.sourceReference, objectId: 'unrelated-bone-root' }
  boneRootScope.path.at(-1).sourceReference = { ...boneRootScope.path.at(-1).sourceReference, objectId: 'unrelated-bone-root' }
  boneRootScope.pathSha256 = sourceMotionProofPathSha256(boneRootScope.path)
  wrongSourcePathReport.reportSha256 = sourceMotionProofReportSha256(wrongSourcePathReport)
  const wrongSourcePathProof = assertV12SourceMotionProofReport(wrongSourcePathReport, wrongSourcePathReport.reportSha256)
  assert.throws(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { ...options, sourceMotionProof: wrongSourcePathProof }), /omitted profile-known scope transform/)

  const dynamicReport = structuredClone(report)
  dynamicReport.rows[0].proofStatus = 'dynamic'
  dynamicReport.reportSha256 = sourceMotionProofReportSha256(dynamicReport)
  assert.throws(() => assertV12SourceMotionProofReport(dynamicReport, dynamicReport.reportSha256), /proofStatus is invalid/)
})

test('v12 bounded-to-static evidence fails closed without the exact body renderer selector', () => {
  const { report } = staticMotionProofFixture()
  const boundedTrack = report.rows[0].tracks[1]
  boundedTrack.disposition = 'bounded-source-to-static'
  boundedTrack.comparison.mode = 'policy-gated'
  boundedTrack.comparison.modelHeightUnits = 1
  boundedTrack.comparison.modelHeightEvidence = null
  report.reportSha256 = sourceMotionProofReportSha256(report)
  assert.throws(() => assertV12SourceMotionProofReport(report, report.reportSha256), /modelHeightEvidence must be an object/)
})

function boundedStaticMotionProofFixture() {
  const base = staticMotionProofFixture()
  const track = base.report.rows[0].tracks[1]
  const curves = [
    { component: 'x', sourceKind: 'streamed', initialValue: 0, keys: [
      { time: 0, value: 0, coefficients: null }, { time: 1, value: 0.05, coefficients: null },
    ] },
    { component: 'y', sourceKind: 'constant', initialValue: 0, keys: [] },
    { component: 'z', sourceKind: 'constant', initialValue: 0, keys: [] },
  ]
  const samples = [
    { timeSec: 0, kind: 'key', source: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }, glb: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } },
    { timeSec: 0.5, kind: 'midpoint', source: { translation: [-0.00025, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }, glb: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } },
    { timeSec: 1, kind: 'key', source: { translation: [-0.0005, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }, glb: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } },
  ]
  const evidence = {
    selector: 'equipmentBindingEvidence.bodyRendererReferences',
    rendererReferences: [base.fixture.profile.equipmentBindingEvidence[0].bodyRendererReferences[0]],
    glbNodeIndices: [1],
    measurement: { minY: 0, maxY: 1, height: 1, vertexCount: 10 },
  }
  track.sourceCurves = curves
  track.sampleCount = 4
  track.valuesSha256 = sha256(canonicalTestJson({ componentCurves: curves }))
  track.valueClass = 'dynamic'
  track.disposition = 'bounded-source-to-static'
  track.sampleEvidence = samples
  track.comparison = policyGatedComparisonForSamples(samples as any, evidence as any)
  base.report.reportSha256 = sourceMotionProofReportSha256(base.report)
  const sourceMotionProof = assertV12SourceMotionProofReport(base.report, base.report.reportSha256)
  const options = {
    requireEquipmentRelations: true,
    actionProfile: base.actionProfile,
    sourceIdentity: base.sourceIdentity,
    assetIdentity: base.assetIdentity,
    renderingVersionContract: { profileVersion: 'chibi-rendering-profile-v9', policyVersion: 'chibi-rendering-policy-v12', jobId: v12ResumeJobId },
    sourceMotionProof,
  }
  return { ...base, track, options }
}

function boundedMappedMotionProofFixture() {
  const base = boundedStaticMotionProofFixture()
  const { fixture, report, track } = base
  const animation = fixture.glbJson.animations[0]
  animation.channels = [{ sampler: 0, target: { node: track.sourceTarget.glbNodeIndex, path: 'translation' } }]
  animation.samplers = [{ input: [[0], [1]], output: [[0, 0, 0], [0, 0, 0]] }]
  track.disposition = 'bounded-source-to-glb-channel'
  track.glbChannels = [{ animationName: 'Fixture_Idle', channelIndex: 0, samplerIndex: 0, targetNodeIndex: track.sourceTarget.glbNodeIndex, targetPath: 'translation' }]
  track.comparison.timing = { applicable: true, maxAbsDeltaMs: 0, gateMs: 16.7, cumulativeDriftMs: 0 }
  report.schemaVersion = 3
  report.policyVersion = 'chibi-v12-source-motion-proof-v3'
  report.reportSha256 = sourceMotionProofReportSha256(report)
  const sourceMotionProof = assertV12SourceMotionProofReport(report, report.reportSha256)
  base.options.sourceMotionProof = sourceMotionProof
  return base
}

function boundedScaleXMappedMotionProofFixture() {
  const base = boundedStaticMotionProofFixture()
  const { fixture, report, track } = base
  const curves = [{ component: 'x', sourceKind: 'streamed', initialValue: 1, keys: [
    { time: 0, value: 1, coefficients: null }, { time: 1, value: 1.01, coefficients: null },
  ] }]
  const sourceScales = [1, 1.005, 1.01]
  const times = [0, 0.5, 1]
  const samples = times.map((timeSec, index) => ({
    timeSec,
    kind: index === 1 ? 'midpoint' : 'key',
    source: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [sourceScales[index], 1, 1] },
    glb: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  }))
  const evidence = track.comparison.modelHeightEvidence
  track.property = 'm_LocalScale.x'
  track.sourceCurves = curves
  track.sampleCount = 2
  track.valuesSha256 = sha256(canonicalTestJson({ componentCurves: curves }))
  track.valueClass = 'dynamic'
  track.disposition = 'bounded-source-to-glb-channel'
  track.sampleEvidence = samples
  track.glbChannels = [{ animationName: 'Fixture_Idle', channelIndex: 0, samplerIndex: 0, targetNodeIndex: track.sourceTarget.glbNodeIndex, targetPath: 'scale' }]
  track.comparison = policyGatedComparisonForSamples(samples as any, evidence, { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 })
  const animation = fixture.glbJson.animations[0]
  animation.channels = [{ sampler: 0, target: { node: track.sourceTarget.glbNodeIndex, path: 'scale' } }]
  animation.samplers = [{ input: [[0], [0.5], [1]], output: sourceScales.map(() => [1, 1, 1]) }]
  report.schemaVersion = 3
  report.policyVersion = 'chibi-v12-source-motion-proof-v3'
  report.reportSha256 = sourceMotionProofReportSha256(report)
  base.options.sourceMotionProof = assertV12SourceMotionProofReport(report, report.reportSha256)
  return base
}

function exactStaticNonDefaultXChannelFixture() {
  const base = staticMotionProofFixture()
  const track = base.report.rows[0].tracks[1]
  const curves = [{ component: 'x', sourceKind: 'constant', initialValue: -12.5, keys: [] }]
  track.property = 'm_LocalPosition.x'
  track.sourceTarget.sourceLocalTrs.translation = [-12.5, 0, 0]
  track.sourceCurves = curves
  track.sampleCount = 1
  track.valuesSha256 = sha256(canonicalTestJson({ componentCurves: curves }))
  track.valueClass = 'constant'
  track.disposition = 'exact-static-channel'
  track.glbChannels = [{ animationName: 'Fixture_Idle', channelIndex: 0, samplerIndex: 0, targetNodeIndex: track.sourceTarget.glbNodeIndex, targetPath: 'translation' }]
  track.sampleEvidence = [0, 1].map(timeSec => ({
    timeSec,
    kind: 'key',
    source: { translation: [0.125, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    glb: { translation: [0.125, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  }))
  track.comparison.timing = { applicable: true, maxAbsDeltaMs: 0, gateMs: 16.7, cumulativeDriftMs: 0 }
  const animation = base.fixture.glbJson.animations[0]
  animation.channels = [{ sampler: 0, target: { node: track.sourceTarget.glbNodeIndex, path: 'translation' } }]
  animation.samplers = [{ input: [[0], [1]], output: [[0.125, 0, 0], [0.125, 0, 0]] }]
  base.report.schemaVersion = 3
  base.report.policyVersion = 'chibi-v12-source-motion-proof-v3'
  base.report.reportSha256 = sourceMotionProofReportSha256(base.report)
  const sourceMotionProof = assertV12SourceMotionProofReport(base.report, base.report.reportSha256)
  const options = {
    requireEquipmentRelations: true,
    actionProfile: base.actionProfile,
    sourceIdentity: base.sourceIdentity,
    assetIdentity: base.assetIdentity,
    renderingVersionContract: { profileVersion: 'chibi-rendering-profile-v9', policyVersion: 'chibi-rendering-policy-v12', jobId: v12ResumeJobId },
    sourceMotionProof,
  }
  return { ...base, track, options }
}

test('v12 bounded-to-static acceptance recomputes source samples, GLB defaults, and gated metrics', () => {
  const valid = boundedStaticMotionProofFixture()
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, valid.fixture.validation, valid.fixture.glbJson, valid.options))

  const forgedMetric = boundedStaticMotionProofFixture()
  forgedMetric.track.comparison.translation.maxSampleError = 0
  forgedMetric.report.reportSha256 = sourceMotionProofReportSha256(forgedMetric.report)
  forgedMetric.options.sourceMotionProof = assertV12SourceMotionProofReport(forgedMetric.report, forgedMetric.report.reportSha256)
  assert.throws(() => assertEmbeddedCharacterContract(10002, forgedMetric.fixture.validation, forgedMetric.fixture.glbJson, forgedMetric.options), /translation\.maxSampleError differs from independently recomputed samples/)

  const forgedSource = boundedStaticMotionProofFixture()
  forgedSource.track.sampleEvidence[2].source.translation[0] = -0.0004
  forgedSource.report.reportSha256 = sourceMotionProofReportSha256(forgedSource.report)
  forgedSource.options.sourceMotionProof = assertV12SourceMotionProofReport(forgedSource.report, forgedSource.report.reportSha256)
  assert.throws(() => assertEmbeddedCharacterContract(10002, forgedSource.fixture.validation, forgedSource.fixture.glbJson, forgedSource.options), /source translation\[0\] differs from independently recomputed samples/)

  const changedDefault = boundedStaticMotionProofFixture()
  changedDefault.fixture.glbJson.nodes[0].translation = [0.0001, 0, 0]
  changedDefault.fixture.glbJson.animations[0].channels = [{ sampler: 0, target: { node: 0, path: 'translation' } }]
  changedDefault.fixture.glbJson.animations[0].samplers = [{ input: [[0], [1]], output: [[0, 0, 0], [0, 0, 0]] }]
  changedDefault.track.glbChannels = [{ animationName: 'Fixture_Idle', channelIndex: 0, samplerIndex: 0, targetNodeIndex: 0, targetPath: 'translation' }]
  changedDefault.report.reportSha256 = sourceMotionProofReportSha256(changedDefault.report)
  changedDefault.options.sourceMotionProof = assertV12SourceMotionProofReport(changedDefault.report, changedDefault.report.reportSha256)
  assert.throws(() => assertEmbeddedCharacterContract(10002, changedDefault.fixture.validation, changedDefault.fixture.glbJson, changedDefault.options), /sampled GLB translation\[0\] node default/)
})

test('v3 bounded mapped-channel acceptance recomputes timing, channel identity, and body witness', () => {
  const valid = boundedMappedMotionProofFixture()
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, valid.fixture.validation, valid.fixture.glbJson, valid.options))

  const wrongProperty = boundedMappedMotionProofFixture()
  wrongProperty.fixture.glbJson.animations[0].channels[0].target.path = 'scale'
  wrongProperty.fixture.glbJson.animations[0].samplers[0].output = [[1, 1, 1], [1, 1, 1]]
  assert.throws(() => assertEmbeddedCharacterContract(10002, wrongProperty.fixture.validation, wrongProperty.fixture.glbJson, wrongProperty.options), /mapped GLB channel targets the wrong property|mapped GLB channel path differs/)

  const wrongTiming = boundedMappedMotionProofFixture()
  wrongTiming.fixture.glbJson.animations[0].samplers[0].input = [[0.1], [1]]
  assert.throws(() => assertEmbeddedCharacterContract(10002, wrongTiming.fixture.validation, wrongTiming.fixture.glbJson, wrongTiming.options), /timing maxAbsDeltaMs differs/)

  const missingWitness = boundedMappedMotionProofFixture()
  missingWitness.track.comparison.modelHeightEvidence = null
  missingWitness.report.reportSha256 = sourceMotionProofReportSha256(missingWitness.report)
  assert.throws(() => {
    missingWitness.options.sourceMotionProof = assertV12SourceMotionProofReport(missingWitness.report, missingWitness.report.reportSha256)
    assertEmbeddedCharacterContract(10002, missingWitness.fixture.validation, missingWitness.fixture.glbJson, missingWitness.options)
  }, /modelHeightEvidence must be an object/)
})

test('v3 bounded scale.x channel cannot hide unbound y or z animation', () => {
  const valid = boundedScaleXMappedMotionProofFixture()
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, valid.fixture.validation, valid.fixture.glbJson, valid.options))

  const forgedUnboundAxis = boundedScaleXMappedMotionProofFixture()
  const sampler = forgedUnboundAxis.fixture.glbJson.animations[0].samplers[0]
  sampler.input = [[0], [1]]
  sampler.interpolation = 'CUBICSPLINE'
  sampler.output = [
    [0, 0, 0], [1, 1, 1], [0, 1, 0],
    [0, 0, 0], [1, 1, 1], [0, 0, 0],
  ]
  forgedUnboundAxis.track.sampleEvidence.forEach((sample: any) => {
    sample.glb.scale = [1, sample.timeSec === 0.5 ? 1.125 : 1, 1]
  })
  forgedUnboundAxis.track.comparison = policyGatedComparisonForSamples(
    forgedUnboundAxis.track.sampleEvidence,
    forgedUnboundAxis.track.comparison.modelHeightEvidence,
    { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 },
  )
  forgedUnboundAxis.report.reportSha256 = sourceMotionProofReportSha256(forgedUnboundAxis.report)
  forgedUnboundAxis.options.sourceMotionProof = assertV12SourceMotionProofReport(forgedUnboundAxis.report, forgedUnboundAxis.report.reportSha256)
  assert.throws(() => assertEmbeddedCharacterContract(10002, forgedUnboundAxis.fixture.validation, forgedUnboundAxis.fixture.glbJson, forgedUnboundAxis.options), /unbound scale\[1\] has an outgoing cubic tangent/)
})

test('v3 exact-static-channel preserves authored non-default values and verifies every sampler component', () => {
  const valid = exactStaticNonDefaultXChannelFixture()
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, valid.fixture.validation, valid.fixture.glbJson, valid.options))

  const changedUnboundDefault = exactStaticNonDefaultXChannelFixture()
  changedUnboundDefault.fixture.glbJson.animations[0].samplers[0].output = [[0.125, 0.25, 0], [0.125, 0.25, 0]]
  changedUnboundDefault.track.sampleEvidence.forEach((sample: any) => { sample.glb.translation[1] = 0.25 })
  changedUnboundDefault.track.comparison.translation.maxKeyError = 0.25
  changedUnboundDefault.track.comparison.translation.maxSampleError = 0.25
  assert.throws(() => assertEmbeddedCharacterContract(10002, changedUnboundDefault.fixture.validation, changedUnboundDefault.fixture.glbJson, changedUnboundDefault.options), /unbound translation\[1\] differs from source rest/)

  const movingConstantTangent = exactStaticNonDefaultXChannelFixture()
  movingConstantTangent.fixture.glbJson.animations[0].samplers[0] = {
    input: [[0], [1]],
    interpolation: 'CUBICSPLINE',
    output: [[0, 0, 0], [0.125, 0, 0], [0.1, 0, 0], [0, 0, 0], [0.125, 0, 0], [0, 0, 0]],
  }
  assert.throws(() => assertEmbeddedCharacterContract(10002, movingConstantTangent.fixture.validation, movingConstantTangent.fixture.glbJson, movingConstantTangent.options), /cubic tangent can create movement/)

  const movingUnboundTangent = exactStaticNonDefaultXChannelFixture()
  movingUnboundTangent.fixture.glbJson.animations[0].samplers[0] = {
    input: [[0], [1]],
    interpolation: 'CUBICSPLINE',
    output: [[0, 0, 0], [0.125, 0, 0], [0, 0.1, 0], [0, 0, 0], [0.125, 0, 0], [0, 0, 0]],
  }
  assert.throws(() => assertEmbeddedCharacterContract(10002, movingUnboundTangent.fixture.validation, movingUnboundTangent.fixture.glbJson, movingUnboundTangent.options), /unbound translation\[1\] has an outgoing cubic tangent/)
})

test('reviewed Hanae body-role witness cannot be reused for a different proof row', async () => {
  const fullGlbBytes = await readFile(String.raw`D:\Temp\stratonas-chibi-v12-full-acceptance-20260925-6d18e6c8\data\published\a6b416cf1f9a7b3dfcd257ca92c511ea7d2180f87f394aa1a54d5608b2787288\1182f8d3-d238-4db4-af1a-df4c7aa508e4.glb`)
  const evidence = await verifyApprovedHanaeBodyRoleWitness({
    projectRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    studentId: HANAE_BODY_ROLE_REVIEW_PINS.studentId,
    sourceIdentity: HANAE_BODY_ROLE_REVIEW_PINS.sourceIdentity,
    assetSha256: HANAE_BODY_ROLE_REVIEW_PINS.expectedGlbSha256,
    fullGlbBytes,
  })
  const { report } = staticMotionProofFixture()
  const boundedTrack = report.rows[0].tracks[1]
  boundedTrack.disposition = 'bounded-source-to-static'
  boundedTrack.comparison = policyGatedComparisonForSamples(boundedTrack.sampleEvidence, evidence)
  report.reportSha256 = sourceMotionProofReportSha256(report)
  assert.throws(() => assertV12SourceMotionProofReport(report, report.reportSha256), /belongs to another student/)
})

function sourceEvidenceProfile(weaponNames: string[] = [], equipmentRendererReferences = weaponNames.map((_, index) => sourceReference(`w${index + 1}`))) {
  const bodyReference = sourceReference('body')
  const bodyMaterial = sourceReference('body-material')
  const bodyShader = sourceReference('body-shader')
  const renderers = [{
    sourceReference: bodyReference,
    name: 'Character_Body',
    hierarchyPath: 'Character/Body',
    glbNodeIndex: 0,
    materialSlots: [{ slot: 0, sourceMaterialReference: bodyMaterial, sourceShaderReference: bodyShader, sourceShaderParsedName: 'MX/C-General/Layer4' }],
  }]
  const assemblyRenderers = [{ sourceReference: bodyReference, name: 'Character_Body', hierarchyPath: 'Character/Body' }]
  weaponNames.forEach((name, index) => {
    const reference = sourceReference(`w${index + 1}`)
    const materialReference = sourceReference(`m${index + 1}`)
    const shaderReference = sourceReference(`s${index + 1}`)
    renderers.push({
      sourceReference: reference,
      name,
      hierarchyPath: `Character/${name}`,
      glbNodeIndex: index + 1,
      materialSlots: [{
        slot: 0,
        sourceMaterialReference: materialReference,
        sourceShaderReference: shaderReference,
        sourceShaderParsedName: 'MX/C-Weapon',
      }],
    })
    assemblyRenderers.push({ sourceReference: reference, name, hierarchyPath: `Character/${name}` })
  })
  const coreRendererBlockers = equipmentRendererReferences.length === 0
    ? weaponNames.map((name, index) => ({
      sourceReference: sourceReference(`w${index + 1}`),
      name,
      hierarchyPath: `Character/${name}`,
      reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
      evidence: [`exact source renderer reference ${sourceReference(`w${index + 1}`).bundleSha256.toLowerCase()}:cab-character:w${index + 1}`],
      sourceMeshReference: null,
      sourceMaterialReferences: [],
      sourceShaderReferences: [],
    }))
    : []
  const profile = {
    schemaVersion: 2,
    profileVersion: CHIBI_RENDERING_PROFILE_VERSION,
    policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    renderers,
    coreRendererBlockers,
    excludedRenderers: [],
    excludedChildRendererEvents: [],
    validation: { valid: true, unresolved: [], excludedRenderers: [], excludedChildRendererEvents: [], coreRendererBlockers },
    assembly: {
      renderers: assemblyRenderers,
      attachments: { equipmentRendererReferences, equipmentRendererAmbiguities: [] },
    },
  }
  const validation = { valid: true, renderingProfile: { policyVersion: CHIBI_RENDERING_POLICY_VERSION, excludedRenderers: [], excludedChildRendererEvents: [] } }
  return { profile, validation, glbJson: { scene: 0, scenes: [{ extras: { chibi: { renderingProfile: profile } } }] } }
}

function structuralEvidenceProfile() {
  const fixture = sourceEvidenceProfile(['Fixture_Weapon'], []) as any
  const profile = fixture.profile as any
  profile.coreRendererBlockers = []
  profile.validation.coreRendererBlockers = []
  const body = profile.renderers[0]
  const weapon = profile.renderers[1]
  const bodyAssembly = profile.assembly.renderers[0]
  const weaponAssembly = profile.assembly.renderers[1]
  const bodyMeshReference = sourceReference('body-mesh')
  const weaponMeshReference = sourceReference('weapon-mesh')
  const weaponMaterialReference = profile.renderers[1].materialSlots[0].sourceMaterialReference
  const weaponShaderReference = profile.renderers[1].materialSlots[0].sourceShaderReference
  profile.renderers[1].materialSlots[0].sourceMaterialName = 'Fixture_Weapon_Material'
  profile.assembly.root = 'Character'
  profile.assembly.prefabReference = { ...weapon.sourceReference, objectId: 'prefab-root' }
  const sourcePointer = (pathId: string, name: string) => ({
    file: weapon.sourceReference.serializedFile,
    pathId,
    name,
    sourceReference: { ...weapon.sourceReference, objectId: pathId },
  })
  const prefabRoot = sourcePointer('root', 'Character')
  const boneRoot = sourcePointer('bone-root', 'bone_root')
  const bipRoot = sourcePointer('bip-root', 'Bip001')
  const weaponBone = sourcePointer('weapon-bone', 'Bip001_Weapon')
  const weaponRootBone = sourcePointer('weapon-root-bone', 'bone_weapon')
  const weaponLeaf = sourcePointer('weapon-leaf', 'Fixture_Weapon')
  const bodyBone = { file: 'CAB-character', pathId: 'body-bone', name: 'Bip001_Weapon' }
  body.rendererType = 'SkinnedMeshRenderer'
  body.sourceMesh = { file: 'CAB-character', pathId: bodyMeshReference.objectId, sourceReference: bodyMeshReference }
  body.glbNodeIndex = 1
  bodyAssembly.rendererType = 'SkinnedMeshRenderer'
  bodyAssembly.mesh = { file: bodyMeshReference.serializedFile, pathId: bodyMeshReference.objectId }
  bodyAssembly.meshSourceReference = bodyMeshReference
  bodyAssembly.boneReferences = [bodyBone]
  weapon.rendererType = 'SkinnedMeshRenderer'
  weapon.sourceMesh = { file: 'CAB-character', pathId: weaponMeshReference.objectId, sourceReference: weaponMeshReference }
  weapon.glbNodeIndex = 2
  weaponAssembly.rendererType = 'SkinnedMeshRenderer'
  weaponAssembly.mesh = { file: weaponMeshReference.serializedFile, pathId: weaponMeshReference.objectId }
  weaponAssembly.meshSourceReference = weaponMeshReference
  weaponAssembly.materialSlots = [{
    slot: 0,
    material: { file: weaponMaterialReference.serializedFile, pathId: weaponMaterialReference.objectId },
    sourceMaterialReference: weaponMaterialReference,
  }]
  weaponAssembly.rootBone = weaponRootBone
  weaponAssembly.transformChain = [prefabRoot, boneRoot, bipRoot, weaponBone, weaponLeaf]
  weaponAssembly.rootBoneAncestry = [prefabRoot, boneRoot, bipRoot, weaponBone]
  weaponAssembly.rootBoneAncestryComplete = true
  weaponAssembly.boneReferences = [weaponRootBone]
  const evidence = {
    classification: 'structurally-bound-equipment',
    reasonCode: 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY',
    reason: 'Source-authored transform/rootBone/bones prove a unique same-prefab equipment ancestry; no mainWeapon/subWeapon slot was inferred.',
    sourceReference: weapon.sourceReference,
    name: weapon.name,
    hierarchyPath: weapon.hierarchyPath,
    sourceMeshReference: weaponMeshReference,
    sourceMaterialReferences: [weaponMaterialReference],
    sourceShaderReferences: [weaponShaderReference],
    rootBone: weaponRootBone,
    transformChain: weaponAssembly.transformChain,
    boneReferences: weaponAssembly.boneReferences,
    rootBoneAncestry: weaponAssembly.rootBoneAncestry,
    matchedAncestorPointers: [weaponRootBone],
    bodyRendererReferences: [body.sourceReference],
    evidence: ['exact source renderer reference', 'exact source mesh reference', 'exact source material reference', 'unique non-conflicting same-prefab transform/bone relation'],
  }
  profile.equipmentBindingEvidence = [evidence]
  profile.validation.equipmentBindingEvidence = [evidence]
  fixture.glbJson.nodes = [
    { name: 'Character', children: [1, 2, 3] },
    { name: 'Character/Body', mesh: 0, extras: { chibi: { sourceRenderer: { sourceReference: body.sourceReference, sourceMeshReference: bodyMeshReference } } } },
    { name: 'Character/Fixture_Weapon', mesh: 1, skin: 0, extras: { chibi: { sourceRenderer: { sourceReference: weapon.sourceReference, sourceMeshReference: weaponMeshReference } } } },
    { name: 'bone_root', children: [4] },
    { name: 'Bip001', children: [5] },
    { name: 'Bip001_Weapon', children: [6] },
    { name: 'bone_weapon' },
  ]
  fixture.glbJson.skins = [{ joints: [6] }]
  profile.renderers[1].materialSlots[0].glb = { nodeIndex: 2, meshIndex: 1, primitiveIndices: [0], materialIndices: [0], materialIndex: 0 }
  fixture.glbJson.meshes = [{ primitives: [{}] }, { primitives: [{ material: 0 }] }]
  fixture.glbJson.materials = [{
    name: 'Fixture_Weapon_Material',
    extras: { chibi: { sourceMaterialReference: weaponMaterialReference, sourceShaderReference: weaponShaderReference } },
  }]
  fixture.glbJson.animations = [{
    name: 'Fixture_Idle',
    channels: [{ sampler: 0, target: { node: 6, path: 'rotation' }, transformDelta: [0, 0.25, 0, 0] }],
    samplers: [{ output: [[0, 0, 0, 1], [0, 0.25, 0, 1]] }],
  }]
  return fixture
}

function ioriTwoBranchStructuralProfile() {
  const fixture = structuralEvidenceProfile() as any
  const profile = fixture.profile
  const renderer = profile.renderers[1]
  const assemblyRenderer = profile.assembly.renderers[1]
  const evidence = profile.equipmentBindingEvidence[0]
  const bundleSha256 = '07c73123e8825ae111fd7a494704b10a9e7ca149981788f9832e87882810c45b'
  const serializedFile = 'CAB-94d6bf17a23f33ed2231bd9fcec738a4'
  const sourceReference = (objectId: string) => ({ bundleSha256, serializedFile, objectId })
  const sourcePointer = (pathId: string, name: string) => ({
    file: serializedFile,
    pathId,
    name,
    sourceReference: sourceReference(pathId),
  })
  const prefabRoot = sourcePointer('-1955054065273584124', 'Cafe_CH0064')
  const boneRoot = sourcePointer('iori-bone-root', 'bone_root')
  const bipRoot = sourcePointer('iori-bip-root', 'Bip001')
  const weaponAncestor = sourcePointer('iori-weapon-ancestor', 'Bip001_Weapon')
  const rootBone = sourcePointer('iori-bone-bottle', 'bone_bottle')
  const siblingBone = sourcePointer('iori-bone-can', 'bone_can')
  const rendererTransform = sourcePointer('iori-renderer-transform', 'CH0064_Weapon_Can')
  const rendererReference = sourceReference('-7687676924346612220')
  renderer.sourceReference = rendererReference
  renderer.name = 'CH0064_Weapon_Can'
  renderer.hierarchyPath = 'Cafe_CH0064/CH0064_Weapon_Can'
  renderer.glbNodeIndex = 2
  assemblyRenderer.sourceReference = rendererReference
  assemblyRenderer.name = renderer.name
  assemblyRenderer.hierarchyPath = renderer.hierarchyPath
  assemblyRenderer.rootBone = rootBone
  assemblyRenderer.rootBoneAncestry = [prefabRoot, boneRoot, bipRoot, weaponAncestor]
  assemblyRenderer.rootBoneAncestryComplete = true
  assemblyRenderer.transformChain = [prefabRoot, rendererTransform]
  assemblyRenderer.boneReferences = [siblingBone, rootBone]
  profile.assembly.root = 'Cafe_CH0064'
  profile.assembly.prefabReference = sourceReference('-1955054065273584124')
  profile.assembly.attachments = {
    ...profile.assembly.attachments,
    mainWeapon: [weaponAncestor],
  }
  evidence.sourceReference = rendererReference
  evidence.name = renderer.name
  evidence.hierarchyPath = renderer.hierarchyPath
  evidence.rootBone = rootBone
  evidence.rootBoneAncestry = assemblyRenderer.rootBoneAncestry
  evidence.transformChain = assemblyRenderer.transformChain
  evidence.boneReferences = assemblyRenderer.boneReferences
  evidence.matchedAncestorPointers = [rootBone]
  profile.validation.equipmentBindingEvidence = profile.equipmentBindingEvidence

  const body = profile.renderers[0]
  const bodyMeshReference = body.sourceMesh.sourceReference
  const weaponMeshReference = renderer.sourceMesh.sourceReference
  fixture.glbJson.nodes = [
    { name: 'Cafe_CH0064', children: [1, 2, 3] },
    { name: 'Cafe_CH0064/Body', mesh: 0, extras: { chibi: { sourceRenderer: { sourceReference: body.sourceReference, sourceMeshReference: bodyMeshReference } } } },
    { name: renderer.hierarchyPath, mesh: 1, skin: 0, extras: { chibi: { sourceRenderer: { sourceReference: rendererReference, sourceMeshReference: weaponMeshReference } } } },
    { name: 'bone_root', children: [4, 6] },
    { name: 'Bip001', children: [5] },
    { name: 'Bip001_Weapon', children: [7] },
    { name: 'bone_can' },
    { name: 'bone_bottle' },
  ]
  fixture.glbJson.skins = [{ joints: [6, 7], skeleton: 3 }]
  renderer.materialSlots[0].glb = { nodeIndex: 2, meshIndex: 1, primitiveIndices: [0], materialIndices: [0], materialIndex: 0 }
  fixture.glbJson.animations = [{
    name: 'Fixture_Idle',
    channels: [{ sampler: 0, target: { node: 4, path: 'rotation' }, transformDelta: [0, 0.25, 0, 0] }],
    samplers: [{ output: [[0, 0, 0, 1], [0, 0.25, 0, 1]] }],
  }]
  return fixture
}

function yuzuExactSourceWeaponAncestryProfile() {
  const fixture = structuralEvidenceProfile() as any
  const bundleSha256 = '9b9aac8f519d6d25e73c73999a437b70cb408506e78909394e07db85eb448eb6'
  const serializedFile = 'CAB-109a2ca26d78f45999b99f8de8c45486'
  const sourceReference = (objectId: string) => ({ bundleSha256, serializedFile, objectId })
  const sourcePointer = (pathId: string, name: string) => ({
    file: serializedFile,
    pathId,
    name,
    sourceReference: sourceReference(pathId),
  })
  const profile = fixture.profile
  const renderer = profile.renderers[1]
  const assemblyRenderer = profile.assembly.renderers[1]
  const rendererReference = sourceReference('-4530673887731245129')
  const prefabRoot = sourcePointer('-8346242249765150793', 'Cafe_Yuzu_Original')
  const boneRoot = sourcePointer('2656104549783314359', 'bone_root')
  const bipRoot = sourcePointer('7366732890214047671', 'Bip001')
  const weaponAncestor = sourcePointer('-8858145258142228553', 'Bip001_Weapon')
  const rootBone = sourcePointer('4940215449124609975', 'bone_bullet_02')
  const transformChain = [prefabRoot, sourcePointer('8962024818911354807', 'Yuzu_Original_Pike_Outline')]
  const rootBoneAncestry = [prefabRoot, boneRoot, bipRoot, weaponAncestor]
  const boneReferences = [
    rootBone,
    sourcePointer('-926668186153574473', 'bone_bullet_02_01'),
    sourcePointer('-781802123778383945', 'bone_bullet_02_up_01'),
    sourcePointer('269809573755494327', 'bone_bullet_02_up_02'),
    sourcePointer('-1213324774961111113', 'bone_bullet_02_up_04'),
    sourcePointer('3185945571472711607', 'bone_bullet_02_up_03'),
  ]
  const profilePointer = ({ sourceReference: _sourceReference, ...pointer }: any) => pointer
  const evidence = profile.equipmentBindingEvidence[0]

  renderer.sourceReference = rendererReference
  renderer.name = 'Yuzu_Original_Pike_Outline'
  renderer.hierarchyPath = 'Cafe_Yuzu_Original/Yuzu_Original_Pike_Outline'
  assemblyRenderer.sourceReference = rendererReference
  assemblyRenderer.name = renderer.name
  assemblyRenderer.hierarchyPath = renderer.hierarchyPath
  assemblyRenderer.rootBone = structuredClone(rootBone)
  assemblyRenderer.transformChain = structuredClone(transformChain)
  assemblyRenderer.boneReferences = structuredClone(boneReferences)
  assemblyRenderer.rootBoneAncestry = structuredClone(rootBoneAncestry)
  assemblyRenderer.rootBoneAncestryComplete = true
  profile.assembly.root = 'Cafe_Yuzu_Original'
  profile.assembly.prefabReference = sourceReference('-5426903104025649225')
  profile.assembly.attachments = {
    ...profile.assembly.attachments,
    mainWeapon: [structuredClone(weaponAncestor)],
  }

  evidence.classification = 'structurally-bound-equipment'
  evidence.reasonCode = 'EXACT_SOURCE_WEAPON_ANCESTRY'
  evidence.reason = 'Source rootBone.m_Father ancestry reaches exactly one full-identity mainWeapon/subWeapon pointer.'
  evidence.sourceReference = rendererReference
  evidence.name = renderer.name
  evidence.hierarchyPath = renderer.hierarchyPath
  evidence.rootBone = profilePointer(rootBone)
  evidence.transformChain = transformChain.map(profilePointer)
  evidence.rootBoneAncestry = structuredClone(rootBoneAncestry)
  evidence.boneReferences = boneReferences.map(profilePointer)
  evidence.matchedAncestorPointers = [profilePointer(weaponAncestor)]
  evidence.evidence = [
    'exact source renderer reference',
    'exact source mesh reference',
    'exact source material reference',
    'source rootBone.m_Father ancestry reaches exactly one authored mainWeapon/subWeapon pointer',
    'body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique',
    'unique non-conflicting full-source weapon ancestor relation',
  ]
  profile.validation.equipmentBindingEvidence = [evidence]
  const body = profile.renderers[0]
  const bodyNodeIndex = 2
  const rendererNodeIndex = 12
  const boneNodes = [
    { name: 'bone_bullet_02', children: [7, 8, 9, 10, 11] },
    { name: 'bone_bullet_02_01' },
    { name: 'bone_bullet_02_up_01' },
    { name: 'bone_bullet_02_up_02' },
    { name: 'bone_bullet_02_up_04' },
    { name: 'bone_bullet_02_up_03' },
  ]
  fixture.glbJson.nodes = [
    { name: 'RootNode', children: [1] },
    { name: 'Cafe_Yuzu_Original', children: [bodyNodeIndex, 3, rendererNodeIndex] },
    {
      name: 'Character/Body', mesh: 0,
      extras: { chibi: { sourceRenderer: { sourceReference: body.sourceReference, sourceMeshReference: body.sourceMesh.sourceReference } } },
    },
    { name: 'bone_root', children: [4] },
    { name: 'Bip001', children: [5] },
    { name: 'Bip001_Weapon', children: [6] },
    ...boneNodes,
    {
      name: renderer.hierarchyPath, mesh: 1, skin: 0,
      extras: { chibi: { sourceRenderer: { sourceReference: rendererReference, sourceMeshReference: renderer.sourceMesh.sourceReference } } },
    },
  ]
  body.glbNodeIndex = bodyNodeIndex
  renderer.glbNodeIndex = rendererNodeIndex
  profile.renderers[1].materialSlots[0].glb.nodeIndex = rendererNodeIndex
  fixture.glbJson.skins = [{ joints: [6, 7, 8, 9, 10, 11], skeleton: 6 }]
  fixture.glbJson.animations = [{
    name: 'Fixture_Idle',
    channels: [{ sampler: 0, target: { node: 4, path: 'rotation' }, transformDelta: [0, 0.00828365, 0, 0] }],
    samplers: [{ output: [[0, 0, 0, 1], [0, 0.00828365, 0, 1]] }],
  }]
  return fixture
}

test('embedded acceptance contract proves deterministic exclusions and equipment core coverage', () => {
  const coreReference = sourceReference('core')
  const excludedReference = sourceReference('excluded')
  const excluded = {
    sourceReference: excludedReference,
    name: 'PresentationGlow',
    hierarchyPath: 'FX/PresentationGlow',
    reasonCode: 'PRESENTATION_SHADER_OR_MATERIAL',
    evidence: ['exact source presentation branch evidence'],
    sourceMesh: null,
    materials: [],
  }
  const profile = {
    schemaVersion: 2,
    profileVersion: CHIBI_RENDERING_PROFILE_VERSION,
    policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    renderers: [{ sourceReference: coreReference, name: 'CharacterWeapon', hierarchyPath: 'Character/Weapon', glbNodeIndex: 0 }],
    excludedRenderers: [excluded],
    excludedChildRendererEvents: [],
    validation: { valid: true, unresolved: [], excludedRenderers: [excluded], excludedChildRendererEvents: [] },
    assembly: {
      renderers: [
        { sourceReference: coreReference, name: 'CharacterWeapon', hierarchyPath: 'Character/Weapon' },
        { sourceReference: excludedReference, name: 'PresentationGlow', hierarchyPath: 'FX/PresentationGlow' },
      ],
      attachments: { equipmentRenderers: ['CharacterWeapon'], equipmentRendererReferences: [coreReference], equipmentRendererAmbiguities: [] },
    },
  }
  const validation = { valid: true, renderingProfile: { policyVersion: CHIBI_RENDERING_POLICY_VERSION, excludedRenderers: [excluded], excludedChildRendererEvents: [] } }
  const glbJson = { scene: 0, scenes: [{ extras: { chibi: { renderingProfile: profile } } }] }
  const result = assertEmbeddedCharacterContract(10002, validation, glbJson)
  assert.deepEqual(result.equipmentRendererReferences, [`${coreReference.bundleSha256}:cab-character:core`])

  assert.throws(() => assertEmbeddedCharacterContract(10002, { ...validation, renderingProfile: { ...validation.renderingProfile, policyVersion: 'stale-policy' } }, glbJson), /stale policyVersion/)
  const equipmentExcluded = structuredClone(profile)
  equipmentExcluded.assembly.attachments.equipmentRendererReferences = [excludedReference]
  equipmentExcluded.assembly.attachments.equipmentRenderers = ['PresentationGlow']
  const excludedGlb = { scene: 0, scenes: [{ extras: { chibi: { renderingProfile: equipmentExcluded } } }] }
  assert.throws(() => assertEmbeddedCharacterContract(10002, validation, excludedGlb), /equipment renderer .* excluded/)
})

test('v12 resume validates only artifacts carrying the pinned v9 profile and v12 policy versions', () => {
  const fixture = sourceEvidenceProfile() as any
  fixture.profile.profileVersion = 'chibi-rendering-profile-v9'
  fixture.profile.policyVersion = 'chibi-rendering-policy-v12'
  fixture.validation.renderingProfile.policyVersion = 'chibi-rendering-policy-v12'
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, {
    renderingVersionContract: v12RenderingVersionContract,
  }))
  assert.throws(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson), /stale profileVersion/)

  const wrongPolicy = structuredClone(fixture)
  wrongPolicy.validation.renderingProfile.policyVersion = CHIBI_RENDERING_POLICY_VERSION
  assert.throws(() => assertEmbeddedCharacterContract(10002, wrongPolicy.validation, wrongPolicy.glbJson, {
    renderingVersionContract: v12RenderingVersionContract,
  }), /stale policyVersion/)

  const wrongProfile = structuredClone(fixture)
  wrongProfile.profile.profileVersion = CHIBI_RENDERING_PROFILE_VERSION
  assert.throws(() => assertEmbeddedCharacterContract(10002, wrongProfile.validation, wrongProfile.glbJson, {
    renderingVersionContract: v12RenderingVersionContract,
  }), /stale profileVersion/)
})

test('historical v12 artifact readers select only columns present in its frozen schema', () => {
  assert.deepEqual(V12_ACCEPTANCE_ASSET_SELECT, {
    id: true, checksum: true, fileKey: true, published: true, validation: true,
  })
  assert.deepEqual(V12_ACCEPTANCE_IMPORT_ITEM_SELECT, {
    studentId: true, status: true, diagnostic: true, sourceIdentity: true, fingerprint: true, assetId: true,
    asset: { select: V12_ACCEPTANCE_ASSET_SELECT },
  })
  assert.deepEqual(V12_ACCEPTANCE_BINDING_SELECT, {
    studentId: true, status: true, sourceIdentity: true, profile: true,
    asset: { select: V12_ACCEPTANCE_ASSET_SELECT },
  })

  const serializedSelections = JSON.stringify([
    V12_ACCEPTANCE_ASSET_SELECT,
    V12_ACCEPTANCE_IMPORT_ITEM_SELECT,
    V12_ACCEPTANCE_BINDING_SELECT,
  ])
  assert.doesNotMatch(serializedSelections, /processingTiming|coreFingerprint(?:SchemaVersion)?/)
})

test('full-roster acceptance fails closed for exact weapon evidence without an equipment relation', () => {
  const cases = [
    [10015, ['Aris_Original_Weapon']],
    [10026, ['Neru_Original_Weapon_Chain', 'Neru_Original_Weapon_01', 'Neru_Original_Weapon_02']],
    [10031, ['Aru_Newyear_Weapon', 'Aru_Newyear_Hagoita']],
    [10036, ['Hinata_Original_Weapon', 'Hinata_Original_Mk19_Outline']],
  ] as const
  for (const [studentId, weaponNames] of cases) {
    const fixture = sourceEvidenceProfile([...weaponNames], [])
    assert.throws(
      () => assertEmbeddedCharacterContract(studentId, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
      /unresolved equipment renderer relation/,
      `student ${studentId} must not pass with exact weapon source evidence and no relation`,
    )
  }
})

test('pilot acceptance remains permissive for a source relation gap', () => {
  const fixture = sourceEvidenceProfile(['Aris_Original_Weapon'], [])
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10015, fixture.validation, fixture.glbJson))
})

test('full-roster acceptance allows a character with no exact weapon evidence', () => {
  const fixture = sourceEvidenceProfile([], [])
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))
})

test('published profile valid and unresolved gates remain fail-closed', () => {
  const invalid = sourceEvidenceProfile([], []) as any
  invalid.glbJson.scenes[0].extras.chibi.renderingProfile.validation.valid = false
  assert.throws(() => assertEmbeddedCharacterContract(10002, invalid.validation, invalid.glbJson), /rendering profile is not valid/)

  const unresolved = sourceEvidenceProfile([], []) as any
  unresolved.glbJson.scenes[0].extras.chibi.renderingProfile.validation.unresolved = ['equipment renderer relation unresolved']
  assert.throws(() => assertEmbeddedCharacterContract(10002, unresolved.validation, unresolved.glbJson), /unresolved\/core blockers/)
})

test('full-roster acceptance accepts every exact weapon relation when references are present', () => {
  const fixture = sourceEvidenceProfile(['Aru_Newyear_Weapon', 'Aru_Newyear_Hagoita'])
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10031, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))
})

test('full-roster acceptance does not require an attachment for a retained core renderer from shader identity alone', () => {
  for (const [studentId, name] of [[10007, 'Maki_Original_Mount_outline'], [20000, 'Hibiki_Original_Bag_Outline']] as const) {
    const fixture = sourceEvidenceProfile([name], []) as any
    fixture.profile.coreRendererBlockers = []
    fixture.profile.validation.coreRendererBlockers = []
    assert.doesNotThrow(
      () => assertEmbeddedCharacterContract(studentId, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
      `retained core renderer ${name} should not become a fabricated equipment relation`,
    )
  }
})

test('full-roster acceptance accepts a structurally-bound equipment record with GLB movement proof', () => {
  const fixture = structuralEvidenceProfile()
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))
})

function repeatedSourceMaterialSlotProfile() {
  const fixture = structuralEvidenceProfile() as any
  const renderer = fixture.profile.renderers[1]
  const assemblyRenderer = fixture.profile.assembly.renderers[1]
  const evidence = fixture.profile.equipmentBindingEvidence[0]
  const rendererSlot = structuredClone(renderer.materialSlots[0])
  rendererSlot.slot = 1
  renderer.materialSlots.push(rendererSlot)
  const assemblySlot = structuredClone(assemblyRenderer.materialSlots[0])
  assemblySlot.slot = 1
  assemblyRenderer.materialSlots.push(assemblySlot)
  evidence.sourceMaterialReferences.push(structuredClone(evidence.sourceMaterialReferences[0]))
  evidence.sourceShaderReferences.push(structuredClone(evidence.sourceShaderReferences[0]))
  return fixture
}

test('full-roster acceptance preserves repeated source material identities across exact source slots', () => {
  const fixture = repeatedSourceMaterialSlotProfile()
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))
})

test('full-roster acceptance rejects missing, extra, or mismatched repeated material-slot evidence', () => {
  const missingEvidence = repeatedSourceMaterialSlotProfile()
  missingEvidence.profile.equipmentBindingEvidence[0].sourceMaterialReferences.pop()
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, missingEvidence.validation, missingEvidence.glbJson, { requireEquipmentRelations: true }),
    /material slot identities differ from its core renderer/,
  )

  const extraEvidence = repeatedSourceMaterialSlotProfile()
  extraEvidence.profile.equipmentBindingEvidence[0].sourceMaterialReferences.push(structuredClone(extraEvidence.profile.equipmentBindingEvidence[0].sourceMaterialReferences[0]))
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, extraEvidence.validation, extraEvidence.glbJson, { requireEquipmentRelations: true }),
    /material slot identities differ from its core renderer/,
  )

  const missingAssemblySlot = repeatedSourceMaterialSlotProfile()
  missingAssemblySlot.profile.assembly.renderers[1].materialSlots.pop()
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, missingAssemblySlot.validation, missingAssemblySlot.glbJson, { requireEquipmentRelations: true }),
    /material slot identities differ from its source assembly/,
  )

  const mismatchedProfileSlot = repeatedSourceMaterialSlotProfile()
  mismatchedProfileSlot.profile.renderers[1].materialSlots[1].sourceMaterialReference = sourceReference('wrong-material')
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, mismatchedProfileSlot.validation, mismatchedProfileSlot.glbJson, { requireEquipmentRelations: true }),
    /material slot identities differ from its core renderer/,
  )
})

test('structural fallback may omit rootBone ancestry when exact source and GLB ancestry are complete', () => {
  const fixture = structuralEvidenceProfile() as any
  fixture.profile.equipmentBindingEvidence[0].rootBoneAncestry = []
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))
})

test('structural fallback with empty evidence ancestry still requires exact source and GLB ancestry', () => {
  const missingChain = structuralEvidenceProfile() as any
  missingChain.profile.equipmentBindingEvidence[0].rootBoneAncestry = []
  missingChain.profile.assembly.renderers[1].rootBoneAncestry = []
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, missingChain.validation, missingChain.glbJson, { requireEquipmentRelations: true }),
    /source rootBone ancestry is empty/,
  )

  const missingIdentity = structuralEvidenceProfile() as any
  missingIdentity.profile.equipmentBindingEvidence[0].rootBoneAncestry = []
  delete missingIdentity.profile.assembly.renderers[1].rootBoneAncestry[1].sourceReference
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, missingIdentity.validation, missingIdentity.glbJson, { requireEquipmentRelations: true }),
    /sourceReference must be an object/,
  )
})

test('legacy structural ancestry summaries are accepted only when their tuples match the full source chain', () => {
  const matchingLegacyEvidence = structuralEvidenceProfile() as any
  matchingLegacyEvidence.profile.equipmentBindingEvidence[0].rootBoneAncestry = structuredClone(matchingLegacyEvidence.profile.assembly.renderers[1].rootBoneAncestry)
  for (const pointer of matchingLegacyEvidence.profile.equipmentBindingEvidence[0].rootBoneAncestry) {
    delete pointer.sourceReference
  }
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, matchingLegacyEvidence.validation, matchingLegacyEvidence.glbJson, { requireEquipmentRelations: true }))

  for (const [field, value] of [['pathId', 'wrong-path'], ['name', 'wrong-name'], ['file', 'CAB-other']] as const) {
    const mismatchedLegacyEvidence = structuralEvidenceProfile() as any
    mismatchedLegacyEvidence.profile.equipmentBindingEvidence[0].rootBoneAncestry = structuredClone(mismatchedLegacyEvidence.profile.assembly.renderers[1].rootBoneAncestry)
    for (const pointer of mismatchedLegacyEvidence.profile.equipmentBindingEvidence[0].rootBoneAncestry) {
      delete pointer.sourceReference
    }
    mismatchedLegacyEvidence.profile.equipmentBindingEvidence[0].rootBoneAncestry[1][field] = value
    assert.throws(
      () => assertEmbeddedCharacterContract(10002, mismatchedLegacyEvidence.validation, mismatchedLegacyEvidence.glbJson, { requireEquipmentRelations: true }),
      /outside its exact source file|differs from the source evidence chain/,
      `legacy ancestry ${field} mismatch must not be accepted`,
    )
  }
})

test('rootBone ancestry mapping tolerates duplicate names off-path but rejects multiple candidates on the selected path', () => {
  const offPathDuplicate = structuralEvidenceProfile() as any
  const duplicateIndex = offPathDuplicate.glbJson.nodes.length
  offPathDuplicate.glbJson.nodes[1].children = [duplicateIndex]
  offPathDuplicate.glbJson.nodes.push({ name: 'bone_root' })
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, offPathDuplicate.validation, offPathDuplicate.glbJson, { requireEquipmentRelations: true }))

  const onPathDuplicate = structuralEvidenceProfile() as any
  const duplicatePathCandidate = onPathDuplicate.glbJson.nodes.length
  onPathDuplicate.glbJson.nodes[0].children.push(duplicatePathCandidate)
  onPathDuplicate.glbJson.nodes.push({ name: 'bone_root' })
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, onPathDuplicate.validation, onPathDuplicate.glbJson, { requireEquipmentRelations: true }),
    /bone_root is not uniquely mapped on the GLB ancestry path under Character/,
  )
})

test('full-roster acceptance accepts Yuzu exact weapon ancestry above the renderer root and bones', () => {
  const fixture = yuzuExactSourceWeaponAncestryProfile()
  const evidence = fixture.profile.equipmentBindingEvidence[0]
  const matched = evidence.matchedAncestorPointers[0]
  const rendererPointers = [evidence.rootBone, ...evidence.transformChain, ...evidence.boneReferences]
  const pointerKey = (pointer: any) => `${pointer.file}:${pointer.pathId}:${pointer.name}`
  assert.equal(rendererPointers.some((pointer: any) => pointerKey(pointer) === pointerKey(matched)), false)

  const result = assertEmbeddedCharacterContract(10018, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true })
  assert.deepEqual(result.structurallyBoundEquipmentReferences, [
    '9b9aac8f519d6d25e73c73999a437b70cb408506e78909394e07db85eb448eb6:cab-109a2ca26d78f45999b99f8de8c45486:-4530673887731245129',
  ])
})

test('Yuzu structural equipment accepts inherited motion on its exact source-validated GLB ancestor', () => {
  const fixture = yuzuExactSourceWeaponAncestryProfile() as any
  const result = assertEmbeddedCharacterContract(10018, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true })
  assert.deepEqual(result.structurallyBoundEquipmentReferences, [
    '9b9aac8f519d6d25e73c73999a437b70cb408506e78909394e07db85eb448eb6:cab-109a2ca26d78f45999b99f8de8c45486:-4530673887731245129',
  ])
  assert.deepEqual(fixture.glbJson.skins[0].joints, [6, 7, 8, 9, 10, 11])
  assert.equal(fixture.glbJson.animations[0].channels[0].target.node, 4)
})

test('exact source weapon evidence cannot omit its claimed rootBone ancestry', () => {
  const fixture = yuzuExactSourceWeaponAncestryProfile() as any
  fixture.profile.equipmentBindingEvidence[0].rootBoneAncestry = []
  assert.throws(
    () => assertEmbeddedCharacterContract(10018, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /has no rootBone ancestry/,
  )
})

test('Iori structural equipment accepts its source-authored can and bottle joint branches', () => {
  const fixture = ioriTwoBranchStructuralProfile() as any
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10023, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))
  assert.deepEqual(fixture.glbJson.skins[0].joints, [6, 7])
  assert.equal(fixture.glbJson.skins[0].skeleton, 3, 'the optional LCA skeleton node is not required to be a source bone joint.')
  assert.deepEqual(fixture.profile.assembly.renderers[1].rootBoneAncestry.map((pointer: any) => pointer.name), [
    'Cafe_CH0064', 'bone_root', 'Bip001', 'Bip001_Weapon',
  ])
})

test('structural equipment rejects missing or ambiguous source-joint mappings', () => {
  const missing = ioriTwoBranchStructuralProfile() as any
  const missingIndex = missing.glbJson.nodes.length
  missing.glbJson.nodes[0].children.push(missingIndex)
  missing.glbJson.nodes.push({ name: 'unmapped_joint' })
  missing.glbJson.skins[0].joints.push(missingIndex)
  assert.throws(
    () => assertEmbeddedCharacterContract(10023, missing.validation, missing.glbJson, { requireEquipmentRelations: true }),
    /not uniquely identified by source bone references/,
  )

  const ambiguous = ioriTwoBranchStructuralProfile() as any
  const duplicateIndex = ambiguous.glbJson.nodes.length
  ambiguous.glbJson.nodes[3].children.push(duplicateIndex)
  ambiguous.glbJson.nodes.push({ name: 'bone_can' })
  ambiguous.glbJson.skins[0].joints.push(duplicateIndex)
  assert.throws(
    () => assertEmbeddedCharacterContract(10023, ambiguous.validation, ambiguous.glbJson, { requireEquipmentRelations: true }),
    /not uniquely mapped to its source bone reference/,
  )
})

test('structural equipment rejects a wrong rootBone ancestry and a skin with no joint on that branch', () => {
  const wrongPath = ioriTwoBranchStructuralProfile() as any
  const wrongAncestry = structuredClone(wrongPath.profile.assembly.renderers[1].rootBoneAncestry)
  wrongAncestry[3].name = 'Wrong_Weapon_Ancestor'
  wrongPath.profile.assembly.renderers[1].rootBoneAncestry = wrongAncestry
  wrongPath.profile.equipmentBindingEvidence[0].rootBoneAncestry = structuredClone(wrongAncestry)
  assert.throws(
    () => assertEmbeddedCharacterContract(10023, wrongPath.validation, wrongPath.glbJson, { requireEquipmentRelations: true }),
    /Wrong_Weapon_Ancestor is not uniquely mapped on the GLB ancestry path/,
  )

  const noRootBoneJoint = ioriTwoBranchStructuralProfile() as any
  noRootBoneJoint.glbJson.skins[0].joints = [6]
  assert.throws(
    () => assertEmbeddedCharacterContract(10023, noRootBoneJoint.validation, noRootBoneJoint.glbJson, { requireEquipmentRelations: true }),
    /does not map contiguously onto any GLB skin-joint parent path through its rootBone/,
  )
})

test('structural equipment rejects a source-mapped joint outside the selected prefab root', () => {
  const fixture = ioriTwoBranchStructuralProfile() as any
  const assemblyRenderer = fixture.profile.assembly.renderers[1]
  const evidence = fixture.profile.equipmentBindingEvidence[0]
  const outsideReference = {
    ...assemblyRenderer.boneReferences[0].sourceReference,
    objectId: 'bone-outside-prefab',
  }
  const outsideBone = {
    file: assemblyRenderer.boneReferences[0].file,
    pathId: 'bone-outside-prefab',
    name: 'bone_outside_prefab',
    sourceReference: outsideReference,
  }
  assemblyRenderer.boneReferences.push(outsideBone)
  evidence.boneReferences = assemblyRenderer.boneReferences
  const outsideIndex = fixture.glbJson.nodes.length
  fixture.glbJson.nodes.push({ name: 'bone_outside_prefab' })
  fixture.glbJson.skins[0].joints.push(outsideIndex)
  assert.throws(
    () => assertEmbeddedCharacterContract(10023, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /GLB skin joint .* is outside the selected prefab root/,
  )
})

test('structural equipment rejects non-zero motion on a sibling presentation branch and zero rootBone-ancestor motion', () => {
  const unrelated = ioriTwoBranchStructuralProfile() as any
  const cameraIndex = unrelated.glbJson.nodes.length
  unrelated.glbJson.nodes[0].children.push(cameraIndex)
  unrelated.glbJson.nodes.push({ name: 'Presentation_Camera' })
  unrelated.glbJson.animations[0].channels[0].target.node = cameraIndex
  assert.throws(
    () => assertEmbeddedCharacterContract(10023, unrelated.validation, unrelated.glbJson, { requireEquipmentRelations: true }),
    /no relevant animation channel with a non-zero transform delta/,
  )

  const zero = ioriTwoBranchStructuralProfile() as any
  zero.glbJson.animations[0].channels[0].transformDelta = [0, 0, 0, 0]
  zero.glbJson.animations[0].samplers[0].output = [[0, 0, 0, 1], [0, 0, 0, 1]]
  assert.throws(
    () => assertEmbeddedCharacterContract(10023, zero.validation, zero.glbJson, { requireEquipmentRelations: true }),
    /no relevant animation channel with a non-zero transform delta/,
  )
})

test('Yuzu structural movement ignores animated camera or scene nodes outside the exact skin parent path', () => {
  const fixture = yuzuExactSourceWeaponAncestryProfile() as any
  const cameraIndex = fixture.glbJson.nodes.length
  fixture.glbJson.nodes[0].children.push(cameraIndex)
  fixture.glbJson.nodes.push({ name: 'Acceptance_Camera' })
  fixture.glbJson.animations[0].channels[0].target.node = cameraIndex
  assert.throws(
    () => assertEmbeddedCharacterContract(10018, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /no relevant animation channel with a non-zero transform delta/,
  )
})

test('Yuzu structural movement does not accept action on an unrelated same-name node', () => {
  const fixture = yuzuExactSourceWeaponAncestryProfile() as any
  const unrelatedIndex = fixture.glbJson.nodes.length
  fixture.glbJson.nodes[0].children.push(unrelatedIndex)
  fixture.glbJson.nodes.push({ name: 'Bip001' })
  fixture.glbJson.animations[0].channels[0].target.node = unrelatedIndex
  assert.throws(
    () => assertEmbeddedCharacterContract(10018, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /no relevant animation channel with a non-zero transform delta/,
  )
})

test('Yuzu structural movement rejects duplicate source ancestry identities', () => {
  const fixture = yuzuExactSourceWeaponAncestryProfile() as any
  const assemblyRenderer = fixture.profile.assembly.renderers[1]
  const evidence = fixture.profile.equipmentBindingEvidence[0]
  assemblyRenderer.rootBoneAncestry.push(structuredClone(assemblyRenderer.rootBoneAncestry[2]))
  evidence.rootBoneAncestry.push(structuredClone(evidence.rootBoneAncestry[2]))
  fixture.profile.validation.equipmentBindingEvidence = fixture.profile.equipmentBindingEvidence
  assert.throws(
    () => assertEmbeddedCharacterContract(10018, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /duplicate rootBone ancestry pointers/,
  )
})

test('Yuzu structural movement rejects zero-delta motion on the exact source ancestor', () => {
  const fixture = yuzuExactSourceWeaponAncestryProfile() as any
  fixture.glbJson.animations[0].channels[0].transformDelta = [0, 0, 0, 0]
  fixture.glbJson.animations[0].samplers[0].output = [[0, 0, 0, 1], [0, 0, 0, 1]]
  assert.throws(
    () => assertEmbeddedCharacterContract(10018, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /no relevant animation channel with a non-zero transform delta/,
  )
})

test('Yuzu exact weapon ancestry rejects a missing or different matched parent pointer', () => {
  const missing = yuzuExactSourceWeaponAncestryProfile() as any
  missing.profile.equipmentBindingEvidence[0].matchedAncestorPointers = []
  assert.throws(
    () => assertEmbeddedCharacterContract(10018, missing.validation, missing.glbJson, { requireEquipmentRelations: true }),
    /no matched source ancestor/,
  )

  const wrong = yuzuExactSourceWeaponAncestryProfile() as any
  wrong.profile.equipmentBindingEvidence[0].matchedAncestorPointers = [{
    file: 'CAB-109a2ca26d78f45999b99f8de8c45486',
    pathId: '-8858145258142228554',
    name: 'Bip001_Weapon',
  }]
  assert.throws(
    () => assertEmbeddedCharacterContract(10018, wrong.validation, wrong.glbJson, { requireEquipmentRelations: true }),
    /matched ancestor is not unique in its exact source parent chain/,
  )
})

test('full-roster acceptance compares structural pointers by serialized identity when assembly provenance is present', () => {
  const fixture = structuralEvidenceProfile() as any
  const assemblyRenderer = fixture.profile.assembly.renderers[1]
  const withSourceReference = (pointer: any) => ({
    ...pointer,
    sourceReference: {
      ...assemblyRenderer.sourceReference,
      objectId: pointer.pathId,
    },
  })
  assemblyRenderer.rootBone = withSourceReference(assemblyRenderer.rootBone)
  assemblyRenderer.transformChain = assemblyRenderer.transformChain.map(withSourceReference)
  assemblyRenderer.boneReferences = assemblyRenderer.boneReferences.map(withSourceReference)
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))

  const tampered = structuralEvidenceProfile() as any
  const tamperedAssemblyRenderer = tampered.profile.assembly.renderers[1]
  tamperedAssemblyRenderer.rootBone = withSourceReference({ ...tamperedAssemblyRenderer.rootBone, pathId: 'wrong-root' })
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, tampered.validation, tampered.glbJson, { requireEquipmentRelations: true }),
    /rootBone differs from source assembly/,
  )
})

test('full-roster acceptance accepts structural movement proof with explicit zero body-bone overlap', () => {
  const fixture = structuralEvidenceProfile() as any
  fixture.profile.equipmentBindingEvidence[0].bodyRendererReferences = []
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }))
})

test('structurally-bound equipment fails when source transform ancestry leaves the selected prefab hierarchy', () => {
  const fixture = structuralEvidenceProfile() as any
  const wrongChain = [
    { file: 'CAB-character', pathId: 'root', name: 'Character' },
    { file: 'CAB-character', pathId: 'unrelated', name: 'Unrelated_Branch' },
    { file: 'CAB-character', pathId: 'weapon-leaf', name: 'Fixture_Weapon' },
  ]
  fixture.profile.assembly.renderers[1].transformChain = wrongChain
  fixture.profile.equipmentBindingEvidence[0].transformChain = wrongChain
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /no exact same-prefab transform ancestry/,
  )
})

test('structurally-bound equipment fails without a non-zero authored action delta', () => {
  const fixture = structuralEvidenceProfile() as any
  fixture.glbJson.animations[0].channels[0].transformDelta = [0, 0, 0, 0]
  fixture.glbJson.animations[0].samplers[0].output = [[0, 0, 0, 1], [0, 0, 0, 1]]
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true }),
    /no relevant animation channel with a non-zero transform delta/,
  )
})

test('structurally-bound equipment fails when its source mesh/material identity or GLB skin binding is tampered', () => {
  const meshTampered = structuralEvidenceProfile() as any
  meshTampered.profile.equipmentBindingEvidence[0].sourceMeshReference = sourceReference('wrong-mesh')
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, meshTampered.validation, meshTampered.glbJson, { requireEquipmentRelations: true }),
    /source mesh identity differs/,
  )

  const skinTampered = structuralEvidenceProfile() as any
  skinTampered.glbJson.nodes[skinTampered.profile.renderers[1].glbNodeIndex].skin = undefined
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, skinTampered.validation, skinTampered.glbJson, { requireEquipmentRelations: true }),
    /no GLB skin binding/,
  )

  const materialTampered = structuralEvidenceProfile() as any
  materialTampered.glbJson.materials[0].extras.chibi.sourceMaterialReference = sourceReference('wrong-material')
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, materialTampered.validation, materialTampered.glbJson, { requireEquipmentRelations: true }),
    /lost its exact GLB source material identity/,
  )

  const provenanceTampered = structuralEvidenceProfile() as any
  provenanceTampered.glbJson.nodes[provenanceTampered.profile.renderers[1].glbNodeIndex].extras.chibi.sourceRenderer.sourceReference = sourceReference('wrong-renderer')
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, provenanceTampered.validation, provenanceTampered.glbJson, { requireEquipmentRelations: true }),
    /lost its exact GLB source renderer identity/,
  )

  const blockerTampered = structuralEvidenceProfile() as any
  blockerTampered.profile.coreRendererBlockers = [{ sourceReference: blockerTampered.profile.equipmentBindingEvidence[0].sourceReference }]
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, blockerTampered.validation, blockerTampered.glbJson, { requireEquipmentRelations: true }),
    /conflicts with excluded\/core renderer classification/,
  )
})

test('structurally-bound equipment checks every available authored action, while unsupported actions are not fabricated', () => {
  const fixture = structuralEvidenceProfile() as any
  fixture.glbJson.animations.push({
    name: 'Fixture_Walk',
    channels: [{ sampler: 0, target: { node: 2, path: 'rotation' }, transformDelta: [0, 0, 0, 0] }],
    samplers: [{ output: [[0, 0, 0, 1], [0, 0, 0, 1]] }],
  })
  const actionProfile = {
    initialPose: 'Fixture_Idle',
    interactions: {
      idle: { state: 'available', clip: 'Fixture_Idle' },
      walk: { state: 'available', clip: 'Fixture_Walk' },
      pickup: { state: 'unsupported', reason: 'No pickup motion authored.' },
      touch: { state: 'unsupported', reason: 'No touch motion authored.' },
    },
  }
  assert.throws(
    () => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson, { requireEquipmentRelations: true, actionProfile }),
    /authored action Fixture_Walk has no relevant animation channel with a non-zero transform delta/,
  )
})

test('pilot acceptance remains permissive for malformed structural equipment evidence', () => {
  const fixture = structuralEvidenceProfile() as any
  fixture.glbJson.animations[0].channels[0].transformDelta = [0, 0, 0, 0]
  fixture.profile.equipmentBindingEvidence[0].sourceMaterialReferences = []
  assert.doesNotThrow(() => assertEmbeddedCharacterContract(10002, fixture.validation, fixture.glbJson))
})
