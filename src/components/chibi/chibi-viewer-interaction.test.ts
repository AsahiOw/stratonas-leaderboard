import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import ts from 'typescript'
import { previewPlacement } from '@/lib/chibi/preview-bounds'

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
  const timers = new Map<number, () => Promise<void>>()
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
    const playRef = { current: kind => { currentKind = kind; calls.push(kind); return true } };
    const setHolding = value => calls.push(value ? 'holding' : 'released');
    ${block}
    returnToIdle = () => calls.push('idle');
    return { isDragging: () => dragging };
  `, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const state = new Function('THREE', 'root', 'holder', 'camera', 'controls', 'renderer', 'model', 'calls', 'setTimeout', 'clearTimeout', 'window', 'document', js)(
    THREE, root, holder, camera, controls, renderer, { profile: { interactions: { pickup: { state: pickupAvailable ? 'available' : 'unavailable' } } } }, calls,
    (callback: () => Promise<void>) => { timers.set(1, callback); return 1 }, (id: number) => timers.delete(id), { addEventListener: () => {} }, { addEventListener: () => {} },
  ) as { isDragging: () => boolean }
  const pointer = (name: string, x = 200, y = 200, primary = true) => handlers[name]({ clientX: x, clientY: y, pointerId: primary ? 1 : 2, isPrimary: primary, button: 0, stopImmediatePropagation() {} })
  const hold = async () => { const pending = [...timers.values()].map(callback => callback()); timers.clear(); await Promise.all(pending) }
  return { pointer, hold, calls, holder, root, controls, state }
}

test('hold picks up, follows the camera plane, then release restores position and idle', async () => {
  const h = gestureHarness()
  h.pointer('pointerdown'); assert.deepEqual(h.calls, [])
  await h.hold(); assert.equal(h.state.isDragging(), true); assert.equal(h.controls.enabled, false)
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

test('cancel, loss of pointer capture, and a second finger release held models', async () => {
  for (const cancel of ['pointercancel', 'lostpointercapture', 'second-finger']) {
    const h = gestureHarness(); h.pointer('pointerdown'); await h.hold()
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
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const setPlaybackLoop ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const root = new THREE.Group(), mixer = new THREE.AnimationMixer(root)
  const clip = new THREE.AnimationClip('Pickup', 1, [new THREE.NumberKeyframeTrack('.position[x]', [0, 1], [0, 1])])
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingHolderY', 'mouthTransforms', 'updateMouths', 'setActive', 'setActiveClip', 'setPaused', `const studio = undefined, placementReady = false; let currentAction = null, currentKind = null, haloFollower = null, manualPlayback = false; ${js}`)(
    THREE, new Map([['Pickup', clip]]), mixer, root, root, 0, new Map(), () => {}, () => {}, () => {}, () => {},
  )
  assert.equal(play('Pickup', 'pickup', { loop: false, hold: true }), true)
  mixer.update(1.25)
  const action = mixer.existingAction(clip)!
  assert.equal(action.loop, THREE.LoopRepeat); assert.equal(action.clampWhenFinished, false)
  assert.equal(action.paused, false); assert.ok(Math.abs(action.time - .25) < 1e-6)
})

test('extra clips play and switch without a quick-action mapping', () => {
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const setPlaybackLoop ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const root = new THREE.Group(), mixer = new THREE.AnimationMixer(root)
  const clips = new Map(['Victory', 'Skill'].map(name => [name, new THREE.AnimationClip(name, 1, [new THREE.NumberKeyframeTrack('.position[x]', [0, 1], [0, 1])])]))
  let activeClip: string | null = null
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingHolderY', 'mouthTransforms', 'updateMouths', 'setActive', 'setActiveClip', 'setPaused', `const studio = undefined, placementReady = false; let currentAction = null, currentKind = null, haloFollower = null, manualPlayback = false; ${js}`)(
    THREE, clips, mixer, root, root, 0, new Map(), () => {}, () => {}, (name: string) => { activeClip = name }, () => {},
  )
  assert.equal(play('Victory', null, { loop: true }), true)
  mixer.update(1.25)
  assert.equal(activeClip, 'Victory')
  assert.ok(Math.abs(mixer.existingAction(clips.get('Victory')!)!.time - .25) < 1e-6)
  assert.equal(play('Skill', null, { loop: true }), true)
  assert.equal(activeClip, 'Skill')
  assert.equal(mixer.existingAction(clips.get('Victory')!)!.isRunning(), false)
  assert.equal(mixer.existingAction(clips.get('Skill')!)!.isRunning(), true)
  assert.equal(play('OtherCharacter', null, { loop: true }), false)
  assert.equal(activeClip, 'Skill')
})

test('releasing while a pickup animation loads cannot start dragging later', async () => {
  const h = gestureHarness()
  h.pointer('pointerdown')
  const pending = h.hold()
  h.pointer('pointercancel')
  await pending
  assert.equal(h.state.isDragging(), false)
  assert.equal(h.controls.enabled, true)
  assert.deepEqual(h.calls, ['pickup'])
})

test('only the latest downloaded selection plays, and cancelled holds or failed clips can retry safely', async () => {
  const block = source.slice(source.indexOf('        const requestClip ='), source.indexOf('        const play = async'))
  const js = ts.transpileModule(`let selection = 0, disposed = false; let status;
    const reportAnimation = value => { status = value }; ${block}; return { requestClip, status: () => status, dispose: () => { disposed = true } }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (cause: Error) => void }>(), played: string[] = []
  const animations = { get: (name: string) => new Promise((resolve, reject) => pending.set(name, { resolve, reject })) }
  const h = new Function('clips', 'animations', 'clipNames', 'playClip', 'studio', 'loopingRef', 'setPlaybackLoop', 'mixer', js)(
    new Map(), animations, new Set(['A', 'B']), (name: string) => { played.push(name); return true }, false, { current: true }, () => {}, { update: () => {} },
  ) as { requestClip: (name: string, kind: null, settings: object, valid?: () => boolean) => Promise<boolean>; status: () => unknown; dispose: () => void }
  const a = h.requestClip('A', null, {}), b = h.requestClip('B', null, {})
  pending.get('B')!.resolve({}); assert.equal(await b, true)
  pending.get('A')!.resolve({}); assert.equal(await a, false); assert.deepEqual(played, ['B'])
  const cancelled = h.requestClip('A', null, {}, () => false)
  pending.get('A')!.resolve({}); assert.equal(await cancelled, false); assert.equal(h.status(), null)
  const failed = h.requestClip('A', null, {})
  pending.get('A')!.reject(new Error('offline')); assert.equal(await failed, false); assert.deepEqual(h.status(), { name: 'A', failed: true })
  const retry = h.requestClip('A', null, {})
  pending.get('A')!.resolve({}); assert.equal(await retry, true); assert.deepEqual(played, ['B', 'A'])
  const abandoned = h.requestClip('B', null, {}); h.dispose()
  pending.get('B')!.resolve({}); assert.equal(await abandoned, false); assert.deepEqual(played, ['B', 'A'])
})

test('clips center only their starting pose and retain subsequent movement during playback and seeking', () => {
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const setPlaybackLoop ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const root = new THREE.Group(), holder = new THREE.Group(), mixer = new THREE.AnimationMixer(root)
  root.add(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshBasicMaterial())); holder.add(root)
  const clip = new THREE.AnimationClip('Balcony', 1, [new THREE.VectorKeyframeTrack('.position', [0, 1], [3, -20, -8, 5, -17, -6])])
  const restingPosition = new THREE.Vector3()
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingPosition', 'previewPlacement',
    `const studio = undefined, placementReady = true, previewScale = 1, mouthTransforms = new Map();
     let restingHolderY = 0, currentAction = null, currentKind = null, haloFollower = null, manualPlayback = false;
     const updateMouths = () => {}, setActive = () => {}, setActiveClip = () => {}, setPaused = () => {};
     ${js}`)(THREE, new Map([[clip.name, clip]]), mixer, root, holder, restingPosition, previewPlacement)
  assert.equal(play(clip.name, null, { loop: true }), true)
  assert.equal(holder.position.y, 22)
  assert.deepEqual(restingPosition.toArray(), [-3, 22, 8])
  const start = source.lastIndexOf('        if (!dragging) {', source.indexOf('if (rotatingRef.current)'))
  const end = source.indexOf('\n        updateMouths();', start)
  const frame = new Function('holder', 'restingPosition', 'rotatingRef', 'dragging', 'delta',
    ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)
  frame(holder, restingPosition, { current: false }, false, 0)
  holder.updateMatrixWorld(true)
  assert.deepEqual(root.getWorldPosition(new THREE.Vector3()).toArray(), [0, 2, 0])
  mixer.update(.5)
  assert.equal(root.position.y, -18.5)
  assert.equal(holder.position.y, 22)
  frame(holder, restingPosition, { current: false }, false, .5)
  holder.updateMatrixWorld(true)
  assert.deepEqual(root.getWorldPosition(new THREE.Vector3()).toArray(), [1, 3.5, 1])
  mixer.existingAction(clip)!.time = .75; mixer.update(0)
  frame(holder, restingPosition, { current: false }, false, 0)
  holder.updateMatrixWorld(true)
  assert.deepEqual(root.getWorldPosition(new THREE.Vector3()).toArray(), [1.5, 4.25, 1.5])
  assert.deepEqual(restingPosition.toArray(), [-3, 22, 8])
  assert.equal(play(clip.name, 'walk', { loop: true }), true)
  assert.equal(holder.position.y, 22)
  assert.deepEqual(restingPosition.toArray(), [-3, 22, 8])
  mixer.update(.5)
  assert.deepEqual(root.position.toArray(), [4, -18.5, -7])
})

test('zero-duration cut-in clips retain their pose and finite time through loop and pause controls', () => {
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const playInitial ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const root = new THREE.Group(), mixer = new THREE.AnimationMixer(root)
  const clip = new THREE.AnimationClip('CH0320_Cutin_SM032201_01', 0, [new THREE.NumberKeyframeTrack('.position[x]', [0], [2])])
  const mediaRef = { current: null as null | { togglePause: () => void; setLoop: (loop: boolean) => void; seek: (time: number) => void } }
  let paused = false
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingHolderY', 'mouthTransforms', 'updateMouths', 'setActive', 'setActiveClip', 'setPaused', 'mediaRef', 'loopingRef', 'setLooping', 'applyArrangement', 'setPlayback',
    `const studio = undefined, placementReady = false; let currentAction = null, currentKind = null, haloFollower = null, manualPlayback = false; ${js}`)(
    THREE, new Map([[clip.name, clip]]), mixer, root, root, 0, new Map(), () => {}, () => {}, () => {}, (value: boolean) => { paused = value }, mediaRef, { current: true }, () => {}, () => {}, () => {},
  )
  assert.equal(play(clip.name, null, { loop: true }), true)
  const action = mixer.existingAction(clip)!
  assert.equal(root.position.x, 2)
  for (const loop of [true, false, true]) {
    mediaRef.current!.setLoop(loop)
    mediaRef.current!.togglePause()
    mixer.update(1)
    assert.equal(action.time, 0)
    assert.equal(action.loop, THREE.LoopOnce)
    assert.equal(action.paused, true)
    assert.equal(paused, true)
    assert.equal(root.position.x, 2)
  }
  mediaRef.current!.seek(5)
  assert.equal(action.time, 0)
})

test('media controls pause, resume, finish once, and replay the held pose', () => {
  const block = source.slice(source.indexOf('        const setPlaybackLoop ='), source.indexOf('        const playInitial ='))
  const js = ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const root = new THREE.Group(), mixer = new THREE.AnimationMixer(root)
  const clip = new THREE.AnimationClip('Victory', 1, [new THREE.NumberKeyframeTrack('.position[x]', [0, 1], [0, 1])])
  const action = mixer.clipAction(clip).play()
  const mediaRef = { current: null as null | { togglePause: () => void; setLoop: (loop: boolean) => void; seek: (time: number) => void } }
  const loopingRef = { current: true }
  let paused = false
  let playback = { time: 0, duration: 0 }
  new Function('THREE', 'currentAction', 'mediaRef', 'loopingRef', 'setPaused', 'setLooping', 'mixer', 'updateMouths', 'applyArrangement', 'setPlayback', `let manualPlayback = false, haloFollower = null; ${js}`)(
    THREE, action, mediaRef, loopingRef, (value: boolean) => { paused = value }, () => {}, mixer, () => {}, () => {}, (value: typeof playback) => { playback = value },
  )
  mixer.update(.25)
  mediaRef.current!.togglePause(); mixer.update(.5)
  assert.equal(action.time, .25); assert.equal(paused, true)
  mediaRef.current!.togglePause(); mixer.update(.25)
  assert.equal(action.time, .5); assert.equal(paused, false)
  mediaRef.current!.setLoop(false); mixer.update(1)
  assert.equal(loopingRef.current, false)
  assert.equal(action.time, 1); assert.equal(action.paused, true)
  assert.equal(root.position.x, 1)
  mediaRef.current!.togglePause(); mixer.update(.25)
  assert.equal(action.time, .25); assert.equal(paused, false)
  mediaRef.current!.setLoop(true); mixer.update(1)
  assert.equal(action.loop, THREE.LoopRepeat); assert.equal(action.paused, false)
  assert.ok(Math.abs(action.time - .25) < 1e-6)
  mediaRef.current!.seek(.6); mixer.update(.5)
  assert.equal(action.time, .6); assert.equal(paused, true)
  assert.ok(Math.abs(root.position.x - .6) < 1e-6)
  assert.deepEqual(playback, { time: .6, duration: 1 })
  mediaRef.current!.seek(5)
  assert.equal(action.time, 1)
  mediaRef.current!.seek(-1)
  assert.equal(action.time, 0)
})
