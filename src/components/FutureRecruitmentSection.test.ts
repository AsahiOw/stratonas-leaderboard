import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function videoHarness(pageLoaded = false) {
  const source = readFileSync(new URL('./FutureRecruitmentSection.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const start = source.indexOf('  useEffect(() => {\n    const stage = videoStageRef.current')
  const end = source.indexOf('\n  useEffect(() => {', start + 1)
  const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const ready: (string | null)[] = [], timers = new Map<number, () => void>(), listeners = new Map<string, () => void>()
  let cleanup = () => {}, intersection!: (entries: { isIntersecting: boolean }[]) => void, disconnected = false
  class Observer {
    constructor(callback: typeof intersection) { intersection = callback }
    observe() {}
    disconnect() { disconnected = true }
  }
  new Function('useEffect', 'videoStageRef', 'animationPath', 'setVideoReadyFor', 'setPlayingVideo', 'IntersectionObserver', 'document', 'window', 'setTimeout', 'clearTimeout', js)(
    (effect: () => () => void) => { cleanup = effect() }, { current: {} }, '/assets/video.mp4', (value: string | null) => ready.push(value), () => {}, Observer,
    { readyState: pageLoaded ? 'complete' : 'loading' }, { addEventListener: (event: string, handler: () => void) => listeners.set(event, handler), removeEventListener: (event: string) => listeners.delete(event) },
    (handler: () => void, delay: number) => { assert.equal(delay, 1200); timers.set(1, handler); return 1 }, (id: number) => timers.delete(id),
  )
  return {
    ready, timers, listeners, cleanup: () => cleanup(), disconnected: () => disconnected,
    visible: (value: boolean) => intersection([{ isIntersecting: value }]),
    load: () => listeners.get('load')?.(), delay: () => { for (const handler of timers.values()) handler(); timers.clear() },
  }
}

test('visible recruitment waits for page load and delay before attaching video source', () => {
  const h = videoHarness(); h.visible(true)
  assert.deepEqual(h.ready, [null]); assert.equal(h.timers.size, 0)
  h.load(); assert.deepEqual(h.ready, [null]); h.delay()
  assert.deepEqual(h.ready, [null, '/assets/video.mp4'])
})

test('offscreen recruitment stays poster-only until scrolled into view', () => {
  const h = videoHarness(true); h.delay(); h.visible(false)
  assert.deepEqual(h.ready, [null]); h.visible(true)
  assert.deepEqual(h.ready, [null, '/assets/video.mp4'])
})

test('changing recruitment or unmounting cancels pending video work', () => {
  const h = videoHarness(); h.visible(true); h.load()
  const lateTimer = h.timers.get(1)!
  h.cleanup(); lateTimer(); h.visible(true)
  assert.deepEqual(h.ready, [null]); assert.equal(h.timers.size, 0)
  assert.equal(h.listeners.size, 0); assert.equal(h.disconnected(), true)
})
