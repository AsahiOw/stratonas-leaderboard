import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CHIBI_MODEL_NODE_KEY,
  arrangementNodeTransform,
  arrangementAdjustmentTransform,
  arrangementRevisionMatches,
  arrangementSavePayload,
  cloneChibiArrangement,
  diffChibiArrangement,
  mergeChibiArrangementDocuments,
  setChibiArrangementAdjustment,
  setChibiArrangementTransform,
  setChibiArrangementVisibility,
  transformFromNode,
  transformToNode,
  visibilitySavePayload,
  type ChibiArrangementDocument,
} from './chibi-arrangement'

test('face depth edits round-trip through clone and sparse save payload', () => {
  const original: ChibiArrangementDocument = { schemaVersion: 1, nodes: { '$eyes': { depthTest: true, depthOffset: -2 } } }
  const cloned = cloneChibiArrangement(original)
  assert.deepEqual(cloned, original)
  const override = diffChibiArrangement({ schemaVersion: 1, nodes: {} }, cloned)
  assert.deepEqual(arrangementSavePayload({ assetId: 'asset', checksum: 'revision' }, override).override, original)
  cloned.nodes.$eyes.depthOffset = 1
  assert.equal(original.nodes.$eyes.depthOffset, -2)
})

const empty: ChibiArrangementDocument = { schemaVersion: 1, nodes: {} }

test('whole-model transform is bounded and serialized as a quaternion', () => {
  const changed = setChibiArrangementTransform(empty, CHIBI_MODEL_NODE_KEY, {
    position: [99, -99, 0.2], rotation: [90, -90, 12], scale: [0, 3, 1],
  })
  const node = changed.nodes[CHIBI_MODEL_NODE_KEY]
  assert.deepEqual(node.position, [0.5, -0.5, 0.2])
  assert.equal(node.rotation?.length, 4)
  assert.deepEqual(node.scale, [0.75, 1.25, 1])
  const transform = arrangementNodeTransform(changed, CHIBI_MODEL_NODE_KEY)
  assert.deepEqual(transform.position, [0.5, -0.5, 0.2])
  assert.deepEqual(transform.scale, [0.75, 1.25, 1.0])
  assert.ok(transform.rotation.every(value => Math.abs(value) <= 45))
})

test('unknown nodes remain untouched and visibility changes are isolated', () => {
  const original = setChibiArrangementTransform(empty, 'equipment:key', {
    position: [0.1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  })
  const changed = setChibiArrangementVisibility(original, 'equipment:key', false)
  assert.equal(changed.nodes['equipment:key'].visible, false)
  assert.deepEqual(original.nodes['equipment:key'].visible, undefined)
  assert.deepEqual(cloneChibiArrangement(original), original)
})

test('missing or malformed wire values fall back to identity', () => {
  assert.deepEqual(transformFromNode({ position: [Number.NaN, 2, 3], rotation: [0, 0, 0, 0], scale: [undefined as never, 1, 1] }), {
    position: [0, 0.5, 0.5], rotation: [0, 0, 0], scale: [1, 1, 1],
  })
})

test('save payload carries the asset revision fence and cloned override', () => {
  const override = setChibiArrangementVisibility(empty, 'equipment:key', true)
  const payload = arrangementSavePayload({ assetId: 'asset-1', checksum: 'rev-1' }, override)
  assert.deepEqual(payload, { schemaVersion: 1, assetId: 'asset-1', checksum: 'rev-1', override })
  assert.equal(arrangementRevisionMatches({ assetId: 'asset-1', checksum: 'rev-1' }, 'asset-1', 'rev-1'), true)
  assert.equal(arrangementRevisionMatches({ assetId: 'asset-1', checksum: 'rev-1' }, 'asset-1', 'rev-2'), false)
})

test('effective editor state is reduced to an override delta before persistence', () => {
  const base = setChibiArrangementTransform(empty, CHIBI_MODEL_NODE_KEY, {
    position: [0.1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  })
  const effective = setChibiArrangementTransform(base, CHIBI_MODEL_NODE_KEY, {
    position: [0.2, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
  })
  assert.deepEqual(diffChibiArrangement(base, effective).nodes[CHIBI_MODEL_NODE_KEY], {
    position: [0.2, 0, 0],
  })
  assert.deepEqual(diffChibiArrangement(base, base), { schemaVersion: 1, nodes: {} })
})

test('bounded admin corrections are applied relative to imported transforms', () => {
  const baseline: ChibiArrangementDocument = { schemaVersion: 1, nodes: {
    equipment: { position: [0.3, 0.2, -0.1], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], scale: [1.1, 1.1, 1.1], visible: false },
  } }
  const effective = setChibiArrangementAdjustment(baseline, 'equipment', baseline.nodes.equipment, {
    position: [0.1, -0.1, 0.05], rotation: [10, 0, 0], scale: [1.05, 1, 0.95],
  })
  assert.deepEqual(effective.nodes.equipment?.position, [0.4, 0.1, -0.05])
  assert.deepEqual(effective.nodes.equipment?.scale, [1.1550000000000002, 1.1, 1.045])
  assert.equal(effective.nodes.equipment?.visible, false)
  const adjustment = arrangementAdjustmentTransform(baseline.nodes.equipment, effective.nodes.equipment)
  assert.ok(Math.abs(adjustment.position[0] - 0.1) < 1e-12)
  assert.ok(Math.abs(adjustment.position[1] + 0.1) < 1e-12)
  assert.ok(Math.abs(adjustment.rotation[0] - 10) < 1e-10)
  assert.ok(Math.abs(adjustment.scale[0] - 1.05) < 1e-12)
  assert.ok(Math.abs(adjustment.scale[2] - 0.95) < 1e-12)
})

test('per-field merges retain the untouched imported transform fields', () => {
  const base: ChibiArrangementDocument = { schemaVersion: 1, nodes: {
    equipment: { position: [0.3, 0, 0], rotation: [0, 0, 0.707, 0.707], scale: [1.1, 1.1, 1.1], visible: true },
  } }
  const override: ChibiArrangementDocument = { schemaVersion: 1, nodes: { equipment: { position: [0.4, 0, 0] } } }
  assert.deepEqual(mergeChibiArrangementDocuments(base, override).nodes.equipment, {
    position: [0.4, 0, 0], rotation: [0, 0, 0.707, 0.707], scale: [1.1, 1.1, 1.1], visible: true,
  })
})

test('visibility payload uses the canonical catalogVisible field', () => {
  assert.deepEqual(visibilitySavePayload({ assetId: 'asset-1', checksum: 'rev-1' }, false), {
    schemaVersion: 1, assetId: 'asset-1', checksum: 'rev-1', catalogVisible: false,
  })
})
