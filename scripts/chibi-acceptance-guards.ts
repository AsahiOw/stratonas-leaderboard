import assert from 'node:assert/strict'
import { lstat, readdir, realpath, stat } from 'node:fs/promises'
import { lstatSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ACCEPTANCE_PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const ACCEPTANCE_DATABASE_PREFIX = /^chibi[-_]acceptance[-_][a-z0-9][a-z0-9_-]*$/i
export const TEST_DATABASE_PREFIX = /^chibi[-_]test[-_][a-z0-9][a-z0-9_-]*$/i
export const ACCEPTANCE_PHASES = ['before-restart', 'after-restart', 'repeat', 'selective-rebuild'] as const
export const PERSISTED_ACCEPTANCE_PHASES = ['before-restart', 'after-restart', 'repeat'] as const

export type AcceptancePhase = typeof ACCEPTANCE_PHASES[number]
export type PersistedAcceptancePhase = typeof PERSISTED_ACCEPTANCE_PHASES[number]

export type AcceptanceCheckpointArtifact = {
  assetId: string
  checksum: string
  fileKey: string
  bytes: number
  bytesHash: string
}

export type AcceptanceCheckpoint = {
  version: 1
  phase: PersistedAcceptancePhase
  jobId?: string
  dataDir: string
  sourceDir: string
  databaseName: string
  schema: string
  rosterMode: 'pilot' | 'full'
  rosterVersion: number
  rosterChecksum: string
  studentId: number
  artifact: AcceptanceCheckpointArtifact
}

const NORMAL_DATA_ROOTS = [
  path.resolve(ACCEPTANCE_PROJECT_ROOT, 'Development_data', 'chibi'),
  path.resolve(ACCEPTANCE_PROJECT_ROOT, 'Production_data', 'chibi'),
  path.resolve(ACCEPTANCE_PROJECT_ROOT, 'public', 'assets', 'chibi'),
]

function normalized(value: string) {
  return path.resolve(value).replace(/[\\/]+$/, '').toLowerCase()
}

export function pathsOverlap(left: string, right: string) {
  const a = normalized(left)
  const b = normalized(right)
  return a === b || a.startsWith(`${b}${path.sep}`) || b.startsWith(`${a}${path.sep}`)
}

export function requireAbsolutePath(name: string, value: string | undefined) {
  assert.ok(value?.trim(), `${name} is required.`)
  assert.ok(path.isAbsolute(value!.trim()), `${name} must be an absolute path.`)
  const resolved = path.resolve(value!.trim())
  const root = path.parse(resolved).root
  assert.notEqual(normalized(resolved), normalized(root), `${name} must not be a filesystem root.`)
  assert.notEqual(normalized(resolved), normalized(ACCEPTANCE_PROJECT_ROOT), `${name} must not be the repository root.`)
  return resolved
}

export function assertOutsideNormalRoots(name: string, value: string) {
  assert.ok(!NORMAL_DATA_ROOTS.some(root => pathsOverlap(value, root)), `${name} overlaps a normal or published data root; use a disposable path outside the repository.`)
  return value
}

export function assertOutsideRepository(name: string, value: string) {
  assert.ok(!pathsOverlap(value, ACCEPTANCE_PROJECT_ROOT), `${name} overlaps the repository; use a disposable path outside the checkout.`)
  return value
}

export function assertIsolatedRoots(input: {
  sourceDir?: string
  dataDir: string | undefined
  toolsDir?: string
}) {
  const dataDir = assertOutsideRepository('CHIBI_DATA_DIR', assertOutsideNormalRoots('CHIBI_DATA_DIR', requireAbsolutePath('CHIBI_DATA_DIR', input.dataDir)))
  const toolsDir = input.toolsDir === undefined ? undefined : assertOutsideRepository('CHIBI_TOOLS_DIR', assertOutsideNormalRoots('CHIBI_TOOLS_DIR', requireAbsolutePath('CHIBI_TOOLS_DIR', input.toolsDir)))
  const sourceDir = input.sourceDir === undefined ? undefined : requireAbsolutePath('CHIBI_SOURCE_DIR', input.sourceDir)

  const physical = (value: string) => {
    try { return realpathSync.native(value) } catch { return value }
  }
  const physicalDataDir = physical(dataDir)
  const physicalToolsDir = toolsDir ? physical(toolsDir) : undefined
  const physicalSourceDir = sourceDir ? physical(sourceDir) : undefined
  assertOutsideRepository('CHIBI_DATA_DIR', assertOutsideNormalRoots('CHIBI_DATA_DIR', physicalDataDir))
  if (physicalToolsDir) assertOutsideRepository('CHIBI_TOOLS_DIR', assertOutsideNormalRoots('CHIBI_TOOLS_DIR', physicalToolsDir))
  if (physicalSourceDir) assertOutsideNormalRoots('CHIBI_SOURCE_DIR', physicalSourceDir)
  if (physicalSourceDir) {
    assert.ok(!pathsOverlap(physicalSourceDir, physicalDataDir), 'CHIBI_SOURCE_DIR and CHIBI_DATA_DIR must not overlap.')
    if (physicalToolsDir) assert.ok(!pathsOverlap(physicalSourceDir, physicalToolsDir), 'CHIBI_SOURCE_DIR and CHIBI_TOOLS_DIR must not overlap.')
  }
  if (physicalToolsDir) assert.ok(!pathsOverlap(physicalDataDir, physicalToolsDir), 'CHIBI_DATA_DIR and CHIBI_TOOLS_DIR must not overlap.')
  for (const [name, value] of [['CHIBI_DATA_DIR', dataDir], ['CHIBI_TOOLS_DIR', toolsDir]] as const) {
    if (!value) continue
    try { assert.ok(!lstatSync(value).isSymbolicLink(), `${name} must not be a symbolic link; use a real disposable directory.`) } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error
    }
  }

  if (sourceDir) {
    assert.ok(!pathsOverlap(sourceDir, dataDir), 'CHIBI_SOURCE_DIR and CHIBI_DATA_DIR must not overlap.')
    if (toolsDir) assert.ok(!pathsOverlap(sourceDir, toolsDir), 'CHIBI_SOURCE_DIR and CHIBI_TOOLS_DIR must not overlap.')
  }
  if (toolsDir) assert.ok(!pathsOverlap(dataDir, toolsDir), 'CHIBI_DATA_DIR and CHIBI_TOOLS_DIR must not overlap.')
  return { sourceDir, dataDir, toolsDir }
}

export function databaseNameAndSchema(rawUrl: string) {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.')
  }
  assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol), 'DATABASE_URL must use postgres:// or postgresql://.')
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
  const schema = parsed.searchParams.get('schema') || ''
  const options = parsed.searchParams.get('options') || ''
  const decodedOptions = decodeURIComponent(options.replace(/\+/g, ' '))
  const searchPath = decodedOptions.match(/(?:^|[\s,])search_path\s*=\s*["']?([^\s,"']+)/i)?.[1] || ''
  return { parsed, databaseName, schema, options: decodedOptions, searchPath }
}

export function assertDisposableDatabaseUrl(rawUrl: string | undefined, options: { allowTestPrefix?: boolean } = {}) {
  assert.ok(rawUrl?.trim(), 'DATABASE_URL is required.')
  const details = databaseNameAndSchema(rawUrl!.trim())
  const targets = [details.databaseName, details.schema, details.searchPath, details.options]
  const matches = (prefix: RegExp) => targets.some(target => prefix.test(target))
  const accepted = matches(ACCEPTANCE_DATABASE_PREFIX) || (options.allowTestPrefix === true && matches(TEST_DATABASE_PREFIX))
  assert.ok(accepted, 'The database or schema must have a disposable chibi-acceptance-* name (chibi-test-* is allowed only for legacy smoke tests).')
  assert.ok(!targets.some(target => /^stratonas(?:[-_]|$)/i.test(target)), 'The normal stratonas database/schema is not allowed for acceptance checks.')
  return details
}

export function assertMaintenanceDisabled(environment: Readonly<Record<string, string | undefined>> = process.env) {
  assert.equal(environment.MAINTENANCE_SCHEDULER, 'disabled', 'Set MAINTENANCE_SCHEDULER=disabled for an isolated acceptance run.')
}

export function assertAcceptancePhase(value: string | undefined): AcceptancePhase {
  assert.ok(value && (ACCEPTANCE_PHASES as readonly string[]).includes(value), `--phase must be one of: ${ACCEPTANCE_PHASES.join(', ')}.`)
  return value as AcceptancePhase
}

export function checkpointPath(dataDir: string, phase: PersistedAcceptancePhase) {
  const root = assertOutsideRepository('CHIBI_DATA_DIR', assertOutsideNormalRoots('CHIBI_DATA_DIR', requireAbsolutePath('CHIBI_DATA_DIR', dataDir)))
  try {
    assert.ok(!lstatSync(root).isSymbolicLink(), 'CHIBI_DATA_DIR must not be a symbolic link when writing an acceptance checkpoint.')
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error
  }
  const acceptedPhase = assertAcceptancePhase(phase)
  assert.notEqual(acceptedPhase, 'selective-rebuild', 'Selective rebuild does not create a checkpoint.')
  const target = path.join(root, '.acceptance', `${acceptedPhase}.json`)
  const relative = path.relative(root, target)
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Acceptance checkpoint must remain below CHIBI_DATA_DIR.')
  return target
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, name: string) {
  assert.ok(typeof value === 'string' && value.trim(), `${name} must be a non-empty string.`)
  return value.trim()
}

export function assertCheckpointState(value: unknown, expected: {
  phase?: PersistedAcceptancePhase
  jobId?: string
  dataDir?: string
  sourceDir?: string
  databaseName?: string
  schema?: string
  rosterMode?: 'pilot' | 'full'
  rosterVersion?: number
  rosterChecksum?: string
  studentId?: number
} = {}): AcceptanceCheckpoint {
  assert.ok(isRecord(value), 'Acceptance checkpoint must be a JSON object.')
  assert.equal(value.version, 1, 'Unsupported acceptance checkpoint version.')
  const phase = assertAcceptancePhase(typeof value.phase === 'string' ? value.phase : undefined)
  assert.ok((PERSISTED_ACCEPTANCE_PHASES as readonly string[]).includes(phase), 'Selective rebuild cannot produce a checkpoint.')
  const dataDir = assertOutsideRepository('checkpoint.dataDir', assertOutsideNormalRoots('checkpoint.dataDir', requireAbsolutePath('checkpoint.dataDir', requiredString(value.dataDir, 'checkpoint.dataDir'))))
  const sourceDir = requireAbsolutePath('checkpoint.sourceDir', requiredString(value.sourceDir, 'checkpoint.sourceDir'))
  const databaseName = requiredString(value.databaseName, 'checkpoint.databaseName')
  const schema = requiredString(value.schema, 'checkpoint.schema')
  assert.ok(ACCEPTANCE_DATABASE_PREFIX.test(databaseName) || ACCEPTANCE_DATABASE_PREFIX.test(schema), 'checkpoint.databaseName or checkpoint.schema must use a chibi-acceptance-* name.')
  assert.ok(!/^stratonas(?:[-_]|$)/i.test(databaseName), 'checkpoint.databaseName may not name the normal stratonas database.')
  assert.ok(!/^stratonas(?:[-_]|$)/i.test(schema), 'checkpoint.schema may not name the normal stratonas schema.')
  assert.ok(value.rosterMode === 'pilot' || value.rosterMode === 'full', 'checkpoint.rosterMode must be either pilot or full.')
  assert.ok(typeof value.rosterVersion === 'number' && Number.isInteger(value.rosterVersion) && value.rosterVersion >= 1, 'checkpoint.rosterVersion must be a positive integer.')
  const rosterChecksum = requiredString(value.rosterChecksum, 'checkpoint.rosterChecksum')
  assert.match(rosterChecksum, /^[a-f0-9]{64}$/i, 'checkpoint.rosterChecksum must be a SHA-256 hex digest.')
  assert.ok(typeof value.studentId === 'number' && Number.isInteger(value.studentId) && value.studentId >= 10000 && value.studentId <= 99999, 'checkpoint.studentId must be an eligible five-digit student id.')
  const jobId = value.jobId === undefined ? undefined : requiredString(value.jobId, 'checkpoint.jobId')
  if (jobId !== undefined) assert.match(jobId, /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/, 'checkpoint.jobId must be an exact safe import job id.')
  const artifactValue = value.artifact
  assert.ok(isRecord(artifactValue), 'checkpoint.artifact must be an object.')
  const artifact = {
    assetId: requiredString(artifactValue.assetId, 'checkpoint.artifact.assetId'),
    checksum: requiredString(artifactValue.checksum, 'checkpoint.artifact.checksum'),
    fileKey: requiredString(artifactValue.fileKey, 'checkpoint.artifact.fileKey'),
    bytes: artifactValue.bytes,
    bytesHash: requiredString(artifactValue.bytesHash, 'checkpoint.artifact.bytesHash'),
  }
  assert.match(artifact.checksum, /^[a-f0-9]{64}$/i, 'checkpoint.artifact.checksum must be a SHA-256 hex digest.')
  assert.match(artifact.bytesHash, /^[a-f0-9]{64}$/i, 'checkpoint.artifact.bytesHash must be a SHA-256 hex digest.')
  assert.equal(artifact.bytesHash.toLowerCase(), artifact.checksum.toLowerCase(), 'checkpoint artifact checksum and bytesHash must match.')
  assert.ok(typeof artifact.bytes === 'number' && Number.isInteger(artifact.bytes) && artifact.bytes >= 4, 'checkpoint.artifact.bytes must be a positive byte count.')
  assert.ok(!artifact.fileKey.includes('\\') && !artifact.fileKey.includes(':'), 'checkpoint.artifact.fileKey must use POSIX separators and no drive prefix.')
  const fileSegments = artifact.fileKey.split('/')
  assert.ok(fileSegments.every(segment => segment && segment !== '.' && segment !== '..'), 'checkpoint.artifact.fileKey must be a relative, traversal-free path.')
  assert.ok(!path.posix.isAbsolute(artifact.fileKey), 'checkpoint.artifact.fileKey must be relative.')

  if (expected.phase) assert.equal(phase, expected.phase, 'Acceptance checkpoint phase does not match the requested phase.')
  if (expected.jobId) assert.equal(jobId, expected.jobId, 'Acceptance checkpoint belongs to a different import job.')
  if (expected.dataDir) assert.equal(normalized(dataDir), normalized(expected.dataDir), 'Acceptance checkpoint belongs to a different CHIBI_DATA_DIR.')
  if (expected.sourceDir) assert.equal(normalized(sourceDir), normalized(expected.sourceDir), 'Acceptance checkpoint belongs to a different CHIBI_SOURCE_DIR.')
  if (expected.databaseName) assert.equal(databaseName, expected.databaseName, 'Acceptance checkpoint belongs to a different disposable database.')
  if (expected.schema) assert.equal(schema, expected.schema, 'Acceptance checkpoint belongs to a different database schema.')
  if (expected.rosterMode) assert.equal(value.rosterMode, expected.rosterMode, 'Acceptance checkpoint belongs to a different roster mode.')
  if (expected.rosterVersion !== undefined) assert.equal(value.rosterVersion, expected.rosterVersion, 'Acceptance checkpoint belongs to a different roster version.')
  if (expected.rosterChecksum) assert.equal(rosterChecksum.toLowerCase(), expected.rosterChecksum.toLowerCase(), 'Acceptance checkpoint belongs to a different roster checksum.')
  if (expected.studentId !== undefined) assert.equal(value.studentId, expected.studentId, 'Acceptance checkpoint belongs to a different student.')
  return {
    version: 1,
    phase: phase as PersistedAcceptancePhase,
    ...(jobId ? { jobId } : {}),
    dataDir,
    sourceDir,
    databaseName,
    schema,
    rosterMode: value.rosterMode,
    rosterVersion: value.rosterVersion as number,
    rosterChecksum,
    studentId: value.studentId as number,
    artifact: {
      assetId: artifact.assetId,
      checksum: artifact.checksum,
      fileKey: artifact.fileKey,
      bytes: artifact.bytes as number,
      bytesHash: artifact.bytesHash,
    },
  }
}

export function assertRepeatCheckpointChain(
  before: AcceptanceCheckpoint | null,
  after: AcceptanceCheckpoint | null,
  repeat: AcceptanceCheckpoint | null,
) {
  assert.ok(before?.phase === 'before-restart', 'Repeat import requires the exact run’s before-restart checkpoint.')
  assert.ok(after?.phase === 'after-restart', 'Repeat import requires a completed after-restart checkpoint; refusing to import before restart verification.')
  assert.ok(after.jobId, 'After-restart checkpoint must pin the exact first import job before repeat import.')
  if (before.jobId) assert.equal(after.jobId, before.jobId, 'After-restart checkpoint belongs to a different first import job.')
  assert.deepEqual({
    dataDir: after.dataDir,
    sourceDir: after.sourceDir,
    databaseName: after.databaseName,
    schema: after.schema,
    rosterMode: after.rosterMode,
    rosterVersion: after.rosterVersion,
    rosterChecksum: after.rosterChecksum,
    studentId: after.studentId,
    artifact: after.artifact,
  }, {
    dataDir: before.dataDir,
    sourceDir: before.sourceDir,
    databaseName: before.databaseName,
    schema: before.schema,
    rosterMode: before.rosterMode,
    rosterVersion: before.rosterVersion,
    rosterChecksum: before.rosterChecksum,
    studentId: before.studentId,
    artifact: before.artifact,
  }, 'After-restart checkpoint does not match the exact before-restart run and artifact.')
  assert.equal(repeat, null, `Repeat phase already has a checkpoint${repeat?.jobId ? ` for job ${repeat.jobId}` : ''}; refusing another Import / Update.`)
  return after
}

export function assertOnlyExpectedImportJob(jobIds: readonly string[], expectedJobId: string) {
  assert.match(expectedJobId, /^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/, 'Acceptance requires an exact safe import job id.')
  assert.deepEqual([...jobIds].sort(), [expectedJobId], `Acceptance requires only the exact first import job ${expectedJobId}; another or repeat job already exists.`)
}

export async function assertBaadSource(sourceDir: string) {
  const source = await realpath(sourceDir).catch(() => { throw new Error(`CHIBI_SOURCE_DIR does not exist: ${sourceDir}`) })
  const sourceStat = await stat(source)
  assert.ok(sourceStat.isDirectory(), `CHIBI_SOURCE_DIR is not a directory: ${source}`)
  for (const required of ['AssetBundles', 'MediaResources', 'TableBundles']) {
    const requiredPath = path.join(source, required)
    const requiredStat = await stat(requiredPath).catch(() => null)
    assert.ok(requiredStat?.isDirectory(), `BAAD source is missing the required directory ${required}.`)
  }
  return source
}

async function collectEntries(root: string, relative = ''): Promise<string[]> {
  const current = path.join(root, relative)
  const entries = await readdir(current, { withFileTypes: true }).catch(error => {
    if (error?.code === 'ENOENT' && !relative) return []
    throw error
  })
  const result: string[] = []
  for (const entry of entries) {
    const entryRelative = path.join(relative, entry.name)
    const fullPath = path.join(root, entryRelative)
    const info = await lstat(fullPath)
    assert.ok(!info.isSymbolicLink(), `Acceptance output may not contain symlinks: ${fullPath}`)
    if (info.isDirectory()) result.push(...await collectEntries(root, entryRelative))
    else result.push(entryRelative)
  }
  return result.sort()
}

export async function outputEntries(dataDir: string) {
  return collectEntries(dataDir)
}

export async function assertOutputEmpty(dataDir: string) {
  const entries = await outputEntries(dataDir)
  assert.deepEqual(entries, [], `CHIBI_DATA_DIR must be empty before import; found ${entries.slice(0, 8).join(', ')}${entries.length > 8 ? ' …' : ''}.`)
}

export function assertSafeOutputPath(name: string, value: string | undefined) {
  const output = requireAbsolutePath(name, value)
  assertOutsideNormalRoots(name, output)
  return output
}

export function assertAcceptanceEnvironment(input: {
  sourceDir?: string
  dataDir?: string
  toolsDir?: string
  databaseUrl?: string
  requireSource?: boolean
  allowTestDatabase?: boolean
  environment?: Readonly<Record<string, string | undefined>>
}) {
  const environment = input.environment || process.env
  const roots = assertIsolatedRoots({
    sourceDir: input.requireSource === false ? undefined : input.sourceDir,
    dataDir: input.dataDir,
    toolsDir: input.toolsDir,
  })
  const database = assertDisposableDatabaseUrl(input.databaseUrl, { allowTestPrefix: input.allowTestDatabase })
  assertMaintenanceDisabled(environment)
  if (input.requireSource !== false) assert.ok(roots.sourceDir, 'CHIBI_SOURCE_DIR is required for acceptance.')
  return { ...roots, database }
}

export function assertExplicitOptIn(args: readonly string[], environment: NodeJS.ProcessEnv = process.env) {
  assert.ok(args.includes('--run'), 'Dry preflight only. Pass --run and set CHIBI_ACCEPTANCE_RUN=true to drive an Admin import.')
  assert.equal(environment.CHIBI_ACCEPTANCE_RUN, 'true', 'Set CHIBI_ACCEPTANCE_RUN=true together with --run to authorize an import.')
}
