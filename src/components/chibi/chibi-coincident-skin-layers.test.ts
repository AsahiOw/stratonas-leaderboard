import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { separateCoincidentSkinLayers } from './chibi-coincident-skin-layers'

function mesh(positions: number[][], material: THREE.Material, bones: THREE.Bone[]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.flat(), 3))
  const object = new THREE.SkinnedMesh(geometry, material)
  object.bind(new THREE.Skeleton(bones))
  object.userData.chibi = { sourceReference: { bundleSha256: 'source', serializedFile: 'file', objectId: '1' }, sourceDefaultVisible: true }
  return object
}

test('separates coincident source skin layers without hiding either mesh', () => {
  const root = new THREE.Group(), material = new THREE.MeshBasicMaterial()
  const bones = Array.from({ length: 8 }, () => new THREE.Bone())
  const positions = Array.from({ length: 10 }, (_, i) => [i * .01, 0, 0])
  const overlay = mesh(positions, material, bones)
  const underlay = mesh([...positions.slice(0, 8), [positions[8][0] + .00005, 0, 0], [positions[9][0] + .00005, 0, 0], ...positions], material, bones)
  root.add(overlay, underlay)

  assert.equal(separateCoincidentSkinLayers(root), 1)
  assert.equal(overlay.visible, true)
  assert.equal(underlay.visible, true)
  assert.notEqual(overlay.material, material)
  assert.equal((overlay.material as THREE.Material).polygonOffsetFactor, -2)
  assert.equal((underlay.material as THREE.Material).polygonOffsetFactor, 0)
})

test('leaves separate skins and small face skeletons unchanged', () => {
  const material = new THREE.MeshBasicMaterial()
  for (const { bones, other } of [
    { bones: 8, other: [[1, 1, 1], [2, 2, 2], [3, 3, 3]] },
    { bones: 4, other: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  ]) {
    const root = new THREE.Group(), joints = Array.from({ length: bones }, () => new THREE.Bone())
    const first = mesh([[0, 0, 0], [0, 0, 0]], material, joints)
    const second = mesh(other, material, joints)
    root.add(first, second)
    assert.equal(separateCoincidentSkinLayers(root), 0)
    assert.equal(first.material, material)
    assert.equal(second.material, material)
  }
})
