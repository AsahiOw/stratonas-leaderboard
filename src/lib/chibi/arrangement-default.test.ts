import assert from 'node:assert/strict'
import test from 'node:test'

import { buildChibiArrangementDefault, isCompleteChibiArrangementDefault, rebaseChibiArrangementOverride } from './arrangement-default'

const equipmentReference = { bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId: '42' }
const equipmentKey = `${'a'.repeat(64)}:cab/prefab:42`

test('face edits survive an asset upgrade without forcing a new geometry baseline', () => {
  const overrides = { schemaVersion: 1, nodes: { '$eyes': { depthTest: true, depthOffset: -2 } } }
  assert.deepEqual(rebaseChibiArrangementOverride({}, overrides, {}).nodes, overrides.nodes)
})

test('captures source-bound imported TRS and visibility from the final GLB', () => {
  const result = buildChibiArrangementDefault({
    equipmentBindingEvidence: [{ sourceReference: equipmentReference, name: 'Weapon', hierarchyPath: 'Root/Weapon' }],
    renderers: [{ sourceReference: equipmentReference, glbNodeIndex: 1, defaultVisible: false }],
  }, [
    {},
    { translation: [0.25, -0.1, 0.05], rotation: [0, 0, 0.7071067811865475, 0.7071067811865476], scale: [1.1, 1.1, 1.1] },
  ])

  assert.deepEqual(result.nodes.$model, {
    visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1],
  })
  assert.deepEqual(result.nodes[equipmentKey], {
    visible: false,
    position: [0.25, -0.1, 0.05],
    rotation: [0, 0, 0.7071067811865475, 0.7071067811865476],
    scale: [1.1, 1.1, 1.1],
  })
})

test('decomposes matrix-only GLB nodes without losing their imported transform', () => {
  const result = buildChibiArrangementDefault({
    equipmentBindingEvidence: [{ sourceReference: equipmentReference, name: 'Weapon', hierarchyPath: 'Root/Weapon' }],
    renderers: [{ sourceReference: equipmentReference, glbNodeIndex: 0, defaultVisible: true }],
  }, [{ matrix: [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0.2, 0.3, 0.4, 1] }])

  assert.deepEqual(result.nodes[equipmentKey]?.position, [0.2, 0.3, 0.4])
  assert.ok(Math.abs((result.nodes[equipmentKey]?.rotation?.[2] ?? 0) - Math.SQRT1_2) < 1e-10)
  assert.ok(Math.abs((result.nodes[equipmentKey]?.rotation?.[3] ?? 0) - Math.SQRT1_2) < 1e-10)
})

test('rejects allowed equipment without one exact exported node binding', () => {
  const profile = {
    equipmentBindingEvidence: [{ sourceReference: equipmentReference, name: 'Weapon', hierarchyPath: 'Root/Weapon' }],
    renderers: [{ sourceReference: equipmentReference, glbNodeIndex: null, defaultVisible: true }],
  }
  assert.throws(() => buildChibiArrangementDefault(profile, [{}]), /no exact GLB node binding/)
  assert.throws(() => buildChibiArrangementDefault({ ...profile, renderers: [...profile.renderers, ...profile.renderers] }, [{}, {}]), /maps to 2 exact/)
})

test('reuses a revision only when its DB default covers every exact allowlisted node', () => {
  const validation = { equipmentBindingEvidence: [{ sourceReference: equipmentReference, name: 'Weapon', hierarchyPath: 'Root/Weapon' }] }
  const complete = { schemaVersion: 1, nodes: {
    '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    [equipmentKey]: { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  } }
  assert.equal(isCompleteChibiArrangementDefault(complete, validation), true)
  assert.equal(isCompleteChibiArrangementDefault({}, validation), false)
  assert.equal(isCompleteChibiArrangementDefault({ ...complete, nodes: { '$model': complete.nodes.$model } }, validation), false)
  assert.equal(isCompleteChibiArrangementDefault({ schemaVersion: 1, nodes: { '$model': { visible: true } } }, { valid: true }), false)
  assert.equal(isCompleteChibiArrangementDefault({
    ...complete,
    nodes: { ...complete.nodes, [equipmentKey]: { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1] } },
  }, validation), false)
})

test('rebases legacy wrapper corrections onto the new imported default and drops removed nodes', () => {
  const nextDefault = {
    schemaVersion: 1,
    nodes: {
      '$model': { visible: true, position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
      [equipmentKey]: { visible: true, position: [0.4, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    },
  }
  const rebased = rebaseChibiArrangementOverride({}, {
    schemaVersion: 1,
    nodes: {
      [equipmentKey]: { position: [0.1, 0, 0] },
      'removed-equipment': { visible: false },
    },
  }, nextDefault)

  assert.deepEqual(rebased.nodes[equipmentKey], { position: [0.5, 0, 0] })
  assert.equal(rebased.nodes['removed-equipment'], undefined)
})

test('preserves the same admin correction when rebasing a nonempty imported default', () => {
  const oldDefault = { schemaVersion: 1, nodes: { [equipmentKey]: { position: [0.4, 0, 0] } } }
  const oldOverride = { schemaVersion: 1, nodes: { [equipmentKey]: { position: [0.5, 0, 0] } } }
  const nextDefault = { schemaVersion: 1, nodes: { [equipmentKey]: { position: [0.8, 0, 0] } } }

  const rebased = rebaseChibiArrangementOverride(oldDefault, oldOverride, nextDefault)

  assert.deepEqual(rebased.nodes[equipmentKey], { position: [0.9, 0, 0] })
})
