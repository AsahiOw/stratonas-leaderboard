import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import ts from 'typescript'

const source = readFileSync(new URL('./ChibiViewer.tsx', import.meta.url), 'utf8')

test('showcase rotation turns clockwise around the centered model and pauses during pickup', () => {
  const start = source.lastIndexOf('        if (!dragging) {', source.indexOf('if (rotatingRef.current)'))
  const end = source.indexOf('\n        updateMouths();', start)
  const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const rotate = new Function('holder', 'restingPosition', 'rotatingRef', 'dragging', 'delta', js)
  const holder = new THREE.Group(), restingPosition = new THREE.Vector3(-2, 0, -3)
  holder.position.copy(restingPosition)
  const anchor = new THREE.Vector3(2, 0, 3)
  rotate(holder, restingPosition, { current: true }, false, 1)
  assert.ok(holder.rotation.y < 0)
  assert.ok(Math.abs(holder.rotation.y + Math.PI / 30) < 1e-10)
  holder.updateMatrixWorld(true)
  assert.ok(anchor.clone().applyMatrix4(holder.matrixWorld).length() < 1e-10)
  const angle = holder.rotation.y
  rotate(holder, restingPosition, { current: false }, false, 1)
  assert.equal(holder.rotation.y, angle)
  rotate(holder, restingPosition, { current: true }, true, 1)
  assert.equal(holder.rotation.y, angle)
})

// Execute the viewer's actual handlers with a real camera, mesh and raycaster.
// The fake event target and clock let us check hold/cancel boundaries precisely.
function gestureHarness(pickupAvailable = true) {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {}
  const timers = new Map<number, () => void>()
  const calls: string[] = []
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 100)
  camera.position.z = 4; camera.updateMatrixWorld()
  const holder = new THREE.Group()
  const root = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
  holder.add(root); holder.updateMatrixWorld(true)
  const controls = { enabled: true }
  const renderer = { domElement: {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    addEventListener: (name: string, handler: (event: Record<string, unknown>) => void) => { handlers[name] = handler },
  } }
  const block = source.slice(source.indexOf('    const raycaster ='), source.indexOf('    const updateRendererState ='))
  const js = ts.transpileModule(`let currentKind = null, disposed = false; const studio = undefined;
    const playRef = { current: kind => { currentKind = kind; calls.push(kind) } };
    const setHolding = value => calls.push(value ? 'holding' : 'released');
    ${block}
    returnToIdle = () => calls.push('idle');
    return { isDragging: () => dragging };
  `, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const state = new Function('THREE', 'root', 'holder', 'camera', 'controls', 'renderer', 'model', 'calls', 'setTimeout', 'clearTimeout', 'window', 'document', js)(
    THREE, root, holder, camera, controls, renderer, { profile: { interactions: { pickup: { state: pickupAvailable ? 'available' : 'unavailable' } } } }, calls,
    (callback: () => void) => { timers.set(1, callback); return 1 }, (id: number) => timers.delete(id), { addEventListener: () => {} }, { addEventListener: () => {} },
  ) as { isDragging: () => boolean }
  const pointer = (name: string, x = 200, y = 200, primary = true) => handlers[name]({ clientX: x, clientY: y, pointerId: primary ? 1 : 2, isPrimary: primary, button: 0, stopImmediatePropagation() {} })
  const hold = () => { for (const callback of timers.values()) callback(); timers.clear() }
  return { pointer, hold, calls, holder, root, controls, state }
}

test('hold picks up, follows the camera plane, then release restores position and idle', () => {
  const h = gestureHarness()
  h.pointer('pointerdown'); assert.deepEqual(h.calls, [])
  h.hold(); assert.equal(h.state.isDragging(), true); assert.equal(h.controls.enabled, false)
  h.pointer('pointermove', 260, 160)
  assert.ok(h.holder.position.x > 0); assert.ok(h.holder.position.y > 0)
  h.pointer('pointerup', 260, 160)
  assert.deepEqual(h.holder.position.toArray(), [0, 0, 0])
  assert.equal(h.controls.enabled, true)
  assert.deepEqual(h.calls, ['pickup', 'holding', 'released', 'idle'])
})

test('a tap reacts, while a normal camera drag cancels pending pickup', () => {
  const tap = gestureHarness(); tap.pointer('pointerdown'); tap.pointer('pointerup'); tap.hold()
  assert.deepEqual(tap.calls, ['touch'])
  const drag = gestureHarness(); drag.pointer('pointerdown'); drag.pointer('pointermove', 220); drag.hold(); drag.pointer('pointerup', 220)
  assert.deepEqual(drag.calls, []); assert.equal(drag.controls.enabled, true)
})

test('cancel, loss of pointer capture, and a second finger release held models', () => {
  for (const cancel of ['pointercancel', 'lostpointercapture', 'second-finger']) {
    const h = gestureHarness(); h.pointer('pointerdown'); h.hold()
    if (cancel === 'second-finger') h.pointer('pointerdown', 250, 250, false)
    else h.pointer(cancel)
    assert.equal(h.controls.enabled, true); assert.equal(h.state.isDragging(), false)
    assert.deepEqual(h.calls, ['pickup', 'holding', 'released', 'idle'])
  }
})

test('hidden meshes, empty stage, and unavailable pickup never start a hold', () => {
  const hidden = gestureHarness(); hidden.root.visible = false; hidden.pointer('pointerdown'); hidden.hold()
  const empty = gestureHarness(); empty.pointer('pointerdown', 0, 0); empty.hold()
  const unavailable = gestureHarness(false); unavailable.pointer('pointerdown'); unavailable.hold()
  for (const h of [hidden, empty, unavailable]) assert.deepEqual(h.calls, [])
})

test('pickup repeats past clip end even when the source profile requests a held pose', () => {
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const playInitial ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const root = new THREE.Group(), mixer = new THREE.AnimationMixer(root)
  const clip = new THREE.AnimationClip('Pickup', 1, [new THREE.NumberKeyframeTrack('.position[x]', [0, 1], [0, 1])])
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingHolderY', 'mouthTransforms', 'updateMouths', 'setActive', `let currentAction = null, currentKind = null, haloFollower = null; ${js}`)(
    THREE, new Map([['Pickup', clip]]), mixer, root, root, 0, new Map(), () => {}, () => {},
  )
  assert.equal(play('Pickup', 'pickup', { loop: false, hold: true }), true)
  mixer.update(1.25)
  const action = mixer.existingAction(clip)!
  assert.equal(action.loop, THREE.LoopRepeat); assert.equal(action.clampWhenFinished, false)
  assert.equal(action.paused, false); assert.ok(Math.abs(action.time - .25) < 1e-6)
})
