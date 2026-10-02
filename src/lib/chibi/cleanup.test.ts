import 'dotenv/config'
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, writeFile, utimes, stat, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cleanupChibiFiles } from './cleanup'

async function fixture(run: (value: { root: string; exports: string; db: never; state: { active: boolean; removed: string[]; detached: boolean }; file: (key: string, recent?: boolean) => Promise<string> }) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'chibi-cleanup-'))
  const exports = join(root, 'exports')
  const state = { active: false, removed: [] as string[], detached: false }
  const tx = {
    $executeRaw: async () => 1,
    chibiImportJob: { findFirst: async () => state.active ? { id: 'running' } : null },
    chibiAsset: {
      findMany: async () => [
        { id: 'active', fileKey: 'published/active.glb', published: true, _count: { bindings: 1 } },
        { id: 'hidden', fileKey: 'published/hidden.glb', published: true, _count: { bindings: 1 } },
        { id: 'preview', fileKey: 'published/preview.glb', published: false, _count: { bindings: 0 } },
        { id: 'old', fileKey: 'published/old.glb', published: true, _count: { bindings: 0 } },
      ],
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => { state.removed = where.id.in; return { count: state.removed.length } },
    },
    chibiImportItem: { updateMany: async () => { state.detached = true; return { count: 1 } } },
  }
  const file = async (key: string, recent = false) => {
    const path = join(root, key)
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, 'model')
    if (!recent) await utimes(path, new Date('2020-01-01'), new Date('2020-01-01'))
    return path
  }
  try { await run({ root, exports, db: { $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) } as never, state, file }) }
  finally { await rm(root, { recursive: true, force: true }) }
}

test('cleanup preserves bindings, previews, exports and recent files while pruning obsolete files and records', async () => {
  await fixture(async ({ root, exports, db, state, file }) => {
    const kept = ['active', 'hidden', 'preview', 'exported', 'recent', 'orphan']
    for (const name of [...kept, 'old']) await file(`published/${name}.glb`, name === 'recent')
    await mkdir(join(exports, 'saved'), { recursive: true })
    await writeFile(join(exports, 'saved/records.json'), JSON.stringify({ format: 'stratonas-chibi-records', schemaVersion: 1, assets: [{ fileKey: 'published/exported.glb' }] }))
    const result = await cleanupChibiFiles(db, root, exports)
    assert.deepEqual(result, { removedFiles: 1, freedBytes: 5, skipped: false })
    assert.deepEqual(state.removed, ['old'])
    assert.equal(state.detached, true)
    for (const name of kept) assert.ok((await stat(join(root, `published/${name}.glb`))).isFile())
    await assert.rejects(stat(join(root, 'published/old.glb')), { code: 'ENOENT' })
    assert.equal((await cleanupChibiFiles(db, root, exports)).removedFiles, 0)
  })
})

test('queued or running imports prevent all cleanup mutations', async () => {
  await fixture(async ({ root, exports, db, state, file }) => {
    const old = await file('published/old.glb')
    state.active = true
    assert.equal((await cleanupChibiFiles(db, root, exports)).skipped, true)
    assert.equal(state.detached, false)
    assert.ok(await stat(old))
  })
})

test('an unreadable saved export stops cleanup without deleting anything', async () => {
  await fixture(async ({ root, exports, db, state, file }) => {
    const old = await file('published/old.glb')
    await mkdir(join(exports, 'broken'), { recursive: true })
    await writeFile(join(exports, 'broken/records.json'), '{broken')
    await assert.rejects(cleanupChibiFiles(db, root, exports))
    assert.equal(state.detached, false)
    assert.ok(await stat(old))
  })
})

test('a published symlink cannot cause cleanup outside storage', async () => {
  await fixture(async ({ root, exports, db, state, file }) => {
    const old = await file('published/old.glb')
    const outside = join(root, 'outside')
    await mkdir(outside)
    await symlink(outside, join(root, 'published/link'), process.platform === 'win32' ? 'junction' : 'dir')
    await assert.rejects(cleanupChibiFiles(db, root, exports), /symlink/)
    assert.equal(state.detached, false)
    assert.ok(await stat(old))
  })
})
