import assert from 'node:assert/strict'
import test from 'node:test'
import {
  actionPairs,
  canonicalPathSha256,
  canonicalReportSha256,
  canonicalJson,
  CHIBI_V12_MOTION_PROOF_MATERIALITY_POLICY,
  CHIBI_V12_MOTION_PROOF_OUTPUT_NAME,
  CHIBI_V12_MOTION_PROOF_POLICY_VERSION,
  CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION,
  CHIBI_V12_MOTION_PROOF_OUTPUT_NAME_V2,
  CHIBI_V12_MOTION_PROOF_POLICY_VERSION_V2,
  CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION_V2,
  classifyScalarValues,
  classifyTrackCoverage,
  findExactScopeTransform,
  matchesScopedAnimationPath,
  selectZeroMotionFailures,
  sourceReferenceKey,
  type SourceMotionComparisonV2,
  type SourceMotionProofRowV2,
  type SourceReference,
} from './chibi-v12-motion-proof-core'

const ref: SourceReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-one', objectId: '42' }

const exactMetric = (unit: 'glb-model-units' | 'degrees' | 'dimensionless') => ({
  unit, sourceExcursion: 0, gate: null, maxKeyError: 0, maxMidpointError: 0,
  maxCubicExtremumError: 0, maxSampleError: 0, errorGateRatio: null,
})

const exactComparison: SourceMotionComparisonV2 = {
  policyId: CHIBI_V12_MOTION_PROOF_MATERIALITY_POLICY,
  mode: 'exact-motion-accounting',
  modelHeightUnits: null,
  modelHeightEvidence: null,
  translation: exactMetric('glb-model-units'),
  quaternion: exactMetric('degrees'),
  scale: {
    unit: 'dimensionless',
    sourceExcursion: 0,
    axes: {
      x: { sourceMagnitude: 1, gate: null, maxKeyError: 0, maxMidpointError: 0, maxCubicExtremumError: 0, maxSampleError: 0, errorGateRatio: null },
      y: { sourceMagnitude: 1, gate: null, maxKeyError: 0, maxMidpointError: 0, maxCubicExtremumError: 0, maxSampleError: 0, errorGateRatio: null },
      z: { sourceMagnitude: 1, gate: null, maxKeyError: 0, maxMidpointError: 0, maxCubicExtremumError: 0, maxSampleError: 0, errorGateRatio: null },
    },
  },
  timing: { applicable: false, maxAbsDeltaMs: null, gateMs: 16.7, cumulativeDriftMs: null },
  scaleSignZeroTransitions: [],
  visibilityChanges: false,
}

const exactStaticRow: SourceMotionProofRowV2 = {
  studentId: 10001,
  sourceIdentity: 'fixture',
  asset: { assetId: 'asset', revision: 'revision', sha256: 'b'.repeat(64) },
  profileSha256: 'c'.repeat(64),
  renderer: { sourceKey: sourceReferenceKey(ref), sourceReference: ref },
  action: { id: 'pickup', clip: 'Pickup' },
  selectedPrefab: { path: 'fixture.prefab', sourceReference: ref, rootTransformReference: ref },
  animator: {
    componentReference: ref,
    rootReference: ref,
    path: [{ name: 'Root', sourceReference: ref }],
    controllerReference: ref,
    controllerGraph: { complete: true, references: [ref], clipReferences: [ref], effectiveClipReferences: [ref], sha256: 'd'.repeat(64) },
    selectedClipReference: ref,
    matchingAnimatorCount: 1,
    matchingClipCount: 1,
  },
  sourceClip: { name: 'Pickup', sourceReference: ref },
  sourceClipRange: { startTimeSec: 0, stopTimeSec: 1 },
  proofStatus: 'static',
  scopeTransforms: [{
    roles: ['renderer'], sourceReference: ref, name: 'Root', path: [{ name: 'Root', sourceReference: ref }],
    pathSha256: 'e'.repeat(64), animatorRelation: 'inside-animator-subtree', animationPathTokens: [], glbNodeIndex: 0,
  }],
  curveSet: {
    complete: true, coverageStatus: 'complete', totalBindingCount: 1, relevantTrackCount: 1,
    unresolvedRelevantCount: 0, genericBindingCount: 1, directCurveCount: 0, decoderDiagnostics: [], sha256: 'f'.repeat(64),
  },
  tracks: [{
    curveIndex: 0, bindingPathHash: 0, pathTokens: [], sourceTransformReference: ref,
    component: 'Transform', property: 'scale.x', bindingKind: 'transform', sourceKind: 'constant',
    sampleCount: 1, valuesSha256: '1'.repeat(64), valueClass: 'constant', disposition: 'exact-static',
    sourceCurves: [{ component: 'x', sourceKind: 'constant', initialValue: 1, keys: [{ time: 0, value: 1, coefficients: null }] }],
    sourceTarget: {
      reference: ref, path: [{ name: 'Root', sourceReference: ref }], pathSha256: 'e'.repeat(64),
      animatorRelation: 'inside-animator-subtree', glbNodeIndex: 0,
      sourceLocalTrs: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    },
    glbChannels: [],
    sampleEvidence: [{
      timeSec: 0, kind: 'key', source: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
      glb: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    }],
    comparison: exactComparison,
  }],
  diagnosticCodes: [],
}

test('action pair identities preserve initial pose and each available interaction', () => {
  assert.deepEqual(actionPairs({
    initialPose: 'Idle',
    interactions: {
      touch: { state: 'available', clip: 'Touch' },
      pickup: { state: 'unavailable', clip: 'Pickup' },
      idle: { state: 'available', clip: 'Idle' },
    },
  }), [
    { id: 'initialPose', clip: 'Idle' },
    { id: 'idle', clip: 'Idle' },
    { id: 'touch', clip: 'Touch' },
  ])
})

test('v3 proof contract has an exclusive output while legacy v2 pins remain fixed', () => {
  assert.equal(CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION, 3)
  assert.equal(CHIBI_V12_MOTION_PROOF_POLICY_VERSION, 'chibi-v12-source-motion-proof-v3')
  assert.equal(CHIBI_V12_MOTION_PROOF_OUTPUT_NAME, 'chibi-v12-source-motion-proof-v3-20260927.json')
  assert.equal(CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION_V2, 2)
  assert.equal(CHIBI_V12_MOTION_PROOF_POLICY_VERSION_V2, 'chibi-v12-source-motion-proof-v2')
  assert.equal(CHIBI_V12_MOTION_PROOF_OUTPUT_NAME_V2, 'chibi-v12-source-motion-proof-v2-20260926.json')
  assert.equal(exactStaticRow.proofStatus, 'static')
  assert.equal(exactStaticRow.curveSet.totalBindingCount, exactStaticRow.tracks.length)
  assert.equal(exactStaticRow.tracks[0].disposition, 'exact-static')
  assert.equal(exactStaticRow.tracks[0].comparison.mode, 'exact-motion-accounting')
  assert.equal(exactStaticRow.tracks[0].comparison.modelHeightUnits, null)
  assert.equal(exactStaticRow.tracks[0].comparison.modelHeightEvidence, null)
  assert.equal(exactStaticRow.tracks[0].sourceTarget?.sourceLocalTrs.scale[0], 1)

  const gatedComparison: SourceMotionComparisonV2 = {
    ...exactComparison,
    mode: 'policy-gated',
    modelHeightUnits: 0.01,
    modelHeightEvidence: {
      selector: 'equipmentBindingEvidence.bodyRendererReferences',
      rendererReferences: [ref],
      glbNodeIndices: [0],
      measurement: { minY: 0, maxY: 0.01, height: 0.01, vertexCount: 3 },
    },
    translation: { ...exactMetric('glb-model-units'), gate: 0.00005, errorGateRatio: 0.1 },
    quaternion: { ...exactMetric('degrees'), gate: 0.1, errorGateRatio: 0.01 },
    scale: {
      unit: 'dimensionless', sourceExcursion: 0,
      axes: {
        x: {
          sourceMagnitude: 1, gate: 0.05, maxKeyError: 0, maxMidpointError: 0,
          maxCubicExtremumError: 0, maxSampleError: 0, errorGateRatio: 0,
        },
        y: {
          sourceMagnitude: 1, gate: 0.05, maxKeyError: 0, maxMidpointError: 0,
          maxCubicExtremumError: 0, maxSampleError: 0, errorGateRatio: 0,
        },
        z: {
        sourceMagnitude: 1, gate: 0.05, maxKeyError: 0, maxMidpointError: 0,
        maxCubicExtremumError: 0, maxSampleError: 0, errorGateRatio: 0,
        },
      },
    },
  }
  assert.equal(gatedComparison.mode, 'policy-gated')
  assert.equal(gatedComparison.modelHeightEvidence.measurement.height, gatedComparison.modelHeightUnits)
})

test('zero-motion selection uses structural failure category rather than student IDs', () => {
  const selected = selectZeroMotionFailures([
    { studentId: 23002, failure: { category: 'structural-action-no-nonzero-delta', rendererSourceKey: 'r', actionClip: 'Pickup' } },
    { studentId: 10051, failure: { category: 'source-rootbone-ancestry' } },
  ])
  assert.equal(selected.length, 1)
  assert.deepEqual(selected[0], {
    studentId: 23002, sourceIdentity: undefined, assetId: undefined, sha256: undefined,
    rendererSourceKey: 'r', clip: 'Pickup',
  })
})

test('canonical report digest ignores generatedAt and its own digest', () => {
  const left = { schemaVersion: 1, generatedAt: 'first', rows: [{ z: 1, a: 2 }], reportSha256: 'old' }
  const right = { reportSha256: 'new', rows: [{ a: 2, z: 1 }], generatedAt: 'second', schemaVersion: 1 }
  assert.equal(canonicalReportSha256(left), canonicalReportSha256(right))
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}')
})

test('path digest preserves path order and source identity', () => {
  const child = { ...ref, objectId: '43' }
  const first = canonicalPathSha256([{ name: 'Root', sourceReference: ref }, { name: 'Child', sourceReference: child }])
  const reverse = canonicalPathSha256([{ name: 'Child', sourceReference: child }, { name: 'Root', sourceReference: ref }])
  assert.notEqual(first, reverse)
})

test('renderer scope matches the terminal Transform, not its SkinnedMeshRenderer component', () => {
  const rendererComponent = { ...ref, objectId: '1176243667897907128' }
  const terminalTransform = { ...ref, objectId: '-2994284275993249864' }
  const otherTransform = { ...ref, objectId: '-42' }
  const scope = [{ sourceReference: terminalTransform, glbNodeIndex: 151 }]

  assert.notEqual(sourceReferenceKey(rendererComponent), sourceReferenceKey(terminalTransform))
  assert.equal(findExactScopeTransform(scope, terminalTransform), scope[0])
  assert.equal(findExactScopeTransform(scope, otherTransform), undefined)
})

test('Animator-root binding is retained only for the exact scoped root path', () => {
  assert.equal(matchesScopedAnimationPath([], []), true)
  assert.equal(matchesScopedAnimationPath(['Armature', 'Hand'], ['Armature', 'Hand']), true)
  assert.equal(matchesScopedAnimationPath([], ['Armature']), false)
  assert.equal(matchesScopedAnimationPath(['Armature'], []), false)
  assert.equal(matchesScopedAnimationPath(null, []), false)
})

test('scalar curves fail closed when empty and classify constant/dynamic values', () => {
  assert.equal(classifyScalarValues([]), 'unresolved')
  assert.equal(classifyScalarValues([1, 1 + 1e-8]), 'constant')
  assert.equal(classifyScalarValues([1, 1.01]), 'dynamic')
})

test('static proof requires complete source coverage and mapped dynamic tracks', () => {
  const scope = new Set([`${ref.bundleSha256}:${ref.serializedFile.toLowerCase()}:${ref.objectId}`])
  const base = { bindingKind: 'transform' as const, sourceTransformReference: ref, glbChannels: [] }
  assert.equal(classifyTrackCoverage({ complete: true, scopeReferenceKeys: scope, tracks: [{ ...base, valueClass: 'constant' }] }).proofStatus, 'static')
  assert.equal(classifyTrackCoverage({ complete: false, scopeReferenceKeys: scope, tracks: [{ ...base, valueClass: 'constant' }] }).proofStatus, 'unresolved')
  assert.equal(classifyTrackCoverage({ complete: true, scopeReferenceKeys: scope, tracks: [{ ...base, valueClass: 'dynamic' }] }).proofStatus, 'unresolved')
  assert.equal(classifyTrackCoverage({ complete: true, scopeReferenceKeys: scope, tracks: [{ ...base, valueClass: 'dynamic', glbChannels: [{}] }] }).proofStatus, 'dynamic')
})
