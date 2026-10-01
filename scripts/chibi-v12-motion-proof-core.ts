import { createHash } from 'node:crypto'

export type SourceReference = { bundleSha256: string; serializedFile: string; objectId: string }

export const CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION = 3 as const
export const CHIBI_V12_MOTION_PROOF_POLICY_VERSION = 'chibi-v12-source-motion-proof-v3' as const
export const CHIBI_V12_MOTION_PROOF_OUTPUT_NAME = 'chibi-v12-source-motion-proof-v3-20260927.json' as const
export const CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION_V2 = 2 as const
export const CHIBI_V12_MOTION_PROOF_POLICY_VERSION_V2 = 'chibi-v12-source-motion-proof-v2' as const
export const CHIBI_V12_MOTION_PROOF_OUTPUT_NAME_V2 = 'chibi-v12-source-motion-proof-v2-20260926.json' as const
export const CHIBI_V12_MOTION_PROOF_MATERIALITY_POLICY = 'planning.md/v12-pragmatic-gates' as const
export const CHIBI_V12_MOTION_GATES = {
  quaternionMaxDegrees: 3,
  quaternionBaseDegrees: 0.1,
  excursionFraction: 0.1,
  translationMaxHeightFraction: 0.005,
  translationBaseHeightFraction: 0.001,
  scaleAbsoluteFloor: 0.001,
  scaleRelativeFraction: 0.05,
  timingMaxMs: 16.7,
} as const

export type SourceMotionTransformV2 = {
  translation: [number, number, number]
  rotation: [number, number, number, number]
  scale: [number, number, number]
}

export type SourceMotionSampleV2 = {
  timeSec: number
  kind: 'key' | 'midpoint' | 'cubic-extremum'
  source: SourceMotionTransformV2
  glb: SourceMotionTransformV2
}

export type SourceMotionCurveKeyV2 = {
  time: number
  value: number
  /** [cubic, quadratic, linear, startValue] in seconds-relative Hermite form. */
  coefficients: [number, number, number, number] | null
}

export type SourceMotionComponentCurveV2 = {
  component: 'x' | 'y' | 'z' | 'w'
  sourceKind: 'streamed' | 'dense' | 'constant' | 'unresolved'
  initialValue: number | null
  keys: SourceMotionCurveKeyV2[]
}

export type SourceMotionScopeRelationV2 =
  | 'inside-animator-subtree'
  | 'ancestor-of-animator-root'
  | 'disjoint'
  | 'unresolved'

export type SourceMotionSourceTargetV2 = {
  reference: SourceReference
  path: { name: string; sourceReference: SourceReference }[]
  pathSha256: string
  animatorRelation: SourceMotionScopeRelationV2
  glbNodeIndex: number
  /** Raw prefab-local Unity TRS; not GLB-coordinate converted. */
  sourceLocalTrs: SourceMotionTransformV2
}

export type SourceMotionGlbChannelV2 = {
  animationName: string
  channelIndex: number
  samplerIndex: number
  targetNodeIndex: number
  targetPath: 'translation' | 'rotation' | 'scale'
}

export type SourceMotionChannelTimingV3 = {
  maxAbsDeltaMs: number
  cumulativeDriftMs: number
}

export type SourceMotionErrorMetricV2 = {
  unit: 'glb-model-units' | 'degrees' | 'dimensionless'
  sourceExcursion: number
  gate: number | null
  maxKeyError: number | null
  maxMidpointError: number | null
  maxCubicExtremumError: number | null
  maxSampleError: number
  errorGateRatio: number | null
}

export type SourceMotionScaleAxisMetricV2 = {
  sourceMagnitude: number
  gate: number | null
  maxKeyError: number | null
  maxMidpointError: number | null
  maxCubicExtremumError: number | null
  maxSampleError: number
  errorGateRatio: number | null
}

export type SourceMotionModelHeightMeasurementV2 = { minY: number; maxY: number; height: number; vertexCount: number }

export type SourceMotionReviewedBodyRoleWitnessV2 = {
  witnessId: 'chibi-v12-hanae-body-role-visual-witness-20260927'
  studentId: number
  sourceIdentity: string
  assetSha256: string
  sourcePrefabPath: string
  sourceHierarchyPath: string
  rendererType: 'SkinnedMeshRenderer'
  sourcePrefabReference: SourceReference
  sourceRendererReference: SourceReference
  sourceMeshReference: SourceReference
  sourceTransformChainReferences: SourceReference[]
  glbNodeIndex: number
  glbMeshIndex: number
  glbSkinIndex: number
  artifacts: {
    isolationReceiptSha256: string
    isolatedGlbSha256: string
    captureReceiptSha256: string
    fullScreenshotSha256: string
    isolatedScreenshotSha256: string
    pairedScreenshotSha256: string
    reviewedAddendumSha256: string
  }
}

export type SourceMotionModelHeightEvidenceV2 =
  | {
    selector: 'equipmentBindingEvidence.bodyRendererReferences'
    rendererReferences: SourceReference[]
    glbNodeIndices: number[]
    measurement: SourceMotionModelHeightMeasurementV2
  }
  | {
    selector: 'reviewed-isolated-glb-body-role-witness-v1'
    witness: SourceMotionReviewedBodyRoleWitnessV2
    measurement: SourceMotionModelHeightMeasurementV2
  }

type SourceMotionExactErrorMetricV2 = Omit<SourceMotionErrorMetricV2, 'gate' | 'errorGateRatio'> & {
  gate: null
  errorGateRatio: null
}
type SourceMotionGatedErrorMetricV2 = Omit<SourceMotionErrorMetricV2, 'gate' | 'errorGateRatio'> & {
  gate: number
  errorGateRatio: number
}
type SourceMotionExactScaleAxisMetricV2 = Omit<SourceMotionScaleAxisMetricV2, 'gate' | 'errorGateRatio'> & {
  gate: null
  errorGateRatio: null
}
type SourceMotionGatedScaleAxisMetricV2 = Omit<SourceMotionScaleAxisMetricV2, 'gate' | 'errorGateRatio'> & {
  gate: number
  errorGateRatio: number
}
type SourceMotionComparisonBaseV2 = {
  policyId: typeof CHIBI_V12_MOTION_PROOF_MATERIALITY_POLICY
  timing: {
    applicable: boolean
    maxAbsDeltaMs: number | null
    gateMs: 16.7
    cumulativeDriftMs: number | null
  }
  scaleSignZeroTransitions: { axis: 'x' | 'y' | 'z'; sourceTransition: string; glbTransition: string }[]
  visibilityChanges: boolean
}

export type SourceMotionComparisonV2 = SourceMotionComparisonBaseV2 & (
  | {
    /** Exact static/accounted motion makes no numeric materiality claim. */
    mode: 'exact-motion-accounting'
    modelHeightUnits: null
    modelHeightEvidence: null
    translation: SourceMotionExactErrorMetricV2
    quaternion: SourceMotionExactErrorMetricV2
    scale: {
      unit: 'dimensionless'
      sourceExcursion: number
      axes: Record<'x' | 'y' | 'z', SourceMotionExactScaleAxisMetricV2>
    }
  }
  | {
    /** Approximation is valid only with source-evidenced body-height measurement. */
    mode: 'policy-gated'
    modelHeightUnits: number
    modelHeightEvidence: SourceMotionModelHeightEvidenceV2
    translation: SourceMotionGatedErrorMetricV2
    quaternion: SourceMotionGatedErrorMetricV2
    scale: {
      unit: 'dimensionless'
      sourceExcursion: number
      axes: Record<'x' | 'y' | 'z', SourceMotionGatedScaleAxisMetricV2>
    }
  }
)

export type SourceMotionTrackDispositionV2 = 'preserved-glb' | 'exact-static' | 'bounded-source-to-static' | 'unresolved'
export type SourceMotionTrackDispositionV3 = SourceMotionTrackDispositionV2 | 'exact-static-channel' | 'bounded-source-to-glb-channel'
export type SourceMotionProofStatusV2 = 'static' | 'outside-subtree-untargeted' | 'unresolved'

export type SourceMotionProofTrackV2 = {
  curveIndex: number
  bindingPathHash: number
  pathTokens: string[] | null
  sourceTransformReference: SourceReference | null
  component: string
  property: string
  bindingKind: string
  sourceKind: string
  sampleCount: number
  valuesSha256: string
  valueClass: 'constant' | 'dynamic' | 'unresolved'
  disposition: SourceMotionTrackDispositionV2
  sourceCurves: SourceMotionComponentCurveV2[]
  sourceTarget: SourceMotionSourceTargetV2 | null
  glbChannels: SourceMotionGlbChannelV2[]
  sampleEvidence: SourceMotionSampleV2[]
  comparison: SourceMotionComparisonV2
}

export type SourceMotionProofTrackV3 = Omit<SourceMotionProofTrackV2, 'disposition'> & {
  disposition: SourceMotionTrackDispositionV3
}

export type SourceMotionScopeTransformV2 = {
  roles: string[]
  sourceReference: SourceReference
  name: string
  path: { name: string; sourceReference: SourceReference }[]
  pathSha256: string
  animatorRelation: SourceMotionScopeRelationV2
  animationPathTokens: string[]
  glbNodeIndex: number
}

export type SourceMotionAnimatorV2 = {
  componentReference: SourceReference
  rootReference: SourceReference
  path: { name: string; sourceReference: SourceReference }[]
  controllerReference: SourceReference
  controllerGraph: {
    complete: boolean
    references: SourceReference[]
    clipReferences: SourceReference[]
    effectiveClipReferences: SourceReference[]
    sha256: string
  }
  selectedClipReference: SourceReference
  matchingAnimatorCount: number
  matchingClipCount: number
}

export type SourceMotionProofRowV2 = {
  studentId: number
  sourceIdentity: string
  asset: { assetId: string; revision: string; sha256: string }
  profileSha256: string
  renderer: { sourceKey: string; sourceReference: SourceReference }
  action: ActionPair
  selectedPrefab: { path: string; sourceReference: SourceReference; rootTransformReference: SourceReference }
  animator: SourceMotionAnimatorV2
  sourceClip: { name: string; sourceReference: SourceReference }
  sourceClipRange: { startTimeSec: number; stopTimeSec: number }
  proofStatus: SourceMotionProofStatusV2
  scopeTransforms: SourceMotionScopeTransformV2[]
  curveSet: {
    complete: boolean
    coverageStatus: 'complete' | 'incomplete'
    totalBindingCount: number
    relevantTrackCount: number
    unresolvedRelevantCount: number
    genericBindingCount: number
    directCurveCount: number
    decoderDiagnostics: string[]
    sha256: string
  }
  tracks: SourceMotionProofTrackV2[]
  diagnosticCodes: string[]
}

export type SourceMotionProofRowV3 = Omit<SourceMotionProofRowV2, 'tracks'> & {
  tracks: SourceMotionProofTrackV3[]
}

export type SourceMotionProofDocumentV2 = {
  schemaVersion: typeof CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION_V2
  kind: 'chibi-v12-source-motion-proof'
  policyVersion: typeof CHIBI_V12_MOTION_PROOF_POLICY_VERSION_V2
  generatedAt: string
  databaseName: string
  jobId: string
  terminalSidecar: { sha256: string; rowCount: number }
  structuralSweep: { sha256: string; rowCount: number; selector: string }
  sourceInventory: { sha256: string; metadataReader: string }
  sourceBundleSetSha256: string
  fiveBusinessDigests: Record<string, { rows: number; sha256: string }>
  rows: SourceMotionProofRowV2[]
  reportSha256: string
}

export type SourceMotionProofDocumentV3 = Omit<SourceMotionProofDocumentV2, 'schemaVersion' | 'policyVersion' | 'rows'> & {
  schemaVersion: typeof CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION
  policyVersion: typeof CHIBI_V12_MOTION_PROOF_POLICY_VERSION
  rows: SourceMotionProofRowV3[]
}

export type ActionPair = { id: string; clip: string }

type JsonRecord = Record<string, any>

export function canonicalJson(value: unknown): string {
  const normalize = (item: any): any => {
    if (Array.isArray(item)) return item.map(normalize)
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize(item[key])]))
    }
    return item
  }
  return JSON.stringify(normalize(value))
}

export function sha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex')
}

export function canonicalReportSha256(document: JsonRecord) {
  const { generatedAt: _generatedAt, reportSha256: _reportSha256, ...content } = document
  return sha256(canonicalJson(content))
}

export function canonicalPathSha256(path: readonly { name: string; sourceReference: SourceReference }[]) {
  return sha256(canonicalJson(path))
}

export function matchesScopedAnimationPath(bindingPathTokens: unknown, scopePathTokens: unknown) {
  return Array.isArray(bindingPathTokens) && Array.isArray(scopePathTokens)
    && bindingPathTokens.length === scopePathTokens.length
    && bindingPathTokens.every((token, index) => token === scopePathTokens[index])
}

export function sourceReferenceKey(reference: SourceReference) {
  return `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
}

export function findExactScopeTransform<T extends { sourceReference: SourceReference }>(
  records: readonly T[],
  reference: SourceReference,
) {
  return records.find(record => sourceReferenceKey(record.sourceReference) === sourceReferenceKey(reference))
}

export function actionPairs(actionProfile: unknown): ActionPair[] {
  if (!actionProfile || typeof actionProfile !== 'object' || Array.isArray(actionProfile)) return []
  const profile = actionProfile as JsonRecord
  const pairs: ActionPair[] = []
  if (typeof profile.initialPose === 'string' && profile.initialPose) pairs.push({ id: 'initialPose', clip: profile.initialPose })
  if (profile.interactions && typeof profile.interactions === 'object' && !Array.isArray(profile.interactions)) {
    for (const id of Object.keys(profile.interactions).sort()) {
      const interaction = profile.interactions[id]
      if (interaction && typeof interaction === 'object' && !Array.isArray(interaction)
        && interaction.state === 'available' && typeof interaction.clip === 'string' && interaction.clip) {
        pairs.push({ id, clip: interaction.clip })
      }
    }
  }
  return pairs
}

export function selectZeroMotionFailures(rows: readonly JsonRecord[]) {
  return rows
    .filter(row => row?.failure?.category === 'structural-action-no-nonzero-delta')
    .map(row => ({
      studentId: row.studentId,
      sourceIdentity: row.sourceIdentity,
      assetId: row.assetId,
      sha256: row.sha256,
      rendererSourceKey: row.failure.rendererSourceKey,
      clip: row.failure.actionClip,
    }))
    .sort((left, right) => left.studentId - right.studentId
      || String(left.rendererSourceKey).localeCompare(String(right.rendererSourceKey))
      || String(left.clip).localeCompare(String(right.clip)))
}

export function classifyScalarValues(values: readonly number[], tolerance = 1e-6): 'constant' | 'dynamic' | 'unresolved' {
  if (!values.length || !values.every(Number.isFinite)) return 'unresolved'
  const first = values[0]
  return values.some(value => Math.abs(value - first) > tolerance) ? 'dynamic' : 'constant'
}

export function classifyTrackCoverage(input: {
  complete: boolean
  scopeReferenceKeys: ReadonlySet<string>
  tracks: readonly { bindingKind: 'transform' | 'other' | 'renderer'; sourceTransformReference?: SourceReference | null; valueClass: 'constant' | 'dynamic' | 'unresolved'; glbChannels: readonly unknown[] }[]
}) {
  let unresolvedRelevantCount = 0
  let relevantDynamicCount = 0
  let unmappedDynamicCount = 0
  for (const track of input.tracks) {
    if (track.bindingKind !== 'transform') continue
    const sourceKey = track.sourceTransformReference ? sourceReferenceKey(track.sourceTransformReference) : ''
    const relevant = !sourceKey || input.scopeReferenceKeys.has(sourceKey)
    if (relevant && track.valueClass === 'unresolved') unresolvedRelevantCount += 1
    if (relevant && track.valueClass === 'dynamic') relevantDynamicCount += 1
    if (track.valueClass === 'dynamic' && track.glbChannels.length === 0) unmappedDynamicCount += 1
  }
  const proofStatus = !input.complete || unresolvedRelevantCount > 0 || unmappedDynamicCount > 0
    ? 'unresolved'
    : relevantDynamicCount > 0 ? 'dynamic' : 'static'
  const diagnosticCodes: string[] = []
  if (!input.complete) diagnosticCodes.push('SOURCE_CURVE_COVERAGE_INCOMPLETE')
  if (unresolvedRelevantCount > 0) diagnosticCodes.push('SOURCE_TRANSFORM_BINDING_UNRESOLVED')
  if (relevantDynamicCount > 0) diagnosticCodes.push('RELEVANT_SOURCE_TRANSFORM_DYNAMIC')
  if (unmappedDynamicCount > 0) diagnosticCodes.push('DYNAMIC_SOURCE_TRANSFORM_UNMAPPED_TO_GLB')
  return { proofStatus, unresolvedRelevantCount, diagnosticCodes, relevantDynamicCount, unmappedDynamicCount }
}
