import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import {
  ACCEPTANCE_PROJECT_ROOT,
  assertAcceptancePhase,
  assertCheckpointState,
  assertDisposableDatabaseUrl,
  assertIsolatedRoots,
  assertMaintenanceDisabled,
  assertOnlyExpectedImportJob,
  assertOutsideNormalRoots,
  assertOutsideRepository,
  assertRepeatCheckpointChain,
  checkpointPath,
  databaseNameAndSchema,
  requireAbsolutePath,
} from './chibi-acceptance-guards'

test('acceptance guards require an explicit disposable database name', () => {
  assert.equal(databaseNameAndSchema('postgresql://user:pass@localhost:5432/chibi-acceptance-unit').databaseName, 'chibi-acceptance-unit')
  assert.doesNotThrow(() => assertDisposableDatabaseUrl('postgresql://user:pass@localhost:5432/chibi-acceptance-unit'))
  assert.doesNotThrow(() => assertDisposableDatabaseUrl('postgresql://user:pass@localhost:5432/app?schema=chibi-acceptance-unit'))
  assert.doesNotThrow(() => assertDisposableDatabaseUrl('postgresql://user:pass@localhost:5432/app?options=-c%20search_path%3Dchibi-acceptance-unit'))
  assert.throws(() => assertDisposableDatabaseUrl('postgresql://user:pass@localhost:5432/stratonas'), /disposable chibi-acceptance/)
})

test('acceptance guards reject repository roots and normal chibi storage', () => {
  assert.throws(() => requireAbsolutePath('CHIBI_DATA_DIR', ACCEPTANCE_PROJECT_ROOT), /repository root/)
  assert.throws(() => requireAbsolutePath('CHIBI_DATA_DIR', 'relative/acceptance-data'), /absolute path/)
  assert.throws(() => assertOutsideNormalRoots('CHIBI_DATA_DIR', path.join(ACCEPTANCE_PROJECT_ROOT, 'Development_data', 'chibi')), /normal or published data root/)
  assert.throws(() => assertOutsideRepository('CHIBI_DATA_DIR', path.join(ACCEPTANCE_PROJECT_ROOT, 'acceptance-data')), /overlaps the repository/)
  assert.throws(() => assertIsolatedRoots({ dataDir: path.join(ACCEPTANCE_PROJECT_ROOT, 'Development_data', 'chibi'), toolsDir: path.join(ACCEPTANCE_PROJECT_ROOT, 'Development_data', 'chibi-tools') }), /normal or published data root/)
})

test('acceptance guards require the maintenance scheduler to be disabled', () => {
  assert.doesNotThrow(() => assertMaintenanceDisabled({ MAINTENANCE_SCHEDULER: 'disabled' }))
  assert.throws(() => assertMaintenanceDisabled({ MAINTENANCE_SCHEDULER: 'enabled' }), /MAINTENANCE_SCHEDULER=disabled/)
})

test('acceptance phases and checkpoints are explicit and isolated', () => {
  const dataDir = path.join(path.parse(ACCEPTANCE_PROJECT_ROOT).root, 'tmp', 'chibi-acceptance-phase-test')
  assert.equal(assertAcceptancePhase('before-restart'), 'before-restart')
  assert.equal(assertAcceptancePhase('after-restart'), 'after-restart')
  assert.equal(assertAcceptancePhase('repeat'), 'repeat')
  assert.equal(assertAcceptancePhase('selective-rebuild'), 'selective-rebuild')
  assert.throws(() => assertAcceptancePhase('unknown'), /--phase must be one of/)
  const checkpoint = checkpointPath(dataDir, 'before-restart')
  assert.ok(!path.relative(dataDir, checkpoint).startsWith('..'))
  assert.match(checkpoint, /\.acceptance[\\/]before-restart\.json$/)
  assert.throws(() => checkpointPath(dataDir, 'selective-rebuild' as never), /does not create a checkpoint/)
})

test('checkpoint state validation rejects phase, identity, and artifact escapes', () => {
  const dataDir = path.join(path.parse(ACCEPTANCE_PROJECT_ROOT).root, 'tmp', 'chibi-acceptance-checkpoint-test')
  const sourceDir = path.join(ACCEPTANCE_PROJECT_ROOT, 'Development_data', 'BAAD')
  const valid = {
    version: 1,
    phase: 'before-restart',
    jobId: 'initial-job-1',
    dataDir,
    sourceDir,
    databaseName: 'chibi-acceptance-checkpoint',
    schema: 'public',
    rosterMode: 'pilot',
    rosterVersion: 1,
    rosterChecksum: 'c'.repeat(64),
    studentId: 10002,
    artifact: { assetId: 'asset-1', checksum: 'a'.repeat(64), fileKey: 'published/a.glb', bytes: 4, bytesHash: 'a'.repeat(64) },
  }
  assert.equal(assertCheckpointState(valid, { dataDir, sourceDir, rosterMode: 'pilot', rosterVersion: 1, rosterChecksum: 'c'.repeat(64), studentId: 10002 }).artifact.fileKey, 'published/a.glb')
  assert.throws(() => assertCheckpointState({ ...valid, jobId: 'bad/job' }), /exact safe import job id/)
  assert.throws(() => assertCheckpointState({ ...valid, phase: 'selective-rebuild' }), /Selective rebuild cannot produce a checkpoint/)
  assert.throws(() => assertCheckpointState({ ...valid, artifact: { ...valid.artifact, fileKey: '../outside.glb' } }), /traversal-free/)
  assert.throws(() => assertCheckpointState({ ...valid, databaseName: 'stratonas' }), /chibi-acceptance/)
  assert.throws(() => assertCheckpointState({ ...valid, artifact: { ...valid.artifact, bytesHash: 'b'.repeat(64) } }), /must match/)
  assert.throws(() => assertCheckpointState({ ...valid, rosterMode: 'full' }, { rosterMode: 'pilot' }), /different roster mode/)
  assert.throws(() => assertCheckpointState({ ...valid, rosterChecksum: 'b'.repeat(64) }, { rosterChecksum: 'c'.repeat(64) }), /different roster checksum/)
})

test('repeat acceptance requires the matching restart checkpoint and refuses repeat retries', () => {
  const dataDir = path.join(path.parse(ACCEPTANCE_PROJECT_ROOT).root, 'tmp', 'chibi-acceptance-repeat-test')
  const sourceDir = path.join(ACCEPTANCE_PROJECT_ROOT, 'Development_data', 'BAAD')
  const shared = {
    version: 1 as const,
    dataDir,
    sourceDir,
    databaseName: 'chibi-acceptance-repeat-test',
    schema: 'public',
    rosterMode: 'pilot' as const,
    rosterVersion: 1,
    rosterChecksum: 'c'.repeat(64),
    studentId: 10002,
    artifact: { assetId: 'asset-1', checksum: 'a'.repeat(64), fileKey: 'published/a.glb', bytes: 4, bytesHash: 'a'.repeat(64) },
  }
  const before = { ...shared, phase: 'before-restart' as const, jobId: 'initial-job-1' }
  const after = { ...shared, phase: 'after-restart' as const, jobId: 'initial-job-1' }
  const repeat = { ...shared, phase: 'repeat' as const, jobId: 'repeat-job-2' }
  assert.equal(assertRepeatCheckpointChain(before, after, null).jobId, 'initial-job-1')
  assert.throws(() => assertRepeatCheckpointChain(before, null, null), /requires a completed after-restart checkpoint/)
  assert.throws(() => assertRepeatCheckpointChain(before, { ...after, jobId: 'other-job-2' }, null), /different first import job/)
  assert.throws(() => assertRepeatCheckpointChain(before, { ...after, artifact: { ...after.artifact, assetId: 'other-asset' } }, null), /different first import job|does not match the exact before-restart run/)
  assert.throws(() => assertRepeatCheckpointChain(before, after, repeat), /already has a checkpoint.*repeat-job-2.*refusing another Import \/ Update/)
})

test('restart and repeat phases refuse any extra import job beside the pinned first job', () => {
  assert.doesNotThrow(() => assertOnlyExpectedImportJob(['initial-job-1'], 'initial-job-1'))
  assert.throws(() => assertOnlyExpectedImportJob([], 'initial-job-1'), /requires only the exact first import job/)
  assert.throws(() => assertOnlyExpectedImportJob(['initial-job-1', 'repeat-job-2'], 'initial-job-1'), /another or repeat job already exists/)
  assert.throws(() => assertOnlyExpectedImportJob(['other-job-2'], 'initial-job-1'), /another or repeat job already exists/)
})
