import assert from 'node:assert/strict'
import test from 'node:test'

import { emptyChibiProfile } from './types'
import { UNITY_BUILTIN_QUAD_PATH_ID, UNITY_BUILTIN_RESOURCES_FILE, UNITY_BUILTIN_RESOURCES_GUID } from './inventory'
import type { InventoryAssemblyRenderer, InventoryEvent, InventoryFxTargetEvidence, InventoryMaterial, InventoryShader, InventoryShaderExtraction, InventorySourceReference, SourceCandidate } from './inventory'
import {
  buildChibiRenderingProfile,
  isExpectedSourceAuthoredCoreGeometryWarning,
  CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES,
  CHIBI_CUSTOM_SHADER_ADAPTER_RULES,
  CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES,
  DSFX_ADDITIVE_0_FINGERPRINT,
  DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES,
  DSFX_ADDITIVE_0_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256,
  DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
  DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_HASH,
  DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256,
  DSFX_ADDITIVE_0_FORWARD_INSTANCED_UNIFORMS,
  DSFX_ADDITIVE_0_FORWARD_PARAMETER_RECORD_SHA256,
  DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH,
  DSFX_ADDITIVE_0_FORWARD_PROGRAM_HASH,
  DSFX_ADDITIVE_0_FORWARD_PROGRAM_RECORD_SHA256,
  DSFX_ADDITIVE_0_FORWARD_UNIFORMS,
  DSFX_ADDITIVE_0_GLES3_PROGRAMS,
  DSFX_ADDITIVE_0_REQUIRED_PROPERTIES,
  DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES,
  DSFX_ADDITIVE_0_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256,
  DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
  DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_HASH,
  DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256,
  DSFX_ADDITIVE_0_SHADOW_INSTANCED_UNIFORMS,
  DSFX_ADDITIVE_0_SHADOW_PARAMETER_RECORD_SHA256,
  DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH,
  DSFX_ADDITIVE_0_SHADOW_PROGRAM_HASH,
  DSFX_ADDITIVE_0_SHADOW_PROGRAM_RECORD_SHA256,
  DSFX_ADDITIVE_0_SHADOW_UNIFORMS,
  DSFX_ADDITIVE_0_SHADER_KEYWORDS,
  DSFX_ADDITIVE_0_SHADER_NAME,
  DSFX_ADDITIVE_0_SOURCE_REFERENCE,
  DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS,
  DSFX_ALPHA_BLEND_ADD_FINGERPRINT,
  DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES,
  DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS,
  DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS,
  DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS,
  DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES,
  DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES,
  DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS,
  DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS,
  DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS,
  DSFX_ALPHA_BLEND_ADD_SHADER_NAME,
  DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE,
  DSFX_GLITCH_TEX_FINGERPRINT,
  DSFX_GLITCH_TEX_FORWARD_ATTRIBUTES,
  DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256,
  DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH,
  DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
  DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256,
  DSFX_GLITCH_TEX_FORWARD_UNIFORMS,
  DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256,
  DSFX_GLITCH_TEX_REQUIRED_PROPERTIES,
  DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES,
  DSFX_GLITCH_TEX_SHADER_KEYWORDS,
  DSFX_GLITCH_TEX_SHADER_NAME,
  DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES,
  DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256,
  DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH,
  DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH,
  DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256,
  DSFX_GLITCH_TEX_SHADOW_UNIFORMS,
  DSFX_GLITCH_TEX_SOURCE_REFERENCE,
  DSFX_MATCAP_FINGERPRINT,
  DSFX_MATCAP_INERT_COLOR_PROPERTIES,
  DSFX_MATCAP_INERT_FLOAT_PROPERTIES,
  DSFX_MATCAP_FORWARD_ATTRIBUTES,
  DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256,
  DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH,
  DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256,
  DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH,
  DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
  DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
  DSFX_MATCAP_MAIN_COLOR,
  DSFX_MATCAP_MAIN_TEXTURE_REFERENCE,
  DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE,
  DSFX_MATCAP_MATERIAL_REFERENCE,
  DSFX_MATCAP_PROGRAM_BLOB_SHA256,
  DSFX_MATCAP_REQUIRED_PROPERTIES,
  DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES,
  DSFX_MATCAP_SHADOW_ATTRIBUTES,
  DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256,
  DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH,
  DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256,
  DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH,
  DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH,
  DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256,
  DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
  DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
  DSFX_MATCAP_SHADER_KEYWORDS,
  DSFX_MATCAP_SHADER_NAME,
  DSFX_MATCAP_SOURCE_REFERENCE,
  MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH,
  MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH,
  MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256,
  MX_UNLIT_OUTLINE_SOURCE_REFERENCE,
  MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH,
  MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS,
  MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH,
  MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_DITHER_UNIFORMS,
  MX_C_TRANSPARENT_ST_FINGERPRINT,
  MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES,
  MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH,
  MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS,
  MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES,
  MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256,
  MX_C_TRANSPARENT_ST_SOURCE_REFERENCE,
  MX_E_STANDARD_DEPTH_ATTRIBUTES,
  MX_E_STANDARD_DEPTH_PARAMETER_SHA256,
  MX_E_STANDARD_DEPTH_PROGRAM_HASH,
  MX_E_STANDARD_DEPTH_RECORD_SHA256,
  MX_E_STANDARD_DEPTH_UNIFORMS,
  MX_E_STANDARD_FINGERPRINT,
  MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256,
  MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
  MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256,
  MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS,
  MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256,
  MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH,
  MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256,
  MX_E_STANDARD_FORWARD_STATIC_UNIFORMS,
  MX_E_STANDARD_FORWARD_ATTRIBUTES,
  MX_E_STANDARD_META_ATTRIBUTES,
  MX_E_STANDARD_META_PARAMETER_SHA256,
  MX_E_STANDARD_META_PROGRAM_HASH,
  MX_E_STANDARD_META_RECORD_SHA256,
  MX_E_STANDARD_META_UNIFORMS,
  MX_E_STANDARD_PROGRAM_BLOB_SHA256,
  MX_E_STANDARD_REQUIRED_PROPERTIES,
  MX_E_STANDARD_SHADOW_ATTRIBUTES,
  MX_E_STANDARD_SHADOW_PARAMETER_SHA256,
  MX_E_STANDARD_SHADOW_PROGRAM_HASH,
  MX_E_STANDARD_SHADOW_RECORD_SHA256,
  MX_E_STANDARD_SHADOW_UNIFORMS,
  MX_E_STANDARD_SHADER_KEYWORDS,
  MX_E_STANDARD_SHADER_NAME,
  MX_E_STANDARD_SOURCE_REFERENCE,
  MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES,
  PROJECTMX_WEAPON_FINGERPRINT,
  PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256,
  PROJECTMX_WEAPON_REQUIRED_PROPERTIES,
  PROJECTMX_WEAPON_SHADER_KEYWORDS,
  PROJECTMX_WEAPON_SOURCE_REFERENCE,
  resolveShaderState,
  sourceObjectKey,
} from './rendering-profile'

const hash = (char: string) => char.repeat(64)

function reference(bundleSha256: string, serializedFile: string, objectId: string): InventorySourceReference {
  return { bundleSha256, serializedFile, objectId }
}

function referenceKeyForTest(sourceReference: InventorySourceReference | null | undefined) {
  return sourceReference
    ? `${sourceReference.bundleSha256.toLowerCase()}:${sourceReference.serializedFile.toLowerCase()}:${sourceReference.objectId}`
    : ''
}

function makeCandidate(identity: string, slotNames: string[], options: {
  mouthSlot?: number
  defaultUV?: { x: number; y: number }
  events?: InventoryEvent[]
  conflict?: boolean
  missingSlotReference?: number
} = {}): { candidate: SourceCandidate; prefabPath: string } {
  const safeName = identity.split('_').map(part => part[0].toUpperCase() + part.slice(1)).join('_')
  const root = `Cafe_${safeName}`
  const prefabPath = `Assets/_MX/AddressableAsset/Character/${safeName}/Cafe/${root}.prefab`
  const rendererReference = reference(hash('a'), 'CAB-prefab', '9007199254740993')
  const prefabReference = reference(hash('a'), 'CAB-prefab', '9007199254740994')
  const meshReference = reference(hash('b'), 'CAB-mesh', '9007199254740995')
  const sourceMaterials: NonNullable<SourceCandidate['sourceMaterials']> = []
  const shaders: InventoryShader[] = []
  const slots = slotNames.map((name, slot) => {
    const materialReference = reference(hash('c'), 'CAB-materials', String(100 + slot))
    const shaderFamily = /eyemouth/i.test(name) ? 'EyesMouth'
      : /eyebrow/i.test(name) ? 'Eyebrow'
        : /hair/i.test(name) ? 'Hair'
          : /weapon/i.test(name) ? 'Weapon'
            : /face/i.test(name) ? 'Face' : 'General'
    const shaderReference = reference(hash('d'), 'CAB-shaders', String(200 + slot))
    const shaderName = shaderFamily === 'Eyebrow' && identity === 'haruna_original' ? 'MX/C-Eyebrow-OneColor'
      : shaderFamily === 'General' ? 'MX/C-General/Layer4' : `MX/C-${shaderFamily}`
    const shader: InventoryShader = {
      name: '',
      parsedName: shaderName,
      pathId: String(200 + slot),
      file: 'CAB-shaders',
      sourceReference: shaderReference,
      programBlobSha256: hash('e'),
      properties: { m_Props: [{ m_Name: '_ZWrite', 'm_DefValue[0]': 1 }, { m_Name: '_ZTest', 'm_DefValue[0]': 4 }] },
      subShaders: [{ passes: [{ type: 0, state: {
        srcBlend: /eyemouth/i.test(name) ? 5 : 1,
        dstBlend: /eyemouth/i.test(name) ? 10 : 0,
        zWrite: { val: 0, name: '[_ZWrite]' },
        zTest: 4,
        culling: 2,
        offsetFactor: 0,
        offsetUnits: 0,
      } }] }],
    }
    shaders.push(shader)
    const hasMouthAtlas = /eyemouth/i.test(name)
    const textureReference = hasMouthAtlas ? reference(hash('f'), 'CAB-textures', '300') : undefined
    const material: InventoryMaterial & { shaderName: string; shaderParsedName: string; resolvedTextures: NonNullable<SourceCandidate['materialMetadata']>[number]['resolvedTextures'] } = {
      name,
      pathId: String(100 + slot),
      file: 'CAB-materials',
      sourceReference: materialReference,
      shader: { file: 'CAB-shaders', pathId: String(200 + slot) },
      shaderReference,
      shaderName: '',
      shaderParsedName: shaderName,
      renderQueue: /eyemouth/i.test(name) ? 2001 : 2000,
      keywords: [],
      textures: hasMouthAtlas ? [{
        name: '_MouthTileTex', texture: { file: 'CAB-textures', pathId: '300' }, textureReference,
        scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 },
      }] : [],
      floatProperties: {
        ...(hasMouthAtlas ? { _MouthTileCols: 8, _MouthTileRows: 8 } : {}),
        ...(shaderFamily === 'Eyebrow' ? { _ZCorrection: identity === 'haruna_original' ? 0.036 : 0.023 } : {}),
      },
      intProperties: {},
      colorProperties: {},
      resolvedTextures: hasMouthAtlas ? [{
        property: '_MouthTileTex', name: 'MouthAtlas', width: 1024, height: 1024, sourceReference: textureReference,
        scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 },
      }] : [],
    }
    sourceMaterials.push(material)
    return {
      slot,
      material: { file: 'CAB-materials', pathId: String(100 + slot) },
      sourceMaterialReference: slot === options.missingSlotReference ? null : materialReference,
    }
  })
  const rendererPath = `${root}/${safeName}_Body`
  const assembly = {
    root,
    prefabPath,
    prefabTarget: { file: 'CAB-prefab', pathId: '9007199254740994' },
    prefabReference,
    rendererOrder: [`${safeName}_Body`],
    renderers: [{
      name: `${safeName}_Body`,
      pathId: rendererReference.objectId,
      sourceReference: rendererReference,
      rendererType: 'SkinnedMeshRenderer',
      hierarchyPath: rendererPath,
      enabled: true,
      gameObjectActive: true,
      visible: true,
      mesh: { file: 'CAB-mesh', pathId: '9007199254740995' },
      meshSourceReference: meshReference,
      materialSlots: slots,
    }],
    attachments: options.mouthSlot === undefined ? {} : {
      mouthRenderer: [{ file: rendererReference.serializedFile, pathId: rendererReference.objectId, name: `${safeName}_Body`, sourceReference: rendererReference }],
      mouthMaterialIndex: options.mouthSlot,
      mouthDefaultUV: options.defaultUV,
    },
  }
  const candidate: SourceCandidate = {
    sourceIdentity: identity,
    fingerprint: hash('9'),
    conflict: options.conflict ?? false,
    parts: [], families: [], revisions: [], clips: [
      `${safeName}_Cafe_Idle`, `${safeName}_Cafe_Walk`, `${safeName}_Cafe_Interaction`],
    objectNames: [], materials: slotNames, dependencies: [], events: options.events ?? [],
    prefabPaths: [prefabPath], sourceMaterials, shaders, assembly: [assembly],
  }
  return { candidate, prefabPath }
}

function makeFxInstantiationEvent(): InventoryEvent {
  const targetReference = reference(hash('2'), 'CAB-fx', '101')
  const gameObjectReference = targetReference
  const transformReference = reference(hash('2'), 'CAB-fx', '102')
  const rendererReference = reference(hash('2'), 'CAB-fx', '103')
  const monoBehaviourReference = reference(hash('2'), 'CAB-fx', '104')
  const meshReference = reference(hash('2'), 'CAB-fx', '105')
  const scriptReference = CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES[0]
  const fxTargetEvidence: InventoryFxTargetEvidence = {
    schemaVersion: 1,
    target: { file: targetReference.serializedFile, pathId: targetReference.objectId, externalGuid: '0'.repeat(32) },
    targetReference,
    rootType: 'GameObject',
    completeTraversal: true,
    classification: 'unknown',
    gameObjectCount: 1,
    componentTypeCounts: { Transform: 1, ParticleSystemRenderer: 1, MonoBehaviour: 1 },
    gameObjectReferences: [gameObjectReference],
    transformReferences: [transformReference],
    componentReferences: [
      { sourceReference: transformReference, type: 'Transform' },
      { sourceReference: rendererReference, type: 'ParticleSystemRenderer' },
      { sourceReference: monoBehaviourReference, type: 'MonoBehaviour' },
    ],
    rendererAssets: [{
      rendererReference,
      mesh: {
        pointer: { file: meshReference.serializedFile, pathId: meshReference.objectId },
        fileID: 0,
        identityResolved: true,
        objectResolved: true,
        sourceReference: meshReference,
      },
      materials: [],
    }],
    rendererAssetEvidenceComplete: true,
    monoBehaviours: [{
      componentIdentity: { serializedFile: 'CAB-fx', pathId: '104', type: 'MonoBehaviour' },
      gameObjectIdentity: { serializedFile: 'CAB-fx', pathId: '101', name: 'Fx' },
      scriptPPtr: {
        fileID: 1,
        serializedFile: scriptReference.serializedFile,
        pathId: scriptReference.objectId,
        externalGuid: '0'.repeat(32),
        identityResolved: true,
        objectResolved: false,
        resolution: 'external-identity-only',
      },
      serializedFieldNames: ['LifeMode', 'ParentIndex', 'TimerTypeDuration'],
      serializedFieldPPtrs: [],
    }],
    approvedMonoScriptReferences: [scriptReference],
    monoScriptPolicyComplete: true,
    targetGraphPolicyVersion: 'chibi-particle-only-instantiate-fx-v1',
    targetGraphEligible: true,
    targetGraphEvidence: [
      `exact FX target source reference ${targetReference.bundleSha256}:${targetReference.serializedFile}:${targetReference.objectId}`,
      'complete Transform traversal covered 1 GameObjects',
      'all target graph renderers are ParticleSystemRenderer components',
      'every ParticleSystemRenderer mesh/material PPtr is recorded',
      'all serialized MonoBehaviour field schemas match the pinned source census',
    ],
    particleComponentTypes: ['ParticleSystemRenderer'],
    coreComponentTypes: [],
    unknownComponentTypes: ['MonoBehaviour'],
    reasons: [],
  }
  return {
    clip: 'Example_Cafe_Idle',
    time: 0.5,
    function: 'AniEvt_InstantiateFx',
    string: '',
    float: 0,
    int: 0,
    sourceClipReference: reference(hash('3'), 'CAB-animation', '501'),
    target: { file: targetReference.serializedFile, pathId: targetReference.objectId, externalGuid: '0'.repeat(32) },
    fxTargetReference: targetReference,
    fxTargetEvidence,
    fxTargetResolution: { status: 'resolved', reason: 'exact source PPtr', candidateCount: 1 },
  }
}

function makeUiPresentationFxOverlapFixture() {
  const fixture = makeCandidate('ch0169', ['CH0169_Body'])
  const background = addPolicyRenderer(fixture, {
    name: 'BG_White (1)',
    hierarchyPath: 'Cafe_CH0169/EX_Root/CH0169_Exs_Cutin_Cam/Camera001/BG_White (1)',
    materialName: 'FX_MAT_4PXWhite_1_add',
    shaderName: 'DSFX/FX_SHADER_Additive_0',
    mesh: { file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID },
  })
  background.renderer.gameObjectActive = false
  background.renderer.visible = false

  const clip = 'CH0169_Cafe_Reaction'
  fixture.candidate.clips.push(clip)
  const event = makeFxInstantiationEvent()
  event.function = 'InstantiateFx'
  event.clip = clip
  event.time = 0
  event.fxTargetEvidence!.rendererAssets[0].mesh = {
    pointer: {
      file: UNITY_BUILTIN_RESOURCES_FILE,
      pathId: UNITY_BUILTIN_QUAD_PATH_ID,
      externalGuid: UNITY_BUILTIN_RESOURCES_GUID,
    },
    fileID: 8,
    identityResolved: true,
    objectResolved: false,
    sourceReference: null,
  }
  fixture.candidate.events = [event]

  const interaction = emptyChibiProfile('Ui')
  interaction.initialPose = clip
  return { ...fixture, background, event, interaction }
}

function makeSenaCoreGeometryFixture(identity = 'unrelated-source-identity') {
  const fixture = makeCandidate(identity, ['CH0081_Body', 'CH0081_Face', 'CH0081_Eyebrow', 'CH0081_EyeMouth', 'CH0081_Hair'])
  const prefabPath = 'Assets/_MX/AddressableAsset/Character/CH0081/Cafe/Cafe_CH0081.prefab'
  const assembly = fixture.candidate.assembly![0]
  const renderer = assembly.renderers[0]
  const prefabReference = reference(
    'dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d',
    'CAB-241dbfc78955d74e6aa6ee05bb096ecf',
    '-8585771901269975806',
  )
  const rendererReference = reference(
    'dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d',
    'CAB-241dbfc78955d74e6aa6ee05bb096ecf',
    '-6903816935868408574',
  )
  const meshReference = reference(
    '12145f231b3c8b093c728296b771f4ae89a1fdd9e98f3afc915668fcd77591c5',
    'CAB-74b254d25a0b77afb604cb26c86ff7a2',
    '8052939068824350260',
  )
  const materialReferences = [
    reference('5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', '4325420936880560113'),
    reference('5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', '2295227601622239349'),
    reference('5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', '7037462322176008259'),
    reference('5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', '-6701897569863049292'),
    reference('5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', '-1296136910868312838'),
  ]
  assembly.root = 'Cafe_CH0081'
  assembly.prefabPath = prefabPath
  assembly.prefabReference = prefabReference
  assembly.prefabTarget = { file: prefabReference.serializedFile, pathId: prefabReference.objectId }
  assembly.rendererOrder = ['CH0081_Body']
  renderer.name = 'CH0081_Body'
  renderer.pathId = rendererReference.objectId
  renderer.sourceReference = rendererReference
  renderer.hierarchyPath = 'Cafe_CH0081/CH0081_Body'
  renderer.rendererType = 'SkinnedMeshRenderer'
  renderer.mesh = { file: meshReference.serializedFile, pathId: meshReference.objectId }
  renderer.meshSourceReference = meshReference
  renderer.materialSlots = materialReferences.map((materialReference, slot) => {
    const material = fixture.candidate.sourceMaterials![slot]
    material.sourceReference = materialReference
    material.file = materialReference.serializedFile
    material.pathId = materialReference.objectId
    return {
      slot,
      material: { file: materialReference.serializedFile, pathId: materialReference.objectId },
      sourceMaterialReference: materialReference,
    }
  })
  fixture.candidate.prefabPaths = [prefabPath]
  return { ...fixture, prefabPath }
}

function addPolicyRenderer(fixture: ReturnType<typeof makeCandidate>, options: {
  name: string
  hierarchyPath: string
  shaderName?: string
  materialName?: string
  mesh?: InventoryAssemblyRenderer['mesh']
  rendererType?: string
  sourceReference?: InventorySourceReference
  equipmentReference?: boolean
}) {
  const assembly = fixture.candidate.assembly![0]
  const baseRenderer = assembly.renderers[0]
  const sourceReference = options.sourceReference ?? reference(hash('g'), 'CAB-policy-prefab', String(600000 + assembly.renderers.length))
  const materialReference = reference(hash('h'), 'CAB-policy-materials', String(700 + assembly.renderers.length))
  const shaderReference = reference(hash('i'), 'CAB-policy-shaders', String(800 + assembly.renderers.length))
  const sourceMaterial = structuredClone(fixture.candidate.sourceMaterials![0])
  sourceMaterial.name = options.materialName ?? 'FX_MAT_Presentation'
  sourceMaterial.sourceReference = materialReference
  sourceMaterial.pathId = materialReference.objectId
  sourceMaterial.file = materialReference.serializedFile
  sourceMaterial.shaderReference = shaderReference
  sourceMaterial.shader = { file: shaderReference.serializedFile, pathId: shaderReference.objectId }
  sourceMaterial.shaderName = options.shaderName ?? 'DSFX/FX_SHADER_Unsupported'
  sourceMaterial.shaderParsedName = sourceMaterial.shaderName
  const sourceShader = structuredClone(fixture.candidate.shaders![0])
  sourceShader.name = sourceMaterial.shaderName!
  sourceShader.parsedName = sourceMaterial.shaderName!
  sourceShader.pathId = shaderReference.objectId
  sourceShader.file = shaderReference.serializedFile
  sourceShader.sourceReference = shaderReference
  sourceShader.programBlobSha256 = null
  fixture.candidate.sourceMaterials!.push(sourceMaterial)
  fixture.candidate.shaders!.push(sourceShader)
  const renderer = {
    ...structuredClone(baseRenderer),
    name: options.name,
    pathId: sourceReference.objectId,
    sourceReference,
    rendererType: options.rendererType ?? 'MeshRenderer',
    hierarchyPath: options.hierarchyPath,
    mesh: options.mesh ?? { file: 'CAB-policy-meshes', pathId: String(600 + assembly.renderers.length) },
    meshSourceReference: options.mesh ? null : reference(hash('j'), 'CAB-policy-meshes', String(600 + assembly.renderers.length)),
    materialSlots: [{
      slot: 0,
      material: { file: materialReference.serializedFile, pathId: materialReference.objectId },
      sourceMaterialReference: materialReference,
    }],
  }
  assembly.renderers.push(renderer)
  assembly.rendererOrder.push(renderer.name)
  if (options.equipmentReference) {
    const attachments = assembly.attachments as Record<string, unknown>
    attachments.equipmentRendererReferences = [sourceReference]
  }
  return { renderer, sourceReference }
}

const SAORI_CAB = '7ba7cca28f2476e9eb45e94fd2a1650a3283dad032cbb0b7935c4378a386ba8b'
const SAORI_CAB_FILE = 'CAB-cabd5b23b8e28f49693a21ea244a9291'
const SAORI_PREFAB = reference(SAORI_CAB, SAORI_CAB_FILE, '762141233893454283')
const SAORI_MESH_BUNDLE = '8dd6133bfa2e20b4367b71c7fcc724265bc9b24d0acb213a47e0759d7e6c040f'
const SAORI_MESH_FILE = 'CAB-9e80f5ab3212d8f6775176559faf5d5f'
const SAORI_MATERIAL = reference('785a3600756e5ede27609c590136bf727dae7a14727e2a2ccdbcf682860e7bf3', 'CAB-44ff3e38183570343e0de2bef251bb93', '-3549401849822603767')
const SAORI_SHADER = reference('08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c', 'CAB-428091522b4007f213bf16532c4528a1', '-301851123381183171')
const SAORI_ACTIONS = {
  idle: 'Saori_Original_Cafe_Idle',
  walk: 'Saori_Original_Cafe_Walk',
  pickup: 'Saori_Original_Formation_Pickup',
  touch: 'Saori_Original_Cafe_Reaction',
} as const

const SAORI_SWIM_CAB = '325bc4b3f67c1fe59260ca66cb5068d109c193dc4a662e77c8c2084f56063ffd'
const SAORI_SWIM_CAB_FILE = 'CAB-e9f5532a8838fb49b9656938014567f9'
const SAORI_SWIM_PREFAB = reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-966698776056933583')
const SAORI_SWIM_MESH_BUNDLE = 'b493920b164a41237b76ab169664d48fe555d6d643a2ce02ffcfe708a77967f1'
const SAORI_SWIM_MESH_FILE = 'CAB-fb6b24084a8dc8864efbed7e547be16d'
const SAORI_SWIM_MATERIAL_BUNDLE = '17fca11c00f7e6869df3fe4ffbd2ffa0185513ee45607a2a1e32978ac916a742'
const SAORI_SWIM_MATERIAL_FILE = 'CAB-fbd047797f16a6e5ae0e213d5ef5d0f1'
const SAORI_SWIM_WEAPON_MATERIAL = reference(SAORI_SWIM_MATERIAL_BUNDLE, SAORI_SWIM_MATERIAL_FILE, '-2288669407096532286')
const SAORI_SWIM_CANNON_MATERIAL = reference(SAORI_SWIM_MATERIAL_BUNDLE, SAORI_SWIM_MATERIAL_FILE, '4428875022469246219')
const SAORI_SWIM_SHADER = SAORI_SHADER
const SAORI_SWIM_ACTIONS = {
  idle: 'CH0266_Cafe_Idle',
  walk: 'CH0266_Cafe_Walk',
  pickup: 'CH0266_Formation_Pickup',
  touch: 'CH0266_Cafe_Reaction',
} as const

const PINNED_RIG_MOUNT_TEST_SOURCES = [
  {
    identity: 'ch0268', fingerprint: '48bf217d3b63f6e6d1ccfd4e6b9fcbc9a92ce0704d7c503701950c850690bcb9',
    prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0268/Cafe/Cafe_CH0268.prefab', root: 'Cafe_CH0268',
    prefab: {
      bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29',
      file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '4139133509352740713',
    },
    prefabEntry: { path: 'character-ch0268-_mxload-prefabs-2025-08-26_assets_all_1171610560.bundle', sha256: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29' },
    animationEntries: [{
      path: 'assets-_mx-characters-ch0268-_mxdependency-animationclips-2025-08-26_assets_all_145147970.bundle',
      sha256: 'b038e215617dd76a55035c08cd2bbc5bf72001ba237fb4f4ca894f11a8b16db1',
    }],
    actions: { idle: 'CH0268_Cafe_Idle', walk: 'CH0268_Cafe_Walk', pickup: 'CH0268_Formation_Pickup', touch: 'CH0268_Cafe_Reaction' },
    anchor: ['3815402648570287977', 'Bip001_Weapon'],
    mesh: { bundle: '71796e3ef4171b3c5239394ca1511f3ee2c6a9d3351588548eb42fe9ff006d44', file: 'CAB-a90cae2435de793c9dd66879a2dfbfd1' },
    material: { bundle: '0e361d6e7a75aaa8422c2ef72acdaace71e4f300a85bb353da363a5a37d30bc8', file: 'CAB-81605dd560065d47ae7631dd966e46db' },
    members: [
      {
        id: '-7191168882773665943', name: 'CH0268_Weapon', mesh: '-8462892462062640212', material: '-95615523722023342',
        transform: [['3135970795112421225', 'Cafe_CH0268'], ['7495110504455591785', 'CH0268_Weapon']],
        root: ['3815402648570287977', 'Bip001_Weapon'],
        ancestry: [['3135970795112421225', 'Cafe_CH0268'], ['-7118219027617032343', 'bone_root'], ['2944844707476920169', 'Bip001']],
        bones: [['3815402648570287977', 'Bip001_Weapon'], ['-8757116650605914263', 'bone_magazine'], ['-239699426375248023', 'bone_weapon_rope'], ['-2583516880457181335', 'bone_rocket01']],
      },
      {
        id: '-6506255981981018263', name: 'CH0268_Rocket_Outline', mesh: '8919917339668115670', material: '-575865430574389217',
        transform: [['3135970795112421225', 'Cafe_CH0268'], ['1616777015477262185', 'CH0268_Rocket_Outline']],
        root: ['3714180053520013161', 'bone_rocket02'],
        ancestry: [['3135970795112421225', 'Cafe_CH0268'], ['-7118219027617032343', 'bone_root'], ['2944844707476920169', 'Bip001'], ['3815402648570287977', 'Bip001_Weapon']],
        bones: [['3714180053520013161', 'bone_rocket02']],
      },
    ],
  },
  {
    identity: 'mari_original', fingerprint: 'c4532ac79bc6e4b80b4fa30eb8343b0ac825c4c74e74917562d106131805a71d',
    prefabPath: 'Assets/_MX/AddressableAsset/Character/Mari_Original/Cafe/Cafe_Mari_Original.prefab', root: 'Cafe_Mari_Original',
    prefab: {
      bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39',
      file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-8182624225047119105',
    },
    prefabEntry: { path: 'character-mari_original-_mxload-prefabs-2025-07-02_assets_all_1927846235.bundle', sha256: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39' },
    animationEntries: [
      { path: 'assets-_mx-characters-mari_original-_mxdependency-animationclips-2025-07-02_assets_all_26475616.bundle', sha256: '9130e7a09173db9d77ca220f61f103534b9a082a0dcaf04942d4456b6ba91eba' },
      { path: 'assets-_mx-characters-mari_original-_mxdependency-animationclips-2026-03-24_assets_all_1435312802.bundle', sha256: '651cccf7c56326a8d8598effb16d74b4c88ec8cd3c38340d9714b2aa07af948b' },
    ],
    actions: { idle: 'Mari_Original_Cafe_Idle', walk: 'Mari_Original_Cafe_Walk', pickup: 'Mari_Original_Formation_Pickup', touch: 'Mari_Original_Cafe_Reaction' },
    anchor: ['-1560163874218870017', 'Bip001_Weapon'],
    mesh: { bundle: '75229d629b11e47fb8e04f846bbb14d20c500341722b57506f824b5837167296', file: 'CAB-50d3010d87b873509b38ee51971c0c01' },
    material: { bundle: '14d5c2383244f0f3876d824b86094ee16bd3569d5f0943b26b70eb9f988cbfd6', file: 'CAB-8f9907cba03db2b5780c737273428334' },
    members: [
      {
        id: '3069063790598322943', name: 'Mari_Original_Weapon', mesh: '623757297599773649', material: '-5451212227849618331',
        transform: [['5177313602180381439', 'Cafe_Mari_Original'], ['5107976394332338943', 'Mari_Original_Weapon']],
        root: ['-1560163874218870017', 'Bip001_Weapon'],
        ancestry: [['5177313602180381439', 'Cafe_Mari_Original'], ['-8583119856686564609', 'bone_root'], ['-3529868761828459777', 'Bip001']],
        bones: [['-1560163874218870017', 'Bip001_Weapon'], ['-1469757343611847937', 'bone_weapon1_cos2'], ['-8600449184193217793', 'bone_weapon1_cos1']],
      },
      {
        id: '-269010879909496065', name: 'EX', mesh: '-3964046477843091', material: '-5451212227849618331',
        transform: [['5177313602180381439', 'Cafe_Mari_Original'], ['7214943900458711807', 'EX']],
        root: ['2930884764252928767', 'Bone_weapon2'],
        ancestry: [['5177313602180381439', 'Cafe_Mari_Original'], ['-8583119856686564609', 'bone_root'], ['-3529868761828459777', 'Bip001'], ['-1560163874218870017', 'Bip001_Weapon']],
        bones: [['2930884764252928767', 'Bone_weapon2'], ['-7258084021585151233', 'bone_weapon2_cos1'], ['-3384407438069957889', 'bone_weapon2_cos2']],
      },
    ],
  },
] as const

type SourcePinnedRigMountTestSource = typeof PINNED_RIG_MOUNT_TEST_SOURCES[number]

function makeSourcePinnedRigMountFixture(source: SourcePinnedRigMountTestSource) {
  const fixture = makeCandidate(source.identity, ['Policy_Body'])
  const { candidate } = fixture
  const assembly = candidate.assembly![0]
  const prefabReference = reference(source.prefab.bundle, source.prefab.file, source.prefab.id)
  const pointer = (id: string, name: string) => ({
    file: source.prefab.file,
    pathId: id,
    name,
    sourceReference: reference(source.prefab.bundle, source.prefab.file, id),
  })
  candidate.fingerprint = source.fingerprint
  candidate.prefabPaths = [source.prefabPath]
  candidate.clips = Object.values(source.actions)
  candidate.parts = [
    { archivePath: 'source.zip', archiveSha256: hash('1'), entryPath: source.prefabEntry.path, entrySize: 1, entryCrc32: '00000000', sha256: source.prefabEntry.sha256, family: 'prefab', revision: null, sourceKind: 'bundle' },
    ...source.animationEntries.map(entry => ({ archivePath: 'source.zip', archiveSha256: hash('1'), entryPath: entry.path, entrySize: 1, entryCrc32: '00000000', sha256: entry.sha256, family: 'animation', revision: null, sourceKind: 'bundle' as const })),
  ]
  assembly.root = source.root
  assembly.prefabPath = source.prefabPath
  assembly.prefabReference = prefabReference
  assembly.prefabTarget = { file: source.prefab.file, pathId: source.prefab.id }
  assembly.attachments = {}
  const baseRenderer = assembly.renderers[0]
  baseRenderer.hierarchyPath = `${source.root}/Policy_Body`
  baseRenderer.sourceReference = reference(source.prefab.bundle, source.prefab.file, '9000001')
  baseRenderer.pathId = baseRenderer.sourceReference.objectId
  const pinnedShader = SAORI_SHADER
  const memberRenderers = source.members.map(member => {
    const added = addPolicyRenderer(fixture, {
      name: member.name,
      hierarchyPath: `${source.root}/${member.name}`,
      materialName: `${member.name}_Material`,
      shaderName: 'MX/C-Weapon',
      rendererType: 'SkinnedMeshRenderer',
      sourceReference: reference(source.prefab.bundle, source.prefab.file, member.id),
    })
    const renderer = added.renderer
    const materialReference = reference(source.material.bundle, source.material.file, member.material)
    const material = candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === renderer.materialSlots![0]!.sourceMaterialReference?.objectId)!
    const shader = candidate.shaders!.find(item => item.sourceReference?.objectId === material.shaderReference?.objectId)!
    material.name = `${member.name}_Material`
    material.pathId = materialReference.objectId
    material.file = materialReference.serializedFile
    material.sourceReference = materialReference
    material.shader = { file: pinnedShader.serializedFile, pathId: pinnedShader.objectId }
    material.shaderReference = pinnedShader
    material.shaderName = 'MX/C-Weapon'
    material.shaderParsedName = 'MX/C-Weapon'
    material.textures = [{
      name: '_MainTex', texture: { file: 'CAB-pinned-textures', pathId: '990001' },
      textureReference: reference(hash('t'), 'CAB-pinned-textures', '990001'),
    }]
    renderer.materialSlots![0]!.material = { file: materialReference.serializedFile, pathId: materialReference.objectId }
    renderer.materialSlots![0]!.sourceMaterialReference = materialReference
    renderer.pathId = member.id
    renderer.sourceReference = reference(source.prefab.bundle, source.prefab.file, member.id)
    renderer.enabled = true
    renderer.gameObjectActive = true
    renderer.visible = true
    renderer.meshSourceReference = reference(source.mesh.bundle, source.mesh.file, member.mesh)
    renderer.mesh = { file: source.mesh.file, pathId: member.mesh }
    const toPointers = (values: readonly (readonly [string, string])[]) => values.map(([id, name]) => pointer(id, name))
    renderer.rootBone = pointer(member.root[0], member.root[1])
    renderer.transformChain = toPointers(member.transform)
    renderer.boneReferences = toPointers(member.bones)
    ;(renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = toPointers(member.ancestry)
    ;(renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true
    shader.name = 'MX/C-Weapon'
    shader.parsedName = 'MX/C-Weapon'
    shader.pathId = pinnedShader.objectId
    shader.file = pinnedShader.serializedFile
    shader.sourceReference = pinnedShader
    return renderer
  })
  const uniqueByReference = <T extends { sourceReference?: InventorySourceReference }>(items: T[]) => {
    const key = (sourceReference: InventorySourceReference | undefined) => sourceReference
      ? `${sourceReference.bundleSha256.toLowerCase()}:${sourceReference.serializedFile.toLowerCase()}:${sourceReference.objectId}`
      : ''
    return items.filter((item, index, all) => all.findIndex(other => key(other.sourceReference) === key(item.sourceReference)) === index)
  }
  candidate.sourceMaterials = uniqueByReference(candidate.sourceMaterials!)
  candidate.shaders = uniqueByReference(candidate.shaders!)
  assembly.rendererOrder = assembly.renderers.map(renderer => renderer.name)
  return { candidate, prefabPath: source.prefabPath, assembly, memberRenderers, source }
}

function sourcePinnedRigMountInteraction(source: SourcePinnedRigMountTestSource) {
  const profile = emptyChibiProfile(source.identity)
  profile.initialPose = source.actions.idle
  profile.interactions.idle = { state: 'available', clip: source.actions.idle, loop: true }
  profile.interactions.walk = { state: 'available', clip: source.actions.walk, loop: true }
  profile.interactions.pickup = { state: 'available', clip: source.actions.pickup, hold: true }
  profile.interactions.touch = { state: 'available', clip: source.actions.touch }
  return profile
}

function makeSaoriHandgunFixture() {
  const fixture = makeCandidate('saori_original', ['Policy_Body'])
  const { candidate, prefabPath } = fixture
  const assembly = candidate.assembly![0]
  candidate.fingerprint = 'e574e7726600205d3fdefca7d0a1571308a59dd7d835acbd7a8a65c7ffa7af18'
  candidate.clips = Object.values(SAORI_ACTIONS)
  assembly.root = 'Cafe_Saori_Original'
  assembly.prefabPath = prefabPath
  assembly.prefabReference = SAORI_PREFAB
  assembly.prefabTarget = { file: SAORI_CAB_FILE, pathId: SAORI_PREFAB.objectId }

  const sourcePointer = (objectId: string, name: string) => ({
    file: SAORI_CAB_FILE,
    pathId: objectId,
    name,
    sourceReference: reference(SAORI_CAB, SAORI_CAB_FILE, objectId),
  })
  const cafeRoot = sourcePointer('4595875760711446987', 'Cafe_Saori_Original')
  const boneRoot = sourcePointer('1676013754709553611', 'bone_root')
  const bip001 = sourcePointer('5407838024976937419', 'Bip001')
  const ancestry = [cafeRoot, boneRoot, bip001]
  const setExactWeaponMaterial = (renderer: InventoryAssemblyRenderer, name: string) => {
    const previousMaterialReference = renderer.materialSlots![0]?.sourceMaterialReference
    const material = candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === previousMaterialReference?.objectId)!
    const previousShaderReference = material.shaderReference
    const shader = candidate.shaders!.find(item => item.sourceReference?.objectId === previousShaderReference?.objectId)!
    material.name = name
    material.sourceReference = SAORI_MATERIAL
    material.file = SAORI_MATERIAL.serializedFile
    material.pathId = SAORI_MATERIAL.objectId
    material.shaderReference = SAORI_SHADER
    material.shader = { file: SAORI_SHADER.serializedFile, pathId: SAORI_SHADER.objectId }
    material.shaderName = 'MX/C-Weapon'
    material.shaderParsedName = 'MX/C-Weapon'
    shader.name = 'MX/C-Weapon'
    shader.parsedName = 'MX/C-Weapon'
    shader.file = SAORI_SHADER.serializedFile
    shader.pathId = SAORI_SHADER.objectId
    shader.sourceReference = SAORI_SHADER
    renderer.materialSlots![0]!.material = { file: SAORI_MATERIAL.serializedFile, pathId: SAORI_MATERIAL.objectId }
    renderer.materialSlots![0]!.sourceMaterialReference = SAORI_MATERIAL
  }

  const primary = addPolicyRenderer(fixture, {
    name: 'Saori_Original_Weapon',
    hierarchyPath: 'Cafe_Saori_Original/Saori_Original_Weapon',
    materialName: 'Saori_Original_Weapon_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(SAORI_CAB, SAORI_CAB_FILE, '7518749120114766283'),
  })
  setExactWeaponMaterial(primary.renderer, 'Saori_Original_Weapon_Material')
  primary.renderer.enabled = true
  primary.renderer.gameObjectActive = true
  primary.renderer.visible = true
  primary.renderer.meshSourceReference = reference(SAORI_MESH_BUNDLE, SAORI_MESH_FILE, '-3011508986878861753')
  primary.renderer.mesh = { file: SAORI_MESH_FILE, pathId: '-3011508986878861753' }
  primary.renderer.rootBone = sourcePointer('2914297892506939851', 'Bip001_Weapon')
  primary.renderer.transformChain = [cafeRoot, sourcePointer('4050732926595609035', 'Saori_Original_Weapon')]
  primary.renderer.boneReferences = [
    primary.renderer.rootBone,
    sourcePointer('-7141742032385691189', 'bone_magazine'),
    sourcePointer('-6946566419896684085', 'bone_buttstock'),
  ]
  ;(primary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = ancestry
  ;(primary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true

  const handgun = addPolicyRenderer(fixture, {
    name: 'Saori_Original_Handgun',
    hierarchyPath: 'Cafe_Saori_Original/Saori_Original_Handgun',
    materialName: 'Saori_Original_Handgun_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(SAORI_CAB, SAORI_CAB_FILE, '6419381600630976971'),
  })
  setExactWeaponMaterial(handgun.renderer, 'Saori_Original_Handgun_Material')
  handgun.renderer.enabled = true
  handgun.renderer.gameObjectActive = true
  handgun.renderer.visible = true
  handgun.renderer.meshSourceReference = reference(SAORI_MESH_BUNDLE, SAORI_MESH_FILE, '-5266263958877296907')
  handgun.renderer.mesh = { file: SAORI_MESH_FILE, pathId: '-5266263958877296907' }
  handgun.renderer.rootBone = sourcePointer('-4468891664348106293', 'bone_Weapon')
  handgun.renderer.transformChain = [cafeRoot, sourcePointer('4359557592397165003', 'Saori_Original_Handgun')]
  handgun.renderer.boneReferences = [
    handgun.renderer.rootBone,
    sourcePointer('-1446589435792870965', 'bone_magazine_02'),
  ]
  ;(handgun.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = ancestry
  ;(handgun.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true
  return { ...fixture, primary, handgun }
}

function makeSaoriSwimsuitFixture() {
  const fixture = makeCandidate('ch0266', ['Policy_Body'])
  const { candidate, prefabPath } = fixture
  const assembly = candidate.assembly![0]
  const exactPrefabPath = 'Assets/_MX/AddressableAsset/Character/CH0266/Cafe/Cafe_CH0266.prefab'
  const originalBodyMaterial = candidate.sourceMaterials![0]
  const originalBodyShader = candidate.shaders![0]
  candidate.fingerprint = 'c2dda9fce74ba470a510e0cdab930844eff876ad62150254bcf3cefdfb495db9'
  candidate.prefabPaths = [exactPrefabPath]
  candidate.parts = [
    {
      archivePath: 'FullPatch_028.zip', archiveSha256: hash('1'),
      entryPath: 'character-ch0266-_mxload-prefabs-2025-07-02_assets_all_730862125.bundle',
      entrySize: 1, entryCrc32: '00000000', sha256: SAORI_SWIM_CAB, family: 'prefab', revision: null, sourceKind: 'bundle',
    },
    {
      archivePath: 'FullPatch_028.zip', archiveSha256: hash('1'),
      entryPath: 'assets-_mx-characters-ch0266-_mxdependency-animationclips-2025-07-02_assets_all_4116423300.bundle',
      entrySize: 1, entryCrc32: '00000000', sha256: '7981a3a87b7b87124d78faffe882068410096b18526e70f451613964ab504c6e',
      family: 'animation', revision: null, sourceKind: 'bundle',
    },
  ]
  candidate.clips = Object.values(SAORI_SWIM_ACTIONS)
  assembly.root = 'Cafe_CH0266'
  assembly.prefabPath = exactPrefabPath
  assembly.prefabReference = SAORI_SWIM_PREFAB
  assembly.prefabTarget = { file: SAORI_SWIM_CAB_FILE, pathId: SAORI_SWIM_PREFAB.objectId }
  const sourcePointer = (objectId: string, name: string) => ({
    file: SAORI_SWIM_CAB_FILE, pathId: objectId, name,
  })
  const cafeRoot = sourcePointer('-4935885727765736655', 'Cafe_CH0266')
  const boneRoot = sourcePointer('-3331984808089726159', 'bone_root')
  const bip001 = sourcePointer('-2444008407112264911', 'Bip001')
  const ancestry = [cafeRoot, boneRoot, bip001]
  const setExactMaterial = (renderer: InventoryAssemblyRenderer, expected: InventorySourceReference, name: string) => {
    const slot = renderer.materialSlots![0]!
    const oldMaterial = candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === slot.sourceMaterialReference?.objectId)!
    const oldShader = candidate.shaders!.find(item => item.sourceReference?.objectId === oldMaterial.shaderReference?.objectId)!
    oldMaterial.name = name
    oldMaterial.sourceReference = expected
    oldMaterial.pathId = expected.objectId
    oldMaterial.file = expected.serializedFile
    oldMaterial.shaderReference = SAORI_SWIM_SHADER
    oldMaterial.shader = { file: SAORI_SWIM_SHADER.serializedFile, pathId: SAORI_SWIM_SHADER.objectId }
    oldMaterial.shaderName = ''
    oldMaterial.shaderParsedName = 'MX/C-Weapon'
    oldShader.name = ''
    oldShader.parsedName = 'MX/C-Weapon'
    oldShader.sourceReference = SAORI_SWIM_SHADER
    oldShader.pathId = SAORI_SWIM_SHADER.objectId
    oldShader.file = SAORI_SWIM_SHADER.serializedFile
    slot.material = { file: expected.serializedFile, pathId: expected.objectId }
    slot.sourceMaterialReference = expected
  }
  const addRenderer = (config: {
      name: string; objectId: string; meshId: string; material: InventorySourceReference; materialName: string
    objectIdForTransform: string; rootBone: { id: string; name: string }
    ancestry: typeof ancestry; bones: { id: string; name: string }[]
  }) => {
    const added = addPolicyRenderer(fixture, {
      name: config.name,
      hierarchyPath: `Cafe_CH0266/${config.name}`,
      materialName: config.materialName,
      shaderName: 'MX/C-Weapon',
      rendererType: 'SkinnedMeshRenderer',
      sourceReference: reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, config.objectId),
    })
    setExactMaterial(added.renderer, config.material, config.materialName)
    added.renderer.enabled = true
    added.renderer.gameObjectActive = true
    added.renderer.visible = true
    added.renderer.meshSourceReference = reference(SAORI_SWIM_MESH_BUNDLE, SAORI_SWIM_MESH_FILE, config.meshId)
    added.renderer.mesh = { file: SAORI_SWIM_MESH_FILE, pathId: config.meshId }
    added.renderer.rootBone = sourcePointer(config.rootBone.id, config.rootBone.name)
    added.renderer.transformChain = [cafeRoot, sourcePointer(config.objectIdForTransform, config.name)]
    added.renderer.boneReferences = config.bones.map(bone => sourcePointer(bone.id, bone.name))
    ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = config.ancestry
    ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true
    return added
  }

  const primary = addRenderer({
    name: 'Saori_Original_Weapon', objectId: '-7932837843349318863', meshId: '3018830693475326235',
    material: SAORI_SWIM_WEAPON_MATERIAL, materialName: 'CH0266_Weapon',
    objectIdForTransform: '8608833642075542321', rootBone: { id: '5129663882940535601', name: 'Bip001_Weapon' },
    ancestry, bones: [
      { id: '5129663882940535601', name: 'Bip001_Weapon' },
      { id: '-4925961543699705039', name: 'bone_magazine' },
      { id: '-4529970774892129487', name: 'bone_buttstock' },
      { id: '-2098089945093549263', name: 'bone_magazine_01' },
    ],
  })
  const handgun = addRenderer({
    name: 'Saori_Original_Handgun', objectId: '-4763531541672078543', meshId: '-7008905148608425358',
    material: SAORI_SWIM_WEAPON_MATERIAL, materialName: 'CH0266_Weapon',
    objectIdForTransform: '5832696454154441521', rootBone: { id: '5850243916819223345', name: 'bone_Weapon' },
    ancestry,
    bones: [
      { id: '5850243916819223345', name: 'bone_Weapon' },
      { id: '7297958013507949361', name: 'bone_magazine_02' },
      { id: '2629695361642615601', name: 'bone_magazine_03' },
    ],
  })
  const waterCannon = addRenderer({
    name: 'CH0266_WaterCannon_Outline', objectId: '-1127309643643137231', meshId: '-4114086136464228496',
    material: SAORI_SWIM_CANNON_MATERIAL, materialName: 'CH0266_WaterCannon',
    objectIdForTransform: '-1686778725144767695', rootBone: { id: '-8012569600188132559', name: 'bone_Watercannon' },
    ancestry: [cafeRoot, boneRoot],
    bones: [{ id: '-8012569600188132559', name: 'bone_Watercannon' }],
  })
  // The fixture reflects the one exact weapon material and shared weapon
  // shader observed in the source bundles; deduplicate their serialized refs.
  const sourceReferenceKey = (item: InventorySourceReference | null | undefined) => item
    ? `${item.bundleSha256.toLowerCase()}:${item.serializedFile.toLowerCase()}:${item.objectId}` : ''
  candidate.sourceMaterials = [originalBodyMaterial, ...candidate.sourceMaterials!.slice(1)]
    .filter((item, index, all) => all.findIndex(other => sourceReferenceKey(other.sourceReference) === sourceReferenceKey(item.sourceReference)) === index)
  candidate.shaders = [originalBodyShader, ...candidate.shaders!.slice(1)]
    .filter((item, index, all) => all.findIndex(other => sourceReferenceKey(other.sourceReference) === sourceReferenceKey(item.sourceReference)) === index)
  assembly.attachments = {
    mainWeapon: [sourcePointer('5129663882940535601', 'Bip001_Weapon')],
    equipmentRendererReferences: [reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-7932837843349318863')],
  }
  return { ...fixture, primary, handgun, waterCannon, prefabPath: exactPrefabPath }
}

function makeExactAnimatedPropFixture(identity: string, propName: string, materialName: string, boneName: string, parentBoneNames: string[] = []) {
  const fixture = makeCandidate(identity, ['Policy_Body'])
  const assembly = fixture.candidate.assembly![0]
  const prefabReference = assembly.prefabReference!
  const pointer = (objectId: string, name: string) => ({
    file: 'CAB-prefab', pathId: objectId, name,
    sourceReference: reference(hash('a'), 'CAB-prefab', objectId),
  })
  const rootPointer = {
    file: prefabReference.serializedFile, pathId: prefabReference.objectId, name: assembly.root,
    sourceReference: prefabReference,
  }
  const primary = addPolicyRenderer(fixture, {
    name: `${identity}_Weapon`, hierarchyPath: `${assembly.root}/${identity}_Weapon`,
    materialName: `${identity}_Weapon_Material`, shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', `${identity}-main-renderer`), equipmentReference: true,
  })
  const mainBone = pointer(`${identity}-main-bone`, 'Bip001_Weapon')
  primary.renderer.rootBone = mainBone
  primary.renderer.boneReferences = [mainBone]
  ;(primary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [rootPointer]
  ;(primary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true
  primary.renderer.transformChain = [rootPointer, pointer(`${identity}-main-transform`, primary.renderer.name)]
  const prop = addPolicyRenderer(fixture, {
    name: propName, hierarchyPath: `${assembly.root}/${propName}`,
    materialName, shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', `${identity}-prop-renderer`),
  })
  const propBone = pointer(`${identity}-prop-bone`, boneName)
  prop.renderer.rootBone = propBone
  prop.renderer.boneReferences = [propBone]
  ;(prop.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [rootPointer, ...parentBoneNames.map((name, index) => pointer(`${identity}-parent-${index}`, name))]
  ;(prop.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true
  prop.renderer.transformChain = [rootPointer, pointer(`${identity}-prop-transform`, prop.renderer.name)]
  const attachments = assembly.attachments as Record<string, unknown>
  attachments.mainWeapon = [mainBone]
  return { fixture, primary, prop }
}

function addStructuralEquipmentRenderer(fixture: ReturnType<typeof makeCandidate>, options: {
  name?: string
  rootBranch?: string
  sourceReference?: InventorySourceReference
} = {}) {
  const assembly = fixture.candidate.assembly![0]
  const rootBranch = options.rootBranch ?? 'bone_root/Bip001/Bip001_Weapon'
  const name = options.name ?? 'Maki_Original_Weapon'
  const sourceReference = options.sourceReference ?? reference(hash('a'), 'CAB-prefab', String(600001 + assembly.renderers.length))
  const added = addPolicyRenderer(fixture, {
    name,
    hierarchyPath: `${assembly.root}/${rootBranch}/${name}`,
    materialName: `${name}_Material`,
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference,
  })
  const pointer = (pathId: string, pointerName: string) => ({ file: 'CAB-prefab', pathId, name: pointerName })
  const chain = [
    pointer('1', assembly.root),
    ...rootBranch.split('/').map((item, index) => pointer(String(2 + index), item)),
    pointer('20', name),
  ]
  const anchor = chain[chain.length - 2]
  added.renderer.rootBone = anchor
  added.renderer.transformChain = chain
  added.renderer.boneReferences = [anchor]
  const body = assembly.renderers[0]
  body.boneReferences = []
  return { ...added, anchor, body }
}

/**
 * Hoshino Armed-shaped source fixture: the shield renderer has no authored
 * attachment constraint, but its serialized m_Bones list shares three exact
 * bullet pointers with the renderer selected by mainWeapon and retains local
 * shield bones.  The helper also supports the fail-closed mutations below.
 */
function addSharedBoneShieldRenderers(fixture: ReturnType<typeof makeCandidate>, options: {
  sharedCount?: number
  crossPrefabShared?: boolean
  bodyOverlap?: boolean
  competingRenderer?: boolean
} = {}) {
  const assembly = fixture.candidate.assembly![0]
  const pointer = (pathId: string, name: string, file = 'CAB-prefab') => ({ file, pathId, name })
  const root = pointer('root', assembly.root)
  const sharedBones = [
    pointer('bullet-004', 'bone_Bullet004'),
    pointer('bullet-01', 'bone_Bullet01'),
    pointer('bullet-02', 'bone_Bullet02'),
  ]
  if (options.crossPrefabShared) sharedBones[1] = pointer('bullet-01', 'bone_Bullet01', 'CAB-other-prefab')
  const weapon = addPolicyRenderer(fixture, {
    name: 'CH0258_Weapon',
    hierarchyPath: `${assembly.root}/CH0258_Weapon`,
    materialName: 'CH0258_Weapon_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
  })
  const weaponRoot = pointer('weapon-root', 'Bip001_Weapon')
  weapon.renderer.rootBone = weaponRoot
  weapon.renderer.transformChain = [root, weaponRoot, pointer('weapon-renderer', weapon.renderer.name)]
  weapon.renderer.boneReferences = [weaponRoot, ...sharedBones, pointer('weapon-local', 'bone_Weapon_Local')]

  const shield = addPolicyRenderer(fixture, {
    name: 'CH0258_Shield_Weapon',
    hierarchyPath: `${assembly.root}/CH0258_Shield_Weapon`,
    materialName: 'CH0258_Shield_Weapon_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
  })
  const shieldRoot = pointer('shield-root', 'bone_Shield_00')
  const sharedCount = options.sharedCount ?? sharedBones.length
  shield.renderer.rootBone = shieldRoot
  shield.renderer.transformChain = [root, shieldRoot, pointer('shield-renderer', shield.renderer.name)]
  shield.renderer.boneReferences = [shieldRoot, ...sharedBones.slice(0, sharedCount),
    pointer('shield-local', 'bone_Shield_T_Motionbone_00'), pointer('pistol-local', 'bone_Pistol_00')]

  assembly.attachments.mainWeapon = [weaponRoot]
  const body = assembly.renderers[0]
  body.boneReferences = options.bodyOverlap ? [{ ...sharedBones[0] }] : []

  let competing: ReturnType<typeof addPolicyRenderer> | null = null
  if (options.competingRenderer) {
    competing = addPolicyRenderer(fixture, {
      name: 'CH0258_Shield_Accessory',
      hierarchyPath: `${assembly.root}/CH0258_Shield_Accessory`,
      materialName: 'CH0258_Shield_Accessory_Material',
      shaderName: 'MX/C-Weapon',
      rendererType: 'SkinnedMeshRenderer',
      sourceReference: reference(hash('a'), 'CAB-prefab', '600003'),
    })
    competing.renderer.rootBone = pointer('accessory-root', 'bone_Shield_Accessory')
    competing.renderer.transformChain = [root, competing.renderer.rootBone, pointer('accessory-renderer', competing.renderer.name)]
    competing.renderer.boneReferences = [competing.renderer.rootBone, ...sharedBones, pointer('accessory-local', 'bone_Shield_Accessory_Local')]
  }
  return { weapon, shield, competing, sharedBones }
}

function shapeBip001WeaponAnchor(
  fixture: ReturnType<typeof makeCandidate>,
  added: ReturnType<typeof addStructuralEquipmentRenderer>,
  rootBoneName: string,
) {
  const assembly = fixture.candidate.assembly![0]
  const pointer = (pathId: string, name: string) => ({ file: 'CAB-prefab', pathId, name })
  const rootBone = pointer('root-bone', rootBoneName)
  const anchor = pointer('bip001-weapon', 'Bip001_Weapon')
  added.renderer.hierarchyPath = `${assembly.root}/${added.renderer.name}`
  added.renderer.rootBone = rootBone
  added.renderer.transformChain = [pointer('root', assembly.root), pointer('renderer', added.renderer.name)]
  added.renderer.boneReferences = [anchor]
  added.body.boneReferences = []
  return { rootBone, anchor }
}

const eStandardPassFixtures = [
  {
    key: 'forwardStatic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 160, parameterBlobIndex: 0,
    parameterRecordSha256: MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256, programHash: MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256, programDataLength: 7132, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: MX_E_STANDARD_FORWARD_STATIC_UNIFORMS,
  },
  {
    key: 'forwardDynamic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 171, parameterBlobIndex: 4,
    parameterRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, programHash: MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, programDataLength: 8112, keywordIndices: [19], keywordNames: ['_DYNAMIC_LIGHTS'],
    attributes: MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS,
  },
  {
    key: 'shadow', stateName: 'ShadowCaster', passName: '', passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312,
    parameterRecordSha256: MX_E_STANDARD_SHADOW_PARAMETER_SHA256, programHash: MX_E_STANDARD_SHADOW_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_SHADOW_RECORD_SHA256, programDataLength: 4273, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: MX_E_STANDARD_SHADOW_ATTRIBUTES, uniforms: MX_E_STANDARD_SHADOW_UNIFORMS,
  },
  {
    key: 'depth', stateName: 'DepthOnly', passName: '', passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320,
    parameterRecordSha256: MX_E_STANDARD_DEPTH_PARAMETER_SHA256, programHash: MX_E_STANDARD_DEPTH_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_DEPTH_RECORD_SHA256, programDataLength: 2766, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: MX_E_STANDARD_DEPTH_ATTRIBUTES, uniforms: MX_E_STANDARD_DEPTH_UNIFORMS,
  },
  {
    key: 'meta', stateName: 'Meta', passName: '', passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328,
    parameterRecordSha256: MX_E_STANDARD_META_PARAMETER_SHA256, programHash: MX_E_STANDARD_META_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_META_RECORD_SHA256, programDataLength: 6928, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: MX_E_STANDARD_META_ATTRIBUTES, uniforms: MX_E_STANDARD_META_UNIFORMS,
  },
] as const

function makeEStandardCandidate(activeVariant: 'static' | 'dynamic' = 'dynamic') {
  const fixture = makeCandidate('e_standard_fixture', ['EStandard_Material'])
  const material = fixture.candidate.sourceMaterials![0]
  const shader = fixture.candidate.shaders![0]
  const mainReference = reference(hash('f'), 'CAB-e-standard-textures', '300')
  material.shaderName = MX_E_STANDARD_SHADER_NAME
  material.shaderParsedName = MX_E_STANDARD_SHADER_NAME
  material.shaderReference = structuredClone(MX_E_STANDARD_SOURCE_REFERENCE)
  material.shader = { file: MX_E_STANDARD_SOURCE_REFERENCE.serializedFile, pathId: MX_E_STANDARD_SOURCE_REFERENCE.objectId }
  material.renderQueue = 2000
  material.keywords = activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS', '_SPECULAR_SETUP'] : ['_SPECULAR_SETUP']
  material.floatProperties = {
    _Cutoff: 0.5, _SrcBlend: 1, _DstBlend: 0, _SrcBlendAlpha: 1, _DstBlendAlpha: 0, _ZWrite: 1, _Cull: 2,
    _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ReflectBaseAmount: 0, _ReflectAnglePower: 2, _ShadowAttenRefl: 0,
    _ReflectStrength: 0, _EmissionStrength: 0, _SpecPower: 1, _ShadowAttenSpec: 0.2, _LightmapStrength: 1,
  }
  material.intProperties = {}
  material.colorProperties = {
    _Color: { r: 1, g: 1, b: 1, a: 1 }, _SpecLightDir: { r: 0, g: 0, b: 1, a: 0 },
    _SpecLightColor: { r: 1, g: 1, b: 1, a: 1 }, _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 },
    _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 }, _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 },
  }
  material.textures = [
    { name: '_EmissionTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
    { name: '_MainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference },
    { name: '_PrefabLightmapTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
    { name: '_ReflectTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
    { name: '_SpecTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
  ]
  material.resolvedTextures = [{
    property: '_MainTex', name: 'EStandard_MainTex', width: 512, height: 512, sourceReference: mainReference,
  }]
  shader.name = MX_E_STANDARD_SHADER_NAME
  shader.parsedName = MX_E_STANDARD_SHADER_NAME
  shader.sourceReference = structuredClone(MX_E_STANDARD_SOURCE_REFERENCE)
  shader.programBlobSha256 = MX_E_STANDARD_PROGRAM_BLOB_SHA256
  shader.properties = { m_Props: MX_E_STANDARD_REQUIRED_PROPERTIES.map(m_Name => ({ m_Name })) }
  const stateValue = (val: number, name: string) => ({ val, name })
  const sourcePassState = (stateName: string, colorMask: number) => {
    const forward = stateName === 'ForwardLit'
    const meta = stateName === 'Meta'
    const lightMode = stateName === 'ForwardLit' ? 'UniversalForward' : stateName === 'DepthOnly' ? 'DepthOnly' : stateName.toUpperCase()
    const property = (name: string, value: number, active: boolean) => stateValue(value, active ? name : '<noninit>')
    return {
      m_Name: stateName,
      rtBlend0: {
        srcBlend: property('_SrcBlend', forward ? 0 : 1, forward), destBlend: property('_DstBlend', 0, forward),
        srcBlendAlpha: property('_SrcBlendAlpha', forward ? 0 : 1, forward), destBlendAlpha: property('_DstBlendAlpha', 0, forward),
        blendOp: stateValue(0, '<noninit>'), blendOpAlpha: stateValue(0, '<noninit>'), colMask: stateValue(colorMask, '<noninit>'),
      },
      zWrite: property('_ZWrite', forward ? 0 : 1, forward), zTest: stateValue(4, '<noninit>'),
      culling: property('_Cull', 0, forward || !meta), offsetFactor: property('_ZOffsetFactor', 0, forward),
      offsetUnits: property('_ZOffsetUnits', 0, forward), lighting: false,
      m_Tags: { tags: [['IGNOREPROJECTOR', 'true'], ['LIGHTMODE', lightMode], ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque']] },
    }
  }
  shader.subShaders = [{ passes: [
    { type: 0, name: '', state: sourcePassState('ForwardLit', 15) },
    { type: 0, name: '', state: sourcePassState('ShadowCaster', 15) },
    { type: 0, name: '', state: sourcePassState('DepthOnly', 0) },
    { type: 0, name: '', state: sourcePassState('Meta', 15) },
  ] }]
  const sourceAttributeName = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
      : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1' : 'in_TEXCOORD2'
  const glsl = (attributes: readonly string[], uniforms: readonly string[]) => [
    '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 ${sourceAttributeName(attribute)};`),
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif', '#ifdef FRAGMENT',
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif',
  ].join('\n')
  const programs = eStandardPassFixtures.map(pass => ({
    kind: 'program' as const, blobIndex: pass.blobIndex, platform: 9, gpuProgramType: 4,
    programHash: pass.programHash, programDataSha256: pass.programHash, programDataLength: pass.programDataLength,
    recordSha256: pass.programRecordSha256, glsl: glsl(pass.attributes, pass.uniforms),
  }))
  shader.extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: MX_E_STANDARD_FINGERPRINT,
    compressedBlobSha256: MX_E_STANDARD_PROGRAM_BLOB_SHA256,
    shader: { name: MX_E_STANDARD_SHADER_NAME, sourceReference: structuredClone(MX_E_STANDARD_SOURCE_REFERENCE), keywordNames: [...MX_E_STANDARD_SHADER_KEYWORDS] },
    programs, gles3Programs: structuredClone(programs),
    bindings: eStandardPassFixtures.map(pass => ({
      subShaderIndex: 0, passIndex: pass.passIndex, passName: pass.passName, stateName: pass.stateName, stage: 'vertex',
      blobIndex: pass.blobIndex, parameterBlobIndex: pass.parameterBlobIndex, platform: 9, gpuProgramType: 4,
      keywordIndices: [...pass.keywordIndices], keywordNames: [...pass.keywordNames], programHash: pass.programHash,
      gles3ProgramHash: pass.programHash, programRecordSha256: pass.programRecordSha256, parameterRecordSha256: pass.parameterRecordSha256,
    })),
  }
  return fixture
}

function makeCustomShaderCandidate(rule: typeof CHIBI_CUSTOM_SHADER_ADAPTER_RULES[number]) {
  const fixture = makeCandidate('custom_shader_fixture', ['CustomShader_Material'])
  const material = fixture.candidate.sourceMaterials![0]
  const shader = fixture.candidate.shaders![0]
  material.shaderName = rule.identity
  material.shaderParsedName = rule.identity
  material.shaderReference = structuredClone(rule.sourceReference)
  shader.parsedName = rule.identity
  shader.sourceReference = structuredClone(rule.sourceReference)
  shader.programBlobSha256 = rule.programBlobSha256
  shader.properties = { m_Props: rule.requiredProperties.map(m_Name => ({ m_Name })) }
  shader.subShaders = [{ passes: rule.passSignature[0].states.map((states, index) => ({
    type: rule.passSignature[0].type,
    state: {
      srcBlend: { val: states.srcBlend ?? 1, name: '<fixture>' }, destBlend: { val: states.destBlend ?? 0, name: '<fixture>' },
      srcBlendAlpha: { val: 1, name: '<fixture>' }, destBlendAlpha: { val: 0, name: '<fixture>' },
      blendOp: { val: 0, name: '<fixture>' }, blendOpAlpha: { val: 0, name: '<fixture>' },
      zWrite: { val: states.zWrite ?? 1, name: '<fixture>' },
      zTest: { val: states.zTest ?? 4, name: '<fixture>' },
      culling: { val: states.culling ?? (index === 1 ? 1 : 0), name: '<fixture>' },
      offsetFactor: { val: 0, name: '<fixture>' }, offsetUnits: { val: 0, name: '<fixture>' },
    },
  })) }]
  if (rule.id === 'mx-c-transparent-st') {
    const mainReference = reference(hash('f'), 'CAB-textures', '300')
    const maskReference = reference(hash('f'), 'CAB-textures', '301')
    material.shader = { file: rule.sourceReference.serializedFile, pathId: rule.sourceReference.objectId }
    material.floatProperties = {
      _Cull: 0, _ZWrite: 0, _ZTest: 4, _Cutoff: 0.5, _MaskGSensitivity: 1, _MaskRtoG: 0,
      _SeeThroughMinValue: 0.5, _SeeThroughTransparency: 1, _SeeThroughSmoothness: 1, _ShadowThreshold: 0.5,
      _RimAreaMultiplier: 1, _RimStrength: 1, _AdditionalLightStrength: 1, _AdditionalLightSharpness: 5,
      _DitherThreshold: 0, _GrayBrightness: 1,
    }
    material.colorProperties = {
      _Tint: { r: 1, g: 1, b: 1, a: 1 }, _ShadowTint: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 }, _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 },
      _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 },
    }
    material.textures = [
      { name: '_MainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { name: '_MaskTex', texture: { file: maskReference.serializedFile, pathId: maskReference.objectId }, textureReference: maskReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ]
    material.resolvedTextures = [
      { property: '_MainTex', name: 'Main', width: 256, height: 256, sourceReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      { property: '_MaskTex', name: 'Mask', width: 256, height: 256, sourceReference: maskReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ]
    const source = (attributes: readonly string[], uniforms: readonly string[]) => [
      '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 in_${attribute === 'POSITION' ? 'POSITION0' : attribute === 'NORMAL' ? 'NORMAL0' : attribute === 'COLOR_0' ? 'COLOR0' : 'TEXCOORD0'};`),
      ...uniforms.map(uniform => `uniform float ${uniform};`), 'void main(){}', '#endif', '#ifdef FRAGMENT', ...uniforms.map(uniform => `uniform float ${uniform};`), 'void main(){}', '#endif',
    ].join('\n')
    const program = (blobIndex: number, programHash: string, glsl: string, recordSha256: string): InventoryShaderExtraction['gles3Programs'][number] => ({
      kind: 'program', blobIndex, platform: 9, gpuProgramType: 4, programHash, programDataSha256: programHash,
      programDataLength: 128, glsl, recordSha256,
    })
    const baseGlsl = source(MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS)
    const ditherGlsl = source(MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, MX_C_TRANSPARENT_ST_DITHER_UNIFORMS)
    const depthGlsl = source(MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS)
    const baseProgram = program(6, MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH, baseGlsl, MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256)
    const ditherProgram = program(8, MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH, ditherGlsl, MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256)
    const depthProgram = program(31, MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH, depthGlsl, MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256)
    const binding = (passIndex: number, stateName: 'ForwardLit' | '', blobIndex: number, programHash: string, programRecordSha256: string, parameterBlobIndex: number, parameterRecordSha256: string, keywordIndices: number[] = [], keywordNames: string[] = []) => ({
      subShaderIndex: 0, passIndex, stateName, stage: 'vertex', blobIndex, parameterBlobIndex, platform: 9, gpuProgramType: 4,
      keywordIndices, keywordNames, programHash, gles3ProgramHash: programHash, programRecordSha256, parameterRecordSha256,
    })
    shader.extraction = {
      schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3.27f1', fingerprint: MX_C_TRANSPARENT_ST_FINGERPRINT,
      compressedBlobSha256: MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256,
      shader: { name: 'MX/C-Transparent-ST', sourceReference: structuredClone(rule.sourceReference), keywordNames: ['_DITHER_HORIZONTAL_LINES'] },
      programs: [], gles3Programs: [baseProgram, ditherProgram, depthProgram],
      bindings: [
        binding(0, 'ForwardLit', 6, MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH, MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256, 0, MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256),
        binding(0, 'ForwardLit', 8, MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH, MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256, 1, MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256, [9], ['_DITHER_HORIZONTAL_LINES']),
        binding(1, '', 31, MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH, MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256, 30, MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256),
      ],
    }
    const transparentState = (srcBlend: number, destBlend: number, colorMask: number) => ({
      srcBlend: { val: srcBlend, name: '<fixture>' }, destBlend: { val: destBlend, name: '<fixture>' },
      srcBlendAlpha: { val: srcBlend === 5 ? 1 : 1, name: '<fixture>' }, destBlendAlpha: { val: destBlend === 10 ? 10 : 0, name: '<fixture>' },
      blendOp: { val: 0, name: '<fixture>' }, blendOpAlpha: { val: 0, name: '<fixture>' },
      colMask: { val: colorMask, name: '<fixture>' }, zWrite: { val: 0, name: '[_ZWrite]' },
      zTest: { val: 4, name: '<fixture>' }, culling: { val: 0, name: '[_Cull]' }, offsetFactor: { val: 0, name: '<fixture>' }, offsetUnits: { val: 0, name: '<fixture>' },
    })
    shader.subShaders = [{ passes: [
      { type: 0, state: transparentState(5, 10, 15) }, { type: 0, state: transparentState(1, 0, 0) },
    ] }]
    material.keywords = []
  } else if (rule.id === 'mx-unlit-outline') {
    const textureReference = reference(hash('f'), 'CAB-textures', '300')
    material.shader = { file: rule.sourceReference.serializedFile, pathId: rule.sourceReference.objectId }
    material.floatProperties = { ...material.floatProperties, _Cull: 0, _ZWrite: 1, _ZTest: 4, _OutlineZCorrection: 0 }
    material.colorProperties = {
      _Tint: { r: 1, g: 1, b: 1, a: 1 },
      _OutlineTint: { r: 0.2641509175300598, g: 0.2641509175300598, b: 0.2641509175300598, a: 1 },
    }
    material.textures = [{
      name: '_MainTex', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId }, textureReference,
      scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
    }]
    material.resolvedTextures = [{
      property: '_MainTex', name: 'CustomShader_MainTex', width: 256, height: 256,
      sourceReference: textureReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
    }]
    const baseGlsl = [
      '#version 300 es', '#ifdef VERTEX',
      'in highp vec4 in_POSITION0;', 'in highp vec2 in_TEXCOORD0;',
      'uniform vec4 _MainTex_ST;', 'uniform vec4 _Tint;', 'uniform sampler2D _MainTex;',
      '#endif', '#ifdef FRAGMENT', 'uniform vec2 _GlobalMipBias;', '#endif',
    ].join('\n')
    const outlineGlsl = [
      '#version 300 es', '#ifdef VERTEX',
      'in highp vec4 in_POSITION0;', 'in highp vec4 in_TANGENT0;', 'in mediump vec4 in_COLOR0;',
      'in highp vec2 in_TEXCOORD0;', 'uniform vec4 _MainTex_ST;', 'uniform float _OutlineZCorrection;',
      'uniform sampler2D _MainTex;', 'uniform vec4 _OutlineTint;', 'uniform vec4 _MainLightColor;',
      'uniform vec4 _ScreenParams;', 'uniform mat4 hlslcc_mtx4x4glstate_matrix_projection;',
      'uniform mat4 hlslcc_mtx4x4unity_MatrixInvV;', 'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;',
      '#endif', '#ifdef FRAGMENT', 'uniform sampler2D _MainTex;', 'uniform vec4 _OutlineTint;', '#endif',
    ].join('\n')
    const program = (blobIndex: number, programHash: string, glsl: string, recordSha256: string): InventoryShaderExtraction['gles3Programs'][number] => ({
      kind: 'program', blobIndex, platform: 9, gpuProgramType: 4, programHash, programDataSha256: programHash,
      programDataLength: 128, glsl, recordSha256,
    })
    const baseProgram = program(1, MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, baseGlsl, hash('1'))
    const outlineProgram = program(6, MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, outlineGlsl, hash('2'))
    const binding = (passIndex: number, stateName: 'ForwardLit' | 'Outline', blobIndex: number, programHash: string, programRecordSha256: string, parameterBlobIndex: number, parameterRecordSha256: string) => ({
      subShaderIndex: 0, passIndex, stateName, stage: 'vertex', blobIndex, parameterBlobIndex, platform: 9, gpuProgramType: 4,
      keywordIndices: [], keywordNames: [], programHash, gles3ProgramHash: programHash, programRecordSha256, parameterRecordSha256,
    })
    shader.extraction = {
      schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3.27f1', fingerprint: hash('9'),
      compressedBlobSha256: MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256,
      shader: { name: 'MX/Unlit Outline', sourceReference: structuredClone(rule.sourceReference), keywordNames: [] },
      programs: [], gles3Programs: [baseProgram, outlineProgram],
      bindings: [
        binding(0, 'ForwardLit', 1, MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, hash('1'), 0, hash('3')),
        binding(1, 'Outline', 6, MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, hash('2'), 4, hash('4')),
      ],
    }
  }
  return fixture
}

function makeGlitchTexCandidate() {
  const fixture = makeCandidate('glitch_tex_fixture', ['FX_MAT_Glitch_01'])
  const material = fixture.candidate.sourceMaterials![0]
  const shader = fixture.candidate.shaders![0]
  const noiseReference = reference('1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74', 'CAB-39fe55e8868aab69e2cf9a8ae5dcef67', '277634516359511144')
  material.shaderName = DSFX_GLITCH_TEX_SHADER_NAME
  material.shaderParsedName = DSFX_GLITCH_TEX_SHADER_NAME
  material.shaderReference = structuredClone(DSFX_GLITCH_TEX_SOURCE_REFERENCE)
  material.shader = { file: DSFX_GLITCH_TEX_SOURCE_REFERENCE.serializedFile, pathId: DSFX_GLITCH_TEX_SOURCE_REFERENCE.objectId }
  material.renderQueue = -1
  material.keywords = []
  material.floatProperties = { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 }
  material.intProperties = {}; material.colorProperties = {}
  material.textures = [
    { name: '_MainTex', texture: { file: material.file, pathId: '0' }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    { name: '_NoiseTex', texture: { file: noiseReference.serializedFile, pathId: noiseReference.objectId }, textureReference: structuredClone(noiseReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
  ]
  material.resolvedTextures = [{ property: '_NoiseTex', name: 'FX_TEX_Noise_16', width: 256, height: 256, sourceReference: structuredClone(noiseReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }]
  shader.name = DSFX_GLITCH_TEX_SHADER_NAME
  shader.parsedName = DSFX_GLITCH_TEX_SHADER_NAME
  shader.sourceReference = structuredClone(DSFX_GLITCH_TEX_SOURCE_REFERENCE)
  shader.programBlobSha256 = DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
  shader.properties = { m_Props: DSFX_GLITCH_TEX_REQUIRED_PROPERTIES.map(m_Name => ({ m_Name })) }
  const sourceGlsl = (shadow: boolean) => [
    '#version 300 es', '#ifdef VERTEX',
    'in highp vec4 in_POSITION0;', ...(shadow ? ['in highp vec3 in_NORMAL0;'] : ['in highp vec2 in_TEXCOORD0;']),
    ...(shadow ? DSFX_GLITCH_TEX_SHADOW_UNIFORMS : DSFX_GLITCH_TEX_FORWARD_UNIFORMS).map(uniform => `uniform vec4 ${uniform};`),
    '#endif', '#ifdef FRAGMENT', ...(shadow ? [] : ['uniform sampler2D _NoiseTex;', 'uniform sampler2D _MainTex;']), '#endif',
  ].join('\n')
  const pass = (shadow: boolean) => ({
    kind: 'program' as const, platform: 9, gpuProgramType: 4, blobIndex: shadow ? 3 : 1,
    programHash: shadow ? DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
    programDataSha256: shadow ? DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
    programDataLength: shadow ? DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH : DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH,
    recordSha256: shadow ? DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 : DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256,
    glsl: sourceGlsl(shadow),
  })
  const programs = [pass(false), pass(true)]
  shader.extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: DSFX_GLITCH_TEX_FINGERPRINT,
    compressedBlobSha256: DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256,
    shader: { name: DSFX_GLITCH_TEX_SHADER_NAME, sourceReference: structuredClone(DSFX_GLITCH_TEX_SOURCE_REFERENCE), keywordNames: [...DSFX_GLITCH_TEX_SHADER_KEYWORDS] },
    programs: structuredClone(programs), gles3Programs: structuredClone(programs),
    bindings: [false, true].map((shadow) => ({
      subShaderIndex: 0, passIndex: shadow ? 1 : 0, passName: '', stateName: shadow ? 'ShadowCaster' : 'Forward', stage: 'vertex',
      blobIndex: shadow ? 3 : 1, parameterBlobIndex: shadow ? 2 : 0, platform: 9, gpuProgramType: 4,
      keywordIndices: [], keywordNames: [], programHash: shadow ? DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
      gles3ProgramHash: shadow ? DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
      programRecordSha256: shadow ? DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 : DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256,
      parameterRecordSha256: shadow ? DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256 : DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256,
    })),
  } as any
  const sourceState = (name: string, shadow: boolean) => {
    const literal = (val: number, stateName = '<literal>') => ({ val, name: stateName })
    return {
      m_Name: name, rtBlend0: {
        srcBlend: literal(shadow ? 1 : 5), destBlend: literal(shadow ? 0 : 10), srcBlendAlpha: literal(shadow ? 1 : 5), destBlendAlpha: literal(shadow ? 0 : 10),
        blendOp: literal(0), blendOpAlpha: literal(0), colMask: literal(shadow ? 0 : 15),
      }, zWrite: literal(shadow ? 1 : 0), zTest: literal(4), culling: literal(0, '_Cull_Mode'), offsetFactor: literal(0), offsetUnits: literal(0),
    }
  }
  shader.subShaders = [{ passes: [{ type: 0, name: '', state: sourceState('Forward', false) }, { type: 0, name: '', state: sourceState('ShadowCaster', true) }] }] as any
  return fixture
}

const matcapPassFixtures = [
  {
    key: 'forward', pass: 'forward', variant: 'static', stateName: 'Forward', passIndex: 0, blobIndex: 2, parameterBlobIndex: 0,
    parameterRecordSha256: '1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150',
    programHash: 'b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e',
    programRecordSha256: 'a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e',
    programDataLength: 5178, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
  },
  {
    key: 'forwardInstanced', pass: 'forward', variant: 'instanced', stateName: 'Forward', passIndex: 0, blobIndex: 3, parameterBlobIndex: 1,
    parameterRecordSha256: '1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175',
    programHash: '38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4',
    programRecordSha256: 'fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f',
    programDataLength: 4726, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
  },
  {
    key: 'shadow', pass: 'shadow', variant: 'static', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 6, parameterBlobIndex: 4,
    parameterRecordSha256: '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17',
    programHash: 'd33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67',
    programRecordSha256: '34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3',
    programDataLength: 4923, keywordIndices: [] as number[], keywordNames: [],
    attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
  },
  {
    key: 'shadowInstanced', pass: 'shadow', variant: 'instanced', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 7, parameterBlobIndex: 5,
    parameterRecordSha256: '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51',
    programHash: '8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7',
    programRecordSha256: 'd0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3',
    programDataLength: 4599, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
  },
] as const

function makeMatcapCandidate() {
  const fixture = makeCandidate('matcap_fixture', ['FX_MAT_Matcap_01'])
  const material = fixture.candidate.sourceMaterials![0]
  const shader = fixture.candidate.shaders![0]
  const assemblySlot = fixture.candidate.assembly![0]!.renderers[0]!.materialSlots![0]!
  material.name = 'CH0191_Matcap'
  material.pathId = DSFX_MATCAP_MATERIAL_REFERENCE.objectId
  material.file = DSFX_MATCAP_MATERIAL_REFERENCE.serializedFile
  material.sourceReference = structuredClone(DSFX_MATCAP_MATERIAL_REFERENCE)
  material.shaderName = DSFX_MATCAP_SHADER_NAME
  material.shaderParsedName = DSFX_MATCAP_SHADER_NAME
  material.shaderReference = structuredClone(DSFX_MATCAP_SOURCE_REFERENCE)
  material.shader = { file: DSFX_MATCAP_SOURCE_REFERENCE.serializedFile, pathId: DSFX_MATCAP_SOURCE_REFERENCE.objectId }
  material.renderQueue = -1
  material.keywords = []
  material.floatProperties = { ...DSFX_MATCAP_INERT_FLOAT_PROPERTIES, _ZWrite_Mode: 1, _Cull_Mode: 2 }
  material.intProperties = {}
  material.colorProperties = { ...DSFX_MATCAP_INERT_COLOR_PROPERTIES, _Main_Color: {
    r: DSFX_MATCAP_MAIN_COLOR[0], g: DSFX_MATCAP_MAIN_COLOR[1], b: DSFX_MATCAP_MAIN_COLOR[2], a: DSFX_MATCAP_MAIN_COLOR[3],
  } }
  material.textures = [
    { name: '_Main_Tex', texture: { file: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.serializedFile, pathId: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.objectId }, textureReference: structuredClone(DSFX_MATCAP_MAIN_TEXTURE_REFERENCE), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    { name: '_Matcap_Tex', texture: { file: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.serializedFile, pathId: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.objectId }, textureReference: structuredClone(DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    { name: '_texcoord', texture: { file: material.file, pathId: '0' }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
  ]
  material.resolvedTextures = [
    { property: '_Main_Tex', name: 'CH0191_MainTex', width: 64, height: 64, sourceReference: structuredClone(DSFX_MATCAP_MAIN_TEXTURE_REFERENCE) },
    { property: '_Matcap_Tex', name: 'CH0191_MatcapTex', width: 64, height: 64, sourceReference: structuredClone(DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE) },
  ]
  assemblySlot.sourceMaterialReference = structuredClone(DSFX_MATCAP_MATERIAL_REFERENCE)
  assemblySlot.material = { file: DSFX_MATCAP_MATERIAL_REFERENCE.serializedFile, pathId: DSFX_MATCAP_MATERIAL_REFERENCE.objectId }

  shader.name = DSFX_MATCAP_SHADER_NAME
  shader.parsedName = DSFX_MATCAP_SHADER_NAME
  shader.sourceReference = structuredClone(DSFX_MATCAP_SOURCE_REFERENCE)
  shader.programBlobSha256 = DSFX_MATCAP_PROGRAM_BLOB_SHA256
  shader.properties = { m_Props: DSFX_MATCAP_REQUIRED_PROPERTIES.map(m_Name => ({ m_Name })) }
  const sourceAttributeName = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0' : 'in_COLOR0'
  const glsl = (attributes: readonly string[], uniforms: readonly string[]) => [
    '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 ${sourceAttributeName(attribute)};`),
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif', '#ifdef FRAGMENT',
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`), '#endif',
  ].join('\n')
  const programs = matcapPassFixtures.map(pass => ({
    kind: 'program' as const, blobIndex: pass.blobIndex, platform: 9, gpuProgramType: 4,
    programHash: pass.programHash, programDataSha256: pass.programHash, programDataLength: pass.programDataLength,
    recordSha256: pass.programRecordSha256, glsl: glsl(pass.attributes, pass.uniforms),
  }))
  shader.extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: DSFX_MATCAP_FINGERPRINT,
    compressedBlobSha256: DSFX_MATCAP_PROGRAM_BLOB_SHA256,
    shader: { name: DSFX_MATCAP_SHADER_NAME, sourceReference: structuredClone(DSFX_MATCAP_SOURCE_REFERENCE), keywordNames: [...DSFX_MATCAP_SHADER_KEYWORDS] },
    programs: structuredClone(programs), gles3Programs: structuredClone(programs),
    bindings: matcapPassFixtures.map(pass => ({
      subShaderIndex: 0, passIndex: pass.passIndex, passName: '', stateName: pass.stateName, stage: 'vertex',
      blobIndex: pass.blobIndex, parameterBlobIndex: pass.parameterBlobIndex, platform: 9, gpuProgramType: 4,
      keywordIndices: [...pass.keywordIndices], keywordNames: [...pass.keywordNames], programHash: pass.programHash,
      gles3ProgramHash: pass.programHash, programRecordSha256: pass.programRecordSha256, parameterRecordSha256: pass.parameterRecordSha256,
    })),
  } as InventoryShaderExtraction
  const stateValue = (val: number, name: string) => ({ val, name })
  const sourcePassState = (shadow: boolean) => {
    const name = shadow ? 'ShadowCaster' : 'Forward'
    const tags = [
      ['LIGHTMODE', shadow ? 'SHADOWCASTER' : 'UniversalForwardOnly'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'],
      ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque'],
    ]
    return {
      m_Name: name,
      rtBlend0: {
        srcBlend: stateValue(shadow ? 1 : 5, '<noninit>'), destBlend: stateValue(shadow ? 0 : 10, '<noninit>'),
        srcBlendAlpha: stateValue(shadow ? 1 : 5, '<noninit>'), destBlendAlpha: stateValue(shadow ? 0 : 10, '<noninit>'),
        blendOp: stateValue(0, '<noninit>'), blendOpAlpha: stateValue(0, '<noninit>'), colMask: stateValue(shadow ? 0 : 15, '<noninit>'),
      },
      zWrite: stateValue(shadow ? 1 : 0, shadow ? '<noninit>' : '_ZWrite_Mode'), zTest: stateValue(4, '<noninit>'),
      culling: stateValue(0, '_Cull_Mode'), offsetFactor: stateValue(0, '<noninit>'), offsetUnits: stateValue(0, '<noninit>'),
      lighting: false, m_Tags: { tags },
    }
  }
  shader.subShaders = [{ passes: [
    { type: 0, name: '', state: sourcePassState(false) }, { type: 0, name: '', state: sourcePassState(true) },
  ] }] as any
  return fixture
}

const projectMxPassFixtures = {
  forward: {
    pass: 'forward', stateName: 'ForwardLit', passIndex: 0, blobIndex: 32, parameterBlobIndex: 0,
    parameterRecordSha256: '1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531',
    programHash: '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0',
    programRecordSha256: '6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab',
    programDataLength: 9117, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: ['POSITION', 'NORMAL', 'TEXCOORD_0'],
    uniforms: [
      '_WorldSpaceCameraPos', 'hlslcc_mtx4x4unity_MatrixVP', '_MxCharShadowTone', '_ShadowTint', '_mainTex_ST',
      '_FakeLightDir', '_MxCharLightTone', '_MxCharLightData', '_ShadowThreshold', '_CodeAddColor',
      '_CodeMultiplyColor', '_CodeAddRimColor', '_Color', '_ShadowStrong', '_SpecColor', '_LightValue',
      '_LightStrong', '_SpecStrong', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_mainTex', '_sourceTex',
    ],
  },
  glow: {
    pass: 'glow', stateName: 'ForwardLit', passIndex: 0, blobIndex: 34, parameterBlobIndex: 2,
    parameterRecordSha256: 'eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3',
    programHash: '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61',
    programRecordSha256: '649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199',
    programDataLength: 9679, keywordIndices: [10], keywordNames: ['_GLOW_0'],
    attributes: ['POSITION', 'NORMAL', 'TEXCOORD_0'],
    uniforms: [
      '_WorldSpaceCameraPos', 'hlslcc_mtx4x4unity_MatrixVP', '_MxCharShadowTone', '_ShadowTint', '_mainTex_ST',
      '_FakeLightDir', '_MxCharLightTone', '_MxCharLightData', '_ShadowThreshold', '_CodeAddColor',
      '_CodeMultiplyColor', '_CodeAddRimColor', '_Color', '_ShadowStrong', '_SpecColor', '_LightValue',
      '_LightStrong', '_SpecStrong', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_mainTex', '_sourceTex',
      '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0',
    ],
  },
  outline: {
    pass: 'outline', stateName: 'Outline', passIndex: 1, blobIndex: 104, parameterBlobIndex: 80,
    parameterRecordSha256: '93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9',
    programHash: 'a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703',
    programRecordSha256: '476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026',
    programDataLength: 5141, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: ['POSITION', 'COLOR_0', 'TANGENT', 'TEXCOORD_0'],
    uniforms: [
      '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
      'hlslcc_mtx4x4unity_MatrixVP', '_OutlineTint', '_OutlineZCorrection', '_mainTex',
    ],
  },
  solidOutline: {
    pass: 'solidOutline', stateName: 'Solid Color Outline', passIndex: 2, blobIndex: 180, parameterBlobIndex: 176,
    parameterRecordSha256: '81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e',
    programHash: 'caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2',
    programRecordSha256: 'cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f',
    programDataLength: 5384, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: ['POSITION', 'COLOR_0', 'TANGENT'],
    uniforms: [
      '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
      'hlslcc_mtx4x4unity_MatrixVP', '_AdditionalLightSharpness', '_AdditionalLightStrength', '_OutlineTint',
      '_OutlineZCorrection', '_OutlineSolidColorTint', '_DitherThreshold',
    ],
  },
  shadow: {
    pass: 'shadow', stateName: 'ShadowCaster', passIndex: 3, blobIndex: 193, parameterBlobIndex: 192,
    parameterRecordSha256: '7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35',
    programHash: 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0',
    programRecordSha256: '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46',
    programDataLength: 4273, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: ['POSITION', 'NORMAL'],
    uniforms: ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier'],
  },
  depth: {
    pass: 'depth', stateName: 'DepthOnly', passIndex: 4, blobIndex: 195, parameterBlobIndex: 194,
    parameterRecordSha256: 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532',
    programHash: '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513',
    programRecordSha256: '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0',
    programDataLength: 2766, keywordIndices: [] as number[], keywordNames: [] as string[],
    attributes: ['POSITION'], uniforms: ['hlslcc_mtx4x4unity_MatrixVP'],
  },
} as const

function projectMxSourceAttributeName(attribute: string) {
  return attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0'
      : attribute === 'TANGENT' ? 'in_TANGENT0'
        : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_TEXCOORD0'
}

function projectMxSourceGlsl(attributes: readonly string[], uniforms: readonly string[]) {
  return [
    '#version 300 es', '#ifdef VERTEX',
    ...attributes.map(attribute => `in vec4 ${projectMxSourceAttributeName(attribute)};`),
    ...uniforms.map(uniform => `uniform vec4 ${uniform};`),
    '#endif', '#ifdef FRAGMENT', 'void main(){}', '#endif',
  ].join('\n')
}

function makeProjectMxCandidate(activeVariant: 'forward' | 'glow' = 'forward') {
  const fixture = makeCandidate('projectmx_weapon_fixture', ['ProjectMX_Weapon'])
  const material = fixture.candidate.sourceMaterials![0]
  const shader = fixture.candidate.shaders![0]
  const mainReference = reference(hash('f'), 'CAB-textures', '300')
  const sourceReference = reference(hash('g'), 'CAB-textures', '301')
  material.shaderName = 'ProjectMX/WeaponTest1Damage'
  material.shaderParsedName = 'ProjectMX/WeaponTest1Damage'
  material.shaderReference = structuredClone(PROJECTMX_WEAPON_SOURCE_REFERENCE)
  material.shader = { file: PROJECTMX_WEAPON_SOURCE_REFERENCE.serializedFile, pathId: PROJECTMX_WEAPON_SOURCE_REFERENCE.objectId }
  material.renderQueue = 2000
  material.keywords = activeVariant === 'glow' ? ['_GLOW_0'] : []
  material.floatProperties = {
    _DamageON: 0, _Damage: 0, _Fire: 0, _IsDither: 0, _UseGlow: activeVariant === 'glow' ? 1 : 0,
    _SrcBlend: 1, _DstBlend: 0, _ZWrite: 1, _ZTest: 4, _Cull: 2,
  }
  material.intProperties = {}
  material.colorProperties = {
    _Color: { r: 1, g: 1, b: 1, a: 1 },
    _FakeLightDir: { r: 0.1, g: 0.65, b: 0, a: 0 },
  }
  material.textures = [
    { name: '_mainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    { name: '_sourceTex', texture: { file: sourceReference.serializedFile, pathId: sourceReference.objectId }, textureReference: sourceReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
  ]
  material.resolvedTextures = [
    { property: '_mainTex', name: 'ProjectMX_MainTex', width: 256, height: 256, sourceReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    { property: '_sourceTex', name: 'ProjectMX_SourceTex', width: 256, height: 256, sourceReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
  ]
  shader.parsedName = 'ProjectMX/WeaponTest1Damage'
  shader.sourceReference = structuredClone(PROJECTMX_WEAPON_SOURCE_REFERENCE)
  shader.programBlobSha256 = PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256
  shader.properties = { m_Props: PROJECTMX_WEAPON_REQUIRED_PROPERTIES.map(m_Name => ({ m_Name })) }
  const passStates = [
    ['ForwardLit', 2, 15], ['Outline', 1, 15], ['Solid Color Outline', 1, 15], ['ShadowCaster', 2, 15], ['DepthOnly', 2, 0],
  ] as const
  const state = (name: string, culling: number, colorMask: number) => ({
    m_Name: name,
    rtBlend0: {
      srcBlend: { val: 1 }, destBlend: { val: 0 }, srcBlendAlpha: { val: 1 }, destBlendAlpha: { val: 0 },
      blendOp: { val: 0 }, blendOpAlpha: { val: 0 }, colMask: { val: colorMask },
    },
    zWrite: { val: 1 }, zTest: { val: 4 }, culling: { val: culling }, offsetFactor: { val: 0 }, offsetUnits: { val: 0 }, lighting: false,
  })
  shader.subShaders = [{ passes: passStates.map(([name, culling, colorMask]) => ({ type: 0, state: state(name, culling, colorMask) })) }]
  const programs = Object.values(projectMxPassFixtures).map(pass => ({
    kind: 'program' as const, blobIndex: pass.blobIndex, platform: 9, gpuProgramType: 4,
    programHash: pass.programHash, programDataSha256: pass.programHash, programDataLength: pass.programDataLength,
    recordSha256: pass.programRecordSha256, glsl: projectMxSourceGlsl(pass.attributes, pass.uniforms),
  }))
  shader.extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: PROJECTMX_WEAPON_FINGERPRINT,
    compressedBlobSha256: PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256,
    shader: { name: 'ProjectMX/WeaponTest1Damage', sourceReference: structuredClone(PROJECTMX_WEAPON_SOURCE_REFERENCE), keywordNames: [...PROJECTMX_WEAPON_SHADER_KEYWORDS] },
    programs, gles3Programs: structuredClone(programs),
    bindings: Object.values(projectMxPassFixtures).map(pass => ({
      subShaderIndex: 0, passIndex: pass.passIndex, passName: '', stateName: pass.stateName, stage: 'vertex', blobIndex: pass.blobIndex,
      parameterBlobIndex: pass.parameterBlobIndex, platform: 9, gpuProgramType: 4,
      keywordIndices: [...pass.keywordIndices], keywordNames: [...pass.keywordNames], programHash: pass.programHash,
      gles3ProgramHash: pass.programHash, programRecordSha256: pass.programRecordSha256, parameterRecordSha256: pass.parameterRecordSha256,
    })),
  }
  return fixture
}

function makeDsfxCandidate(rule: typeof CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[number], options: {
  identity?: string
  materialName?: string
  floats?: Record<string, number>
  missingTexture?: boolean
  renderStateVariant?: 'static-default' | 'depth-tested-back-cull' | 'depth-tested-off-double-sided'
} = {}) {
  const fixture = makeCandidate(options.identity ?? 'dsfx_fixture', [options.materialName ?? 'DSFX_FX'])
  const material = fixture.candidate.sourceMaterials![0]
  const shader = fixture.candidate.shaders![0]
  const textureReference = reference(hash('f'), 'CAB-textures', '300')
  const alphaBlendAdd = rule.identity === 'dsfx/fx_shader_alphablend_add'
  const alphaBlendVariant = (rule.identity === 'dsfx/fx_shader_alphablend_0' || alphaBlendAdd)
    && options.renderStateVariant !== undefined && options.renderStateVariant !== 'static-default'
  const exactDsfxSourceState = rule.identity === 'dsfx/fx_shader_additive_0' || alphaBlendAdd
  const passState = (pass: typeof rule.passes[number]) => ({
    m_Name: pass.name,
    rtBlend0: {
      srcBlend: { val: pass.states.srcBlend },
      destBlend: { val: pass.states.destinationBlend },
      srcBlendAlpha: { val: pass.states.sourceBlendAlpha },
      destBlendAlpha: { val: pass.states.destinationBlendAlpha },
      blendOp: { val: pass.states.blendOperation },
      blendOpAlpha: { val: pass.states.blendOperationAlpha },
      colMask: { val: pass.name === 'Forward' ? 15 : 0 },
    },
    zTest: exactDsfxSourceState
      ? { val: pass.states.zTest, name: pass.name === 'Forward' ? '_ZTest_Mode' : '<noninit>' }
      : alphaBlendVariant ? { val: pass.states.zTest, name: '_ZTest_Mode' } : { val: pass.states.zTest },
    zWrite: exactDsfxSourceState
      ? { val: pass.states.zWrite, name: pass.name === 'Forward' ? '_ZWrite_Mode' : '<noninit>' }
      : { val: pass.states.zWrite },
    culling: exactDsfxSourceState || alphaBlendVariant ? { val: pass.states.culling, name: '_Cull_Mode' } : { val: pass.states.culling },
    offsetFactor: exactDsfxSourceState
      ? { val: pass.states.offsetFactor, name: pass.name === 'Forward' ? '_ZOffsetFactor' : '<noninit>' }
      : { val: pass.states.offsetFactor },
    offsetUnits: exactDsfxSourceState
      ? { val: pass.states.offsetUnits, name: pass.name === 'Forward' ? '_ZOffsetUnits' : '<noninit>' }
      : { val: pass.states.offsetUnits },
    lighting: pass.states.lighting,
    ...(exactDsfxSourceState ? { m_Tags: { tags: pass.name === 'Forward'
      ? [['LIGHTMODE', 'UniversalForward'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'], ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque']]
      : [['LIGHTMODE', 'SHADOWCASTER'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'], ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque']] } } : {}),
  })
  material.shaderName = rule.identity
  material.shaderParsedName = rule.identity
  material.shaderReference = structuredClone(rule.sourceReference)
  material.shader = { file: rule.sourceReference.serializedFile, pathId: rule.sourceReference.objectId }
  material.renderQueue = 3000
  material.keywords = []
  material.colorProperties = { _Color: { r: 0.25, g: 0.5, b: 0.75, a: 0.8 } }
  const staticFloats = {
    _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: options.renderStateVariant === 'depth-tested-off-double-sided' ? 0 : 2,
    _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: alphaBlendVariant ? 4 : 4,
    ...(rule.propertyNames.includes('_Multiply') ? { _Multiply: 1, _RGBRGBA: 0, _Main_Texture_No: alphaBlendAdd ? 0 : 1 } : {}),
    ...options.floats,
  }
  material.floatProperties = staticFloats
  material.intProperties = {}
  material.textures = options.missingTexture ? [{ name: '_Texture', texture: null, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }] : [{
    name: '_Texture', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId }, textureReference,
    scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
  }]
  material.resolvedTextures = options.missingTexture ? [] : [{
    property: '_Texture', name: 'DSFX_Texture', width: 256, height: 256, sourceReference: textureReference,
    scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
  }]
  shader.parsedName = rule.identity
  shader.sourceReference = structuredClone(rule.sourceReference)
  shader.programBlobSha256 = rule.programBlobSha256
  shader.properties = { m_Props: rule.propertyNames.map(m_Name => ({ m_Name })) }
  shader.subShaders = [{ passes: rule.passes.map(pass => ({ type: 0, state: passState(pass) })) }]
  if (rule.identity === 'dsfx/fx_shader_alphablend_0') {
    const forwardGlsl = [
      '#version 300 es', 'uniform vec4 _Color;', 'uniform vec4 _Custom_Data_Offset_Use;',
      'uniform vec4 _Texture_ST;', 'uniform sampler2D _Texture;',
    ].join('\n')
    const shadowGlsl = [
      '#version 300 es', 'uniform vec4 _ShadowBias;', 'uniform vec3 _LightDirection;',
      'uniform vec4 _ShadowCoordModifier;', 'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;',
    ].join('\n')
    const programs = DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS.map((program, index) => ({
      kind: 'program' as const, blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
      programHash: program.programHash, programDataSha256: program.programHash,
      programDataLength: program.programDataLength, recordSha256: program.recordSha256,
      glsl: index < 2 ? forwardGlsl : shadowGlsl,
    }))
    shader.extraction = {
      schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: hash('8'),
      compressedBlobSha256: rule.programBlobSha256,
      shader: { name: 'DSFX/FX_SHADER_AlphaBlend_0', sourceReference: structuredClone(rule.sourceReference), keywordNames: [] },
      programs, gles3Programs: programs,
      bindings: programs.map((program, index) => ({
        subShaderIndex: 0, passIndex: index < 2 ? 0 : 1,
        passName: index < 2 ? 'Forward' : 'ShadowCaster', stateName: index < 2 ? 'Forward' : 'ShadowCaster',
        stage: 'vertex', blobIndex: program.blobIndex, parameterBlobIndex: index,
        platform: 9, gpuProgramType: 4, keywordIndices: [], keywordNames: [],
        programHash: program.programHash, gles3ProgramHash: program.programHash,
        programRecordSha256: program.recordSha256,
      })),
    }
  } else if (rule.identity === 'dsfx/fx_shader_additive_0' || rule.identity === 'dsfx/fx_shader_alphablend_add') {
    const attributeName = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
      : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0' : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1'
        : attribute === 'COLOR_0' ? 'in_COLOR0' : attribute === 'NORMAL' ? 'in_NORMAL0' : `in_${attribute}`
    const sourceGlsl = (attributes: readonly string[], uniforms: readonly string[], length: number) => {
      const source = [
        '#ifdef VERTEX', '#version 300 es', ...attributes.map(attribute => `in vec4 ${attributeName(attribute)};`),
        ...uniforms.map(uniform => `uniform float ${uniform};`), '#endif', '#ifdef FRAGMENT', '#version 300 es',
        'void main() {}', '#endif',
      ].join('\n')
      return source.padEnd(length, ' ')
    }
    const expectedPrograms = rule.identity === 'dsfx/fx_shader_alphablend_add' ? DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS : DSFX_ADDITIVE_0_GLES3_PROGRAMS
    const programs = expectedPrograms.map((program, index) => ({
      kind: 'program' as const, blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
      programHash: program.programHash, programDataSha256: program.programHash, programDataLength: rule.identity === 'dsfx/fx_shader_alphablend_add' ? program.programDataLength : [
        DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH, DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
        DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH, DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
      ][index], recordSha256: program.programRecordSha256,
      glsl: sourceGlsl(program.requiredAttributes, program.requiredUniforms, program.programDataLength),
    }))
    shader.extraction = {
      schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3',
      fingerprint: rule.identity === 'dsfx/fx_shader_alphablend_add' ? DSFX_ALPHA_BLEND_ADD_FINGERPRINT : DSFX_ADDITIVE_0_FINGERPRINT,
      compressedBlobSha256: rule.programBlobSha256,
      shader: {
        name: rule.identity === 'dsfx/fx_shader_alphablend_add' ? DSFX_ALPHA_BLEND_ADD_SHADER_NAME : DSFX_ADDITIVE_0_SHADER_NAME,
        sourceReference: structuredClone(rule.identity === 'dsfx/fx_shader_alphablend_add' ? DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE : DSFX_ADDITIVE_0_SOURCE_REFERENCE),
        keywordNames: [...(rule.identity === 'dsfx/fx_shader_alphablend_add' ? DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS : DSFX_ADDITIVE_0_SHADER_KEYWORDS)],
      },
      programs, gles3Programs: structuredClone(programs),
      bindings: programs.map((program, index) => {
        const expected = expectedPrograms[index]
        return {
          subShaderIndex: 0, passIndex: expected.pass === 'forward' ? 0 : 1, passName: '', stateName: expected.stateName, stage: 'vertex',
          blobIndex: expected.blobIndex, parameterBlobIndex: expected.parameterBlobIndex, platform: 9, gpuProgramType: 4,
          keywordIndices: [...expected.keywordIndices], keywordNames: [...expected.keywordNames], programHash: expected.programHash,
          gles3ProgramHash: expected.programHash, programRecordSha256: expected.programRecordSha256, parameterRecordSha256: expected.parameterRecordSha256,
        }
      }),
    }
  }
  return fixture
}

function makeWakamoEyeAlphaBlendAddCandidate() {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1]
  const fixture = makeDsfxCandidate(rule, { identity: 'wakamo_original', materialName: 'Wakamo_Original_Eye', renderStateVariant: 'depth-tested-back-cull' })
  const material = fixture.candidate.sourceMaterials![0]
  const shader = fixture.candidate.shaders![0]
  material.sourceReference = {
    bundleSha256: '46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816',
    serializedFile: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6', objectId: '1142847250617954324',
  }
  fixture.candidate.assembly![0].renderers[0].materialSlots![0].material = {
    file: material.sourceReference.serializedFile,
    pathId: material.sourceReference.objectId,
  }
  fixture.candidate.assembly![0].renderers[0].materialSlots![0].sourceMaterialReference = structuredClone(material.sourceReference)
  material.shaderReference = structuredClone(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
  material.shader = { file: DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.serializedFile, pathId: DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.objectId }
  material.renderQueue = -1
  material.floatProperties = {
    _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
    _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
    _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
    _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
    _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
    _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
  }
  material.intProperties = {}
  material.colorProperties = {
    _Color: { r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 },
    _EmissionColor: { r: 0, g: 0, b: 0, a: 0 },
    _SpecColor: { r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 },
  }
  material.textures = [{
    name: '_Texture', texture: { file: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6', pathId: '0' }, textureReference: null,
    scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
  }]
  ;(material as any).resolvedTextures = []
  shader.properties = { m_Props: rule.propertyNames.map(m_Name => ({
    m_Name,
    ...(m_Name === '_Texture' ? { m_DefTexture: { m_DefaultName: 'white', m_TexDim: 2 } } : {}),
  })) }
  return fixture
}

function makeBuiltinCandidate() {
  const fixture = makeCandidate('example', ['Example_Body'])
  const renderer = fixture.candidate.assembly![0].renderers[0]
  renderer.rendererType = 'MeshRenderer'
  renderer.mesh = {
    file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, externalGuid: UNITY_BUILTIN_RESOURCES_GUID,
    builtinResource: {
      kind: 'unity-builtin-resource', guid: UNITY_BUILTIN_RESOURCES_GUID,
      file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad',
    },
  }
  renderer.meshSourceReference = null
  return fixture
}

function setMouthGridEvidence(candidate: SourceCandidate, options: {
  serializedColumns: number
  serializedRows: number
  shaderColumns?: number
  shaderRows?: number
  width?: number
  height?: number
  shaderIdentity?: string
}) {
  const material = candidate.sourceMaterials!.find(item => /eyemouth/i.test(item.name))!
  const shader = candidate.shaders!.find(item => item.sourceReference
    && material.shaderReference
    && sourceObjectKey(item.sourceReference) === sourceObjectKey(material.shaderReference))!
  const atlas = material.resolvedTextures.find(item => item.property === '_MouthTileTex')!
  material.floatProperties = {
    ...material.floatProperties,
    _MouthTileCols: options.serializedColumns,
    _MouthTileRows: options.serializedRows,
  }
  atlas.width = options.width ?? 512
  atlas.height = options.height ?? 512
  shader.parsedName = options.shaderIdentity ?? 'MX/C-EyesMouth'
  const properties = shader.properties as { m_Props?: Record<string, unknown>[] } | undefined
  shader.properties = { m_Props: [
    ...(properties?.m_Props ?? []),
    { m_Name: '_MouthTileCols', 'm_DefValue[0]': options.shaderColumns ?? 8 },
    { m_Name: '_MouthTileRows', 'm_DefValue[0]': options.shaderRows ?? 8 },
  ] }
}

test('resolves shader pass literals, material properties, shader defaults, and missing properties', () => {
  const material = { name: 'fixture', pathId: '1', file: 'CAB-materials', shader: null, renderQueue: -1, keywords: [], textures: [], floatProperties: { _ZWrite: 0 }, intProperties: {} } satisfies InventoryMaterial
  const shader: InventoryShader = { name: 'fixture', pathId: '1', file: 'CAB-shaders', properties: { m_Props: [{ m_Name: '_ZTest', 'm_DefValue[0]': 4 }] } }

  assert.deepEqual(resolveShaderState({ val: 5, name: '' }, material, shader), { value: 5, source: 'literal' })
  assert.deepEqual(resolveShaderState({ val: 1, name: '[_ZWrite]' }, material, shader), { value: 0, source: 'material', property: '_ZWrite' })
  assert.deepEqual(resolveShaderState(undefined, material, shader, '_ZTest'), { value: 4, source: 'shader-default', property: '_ZTest' })
  assert.deepEqual(resolveShaderState(undefined, material, shader, '_Unknown'), { value: null, source: 'unresolved', property: '_Unknown' })
})

test('recognizes the BAAD face, eye-mouth, eyebrow, hair, general, and weapon shader names', () => {
  const { candidate, prefabPath } = makeCandidate('haruna_original', [
    'Haruna_Body', 'Haruna_Face', 'Haruna_EyeMouth', 'Haruna_Hair', 'Haruna_Eyebrow', 'Haruna_Weapon',
  ], { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 } })
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Haruna'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.assembly?.prefabPath, prefabPath)
  assert.equal(profile.assembly?.renderers.length, 1)
  assert.deepEqual(profile.renderers[0].materialSlots.map(slot => slot.adapterId), [
    'mx-character-general', 'mx-character-face', 'mx-character-eyemouth', 'mx-character-hair', 'mx-character-eyebrow', 'mx-character-weapon',
  ])
})

test('records a proof-backed exclusion for an exact particle-only InstantiateFx target', () => {
  const fixture = makeCandidate('example', ['Example_Body'])
  fixture.candidate.events = [makeFxInstantiationEvent()]
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = 'Example_Cafe_Idle'

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)

  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.fxExclusionProofs.length, 1)
  assert.equal(profile.excludedFxInstantiationEvents.length, 1)
  assert.equal(profile.fxExclusionProofs[0].function, 'AniEvt_InstantiateFx')
  assert.equal(profile.fxExclusionProofs[0].completeGraph, true)
  assert.equal(profile.fxExclusionProofs[0].disjointFromCore, true)
  assert.equal(profile.fxExclusionProofs[0].rendererAssets.length, 1)
  assert.deepEqual(profile.fxExclusionProofs[0].approvedMonoScriptReferences, [CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES[0]])
  assert.deepEqual(profile.excludedFxInstantiationEvents[0].targetReference, profile.fxExclusionProofs[0].targetReference)
  assert.deepEqual(profile.validation.fxExclusionProofs, profile.fxExclusionProofs)
  assert.deepEqual(profile.validation.excludedFxInstantiationEvents, profile.excludedFxInstantiationEvents)
})

test('records only the exact serialized InstantiateFx alias and rejects arbitrary event literals', () => {
  const fixture = makeCandidate('example', ['Example_Body'])
  const alias = makeFxInstantiationEvent()
  alias.function = 'InstantiateFx'
  fixture.candidate.events = [alias]
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = 'Example_Cafe_Idle'
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)

  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.fxExclusionProofs.length, 1)
  assert.equal(profile.fxExclusionProofs[0].function, 'InstantiateFx')
  assert.ok(profile.fxExclusionProofs[0].evidence.some(item => item.includes('selected event is InstantiateFx at')))

  const unsupportedFixture = makeCandidate('example', ['Example_Body'])
  const unsupported = makeFxInstantiationEvent()
  unsupported.function = 'InstantiateFxExtra'
  unsupportedFixture.candidate.events = [unsupported]
  const unsupportedProfile = buildChibiRenderingProfile(unsupportedFixture.candidate, unsupportedFixture.prefabPath, interaction)
  assert.equal(unsupportedProfile.fxExclusionProofs.length, 0)
  assert.equal(unsupportedProfile.excludedFxInstantiationEvents.length, 0)
})

test('fails closed when the InstantiateFx PPtr does not match the exact source target', () => {
  const fixture = makeCandidate('example', ['Example_Body'])
  const event = makeFxInstantiationEvent()
  event.target!.pathId = 'wrong-target'
  fixture.candidate.events = [event]
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = 'Example_Cafe_Idle'
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
  assert.equal(profile.validation.valid, false)
  assert.equal(profile.fxExclusionProofs.length, 0)
  assert.match(profile.validation.unresolved.join(' '), /does not exactly match its source-pinned target PPtr/)
})

test('fails closed for the serialized InstantiateFx alias when its target graph is mixed or core-overlapping', () => {
  const mixedFixture = makeCandidate('example', ['Example_Body'])
  const mixed = makeFxInstantiationEvent()
  mixed.function = 'InstantiateFx'
  mixed.fxTargetEvidence!.coreComponentTypes.push('SkinnedMeshRenderer')
  mixed.fxTargetEvidence!.componentTypeCounts.SkinnedMeshRenderer = 1
  mixed.fxTargetEvidence!.componentReferences.push({ sourceReference: reference(hash('2'), 'CAB-fx', '110'), type: 'SkinnedMeshRenderer' })
  mixedFixture.candidate.events = [mixed]
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = 'Example_Cafe_Idle'
  const mixedProfile = buildChibiRenderingProfile(mixedFixture.candidate, mixedFixture.prefabPath, interaction)
  assert.equal(mixedProfile.validation.valid, false)
  assert.equal(mixedProfile.fxExclusionProofs.length, 0)
  assert.match(mixedProfile.validation.unresolved.join(' '), /incomplete, not particle-only/)

  const overlapFixture = makeCandidate('example', ['Example_Body'])
  const overlap = makeFxInstantiationEvent()
  overlap.function = 'InstantiateFx'
  const rendererReference = overlap.fxTargetEvidence!.rendererAssets[0].rendererReference
  overlapFixture.candidate.assembly![0].renderers[0].sourceReference = rendererReference
  overlap.fxTargetEvidence!.componentReferences[1].sourceReference = rendererReference
  overlapFixture.candidate.events = [overlap]
  const overlapProfile = buildChibiRenderingProfile(overlapFixture.candidate, overlapFixture.prefabPath, interaction)
  assert.equal(overlapProfile.validation.valid, false)
  assert.equal(overlapProfile.fxExclusionProofs.length, 0)
  assert.match(overlapProfile.validation.unresolved.join(' '), /overlap the selected core renderer/)
})

test('allows Ui cut-in background Quad reuse only after the renderer is source-classified as presentation-only', () => {
  const { candidate, prefabPath, background, interaction } = makeUiPresentationFxOverlapFixture()
  const profile = buildChibiRenderingProfile(candidate, prefabPath, interaction)

  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.renderers.some(renderer => renderer.sourceReference?.objectId === background.sourceReference.objectId), false)
  assert.equal(profile.excludedRenderers.some(renderer => renderer.sourceReference.objectId === background.sourceReference.objectId), true)
  assert.equal(profile.excludedRenderers.find(renderer => renderer.sourceReference.objectId === background.sourceReference.objectId)?.reasonCode,
    'PRESENTATION_MESH_10210_OR_HELPER')
  assert.equal(profile.fxExclusionProofs.length, 1)
  assert.equal(profile.fxExclusionProofs[0].policyVersion, 'chibi-particle-only-instantiate-fx-v2')
  assert.equal(profile.fxExclusionProofs[0].disjointFromCore, true)
})

test('keeps required-core Quad, mesh, and material identities blocking FX graph exclusions', () => {
  const cases: Array<[string, (fixture: ReturnType<typeof makeUiPresentationFxOverlapFixture>) => void]> = [
    ['built-in Quad', fixture => {
      addPolicyRenderer(fixture, {
        name: 'Required_Core_Quad',
        hierarchyPath: 'Cafe_CH0169/Required_Core_Quad',
        materialName: 'Required_Core_Quad_Material',
        shaderName: 'MX/C-General/Layer4',
        mesh: {
          file: UNITY_BUILTIN_RESOURCES_FILE,
          pathId: UNITY_BUILTIN_QUAD_PATH_ID,
          externalGuid: UNITY_BUILTIN_RESOURCES_GUID,
        },
      })
    }],
    ['source mesh', fixture => {
      const coreRenderer = fixture.candidate.assembly![0].renderers[0]
      const mesh = coreRenderer.mesh!
      const meshReference = coreRenderer.meshSourceReference!
      fixture.event.fxTargetEvidence!.rendererAssets[0].mesh = {
        pointer: { file: mesh.file, pathId: mesh.pathId, externalGuid: '0'.repeat(32) },
        fileID: 0,
        identityResolved: true,
        objectResolved: true,
        sourceReference: meshReference,
      }
    }],
    ['source material', fixture => {
      const coreSlot = fixture.candidate.assembly![0].renderers[0].materialSlots![0]
      fixture.event.fxTargetEvidence!.rendererAssets[0].materials = [{
        pointer: {
          file: coreSlot.material!.file,
          pathId: coreSlot.material!.pathId,
          externalGuid: '0'.repeat(32),
        },
        fileID: 3,
        identityResolved: true,
        objectResolved: true,
        sourceReference: coreSlot.sourceMaterialReference!,
      }]
    }],
  ]

  for (const [label, addOverlap] of cases) {
    const fixture = makeUiPresentationFxOverlapFixture()
    addOverlap(fixture)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, fixture.interaction)
    assert.equal(profile.validation.valid, false, `${label}: ${profile.validation.unresolved.join('; ')}`)
    assert.equal(profile.fxExclusionProofs.length, 0, label)
    assert.equal(profile.excludedFxInstantiationEvents.length, 0, label)
    assert.match(profile.validation.unresolved.join(' '), /overlap the selected core renderer/, label)
  }
})

test('preserves multiple MonoBehaviour components only when each uses the same exact approved script identity', () => {
  const fixture = makeCandidate('example', ['Example_Body'])
  const event = makeFxInstantiationEvent()
  const evidence = event.fxTargetEvidence!
  evidence.componentTypeCounts.MonoBehaviour = 2
  evidence.componentReferences.push({
    sourceReference: reference(hash('2'), 'CAB-fx', '107'),
    type: 'MonoBehaviour',
  })
  evidence.monoBehaviours.push({
    ...structuredClone(evidence.monoBehaviours[0]),
    componentIdentity: { serializedFile: 'CAB-fx', pathId: '107', type: 'MonoBehaviour' },
  })
  evidence.approvedMonoScriptReferences.push(structuredClone(evidence.approvedMonoScriptReferences[0]))
  fixture.candidate.events = [event]
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = 'Example_Cafe_Idle'

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)

  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.fxExclusionProofs[0].approvedMonoScriptReferences.length, 2)
  assert.deepEqual(profile.fxExclusionProofs[0].approvedMonoScriptReferences[0], profile.fxExclusionProofs[0].approvedMonoScriptReferences[1])
})

test('fails closed for unresolved, unknown-script, incomplete-asset, and core-overlapping InstantiateFx targets', () => {
  const makeProfile = (mutate: (event: InventoryEvent, candidate: SourceCandidate) => void) => {
    const fixture = makeCandidate('example', ['Example_Body'])
    const event = makeFxInstantiationEvent()
    mutate(event, fixture.candidate)
    fixture.candidate.events = [event]
    const interaction = emptyChibiProfile('Example')
    interaction.initialPose = 'Example_Cafe_Idle'
    return buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
  }

  const unresolved = makeProfile(event => { event.fxTargetResolution = { status: 'missing', reason: 'no exact target', candidateCount: 0 } })
  assert.equal(unresolved.validation.valid, false)
  assert.equal(unresolved.fxExclusionProofs.length, 0)
  assert.equal(unresolved.excludedFxInstantiationEvents.length, 0)

  const unknownScript = makeProfile(event => {
    event.fxTargetEvidence!.monoBehaviours[0].scriptPPtr.pathId = '12345'
  })
  assert.equal(unknownScript.validation.valid, false)
  assert.equal(unknownScript.fxExclusionProofs.length, 0)
  assert.match(unknownScript.validation.unresolved.join(' '), /unknown MonoBehaviour identity or field schema/)

  const mismatchedMonoComponent = makeProfile(event => {
    event.fxTargetEvidence!.componentReferences[2].sourceReference.objectId = '999'
  })
  assert.equal(mismatchedMonoComponent.validation.valid, false)
  assert.equal(mismatchedMonoComponent.fxExclusionProofs.length, 0)
  assert.match(mismatchedMonoComponent.validation.unresolved.join(' '), /MonoBehaviour component identities do not match/)

  const missingMesh = makeProfile(event => {
    event.fxTargetEvidence!.rendererAssets[0].mesh = null
  })
  assert.equal(missingMesh.validation.valid, false)
  assert.equal(missingMesh.fxExclusionProofs.length, 0)
  assert.match(missingMesh.validation.unresolved.join(' '), /missing or unresolved particle renderer mesh\/material PPtr/)

  const coreOverlap = makeProfile((event, candidate) => {
    const evidence = event.fxTargetEvidence!
    const rendererReference = evidence.rendererAssets[0].rendererReference
    candidate.assembly![0].renderers[0].sourceReference = rendererReference
    evidence.componentReferences[1].sourceReference = rendererReference
  })
  assert.equal(coreOverlap.validation.valid, false)
  assert.equal(coreOverlap.fxExclusionProofs.length, 0)
  assert.match(coreOverlap.validation.unresolved.join(' '), /overlap the selected core renderer/)
})

test('retains the exact typed Unity built-in Quad source identity in a valid profile', () => {
  const { candidate, prefabPath } = makeBuiltinCandidate()
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.renderers[0].rendererType, 'MeshRenderer')
  assert.equal(profile.renderers[0].sourceMesh?.sourceReference, null)
  assert.deepEqual(profile.renderers[0].sourceMesh?.builtinResource, {
    kind: 'unity-builtin-resource', guid: UNITY_BUILTIN_RESOURCES_GUID,
    file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad',
  })
})

test('accepts repeated built-in Quad renderer variants only with distinct exact renderer identities', () => {
  const { candidate, prefabPath } = makeBuiltinCandidate()
  const assembly = candidate.assembly![0]
  const renderer = assembly.renderers[0]
  assembly.renderers.push({
    ...structuredClone(renderer), pathId: '9007199254740996',
    sourceReference: reference(hash('a'), 'CAB-prefab', '9007199254740996'),
    name: 'Example_Body_Alt', hierarchyPath: 'Cafe_Example/Example_Body_Alt',
  })
  assembly.rendererOrder.push('Example_Body_Alt')
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.renderers.filter(item => item.sourceMesh?.builtinResource?.name === 'Quad').length, 2)
})

test('omits exact null-mesh zero-material helpers while keeping nonzero and ambiguous meshes blocked', () => {
  const inert = makeCandidate('asuna_original', ['Asuna_Body'])
  const assembly = inert.candidate.assembly![0]
  const renderableRenderer = assembly.renderers[0]
  const inertReference = reference(hash('z'), 'CAB-prefab', '9007199254740997')
  const inertRenderer = { ...structuredClone(renderableRenderer), name: 'Box001', pathId: inertReference.objectId,
    sourceReference: inertReference, hierarchyPath: 'Cafe_Asuna_Original/Box001' }
  inertRenderer.mesh = { file: inertReference.serializedFile, pathId: '0' }
  inertRenderer.meshSourceReference = null
  inertRenderer.materialSlots = [{ slot: 0, material: { file: inertReference.serializedFile, pathId: '0' }, sourceMaterialReference: null }]
  assembly.renderers.push(inertRenderer)
  assembly.rendererOrder.push(inertRenderer.name)
  inert.candidate.events = [{
    clip: 'Asuna_Cafe_Idle', time: 0, function: 'AniEvt_EnableChildRenderer', string: '', float: 0, int: 4,
    targetReference: inertReference,
  }]
  const inertInteraction = emptyChibiProfile('Asuna')
  inertInteraction.initialPose = 'Asuna_Cafe_Idle'
  inertInteraction.interactions.idle = { state: 'available', clip: 'Asuna_Cafe_Idle', loop: true, hold: false }
  const inertProfile = buildChibiRenderingProfile(inert.candidate, inert.prefabPath, inertInteraction)
  assert.equal(inertProfile.validation.valid, true, inertProfile.validation.unresolved.join('; '))
  assert.deepEqual(inertProfile.renderers.map(renderer => renderer.name), [renderableRenderer.name])
  assert.deepEqual(inertProfile.childRendererEvents, [])
  assert.deepEqual(inertProfile.excludedRenderers.map(renderer => renderer.name), ['Box001'])
  assert.match(inertProfile.excludedRenderers[0].evidence.join(' | '), /exact null pointer/)
  assert.equal(inertProfile.excludedChildRendererEvents.length, 1)
  assert.equal(inertProfile.drawSequence.length, 1)

  const nonzero = makeCandidate('asuna_original', ['Asuna_Body'])
  nonzero.candidate.assembly![0].renderers[0].mesh = { file: 'CAB-prefab', pathId: '9007199254740995' }
  nonzero.candidate.assembly![0].renderers[0].meshSourceReference = null
  nonzero.candidate.assembly![0].renderers[0].materialSlots = []
  const nonzeroProfile = buildChibiRenderingProfile(nonzero.candidate, nonzero.prefabPath, emptyChibiProfile('Asuna'))
  assert.equal(nonzeroProfile.validation.valid, false)
  assert.match(nonzeroProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/)

  const ambiguous = makeCandidate('asuna_original', ['Asuna_Body'])
  ambiguous.candidate.assembly![0].renderers[0].mesh = { file: 'CAB-prefab', pathId: '0', externalGuid: 'f'.repeat(32) }
  ambiguous.candidate.assembly![0].renderers[0].meshSourceReference = null
  ambiguous.candidate.assembly![0].renderers[0].materialSlots = []
  const ambiguousProfile = buildChibiRenderingProfile(ambiguous.candidate, ambiguous.prefabPath, emptyChibiProfile('Asuna'))
  assert.equal(ambiguousProfile.validation.valid, false)
  assert.match(ambiguousProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/)
})

test('reports an exact null source mesh on a material-bearing core renderer without allowing publication', () => {
  const fixture = makeCandidate('asuna_original', ['Asuna_Body'])
  const renderer = fixture.candidate.assembly![0].renderers[0]
  const rendererReference = renderer.sourceReference!
  renderer.mesh = { file: rendererReference.serializedFile, pathId: '0' }
  renderer.meshSourceReference = null

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('Asuna'))
  assert.equal(profile.validation.valid, false)
  const diagnostic = profile.validation.unresolved.find(value => value.includes('exact null source mesh pointer'))
  assert.ok(diagnostic)
  assert.match(diagnostic, /Core renderer Cafe_Asuna_Original\/Asuna_Original_Body/)
  assert.ok(diagnostic.includes(`cab-prefab#${rendererReference.objectId}`))
  assert.match(diagnostic, /cab-prefab:0/)
  assert.doesNotMatch(diagnostic, /ambiguous source mesh reference/)
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === rendererReference.objectId), false)
})

test('rejects unknown built-in IDs, pathId 0, and skinned Quad renderers', () => {
  const unknown = makeBuiltinCandidate()
  unknown.candidate.assembly![0].renderers[0].mesh!.externalGuid = 'f'.repeat(32)
  unknown.candidate.assembly![0].renderers[0].mesh!.builtinResource = {
    kind: 'unity-builtin-resource', guid: 'f'.repeat(32) as typeof UNITY_BUILTIN_RESOURCES_GUID,
    file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad',
  }
  const unknownProfile = buildChibiRenderingProfile(unknown.candidate, unknown.prefabPath, emptyChibiProfile('Example'))
  assert.equal(unknownProfile.validation.valid, false)
  assert.match(unknownProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/)

  const zero = makeBuiltinCandidate()
  zero.candidate.assembly![0].renderers[0].mesh!.pathId = '0'
  zero.candidate.assembly![0].renderers[0].mesh!.builtinResource = {
    kind: 'unity-builtin-resource', guid: UNITY_BUILTIN_RESOURCES_GUID,
    file: UNITY_BUILTIN_RESOURCES_FILE, pathId: '0' as typeof UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad',
  }
  const zeroProfile = buildChibiRenderingProfile(zero.candidate, zero.prefabPath, emptyChibiProfile('Example'))
  assert.equal(zeroProfile.validation.valid, false)
  assert.match(zeroProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/)

  const skinned = makeBuiltinCandidate()
  skinned.candidate.assembly![0].renderers[0].rendererType = 'SkinnedMeshRenderer'
  const skinnedProfile = buildChibiRenderingProfile(skinned.candidate, skinned.prefabPath, emptyChibiProfile('Example'))
  assert.equal(skinnedProfile.validation.valid, false)
  assert.match(skinnedProfile.validation.unresolved.join(' '), /must be an unskinned MeshRenderer/)
})

test('uses the declared shader tint and ignores stale serialized color fields', () => {
  const { candidate, prefabPath } = makeCandidate('aru_original', ['Aru_Face'])
  const material = candidate.sourceMaterials![0]
  material.colorProperties = {
    _Color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
    _Tint: { r: 0.92, g: 0.81, b: 0.73, a: 1 },
  }
  candidate.shaders![0].properties = { m_Props: [
    { m_Name: '_Tint', 'm_DefValue[0]': 1, 'm_DefValue[1]': 1, 'm_DefValue[2]': 1, 'm_DefValue[3]': 1 },
  ] }

  const explicit = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Aru'))
  assert.deepEqual(explicit.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [0.92, 0.81, 0.73, 1])

  delete material.colorProperties._Tint
  const defaults = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Aru'))
  assert.deepEqual(defaults.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [1, 1, 1, 1])
})

test('does not use a serialized tint unless the linked shader declares it', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_Face'])
  candidate.sourceMaterials![0].colorProperties = { _Color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }
  candidate.shaders![0].properties = { m_Props: [{ m_Name: '_Tint', 'm_DefValue[0]': 1, 'm_DefValue[1]': 1, 'm_DefValue[2]': 1, 'm_DefValue[3]': 1 }] }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.deepEqual(profile.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [1, 1, 1, 1])
})

test('maps source-proven simple unlit shaders to native output and uses only declared color', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_Body'])
  const material = candidate.sourceMaterials![0]
  const shader = candidate.shaders![0]
  material.shaderParsedName = 'FX/General Unlit Texture'
  material.colorProperties = {
    _Color: { r: 0.2, g: 0.4, b: 0.6, a: 0.8 },
    _Tint: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
  }
  material.floatProperties = { ...material.floatProperties, _ZWrite: 1 }
  shader.parsedName = material.shaderParsedName
  shader.properties = { m_Props: [
    { m_Name: '_SrcBlend' }, { m_Name: '_DstBlend' }, { m_Name: '_SrcBlendAlpha' }, { m_Name: '_DstBlendAlpha' },
    { m_Name: '_ZWrite' }, { m_Name: '_ZTest' }, { m_Name: '_Cull' }, { m_Name: '_ZOffsetFactor' }, { m_Name: '_ZOffsetUnits' },
    { m_Name: '_Color' }, { m_Name: '_MainTex' },
  ] }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.renderers[0].materialSlots[0].adapterId, 'gltf-native')
  assert.deepEqual(profile.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [0.2, 0.4, 0.6, 0.8])
})

test('keeps simple-unlit mapping blocked when extracted shader properties prove a custom effect', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_Body'])
  const shader = candidate.shaders![0]
  candidate.sourceMaterials![0].shaderParsedName = 'FX/General Unlit Texture'
  shader.parsedName = 'FX/General Unlit Texture'
  shader.properties = { m_Props: [{ m_Name: '_MainTex' }, { m_Name: '_MaskTex' }] }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /Unsupported source shader FX\/General Unlit Texture/)
})

test('recognizes only the verified BAAD custom shader versions and blocks non-native behavior', () => {
  for (const rule of CHIBI_CUSTOM_SHADER_ADAPTER_RULES) {
    if (rule.id === 'dsfx-matcap') continue
    const { candidate, prefabPath } = rule.id === 'mx-e-standard' ? makeEStandardCandidate() : makeCustomShaderCandidate(rule)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Custom'))
    const slot = profile.renderers[0].materialSlots[0]
    if (rule.id === 'projectmx-weapon-test1-damage') continue
    if (rule.id === 'mx-e-standard') {
      assert.equal(slot.adapterId, rule.id)
      assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
      assert.equal(slot.eStandardShaderExtraction?.activeVariant, 'dynamic')
      continue
    }
    assert.equal(slot.adapterId, rule.id)
    if (rule.id === 'mx-c-transparent-st') {
      assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
      assert.equal(slot.transparentShaderExtraction?.passes.forward.programHash, MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH)
      assert.equal(slot.transparentShaderExtraction?.passes.dither.programHash, MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH)
      assert.equal(slot.transparentShaderExtraction?.passes.depth.programHash, MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH)
      assert.equal(slot.adapterSettings.transparentVariant, 'forward')
      assert.equal(slot.renderState.depthWrite, false)
      assert.deepEqual(slot.renderState.blend, {
        source: 5, destination: 10, sourceAlpha: 1, destinationAlpha: 10, operation: 0, operationAlpha: 0,
      })
      continue
    }
    if (rule.id === 'mx-unlit-outline') {
      assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
      assert.deepEqual(slot.shaderExtraction?.passes.base, {
        pass: 'base', stateName: 'ForwardLit', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9,
        gpuProgramType: 4, blobIndex: 1, parameterBlobIndex: 0, parameterRecordSha256: hash('3'),
        keywordIndices: [], keywordNames: [], programHash: MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH,
        programDataSha256: MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, programRecordSha256: hash('1'),
        glsl: slot.shaderExtraction!.passes.base.glsl,
        requiredAttributes: ['POSITION', 'TEXCOORD_0'], requiredUniforms: ['_MainTex_ST', '_Tint', '_MainTex'],
        renderState: { zWrite: 1, zTest: 4, culling: 0 },
      })
      assert.equal(slot.shaderExtraction?.passes.outline.programHash, MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH)
      assert.equal(slot.shaderExtraction?.passes.outline.blobIndex, 6)
      assert.equal(slot.shaderExtraction?.passes.outline.renderState.culling, 1)
      assert.deepEqual(slot.adapterSettings.outlineTint, [0.2641509175300598, 0.2641509175300598, 0.2641509175300598, 1])
      assert.equal(slot.adapterSettings.outlineZCorrection, 0)
      continue
    }
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), new RegExp(`${rule.behavior}.*glTF-native output cannot preserve`))
    assert.match(profile.validation.unresolved.join(' '), new RegExp(`Viewer runtime adapter ${rule.id} is required`))
  }
})

test('accepts both exact E-Standard variants and rejects non-boolean source lighting state', () => {
  for (const activeVariant of ['static', 'dynamic'] as const) {
    const { candidate, prefabPath } = makeEStandardCandidate(activeVariant)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('E-Standard'))
    const slot = profile.renderers[0].materialSlots[0]
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.equal(slot.adapterId, 'mx-e-standard')
    assert.equal(slot.eStandardShaderExtraction?.activeVariant, activeVariant)
  }

  const tampered = makeEStandardCandidate()
  const forwardState = tampered.candidate.shaders![0].subShaders![0].passes![0].state as Record<string, unknown>
  forwardState.lighting = 0
  const blocked = buildChibiRenderingProfile(tampered.candidate, tampered.prefabPath, emptyChibiProfile('E-Standard'))
  assert.equal(blocked.validation.valid, false)
  assert.match(blocked.validation.unresolved.join(' '), /lighting state is not false/)
})

test('fails closed for MX/Unlit Outline identity, pass, hash, and keyword mismatches', () => {
  const tampered = (change: (shader: InventoryShader) => void, expected: RegExp) => {
    const rule = CHIBI_CUSTOM_SHADER_ADAPTER_RULES.find(item => item.id === 'mx-unlit-outline')!
    const { candidate, prefabPath } = makeCustomShaderCandidate(rule)
    change(candidate.shaders![0])
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Custom'))
    assert.equal(profile.renderers[0].materialSlots[0].adapterId, 'mx-unlit-outline')
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), expected)
  }

  tampered(shader => { shader.extraction!.shader.name = 'MX/Unlit Outline/Unverified' }, /extraction identity is not MX\/Unlit Outline/)
  tampered(shader => { shader.extraction!.bindings[1].stateName = 'Forward' }, /outline pass has 0 exact GLES3 no-keyword bindings/)
  tampered(shader => { shader.extraction!.gles3Programs[0].programDataSha256 = '0'.repeat(64) }, /base pass program hash does not match/)
  tampered(shader => { shader.extraction!.bindings[1].keywordNames = ['FOG_LINEAR'] }, /outline pass selects shader keywords/)
})

test('does not trust a custom shader name when its source program identity changes', () => {
  const rule = CHIBI_CUSTOM_SHADER_ADAPTER_RULES[0]
  const { candidate, prefabPath } = makeCustomShaderCandidate(rule)
  candidate.shaders![0].programBlobSha256 = '0'.repeat(64)
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Custom'))
  const slot = profile.renderers[0].materialSlots[0]
  assert.equal(slot.adapterId, null)
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /not verified for adapter mx-c-transparent-st.*program identity does not match/)
  assert.doesNotMatch(profile.validation.unresolved.join(' '), /gltf-native output/)
})

test('accepts only the exact source Glitch_Tex Forward/Shadow program pair and material state', () => {
  const { candidate, prefabPath } = makeGlitchTexCandidate()
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Glitch'))
  const slot = profile.renderers[0].materialSlots[0]
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(slot.adapterId, 'dsfx-glitch-tex')
  assert.equal(slot.glitchShaderExtraction?.passes.forward.programHash, DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH)
  assert.equal(slot.glitchShaderExtraction?.passes.shadow.programHash, DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH)
  assert.deepEqual(slot.materialProperties.floats, { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 })
  assert.deepEqual(slot.materialProperties.textures?.map(texture => [texture.name, texture.textureReference?.objectId ?? null]), [['_MainTex', null], ['_NoiseTex', '277634516359511144']])
  assert.equal(slot.renderState.depthTest, true)
  assert.equal(slot.renderState.cullMode, 'back')
  assert.deepEqual(slot.renderState.blend, { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 })
})

test('fails closed for Glitch_Tex blob, active-keyword, pass, and exact-noise tampering', () => {
  const tampered = (change: (candidate: SourceCandidate) => void, expected: RegExp) => {
    const { candidate, prefabPath } = makeGlitchTexCandidate()
    change(candidate)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Glitch'))
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), expected)
  }
  tampered(candidate => { candidate.shaders![0].programBlobSha256 = '0'.repeat(64) }, /not verified for adapter dsfx-glitch-tex.*source extraction metadata|program identity/)
  tampered(candidate => { candidate.sourceMaterials![0].keywords = ['INSTANCING_ON'] }, /not verified for adapter dsfx-glitch-tex.*shader keywords are active/)
  tampered(candidate => { candidate.shaders![0].extraction!.bindings[1].stateName = 'Forward' }, /not verified for adapter dsfx-glitch-tex.*source extraction Glitch_Tex shadow record/)
  tampered(candidate => { candidate.sourceMaterials![0].textures![1].textureReference!.objectId = '999' }, /not verified for adapter dsfx-glitch-tex.*_NoiseTex does not match/)
})

test('accepts only the exact DSFX Matcap shader extraction and material state', () => {
  const { candidate, prefabPath } = makeMatcapCandidate()
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Matcap'))
  const slot = profile.renderers[0].materialSlots[0]
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(slot.adapterId, 'dsfx-matcap')
  assert.equal(slot.matcapShaderExtraction?.passes.forward.programHash, DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH)
  assert.equal(slot.matcapShaderExtraction?.passes.forwardInstanced.programHash, DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH)
  assert.equal(slot.matcapShaderExtraction?.passes.shadow.programHash, DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH)
  assert.equal(slot.matcapShaderExtraction?.passes.shadowInstanced.programHash, DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH)
  assert.deepEqual(slot.materialProperties.floats, { ...DSFX_MATCAP_INERT_FLOAT_PROPERTIES, _ZWrite_Mode: 1, _Cull_Mode: 2 })
  assert.deepEqual(slot.materialProperties.colors, { ...DSFX_MATCAP_INERT_COLOR_PROPERTIES, _Main_Color: {
    r: DSFX_MATCAP_MAIN_COLOR[0], g: DSFX_MATCAP_MAIN_COLOR[1], b: DSFX_MATCAP_MAIN_COLOR[2], a: DSFX_MATCAP_MAIN_COLOR[3],
  } })
  assert.deepEqual(slot.materialProperties.colors?._Main_Color, {
    r: DSFX_MATCAP_MAIN_COLOR[0], g: DSFX_MATCAP_MAIN_COLOR[1], b: DSFX_MATCAP_MAIN_COLOR[2], a: DSFX_MATCAP_MAIN_COLOR[3],
  })
  assert.deepEqual(slot.materialProperties.textures?.map(texture => [texture.name, texture.textureReference?.objectId ?? null]), [
    ['_Main_Tex', DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.objectId], ['_Matcap_Tex', DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.objectId], ['_texcoord', null],
  ])
  assert.deepEqual(slot.adapterSettings.baseColorTint, [...DSFX_MATCAP_MAIN_COLOR])
  assert.equal(slot.renderState.sourceQueue, -1)
  assert.equal(slot.renderState.depthWrite, true)
  assert.equal(slot.renderState.cullMode, 'back')
  assert.deepEqual(slot.renderState.blend, { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 })
})

test('fails closed for DSFX Matcap extraction, material, source-state, and queue tampering', () => {
  const tampered = (change: (candidate: SourceCandidate) => void, expected: RegExp) => {
    const { candidate, prefabPath } = makeMatcapCandidate()
    change(candidate)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Matcap'))
    assert.equal(profile.renderers[0].materialSlots[0].adapterId, 'dsfx-matcap')
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), expected)
  }
  tampered(candidate => { candidate.shaders![0].extraction!.gles3Programs[0].programHash = '0'.repeat(64) }, /source extraction Matcap static forward record/)
  tampered(candidate => {
    const extraction = candidate.shaders![0].extraction!
    for (const programs of [extraction.programs, extraction.gles3Programs]) {
      const pass = programs.find(program => program.blobIndex === 3)
      if (pass?.glsl) pass.glsl = pass.glsl.replaceAll('hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_ObjectToWorld')
    }
  }, /source extraction Matcap instanced forward source is missing hlslcc_mtx4x4unity_ObjectToWorldArray/)
  tampered(candidate => { candidate.sourceMaterials![0].keywords = ['INSTANCING_ON'] }, /shader keywords are active/)
  tampered(candidate => { candidate.shaders![0].subShaders![0].passes[0].state = { ...(candidate.shaders![0].subShaders![0].passes[0].state as object), m_Tags: { tags: [['LIGHTMODE', 'Wrong']] } } }, /Forward render state or tags/)
  tampered(candidate => { candidate.sourceMaterials![0].renderQueue = 3000 }, /translated render state is not the verified Matcap state/)
  tampered(candidate => { candidate.sourceMaterials![0].floatProperties = { _ZWrite_Mode: 1, _Cull_Mode: 2, _Unexpected: 0 } }, /scalar\/color properties do not match/)
  tampered(candidate => { candidate.sourceMaterials![0].floatProperties!._Metallic = 0 }, /scalar\/color properties do not match/)
  tampered(candidate => { candidate.sourceMaterials![0].colorProperties!._SpecColor = { ...DSFX_MATCAP_INERT_COLOR_PROPERTIES._SpecColor, r: 0.5 } }, /scalar\/color properties do not match/)
  tampered(candidate => {
    const pass = candidate.shaders![0].extraction!.gles3Programs.find(program => program.blobIndex === 2)
    if (pass?.glsl) pass.glsl += '\nuniform float _Metallic;'
  }, /source extraction GLSL declares or consumes inert Matcap property _Metallic/)
})

test('accepts source-exact ProjectMX WeaponTest1Damage no-keyword and glow variants', () => {
  for (const variant of ['forward', 'glow'] as const) {
    const { candidate, prefabPath } = makeProjectMxCandidate(variant)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('ProjectMX'))
    const slot = profile.renderers[0].materialSlots[0]
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.equal(slot.adapterId, 'projectmx-weapon-test1-damage')
    assert.equal(slot.projectMxShaderExtraction?.activeVariant, variant)
    assert.deepEqual(slot.projectMxShaderExtraction?.activeKeywordNames, variant === 'glow' ? ['_GLOW_0'] : [])
    assert.deepEqual(slot.projectMxShaderExtraction?.requiredTextureProperties, ['_mainTex', '_sourceTex'])
    assert.equal(slot.projectMxShaderExtraction?.passes.forward.programHash, '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0')
    assert.equal(slot.projectMxShaderExtraction?.passes.glow.programHash, '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61')
    assert.equal(slot.projectMxShaderExtraction?.passes.outline.stateName, 'Outline')
    assert.equal(slot.projectMxShaderExtraction?.passes.solidOutline.stateName, 'Solid Color Outline')
    assert.equal(slot.projectMxShaderExtraction?.passes.shadow.stateName, 'ShadowCaster')
    assert.equal(slot.projectMxShaderExtraction?.passes.depth.stateName, 'DepthOnly')
    assert.equal(slot.projectMxShaderExtraction?.passes.depth.renderState.colorMask, 0)
    assert.equal(slot.projectMxShaderExtraction?.passes.forward.usesNoiseTexture, false)
    assert.deepEqual(slot.adapterSettings.baseColorTint, [1, 1, 1, 1])
    assert.deepEqual(slot.renderState.blend, {
      source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0,
    })
  }
})

test('fails closed for ProjectMX extraction identity, pass, hash, property, and keyword mismatches', () => {
  const tampered = (change: (candidate: SourceCandidate) => void, expected: RegExp) => {
    const { candidate, prefabPath } = makeProjectMxCandidate()
    change(candidate)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('ProjectMX'))
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), expected)
  }

  tampered(candidate => { delete candidate.shaders![0].extraction }, /source shader extraction is missing/)
  tampered(candidate => { candidate.shaders![0].extraction!.fingerprint = hash('0') }, /extraction fingerprint is not the verified ProjectMX version/)
  tampered(candidate => { candidate.shaders![0].extraction!.gles3Programs[0].programDataSha256 = hash('0') }, /forward pass program record does not match/)
  tampered(candidate => { (candidate.shaders![0].subShaders![0].passes[1].state as { culling?: unknown }).culling = { val: 2 } }, /shader pass 1 culling state is not 1/)
  tampered(candidate => { candidate.shaders![0].properties = { m_Props: PROJECTMX_WEAPON_REQUIRED_PROPERTIES.slice(0, -1).map(m_Name => ({ m_Name })) } }, /shader declarations do not match the verified ProjectMX set/)
  tampered(candidate => { candidate.sourceMaterials![0].keywords = ['_DITHER_HORIZONTAL_LINES'] }, /unsupported shader keywords are active/)
  tampered(candidate => { candidate.shaders![0].extraction!.bindings.find(binding => binding.blobIndex === 32)!.keywordNames = ['FOG_LINEAR'] }, /forward pass has 0 exact GLES3 source bindings/)
})

test('rejects ProjectMX damage, fire, and dither dynamic states', () => {
  for (const property of ['_DamageON', '_Damage', '_Fire', '_IsDither']) {
    const { candidate, prefabPath } = makeProjectMxCandidate()
    candidate.sourceMaterials![0].floatProperties![property] = 1
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('ProjectMX'))
    assert.equal(profile.renderers[0].materialSlots[0].adapterId, 'projectmx-weapon-test1-damage')
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), new RegExp(`${property} dynamic gate is active`))
  }
})

test('accepts the three source-proven static DSFX shader variants for Hoshino and Miyako', () => {
  const cases = [
    { rule: CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0], identity: 'hoshino_original', materialName: 'FX_MAT_Hoshino_Logo_01' },
    { rule: CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1], identity: 'mashiro_original', materialName: 'FX_MAT_White_04' },
    { rule: CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2], identity: 'miyako_original', materialName: 'FX_MAT_Rect_Glow_01d', floats: {
      _CameraFadingEnabled: 0, _CameraFarFadeDistance: 2, _CameraNearFadeDistance: 1,
      _DistortionEnabled: 0, _DistortionStrength: 1, _DistortionStrengthScaled: 0.1,
      _SoftParticlesEnabled: 0, _SoftParticlesFarFadeDistance: 1, _SoftParticlesNearFadeDistance: 0,
      _FlipbookBlending: 0, _FlipbookMode: 0, _EmissionEnabled: 0, _LightingEnabled: 0,
    } },
  ] as const
  for (const item of cases) {
    const { candidate, prefabPath } = makeDsfxCandidate(item.rule, item)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile(item.identity))
    const slot = profile.renderers[0].materialSlots[0]
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.equal(slot.adapterId, 'dsfx-static')
    assert.equal(slot.materialProperties.resolvedTextures?.[0].sourceReference?.objectId, '300')
    assert.deepEqual(slot.renderState.blend, {
      source: item.rule.renderState.blend.source,
      destination: item.rule.renderState.blend.destination,
      sourceAlpha: item.rule.renderState.blend.sourceAlpha,
      destinationAlpha: item.rule.renderState.blend.destinationAlpha,
      operation: 0,
      operationAlpha: 0,
    })
  }
})

test('fails closed for Additive_0 extraction, material, texture, and source-state tampering', () => {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0]
  const cases = [
    ['program', (candidate: SourceCandidate) => { candidate.shaders![0].extraction!.gles3Programs[0].programHash = '0'.repeat(64) }],
    ['binding', (candidate: SourceCandidate) => { candidate.shaders![0].extraction!.bindings[0].parameterRecordSha256 = '0'.repeat(64) }],
    ['glsl', (candidate: SourceCandidate) => { candidate.shaders![0].extraction!.gles3Programs[0].glsl += '\nuniform float _Time;\n' }],
    ['property', (candidate: SourceCandidate) => { candidate.sourceMaterials![0].floatProperties!._Main_Texture_No = 1 }],
    ['scalar', (candidate: SourceCandidate) => { candidate.sourceMaterials![0].floatProperties!._ZTest_Mode = 3 }],
    ['texture', (candidate: SourceCandidate) => { candidate.sourceMaterials![0].textures[0].texture!.pathId = '6' }],
    ['state', (candidate: SourceCandidate) => { (candidate.shaders![0].subShaders![0].passes[0].state as any).m_Tags.tags[0][1] = 'ForwardBase' }],
  ] as const
  for (const [name, mutate] of cases) {
    const { candidate, prefabPath } = makeDsfxCandidate(rule)
    mutate(candidate)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('dsfx_fixture'))
    assert.equal(profile.validation.valid, false, `${name} tamper unexpectedly passed`)
    assert.match(profile.validation.unresolved.join(' '), /Additive_0|verified static adapter|source identity|texture|scalar|render state/)
  }
})

test('fails closed for AlphaBlend_Add identity, extraction, property, state, and variant tampering', () => {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1]
  const cases = [
    ['identity', (candidate: SourceCandidate) => { candidate.shaders![0].sourceReference!.objectId = '3898777625326355544' }],
    ['hash', (candidate: SourceCandidate) => { candidate.shaders![0].programBlobSha256 = '0'.repeat(64) }],
    ['extraction', (candidate: SourceCandidate) => { candidate.shaders![0].extraction!.gles3Programs[0].programHash = '0'.repeat(64) }],
    ['property', (candidate: SourceCandidate) => { candidate.sourceMaterials![0].floatProperties!._RGBRGBA = 1 }],
    ['state', (candidate: SourceCandidate) => { (candidate.shaders![0].subShaders![0].passes[0].state as any).rtBlend0.destBlend.val = 9 }],
    ['variant', (candidate: SourceCandidate) => { candidate.sourceMaterials![0].floatProperties!._Cull_Mode = 1 }],
    ['dynamic', (candidate: SourceCandidate) => { candidate.shaders![0].extraction!.gles3Programs[0].glsl += '\nuniform float _Time;\n' }],
  ] as const
  for (const [name, mutate] of cases) {
    const { candidate, prefabPath } = makeDsfxCandidate(rule, { renderStateVariant: 'depth-tested-off-double-sided' })
    mutate(candidate)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('mashiro_original'))
    assert.equal(profile.validation.valid, false, `${name} tamper unexpectedly passed`)
    assert.match(profile.validation.unresolved.join(' '), /AlphaBlend_Add|verified static adapter|source identity|program|property|state|variant|dynamic/)
  }
})

test('accepts Wakamo AlphaBlend_Add eyes only with the exact white-default source material and canceled UV-offset gate', () => {
  const fixture = makeWakamoEyeAlphaBlendAddCandidate()
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('wakamo_original'))
  const slot = profile.renderers[0].materialSlots[0]
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(slot.dsfxMaterialVariant, 'wakamo-eye-white-default')
  assert.equal(slot.dsfxRenderStateVariant, 'depth-tested-back-cull')
  assert.deepEqual(slot.materialProperties.resolvedTextures, [])
  assert.equal(slot.materialProperties.floats?._Custom_Data_Offset_Use, 1)
  assert.equal(slot.materialProperties.floats?._Main_Texture_No, 1)
})

test('fails closed on Wakamo white-default material references, shader defaults, gates, texture state, and stale properties', () => {
  const cases: [string, (fixture: ReturnType<typeof makeWakamoEyeAlphaBlendAddCandidate>) => void][] = [
    ['material reference', fixture => { fixture.candidate.sourceMaterials![0].sourceReference!.objectId = '1142847250617954325' }],
    ['shader reference', fixture => { fixture.candidate.sourceMaterials![0].shaderReference!.objectId = '3898777625326355544' }],
    ['white default name', fixture => { ((fixture.candidate.shaders![0].properties as any).m_Props[2].m_DefTexture).m_DefaultName = 'black' }],
    ['white default dimension', fixture => { ((fixture.candidate.shaders![0].properties as any).m_Props[2].m_DefTexture).m_TexDim = 3 }],
    ['extra declared material property', fixture => { (fixture.candidate.shaders![0].properties as any).m_Props.push({ m_Name: '_GlossyReflections' }) }],
    ['shader consumes stale Standard property', fixture => {
      const program = fixture.candidate.shaders![0].extraction!.gles3Programs[0]
      const token = '_GlossyReflections'
      program.glsl = (program.glsl ?? '').slice(0, -token.length) + token
    }],
    ['custom offset gate', fixture => { fixture.candidate.sourceMaterials![0].floatProperties!._Custom_Data_Offset_Use = 0 }],
    ['main texture gate', fixture => { fixture.candidate.sourceMaterials![0].floatProperties!._Main_Texture_No = 0 }],
    ['source render queue', fixture => { fixture.candidate.sourceMaterials![0].renderQueue = 3000 }],
    ['null pointer', fixture => { fixture.candidate.sourceMaterials![0].textures[0].texture!.pathId = '1' }],
    ['pointer identity', fixture => { fixture.candidate.sourceMaterials![0].textures[0].texture!.file = 'CAB-other' }],
    ['texture transform', fixture => { fixture.candidate.sourceMaterials![0].textures[0].scale!.x = 2 }],
    ['stale scalar', fixture => { fixture.candidate.sourceMaterials![0].floatProperties!._Glossiness = 1 }],
    ['stale color', fixture => { fixture.candidate.sourceMaterials![0].colorProperties!._SpecColor!.g = 0.25 }],
    ['resolved texture', fixture => { (fixture.candidate.sourceMaterials![0] as any).resolvedTextures = [{ property: '_Texture' }] }],
  ]
  for (const [name, mutate] of cases) {
    const fixture = makeWakamoEyeAlphaBlendAddCandidate()
    mutate(fixture)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('wakamo_original'))
    assert.equal(profile.validation.valid, false, `${name} tamper unexpectedly passed`)
    assert.match(profile.validation.unresolved.join(' '), /AlphaBlend_Add|source-proven Wakamo|white 2D|material scalars|material _Texture|candidate closure/)
  }
  const generic = makeDsfxCandidate(CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1])
  generic.candidate.sourceMaterials![0].floatProperties!._Custom_Data_Offset_Use = 1
  generic.candidate.sourceMaterials![0].floatProperties!._Main_Texture_No = 1
  const genericProfile = buildChibiRenderingProfile(generic.candidate, generic.prefabPath, emptyChibiProfile('generic_alpha_add'))
  assert.equal(genericProfile.validation.valid, false)
  assert.match(genericProfile.validation.unresolved.join(' '), /alphablend_add.*scalar properties/i)
})

test('accepts only the exact AlphaBlend_0 depth-tested render-state variants', () => {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2]
  const cases = [
    { variant: 'depth-tested-back-cull' as const, depthTest: true, depthFunction: 'less-equal', cullMode: 'back' as const, doubleSided: false },
    { variant: 'depth-tested-off-double-sided' as const, depthTest: true, depthFunction: 'less-equal', cullMode: 'off' as const, doubleSided: true },
  ]
  for (const item of cases) {
    const { candidate, prefabPath } = makeDsfxCandidate(rule, { renderStateVariant: item.variant })
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('alpha_blend_fixture'))
    const slot = profile.renderers[0].materialSlots[0]
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.equal(slot.dsfxRenderStateVariant, item.variant)
    assert.equal(slot.renderState.depthTest, item.depthTest)
    assert.equal(slot.renderState.depthFunction, item.depthFunction)
    assert.equal(slot.renderState.cullMode, item.cullMode)
    assert.equal(slot.renderState.doubleSided, item.doubleSided)
  }
})

test('rejects AlphaBlend_0 render-state values outside the proven variants', () => {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2]
  const cases: Record<string, number>[] = [
    { _ZTest_Mode: 3 },
    { _Cull_Mode: 1 },
  ]
  for (const floats of cases) {
    const { candidate, prefabPath } = makeDsfxCandidate(rule, { renderStateVariant: 'depth-tested-back-cull', floats })
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('alpha_blend_fixture'))
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), /translated render state is not a verified static state variant/)
  }
})

test('accepts only source-proven inert stale properties on DSFX AlphaBlend_0', () => {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2]
  for (const [property, value] of [
    ['_GlossyReflections', 1],
    ['_EnvironmentReflections', 1],
    ['_LightingEnabled', 1],
    ['_OcclusionStrength', 0.75],
    ['_SpecularHighlights', 1],
  ] as const) {
    const { candidate, prefabPath } = makeDsfxCandidate(rule, { floats: { [property]: value } })
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('dsfx_fixture'))
    const slot = profile.renderers[0].materialSlots[0]
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.equal(slot.adapterId, 'dsfx-static')
    assert.equal(slot.dsfxShaderExtraction?.gles3Programs.length, 4)
  }
  for (const [property, value] of [
    ['_EmissionColor', { r: 1, g: 0.5, b: 0.25, a: 1 }],
    ['_SpecColor', { r: 0.1, g: 0.2, b: 0.3, a: 1 }],
  ] as const) {
    const { candidate, prefabPath } = makeDsfxCandidate(rule)
    candidate.sourceMaterials![0].colorProperties = {
      ...candidate.sourceMaterials![0].colorProperties,
      [property]: value,
    }
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('dsfx_fixture'))
    const slot = profile.renderers[0].materialSlots[0]
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.equal(slot.adapterId, 'dsfx-static')
    assert.equal(slot.dsfxShaderExtraction?.gles3Programs.length, 4)
  }
})

test('fails closed when the DSFX AlphaBlend_0 extraction is missing, incomplete, or declares an inert property', () => {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2]
  const missing = makeDsfxCandidate(rule)
  delete missing.candidate.shaders![0].extraction
  let profile = buildChibiRenderingProfile(missing.candidate, missing.prefabPath, emptyChibiProfile('dsfx_fixture'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /source shader extraction is missing/)

  const incomplete = makeDsfxCandidate(rule)
  incomplete.candidate.shaders![0].extraction!.gles3Programs.pop()
  profile = buildChibiRenderingProfile(incomplete.candidate, incomplete.prefabPath, emptyChibiProfile('dsfx_fixture'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /has 3 GLES3 programs, expected 4/)

  for (const property of [
    '_GlossyReflections', '_EnvironmentReflections', '_LightingEnabled',
    '_OcclusionStrength', '_SpecularHighlights', '_EmissionColor', '_SpecColor',
  ]) {
    const declared = makeDsfxCandidate(rule)
    declared.candidate.shaders![0].extraction!.gles3Programs[0].glsl += `\nuniform float ${property};\n`
    profile = buildChibiRenderingProfile(declared.candidate, declared.prefabPath, emptyChibiProfile('dsfx_fixture'))
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), new RegExp(`declares or consumes inert property ${property}`))
  }

  const dynamic = makeDsfxCandidate(rule, { floats: { _DistortionEnabled: 1 } })
  profile = buildChibiRenderingProfile(dynamic.candidate, dynamic.prefabPath, emptyChibiProfile('dsfx_fixture'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /_DistortionEnabled dynamic gate is active/)
})

test('keeps generic DSFX dynamic detection for stale color fields outside AlphaBlend_0', () => {
  const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1]
  const { candidate, prefabPath } = makeDsfxCandidate(rule)
  candidate.sourceMaterials![0].colorProperties = {
    ...candidate.sourceMaterials![0].colorProperties,
    _SpecColor: { r: 1, g: 0.5, b: 0.25, a: 1 },
  }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('dsfx_fixture'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /material texture properties do not match|not verified for static adapter/)
})

test('rejects dynamic or unresolved DSFX variants instead of guessing a static path', () => {
  const cases = [
    { materialName: 'Gra_FX', floats: { _DistortionEnabled: 1, _DistortionStrength: 1 } },
    { materialName: 'Noise_FX', floats: { _Custom_Data_Use: 0, _Main_Speed_X: -0.5, _Vertex_Offset: 0.1 } },
    { materialName: 'GuardTower_FX', floats: { _GlitchIntensity: 1 } },
    { materialName: 'Wakamo_Eye_FX', missingTexture: true },
  ] as const
  for (const item of cases) {
    const { candidate, prefabPath } = makeDsfxCandidate(CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1], item)
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('dsfx_fixture'))
    assert.equal(profile.renderers[0].materialSlots[0].adapterId, 'dsfx-static')
    assert.equal(profile.validation.valid, false)
    assert.match(profile.validation.unresolved.join(' '), 'missingTexture' in item && item.missingTexture ? /exact _Texture reference is missing/ : /not verified for static adapter/)
  }
})

test('rejects a static DSFX identity when its verified program changes', () => {
  const { candidate, prefabPath } = makeDsfxCandidate(CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0])
  candidate.shaders![0].programBlobSha256 = '0'.repeat(64)
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('dsfx_fixture'))
  assert.equal(profile.renderers[0].materialSlots[0].adapterId, null)
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /not verified for static adapter.*program identity does not match/)
})

test('does not apply stale serialized color to source Unlit/Texture', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_Body'])
  const material = candidate.sourceMaterials![0]
  const shader = candidate.shaders![0]
  material.shaderParsedName = 'Unlit/Texture'
  material.colorProperties = { _Color: { r: 0.2, g: 0.4, b: 0.6, a: 1 } }
  material.floatProperties = { ...material.floatProperties, _ZWrite: 1 }
  shader.parsedName = material.shaderParsedName
  shader.properties = { m_Props: [{ m_Name: '_MainTex' }] }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.renderers[0].materialSlots[0].adapterId, 'gltf-native')
  assert.equal(profile.renderers[0].materialSlots[0].adapterSettings.baseColorTint, null)
})

test('keeps source object identities exact above JavaScript safe integer range', () => {
  const first = reference(hash('a'), 'CAB-prefab', '9007199254740993')
  const second = reference(hash('a'), 'CAB-prefab', '9007199254740992')
  assert.notEqual(sourceObjectKey(first), sourceObjectKey(second))
  assert.equal(sourceObjectKey(first), `${hash('a')}:cab-prefab:9007199254740993`)
})

test('retains ordinary, horizontally flipped, negative-flip, and source-default mouth events', () => {
  const clip = 'Haruna_Original_Cafe_Idle'
  const { candidate, prefabPath } = makeCandidate('haruna_original', [
    'Haruna_Body', 'Haruna_Face', 'Haruna_EyeMouth', 'Haruna_Hair', 'Haruna_Eyebrow',
  ], {
    mouthSlot: 2,
    defaultUV: { x: 0.125, y: 0.625 },
    events: [
      { clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 704 },
      { clip, time: 0.2, function: 'SetHorizontallyFlippedMouthTile', string: '', float: 0, int: 704 },
      { clip, time: 0.3, function: 'SetMouthTile', string: '', float: 0, int: -704 },
      { clip, time: 0.4, function: 'SetMouthTileToDefault', string: '', float: 0, int: 0 },
    ],
  })
  const interaction = emptyChibiProfile('Haruna')
  interaction.initialPose = clip
  interaction.interactions.idle = { state: 'available', clip, loop: true, hold: false }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, interaction)
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.mouth?.events, [
    { clip, time: 0.1, tile: 704, flipX: false },
    { clip, time: 0.2, tile: 704, flipX: true },
    { clip, time: 0.3, tile: 704, flipX: true },
    { clip, time: 0.4, tile: 501, flipX: false },
  ])
})

test('keeps the authored mouth grid when shader defaults and animation tiles suggest a larger grid', () => {
  const clip = 'Example_Cafe_Idle'
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], {
    mouthSlot: 0,
    defaultUV: { x: 0.25, y: 0.5 },
    events: [{ clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 404 }],
  })
  setMouthGridEvidence(candidate, { serializedColumns: 4, serializedRows: 4 })
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = clip
  interaction.interactions.idle = { state: 'available', clip, loop: true, hold: false }

  const profile = buildChibiRenderingProfile(candidate, prefabPath, interaction)
  assert.equal(profile.validation.valid, false)
  assert.equal(profile.mouth?.columns, 4)
  assert.equal(profile.mouth?.rows, 4)
  assert.equal(profile.mouth?.defaultTile, 201)
  assert.match(profile.validation.unresolved.join(' '), /Mouth tile 404 is outside the 4x4 source atlas/)
  assert.deepEqual(profile.mouth?.events, [{ clip, time: 0.1, tile: 404, flipX: false }])
})

test('keeps a conflicting serialized mouth grid blocked when shader declaration evidence is missing', () => {
  const clip = 'Example_Cafe_Idle'
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], {
    mouthSlot: 0,
    defaultUV: { x: 0.25, y: 0.5 },
    events: [{ clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 404 }],
  })
  setMouthGridEvidence(candidate, { serializedColumns: 4, serializedRows: 4 })
  candidate.shaders![0].properties = { m_Props: [] }
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = clip
  interaction.interactions.idle = { state: 'available', clip, loop: true, hold: false }

  const profile = buildChibiRenderingProfile(candidate, prefabPath, interaction)
  assert.equal(profile.validation.valid, false)
  assert.equal(profile.mouth?.columns, 4)
  assert.equal(profile.mouth?.rows, 4)
  assert.match(profile.validation.unresolved.join(' '), /Mouth tile 404 is outside the 4x4 source atlas/)
})

test('does not promote a normal material when its selected mouth values fit the serialized grid', () => {
  const clip = 'Example_Cafe_Idle'
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], {
    mouthSlot: 0,
    defaultUV: { x: 0.25, y: 0.5 },
    events: [{ clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 201 }],
  })
  setMouthGridEvidence(candidate, { serializedColumns: 4, serializedRows: 4 })
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = clip
  interaction.interactions.idle = { state: 'available', clip, loop: true, hold: false }

  const profile = buildChibiRenderingProfile(candidate, prefabPath, interaction)
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.mouth?.columns, 4)
  assert.equal(profile.mouth?.rows, 4)
  assert.equal(profile.mouth?.defaultTile, 201)
})

test('binds a child-renderer event only from an exact full source reference', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } })
  const rendererReference = candidate.assembly![0].renderers[0].sourceReference!
  candidate.events = [{
    clip: 'Example_Cafe_Idle', time: 0.25, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 99,
    targetReference: rendererReference,
  }]
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = 'Example_Cafe_Idle'
  interaction.interactions.idle = { state: 'available', clip: 'Example_Cafe_Idle', loop: true, hold: false }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, interaction)
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.childRendererEvents, [{
    clip: 'Example_Cafe_Idle', time: 0.25, action: 'disable', sourceRendererReference: rendererReference, order: 0,
  }])
})

test('binds a unique source shader mouth atlas when the prefab component is unbound', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0, y: 0 } })
  candidate.assembly![0].attachments = { mouthMaterialIndex: -1, mouthDefaultUV: { x: 0, y: 0 } }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.mouth?.materialSlot, 0)
  assert.equal(profile.mouth?.defaultTile, 704)
  assert.deepEqual(profile.mouth?.defaultUV, { x: .5, y: .875 })
})

test('rejects ambiguous source mouth slots instead of guessing an unbound component target', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth', 'Other_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0, y: 0 } })
  candidate.assembly![0].attachments = { mouthMaterialIndex: -1 }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.mouth, null)
  assert.match(profile.validation.unresolved.join(' '), /multiple source material slots/)
})

test('does not match a mouth renderer by serialized file and path when its bundle hash differs', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } })
  candidate.assembly![0].attachments.mouthRenderer![0].sourceReference = reference(hash('b'), 'CAB-prefab', candidate.assembly![0].renderers[0].pathId)
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /Mouth component does not resolve to exactly one source renderer \(0 exact matches\)/)
})

test('rejects conflicting authoritative mouth metadata instead of selecting the first component', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } })
  const rendererReference = candidate.assembly![0].renderers[0].sourceReference!
  candidate.assembly![0].attachments.mouthMetadata = [
    { renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId }, sourceRendererReference: rendererReference, materialIndex: 0, defaultUV: { x: 0.125, y: 0.625 } },
    { renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId }, sourceRendererReference: rendererReference, materialIndex: 1, defaultUV: { x: 0.125, y: 0.625 } },
  ]
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /multiple material slot indices are authoritative/)
})

test('accepts a zero material slot from an exact per-component mouth metadata record', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } })
  const rendererReference = candidate.assembly![0].renderers[0].sourceReference!
  candidate.assembly![0].attachments = {
    mouthMetadata: [{
      renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId, name: 'Example_Body' },
      sourceRendererReference: rendererReference, materialIndex: 0, defaultUV: { x: 0.125, y: 0.625 },
    }],
  }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.mouth?.materialSlot, 0)
})

test('detects a legacy mouth pointer that conflicts with exact metadata', () => {
  const { candidate, prefabPath } = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } })
  const assembly = candidate.assembly![0]
  const rendererReference = assembly.renderers[0].sourceReference!
  const otherReference = reference(hash('a'), 'CAB-prefab', '9007199254740996')
  assembly.renderers.push({
    ...assembly.renderers[0], name: 'Other_Body', pathId: otherReference.objectId, sourceReference: otherReference,
    hierarchyPath: 'Cafe_Example/Other_Body',
  })
  assembly.rendererOrder.push('Other_Body')
  assembly.attachments = {
    mouthRenderer: [{ file: 'CAB-prefab', pathId: otherReference.objectId, name: 'Other_Body' }],
    mouthMetadata: [{
      renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId, name: 'Example_Body' },
      sourceRendererReference: rendererReference, materialIndex: 0, defaultUV: { x: 0.125, y: 0.625 },
    }],
  }
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /multiple source renderer identities are authoritative/)
})

test('preserves per-prefab slot order and different mouth defaults for pilot source profiles', () => {
  const pilots = [
    { identity: 'haruna_original', slots: ['Haruna_Body', 'Haruna_Face', 'Haruna_EyeMouth', 'Haruna_Hair', 'Haruna_Eyebrow'], mouth: 2, uv: { x: 0.125, y: 0.625 }, tile: 501 },
    { identity: 'shun_original', slots: ['Shun_Body', 'Shun_Eyebrow', 'Shun_Face', 'Shun_EyeMouth', 'Shun_Hair'], mouth: 3, uv: { x: 0.5, y: 0.875 }, tile: 704 },
    { identity: 'hoshino_original', slots: ['Hoshino_Face', 'Hoshino_Eyebrow', 'Hoshino_EyeMouth', 'Hoshino_Body', 'Hoshino_Hair'], mouth: 2, uv: { x: 0.25, y: 0.5 }, tile: 402 },
    { identity: 'aris_original', slots: ['Aris_Body', 'Aris_Face', 'Aris_EyeMouth', 'Aris_Eyebrow', 'Aris_Hair'], mouth: 2, uv: { x: 0.5, y: 0.875 }, tile: 704 },
  ]
  for (const pilot of pilots) {
    const { candidate, prefabPath } = makeCandidate(pilot.identity, pilot.slots, { mouthSlot: pilot.mouth, defaultUV: pilot.uv })
    const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile(pilot.identity))
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.deepEqual(profile.renderers[0].materialSlots.map(slot => slot.sourceMaterialName), pilot.slots)
    assert.equal(profile.mouth?.materialSlot, pilot.mouth)
    assert.deepEqual(profile.mouth?.defaultUV, pilot.uv)
    assert.equal(profile.mouth?.defaultTile, pilot.tile)
    assert.equal(profile.renderers[0].materialSlots.find(slot => slot.adapterId === 'mx-character-eyebrow')?.adapterId, 'mx-character-eyebrow')
  }
})

test('rejects conflicting dependencies, missing slot identities, invalid mouth indices, and unmapped child events', () => {
  const slots = ['Example_Body', 'Example_Face', 'Example_EyeMouth']
  const conflict = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 }, conflict: true })
  assert.equal(buildChibiRenderingProfile(conflict.candidate, conflict.prefabPath, emptyChibiProfile('Example')).validation.valid, false)

  const missingSlot = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 }, missingSlotReference: 1 })
  const missingProfile = buildChibiRenderingProfile(missingSlot.candidate, missingSlot.prefabPath, emptyChibiProfile('Example'))
  assert.equal(missingProfile.validation.valid, false)
  assert.match(missingProfile.validation.unresolved.join(' '), /ambiguous material object reference/)

  const invalidMouth = makeCandidate('example', slots, { mouthSlot: -1, defaultUV: { x: 0.125, y: 0.625 } })
  const invalidMouthProfile = buildChibiRenderingProfile(invalidMouth.candidate, invalidMouth.prefabPath, emptyChibiProfile('Example'))
  assert.match(invalidMouthProfile.validation.unresolved.join(' '), /invalid or missing material slot index/)

  const missingMesh = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 } })
  missingMesh.candidate.assembly![0].renderers[0].mesh = null
  missingMesh.candidate.assembly![0].renderers[0].meshSourceReference = null
  const missingMeshProfile = buildChibiRenderingProfile(missingMesh.candidate, missingMesh.prefabPath, emptyChibiProfile('Example'))
  assert.match(missingMeshProfile.validation.unresolved.join(' '), /no source mesh reference/)

  const childEvent: InventoryEvent = { clip: 'Example_Cafe_Idle', time: 0, function: 'AniEvt_EnableChildRenderer', string: '', float: 0, int: 4 }
  const unmapped = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 }, events: [childEvent] })
  const interaction = emptyChibiProfile('Example')
  interaction.initialPose = 'Example_Cafe_Idle'
  interaction.interactions.idle = { state: 'available', clip: 'Example_Cafe_Idle', loop: true, hold: false }
  const unmappedProfile = buildChibiRenderingProfile(unmapped.candidate, unmapped.prefabPath, interaction)
  assert.match(unmappedProfile.validation.unresolved.join(' '), /no exact source renderer-ID binding/)
})

test('rejects ambiguous source assemblies instead of selecting the first match', () => {
  const ambiguous = makeCandidate('example', ['Example_Body'])
  ambiguous.candidate.assembly!.push(structuredClone(ambiguous.candidate.assembly![0]))
  const profile = buildChibiRenderingProfile(ambiguous.candidate, ambiguous.prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /ambiguous source renderer assemblies matched by path/)
  assert.equal(profile.assembly, null)
})

test('rejects duplicate source renderer identities in one selected assembly', () => {
  const duplicate = makeCandidate('example', ['Example_Body'])
  const renderer = duplicate.candidate.assembly![0].renderers[0]
  duplicate.candidate.assembly![0].renderers.push({ ...structuredClone(renderer), hierarchyPath: `${renderer.hierarchyPath}/Duplicate` })
  const profile = buildChibiRenderingProfile(duplicate.candidate, duplicate.prefabPath, emptyChibiProfile('Example'))
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /duplicate source renderer identity/)
})

test('excludes a source-evidenced presentation renderer before unsupported validation', () => {
  const fixture = makeCandidate('policy_fixture', ['Policy_Body'])
  const { candidate, prefabPath } = fixture
  const fx = addPolicyRenderer(fixture, {
    name: 'FX_MESH_Flower_01',
    hierarchyPath: 'Cafe_Policy/Ex_Root/FX_Local_DM/Flower_AnimPos/Flower_01/FX_MESH_Flower_01',
    mesh: { file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID },
  })
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Policy'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.renderers.map(renderer => renderer.name), ['Policy_Fixture_Body'])
  assert.equal(profile.excludedRenderers.length, 1)
  assert.equal(profile.excludedRenderers[0].sourceReference.objectId, fx.sourceReference.objectId)
  assert.equal(profile.excludedRenderers[0].reasonCode, 'PRESENTATION_MESH_10210_OR_HELPER')
  assert.match(profile.excludedRenderers[0].evidence.join(' | '), /ambiguous Unity built-in Quad|effect-scoped|effect family/)
  assert.deepEqual(profile.validation.excludedRenderers, profile.excludedRenderers)
})

test('keeps weak or name-only presentation hints fail-closed', () => {
  const fixture = makeCandidate('weak_policy_fixture', ['Weak_Body'])
  const { candidate, prefabPath } = fixture
  addPolicyRenderer(fixture, {
    name: 'FX_Helper',
    hierarchyPath: 'Cafe_Weak/Characters/FX_Helper',
    materialName: 'Ordinary_Material',
    shaderName: 'Unknown/Shader',
  })
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Weak'))
  assert.equal(profile.excludedRenderers.length, 0)
  assert.equal(profile.renderers.some(renderer => renderer.name === 'FX_Helper'), true)
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /Unsupported source shader Unknown\/Shader/)
})

test('core weapon and exact equipment evidence override presentation-looking FX evidence', () => {
  const fixture = makeCandidate('weapon_policy_fixture', ['Weapon_Body'])
  const { candidate, prefabPath } = fixture
  const fxWeapon = addPolicyRenderer(fixture, {
    name: 'Weapon_Prop',
    hierarchyPath: 'Cafe_Weapon/Ex_Root/FX_Local/Camera/Weapon_Prop',
    equipmentReference: true,
  })
  const profile = buildChibiRenderingProfile(candidate, prefabPath, emptyChibiProfile('Weapon'))
  assert.equal(profile.excludedRenderers.length, 0)
  assert.equal(profile.renderers.some(renderer => renderer.sourceReference?.objectId === fxWeapon.sourceReference.objectId), true)
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /Unsupported source shader DSFX\/FX_SHADER_Unsupported/)
})

test('promotes the five exact-source rootBone weapon ancestor shapes only from full identity', () => {
  const cases = [
    ['10023', 'CH0064_Weapon_Can', 'bone_bottle', ['Bip001_Weapon']],
    ['16012', 'CH0192_Weapon', 'Bone_Chain_1', ['Helper_Root', 'Point022', 'Bip001_Weapon']],
    ['10145', 'CH0356_Weapon_Reload', 'bone_magazine_02', ['Bip001_Weapon']],
    ['10020', 'Koharu_Original_Weapon_Toggle', 'bone_magazine', ['Bip001_Weapon']],
    ['13013', 'FX_Momiji_Original_Weapon', 'bone_magazine_01', ['Bip001_Weapon']],
  ] as const
  for (const [id, name, rootBoneName, ancestorNames] of cases) {
    const fixture = makeCandidate(`exact_source_weapon_ancestor_${id}`, ['Policy_Body'])
    const sourceReference = reference(hash('a'), 'CAB-prefab', id)
    const added = addPolicyRenderer(fixture, {
      name,
      hierarchyPath: `Cafe_Exact_Source/${name}`,
      materialName: `${name}_Material`,
      shaderName: 'MX/C-Weapon',
      rendererType: 'SkinnedMeshRenderer',
      sourceReference,
    })
    const renderer = added.renderer as InventoryAssemblyRenderer & Record<string, unknown>
    const pointer = (pathId: string, pointerName: string) => ({
      file: 'CAB-prefab', pathId, name: pointerName,
      sourceReference: reference(hash('a'), 'CAB-prefab', pathId),
    })
    const rootBone = pointer(`${id}-root`, rootBoneName)
    const ancestors = ancestorNames.map((pointerName, index) => pointer(`${id}-ancestor-${index}`, pointerName))
    renderer.rootBone = rootBone
    renderer.rootBoneAncestry = ancestors
    renderer.rootBoneAncestryComplete = true
    renderer.transformChain = [pointer(`${id}-root-transform`, fixture.candidate.assembly![0].root), pointer(id, name)]
    renderer.boneReferences = [rootBone]
    ;(fixture.candidate.assembly![0].attachments as Record<string, unknown>).mainWeapon = [ancestors.at(-1)]
    if (id === '10023') {
      const mainReference = reference(hash('a'), 'CAB-prefab', `${id}-authored-main`)
      const main = addPolicyRenderer(fixture, {
        name: 'CH0064_Weapon',
        hierarchyPath: 'Cafe_Exact_Source/CH0064_Weapon',
        materialName: 'CH0064_Weapon_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: mainReference,
      })
      main.renderer.rootBone = ancestors.at(-1)
      main.renderer.boneReferences = [ancestors.at(-1)!]
      ;(fixture.candidate.assembly![0].attachments as Record<string, unknown>).equipmentRendererReferences = [mainReference]
    }

    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile(name))
    const evidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === id)
    assert.ok(evidence, name)
    assert.equal(evidence.reasonCode, 'EXACT_SOURCE_WEAPON_ANCESTRY')
    assert.deepEqual(evidence.rootBoneAncestry.map(item => item.name), ancestorNames)
    assert.deepEqual(evidence.matchedAncestorPointers.map(item => item.name), ['Bip001_Weapon'])
    assert.deepEqual(profile.coreRendererBlockers, [])
  }
})

test('fails closed for missing, cross-prefab, or ambiguous exact-source weapon ancestry', () => {
  const buildCase = (suffix: string, mutate: (renderer: InventoryAssemblyRenderer & Record<string, unknown>, attachments: Record<string, unknown>) => void) => {
    const fixture = makeCandidate(`exact_source_weapon_ancestor_negative_${suffix}`, ['Policy_Body'])
    const sourceReference = reference(hash('a'), 'CAB-prefab', `negative-${suffix}`)
    const added = addPolicyRenderer(fixture, {
      name: `Negative_${suffix}_Weapon`,
      hierarchyPath: `Cafe_Negative/${suffix}/Negative_${suffix}_Weapon`,
      materialName: `Negative_${suffix}_Weapon_Material`,
      shaderName: 'MX/C-Weapon',
      rendererType: 'SkinnedMeshRenderer',
      sourceReference,
    })
    const pointer = (pathId: string, pointerName: string, source = sourceReference) => ({
      file: source.serializedFile, pathId, name: pointerName,
      sourceReference: reference(source.bundleSha256, source.serializedFile, pathId),
    })
    const renderer = added.renderer as InventoryAssemblyRenderer & Record<string, unknown>
    const rootBone = pointer(`negative-${suffix}-root`, 'bone_local')
    const ancestor = pointer(`negative-${suffix}-ancestor`, 'Bip001_Weapon')
    renderer.rootBone = rootBone
    renderer.rootBoneAncestry = [ancestor]
    renderer.rootBoneAncestryComplete = true
    renderer.transformChain = [pointer(`negative-${suffix}-transform`, fixture.candidate.assembly![0].root), pointer(sourceReference.objectId, renderer.name)]
    const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
    attachments.mainWeapon = [ancestor]
    mutate(renderer, attachments)
    return { fixture, added }
  }

  const missing = buildCase('missing', (renderer) => {
    renderer.rootBoneAncestry = []
    renderer.rootBoneAncestryComplete = false
  })
  const crossPrefab = buildCase('cross_prefab', (renderer) => {
    const other = reference(hash('z'), 'CAB-other-prefab', 'foreign')
    renderer.rootBoneAncestry = [{
      file: other.serializedFile, pathId: 'foreign-ancestor', name: 'Bip001_Weapon',
      sourceReference: reference(other.bundleSha256, other.serializedFile, 'foreign-ancestor'),
    }]
    renderer.rootBoneAncestryComplete = true
  })
  const ambiguous = buildCase('ambiguous', (renderer, attachments) => {
    const second = reference(hash('a'), 'CAB-prefab', 'negative-ambiguous-ancestor-2')
    renderer.rootBoneAncestry = [
      ...(renderer.rootBoneAncestry as Array<Record<string, unknown>>),
      { file: second.serializedFile, pathId: second.objectId, name: 'Bip001_Weapon', sourceReference: second },
    ]
    attachments.subWeapon = [{
      file: second.serializedFile, pathId: second.objectId, name: 'Bip001_Weapon', sourceReference: second,
    }]
  })

  for (const { fixture, added } of [missing, crossPrefab, ambiguous]) {
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile(added.renderer.name))
    assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
    assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
  }
})

test('blocks visible source-bound weapon/equipment renderers with no exact authored relation', () => {
  const fixture = makeCandidate('missing_equipment_relation_policy', ['Policy_Body'])
  const missing = [
    ['Aris_Original_Weapon', 'Bip001_Weapon'],
    ['Neru_Original_Weapon_Chain', 'bone_chain_01'],
    ['Aru_Newyear_Hagoita', 'bone_Hagoita'],
    ['Hinata_Original_Mk19_Outline', 'bone_carrier'],
  ] as const
  for (const [name, boneName] of missing) {
    const added = addPolicyRenderer(fixture, {
      name,
      hierarchyPath: `Cafe_Missing_Equipment/${name}`,
      materialName: `${name}_Material`,
      shaderName: 'MX/C-Weapon',
      rendererType: 'SkinnedMeshRenderer',
    })
    const bone = { file: 'CAB-policy-bones', pathId: `bone-${added.sourceReference.objectId}`, name: boneName }
    added.renderer.rootBone = bone
    added.renderer.boneReferences = [bone]
  }

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('MissingEquipment'))
  assert.equal(profile.validation.valid, false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.name), missing.map(item => item[0]))
  assert.deepEqual(profile.validation.coreRendererBlockers, profile.coreRendererBlockers)
  for (const blocker of profile.coreRendererBlockers) {
    assert.equal(blocker.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT')
    assert.equal(blocker.sourceMeshReference !== null, true)
    assert.equal(blocker.sourceMaterialReferences.length, 1)
    assert.equal(blocker.sourceShaderReferences.length, 1)
    assert.match(blocker.evidence.join(' | '), /exact source renderer reference/)
    assert.match(blocker.evidence.join(' | '), /exact source mesh reference/)
    assert.match(blocker.evidence.join(' | '), /no authoritative equipment renderer or main\/sub-weapon attachment relation/)
    assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === blocker.sourceReference.objectId), false)
  }
})

test('publishes one otherwise exact core equipment renderer as an attachment warning', () => {
  const fixture = makeCandidate('arrangement_only_equipment_warning', ['Policy_Body'])
  const added = addPolicyRenderer(fixture, {
    name: 'Aru_Original_Hagoita',
    hierarchyPath: 'Cafe_Aru_Original/Aru_Original_Hagoita',
    materialName: 'Aru_Original_Hagoita_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
  })
  const bone = { file: 'CAB-prefab', pathId: 'hagoita-root', name: 'bone_Hagoita' }
  added.renderer.rootBone = bone
  added.renderer.boneReferences = [bone]
  ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = []
  ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('ArrangementOnly'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.equal(profile.warnings.length, 1)
  assert.equal(profile.warnings[0]?.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT')
  assert.equal(profile.warnings[0]?.blocker.sourceReference.objectId, added.sourceReference.objectId)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === added.sourceReference.objectId), true)
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
})

test('keeps exact sibling equipment-branch placement as a warning without clearing unrelated action blockers', () => {
  const create = (mutation?: 'incomplete' | 'foreign' | 'wrong-root' | 'cycle' | 'event-target') => {
    const fixture = makeCandidate('neru_chain_branch', ['Neru_Body'])
    const assembly = fixture.candidate.assembly![0]
    const sourceBundle = hash('a')
    const pointer = (objectId: string, name: string) => ({
      file: 'CAB-prefab',
      pathId: objectId,
      name,
      sourceReference: reference(sourceBundle, 'CAB-prefab', objectId),
    })
    const root = pointer('root-transform', assembly.root)
    const boneRoot = pointer('bone-root', 'bone_root')
    const bip001 = pointer('bip001', 'Bip001')
    const addWeapon = (side: 'R' | 'L') => {
      const name = 'Neru_Weapon_' + side
      const added = addPolicyRenderer(fixture, {
        name,
        hierarchyPath: assembly.root + '/bone_root/Bip001/Bip001_Weapon_' + side + '/' + name,
        materialName: name + '_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(sourceBundle, 'CAB-prefab', 'weapon-renderer-' + side),
      })
      const anchor = pointer('weapon-anchor-' + side, 'Bip001_Weapon_' + side)
      added.renderer.rootBone = anchor
      added.renderer.boneReferences = [anchor, pointer('weapon-bone-' + side, 'bone_Weapon_' + side)]
      added.renderer.transformChain = [root, boneRoot, bip001, anchor, pointer('weapon-transform-' + side, name)]
      ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [root, boneRoot, bip001]
      ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true
      return { ...added, anchor }
    }
    const main = addWeapon('R')
    const sub = addWeapon('L')
    const chain = addPolicyRenderer(fixture, {
      name: 'Neru_Chain',
      hierarchyPath: assembly.root + '/bone_root/bone_acc/Neru_Chain',
      materialName: 'Neru_Chain_Material',
      shaderName: 'MX/C-Weapon',
      rendererType: 'SkinnedMeshRenderer',
      sourceReference: reference(sourceBundle, 'CAB-prefab', 'chain-renderer'),
    })
    const boneAcc = pointer('bone-acc', 'bone_acc')
    chain.renderer.rootBone = pointer('bone-chain-09', 'bone_chain_09')
    chain.renderer.boneReferences = Array.from({ length: 9 }, (_, index) =>
      pointer('bone-chain-' + String(index + 1).padStart(2, '0'), 'bone_chain_' + String(index + 1).padStart(2, '0')))
    chain.renderer.transformChain = [root, boneRoot, boneAcc, pointer('chain-transform', chain.renderer.name)]
    ;(chain.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [root, boneRoot, boneAcc]
    ;(chain.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = mutation !== 'incomplete'
    if (mutation === 'foreign') {
      ;(chain.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [
        root, { ...boneRoot, sourceReference: reference(hash('b'), 'CAB-prefab', boneRoot.pathId!) }, boneAcc,
      ]
    }
    if (mutation === 'cycle') {
      ;(chain.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [root, boneRoot, boneAcc, boneRoot]
    }
    if (mutation === 'wrong-root') {
      const foreignRoot = pointer('other-root-transform', assembly.root)
      sub.renderer.transformChain = [foreignRoot, ...sub.renderer.transformChain!.slice(1)]
      ;(sub.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [foreignRoot, boneRoot, bip001]
    }
    if (mutation === 'event-target') {
      fixture.candidate.events = [{
        clip: fixture.candidate.clips[0]!, time: 0.1, function: 'AniEvt_DisableChildRenderer',
        string: '', float: 0, int: 7, targetReference: chain.sourceReference,
      }]
    } else {
      fixture.candidate.events = [{
        clip: fixture.candidate.clips[0]!, time: 0.1, function: 'AniEvt_DisableChildRenderer',
        string: '', float: 0, int: 7,
      }]
    }
    assembly.attachments = {
      mainWeapon: [main.anchor],
      subWeapon: [sub.anchor],
      equipmentRendererReferences: [main.sourceReference, sub.sourceReference],
    }
    const interaction = emptyChibiProfile('NeruChainBranch')
    interaction.initialPose = fixture.candidate.clips[0]!
    interaction.interactions.idle = { state: 'available', clip: fixture.candidate.clips[0]!, loop: true, hold: false }
    return {
      fixture,
      chain,
      transformRoot: root,
      profile: buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction),
    }
  }

  const valid = create()
  assert.notEqual(valid.transformRoot.pathId, valid.fixture.candidate.assembly![0]?.prefabTarget?.pathId)
  assert.equal(valid.profile.validation.valid, false)
  assert.deepEqual(valid.profile.coreRendererBlockers, [])
  assert.equal(valid.profile.warnings.some(item => item.blocker.sourceReference.objectId === valid.chain.sourceReference.objectId), true)
  assert.equal(valid.profile.renderers.some(item => item.sourceReference?.objectId === valid.chain.sourceReference.objectId), true)
  assert.equal(valid.profile.excludedRenderers.some(item => item.sourceReference.objectId === valid.chain.sourceReference.objectId), false)
  assert.match(valid.profile.validation.unresolved.join(' '), /no exact source renderer-ID binding/)
  assert.equal(valid.profile.validation.unresolved.some(item => /without an exact authored attachment relation/.test(item)), false)

  for (const mutation of ['incomplete', 'foreign', 'wrong-root', 'cycle', 'event-target'] as const) {
    const invalid = create(mutation)
    assert.deepEqual(invalid.profile.warnings, [], mutation)
    assert.equal(invalid.profile.coreRendererBlockers.some(item => item.sourceReference.objectId === invalid.chain.sourceReference.objectId), true, mutation)
  }
})

test('keeps a complete no-ref renderer at a generic main weapon anchor fail-closed', () => {
  const fixture = makeCandidate('generic_main_anchor_attachment_policy', ['Policy_Body'])
  const added = addPolicyRenderer(fixture, {
    name: 'Aru_Original_Weapon',
    hierarchyPath: 'Cafe_Aru_Original/Aru_Original_Weapon',
    materialName: 'Aru_Original_Weapon_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
  })
  const bone = { file: 'CAB-prefab', pathId: 'weapon-root', name: 'Bip001_Weapon' }
  added.renderer.rootBone = bone
  added.renderer.boneReferences = [bone]
  ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = []
  ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('GenericMainAnchor'))
  assert.equal(profile.validation.valid, false)
  assert.deepEqual(profile.warnings, [])
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
  assert.equal(profile.coreRendererBlockers[0]?.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT')
})

test('keeps a no-ref arrangement warning fail-closed when another active renderer shares its exact Bip001_Weapon ancestry', () => {
  const fixture = makeCandidate('shared_generic_weapon_anchor_policy', ['Policy_Body'])
  const added = addPolicyRenderer(fixture, {
    name: 'Aru_Original_Hagoita',
    hierarchyPath: 'Cafe_Aru_Original/Aru_Original_Hagoita',
    materialName: 'Aru_Original_Hagoita_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600005'),
  })
  const anchor = { file: 'CAB-prefab', pathId: 'shared-weapon-anchor', name: 'Bip001_Weapon' }
  const targetBone = { file: 'CAB-prefab', pathId: 'hagoita-root', name: 'bone_Hagoita' }
  added.renderer.rootBone = targetBone
  added.renderer.boneReferences = [targetBone]
  ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [anchor]
  ;(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true

  const sibling = addPolicyRenderer(fixture, {
    name: 'Auxiliary_Renderer',
    hierarchyPath: 'Cafe_Aru_Original/Auxiliary_Renderer',
    materialName: 'Auxiliary_Renderer_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600006'),
  })
  const siblingBone = { file: 'CAB-prefab', pathId: 'auxiliary-root', name: 'bone_auxiliary' }
  sibling.renderer.rootBone = siblingBone
  sibling.renderer.boneReferences = [siblingBone]
  ;(sibling.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = [anchor]
  ;(sibling.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SharedGenericAnchor'))
  assert.deepEqual(profile.warnings, [])
  assert.equal(profile.coreRendererBlockers.some(item => item.sourceReference.objectId === added.sourceReference.objectId), true)
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
})

function saoriInteractionProfile() {
  const profile = emptyChibiProfile('saori_original')
  profile.initialPose = SAORI_ACTIONS.idle
  profile.interactions.idle = { state: 'available', clip: SAORI_ACTIONS.idle, loop: true }
  profile.interactions.walk = { state: 'available', clip: SAORI_ACTIONS.walk, loop: true }
  profile.interactions.pickup = { state: 'available', clip: SAORI_ACTIONS.pickup, hold: true }
  profile.interactions.touch = { state: 'available', clip: SAORI_ACTIONS.touch }
  return profile
}

function saoriSwimsuitInteractionProfile() {
  const profile = emptyChibiProfile('ch0266')
  profile.initialPose = SAORI_SWIM_ACTIONS.idle
  profile.interactions.idle = { state: 'available', clip: SAORI_SWIM_ACTIONS.idle, loop: true }
  profile.interactions.walk = { state: 'available', clip: SAORI_SWIM_ACTIONS.walk, loop: true }
  profile.interactions.pickup = { state: 'available', clip: SAORI_SWIM_ACTIONS.pickup, hold: true }
  profile.interactions.touch = { state: 'available', clip: SAORI_SWIM_ACTIONS.touch }
  return profile
}

test('publishes only Saori original’s exact complete skinned handgun as a core arrangement warning', () => {
  const fixture = makeSaoriHandgunFixture()
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, saoriInteractionProfile())
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.deepEqual(profile.warnings.map(item => item.blocker.sourceReference.objectId), ['6419381600630976971'])
  assert.equal(profile.warnings[0]?.blocker.sourceMeshReference.objectId, '-5266263958877296907')
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === '6419381600630976971'), true)
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === '6419381600630976971'), false)
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === '7518749120114766283'
    && item.classification === 'structurally-bound-equipment'), true)
})

test('keeps Saori handgun attachment unresolved when source completeness or selected actions are uncertain', () => {
  const cases = [
    ['missing mesh', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      fixture.handgun.renderer.meshSourceReference = null
    }],
    ['missing material', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      fixture.candidate.sourceMaterials = fixture.candidate.sourceMaterials!.filter(item => item.sourceReference?.objectId !== SAORI_MATERIAL.objectId)
    }],
    ['missing shader', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      fixture.candidate.shaders = fixture.candidate.shaders!.filter(shader => shader.sourceReference?.objectId !== SAORI_SHADER.objectId)
    }],
    ['missing bones', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      fixture.handgun.renderer.rootBone = null
      fixture.handgun.renderer.boneReferences = []
    }],
    ['foreign prefab bone', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      const foreign = reference(hash('f'), 'CAB-foreign-prefab', '-4468891664348106293')
      fixture.handgun.renderer.rootBone = {
        file: foreign.serializedFile, pathId: foreign.objectId, name: 'bone_Weapon',
      }
    }],
    ['conflicting attachment anchors', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      ;(fixture.candidate.assembly![0].attachments as Record<string, unknown>).mainWeapon = [{
        file: SAORI_CAB_FILE, pathId: 'different-weapon-anchor', name: 'Bip001_Weapon',
      }]
    }],
    ['selected child-renderer event', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      fixture.candidate.events = [{
        clip: SAORI_ACTIONS.pickup, time: 0, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 0,
        targetReference: fixture.handgun.sourceReference,
      }]
    }],
    ...(['idle', 'walk', 'pickup', 'touch'] as const).map(action => [
      `missing ${action} action`,
      (_fixture: ReturnType<typeof makeSaoriHandgunFixture>, interaction: ReturnType<typeof saoriInteractionProfile>) => {
        interaction.interactions[action] = { state: 'unresolved', reason: `No verified ${action} action.` }
      },
    ] as const),
    ...Object.entries(SAORI_ACTIONS).map(([action, clip]) => [
      `missing source ${action} clip`,
      (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
        fixture.candidate.clips = fixture.candidate.clips.filter(item => item !== clip)
      },
    ] as const),
    ['foreign source revision', (fixture: ReturnType<typeof makeSaoriHandgunFixture>) => {
      fixture.candidate.fingerprint = hash('f')
    }],
  ] as const

  for (const [label, mutate] of cases) {
    const fixture = makeSaoriHandgunFixture()
    const interaction = saoriInteractionProfile()
    mutate(fixture, interaction)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
    assert.equal(profile.validation.valid, false, label)
    assert.deepEqual(profile.warnings, [], label)
    assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === '6419381600630976971'), false, label)
  }
})

test('publishes Saori swimsuit handgun and water cannon only as exact core arrangement warnings', () => {
  const fixture = makeSaoriSwimsuitFixture()
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, saoriSwimsuitInteractionProfile())
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.equal(profile.policyVersion, 'chibi-rendering-policy-v15')
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.deepEqual(profile.warnings.map(item => item.blocker.sourceReference), [
    reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-1127309643643137231'),
    reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-4763531541672078543'),
  ])
  assert.deepEqual(profile.warnings.map(item => item.blocker.sourceReference.objectId), [
    '-1127309643643137231', '-4763531541672078543',
  ])
  assert.deepEqual(profile.warnings.map(item => item.blocker.sourceMeshReference.objectId), [
    '-4114086136464228496', '-7008905148608425358',
  ])
  assert.deepEqual(profile.warnings.map(item => item.blocker.sourceMaterialReferences[0]), [
    SAORI_SWIM_CANNON_MATERIAL, SAORI_SWIM_WEAPON_MATERIAL,
  ])
  for (const referenceId of ['-4763531541672078543', '-1127309643643137231']) {
    assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === referenceId), true)
    assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === referenceId), false)
  }
})

test('keeps the Saori swimsuit renderer pair blocked when any source/action proof is tampered', () => {
  type Fixture = ReturnType<typeof makeSaoriSwimsuitFixture>
  type Interaction = ReturnType<typeof saoriSwimsuitInteractionProfile>
  const cases: [string, (fixture: Fixture, interaction: Interaction) => void][] = [
    ['foreign candidate fingerprint', fixture => { fixture.candidate.fingerprint = hash('f') }],
    ['tampered prefab bundle hash', fixture => { fixture.candidate.parts[0].sha256 = hash('f') }],
    ['tampered animation bundle hash', fixture => { fixture.candidate.parts[1].sha256 = hash('f') }],
    ['tampered prefab identity', fixture => { fixture.candidate.assembly![0].prefabReference!.objectId = 'foreign-prefab' }],
    ['tampered main weapon anchor', fixture => {
      fixture.candidate.assembly![0].attachments.mainWeapon![0]!.pathId = 'foreign-weapon'
    }],
    ['handgun mesh identity', fixture => { fixture.handgun.renderer.meshSourceReference = reference(hash('f'), 'CAB-foreign-mesh', '1') }],
    ['water cannon mesh pointer', fixture => { fixture.waterCannon.renderer.mesh = { file: 'CAB-foreign-mesh', pathId: '1' } }],
    ['missing water cannon material', fixture => {
      fixture.candidate.sourceMaterials = fixture.candidate.sourceMaterials!.filter(item => item.sourceReference?.objectId !== SAORI_SWIM_CANNON_MATERIAL.objectId)
    }],
    ['tampered handgun material name', fixture => {
      fixture.candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === SAORI_SWIM_WEAPON_MATERIAL.objectId)!.name = 'CH0266_Unrelated'
    }],
    ['missing weapon shader', fixture => {
      fixture.candidate.shaders = fixture.candidate.shaders!.filter(item => item.sourceReference?.objectId !== SAORI_SWIM_SHADER.objectId)
    }],
    ['incomplete water cannon ancestry', fixture => {
      ;(fixture.waterCannon.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = false
    }],
    ['foreign handgun ancestry', fixture => {
      ;(fixture.handgun.renderer as InventoryAssemblyRenderer & { rootBoneAncestry: { file: string; pathId: string; name: string }[] }).rootBoneAncestry[1]!.file = 'CAB-foreign-prefab'
    }],
    ['selected child-renderer event', fixture => {
      fixture.candidate.events = [{
        clip: SAORI_SWIM_ACTIONS.pickup, time: 0, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 0,
        targetReference: fixture.waterCannon.sourceReference,
      }]
    }],
    ['missing pinned primary equipment reference', fixture => {
      fixture.candidate.assembly![0]!.attachments.equipmentRendererReferences = []
    }],
    ['foreign primary equipment reference', fixture => {
      fixture.candidate.assembly![0]!.attachments.equipmentRendererReferences = [
        reference('f'.repeat(64), 'CAB-foreign-equipment', '-7932837843349318863'),
      ]
    }],
    ['extra unresolved equipment reference', fixture => {
      fixture.candidate.assembly![0]!.attachments.equipmentRendererReferences!.push(
        reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-4763531541672078543'),
      )
    }],
    ['duplicate pinned primary equipment reference', fixture => {
      fixture.candidate.assembly![0]!.attachments.equipmentRendererReferences!.push(
        reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-7932837843349318863'),
      )
    }],
    ['missing primary weapon bone reference', fixture => {
      fixture.primary.renderer.boneReferences!.pop()
    }],
    ['foreign primary weapon bone reference', fixture => {
      fixture.primary.renderer.boneReferences![1]!.pathId = 'foreign-bone'
    }],
    ['extra primary weapon bone reference', fixture => {
      fixture.primary.renderer.boneReferences!.push({
        file: SAORI_SWIM_CAB_FILE, pathId: 'foreign-bone', name: 'bone_foreign',
      })
    }],
    ['reordered primary weapon bone references', fixture => {
      const bones = fixture.primary.renderer.boneReferences!
      ;[bones[1], bones[2]] = [bones[2]!, bones[1]!]
    }],
    ['foreign material shader reference', fixture => {
      fixture.candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === SAORI_SWIM_WEAPON_MATERIAL.objectId)!.shaderReference =
        reference(SAORI_SWIM_SHADER.bundleSha256, SAORI_SWIM_SHADER.serializedFile, 'foreign-shader')
    }],
    ['foreign material parsed shader name', fixture => {
      fixture.candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === SAORI_SWIM_WEAPON_MATERIAL.objectId)!.shaderParsedName = 'MX/C-Foreign'
    }],
    ['missing material parsed shader name', fixture => {
      fixture.candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === SAORI_SWIM_WEAPON_MATERIAL.objectId)!.shaderParsedName = ''
    }],
    ['foreign parsed shader name', fixture => {
      fixture.candidate.shaders!.find(item => item.sourceReference?.objectId === SAORI_SWIM_SHADER.objectId)!.parsedName = 'MX/C-Foreign'
    }],
    ['missing parsed shader name', fixture => {
      fixture.candidate.shaders!.find(item => item.sourceReference?.objectId === SAORI_SWIM_SHADER.objectId)!.parsedName = ''
    }],
    ['mismatched nonempty material shader name', fixture => {
      fixture.candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === SAORI_SWIM_WEAPON_MATERIAL.objectId)!.shaderName = 'MX/C-Foreign'
    }],
    ['mismatched nonempty shader name', fixture => {
      fixture.candidate.shaders!.find(item => item.sourceReference?.objectId === SAORI_SWIM_SHADER.objectId)!.name = 'MX/C-Foreign'
    }],
    ['mixed empty and nonempty source shader names', fixture => {
      fixture.candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === SAORI_SWIM_WEAPON_MATERIAL.objectId)!.shaderName = 'MX/C-Weapon'
    }],
    ['mixed nonempty and empty source shader names', fixture => {
      fixture.candidate.shaders!.find(item => item.sourceReference?.objectId === SAORI_SWIM_SHADER.objectId)!.name = 'MX/C-Weapon'
    }],
    ...Object.entries(SAORI_SWIM_ACTIONS).map(([action, clip]): [string, (fixture: Fixture, interaction: Interaction) => void] => [
      `missing source ${action} clip`,
      (fixture: Fixture) => { fixture.candidate.clips = fixture.candidate.clips.filter(item => item !== clip) },
    ]),
    ...(['idle', 'walk', 'pickup', 'touch'] as const).map((action): [string, (fixture: Fixture, interaction: Interaction) => void] => [
      `unresolved ${action} action`,
      (_fixture: Fixture, interaction: Interaction) => {
        interaction.interactions[action] = { state: 'unresolved', reason: `Missing ${action}.` }
      },
    ]),
  ]

  for (const [label, mutate] of cases) {
    const fixture = makeSaoriSwimsuitFixture()
    const interaction = saoriSwimsuitInteractionProfile()
    mutate(fixture, interaction)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
    assert.equal(profile.validation.valid, false, label)
    assert.deepEqual(profile.warnings, [], label)
    for (const referenceId of ['-4763531541672078543', '-1127309643643137231']) {
      assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === referenceId), false, label)
    }
  }
})

test('publishes only the exact Misaki and Mari rig-mount groups as core arrangement warnings', () => {
  for (const source of PINNED_RIG_MOUNT_TEST_SOURCES) {
    const fixture = makeSourcePinnedRigMountFixture(source)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, sourcePinnedRigMountInteraction(source))
    const expectedReferences = source.members.map(member => reference(source.prefab.bundle, source.prefab.file, member.id))
    assert.equal(profile.validation.valid, true, `${source.identity}: ${profile.validation.unresolved.join('; ')}`)
    assert.deepEqual(profile.coreRendererBlockers, [], source.identity)
    assert.equal(profile.warnings.length, 1, source.identity)
    assert.equal(profile.warnings[0]?.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT', source.identity)
    assert.deepEqual(profile.warnings[0]?.sourceGroupReferences, expectedReferences, source.identity)
    assert.match(profile.warnings[0]?.message ?? '', /no authored main\/sub slot/)
    assert.equal(profile.warnings[0]?.sourceEvidence?.some(item => item.includes('audited clip binding evidence')), true)
    assert.deepEqual(profile.equipmentBindingEvidence
      .filter(item => expectedReferences.some(reference => referenceKeyForTest(reference) === referenceKeyForTest(item.sourceReference)))
      .map(item => item.reasonCode), ['STRUCTURAL_TRANSFORM_BONE_ANCESTRY', 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY'])
    for (const member of source.members) {
      const memberReference = reference(source.prefab.bundle, source.prefab.file, member.id)
      const included = profile.renderers.find(renderer => renderer.sourceReference
        && referenceKeyForTest(renderer.sourceReference) === referenceKeyForTest(memberReference))
      assert.ok(included, `${source.identity}/${member.name} remains in the core render list`)
      assert.equal(profile.excludedRenderers.some(renderer => referenceKeyForTest(renderer.sourceReference) === referenceKeyForTest(memberReference)), false)
      assert.equal(included.materialSlots[0]?.sourceMaterialReference?.objectId, member.material)
      assert.ok(included.materialSlots[0]?.materialProperties.textures[0]?.textureReference,
        `${source.identity}/${member.name} keeps its source texture binding`)
    }
  }
})

test('rejects a single wrong pinned bone name without excluding either group renderer', () => {
  for (const source of PINNED_RIG_MOUNT_TEST_SOURCES) {
    const fixture = makeSourcePinnedRigMountFixture(source)
    const interaction = sourcePinnedRigMountInteraction(source)
    const changedBoneId = source.identity === 'ch0268' ? '-239699426375248023' : '-1469757343611847937'
    const pointer = fixture.memberRenderers[0]!.boneReferences!.find(bone => bone.pathId === changedBoneId)!
    assert.ok(pointer, source.identity)
    pointer.name = `${pointer.name}_wrong`

    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
    const expectedReferences = source.members.map(member => reference(source.prefab.bundle, source.prefab.file, member.id))
    assert.equal(profile.validation.valid, false, source.identity)
    assert.deepEqual(profile.warnings, [], source.identity)
    assert.ok(profile.validation.unresolved.length > 0, source.identity)
    for (const expectedReference of expectedReferences) {
      assert.ok(profile.renderers.some(renderer => renderer.sourceReference
        && referenceKeyForTest(renderer.sourceReference) === referenceKeyForTest(expectedReference)), source.identity)
      assert.equal(profile.excludedRenderers.some(renderer => referenceKeyForTest(renderer.sourceReference)
        === referenceKeyForTest(expectedReference)), false, source.identity)
    }
    assert.ok(profile.coreRendererBlockers.some(blocker => referenceKeyForTest(blocker.sourceReference)
      === referenceKeyForTest(expectedReferences[0]!)), source.identity)
  }
})

test('rejects a missing pinned group renderer and keeps the remaining renderer core', () => {
  for (const source of PINNED_RIG_MOUNT_TEST_SOURCES) {
    const fixture = makeSourcePinnedRigMountFixture(source)
    const interaction = sourcePinnedRigMountInteraction(source)
    const missingMember = source.members[1]!
    fixture.assembly.renderers = fixture.assembly.renderers.filter(renderer => renderer.sourceReference?.objectId !== missingMember.id)

    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
    const remainingReference = reference(source.prefab.bundle, source.prefab.file, source.members[0]!.id)
    assert.equal(profile.validation.valid, false, source.identity)
    assert.deepEqual(profile.warnings, [], source.identity)
    assert.ok(profile.renderers.some(renderer => renderer.sourceReference
      && referenceKeyForTest(renderer.sourceReference) === referenceKeyForTest(remainingReference)), source.identity)
    assert.equal(profile.excludedRenderers.some(renderer => referenceKeyForTest(renderer.sourceReference)
      === referenceKeyForTest(remainingReference)), false, source.identity)
    assert.ok(profile.coreRendererBlockers.some(blocker => referenceKeyForTest(blocker.sourceReference)
      === referenceKeyForTest(remainingReference)), source.identity)
  }
})

test('keeps source-pinned rig-mount warnings fail-closed for changed members, assets, and actions', () => {
  type Mutation = (fixture: ReturnType<typeof makeSourcePinnedRigMountFixture>, interaction: ReturnType<typeof sourcePinnedRigMountInteraction>) => void
  const sharedCases: [string, Mutation][] = [
    ['foreign dependency fingerprint', fixture => { fixture.candidate.fingerprint = hash('f') }],
    ['tampered prefab source object', fixture => { fixture.assembly.prefabReference!.objectId = 'foreign-prefab' }],
    ['incomplete expected member', fixture => {
      fixture.assembly.renderers = fixture.assembly.renderers.filter(renderer => renderer.sourceReference?.objectId !== fixture.source.members[1]?.id)
    }],
    ['tampered rig-mount bone pointer', fixture => {
      fixture.memberRenderers[0]!.boneReferences![0]!.pathId = 'foreign-anchor'
    }],
    ['tampered member material reference', fixture => {
      fixture.memberRenderers[0]!.materialSlots![0]!.sourceMaterialReference = reference(hash('f'), 'CAB-foreign-material', 'foreign-material')
    }],
    ['extra active renderer on the same anchor', fixture => {
      const extra = addPolicyRenderer(fixture, {
        name: 'Extra_Weapon_Mount', hierarchyPath: `${fixture.source.root}/Extra_Weapon_Mount`,
        materialName: 'Extra_Weapon_Mount_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
      }).renderer
      const anchorReference = reference(fixture.source.prefab.bundle, fixture.source.prefab.file, fixture.source.anchor[0])
      extra.enabled = true
      extra.gameObjectActive = true
      extra.visible = true
      extra.rootBone = {
        file: fixture.source.prefab.file,
        pathId: fixture.source.anchor[0],
        name: fixture.source.anchor[1],
        sourceReference: anchorReference,
      } as NonNullable<InventoryAssemblyRenderer['rootBone']> & { sourceReference: InventorySourceReference }
      fixture.assembly.rendererOrder = fixture.assembly.renderers.map(renderer => renderer.name)
    }],
    ['extra attachment metadata', fixture => {
      fixture.assembly.attachments.equipmentRendererGroups = [{
        kind: 'structuralWeapon',
        attachment: { file: fixture.source.prefab.file, pathId: fixture.source.anchor[0], name: fixture.source.anchor[1] },
        sourceReferences: [], evidence: [],
      }]
    }],
  ]
  for (const source of PINNED_RIG_MOUNT_TEST_SOURCES) {
    const cases: [string, Mutation][] = [
      ...sharedCases,
      ...(['idle', 'walk', 'pickup', 'touch'] as const).flatMap(action => [
        [`missing source ${action} clip`, (fixture: ReturnType<typeof makeSourcePinnedRigMountFixture>) => {
          fixture.candidate.clips = fixture.candidate.clips.filter(clip => clip !== source.actions[action])
        }] as [string, Mutation],
        [`mismatched ${action} action clip`, (_fixture: ReturnType<typeof makeSourcePinnedRigMountFixture>, interaction: ReturnType<typeof sourcePinnedRigMountInteraction>) => {
          interaction.interactions[action] = { state: 'available', clip: `${source.actions[action]}_mismatch` }
        }] as [string, Mutation],
        [`unavailable ${action} action`, (_fixture: ReturnType<typeof makeSourcePinnedRigMountFixture>, interaction: ReturnType<typeof sourcePinnedRigMountInteraction>) => {
          interaction.interactions[action] = { state: 'unresolved', reason: `Missing ${action}.` }
        }] as [string, Mutation],
      ]),
      ['tampered prefab bundle bytes', fixture => {
        fixture.candidate.parts!.find(part => part.entryPath === source.prefabEntry.path)!.sha256 = hash('f')
      }],
      ...source.animationEntries.map((entry, index) => [
        `tampered animation bundle bytes ${index + 1}`,
        (fixture: ReturnType<typeof makeSourcePinnedRigMountFixture>) => {
          fixture.candidate.parts!.find(part => part.entryPath === entry.path)!.sha256 = hash('f')
        },
      ] as [string, Mutation]),
    ]
    for (const [label, mutate] of cases) {
      const fixture = makeSourcePinnedRigMountFixture(source)
      const interaction = sourcePinnedRigMountInteraction(source)
      mutate(fixture, interaction)
      const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
      assert.equal(profile.validation.valid, false, `${source.identity}: ${label}`)
      assert.deepEqual(profile.warnings, [], `${source.identity}: ${label}`)
      assert.ok(profile.validation.unresolved.length > 0, `${source.identity}: ${label}`)
    }
  }
})

test('does not generalize source-pinned same-anchor warnings to Juri or arbitrary weapon groups', () => {
  const source = PINNED_RIG_MOUNT_TEST_SOURCES[0]
  const fixture = makeSourcePinnedRigMountFixture(source)
  fixture.candidate.sourceIdentity = 'juri_original'
  fixture.candidate.fingerprint = hash('j')
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, sourcePinnedRigMountInteraction(source))
  assert.equal(profile.validation.valid, false)
  assert.deepEqual(profile.warnings, [])
  assert.equal(profile.coreRendererBlockers.length > 0, true)
})

test('relaxes a secondary prop only when an exact equipment ref binds a different main slot', () => {
  const fixture = makeCandidate('secondary_prop_attachment_policy', ['Policy_Body'])
  const primary = addPolicyRenderer(fixture, {
    name: 'Primary_Weapon',
    hierarchyPath: 'Cafe_Secondary/Primary_Weapon',
    materialName: 'Primary_Weapon_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600003'),
  })
  const primaryBone = { file: 'CAB-prefab', pathId: 'primary-root', name: 'Bip001_Weapon' }
  primary.renderer.rootBone = primaryBone
  primary.renderer.boneReferences = [primaryBone]
  ;(primary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = []
  ;(primary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true

  const secondary = addPolicyRenderer(fixture, {
    name: 'Secondary_Chain_Prop',
    hierarchyPath: 'Cafe_Secondary/Secondary_Chain_Prop',
    materialName: 'Secondary_Chain_Prop_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600004'),
  })
  const secondaryBone = { file: 'CAB-prefab', pathId: 'secondary-root', name: 'bone_chain_01' }
  secondary.renderer.rootBone = secondaryBone
  secondary.renderer.boneReferences = [secondaryBone]
  ;(secondary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestry = []
  ;(secondary.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = true

  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.equipmentRendererReferences = [primary.sourceReference]
  attachments.mainWeapon = [primaryBone]

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SecondaryProp'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.deepEqual(profile.warnings.map(item => item.blocker.sourceReference.objectId), [secondary.sourceReference.objectId])
  assert.equal(profile.warnings[0]?.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT')
  assert.match(profile.warnings[0]?.blocker.evidence.join(' | ') ?? '', /exact source renderer reference/)

  secondary.renderer.rootBone = primaryBone
  secondary.renderer.boneReferences = [primaryBone]
  const pointerMatchProfile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SecondaryPropPointerMatch'))
  assert.deepEqual(pointerMatchProfile.warnings, [])
  assert.deepEqual(pointerMatchProfile.coreRendererBlockers, [])

  secondary.renderer.rootBone = secondaryBone
  secondary.renderer.boneReferences = [secondaryBone]
  fixture.candidate.events = [{
    clip: fixture.candidate.clips[0] as string, time: 0, function: 'AniEvt_DisableChildRenderer',
    string: '', float: 0, int: 0, targetReference: secondary.sourceReference,
  }]
  const eventTargetProfile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SecondaryPropEventTarget'))
  assert.equal(eventTargetProfile.validation.valid, false)
  assert.deepEqual(eventTargetProfile.warnings, [])
  assert.deepEqual(eventTargetProfile.coreRendererBlockers.map(item => item.sourceReference.objectId), [secondary.sourceReference.objectId])
})

test('publishes source-complete animated Haruna fish and Koharu grenade as core arrangement warnings', () => {
  const cases = [
    makeExactAnimatedPropFixture('haruna_original', 'Haruna_Original_Fishshapedbun_Weapon', 'Haruna_Original_Fishshapedbun', 'Fishshapedbun_bone'),
    makeExactAnimatedPropFixture('koharu_original', 'Koharu_Original_Grenade', 'Koharu_Original_Grenade', 'bone_grenade', ['bone_root']),
  ]
  for (const { fixture, primary, prop } of cases) {
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile(prop.renderer.name))
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === primary.sourceReference.objectId), true)
    assert.deepEqual(profile.coreRendererBlockers, [])
    assert.deepEqual(profile.warnings.map(item => item.blocker.sourceReference.objectId), [prop.sourceReference.objectId])
    assert.equal(profile.warnings[0]?.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT')
    assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === prop.sourceReference.objectId), true)
    assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === prop.sourceReference.objectId), false)
    assert.deepEqual(profile.validation.warnings, profile.warnings)
  }
})

test('keeps animated standalone prop blockers fail-closed when source ancestry is incomplete or an action targets the renderer', () => {
  const ancestryTamper = makeExactAnimatedPropFixture(
    'haruna_original', 'Haruna_Original_Fishshapedbun_Weapon', 'Haruna_Original_Fishshapedbun', 'Fishshapedbun_bone',
  )
  ;(ancestryTamper.prop.renderer as InventoryAssemblyRenderer & Record<string, unknown>).rootBoneAncestryComplete = false

  const eventTamper = makeExactAnimatedPropFixture(
    'koharu_original', 'Koharu_Original_Grenade', 'Koharu_Original_Grenade', 'bone_grenade', ['bone_root'],
  )
  eventTamper.fixture.candidate.events = [{
    clip: eventTamper.fixture.candidate.clips[0] as string, time: 0, function: 'AniEvt_DisableChildRenderer',
    string: '', float: 0, int: 0, targetReference: eventTamper.prop.sourceReference,
  }]

  for (const { fixture, prop } of [ancestryTamper, eventTamper]) {
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile(prop.renderer.name))
    assert.equal(profile.validation.valid, false)
    assert.deepEqual(profile.warnings, [])
    assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [prop.sourceReference.objectId])
    assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === prop.sourceReference.objectId), false)
  }
})

test('does not block a meaningful equipment renderer once an exact authored relation is present', () => {
  const fixture = makeCandidate('resolved_equipment_relation_policy', ['Policy_Body'])
  const added = addPolicyRenderer(fixture, {
    name: 'Neru_Original_Weapon_01',
    hierarchyPath: 'Cafe_Resolved_Equipment/Neru_Original_Weapon_01',
    materialName: 'Neru_Original_Weapon_01_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    equipmentReference: true,
  })
  const bone = { file: 'CAB-policy-bones', pathId: 'weapon-root', name: 'Bip001_Weapon_R' }
  added.renderer.rootBone = bone
  added.renderer.boneReferences = [bone]
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.mainWeapon = [bone]

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('ResolvedEquipment'))
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === added.sourceReference.objectId), true)
})

test('retains evidence for an exact same-prefab two-renderer mainWeapon group', () => {
  const fixture = makeCandidate('aris_maid_group_policy', ['Policy_Body'])
  const first = addPolicyRenderer(fixture, {
    name: 'Aris_Original_Weapon', hierarchyPath: 'Cafe_CH0200/Aris_Original_Weapon',
    materialName: 'Aris_Original_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
  })
  const second = addPolicyRenderer(fixture, {
    name: 'FX_Aris_Original_Weapon', hierarchyPath: 'Cafe_CH0200/FX_Aris_Original_Weapon',
    materialName: 'FX_Aris_Original_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
  })
  const unrelated = addPolicyRenderer(fixture, {
    name: 'Policy_Accessory', hierarchyPath: 'Cafe_CH0200/Policy_Accessory',
    materialName: 'Policy_Accessory_Material', shaderName: 'MX/C-General', rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600003'),
  })
  const attachment = { file: 'CAB-prefab', pathId: 'aris-weapon', name: 'Bip001_Weapon' }
  for (const renderer of [first.renderer, second.renderer]) {
    renderer.rootBone = attachment
    renderer.transformChain = [{ file: 'CAB-prefab', pathId: 'root', name: fixture.candidate.assembly![0].root }, attachment, { file: 'CAB-prefab', pathId: renderer.pathId, name: renderer.name }]
    renderer.boneReferences = [attachment]
  }
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.mainWeapon = [attachment]
  attachments.equipmentRendererReferences = [first.sourceReference, second.sourceReference, unrelated.sourceReference]
  attachments.equipmentRendererGroups = [{
    kind: 'mainWeapon', attachment, sourceReferences: [first.sourceReference, second.sourceReference],
    evidence: ['exact mainWeapon pointer cab-prefab:aris-weapon', 'unique same-prefab mainWeapon renderer group'],
  }]
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('ArisMaidGroup'))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.deepEqual(profile.equipmentBindingEvidence.map(item => item.sourceReference.objectId).sort(), ['600001', '600002', '600003'])
  assert.ok(profile.equipmentBindingEvidence.every(item => item.classification === 'exact-equipment-renderer'))
  assert.match(profile.equipmentBindingEvidence[0].evidence.join(' | '), /unique same-prefab mainWeapon renderer group/)
  const unrelatedEvidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === unrelated.sourceReference.objectId)
  assert.ok(unrelatedEvidence)
  assert.doesNotMatch(unrelatedEvidence.evidence.join(' | '), /unique same-prefab mainWeapon renderer group/)
})

test('retains evidence for an exact same-prefab structural Bip001_Weapon group without a slot', () => {
  const fixture = makeCandidate('non_slot_structural_group_policy', ['Policy_Body'])
  const first = addPolicyRenderer(fixture, {
    name: 'Nonomi_Weapon', hierarchyPath: 'Cafe_CH0092/Nonomi_Weapon',
    materialName: 'Nonomi_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
  })
  const second = addPolicyRenderer(fixture, {
    name: 'CH0092_Weapon', hierarchyPath: 'Cafe_CH0092/CH0092_Weapon',
    materialName: 'CH0092_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
    sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
  })
  const attachment = { file: 'CAB-prefab', pathId: 'bip001-weapon', name: 'Bip001_Weapon' }
  for (const renderer of [first.renderer, second.renderer]) {
    renderer.rootBone = attachment
    renderer.transformChain = [{ file: 'CAB-prefab', pathId: 'root', name: fixture.candidate.assembly![0].root }, attachment, { file: 'CAB-prefab', pathId: renderer.pathId, name: renderer.name }]
    renderer.boneReferences = [attachment]
  }
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.equipmentRendererReferences = [first.sourceReference, second.sourceReference]
  attachments.equipmentRendererGroups = [{
    kind: 'structuralWeapon', attachment, sourceReferences: [first.sourceReference, second.sourceReference],
    evidence: ['exact same-prefab Bip001_Weapon m_Bones anchor cab-prefab:bip001-weapon', 'unique same-prefab structural Bip001_Weapon renderer group'],
  }]

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('NonSlotStructuralGroup'))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.deepEqual(profile.equipmentBindingEvidence.map(item => item.sourceReference.objectId).filter(id => ['600001', '600002'].includes(id)).sort(), ['600001', '600002'])
  for (const objectId of ['600001', '600002']) {
    const evidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === objectId)
    assert.ok(evidence)
    assert.equal(evidence.classification, 'exact-equipment-renderer')
    assert.match(evidence.evidence.join(' | '), /unique same-prefab structural Bip001_Weapon renderer group/)
  }
})

test('reports exact source-pinned five-submesh body separation as a nonblocking geometry warning', () => {
  const fixture = makeSenaCoreGeometryFixture()
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SenaCoreGeometry'))

  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.deepEqual(profile.warnings, [])
  assert.deepEqual(profile.validation.coreGeometryBlockers, profile.coreGeometryBlockers)
  assert.deepEqual(profile.coreGeometryBlockers, [])
  assert.deepEqual(profile.coreGeometryWarnings, profile.validation.coreGeometryWarnings)
  assert.equal(profile.coreGeometryWarnings?.length, 1)
  const warning = profile.coreGeometryWarnings![0]
  assert.equal(isExpectedSourceAuthoredCoreGeometryWarning(warning), true)
  assert.equal(warning.reasonCode, 'SOURCE_AUTHORED_MULTIMATERIAL_BODY_SEPARATION')
  assert.equal(warning.name, 'CH0081_Body')
  assert.equal(warning.sourceReference.objectId, '-6903816935868408574')
  assert.equal(warning.sourceMeshReference.objectId, '8052939068824350260')
  assert.deepEqual(warning.geometryEvidence.legacyMeasurement, {
    primitiveIndex: 0,
    componentLabels: ['Head', 'torso'],
    sourceGap: 0.1780399764,
    sourceUnit: 'Unity mesh units',
    bridgingTriangles: 0,
  })
  assert.match(warning.geometryEvidence.legacyLabelSemantics, /cap\/upper-body-material component/)
  assert.deepEqual(warning.geometryEvidence.retainedMaterialSlots.map(({ slot, sourceMaterialName }) => [slot, sourceMaterialName]), [
    [0, 'CH0081_Body'], [1, 'CH0081_Face'], [2, 'CH0081_Eyebrow'], [3, 'CH0081_EyeMouth'], [4, 'CH0081_Hair'],
  ])
  assert.match(warning.message, /retained five-submesh body geometry/)
  assert.match(warning.message, /does not demonstrate a missing neck/)
  assert.match(warning.message, /does not certify material, skinning, action, weapon\/equipment, or browser checks/)
  assert.doesNotMatch(profile.validation.unresolved.join(' '), /source-complete but visually unacceptable/)
  assert.doesNotMatch(profile.validation.unresolved.join(' '), /No exact canonical source identity/)
})

test('does not apply the core geometry warning to a name/identity-only or tampered near-match', () => {
  const mutateSource: ((fixture: ReturnType<typeof makeSenaCoreGeometryFixture>) => void)[] = [
    fixture => { fixture.candidate.assembly![0].renderers[0].meshSourceReference!.bundleSha256 = hash('z') },
    fixture => { fixture.candidate.assembly![0].renderers[0].meshSourceReference!.objectId = '8052939068824350261' },
    fixture => { fixture.candidate.assembly![0].renderers[0].sourceReference!.objectId = '-6903816935868408575' },
    fixture => { fixture.candidate.assembly![0].prefabReference!.objectId = '-8585771901269975807' },
  ]

  for (const mutate of mutateSource) {
    const fixture = makeSenaCoreGeometryFixture('ch0081')
    mutate(fixture)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SenaCoreGeometryNearMatch'))
    assert.deepEqual(profile.coreGeometryBlockers, [])
    assert.deepEqual(profile.coreGeometryWarnings, [])
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
  }
})

test('keeps geometry warnings independent from missing material and action evidence', () => {
  const missingMaterial = makeSenaCoreGeometryFixture('sena_missing_material')
  missingMaterial.candidate.sourceMaterials!.splice(2, 1)
  const missingMaterialProfile = buildChibiRenderingProfile(
    missingMaterial.candidate, missingMaterial.prefabPath, emptyChibiProfile('SenaMissingMaterial'),
  )
  assert.equal(missingMaterialProfile.coreGeometryWarnings?.length, 1)
  assert.equal(isExpectedSourceAuthoredCoreGeometryWarning(missingMaterialProfile.coreGeometryWarnings![0]), true)
  assert.equal(missingMaterialProfile.validation.valid, false)
  assert.match(missingMaterialProfile.validation.unresolved.join(' '), /material .* is missing from the candidate closure/)

  const missingAction = makeSenaCoreGeometryFixture('sena_missing_action_binding')
  const clip = missingAction.candidate.clips[0]
  missingAction.candidate.events = [{
    clip, time: 0, function: 'AniEvt_EnableChildRenderer', string: '', float: 0, int: 4,
  }]
  const interaction = emptyChibiProfile('SenaMissingActionBinding')
  interaction.initialPose = clip
  const missingActionProfile = buildChibiRenderingProfile(missingAction.candidate, missingAction.prefabPath, interaction)
  assert.equal(missingActionProfile.coreGeometryWarnings?.length, 1)
  assert.equal(isExpectedSourceAuthoredCoreGeometryWarning(missingActionProfile.coreGeometryWarnings![0]), true)
  assert.equal(missingActionProfile.validation.valid, false)
  assert.match(missingActionProfile.validation.unresolved.join(' '), /has no exact source renderer-ID binding/)
})

test('does not emit the geometry warning for a missing mesh and rejects tampered warning metadata', () => {
  const missingMesh = makeSenaCoreGeometryFixture('sena_missing_mesh')
  missingMesh.candidate.assembly![0].renderers[0].mesh = null
  missingMesh.candidate.assembly![0].renderers[0].meshSourceReference = null
  const missingMeshProfile = buildChibiRenderingProfile(missingMesh.candidate, missingMesh.prefabPath, emptyChibiProfile('SenaMissingMesh'))
  assert.equal(missingMeshProfile.validation.valid, false)
  assert.deepEqual(missingMeshProfile.coreGeometryWarnings, [])
  assert.match(missingMeshProfile.validation.unresolved.join(' '), /no source mesh reference/)

  const exact = makeSenaCoreGeometryFixture()
  const warning = buildChibiRenderingProfile(exact.candidate, exact.prefabPath, emptyChibiProfile('SenaGeometryWarning')).coreGeometryWarnings![0]
  assert.equal(isExpectedSourceAuthoredCoreGeometryWarning(warning), true)
  const wrongReference = structuredClone(warning)
  wrongReference.geometryEvidence.retainedMaterialSlots[1].sourceMaterialReference.objectId = '2295227601622239350'
  assert.equal(isExpectedSourceAuthoredCoreGeometryWarning(wrongReference), false)
  const extraSlot = structuredClone(warning)
  extraSlot.geometryEvidence.retainedMaterialSlots.pop()
  assert.equal(isExpectedSourceAuthoredCoreGeometryWarning(extraSlot), false)
  const alteredClaim = structuredClone(warning)
  alteredClaim.message = 'The entire character is valid.'
  assert.equal(isExpectedSourceAuthoredCoreGeometryWarning(alteredClaim), false)
})

test('keeps exact Sena core renderer invalid when its source-pinned five material slots are contradictory', () => {
  const corrupt: ((fixture: ReturnType<typeof makeSenaCoreGeometryFixture>) => void)[] = [
    fixture => { fixture.candidate.assembly![0].renderers[0].materialSlots!.splice(2, 1) },
    fixture => {
      const slots = fixture.candidate.assembly![0].renderers[0].materialSlots!
      ;[slots[1], slots[2]] = [slots[2], slots[1]]
    },
    fixture => {
      const slots = fixture.candidate.assembly![0].renderers[0].materialSlots!
      ;[slots[1].sourceMaterialReference, slots[2].sourceMaterialReference] = [slots[2].sourceMaterialReference, slots[1].sourceMaterialReference]
    },
    fixture => { fixture.candidate.assembly![0].renderers[0].materialSlots![4].material!.pathId = '999' },
  ]

  for (const mutate of corrupt) {
    const fixture = makeSenaCoreGeometryFixture()
    mutate(fixture)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SenaContradictoryGeometry'))
    assert.equal(profile.validation.valid, false, profile.validation.unresolved.join('; '))
    assert.deepEqual(profile.coreGeometryWarnings, [])
    assert.match(profile.validation.unresolved.join(' '), /exact source-pinned CH0081 core renderer has missing, reordered, or inconsistent identity evidence for its five required material slots/)
  }
})

test('classifies Sena- and Aru-shaped weapons only from an exact same-prefab Bip001_Weapon m_Bones anchor', () => {
  const shapes = [
    ['sena_shaped_structural_policy', 'CH0081_Weapon', 'bone_bag_main'],
    ['aru_newyear_shaped_structural_policy', 'Aru_Newyear_Weapon', 'bone_chain_01'],
  ] as const
  for (const [identity, name, rootBoneName] of shapes) {
    const fixture = makeCandidate(identity, ['Policy_Body'])
    const added = addStructuralEquipmentRenderer(fixture, { name })
    const { anchor } = shapeBip001WeaponAnchor(fixture, added, rootBoneName)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile(identity))
    const evidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === added.sourceReference.objectId)
    assert.ok(evidence)
    assert.equal(evidence.classification, 'structurally-bound-equipment')
    assert.equal(evidence.reasonCode, 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY')
    assert.deepEqual(evidence.matchedAncestorPointers.filter(item => item.name === 'Bip001_Weapon'), [anchor])
    assert.deepEqual(evidence.bodyRendererReferences, [])
    assert.deepEqual(profile.coreRendererBlockers, [])
    assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
    assert.match(evidence.evidence.join(' | '), /exact source shader reference/)
    assert.match(evidence.evidence.join(' | '), /unique non-conflicting same-prefab transform\/bone relation/)
  }
})

test('promotes only the Aru-shaped weapon while retaining the separate Hagoita blocker', () => {
  const fixture = makeCandidate('aru_newyear_shaped_with_hagoita_policy', ['Policy_Body'])
  const weapon = addStructuralEquipmentRenderer(fixture, { name: 'Aru_Newyear_Weapon' })
  shapeBip001WeaponAnchor(fixture, weapon, 'bone_chain_01')
  const hagoita = addPolicyRenderer(fixture, {
    name: 'Aru_Newyear_Hagoita',
    hierarchyPath: 'Cafe_Aru_Newyear/Aru_Newyear_Hagoita',
    materialName: 'Aru_Newyear_Hagoita_Material',
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
  })
  const hagoitaBone = { file: 'CAB-policy-bones', pathId: 'hagoita-root', name: 'bone_Handbag_01' }
  hagoita.renderer.rootBone = hagoitaBone
  hagoita.renderer.transformChain = [
    { file: 'CAB-policy-prefab', pathId: 'root', name: fixture.candidate.assembly![0].root },
    { file: 'CAB-policy-prefab', pathId: 'hagoita', name: hagoita.renderer.name },
  ]
  hagoita.renderer.boneReferences = [hagoitaBone]

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('AruNewyearHagoita'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.name), ['Aru_Newyear_Hagoita'])
  assert.equal(profile.validation.valid, false)
})

test('keeps a Sena-shaped weapon blocked when its Bip001_Weapon anchor crosses prefabs', () => {
  const fixture = makeCandidate('sena_cross_prefab_anchor_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' })
  const { rootBone } = shapeBip001WeaponAnchor(fixture, added, 'bone_bag_main')
  added.renderer.boneReferences = [{ ...rootBone, pathId: 'foreign-bip001-weapon', name: 'Bip001_Weapon', file: 'CAB-other-prefab' }]
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SenaCrossPrefab'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
})

test('keeps a Sena-shaped weapon blocked when the same-name root pointer collides with its exact anchor', () => {
  const fixture = makeCandidate('sena_anchor_collision_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' })
  const { anchor } = shapeBip001WeaponAnchor(fixture, added, 'bone_bag_main')
  added.renderer.rootBone = { ...anchor, pathId: 'different-bip001-weapon', name: 'Bip001_Weapon' }
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SenaAnchorCollision'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
})

test('keeps a Sena-shaped weapon blocked when its exact Bip001_Weapon anchor is shared by the body', () => {
  const fixture = makeCandidate('sena_anchor_body_collision_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' })
  const { anchor } = shapeBip001WeaponAnchor(fixture, added, 'bone_bag_main')
  added.body.boneReferences = [{ ...anchor }]
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SenaAnchorBodyCollision'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
})

test('keeps same-prefab structural weapons blocked when a visible competing renderer shares the exact anchor', () => {
  const fixture = makeCandidate('same_prefab_anchor_competition_policy', ['Policy_Body'])
  const first = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' })
  const second = addStructuralEquipmentRenderer(fixture, { name: 'Aru_Newyear_Weapon' })
  shapeBip001WeaponAnchor(fixture, first, 'bone_bag_main')
  shapeBip001WeaponAnchor(fixture, second, 'bone_chain_01')
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('AnchorCompetition'))
  assert.deepEqual(profile.equipmentBindingEvidence, [])
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId).sort(), [first.sourceReference.objectId, second.sourceReference.objectId].sort())
})

function addSourceCompleteStructuralRenderer(
  fixture: ReturnType<typeof makeCandidate>,
  options: { id: string; name: string; materialName?: string; anchor?: boolean },
) {
  const assembly = fixture.candidate.assembly![0]
  const sourceReference = reference(hash('a'), 'CAB-prefab', options.id)
  const added = addPolicyRenderer(fixture, {
    name: options.name,
    hierarchyPath: `${assembly.root}/${options.anchor ? 'Bip001_Weapon/' : ''}${options.name}`,
    materialName: options.materialName ?? `${options.name}_Material`,
    shaderName: 'MX/C-Weapon',
    rendererType: 'SkinnedMeshRenderer',
    sourceReference,
  })
  const renderer = added.renderer as InventoryAssemblyRenderer & Record<string, unknown>
  const pointer = (id: string, name: string) => ({
    file: 'CAB-prefab', pathId: id, name,
    sourceReference: reference(hash('a'), 'CAB-prefab', id),
  })
  const root = pointer(options.anchor ? 'shared-prefab-root' : `${options.id}-root`, assembly.root)
  const anchor = pointer(options.anchor ? 'shared-bip001-weapon' : `${options.id}-anchor`, 'Bip001_Weapon')
  const leaf = pointer(options.id, options.name)
  const rootBone = options.anchor ? anchor : pointer(`${options.id}-bone`, 'bone_chain_09')
  renderer.rootBone = rootBone
  renderer.transformChain = [root, ...(options.anchor ? [anchor] : []), leaf]
  renderer.rootBoneAncestry = options.anchor
    ? [root]
    : [root, pointer(`${options.id}-bone-root`, 'bone_root'), pointer(`${options.id}-bone-parent`, 'bone_acc')]
  renderer.rootBoneAncestryComplete = true
  renderer.boneReferences = options.anchor ? [anchor] : [rootBone]
  return { ...added, renderer, anchor, root }
}

test('uses complete exact rootBone ancestry for equipment outside Bip001 while rejecting incomplete, foreign, reordered, and cyclic chains', () => {
  const make = (identity: string) => {
    const fixture = makeCandidate(identity, ['Policy_Body'])
    const added = addSourceCompleteStructuralRenderer(fixture, {
      id: `${identity}-renderer`, name: 'Neru_Original_Weapon_Chain',
    })
    fixture.candidate.assembly![0].renderers[0].boneReferences = []
    return { fixture, added }
  }
  const valid = make('source_ancestry_valid')
  const validProfile = buildChibiRenderingProfile(valid.fixture.candidate, valid.fixture.prefabPath, emptyChibiProfile('SourceAncestryValid'))
  const validEvidence = validProfile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === valid.added.sourceReference.objectId)
  assert.ok(validEvidence)
  assert.equal(validEvidence.classification, 'structurally-bound-equipment')
  assert.deepEqual(validEvidence.rootBoneAncestry.map(item => item.name), [valid.fixture.candidate.assembly![0].root, 'bone_root', 'bone_acc'])

  const mutations = [
    (renderer: InventoryAssemblyRenderer & Record<string, unknown>) => { renderer.rootBoneAncestryComplete = false },
    (renderer: InventoryAssemblyRenderer & Record<string, unknown>) => {
      const chain = renderer.rootBoneAncestry as Array<Record<string, unknown>>
      chain[1] = { ...chain[1], file: 'CAB-foreign', sourceReference: reference(hash('z'), 'CAB-foreign', String(chain[1]!.pathId)) }
    },
    (renderer: InventoryAssemblyRenderer & Record<string, unknown>) => {
      renderer.rootBoneAncestry = [...(renderer.rootBoneAncestry as unknown[]).slice(1), (renderer.rootBoneAncestry as unknown[])[0]]
    },
    (renderer: InventoryAssemblyRenderer & Record<string, unknown>) => {
      renderer.rootBoneAncestry = [...(renderer.rootBoneAncestry as unknown[]), renderer.rootBone]
    },
  ]
  for (const [index, mutate] of mutations.entries()) {
    const { fixture, added } = make(`source_ancestry_negative_${index}`)
    mutate(added.renderer as InventoryAssemblyRenderer & Record<string, unknown>)
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile(`SourceAncestryNegative${index}`))
    assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
    assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
  }
})

test('accepts an exact shared-anchor equipment group only when every claiming renderer is source-complete', () => {
  const build = () => {
    const fixture = makeCandidate('exact_shared_anchor_group_policy', ['Policy_Body'])
    const weapon = addSourceCompleteStructuralRenderer(fixture, { id: 'group-weapon', name: 'CH0336_Weapon', anchor: true })
    const outline = addSourceCompleteStructuralRenderer(fixture, { id: 'group-outline', name: 'CH0336_Pike_Outline', anchor: true })
    const bullet = addSourceCompleteStructuralRenderer(fixture, { id: 'group-bullet', name: 'CH0336_Bullet', anchor: true })
    fixture.candidate.assembly![0].renderers[0].boneReferences = []
    return { fixture, weapon, outline, bullet }
  }
  const complete = build()
  const completeProfile = buildChibiRenderingProfile(complete.fixture.candidate, complete.fixture.prefabPath, emptyChibiProfile('ExactAnchorGroup'))
  assert.deepEqual(completeProfile.coreRendererBlockers, [])
  assert.equal(completeProfile.equipmentBindingEvidence.filter(item =>
    ['group-weapon', 'group-outline', 'group-bullet'].includes(item.sourceReference.objectId)).length, 3)

  const decoy = build()
  const foreignAnchor = {
    ...decoy.outline.anchor,
    pathId: 'same-name-different-id',
    sourceReference: reference(hash('a'), 'CAB-prefab', 'same-name-different-id'),
  }
  decoy.outline.renderer.rootBone = foreignAnchor
  decoy.outline.renderer.transformChain![1] = foreignAnchor
  decoy.outline.renderer.boneReferences = [foreignAnchor]
  const decoyProfile = buildChibiRenderingProfile(decoy.fixture.candidate, decoy.fixture.prefabPath, emptyChibiProfile('SameNameDifferentIdDecoy'))
  const outlineEvidence = decoyProfile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === 'group-outline')
  assert.ok(outlineEvidence)
  assert.equal(outlineEvidence.matchedAncestorPointers.some(pointer => pointer.pathId === decoy.weapon.anchor.pathId), false)

  const mutations = [
    (fixture: ReturnType<typeof makeCandidate>, member: ReturnType<typeof addSourceCompleteStructuralRenderer>) => {
      member.renderer.materialSlots![0]!.material = { file: 'CAB-unknown-material', pathId: 'missing' }
    },
    (_fixture: ReturnType<typeof makeCandidate>, member: ReturnType<typeof addSourceCompleteStructuralRenderer>) => {
      member.renderer.meshSourceReference = null
    },
    (_fixture: ReturnType<typeof makeCandidate>, member: ReturnType<typeof addSourceCompleteStructuralRenderer>) => {
      const chain = member.renderer.rootBoneAncestry as Array<Record<string, unknown>>
      chain[0] = { ...chain[0], file: 'CAB-foreign', sourceReference: reference(hash('z'), 'CAB-foreign', String(chain[0]!.pathId)) }
    },
    (_fixture: ReturnType<typeof makeCandidate>, member: ReturnType<typeof addSourceCompleteStructuralRenderer>) => {
      member.renderer.boneReferences = [{ ...member.anchor, name: 'Different_Name_Same_PPtr' }]
    },
    (fixture: ReturnType<typeof makeCandidate>, member: ReturnType<typeof addSourceCompleteStructuralRenderer>) => {
      fixture.candidate.assembly![0].renderers[0].boneReferences = [member.anchor]
    },
  ]
  for (const [index, mutate] of mutations.entries()) {
    const group = build()
    mutate(group.fixture, group.bullet)
    const profile = buildChibiRenderingProfile(group.fixture.candidate, group.fixture.prefabPath, emptyChibiProfile(`IncompleteAnchorGroup${index}`))
    assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === 'group-weapon'), false)
    assert.equal(profile.validation.valid, false)
    assert.ok(profile.coreRendererBlockers.length >= 1)
  }
})

test('shared equipment evidence does not waive an unresolved child-renderer action target', () => {
  const fixture = makeCandidate('anchor_group_action_fail_closed', ['Policy_Body'])
  const weapon = addSourceCompleteStructuralRenderer(fixture, { id: 'action-group-weapon', name: 'CH0336_Weapon', anchor: true })
  addSourceCompleteStructuralRenderer(fixture, { id: 'action-group-outline', name: 'CH0336_Pike_Outline', anchor: true })
  fixture.candidate.assembly![0].renderers[0].boneReferences = []
  const clip = fixture.candidate.clips[0] as string
  fixture.candidate.events = [{ clip, time: 0.5, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 3 }]
  const interaction = emptyChibiProfile('AnchorGroupAction')
  interaction.initialPose = clip
  interaction.interactions.idle = { state: 'available', clip, loop: true, hold: false }
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, interaction)
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /no exact source renderer-ID binding/)
})

test('classifies exact same-prefab Bip001 whitespace prop ancestry as structural equipment', () => {
  const fixture = makeCandidate('structural_bip001_prop1_whitespace_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture, { name: 'CH0332_Weapon' })
  const assembly = fixture.candidate.assembly![0]
  const pointer = (pathId: string, name: string) => ({ file: 'CAB-prefab', pathId, name })
  const rootBone = pointer('prop1', 'Bip001 Prop1')
  added.renderer.hierarchyPath = `${assembly.root}/CH0332_Weapon`
  added.renderer.rootBone = rootBone
  added.renderer.transformChain = [pointer('root', assembly.root), pointer('renderer', added.renderer.name)]
  added.renderer.boneReferences = [rootBone, pointer('magazine', 'bone_w_magazine')]
  added.body.boneReferences = []

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralBip001Prop1'))
  const evidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === added.sourceReference.objectId)
  assert.ok(evidence)
  assert.equal(evidence.classification, 'structurally-bound-equipment')
  assert.deepEqual(evidence.matchedAncestorPointers.map(item => item.name), ['Bip001 Prop1'])
  assert.deepEqual(evidence.bodyRendererReferences, [])
  assert.deepEqual(profile.coreRendererBlockers, [])
})

test('does not promote Bip001 whitespace prop ancestry when its pointer leaves the selected prefab', () => {
  const fixture = makeCandidate('structural_bip001_prop1_cross_prefab_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture, { name: 'CH0332_Weapon' })
  const assembly = fixture.candidate.assembly![0]
  const pointer = (file: string, pathId: string, name: string) => ({ file, pathId, name })
  const rootBone = pointer('CAB-other-prefab', 'prop1', 'Bip001 Prop1')
  added.renderer.hierarchyPath = `${assembly.root}/CH0332_Weapon`
  added.renderer.rootBone = rootBone
  added.renderer.transformChain = [pointer('CAB-prefab', 'root', assembly.root), pointer('CAB-prefab', 'renderer', added.renderer.name)]
  added.renderer.boneReferences = [rootBone, pointer('CAB-other-prefab', 'magazine', 'bone_w_magazine')]
  added.body.boneReferences = []

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralBip001Prop1CrossPrefab'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
})

test('classifies a source-exact weapon with a unique same-prefab Bip001_Weapon m_Bones anchor as structural equipment', () => {
  const fixture = makeCandidate('structural_weapon_relation_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture)
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralEquipment'))
  const evidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === added.sourceReference.objectId)
  assert.ok(evidence)
  assert.equal(evidence.classification, 'structurally-bound-equipment')
  assert.equal(evidence.reasonCode, 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY')
  assert.match(evidence.reason, /no mainWeapon\/subWeapon slot was inferred/)
  assert.deepEqual(evidence.bodyRendererReferences, [])
  assert.deepEqual(evidence.matchedAncestorPointers.map(item => item.name), ['Bip001_Weapon'])
  assert.deepEqual(profile.validation.equipmentBindingEvidence, profile.equipmentBindingEvidence)
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.equal(profile.assembly?.attachments.mainWeapon?.length ?? 0, 0)
  assert.equal(profile.assembly?.attachments.subWeapon?.length ?? 0, 0)
})

test('classifies a Hoshino-shaped shield from a unique exact shared m_Bones relation', () => {
  const fixture = makeCandidate('hoshino_armed_shared_shield_policy', ['Policy_Body'])
  const { weapon, shield, sharedBones } = addSharedBoneShieldRenderers(fixture)
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('HoshinoArmedSharedShield'))
  const weaponEvidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === weapon.sourceReference.objectId)
  const shieldEvidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === shield.sourceReference.objectId)
  assert.ok(weaponEvidence)
  assert.equal(weaponEvidence.classification, 'exact-main-sub-equipment')
  assert.ok(shieldEvidence)
  assert.equal(shieldEvidence.classification, 'structurally-bound-equipment')
  assert.equal(shieldEvidence.reasonCode, 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY')
  assert.deepEqual(new Set(shieldEvidence.matchedAncestorPointers.map(item => item.name)), new Set(sharedBones.map(item => item.name)))
  assert.deepEqual(shieldEvidence.bodyRendererReferences, [])
  assert.match(shieldEvidence.reason, /unique same-prefab equipment relation/)
  assert.match(shieldEvidence.evidence.join(' | '), /exact serialized pointer\(s\)/)
  assert.ok(shieldEvidence.evidence.includes('body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement'))
  assert.equal(shieldEvidence.evidence.some(value => /^body m_Bones overlap: bone_/.test(value)), false)
  assert.match(shieldEvidence.evidence.join(' | '), /unique non-conflicting same-prefab shared m_Bones relation/)
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '))
})

test('keeps a Hoshino-shaped shield blocked when fewer than three m_Bones pointers are shared', () => {
  const fixture = makeCandidate('hoshino_shared_shield_two_bones_policy', ['Policy_Body'])
  const { weapon, shield } = addSharedBoneShieldRenderers(fixture, { sharedCount: 2 })
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('HoshinoTwoSharedBones'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === shield.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [shield.sourceReference.objectId])
})

test('keeps a Hoshino-shaped shield blocked when one shared m_Bones pointer crosses prefabs', () => {
  const fixture = makeCandidate('hoshino_shared_shield_cross_prefab_policy', ['Policy_Body'])
  const { weapon, shield } = addSharedBoneShieldRenderers(fixture, { crossPrefabShared: true })
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('HoshinoCrossPrefabSharedBones'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === shield.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [shield.sourceReference.objectId])
})

test('keeps a Hoshino-shaped shield blocked when body m_Bones claim a shared pointer', () => {
  const fixture = makeCandidate('hoshino_shared_shield_body_overlap_policy', ['Policy_Body'])
  const { weapon, shield } = addSharedBoneShieldRenderers(fixture, { bodyOverlap: true })
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('HoshinoBodySharedBone'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === shield.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [shield.sourceReference.objectId])
})

test('keeps Hoshino-shaped shared m_Bones renderers blocked when the relation is accessory-ambiguous', () => {
  const fixture = makeCandidate('hoshino_shared_shield_competing_policy', ['Policy_Body'])
  const { weapon, shield, competing } = addSharedBoneShieldRenderers(fixture, { competingRenderer: true })
  assert.ok(competing)
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('HoshinoCompetingSharedBones'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.deepEqual(profile.equipmentBindingEvidence.filter(item =>
    [shield.sourceReference.objectId, competing!.sourceReference.objectId].includes(item.sourceReference.objectId)), [])
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId).sort(), [
    shield.sourceReference.objectId, competing.sourceReference.objectId,
  ].sort())
})

test('does not promote a Hoshino-named renderer when only its display name says shield', () => {
  const fixture = makeCandidate('hoshino_named_shield_without_bone_role_policy', ['Policy_Body'])
  const { weapon, shield, sharedBones } = addSharedBoneShieldRenderers(fixture)
  shield.renderer.rootBone!.name = 'bone_AccRoot'
  for (const pointer of shield.renderer.boneReferences ?? []) {
    if (!sharedBones.some(shared => shared.pathId === pointer.pathId)) pointer.name = 'bone_AccLocal'
  }
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('HoshinoDisplayNameOnly'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === shield.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [shield.sourceReference.objectId])
})

test('keeps a shared m_Bones shield blocked when its exact mesh pointer is changed', () => {
  const fixture = makeCandidate('hoshino_shared_shield_mesh_identity_policy', ['Policy_Body'])
  const { weapon, shield } = addSharedBoneShieldRenderers(fixture)
  shield.renderer.mesh = { file: 'CAB-policy-meshes', pathId: 'wrong-shield-mesh' }
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('HoshinoMeshIdentity'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === shield.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [shield.sourceReference.objectId])
})

test('keeps a shared m_Bones shield blocked when its exact material or shader pointer changes', () => {
  for (const mutation of ['material', 'shader'] as const) {
    const fixture = makeCandidate(`hoshino_shared_shield_${mutation}_identity_policy`, ['Policy_Body'])
    const { weapon, shield } = addSharedBoneShieldRenderers(fixture)
    if (mutation === 'material') {
      shield.renderer.materialSlots![0].material = { file: 'CAB-policy-materials', pathId: 'wrong-shield-material' }
    } else {
      const sourceMaterialReference = shield.renderer.materialSlots![0].sourceMaterialReference!
      const sourceMaterial = fixture.candidate.sourceMaterials!.find(item => item.sourceReference?.objectId === sourceMaterialReference.objectId)
      assert.ok(sourceMaterial)
      sourceMaterial.shader = { file: 'CAB-policy-shaders', pathId: 'wrong-shield-shader' }
    }
    const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile(`Hoshino${mutation}Identity`))
    assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === weapon.sourceReference.objectId), true)
    assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === shield.sourceReference.objectId), false)
    assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [shield.sourceReference.objectId])
  }
})

test('keeps structural equipment unresolved when equal names point at different source bones', () => {
  const fixture = makeCandidate('structural_same_name_pointer_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture)
  added.renderer.rootBone = { ...added.anchor, pathId: '999', name: added.anchor.name }
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralSameName'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
  assert.match(profile.validation.unresolved.join(' '), /without an exact authored attachment relation/)
})

test('keeps structural equipment unresolved when transform ancestry does not match the selected prefab hierarchy', () => {
  const fixture = makeCandidate('structural_no_ancestry_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture)
  added.renderer.hierarchyPath = `${fixture.candidate.assembly![0].root}/FX_Local/Bip001_Weapon/${added.renderer.name}`
  added.renderer.transformChain = [
    { file: 'CAB-prefab', pathId: '1', name: fixture.candidate.assembly![0].root },
    { file: 'CAB-prefab', pathId: '2', name: 'Unrelated_Branch' },
    { file: 'CAB-prefab', pathId: '20', name: added.renderer.name },
  ]
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralNoAncestry'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
})

test('does not cross-bind a private/public turret renderer to the selected prefab skeleton', () => {
  const fixture = makeCandidate('structural_private_public_turret_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture, {
    name: 'Utaha_Original_Turret',
    rootBranch: 'Character_Robot/Turret',
    sourceReference: reference(hash('p'), 'CAB-prefab', '600002'),
  })
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralPrivatePublic'))
  assert.equal(profile.equipmentBindingEvidence.some(item => item.sourceReference.objectId === added.sourceReference.objectId), false)
  assert.deepEqual(profile.coreRendererBlockers.map(item => item.sourceReference.objectId), [added.sourceReference.objectId])
})

test('keeps a source-hierarchical weapon structural when its weapon bones have zero body m_Bones overlap', () => {
  const fixture = makeCandidate('structural_zero_body_overlap_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture)
  added.body.boneReferences = [{ file: 'CAB-prefab', pathId: '777', name: 'Bip001_Weapon' }]
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralZeroOverlap'))
  const evidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === added.sourceReference.objectId)
  assert.ok(evidence)
  assert.equal(evidence.classification, 'structurally-bound-equipment')
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.match(evidence.evidence.join(' | '), /body m_Bones overlap: none/)
})

test('prefers the exact equipmentRendererReferences classification over structural evidence', () => {
  const fixture = makeCandidate('structural_exact_slot_preference_policy', ['Policy_Body'])
  const added = addStructuralEquipmentRenderer(fixture)
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.equipmentRendererReferences = [added.sourceReference]
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('StructuralExactSlot'))
  const evidence = profile.equipmentBindingEvidence.find(item => item.sourceReference.objectId === added.sourceReference.objectId)
  assert.ok(evidence)
  assert.equal(evidence.classification, 'exact-equipment-renderer')
  assert.equal(evidence.reasonCode, 'EXACT_EQUIPMENT_RENDERER_REFERENCE')
  assert.equal(profile.equipmentBindingEvidence.filter(item => item.sourceReference.objectId === added.sourceReference.objectId).length, 1)
  assert.deepEqual(profile.coreRendererBlockers, [])
})

test('does not misclassify presentation FX, halos, bags, props, or no-weapon bodies as equipment blockers', () => {
  const fixture = makeCandidate('equipment_false_positive_policy', ['NoWeapon_Body'])
  const fx = addPolicyRenderer(fixture, {
    name: 'FX_Weapon_Glow',
    hierarchyPath: 'Cafe_False_Positive/FX_Camera/FX_Weapon_Glow',
    materialName: 'FX_Weapon_Glow',
    shaderName: 'DSFX/FX_SHADER_Unsupported',
    mesh: { file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID },
  })
  const halo = addPolicyRenderer(fixture, {
    name: 'Character_Halo',
    hierarchyPath: 'Cafe_False_Positive/HaloRoot/Character_Halo',
    materialName: 'Character_Halo',
    shaderName: 'MXCharacterHaloTex',
  })
  const bag = addPolicyRenderer(fixture, {
    name: 'Handbag_Outline',
    hierarchyPath: 'Cafe_False_Positive/Accessory/Handbag_Outline',
    materialName: 'Handbag_Outline',
    shaderName: 'MX/C-General',
  })
  const prop = addPolicyRenderer(fixture, {
    name: 'SkillProp',
    hierarchyPath: 'Cafe_False_Positive/Skill/SkillProp',
    materialName: 'SkillProp',
    shaderName: 'MX/C-General',
  })
  const weakWeapon = addPolicyRenderer(fixture, {
    name: 'Weapon_Unresolved',
    hierarchyPath: 'Cafe_False_Positive/Unknown/Weapon_Unresolved',
    materialName: 'Weapon_Unresolved_Material',
    shaderName: 'MX/C-Weapon',
  })
  weakWeapon.renderer.meshSourceReference = null

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('FalsePositive'))
  assert.deepEqual(profile.coreRendererBlockers, [])
  assert.deepEqual(profile.excludedRenderers.map(item => item.sourceReference.objectId), [fx.sourceReference.objectId])
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === halo.sourceReference.objectId), true)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === bag.sourceReference.objectId), true)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === prop.sourceReference.objectId), true)
  assert.match(profile.validation.unresolved.join(' '), /ambiguous source mesh reference/)
})

test('excludes exact shield/phone presentation children while retaining cut-in body core', () => {
  const fixture = makeCandidate('attached_policy_fixture', ['Attached_Body'])
  addPolicyRenderer(fixture, {
    name: 'Logo',
    hierarchyPath: 'Cafe_Attached/bone_root/bone_shield_root/Point014/FX_Attached_Ex01_Logo_01/Logo',
  })
  addPolicyRenderer(fixture, {
    name: 'Light',
    hierarchyPath: 'Cafe_Attached/bone_Smartphone/FX_Attached_Phone_Light_Mesh/Light',
  })
  addPolicyRenderer(fixture, {
    name: 'CH0123_CutIn_Body',
    hierarchyPath: 'Cafe_Attached/EX_Root/CH0123_CutIn_Cam/Camera001/CH0123_CutIn_Body',
  })
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('Attached'))
  assert.deepEqual(profile.excludedRenderers.map(renderer => renderer.name), ['Logo', 'Light'])
  assert.deepEqual(profile.renderers.map(renderer => renderer.name), ['Attached_Policy_Fixture_Body', 'CH0123_CutIn_Body'])
  assert.equal(profile.validation.valid, false)
  assert.match(profile.validation.unresolved.join(' '), /Unsupported source shader DSFX\/FX_SHADER_Unsupported/)
})

test('does not let a legacy equipment name promote a same-name renderer with a different exact reference', () => {
  const fixture = makeCandidate('same_name_equipment_policy', ['Policy_Body'])
  const actual = addPolicyRenderer(fixture, {
    name: 'Shared_Weapon',
    hierarchyPath: 'Cafe_Same_Name/Core/Shared_Weapon',
    equipmentReference: true,
  })
  const decoy = addPolicyRenderer(fixture, {
    name: 'Shared_Weapon',
    hierarchyPath: 'Cafe_Same_Name/FX_Camera/Shared_Weapon',
  })
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.equipmentRenderers = ['Shared_Weapon']
  attachments.equipmentRendererReferences = [actual.sourceReference]

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('SameName'))
  assert.equal(profile.renderers.some(renderer => renderer.sourceReference?.objectId === actual.sourceReference.objectId), true)
  assert.deepEqual(profile.excludedRenderers.map(renderer => renderer.sourceReference.objectId), [decoy.sourceReference.objectId])
})

test('does not use a root-bone name when the exact serialized root-bone pointer collides', () => {
  const fixture = makeCandidate('root_bone_collision_policy', ['Policy_Body'])
  const renderer = addPolicyRenderer(fixture, {
    name: 'WeaponBoneEffect',
    hierarchyPath: 'Cafe_Root_Bone/FX_Camera/WeaponBoneEffect',
  }).renderer
  renderer.rootBone = {
    file: 'CAB-policy-bones', pathId: '200', name: 'SharedWeaponBone',
    sourceReference: reference(hash('r'), 'CAB-policy-bones', '200'),
  } as typeof renderer.rootBone
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.mainWeapon = [{
    file: 'CAB-policy-bones', pathId: '200', name: 'SharedWeaponBone',
    sourceReference: reference(hash('s'), 'CAB-policy-bones', '200'),
  }]
  attachments.equipmentRenderers = ['WeaponBoneEffect']

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('RootBone'))
  assert.deepEqual(profile.excludedRenderers.map(item => item.sourceReference.objectId), [renderer.sourceReference!.objectId])
})

test('fails closed when a presentation renderer has an unknown mixed material slot', () => {
  const fixture = makeCandidate('mixed_slot_policy', ['Policy_Body'])
  const renderer = addPolicyRenderer(fixture, {
    name: 'FX_Mixed_Slots',
    hierarchyPath: 'Cafe_Mixed/FX_Camera/FX_Mixed_Slots',
  }).renderer
  const unknownMaterialReference = reference(hash('u'), 'CAB-unknown-materials', '999')
  renderer.materialSlots!.push({
    slot: 1,
    material: { file: unknownMaterialReference.serializedFile, pathId: unknownMaterialReference.objectId },
    sourceMaterialReference: unknownMaterialReference,
  })

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('Mixed'))
  assert.equal(profile.excludedRenderers.length, 0)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === renderer.sourceReference!.objectId), true)
  assert.match(profile.validation.unresolved.join(' '), /material .* is missing from the candidate closure/)
})

test('protects exact mouth and eye bindings before presentation classification', () => {
  const fixture = makeCandidate('binding_policy', ['Policy_Body'])
  const mouth = addPolicyRenderer(fixture, {
    name: 'Mouth_CutIn_Body',
    hierarchyPath: 'Cafe_Binding/Ex_Root/Cutin_Cam/Mouth_CutIn_Body',
  })
  const eyes = addPolicyRenderer(fixture, {
    name: 'FX_Eye_Binding',
    hierarchyPath: 'Cafe_Binding/FX_Camera/FX_Eye_Binding',
  })
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  attachments.mouthRenderer = [{ file: mouth.sourceReference.serializedFile, pathId: mouth.sourceReference.objectId, sourceReference: mouth.sourceReference }]
  attachments.mouthMaterialIndex = 0
  attachments.eyes = [{ file: eyes.sourceReference.serializedFile, pathId: eyes.sourceReference.objectId, sourceReference: eyes.sourceReference }]

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('Binding'))
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === mouth.sourceReference.objectId), false)
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === eyes.sourceReference.objectId), false)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === mouth.sourceReference.objectId), true)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === eyes.sourceReference.objectId), true)
})

test('protects a mouth renderer from its exact sourceRendererReference metadata', () => {
  const fixture = makeCandidate('metadata_binding_policy', ['Policy_Body'])
  const mouth = addPolicyRenderer(fixture, {
    name: 'CH0123_CutIn_Body',
    hierarchyPath: 'Cafe_Metadata/FX_Cutin_Cam/CH0123_CutIn_Body',
  })
  const attachments = fixture.candidate.assembly![0].attachments as Record<string, unknown>
  delete attachments.mouthRenderer
  attachments.mouthMetadata = [{
    renderer: { file: mouth.sourceReference.serializedFile, pathId: mouth.sourceReference.objectId },
    sourceRendererReference: mouth.sourceReference,
    materialIndex: 0,
  }]
  attachments.mouthMaterialIndex = 0

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('Metadata'))
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === mouth.sourceReference.objectId), false)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === mouth.sourceReference.objectId), true)
})

test('keeps exact core names, halo shader evidence, and equipment beside excluded children', () => {
  const fixture = makeCandidate('exact_core_policy', ['Policy_Body'])
  const shield = addPolicyRenderer(fixture, {
    name: 'Hoshino_Original_Shield_Weapon',
    hierarchyPath: 'Cafe_Exact_Core/Shield/Hoshino_Original_Shield_Weapon',
    equipmentReference: true,
  })
  const logo = addPolicyRenderer(fixture, {
    name: 'Logo (1)',
    hierarchyPath: 'Cafe_Exact_Core/bone_shield_root/FX_Attached_Ex01_Logo_01/Logo (1)',
  })
  const phone = addPolicyRenderer(fixture, {
    name: 'Miyako_Original_Smartphone_Outline',
    hierarchyPath: 'Cafe_Exact_Core/Phone/Miyako_Original_Smartphone_Outline',
    equipmentReference: true,
  })
  const light = addPolicyRenderer(fixture, {
    name: 'Light',
    hierarchyPath: 'Cafe_Exact_Core/bone_Smartphone/FX_Attached_Phone_Light_Mesh/Light',
  })
  const halo = addPolicyRenderer(fixture, {
    name: 'Character_Halo',
    hierarchyPath: 'Cafe_Exact_Core/HaloRoot/Character_Halo',
    shaderName: 'MXCharacterHaloTex',
    materialName: 'Character_Halo',
  })

  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('ExactCore'))
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === shield.sourceReference.objectId), false)
  assert.equal(profile.excludedRenderers.some(item => item.sourceReference.objectId === phone.sourceReference.objectId), false)
  assert.deepEqual(profile.excludedRenderers.map(item => item.sourceReference.objectId), [logo.sourceReference.objectId, light.sourceReference.objectId])
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === halo.sourceReference.objectId), true)
})

test('keeps explicitly authored Aris weapon and cut-in body core even under FX branches', () => {
  const fixture = makeCandidate('exact_named_core_policy', ['Policy_Body'])
  const weapon = addPolicyRenderer(fixture, {
    name: 'FX_Aris_Original_Weapon',
    hierarchyPath: 'Cafe_Aris/FX_Weapon_Camera/FX_Aris_Original_Weapon',
  })
  const body = addPolicyRenderer(fixture, {
    name: 'CH0123_CutIn_Body',
    hierarchyPath: 'Cafe_Aris/CH0123_CutIn_Cam/CH0123_CutIn_Body',
  })
  const profile = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('NamedCore'))
  assert.equal(profile.excludedRenderers.length, 0)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === weapon.sourceReference.objectId), true)
  assert.equal(profile.renderers.some(item => item.sourceReference?.objectId === body.sourceReference.objectId), true)
  assert.equal(profile.validation.valid, false)
})

test('records exact presentation child-renderer events but blocks unresolved targets', () => {
  const fixture = makeCandidate('event_policy_fixture', ['Event_Body'])
  const { candidate, prefabPath } = fixture
  const fx = addPolicyRenderer(fixture, {
    name: 'FX_Focus',
    hierarchyPath: 'Cafe_Event/EX_Root/Event_Exs_Cutin_Cam/Camera001/FX_Focus',
  })
  const clip = 'Event_Fixture_Cafe_Idle'
  const interaction = emptyChibiProfile('Event')
  interaction.initialPose = clip
  interaction.interactions.idle = { state: 'available', clip, loop: true, hold: false }
  candidate.events = [{
    clip, time: 0.5, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 3,
    targetReference: fx.sourceReference,
  }]
  const excludedEventProfile = buildChibiRenderingProfile(candidate, prefabPath, interaction)
  assert.equal(excludedEventProfile.validation.valid, true, excludedEventProfile.validation.unresolved.join('; '))
  assert.deepEqual(excludedEventProfile.childRendererEvents, [])
  assert.equal(excludedEventProfile.excludedChildRendererEvents.length, 1)
  assert.equal(excludedEventProfile.excludedChildRendererEvents[0].reasonCode, 'PRESENTATION_CHILD_RENDERER_EVENT')

  candidate.events = [{ clip, time: 0.5, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 3 }]
  const unresolvedProfile = buildChibiRenderingProfile(candidate, prefabPath, interaction)
  assert.equal(unresolvedProfile.excludedChildRendererEvents.length, 0)
  assert.equal(unresolvedProfile.validation.valid, false)
  assert.match(unresolvedProfile.validation.unresolved.join(' '), /no exact source renderer-ID binding/)
})

test('orders exclusion diagnostics deterministically and covers audited presentation evidence patterns', () => {
  const patterns = [
    ['Logo (1)', 'Cafe_Audit/FX_Hoshino_Ex01_Logo_01/Logo (1)'],
    ['glitch', 'Cafe_Audit/Ex_Root/Audit_Original_Cam/Camera/glitch'],
    ['BG_White (1)', 'Cafe_Audit/EX_Root/Audit_Exs_Cutin_Cam/Camera001/BG_White (1)'],
    ['FX_Focus', 'Cafe_Audit/EX_Root/Audit_Exs_Cutin_Cam/Camera001/FX_Focus'],
    ['FX_CH0124_Cam_Screen', 'Cafe_Audit/EX_Root/Audit_Exs_Cutin_Cam/Camera001/FX_CH0124_Cam_Screen'],
    ['Butterfly', 'Cafe_Audit/bone_root/FX_Audit_Pickup/FX_Audit_Pickup_Butterfly/Butterfly'],
    ['plane', 'Cafe_Audit/Ex_Root/Audit_Original_Exs_Cam/Camera001/plane'],
    ['FX_MESH_Flower_01', 'Cafe_Audit/Ex_Root/FX_Local_DM/Flower_AnimPos/Flower_01/FX_MESH_Flower_01'],
  ] as const
  const fixture = makeCandidate('audit_policy_fixture', ['Audit_Body'])
  for (const [name, hierarchyPath] of patterns) addPolicyRenderer(fixture, { name, hierarchyPath })
  const first = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('Audit'))
  const second = buildChibiRenderingProfile(fixture.candidate, fixture.prefabPath, emptyChibiProfile('Audit'))
  assert.equal(first.validation.valid, true, first.validation.unresolved.join('; '))
  assert.equal(first.excludedRenderers.length, patterns.length)
  assert.deepEqual(first.excludedRenderers, second.excludedRenderers)
  assert.deepEqual(first.excludedChildRendererEvents, second.excludedChildRendererEvents)
  assert.deepEqual(first.excludedRenderers.map(item => sourceObjectKey(item.sourceReference)), [
    ...first.excludedRenderers.map(item => sourceObjectKey(item.sourceReference)).sort(),
  ])
})
