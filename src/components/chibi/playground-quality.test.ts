import assert from 'node:assert/strict'
import test from 'node:test'
import { PerspectiveCamera, Scene, type WebGLRenderer } from 'three'
import { playgroundFrameTiming, playgroundQualityLimits, readPlaygroundPreferences } from './playground-quality'
import { capturePlaygroundPhoto, playgroundPhotoScale } from './playground-photo'

test('quality profiles bound rendering pixels at mobile, desktop and large monitor sizes', () => {
  for (const [width, height] of [[320, 700], [390, 844], [844, 390], [1280, 800], [3840, 2160]]) for (const quality of ['auto', 'smooth', 'sharp'] as const) {
    const limits = playgroundQualityLimits(quality, 3, width, height)
    assert.ok(limits.minimum <= limits.initial && limits.initial <= limits.maximum)
    assert.ok(width * height * limits.maximum ** 2 <= (quality === 'sharp' ? 3_000_000 : 2_000_000) + 1)
  }
  assert.equal(playgroundQualityLimits('auto', 3, 390, 844).initial, 1.5)
  assert.equal(playgroundQualityLimits('smooth', 3, 390, 844).maximum, 1)
  assert.equal(playgroundQualityLimits('sharp', 1, 390, 844).initial, 2)
})

test('stored preferences accept only known quality modes and safe defaults', () => {
  assert.deepEqual(readPlaygroundPreferences('{"quality":"sharp","clearView":false,"roomTrail":false}'), { quality: 'sharp', clearView: false, roomTrail: false })
  for (const value of [null, 'broken', '{}', '[]', '{"quality":"ultra"}']) assert.equal(readPlaygroundPreferences(value).quality, 'auto')
})

test('slow frames retain elapsed movement time using bounded substeps and long stalls stay capped', () => {
  for (const fps of [10, 15, 30, 60, 120]) {
    let elapsed = 0, previous = 1000
    for (let frame = 1; frame <= fps * 2; frame++) {
      const time = 1000 + frame * 1000 / fps, timing = playgroundFrameTiming(previous, time); previous = time
      assert.ok(timing.stepDelta <= 0.05); assert.ok(timing.steps <= 4)
      elapsed += timing.stepDelta * timing.steps
    }
    assert.ok(Math.abs(elapsed - 2) < 1e-9, `${fps} FPS must retain real elapsed time`)
  }
  assert.deepEqual(playgroundFrameTiming(0, 10000), { delta: 0, steps: 1, stepDelta: 0 })
  assert.deepEqual(playgroundFrameTiming(1000, 10000), { delta: 0.2, steps: 4, stepDelta: 0.05 })
})

test('photos preserve aspect ratio while bounding pixel count and GPU dimensions', () => {
  for (const [width, height] of [[390, 844], [844, 390], [1280, 800], [2160, 2160]]) {
    const scale = playgroundPhotoScale(width, height)
    assert.ok(Math.max(width, height) * scale <= 2560 + 0.001)
    assert.ok(width * height * scale ** 2 <= 4_000_000 + 0.001)
    assert.ok(Math.max(width, height) * scale >= 2000)
    assert.ok(Math.max(width, height) * playgroundPhotoScale(width, height, 1024) <= 1024 + 0.001)
  }
})

test('photo export snapshots a fresh high-resolution frame then immediately restores the live buffer', async () => {
  let ratio = 0.75, rendered = 0, snapshotRatio = 0
  const renderer = {
    capabilities: { maxTextureSize: 4096 }, getSize: (size: { set: (x: number, y: number) => unknown }) => size.set(390, 844), getPixelRatio: () => ratio,
    setDrawingBufferSize: (_width: number, _height: number, value: number) => { ratio = value }, render: () => { rendered++ },
    domElement: { toBlob: (callback: (blob: Blob | null) => void) => { snapshotRatio = ratio; queueMicrotask(() => callback(new Blob(['photo']))) } },
  } as unknown as WebGLRenderer
  const result = capturePlaygroundPhoto(renderer, new Scene(), new PerspectiveCamera())
  assert.equal(ratio, 0.75); assert.equal(rendered, 1); assert.ok(snapshotRatio > 3)
  assert.ok((await result)!.size > 0)
})
