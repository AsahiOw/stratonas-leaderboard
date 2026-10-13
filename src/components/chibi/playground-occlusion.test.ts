import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createPlaygroundOcclusion } from './playground-occlusion'

function setup() {
  const root = new THREE.Group(), camera = new THREE.PerspectiveCamera()
  const shared = new THREE.MeshBasicMaterial({ color: 'white' }); shared.name = 'wall_white'
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.2), shared); wall.position.set(0, 1.5, 3)
  const other = new THREE.Mesh(wall.geometry, shared); other.position.set(8, 1.5, 3)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 30), new THREE.MeshBasicMaterial()); floor.material.name = 'floor'
  root.add(wall, other, floor); camera.position.set(0, 1.5, 6); camera.updateMatrixWorld()
  return { root, camera, wall, other, floor, shared }
}

test('only scenery actually blocking the student fades, with a gradual transition', () => {
  const { root, camera, wall, other, floor, shared } = setup(), occlusion = createPlaygroundOcclusion(root)
  occlusion.update(camera, [0, 0], 0.03, 1)
  assert.notEqual(wall.material, shared); assert.ok(wall.material.opacity < 1 && wall.material.opacity > 0.16)
  assert.equal(other.material, shared); assert.equal(shared.opacity, 1); assert.equal(floor.material.opacity, 1)
  for (let i = 1; i <= 30; i++) occlusion.update(camera, [0, 0], 0.03, 1 + i * 0.03)
  assert.equal(wall.material.opacity, 0.16); assert.equal(wall.material.depthWrite, false)
  occlusion.dispose(); assert.equal(wall.material, shared)
})

test('camera exit or disabling clear view restores solid scenery and releases cloned materials', () => {
  const { root, camera, wall, shared } = setup(), occlusion = createPlaygroundOcclusion(root)
  occlusion.update(camera, [0, 0], 0.1, 1)
  const material = wall.material; let disposed = false
  material.addEventListener('dispose', () => { disposed = true })
  for (let i = 0; i < 60; i++) occlusion.update(camera, null, 0.03, 2 + i * 0.03)
  assert.equal(material.opacity, 1); assert.equal(material.transparent, false); assert.equal(material.depthWrite, true)
  occlusion.dispose(); assert.equal(wall.material, shared); assert.equal(disposed, true)
})

test('scenery behind the student and already-transparent windows stay unchanged', () => {
  const { root, camera, wall, shared } = setup()
  wall.position.z = -3
  const glass = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 })); glass.position.set(0, 1.5, 3); root.add(glass)
  const occlusion = createPlaygroundOcclusion(root); occlusion.update(camera, [0, 0], 0.1, 1)
  assert.equal(wall.material, shared); assert.equal(glass.material.opacity, 0.3); occlusion.dispose()
})
