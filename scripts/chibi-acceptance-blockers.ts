import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildFingerprint, selectAnimator } from '../src/lib/chibi/engine'
import { sourceGap } from '../src/lib/chibi/engine-db'
import { candidatesFromFiles, type InventoryReport, type SourceCandidate } from '../src/lib/chibi/inventory'
import { mapStudentToSources } from '../src/lib/chibi/mapping'
import { CHIBI_RENDERING_POLICY_VERSION, CHIBI_RENDERING_PROFILE_VERSION } from '../src/lib/chibi/rendering-profile'
import { emptyChibiProfile } from '../src/lib/chibi/types'
import { acceptanceRosterPlan, type AcceptanceRosterPlan, type AcceptanceStudent } from './chibi-acceptance-roster'

export type AcceptanceBlockerSnapshotRow = {
  studentId: number
  name: string
  sourceIdentity: string | null
  sourceFingerprint: string | null
  itemFingerprint: string | null
  prefabPath: string | null
  expectedStatus: 'unavailable' | 'review-required'
  diagnostic: string
}

export type AcceptanceBlockerSnapshot = {
  schemaVersion: 1
  snapshotVersion: 'chibi-acceptance-known-blockers-v6'
  roster: { version: number; checksum: string; eligibleCount: number }
  source: { kind: 'BAAD'; inventoryVersion: 2; inventorySha256: string; files: number; entries: number; candidates: number }
  profileVersion: string
  policyVersion: string
  counts: { eligible: number; mapped: number; successful: number; blocked: number; mappedBlocked: number; sourceUnavailable: number }
  rows: AcceptanceBlockerSnapshotRow[]
}

export type LegacyAcceptanceBlockerSnapshot = Omit<AcceptanceBlockerSnapshot, 'snapshotVersion' | 'policyVersion'> & {
  snapshotVersion: 'chibi-acceptance-known-blockers-v5'
  policyVersion: 'chibi-rendering-policy-v9'
}

type BlockerRoster = Pick<AcceptanceRosterPlan, 'version' | 'checksum'> & { students: readonly AcceptanceStudent[] }

export const V5_BLOCKER_INVENTORY_SHA256 = '9503a9218b6ebd3ce91c7b6317a0610c5f0f46332d1d70dbf1b04e0feb20d242'
export const V5_BLOCKER_SNAPSHOT_CANONICAL_SHA256 = '5948d341a5ab1b7cc5bc0177dd5d8311cb64438d7a0686d192c0d485606feed7'
export const SAORI_SWIMSUIT_POLICY_TEST_NAME = 'publishes Saori swimsuit handgun and water cannon only as exact core arrangement warnings'

const V5_ROSTER = { version: 1, checksum: 'f4b364bf6b0d35f41bc74c7e4bbe1aa48ded5d6c192393c910e71946211c7209', eligibleCount: 275 } as const
const V5_SOURCE = {
  kind: 'BAAD', inventoryVersion: 2, inventorySha256: V5_BLOCKER_INVENTORY_SHA256,
  files: 517, entries: 29689, candidates: 871,
} as const
const V5_COUNTS = { eligible: 275, mapped: 274, successful: 235, blocked: 40, mappedBlocked: 39, sourceUnavailable: 1 } as const
const SAORI_SWIMSUIT_V5_ROW: AcceptanceBlockerSnapshotRow = {
  studentId: 10101,
  name: 'Saori (Swimsuit)',
  sourceIdentity: 'ch0266',
  sourceFingerprint: 'c2dda9fce74ba470a510e0cdab930844eff876ad62150254bcf3cefdfb495db9',
  itemFingerprint: '53c0412af03c3152ddc4a713a4317e3e70a5618888451c6aa2aab7e4d6400b57',
  prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0266/Cafe/Cafe_CH0266.prefab',
  expectedStatus: 'unavailable',
  diagnostic: 'Source rendering profile is unresolved for ch0266: Core renderer Cafe_CH0266/CH0266_WaterCannon_Outline is a source-bound weapon/equipment renderer without an exact authored attachment relation (UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT). Core renderer Cafe_CH0266/Saori_Original_Handgun is a source-bound weapon/equipment renderer without an exact authored attachment relation (UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT).',
}

function assertHash(value: string, field: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${field} must be a SHA-256 hex digest.`)
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

export function canonicalSnapshotSha256(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

export function assertCanonicalSnapshotSha256(value: unknown, expected: string, label = 'Snapshot') {
  assertHash(expected, `${label} expected SHA-256`)
  if (canonicalSnapshotSha256(value) !== expected.toLowerCase()) {
    throw new Error(`${label} source rows, status, diagnostics, or shape changed from the verified baseline.`)
  }
}

export function assertV5InventorySha256(value: string) {
  assertHash(value, 'Inventory SHA-256')
  if (value.toLowerCase() !== V5_BLOCKER_INVENTORY_SHA256) {
    throw new Error('Raw inventory SHA-256 does not match the source used by the v5 blocker snapshot.')
  }
}

export function assertV5Roster(roster: BlockerRoster, oldRoster?: unknown) {
  const committed = acceptanceRosterPlan('full')
  assert.deepEqual({ version: roster.version, checksum: roster.checksum, eligibleCount: roster.students.length }, V5_ROSTER,
    'Rebase requires the exact committed v5 full-roster identity.')
  assert.deepEqual({ version: committed.version, checksum: committed.checksum, eligibleCount: committed.students.length }, V5_ROSTER,
    'The committed roster no longer matches the v5 blocker snapshot.')
  if (oldRoster !== undefined) assert.deepEqual(oldRoster, V5_ROSTER, 'Old snapshot roster identity changed.')
}

export function assertSaoriSwimsuitV5Row(value: unknown) {
  assert.deepEqual(value, SAORI_SWIMSUIT_V5_ROW, 'The v5 Saori Swimsuit blocker does not match its exact source-pinned legacy evidence.')
}

function assertV5SnapshotShapeAndIntegrity(value: unknown): LegacyAcceptanceBlockerSnapshot {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Old blocker snapshot must be a JSON object.')
  const snapshot = value as LegacyAcceptanceBlockerSnapshot
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'counts', 'policyVersion', 'profileVersion', 'roster', 'rows', 'schemaVersion', 'snapshotVersion', 'source',
  ])
  assert.equal(snapshot.schemaVersion, 1)
  assert.equal(snapshot.snapshotVersion, 'chibi-acceptance-known-blockers-v5')
  assert.deepEqual(snapshot.roster, V5_ROSTER)
  assert.deepEqual(snapshot.source, V5_SOURCE)
  assert.equal(snapshot.profileVersion, 'chibi-rendering-profile-v9')
  assert.equal(snapshot.policyVersion, 'chibi-rendering-policy-v9')
  assert.deepEqual(snapshot.counts, V5_COUNTS)
  assert.ok(Array.isArray(snapshot.rows))
  assert.equal(snapshot.rows.length, V5_COUNTS.blocked)
  const ids = snapshot.rows.map(row => row.studentId)
  assert.equal(new Set(ids).size, ids.length, 'Old blocker snapshot contains duplicate student IDs.')
  assert.deepEqual(ids, [...ids].sort((left, right) => left - right), 'Old blocker rows are not sorted by student ID.')
  for (const row of snapshot.rows) {
    assert.deepEqual(Object.keys(row).sort(), [
      'diagnostic', 'expectedStatus', 'itemFingerprint', 'name', 'prefabPath', 'sourceFingerprint', 'sourceIdentity', 'studentId',
    ])
    assert.ok(row.expectedStatus === 'unavailable' || row.expectedStatus === 'review-required')
    assert.ok(row.diagnostic.trim())
  }
  assertSaoriSwimsuitV5Row(snapshot.rows.find(row => row.studentId === 10101))
  assertCanonicalSnapshotSha256(snapshot, V5_BLOCKER_SNAPSHOT_CANONICAL_SHA256, 'v5 blocker snapshot')
  return snapshot
}

/** Transform only an already verified v5 snapshot; the CLI validates its full v5 digest first. */
export function buildV6SnapshotFromVerifiedV5(snapshot: LegacyAcceptanceBlockerSnapshot): AcceptanceBlockerSnapshot {
  assertSaoriSwimsuitV5Row(snapshot.rows.find(row => row.studentId === 10101))
  assert.equal(snapshot.counts.blocked, snapshot.rows.length)
  assert.equal(snapshot.counts.successful + snapshot.counts.blocked, snapshot.counts.eligible)
  assert.equal(snapshot.counts.mappedBlocked, snapshot.rows.filter(row => row.sourceIdentity !== null).length)
  assert.equal(snapshot.counts.sourceUnavailable, snapshot.rows.filter(row => row.sourceIdentity === null).length)

  const rows = snapshot.rows.filter(row => row.studentId !== 10101).map(row => {
    if (!row.sourceIdentity) {
      assert.equal(row.sourceFingerprint, null)
      assert.equal(row.itemFingerprint, null)
      assert.equal(row.prefabPath, null)
      return { ...row }
    }
    assertHash(row.sourceFingerprint ?? '', `Student ${row.studentId} source fingerprint`)
    assert.ok(row.prefabPath, `Student ${row.studentId} must keep its source prefab path.`)
    return {
      ...row,
      itemFingerprint: buildFingerprint(
        { fingerprint: row.sourceFingerprint! }, emptyChibiProfile(row.sourceIdentity), {},
      ),
    }
  })
  const counts = {
    eligible: snapshot.counts.eligible,
    mapped: snapshot.counts.mapped,
    successful: snapshot.counts.successful + 1,
    blocked: rows.length,
    mappedBlocked: rows.filter(row => row.sourceIdentity !== null).length,
    sourceUnavailable: rows.filter(row => row.sourceIdentity === null).length,
  }
  assert.equal(counts.successful + counts.blocked, counts.eligible)
  assert.equal(counts.mappedBlocked + counts.sourceUnavailable, counts.blocked)
  return {
    ...snapshot,
    snapshotVersion: 'chibi-acceptance-known-blockers-v6',
    policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    counts,
    rows,
  }
}

export function assertSaoriSwimsuitPolicyTestPasses() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const testPath = 'src/lib/chibi/rendering-profile.test.ts'
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--test', `--test-name-pattern=${SAORI_SWIMSUIT_POLICY_TEST_NAME}`, testPath,
  ], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 })
  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().slice(-3000)
    throw new Error(`Exact Saori Swimsuit source-pinned policy test failed.${detail ? `\n${detail}` : ''}`, { cause: result.error })
  }
}

export function rebaseAcceptanceBlockerSnapshot(
  oldSnapshotValue: unknown,
  inventorySha256: string,
  roster: BlockerRoster = acceptanceRosterPlan('full'),
): AcceptanceBlockerSnapshot {
  assertV5InventorySha256(inventorySha256)
  assertV5Roster(roster)
  const oldSnapshot = assertV5SnapshotShapeAndIntegrity(oldSnapshotValue)
  assert.deepEqual(oldSnapshot.roster, { version: roster.version, checksum: roster.checksum, eligibleCount: roster.students.length })
  assert.equal(CHIBI_RENDERING_PROFILE_VERSION, 'chibi-rendering-profile-v9')
  assert.equal(CHIBI_RENDERING_POLICY_VERSION, 'chibi-rendering-policy-v12')
  assertSaoriSwimsuitPolicyTestPasses()
  return buildV6SnapshotFromVerifiedV5(oldSnapshot)
}

function unresolvedCandidate(candidate: SourceCandidate) {
  if (candidate.unresolvedDependencies?.length) {
    throw new Error(`Cannot snapshot ${candidate.sourceIdentity} with unresolved dependencies: ${candidate.unresolvedDependencies.join(', ')}`)
  }
}

/** Rebuild acceptance blockers from BAAD file entries and the committed roster. */
export function buildAcceptanceBlockerSnapshot(
  report: InventoryReport,
  inventorySha256: string,
  roster: BlockerRoster = acceptanceRosterPlan('full'),
): AcceptanceBlockerSnapshot {
  if (report.version !== 2 || !report.source.trim()) throw new Error('Blocker snapshots require a version-2 inventory report with a source path.')
  assertHash(inventorySha256, 'Inventory SHA-256')
  const candidates = candidatesFromFiles(report.files)
  const rows: AcceptanceBlockerSnapshotRow[] = []
  let mapped = 0

  for (const student of roster.students) {
    const decision = mapStudentToSources(student, candidates)
    if (decision.status !== 'mapped') {
      rows.push({
        studentId: student.id, name: student.name, sourceIdentity: null, sourceFingerprint: null,
        itemFingerprint: null, prefabPath: null, expectedStatus: decision.status, diagnostic: decision.reason,
      })
      continue
    }

    mapped += 1
    const candidate = decision.source
    unresolvedCandidate(candidate)
    const fingerprint = buildFingerprint({ fingerprint: candidate.fingerprint }, decision.profile, {})
    const animator = selectAnimator(candidate, decision.profile)
    const gap = sourceGap(candidate, decision.profile)
    if (!gap) continue
    if (!animator.prefabPath) {
      throw new Error(`Mapped blocker ${student.id} (${candidate.sourceIdentity}) has no selected prefab path; snapshot validation requires a prefab for mapped rows.`)
    }
    rows.push({
      studentId: student.id, name: student.name, sourceIdentity: candidate.sourceIdentity,
      sourceFingerprint: candidate.fingerprint, itemFingerprint: fingerprint, prefabPath: animator.prefabPath,
      expectedStatus: gap.status, diagnostic: gap.reason,
    })
  }

  rows.sort((left, right) => left.studentId - right.studentId)
  const eligible = roster.students.length
  const blocked = rows.length
  return {
    schemaVersion: 1,
    snapshotVersion: 'chibi-acceptance-known-blockers-v6',
    roster: { version: roster.version, checksum: roster.checksum, eligibleCount: eligible },
    source: {
      kind: 'BAAD', inventoryVersion: 2, inventorySha256: inventorySha256.toLowerCase(),
      files: report.files.length, entries: report.files.reduce((count, file) => count + file.entries.length, 0), candidates: candidates.length,
    },
    profileVersion: CHIBI_RENDERING_PROFILE_VERSION,
    policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    counts: {
      eligible, mapped, successful: eligible - blocked, blocked,
      mappedBlocked: rows.filter(row => row.sourceIdentity !== null).length,
      sourceUnavailable: rows.filter(row => row.sourceIdentity === null).length,
    },
    rows,
  }
}

async function sha256File(filePath: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

async function main(args: string[]) {
  const write = args.includes('--write')
  const rebase = args.includes('--rebase')
  const flags = args.filter(argument => argument.startsWith('--'))
  const paths = args.filter(argument => !argument.startsWith('--'))
  if (flags.some(flag => flag !== '--write' && flag !== '--rebase')
    || flags.filter(flag => flag === '--write').length > 1
    || flags.filter(flag => flag === '--rebase').length > 1
    || paths.length !== 1) {
    throw new Error('Usage: npm run chibi:acceptance:generate-blockers -- [--rebase] <inventory.raw.json> [--write]')
  }

  const inventoryPath = path.resolve(paths[0])
  const inventorySha256 = await sha256File(inventoryPath)
  const outputPath = fileURLToPath(new URL('./chibi-acceptance-blockers.snapshot.json', import.meta.url))
  const snapshot = rebase
    ? rebaseAcceptanceBlockerSnapshot(JSON.parse(await readFile(outputPath, 'utf8')), inventorySha256)
    : buildAcceptanceBlockerSnapshot(JSON.parse(await readFile(inventoryPath, 'utf8')) as InventoryReport, inventorySha256)
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`

  if (write) {
    await writeFile(outputPath, serialized, 'utf8')
    if (rebase) {
      console.log(`PROVISIONAL REBASE, not a full replay: wrote ${snapshot.rows.length} rows after hashing (not parsing) the source inventory; ${outputPath}`)
    } else {
      console.log(`Wrote ${snapshot.rows.length} blocker rows to ${outputPath}`)
    }
  } else {
    process.stdout.write(serialized)
    if (rebase) {
      process.stderr.write(`PROVISIONAL REBASE, not a full replay: v5 baseline verified; raw inventory hashed but not parsed; source-pinned Saori policy test passed; only 10101 removed and remaining mapped item fingerprints refreshed. Pass --write to update ${outputPath}.\n`)
    } else {
      process.stderr.write(`Dry run only; pass --write to update ${outputPath}.\n`)
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
