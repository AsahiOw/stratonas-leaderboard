import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import ts from 'typescript'

async function fixture(run: (context: { source: string; optimized: string; poster: string; calls: string[]; processVideo: (file: string) => Promise<unknown>; scan: () => Promise<string[]>; fail: (stage: string) => void }) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'memorial-cleanup-'))
  const sourceDir = path.join(root, 'lobbies'), videoDir = path.join(root, 'lobbies-optimized'), posterDir = path.join(root, 'lobby-posters')
  const source = path.join(sourceDir, 'student.mp4'), optimized = path.join(videoDir, 'student.mp4'), poster = path.join(posterDir, 'student.jpg')
  const calls: string[] = []
  let failure = ''
  try {
    await Promise.all([sourceDir, videoDir, posterDir].map(dir => fs.mkdir(dir)))
    await fs.writeFile(source, 'original video')
    const code = readFileSync(new URL('./memorial-media-sync.ts', import.meta.url), 'utf8')
    const functions = code.slice(code.indexOf('async function findExistingVideosNeedingWork()'), code.indexOf('async function runFfmpeg('))
      + code.slice(code.indexOf('async function isFile('), code.indexOf('async function removeIfExists('))
    const js = ts.transpileModule(`${functions}; return { processVideo, scan: findExistingVideosNeedingWork }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    const processing = new Function('fs', 'path', 'SOURCE_DIR', 'VIDEO_OUT_DIR', 'POSTER_OUT_DIR', 'HEIGHT', 'FPS', 'CRF', 'PRESET', 'FFMPEG_THREADS', 'updateState', 'upsertLocalVideo', 'upsertOptimizedVideo', 'upsertPosterVideo', 'removeIfExists', 'runFfmpeg', js)(
      fs, path, sourceDir, videoDir, posterDir, 720, 24, 30, 'slow', '2', async () => {}, async () => {}, async () => {},
      async () => { if (failure === 'database') throw new Error('Database failed') },
      async (file: string) => fs.rm(file, { force: true }),
      async (args: string[], progress: { label: string }) => {
        calls.push(progress.label)
        if (failure === progress.label) throw new Error('Conversion failed')
        await fs.writeFile(args.at(-1)!, failure === 'empty poster' && progress.label === 'Generating poster' ? '' : 'completed output')
      },
    )
    await run({ source, optimized, poster, calls, ...processing, fail: stage => { failure = stage } })
  } finally { await fs.rm(root, { recursive: true, force: true }) }
}

test('removes the original only after conversion, poster generation and record updates succeed', async () => {
  await fixture(async context => {
    assert.deepEqual(await context.processVideo(context.source), { optimized: 1, posters: 1, skipped: 0 })
    await assert.rejects(fs.stat(context.source), { code: 'ENOENT' })
    assert.ok((await fs.stat(context.optimized)).size > 0)
    assert.ok((await fs.stat(context.poster)).size > 0)
    assert.deepEqual(context.calls, ['Optimizing', 'Generating poster'])
  })
})

test('the scan includes completed originals and cleanup reuses their existing outputs', async () => {
  await fixture(async context => {
    await fs.writeFile(context.optimized, 'existing optimized video')
    await fs.writeFile(context.poster, 'existing poster')
    await fs.mkdir(path.join(path.dirname(context.source), 'ignore.mp4'))
    assert.deepEqual(await context.scan(), [context.source])
    assert.deepEqual(await context.processVideo(context.source), { optimized: 0, posters: 0, skipped: 2 })
    await assert.rejects(fs.stat(context.source), { code: 'ENOENT' })
    assert.deepEqual(context.calls, [])
    assert.deepEqual(await context.scan(), [])
  })
})

test('failed conversions, missing poster contents and failed record updates preserve the original', async () => {
  for (const stage of ['Optimizing', 'Generating poster', 'empty poster', 'database']) {
    await fixture(async context => {
      context.fail(stage)
      await assert.rejects(context.processVideo(context.source))
      assert.equal(await fs.readFile(context.source, 'utf8'), 'original video')
    })
  }
})

test('empty existing outputs are rebuilt before deleting the source', async () => {
  await fixture(async context => {
    await fs.writeFile(context.optimized, '')
    await fs.writeFile(context.poster, '')
    await context.processVideo(context.source)
    assert.deepEqual(context.calls, ['Optimizing', 'Generating poster'])
    await assert.rejects(fs.stat(context.source), { code: 'ENOENT' })
  })
})

test('cleanup rejects a path outside the original lobby folder', async () => {
  await fixture(async context => {
    await assert.rejects(context.processVideo(context.optimized), /inside the lobby download folder/)
    assert.deepEqual(context.calls, [])
    assert.equal(await fs.readFile(context.source, 'utf8'), 'original video')
  })
})
