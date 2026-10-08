import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { renderStudio } from './studio-render'
import type { StudioActorController } from './studio-types'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

test('restored Studio poses wait for lazy clips before seeking, pausing and becoming exportable', async () => {
  const source = readFileSync(new URL('./PhotoStudio.tsx', import.meta.url), 'utf8')
  const start = source.indexOf('ready: controller =>') + 'ready: '.length
  const end = source.indexOf('}, failed:', start) + 1
  const js = ts.transpileModule(`return ${source.slice(start, end)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  for (const outcome of ['success', 'failure', 'removed']) {
    const calls: unknown[] = [], stage = { actors: new Map() }, actor = { id: 'saved' }
    let finish!: (played: boolean) => void
    const controller = { clips: [{ name: 'Action' }], play: () => new Promise<boolean>(resolve => { finish = resolve }), seek: (time: number) => calls.push(time), pause: (value: boolean) => calls.push(value) }
    const ready = new Function('stage', 'actor', 'group', 'initial', 'report', js)(stage, actor, {}, { current: { clip: 'Action', time: 1.82, paused: true } }, (_id: string, status: string) => calls.push(status))
    ready(controller)
    assert.deepEqual(calls, ['Loading pose…'])
    if (outcome === 'removed') stage.actors.delete(actor.id)
    finish(outcome !== 'failure'); await Promise.resolve()
    assert.deepEqual(calls, outcome === 'success' ? ['Loading pose…', 1.82, true, 'Ready'] : outcome === 'failure' ? ['Loading pose…', 'Saved animation could not be loaded.'] : ['Loading pose…'])
  }
})

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
  passes.length = 0; depth.length = 0
  const outline = { renderOutline: () => renderer.render(scene, camera) } as unknown as NonNullable<Parameters<typeof renderStudio>[5]>
  renderStudio(renderer, scene, camera, actors, [{ actorId: 'kei', part: 'body' }, { actorId: 'aris', part: 'body' }, { actorId: 'kei', part: 'halo' }], outline)
  assert.deepEqual(passes, [[], ['Kei'], ['Kei'], ['Aris'], ['Aris'], ['Kei halo'], ['Kei halo']])
  assert.deepEqual(depth, [1, 3, 5], 'each outline draws with its own body or halo before the next layer clears depth')
  assert.equal(scene.background, background); assert.equal(renderer.autoClear, true)
})
