import { createHash } from 'node:crypto'

import { isChibiInstantiateFxEventFunction } from './inventory'
import { CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES, CHIBI_FX_EXCLUSION_POLICY_VERSION } from './rendering-profile'

export const CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION = 1
export const CHIBI_SKIN_SKELETON_METADATA_VERSION = 'chibi-skin-skeleton-lca-v1'

const ACTIONS = ['idle', 'walk', 'pickup', 'touch'] as const
export const PINNED_V12_EXPORTER_VERSION = 'assetstudio-0.19.0_fbx2gltf-0.13.1-render-profile-v7-policy-v7-material-claims-v2-weapon-ancestry-v1'

const V12_IDENTITY = {
  exporterVersion: PINNED_V12_EXPORTER_VERSION,
  materialVersion: 'mx-materials-v39',
  renderingProfileVersion: 'chibi-rendering-profile-v9',
  renderingPolicyVersion: 'chibi-rendering-policy-v12',
  shaderAdapterVersion: 'mx-character-adapters-v9',
} as const

type RecordValue = Record<string, any>
type SkinSkeletonRepair = {
  schemaVersion: 1
  policyVersion: string
  skinIndex: number
  previousSkeleton: number
  repairedSkeleton: number
  jointIndices: number[]
  jointAncestorPaths: number[][]
  reasonCode: 'PRESENT_SKELETON_NOT_COMMON_ANCESTOR'
}

const SKIN_SKELETON_REPAIR_KEYS = [
  'schemaVersion', 'policyVersion', 'skinIndex', 'previousSkeleton', 'repairedSkeleton',
  'jointIndices', 'jointAncestorPaths', 'reasonCode',
]

const FX_PROOF_KEYS = [
  'schemaVersion', 'policyVersion', 'eventSourceReference', 'clip', 'time', 'order', 'function', 'targetReference',
  'completeGraph', 'gameObjectReferences', 'transformReferences', 'componentReferences', 'particleRendererReferences',
  'approvedMonoScriptReferences', 'rendererAssets', 'disjointFromCore', 'reasonCode', 'evidence',
]
const FX_EVENT_KEYS = [
  'eventSourceReference', 'clip', 'time', 'order', 'function', 'targetReference', 'reasonCode', 'evidence',
]

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const object = record(value)
  if (object) return `{${Object.keys(object).sort((left, right) => left.localeCompare(right)).map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error('Core cache identity contains a non-JSON value.')
  return serialized
}

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function skinSkeletonRepairPlan(jsonValue: unknown): SkinSkeletonRepair[] {
  const json = record(jsonValue)
  if (!json) throw new Error('Skin skeleton metadata requires a glTF JSON object.')
  if (json.skins === undefined) return []
  if (!Array.isArray(json.skins)) throw new Error('Skin skeleton metadata found a malformed skins array.')
  const present = json.skins.flatMap((value: unknown, skinIndex: number) => {
    const skin = record(value)
    if (!skin) throw new Error(`Skin skeleton metadata found a malformed skin at index ${skinIndex}.`)
    return Object.hasOwn(skin, 'skeleton') ? [{ skin, skinIndex }] : []
  })
  if (!present.length) return []

  if (!Array.isArray(json.nodes) || !json.nodes.length) throw new Error('Skin skeleton metadata requires a nonempty node graph.')
  const parents: Array<number | null> = Array.from({ length: json.nodes.length }, () => null)
  for (const [parentIndex, nodeValue] of json.nodes.entries()) {
    const node = record(nodeValue)
    if (!node) throw new Error(`Skin skeleton metadata found a malformed node at index ${parentIndex}.`)
    if (node.children === undefined) continue
    if (!Array.isArray(node.children)) throw new Error(`Skin skeleton metadata found malformed child links on node ${parentIndex}.`)
    const localChildren = new Set<number>()
    for (const child of node.children) {
      if (!Number.isInteger(child) || child < 0 || child >= json.nodes.length || child === parentIndex
        || localChildren.has(child) || parents[child] !== null) {
        throw new Error('Skin skeleton metadata requires valid single-parent node links.')
      }
      localChildren.add(child)
      parents[child] = parentIndex
    }
  }
  for (let nodeIndex = 0; nodeIndex < parents.length; nodeIndex += 1) {
    const visited = new Set<number>()
    let current: number | null = nodeIndex
    while (current !== null) {
      if (visited.has(current)) throw new Error('Skin skeleton metadata rejected a cyclic node graph.')
      visited.add(current)
      current = parents[current]
    }
  }
  const ancestorPath = (nodeIndex: number) => {
    const path: number[] = []
    let current: number | null = nodeIndex
    while (current !== null) { path.push(current); current = parents[current] }
    return path.reverse()
  }

  const repairs: SkinSkeletonRepair[] = []
  for (const { skin, skinIndex } of present) {
    const previousSkeleton = skin.skeleton
    if (!Number.isInteger(previousSkeleton) || previousSkeleton < 0 || previousSkeleton >= json.nodes.length) {
      throw new Error(`Skin skeleton metadata rejected an invalid skeleton index on skin ${skinIndex}.`)
    }
    if (!Array.isArray(skin.joints) || !skin.joints.length
      || skin.joints.some((joint: unknown) => typeof joint !== 'number' || !Number.isInteger(joint) || joint < 0 || joint >= json.nodes.length)
      || new Set(skin.joints).size !== skin.joints.length) {
      throw new Error(`Skin skeleton metadata requires unique valid joint indices on skin ${skinIndex}.`)
    }
    const jointIndices = [...skin.joints] as number[]
    const jointAncestorPaths = jointIndices.map(ancestorPath)
    if (jointAncestorPaths.every(path => path.includes(previousSkeleton))) continue

    const shortestPath = Math.min(...jointAncestorPaths.map(path => path.length))
    let commonPrefixLength = 0
    while (commonPrefixLength < shortestPath
      && jointAncestorPaths.every(path => path[commonPrefixLength] === jointAncestorPaths[0][commonPrefixLength])) {
      commonPrefixLength += 1
    }
    if (!commonPrefixLength) throw new Error(`Skin skeleton metadata found no common joint ancestor on skin ${skinIndex}.`)
    const repairedSkeleton = jointAncestorPaths[0][commonPrefixLength - 1]
    repairs.push({
      schemaVersion: 1,
      policyVersion: CHIBI_SKIN_SKELETON_METADATA_VERSION,
      skinIndex,
      previousSkeleton,
      repairedSkeleton,
      jointIndices,
      jointAncestorPaths,
      reasonCode: 'PRESENT_SKELETON_NOT_COMMON_ANCESTOR',
    })
  }
  return repairs
}

function applySkinSkeletonRepairPlan(jsonValue: unknown, repairs: readonly SkinSkeletonRepair[]) {
  const json = record(jsonValue)
  if (!json || !Array.isArray(json.skins)) throw new Error('Skin skeleton repair requires a glTF skins array.')
  for (const repair of repairs) {
    const skin = record(json.skins[repair.skinIndex])
    if (!skin || skin.skeleton !== repair.previousSkeleton) throw new Error('Skin skeleton repair input changed after proof generation.')
    skin.skeleton = repair.repairedSkeleton
  }
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertSkinSkeletonRepairRecords(jsonValue: unknown, diagnosticsValue: unknown, requireMetadata: boolean) {
  const json = record(jsonValue)
  const diagnostics = record(diagnosticsValue)
  if (!json) throw new Error('Skin skeleton metadata requires a glTF JSON object.')
  const hasVersion = Boolean(diagnostics && Object.hasOwn(diagnostics, 'skinSkeletonMetadataVersion'))
  const hasRecords = Boolean(diagnostics && Object.hasOwn(diagnostics, 'skinSkeletonRepairs'))
  if (!hasVersion && !hasRecords && !requireMetadata) {
    if (skinSkeletonRepairPlan(json).length) throw new Error('GLB contains an unrepaired skin.skeleton root.')
    return [] as SkinSkeletonRepair[]
  }
  if (!diagnostics || diagnostics.skinSkeletonMetadataVersion !== CHIBI_SKIN_SKELETON_METADATA_VERSION
    || !Array.isArray(diagnostics.skinSkeletonRepairs)) {
    throw new Error('Rendering-profile diagnostics have incomplete skin skeleton metadata.')
  }
  if (skinSkeletonRepairPlan(json).length) throw new Error('GLB contains an unrepaired skin.skeleton root.')
  const records = diagnostics.skinSkeletonRepairs as unknown[]
  const seen = new Set<number>()
  for (const value of records) {
    const repair = record(value)
    if (!repair) throw new Error('Skin skeleton repair diagnostic is malformed.')
    exactKeys(repair, SKIN_SKELETON_REPAIR_KEYS, 'skin skeleton repair diagnostic')
    if (repair.schemaVersion !== 1 || repair.policyVersion !== CHIBI_SKIN_SKELETON_METADATA_VERSION
      || repair.reasonCode !== 'PRESENT_SKELETON_NOT_COMMON_ANCESTOR'
      || !Number.isInteger(repair.skinIndex) || repair.skinIndex < 0 || seen.has(repair.skinIndex)
      || !Number.isInteger(repair.previousSkeleton) || !Number.isInteger(repair.repairedSkeleton)
      || !Array.isArray(repair.jointIndices) || !Array.isArray(repair.jointAncestorPaths)) {
      throw new Error('Skin skeleton repair diagnostic has an unsupported schema or duplicate skin.')
    }
    seen.add(repair.skinIndex)
    const reconstructed = cloneJsonValue(json)
    const reconstructedSkin = record(reconstructed.skins?.[repair.skinIndex])
    if (!reconstructedSkin || reconstructedSkin.skeleton !== repair.repairedSkeleton
      || canonical(reconstructedSkin.joints) !== canonical(repair.jointIndices)) {
      throw new Error('Skin skeleton repair diagnostic disagrees with the current skin.')
    }
    reconstructedSkin.skeleton = repair.previousSkeleton
    const expected = skinSkeletonRepairPlan(reconstructed)
    if (expected.length !== 1 || canonical(expected[0]) !== canonical(repair)) {
      throw new Error('Skin skeleton repair diagnostic does not prove the exact joint LCA correction.')
    }
  }
  return records as SkinSkeletonRepair[]
}

/** Validate normalized skin roots and their typed per-skin provenance records. */
export function validateSkinSkeletonMetadata(json: unknown, diagnostics?: unknown, requireMetadata = false) {
  return assertSkinSkeletonRepairRecords(json, diagnostics, requireMetadata)
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Core cache ${label} is missing.`)
  return value
}

function exactKeys(value: RecordValue, keys: readonly string[], label: string) {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`Core cache ${label} has an unsupported schema.`)
  }
}

function sourceReferenceKey(value: unknown): string {
  const reference = record(value)
  if (!reference || typeof reference.bundleSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(reference.bundleSha256)
    || typeof reference.serializedFile !== 'string' || !reference.serializedFile.trim()
    || typeof reference.objectId !== 'string' || !reference.objectId.trim() || reference.objectId === '0') {
    throw new Error('Core cache FX exclusion contains an incomplete source identity.')
  }
  exactKeys(reference, ['bundleSha256', 'serializedFile', 'objectId'], 'FX source reference')
  return `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.replaceAll('\\', '/').toLowerCase()}:${reference.objectId}`
}

function pointerKey(file: unknown, pathId: unknown): string {
  return typeof file === 'string' && file.trim() && typeof pathId === 'string' && pathId.trim() && pathId !== '0'
    ? `${file.replaceAll('\\', '/').toLowerCase()}:${pathId}` : ''
}

function fxEventKey(value: RecordValue) {
  if (typeof value.clip !== 'string' || !value.clip.trim() || !Number.isFinite(value.time)
    || !Number.isInteger(value.order) || value.order < 0 || !isChibiInstantiateFxEventFunction(value.function)) {
    throw new Error('Core cache FX exclusion has an incomplete exact animation-event identity.')
  }
  return canonical([
    sourceReferenceKey(value.eventSourceReference), value.clip, value.time, value.order, value.function,
    sourceReferenceKey(value.targetReference),
  ])
}

function referenceAndPointerKeys(value: unknown, label: string) {
  const referenceKey = sourceReferenceKey(value)
  const reference = record(value)!
  return {
    referenceKey,
    pointerKey: pointerKey(reference.serializedFile, reference.objectId),
    label,
  }
}

function collectCoreIdentityKeys(value: unknown, references = new Set<string>(), pointers = new Set<string>()): { references: Set<string>; pointers: Set<string> } {
  if (Array.isArray(value)) {
    for (const item of value) collectCoreIdentityKeys(item, references, pointers)
    return { references, pointers }
  }
  const object = record(value)
  if (!object) return { references, pointers }
  if ('bundleSha256' in object && 'serializedFile' in object && 'objectId' in object) {
    const key = referenceAndPointerKeys(object, 'core').referenceKey
    references.add(key)
  }
  const pointer = pointerKey(object.file, object.pathId)
  if (pointer) pointers.add(pointer)
  for (const item of Object.values(object)) collectCoreIdentityKeys(item, references, pointers)
  return { references, pointers }
}

/**
 * Removes only the independently classified presentation renderers from the
 * identity set used to prove that an instantiated FX graph is disjoint from
 * required content. Their exact source identities must match the preserved
 * assembly one-to-one; every remaining renderer stays in the core projection.
 */
function fxOverlapCoreProjection(profile: RecordValue): RecordValue {
  const validation = record(profile.validation)
  const excluded = profile.excludedRenderers
  if (!validation || !Array.isArray(excluded) || !Array.isArray(validation.excludedRenderers)
    || canonical(excluded) !== canonical(validation.excludedRenderers)) {
    throw new Error('Core cache FX exclusion renderer classifications are incomplete or inconsistent.')
  }
  const projected = JSON.parse(JSON.stringify(profile)) as RecordValue
  if (excluded.length === 0) return projected

  const renderers = profile.renderers
  const assembly = record(profile.assembly)
  if (!Array.isArray(renderers) || !assembly || !Array.isArray(assembly.renderers)) {
    throw new Error('Core cache FX exclusion cannot resolve renderer identities against the selected assembly.')
  }

  const excludedKeys = new Set<string>()
  for (const value of excluded) {
    const renderer = record(value)
    if (!renderer || !['PRESENTATION_SHADER_OR_MATERIAL', 'PRESENTATION_MESH_10210_OR_HELPER'].includes(renderer.reasonCode)
      || typeof renderer.name !== 'string' || !renderer.name.trim()
      || !Array.isArray(renderer.evidence) || renderer.evidence.length === 0
      || renderer.evidence.some((item: unknown) => typeof item !== 'string' || !item)
      || !Array.isArray(renderer.materials)) {
      throw new Error('Core cache FX exclusion renderer classification is not source-evidenced presentation content.')
    }
    const key = sourceReferenceKey(renderer.sourceReference)
    if (excludedKeys.has(key)) throw new Error('Core cache FX exclusion renderer identity is duplicated.')
    excludedKeys.add(key)
  }

  const requiredKeys = new Set<string>()
  for (const value of renderers) {
    const renderer = record(value)
    if (!renderer) throw new Error('Core cache required renderer identity is malformed.')
    const key = sourceReferenceKey(renderer.sourceReference)
    if (requiredKeys.has(key)) throw new Error('Core cache required renderer identity is duplicated.')
    if (excludedKeys.has(key)) throw new Error('Core cache renderer is classified as both required and presentation-only.')
    requiredKeys.add(key)
  }

  const classifiedKeys = new Set([...requiredKeys, ...excludedKeys])
  const assemblyCounts = new Map<string, number>()
  for (const value of assembly.renderers) {
    const renderer = record(value)
    if (!renderer) throw new Error('Core cache assembly renderer identity is malformed.')
    const key = sourceReferenceKey(renderer.sourceReference)
    if (!classifiedKeys.has(key)) throw new Error('Core cache assembly contains a renderer without a matching required or excluded decision.')
    assemblyCounts.set(key, (assemblyCounts.get(key) ?? 0) + 1)
  }
  for (const key of classifiedKeys) {
    if (assemblyCounts.get(key) !== 1) {
      throw new Error('Core cache renderer decisions do not map one-to-one to the selected assembly.')
    }
  }

  const projectedValidation = record(projected.validation)!
  const projectedAssembly = record(projected.assembly)!
  projected.excludedRenderers = []
  projectedValidation.excludedRenderers = []
  projectedAssembly.renderers = (projectedAssembly.renderers as unknown[]).filter(value => {
    const renderer = record(value)
    return !renderer || !excludedKeys.has(sourceReferenceKey(renderer.sourceReference))
  })
  return projected
}

function validateFxPPtrEvidence(value: unknown, label: string) {
  const evidence = record(value)
  const pointer = record(evidence?.pointer)
  if (!evidence || !pointer || evidence.identityResolved !== true
    || !Number.isInteger(evidence.fileID) || evidence.fileID < 0
    || typeof pointer.file !== 'string' || !pointer.file.trim()
    || typeof pointer.pathId !== 'string' || !/^(?:0|-?[1-9]\d*)$/.test(pointer.pathId)
    || (pointer.externalGuid !== undefined && pointer.externalGuid !== null
      && (typeof pointer.externalGuid !== 'string' || !/^[0-9a-f]{32}$/i.test(pointer.externalGuid.replaceAll('-', ''))))) {
    throw new Error(`Core cache FX exclusion has unresolved ${label} PPtr evidence.`)
  }
  exactKeys(evidence, ['pointer', 'fileID', 'identityResolved', 'objectResolved', 'sourceReference'], 'FX PPtr evidence')
  const pointerKeys = Object.keys(pointer)
  if (pointerKeys.some(key => !['file', 'pathId', 'externalGuid', 'builtinResource'].includes(key))) {
    throw new Error(`Core cache FX exclusion ${label} PPtr has an unsupported schema.`)
  }
  const source = evidence.sourceReference === null ? null : sourceReferenceKey(evidence.sourceReference)
  if (source && !source.endsWith(`:${pointer.file.replaceAll('\\', '/').toLowerCase()}:${pointer.pathId}`)) {
    throw new Error(`Core cache FX exclusion ${label} source and PPtr identities disagree.`)
  }
  const explicitNull = pointer.pathId === '0' && evidence.objectResolved === false && source === null
  const resolvedObject = pointer.pathId !== '0' && evidence.objectResolved === true
  const externalIdentityOnly = pointer.pathId !== '0' && evidence.fileID > 0 && evidence.objectResolved === false
  if (!explicitNull && !resolvedObject && !externalIdentityOnly) {
    throw new Error(`Core cache FX exclusion has unresolved ${label} PPtr evidence.`)
  }
  return { sourceKey: source, pointerKey: pointerKey(pointer.file, pointer.pathId) }
}

/** Validate the narrow typed FX diagnostic channel before excluding it from converted-core identity. */
export function validateFxExclusionDiagnostics(
  profileValue: unknown,
  diagnosticMirror?: { present: boolean; proofs: unknown; events: unknown },
  allowPinnedV12WithoutFxFields = false,
) {
  const profile = record(profileValue)
  const validation = record(profile?.validation)
  if (!profile || !validation) throw new Error('Core cache FX exclusion profile is incomplete.')
  const hasProofs = Object.hasOwn(profile, 'fxExclusionProofs')
  const hasEvents = Object.hasOwn(profile, 'excludedFxInstantiationEvents')
  const hasValidationProofs = Object.hasOwn(validation, 'fxExclusionProofs')
  const hasValidationEvents = Object.hasOwn(validation, 'excludedFxInstantiationEvents')
  const isPinnedV12 = profile.profileVersion === V12_IDENTITY.renderingProfileVersion
    && profile.policyVersion === V12_IDENTITY.renderingPolicyVersion
    && profile.adapterVersion === V12_IDENTITY.shaderAdapterVersion
  if (!hasProofs && !hasEvents && !hasValidationProofs && !hasValidationEvents
    && allowPinnedV12WithoutFxFields && isPinnedV12) {
    if (diagnosticMirror?.present) throw new Error('Pinned v12 diagnostics unexpectedly contain FX exclusion records.')
    return { proofs: [] as RecordValue[], events: [] as RecordValue[] }
  }
  if (!hasProofs || !hasEvents || !hasValidationProofs || !hasValidationEvents
    || !Array.isArray(profile.fxExclusionProofs) || !Array.isArray(profile.excludedFxInstantiationEvents)
    || !Array.isArray(validation.fxExclusionProofs) || !Array.isArray(validation.excludedFxInstantiationEvents)) {
    throw new Error('Core cache FX exclusion proof and diagnostic arrays are incomplete.')
  }
  const proofs = profile.fxExclusionProofs as RecordValue[]
  const events = profile.excludedFxInstantiationEvents as RecordValue[]
  if (canonical(proofs) !== canonical(validation.fxExclusionProofs)
    || canonical(events) !== canonical(validation.excludedFxInstantiationEvents)) {
    throw new Error('Core cache FX exclusion records disagree with validation records.')
  }
  if (proofs.length !== events.length) throw new Error('Core cache FX exclusion proofs and diagnostics are not one-to-one.')
  if (diagnosticMirror && (!diagnosticMirror.present || !Array.isArray(diagnosticMirror.proofs)
    || !Array.isArray(diagnosticMirror.events) || canonical(diagnosticMirror.proofs) !== canonical(proofs)
    || canonical(diagnosticMirror.events) !== canonical(events))) {
    throw new Error('Core cache FX exclusion diagnostics do not match the embedded rendering-profile records.')
  }

  let coreKeys = { references: new Set<string>(), pointers: new Set<string>() }
  if (proofs.length) {
    const coreProfile = fxOverlapCoreProjection(profile)
    delete coreProfile.fxExclusionProofs
    delete coreProfile.excludedFxInstantiationEvents
    if (record(coreProfile.validation)) {
      delete coreProfile.validation.fxExclusionProofs
      delete coreProfile.validation.excludedFxInstantiationEvents
    }
    coreKeys = collectCoreIdentityKeys(coreProfile)
  }
  const proofByKey = new Map<string, RecordValue>()
  const allowedScripts = new Set(CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES.map(sourceReferenceKey))
  for (const proof of proofs) {
    if (!record(proof)) throw new Error('Core cache FX exclusion proof is malformed.')
    exactKeys(proof, FX_PROOF_KEYS, 'FX exclusion proof')
    const eventKey = fxEventKey(proof)
    if (proof.schemaVersion !== 1 || proof.policyVersion !== CHIBI_FX_EXCLUSION_POLICY_VERSION
      || proof.completeGraph !== true || proof.disjointFromCore !== true
      || proof.reasonCode !== 'SOURCE_PARTICLE_ONLY_FX_TARGET'
      || !Array.isArray(proof.evidence) || proof.evidence.length === 0
      || proof.evidence.some((item: unknown) => typeof item !== 'string' || !item)
      || !Array.isArray(proof.gameObjectReferences) || !proof.gameObjectReferences.length
      || !Array.isArray(proof.transformReferences) || !proof.transformReferences.length
      || !Array.isArray(proof.componentReferences) || !proof.componentReferences.length
      || !Array.isArray(proof.particleRendererReferences) || !proof.particleRendererReferences.length
      || !Array.isArray(proof.approvedMonoScriptReferences)
      || !Array.isArray(proof.rendererAssets) || !proof.rendererAssets.length) {
      throw new Error('Core cache FX exclusion proof is not complete particle-only evidence.')
    }
    const sourceClipKey = sourceReferenceKey(proof.eventSourceReference)
    const targetKey = sourceReferenceKey(proof.targetReference)
    const requiredEvidence = [
      `exact source AnimationClip ${sourceClipKey}`,
      `selected event is ${proof.function} at ${proof.clip} ${proof.time}s (source order ${proof.order})`,
      `exact target PPtr resolves to ${targetKey}`,
      'target graph contains no renderer, mesh, material, or transform identity shared with selected core character content',
    ]
    if (requiredEvidence.some(item => !proof.evidence.includes(item))) {
      throw new Error(`Core cache FX exclusion ${eventKey} is missing exact event, target, or core-disjointness evidence.`)
    }
    if (proofByKey.has(eventKey)) throw new Error('Core cache FX exclusion event identity is duplicated.')
    proofByKey.set(eventKey, proof)

    const graphReferences = [proof.targetReference, ...proof.gameObjectReferences, ...proof.transformReferences,
      ...proof.componentReferences.map((item: unknown) => {
        const component = record(item)
        if (!component || typeof component.type !== 'string'
          || !['Transform', 'RectTransform', 'ParticleSystem', 'ParticleSystemRenderer', 'MonoBehaviour'].includes(component.type)) {
          throw new Error('Core cache FX exclusion has an incomplete component identity.')
        }
        exactKeys(component, ['sourceReference', 'type'], 'FX component')
        return component.sourceReference
      }), ...proof.particleRendererReferences]
    const graphKeys = graphReferences.map(reference => referenceAndPointerKeys(reference, 'FX graph'))
    const rendererKeys = proof.particleRendererReferences.map(reference => sourceReferenceKey(reference))
    if (new Set(rendererKeys).size !== rendererKeys.length) throw new Error('Core cache FX particle renderer is duplicated.')
    for (const values of [proof.gameObjectReferences, proof.transformReferences,
      proof.componentReferences.map((item: RecordValue) => item.sourceReference),
      proof.particleRendererReferences]) {
      const keys = values.map((reference: unknown) => sourceReferenceKey(reference))
      if (new Set(keys).size !== keys.length) throw new Error('Core cache FX graph contains a duplicated source identity.')
    }
    for (const item of graphKeys) {
      if (coreKeys.references.has(item.referenceKey) || coreKeys.pointers.has(item.pointerKey)) {
        throw new Error('Core cache FX exclusion graph overlaps required core content.')
      }
    }

    const scriptKeys = proof.approvedMonoScriptReferences.map((reference: unknown) => sourceReferenceKey(reference))
    const monoBehaviourCount = proof.componentReferences.filter((item: RecordValue) => item.type === 'MonoBehaviour').length
    if (scriptKeys.length !== monoBehaviourCount || scriptKeys.some(key => !allowedScripts.has(key))) {
      throw new Error('Core cache FX exclusion uses an unapproved MonoScript identity.')
    }
    const componentRendererKeys = proof.componentReferences
      .filter((item: RecordValue) => item.type === 'ParticleSystemRenderer')
      .map((item: RecordValue) => sourceReferenceKey(item.sourceReference)).sort()
    if (!componentRendererKeys.length || canonical(componentRendererKeys) !== canonical([...rendererKeys].sort())) {
      throw new Error('Core cache FX particle renderer records do not match exact ParticleSystemRenderer components.')
    }
    const assets = new Map<string, RecordValue>()
    for (const value of proof.rendererAssets) {
      const asset = record(value)
      if (!asset) throw new Error('Core cache FX renderer asset evidence is malformed.')
      exactKeys(asset, ['rendererReference', 'meshReference', 'materialReferences'], 'FX renderer asset')
      const key = sourceReferenceKey(asset.rendererReference)
      if (assets.has(key) || !Array.isArray(asset.materialReferences) || !asset.meshReference) {
        throw new Error('Core cache FX renderer asset evidence is incomplete or duplicated.')
      }
      assets.set(key, asset)
      for (const pointerEvidence of [asset.meshReference, ...asset.materialReferences]) {
        const identity = validateFxPPtrEvidence(pointerEvidence, 'renderer asset')
        if ((identity.sourceKey && coreKeys.references.has(identity.sourceKey))
          || (identity.pointerKey && coreKeys.pointers.has(identity.pointerKey))) {
          throw new Error('Core cache FX renderer asset overlaps required core content.')
        }
      }
    }
    if (assets.size !== rendererKeys.length || rendererKeys.some(key => !assets.has(key))) {
      throw new Error('Core cache FX renderer assets do not exactly match particle renderer references.')
    }
  }
  const eventByKey = new Map<string, RecordValue>()
  for (const event of events) {
    if (!record(event)) throw new Error('Core cache FX exclusion diagnostic is malformed.')
    exactKeys(event, FX_EVENT_KEYS, 'FX exclusion diagnostic')
    const eventKey = fxEventKey(event)
    if (eventByKey.has(eventKey) || !isChibiInstantiateFxEventFunction(event.function) || event.reasonCode !== 'PRESENTATION_FX_INSTANTIATION'
      || !Array.isArray(event.evidence) || event.evidence.length === 0
      || event.evidence.some((item: unknown) => typeof item !== 'string' || !item)) {
      throw new Error('Core cache FX exclusion diagnostic is incomplete or duplicated.')
    }
    eventByKey.set(eventKey, event)
  }
  for (const [key, proof] of proofByKey) {
    const event = eventByKey.get(key)
    if (!event || canonical(proof.evidence) !== canonical(event.evidence)) {
      throw new Error('Core cache FX proof and diagnostic evidence do not match one-to-one.')
    }
  }
  return { proofs, events }
}

function assertRenderingProfile(profileValue: unknown) {
  const profile = record(profileValue)
  const validation = record(profile?.validation)
  if (!profile || profile.schemaVersion !== 2 || !validation || validation.valid !== true
    || !Array.isArray(validation.unresolved) || validation.unresolved.length !== 0
    || !Array.isArray(profile.renderers) || !Array.isArray(profile.childRendererEvents)
    || !Array.isArray(profile.excludedRenderers) || !Array.isArray(profile.excludedChildRendererEvents)
    || !Array.isArray(profile.coreRendererBlockers) || !Array.isArray(profile.coreGeometryBlockers)
    || !Array.isArray(profile.equipmentBindingEvidence) || !Array.isArray(profile.drawSequence)
    || !record(profile.sourcePrefab) || !('assembly' in profile)) {
    throw new Error('Core cache rendering profile is incomplete or unresolved.')
  }
  requireString(profile.sourceIdentity, 'rendering-profile source identity')
  requireString(profile.dependencyFingerprint, 'rendering-profile dependency fingerprint')
  requireString(profile.adapterVersion, 'rendering-profile adapter version')
  requireString(profile.profileVersion, 'rendering-profile version')
  requireString(profile.policyVersion, 'rendering-policy version')
  const coreGeometryWarnings = profile.coreGeometryWarnings
  const validationCoreGeometryWarnings = validation.coreGeometryWarnings
  if ((coreGeometryWarnings !== undefined || validationCoreGeometryWarnings !== undefined)
    && (!Array.isArray(coreGeometryWarnings) || !Array.isArray(validationCoreGeometryWarnings)
      || canonical(coreGeometryWarnings) !== canonical(validationCoreGeometryWarnings))) {
    throw new Error('Core cache core geometry warning arrays are incomplete or inconsistent.')
  }
  validateFxExclusionDiagnostics(profile, undefined, true)
  return profile
}

function omitDerivedGlbBindings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitDerivedGlbBindings)
  const object = record(value)
  if (!object) return value
  const result: RecordValue = {}
  for (const [key, item] of Object.entries(object)) {
    if (key === 'glbNodeIndex' || key === 'glb' || key === 'glbPrimitiveIndices' || key === 'glbMaterialIndex') continue
    result[key] = omitDerivedGlbBindings(item)
  }
  return result
}

/** Keeps every source decision while removing only versioned diagnostics and post-export GLB indices. */
export function actionableRenderingProfile(profileValue: unknown) {
  const profile = assertRenderingProfile(profileValue)
  const copy = JSON.parse(JSON.stringify(profile)) as RecordValue
  delete copy.profileVersion
  delete copy.policyVersion
  delete copy.warnings
  delete copy.coreGeometryWarnings
  delete copy.fxExclusionProofs
  delete copy.excludedFxInstantiationEvents
  if (record(copy.validation)) {
    delete copy.validation.warnings
    delete copy.validation.coreGeometryWarnings
    delete copy.validation.unresolved
    delete copy.validation.fxExclusionProofs
    delete copy.validation.excludedFxInstantiationEvents
  }
  return omitDerivedGlbBindings(copy)
}

export function renderingProfileCoreFingerprint(profile: unknown) {
  return sha256(canonical(actionableRenderingProfile(profile)))
}

export function effectiveClipSelection(profileValue: unknown): { initialPose: string | null; clips: string[] } {
  const profile = record(profileValue)
  const interactions = record(profile?.interactions)
  if (!profile || !interactions || (profile.initialPose !== null && typeof profile.initialPose !== 'string')) {
    throw new Error('Core cache interaction profile is incomplete.')
  }
  const initialPose = profile.initialPose as string | null
  const clips: string[] = []
  if (initialPose) clips.push(initialPose)
  for (const action of ACTIONS) {
    const interaction = record(interactions[action])
    if (!interaction || !['available', 'unsupported', 'unresolved', 'failed'].includes(interaction.state)) {
      throw new Error(`Core cache interaction ${action} is incomplete.`)
    }
    if (interaction.state === 'available') {
      if (typeof interaction.clip !== 'string' || !interaction.clip) throw new Error(`Core cache interaction ${action} has no clip.`)
      clips.push(interaction.clip)
    }
  }
  return { initialPose, clips: [...new Set(clips)] }
}

export function buildCoreFingerprint(input: {
  sourceIdentity: string
  dependencyFingerprint: string
  converterVersion: string
  materialVersion: string
  adapterVersion: string
  exportOverrides: unknown
  profile: unknown
  initialPose: string | null
  clips: readonly string[]
}) {
  const profile = assertRenderingProfile(input.profile)
  if (profile.sourceIdentity !== input.sourceIdentity || profile.dependencyFingerprint !== input.dependencyFingerprint
    || profile.adapterVersion !== input.adapterVersion) {
    throw new Error('Core cache rendering profile does not match its source identity and dependencies.')
  }
  const dependencyFingerprint = requireString(input.dependencyFingerprint, 'dependency fingerprint')
  if (!/^[0-9a-f]{64}$/i.test(dependencyFingerprint)) throw new Error('Core cache dependency fingerprint is malformed.')
  const clips = [...input.clips]
  if (clips.some(clip => typeof clip !== 'string' || !clip) || new Set(clips).size !== clips.length
    || (input.initialPose !== null && (typeof input.initialPose !== 'string' || !input.initialPose))
    || (input.initialPose && !clips.includes(input.initialPose))) {
    throw new Error('Core cache effective clips or initial pose are incomplete.')
  }
  const exportOverrides = input.exportOverrides ?? {}
  const object = record(exportOverrides)
  if (!object) throw new Error('Core cache export overrides are invalid.')
  const hashInput = {
    schemaVersion: CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION,
    sourceIdentity: requireString(input.sourceIdentity, 'source identity'),
    dependencyFingerprint,
    converterVersion: requireString(input.converterVersion, 'converter version'),
    materialVersion: requireString(input.materialVersion, 'material version'),
    adapterVersion: requireString(input.adapterVersion, 'adapter version'),
    exportOverrides,
    initialPose: input.initialPose,
    clips,
    renderingProfile: actionableRenderingProfile(profile),
  }
  return `v${CHIBI_CORE_FINGERPRINT_SCHEMA_VERSION}:${sha256(canonical(hashInput))}`
}

function exportOverrideValue(value: unknown) {
  const overrides = record(value)
  return overrides && 'export' in overrides ? overrides.export : {}
}

/** Reproduces the only accepted legacy key format: the pinned v12 worker identity. */
export function buildPinnedV12Fingerprint(dependencyFingerprint: string, overrides: unknown) {
  return sha256(canonical({
    source: dependencyFingerprint,
    exporter: V12_IDENTITY.exporterVersion,
    materials: V12_IDENTITY.materialVersion,
    exportOverrides: exportOverrideValue(overrides),
    renderingProfile: V12_IDENTITY.renderingProfileVersion,
    renderingPolicy: V12_IDENTITY.renderingPolicyVersion,
    shaderAdapters: V12_IDENTITY.shaderAdapterVersion,
  }))
}

export function pinnedV12AssetMatches(input: {
  asset: {
    id: string; sourceIdentity: string; dependencyFingerprint: string; exporterVersion: string
    fingerprint: string; clips: unknown
  }
  binding: { assetId?: string | null; profile: unknown }
  candidate: { sourceIdentity: string; fingerprint: string }
  overrides: unknown
  effectiveProfile: unknown
}) {
  const { asset, binding, candidate } = input
  let selected: { initialPose: string | null; clips: string[] }
  let persisted: { initialPose: string | null; clips: string[] }
  try {
    selected = effectiveClipSelection(input.effectiveProfile)
    persisted = effectiveClipSelection(binding.profile)
  } catch { return false }
  const oldClips = Array.isArray(asset.clips) && asset.clips.every(clip => typeof clip === 'string') ? asset.clips as string[] : null
  const sorted = (clips: readonly string[]) => [...clips].sort((left, right) => left.localeCompare(right))
  return asset.id.length > 0
    && binding.assetId === asset.id
    && asset.sourceIdentity === candidate.sourceIdentity
    && asset.dependencyFingerprint === candidate.fingerprint
    && asset.exporterVersion === V12_IDENTITY.exporterVersion
    && asset.fingerprint === buildPinnedV12Fingerprint(candidate.fingerprint, input.overrides)
    && oldClips !== null
    && new Set(oldClips).size === oldClips.length
    && canonical(sorted(oldClips)) === canonical(sorted(selected.clips))
    && persisted.initialPose === selected.initialPose
    && canonical(persisted.clips) === canonical(selected.clips)
}

/** Strict bridge gate for the one supported legacy cohort; never use for unknown old schemas. */
export function assertPinnedV12GlbProfile(bytes: Buffer, sourceIdentity: string, dependencyFingerprint: string) {
  const parsed = parseGlb(bytes)
  if (parsed.json.asset?.version !== '2.0' || parsed.json.asset?.generator !== 'FBX2glTF v0.13.1') {
    throw new Error('Legacy cache reuse requires the pinned v12 GLB generator and schema.')
  }
  const locations = profileLocations(parsed.json)
  const profile = assertCacheableProfile(locations.profile)
  assertEmbeddedPolicyDiagnostics(locations, profile)
  if (profile.profileVersion !== V12_IDENTITY.renderingProfileVersion
    || profile.policyVersion !== V12_IDENTITY.renderingPolicyVersion
    || profile.adapterVersion !== V12_IDENTITY.shaderAdapterVersion
    || profile.sourceIdentity !== sourceIdentity
    || profile.dependencyFingerprint !== dependencyFingerprint) {
    throw new Error('Legacy cache reuse requires the pinned v12 profile schema and exact source identity.')
  }
  return profile
}

type GlbChunk = { type: number; bytes: Buffer }
type ParsedGlb = { json: RecordValue; chunks: GlbChunk[]; jsonChunkIndex: number }

function parseGlb(bytes: Buffer): ParsedGlb {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2
    || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Metadata reuse requires a valid immutable GLB 2.0 artifact.')
  const chunks: GlbChunk[] = []
  let offset = 12
  let jsonChunkIndex = -1
  let binaryChunkCount = 0
  let json: RecordValue | null = null
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error('Metadata reuse found a truncated GLB chunk header.')
    const length = bytes.readUInt32LE(offset)
    const type = bytes.readUInt32LE(offset + 4)
    const end = offset + 8 + length
    if (length % 4 !== 0 || end > bytes.length) throw new Error('Metadata reuse found an invalid GLB chunk.')
    const chunk = Buffer.from(bytes.subarray(offset + 8, end))
    chunks.push({ type, bytes: chunk })
    if (type === 0x004e4942) binaryChunkCount += 1
    if (type === 0x4e4f534a) {
      if (json) throw new Error('Metadata reuse found duplicate GLB JSON chunks.')
      try { json = record(JSON.parse(chunk.toString('utf8').trim())) } catch { json = null }
      if (!json) throw new Error('Metadata reuse found invalid GLB JSON.')
      jsonChunkIndex = chunks.length - 1
    }
    offset = end
  }
  if (jsonChunkIndex !== 0 || !json || binaryChunkCount !== 1) {
    throw new Error('Metadata reuse requires the standard GLB JSON and binary chunks.')
  }
  return { json, chunks, jsonChunkIndex }
}

function profileLocations(json: RecordValue) {
  const scenes = json.scenes
  const sceneIndex = Number.isInteger(json.scene) ? json.scene : 0
  const scene = Array.isArray(scenes) ? record(scenes[sceneIndex]) : null
  const extras = record(scene?.extras)
  const chibi = record(extras?.chibi)
  const profile = record(chibi?.renderingProfile)
  const diagnostics = record(chibi?.renderingProfileDiagnostics)
  if (!scene || !extras || !chibi || !profile || !diagnostics) throw new Error('Metadata reuse requires embedded rendering-profile diagnostics.')
  return { scene, extras, chibi, profile, diagnostics }
}

function assertCacheableProfile(profileValue: unknown) {
  const profile = assertRenderingProfile(profileValue)
  if (profile.schemaVersion !== 2 || !Array.isArray(profile.warnings) || !Array.isArray(profile.validation?.warnings)) {
    // Empty diagnostics are valid but still must have an explicit canonical shape.
    if (profile.warnings !== undefined && !Array.isArray(profile.warnings)) throw new Error('Rendering-profile warnings have an unsupported schema.')
    if (profile.validation?.warnings !== undefined && !Array.isArray(profile.validation.warnings)) throw new Error('Rendering-profile validation warnings have an unsupported schema.')
  }
  return profile
}

function assertEmbeddedPolicyDiagnostics(locations: ReturnType<typeof profileLocations>, oldProfile: RecordValue) {
  if (locations.diagnostics.schemaVersion !== 1
    || locations.diagnostics.policyVersion !== oldProfile.policyVersion
    || !Array.isArray(locations.diagnostics.intentionallyExcludedRenderers)
    || !Array.isArray(locations.diagnostics.excludedChildRendererEvents)
    || !Array.isArray(locations.diagnostics.unprofiledGeometry)
    || locations.diagnostics.unprofiledGeometry.length !== 0) {
    throw new Error('Metadata reuse rejected because prior diagnostics are incomplete or unresolved.')
  }
  validateFxExclusionDiagnostics(oldProfile, {
    present: Object.hasOwn(locations.diagnostics, 'fxExclusionProofs')
      || Object.hasOwn(locations.diagnostics, 'excludedFxInstantiationEvents'),
    proofs: locations.diagnostics.fxExclusionProofs,
    events: locations.diagnostics.excludedFxInstantiationEvents,
  }, true)
}

export function assertGlbCoreProfileMatches(bytes: Buffer, currentProfileValue: unknown) {
  const currentProfile = assertCacheableProfile(currentProfileValue)
  const parsed = parseGlb(bytes)
  const locations = profileLocations(parsed.json)
  const oldProfile = assertCacheableProfile(locations.profile)
  assertEmbeddedPolicyDiagnostics(locations, oldProfile)
  if (oldProfile.adapterVersion !== currentProfile.adapterVersion
    || canonical(actionableRenderingProfile(oldProfile)) !== canonical(actionableRenderingProfile(currentProfile))) {
    throw new Error('Metadata reuse rejected because actionable rendering decisions changed.')
  }
  return oldProfile
}

function removeDiagnosticAllowlist(jsonValue: unknown): unknown {
  const json = JSON.parse(JSON.stringify(jsonValue)) as RecordValue
  const locations = profileLocations(json)
  const profile = assertCacheableProfile(locations.profile)
  assertEmbeddedPolicyDiagnostics(locations, profile)
  for (const key of ['profileVersion', 'policyVersion', 'warnings', 'coreGeometryWarnings']) delete locations.profile[key]
  delete locations.profile.fxExclusionProofs
  delete locations.profile.excludedFxInstantiationEvents
  const validation = record(locations.profile.validation)
  if (validation) {
    delete validation.warnings
    delete validation.coreGeometryWarnings
    delete validation.fxExclusionProofs
    delete validation.excludedFxInstantiationEvents
  }
  delete locations.diagnostics.policyVersion
  delete locations.diagnostics.fxExclusionProofs
  delete locations.diagnostics.excludedFxInstantiationEvents
  delete locations.diagnostics.skinSkeletonMetadataVersion
  delete locations.diagnostics.skinSkeletonRepairs
  return json
}

function skinSkeletonRewriteState(json: RecordValue, diagnostics: RecordValue) {
  const hasVersion = Object.hasOwn(diagnostics, 'skinSkeletonMetadataVersion')
  const hasRecords = Object.hasOwn(diagnostics, 'skinSkeletonRepairs')
  if (hasVersion || hasRecords) {
    const repairs = assertSkinSkeletonRepairRecords(json, diagnostics, true)
    return { repairs, apply: false }
  }
  const repairs = skinSkeletonRepairPlan(json)
  return { repairs, apply: true }
}

function encodeGlb(chunks: GlbChunk[]) {
  const encodedChunks = chunks.map(chunk => {
    const header = Buffer.alloc(8)
    header.writeUInt32LE(chunk.bytes.length, 0)
    header.writeUInt32LE(chunk.type, 4)
    return Buffer.concat([header, chunk.bytes])
  })
  const result = Buffer.alloc(12 + encodedChunks.reduce((size, chunk) => size + chunk.length, 0))
  result.write('glTF', 0)
  result.writeUInt32LE(2, 4)
  result.writeUInt32LE(result.length, 8)
  let offset = 12
  for (const chunk of encodedChunks) { chunk.copy(result, offset); offset += chunk.length }
  return result
}

function jsonChunk(value: unknown): Buffer {
  const serialized = Buffer.from(JSON.stringify(value), 'utf8')
  return Buffer.concat([serialized, Buffer.alloc((4 - serialized.length % 4) % 4, 0x20)])
}

/** Verifies that only allowlisted diagnostics and proven skin.skeleton root indices changed. */
export function assertMetadataOnlyGlbRewrite(beforeBytes: Buffer, afterBytes: Buffer) {
  const before = parseGlb(beforeBytes)
  const after = parseGlb(afterBytes)
  const beforeLocations = profileLocations(before.json)
  const afterLocations = profileLocations(after.json)
  const skeletonState = skinSkeletonRewriteState(before.json, beforeLocations.diagnostics)
  const expectedAfter = cloneJsonValue(before.json)
  if (skeletonState.apply) applySkinSkeletonRepairPlan(expectedAfter, skeletonState.repairs)
  if (canonical(removeDiagnosticAllowlist(expectedAfter)) !== canonical(removeDiagnosticAllowlist(after.json))) {
    throw new Error('Metadata rewrite changed non-allowlisted GLB JSON.')
  }
  if (before.chunks.length !== after.chunks.length || before.jsonChunkIndex !== after.jsonChunkIndex) {
    throw new Error('Metadata rewrite changed GLB chunk structure.')
  }
  for (const [index, chunk] of before.chunks.entries()) {
    if (index === before.jsonChunkIndex) continue
    const actual = after.chunks[index]
    if (actual.type !== chunk.type || !actual.bytes.equals(chunk.bytes)) {
      throw new Error(chunk.type === 0x004e4942
        ? 'Metadata rewrite changed GLB BIN bytes.'
      : 'Metadata rewrite changed a non-JSON GLB chunk.')
    }
  }
  const afterRepairs = assertSkinSkeletonRepairRecords(after.json, afterLocations.diagnostics, true)
  if (canonical(afterRepairs) !== canonical(skeletonState.repairs)) {
    throw new Error('Metadata rewrite changed the typed skin skeleton repair proof.')
  }
}

/** Rewrites allowlisted diagnostics plus only proven non-ancestor skin.skeleton indices. */
export function rewriteGlbDiagnostics(bytes: Buffer, currentProfileValue: unknown) {
  const currentProfile = assertCacheableProfile(currentProfileValue)
  const parsed = parseGlb(bytes)
  const locations = profileLocations(parsed.json)
  const oldProfile = assertGlbCoreProfileMatches(bytes, currentProfile)
  const skeletonState = skinSkeletonRewriteState(parsed.json, locations.diagnostics)
  if (skeletonState.apply) applySkinSkeletonRepairPlan(parsed.json, skeletonState.repairs)
  const fxDiagnostics = validateFxExclusionDiagnostics(currentProfile, undefined, true)
  const updatedProfile: RecordValue = {
    ...oldProfile,
    profileVersion: currentProfile.profileVersion,
    policyVersion: currentProfile.policyVersion,
    ...(currentProfile.warnings === undefined ? {} : { warnings: currentProfile.warnings }),
    ...(currentProfile.coreGeometryWarnings === undefined ? {} : { coreGeometryWarnings: currentProfile.coreGeometryWarnings }),
    validation: {
      ...oldProfile.validation,
      ...(Object.hasOwn(currentProfile, 'fxExclusionProofs') ? {
        fxExclusionProofs: fxDiagnostics.proofs,
        excludedFxInstantiationEvents: fxDiagnostics.events,
      } : {}),
      ...(currentProfile.validation.warnings === undefined ? {} : { warnings: currentProfile.validation.warnings }),
      ...(currentProfile.validation.coreGeometryWarnings === undefined ? {} : { coreGeometryWarnings: currentProfile.validation.coreGeometryWarnings }),
    },
  }
  if (currentProfile.warnings === undefined) delete updatedProfile.warnings
  if (currentProfile.validation.warnings === undefined) delete updatedProfile.validation.warnings
  if (currentProfile.coreGeometryWarnings === undefined) delete updatedProfile.coreGeometryWarnings
  if (currentProfile.validation.coreGeometryWarnings === undefined) delete updatedProfile.validation.coreGeometryWarnings
  if (Object.hasOwn(currentProfile, 'fxExclusionProofs')) {
    updatedProfile.fxExclusionProofs = fxDiagnostics.proofs
    updatedProfile.excludedFxInstantiationEvents = fxDiagnostics.events
  }
  locations.chibi.renderingProfile = updatedProfile
  locations.chibi.renderingProfileDiagnostics = {
    ...locations.diagnostics,
    policyVersion: currentProfile.policyVersion,
    skinSkeletonMetadataVersion: CHIBI_SKIN_SKELETON_METADATA_VERSION,
    skinSkeletonRepairs: skeletonState.repairs,
    ...(Object.hasOwn(currentProfile, 'fxExclusionProofs') ? {
      fxExclusionProofs: fxDiagnostics.proofs,
      excludedFxInstantiationEvents: fxDiagnostics.events,
    } : {}),
  }
  const chunks = parsed.chunks.map((chunk, index) => index === parsed.jsonChunkIndex
    ? { ...chunk, bytes: jsonChunk(parsed.json) }
    : { type: chunk.type, bytes: Buffer.from(chunk.bytes) })
  const rewritten = encodeGlb(chunks)
  assertMetadataOnlyGlbRewrite(bytes, rewritten)
  return { bytes: rewritten, renderingProfile: updatedProfile, skinSkeletonRepairs: skeletonState.repairs }
}
