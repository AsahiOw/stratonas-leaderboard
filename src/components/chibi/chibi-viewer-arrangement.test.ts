import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'

import { captureChibiFaceLayer, chibiFaceLayerKey, chibiArrangementCorrectionMatrix, chibiArrangementRendererVisibility } from './chibi-viewer-arrangement'
import type { ChibiArrangementNode } from './chibi-arrangement'

test('face depth edits restore imported state and preserve textures and depth writes', () => {
  const material = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false })
  material.depthFunc = THREE.AlwaysDepth
  material.polygonOffsetUnits = -1
  const apply = captureChibiFaceLayer(material)
  apply({ depthTest: true, depthOffset: -2 })
  assert.equal(material.depthTest, true)
  assert.equal(material.depthFunc, THREE.LessEqualDepth)
  assert.equal(material.polygonOffsetUnits, -3)
  assert.equal(material.depthWrite, false)
  apply(undefined)
  assert.equal(material.depthTest, false)
  assert.equal(material.depthFunc, THREE.AlwaysDepth)
  assert.equal(material.polygonOffsetUnits, -1)
  assert.equal(material.polygonOffset, false)
})

test('profile face layers use adapter bindings and legacy layers use existing material names', () => {
  const material = new THREE.MeshBasicMaterial()
  material.name = 'CH0200_EyeMouth'
  assert.equal(chibiFaceLayerKey(material, false), '$eyes')
  assert.equal(chibiFaceLayerKey(material, true), null)
  material.userData.chibi = { adapterId: 'mx-character-eyebrow' }
  assert.equal(chibiFaceLayerKey(material, true), '$eyebrows')
  material.userData.chibi = { adapterId: 'mx-character-hair' }
  assert.equal(chibiFaceLayerKey(material, true), null)
})

function matrixFor(node: ChibiArrangementNode) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...node.position!),
    new THREE.Quaternion(...node.rotation!),
    new THREE.Vector3(...node.scale!),
  )
}

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`)
}

test('the imported snapshot applies as identity and an admin target is reached once', () => {
  const baseline: ChibiArrangementNode = {
    position: [0.4, -0.2, 0.1], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], scale: [1.1, 1.1, 1.1],
  }
  const target: ChibiArrangementNode = { ...baseline, position: [0.5, -0.2, 0.1] }
  const identity = chibiArrangementCorrectionMatrix(baseline, baseline)
  identity.elements.forEach((value, index) => near(value, new THREE.Matrix4().elements[index]))

  const correction = chibiArrangementCorrectionMatrix(baseline, target)
  const rendered = correction.clone().multiply(matrixFor(baseline))
  const expected = matrixFor(target)
  rendered.elements.forEach((value, index) => near(value, expected.elements[index]))
})

test('wrapper corrections compose before live animated transforms', () => {
  const baseline: ChibiArrangementNode = { position: [0.4, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }
  const target: ChibiArrangementNode = { ...baseline, position: [0.5, 0, 0] }
  const animated: ChibiArrangementNode = { ...baseline, position: [0.6, 0.1, 0] }
  const rendered = chibiArrangementCorrectionMatrix(baseline, target).multiply(matrixFor(animated))
  const position = new THREE.Vector3().setFromMatrixPosition(rendered)
  near(position.x, 0.7)
  near(position.y, 0.1)
})

test('reloading the imported default restores source visibility after an admin preview hide', () => {
  const baselineVisible = true
  const previewVisible = chibiArrangementRendererVisibility(true, false, baselineVisible, baselineVisible)
  const reloadedVisible = chibiArrangementRendererVisibility(true, baselineVisible, baselineVisible, baselineVisible)

  assert.equal(previewVisible, false)
  assert.equal(reloadedVisible, true)
})

test('visibility at the imported default still follows live renderer animation events', () => {
  assert.equal(chibiArrangementRendererVisibility(true, false, false, false), true)
  assert.equal(chibiArrangementRendererVisibility(true, false, true, true), false)
})
