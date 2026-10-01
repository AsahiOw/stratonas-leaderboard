import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function harness(loaded = false) {
  const source = readFileSync(new URL('./DeferredVideo.tsx', import.meta.url), 'utf8')
  const js = ts.transpileModule(source.slice(source.indexOf('  useEffect(() => {'), source.indexOf('\n  return <div')), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const ready: string[] = [], timers = new Map<number, () => void>(), listeners = new Map<string, () => void>()
  let cleanup = () => {}, visibility!: (entries: { isIntersecting: boolean }[]) => void
  class Observer { constructor(callback: typeof visibility) { visibility = callback } observe() {} disconnect() {} }
  new Function('useEffect', 'stage', 'src', 'setReady', 'IntersectionObserver', 'document', 'window', 'setTimeout', 'clearTimeout', js)(
    (effect: () => () => void) => { cleanup = effect() }, { current: {} }, '/assets/video.mp4', (value: string) => ready.push(value), Observer,
    { readyState: loaded ? 'complete' : 'loading' }, { addEventListener: (event: string, handler: () => void) => listeners.set(event, handler), removeEventListener: (event: string) => listeners.delete(event) },
    (handler: () => void, delay: number) => { assert.equal(delay, 1200); timers.set(1, handler); return 1 }, (id: number) => timers.delete(id),
  )
  return { ready, timers, listeners, cleanup, visible: (value: boolean) => visibility([{ isIntersecting: value }]), load: () => listeners.get('load')?.(), delay: () => timers.get(1)?.() }
}

test('decorative video requires both visibility and a delay after page loading', () => {
  const h = harness(); h.visible(true); assert.deepEqual(h.ready, [])
  h.load(); assert.deepEqual(h.ready, [])
  h.delay(); assert.deepEqual(h.ready, ['/assets/video.mp4'])
})

test('offscreen video keeps its poster until it becomes visible', () => {
  const h = harness(true); h.delay(); assert.deepEqual(h.ready, [])
  h.visible(true); assert.deepEqual(h.ready, ['/assets/video.mp4'])
})

test('unmount cancels pending video downloads', () => {
  const h = harness(); h.load(); const late = h.timers.get(1)!
  h.cleanup(); h.visible(true); late()
  assert.deepEqual(h.ready, []); assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0)
})
