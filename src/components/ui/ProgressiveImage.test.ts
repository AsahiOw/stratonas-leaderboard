import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

function harness(width = 52, eager = false, height = width, aspect = 1, dpr = 2, objectFit = 'contain') {
  const source = readFileSync(new URL('./ProgressiveImage.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('  useEffect(() => {')
  const end = source.indexOf('\n  const current', start)
  const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const display: { url: string; ready: boolean }[] = []
  const downloads: { url: string; resolve: () => void; reject: () => void }[] = []
  let cleanup = () => {}, visible!: (entries: { isIntersecting: boolean }[]) => void, resize!: () => void
  class Intersection { constructor(callback: typeof visible) { visible = callback } observe() {} disconnect() {} }
  class Resize { constructor(callback: typeof resize) { resize = callback } observe() {} disconnect() {} }
  new Function('useEffect', 'imageRef', 'source', 'direct', 'loading', 'priority', 'setDisplay', 'imageThumbnail', 'loadDecodedImage', 'ResizeObserver', 'IntersectionObserver', 'window', js)(
    (effect: () => () => void) => { cleanup = effect() },
    { current: { getBoundingClientRect: () => ({ width, height }), naturalWidth: 32 * aspect, naturalHeight: 32,
      addEventListener() {}, removeEventListener() {}, parentElement: { getBoundingClientRect: () => ({ width: 400 }) } } },
    '/assets/student.webp', false, eager ? 'eager' : 'lazy', false, (value: typeof display[number]) => display.push(value),
    (src: string, size: number, quality?: number) => { if (size !== 16) assert.equal(quality, 90); return `${src}?width=${size}` },
    (url: string) => new Promise<void>((resolve, reject) => { downloads.push({ url, resolve, reject: () => reject(new Error('failed')) }) }),
    Resize, Intersection, { devicePixelRatio: dpr, getComputedStyle: () => ({ objectFit }) },
  )
  return { display, downloads, cleanup, resize: () => resize(), visible: () => visible([{ isIntersecting: true }]) }
}

test('lazy images show a tiny preview and only fetch the larger file near the viewport', async () => {
  const h = harness()
  assert.deepEqual(h.display, [{ source: '/assets/student.webp', url: '/assets/student.webp?width=16', ready: false }])
  assert.equal(h.downloads.length, 0)
  h.visible(); assert.equal(h.downloads[0].url, '/assets/student.webp?width=52')
  assert.equal(h.display.at(-1)?.ready, false)
  h.downloads[0].resolve(); await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.display.at(-1)?.ready, true)
  h.resize(); assert.equal(h.downloads.length, 1)
})

test('small icons use their own size rather than their wider parent', () => {
  const h = harness(14, true)
  assert.equal(h.downloads[0].url, '/assets/student.webp?width=14')
})

test('wide artwork cropped into tall cards retains enough pixels for the visible crop', () => {
  const h = harness(340, true, 426, 1600 / 1124, 1, 'cover')
  assert.equal(h.downloads[0].url, '/assets/student.webp?width=607')
})

test('high density mobile screens retain their 3x resolution', () => {
  const h = harness(100, true, 100, 1, 3)
  assert.equal(h.downloads[0].url, '/assets/student.webp?width=150')
})

test('unmount or source change ignores an obsolete decoded download', async () => {
  const h = harness(52, true); h.cleanup(); h.downloads[0].resolve(); await Promise.resolve()
  assert.equal(h.display.at(-1)?.ready, false)
})

test('failed thumbnails recover using the original image before invoking a native fallback', async () => {
  const h = harness(52, true); h.downloads[0].reject(); await Promise.resolve()
  assert.equal(h.downloads[1].url, '/assets/student.webp')
  assert.equal(h.display.at(-1)?.ready, false)
  h.downloads[1].resolve(); await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.display.at(-1)?.url, '/assets/student.webp')
  assert.equal(h.display.at(-1)?.ready, true)
})

test('an obsolete failed thumbnail does not start an original image download', async () => {
  const h = harness(52, true); h.cleanup(); h.downloads[0].reject()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.downloads.length, 1)
  assert.equal(h.display.at(-1)?.ready, false)
})
