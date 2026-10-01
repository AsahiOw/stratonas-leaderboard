import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { buildFingerprint } from '../src/lib/chibi/engine'
import { type InventoryReport } from '../src/lib/chibi/inventory'
import { defaultProfile } from '../src/lib/chibi/mapping'
import { CHIBI_RENDERING_POLICY_VERSION, CHIBI_RENDERING_PROFILE_VERSION } from '../src/lib/chibi/rendering-profile'
import { acceptanceRosterPlan } from './chibi-acceptance-roster'
import {
  assertCanonicalSnapshotSha256,
  assertSaoriSwimsuitPolicyTestPasses,
  assertSaoriSwimsuitV5Row,
  assertV5InventorySha256,
  assertV5Roster,
  buildAcceptanceBlockerSnapshot,
  buildV6SnapshotFromVerifiedV5,
  canonicalSnapshotSha256,
  type AcceptanceBlockerSnapshotRow,
  type LegacyAcceptanceBlockerSnapshot,
  V5_BLOCKER_INVENTORY_SHA256,
  V5_BLOCKER_SNAPSHOT_CANONICAL_SHA256,
} from './chibi-acceptance-blockers'

const inventorySha256 = 'a'.repeat(64)
const prefabPath = 'Assets/_MX/AddressableAsset/Character/Haruna_Original/Cafe/Cafe_Haruna_Original.prefab'
const saoriV5Row: AcceptanceBlockerSnapshotRow = {
  studentId: 10101,
  name: 'Saori (Swimsuit)',
  sourceIdentity: 'ch0266',
  sourceFingerprint: 'c2dda9fce74ba470a510e0cdab930844eff876ad62150254bcf3cefdfb495db9',
  itemFingerprint: '53c0412af03c3152ddc4a713a4317e3e70a5618888451c6aa2aab7e4d6400b57',
  prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0266/Cafe/Cafe_CH0266.prefab',
  expectedStatus: 'unavailable',
  diagnostic: 'Source rendering profile is unresolved for ch0266: Core renderer Cafe_CH0266/CH0266_WaterCannon_Outline is a source-bound weapon/equipment renderer without an exact authored attachment relation (UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT). Core renderer Cafe_CH0266/Saori_Original_Handgun is a source-bound weapon/equipment renderer without an exact authored attachment relation (UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT).',
}

function reportWith(dependencies: string[] = []): InventoryReport {
  const bundleSha256 = 'b'.repeat(64)
  return {
    version: 2,
    source: 'fixture/BAAD',
    files: [{
      path: 'fixture.zip', size: 1, sha256: 'c'.repeat(64), kind: 'archive',
      entries: [{
        path: 'assets-_mx-characters-haruna_original-_mxdependency-meshes-2026-01-01_assets_all_1.bundle',
        size: 10, compressedSize: 8, crc32: '12345678', sha256: bundleSha256,
        metadata: {
          serializedFiles: ['CAB-haruna'],
          objects: [{ type: 'AnimationClip', name: 'Haruna_Original_Cafe_Idle', pathId: '1', file: 'CAB-haruna' }],
          dependencies, events: [],
          containers: [{ path: prefabPath, target: { file: 'CAB-haruna', pathId: '10' } }],
        },
      }],
    }],
    // The generator must rebuild candidates from source files, not trust a cached candidate list.
    candidates: [], errors: [],
  }
}

const roster = {
  version: 1,
  checksum: 'fixture-roster-checksum',
  students: [
    { id: 10002, name: 'Haruna', pathName: 'haruna', devName: 'Haruna', image: '', portrait: '' },
    { id: 10003, name: 'Unmatched Student', pathName: 'missing', devName: 'Missing', image: '', portrait: '' },
  ],
}

test('incomplete source evidence no longer generates a pre-conversion blocker row', () => {
  const report = reportWith()
  const snapshot = buildAcceptanceBlockerSnapshot(report, inventorySha256, roster)
  const repeated = buildAcceptanceBlockerSnapshot(report, inventorySha256, roster)

  assert.deepEqual(snapshot, repeated)
  assert.equal(snapshot.snapshotVersion, 'chibi-acceptance-known-blockers-v6')
  assert.equal(snapshot.profileVersion, CHIBI_RENDERING_PROFILE_VERSION)
  assert.equal(snapshot.policyVersion, CHIBI_RENDERING_POLICY_VERSION)
  assert.deepEqual(snapshot.counts, {
    eligible: 2, mapped: 1, successful: 1, blocked: 1, mappedBlocked: 0, sourceUnavailable: 1,
  })
  assert.deepEqual(snapshot.source, {
    kind: 'BAAD', inventoryVersion: 2, inventorySha256, files: 1, entries: 1, candidates: 1,
  })
  assert.deepEqual(snapshot.rows[0], {
    studentId: 10003, name: 'Unmatched Student', sourceIdentity: null, sourceFingerprint: null,
    itemFingerprint: null, prefabPath: null, expectedStatus: 'unavailable',
    diagnostic: 'No exact canonical source identity was found.',
  })
})

test('rejects unsupported input and source candidates with unresolved dependency closure', () => {
  assert.throws(() => buildAcceptanceBlockerSnapshot({ ...reportWith(), source: '' }, inventorySha256, roster), /version-2 inventory/)
  assert.throws(() => buildAcceptanceBlockerSnapshot(reportWith(['Missing-CAB']), inventorySha256, roster), /unresolved dependencies: missing-cab/)
  assert.throws(() => buildAcceptanceBlockerSnapshot(reportWith(), 'not-a-hash', roster), /SHA-256/)
})

function verifiedV5Fixture(): LegacyAcceptanceBlockerSnapshot {
  return {
    schemaVersion: 1,
    snapshotVersion: 'chibi-acceptance-known-blockers-v5',
    roster: { version: 1, checksum: 'fixture-roster', eligibleCount: 4 },
    source: {
      kind: 'BAAD', inventoryVersion: 2, inventorySha256: V5_BLOCKER_INVENTORY_SHA256,
      files: 1, entries: 3, candidates: 2,
    },
    profileVersion: 'chibi-rendering-profile-v9',
    policyVersion: 'chibi-rendering-policy-v9',
    counts: { eligible: 4, mapped: 3, successful: 1, blocked: 3, mappedBlocked: 2, sourceUnavailable: 1 },
    rows: [
      {
        studentId: 10040, name: 'Tsukuyo', sourceIdentity: 'ch0114', sourceFingerprint: 'd'.repeat(64),
        itemFingerprint: 'e'.repeat(64), prefabPath: 'Assets/example/Tsukuyo.prefab',
        expectedStatus: 'unavailable', diagnostic: 'Prior exact source-renderer diagnostic.',
      },
      saoriV5Row,
      {
        studentId: 10102, name: 'Source unavailable', sourceIdentity: null, sourceFingerprint: null,
        itemFingerprint: null, prefabPath: null, expectedStatus: 'unavailable',
        diagnostic: 'No exact canonical source identity was found.',
      },
    ],
  }
}

test('v6 rebase removes only the exact Saori v5 row and refreshes remaining mapped fingerprints', () => {
  const previous = verifiedV5Fixture()
  const next = buildV6SnapshotFromVerifiedV5(previous)
  const retained = next.rows.find(row => row.studentId === 10040)!
  const prior = previous.rows.find(row => row.studentId === 10040)!

  assert.deepEqual(next.counts, {
    eligible: 4, mapped: 3, successful: 2, blocked: 2, mappedBlocked: 1, sourceUnavailable: 1,
  })
  assert.deepEqual(next.rows.map(row => row.studentId), [10040, 10102])
  assert.deepEqual({ ...retained, itemFingerprint: prior.itemFingerprint }, prior)
  assert.equal(retained.itemFingerprint, buildFingerprint({ fingerprint: prior.sourceFingerprint! }, defaultProfile({
    sourceIdentity: prior.sourceIdentity!, fingerprint: prior.sourceFingerprint!, conflict: false, parts: [], families: [],
    revisions: [], clips: [], objectNames: [], materials: [], dependencies: [], events: [],
  }), {}))
  assert.deepEqual(next.rows[1], previous.rows[2])
  assert.equal(next.snapshotVersion, 'chibi-acceptance-known-blockers-v6')
  assert.equal(next.policyVersion, CHIBI_RENDERING_POLICY_VERSION)
  assert.equal(next.source.inventorySha256, previous.source.inventorySha256)
})

test('v5 rebase guards pin raw hash, roster, Saori identity and the complete previous row set', () => {
  const old = verifiedV5Fixture()
  assert.equal(assertV5InventorySha256(V5_BLOCKER_INVENTORY_SHA256), undefined)
  assert.throws(() => assertV5InventorySha256('f'.repeat(64)), /does not match/)

  const fullRoster = acceptanceRosterPlan('full')
  assert.equal(assertV5Roster(fullRoster), undefined)
  assert.throws(() => assertV5Roster({ ...fullRoster, checksum: 'tampered' }), /exact committed v5 full-roster/)

  assert.doesNotThrow(() => assertSaoriSwimsuitV5Row(old.rows[1]))
  for (const mutate of [
    (row: AcceptanceBlockerSnapshotRow) => { row.sourceIdentity = 'wrong-source' },
    (row: AcceptanceBlockerSnapshotRow) => { row.sourceFingerprint = 'f'.repeat(64) },
    (row: AcceptanceBlockerSnapshotRow) => { row.prefabPath = 'Assets/foreign.prefab' },
    (row: AcceptanceBlockerSnapshotRow) => { row.expectedStatus = 'review-required' },
    (row: AcceptanceBlockerSnapshotRow) => { row.diagnostic += ' Tampered.' },
  ]) {
    const tampered = structuredClone(saoriV5Row)
    mutate(tampered)
    assert.throws(() => assertSaoriSwimsuitV5Row(tampered), /exact source-pinned legacy evidence/)
  }

  const baselineSha = canonicalSnapshotSha256(old)
  assert.doesNotThrow(() => assertCanonicalSnapshotSha256(old, baselineSha))
  const changedOtherDiagnostic = structuredClone(old)
  changedOtherDiagnostic.rows[0]!.diagnostic = 'Unexpected source diagnostic.'
  assert.throws(() => assertCanonicalSnapshotSha256(changedOtherDiagnostic, baselineSha), /status, diagnostics, or shape changed/)
  const changedOtherStatus = structuredClone(old)
  changedOtherStatus.rows[0]!.expectedStatus = 'review-required'
  assert.throws(() => assertCanonicalSnapshotSha256(changedOtherStatus, baselineSha), /status, diagnostics, or shape changed/)
})

test('runs the exact current source-pinned Saori positive policy test required by the rebase', () => {
  assert.doesNotThrow(assertSaoriSwimsuitPolicyTestPasses)
})

test('pins the on-disk v5 baseline digest and exact Saori row before rebase', async () => {
  const snapshot = JSON.parse(await readFile(new URL('./chibi-acceptance-blockers.snapshot.json', import.meta.url), 'utf8'))
  if (snapshot.snapshotVersion === 'chibi-acceptance-known-blockers-v5') {
    assert.equal(canonicalSnapshotSha256(snapshot), V5_BLOCKER_SNAPSHOT_CANONICAL_SHA256)
    assert.doesNotThrow(() => assertSaoriSwimsuitV5Row(snapshot.rows.find((row: AcceptanceBlockerSnapshotRow) => row.studentId === 10101)))
    return
  }

  // The same test remains useful after the explicit rebase replaces the v5 file.
  assert.equal(snapshot.snapshotVersion, 'chibi-acceptance-known-blockers-v6')
  assert.equal(snapshot.profileVersion, 'chibi-rendering-profile-v9')
  assert.equal(snapshot.policyVersion, 'chibi-rendering-policy-v12')
  assert.equal(snapshot.rows.some((row: AcceptanceBlockerSnapshotRow) => row.studentId === 10101), false)
})
