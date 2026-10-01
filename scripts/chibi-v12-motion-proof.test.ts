import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyV3TrackEvidence, glbTransformSampleCacheKey, nearestSamplerTiming, policyGatedComparisonForSamples, sourceTargetForTrack } from './chibi-v12-motion-proof'
import type { SourceMotionProofTrackV3, SourceMotionTransformV2 } from './chibi-v12-motion-proof-core'
import { readNodeBaseTrs, type V12Glb } from './chibi-v12-motion-glb'

const rest: SourceMotionTransformV2 = {
  translation: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
}

function sample(source: SourceMotionTransformV2, glb: SourceMotionTransformV2 = source, timeSec = 0): SourceMotionProofTrackV3['sampleEvidence'][number] {
  return { timeSec, kind: 'key', source, glb }
}

function input(overrides: Partial<Parameters<typeof classifyV3TrackEvidence>[0]> = {}): Parameters<typeof classifyV3TrackEvidence>[0] {
  return {
    coverageComplete: true,
    bindingKind: 'transform',
    targetResolved: true,
    property: 'translation',
    valueClass: 'constant',
    sourceCurves: [{
      component: 'x', sourceKind: 'constant', initialValue: 0,
      keys: [{ time: 0, value: 0, coefficients: null }],
    }],
    sampleEvidence: [sample(rest)],
    nodeDefault: rest,
    hasMappedChannel: false,
    hasScaleSignZeroTransition: false,
    ...overrides,
  }
}

test('exact static requires complete constant source, no property channel, and serialized rest-trs equality', () => {
  assert.deepEqual(classifyV3TrackEvidence(input()), { disposition: 'exact-static', diagnosticCodes: [] })
  assert.equal(classifyV3TrackEvidence(input({ coverageComplete: false })).disposition, 'unresolved')
  assert.equal(classifyV3TrackEvidence(input({ sourceCurves: [] })).disposition, 'unresolved')
  assert.equal(classifyV3TrackEvidence(input({
    hasMappedChannel: true,
    channelTiming: { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 },
    mappedChannelPropertyStatic: true,
  })).disposition, 'exact-static-channel')

  const rotated: SourceMotionTransformV2 = { ...rest, rotation: [0, 0.70710678, 0, 0.70710678] }
  assert.equal(classifyV3TrackEvidence(input({
    sampleEvidence: [sample(rest), sample(rotated, rotated, 1)],
  })).disposition, 'exact-static', 'A static translation track is independent of an exactly preserved rotation track.')
})

test('Hanae constant quaternion uses the sampler-normalized node default for bounded classification', () => {
  const rawNodeRotation = [1.48433565785866e-13, 0.00000137507538511272, -0.495772778987885, 0.868452310562134]
  const sourceRotation = [-7.626338935861219e-15, 1.3750753613530641e-6, -0.49577274061920173, 0.8684522955563161]
  const glb: V12Glb = {
    bytes: Buffer.alloc(0),
    sha256: 'a'.repeat(64),
    binary: Buffer.alloc(0),
    gltf: { nodes: [{ rotation: rawNodeRotation }] },
  }
  const normalizedDefault = readNodeBaseTrs(glb, 0)
  assert.ok(normalizedDefault)
  const source: SourceMotionTransformV2 = { ...rest, rotation: sourceRotation as [number, number, number, number] }
  const glbSample: SourceMotionTransformV2 = { ...rest, rotation: normalizedDefault.rotation as [number, number, number, number] }
  const samples = [sample(source, glbSample)]
  const witness = {
    selector: 'reviewed-isolated-glb-body-role-witness-v1' as const,
    witness: {} as never,
    measurement: { minY: -0.000009719745195352641, maxY: 0.010466430829964419, height: 0.010476150575159772, vertexCount: 6927 },
  }
  const curves = (['x', 'y', 'z', 'w'] as const).map((component, index) => ({
    component,
    sourceKind: 'constant' as const,
    initialValue: sourceRotation[index],
    keys: [],
  }))
  const comparison = policyGatedComparisonForSamples(samples, witness)
  const rawDefault = { ...rest, rotation: rawNodeRotation as [number, number, number, number] }
  assert.equal(classifyV3TrackEvidence(input({
    property: 'rotation', sourceCurves: curves, sampleEvidence: samples, nodeDefault: rawDefault,
    bodyHeightEvidence: witness, policyGatedComparison: comparison,
  })).disposition, 'unresolved')

  const result = classifyV3TrackEvidence(input({
    property: 'rotation', sourceCurves: curves, sampleEvidence: samples, nodeDefault: normalizedDefault as SourceMotionTransformV2,
    bodyHeightEvidence: witness, policyGatedComparison: comparison,
  }))
  assert.equal(result.disposition, 'bounded-source-to-static')
  assert.deepEqual(result.diagnosticCodes, [])
})

test('source-to-static mismatch stays unresolved without a body-height selector', () => {
  const moved: SourceMotionTransformV2 = { ...rest, translation: [0.01, 0, 0] }
  const result = classifyV3TrackEvidence(input({
    valueClass: 'dynamic',
    sampleEvidence: [sample(rest), sample(moved, rest, 1)],
    sourceCurves: [{
      component: 'x', sourceKind: 'streamed', initialValue: 0,
      keys: [{ time: 0, value: 0, coefficients: null }, { time: 1, value: 0.01, coefficients: null }],
    }],
  }))
  assert.equal(result.disposition, 'unresolved')
  assert.ok(result.diagnosticCodes.includes('MODEL_HEIGHT_SELECTOR_MISSING'))
})

test('bounded source-to-static requires a reviewed height witness, static GLB property, and every frozen materiality gate', () => {
  const moved: SourceMotionTransformV2 = { ...rest, translation: [0.0005, 0, 0] }
  const samples = [sample(rest, rest, 0), sample(moved, rest, 1)]
  const witness = {
    selector: 'reviewed-isolated-glb-body-role-witness-v1' as const,
    witness: {} as never,
    measurement: { minY: 0, maxY: 1, height: 1, vertexCount: 10 },
  }
  const comparison = policyGatedComparisonForSamples(samples, witness)
  assert.equal(comparison.mode, 'policy-gated')
  if (comparison.mode !== 'policy-gated') assert.fail('Expected materiality-gated comparison.')
  assert.equal(comparison.modelHeightUnits, 1)
  assert.equal(comparison.translation.gate, 0.00105)
  assert.ok(comparison.translation.maxSampleError < comparison.translation.gate)
  assert.equal(comparison.quaternion.gate, 0.1)
  assert.equal(comparison.scale.axes.x.gate, 0.05)

  const curves = [{
    component: 'x' as const, sourceKind: 'streamed' as const, initialValue: 0,
    keys: [{ time: 0, value: 0, coefficients: null }, { time: 1, value: 0.0005, coefficients: null }],
  }]
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves, sampleEvidence: samples,
    bodyHeightEvidence: witness,
    policyGatedComparison: comparison,
  })).disposition, 'bounded-source-to-static')
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves, sampleEvidence: samples,
    bodyHeightEvidence: witness,
    policyGatedComparison: comparison, hasUnsafeScaleValue: true,
  })).disposition, 'unresolved')

  const tooFar = [sample(rest, rest, 0), sample({ ...rest, translation: [0.02, 0, 0] }, rest, 1)]
  const overGate = policyGatedComparisonForSamples(tooFar, witness)
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: [{ ...curves[0], keys: [{ time: 0, value: 0, coefficients: null }, { time: 1, value: 0.02, coefficients: null }] }],
    sampleEvidence: tooFar, bodyHeightEvidence: witness, policyGatedComparison: overGate,
  })).disposition, 'unresolved')

  const forgedComparison = structuredClone(comparison)
  if (forgedComparison.mode === 'policy-gated') forgedComparison.translation.maxSampleError = 0
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves, sampleEvidence: samples,
    bodyHeightEvidence: witness, policyGatedComparison: forgedComparison,
  })).disposition, 'unresolved', 'Caller-supplied materiality metrics are recomputed from samples.')
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves, sampleEvidence: samples,
    bodyHeightEvidence: witness, policyGatedComparison: comparison, nodeDefault: null,
  })).disposition, 'unresolved', 'A bounded-to-static claim requires a node default.')
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves,
    sampleEvidence: [sample({ ...rest, translation: [0.0001, 0, 0] }, { ...rest, translation: [0.0001, 0, 0] }), sample({ ...moved, translation: [0.0001, 0, 0] }, { ...rest, translation: [0.0001, 0, 0] }, 1)],
    bodyHeightEvidence: witness,
    policyGatedComparison: policyGatedComparisonForSamples([
      sample({ ...rest, translation: [0.0001, 0, 0] }, { ...rest, translation: [0.0001, 0, 0] }),
      sample({ ...moved, translation: [0.0001, 0, 0] }, { ...rest, translation: [0.0001, 0, 0] }, 1),
    ], witness),
  })).disposition, 'unresolved', 'The GLB static samples must equal the actual node default.')
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves,
    sampleEvidence: [sample(rest), sample({ ...rest, translation: [0.0002, 0, 0] }, rest, 1)],
    bodyHeightEvidence: witness, policyGatedComparison: comparison,
  })).disposition, 'unresolved', 'Samples and their comparison cannot be mixed across revisions.')
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves, sampleEvidence: samples,
    bodyHeightEvidence: witness,
    policyGatedComparison: { ...comparison, visibilityChanges: true } as typeof comparison,
  })).disposition, 'unresolved', 'Visibility changes are never accepted as a bounded transform approximation.')
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves, sampleEvidence: samples,
    bodyHeightEvidence: witness,
    policyGatedComparison: { ...comparison, timing: { ...comparison.timing, applicable: true, maxAbsDeltaMs: 1, cumulativeDriftMs: 1 } } as typeof comparison,
  })).disposition, 'unresolved', 'Bounded-to-static cannot suppress timing evidence.')
  assert.equal(classifyV3TrackEvidence(input({
    valueClass: 'dynamic', sourceCurves: curves, sampleEvidence: samples,
    bodyHeightEvidence: witness,
    policyGatedComparison: { ...comparison, scaleSignZeroTransitions: [{ axis: 'x', sourceTransition: 'positive>zero', glbTransition: 'positive>positive' }] } as typeof comparison,
  })).disposition, 'unresolved', 'Scale sign/zero transitions are never approximated.')
})

test('dynamic source motion is preserved only when its exact mapped GLB channel samples match', () => {
  const moved: SourceMotionTransformV2 = { ...rest, translation: [0.01, 0, 0] }
  const result = classifyV3TrackEvidence(input({
    valueClass: 'dynamic',
    hasMappedChannel: true,
    channelTiming: { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 },
    sampleEvidence: [sample(rest), sample(moved, moved, 1)],
    sourceCurves: [{
      component: 'x', sourceKind: 'streamed', initialValue: 0,
      keys: [{ time: 0, value: 0, coefficients: null }, { time: 1, value: 0.01, coefficients: null }],
    }],
  }))
  assert.equal(result.disposition, 'preserved-glb')

  const mismatch = classifyV3TrackEvidence(input({
    valueClass: 'dynamic',
    hasMappedChannel: true,
    channelTiming: { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 },
    sampleEvidence: [sample(rest), sample(moved, rest, 1)],
  }))
  assert.equal(mismatch.disposition, 'unresolved')
})

test('bound-property accounting does not cascade a sibling TRS channel into a static track', () => {
  const rotated: SourceMotionTransformV2 = { ...rest, rotation: [0, 0.5, 0, Math.sqrt(0.75)] }
  const result = classifyV3TrackEvidence(input({
    property: 'translation',
    valueClass: 'constant',
    sampleEvidence: [sample(rest, rest, 0), sample(rotated, rotated, 1)],
  }))
  assert.equal(result.disposition, 'exact-static')
})

test('mapped constant channel can retain an authored non-default value exactly', () => {
  const authored: SourceMotionTransformV2 = { ...rest, translation: [0.125, 0, 0] }
  const curves = [{ component: 'x' as const, sourceKind: 'constant' as const, initialValue: 0.125, keys: [] }]
  const samples = [sample(authored, authored, 0), sample(authored, authored, 1)]
  const result = classifyV3TrackEvidence(input({
    sourceCurves: curves,
    sampleEvidence: samples,
    hasMappedChannel: true,
    channelTiming: { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 },
    mappedChannelPropertyStatic: true,
  }))
  assert.equal(result.disposition, 'exact-static-channel')
  assert.deepEqual(authored.translation, [0.125, 0, 0])
})

test('one-float32-step mapped deviation uses the existing bounded gate, not exact-bit rejection', () => {
  const sourceValue = 5.960464477539063e-8
  const source: SourceMotionTransformV2 = { ...rest, translation: [sourceValue, 0, 0] }
  const samples = [sample(source, rest, 0), sample(source, rest, 1)]
  const curves = [{ component: 'x' as const, sourceKind: 'constant' as const, initialValue: sourceValue, keys: [] }]
  const witness = {
    selector: 'reviewed-isolated-glb-body-role-witness-v1' as const,
    witness: {} as never,
    measurement: { minY: 0, maxY: 1, height: 1, vertexCount: 10 },
  }
  const timing = { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 }
  const comparison = policyGatedComparisonForSamples(samples, witness, timing)
  const result = classifyV3TrackEvidence(input({
    sourceCurves: curves,
    sampleEvidence: samples,
    hasMappedChannel: true,
    channelTiming: timing,
    mappedChannelPropertyStatic: true,
    bodyHeightEvidence: witness,
    policyGatedComparison: comparison,
  }))
  assert.equal(Math.fround(sourceValue) === Math.fround(0), false)
  assert.equal(result.disposition, 'bounded-source-to-glb-channel')
})

test('both previously measured Hanae source-to-GLB over-gate pairs remain unresolved', () => {
  const witness = {
    selector: 'reviewed-isolated-glb-body-role-witness-v1' as const,
    witness: {} as never,
    measurement: { minY: -0.000009719745195352641, maxY: 0.010466430829964419, height: 0.010476150575159772, vertexCount: 6927 },
  }
  const timing = { maxAbsDeltaMs: 16.50834, cumulativeDriftMs: 0 }
  const translationSource: SourceMotionTransformV2 = { ...rest, translation: [0.0010717039348570312, 0, 0] }
  const translationGlb: SourceMotionTransformV2 = { ...rest, translation: [0.0010115810100822774, 0, 0] }
  const translationSamples = [sample(rest, rest, 0), sample(translationSource, translationGlb, 2.8666666746139526)]
  const translationComparison = policyGatedComparisonForSamples(translationSamples, witness, timing)
  const translationResult = classifyV3TrackEvidence(input({
    valueClass: 'dynamic',
    sourceCurves: [{ component: 'x', sourceKind: 'streamed', initialValue: 0, keys: [
      { time: 0, value: 0, coefficients: null }, { time: 2.8666666746139526, value: 0.0010717039348570312, coefficients: null },
    ] }],
    sampleEvidence: translationSamples,
    hasMappedChannel: true,
    channelTiming: timing,
    mappedChannelPropertyStatic: false,
    bodyHeightEvidence: witness,
    policyGatedComparison: translationComparison,
  }))
  assert.equal(translationResult.disposition, 'unresolved')
  assert.ok(translationResult.diagnosticCodes.includes('SOURCE_TO_GLB_PROPERTY_ERROR_OVER_GATE'))

  const sourceAngle = 154.77710508560926 * Math.PI / 180
  const glbAngle = (154.77710508560926 - 3.8357838530241133) * Math.PI / 180
  const rotationSource: SourceMotionTransformV2 = { ...rest, rotation: [0, 0, Math.sin(sourceAngle / 2), Math.cos(sourceAngle / 2)] }
  const rotationGlb: SourceMotionTransformV2 = { ...rest, rotation: [0, 0, Math.sin(glbAngle / 2), Math.cos(glbAngle / 2)] }
  const rotationSamples = [sample(rest, rest, 0), sample(rotationSource, rotationGlb, 0.11343544476305467)]
  const rotationTiming = { maxAbsDeltaMs: 16.02554, cumulativeDriftMs: 0 }
  const rotationResult = classifyV3TrackEvidence(input({
    property: 'rotation',
    valueClass: 'dynamic',
    sourceCurves: [{ component: 'z', sourceKind: 'streamed', initialValue: 0, keys: [
      { time: 0, value: 0, coefficients: null }, { time: 0.11343544476305467, value: Math.sin(sourceAngle / 2), coefficients: null },
    ] }],
    sampleEvidence: rotationSamples,
    hasMappedChannel: true,
    channelTiming: rotationTiming,
    mappedChannelPropertyStatic: false,
    bodyHeightEvidence: witness,
    policyGatedComparison: policyGatedComparisonForSamples(rotationSamples, witness, rotationTiming),
  }))
  assert.equal(rotationResult.disposition, 'unresolved')
  assert.ok(rotationResult.diagnosticCodes.includes('SOURCE_TO_GLB_PROPERTY_ERROR_OVER_GATE'))
})

test('mapped sampler timing includes clip endpoints and keeps the frozen 16.7 ms gate', () => {
  assert.deepEqual(nearestSamplerTiming([0.5], [0, 0.5, 1], { startTimeSec: 0, stopTimeSec: 1 }), { maxAbsDeltaMs: 0, cumulativeDriftMs: 0 })
  const shifted = nearestSamplerTiming([0.5], [0.02, 0.52, 1.02], { startTimeSec: 0, stopTimeSec: 1 })
  assert.ok(Math.abs(shifted.maxAbsDeltaMs - 20) < 1e-9)
  assert.throws(() => nearestSamplerTiming([0.5], [0, 1], { startTimeSec: 0, stopTimeSec: 1 }), /ambiguous nearest/)
})

test('scale sign or zero transitions are never accepted as exact static or preserved motion', () => {
  const result = classifyV3TrackEvidence(input({
    property: 'scale',
    hasScaleSignZeroTransition: true,
  }))
  assert.equal(result.disposition, 'unresolved')
  assert.ok(result.diagnosticCodes.includes('SCALE_SIGN_OR_ZERO_TRANSITION'))
})

test('unsupported bindings and missing source samples fail closed', () => {
  assert.equal(classifyV3TrackEvidence(input({ bindingKind: 'other' })).disposition, 'unresolved')
  assert.equal(classifyV3TrackEvidence(input({ property: null })).disposition, 'unresolved')
  assert.equal(classifyV3TrackEvidence(input({ sampleEvidence: [] })).disposition, 'unresolved')
  assert.equal(classifyV3TrackEvidence(input({ sampleEvidence: [{ ...sample(rest), source: { ...rest, translation: [Number.NaN, 0, 0] } }] })).disposition, 'unresolved')
  assert.equal(classifyV3TrackEvidence(input({ nodeDefault: { ...rest, rotation: [0, 0, 0, 0] } })).disposition, 'unresolved')
})

test('source target paths with missing endpoint references fail closed without dereferencing undefined', () => {
  const rootReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab', objectId: '1' }
  const targetReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'prefab', objectId: '2' }
  const makeTrack = (path: unknown[]) => ({
    sourceTransformReference: targetReference,
    sourceTarget: { reference: targetReference, path, pathSha256: '0'.repeat(64) },
  })

  assert.equal(sourceTargetForTrack(makeTrack([{ name: 'Root' }]), 0, rootReference, {}, []), null)
  assert.equal(sourceTargetForTrack(makeTrack([
    { name: 'Root', sourceReference: rootReference },
    { name: 'Target' },
  ]), 0, rootReference, {}, []), null)
})

test('GLB transform samples with different exact time sets do not alias in the node cache', () => {
  assert.equal(glbTransformSampleCacheKey(191, [0, 0.5, 1]), glbTransformSampleCacheKey(191, [1, 0.5, 0]))
  assert.notEqual(glbTransformSampleCacheKey(191, [0, 0.5]), glbTransformSampleCacheKey(191, [0, 1]))
  assert.notEqual(glbTransformSampleCacheKey(191, [0, 1]), glbTransformSampleCacheKey(192, [0, 1]))
})
