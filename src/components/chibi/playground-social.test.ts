import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createSocialEffects } from './playground-social'
import { PlaygroundSimulation } from '../../lib/chibi/playground-simulation'
import { initialPlaygroundMapping } from '../../lib/chibi/playground-mapping'
import { emptyChibiProfile } from '../../lib/chibi/types'

test('world-space social effects hide until ready, animate speaking turns, and disappear on departure', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ getContext: () => ({ fillText() {} }) }) } })
  const effects = createSocialEffects(), visual = effects.create()
  try {
    const sim = new PlaygroundSimulation(async () => true, () => 1)
    sim.add(1, 'Student', initialPlaygroundMapping('source', emptyChibiProfile()))
    const actor = sim.actors.get(1)!; actor.social = 'chat'; actor.speaking = true
    visual.update(actor, 0, true); assert.equal(visual.group.visible, false)
    actor.ready = true; visual.update(actor, 0, true); assert.equal(visual.group.visible, true)
    const dot = visual.group.children[0] as THREE.Mesh
    const first = dot.position.y; visual.update(actor, 0.2, true); assert.notEqual(dot.position.y, first)
    actor.speaking = false; visual.update(actor, 0.2, true); assert.equal(dot.scale.x, 0.65)
    actor.social = 'heart'; visual.update(actor, 0.2, true)
    assert.equal(dot.visible, false); assert.equal(visual.group.children[3].visible, true)
    assert.ok((visual.group.children[3] as THREE.Sprite).material.map)
    const position = visual.group.children[3].position.clone(); visual.update(actor, 0.2, true)
    assert.deepEqual(visual.group.children[3].position, position, 'unchanged simulation time freezes the reaction')
    actor.leaving = true; visual.update(actor, 0.3, true); assert.equal(visual.group.visible, false)
    actor.leaving = false; visual.update(actor, 0.3, false); assert.equal(visual.group.visible, false, 'offscreen effects do not render')
  } finally {
    visual.dispose(); effects.dispose()
    if (previous) Object.defineProperty(globalThis, 'document', previous); else Reflect.deleteProperty(globalThis, 'document')
  }
})
