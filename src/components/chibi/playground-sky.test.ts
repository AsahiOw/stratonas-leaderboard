import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createPlaygroundSky, playgroundTimeOfDay } from './playground-sky'

const local = (hour: number, minute = 0, second = 0) => new Date(2026, 9, 8, hour, minute, second)

test('the sky follows local clock hours through dawn, day, sunset and night', () => {
  for (const [hour, period] of [[0, 'Night'], [5, 'Dawn'], [7, 'Dawn'], [8, 'Daytime'], [16, 'Daytime'], [17, 'Sunset'], [19, 'Sunset'], [20, 'Night'], [23, 'Night']] as const) {
    assert.equal(playgroundTimeOfDay(local(hour)).period, period)
    assert.equal(playgroundTimeOfDay(local(hour)).hour, hour)
  }
  assert.equal(playgroundTimeOfDay(local(12)).night, 0)
  assert.equal(playgroundTimeOfDay(local(23)).night, 1)
  assert.equal(playgroundTimeOfDay(local(6, 30)).hour, 6.5)
})

test('sky colors and night details blend continuously, including midnight', () => {
  const channels = (color: string) => [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16))
  for (let minute = 0; minute < 1440; minute++) {
    const before = playgroundTimeOfDay(local(0, minute, 59)), after = playgroundTimeOfDay(local(0, minute + 1))
    assert.ok(before.night >= 0 && before.night <= 1)
    assert.ok(Math.abs(before.night - after.night) < 0.01)
    for (const key of ['top', 'horizon', 'bottom'] as const) {
      const a = channels(before[key]), b = channels(after[key])
      assert.ok(a.every((value, index) => Math.abs(value - b[index]) <= 1), `${key} jumps at minute ${minute}`)
    }
  }
  assert.deepEqual(playgroundTimeOfDay(local(0)), playgroundTimeOfDay(new Date(2026, 9, 9)))
  assert.notEqual(playgroundTimeOfDay(local(6)).horizon, playgroundTimeOfDay(local(6, 30)).horizon)
})

test('resizing replaces immutable GPU texture storage and releases the old texture', () => {
  const gradient = () => ({ addColorStop() {} })
  const context = new Proxy({}, { get: (_target, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? gradient : () => {} })
  const canvas = { width: 300, height: 150, getContext: () => context }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } })
  try {
    const scene = new THREE.Scene(), sky = createPlaygroundSky(scene, new THREE.HemisphereLight(), new THREE.DirectionalLight())
    sky.resize(1280, 720); const landscape = scene.background as THREE.CanvasTexture
    assert.deepEqual([canvas.width, canvas.height], [1024, 576])
    let disposed = 0; landscape.addEventListener('dispose', () => disposed++)
    sky.resize(390, 844); const portrait = scene.background as THREE.CanvasTexture
    assert.notEqual(portrait, landscape); assert.equal(disposed, 1)
    assert.deepEqual([canvas.width, canvas.height], [390, 844])
    sky.resize(390, 844); assert.equal(scene.background, portrait)
    portrait.addEventListener('dispose', () => disposed++); sky.dispose()
    assert.equal(disposed, 2); assert.equal(scene.background, null)
  } finally {
    if (original) Object.defineProperty(globalThis, 'document', original)
    else Reflect.deleteProperty(globalThis, 'document')
  }
})
