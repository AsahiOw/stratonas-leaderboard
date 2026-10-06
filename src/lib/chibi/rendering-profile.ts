import { UNITY_BUILTIN_QUAD_PATH_ID, UNITY_BUILTIN_RESOURCES_FILE, unityBuiltinQuadReference } from './unity-builtin'
import { isChibiInstantiateFxEventFunction } from './fx-event-policy'
import type { ChibiInstantiateFxEventFunction } from './fx-event-policy'
import type {
  InventoryAssembly,
  InventoryAssemblyPointer,
  InventoryAssemblyRenderer,
  InventoryBuiltinResourceReference,
  InventoryFxPPtrEvidence,
  InventoryFxTargetEvidence,
  InventoryEvent,
  InventoryMaterial,
  InventoryShader,
  InventoryShaderExtraction,
  InventoryPointer,
  InventorySourceReference,
  ResolvedMaterial,
  SourceCandidate,
} from './inventory'
import type { ChibiProfile } from './types'
import { sourceAnimationClips } from './mapping'

export const CHIBI_RENDERING_PROFILE_VERSION = 'chibi-rendering-profile-v10'
/**
 * Renderer-role classification is part of the serialized profile contract.
 * Bump this whenever source evidence or the fail-closed exclusion policy
 * changes so stale profiles cannot silently retain the old scope.
 */
export const CHIBI_RENDERING_POLICY_VERSION = 'chibi-rendering-policy-v15'
/** Source-bound identity for the current fail-closed particle-only FX exclusion rule. */
export const CHIBI_FX_EXCLUSION_POLICY_VERSION = 'chibi-particle-only-instantiate-fx-v2'
export const CHIBI_SHADER_ADAPTER_VERSION = 'mx-character-adapters-v9'

/** Exact MonoScript PPtr source identities from the read-only BAAD census. */
export const CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES = [
  {
    bundleSha256: 'e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29',
    serializedFile: 'CAB-4e374e23f1bd4e7218b8fbcbec01546f',
    objectId: '460590081893560622',
  },
  {
    bundleSha256: 'e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29',
    serializedFile: 'CAB-4e374e23f1bd4e7218b8fbcbec01546f',
    objectId: '-529717931869727251',
  },
  {
    bundleSha256: 'e1fb78acaa16173dcf2e50f28bc43d8e18ddbdc0717f89a892b0ce6eac9dec29',
    serializedFile: 'CAB-4e374e23f1bd4e7218b8fbcbec01546f',
    objectId: '4955142931926258075',
  },
] as const satisfies readonly InventorySourceReference[]

const SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE = {
  prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0081/Cafe/Cafe_CH0081.prefab',
  prefabReference: {
    bundleSha256: 'dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d',
    serializedFile: 'CAB-241dbfc78955d74e6aa6ee05bb096ecf',
    objectId: '-8585771901269975806',
  },
  renderer: {
    sourceReference: {
      bundleSha256: 'dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d',
      serializedFile: 'CAB-241dbfc78955d74e6aa6ee05bb096ecf',
      objectId: '-6903816935868408574',
    },
    name: 'CH0081_Body',
    hierarchyPath: 'Cafe_CH0081/CH0081_Body',
    rendererType: 'SkinnedMeshRenderer',
  },
  sourceMeshReference: {
    bundleSha256: '12145f231b3c8b093c728296b771f4ae89a1fdd9e98f3afc915668fcd77591c5',
    serializedFile: 'CAB-74b254d25a0b77afb604cb26c86ff7a2',
    objectId: '8052939068824350260',
  },
  legacyMeasurement: {
    primitiveIndex: 0,
    componentLabels: ['Head', 'torso'],
    sourceGap: 0.1780399764,
    sourceUnit: 'Unity mesh units',
    bridgingTriangles: 0,
  },
  retainedMaterialSlots: [
    { slot: 0, sourceMaterialName: 'CH0081_Body', sourceMaterialReference: { bundleSha256: '5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', serializedFile: 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', objectId: '4325420936880560113' } },
    { slot: 1, sourceMaterialName: 'CH0081_Face', sourceMaterialReference: { bundleSha256: '5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', serializedFile: 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', objectId: '2295227601622239349' } },
    { slot: 2, sourceMaterialName: 'CH0081_Eyebrow', sourceMaterialReference: { bundleSha256: '5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', serializedFile: 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', objectId: '7037462322176008259' } },
    { slot: 3, sourceMaterialName: 'CH0081_EyeMouth', sourceMaterialReference: { bundleSha256: '5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', serializedFile: 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', objectId: '-6701897569863049292' } },
    { slot: 4, sourceMaterialName: 'CH0081_Hair', sourceMaterialReference: { bundleSha256: '5e6d6f4d8268591c7d34552003a9180b9289bcfc40c7dd716267a36c2fc1b236', serializedFile: 'CAB-531b6dac764c7c3cb68e06bcb5e8d331', objectId: '-1296136910868312838' } },
  ],
} as const

export type ChibiShaderAdapterId =
  | 'mx-character-face'
  | 'mx-character-eyemouth'
  | 'mx-character-eyebrow'
  | 'mx-character-hair'
  | 'mx-character-general'
  | 'mx-character-weapon'
  | 'mx-c-transparent-st'
  | 'projectmx-weapon-test1-damage'
  | 'mx-e-standard'
  | 'mx-e-water-v2'
  | 'mx-unlit-outline'
  | 'dsfx-static'
  | 'dsfx-glitch-tex'
  | 'dsfx-matcap'
  | 'gltf-native'

/**
 * The AlphaBlend_0 source object has three source-proven translated state
 * shapes.  Keep the identifiers narrow: they are evidence labels, not a
 * generic permission to vary depth or culling at runtime.
 */
export type DsfxStaticRenderStateVariant =
  | 'static-default'
  | 'depth-tested-back-cull'
  | 'depth-tested-off-double-sided'

export interface RenderingProfileMaterialSlot {
  slot: number
  sourceMaterialReference: InventorySourceReference | null
  sourceMaterialName: string | null
  sourceShaderReference: InventorySourceReference | null
  sourceShaderName: string | null
  sourceShaderParsedName: string | null
  shaderProgramBlobSha256: string | null
  /**
   * For MX/Unlit Outline this contains only the source-selected GLES3 Forward
   * and Outline pass programs.  The full extractor result never reaches a
   * published profile.
   */
  shaderExtraction?: RenderingProfileShaderExtraction | null
  /** Exact source-selected GLES3 passes for MX/C-Transparent-ST. */
  transparentShaderExtraction?: RenderingProfileTransparentShaderExtraction | null
  /** Compact source-selected GLES3 records for ProjectMX/WeaponTest1Damage. */
  projectMxShaderExtraction?: RenderingProfileProjectMxShaderExtraction | null
  /** Compact source-selected GLES3 records for the verified MX/E-Standard shader. */
  eStandardShaderExtraction?: RenderingProfileEStandardShaderExtraction | null
  /** Full source extraction retained only for the verified DSFX static shader revisions. */
  dsfxShaderExtraction?: InventoryShaderExtraction | null
  /** Exact translated state variant for the verified static DSFX shaders. */
  dsfxRenderStateVariant?: DsfxStaticRenderStateVariant | null
  /** Exact source-material exception for Wakamo's shader-default white eye texture. */
  dsfxMaterialVariant?: 'wakamo-eye-white-default' | null
  /** Compact source-selected GLES3 Forward/ShadowCaster records for DSFX Glitch_Tex. */
  glitchShaderExtraction?: RenderingProfileGlitchShaderExtraction | null
  /** Compact source-selected GLES3 Forward/ShadowCaster records for DSFX Matcap. */
  matcapShaderExtraction?: RenderingProfileMatcapShaderExtraction | null
  adapterId: ChibiShaderAdapterId | null
  materialProperties: {
    floats: InventoryMaterial['floatProperties']
    ints: InventoryMaterial['intProperties']
    colors: InventoryMaterial['colorProperties']
    keywords?: InventoryMaterial['keywords']
    textures: InventoryMaterial['textures']
    resolvedTextures?: ResolvedMaterial['resolvedTextures']
  }
  adapterSettings: {
    zCorrection: number | null
    eyeTint: number[] | null
    mouthTint: number[] | null
    baseColorTint: number[] | null
    dsfxMultiply?: number | null
    outlineTint?: number[] | null
    outlineZCorrection?: number | null
    transparentVariant?: 'forward' | 'dither' | null
  }
  renderState: {
    sourceQueue: number
    layer: 'opaque' | 'transparent'
    alphaMode: 'OPAQUE' | 'MASK' | 'BLEND'
    depthWrite: boolean | null
    depthTest: boolean | null
    depthFunction: string | null
    cullMode: 'off' | 'front' | 'back' | null
    doubleSided: boolean | null
    blend: {
      source: number | null
      destination: number | null
      sourceAlpha?: number | null
      destinationAlpha?: number | null
      operation?: number | null
      operationAlpha?: number | null
    }
    polygonOffsetFactor: number | null
    polygonOffsetUnits: number | null
  }
  glb: { nodeIndex: number; nodeName: string; meshIndex: number; primitiveIndices: number[]; materialIndex: number; materialIndices: number[] } | null
}

export interface RenderingProfileShaderPass {
  pass: 'base' | 'outline'
  stateName: 'ForwardLit' | 'Outline'
  subShaderIndex: number
  passIndex: number
  stage: 'vertex'
  platform: number
  gpuProgramType: number
  blobIndex: number
  parameterBlobIndex: number | null
  parameterRecordSha256: string
  keywordIndices: number[]
  keywordNames: string[]
  programHash: string
  programDataSha256: string
  programRecordSha256: string
  glsl: string
  requiredAttributes: string[]
  requiredUniforms: string[]
  renderState: {
    zWrite: number
    zTest: number
    culling: number
  }
}

export interface RenderingProfileTransparentShaderPass {
  pass: 'forward' | 'dither' | 'depth'
  stateName: 'ForwardLit' | ''
  subShaderIndex: number
  passIndex: number
  stage: 'vertex'
  platform: number
  gpuProgramType: number
  blobIndex: number
  parameterBlobIndex: number | null
  parameterRecordSha256: string
  keywordIndices: number[]
  keywordNames: string[]
  programHash: string
  programDataSha256: string
  programRecordSha256: string
  glsl: string
  requiredAttributes: string[]
  requiredUniforms: string[]
  renderState: {
    zWrite: number
    zWriteProperty: string | null
    zTest: number
    culling: number
    cullingProperty: string | null
    sourceBlend: number
    destinationBlend: number
    sourceBlendAlpha: number
    destinationBlendAlpha: number
    blendOperation: number
    blendOperationAlpha: number
    colorMask: number
    depthOnly: boolean
  }
}

export interface RenderingProfileTransparentShaderExtraction {
  schemaVersion: number
  extractorVersion: number
  unityVersion: string
  fingerprint: string
  sourceReference: InventorySourceReference
  compressedBlobSha256: string
  passes: {
    forward: RenderingProfileTransparentShaderPass
    dither: RenderingProfileTransparentShaderPass
    depth: RenderingProfileTransparentShaderPass
  }
}

export interface RenderingProfileProjectMxShaderPass {
  pass: 'forward' | 'glow' | 'outline' | 'solidOutline' | 'shadow' | 'depth'
  stateName: 'ForwardLit' | 'Outline' | 'Solid Color Outline' | 'ShadowCaster' | 'DepthOnly'
  subShaderIndex: number
  passIndex: number
  stage: 'vertex'
  platform: number
  gpuProgramType: number
  blobIndex: number
  parameterBlobIndex: number
  parameterRecordSha256: string
  keywordIndices: number[]
  keywordNames: string[]
  programHash: string
  programDataSha256: string
  programDataLength: number
  programRecordSha256: string
  usesNoiseTexture: boolean
  glsl: string
  requiredAttributes: string[]
  requiredUniforms: string[]
  renderState: {
    zWrite: number
    zTest: number
    culling: number
    sourceBlend: number
    destinationBlend: number
    sourceBlendAlpha: number
    destinationBlendAlpha: number
    blendOperation: number
    blendOperationAlpha: number
    colorMask: number
    depthOnly: boolean
  }
}

export interface RenderingProfileProjectMxShaderExtraction {
  schemaVersion: number
  extractorVersion: number
  unityVersion: string
  fingerprint: string
  sourceReference: InventorySourceReference
  compressedBlobSha256: string
  shaderName: string
  shaderKeywordNames: string[]
  activeVariant: 'forward' | 'glow'
  activeKeywordNames: string[]
  requiredProperties: string[]
  requiredTextureProperties: string[]
  passes: {
    forward: RenderingProfileProjectMxShaderPass
    glow: RenderingProfileProjectMxShaderPass
    outline: RenderingProfileProjectMxShaderPass
    solidOutline: RenderingProfileProjectMxShaderPass
    shadow: RenderingProfileProjectMxShaderPass
    depth: RenderingProfileProjectMxShaderPass
  }
}

export interface RenderingProfileEStandardShaderPass {
  pass: 'forward' | 'forwardStatic' | 'forwardDynamic' | 'shadow' | 'depth' | 'meta'
  stateName: 'ForwardLit' | 'ShadowCaster' | 'DepthOnly' | 'Meta'
  passName: string
  subShaderIndex: number
  passIndex: number
  stage: 'vertex'
  platform: number
  gpuProgramType: number
  blobIndex: number
  parameterBlobIndex: number
  parameterRecordSha256: string
  keywordIndices: number[]
  keywordNames: string[]
  programHash: string
  programDataSha256: string
  programDataLength: number
  programRecordSha256: string
  glsl: string
  requiredAttributes: string[]
  requiredUniforms: string[]
  renderState: {
    zWrite: number
    zWriteProperty: string | null
    zTest: number
    zTestProperty: string | null
    culling: number
    cullingProperty: string | null
    sourceBlend: number
    sourceBlendProperty: string | null
    destinationBlend: number
    destinationBlendProperty: string | null
    sourceBlendAlpha: number
    sourceBlendAlphaProperty: string | null
    destinationBlendAlpha: number
    destinationBlendAlphaProperty: string | null
    blendOperation: number
    blendOperationAlpha: number
    colorMask: number
    depthOnly: boolean
    offsetFactor: number
    offsetFactorProperty: string | null
    offsetUnits: number
    offsetUnitsProperty: string | null
  }
}

export interface RenderingProfileEStandardShaderExtraction {
  schemaVersion: number
  extractorVersion: number
  unityVersion: string
  fingerprint: string
  sourceReference: InventorySourceReference
  compressedBlobSha256: string
  shaderName: string
  shaderKeywordNames: string[]
  activeVariant: 'static' | 'dynamic'
  activeKeywordNames: string[]
  requiredProperties: string[]
  /** All declared source texture properties; only _MainTex is bound by ForwardLit. */
  sourceTextureProperties: string[]
  requiredTextureProperties: string[]
  passes: {
    forward: RenderingProfileEStandardShaderPass
    forwardStatic: RenderingProfileEStandardShaderPass
    forwardDynamic: RenderingProfileEStandardShaderPass
    shadow: RenderingProfileEStandardShaderPass
    depth: RenderingProfileEStandardShaderPass
    meta: RenderingProfileEStandardShaderPass
  }
}

export interface RenderingProfileShaderExtraction {
  schemaVersion: number
  extractorVersion: number
  unityVersion: string
  fingerprint: string
  sourceReference: InventorySourceReference
  compressedBlobSha256: string
  passes: {
    base: RenderingProfileShaderPass
    outline: RenderingProfileShaderPass
  }
}

export interface RenderingProfileGlitchShaderPass {
  pass: 'forward' | 'shadow'
  stateName: 'Forward' | 'ShadowCaster'
  subShaderIndex: number
  passIndex: number
  stage: 'vertex'
  platform: number
  gpuProgramType: number
  blobIndex: number
  parameterBlobIndex: number
  parameterRecordSha256: string
  keywordIndices: number[]
  keywordNames: string[]
  programHash: string
  programDataSha256: string
  programDataLength: number
  programRecordSha256: string
  glsl: string
  requiredAttributes: string[]
  requiredUniforms: string[]
  renderState: {
    zWrite: number
    zTest: number
    culling: number
    cullingProperty: string | null
    sourceBlend: number
    destinationBlend: number
    sourceBlendAlpha: number
    destinationBlendAlpha: number
    blendOperation: number
    blendOperationAlpha: number
    colorMask: number
    depthOnly: boolean
  }
}

export interface RenderingProfileGlitchShaderExtraction {
  schemaVersion: number
  extractorVersion: number
  unityVersion: string
  fingerprint: string
  sourceReference: InventorySourceReference
  compressedBlobSha256: string
  shaderName: string
  shaderKeywordNames: string[]
  requiredProperties: string[]
  requiredTextureProperties: string[]
  passes: {
    forward: RenderingProfileGlitchShaderPass
    shadow: RenderingProfileGlitchShaderPass
  }
}

export interface RenderingProfileMatcapShaderPass {
  pass: 'forward' | 'shadow'
  variant: 'static' | 'instanced'
  stateName: 'Forward' | 'ShadowCaster'
  subShaderIndex: number
  passIndex: number
  stage: 'vertex'
  platform: number
  gpuProgramType: number
  blobIndex: number
  parameterBlobIndex: number
  parameterRecordSha256: string
  keywordIndices: number[]
  keywordNames: string[]
  programHash: string
  programDataSha256: string
  programDataLength: number
  programRecordSha256: string
  glsl: string
  requiredAttributes: string[]
  requiredUniforms: string[]
  renderState: {
    zWrite: number
    zWriteProperty: string | null
    zTest: number
    zTestProperty: string | null
    culling: number
    cullingProperty: string | null
    sourceBlend: number
    destinationBlend: number
    sourceBlendAlpha: number
    destinationBlendAlpha: number
    blendOperation: number
    blendOperationAlpha: number
    colorMask: number
    depthOnly: boolean
  }
}

export interface RenderingProfileMatcapShaderExtraction {
  schemaVersion: number
  extractorVersion: number
  unityVersion: string
  fingerprint: string
  sourceReference: InventorySourceReference
  compressedBlobSha256: string
  shaderName: string
  shaderKeywordNames: string[]
  requiredProperties: string[]
  requiredTextureProperties: string[]
  passes: {
    forward: RenderingProfileMatcapShaderPass
    forwardInstanced: RenderingProfileMatcapShaderPass
    shadow: RenderingProfileMatcapShaderPass
    shadowInstanced: RenderingProfileMatcapShaderPass
  }
}

export interface RenderingProfileRenderer {
  sourceReference: InventorySourceReference | null
  name: string
  hierarchyPath: string | null
  rendererType: string | null
  defaultVisible: boolean
  sourceMesh: InventoryPointer & {
    sourceReference: InventorySourceReference | null
    builtinResource?: InventoryBuiltinResourceReference | null
  } | null
  glbNodeIndex: number | null
  materialSlots: RenderingProfileMaterialSlot[]
}

export interface RenderingProfileChildRendererEvent {
  clip: string
  time: number
  action: 'enable' | 'disable'
  sourceRendererReference: InventorySourceReference
  /** Stable source order makes simultaneous callbacks deterministic. */
  order: number
}

/**
 * A renderer can leave a published profile only when this exact source
 * evidence proves that it is presentation-only.  These codes intentionally
 * stay narrower than the list of Unity effects: unsupported is not evidence
 * of presentation scope.
 */
export type RenderingProfileExclusionReasonCode =
  | 'PRESENTATION_SHADER_OR_MATERIAL'
  | 'PRESENTATION_MESH_10210_OR_HELPER'
  | 'PRESENTATION_CHILD_RENDERER_EVENT'

export interface RenderingProfileExcludedMaterialEvidence {
  name: string
  sourceReference: InventorySourceReference | null
  shaderName: string | null
  shaderReference: InventorySourceReference | null
}

export interface RenderingProfileExcludedRenderer {
  sourceReference: InventorySourceReference
  name: string
  hierarchyPath: string | null
  reasonCode: Exclude<RenderingProfileExclusionReasonCode, 'PRESENTATION_CHILD_RENDERER_EVENT'>
  /** Ordered source observations that make the exclusion auditable. */
  evidence: string[]
  sourceMesh: (InventoryPointer & {
    sourceReference: InventorySourceReference | null
    builtinResource?: InventoryBuiltinResourceReference | null
  }) | null
  materials: RenderingProfileExcludedMaterialEvidence[]
}

export interface RenderingProfileExcludedChildRendererEvent {
  clip: string
  time: number
  action: 'enable' | 'disable'
  sourceRendererReference: InventorySourceReference
  order: number
  reasonCode: 'PRESENTATION_CHILD_RENDERER_EVENT'
  evidence: string[]
}

export interface RenderingProfileFxRendererAssetEvidence {
  rendererReference: InventorySourceReference
  meshReference: InventoryFxPPtrEvidence | null
  materialReferences: InventoryFxPPtrEvidence[]
}

export interface RenderingProfileFxExclusionProof {
  schemaVersion: 1
  policyVersion: typeof CHIBI_FX_EXCLUSION_POLICY_VERSION
  eventSourceReference: InventorySourceReference
  clip: string
  time: number
  order: number
  function: ChibiInstantiateFxEventFunction
  targetReference: InventorySourceReference
  completeGraph: true
  gameObjectReferences: InventorySourceReference[]
  transformReferences: InventorySourceReference[]
  componentReferences: { sourceReference: InventorySourceReference; type: string }[]
  particleRendererReferences: InventorySourceReference[]
  approvedMonoScriptReferences: InventorySourceReference[]
  rendererAssets: RenderingProfileFxRendererAssetEvidence[]
  disjointFromCore: true
  reasonCode: 'SOURCE_PARTICLE_ONLY_FX_TARGET'
  evidence: string[]
}

export interface RenderingProfileExcludedFxInstantiationEvent {
  eventSourceReference: InventorySourceReference
  clip: string
  time: number
  order: number
  function: ChibiInstantiateFxEventFunction
  targetReference: InventorySourceReference
  reasonCode: 'PRESENTATION_FX_INSTANTIATION'
  evidence: string[]
}

/**
 * A source renderer has the exact identity and render inputs of meaningful
 * equipment, but the selected assembly does not prove how it is attached to
 * the character.  Keep this as a structured blocker instead of relying only
 * on a human-readable unresolved string: a visible weapon must never become
 * an apparently valid profile just because its mesh happened to export.
 */
export type RenderingProfileCoreRendererBlockerReasonCode =
  | 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT'

export interface RenderingProfileCoreRendererBlocker {
  sourceReference: InventorySourceReference
  name: string
  hierarchyPath: string | null
  reasonCode: RenderingProfileCoreRendererBlockerReasonCode
  /** Exact source observations used to classify this renderer as core-risk. */
  evidence: string[]
  sourceMeshReference: InventorySourceReference
  sourceMaterialReferences: InventorySourceReference[]
  sourceShaderReferences: InventorySourceReference[]
}

export interface RenderingProfileCoreGeometryBlocker {
  sourcePrefabPath: string
  sourcePrefabReference: InventorySourceReference
  sourceReference: InventorySourceReference
  name: string
  hierarchyPath: string
  reasonCode: 'SOURCE_AUTHORED_CORE_GEOMETRY_SEPARATION'
  sourceMeshReference: InventorySourceReference
  geometryEvidence: {
    primitiveIndex: number
    components: readonly string[]
    sourceGap: number
    sourceUnit: string
    bridgingTriangles: number
  }
  evidence: string[]
}

export interface RenderingProfileCoreGeometryWarning {
  sourcePrefabPath: string
  sourcePrefabReference: InventorySourceReference
  sourceReference: InventorySourceReference
  name: string
  hierarchyPath: string
  reasonCode: 'SOURCE_AUTHORED_MULTIMATERIAL_BODY_SEPARATION'
  message: string
  sourceMeshReference: InventorySourceReference
  geometryEvidence: {
    legacyMeasurement: {
      primitiveIndex: number
      componentLabels: readonly string[]
      sourceGap: number
      sourceUnit: string
      bridgingTriangles: number
    }
    legacyLabelSemantics: string
    retainedMaterialSlots: {
      slot: number
      sourceMaterialName: string
      sourceMaterialReference: InventorySourceReference
    }[]
  }
  evidence: string[]
}

const SOURCE_AUTHORED_CORE_GEOMETRY_WARNING_MESSAGE = 'Source-pinned evidence identifies the retained five-submesh body geometry across five material slots on this core renderer. The legacy primitive-0 cap/upper-body component separation from torso does not demonstrate a missing neck. This warning does not certify material, skinning, action, weapon/equipment, or browser checks.'
const SOURCE_AUTHORED_CORE_GEOMETRY_WARNING_EVIDENCE = [
  `exact source prefab reference ${referenceKey(SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE.prefabReference)}`,
  `exact core renderer reference ${referenceKey(SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE.renderer.sourceReference)}`,
  `exact source mesh reference ${referenceKey(SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE.sourceMeshReference)}`,
  'The exact core renderer has five ordered source material slots: body, face, eyebrow, eye/mouth, and hair.',
  'The legacy primitive-0 Head label denotes the cap/upper-body-material component, not the complete visual head; its separation from torso alone is not evidence of a missing neck.',
  'Material, skinning, action, weapon/equipment, and browser checks remain independent.',
]

function expectedSourceAuthoredCoreGeometryWarning(): RenderingProfileCoreGeometryWarning {
  const known = SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE
  return {
    sourcePrefabPath: known.prefabPath,
    sourcePrefabReference: { ...known.prefabReference },
    sourceReference: { ...known.renderer.sourceReference },
    name: known.renderer.name,
    hierarchyPath: known.renderer.hierarchyPath,
    reasonCode: 'SOURCE_AUTHORED_MULTIMATERIAL_BODY_SEPARATION',
    message: SOURCE_AUTHORED_CORE_GEOMETRY_WARNING_MESSAGE,
    sourceMeshReference: { ...known.sourceMeshReference },
    geometryEvidence: {
      legacyMeasurement: {
        primitiveIndex: known.legacyMeasurement.primitiveIndex,
        componentLabels: [...known.legacyMeasurement.componentLabels],
        sourceGap: known.legacyMeasurement.sourceGap,
        sourceUnit: known.legacyMeasurement.sourceUnit,
        bridgingTriangles: known.legacyMeasurement.bridgingTriangles,
      },
      legacyLabelSemantics: 'The legacy Head label denotes the cap/upper-body-material component within primitive 0, not the complete visual head.',
      retainedMaterialSlots: known.retainedMaterialSlots.map(slot => ({
        slot: slot.slot,
        sourceMaterialName: slot.sourceMaterialName,
        sourceMaterialReference: { ...slot.sourceMaterialReference },
      })),
    },
    evidence: [...SOURCE_AUTHORED_CORE_GEOMETRY_WARNING_EVIDENCE],
  }
}

function exactDataEqual(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length
      && expected.every((item, index) => exactDataEqual(actual[index], item))
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false
    const actualRecord = actual as Record<string, unknown>
    const expectedRecord = expected as Record<string, unknown>
    const actualKeys = Object.keys(actualRecord).sort()
    const expectedKeys = Object.keys(expectedRecord).sort()
    return actualKeys.length === expectedKeys.length
      && actualKeys.every((key, index) => key === expectedKeys[index]
        && exactDataEqual(actualRecord[key], expectedRecord[key]))
  }
  return false
}

/** True only for the exact source-pinned geometry warning emitted by this profile. */
export function isExpectedSourceAuthoredCoreGeometryWarning(
  value: unknown,
): value is RenderingProfileCoreGeometryWarning {
  return exactDataEqual(value, expectedSourceAuthoredCoreGeometryWarning())
}

/**
 * A core renderer attachment relation can be a non-blocking import warning
 * only when it is the single remaining unresolved item.  Keep the complete
 * blocker evidence in the warning so the renderer is still auditable and can
 * never be mistaken for presentation-only content.
 */
export interface RenderingProfilePolicyWarning {
  reasonCode: RenderingProfileCoreRendererBlockerReasonCode
  message: string
  blocker: RenderingProfileCoreRendererBlocker
  sourceGroupReferences?: InventorySourceReference[]
  sourceEvidence?: string[]
}

/**
 * A source renderer can be equipment without having a source-authored
 * mainWeapon/subWeapon slot.  Keep that conclusion separate from the exact
 * renderer references emitted by the inventory extractor: a structural
 * relation is useful evidence, but it must never be written back as a fake
 * slot attachment.
 */
export type RenderingProfileEquipmentBindingClassification =
  | 'exact-equipment-renderer'
  | 'exact-main-sub-equipment'
  | 'structurally-bound-equipment'

export type RenderingProfileEquipmentBindingReasonCode =
  | 'EXACT_EQUIPMENT_RENDERER_REFERENCE'
  | 'EXACT_MAIN_SUB_ATTACHMENT_POINTER'
  | 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY'
  | 'EXACT_SOURCE_WEAPON_ANCESTRY'

export interface RenderingProfileEquipmentBindingEvidence {
  classification: RenderingProfileEquipmentBindingClassification
  reasonCode: RenderingProfileEquipmentBindingReasonCode
  /** Human-readable reason retained next to the machine classification. */
  reason: string
  sourceReference: InventorySourceReference
  name: string
  hierarchyPath: string | null
  sourceMeshReference: InventorySourceReference | null
  sourceMaterialReferences: InventorySourceReference[]
  sourceShaderReferences: InventorySourceReference[]
  /** Exact source-authored transform identities used by the relation. */
  rootBone: InventoryAssemblyPointer | null
  transformChain: InventoryAssemblyPointer[]
  /** Exact rootBone.m_Father ancestry used by the source-weapon rule. */
  rootBoneAncestry: InventoryAssemblyPointer[]
  boneReferences: InventoryAssemblyPointer[]
  /** Exact pointers that make the structural relation auditable. */
  matchedAncestorPointers: InventoryAssemblyPointer[]
  /** Body/skinned renderer identities whose m_Bones corroborate movement. */
  bodyRendererReferences: InventorySourceReference[]
  /** Stable evidence strings for profile diagnostics and audit tooling. */
  evidence: string[]
}

export interface ChibiRenderingProfile {
  schemaVersion: 2
  profileVersion: typeof CHIBI_RENDERING_PROFILE_VERSION
  policyVersion: typeof CHIBI_RENDERING_POLICY_VERSION
  adapterVersion: typeof CHIBI_SHADER_ADAPTER_VERSION
  sourceIdentity: string
  dependencyFingerprint: string
  sourcePrefab: { path: string; reference: InventorySourceReference | null }
  /** The exact source assembly selected for the exported prefab. */
  assembly: InventoryAssembly | null
  renderers: RenderingProfileRenderer[]
  /** Exact source renderer targets for selected child-renderer callbacks. */
  childRendererEvents: RenderingProfileChildRendererEvent[]
  /** Source-evidenced renderers intentionally omitted as presentation-only. */
  excludedRenderers: RenderingProfileExcludedRenderer[]
  /** Source-evidenced callbacks targeting excluded presentation renderers. */
  excludedChildRendererEvents: RenderingProfileExcludedChildRendererEvent[]
  /** Source-evidenced particle-only InstantiateFx events intentionally omitted. */
  fxExclusionProofs: RenderingProfileFxExclusionProof[]
  excludedFxInstantiationEvents: RenderingProfileExcludedFxInstantiationEvent[]
  /** Visible, source-bound weapon/equipment renderers with no exact relation. */
  coreRendererBlockers: RenderingProfileCoreRendererBlocker[]
  /** Exact source-authored defects in required core geometry. */
  coreGeometryBlockers: RenderingProfileCoreGeometryBlocker[]
  /** Source-bound geometry observations that do not by themselves prove omitted core content. */
  coreGeometryWarnings?: RenderingProfileCoreGeometryWarning[]
  /** Exact or structurally proven equipment bindings; never fabricated slots. */
  equipmentBindingEvidence: RenderingProfileEquipmentBindingEvidence[]
  /** Non-blocking core warnings; these are never presentation exclusions. */
  warnings: RenderingProfilePolicyWarning[]
  mouth: null | {
    sourceRendererReference: InventorySourceReference
    materialSlot: number
    defaultUV: { x: number; y: number }
    defaultTile: number
    columns: number
    rows: number
    textureProperty: string
    textureReference: InventorySourceReference | null
    textureTransform: { scale: { x: number; y: number }; offset: { x: number; y: number } }
    shaderUvRule: { xLessEqual: number; yLessEqual: number; glbVInverted: true }
    events: { clip: string; time: number; tile: number; flipX: boolean }[]
    glbPrimitiveIndices: { eyes: number[]; mouth: number[] }
    glbMaterialIndex: number | null
  }
  drawSequence: string[]
  validation: {
    valid: boolean
    unresolved: string[]
    excludedRenderers: RenderingProfileExcludedRenderer[]
    excludedChildRendererEvents: RenderingProfileExcludedChildRendererEvent[]
    fxExclusionProofs: RenderingProfileFxExclusionProof[]
    excludedFxInstantiationEvents: RenderingProfileExcludedFxInstantiationEvent[]
    coreRendererBlockers: RenderingProfileCoreRendererBlocker[]
    coreGeometryBlockers: RenderingProfileCoreGeometryBlocker[]
    coreGeometryWarnings?: RenderingProfileCoreGeometryWarning[]
    equipmentBindingEvidence: RenderingProfileEquipmentBindingEvidence[]
    /** Non-blocking core warnings; these are never presentation exclusions. */
    warnings?: RenderingProfilePolicyWarning[]
  }
}

export interface ShaderStateResolution {
  value: number | null
  source: 'material' | 'literal' | 'shader-default' | 'unresolved'
  property?: string
}

function referenceKey(reference: InventorySourceReference | null | undefined) {
  return reference ? `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}` : ''
}

const FX_ZERO_EXTERNAL_GUID = '00000000000000000000000000000000'
const FX_MONOSCRIPT_SCHEMAS = new Map<string, { fields: string[]; nullFields: string[] }>([
  ['460590081893560622', { fields: ['LifeMode', 'ParentIndex', 'TimerTypeDuration'], nullFields: [] }],
  ['-529717931869727251', { fields: ['FixedY', 'cameraFindMode', 'targetCamera'], nullFields: ['targetCamera'] }],
  ['4955142931926258075', {
    fields: ['customInfo', 'lifetimeInfo', 'mixColorBySpeed', 'mixColorOverLifetime', 'mixCustomData', 'mixStartColor', 'speedInfo', 'startColorInfo'],
    nullFields: [],
  }],
])

function fxObjectPointerKey(value: { file?: string | null; pathId?: string | null } | null | undefined) {
  return value?.file && value.pathId && value.pathId !== '0'
    ? `${value.file.replaceAll('\\', '/').toLowerCase()}:${value.pathId}` : ''
}

function exactFxScriptReference(mono: InventoryFxTargetEvidence['monoBehaviours'][number]) {
  const pointer = mono.scriptPPtr
  const schema = FX_MONOSCRIPT_SCHEMAS.get(pointer.pathId)
  if (!schema || pointer.fileID !== 1
    || pointer.serializedFile?.toLowerCase() !== CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES[0].serializedFile.toLowerCase()
    || pointer.externalGuid?.replaceAll('-', '').toLowerCase() !== FX_ZERO_EXTERNAL_GUID
    || pointer.identityResolved !== true) return null
  const expected = CHIBI_APPROVED_FX_MONOSCRIPT_REFERENCES.find(reference => reference.objectId === pointer.pathId)
  if (!expected || mono.serializedFieldNames.length !== schema.fields.length
    || [...mono.serializedFieldNames].sort().some((field, index) => field !== [...schema.fields].sort()[index])) return null
  const nullFieldNames = new Set<string>()
  for (const reference of mono.serializedFieldPPtrs) {
    if (!reference.identityResolved || reference.pathId !== '0' || !schema.nullFields.includes(reference.fieldPath)) return null
    nullFieldNames.add(reference.fieldPath)
  }
  if (nullFieldNames.size !== schema.nullFields.length || schema.nullFields.some(field => !nullFieldNames.has(field))) return null
  return expected
}

function buildFxInstantiationExclusion(
  event: InventoryEvent,
  order: number,
  assembly: InventoryAssembly | undefined,
  requiredCoreRenderers: readonly InventoryAssemblyRenderer[],
): { proof: RenderingProfileFxExclusionProof; diagnostic: RenderingProfileExcludedFxInstantiationEvent } | { error: string } {
  const eventSourceReference = event.sourceClipReference ?? null
  const targetReference = event.fxTargetReference ?? null
  const evidence = event.fxTargetEvidence ?? null
  const target = event.target ?? null
  if (!eventSourceReference || !targetReference || !evidence || event.fxTargetResolution?.status !== 'resolved') {
    return { error: event.fxTargetResolution?.reason ?? 'Exact InstantiateFx source clip, target container, or graph evidence is missing.' }
  }
  if (!isChibiInstantiateFxEventFunction(event.function) || !event.clip || !Number.isFinite(event.time)
    || !target || target.pathId === '0' || target.externalGuid?.replaceAll('-', '').toLowerCase() !== FX_ZERO_EXTERNAL_GUID
    || target.file.replaceAll('\\', '/').toLowerCase() !== targetReference.serializedFile.replaceAll('\\', '/').toLowerCase()
    || target.pathId !== targetReference.objectId) {
    return { error: 'InstantiateFx event identity does not exactly match its source-pinned target PPtr.' }
  }
  if (evidence.targetGraphPolicyVersion !== 'chibi-particle-only-instantiate-fx-v1'
    || evidence.targetGraphEligible !== true || evidence.targetGraphEvidence.length === 0
    || evidence.targetReference === null || referenceKey(evidence.targetReference) !== referenceKey(targetReference)
    || evidence.target?.file.replaceAll('\\', '/').toLowerCase() !== targetReference.serializedFile.replaceAll('\\', '/').toLowerCase()
    || evidence.target?.pathId !== targetReference.objectId
    || evidence.completeTraversal !== true || evidence.rendererAssetEvidenceComplete !== true
    || evidence.gameObjectCount <= 0 || evidence.gameObjectReferences.length !== evidence.gameObjectCount
    || evidence.transformReferences.length !== evidence.gameObjectCount
    || evidence.coreComponentTypes.length !== 0 || !evidence.particleComponentTypes.includes('ParticleSystemRenderer')
    || (evidence.classification !== 'particle-only' && evidence.classification !== 'unknown')
    || evidence.unknownComponentTypes.some(type => type !== 'MonoBehaviour')) {
    return { error: 'InstantiateFx target graph is incomplete, not particle-only, or lacks exact target/source evidence.' }
  }
  const componentCount = Object.values(evidence.componentTypeCounts).reduce((sum, count) => sum + count, 0)
  if (evidence.componentReferences.length !== componentCount
    || evidence.componentReferences.some(item => !item.sourceReference || item.sourceReference.bundleSha256.toLowerCase() !== targetReference.bundleSha256.toLowerCase())
    || evidence.gameObjectReferences.some(reference => reference.bundleSha256.toLowerCase() !== targetReference.bundleSha256.toLowerCase())
    || evidence.transformReferences.some(reference => reference.bundleSha256.toLowerCase() !== targetReference.bundleSha256.toLowerCase())) {
    return { error: 'InstantiateFx target graph does not preserve complete, source-pinned component identities.' }
  }
  const approvedScripts = evidence.monoBehaviours.map(exactFxScriptReference)
  if (!evidence.monoScriptPolicyComplete || approvedScripts.some(reference => reference === null)) {
    return { error: 'InstantiateFx target contains an unknown MonoBehaviour identity or field schema.' }
  }
  const graphMonoBehaviourKeys = evidence.componentReferences.filter(item => item.type === 'MonoBehaviour')
    .map(item => referenceKey(item.sourceReference)).sort()
  const observedMonoBehaviourKeys = evidence.monoBehaviours.map(mono => referenceKey({
    bundleSha256: targetReference.bundleSha256,
    serializedFile: mono.componentIdentity.serializedFile,
    objectId: mono.componentIdentity.pathId,
  })).sort()
  const gameObjectKeys = new Set(evidence.gameObjectReferences.map(referenceKey))
  if (graphMonoBehaviourKeys.length !== observedMonoBehaviourKeys.length
    || graphMonoBehaviourKeys.some((key, index) => key !== observedMonoBehaviourKeys[index])
    || evidence.monoBehaviours.some(mono => !gameObjectKeys.has(referenceKey({
      bundleSha256: targetReference.bundleSha256,
      serializedFile: mono.gameObjectIdentity.serializedFile,
      objectId: mono.gameObjectIdentity.pathId,
    })))) {
    return { error: 'InstantiateFx target MonoBehaviour component identities do not match the exact traversed graph.' }
  }
  const expectedScriptKeys = approvedScripts.map(referenceKey).sort()
  const recordedScriptKeys = evidence.approvedMonoScriptReferences.map(referenceKey).sort()
  if (expectedScriptKeys.length !== recordedScriptKeys.length
    || expectedScriptKeys.some((key, index) => key !== recordedScriptKeys[index])) {
    return { error: 'InstantiateFx target approved MonoScript references do not match their exact component PPtrs.' }
  }
  const expectedParticleRenderers = evidence.componentReferences
    .filter(item => item.type === 'ParticleSystemRenderer').map(item => referenceKey(item.sourceReference)).sort()
  const rendererAssetKeys = evidence.rendererAssets.map(item => referenceKey(item.rendererReference)).sort()
  if (!expectedParticleRenderers.length || expectedParticleRenderers.length !== rendererAssetKeys.length
    || expectedParticleRenderers.some((key, index) => key !== rendererAssetKeys[index])) {
    return { error: 'InstantiateFx target does not preserve one exact renderer asset record per ParticleSystemRenderer.' }
  }
  for (const assets of evidence.rendererAssets) {
    if (!assets.mesh || !assets.mesh.identityResolved || !assets.mesh.pointer
      || assets.materials.some(item => !item.identityResolved || !item.pointer)) {
      return { error: 'InstantiateFx target has a missing or unresolved particle renderer mesh/material PPtr.' }
    }
  }

  const coreSourceKeys = new Set<string>()
  const corePointerKeys = new Set<string>()
  const addCoreReference = (reference: InventorySourceReference | null | undefined) => {
    if (!reference) return
    coreSourceKeys.add(referenceKey(reference))
    corePointerKeys.add(fxObjectPointerKey({ file: reference.serializedFile, pathId: reference.objectId }))
  }
  const addCorePointer = (pointer: (InventoryAssemblyPointer & { sourceReference?: InventorySourceReference | null }) | InventoryPointer | null | undefined) => {
    if (!pointer) return
    addCoreReference((pointer as InventoryAssemblyPointer).sourceReference)
    corePointerKeys.add(fxObjectPointerKey(pointer))
  }
  if (assembly) {
    addCoreReference(assembly.prefabReference)
    addCorePointer(assembly.prefabTarget)
    // Presentation-only renderers have already been independently excluded by
    // classifyRenderer. Their source mesh/material/transform pointers are not
    // required character content and must not make a disjoint FX graph appear
    // core-overlapping. Required renderers still contribute every exact source
    // and serialized pointer below; prefab identity and attachments stay in
    // the comparison set as before.
    for (const renderer of requiredCoreRenderers) {
      addCoreReference(renderer.sourceReference)
      addCoreReference(renderer.meshSourceReference)
      addCorePointer(renderer.mesh)
      addCorePointer(renderer.rootBone)
      for (const pointer of [...(renderer.transformChain ?? []), ...(renderer.boneReferences ?? [])]) addCorePointer(pointer)
      for (const slot of renderer.materialSlots ?? []) {
        addCoreReference(slot.sourceMaterialReference)
        addCorePointer(slot.material)
      }
    }
    const attachments = assembly.attachments
    for (const pointer of [
      ...(attachments.mainWeapon ?? []), ...(attachments.subWeapon ?? []), ...(attachments.eyes ?? []),
      ...(attachments.headBone ?? []), ...(attachments.fxParentBones ?? []), ...(attachments.mouthRenderer ?? []),
      ...(attachments.mouthMetadata ?? []).map(item => ({ ...item.renderer, sourceReference: item.sourceRendererReference })),
      ...(attachments.equipmentRendererGroups ?? []).map(item => item.attachment),
    ]) addCorePointer(pointer)
    for (const reference of [...(attachments.equipmentRendererReferences ?? []), ...(attachments.equipmentRendererGroups ?? []).flatMap(item => item.sourceReferences)]) addCoreReference(reference)
  }
  const graphReferences = [targetReference, ...evidence.gameObjectReferences, ...evidence.transformReferences,
    ...evidence.componentReferences.map(item => item.sourceReference)]
  const graphPointerKeys = graphReferences.map(reference => fxObjectPointerKey({
    file: reference.serializedFile,
    pathId: reference.objectId,
  }))
  const assetPointerEvidence = evidence.rendererAssets.flatMap(item => [item.mesh!, ...item.materials])
  const assetSourceKeys = assetPointerEvidence.flatMap(item => item.sourceReference ? [referenceKey(item.sourceReference)] : [])
  const assetPointerKeys = assetPointerEvidence.map(item => fxObjectPointerKey(item.pointer))
  if (graphReferences.some(reference => coreSourceKeys.has(referenceKey(reference)))
    || graphPointerKeys.some(key => key && corePointerKeys.has(key))
    || assetSourceKeys.some(key => coreSourceKeys.has(key))
    || assetPointerKeys.some(key => key && corePointerKeys.has(key))) {
    return { error: 'InstantiateFx target graph or particle asset PPtrs overlap the selected core renderer, material, mesh, or assembly ancestry identities.' }
  }

  const particleRendererReferences = evidence.rendererAssets.map(item => ({ ...item.rendererReference }))
    .sort((left, right) => referenceKey(left).localeCompare(referenceKey(right)))
  const rendererAssets: RenderingProfileFxRendererAssetEvidence[] = evidence.rendererAssets
    .map(item => ({
      rendererReference: { ...item.rendererReference },
      meshReference: item.mesh,
      materialReferences: [...item.materials],
    }))
    .sort((left, right) => referenceKey(left.rendererReference).localeCompare(referenceKey(right.rendererReference)))
  const proofEvidence = [
    `exact source AnimationClip ${referenceKey(eventSourceReference)}`,
    `selected event is ${event.function} at ${event.clip} ${event.time}s (source order ${order})`,
    `exact target PPtr resolves to ${referenceKey(targetReference)}`,
    ...evidence.targetGraphEvidence,
    'target graph contains no renderer, mesh, material, or transform identity shared with selected core character content',
  ]
  const proof: RenderingProfileFxExclusionProof = {
    schemaVersion: 1,
    policyVersion: CHIBI_FX_EXCLUSION_POLICY_VERSION,
    eventSourceReference: { ...eventSourceReference },
    clip: event.clip,
    time: event.time,
    order,
    function: event.function,
    targetReference: { ...targetReference },
    completeGraph: true,
    gameObjectReferences: evidence.gameObjectReferences.map(reference => ({ ...reference })),
    transformReferences: evidence.transformReferences.map(reference => ({ ...reference })),
    componentReferences: evidence.componentReferences.map(item => ({ sourceReference: { ...item.sourceReference }, type: item.type })),
    particleRendererReferences,
    approvedMonoScriptReferences: [...evidence.approvedMonoScriptReferences].map(reference => ({ ...reference }))
      .sort((left, right) => referenceKey(left).localeCompare(referenceKey(right))),
    rendererAssets,
    disjointFromCore: true,
    reasonCode: 'SOURCE_PARTICLE_ONLY_FX_TARGET',
    evidence: proofEvidence,
  }
  const diagnostic: RenderingProfileExcludedFxInstantiationEvent = {
    eventSourceReference: { ...eventSourceReference },
    clip: event.clip,
    time: event.time,
    order,
    function: event.function,
    targetReference: { ...targetReference },
    reasonCode: 'PRESENTATION_FX_INSTANTIATION',
    evidence: proofEvidence,
  }
  return { proof, diagnostic }
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function positiveInteger(value: unknown): number | null {
  const number = finiteNumber(value)
  return number !== null && Number.isInteger(number) && number > 0 ? number : null
}

function colorVector(color: { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null | undefined) {
  if (!color) return null
  const values = [color.r, color.g, color.b, color.a ?? 1].map(finiteNumber)
  return values.every(value => value !== null) ? values as number[] : null
}

function propertyValue(material: InventoryMaterial, property: string): number | null {
  return finiteNumber(material.floatProperties?.[property] ?? material.intProperties?.[property])
}

function shaderDefault(shader: InventoryShader | undefined, property: string): number | null {
  const properties = shader?.properties as { m_Props?: Record<string, unknown>[] } | undefined
  const declaration = properties?.m_Props?.find(item => item.m_Name === property)
  return finiteNumber(declaration?.['m_DefValue[0]'])
}

function shaderColorDefault(shader: InventoryShader | undefined, property: string) {
  const properties = shader?.properties as { m_Props?: Record<string, unknown>[] } | undefined
  const declaration = properties?.m_Props?.find(item => item.m_Name === property)
  if (!declaration) return null
  const values = [0, 1, 2, 3].map(index => finiteNumber(declaration[`m_DefValue[${index}]`]))
  if (values.slice(0, 3).some(value => value === null)) return null
  return [values[0], values[1], values[2], values[3] ?? 1] as number[]
}

function materialColor(material: InventoryMaterial, shader: InventoryShader | undefined, property: string) {
  const properties = shader?.properties as { m_Props?: Record<string, unknown>[] } | undefined
  if (!properties?.m_Props?.some(item => item.m_Name === property)) return null
  return colorVector(material.colorProperties?.[property]) ?? shaderColorDefault(shader, property)
}

const SIMPLE_UNLIT_SHADER_IDENTITIES = new Set([
  'fx/generalunlit',
  'fx/generalunlittexture',
  'unlit/texture',
  'unlit/texcolorhdr',
])

// These four BAAD shaders have no effect-specific properties beyond the
// ordinary source state, color, and main texture declarations.  They are
// safe to carry through the FBX2glTF KHR_materials_unlit output.  Keep this
// allowlist property-gated so a future shader revision with mask, outline,
// distortion, or other custom inputs cannot silently become native output.
const SIMPLE_UNLIT_SHADER_PROPERTIES = new Set([
  '_Color', '_MainTex',
  '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha',
  '_ZWrite', '_ZTest', '_Cull', '_ZOffsetFactor', '_ZOffsetUnits',
])

function normalizedShaderIdentity(value: string | null | undefined) {
  return typeof value === 'string' ? value.toLowerCase().replaceAll(' ', '').replaceAll('\\', '/') : ''
}

export interface DsfxStaticShaderAdapterRule {
  id: 'dsfx-static'
  identity: string
  programBlobSha256: string
  sourceReference: InventorySourceReference
  propertyNames: readonly string[]
  passes: readonly {
    name: string
    states: Readonly<{
      srcBlend: number
      destinationBlend: number
      sourceBlendAlpha: number
      destinationBlendAlpha: number
      blendOperation: number
      blendOperationAlpha: number
      zTest: number
      zWrite: number
      culling: number
      offsetFactor: number
      offsetUnits: number
      lighting: boolean
    }>
  }[]
  renderState: Readonly<{
    alphaMode: 'BLEND'
    layer: 'transparent'
    depthWrite: false
    depthTest: false
    depthFunction: 'disabled'
    cullMode: 'off'
    doubleSided: true
    blend: {
      source: number
      destination: number
      sourceAlpha: number
      destinationAlpha: number
      operation: number
      operationAlpha: number
    }
    polygonOffsetFactor: 0
    polygonOffsetUnits: 0
  }>
}

const DSFX_SHADER_SOURCE = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1',
} as const

const DSFX_FORWARD_COMMON = {
  sourceBlendAlpha: 0,
  destinationBlendAlpha: 0,
  blendOperation: 0,
  blendOperationAlpha: 0,
  zTest: 0,
  zWrite: 0,
  culling: 0,
  offsetFactor: 0,
  offsetUnits: 0,
  lighting: false,
} as const

const DSFX_SHADOW_COMMON = {
  srcBlend: 1,
  destinationBlend: 0,
  sourceBlendAlpha: 1,
  destinationBlendAlpha: 0,
  blendOperation: 0,
  blendOperationAlpha: 0,
  zTest: 4,
  zWrite: 1,
  culling: 0,
  offsetFactor: 0,
  offsetUnits: 0,
  lighting: false,
} as const

const dsfxStaticRule = (
  identity: string,
  objectId: string,
  programBlobSha256: string,
  propertyNames: readonly string[],
  blend: { source: number; destination: number },
): DsfxStaticShaderAdapterRule => ({
  id: 'dsfx-static', identity, programBlobSha256,
  sourceReference: { ...DSFX_SHADER_SOURCE, objectId }, propertyNames,
  passes: [
    {
      name: 'Forward',
      states: {
        ...DSFX_FORWARD_COMMON, srcBlend: blend.source, destinationBlend: blend.destination,
        sourceBlendAlpha: blend.source, destinationBlendAlpha: blend.destination,
      },
    },
    { name: 'ShadowCaster', states: DSFX_SHADOW_COMMON },
  ],
  renderState: {
    alphaMode: 'BLEND', layer: 'transparent', depthWrite: false, depthTest: false,
    depthFunction: 'disabled', cullMode: 'off', doubleSided: true,
    blend: {
      source: blend.source, destination: blend.destination,
      sourceAlpha: blend.source, destinationAlpha: blend.destination,
      operation: 0, operationAlpha: 0,
    },
    polygonOffsetFactor: 0, polygonOffsetUnits: 0,
  },
})

/** Exact source identity for DSFX/FX_SHADER_Additive_0. */
export const DSFX_ADDITIVE_0_SOURCE_REFERENCE = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-4115771715742154417',
} as const
export const DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256 = '90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808'
export const DSFX_ADDITIVE_0_FINGERPRINT = 'e4f30af59274e0b917915212c19c6c7e8c47f2da605d04a0eb6649c5d0ff1cfc'
export const DSFX_ADDITIVE_0_SHADER_NAME = 'DSFX/FX_SHADER_Additive_0'
export const DSFX_ADDITIVE_0_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON',
  'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
export const DSFX_ADDITIVE_0_REQUIRED_PROPERTIES = [
  '_Color', '_Texture', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode',
  '_ZOffsetFactor', '_ZOffsetUnits', '_ZTest_Mode',
] as const
export const DSFX_ADDITIVE_0_REQUIRED_TEXTURE_PROPERTIES = ['_Texture'] as const
export const DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES = ['POSITION', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0'] as const
export const DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'] as const
export const DSFX_ADDITIVE_0_FORWARD_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
  'unity_LODFade', 'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
  'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
  'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
  'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
  'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
  'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams', '_Texture_ST', '_Color', '_ZOffsetFactor',
  '_ZOffsetUnits', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_Custom_Data_Offset_Use',
] as const
export const DSFX_ADDITIVE_0_FORWARD_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'unity_Builtins0Array', '_Texture_ST', '_Color',
  '_ZOffsetFactor', '_ZOffsetUnits', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_Custom_Data_Offset_Use',
] as const
export const DSFX_ADDITIVE_0_SHADOW_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', 'unity_LODFade',
  'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
  'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
  'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
  'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
  'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
  'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams',
] as const
export const DSFX_ADDITIVE_0_SHADOW_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection',
  '_ShadowCoordModifier', 'unity_Builtins0Array',
] as const
export const DSFX_ADDITIVE_0_FORWARD_PROGRAM_HASH = '3385102c84a54b6579e34b8c667635094f353a9802770da2f58e91fbbbc60026'
export const DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_HASH = 'fa6ec097af34d57cab64d105f411ac41bde7991de417ba1c02413a4ed88baabd'
export const DSFX_ADDITIVE_0_SHADOW_PROGRAM_HASH = 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5'
export const DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_HASH = 'c398892908c135f4a88395ef710f0c25d6ba2b6da763f8850935134ac325ddc1'
export const DSFX_ADDITIVE_0_FORWARD_PROGRAM_RECORD_SHA256 = 'c3c0a70448fed498fee19ae556974d594a37edf16e1ac47ea2f364dc5b4a8b1d'
export const DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256 = 'b8877e78e3acacc5e0891dbfb2d43f8db989f6b1614454417e4dd5c9b972e77f'
export const DSFX_ADDITIVE_0_SHADOW_PROGRAM_RECORD_SHA256 = '9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4'
export const DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256 = '1e7b1e587aa7e0369a0415df992f515cbde6fd63b4db544a0a3e8ea76de8abc0'
export const DSFX_ADDITIVE_0_FORWARD_PARAMETER_RECORD_SHA256 = '619c2de6aa2781b2363fe443f77609736903c60335e25c5eaa3d2d705c9e0173'
export const DSFX_ADDITIVE_0_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256 = '1fe7d3f57ddd22705f4b97fd0c5c86e2c43af931a39f3718047ae65bc4b7fcda'
export const DSFX_ADDITIVE_0_SHADOW_PARAMETER_RECORD_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17'
export const DSFX_ADDITIVE_0_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256 = '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51'
export const DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH = 4618
export const DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH = 4060
export const DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH = 4379
export const DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH = 3960

export const DSFX_ADDITIVE_0_GLES3_PROGRAMS = [
  {
    blobIndex: 2, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 0,
    passIndex: 0, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 2568, size: 4660, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
    keywords: [], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_TEXCOORD4', 'vs_COLOR0'],
    parameterRecordSha256: DSFX_ADDITIVE_0_FORWARD_PARAMETER_RECORD_SHA256, keywordIndices: [], keywordNames: [],
    programHash: DSFX_ADDITIVE_0_FORWARD_PROGRAM_HASH, programDataLength: DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH,
    programRecordSha256: DSFX_ADDITIVE_0_FORWARD_PROGRAM_RECORD_SHA256,
    requiredAttributes: DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES, requiredUniforms: DSFX_ADDITIVE_0_FORWARD_UNIFORMS,
  },
  {
    blobIndex: 3, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 1,
    passIndex: 0, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 7228, size: 4120, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
    keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_TEXCOORD4', 'vs_COLOR0'],
    parameterRecordSha256: DSFX_ADDITIVE_0_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    programHash: DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_HASH, programDataLength: DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
    programRecordSha256: DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256,
    requiredAttributes: DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES, requiredUniforms: DSFX_ADDITIVE_0_FORWARD_INSTANCED_UNIFORMS,
  },
  {
    blobIndex: 6, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 4,
    passIndex: 1, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 13480, size: 4420, segment: 0, sourceMap: 3, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
    keywords: [], programAttributes: ['in_POSITION0', 'in_NORMAL0'],
    parameterRecordSha256: DSFX_ADDITIVE_0_SHADOW_PARAMETER_RECORD_SHA256, keywordIndices: [], keywordNames: [],
    programHash: DSFX_ADDITIVE_0_SHADOW_PROGRAM_HASH, programDataLength: DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH,
    programRecordSha256: DSFX_ADDITIVE_0_SHADOW_PROGRAM_RECORD_SHA256,
    requiredAttributes: DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES, requiredUniforms: DSFX_ADDITIVE_0_SHADOW_UNIFORMS,
  },
  {
    blobIndex: 7, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 5,
    passIndex: 1, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 17900, size: 4020, segment: 0, sourceMap: 3, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
    keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_NORMAL0'],
    parameterRecordSha256: DSFX_ADDITIVE_0_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    programHash: DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_HASH, programDataLength: DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
    programRecordSha256: DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256,
    requiredAttributes: DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES, requiredUniforms: DSFX_ADDITIVE_0_SHADOW_INSTANCED_UNIFORMS,
  },
] as const

/** Backwards-compatible short aliases for callers that key by shader family. */
export const DSFX_ADDITIVE_SOURCE_REFERENCE = DSFX_ADDITIVE_0_SOURCE_REFERENCE
export const DSFX_ADDITIVE_PROGRAM_BLOB_SHA256 = DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256
export const DSFX_ADDITIVE_FINGERPRINT = DSFX_ADDITIVE_0_FINGERPRINT
export const DSFX_ADDITIVE_GLES3_PROGRAMS = DSFX_ADDITIVE_0_GLES3_PROGRAMS

/**
 * The three DSFX programs below are the only shader versions whose static
 * forward pass is currently reproducible by the Viewer.  The rule is keyed by
 * the complete source shader identity and bytecode hash; names alone never
 * select this adapter.
 */
export const CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES: readonly DsfxStaticShaderAdapterRule[] = [
  dsfxStaticRule(
    'dsfx/fx_shader_additive_0', '-4115771715742154417',
    '90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808',
    ['_Color', '_Texture', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZOffsetFactor', '_ZOffsetUnits', '_ZTest_Mode'],
    { source: 1, destination: 1 },
  ),
  dsfxStaticRule(
    'dsfx/fx_shader_alphablend_add', '3898777625326355543',
    '44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af',
    ['_Color', '_Multiply', '_Texture', '_RGBRGBA', '_Main_Texture_No', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_ZOffsetFactor', '_ZOffsetUnits'],
    { source: 1, destination: 10 },
  ),
  dsfxStaticRule(
    'dsfx/fx_shader_alphablend_0', '-660637482714961986',
    '65b652e79bbcce530203321da335999c19212fc25807233878f6853813931576',
    ['_Color', '_Multiply', '_Texture', '_RGBRGBA', '_Main_Texture_No', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_ZOffsetFactor', '_ZOffsetUnits'],
    { source: 5, destination: 10 },
  ),
]

/**
 * AlphaBlend_0 has two depth-tested/culling translations in addition to the
 * original static default.  These are the only accepted state variants; the
 * full common blend, queue, layer, and offset state remains fixed below.
 */
export const DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS = {
  'static-default': CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].renderState,
  'depth-tested-back-cull': {
    ...CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].renderState,
    depthTest: true,
    depthFunction: 'less-equal',
    cullMode: 'back',
    doubleSided: false,
  },
  'depth-tested-off-double-sided': {
    ...CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].renderState,
    depthTest: true,
    depthFunction: 'less-equal',
    cullMode: 'off',
    doubleSided: true,
  },
} as const

/**
 * Additive_0 source materials select the same two depth/cull combinations as
 * the verified AlphaBlend_0 state evidence.  Keep the default literal shape
 * as well for authored records whose state was serialized without material
 * property names; no other depth/cull combinations are accepted.
 */
export const DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS = {
  'static-default': CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0].renderState,
  'depth-tested-back-cull': {
    ...CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0].renderState,
    depthTest: true,
    depthFunction: 'less-equal',
    cullMode: 'back',
    doubleSided: false,
  },
  'depth-tested-off-double-sided': {
    ...CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0].renderState,
    depthTest: true,
    depthFunction: 'less-equal',
    cullMode: 'off',
    doubleSided: true,
  },
} as const

/**
 * The AlphaBlend_0 exception is source-exact and extraction-exact.  These
 * four GLES3 records are the complete Forward/ShadowCaster program set from
 * the verified shader object; keeping their hashes here prevents a profile
 * from accepting a same-name extraction from another shader revision.
 */
export const DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS = [
  {
    blobIndex: 2, programHash: '2c09665c51d86387e06473c1585d28c889a95e1c5fa71cecf0cde66c20b722c6',
    programDataLength: 5036, recordSha256: 'ab0e0ec212bfe8ae6c45530df60a04c95c2c7866df036eb573f18ccc871ed017',
  },
  {
    blobIndex: 3, programHash: 'ed9223bce42bd6c85d0c76e5ac38d1084b9b90e91c15c6c27689423b738363cd',
    programDataLength: 4478, recordSha256: 'f16a1b6cfc5d32592bb1d825e727a1e4cec28da95f952ae8dedd65b208f73b30',
  },
  {
    blobIndex: 6, programHash: '1c9c2c9ac313c8108d0c27abc7647ded21bb5a993747d1551d11a9d543f24643',
    programDataLength: 4681, recordSha256: '50e396be9c4bb52a51fc2ea71fc32d8cbf51dced0c470ddfc8c97f7bb23b664d',
  },
  {
    blobIndex: 7, programHash: 'ec5da5e2e0c2ecbeabeed1cdd694cfedbf195d0b0a97627ce907f57ea568dbbd',
    programDataLength: 4262, recordSha256: '5380845aecc60afa3ee27ef5832833af4d1a10fa429ac6f9c781529762474c64',
  },
] as const

/** Exact source identity and GLES3 interface evidence for AlphaBlend_Add. */
export const DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '3898777625326355543',
} as const
export const DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256 = '44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af'
export const DSFX_ALPHA_BLEND_ADD_FINGERPRINT = 'bdf731975748307a798ac9b06c9d2bbb0078ac1a80d02c5d790de6e85c8aceb8'
export const DSFX_ALPHA_BLEND_ADD_SHADER_NAME = 'DSFX/FX_SHADER_AlphaBlend_Add'
export const DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON',
  'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
export const DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES = [
  '_Color', '_Multiply', '_Texture', '_RGBRGBA', '_Main_Texture_No',
  '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_ZOffsetFactor', '_ZOffsetUnits',
] as const
export const DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES = ['_Texture'] as const
export const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE = {
  bundleSha256: '46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816',
  serializedFile: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6',
  objectId: '1142847250617954324',
} as const
export const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOAT_PROPERTIES = {
  _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
  _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
  _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
  _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
  _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
  _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
} as const
export const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLOR_PROPERTIES = {
  _Color: { r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 },
  _EmissionColor: { r: 0, g: 0, b: 0, a: 0 },
  _SpecColor: { r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 },
} as const
/** Unity's Standard-material serializer retains these fields on this exact custom-shader material. */
export const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES: ReadonlySet<string> = new Set([
  '_GlossyReflections', '_OcclusionStrength', '_SpecularHighlights', '_EmissionColor', '_SpecColor',
])
export const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT = 'wakamo-eye-white-default' as const
export const DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES = ['POSITION', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0'] as const
export const DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0'] as const
export const DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
  'unity_LODFade', 'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
  'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
  'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
  'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
  'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
  'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams', '_Color', '_Texture_ST', '_ZTest_Mode',
  '_Cull_Mode', '_ZWrite_Mode', '_ZOffsetUnits', '_ZOffsetFactor', '_Multiply', '_RGBRGBA',
  '_Custom_Data_Offset_Use', '_Main_Texture_No', '_Texture',
] as const
export const DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'unity_Builtins0Array', '_Color', '_Texture_ST',
  '_ZTest_Mode', '_Cull_Mode', '_ZWrite_Mode', '_ZOffsetUnits', '_ZOffsetFactor', '_Multiply', '_RGBRGBA',
  '_Custom_Data_Offset_Use', '_Main_Texture_No', '_Texture',
] as const
export const DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', 'unity_LODFade',
  'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
  'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
  'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
  'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
  'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
  'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams',
] as const
export const DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection',
  '_ShadowCoordModifier', 'unity_Builtins0Array',
] as const
export const DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS = [
  {
    blobIndex: 2, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 0,
    passIndex: 0, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 2568, size: 5096, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
    keywords: [], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_COLOR0'],
    parameterRecordSha256: 'a4e32c89ae00a77e44f772e5f50b371d34028243345b2231c8817beb0bce74d3', keywordIndices: [], keywordNames: [],
    programHash: 'df04b3b74a13eb8720e8c9e3dbb4adf56c4cad61c60c691a2c59cf7aa59c1659', programDataLength: 5055,
    programRecordSha256: '56fa177b4bc146116debfca1afab21a995b302f8e92ea27074ff53dabb7684d0',
    requiredAttributes: DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES, requiredUniforms: DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS,
  },
  {
    blobIndex: 3, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 1,
    passIndex: 0, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 7664, size: 4560, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
    keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_COLOR0', 'vs_SV_InstanceID0'],
    parameterRecordSha256: '5db8a8a64c9a4eb5ca694006a5f4cb90d57b6421d602cb025745d389fe67c865', keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    programHash: '4c734b1eddd609e21119a81d0e3cf0fb4e3c8b3ae981e741c02eeaae72ec5bd3', programDataLength: 4497,
    programRecordSha256: 'c6f83c938ddfd905863e50f341ba8c445568254664402ae174ac2c235af17098',
    requiredAttributes: DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES, requiredUniforms: DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS,
  },
  {
    blobIndex: 6, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 4,
    passIndex: 1, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 14356, size: 4660, segment: 0, sourceMap: 59, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
    keywords: [], programAttributes: ['in_POSITION0', 'in_NORMAL0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD2', 'vs_COLOR0'],
    parameterRecordSha256: '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17', keywordIndices: [], keywordNames: [],
    programHash: '13e560d4e67cdd506232363684014b837d096c675123816d7d52d6570cfd775e', programDataLength: 4620,
    programRecordSha256: '1aa2a0449aa09764b09a525ed943b4b095d6ffdae1563cd2bcdfc9a037b5b713',
    requiredAttributes: DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES, requiredUniforms: DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS,
  },
  {
    blobIndex: 7, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 5,
    passIndex: 1, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 19016, size: 4264, segment: 0, sourceMap: 59, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
    keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_NORMAL0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD2', 'vs_COLOR0', 'vs_SV_InstanceID0'],
    parameterRecordSha256: '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51', keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    programHash: 'a1368f654663b3060b14b33fc3228e12159327792845877575f693c1c50a6c53', programDataLength: 4201,
    programRecordSha256: 'b3b2b3aecc12c5fb8c248c1dd530c4e6521d43b798f1cab41ff2f81060b4d53f',
    requiredAttributes: DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES, requiredUniforms: DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS,
  },
] as const

/** AlphaBlend_Add source materials use only these exact translated states. */
export const DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS = {
  'depth-tested-back-cull': {
    ...CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1].renderState,
    depthTest: true,
    depthFunction: 'less-equal',
    cullMode: 'back',
    doubleSided: false,
  },
  'depth-tested-off-double-sided': {
    ...CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1].renderState,
    depthTest: true,
    depthFunction: 'less-equal',
    cullMode: 'off',
    doubleSided: true,
  },
} as const

export const DSFX_GLITCH_TEX_SOURCE_REFERENCE = {
  bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
  serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-50954330373109545',
} as const
export const DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256 = 'b8f29baf75b913a1231adf3c24f8a24b179deaee5bbc03a0e145984c691a15a0'
export const DSFX_GLITCH_TEX_FINGERPRINT = 'da4f6c1689e70742a01d91febca067eb0492a4121ad2fc63476323a6459f7b3e'
export const DSFX_GLITCH_TEX_SHADER_NAME = 'DSFX/FX_SHADER_Glitch_Tex'
export const DSFX_GLITCH_TEX_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON',
  'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
export const DSFX_GLITCH_TEX_REQUIRED_PROPERTIES = [
  '_MainTex', '_x', '_y', '_Speed_Value', '_NoiseTex', '_Shaking', '_Glitch_value', '_Jitter', '_Cull_Mode',
] as const
export const DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES = ['_MainTex', '_NoiseTex'] as const
export const DSFX_GLITCH_TEX_FORWARD_ATTRIBUTES = ['POSITION', 'TEXCOORD_0'] as const
export const DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'] as const
export const DSFX_GLITCH_TEX_FORWARD_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld',
  '_Time', '_Cull_Mode', '_Speed_Value', '_Shaking', '_Jitter', '_Glitch_value', '_x', '_y', '_NoiseTex', '_MainTex',
] as const
export const DSFX_GLITCH_TEX_SHADOW_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorld',
] as const
export const DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH = '38d23aef9f77ca1a78dfd0efb262bca0bccdafaa1b72b2da397d03bb8c8baf71'
export const DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH = 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5'
export const DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256 = '3bc739b0ac1bdfebdef0f55320721c38555e9e0e263a844a90287b32c3656dbc'
export const DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 = '9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4'
export const DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256 = '42c347357ddcd6b9365ba7a523bf05e2b4aa17076093ba172e7ac7ad313f1450'
export const DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256 = '89cb58753bbfac486d044fc253235f533f9634393bd30204de277063619427ee'
export const DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH = 5868
export const DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH = 4379

const DSFX_GLITCH_TEX_PASS_SPECS = {
  forward: {
    pass: 'forward', stateName: 'Forward', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
    blobIndex: 1, parameterBlobIndex: 0, parameterRecordSha256: DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256,
    programHash: DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH, programDataSha256: DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
    programDataLength: DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH, programRecordSha256: DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256,
    keywordIndices: [], keywordNames: [], requiredAttributes: DSFX_GLITCH_TEX_FORWARD_ATTRIBUTES,
    requiredUniforms: DSFX_GLITCH_TEX_FORWARD_UNIFORMS,
    renderState: { zWrite: 0, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  shadow: {
    pass: 'shadow', stateName: 'ShadowCaster', subShaderIndex: 0, passIndex: 1, stage: 'vertex', platform: 9, gpuProgramType: 4,
    blobIndex: 3, parameterBlobIndex: 2, parameterRecordSha256: DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256,
    programHash: DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH, programDataSha256: DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH,
    programDataLength: DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH, programRecordSha256: DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256,
    keywordIndices: [], keywordNames: [], requiredAttributes: DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES,
    requiredUniforms: DSFX_GLITCH_TEX_SHADOW_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
} as const

export const DSFX_MATCAP_SOURCE_REFERENCE = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-2917564576425350283',
} as const
export const DSFX_MATCAP_MATERIAL_REFERENCE = {
  bundleSha256: 'd595ec49e21a44b8a9d1fb280f5e9ea00fedcda560ffc242e792b4fcd175d748',
  serializedFile: 'CAB-ea179b2d4143f9bef81bc7cac07dcd93', objectId: '-5136731906767245831',
} as const
export const DSFX_MATCAP_MAIN_TEXTURE_REFERENCE = {
  bundleSha256: 'c0902532467f62315531c05d9e7047e6265b5021ac982cf06cdd87ecb2ffd4b4',
  serializedFile: 'CAB-22cae0b66f2ef2c9cc2627354aa6e59d', objectId: '-1931283808872943791',
} as const
export const DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE = {
  bundleSha256: '1e293d91261dd2af2b91657dfe0e2e0512c48e246ac43ac90d99159975f5b1a7',
  serializedFile: 'CAB-7405438e0c71de1c2ead1707d796c2fc', objectId: '3221402221456861287',
} as const
export const DSFX_MATCAP_MAIN_COLOR = [0.30188679695129395, 0.055614907294511795, 0, 0.772549033164978] as const
export const DSFX_MATCAP_PROGRAM_BLOB_SHA256 = '3da48932a17f98d5de6fc428f1ba992e824152b12be7e30a169cae5de3c1ba9d'
export const DSFX_MATCAP_FINGERPRINT = '99e3d6e9cccc359cdf91cd2e7253b62b1929a522326d1291a7ae43d944e468dc'
export const DSFX_MATCAP_SHADER_NAME = 'DSFX/FX_SHADER_Matcap'
export const DSFX_MATCAP_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
export const DSFX_MATCAP_REQUIRED_PROPERTIES = [
  '_Main_Color', '_Main_Tex', '_Matcap_Tex', '_ZWrite_Mode', '_Cull_Mode', '_texcoord',
] as const
export const DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES = ['_Main_Tex', '_Matcap_Tex'] as const
/**
 * CH0191_FoodProp_02 serializes these URP-era fields even though the linked
 * DSFX Matcap shader neither declares nor references them.  Keep the source
 * values exact: this is a material-specific residue allowlist, not a generic
 * escape hatch for unknown properties.
 */
export const DSFX_MATCAP_INERT_FLOAT_PROPERTIES = {
  _AlphaClip: 0,
  _Blend: 0,
  _BumpScale: 1,
  _Cull: 2,
  _Cutoff: 0.527999997138977,
  _DstBlend: 10,
  _EnvironmentReflections: 0,
  _GlossMapScale: 0,
  _Glossiness: 0,
  _GlossinessSource: 0,
  _GlossyReflections: 0,
  _Metallic: 0.08699999749660492,
  _OcclusionStrength: 1,
  _QueueOffset: -50,
  _ReceiveShadows: 0,
  _SampleGI: 0,
  _Shininess: 0,
  _Smoothness: 0.032999999821186066,
  _SmoothnessSource: 0,
  _SmoothnessTextureChannel: 0,
  _SpecSource: 0,
  _SpecularHighlights: 0,
  _SrcBlend: 5,
  _Surface: 1,
  _WorkflowMode: 1,
  _ZWrite: 0,
} as const
export const DSFX_MATCAP_INERT_COLOR_PROPERTIES = {
  _BaseColor: { r: 1, g: 1, b: 1, a: 1 },
  _Color: { r: 1, g: 1, b: 1, a: 1 },
  _EmissionColor: { r: 0, g: 0, b: 0, a: 1 },
  _SpecColor: { r: 0.5849056243896484, g: 0.5849056243896484, b: 0.5849056243896484, a: 0.032999999821186066 },
} as const
export const DSFX_MATCAP_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0'] as const
export const DSFX_MATCAP_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL', 'COLOR_0'] as const
export const DSFX_MATCAP_FORWARD_STATIC_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
  'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST', '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex',
] as const
export const DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'hlslcc_mtx4x4unity_ObjectToWorldArray',
  'hlslcc_mtx4x4unity_WorldToObjectArray', 'unity_Builtins0Array', 'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST',
  '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex',
] as const
export const DSFX_MATCAP_SHADOW_STATIC_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
] as const
export const DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_WorldToObjectArray', 'unity_Builtins0Array',
] as const
/** Backwards-compatible aliases for the static pass uniform sets. */
export const DSFX_MATCAP_FORWARD_UNIFORMS = DSFX_MATCAP_FORWARD_STATIC_UNIFORMS
export const DSFX_MATCAP_SHADOW_UNIFORMS = DSFX_MATCAP_SHADOW_STATIC_UNIFORMS
export const DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH = 'b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e'
export const DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH = '38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4'
export const DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH = 'd33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67'
export const DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH = '8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7'
export const DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256 = 'a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e'
export const DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256 = 'fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f'
export const DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256 = '34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3'
export const DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256 = 'd0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3'
export const DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256 = '1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150'
export const DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256 = '1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175'
export const DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17'
export const DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256 = '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51'
export const DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH = 5178
export const DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH = 4726
export const DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH = 4923
export const DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH = 4599

const DSFX_MATCAP_PASS_SPECS = {
  forward: {
    pass: 'forward', variant: 'static', stateName: 'Forward', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
    blobIndex: 2, parameterBlobIndex: 0, parameterRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256,
    programHash: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH, programDataSha256: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH,
    programDataLength: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH, programRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256,
    keywordIndices: [], keywordNames: [], requiredAttributes: DSFX_MATCAP_FORWARD_ATTRIBUTES,
    requiredUniforms: DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
    renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  forwardInstanced: {
    pass: 'forward', variant: 'instanced', stateName: 'Forward', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
    blobIndex: 3, parameterBlobIndex: 1, parameterRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256,
    programHash: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH, programDataSha256: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH,
    programDataLength: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH, programRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256,
    keywordIndices: [5], keywordNames: ['INSTANCING_ON'], requiredAttributes: DSFX_MATCAP_FORWARD_ATTRIBUTES,
    requiredUniforms: DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
    renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  shadow: {
    pass: 'shadow', variant: 'static', stateName: 'ShadowCaster', subShaderIndex: 0, passIndex: 1, stage: 'vertex', platform: 9, gpuProgramType: 4,
    blobIndex: 6, parameterBlobIndex: 4, parameterRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256,
    programHash: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH, programDataSha256: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH,
    programDataLength: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH, programRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256,
    keywordIndices: [], keywordNames: [], requiredAttributes: DSFX_MATCAP_SHADOW_ATTRIBUTES,
    requiredUniforms: DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
    renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
  shadowInstanced: {
    pass: 'shadow', variant: 'instanced', stateName: 'ShadowCaster', subShaderIndex: 0, passIndex: 1, stage: 'vertex', platform: 9, gpuProgramType: 4,
    blobIndex: 7, parameterBlobIndex: 5, parameterRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256,
    programHash: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH, programDataSha256: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH,
    programDataLength: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH, programRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256,
    keywordIndices: [5], keywordNames: ['INSTANCING_ON'], requiredAttributes: DSFX_MATCAP_SHADOW_ATTRIBUTES,
    requiredUniforms: DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
    renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
} as const

const DSFX_ALPHA_BLEND_0_INERT_PROPERTIES = new Set([
  '_GlossyReflections', '_EnvironmentReflections',
  '_LightingEnabled', '_OcclusionStrength', '_SpecularHighlights',
  '_EmissionColor', '_SpecColor',
])
const DSFX_MATCAP_INERT_PROPERTIES = new Set([
  ...Object.keys(DSFX_MATCAP_INERT_FLOAT_PROPERTIES), ...Object.keys(DSFX_MATCAP_INERT_COLOR_PROPERTIES),
])

function dsfxStaticShaderRule(shaderName: string | null, parsedName: string | null) {
  const identities = [shaderName, parsedName].map(normalizedShaderIdentity)
  return CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES.find(rule => identities.includes(rule.identity))
}

type CustomShaderAdapterId = Exclude<ChibiShaderAdapterId,
  'mx-character-face' | 'mx-character-eyemouth' | 'mx-character-eyebrow' | 'mx-character-hair'
  | 'mx-character-general' | 'mx-character-weapon' | 'gltf-native'>

interface CustomShaderAdapterRule {
  id: CustomShaderAdapterId
  identity: string
  programBlobSha256: string
  sourceReference: InventorySourceReference
  requiredProperties: string[]
  passSignature: {
    type: number
    states: Partial<Record<'zWrite' | 'zTest' | 'culling' | 'srcBlend' | 'destBlend', number>>[]
  }[]
  behavior: string
}

export const MX_UNLIT_OUTLINE_SOURCE_REFERENCE = {
  bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
  serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-8748270323205728420',
} as const
export const MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256 = '91f6c05f3ea2768b13f3879bff7eb56fd28bd852aca89131caa3ddfec5ecf8ce'
export const MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH = '8dd437bded36c20c116d416a2a3f679deb58b3249d887cfce6fbcfeaad94a24e'
export const MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH = 'cf33765ab69ff40c91202ccb8b006211246685b6be23a41636cdf9de69bffde0'
export const MX_C_TRANSPARENT_ST_SOURCE_REFERENCE = {
  bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
  serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-5281742850669710733',
} as const
export const MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256 = 'ff279d3985ac14ecb356f9ab863bb83b3b9d18033bfe897c877f8da866e6d345'
export const MX_C_TRANSPARENT_ST_FINGERPRINT = '476551579a557a660da5fa3454da6f10193c729fef20430d4c905e8df0c7d7a5'
export const MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH = 'a183c161a42534139176e57679b700599f385de97243d75ef719a70c0feea253'
export const MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH = '8b65ba41e0b6f12e63d7d04c8eb017ac03a7962880f76474faea12cdcde319f9'
export const MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH = '4ea792966bb7d8359234279f7e000ebea5c5a4fedd7a62ed819225f5186bae98'
export const MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256 = 'e9758ef79668f2925973ee08ab66cc059609e4c2e8440fddd1c27547c9df66fe'
export const MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256 = 'f834a20f9f5d48e3b99e9c7fd896fed2162374e81d6d50112174d924401049cf'
export const MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256 = '33d45d0b45e7e4a2fd5f5fd4fe1d6b652e6d0d19de0d2a36665d344de31b7581'
export const MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256 = 'b6901e2d32877e7c7d19a77a513f345130a90e9e3c47ff7b22a39bab3af68f65'
export const MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256 = '23375befaf4b4f6524e364569fe388024d9df20509258ad4b64b84491eee9a5c'
export const MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256 = 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532'
export const MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'COLOR_0', 'TEXCOORD_0'] as const
export const MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES = ['POSITION'] as const
export const MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS = [
  '_WorldSpaceCameraPos', '_MxCharShadowTone', '_MxCharLightData', '_Tint', '_ShadowThreshold',
  '_ShadowTint', '_Cutoff', '_RimAreaMultiplier', '_RimStrength', '_AdditionalLightStrength',
  '_AdditionalLightSharpness', '_GrayBrightness', '_MainTex_ST', '_CodeAddColor', '_CodeMultiplyColor',
  '_CodeAddRimColor', '_DitherThreshold', '_MaskRtoG', '_MaskGSensitivity', '_SeeThroughMinValue',
  '_SeeThroughTransparency', '_SeeThroughSmoothness', '_GlobalMipBias', '_MxCharLightDir',
  '_MxCharLightTone', '_MainTex', '_MaskTex', 'hlslcc_mtx4x4unity_MatrixVP',
] as const
export const MX_C_TRANSPARENT_ST_DITHER_UNIFORMS = [...MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS, '_ProjectionParams'] as const
export const MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld'] as const
export const MX_C_TRANSPARENT_ST_REQUIRED_PROPERTIES = [
  '_Cull', '_ZWrite', '_Tint', '_MainTex', '_MaskTex', '_MaskGSensitivity', '_MaskRtoG',
  '_SeeThroughMinValue', '_SeeThroughTransparency', '_SeeThroughSmoothness', '_ShadowTint',
  '_ShadowThreshold', '_RimAreaMultiplier', '_RimStrength', '_AdditionalLightStrength',
  '_AdditionalLightSharpness', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor',
  '_DitherThreshold', '_GrayBrightness',
] as const

export const PROJECTMX_WEAPON_SOURCE_REFERENCE = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-2179428789015729742',
} as const
export const PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256 = '962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b'
export const PROJECTMX_WEAPON_FINGERPRINT = 'dba2503cda8be6508b161525ab1202a9187f93c8924716efe6f3d061a4ff439b'
export const PROJECTMX_WEAPON_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  '_ADDITIONAL_LIGHTS', 'DEBUG_DISPLAY', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2', '_DAMAGE_0', '_GLOW_0',
  '_DITHER_HORIZONTAL_LINES', 'OUTLINE_RIM_LIGHT_POINT', 'OUTLINE_RIM_LIGHT_SPOT', '_GRAYSCALE_MODE',
  '_CHAR_CUTOUT_MODE',
] as const
export const PROJECTMX_WEAPON_REQUIRED_PROPERTIES = [
  '_DamageON', '_Color', '_mainTex', '_sourceTex', '_NoiseTex', '_CrushScale', '_NoiseDir',
  '_DmgCol', '_NoiseColStrong', '_Damage', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire',
  '_ShadowThreshold', '_ShadowStrong', '_LightValue', '_LightStrong', '_SpecStrong', '_ShadowTint',
  '_SpecColor', '_FakeLightDir', '_AdditionalLightStrength', '_AdditionalLightSharpness', '_UseGlow',
  '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0', '_OutlineTint',
  '_OutlineSolidColorTint', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', '_GrayBrightness',
  '_IsDither', '_DitherThreshold',
] as const

export const MX_E_STANDARD_SOURCE_REFERENCE = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-8678996592869746170',
} as const
export const MX_E_STANDARD_PROGRAM_BLOB_SHA256 = 'b3edadb8e9c86afdab206cab761a0a574ee8e0baa75183cc24147a4e02ea1288'
export const MX_E_STANDARD_FINGERPRINT = 'a9a00b4141e350c6dd7611bcaa1fbcbadfe35dff202f41bf3fe5df2ce5124019'
export const MX_E_STANDARD_SHADER_NAME = 'MX/E-Standard'
export const MX_E_STANDARD_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  '_RECEIVE_SHADOWS_OFF', 'DEBUG_DISPLAY', '_MAIN_LIGHT_SHADOWS', '_ADDITIONAL_LIGHTS', 'LIGHTMAP_ON',
  '_BAKED_PREFAB', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2', 'INSTANCING_ON', '_ENV_CUTOUT_MODE',
  '_ENV_ALPHA_MODE', '_ENV_REFLECT_MODE', '_ENV_EMISSION_MODE', '_ENV_SPECULAR_MODE', '_DYNAMIC_LIGHTS',
  '_UNLIT_CODEADDCOLOR', '_DEBUG_LIGHTMAP', '_SPECULAR_SETUP',
] as const
export const MX_E_STANDARD_REQUIRED_PROPERTIES = [
  '_Cutoff', '_PrefabLightmapTex', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha',
  '_ZWrite', '_Cull', '_ZOffsetFactor', '_ZOffsetUnits', '_Color', '_MainTex', '_ReflectTex',
  '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength', '_EmissionTex',
  '_EmissionStrength', '_SpecTex', '_SpecLightDir', '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec',
  '_LightmapStrength', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor',
] as const
export const MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES = ['_PrefabLightmapTex', '_MainTex', '_ReflectTex', '_EmissionTex', '_SpecTex'] as const
export const MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES = ['_MainTex'] as const
export const MX_E_STANDARD_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0'] as const
export const MX_E_STANDARD_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'] as const
export const MX_E_STANDARD_DEPTH_ATTRIBUTES = ['POSITION'] as const
export const MX_E_STANDARD_META_ATTRIBUTES = ['POSITION', 'TEXCOORD_0', 'TEXCOORD_1', 'TEXCOORD_2'] as const
const MX_E_STANDARD_FORWARD_MATERIAL_UNIFORMS = [
  '_MainTex_ST', '_Color', '_Cutoff', '_PrefabLightmapTex_ST', '_ReflectTex_ST', '_ReflectBaseAmount',
  '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength', '_EmissionStrength', '_SpecLightDir',
  '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec', '_LightmapStrength', '_CodeAddColor',
  '_CodeMultiplyColor', '_CodeAddRimColor',
] as const
export const MX_E_STANDARD_FORWARD_STATIC_UNIFORMS = [
  '_ProjectionParams', 'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld',
  'hlslcc_mtx4x4unity_WorldToObject', 'unity_SHAr', 'unity_SHAg', 'unity_SHAb', 'unity_SHBr',
  'unity_SHBg', 'unity_SHBb', 'unity_SHC', ...MX_E_STANDARD_FORWARD_MATERIAL_UNIFORMS, '_GlobalMipBias', '_MainTex',
] as const
export const MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS = [
  '_MainLightPosition', '_WorldSpaceCameraPos', ...MX_E_STANDARD_FORWARD_STATIC_UNIFORMS, '_MainLightColor',
] as const
export const MX_E_STANDARD_SHADOW_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
] as const
export const MX_E_STANDARD_DEPTH_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
] as const
export const MX_E_STANDARD_META_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
  ...MX_E_STANDARD_FORWARD_MATERIAL_UNIFORMS, 'unity_OneOverOutputBoost', 'unity_MaxOutputValue',
  'unity_MetaVertexControl', 'unity_MetaFragmentControl', 'unity_VisualizationMode', '_GlobalMipBias', '_MainTex',
] as const
export const MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH = 'cfd7db48ce454d347374b95768908b6c27e267c7c3812643b2162cff8ccc078b'
export const MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH = 'ba83d0d99dbb57507bc8fb0f423304c93b59a6c1703aa4f775f0fd6020fd3cf8'
export const MX_E_STANDARD_SHADOW_PROGRAM_HASH = 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0'
export const MX_E_STANDARD_DEPTH_PROGRAM_HASH = '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513'
export const MX_E_STANDARD_META_PROGRAM_HASH = 'f1ac8ee9712bdf61db2946f3759d2bc6bf3e3f046ee76f9f2891521f84cb4201'
export const MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256 = '6c8c8c189fa4171c300d1c23e270155b10999851bb1ab1dd6df96c5c1fb17c78'
export const MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256 = '034d968d7b7778638f25e050f5ab099098afb32688543b8d41e77dd112063d6f'
export const MX_E_STANDARD_SHADOW_RECORD_SHA256 = '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46'
export const MX_E_STANDARD_DEPTH_RECORD_SHA256 = '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0'
export const MX_E_STANDARD_META_RECORD_SHA256 = '551fed3636dc25ca1923b2d081b1c2a63ce5cb129433e640a21892c6a625641f'
export const MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256 = 'f88facd27e428382fd81071a1bbd4f366583363e315d520319f0a8a4bb2e0389'
export const MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256 = '86bcf1ab50b14c400c719927e0ead152e358475297170daebeceadc06d46bfb6'
export const MX_E_STANDARD_SHADOW_PARAMETER_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17'
export const MX_E_STANDARD_DEPTH_PARAMETER_SHA256 = '18defb46cf7eb1e1646d318f215cc2eaa29fa06411690ba443cade9de3be4181'
export const MX_E_STANDARD_META_PARAMETER_SHA256 = 'f3597fa2708ab4924492304ff8dcfd3a7271f291c931e74d1b1a480634ac4220'

const MX_E_STANDARD_FORWARD_STATIC_STATE = {
  zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull',
  sourceBlend: 0, sourceBlendProperty: '_SrcBlend', destinationBlend: 0, destinationBlendProperty: '_DstBlend',
  sourceBlendAlpha: 0, sourceBlendAlphaProperty: '_SrcBlendAlpha', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '_DstBlendAlpha',
  blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
  offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor', offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits',
} as const
const MX_E_STANDARD_OPAQUE_STATE = {
  zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull',
  sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>',
  sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>',
  blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
  offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>',
} as const
const MX_E_STANDARD_DEPTH_STATE = { ...MX_E_STANDARD_OPAQUE_STATE, colorMask: 0, depthOnly: true } as const
const MX_E_STANDARD_META_STATE = { ...MX_E_STANDARD_OPAQUE_STATE, cullingProperty: '<noninit>' } as const

const MX_E_STANDARD_PASS_SPECS = {
  forwardStatic: {
    pass: 'forwardStatic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 160, parameterBlobIndex: 0,
    parameterRecordSha256: MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256, programHash: MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256, programDataLength: 7132,
    keywordIndices: [], keywordNames: [], requiredAttributes: MX_E_STANDARD_FORWARD_ATTRIBUTES,
    requiredUniforms: MX_E_STANDARD_FORWARD_STATIC_UNIFORMS, renderState: MX_E_STANDARD_FORWARD_STATIC_STATE,
  },
  forwardDynamic: {
    pass: 'forwardDynamic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 171, parameterBlobIndex: 4,
    parameterRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, programHash: MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, programDataLength: 8112,
    keywordIndices: [19], keywordNames: ['_DYNAMIC_LIGHTS'], requiredAttributes: MX_E_STANDARD_FORWARD_ATTRIBUTES,
    requiredUniforms: MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS, renderState: MX_E_STANDARD_FORWARD_STATIC_STATE,
  },
  shadow: {
    pass: 'shadow', stateName: 'ShadowCaster', passName: '', passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312,
    parameterRecordSha256: MX_E_STANDARD_SHADOW_PARAMETER_SHA256, programHash: MX_E_STANDARD_SHADOW_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_SHADOW_RECORD_SHA256, programDataLength: 4273,
    keywordIndices: [], keywordNames: [], requiredAttributes: MX_E_STANDARD_SHADOW_ATTRIBUTES,
    requiredUniforms: MX_E_STANDARD_SHADOW_UNIFORMS, renderState: MX_E_STANDARD_OPAQUE_STATE,
  },
  depth: {
    pass: 'depth', stateName: 'DepthOnly', passName: '', passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320,
    parameterRecordSha256: MX_E_STANDARD_DEPTH_PARAMETER_SHA256, programHash: MX_E_STANDARD_DEPTH_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_DEPTH_RECORD_SHA256, programDataLength: 2766,
    keywordIndices: [], keywordNames: [], requiredAttributes: MX_E_STANDARD_DEPTH_ATTRIBUTES,
    requiredUniforms: MX_E_STANDARD_DEPTH_UNIFORMS, renderState: MX_E_STANDARD_DEPTH_STATE,
  },
  meta: {
    pass: 'meta', stateName: 'Meta', passName: '', passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328,
    parameterRecordSha256: MX_E_STANDARD_META_PARAMETER_SHA256, programHash: MX_E_STANDARD_META_PROGRAM_HASH,
    programRecordSha256: MX_E_STANDARD_META_RECORD_SHA256, programDataLength: 6928,
    keywordIndices: [], keywordNames: [], requiredAttributes: MX_E_STANDARD_META_ATTRIBUTES,
    requiredUniforms: MX_E_STANDARD_META_UNIFORMS, renderState: MX_E_STANDARD_META_STATE,
  },
} as const

const PROJECTMX_WEAPON_PASS_STATE = {
  sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0,
  blendOperation: 0, blendOperationAlpha: 0,
} as const

const PROJECTMX_WEAPON_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0'] as const
const PROJECTMX_WEAPON_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT', 'TEXCOORD_0'] as const
const PROJECTMX_WEAPON_SOLID_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT'] as const
const PROJECTMX_WEAPON_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'] as const
const PROJECTMX_WEAPON_DEPTH_ATTRIBUTES = ['POSITION'] as const
const PROJECTMX_WEAPON_FORWARD_UNIFORMS = [
  '_WorldSpaceCameraPos', 'hlslcc_mtx4x4unity_MatrixVP', '_MxCharShadowTone', '_ShadowTint', '_mainTex_ST',
  '_FakeLightDir', '_MxCharLightTone', '_MxCharLightData', '_ShadowThreshold', '_CodeAddColor',
  '_CodeMultiplyColor', '_CodeAddRimColor', '_Color', '_ShadowStrong', '_SpecColor', '_LightValue',
  '_LightStrong', '_SpecStrong', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_mainTex', '_sourceTex',
] as const
const PROJECTMX_WEAPON_GLOW_UNIFORMS = [
  ...PROJECTMX_WEAPON_FORWARD_UNIFORMS, '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0',
] as const
const PROJECTMX_WEAPON_OUTLINE_UNIFORMS = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_OutlineTint', '_OutlineZCorrection', '_mainTex',
] as const
const PROJECTMX_WEAPON_SOLID_OUTLINE_UNIFORMS = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_AdditionalLightSharpness', '_AdditionalLightStrength', '_OutlineTint',
  '_OutlineZCorrection', '_OutlineSolidColorTint', '_DitherThreshold',
] as const
const PROJECTMX_WEAPON_SHADOW_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier'] as const
const PROJECTMX_WEAPON_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP'] as const

const PROJECTMX_WEAPON_PASS_SPECS = {
  forward: {
    stateName: 'ForwardLit', passIndex: 0, blobIndex: 32, parameterBlobIndex: 0,
    parameterRecordSha256: '1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531',
    programHash: '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0',
    programRecordSha256: '6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab',
    programDataLength: 9117, keywordIndices: [], keywordNames: [],
    requiredAttributes: PROJECTMX_WEAPON_FORWARD_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_FORWARD_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, ...PROJECTMX_WEAPON_PASS_STATE },
  },
  glow: {
    stateName: 'ForwardLit', passIndex: 0, blobIndex: 34, parameterBlobIndex: 2,
    parameterRecordSha256: 'eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3',
    programHash: '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61',
    programRecordSha256: '649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199',
    programDataLength: 9679, keywordIndices: [10], keywordNames: ['_GLOW_0'],
    requiredAttributes: PROJECTMX_WEAPON_FORWARD_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_GLOW_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, ...PROJECTMX_WEAPON_PASS_STATE },
  },
  outline: {
    stateName: 'Outline', passIndex: 1, blobIndex: 104, parameterBlobIndex: 80,
    parameterRecordSha256: '93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9',
    programHash: 'a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703',
    programRecordSha256: '476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026',
    programDataLength: 5141, keywordIndices: [], keywordNames: [],
    requiredAttributes: PROJECTMX_WEAPON_OUTLINE_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_OUTLINE_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false, ...PROJECTMX_WEAPON_PASS_STATE },
  },
  solidOutline: {
    stateName: 'Solid Color Outline', passIndex: 2, blobIndex: 180, parameterBlobIndex: 176,
    parameterRecordSha256: '81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e',
    programHash: 'caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2',
    programRecordSha256: 'cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f',
    programDataLength: 5384, keywordIndices: [], keywordNames: [],
    requiredAttributes: PROJECTMX_WEAPON_SOLID_OUTLINE_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_SOLID_OUTLINE_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false, ...PROJECTMX_WEAPON_PASS_STATE },
  },
  shadow: {
    stateName: 'ShadowCaster', passIndex: 3, blobIndex: 193, parameterBlobIndex: 192,
    parameterRecordSha256: '7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35',
    programHash: 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0',
    programRecordSha256: '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46',
    programDataLength: 4273, keywordIndices: [], keywordNames: [],
    requiredAttributes: PROJECTMX_WEAPON_SHADOW_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_SHADOW_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, ...PROJECTMX_WEAPON_PASS_STATE },
  },
  depth: {
    stateName: 'DepthOnly', passIndex: 4, blobIndex: 195, parameterBlobIndex: 194,
    parameterRecordSha256: 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532',
    programHash: '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513',
    programRecordSha256: '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0',
    programDataLength: 2766, keywordIndices: [], keywordNames: [],
    requiredAttributes: PROJECTMX_WEAPON_DEPTH_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_DEPTH_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 0, depthOnly: true, ...PROJECTMX_WEAPON_PASS_STATE },
  },
} as const
const MX_UNLIT_OUTLINE_BASE_ATTRIBUTES = ['POSITION', 'TEXCOORD_0'] as const
const MX_UNLIT_OUTLINE_OUTLINE_ATTRIBUTES = ['POSITION', 'TANGENT', 'COLOR_0', 'TEXCOORD_0'] as const
const MX_UNLIT_OUTLINE_BASE_UNIFORMS = ['_MainTex_ST', '_Tint', '_MainTex'] as const
const MX_UNLIT_OUTLINE_OUTLINE_UNIFORMS = [
  '_MainTex_ST', '_OutlineTint', '_OutlineZCorrection', '_MainTex', '_MainLightColor',
  '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP',
] as const

// These identities and bytecode hashes are taken from the current BAAD
// source inventory.  The rules deliberately describe the shader version and
// its pass shape, not a student or material-name exception.  Each rule is
// either validated by a source-selected profile below or remains a
// publication blocker until its Viewer runtime adapter exists.
export const CHIBI_CUSTOM_SHADER_ADAPTER_RULES: readonly CustomShaderAdapterRule[] = [
  {
    id: 'mx-c-transparent-st', identity: 'mx/c-transparent-st',
    programBlobSha256: MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256,
    sourceReference: MX_C_TRANSPARENT_ST_SOURCE_REFERENCE,
    requiredProperties: [...MX_C_TRANSPARENT_ST_REQUIRED_PROPERTIES],
    passSignature: [
      { type: 0, states: [
        { zWrite: 0, zTest: 4, culling: 0 },
        { zWrite: 0, zTest: 4, culling: 0 },
      ] },
    ],
    behavior: 'mask/see-through/rim',
  },
  {
    id: 'projectmx-weapon-test1-damage', identity: 'projectmx/weapontest1damage',
    programBlobSha256: PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256,
    sourceReference: PROJECTMX_WEAPON_SOURCE_REFERENCE,
    requiredProperties: [...PROJECTMX_WEAPON_REQUIRED_PROPERTIES],
    passSignature: [
      { type: 0, states: [
        { zWrite: 1, zTest: 4, culling: 2 },
        { zWrite: 1, zTest: 4, culling: 1 },
        { zWrite: 1, zTest: 4, culling: 1 },
        { zWrite: 1, zTest: 4, culling: 2 },
        { zWrite: 1, zTest: 4, culling: 2 },
      ] },
    ],
    behavior: 'damage/noise/fire',
  },
  {
    id: 'mx-e-standard', identity: 'mx/e-standard',
    programBlobSha256: 'b3edadb8e9c86afdab206cab761a0a574ee8e0baa75183cc24147a4e02ea1288',
    sourceReference: {
      bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
      serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-8678996592869746170',
    },
    requiredProperties: [
      '_Cutoff', '_PrefabLightmapTex', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha',
      '_ZWrite', '_Cull', '_ZOffsetFactor', '_ZOffsetUnits', '_Color', '_MainTex', '_ReflectTex',
      '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength', '_EmissionTex',
      '_EmissionStrength', '_SpecTex', '_SpecLightDir', '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec',
      '_LightmapStrength', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor',
    ],
    passSignature: [
      { type: 0, states: [
        { zWrite: 0, zTest: 4, culling: 0 },
        { zWrite: 1, zTest: 4, culling: 0 },
        { zWrite: 1, zTest: 4, culling: 0 },
        { zWrite: 1, zTest: 4, culling: 0 },
      ] },
    ],
    behavior: 'reflect/emission/spec',
  },
  {
    id: 'dsfx-matcap', identity: 'dsfx/fx_shader_matcap',
    programBlobSha256: DSFX_MATCAP_PROGRAM_BLOB_SHA256,
    sourceReference: DSFX_MATCAP_SOURCE_REFERENCE,
    requiredProperties: [...DSFX_MATCAP_REQUIRED_PROPERTIES],
    passSignature: [
      { type: 0, states: [
        { zWrite: 0, zTest: 4, culling: 0 },
        { zWrite: 1, zTest: 4, culling: 0 },
      ] },
    ],
    behavior: 'matcap/view-space-normal',
  },
  {
    id: 'mx-e-water-v2', identity: 'mx/e-water-v2',
    programBlobSha256: '97f1c0143e2fc4451b6892f2d0de121fd9abdd5c80728ba22c2e2427d0470748',
    sourceReference: {
      bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
      serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-1189838917732900529',
    },
    requiredProperties: [
      '_Cull', '_ZOffsetFactor', '_ZOffsetUnits', '_ReceiveShadowsOff', '_DataTex', '_RippleST',
      '_DistortST', '_PosOffsetEnabled', '_PosOffsetST', '_PosOffsetHeight', '_PosOffsetSpeedU',
      '_PosOffsetSpeedV', '_RippleColor', '_RippleSpeedU', '_RippleSpeedV', '_DistortSpeedU',
      '_DistortSpeedV', '_DistortStrengthU', '_DistortStrengthV', '_SurfaceColor', '_SurfaceFadeDistance',
      '_DepthColor', '_DepthGradDistance',
    ],
    passSignature: [
      { type: 0, states: [{ zWrite: 0, zTest: 4, culling: 0, srcBlend: 5, destBlend: 10 }] },
    ],
    behavior: 'ripple/distortion',
  },
  {
    id: 'mx-unlit-outline', identity: 'mx/unlitoutline',
    programBlobSha256: MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256,
    sourceReference: MX_UNLIT_OUTLINE_SOURCE_REFERENCE,
    requiredProperties: ['_Cull', '_Tint', '_MainTex', '_OutlineTint', '_OutlineZCorrection'],
    passSignature: [
      { type: 0, states: [
        { zWrite: 1, zTest: 4, culling: 0 },
        { zWrite: 1, zTest: 4, culling: 1 },
      ] },
    ],
    behavior: 'the second outline pass',
  },
]

function customShaderAdapterRule(shaderName: string | null, parsedName: string | null) {
  const identities = [shaderName, parsedName].map(normalizedShaderIdentity)
  return CHIBI_CUSTOM_SHADER_ADAPTER_RULES.find(rule => identities.includes(rule.identity))
}

function shaderPropertyNames(shader: InventoryShader | undefined) {
  return ((shader?.properties as { m_Props?: Record<string, unknown>[] } | undefined)?.m_Props ?? [])
    .map(property => property.m_Name)
    .filter((name): name is string => typeof name === 'string')
}

function dsfxGlitchShaderRule(shaderName: string | null, parsedName: string | null) {
  const identities = [shaderName, parsedName].map(normalizedShaderIdentity)
  return identities.includes(normalizedShaderIdentity(DSFX_GLITCH_TEX_SHADER_NAME)) ? DSFX_GLITCH_TEX_SOURCE_REFERENCE : undefined
}

function dsfxGlitchSourcePass(
  extraction: InventoryShaderExtraction,
  expected: typeof DSFX_GLITCH_TEX_PASS_SPECS[keyof typeof DSFX_GLITCH_TEX_PASS_SPECS],
): RenderingProfileGlitchShaderPass | null {
  const program = extraction.gles3Programs.find(item => item.kind === 'program' && item.blobIndex === expected.blobIndex)
  const binding = extraction.bindings.find(item => item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
  if (!program || !binding || typeof program.glsl !== 'string') return null
  return {
    ...expected,
    parameterRecordSha256: binding.parameterRecordSha256 ?? '',
    keywordIndices: [...binding.keywordIndices], keywordNames: [...binding.keywordNames],
    programHash: program.programHash ?? '', programDataSha256: program.programDataSha256 ?? '',
    programDataLength: program.programDataLength ?? -1, programRecordSha256: program.recordSha256 ?? '',
    requiredAttributes: [...expected.requiredAttributes], requiredUniforms: [...expected.requiredUniforms],
    glsl: program.glsl,
  }
}

function dsfxGlitchShaderExtractionEvidence(shader: InventoryShader | undefined): { error: string } | { source: RenderingProfileGlitchShaderExtraction } {
  if (!shader?.extraction) return { error: shader?.extractionError ? `source extraction failed: ${shader.extractionError}` : 'source shader extraction is missing' }
  const extraction = shader.extraction
  const sourceReference = extraction.shader?.sourceReference
  if (shader.programBlobSha256?.toLowerCase() !== DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
    || referenceKey(shader.sourceReference) !== referenceKey(DSFX_GLITCH_TEX_SOURCE_REFERENCE)
    || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== DSFX_GLITCH_TEX_FINGERPRINT
    || extraction.compressedBlobSha256 !== DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
    || referenceKey(sourceReference) !== referenceKey(DSFX_GLITCH_TEX_SOURCE_REFERENCE)
    || normalizedShaderIdentity(extraction.shader?.name) !== normalizedShaderIdentity(DSFX_GLITCH_TEX_SHADER_NAME)
    || !exactArray(extraction.shader?.keywordNames, DSFX_GLITCH_TEX_SHADER_KEYWORDS)
    || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
    return { error: 'source extraction metadata is incomplete or does not match the verified Glitch_Tex shader object' }
  }
  const expectedPrograms = Object.values(DSFX_GLITCH_TEX_PASS_SPECS)
  if (extraction.gles3Programs.length !== expectedPrograms.length
    || extraction.programs.filter(item => item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4).length !== expectedPrograms.length) {
    return { error: 'source extraction does not contain the complete GLES3 Glitch_Tex program set' }
  }
  for (const expected of expectedPrograms) {
    const program = extraction.gles3Programs.find(item => item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
    const complete = extraction.programs.find(item => item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
    const binding = extraction.bindings.find(item => item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
    if (!program || !complete || !binding || program.programHash !== expected.programHash || program.programDataSha256 !== expected.programDataSha256
      || program.programDataLength !== expected.programDataLength || program.recordSha256 !== expected.programRecordSha256
      || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programDataSha256
      || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
      || binding.subShaderIndex !== expected.subShaderIndex || binding.passIndex !== expected.passIndex
      || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
      || binding.parameterBlobIndex !== expected.parameterBlobIndex || binding.programHash !== expected.programHash
      || binding.gles3ProgramHash !== expected.programHash || binding.programRecordSha256 !== expected.programRecordSha256
      || binding.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(binding.keywordIndices, [])
      || !exactArray(binding.keywordNames, []) || typeof program.glsl !== 'string'
      || !program.glsl.includes('#version 300 es') || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
      return { error: `source extraction Glitch_Tex ${expected.pass} record does not match the verified source` }
    }
    for (const attribute of expected.requiredAttributes) {
      const sourceName = attribute === 'POSITION' ? 'in_POSITION0' : attribute === 'NORMAL' ? 'in_NORMAL0' : 'in_TEXCOORD0'
      if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceName}\\b`).test(program.glsl)) return { error: `source extraction Glitch_Tex ${expected.pass} source is missing ${attribute}` }
    }
    for (const uniform of expected.requiredUniforms) {
      if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`).test(program.glsl)) return { error: `source extraction Glitch_Tex ${expected.pass} source is missing ${uniform}` }
    }
  }
  const passes = shader.subShaders?.flatMap(subShader => subShader.passes ?? []) ?? []
  if (passes.length !== 2) return { error: `shader pass count is ${passes.length}, expected 2` }
  const expectedSourceStates = [
    { name: 'Forward', type: 0, zWrite: 0, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, colorMask: 15 },
    { name: 'ShadowCaster', type: 0, zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0 },
  ] as const
  for (const [index, expected] of expectedSourceStates.entries()) {
    const pass = passes[index], blend = sourceStateRecord(pass?.state, 'rtBlend0')
    if (pass?.type !== expected.type || pass.name !== '' || sourceStateName(pass.state, 'm_Name') !== expected.name
      || sourceStateValue(pass.state, 'zWrite') !== expected.zWrite || sourceStateValue(pass.state, 'zTest') !== expected.zTest
      || sourceStateValue(pass.state, 'culling') !== expected.culling || sourceStateName(pass.state, 'culling') !== expected.cullingProperty
      || !blend || sourceStateValue(blend, 'srcBlend') !== expected.sourceBlend || sourceStateValue(blend, 'destBlend') !== expected.destinationBlend
      || sourceStateValue(blend, 'srcBlendAlpha') !== expected.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== expected.destinationBlendAlpha
      || sourceStateValue(blend, 'blendOp') !== 0 || sourceStateValue(blend, 'blendOpAlpha') !== 0 || sourceStateValue(blend, 'colMask') !== expected.colorMask
      || sourceStateValue(pass.state, 'offsetFactor') !== 0 || sourceStateValue(pass.state, 'offsetUnits') !== 0) {
      return { error: `shader ${expected.name} render state is not the verified source state` }
    }
  }
  const forward = dsfxGlitchSourcePass(extraction, DSFX_GLITCH_TEX_PASS_SPECS.forward)
  const shadow = dsfxGlitchSourcePass(extraction, DSFX_GLITCH_TEX_PASS_SPECS.shadow)
  if (!forward || !shadow) return { error: 'source extraction Glitch_Tex pass metadata is incomplete' }
  return {
    source: {
      schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion, unityVersion: extraction.unityVersion,
      fingerprint: extraction.fingerprint, sourceReference: DSFX_GLITCH_TEX_SOURCE_REFERENCE,
      compressedBlobSha256: extraction.compressedBlobSha256, shaderName: DSFX_GLITCH_TEX_SHADER_NAME,
      shaderKeywordNames: [...DSFX_GLITCH_TEX_SHADER_KEYWORDS], requiredProperties: [...DSFX_GLITCH_TEX_REQUIRED_PROPERTIES],
      requiredTextureProperties: [...DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES], passes: { forward, shadow },
    },
  }
}

function dsfxMatcapSourcePass(
  extraction: InventoryShaderExtraction,
  expected: typeof DSFX_MATCAP_PASS_SPECS[keyof typeof DSFX_MATCAP_PASS_SPECS],
): RenderingProfileMatcapShaderPass | null {
  const program = extraction.gles3Programs.find(item => item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
  const binding = extraction.bindings.find(item => item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
  if (!program || !binding || typeof program.glsl !== 'string') return null
  return {
    ...expected,
    parameterRecordSha256: binding.parameterRecordSha256 ?? '',
    keywordIndices: [...binding.keywordIndices], keywordNames: [...binding.keywordNames],
    programHash: program.programHash ?? '', programDataSha256: program.programDataSha256 ?? '',
    programDataLength: program.programDataLength ?? -1, programRecordSha256: program.recordSha256 ?? '',
    requiredAttributes: [...expected.requiredAttributes], requiredUniforms: [...expected.requiredUniforms],
    glsl: program.glsl,
  }
}

function dsfxMatcapShaderExtractionEvidence(shader: InventoryShader | undefined): { error: string } | { source: RenderingProfileMatcapShaderExtraction } {
  if (!shader?.extraction) return { error: shader?.extractionError ? `source extraction failed: ${shader.extractionError}` : 'source shader extraction is missing' }
  const extraction = shader.extraction
  const sourceReference = extraction.shader?.sourceReference
  if (shader.programBlobSha256?.toLowerCase() !== DSFX_MATCAP_PROGRAM_BLOB_SHA256
    || referenceKey(shader.sourceReference) !== referenceKey(DSFX_MATCAP_SOURCE_REFERENCE)
    || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== DSFX_MATCAP_FINGERPRINT
    || extraction.compressedBlobSha256 !== DSFX_MATCAP_PROGRAM_BLOB_SHA256
    || referenceKey(sourceReference) !== referenceKey(DSFX_MATCAP_SOURCE_REFERENCE)
    || normalizedShaderIdentity(extraction.shader?.name) !== normalizedShaderIdentity(DSFX_MATCAP_SHADER_NAME)
    || !exactArray(extraction.shader?.keywordNames, DSFX_MATCAP_SHADER_KEYWORDS)
    || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
    return { error: 'source extraction metadata is incomplete or does not match the verified Matcap shader object' }
  }
  const expectedPrograms = Object.values(DSFX_MATCAP_PASS_SPECS)
  if (extraction.gles3Programs.length !== expectedPrograms.length
    || extraction.programs.filter(item => item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4).length !== expectedPrograms.length) {
    return { error: 'source extraction does not contain the complete GLES3 Matcap program set' }
  }
  for (const expected of expectedPrograms) {
    const program = extraction.gles3Programs.find(item => item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
    const complete = extraction.programs.find(item => item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
    const binding = extraction.bindings.find(item => item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
    if (!program || !complete || !binding || program.programHash !== expected.programHash || program.programDataSha256 !== expected.programDataSha256
      || program.programDataLength !== expected.programDataLength || program.recordSha256 !== expected.programRecordSha256
      || program.platform !== 9 || program.gpuProgramType !== 4
      || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programDataSha256
      || complete.platform !== 9 || complete.gpuProgramType !== 4
      || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
      || binding.subShaderIndex !== expected.subShaderIndex || binding.passIndex !== expected.passIndex
      || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
      || binding.parameterBlobIndex !== expected.parameterBlobIndex || binding.programHash !== expected.programHash
      || binding.gles3ProgramHash !== expected.programHash || binding.programRecordSha256 !== expected.programRecordSha256
      || binding.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(binding.keywordIndices, expected.keywordIndices)
      || !exactArray(binding.keywordNames, expected.keywordNames) || typeof program.glsl !== 'string'
      || !program.glsl.includes('#version 300 es') || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
      return { error: `source extraction Matcap ${expected.variant} ${expected.pass} record does not match the verified source` }
    }
    for (const attribute of expected.requiredAttributes) {
      if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) return { error: `source extraction Matcap ${expected.variant} ${expected.pass} source is missing ${attribute}` }
    }
    for (const uniform of expected.requiredUniforms) {
      if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`).test(program.glsl)) return { error: `source extraction Matcap ${expected.variant} ${expected.pass} source is missing ${uniform}` }
    }
  }
  const passes = shader.subShaders?.flatMap(subShader => subShader.passes ?? []) ?? []
  if (shader.subShaders?.length !== 1 || passes.length !== 2) return { error: `shader pass count is ${passes.length}, expected 2` }
  const expectedSourceStates = [
    { name: 'Forward', zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, colorMask: 15 },
    { name: 'ShadowCaster', zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0 },
  ] as const
  for (const [index, expected] of expectedSourceStates.entries()) {
    const pass = passes[index], blend = sourceStateRecord(pass?.state, 'rtBlend0')
    const tagsValue = findState(pass?.state, ['m_Tags'])
    const tags = tagsValue && typeof tagsValue === 'object' && Array.isArray((tagsValue as { tags?: unknown }).tags)
      ? new Map(((tagsValue as { tags: unknown[] }).tags).filter((item): item is unknown[] => Array.isArray(item) && item.length >= 2).map(item => [String(item[0]), String(item[1])]))
      : new Map<string, string>()
    const expectedTags = new Map([
      ['LIGHTMODE', index === 0 ? 'UniversalForwardOnly' : 'SHADOWCASTER'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'],
      ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque'],
    ])
    if (pass?.type !== 0 || pass.name !== '' || sourceStateName(pass.state, 'm_Name') !== expected.name
      || sourceStateValue(pass.state, 'zWrite') !== expected.zWrite || sourceStateName(pass.state, 'zWrite') !== expected.zWriteProperty
      || sourceStateValue(pass.state, 'zTest') !== expected.zTest || sourceStateName(pass.state, 'zTest') !== expected.zTestProperty
      || sourceStateValue(pass.state, 'culling') !== expected.culling || sourceStateName(pass.state, 'culling') !== expected.cullingProperty
      || !blend || sourceStateValue(blend, 'srcBlend') !== expected.sourceBlend || sourceStateValue(blend, 'destBlend') !== expected.destinationBlend
      || sourceStateValue(blend, 'srcBlendAlpha') !== expected.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== expected.destinationBlendAlpha
      || sourceStateValue(blend, 'blendOp') !== 0 || sourceStateValue(blend, 'blendOpAlpha') !== 0 || sourceStateValue(blend, 'colMask') !== expected.colorMask
      || sourceStateValue(pass.state, 'offsetFactor') !== 0 || sourceStateValue(pass.state, 'offsetUnits') !== 0
      || findState(pass.state, ['lighting']) !== false || tags.size !== expectedTags.size
      || [...expectedTags].some(([key, value]) => tags.get(key) !== value)) {
      return { error: `shader ${expected.name} render state or tags are not the verified Matcap source state` }
    }
  }
  const forward = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.forward)
  const forwardInstanced = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.forwardInstanced)
  const shadow = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.shadow)
  const shadowInstanced = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.shadowInstanced)
  if (!forward || !forwardInstanced || !shadow || !shadowInstanced) return { error: 'source extraction Matcap pass metadata is incomplete' }
  return {
    source: {
      schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion, unityVersion: extraction.unityVersion,
      fingerprint: extraction.fingerprint, sourceReference: DSFX_MATCAP_SOURCE_REFERENCE,
      compressedBlobSha256: extraction.compressedBlobSha256, shaderName: DSFX_MATCAP_SHADER_NAME,
      shaderKeywordNames: [...DSFX_MATCAP_SHADER_KEYWORDS], requiredProperties: [...DSFX_MATCAP_REQUIRED_PROPERTIES],
      requiredTextureProperties: [...DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES],
      passes: { forward, forwardInstanced, shadow, shadowInstanced },
    },
  }
}

function dsfxGlitchMaterialEvidence(
  material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] },
  shader: InventoryShader | undefined,
  state: RenderingProfileMaterialSlot['renderState'] | null,
  extractionEvidence: { error: string } | { source: RenderingProfileGlitchShaderExtraction },
) {
  if ('error' in extractionEvidence) return extractionEvidence.error
  const names = shaderPropertyNames(shader)
  if (!exactArray(names, DSFX_GLITCH_TEX_REQUIRED_PROPERTIES)) return 'shader declarations do not match the verified Glitch_Tex property set'
  if (!exactArray(material.keywords ?? [], [])) return 'shader keywords are active'
  const expectedFloats: Record<string, number> = { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 }
  const actualFloats = material.floatProperties ?? {}
  if (Object.keys(actualFloats).length !== Object.keys(expectedFloats).length
    || Object.entries(expectedFloats).some(([name, value]) => finiteNumber(actualFloats[name]) !== value)
    || Object.keys(material.intProperties ?? {}).length || Object.keys(material.colorProperties ?? {}).length) return 'material scalar/color properties do not match the verified Glitch_Tex state'
  const textures = material.textures ?? []
  if (textures.length !== 2 || !exactArray(textures.map(texture => texture.name), DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES)) return 'material texture properties do not match the verified Glitch_Tex state'
  const main = textures[0], noise = textures[1]
  if (!main.texture || main.texture.pathId !== '0' || main.texture.file.toLowerCase() !== material.file.toLowerCase()
    || main.textureReference !== null || main.scale?.x !== 1 || main.scale?.y !== 1 || main.offset?.x !== 0 || main.offset?.y !== 0) return 'Glitch_Tex _MainTex is not the source-authorized Unity white default binding'
  if (!noise.texture || noise.texture.pathId !== '277634516359511144' || noise.texture.file.toLowerCase() !== 'cab-39fe55e8868aab69e2cf9a8ae5dcef67'
    || referenceKey(noise.textureReference) !== '1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74:cab-39fe55e8868aab69e2cf9a8ae5dcef67:277634516359511144'
    || noise.scale?.x !== 1 || noise.scale?.y !== 1 || noise.offset?.x !== 0 || noise.offset?.y !== 0) return 'Glitch_Tex _NoiseTex does not match the verified source texture identity'
  const resolvedNoise = material.resolvedTextures?.find(item => item.property === '_NoiseTex')
  if (!resolvedNoise || resolvedNoise.width !== 256 || resolvedNoise.height !== 256
    || referenceKey(resolvedNoise.sourceReference) !== referenceKey(noise.textureReference)
    || material.resolvedTextures?.some(item => item.property !== '_NoiseTex')) return 'Glitch_Tex resolved _NoiseTex dimensions or identity are not exact'
  const expectedState = { alphaMode: 'BLEND', layer: 'transparent', depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, sourceQueue: -1, polygonOffsetFactor: 0, polygonOffsetUnits: 0 }
  if (!state || state.alphaMode !== expectedState.alphaMode || state.layer !== expectedState.layer || state.depthWrite !== expectedState.depthWrite
    || state.depthTest !== expectedState.depthTest || state.depthFunction !== expectedState.depthFunction || state.cullMode !== expectedState.cullMode
    || state.doubleSided !== expectedState.doubleSided || state.sourceQueue !== expectedState.sourceQueue
    || state.polygonOffsetFactor !== expectedState.polygonOffsetFactor || state.polygonOffsetUnits !== expectedState.polygonOffsetUnits
    || state.blend.source !== 5 || state.blend.destination !== 10 || state.blend.sourceAlpha !== 5 || state.blend.destinationAlpha !== 10
    || state.blend.operation !== 0 || state.blend.operationAlpha !== 0) return 'translated render state is not the verified Glitch_Tex state'
  return null
}

function dsfxMatcapMaterialEvidence(
  material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] },
  shader: InventoryShader | undefined,
  state: RenderingProfileMaterialSlot['renderState'] | null,
  extractionEvidence: { error: string } | { source: RenderingProfileMatcapShaderExtraction },
) {
  if ('error' in extractionEvidence) return extractionEvidence.error
  if (referenceKey(material.sourceReference) !== referenceKey(DSFX_MATCAP_MATERIAL_REFERENCE)) return 'material object identity does not match the verified CH0191 Matcap material'
  if (!exactArray(shaderPropertyNames(shader), DSFX_MATCAP_REQUIRED_PROPERTIES)) return 'shader declarations do not match the verified Matcap property set'
  if (!exactArray(material.keywords ?? [], [])) return 'shader keywords are active'
  const glsl = Object.values(extractionEvidence.source.passes).map(pass => pass.glsl).join('\n')
  for (const inert of DSFX_MATCAP_INERT_PROPERTIES) {
    if (dsfxGlslIdentifier(glsl, inert)) return `source extraction GLSL declares or consumes inert Matcap property ${inert}`
  }
  const expectedFloats: Record<string, number> = { ...DSFX_MATCAP_INERT_FLOAT_PROPERTIES, _ZWrite_Mode: 1, _Cull_Mode: 2 }
  const actualFloats = material.floatProperties ?? {}
  if (Object.keys(actualFloats).length !== Object.keys(expectedFloats).length
    || Object.entries(expectedFloats).some(([name, value]) => finiteNumber(actualFloats[name]) !== value)
    || Object.keys(material.intProperties ?? {}).length) return 'material scalar/color properties do not match the verified Matcap state'
  const expectedColors = { ...DSFX_MATCAP_INERT_COLOR_PROPERTIES, _Main_Color: {
    r: DSFX_MATCAP_MAIN_COLOR[0], g: DSFX_MATCAP_MAIN_COLOR[1], b: DSFX_MATCAP_MAIN_COLOR[2], a: DSFX_MATCAP_MAIN_COLOR[3],
  } }
  const colorMatches = (actual: unknown, expected: { r: number; g: number; b: number; a: number }) => {
    if (!actual || typeof actual !== 'object') return false
    const value = actual as Record<string, unknown>
    return (['r', 'g', 'b', 'a'] as const).every(component => Object.prototype.hasOwnProperty.call(value, component)
      && finiteNumber(value[component]) === expected[component])
  }
  const actualColors = material.colorProperties ?? {}
  if (Object.keys(actualColors).length !== Object.keys(expectedColors).length
    || Object.keys(actualColors).some(name => !Object.prototype.hasOwnProperty.call(expectedColors, name))
    || Object.entries(expectedColors).some(([name, value]) => !colorMatches(actualColors[name], value))) return 'material scalar/color properties do not match the verified Matcap state'
  const mainColor = material.colorProperties?._Main_Color
  const color = mainColor ? [mainColor.r, mainColor.g, mainColor.b, mainColor.a].map(Number) : []
  if (color.length !== 4 || !color.every(Number.isFinite) || !exactArray(color, DSFX_MATCAP_MAIN_COLOR)) return 'material _Main_Color is missing or invalid'
  const zWrite = finiteNumber(material.floatProperties?._ZWrite_Mode)
  const culling = finiteNumber(material.floatProperties?._Cull_Mode)
  if (zWrite !== 1 || culling !== 2) return 'material _ZWrite_Mode or _Cull_Mode is missing or invalid'
  const textures = material.textures ?? []
  if (textures.length !== 3 || !exactArray(textures.map(texture => texture.name), ['_Main_Tex', '_Matcap_Tex', '_texcoord'])) return 'material texture properties do not match the verified Matcap state'
  const expectedTextureReferences = { _Main_Tex: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE, _Matcap_Tex: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE } as const
  for (const [index, property] of [['_Main_Tex', true], ['_Matcap_Tex', true], ['_texcoord', false]] as const) {
    const texture = textures.find(item => item.name === index)
    if (!texture?.texture || String(texture.texture.pathId) === '0') {
      if (property) return `Matcap ${index} source texture reference is missing`
      if (texture?.textureReference !== null) return 'Matcap _texcoord default binding is not the source null pointer'
      continue
    }
    if (!property || !texture.textureReference
      || texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
      || String(texture.texture.pathId) !== texture.textureReference.objectId
      || referenceKey(texture.textureReference) !== referenceKey(expectedTextureReferences[index as '_Main_Tex' | '_Matcap_Tex'])) return `Matcap ${index} source texture identity is not exact`
    if (texture.scale?.x !== 1 || texture.scale?.y !== 1 || texture.offset?.x !== 0 || texture.offset?.y !== 0) return `Matcap ${index} texture transform is not the authored identity`
  }
  const texcoord = textures.find(texture => texture.name === '_texcoord')
  if (!texcoord || texcoord.scale?.x !== 1 || texcoord.scale?.y !== 1 || texcoord.offset?.x !== 0 || texcoord.offset?.y !== 0) return 'Matcap _texcoord transform is not the authored identity'
  const resolved = material.resolvedTextures ?? []
  if (resolved.length !== 2 || !exactArray(resolved.map(texture => texture.property), ['_Main_Tex', '_Matcap_Tex'])
    || resolved.some(texture => !texture.sourceReference || positiveInteger(texture.width) === null || positiveInteger(texture.height) === null)) return 'resolved Matcap texture identities or dimensions are incomplete'
  for (const property of DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES) {
    const source = textures.find(texture => texture.name === property)
    const resolvedTexture = resolved.find(texture => texture.property === property)
    if (!source?.textureReference || !resolvedTexture?.sourceReference || referenceKey(source.textureReference) !== referenceKey(resolvedTexture.sourceReference)
      || resolvedTexture.width !== 64 || resolvedTexture.height !== 64) return `resolved ${property} identity does not match the serialized source reference`
  }
  const expectedState = { alphaMode: 'BLEND', layer: 'transparent', depthWrite: true, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, sourceQueue: -1, polygonOffsetFactor: 0, polygonOffsetUnits: 0 }
  if (!state || state.alphaMode !== expectedState.alphaMode || state.layer !== expectedState.layer || state.depthWrite !== expectedState.depthWrite
    || state.depthTest !== expectedState.depthTest || state.depthFunction !== expectedState.depthFunction || state.cullMode !== expectedState.cullMode
    || state.doubleSided !== expectedState.doubleSided || state.sourceQueue !== expectedState.sourceQueue
    || state.polygonOffsetFactor !== expectedState.polygonOffsetFactor || state.polygonOffsetUnits !== expectedState.polygonOffsetUnits
    || state.blend.source !== 5 || state.blend.destination !== 10 || state.blend.sourceAlpha !== 5 || state.blend.destinationAlpha !== 10
    || state.blend.operation !== 0 || state.blend.operationAlpha !== 0) return 'translated render state is not the verified Matcap state'
  return null
}

function dsfxStaticPassEvidence(rule: DsfxStaticShaderAdapterRule, shader: InventoryShader | undefined) {
  if (!shader?.programBlobSha256) return 'shader program identity is missing'
  if (shader.programBlobSha256.toLowerCase() !== rule.programBlobSha256) return 'shader program identity does not match the verified BAAD version'
  if (referenceKey(shader.sourceReference) !== referenceKey(rule.sourceReference)) return 'shader source reference does not match the verified BAAD object'
  const names = shaderPropertyNames(shader)
  const expectedNames = [...rule.propertyNames]
  if (names.length !== expectedNames.length || new Set(names).size !== names.length
    || expectedNames.some(name => !names.includes(name))) {
    const missing = expectedNames.filter(name => !names.includes(name))
    const extra = names.filter(name => !expectedNames.includes(name))
    return `shader declarations do not match the verified static set${missing.length ? `; missing ${missing.join(', ')}` : ''}${extra.length ? `; unexpected ${extra.join(', ')}` : ''}`
  }
  const passes = shader.subShaders?.flatMap(subShader => subShader.passes ?? []) ?? []
  if (passes.length !== rule.passes.length) return `shader pass count is ${passes.length}, expected ${rule.passes.length}`
  for (const [index, expected] of rule.passes.entries()) {
    const pass = passes[index]
    const actualName = findState(pass?.state, ['m_Name'])
    if (actualName !== expected.name) return `shader pass ${index} is not the verified ${expected.name} pass`
    const expectedState = expected.states
    const values: Record<string, number> = {
      srcBlend: expectedState.srcBlend,
      destBlend: expectedState.destinationBlend,
      srcBlendAlpha: expectedState.sourceBlendAlpha,
      destBlendAlpha: expectedState.destinationBlendAlpha,
      blendOp: expectedState.blendOperation,
      blendOpAlpha: expectedState.blendOperationAlpha,
      zTest: expectedState.zTest,
      zWrite: expectedState.zWrite,
      culling: expectedState.culling,
      offsetFactor: expectedState.offsetFactor,
      offsetUnits: expectedState.offsetUnits,
    }
    for (const [key, value] of Object.entries(values)) {
      if (sourceStateValue(pass?.state, key) !== value) return `shader pass ${index} ${key} state is not ${value}`
    }
    if (findState(pass?.state, ['lighting']) !== expectedState.lighting) return `shader pass ${index} lighting state is not ${expectedState.lighting}`
  }
  return null
}

const DSFX_STATIC_STATE_PROPERTIES = new Set([
  '_AlphaClip', '_Blend', '_BlendOp', '_ColorMode', '_Cull', '_Cull_Mode', '_Cutoff', '_DstBlend',
  '_DstBlendAlpha', '_Main_Texture_No', '_Mode', '_Multiply', '_QueueOffset', '_RGBRGBA', '_SrcBlend',
  '_SrcBlendAlpha', '_Surface', '_ZOffsetFactor', '_ZOffsetUnits', '_ZTest', '_ZTest_Mode', '_ZWrite',
  '_ZWrite_Mode',
])

// These names are serialized on many DSFX materials even when the linked
// shader does not declare them.  A nonzero gate is still proof that the
// material is asking for a dynamic path, so it must never become static output.
const DSFX_DYNAMIC_GATE_PATTERN = /(?:custom.*(?:use|enabled|mode)$|(?:distortion|softparticles|camera.*fad(?:e|ing)|emission|lighting|flipbook|glitch|step|disappear).*(?:use|enabled|mode|blending)$)/i
const DSFX_DYNAMIC_VALUE_PATTERN = /(?:custom|distort|^_dis_|speed|power|strength|camera.*fade|softparticle|flipbook|emission|lighting|step|disappear|glitch|vertex|reflect|spec|environment|glossy|radius|intensity|time)/i

function dsfxGlslIdentifier(glsl: string, name: string) {
  return new RegExp(`\\b${name}\\b`).test(glsl)
}

function dsfxStaticSourceStateEvidence(shader: InventoryShader | undefined, forwardDestinationBlend: number, shaderLabel: string) {
  const passes = shader?.subShaders?.flatMap(subShader => subShader.passes ?? []) ?? []
  if (shader?.subShaders?.length !== 1 || passes.length !== 2) return `shader pass count is ${passes.length}, expected 2`
  const expected = [
    {
      name: 'Forward', zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 0, zTestProperty: '_ZTest_Mode',
      culling: 0, cullingProperty: '_Cull_Mode', offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor',
      offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits', sourceBlend: 1, destinationBlend: forwardDestinationBlend,
      sourceBlendAlpha: 1, destinationBlendAlpha: forwardDestinationBlend, colorMask: 15,
      tags: { LIGHTMODE: 'UniversalForward', PreviewType: 'Plane', QUEUE: 'Transparent', RenderPipeline: 'UniversalPipeline', RenderType: 'Opaque' },
    },
    {
      name: 'ShadowCaster', zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>',
      culling: 0, cullingProperty: '_Cull_Mode', offsetFactor: 0, offsetFactorProperty: '<noninit>',
      offsetUnits: 0, offsetUnitsProperty: '<noninit>', sourceBlend: 1, destinationBlend: 0,
      sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0,
      tags: { LIGHTMODE: 'SHADOWCASTER', PreviewType: 'Plane', QUEUE: 'Transparent', RenderPipeline: 'UniversalPipeline', RenderType: 'Opaque' },
    },
  ] as const
  for (const [index, source] of expected.entries()) {
    const pass = passes[index]
    const blend = sourceStateRecord(pass?.state, 'rtBlend0')
    const tagsValue = findState(pass?.state, ['m_Tags'])
    const tags = tagsValue && typeof tagsValue === 'object' && Array.isArray((tagsValue as { tags?: unknown }).tags)
      ? new Map(((tagsValue as { tags: unknown[] }).tags).filter((item): item is unknown[] => Array.isArray(item) && item.length >= 2).map(item => [String(item[0]), String(item[1])]))
      : new Map<string, string>()
    if (pass?.type !== 0 || (pass.name ?? '') !== '' || sourceStateName(pass.state, 'm_Name') !== source.name
      || sourceStateValue(pass.state, 'zWrite') !== source.zWrite || sourceStateName(pass.state, 'zWrite') !== source.zWriteProperty
      || sourceStateValue(pass.state, 'zTest') !== source.zTest || sourceStateName(pass.state, 'zTest') !== source.zTestProperty
      || sourceStateValue(pass.state, 'culling') !== source.culling || sourceStateName(pass.state, 'culling') !== source.cullingProperty
      || sourceStateValue(pass.state, 'offsetFactor') !== source.offsetFactor || sourceStateName(pass.state, 'offsetFactor') !== source.offsetFactorProperty
      || sourceStateValue(pass.state, 'offsetUnits') !== source.offsetUnits || sourceStateName(pass.state, 'offsetUnits') !== source.offsetUnitsProperty
      || !blend || sourceStateValue(blend, 'srcBlend') !== source.sourceBlend || sourceStateValue(blend, 'destBlend') !== source.destinationBlend
      || sourceStateValue(blend, 'srcBlendAlpha') !== source.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== source.destinationBlend
      || sourceStateValue(blend, 'blendOp') !== 0 || sourceStateValue(blend, 'blendOpAlpha') !== 0 || sourceStateValue(blend, 'colMask') !== source.colorMask
      || findState(pass.state, ['lighting']) !== false || tags.size !== Object.keys(source.tags).length
      || Object.entries(source.tags).some(([key, value]) => tags.get(key) !== value)) {
      return `shader ${source.name} render state or tags are not the verified ${shaderLabel} source state`
    }
  }
  return null
}

function dsfxAdditiveSourceStateEvidence(shader: InventoryShader | undefined) {
  return dsfxStaticSourceStateEvidence(shader, 1, 'Additive_0')
}

function dsfxAlphaBlendAddSourceStateEvidence(shader: InventoryShader | undefined) {
  return dsfxStaticSourceStateEvidence(shader, 10, 'AlphaBlend_Add')
}

function dsfxAdditiveShaderExtractionEvidence(shader: InventoryShader | undefined): { error: string } | { source: InventoryShaderExtraction } {
  if (!shader?.extraction) return { error: shader?.extractionError ? `source extraction failed: ${shader.extractionError}` : 'source shader extraction is missing' }
  const extraction = shader.extraction
  const sourceReference = extraction.shader?.sourceReference
  if (shader.programBlobSha256?.toLowerCase() !== DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256) {
    return { error: 'shader program identity does not match the verified Additive_0 source' }
  }
  if (referenceKey(shader.sourceReference) !== referenceKey(DSFX_ADDITIVE_0_SOURCE_REFERENCE)
    || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== DSFX_ADDITIVE_0_FINGERPRINT
    || extraction.compressedBlobSha256?.toLowerCase() !== DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256
    || referenceKey(sourceReference) !== referenceKey(DSFX_ADDITIVE_0_SOURCE_REFERENCE)
    || normalizedShaderIdentity(extraction.shader?.name) !== normalizedShaderIdentity(DSFX_ADDITIVE_0_SHADER_NAME)
    || !exactArray(extraction.shader?.keywordNames, DSFX_ADDITIVE_0_SHADER_KEYWORDS)
    || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
    return { error: 'source extraction metadata is incomplete or does not match the verified Additive_0 shader object' }
  }
  const expectedPrograms = DSFX_ADDITIVE_0_GLES3_PROGRAMS
  const gles3Programs = extraction.gles3Programs
  const allGles3Programs = extraction.programs.filter(program => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
  if (gles3Programs.length !== expectedPrograms.length || allGles3Programs.length !== expectedPrograms.length) {
    return { error: 'source extraction does not contain the complete GLES3 Additive_0 program set' }
  }
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const fullProgramFields = ['version', 'platformName', 'gpuProgramTypeName', 'sourceMap', 'offset', 'size', 'segment', 'keywords']
  const interfaceNames = (value: unknown) => Array.isArray(value)
    ? value.map(item => typeof item === 'string' ? item : item && typeof item === 'object' && 'name' in item ? String((item as { name?: unknown }).name) : '')
    : null
  for (const [index, expected] of expectedPrograms.entries()) {
    const program = gles3Programs[index]
    const complete = allGles3Programs.find(item => item.blobIndex === expected.blobIndex)
    const binding = extraction.bindings.find(item => item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex)
    const fullProgram = program as typeof program & Record<string, unknown>
    const fullComplete = complete as (typeof complete & Record<string, unknown>) | undefined
    const fullBinding = binding as typeof binding & Record<string, unknown> | undefined
    const hasFullProgramFields = fullProgramFields.some(field => fullProgram?.[field] !== undefined)
      || fullProgram?.attributes !== undefined || fullProgram?.uniforms !== undefined
    const fullProgramMatch = !hasFullProgramFields
      || fullProgram.version === expected.version && fullProgram.platformName === expected.platformName
      && fullProgram.gpuProgramTypeName === expected.gpuProgramTypeName && fullProgram.sourceMap === expected.sourceMap
      && fullProgram.offset === expected.offset && fullProgram.size === expected.size && fullProgram.segment === expected.segment
      && exactArray(fullProgram.keywords, expected.keywords)
      && (fullProgram.attributes === undefined || exactArray(interfaceNames(fullProgram.attributes), expected.programAttributes))
      && (fullProgram.uniforms === undefined || exactArray(interfaceNames(fullProgram.uniforms), expected.requiredUniforms))
    const fullCompleteMatch = !fullComplete || !hasFullProgramFields
      || fullComplete.version === expected.version && fullComplete.platformName === expected.platformName
      && fullComplete.gpuProgramTypeName === expected.gpuProgramTypeName && fullComplete.sourceMap === expected.sourceMap
      && fullComplete.offset === expected.offset && fullComplete.size === expected.size && fullComplete.segment === expected.segment
      && exactArray(fullComplete.keywords, expected.keywords)
      && (fullComplete.attributes === undefined || exactArray(interfaceNames(fullComplete.attributes), expected.programAttributes))
      && (fullComplete.uniforms === undefined || exactArray(interfaceNames(fullComplete.uniforms), expected.requiredUniforms))
    const sourceReferencesMatch = (value: unknown) => value === undefined || referenceKey(value as InventorySourceReference) === referenceKey(DSFX_ADDITIVE_0_SOURCE_REFERENCE)
    if (program?.kind !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
      || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
      || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
      || program.recordSha256 !== expected.programRecordSha256 || typeof program.glsl !== 'string'
      || program.glsl.length !== expected.programDataLength || !program.glsl.includes('#version 300 es')
      || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')
      || !complete || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programHash
      || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
      || typeof complete.glsl !== 'string' || complete.glsl.length !== expected.programDataLength
      || !fullProgramMatch || !fullCompleteMatch || !sourceReferencesMatch(fullProgram.sourceReference) || !sourceReferencesMatch(fullComplete?.sourceReference)
      || !binding || binding.subShaderIndex !== 0 || binding.passIndex !== (expected.pass === 'forward' ? 0 : 1)
      || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
      || binding.blobIndex !== expected.blobIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
      || binding.platform !== 9 || binding.gpuProgramType !== 4
      || binding.parameterRecordSha256 !== expected.parameterRecordSha256
      || binding.programHash !== expected.programHash || binding.gles3ProgramHash !== expected.programHash
      || binding.programRecordSha256 !== expected.programRecordSha256
      || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)
      || (fullBinding?.gpuProgramTypeName !== undefined && fullBinding.gpuProgramTypeName !== 'GLES3')
      || (fullBinding?.playerGroupIndex !== undefined && fullBinding.playerGroupIndex !== 3)
      || (fullBinding?.playerIndex !== undefined && fullBinding.playerIndex !== (expected.keywordNames.length ? 1 : 0))
      || (fullBinding?.subProgramIndex !== undefined && fullBinding.subProgramIndex !== (expected.keywordNames.length ? 1 : 0))
      || (fullBinding?.shaderRequirements !== undefined && fullBinding.shaderRequirements !== expected.shaderRequirements)
      || (fullBinding?.sourceReference !== undefined && !sourceReferencesMatch(fullBinding.sourceReference))) {
      return { error: `source extraction Additive_0 ${expected.pass} record ${index} does not match the verified source` }
    }
    const glsl = program.glsl
    for (const attribute of expected.requiredAttributes) {
      if (!hasGlslDeclaration(glsl, 'in', sourceAttributeName(attribute))) return { error: `source extraction Additive_0 ${expected.pass} source is missing ${attribute}` }
    }
    for (const uniform of expected.requiredUniforms) {
      if (!new RegExp(`\\b${escape(uniform)}\\b`).test(glsl)) return { error: `source extraction Additive_0 ${expected.pass} source is missing ${uniform}` }
    }
    for (const forbidden of ['_Time', 'unity_Time', 'gl_FragCoord', 'gl_FragDepth', 'gl_FragDepthEXT', 'sampler2DShadow', 'samplerCubeShadow', 'textureProj']) {
      if (dsfxGlslIdentifier(glsl, forbidden)) return { error: `source extraction Additive_0 GLSL uses forbidden dynamic/depth input ${forbidden}` }
    }
  }
  return { source: extraction }
}

function dsfxAlphaBlendAddShaderExtractionEvidence(shader: InventoryShader | undefined): { error: string } | { source: InventoryShaderExtraction } {
  if (!shader?.extraction) return { error: shader?.extractionError ? `source extraction failed: ${shader.extractionError}` : 'source shader extraction is missing' }
  const extraction = shader.extraction
  const sourceReference = extraction.shader?.sourceReference
  if (shader.programBlobSha256?.toLowerCase() !== DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256) {
    return { error: 'shader program identity does not match the verified AlphaBlend_Add source' }
  }
  if (referenceKey(shader.sourceReference) !== referenceKey(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
    || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== DSFX_ALPHA_BLEND_ADD_FINGERPRINT
    || extraction.compressedBlobSha256?.toLowerCase() !== DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256
    || referenceKey(sourceReference) !== referenceKey(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
    || normalizedShaderIdentity(extraction.shader?.name) !== normalizedShaderIdentity(DSFX_ALPHA_BLEND_ADD_SHADER_NAME)
    || !exactArray(extraction.shader?.keywordNames, DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS)
    || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
    return { error: 'source extraction metadata is incomplete or does not match the verified AlphaBlend_Add shader object' }
  }
  const expectedPrograms = DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS
  const gles3Programs = extraction.gles3Programs
  const allGles3Programs = extraction.programs.filter(program => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
  const bindings = extraction.bindings.filter(binding => binding?.platform === 9 && binding.gpuProgramType === 4)
  if (gles3Programs.length !== expectedPrograms.length || allGles3Programs.length !== expectedPrograms.length || bindings.length !== expectedPrograms.length) {
    return { error: 'source extraction does not contain the complete GLES3 AlphaBlend_Add program or binding set' }
  }
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const fullProgramFields = ['version', 'platformName', 'gpuProgramTypeName', 'sourceMap', 'offset', 'size', 'segment', 'keywords']
  const interfaceNames = (value: unknown) => Array.isArray(value)
    ? value.map(item => typeof item === 'string' ? item : item && typeof item === 'object' && 'name' in item ? String((item as { name?: unknown }).name) : '')
    : null
  for (const [index, expected] of expectedPrograms.entries()) {
    const program = gles3Programs[index]
    const complete = allGles3Programs.find(item => item.blobIndex === expected.blobIndex)
    const binding = bindings.find(item => item.blobIndex === expected.blobIndex)
    const fullProgram = program as typeof program & Record<string, unknown>
    const fullComplete = complete as (typeof complete & Record<string, unknown>) | undefined
    const fullBinding = binding as typeof binding & Record<string, unknown> | undefined
    const hasFullProgramFields = fullProgramFields.some(field => fullProgram?.[field] !== undefined)
      || fullProgram?.attributes !== undefined || fullProgram?.uniforms !== undefined
    const fullProgramMatch = !hasFullProgramFields
      || fullProgram.version === expected.version && fullProgram.platformName === expected.platformName
      && fullProgram.gpuProgramTypeName === expected.gpuProgramTypeName && fullProgram.sourceMap === expected.sourceMap
      && fullProgram.offset === expected.offset && fullProgram.size === expected.size && fullProgram.segment === expected.segment
      && exactArray(fullProgram.keywords, expected.keywords)
      && (fullProgram.attributes === undefined || exactArray(interfaceNames(fullProgram.attributes), expected.programAttributes))
      && (fullProgram.uniforms === undefined || exactArray(interfaceNames(fullProgram.uniforms), expected.requiredUniforms))
    const fullCompleteMatch = !fullComplete || !hasFullProgramFields
      || fullComplete.version === expected.version && fullComplete.platformName === expected.platformName
      && fullComplete.gpuProgramTypeName === expected.gpuProgramTypeName && fullComplete.sourceMap === expected.sourceMap
      && fullComplete.offset === expected.offset && fullComplete.size === expected.size && fullComplete.segment === expected.segment
      && exactArray(fullComplete.keywords, expected.keywords)
      && (fullComplete.attributes === undefined || exactArray(interfaceNames(fullComplete.attributes), expected.programAttributes))
      && (fullComplete.uniforms === undefined || exactArray(interfaceNames(fullComplete.uniforms), expected.requiredUniforms))
    const sourceReferencesMatch = (value: unknown) => value === undefined || referenceKey(value as InventorySourceReference) === referenceKey(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
    if (program?.kind !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
      || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
      || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
      || program.recordSha256 !== expected.programRecordSha256 || typeof program.glsl !== 'string'
      || program.glsl.length !== expected.programDataLength || !program.glsl.includes('#version 300 es')
      || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')
      || !complete || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programHash
      || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
      || typeof complete.glsl !== 'string' || complete.glsl.length !== expected.programDataLength
      || !fullProgramMatch || !fullCompleteMatch || !sourceReferencesMatch(fullProgram.sourceReference) || !sourceReferencesMatch(fullComplete?.sourceReference)
      || !binding || binding.subShaderIndex !== 0 || binding.passIndex !== (expected.pass === 'forward' ? 0 : 1)
      || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
      || binding.blobIndex !== expected.blobIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
      || binding.platform !== 9 || binding.gpuProgramType !== 4 || binding.parameterRecordSha256 !== expected.parameterRecordSha256
      || binding.programHash !== expected.programHash || binding.gles3ProgramHash !== expected.programHash
      || binding.programRecordSha256 !== expected.programRecordSha256
      || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)
      || (fullBinding?.gpuProgramTypeName !== undefined && fullBinding.gpuProgramTypeName !== expected.gpuProgramTypeName)
      || (fullBinding?.playerGroupIndex !== undefined && fullBinding.playerGroupIndex !== expected.playerGroupIndex)
      || (fullBinding?.playerIndex !== undefined && fullBinding.playerIndex !== expected.playerIndex)
      || (fullBinding?.subProgramIndex !== undefined && fullBinding.subProgramIndex !== expected.subProgramIndex)
      || (fullBinding?.shaderRequirements !== undefined && fullBinding.shaderRequirements !== expected.shaderRequirements)
      || (fullBinding?.sourceReference !== undefined && !sourceReferencesMatch(fullBinding.sourceReference))) {
      return { error: `source extraction AlphaBlend_Add ${expected.pass} record ${index} does not match the verified source` }
    }
    for (const attribute of expected.requiredAttributes) {
      if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) return { error: `source extraction AlphaBlend_Add ${expected.pass} source is missing ${attribute}` }
    }
    for (const uniform of expected.requiredUniforms) {
      if (!new RegExp(`\\b${escape(uniform)}\\b`).test(program.glsl)) return { error: `source extraction AlphaBlend_Add ${expected.pass} source is missing ${uniform}` }
    }
    for (const inert of DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES) {
      if (dsfxGlslIdentifier(program.glsl, inert)) return { error: `source extraction AlphaBlend_Add GLSL declares or consumes Wakamo inert property ${inert}` }
    }
    for (const forbidden of ['_Time', 'unity_Time', 'gl_FragCoord', 'gl_FragDepth', 'gl_FragDepthEXT', 'sampler2DShadow', 'samplerCubeShadow', 'textureProj']) {
      if (dsfxGlslIdentifier(program.glsl, forbidden)) return { error: `source extraction AlphaBlend_Add GLSL uses forbidden dynamic/depth input ${forbidden}` }
    }
  }
  return { source: extraction }
}

function dsfxStaticShaderExtractionEvidence(rule: DsfxStaticShaderAdapterRule, shader: InventoryShader | undefined): { error: string } | { source: InventoryShaderExtraction | null } {
  if (rule.identity === 'dsfx/fx_shader_additive_0') {
    const names = shaderPropertyNames(shader)
    if (!exactArray(names, DSFX_ADDITIVE_0_REQUIRED_PROPERTIES)) return { error: 'shader declarations do not match the verified Additive_0 property set' }
    const extractionEvidence = dsfxAdditiveShaderExtractionEvidence(shader)
    if ('error' in extractionEvidence) return extractionEvidence
    const stateError = dsfxAdditiveSourceStateEvidence(shader)
    return stateError ? { error: stateError } : extractionEvidence
  }
  if (rule.identity === 'dsfx/fx_shader_alphablend_add') {
    const names = shaderPropertyNames(shader)
    if (!exactArray(names, DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES)) return { error: 'shader declarations do not match the verified AlphaBlend_Add property set' }
    const extractionEvidence = dsfxAlphaBlendAddShaderExtractionEvidence(shader)
    if ('error' in extractionEvidence) return extractionEvidence
    const stateError = dsfxAlphaBlendAddSourceStateEvidence(shader)
    return stateError ? { error: stateError } : extractionEvidence
  }
  if (rule.identity !== 'dsfx/fx_shader_alphablend_0') return { source: null }
  const extraction = shader?.extraction
  if (!extraction) return { error: shader?.extractionError ? `source extraction failed: ${shader.extractionError}` : 'source shader extraction is missing' }
  const extractionReference = extraction.shader?.sourceReference
  if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || !/^2021\.3(?:\.|$)/.test(String(extraction.unityVersion ?? ''))
    || !/^[0-9a-f]{64}$/i.test(String(extraction.fingerprint ?? ''))
    || String(extraction.compressedBlobSha256 ?? '').toLowerCase() !== rule.programBlobSha256
    || !extractionReference
    || typeof extractionReference.bundleSha256 !== 'string'
    || typeof extractionReference.serializedFile !== 'string'
    || typeof extractionReference.objectId !== 'string'
    || referenceKey(extractionReference) !== referenceKey(rule.sourceReference)
    || normalizedShaderIdentity(extraction.shader?.name) !== rule.identity
    || !Array.isArray(extraction.shader?.keywordNames)
    || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs)
    || !Array.isArray(extraction.bindings)) {
    return { error: 'source extraction metadata is incomplete or does not match the verified shader object' }
  }
  const expectedPrograms = DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS
  const gles3Programs = extraction.gles3Programs
  if (gles3Programs.length !== expectedPrograms.length) return { error: `source extraction has ${gles3Programs.length} GLES3 programs, expected ${expectedPrograms.length}` }
  const allGles3Programs = extraction.programs.filter(program => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
  if (allGles3Programs.length !== expectedPrograms.length) return { error: 'source extraction does not contain the complete GLES3 program records' }
  for (const [index, expected] of expectedPrograms.entries()) {
    const program = gles3Programs[index]
    if (program?.kind !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
      || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
      || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
      || program.recordSha256 !== expected.recordSha256 || typeof program.glsl !== 'string'
      || !program.glsl.includes('#version 300 es')) {
      return { error: `source extraction GLES3 program ${index} does not match the verified source record` }
    }
    const record = allGles3Programs.find(item => item.blobIndex === expected.blobIndex)
    if (!record || record.programHash !== expected.programHash || record.programDataSha256 !== expected.programHash
      || record.programDataLength !== expected.programDataLength || record.recordSha256 !== expected.recordSha256
      || typeof record.glsl !== 'string' || !record.glsl.includes('#version 300 es')) {
      return { error: `source extraction GLES3 program ${expected.blobIndex} is not present in the complete record set` }
    }
  }
  const gles3Bindings = extraction.bindings.filter(binding => binding?.platform === 9 && binding.gpuProgramType === 4)
  if (gles3Bindings.length !== expectedPrograms.length
    || expectedPrograms.some(expected => !gles3Bindings.some(binding => binding.blobIndex === expected.blobIndex && binding.programHash === expected.programHash))) {
    return { error: 'source extraction does not contain the complete GLES3 binding set' }
  }
  const glsl = [...gles3Programs, ...allGles3Programs].map(program => program.glsl ?? '').join('\n')
  for (const required of [
    '_Texture', '_Color', '_Custom_Data_Offset_Use',
    '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_MatrixVP',
  ]) {
    if (!dsfxGlslIdentifier(glsl, required)) return { error: `source extraction GLSL is missing required ${required}` }
  }
  for (const inert of DSFX_ALPHA_BLEND_0_INERT_PROPERTIES) {
    if (dsfxGlslIdentifier(glsl, inert)) return { error: `source extraction GLSL declares or consumes inert property ${inert}` }
  }
  return { source: extraction }
}

function numericMaterialProperties(material: InventoryMaterial) {
  return new Map<string, number>([
    ...Object.entries(material.floatProperties ?? {}),
    ...Object.entries(material.intProperties ?? {}),
  ].flatMap(([name, value]) => {
    const number = finiteNumber(value)
    return number === null ? [] : [[name, number] as const]
  }))
}

function dynamicGateNames(name: string, names: readonly string[]) {
  const normalized = name.toLowerCase()
  if (normalized.includes('custom') || normalized.includes('disappear')) return names.filter(candidate => /custom|disappear/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  if (normalized.includes('distort') || normalized.startsWith('_dis_')) return names.filter(candidate => /distort|^_dis_/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  if (normalized.includes('camera') || normalized.includes('fade')) return names.filter(candidate => /camera.*fad(?:e|ing)/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  if (normalized.includes('softparticle')) return names.filter(candidate => /softparticle/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  if (normalized.includes('flipbook')) return names.filter(candidate => /flipbook/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  if (normalized.includes('emission')) return names.filter(candidate => /emission/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  if (normalized.includes('lighting')) return names.filter(candidate => /lighting/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  if (normalized.includes('step')) return names.filter(candidate => /step/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate))
  return []
}

function dsfxStaticDynamicEvidence(material: InventoryMaterial, shader: InventoryShader | undefined, inertProperties: ReadonlySet<string> = new Set()) {
  const serializedValues = [
    ...Object.entries(material.floatProperties ?? {}),
    ...Object.entries(material.intProperties ?? {}),
  ]
  for (const [name, value] of serializedValues) {
    if ((DSFX_DYNAMIC_VALUE_PATTERN.test(name) || DSFX_DYNAMIC_GATE_PATTERN.test(name)) && finiteNumber(value) === null) {
      return `${name} dynamic value is unresolved`
    }
  }
  const values = numericMaterialProperties(material)
  const names = [...values.keys()]
  const declared = new Set(shaderPropertyNames(shader))
  for (const [name, value] of values) {
    if (DSFX_STATIC_STATE_PROPERTIES.has(name)) continue
    if (inertProperties.has(name)) continue
    if (DSFX_DYNAMIC_GATE_PATTERN.test(name)) {
      if (value !== 0) return `${name} dynamic gate is active (${value})`
      continue
    }
    if (!DSFX_DYNAMIC_VALUE_PATTERN.test(name) || value === 0) continue
    const gates = dynamicGateNames(name, names)
    if (gates.length && gates.every(gate => values.get(gate) === 0)) continue
    // A few Unity material serializers retain an unused scalar such as
    // _Step_Power after the linked shader has dropped that feature.  Ignore
    // those only when the shader does not declare the value and no gate exists;
    // all other dynamic controls remain fail-closed regardless of declaration.
    if (name === '_Step_Power' && !gates.length && !declared.has(name)) continue
    return `${name} dynamic value is active (${value})`
  }
  for (const [name, color] of Object.entries(material.colorProperties ?? {})) {
    if (name === '_Color' || !DSFX_DYNAMIC_VALUE_PATTERN.test(name)) continue
    if (inertProperties.has(name)) continue
    const components = [color?.r, color?.g, color?.b, color?.a].map(finiteNumber)
    const active = components.some(value => value === null || value !== 0)
    if (!active) continue
    const gates = dynamicGateNames(name, names)
    if (gates.length && gates.every(gate => values.get(gate) === 0)) continue
    return `${name} dynamic color is active`
  }
  return null
}

function dsfxStaticTextureEvidence(material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] }) {
  const texture = material.textures.find(item => item.name === '_Texture')
  if (!texture?.texture || String(texture.texture.pathId) === '0') return 'exact _Texture reference is missing'
  if (!texture.textureReference) return 'exact _Texture source identity is missing'
  if (texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
    || String(texture.texture.pathId) !== texture.textureReference.objectId) return 'serialized _Texture pointer does not match its exact source identity'
  const resolved = material.resolvedTextures?.find(item => item.property === '_Texture')
  if (!resolved?.sourceReference || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)) {
    return 'resolved _Texture identity does not match the serialized source reference'
  }
  if (positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null) return 'resolved _Texture dimensions are missing'
  const unsupported = material.textures.filter(item => item.name !== '_Texture' && item.texture && String(item.texture.pathId) !== '0')
  if (unsupported.length) return `unsupported texture properties are bound: ${unsupported.map(item => item.name).join(', ')}`
  return null
}

function sameNumber(actual: number | null | undefined, expected: number) {
  return actual === expected
}

function dsfxStaticRenderStateVariant(rule: DsfxStaticShaderAdapterRule, state: RenderingProfileMaterialSlot['renderState'] | null): DsfxStaticRenderStateVariant | null {
  if (!state) return null
  const variants = rule.identity === 'dsfx/fx_shader_alphablend_0'
    ? DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS
    : rule.identity === 'dsfx/fx_shader_additive_0'
      ? DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS
      : rule.identity === 'dsfx/fx_shader_alphablend_add'
        ? DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS
    : { 'static-default': rule.renderState }
  const matches = (expected: {
    alphaMode: 'BLEND'; layer: 'transparent'; depthWrite: boolean; depthTest: boolean; depthFunction: string;
    cullMode: 'off' | 'front' | 'back'; doubleSided: boolean;
    blend: { source: number; destination: number; sourceAlpha: number; destinationAlpha: number; operation: number; operationAlpha: number };
    polygonOffsetFactor: number; polygonOffsetUnits: number;
  }) => {
    if (state.alphaMode !== expected.alphaMode || state.layer !== expected.layer
      || state.depthWrite !== expected.depthWrite || state.depthTest !== expected.depthTest
      || state.depthFunction !== expected.depthFunction || state.cullMode !== expected.cullMode
      || state.doubleSided !== expected.doubleSided || state.polygonOffsetFactor !== expected.polygonOffsetFactor
      || state.polygonOffsetUnits !== expected.polygonOffsetUnits) return false
    const blend = expected.blend
    return sameNumber(state.blend.source, blend.source) && sameNumber(state.blend.destination, blend.destination)
      && sameNumber(state.blend.sourceAlpha, blend.sourceAlpha) && sameNumber(state.blend.destinationAlpha, blend.destinationAlpha)
      && sameNumber(state.blend.operation, blend.operation) && sameNumber(state.blend.operationAlpha, blend.operationAlpha)
  }
  for (const [variant, expected] of Object.entries(variants)) {
    if (matches(expected)) return variant as DsfxStaticRenderStateVariant
  }
  return null
}

function dsfxStaticRenderStateEvidence(rule: DsfxStaticShaderAdapterRule, state: RenderingProfileMaterialSlot['renderState'] | null) {
  if (!state) return 'translated render state is missing'
  return dsfxStaticRenderStateVariant(rule, state) ? null : 'translated render state is not a verified static state variant'
}

function dsfxAdditiveMaterialEvidence(
  rule: DsfxStaticShaderAdapterRule,
  material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] },
  shader: InventoryShader | undefined,
  state: RenderingProfileMaterialSlot['renderState'] | null,
  extractionEvidence: { error: string } | { source: InventoryShaderExtraction },
) {
  if ('error' in extractionEvidence) return extractionEvidence.error
  if (!exactArray(material.keywords ?? [], [])) return 'shader keywords are active'
  const floats = material.floatProperties ?? {}
  const expectedFloats: Record<string, readonly number[]> = {
    _Custom_Data_Offset_Use: [0], _ZWrite_Mode: [0], _ZOffsetFactor: [0], _ZOffsetUnits: [0], _ZTest_Mode: [4], _Cull_Mode: [0, 2],
  }
  if (Object.entries(expectedFloats).some(([name, values]) => {
    const value = finiteNumber(floats[name])
    return value === null || !values.includes(value)
  })) return 'material scalar properties do not match the verified Additive_0 state'
  if (Object.keys(material.intProperties ?? {}).length) return 'material integer properties are not part of the verified Additive_0 state'
  if (!colorVector(material.colorProperties?._Color)) return 'material _Color is missing or invalid'
  const textures = material.textures ?? []
  const propertyNames = [
    ...Object.keys(floats), ...Object.keys(material.intProperties ?? {}), ...Object.keys(material.colorProperties ?? {}),
    ...textures.map(texture => texture.name),
  ]
  if (propertyNames.length !== DSFX_ADDITIVE_0_REQUIRED_PROPERTIES.length
    || new Set(propertyNames).size !== propertyNames.length
    || DSFX_ADDITIVE_0_REQUIRED_PROPERTIES.some(name => !propertyNames.includes(name))
    || textures.length !== 1 || !exactArray(textures.map(texture => texture.name), DSFX_ADDITIVE_0_REQUIRED_TEXTURE_PROPERTIES)) {
    return 'material texture properties do not match the verified Additive_0 state'
  }
  if (textures[0].scale?.x !== 1 || textures[0].scale?.y !== 1 || textures[0].offset?.x !== 0 || textures[0].offset?.y !== 0) {
    return 'material _Texture transform is not the verified Additive_0 state'
  }
  const textureError = dsfxStaticTextureEvidence(material)
  if (textureError) return textureError
  if ((material.resolvedTextures ?? []).length !== 1 || material.resolvedTextures?.[0]?.property !== '_Texture') {
    return 'resolved Additive_0 texture properties do not match the verified source state'
  }
  return dsfxStaticDynamicEvidence(material, shader) ?? dsfxStaticRenderStateEvidence(rule, state)
}

function dsfxWakamoEyeWhiteDefaultMaterialEvidence(
  rule: DsfxStaticShaderAdapterRule,
  material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] },
  shader: InventoryShader | undefined,
  state: RenderingProfileMaterialSlot['renderState'] | null,
  extractionEvidence: { error: string } | { source: InventoryShaderExtraction },
) {
  if ('error' in extractionEvidence) return extractionEvidence.error
  if (referenceKey(material.sourceReference) !== referenceKey(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE)
    || referenceKey(material.shaderReference) !== referenceKey(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
    || material.shader?.file.toLowerCase() !== DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.serializedFile.toLowerCase()
    || String(material.shader.pathId) !== DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.objectId) {
    return 'material and shader references do not match the source-proven Wakamo eye material'
  }
  const shaderProperties = (shader?.properties as { m_Props?: Record<string, unknown>[] } | undefined)?.m_Props ?? []
  const textureShaderProperty = shaderProperties.find(property => property.m_Name === '_Texture')
  const defaultTexture = textureShaderProperty?.m_DefTexture as { m_DefaultName?: unknown; m_TexDim?: unknown } | undefined
  if (defaultTexture?.m_DefaultName !== 'white' || finiteNumber(defaultTexture.m_TexDim) !== 2) {
    return 'shader _Texture property does not declare the source white 2D default'
  }
  if (material.renderQueue !== -1 || !exactArray(material.keywords ?? [], [])) return 'material queue or keywords differ from the source-proven Wakamo eye material'
  const floats = material.floatProperties ?? {}
  const expectedFloats = DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOAT_PROPERTIES
  if (Object.keys(floats).length !== Object.keys(expectedFloats).length
    || Object.entries(expectedFloats).some(([name, expected]) => finiteNumber(floats[name]) !== expected)) {
    return 'material scalars differ from the source-proven Wakamo eye material'
  }
  if (Object.keys(material.intProperties ?? {}).length) return 'material integer properties differ from the source-proven Wakamo eye material'
  const colors = material.colorProperties ?? {}
  const expectedColors = DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLOR_PROPERTIES
  if (Object.keys(colors).length !== Object.keys(expectedColors).length
    || Object.entries(expectedColors).some(([name, expected]) => {
      const color = colors[name]
      if (!color || !['r', 'g', 'b', 'a'].every(component => Object.prototype.hasOwnProperty.call(color, component))) return true
      const actual = colorVector(color)
      return !actual || !exactArray(actual, [expected.r, expected.g, expected.b, expected.a])
    })) return 'material colors differ from the source-proven Wakamo eye material'
  const textures = material.textures ?? []
  const texture = textures[0]
  if (textures.length !== 1 || texture?.name !== '_Texture' || !texture.texture
    || texture.texture.file.toLowerCase() !== DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE.serializedFile.toLowerCase()
    || String(texture.texture.pathId) !== '0' || texture.texture.externalGuid !== undefined && texture.texture.externalGuid !== null
    || texture.textureReference !== null || texture.scale?.x !== 1 || texture.scale?.y !== 1
    || texture.offset?.x !== 0 || texture.offset?.y !== 0 || (material.resolvedTextures ?? []).length !== 0) {
    return 'material _Texture is not the source-proven null pointer with identity transform'
  }
  if (dsfxStaticRenderStateVariant(rule, state) !== 'depth-tested-back-cull') return 'render state differs from the source-proven Wakamo eye material'
  return dsfxStaticDynamicEvidence(material, shader, new Set([
    ...DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES, '_Custom_Data_Offset_Use',
  ]))
    ?? dsfxStaticRenderStateEvidence(rule, state)
}

function dsfxAlphaBlendAddMaterialEvidence(
  rule: DsfxStaticShaderAdapterRule,
  material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] },
  shader: InventoryShader | undefined,
  state: RenderingProfileMaterialSlot['renderState'] | null,
  extractionEvidence: { error: string } | { source: InventoryShaderExtraction },
) {
  if ('error' in extractionEvidence) return extractionEvidence.error
  if (referenceKey(material.sourceReference) === referenceKey(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE)) {
    return dsfxWakamoEyeWhiteDefaultMaterialEvidence(rule, material, shader, state, extractionEvidence)
  }
  if (!exactArray(material.keywords ?? [], [])) return 'shader keywords are active'
  const floats = material.floatProperties ?? {}
  const expectedFloats: Record<string, readonly number[]> = {
    _Custom_Data_Offset_Use: [0], _ZWrite_Mode: [0], _ZOffsetFactor: [0], _ZOffsetUnits: [0], _ZTest_Mode: [4],
    _Cull_Mode: [0, 2], _RGBRGBA: [0], _Main_Texture_No: [0],
  }
  if (Object.entries(expectedFloats).some(([name, values]) => {
    const value = finiteNumber(floats[name])
    return value === null || !values.includes(value)
  }) || finiteNumber(floats._Multiply) === null) return 'material scalar properties do not match the verified AlphaBlend_Add state'
  if (Object.keys(material.intProperties ?? {}).length) return 'material integer properties are not part of the verified AlphaBlend_Add state'
  if (!colorVector(material.colorProperties?._Color)) return 'material _Color is missing or invalid'
  const textures = material.textures ?? []
  const propertyNames = [
    ...Object.keys(floats), ...Object.keys(material.intProperties ?? {}), ...Object.keys(material.colorProperties ?? {}),
    ...textures.map(texture => texture.name),
  ]
  if (propertyNames.length !== DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES.length
    || new Set(propertyNames).size !== propertyNames.length
    || DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES.some(name => !propertyNames.includes(name))
    || textures.length !== 1 || !exactArray(textures.map(texture => texture.name), DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES)) {
    return 'material texture properties do not match the verified AlphaBlend_Add state'
  }
  if (textures[0].scale?.x !== 1 || textures[0].scale?.y !== 1 || textures[0].offset?.x !== 0 || textures[0].offset?.y !== 0) {
    return 'material _Texture transform is not the verified AlphaBlend_Add state'
  }
  if (state?.sourceQueue !== 3000) return 'material queue is not the verified AlphaBlend_Add state'
  const textureError = dsfxStaticTextureEvidence(material)
  if (textureError) return textureError
  if ((material.resolvedTextures ?? []).length !== 1 || material.resolvedTextures?.[0]?.property !== '_Texture') {
    return 'resolved AlphaBlend_Add texture properties do not match the verified source state'
  }
  return dsfxStaticDynamicEvidence(material, shader) ?? dsfxStaticRenderStateEvidence(rule, state)
}

function dsfxStaticMaterialEvidence(rule: DsfxStaticShaderAdapterRule, material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] }, shader: InventoryShader | undefined, state: RenderingProfileMaterialSlot['renderState'] | null, extractionEvidence = dsfxStaticShaderExtractionEvidence(rule, shader)) {
  if ('error' in extractionEvidence) return extractionEvidence.error
  if (rule.identity === 'dsfx/fx_shader_additive_0') return dsfxAdditiveMaterialEvidence(rule, material, shader, state, extractionEvidence as { source: InventoryShaderExtraction })
  if (rule.identity === 'dsfx/fx_shader_alphablend_add') return dsfxAlphaBlendAddMaterialEvidence(rule, material, shader, state, extractionEvidence as { source: InventoryShaderExtraction })
  const inertProperties = extractionEvidence.source ? DSFX_ALPHA_BLEND_0_INERT_PROPERTIES : undefined
  return dsfxStaticPassEvidence(rule, shader) ?? dsfxStaticTextureEvidence(material)
    ?? (material.keywords.length ? `shader keywords are active: ${material.keywords.join(', ')}` : null)
    ?? dsfxStaticDynamicEvidence(material, shader, inertProperties)
    ?? dsfxStaticRenderStateEvidence(rule, state)
}

function sourceStateValue(pass: unknown, key: string) {
  const value = findState(pass, [key])
  if (value && typeof value === 'object' && 'val' in value) return finiteNumber((value as { val?: unknown }).val)
  return finiteNumber(value)
}

function sourceStateName(pass: unknown, key: string) {
  const value = findState(pass, [key])
  if (typeof value === 'string') return value
  return value && typeof value === 'object' && 'name' in value ? String((value as { name?: unknown }).name ?? '') : null
}

function sourceStateRecord(pass: unknown, key: string) {
  const value = findState(pass, [key])
  return value && typeof value === 'object' ? value as { [key: string]: unknown } : null
}

function eStandardSourceStateEvidence(pass: { type?: number; name?: string; state?: unknown }, expected: typeof MX_E_STANDARD_PASS_SPECS[keyof typeof MX_E_STANDARD_PASS_SPECS]) {
  if (pass.type !== 0 || (pass.name ?? '') !== '' || sourceStateName(pass.state, 'm_Name') !== expected.stateName) {
    return 'pass type/name/state identity does not match the verified E-Standard source'
  }
  const state = expected.renderState
  const values: Record<string, number> = {
    zWrite: state.zWrite, zTest: state.zTest, culling: state.culling, offsetFactor: state.offsetFactor, offsetUnits: state.offsetUnits,
    blendOp: state.blendOperation, blendOpAlpha: state.blendOperationAlpha,
  }
  for (const [key, value] of Object.entries(values)) {
    if (sourceStateValue(pass.state, key) !== value) return `${expected.stateName} ${key} state is not ${value}`
  }
  const blend = sourceStateRecord(pass.state, 'rtBlend0')
  if (!blend || sourceStateValue(blend, 'srcBlend') !== state.sourceBlend || sourceStateValue(blend, 'destBlend') !== state.destinationBlend
    || sourceStateValue(blend, 'srcBlendAlpha') !== state.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== state.destinationBlendAlpha
    || sourceStateValue(blend, 'blendOp') !== state.blendOperation || sourceStateValue(blend, 'blendOpAlpha') !== state.blendOperationAlpha
    || sourceStateValue(blend, 'colMask') !== state.colorMask) return `${expected.stateName} blend state is not the verified source state`
  const nameChecks: [string, string | null][] = [
    ['zWrite', state.zWriteProperty], ['zTest', state.zTestProperty], ['culling', state.cullingProperty],
    ['offsetFactor', state.offsetFactorProperty], ['offsetUnits', state.offsetUnitsProperty],
  ]
  for (const [key, name] of nameChecks) {
    if (sourceStateName(pass.state, key) !== name) return `${expected.stateName} ${key} source property is not ${name}`
  }
  const blendNameChecks: [string, string | null][] = [
    ['srcBlend', state.sourceBlendProperty], ['destBlend', state.destinationBlendProperty],
    ['srcBlendAlpha', state.sourceBlendAlphaProperty], ['destBlendAlpha', state.destinationBlendAlphaProperty],
  ]
  for (const [key, name] of blendNameChecks) {
    if (sourceStateName(blend, key) !== name) return `${expected.stateName} ${key} source property is not ${name}`
  }
  const tagsValue = findState(pass.state, ['m_Tags'])
  const tags = tagsValue && typeof tagsValue === 'object' && Array.isArray((tagsValue as { tags?: unknown }).tags)
    ? new Map(((tagsValue as { tags: unknown[] }).tags).filter((item): item is unknown[] => Array.isArray(item) && item.length >= 2).map(item => [String(item[0]), String(item[1])]))
    : new Map<string, string>()
  const expectedTags: Record<string, string> = {
    IGNOREPROJECTOR: 'true', RenderPipeline: 'UniversalPipeline', RenderType: 'Opaque',
    LIGHTMODE: expected.stateName === 'ForwardLit' ? 'UniversalForward' : expected.stateName.toUpperCase(),
  }
  if (expected.stateName === 'ShadowCaster') expectedTags.LIGHTMODE = 'SHADOWCASTER'
  if (expected.stateName === 'DepthOnly') expectedTags.LIGHTMODE = 'DepthOnly'
  if (expected.stateName === 'Meta') expectedTags.LIGHTMODE = 'META'
  if (Object.keys(expectedTags).some(key => tags.get(key) !== expectedTags[key])) return `${expected.stateName} tags do not match the verified source`
  if (findState(pass.state, ['lighting']) !== false) return `${expected.stateName} lighting state is not false`
  return null
}

function eStandardShaderStructureEvidence(shader: InventoryShader | undefined) {
  const passes = shader?.subShaders?.flatMap(subShader => subShader.passes ?? []) ?? []
  if (shader?.subShaders?.length !== 1 || passes.length !== 4) return `shader pass count is ${passes.length}, expected 4`
  // ForwardLit has two extracted keyword variants but is one serialized source
  // pass.  Validate the four source passes once, then validate both variants
  // independently from their GLES3 extraction records.
  for (const [index, key] of (['forwardStatic', 'shadow', 'depth', 'meta'] as const).entries()) {
    const error = eStandardSourceStateEvidence(passes[index], MX_E_STANDARD_PASS_SPECS[key])
    if (error) return `shader pass ${index} ${error}`
  }
  return null
}

function customShaderEvidence(rule: CustomShaderAdapterRule, shader: InventoryShader | undefined) {
  if (!shader?.programBlobSha256) return 'shader program identity is missing'
  if (shader.programBlobSha256.toLowerCase() !== rule.programBlobSha256) return 'shader program identity does not match the verified BAAD version'
  if (referenceKey(shader.sourceReference) !== referenceKey(rule.sourceReference)) return 'shader source reference does not match the verified BAAD object'
  const declaredPropertyNames = ((shader.properties as { m_Props?: Record<string, unknown>[] } | undefined)?.m_Props ?? [])
    .map(property => property.m_Name).filter((name): name is string => typeof name === 'string')
  const propertyNames = new Set(declaredPropertyNames)
  const missingProperties = rule.requiredProperties.filter(property => !propertyNames.has(property))
  if (rule.id === 'projectmx-weapon-test1-damage') {
    const unexpectedProperties = [...propertyNames].filter(property => !rule.requiredProperties.includes(property))
    if (declaredPropertyNames.length !== rule.requiredProperties.length || propertyNames.size !== rule.requiredProperties.length
      || missingProperties.length || unexpectedProperties.length) {
      return `shader declarations do not match the verified ProjectMX set${missingProperties.length ? `; missing ${missingProperties.join(', ')}` : ''}${unexpectedProperties.length ? `; unexpected ${unexpectedProperties.join(', ')}` : ''}`
    }
  } else if (missingProperties.length) return `shader declarations are missing ${missingProperties.join(', ')}`
  if (rule.id === 'mx-e-standard') {
    const names = [...new Set(declaredPropertyNames)]
    if (declaredPropertyNames.length !== rule.requiredProperties.length || names.length !== rule.requiredProperties.length
      || rule.requiredProperties.some(property => !names.includes(property)) || names.some(property => !rule.requiredProperties.includes(property))) {
      return 'shader declarations do not match the verified E-Standard set'
    }
    return eStandardShaderStructureEvidence(shader)
  }
  if (rule.id === 'projectmx-weapon-test1-damage') {
    const allPasses = shader.subShaders?.flatMap(subShader => subShader.passes ?? []) ?? []
    if (allPasses.length !== rule.passSignature[0]?.states.length || allPasses.some(pass => pass.type !== rule.passSignature[0]?.type)) {
      return `shader pass count is ${allPasses.length}, expected ${rule.passSignature[0]?.states.length}`
    }
  }
  const passes = shader.subShaders?.flatMap(subShader => subShader.passes ?? []).filter(pass => pass.type === rule.passSignature[0]?.type)
  if (passes?.length !== rule.passSignature[0]?.states.length) return `shader pass count is ${passes?.length ?? 0}, expected ${rule.passSignature[0]?.states.length}`
  const expectedStates = rule.passSignature[0]?.states ?? []
  for (const [index, expected] of expectedStates.entries()) {
    const pass = passes?.[index]
    for (const [key, value] of Object.entries(expected)) {
      if (sourceStateValue(pass?.state, key) !== value) return `shader pass ${index} ${key} state is not ${value}`
    }
    if (rule.id === 'projectmx-weapon-test1-damage') {
      const expectedNames = ['ForwardLit', 'Outline', 'Solid Color Outline', 'ShadowCaster', 'DepthOnly']
      if (findState(pass?.state, ['m_Name']) !== expectedNames[index]) return `shader pass ${index} is not the verified ${expectedNames[index]} pass`
      const expectedColorMask = index === 4 ? 0 : 15
      for (const [key, value] of Object.entries({
        srcBlend: 1, destBlend: 0, srcBlendAlpha: 1, destBlendAlpha: 0,
        blendOp: 0, blendOpAlpha: 0, colMask: expectedColorMask, offsetFactor: 0, offsetUnits: 0,
      })) {
        if (sourceStateValue(pass?.state, key) !== value) return `shader pass ${index} ${key} state is not ${value}`
      }
      if (findState(pass?.state, ['lighting']) !== false) return `shader pass ${index} lighting state is not false`
    }
  }
  return null
}

function hasGlslDeclaration(source: string, kind: 'in' | 'uniform', name: string) {
  // The extracted GLES3 source uses both plain declarations and std140 blocks.
  // Matching a complete identifier prevents a similarly named uniform from
  // satisfying an exact source contract.
  return new RegExp(`\\b${kind}\\b[\\s\\S]*?\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(source)
}

function sourceAttributeName(attribute: string) {
  return attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
      : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1'
        : attribute === 'TEXCOORD_2' ? 'in_TEXCOORD2'
      : attribute === 'TANGENT' ? 'in_TANGENT0'
        : attribute === 'COLOR_0' ? 'in_COLOR0'
          : attribute === 'NORMAL' ? 'in_NORMAL0' : `in_${attribute}`
}

function outlineExtractionPass(
  extraction: InventoryShaderExtraction,
  pass: 'base' | 'outline',
  stateName: 'ForwardLit' | 'Outline',
  blobIndex: number,
  programHash: string,
  requiredAttributes: readonly string[],
  requiredUniforms: readonly string[],
): { error: string } | { source: RenderingProfileShaderPass } {
  if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs)) {
    return { error: `${pass} pass extraction records are missing` }
  }
  const bindings = extraction.bindings.filter(binding => binding.platform === 9
    && binding.gpuProgramType === 4 && binding.stage === 'vertex'
    && binding.subShaderIndex === 0 && binding.stateName === stateName
    && binding.blobIndex === blobIndex)
  if (bindings.length !== 1) return { error: `${pass} pass has ${bindings.length} exact GLES3 no-keyword bindings; expected one` }
  const binding = bindings[0]
  if (binding.keywordNames.length !== 0 || binding.keywordIndices.length !== 0) {
    return { error: `${pass} pass selects shader keywords instead of the verified no-keyword variant` }
  }
  const programs = extraction.gles3Programs.filter(program => program.kind === 'program'
    && program.platform === 9 && program.gpuProgramType === 4 && program.blobIndex === blobIndex)
  if (programs.length !== 1) return { error: `${pass} pass has ${programs.length} exact GLES3 program records; expected one` }
  const program = programs[0]
  if (program.programHash !== programHash || program.programDataSha256 !== programHash
    || binding.programHash !== programHash || binding.gles3ProgramHash !== programHash) {
    return { error: `${pass} pass program hash does not match the verified source program` }
  }
  if (typeof program.programDataLength !== 'number' || !Number.isInteger(program.programDataLength) || program.programDataLength <= 0) {
    return { error: `${pass} pass has no exact source program length` }
  }
  if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')) return { error: `${pass} pass has no canonical GLES3 GLSL source` }
  for (const attribute of requiredAttributes) {
    if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) {
      return { error: `${pass} pass GLSL is missing required ${attribute} input semantics` }
    }
  }
  for (const uniform of requiredUniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(program.glsl)) {
      return { error: `${pass} pass GLSL is missing required ${uniform} uniform` }
    }
  }
  if (typeof binding.programRecordSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(binding.programRecordSha256)
    || binding.programRecordSha256 !== program.recordSha256) {
    return { error: `${pass} pass has no exact program-record fingerprint` }
  }
  if (typeof binding.parameterBlobIndex !== 'number' || !Number.isInteger(binding.parameterBlobIndex)
    || typeof binding.parameterRecordSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(binding.parameterRecordSha256)) {
    return { error: `${pass} pass has no exact parameter-record fingerprint` }
  }
  const source: RenderingProfileShaderPass = {
    pass, stateName, subShaderIndex: binding.subShaderIndex, passIndex: binding.passIndex,
    stage: 'vertex', platform: binding.platform, gpuProgramType: binding.gpuProgramType, blobIndex: binding.blobIndex,
    parameterBlobIndex: binding.parameterBlobIndex,
    parameterRecordSha256: binding.parameterRecordSha256,
    keywordIndices: [...binding.keywordIndices], keywordNames: [...binding.keywordNames],
    programHash, programDataSha256: program.programDataSha256, programRecordSha256: binding.programRecordSha256, glsl: program.glsl,
    requiredAttributes: [...requiredAttributes], requiredUniforms: [...requiredUniforms],
    renderState: pass === 'base'
      ? { zWrite: 1, zTest: 4, culling: 0 }
      : { zWrite: 1, zTest: 4, culling: 1 },
  }
  return { source }
}

function outlineShaderExtractionEvidence(shader: InventoryShader | undefined): { error: string } | { source: RenderingProfileShaderExtraction } {
  const extraction = shader?.extraction
  if (!extraction) return { error: shader?.extractionError ?? 'source shader extraction is missing' }
  if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1) return { error: 'source shader extractor version is not the verified version' }
  if (!/^[0-9a-f]{64}$/i.test(extraction.fingerprint)) return { error: 'source shader extraction fingerprint is missing or malformed' }
  if (!/^[0-9a-f]{64}$/i.test(extraction.compressedBlobSha256)
    || extraction.compressedBlobSha256.toLowerCase() !== MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256) {
    return { error: 'source shader extraction compressed-blob identity is not the verified version' }
  }
  if (!extraction.shader?.sourceReference || !shader.sourceReference
    || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)) {
    return { error: 'source shader extraction reference differs from the Shader object' }
  }
  if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'mx/unlitoutline') {
    return { error: 'source shader extraction identity is not MX/Unlit Outline' }
  }
  const base = outlineExtractionPass(extraction, 'base', 'ForwardLit', 1, MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, MX_UNLIT_OUTLINE_BASE_ATTRIBUTES, MX_UNLIT_OUTLINE_BASE_UNIFORMS)
  if ('error' in base) return base
  const outline = outlineExtractionPass(extraction, 'outline', 'Outline', 6, MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, MX_UNLIT_OUTLINE_OUTLINE_ATTRIBUTES, MX_UNLIT_OUTLINE_OUTLINE_UNIFORMS)
  if ('error' in outline) return outline
  return {
    source: {
      schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion,
      unityVersion: extraction.unityVersion, fingerprint: extraction.fingerprint,
      sourceReference: extraction.shader.sourceReference,
      compressedBlobSha256: extraction.compressedBlobSha256,
      passes: { base: base.source, outline: outline.source },
    } satisfies RenderingProfileShaderExtraction,
  }
}

function transparentExtractionPass(
  extraction: InventoryShaderExtraction,
  pass: 'forward' | 'dither' | 'depth',
  stateName: 'ForwardLit' | '',
  passIndex: number,
  blobIndex: number,
  parameterBlobIndex: number,
  parameterRecordSha256: string,
  programHash: string,
  programRecordSha256: string,
  keywords: readonly string[],
  keywordIndices: readonly number[],
  requiredAttributes: readonly string[],
  requiredUniforms: readonly string[],
  renderState: RenderingProfileTransparentShaderPass['renderState'],
): { error: string } | { source: RenderingProfileTransparentShaderPass } {
  if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs)) {
    return { error: `${pass} pass extraction records are missing` }
  }
  const bindings = extraction.bindings.filter(binding => binding.platform === 9
    && binding.gpuProgramType === 4 && binding.stage === 'vertex'
    && binding.subShaderIndex === 0 && (binding.stateName ?? '') === stateName
    && binding.passIndex === passIndex && binding.blobIndex === blobIndex)
  if (bindings.length !== 1) return { error: `${pass} pass has ${bindings.length} exact GLES3 bindings; expected one` }
  const binding = bindings[0]
  if (binding.parameterBlobIndex !== parameterBlobIndex
    || binding.parameterRecordSha256 !== parameterRecordSha256
    || binding.programHash !== programHash || binding.gles3ProgramHash !== programHash
    || !Array.isArray(binding.keywordIndices) || !Array.isArray(binding.keywordNames)
    || binding.keywordIndices.length !== keywordIndices.length || binding.keywordNames.length !== keywords.length
    || binding.keywordIndices.some((value, index) => value !== keywordIndices[index])
    || binding.keywordNames.some((value, index) => value !== keywords[index])) {
    return { error: `${pass} pass keyword, parameter, or binding program identity does not match the verified source` }
  }
  const programs = extraction.gles3Programs.filter(program => program.kind === 'program'
    && program.platform === 9 && program.gpuProgramType === 4 && program.blobIndex === blobIndex)
  if (programs.length !== 1) return { error: `${pass} pass has ${programs.length} exact GLES3 program records; expected one` }
  const program = programs[0]
  if (program.programHash !== programHash || program.programDataSha256 !== programHash
    || program.recordSha256 !== programRecordSha256) {
    return { error: `${pass} pass program hash does not match the verified source` }
  }
  if (typeof program.programDataLength !== 'number' || !Number.isInteger(program.programDataLength) || program.programDataLength <= 0) {
    return { error: `${pass} pass has no exact source program length` }
  }
  if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')
    || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
    return { error: `${pass} pass has no canonical GLES3 GLSL source` }
  }
  for (const attribute of requiredAttributes) {
    if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) {
      return { error: `${pass} pass GLSL is missing required ${attribute} input semantics` }
    }
  }
  for (const uniform of requiredUniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`).test(program.glsl)) {
      return { error: `${pass} pass GLSL is missing required ${uniform} uniform` }
    }
  }
  if (typeof binding.programRecordSha256 !== 'string' || binding.programRecordSha256 !== programRecordSha256
    || typeof binding.parameterRecordSha256 !== 'string' || binding.parameterRecordSha256 !== parameterRecordSha256) {
    return { error: `${pass} pass has no exact program or parameter-record fingerprint` }
  }
  return {
    source: {
      pass, stateName, subShaderIndex: binding.subShaderIndex, passIndex, stage: 'vertex',
      platform: binding.platform, gpuProgramType: binding.gpuProgramType, blobIndex,
      parameterBlobIndex, parameterRecordSha256,
      keywordIndices: [...keywordIndices], keywordNames: [...keywords], programHash,
      programDataSha256: program.programDataSha256!, programRecordSha256, glsl: program.glsl,
      requiredAttributes: [...requiredAttributes], requiredUniforms: [...requiredUniforms], renderState,
    },
  }
}

function transparentShaderExtractionEvidence(shader: InventoryShader | undefined): { error: string } | { source: RenderingProfileTransparentShaderExtraction } {
  const extraction = shader?.extraction
  if (!extraction) return { error: shader?.extractionError ?? 'source shader extraction is missing' }
  if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1) return { error: 'source shader extractor version is not the verified version' }
  if (extraction.fingerprint.toLowerCase() !== MX_C_TRANSPARENT_ST_FINGERPRINT) return { error: 'source shader extraction fingerprint is not the verified BAAD version' }
  if (extraction.compressedBlobSha256.toLowerCase() !== MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256) return { error: 'source shader extraction compressed-blob identity is not the verified version' }
  if (!extraction.shader?.sourceReference || !shader.sourceReference
    || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)
    || referenceKey(extraction.shader.sourceReference) !== referenceKey(MX_C_TRANSPARENT_ST_SOURCE_REFERENCE)) {
    return { error: 'source shader extraction reference differs from the verified Shader object' }
  }
  if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'mx/c-transparent-st') {
    return { error: 'source shader extraction identity is not MX/C-Transparent-ST' }
  }
  const forward = transparentExtractionPass(extraction, 'forward', 'ForwardLit', 0, 6, 0,
    MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256, MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH,
    MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256, [], [], MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES,
    MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS, {
      zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
      sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 1, destinationBlendAlpha: 10,
      blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
    })
  if ('error' in forward) return forward
  const dither = transparentExtractionPass(extraction, 'dither', 'ForwardLit', 0, 8, 1,
    MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256, MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH,
    MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256, ['_DITHER_HORIZONTAL_LINES'], [9],
    MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, MX_C_TRANSPARENT_ST_DITHER_UNIFORMS, {
      zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
      sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 1, destinationBlendAlpha: 10,
      blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
    })
  if ('error' in dither) return dither
  const depth = transparentExtractionPass(extraction, 'depth', '', 1, 31, 30,
    MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256, MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH,
    MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256, [], [], MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES,
    MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS, {
      zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
      sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0,
      blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true,
    })
  if ('error' in depth) return depth
  return {
    source: {
      schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion,
      unityVersion: extraction.unityVersion, fingerprint: extraction.fingerprint,
      sourceReference: extraction.shader.sourceReference, compressedBlobSha256: extraction.compressedBlobSha256,
      passes: { forward: forward.source, dither: dither.source, depth: depth.source },
    },
  }
}

type ProjectMxWeaponPassKey = keyof typeof PROJECTMX_WEAPON_PASS_SPECS

function exactArray(actual: unknown, expected: readonly unknown[]) {
  return Array.isArray(actual) && actual.length === expected.length
    && actual.every((value, index) => value === expected[index])
}

function projectMxExtractionPass(
  extraction: InventoryShaderExtraction,
  pass: ProjectMxWeaponPassKey,
): { error: string } | { source: RenderingProfileProjectMxShaderPass } {
  const spec = PROJECTMX_WEAPON_PASS_SPECS[pass]
  if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs)) {
    return { error: `${pass} pass extraction records are missing` }
  }
  const bindings = extraction.bindings.filter(binding => binding.platform === 9
    && binding.gpuProgramType === 4 && binding.stage === 'vertex'
    && binding.subShaderIndex === 0 && binding.passIndex === spec.passIndex
    && binding.passName === ''
    && binding.stateName === spec.stateName && binding.blobIndex === spec.blobIndex
    && exactArray(binding.keywordIndices, spec.keywordIndices)
    && exactArray(binding.keywordNames, spec.keywordNames))
  if (bindings.length !== 1) return { error: `${pass} pass has ${bindings.length} exact GLES3 source bindings; expected one` }
  const binding = bindings[0]
  if (binding.parameterBlobIndex !== spec.parameterBlobIndex
    || binding.parameterRecordSha256 !== spec.parameterRecordSha256
    || binding.programHash !== spec.programHash
    || binding.gles3ProgramHash !== spec.programHash
    || binding.programRecordSha256 !== spec.programRecordSha256) {
    return { error: `${pass} pass binding does not match the verified source record` }
  }
  const programs = extraction.gles3Programs.filter(program => program.kind === 'program'
    && program.platform === 9 && program.gpuProgramType === 4 && program.blobIndex === spec.blobIndex)
  if (programs.length !== 1) return { error: `${pass} pass has ${programs.length} exact GLES3 program records; expected one` }
  const program = programs[0]
  if (program.programHash !== spec.programHash || program.programDataSha256 !== spec.programHash
    || program.recordSha256 !== spec.programRecordSha256 || program.programDataLength !== spec.programDataLength) {
    return { error: `${pass} pass program record does not match the verified source` }
  }
  if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')
    || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
    return { error: `${pass} pass has no canonical GLES3 GLSL source` }
  }
  // None of the currently authored static variants consumes the damage-noise
  // sampler.  Keep this derived fact in the compact profile and reject a
  // changed source record instead of silently accepting a missing _NoiseTex.
  const usesNoiseTexture = /\b_NoiseTex\b/.test(program.glsl)
  if (usesNoiseTexture) return { error: `${pass} pass unexpectedly consumes _NoiseTex` }
  for (const attribute of spec.requiredAttributes) {
    if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) {
      return { error: `${pass} pass GLSL is missing required ${attribute} input semantics` }
    }
  }
  for (const uniform of spec.requiredUniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`).test(program.glsl)) {
      return { error: `${pass} pass GLSL is missing required ${uniform} uniform` }
    }
  }
  const source: RenderingProfileProjectMxShaderPass = {
    pass, stateName: spec.stateName, subShaderIndex: binding.subShaderIndex, passIndex: spec.passIndex,
    stage: 'vertex', platform: binding.platform, gpuProgramType: binding.gpuProgramType,
    blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex,
    parameterRecordSha256: spec.parameterRecordSha256,
    keywordIndices: [...spec.keywordIndices], keywordNames: [...spec.keywordNames],
    programHash: spec.programHash, programDataSha256: spec.programHash,
    programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256,
    usesNoiseTexture, glsl: program.glsl,
    requiredAttributes: [...spec.requiredAttributes], requiredUniforms: [...spec.requiredUniforms],
    renderState: { ...spec.renderState },
  }
  return { source }
}

function projectMxShaderExtractionEvidence(shader: InventoryShader | undefined, activeVariant: 'forward' | 'glow'):
  { error: string } | { source: RenderingProfileProjectMxShaderExtraction } {
  const extraction = shader?.extraction
  if (!extraction) return { error: shader?.extractionError ?? 'source shader extraction is missing' }
  if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1) return { error: 'source shader extractor version is not the verified version' }
  if (extraction.unityVersion !== '2021.3') return { error: 'source shader extraction Unity version is not the verified version' }
  if (typeof extraction.fingerprint !== 'string' || extraction.fingerprint.toLowerCase() !== PROJECTMX_WEAPON_FINGERPRINT) return { error: 'source shader extraction fingerprint is not the verified ProjectMX version' }
  if (typeof extraction.compressedBlobSha256 !== 'string' || extraction.compressedBlobSha256.toLowerCase() !== PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256) return { error: 'source shader extraction compressed-blob identity is not the verified ProjectMX version' }
  if (!extraction.shader?.sourceReference || !shader.sourceReference
    || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)
    || referenceKey(extraction.shader.sourceReference) !== referenceKey(PROJECTMX_WEAPON_SOURCE_REFERENCE)) {
    return { error: 'source shader extraction reference differs from the verified ProjectMX Shader object' }
  }
  if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'projectmx/weapontest1damage') {
    return { error: 'source shader extraction identity is not ProjectMX/WeaponTest1Damage' }
  }
  if (!exactArray(extraction.shader.keywordNames, PROJECTMX_WEAPON_SHADER_KEYWORDS)) {
    return { error: 'source shader extraction keyword declarations are not the verified ProjectMX set' }
  }
  const forward = projectMxExtractionPass(extraction, 'forward')
  if ('error' in forward) return forward
  const glow = projectMxExtractionPass(extraction, 'glow')
  if ('error' in glow) return glow
  const outline = projectMxExtractionPass(extraction, 'outline')
  if ('error' in outline) return outline
  const solidOutline = projectMxExtractionPass(extraction, 'solidOutline')
  if ('error' in solidOutline) return solidOutline
  const shadow = projectMxExtractionPass(extraction, 'shadow')
  if ('error' in shadow) return shadow
  const depth = projectMxExtractionPass(extraction, 'depth')
  if ('error' in depth) return depth
  return {
    source: {
      schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion,
      unityVersion: extraction.unityVersion, fingerprint: extraction.fingerprint,
      sourceReference: extraction.shader.sourceReference,
      compressedBlobSha256: extraction.compressedBlobSha256,
      shaderName: extraction.shader.name,
      shaderKeywordNames: [...extraction.shader.keywordNames],
      activeVariant,
      activeKeywordNames: [...(activeVariant === 'glow' ? PROJECTMX_WEAPON_PASS_SPECS.glow.keywordNames : PROJECTMX_WEAPON_PASS_SPECS.forward.keywordNames)],
      requiredProperties: [...PROJECTMX_WEAPON_REQUIRED_PROPERTIES],
      requiredTextureProperties: ['_mainTex', '_sourceTex'],
      passes: {
        forward: forward.source, glow: glow.source, outline: outline.source,
        solidOutline: solidOutline.source, shadow: shadow.source, depth: depth.source,
      },
    },
  }
}

type EStandardPassKey = keyof typeof MX_E_STANDARD_PASS_SPECS

function eStandardExtractionPass(
  extraction: InventoryShaderExtraction,
  pass: EStandardPassKey,
): { error: string } | { source: RenderingProfileEStandardShaderPass } {
  const spec = MX_E_STANDARD_PASS_SPECS[pass]
  if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs)) return { error: `${pass} pass extraction records are missing` }
  const bindings = extraction.bindings.filter(binding => binding.platform === 9 && binding.gpuProgramType === 4
    && binding.stage === 'vertex' && binding.subShaderIndex === 0 && binding.passIndex === spec.passIndex
    && (binding.passName ?? '') === spec.passName && binding.stateName === spec.stateName
    && binding.blobIndex === spec.blobIndex && exactArray(binding.keywordIndices, spec.keywordIndices)
    && exactArray(binding.keywordNames, spec.keywordNames))
  if (bindings.length !== 1) return { error: `${pass} pass has ${bindings.length} exact GLES3 source bindings; expected one` }
  const binding = bindings[0]
  if (binding.parameterBlobIndex !== spec.parameterBlobIndex || binding.parameterRecordSha256 !== spec.parameterRecordSha256
    || binding.programHash !== spec.programHash || binding.gles3ProgramHash !== spec.programHash
    || binding.programRecordSha256 !== spec.programRecordSha256) return { error: `${pass} pass binding does not match the verified source record` }
  const programs = extraction.gles3Programs.filter(program => program.kind === 'program' && program.platform === 9
    && program.gpuProgramType === 4 && program.blobIndex === spec.blobIndex)
  if (programs.length !== 1) return { error: `${pass} pass has ${programs.length} exact GLES3 program records; expected one` }
  const program = programs[0]
  if (program.programHash !== spec.programHash || program.programDataSha256 !== spec.programHash
    || program.recordSha256 !== spec.programRecordSha256 || program.programDataLength !== spec.programDataLength) {
    return { error: `${pass} pass program record does not match the verified source` }
  }
  if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')
    || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
    return { error: `${pass} pass has no canonical GLES3 GLSL source` }
  }
  for (const attribute of spec.requiredAttributes) {
    if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) return { error: `${pass} pass GLSL is missing required ${attribute} input semantics` }
  }
  for (const uniform of spec.requiredUniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`).test(program.glsl)) return { error: `${pass} pass GLSL is missing required ${uniform} uniform` }
  }
  return {
    source: {
      pass, stateName: spec.stateName, passName: spec.passName, subShaderIndex: binding.subShaderIndex, passIndex: spec.passIndex,
      stage: 'vertex', platform: binding.platform, gpuProgramType: binding.gpuProgramType, blobIndex: spec.blobIndex,
      parameterBlobIndex: spec.parameterBlobIndex, parameterRecordSha256: spec.parameterRecordSha256,
      keywordIndices: [...spec.keywordIndices], keywordNames: [...spec.keywordNames], programHash: spec.programHash,
      programDataSha256: spec.programHash, programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256,
      glsl: program.glsl, requiredAttributes: [...spec.requiredAttributes], requiredUniforms: [...spec.requiredUniforms],
      renderState: { ...spec.renderState },
    },
  }
}

function eStandardShaderExtractionEvidence(shader: InventoryShader | undefined, activeVariant: 'static' | 'dynamic'):
  { error: string } | { source: RenderingProfileEStandardShaderExtraction } {
  const extraction = shader?.extraction
  if (!extraction) return { error: shader?.extractionError ?? 'source shader extraction is missing' }
  if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3') return { error: 'source shader extraction metadata is not the verified E-Standard version' }
  if (typeof extraction.fingerprint !== 'string' || extraction.fingerprint.toLowerCase() !== MX_E_STANDARD_FINGERPRINT) return { error: 'source shader extraction fingerprint is not the verified E-Standard version' }
  if (typeof extraction.compressedBlobSha256 !== 'string' || extraction.compressedBlobSha256.toLowerCase() !== MX_E_STANDARD_PROGRAM_BLOB_SHA256) return { error: 'source shader extraction compressed-blob identity is not the verified E-Standard version' }
  if (!extraction.shader?.sourceReference || !shader.sourceReference
    || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)
    || referenceKey(extraction.shader.sourceReference) !== referenceKey(MX_E_STANDARD_SOURCE_REFERENCE)) return { error: 'source shader extraction reference differs from the verified E-Standard Shader object' }
  if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'mx/e-standard') return { error: 'source shader extraction identity is not MX/E-Standard' }
  if (!exactArray(extraction.shader.keywordNames, MX_E_STANDARD_SHADER_KEYWORDS)) return { error: 'source shader extraction keyword declarations are not the verified E-Standard set' }
  const forwardStatic = eStandardExtractionPass(extraction, 'forwardStatic')
  if ('error' in forwardStatic) return forwardStatic
  const forwardDynamic = eStandardExtractionPass(extraction, 'forwardDynamic')
  if ('error' in forwardDynamic) return forwardDynamic
  const shadow = eStandardExtractionPass(extraction, 'shadow')
  if ('error' in shadow) return shadow
  const depth = eStandardExtractionPass(extraction, 'depth')
  if ('error' in depth) return depth
  const meta = eStandardExtractionPass(extraction, 'meta')
  if ('error' in meta) return meta
  return {
    source: {
      schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion, unityVersion: extraction.unityVersion,
      fingerprint: extraction.fingerprint, sourceReference: extraction.shader.sourceReference,
      compressedBlobSha256: extraction.compressedBlobSha256, shaderName: extraction.shader.name,
      shaderKeywordNames: [...extraction.shader.keywordNames], activeVariant,
      activeKeywordNames: activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS'] : [],
      requiredProperties: [...MX_E_STANDARD_REQUIRED_PROPERTIES], sourceTextureProperties: [...MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES],
      requiredTextureProperties: [...MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES],
      passes: {
        forward: activeVariant === 'dynamic' ? forwardDynamic.source : forwardStatic.source,
        forwardStatic: forwardStatic.source, forwardDynamic: forwardDynamic.source,
        shadow: shadow.source, depth: depth.source, meta: meta.source,
      },
    },
  }
}

function eStandardTextureEvidence(material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] }) {
  const textures = material.textures ?? []
  if (textures.length !== MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES.length
    || textures.some(item => !MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES.includes(item.name as typeof MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES[number]))) {
    return 'source texture property set is not the verified E-Standard set'
  }
  for (const property of MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES) {
    const texture = textures.find(item => item.name === property)
    if (!texture) return `exact ${property} material record is missing`
    if (property === '_MainTex') {
      if (!texture.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
        || texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
        || String(texture.texture.pathId) !== texture.textureReference.objectId) return 'exact _MainTex reference is missing'
      const resolved = material.resolvedTextures?.find(item => item.property === property)
      if (!resolved?.sourceReference || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)
        || positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null) return 'resolved _MainTex identity or dimensions are missing'
    } else if (texture.texture && String(texture.texture.pathId) !== '0') return `unsupported ${property} texture is bound`
    else if (texture.textureReference) return `inactive ${property} texture has an unexpected source identity`
    if (texture.scale && texture.offset) {
      const values = [texture.scale.x, texture.scale.y, texture.offset.x, texture.offset.y].map(finiteNumber)
      if (values.some(value => value === null)) return `${property} texture transform is unresolved`
    }
  }
  return null
}

function eStandardRenderStateEvidence(state: RenderingProfileMaterialSlot['renderState'] | null) {
  if (!state || state.layer !== 'opaque' || state.alphaMode !== 'OPAQUE' || state.depthWrite !== true || state.depthTest !== true
    || state.depthFunction !== 'less-equal' || state.cullMode !== 'back' || state.doubleSided !== false
    || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0) return 'translated render state is not the verified opaque E-Standard state'
  const blend = state.blend
  return blend.source !== 1 || blend.destination !== 0 || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 0
    || blend.operation !== 0 || blend.operationAlpha !== 0 ? 'translated blend state is not the verified opaque E-Standard state' : null
}

function eStandardMaterialEvidence(
  material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] },
  shader: InventoryShader | undefined,
  state: RenderingProfileMaterialSlot['renderState'] | null,
  extraction: RenderingProfileEStandardShaderExtraction | null,
) {
  const keywords = material.keywords ?? []
  const activeVariant: 'static' | 'dynamic' | null = keywords.length === 1 && keywords[0] === '_DYNAMIC_LIGHTS'
    || keywords.length === 2 && keywords[0] === '_DYNAMIC_LIGHTS' && keywords[1] === '_SPECULAR_SETUP' ? 'dynamic'
    : keywords.length === 1 && keywords[0] === '_SPECULAR_SETUP' ? 'static' : null
  if (!activeVariant) return `unsupported shader keywords are active: ${keywords.join(', ')}`
  if (!extraction || extraction.activeVariant !== activeVariant || !exactArray(extraction.activeKeywordNames, activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS'] : [])) return 'active keyword variant is not the verified E-Standard variant'
  const scalarProperties = ['_Cutoff', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha', '_ZWrite', '_Cull',
    '_ZOffsetFactor', '_ZOffsetUnits', '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength',
    '_EmissionStrength', '_SpecPower', '_ShadowAttenSpec', '_LightmapStrength']
  for (const property of scalarProperties) {
    if (propertyValue(material, property) === null && shaderDefault(shader, property) === null) return `${property} source scalar is unresolved`
  }
  const colors = ['_Color', '_SpecLightDir', '_SpecLightColor', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor']
  for (const name of colors) {
    const value = colorVector(material.colorProperties?.[name]) ?? shaderColorDefault(shader, name)
    if (!value) return `${name} source color is unresolved`
  }
  return eStandardTextureEvidence(material) ?? eStandardRenderStateEvidence(state)
}

function customShaderRuntimeBlocker(rule: CustomShaderAdapterRule) {
  return `Source shader ${rule.identity} uses ${rule.behavior} behavior that glTF-native output cannot preserve; Viewer runtime adapter ${rule.id} is required.`
}

function transparentTextureEvidence(material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] }, property: '_MainTex' | '_MaskTex') {
  const texture = material.textures.find(item => item.name === property)
  if (!texture?.texture || String(texture.texture.pathId) === '0') return `exact ${property} reference is missing`
  if (!texture.textureReference) return `exact ${property} source identity is missing`
  if (texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
    || String(texture.texture.pathId) !== texture.textureReference.objectId) return `serialized ${property} pointer does not match its exact source identity`
  const resolved = material.resolvedTextures?.find(item => item.property === property)
  if (!resolved?.sourceReference || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)) {
    return `resolved ${property} identity does not match the serialized source reference`
  }
  if (positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null) return `resolved ${property} dimensions are missing`
  return null
}

function projectMxTextureEvidence(material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] }, property: '_mainTex' | '_sourceTex' | '_NoiseTex') {
  const texture = (material.textures ?? []).find(item => item.name === property)
  if (!texture?.texture || String(texture.texture.pathId) === '0') return `exact ${property} reference is missing`
  if (!texture.textureReference) return `exact ${property} source identity is missing`
  if (texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
    || String(texture.texture.pathId) !== texture.textureReference.objectId) return `serialized ${property} pointer does not match its exact source identity`
  const resolved = material.resolvedTextures?.find(item => item.property === property)
  if (!resolved?.sourceReference || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)) {
    return `resolved ${property} identity does not match the serialized source reference`
  }
  if (positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null) return `resolved ${property} dimensions are missing`
  return null
}

function projectMxRenderStateEvidence(state: RenderingProfileMaterialSlot['renderState'] | null) {
  if (!state) return 'translated render state is missing'
  if (state.layer !== 'opaque' || state.alphaMode !== 'OPAQUE'
    || state.depthWrite !== true || state.depthTest !== true || state.depthFunction !== 'less-equal'
    || state.cullMode !== 'back' || state.doubleSided !== false
    || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0) {
    return 'translated render state is not the verified opaque ProjectMX state'
  }
  if (state.blend.source !== 1 || state.blend.destination !== 0
    || state.blend.sourceAlpha !== 1 || state.blend.destinationAlpha !== 0
    || state.blend.operation !== 0 || state.blend.operationAlpha !== 0) {
    return 'translated blend state is not the verified opaque ProjectMX state'
  }
  return null
}

function projectMxMaterialEvidence(
  material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] },
  state: RenderingProfileMaterialSlot['renderState'] | null,
  extraction: RenderingProfileProjectMxShaderExtraction | null,
) {
  const keywords = material.keywords ?? []
  const activeVariant: 'forward' | 'glow' | null = keywords.length === 0
    ? 'forward'
    : keywords.length === 1 && keywords[0] === '_GLOW_0' ? 'glow' : null
  if (!activeVariant) return `unsupported shader keywords are active: ${keywords.join(', ')}`
  if (!extraction) return 'source shader extraction is missing'
  if (extraction.activeVariant !== activeVariant) return `active keyword variant is ${activeVariant}, not ${extraction.activeVariant}`
  for (const property of ['_DamageON', '_Damage', '_Fire', '_IsDither']) {
    const value = propertyValue(material, property)
    if (value === null) return `${property} dynamic gate is unresolved`
    if (value !== 0) return `${property} dynamic gate is active (${value})`
  }
  const useGlow = propertyValue(material, '_UseGlow')
  const expectedUseGlow = activeVariant === 'glow' ? 1 : 0
  if (useGlow === null) return '_UseGlow variant gate is unresolved'
  if (useGlow !== expectedUseGlow) return `_UseGlow variant gate is ${useGlow}, expected ${expectedUseGlow}`
  return projectMxTextureEvidence(material, '_mainTex')
    ?? projectMxTextureEvidence(material, '_sourceTex')
    ?? (extraction.requiredTextureProperties.includes('_NoiseTex') ? projectMxTextureEvidence(material, '_NoiseTex') : null)
    ?? projectMxRenderStateEvidence(state)
}

function transparentMaterialEvidence(material: InventoryMaterial & { resolvedTextures?: ResolvedMaterial['resolvedTextures'] }, state: RenderingProfileMaterialSlot['renderState'] | null) {
  const keywords = material.keywords ?? []
  if (!(keywords.length === 0 || (keywords.length === 1 && keywords[0] === '_DITHER_HORIZONTAL_LINES'))) {
    return `unsupported shader keywords are active: ${keywords.join(', ')}`
  }
  return transparentTextureEvidence(material, '_MainTex')
    ?? transparentTextureEvidence(material, '_MaskTex')
    ?? (!state || state.alphaMode !== 'BLEND' || state.layer !== 'transparent' ? 'translated state is not transparent blend' : null)
    ?? (!state || state.depthTest !== true || state.cullMode !== 'off' || state.doubleSided !== true ? 'translated depth/cull state is not zTest4/cull-off' : null)
    ?? (!state || state.blend.source !== 5 || state.blend.destination !== 10 || state.blend.sourceAlpha !== 1 || state.blend.destinationAlpha !== 10
      || state.blend.operation !== 0 || state.blend.operationAlpha !== 0 ? 'translated blend state is not source (5,10)/(1,10)' : null)
}

function isSimpleUnlitShader(shaderName: string | null, parsedName: string | null, shader: InventoryShader | undefined) {
  const identities = [normalizedShaderIdentity(shaderName), normalizedShaderIdentity(parsedName)]
  if (!identities.some(identity => SIMPLE_UNLIT_SHADER_IDENTITIES.has(identity))) return false
  if (!shader?.programBlobSha256) return false
  const properties = (shader.properties as { m_Props?: Record<string, unknown>[] } | undefined)?.m_Props
  if (!properties?.length) return false
  return properties.every(property => typeof property.m_Name === 'string' && SIMPLE_UNLIT_SHADER_PROPERTIES.has(property.m_Name))
}

function sourceBaseColorTint(material: InventoryMaterial, shader: InventoryShader | undefined, adapterId: ChibiShaderAdapterId | null) {
  const property = adapterId === 'mx-character-weapon' || adapterId === 'projectmx-weapon-test1-damage' || adapterId === 'mx-e-standard' ? '_Color'
    : adapterId === 'gltf-native' && isSimpleUnlitShader(material.shaderName ?? null, material.shaderParsedName ?? null, shader) ? '_Color'
      : adapterId === 'dsfx-static' ? '_Color'
      : adapterId === 'dsfx-matcap' ? '_Main_Color'
      : adapterId === 'mx-unlit-outline' ? '_Tint'
      : adapterId === 'mx-c-transparent-st' ? '_Tint'
      : ['mx-character-face', 'mx-character-eyebrow', 'mx-character-hair', 'mx-character-general'].includes(adapterId ?? '') ? '_Tint'
      : null
  return property ? materialColor(material, shader, property) : null
}

function referencedProperty(name: unknown) {
  if (typeof name !== 'string') return null
  return name.match(/^\[?(_[A-Za-z0-9_]+)\]?$/)?.[1] ?? null
}

/** Resolve ShaderLab's property-or-literal state values without guessing. */
export function resolveShaderState(value: unknown, material: InventoryMaterial, shader: InventoryShader | undefined, defaultProperty?: string): ShaderStateResolution {
  const record = value && typeof value === 'object' ? value as { val?: unknown; name?: unknown } : null
  const property = referencedProperty(record?.name) ?? (value === undefined ? defaultProperty : null) ?? null
  if (property) {
    const materialValue = propertyValue(material, property)
    if (materialValue !== null) return { value: materialValue, source: 'material', property }
    const defaultValue = shaderDefault(shader, property)
    if (defaultValue !== null) return { value: defaultValue, source: 'shader-default', property }
    return { value: null, source: 'unresolved', property }
  }
  const literal = finiteNumber(record ? record.val : value)
  return literal === null
    ? { value: null, source: 'unresolved' }
    : { value: literal, source: 'literal' }
}

function allRecords(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return []
  const records = [value as Record<string, unknown>]
  for (const item of Object.values(value as Record<string, unknown>)) records.push(...allRecords(item))
  return records
}

function findState(pass: unknown, keys: string[]) {
  const wanted = new Set(keys.map(key => key.toLowerCase()))
  for (const record of allRecords(pass)) {
    for (const [key, value] of Object.entries(record)) {
      if (wanted.has(key.toLowerCase())) return value
    }
  }
  return undefined
}

function passFor(shader: InventoryShader | undefined) {
  return shader?.subShaders?.flatMap(item => item.passes ?? []).find(item => item.type === 0) ?? shader?.subShaders?.[0]?.passes?.[0]
}

function adapterFor(shaderName: string | null, parsedName: string | null, shader: InventoryShader | undefined): ChibiShaderAdapterId | null {
  const name = `${parsedName ?? ''} ${shaderName ?? ''}`.toLowerCase().replaceAll(' ', '')
  if (isSimpleUnlitShader(shaderName, parsedName, shader)) return 'gltf-native'
  if (dsfxGlitchShaderRule(shaderName, parsedName)) return 'dsfx-glitch-tex'
  const dsfxRule = dsfxStaticShaderRule(shaderName, parsedName)
  if (dsfxRule && !dsfxStaticPassEvidence(dsfxRule, shader)) return 'dsfx-static'
  const customRule = customShaderAdapterRule(shaderName, parsedName)
  if (customRule && !customShaderEvidence(customRule, shader)) return customRule.id
  if (/mx\/c-face(?:\/|$)/.test(name) || /mxcharacterface/.test(name)) return 'mx-character-face'
  if (/mx\/c-eyesmouth(?:\/|$)/.test(name) || /mxcharactereyesmouth/.test(name)) return 'mx-character-eyemouth'
  if (/mx\/c-eyebrow/.test(name) || /mxcharactereyebrow/.test(name)) return 'mx-character-eyebrow'
  if (/mx\/c-hair/.test(name) || /mxcharacterhair/.test(name)) return 'mx-character-hair'
  if (/mx\/c-(?:general|simple|halo)/.test(name) || /mxcharacter(?:general|simple|halo)/.test(name)) return 'mx-character-general'
  if (/mx\/c-weapon(?:\/|$)/.test(name)) return 'mx-character-weapon'
  return null
}

function sourceRendererReference(renderer: InventoryAssemblyRenderer) {
  return renderer.sourceReference ?? null
}

function normalizedSerializedFile(value: string) {
  return value.replaceAll('\\', '/').toLowerCase()
}

function isExactNullPointer(pointer: InventoryPointer | null | undefined, ownerFile: string) {
  return Boolean(pointer
    && pointer.pathId === '0'
    && !pointer.externalGuid
    && !pointer.builtinResource
    && normalizedSerializedFile(pointer.file) === normalizedSerializedFile(ownerFile))
}

/**
 * Unity keeps some helper SkinnedMeshRenderers in a prefab with both PPtrs
 * null.  They have no renderable source identity and must not become a mesh
 * mapping requirement.  Keep this deliberately source-exact: a nonzero
 * pointer, external GUID, foreign serialized file, or material identity is
 * still unresolved and remains fail-closed.
 *
 * Return the diagnostic evidence instead of a boolean so an exact null helper
 * is never silently discarded by the presentation policy.
 */
function inertSourceRendererEvidence(renderer: InventoryAssemblyRenderer) {
  const ownerFile = renderer.sourceReference?.serializedFile
  if (!ownerFile || renderer.meshSourceReference || !isExactNullPointer(renderer.mesh, ownerFile)) return null
  const slots = renderer.materialSlots ?? []
  if (!slots.every(slot => !slot.sourceMaterialReference && isExactNullPointer(slot.material, ownerFile))) return null
  return [
    `exact source renderer reference ${referenceKey(renderer.sourceReference)}`,
    `source mesh is the exact null pointer ${normalizedSerializedFile(ownerFile)}:0`,
    slots.length === 0
      ? 'source renderer has no material slots (exact null material set)'
      : `every source material slot is the exact null pointer ${normalizedSerializedFile(ownerFile)}:0`,
  ]
}

type RendererPolicyDecision =
  | { kind: 'core' | 'excluded'; sourceRenderer: InventoryAssemblyRenderer; excluded?: RenderingProfileExcludedRenderer }

function sourceReferenceFromUnknown(value: unknown): InventorySourceReference | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const referenceValue = record.sourceReference ?? record.sourceRendererReference
  const nested = referenceValue && typeof referenceValue === 'object'
    ? referenceValue as Record<string, unknown>
    : record
  return typeof nested.bundleSha256 === 'string'
    && typeof nested.serializedFile === 'string'
    && typeof nested.objectId === 'string'
    ? { bundleSha256: nested.bundleSha256, serializedFile: nested.serializedFile, objectId: nested.objectId }
    : null
}

function recordArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function pointerFilePathKey(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return typeof record.file === 'string' && typeof record.pathId === 'string'
    ? `${normalizedSerializedFile(record.file)}:${record.pathId}`
    : null
}

/**
 * Compare source pointers without falling back from a full source identity to
 * a file/path collision.  A relation is authoritative only when both sides
 * carry the same full identity, or when both sides are the same serialized
 * pointer and neither side carries a bundle identity.
 */
function exactAssemblyPointerMatch(left: unknown, right: unknown) {
  const leftReference = sourceReferenceFromUnknown(left)
  const rightReference = sourceReferenceFromUnknown(right)
  if (leftReference || rightReference) {
    return Boolean(leftReference && rightReference
      && referenceKey(leftReference) === referenceKey(rightReference))
  }
  const leftKey = pointerFilePathKey(left)
  const rightKey = pointerFilePathKey(right)
  return Boolean(leftKey && rightKey && leftKey === rightKey)
}

// When one side carries a full source identity and the other side only has a
// serialized file/path, the relation is not exact enough to prove ownership,
// but it is too close to ignore for body/accessory ambiguity checks.  Treat it
// as a conflict (rather than as a match) so the shared-bone rule stays
// fail-closed.
function ambiguousAssemblyPointerCollision(left: unknown, right: unknown) {
  if (exactAssemblyPointerMatch(left, right)) return false
  const leftKey = pointerFilePathKey(left)
  const rightKey = pointerFilePathKey(right)
  return Boolean(leftKey && rightKey && leftKey === rightKey
    && (sourceReferenceFromUnknown(left) || sourceReferenceFromUnknown(right)))
}

function rendererAttachmentEvidence(assembly: InventoryAssembly | undefined, renderer: InventoryAssemblyRenderer) {
  const attachments = (assembly?.attachments ?? {}) as Record<string, unknown>
  const exactRendererReferences = new Set<string>()
  const ambiguousRendererReferences = new Set<string>()
  // New inventories may carry exact renderer identities.  Read the optional
  // shape without making old inventories opt into name-based trust.
  for (const key of [
    'equipmentRendererReferences', 'weaponRendererReferences',
    'mainWeaponRendererReferences', 'subWeaponRendererReferences',
    'accessoryRendererReferences',
  ]) {
    for (const item of recordArray(attachments[key])) {
      const reference = sourceReferenceFromUnknown(item)
      if (reference) exactRendererReferences.add(referenceKey(reference))
    }
  }
  for (const ambiguity of recordArray(attachments.equipmentRendererAmbiguities)) {
    if (!ambiguity || typeof ambiguity !== 'object') continue
    for (const item of recordArray((ambiguity as Record<string, unknown>).sourceReferences)) {
      const reference = sourceReferenceFromUnknown(item)
      if (reference) ambiguousRendererReferences.add(referenceKey(reference))
    }
  }
  const exactGroupEvidence = recordArray(attachments.equipmentRendererGroups)
    .filter(group => group && typeof group === 'object')
    .flatMap(group => {
      const record = group as Record<string, unknown>
      const references = recordArray(record.sourceReferences)
        .map(sourceReferenceFromUnknown)
        .filter((value): value is InventorySourceReference => Boolean(value))
      const evidence = recordArray(record.evidence).filter((value): value is string => typeof value === 'string')
      return renderer.sourceReference && references.some(reference => referenceKey(reference) === referenceKey(renderer.sourceReference!))
        ? evidence : []
    })
  const ambiguousEquipmentNames = new Set(recordArray(attachments.equipmentRendererAmbiguities)
    .flatMap(value => value && typeof value === 'object' && typeof (value as Record<string, unknown>).name === 'string'
      ? [((value as Record<string, unknown>).name as string).toLowerCase()] : []))
  const attachmentBones: unknown[] = []
  for (const key of ['mainWeapon', 'subWeapon']) {
    for (const item of recordArray(attachments[key])) {
      if (!item || typeof item !== 'object') continue
      attachmentBones.push(item)
    }
  }
  const rootBone = renderer.rootBone as (InventoryAssemblyRenderer['rootBone'] & Record<string, unknown>) | null | undefined
  const rendererBones: unknown[] = [rootBone, ...(renderer.transformChain ?? []), ...(renderer.boneReferences ?? [])]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const exactReference = renderer.sourceReference ? referenceKey(renderer.sourceReference) : null
  return {
    exactRenderer: Boolean(exactReference && exactRendererReferences.has(exactReference)),
    ambiguousEquipment: Boolean(exactReference && ambiguousRendererReferences.has(exactReference)),
    ambiguousName: ambiguousEquipmentNames.has(renderer.name.toLowerCase()),
    exactGroupEvidence,
    // A legacy equipment name is intentionally ignored.  Only the complete
    // renderer reference (or an exact serialized bone pointer) can protect a
    // renderer from presentation exclusion.
    // The source extractor now preserves the complete transform chain and
    // m_Bones list.  Any exact main/sub-weapon pointer match is an authored
    // relation; names alone are deliberately never used here.
    attachedBone: attachmentBones.some(attachment => rendererBones.some(pointer => exactAssemblyPointerMatch(pointer, attachment))),
  }
}

function coreShaderIdentity(value: string | null | undefined) {
  const identity = normalizedShaderIdentity(value)
  return /^mx\/(?:c-(?:face|eyesmouth|eyebrow|hair|general|simple|halo|weapon|transparent-st)|e-(?:standard|water-v2)|unlit-outline)(?:\/|$)/.test(identity)
    || /^projectmx\/(?:weapontest1damage|weapon)/.test(identity)
    || identity.includes('mxcharacterface') || identity.includes('mxcharactereyesmouth')
    || identity.includes('mxcharacterhair') || identity.includes('mxcharacterweapon')
    || identity.includes('mxcharacterhalo') || identity.includes('mxcharactergeneral')
}

/**
 * These names are source-role exceptions, not a general name classifier.
 * They cover authored core renderers that deliberately live under cut-in/FX
 * branches and can therefore not be identified from hierarchy hints alone.
 */
function exactCoreRendererName(name: string) {
  const normalized = name.trim().toLowerCase().replaceAll(' ', '_')
  return normalized === 'ch0123_cutin_body' || normalized === 'fx_aris_original_weapon'
}

function presentationMaterialName(name: string | null | undefined) {
  const value = name?.trim().replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() ?? ''
  if (!value) return false
  return /(?:^|[_\/.\-\s])fx(?:[_\/.\-\s]|$)/.test(value)
    || /(?:^|[_\/.\-\s])(?:effect|effects|glow|fire|distort|focus|aura|flower|leaf|logo|light|screen|overlay|transition|background|bg|butterfly|glitch|plane|cutin)(?:$|[_\/.\-\s])/.test(value)
}

function presentationShaderIdentity(value: string | null | undefined) {
  const identity = normalizedShaderIdentity(value)
  return /^dsfx\/(?:fx[_/]shader[_/]|shader[_/])/.test(identity)
    || /^fx[_/]shader[_/]/.test(identity)
}

function exactCoreRendererReferences(assembly: InventoryAssembly | undefined) {
  const references = new Set<string>()
  const attachments = (assembly?.attachments ?? {}) as Record<string, unknown>
  for (const key of [
    'coreRendererReferences', 'bodyRendererReferences', 'faceRendererReferences',
    'eyeRendererReferences', 'mouthRendererReferences', 'weaponRendererReferences',
    'equipmentRendererReferences', 'mainWeaponRendererReferences', 'subWeaponRendererReferences',
    'accessoryRendererReferences',
  ]) {
    for (const item of recordArray(attachments[key])) {
      const reference = sourceReferenceFromUnknown(item)
      if (reference) references.add(referenceKey(reference))
    }
  }
  for (const key of ['mouthRenderer', 'eyes']) {
    for (const item of recordArray(attachments[key])) {
      const reference = sourceReferenceFromUnknown(item)
      if (reference) references.add(referenceKey(reference))
    }
  }
  for (const item of recordArray(attachments.mouthMetadata)) {
    const reference = sourceReferenceFromUnknown(item)
    if (reference) references.add(referenceKey(reference))
  }
  return references
}

function presentationPathEvidence(renderer: InventoryAssemblyRenderer) {
  const hierarchy = (renderer.hierarchyPath ?? '').replaceAll('\\', '/').toLowerCase()
  const value = `${hierarchy}/${renderer.name}`
  const branch = /(?:^|[\/_\-])(?:fx(?:[\/_\-]|$)|effect(?:s)?(?:[\/_\-]|$)|camera\d*(?:[\/_\-]|$)|cam(?:era)?(?:[\/_\-]|$)|cutin(?:[\/_\-]|$)|cut[_-]in(?:[\/_\-]|$)|ex[_-]?root(?:[\/_\-]|$)|overlay(?:[\/_\-]|$)|transition(?:[\/_\-]|$)|presentation(?:[\/_\-]|$))/.test(value)
    || /(?:^|[\/_\-])cutin(?:root|cam|branch)?(?:[\/_\-]|$)/.test(hierarchy)
  const role = /(?:^|[\/_\-])(?:logo|background|bg(?:[\/_\-]|$)|screen|plane|glitch|black|white|glow|fire|distort|focus|aura|butterfly|flower|leaf|light|transition|overlay)(?:$|[\/_\-])/.test(value)
  return { branch, role, value }
}

/**
 * These are deliberately specific authored equipment terms.  Generic words
 * such as `prop`, `bag`, `outline`, `accessory`, and `equipment` are omitted:
 * they occur on presentation helpers and ordinary skill props.  A renderer
 * must still carry exact source mesh/material/shader identities and a second
 * independent source-semantic signal before it can become a blocker.
 */
const MEANINGFUL_EQUIPMENT_TOKENS = new Set([
  'weapon', 'weapons', 'handgun', 'pistol', 'rifle', 'railgun', 'machinegun', 'shotgun', 'sniper',
  'cannon', 'launcher', 'bazooka', 'sword', 'blade', 'knife', 'dagger', 'bow', 'staff', 'spear',
  'lance', 'shield', 'turret', 'drone', 'chain', 'hagoita', 'mk19', 'grenade', 'hammer', 'scythe',
  'axe', 'mace', 'crossbow', 'smartphone', 'phone', 'tablet', 'microphone', 'guitar', 'umbrella',
  'robot', 'mechanical', 'vehicle', 'toggle',
])

const SPECIFIC_EQUIPMENT_TOKENS = new Set([
  'handgun', 'pistol', 'rifle', 'railgun', 'machinegun', 'shotgun', 'sniper', 'cannon', 'launcher',
  'bazooka', 'sword', 'blade', 'knife', 'dagger', 'bow', 'staff', 'spear', 'lance', 'shield',
  'turret', 'drone', 'chain', 'hagoita', 'mk19', 'grenade', 'hammer', 'scythe', 'axe', 'mace',
  'crossbow', 'smartphone', 'phone', 'tablet', 'microphone', 'guitar', 'umbrella',
])

function sourceSemanticTokens(value: string | null | undefined) {
  return new Set((value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean))
}

function meaningfulEquipmentTokens(value: string | null | undefined) {
  return [...sourceSemanticTokens(value)].filter(token => MEANINGFUL_EQUIPMENT_TOKENS.has(token))
}

// Unity source uses both underscore and whitespace separators for Bip001
// ancestry (for example Bip001_Weapon and Bip001 Prop1).  This is only a
// semantic ancestry label; exact source pointer, prefab, skin, mesh, material,
// shader, and conflict checks still gate structural evidence below.
function isBip001AncestryName(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized === 'bip001' || /^bip001(?:[\s_-]|$)/.test(normalized)
}

const STRUCTURAL_EQUIPMENT_ANCHOR_NAME = 'bip001_weapon'

function meaningfulRendererNameTokens(renderer: InventoryAssemblyRenderer) {
  const tokens = sourceSemanticTokens(renderer.name)
  // A fixture/body material can contain a weapon shader or a character name
  // containing "weapon" without the renderer itself being equipment.  Do not
  // turn a body/face/hair renderer into a weapon blocker from that substring.
  if (['body', 'face', 'hair', 'head', 'eye', 'mouth', 'eyebrow', 'skin', 'clothing', 'outfit', 'uniform']
    .some(token => tokens.has(token))) return []
  return [...tokens].filter(token => MEANINGFUL_EQUIPMENT_TOKENS.has(token))
}

function independentEquipmentNameEvidence(
  renderer: InventoryAssemblyRenderer,
  rootBone: InventoryAssemblyPointer | null,
  sourceEvidence: ExactSourceMaterialShaderEvidence,
  allowGenericWeapon: boolean,
) {
  const normalize = (token: string) => /^weapon\d+$/.test(token) ? 'weapon' : token
  const rendererTokens = [
    ...meaningfulRendererNameTokens(renderer),
    ...[...sourceSemanticTokens(renderer.name)].filter(token => /^weapon\d+$/.test(token)),
  ]
  const materialTokens = new Set(sourceEvidence.flatMap(item => [
    ...meaningfulEquipmentTokens(item.material.name),
    ...[...sourceSemanticTokens(item.material.name)].filter(token => /^weapon\d+$/.test(token)),
  ]).map(token => /^weapon\d+$/.test(token) ? 'weapon' : token))
  const rootBoneTokens = new Set([
    ...meaningfulEquipmentTokens(rootBone?.name),
    ...[...sourceSemanticTokens(rootBone?.name)].filter(token => /^weapon\d+$/.test(token)),
  ].map(normalize))
  return rendererTokens.some(value => {
    const token = normalize(value)
    const numberedWeapon = /^weapon\d+$/.test(value)
    return (SPECIFIC_EQUIPMENT_TOKENS.has(token) || numberedWeapon || (allowGenericWeapon && token === 'weapon'))
      && materialTokens.has(token) && rootBoneTokens.has(token)
  })
}

function weaponShaderIdentity(value: string | null | undefined) {
  const identity = normalizedShaderIdentity(value)
  return /^mx\/c-weapon(?:\/|$)/.test(identity)
    || /^projectmx\/(?:weapon|weapontest1damage)(?:\/|$)/.test(identity)
    || identity.includes('mxcharacterweapon')
}

function exactSourceMaterialShaderEvidence(
  renderer: InventoryAssemblyRenderer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
) {
  if (!renderer.sourceReference || !renderer.meshSourceReference) return null
  const slots = renderer.materialSlots ?? []
  if (!slots.length) return null
  const records: { material: ResolvedMaterial; shader: InventoryShader; materialReference: InventorySourceReference; shaderReference: InventorySourceReference }[] = []
  for (const slot of slots) {
    const materialReference = slot.sourceMaterialReference ?? null
    if (!materialReference) return null
    const material = materialIndex.get(referenceKey(materialReference))
    if (!material?.sourceReference || referenceKey(material.sourceReference) !== referenceKey(materialReference)) return null
    const shaderReference = material.shaderReference ?? null
    if (!shaderReference) return null
    const shader = shaderIndex.get(referenceKey(shaderReference))
    if (!shader?.sourceReference || referenceKey(shader.sourceReference) !== referenceKey(shaderReference)) return null
    records.push({ material, shader, materialReference, shaderReference })
  }
  return records
}

type ExactSourceMaterialShaderEvidence = NonNullable<ReturnType<typeof exactSourceMaterialShaderEvidence>>

function completeAssemblyPointer(value: unknown): value is InventoryAssemblyPointer {
  if (!value || typeof value !== 'object') return false
  const pointer = value as Record<string, unknown>
  return typeof pointer.file === 'string' && pointer.file.length > 0
    && typeof pointer.pathId === 'string' && pointer.pathId !== '0'
    && typeof pointer.name === 'string' && pointer.name.trim().length > 0
}

type AssemblyPointerWithSourceReference = InventoryAssemblyPointer & {
  sourceReference?: InventorySourceReference | null
}

type RendererWithRootBoneAncestry = InventoryAssemblyRenderer & {
  /** Added by the source inventory extractor; absent on older inventories. */
  rootBoneAncestry?: AssemblyPointerWithSourceReference[] | null
  /** Compatibility spelling for hand-authored inventories during migration. */
  rootBoneParentChain?: AssemblyPointerWithSourceReference[] | null
  /** Compatibility spelling for hand-authored inventories during migration. */
  rootBoneTransformChain?: AssemblyPointerWithSourceReference[] | null
  /** False means the extractor encountered a missing, foreign, or cyclic parent. */
  rootBoneAncestryComplete?: boolean
}

function rootBoneAncestry(renderer: InventoryAssemblyRenderer) {
  const extended = renderer as RendererWithRootBoneAncestry
  const value = extended.rootBoneAncestry ?? extended.rootBoneParentChain ?? extended.rootBoneTransformChain
  return Array.isArray(value) ? value : null
}

function rootBoneAncestryComplete(renderer: InventoryAssemblyRenderer) {
  return (renderer as RendererWithRootBoneAncestry).rootBoneAncestryComplete !== false
}

function candidateIdentityMatchesPrefabRoot(candidate: SourceCandidate, assembly: InventoryAssembly) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const rootIdentity = normalize(assembly.root.replace(/^cafe[_\s-]*/i, ''))
  return Boolean(rootIdentity && normalize(candidate.sourceIdentity) === rootIdentity)
}

function exactSourcePointerIdentity(pointer: unknown, sourceReference: InventorySourceReference) {
  if (!completeAssemblyPointer(pointer)) return false
  const pointerReference = sourceReferenceFromUnknown(pointer)
  return Boolean(pointerReference
    && pointerReference.bundleSha256.toLowerCase() === sourceReference.bundleSha256.toLowerCase()
    && normalizedSerializedFile(pointerReference.serializedFile) === normalizedSerializedFile(sourceReference.serializedFile)
    && pointerReference.objectId === pointer.pathId
    && normalizedSerializedFile(pointer.file!) === normalizedSerializedFile(sourceReference.serializedFile))
}

function pointerKey(value: InventoryAssemblyPointer | null | undefined) {
  if (!value || !completeAssemblyPointer(value)) return null
  const sourceReference = sourceReferenceFromUnknown(value)
  return sourceReference ? `reference:${referenceKey(sourceReference)}` : pointerFilePathKey(value)
}

function pointerName(value: InventoryAssemblyPointer | null | undefined) {
  return value && completeAssemblyPointer(value) ? value.name!.trim().toLowerCase() : null
}

function pointerMatchesSourceFile(
  value: InventoryAssemblyPointer | null | undefined,
  serializedFile: string,
  bundleSha256?: string,
) {
  if (!value || !completeAssemblyPointer(value)
    || normalizedSerializedFile(value.file!) !== normalizedSerializedFile(serializedFile)) return false
  const sourceReference = sourceReferenceFromUnknown(value)
  return !sourceReference || (normalizedSerializedFile(sourceReference.serializedFile) === normalizedSerializedFile(value.file!)
    && sourceReference.objectId === value.pathId
    && (!bundleSha256 || sourceReference.bundleSha256.toLowerCase() === bundleSha256.toLowerCase()))
}

function pointerMatchesSourceReference(value: unknown, sourceReference: InventorySourceReference) {
  if (!value || typeof value !== 'object') return false
  const pointer = value as Record<string, unknown>
  if (typeof pointer.file !== 'string' || typeof pointer.pathId !== 'string'
    || normalizedSerializedFile(pointer.file) !== normalizedSerializedFile(sourceReference.serializedFile)
    || pointer.pathId !== sourceReference.objectId) return false
  const pointerReference = sourceReferenceFromUnknown(value)
  return !pointerReference || referenceKey(pointerReference) === referenceKey(sourceReference)
}

function cloneAssemblyPointer(value: InventoryAssemblyPointer | null | undefined): InventoryAssemblyPointer | null {
  return value && completeAssemblyPointer(value)
    ? { file: value.file, pathId: value.pathId, name: value.name }
    : null
}

function cloneAssemblyPointers(values: readonly InventoryAssemblyPointer[] | null | undefined) {
  return (values ?? []).filter(completeAssemblyPointer).map(value => ({
    file: value.file, pathId: value.pathId, name: value.name,
  }))
}

function cloneAssemblyPointersWithSource(values: readonly AssemblyPointerWithSourceReference[] | null | undefined) {
  return (values ?? []).filter(completeAssemblyPointer).map(value => ({
    file: value.file,
    pathId: value.pathId,
    name: value.name,
    ...(sourceReferenceFromUnknown(value) ? { sourceReference: sourceReferenceFromUnknown(value) } : {}),
  })) as InventoryAssemblyPointer[]
}

function normalizedHierarchySegments(value: string | null | undefined) {
  return (value ?? '').replaceAll('\\', '/').split('/').map(item => item.trim().toLowerCase()).filter(Boolean)
}

function namesMatchHierarchyPrefix(hierarchyPath: string | null | undefined, root: string, chain: readonly InventoryAssemblyPointer[]) {
  const hierarchy = normalizedHierarchySegments(hierarchyPath)
  const names = chain.map(pointerName)
  if (!hierarchy.length || hierarchy[0] !== root.trim().toLowerCase() || names.some(value => !value)) return false
  if (names.length > hierarchy.length) return false
  return names.every((name, index) => name === hierarchy[index])
}

type StructuralEquipmentRelationEvidence = {
  rootBone: InventoryAssemblyPointer
  transformChain: InventoryAssemblyPointer[]
  rootBoneAncestry: AssemblyPointerWithSourceReference[]
  boneReferences: InventoryAssemblyPointer[]
  matchedAncestorPointers: InventoryAssemblyPointer[]
  equipmentAnchor: InventoryAssemblyPointer | null
  equipmentTokens: string[]
  sourceReference: InventorySourceReference
  sharedBonePointers: InventoryAssemblyPointer[]
  validatedAnchorGroupReferences?: Set<string>
  relationKind: 'transform-ancestry' | 'shared-equipment-mBones' | 'exact-source-weapon-ancestry'
}

const MIN_SHARED_EQUIPMENT_BONES = 3

function exactSourceWeaponAncestorEvidence(
  assembly: InventoryAssembly,
  renderer: InventoryAssemblyRenderer,
): StructuralEquipmentRelationEvidence | null {
  const sourceReference = renderer.sourceReference ?? null
  const prefabReference = assembly.prefabReference ?? null
  const rootBone = renderer.rootBone ?? null
  const ancestry = rootBoneAncestry(renderer)
  if (!sourceReference || !prefabReference || !rootBone || !ancestry?.length
    || !rootBoneAncestryComplete(renderer)) return null
  if (prefabReference.bundleSha256.toLowerCase() !== sourceReference.bundleSha256.toLowerCase()
    || normalizedSerializedFile(prefabReference.serializedFile) !== normalizedSerializedFile(sourceReference.serializedFile)) return null
  if (!exactSourcePointerIdentity(rootBone, sourceReference)) return null
  if (ancestry.some(pointer => !exactSourcePointerIdentity(pointer, sourceReference))) return null

  const ancestryKeys = ancestry.map(pointer => pointerKey(pointer))
  if (ancestryKeys.some((key, index) => !key || ancestryKeys.indexOf(key) !== index)) return null

  const attachments = (assembly.attachments ?? {}) as Record<string, unknown>
  const authoredAttachments = (['mainWeapon', 'subWeapon'] as const).flatMap(kind =>
    recordArray(attachments[kind]).map(pointer => ({ kind, pointer: pointer as AssemblyPointerWithSourceReference })))
  // Every authored weapon pointer must carry a full source identity.  A
  // missing identity is not allowed to sit beside an otherwise matching
  // ancestor and silently change the one-to-one conclusion.
  if (!authoredAttachments.length || authoredAttachments.some(item =>
    !exactSourcePointerIdentity(item.pointer, sourceReference))) return null

  const matches = ancestry.flatMap(pointer => {
    const pointerMatches = authoredAttachments.filter(item => exactAssemblyPointerMatch(pointer, item.pointer))
    return pointerMatches.length ? [{ pointer, attachments: pointerMatches }] : []
  })
  // Exactly one authored mainWeapon/subWeapon pointer must be reached.  This
  // rejects duplicate slots, multiple weapon ancestors, and same-name decoys.
  if (matches.length !== 1 || matches[0].attachments.length !== 1) return null

  const matchedAncestor = matches[0].pointer
  return {
    rootBone,
    transformChain: renderer.transformChain ?? [],
    rootBoneAncestry: ancestry,
    boneReferences: renderer.boneReferences ?? [],
    matchedAncestorPointers: [matchedAncestor],
    equipmentAnchor: null,
    equipmentTokens: [],
    sourceReference,
    sharedBonePointers: [],
    relationKind: 'exact-source-weapon-ancestry',
  }
}

function exactSourceRootBoneAncestry(
  renderer: InventoryAssemblyRenderer,
  sourceReference: InventorySourceReference,
) {
  const ancestry = rootBoneAncestry(renderer)
  const transformChain = renderer.transformChain ?? []
  const transformRoot = renderer.transformChain?.[0]
  if (!ancestry?.length
    || (renderer as RendererWithRootBoneAncestry).rootBoneAncestryComplete !== true
    || !exactSourcePointerIdentity(renderer.rootBone, sourceReference)
    || !transformChain.length
    || transformChain.some(pointer => !exactSourcePointerIdentity(pointer, sourceReference))
    || !completeAssemblyPointer(transformRoot)
    || !exactSourcePointerIdentity(transformRoot, sourceReference)
    || ancestry.some(pointer => !exactSourcePointerIdentity(pointer, sourceReference))) return null
  const keys = ancestry.map(pointerKey)
  if (keys.some((key, index) => !key || keys.indexOf(key) !== index)
    || !exactAssemblyPointerMatch(ancestry[0], transformRoot)
    || ancestry.some(pointer => exactAssemblyPointerMatch(pointer, renderer.rootBone))) return null
  return ancestry
}

function exactSiblingSourcePath(
  left: readonly InventoryAssemblyPointer[],
  right: readonly InventoryAssemblyPointer[],
) {
  const leftKeys = left.map(pointerKey)
  const rightKeys = right.map(pointerKey)
  if (leftKeys.some(key => !key) || rightKeys.some(key => !key)) return false
  let sharedPrefixLength = 0
  while (sharedPrefixLength < Math.min(leftKeys.length, rightKeys.length)
    && leftKeys[sharedPrefixLength] === rightKeys[sharedPrefixLength]) sharedPrefixLength++
  if (sharedPrefixLength === 0 || sharedPrefixLength >= Math.min(leftKeys.length, rightKeys.length)) return false
  const leftBranch = new Set(leftKeys.slice(sharedPrefixLength))
  return rightKeys.slice(sharedPrefixLength).every(key => !leftBranch.has(key))
}

function exactSiblingSourceAttachmentBranches(
  assembly: InventoryAssembly,
  renderer: InventoryAssemblyRenderer,
  primary: InventoryAssemblyRenderer,
  sourceReference: InventorySourceReference,
) {
  const rendererAncestry = exactSourceRootBoneAncestry(renderer, sourceReference)
  const primaryAncestry = exactSourceRootBoneAncestry(primary, sourceReference)
  const rendererTransformChain = renderer.transformChain ?? []
  const primaryTransformChain = primary.transformChain ?? []
  const rendererRootTransform = rendererTransformChain[0]
  const primaryRootTransform = primaryTransformChain[0]
  if (!rendererAncestry || !primaryAncestry || !primary.sourceReference
    || primary.sourceReference.bundleSha256.toLowerCase() !== sourceReference.bundleSha256.toLowerCase()
    || normalizedSerializedFile(primary.sourceReference.serializedFile) !== normalizedSerializedFile(sourceReference.serializedFile)
    || !exactSourcePointerIdentity(rendererRootTransform, sourceReference)
    || !exactSourcePointerIdentity(primaryRootTransform, sourceReference)
    || !exactAssemblyPointerMatch(rendererRootTransform, primaryRootTransform)
    || !namesMatchHierarchyPrefix(renderer.hierarchyPath, assembly.root, rendererTransformChain)
    || !namesMatchHierarchyPrefix(primary.hierarchyPath, assembly.root, primaryTransformChain)) return false
  return exactSiblingSourcePath(rendererTransformChain, primaryTransformChain)
    && exactSiblingSourcePath(
      [...rendererAncestry, renderer.rootBone!],
      [...primaryAncestry, primary.rootBone!],
    )
}

function structurallyValidatedAnchorGroupReferences(
  candidate: SourceCandidate,
  assembly: InventoryAssembly,
  anchor: InventoryAssemblyPointer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
) {
  const prefabReference = assembly.prefabReference
  if (!candidateIdentityMatchesPrefabRoot(candidate, assembly)
    || !prefabReference || !completeAssemblyPointer(anchor)
    || !exactSourcePointerIdentity(anchor, prefabReference)) return null
  const anchorKey = pointerKey(anchor)
  if (!anchorKey) return null
  const allPointers = (renderer: InventoryAssemblyRenderer) => [
    renderer.rootBone,
    ...(renderer.transformChain ?? []),
    ...(rootBoneAncestry(renderer) ?? []),
    ...(renderer.boneReferences ?? []),
  ].filter(completeAssemblyPointer)
  const claims = assembly.renderers.filter(renderer => allPointers(renderer).some(pointer =>
    exactAssemblyPointerMatch(pointer, anchor) || ambiguousAssemblyPointerCollision(pointer, anchor)))
  if (claims.length < 2 || claims.some(renderer => isLikelyBodyRenderer(renderer))) return null

  const exactCoreReferences = exactCoreRendererReferences(assembly)
  const referenceKeys = new Set<string>()
  let hasIndependentRoleEvidence = false
  for (const renderer of claims) {
    const anchorClaims = allPointers(renderer).filter(pointer =>
      exactAssemblyPointerMatch(pointer, anchor) || ambiguousAssemblyPointerCollision(pointer, anchor))
    const sourceReference = sourceRendererReference(renderer)
    const ancestry = sourceReference ? exactSourceRootBoneAncestry(renderer, sourceReference) : null
    if (anchorClaims.some(pointer => !exactAssemblyPointerMatch(pointer, anchor)
      || pointerName(pointer) !== pointerName(anchor))) return null
    if (!sourceReference || renderer.pathId !== sourceReference.objectId
      || sourceReference.bundleSha256.toLowerCase() !== prefabReference.bundleSha256.toLowerCase()
      || normalizedSerializedFile(sourceReference.serializedFile) !== normalizedSerializedFile(prefabReference.serializedFile)
      || renderer.rendererType !== 'SkinnedMeshRenderer'
      || !completeAssemblyPointer(renderer.rootBone)
      || !exactSourcePointerIdentity(renderer.rootBone, sourceReference)
      || !renderer.transformChain?.length
      || renderer.transformChain.some(pointer => !exactSourcePointerIdentity(pointer, sourceReference))
      || !renderer.boneReferences?.length
      || renderer.boneReferences.some(pointer => !exactSourcePointerIdentity(pointer, sourceReference))
      || !ancestry
      || !renderer.hierarchyPath
      || !namesMatchHierarchyPrefix(renderer.hierarchyPath, assembly.root, renderer.transformChain)
      || !renderer.mesh || !renderer.meshSourceReference
      || !pointerMatchesSourceReference(renderer.mesh, renderer.meshSourceReference)
      || !exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex)) return null
    const memberSourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex) ?? []
    if (memberSourceEvidence.some(item => {
      const slot = (renderer.materialSlots ?? []).find(value => value.sourceMaterialReference
        && referenceKey(value.sourceMaterialReference) === referenceKey(item.materialReference))
      return !slot?.material || !pointerMatchesSourceReference(slot.material, item.materialReference)
        || !item.material.shader || !item.material.shaderReference
        || !pointerMatchesSourceReference(item.material.shader, item.shaderReference)
    })) return null
    const key = referenceKey(sourceReference)
    if (referenceKeys.has(key)) return null
    referenceKeys.add(key)
    if (!allPointers(renderer).some(pointer => exactAssemblyPointerMatch(pointer, anchor))) return null

    if (independentEquipmentNameEvidence(renderer, renderer.rootBone ?? null, memberSourceEvidence,
      pointerName(anchor) === STRUCTURAL_EQUIPMENT_ANCHOR_NAME)) {
      hasIndependentRoleEvidence = true
    }
    const decision = classifyRenderer(assembly, renderer, materialIndex, shaderIndex, exactCoreReferences)
    if (decision.kind !== 'core' && decision.kind !== 'excluded') return null
  }
  return hasIndependentRoleEvidence ? referenceKeys : null
}

function structuralEquipmentHierarchyEvidence(
  assembly: InventoryAssembly,
  renderer: InventoryAssemblyRenderer,
  sourceEvidence: ExactSourceMaterialShaderEvidence,
) {
  const rootBone = renderer.rootBone ?? null
  const transformChain = renderer.transformChain ?? []
  const boneReferences = renderer.boneReferences ?? []
  const sourceReference = renderer.sourceReference ?? null
  if (!sourceReference || !renderer.hierarchyPath || !renderer.meshSourceReference || !renderer.mesh) return null
  if (renderer.pathId !== sourceReference.objectId) return null
  if (!completeAssemblyPointer(rootBone)
    || !transformChain.length || transformChain.some(pointer => !completeAssemblyPointer(pointer))
    || !boneReferences.length || boneReferences.some(pointer => !completeAssemblyPointer(pointer))) return null
  const hierarchySegments = normalizedHierarchySegments(renderer.hierarchyPath)
  const chainNames = transformChain.map(pointerName).filter((value): value is string => Boolean(value))
  const rootBoneName = pointerName(rootBone)
  const sourceAncestry = exactSourceRootBoneAncestry(renderer, sourceReference)
  const authoredAncestryNames = [...(rootBoneName ? [rootBoneName] : []), ...chainNames]
  const rootBoneKey = pointerKey(rootBone)
  const hierarchyPrefixMatch = namesMatchHierarchyPrefix(renderer.hierarchyPath, assembly.root, transformChain)
  const equipmentAnchorCandidates = [...boneReferences, ...(sourceAncestry ?? [])]
    .filter(pointer => pointerName(pointer) === STRUCTURAL_EQUIPMENT_ANCHOR_NAME)
    .filter((pointer, index, values) => values.findIndex(value => exactAssemblyPointerMatch(value, pointer)) === index)
  // The anchor is an exact serialized pointer from m_Bones or complete
  // rootBone ancestry, not a name-only hint. Keep it optional for older cases
  // already proven by their rooted transform ancestry.
  if (equipmentAnchorCandidates.length > 1) return null
  const equipmentAnchor = equipmentAnchorCandidates.length === 1 ? equipmentAnchorCandidates[0] : null
  const equipmentAnchorKey = pointerKey(equipmentAnchor)
  const sameNameAnchorCollision = [rootBone, ...transformChain]
    .filter(pointer => pointerName(pointer) === STRUCTURAL_EQUIPMENT_ANCHOR_NAME)
    .some(pointer => pointerKey(pointer) !== equipmentAnchorKey)
  if (sameNameAnchorCollision) return null
  const sourceBoneChainMatch = chainNames.includes('bone_root')
    && chainNames.some(value => isBip001AncestryName(value))
    && chainNames.some(value => value.includes('weapon') || value.includes('turret') || value.includes('grenade') || value.includes('toggle') || value.includes('robot'))
    && hierarchySegments[0] === assembly.root.trim().toLowerCase()
  const sameNamedChainBones = rootBoneName
    ? transformChain.filter(pointer => pointerName(pointer) === rootBoneName)
    : []
  if (sameNamedChainBones.length && !sameNamedChainBones.some(pointer => pointerKey(pointer) === rootBoneKey)) return null
  if (!hierarchyPrefixMatch && !sourceBoneChainMatch) return null
  const serializedFile = sourceReference.serializedFile
  const allPointers = [rootBone, ...transformChain, ...boneReferences]
  if (!allPointers.every(pointer => pointerMatchesSourceFile(pointer, serializedFile, sourceReference.bundleSha256))) return null
  if (!assembly.prefabReference
    || normalizedSerializedFile(assembly.prefabReference.serializedFile) !== normalizedSerializedFile(sourceReference.serializedFile)
    || assembly.prefabReference.bundleSha256.toLowerCase() !== sourceReference.bundleSha256.toLowerCase()) return null
  if (!pointerMatchesSourceReference(renderer.mesh, renderer.meshSourceReference)) return null

  const chainTokens = new Set(transformChain.flatMap(pointer => meaningfulEquipmentTokens(pointer.name)))
  const hierarchyTokens = new Set(hierarchySegments
    .flatMap(value => meaningfulEquipmentTokens(value)))
  const rendererTokens = meaningfulEquipmentTokens(renderer.name)
  // A source shader is intentionally not consulted here. The equipment role
  // must be corroborated by authored renderer/material/mesh/transform names
  // and exact pointer identity, never by shader family or export order alone.
  const equipmentTokens = [...new Set([...rendererTokens, ...chainTokens, ...hierarchyTokens])]
  if (!equipmentTokens.length) return null
  const hasSkeletonAncestry = hierarchySegments.includes('bone_root')
    && hierarchySegments.some(value => isBip001AncestryName(value))
    || authoredAncestryNames.some(value => isBip001AncestryName(value))
    || sourceBoneChainMatch
    // Sena/Aru-shaped prefabs root the renderer at a prop/chain bone, while
    // their exact source m_Bones list still carries Bip001_Weapon.  The
    // source file/path identity and all conflict checks below remain required.
    || Boolean(equipmentAnchor)
  const hasRobotAncestry = hierarchySegments.some(value => value.includes('robot'))
    || chainNames.some(value => value.includes('robot'))
    || Boolean(rootBoneName?.includes('robot'))
  const attachments = (assembly.attachments ?? {}) as Record<string, unknown>
  const hasAuthoredWeaponAttachment = recordArray(attachments.mainWeapon).length > 0
    || recordArray(attachments.subWeapon).length > 0
  const independentEquipmentSemantics = independentEquipmentNameEvidence(renderer, rootBone, sourceEvidence, false)
  const sourceRootBoneAncestryProof = Boolean(sourceAncestry && hierarchyPrefixMatch
    && !hasAuthoredWeaponAttachment && independentEquipmentSemantics)
  if (!hasSkeletonAncestry && !hasRobotAncestry && !sourceRootBoneAncestryProof) return null
  const matchedAncestorPointers = [rootBone, ...transformChain, ...(equipmentAnchor ? [equipmentAnchor] : [])].filter((pointer, index, values) => {
    if (!completeAssemblyPointer(pointer)) return false
    if (pointerName(pointer) === renderer.name.trim().toLowerCase()) return false
    if (pointerName(pointer) === assembly.root.trim().toLowerCase()) return false
    if (values.findIndex(value => pointerKey(value) === pointerKey(pointer)) !== index) return false
    const tokens = meaningfulEquipmentTokens(pointer.name)
    const isRootBone = pointerKey(pointer) === rootBoneKey
    return tokens.length > 0 || (isRootBone && isBip001AncestryName(pointerName(pointer)))
  })
  if (!matchedAncestorPointers.length) return null

  return {
    rootBone,
    transformChain,
    rootBoneAncestry: sourceRootBoneAncestryProof ? sourceAncestry! : [],
    boneReferences,
    matchedAncestorPointers,
    equipmentAnchor,
    equipmentTokens,
    sourceReference,
    sharedBonePointers: [],
    relationKind: 'transform-ancestry' as const,
  }
}

/**
 * Some authored equipment renderers do not expose an attachment constraint or
 * a Bip001-shaped transform ancestry.  A shield can still be source-bound
 * when its serialized m_Bones list shares several exact pointers with the
 * renderer selected by an authored main/sub-weapon relation, while retaining
 * shield-local bones.  This is deliberately stricter than a common ancestor:
 * all source identities, pointer files, relation uniqueness, semantic role,
 * and body separation remain required.
 */
function sharedEquipmentBoneEvidence(
  assembly: InventoryAssembly,
  renderer: InventoryAssemblyRenderer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
): StructuralEquipmentRelationEvidence | null {
  const sourceReference = renderer.sourceReference ?? null
  const prefabReference = assembly.prefabReference ?? null
  const rootBone = renderer.rootBone ?? null
  const transformChain = renderer.transformChain ?? []
  const boneReferences = renderer.boneReferences ?? []
  if (!sourceReference || !prefabReference || !renderer.hierarchyPath || !renderer.meshSourceReference || !renderer.mesh
    || renderer.pathId !== sourceReference.objectId
    || !completeAssemblyPointer(rootBone)
    || transformChain.some(pointer => !completeAssemblyPointer(pointer))
    || boneReferences.length < MIN_SHARED_EQUIPMENT_BONES
    || boneReferences.some(pointer => !completeAssemblyPointer(pointer))) return null
  if (normalizedSerializedFile(sourceReference.serializedFile) !== normalizedSerializedFile(prefabReference.serializedFile)
    || sourceReference.bundleSha256.toLowerCase() !== prefabReference.bundleSha256.toLowerCase()) return null
  if (!pointerMatchesSourceReference(renderer.mesh, renderer.meshSourceReference)) return null
  const sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex)
  if (!sourceEvidence) return null
  const allRendererPointers = [rootBone, ...transformChain, ...boneReferences]
  if (!allRendererPointers.every(pointer => pointerMatchesSourceFile(pointer, sourceReference.serializedFile, sourceReference.bundleSha256))) return null

  const attachment = rendererAttachmentEvidence(assembly, renderer)
  if (attachment.ambiguousEquipment || attachment.ambiguousName) return null
  if (isLikelyBodyRenderer(renderer)) return null

  // The candidate must carry an authored equipment term in its own source
  // renderer/hierarchy/bone identity.  This is a semantic corroboration only;
  // no character name or renderer ID is accepted as a rule key.
  const rendererSemanticValues = [
    renderer.name,
    renderer.hierarchyPath,
    rootBone.name,
    ...transformChain.map(pointer => pointer.name),
    ...boneReferences.map(pointer => pointer.name),
  ]
  const equipmentTokens = [...new Set(rendererSemanticValues.flatMap(value => meaningfulEquipmentTokens(value)))]
  // Do not let a display name or character ID be the only role signal.  The
  // specific token must also occur in serialized bone/root evidence; Hoshino's
  // shield supplies bone_Shield_00 and several bone_Shield_* descendants.
  const sourceSpecificEquipmentTokens = [...new Set([
    rootBone.name,
    ...boneReferences.map(pointer => pointer.name),
  ].flatMap(value => meaningfulEquipmentTokens(value)))]
    .filter(token => SPECIFIC_EQUIPMENT_TOKENS.has(token))
  if (!sourceSpecificEquipmentTokens.length) return null

  const bodyRenderers = assembly.renderers.filter(isLikelyBodyRenderer)
  const candidateBoneKeys = new Set(boneReferences
    .map(pointer => pointerKey(pointer)).filter((key): key is string => Boolean(key)))
  // A shared m_Bones relation must not reuse a body-owned pointer.  Unlike the
  // older ancestry rule, zero body overlap is required because there is no
  // explicit attachment constraint to break the accessory/body ambiguity.
  if (bodyRenderers.some(body => [body.rootBone, ...(body.boneReferences ?? [])]
    .filter(completeAssemblyPointer)
    .some(pointer => candidateBoneKeys.has(pointerKey(pointer) ?? '')
      || exactAssemblyPointerMatch(pointer, rootBone)
      || ambiguousAssemblyPointerCollision(pointer, rootBone)
      || boneReferences.some(candidatePointer => ambiguousAssemblyPointerCollision(pointer, candidatePointer))))) return null

  const seedCandidates = assembly.renderers.filter(seed => {
    if (seed === renderer || seed.visible === false || seed.rendererType !== 'SkinnedMeshRenderer'
      || isLikelyBodyRenderer(seed) || !seed.sourceReference || !seed.rootBone) return false
    if (seed.pathId !== seed.sourceReference.objectId) return false
    if (normalizedSerializedFile(seed.sourceReference.serializedFile) !== normalizedSerializedFile(prefabReference.serializedFile)
      || seed.sourceReference.bundleSha256.toLowerCase() !== prefabReference.bundleSha256.toLowerCase()) return false
    const seedEvidence = exactEquipmentBindingEvidence(assembly, seed, materialIndex, shaderIndex)
    if (!seedEvidence || (seedEvidence.classification !== 'exact-equipment-renderer'
      && seedEvidence.classification !== 'exact-main-sub-equipment')) return false
    if (!seed.mesh || !seed.meshSourceReference || !pointerMatchesSourceReference(seed.mesh, seed.meshSourceReference)) return false
    const seedBones = seed.boneReferences ?? []
    const seedTransformChain = seed.transformChain ?? []
    return completeAssemblyPointer(seed.rootBone)
      && seedBones.length >= MIN_SHARED_EQUIPMENT_BONES
      && seedBones.every(pointer => completeAssemblyPointer(pointer))
      && seedTransformChain.every(pointer => completeAssemblyPointer(pointer))
      && [seed.rootBone, ...seedTransformChain, ...seedBones].every(pointer =>
        pointerMatchesSourceFile(pointer, seed.sourceReference!.serializedFile, seed.sourceReference!.bundleSha256))
  })
  if (!seedCandidates.length) return null

  const relations = seedCandidates.map(seed => {
    const seedBones = seed.boneReferences ?? []
    const sharedPointers = boneReferences.filter(pointer =>
      seedBones.some(seedPointer => exactAssemblyPointerMatch(pointer, seedPointer)))
      .filter((pointer, index, values) => {
        const key = pointerKey(pointer)
        return Boolean(key) && values.findIndex(value => pointerKey(value) === key) === index
      })
    return { seed, sharedPointers }
  }).filter(relation => relation.sharedPointers.length >= MIN_SHARED_EQUIPMENT_BONES)
  // Multiple exact authored seeds would make the shared relation ambiguous.
  if (relations.length !== 1) return null
  const { seed, sharedPointers } = relations[0]
  if (exactAssemblyPointerMatch(rootBone, seed.rootBone)
    || ambiguousAssemblyPointerCollision(rootBone, seed.rootBone)) return null

  const sharedKeys = new Set(sharedPointers
    .map(pointer => pointerKey(pointer)).filter((key): key is string => Boolean(key)))
  const localBonePointers = boneReferences.filter(pointer => !sharedKeys.has(pointerKey(pointer) ?? ''))
  if (!localBonePointers.length) return null

  // A second visible SkinnedMeshRenderer with the same exact relation would
  // leave body/accessory ownership unresolved, so keep both candidates blocked.
  const competingRelations = assembly.renderers.filter(other => other !== renderer && other !== seed
    && other.visible !== false
    && other.rendererType === 'SkinnedMeshRenderer'
    && !isLikelyBodyRenderer(other)
    && (other.boneReferences ?? []).filter(completeAssemblyPointer)
      .some(pointer => sharedKeys.has(pointerKey(pointer) ?? ''))
    && sharedPointers.every(pointer => (other.boneReferences ?? [])
      .filter(completeAssemblyPointer)
      .some(otherPointer => exactAssemblyPointerMatch(pointer, otherPointer)
        || ambiguousAssemblyPointerCollision(pointer, otherPointer))))
  if (competingRelations.length > 0) return null

  const matchedAncestorPointers = [...sharedPointers]
    .sort((left, right) => (pointerKey(left) ?? '').localeCompare(pointerKey(right) ?? ''))
  return {
    rootBone,
    transformChain,
    rootBoneAncestry: [],
    boneReferences,
    matchedAncestorPointers,
    equipmentAnchor: null,
    equipmentTokens,
    sourceReference,
    sharedBonePointers: matchedAncestorPointers,
    relationKind: 'shared-equipment-mBones',
  }
}

function rendererUsesExactAssemblyPointer(renderer: InventoryAssemblyRenderer, pointer: InventoryAssemblyPointer) {
  const key = pointerKey(pointer)
  return Boolean(key && [renderer.rootBone, ...(renderer.transformChain ?? []), ...(rootBoneAncestry(renderer) ?? []), ...(renderer.boneReferences ?? [])]
    .filter(completeAssemblyPointer)
    .some(value => pointerKey(value) === key))
}

function rendererUsesExactRigMountPointer(renderer: InventoryAssemblyRenderer, pointer: InventoryAssemblyPointer) {
  const key = pointerKey(pointer)
  return Boolean(key && [renderer.rootBone, ...(renderer.transformChain ?? []), ...(rootBoneAncestry(renderer) ?? [])]
    .filter(completeAssemblyPointer)
    .some(value => pointerKey(value) === key))
}

function rendererUsesExactAttachmentPointer(renderer: InventoryAssemblyRenderer, pointer: InventoryAssemblyPointer) {
  return [renderer.rootBone, ...(renderer.transformChain ?? []), ...(rootBoneAncestry(renderer) ?? []), ...(renderer.boneReferences ?? [])]
    .filter(completeAssemblyPointer)
    .some(value => exactAssemblyPointerMatch(value, pointer))
}

function rendererSourcePointerKeys(renderer: InventoryAssemblyRenderer) {
  // Transform/ancestry pointers identify the shared prefab hierarchy and are
  // expected to overlap between a primary weapon and a secondary prop.  Only
  // the renderer's root and bound skeleton pointers establish an interaction
  // claim that can make the secondary renderer ambiguous.
  return new Set([
    renderer.rootBone,
    ...(renderer.boneReferences ?? []),
  ].filter(completeAssemblyPointer).map(pointerKey).filter((key): key is string => Boolean(key)))
}

function isLikelyBodyRenderer(renderer: InventoryAssemblyRenderer) {
  if (renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer') return false
  const nameTokens = sourceSemanticTokens(renderer.name)
  const bodyName = ['body', 'face', 'hair', 'head', 'skin', 'clothing', 'outfit', 'uniform', 'character']
    .some(token => nameTokens.has(token))
  if (bodyName) return true
  const hierarchyTokens = sourceSemanticTokens(renderer.hierarchyPath ?? '')
  if ([...hierarchyTokens].some(token => MEANINGFUL_EQUIPMENT_TOKENS.has(token))) return false
  return ['body', 'face', 'hair', 'head', 'skin', 'clothing', 'outfit', 'uniform', 'character']
    .some(token => hierarchyTokens.has(token))
}

function structuralEquipmentBindingEvidence(
  candidate: SourceCandidate,
  assembly: InventoryAssembly | undefined,
  renderer: InventoryAssemblyRenderer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
): RenderingProfileEquipmentBindingEvidence | null {
  if (!assembly || renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer') return null
  const attachment = rendererAttachmentEvidence(assembly, renderer)
  if (attachment.ambiguousEquipment || attachment.ambiguousName) return null
  const sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex)
  if (!sourceEvidence || !renderer.meshSourceReference) return null
  // Verify the serialized mesh/material/shader pointers as well as their full
  // source identities.  A source reference copied onto a different pointer is
  // not structural proof.
  if (!renderer.mesh || renderer.mesh.pathId !== renderer.meshSourceReference.objectId
    || normalizedSerializedFile(renderer.mesh.file) !== normalizedSerializedFile(renderer.meshSourceReference.serializedFile)) return null
  for (const item of sourceEvidence) {
    const slot = (renderer.materialSlots ?? []).find(value => value.sourceMaterialReference
      && referenceKey(value.sourceMaterialReference) === referenceKey(item.materialReference))
    if (!slot?.material || !pointerMatchesSourceReference(slot.material, item.materialReference)
      || !item.material.shader || !item.material.shaderReference
      || !pointerMatchesSourceReference(item.material.shader, item.shaderReference)) return null
  }
  const sourceWeaponAncestorEvidence = exactSourceWeaponAncestorEvidence(assembly, renderer)
  const hierarchyEvidence = sourceWeaponAncestorEvidence ? null
    : structuralEquipmentHierarchyEvidence(assembly, renderer, sourceEvidence)
  const sharedBoneEvidence = sourceWeaponAncestorEvidence || hierarchyEvidence ? null
    : sharedEquipmentBoneEvidence(assembly, renderer, materialIndex, shaderIndex)
  const relationEvidence: StructuralEquipmentRelationEvidence | null = sourceWeaponAncestorEvidence ?? hierarchyEvidence ?? sharedBoneEvidence
  if (!relationEvidence) return null
  const validatedAnchorGroupReferences = relationEvidence.equipmentAnchor
    ? structurallyValidatedAnchorGroupReferences(candidate, assembly, relationEvidence.equipmentAnchor, materialIndex, shaderIndex)
    : null
  relationEvidence.validatedAnchorGroupReferences = validatedAnchorGroupReferences ?? undefined
  const bodyRenderers = assembly.renderers.filter(isLikelyBodyRenderer)
  const rendererStructuralPointers = [
    relationEvidence.rootBone,
    ...relationEvidence.transformChain,
    ...relationEvidence.rootBoneAncestry,
    ...relationEvidence.boneReferences,
  ].filter(completeAssemblyPointer)
  const rendererPointerKeys = new Set(rendererStructuralPointers.map(pointer => pointerKey(pointer)).filter((key): key is string => Boolean(key)))
  const bodyOverlaps = bodyRenderers.map(body => {
    const overlap = (body.boneReferences ?? []).filter(completeAssemblyPointer)
      .filter(pointer => rendererPointerKeys.has(pointerKey(pointer) ?? ''))
    return { body, overlap }
  }).filter(item => item.overlap.length > 0)
  // A Bip001_Weapon pointer from m_Bones or complete rootBone ancestry is
  // usable only when no body or unvalidated renderer group claims that exact
  // serialized pointer. Compare identity, never the transform name alone.
  if (relationEvidence.equipmentAnchor) {
    const bodySharingAnchor = bodyRenderers.filter(body => body !== renderer
      && rendererUsesExactAssemblyPointer(body, relationEvidence.equipmentAnchor!))
    const competingSharingAnchor = assembly.renderers.filter(other => other !== renderer
      && other.visible !== false
      && rendererUsesExactAssemblyPointer(other, relationEvidence.equipmentAnchor!))
    if (bodySharingAnchor.length > 0 || competingSharingAnchor.some(other => {
      const reference = sourceRendererReference(other)
      return !reference || !validatedAnchorGroupReferences?.has(referenceKey(reference))
    })) return null
  }
  // A body m_Bones overlap is useful corroboration when present, but it is
  // not required: Maki/Hibiki's authored weapon skins have a distinct bone
  // list even though their root/transform ancestry is inside the same prefab
  // rig.  Multiple overlapping body rigs remain a conflict; zero overlap is
  // safe only when the source hierarchy proof above is complete.
  if (bodyOverlaps.length > 1
    || (relationEvidence.relationKind === 'shared-equipment-mBones' && bodyOverlaps.length > 0)) return null
  if (relationEvidence.relationKind === 'exact-source-weapon-ancestry'
    && relationEvidence.matchedAncestorPointers.some(pointer => bodyRenderers.some(body => rendererUsesExactAssemblyPointer(body, pointer)))) return null

  const structuralAnchorPointers = [
    relationEvidence.rootBone,
    ...relationEvidence.matchedAncestorPointers,
  ].filter(pointer => completeAssemblyPointer(pointer)
    && (relationEvidence.relationKind === 'shared-equipment-mBones'
      || relationEvidence.relationKind === 'exact-source-weapon-ancestry'
      || meaningfulEquipmentTokens(pointer.name).length > 0))
  const structuralAnchorKeys = new Set(structuralAnchorPointers
    .map(pointer => pointerKey(pointer)).filter((key): key is string => Boolean(key)))
  const relationPointers = relationEvidence.relationKind === 'shared-equipment-mBones'
    ? []
    : bodyOverlaps[0]?.overlap.filter(pointer => structuralAnchorKeys.has(pointerKey(pointer) ?? '')) ?? []
  const relationKeys = new Set(structuralAnchorKeys)
  // A secondary weapon renderer may share the exact authored mainWeapon
  // ancestor with the primary weapon renderer.  That is one source anchor,
  // not an ambiguous second relation; only a separately exact renderer
  // reference is exempted.  Name-only or partial-identity siblings remain
  // competing claims and fail closed.
  const competingRenderers = assembly.renderers.filter(other => other !== renderer
    && other.visible !== false
    && other.rendererType === 'SkinnedMeshRenderer'
    && (relationEvidence.relationKind === 'exact-source-weapon-ancestry' || !isLikelyBodyRenderer(other))
    && [other.rootBone, ...(other.transformChain ?? []), ...(rootBoneAncestry(other) ?? [])]
      .some(pointer => completeAssemblyPointer(pointer) && relationKeys.has(pointerKey(pointer) ?? ''))
    && !(validatedAnchorGroupReferences?.has(referenceKey(sourceRendererReference(other))) ?? false)
    && !(relationEvidence.relationKind === 'exact-source-weapon-ancestry'
      && rendererAttachmentEvidence(assembly, other).exactRenderer
      && relationEvidence.matchedAncestorPointers.some(pointer => rendererUsesExactAssemblyPointer(other, pointer))))
  if (competingRenderers.length > 0) return null

  const sourceMaterialReferences = sourceEvidence.map(item => item.materialReference)
  const sourceShaderReferences = sourceEvidence.map(item => item.shaderReference)
  const sourceName = renderer.hierarchyPath ?? renderer.name
  const matchedAncestorPointers = [...relationEvidence.matchedAncestorPointers]
    .sort((left, right) => (pointerKey(left) ?? '').localeCompare(pointerKey(right) ?? ''))
  const bodyRendererReferences = bodyOverlaps.length === 1 && bodyOverlaps[0].body.sourceReference
    ? [bodyOverlaps[0].body.sourceReference] : []
  const evidence = [
    `exact source renderer reference ${referenceKey(renderer.sourceReference)}`,
    `exact source mesh reference ${referenceKey(renderer.meshSourceReference)}`,
    ...sourceMaterialReferences.map(value => `exact source material reference ${referenceKey(value)}`),
    ...sourceShaderReferences.map(value => `exact source shader reference ${referenceKey(value)}`),
    relationEvidence.relationKind === 'shared-equipment-mBones'
      ? `source m_Bones shares ${relationEvidence.sharedBonePointers.length} exact serialized pointer(s) with the authored equipment renderer`
      : relationEvidence.relationKind === 'exact-source-weapon-ancestry'
        ? 'source rootBone.m_Father ancestry reaches exactly one authored mainWeapon/subWeapon pointer'
      : relationEvidence.rootBoneAncestry.length > 0
        ? 'complete exact source rootBone.m_Father ancestry reaches the selected prefab transform root'
      : `source transform ancestry is rooted at ${assembly.root}`,
    `source transform/rootBone/bones share the selected prefab serialized file ${normalizedSerializedFile(renderer.sourceReference!.serializedFile)}`,
    ...(relationEvidence.equipmentAnchor
      ? [`exact same-prefab Bip001_Weapon m_Bones anchor ${pointerKey(relationEvidence.equipmentAnchor)}`]
      : []),
    relationEvidence.relationKind === 'shared-equipment-mBones'
      ? `shared equipment m_Bones pointer(s): ${matchedAncestorPointers.map(pointer => `${pointer.name} (${pointerKey(pointer)})`).join(', ')}`
      : relationEvidence.relationKind === 'exact-source-weapon-ancestry'
        ? `exact authored weapon ancestor: ${matchedAncestorPointers.map(pointer => `${pointer.name} (${pointerKey(pointer)})`).join(', ')}`
      : `equipment ancestor pointer(s): ${matchedAncestorPointers.map(pointer => `${pointer.name} (${pointerKey(pointer)})`).join(', ')}`,
    relationPointers.length
      ? `body m_Bones overlap: ${relationPointers.map(pointer => `${pointer.name} (${pointerKey(pointer)})`).join(', ')}`
      : relationEvidence.relationKind === 'shared-equipment-mBones'
        ? 'body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement'
        : relationEvidence.relationKind === 'exact-source-weapon-ancestry'
          ? 'body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique'
          : 'body m_Bones overlap: none; source hierarchy independently corroborates movement',
    relationEvidence.relationKind === 'shared-equipment-mBones'
      ? 'unique non-conflicting same-prefab shared m_Bones relation'
      : relationEvidence.relationKind === 'exact-source-weapon-ancestry'
        ? 'unique non-conflicting full-source weapon ancestor relation'
      : 'unique non-conflicting same-prefab transform/bone relation',
  ]
  return {
    classification: 'structurally-bound-equipment',
    reasonCode: relationEvidence.relationKind === 'exact-source-weapon-ancestry'
      ? 'EXACT_SOURCE_WEAPON_ANCESTRY'
      : 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY',
    reason: relationEvidence.relationKind === 'exact-source-weapon-ancestry'
      ? `Source rootBone.m_Father ancestry reaches exactly one full-identity mainWeapon/subWeapon pointer for ${sourceName}.`
      : relationEvidence.relationKind === 'shared-equipment-mBones'
      ? `Source-authored m_Bones prove a unique same-prefab equipment relation for ${sourceName}; no mainWeapon/subWeapon slot was inferred.`
      : `Source-authored transform/rootBone/bones prove a unique same-prefab equipment ancestry for ${sourceName}; no mainWeapon/subWeapon slot was inferred.`,
    sourceReference: renderer.sourceReference!,
    name: renderer.name,
    hierarchyPath: renderer.hierarchyPath ?? null,
    sourceMeshReference: renderer.meshSourceReference!,
    sourceMaterialReferences,
    sourceShaderReferences,
    rootBone: cloneAssemblyPointer(relationEvidence.rootBone),
    transformChain: cloneAssemblyPointers(relationEvidence.transformChain),
    rootBoneAncestry: cloneAssemblyPointersWithSource(relationEvidence.rootBoneAncestry),
    boneReferences: cloneAssemblyPointers(relationEvidence.boneReferences),
    matchedAncestorPointers: cloneAssemblyPointers(matchedAncestorPointers),
    bodyRendererReferences,
    evidence: [...new Set(evidence)],
  }
}

function exactEquipmentBindingEvidence(
  assembly: InventoryAssembly | undefined,
  renderer: InventoryAssemblyRenderer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
): RenderingProfileEquipmentBindingEvidence | null {
  if (!renderer.sourceReference) return null
  const attachment = rendererAttachmentEvidence(assembly, renderer)
  if (!attachment.exactRenderer && !attachment.attachedBone) return null
  const sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex)
  const sourceMaterialReferences = sourceEvidence?.map(item => item.materialReference) ?? []
  const sourceShaderReferences = sourceEvidence?.map(item => item.shaderReference) ?? []
  const exactRenderer = attachment.exactRenderer
  const classification = exactRenderer ? 'exact-equipment-renderer' as const : 'exact-main-sub-equipment' as const
  const reasonCode = exactRenderer
    ? 'EXACT_EQUIPMENT_RENDERER_REFERENCE' as const
    : 'EXACT_MAIN_SUB_ATTACHMENT_POINTER' as const
  const reason = exactRenderer
    ? 'Exact equipmentRendererReferences source identity selects this renderer.'
    : 'Exact mainWeapon/subWeapon source pointer selects this renderer; no slot was fabricated.'
  const evidence = [
    `exact source renderer reference ${referenceKey(renderer.sourceReference)}`,
    ...(renderer.meshSourceReference ? [`exact source mesh reference ${referenceKey(renderer.meshSourceReference)}`] : []),
    ...sourceMaterialReferences.map(value => `exact source material reference ${referenceKey(value)}`),
    ...sourceShaderReferences.map(value => `exact source shader reference ${referenceKey(value)}`),
    ...attachment.exactGroupEvidence,
    reason,
  ]
  return {
    classification,
    reasonCode,
    reason,
    sourceReference: renderer.sourceReference,
    name: renderer.name,
    hierarchyPath: renderer.hierarchyPath ?? null,
    sourceMeshReference: renderer.meshSourceReference ?? null,
    sourceMaterialReferences,
    sourceShaderReferences,
    rootBone: cloneAssemblyPointer(renderer.rootBone),
    transformChain: cloneAssemblyPointers(renderer.transformChain),
    rootBoneAncestry: [],
    boneReferences: cloneAssemblyPointers(renderer.boneReferences),
    matchedAncestorPointers: [],
    bodyRendererReferences: [],
    evidence: [...new Set(evidence)],
  }
}

function missingEquipmentRelationBlocker(
  assembly: InventoryAssembly | undefined,
  renderer: InventoryAssemblyRenderer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
  bindingEvidence?: RenderingProfileEquipmentBindingEvidence,
): RenderingProfileCoreRendererBlocker | null {
  if (renderer.visible === false || !renderer.sourceReference) return null
  const attachment = rendererAttachmentEvidence(assembly, renderer)
  // An exact renderer or source-bone relation is authoritative.  Ambiguity is
  // already emitted by the inventory attachment diagnostics and must remain a
  // blocker, but does not need a duplicate semantic blocker here.
  if (attachment.exactRenderer || attachment.attachedBone || attachment.ambiguousEquipment || attachment.ambiguousName
    || (bindingEvidence?.classification === 'structurally-bound-equipment'
      && !isSourcePinnedRigMountEvidence(bindingEvidence))) return null
  if (bindingEvidence && isSourcePinnedRigMountEvidence(bindingEvidence)
    && bindingEvidence.sourceMeshReference) {
    return {
      sourceReference: bindingEvidence.sourceReference,
      name: bindingEvidence.name,
      hierarchyPath: bindingEvidence.hierarchyPath,
      reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
      evidence: [...bindingEvidence.evidence, 'source-pinned group is core equipment, but no authored main/sub slot specifies its arrangement'],
      sourceMeshReference: bindingEvidence.sourceMeshReference,
      sourceMaterialReferences: bindingEvidence.sourceMaterialReferences,
      sourceShaderReferences: bindingEvidence.sourceShaderReferences,
    }
  }
  const sourceMaterials = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex)
  if (!sourceMaterials) return null

  const semanticSignals: string[] = []
  const rendererTokens = meaningfulRendererNameTokens(renderer)
  if (rendererTokens.length) semanticSignals.push(`renderer name has authored equipment term(s): ${rendererTokens.join(', ')}`)
  const materialTokens = [...new Set(sourceMaterials.flatMap(item => meaningfulEquipmentTokens(item.material.name)))]
  if (materialTokens.length) semanticSignals.push(`source material name has authored equipment term(s): ${materialTokens.join(', ')}`)
  const shaderTokens = [...new Set(sourceMaterials
    .filter(item => weaponShaderIdentity(item.shader.parsedName ?? item.shader.name))
    .map(item => item.shader.parsedName ?? item.shader.name)
    .filter((value): value is string => Boolean(value)))]
  if (shaderTokens.length) semanticSignals.push(`source shader is an authored weapon family: ${shaderTokens.join(', ')}`)
  const namedPointers = [renderer.rootBone, ...(renderer.transformChain ?? []), ...(renderer.boneReferences ?? [])]
    .map(pointer => pointer?.name ?? null)
    .filter((value): value is string => Boolean(value))
  const pointerTokens = [...new Set(namedPointers.flatMap(value => meaningfulEquipmentTokens(value)))]
  if (pointerTokens.length) semanticSignals.push(`source attachment/bone names have authored equipment term(s): ${pointerTokens.join(', ')}`)
  const meshTokens = meaningfulEquipmentTokens((renderer.mesh as (InventoryPointer & { name?: string }) | null | undefined)?.name)
  if (meshTokens.length) semanticSignals.push(`source mesh name has authored equipment term(s): ${meshTokens.join(', ')}`)

  const specificName = [...new Set([...rendererTokens, ...materialTokens, ...pointerTokens, ...meshTokens])]
    .some(token => SPECIFIC_EQUIPMENT_TOKENS.has(token))
  const hasIndependentSemanticSignal = semanticSignals.length >= 2
    || (specificName && renderer.rendererType === 'SkinnedMeshRenderer'
      && (renderer.boneReferences?.length ?? 0) > 0)
  if (!rendererTokens.length || !hasIndependentSemanticSignal) return null

  const sourceMaterialReferences = sourceMaterials.map(item => item.materialReference)
  const sourceShaderReferences = sourceMaterials.map(item => item.shaderReference)
  const evidence = [
    `exact source renderer reference ${referenceKey(renderer.sourceReference)}`,
    `exact source mesh reference ${referenceKey(renderer.meshSourceReference)}`,
    ...sourceMaterialReferences.map(value => `exact source material reference ${referenceKey(value)}`),
    ...sourceShaderReferences.map(value => `exact source shader reference ${referenceKey(value)}`),
    ...semanticSignals,
    'selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer',
  ]
  return {
    sourceReference: renderer.sourceReference,
    name: renderer.name,
    hierarchyPath: renderer.hierarchyPath ?? null,
    reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
    evidence: [...new Set(evidence)],
    sourceMeshReference: renderer.meshSourceReference!,
    sourceMaterialReferences,
    sourceShaderReferences,
  }
}

/**
 * A warning is allowed only for a complete source inventory observation.  An
 * authored main/sub slot must select a different renderer by exact source
 * identity; the unresolved renderer must not claim any of those exact source
 * pointers or share a source skeleton pointer with the selected renderer.
 * This is deliberately pointer-based: renderer/display names are never role
 * evidence. Independently animated source-complete props remain core content;
 * uncertain placement is represented by a warning instead of a missing-core
 * failure.
 */
function arrangementOnlyAttachmentEvidence(
  candidate: SourceCandidate,
  assembly: InventoryAssembly | undefined,
  renderer: InventoryAssemblyRenderer | undefined,
  blocker: RenderingProfileCoreRendererBlocker,
  interaction: ChibiProfile,
  equipmentBindingEvidence: RenderingProfileEquipmentBindingEvidence[],
  requireDisjointSourceBranches = false,
) {
  if (!assembly || !renderer || renderer.visible === false || !renderer.sourceReference) return false
  // An authored child-renderer event makes the renderer part of an action's
  // interaction contract.  It is core even when the event itself is benign;
  // only presentation renderers already excluded above may be event targets.
  if (candidate.events.some(event => event.targetReference
    && referenceKey(event.targetReference) === referenceKey(blocker.sourceReference))) return false

  const attachments = assembly.attachments
  const exactEquipmentReferences = new Set((attachments.equipmentRendererReferences ?? []).map(referenceKey))
  const exactGroups = attachments.equipmentRendererGroups ?? []
  const ambiguities = attachments.equipmentRendererAmbiguities ?? []
  const mainSubPointers = [...(attachments.mainWeapon ?? []), ...(attachments.subWeapon ?? [])]
    .filter(completeAssemblyPointer)
  const ancestry = rootBoneAncestry(renderer)
  // Source-extracted renderers carry an explicit ancestry array.  Hand-built
  // name-only/partial fixtures do not, and must remain fail-closed.
  if (!ancestry || !rootBoneAncestryComplete(renderer)) return false
  const prefabReference = assembly.prefabReference
  if (!prefabReference
    || prefabReference.bundleSha256.toLowerCase() !== renderer.sourceReference.bundleSha256.toLowerCase()
    || normalizedSerializedFile(prefabReference.serializedFile) !== normalizedSerializedFile(renderer.sourceReference.serializedFile)) return false
  const rendererPointers = [
    renderer.rootBone,
    ...(renderer.transformChain ?? []),
    ...ancestry,
    ...(renderer.boneReferences ?? []),
  ].filter(completeAssemblyPointer)
  if (!rendererPointers.every(pointer => pointerMatchesSourceFile(
    pointer,
    renderer.sourceReference!.serializedFile,
    renderer.sourceReference!.bundleSha256,
  ))) return false
  const ancestryKeys = ancestry.map(pointerKey).filter((key): key is string => Boolean(key))
  if (new Set(ancestryKeys).size !== ancestryKeys.length) return false
  // A nonempty ancestry claim must be a valid, ordered source parent chain;
  // malformed or cyclic claims cannot become publishable as loose placement.
  // Legacy inventories with an explicitly empty complete chain may retain the
  // original arrangement-warning path, but do not count as structural proof.
  if (ancestry.length > 0) {
    if (!exactSourceRootBoneAncestry(renderer, renderer.sourceReference)) return false
  }

  if (exactEquipmentReferences.size === 0) {
    if (requireDisjointSourceBranches) return false
    // Keep the previously accepted sole-arrangement case, but require the
    // extractor's complete ancestry evidence so an arbitrary named renderer
    // cannot be relaxed into a warning.
    if (exactGroups.length > 0 || ambiguities.length > 0 || mainSubPointers.length > 0) return false
    // A shared exact Bip001_Weapon mount is a renderer group, not a sole prop.
    const sharedRigMountAnchors = [renderer.rootBone, ...(renderer.boneReferences ?? []), ...(ancestry ?? [])]
      .filter((pointer): pointer is InventoryAssemblyPointer => completeAssemblyPointer(pointer)
        && pointerName(pointer) === STRUCTURAL_EQUIPMENT_ANCHOR_NAME)
    if (sharedRigMountAnchors.some(anchor => assembly.renderers.some(other => other !== renderer
      && other.rendererType === 'SkinnedMeshRenderer' && !isLikelyBodyRenderer(other)
      && other.enabled !== false && other.gameObjectActive !== false && other.visible !== false
      && rendererUsesExactRigMountPointer(other, anchor)))) return false
    // A complete source ancestry rooted at the generic Bip001 weapon slot is
    // still compatible with the missing primary attachment itself.  Keep it
    // fail-closed unless a second, source-exact semantic signal identifies a
    // distinct prop/equipment role in the exact root/m_Bones pointers.  A
    // display name alone is never sufficient, even when accompanied by exact
    // mesh/material/shader evidence in the blocker.
    if (candidate.sourceIdentity === SAORI_HANDGUN_SOURCE.identity
      && referenceKey(blocker.sourceReference) === referenceKey(saoriSourceReference(SAORI_HANDGUN_SOURCE.renderer))) {
      return exactSaoriHandgunArrangementEvidence(candidate, assembly, renderer, blocker, interaction, equipmentBindingEvidence)
    }
    const rootName = pointerName(renderer.rootBone) ?? ''
    const genericWeaponAnchor = /^(?:bip001[_\s-]*)?weapon\d*$/.test(rootName)
      || /^bone[_\s-]*weapon\d*$/.test(rootName)
    const sourceRoleTokens = new Set([
      ...[renderer.rootBone, ...(renderer.boneReferences ?? [])]
        .flatMap(pointer => meaningfulEquipmentTokens(pointer?.name)),
    ])
    if (genericWeaponAnchor && [...sourceRoleTokens].every(token => token === 'weapon')) {
      return false
    }
    return true
  }

  // Competing evidence is safe to relax only when all exact equipment refs
  // resolve to renderers selected by authored main/sub pointers.  This also
  // rejects an unrelated exact equipment renderer, promoted group, or
  // ambiguity from changing the unresolved renderer's role.
  if (exactGroups.length > 0 || ambiguities.length > 0 || mainSubPointers.length === 0) return false
  const primaryRenderers = assembly.renderers.filter(item => item.sourceReference
    && exactEquipmentReferences.has(referenceKey(item.sourceReference))
    && mainSubPointers.some(pointer => rendererUsesExactAttachmentPointer(item, pointer)))
  if (primaryRenderers.length !== exactEquipmentReferences.size) return false
  if (primaryRenderers.some(item => {
    const itemPointers = [
      item.rootBone,
      ...(item.transformChain ?? []),
      ...(rootBoneAncestry(item) ?? []),
      ...(item.boneReferences ?? []),
    ].filter(completeAssemblyPointer)
    const valid = itemPointers.every(pointer => pointerMatchesSourceFile(
      pointer,
      renderer.sourceReference!.serializedFile,
      renderer.sourceReference!.bundleSha256,
    ))
    return !valid
  })) return false

  // The unresolved renderer must be outside every authored main/sub slot and
  // outside the exact source pointer set claimed by the selected renderer.
  const unresolvedUsesSlot = mainSubPointers.some(pointer => rendererUsesExactAttachmentPointer(renderer, pointer))
  if (unresolvedUsesSlot) return false
  const primaryPointerKeys = new Set(primaryRenderers.flatMap(item => [...rendererSourcePointerKeys(item)]))
  const unresolvedPointerKeys = rendererSourcePointerKeys(renderer)
  const sharedPointer = [...unresolvedPointerKeys].some(key => primaryPointerKeys.has(key))
  if (sharedPointer) return false
  if (requireDisjointSourceBranches
    && (!candidateIdentityMatchesPrefabRoot(candidate, assembly)
      || !primaryRenderers.every(primary => exactSiblingSourceAttachmentBranches(
        assembly, renderer, primary, renderer.sourceReference!,
      )))) return false
  return true
}

const SAORI_HANDGUN_SOURCE = {
  identity: 'saori_original',
  fingerprint: 'e574e7726600205d3fdefca7d0a1571308a59dd7d835acbd7a8a65c7ffa7af18',
  prefabPath: 'Assets/_MX/AddressableAsset/Character/Saori_Original/Cafe/Cafe_Saori_Original.prefab',
  prefab: { bundle: '7ba7cca28f2476e9eb45e94fd2a1650a3283dad032cbb0b7935c4378a386ba8b', file: 'CAB-cabd5b23b8e28f49693a21ea244a9291', id: '762141233893454283' },
  renderer: { bundle: '7ba7cca28f2476e9eb45e94fd2a1650a3283dad032cbb0b7935c4378a386ba8b', file: 'CAB-cabd5b23b8e28f49693a21ea244a9291', id: '6419381600630976971' },
  mesh: { bundle: '8dd6133bfa2e20b4367b71c7fcc724265bc9b24d0acb213a47e0759d7e6c040f', file: 'CAB-9e80f5ab3212d8f6775176559faf5d5f', id: '-5266263958877296907' },
  material: { bundle: '785a3600756e5ede27609c590136bf727dae7a14727e2a2ccdbcf682860e7bf3', file: 'CAB-44ff3e38183570343e0de2bef251bb93', id: '-3549401849822603767' },
  shader: { bundle: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c', file: 'CAB-428091522b4007f213bf16532c4528a1', id: '-301851123381183171' },
  primary: {
    renderer: { bundle: '7ba7cca28f2476e9eb45e94fd2a1650a3283dad032cbb0b7935c4378a386ba8b', file: 'CAB-cabd5b23b8e28f49693a21ea244a9291', id: '7518749120114766283' },
    mesh: { bundle: '8dd6133bfa2e20b4367b71c7fcc724265bc9b24d0acb213a47e0759d7e6c040f', file: 'CAB-9e80f5ab3212d8f6775176559faf5d5f', id: '-3011508986878861753' },
    bone: { bundle: '7ba7cca28f2476e9eb45e94fd2a1650a3283dad032cbb0b7935c4378a386ba8b', file: 'CAB-cabd5b23b8e28f49693a21ea244a9291', id: '2914297892506939851' },
  },
  cafeRoot: { id: '4595875760711446987', name: 'Cafe_Saori_Original' },
  boneRoot: { id: '1676013754709553611', name: 'bone_root' },
  bip001: { id: '5407838024976937419', name: 'Bip001' },
  handgunRoot: { id: '-4468891664348106293', name: 'bone_Weapon' },
  handgunObject: { id: '4359557592397165003', name: 'Saori_Original_Handgun' },
  handgunMagazine: { id: '-1446589435792870965', name: 'bone_magazine_02' },
  primaryObject: { id: '4050732926595609035', name: 'Saori_Original_Weapon' },
  primaryMagazine: { id: '-7141742032385691189', name: 'bone_magazine' },
  primaryButtstock: { id: '-6946566419896684085', name: 'bone_buttstock' },
  actions: {
    idle: 'Saori_Original_Cafe_Idle',
    walk: 'Saori_Original_Cafe_Walk',
    pickup: 'Saori_Original_Formation_Pickup',
    touch: 'Saori_Original_Cafe_Reaction',
  },
} as const

const SAORI_SWIMSUIT_SOURCE = {
  identity: 'ch0266',
  fingerprint: 'c2dda9fce74ba470a510e0cdab930844eff876ad62150254bcf3cefdfb495db9',
  prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0266/Cafe/Cafe_CH0266.prefab',
  prefabBundle: '325bc4b3f67c1fe59260ca66cb5068d109c193dc4a662e77c8c2084f56063ffd',
  prefabFile: 'CAB-e9f5532a8838fb49b9656938014567f9',
  prefabId: '-966698776056933583',
  prefabEntry: {
    path: 'character-ch0266-_mxload-prefabs-2025-07-02_assets_all_730862125.bundle',
    sha256: '325bc4b3f67c1fe59260ca66cb5068d109c193dc4a662e77c8c2084f56063ffd',
  },
  animationEntry: {
    path: 'assets-_mx-characters-ch0266-_mxdependency-animationclips-2025-07-02_assets_all_4116423300.bundle',
    sha256: '7981a3a87b7b87124d78faffe882068410096b18526e70f451613964ab504c6e',
  },
  meshBundle: 'b493920b164a41237b76ab169664d48fe555d6d643a2ce02ffcfe708a77967f1',
  meshFile: 'CAB-fb6b24084a8dc8864efbed7e547be16d',
  materialBundle: '17fca11c00f7e6869df3fe4ffbd2ffa0185513ee45607a2a1e32978ac916a742',
  materialFile: 'CAB-fbd047797f16a6e5ae0e213d5ef5d0f1',
  shader: { bundle: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c', file: 'CAB-428091522b4007f213bf16532c4528a1', id: '-301851123381183171' },
  cafeRoot: { id: '-4935885727765736655', name: 'Cafe_CH0266' },
  boneRoot: { id: '-3331984808089726159', name: 'bone_root' },
  bip001: { id: '-2444008407112264911', name: 'Bip001' },
  primary: {
    renderer: '-7932837843349318863', mesh: '3018830693475326235',
    object: { id: '8608833642075542321', name: 'Saori_Original_Weapon' },
    bone: { id: '5129663882940535601', name: 'Bip001_Weapon' },
    bones: [
      { id: '5129663882940535601', name: 'Bip001_Weapon' },
      { id: '-4925961543699705039', name: 'bone_magazine' },
      { id: '-4529970774892129487', name: 'bone_buttstock' },
      { id: '-2098089945093549263', name: 'bone_magazine_01' },
    ],
  },
  handgun: {
    renderer: '-4763531541672078543', mesh: '-7008905148608425358', material: '-2288669407096532286',
    object: { id: '5832696454154441521', name: 'Saori_Original_Handgun' },
    bone: { id: '5850243916819223345', name: 'bone_Weapon' },
    magazine02: { id: '7297958013507949361', name: 'bone_magazine_02' },
    magazine03: { id: '2629695361642615601', name: 'bone_magazine_03' },
  },
  waterCannon: {
    renderer: '-1127309643643137231', mesh: '-4114086136464228496', material: '4428875022469246219',
    object: { id: '-1686778725144767695', name: 'CH0266_WaterCannon_Outline' },
    bone: { id: '-8012569600188132559', name: 'bone_Watercannon' },
  },
  weaponMaterial: '-2288669407096532286',
  actions: {
    idle: 'CH0266_Cafe_Idle',
    walk: 'CH0266_Cafe_Walk',
    pickup: 'CH0266_Formation_Pickup',
    touch: 'CH0266_Cafe_Reaction',
  },
} as const

type SaoriPolicyReference = { bundle: string; file: string; id: string }

function saoriSourceReference(reference: SaoriPolicyReference) {
  return { bundleSha256: reference.bundle, serializedFile: reference.file, objectId: reference.id }
}

function saoriPointerMatches(value: unknown, expected: { id: string; name: string }) {
  return exactSourcePointerIdentity(value, saoriSourceReference(SAORI_HANDGUN_SOURCE.prefab))
    && completeAssemblyPointer(value)
    && value.pathId === expected.id
    && pointerName(value) === expected.name.toLowerCase()
}

function saoriPointerArrayMatches(values: readonly InventoryAssemblyPointer[] | null | undefined, expected: readonly { id: string; name: string }[]) {
  return Array.isArray(values) && values.length === expected.length
    && expected.every(pointer => values.filter(value => saoriPointerMatches(value, pointer)).length === 1)
}

function saoriSourcePointerMatches(value: unknown, source: SaoriPolicyReference) {
  const expected = saoriSourceReference(source)
  return pointerMatchesSourceReference(value, expected)
    && Boolean(value && typeof value === 'object'
      && normalizedSerializedFile((value as Record<string, unknown>).file as string) === normalizedSerializedFile(expected.serializedFile)
      && String((value as Record<string, unknown>).pathId) === expected.objectId)
}

function saoriRendererMaterialMatches(renderer: InventoryAssemblyRenderer) {
  const slot = renderer.materialSlots?.[0]
  const material = saoriSourceReference(SAORI_HANDGUN_SOURCE.material)
  return renderer.materialSlots?.length === 1
    && slot?.slot === 0
    && referenceKey(slot.sourceMaterialReference) === referenceKey(material)
    && saoriSourcePointerMatches(slot.material, SAORI_HANDGUN_SOURCE.material)
}

function exactSaoriHandgunArrangementEvidence(
  candidate: SourceCandidate,
  assembly: InventoryAssembly,
  renderer: InventoryAssemblyRenderer,
  blocker: RenderingProfileCoreRendererBlocker,
  interaction: ChibiProfile,
  equipmentBindingEvidence: RenderingProfileEquipmentBindingEvidence[],
) {
  const source = SAORI_HANDGUN_SOURCE
  const expectedRendererReference = saoriSourceReference(source.renderer)
  const expectedMeshReference = saoriSourceReference(source.mesh)
  const expectedMaterialReference = saoriSourceReference(source.material)
  const expectedShaderReference = saoriSourceReference(source.shader)
  if (candidate.conflict
    || candidate.sourceIdentity !== source.identity
    || candidate.fingerprint !== source.fingerprint
    || assembly.root !== 'Cafe_Saori_Original'
    || assembly.prefabPath !== source.prefabPath
    || referenceKey(assembly.prefabReference) !== referenceKey(saoriSourceReference(source.prefab))
    || referenceKey(renderer.sourceReference) !== referenceKey(expectedRendererReference)
    || referenceKey(blocker.sourceReference) !== referenceKey(expectedRendererReference)
    || referenceKey(renderer.meshSourceReference) !== referenceKey(expectedMeshReference)
    || referenceKey(blocker.sourceMeshReference) !== referenceKey(expectedMeshReference)
    || blocker.sourceMaterialReferences.length !== 1
    || referenceKey(blocker.sourceMaterialReferences[0]) !== referenceKey(expectedMaterialReference)
    || blocker.sourceShaderReferences.length !== 1
    || referenceKey(blocker.sourceShaderReferences[0]) !== referenceKey(expectedShaderReference)
    || renderer.rendererType !== 'SkinnedMeshRenderer'
    || renderer.visible !== true || renderer.enabled !== true || renderer.gameObjectActive !== true
    || renderer.pathId !== expectedRendererReference.objectId
    || renderer.hierarchyPath !== 'Cafe_Saori_Original/Saori_Original_Handgun'
    || !saoriSourcePointerMatches(renderer.mesh, source.mesh)
    || !saoriRendererMaterialMatches(renderer)
    || !saoriPointerMatches(renderer.rootBone, source.handgunRoot)
    || !saoriPointerArrayMatches(renderer.transformChain, [source.cafeRoot, source.handgunObject])
    || !saoriPointerArrayMatches(rootBoneAncestry(renderer), [source.cafeRoot, source.boneRoot, source.bip001])
    || (renderer as RendererWithRootBoneAncestry).rootBoneAncestryComplete !== true
    || !saoriPointerArrayMatches(renderer.boneReferences, [source.handgunRoot, source.handgunMagazine])) return false

  const primaryReference = saoriSourceReference(source.primary.renderer)
  const primaryMatches = assembly.renderers.filter(item => referenceKey(item.sourceReference) === referenceKey(primaryReference))
  if (primaryMatches.length !== 1 || assembly.renderers.filter(item =>
    referenceKey(item.sourceReference) === referenceKey(expectedRendererReference)).length !== 1) return false
  const primary = primaryMatches[0]
  const anchorKey = referenceKey(saoriSourceReference(source.primary.bone))
  const binding = equipmentBindingEvidence.filter(item => referenceKey(item.sourceReference) === referenceKey(primaryReference))
  const structuralAnchorProof = binding.length === 1
    && binding[0].classification === 'structurally-bound-equipment'
    && binding[0].reasonCode === 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY'
    && binding[0].evidence.includes(`exact same-prefab Bip001_Weapon m_Bones anchor reference:${anchorKey}`)
    && binding[0].evidence.includes('unique non-conflicting same-prefab transform/bone relation')
  if (equipmentBindingEvidence.length !== 1 || !structuralAnchorProof
    || primary.rendererType !== 'SkinnedMeshRenderer'
    || primary.visible !== true || primary.enabled !== true || primary.gameObjectActive !== true
    || primary.pathId !== primaryReference.objectId
    || primary.hierarchyPath !== 'Cafe_Saori_Original/Saori_Original_Weapon'
    || referenceKey(primary.meshSourceReference) !== referenceKey(saoriSourceReference(source.primary.mesh))
    || !saoriSourcePointerMatches(primary.mesh, source.primary.mesh)
    || !saoriRendererMaterialMatches(primary)
    || !saoriPointerMatches(primary.rootBone, { id: source.primary.bone.id, name: 'Bip001_Weapon' })
    || !saoriPointerArrayMatches(primary.transformChain, [source.cafeRoot, source.primaryObject])
    || !saoriPointerArrayMatches(rootBoneAncestry(primary), [source.cafeRoot, source.boneRoot, source.bip001])
    || (primary as RendererWithRootBoneAncestry).rootBoneAncestryComplete !== true
    || !saoriPointerArrayMatches(primary.boneReferences, [
      { id: source.primary.bone.id, name: 'Bip001_Weapon' }, source.primaryMagazine, source.primaryButtstock,
    ])) return false

  if (interaction.initialPose !== source.actions.idle
    || interaction.interactions.idle.state !== 'available' || interaction.interactions.idle.clip !== source.actions.idle
    || interaction.interactions.walk.state !== 'available' || interaction.interactions.walk.clip !== source.actions.walk
    || interaction.interactions.pickup.state !== 'available' || interaction.interactions.pickup.clip !== source.actions.pickup
    || interaction.interactions.touch.state !== 'available' || interaction.interactions.touch.clip !== source.actions.touch
    || Object.values(source.actions).some(clip => !candidate.clips.includes(clip))) return false
  return true
}

type SaoriSwimsuitReference = { bundle: string; file: string; id: string }

type SourcePinnedRigMountReference = { bundle: string; file: string; id: string }
type SourcePinnedRigMountPointer = { source: SourcePinnedRigMountReference; name: string }
type SourcePinnedRigMountMember = {
  renderer: SourcePinnedRigMountReference
  name: string
  hierarchyPath: string
  mesh: SourcePinnedRigMountReference
  material: SourcePinnedRigMountReference
  rootBone: SourcePinnedRigMountPointer
  transformChain: SourcePinnedRigMountPointer[]
  ancestry: SourcePinnedRigMountPointer[]
  bones: SourcePinnedRigMountPointer[]
}

type SourcePinnedRigMountGroup = {
  identity: string
  fingerprint: string
  prefabPath: string
  root: string
  prefab: SourcePinnedRigMountReference
  prefabEntry: { path: string; sha256: string }
  animationEntries: { path: string; sha256: string }[]
  actions: { idle: string; walk: string; pickup: string; touch: string }
  anchor: SourcePinnedRigMountPointer
  members: SourcePinnedRigMountMember[]
  clipEvidence: string
}

const SOURCE_PINNED_RIG_MOUNT_GROUPS: readonly SourcePinnedRigMountGroup[] = [
  {
    identity: 'ch0268',
    fingerprint: '48bf217d3b63f6e6d1ccfd4e6b9fcbc9a92ce0704d7c503701950c850690bcb9',
    prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0268/Cafe/Cafe_CH0268.prefab',
    root: 'Cafe_CH0268',
    prefab: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '4139133509352740713' },
    prefabEntry: {
      path: 'character-ch0268-_mxload-prefabs-2025-08-26_assets_all_1171610560.bundle',
      sha256: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29',
    },
    animationEntries: [{
      path: 'assets-_mx-characters-ch0268-_mxdependency-animationclips-2025-08-26_assets_all_145147970.bundle',
      sha256: 'b038e215617dd76a55035c08cd2bbc5bf72001ba237fb4f4ca894f11a8b16db1',
    }],
    actions: {
      idle: 'CH0268_Cafe_Idle', walk: 'CH0268_Cafe_Walk',
      pickup: 'CH0268_Formation_Pickup', touch: 'CH0268_Cafe_Reaction',
    },
    anchor: { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3815402648570287977' }, name: 'Bip001_Weapon' },
    members: [
      {
        renderer: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-7191168882773665943' },
        name: 'CH0268_Weapon', hierarchyPath: 'Cafe_CH0268/CH0268_Weapon',
        mesh: { bundle: '71796e3ef4171b3c5239394ca1511f3ee2c6a9d3351588548eb42fe9ff006d44', file: 'CAB-a90cae2435de793c9dd66879a2dfbfd1', id: '-8462892462062640212' },
        material: { bundle: '0e361d6e7a75aaa8422c2ef72acdaace71e4f300a85bb353da363a5a37d30bc8', file: 'CAB-81605dd560065d47ae7631dd966e46db', id: '-95615523722023342' },
        rootBone: { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3815402648570287977' }, name: 'Bip001_Weapon' },
        transformChain: [
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3135970795112421225' }, name: 'Cafe_CH0268' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '7495110504455591785' }, name: 'CH0268_Weapon' },
        ],
        ancestry: [
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3135970795112421225' }, name: 'Cafe_CH0268' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-7118219027617032343' }, name: 'bone_root' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '2944844707476920169' }, name: 'Bip001' },
        ],
        bones: [
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3815402648570287977' }, name: 'Bip001_Weapon' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-8757116650605914263' }, name: 'bone_magazine' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-239699426375248023' }, name: 'bone_weapon_rope' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-2583516880457181335' }, name: 'bone_rocket01' },
        ],
      },
      {
        renderer: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-6506255981981018263' },
        name: 'CH0268_Rocket_Outline', hierarchyPath: 'Cafe_CH0268/CH0268_Rocket_Outline',
        mesh: { bundle: '71796e3ef4171b3c5239394ca1511f3ee2c6a9d3351588548eb42fe9ff006d44', file: 'CAB-a90cae2435de793c9dd66879a2dfbfd1', id: '8919917339668115670' },
        material: { bundle: '0e361d6e7a75aaa8422c2ef72acdaace71e4f300a85bb353da363a5a37d30bc8', file: 'CAB-81605dd560065d47ae7631dd966e46db', id: '-575865430574389217' },
        rootBone: { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3714180053520013161' }, name: 'bone_rocket02' },
        transformChain: [
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3135970795112421225' }, name: 'Cafe_CH0268' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '1616777015477262185' }, name: 'CH0268_Rocket_Outline' },
        ],
        ancestry: [
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3135970795112421225' }, name: 'Cafe_CH0268' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-7118219027617032343' }, name: 'bone_root' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '2944844707476920169' }, name: 'Bip001' },
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3815402648570287977' }, name: 'Bip001_Weapon' },
        ],
        bones: [
          { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '3714180053520013161' }, name: 'bone_rocket02' },
        ],
      },
    ],
    clipEvidence: 'all four pinned clips bind Bip001_Weapon; they also bind bone_rocket01 and bone_rocket02',
  },
  {
    identity: 'mari_original',
    fingerprint: 'c4532ac79bc6e4b80b4fa30eb8343b0ac825c4c74e74917562d106131805a71d',
    prefabPath: 'Assets/_MX/AddressableAsset/Character/Mari_Original/Cafe/Cafe_Mari_Original.prefab',
    root: 'Cafe_Mari_Original',
    prefab: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-8182624225047119105' },
    prefabEntry: {
      path: 'character-mari_original-_mxload-prefabs-2025-07-02_assets_all_1927846235.bundle',
      sha256: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39',
    },
    animationEntries: [
      {
        path: 'assets-_mx-characters-mari_original-_mxdependency-animationclips-2025-07-02_assets_all_26475616.bundle',
        sha256: '9130e7a09173db9d77ca220f61f103534b9a082a0dcaf04942d4456b6ba91eba',
      },
      {
        path: 'assets-_mx-characters-mari_original-_mxdependency-animationclips-2026-03-24_assets_all_1435312802.bundle',
        sha256: '651cccf7c56326a8d8598effb16d74b4c88ec8cd3c38340d9714b2aa07af948b',
      },
    ],
    actions: {
      idle: 'Mari_Original_Cafe_Idle', walk: 'Mari_Original_Cafe_Walk',
      pickup: 'Mari_Original_Formation_Pickup', touch: 'Mari_Original_Cafe_Reaction',
    },
    anchor: { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-1560163874218870017' }, name: 'Bip001_Weapon' },
    members: [
      {
        renderer: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '3069063790598322943' },
        name: 'Mari_Original_Weapon', hierarchyPath: 'Cafe_Mari_Original/Mari_Original_Weapon',
        mesh: { bundle: '75229d629b11e47fb8e04f846bbb14d20c500341722b57506f824b5837167296', file: 'CAB-50d3010d87b873509b38ee51971c0c01', id: '623757297599773649' },
        material: { bundle: '14d5c2383244f0f3876d824b86094ee16bd3569d5f0943b26b70eb9f988cbfd6', file: 'CAB-8f9907cba03db2b5780c737273428334', id: '-5451212227849618331' },
        rootBone: { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-1560163874218870017' }, name: 'Bip001_Weapon' },
        transformChain: [
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '5177313602180381439' }, name: 'Cafe_Mari_Original' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '5107976394332338943' }, name: 'Mari_Original_Weapon' },
        ],
        ancestry: [
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '5177313602180381439' }, name: 'Cafe_Mari_Original' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-8583119856686564609' }, name: 'bone_root' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-3529868761828459777' }, name: 'Bip001' },
        ],
        bones: [
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-1560163874218870017' }, name: 'Bip001_Weapon' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-1469757343611847937' }, name: 'bone_weapon1_cos2' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-8600449184193217793' }, name: 'bone_weapon1_cos1' },
        ],
      },
      {
        renderer: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-269010879909496065' },
        name: 'EX', hierarchyPath: 'Cafe_Mari_Original/EX',
        mesh: { bundle: '75229d629b11e47fb8e04f846bbb14d20c500341722b57506f824b5837167296', file: 'CAB-50d3010d87b873509b38ee51971c0c01', id: '-3964046477843091' },
        material: { bundle: '14d5c2383244f0f3876d824b86094ee16bd3569d5f0943b26b70eb9f988cbfd6', file: 'CAB-8f9907cba03db2b5780c737273428334', id: '-5451212227849618331' },
        rootBone: { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '2930884764252928767' }, name: 'Bone_weapon2' },
        transformChain: [
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '5177313602180381439' }, name: 'Cafe_Mari_Original' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '7214943900458711807' }, name: 'EX' },
        ],
        ancestry: [
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '5177313602180381439' }, name: 'Cafe_Mari_Original' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-8583119856686564609' }, name: 'bone_root' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-3529868761828459777' }, name: 'Bip001' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-1560163874218870017' }, name: 'Bip001_Weapon' },
        ],
        bones: [
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '2930884764252928767' }, name: 'Bone_weapon2' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-7258084021585151233' }, name: 'bone_weapon2_cos1' },
          { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-3384407438069957889' }, name: 'bone_weapon2_cos2' },
        ],
      },
    ],
    clipEvidence: 'the three café clips bind Bip001_Weapon; Formation_Pickup also binds both weapon1 and Bone_weapon2/cos bones',
  },
]

function sourcePinnedRigMountReference(reference: SourcePinnedRigMountReference): InventorySourceReference {
  return { bundleSha256: reference.bundle, serializedFile: reference.file, objectId: reference.id }
}

function sourcePinnedRigMountPointer(pointer: SourcePinnedRigMountPointer): InventoryAssemblyPointer & { sourceReference: InventorySourceReference } {
  return {
    file: pointer.source.file,
    pathId: pointer.source.id,
    name: pointer.name,
    sourceReference: sourcePinnedRigMountReference(pointer.source),
  }
}

function sourcePinnedRigMountPointerMatches(value: unknown, expected: SourcePinnedRigMountPointer) {
  return completeAssemblyPointer(value)
    && pointerMatchesSourceReference(value, sourcePinnedRigMountReference(expected.source))
    && pointerName(value) === expected.name.toLowerCase()
}

function sourcePinnedRigMountPointerArrayMatches(
  values: readonly InventoryAssemblyPointer[] | null | undefined,
  expected: readonly SourcePinnedRigMountPointer[],
) {
  return Array.isArray(values) && values.length === expected.length
    && expected.every((item, index) => sourcePinnedRigMountPointerMatches(values[index], item))
}

type SourcePinnedRigMountAssessment = {
  group: SourcePinnedRigMountGroup
  valid: boolean
  sourceReferences: InventorySourceReference[]
  evidenceByReference: Map<string, RenderingProfileEquipmentBindingEvidence>
  warningEvidence: string[]
}

function isSourcePinnedRigMountEvidence(evidence: RenderingProfileEquipmentBindingEvidence | undefined) {
  return evidence?.classification === 'structurally-bound-equipment'
    && evidence.reasonCode === 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY'
    && evidence.reason.startsWith('Exact source-pinned same-prefab rig-mount group ')
}

function sourcePinnedRigMountPartMatches(candidate: SourceCandidate, expected: { path: string; sha256: string }) {
  const matches = (candidate.parts ?? []).filter(part => part.entryPath === expected.path)
  return matches.length === 1 && matches[0].sha256.toLowerCase() === expected.sha256
}

function exactSourcePinnedRigMountMember(
  candidate: SourceCandidate,
  assembly: InventoryAssembly,
  member: SourcePinnedRigMountMember,
  anchor: SourcePinnedRigMountPointer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
) {
  const rendererReference = sourcePinnedRigMountReference(member.renderer)
  const meshReference = sourcePinnedRigMountReference(member.mesh)
  const materialReference = sourcePinnedRigMountReference(member.material)
  const matches = assembly.renderers.filter(renderer => renderer.sourceReference
    && referenceKey(renderer.sourceReference) === referenceKey(rendererReference))
  if (matches.length !== 1) return null
  const renderer = matches[0]
  const ancestry = rootBoneAncestry(renderer)
  const sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex)
  const exactMaterials = candidate.sourceMaterials?.filter(material => material.sourceReference
    && referenceKey(material.sourceReference) === referenceKey(materialReference)) ?? []
  const exactShaders = sourceEvidence?.length === 1
    ? candidate.shaders?.filter(shader => shader.sourceReference
      && referenceKey(shader.sourceReference) === referenceKey(sourceEvidence[0].shaderReference)) ?? []
    : []
  if (renderer.pathId !== member.renderer.id
    || renderer.name !== member.name
    || renderer.hierarchyPath !== member.hierarchyPath
    || renderer.rendererType !== 'SkinnedMeshRenderer'
    || renderer.enabled !== true || renderer.gameObjectActive !== true || renderer.visible !== true
    || !renderer.meshSourceReference || referenceKey(renderer.meshSourceReference) !== referenceKey(meshReference)
    || !renderer.mesh || !pointerMatchesSourceReference(renderer.mesh, meshReference)
    || renderer.materialSlots?.length !== 1 || renderer.materialSlots[0]?.slot !== 0
    || !renderer.materialSlots[0]?.sourceMaterialReference
    || referenceKey(renderer.materialSlots[0].sourceMaterialReference) !== referenceKey(materialReference)
    || !renderer.materialSlots[0].material
    || !pointerMatchesSourceReference(renderer.materialSlots[0].material, materialReference)
    || !sourcePinnedRigMountPointerMatches(renderer.rootBone, member.rootBone)
    || !sourcePinnedRigMountPointerArrayMatches(renderer.transformChain, member.transformChain)
    || !ancestry || (renderer as RendererWithRootBoneAncestry).rootBoneAncestryComplete !== true
    || !sourcePinnedRigMountPointerArrayMatches(ancestry, member.ancestry)
    || !sourcePinnedRigMountPointerArrayMatches(renderer.boneReferences, member.bones)
    || !rendererUsesExactRigMountPointer(renderer, sourcePinnedRigMountPointer(anchor))
    || !sourceEvidence || sourceEvidence.length !== 1
    || referenceKey(sourceEvidence[0].materialReference) !== referenceKey(materialReference)
    || exactMaterials.length !== 1
    || exactShaders.length !== 1
    || !weaponShaderIdentity(sourceEvidence[0].shader.parsedName ?? sourceEvidence[0].shader.name)) return null

  const sourceMaterial = sourceEvidence[0].material
  if (!sourceMaterial.sourceReference || referenceKey(sourceMaterial.sourceReference) !== referenceKey(materialReference)) return null
  const structuralPointers = [
    renderer.rootBone,
    ...(renderer.transformChain ?? []),
    ...ancestry,
    ...(renderer.boneReferences ?? []),
  ].filter(completeAssemblyPointer)
  const structuralKeys = new Set(structuralPointers.map(pointerKey).filter((key): key is string => Boolean(key)))
  const bodyOverlaps = assembly.renderers.map(body => ({
    body,
    overlaps: (body.boneReferences ?? []).filter(completeAssemblyPointer)
      .filter(pointer => structuralKeys.has(pointerKey(pointer) ?? '')),
  })).filter(item => item.overlaps.length > 0 && isLikelyBodyRenderer(item.body))
  if (bodyOverlaps.length > 1 || bodyOverlaps.some(item => !item.body.sourceReference)) return null
  return {
    renderer,
    sourceEvidence: sourceEvidence[0],
    bodyRendererReferences: bodyOverlaps.flatMap(item => item.body.sourceReference ? [item.body.sourceReference] : []),
  }
}

function sourcePinnedRigMountAssessment(
  candidate: SourceCandidate,
  selectedPrefabPath: string,
  assembly: InventoryAssembly | undefined,
  interaction: ChibiProfile,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
): SourcePinnedRigMountAssessment | null {
  const group = SOURCE_PINNED_RIG_MOUNT_GROUPS.find(item => item.identity === candidate.sourceIdentity)
  if (!group) return null
  const sourceReferences = group.members.map(member => sourcePinnedRigMountReference(member.renderer))
  const targetKeys = new Set(sourceReferences.map(referenceKey))
  const evidenceByReference = new Map<string, RenderingProfileEquipmentBindingEvidence>()
  const prefabReference = sourcePinnedRigMountReference(group.prefab)
  const anchorReference = sourcePinnedRigMountReference(group.anchor.source)
  const attachments = (assembly?.attachments ?? {}) as Record<string, unknown>
  const equipmentAttachmentKeys = [
    'mainWeapon', 'subWeapon', 'equipmentRenderers', 'equipmentRendererReferences',
    'weaponRendererReferences', 'mainWeaponRendererReferences', 'subWeaponRendererReferences',
    'accessoryRendererReferences', 'equipmentRendererGroups', 'equipmentRendererAmbiguities',
  ]
  const hasNoAuthoredAttachmentMetadata = equipmentAttachmentKeys.every(key => {
    const value = attachments[key]
    return value === undefined || (Array.isArray(value) && value.length === 0)
  })
  const actions = group.actions
  const expectedActionEntries = [
    ['idle', actions.idle], ['walk', actions.walk], ['pickup', actions.pickup], ['touch', actions.touch],
  ] as const
  const interactionMatches = interaction.initialPose === actions.idle
    && expectedActionEntries.every(([action, clip]) => interaction.interactions[action].state === 'available'
      && interaction.interactions[action].clip === clip)
  const partProofMatches = sourcePinnedRigMountPartMatches(candidate, group.prefabEntry)
    && group.animationEntries.every(entry => sourcePinnedRigMountPartMatches(candidate, entry))
    && Object.values(actions).every(clip => candidate.clips.includes(clip))
    && interactionMatches
  const activeAnchorRenderers = assembly?.renderers.filter(renderer => renderer.enabled !== false
    && renderer.gameObjectActive !== false && renderer.visible !== false
    && rendererUsesExactRigMountPointer(renderer, sourcePinnedRigMountPointer(group.anchor))) ?? []
  const activeAnchorKeys = activeAnchorRenderers.flatMap(renderer => renderer.sourceReference
    ? [referenceKey(renderer.sourceReference)] : []).sort()
  const expectedAnchorKeys = [...targetKeys].sort()
  const renderedMembers = group.members.map(member => assembly
    ? exactSourcePinnedRigMountMember(candidate, assembly, member, group.anchor, materialIndex, shaderIndex)
    : null)
  const membersMatch = renderedMembers.every(Boolean)
  const eventsAreUnambiguous = candidate.events.every(event => !event.targetReference
    || !targetKeys.has(referenceKey(event.targetReference)))
  const commonMatches = Boolean(assembly
    && !candidate.conflict
    && selectedPrefabPath === group.prefabPath
    && candidate.prefabPaths?.filter(path => path === group.prefabPath).length === 1
    && assembly.root === group.root
    && assembly.prefabPath === group.prefabPath
    && assembly.prefabReference
    && referenceKey(assembly.prefabReference) === referenceKey(prefabReference)
    && candidate.fingerprint === group.fingerprint
    && eventsAreUnambiguous
    && hasNoAuthoredAttachmentMetadata
    && partProofMatches
    && activeAnchorRenderers.length === expectedAnchorKeys.length
    && activeAnchorKeys.length === expectedAnchorKeys.length
    && activeAnchorKeys.every((key, index) => key === expectedAnchorKeys[index]))
  const valid = Boolean(commonMatches && membersMatch)
  const sourceEvidence = [
    `exact source candidate ${group.identity} dependency fingerprint ${group.fingerprint}`,
    `exact selected prefab ${group.prefabPath} at ${referenceKey(prefabReference)}`,
    `source prefab and animation bundle SHA-256 pins match ${group.prefabEntry.path} and ${group.animationEntries.map(entry => entry.path).join(', ')}`,
    `audited clip binding evidence: ${group.clipEvidence}`,
    `exact same-prefab rig anchor ${group.anchor.name} at ${referenceKey(anchorReference)}`,
    `active renderers on the exact anchor are exactly ${sourceReferences.map(referenceKey).join(' and ')}`,
    'source assembly has no authored main/sub slot, equipment renderer reference/group, or ambiguity metadata; no slot was inferred',
  ]
  if (valid) {
    for (const [index, member] of group.members.entries()) {
      const verified = renderedMembers[index]!
      const renderer = verified.renderer
      const memberEvidence = [
        ...sourceEvidence,
        `exact source renderer ${renderer.name} at ${referenceKey(renderer.sourceReference)}`,
        `exact source mesh ${referenceKey(renderer.meshSourceReference!)}`,
        `exact source material ${referenceKey(verified.sourceEvidence.materialReference)}`,
        `exact source shader ${referenceKey(verified.sourceEvidence.shaderReference)} (${verified.sourceEvidence.shader.parsedName ?? verified.sourceEvidence.shader.name})`,
        ...(verified.bodyRendererReferences.length
          ? [`exact body-renderer m_Bones overlap references ${verified.bodyRendererReferences.map(referenceKey).join(', ')}`]
          : ['body m_Bones overlap: none; source hierarchy independently corroborates movement']),
      ]
      evidenceByReference.set(referenceKey(renderer.sourceReference!), {
        classification: 'structurally-bound-equipment',
        reasonCode: 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY',
        reason: `Exact source-pinned same-prefab rig-mount group ${group.identity}; attachment placement remains an arrangement warning.`,
        sourceReference: renderer.sourceReference!,
        name: renderer.name,
        hierarchyPath: renderer.hierarchyPath ?? null,
        sourceMeshReference: renderer.meshSourceReference ?? null,
        sourceMaterialReferences: [verified.sourceEvidence.materialReference],
        sourceShaderReferences: [verified.sourceEvidence.shaderReference],
        rootBone: cloneAssemblyPointer(renderer.rootBone),
        transformChain: cloneAssemblyPointers(renderer.transformChain),
        rootBoneAncestry: cloneAssemblyPointers(rootBoneAncestry(renderer)),
        boneReferences: cloneAssemblyPointers(renderer.boneReferences),
        matchedAncestorPointers: [cloneAssemblyPointer(renderer.rootBone)!],
        bodyRendererReferences: verified.bodyRendererReferences,
        evidence: [...new Set(memberEvidence)],
      })
    }
  }
  return {
    group,
    valid,
    sourceReferences,
    evidenceByReference,
    warningEvidence: sourceEvidence,
  }
}

function saoriSwimsuitReference(source: SaoriSwimsuitReference): InventorySourceReference {
  return { bundleSha256: source.bundle, serializedFile: source.file, objectId: source.id }
}

function saoriSwimsuitPointerMatches(value: unknown, source: SaoriSwimsuitReference, name: string) {
  return completeAssemblyPointer(value)
    && pointerMatchesSourceReference(value, saoriSwimsuitReference(source))
    && pointerName(value) === name.toLowerCase()
}

function saoriSwimsuitPointerArrayMatches(
  values: readonly InventoryAssemblyPointer[] | null | undefined,
  expected: readonly { source: SaoriSwimsuitReference; name: string }[],
) {
  return Array.isArray(values) && values.length === expected.length
    && expected.every((item, index) => saoriSwimsuitPointerMatches(values[index], item.source, item.name))
}

function exactSaoriSwimsuitMaterial(
  candidate: SourceCandidate,
  renderer: InventoryAssemblyRenderer,
  expected: { reference: SaoriSwimsuitReference; name: string },
) {
  const materialReference = saoriSwimsuitReference(expected.reference)
  const shaderReference = saoriSwimsuitReference(SAORI_SWIMSUIT_SOURCE.shader)
  const slots = renderer.materialSlots ?? []
  const materials = (candidate.sourceMaterials ?? []).filter(item => referenceKey(item.sourceReference) === referenceKey(materialReference))
  const shaders = (candidate.shaders ?? []).filter(item => referenceKey(item.sourceReference) === referenceKey(shaderReference))
  const material = materials[0]
  const shader = shaders[0]
  const slot = slots[0]
  const parsedShaderNamesMatch = material?.shaderParsedName === 'MX/C-Weapon'
    && shader?.parsedName === 'MX/C-Weapon'
  const rawShaderNamesMatch = (material?.shaderName === 'MX/C-Weapon' && shader?.name === 'MX/C-Weapon')
    || (material?.shaderName === '' && shader?.name === '')
  const checks = {
    materialCount: materials.length === 1, shaderCount: shaders.length === 1,
    slots: slots.length === 1 && slot?.slot === 0,
    slotMaterialReference: referenceKey(slot?.sourceMaterialReference) === referenceKey(materialReference),
    slotMaterialPointer: pointerMatchesSourceReference(slot?.material, materialReference),
    materialName: material?.name === expected.name,
    materialShaderRef: referenceKey(material?.shaderReference) === referenceKey(shaderReference),
    materialShaderPointer: pointerMatchesSourceReference(material?.shader, shaderReference),
    materialShaderName: parsedShaderNamesMatch,
    shaderParsedName: parsedShaderNamesMatch, shaderName: rawShaderNamesMatch && parsedShaderNamesMatch,
  }
  return Object.values(checks).every(Boolean)
}

function exactSaoriSwimsuitRenderer(
  candidate: SourceCandidate,
  renderer: InventoryAssemblyRenderer | undefined,
  blocker: RenderingProfileCoreRendererBlocker | null,
  source: {
    reference: SaoriSwimsuitReference
    mesh: SaoriSwimsuitReference
    material: SaoriSwimsuitReference
    materialName: string
    rendererName: string
    hierarchyPath: string
    rootBone: { source: SaoriSwimsuitReference; name: string }
    transformChain: { source: SaoriSwimsuitReference; name: string }[]
    ancestry: { source: SaoriSwimsuitReference; name: string }[]
    bones: { source: SaoriSwimsuitReference; name: string }[]
  },
) {
  const rendererReference = saoriSwimsuitReference(source.reference)
  const meshReference = saoriSwimsuitReference(source.mesh)
  const materialReference = saoriSwimsuitReference(source.material)
  const blockerMatches = !blocker || (referenceKey(blocker.sourceReference) === referenceKey(rendererReference)
    && referenceKey(blocker.sourceMeshReference) === referenceKey(meshReference)
    && blocker.sourceMaterialReferences.length === 1
    && referenceKey(blocker.sourceMaterialReferences[0]) === referenceKey(materialReference)
    && blocker.sourceShaderReferences.length === 1
    && referenceKey(blocker.sourceShaderReferences[0]) === referenceKey(saoriSwimsuitReference(SAORI_SWIMSUIT_SOURCE.shader)))
  return Boolean(renderer && blockerMatches
    && referenceKey(renderer.sourceReference) === referenceKey(rendererReference)
    && referenceKey(renderer.meshSourceReference) === referenceKey(meshReference)
    && renderer.rendererType === 'SkinnedMeshRenderer'
    && renderer.visible === true && renderer.enabled === true && renderer.gameObjectActive === true
    && renderer.pathId === source.reference.id
    && renderer.name === source.rendererName
    && renderer.hierarchyPath === source.hierarchyPath
    && pointerMatchesSourceReference(renderer.mesh, meshReference)
    && exactSaoriSwimsuitMaterial(candidate, renderer, { reference: source.material, name: source.materialName })
    && saoriSwimsuitPointerMatches(renderer.rootBone, source.rootBone.source, source.rootBone.name)
    && saoriSwimsuitPointerArrayMatches(renderer.transformChain, source.transformChain)
    && saoriSwimsuitPointerArrayMatches(rootBoneAncestry(renderer), source.ancestry)
    && rootBoneAncestry(renderer) !== null
    && (renderer as RendererWithRootBoneAncestry).rootBoneAncestryComplete === true
    && saoriSwimsuitPointerArrayMatches(renderer.boneReferences, source.bones))
}

function exactSaoriSwimsuitArrangementEvidence(
  candidate: SourceCandidate,
  assembly: InventoryAssembly | undefined,
  blockers: RenderingProfileCoreRendererBlocker[],
  interaction: ChibiProfile,
) {
  const source = SAORI_SWIMSUIT_SOURCE
  if (!assembly || candidate.conflict
    || candidate.sourceIdentity !== source.identity || candidate.fingerprint !== source.fingerprint
    || assembly.root !== 'Cafe_CH0266' || assembly.prefabPath !== source.prefabPath
    || referenceKey(assembly.prefabReference) !== referenceKey(saoriSwimsuitReference({
      bundle: source.prefabBundle, file: source.prefabFile, id: source.prefabId,
    }))
    || !(candidate.prefabPaths ?? []).includes(source.prefabPath)) return false

  // The exact candidate fingerprint pins the selected prefab and animation
  // dependencies. Source audit confirmed transform-path bindings in every
  // one of these four clips for bone_Weapon (759696596) and bone_Watercannon
  // (1951667232), so these renderers are animated core equipment, not inert
  // presentation meshes.
  for (const entry of [source.prefabEntry, source.animationEntry]) {
    const matches = candidate.parts.filter(part => part.entryPath === entry.path)
    if (matches.length !== 1 || matches[0].sha256.toLowerCase() !== entry.sha256) return false
  }
  if (Object.values(source.actions).some(clip => !candidate.clips.includes(clip))
    || interaction.initialPose !== source.actions.idle
    || interaction.interactions.idle.state !== 'available' || interaction.interactions.idle.clip !== source.actions.idle
    || interaction.interactions.walk.state !== 'available' || interaction.interactions.walk.clip !== source.actions.walk
    || interaction.interactions.pickup.state !== 'available' || interaction.interactions.pickup.clip !== source.actions.pickup
    || interaction.interactions.touch.state !== 'available' || interaction.interactions.touch.clip !== source.actions.touch) return false

  const sourceReference = (bundle: string, file: string, id: string) => ({ bundle, file, id })
  const prefabBone = (bone: { id: string; name: string }) => ({
    source: sourceReference(source.prefabBundle, source.prefabFile, bone.id), name: bone.name,
  })
  const prefabSource = (id: string) => sourceReference(source.prefabBundle, source.prefabFile, id)
  const rendererSources = [
    {
      reference: prefabSource(source.handgun.renderer), mesh: sourceReference(source.meshBundle, source.meshFile, source.handgun.mesh),
      material: sourceReference(source.materialBundle, source.materialFile, source.handgun.material), materialName: 'CH0266_Weapon',
      rendererName: 'Saori_Original_Handgun', hierarchyPath: 'Cafe_CH0266/Saori_Original_Handgun',
      rootBone: prefabBone(source.handgun.bone),
      transformChain: [prefabBone(source.cafeRoot), prefabBone(source.handgun.object)],
      ancestry: [prefabBone(source.cafeRoot), prefabBone(source.boneRoot), prefabBone(source.bip001)],
      bones: [prefabBone(source.handgun.bone), prefabBone(source.handgun.magazine02), prefabBone(source.handgun.magazine03)],
    },
    {
      reference: prefabSource(source.waterCannon.renderer), mesh: sourceReference(source.meshBundle, source.meshFile, source.waterCannon.mesh),
      material: sourceReference(source.materialBundle, source.materialFile, source.waterCannon.material), materialName: 'CH0266_WaterCannon',
      rendererName: 'CH0266_WaterCannon_Outline', hierarchyPath: 'Cafe_CH0266/CH0266_WaterCannon_Outline',
      rootBone: prefabBone(source.waterCannon.bone),
      transformChain: [prefabBone(source.cafeRoot), prefabBone(source.waterCannon.object)],
      ancestry: [prefabBone(source.cafeRoot), prefabBone(source.boneRoot)],
      bones: [prefabBone(source.waterCannon.bone)],
    },
  ]
  if (blockers.length !== rendererSources.length
    || blockers.some(blocker => blocker.reasonCode !== 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT')) return false

  const assemblies = assembly.renderers
  const blockerByReference = new Map(blockers.map(blocker => [referenceKey(blocker.sourceReference), blocker]))
  for (const expected of rendererSources) {
    const expectedReference = saoriSwimsuitReference(expected.reference)
    const matches = assemblies.filter(renderer => referenceKey(renderer.sourceReference) === referenceKey(expectedReference))
    const blocker = blockerByReference.get(referenceKey(expectedReference))
    if (matches.length !== 1 || !blocker
      || !exactSaoriSwimsuitRenderer(candidate, matches[0], blocker, expected)) return false
  }

  const attachments = assembly.attachments
  const primarySource = saoriSwimsuitReference(prefabSource(source.primary.renderer))
  const equipmentRendererReferences = attachments.equipmentRendererReferences ?? []
  if (!saoriSwimsuitPointerArrayMatches(attachments.mainWeapon, [prefabBone(source.primary.bone)])
    || (attachments.subWeapon?.length ?? 0) > 0
    || equipmentRendererReferences.length !== 1
    || referenceKey(equipmentRendererReferences[0]) !== referenceKey(primarySource)
    || (attachments.equipmentRendererGroups?.length ?? 0) > 0
    || (attachments.equipmentRendererAmbiguities?.length ?? 0) > 0) return false

  const primaryMatches = assemblies.filter(renderer => referenceKey(renderer.sourceReference) === referenceKey(primarySource))
  const primary = primaryMatches[0]
  if (primaryMatches.length !== 1
    || !exactSaoriSwimsuitRenderer(candidate, primary, null, {
      reference: prefabSource(source.primary.renderer),
      mesh: sourceReference(source.meshBundle, source.meshFile, source.primary.mesh),
      material: sourceReference(source.materialBundle, source.materialFile, source.weaponMaterial), materialName: 'CH0266_Weapon',
      rendererName: 'Saori_Original_Weapon', hierarchyPath: 'Cafe_CH0266/Saori_Original_Weapon',
      rootBone: prefabBone(source.primary.bone),
      transformChain: [prefabBone(source.cafeRoot), prefabBone(source.primary.object)],
      ancestry: [prefabBone(source.cafeRoot), prefabBone(source.boneRoot), prefabBone(source.bip001)],
      bones: source.primary.bones.map(prefabBone),
    })) return false
  if (candidate.events.some(event => event.targetReference && blockers.some(blocker =>
    referenceKey(event.targetReference) === referenceKey(blocker.sourceReference)))) return false
  return true
}

function classifyRenderer(
  assembly: InventoryAssembly | undefined,
  renderer: InventoryAssemblyRenderer,
  materialIndex: Map<string, ResolvedMaterial>,
  shaderIndex: Map<string, InventoryShader>,
  protectedRendererReferences: Set<string>,
): RendererPolicyDecision {
  const sourceReference = sourceRendererReference(renderer)
  // Exclusion requires a canonical renderer identity.  A missing identity is
  // therefore always retained and handled by the normal unresolved checks.
  if (!sourceReference) return { kind: 'core', sourceRenderer: renderer }

  const attachment = rendererAttachmentEvidence(assembly, renderer)
  const exactReferenceKey = referenceKey(sourceReference)
  const exactCoreBinding = protectedRendererReferences.has(exactReferenceKey)
    || attachment.ambiguousName
    || exactCoreRendererName(renderer.name)
  const inertEvidence = inertSourceRendererEvidence(renderer)
  // Exact mouth/eye/core/equipment bindings are authoritative, even when the
  // renderer happens to live below a cut-in or FX hierarchy.
  if (exactCoreBinding) return { kind: 'core', sourceRenderer: renderer }
  if (inertEvidence) {
    const sourceMesh = renderer.mesh
      ? { ...renderer.mesh, sourceReference: renderer.meshSourceReference ?? null }
      : null
    return {
      kind: 'excluded',
      sourceRenderer: renderer,
      excluded: {
        sourceReference,
        name: renderer.name,
        hierarchyPath: renderer.hierarchyPath ?? null,
        reasonCode: 'PRESENTATION_MESH_10210_OR_HELPER',
        evidence: inertEvidence,
        sourceMesh,
        materials: (renderer.materialSlots ?? []).map(slot => ({
          name: '(exact null material pointer)',
          sourceReference: slot.sourceMaterialReference ?? null,
          shaderName: null,
          shaderReference: null,
        })),
      },
    }
  }
  const materials = (renderer.materialSlots ?? []).map(slot => {
    const material = slot.sourceMaterialReference ? materialIndex.get(referenceKey(slot.sourceMaterialReference)) : undefined
    const shaderReference = material?.shaderReference ?? null
    const shader = shaderReference ? shaderIndex.get(referenceKey(shaderReference)) : undefined
    return {
      slot,
      material,
      shader,
      evidence: {
        name: material?.name ?? '(unresolved)',
        sourceReference: material?.sourceReference ?? slot.sourceMaterialReference ?? null,
        shaderName: material?.shaderParsedName ?? material?.shaderName ?? null,
        shaderReference,
      },
    }
  })
  const pathEvidence = presentationPathEvidence(renderer)
  const coreShaderMaterials = materials.filter(item => coreShaderIdentity(item.material?.shaderParsedName)
    || coreShaderIdentity(item.material?.shaderName))
  const effectMaterials = materials.filter(item => presentationMaterialName(item.material?.name)
    && presentationShaderIdentity(item.material?.shaderParsedName ?? item.material?.shaderName)
    && Boolean(item.material?.sourceReference)
    && Boolean(item.material?.shaderReference && item.shader?.sourceReference
      && referenceKey(item.material.shaderReference) === referenceKey(item.shader.sourceReference)))
  const builtinResource = unityBuiltinQuadReference(renderer.mesh)
  // A source inventory can preserve the canonical file/path while lacking the
  // Unity GUID.  That is an ambiguous Quad for ordinary rendering, but it is
  // still useful exclusion evidence when the exact hierarchy/material context
  // proves a presentation helper.  The path alone is never sufficient.
  const ambiguousBuiltinQuad = Boolean(renderer.mesh
    && normalizedSerializedFile(renderer.mesh.file) === normalizedSerializedFile(UNITY_BUILTIN_RESOURCES_FILE)
    && String(renderer.mesh.pathId) === UNITY_BUILTIN_QUAD_PATH_ID)
  const sourceMesh = renderer.mesh
    ? { ...renderer.mesh, sourceReference: renderer.meshSourceReference ?? null,
      ...(builtinResource ? { builtinResource } : {}) }
    : null
  const evidence: string[] = [`exact source renderer reference ${referenceKey(sourceReference)}`]
  if (renderer.hierarchyPath) evidence.push(`source hierarchy ${renderer.hierarchyPath}`)
  if (pathEvidence.branch) evidence.push('source renderer is in an FX/camera/cutin/presentation branch')
  if (pathEvidence.role) evidence.push('source hierarchy identifies a presentation role')
  if (builtinResource) evidence.push(`source mesh is the exact Unity built-in ${builtinResource.name}`)
  else if (ambiguousBuiltinQuad) evidence.push('source mesh is an ambiguous Unity built-in Quad pointer')
  for (const item of effectMaterials) {
    evidence.push(`source material is explicitly effect-scoped: ${item.evidence.name}`)
    if (item.evidence.sourceReference) evidence.push(`exact source material reference ${referenceKey(item.evidence.sourceReference)}`)
    if (item.evidence.shaderName) evidence.push(`source shader is an effect family: ${item.evidence.shaderName}`)
    if (item.evidence.shaderReference) evidence.push(`exact source shader reference ${referenceKey(item.evidence.shaderReference)}`)
  }
  if (renderer.meshSourceReference) evidence.push(`exact source mesh reference ${referenceKey(renderer.meshSourceReference)}`)
  const completePresentationMaterials = materials.length > 0 && effectMaterials.length === materials.length
  const exactMeshEvidence = Boolean(renderer.mesh && (renderer.meshSourceReference || builtinResource || ambiguousBuiltinQuad))
  const coreEvidence = attachment.exactRenderer || attachment.ambiguousEquipment || attachment.ambiguousName || attachment.attachedBone
    || coreShaderMaterials.length > 0
  // Every material slot must carry an exact source material + shader identity
  // proving presentation scope. Unknown, missing, or core slots fail closed.
  const presentationEvidence = pathEvidence.branch
    && (pathEvidence.role || effectMaterials.length > 0)
    && completePresentationMaterials
    && exactMeshEvidence
  // Core/equipment evidence always wins over presentation hints.  This is
  // deliberately conservative for mixed renderers and weapon materials.
  if (coreEvidence || !presentationEvidence) return { kind: 'core', sourceRenderer: renderer }
  const reasonCode = ambiguousBuiltinQuad
    ? 'PRESENTATION_MESH_10210_OR_HELPER' as const
    : 'PRESENTATION_SHADER_OR_MATERIAL' as const
  return {
    kind: 'excluded',
    sourceRenderer: renderer,
    excluded: {
      sourceReference,
      name: renderer.name,
      hierarchyPath: renderer.hierarchyPath ?? null,
      reasonCode,
      evidence: [...new Set(evidence)],
      sourceMesh,
      materials: materials.map(item => item.evidence),
    },
  }
}

function numberState(pass: ReturnType<typeof passFor>, material: InventoryMaterial, shader: InventoryShader | undefined, stateNames: string[], property?: string) {
  return resolveShaderState(findState(pass?.state, stateNames), material, shader, property)
}

function optionalNumberState(pass: ReturnType<typeof passFor>, material: InventoryMaterial, shader: InventoryShader | undefined, stateNames: string[], property?: string) {
  const raw = findState(pass?.state, stateNames)
  return raw === undefined ? { value: null, source: 'literal' as const } : resolveShaderState(raw, material, shader, property)
}

function renderState(material: InventoryMaterial, shader: InventoryShader | undefined) {
  const pass = passFor(shader)
  const sourceBlend = numberState(pass, material, shader, ['srcBlend', 'sourceBlend'], '_SrcBlend')
  const destinationBlend = numberState(pass, material, shader, ['destBlend', 'dstBlend', 'destinationBlend'], '_DstBlend')
  const sourceBlendAlpha = optionalNumberState(pass, material, shader, ['srcBlendAlpha', 'sourceBlendAlpha'], '_SrcBlendAlpha')
  const destinationBlendAlpha = optionalNumberState(pass, material, shader, ['destBlendAlpha', 'destinationBlendAlpha'], '_DstBlendAlpha')
  const blendOperation = optionalNumberState(pass, material, shader, ['blendOp', 'blendOperation'], '_BlendOp')
  const blendOperationAlpha = optionalNumberState(pass, material, shader, ['blendOpAlpha', 'blendOperationAlpha'], '_BlendOpAlpha')
  const depthWrite = numberState(pass, material, shader, ['zWrite', 'depthWrite'], '_ZWrite')
  const depthTest = numberState(pass, material, shader, ['zTest', 'depthTest'], '_ZTest')
  const cull = numberState(pass, material, shader, ['culling', 'cull'], '_Cull')
  const offsetFactor = numberState(pass, material, shader, ['offsetFactor'], '_OffsetFactor')
  const offsetUnits = numberState(pass, material, shader, ['offsetUnits'], '_OffsetUnits')
  const depthFunction = new Map([[0, 'disabled'], [1, 'never'], [2, 'less'], [3, 'equal'], [4, 'less-equal'], [5, 'greater'], [6, 'not-equal'], [7, 'greater-equal'], [8, 'always']]).get(depthTest.value ?? -1) ?? null
  const blend = sourceBlend.value !== null && destinationBlend.value !== null
    && (sourceBlend.value !== 1 || destinationBlend.value !== 0)
  const alphaClip = propertyValue(material, '_AlphaClip') ?? shaderDefault(shader, '_AlphaClip')
  const alphaMode: 'MASK' | 'BLEND' | 'OPAQUE' = alphaClip === 1 ? 'MASK' : blend ? 'BLEND' : 'OPAQUE'
  const cullMode: 'off' | 'front' | 'back' | null = cull.value === 0 ? 'off' : cull.value === 1 ? 'front' : cull.value === 2 ? 'back' : null
  return {
    state: {
      sourceQueue: material.renderQueue,
      layer: alphaMode === 'BLEND' ? 'transparent' as const : 'opaque' as const,
      alphaMode,
      depthWrite: depthWrite.value === null ? null : depthWrite.value !== 0,
      depthTest: depthTest.value === null ? null : depthTest.value !== 0,
      depthFunction,
      cullMode,
      doubleSided: cullMode === null ? null : cullMode === 'off',
    blend: {
      source: sourceBlend.value, destination: destinationBlend.value,
      sourceAlpha: sourceBlendAlpha.value, destinationAlpha: destinationBlendAlpha.value,
      operation: blendOperation.value, operationAlpha: blendOperationAlpha.value,
    },
      polygonOffsetFactor: offsetFactor.value,
      polygonOffsetUnits: offsetUnits.value,
    },
    unresolved: [sourceBlend, destinationBlend, sourceBlendAlpha, destinationBlendAlpha, blendOperation, blendOperationAlpha,
      depthWrite, depthTest, cull, offsetFactor, offsetUnits].filter(value => value.source === 'unresolved'),
  }
}

function selectedAssembly(candidate: SourceCandidate, prefabPath: string): InventoryAssembly | undefined {
  const normalized = prefabPath.replaceAll('\\', '/').toLowerCase()
  const basename = normalized.split('/').at(-1)?.replace(/\.prefab$/i, '')
  const byPath = candidate.assembly?.filter(item => item.prefabPath?.replaceAll('\\', '/').toLowerCase() === normalized) ?? []
  if (byPath.length === 1) return byPath[0]
  if (byPath.length > 1) return undefined
  const byRoot = candidate.assembly?.filter(item => item.root.toLowerCase() === basename) ?? []
  return byRoot.length === 1 ? byRoot[0] : undefined
}

function matchingAssemblies(candidate: SourceCandidate, prefabPath: string) {
  const normalized = prefabPath.replaceAll('\\', '/').toLowerCase()
  const basename = normalized.split('/').at(-1)?.replace(/\.prefab$/i, '')
  const byPath = candidate.assembly?.filter(item => item.prefabPath?.replaceAll('\\', '/').toLowerCase() === normalized) ?? []
  if (byPath.length) return { kind: 'path' as const, matches: byPath }
  return {
    kind: 'root' as const,
    matches: candidate.assembly?.filter(item => item.root.toLowerCase() === basename) ?? [],
  }
}

type SourceAuthoredCoreGeometryAssessment =
  | { kind: 'none' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'warning'; warning: RenderingProfileCoreGeometryWarning }

function sourceAuthoredCoreGeometryWarning(
  prefabPath: string,
  assembly: InventoryAssembly | undefined,
  decision: RendererPolicyDecision,
): SourceAuthoredCoreGeometryAssessment {
  const known = SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE
  const renderer = decision.sourceRenderer
  const rendererReference = sourceRendererReference(renderer)
  const meshReference = renderer.meshSourceReference
  const normalizedPath = (value: string) => value.replaceAll('\\', '/').toLowerCase()
  if (decision.kind !== 'core'
    || normalizedPath(prefabPath) !== normalizedPath(known.prefabPath)
    || normalizedPath(assembly?.prefabPath ?? '') !== normalizedPath(known.prefabPath)
    || referenceKey(assembly?.prefabReference) !== referenceKey(known.prefabReference)
    || referenceKey(rendererReference) !== referenceKey(known.renderer.sourceReference)
    || renderer.name !== known.renderer.name
    || renderer.hierarchyPath !== known.renderer.hierarchyPath
    || renderer.rendererType !== known.renderer.rendererType
    || referenceKey(meshReference) !== referenceKey(known.sourceMeshReference)) return { kind: 'none' }

  if (!renderer.mesh
    || normalizedSerializedFile(renderer.mesh.file) !== normalizedSerializedFile(known.sourceMeshReference.serializedFile)
    || renderer.mesh.pathId !== known.sourceMeshReference.objectId) {
    return {
      kind: 'invalid',
      reason: 'The exact source-pinned CH0081 core renderer has missing or inconsistent mesh pointer evidence.',
    }
  }

  const materialSlots = renderer.materialSlots ?? []
  const slotsMatch = materialSlots.length === known.retainedMaterialSlots.length
    && materialSlots.every((slot, index) => {
    const expected = known.retainedMaterialSlots[index]
    const sourceMaterialReference = slot.sourceMaterialReference ?? null
    if (!slot.material) return false
    return slot.slot === expected.slot
      && sourceMaterialReference !== null
      && referenceKey(sourceMaterialReference) === referenceKey(expected.sourceMaterialReference)
      && normalizedSerializedFile(slot.material.file) === normalizedSerializedFile(expected.sourceMaterialReference.serializedFile)
      && slot.material.pathId === expected.sourceMaterialReference.objectId
  })
  if (!slotsMatch) {
    return {
      kind: 'invalid',
      reason: 'The exact source-pinned CH0081 core renderer has missing, reordered, or inconsistent identity evidence for its five required material slots.',
    }
  }
  return { kind: 'warning', warning: expectedSourceAuthoredCoreGeometryWarning() }
}

export function buildChibiRenderingProfile(candidate: SourceCandidate, prefabPath: string, interaction: ChibiProfile): ChibiRenderingProfile {
  const unresolved: string[] = []
  const assemblyMatches = matchingAssemblies(candidate, prefabPath)
  const assembly = selectedAssembly(candidate, prefabPath)
  if (assemblyMatches.matches.length > 1) unresolved.push(`Selected prefab ${prefabPath} has ${assemblyMatches.matches.length} ambiguous source renderer assemblies matched by ${assemblyMatches.kind}.`)
  else if (!assembly) unresolved.push(`No source renderer assembly matches selected prefab ${prefabPath}.`)
  else if (!assembly.prefabReference) unresolved.push(`Selected prefab ${prefabPath} has no exact source object identity.`)
  if (candidate.conflict) unresolved.push(`Source dependency identities conflict for ${candidate.sourceIdentity}.`)
  for (const ambiguity of assembly?.attachments.equipmentRendererAmbiguities ?? []) {
    unresolved.push(`Equipment renderer attachment ${ambiguity.name} is ambiguous (${ambiguity.reasonCode}); exact renderer identity is required.`)
  }
  const sourceMaterials = candidate.sourceMaterials ?? []
  const shaderIndex = new Map((candidate.shaders ?? []).flatMap(shader => shader.sourceReference ? [[referenceKey(shader.sourceReference), shader] as const] : []))
  const materialIndex = new Map(sourceMaterials.flatMap(material => material.sourceReference ? [[referenceKey(material.sourceReference), material] as const] : []))
  const pinnedRigMountAssessment = sourcePinnedRigMountAssessment(candidate, prefabPath, assembly, interaction, materialIndex, shaderIndex)
  if (pinnedRigMountAssessment && !pinnedRigMountAssessment.valid) {
    unresolved.push(`Source-pinned rig-mount group proof is incomplete for ${pinnedRigMountAssessment.group.identity}; exact source evidence is required.`)
  }
  const selectedClips = new Set(sourceAnimationClips(candidate, interaction))
  const seenRendererReferences = new Set<string>()
  const seenHierarchyPaths = new Set<string>()
  const pinnedRigMountKeys = new Set(pinnedRigMountAssessment?.sourceReferences.map(referenceKey) ?? [])
  const equipmentBindingEvidence = (assembly?.renderers ?? [])
    .map(renderer => {
      const rendererReference = sourceRendererReference(renderer)
      const rendererKey = rendererReference ? referenceKey(rendererReference) : null
      if (rendererKey && pinnedRigMountKeys.has(rendererKey)) {
        return pinnedRigMountAssessment?.valid
          ? pinnedRigMountAssessment.evidenceByReference.get(rendererKey) ?? null
          : null
      }
      return exactEquipmentBindingEvidence(assembly, renderer, materialIndex, shaderIndex)
        ?? structuralEquipmentBindingEvidence(candidate, assembly, renderer, materialIndex, shaderIndex)
    })
    .filter((value): value is RenderingProfileEquipmentBindingEvidence => value !== null)
    .sort((left, right) => referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference))
      || left.classification.localeCompare(right.classification)
      || left.reasonCode.localeCompare(right.reasonCode))
  const equipmentEvidenceByReference = new Map(equipmentBindingEvidence.map(value => [referenceKey(value.sourceReference), value] as const))
  const protectedRendererReferences = exactCoreRendererReferences(assembly)
  for (const key of pinnedRigMountKeys) protectedRendererReferences.add(key)
  for (const evidence of equipmentBindingEvidence) protectedRendererReferences.add(referenceKey(evidence.sourceReference))
  const rendererDecisions = (assembly?.renderers ?? []).map(sourceRenderer =>
    classifyRenderer(assembly, sourceRenderer, materialIndex, shaderIndex, protectedRendererReferences))
  const coreGeometryWarnings: RenderingProfileCoreGeometryWarning[] = []
  for (const decision of rendererDecisions) {
    const geometryAssessment = sourceAuthoredCoreGeometryWarning(prefabPath, assembly, decision)
    if (geometryAssessment.kind === 'warning') coreGeometryWarnings.push(geometryAssessment.warning)
    else if (geometryAssessment.kind === 'invalid') unresolved.push(geometryAssessment.reason)
  }
  coreGeometryWarnings.sort((left, right) => referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference)))
  const coreGeometryBlockers: RenderingProfileCoreGeometryBlocker[] = []
  const coreRendererBlockers = rendererDecisions
    .map(decision => decision.kind === 'core'
      ? missingEquipmentRelationBlocker(assembly, decision.sourceRenderer, materialIndex, shaderIndex,
        sourceRendererReference(decision.sourceRenderer)
          ? equipmentEvidenceByReference.get(referenceKey(sourceRendererReference(decision.sourceRenderer)!))
          : undefined)
      : null)
    .filter((value): value is RenderingProfileCoreRendererBlocker => value !== null)
    .sort((left, right) => referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference))
      || String(left.hierarchyPath ?? '').localeCompare(String(right.hierarchyPath ?? ''))
      || left.name.localeCompare(right.name))
  for (const blocker of coreRendererBlockers) {
    unresolved.push(`Core renderer ${blocker.hierarchyPath ?? blocker.name} is a source-bound weapon/equipment renderer without an exact authored attachment relation (${blocker.reasonCode}).`)
  }
  const decisionByReference = new Map<string, RendererPolicyDecision[]>()
  for (const decision of rendererDecisions) {
    const reference = sourceRendererReference(decision.sourceRenderer)
    if (!reference) continue
    const key = referenceKey(reference)
    const values = decisionByReference.get(key) ?? []
    values.push(decision)
    decisionByReference.set(key, values)
  }
  // A duplicated source identity is already a profile blocker.  Never let a
  // duplicate be silently removed merely because one occurrence looks like
  // presentation and another occurrence looks core.
  for (const [key, decisions] of decisionByReference) {
    if (decisions.length > 1 && decisions.some(item => item.kind === 'excluded')) {
      unresolved.push(`Selected assembly contains duplicate source renderer identity ${key}; presentation exclusion is not safe.`)
      for (const decision of decisions) {
        if (decision.kind === 'excluded') decision.kind = 'core'
      }
    }
  }
  const requiredCoreRenderers = rendererDecisions
    .filter((decision): decision is RendererPolicyDecision & { kind: 'core' } => decision.kind === 'core')
    .map(decision => decision.sourceRenderer)
  const excludedRenderers = rendererDecisions
    .filter((decision): decision is RendererPolicyDecision & { kind: 'excluded'; excluded: RenderingProfileExcludedRenderer } => decision.kind === 'excluded' && Boolean(decision.excluded))
    .map(decision => decision.excluded)
    .sort((left, right) => referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference)))
  const excludedRendererReferences = new Map(excludedRenderers.map(renderer => [referenceKey(renderer.sourceReference), renderer] as const))
  const renderers: RenderingProfileRenderer[] = (assembly?.renderers ?? [])
    .filter(sourceRenderer => {
      const decision = sourceRendererReference(sourceRenderer)
        ? rendererDecisions.find(item => sourceRendererReference(item.sourceRenderer)
          && referenceKey(sourceRendererReference(item.sourceRenderer)) === referenceKey(sourceRendererReference(sourceRenderer)))
        : undefined
      return decision?.kind !== 'excluded'
    })
    .map(sourceRenderer => {
    const builtinResource = unityBuiltinQuadReference(sourceRenderer.mesh)
    const rendererLabel = sourceRenderer.hierarchyPath ?? sourceRenderer.name
    const reference = sourceRendererReference(sourceRenderer)
    if (!reference) unresolved.push(`Renderer ${sourceRenderer.hierarchyPath ?? sourceRenderer.name} has no source object identity.`)
    else {
      const key = referenceKey(reference)
      if (seenRendererReferences.has(key)) unresolved.push(`Selected assembly contains duplicate source renderer identity ${key}.`)
      seenRendererReferences.add(key)
    }
    if (!sourceRenderer.hierarchyPath) unresolved.push(`Renderer ${sourceRenderer.name} has no exact source hierarchy path.`)
    else if (seenHierarchyPaths.has(sourceRenderer.hierarchyPath)) unresolved.push(`Selected assembly contains duplicate renderer hierarchy path ${sourceRenderer.hierarchyPath}.`)
    else seenHierarchyPaths.add(sourceRenderer.hierarchyPath)
    const materialSlots: RenderingProfileMaterialSlot[] = (sourceRenderer.materialSlots ?? []).map(slot => {
      const materialReference = slot.sourceMaterialReference ?? null
      const sourceMaterial = materialReference ? materialIndex.get(referenceKey(materialReference)) : undefined
      if (slot.material && slot.material.pathId !== '0' && !materialReference) unresolved.push(`Renderer ${sourceRenderer.hierarchyPath ?? sourceRenderer.name} slot ${slot.slot} has an ambiguous material object reference.`)
      if (materialReference && !sourceMaterial) unresolved.push(`Renderer ${sourceRenderer.hierarchyPath ?? sourceRenderer.name} slot ${slot.slot} material ${referenceKey(materialReference)} is missing from the candidate closure.`)
      const sourceShaderReference = sourceMaterial?.shaderReference ?? null
      const shader = sourceShaderReference ? shaderIndex.get(referenceKey(sourceShaderReference)) : undefined
      if (sourceMaterial && sourceMaterial.shader && !sourceShaderReference) unresolved.push(`Material ${sourceMaterial.name} has an ambiguous shader object reference.`)
      if (sourceMaterial && sourceShaderReference && !shader) unresolved.push(`Shader ${sourceMaterial.shaderName ?? referenceKey(sourceShaderReference)} is missing from the candidate closure.`)
      const shaderName = sourceMaterial?.shaderParsedName ?? sourceMaterial?.shaderName ?? '(unnamed)'
      const customRule = sourceMaterial ? customShaderAdapterRule(sourceMaterial.shaderName ?? null, sourceMaterial.shaderParsedName ?? null) : undefined
      const glitchRule = sourceMaterial ? dsfxGlitchShaderRule(sourceMaterial.shaderName ?? null, sourceMaterial.shaderParsedName ?? null) : undefined
      const dsfxRule = sourceMaterial ? dsfxStaticShaderRule(sourceMaterial.shaderName ?? null, sourceMaterial.shaderParsedName ?? null) : undefined
      const adapterId = sourceMaterial ? adapterFor(sourceMaterial.shaderName ?? null, sourceMaterial.shaderParsedName ?? null, shader) : null
      const translated = sourceMaterial ? renderState(sourceMaterial, shader) : null
      let shaderExtraction: RenderingProfileShaderExtraction | null = null
      let transparentShaderExtraction: RenderingProfileTransparentShaderExtraction | null = null
      let projectMxShaderExtraction: RenderingProfileProjectMxShaderExtraction | null = null
      let eStandardShaderExtraction: RenderingProfileEStandardShaderExtraction | null = null
      let dsfxShaderExtraction: InventoryShaderExtraction | null = null
      let dsfxRenderStateVariant: DsfxStaticRenderStateVariant | null = null
      let dsfxMaterialVariant: RenderingProfileMaterialSlot['dsfxMaterialVariant'] = null
      let glitchShaderExtraction: RenderingProfileGlitchShaderExtraction | null = null
      let matcapShaderExtraction: RenderingProfileMatcapShaderExtraction | null = null
      if (sourceMaterial && glitchRule) {
        const extractionEvidence = dsfxGlitchShaderExtractionEvidence(shader)
        const materialError = dsfxGlitchMaterialEvidence(sourceMaterial, shader, translated?.state ?? null, extractionEvidence)
        if (materialError) unresolved.push(`Source shader ${shaderName} is not verified for adapter dsfx-glitch-tex: ${materialError}.`)
        else if ('source' in extractionEvidence) glitchShaderExtraction = extractionEvidence.source
      } else if (sourceMaterial && customRule) {
        const evidenceError = customShaderEvidence(customRule, shader)
        if (evidenceError) unresolved.push(`Source shader ${shaderName} is not verified for adapter ${customRule.id}: ${evidenceError}.`)
        else if (customRule.id === 'mx-unlit-outline') {
          const extractionEvidence = outlineShaderExtractionEvidence(shader)
          if ('error' in extractionEvidence) unresolved.push(`Source shader ${shaderName} is not verified for adapter ${customRule.id}: ${extractionEvidence.error}.`)
          else shaderExtraction = extractionEvidence.source
        } else if (customRule.id === 'mx-c-transparent-st') {
          const extractionEvidence = transparentShaderExtractionEvidence(shader)
          if ('error' in extractionEvidence) unresolved.push(`Source shader ${shaderName} is not verified for adapter ${customRule.id}: ${extractionEvidence.error}.`)
          else transparentShaderExtraction = extractionEvidence.source
          const materialError = transparentMaterialEvidence(sourceMaterial, translated?.state ?? null)
          if (materialError) unresolved.push(`Source material ${sourceMaterial.name} is not verified for adapter ${customRule.id}: ${materialError}.`)
        } else if (customRule.id === 'projectmx-weapon-test1-damage') {
          const activeVariant: 'forward' | 'glow' = sourceMaterial.keywords?.length === 1
            && sourceMaterial.keywords[0] === '_GLOW_0' ? 'glow' : 'forward'
          const extractionEvidence = projectMxShaderExtractionEvidence(shader, activeVariant)
          if ('error' in extractionEvidence) unresolved.push(`Source shader ${shaderName} is not verified for adapter ${customRule.id}: ${extractionEvidence.error}.`)
          else projectMxShaderExtraction = extractionEvidence.source
          const materialError = projectMxMaterialEvidence(sourceMaterial, translated?.state ?? null, projectMxShaderExtraction)
          if (materialError) unresolved.push(`Source material ${sourceMaterial.name} is not verified for adapter ${customRule.id}: ${materialError}.`)
        } else if (customRule.id === 'mx-e-standard') {
          const activeVariant: 'static' | 'dynamic' = sourceMaterial.keywords?.includes('_DYNAMIC_LIGHTS') ? 'dynamic' : 'static'
          const extractionEvidence = eStandardShaderExtractionEvidence(shader, activeVariant)
          if ('error' in extractionEvidence) unresolved.push(`Source shader ${shaderName} is not verified for adapter ${customRule.id}: ${extractionEvidence.error}.`)
          else eStandardShaderExtraction = extractionEvidence.source
          const materialError = eStandardMaterialEvidence(sourceMaterial, shader, translated?.state ?? null, eStandardShaderExtraction)
          if (materialError) unresolved.push(`Source material ${sourceMaterial.name} is not verified for adapter ${customRule.id}: ${materialError}.`)
        } else if (customRule.id === 'dsfx-matcap') {
          const extractionEvidence = dsfxMatcapShaderExtractionEvidence(shader)
          if ('error' in extractionEvidence) unresolved.push(`Source shader ${shaderName} is not verified for adapter ${customRule.id}: ${extractionEvidence.error}.`)
          else matcapShaderExtraction = extractionEvidence.source
          const materialError = dsfxMatcapMaterialEvidence(sourceMaterial, shader, translated?.state ?? null, extractionEvidence)
          if (materialError) unresolved.push(`Source material ${sourceMaterial.name} is not verified for adapter ${customRule.id}: ${materialError}.`)
        } else unresolved.push(customShaderRuntimeBlocker(customRule))
      } else if (sourceMaterial && dsfxRule) {
        const extractionEvidence = dsfxStaticShaderExtractionEvidence(dsfxRule, shader)
        const evidenceError = dsfxStaticMaterialEvidence(dsfxRule, sourceMaterial, shader, translated?.state ?? null, extractionEvidence)
        if (evidenceError) unresolved.push(`Source shader ${shaderName} is not verified for static adapter: ${evidenceError}.`)
        else if ('source' in extractionEvidence && extractionEvidence.source) {
          dsfxShaderExtraction = extractionEvidence.source
          if (dsfxRule.identity === 'dsfx/fx_shader_alphablend_0' || dsfxRule.identity === 'dsfx/fx_shader_alphablend_add' || dsfxRule.identity === 'dsfx/fx_shader_additive_0') {
            dsfxRenderStateVariant = dsfxStaticRenderStateVariant(dsfxRule, translated?.state ?? null)
          }
          if (dsfxRule.identity === 'dsfx/fx_shader_alphablend_add'
            && referenceKey(materialReference) === referenceKey(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE)) {
            dsfxMaterialVariant = DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT
          }
        }
      } else if (sourceMaterial && !adapterId) {
        unresolved.push(`Unsupported source shader ${shaderName} on ${sourceMaterial.name}.`)
      }
      if (sourceMaterial && translated) {
        if (translated.state.depthWrite === null) unresolved.push(`Depth-write state is unresolved for material ${sourceMaterial.name}.`)
        if (translated.state.depthTest === null) unresolved.push(`Depth-test state is unresolved for material ${sourceMaterial.name}.`)
        if (translated.state.cullMode === null) unresolved.push(`Cull state is unresolved for material ${sourceMaterial.name}.`)
        for (const state of translated.unresolved) unresolved.push(`Shader pass state is unresolved for material ${sourceMaterial.name}.`)
      }
      if (adapterId === 'mx-character-eyemouth') {
        const mouthTexture = sourceMaterial?.textures.find(texture => texture.name === '_MouthTileTex')
        if (!shader?.programBlobSha256) unresolved.push(`EyeMouth shader bytecode evidence is missing for ${sourceMaterial?.name ?? 'a material slot'}.`)
        if (!mouthTexture?.textureReference && mouthTexture?.texture?.pathId !== '0') unresolved.push(`Mouth atlas reference is unresolved for ${sourceMaterial?.name ?? 'a material slot'}.`)
      }
      if (adapterId === 'mx-character-eyebrow') {
        const correction = propertyValue(sourceMaterial!, '_ZCorrection') ?? shaderDefault(shader, '_ZCorrection')
        if (!shader?.programBlobSha256 || correction === null) unresolved.push(`Eyebrow camera correction is unresolved for ${sourceMaterial?.name ?? 'a material slot'}.`)
      }
      return {
        slot: slot.slot,
        sourceMaterialReference: materialReference,
        sourceMaterialName: sourceMaterial?.name ?? null,
        sourceShaderReference,
         sourceShaderName: sourceMaterial?.shaderName ?? null,
         sourceShaderParsedName: sourceMaterial?.shaderParsedName ?? null,
         shaderProgramBlobSha256: shader?.programBlobSha256 ?? null,
         ...(shaderExtraction ? { shaderExtraction } : {}),
         ...(transparentShaderExtraction ? { transparentShaderExtraction } : {}),
         ...(projectMxShaderExtraction ? { projectMxShaderExtraction } : {}),
         ...(eStandardShaderExtraction ? { eStandardShaderExtraction } : {}),
         ...(dsfxShaderExtraction ? { dsfxShaderExtraction } : {}),
         ...(dsfxRenderStateVariant ? { dsfxRenderStateVariant } : {}),
         ...(dsfxMaterialVariant ? { dsfxMaterialVariant } : {}),
         ...(glitchShaderExtraction ? { glitchShaderExtraction } : {}),
         ...(matcapShaderExtraction ? { matcapShaderExtraction } : {}),
         adapterId,
        materialProperties: {
          floats: sourceMaterial?.floatProperties,
          ints: sourceMaterial?.intProperties,
          colors: sourceMaterial?.colorProperties,
          keywords: sourceMaterial?.keywords ?? [],
          textures: sourceMaterial?.textures ?? [],
          ...(sourceMaterial ? { resolvedTextures: sourceMaterial.resolvedTextures } : {}),
        },
        adapterSettings: {
          zCorrection: sourceMaterial && adapterId === 'mx-character-eyebrow'
            ? propertyValue(sourceMaterial, '_ZCorrection') ?? shaderDefault(shader, '_ZCorrection') : null,
          eyeTint: sourceMaterial && adapterId === 'mx-character-eyemouth'
            ? colorVector(sourceMaterial.colorProperties?._EyeTint) : null,
          mouthTint: sourceMaterial && adapterId === 'mx-character-eyemouth'
            ? colorVector(sourceMaterial.colorProperties?._MouthTint) : null,
          baseColorTint: sourceMaterial ? sourceBaseColorTint(sourceMaterial, shader, adapterId) : null,
          ...(sourceMaterial && adapterId === 'mx-unlit-outline'
             ? {
                 outlineTint: materialColor(sourceMaterial, shader, '_OutlineTint'),
                 outlineZCorrection: propertyValue(sourceMaterial, '_OutlineZCorrection') ?? shaderDefault(shader, '_OutlineZCorrection'),
             }
             : {}),
          ...(sourceMaterial && adapterId === 'mx-c-transparent-st'
            ? { transparentVariant: sourceMaterial.keywords?.length === 1 && sourceMaterial.keywords[0] === '_DITHER_HORIZONTAL_LINES' ? 'dither' as const : sourceMaterial.keywords?.length === 0 ? 'forward' as const : null }
            : {}),
          ...(sourceMaterial && adapterId === 'dsfx-static'
            ? { dsfxMultiply: propertyValue(sourceMaterial, '_Multiply') ?? shaderDefault(shader, '_Multiply') }
            : {}),
        },
        renderState: translated?.state ?? {
          sourceQueue: sourceMaterial?.renderQueue ?? -1, layer: 'opaque', alphaMode: 'OPAQUE', depthWrite: null,
          depthTest: null, depthFunction: null, cullMode: null, doubleSided: null, blend: { source: null, destination: null },
          polygonOffsetFactor: null, polygonOffsetUnits: null,
        },
        glb: null,
      }
    })
    if (sourceRenderer.visible !== false && materialSlots.length === 0) unresolved.push(`Visible renderer ${sourceRenderer.hierarchyPath ?? sourceRenderer.name} has no indexed material slots.`)
    if (sourceRenderer.visible !== false && !sourceRenderer.mesh) unresolved.push(`Visible renderer ${sourceRenderer.hierarchyPath ?? sourceRenderer.name} has no source mesh reference.`)
    else if (sourceRenderer.mesh && builtinResource) {
      if (sourceRenderer.meshSourceReference) unresolved.push(`Renderer ${rendererLabel} built-in Quad has an unexpected imported mesh source reference.`)
      if (sourceRenderer.rendererType !== 'MeshRenderer') unresolved.push(`Renderer ${rendererLabel} built-in Quad must be an unskinned MeshRenderer.`)
    } else if (sourceRenderer.mesh && !sourceRenderer.meshSourceReference) {
      const ownerFile = reference?.serializedFile ?? sourceRenderer.mesh.file
      if (ownerFile && isExactNullPointer(sourceRenderer.mesh, ownerFile)) {
        const sourceIdentity = reference
          ? `${normalizedSerializedFile(reference.serializedFile)}#${reference.objectId}`
          : 'identity unresolved'
        unresolved.push(`Core renderer ${rendererLabel} (${sourceIdentity}) has an exact null source mesh pointer (${normalizedSerializedFile(ownerFile)}:0); no core geometry is assigned.`)
      } else {
        unresolved.push(`Renderer ${rendererLabel} has an ambiguous source mesh reference.`)
      }
    }
    const sourceMesh = sourceRenderer.mesh
      ? { ...sourceRenderer.mesh, sourceReference: sourceRenderer.meshSourceReference ?? null,
        ...(builtinResource ? { builtinResource } : {}) }
      : null
    return {
      sourceReference: reference,
      name: sourceRenderer.name,
      hierarchyPath: sourceRenderer.hierarchyPath ?? null,
      rendererType: sourceRenderer.rendererType ?? null,
      defaultVisible: sourceRenderer.visible ?? (sourceRenderer.enabled && sourceRenderer.gameObjectActive !== false),
      sourceMesh,
      glbNodeIndex: null,
      materialSlots,
    }
  })

  const childRendererEvents: RenderingProfileChildRendererEvent[] = []
  const excludedChildRendererEvents: RenderingProfileExcludedChildRendererEvent[] = []
  const fxExclusionProofs: RenderingProfileFxExclusionProof[] = []
  const excludedFxInstantiationEvents: RenderingProfileExcludedFxInstantiationEvent[] = []
  const seenFxEventKeys = new Set<string>()
  candidate.events.forEach((event, order) => {
    if (!selectedClips.has(event.clip) || !isChibiInstantiateFxEventFunction(event.function)) return
    const result = buildFxInstantiationExclusion(event, order, assembly, requiredCoreRenderers)
    if ('error' in result) {
      unresolved.push(`Selected InstantiateFx event ${event.clip} at ${event.time} is unresolved: ${result.error}`)
      return
    }
    const key = `${referenceKey(result.proof.eventSourceReference)}:${result.proof.clip}:${result.proof.time}:${result.proof.order}:${referenceKey(result.proof.targetReference)}`
    if (seenFxEventKeys.has(key)) {
      unresolved.push(`Selected InstantiateFx event ${event.clip} at ${event.time} has a duplicate exact event identity.`)
      return
    }
    seenFxEventKeys.add(key)
    fxExclusionProofs.push(result.proof)
    excludedFxInstantiationEvents.push(result.diagnostic)
  })
  const fxEventSort = (left: Pick<RenderingProfileFxExclusionProof, 'time' | 'order' | 'eventSourceReference' | 'targetReference'>,
    right: Pick<RenderingProfileFxExclusionProof, 'time' | 'order' | 'eventSourceReference' | 'targetReference'>) =>
    left.time - right.time || left.order - right.order
      || referenceKey(left.eventSourceReference).localeCompare(referenceKey(right.eventSourceReference))
      || referenceKey(left.targetReference).localeCompare(referenceKey(right.targetReference))
  fxExclusionProofs.sort(fxEventSort)
  excludedFxInstantiationEvents.sort(fxEventSort)
  candidate.events.forEach((event, order) => {
    if (!selectedClips.has(event.clip)
      || (event.function !== 'AniEvt_DisableChildRenderer' && event.function !== 'AniEvt_EnableChildRenderer')) return
    const targetReference = event.targetReference ?? null
    if (!targetReference) {
      unresolved.push(`Selected child-renderer event ${event.clip} at ${event.time} has no exact source renderer-ID binding; BAAD supplied index ${event.int} without a source object reference.`)
      return
    }
    const excludedRenderer = excludedRendererReferences.get(referenceKey(targetReference))
    if (excludedRenderer) {
      excludedChildRendererEvents.push({
        clip: event.clip,
        time: event.time,
        action: event.function === 'AniEvt_EnableChildRenderer' ? 'enable' : 'disable',
        sourceRendererReference: targetReference,
        order,
        reasonCode: 'PRESENTATION_CHILD_RENDERER_EVENT',
        evidence: [
          `event target exactly matches excluded renderer ${referenceKey(targetReference)}`,
          ...excludedRenderer.evidence.filter(value => value !== `exact source renderer reference ${referenceKey(targetReference)}`),
        ],
      })
      return
    }
    const matches = renderers.filter(renderer => renderer.sourceReference
      && referenceKey(renderer.sourceReference) === referenceKey(targetReference))
    if (matches.length !== 1) {
      unresolved.push(`Selected child-renderer event ${event.clip} at ${event.time} target ${referenceKey(targetReference)} resolves to ${matches.length} selected source renderers.`)
      return
    }
    childRendererEvents.push({
      clip: event.clip,
      time: event.time,
      action: event.function === 'AniEvt_EnableChildRenderer' ? 'enable' : 'disable',
      sourceRendererReference: matches[0].sourceReference!,
      order,
    })
  })
  childRendererEvents.sort((left, right) => left.time - right.time || left.order - right.order)
  excludedChildRendererEvents.sort((left, right) => left.time - right.time || left.order - right.order
    || referenceKey(left.sourceRendererReference).localeCompare(referenceKey(right.sourceRendererReference)))

  let mouth: ChibiRenderingProfile['mouth'] = null
  const mouthMetadata = assembly?.attachments.mouthMetadata ?? []
  const legacyMouthPointers = assembly?.attachments.mouthRenderer ?? []
  // Fresh inventories retain one exact metadata record per source component;
  // older inventories may only have the legacy attachment fields.  Keep both
  // shapes in the authority set so a duplicate or conflicting component is
  // detected instead of being hidden by preferring the newer shape.
  const mouthPointers = [
    ...mouthMetadata.map(metadata => ({
      ...metadata.renderer,
      sourceReference: metadata.sourceRendererReference ?? null,
    })),
    ...legacyMouthPointers,
  ]
  const mouthPointerIdentity = (pointer: typeof mouthPointers[number]) => {
    const exactRenderer = pointer.sourceReference ? null : renderers.filter(renderer => renderer.sourceReference
      && renderer.sourceReference.serializedFile.toLowerCase() === (pointer.file ?? '').replaceAll('\\', '/').toLowerCase()
      && renderer.sourceReference.objectId === pointer.pathId)
    const sourceReference = pointer.sourceReference ?? (exactRenderer?.length === 1 ? exactRenderer[0].sourceReference : null)
    return sourceReference
      ? `reference:${referenceKey(sourceReference)}`
      : `pointer:${(pointer.file ?? '').replaceAll('\\', '/').toLowerCase()}:${pointer.pathId}`
  }
  const mouthPointerIdentities = new Set(mouthPointers.map(mouthPointerIdentity))
  if (mouthPointerIdentities.size > 1) unresolved.push('Mouth component metadata conflicts: multiple source renderer identities are authoritative.')
  const metadataMaterialIndices = mouthMetadata.flatMap(metadata => Number.isInteger(metadata.materialIndex) ? [metadata.materialIndex!] : [])
  const metadataMaterialIndexSet = new Set(metadataMaterialIndices)
  const legacyMaterialIndex = assembly?.attachments.mouthMaterialIndex
  if (metadataMaterialIndexSet.size > 1 || (metadataMaterialIndices.length && Number.isInteger(legacyMaterialIndex)
    && metadataMaterialIndices.some(index => index !== legacyMaterialIndex))) {
    unresolved.push('Mouth component metadata conflicts: multiple material slot indices are authoritative.')
  }
  const metadataDefaultUVs = mouthMetadata.flatMap(metadata => metadata.defaultUV ? [metadata.defaultUV] : [])
  const metadataUVKeys = new Set(metadataDefaultUVs.map(uv => `${uv.x}:${uv.y}`))
  const legacyDefaultUV = assembly?.attachments.mouthDefaultUV
  if (metadataUVKeys.size > 1 || (metadataDefaultUVs.length && legacyDefaultUV
    && metadataDefaultUVs.some(uv => uv.x !== legacyDefaultUV.x || uv.y !== legacyDefaultUV.y))) {
    unresolved.push('Mouth component metadata conflicts: multiple default UV coordinates are authoritative.')
  }
  // Some prefabs leave the component unbound; the verified shader still owns
  // an exact mouth atlas and authored default offset on its material slot.
  const fallbackSlots = !mouthPointers.length && !mouthMetadata.length && (legacyMaterialIndex === undefined || legacyMaterialIndex === -1)
    ? renderers.flatMap(renderer => renderer.materialSlots.flatMap(slot => {
      const material = slot.sourceMaterialReference ? materialIndex.get(referenceKey(slot.sourceMaterialReference)) : undefined
      const atlas = material?.textures.find(texture => texture.name === '_MouthTileTex')
      return renderer.sourceReference && slot.adapterId === 'mx-character-eyemouth' && atlas?.textureReference
        && material?.resolvedTextures.some(texture => texture.property === '_MouthTileTex' && texture.sourceReference
          && referenceKey(texture.sourceReference) === referenceKey(atlas.textureReference!))
        ? [{ renderer, slot, atlas }] : []
    })) : []
  if (fallbackSlots.length > 1) unresolved.push('Mouth shader fallback has multiple source material slots; no unique binding is available.')
  const fallback = fallbackSlots.length === 1 ? fallbackSlots[0] : undefined
  const mouthRendererPointer = mouthPointers[0] ?? (fallback ? { sourceReference: fallback.renderer.sourceReference, file: '', pathId: '' } : undefined)
  if (mouthRendererPointer) {
    const sourceRendererMatches = mouthRendererPointer.sourceReference
      ? renderers.filter(renderer => renderer.sourceReference
        && referenceKey(renderer.sourceReference) === referenceKey(mouthRendererPointer.sourceReference))
      : renderers.filter(renderer => renderer.sourceReference
        && renderer.sourceReference.serializedFile.toLowerCase() === (mouthRendererPointer.file ?? '').toLowerCase()
        && renderer.sourceReference.objectId === mouthRendererPointer.pathId)
    const sourceRenderer = sourceRendererMatches.length === 1 ? sourceRendererMatches[0] : undefined
    if (sourceRendererMatches.length !== 1) unresolved.push(`Mouth component does not resolve to exactly one source renderer (${sourceRendererMatches.length} exact matches).`)
    const slotIndex = fallback?.slot.slot ?? metadataMaterialIndices[0] ?? legacyMaterialIndex
    if (!Number.isInteger(slotIndex) || (slotIndex ?? -1) < 0) unresolved.push('Mouth component has an invalid or missing material slot index.')
    const boundRenderer = sourceRenderer
    const slot = boundRenderer?.materialSlots.find(material => material.slot === slotIndex)
    if (sourceRenderer && Number.isInteger(slotIndex) && !slot) unresolved.push(`Mouth material slot ${slotIndex} does not exist on ${sourceRenderer.name}.`)
    const eyeMaterial = slot?.sourceMaterialReference ? materialIndex.get(referenceKey(slot.sourceMaterialReference)) : undefined
    const adapter = slot?.adapterId
    if (slot && adapter !== 'mx-character-eyemouth') unresolved.push(`Mouth material slot ${slotIndex} is not bound to a verified EyeMouth shader.`)
    const atlas = eyeMaterial?.textures.find(texture => texture.name === '_MouthTileTex')
    const resolvedAtlas = eyeMaterial?.resolvedTextures.find(texture => texture.property === '_MouthTileTex')
    const defaultUV = fallback?.atlas.offset ?? metadataDefaultUVs[0] ?? legacyDefaultUV
    const transformScale = atlas?.scale, transformOffset = atlas?.offset
    const serializedColumns = finiteNumber(eyeMaterial?.floatProperties?._MouthTileCols)
    const serializedRows = finiteNumber(eyeMaterial?.floatProperties?._MouthTileRows)
    const x = finiteNumber(defaultUV?.x), y = finiteNumber(defaultUV?.y)
    if (x === null || y === null) unresolved.push('Mouth default UV coordinates are missing or non-finite.')
    const scaleX = finiteNumber(transformScale?.x), scaleY = finiteNumber(transformScale?.y)
    const offsetX = finiteNumber(transformOffset?.x), offsetY = finiteNumber(transformOffset?.y)
    if (scaleX === null || scaleY === null || offsetX === null || offsetY === null) unresolved.push('Mouth atlas texture transform is missing or non-finite.')
    const sourceMouthEvents = candidate.events.filter(event => selectedClips.has(event.clip)
      && ['SetMouthTile', 'SetHorizontallyFlippedMouthTile', 'SetMouthTileToDefault'].includes(event.function))
      .map((event, order) => {
        const rawTile = event.function === 'SetMouthTileToDefault' ? null : event.int !== 0 ? event.int : Number(event.string)
        return { event, order, rawTile }
      })
    // A shader default or out-of-range animation event cannot override the
    // material's authored grid. Keep those events as diagnostics below.
    const columns = positiveInteger(serializedColumns) ?? 8
    const rows = positiveInteger(serializedRows) ?? 8
    const tileX = x === null ? 0 : Math.max(0, Math.min(columns - 1, Math.round(x * columns)))
    const tileY = y === null ? 0 : Math.max(0, Math.min(rows - 1, Math.round(y * rows)))
    const defaultTile = tileY * 100 + tileX
    const events = sourceMouthEvents.map(({ event, order, rawTile }) => ({
      event: {
        clip: event.clip, time: event.time,
        tile: event.function === 'SetMouthTileToDefault' ? defaultTile : Math.abs(rawTile ?? Number.NaN),
        flipX: event.function === 'SetMouthTileToDefault' ? false
          : event.function === 'SetHorizontallyFlippedMouthTile' || (rawTile ?? Number.NaN) < 0,
      },
      order,
    }))
      .filter(item => Number.isFinite(item.event.tile) && Number.isFinite(item.event.time))
      .sort((left, right) => left.event.time - right.event.time || left.order - right.order)
      .map(item => item.event)
    for (const event of events) {
      if (Math.floor(event.tile / 100) >= rows || event.tile % 100 >= columns) {
        unresolved.push(`Mouth tile ${event.tile} is outside the ${columns}x${rows} source atlas for ${event.clip}.`)
      }
    }
    if (sourceRenderer?.sourceReference && Number.isInteger(slotIndex) && x !== null && y !== null
      && atlas?.textureReference && scaleX !== null && scaleY !== null && offsetX !== null && offsetY !== null) {
      mouth = {
        sourceRendererReference: sourceRenderer.sourceReference,
        materialSlot: slotIndex!,
        defaultUV: { x, y }, defaultTile, columns, rows, textureProperty: '_MouthTileTex',
        textureReference: atlas.textureReference,
        textureTransform: { scale: { x: scaleX, y: scaleY }, offset: { x: offsetX, y: offsetY } },
        shaderUvRule: { xLessEqual: 0.25, yLessEqual: 0.25, glbVInverted: true },
        events, glbPrimitiveIndices: { eyes: [], mouth: [] }, glbMaterialIndex: null,
      }
    }
  }
  if (mouth && !mouth.textureReference) unresolved.push('Mouth atlas has no exact source object identity.')

  const drawSequence = [...renderers].sort((left, right) => {
    const layerLeft = Math.max(...left.materialSlots.map(slot => slot.renderState.layer === 'transparent' ? 1 : 0), 0)
    const layerRight = Math.max(...right.materialSlots.map(slot => slot.renderState.layer === 'transparent' ? 1 : 0), 0)
    return layerLeft - layerRight || left.name.localeCompare(right.name)
  }).flatMap(renderer => renderer.sourceReference ? [referenceKey(renderer.sourceReference)] : [])

  // Arrangement evidence is independent from other diagnostics.  A proven
  // attachment uncertainty may be a warning while unrelated action, material,
  // or core failures remain blocking.
  const arrangementBlockerMessage = coreRendererBlockers.length === 1
    ? `Core renderer ${coreRendererBlockers[0].hierarchyPath ?? coreRendererBlockers[0].name} is a source-bound weapon/equipment renderer without an exact authored attachment relation (${coreRendererBlockers[0].reasonCode}).`
    : null
  const arrangementAttachmentWarning = coreGeometryBlockers.length === 0
    && arrangementBlockerMessage !== null
    && unresolved.includes(arrangementBlockerMessage)
    && (() => {
      const blocker = coreRendererBlockers[0]
      const renderer = assembly?.renderers.find(item => sourceRendererReference(item)
        && referenceKey(sourceRendererReference(item)) === referenceKey(blocker.sourceReference))
      if (!renderer) return false
      if (unresolved.length === 1) {
        return arrangementOnlyAttachmentEvidence(candidate, assembly, renderer, blocker, interaction, equipmentBindingEvidence)
      }
      return arrangementOnlyAttachmentEvidence(candidate, assembly, renderer, blocker, interaction, equipmentBindingEvidence, true)
    })()
  const swimsuitBlockerMessages = coreRendererBlockers.map(blocker =>
    `Core renderer ${blocker.hierarchyPath ?? blocker.name} is a source-bound weapon/equipment renderer without an exact authored attachment relation (${blocker.reasonCode}).`)
  const swimsuitPairIsSoleUncertainty = coreRendererBlockers.length === 2
    && unresolved.length === 2
    && new Set(unresolved).size === 2
    && swimsuitBlockerMessages.every(message => unresolved.includes(message))
    && exactSaoriSwimsuitArrangementEvidence(candidate, assembly, coreRendererBlockers, interaction)
  const pinnedRigMountBlockerMessages = coreRendererBlockers.map(blocker =>
    `Core renderer ${blocker.hierarchyPath ?? blocker.name} is a source-bound weapon/equipment renderer without an exact authored attachment relation (${blocker.reasonCode}).`)
  const pinnedRigMountGroupIsSoleUncertainty = Boolean(pinnedRigMountAssessment?.valid)
    && coreGeometryBlockers.length === 0
    && coreRendererBlockers.length === pinnedRigMountAssessment!.sourceReferences.length
    && unresolved.length === pinnedRigMountAssessment!.sourceReferences.length
    && new Set(unresolved).size === unresolved.length
    && pinnedRigMountBlockerMessages.every(message => unresolved.includes(message))
    && pinnedRigMountAssessment!.sourceReferences.every(reference => coreRendererBlockers.some(blocker =>
      referenceKey(blocker.sourceReference) === referenceKey(reference)))
  const pinnedRigMountWarning: RenderingProfilePolicyWarning | null = pinnedRigMountGroupIsSoleUncertainty
    ? {
      reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
      message: `Source-pinned same-prefab rig-mount group ${pinnedRigMountAssessment!.group.identity} has no authored main/sub slot; all group renderers remain included and their arrangement may need review.`,
      blocker: coreRendererBlockers[0],
      sourceGroupReferences: pinnedRigMountAssessment!.sourceReferences,
      sourceEvidence: [...new Set([
        ...pinnedRigMountAssessment!.warningEvidence,
        ...pinnedRigMountAssessment!.sourceReferences.flatMap(reference =>
          pinnedRigMountAssessment!.evidenceByReference.get(referenceKey(reference))?.evidence ?? []),
      ])],
    }
    : null
  const swimsuitArrangementWarnings: RenderingProfilePolicyWarning[] = swimsuitPairIsSoleUncertainty
    ? coreRendererBlockers.map((blocker, index) => ({
      reasonCode: blocker.reasonCode,
      message: swimsuitBlockerMessages[index],
      blocker,
    }))
    : []
  const warnings: RenderingProfilePolicyWarning[] = pinnedRigMountWarning
    ? [pinnedRigMountWarning]
    : swimsuitPairIsSoleUncertainty
    ? swimsuitArrangementWarnings
    : arrangementAttachmentWarning
      ? [{ reasonCode: coreRendererBlockers[0].reasonCode, message: arrangementBlockerMessage!, blocker: coreRendererBlockers[0] }]
      : []
  const arrangementWarningPublished = warnings.length > 0
  const independentArrangementWarning = arrangementAttachmentWarning
    && !pinnedRigMountWarning && !swimsuitPairIsSoleUncertainty
  const publishedCoreRendererBlockers = arrangementWarningPublished ? [] : coreRendererBlockers
  const publishedUnresolved = independentArrangementWarning
    ? [...new Set(unresolved.filter(message => message !== arrangementBlockerMessage))]
    : arrangementWarningPublished ? [] : [...new Set(unresolved)]

  return {
    schemaVersion: 2,
    profileVersion: CHIBI_RENDERING_PROFILE_VERSION,
    adapterVersion: CHIBI_SHADER_ADAPTER_VERSION,
    sourceIdentity: candidate.sourceIdentity,
    dependencyFingerprint: candidate.fingerprint,
    sourcePrefab: { path: prefabPath, reference: assembly?.prefabReference ?? null },
    assembly: assembly ?? null,
    renderers,
    childRendererEvents,
    excludedRenderers,
    excludedChildRendererEvents,
    fxExclusionProofs,
    excludedFxInstantiationEvents,
    coreRendererBlockers: publishedCoreRendererBlockers,
    coreGeometryBlockers,
    coreGeometryWarnings,
    equipmentBindingEvidence,
    warnings,
    mouth,
    drawSequence,
    policyVersion: CHIBI_RENDERING_POLICY_VERSION,
    validation: {
      valid: publishedUnresolved.length === 0,
      unresolved: publishedUnresolved,
      excludedRenderers,
      excludedChildRendererEvents,
      fxExclusionProofs,
      excludedFxInstantiationEvents,
      coreRendererBlockers: publishedCoreRendererBlockers,
      coreGeometryBlockers,
      coreGeometryWarnings,
      equipmentBindingEvidence,
      warnings,
    },
  }
}

export function sourceObjectKey(reference: InventorySourceReference | null | undefined) {
  return referenceKey(reference)
}
