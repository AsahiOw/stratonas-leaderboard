import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { baadAssetArgs, downloadAssetBundles, prepareBaadSource, runBaadCommand } from './chibi-baad'

test('BA-AD command downloads Japan Android assets without media, tables or clean', () => {
  assert.deepEqual(baadAssetArgs('/staging'), ['--update', 'download', 'japan', '--assets', '--platform', 'android', '--limit', '5', '--retries', '3', '--output', '/staging'])
})

test('zero exit with partial download failure is rejected', async () => {
  await assert.rejects(runBaadCommand(process.execPath, ['-e', 'console.error("Some downloads failed")']), /BA-AD download failed/)
  await assert.rejects(runBaadCommand(process.execPath, ['-e', 'process.exit(2)']), /BA-AD download failed/)
})

test('successful download swaps only AssetBundles and keeps the prior source', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-baad-'))
  try {
    const sourceRoot = path.join(root, 'BAAD'), toolsRoot = path.join(root, 'tools')
    await mkdir(toolsRoot)
    await writeFile(path.join(toolsRoot, 'install.json'), JSON.stringify({ unityPy: { python: 'unused' } }))
    await prepareBaadSource(sourceRoot)
    await writeFile(path.join(sourceRoot, 'AssetBundles', 'old.zip'), 'old')
    await mkdir(path.join(sourceRoot, 'MediaResources'))
    await writeFile(path.join(sourceRoot, 'MediaResources', 'keep.ogg'), 'media')
    const count = await downloadAssetBundles({ sourceRoot, toolsRoot, jobId: 'test-job', executable: 'mock', onProgress() {}, run: async (_command, args) => {
      const stage = args[args.length - 1]
      await mkdir(path.join(stage, 'AssetBundles'))
      await writeFile(path.join(stage, 'AssetBundles', 'new.bundle'), 'new')
    } })
    assert.equal(count, 1)
    assert.deepEqual(await readdir(path.join(sourceRoot, 'AssetBundles')), ['new.bundle'])
    assert.equal(await readFile(path.join(sourceRoot, '.baad-previous', 'old.zip'), 'utf8'), 'old')
    assert.equal(await readFile(path.join(sourceRoot, 'MediaResources', 'keep.ogg'), 'utf8'), 'media')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('failed, empty and cancelled downloads preserve the active source', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-baad-'))
  try {
    const sourceRoot = path.join(root, 'BAAD'), toolsRoot = path.join(root, 'tools')
    await mkdir(toolsRoot)
    await writeFile(path.join(toolsRoot, 'install.json'), JSON.stringify({ unityPy: { python: 'unused' } }))
    await prepareBaadSource(sourceRoot)
    await writeFile(path.join(sourceRoot, 'AssetBundles', 'old.zip'), 'old')
    for (const mode of ['failure', 'empty', 'cancel']) {
      const controller = new AbortController()
      await assert.rejects(downloadAssetBundles({ sourceRoot, toolsRoot, jobId: mode, executable: 'mock', signal: controller.signal, onProgress() {}, run: async (_command, args) => {
        if (mode === 'failure') throw new Error('network failure')
        const stage = args[args.length - 1]
        await mkdir(path.join(stage, 'AssetBundles'))
        if (mode === 'cancel') { await writeFile(path.join(stage, 'AssetBundles', 'new.bundle'), 'new'); controller.abort() }
      } }))
      assert.equal(await readFile(path.join(sourceRoot, 'AssetBundles', 'old.zip'), 'utf8'), 'old')
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('interrupted source activation restores the previous directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-baad-'))
  try {
    await mkdir(path.join(root, '.baad-previous'))
    await writeFile(path.join(root, '.baad-previous', 'old.zip'), 'old')
    await prepareBaadSource(root)
    assert.equal(await readFile(path.join(root, 'AssetBundles', 'old.zip'), 'utf8'), 'old')
  } finally { await rm(root, { recursive: true, force: true }) }
})
