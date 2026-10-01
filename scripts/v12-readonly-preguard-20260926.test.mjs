import assert from 'node:assert/strict'
import test from 'node:test'
import {
  V12_DATABASE_NAME,
  assertSingleLiveReadyWorker,
  buildProjectionSql,
  canonicalJson,
  deriveIsolatedV12Url,
  digestRows,
  parseBaselineMarkdown,
  parseUtcNaiveTimestamp,
  quoteIdentifier,
} from './v12-readonly-preguard-20260926.mjs'

const tables = [
  ['ChibiAsset', 'id', 'id, sourceIdentity', 238, 'a'.repeat(64)],
  ['StudentChibiBinding', 'studentId', 'studentId, sourceIdentity', 238, 'b'.repeat(64)],
  ['ChibiImportJob', 'id', 'id, reviewRequired', 1, 'c'.repeat(64)],
  ['ChibiImportItem', 'id', 'id, jobId', 275, 'd'.repeat(64)],
  ['ChibiSourceCandidate', 'id', 'id, sourceIdentity', 871, 'e'.repeat(64)],
]
const baseline = [
  `# ${V12_DATABASE_NAME}`,
  'Digest method: chibi-v12-business-table-v1',
  '| Table | Primary-key order | v12 columns | Rows | SHA-256 |',
  '| --- | --- | --- | ---: | --- |',
  ...tables.map(([table, key, columns, rows, digest]) => '| `' + table + '` | `' + key + '` | ' + columns + ' | ' + rows + ' | ' + digest + ' |'),
].join('\n')

test('baseline parser preserves the documented five-table projection order', () => {
  const specs = parseBaselineMarkdown(baseline)
  assert.deepEqual(specs.map(spec => spec.table), tables.map(row => row[0]))
  assert.equal(specs[2].columns[1], 'reviewRequired')
  assert.equal(specs[2].digest, 'c'.repeat(64))
})

test('projection SQL quotes camel-case columns, table names, and primary key', () => {
  assert.equal(
    buildProjectionSql({ table: 'ChibiImportJob', primaryKey: 'id', columns: ['id', 'reviewRequired'] }),
    'SELECT "id", "reviewRequired" FROM "ChibiImportJob" ORDER BY "id" ASC',
  )
})

test('unsafe SQL identifiers are rejected before query generation', () => {
  assert.throws(() => quoteIdentifier('reviewRequired; DROP TABLE User'), /simple identifier/)
})

test('canonical JSON sorts object keys, preserves arrays, and normalizes dates', () => {
  assert.equal(canonicalJson([{ z: 1, a: { d: 2, c: 3 }, time: new Date('2026-09-25T00:00:00.000Z') }]), '[{"a":{"c":3,"d":2},"time":"2026-09-25T00:00:00.000Z","z":1}]')
})

test('row digests are domain separated by v12 version and table', () => {
  const rows = [{ id: 'a', value: 1 }]
  assert.notEqual(digestRows('ChibiAsset', rows), digestRows('StudentChibiBinding', rows))
})

test('isolated URL transform changes only the database path', () => {
  const transformed = new URL(deriveIsolatedV12Url('postgresql://user:secret@localhost:5432/stratonas?schema=public'))
  assert.equal(transformed.hostname, 'localhost')
  assert.equal(transformed.port, '5432')
  assert.equal(transformed.pathname, `/${V12_DATABASE_NAME}`)
  assert.equal(transformed.search, '?schema=public')
  assert.equal(transformed.username, 'user')
  assert.equal(transformed.password, 'secret')
})

test('one live worker plus one stale ready row accepts only the live worker and reports the orphan', () => {
  const now = Date.parse('2026-09-26T12:00:00.000Z')
  const result = assertSingleLiveReadyWorker([
    { id: 'TryHard:13812', ready: true, lastHeartbeat: new Date(now - 1000) },
    { id: 'TryHard:16416', ready: true, lastHeartbeat: new Date(now - 90_001) },
  ], 'TryHard:13812', now)
  assert.equal(result.activeWorker.id, 'TryHard:13812')
  assert.deepEqual(result.staleReadyWorkers, [{ id: 'TryHard:16416', heartbeatAgeMs: 90_001 }])
})

test('two live ready workers are rejected', () => {
  const now = Date.parse('2026-09-26T12:00:00.000Z')
  assert.throws(() => assertSingleLiveReadyWorker([
    { id: 'TryHard:13812', ready: true, lastHeartbeat: new Date(now - 1000) },
    { id: 'TryHard:16416', ready: true, lastHeartbeat: new Date(now - 2000) },
  ], 'TryHard:13812', now), /exactly one fresh ready worker/)
})

test('the pinned PID is rejected when its heartbeat is stale', () => {
  const now = Date.parse('2026-09-26T12:00:00.000Z')
  assert.throws(() => assertSingleLiveReadyWorker([
    { id: 'TryHard:13812', ready: true, lastHeartbeat: new Date(now - 90_000) },
  ], 'TryHard:13812', now), /exactly one fresh ready worker/)
})

test('UTC-naive PostgreSQL timestamps are parsed as UTC, not the host Asia/Bangkok timezone', () => {
  assert.equal(parseUtcNaiveTimestamp('2026-09-25 20:01:45.821').toISOString(), '2026-09-25T20:01:45.821Z')
  assert.equal(parseUtcNaiveTimestamp('2026-09-25 20:01:45').toISOString(), '2026-09-25T20:01:45.000Z')
  assert.throws(() => parseUtcNaiveTimestamp('2026-09-25 20:01:45+07'), /timestamp without timezone/)
})
