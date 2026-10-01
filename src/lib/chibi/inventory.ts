import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

import { chibiRoots } from './storage'
import { isChibiInstantiateFxEventFunction } from './fx-event-policy'
import type { InventoryBuiltinResourceReference } from './unity-builtin'

export {
  UNITY_BUILTIN_RESOURCES_GUID,
  UNITY_BUILTIN_RESOURCES_FILE,
  UNITY_BUILTIN_QUAD_PATH_ID,
  UNITY_BUILTIN_QUAD_NAME,
  unityBuiltinQuadReference,
} from './unity-builtin'
export type { InventoryBuiltinResourceReference } from './unity-builtin'
export { CHIBI_INSTANTIATE_FX_EVENT_FUNCTIONS, isChibiInstantiateFxEventFunction } from './fx-event-policy'
export type { ChibiInstantiateFxEventFunction } from './fx-event-policy'

export interface InventorySourceReference { bundleSha256: string; serializedFile: string; objectId: string }

export interface InventoryPointer {
  file: string
  pathId: string
  /** Serialized GUID of an external PPtr, retained for fail-closed identity checks. */
  externalGuid?: string | null
  /** Typed identity for the one accepted Unity built-in mesh resource. */
  builtinResource?: InventoryBuiltinResourceReference | null
}

export interface InventoryObject { type: string; name: string; pathId: string; file?: string; sourceReference?: InventorySourceReference }
export interface InventoryEvent {
  clip: string; time: number; function: string; string: string; float: number; int: number
  /** Exact AnimationClip object identity for an InstantiateFx event. */
  sourceClipReference?: InventorySourceReference | null
  /** Raw AnimationEvent.objectReferenceParameter, when source-authored. */
  target?: InventoryPointer | null
  /** Resolved full source identity; never inferred from intParameter or export order. */
  targetReference?: InventorySourceReference | null
  /** Exact FX prefab container and complete source graph resolved from target PPtr. */
  fxTargetReference?: InventorySourceReference | null
  fxTargetEvidence?: InventoryFxTargetEvidence | null
  fxTargetResolution?: { status: 'resolved' | 'missing' | 'ambiguous'; reason: string; candidateCount: number }
}
export interface InventoryDependency { name: string; path: string }
export interface InventoryFxPPtrEvidence {
  pointer: InventoryPointer | null
  fileID: number | null
  identityResolved: boolean
  objectResolved: boolean
  sourceReference: InventorySourceReference | null
}
export interface InventoryFxRendererAssetEvidence {
  rendererReference: InventorySourceReference
  mesh: InventoryFxPPtrEvidence | null
  materials: InventoryFxPPtrEvidence[]
}
export interface InventoryFxTargetEvidence {
  schemaVersion: 1
  target: InventoryPointer | null
  targetReference: InventorySourceReference | null
  rootType: string | null
  completeTraversal: boolean
  classification: string
  gameObjectCount: number
  componentTypeCounts: Record<string, number>
  gameObjectReferences: InventorySourceReference[]
  transformReferences: InventorySourceReference[]
  componentReferences: { sourceReference: InventorySourceReference; type: string }[]
  rendererAssets: InventoryFxRendererAssetEvidence[]
  rendererAssetEvidenceComplete: boolean
  monoBehaviours: {
    componentIdentity: { serializedFile: string; pathId: string; type: string }
    gameObjectIdentity: { serializedFile: string; pathId: string; name: string | null }
    scriptPPtr: { fileID: number; serializedFile: string | null; pathId: string; externalGuid: string | null; identityResolved: boolean; objectResolved: boolean; resolution: string }
    serializedFieldNames: string[]
    serializedFieldPPtrs: { fieldPath: string; fileID: number; serializedFile: string | null; pathId: string; externalGuid: string | null; identityResolved: boolean; objectResolved: boolean; resolution: string }[]
  }[]
  approvedMonoScriptReferences: InventorySourceReference[]
  monoScriptPolicyComplete: boolean
  targetGraphPolicyVersion: string
  targetGraphEligible: boolean
  targetGraphEvidence: string[]
  particleComponentTypes: string[]
  coreComponentTypes: string[]
  unknownComponentTypes: string[]
  reasons: string[]
}
export interface InventoryContainer {
  path: string
  target: InventoryPointer | null
  targetReference?: InventorySourceReference | null
  fxTargetEvidence?: InventoryFxTargetEvidence | null
}
export interface InventoryTexture { name: string; pathId: string; file: string; sourceReference?: InventorySourceReference; width: number; height: number }
export interface InventoryTextureProperty { name: string; texture: InventoryPointer | null; scale?: { x: number | string; y: number | string } | null; offset?: { x: number | string; y: number | string } | null; textureReference?: InventorySourceReference | null }
export interface InventoryMaterial {
  name: string; pathId: string; file: string; sourceReference?: InventorySourceReference; shader: InventoryPointer | null; shaderReference?: InventorySourceReference | null; shaderName?: string | null; shaderParsedName?: string | null; renderQueue: number; keywords: string[]
  textures: InventoryTextureProperty[]; floatProperties?: Record<string, number | string>; intProperties?: Record<string, number>; colorProperties?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>; disabledShaderPasses?: string[]
}
export interface InventoryShader {
  name: string; parsedName?: string; pathId: string; file: string; sourceReference?: InventorySourceReference
  properties?: unknown; subShaders?: { tags?: unknown; lod?: number; passes: { type?: number; name?: string; useName?: string; tags?: unknown; state?: unknown }[] }[]
  programBlobSha256?: string | null
  /** Source-derived Unity shader programs for an adapter that needs them. */
  extraction?: InventoryShaderExtraction | null
  /** Extraction failures remain visible so profile construction can block. */
  extractionError?: string | null
}

export interface InventoryShaderExtractionProgram {
  kind: 'program' | 'parameters'
  blobIndex: number
  platform: number
  platformName?: string
  gpuProgramType: number
  gpuProgramTypeName?: string
  programHash?: string
  programDataSha256?: string
  programDataLength?: number
  glsl?: string
  recordSha256?: string
}

export interface InventoryShaderExtractionBinding {
  subShaderIndex: number
  passIndex: number
  passName?: string | null
  stateName?: string | null
  stage: string
  blobIndex: number
  parameterBlobIndex?: number | null
  platform: number
  gpuProgramType: number
  gpuProgramTypeName?: string
  keywordIndices: number[]
  keywordNames: string[]
  programHash?: string
  gles3ProgramHash?: string | null
  programRecordSha256?: string
  parameterRecordSha256?: string | null
}

export interface InventoryShaderExtraction {
  schemaVersion: number
  extractorVersion: number
  unityVersion: string
  fingerprint: string
  compressedBlobSha256: string
  shader: {
    name: string
    sourceReference: InventorySourceReference
    keywordNames: string[]
  }
  programs: InventoryShaderExtractionProgram[]
  gles3Programs: InventoryShaderExtractionProgram[]
  bindings: InventoryShaderExtractionBinding[]
}
export interface InventoryMaterialSlot { slot: number; material: InventoryPointer | null; sourceMaterialReference?: InventorySourceReference | null }
/**
 * A serialized scene/component pointer.  Assembly pointers intentionally keep
 * the optional file field because older fixtures only carried pathId, while
 * source inventory records carry both values for exact cross-file identity.
 */
export interface InventoryAssemblyPointer { pathId: string; file?: string; name?: string | null; sourceReference?: InventorySourceReference | null }
export interface InventoryAssemblyRenderer {
  name: string; pathId: string; sourceReference?: InventorySourceReference; rendererType?: string; hierarchyPath?: string
  enabled: boolean; gameObjectActive?: boolean; visible?: boolean; rootBone?: InventoryAssemblyPointer | null
  /** Exact root-to-renderer Transform identities from the source prefab. */
  transformChain?: InventoryAssemblyPointer[] | null
  /** Exact SkinnedMeshRenderer.m_Bones identities from the source prefab. */
  boneReferences?: InventoryAssemblyPointer[] | null
  mesh?: InventoryPointer | null; meshSourceReference?: InventorySourceReference | null; materialSlots?: InventoryMaterialSlot[]
}
export interface InventoryEquipmentRendererGroup {
  /** Source-authored attachment slot or exact structural weapon anchor. */
  kind: 'mainWeapon' | 'subWeapon' | 'structuralWeapon'
  attachment: InventoryAssemblyPointer
  /** Every renderer selected by the exact attachment pointer. */
  sourceReferences: InventorySourceReference[]
  /** Exact source observations used to promote the group out of ambiguity. */
  evidence: string[]
}
export interface InventoryAssemblyAttachment {
  mainWeapon?: InventoryAssemblyPointer[]
  subWeapon?: InventoryAssemblyPointer[]
  eyes?: InventoryAssemblyPointer[]
  headBone?: InventoryAssemblyPointer[]
  fxParentBones?: InventoryAssemblyPointer[]
  equipmentRenderers?: string[]
  /** Exact source identities for equipment renderers with one relation match. */
  equipmentRendererReferences?: InventorySourceReference[]
  /** Strict one-to-many source-authored equipment groups. */
  equipmentRendererGroups?: InventoryEquipmentRendererGroup[]
  /** Renderer-name matches that cannot be selected without guessing. */
  equipmentRendererAmbiguities?: {
    name: string; attachment?: InventoryAssemblyPointer; sourceReferences: InventorySourceReference[]; reasonCode: string
  }[]
  mouthRenderer?: { pathId: string; file?: string; name?: string | null; sourceReference?: InventorySourceReference | null }[]
  mouthMetadata?: {
    renderer: { pathId: string; file?: string; name?: string | null }
    sourceRendererReference?: InventorySourceReference | null
    materialIndex?: number | null
    defaultUV?: { x: number; y: number } | null
  }[]
  mouthMaterialIndex?: number
  mouthDefaultUV?: { x: number; y: number }
}
export interface InventoryAssembly {
  root: string; prefabPath?: string; prefabTarget?: InventoryPointer | null; prefabReference?: InventorySourceReference | null
  rendererOrder: string[]; renderers: InventoryAssemblyRenderer[]; sortingGroups?: unknown[]; attachments: InventoryAssemblyAttachment
}
export interface InventoryMetadata {
  serializedFiles?: string[]
  objects: InventoryObject[]
  containers?: InventoryContainer[]
  dependencies: (InventoryDependency | string)[]
  events: InventoryEvent[]
  materials?: InventoryMaterial[]
  textures?: InventoryTexture[]
  shaders?: InventoryShader[]
  assembly?: InventoryAssembly[]
  error?: string
  objectErrors?: { type: string; pathId: string; error: string }[]
}
export interface InventoryEntry { path: string; size: number; compressedSize: number; crc32: string; sha256: string | null; error?: string; metadata?: InventoryMetadata }
export interface InventoryFile {
  path: string; size: number; modifiedNs?: number; sha256: string; kind: 'archive' | 'bundle' | 'file'; entries: InventoryEntry[]; error?: string
}
export interface SourcePart {
  archivePath: string; archiveSha256: string; entryPath: string; entrySize: number; entryCrc32: string; sha256: string
  family: string; revision: string | null; sourceKind?: 'archive' | 'bundle'
}
export interface ResolvedMaterial extends InventoryMaterial {
  shaderName: string | null; resolvedTextures: { property: string; name: string; width: number; height: number; sourceReference?: InventorySourceReference; scale?: { x: number | string; y: number | string } | null; offset?: { x: number | string; y: number | string } | null }[]
}
export interface SourceCandidate {
  sourceIdentity: string; fingerprint: string; conflict: boolean; parts: SourcePart[]; families: string[]; revisions: string[]
  clips: string[]; objectNames: string[]; materials: string[]; dependencies: string[]; events: InventoryEvent[]
  prefabPaths?: string[]; materialMetadata?: ResolvedMaterial[]; sourceMaterials?: ResolvedMaterial[]; shaders?: InventoryShader[]; unresolvedDependencies?: string[]
  assembly?: InventoryAssembly[]
}
export interface InventoryReport { version: 1 | 2; source: string; files: InventoryFile[]; candidates: SourceCandidate[]; errors: { path: string; error: string }[] }

export function inventoryDiagnosticSummary(report: InventoryReport) {
  return {
    format: 'compact-diagnostic-v1',
    version: report.version,
    source: report.source,
    files: report.files.map(file => ({
      path: file.path, size: file.size, modifiedNs: file.modifiedNs, sha256: file.sha256, kind: file.kind, error: file.error,
      entries: file.entries.map(entry => ({
        path: entry.path, size: entry.size, compressedSize: entry.compressedSize, crc32: entry.crc32, sha256: entry.sha256, error: entry.error,
      })),
    })),
    candidates: report.candidates.map(candidate => ({
      sourceIdentity: candidate.sourceIdentity, fingerprint: candidate.fingerprint, conflict: candidate.conflict,
      parts: candidate.parts, families: candidate.families, revisions: candidate.revisions, clips: candidate.clips,
      objectNames: candidate.objectNames, materials: candidate.materials, dependencies: candidate.dependencies,
      prefabPaths: candidate.prefabPaths, unresolvedDependencies: candidate.unresolvedDependencies,
      eventCount: candidate.events.length, assembly: candidate.assembly ?? [],
    })),
    errors: report.errors,
  }
}

const CHARACTER_PARTS = [
  /^assets-_mx-characters-(.+?)-_mxdependency-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$/i,
  /^character-(.+?)-_mxload-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$/i,
  /^cafe-characteranimation-(.+?)-_mxload-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$/i,
]

export function parseCharacterPart(entryPath: string) {
  const name = entryPath.replaceAll('\\', '/').split('/').at(-1) ?? ''
  const match = CHARACTER_PARTS.map(pattern => name.match(pattern)).find(Boolean)
  return match ? { sourceIdentity: match[1].toLowerCase(), family: match[2].toLowerCase(), revision: match[3] } : null
}

function normalizedFile(value: string) { return value.replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() ?? '' }

function familyClaim(ref: EntryRef) {
  const name = normalizedFile(ref.entry.path)
  const scope = name.startsWith('assets-_mx-characters-') ? 'dependency' : name.startsWith('cafe-characteranimation-') ? 'cafe' : 'load'
  return `${scope}:${ref.parsed?.family ?? ''}`
}

function metadataIdentities(metadata?: InventoryMetadata) {
  const identities = new Set<string>()
  for (const item of metadata?.containers ?? []) {
    const normalized = item.path.replaceAll('\\', '/')
    const match = normalized.match(/\/_MX\/(?:Characters|AddressableAsset\/Character)\/([^/]+)\/(?:[^/]+\/)*([^/]+)\.prefab$/i)
    if (!match) continue
    // Effects, timelines, and shared resources live below the same Unity
    // namespace but are not character model identities.  Only treat a
    // container as an authoritative identity when its root prefab name is the
    // identity itself; cafe/formation/battle prefabs are then pulled in by
    // the dependency closure of that root model.
    const identity = canonicalSourceIdentity(match[1])
    if (identity && canonicalSourceIdentity(match[2]) === identity) identities.add(identity)
  }
  return identities
}

function canonicalSourceIdentity(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

interface EntryRef { file: InventoryFile; entry: InventoryEntry; parsed: ReturnType<typeof parseCharacterPart> }

function sourcePart(ref: EntryRef, family = ref.parsed?.family ?? 'dependency'): SourcePart {
  return {
    archivePath: ref.file.path, archiveSha256: ref.file.sha256, entryPath: ref.entry.path,
    entrySize: ref.entry.size, entryCrc32: ref.entry.crc32, sha256: ref.entry.sha256!, family,
    revision: ref.parsed?.revision ?? null, sourceKind: ref.file.kind === 'bundle' ? 'bundle' : 'archive',
  }
}

function dependencyName(dependency: InventoryDependency | string) {
  return normalizedFile(typeof dependency === 'string' ? dependency : dependency.name || dependency.path)
}

function uniqueRefs(refs: Iterable<EntryRef>) {
  const values = new Map<string, EntryRef>()
  for (const ref of refs) if (ref.entry.sha256 && !values.has(ref.entry.sha256)) values.set(ref.entry.sha256, ref)
  return [...values.values()]
}

function stableAssembly(value: InventoryAssembly) {
  return JSON.stringify(value)
}

function sourceReferenceKey(reference: InventorySourceReference | null | undefined) {
  return reference
    ? `${reference.bundleSha256.toLowerCase()}:${normalizedFile(reference.serializedFile)}:${reference.objectId}`
    : ''
}

function exactSerializedPointerKey(pointer: InventoryPointer | null | undefined) {
  return pointer ? `${pointer.file.replaceAll('\\', '/').toLowerCase()}:${pointer.pathId}` : ''
}

function assemblyPointerKey(pointer: InventoryAssemblyPointer | null | undefined) {
  return pointer
    ? `${normalizedFile(pointer.file ?? '')}:${pointer.pathId}`
    : ''
}

function normalizeEquipmentAttachments(attachments: InventoryAssemblyAttachment): InventoryAssemblyAttachment {
  const normalized: InventoryAssemblyAttachment = { ...attachments }
  const references = new Map<string, InventorySourceReference>()
  for (const reference of attachments.equipmentRendererReferences ?? []) {
    const key = sourceReferenceKey(reference)
    if (!references.has(key)) references.set(key, reference)
  }
  if (references.size) normalized.equipmentRendererReferences = [...references.values()].sort((left, right) =>
    sourceReferenceKey(left).localeCompare(sourceReferenceKey(right)))
  else delete normalized.equipmentRendererReferences

  const groups = new Map<string, InventoryEquipmentRendererGroup>()
  for (const group of attachments.equipmentRendererGroups ?? []) {
    const attachmentKey = assemblyPointerKey(group.attachment)
    const sourceReferences = new Map<string, InventorySourceReference>()
    const prior = groups.get(`${group.kind}\u0000${attachmentKey}`)
    for (const reference of [...(prior?.sourceReferences ?? []), ...(group.sourceReferences ?? [])]) {
      const key = sourceReferenceKey(reference)
      if (key) sourceReferences.set(key, reference)
    }
    if (!attachmentKey || !sourceReferences.size) continue
    const key = `${group.kind}\u0000${attachmentKey}`
    const evidence = [...new Set([...(prior?.evidence ?? []), ...(group.evidence ?? [])])].sort()
    groups.set(key, {
      kind: group.kind,
      attachment: group.attachment,
      sourceReferences: [...sourceReferences.values()].sort((left, right) => sourceReferenceKey(left).localeCompare(sourceReferenceKey(right))),
      evidence,
    })
  }
  if (groups.size) normalized.equipmentRendererGroups = [...groups.values()].sort((left, right) =>
    `${left.kind}\u0000${assemblyPointerKey(left.attachment)}`.localeCompare(`${right.kind}\u0000${assemblyPointerKey(right.attachment)}`))
  else delete normalized.equipmentRendererGroups

  const ambiguities = new Map<string, {
    name: string; attachment?: InventoryAssemblyPointer; sourceReferences: InventorySourceReference[]; reasonCode: string
  }>()
  for (const ambiguity of attachments.equipmentRendererAmbiguities ?? []) {
    // Distinct authored attachment pointers with the same display name are
    // separate diagnostics.  Merging by name would erase evidence and could
    // make a later profile layer appear to have a deterministic match.
    const key = `${ambiguity.name}\u0000${ambiguity.reasonCode}\u0000${assemblyPointerKey(ambiguity.attachment)}`
    const prior = ambiguities.get(key)
    const sourceReferences = new Map<string, InventorySourceReference>()
    for (const reference of [...(prior?.sourceReferences ?? []), ...(ambiguity.sourceReferences ?? [])]) {
      const referenceKey = sourceReferenceKey(reference)
      if (!sourceReferences.has(referenceKey)) sourceReferences.set(referenceKey, reference)
    }
    ambiguities.set(key, {
      name: ambiguity.name,
      reasonCode: ambiguity.reasonCode,
      ...(ambiguity.attachment ? { attachment: ambiguity.attachment } : prior?.attachment ? { attachment: prior.attachment } : {}),
      sourceReferences: [...sourceReferences.values()].sort((left, right) =>
        sourceReferenceKey(left).localeCompare(sourceReferenceKey(right))),
    })
  }
  if (ambiguities.size) normalized.equipmentRendererAmbiguities = [...ambiguities.values()].sort((left, right) =>
    `${left.name}\u0000${left.reasonCode}\u0000${assemblyPointerKey(left.attachment)}`.localeCompare(`${right.name}\u0000${right.reasonCode}\u0000${assemblyPointerKey(right.attachment)}`))
  else delete normalized.equipmentRendererAmbiguities

  // Keep the legacy name array verbatim.  In particular, repeated names are
  // useful compatibility evidence when source metadata contains duplicate
  // renderers; the ambiguity records above prevent a name-only selection.
  if (attachments.equipmentRenderers) normalized.equipmentRenderers = [...attachments.equipmentRenderers]
  return normalized
}

function rendererUsesAssemblyPointer(renderer: InventoryAssemblyRenderer, pointer: InventoryAssemblyPointer) {
  const key = assemblyPointerKey(pointer)
  if (!key) return false
  return [renderer.rootBone, ...(renderer.transformChain ?? []), ...(renderer.boneReferences ?? [])]
    .some(value => assemblyPointerKey(value) === key)
}

function pointerMatchesSourceReference(pointer: InventoryPointer | null | undefined, reference: InventorySourceReference | null | undefined) {
  return Boolean(pointer && pointer.pathId !== '0' && reference
    && normalizedFile(pointer.file) === normalizedFile(reference.serializedFile)
    && pointer.pathId === reference.objectId)
}

function rendererHasExactSourceResources(
  renderer: InventoryAssemblyRenderer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
  requireWeaponToken = true,
) {
  if (renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer'
    || !renderer.mesh || !renderer.meshSourceReference
    || !pointerMatchesSourceReference(renderer.mesh, renderer.meshSourceReference)) return false
  const slots = renderer.materialSlots ?? []
  if (!slots.length) return false
  const sourceMaterialNames: string[] = []
  for (const slot of slots) {
    const materialReference = slot.sourceMaterialReference
    if (!materialReference || !pointerMatchesSourceReference(slot.material, materialReference)) return false
    const material = materialIndex.get(sourceReferenceKey(materialReference))
    if (!material?.shader || !material.shaderReference
      || !pointerMatchesSourceReference(material.shader, material.shaderReference)) return false
    const shader = shaderIndex.get(sourceReferenceKey(material.shaderReference))
    if (!shader?.sourceReference || sourceReferenceKey(shader.sourceReference) !== sourceReferenceKey(material.shaderReference)) return false
    sourceMaterialNames.push(material.name)
  }
  // The exact pointer relation is authoritative.  The authored equipment
  // token is only required by the legacy mainWeapon ambiguity path; the
  // structural Bip001_Weapon path already has an exact m_Bones anchor and
  // never selects a renderer by name alone.
  return !requireWeaponToken || [renderer.name, renderer.hierarchyPath ?? '', ...sourceMaterialNames]
    .some(value => /(?:^|[_/\s-])weapon(?:$|[_/\s-])/i.test(value))
}

function isExactBip001WeaponPointer(pointer: InventoryAssemblyPointer | null | undefined, prefabReference: InventorySourceReference) {
  return Boolean(pointer
    && pointer.pathId !== '0'
    && pointer.name?.trim().toLowerCase() === 'bip001_weapon'
    && normalizedFile(pointer.file ?? '') === normalizedFile(prefabReference.serializedFile))
}

function rendererLooksLikeBody(renderer: InventoryAssemblyRenderer) {
  const value = `${renderer.name} ${renderer.hierarchyPath ?? ''}`.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
  return /(?:^|[_/\s-])(?:body|face|hair|head|skin|clothing|outfit|uniform|character)(?:$|[_/\s-])/.test(value)
}

function promoteStructuralBip001WeaponGroups(
  assembly: InventoryAssembly,
  sourceMaterials: readonly ResolvedMaterial[],
  candidateShaders: readonly InventoryShader[],
  existingReferences: Set<string>,
) {
  const prefabReference = assembly.prefabReference
  if (!prefabReference) return new Map<string, InventoryEquipmentRendererGroup>()
  const materialIndex = new Map(sourceMaterials.flatMap(material => material.sourceReference
    ? [[sourceReferenceKey(material.sourceReference), material] as const] : []))
  const shaderIndex = new Map(candidateShaders.flatMap(shader => shader.sourceReference
    ? [[sourceReferenceKey(shader.sourceReference), shader] as const] : []))
  const grouped = new Map<string, { attachment: InventoryAssemblyPointer; renderers: InventoryAssemblyRenderer[] }>()

  for (const renderer of assembly.renderers) {
    if (renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer' || !renderer.sourceReference) continue
    const anchors = new Map<string, InventoryAssemblyPointer>()
    for (const pointer of renderer.boneReferences ?? []) {
      if (!isExactBip001WeaponPointer(pointer, prefabReference)) continue
      const key = assemblyPointerKey(pointer)
      if (key) anchors.set(key, pointer)
    }
    if (anchors.size !== 1) continue
    for (const [key, pointer] of anchors) {
      const prior = grouped.get(key) ?? { attachment: { ...pointer }, renderers: [] }
      if (!prior.renderers.includes(renderer)) prior.renderers.push(renderer)
      grouped.set(key, prior)
    }
  }

  const promoted = new Map<string, InventoryEquipmentRendererGroup>()
  for (const [anchorKey, group] of grouped) {
    if (group.renderers.length !== 2) continue
    const matchingRenderers = assembly.renderers.filter(renderer => rendererUsesAssemblyPointer(renderer, group.attachment))
    if (matchingRenderers.length !== 2 || matchingRenderers.some(renderer => !group.renderers.includes(renderer))) continue
    if (group.renderers.some(renderer => rendererLooksLikeBody(renderer))) continue
    const sourceReferences = new Map<string, InventorySourceReference>()
    for (const renderer of group.renderers) {
      const reference = renderer.sourceReference
      if (!reference
        || reference.bundleSha256.toLowerCase() !== prefabReference.bundleSha256.toLowerCase()
        || normalizedFile(reference.serializedFile) !== normalizedFile(prefabReference.serializedFile)
        || !rendererHasExactSourceResources(renderer, materialIndex, shaderIndex, false)) {
        sourceReferences.clear()
        break
      }
      sourceReferences.set(sourceReferenceKey(reference), reference)
    }
    if (sourceReferences.size !== 2 || [...sourceReferences.keys()].some(key => existingReferences.has(key))) continue
    promoted.set(anchorKey, {
      kind: 'structuralWeapon',
      attachment: { ...group.attachment },
      sourceReferences: [...sourceReferences.values()].sort((left, right) => sourceReferenceKey(left).localeCompare(sourceReferenceKey(right))),
      evidence: [
        `exact same-prefab Bip001_Weapon m_Bones anchor ${anchorKey}`,
        'structural group contains exactly two unique visible SkinnedMeshRenderer source identities',
        `all grouped renderer identities share the selected prefab ${normalizedFile(prefabReference.serializedFile)}`,
        ...group.renderers.map(renderer => `exact mesh/material/shader source identities verified for ${sourceReferenceKey(renderer.sourceReference)}`),
        'no body or third renderer shares the exact anchor',
        'unique same-prefab structural Bip001_Weapon renderer group',
      ],
    })
  }
  return promoted
}

function promoteExactEquipmentRendererGroups(
  assembly: InventoryAssembly,
  sourceMaterials: readonly ResolvedMaterial[],
  candidateShaders: readonly InventoryShader[],
) {
  const ambiguities = assembly.attachments.equipmentRendererAmbiguities ?? []
  if (!assembly.prefabReference) return assembly
  const materialIndex = new Map(sourceMaterials.flatMap(material => material.sourceReference
    ? [[sourceReferenceKey(material.sourceReference), material] as const] : []))
  const shaderIndex = new Map(candidateShaders.flatMap(shader => shader.sourceReference
    ? [[sourceReferenceKey(shader.sourceReference), shader] as const] : []))
  const promoted = new Map<number, InventoryEquipmentRendererGroup>()
  const mainWeaponPointers = assembly.attachments.mainWeapon ?? []
  for (const [index, ambiguity] of ambiguities.entries()) {
    // This promotion is deliberately narrower than the generic exact
    // equipment relation: only one source-authored mainWeapon pointer and the
    // known two-renderer Aris-style group are accepted here.
    if (ambiguity.reasonCode !== 'ambiguous-equipment-renderer-relation' || !ambiguity.attachment) continue
    const attachmentKey = assemblyPointerKey(ambiguity.attachment)
    if (!attachmentKey || mainWeaponPointers.filter(pointer => assemblyPointerKey(pointer) === attachmentKey).length !== 1) continue
    const samePointerAmbiguities = ambiguities.filter(item => assemblyPointerKey(item.attachment) === attachmentKey)
    if (samePointerAmbiguities.length !== 1) continue
    const sourceReferences = new Map<string, InventorySourceReference>()
    for (const reference of ambiguity.sourceReferences ?? []) sourceReferences.set(sourceReferenceKey(reference), reference)
    if (sourceReferences.size !== 2) continue
    const groupedRenderers: InventoryAssemblyRenderer[] = []
    let valid = true
    for (const reference of sourceReferences.values()) {
      const matches = assembly.renderers.filter(renderer => renderer.sourceReference
        && sourceReferenceKey(renderer.sourceReference) === sourceReferenceKey(reference))
      if (matches.length !== 1) { valid = false; break }
      groupedRenderers.push(matches[0])
    }
    if (!valid || groupedRenderers.length !== 2) continue
    const prefabReference = assembly.prefabReference
    if (!groupedRenderers.every(renderer => renderer.sourceReference
      && renderer.sourceReference.bundleSha256.toLowerCase() === prefabReference.bundleSha256.toLowerCase()
      && normalizedFile(renderer.sourceReference.serializedFile) === normalizedFile(prefabReference.serializedFile)
      && rendererUsesAssemblyPointer(renderer, ambiguity.attachment!)
      && rendererHasExactSourceResources(renderer, materialIndex, shaderIndex))) continue
    const matchingRenderers = assembly.renderers.filter(renderer => rendererUsesAssemblyPointer(renderer, ambiguity.attachment!))
    if (matchingRenderers.length !== groupedRenderers.length
      || matchingRenderers.some(renderer => !groupedRenderers.includes(renderer))) continue
    promoted.set(index, {
      kind: 'mainWeapon',
      attachment: { ...ambiguity.attachment },
      sourceReferences: [...sourceReferences.values()].sort((left, right) => sourceReferenceKey(left).localeCompare(sourceReferenceKey(right))),
      evidence: [
        `exact mainWeapon pointer ${attachmentKey}`,
        'one-to-many group contains exactly two unique visible SkinnedMeshRenderer source identities',
        `all grouped renderer identities share the selected prefab ${normalizedFile(prefabReference.serializedFile)}`,
        ...groupedRenderers.map(renderer => `exact mesh/material/shader source identities verified for ${sourceReferenceKey(renderer.sourceReference)}`),
        'no other renderer matches the exact mainWeapon pointer',
        'unique same-prefab mainWeapon renderer group',
      ],
    })
  }
  const references = new Map<string, InventorySourceReference>()
  for (const reference of assembly.attachments.equipmentRendererReferences ?? []) references.set(sourceReferenceKey(reference), reference)
  for (const group of promoted.values()) for (const reference of group.sourceReferences) references.set(sourceReferenceKey(reference), reference)
  const structuralPromotions = promoteStructuralBip001WeaponGroups(assembly, sourceMaterials, candidateShaders, new Set(references.keys()))
  for (const group of structuralPromotions.values()) for (const reference of group.sourceReferences) references.set(sourceReferenceKey(reference), reference)
  if (!promoted.size && !structuralPromotions.size) return assembly
  const structuralAnchorKeys = new Set(structuralPromotions.keys())
  const remainingAmbiguities = ambiguities.filter((_ambiguity, index) => {
    if (promoted.has(index)) return false
    const anchorKey = assemblyPointerKey(_ambiguity.attachment)
    return !anchorKey || !structuralAnchorKeys.has(anchorKey)
  })
  const attachments: InventoryAssemblyAttachment = {
    ...assembly.attachments,
    equipmentRendererReferences: [...references.values()],
    equipmentRendererGroups: [...(assembly.attachments.equipmentRendererGroups ?? []), ...promoted.values(), ...structuralPromotions.values()],
    ...(remainingAmbiguities.length ? { equipmentRendererAmbiguities: remainingAmbiguities } : {}),
  }
  if (!remainingAmbiguities.length) delete attachments.equipmentRendererAmbiguities
  return { ...assembly, attachments: normalizeEquipmentAttachments(attachments) }
}

type MouthRendererPointer = NonNullable<InventoryAssemblyAttachment['mouthRenderer']>[number]
type MouthMetadata = NonNullable<InventoryAssemblyAttachment['mouthMetadata']>[number]

/**
 * Resolve a legacy mouth pointer to the selected assembly's exact renderer
 * identity when possible.  A name or array position is never used as a
 * fallback: an unresolved pointer keeps its serialized file/path key and is
 * left for profile validation to reject.
 */
function mouthPointerKey(assembly: InventoryAssembly, pointer: { file?: string; pathId: string; sourceReference?: InventorySourceReference | null }) {
  if (pointer.sourceReference) return `source:${sourceReferenceKey(pointer.sourceReference)}`
  const file = normalizedFile(pointer.file ?? '')
  const matches = assembly.renderers.filter(renderer => renderer.sourceReference
    && normalizedFile(renderer.sourceReference.serializedFile) === file
    && renderer.sourceReference.objectId === pointer.pathId)
  if (matches.length === 1) return `source:${sourceReferenceKey(matches[0].sourceReference)}`
  return `pointer:${file}:${pointer.pathId}`
}

function mergeMouthAttachments(left: InventoryAssemblyAttachment, right: InventoryAssemblyAttachment, assembly: InventoryAssembly) {
  const leftIndex = left.mouthMaterialIndex, rightIndex = right.mouthMaterialIndex
  if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) return null
  const leftUV = left.mouthDefaultUV, rightUV = right.mouthDefaultUV
  if (leftUV && rightUV && (leftUV.x !== rightUV.x || leftUV.y !== rightUV.y)) return null

  const merged: InventoryAssemblyAttachment = { ...left, ...right }
  const equipmentRendererReferences = new Map<string, InventorySourceReference>()
  for (const reference of [...(left.equipmentRendererReferences ?? []), ...(right.equipmentRendererReferences ?? [])]) {
    const key = sourceReferenceKey(reference)
    if (!equipmentRendererReferences.has(key)) equipmentRendererReferences.set(key, reference)
  }
  if (equipmentRendererReferences.size) merged.equipmentRendererReferences = [...equipmentRendererReferences.values()].sort((a, b) =>
    sourceReferenceKey(a).localeCompare(sourceReferenceKey(b)))
  else delete merged.equipmentRendererReferences

  const equipmentRendererAmbiguities = normalizeEquipmentAttachments({
    equipmentRendererAmbiguities: [...(left.equipmentRendererAmbiguities ?? []), ...(right.equipmentRendererAmbiguities ?? [])],
  }).equipmentRendererAmbiguities
  if (equipmentRendererAmbiguities?.length) merged.equipmentRendererAmbiguities = equipmentRendererAmbiguities
  else delete merged.equipmentRendererAmbiguities
  const mouthRenderers = new Map<string, MouthRendererPointer>()
  for (const pointer of [...(left.mouthRenderer ?? []), ...(right.mouthRenderer ?? [])]) {
    const key = mouthPointerKey(assembly, pointer)
    const prior = mouthRenderers.get(key)
    // Prefer the exact full source identity when a legacy pointer and a
    // source-referenced pointer describe the same renderer.
    if (!prior || (!prior.sourceReference && pointer.sourceReference)) mouthRenderers.set(key, pointer)
  }
  if (mouthRenderers.size) merged.mouthRenderer = [...mouthRenderers.values()]

  const mouthMetadata = new Map<string, MouthMetadata>()
  for (const metadata of [...(left.mouthMetadata ?? []), ...(right.mouthMetadata ?? [])]) {
    const pointer = { ...metadata.renderer, sourceReference: metadata.sourceRendererReference ?? null }
    const key = mouthPointerKey(assembly, pointer)
    const prior = mouthMetadata.get(key)
    if (!prior) {
      mouthMetadata.set(key, metadata)
      continue
    }
    if (prior.materialIndex !== undefined && prior.materialIndex !== null
      && metadata.materialIndex !== undefined && metadata.materialIndex !== null
      && prior.materialIndex !== metadata.materialIndex) return null
    if (prior.defaultUV && metadata.defaultUV
      && (prior.defaultUV.x !== metadata.defaultUV.x || prior.defaultUV.y !== metadata.defaultUV.y)) return null
    mouthMetadata.set(key, {
      ...prior,
      renderer: prior.renderer.file ? prior.renderer : metadata.renderer,
      sourceRendererReference: prior.sourceRendererReference ?? metadata.sourceRendererReference,
      materialIndex: prior.materialIndex ?? metadata.materialIndex,
      defaultUV: prior.defaultUV ?? metadata.defaultUV,
    })
  }
  if (mouthMetadata.size) merged.mouthMetadata = [...mouthMetadata.values()]

  const mouthMaterialIndex = leftIndex ?? rightIndex
  if (mouthMaterialIndex === undefined) delete merged.mouthMaterialIndex
  else merged.mouthMaterialIndex = mouthMaterialIndex
  const mouthDefaultUV = leftUV ?? rightUV
  if (!mouthDefaultUV) delete merged.mouthDefaultUV
  else merged.mouthDefaultUV = mouthDefaultUV
  return merged
}

function mergeAssemblyRecord(values: InventoryAssembly[], item: InventoryAssembly) {
  const prefabKey = sourceReferenceKey(item.prefabReference)
  if (!prefabKey) return values.some(existing => stableAssembly(existing) === stableAssembly(item)) ? values : [...values, item]
  const index = values.findIndex(existing => sourceReferenceKey(existing.prefabReference) === prefabKey)
  if (index < 0) return [...values, item]
  const existing = values[index]
  const { attachments: _existingAttachments, ...existingStructure } = existing
  const { attachments: _itemAttachments, ...itemStructure } = item
  if (JSON.stringify(existingStructure) !== JSON.stringify(itemStructure)) return [...values, item]
  const attachments = mergeMouthAttachments(existing.attachments, item.attachments, existing)
  if (!attachments) return [...values, item]
  return values.map((value, valueIndex) => valueIndex === index ? { ...existing, attachments } : value)
}

export function candidatesFromFiles(files: readonly InventoryFile[]): SourceCandidate[] {
  const refs: EntryRef[] = files.flatMap(file => file.entries.map(entry => ({ file, entry, parsed: parseCharacterPart(entry.path) }))).filter(ref => Boolean(ref.entry.sha256))
  const serializedIndex = new Map<string, EntryRef[]>()
  for (const ref of refs) for (const serialized of ref.entry.metadata?.serializedFiles ?? []) {
    const key = normalizedFile(serialized)
    serializedIndex.set(key, [...(serializedIndex.get(key) ?? []), ref])
  }
  const grouped = new Map<string, EntryRef[]>()
  for (const ref of refs) {
    const identities = ref.parsed ? [ref.parsed.sourceIdentity] : [...metadataIdentities(ref.entry.metadata)]
    for (const identity of identities) grouped.set(identity, [...(grouped.get(identity) ?? []), ref])
  }

  return [...grouped].map(([sourceIdentity, unfiltered]) => {
    const latestByFamily = new Map<string, string>()
    for (const ref of unfiltered) if (ref.parsed?.revision) {
      const claim = familyClaim(ref), current = latestByFamily.get(claim)
      if (!current || ref.parsed.revision > current) latestByFamily.set(claim, ref.parsed.revision)
    }
    const seeds = uniqueRefs(unfiltered.filter(ref => !ref.parsed?.revision || ref.parsed.revision === latestByFamily.get(familyClaim(ref))))
    const closure = new Map(seeds.map(ref => [ref.entry.sha256!, ref]))
    const unresolved = new Set<string>(), dependencyConflicts = new Set<string>(), queue = [...seeds]
    while (queue.length) {
      const ref = queue.shift()!
      for (const dependency of ref.entry.metadata?.dependencies ?? []) {
        const name = dependencyName(dependency)
        if (!name || name === 'unity default resources' || name === 'unity_builtin_extra') continue
        const matches = uniqueRefs(serializedIndex.get(name) ?? [])
        if (!matches.length) { unresolved.add(name); continue }
        if (new Set(matches.map(match => match.entry.sha256)).size > 1) dependencyConflicts.add(name)
        for (const match of matches) if (!closure.has(match.entry.sha256!)) { closure.set(match.entry.sha256!, match); queue.push(match) }
      }
    }
    const selected = [...closure.values()].sort((a, b) => a.entry.path.localeCompare(b.entry.path))
    const claims = new Map<string, Set<string>>()
    for (const ref of seeds) if (ref.parsed) {
      const key = `${familyClaim(ref)}:${ref.parsed.revision ?? ''}`, values = claims.get(key) ?? new Set<string>()
      values.add(ref.entry.sha256!); claims.set(key, values)
    }
    const unversionedIdentityRefs = unfiltered.filter(ref => !ref.parsed && metadataIdentities(ref.entry.metadata).has(sourceIdentity))
    const unversionedIdentityConflict = !unfiltered.some(ref => ref.parsed)
      && new Set(unversionedIdentityRefs.map(ref => ref.entry.sha256)).size > 1
    const objectIndex = new Map<string, InventoryObject[]>()
    for (const ref of selected) for (const object of ref.entry.metadata?.objects ?? []) {
      const key = `${normalizedFile(object.file ?? '')}:${object.pathId}`
      objectIndex.set(key, [...(objectIndex.get(key) ?? []), object])
    }
    const pointerKey = (pointer: InventoryPointer | null | undefined) => pointer
      ? `${normalizedFile(pointer.file)}:${pointer.pathId}` : ''
    const resolveReference = (pointer: InventoryPointer | null | undefined) => {
      const matches = objectIndex.get(pointerKey(pointer)) ?? []
      const references = new Map(matches.flatMap(object => object.sourceReference ? [[sourceReferenceKey(object.sourceReference), object.sourceReference] as const] : []))
      return references.size === 1 ? [...references.values()][0] : null
    }
    const resolveFxPPtrEvidence = (value: any) => {
      if (!value || typeof value !== 'object' || !value.pointer || typeof value.pointer !== 'object') return null
      const pointer = value.pointer as InventoryPointer
      return {
        pointer,
        fileID: Number.isInteger(value.fileID) ? value.fileID : null,
        identityResolved: value.identityResolved === true,
        objectResolved: value.objectResolved === true,
        sourceReference: value.sourceReference ?? resolveReference(pointer),
      } satisfies InventoryFxPPtrEvidence
    }
    const resolveFxTargetEvidence = (value: InventoryFxTargetEvidence | null | undefined) => {
      if (!value) return null
      return {
        ...value,
        rendererAssets: (value.rendererAssets ?? []).map(item => ({
          ...item,
          mesh: resolveFxPPtrEvidence(item.mesh),
          materials: (item.materials ?? []).map(resolveFxPPtrEvidence).filter(item => item !== null) as InventoryFxPPtrEvidence[],
        })),
      }
    }
    const objectName = (pointer: InventoryPointer | null | undefined) => {
      const matches = objectIndex.get(pointerKey(pointer)) ?? []
      const names = new Set(matches.map(object => object.name).filter(Boolean))
      return names.size === 1 ? [...names][0] : null
    }
    const textures = new Map<string, InventoryTexture[]>()
    const rawShaders = selected.flatMap(ref => ref.entry.metadata?.shaders ?? [])
    for (const ref of selected) for (const texture of ref.entry.metadata?.textures ?? []) {
      const key = `${normalizedFile(texture.file)}:${texture.pathId}`
      textures.set(key, [...(textures.get(key) ?? []), texture])
    }
    const shaderRecords = new Map(rawShaders.flatMap(shader => shader.sourceReference
      ? [[sourceReferenceKey(shader.sourceReference), shader] as const] : []))
    const clips = [...new Set(selected.flatMap(ref => ref.entry.metadata?.objects.filter(object => object.type === 'AnimationClip').map(object => object.name) ?? []))].filter(Boolean).sort()
    const ownClips = new Set(clips.filter(clip => {
      const identity = canonicalSourceIdentity(clip)
      return identity === sourceIdentity || identity.startsWith(`${sourceIdentity}_`)
    }))
    const assembly = selected.flatMap(ref => ref.entry.metadata?.assembly ?? [])
      .map(item => ({
        ...item,
        attachments: normalizeEquipmentAttachments(item.attachments),
        prefabReference: item.prefabReference ?? resolveReference(item.prefabTarget),
        renderers: item.renderers.map(renderer => ({
          ...renderer,
          meshSourceReference: renderer.meshSourceReference ?? resolveReference(renderer.mesh),
          materialSlots: renderer.materialSlots?.map(slot => ({
            ...slot,
            sourceMaterialReference: slot.sourceMaterialReference ?? resolveReference(slot.material),
          })),
        })),
      }))
      .filter(item => item.root)
      .reduce(mergeAssemblyRecord, [] as InventoryAssembly[])
    const assemblyRendererReferences = new Map<string, InventorySourceReference[]>()
    for (const renderer of assembly.flatMap(item => item.renderers)) {
      if (!renderer.sourceReference) continue
      const key = `${normalizedFile(renderer.sourceReference.serializedFile)}:${renderer.sourceReference.objectId}`
      const references = assemblyRendererReferences.get(key) ?? []
      if (!references.some(reference => sourceReferenceKey(reference) === sourceReferenceKey(renderer.sourceReference))) references.push(renderer.sourceReference)
      assemblyRendererReferences.set(key, references)
    }
    const fxContainersByTarget = new Map<string, InventoryContainer[]>()
    for (const container of selected.flatMap(ref => ref.entry.metadata?.containers ?? [])) {
      if (!container.targetReference || !container.fxTargetEvidence) continue
      const key = exactSerializedPointerKey({
        file: container.targetReference.serializedFile,
        pathId: container.targetReference.objectId,
      })
      if (!key) continue
      fxContainersByTarget.set(key, [...(fxContainersByTarget.get(key) ?? []), container])
    }
    const events = selected.flatMap(ref => ref.entry.metadata?.events ?? [])
      .filter(event => ownClips.has(event.clip))
      .map(event => {
        if (isChibiInstantiateFxEventFunction(event.function)) {
          const target = event.target ?? null
          const targetKey = exactSerializedPointerKey(target)
          const rawMatches = targetKey ? fxContainersByTarget.get(targetKey) ?? [] : []
          const uniqueMatches = new Map<string, InventoryContainer>()
          for (const container of rawMatches) {
            const key = sourceReferenceKey(container.targetReference)
            if (key) uniqueMatches.set(key, container)
          }
          const targetGuid = (target?.externalGuid ?? '').replaceAll('-', '').toLowerCase()
          const eventSourceClipKey = sourceReferenceKey(event.sourceClipReference)
          const exactSourceClipMatches = eventSourceClipKey
            ? selected.flatMap(ref => ref.entry.metadata?.objects ?? [])
              .filter(object => object.type === 'AnimationClip' && object.name === event.clip
                && object.file !== undefined
                && normalizedFile(object.file) === normalizedFile(event.sourceClipReference!.serializedFile)
                && object.pathId === event.sourceClipReference!.objectId
                && sourceReferenceKey(object.sourceReference) === eventSourceClipKey)
            : []
          if (exactSourceClipMatches.length !== 1) return {
            ...event,
            fxTargetResolution: { status: 'missing' as const, reason: 'InstantiateFx source clip identity does not resolve to one exact selected AnimationClip object.', candidateCount: uniqueMatches.size },
          }
          if (!target || !target.pathId || target.pathId === '0' || targetGuid !== '00000000000000000000000000000000') return {
            ...event,
            fxTargetResolution: { status: 'missing' as const, reason: 'InstantiateFx target PPtr is null or its external GUID is not the pinned source identity.', candidateCount: uniqueMatches.size },
          }
          if (uniqueMatches.size !== 1) return {
            ...event,
            fxTargetResolution: {
              status: uniqueMatches.size ? 'ambiguous' as const : 'missing' as const,
              reason: uniqueMatches.size ? 'InstantiateFx target PPtr matches multiple exact source prefab identities.' : 'InstantiateFx target PPtr has no exact FX prefab container in the selected dependency closure.',
              candidateCount: uniqueMatches.size,
            },
          }
          const container = [...uniqueMatches.values()][0]
          const evidence = resolveFxTargetEvidence(container.fxTargetEvidence)
          if (!evidence || sourceReferenceKey(evidence.targetReference) !== sourceReferenceKey(container.targetReference)) return {
            ...event,
            fxTargetResolution: { status: 'missing' as const, reason: 'InstantiateFx target hierarchy evidence does not match the exact container source reference.', candidateCount: uniqueMatches.size },
          }
          return {
            ...event,
            fxTargetReference: container.targetReference,
            fxTargetEvidence: evidence,
            fxTargetResolution: { status: 'resolved' as const, reason: 'Exact serialized file and path ID resolve to one source-pinned FX prefab hierarchy.', candidateCount: 1 },
          }
        }
        const targetKey = pointerKey(event.target)
        const references = targetKey ? assemblyRendererReferences.get(targetKey) ?? [] : []
        if (references.length === 1) return { ...event, targetReference: references[0] }
        return event
      })
    const rendererMaterialReferences = new Set(assembly.flatMap(item => item.renderers.flatMap(renderer =>
      renderer.materialSlots?.flatMap(slot => slot.sourceMaterialReference ? [sourceReferenceKey(slot.sourceMaterialReference)] : []) ?? [])))
    // Some older character and partial-revision seed bundles reference their
    // own material declarations from the dependency closure. Keep only the
    // declarations named for this exact source so shared characters cannot
    // leak into facial shader or mouth-atlas selection.
    const materialIdentities = new Set([sourceIdentity, sourceIdentity.replace(/_\d+$/, '')])
    const materialIndex = new Map<string, { material: ResolvedMaterial; quality: number }>()
    const sourceMaterials: ResolvedMaterial[] = []
    for (const material of selected.flatMap(ref => ref.entry.metadata?.materials ?? [])) {
      const materialName = canonicalSourceIdentity(material.name)
      const matchesCandidate = [...materialIdentities].some(identity => materialName === identity || materialName.startsWith(`${identity}_`))
      const materialReference = sourceReferenceKey(material.sourceReference)
      if (!matchesCandidate && !rendererMaterialReferences.has(materialReference)) continue
      const shaderReference = material.shaderReference ?? resolveReference(material.shader)
      const shaderRecord = shaderReference ? shaderRecords.get(sourceReferenceKey(shaderReference)) : undefined
      const shaderName = objectName(material.shader) ?? shaderRecord?.name ?? null
      const resolvedTextureProperties = material.textures.map(item => {
        if (!item.texture) return item
        const textureMatches = textures.get(pointerKey(item.texture)) ?? []
        const uniqueReferences = new Map(textureMatches.flatMap(texture => texture.sourceReference
          ? [[sourceReferenceKey(texture.sourceReference), texture.sourceReference] as const] : []))
        const texture = uniqueReferences.size === 1 ? textureMatches.find(item => item.sourceReference
          && sourceReferenceKey(item.sourceReference) === [...uniqueReferences.keys()][0])
          : textureMatches.length === 1 ? textureMatches[0] : undefined
        const textureReference = uniqueReferences.size === 1 ? [...uniqueReferences.values()][0] : null
        return { ...item, textureReference: item.textureReference ?? textureReference }
      })
      const resolved = {
        ...material,
        textures: resolvedTextureProperties,
        shaderReference,
        shaderName,
        shaderParsedName: shaderRecord?.parsedName ?? null,
        resolvedTextures: resolvedTextureProperties.flatMap(item => {
          if (!item.texture) return []
          const textureMatches = textures.get(pointerKey(item.texture)) ?? []
          const uniqueReferences = new Map(textureMatches.flatMap(texture => texture.sourceReference
            ? [[sourceReferenceKey(texture.sourceReference), texture.sourceReference] as const] : []))
          const texture = uniqueReferences.size === 1 ? textureMatches.find(item => item.sourceReference
            && sourceReferenceKey(item.sourceReference) === [...uniqueReferences.keys()][0])
            : textureMatches.length === 1 ? textureMatches[0] : undefined
          if (!texture) return []
          const textureReference = item.textureReference ?? (uniqueReferences.size === 1 ? texture.sourceReference : undefined)
          return [{ property: item.name, name: texture.name, width: texture.width, height: texture.height,
            ...(textureReference ? { sourceReference: textureReference } : {}), ...(item.scale ? { scale: item.scale } : {}), ...(item.offset ? { offset: item.offset } : {}) }]
        }),
      }
      if (matchesCandidate || rendererMaterialReferences.has(materialReference)) sourceMaterials.push(resolved)
      if (!matchesCandidate) continue
      const expectedShader = /eyemouth/i.test(material.name) ? /MXCharacterEyesMouth/i
        : /eyebrow/i.test(material.name) ? /MXCharacterEyebrow/i
          : /face/i.test(material.name) ? /MXCharacterFace/i : /MXCharacter/i
      const quality = expectedShader.test(resolved.shaderName ?? '') ? 2 : /MXCharacter/i.test(resolved.shaderName ?? '') ? 1 : 0
      if ((materialIndex.get(material.name)?.quality ?? -1) < quality) materialIndex.set(material.name, { material: resolved, quality })
    }
    const materialMetadata = [...materialIndex.values()].map(value => value.material)
    const usedShaderReferences = new Set(sourceMaterials.flatMap(material => material.shaderReference ? [sourceReferenceKey(material.shaderReference)] : []))
    const candidateShaders = rawShaders.filter(shader => shader.sourceReference && usedShaderReferences.has(sourceReferenceKey(shader.sourceReference)))
    const fingerprint = createHash('sha256').update(selected.map(ref => ref.entry.sha256).sort().join('\n')).digest('hex')
    const promotedAssembly = assembly.map(item => promoteExactEquipmentRendererGroups(item, sourceMaterials, candidateShaders))
    return {
      sourceIdentity, fingerprint, parts: selected.map(ref => sourcePart(ref)),
      conflict: unversionedIdentityConflict || dependencyConflicts.size > 0 || [...claims.values()].some(values => values.size > 1),
      families: [...new Set(seeds.map(ref => ref.parsed?.family ?? 'internal'))].sort(),
      revisions: [...new Set(seeds.flatMap(ref => ref.parsed?.revision ? [ref.parsed.revision] : []))].sort(),
      clips,
      objectNames: [...new Set(selected.flatMap(ref => ref.entry.metadata?.objects.filter(object => object.type === 'Animator' || object.type === 'AnimatorOverrideController').map(object => object.name) ?? []))].filter(Boolean).sort(),
      materials: [...new Set(materialMetadata.map(material => material.name))].filter(Boolean).sort(),
      dependencies: [...new Set(selected.flatMap(ref => ref.entry.metadata?.dependencies.map(dependency => typeof dependency === 'string' ? dependency : dependency.path || dependency.name) ?? []))].filter(Boolean).sort(),
      events,
      prefabPaths: [...new Set(selected.flatMap(ref => ref.entry.metadata?.containers?.map(item => item.path).filter(item => item.toLowerCase().endsWith('.prefab')) ?? []))].sort(),
      materialMetadata, sourceMaterials, shaders: candidateShaders, unresolvedDependencies: [...unresolved].sort(),
      assembly: promotedAssembly.sort((a, b) => a.root.localeCompare(b.root)),
    }
  }).sort((a, b) => a.sourceIdentity.localeCompare(b.sourceIdentity))
}

export function sharedDependencyParts(files: readonly InventoryFile[]): SourcePart[] {
  const found = new Map<string, SourcePart>()
  for (const file of files) for (const entry of file.entries) {
    const name = entry.path.toLowerCase()
    if (!entry.sha256 || !name.endsWith('.bundle') || (!name.includes('_mxcommon') && !name.includes('prologdepengroup'))) continue
    if (!found.has(entry.sha256)) found.set(entry.sha256, sourcePart({ file, entry, parsed: parseCharacterPart(entry.path) }, 'shared'))
  }
  return [...found.values()].sort((a, b) => a.entryPath.localeCompare(b.entryPath))
}

export function runInventoryReader(command: string, args: string[], onProgress?: (message: string) => void) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'inherit', onProgress ? 'pipe' : 'inherit'], windowsHide: true,
      env: onProgress ? { ...process.env, CHIBI_INVENTORY_PROGRESS: '1' } : process.env,
    })
    if (child.stderr && onProgress) {
      child.stderr.on('data', chunk => process.stderr.write(chunk))
      const lines = createInterface({ input: child.stderr })
      lines.on('line', line => {
        if (line.startsWith('[chibi-inventory] ')) onProgress(line.slice(18).trim().slice(0, 1000))
      })
    }
    child.once('error', reject); child.once('close', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)))
  })
}

type RawInventoryReport = Pick<InventoryReport, 'version' | 'source' | 'files'> & { metadataReader?: string }

/** Parse the root files array incrementally so the whole inventory never becomes one V8 string. */
export async function parseInventoryRawChunks(chunks: AsyncIterable<string>): Promise<RawInventoryReport> {
  const files: InventoryFile[] = []
  let raw: RawInventoryReport | undefined
  let mode: 'header' | 'files' | 'suffix' = 'header'
  let prefix = ''
  let rootDepth = 0
  let inHeaderString = false
  let headerEscape = false
  let captureRootString = false
  let rootString = ''
  let rootStringStart = -1
  let pendingRootString: { value: string; start: number } | null = null
  let waitingForFilesArray = false
  let filesKeyStart = -1
  let itemActive = false
  let itemDepth = 0
  let itemInString = false
  let itemEscape = false
  let itemParts: string[] = []
  let expectingFile = true
  let sawFile = false
  let suffix = ''

  for await (const chunk of chunks) {
    if (typeof chunk !== 'string') throw new Error('Raw inventory reader requires UTF-8 text chunks.')
    let itemChunkStart = 0
    for (let index = 0; index < chunk.length; index++) {
      const character = chunk[index]
      if (mode === 'suffix') {
        suffix += chunk.slice(index)
        break
      }
      if (mode === 'header') {
        prefix += character
        if (prefix.length > 1024 * 1024) throw new Error('Raw inventory header exceeded the bounded prefix limit before its files array.')
        if (inHeaderString) {
          if (headerEscape) {
            if (captureRootString) rootString += character
            headerEscape = false
          } else if (character === '\\') {
            if (captureRootString) rootString += character
            headerEscape = true
          } else if (character === '"') {
            inHeaderString = false
            if (captureRootString) pendingRootString = { value: rootString, start: rootStringStart }
            captureRootString = false
          } else if (captureRootString) rootString += character
          continue
        }
        if (pendingRootString) {
          if (/\s/.test(character)) continue
          if (character === ':') {
            if (pendingRootString.value === 'files') {
              filesKeyStart = pendingRootString.start
              waitingForFilesArray = true
            }
            pendingRootString = null
            continue
          }
          pendingRootString = null
        }
        if (waitingForFilesArray) {
          if (/\s/.test(character)) continue
          if (character !== '[') throw new Error('Raw inventory root files property is not an array.')
          if (filesKeyStart < 0) throw new Error('Raw inventory root files property has no key position.')
          const header = JSON.parse(`${prefix.slice(0, filesKeyStart)}"files":[]}`) as RawInventoryReport
          if (!header || typeof header !== 'object' || Array.isArray(header)
            || (header.version !== 1 && header.version !== 2) || typeof header.source !== 'string') {
            throw new Error('Raw inventory header is missing a supported version or source path.')
          }
          raw = { ...header, files }
          mode = 'files'
          continue
        }
        if (character === '"') {
          inHeaderString = true
          captureRootString = rootDepth === 1
          rootString = ''
          rootStringStart = prefix.length - 1
          continue
        }
        if (character === '{' || character === '[') rootDepth++
        else if (character === '}' || character === ']') {
          rootDepth--
          if (rootDepth < 0) throw new Error('Raw inventory header has unbalanced JSON delimiters.')
        }
        continue
      }

      if (itemActive) {
        if (itemInString) {
          if (itemEscape) itemEscape = false
          else if (character === '\\') itemEscape = true
          else if (character === '"') itemInString = false
        } else if (character === '"') itemInString = true
        else if (character === '{' || character === '[') itemDepth++
        else if (character === '}' || character === ']') itemDepth--
        if (itemDepth < 0) throw new Error('Raw inventory file record has unbalanced JSON delimiters.')
        if (itemDepth === 0) {
          itemParts.push(chunk.slice(itemChunkStart, index + 1))
          const file = JSON.parse(itemParts.join('')) as InventoryFile
          if (!file || typeof file !== 'object' || typeof file.path !== 'string' || !Array.isArray(file.entries)) {
            throw new Error('Raw inventory files array contains an invalid file record.')
          }
          files.push(file)
          itemActive = false
          itemParts = []
          expectingFile = false
          sawFile = true
        }
        continue
      }

      if (/\s/.test(character)) continue
      if (character === ',') {
        if (expectingFile || !sawFile) throw new Error('Raw inventory files array contains an unexpected comma.')
        expectingFile = true
        continue
      }
      if (character === ']') {
        if (expectingFile && sawFile) throw new Error('Raw inventory files array has a trailing comma.')
        mode = 'suffix'
        continue
      }
      if (character !== '{') throw new Error('Raw inventory files array contains a non-object entry.')
      if (!expectingFile) throw new Error('Raw inventory files array is missing a comma between records.')
      itemActive = true
      itemDepth = 1
      itemInString = false
      itemEscape = false
      itemParts = []
      itemChunkStart = index
    }
    if (itemActive && itemChunkStart < chunk.length) itemParts.push(chunk.slice(itemChunkStart))
  }

  if (mode === 'header') throw new Error('Raw inventory ended before its root files array was found.')
  if (itemActive || mode === 'files') throw new Error('Raw inventory ended before its files array was complete.')
  if (suffix.trim() !== '}') throw new Error('Raw inventory has unexpected or incomplete data after its files array.')
  return raw!
}

export async function readInventoryRawFile(rawPath: string): Promise<RawInventoryReport> {
  return parseInventoryRawChunks(createReadStream(rawPath, { encoding: 'utf8' }))
}

export async function scanSourceInventory(options: { sourceDir?: string; dataDir?: string; python?: string; onProgress?: (message: string) => void } = {}): Promise<InventoryReport> {
  const roots = chibiRoots(), sourceDir = path.resolve(options.sourceDir ?? roots.source), dataDir = path.resolve(options.dataDir ?? roots.data)
  const indexDir = path.join(dataDir, 'index'), rawPath = path.join(indexDir, 'inventory.raw.json')
  await mkdir(indexDir, { recursive: true })
  let recordedPython: string | undefined
  try { recordedPython = JSON.parse(await readFile(path.join(roots.tools, 'install.json'), 'utf8'))?.unityPy?.python }
  catch { /* setup has not completed; fall back to the configured/system interpreter */ }
  await runInventoryReader(options.python ?? process.env.CHIBI_PYTHON ?? recordedPython ?? (process.platform === 'win32' ? 'python' : 'python3.12'), [path.resolve('scripts/chibi/inventory.py'), sourceDir, rawPath], options.onProgress)
  options.onProgress?.('Reading the scanned source metadata…')
  const raw = await readInventoryRawFile(rawPath)
  options.onProgress?.('Matching character models from the source metadata…')
  const report: InventoryReport = {
    ...raw, candidates: candidatesFromFiles(raw.files),
    errors: raw.files.flatMap(file => [...(file.error ? [{ path: file.path, error: file.error }] : []), ...file.entries.flatMap(entry => entry.error ? [{ path: `${file.path}:${entry.path}`, error: entry.error }] : [])]),
  }
  await writeFile(path.join(indexDir, 'inventory.json'), JSON.stringify(inventoryDiagnosticSummary(report), null, 2))
  return report
}
