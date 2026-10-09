import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { playgroundBodyBounds, playgroundModelScale, PLAYGROUND_STUDENT_HEIGHT } from './playground-footprint'

function body(root: THREE.Group, dimensions: [number, number, number]) {
  const geometry = new THREE.BoxGeometry(...dimensions), material = new THREE.MeshBasicMaterial(), bone = new THREE.Bone()
  material.name = 'CH0001_Body'
  const count = geometry.attributes.position.count, weights = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) weights[i * 4] = 1
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4))
  const mesh = new THREE.SkinnedMesh(geometry, material); mesh.name = 'CH0001_Mesh_4'
  mesh.add(bone); root.add(mesh); mesh.bind(new THREE.Skeleton([bone])); root.updateMatrixWorld(true)
  return mesh
}

test('wide and narrow students keep the same body height without shrinking wide models', () => {
  const narrow = new THREE.Group(), wide = new THREE.Group()
  body(narrow, [0.5, 1.8, 0.4]); body(wide, [1.6, 1.8, 0.8])
  const narrowBounds = playgroundBodyBounds(narrow)!, wideBounds = playgroundBodyBounds(wide)!
  const narrowScale = playgroundModelScale(narrowBounds), wideScale = playgroundModelScale(wideBounds)
  assert.equal(narrowScale, wideScale)
  assert.ok(Math.abs(wideBounds.getSize(new THREE.Vector3()).y * wideScale - PLAYGROUND_STUDENT_HEIGHT) < 1e-6)
  assert.equal(wide.scale.x, 1)
})

test('separate face and hair primitives contribute to student height', () => {
  const root = new THREE.Group()
  body(root, [0.6, 1.2, 0.4])
  const face = body(root, [0.65, 0.6, 0.45]); face.position.y = 0.9; (face.material as THREE.Material).name = 'CH9997_Face'
  const hair = body(root, [0.7, 0.7, 0.5]); hair.position.y = 0.95; (hair.material as THREE.Material).name = 'CH9997_Hair'
  root.updateMatrixWorld(true)
  const bounds = playgroundBodyBounds(root)!, height = bounds.getSize(new THREE.Vector3()).y
  assert.ok(Math.abs(height - 1.9) < 1e-6, 'height must reach the head instead of stopping at the torso')
  assert.ok(Math.abs(height * playgroundModelScale(bounds) - PLAYGROUND_STUDENT_HEIGHT) < 1e-6)
})

test('halos, equipment, hidden bodies and generated outline children cannot shrink students', () => {
  const root = new THREE.Group(), mesh = body(root, [0.5, 1.8, 0.4])
  const accessory = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial())
  mesh.add(accessory)
  const hidden = body(root, [30, 30, 30]); hidden.visible = false
  const halo = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 8), new THREE.MeshBasicMaterial()); halo.position.y = 5; root.add(halo)
  const weapon = body(root, [10, 10, 10]); (weapon.material as THREE.Material).name = 'CH0001_Weapon'
  const support = body(root, [12, 12, 12]); support.name = 'CH0332_Prop_Outline'
  const outline = body(root, [15, 15, 15]); outline.name = 'CH0001_Body_ProjectMX_Outline'
  root.updateMatrixWorld(true)
  const bounds = playgroundBodyBounds(root)!
  assert.ok(bounds.getSize(new THREE.Vector3()).distanceTo(new THREE.Vector3(0.5, 1.8, 0.4)) < 1e-6)
  assert.ok(Math.abs(playgroundModelScale(bounds) * 1.8 - PLAYGROUND_STUDENT_HEIGHT) < 1e-6)
})

test('small exported source units normalize to the same height as ordinary units', () => {
  for (const units of [0.001, 1, 1000]) {
    const root = new THREE.Group(); body(root, [0.8 * units, 1.8 * units, 0.4 * units])
    const bounds = playgroundBodyBounds(root)!, scale = playgroundModelScale(bounds)
    assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).y * scale - PLAYGROUND_STUDENT_HEIGHT) < 1e-6)
  }
})

test('height measurement uses source bounds without rebaking a normalized skinned pose', () => {
  const root = new THREE.Group(); body(root, [800, 1800, 400])
  const bounds = playgroundBodyBounds(root)!, scale = playgroundModelScale(bounds)
  root.scale.setScalar(scale); root.position.set(10, 0, 20); root.updateMatrixWorld(true)
  assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).y * scale - PLAYGROUND_STUDENT_HEIGHT) < 1e-6)
})
