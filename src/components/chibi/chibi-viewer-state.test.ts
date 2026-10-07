import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'

import { alternateFaceVisibilityAtTime, applyHoshinoShieldPreview, applyMakotoHairPreview, inPlaceClip, rendererVisibilityAtTime } from './chibi-viewer-state'

test('Hoshino shield preview enables the exact source renderer in EX and restores idle visibility', () => {
  const root = new THREE.Group(), shield = new THREE.Group(), unrelated = new THREE.Group()
  shield.userData.chibi = { sourceReference: {
    bundleSha256: '553b7fe20e78793df20939c307d5b8cfb979be7e84edad08b3e3fd03a9f5cd26',
    serializedFile: 'CAB-1d74217275224e4ba8d7167893fe01e5', objectId: '5492241791769865631',
  } }
  unrelated.userData.chibi = { sourceReference: { ...shield.userData.chibi.sourceReference, objectId: 'other-student' } }
  shield.visible = unrelated.visible = false
  root.add(shield, unrelated)
  for (const clip of ['Hoshino_Original_Exs', 'Hoshino_Original_Cafe_Idle', 'Hoshino_Original_Exs', 'Hoshino_Original_Cafe_Walk']) {
    applyHoshinoShieldPreview(root, clip)
    assert.equal(shield.visible, clip === 'Hoshino_Original_Exs')
    assert.equal(unrelated.visible, false)
  }
  shield.userData.chibi.sourceReference.bundleSha256 = 'different-source'
  applyHoshinoShieldPreview(root, 'Hoshino_Original_Exs')
  assert.equal(shield.visible, false)
})

test('Makoto EX hair preview follows collapsed hat scale and reverses on seeking', () => {
  const root = new THREE.Group(), normal = new THREE.Group(), alternate = new THREE.Group(), hat = new THREE.Bone()
  hat.name = 'bone_hat'
  for (const [object, objectId] of [[normal, '3218009238889943685'], [alternate, '3134145453237654149']] as const) {
    object.userData.chibi = { sourceReference: {
      bundleSha256: 'a1017c71727b4955f2051868456e618026674e078b3843e2649d8943873c457f',
      serializedFile: 'CAB-1469fcd164501c78fabde162fa4f06c4', objectId,
    } }
  }
  root.add(normal, alternate, hat)
  for (const scale of [1, 0.02358, 1]) {
    hat.scale.setScalar(scale)
    applyMakotoHairPreview(root, 'CH0079_Exs')
    assert.equal(normal.visible, scale === 1)
    assert.equal(alternate.visible, scale !== 1)
  }
  hat.scale.setScalar(0.02358)
  applyMakotoHairPreview(root, 'CH0079_Cafe_Idle')
  assert.equal(normal.visible, true)
  assert.equal(alternate.visible, false)
  alternate.userData.chibi.sourceReference.bundleSha256 = 'different-source'
  applyMakotoHairPreview(root, 'CH0079_Exs')
  assert.equal(alternate.visible, false)
})

const reference = (objectId: string) => ({ bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId })
const body = reference('1')
const hair = reference('2')

test('applies simultaneous exact renderer events in source order at the boundary', () => {
  const events = [
    { clip: 'Idle', time: 0.5, action: 'disable' as const, sourceRendererReference: body, order: 0 },
    { clip: 'Idle', time: 0.5, action: 'enable' as const, sourceRendererReference: body, order: 1 },
    { clip: 'Idle', time: 0.5, action: 'disable' as const, sourceRendererReference: hair, order: 2 },
  ]
  assert.deepEqual([...rendererVisibilityAtTime([
    { sourceReference: body, defaultVisible: true },
    { sourceReference: hair, defaultVisible: true },
  ], events, 'Idle', 0.5, 1, false)], [
    [`${'a'.repeat(64)}:cab-prefab:1`, true],
    [`${'a'.repeat(64)}:cab-prefab:2`, false],
  ])
})

test('resets on seek, clip switch, and restart instead of retaining prior state', () => {
  const events = [{ clip: 'Idle', time: 0.25, action: 'disable' as const, sourceRendererReference: body, order: 0 }]
  const defaults = [{ sourceReference: body, defaultVisible: true }]
  assert.equal(rendererVisibilityAtTime(defaults, events, 'Idle', 0.5, 1, false).get(`${'a'.repeat(64)}:cab-prefab:1`), false)
  assert.equal(rendererVisibilityAtTime(defaults, events, 'Idle', 0.1, 1, false).get(`${'a'.repeat(64)}:cab-prefab:1`), true)
  assert.equal(rendererVisibilityAtTime(defaults, events, 'Walk', 0.5, 1, false).get(`${'a'.repeat(64)}:cab-prefab:1`), true)
})

test('wraps looping action time and applies start-of-loop events after the duration boundary', () => {
  const events = [{ clip: 'Loop', time: 0.1, action: 'disable' as const, sourceRendererReference: body, order: 0 }]
  const defaults = [{ sourceReference: body, defaultVisible: true }]
  assert.equal(rendererVisibilityAtTime(defaults, events, 'Loop', 1.05, 1, true).get(`${'a'.repeat(64)}:cab-prefab:1`), true)
  assert.equal(rendererVisibilityAtTime(defaults, events, 'Loop', 1.15, 1, true).get(`${'a'.repeat(64)}:cab-prefab:1`), false)
  assert.equal(rendererVisibilityAtTime(defaults, events, 'Loop', 2, 1, true).get(`${'a'.repeat(64)}:cab-prefab:1`), true)
})

test('alternate faces reset before delayed pickup events, across action changes, and at loop boundaries', () => {
  const defaults = new Map([[2, true], [3, false]])
  const events = [
    { clip: 'Pickup', time: .1, int: 2, function: 'AniEvt_DisableChildRenderer' },
    { clip: 'Pickup', time: .1, int: 3, function: 'AniEvt_EnableChildRenderer' },
    { clip: 'Pickup', time: .9, int: 2, function: 'AniEvt_EnableChildRenderer' },
    { clip: 'Pickup', time: .9, int: 3, function: 'AniEvt_DisableChildRenderer' },
  ]
  const state = (clip: string, time: number, loop = false) => [...alternateFaceVisibilityAtTime(defaults, events, clip, time, 1, loop).values()]
  assert.deepEqual(state('Pickup', 0), [true, false])
  assert.deepEqual(state('Pickup', .5), [false, true])
  assert.deepEqual(state('Pickup', 1), [true, false])
  assert.deepEqual(state('Idle', .5), [true, false])
  assert.deepEqual(state('Pickup', 1.05, true), [true, false])
  assert.deepEqual([...defaults.values()], [true, false])
})


test('walking in place preserves world vertical motion for ordinary and rotated skeletons', () => {
  for (const rotation of [0, -Math.PI / 2]) {
    const root = new THREE.Group(), parent = new THREE.Group(), body = new THREE.Bone(), prop = new THREE.Bone()
    parent.rotation.x = rotation
    body.name = 'Body'; prop.name = 'Book'
    root.add(parent); parent.add(body); body.add(prop)
    const localDelta = new THREE.Vector3(2, 3, 4).applyAxisAngle(new THREE.Vector3(1, 0, 0), -rotation)
    const source = new THREE.AnimationClip('Walk', 1, [
      new THREE.VectorKeyframeTrack('Body.position', [0, 1], [0, 0, 0, ...localDelta.toArray()]),
      new THREE.VectorKeyframeTrack('Book.position', [0, 1], [0, 0, 0, 1, 2, 3]),
    ])
    const originalValues = Array.from(source.tracks[0].values)
    const clip = inPlaceClip(source, root)
    const retained = new THREE.Vector3().fromArray(clip.tracks[0].values, 3).applyAxisAngle(new THREE.Vector3(1, 0, 0), rotation)
    assert.ok(retained.distanceTo(new THREE.Vector3(0, 3, 0)) < 1e-6)
    assert.deepEqual(Array.from(clip.tracks[1].values), Array.from(source.tracks[1].values))
    assert.deepEqual(Array.from(source.tracks[0].values), originalValues)
  }
})
