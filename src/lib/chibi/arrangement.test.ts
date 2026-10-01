import assert from 'node:assert/strict'
import test from 'node:test'
import { diffChibiArrangement as diffUiChibiArrangement, setChibiArrangementAdjustment } from '../../components/chibi/chibi-arrangement'

import {
  CHIBI_ARRANGEMENT_MODEL_KEY,
  buildChibiArrangementAllowedNodes,
  mergeChibiArrangementDelta,
  parseAllowedChibiArrangementOverride,
  parseAllowedChibiArrangementDelta,
  parseChibiArrangementDelta,
} from './arrangement'

test('parses and canonicalizes bounded arrangement deltas', () => {
  const parsed = parseChibiArrangementDelta({
    schemaVersion: 1,
    nodes: {
      z: { scale: [1, 1, 1] },
      a: { visible: false, position: [1, 2, 3] },
    },
  })
  assert.deepEqual(Object.keys(parsed.nodes), ['a', 'z'])
  assert.deepEqual(parsed.nodes.a, { visible: false, position: [1, 2, 3] })
  assert.deepEqual(parseChibiArrangementDelta({}), { schemaVersion: 1, nodes: {} })
})

test('rejects unknown fields, non-finite values, and oversized payloads', () => {
  assert.throws(() => parseChibiArrangementDelta({ schemaVersion: 2, nodes: {} }), /schemaVersion/)
  assert.throws(() => parseChibiArrangementDelta({ schemaVersion: 1, nodes: { x: { opacity: 0 } } }), /allowed field/)
  assert.throws(() => parseChibiArrangementDelta({ schemaVersion: 1, nodes: { x: { position: [Number.NaN, 0, 0] } } }), /finite number/)
  assert.throws(() => parseChibiArrangementDelta({ schemaVersion: 1, nodes: Object.fromEntries(Array.from({ length: 129 }, (_, index) => [`node-${index}`, { visible: true }])) }), /exceeds/)
})

test('merges immutable imported default with per-binding override', () => {
  const base = { schemaVersion: 1, nodes: { '$model': { position: [1, 2, 3], visible: true }, weapon: { scale: [1, 1, 1] } } }
  const override = { schemaVersion: 1, nodes: { '$model': { visible: false }, weapon: { rotation: [0, 0, 0, 1] } } }
  const merged = mergeChibiArrangementDelta(base, override)
  assert.deepEqual(merged.nodes['$model'], { position: [1, 2, 3], visible: false })
  assert.deepEqual(merged.nodes.weapon, { scale: [1, 1, 1], rotation: [0, 0, 0, 1] })
  assert.deepEqual(base.nodes['$model'], { position: [1, 2, 3], visible: true })
})

test('allowlist contains reserved model/face controls and exact equipment references', () => {
  const reference = { bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId: '42' }
  const profile = { equipmentBindingEvidence: [{ sourceReference: reference, name: 'Weapon', hierarchyPath: 'Root/Weapon' }] }
  const allowed = buildChibiArrangementAllowedNodes(profile).filter(node => node.kind !== 'face-layer')
  assert.equal(allowed[0].key, CHIBI_ARRANGEMENT_MODEL_KEY)
  assert.equal(allowed[1].key, `${'a'.repeat(64)}:cab/prefab:42`)
  const parsed = parseAllowedChibiArrangementDelta({ schemaVersion: 1, nodes: { [allowed[0].key]: { visible: false }, [allowed[1].key]: { position: [0, 0, 0] } } }, profile)
  assert.equal(Object.keys(parsed.nodes).length, 2)
  assert.throws(() => parseAllowedChibiArrangementDelta({ schemaVersion: 1, nodes: { Weapon: { visible: false } } }, profile), /allowlisted/)
})

test('baseline-relative overrides accept the UI correction limits for each exact equipment node', () => {
  const references = ['42', '43'].map(objectId => ({
    bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId,
  }))
  const profile = { equipmentBindingEvidence: references.map((sourceReference, index) => ({
    sourceReference, name: `Weapon ${index + 1}`, hierarchyPath: `Cafe/Weapon ${index + 1}`,
  })) }
  const keys = buildChibiArrangementAllowedNodes(profile).filter(node => node.kind === 'equipment').map(node => node.key)
  const baselineRotation = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2]
  const arrangementDefault = { schemaVersion: 1, nodes: {
    '$model': { position: [0.1, 0, 0], rotation: baselineRotation, scale: [1, 1, 1], visible: true },
    [keys[0]]: { position: [0.01, 0, 0], rotation: baselineRotation, scale: [1.1, 1.1, 1.1], visible: true },
    [keys[1]]: { position: [0.02, 0, 0], rotation: baselineRotation, scale: [1, 1, 1], visible: true },
  } }
  const targetRotation = [-Math.sin(Math.PI / 8), 0, 0, Math.cos(Math.PI / 8)]
  const parsed = parseAllowedChibiArrangementOverride({ schemaVersion: 1, nodes: {
    '$model': { position: [0.6, 0, 0] },
    [keys[0]]: { position: [0.51, 0, 0], rotation: targetRotation, scale: [1.375, 1.375, 1.375] },
    [keys[1]]: { visible: false },
  } }, profile, arrangementDefault)

  assert.deepEqual(Object.keys(parsed.nodes).sort(), ['$model', keys[0], keys[1]].sort())
  assert.deepEqual(parsed.nodes[keys[0]], { position: [0.51, 0, 0], rotation: targetRotation, scale: [1.375, 1.375, 1.375] })
})

test('baseline-relative overrides reject out-of-range position, rotation, scale, NaN, and unknown nodes', () => {
  const reference = { bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId: '42' }
  const profile = { equipmentBindingEvidence: [{ sourceReference: reference, name: 'Weapon', hierarchyPath: 'Cafe/Weapon' }] }
  const [equipment] = buildChibiArrangementAllowedNodes(profile).filter(node => node.kind === 'equipment').map(node => node.key)
  const baselineRotation = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2]
  const arrangementDefault = { schemaVersion: 1, nodes: {
    '$model': { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    [equipment]: { position: [0.01, 0, 0], rotation: baselineRotation, scale: [1.1, 1.1, 1.1] },
  } }
  const override = (node: string, value: unknown) => ({ schemaVersion: 1, nodes: { [node]: value } })

  assert.throws(() => parseAllowedChibiArrangementOverride(override(equipment, { position: [0.5101, 0, 0] }), profile, arrangementDefault), /position correction/)
  assert.throws(() => parseAllowedChibiArrangementOverride(override(equipment, { rotation: [-Math.sin(22 * Math.PI / 180), 0, 0, Math.cos(22 * Math.PI / 180)] }), profile, arrangementDefault), /rotation correction/)
  assert.throws(() => parseAllowedChibiArrangementOverride(override(equipment, { scale: [1.37511, 1.1, 1.1] }), profile, arrangementDefault), /scale correction/)
  assert.throws(() => parseAllowedChibiArrangementOverride(override(equipment, { rotation: [0, 0, 0, 0] }), profile, arrangementDefault), /non-zero quaternion/)
  assert.throws(() => parseAllowedChibiArrangementOverride(override(equipment, { position: [Number.NaN, 0, 0] }), profile, arrangementDefault), /finite number/)
  assert.throws(() => parseAllowedChibiArrangementOverride(override('Weapon', { visible: false }), profile, arrangementDefault), /allowlisted/)
})

test('baseline-aware parser accepts a mixed-axis near-limit rotation emitted by the UI', () => {
  const reference = { bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId: '42' }
  const profile = { equipmentBindingEvidence: [{ sourceReference: reference, name: 'Weapon', hierarchyPath: 'Cafe/Weapon' }] }
  const [equipment] = buildChibiArrangementAllowedNodes(profile).filter(node => node.kind === 'equipment').map(node => node.key)
  const arrangementDefault = { schemaVersion: 1, nodes: {
    '$model': { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    [equipment]: { position: [0.01, 0, 0], rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2], scale: [1.1, 1.1, 1.1] },
  } } as const
  const preview = setChibiArrangementAdjustment(arrangementDefault, equipment, arrangementDefault.nodes[equipment], {
    position: [0, 0, 0], rotation: [45, -45, 45], scale: [1.25, 0.75, 1],
  })
  const uiOverride = diffUiChibiArrangement(arrangementDefault, preview)

  assert.deepEqual(parseAllowedChibiArrangementOverride(uiOverride, profile, arrangementDefault), uiOverride)
})

test('allowlists exact source-complete arrangement warnings from validated renderer diagnostics', () => {
  const sourceReference = { bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId: '42' }
  const meshReference = { bundleSha256: 'B'.repeat(64), serializedFile: 'CAB/Meshes', objectId: '19' }
  const materialReference = { bundleSha256: 'C'.repeat(64), serializedFile: 'CAB/Materials', objectId: '7' }
  const shaderReference = { bundleSha256: 'D'.repeat(64), serializedFile: 'CAB/Shaders', objectId: '3' }
  const referenceKey = (value: typeof sourceReference) => `${value.bundleSha256.toLowerCase()}:${value.serializedFile.toLowerCase()}:${value.objectId}`
  const warning = {
    reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
    message: 'Source rendering profile is unresolved for Fixture_Weapon.',
    blocker: {
      sourceReference, name: 'Fixture_Weapon', hierarchyPath: 'Cafe_Fixture/Fixture_Weapon',
      reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT', evidence: [
        `exact source renderer reference ${referenceKey(sourceReference)}`,
        `exact source mesh reference ${referenceKey(meshReference)}`,
        `exact source material reference ${referenceKey(materialReference)}`,
        `exact source shader reference ${referenceKey(shaderReference)}`,
        'renderer name has authored equipment term(s): weapon',
        'selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer',
      ],
      sourceMeshReference: meshReference,
      sourceMaterialReferences: [materialReference], sourceShaderReferences: [shaderReference],
    },
  }
  const validation = { renderingProfile: { warnings: [warning] } }
  const allowed = buildChibiArrangementAllowedNodes(validation).filter(node => node.kind !== 'face-layer')
  assert.equal(allowed.length, 2)
  assert.deepEqual(allowed[1], {
    key: referenceKey(sourceReference), kind: 'equipment', label: 'Cafe_Fixture/Fixture_Weapon',
  })
  const parsed = parseAllowedChibiArrangementDelta({
    schemaVersion: 1, nodes: { [allowed[1].key]: { position: [0.1, 0, 0] } },
  }, validation)
  assert.equal(Object.keys(parsed.nodes).length, 1)
})

test('does not allow generic, presentation, or incomplete renderer warnings as equipment nodes', () => {
  const sourceReference = { bundleSha256: 'A'.repeat(64), serializedFile: 'CAB/Prefab', objectId: '42' }
  const meshReference = { bundleSha256: 'B'.repeat(64), serializedFile: 'CAB/Meshes', objectId: '19' }
  const materialReference = { bundleSha256: 'C'.repeat(64), serializedFile: 'CAB/Materials', objectId: '7' }
  const shaderReference = { bundleSha256: 'D'.repeat(64), serializedFile: 'CAB/Shaders', objectId: '3' }
  const referenceKey = (value: typeof sourceReference) => `${value.bundleSha256.toLowerCase()}:${value.serializedFile.toLowerCase()}:${value.objectId}`
  const baseWarning = {
    reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
    message: 'Source rendering profile is unresolved for Fixture_Weapon.',
    blocker: {
      sourceReference, name: 'Fixture_Weapon', hierarchyPath: 'Cafe_Fixture/Fixture_Weapon',
      reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT', evidence: [
        `exact source renderer reference ${referenceKey(sourceReference)}`,
        `exact source mesh reference ${referenceKey(meshReference)}`,
        `exact source material reference ${referenceKey(materialReference)}`,
        `exact source shader reference ${referenceKey(shaderReference)}`,
        'renderer name has authored equipment term(s): weapon',
        'selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer',
      ],
      sourceMeshReference: meshReference,
      sourceMaterialReferences: [materialReference], sourceShaderReferences: [shaderReference],
    },
  }
  const generic = structuredClone(baseWarning)
  generic.blocker.name = 'Fixture_Prop'
  generic.blocker.evidence = generic.blocker.evidence.filter(item => !item.startsWith('renderer name has authored equipment term(s): '))
  const presentation = structuredClone(baseWarning)
  presentation.reasonCode = 'PRESENTATION_SHADER_OR_MATERIAL'
  const ambiguous = structuredClone(baseWarning)
  ambiguous.blocker.sourceReference.objectId = ''
  const missingSources = structuredClone(baseWarning)
  missingSources.blocker.sourceShaderReferences = []
  const malformedEvidence = structuredClone(baseWarning)
  malformedEvidence.blocker.evidence = []
  const allowed = buildChibiArrangementAllowedNodes({ warnings: [generic, presentation, ambiguous, missingSources, malformedEvidence] })
  assert.deepEqual(allowed.filter(node => node.kind !== 'face-layer').map(item => item.key), [CHIBI_ARRANGEMENT_MODEL_KEY])
})

test('face controls accept bounded depth edits but reject geometry and other targets', () => {
  const parse = (nodes: unknown) => parseAllowedChibiArrangementOverride({ schemaVersion: 1, nodes }, {}, {})
  assert.deepEqual(parse({ '$eyes': { depthTest: true, depthOffset: -2 }, '$eyebrows': { depthTest: false } }).nodes,
    { '$eyebrows': { depthTest: false }, '$eyes': { depthTest: true, depthOffset: -2 } })
  for (const nodes of [
    { '$eyes': { position: [0, 0, 0] } }, { '$eyes': { depthOffset: 11 } },
    { '$eyes': { depthOffset: NaN } }, { '$eyes': { depthTest: 'true' } },
    { '$model': { depthTest: false } }, { '$hair': { depthTest: true } },
  ]) assert.throws(() => parse(nodes))
})
