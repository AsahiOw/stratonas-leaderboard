import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'
import {
  actionPairs,
  canonicalJson,
  canonicalReportSha256,
  CHIBI_V12_MOTION_GATES,
  CHIBI_V12_MOTION_PROOF_MATERIALITY_POLICY,
  CHIBI_V12_MOTION_PROOF_OUTPUT_NAME,
  CHIBI_V12_MOTION_PROOF_POLICY_VERSION,
  CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION,
  findExactScopeTransform,
  selectZeroMotionFailures,
  sha256,
  sourceReferenceKey,
  type SourceMotionProofDocumentV3,
  type SourceMotionComparisonV2,
  type SourceMotionProofRowV3,
  type SourceMotionProofTrackV3,
  type SourceMotionSourceTargetV2,
  type SourceMotionScopeRelationV2,
  type SourceMotionTransformV2,
  type SourceMotionChannelTimingV3,
  type SourceReference,
} from './chibi-v12-motion-proof-core'
import { parseV12GlbBytes, readNodeBaseTrs, sampleAnimationAtTimes, type V12Glb } from './chibi-v12-motion-glb'
import { verifyApprovedHanaeBodyRoleWitness } from './chibi-v12-body-role-witness'
import {
  V12_BASELINE_SHA256,
  V12_DATABASE_NAME,
  V12_JOB_ID,
  deriveIsolatedV12Url,
  runTwoPassPreguard,
} from './v12-readonly-preguard-20260926.mjs'

const { Client } = pg
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUN_ROOT = String.raw`D:\Temp\stratonas-chibi-v12-full-acceptance-20260925-6d18e6c8`
const EVIDENCE_ROOT = path.join(RUN_ROOT, 'evidence')
const DATA_ROOT = path.join(RUN_ROOT, 'data')
const SOURCE_ROOT = String.raw`D:\Temp\stratonas-chibi-v7-full-20260923-8c41f9\BAAD-readonly`
const TOOLS_ROOT = String.raw`D:\Temp\stratonas-chibi-v11-full-20260924\tools`
const PYTHON_PATH = path.join(TOOLS_ROOT, 'python', 'Scripts', 'python.exe')
const SIDECAR_PATH = path.join(EVIDENCE_ROOT, 'visual', 'terminal-reconciled-roster.json')
const SIDECAR_SHA256 = '5c94f37650d8744a8c380eef1cd009ad5d63172a34ede34513fea7c49892cdcf'
const SWEEP_PATH = path.join(EVIDENCE_ROOT, 'chibi-v12-structural-sweep-v1-20260926.json')
const SWEEP_SHA256 = 'ad324ea0d3c98361048006f08d45343b34f75a2e975ec3d619382cb649c4e603'
const INDEX_PATH = path.join(DATA_ROOT, 'index', 'inventory.raw.json')
const INVENTORY_SHA256 = '9503a9218b6ebd3ce91c7b6317a0610c5f0f46332d1d70dbf1b04e0feb20d242'
const METADATA_READER = '1.25.3+render-profile-v7-projectmx-weapon-e-standard-glitch-tex-matcap-additive-alpha-blend-add-equipment-renderer-references-v5'
const OUTPUT_PATH = path.join(EVIDENCE_ROOT, CHIBI_V12_MOTION_PROOF_OUTPUT_NAME)
const HELPER_PATH = path.join(PROJECT_ROOT, 'scripts', 'chibi_v12_motion_proof_unitypy.py')
const SELECTOR = 'rows with category structural-action-no-nonzero-delta, independently rechecked as zero by GLB channel sampling'
const FIVE_BUSINESS_DIGESTS = {
  ChibiAsset: { rows: 238, sha256: '14ba4af2770a755fbe0d9b1c106420f43d787ac9bcfc72e6b2f3f0ab9f837aaa' },
  StudentChibiBinding: { rows: 238, sha256: '7000ca47f1cd309a2371558cd883f826531e3d80c5945ab84b656f1d57c5af30' },
  ChibiImportJob: { rows: 1, sha256: '73e11bf553720f74678ebe99609b7bf4b5b405858027570f3d218c78b4810ed2' },
  ChibiImportItem: { rows: 275, sha256: '1434e4a15447d0ec97c0da1062bb22642d679597f5143ead658205c0c0ba5df5' },
  ChibiSourceCandidate: { rows: 871, sha256: '72bb9ffeeb89972f7bc541e3778f599df58c85e86606d9726183260332b4b385' },
}

type JsonRecord = Record<string, any>
type Candidate = {
  failure: JsonRecord
  expected: JsonRecord
  binding: JsonRecord
  profile: JsonRecord
  sourcePrefab: JsonRecord
  assembly: JsonRecord
  assemblyRenderer: JsonRecord
  coreRenderer: JsonRecord
  glb: JsonRecord
  binary: Buffer
  glbArtifact: V12Glb
  bodyHeightEvidence?: NonNullable<SourceMotionComparisonV2['modelHeightEvidence']>
  actions: { id: string; clip: string }[]
  scopeTargets: JsonRecord[]
}

const safeError = (error: unknown) => String(error instanceof Error ? error.message : error)
  .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted database URL]')

function equalSourceReference(left: unknown, right: unknown, label: string) {
  assert.equal(sourceReferenceKey(left as SourceReference), sourceReferenceKey(right as SourceReference), label)
}

export function glbTransformSampleCacheKey(nodeIndex: number, times: readonly number[]) {
  assert.ok(Number.isInteger(nodeIndex) && nodeIndex >= 0, 'GLB sample cache node index is invalid.')
  assert.ok(times.every(time => Number.isFinite(time) && time >= 0), 'GLB sample cache times are invalid.')
  return canonicalJson([nodeIndex, [...new Set(times)].sort((left, right) => left - right)])
}

function makeSourceReferenceKey(reference: SourceReference) {
  return `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
}

function unityPathHash(pathTokens: readonly string[]) {
  let crc = 0xffffffff
  for (const byte of Buffer.from(pathTokens.join('/'), 'utf8')) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function sourceProfile(glb: JsonRecord, studentId: number) {
  const sceneIndex = Number.isInteger(glb.scene) ? glb.scene : 0
  const profile = glb.scenes?.[sceneIndex]?.extras?.chibi?.renderingProfile
  assert.ok(profile && typeof profile === 'object' && !Array.isArray(profile), `Student ${studentId} GLB has no embedded rendering profile.`)
  return profile as JsonRecord
}

function referenceFrom(pointer: JsonRecord, label: string): SourceReference {
  assert.ok(pointer && typeof pointer === 'object' && !Array.isArray(pointer), `${label} is not a source pointer.`)
  assert.ok(pointer.sourceReference && typeof pointer.sourceReference === 'object', `${label} has no exact sourceReference.`)
  return pointer.sourceReference as SourceReference
}

function ensureArtifactKey(fileKey: unknown, dataRoot: string, studentId: number) {
  assert.ok(typeof fileKey === 'string' && fileKey && !fileKey.startsWith('/') && !fileKey.includes('\\') && !fileKey.includes(':'), `Student ${studentId} published asset key is unsafe.`)
  assert.ok(fileKey.split('/').every((part: string) => part && part !== '.' && part !== '..'), `Student ${studentId} published asset key is not normalized.`)
  const file = path.resolve(dataRoot, ...fileKey.split('/'))
  const relative = path.relative(dataRoot, file)
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Student ${studentId} published asset escapes the pinned v12 data root.`)
  return file
}

async function readPinnedFile(file: string, expectedSha256: string, label: string) {
  const before = await lstat(file)
  assert.ok(before.isFile() && !before.isSymbolicLink() && before.nlink <= 1, `${label} must be a private regular file.`)
  const bytes = await readFile(file)
  const after = await lstat(file)
  assert.ok(after.isFile() && !after.isSymbolicLink() && after.nlink <= 1, `${label} changed type while being read.`)
  assert.equal(after.size, bytes.length, `${label} changed size while being read.`)
  assert.equal(after.mtimeMs, before.mtimeMs, `${label} changed while being read.`)
  assert.equal(sha256(bytes), expectedSha256, `${label} bytes differ from the pinned v12 digest.`)
  return bytes
}

function runPython(request: JsonRecord) {
  const result = spawnSync(PYTHON_PATH, [HELPER_PATH], {
    input: JSON.stringify(request), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  })
  if (result.error) throw new Error('Pinned source-motion helper could not be started.')
  let output: JsonRecord
  try { output = JSON.parse(result.stdout || '{}') } catch { throw new Error('Pinned source-motion helper returned invalid JSON.') }
  if (result.status !== 0 || output.error) {
    const code = typeof output.error === 'string' ? output.error : 'SOURCE_MOTION_HELPER_FAILED'
    const stage = typeof output.stage === 'string' && /^[a-z0-9_]{1,48}$/.test(output.stage) ? output.stage : 'unknown'
    const message = typeof output.message === 'string' && /^[A-Z0-9_]{1,64}$/.test(output.message) ? output.message : 'UNCLASSIFIED_HELPER_FAILURE'
    throw new Error(`Pinned source-motion helper failed closed (${stage}:${code}:${message}).`)
  }
  return output
}

function makeScopeTargets(assemblyRenderer: JsonRecord, prefabReference: SourceReference) {
  const targets = new Map<string, { sourceReference: SourceReference; roles: Set<string> }>()
  const add = (pointer: JsonRecord, role: string, label: string) => {
    const sourceReference = referenceFrom(pointer, label)
    assert.equal(sourceReference.bundleSha256.toLowerCase(), prefabReference.bundleSha256.toLowerCase(), `${label} is not in the selected prefab bundle.`)
    assert.equal(sourceReference.serializedFile.toLowerCase(), prefabReference.serializedFile.toLowerCase(), `${label} crosses the selected prefab serialized-file identity.`)
    const key = makeSourceReferenceKey(sourceReference)
    const row = targets.get(key) ?? { sourceReference, roles: new Set<string>() }
    row.roles.add(role)
    targets.set(key, row)
  }

  assert.ok(Array.isArray(assemblyRenderer.transformChain) && assemblyRenderer.transformChain.length > 0, 'Structural renderer has no exact transformChain.')
  assemblyRenderer.transformChain.forEach((pointer: JsonRecord, index: number) =>
    add(pointer, index === assemblyRenderer.transformChain.length - 1 ? 'renderer' : 'ancestor', `transformChain[${index}]`))
  assert.ok(assemblyRenderer.rootBoneAncestryComplete === true && Array.isArray(assemblyRenderer.rootBoneAncestry) && assemblyRenderer.rootBoneAncestry.length > 0, 'Structural renderer has incomplete rootBoneAncestry.')
  assemblyRenderer.rootBoneAncestry.forEach((pointer: JsonRecord, index: number) => add(pointer, 'rootBoneAncestry', `rootBoneAncestry[${index}]`))
  assert.ok(assemblyRenderer.rootBone && typeof assemblyRenderer.rootBone === 'object', 'Structural renderer has no exact rootBone pointer.')
  add(assemblyRenderer.rootBone, 'rootBone', 'rootBone')
  assert.ok(Array.isArray(assemblyRenderer.boneReferences) && assemblyRenderer.boneReferences.length > 0, 'Structural renderer has no exact skin-joint source references.')
  assemblyRenderer.boneReferences.forEach((pointer: JsonRecord, index: number) => add(pointer, 'skinJoint', `boneReferences[${index}]`))
  return [...targets.values()].map(item => ({ sourceReference: item.sourceReference, roles: [...item.roles].sort() }))
}

function mapNodePath(glb: JsonRecord, rootIndex: number, tokens: readonly string[]) {
  const nodes: JsonRecord[] = Array.isArray(glb.nodes) ? glb.nodes : []
  let current = rootIndex
  for (const token of tokens) {
    const children = Array.isArray(nodes[current]?.children) ? nodes[current].children as number[] : []
    const matches = children.filter(child => nodes[child]?.name === token)
    if (matches.length !== 1) return null
    current = matches[0]
  }
  return current
}

function relationToAnimator(sourcePath: readonly JsonRecord[], animatorPath: readonly JsonRecord[]): SourceMotionScopeRelationV2 {
  const sourceKeys = sourcePath.map(item => makeSourceReferenceKey(item.sourceReference))
  const animatorKeys = animatorPath.map(item => makeSourceReferenceKey(item.sourceReference))
  const startsWith = (value: readonly string[], prefix: readonly string[]) =>
    value.length >= prefix.length && prefix.every((part, index) => value[index] === part)
  if (startsWith(sourceKeys, animatorKeys)) return 'inside-animator-subtree'
  if (startsWith(animatorKeys, sourceKeys)) return 'ancestor-of-animator-root'
  if (sourceKeys.length > 0 && animatorKeys.length > 0 && sourceKeys[0] === animatorKeys[0]) return 'disjoint'
  return 'unresolved'
}

function expandScopeTransforms(helper: JsonRecord, profileRenderer: JsonRecord, rendererTransformReference: SourceReference, glb: JsonRecord, rootIndex: number, rootTransformReference: SourceReference): SourceMotionProofRowV3['scopeTransforms'] {
  const direct = Array.isArray(helper.scopeTransforms) ? helper.scopeTransforms as JsonRecord[] : []
  assert.ok(direct.length > 0, 'Source helper returned no exact renderer/skin scope transforms.')
  const animatorPath = Array.isArray(helper.animatorRootPath) ? helper.animatorRootPath as JsonRecord[] : []
  assert.ok(animatorPath.length > 0, 'Source helper returned no exact Animator hierarchy path.')
  equalSourceReference(animatorPath[0].sourceReference, rootTransformReference, 'Source Animator hierarchy does not begin at the selected prefab root Transform.')
  const records = new Map<string, JsonRecord>()
  for (const target of direct) {
    const pathTokens = target.path as JsonRecord[]
    assert.ok(Array.isArray(pathTokens) && pathTokens.length > 0, 'Source helper returned an empty transform path.')
    const reference = target.sourceReference as SourceReference
    const refKey = makeSourceReferenceKey(reference)
    const glbNodeIndex = mapNodePath(glb, rootIndex, pathTokens.slice(1).map(item => item.name))
    assert.notEqual(glbNodeIndex, null, 'Exact source renderer/skin path is absent or ambiguous in the terminal GLB hierarchy.')
    const roles = new Set<string>(Array.isArray(target.roles) ? target.roles : [])
    for (let index = 0; index < pathTokens.length; index += 1) {
      const part = pathTokens[index]
      const partKey = makeSourceReferenceKey(part.sourceReference)
      const sourcePath = pathTokens.slice(0, index + 1)
      const nodeIndex = mapNodePath(glb, rootIndex, sourcePath.slice(1).map(item => item.name))
      assert.notEqual(nodeIndex, null, 'Exact source ancestor path is absent or ambiguous in the terminal GLB hierarchy.')
      const relation = relationToAnimator(sourcePath, animatorPath)
      const animationPathTokens = relation === 'inside-animator-subtree'
        ? sourcePath.slice(animatorPath.length).map(item => item.name)
        : []
      const rolesForPart = partKey === refKey ? roles : new Set<string>()
      if (!rolesForPart.size) rolesForPart.add('ancestor')
      const prior = records.get(partKey)
      const mergedRoles = new Set<string>([...(prior?.roles ?? []), ...rolesForPart])
      const record = {
        roles: [...mergedRoles].sort(),
        sourceReference: part.sourceReference,
        name: part.name,
        path: sourcePath,
        pathSha256: sha256(canonicalJson(sourcePath)),
        animatorRelation: relation,
        animationPathTokens,
        glbNodeIndex: nodeIndex,
      }
      if (prior) assert.equal(prior.pathSha256, record.pathSha256, 'Source helper returned inconsistent paths for one transform identity.')
      records.set(partKey, record)
    }
  }
  const result = [...records.values()].sort((left, right) => makeSourceReferenceKey(left.sourceReference).localeCompare(makeSourceReferenceKey(right.sourceReference)))
  const renderer = findExactScopeTransform(result as Array<JsonRecord & { sourceReference: SourceReference }>, rendererTransformReference)
  assert.ok(renderer, 'Expanded source scope omitted the exact structural renderer Transform.')
  assert.equal(renderer.glbNodeIndex, profileRenderer.glbNodeIndex, 'Source renderer path maps to a different GLB renderer node.')
  return result as SourceMotionProofRowV3['scopeTransforms']
}

function mapAnimationChannels(glb: JsonRecord, animation: JsonRecord, targetNode: number, property: 'translation' | 'rotation' | 'scale'): SourceMotionProofTrackV3['glbChannels'] {
  const channels = Array.isArray(animation.channels) ? animation.channels as JsonRecord[] : []
  const samplers = Array.isArray(animation.samplers) ? animation.samplers as JsonRecord[] : []
  return channels.flatMap((channel, channelIndex) => {
    const samplerIndex = channel.sampler
    const sampler = Number.isInteger(samplerIndex) ? samplers[samplerIndex] : null
    if (channel.target?.node !== targetNode || channel.target?.path !== property || !sampler) return []
    return [{ animationName: animation.name, channelIndex, samplerIndex, targetNodeIndex: targetNode, targetPath: property }]
  })
}

export function nearestSamplerTiming(sourceTimes: readonly number[], glbTimes: readonly number[], clipRange: { startTimeSec: number; stopTimeSec: number }): SourceMotionChannelTimingV3 {
  assert.ok(Number.isFinite(clipRange.startTimeSec) && Number.isFinite(clipRange.stopTimeSec)
    && clipRange.startTimeSec >= 0 && clipRange.stopTimeSec >= clipRange.startTimeSec, 'Source clip timing range is invalid.')
  assert.ok(glbTimes.length > 0 && glbTimes.every((time, index) => Number.isFinite(time) && time >= 0
    && (index === 0 || time > glbTimes[index - 1])), 'GLB sampler times must be strictly increasing non-negative values.')
  assert.ok(sourceTimes.every(time => Number.isFinite(time) && time >= clipRange.startTimeSec && time <= clipRange.stopTimeSec), 'Source key timing falls outside its clip range.')
  const timingPoints = [...new Set([clipRange.startTimeSec, ...sourceTimes, clipRange.stopTimeSec])].sort((left, right) => left - right)
  assert.ok(timingPoints.length > 0, 'Source clip has no key or endpoint timing evidence.')
  const offsets = timingPoints.map(sourceTime => {
    const distances = glbTimes.map(glbTime => Math.abs(glbTime - sourceTime))
    const nearestDistance = Math.min(...distances)
    assert.equal(distances.filter(distance => distance === nearestDistance).length, 1, 'Source key/endpoint has an ambiguous nearest GLB sampler input.')
    return (glbTimes[distances.indexOf(nearestDistance)] - sourceTime) * 1000
  })
  return {
    maxAbsDeltaMs: Math.max(...offsets.map(Math.abs)),
    cumulativeDriftMs: offsets.at(-1)! - offsets[0],
  }
}

export function readGlbSamplerInputTimes(glb: V12Glb, animation: JsonRecord, samplerIndex: number): number[] {
  const sampler = (animation.samplers as JsonRecord[] | undefined)?.[samplerIndex]
  assert.ok(sampler, 'Mapped GLB sampler is missing.')
  const accessorIndex = sampler.input
  const accessor = glb.gltf.accessors?.[accessorIndex]
  assert.ok(accessor && typeof accessor === 'object' && !Array.isArray(accessor), 'Mapped GLB sampler input accessor is missing.')
  assert.equal(accessor.sparse, undefined, 'Sparse GLB sampler input accessors are unsupported for timing proof.')
  assert.equal(accessor.type, 'SCALAR', 'Mapped GLB sampler input accessor is not SCALAR.')
  assert.equal(accessor.componentType, 5126, 'Mapped GLB sampler input accessor is not float32.')
  assert.notEqual(accessor.normalized, true, 'Mapped GLB sampler input accessor cannot be normalized.')
  assert.ok(Number.isInteger(accessor.count) && accessor.count > 0, 'Mapped GLB sampler input accessor count is invalid.')
  assert.ok(Number.isInteger(accessor.bufferView), 'Mapped GLB sampler input accessor bufferView is invalid.')
  const view = glb.gltf.bufferViews?.[accessor.bufferView]
  assert.ok(view && typeof view === 'object' && !Array.isArray(view), 'Mapped GLB sampler input bufferView is missing.')
  assert.equal(view.buffer, 0, 'Mapped GLB sampler input does not use the embedded GLB BIN chunk.')
  const viewOffset = Number(view.byteOffset ?? 0)
  const accessorOffset = Number(accessor.byteOffset ?? 0)
  const stride = Number(view.byteStride ?? 4)
  assert.ok(Number.isInteger(view.byteLength) && Number.isInteger(viewOffset) && viewOffset >= 0
    && Number.isInteger(accessorOffset) && accessorOffset >= 0 && Number.isInteger(stride) && stride >= 4 && stride % 4 === 0,
  'Mapped GLB sampler input accessor layout is invalid.')
  const viewEnd = viewOffset + view.byteLength
  const lastEnd = viewOffset + accessorOffset + (accessor.count - 1) * stride + 4
  assert.ok(viewEnd <= glb.binary.length && lastEnd <= viewEnd, 'Mapped GLB sampler input accessor exceeds its bufferView.')
  const data = new DataView(glb.binary.buffer, glb.binary.byteOffset, glb.binary.byteLength)
  return Array.from({ length: accessor.count }, (_, index) => {
    const time = data.getFloat32(viewOffset + accessorOffset + index * stride, true)
    assert.ok(Number.isFinite(time), 'Mapped GLB sampler input contains a non-finite time.')
    return time
  })
}

export function mappedChannelTiming(
  glb: V12Glb,
  animation: JsonRecord,
  channel: SourceMotionProofTrackV3['glbChannels'][number],
  sourceCurves: SourceMotionProofTrackV3['sourceCurves'],
  clipRange: { startTimeSec: number; stopTimeSec: number },
) {
  const sourceTimes = sourceCurves.flatMap(curve => curve.keys.map(key => key.time))
  return nearestSamplerTiming(sourceTimes, readGlbSamplerInputTimes(glb, animation, channel.samplerIndex), clipRange)
}

export function mappedChannelPropertyIsStatic(
  glb: V12Glb,
  animation: JsonRecord,
  animationIndex: number,
  channel: SourceMotionProofTrackV3['glbChannels'][number],
  property: 'translation' | 'rotation' | 'scale',
  propertyAxis: number | null,
) {
  const times = readGlbSamplerInputTimes(glb, animation, channel.samplerIndex)
  const samples = sampleAnimationAtTimes(glb, { animationIndex, nodeIndex: channel.targetNodeIndex, times })
  if (samples.length === 0) return false
  const first = {
    translation: samples[0].translation as [number, number, number],
    rotation: samples[0].rotation as [number, number, number, number],
    scale: samples[0].scale as [number, number, number],
  }
  return samples.every(sample => withinStaticChannelRounding(first, {
    translation: sample.translation as [number, number, number],
    rotation: sample.rotation as [number, number, number, number],
    scale: sample.scale as [number, number, number],
  }, property, propertyAxis))
}

function sameSerializedVector(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => Math.fround(value) === Math.fround(right[index]))
}

function sameSerializedProperty(left: SourceMotionTransformV2, right: SourceMotionTransformV2, property: 'translation' | 'rotation' | 'scale') {
  if (property === 'rotation') {
    const q1 = left.rotation.map(Math.fround)
    const q2 = right.rotation.map(Math.fround)
    return q1.every((value, index) => value === q2[index]) || q1.every((value, index) => value === -q2[index])
  }
  return sameSerializedVector(left[property], right[property])
}

function withinStaticChannelRounding(
  left: SourceMotionTransformV2,
  right: SourceMotionTransformV2,
  property: 'translation' | 'rotation' | 'scale',
  axis: number | null = null,
) {
  if (property === 'rotation') {
    const dot = Math.abs(left.rotation.reduce((sum, value, index) => sum + value * right.rotation[index], 0))
    return 2 * Math.acos(Math.max(-1, Math.min(1, dot))) <= 1e-7
  }
  const indices = axis === null ? left[property].map((_, index) => index) : [axis]
  return indices.every(index => Math.abs(left[property][index] - right[property][index]) <= 1e-7)
}

function transformDistance(left: SourceMotionTransformV2, right: SourceMotionTransformV2) {
  const translationError = Math.hypot(...left.translation.map((value, index) => value - right.translation[index]))
  const dot = Math.abs(left.rotation.reduce((sum, value, index) => sum + value * right.rotation[index], 0))
  const rotationError = 2 * Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI
  const scaleErrors = left.scale.map((value, index) => Math.abs(value - right.scale[index]))
  return { translationError, rotationError, scaleErrors }
}

function sourceExcursion(samples: readonly SourceMotionTransformV2[], selector: (sample: SourceMotionTransformV2) => readonly number[]) {
  let maximum = 0
  for (let left = 0; left < samples.length; left += 1) {
    for (let right = left + 1; right < samples.length; right += 1) {
      const first = selector(samples[left])
      const second = selector(samples[right])
      maximum = Math.max(maximum, Math.hypot(...first.map((value, index) => value - second[index])))
    }
  }
  return maximum
}

function quaternionExcursion(samples: readonly SourceMotionTransformV2[]) {
  let maximum = 0
  for (let left = 0; left < samples.length; left += 1) {
    for (let right = left + 1; right < samples.length; right += 1) {
      const dot = Math.abs(samples[left].rotation.reduce((sum, value, index) => sum + value * samples[right].rotation[index], 0))
      maximum = Math.max(maximum, 2 * Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI)
    }
  }
  return maximum
}

export function comparisonForSamples(samples: SourceMotionProofTrackV3['sampleEvidence'], channelTiming?: SourceMotionChannelTimingV3): SourceMotionComparisonV2 {
  const exactMetric = (unit: 'glb-model-units' | 'degrees'): Extract<SourceMotionComparisonV2['translation'], { gate: null }> => ({
    unit, sourceExcursion: 0, gate: null, maxKeyError: null, maxMidpointError: null,
    maxCubicExtremumError: null, maxSampleError: 0, errorGateRatio: null,
  })
  const source = samples.map(sample => sample.source)
  const errors = samples.map(sample => ({ sample, ...transformDistance(sample.source, sample.glb) }))
  const maximumFor = (kind: 'key' | 'midpoint' | 'cubic-extremum', metric: 'translationError' | 'rotationError', axis?: number) => {
    const matching = errors.filter(row => row.sample.kind === kind)
    return matching.length
      ? matching.reduce((max, row) => Math.max(max, axis === undefined ? row[metric] : row.scaleErrors[axis]), 0)
      : null
  }
  type ExactScaleAxis = {
    sourceMagnitude: number
    gate: null
    maxKeyError: number | null
    maxMidpointError: number | null
    maxCubicExtremumError: number | null
    maxSampleError: number
    errorGateRatio: null
  }
  const scaleAxes = Object.fromEntries((['x', 'y', 'z'] as const).map((axis, index) => [axis, {
      sourceMagnitude: source.reduce((max, sample) => Math.max(max, Math.abs(sample.scale[index])), 0),
      gate: null as null,
      maxKeyError: maximumFor('key', 'translationError', index),
      maxMidpointError: maximumFor('midpoint', 'translationError', index),
      maxCubicExtremumError: maximumFor('cubic-extremum', 'translationError', index),
      maxSampleError: errors.reduce((max, row) => Math.max(max, row.scaleErrors[index]), 0),
      errorGateRatio: null as null,
    }])) as Record<'x' | 'y' | 'z', ExactScaleAxis>
  const translation = exactMetric('glb-model-units')
  translation.sourceExcursion = sourceExcursion(source, sample => sample.translation)
  translation.maxKeyError = maximumFor('key', 'translationError')
  translation.maxMidpointError = maximumFor('midpoint', 'translationError')
  translation.maxCubicExtremumError = maximumFor('cubic-extremum', 'translationError')
  translation.maxSampleError = errors.reduce((max, row) => Math.max(max, row.translationError), 0)
  const quaternion = exactMetric('degrees')
  quaternion.sourceExcursion = quaternionExcursion(source)
  quaternion.maxKeyError = maximumFor('key', 'rotationError')
  quaternion.maxMidpointError = maximumFor('midpoint', 'rotationError')
  quaternion.maxCubicExtremumError = maximumFor('cubic-extremum', 'rotationError')
  quaternion.maxSampleError = errors.reduce((max, row) => Math.max(max, row.rotationError), 0)
  const sign = (value: number) => value < 0 ? 'negative' : value > 0 ? 'positive' : 'zero'
  const scaleSignZeroTransitions: SourceMotionComparisonV2['scaleSignZeroTransitions'] = []
  for (const axis of ['x', 'y', 'z'] as const) {
    const index = ['x', 'y', 'z'].indexOf(axis)
    for (let cursor = 1; cursor < samples.length; cursor += 1) {
      const sourceTransition = `${sign(samples[cursor - 1].source.scale[index])}>${sign(samples[cursor].source.scale[index])}`
      const glbTransition = `${sign(samples[cursor - 1].glb.scale[index])}>${sign(samples[cursor].glb.scale[index])}`
      const sourceChanged = sourceTransition.split('>')[0] !== sourceTransition.split('>')[1]
      const glbChanged = glbTransition.split('>')[0] !== glbTransition.split('>')[1]
      if (sourceChanged || glbChanged) {
        scaleSignZeroTransitions.push({ axis, sourceTransition, glbTransition })
      }
    }
  }
  return {
    policyId: CHIBI_V12_MOTION_PROOF_MATERIALITY_POLICY,
    mode: 'exact-motion-accounting',
    modelHeightUnits: null,
    modelHeightEvidence: null,
    translation,
    quaternion,
    scale: {
      unit: 'dimensionless',
      sourceExcursion: Math.max(...(['x', 'y', 'z'] as const).map(axis => {
        const component = ['x', 'y', 'z'].indexOf(axis)
        const values = source.map(sample => sample.scale[component])
        return values.length ? Math.max(...values) - Math.min(...values) : 0
      }), 0),
      axes: scaleAxes,
    },
    timing: {
      applicable: channelTiming !== undefined,
      maxAbsDeltaMs: channelTiming?.maxAbsDeltaMs ?? null,
      gateMs: CHIBI_V12_MOTION_GATES.timingMaxMs,
      cumulativeDriftMs: channelTiming?.cumulativeDriftMs ?? null,
    },
    scaleSignZeroTransitions,
    visibilityChanges: false,
  }
}

export function policyGatedComparisonForSamples(
  samples: SourceMotionProofTrackV3['sampleEvidence'],
  modelHeightEvidence: NonNullable<SourceMotionComparisonV2['modelHeightEvidence']>,
  channelTiming?: SourceMotionChannelTimingV3,
): SourceMotionComparisonV2 {
  assert.ok(samples.length > 0, 'A policy-gated motion comparison needs source/GLB samples.')
  const exact = comparisonForSamples(samples, channelTiming)
  const modelHeightUnits = modelHeightEvidence.measurement.height
  const translationGate = Math.min(
    CHIBI_V12_MOTION_GATES.translationMaxHeightFraction * modelHeightUnits,
    CHIBI_V12_MOTION_GATES.translationBaseHeightFraction * modelHeightUnits
      + CHIBI_V12_MOTION_GATES.excursionFraction * exact.translation.sourceExcursion,
  )
  const quaternionGate = Math.min(
    CHIBI_V12_MOTION_GATES.quaternionMaxDegrees,
    CHIBI_V12_MOTION_GATES.quaternionBaseDegrees
      + CHIBI_V12_MOTION_GATES.excursionFraction * exact.quaternion.sourceExcursion,
  )
  assert.ok(translationGate > 0 && Number.isFinite(translationGate), 'Policy-gated translation threshold is invalid.')
  assert.ok(quaternionGate > 0 && Number.isFinite(quaternionGate), 'Policy-gated quaternion threshold is invalid.')
  type GatedScaleAxis = {
    unit: 'dimensionless'
    sourceMagnitude: number
    gate: number
    maxKeyError: number
    maxMidpointError: number
    maxCubicExtremumError: number
    maxSampleError: number
    errorGateRatio: number
  }
  const scaleAxes = Object.fromEntries((['x', 'y', 'z'] as const).map((axis, index) => {
    const metric = exact.scale.axes[axis]
    const sourceValues = samples.map(sample => sample.source.scale[index])
    const gate = Math.min(...sourceValues.map(value => Math.max(
      CHIBI_V12_MOTION_GATES.scaleAbsoluteFloor,
      CHIBI_V12_MOTION_GATES.scaleRelativeFraction * Math.abs(value),
    )))
    assert.ok(gate > 0 && Number.isFinite(gate), `Policy-gated ${axis}-scale threshold is invalid.`)
    return [axis, {
      ...metric,
      gate,
      errorGateRatio: metric.maxSampleError / gate,
    }]
  })) as Record<'x' | 'y' | 'z', GatedScaleAxis>
  return {
    ...exact,
    mode: 'policy-gated',
    modelHeightUnits,
    modelHeightEvidence,
    translation: {
      ...exact.translation,
      gate: translationGate,
      errorGateRatio: exact.translation.maxSampleError / translationGate,
    },
    quaternion: {
      ...exact.quaternion,
      gate: quaternionGate,
      errorGateRatio: exact.quaternion.maxSampleError / quaternionGate,
    },
    scale: { ...exact.scale, axes: scaleAxes },
  }
}

function convertTrackSourceCurves(track: JsonRecord): SourceMotionProofTrackV3['sourceCurves'] {
  const curves = Array.isArray(track.componentCurves) ? track.componentCurves : []
  return curves.map((curve: JsonRecord) => ({
    component: curve.component as 'x' | 'y' | 'z' | 'w',
    sourceKind: curve.sourceKind as 'streamed' | 'dense' | 'constant' | 'unresolved',
    initialValue: typeof curve.initialValue === 'number' && Number.isFinite(curve.initialValue) ? curve.initialValue : null,
    keys: (Array.isArray(curve.keys) ? curve.keys : []).map((key: JsonRecord) => ({
      time: key.time,
      value: key.value,
      coefficients: Array.isArray(key.coefficients) && key.coefficients.length === 4
        ? key.coefficients as [number, number, number, number] : null,
    })),
  }))
}

function hasExactSourcePathEndpoints(path: unknown, rootReference: SourceReference, targetReference: SourceReference): boolean {
  if (!Array.isArray(path) || path.length === 0) return false
  const first = path[0]?.sourceReference
  const last = path[path.length - 1]?.sourceReference
  const isReference = (value: unknown): value is SourceReference => Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof (value as JsonRecord).bundleSha256 === 'string'
    && typeof (value as JsonRecord).serializedFile === 'string'
    && typeof (value as JsonRecord).objectId === 'string'
  if (!isReference(first) || !isReference(last)) return false
  return makeSourceReferenceKey(first) === makeSourceReferenceKey(rootReference)
    && makeSourceReferenceKey(last) === makeSourceReferenceKey(targetReference)
}

export function sourceTargetForTrack(track: JsonRecord, rootIndex: number, rootReference: SourceReference, glb: JsonRecord, animatorPath: JsonRecord[]): SourceMotionSourceTargetV2 | null {
  const target = track.sourceTarget as JsonRecord | null
  if (!target || !Array.isArray(target.path) || target.path.length === 0 || !target.reference || !track.sourceTransformReference) return null
  const sourceReference = target.reference as SourceReference
  if (makeSourceReferenceKey(sourceReference) !== makeSourceReferenceKey(track.sourceTransformReference)) return null
  const path = target.path as SourceMotionSourceTargetV2['path']
  if (!hasExactSourcePathEndpoints(path, rootReference, sourceReference)) return null
  const pathSha256 = sha256(canonicalJson(path))
  if (target.pathSha256 !== pathSha256) return null
  const glbNodeIndex = mapNodePath(glb, rootIndex, path.slice(1).map(item => String(item.name)))
  if (glbNodeIndex === null) return null
  const relation = relationToAnimator(path, animatorPath)
  if (relation === 'unresolved') return null
  return {
    reference: sourceReference,
    path,
    pathSha256,
    animatorRelation: relation,
    glbNodeIndex,
    sourceLocalTrs: target.sourceLocalTrs as SourceMotionTransformV2,
  }
}

export function classifyV3TrackEvidence(input: {
  coverageComplete: boolean
  bindingKind: string
  targetResolved: boolean
  property: 'translation' | 'rotation' | 'scale' | null
  valueClass: 'constant' | 'dynamic' | 'unresolved'
  sourceCurves: SourceMotionProofTrackV3['sourceCurves']
  sampleEvidence: SourceMotionProofTrackV3['sampleEvidence']
  nodeDefault: SourceMotionTransformV2 | null
  hasMappedChannel: boolean
  mappedChannelCount?: number
  channelTiming?: SourceMotionChannelTimingV3
  mappedChannelPropertyStatic?: boolean
  propertyAxis?: number | null
  hasScaleSignZeroTransition: boolean
  hasUnsafeScaleValue?: boolean
  bodyHeightEvidence?: NonNullable<SourceMotionComparisonV2['modelHeightEvidence']>
  policyGatedComparison?: SourceMotionComparisonV2
}): { disposition: SourceMotionProofTrackV3['disposition']; diagnosticCodes: string[] } {
  const diagnostics: string[] = []
  const samples = input.sampleEvidence
  const sourceSamples = samples.map(sample => sample.source)
  const property = input.property
  const validTransform = (value: unknown) => Boolean(value && typeof value === 'object')
    && (['translation', 'scale'] as const).every(field => Array.isArray((value as JsonRecord)[field])
      && (value as JsonRecord)[field].length === 3
      && (value as JsonRecord)[field].every((component: unknown) => typeof component === 'number' && Number.isFinite(component)))
    && Array.isArray((value as JsonRecord).rotation)
    && (value as JsonRecord).rotation.length === 4
    && (value as JsonRecord).rotation.every((component: unknown) => typeof component === 'number' && Number.isFinite(component))
    && Math.hypot(...(value as JsonRecord).rotation) > 0
  let priorSampleTime = -Infinity
  const sampleKeys = new Set<string>()
  const samplesAreWellFormed = samples.length > 0 && samples.every(sample => {
    const valid = Number.isFinite(sample.timeSec) && sample.timeSec >= 0
      && ['key', 'midpoint', 'cubic-extremum'].includes(sample.kind)
      && sample.timeSec >= priorSampleTime
      && validTransform(sample.source)
      && validTransform(sample.glb)
      && !sampleKeys.has(`${sample.timeSec}:${sample.kind}`)
    priorSampleTime = sample.timeSec
    sampleKeys.add(`${sample.timeSec}:${sample.kind}`)
    return valid
  })
  const curvesAreResolved = input.sourceCurves.length > 0 && input.sourceCurves.every(curve =>
    ['x', 'y', 'z', 'w'].includes(curve.component)
    && ['streamed', 'dense', 'constant'].includes(curve.sourceKind)
    && Array.isArray(curve.keys)
    && curve.sourceKind !== 'unresolved'
    && (curve.initialValue === null || Number.isFinite(curve.initialValue))
    && curve.keys.every(key => Number.isFinite(key.time) && Number.isFinite(key.value)
      && (key.coefficients === null || key.coefficients.every(Number.isFinite)))
    && (curve.initialValue !== null || curve.keys.length > 0))
  const samplesMatchGlb = samplesAreWellFormed && Boolean(property)
    && samples.every(sample => sameSerializedProperty(sample.source, sample.glb, property!))
  const sourceIsConstant = samplesAreWellFormed
    && sourceSamples.length > 0
    && Boolean(property)
    && sourceSamples.every(sample => sameSerializedProperty(sample, sourceSamples[0], property!))
  const glbPropertyIsStatic = samplesAreWellFormed
    && samples.length > 0
    && Boolean(property)
    && samples.every(sample => withinStaticChannelRounding(sample.glb, samples[0].glb, property!))
  const nodeDefaultIsValid = validTransform(input.nodeDefault)
  const glbPropertyMatchesNodeDefault = nodeDefaultIsValid && Boolean(property)
    && samplesAreWellFormed
    && samples.every(sample => sameSerializedProperty(sample.glb, input.nodeDefault!, property!))
  const gatedComparison = input.policyGatedComparison
  let expectedGatedComparison: SourceMotionComparisonV2 | undefined
  if (input.bodyHeightEvidence && samplesAreWellFormed) {
    try {
      expectedGatedComparison = policyGatedComparisonForSamples(samples, input.bodyHeightEvidence, input.channelTiming)
    } catch {
      expectedGatedComparison = undefined
    }
  }
  const gatedComparisonIsRecomputed = expectedGatedComparison !== undefined
    && gatedComparison?.mode === 'policy-gated'
    && canonicalJson(gatedComparison) === canonicalJson(expectedGatedComparison)
  const mappedChannelCount = input.mappedChannelCount ?? (input.hasMappedChannel ? 1 : 0)
  const mappedChannelIsUnique = input.hasMappedChannel && mappedChannelCount === 1
  const mappedTimingWithinPolicy = input.channelTiming !== undefined
    && Number.isFinite(input.channelTiming.maxAbsDeltaMs)
    && Math.abs(input.channelTiming.maxAbsDeltaMs) <= CHIBI_V12_MOTION_GATES.timingMaxMs
    && Number.isFinite(input.channelTiming.cumulativeDriftMs)
    && Math.abs(input.channelTiming.cumulativeDriftMs) <= CHIBI_V12_MOTION_GATES.timingMaxMs
  const unmappedTimingIsAbsent = gatedComparison?.timing.applicable === false
    && gatedComparison.timing.maxAbsDeltaMs === null
    && gatedComparison.timing.cumulativeDriftMs === null
    && input.channelTiming === undefined
  const boundPropertyWithinPolicy = property === 'translation'
    ? Boolean(gatedComparison && gatedComparison.translation.maxSampleError <= gatedComparison.translation.gate!)
    : property === 'rotation'
      ? Boolean(gatedComparison && gatedComparison.quaternion.maxSampleError <= gatedComparison.quaternion.gate!)
      : property === 'scale' && gatedComparison
        ? (input.propertyAxis === null || input.propertyAxis === undefined
          ? (['x', 'y', 'z'] as const).every(axis => gatedComparison.scale.axes[axis].maxSampleError <= gatedComparison.scale.axes[axis].gate!)
          : (['x', 'y', 'z'] as const)[input.propertyAxis] !== undefined
            && gatedComparison.scale.axes[(['x', 'y', 'z'] as const)[input.propertyAxis]].maxSampleError
              <= gatedComparison.scale.axes[(['x', 'y', 'z'] as const)[input.propertyAxis]].gate!)
        : false
  const gatedComparisonWithinPolicy = gatedComparison?.mode === 'policy-gated'
    && gatedComparisonIsRecomputed
    && gatedComparison.visibilityChanges === false
    && gatedComparison.scaleSignZeroTransitions.length === 0
    && gatedComparison.timing.gateMs === CHIBI_V12_MOTION_GATES.timingMaxMs
    && boundPropertyWithinPolicy
    && (input.hasMappedChannel
      ? mappedChannelIsUnique && mappedTimingWithinPolicy && gatedComparison.timing.applicable === true
        && gatedComparison.timing.maxAbsDeltaMs === input.channelTiming?.maxAbsDeltaMs
        && gatedComparison.timing.cumulativeDriftMs === input.channelTiming?.cumulativeDriftMs
      : unmappedTimingIsAbsent)
  const commonResolved = input.coverageComplete
    && samplesAreWellFormed
    && input.bindingKind === 'transform'
    && input.targetResolved
    && Boolean(property)
    && input.valueClass !== 'unresolved'
    && curvesAreResolved
    && !input.hasScaleSignZeroTransition
    && !input.hasUnsafeScaleValue
  const preservedGlb = commonResolved
    && mappedChannelIsUnique
    && mappedTimingWithinPolicy
    && input.valueClass === 'dynamic'
    && samplesMatchGlb
    && !sourceIsConstant
    && !glbPropertyIsStatic
  if (preservedGlb) return { disposition: 'preserved-glb', diagnosticCodes: [] }
  const exactStaticChannel = commonResolved
    && mappedChannelIsUnique
    && mappedTimingWithinPolicy
    && input.mappedChannelPropertyStatic === true
    && input.valueClass === 'constant'
    && sourceIsConstant
    && samplesMatchGlb
    && glbPropertyIsStatic
  if (exactStaticChannel) return { disposition: 'exact-static-channel', diagnosticCodes: [] }
  const exactStatic = input.coverageComplete
    && samplesAreWellFormed
    && input.bindingKind === 'transform'
    && input.targetResolved
    && Boolean(property)
    && input.valueClass === 'constant'
    && curvesAreResolved
    && samples.length > 0
    && sourceIsConstant
    && samplesMatchGlb
    && nodeDefaultIsValid
    && input.nodeDefault !== null
    && Boolean(property)
    && sameSerializedProperty(sourceSamples[0], input.nodeDefault, property!)
    && !input.hasMappedChannel
    && !input.hasScaleSignZeroTransition
    && !input.hasUnsafeScaleValue
  if (exactStatic) return { disposition: 'exact-static', diagnosticCodes: [] }
  const boundedSourceToStatic = input.coverageComplete
    && samplesAreWellFormed
    && input.bindingKind === 'transform'
    && input.targetResolved
    && Boolean(property)
    && input.valueClass !== 'unresolved'
    && curvesAreResolved
    && samples.length > 0
    && glbPropertyIsStatic
    && nodeDefaultIsValid
    && glbPropertyMatchesNodeDefault
    && !input.hasMappedChannel
    && input.bodyHeightEvidence !== undefined
    && gatedComparisonWithinPolicy
    && !input.hasScaleSignZeroTransition
    && !input.hasUnsafeScaleValue
  if (boundedSourceToStatic) return { disposition: 'bounded-source-to-static', diagnosticCodes: [] }
  const boundedSourceToGlbChannel = commonResolved
    && mappedChannelIsUnique
    && input.valueClass !== 'unresolved'
    && (!sourceIsConstant || (glbPropertyIsStatic && input.mappedChannelPropertyStatic === true))
    && input.bodyHeightEvidence !== undefined
    && gatedComparisonWithinPolicy
    && !samplesMatchGlb
  if (boundedSourceToGlbChannel) return { disposition: 'bounded-source-to-glb-channel', diagnosticCodes: [] }

  if (input.bindingKind !== 'transform') diagnostics.push('UNSUPPORTED_NON_TRANSFORM_BINDING')
  if (!input.targetResolved || !property || !curvesAreResolved) diagnostics.push('SOURCE_BINDING_UNRESOLVED')
  if (input.valueClass === 'unresolved') diagnostics.push('SOURCE_CURVE_VALUE_UNRESOLVED')
  if (input.sampleEvidence.length === 0) diagnostics.push('SOURCE_TRS_SAMPLES_MISSING')
  if (input.hasMappedChannel && !mappedChannelIsUnique) diagnostics.push('GLB_CHANNEL_MAPPING_NOT_UNIQUE')
  if (input.hasMappedChannel && !mappedTimingWithinPolicy) diagnostics.push('GLB_CHANNEL_TIMING_UNRESOLVED_OR_OVER_GATE')
  if (input.hasMappedChannel && input.bodyHeightEvidence === undefined && !samplesMatchGlb) diagnostics.push('MODEL_HEIGHT_SELECTOR_MISSING')
  if (input.valueClass === 'dynamic') {
    if (input.hasMappedChannel && gatedComparison?.mode === 'policy-gated' && !boundPropertyWithinPolicy) diagnostics.push('SOURCE_TO_GLB_PROPERTY_ERROR_OVER_GATE')
    else if (input.hasMappedChannel) diagnostics.push('DYNAMIC_SOURCE_TRANSFORM_PARITY_UNVERIFIED')
    else if (!gatedComparison) diagnostics.push('MODEL_HEIGHT_SELECTOR_MISSING')
    else if (gatedComparison.mode !== 'policy-gated') diagnostics.push('SOURCE_TO_GLB_MATERIALITY_UNRESOLVED')
    else diagnostics.push('SOURCE_TO_GLB_STATIC_APPROXIMATION_UNPROVEN')
  } else if (input.valueClass === 'constant' && samples.length > 0) {
    if (input.hasMappedChannel && gatedComparison?.mode === 'policy-gated' && !boundPropertyWithinPolicy) diagnostics.push('SOURCE_TO_GLB_PROPERTY_ERROR_OVER_GATE')
    else if (input.hasMappedChannel) diagnostics.push('STATIC_SOURCE_CHANNEL_PARITY_UNVERIFIED')
    else if (!samplesMatchGlb && !gatedComparison) diagnostics.push('MODEL_HEIGHT_SELECTOR_MISSING')
    else if (!samplesMatchGlb) diagnostics.push('SOURCE_TO_GLB_STATIC_APPROXIMATION_UNPROVEN')
  }
  if (input.hasScaleSignZeroTransition || input.hasUnsafeScaleValue) diagnostics.push('SCALE_SIGN_OR_ZERO_TRANSITION')
  return { disposition: 'unresolved', diagnosticCodes: [...new Set(diagnostics)].sort() }
}

function buildProofRow(candidate: Candidate, action: { id: string; clip: string }, sourceClipReference: SourceReference, helper: JsonRecord): SourceMotionProofRowV3 {
  const { failure, expected, binding, profile, sourcePrefab, assembly, assemblyRenderer, coreRenderer, glb, glbArtifact } = candidate
  const animationRows = Array.isArray(glb.animations) ? glb.animations as JsonRecord[] : []
  const animations = animationRows.flatMap((item, index) => item.name === action.clip ? [{ item, index }] : [])
  assert.equal(animations.length, 1, `Student ${failure.studentId} source action is not uniquely embedded in its GLB.`)
  const { item: animation, index: animationIndex } = animations[0]
  const nodes: JsonRecord[] = Array.isArray(glb.nodes) ? glb.nodes : []
  const rootMatches = nodes.flatMap((node, index) => node?.name === assembly.root ? [index] : [])
  assert.equal(rootMatches.length, 1, `Student ${failure.studentId} selected prefab root is not unique in its GLB.`)
  const rootIndex = rootMatches[0]
  const selectedPrefab = helper.selectedPrefab as SourceReference
  equalSourceReference(selectedPrefab, sourcePrefab.reference, 'Source helper prefab identity differs from the embedded rendering profile.')
  equalSourceReference(selectedPrefab, assembly.prefabReference, 'Source helper prefab identity differs from the exact assembly prefab.')
  assert.equal(helper.prefabRootName, assembly.root, 'Source helper prefab root name differs from the embedded assembly.')
  const rootTransformReference = helper.rootTransformReference as SourceReference
  const transformChain = Array.isArray(assemblyRenderer.transformChain) ? assemblyRenderer.transformChain as JsonRecord[] : []
  assert.ok(transformChain.length > 0, 'Exact assembly renderer has no source Transform chain.')
  const rendererTransformReference = transformChain.at(-1)?.sourceReference as SourceReference
  equalSourceReference(helper.rendererTransformReference, rendererTransformReference, 'Source helper renderer Transform differs from the exact assembly Transform chain.')
  const scopeTransforms = expandScopeTransforms(helper, coreRenderer, rendererTransformReference, glb, rootIndex, rootTransformReference)
  const scopeByReference = new Map(scopeTransforms.map(item => [makeSourceReferenceKey(item.sourceReference), item]))
  const scopeKeys = new Set(scopeByReference.keys())
  const rendererReference = coreRenderer.sourceReference as SourceReference
  assert.equal(makeSourceReferenceKey(rendererReference), failure.rendererSourceKey, 'Exact source renderer reference differs from the structural sweep key.')
  const rendererNodeIndex = coreRenderer.glbNodeIndex
  assert.ok(Number.isInteger(rendererNodeIndex) && nodes[rendererNodeIndex], 'Structural renderer has no bound GLB node.')
  const rendererNode = nodes[rendererNodeIndex]
  const skin = Array.isArray(glb.skins) && Number.isInteger(rendererNode.skin) ? glb.skins[rendererNode.skin] : null
  assert.ok(skin && Array.isArray(skin.joints) && skin.joints.length > 0, 'Structural renderer has no exact GLB skin scope.')
  const mappedSkinJointNodes = assemblyRenderer.boneReferences.map((pointer: JsonRecord) => {
    const ref = referenceFrom(pointer, 'skin joint')
    const record = scopeByReference.get(makeSourceReferenceKey(ref))
    assert.ok(record, 'Exact source skin-joint path is absent from the expanded scope.')
    return record!.glbNodeIndex
  })
  assert.equal(new Set(mappedSkinJointNodes).size, mappedSkinJointNodes.length, 'Source skin joint paths are not unique in the GLB.')
  assert.deepEqual([...mappedSkinJointNodes].sort((a: number, b: number) => a - b), [...skin.joints].sort((a: number, b: number) => a - b), 'Exact source boneReferences differ from the GLB skin-joint set.')

  const animatorPath = helper.animatorRootPath as JsonRecord[]
  assert.ok(Array.isArray(animatorPath) && animatorPath.length > 0, 'Source helper did not return a complete Animator root path.')
  equalSourceReference(helper.animatorRootReference, animatorPath.at(-1)?.sourceReference, 'Source helper Animator root reference differs from its exact prefab hierarchy path.')
  const animatorEvidence = helper.animator as JsonRecord
  const animator = {
    componentReference: animatorEvidence.componentReference,
    rootReference: animatorEvidence.rootReference,
    path: animatorEvidence.path,
    controllerReference: animatorEvidence.controllerReference,
    controllerGraph: animatorEvidence.controllerGraph,
    selectedClipReference: animatorEvidence.selectedClipReference,
    matchingAnimatorCount: animatorEvidence.matchingAnimatorCount,
    matchingClipCount: animatorEvidence.matchingClipCount,
  }
  assert.equal(animator.matchingAnimatorCount, 1, 'Selected source clip does not resolve to exactly one Animator.')
  assert.equal(animator.matchingClipCount, 1, 'Selected source clip is not unique in the resolved controller graph.')
  assert.equal(animator.controllerGraph?.complete, true, 'Selected Animator controller graph is incomplete.')
  equalSourceReference(animator.selectedClipReference, sourceClipReference, 'Animator controller selection differs from the pinned source clip.')

  const rawTracks = Array.isArray(helper.tracks) ? helper.tracks as JsonRecord[] : []
  const helperCurveSet = helper.curveSet as JsonRecord
  const clipRanges = rawTracks.map(track => [Number(track.sampleStartTime), Number(track.sampleStopTime)] as const)
  const firstRange = clipRanges.find(([start, stop]) => Number.isFinite(start) && Number.isFinite(stop))
  const rangeMatches = firstRange !== undefined && clipRanges.every(([start, stop]) => start === firstRange[0] && stop === firstRange[1])
  const sourceClipRange = rangeMatches
    ? { startTimeSec: firstRange![0], stopTimeSec: firstRange![1] }
    : { startTimeSec: 0, stopTimeSec: 0 }
  const rowDiagnostics = new Set<string>()
  if (!rangeMatches || sourceClipRange.stopTimeSec < sourceClipRange.startTimeSec) rowDiagnostics.add('SOURCE_CLIP_RANGE_UNRESOLVED')
  if (animator.matchingAnimatorCount !== 1 || animator.matchingClipCount !== 1 || animator.controllerGraph?.complete !== true) rowDiagnostics.add('ANIMATOR_CONTROLLER_SELECTION_UNRESOLVED')
  const requiredNodes = new Set(scopeTransforms.map(item => item.glbNodeIndex as number))
  const requiredGlbChannels = (Array.isArray(animation.channels) ? animation.channels as JsonRecord[] : [])
    .flatMap((channel, channelIndex) => {
    if (!requiredNodes.has(channel.target?.node)) return []
    if (!['translation', 'rotation', 'scale'].includes(channel.target?.path)) {
      rowDiagnostics.add('UNSUPPORTED_REQUIRED_GLB_ANIMATION_CHANNEL')
      return []
    }
    const sampler = animation.samplers?.[channel.sampler]
    if (!sampler) rowDiagnostics.add(`GLB_CHANNEL_${channelIndex}_UNRESOLVED`)
    return [{ channel, channelIndex }]
  })

  const sourceSampleCache = new Map<string, JsonRecord[]>()
  const tracks: SourceMotionProofTrackV3[] = rawTracks.map(track => {
    const target = sourceTargetForTrack(track, rootIndex, rootTransformReference, glb, animatorPath)
    const pathTokens = Array.isArray(track.pathTokens) ? track.pathTokens as string[] : null
    if (Array.isArray(pathTokens) && unityPathHash(pathTokens) !== track.bindingPathHash) rowDiagnostics.add('SOURCE_PATH_HASH_MISMATCH')
    const property: 'translation' | 'rotation' | 'scale' | null = track.property === 'translation' || track.property === 'rotation' || track.property === 'scale' ? track.property : null
    if (track.bindingKind !== 'transform' || !target || !property || !Array.isArray(pathTokens)) rowDiagnostics.add('SOURCE_BINDING_UNRESOLVED')
    if (target && pathTokens && target.animatorRelation === 'inside-animator-subtree') {
      const animatorRelative = target.path.slice(animatorPath.length).map(item => String(item.name))
      if (canonicalJson(pathTokens) !== canonicalJson(animatorRelative)) rowDiagnostics.add('SOURCE_PATH_IDENTITY_MISMATCH')
    }
    const sourceCurves = convertTrackSourceCurves(track)
    const sourceCurveDigest = sha256(canonicalJson({ componentCurves: sourceCurves }))
    const sourceSampleRows = Array.isArray(track.sourceSamples) ? track.sourceSamples as JsonRecord[] : []
    let sampleEvidence: SourceMotionProofTrackV3['sampleEvidence'] = []
    if (target && sourceSampleRows.length > 0) {
      const times = [...new Set(sourceSampleRows.map(sample => Number(sample.timeSec)))].sort((a, b) => a - b)
      const cacheKey = glbTransformSampleCacheKey(target.glbNodeIndex, times)
      let glbSamples = sourceSampleCache.get(cacheKey)
      if (!glbSamples) {
        try {
          const sampled = sampleAnimationAtTimes(glbArtifact, { animationIndex, nodeIndex: target.glbNodeIndex, times })
          glbSamples = sampled.map(sample => ({
            timeSec: sample.time,
            translation: sample.translation,
            rotation: sample.rotation,
            scale: sample.scale,
          }))
          sourceSampleCache.set(cacheKey, glbSamples)
        } catch {
          rowDiagnostics.add('GLB_TRANSFORM_SAMPLE_UNRESOLVED')
        }
      }
      if (glbSamples) {
        const byTime = new Map(glbSamples.map(sample => [sample.timeSec, sample]))
        sampleEvidence = sourceSampleRows.map(sample => {
          const source = {
            translation: sample.translation as [number, number, number],
            rotation: sample.rotation as [number, number, number, number],
            scale: sample.scale as [number, number, number],
          }
          const glbSample = byTime.get(Number(sample.timeSec))
          assert.ok(glbSample, 'GLB source-motion sampler omitted an exact selected time.')
          return {
            timeSec: Number(sample.timeSec),
            kind: sample.kind,
            source,
            glb: {
              translation: glbSample!.translation as [number, number, number],
              rotation: glbSample!.rotation as [number, number, number, number],
              scale: glbSample!.scale as [number, number, number],
            },
          }
        })
      }
    }
    const channelProperty = property
    const valuesPerCurve = sourceCurves.map(curve => Math.max(curve.keys.length, curve.initialValue === null ? 0 : 1))
    const sampleCount = valuesPerCurve.reduce((sum, value) => sum + value, 0)
    const valueClass = track.valueClass === 'constant' || track.valueClass === 'dynamic' ? track.valueClass : 'unresolved'
    const samples = sampleEvidence
    const glbNodeDefault = target ? readNodeBaseTrs(glbArtifact, target.glbNodeIndex) as SourceMotionTransformV2 | null : null
    const propertyAxisLetter = String(track.property ?? '').toLowerCase().match(/\.([xyzw])$/)?.[1]
    const propertyAxis = propertyAxisLetter ? ({ x: 0, y: 1, z: 2, w: 3 } as const)[propertyAxisLetter as 'x' | 'y' | 'z' | 'w'] : null
    const mappedChannels = target && channelProperty
      ? mapAnimationChannels(glb, animation, target.glbNodeIndex, channelProperty)
      : []
    let channelTiming: SourceMotionChannelTimingV3 | undefined
    let mappedChannelStatic: boolean | undefined
    if (mappedChannels.length === 1 && samples.length > 0) {
      try {
        channelTiming = mappedChannelTiming(glbArtifact, animation, mappedChannels[0], sourceCurves, sourceClipRange)
        if (channelProperty) mappedChannelStatic = mappedChannelPropertyIsStatic(glbArtifact, animation, animationIndex, mappedChannels[0], channelProperty, propertyAxis)
      } catch {
        rowDiagnostics.add('GLB_CHANNEL_TIMING_UNRESOLVED')
      }
    } else if (mappedChannels.length > 1) {
      rowDiagnostics.add('GLB_CHANNEL_MAPPING_NOT_UNIQUE')
    }
    const exactComparison = comparisonForSamples(samples, channelTiming)
    const policyComparison = candidate.bodyHeightEvidence && samples.length > 0
      ? policyGatedComparisonForSamples(samples, candidate.bodyHeightEvidence, channelTiming)
      : undefined
    if (exactComparison.scaleSignZeroTransitions.length > 0) rowDiagnostics.add('SCALE_SIGN_OR_ZERO_TRANSITION')
    const classification = classifyV3TrackEvidence({
      coverageComplete: helperCurveSet.complete === true,
      bindingKind: String(track.bindingKind ?? 'unresolved'),
      targetResolved: target !== null,
      property,
      valueClass,
      sourceCurves,
      sampleEvidence: samples,
      nodeDefault: glbNodeDefault,
      hasMappedChannel: mappedChannels.length > 0,
      mappedChannelCount: mappedChannels.length,
      channelTiming,
      mappedChannelPropertyStatic: mappedChannelStatic,
      propertyAxis,
      hasScaleSignZeroTransition: exactComparison.scaleSignZeroTransitions.length > 0,
      hasUnsafeScaleValue: samples.some(sample => [...sample.source.scale, ...sample.glb.scale].some(value => Math.abs(value) <= 1e-9)),
      bodyHeightEvidence: candidate.bodyHeightEvidence,
      policyGatedComparison: policyComparison,
    })
    const comparison = policyComparison && classification.disposition !== 'preserved-glb'
      && classification.disposition !== 'exact-static-channel' && classification.disposition !== 'exact-static'
      ? policyComparison
      : exactComparison
    for (const code of classification.diagnosticCodes) rowDiagnostics.add(code)
    return {
      curveIndex: Number(track.curveIndex),
      bindingPathHash: Number(track.bindingPathHash) >>> 0,
      pathTokens,
      sourceTransformReference: track.sourceTransformReference as SourceReference | null,
      component: String(track.component ?? ''),
      property: String(track.property ?? ''),
      bindingKind: String(track.bindingKind ?? 'unresolved'),
      sourceKind: String(track.sourceKind ?? 'unresolved'),
      sampleCount,
      valuesSha256: sourceCurveDigest,
      valueClass,
      disposition: classification.disposition,
      sourceCurves,
      sourceTarget: target,
      glbChannels: mappedChannels,
      sampleEvidence: samples,
      comparison,
    }
  })
  tracks.sort((left, right) => left.curveIndex - right.curveIndex
    || left.bindingPathHash - right.bindingPathHash || left.property.localeCompare(right.property))

  const accountedChannelIndices = new Set(tracks.flatMap(track => track.glbChannels.map(channel => channel.channelIndex)))
  for (const { channelIndex } of requiredGlbChannels) {
    if (!accountedChannelIndices.has(channelIndex)) rowDiagnostics.add('REQUIRED_GLB_CHANNEL_NOT_SOURCE_ACCOUNTED')
  }

  const unresolvedRelevantCount = tracks.filter(track => {
    const referenceKey = track.sourceTransformReference ? makeSourceReferenceKey(track.sourceTransformReference) : ''
    const pathScope = track.bindingKind === 'transform' && !track.sourceTransformReference
      && scopeTransforms.some(scope => unityPathHash(scope.animationPathTokens) === track.bindingPathHash)
    const relevant = scopeKeys.has(referenceKey) || pathScope
      || (track.sourceTarget?.animatorRelation === 'ancestor-of-animator-root' && scopeKeys.has(referenceKey))
    return relevant && track.disposition === 'unresolved'
  }).length
  const relevantTrackCount = tracks.filter(track => track.sourceTransformReference
    && scopeKeys.has(makeSourceReferenceKey(track.sourceTransformReference))).length
  const helperComplete = helperCurveSet.complete === true
  const complete = helperComplete && tracks.length === Number(helperCurveSet.totalBindingCount)
    && tracks.every(track => track.disposition !== 'unresolved')
    && rowDiagnostics.size === 0
  const allScopeOutsideAnimator = scopeTransforms.length > 0
    && scopeTransforms.every(scope => scope.animatorRelation === 'disjoint' || scope.animatorRelation === 'ancestor-of-animator-root')
  const noSourceTrackTargetsScope = tracks.every(track => !track.sourceTransformReference
    || !scopeKeys.has(makeSourceReferenceKey(track.sourceTransformReference)))
  const proofStatus: SourceMotionProofRowV3['proofStatus'] = complete
    ? allScopeOutsideAnimator && noSourceTrackTargetsScope ? 'outside-subtree-untargeted' : 'static'
    : 'unresolved'
  if (!helperComplete) rowDiagnostics.add('SOURCE_CURVE_COVERAGE_INCOMPLETE')
  if (Number(helperCurveSet.totalBindingCount) !== tracks.length) rowDiagnostics.add('SOURCE_BINDING_COUNT_MISMATCH')
  if (unresolvedRelevantCount > 0) rowDiagnostics.add('REQUIRED_SCOPE_SOURCE_TRACK_UNRESOLVED')
  const decoderDiagnostics = Array.isArray(helperCurveSet.decoderDiagnostics)
    ? [...helperCurveSet.decoderDiagnostics].map(String).sort() : []
  const curveSet = {
    complete: helperComplete && tracks.length === Number(helperCurveSet.totalBindingCount),
    coverageStatus: helperComplete && tracks.length === Number(helperCurveSet.totalBindingCount) ? 'complete' as const : 'incomplete' as const,
    totalBindingCount: tracks.length,
    relevantTrackCount,
    unresolvedRelevantCount,
    genericBindingCount: Number(helperCurveSet.genericBindingCount ?? 0),
    directCurveCount: Number(helperCurveSet.directCurveCount ?? 0),
    decoderDiagnostics,
    sha256: sha256(canonicalJson({
      tracks,
      complete: helperComplete && tracks.length === Number(helperCurveSet.totalBindingCount),
      totalBindingCount: tracks.length,
      relevantTrackCount,
      unresolvedRelevantCount,
      genericBindingCount: Number(helperCurveSet.genericBindingCount ?? 0),
      directCurveCount: Number(helperCurveSet.directCurveCount ?? 0),
      decoderDiagnostics,
    })),
  }
  const profileSha256 = sha256(canonicalJson(binding.profile))
  if (tracks.some(track => track.disposition === 'unresolved' && track.valueClass !== 'unresolved')) {
    rowDiagnostics.add('SOURCE_TO_GLB_MATERIALITY_UNRESOLVED')
  }
  return {
    studentId: failure.studentId,
    sourceIdentity: failure.sourceIdentity,
    asset: { assetId: expected.assetId, revision: expected.revision, sha256: expected.sha256 },
    profileSha256,
    renderer: { sourceKey: failure.rendererSourceKey, sourceReference: rendererReference },
    action,
    selectedPrefab: { path: sourcePrefab.path, sourceReference: selectedPrefab, rootTransformReference },
    animator,
    sourceClip: { name: action.clip, sourceReference: sourceClipReference },
    sourceClipRange,
    proofStatus,
    scopeTransforms,
    curveSet,
    tracks,
    diagnosticCodes: [...rowDiagnostics].sort(),
  }
}

async function assertRunRoot() {
  for (const [target, kind] of [[RUN_ROOT, 'run'], [DATA_ROOT, 'data'], [SOURCE_ROOT, 'source'], [TOOLS_ROOT, 'tools']] as const) {
    const stat = await lstat(target)
    assert.equal(stat.isSymbolicLink(), false, `Pinned ${kind} root must not be a symbolic link.`)
    assert.ok(stat.isDirectory(), `Pinned ${kind} root is not a directory.`)
    assert.equal(await realpath(target), path.resolve(target), `Pinned ${kind} root resolves elsewhere.`)
  }
  assert.equal(process.env.PGOPTIONS, undefined, 'PGOPTIONS must be absent for the v12 source-motion proof.')
}

async function readDatabaseCandidates(connectionString: string, failures: readonly JsonRecord[], sidecar: JsonRecord) {
  const ids = failures.map(row => row.studentId)
  assert.equal(new Set(ids).size, ids.length, 'Structural sweep repeats a student ID.')
  const client = new Client({ connectionString, application_name: 'chibi-v12-source-motion-proof-readonly' })
  await client.connect()
  let transactionOpen = false
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    transactionOpen = true
    const scope = (await client.query("SELECT current_database() AS db, current_schema() AS schema, current_setting('transaction_read_only') AS read_only")).rows[0]
    assert.deepEqual(scope, { db: V12_DATABASE_NAME, schema: 'public', read_only: 'on' }, 'Source-motion proof connected outside the exact read-only v12 scope.')

    const jobs = (await client.query(
      `SELECT "id", "mode", "status", "stage", "total", "processed", "imported", "unavailable", "failed" FROM "ChibiImportJob" ORDER BY "id" ASC`,
    )).rows
    assert.equal(jobs.length, 1, 'Source-motion proof requires the sole original v12 import job.')
    assert.deepEqual(jobs[0], {
      id: V12_JOB_ID, mode: 'update', status: 'completed', stage: 'completed', total: 275,
      processed: 275, imported: 238, unavailable: 37, failed: 0,
    }, 'Source-motion proof terminal v12 job identity or counters differ from the frozen record.')
    const items = (await client.query(
      `SELECT "studentId", "status", "sourceIdentity", "fingerprint", "assetId" FROM "ChibiImportItem" WHERE "jobId" = $1 ORDER BY "studentId" ASC`,
      [V12_JOB_ID],
    )).rows
    assert.equal(items.length, 275, 'Source-motion proof terminal item count differs from v12.')
    const itemByStudent = new Map<number, JsonRecord>(items.map((item: JsonRecord) => [item.studentId, item]))
    const rows = (await client.query(
      `SELECT b."studentId", b."assetId", b."sourceIdentity", b."identityPath", b."status", b."profile", a."checksum", a."fileKey", a."published" FROM "StudentChibiBinding" b JOIN "ChibiAsset" a ON a."id" = b."assetId" WHERE b."studentId" = ANY($1::int[]) ORDER BY b."studentId" ASC`,
      [ids],
    )).rows as JsonRecord[]
    assert.equal(rows.length, ids.length, 'A selected structural renderer has no exact v12 published binding.')
    const sidecarByStudent = new Map<number, JsonRecord>(sidecar.rows.map((item: JsonRecord) => [item.studentId, item]))
    const failureByStudent = new Map<number, JsonRecord>(failures.map(row => [row.studentId, row]))
    const result = new Map<number, JsonRecord>()
    for (const binding of rows) {
      const expected = sidecarByStudent.get(binding.studentId)
      const failure = failureByStudent.get(binding.studentId)
      const item = itemByStudent.get(binding.studentId)
      assert.ok(expected && failure && item, `Selected student ${binding.studentId} is outside the frozen v12 terminal evidence.`)
      assert.equal(binding.status, 'available', `Selected student ${binding.studentId} has no available binding.`)
      assert.equal(binding.assetId, expected!.assetId, `Selected student ${binding.studentId} binding asset differs from the terminal sidecar.`)
      assert.equal(binding.sourceIdentity, expected!.sourceIdentity, `Selected student ${binding.studentId} binding source identity differs from the terminal sidecar.`)
      assert.equal(binding.identityPath, expected!.identityPath, `Selected student ${binding.studentId} binding path differs from the terminal sidecar.`)
      assert.equal(binding.checksum, expected!.sha256, `Selected student ${binding.studentId} asset checksum differs from the terminal sidecar.`)
      assert.equal(binding.published, true, `Selected student ${binding.studentId} asset is not published.`)
      assert.ok(binding.profile && typeof binding.profile === 'object', `Selected student ${binding.studentId} action profile is missing.`)
      assert.equal(item!.status, 'imported', `Selected student ${binding.studentId} import item is not imported.`)
      assert.equal(item!.assetId, expected!.assetId, `Selected student ${binding.studentId} terminal item asset differs from the sidecar.`)
      assert.equal(item!.sourceIdentity, expected!.sourceIdentity, `Selected student ${binding.studentId} terminal item source identity differs from the sidecar.`)
      assert.equal(item!.fingerprint, expected!.itemFingerprint, `Selected student ${binding.studentId} terminal item fingerprint differs from the sidecar.`)
      assert.equal(failure!.sourceIdentity, expected!.sourceIdentity, `Selected student ${binding.studentId} sweep identity differs from the sidecar.`)
      assert.equal(failure!.assetId, expected!.assetId, `Selected student ${binding.studentId} sweep asset differs from the sidecar.`)
      assert.equal(failure!.sha256, expected!.sha256, `Selected student ${binding.studentId} sweep checksum differs from the sidecar.`)
      result.set(binding.studentId, { ...binding, expected, failure })
    }
    await client.query('ROLLBACK')
    transactionOpen = false
    return result
  } finally {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {})
    await client.end()
  }
}

async function prepareCandidates(failures: readonly JsonRecord[], databaseRows: ReadonlyMap<number, JsonRecord>) {
  const candidates: Candidate[] = []
  for (const failure of failures) {
    const row = databaseRows.get(failure.studentId)
    assert.ok(row, `Selected student ${failure.studentId} has no read-only terminal DB row.`)
    const expected = row!.expected as JsonRecord
    const glbPath = ensureArtifactKey(row!.fileKey, DATA_ROOT, failure.studentId)
    const before = await lstat(glbPath)
    assert.ok(before.isFile() && !before.isSymbolicLink() && before.nlink <= 1, `Student ${failure.studentId} GLB is not a private regular file.`)
    const realPath = await realpath(glbPath)
    assert.ok(realPath.startsWith(`${path.resolve(DATA_ROOT)}${path.sep}`), `Student ${failure.studentId} GLB escapes the pinned v12 data directory.`)
    const bytes = await readFile(realPath)
    assert.equal(bytes.length, before.size, `Student ${failure.studentId} GLB changed size while being read.`)
    assert.equal(sha256(bytes), expected.sha256, `Student ${failure.studentId} GLB differs from the immutable terminal sidecar.`)
    const glbArtifact = parseV12GlbBytes(bytes, expected.sha256)
    const glb = glbArtifact.gltf
    const binary = glbArtifact.binary
    const profile = sourceProfile(glb, failure.studentId)
    assert.equal(profile.sourceIdentity, expected.sourceIdentity, `Student ${failure.studentId} GLB rendering profile source identity differs from its sidecar.`)
    const bodyHeightEvidence = failure.studentId === 23002
      ? await verifyApprovedHanaeBodyRoleWitness({
        projectRoot: PROJECT_ROOT,
        studentId: failure.studentId,
        sourceIdentity: expected.sourceIdentity,
        assetSha256: expected.sha256,
        fullGlbBytes: bytes,
      })
      : undefined
    const sourcePrefab = profile.sourcePrefab as JsonRecord
    const assembly = profile.assembly as JsonRecord
    assert.ok(sourcePrefab && assembly, `Student ${failure.studentId} GLB rendering profile lacks its selected prefab assembly.`)
    equalSourceReference(sourcePrefab.reference, assembly.prefabReference, `Student ${failure.studentId} selected prefab differs between profile and assembly.`)
    const assemblyRenderers: JsonRecord[] = Array.isArray(assembly.renderers) ? assembly.renderers : []
    const matchingAssembly = assemblyRenderers.filter(renderer => makeSourceReferenceKey(renderer.sourceReference) === failure.rendererSourceKey)
    assert.equal(matchingAssembly.length, 1, `Student ${failure.studentId} structural renderer source key is not unique in the embedded assembly.`)
    const coreRenderers: JsonRecord[] = Array.isArray(profile.renderers) ? profile.renderers : []
    const matchingCore = coreRenderers.filter(renderer => makeSourceReferenceKey(renderer.sourceReference) === failure.rendererSourceKey)
    assert.equal(matchingCore.length, 1, `Student ${failure.studentId} structural renderer is not a unique required core renderer.`)
    const actions = actionPairs(row!.profile).filter(action => action.clip === failure.clip)
    assert.ok(actions.length > 0, `Student ${failure.studentId} structural failure clip has no exact persisted action-profile key.`)
    const scopeTargets = makeScopeTargets(matchingAssembly[0], sourcePrefab.reference)
    candidates.push({
      failure, expected, binding: row!, profile, sourcePrefab, assembly,
      assemblyRenderer: matchingAssembly[0], coreRenderer: matchingCore[0], glb, binary, glbArtifact,
      actions, scopeTargets, bodyHeightEvidence,
    })
  }
  return candidates
}

async function main() {
  await assertRunRoot()
  const sidecarBytes = await readPinnedFile(SIDECAR_PATH, SIDECAR_SHA256, 'Terminal v12 roster sidecar')
  const sidecar = JSON.parse(sidecarBytes.toString('utf8')) as JsonRecord
  assert.deepEqual(
    { databaseName: sidecar.databaseName, jobId: sidecar.jobId, terminalStatus: sidecar.terminalStatus, reconciliationStatus: sidecar.reconciliationStatus, publicRowCount: sidecar.publicRowCount },
    { databaseName: V12_DATABASE_NAME, jobId: V12_JOB_ID, terminalStatus: 'completed', reconciliationStatus: 'passed', publicRowCount: 238 },
    'Terminal v12 sidecar identity or reconciliation differs from the frozen run.',
  )
  assert.equal(sidecar.rows.length, 238, 'Terminal sidecar does not cover exactly the imported v12 roster.')
  const sweepBytes = await readPinnedFile(SWEEP_PATH, SWEEP_SHA256, 'Terminal v12 structural sweep')
  const sweep = JSON.parse(sweepBytes.toString('utf8')) as JsonRecord
  assert.equal(sweep.jobId, V12_JOB_ID, 'Structural sweep belongs to a different v12 job.')
  assert.equal(sweep.databaseName, V12_DATABASE_NAME, 'Structural sweep belongs to a different database.')
  assert.equal(sweep.sourceInventorySha256, INVENTORY_SHA256, 'Structural sweep source inventory digest differs from the pinned inventory.')
  const failures = selectZeroMotionFailures(sweep.rows)
  assert.equal(failures.length, 4, 'Pinned v12 structural sweep no longer selects exactly four source-motion candidates.')
  assert.equal(new Set(failures.map(row => row.studentId)).size, failures.length, 'Structural sweep repeats a zero-motion candidate.')

  const envText = await readFile(path.join(PROJECT_ROOT, '.env'), 'utf8')
  const baselinePath = path.join(EVIDENCE_ROOT, 'readonly-business-digest-baseline-v1-20260925.md')
  const baselineMarkdown = await readFile(baselinePath, 'utf8')
  assert.equal(sha256(baselineMarkdown), V12_BASELINE_SHA256, 'Pinned v12 business digest baseline has changed.')
  const databaseUrl = dotenv.parse(envText).DATABASE_URL
  assert.ok(databaseUrl, 'Repository .env has no DATABASE_URL.')
  const connectionString = deriveIsolatedV12Url(databaseUrl)
  const preflight = await runTwoPassPreguard({ envText, baselineMarkdown, intervalMs: 5000 })
  assert.deepEqual(preflight.passes[0].digests, FIVE_BUSINESS_DIGESTS, 'Preflight v12 business digests differ from the approved source-motion baseline.')
  const databaseRows = await readDatabaseCandidates(connectionString, failures, sidecar)
  const candidates = await prepareCandidates(failures, databaseRows)
  assert.equal(candidates.length, 4, 'Pinned source-motion candidates do not match the four structural failures.')

  const inventoryTargetsByIdentity = new Map<string, JsonRecord>()
  for (const candidate of candidates) {
    const sourceIdentity = candidate.failure.sourceIdentity as string
    const prior = inventoryTargetsByIdentity.get(sourceIdentity)
    const target = {
      sourceIdentity,
      prefabBundleSha256: candidate.sourcePrefab.reference.bundleSha256,
      prefabPath: candidate.sourcePrefab.path,
      clipNames: [...new Set(candidate.actions.map(action => action.clip))].sort(),
    }
    if (prior) {
      assert.equal(prior.prefabBundleSha256, target.prefabBundleSha256, 'One source identity resolves to more than one selected prefab bundle.')
      assert.equal(prior.prefabPath, target.prefabPath, 'One source identity resolves to more than one selected prefab path.')
      prior.clipNames = [...new Set([...prior.clipNames, ...target.clipNames])].sort()
    } else inventoryTargetsByIdentity.set(sourceIdentity, target)
  }
  const inventory = runPython({
    mode: 'resolve-inventory', sourceRoot: SOURCE_ROOT, indexPath: INDEX_PATH,
    inventorySha256: INVENTORY_SHA256, expectedSource: SOURCE_ROOT, expectedMetadataReader: METADATA_READER,
    targets: [...inventoryTargetsByIdentity.values()].sort((a, b) => a.sourceIdentity.localeCompare(b.sourceIdentity)),
  })
  assert.equal(inventory.source, SOURCE_ROOT, 'Source inventory root differs from the pinned source directory.')
  assert.equal(inventory.metadataReader, METADATA_READER, 'Source inventory metadata reader differs from the pinned version.')
  assert.match(inventory.sourceBundleSetSha256, /^[a-f0-9]{64}$/)
  assert.ok(inventory.bundles && typeof inventory.bundles === 'object', 'Pinned source inventory returned no bundle locator map.')
  const inventoryTargetByIdentity = new Map<string, JsonRecord>((inventory.targets as JsonRecord[]).map(target => [target.sourceIdentity, target]))

  const rows: SourceMotionProofRowV3[] = []
  const sourceScanCache = new Map<string, JsonRecord>()
  for (const candidate of candidates) {
    const inventoryTarget = inventoryTargetByIdentity.get(candidate.failure.sourceIdentity)
    assert.ok(inventoryTarget, `Source inventory omitted selected identity ${candidate.failure.sourceIdentity}.`)
    for (const action of candidate.actions) {
      const matches = inventoryTarget!.clips[action.clip] as SourceReference[] | undefined
      assert.ok(Array.isArray(matches) && matches.length === 1, `Source inventory has no unique exact AnimationClip source reference for ${action.clip}.`)
      const sourceClipReference = matches![0]
      const cacheKey = `${candidate.failure.studentId}:${candidate.failure.rendererSourceKey}:${sourceReferenceKey(sourceClipReference)}`
      let helper = sourceScanCache.get(cacheKey)
      if (!helper) {
        const closureSha256s = inventoryTarget!.bundleSha256s as string[] | undefined
        assert.ok(Array.isArray(closureSha256s) && closureSha256s.length === inventoryTarget!.closureEntryCount, 'Source identity dependency closure lacks an exact bundle list.')
        assert.equal(new Set(closureSha256s).size, closureSha256s.length, 'Source identity dependency closure repeats a bundle digest.')
        const selectedPrefabSha256 = candidate.sourcePrefab.reference.bundleSha256.toLowerCase()
        const sourceClipSha256 = sourceClipReference.bundleSha256.toLowerCase()
        assert.ok(closureSha256s.includes(selectedPrefabSha256) && closureSha256s.includes(sourceClipSha256), 'Exact prefab or source clip is outside its selected identity dependency closure.')
        const neededBundles: JsonRecord = {}
        for (const digest of closureSha256s) {
          const normalizedDigest = digest.toLowerCase()
          const spec = inventory.bundles[normalizedDigest]
          assert.ok(spec && Array.isArray(spec.serializedFiles), 'Pinned dependency bundle lacks its serialized-file identity list.')
          neededBundles[normalizedDigest] = spec
        }
        helper = runPython({
          sourceRoot: SOURCE_ROOT,
          bundles: neededBundles,
          selectedPrefab: candidate.sourcePrefab.reference,
          rendererReference: candidate.coreRenderer.sourceReference,
          scopeTransforms: candidate.scopeTargets,
          sourceClip: sourceClipReference,
          clipName: action.clip,
        })
        sourceScanCache.set(cacheKey, helper)
      }
      rows.push(buildProofRow(candidate, action, sourceClipReference, helper))
    }
  }
  rows.sort((left, right) => left.studentId - right.studentId
    || sourceReferenceKey(left.renderer.sourceReference).localeCompare(sourceReferenceKey(right.renderer.sourceReference))
    || left.action.id.localeCompare(right.action.id) || left.action.clip.localeCompare(right.action.clip))
  const expectedActionRows = candidates.flatMap(candidate => candidate.actions.map(action => [
    candidate.failure.studentId, candidate.failure.rendererSourceKey, action.id, action.clip,
  ] as const)).sort((left, right) => left[0] - right[0]
    || String(left[1]).localeCompare(String(right[1])) || left[2].localeCompare(right[2]) || left[3].localeCompare(right[3]))
  const actualActionRows = rows.map(row => [row.studentId, row.renderer.sourceKey, row.action.id, row.action.clip] as const)
  assert.deepEqual(actualActionRows, expectedActionRows, 'Source-motion proof rows omit or invent a persisted action/renderer pair.')

  const postflight = await runTwoPassPreguard({ envText, baselineMarkdown, intervalMs: 5000 })
  assert.deepEqual(postflight.passes[0].digests, preflight.passes[0].digests, 'v12 business-table digests changed during the offline source-motion audit.')
  assert.deepEqual(postflight.passes[0].digests, FIVE_BUSINESS_DIGESTS, 'Postflight v12 business digests differ from the approved source-motion baseline.')
  assert.equal(postflight.passes[0].jobId, V12_JOB_ID, 'v12 terminal job identity changed during the offline source-motion audit.')
  const document: SourceMotionProofDocumentV3 = {
    schemaVersion: CHIBI_V12_MOTION_PROOF_SCHEMA_VERSION,
    kind: 'chibi-v12-source-motion-proof',
    policyVersion: CHIBI_V12_MOTION_PROOF_POLICY_VERSION,
    generatedAt: new Date().toISOString(),
    databaseName: V12_DATABASE_NAME,
    jobId: V12_JOB_ID,
    terminalSidecar: { sha256: SIDECAR_SHA256, rowCount: sidecar.rows.length },
    structuralSweep: { sha256: SWEEP_SHA256, rowCount: failures.length, selector: SELECTOR },
    sourceInventory: { sha256: INVENTORY_SHA256, metadataReader: METADATA_READER },
    sourceBundleSetSha256: inventory.sourceBundleSetSha256,
    fiveBusinessDigests: preflight.passes[0].digests,
    rows,
    reportSha256: '',
  }
  document.reportSha256 = canonicalReportSha256(document)
  const outputBytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, 'utf8')
  await writeFile(OUTPUT_PATH, outputBytes, { flag: 'wx' })
  console.log(JSON.stringify({
    outputPath: OUTPUT_PATH,
    fileSha256: sha256(outputBytes),
    bytes: outputBytes.length,
    reportSha256: document.reportSha256,
    sourceBundleSetSha256: document.sourceBundleSetSha256,
    candidates: failures.length,
    rows: rows.length,
    statusCounts: Object.fromEntries(['static', 'outside-subtree-untargeted', 'unresolved'].map(status => [status, rows.filter(row => row.proofStatus === status).length])),
    preflightPasses: preflight.passes.length,
    postflightPasses: postflight.passes.length,
  }, null, 2))
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath && invokedPath.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch(error => {
    console.error(JSON.stringify({ error: safeError(error).slice(0, 500) }))
    process.exitCode = 1
  })
}
