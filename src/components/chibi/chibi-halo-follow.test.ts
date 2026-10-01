import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createHaloFollower } from './chibi-halo-follow'

function fixture() {
  const root = new THREE.Group(), head = new THREE.Bone(), halo = new THREE.Group()
  halo.name = 'HaloRoot'; root.add(head, halo)
  const child = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial())
  halo.add(child)
  const binding = { haloNodeIndex: 1, targetNodeIndex: 2, offset: [0, .4, 0], rotation: [0, 0, 0, 1],
    clampMin: [-.5, .2, -.5], clampMax: [.5, .6, .5], positionPower: .1, rotationPower: .07, fixYRotation: false }
  const follower = createHaloFollower(root, [binding], new Map([[1, [halo]], [2, [head]]]))
  follower.update(0, null)
  return { root, head, halo, child, follower }
}

test('halo follows its exact animated target smoothly and stays within source hover limits', () => {
  const { head, halo, follower, child } = fixture()
  const geometry = child.geometry
  head.position.x = .2
  head.rotation.z = .1
  follower.update(1 / 60, null)
  assert.ok(halo.position.x !== 0 && halo.position.x < .2)
  assert.ok(halo.quaternion.angleTo(head.quaternion) < .1)
  const relative = head.worldToLocal(halo.getWorldPosition(new THREE.Vector3()))
  assert.ok(relative.y >= .2 && relative.y <= .6)
  assert.equal(child.geometry, geometry)
})

test('follow speed is frame-rate independent and reset removes stale pose lag', () => {
  const a = fixture(), b = fixture()
  a.head.position.x = .2; b.head.position.x = .2
  for (let i = 0; i < 60; i++) a.follower.update(1 / 60, null)
  for (let i = 0; i < 30; i++) b.follower.update(1 / 30, null)
  assert.ok(a.halo.position.distanceTo(b.halo.position) < 1e-8)
  a.head.position.x = -.2; a.follower.reset(); a.follower.update(0, null)
  assert.ok(Math.abs(a.halo.position.x + .2) < 1e-8)
})

test('preserves authored root motion, follows through constant tracks, and leaves child animation alone', () => {
  const { head, halo, child, follower } = fixture()
  const authored = new THREE.AnimationClip('Pickup', 1, [new THREE.VectorKeyframeTrack('HaloRoot.position', [0, 1], [0, .4, 0, 1, .4, 0])])
  halo.position.set(.8, .4, 0); head.position.x = .2
  follower.update(1 / 60, authored)
  assert.equal(halo.position.x, .8)
  const constant = new THREE.AnimationClip('Walk', 1, [new THREE.VectorKeyframeTrack('HaloRoot.position', [0, 1], [0, .4, 0, 0, .4, 0])])
  child.position.set(1, 2, 3); follower.update(0, constant)
  assert.ok(Math.abs(halo.position.x - .2) < 1e-8)
  assert.deepEqual(child.position.toArray(), [1, 2, 3])
  head.position.x = .4
  for (let i = 0; i < 10; i++) {
    halo.position.set(0, .4, 0) // The mixer's constant rest-pose track.
    follower.update(1 / 60, constant)
  }
  assert.ok(Math.abs(halo.position.x - (.4 - .2 * Math.pow(.9, 10))) < 1e-8)
})

test('ambiguous or missing source node bindings do not retarget another object', () => {
  const { root, head, halo } = fixture()
  const binding = { haloNodeIndex: 1, targetNodeIndex: 2, offset: [0, 1, 0], rotation: [0, 0, 0, 1],
    clampMin: [-1, 0, -1], clampMax: [1, 2, 1], positionPower: .1, rotationPower: .1, fixYRotation: false }
  const original = halo.position.clone()
  createHaloFollower(root, [binding], new Map([[1, [halo]], [2, [head, new THREE.Bone()]]])).update(1, null)
  assert.deepEqual(halo.position.toArray(), original.toArray())
})
