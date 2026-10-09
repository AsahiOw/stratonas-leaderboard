import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as THREE from 'three'
import ts from 'typescript'
import { inPlaceClip } from './chibi-viewer-state'
import { previewPlacement, previewBounds, previewFitBounds, previewAnchor, previewGround } from '@/lib/chibi/preview-bounds'
import { PlaygroundSimulation, playgroundPath, walkable } from '@/lib/chibi/playground-simulation'
import { STUDENT_RADIUS } from '@/lib/chibi/playground-constants'
import { playgroundBodyBounds, playgroundModelScale } from './playground-footprint'
import { initialPlaygroundMapping } from '@/lib/chibi/playground-mapping'
import { emptyChibiProfile } from '@/lib/chibi/types'

const source = readFileSync(new URL('./ChibiViewer.tsx', import.meta.url), 'utf8')

test('playground sizing measures a standing walk before restoring a crouched idle pose', async () => {
  const root = new THREE.Group(), holder = new THREE.Group(), bone = new THREE.Bone(); bone.name = 'Pose'
  holder.add(root); root.add(bone)
  const geometry = new THREE.BoxGeometry(0.006, 0.01, 0.004), count = geometry.attributes.position.count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4))
  const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  const material = new THREE.MeshBasicMaterial(); material.name = 'CH0203_Body'
  const mesh = new THREE.SkinnedMesh(geometry, material); root.add(mesh); mesh.bind(new THREE.Skeleton([bone]))
  const idle = new THREE.AnimationClip('Idle', 1, [new THREE.VectorKeyframeTrack('Pose.scale', [0, 1], [1, 0.6, 1, 1, 0.6, 1])])
  const walk = new THREE.AnimationClip('Walk', 1, [new THREE.VectorKeyframeTrack('Pose.scale', [0, 1], [1, 1, 1, 1, 1, 1])])
  const mixer = new THREE.AnimationMixer(root), requested: string[] = []
  const playClip = (name: string) => { mixer.stopAllAction(); mixer.clipAction(name === 'Walk' ? walk : idle).reset().play(); return true }
  const model = { profile: { interactions: { walk: { state: 'available', clip: 'Walk' } } } }
  playClip('Idle'); mixer.update(0); root.updateMatrixWorld(true); playgroundBodyBounds(root)
  const block = source.slice(source.indexOf('        // Fit in actor-local space'), source.indexOf('        previewScale = scale;'))
  const js = ts.transpileModule(`${block}; return {scale, bodyBounds}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const fit = new Function('THREE', 'studio', 'model', 'holder', 'root', 'mixer', 'playClip', 'playInitial', 'animations', 'clipNames', 'playgroundBodyBounds', 'playgroundModelScale', 'previewBounds', 'previewFitBounds', 'previewAnchor', 'previewGround', `
    return (async () => {const disposed = false; ${js}})()`)
  const animations = { get: async (name: string) => { requested.push(name); return walk } }
  const result = await fit(THREE, {playground: true}, model, holder, root, mixer, playClip, () => playClip('Idle'), animations, new Set(['Walk']), playgroundBodyBounds, playgroundModelScale, previewBounds, previewFitBounds, previewAnchor, previewGround)
  assert.deepEqual(requested, ['Walk'], 'prepare the standing reference before publishing a ready model')
  assert.ok(Math.abs(0.01 * result.scale - 1.5) < 1e-6, 'standing height stays normal instead of magnifying the crouched pose')
  assert.ok(Math.abs(result.bodyBounds.getSize(new THREE.Vector3()).y * result.scale - 0.9) < 1e-6, 'restore idle and refresh its cached skin bounds')
  assert.equal(mixer.existingAction(idle)?.isRunning(), true)
  requested.length = 0
  await fit(THREE, {}, model, holder, root, mixer, playClip, () => playClip('Idle'), animations, new Set(['Walk']), playgroundBodyBounds, playgroundModelScale, previewBounds, previewFitBounds, previewAnchor, previewGround)
  assert.deepEqual(requested, [], 'Photo Studio does not request a standing-size reference')
})
function publishedFootprint(bounds: THREE.Box3, arrangementScale = 1, playground = true) {
  const start = source.indexOf('        studio?.ready({'), block = source.slice(start, source.indexOf('      } catch (cause)', start))
  let radius: number | undefined
  new Function('studio', 'fitBounds', 'scale', 'arrangementGroup', 'STUDENT_RADIUS', `
    const haloMeshes = [], catalog = [], playNamedClip = () => {}; let currentAction = null, pendingAnimation = null;
    ${ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText}`)(
    { playground, ready: (controller: { footprintRadius?: number }) => { radius = controller.footprintRadius } }, bounds, playgroundModelScale(bounds), { scale: new THREE.Vector3(arrangementScale, arrangementScale, arrangementScale) }, STUDENT_RADIUS,
  )
  return radius
}

test('the viewer gives every playground student the same walking radius regardless of width, units or arrangement scale', () => {
  for (const width of [0.5, 1.6, 3]) for (const units of [0.001, 1, 1000]) for (const arrangementScale of [1, 2]) {
    const bounds = new THREE.Box3(new THREE.Vector3(-width / 2, 0, -0.5).multiplyScalar(units), new THREE.Vector3(width / 2, 1.5, 0.5).multiplyScalar(units))
    assert.equal(publishedFootprint(bounds, arrangementScale), STUDENT_RADIUS)
  }
  assert.equal(publishedFootprint(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1.5, 1)), 1, false), undefined)
})

test('Koyuki Pajamas can enter and leave the sink passage using the footprint published by the viewer', () => {
  // Published CH0310_Cafe_Idle body/face/hair bounds at its initial pose.
  const bounds = new THREE.Box3(new THREE.Vector3(-0.004800852574274864, -0.000001034853563485, -0.002537837059334314), new THREE.Vector3(0.004431320756447318, 0.011147827084998, 0.002942532271396224))
  const radius = publishedFootprint(bounds)!, entrance: [number, number] = [9, 7], passage: [number, number] = [10.25, 11]
  for (const [start, end] of [[entrance, passage], [passage, entrance]]) {
    const path = playgroundPath(start, end, [], radius)
    assert.ok(path?.length, 'Koyuki must have a route through the narrow bathroom passage in both directions')
    let previous = start
    for (const point of path) {
      for (let i = 1; i <= 100; i++) assert.ok(walkable([previous[0] + (point[0] - previous[0]) * i / 100, previous[1] + (point[1] - previous[1]) * i / 100], radius))
      previous = point
    }
  }
})

// Run the real viewer playback implementation with actual animation tracks/mixers.
function harness() {
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const setPlaybackLoop ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const root = new THREE.Group(), body = new THREE.Group(); body.name = 'Body'; root.add(body)
  body.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()))
  const clip = new THREE.AnimationClip('Reviewed', 1, [new THREE.VectorKeyframeTrack('Body.position', [0, 1], [2, 0, 0, 4, 0.5, 0])])
  const mixer = new THREE.AnimationMixer(root), inPlaceClips = new Map<string, THREE.AnimationClip>()
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingHolderY', 'mouthTransforms', 'updateMouths', 'setActive', 'setActiveClip', 'setPaused', 'inPlaceClips', 'inPlaceClip',
    `const studio = {playground: true}, placementReady = false; let currentAction = null, currentKind = null, haloFollower = null, manualPlayback = false; ${js}`)(
    THREE, new Map([[clip.name, clip]]), mixer, root, new THREE.Group(), 0, new Map(), () => {}, () => {}, () => {}, () => {}, inPlaceClips, inPlaceClip,
  )
  return { body, mixer, clip, play, inPlaceClips }
}
test('sandbox plays a reviewed pickup once when its assignment disables looping', () => {
  const h = harness(); assert.equal(h.play('Reviewed', 'pickup', { loop: false, hold: true }), true)
  const action = h.mixer.existingAction(h.inPlaceClips.get('Reviewed')!)!
  assert.equal(action.loop, THREE.LoopOnce); assert.equal(action.clampWhenFinished, true)
  h.mixer.update(2); assert.equal(action.paused, true); assert.equal(action.time, 1)
})
test('sandbox removes horizontal authored travel from arbitrary roles while preserving vertical motion and source tracks', () => {
  const h = harness(); h.play('Reviewed', null, { loop: true }); h.mixer.update(0.5)
  assert.equal(h.body.position.x, 2); assert.equal(h.body.position.y, 0.25)
  assert.deepEqual([...h.clip.tracks[0].values], [2, 0, 0, 4, 0.5, 0])
})

test('the first playground clip grounds a newly normalized skin using its current bind transform', () => {
  const root = new THREE.Group(), holder = new THREE.Group(), bone = new THREE.Bone(); bone.name = 'Pose'
  holder.add(root); root.add(bone)
  const geometry = new THREE.BoxGeometry(800, 1800, 400), count = geometry.attributes.position.count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4))
  const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  const material = new THREE.MeshBasicMaterial(); material.name = 'CH0001_Body'
  const mesh = new THREE.SkinnedMesh(geometry, material); mesh.name = 'CH0001_Body'; root.add(mesh)
  mesh.bind(new THREE.Skeleton([bone])); holder.updateMatrixWorld(true)
  holder.scale.setScalar(0.001)
  const clip = new THREE.AnimationClip('Reviewed', 1, [new THREE.VectorKeyframeTrack('Pose.position', [0, 1], [300, 0, -100, 300, 0, -100])])
  const mixer = new THREE.AnimationMixer(root), restingPosition = new THREE.Vector3()
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const setPlaybackLoop ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingPosition', 'previewPlacement', 'inPlaceClip', `
    const studio = {playground: true}, placementReady = true, previewScale = 0.001, inPlaceClips = new Map(), mouthTransforms = new Map();
    let currentAction = null, currentKind = null, haloFollower = null, manualPlayback = false, restingHolderY = 0;
    const updateMouths = () => {}, setActive = () => {}, setActiveClip = () => {}, setPaused = () => {};
    ${js}`)(THREE, new Map([[clip.name, clip]]), mixer, root, holder, restingPosition, previewPlacement, inPlaceClip)
  assert.equal(play('Reviewed', 'idle', {loop: true}), true)
  assert.ok(restingPosition.distanceTo(new THREE.Vector3(-0.3, 0.9, 0.1)) < 1e-6)
  assert.ok(Math.abs(holder.position.y - 0.9) < 1e-6, 'the feet start on the floor rather than below it')
})

test('reaction-to-idle keeps the playground horizontal anchor when animated body bounds change', () => {
  const root = new THREE.Group(), holder = new THREE.Group(), bone = new THREE.Bone(); bone.name = 'Pose'
  holder.add(root); root.add(bone)
  const geometry = new THREE.BoxGeometry(1, 2, 1).translate(0.4, 1, 0), count = geometry.attributes.position.count
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4))
  const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  const material = new THREE.MeshBasicMaterial(); material.name = 'CH0001_Body'
  const mesh = new THREE.SkinnedMesh(geometry, material); mesh.name = 'CH0001_Body'; root.add(mesh); mesh.bind(new THREE.Skeleton([bone]))
  const reaction = new THREE.AnimationClip('Reaction', 1, [new THREE.VectorKeyframeTrack('Pose.scale', [0, 1], [2, 1, 1, 2, 1, 1])])
  const idle = new THREE.AnimationClip('Idle', 1, [new THREE.VectorKeyframeTrack('Pose.scale', [0, 1], [1, 1, 1, 1, 1, 1])])
  const walk = idle.clone(); walk.name = 'Walk'
  const mixer = new THREE.AnimationMixer(root), restingPosition = new THREE.Vector3()
  const block = source.slice(source.indexOf('        const playClip ='), source.indexOf('        const setPlaybackLoop ='))
  const js = ts.transpileModule(`${block}; return playClip`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const play = new Function('THREE', 'clips', 'mixer', 'root', 'holder', 'restingPosition', 'previewPlacement', 'inPlaceClip', `
    const studio = {playground: true}, placementReady = true, previewScale = 1, inPlaceClips = new Map(), mouthTransforms = new Map();
    let currentAction = null, currentKind = null, haloFollower = null, manualPlayback = false, restingHolderY = 0;
    const updateMouths = () => {}, setActive = () => {}, setActiveClip = () => {}, setPaused = () => {};
    ${js}`)(THREE, new Map([reaction, idle, walk].map(clip => [clip.name, clip])), mixer, root, holder, restingPosition, previewPlacement, inPlaceClip)
  play('Reaction', null, {loop: false, hold: true}); mixer.update(1)
  const anchor = restingPosition.clone(), reactionCenter = previewPlacement(root).anchor.x
  play('Idle', 'idle', {loop: true}); mixer.update(0.2)
  assert.notEqual(previewPlacement(root).anchor.x, reactionCenter, 'the poses have different body centers')
  assert.equal(restingPosition.x, anchor.x); assert.equal(restingPosition.z, anchor.z)
  assert.ok(Math.abs(holder.position.y + previewPlacement(root).ground) < 1e-6, 'idle remains grounded')
  play('Walk', 'walk', {loop: true}); mixer.update(0.2)
  assert.equal(restingPosition.x, anchor.x); assert.equal(restingPosition.z, anchor.z)
})

test('throttled studio animation retains elapsed time and skips paused or hidden time', () => {
  const start = source.indexOf('    let previousTime ='), end = source.indexOf('    return () => {', start)
  const js = ts.transpileModule(`${source.slice(start, end)}; return render`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const updates: number[] = [], document = { hidden: false }, studio = { paused: () => false, animationInterval: () => 0.1 }
  const render = new Function('studio', 'document', 'mixer', 'holder', 'restingPosition', 'requestAnimationFrame', `
    let frame = 0, root = null, currentKind = null, currentAction = null, haloFollower = null;
    const dragging = false, restingHolderY = 0, rotatingRef = {current: false}, hiddenSceneMeshes = [];
    const updateMouths = () => {}, applyArrangement = () => {};
    ${js}`)(studio, document, { update: (delta: number) => updates.push(delta) }, new THREE.Group(), new THREE.Vector3(), () => 0)
  for (let time = 10; time <= 1010; time += 10) render(time)
  assert.ok(updates.length >= 8 && updates.length <= 10)
  const elapsed = updates.reduce((sum, delta) => sum + delta, 0)
  assert.ok(elapsed >= 0.9 && elapsed <= 1.001, 'skipped render frames do not slow the animation')
  const count = updates.length
  studio.paused = () => true; for (let time = 1020; time <= 2010; time += 10) render(time)
  studio.paused = () => false; document.hidden = true; for (let time = 2020; time <= 3010; time += 10) render(time)
  assert.equal(updates.length, count)
  document.hidden = false; for (let time = 3020; time <= 3140; time += 10) render(time)
  assert.ok(updates.length > count); assert.ok(updates.at(-1)! <= 0.111, 'resume does not catch up hidden time')
})

test('culled and first-person models complete reactions while hidden idle animations stay paused', async () => {
  const h = harness(), group = new THREE.Group(); group.visible = false
  const mapping = initialPlaygroundMapping('source', emptyChibiProfile())
  mapping.roles.idle = [{ clip: 'Reviewed', loop: true }]; mapping.roles.reaction = [{ clip: 'Reviewed', loop: false }]
  const sim = new PlaygroundSimulation(async (_id, _clip, loop) => h.play('Reviewed', null, { loop, hold: true }), () => 1, () => 0.1, () => {}, () => h.mixer.existingAction(h.inPlaceClips.get('Reviewed')!)!.time >= 1)
  sim.add(1, 'Student', mapping); sim.ready(1); sim.actors.get(1)!.roam = false; await Promise.resolve()
  const playground = readFileSync(new URL('./StudentPlayground.tsx', import.meta.url), 'utf8').replace(/\r/g, '')
  const paused = playground.slice(playground.indexOf('paused: () =>') + 8, playground.indexOf(',\n      animationInterval:'))
  const studio = { paused: new Function('runtime', 'group', 'student', `return ${paused}`)({ started: true, simulation: sim }, group, { id: 1 }), animationInterval: () => 1 / 15 }
  const start = source.indexOf('    let previousTime ='), end = source.indexOf('    return () => {', start)
  const js = ts.transpileModule(`${source.slice(start, end)}; return render`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const render = new Function('studio', 'mixer', 'holder', 'restingPosition', 'requestAnimationFrame', `
    const document = {hidden: false}, dragging = false, restingHolderY = 0, rotatingRef = {current: false}, hiddenSceneMeshes = [];
    let frame = 0, root = null, currentKind = null, currentAction = null, haloFollower = null;
    const updateMouths = () => {}, applyArrangement = () => {}; ${js}
  `)(studio, h.mixer, new THREE.Group(), new THREE.Vector3(), () => 0)
  let completed = 0; h.mixer.addEventListener('finished', () => { completed++ })
  assert.equal(studio.paused(), true)
  sim.react(1); await Promise.resolve(); assert.equal(studio.paused(), false)
  for (let time = 10; time <= 410; time += 10) { sim.tick(0.01); render(time); await Promise.resolve() }
  const action = h.mixer.existingAction(h.inPlaceClips.get('Reviewed')!)!, beforePause = action.time
  sim.paused = true
  for (let time = 420; time <= 810; time += 10) { sim.tick(0.01); render(time) }
  assert.equal(action.time, beforePause); assert.equal(sim.actors.get(1)!.state, 'acting')
  sim.paused = false
  for (let time = 820; time <= 1810; time += 10) { sim.tick(0.01); render(time); await Promise.resolve() }
  assert.equal(completed, 1); assert.equal(sim.actors.get(1)!.state, 'idle'); assert.equal(studio.paused(), true)
})

test('shared animation updates finish one-shot clips at both mobile frame rates without scheduling actor frames', () => {
  const start = source.indexOf('    let previousTime ='), end = source.indexOf('    return () => {', start)
  const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  for (const fps of [30, 60]) {
    const root = new THREE.Object3D(), mixer = new THREE.AnimationMixer(root)
    const clip = new THREE.AnimationClip('Reaction', 2.3, [new THREE.NumberKeyframeTrack('.position[x]', [0, 2.3], [0, 1])])
    const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play()
    let update: (time: number) => void = () => { throw new Error('Frame callback was not registered') }, scheduled = 0, finished = 0
    mixer.addEventListener('finished', () => { finished++ })
    const studio = { paused: () => false, animationInterval: () => 1 / 15, registerFrame: (callback: (time: number) => void) => { update = callback; return () => {} } }
    new Function('studio', 'mixer', 'holder', 'restingPosition', 'requestAnimationFrame', `
      const document = {hidden: false}, dragging = false, restingHolderY = 0, rotatingRef = {current: false}, hiddenSceneMeshes = [];
      let frame = 0, root = null, currentKind = null, currentAction = null, haloFollower = null;
      const updateMouths = () => {}, applyArrangement = () => {}; ${js}
    `)(studio, mixer, new THREE.Group(), new THREE.Vector3(), () => { scheduled++; return 0 })
    for (let tick = 0; tick <= fps * 3; tick++) update(100 + tick * 1000 / fps)
    assert.equal(scheduled, 0, 'the playground owns the only frame scheduler')
    assert.equal(finished, 1, 'the full reaction finishes once even with distant animation throttling')
    assert.equal(action.time, clip.duration)
  }
})
