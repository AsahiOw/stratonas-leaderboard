import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { renderStudio } from './studio-render'
import type { StudioActorController } from './studio-types'

test('draws isolated body and halo passes in order, then restores source visibility and background', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), background = new THREE.Color('blue')
  scene.background = background
  const aris = new THREE.Group(), kei = new THREE.Group()
  const arisBody = new THREE.Mesh(), keiBody = new THREE.Mesh(), keiHalo = new THREE.Mesh(), hidden = new THREE.Mesh()
  hidden.visible = false; aris.add(arisBody); kei.add(keiBody, keiHalo, hidden); scene.add(aris, kei)
  const passes: string[][] = [], depth: number[] = []
  const renderer = { autoClear: true, clearDepth: () => depth.push(passes.length), render: () => {
    const visible: string[] = []
    scene.traverseVisible(object => { if (object === arisBody) visible.push('Aris'); if (object === keiBody) visible.push('Kei'); if (object === keiHalo) visible.push('Kei halo'); assert.notEqual(object, hidden) })
    passes.push(visible)
  } } as unknown as THREE.WebGLRenderer
  const actors = new Map([['aris', { group: aris, controller: null }], ['kei', { group: kei, controller: { haloMeshes: [keiHalo] } as StudioActorController }]])
  renderStudio(renderer, scene, camera, actors, [{ actorId: 'kei', part: 'body' }, { actorId: 'aris', part: 'body' }, { actorId: 'kei', part: 'halo' }])
  assert.deepEqual(passes, [[], ['Kei'], ['Aris'], ['Kei halo']]); assert.deepEqual(depth, [1, 2, 3])
  assert.equal(scene.background, background); assert.equal(renderer.autoClear, true)
  for (const object of [aris, kei, arisBody, keiBody, keiHalo]) assert.equal(object.visible, true)
  assert.equal(hidden.visible, false)
})
