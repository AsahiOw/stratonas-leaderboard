import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { downloadChibiModel, type ModelDownloadProgress } from './chibi-model-download'

function publicUrl(id: string, revision = 'a') {
  return `/assets/chibi/${id}/${revision.repeat(64)}.glb`
}

test('admin browsing keeps the public URL only for the same published model revision', () => {
  const source = readFileSync(new URL('./ChibiBrowser.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('function mergeAdminStudents(')
  const end = source.indexOf('\nfunction Message(', start)
  const js = ts.transpileModule(`${source.slice(start, end)}; return mergeAdminStudents`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const merge = new Function(js)()
  const published = { id: 1, name: 'A', model: { assetId: 'asset', revision: 'a', url: publicUrl('asset') } }
  const preview = { ...published, model: { ...published.model, url: '/api/admin/chibi/assets/asset/a.glb', arrangement: { edited: true } } }
  assert.equal(merge([published], [preview])[0].model.url, published.model.url)
  assert.deepEqual(merge([published], [preview])[0].model.arrangement, { edited: true })
  assert.equal(merge([], [preview])[0].model.url, preview.model.url)
  assert.equal(merge([published], [{ ...preview, model: { ...preview.model, revision: 'b' } }])[0].model.url, preview.model.url)
  assert.equal(merge([published], [{ ...preview, model: { ...preview.model, assetId: 'other' } }])[0].model.url, preview.model.url)
})

test('switching public models A to B to A reuses completed bytes without fetching A again', async t => {
  const requests: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    requests.push(url)
    return new Response(new Uint8Array([1, 2, 3]))
  })
  const load = (url: string) => downloadChibiModel(url, new AbortController().signal, () => {})
  const first = await load(publicUrl('switch-a'))
  await load(publicUrl('switch-b'))
  const progress: ModelDownloadProgress[] = []
  const again = await downloadChibiModel(publicUrl('switch-a'), new AbortController().signal, value => progress.push(value))
  assert.equal(again, first)
  assert.deepEqual(requests, [publicUrl('switch-a'), publicUrl('switch-b')])
  assert.deepEqual(progress, [{ loaded: 3, total: 3 }])
  await load(publicUrl('switch-a', 'b'))
  assert.equal(requests.length, 3, 'a new checksum must fetch the new revision')
  const aborted = new AbortController(); aborted.abort()
  await assert.rejects(downloadChibiModel(publicUrl('switch-a'), aborted.signal, () => {}), { name: 'AbortError' })
})

test('small animation files do not evict the initial model after three entries', async t => {
  const requests: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    requests.push(url); return new Response(new Uint8Array([1]))
  })
  const load = (id: string) => downloadChibiModel(publicUrl(id), new AbortController().signal, () => {})
  await load('lru-a'); await load('lru-b'); await load('lru-c')
  await load('lru-a'); await load('lru-d'); await load('lru-a'); await load('lru-b')
  assert.deepEqual(requests.map(url => url.split('/')[3]), ['lru-a', 'lru-b', 'lru-c', 'lru-d'])
})

test('revision-bound initial and animation payloads are cached independently within the byte budget', async t => {
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => { requests++; return new Response(new Uint8Array([1, 2])) })
  const base = `${publicUrl('parts')}?part=initial&clip=Idle&v=1`, clip = `${publicUrl('parts')}?part=animation&clip=Action&v=1`
  const load = (url: string) => downloadChibiModel(url, new AbortController().signal, () => {})
  await load(base); await load(clip); await load(base); await load(clip)
  assert.equal(requests, 2)
  const large = new ArrayBuffer(70 * 1024 * 1024)
  t.mock.method(globalThis, 'fetch', async () => {
    requests++
    return { ok: true, headers: new Headers(), body: null, arrayBuffer: async () => large } as Response
  })
  await load(publicUrl('budget-a')); await load(publicUrl('budget-b')); await load(publicUrl('budget-a'))
  assert.equal(requests, 5, 'the 128 MiB limit evicts old bytes even with fewer than three files')
})

test('admin previews are fetched again and aborted public downloads are not cached', async t => {
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () => {
    requests++; return new Response(new Uint8Array([1, 2]))
  })
  const preview = `/api/admin/chibi/assets/preview/${'a'.repeat(64)}.glb`
  for (let i = 0; i < 2; i++) await downloadChibiModel(preview, new AbortController().signal, () => {})
  assert.equal(requests, 2)
  const aborted = new AbortController()
  await assert.rejects(downloadChibiModel(publicUrl('abort-cache'), aborted.signal, value => {
    if (value.loaded) aborted.abort()
  }), { name: 'AbortError' })
  await downloadChibiModel(publicUrl('abort-cache'), new AbortController().signal, () => {})
  assert.equal(requests, 4)
})

function loadingPanel(status: string, download: ModelDownloadProgress) {
  const source = readFileSync(new URL('./ChibiViewer.tsx', import.meta.url), 'utf8')
  const start = source.indexOf("      {!error && status !== 'Model ready'")
  const block = source.slice(start, source.indexOf('      <div className={styles.toolbar}', start))
  const js = ts.transpileModule(`return <div>${block}</div>`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText
  return renderToStaticMarkup(new Function('React', 'error', 'status', 'download', js)(React, null, status, download))
}

test('loading panel exposes truthful percentage and indeterminate progress, then preparing status', () => {
  const known = loadingPanel('Downloading model…', { loaded: 2_000_000, total: 4_000_000 })
  assert.match(known, /50% · 2.0 \/ 4.0 MB/)
  assert.match(known, /<progress[^>]*aria-label="Model download progress"[^>]*max="4000000"[^>]*value="2000000"/)
  const unknown = loadingPanel('Downloading model…', { loaded: 2_000_000, total: null })
  assert.match(unknown, /2.0 MB downloaded/); assert.doesNotMatch(unknown, /<progress[^>]*value=/)
  const preparing = loadingPanel('Preparing model…', { loaded: 4_000_000, total: 4_000_000 })
  assert.match(preparing, /Preparing model/); assert.doesNotMatch(preparing, /<progress/)
  assert.doesNotMatch(loadingPanel('Model ready', { loaded: 4_000_000, total: 4_000_000 }), /<progress|role="status"/)
})

test('error panel offers an accessible Retry button that increments the load attempt', () => {
  const source = readFileSync(new URL('./ChibiViewer.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('      {error && <div role="alert"')
  const end = source.indexOf('\n    </div>', start)
  const js = ts.transpileModule(`return <div>${source.slice(start, end)}</div>`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText
  let attempt = 0
  const panel = new Function('React', 'error', 'showDiagnostics', 'setRetryAttempt', js)(React, 'Network error', false, (update: (value: number) => number) => { attempt = update(attempt) }) as React.ReactElement<{ children: React.ReactNode }>
  const markup = renderToStaticMarkup(panel)
  assert.match(markup, /role="alert"/); assert.match(markup, /<button[^>]*type="button"[^>]*>Retry<\/button>/)
  const alertPanel = React.Children.toArray(panel.props.children).find(React.isValidElement) as React.ReactElement<{ children: React.ReactNode }>
  const button = React.Children.toArray(alertPanel.props.children).find(element => React.isValidElement(element) && element.type === 'button') as React.ReactElement<{ onClick: () => void }>
  button.props.onClick(); assert.equal(attempt, 1)
})

test('reports received bytes and assembles streamed chunks in order', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array([1, 2])); controller.enqueue(new Uint8Array([3, 4, 5])); controller.close()
  } }), { headers: { 'Content-Length': '5' } }))
  const progress: ModelDownloadProgress[] = []
  const buffer = await downloadChibiModel('/student.glb', new AbortController().signal, value => progress.push(value))
  assert.deepEqual(Array.from(new Uint8Array(buffer)), [1, 2, 3, 4, 5])
  assert.deepEqual(progress, [{ loaded: 0, total: 5 }, { loaded: 2, total: 5 }, { loaded: 5, total: 5 }])
})

test('uses indeterminate byte progress when length is missing or describes compressed bytes', async t => {
  const headerCases: Record<string, string>[] = [{}, { 'Content-Length': '2', 'Content-Encoding': 'gzip' }]
  for (const headers of headerCases) {
    t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array([1, 2, 3]), { headers }))
    const progress: ModelDownloadProgress[] = []
    await downloadChibiModel('/student.glb', new AbortController().signal, value => progress.push(value))
    assert.deepEqual(progress.at(-1), { loaded: 3, total: null })
    t.mock.restoreAll()
  }
})

test('cancels the stream when switching student or leaving the viewer', async t => {
  const controller = new AbortController(), progress: ModelDownloadProgress[] = []
  let cancelled = false
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({ start(stream) {
    stream.enqueue(new Uint8Array([1, 2]))
  }, cancel() { cancelled = true } })))
  await assert.rejects(downloadChibiModel('/student.glb', controller.signal, value => {
    progress.push(value); if (value.loaded) controller.abort()
  }), { name: 'AbortError' })
  assert.equal(cancelled, true); assert.equal(progress.length, 2)
})

test('a failed download can retry from zero without retaining partial bytes', async t => {
  let attempts = 0
  t.mock.method(globalThis, 'fetch', async () => {
    attempts++
    if (attempts === 1) return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array([9]));
    }, pull(controller) { controller.error(new Error('Connection lost')) } }))
    return new Response(new Uint8Array([1, 2]), { headers: { 'Content-Length': '2' } })
  })
  await assert.rejects(downloadChibiModel('/student.glb', new AbortController().signal, () => {}), /Connection lost/)
  const progress: ModelDownloadProgress[] = []
  const buffer = await downloadChibiModel('/student.glb', new AbortController().signal, value => progress.push(value))
  assert.deepEqual(progress[0], { loaded: 0, total: 2 })
  assert.deepEqual(Array.from(new Uint8Array(buffer)), [1, 2]); assert.equal(attempts, 2)
})

test('rejects HTTP failures before reporting download progress', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }))
  const progress: ModelDownloadProgress[] = []
  await assert.rejects(downloadChibiModel('/student.glb', new AbortController().signal, value => progress.push(value)), /HTTP 503/)
  assert.deepEqual(progress, [])
})

test('texture failures reject the model and release its scene; a fresh retry can succeed', async () => {
  const source = readFileSync(new URL('./ChibiViewer.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('        const manager = new THREE.LoadingManager()')
  const end = source.indexOf('        root = gltf.scene', start)
  assert.ok(start > 0 && end > start)
  const js = ts.transpileModule(`return async () => { ${source.slice(start, end)} return gltf.scene }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const scenes: object[] = [], released: object[] = [], managers: object[] = []
  let failTexture = true
  class LoadingManager { onError?: () => void }
  class Loader {
    constructor(private manager: LoadingManager) { managers.push(manager) }
    async parseAsync() {
      const scene = {}; scenes.push(scene)
      if (failTexture) this.manager.onError?.()
      return { scene }
    }
  }
  const parse = (disposed: boolean) => new Function('THREE', 'GLTFLoader', 'buffer', 'resourcePath', 'disposed', 'disposeModel', js)(
    { LoadingManager }, Loader, new ArrayBuffer(0), '/', disposed, (scene: object) => released.push(scene),
  )()
  await assert.rejects(parse(false), /Model textures could not be loaded/)
  assert.deepEqual(released, [scenes[0]])
  failTexture = false
  assert.equal(await parse(false), scenes[1])
  assert.notEqual(managers[0], managers[1])
  assert.equal(await parse(true), undefined)
  assert.deepEqual(released, [scenes[0], scenes[2]])
})
