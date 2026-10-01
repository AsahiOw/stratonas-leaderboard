import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { downloadChibiModel, type ModelDownloadProgress } from './chibi-model-download'

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
