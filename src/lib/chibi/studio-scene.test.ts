import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_STUDIO_CAMERA, parseStudioScene, studioLayers, type StudioScene } from './studio-scene'

const scene: StudioScene = { version: 1, background: 'BG_Classroom.jpg', camera: DEFAULT_STUDIO_CAMERA, actors: [
  { id: 'actor-one', studentId: 10002, position: [-1, 0, 2], rotation: 45, scale: 1.2, clip: 'Idle', time: 0.7, paused: true },
  { id: 'actor-two', studentId: 10002, position: [1, 0, 0], rotation: 0, scale: 1, clip: 'Walk', time: 0.2, paused: false },
] }
test('saved scenes preserve independent poses, duplicate students, camera, and placement', () => {
  assert.deepEqual(parseStudioScene(JSON.stringify(scene)), scene)
})
test('independent tilt persists while legacy scenes remain readable', () => {
  const tilted = { ...scene, actors: scene.actors.map((actor, index) => ({ ...actor, tilt: index ? -20 : 30 })) }
  assert.deepEqual(parseStudioScene(JSON.stringify(tilted)), tilted)
  assert.equal(parseStudioScene(JSON.stringify(scene)).actors[0].tilt, undefined)
  for (const tilt of [null, '20', 91, -91]) assert.throws(() => parseStudioScene(JSON.stringify({ ...scene, actors: [{ ...scene.actors[0], tilt }] })))
})
test('body and halo layer order persists independently and old saves gain defaults', () => {
  const layers = studioLayers(scene.actors)
  assert.equal(layers.length, 4)
  const reordered = [layers[2], layers[0], layers[1], layers[3]]
  assert.deepEqual(parseStudioScene(JSON.stringify({ ...scene, layers: reordered })).layers, reordered)
  assert.deepEqual(studioLayers([scene.actors[1]], reordered), [layers[2], layers[3]])
  for (const invalid of [[layers[0]], [layers[0], layers[0], layers[2], layers[3]], [...layers.slice(0, 3), { actorId: 'missing', part: 'halo' }]]) {
    assert.throws(() => parseStudioScene(JSON.stringify({ ...scene, layers: invalid })))
  }
})
test('rejects malformed, duplicate-instance, and invalid-transform saved scenes', () => {
  for (const value of [null, {}, { ...scene, version: 2 }, { ...scene, camera: { position: [0, 0], target: [0, 0, 0] } },
    { ...scene, actors: [scene.actors[0], scene.actors[0]] }, { ...scene, actors: [{ ...scene.actors[0], scale: -1 }] },
    { ...scene, actors: [{ ...scene.actors[0], time: -1 }] }, { ...scene, actors: [{ ...scene.actors[0], position: [null, 0, 0] }] },
    { ...scene, actors: Array.from({ length: 13 }, (_, i) => ({ ...scene.actors[0], id: String(i) })) }]) {
    assert.throws(() => parseStudioScene(JSON.stringify(value)))
  }
})
