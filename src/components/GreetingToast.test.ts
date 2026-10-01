import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('./GreetingToast.tsx', import.meta.url), 'utf8')
const flush = () => new Promise(resolve => setImmediate(resolve))

function harness({ loaded = false, enabled = true, rendered = true, fail = false } = {}) {
  const start = source.indexOf('  // Download only this greeting')
  const end = source.indexOf('\n  function clearTransitionWork()', start)
  const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const ready: boolean[] = [], media: ({ video: string; voice: string } | null)[] = []
  const requests: { url: string; signal: AbortSignal; finish: () => void }[] = []
  const timers = new Map<number, () => void>(), listeners = new Map<string, () => void>()
  const created: string[] = [], revoked: string[] = []
  let cleanup = () => {}
  new Function('useEffect', 'content', 'greetingEnabled', 'render', 'setReady', 'setMedia', 'AbortController', 'fetch', 'URL', 'document', 'window', 'setTimeout', 'clearTimeout', 'speechCleanupRef', 'transitionTimerRef', 'animationFrameRef', js)(
    (effect: () => (() => void) | undefined) => { cleanup = effect() || (() => {}) },
    { video: 3, voice: 16 }, enabled, rendered, (value: boolean) => ready.push(value), (value: typeof media[number]) => media.push(value), AbortController,
    (url: string, { signal }: { signal: AbortSignal }) => {
      let finish!: () => void
      const body = new Promise<Blob>(resolve => { finish = () => resolve(new Blob([url])) })
      requests.push({ url, signal, finish })
      return Promise.resolve({ ok: !fail, blob: () => body })
    },
    { createObjectURL: () => { const url = `blob:downloaded-${created.length}`; created.push(url); return url }, revokeObjectURL: (url: string) => revoked.push(url) },
    { readyState: loaded ? 'complete' : 'loading' },
    { addEventListener: (event: string, callback: () => void) => listeners.set(event, callback), removeEventListener: (event: string) => listeners.delete(event), clearTimeout() {}, cancelAnimationFrame() {} },
    (callback: () => void, delay: number) => { assert.equal(delay, 1200); timers.set(1, callback); return 1 }, (id: number) => timers.delete(id),
    { current: null }, { current: null }, { current: null },
  )
  return { ready, media, requests, created, revoked, timers, listeners, cleanup, load: () => listeners.get('load')?.(), delay: () => timers.get(1)?.() }
}

test('selected media waits until page load and delay; call waits for both complete bodies', async () => {
  const h = harness(); assert.equal(h.requests.length, 0)
  h.load(); assert.equal(h.requests.length, 0)
  h.delay()
  assert.deepEqual(h.requests.map(request => request.url), ['/assets/greeting/Kei3.mp4', '/assets/voice/kei/16.mp3'])
  await flush(); h.requests[0].finish(); await flush()
  assert.equal(h.ready.at(-1), false); assert.equal(h.created.length, 0)
  h.requests[1].finish(); await flush()
  assert.equal(h.ready.at(-1), true)
  assert.deepEqual(h.media.at(-1), { video: 'blob:downloaded-0', voice: 'blob:downloaded-1' })
})

test('changing greeting, disabling it or unmounting aborts in-flight downloads', async () => {
  const h = harness({ loaded: true }); h.delay(); await flush(); h.cleanup()
  assert.ok(h.requests.every(request => request.signal.aborted))
  h.requests.forEach(request => request.finish()); await flush()
  assert.equal(h.ready.at(-1), false); assert.equal(h.created.length, 0)
})

test('cleanup removes completed media object URLs', async () => {
  const h = harness({ loaded: true }); h.delay(); await flush()
  h.requests.forEach(request => request.finish()); await flush(); h.cleanup()
  assert.deepEqual(h.revoked, h.created)
})

test('failed media does not offer a call with missing playback', async () => {
  const h = harness({ loaded: true, fail: true }); h.delay(); await flush()
  assert.equal(h.ready.at(-1), false); assert.equal(h.created.length, 0)
  assert.ok(h.requests.every(request => request.signal.aborted))
})

test('disabled and dismissed greetings do not preload media', () => {
  for (const options of [{ enabled: false }, { rendered: false }]) {
    const h = harness(options)
    assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0); assert.equal(h.requests.length, 0)
  }
})

test('unmount before page load or delay cancels scheduled media work', () => {
  const h = harness(); h.load(); h.cleanup()
  assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0); assert.equal(h.requests.length, 0)
})
