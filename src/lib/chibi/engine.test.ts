import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { artifactIsIntact, buildFingerprint, CHIBI_EXPORTER_VERSION, convertCandidate, faceRendererOverridesForSource, fbx2gltfToolNames, flipEyeMouthUForSource, flipEyeMouthVForSource, forceMaskMaterialsForSource, getChibiConversionTiming, missingSourceMainTextureExports, missingSourceTextureExports, mouthTileFromDefaultUV, profilesEqual, publishArtifact, removedMeshesForSource, retainIntermediateFbxForDiagnostics, run, selectAnimator, selectAssembly, selectMouthTextureName, stripVertexColorsForSource, validateGlb } from './engine'
import { fencedPublish, recoverExpiredLeases, renewLease, sourceGap } from './engine-db'
import {
  MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256, MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH,
  MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256, MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS, MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH, MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256, MX_C_TRANSPARENT_ST_DITHER_UNIFORMS,
  MX_C_TRANSPARENT_ST_FINGERPRINT, MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH, MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256, MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS,
  MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256, MX_C_TRANSPARENT_ST_SOURCE_REFERENCE, MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH,
  MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256, MX_UNLIT_OUTLINE_SOURCE_REFERENCE,
  MX_E_STANDARD_DEPTH_ATTRIBUTES, MX_E_STANDARD_DEPTH_PARAMETER_SHA256, MX_E_STANDARD_DEPTH_PROGRAM_HASH,
  MX_E_STANDARD_DEPTH_RECORD_SHA256, MX_E_STANDARD_DEPTH_UNIFORMS, MX_E_STANDARD_FINGERPRINT,
  MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
  MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS,
  MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256, MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH,
  MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256, MX_E_STANDARD_FORWARD_STATIC_UNIFORMS, MX_E_STANDARD_FORWARD_ATTRIBUTES,
  MX_E_STANDARD_META_ATTRIBUTES, MX_E_STANDARD_META_PARAMETER_SHA256, MX_E_STANDARD_META_PROGRAM_HASH,
  MX_E_STANDARD_META_RECORD_SHA256, MX_E_STANDARD_META_UNIFORMS, MX_E_STANDARD_PROGRAM_BLOB_SHA256,
  MX_E_STANDARD_REQUIRED_PROPERTIES, MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES, MX_E_STANDARD_SHADOW_ATTRIBUTES,
  MX_E_STANDARD_SHADOW_PARAMETER_SHA256, MX_E_STANDARD_SHADOW_PROGRAM_HASH, MX_E_STANDARD_SHADOW_RECORD_SHA256,
  MX_E_STANDARD_SHADOW_UNIFORMS, MX_E_STANDARD_SHADER_KEYWORDS, MX_E_STANDARD_SHADER_NAME,
  MX_E_STANDARD_SOURCE_REFERENCE, MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES,
  DSFX_MATCAP_FINGERPRINT, DSFX_MATCAP_INERT_COLOR_PROPERTIES, DSFX_MATCAP_INERT_FLOAT_PROPERTIES, DSFX_MATCAP_FORWARD_ATTRIBUTES,
  DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256, DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH, DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256, DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH, DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS, DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
  DSFX_MATCAP_MAIN_COLOR, DSFX_MATCAP_MAIN_TEXTURE_REFERENCE,
  DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE, DSFX_MATCAP_MATERIAL_REFERENCE, DSFX_MATCAP_PROGRAM_BLOB_SHA256,
  DSFX_MATCAP_REQUIRED_PROPERTIES, DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES, DSFX_MATCAP_SHADOW_ATTRIBUTES,
  DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256, DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH, DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256, DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH, DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS, DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
  DSFX_MATCAP_SHADER_KEYWORDS, DSFX_MATCAP_SHADER_NAME, DSFX_MATCAP_SOURCE_REFERENCE,
  CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES, DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS,
  DSFX_ALPHA_BLEND_ADD_FINGERPRINT, DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS, DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256,
  DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS, DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS, DSFX_ALPHA_BLEND_ADD_SHADER_NAME,
  DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE,
  DSFX_ADDITIVE_0_FINGERPRINT, DSFX_ADDITIVE_0_GLES3_PROGRAMS, DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256,
  DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS, DSFX_ADDITIVE_0_SHADER_KEYWORDS, DSFX_ADDITIVE_0_SHADER_NAME,
  DSFX_ADDITIVE_0_SOURCE_REFERENCE,
  CHIBI_RENDERING_POLICY_VERSION, CHIBI_RENDERING_PROFILE_VERSION, CHIBI_SHADER_ADAPTER_VERSION,
} from './rendering-profile'
import { emptyChibiProfile } from './types'
import { CHIBI_SKIN_SKELETON_METADATA_VERSION } from './core-cache'

function glbFromDocument(document: unknown) {
  const source = Buffer.from(JSON.stringify(document))
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)])
  const binary = Buffer.alloc(12)
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length)
  output.write('glTF'); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20)
  const offset = 20 + json.length; output.writeUInt32LE(binary.length, offset); output.writeUInt32LE(0x004e4942, offset + 4); binary.copy(output, offset + 8)
  return output
}

function glbFromDocumentAndBinary(document: unknown, binary: Buffer) {
  const source = Buffer.from(JSON.stringify(document))
  const json = Buffer.concat([source, Buffer.alloc((4 - source.length % 4) % 4, 0x20)])
  const output = Buffer.alloc(12 + 8 + json.length + 8 + binary.length)
  output.write('glTF'); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8)
  output.writeUInt32LE(json.length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20)
  const offset = 20 + json.length; output.writeUInt32LE(binary.length, offset); output.writeUInt32LE(0x004e4942, offset + 4); binary.copy(output, offset + 8)
  return output
}

function tinyGlb() {
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { mesh: 0, skin: 0 }], scenes: [{ nodes: [1] }], scene: 0,
  })
}

function tinyPolicyProfileGlb(tamper: 'none' | 'policy' | 'exclusions' | 'diagnostics' | 'core-omission' | 'core-provenance' | 'equipment-evidence' = 'none', includeDerivedMouth = false, includeEquipmentEvidence = false) {
  const coreRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: 'core-renderer' }
  const coreMeshReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-mesh', objectId: 'core-mesh' }
  const coreMaterialReference = { bundleSha256: 'c'.repeat(64), serializedFile: 'CAB-material', objectId: 'core-material' }
  const excludedRendererReference = { bundleSha256: 'd'.repeat(64), serializedFile: 'CAB-prefab', objectId: 'presentation-renderer' }
  const excludedEvent = {
    clip: 'Fixture_Idle', time: 0.25, action: 'enable', sourceRendererReference: excludedRendererReference, order: 0,
    reasonCode: 'PRESENTATION_CHILD_RENDERER_EVENT', evidence: ['event target exactly matches excluded renderer d'.repeat(1)],
  }
  const excludedRenderer = {
    sourceReference: excludedRendererReference, name: 'Fixture_PresentationGlow', hierarchyPath: 'FX/PresentationGlow',
    reasonCode: 'PRESENTATION_SHADER_OR_MATERIAL', evidence: ['exact source shader is effect-scoped presentation content'],
    sourceMesh: null, materials: [{ name: 'Fixture_Glow', sourceReference: null, shaderName: 'FX/PresentationGlow', shaderReference: null }],
  }
  const renderState = {
    sourceQueue: 2000, layer: 'opaque', alphaMode: 'OPAQUE', depthWrite: true, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
    blend: { source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0 },
  }
  const coreRenderState = includeDerivedMouth ? { ...renderState, alphaMode: 'BLEND' } : renderState
  const coreKey = `${coreRendererReference.bundleSha256}:${coreRendererReference.serializedFile.toLowerCase()}:${coreRendererReference.objectId}`
  const profile: any = {
    schemaVersion: 2, profileVersion: CHIBI_RENDERING_PROFILE_VERSION, policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, sourceIdentity: 'fixture', dependencyFingerprint: 'fixture-fingerprint',
    sourcePrefab: { path: 'Assets/Fixture.prefab', reference: coreRendererReference }, assembly: null,
    renderers: [{
      sourceReference: coreRendererReference, name: 'Fixture_Body', hierarchyPath: 'Body', rendererType: 'SkinnedMeshRenderer',
      defaultVisible: true, sourceMesh: { file: 'CAB-mesh', pathId: 'core-mesh', sourceReference: coreMeshReference }, glbNodeIndex: 1,
      materialSlots: [{
        slot: 0, sourceMaterialReference: coreMaterialReference, sourceMaterialName: 'Fixture_Body', sourceShaderReference: null,
        sourceShaderName: null, sourceShaderParsedName: null, shaderProgramBlobSha256: null,
        adapterId: includeDerivedMouth ? 'mx-character-eyemouth' : 'gltf-native',
        materialProperties: { floats: {}, ints: {}, colors: {}, keywords: [], textures: [] },
        adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: null }, renderState: coreRenderState,
        glb: { nodeIndex: 1, nodeName: 'Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
      }],
    }],
    childRendererEvents: [], excludedRenderers: [excludedRenderer], excludedChildRendererEvents: [excludedEvent],
    fxExclusionProofs: [], excludedFxInstantiationEvents: [],
    mouth: includeDerivedMouth ? {
      sourceRendererReference: coreRendererReference, materialSlot: 0,
      glbPrimitiveIndices: { eyes: [0], mouth: [1] }, glbMaterialIndex: 1,
    } : null,
    drawSequence: [coreKey], validation: {
      valid: true, unresolved: [], excludedRenderers: [excludedRenderer], excludedChildRendererEvents: [excludedEvent],
      fxExclusionProofs: [], excludedFxInstantiationEvents: [],
    },
  }
  if (includeEquipmentEvidence) {
    const equipmentEvidence = {
      sourceReference: coreRendererReference,
      classification: 'exact-equipment-renderer',
      reasonCode: 'EXACT_EQUIPMENT_RENDERER_REFERENCE',
      reason: 'The source assembly explicitly identifies this exact equipment renderer.',
      name: 'Fixture_Body', hierarchyPath: 'Body',
      sourceMeshReference: coreMeshReference,
      sourceMaterialReferences: [coreMaterialReference], sourceShaderReferences: [],
      rootBone: null, transformChain: [], boneReferences: [], matchedAncestorPointers: [], bodyRendererReferences: [],
      evidence: [`exact equipment renderer reference ${coreKey}`],
    }
    profile.assembly = {
      root: 'Fixture', rendererOrder: ['Fixture_Body', 'Fixture_PresentationGlow'],
      renderers: [
        {
          sourceReference: coreRendererReference, name: 'Fixture_Body', hierarchyPath: 'Body', rendererType: 'SkinnedMeshRenderer',
          mesh: { file: 'CAB-mesh', pathId: 'core-mesh' }, meshSourceReference: coreMeshReference,
          materialSlots: [{ slot: 0, sourceMaterialReference: coreMaterialReference }],
        },
        {
          sourceReference: excludedRendererReference, name: excludedRenderer.name, hierarchyPath: excludedRenderer.hierarchyPath,
          rendererType: 'MeshRenderer', mesh: null, materialSlots: [],
        },
      ],
      attachments: { equipmentRendererReferences: [coreRendererReference] },
    }
    profile.equipmentBindingEvidence = [equipmentEvidence]
    profile.coreRendererBlockers = []
    profile.validation = {
      ...profile.validation, equipmentBindingEvidence: [structuredClone(equipmentEvidence)], coreRendererBlockers: [],
    }
    if (tamper === 'equipment-evidence') profile.validation.equipmentBindingEvidence[0].name = 'Tampered_Body'
  }
  const intentionallyExcluded = {
    sourceReference: excludedRendererReference, name: excludedRenderer.name, hierarchyPath: excludedRenderer.hierarchyPath,
    nodeIndex: null, nodeName: null, status: 'source-node-omitted', reasonCode: excludedRenderer.reasonCode, evidence: excludedRenderer.evidence,
  }
  const profileDiagnostics: any = {
    schemaVersion: 1, policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    skinSkeletonMetadataVersion: CHIBI_SKIN_SKELETON_METADATA_VERSION, skinSkeletonRepairs: [],
    intentionallyExcludedRenderers: [intentionallyExcluded], excludedChildRendererEvents: [excludedEvent],
    fxExclusionProofs: [], excludedFxInstantiationEvents: [], unprofiledGeometry: [],
  }
  if (tamper === 'policy') profile.policyVersion = 'chibi-rendering-policy-tampered'
  if (tamper === 'exclusions') profile.validation.excludedRenderers = []
  if (tamper === 'diagnostics') profileDiagnostics.policyVersion = 'chibi-rendering-policy-tampered'
  if (tamper === 'core-omission') profile.renderers[0].glbNodeIndex = null
  const nodeSourceReference = tamper === 'core-provenance'
    ? { ...coreRendererReference, objectId: 'tampered-core-renderer' } : coreRendererReference
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' }],
    meshes: [{ primitives: [
      { attributes: { POSITION: 0 }, material: 0 },
      ...(includeDerivedMouth ? [{ attributes: { POSITION: 0 }, indices: 0, material: 1 }] : []),
    ] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'Body', mesh: 0, skin: 0, extras: { chibi: { sourceRenderer: {
      sourceReference: nodeSourceReference, sourceMeshReference: coreMeshReference, defaultVisible: true,
    } } } }],
    scenes: [{ nodes: [1], extras: { chibi: { renderingProfile: profile, renderingProfileDiagnostics: profileDiagnostics } } }], scene: 0,
    materials: [{ name: 'Fixture_Body', alphaMode: coreRenderState.alphaMode, doubleSided: false, extras: { chibi: {
      sourceMaterialReference: coreMaterialReference, renderingProfileSlot: `${coreKey}#0`, renderOrder: 0, ...coreRenderState,
      alphaMode: coreRenderState.alphaMode, drawLayer: coreRenderState.layer,
    } } },
      ...(includeDerivedMouth ? [{
        name: 'Fixture_EyeMouth#MouthAtlas', alphaMode: coreRenderState.alphaMode, doubleSided: false,
        pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
        extras: { mouthAtlas: { columns: 8, rows: 8, defaultTile: 704 }, mouthTiles: { Fixture_Idle: [[0, 704]] }, chibi: {
          mouthProfileBinding: { sourceRendererReference: coreRendererReference, materialSlot: 0 },
        } },
      }] : []),
    ],
    ...(includeDerivedMouth ? { textures: [{ source: 0 }] } : {}),
  })
}

function tinySourceAuthoredCoreGeometryWarningGlb(tamper: 'none' | 'mirror' | 'foreign-renderer' | 'missing-slot' | 'wrong-datum' | 'wrong-assembly-material-pointer' | 'hidden-renderer' | 'unresolved-action' | 'unresolved-action-forged-warning' | 'core-blocker' = 'none') {
  const document: any = documentFromGlb(tinyPolicyProfileGlb())
  const profile = document.scenes[0].extras.chibi.renderingProfile
  const diagnostics = document.scenes[0].extras.chibi.renderingProfileDiagnostics
  const prefabPath = 'Assets/_MX/AddressableAsset/Character/CH0081/Cafe/Cafe_CH0081.prefab'
  const sourceReference = (bundleSha256: string, serializedFile: string, objectId: string) => ({ bundleSha256, serializedFile, objectId })
  const prefabReference = sourceReference('dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d', 'CAB-241dbfc78955d74e6aa6ee05bb096ecf', '-8585771901269975806')
  const rendererReference = sourceReference('dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d', 'CAB-241dbfc78955d74e6aa6ee05bb096ecf', '-6903816935868408574')
  const meshReference = sourceReference('12145f231b3c8b093c728296b771f4ae89a1fdd9e98f3afc915668fcd77591c5', 'CAB-74b254d25a0b77afb604cb26c86ff7a2', '8052939068824350260')
  const materialBundle = '5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236'
  const materialFile = 'CAB-531b6dac764c7c3cb68e06bcb5e8d331'
  const sourceMaterials = [
    ['CH0081_Body', '4325420936880560113'],
    ['CH0081_Face', '2295227601622239349'],
    ['CH0081_Eyebrow', '7037462322176008259'],
    ['CH0081_EyeMouth', '-6701897569863049292'],
    ['CH0081_Hair', '-1296136910868312838'],
  ].map(([name, objectId]) => ({ name, reference: sourceReference(materialBundle, materialFile, objectId) }))
  const sourceKey = `${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`
  const excludedRendererReference = profile.excludedRenderers[0].sourceReference
  const renderState = {
    sourceQueue: 2000, layer: 'opaque', alphaMode: 'OPAQUE', depthWrite: true, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
    blend: { source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0 },
  }
  const slots = sourceMaterials.map(({ name, reference }, slot) => ({
    slot, sourceMaterialReference: reference, sourceMaterialName: name, sourceShaderReference: null,
    sourceShaderName: null, sourceShaderParsedName: null, shaderProgramBlobSha256: null,
    adapterId: slot === 3 ? 'mx-character-eyemouth' : 'gltf-native', materialProperties: { floats: {}, ints: {}, colors: {}, keywords: [], textures: [] },
    adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: null }, renderState,
    glb: { nodeIndex: 1, nodeName: 'CH0081_Body', meshIndex: 0, primitiveIndices: [slot], materialIndex: slot, materialIndices: [slot] },
  }))
  // The eye/mouth source slot is represented by two final primitives here:
  // source-slot validation must preserve both without requiring a 1:1 split.
  slots[3].glb.primitiveIndices.push(5)
  slots[3].glb.materialIndices.push(3)
  const renderer = {
    sourceReference: rendererReference, name: 'CH0081_Body', hierarchyPath: 'Cafe_CH0081/CH0081_Body',
    rendererType: 'SkinnedMeshRenderer', defaultVisible: true,
    sourceMesh: { file: meshReference.serializedFile, pathId: meshReference.objectId, sourceReference: meshReference },
    glbNodeIndex: 1, materialSlots: slots,
  }
  const warning = {
    sourcePrefabPath: prefabPath, sourcePrefabReference: prefabReference, sourceReference: rendererReference,
    name: renderer.name, hierarchyPath: renderer.hierarchyPath,
    reasonCode: 'SOURCE_AUTHORED_MULTIMATERIAL_BODY_SEPARATION',
    message: 'Source-pinned evidence identifies the retained five-submesh body geometry across five material slots on this core renderer. The legacy primitive-0 cap/upper-body component separation from torso does not demonstrate a missing neck. This warning does not certify material, skinning, action, weapon/equipment, or browser checks.',
    sourceMeshReference: meshReference,
    geometryEvidence: {
      legacyMeasurement: { primitiveIndex: 0, componentLabels: ['Head', 'torso'], sourceGap: 0.1780399764, sourceUnit: 'Unity mesh units', bridgingTriangles: 0 },
      legacyLabelSemantics: 'The legacy Head label denotes the cap/upper-body-material component within primitive 0, not the complete visual head.',
      retainedMaterialSlots: sourceMaterials.map(({ name, reference }, slot) => ({ slot, sourceMaterialName: name, sourceMaterialReference: reference })),
    },
    evidence: [
      `exact source prefab reference ${prefabReference.bundleSha256}:${prefabReference.serializedFile.toLowerCase()}:${prefabReference.objectId}`,
      `exact core renderer reference ${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`,
      `exact source mesh reference ${meshReference.bundleSha256}:${meshReference.serializedFile.toLowerCase()}:${meshReference.objectId}`,
      'The exact core renderer has five ordered source material slots: body, face, eyebrow, eye/mouth, and hair.',
      'The legacy primitive-0 Head label denotes the cap/upper-body-material component, not the complete visual head; its separation from torso alone is not evidence of a missing neck.',
      'Material, skinning, action, weapon/equipment, and browser checks remain independent.',
    ],
  }
  profile.sourceIdentity = 'ch0081'
  profile.sourcePrefab = { path: prefabPath, reference: prefabReference }
  profile.assembly = {
    root: 'Cafe_CH0081', prefabPath, prefabReference, rendererOrder: [renderer.name, profile.excludedRenderers[0].name],
    renderers: [
      {
        sourceReference: rendererReference, name: renderer.name, hierarchyPath: renderer.hierarchyPath,
        rendererType: renderer.rendererType, enabled: true, gameObjectActive: true, visible: true,
        mesh: { file: meshReference.serializedFile, pathId: meshReference.objectId }, meshSourceReference: meshReference,
        materialSlots: sourceMaterials.map(({ reference }, slot) => ({
          slot, material: { file: reference.serializedFile, pathId: reference.objectId }, sourceMaterialReference: reference,
        })),
      },
      {
        sourceReference: excludedRendererReference, name: profile.excludedRenderers[0].name,
        hierarchyPath: profile.excludedRenderers[0].hierarchyPath, rendererType: 'MeshRenderer', enabled: true,
        mesh: null, materialSlots: [],
      },
    ],
    attachments: {},
  }
  profile.renderers = [renderer]
  profile.drawSequence = [sourceKey]
  profile.coreRendererBlockers = []
  profile.coreGeometryBlockers = []
  profile.coreGeometryWarnings = [structuredClone(warning)]
  profile.equipmentBindingEvidence = []
  profile.warnings = []
  profile.validation = {
    ...profile.validation, valid: true, unresolved: [], coreRendererBlockers: [], coreGeometryBlockers: [],
    coreGeometryWarnings: [structuredClone(warning)], equipmentBindingEvidence: [], warnings: [],
  }
  profile.validation.excludedRenderers = structuredClone(profile.excludedRenderers)
  profile.validation.excludedChildRendererEvents = structuredClone(profile.excludedChildRendererEvents)
  if (tamper === 'mirror') profile.coreGeometryWarnings[0].message = 'Not the validation warning.'
  if (tamper === 'foreign-renderer' || tamper === 'unresolved-action-forged-warning') {
    warning.sourceReference = { ...rendererReference, objectId: 'foreign-renderer' }
    profile.coreGeometryWarnings = [structuredClone(warning)]
    profile.validation.coreGeometryWarnings = [structuredClone(warning)]
  }
  if (tamper === 'missing-slot') {
    warning.geometryEvidence.retainedMaterialSlots.pop()
    profile.coreGeometryWarnings = [structuredClone(warning)]
    profile.validation.coreGeometryWarnings = [structuredClone(warning)]
  }
  if (tamper === 'wrong-datum') {
    warning.geometryEvidence.legacyMeasurement.sourceGap += 0.01
    profile.coreGeometryWarnings = [structuredClone(warning)]
    profile.validation.coreGeometryWarnings = [structuredClone(warning)]
  }
  if (tamper === 'wrong-assembly-material-pointer') profile.assembly.renderers[0].materialSlots[3].material.pathId = 'different-material'
  if (tamper === 'hidden-renderer') {
    renderer.defaultVisible = false
    profile.assembly.renderers[0].enabled = false
    document.nodes[1].extras.chibi.sourceRenderer.defaultVisible = false
  }
  if (tamper === 'unresolved-action' || tamper === 'unresolved-action-forged-warning') {
    profile.validation.valid = false
    profile.validation.unresolved = ['Required action pickup has no exact exported clip.']
  }
  if (tamper === 'core-blocker') {
    profile.coreGeometryBlockers = [{}]
    profile.validation.coreGeometryBlockers = [{}]
  }
  const nodeMaterials = sourceMaterials.map(({ name, reference }, slot) => ({
    name, alphaMode: 'OPAQUE', doubleSided: false,
    extras: { chibi: {
      sourceMaterialReference: reference, renderingProfileSlot: `${sourceKey}#${slot}`, renderOrder: 0,
      alphaMode: 'OPAQUE', depthWrite: true, depthTest: true, depthFunction: 'less-equal', cullMode: 'back',
      doubleSided: false, drawLayer: 'opaque', polygonOffsetFactor: 0, polygonOffsetUnits: 0, blend: renderState.blend,
    } },
  }))
  document.meshes[0].primitives = [0, 1, 2, 3, 4, 3].map(material => ({ attributes: { POSITION: 0 }, material }))
  document.nodes[0] = { name: 'Cafe_CH0081', children: [1] }
  document.nodes[1] = { name: 'CH0081_Body', mesh: 0, skin: 0, extras: { chibi: { sourceRenderer: {
    sourceReference: tamper === 'foreign-renderer' ? rendererReference : rendererReference,
    sourceMeshReference: meshReference, defaultVisible: tamper === 'hidden-renderer' ? false : true,
  } } } }
  document.scenes[0].nodes = [0]
  document.materials = nodeMaterials
  document.scenes[0].extras.chibi.renderingProfileDiagnostics = diagnostics
  return glbFromDocument(document)
}

function tinyArrangementWarningGlb(tamper: 'none' | 'warning-reference' | 'mesh-reference' | 'material-reference' | 'shader-reference' | 'warning-copy' | 'glb-node-reference' | 'presentation-warning' | 'generic-warning' = 'none') {
  const document: any = documentFromGlb(tinyPolicyProfileGlb())
  const profile = document.scenes[0].extras.chibi.renderingProfile
  const renderer = profile.renderers[0]
  const coreReference = renderer.sourceReference
  const meshReference = renderer.sourceMesh.sourceReference
  const materialReference = renderer.materialSlots[0].sourceMaterialReference
  const shaderReference = { bundleSha256: 'e'.repeat(64), serializedFile: 'CAB-shader', objectId: 'core-shader' }
  const sourceKey = (reference: any) => `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
  const blocker = {
    sourceReference: structuredClone(coreReference), name: 'Fixture_Weapon', hierarchyPath: 'Fixture_Weapon',
    reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
    evidence: [
      `exact source renderer reference ${sourceKey(coreReference)}`,
      `exact source mesh reference ${sourceKey(meshReference)}`,
      `exact source material reference ${sourceKey(materialReference)}`,
      `exact source shader reference ${sourceKey(shaderReference)}`,
      'renderer name has authored equipment term(s): weapon',
      'selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer',
    ],
    sourceMeshReference: structuredClone(meshReference),
    sourceMaterialReferences: [structuredClone(materialReference)], sourceShaderReferences: [shaderReference],
  }
  const warning: any = {
    reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
    message: 'Source rendering profile is unresolved for Fixture_Weapon.', blocker,
  }
  renderer.name = blocker.name
  renderer.hierarchyPath = blocker.hierarchyPath
  renderer.materialSlots[0].glb.nodeName = blocker.name
  renderer.materialSlots[0].sourceMaterialName = blocker.name
  renderer.materialSlots[0].sourceShaderReference = shaderReference
  renderer.materialSlots[0].sourceShaderName = 'Fixture/WeaponShader'
  renderer.materialSlots[0].sourceShaderParsedName = 'Fixture/WeaponShader'
  document.materials[0].name = blocker.name
  document.materials[0].extras.chibi.sourceShaderReference = shaderReference
  document.nodes[1].name = blocker.name
  const excluded = profile.excludedRenderers[0]
  profile.assembly = {
    root: 'Fixture', rendererOrder: [blocker.name, excluded.name],
    prefabReference: {
      file: coreReference.serializedFile, pathId: 'fixture-prefab', name: 'Fixture',
      sourceReference: { ...coreReference, objectId: 'fixture-prefab' },
    },
    renderers: [
      {
        sourceReference: structuredClone(coreReference), name: blocker.name, hierarchyPath: blocker.hierarchyPath,
        rendererType: renderer.rendererType, mesh: { file: 'CAB-mesh', pathId: 'core-mesh' },
        meshSourceReference: structuredClone(meshReference),
        materialSlots: [{ slot: 0, sourceMaterialReference: structuredClone(materialReference) }],
      },
      {
        sourceReference: structuredClone(excluded.sourceReference), name: excluded.name, hierarchyPath: excluded.hierarchyPath,
        rendererType: 'MeshRenderer', mesh: null, materialSlots: [],
      },
    ],
    attachments: {},
  }
  profile.coreRendererBlockers = []
  profile.equipmentBindingEvidence = []
  profile.warnings = [warning]
  profile.validation.coreRendererBlockers = []
  profile.validation.equipmentBindingEvidence = []
  profile.validation.warnings = [structuredClone(warning)]

  if (tamper === 'warning-reference') {
    warning.blocker.sourceReference.objectId = 'different-renderer'
    profile.validation.warnings[0].blocker.sourceReference.objectId = 'different-renderer'
  }
  if (tamper === 'mesh-reference') {
    warning.blocker.sourceMeshReference.objectId = 'different-mesh'
    profile.validation.warnings[0].blocker.sourceMeshReference.objectId = 'different-mesh'
  }
  if (tamper === 'material-reference') {
    warning.blocker.sourceMaterialReferences[0].objectId = 'different-material'
    profile.validation.warnings[0].blocker.sourceMaterialReferences[0].objectId = 'different-material'
  }
  if (tamper === 'shader-reference') {
    warning.blocker.sourceShaderReferences[0].objectId = 'different-shader'
    profile.validation.warnings[0].blocker.sourceShaderReferences[0].objectId = 'different-shader'
  }
  if (tamper === 'warning-copy') profile.validation.warnings[0].message = 'Different warning.'
  if (tamper === 'glb-node-reference') {
    document.nodes[1].extras.chibi.sourceRenderer.sourceReference.objectId = 'different-renderer'
  }
  if (tamper === 'presentation-warning') {
    warning.reasonCode = 'PRESENTATION_SHADER_OR_MATERIAL'
    profile.validation.warnings[0].reasonCode = 'PRESENTATION_SHADER_OR_MATERIAL'
  }
  if (tamper === 'generic-warning') {
    warning.blocker.evidence = warning.blocker.evidence.filter((item: string) =>
      !item.startsWith('renderer name has authored equipment term(s): '))
    profile.validation.warnings[0].blocker.evidence = structuredClone(warning.blocker.evidence)
  }
  return glbFromDocument(document)
}

function tinySaoriSwimsuitArrangementWarningGlb(tamper: 'none' | 'third-warning' | 'substituted-reference' | 'duplicate-warning' | 'reordered-warning' | 'wrong-identity' | 'wrong-fingerprint' = 'none') {
  const document: any = documentFromGlb(tinyArrangementWarningGlb())
  const profile = document.scenes[0].extras.chibi.renderingProfile
  const prefabReference = {
    bundleSha256: '325bc4b3f67c1fe59260ca66cb5068d109c193dc4a662e77c8c2084f56063ffd',
    serializedFile: 'CAB-e9f5532a8838fb49b9656938014567f9', objectId: '-966698776056933583',
  }
  const shaderReference = {
    bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
    serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-301851123381183171',
  }
  const sources = [
    {
      renderer: '-1127309643643137231', mesh: '-4114086136464228496', material: '4428875022469246219',
      name: 'CH0266_WaterCannon_Outline', path: 'CH0266_WaterCannon_Outline', materialName: 'CH0266_WaterCannon', term: 'cannon',
    },
    {
      renderer: '-4763531541672078543', mesh: '-7008905148608425358', material: '-2288669407096532286',
      name: 'Saori_Original_Handgun', path: 'Saori_Original_Handgun', materialName: 'CH0266_Weapon', term: 'handgun',
    },
  ].map(source => ({
    ...source,
    rendererReference: { bundleSha256: prefabReference.bundleSha256, serializedFile: prefabReference.serializedFile, objectId: source.renderer },
    meshReference: {
      bundleSha256: 'b493920b164a41237b76ab169664d48fe555d6d643a2ce02ffcfe708a77967f1',
      serializedFile: 'CAB-fb6b24084a8dc8864efbed7e547be16d', objectId: source.mesh,
    },
    materialReference: {
      bundleSha256: '17fca11c00f7e6869df3fe4ffbd2ffa0185513ee45607a2a1e32978ac916a742',
      serializedFile: 'CAB-fbd047797f16a6e5ae0e213d5ef5d0f1', objectId: source.material,
    },
  }))
  const sourceKey = (reference: any) => `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
  const originalRenderer = profile.renderers[0]
  const originalNode = document.nodes[1]
  const originalMesh = document.meshes[0]
  const originalMaterial = document.materials[0]
  const renderers = sources.map((source: any, index: number) => {
    const renderer = structuredClone(originalRenderer)
    const nodeIndex = index + 1
    renderer.sourceReference = source.rendererReference
    renderer.name = source.name
    renderer.hierarchyPath = source.path
    renderer.sourceMesh = { file: source.meshReference.serializedFile, pathId: source.meshReference.objectId, sourceReference: source.meshReference }
    renderer.glbNodeIndex = nodeIndex
    renderer.materialSlots[0].sourceMaterialReference = source.materialReference
    renderer.materialSlots[0].sourceMaterialName = source.materialName
    renderer.materialSlots[0].sourceShaderReference = shaderReference
    renderer.materialSlots[0].sourceShaderName = 'MX/C-Weapon'
    renderer.materialSlots[0].sourceShaderParsedName = 'MX/C-Weapon'
    renderer.materialSlots[0].glb = {
      nodeIndex, nodeName: source.name, meshIndex: index, primitiveIndices: [0],
      materialIndex: index, materialIndices: [index],
    }
    return renderer
  })
  const warnings = sources.map((source: any) => {
    const rendererKey = sourceKey(source.rendererReference)
    const meshKey = sourceKey(source.meshReference)
    const materialKey = sourceKey(source.materialReference)
    const shaderKey = sourceKey(shaderReference)
    return {
      reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
      message: `Source rendering profile is unresolved for ${source.path}.`,
      blocker: {
        sourceReference: structuredClone(source.rendererReference), name: source.name, hierarchyPath: source.path,
        reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
        evidence: [
          `exact source renderer reference ${rendererKey}`,
          `exact source mesh reference ${meshKey}`,
          `exact source material reference ${materialKey}`,
          `exact source shader reference ${shaderKey}`,
          `renderer name has authored equipment term(s): ${source.term}`,
          'selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer',
        ],
        sourceMeshReference: structuredClone(source.meshReference),
        sourceMaterialReferences: [structuredClone(source.materialReference)],
        sourceShaderReferences: [structuredClone(shaderReference)],
      },
    }
  })

  profile.sourceIdentity = 'ch0266'
  profile.dependencyFingerprint = 'c2dda9fce74ba470a510e0cdab930844eff876ad62150254bcf3cefdfb495db9'
  profile.sourcePrefab = {
    path: 'Assets/_MX/AddressableAsset/Character/CH0266/Cafe/Cafe_CH0266.prefab', reference: prefabReference,
  }
  profile.renderers = renderers
  profile.drawSequence = sources.map((source: any) => sourceKey(source.rendererReference))
  profile.warnings = warnings
  profile.coreRendererBlockers = []
  profile.equipmentBindingEvidence = []
  profile.validation.coreRendererBlockers = []
  profile.validation.equipmentBindingEvidence = []
  profile.validation.warnings = structuredClone(warnings)
  const excluded = profile.excludedRenderers[0]
  profile.assembly = {
    root: 'Cafe_CH0266', rendererOrder: [...sources.map((source: any) => source.name), excluded.name],
    prefabReference: {
      file: prefabReference.serializedFile, pathId: prefabReference.objectId, name: 'Cafe_CH0266',
      sourceReference: prefabReference,
    },
    renderers: [
      ...sources.map((source: any) => ({
        sourceReference: source.rendererReference, name: source.name, hierarchyPath: source.path,
        rendererType: 'SkinnedMeshRenderer',
        mesh: { file: source.meshReference.serializedFile, pathId: source.meshReference.objectId },
        meshSourceReference: source.meshReference,
        materialSlots: [{ slot: 0, sourceMaterialReference: source.materialReference, sourceShaderReference: shaderReference }],
      })),
      {
        sourceReference: structuredClone(excluded.sourceReference), name: excluded.name,
        hierarchyPath: excluded.hierarchyPath, rendererType: 'MeshRenderer', mesh: null, materialSlots: [],
      },
    ],
    attachments: {},
  }
  document.scenes[0].nodes = [1, 2]
  document.nodes[1] = {
    ...structuredClone(originalNode), name: sources[0].name, mesh: 0,
    extras: { chibi: { sourceRenderer: { sourceReference: sources[0].rendererReference, sourceMeshReference: sources[0].meshReference, defaultVisible: true } } },
  }
  document.nodes[2] = {
    ...structuredClone(originalNode), name: sources[1].name, mesh: 1,
    extras: { chibi: { sourceRenderer: { sourceReference: sources[1].rendererReference, sourceMeshReference: sources[1].meshReference, defaultVisible: true } } },
  }
  document.meshes = sources.map((_source: any, index: number) => {
    const mesh = structuredClone(originalMesh)
    mesh.primitives[0].material = index
    return mesh
  })
  document.materials = sources.map((source: any, index: number) => {
    const material = structuredClone(originalMaterial)
    const key = sourceKey(source.rendererReference)
    material.name = source.materialName
    material.extras.chibi = {
      ...material.extras.chibi,
      sourceMaterialReference: source.materialReference,
      sourceShaderReference: shaderReference,
      renderingProfileSlot: `${key}#0`,
      renderOrder: index,
    }
    return material
  })

  if (tamper === 'third-warning') {
    profile.warnings.push(structuredClone(warnings[0]))
    profile.validation.warnings = structuredClone(profile.warnings)
  }
  if (tamper === 'substituted-reference') profile.warnings[1].blocker.sourceReference.objectId = 'substituted-renderer'
  if (tamper === 'duplicate-warning') profile.warnings[1] = structuredClone(profile.warnings[0])
  if (tamper === 'reordered-warning') profile.warnings.reverse()
  if (tamper === 'wrong-identity') profile.sourceIdentity = 'another-character'
  if (tamper === 'wrong-fingerprint') profile.dependencyFingerprint = 'f'.repeat(64)
  if (tamper !== 'third-warning') profile.validation.warnings = structuredClone(profile.warnings)
  return glbFromDocument(document)
}

function documentFromGlb(buffer: Buffer): any {
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).trim())
}

function tinyStructuralSharedMBonesGlb(mode: 'legacy' | 'paired' | 'missing-overlap-claim' | 'missing-corroboration-claim' | 'self-body-reference' | 'malformed-body-reference' = 'paired') {
  const document: any = documentFromGlb(tinyPolicyProfileGlb())
  const renderingProfile = document.scenes[0].extras.chibi.renderingProfile
  const body = renderingProfile.renderers[0]
  const equipmentReference = { bundleSha256: 'e'.repeat(64), serializedFile: 'CAB-prefab', objectId: 'equipment-renderer' }
  const equipmentMeshReference = { bundleSha256: 'f'.repeat(64), serializedFile: 'CAB-mesh', objectId: 'equipment-mesh' }
  const equipmentMaterialReference = { bundleSha256: '1'.repeat(64), serializedFile: 'CAB-material', objectId: 'equipment-material' }
  const bodyShaderReference = { bundleSha256: '2'.repeat(64), serializedFile: 'CAB-shader', objectId: 'body-shader' }
  const equipmentShaderReference = { bundleSha256: '3'.repeat(64), serializedFile: 'CAB-shader', objectId: 'equipment-shader' }
  const sourceReferenceKey = (reference: any) => `${reference.bundleSha256}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
  const bodyKey = sourceReferenceKey(body.sourceReference)
  const equipmentKey = sourceReferenceKey(equipmentReference)

  body.materialSlots[0].sourceShaderReference = bodyShaderReference
  body.materialSlots[0].sourceShaderName = 'FixtureShader'
  body.materialSlots[0].sourceShaderParsedName = 'FixtureShader'
  const equipment = structuredClone(body)
  equipment.sourceReference = equipmentReference
  equipment.name = 'Fixture_Shield'
  equipment.hierarchyPath = 'Shield'
  equipment.sourceMesh = { file: 'CAB-mesh', pathId: 'equipment-mesh', sourceReference: equipmentMeshReference }
  equipment.glbNodeIndex = 2
  equipment.materialSlots[0].sourceMaterialReference = equipmentMaterialReference
  equipment.materialSlots[0].sourceMaterialName = 'Fixture_Shield'
  equipment.materialSlots[0].sourceShaderReference = equipmentShaderReference
  equipment.materialSlots[0].sourceShaderName = 'FixtureShader'
  equipment.materialSlots[0].sourceShaderParsedName = 'FixtureShader'
  equipment.materialSlots[0].glb = {
    nodeIndex: 2, nodeName: 'Shield', meshIndex: 1, primitiveIndices: [0], materialIndex: 1, materialIndices: [1],
  }
  renderingProfile.renderers = [body, equipment]
  renderingProfile.drawSequence = [bodyKey, equipmentKey]

  const rootBone = { file: 'CAB-prefab', pathId: 'root', name: 'Fixture' }
  const equipmentBone = { file: 'CAB-prefab', pathId: 'equipment-root', name: 'Bip001_Weapon' }
  const equipmentTip = { file: 'CAB-prefab', pathId: 'equipment-tip', name: 'Bip001_Shield' }
  const transformChain = [rootBone, equipmentBone, equipmentTip]
  const boneReferences = [equipmentBone, equipmentTip]
  const bodyAssembly = {
    sourceReference: body.sourceReference, name: body.name, hierarchyPath: body.hierarchyPath, rendererType: body.rendererType,
    mesh: { file: 'CAB-mesh', pathId: 'core-mesh' }, meshSourceReference: body.sourceMesh.sourceReference,
    materialSlots: [{ slot: 0, sourceMaterialReference: body.materialSlots[0].sourceMaterialReference, sourceShaderReference: bodyShaderReference }],
  }
  const equipmentAssembly = {
    sourceReference: equipmentReference, name: equipment.name, hierarchyPath: equipment.hierarchyPath, rendererType: equipment.rendererType,
    mesh: { file: 'CAB-mesh', pathId: 'equipment-mesh' }, meshSourceReference: equipmentMeshReference,
    materialSlots: [{ slot: 0, sourceMaterialReference: equipmentMaterialReference, sourceShaderReference: equipmentShaderReference }],
    rootBone, transformChain, boneReferences,
  }
  const excluded = renderingProfile.excludedRenderers[0]
  renderingProfile.assembly = {
    root: 'Fixture', rendererOrder: ['Fixture_Body', 'Fixture_Shield', excluded.name],
    renderers: [bodyAssembly, equipmentAssembly, {
      sourceReference: excluded.sourceReference, name: excluded.name, hierarchyPath: excluded.hierarchyPath,
      rendererType: 'MeshRenderer', mesh: null, materialSlots: [],
    }], attachments: {},
  }

  const evidence: any = {
    sourceReference: equipmentReference, classification: 'structurally-bound-equipment', reasonCode: 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY',
    reason: 'The equipment renderer shares an exact source mesh/material identity and transform/bone ancestry with the selected body renderer.',
    name: equipment.name, hierarchyPath: equipment.hierarchyPath, sourceMeshReference: equipmentMeshReference,
    sourceMaterialReferences: [equipmentMaterialReference], sourceShaderReferences: [equipmentShaderReference],
    rootBone: structuredClone(rootBone), transformChain: structuredClone(transformChain), boneReferences: structuredClone(boneReferences),
    matchedAncestorPointers: [structuredClone(equipmentBone)], bodyRendererReferences: mode === 'self-body-reference'
      ? [equipmentReference] : mode === 'malformed-body-reference' ? [{ ...equipmentReference, objectId: '' }] : [],
    evidence: ['exact source renderer, mesh, material, and shader identities are preserved', 'transform chain and bone references share the selected body ancestry'],
  }
  if (mode === 'legacy') evidence.evidence.push('body m_Bones overlap: none; source hierarchy independently corroborates movement')
  if (mode === 'paired' || mode === 'missing-corroboration-claim') {
    evidence.evidence.push('body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement')
  }
  if (mode === 'paired' || mode === 'missing-overlap-claim') {
    evidence.evidence.push('unique non-conflicting same-prefab shared m_Bones relation')
  }
  renderingProfile.equipmentBindingEvidence = [evidence]
  renderingProfile.coreRendererBlockers = []
  renderingProfile.validation = {
    ...renderingProfile.validation, equipmentBindingEvidence: [structuredClone(evidence)], coreRendererBlockers: [],
  }

  document.meshes.push({ primitives: [{ attributes: { POSITION: 0 }, material: 1 }] })
  document.nodes.push({ name: 'Shield', mesh: 1, skin: 0, extras: { chibi: { sourceRenderer: {
    sourceReference: equipmentReference, sourceMeshReference: equipmentMeshReference, defaultVisible: true,
  } } } })
  document.scenes[0].nodes = [1, 2]
  const equipmentState = equipment.materialSlots[0].renderState
  document.materials.push({ name: 'Fixture_Shield', alphaMode: equipmentState.alphaMode, doubleSided: false, extras: { chibi: {
    sourceMaterialReference: equipmentMaterialReference, renderingProfileSlot: `${equipmentKey}#0`, renderOrder: 1, ...equipmentState,
    alphaMode: equipmentState.alphaMode, drawLayer: equipmentState.layer,
  } } })
  return glbFromDocument(document)
}

function tinyPinnedRigMountArrangementWarningGlb(sourceIdentity: 'ch0268' | 'mari_original', tamper: 'none' | 'wrong-member' | 'missing-member' | 'extra-member' | 'extra-active-renderer' = 'none') {
  const groups = {
    ch0268: {
      fingerprint: '48bf217d3b63f6e6d1ccfd4e6b9fcbc9a92ce0704d7c503701950c850690bcb9',
      prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0268/Cafe/Cafe_CH0268.prefab',
      prefab: ['ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', 'CAB-28951afa2d0662740094a0cdb63635f7', '4139133509352740713'],
      anchor: ['ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', 'CAB-28951afa2d0662740094a0cdb63635f7', '3815402648570287977'],
      members: [
        { name: 'CH0268_Weapon', path: 'Cafe_CH0268/CH0268_Weapon', renderer: '-7191168882773665943', mesh: '-8462892462062640212', material: '-95615523722023342' },
        { name: 'CH0268_Rocket_Outline', path: 'Cafe_CH0268/CH0268_Rocket_Outline', renderer: '-6506255981981018263', mesh: '8919917339668115670', material: '-575865430574389217' },
      ],
      meshBundle: '71796e3ef4171b3c5239394ca1511f3ee2c6a9d3351588548eb42fe9ff006d44', meshFile: 'CAB-a90cae2435de793c9dd66879a2dfbfd1',
      materialBundle: '0e361d6e7a75aaa8422c2ef72acdaace71e4f300a85bb353da363a5a37d30bc8', materialFile: 'CAB-81605dd560065d47ae7631dd966e46db',
    },
    mari_original: {
      fingerprint: 'c4532ac79bc6e4b80b4fa30eb8343b0ac825c4c74e74917562d106131805a71d',
      prefabPath: 'Assets/_MX/AddressableAsset/Character/Mari_Original/Cafe/Cafe_Mari_Original.prefab',
      prefab: ['d371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', 'CAB-68647aee163948facee663bf2f0fe149', '-8182624225047119105'],
      anchor: ['d371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', 'CAB-68647aee163948facee663bf2f0fe149', '-1560163874218870017'],
      members: [
        { name: 'Mari_Original_Weapon', path: 'Cafe_Mari_Original/Mari_Original_Weapon', renderer: '3069063790598322943', mesh: '623757297599773649', material: '-5451212227849618331' },
        { name: 'EX', path: 'Cafe_Mari_Original/EX', renderer: '-269010879909496065', mesh: '-3964046477843091', material: '-5451212227849618331' },
      ],
      meshBundle: '75229d629b11e47fb8e04f846bbb14d20c500341722b57506f824b5837167296', meshFile: 'CAB-50d3010d87b873509b38ee51971c0c01',
      materialBundle: '14d5c2383244f0f3876d824b86094ee16bd3569d5f0943b26b70eb9f988cbfd6', materialFile: 'CAB-8f9907cba03db2b5780c737273428334',
    },
  }[sourceIdentity]
  const document: any = documentFromGlb(tinyStructuralSharedMBonesGlb('paired'))
  const profile = document.scenes[0].extras.chibi.renderingProfile
  const prefabReference = { bundleSha256: groups.prefab[0], serializedFile: groups.prefab[1], objectId: groups.prefab[2] }
  const anchorReference = { bundleSha256: groups.anchor[0], serializedFile: groups.anchor[1], objectId: groups.anchor[2] }
  const shaderReference = { bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c', serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-301851123381183171' }
  const sourceKey = (reference: any) => `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}`
  const members = groups.members.map((member: any) => ({
    ...member,
    rendererReference: { bundleSha256: groups.prefab[0], serializedFile: groups.prefab[1], objectId: member.renderer },
    meshReference: { bundleSha256: groups.meshBundle, serializedFile: groups.meshFile, objectId: member.mesh },
    materialReference: { bundleSha256: groups.materialBundle, serializedFile: groups.materialFile, objectId: member.material },
  }))
  const groupKeys = members.map(member => sourceKey(member.rendererReference))
  const sourceEvidence = [
    `exact source candidate ${sourceIdentity} dependency fingerprint ${groups.fingerprint}`,
    `exact selected prefab ${groups.prefabPath} at ${sourceKey(prefabReference)}`,
    `exact same-prefab rig anchor Bip001_Weapon at ${sourceKey(anchorReference)}`,
    `active renderers on the exact anchor are exactly ${groupKeys.join(' and ')}`,
    'source assembly has no authored main/sub slot, equipment renderer reference/group, or ambiguity metadata; no slot was inferred',
  ]
  const body = profile.renderers[0]
  const bodyAssembly = profile.assembly.renderers[0]
  const rootName = groups.members[0].path.split('/')[0]
  body.hierarchyPath = `${rootName}/Fixture_Body`
  body.materialSlots[0].glb.nodeName = 'Fixture_Body'
  bodyAssembly.hierarchyPath = body.hierarchyPath
  document.nodes[1].name = 'Fixture_Body'
  const equipmentTemplate = profile.renderers[1]
  const equipmentAssemblyTemplate = profile.assembly.renderers[1]
  const equipmentEvidenceTemplate = profile.equipmentBindingEvidence[0]
  const groupRenderers = members.map((member, index) => {
    const renderer = structuredClone(equipmentTemplate)
    const nodeIndex = index + 2, meshIndex = index + 1, materialIndex = index + 1
    const anchorPointer = { file: prefabReference.serializedFile, pathId: anchorReference.objectId, name: 'Bip001_Weapon' }
    const rendererPointer = { file: prefabReference.serializedFile, pathId: member.rendererReference.objectId, name: member.name }
    const transformChain = [{ file: prefabReference.serializedFile, pathId: 'fixture-root', name: rootName }, rendererPointer]
    const boneReferences = [anchorPointer, rendererPointer]
    const key = sourceKey(member.rendererReference)
    Object.assign(renderer, {
      sourceReference: member.rendererReference, name: member.name, hierarchyPath: member.path,
      sourceMesh: { file: member.meshReference.serializedFile, pathId: member.meshReference.objectId, sourceReference: member.meshReference },
      glbNodeIndex: nodeIndex, rootBone: structuredClone(anchorPointer), transformChain: structuredClone(transformChain), boneReferences: structuredClone(boneReferences),
    })
    Object.assign(renderer.materialSlots[0], {
      sourceMaterialReference: member.materialReference, sourceMaterialName: member.name,
      sourceShaderReference: shaderReference, sourceShaderName: 'MX/C-Weapon', sourceShaderParsedName: 'MX/C-Weapon',
      glb: { nodeIndex, nodeName: member.name, meshIndex, primitiveIndices: [0], materialIndex, materialIndices: [materialIndex] },
    })
    const assembly = structuredClone(equipmentAssemblyTemplate)
    Object.assign(assembly, {
      sourceReference: member.rendererReference, name: member.name, hierarchyPath: member.path,
      mesh: { file: member.meshReference.serializedFile, pathId: member.meshReference.objectId }, meshSourceReference: member.meshReference,
      rootBone: structuredClone(anchorPointer), transformChain: structuredClone(transformChain), boneReferences: structuredClone(boneReferences),
      materialSlots: [{ slot: 0, sourceMaterialReference: member.materialReference, sourceShaderReference: shaderReference }],
    })
    const evidence = structuredClone(equipmentEvidenceTemplate)
    Object.assign(evidence, {
      sourceReference: member.rendererReference, name: member.name, hierarchyPath: member.path,
      sourceMeshReference: member.meshReference, sourceMaterialReferences: [member.materialReference], sourceShaderReferences: [shaderReference],
      rootBone: structuredClone(anchorPointer), transformChain: structuredClone(transformChain), boneReferences: structuredClone(boneReferences),
      matchedAncestorPointers: [structuredClone(anchorPointer)], bodyRendererReferences: [],
      reason: `Exact source-pinned same-prefab rig-mount group ${sourceIdentity}; attachment placement remains an arrangement warning.`,
      evidence: ['body m_Bones overlap: none; source hierarchy independently corroborates movement'],
    })
    document.nodes[nodeIndex] = { name: member.name, mesh: meshIndex, skin: 0, extras: { chibi: { sourceRenderer: {
      sourceReference: member.rendererReference, sourceMeshReference: member.meshReference, defaultVisible: true,
    } } } }
    const mesh = structuredClone(document.meshes[1]); mesh.primitives[0].material = materialIndex
    if (index === 0) document.meshes[meshIndex] = mesh; else document.meshes.push(mesh)
    const material = structuredClone(document.materials[1])
    material.name = member.name
    material.extras.chibi = { ...material.extras.chibi, sourceMaterialReference: member.materialReference,
      sourceShaderReference: shaderReference, renderingProfileSlot: `${key}#0` }
    if (index === 0) document.materials[materialIndex] = material; else document.materials.push(material)
    return { renderer, assembly, evidence }
  })
  profile.sourceIdentity = sourceIdentity
  profile.dependencyFingerprint = groups.fingerprint
  profile.sourcePrefab = { path: groups.prefabPath, reference: prefabReference }
  profile.assembly.root = rootName
  profile.assembly.prefabReference = prefabReference
  profile.assembly.rendererOrder = ['Fixture_Body', ...members.map(member => member.name), profile.excludedRenderers[0].name]
  profile.assembly.renderers = [bodyAssembly, ...groupRenderers.map(member => member.assembly), profile.assembly.renderers[2]]
  profile.assembly.attachments = {}
  profile.renderers = [body, ...groupRenderers.map(member => member.renderer)]
  profile.equipmentBindingEvidence = groupRenderers.map(member => member.evidence)
    .sort((left: any, right: any) => sourceKey(left.sourceReference).localeCompare(sourceKey(right.sourceReference)))
  profile.coreRendererBlockers = []
  profile.drawSequence = [...profile.renderers].sort((left: any, right: any) => left.name.localeCompare(right.name))
    .map((renderer: any) => sourceKey(renderer.sourceReference))
  const warningMember = members[1]
  const warning: any = {
    reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
    message: `Source-pinned same-prefab rig-mount group ${sourceIdentity} has no authored main/sub slot; all group renderers remain included and their arrangement may need review.`,
    blocker: {
      sourceReference: warningMember.rendererReference, name: warningMember.name, hierarchyPath: warningMember.path,
      reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
      evidence: [
        ...sourceEvidence,
        `exact source renderer ${warningMember.name} at ${groupKeys[1]}`,
        `exact source mesh ${sourceKey(warningMember.meshReference)}`,
        `exact source material ${sourceKey(warningMember.materialReference)}`,
        `exact source shader ${sourceKey(shaderReference)} (MX/C-Weapon)`,
        'body m_Bones overlap: none; source hierarchy independently corroborates movement',
        'source-pinned group is core equipment, but no authored main/sub slot specifies its arrangement',
      ],
      sourceMeshReference: warningMember.meshReference,
      sourceMaterialReferences: [warningMember.materialReference], sourceShaderReferences: [shaderReference],
    },
    sourceGroupReferences: members.map(member => member.rendererReference), sourceEvidence,
  }
  if (tamper === 'wrong-member') warning.sourceGroupReferences[1] = { ...warningMember.rendererReference, objectId: 'wrong-renderer' }
  if (tamper === 'missing-member') warning.sourceGroupReferences.pop()
  if (tamper === 'extra-member') warning.sourceGroupReferences.push({ ...warningMember.rendererReference, objectId: 'extra-renderer' })
  if (tamper === 'extra-active-renderer') profile.assembly.renderers[0].rootBone = {
    file: prefabReference.serializedFile, pathId: anchorReference.objectId, name: 'Bip001_Weapon',
  }
  profile.warnings = [warning]
  profile.validation = { ...profile.validation, equipmentBindingEvidence: structuredClone(profile.equipmentBindingEvidence), coreRendererBlockers: [], warnings: structuredClone(profile.warnings) }
  document.nodes[4] = { name: rootName, children: [1, 2, 3] }
  document.scenes[0].nodes = [4]
  const drawRanks = new Map(profile.drawSequence.map((key: string, index: number) => [key, index]))
  for (const renderer of profile.renderers) {
    document.materials[renderer.materialSlots[0].glb.materialIndex].extras.chibi.renderOrder = drawRanks.get(sourceKey(renderer.sourceReference))
  }
  return glbFromDocument(document)
}

function tinyExactSourceWeaponAncestryGlb(mode: 'valid' | 'missing-subweapon' | 'malformed-subweapon' | 'ancestry-tamper' | 'missing-claim' | 'duplicate-authored' | 'body-conflict' | 'missing-source-reference' | 'matched-source-reference' | 'prefab-mismatch' | 'rootbone-mismatch' = 'valid') {
  const document: any = documentFromGlb(tinyStructuralSharedMBonesGlb('legacy'))
  const renderingProfile = document.scenes[0].extras.chibi.renderingProfile
  const equipmentReference = renderingProfile.assembly.renderers[1].sourceReference
  const sourcePointer = (pathId: string, name: string) => ({
    file: equipmentReference.serializedFile,
    pathId,
    name,
    sourceReference: {
      bundleSha256: equipmentReference.bundleSha256,
      serializedFile: equipmentReference.serializedFile,
      objectId: pathId,
    },
  })
  const rootBone = sourcePointer('equipment-root', 'Bip001_Weapon_Root')
  const authoredAncestor = sourcePointer('weapon-parent', 'Bip001_Weapon')
  const assemblyRenderer = renderingProfile.assembly.renderers[1]
  renderingProfile.assembly.prefabReference = {
    bundleSha256: equipmentReference.bundleSha256,
    serializedFile: equipmentReference.serializedFile,
    objectId: 'fixture-prefab',
  }
  assemblyRenderer.rootBone = rootBone
  assemblyRenderer.rootBoneAncestry = [authoredAncestor]
  assemblyRenderer.rootBoneAncestryComplete = true
  assemblyRenderer.transformChain = [rootBone, { file: 'CAB-prefab', pathId: 'equipment-tip', name: 'Fixture_Shield' }]
  assemblyRenderer.boneReferences = [{ file: 'CAB-prefab', pathId: 'equipment-root', name: 'Bip001_Weapon_Root' }]
  renderingProfile.assembly.attachments = {
    mainWeapon: [structuredClone(authoredAncestor)], subWeapon: [],
  }
  const equipment = renderingProfile.renderers[1]
  equipment.rootBone = structuredClone(rootBone)
  equipment.transformChain = structuredClone(assemblyRenderer.transformChain)
  equipment.boneReferences = structuredClone(assemblyRenderer.boneReferences)
  const evidence = renderingProfile.equipmentBindingEvidence[0]
  evidence.reasonCode = 'EXACT_SOURCE_WEAPON_ANCESTRY'
  evidence.reason = 'Source rootBone.m_Father ancestry reaches exactly one full-identity mainWeapon/subWeapon pointer for Fixture_Shield.'
  evidence.rootBone = structuredClone(rootBone)
  evidence.transformChain = structuredClone(assemblyRenderer.transformChain)
  evidence.rootBoneAncestry = structuredClone(assemblyRenderer.rootBoneAncestry)
  evidence.boneReferences = structuredClone(assemblyRenderer.boneReferences)
  evidence.matchedAncestorPointers = [{ file: authoredAncestor.file, pathId: authoredAncestor.pathId, name: authoredAncestor.name }]
  evidence.bodyRendererReferences = []
  evidence.evidence = [
    'exact source renderer, mesh, material, and shader identities are preserved',
    'source rootBone.m_Father ancestry reaches exactly one authored mainWeapon/subWeapon pointer',
    'body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique',
    'unique non-conflicting full-source weapon ancestor relation',
  ]
  if (mode === 'ancestry-tamper') evidence.rootBoneAncestry[0].sourceReference.objectId = 'tampered-ancestor'
  if (mode === 'missing-claim') evidence.evidence = evidence.evidence.filter((item: string) => !item.startsWith('body m_Bones overlap:'))
  if (mode === 'duplicate-authored') renderingProfile.assembly.attachments.subWeapon = [structuredClone(authoredAncestor)]
  if (mode === 'body-conflict') {
    const bodyReference = renderingProfile.assembly.renderers[0].sourceReference
    renderingProfile.assembly.renderers[0].boneReferences = [structuredClone(authoredAncestor)]
    evidence.bodyRendererReferences = [bodyReference]
  }
  if (mode === 'missing-source-reference') delete evidence.rootBoneAncestry[0].sourceReference
  if (mode === 'matched-source-reference') evidence.matchedAncestorPointers[0].sourceReference = { ...authoredAncestor.sourceReference, objectId: 'forged-matched-source' }
  if (mode === 'missing-subweapon') delete renderingProfile.assembly.attachments.subWeapon
  if (mode === 'malformed-subweapon') renderingProfile.assembly.attachments.subWeapon = { pointer: authoredAncestor }
  if (mode === 'prefab-mismatch') renderingProfile.assembly.prefabReference.bundleSha256 = 'z'.repeat(64)
  if (mode === 'rootbone-mismatch') assemblyRenderer.rootBone.sourceReference.bundleSha256 = 'z'.repeat(64)
  renderingProfile.validation.equipmentBindingEvidence = [structuredClone(evidence)]
  return glbFromDocument(document)
}

function tinySharedMaterialClaimsGlb(conflicting = false) {
  const rendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: 'shared-renderer' }
  const materialReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-material', objectId: 'shared-material' }
  const rendererKey = `${rendererReference.bundleSha256}:${rendererReference.serializedFile.toLowerCase()}:${rendererReference.objectId}`
  const renderState = {
    sourceQueue: 2000, layer: 'opaque', alphaMode: 'OPAQUE', depthWrite: true, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
    blend: { source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0 },
  }
  const makeSlot = (slot: number, state: any) => ({
    slot, sourceMaterialReference: materialReference, sourceMaterialName: 'Fixture_Body', sourceShaderReference: null,
    sourceShaderName: null, sourceShaderParsedName: null, shaderProgramBlobSha256: null, adapterId: 'gltf-native',
    materialProperties: { floats: {}, ints: {}, colors: {}, keywords: [], textures: [] },
    adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: null }, renderState: state,
    glb: { nodeIndex: 1, nodeName: 'Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
  })
  const profile: any = {
    schemaVersion: 2, profileVersion: CHIBI_RENDERING_PROFILE_VERSION, policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    adapterVersion: CHIBI_SHADER_ADAPTER_VERSION, sourceIdentity: 'fixture', dependencyFingerprint: 'fixture',
    sourcePrefab: { path: 'Assets/Fixture.prefab', reference: rendererReference }, assembly: null,
    renderers: [{
      sourceReference: rendererReference, name: 'Fixture_Body', hierarchyPath: 'Body', rendererType: 'SkinnedMeshRenderer',
      defaultVisible: true, sourceMesh: { file: 'CAB-mesh', pathId: 'mesh', sourceReference: { bundleSha256: 'c'.repeat(64), serializedFile: 'CAB-mesh', objectId: 'mesh' } }, glbNodeIndex: 1,
      materialSlots: [makeSlot(0, renderState), makeSlot(1, conflicting ? { ...renderState, depthWrite: false } : renderState)],
    }],
    childRendererEvents: [], excludedRenderers: [], excludedChildRendererEvents: [],
    fxExclusionProofs: [], excludedFxInstantiationEvents: [], mouth: null,
    drawSequence: [rendererKey], validation: {
      valid: true, unresolved: [], excludedRenderers: [], excludedChildRendererEvents: [],
      fxExclusionProofs: [], excludedFxInstantiationEvents: [],
    },
  }
  const profileDiagnostics = {
    schemaVersion: 1, policyVersion: CHIBI_RENDERING_POLICY_VERSION, intentionallyExcludedRenderers: [],
    skinSkeletonMetadataVersion: CHIBI_SKIN_SKELETON_METADATA_VERSION, skinSkeletonRepairs: [],
    excludedChildRendererEvents: [], fxExclusionProofs: [], excludedFxInstantiationEvents: [], unprofiledGeometry: [],
  }
  const claims = [`${rendererKey}#0`, `${rendererKey}#1`]
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }], accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'Body', mesh: 0, skin: 0, extras: { chibi: { sourceRenderer: {
      sourceReference: rendererReference, sourceMeshReference: profile.renderers[0].sourceMesh.sourceReference, defaultVisible: true,
    } } } }],
    scenes: [{ nodes: [1], extras: { chibi: { renderingProfile: profile, renderingProfileDiagnostics: profileDiagnostics } } }], scene: 0,
    materials: [{ name: 'Fixture_Body', alphaMode: 'OPAQUE', doubleSided: false, extras: { chibi: {
      sourceMaterialReference: materialReference, renderingProfileSlots: claims, depthWrite: true, depthTest: true,
      depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, drawLayer: 'opaque', sourceQueue: 2000,
      renderOrder: 0, polygonOffsetFactor: 0, polygonOffsetUnits: 0, alphaMode: 'OPAQUE',
      blend: renderState.blend,
    } } }],
  })
}

test('captured postprocess failures retain their exact conversion diagnostic', async () => {
  const diagnostic = 'Mouth UV threshold crosses 4 source triangles; source-exact clipping is unresolved.'
  await assert.rejects(
    run(process.execPath, ['-e', `process.stderr.write(${JSON.stringify(diagnostic)}); process.exitCode = 1`], undefined, undefined, 'Chibi GLB postprocess', true),
    /Mouth UV threshold crosses 4 source triangles/,
  )
})

test('external helper failures capture the stage and stderr by default', async () => {
  await assert.rejects(
    run(process.execPath, ['-e', "process.stderr.write('Selected root animation has conflicting tracks'); process.exitCode = 1"], undefined, undefined, 'Source root rotation export'),
    /Source root rotation export:.*Selected root animation has conflicting tracks/,
  )
})

function tinyProfileGlb(eyeAlphaMode = 'BLEND', mouthAlphaMode = 'BLEND') {
  const sourceRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }
  const renderingProfile = {
    validation: { valid: true, unresolved: [] },
    renderers: [{ sourceReference: sourceRendererReference, materialSlots: [{
      slot: 0, adapterId: 'mx-character-eyemouth', renderState: { alphaMode: 'BLEND' },
      glb: { meshIndex: 0, primitiveIndices: [0], materialIndices: [0] },
    }] }],
    mouth: { sourceRendererReference, materialSlot: 0, glbMaterialIndex: 1 },
  }
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { mesh: 0, skin: 0 }], scene: 0,
    scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }],
    materials: [
      { name: 'Fixture_EyeMouth', alphaMode: eyeAlphaMode },
      { name: 'Fixture_EyeMouth#MouthAtlas', alphaMode: mouthAlphaMode, pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
        extras: { mouthAtlas: { columns: 8, rows: 8 }, mouthTiles: { Fixture: [] }, chibi: { mouthProfileBinding: { sourceRendererReference, materialSlot: 0 } } } },
    ],
    textures: [{ source: 0 }],
  })
}

function tinyLegacyEyeMouthGlb(eyeAlphaMode = 'BLEND') {
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: 'VEC3' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { mesh: 0, skin: 0 }], scenes: [{ nodes: [1] }], scene: 0,
    materials: [
      { name: 'Fixture_EyeMouth', alphaMode: eyeAlphaMode },
      { name: 'Fixture_MouthAtlas', alphaMode: 'BLEND', pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
        extras: { mouthTiles: { Fixture: [[0, 704]] } } },
    ],
  })
}

function builtinQuadValidationGlb({ wrongUV = false, skinned = false } = {}) {
  const positions = Buffer.from(new Float32Array([-.5, -.5, 0, -.5, .5, 0, .5, .5, 0, .5, -.5, 0]).buffer)
  const normals = Buffer.from(new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]).buffer)
  const uvs = Buffer.from(new Float32Array(wrongUV ? [0, 0, 1, 0, 1, 1, 0, 1] : [0, 0, 0, 1, 1, 1, 1, 0]).buffer)
  const indices = Buffer.from(new Uint32Array([0, 1, 2, 0, 2, 3]).buffer)
  const binary = Buffer.concat([positions, normals, uvs, indices])
  const rendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '7' }
  const materialReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-materials', objectId: '9' }
  const builtin = { kind: 'unity-builtin-resource', guid: '00000000000000000e00000000000000', file: 'unity default resources', pathId: '10210', name: 'Quad' }
  const sourceRenderer = { sourceReference: rendererReference, sourceMeshReference: null, sourceMeshBuiltinResource: builtin, defaultVisible: false }
  const renderingProfile = {
    validation: { valid: true, unresolved: [] },
    renderers: [{ sourceReference: rendererReference, name: 'Fixture_Body', hierarchyPath: 'Fixture/Body', rendererType: 'MeshRenderer', defaultVisible: false,
      sourceMesh: { file: 'unity default resources', pathId: '10210', externalGuid: builtin.guid, builtinResource: builtin, sourceReference: null }, glbNodeIndex: 2,
      materialSlots: [{ slot: 0, sourceMaterialReference: materialReference, sourceMaterialName: 'Fixture_Body', adapterId: 'gltf-native',
        renderState: { alphaMode: 'OPAQUE' }, glb: { nodeIndex: 2, nodeName: 'Body', meshIndex: 1, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] } }] }],
  }
  const document = {
    asset: { version: '2.0' }, buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length },
      { buffer: 0, byteOffset: positions.length, byteLength: normals.length },
      { buffer: 0, byteOffset: positions.length + normals.length, byteLength: uvs.length },
      { buffer: 0, byteOffset: positions.length + normals.length + uvs.length, byteLength: indices.length },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 4, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: 4, type: 'VEC2' },
      { bufferView: 3, componentType: 5125, count: 6, type: 'SCALAR' },
    ],
    skins: [{ joints: [0] }],
    nodes: [
      { name: 'joint' },
      { name: 'Skinned', mesh: 0, skin: 0 },
      { name: 'Body', mesh: 1, extras: { chibi: { synthesizedBuiltinResource: builtin, sourceRenderer } } },
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0 }, material: 0 }] },
      { primitives: [{ mode: 4, attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, ...(skinned ? { JOINTS_0: 0 } : {}) }, indices: 3, material: 0 }], extras: { chibi: { synthesizedBuiltinResource: builtin } } },
    ],
    materials: [{ name: 'Fixture_Body', alphaMode: 'OPAQUE', extras: { chibi: { sourceMaterialReference: materialReference } } }],
    scenes: [{ nodes: [1, 2], extras: { chibi: { renderingProfile } } }], scene: 0, animations: [],
  }
  return glbFromDocumentAndBinary(document, binary)
}

function tinyMxOutlineGlb({ missingColor = false, tamperedOutline = false } = {}) {
  const position = Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer)
  const uv = Buffer.from(new Float32Array([0, 0, 1, 0, 0, 1]).buffer)
  const tangent = Buffer.from(new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]).buffer)
  const color = Buffer.from(new Float32Array([1, 0.5, 0.25, 0.75, 1, 1, 1, 0.5, 0, 0, 0, 1]).buffer)
  const binary = Buffer.concat([position, uv, tangent, color])
  const sourceReference = structuredClone(MX_UNLIT_OUTLINE_SOURCE_REFERENCE)
  const sourceGlsl = (outline: boolean) => [
    '#version 300 es', '#ifdef VERTEX',
    'in highp vec4 in_POSITION0;', ...(outline ? ['in highp vec4 in_TANGENT0;', 'in mediump vec4 in_COLOR0;'] : []),
    'in highp vec2 in_TEXCOORD0;', 'uniform vec4 _MainTex_ST;',
    ...(outline ? [
      'uniform float _OutlineZCorrection;', 'uniform sampler2D _MainTex;', 'uniform vec4 _OutlineTint;',
      'uniform vec4 _MainLightColor;', 'uniform vec4 _ScreenParams;',
      'uniform mat4 hlslcc_mtx4x4glstate_matrix_projection;', 'uniform mat4 hlslcc_mtx4x4unity_MatrixInvV;',
      'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;',
    ] : ['uniform vec4 _Tint;', 'uniform sampler2D _MainTex;']),
    '#endif', '#ifdef FRAGMENT', ...(outline ? ['uniform sampler2D _MainTex;', 'uniform vec4 _OutlineTint;'] : ['uniform vec2 _GlobalMipBias;']), '#endif',
  ].join('\n')
  const pass = (outline: boolean) => ({
    pass: outline ? 'outline' : 'base', stateName: outline ? 'Outline' : 'ForwardLit', subShaderIndex: 0, passIndex: outline ? 1 : 0,
    stage: 'vertex', platform: 9, gpuProgramType: 4, blobIndex: outline ? 6 : 1, parameterBlobIndex: outline ? 4 : 0,
    parameterRecordSha256: `${outline ? '4' : '3'}`.repeat(64), keywordIndices: [], keywordNames: [],
    programHash: outline ? MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH : MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH,
    programDataSha256: tamperedOutline && outline ? '0'.repeat(64) : (outline ? MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH : MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH),
    programRecordSha256: `${outline ? '2' : '1'}`.repeat(64), glsl: sourceGlsl(outline),
    requiredAttributes: outline ? ['POSITION', 'TANGENT', 'COLOR_0', 'TEXCOORD_0'] : ['POSITION', 'TEXCOORD_0'],
    requiredUniforms: outline
      ? ['_MainTex_ST', '_OutlineTint', '_OutlineZCorrection', '_MainTex', '_MainLightColor', '_ScreenParams',
        'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV', 'hlslcc_mtx4x4unity_MatrixVP']
      : ['_MainTex_ST', '_Tint', '_MainTex'],
    renderState: { zWrite: 1, zTest: 4, culling: outline ? 1 : 0 },
  })
  const extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3.27f1', fingerprint: 'a'.repeat(64),
    sourceReference, compressedBlobSha256: MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256,
    passes: { base: pass(false), outline: pass(true) },
  }
  const materialReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-materials', objectId: '19' }
  const metadata = {
    adapterId: 'mx-unlit-outline', renderPass: 'base', sourceShaderReference: sourceReference,
    shaderExtraction: extraction, outlinePass: extraction.passes.outline,
    outlineTint: [0.2641509175300598, 0.2641509175300598, 0.2641509175300598, 1], outlineZCorrection: 0,
  }
  const renderingProfile = {
    validation: { valid: true, unresolved: [] }, renderers: [{
      sourceReference: { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' },
      name: 'CH0204_parchment', hierarchyPath: 'CH0204_parchment', rendererType: 'MeshRenderer', defaultVisible: true,
      glbNodeIndex: 1, materialSlots: [{
        slot: 0, sourceMaterialReference: materialReference, sourceMaterialName: 'CH0204_parchment',
        sourceShaderReference: sourceReference, sourceShaderParsedName: 'MX/Unlit Outline', sourceShaderName: 'MX/Unlit Outline',
        shaderProgramBlobSha256: MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256, adapterId: 'mx-unlit-outline', shaderExtraction: extraction,
        adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [1, 1, 1, 1], outlineTint: metadata.outlineTint, outlineZCorrection: 0 },
        renderState: { alphaMode: 'OPAQUE' }, glb: { nodeIndex: 1, nodeName: 'CH0204_parchment', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
      }],
    }],
  }
  const attrs = { POSITION: 0, TEXCOORD_0: 1, TANGENT: 2, ...(missingColor ? {} : { COLOR_0: 3 }) }
  const document = {
    asset: { version: '2.0' }, buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: position.length },
      { buffer: 0, byteOffset: position.length, byteLength: uv.length },
      { buffer: 0, byteOffset: position.length + uv.length, byteLength: tangent.length },
      { buffer: 0, byteOffset: position.length + uv.length + tangent.length, byteLength: color.length },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
      { bufferView: 2, componentType: 5126, count: 3, type: 'VEC4' },
      { bufferView: 3, componentType: 5126, count: 3, type: 'VEC4' },
    ],
    meshes: [{ primitives: [{ attributes: attrs, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'CH0204_parchment', mesh: 0, skin: 0 }], scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }], scene: 0,
    materials: [{ name: 'CH0204_parchment', alphaMode: 'OPAQUE', pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, extras: { chibi: metadata, sourceMaterialReference: materialReference } }],
    textures: [{ source: 0 }],
  }
  return glbFromDocumentAndBinary(document, binary)
}

function tinyMxTransparentGlb({ variant = 'forward', tamperedActivePass = false, missingActivePass = false }: {
  variant?: 'forward' | 'dither'; tamperedActivePass?: boolean; missingActivePass?: boolean
} = {}) {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8OeoQAAAABJRU5ErkJggg==', 'base64')
  const position = Buffer.from(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer)
  const normal = Buffer.from(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer)
  const color = Buffer.from(new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).buffer)
  const uv = Buffer.from(new Float32Array([0, 0, 1, 0, 0, 1]).buffer)
  const imageOffset = position.length + normal.length + color.length + uv.length
  const secondImageOffset = imageOffset + png.length
  const rawBinary = Buffer.concat([position, normal, color, uv, png, png])
  const binary = Buffer.concat([rawBinary, Buffer.alloc((4 - rawBinary.length % 4) % 4)])
  const sourceRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }
  const sourceMaterialReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-materials', objectId: '19' }
  const mainReference = { bundleSha256: 'e'.repeat(64), serializedFile: 'CAB-transparent-textures', objectId: '300' }
  const maskReference = { bundleSha256: 'e'.repeat(64), serializedFile: 'CAB-transparent-textures', objectId: '301' }
  const attributeName = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_TEXCOORD0'
  const glsl = (attributes: readonly string[], uniforms: readonly string[]) => [
    '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in mediump vec4 ${attributeName(attribute)};`),
    ...uniforms.map(uniform => `uniform mediump vec4 ${uniform};`), '#endif', '#ifdef FRAGMENT', 'void main() {}', '#endif',
  ].join('\n')
  const transparentPass = ({ pass, stateName, passIndex, blobIndex, parameterBlobIndex, parameterRecordSha256,
    keywordIndices, keywordNames, programHash, programRecordSha256, attributes, uniforms, depthOnly = false,
    sourceBlend = 5, destinationBlend = 10, sourceBlendAlpha = 1, destinationBlendAlpha = 10, colorMask = 15,
  }: {
    pass: 'forward' | 'dither' | 'depth'; stateName: 'ForwardLit' | ''; passIndex: number; blobIndex: number; parameterBlobIndex: number
    parameterRecordSha256: string; keywordIndices: number[]; keywordNames: string[]; programHash: string; programRecordSha256: string
    attributes: readonly string[]; uniforms: readonly string[]; depthOnly?: boolean; sourceBlend?: number; destinationBlend?: number
    sourceBlendAlpha?: number; destinationBlendAlpha?: number; colorMask?: number
  }) => ({
    pass, stateName, subShaderIndex: 0, passIndex, stage: 'vertex', platform: 9, gpuProgramType: 4,
    blobIndex, parameterBlobIndex, parameterRecordSha256, keywordIndices, keywordNames, programHash,
    programDataSha256: programHash, programRecordSha256, glsl: glsl(attributes, uniforms),
    requiredAttributes: [...attributes], requiredUniforms: [...uniforms],
    renderState: {
      zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
      sourceBlend, destinationBlend, sourceBlendAlpha, destinationBlendAlpha,
      blendOperation: 0, blendOperationAlpha: 0, colorMask, depthOnly,
    },
  })
  const extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3.27f1', fingerprint: MX_C_TRANSPARENT_ST_FINGERPRINT,
    compressedBlobSha256: MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256, sourceReference: structuredClone(MX_C_TRANSPARENT_ST_SOURCE_REFERENCE),
    passes: {
      forward: transparentPass({ pass: 'forward', stateName: 'ForwardLit', passIndex: 0, blobIndex: 6, parameterBlobIndex: 0,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256, keywordIndices: [], keywordNames: [],
        programHash: MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH, programRecordSha256: MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256,
        attributes: MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS }),
      dither: transparentPass({ pass: 'dither', stateName: 'ForwardLit', passIndex: 0, blobIndex: 8, parameterBlobIndex: 1,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256, keywordIndices: [9], keywordNames: ['_DITHER_HORIZONTAL_LINES'],
        programHash: MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH, programRecordSha256: MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256,
        attributes: MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_DITHER_UNIFORMS }),
      depth: transparentPass({ pass: 'depth', stateName: '', passIndex: 1, blobIndex: 31, parameterBlobIndex: 30,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256, keywordIndices: [], keywordNames: [],
        programHash: MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH, programRecordSha256: MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256,
        attributes: MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS,
        depthOnly: true, sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0 }),
    },
  }
  const slot = {
    slot: 0, sourceMaterialReference, sourceMaterialName: 'Fixture_Alpha2',
    sourceShaderReference: structuredClone(MX_C_TRANSPARENT_ST_SOURCE_REFERENCE), sourceShaderName: 'MX/C-Transparent-ST',
    sourceShaderParsedName: 'MX/C-Transparent-ST', shaderProgramBlobSha256: MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256,
    adapterId: 'mx-c-transparent-st', transparentShaderExtraction: extraction,
    materialProperties: {
      floats: {
        _Cull: 0, _ZWrite: 1, _MaskGSensitivity: 1, _MaskRtoG: 0, _SeeThroughMinValue: 0.5,
        _SeeThroughTransparency: 1, _SeeThroughSmoothness: 1, _ShadowThreshold: 0.5, _RimAreaMultiplier: 1,
        _RimStrength: 1, _AdditionalLightStrength: 1, _AdditionalLightSharpness: 5, _DitherThreshold: 0, _GrayBrightness: 1,
      },
      ints: {}, colors: {
        _Tint: { r: 1, g: 1, b: 1, a: 1 }, _ShadowTint: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
        _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 }, _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 },
        _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 },
      },
      keywords: variant === 'dither' ? ['_DITHER_HORIZONTAL_LINES'] : [],
      textures: [
        { name: '_MainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference },
        { name: '_MaskTex', texture: { file: maskReference.serializedFile, pathId: maskReference.objectId }, textureReference: maskReference },
      ],
      resolvedTextures: [
        { property: '_MainTex', name: 'Main', width: 256, height: 256, sourceReference: mainReference },
        { property: '_MaskTex', name: 'Mask', width: 256, height: 256, sourceReference: maskReference },
      ],
    },
    adapterSettings: { zCorrection: null, eyeTint: null, mouthTint: null, baseColorTint: [1, 1, 1, 1], transparentVariant: variant },
    renderState: {
      sourceQueue: 3000, layer: 'transparent', alphaMode: 'BLEND', depthWrite: true, depthTest: true,
      depthFunction: 'less-equal', cullMode: 'off', doubleSided: true,
      blend: { source: 5, destination: 10, sourceAlpha: 1, destinationAlpha: 10, operation: 0, operationAlpha: 0 },
      polygonOffsetFactor: 0, polygonOffsetUnits: 0,
    },
    glb: { nodeIndex: 1, nodeName: 'Fixture_Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
  }
  const renderingProfile = {
    schemaVersion: 1, profileVersion: 'chibi-rendering-profile-v5', adapterVersion: 'mx-character-adapters-v7',
    sourceIdentity: 'fixture', dependencyFingerprint: 'fixture-fingerprint',
    sourcePrefab: { path: 'Assets/Fixture.prefab', reference: sourceRendererReference }, assembly: null,
    renderers: [{ sourceReference: sourceRendererReference, name: 'Fixture_Body', hierarchyPath: 'Fixture/Body', rendererType: 'SkinnedMeshRenderer',
      defaultVisible: true, sourceMesh: null, glbNodeIndex: 1, materialSlots: [slot] }],
    childRendererEvents: [], mouth: null, drawSequence: [], validation: { valid: true, unresolved: [] },
  }
  const outputExtraction = structuredClone(extraction) as any
  if (tamperedActivePass) outputExtraction.passes[variant].programHash = '0'.repeat(64)
  if (missingActivePass) delete outputExtraction.passes[variant]
  const metadata = {
    adapterId: 'mx-c-transparent-st', renderPass: 'forward', transparentVariant: variant,
    transparentShaderExtraction: outputExtraction, depthOnlyPass: outputExtraction.passes.depth,
    maskTexture: { index: 1, texCoord: 0 }, sourceShaderReference: structuredClone(slot.sourceShaderReference),
  }
  const document = {
    asset: { version: '2.0' }, buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: position.length },
      { buffer: 0, byteOffset: position.length, byteLength: normal.length },
      { buffer: 0, byteOffset: position.length + normal.length, byteLength: color.length },
      { buffer: 0, byteOffset: position.length + normal.length + color.length, byteLength: uv.length },
      { buffer: 0, byteOffset: imageOffset, byteLength: png.length },
      { buffer: 0, byteOffset: secondImageOffset, byteLength: png.length },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: 3, type: 'VEC4' },
      { bufferView: 3, componentType: 5126, count: 3, type: 'VEC2' },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2, TEXCOORD_0: 3 }, material: 0 }] }],
    skins: [{ joints: [0] }], nodes: [{ name: 'joint' }, { name: 'Fixture_Body', mesh: 0, skin: 0 }],
    scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }], scene: 0, animations: [],
    materials: [{ name: 'Fixture_Alpha2', alphaMode: 'BLEND', doubleSided: true,
      pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, extras: { chibi: metadata } }],
    textures: [{ source: 0 }, { source: 1 }],
    images: [{ name: 'Fixture_Alpha', mimeType: 'image/png', bufferView: 4 }, { name: 'Fixture_Alpha_Mask', mimeType: 'image/png', bufferView: 5 }],
  }
  return glbFromDocumentAndBinary(document, binary)
}

function tinyMxEStandardGlb(textureMutation: 'none' | 'duplicate' | 'extra' = 'none') {
  const sourceRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }
  const sourceMaterialReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-materials', objectId: '19' }
  const sourceShaderReference = structuredClone(MX_E_STANDARD_SOURCE_REFERENCE)
  const mainReference = { bundleSha256: 'e'.repeat(64), serializedFile: 'CAB-e-standard-textures', objectId: '300' }
  const passSpecs = [
    {
      pass: 'forwardStatic', stateName: 'ForwardLit', passIndex: 0, blobIndex: 160, parameterBlobIndex: 0,
      parameterRecordSha256: 'f88facd27e428382fd81071a1bbd4f366583363e315d520319f0a8a4bb2e0389',
      programHash: 'cfd7db48ce454d347374b95768908b6c27e267c7c3812643b2162cff8ccc078b',
      programRecordSha256: '6c8c8c189fa4171c300d1c23e270155b10999851bb1ab1dd6df96c5c1fb17c78', programDataLength: 7132,
      keywordIndices: [] as number[], keywordNames: [] as string[], attributes: MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: MX_E_STANDARD_FORWARD_STATIC_UNIFORMS,
      renderState: { zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 0, sourceBlendProperty: '_SrcBlend', destinationBlend: 0, destinationBlendProperty: '_DstBlend', sourceBlendAlpha: 0, sourceBlendAlphaProperty: '_SrcBlendAlpha', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '_DstBlendAlpha', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor', offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits' },
    },
    {
      pass: 'forwardDynamic', stateName: 'ForwardLit', passIndex: 0, blobIndex: 171, parameterBlobIndex: 4,
      parameterRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, programHash: MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
      programRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, programDataLength: 8112,
      keywordIndices: [19], keywordNames: ['_DYNAMIC_LIGHTS'], attributes: MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS,
      renderState: { zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 0, sourceBlendProperty: '_SrcBlend', destinationBlend: 0, destinationBlendProperty: '_DstBlend', sourceBlendAlpha: 0, sourceBlendAlphaProperty: '_SrcBlendAlpha', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '_DstBlendAlpha', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor', offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits' },
    },
    {
      pass: 'shadow', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312,
      parameterRecordSha256: MX_E_STANDARD_SHADOW_PARAMETER_SHA256, programHash: MX_E_STANDARD_SHADOW_PROGRAM_HASH,
      programRecordSha256: MX_E_STANDARD_SHADOW_RECORD_SHA256, programDataLength: 4273,
      keywordIndices: [] as number[], keywordNames: [] as string[], attributes: MX_E_STANDARD_SHADOW_ATTRIBUTES, uniforms: MX_E_STANDARD_SHADOW_UNIFORMS,
      renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>', sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>' },
    },
    {
      pass: 'depth', stateName: 'DepthOnly', passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320,
      parameterRecordSha256: MX_E_STANDARD_DEPTH_PARAMETER_SHA256, programHash: MX_E_STANDARD_DEPTH_PROGRAM_HASH,
      programRecordSha256: MX_E_STANDARD_DEPTH_RECORD_SHA256, programDataLength: 2766,
      keywordIndices: [] as number[], keywordNames: [] as string[], attributes: MX_E_STANDARD_DEPTH_ATTRIBUTES, uniforms: MX_E_STANDARD_DEPTH_UNIFORMS,
      renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>', sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>', blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true, offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>' },
    },
    {
      pass: 'meta', stateName: 'Meta', passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328,
      parameterRecordSha256: MX_E_STANDARD_META_PARAMETER_SHA256, programHash: MX_E_STANDARD_META_PROGRAM_HASH,
      programRecordSha256: MX_E_STANDARD_META_RECORD_SHA256, programDataLength: 6928,
      keywordIndices: [] as number[], keywordNames: [] as string[], attributes: MX_E_STANDARD_META_ATTRIBUTES, uniforms: MX_E_STANDARD_META_UNIFORMS,
      renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '<noninit>', sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>', sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>' },
    },
  ] as const
  const sourceAttributeName = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
      : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1' : 'in_TEXCOORD2'
  const glsl = (attributes: readonly string[], uniforms: readonly string[]) => [
    '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 ${sourceAttributeName(attribute)};`),
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif', '#ifdef FRAGMENT',
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif',
  ].join('\n')
  const extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: MX_E_STANDARD_FINGERPRINT,
    compressedBlobSha256: MX_E_STANDARD_PROGRAM_BLOB_SHA256, sourceReference: sourceShaderReference,
    shaderName: MX_E_STANDARD_SHADER_NAME, shaderKeywordNames: [...MX_E_STANDARD_SHADER_KEYWORDS], activeVariant: 'static', activeKeywordNames: [],
    requiredProperties: [...MX_E_STANDARD_REQUIRED_PROPERTIES], sourceTextureProperties: [...MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES],
    requiredTextureProperties: [...MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES],
    passes: Object.fromEntries(passSpecs.map(spec => [spec.pass, {
      pass: spec.pass, stateName: spec.stateName, passName: '', subShaderIndex: 0, passIndex: spec.passIndex, stage: 'vertex', platform: 9, gpuProgramType: 4,
      blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex, parameterRecordSha256: spec.parameterRecordSha256,
      keywordIndices: [...spec.keywordIndices], keywordNames: [...spec.keywordNames], programHash: spec.programHash, programDataSha256: spec.programHash,
      programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256, glsl: glsl(spec.attributes, spec.uniforms),
      requiredAttributes: [...spec.attributes], requiredUniforms: [...spec.uniforms], renderState: { ...spec.renderState },
    }])),
  }
  extraction.passes.forward = structuredClone(extraction.passes.forwardStatic)
  const materialProperties: any = {
    floats: {
      _Cutoff: 0.5, _SrcBlend: 1, _DstBlend: 0, _SrcBlendAlpha: 1, _DstBlendAlpha: 0, _ZWrite: 1, _Cull: 2,
      _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ReflectBaseAmount: 0, _ReflectAnglePower: 2, _ShadowAttenRefl: 0,
      _ReflectStrength: 0, _EmissionStrength: 0, _SpecPower: 1, _ShadowAttenSpec: 0.2, _LightmapStrength: 1,
    },
    ints: {}, colors: {
      _Color: { r: 1, g: 1, b: 1, a: 1 }, _SpecLightDir: { r: 0, g: 0, b: 1, a: 0 }, _SpecLightColor: { r: 1, g: 1, b: 1, a: 1 },
      _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 }, _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 }, _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 },
    }, keywords: ['_SPECULAR_SETUP'], textures: [
      { name: '_EmissionTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
      { name: '_MainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference },
      { name: '_PrefabLightmapTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
      { name: '_ReflectTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
      { name: '_SpecTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
    ], resolvedTextures: [{ property: '_MainTex', name: 'EStandard_MainTex', width: 512, height: 512, sourceReference: mainReference }],
  }
  if (textureMutation === 'duplicate') materialProperties.textures[0].name = '_MainTex'
  if (textureMutation === 'extra') materialProperties.textures.push({ name: '_MainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference })
  const renderState = {
    sourceQueue: 2000, layer: 'opaque', alphaMode: 'OPAQUE', depthWrite: true, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false,
    blend: { source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0 }, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  }
  const slot = {
    slot: 0, sourceMaterialReference, sourceMaterialName: 'EStandard_Material', sourceShaderReference,
    sourceShaderName: MX_E_STANDARD_SHADER_NAME, sourceShaderParsedName: MX_E_STANDARD_SHADER_NAME, shaderProgramBlobSha256: MX_E_STANDARD_PROGRAM_BLOB_SHA256,
    adapterId: 'mx-e-standard', eStandardShaderExtraction: extraction, materialProperties, renderState,
    glb: { nodeIndex: 1, nodeName: 'EStandard_Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
  }
  const renderingProfile = {
    validation: { valid: true, unresolved: [] }, renderers: [{ sourceReference: sourceRendererReference, materialSlots: [slot] }],
  }
  const metadata = {
    adapterId: 'mx-e-standard', renderPass: 'forward', textureProperty: '_MainTex', unlit: false,
    sourceMaterialReference, sourceShaderReference, eStandardShaderExtraction: extraction, eStandardMaterialProperties: materialProperties,
    eStandardTextures: { mainTex: { index: 0, sourceReference: mainReference, texCoord: 0 } },
    depthWrite: true, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', drawLayer: 'opaque', blend: renderState.blend,
  }
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }, { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC2' },
    ], meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'EStandard_Body', mesh: 0, skin: 0 }], scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }], scene: 0,
    materials: [{ name: 'EStandard_Material', alphaMode: 'OPAQUE', doubleSided: false, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [1, 1, 1, 1] }, extras: { chibi: metadata } }],
    textures: [{ source: 0 }],
  })
}

function tinyDsfxAlphaBlend0Glb(variant: 'depth-tested-back-cull' | 'depth-tested-off-double-sided' = 'depth-tested-back-cull', tamper: 'none' | 'variant' | 'state' | 'extraction' = 'none') {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2]
  const sourceRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }
  const sourceMaterialReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-material', objectId: '4' }
  const textureReference = { bundleSha256: 'c'.repeat(64), serializedFile: 'CAB-texture', objectId: '5' }
  const forwardGlsl = [
    '#version 300 es', 'uniform vec4 _Color;', 'uniform vec4 _Custom_Data_Offset_Use;',
    'uniform vec4 _Texture_ST;', 'uniform sampler2D _Texture;',
  ].join('\n')
  const shadowGlsl = [
    '#version 300 es', 'uniform vec4 _ShadowBias;', 'uniform vec3 _LightDirection;',
    'uniform vec4 _ShadowCoordModifier;', 'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;',
  ].join('\n')
  const programs = DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS.map((program, index) => ({
    kind: 'program', blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
    programHash: program.programHash, programDataSha256: program.programHash, programDataLength: program.programDataLength,
    recordSha256: program.recordSha256, glsl: index < 2 ? forwardGlsl : shadowGlsl,
  }))
  const extraction: any = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: '8'.repeat(64),
    compressedBlobSha256: rule.programBlobSha256,
    shader: { name: 'DSFX/FX_SHADER_AlphaBlend_0', sourceReference: structuredClone(rule.sourceReference), keywordNames: [] },
    programs, gles3Programs: structuredClone(programs),
    bindings: programs.map((program, index) => ({
      subShaderIndex: 0, passIndex: index < 2 ? 0 : 1, passName: index < 2 ? 'Forward' : 'ShadowCaster',
      stateName: index < 2 ? 'Forward' : 'ShadowCaster', stage: 'vertex', blobIndex: program.blobIndex, parameterBlobIndex: index,
      platform: 9, gpuProgramType: 4, keywordIndices: [], keywordNames: [], programHash: program.programHash,
      gles3ProgramHash: program.programHash, programRecordSha256: program.recordSha256,
    })),
  }
  const materialProperties: any = {
    floats: { _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: variant === 'depth-tested-off-double-sided' ? 0 : 2, _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: 4, _Multiply: 1, _RGBRGBA: 0, _Main_Texture_No: 1 },
    ints: {}, colors: { _Color: { r: 0.25, g: 0.5, b: 0.75, a: 0.8 } }, keywords: [],
    textures: [{ name: '_Texture', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId }, textureReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }],
    resolvedTextures: [{ property: '_Texture', name: 'DSFX_Texture', width: 256, height: 256, sourceReference: textureReference }],
  }
  const variantState = variant === 'depth-tested-back-cull'
    ? { depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false }
    : { depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'off', doubleSided: true }
  const state: any = {
    sourceQueue: 3000, layer: 'transparent', alphaMode: 'BLEND', ...variantState,
    blend: { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 }, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  }
  const slot: any = {
    slot: 0, sourceMaterialReference, sourceMaterialName: 'AlphaBlend_0_Fixture', sourceShaderReference: rule.sourceReference,
    sourceShaderName: 'DSFX/FX_SHADER_AlphaBlend_0', sourceShaderParsedName: 'DSFX/FX_SHADER_AlphaBlend_0', shaderProgramBlobSha256: rule.programBlobSha256,
    adapterId: 'dsfx-static', dsfxShaderExtraction: extraction, dsfxRenderStateVariant: variant, materialProperties, renderState: state,
    glb: { nodeIndex: 1, nodeName: 'AlphaBlend_0_Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
  }
  const metadata: any = {
    adapterId: 'dsfx-static', renderPass: 'forward', textureProperty: '_Texture', unlit: true,
    sourceMaterialReference, sourceShaderReference: rule.sourceReference, dsfxRenderStateVariant: variant,
    alphaMode: state.alphaMode,
    depthWrite: state.depthWrite, depthTest: state.depthTest, depthFunction: state.depthFunction, cullMode: state.cullMode, doubleSided: state.doubleSided,
    drawLayer: state.layer, blend: state.blend,
  }
  if (tamper === 'variant') metadata.dsfxRenderStateVariant = 'static-default'
  if (tamper === 'state') metadata.cullMode = metadata.cullMode === 'back' ? 'off' : 'back'
  if (tamper === 'extraction') extraction.gles3Programs[0].programHash = '0'.repeat(64)
  const renderingProfile: any = { validation: { valid: true, unresolved: [] }, renderers: [{ sourceReference: sourceRendererReference, materialSlots: [slot] }] }
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'AlphaBlend_0_Body', mesh: 0, skin: 0 }], scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }], scene: 0,
    materials: [{ name: 'AlphaBlend_0_Fixture', alphaMode: 'BLEND', doubleSided: state.doubleSided, pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, extras: { chibi: metadata } }],
    textures: [{ source: 0 }],
  })
}

function tinyDsfxAdditive0Glb(variant: 'depth-tested-back-cull' | 'depth-tested-off-double-sided' = 'depth-tested-back-cull', tamper: 'none' | 'variant' | 'state' | 'extraction' | 'material' | 'texture' | 'glsl' = 'none') {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0]
  const sourceRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }
  const sourceMaterialReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-material', objectId: '4' }
  const textureReference = { bundleSha256: 'c'.repeat(64), serializedFile: 'CAB-texture', objectId: '5' }
  const sourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0' : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1'
      : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_NORMAL0'
  const sourceGlsl = (attributes: readonly string[], uniforms: readonly string[], length: number) => [
    '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 ${sourceAttribute(attribute)};`),
    ...uniforms.map(uniform => `uniform float ${uniform};`), '#endif', '#ifdef FRAGMENT', '#version 300 es', 'void main() {}', '#endif',
  ].join('\n').padEnd(length, ' ')
  const programs = DSFX_ADDITIVE_0_GLES3_PROGRAMS.map((program, index) => ({
    kind: 'program' as const, blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
    programHash: program.programHash, programDataSha256: program.programHash, programDataLength: program.programDataLength,
    recordSha256: program.programRecordSha256, glsl: sourceGlsl(program.requiredAttributes, program.requiredUniforms, program.programDataLength),
  }))
  const extraction: any = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: DSFX_ADDITIVE_0_FINGERPRINT,
    compressedBlobSha256: DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256,
    shader: { name: DSFX_ADDITIVE_0_SHADER_NAME, sourceReference: structuredClone(DSFX_ADDITIVE_0_SOURCE_REFERENCE), keywordNames: [...DSFX_ADDITIVE_0_SHADER_KEYWORDS] },
    programs, gles3Programs: structuredClone(programs),
    bindings: programs.map((program, index) => {
      const expected = DSFX_ADDITIVE_0_GLES3_PROGRAMS[index]
      return {
        subShaderIndex: 0, passIndex: expected.pass === 'forward' ? 0 : 1, passName: '', stateName: expected.stateName, stage: 'vertex',
        blobIndex: expected.blobIndex, parameterBlobIndex: expected.parameterBlobIndex, platform: 9, gpuProgramType: 4,
        keywordIndices: [...expected.keywordIndices], keywordNames: [...expected.keywordNames], parameterRecordSha256: expected.parameterRecordSha256,
        programHash: expected.programHash, gles3ProgramHash: expected.programHash, programRecordSha256: expected.programRecordSha256,
      }
    }),
  }
  const materialProperties: any = {
    floats: { _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: variant === 'depth-tested-off-double-sided' ? 0 : 2, _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: 4 },
    ints: {}, colors: { _Color: { r: 0.25, g: 0.5, b: 0.75, a: 0.8 } }, keywords: [],
    textures: [{ name: '_Texture', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId }, textureReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }],
    resolvedTextures: [{ property: '_Texture', name: 'DSFX_Texture', width: 256, height: 256, sourceReference: textureReference }],
  }
  const variantState = variant === 'depth-tested-back-cull'
    ? DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS['depth-tested-back-cull']
    : DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS['depth-tested-off-double-sided']
  const state: any = { sourceQueue: 3000, ...variantState, blend: variantState.blend, polygonOffsetFactor: 0, polygonOffsetUnits: 0 }
  const slot: any = {
    slot: 0, sourceMaterialReference, sourceMaterialName: 'Additive_0_Fixture', sourceShaderReference: rule.sourceReference,
    sourceShaderName: DSFX_ADDITIVE_0_SHADER_NAME, sourceShaderParsedName: DSFX_ADDITIVE_0_SHADER_NAME, shaderProgramBlobSha256: rule.programBlobSha256,
    adapterId: 'dsfx-static', dsfxShaderExtraction: extraction, dsfxRenderStateVariant: variant, materialProperties, renderState: state,
    glb: { nodeIndex: 1, nodeName: 'Additive_0_Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
  }
  const metadata: any = {
    adapterId: 'dsfx-static', renderPass: 'forward', textureProperty: '_Texture', unlit: true,
    sourceMaterialReference, sourceShaderReference: rule.sourceReference, dsfxRenderStateVariant: variant,
    dsfxShaderExtraction: extraction, dsfxMaterialProperties: materialProperties, dsfxTextures: { texture: { index: 0 } },
    alphaMode: state.alphaMode, depthWrite: state.depthWrite, depthTest: state.depthTest, depthFunction: state.depthFunction,
    cullMode: state.cullMode, doubleSided: state.doubleSided, drawLayer: state.layer, blend: state.blend,
  }
  if (tamper === 'variant') metadata.dsfxRenderStateVariant = 'static-default'
  if (tamper === 'state') metadata.cullMode = metadata.cullMode === 'back' ? 'off' : 'back'
  if (tamper === 'extraction') extraction.gles3Programs[0].programHash = '0'.repeat(64)
  if (tamper === 'material') materialProperties.floats._ZTest_Mode = 3
  if (tamper === 'texture') metadata.dsfxTextures.texture.index = 1
  if (tamper === 'glsl') extraction.gles3Programs[0].glsl = `${extraction.gles3Programs[0].glsl.slice(0, -1)}_Time`
  const renderingProfile: any = { validation: { valid: true, unresolved: [] }, renderers: [{ sourceReference: sourceRendererReference, materialSlots: [slot] }] }
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'Additive_0_Body', mesh: 0, skin: 0 }], scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }], scene: 0,
    materials: [{ name: 'Additive_0_Fixture', alphaMode: 'BLEND', doubleSided: state.doubleSided, pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, extras: { chibi: metadata } }],
    textures: [{ source: 0 }],
  })
}

function tinyDsfxAlphaBlendAddGlb(variant: 'depth-tested-back-cull' | 'depth-tested-off-double-sided' = 'depth-tested-off-double-sided', tamper: 'none' | 'identity' | 'hash' | 'property' | 'state' | 'variant' | 'extraction' | 'glsl' = 'none') {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1]
  const sourceRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }
  const sourceMaterialReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-material', objectId: '4' }
  const textureReference = { bundleSha256: 'c'.repeat(64), serializedFile: 'CAB-texture', objectId: '5' }
  const sourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0' : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1'
      : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_NORMAL0'
  const sourceGlsl = (attributes: readonly string[], uniforms: readonly string[], length: number) => [
    '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 ${sourceAttribute(attribute)};`),
    ...uniforms.map(uniform => `uniform float ${uniform};`), '#endif', '#ifdef FRAGMENT', '#version 300 es', 'void main() {}', '#endif',
  ].join('\n').padEnd(length, ' ')
  const programs = DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS.map(program => ({
    kind: 'program' as const, blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
    programHash: program.programHash, programDataSha256: program.programHash, programDataLength: program.programDataLength,
    recordSha256: program.programRecordSha256, glsl: sourceGlsl(program.requiredAttributes, program.requiredUniforms, program.programDataLength),
  }))
  const extraction: any = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: DSFX_ALPHA_BLEND_ADD_FINGERPRINT,
    compressedBlobSha256: DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256,
    shader: { name: DSFX_ALPHA_BLEND_ADD_SHADER_NAME, sourceReference: structuredClone(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE), keywordNames: [...DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS] },
    programs, gles3Programs: structuredClone(programs),
    bindings: programs.map((program, index) => {
      const expected = DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS[index]
      return {
        subShaderIndex: 0, passIndex: expected.pass === 'forward' ? 0 : 1, passName: '', stateName: expected.stateName, stage: 'vertex',
        blobIndex: expected.blobIndex, parameterBlobIndex: expected.parameterBlobIndex, platform: 9, gpuProgramType: 4,
        gpuProgramTypeName: expected.gpuProgramTypeName, playerGroupIndex: expected.playerGroupIndex, playerIndex: expected.playerIndex,
        subProgramIndex: expected.subProgramIndex, shaderRequirements: expected.shaderRequirements,
        keywordIndices: [...expected.keywordIndices], keywordNames: [...expected.keywordNames], parameterRecordSha256: expected.parameterRecordSha256,
        programHash: expected.programHash, gles3ProgramHash: expected.programHash, programRecordSha256: expected.programRecordSha256,
      }
    }),
  }
  const materialProperties: any = {
    floats: { _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: variant === 'depth-tested-off-double-sided' ? 0 : 2, _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: 4, _Multiply: 1, _RGBRGBA: 0, _Main_Texture_No: 0 },
    ints: {}, colors: { _Color: { r: 5.992156982421875, g: 5.992156982421875, b: 5.992156982421875, a: 1 } }, keywords: [],
    textures: [{ name: '_Texture', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId }, textureReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }],
    resolvedTextures: [{ property: '_Texture', name: 'FX_MAT_White_04_Texture', width: 256, height: 256, sourceReference: textureReference }],
  }
  const variantState = DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS[variant]
  const state: any = { sourceQueue: 3000, ...variantState, blend: variantState.blend, polygonOffsetFactor: 0, polygonOffsetUnits: 0 }
  const slot: any = {
    slot: 0, sourceMaterialReference, sourceMaterialName: 'FX_MAT_White_04', sourceShaderReference: rule.sourceReference,
    sourceShaderName: DSFX_ALPHA_BLEND_ADD_SHADER_NAME, sourceShaderParsedName: DSFX_ALPHA_BLEND_ADD_SHADER_NAME, shaderProgramBlobSha256: rule.programBlobSha256,
    adapterId: 'dsfx-static', dsfxShaderExtraction: extraction, dsfxRenderStateVariant: variant, materialProperties, renderState: state,
    glb: { nodeIndex: 1, nodeName: 'Mashiro_Original_Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
  }
  const metadata: any = {
    adapterId: 'dsfx-static', renderPass: 'forward', textureProperty: '_Texture', unlit: true,
    sourceMaterialReference, sourceShaderReference: rule.sourceReference, dsfxRenderStateVariant: variant,
    dsfxShaderExtraction: extraction, dsfxMaterialProperties: materialProperties, dsfxTextures: { texture: { index: 0 } },
    alphaMode: state.alphaMode, depthWrite: state.depthWrite, depthTest: state.depthTest, depthFunction: state.depthFunction,
    cullMode: state.cullMode, doubleSided: state.doubleSided, drawLayer: state.layer, blend: state.blend,
  }
  if (tamper === 'identity') slot.sourceShaderParsedName = 'DSFX/FX_SHADER_AlphaBlend_0'
  if (tamper === 'hash') slot.shaderProgramBlobSha256 = '0'.repeat(64)
  if (tamper === 'property') materialProperties.floats._RGBRGBA = 1
  if (tamper === 'state') metadata.cullMode = metadata.cullMode === 'back' ? 'off' : 'back'
  if (tamper === 'variant') metadata.dsfxRenderStateVariant = 'static-default'
  if (tamper === 'extraction') extraction.gles3Programs[0].programHash = '0'.repeat(64)
  if (tamper === 'glsl') extraction.gles3Programs[0].glsl = `${extraction.gles3Programs[0].glsl.slice(0, -1)}_Time`
  const renderingProfile: any = { validation: { valid: true, unresolved: [] }, renderers: [{ sourceReference: sourceRendererReference, materialSlots: [slot] }] }
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'Mashiro_Original_Body', mesh: 0, skin: 0 }], scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }], scene: 0,
    materials: [{ name: 'FX_MAT_White_04', alphaMode: 'BLEND', doubleSided: state.doubleSided, pbrMetallicRoughness: { baseColorTexture: { index: 0 } }, extras: { chibi: metadata } }],
    textures: [{ source: 0 }],
  })
}

function tinyDsfxMatcapGlb(tamper: 'none' | 'extraction' | 'instanced-uniform' | 'material' | 'material-residue' | 'source-residue' | 'metadata' | 'primitive' = 'none') {
  const sourceRendererReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-prefab', objectId: '3' }
  const sourceMaterialReference = structuredClone(DSFX_MATCAP_MATERIAL_REFERENCE)
  const sourceShaderReference = structuredClone(DSFX_MATCAP_SOURCE_REFERENCE)
  const mainReference = structuredClone(DSFX_MATCAP_MAIN_TEXTURE_REFERENCE)
  const matcapReference = structuredClone(DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE)
  const passSpecs = [
    {
      key: 'forward', pass: 'forward', variant: 'static', stateName: 'Forward', passIndex: 0, blobIndex: 2, parameterBlobIndex: 0,
      parameterRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH,
      programRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH,
      keywordIndices: [] as number[], keywordNames: [] as string[], attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
      renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
    },
    {
      key: 'forwardInstanced', pass: 'forward', variant: 'instanced', stateName: 'Forward', passIndex: 0, blobIndex: 3, parameterBlobIndex: 1,
      parameterRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH,
      programRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
      keywordIndices: [5], keywordNames: ['INSTANCING_ON'], attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
      renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
    },
    {
      key: 'shadow', pass: 'shadow', variant: 'static', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 6, parameterBlobIndex: 4,
      parameterRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH,
      programRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH,
      keywordIndices: [] as number[], keywordNames: [] as string[], attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
      renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
    },
    {
      key: 'shadowInstanced', pass: 'shadow', variant: 'instanced', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 7, parameterBlobIndex: 5,
      parameterRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH,
      programRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
      keywordIndices: [5], keywordNames: ['INSTANCING_ON'], attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
      renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
    },
  ] as const
  const sourceAttributeName = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_TEXCOORD0'
  const glsl = (attributes: readonly string[], uniforms: readonly string[]) => [
    '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 ${sourceAttributeName(attribute)};`),
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif', '#ifdef FRAGMENT',
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif',
  ].join('\n')
  const extraction: any = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: DSFX_MATCAP_FINGERPRINT,
    compressedBlobSha256: DSFX_MATCAP_PROGRAM_BLOB_SHA256, sourceReference: sourceShaderReference, shaderName: DSFX_MATCAP_SHADER_NAME,
    shaderKeywordNames: [...DSFX_MATCAP_SHADER_KEYWORDS], requiredProperties: [...DSFX_MATCAP_REQUIRED_PROPERTIES],
    requiredTextureProperties: [...DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES], passes: Object.fromEntries(passSpecs.map(spec => [spec.key, {
      pass: spec.pass, variant: spec.variant, stateName: spec.stateName, subShaderIndex: 0, passIndex: spec.passIndex, stage: 'vertex', platform: 9, gpuProgramType: 4,
      blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex, parameterRecordSha256: spec.parameterRecordSha256,
      keywordIndices: [...spec.keywordIndices], keywordNames: [...spec.keywordNames], programHash: spec.programHash, programDataSha256: spec.programHash,
      programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256, glsl: glsl(spec.attributes, spec.uniforms),
      requiredAttributes: [...spec.attributes], requiredUniforms: [...spec.uniforms], renderState: { ...spec.renderState },
    }])),
  }
  const materialProperties: any = {
    floats: { ...DSFX_MATCAP_INERT_FLOAT_PROPERTIES, _ZWrite_Mode: 1, _Cull_Mode: 2 }, ints: {}, colors: { ...DSFX_MATCAP_INERT_COLOR_PROPERTIES, _Main_Color: { r: DSFX_MATCAP_MAIN_COLOR[0], g: DSFX_MATCAP_MAIN_COLOR[1], b: DSFX_MATCAP_MAIN_COLOR[2], a: DSFX_MATCAP_MAIN_COLOR[3] } },
    keywords: [], textures: [
      { name: '_Main_Tex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { name: '_Matcap_Tex', texture: { file: matcapReference.serializedFile, pathId: matcapReference.objectId }, textureReference: matcapReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { name: '_texcoord', texture: { file: sourceMaterialReference.serializedFile, pathId: '0' }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ], resolvedTextures: [
      { property: '_Main_Tex', name: 'CH0191_MainTex', width: 64, height: 64, sourceReference: mainReference },
      { property: '_Matcap_Tex', name: 'CH0191_MatcapTex', width: 64, height: 64, sourceReference: matcapReference },
    ],
  }
  const renderState = {
    sourceQueue: -1, layer: 'transparent', alphaMode: 'BLEND', depthWrite: true, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false,
    blend: { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 }, polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  }
  const slot: any = {
    slot: 0, sourceMaterialReference, sourceMaterialName: 'CH0191_Matcap', sourceShaderReference,
    sourceShaderName: DSFX_MATCAP_SHADER_NAME, sourceShaderParsedName: DSFX_MATCAP_SHADER_NAME, shaderProgramBlobSha256: DSFX_MATCAP_PROGRAM_BLOB_SHA256,
    adapterId: 'dsfx-matcap', matcapShaderExtraction: extraction, materialProperties, renderState,
    glb: { nodeIndex: 1, nodeName: 'Matcap_Body', meshIndex: 0, primitiveIndices: [0], materialIndex: 0, materialIndices: [0] },
  }
  const renderingProfile: any = { validation: { valid: true, unresolved: [] }, renderers: [{ sourceReference: sourceRendererReference, materialSlots: [slot] }] }
  const metadata: any = {
    adapterId: 'dsfx-matcap', renderPass: 'forward', textureProperty: '_Main_Tex', unlit: false,
    sourceMaterialReference, sourceShaderReference, matcapShaderExtraction: extraction, matcapMaterialProperties: materialProperties,
    matcapTextures: { mainTex: { index: 0, sourceReference: mainReference, texCoord: 0 }, matcapTex: { index: 1, sourceReference: matcapReference, texCoord: 0 } },
    matcapShadowPass: extraction.passes.shadow, depthWrite: true, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', drawLayer: 'transparent', blend: renderState.blend,
  }
  if (tamper === 'extraction') extraction.passes.forward.programHash = '0'.repeat(64)
  if (tamper === 'instanced-uniform') extraction.passes.forwardInstanced.glsl = extraction.passes.forwardInstanced.glsl.replaceAll('hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_ObjectToWorld')
  if (tamper === 'material') materialProperties.textures[1].textureReference.objectId = '0'
  if (tamper === 'material-residue') materialProperties.floats._Metallic = 0
  if (tamper === 'source-residue') extraction.passes.forward.glsl += '\nuniform float _Metallic;'
  if (tamper === 'metadata') metadata.matcapShadowPass.programHash = '0'.repeat(64)
  const attributes: Record<string, number> = { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, COLOR_0: 3 }
  if (tamper === 'primitive') delete attributes.COLOR_0
  return glbFromDocument({
    asset: { version: '2.0' }, buffers: [{ byteLength: 12 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 12 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }, { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC2' }, { bufferView: 0, componentType: 5126, count: 3, type: 'VEC4' },
    ], meshes: [{ primitives: [{ attributes, material: 0 }] }], skins: [{ joints: [0] }],
    nodes: [{ name: 'joint' }, { name: 'Matcap_Body', mesh: 0, skin: 0 }], scenes: [{ nodes: [1], extras: { chibi: { renderingProfile } } }], scene: 0,
    materials: [{ name: 'CH0191_Matcap', alphaMode: 'BLEND', doubleSided: false, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [...DSFX_MATCAP_MAIN_COLOR] }, extras: { chibi: metadata } }],
    textures: [{ source: 0 }, { source: 1 }],
  })
}

test('validates E-Standard source textures as an exact set independent of order and rejects duplicate/cardinality changes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-mx-e-standard-validation-'))
  try {
    const valid = path.join(root, 'valid.glb'); await writeFile(valid, tinyMxEStandardGlb())
    assert.equal((await validateGlb(valid)).valid, true)
    const duplicate = path.join(root, 'duplicate.glb'); await writeFile(duplicate, tinyMxEStandardGlb('duplicate'))
    await assert.rejects(() => validateGlb(duplicate), /unexpected source texture property set/)
    const extra = path.join(root, 'extra.glb'); await writeFile(extra, tinyMxEStandardGlb('extra'))
    await assert.rejects(() => validateGlb(extra), /unexpected source texture property set/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates exact DSFX Matcap extraction, material metadata, textures, and geometry provenance', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-dsfx-matcap-validation-'))
  try {
    const valid = path.join(root, 'valid.glb'); await writeFile(valid, tinyDsfxMatcapGlb())
    assert.equal((await validateGlb(valid)).valid, true)
    const tampered = async (kind: 'extraction' | 'instanced-uniform' | 'material' | 'material-residue' | 'source-residue' | 'metadata' | 'primitive', expected: RegExp) => {
      const file = path.join(root, `${kind}.glb`); await writeFile(file, tinyDsfxMatcapGlb(kind))
      await assert.rejects(() => validateGlb(file), expected)
    }
    await tampered('extraction', /source pass metadata|source extraction|exact source extraction/)
    await tampered('instanced-uniform', /forwardInstanced pass source is missing hlslcc_mtx4x4unity_ObjectToWorldArray/)
    await tampered('material', /source identity|material|texture/)
    await tampered('material-residue', /scalar or color property set/)
    await tampered('source-residue', /source extraction declares or consumes inert Matcap property _Metallic/)
    await tampered('metadata', /source extraction|metadata|pass metadata/)
    await tampered('primitive', /does not preserve COLOR_0/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates exact AlphaBlend_0 translated state variants and rejects output tampering', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-dsfx-alpha-blend-0-validation-'))
  try {
    for (const variant of ['depth-tested-back-cull', 'depth-tested-off-double-sided'] as const) {
      const file = path.join(root, `${variant}.glb`)
      await writeFile(file, tinyDsfxAlphaBlend0Glb(variant))
      assert.equal((await validateGlb(file)).valid, true)
    }
    for (const tamper of ['variant', 'state', 'extraction'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinyDsfxAlphaBlend0Glb('depth-tested-back-cull', tamper))
      await assert.rejects(() => validateGlb(file), /AlphaBlend_0|DSFX static|source extraction|render-state/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates exact Additive_0 extraction, material state, and GLB metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-dsfx-additive-0-validation-'))
  try {
    for (const variant of ['depth-tested-back-cull', 'depth-tested-off-double-sided'] as const) {
      const file = path.join(root, `${variant}.glb`)
      await writeFile(file, tinyDsfxAdditive0Glb(variant))
      assert.equal((await validateGlb(file)).valid, true)
    }
    for (const tamper of ['variant', 'state', 'extraction', 'material', 'texture', 'glsl'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinyDsfxAdditive0Glb('depth-tested-back-cull', tamper))
      await assert.rejects(() => validateGlb(file), /Additive_0|DSFX static|source extraction|render-state|material|texture/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates exact AlphaBlend_Add extraction, clean material state, and GLB metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-dsfx-alpha-blend-add-validation-'))
  try {
    for (const variant of ['depth-tested-back-cull', 'depth-tested-off-double-sided'] as const) {
      const file = path.join(root, `${variant}.glb`)
      await writeFile(file, tinyDsfxAlphaBlendAddGlb(variant))
      assert.equal((await validateGlb(file)).valid, true)
    }
    for (const tamper of ['identity', 'hash', 'property', 'state', 'variant', 'extraction', 'glsl'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinyDsfxAlphaBlendAddGlb('depth-tested-off-double-sided', tamper))
      await assert.rejects(() => validateGlb(file), /AlphaBlend_Add|DSFX static|source extraction|render-state|material|identity/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('fingerprint is stable across object key ordering and changes with source dependencies', () => {
  const profile = emptyChibiProfile()
  assert.equal(buildFingerprint({ fingerprint: 'a' }, profile, { b: 2, a: 1 }), buildFingerprint({ fingerprint: 'a' }, profile, { a: 1, b: 2 }))
  assert.notEqual(buildFingerprint({ fingerprint: 'a' }, profile, {}), buildFingerprint({ fingerprint: 'b' }, profile, {}))
  assert.match(CHIBI_EXPORTER_VERSION, /render-profile-v7-policy-v7/)
  assert.notEqual(buildFingerprint({ fingerprint: 'a' }, profile, {}), 'be0369d533a47249428ab2ef88855ce181cd1d2de8031fc541c4b84eb973e91b')
  assert.equal(CHIBI_SHADER_ADAPTER_VERSION, 'mx-character-adapters-v9')
  assert.notEqual(
    buildFingerprint({ fingerprint: '7ec0f2aee99c8d57c6f2018dca69381869b33fbfb43aea04571872f1294a4eec' }, profile, {}),
    '21c81bf8c3017f62b1b41805e3a03d55869ff9b15f15cf367103c6930176b5fb',
    'the Wakamo UV1 runtime adapter must invalidate fingerprints created before adapter v9',
  )
  const changedPlayback = structuredClone(profile)
  changedPlayback.interactions.touch = { state: 'unsupported', reason: 'Source has no touch response.', speed: 2 }
  assert.equal(buildFingerprint({ fingerprint: 'a' }, profile, {}), buildFingerprint({ fingerprint: 'a' }, changedPlayback, {}), 'profile-only playback changes reuse geometry exports')
  assert.match(CHIBI_EXPORTER_VERSION, /weapon-ancestry-v1-all-character-clips-v2-source-tracks-v1-null-helpers-v1$/)
  assert.equal(profilesEqual({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 }), true)
})

test('preserves deterministic presentation-policy diagnostics without requiring excluded geometry', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-policy-validation-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinyPolicyProfileGlb())
    const validation = await validateGlb(file)
    assert.equal(validation.renderingProfile?.policyVersion, CHIBI_RENDERING_POLICY_VERSION)
    assert.equal(validation.renderingProfile?.excludedRenderers.length, 1)
    assert.equal(validation.renderingProfile?.excludedRenderers[0]?.sourceReference.objectId, 'presentation-renderer')
    assert.equal(validation.renderingProfile?.excludedRenderers[0]?.reasonCode, 'PRESENTATION_SHADER_OR_MATERIAL')
    assert.equal(validation.renderingProfile?.excludedChildRendererEvents.length, 1)
    assert.equal(validation.renderingProfile?.excludedChildRendererEvents[0]?.sourceRendererReference.objectId, 'presentation-renderer')
    assert.equal(validation.renderingProfile?.excludedChildRendererEvents[0]?.reasonCode, 'PRESENTATION_CHILD_RENDERER_EVENT')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('keeps source-authored core-geometry observations advisory while retaining every source material slot', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-core-geometry-warning-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinySourceAuthoredCoreGeometryWarningGlb())
    const validation = await validateGlb(file)
    assert.equal(validation.valid, true)
    assert.equal(validation.renderingProfile?.coreGeometryWarnings?.length, 1)
    assert.equal(validation.renderingProfile?.coreGeometryWarnings?.[0]?.reasonCode, 'SOURCE_AUTHORED_MULTIMATERIAL_BODY_SEPARATION')
    assert.equal(validation.renderingProfile?.coreGeometryWarnings?.[0]?.geometryEvidence.retainedMaterialSlots.length, 5)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects forged or incomplete source-authored core-geometry warnings without waiving core/action gates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-core-geometry-warning-tamper-'))
  try {
    for (const tamper of ['mirror', 'foreign-renderer', 'missing-slot', 'wrong-datum', 'wrong-assembly-material-pointer', 'hidden-renderer', 'unresolved-action', 'unresolved-action-forged-warning', 'core-blocker'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinySourceAuthoredCoreGeometryWarningGlb(tamper))
      await assert.rejects(() => validateGlb(file), tamper === 'mirror'
        ? /core-geometry warnings do not match their validation records/
        : tamper === 'unresolved-action'
          ? /Rendering profile validation is not marked valid/
          : tamper === 'unresolved-action-forged-warning'
            ? /core-geometry warning has unsupported source evidence/
          : tamper === 'core-blocker'
            ? /unresolved core-geometry blockers/
            : /core-geometry warning|Core renderer .*exact source provenance/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('preserves exact equipment binding evidence through published GLB validation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-equipment-binding-evidence-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinyPolicyProfileGlb('none', false, true))
    const validation = await validateGlb(file)
    assert.equal(validation.valid, true)
    assert.equal(validation.renderingProfile?.coreRendererBlockers?.length, 0)
    assert.equal(validation.renderingProfile?.equipmentBindingEvidence?.[0]?.classification, 'exact-equipment-renderer')
    assert.equal(validation.renderingProfile?.equipmentBindingEvidence?.[0]?.sourceReference.objectId, 'core-renderer')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates exact GLB renderer provenance for arrangement-only equipment warnings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-arrangement-warning-validation-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinyArrangementWarningGlb())
    const validation = await validateGlb(file)
    assert.equal(validation.valid, true)
    assert.equal(validation.renderingProfile?.warnings?.length, 1)
    assert.equal(validation.renderingProfile?.warnings?.[0]?.blocker.sourceReference.objectId, 'core-renderer')
    assert.equal(validation.renderingProfile?.warnings?.[0]?.blocker.sourceMeshReference.objectId, 'core-mesh')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('accepts only the exact source-pinned Misaki and Mari rig-mount group warnings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-pinned-rig-mount-warning-'))
  try {
    for (const sourceIdentity of ['ch0268', 'mari_original'] as const) {
      const file = path.join(root, `${sourceIdentity}.glb`)
      await writeFile(file, tinyPinnedRigMountArrangementWarningGlb(sourceIdentity))
      const validation = await validateGlb(file)
      assert.equal(validation.valid, true)
      assert.equal(validation.renderingProfile?.warnings?.length, 1)
      assert.deepEqual(validation.renderingProfile?.warnings?.[0]?.sourceGroupReferences?.map(reference => reference.objectId).length, 2)
      assert.equal(validation.renderingProfile?.equipmentBindingEvidence?.filter(evidence =>
        evidence.classification === 'structurally-bound-equipment').length, 2)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects wrong, missing, or extra members in a pinned Misaki/Mari rig-mount group warning', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-pinned-rig-mount-warning-tamper-'))
  try {
    for (const sourceIdentity of ['ch0268', 'mari_original'] as const) {
      for (const tamper of ['wrong-member', 'missing-member', 'extra-member', 'extra-active-renderer'] as const) {
        const file = path.join(root, `${sourceIdentity}-${tamper}.glb`)
        await writeFile(file, tinyPinnedRigMountArrangementWarningGlb(sourceIdentity, tamper))
        await assert.rejects(() => validateGlb(file), /arrangement warning|arrangement warnings|core renderer/)
      }
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('accepts only the exact source-pinned Saori swimsuit pair of arrangement warnings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-saori-swimsuit-warning-pair-'))
  try {
    const file = path.join(root, 'saori-swimsuit-pair.glb')
    await writeFile(file, tinySaoriSwimsuitArrangementWarningGlb())
    const validation = await validateGlb(file)
    assert.equal(validation.valid, true)
    assert.deepEqual(validation.renderingProfile?.warnings?.map(warning => warning.blocker.sourceReference.objectId), [
      '-1127309643643137231', '-4763531541672078543',
    ])
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects third, duplicate, reordered, substituted, or noncanonical Saori warning pairs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-saori-swimsuit-warning-pair-tamper-'))
  try {
    for (const tamper of ['third-warning', 'substituted-reference', 'duplicate-warning', 'reordered-warning', 'wrong-identity', 'wrong-fingerprint'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinySaoriSwimsuitArrangementWarningGlb(tamper))
      await assert.rejects(() => validateGlb(file), /invalid or ambiguous arrangement warning set/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects arrangement warnings that lose exact renderer, mesh, material, shader, or GLB identity', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-arrangement-warning-tamper-'))
  try {
    for (const tamper of ['warning-reference', 'mesh-reference', 'material-reference', 'shader-reference', 'warning-copy', 'glb-node-reference'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinyArrangementWarningGlb(tamper))
      await assert.rejects(() => validateGlb(file), /arrangement warning|arrangement warnings|Core renderer .*lost its exact source provenance/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects generic or presentation-only renderer warnings from the published allowlist contract', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-arrangement-warning-role-'))
  try {
    for (const tamper of ['presentation-warning', 'generic-warning'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinyArrangementWarningGlb(tamper))
      await assert.rejects(() => validateGlb(file), /arrangement warning/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('accepts legacy and exact paired zero-body-overlap structural equipment claims', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-shared-equipment-bones-validation-'))
  try {
    for (const mode of ['legacy', 'paired'] as const) {
      const file = path.join(root, `${mode}.glb`)
      await writeFile(file, tinyStructuralSharedMBonesGlb(mode))
      assert.equal((await validateGlb(file)).valid, true)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects incomplete paired claims and malformed structural body references', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-shared-equipment-bones-tamper-'))
  try {
    for (const mode of ['missing-overlap-claim', 'missing-corroboration-claim', 'self-body-reference'] as const) {
      const file = path.join(root, `${mode}.glb`)
      await writeFile(file, tinyStructuralSharedMBonesGlb(mode))
      await assert.rejects(() => validateGlb(file), /invalid body-renderer relation/)
    }
    const malformed = path.join(root, 'malformed-body-reference.glb')
    await writeFile(malformed, tinyStructuralSharedMBonesGlb('malformed-body-reference'))
    await assert.rejects(() => validateGlb(malformed), /body renderers\[0\] has no exact full source identity/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates exact full-source weapon ancestry and its unique authored pointer', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-exact-source-weapon-ancestry-'))
  try {
    for (const mode of ['valid', 'missing-subweapon'] as const) {
      const file = path.join(root, `${mode}.glb`)
      await writeFile(file, tinyExactSourceWeaponAncestryGlb(mode))
      const validation = await validateGlb(file)
      assert.equal(validation.valid, true)
      assert.equal(validation.renderingProfile?.equipmentBindingEvidence?.[0]?.reasonCode, 'EXACT_SOURCE_WEAPON_ANCESTRY')
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects tampered exact weapon ancestry, claims, authored pointers, and body conflicts', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-exact-source-weapon-ancestry-tamper-'))
  try {
    for (const mode of ['malformed-subweapon', 'ancestry-tamper', 'missing-claim', 'duplicate-authored', 'body-conflict', 'missing-source-reference', 'matched-source-reference', 'prefab-mismatch', 'rootbone-mismatch'] as const) {
      const file = path.join(root, `${mode}.glb`)
      await writeFile(file, tinyExactSourceWeaponAncestryGlb(mode))
      await assert.rejects(() => validateGlb(file), /exact source weapon|full-source|authored|body m_Bones|source identity|source bundle\/file|source-pointer/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects a published GLB when equipment binding evidence and validation records disagree', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-equipment-binding-tamper-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinyPolicyProfileGlb('equipment-evidence', false, true))
    await assert.rejects(() => validateGlb(file), /equipment-binding evidence does not match its validation records/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('accepts multiple exact same-state source claims on one GLB material', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-shared-material-claims-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinySharedMaterialClaimsGlb())
    assert.equal((await validateGlb(file)).valid, true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects conflicting source state claims that still share one GLB material', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-conflicting-material-claims-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinySharedMaterialClaimsGlb(true))
    await assert.rejects(() => validateGlb(file), /visibility or render-state metadata/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('counts the postprocess-derived mouth primitive as exact core coverage', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-policy-derived-mouth-'))
  try {
    const file = path.join(root, 'fixture.glb')
    await writeFile(file, tinyPolicyProfileGlb('none', true))
    const validation = await validateGlb(file)
    assert.equal(validation.valid, true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects tampered policy diagnostics and omitted or re-bound core renderers', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-policy-tamper-'))
  try {
    for (const tamper of ['policy', 'exclusions', 'diagnostics', 'core-omission', 'core-provenance'] as const) {
      const file = path.join(root, `${tamper}.glb`)
      await writeFile(file, tinyPolicyProfileGlb(tamper))
      await assert.rejects(() => validateGlb(file), /Embedded rendering profile|Core renderer|Embedded rendering-profile diagnostics|presentation-policy|source provenance/)
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('animator selection follows the authoritative Cafe prefab and ignores shared controllers', () => {
  const selection = selectAnimator({
    sourceIdentity: 'iori_original',
    prefabPaths: [
      'Assets/_MX/AddressableAsset/Character/Iori_Original/Iori_Original.prefab',
      'Assets/_MX/AddressableAsset/Character/Iori_Original/Cafe/Cafe_Iori_Original.prefab',
      'Assets/_MX/Characters/Hasumi_Original/Effects/Prefab/FX.prefab',
    ],
    objectNames: ['Iori_Original_Controller', 'Cafe_Iori_Original_Controller', 'Hasumi_Original_Controller'],
  }, { initialPose: 'Iori_Original_Cafe_Idle' })
  assert.equal(selection.filterName, 'Cafe_Iori_Original')
  assert.deepEqual(selection.expectedNames, ['Cafe_Iori_Original'])
  assert.equal(selection.prefabPath, 'Assets/_MX/AddressableAsset/Character/Iori_Original/Cafe/Cafe_Iori_Original.prefab')
})

test('animator selection handles numbered controller names without fuzzy outfit mapping', () => {
  const selection = selectAnimator({
    sourceIdentity: 'shun_original',
    prefabPaths: ['Assets/_MX/AddressableAsset/Character/Shun_Original/Cafe/Cafe_Shun_Original.prefab'],
    objectNames: ['Cafe_Shun01_Original', 'Cafe_Shun02_Original'],
  }, { initialPose: 'Shun_Original_Cafe_Idle' })
  assert.equal(selection.filterName, 'Cafe_Shun_Original')
  assert.deepEqual(selection.expectedNames, ['Cafe_Shun_Original', 'Cafe_Shun01_Original', 'Cafe_Shun02_Original'])
})

test('assembly selection follows the same authoritative prefab variant as animator export', () => {
  const assembly = selectAssembly({ assembly: [
    { root: 'Shun_Original', rendererOrder: [], renderers: [], attachments: {} },
    { root: 'Cafe_Shun_Original', rendererOrder: ['Shun_Original_Weapon'], renderers: [{ name: 'Shun_Original_Weapon', pathId: '1', enabled: true }], attachments: { equipmentRenderers: ['Shun_Original_Weapon'], mouthMaterialIndex: 3 } },
  ] }, 'Assets/_MX/AddressableAsset/Character/Shun_Original/Cafe/Cafe_Shun_Original.prefab')
  assert.equal(assembly?.root, 'Cafe_Shun_Original')
  assert.deepEqual(assembly?.attachments.equipmentRenderers, ['Shun_Original_Weapon'])
  assert.equal(assembly?.attachments.mouthMaterialIndex, 3)
})

test('assembly selection rejects ambiguous exact path or root matches', () => {
  const base = {
    root: 'Cafe_Shun_Original',
    prefabPath: 'Assets/_MX/AddressableAsset/Character/Shun_Original/Cafe/Cafe_Shun_Original.prefab',
    rendererOrder: [], renderers: [], attachments: {},
  }
  assert.equal(selectAssembly({ assembly: [base, { ...base }] }, base.prefabPath), null)
  assert.equal(selectAssembly({ assembly: [
    { ...base, prefabPath: undefined }, { ...base, prefabPath: undefined },
  ] }, base.prefabPath), null)
})

test('animator selection recognizes a CafeOnly prefab encoded in the file name', () => {
  const selection = selectAnimator({
    sourceIdentity: 'ch0187',
    prefabPaths: [
      'Assets/_MX/AddressableAsset/Character/CH0187/CH0187.prefab',
      'Assets/_MX/AddressableAsset/Character/CH0187/CH0187_CafeOnly.prefab',
    ],
    objectNames: ['CH0187_01', 'CH0187_CafeOnly_Controller'],
  }, { initialPose: 'CH0187_Cafe_Idle' })
  assert.equal(selection.filterName, 'CH0187_CafeOnly')
  assert.deepEqual(selection.expectedNames, ['CH0187_CafeOnly'])
  assert.equal(selection.prefabPath, 'Assets/_MX/AddressableAsset/Character/CH0187/CH0187_CafeOnly.prefab')
})

test('animator selection leaves clip-only candidates unfiltered and reports no authoritative model', () => {
  const selection = selectAnimator({
    sourceIdentity: 'natsu_original', prefabPaths: [], objectNames: [],
  }, { initialPose: 'Natsu_Original_Cafe_Idle' })
  assert.equal(selection.filterName, null)
  assert.deepEqual(selection.expectedNames, [])
  assert.equal(selection.prefabPath, null)
})

test('conversion fallback selects the native FBX2glTF name on each supported host', () => {
  assert.deepEqual(fbx2gltfToolNames('darwin'), ['FBX2glTF-macos-x86_64', 'FBX2glTF'])
  assert.deepEqual(fbx2gltfToolNames('linux'), ['FBX2glTF', 'FBX2glTF-linux-x86_64'])
  assert.deepEqual(fbx2gltfToolNames('win32'), ['FBX2glTF.exe', 'FBX2glTF-windows-x86_64.exe'])
})

test('source-specific mesh exclusions keep only the intended cafe model', () => {
  assert.deepEqual(removedMeshesForSource('asuna_original'), ['Box001'])
  assert.deepEqual(removedMeshesForSource('hare_original'), ['Hare_Original_Dron', 'Hare_Original_Pad'])
  assert.deepEqual(removedMeshesForSource('ch0187'), ['CH0187_B_Body', 'CH0187_Machine'])
  assert.deepEqual(removedMeshesForSource('cherino_original'), ['CherinoRoyalGuard_Body', 'CherinoRoyalGuard1_Body', 'CherinoRoyalGuard2_Body', 'CherinoRoyalGuard4_Body'])
  assert.deepEqual(removedMeshesForSource('mashiro_original'), ['plane'])
  assert.deepEqual(removedMeshesForSource('ch0297'), ['CH0297_Prop_Outline', 'CH0297_Arm01_Mesh', 'CH0297_Arm02_Mesh'])
  assert.deepEqual(removedMeshesForSource('ch0259'), ['Saori_Original_Handgun'])
  assert.deepEqual(removedMeshesForSource('ch0180'), ['CH0180_Seahouse_Outline_Bingsu'])
  assert.deepEqual(removedMeshesForSource('utaha_original'), ['Utaha_Original_Turret'])
  assert.deepEqual(removedMeshesForSource('airi_original'), [])
})

test('source-specific vertex color cleanup is narrow', () => {
  assert.deepEqual(stripVertexColorsForSource('ch0058'), ['CH0058_BeachTube'])
  assert.deepEqual(stripVertexColorsForSource('airi_original'), [])
})

test('source-specific alpha cutouts are narrow', () => {
  assert.deepEqual(forceMaskMaterialsForSource('ch0058'), ['CH0058_BeachTube'])
  assert.deepEqual(forceMaskMaterialsForSource('airi_original'), [])
})

test('source-specific EyeMouth V flips are narrow', () => {
  assert.deepEqual(flipEyeMouthVForSource('ch0336'), ['CH0336_EyeMouth'])
  assert.deepEqual(flipEyeMouthVForSource('airi_original'), [])
})

test('source-specific Shun face correction is narrow', () => {
  assert.deepEqual(flipEyeMouthUForSource('ch0355_02'), ['CH0355_02_EyeMouth'])
  assert.deepEqual(flipEyeMouthUForSource('airi_original'), [])
  assert.deepEqual(faceRendererOverridesForSource('ch0355_02'), { 3: 'CH0355_02_Face01_Mesh', 4: 'CH0355_02_Face02_Mesh' })
  assert.deepEqual(faceRendererOverridesForSource('airi_original'), {})
})

test('converts Unity mouth default UV coordinates to the 8x8 atlas tile', () => {
  assert.equal(mouthTileFromDefaultUV({ x: 0.125, y: 0.5 }), 401)
  assert.equal(mouthTileFromDefaultUV({ x: 0.5, y: 0.875 }), 704)
  assert.equal(mouthTileFromDefaultUV({ x: Number.NaN, y: 0.5 }), null)
})

test('source gaps reject absent models but let incomplete source profiles reach conversion', () => {
  const unavailable = sourceGap({ sourceIdentity: 'natsu_original', prefabPaths: [], objectNames: ['Natsu_Original_Controller'], materialMetadata: [], materials: [], events: [] } as any, emptyChibiProfile('Natsu'))
  assert.equal(unavailable?.status, 'unavailable')
  assert.match(unavailable?.reason ?? '', /No authoritative character prefab or animator/)

  const faceless = sourceGap({
    sourceIdentity: 'shun_original',
    prefabPaths: ['Assets/_MX/AddressableAsset/Character/Shun_Original/Cafe/Cafe_Shun_Original.prefab'],
    objectNames: ['Cafe_Shun01_Original'],
    materials: ['Shun_Original_EyeMouth'],
    materialMetadata: [{ name: 'Shun_Original_EyeMouth', shaderName: null, resolvedTextures: [] }],
    events: [],
  } as any, { ...emptyChibiProfile('Shun'), initialPose: 'Shun_Original_Cafe_Idle' })
  assert.equal(faceless, null)

  const staticMouth = sourceGap({
    sourceIdentity: 'shun_original',
    prefabPaths: ['Assets/_MX/AddressableAsset/Character/Shun_Original/Cafe/Cafe_Shun_Original.prefab'],
    objectNames: ['Cafe_Shun01_Original'],
    materials: ['Shun_Original_EyeMouth'],
    materialMetadata: [{ name: 'Shun_Original_EyeMouth', shaderName: '', shaderParsedName: 'MX/C-EyesMouth', resolvedTextures: [{ property: '_MouthTileTex', name: 'Character_Mouth', sourceReference: { bundleSha256: 'd'.repeat(64), serializedFile: 'CAB-textures', objectId: '9' } }] }],
    events: [],
  } as any, { ...emptyChibiProfile('Shun'), initialPose: 'Shun_Original_Cafe_Idle' })
  assert.equal(staticMouth, null)

  for (const sourceIdentity of ['wakamo_original', 'atsuko_original', 'ch0211']) {
    const integratedFace = sourceGap({
      sourceIdentity,
      prefabPaths: [`Assets/_MX/AddressableAsset/Character/${sourceIdentity}/Cafe/Cafe_${sourceIdentity}.prefab`],
      objectNames: [`Cafe_${sourceIdentity}`], materials: [`${sourceIdentity}_Body`], materialMetadata: [], events: [],
    } as any, { ...emptyChibiProfile(sourceIdentity), initialPose: `${sourceIdentity}_Cafe_Idle` })
    assert.equal(integratedFace, null)
  }
})

test('mouth atlas selection follows the source material instead of assuming Character_Mouth', () => {
  assert.equal(selectMouthTextureName([{
    name: 'Haruna_Original_EyeMouth', pathId: '2', file: 'source', shader: null, shaderName: '', shaderParsedName: 'MX/C-EyesMouth', renderQueue: 2000, keywords: [],
    textures: [], resolvedTextures: [{ property: '_MouthTileTex', name: 'Haruna_Mouth', width: 512, height: 512 }],
  }]), 'Haruna_Mouth')
  assert.equal(selectMouthTextureName([{
    name: 'Neru_Original_EyeMouth', pathId: '1', file: 'source', shader: null, shaderName: 'MXCharacterEyesMouthV2', renderQueue: 2000, keywords: [],
    textures: [], resolvedTextures: [{ property: '_MouthTileTex', name: 'Hina_Mouth', width: 512, height: 512 }],
  }]), 'Hina_Mouth')
  assert.equal(selectMouthTextureName([{
    name: 'Aru_Original_EyeMouth', pathId: '1', file: 'source', shader: null, shaderName: 'MXCharacterEyesMouthV2', renderQueue: 2000, keywords: [],
    textures: [], resolvedTextures: [
      { property: '_MainTex', name: 'Aru_Original_EyeMouth', width: 64, height: 64 },
      { property: '_MouthTileTex', name: 'Character_Mouth', width: 1024, height: 1024 },
    ],
  }]), 'Character_Mouth')
  assert.equal(selectMouthTextureName([]), 'Character_Mouth')
})

test('finds dropped profile MainTex slots by their selected source material and texture identities', () => {
  const materialA = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-materials', objectId: '17' }
  const materialB = { ...materialA, objectId: '19' }
  const textureA = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-textures', objectId: '29' }
  const textureB = { ...textureA, objectId: '31' }
  const slot = (sourceMaterialReference: typeof materialA, textureReference: typeof textureA) => ({
    sourceMaterialName: 'CH0190_Body', sourceMaterialReference,
    materialProperties: { textures: [{ name: '_MainTex', texture: { pathId: textureReference.objectId }, textureReference }] },
  })
  const profile = { renderers: [{ materialSlots: [slot(materialA, textureA), slot(materialB, textureB)] }] } as any
  const missing = missingSourceMainTextureExports(profile, [{ name: 'CH0190_Body', pbrMetallicRoughness: {} }])
  assert.deepEqual(missing.map(item => [item.sourceMaterialReference.objectId, item.textureReference.objectId]), [['17', '29'], ['19', '31']])
  assert.deepEqual(missingSourceMainTextureExports(profile, [{
    name: 'CH0190_Body', pbrMetallicRoughness: { baseColorTexture: { index: 2 } },
  }]), [])
})

test('restores exact EyeMouth texture even when the exporter supplied a wrong existing image', () => {
  const textureReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-textures', objectId: '29' }
  const profile = { renderers: [{ materialSlots: [{
    adapterId: 'mx-character-eyemouth', sourceMaterialName: 'CH0288_EyeMouth',
    sourceMaterialReference: { ...textureReference, objectId: '17' },
    materialProperties: { textures: [{ name: '_MainTex', texture: { pathId: '29' }, textureReference }] },
  }] }] } as any
  assert.deepEqual(missingSourceTextureExports(profile, [{ name: 'CH0288_EyeMouth', pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }])
    .map(binding => binding.textureReference), [textureReference])
})

test('always exports the exact static DSFX _Texture even when GLTF has a raw base-color binding', () => {
  const materialReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-materials', objectId: '17' }
  const textureReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-textures', objectId: '29' }
  const profile = { renderers: [{ materialSlots: [{
    adapterId: 'dsfx-static', sourceMaterialName: 'FX_MAT_Hoshino_Logo', sourceMaterialReference: materialReference,
    materialProperties: { textures: [{ name: '_Texture', texture: { pathId: textureReference.objectId }, textureReference }] },
  }] }] } as any
  const bindings = missingSourceTextureExports(profile, [{
    name: 'FX_MAT_Hoshino_Logo', pbrMetallicRoughness: { baseColorTexture: { index: 4 } },
  }])
  assert.deepEqual(bindings.map(item => [item.textureProperty, item.sourceMaterialReference.objectId, item.textureReference.objectId]), [['_Texture', '17', '29']])
  assert.deepEqual(missingSourceMainTextureExports(profile, [{ name: 'FX_MAT_Hoshino_Logo', pbrMetallicRoughness: {} }]), [])
})

test('always exports ProjectMX exact-case main/source textures and only exports NoiseTex when active', () => {
  const materialReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-materials', objectId: '17' }
  const mainReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-textures', objectId: '29' }
  const sourceReference = { ...mainReference, objectId: '31' }
  const noiseReference = { ...mainReference, objectId: '37' }
  const profile = {
    renderers: [{ materialSlots: [{
      adapterId: 'projectmx-weapon-test1-damage', sourceMaterialName: 'Fixture_Weapon', sourceMaterialReference: materialReference,
      projectMxShaderExtraction: { activeVariant: 'forward', passes: { forward: { usesNoiseTexture: false } } },
      materialProperties: { textures: [
        { name: '_mainTex', texture: { pathId: mainReference.objectId }, textureReference: mainReference },
        { name: '_sourceTex', texture: { pathId: sourceReference.objectId }, textureReference: sourceReference },
        { name: '_NoiseTex', texture: { pathId: noiseReference.objectId }, textureReference: noiseReference },
      ] },
    }] }],
  } as any
  const bindings = missingSourceTextureExports(profile, [{ name: 'Fixture_Weapon', pbrMetallicRoughness: { baseColorTexture: { index: 4 } } }])
  assert.deepEqual(bindings.map(item => [item.textureProperty, item.textureReference.objectId]), [['_mainTex', '29'], ['_sourceTex', '31']])
  profile.renderers[0].materialSlots[0].projectMxShaderExtraction.passes.forward.usesNoiseTexture = true
  assert.deepEqual(missingSourceTextureExports(profile, []).map(item => [item.textureProperty, item.textureReference.objectId]), [['_mainTex', '29'], ['_sourceTex', '31'], ['_NoiseTex', '37']])
})

test('always exports the exact DSFX Glitch_Tex NoiseTex, including when the GLB has a raw base color', () => {
  const materialReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-materials', objectId: '17' }
  const noiseReference = { bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-glitch-textures', objectId: '277634516359511144' }
  const profile = { renderers: [{ materialSlots: [{
    adapterId: 'dsfx-glitch-tex', sourceMaterialName: 'FX_MAT_Glitch_01', sourceMaterialReference: materialReference,
    materialProperties: { textures: [
      { name: '_MainTex', texture: { file: 'CAB-materials', pathId: '0' }, textureReference: null },
      { name: '_NoiseTex', texture: { file: noiseReference.serializedFile, pathId: noiseReference.objectId }, textureReference: noiseReference },
    ] },
  }] }] } as any
  const bindings = missingSourceTextureExports(profile, [{
    name: 'FX_MAT_Glitch_01', pbrMetallicRoughness: { baseColorTexture: { index: 4 } },
  }])
  assert.deepEqual(bindings.map(item => [item.textureProperty, item.sourceMaterialReference.objectId, item.textureReference.objectId]), [['_NoiseTex', '17', noiseReference.objectId]])
})

test('rejects a DSFX Glitch_Tex slot whose exact NoiseTex identity is missing', () => {
  const profile = { renderers: [{ materialSlots: [{
    adapterId: 'dsfx-glitch-tex', sourceMaterialName: 'FX_MAT_Glitch_01',
    sourceMaterialReference: { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-materials', objectId: '17' },
    materialProperties: { textures: [{ name: '_NoiseTex', texture: { file: 'CAB-glitch-textures', pathId: '0' }, textureReference: null }] },
  }] }] } as any
  assert.throws(() => missingSourceTextureExports(profile, []), /Source _NoiseTex for FX_MAT_Glitch_01 has no exact texture identity/)
})

test('always exports exact DSFX Matcap Main and Matcap textures, including when GLTF has a raw base color', () => {
  const profile = { renderers: [{ materialSlots: [{
    adapterId: 'dsfx-matcap', sourceMaterialName: 'CH0191_Matcap', sourceMaterialReference: DSFX_MATCAP_MATERIAL_REFERENCE,
    materialProperties: { textures: [
      { name: '_Main_Tex', texture: { file: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.serializedFile, pathId: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.objectId }, textureReference: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE },
      { name: '_Matcap_Tex', texture: { file: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.serializedFile, pathId: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.objectId }, textureReference: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE },
    ] },
  }] }] } as any
  const bindings = missingSourceTextureExports(profile, [{ name: 'CH0191_Matcap', pbrMetallicRoughness: { baseColorTexture: { index: 4 } } }])
  assert.deepEqual(bindings.map(item => [item.textureProperty, item.sourceMaterialReference.objectId, item.textureReference.objectId]), [
    ['_Main_Tex', DSFX_MATCAP_MATERIAL_REFERENCE.objectId, DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.objectId],
    ['_Matcap_Tex', DSFX_MATCAP_MATERIAL_REFERENCE.objectId, DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.objectId],
  ])
})

test('rejects a DSFX Matcap slot when either exact source texture identity is missing', () => {
  const profile = { renderers: [{ materialSlots: [{
    adapterId: 'dsfx-matcap', sourceMaterialName: 'CH0191_Matcap', sourceMaterialReference: DSFX_MATCAP_MATERIAL_REFERENCE,
    materialProperties: { textures: [
      { name: '_Main_Tex', texture: { file: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.serializedFile, pathId: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.objectId }, textureReference: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE },
      { name: '_Matcap_Tex', texture: { file: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.serializedFile, pathId: '0' }, textureReference: null },
    ] },
  }] }] } as any
  assert.throws(() => missingSourceTextureExports(profile, []), /Source _Matcap_Tex for CH0191_Matcap has no exact texture identity/)
})

test('keeps Hifumi two-slot inactive ProjectMX NoiseTex evidence out of active exports', () => {
  const makeSlot = (slot: number, materialId: string, mainId: string, sourceId: string, noiseId: string) => {
    const materialReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-hifumi-materials', objectId: materialId }
    const textureReference = (objectId: string) => ({ bundleSha256: 'b'.repeat(64), serializedFile: 'CAB-hifumi-textures', objectId })
    const textures = [
      { name: '_NoiseTex', texture: { file: 'CAB-hifumi-textures', pathId: noiseId }, textureReference: textureReference(noiseId) },
      { name: '_mainTex', texture: { file: 'CAB-hifumi-textures', pathId: mainId }, textureReference: textureReference(mainId) },
      { name: '_sourceTex', texture: { file: 'CAB-hifumi-textures', pathId: sourceId }, textureReference: textureReference(sourceId) },
    ]
    return {
      slot, adapterId: 'projectmx-weapon-test1-damage', sourceMaterialName: `CH0058_Tank_${slot + 1}`,
      sourceMaterialReference: materialReference,
      projectMxShaderExtraction: { activeVariant: 'forward', passes: { forward: { usesNoiseTexture: false } } },
      materialProperties: { textures, resolvedTextures: textures.map(texture => ({ property: texture.name, name: texture.name, width: 256, height: 256, sourceReference: texture.textureReference })) },
    }
  }
  const profile = { renderers: [{ materialSlots: [makeSlot(0, '17', '29', '31', '37'), makeSlot(1, '19', '41', '43', '47')] }] } as any
  const inactive = missingSourceTextureExports(profile, [])
  assert.deepEqual(inactive.map(item => [item.textureProperty, item.textureReference.objectId]), [['_mainTex', '29'], ['_sourceTex', '31'], ['_mainTex', '41'], ['_sourceTex', '43']])
  assert.equal(inactive.some(item => item.textureProperty === '_NoiseTex'), false)
  profile.renderers[0].materialSlots[1].projectMxShaderExtraction.passes.forward.usesNoiseTexture = true
  const active = missingSourceTextureExports(profile, [])
  assert.deepEqual(active.map(item => [item.textureProperty, item.textureReference.objectId]), [['_mainTex', '29'], ['_sourceTex', '31'], ['_mainTex', '41'], ['_sourceTex', '43'], ['_NoiseTex', '47']])
})

test('publishes immutable revision paths and rebuilds without replacing a corrupt revision', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-engine-'))
  try {
    const input = path.join(root, 'input.glb'); await writeFile(input, tinyGlb())
    const measuredStages: { stage: string; elapsedMs: number }[] = []
    const published = await publishArtifact(input, root, (stage, elapsedMs) => measuredStages.push({ stage, elapsedMs }))
    assert.deepEqual(measuredStages.map(entry => entry.stage), ['validation', 'artifactPublication'])
    assert.ok(measuredStages.every(entry => Number.isFinite(entry.elapsedMs) && entry.elapsedMs >= 0))
    assert.equal(published.checksum, createHash('sha256').update(await readFile(input)).digest('hex'))
    assert.equal((await validateGlb(path.join(root, published.fileKey))).valid, true)
    assert.equal(await artifactIsIntact(published.fileKey, published.checksum, root), true)
    await writeFile(path.join(root, published.fileKey), Buffer.from('corrupt'))
    assert.equal(await artifactIsIntact(published.fileKey, published.checksum, root), false)
    const rebuilt = await publishArtifact(input, root)
    assert.notEqual(rebuilt.fileKey, published.fileKey)
    assert.equal(rebuilt.checksum, published.checksum)
    assert.equal(await artifactIsIntact(rebuilt.fileKey, rebuilt.checksum, root), true)
    await rm(path.join(root, rebuilt.fileKey))
    assert.equal(await artifactIsIntact(rebuilt.fileKey, rebuilt.checksum, root), false)
    assert.equal((await readFile(input)).toString('ascii', 0, 4), 'glTF')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('conversion keeps intermediate FBX only for an explicit isolated diagnostic directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-engine-fbx-retention-'))
  try {
    const sourceRoot = path.join(root, 'source')
    const dataRoot = path.join(root, 'data')
    const toolsRoot = path.join(root, 'tools')
    const workspaceRoot = path.join(root, 'workspace')
    const currentWorkingDirectory = path.join(root, 'cwd')
    const diagnosticDirectory = path.join(root, 'diagnostic')
    const workspaceDiagnosticDirectory = path.join(workspaceRoot, 'diagnostic')
    const cwdDiagnosticDirectory = path.join(currentWorkingDirectory, 'diagnostic')
    const work = path.join(dataRoot, 'work', 'candidate')
    await Promise.all([sourceRoot, dataRoot, toolsRoot, workspaceRoot, currentWorkingDirectory, diagnosticDirectory, workspaceDiagnosticDirectory, cwdDiagnosticDirectory, work].map(directory => mkdir(directory, { recursive: true })))
    const fbx = path.join(work, 'exported.fbx')
    const bytes = Buffer.from('synthetic selected FBX bytes')
    await writeFile(fbx, bytes)
    const roots = { sourceRoot, dataRoot, toolsRoot, workspaceRoot, currentWorkingDirectory }
    const candidate = { sourceIdentity: 'Hanae_Rabbit' } as any

    assert.equal(await retainIntermediateFbxForDiagnostics(fbx, candidate, undefined, roots), null)
    assert.deepEqual(await readdir(diagnosticDirectory), [])
    await assert.rejects(retainIntermediateFbxForDiagnostics(fbx, candidate, diagnosticDirectory, {
      sourceRoot, dataRoot, toolsRoot, currentWorkingDirectory,
    }), /explicit diagnostic workspace root/)
    await assert.rejects(retainIntermediateFbxForDiagnostics(fbx, candidate, workspaceDiagnosticDirectory, roots), /overlaps a protected conversion root/)
    await assert.rejects(retainIntermediateFbxForDiagnostics(fbx, candidate, cwdDiagnosticDirectory, roots), /overlaps a protected conversion root/)

    const receipt = await retainIntermediateFbxForDiagnostics(fbx, candidate, diagnosticDirectory, roots)
    assert.equal(receipt?.sourceIdentity, candidate.sourceIdentity)
    assert.equal(receipt?.bytes, bytes.length)
    assert.equal(receipt?.sha256, createHash('sha256').update(bytes).digest('hex'))

    try {
      throw new Error('synthetic FBX2glTF failure after retention')
    } catch (error) {
      assert.match((error as Error).message, /FBX2glTF failure/)
    } finally {
      await rm(work, { recursive: true, force: true })
    }
    assert.deepEqual(await readFile(path.join(diagnosticDirectory, 'intermediate.fbx')), bytes)
    assert.equal(JSON.parse(await readFile(path.join(diagnosticDirectory, 'intermediate.fbx.receipt.json'), 'utf8')).sha256, receipt?.sha256)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('reads only fixed conversion timing fields from a conversion error', () => {
  const error = new Error('conversion failed')
  Object.defineProperty(error, 'chibiConversionTiming', {
    value: { schemaVersion: 1, totalMs: 20.44, stagesMs: { fbx2gltf: 12.36, secret: 'path/to/file' } },
  })
  const timing = getChibiConversionTiming(error)
  assert.deepEqual(timing, {
    schemaVersion: 1,
    totalMs: 20.4,
    stagesMs: {
      prepare: 0, extraction: 0, assetStudio: 0, fbx2gltf: 12.4, sourceTextureExport: 0,
      postprocess: 0, validation: 0, artifactPublication: 0, cleanup: 0, other: 0,
    },
  })
  assert.equal(getChibiConversionTiming(new Error('no timing')), undefined)
})

test('failed pre-conversion candidates retain path-free stage timings', async () => {
  const candidate = { sourceIdentity: 'unindexed', prefabPaths: [], objectNames: [], parts: [] } as any
  await assert.rejects(() => convertCandidate({ candidate, profile: emptyChibiProfile() }), error => {
    const timing = getChibiConversionTiming(error)
    assert.ok(timing)
    assert.ok(timing.stagesMs.prepare > 0)
    assert.equal(timing.stagesMs.extraction, 0)
    assert.doesNotMatch(JSON.stringify(timing), /path|sourceIdentity|password/i)
    return error instanceof Error && /No authoritative character prefab/.test(error.message)
  })
})

test('recovery only requeues stale running leases', async () => {
  let request: any
  await recoverExpiredLeases({ chibiImportJob: { updateMany(input: any) { request = input; return { count: 1 } } } }, new Date('2026-01-01T00:02:00Z'))
  assert.equal(request.where.status, 'running')
  assert.equal(request.where.OR[1].heartbeatAt.lt.toISOString(), '2026-01-01T00:00:30.000Z')
  assert.equal(request.data.leaseToken, null)
})

test('lost lease prevents all publication writes', async () => {
  let assetWrites = 0
  const tx = { chibiImportJob: { updateMany: async () => ({ count: 0 }) }, chibiAsset: { upsert: async () => { assetWrites += 1 } } }
  const db = { $transaction: (callback: any) => callback(tx) }
  await assert.rejects(() => fencedPublish(db, {
    jobId: 'job', leaseToken: 'old', itemId: 'item', student: { id: 10002, name: 'Haruna', pathName: 'haruna' },
    candidate: { sourceIdentity: 'haruna_original', fingerprint: 'source', conflict: false, parts: [], families: [], revisions: [], clips: [], objectNames: [], materials: [], dependencies: [], events: [] },
    profile: {}, fingerprint: 'fingerprint', artifact: { checksum: 'sum', fileKey: 'published/sum.glb', validation: { valid: true }, clips: [] },
    dependencyFingerprint: 'dep', provenance: 'canonical', identityPath: 'haruna', overrides: {},
  }), /lease was lost/)
  assert.equal(assetWrites, 0)
  await assert.rejects(() => renewLease({ chibiImportJob: { updateMany: async () => ({ count: 0 }) } }, 'job', 'old'), /lease was lost/)
})

test('a newer mapping approval is fenced before asset creation', async () => {
  let assetWrites = 0
  const expected = new Date('2026-01-01T00:00:00Z')
  const tx = {
    chibiImportJob: { updateMany: async () => ({ count: 1 }) },
    student: { findUnique: async () => ({ pathName: 'haruna' }) },
    studentChibiBinding: { findUnique: async () => ({ updatedAt: new Date(expected.getTime() + 1) }) },
    chibiAsset: { create: async () => { assetWrites += 1 } },
  }
  await assert.rejects(() => fencedPublish({ $transaction: (callback: any) => callback(tx) }, {
    jobId: 'job', leaseToken: 'lease', itemId: 'item', student: { id: 10002, name: 'Haruna', pathName: 'haruna' },
    candidate: { sourceIdentity: 'haruna_original', fingerprint: 'source', conflict: false, parts: [], families: [], revisions: [], clips: [], objectNames: [], materials: [], dependencies: [], events: [] },
    profile: {}, fingerprint: 'fingerprint', artifact: { checksum: 'sum', fileKey: 'published/sum/id.glb', validation: { valid: true }, clips: [] },
    dependencyFingerprint: 'dep', provenance: 'manual', identityPath: 'haruna', overrides: {}, expectedBindingUpdatedAt: expected,
  }), /approval changed/)
  assert.equal(assetWrites, 0)
})

test('validates profile eye-mouth blending against exact source shader state', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-profile-validation-'))
  const file = path.join(root, 'profile.glb')
  try {
    await writeFile(file, tinyProfileGlb())
    assert.equal((await validateGlb(file)).valid, true)

    await writeFile(file, tinyProfileGlb('MASK', 'BLEND'))
    await assert.rejects(() => validateGlb(file), /eye\/mouth material alpha mode differs from its source shader state/)

    await writeFile(file, tinyProfileGlb('BLEND', 'MASK'))
    await assert.rejects(() => validateGlb(file), /Mouth atlas alpha mode differs from its source shader state/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates MX/Unlit Outline provenance, two source passes, and preserved tangent/color attributes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-mx-outline-validation-'))
  const file = path.join(root, 'outline.glb')
  try {
    await writeFile(file, tinyMxOutlineGlb())
    assert.equal((await validateGlb(file)).valid, true)

    await writeFile(file, tinyMxOutlineGlb({ tamperedOutline: true }))
    await assert.rejects(() => validateGlb(file), /two-pass material metadata|source pass metadata/)

    await writeFile(file, tinyMxOutlineGlb({ missingColor: true }))
    await assert.rejects(() => validateGlb(file), /does not preserve COLOR_0/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('selects the active MX/C-Transparent-ST forward or dither pass metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-mx-transparent-validation-'))
  try {
    const forward = path.join(root, 'forward.glb')
    const dither = path.join(root, 'dither.glb')
    await writeFile(forward, tinyMxTransparentGlb({ variant: 'forward' }))
    await writeFile(dither, tinyMxTransparentGlb({ variant: 'dither' }))
    assert.equal((await validateGlb(forward)).valid, true)
    assert.equal((await validateGlb(dither)).valid, true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects tampered or missing active MX/C-Transparent-ST pass metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-mx-transparent-tamper-'))
  try {
    const tampered = path.join(root, 'tampered.glb')
    const missing = path.join(root, 'missing.glb')
    await writeFile(tampered, tinyMxTransparentGlb({ variant: 'dither', tamperedActivePass: true }))
    await assert.rejects(() => validateGlb(tampered), /MX\/C-Transparent-ST dither source pass metadata/)
    await writeFile(missing, tinyMxTransparentGlb({ variant: 'dither', missingActivePass: true }))
    await assert.rejects(() => validateGlb(missing), /lost its exact forward\/depth material metadata or textures/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('validates canonical built-in Quad topology, provenance, and unskinned output', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-builtin-quad-validation-'))
  const file = path.join(root, 'quad.glb')
  try {
    await writeFile(file, builtinQuadValidationGlb())
    assert.equal((await validateGlb(file)).valid, true)

    await writeFile(file, builtinQuadValidationGlb({ wrongUV: true }))
    await assert.rejects(() => validateGlb(file), /incorrect coordinates, normals, UVs, or winding/)

    await writeFile(file, builtinQuadValidationGlb({ skinned: true }))
    await assert.rejects(() => validateGlb(file), /unexpectedly contains skinning attributes/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('accepts source BLEND alpha and legacy mouth events without a rendering profile', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-legacy-eyemouth-validation-'))
  const file = path.join(root, 'legacy.glb')
  try {
    await writeFile(file, tinyLegacyEyeMouthGlb('BLEND'))
    assert.equal((await validateGlb(file)).valid, true)

    await writeFile(file, tinyLegacyEyeMouthGlb('unsupported'))
    await assert.rejects(() => validateGlb(file), /Eye\/mouth material has unsupported alpha mode/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('rejects truncated and externally referenced GLBs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-validation-'))
  try {
    const file = path.join(root, 'bad.glb'); await writeFile(file, Buffer.from('glTF'))
    await assert.rejects(() => validateGlb(file), /not a GLB/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('retains moving source camera clips without relaxing character skeletal validation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-camera-animation-'))
  const file = path.join(root, 'model.glb')
  const document = documentFromGlb(tinyGlb())
  const binary = Buffer.alloc(44)
  binary.writeFloatLE(1, 16); binary.writeFloatLE(1, 32)
  document.buffers[0].byteLength = binary.length
  document.bufferViews.push({ buffer: 0, byteOffset: 12, byteLength: 8 }, { buffer: 0, byteOffset: 20, byteLength: 24 })
  document.accessors.push({ bufferView: 1, componentType: 5126, count: 2, type: 'SCALAR' }, { bufferView: 2, componentType: 5126, count: 2, type: 'VEC3' })
  document.nodes.push({ name: 'Camera001' })
  document.scenes[0].nodes.push(2)
  document.animations = [{ name: 'Akane_Original_Exs_Cam', samplers: [{ input: 1, output: 2 }], channels: [{ sampler: 0, target: { node: 2, path: 'translation' } }] }]
  try {
    await writeFile(file, glbFromDocumentAndBinary(document, binary))
    assert.equal((await validateGlb(file)).valid, true)
    document.animations[0].name = 'Akane_Original_Normal_Attack_Ing'
    await writeFile(file, glbFromDocumentAndBinary(document, binary))
    await assert.rejects(() => validateGlb(file), /no skeletal deformation/)
    document.animations[0].name = 'Akane_Original_Exs_Cam'
    binary.writeFloatLE(0, 32)
    await writeFile(file, glbFromDocumentAndBinary(document, binary))
    await assert.rejects(() => validateGlb(file), /no skeletal deformation/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('incomplete imports retain diagnostics while still rejecting structurally unusable models', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'chibi-incomplete-validation-'))
  const file = path.join(root, 'model.glb')
  const bytes = tinyGlb()
  const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  document.scenes = [{ nodes: [1], extras: { chibi: { incompleteImport: {
    sourceComplete: false, warnings: ['Pickup action missing'],
  } } } }]
  document.scene = 0
  try {
    await writeFile(file, glbFromDocument(document))
    assert.deepEqual((await validateGlb(file)).incompleteImport, { sourceComplete: false, warnings: ['Pickup action missing'] })
    document.skins = []
    await writeFile(file, glbFromDocument(document))
    await assert.rejects(() => validateGlb(file), /skin/i)
  } finally { await rm(root, { recursive: true, force: true }) }
})
