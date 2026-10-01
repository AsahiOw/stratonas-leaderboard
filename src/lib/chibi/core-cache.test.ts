import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { buildFingerprint, CHIBI_EXPORTER_VERSION, CHIBI_MATERIAL_VERSION } from './engine'
import {
  actionableRenderingProfile, assertMetadataOnlyGlbRewrite, buildCoreFingerprint, buildPinnedV12Fingerprint,
  assertPinnedV12GlbProfile, CHIBI_SKIN_SKELETON_METADATA_VERSION, effectiveClipSelection,
  pinnedV12AssetMatches, rewriteGlbDiagnostics, validateSkinSkeletonMetadata,
} from './core-cache'
import {
  CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES, CHIBI_RENDERING_POLICY_VERSION, CHIBI_RENDERING_PROFILE_VERSION,
  CHIBI_SHADER_ADAPTER_VERSION,
} from './rendering-profile'

const dependencyFingerprint = 'a'.repeat(64)
const sourceReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }

function chibiProfile(initialPose = 'Idle') {
  return {
    label: 'A', initialPose, idleLabel: 'Idle',
    interactions: {
      idle: { state: 'available', clip: 'Idle', loop: true },
      walk: { state: 'available', clip: 'Walk', loop: true },
      pickup: { state: 'unsupported', reason: 'No source clip.' },
      touch: { state: 'available', clip: 'Touch', loop: false },
    },
  }
}

function renderingProfile(options: {
  policy?: string; profileVersion?: string; warning?: string; visible?: boolean; excludedEvent?: boolean
  coreGeometryWarnings?: unknown[]
} = {}) {
  const hasFxDiagnostics = options.policy === 'chibi-rendering-policy-v14' || options.profileVersion === 'chibi-rendering-profile-v10'
  const coreGeometryWarnings = options.coreGeometryWarnings
  const excludedChildRendererEvents = options.excludedEvent ? [{
    clip: 'Pickup', time: 0, action: 'disable', sourceRendererReference: sourceReference, order: 0,
    reasonCode: 'PRESENTATION_CHILD_RENDERER_EVENT', evidence: ['exact source event'],
  }] : []
  return {
    schemaVersion: 2, profileVersion: options.profileVersion ?? 'chibi-rendering-profile-v9',
    policyVersion: options.policy ?? 'chibi-rendering-policy-v12', adapterVersion: 'mx-character-adapters-v9',
    sourceIdentity: 'a', dependencyFingerprint,
    sourcePrefab: { path: 'A.prefab', reference: sourceReference },
    assembly: { root: 'A', prefabReference: sourceReference, renderers: [{ name: 'Body', enabled: true }] },
    renderers: [{
      sourceReference, name: 'Body', hierarchyPath: 'A/Body', rendererType: 'SkinnedMeshRenderer',
      defaultVisible: options.visible ?? true,
      sourceMesh: { file: 'CAB-prefab', pathId: '4', sourceReference }, glbNodeIndex: 1,
      materialSlots: [{ slot: 0, sourceMaterialReference: sourceReference, adapterId: 'mx-character-basic', renderState: { alphaMode: 'OPAQUE' }, glb: { nodeIndex: 1, materialIndex: 0 } }],
    }],
    childRendererEvents: [], excludedRenderers: [], excludedChildRendererEvents,
    ...(hasFxDiagnostics ? { fxExclusionProofs: [], excludedFxInstantiationEvents: [] } : {}),
    ...(coreGeometryWarnings === undefined ? {} : { coreGeometryWarnings: structuredClone(coreGeometryWarnings) }),
    coreRendererBlockers: [], coreGeometryBlockers: [], equipmentBindingEvidence: [], warnings: options.warning ? [{ message: options.warning }] : [],
    mouth: null, drawSequence: ['A/Body'],
    validation: {
      valid: true, unresolved: [], excludedRenderers: [], excludedChildRendererEvents,
      ...(hasFxDiagnostics ? { fxExclusionProofs: [], excludedFxInstantiationEvents: [] } : {}),
      coreRendererBlockers: [], coreGeometryBlockers: [], equipmentBindingEvidence: [],
      ...(coreGeometryWarnings === undefined ? {} : { coreGeometryWarnings: structuredClone(coreGeometryWarnings) }),
      warnings: options.warning ? [{ message: options.warning }] : [],
    },
  }
}

function coreGeometryWarning(message: string) {
  return {
    reasonCode: 'SOURCE_AUTHORED_MULTIMATERIAL_BODY_SEPARATION',
    message,
    legacyMeasurement: {
      primitiveIndex: 0, componentLabels: ['Head', 'torso'], sourceGap: 0.1780399764,
      sourceUnit: 'Unity mesh units', bridgingTriangles: 0,
    },
    legacyLabelSemantics: 'Head denotes the cap/upper-body-material component in primitive 0, not the complete visual head',
    retainedMaterialSlots: Array.from({ length: 5 }, (_, slot) => ({
      slot, sourceMaterialName: `Source material ${slot}`,
      sourceMaterialReference: { ...sourceReference, objectId: `material-${slot}` },
    })),
  }
}

function addFxDiagnostic(profile: any, evidenceText = 'source graph is complete and particle-only', functionName = 'AniEvt_InstantiateFx') {
  const ref = (serializedFile: string, objectId: string, bundleSha256 = 'c'.repeat(64)) => ({ bundleSha256, serializedFile, objectId })
  const eventSourceReference = ref('CAB-fx', 'animation-clip')
  const targetReference = ref('CAB-fx', 'fx-target')
  const gameObject = ref('CAB-fx', 'fx-game-object')
  const transform = ref('CAB-fx', 'fx-transform')
  const particleSystem = ref('CAB-fx', 'particle-system')
  const renderer = ref('CAB-fx', 'particle-renderer')
  const scriptComponent = ref('CAB-fx', 'fx-mono-behaviour')
  const proofEvidence = [
    `exact source AnimationClip ${eventSourceReference.bundleSha256}:${eventSourceReference.serializedFile.toLowerCase()}:${eventSourceReference.objectId}`,
    `selected event is ${functionName} at Touch 0.25s (source order 3)`,
    `exact target PPtr resolves to ${targetReference.bundleSha256}:${targetReference.serializedFile.toLowerCase()}:${targetReference.objectId}`,
    'target graph contains no renderer, mesh, material, or transform identity shared with selected core character content',
    evidenceText,
  ]
  const proof = {
    schemaVersion: 1, policyVersion: 'chibi-particle-only-instantiate-fx-v2',
    eventSourceReference, clip: 'Touch', time: 0.25, order: 3, function: functionName, targetReference,
    completeGraph: true, gameObjectReferences: [gameObject], transformReferences: [transform],
    componentReferences: [
      { sourceReference: transform, type: 'Transform' },
      { sourceReference: particleSystem, type: 'ParticleSystem' },
      { sourceReference: renderer, type: 'ParticleSystemRenderer' },
      { sourceReference: scriptComponent, type: 'MonoBehaviour' },
    ],
    particleRendererReferences: [renderer], approvedMonoScriptReferences: [CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES[0]],
    rendererAssets: [{
      rendererReference: renderer,
      meshReference: {
        pointer: { file: 'CAB-fx', pathId: '9901' }, fileID: 0, identityResolved: true, objectResolved: true,
        sourceReference: ref('CAB-fx', '9901'),
      },
      materialReferences: [],
    }],
    disjointFromCore: true, reasonCode: 'SOURCE_PARTICLE_ONLY_FX_TARGET', evidence: proofEvidence,
  }
  const event = {
    eventSourceReference, clip: 'Touch', time: 0.25, order: 3, function: functionName, targetReference,
    reasonCode: 'PRESENTATION_FX_INSTANTIATION', evidence: proofEvidence,
  }
  profile.fxExclusionProofs = [proof]
  profile.excludedFxInstantiationEvents = [event]
  profile.validation.fxExclusionProofs = [structuredClone(proof)]
  profile.validation.excludedFxInstantiationEvents = [structuredClone(event)]
  return profile
}

function syncFxProfileMirrors(profile: any) {
  profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs)
  profile.validation.excludedFxInstantiationEvents = structuredClone(profile.excludedFxInstantiationEvents)
}

function addUiShapedPresentationQuad(profile: any) {
  const excludedReference = { bundleSha256: 'd'.repeat(64), serializedFile: 'CAB-prefab', objectId: 'bg-white-renderer' }
  const builtinQuad = { file: 'unity default resources', pathId: '10210', externalGuid: '00000000000000000e00000000000000' }
  const coreAssemblyRenderer = profile.assembly.renderers[0]
  coreAssemblyRenderer.pathId = profile.renderers[0].sourceReference.objectId
  coreAssemblyRenderer.sourceReference = structuredClone(profile.renderers[0].sourceReference)
  profile.assembly.renderers.push({
    name: 'BG_White (1)', pathId: excludedReference.objectId, sourceReference: excludedReference,
    enabled: true, mesh: { ...builtinQuad, name: 'Quad' },
  })
  const excluded = {
    sourceReference: excludedReference,
    name: 'BG_White (1)',
    hierarchyPath: 'Cafe_CH0169/EX_Root/CH0169_Exs_Cutin_Cam/Camera001/BG_White (1)',
    reasonCode: 'PRESENTATION_MESH_10210_OR_HELPER',
    evidence: [
      `exact source renderer reference ${'d'.repeat(64)}:cab-prefab:bg-white-renderer`,
      'source renderer is in an FX/camera/cutin/presentation branch',
      'source hierarchy identifies a presentation role',
      'source mesh is an ambiguous Unity built-in Quad pointer',
    ],
    sourceMesh: { ...builtinQuad, name: 'Quad', sourceReference: null },
    materials: [{
      name: 'FX_MAT_4PXWhite_1_add',
      sourceReference: { bundleSha256: 'e'.repeat(64), serializedFile: 'CAB-material', objectId: 'bg-white-material' },
      shaderName: 'DSFX/FX_SHADER_Additive_0',
      shaderReference: { bundleSha256: 'f'.repeat(64), serializedFile: 'CAB-shader', objectId: 'additive-shader' },
    }],
  }
  profile.excludedRenderers = [excluded]
  profile.validation.excludedRenderers = structuredClone(profile.excludedRenderers)
  const fxMeshEvidence = {
    pointer: builtinQuad, fileID: 8, identityResolved: true, objectResolved: false, sourceReference: null,
  }
  profile.fxExclusionProofs[0].rendererAssets[0].meshReference = structuredClone(fxMeshEvidence)
  syncFxProfileMirrors(profile)
  return profile
}

function addRequiredRenderer(profile: any, options: {
  name: string
  sourceReference: any
  mesh: { file: string; pathId: string; sourceReference?: any }
  material?: { file: string; pathId: string; sourceReference: any }
}) {
  const sourceMesh = { file: options.mesh.file, pathId: options.mesh.pathId, sourceReference: options.mesh.sourceReference ?? null }
  profile.renderers.push({
    sourceReference: structuredClone(options.sourceReference), name: options.name,
    hierarchyPath: `A/${options.name}`, rendererType: 'MeshRenderer', defaultVisible: true,
    sourceMesh, glbNodeIndex: 2,
    materialSlots: options.material ? [{
      slot: 0, sourceMaterialReference: structuredClone(options.material.sourceReference),
      adapterId: 'mx-character-basic', renderState: { alphaMode: 'OPAQUE' }, glb: { nodeIndex: 2, materialIndex: 0 },
    }] : [],
  })
  profile.assembly.renderers.push({
    name: options.name, pathId: options.sourceReference.objectId,
    sourceReference: structuredClone(options.sourceReference), enabled: true,
    mesh: { file: options.mesh.file, pathId: options.mesh.pathId },
    ...(options.mesh.sourceReference ? { meshSourceReference: structuredClone(options.mesh.sourceReference) } : {}),
    ...(options.material ? { materialSlots: [{
      slot: 0, material: { file: options.material.file, pathId: options.material.pathId },
      sourceMaterialReference: structuredClone(options.material.sourceReference),
    }] } : {}),
  })
  return profile
}

function tinyGlb(document = tinyDocument(), binary = Buffer.alloc(16, 0x5a)) {
  const serialized = Buffer.from(JSON.stringify(document), 'utf8')
  const json = Buffer.concat([serialized, Buffer.alloc((4 - serialized.length % 4) % 4, 0x20)])
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length)
  output.write('glTF'); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20)
  const binaryOffset = 20 + json.length
  output.writeUInt32LE(binary.length, binaryOffset); output.writeUInt32LE(0x004e4942, binaryOffset + 4); binary.copy(output, binaryOffset + 8)
  return output
}

function glbBinaryPayload(bytes: Buffer) {
  const offset = 20 + bytes.readUInt32LE(12)
  assert.equal(bytes.readUInt32LE(offset + 4), 0x004e4942, 'GLB should keep a standard BIN chunk')
  const length = bytes.readUInt32LE(offset)
  return Buffer.from(bytes.subarray(offset + 8, offset + 8 + length))
}

function tinyDocument(profile = renderingProfile()): any {
  return {
    asset: { version: '2.0', generator: 'FBX2glTF v0.13.1' }, buffers: [{ byteLength: 16 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' }],
    meshes: [{ name: 'Body', primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    skins: [{ joints: [0] }], nodes: [{ name: 'joint' }, { name: 'Body', mesh: 0, skin: 0 }],
    materials: [{ name: 'Body', alphaMode: 'OPAQUE' }], textures: [{ source: 0 }], images: [{ bufferView: 0, mimeType: 'image/png' }],
    animations: [{ name: 'Idle', channels: [], samplers: [] }],
    scenes: [{ nodes: [1], extras: { chibi: {
      renderingProfile: profile,
      renderingProfileDiagnostics: {
        schemaVersion: 1, policyVersion: profile.policyVersion,
        intentionallyExcludedRenderers: [], excludedChildRendererEvents: [], unprofiledGeometry: [],
        ...(Array.isArray(profile.fxExclusionProofs) ? { fxExclusionProofs: profile.fxExclusionProofs } : {}),
        ...(Array.isArray(profile.excludedFxInstantiationEvents) ? { excludedFxInstantiationEvents: profile.excludedFxInstantiationEvents } : {}),
      },
    } } }], scene: 0,
  }
}

function skinSkeletonDocument(skeleton: number | undefined, profile = renderingProfile()) {
  const document = tinyDocument(profile)
  document.nodes = [
    { name: 'Root', children: [1, 3] },
    { name: 'Branch A', children: [2] },
    { name: 'Joint A' },
    { name: 'Branch B', children: [4] },
    { name: 'Joint B' },
    { name: 'Body', mesh: 0, skin: 0 },
  ]
  document.skins = [{ joints: [2, 4], ...(skeleton === undefined ? {} : { skeleton }), inverseBindMatrices: 0 }]
  document.scenes[0].nodes = [0, 5]
  return document
}

function skinnedGlb(skeleton: number | undefined, profile = renderingProfile()) {
  const binary = Buffer.alloc(224)
  const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0]
  positions.forEach((value, index) => binary.writeFloatLE(value, index * 4))
  for (let vertex = 0; vertex < 3; vertex += 1) {
    binary[36 + vertex * 4] = 0
    binary.writeFloatLE(1, 48 + vertex * 16)
  }
  for (let matrix = 0; matrix < 2; matrix += 1) {
    for (let diagonal = 0; diagonal < 4; diagonal += 1) binary.writeFloatLE(1, 96 + matrix * 64 + (diagonal * 4 + diagonal) * 4)
  }
  const document = tinyDocument(profile)
  document.buffers = [{ byteLength: binary.length }]
  document.bufferViews = [
    { buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 12 },
    { buffer: 0, byteOffset: 48, byteLength: 48 }, { buffer: 0, byteOffset: 96, byteLength: 128 },
  ]
  document.accessors = [
    { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
    { bufferView: 1, componentType: 5121, count: 3, type: 'VEC4' },
    { bufferView: 2, componentType: 5126, count: 3, type: 'VEC4' },
    { bufferView: 3, componentType: 5126, count: 2, type: 'MAT4' },
  ]
  document.meshes = [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] }]
  document.skins = [{ joints: [2, 4], inverseBindMatrices: 3, ...(skeleton === undefined ? {} : { skeleton }) }]
  document.nodes = [
    { name: 'Root', children: [1, 3, 5] }, { name: 'Branch A', children: [2] }, { name: 'Joint A' },
    { name: 'Branch B', children: [4] }, { name: 'Joint B' }, { name: 'Body', mesh: 0, skin: 0 },
  ]
  document.scenes[0].nodes = [0]
  return tinyGlb(document, binary)
}

async function loadSkinnedModel(bytes: Buffer) {
  const data = Uint8Array.from(bytes).buffer as ArrayBuffer
  const gltf = await new GLTFLoader().parseAsync(data, '')
  let signature: unknown
  gltf.scene.traverse((object: any) => {
    if (!object.isSkinnedMesh) return
    signature = {
      bones: object.skeleton.bones.map((bone: any) => [bone.name, bone.parent?.name ?? null]),
      inverses: object.skeleton.boneInverses.map((matrix: any) => [...matrix.elements]),
      position: [...object.geometry.attributes.position.array],
      joints: [...object.geometry.attributes.skinIndex.array],
      weights: [...object.geometry.attributes.skinWeight.array],
    }
  })
  assert.ok(signature, 'GLTFLoader should construct the skinned mesh')
  return signature
}

function glbDocument(bytes: Buffer) {
  const length = bytes.readUInt32LE(12)
  return JSON.parse(bytes.toString('utf8', 20, 20 + length).trim())
}

function changedJson(bytes: Buffer, mutate: (document: any) => void) {
  const document = glbDocument(bytes)
  mutate(document)
  const originalBinaryOffset = 20 + bytes.readUInt32LE(12)
  const binaryLength = bytes.readUInt32LE(originalBinaryOffset)
  const binary = Buffer.from(bytes.subarray(originalBinaryOffset + 8, originalBinaryOffset + 8 + binaryLength))
  return tinyGlb(document, binary)
}

test('core fingerprint ignores only diagnostic versions and warning text', () => {
  const profile = renderingProfile()
  const characterProfile = chibiProfile() as any
  const input = {
    sourceIdentity: 'a', dependencyFingerprint, converterVersion: 'assetstudio-fbx2gltf-core-v1',
    materialVersion: 'mx-materials-v39', adapterVersion: 'mx-character-adapters-v9',
    exportOverrides: {}, profile, ...effectiveClipSelection(chibiProfile()),
  }
  const original = buildCoreFingerprint(input)
  const diagnosticRevision = renderingProfile({ policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10', warning: 'Changed warning wording.' })
  assert.equal(buildCoreFingerprint({ ...input, profile: diagnosticRevision }), original)
  const changedSourceProfile = structuredClone(profile) as any
  changedSourceProfile.sourceIdentity = 'b'
  assert.notEqual(buildCoreFingerprint({ ...input, sourceIdentity: 'b', profile: changedSourceProfile }), original)
  const changedDependencyFingerprint = 'c'.repeat(64)
  const changedDependencyProfile = structuredClone(profile) as any
  changedDependencyProfile.dependencyFingerprint = changedDependencyFingerprint
  assert.notEqual(buildCoreFingerprint({
    ...input, dependencyFingerprint: changedDependencyFingerprint, profile: changedDependencyProfile,
  }), original)
  assert.notEqual(
    buildFingerprint({ fingerprint: dependencyFingerprint }, characterProfile, {}, profile),
    buildFingerprint({ fingerprint: dependencyFingerprint }, characterProfile, {}, diagnosticRevision),
    'full diagnostic identity changes while the converted-core fingerprint stays stable',
  )
  const fxDiagnosticRevision = addFxDiagnostic(structuredClone(diagnosticRevision) as any, 'new approved FX graph evidence')
  assert.equal(buildCoreFingerprint({ ...input, profile: fxDiagnosticRevision }), original)
  assert.notEqual(buildCoreFingerprint({ ...input, profile: renderingProfile({ visible: false }) }), original)
  assert.notEqual(buildCoreFingerprint({ ...input, profile: renderingProfile({ excludedEvent: true }) }), original)
  const materialChanged = structuredClone(profile) as any
  materialChanged.renderers[0].materialSlots[0].renderState.alphaMode = 'BLEND'
  assert.notEqual(buildCoreFingerprint({ ...input, profile: materialChanged }), original)
  const exclusionChanged = structuredClone(profile) as any
  exclusionChanged.excludedRenderers.push({
    sourceReference, name: 'Glow', reasonCode: 'PRESENTATION_ONLY', evidence: ['source-prefab effect component'],
  })
  exclusionChanged.validation.excludedRenderers = exclusionChanged.excludedRenderers
  assert.notEqual(buildCoreFingerprint({ ...input, profile: exclusionChanged }), original)
  assert.notEqual(buildCoreFingerprint({ ...input, clips: ['Idle', 'Walk'] }), original)
  assert.notEqual(buildCoreFingerprint({ ...input, materialVersion: 'mx-materials-v40' }), original)
  assert.notEqual(buildCoreFingerprint({
    ...input, adapterVersion: 'mx-character-adapters-v10',
    profile: { ...renderingProfile({ policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10' }), adapterVersion: 'mx-character-adapters-v10' },
  }), original)
  assert.notEqual(buildCoreFingerprint({ ...input, converterVersion: 'assetstudio-fbx2gltf-core-v2' }), original)
  assert.equal(CHIBI_SKIN_SKELETON_METADATA_VERSION, 'chibi-skin-skeleton-lca-v1')
  const legacyFullIdentity = {
    source: 'a', exporter: CHIBI_EXPORTER_VERSION, materials: CHIBI_MATERIAL_VERSION, exportOverrides: {},
    renderingProfile: CHIBI_RENDERING_PROFILE_VERSION, renderingPolicy: CHIBI_RENDERING_POLICY_VERSION,
    shaderAdapters: CHIBI_SHADER_ADAPTER_VERSION,
  }
  const stable = (value: unknown): string => Array.isArray(value) ? `[${value.map(stable).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
      : JSON.stringify(value)
  const legacyFingerprint = createHash('sha256').update(stable(legacyFullIdentity)).digest('hex')
  assert.notEqual(buildFingerprint({ fingerprint: 'a' }, characterProfile, {}), legacyFingerprint,
    'skin-root metadata version refreshes the full artifact identity without changing the converted-core key')
})

test('source-complete core geometry warnings refresh diagnostics without masking blockers or errors', () => {
  const beforeWarning = coreGeometryWarning('Legacy component label recorded for diagnosis.')
  const afterWarning = coreGeometryWarning('Exact source slots prove primitive 0 is cap-to-torso separation, not a missing neck.')
  const beforeProfile = renderingProfile({ coreGeometryWarnings: [beforeWarning] })
  const afterProfile = renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
    coreGeometryWarnings: [afterWarning],
  })
  const input = {
    sourceIdentity: 'a', dependencyFingerprint, converterVersion: 'assetstudio-fbx2gltf-core-v1',
    materialVersion: 'mx-materials-v39', adapterVersion: 'mx-character-adapters-v9',
    exportOverrides: {}, initialPose: 'Idle', clips: ['Idle', 'Walk', 'Touch'],
  }
  const original = buildCoreFingerprint({ ...input, profile: beforeProfile })
  assert.equal(buildCoreFingerprint({ ...input, profile: afterProfile }), original)
  assert.equal(buildCoreFingerprint({
    ...input, profile: renderingProfile({ coreGeometryWarnings: [] }),
  }), original)
  const actionableAfterProfile = actionableRenderingProfile(afterProfile) as { validation: Record<string, unknown> } & Record<string, unknown>
  assert.equal(Object.hasOwn(actionableAfterProfile, 'coreGeometryWarnings'), false)
  assert.equal(Object.hasOwn(actionableAfterProfile.validation, 'coreGeometryWarnings'), false)
  assert.notEqual(
    buildFingerprint({ fingerprint: dependencyFingerprint }, chibiProfile() as any, {}, beforeProfile),
    buildFingerprint({ fingerprint: dependencyFingerprint }, chibiProfile() as any, {}, afterProfile),
    'the full profile fingerprint still tracks refreshed diagnostics',
  )

  const changedBlocker = structuredClone(afterProfile) as any
  const blocker = { reasonCode: 'SOURCE_REQUIRED_CORE_GEOMETRY_UNRESOLVED', message: 'Required body component is unresolved.' }
  changedBlocker.coreGeometryBlockers = [blocker]
  changedBlocker.validation.coreGeometryBlockers = [structuredClone(blocker)]
  assert.notEqual(buildCoreFingerprint({ ...input, profile: changedBlocker }), original)
  const changedValidationError = structuredClone(afterProfile) as any
  changedValidationError.validation.errors = [{ reasonCode: 'SOURCE_REQUIRED_CORE_GEOMETRY_UNRESOLVED' }]
  assert.notEqual(buildCoreFingerprint({ ...input, profile: changedValidationError }), original)

  const mismatchedMirrors = structuredClone(afterProfile) as any
  mismatchedMirrors.validation.coreGeometryWarnings = []
  assert.throws(() => buildCoreFingerprint({ ...input, profile: mismatchedMirrors }), /core geometry warning arrays are incomplete or inconsistent/)
})

test('pinned v12 legacy identity requires exact source, diagnostic fingerprint, clips, and persisted pose', () => {
  const profile = chibiProfile()
  const overrides = { export: { includeClips: true } }
  const fingerprint = buildFingerprint({ fingerprint: dependencyFingerprint }, profile as any, overrides)
  assert.notEqual(buildPinnedV12Fingerprint(dependencyFingerprint, overrides), fingerprint,
    'the legacy v12 identity is pinned independently from the current v13 full fingerprint')
  const pinnedFingerprint = buildPinnedV12Fingerprint(dependencyFingerprint, overrides)
  const asset = {
    id: 'asset-1', sourceIdentity: 'a', dependencyFingerprint,
    exporterVersion: 'assetstudio-0.19.0_fbx2gltf-0.13.1-render-profile-v7-policy-v7-material-claims-v2-weapon-ancestry-v1',
    fingerprint: pinnedFingerprint, clips: ['Touch', 'Idle', 'Walk'],
  }
  const input = {
    asset, binding: { assetId: asset.id, profile },
    candidate: { sourceIdentity: 'a', fingerprint: dependencyFingerprint }, overrides, effectiveProfile: profile,
  }
  assert.equal(pinnedV12AssetMatches(input), true)
  assert.equal(pinnedV12AssetMatches({ ...input, binding: { ...input.binding, profile: chibiProfile('Walk') } }), false)
  assert.equal(pinnedV12AssetMatches({ ...input, asset: { ...asset, clips: ['Idle', 'Walk'] } }), false)
  assert.equal(pinnedV12AssetMatches({ ...input, asset: { ...asset, exporterVersion: 'unrecognized' } }), false)
  assert.equal(pinnedV12AssetMatches({ ...input, candidate: { ...input.candidate, fingerprint: 'c'.repeat(64) } }), false)
  assert.equal(pinnedV12AssetMatches({ ...input, candidate: { ...input.candidate, sourceIdentity: 'other' } }), false)
  assert.equal(pinnedV12AssetMatches({ ...input, asset: { ...asset, dependencyFingerprint: 'c'.repeat(64) } }), false)
  assert.equal(pinnedV12AssetMatches({ ...input, binding: { ...input.binding, assetId: 'other' } }), false)
  assert.equal(pinnedV12AssetMatches({ ...input, overrides: { export: { includeClips: false } } }), false)
})

test('legacy v12 GLB bridge requires the pinned generator, profile schema, policy, and source identity', () => {
  const profile = renderingProfile()
  const bytes = tinyGlb(tinyDocument(profile))
  assert.deepEqual(assertPinnedV12GlbProfile(bytes, 'a', dependencyFingerprint), profile)
  const changedGenerator = changedJson(bytes, document => { document.asset.generator = 'unknown glTF writer' })
  assert.throws(() => assertPinnedV12GlbProfile(changedGenerator, 'a', dependencyFingerprint), /pinned v12 GLB generator/)
  const changedSchema = changedJson(bytes, document => { document.scenes[0].extras.chibi.renderingProfile.schemaVersion = 3 })
  assert.throws(() => assertPinnedV12GlbProfile(changedSchema, 'a', dependencyFingerprint), /profile is incomplete/)
  const changedPolicy = changedJson(bytes, document => {
    document.scenes[0].extras.chibi.renderingProfile.policyVersion = 'unknown'
    document.scenes[0].extras.chibi.renderingProfile.fxExclusionProofs = []
    document.scenes[0].extras.chibi.renderingProfile.excludedFxInstantiationEvents = []
    document.scenes[0].extras.chibi.renderingProfile.validation.fxExclusionProofs = []
    document.scenes[0].extras.chibi.renderingProfile.validation.excludedFxInstantiationEvents = []
    document.scenes[0].extras.chibi.renderingProfileDiagnostics.policyVersion = 'unknown'
    document.scenes[0].extras.chibi.renderingProfileDiagnostics.fxExclusionProofs = []
    document.scenes[0].extras.chibi.renderingProfileDiagnostics.excludedFxInstantiationEvents = []
  })
  assert.throws(() => assertPinnedV12GlbProfile(changedPolicy, 'a', dependencyFingerprint), /pinned v12 profile schema/)
  assert.throws(() => assertPinnedV12GlbProfile(bytes, 'other', dependencyFingerprint), /exact source identity/)
  assert.throws(() => assertPinnedV12GlbProfile(bytes, 'a', 'c'.repeat(64)), /exact source identity/)
})

test('diagnostic rewrite preserves output node bindings, BIN, and every non-allowlisted GLB field', () => {
  const oldProfile = renderingProfile()
  const currentProfile = renderingProfile({ policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10', warning: 'Current warning.' }) as any
  currentProfile.renderers[0].glbNodeIndex = null
  currentProfile.renderers[0].materialSlots[0].glb = null
  const before = tinyGlb(tinyDocument(oldProfile))
  const output = rewriteGlbDiagnostics(before, currentProfile)
  assert.equal(output.renderingProfile.renderers[0].glbNodeIndex, 1)
  assert.deepEqual(output.renderingProfile.renderers[0].materialSlots[0].glb, { nodeIndex: 1, materialIndex: 0 })
  assertMetadataOnlyGlbRewrite(before, output.bytes)
  assert.equal(createHash('sha256').update(before).digest('hex') === createHash('sha256').update(output.bytes).digest('hex'), false)
  assert.equal(glbDocument(output.bytes).scenes[0].extras.chibi.renderingProfileDiagnostics.policyVersion, currentProfile.policyVersion)
})

test('core geometry warning rewrites refresh both mirrors and preserve the converted core payload bytes', async () => {
  const oldWarning = coreGeometryWarning('Legacy warning text.')
  const currentWarning = coreGeometryWarning('Source evidence reclassifies the separated primitive as a cap, not a missing head.')
  const oldProfile = renderingProfile({ coreGeometryWarnings: [oldWarning] })
  const currentProfile = renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
    coreGeometryWarnings: [currentWarning],
  })
  const before = skinnedGlb(0, oldProfile)
  const beforeDocument = glbDocument(before)
  const output = rewriteGlbDiagnostics(before, currentProfile)
  const afterDocument = glbDocument(output.bytes)
  const rewrittenProfile = afterDocument.scenes[0].extras.chibi.renderingProfile

  assert.deepEqual(rewrittenProfile.coreGeometryWarnings, currentProfile.coreGeometryWarnings)
  assert.deepEqual(rewrittenProfile.validation.coreGeometryWarnings, currentProfile.validation.coreGeometryWarnings)
  assert.deepEqual(output.renderingProfile.coreGeometryWarnings, currentProfile.coreGeometryWarnings)
  assert.notDeepEqual(rewrittenProfile.coreGeometryWarnings, [oldWarning])
  assert.deepEqual(glbBinaryPayload(output.bytes), glbBinaryPayload(before))
  for (const key of ['buffers', 'bufferViews', 'accessors', 'meshes', 'skins', 'materials', 'textures', 'images', 'animations']) {
    assert.deepEqual(afterDocument[key], beforeDocument[key], `metadata refresh must preserve GLB ${key}`)
  }
  assert.deepEqual(await loadSkinnedModel(output.bytes), await loadSkinnedModel(before),
    'the loaded joint hierarchy, inverse binds, positions, weights, and joint indices stay byte-identical')
  assertMetadataOnlyGlbRewrite(before, output.bytes)

  const clearedOutput = rewriteGlbDiagnostics(before, renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }))
  const clearedProfile = glbDocument(clearedOutput.bytes).scenes[0].extras.chibi.renderingProfile
  assert.equal(Object.hasOwn(clearedProfile, 'coreGeometryWarnings'), false)
  assert.equal(Object.hasOwn(clearedProfile.validation, 'coreGeometryWarnings'), false)
  assert.deepEqual(glbBinaryPayload(clearedOutput.bytes), glbBinaryPayload(before))
})

test('cached metadata rewrite repairs only a present non-ancestor skin root to the joint LCA', () => {
  const oldProfile = renderingProfile()
  const currentProfile = renderingProfile({ policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10' })
  const before = tinyGlb(skinSkeletonDocument(1, oldProfile))
  const output = rewriteGlbDiagnostics(before, currentProfile)
  const after = glbDocument(output.bytes)
  assert.equal(after.skins[0].skeleton, 0)
  assert.equal(after.skins[0].inverseBindMatrices, 0)
  assert.deepEqual(after.skins[0].joints, [2, 4])
  assert.deepEqual(after.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonRepairs, [{
    schemaVersion: 1, policyVersion: CHIBI_SKIN_SKELETON_METADATA_VERSION,
    skinIndex: 0, previousSkeleton: 1, repairedSkeleton: 0, jointIndices: [2, 4],
    jointAncestorPaths: [[0, 1, 2], [0, 3, 4]], reasonCode: 'PRESENT_SKELETON_NOT_COMMON_ANCESTOR',
  }])
  assert.equal(after.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonMetadataVersion, CHIBI_SKIN_SKELETON_METADATA_VERSION)
  assert.deepEqual(validateSkinSkeletonMetadata(after, after.scenes[0].extras.chibi.renderingProfileDiagnostics, true),
    after.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonRepairs)
  assertMetadataOnlyGlbRewrite(before, output.bytes)
})

test('Three GLTFLoader produces the same skin, joints, weights, and inverse binds after root metadata repair', async () => {
  const before = skinnedGlb(1)
  const output = rewriteGlbDiagnostics(before, renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }))
  assert.equal(glbDocument(output.bytes).skins[0].skeleton, 0)
  assert.deepEqual(await loadSkinnedModel(output.bytes), await loadSkinnedModel(before))
  assertMetadataOnlyGlbRewrite(before, output.bytes)
})

test('metadata rewrite preserves valid and omitted skin.skeleton values', () => {
  const currentProfile = renderingProfile({ policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10' })
  for (const skeleton of [0, undefined]) {
    const before = tinyGlb(skinSkeletonDocument(skeleton))
    const output = rewriteGlbDiagnostics(before, currentProfile)
    const after = glbDocument(output.bytes)
    if (skeleton === undefined) assert.equal(Object.hasOwn(after.skins[0], 'skeleton'), false)
    else assert.equal(after.skins[0].skeleton, 0)
    assert.deepEqual(after.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonRepairs, [])
    assertMetadataOnlyGlbRewrite(before, output.bytes)
  }
})

test('skin-root reuse fails closed for invalid, ambiguous, or disconnected joint graphs', () => {
  const currentProfile = renderingProfile({ policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10' })
  const invalidDocuments: Array<[string, (document: any) => void]> = [
    ['duplicate joint index', document => { document.skins[0].joints = [2, 2] }],
    ['out-of-range joint index', document => { document.skins[0].joints = [2, 9] }],
    ['out-of-range skeleton index', document => { document.skins[0].skeleton = 9 }],
    ['multiple parents', document => { document.nodes[5].children = [2] }],
    ['cycle', document => { document.nodes[2].children = [1] }],
    ['no common ancestor', document => {
      document.nodes = [{ name: 'Joint A' }, { name: 'Joint B' }, { name: 'Body', mesh: 0, skin: 0 }]
      document.skins[0].joints = [0, 1]
      document.skins[0].skeleton = 0
      document.scenes[0].nodes = [0, 1, 2]
    }],
  ]
  for (const [label, mutate] of invalidDocuments) {
    const document = skinSkeletonDocument(1)
    mutate(document)
    assert.throws(() => rewriteGlbDiagnostics(tinyGlb(document), currentProfile), /Skin skeleton metadata/, label)
  }
})

test('metadata rewrite rejects unproven skeleton, graph, skin, proof, and BIN changes', () => {
  const currentProfile = renderingProfile({ policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10' })
  const before = tinyGlb(skinSkeletonDocument(1))
  const output = rewriteGlbDiagnostics(before, currentProfile)
  const alter = (mutate: (document: any) => void) => changedJson(output.bytes, mutate)
  assert.throws(() => assertMetadataOnlyGlbRewrite(before, alter(document => { document.skins[0].skeleton = 3 })), /non-allowlisted GLB JSON/)
  assert.throws(() => assertMetadataOnlyGlbRewrite(before, alter(document => { document.skins[0].joints = [2, 3] })), /non-allowlisted GLB JSON/)
  assert.throws(() => assertMetadataOnlyGlbRewrite(before, alter(document => { document.nodes[0].children = [1, 3, 4] })), /non-allowlisted GLB JSON/)
  assert.throws(() => assertMetadataOnlyGlbRewrite(before, alter(document => {
    document.scenes[0].extras.chibi.renderingProfileDiagnostics.skinSkeletonRepairs[0].repairedSkeleton = 3
  })), /repair diagnostic/)
  const binaryOffset = 20 + output.bytes.readUInt32LE(12)
  const changedBinary = Buffer.from(output.bytes)
  changedBinary[binaryOffset + 8] ^= 1
  assert.throws(() => assertMetadataOnlyGlbRewrite(before, changedBinary), /GLB BIN bytes/)
})

test('typed particle-only FX diagnostics refresh without conversion or changes to the immutable GLB core', () => {
  const beforeProfile = renderingProfile()
  const currentProfile = addFxDiagnostic(renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }) as any)
  const before = tinyGlb(tinyDocument(beforeProfile))
  const output = rewriteGlbDiagnostics(before, currentProfile)
  const after = glbDocument(output.bytes)
  assert.deepEqual(after.scenes[0].extras.chibi.renderingProfile.fxExclusionProofs, currentProfile.fxExclusionProofs)
  assert.deepEqual(after.scenes[0].extras.chibi.renderingProfile.validation.excludedFxInstantiationEvents, currentProfile.excludedFxInstantiationEvents)
  assert.deepEqual(after.scenes[0].extras.chibi.renderingProfileDiagnostics.excludedFxInstantiationEvents, currentProfile.excludedFxInstantiationEvents)
  assertMetadataOnlyGlbRewrite(before, output.bytes)
  const beforeBinaryOffset = 20 + before.readUInt32LE(12)
  const afterBinaryOffset = 20 + output.bytes.readUInt32LE(12)
  assert.deepEqual(
    before.subarray(beforeBinaryOffset + 8, beforeBinaryOffset + 8 + before.readUInt32LE(beforeBinaryOffset)),
    output.bytes.subarray(afterBinaryOffset + 8, afterBinaryOffset + 8 + output.bytes.readUInt32LE(afterBinaryOffset)),
  )
})

test('cache accepts only exact serialized InstantiateFx literals with source-bound proof evidence', () => {
  const alias = addFxDiagnostic(renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }) as any, 'source graph is complete and particle-only', 'InstantiateFx')
  assert.doesNotThrow(() => actionableRenderingProfile(alias))

  const invalid = structuredClone(alias)
  invalid.fxExclusionProofs[0].function = 'InstantiateFxExtra'
  invalid.excludedFxInstantiationEvents[0].function = 'InstantiateFxExtra'
  invalid.validation.fxExclusionProofs = structuredClone(invalid.fxExclusionProofs)
  invalid.validation.excludedFxInstantiationEvents = structuredClone(invalid.excludedFxInstantiationEvents)
  assert.throws(() => actionableRenderingProfile(invalid), /incomplete exact animation-event identity/)

  const mismatchedSourceEvidence = structuredClone(alias)
  mismatchedSourceEvidence.fxExclusionProofs[0].evidence[1] = 'selected event is AniEvt_InstantiateFx at Touch 0.25s (source order 3)'
  mismatchedSourceEvidence.excludedFxInstantiationEvents[0].evidence = structuredClone(mismatchedSourceEvidence.fxExclusionProofs[0].evidence)
  mismatchedSourceEvidence.validation.fxExclusionProofs = structuredClone(mismatchedSourceEvidence.fxExclusionProofs)
  mismatchedSourceEvidence.validation.excludedFxInstantiationEvents = structuredClone(mismatchedSourceEvidence.excludedFxInstantiationEvents)
  assert.throws(() => actionableRenderingProfile(mismatchedSourceEvidence), /missing exact event, target, or core-disjointness evidence/)
})

test('FX cache allowlist rejects incomplete, duplicated, unapproved, mismatched, or core-overlapping evidence', () => {
  const valid = addFxDiagnostic(renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }) as any)
  const invalidProof = (mutate: (profile: any) => void, pattern: RegExp) => {
    const profile = structuredClone(valid)
    mutate(profile)
    profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs)
    profile.validation.excludedFxInstantiationEvents = structuredClone(profile.excludedFxInstantiationEvents)
    assert.throws(() => actionableRenderingProfile(profile), pattern)
  }
  invalidProof(profile => { profile.fxExclusionProofs[0].completeGraph = false }, /not complete particle-only evidence/)
  invalidProof(profile => { profile.fxExclusionProofs[0].approvedMonoScriptReferences = [{ ...sourceReference }] }, /unapproved MonoScript/)
  invalidProof(profile => { profile.fxExclusionProofs[0].componentReferences[1].sourceReference = sourceReference }, /overlaps required core content/)
  invalidProof(profile => { profile.fxExclusionProofs[0].rendererAssets[0].meshReference = null }, /renderer asset evidence is incomplete/)
  const duplicate = structuredClone(valid)
  duplicate.fxExclusionProofs.push(structuredClone(duplicate.fxExclusionProofs[0]))
  duplicate.excludedFxInstantiationEvents.push(structuredClone(duplicate.excludedFxInstantiationEvents[0]))
  duplicate.validation.fxExclusionProofs = structuredClone(duplicate.fxExclusionProofs)
  duplicate.validation.excludedFxInstantiationEvents = structuredClone(duplicate.excludedFxInstantiationEvents)
  assert.throws(() => actionableRenderingProfile(duplicate), /event identity is duplicated/)
  const mismatch = structuredClone(valid)
  mismatch.validation.excludedFxInstantiationEvents[0].targetReference.objectId = 'different-target'
  assert.throws(() => actionableRenderingProfile(mismatch), /disagree with validation records/)
})

test('FX overlap excludes only the exact presentation renderer subtree, not required renderer assets', () => {
  const valid = addUiShapedPresentationQuad(addFxDiagnostic(renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }) as any))
  assert.doesNotThrow(() => actionableRenderingProfile(valid))

  const malformedMirror = structuredClone(valid)
  malformedMirror.validation.excludedRenderers[0].name = 'Different renderer'
  assert.throws(() => actionableRenderingProfile(malformedMirror), /renderer classifications are incomplete or inconsistent/)

  const duplicateAssemblyIdentity = structuredClone(valid)
  duplicateAssemblyIdentity.assembly.renderers.push(structuredClone(duplicateAssemblyIdentity.assembly.renderers[1]))
  assert.throws(() => actionableRenderingProfile(duplicateAssemblyIdentity), /do not map one-to-one/)

  const requiredQuadOverlap = structuredClone(valid)
  addRequiredRenderer(requiredQuadOverlap, {
    name: 'RequiredQuad', sourceReference: { bundleSha256: '1'.repeat(64), serializedFile: 'CAB-core', objectId: 'required-quad-renderer' },
    mesh: { file: 'unity default resources', pathId: '10210' },
  })
  assert.throws(() => actionableRenderingProfile(requiredQuadOverlap), /overlaps required core content/)

  const meshReference = { bundleSha256: '2'.repeat(64), serializedFile: 'CAB-shared', objectId: '8801' }
  const requiredMeshOverlap = structuredClone(valid)
  addRequiredRenderer(requiredMeshOverlap, {
    name: 'RequiredMesh', sourceReference: { bundleSha256: '3'.repeat(64), serializedFile: 'CAB-core', objectId: 'required-mesh-renderer' },
    mesh: { file: 'CAB-shared', pathId: '8801', sourceReference: meshReference },
  })
  requiredMeshOverlap.fxExclusionProofs[0].rendererAssets[0].meshReference = {
    pointer: { file: 'CAB-shared', pathId: '8801' }, fileID: 0,
    identityResolved: true, objectResolved: true, sourceReference: structuredClone(meshReference),
  }
  syncFxProfileMirrors(requiredMeshOverlap)
  assert.throws(() => actionableRenderingProfile(requiredMeshOverlap), /overlaps required core content/)

  const materialReference = { bundleSha256: '4'.repeat(64), serializedFile: 'CAB-shared', objectId: '8802' }
  const requiredMaterialOverlap = structuredClone(valid)
  addRequiredRenderer(requiredMaterialOverlap, {
    name: 'RequiredMaterial', sourceReference: { bundleSha256: '5'.repeat(64), serializedFile: 'CAB-core', objectId: 'required-material-renderer' },
    mesh: { file: 'CAB-core', pathId: 'ordinary-mesh' },
    material: { file: 'CAB-shared', pathId: '8802', sourceReference: materialReference },
  })
  requiredMaterialOverlap.fxExclusionProofs[0].rendererAssets[0].materialReferences = [{
    pointer: { file: 'CAB-shared', pathId: '8802' }, fileID: 1,
    identityResolved: true, objectResolved: true, sourceReference: structuredClone(materialReference),
  }]
  syncFxProfileMirrors(requiredMaterialOverlap)
  assert.throws(() => actionableRenderingProfile(requiredMaterialOverlap), /overlaps required core content/)
})

test('FX cache accepts explicit null and exact external-table renderer PPtrs, but rejects unresolved local PPtrs and core overlap', () => {
  const profile = addFxDiagnostic(renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }) as any)
  const syncFxMirrors = (value: any) => {
    value.validation.fxExclusionProofs = structuredClone(value.fxExclusionProofs)
    value.validation.excludedFxInstantiationEvents = structuredClone(value.excludedFxInstantiationEvents)
  }
  const explicitNull = {
    pointer: { file: 'CAB-fx', pathId: '0' }, fileID: 0,
    identityResolved: true, objectResolved: false, sourceReference: null,
  }
  const externalIdentityOnly = {
    pointer: { file: 'CAB-external', pathId: '77', externalGuid: '00000000000000000000000000000000' }, fileID: 8,
    identityResolved: true, objectResolved: false, sourceReference: null,
  }
  const externalResolvedObject = {
    pointer: { file: 'CAB-external', pathId: '78', externalGuid: '00000000000000000000000000000000' }, fileID: 8,
    identityResolved: true, objectResolved: true, sourceReference: null,
  }
  const externallyEnrichedIdentityOnly = {
    pointer: { file: 'CAB-external', pathId: '79', externalGuid: '00000000000000000000000000000000' }, fileID: 8,
    identityResolved: true, objectResolved: false,
    sourceReference: { bundleSha256: '6'.repeat(64), serializedFile: 'CAB-external', objectId: '79' },
  }
  const profileProof = profile.fxExclusionProofs[0]
  profileProof.rendererAssets[0].meshReference = structuredClone(explicitNull)
  profileProof.rendererAssets[0].materialReferences = [
    structuredClone(externalIdentityOnly), structuredClone(externalResolvedObject),
    structuredClone(externallyEnrichedIdentityOnly), structuredClone({
      ...explicitNull,
      pointer: { file: 'CAB-external', pathId: '0', externalGuid: '00000000000000000000000000000000' },
      fileID: 8,
    }),
  ]
  syncFxMirrors(profile)
  assert.doesNotThrow(() => actionableRenderingProfile(profile))
  assert.doesNotThrow(() => buildCoreFingerprint({
    sourceIdentity: 'a', dependencyFingerprint, converterVersion: 'assetstudio-fbx2gltf-core-v1',
    materialVersion: 'mx-materials-v39', adapterVersion: profile.adapterVersion,
    exportOverrides: {}, profile, initialPose: 'Idle', clips: ['Idle'],
  }))

  const unresolvedLocal = structuredClone(profile)
  unresolvedLocal.fxExclusionProofs[0].rendererAssets[0].materialReferences[0] = {
    pointer: { file: 'CAB-fx', pathId: '77' }, fileID: 0,
    identityResolved: true, objectResolved: false, sourceReference: null,
  }
  syncFxMirrors(unresolvedLocal)
  assert.throws(() => actionableRenderingProfile(unresolvedLocal), /unresolved renderer asset PPtr evidence/)

  const identityUnresolved = structuredClone(profile)
  identityUnresolved.fxExclusionProofs[0].rendererAssets[0].materialReferences[0].identityResolved = false
  syncFxMirrors(identityUnresolved)
  assert.throws(() => actionableRenderingProfile(identityUnresolved), /unresolved renderer asset PPtr evidence/)

  const malformedExternalGuid = structuredClone(profile)
  malformedExternalGuid.fxExclusionProofs[0].rendererAssets[0].materialReferences[0].pointer.externalGuid = 'not-a-guid'
  syncFxMirrors(malformedExternalGuid)
  assert.throws(() => actionableRenderingProfile(malformedExternalGuid), /unresolved renderer asset PPtr evidence/)

  for (const pathId of ['77x', '00', '-0', '01', '-01']) {
    const invalidPathId = structuredClone(profile)
    invalidPathId.fxExclusionProofs[0].rendererAssets[0].materialReferences[0].pointer.pathId = pathId
    syncFxMirrors(invalidPathId)
    assert.throws(() => actionableRenderingProfile(invalidPathId), /unresolved renderer asset PPtr evidence/)
  }

  const mismatchedSource = structuredClone(profile)
  mismatchedSource.fxExclusionProofs[0].rendererAssets[0].materialReferences[0].sourceReference = {
    bundleSha256: 'd'.repeat(64), serializedFile: 'CAB-other', objectId: '77',
  }
  syncFxMirrors(mismatchedSource)
  assert.throws(() => actionableRenderingProfile(mismatchedSource), /source and PPtr identities disagree/)

  const coreOverlap = structuredClone(profile)
  coreOverlap.fxExclusionProofs[0].rendererAssets[0].materialReferences[0].pointer = {
    file: 'CAB-prefab', pathId: '4', externalGuid: '00000000000000000000000000000000',
  }
  syncFxMirrors(coreOverlap)
  assert.throws(() => actionableRenderingProfile(coreOverlap), /overlaps required core content/)
})

test('FX cache permits repeated approved MonoScript identities only across distinct MonoBehaviour components', () => {
  const profile = addFxDiagnostic(renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }) as any)
  const proof = profile.fxExclusionProofs[0]
  proof.componentReferences.push({
    sourceReference: { bundleSha256: 'c'.repeat(64), serializedFile: 'CAB-fx', objectId: 'fx-mono-behaviour-2' },
    type: 'MonoBehaviour',
  })
  proof.approvedMonoScriptReferences.push(structuredClone(proof.approvedMonoScriptReferences[0]))
  profile.validation.fxExclusionProofs = structuredClone(profile.fxExclusionProofs)
  profile.validation.excludedFxInstantiationEvents = structuredClone(profile.excludedFxInstantiationEvents)
  assert.doesNotThrow(() => actionableRenderingProfile(profile))

  const duplicateComponent = structuredClone(profile)
  duplicateComponent.fxExclusionProofs[0].componentReferences.push(
    structuredClone(duplicateComponent.fxExclusionProofs[0].componentReferences[3]),
  )
  duplicateComponent.validation.fxExclusionProofs = structuredClone(duplicateComponent.fxExclusionProofs)
  assert.throws(() => actionableRenderingProfile(duplicateComponent), /duplicated source identity/)
})

test('metadata proof does not allow a GLB FX diagnostic mirror to disagree with its validated profile', () => {
  const profile = addFxDiagnostic(renderingProfile({
    policy: 'chibi-rendering-policy-v14', profileVersion: 'chibi-rendering-profile-v10',
  }) as any)
  const before = tinyGlb(tinyDocument(profile))
  const missingMirror = changedJson(before, document => {
    delete document.scenes[0].extras.chibi.renderingProfileDiagnostics.excludedFxInstantiationEvents
  })
  assert.throws(() => assertMetadataOnlyGlbRewrite(before, missingMirror), /FX exclusion diagnostics do not match/)
})

test('metadata rewrite rejects a changed renderer classification or visibility decision', () => {
  const before = tinyGlb()
  assert.throws(() => rewriteGlbDiagnostics(before, renderingProfile({ visible: false, policy: 'chibi-rendering-policy-v14' })), /actionable rendering decisions changed/)
  assert.throws(() => rewriteGlbDiagnostics(before, renderingProfile({ excludedEvent: true, policy: 'chibi-rendering-policy-v14' })), /actionable rendering decisions changed/)
})

test('metadata proof rejects mesh, node, skin, animation, material, texture, image, accessor, bufferView, and buffer changes', () => {
  const before = tinyGlb()
  const mutations: Array<(document: any) => void> = [
    document => { document.meshes[0].name = 'ChangedBody' },
    document => { document.nodes[1].translation = [1, 0, 0] },
    document => { document.skins[0].joints = [1] },
    document => { document.animations[0].name = 'ChangedIdle' },
    document => { document.materials[0].alphaMode = 'BLEND' },
    document => { document.textures[0].source = 1 },
    document => { document.images[0].mimeType = 'image/jpeg' },
    document => { document.accessors[0].count = 2 },
    document => { document.bufferViews[0].byteLength = 8 },
    document => { document.buffers[0].byteLength = 12 },
  ]
  for (const mutate of mutations) assert.throws(() => assertMetadataOnlyGlbRewrite(before, changedJson(before, mutate)), /non-allowlisted GLB JSON/)
  const originalBinaryOffset = 20 + before.readUInt32LE(12)
  const changedBinary = Buffer.from(before)
  changedBinary[originalBinaryOffset + 8] ^= 1
  assert.throws(() => assertMetadataOnlyGlbRewrite(before, changedBinary), /GLB BIN bytes/)
})

test('unknown or unresolved profile schema cannot produce a reusable core identity', () => {
  const invalid = renderingProfile() as any
  invalid.validation.unresolved.push('unknown renderer may be core content')
  assert.throws(() => actionableRenderingProfile(invalid), /incomplete or unresolved/)
  const unsupported = renderingProfile() as any
  unsupported.schemaVersion = 99
  assert.throws(() => renderingProfileFingerprintInput(unsupported), /incomplete or unresolved/)
})

function renderingProfileFingerprintInput(profile: unknown) {
  return buildCoreFingerprint({
    sourceIdentity: 'a', dependencyFingerprint, converterVersion: 'core-v1', materialVersion: 'material-v1',
    adapterVersion: 'mx-character-adapters-v9', exportOverrides: {}, profile,
    initialPose: 'Idle', clips: ['Idle', 'Walk', 'Touch'],
  })
}
