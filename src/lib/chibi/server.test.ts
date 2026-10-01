import assert from 'node:assert/strict'
import test from 'node:test'

import { getPublicChibiStudents } from './server'
import { emptyChibiProfile } from './types'

type CatalogRow = {
  id: number
  name: string
  pathName: string
  image: string
  portrait: string | null
  chibiBinding: {
    status: string
    catalogVisible: boolean
    identityPath: string
    profile: ReturnType<typeof emptyChibiProfile>
    arrangementOverride?: unknown
    asset: {
      id: string
      checksum: string
      sourceIdentity: string
      published: boolean
      validation: unknown
    } | null
  } | null
  chibiImportItems: Array<{ status: string; assetId: string | null }>
}

function row(id: number, name: string, options: {
  binding?: Partial<NonNullable<CatalogRow['chibiBinding']>> | null
  latestItem?: { status: string; assetId: string | null } | null
} = {}): CatalogRow {
  const asset = {
    id: `asset-${id}`,
    checksum: `${id}`.repeat(64 / String(id).length),
    sourceIdentity: `source-${id}`,
    published: true,
    validation: { valid: true },
  }
  const defaultBinding: NonNullable<CatalogRow['chibiBinding']> = {
    status: 'available', catalogVisible: true, identityPath: `student-${id}`, profile: emptyChibiProfile(), asset,
  }
  const binding = options.binding === null
    ? null
    : { ...defaultBinding, ...options.binding, asset: options.binding?.asset === undefined ? asset : options.binding.asset }
  return {
    id, name, pathName: `student-${id}`, image: '/portrait.png', portrait: null,
    chibiBinding: binding,
    chibiImportItems: options.latestItem === null ? [] : [options.latestItem ?? { status: 'imported', assetId: asset.id }],
  }
}

test('public catalog exposes only active valid published bindings', async () => {
  const rows = [
    row(10003, 'Published'),
    row(10004, 'Failed replacement', { latestItem: { status: 'failed', assetId: 'asset-10004' } }),
    row(10005, 'Unavailable replacement', { latestItem: { status: 'unavailable', assetId: null } }),
    row(10006, 'No import history', { latestItem: null }),
    row(10007, 'Invalid asset', { binding: { asset: { ...row(10007, 'unused').chibiBinding!.asset!, validation: { valid: false } } } }),
    row(10008, 'Stale identity', { binding: { identityPath: 'old-source' } }),
    row(10009, 'Unpublished', { binding: { asset: { ...row(10009, 'unused').chibiBinding!.asset!, published: false } } }),
    row(10010, 'Unavailable binding', { binding: { status: 'unavailable' } }),
    row(10012, 'Hidden', { binding: { catalogVisible: false } }),
  ]
  let query: any
  const db = { student: { findMany: async (input: any) => { query = input; return rows } } }

  const result = await getPublicChibiStudents(db as any)

  assert.deepEqual(result.map(student => student.id), [10003, 10004, 10005, 10006])
  assert.equal(result[0]?.status, 'viewable')
  assert.equal(result[0]?.model?.assetId, 'asset-10003')
  assert.equal(result[0]?.diagnostic, null)
  assert.deepEqual(query.where, { id: { gte: 10000, lte: 99999 } })
  assert.equal(query.select.chibiImportItems, undefined)
})

test('public catalog preserves the active model after a failed replacement import', async () => {
  const currentAsset = row(10011, 'Current').chibiBinding!.asset!
  const db = {
    student: {
      findMany: async () => [{
        ...row(10011, 'Current'),
        chibiImportItems: [{ status: 'failed', assetId: currentAsset.id }],
      }],
    },
  }

  const result = await getPublicChibiStudents(db as any)
  assert.equal(result[0]?.model?.assetId, currentAsset.id)
})

test('public catalog carries saved eye layering for visitors', async () => {
  const face = { depthTest: true, depthOffset: -2 }
  const db = { student: { findMany: async () => [row(10107, 'Chiaki', {
    binding: { arrangementOverride: { schemaVersion: 1, nodes: { '$eyes': face } } },
  })] } }
  const result = await getPublicChibiStudents(db as any)
  assert.deepEqual(result[0].model?.arrangement?.nodes.$eyes, face)
  assert.deepEqual(result[0].model?.arrangementDefault, { schemaVersion: 1, nodes: {} })
})
