import 'dotenv/config'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { exportChibiRecords, importChibiRecords, readChibiRecords } from './record-transfer'
import { initialPlaygroundMapping } from './playground-mapping'
import { emptyChibiProfile } from './types'

const bytes = Buffer.from('isolated copied model')
const asset = {
  id: 'asset-test', sourceIdentity: 'source-test', fingerprint: 'fingerprint', coreFingerprint: null,
  coreFingerprintSchemaVersion: null, dependencyFingerprint: 'dependency', exporterVersion: 'exporter',
  checksum: createHash('sha256').update(bytes).digest('hex'), fileKey: 'published/model/model.glb',
  clips: ['Idle', 'Pickup'], materials: {}, validation: { valid: true }, arrangementDefault: {},
  published: true, createdAt: new Date('2026-10-02T00:00:00Z').toISOString(),
}
const student = { id: 10002, name: 'Haruna', pathName: 'Haruna' }
const binding = {
  studentId: student.id, assetId: asset.id, sourceIdentity: asset.sourceIdentity, identityPath: student.pathName,
  profile: { label: 'Custom animation settings' }, provenance: 'manual', overrides: { scale: 1.2 },
  arrangementOverride: { schemaVersion: 1, nodes: {} }, catalogVisible: false, status: 'available', diagnostic: null,
}
const records = () => structuredClone({ format: 'stratonas-chibi-records', schemaVersion: 1, exportedAt: asset.createdAt, students: [student], assets: [asset], bindings: [binding] })
test('new exports retain reviewed playground roles while older exports omit the setting', () => {
  const value = records() as ReturnType<typeof records> & { bindings: Array<typeof binding & { playgroundMapping?: unknown }> }
  const mapping = initialPlaygroundMapping(asset.sourceIdentity, emptyChibiProfile())
  mapping.roles.greeting = [{ clip: 'Idle', loop: false }]
  value.bindings[0].playgroundMapping = mapping
  assert.deepEqual(readChibiRecords(value).bindings[0].playgroundMapping, mapping)
  assert.equal(Object.hasOwn(readChibiRecords(records()).bindings[0], 'playgroundMapping'), false)
})
function database() {
  const state = { active: null as { id: string } | null, pathName: 'Haruna', models: [] as any[], bindings: [] as any[], transactions: 0 }
  const tx = {
    $executeRaw: async () => 1,
    chibiImportJob: { findFirst: async () => state.active },
    student: { findMany: async () => [{ id: student.id, pathName: state.pathName }] },
    chibiAsset: {
      findMany: async () => state.models,
      upsert: async ({ create }: { create: any }) => { state.models = [create]; return create },
    },
    studentChibiBinding: {
      findMany: async () => [{ ...binding, student, asset: { ...asset, createdAt: new Date(asset.createdAt) } }],
      upsert: async ({ create }: { create: any }) => { state.bindings = [create]; return create },
    },
  }
  return { state, db: { $transaction: async (run: (value: typeof tx) => unknown) => { state.transactions++; return run(tx) } } as never }
}

test('records retain animations, visibility and adjustments and reject invalid references', () => {
  assert.deepEqual(readChibiRecords(records()).bindings[0], binding)
  for (const change of [
    (value: any) => { value.schemaVersion = 9 },
    (value: any) => { value.assets[0].fileKey = 'published/../outside.glb' },
    (value: any) => { value.bindings[0].assetId = 'missing' },
    (value: any) => { value.bindings[0].sourceIdentity = 'other-model' },
    (value: any) => { value.bindings.push(value.bindings[0]) },
  ]) {
    const value = records(); change(value)
    assert.throws(() => readChibiRecords(value))
  }
})

test('export writes only model records to a selectable folder', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-record-export-'))
  try {
    const { db } = database()
    const result = await exportChibiRecords(db, root)
    const folders = await readdir(root)
    const exported = JSON.parse(await readFile(path.join(root, folders[0], 'records.json'), 'utf8'))
    assert.equal(result.students, 1)
    assert.deepEqual(exported.bindings[0], binding)
    assert.deepEqual(exported.assets[0].clips, asset.clips)
    assert.deepEqual(Object.keys(exported).sort(), ['assets', 'bindings', 'exportedAt', 'format', 'schemaVersion', 'students'])
    assert.deepEqual(await readdir(path.join(root, folders[0])), ['records.json'])
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('missing and mismatched copied models cause no database writes; matching files import and repeat safely', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-record-files-'))
  const previous = process.env.CHIBI_DATA_DIR
  process.env.CHIBI_DATA_DIR = root
  try {
    const { db, state } = database()
    await assert.rejects(importChibiRecords(records(), db), /missing or unreadable/)
    assert.equal(state.transactions, 0)
    await mkdir(path.join(root, 'published/model'), { recursive: true })
    await writeFile(path.join(root, asset.fileKey), 'wrong file')
    await assert.rejects(importChibiRecords(records(), db), /checksum differs/)
    assert.equal(state.transactions, 0)
    await writeFile(path.join(root, asset.fileKey), bytes)
    assert.deepEqual(await importChibiRecords(records(), db), { students: 1, models: 1 })
    await importChibiRecords(records(), db)
    assert.equal(state.models.length, 1)
    assert.equal(state.bindings.length, 1)
    assert.deepEqual(state.bindings[0], binding)
    assert.deepEqual(await readFile(path.join(root, asset.fileKey)), bytes)
  } finally {
    if (previous === undefined) delete process.env.CHIBI_DATA_DIR; else process.env.CHIBI_DATA_DIR = previous
    await rm(root, { recursive: true, force: true })
  }
})

test('active imports, mismatched students and conflicting asset IDs block changes', async () => {
  const active = database(); active.state.active = { id: 'running-job' }
  await assert.rejects(importChibiRecords(records(), active.db, async () => {}), /already active/)
  assert.equal(active.state.bindings.length, 0)
  const mismatch = database(); mismatch.state.pathName = 'Wrong student'
  await assert.rejects(importChibiRecords(records(), mismatch.db, async () => {}), /differs on this host/)
  assert.equal(mismatch.state.models.length, 0)
  const collision = database(); collision.state.models = [{ ...asset, checksum: 'b'.repeat(64) }]
  await assert.rejects(importChibiRecords(records(), collision.db, async () => {}), /conflicts/)
  assert.equal(collision.state.bindings.length, 0)
})
