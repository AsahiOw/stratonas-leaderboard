import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const { Client } = pg

export const V12_DATABASE_NAME = 'chibi-acceptance-v12-full-20260925-6d18e6c8'
export const V12_JOB_ID = 'cmug1gz1u0000hgkpxt74ocrt'
export const V12_ADMIN_ID = 'cmugithb70000bokpold2c1eu'
export const V12_ADMIN_EMAIL = 'chibi-v12-recovery-34b53b5475cf4707b958de40e766ba3f@example.invalid'
export const V12_BASELINE_SHA256 = 'd774513d180ba5ff164ba0e8c728b20774d91454aed12ed9b3ccdf7f075f74bd'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUN_ROOT = String.raw`D:\Temp\stratonas-chibi-v12-full-acceptance-20260925-6d18e6c8`
const EVIDENCE_ROOT = path.join(RUN_ROOT, 'evidence')
const DATA_DIR = path.join(RUN_ROOT, 'data')
const SOURCE_DIR = String.raw`D:\Temp\stratonas-chibi-v7-full-20260923-8c41f9\BAAD-readonly`
const TOOLS_DIR = String.raw`D:\Temp\stratonas-chibi-v11-full-20260924\tools`
const APP_ORIGIN = 'http://localhost:3137'
const APP_PID = 35324
const WORKER_PID = 13812
const LIVE_WORKER_MAX_AGE_MS = 90_000
const CHROME_PATH = String.raw`C:\Users\hatua\.cache\puppeteer\chrome\win64-152.0.7977.42\chrome-win64\chrome.exe`
const BLOCKER_SNAPSHOT_SHA256 = '897bcba6e3ac36ba00cf40d7427d9f6b779ece44e0848ddc23d7e30635e3f391'
const ROSTER_SNAPSHOT_SHA256 = '595ea4672b954eddabdf4f51adb1192f49a7da29faefad94a998e8dcb414ed05'
const TERMINAL_SIDECAR_SHA256 = '5c94f37650d8744a8c380eef1cd009ad5d63172a34ede34513fea7c49892cdcf'
const TABLE_ORDER = ['ChibiAsset', 'StudentChibiBinding', 'ChibiImportJob', 'ChibiImportItem', 'ChibiSourceCandidate']
const EXPECTED_ROWS = { ChibiAsset: 238, StudentChibiBinding: 238, ChibiImportJob: 1, ChibiImportItem: 275, ChibiSourceCandidate: 871 }

const sha256 = value => createHash('sha256').update(value).digest('hex')

export function quoteIdentifier(identifier) {
  assert.match(identifier, /^[A-Za-z_][A-Za-z0-9_]*$/, 'SQL identifier must be a simple identifier.')
  return `"${identifier.replaceAll('"', '""')}"`
}

export function buildProjectionSql(spec) {
  assert.ok(spec && typeof spec === 'object', 'Projection spec is required.')
  assert.ok(Array.isArray(spec.columns) && spec.columns.length > 0, 'Projection columns are required.')
  assert.ok(spec.columns.includes(spec.primaryKey), 'Projection primary key must be selected.')
  return `SELECT ${spec.columns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(spec.table)} ORDER BY ${quoteIdentifier(spec.primaryKey)} ASC`
}

export function parseBaselineMarkdown(markdown) {
  assert.ok(markdown.includes(V12_DATABASE_NAME), 'Baseline database identity is missing.')
  assert.ok(markdown.includes('chibi-v12-business-table-v1'), 'Baseline canonical digest version is missing.')
  const specs = new Map()
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('| `')) continue
    const cells = line.split('|').map(cell => cell.trim())
    const table = cells[1]?.replaceAll('`', '')
    if (!TABLE_ORDER.includes(table)) continue
    if (cells.length !== 7) continue
    assert.ok(!specs.has(table), `Baseline repeats ${table}.`)
    const primaryKey = cells[2]?.replaceAll('`', '')
    const columns = cells[3]?.split(',').map(column => column.trim().replaceAll('`', ''))
    const rows = Number(cells[4])
    const digest = cells[5]?.replaceAll('`', '')
    assert.ok(primaryKey && Array.isArray(columns) && columns.length > 0, `Baseline projection for ${table} is invalid.`)
    assert.ok(columns.includes(primaryKey), `Baseline projection for ${table} omits its key.`)
    assert.equal(rows, EXPECTED_ROWS[table], `Baseline row count for ${table} is invalid.`)
    assert.match(digest ?? '', /^[a-f0-9]{64}$/, `Baseline digest for ${table} is invalid.`)
    specs.set(table, { table, primaryKey, columns, rows, digest })
  }
  assert.deepEqual([...specs.keys()], TABLE_ORDER, 'Baseline must contain the exact five v12 business tables in documented order.')
  return [...specs.values()]
}

export function canonicalJson(value) {
  const normalize = item => {
    if (item instanceof Date) return item.toISOString()
    if (Array.isArray(item)) return item.map(normalize)
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.keys(item).sort((left, right) => left < right ? -1 : left > right ? 1 : 0).map(key => [key, normalize(item[key])]))
    }
    return item
  }
  return JSON.stringify(normalize(value))
}

export function parseUtcNaiveTimestamp(timestampText) {
  assert.match(timestampText, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/, 'Expected a PostgreSQL timestamp without timezone at millisecond precision.')
  const [date, timeAndFraction] = timestampText.split(' ')
  const [time, fraction = ''] = timeAndFraction.split('.')
  const value = new Date(`${date}T${time}.${fraction.padEnd(3, '0')}Z`)
  assert.ok(Number.isFinite(value.getTime()), 'PostgreSQL UTC-naive timestamp is invalid.')
  return value
}

export function digestRows(table, rows) {
  return sha256(`chibi-v12-business-table-v1\n${table}\n${canonicalJson(rows)}`)
}

export function deriveIsolatedV12Url(sourceUrl) {
  const url = new URL(sourceUrl)
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Source .env database must be loopback.')
  assert.equal(url.port, '5432', 'Source .env database port is not the pinned local port.')
  assert.equal(decodeURIComponent(url.pathname.slice(1)), 'stratonas', 'Source .env database name is not the normal local database.')
  url.pathname = `/${V12_DATABASE_NAME}`
  return url.toString()
}

async function assertRealPath(target, kind) {
  const stat = await lstat(target)
  assert.equal(stat.isSymbolicLink(), false, `${kind} must not be a symbolic link.`)
  assert.ok(kind === 'Chrome' ? stat.isFile() : stat.isDirectory(), `${kind} has the wrong filesystem type.`)
  assert.equal(await realpath(target), path.resolve(target), `${kind} resolved to a different path.`)
}

async function assertAbsent(target) {
  try {
    await lstat(target)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  throw new Error(`Checkpoint already exists: ${path.basename(target)}`)
}

async function assertHash(target, expected) {
  const bytes = await readFile(target)
  assert.equal(sha256(bytes), expected, `Pinned evidence hash mismatch for ${path.basename(target)}.`)
}

function processExists(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function assertSingleLiveReadyWorker(workers, expectedId, nowMs = Date.now()) {
  const heartbeatAge = worker => worker.lastHeartbeat instanceof Date ? nowMs - worker.lastHeartbeat.getTime() : Number.POSITIVE_INFINITY
  const liveReady = workers.filter(worker => worker.ready === true && heartbeatAge(worker) >= 0 && heartbeatAge(worker) < LIVE_WORKER_MAX_AGE_MS)
  assert.equal(liveReady.length, 1, 'Expected exactly one fresh ready worker.')
  assert.equal(liveReady[0].id, expectedId, 'Fresh ready worker identity differs from the pinned worker.')
  return {
    activeWorker: liveReady[0],
    staleReadyWorkers: workers
      .filter(worker => worker.ready === true && !liveReady.includes(worker))
      .map(worker => ({ id: worker.id, heartbeatAgeMs: heartbeatAge(worker) })),
  }
}

function assertAppPortOwner() {
  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', '(Get-NetTCPConnection -LocalPort 3137 -State Listen | Select-Object -ExpandProperty OwningProcess) -join ","'],
    { encoding: 'utf8', windowsHide: true },
  )
  const owners = [...new Set(output.split(/[\s,]+/).filter(token => token.length > 0).map(Number).filter(pid => Number.isInteger(pid) && pid > 0))]
  assert.deepEqual(owners, [APP_PID], 'Port 3137 is not owned exclusively by the pinned app process.')
}

async function assertStaticPreflight() {
  assert.equal(process.env.PGOPTIONS, undefined, 'PGOPTIONS must be absent.')
  await assertRealPath(SOURCE_DIR, 'Source')
  await assertRealPath(TOOLS_DIR, 'Tools')
  await assertRealPath(DATA_DIR, 'Data root')
  await assertRealPath(CHROME_PATH, 'Chrome')
  const checkpoint = path.join(DATA_DIR, '.acceptance', 'before-restart.json')
  const provenance = path.join(DATA_DIR, '.acceptance', 'before-restart-provenance.json')
  await assertAbsent(checkpoint)
  await assertAbsent(provenance)
  await assertHash(path.join(EVIDENCE_ROOT, 'readonly-business-digest-baseline-v1-20260925.md'), V12_BASELINE_SHA256)
  await assertHash(path.join(PROJECT_ROOT, 'scripts', 'chibi-acceptance-blockers.snapshot.json'), BLOCKER_SNAPSHOT_SHA256)
  await assertHash(path.join(PROJECT_ROOT, 'scripts', 'chibi-acceptance-roster.snapshot.json'), ROSTER_SNAPSHOT_SHA256)
  await assertHash(path.join(EVIDENCE_ROOT, 'visual', 'terminal-reconciled-roster.json'), TERMINAL_SIDECAR_SHA256)
  const refs = [
    path.join(RUN_ROOT, 'logs', 'setup.log'),
    path.join(RUN_ROOT, 'logs', 'harness.log'),
    path.join(EVIDENCE_ROOT, 'early-public-row-10000.json'),
  ]
  for (const ref of refs) {
    const stat = await lstat(ref)
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink <= 1, 'Resume evidence references must be private regular files.')
  }
  assert.ok(processExists(APP_PID) && processExists(WORKER_PID), 'Pinned app or worker process is not alive.')
  assertAppPortOwner()
  const providers = await fetch(`${APP_ORIGIN}/api/auth/providers`, { signal: AbortSignal.timeout(5000) })
  assert.equal(providers.status, 200, 'Pinned localhost auth origin is not healthy.')
  return { checkpoint, provenance, evidenceRefs: refs }
}

async function auditPass(connectionString, specs) {
  const client = new Client({ connectionString, application_name: 'v12-readonly-preguard' })
  await client.connect()
  let transactionOpen = false
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    transactionOpen = true
    const scope = (await client.query("SELECT current_database() AS db, current_schema() AS schema, current_setting('transaction_read_only') AS read_only")).rows[0]
    assert.equal(scope.db, V12_DATABASE_NAME, 'Connected to the wrong database.')
    assert.equal(scope.schema, 'public', 'Connected to the wrong schema.')
    assert.equal(scope.read_only, 'on', 'Database transaction is not read-only.')

    const digests = {}
    for (const spec of specs) {
      const columns = (await client.query(
        'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position',
        ['public', spec.table],
      )).rows.map(row => row.column_name)
      assert.deepEqual(columns, spec.columns, `Frozen v12 schema projection mismatch for ${spec.table}.`)
      const rows = (await client.query(buildProjectionSql(spec))).rows
      assert.equal(rows.length, spec.rows, `Row count mismatch for ${spec.table}.`)
      const digest = digestRows(spec.table, rows)
      assert.equal(digest, spec.digest, `Versioned v12 digest mismatch for ${spec.table}.`)
      digests[spec.table] = { rows: rows.length, sha256: digest }
    }

    const jobs = (await client.query(
      `SELECT ${['id','mode','status','stage','total','processed','imported','updated','reused','skipped','unavailable','reviewRequired','failed'].map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier('ChibiImportJob')} WHERE ${quoteIdentifier('id')} = $1`,
      [V12_JOB_ID],
    )).rows
    assert.equal(jobs.length, 1, 'Exact terminal job is absent.')
    const job = jobs[0]
    assert.deepEqual(
      { mode: job.mode, status: job.status, stage: job.stage, total: job.total, processed: job.processed, imported: job.imported, updated: job.updated, reused: job.reused, skipped: job.skipped, unavailable: job.unavailable, reviewRequired: job.reviewRequired, failed: job.failed },
      { mode: 'update', status: 'completed', stage: 'completed', total: 275, processed: 275, imported: 238, updated: 0, reused: 0, skipped: 0, unavailable: 37, reviewRequired: 0, failed: 0 },
      'Exact terminal job state/counters mismatch.',
    )
    const itemStates = (await client.query(
      `SELECT ${quoteIdentifier('status')}, COUNT(*)::int AS count FROM ${quoteIdentifier('ChibiImportItem')} WHERE ${quoteIdentifier('jobId')} = $1 GROUP BY ${quoteIdentifier('status')}`,
      [V12_JOB_ID],
    )).rows
    assert.deepEqual(Object.fromEntries(itemStates.map(row => [row.status, row.count])), { imported: 238, unavailable: 37 }, 'Terminal item states mismatch.')

    const userCount = (await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier('User')}`)).rows[0].count
    const admins = (await client.query(
      `SELECT ${['id','name','role'].map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier('User')} WHERE ${quoteIdentifier('email')} = $1`,
      [V12_ADMIN_EMAIL],
    )).rows
    assert.equal(userCount, 3, 'Isolated User count changed.')
    assert.equal(admins.length, 1, 'Receipt-proven recovery admin is absent or duplicated.')
    assert.deepEqual({ id: admins[0].id, role: admins[0].role }, { id: V12_ADMIN_ID, role: 'ADMIN' }, 'Recovery admin identity mismatch.')

    const workers = (await client.query(
      `SELECT ${['id','platform','ready'].map(quoteIdentifier).join(', ')}, ${quoteIdentifier('lastHeartbeat')}::text AS ${quoteIdentifier('heartbeatUtcNaive')} FROM ${quoteIdentifier('ChibiWorkerState')} ORDER BY ${quoteIdentifier('id')}`,
    )).rows.map(worker => ({ ...worker, lastHeartbeat: parseUtcNaiveTimestamp(worker.heartbeatUtcNaive) }))
    const { activeWorker, staleReadyWorkers } = assertSingleLiveReadyWorker(workers, `TryHard:${WORKER_PID}`)
    assert.equal(activeWorker.platform, 'win32/x64', 'Worker platform differs from the pinned environment.')
    assert.ok(processExists(APP_PID) && processExists(WORKER_PID), 'Pinned app or worker process ended during the audit.')

    await client.query('ROLLBACK')
    transactionOpen = false
    return { digests, jobId: job.id, jobStatus: job.status, processed: job.processed, imported: job.imported, unavailable: job.unavailable, userCount, adminId: admins[0].id, workerId: activeWorker.id, workerReady: activeWorker.ready, staleReadyWorkers }
  } finally {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {})
    await client.end()
  }
}

export async function runTwoPassPreguard({ envText, baselineMarkdown, intervalMs = 5000 }) {
  assert.ok(Number.isInteger(intervalMs) && intervalMs >= 5000 && intervalMs <= 15000, 'Two-pass interval must be between five and fifteen seconds.')
  const connectionString = deriveIsolatedV12Url(dotenv.parse(envText).DATABASE_URL)
  const specs = parseBaselineMarkdown(baselineMarkdown)
  const first = await auditPass(connectionString, specs)
  await new Promise(resolve => setTimeout(resolve, intervalMs))
  const second = await auditPass(connectionString, specs)
  assert.deepEqual(second.digests, first.digests, 'The two read-only business digest passes differ.')
  assert.equal(second.jobId, first.jobId, 'The exact job identity changed between passes.')
  assert.equal(second.adminId, first.adminId, 'The recovery admin identity changed between passes.')
  assert.equal(second.workerId, first.workerId, 'The ready worker identity changed between passes.')
  return { database: V12_DATABASE_NAME, passes: [first, second] }
}

async function main() {
  assert.equal(process.env.PGOPTIONS, undefined, 'PGOPTIONS must be absent.')
  const staticState = await assertStaticPreflight()
  const baselinePath = path.join(EVIDENCE_ROOT, 'readonly-business-digest-baseline-v1-20260925.md')
  const baseline = await readFile(baselinePath, 'utf8')
  assert.equal(sha256(baseline), V12_BASELINE_SHA256, 'Versioned digest baseline file hash mismatch.')
  const result = await runTwoPassPreguard({ envText: await readFile(path.join(PROJECT_ROOT, '.env'), 'utf8'), baselineMarkdown: baseline, intervalMs: 5000 })
  await assertStaticPreflight()
  console.log(JSON.stringify({ ...result, static: { checkpointAbsent: true, provenanceAbsent: true, originStatus: 200, port3137Pid: APP_PID, pinnedProcessesAlive: true, evidenceRefs: staticState.evidenceRefs.length } }, null, 2))
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath && invokedPath.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch(error => {
    const safeMessage = String(error?.message ?? 'Read-only preguard failed.').replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted database URL]')
    console.error(JSON.stringify({ error: safeMessage }))
    process.exitCode = 1
  })
}
