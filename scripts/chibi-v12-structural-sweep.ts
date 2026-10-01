import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'
import {
  assertEmbeddedCharacterContract,
  v12ResumeRenderingVersionContract,
} from './test-chibi-acceptance'
import blockers from './chibi-acceptance-blockers.snapshot.json'
import {
  V12_BASELINE_SHA256,
  V12_DATABASE_NAME,
  V12_JOB_ID,
  deriveIsolatedV12Url,
  runTwoPassPreguard,
} from './v12-readonly-preguard-20260926.mjs'

const { Client } = pg
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUN_ROOT = String.raw`D:\Temp\stratonas-chibi-v12-full-acceptance-20260925-6d18e6c8`
const EVIDENCE_ROOT = path.join(RUN_ROOT, 'evidence')
const DATA_ROOT = path.join(RUN_ROOT, 'data')
const SIDECAR_PATH = path.join(EVIDENCE_ROOT, 'visual', 'terminal-reconciled-roster.json')
const SIDECAR_SHA256 = '5c94f37650d8744a8c380eef1cd009ad5d63172a34ede34513fea7c49892cdcf'
const OUTPUT_PATH = path.join(EVIDENCE_ROOT, 'chibi-v12-structural-sweep-v1-20260926.json')

type JsonRecord = Record<string, any>

type SweepInput = {
  studentId: number
  identityPath: string
  sourceIdentity: string
  assetId: string
  fileKey: string
  expectedSha256: string
  validation: unknown
  actionProfile: unknown
}

type SweepRowResult = {
  studentId: number
  identityPath: string
  sourceIdentity: string
  assetId: string
  sha256: string
  status: 'passed' | 'failed'
  failure?: {
    category: string
    rendererSourceKey?: string
    actionClip?: string
    message: string
  }
}

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex')

export function parseSweepGlb(bytes: Buffer, studentId: number): JsonRecord {
  assert.ok(bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'glTF', `Student ${studentId} artifact is not GLB.`)
  assert.equal(bytes.readUInt32LE(4), 2, `Student ${studentId} artifact is not GLB 2.0.`)
  assert.equal(bytes.readUInt32LE(8), bytes.length, `Student ${studentId} GLB declared length differs from its bytes.`)
  let offset = 12
  let json: JsonRecord | null = null
  let binary: Buffer | null = null
  while (offset < bytes.length) {
    assert.ok(offset + 8 <= bytes.length, `Student ${studentId} GLB has a truncated chunk header.`)
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const end = offset + 8 + length
    assert.ok(end <= bytes.length && length % 4 === 0, `Student ${studentId} GLB has an invalid chunk.`)
    if (type === 0x4e4f534a) json = JSON.parse(bytes.toString('utf8', offset + 8, end).replace(/[\u0000 ]+$/, ''))
    if (type === 0x004e4942) binary = bytes.subarray(offset + 8, end)
    offset = end
  }
  assert.ok(json, `Student ${studentId} GLB has no JSON chunk.`)
  if (binary) {
    Object.defineProperty(json, '__chibiBinary', { value: binary, enumerable: false, configurable: false, writable: false })
  }
  return json
}

export function classifyStructuralFailure(message: string) {
  const motion = message.match(/Student (\d+) structural equipment renderer (\S+) authored action (\S+) has no relevant animation channel with a non-zero transform delta\./)
  if (motion) return { category: 'structural-action-no-nonzero-delta', rendererSourceKey: motion[2], actionClip: motion[3] }
  if (message.includes('does not have exactly one embedded authored action')) return { category: 'authored-action-embedding' }
  if (message.includes('source rootBone ancestry')) return { category: 'source-rootbone-ancestry' }
  if (message.includes('structural equipment')) return { category: 'structural-equipment-contract' }
  return { category: 'character-contract' }
}

export async function collectStructuralSweepResults(
  inputs: readonly SweepInput[],
  validate: (input: SweepInput) => Promise<void> | void,
): Promise<SweepRowResult[]> {
  const ids = inputs.map(input => input.studentId)
  assert.equal(new Set(ids).size, ids.length, 'Structural sweep input repeats a student ID.')
  const results: SweepRowResult[] = []
  for (const input of inputs) {
    try {
      await validate(input)
      results.push({
        studentId: input.studentId,
        identityPath: input.identityPath,
        sourceIdentity: input.sourceIdentity,
        assetId: input.assetId,
        sha256: input.expectedSha256,
        status: 'passed',
      })
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error)
      results.push({
        studentId: input.studentId,
        identityPath: input.identityPath,
        sourceIdentity: input.sourceIdentity,
        assetId: input.assetId,
        sha256: input.expectedSha256,
        status: 'failed',
        failure: { ...classifyStructuralFailure(message), message },
      })
    }
  }
  return results
}

async function readJsonFile(file: string) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function assertRegularFile(file: string, label: string) {
  const info = await lstat(file)
  assert.ok(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, `${label} must be a private regular file.`)
  return info
}

async function readDatabaseRows(connectionString: string, sidecar: JsonRecord) {
  const client = new Client({ connectionString, application_name: 'chibi-v12-structural-sweep-readonly' })
  await client.connect()
  let transactionOpen = false
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    transactionOpen = true
    const scope = (await client.query("SELECT current_database() AS db, current_schema() AS schema, current_setting('transaction_read_only') AS read_only")).rows[0]
    assert.deepEqual(scope, { db: V12_DATABASE_NAME, schema: 'public', read_only: 'on' }, 'Structural sweep connected outside the exact read-only v12 scope.')

    const jobs = (await client.query(
      `SELECT "id", "mode", "status", "stage", "total", "processed", "imported", "unavailable", "failed" FROM "ChibiImportJob" ORDER BY "id" ASC`,
    )).rows
    assert.equal(jobs.length, 1, 'Structural sweep requires the sole original v12 import job.')
    assert.deepEqual(jobs[0], {
      id: V12_JOB_ID, mode: 'update', status: 'completed', stage: 'completed', total: 275,
      processed: 275, imported: 238, unavailable: 37, failed: 0,
    }, 'Structural sweep terminal job differs from its pinned identity/counters.')

    const itemRows = (await client.query(
      `SELECT "studentId", "status", "sourceIdentity", "fingerprint", "assetId" FROM "ChibiImportItem" WHERE "jobId" = $1 ORDER BY "studentId" ASC`,
      [V12_JOB_ID],
    )).rows
    assert.equal(itemRows.length, 275, 'Terminal v12 job does not have exactly 275 items.')
    const itemByStudent = new Map<number, JsonRecord>(itemRows.map((row: JsonRecord) => [row.studentId, row]))

    const rows = (await client.query(
      `SELECT b."studentId", b."assetId", b."sourceIdentity", b."identityPath", b."status", b."profile", a."checksum", a."fileKey", a."published", a."validation" FROM "StudentChibiBinding" b JOIN "ChibiAsset" a ON a."id" = b."assetId" WHERE b."status" = 'available' ORDER BY b."studentId" ASC`,
    )).rows as JsonRecord[]
    assert.equal(rows.length, 238, 'v12 available binding count differs from the terminal sidecar.')
    assert.equal(sidecar.rows.length, 238, 'Terminal sidecar row count differs from the frozen v12 roster.')

    const byStudent = new Map<number, JsonRecord>()
    for (const row of rows) {
      assert.ok(!byStudent.has(row.studentId), `Student ${row.studentId} has duplicate available bindings.`)
      byStudent.set(row.studentId, row)
    }
    const inputs: SweepInput[] = sidecar.rows.map((expected: JsonRecord) => {
      const row = byStudent.get(expected.studentId)
      assert.ok(row, `Terminal sidecar student ${expected.studentId} has no active DB binding.`)
      const item = itemByStudent.get(expected.studentId)
      assert.ok(item, `Terminal sidecar student ${expected.studentId} has no original import item.`)
      assert.equal(item.status, 'imported', `Student ${expected.studentId} terminal item is not imported.`)
      assert.equal(item.assetId, expected.assetId, `Student ${expected.studentId} item asset differs from the sidecar.`)
      assert.equal(item.sourceIdentity, expected.sourceIdentity, `Student ${expected.studentId} item source identity differs from the sidecar.`)
      assert.equal(item.fingerprint, expected.itemFingerprint, `Student ${expected.studentId} item fingerprint differs from the sidecar.`)
      assert.equal(row.assetId, expected.assetId, `Student ${expected.studentId} binding asset differs from the sidecar.`)
      assert.equal(row.sourceIdentity, expected.sourceIdentity, `Student ${expected.studentId} binding source identity differs from the sidecar.`)
      assert.equal(row.identityPath, expected.identityPath, `Student ${expected.studentId} binding identity path differs from the sidecar.`)
      assert.equal(row.checksum, expected.sha256, `Student ${expected.studentId} DB asset checksum differs from the sidecar.`)
      assert.equal(row.published, true, `Student ${expected.studentId} asset is not published.`)
      assert.ok(row.validation && typeof row.validation === 'object', `Student ${expected.studentId} asset validation is missing.`)
      assert.ok(row.profile && typeof row.profile === 'object', `Student ${expected.studentId} action profile is missing.`)
      return {
        studentId: expected.studentId,
        identityPath: expected.identityPath,
        sourceIdentity: expected.sourceIdentity,
        assetId: expected.assetId,
        fileKey: row.fileKey,
        expectedSha256: expected.sha256,
        validation: row.validation,
        actionProfile: row.profile,
      }
    })
    assert.equal(byStudent.size, 238, 'DB has available bindings outside the frozen sidecar roster.')
    await client.query('ROLLBACK')
    transactionOpen = false
    return inputs
  } finally {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {})
    await client.end()
  }
}

async function assertArtifactRoot() {
  const rootStat = await lstat(DATA_ROOT)
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'Pinned v12 data root must be a real directory.')
  const rootReal = await realpath(DATA_ROOT)
  assert.equal(rootReal, path.resolve(DATA_ROOT), 'Pinned v12 data root resolves elsewhere.')
  return rootReal
}

async function validateArtifact(input: SweepInput, dataRoot: string, versionContract: ReturnType<typeof v12ResumeRenderingVersionContract>) {
  const key = input.fileKey
  assert.ok(typeof key === 'string' && key && !key.includes('\\') && !key.includes(':') && !key.startsWith('/'), `Student ${input.studentId} asset file key is unsafe.`)
  assert.ok(key.split('/').every(segment => segment && segment !== '.' && segment !== '..'), `Student ${input.studentId} asset file key is not normalized.`)
  const artifact = path.resolve(dataRoot, ...key.split('/'))
  const relative = path.relative(dataRoot, artifact)
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Student ${input.studentId} GLB escapes the pinned data root.`)
  const artifactStat = await assertRegularFile(artifact, `Student ${input.studentId} GLB`)
  const physicalArtifact = await realpath(artifact)
  assert.ok(physicalArtifact.startsWith(`${dataRoot}${path.sep}`), `Student ${input.studentId} GLB real path escapes the pinned data root.`)
  const bytes = await readFile(physicalArtifact)
  assert.equal(artifactStat.size, bytes.length, `Student ${input.studentId} GLB changed size during the sweep.`)
  const actualSha = sha256(bytes)
  assert.equal(actualSha, input.expectedSha256, `Student ${input.studentId} GLB bytes differ from the immutable terminal sidecar.`)
  const glb = parseSweepGlb(bytes, input.studentId)
  assertEmbeddedCharacterContract(input.studentId, input.validation, glb, {
    requireEquipmentRelations: true,
    actionProfile: input.actionProfile,
    renderingVersionContract: versionContract,
  })
}

async function main() {
  assert.equal(process.env.PGOPTIONS, undefined, 'PGOPTIONS must be absent for the isolated v12 audit.')
  const sidecarInfo = await assertRegularFile(SIDECAR_PATH, 'Terminal v12 roster sidecar')
  const sidecarBytes = await readFile(SIDECAR_PATH)
  const sidecarSha = sha256(sidecarBytes)
  assert.equal(sidecarSha, SIDECAR_SHA256, 'Terminal v12 roster sidecar differs from the pinned provenance hash.')
  const sidecar = JSON.parse(sidecarBytes.toString('utf8')) as JsonRecord
  assert.deepEqual(
    { databaseName: sidecar.databaseName, jobId: sidecar.jobId, terminalStatus: sidecar.terminalStatus, reconciliationStatus: sidecar.reconciliationStatus, publicRowCount: sidecar.publicRowCount },
    { databaseName: V12_DATABASE_NAME, jobId: V12_JOB_ID, terminalStatus: 'completed', reconciliationStatus: 'passed', publicRowCount: 238 },
    'Terminal sidecar identity/reconciliation differs from the pinned v12 run.',
  )
  assert.equal(sidecar.rows.length, 238, 'Terminal sidecar does not cover exactly 238 imported identities.')
  assert.equal(sidecarInfo.size, sidecarBytes.length, 'Terminal sidecar changed while being read.')

  const envText = await readFile(path.join(PROJECT_ROOT, '.env'), 'utf8')
  const baselinePath = path.join(EVIDENCE_ROOT, 'readonly-business-digest-baseline-v1-20260925.md')
  const baseline = await readFile(baselinePath, 'utf8')
  assert.equal(sha256(baseline), V12_BASELINE_SHA256, 'Versioned five-table baseline differs from its pinned hash.')
  const urlValue = dotenv.parse(envText).DATABASE_URL
  assert.ok(urlValue, 'Repository .env is missing DATABASE_URL.')
  const connectionString = deriveIsolatedV12Url(urlValue)

  const preflight = await runTwoPassPreguard({ envText, baselineMarkdown: baseline, intervalMs: 5000 })
  const inputs = await readDatabaseRows(connectionString, sidecar)
  assert.equal(inputs.length, 238, 'Read-only DB projection did not yield exactly 238 sweep inputs.')
  const dataRoot = await assertArtifactRoot()
  const versionContract = v12ResumeRenderingVersionContract(V12_JOB_ID, blockers as any)
  const rows = await collectStructuralSweepResults(inputs, input => validateArtifact(input, dataRoot, versionContract))
  const postflight = await runTwoPassPreguard({ envText, baselineMarkdown: baseline, intervalMs: 5000 })
  assert.deepEqual(postflight.passes[0].digests, preflight.passes[0].digests, 'Five v12 business-table digests changed during the offline sweep.')
  assert.equal(postflight.passes[0].jobId, V12_JOB_ID, 'v12 job identity changed during the offline sweep.')

  const failuresByCategory = Object.fromEntries(
    [...new Set(rows.filter(row => row.failure).map(row => row.failure!.category))]
      .sort()
      .map(category => [category, rows.filter(row => row.failure?.category === category).length]),
  )
  const document = {
    schemaVersion: 1,
    kind: 'chibi-v12-offline-structural-assertion-sweep',
    generatedAt: new Date().toISOString(),
    databaseName: V12_DATABASE_NAME,
    jobId: V12_JOB_ID,
    terminalSidecar: { path: SIDECAR_PATH, sha256: sidecarSha, rows: sidecar.rows.length },
    fiveBusinessDigests: preflight.passes[0].digests,
    postflightFiveBusinessDigests: postflight.passes[0].digests,
    sourceInventorySha256: '9503a9218b6ebd3ce91c7b6317a0610c5f0f46332d1d70dbf1b04e0feb20d242',
    blockerSnapshotVersion: 'chibi-acceptance-known-blockers-v6',
    renderingVersionContract: versionContract,
    summary: { total: rows.length, passed: rows.length - rows.filter(row => row.status === 'failed').length, failed: rows.filter(row => row.status === 'failed').length, failuresByCategory },
    rows,
  }
  const outputBytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, 'utf8')
  await writeFile(OUTPUT_PATH, outputBytes, { flag: 'wx' })
  console.log(JSON.stringify({ outputPath: OUTPUT_PATH, outputSha256: sha256(outputBytes), summary: document.summary, preflightPasses: preflight.passes.length, postflightPasses: postflight.passes.length }, null, 2))
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath && invokedPath.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch(error => {
    const safeMessage = String(error?.message ?? 'v12 structural sweep failed.').replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted database URL]')
    console.error(JSON.stringify({ error: safeMessage }))
    process.exitCode = 1
  })
}
