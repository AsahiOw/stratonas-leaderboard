import * as THREE from 'three'

export interface ChibiViewerBlendState {
  source: number
  destination: number
  sourceAlpha: number
  destinationAlpha: number
  operation: number
  operationAlpha: number
}

export interface ChibiViewerMaterialMetadata {
  adapterId?: unknown
  alphaMode?: unknown
  blend?: Partial<ChibiViewerBlendState> | null
  depthWrite?: unknown
  depthTest?: unknown
  depthFunction?: unknown
  cullMode?: unknown
  doubleSided?: unknown
  /** Exact translated state variant for static DSFX AlphaBlend_0/AlphaBlend_Add. */
  dsfxRenderStateVariant?: unknown
  /** Exact source material with a null _Texture pointer and Unity white default. */
  dsfxMaterialVariant?: unknown
  polygonOffsetFactor?: unknown
  polygonOffsetUnits?: unknown
  renderOrder?: unknown
  sourceShaderReference?: unknown
  /** Exact source extraction for static DSFX Additive_0/AlphaBlend_Add when published. */
  dsfxShaderExtraction?: ChibiViewerDsfxShaderExtractionMetadata | null
  /** Exact source material properties retained for static DSFX adapters. */
  dsfxMaterialProperties?: {
    floats?: Record<string, number | string>
    ints?: Record<string, number>
    colors?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>
    keywords?: unknown
    textures?: unknown[]
    resolvedTextures?: unknown[]
  } | null
  /** Exact exported GLB texture index for static DSFX adapters. */
  dsfxTextures?: { texture?: { index?: unknown; default?: unknown } | null } | null
  outlineTint?: unknown
  outlineZCorrection?: unknown
  outlinePass?: ChibiViewerShaderPassMetadata | null
  shaderExtraction?: ChibiViewerShaderExtractionMetadata | null
  /** Exact ProjectMX extraction retained in the GLB extras payload. */
  projectMxShaderExtraction?: ChibiViewerProjectMxShaderExtractionMetadata | null
  /** Source-authored ProjectMX material values used by the recovered GLSL. */
  projectMxMaterialProperties?: ChibiViewerProjectMxMaterialProperties | null
  /** Exact GLB texture dependency indices for ProjectMX sampler bindings. */
  projectMxTextures?: ChibiViewerProjectMxTextureBindings | null
  /** Exact E-Standard extraction retained in the GLB extras payload. */
  eStandardShaderExtraction?: ChibiViewerEStandardShaderExtractionMetadata | null
  /** Source-authored E-Standard material values used by the recovered GLSL. */
  eStandardMaterialProperties?: ChibiViewerEStandardMaterialProperties | null
  /** Exact GLB texture dependency indices for E-Standard sampler bindings. */
  eStandardTextures?: { mainTex?: { index?: unknown; texCoord?: unknown } | null } | null
  /** Exact DSFX Glitch_Tex extraction and source material state. */
  glitchShaderExtraction?: ChibiViewerGlitchShaderExtractionMetadata | null
  glitchMaterialProperties?: ChibiViewerGlitchMaterialProperties | null
  /** Glitch_Tex binds Unity's white default for MainTex and the exact NoiseTex dependency. */
  glitchTextures?: ChibiViewerGlitchTextureBindings | null
  glitchShadowPass?: ChibiViewerShaderPassMetadata | null
  /** Exact DSFX Distort_1a extraction and source-authored material state. */
  dsfxDistort1aShaderExtraction?: ChibiViewerDsfxDistort1aShaderExtractionMetadata | null
  dsfxDistort1aMaterialProperties?: ChibiViewerDsfxDistort1aMaterialProperties | null
  /** Exact GLB texture dependency index for the source _Tex_Main binding. */
  dsfxDistort1aTextures?: ChibiViewerDsfxDistort1aTextureBindings | null
  dsfxDistort1aKeywordVariant?: ChibiViewerDsfxDistort1aKeywordVariant | null
  dsfxDistort1aRequiredGeometryAttributes?: unknown
  dsfxDistort1aRequiredUniforms?: unknown
  dsfxDistort1aTimeUniform?: unknown
  /** Exact DSFX Matcap extraction and source-authored material state. */
  matcapShaderExtraction?: ChibiViewerMatcapShaderExtractionMetadata | null
  matcapMaterialProperties?: ChibiViewerMatcapMaterialProperties | null
  /** Exact GLB texture dependency indices for Matcap sampler bindings. */
  matcapTextures?: ChibiViewerMatcapTextureBindings | null
  matcapShadowPass?: ChibiViewerMatcapShaderPassMetadata | null
  sourceMaterialReference?: unknown
  renderPass?: unknown
  textureProperty?: unknown
  unlit?: unknown
  drawLayer?: unknown
  transparentVariant?: unknown
  transparentShaderExtraction?: ChibiViewerTransparentShaderExtractionMetadata | null
  transparentMaterialProperties?: {
    floats?: Record<string, number | string>
    ints?: Record<string, number>
    colors?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>
    textures?: unknown[]
    resolvedTextures?: unknown[]
  } | null
  maskTexture?: { index?: unknown; texCoord?: unknown } | null
}

const EYEBROW_CAMERA_UNIFORM_DECLARATIONS = [
  'uniform vec3 chibiCameraObject;',
  'uniform float chibiZCorrection;',
] as const
// The exporter scales Unity mesh positions by .01; the source offset uses
// the same units as those positions and needs the same conversion.
const EYEBROW_CAMERA_CORRECTION = 'transformed += normalize(chibiCameraObject - transformed) * (chibiZCorrection * 0.01);'

/**
 * Add the camera-relative eyebrow correction to a generated Three.js vertex
 * shader. The material hook may be wrapped more than once when a source
 * material is shared by multiple renderers, so remove this adapter's exact
 * lines before inserting one canonical copy.
 */
export function patchEyebrowCameraShader(vertexShader: string) {
  let patched = vertexShader
    .replace(/^[ \t]*uniform vec3 chibiCameraObject;[ \t]*(?:\r?\n|$)/gm, '')
    .replace(/^[ \t]*uniform float chibiZCorrection;[ \t]*(?:\r?\n|$)/gm, '')
    .replace(/^[ \t]*transformed \+= normalize\(chibiCameraObject - transformed\) \* (?:chibiZCorrection|\(chibiZCorrection \* 0\.01\));[ \t]*(?:\r?\n|$)/gm, '')
  const common = '#include <common>'
  const skinning = '#include <skinning_vertex>'
  if (!patched.includes(common)) throw new Error('Eyebrow shader adapter cannot find the common shader chunk.')
  if (!patched.includes(skinning)) throw new Error('Eyebrow shader adapter cannot find the post-skinning vertex position.')
  patched = patched.replace(common, `${common}\n${EYEBROW_CAMERA_UNIFORM_DECLARATIONS.join('\n')}`)
  return patched.replace(skinning, `${skinning}\n${EYEBROW_CAMERA_CORRECTION}`)
}

export interface ChibiViewerProjectMxMaterialProperties {
  floats?: Record<string, number | string>
  ints?: Record<string, number | string>
  colors?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>
  keywords?: unknown
}

export interface ChibiViewerProjectMxTextureBindings {
  mainTex?: { index?: unknown; texCoord?: unknown } | null
  sourceTex?: { index?: unknown; texCoord?: unknown } | null
  noiseTex?: { index?: unknown; texCoord?: unknown } | null
}

export interface ChibiViewerEStandardMaterialProperties {
  floats?: Record<string, number | string>
  ints?: Record<string, number | string>
  colors?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>
  keywords?: unknown
}

export interface ChibiViewerGlitchMaterialProperties {
  floats?: Record<string, number | string>
  ints?: Record<string, number | string>
  colors?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>
  keywords?: unknown
  textures?: unknown[]
  resolvedTextures?: unknown[]
}

export interface ChibiViewerGlitchTextureBindings {
  mainTex?: { default?: unknown; index?: unknown; texCoord?: unknown } | null
  noiseTex?: { index?: unknown; texCoord?: unknown } | null
}

export interface ChibiViewerDsfxDistort1aMaterialProperties {
  floats?: Record<string, number | string>
  ints?: Record<string, number | string>
  colors?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>
  keywords?: unknown
  textures?: unknown[]
  resolvedTextures?: unknown[]
}

export interface ChibiViewerDsfxDistort1aTextureBindings {
  mainTex?: { index?: unknown; texCoord?: unknown } | null
}

export interface ChibiViewerDsfxDistort1aKeywordVariant {
  keywordIndices?: unknown
  keywordNames?: unknown
  blobIndex?: unknown
  programHash?: unknown
}

export interface ChibiViewerMatcapMaterialProperties {
  floats?: Record<string, number | string>
  ints?: Record<string, number | string>
  colors?: Record<string, { r?: number | string; g?: number | string; b?: number | string; a?: number | string } | null>
  keywords?: unknown
  textures?: unknown[]
  resolvedTextures?: unknown[]
}

export interface ChibiViewerMatcapTextureBindings {
  mainTex?: { index?: unknown; texCoord?: unknown } | null
  matcapTex?: { index?: unknown; texCoord?: unknown } | null
}

export interface ChibiViewerShaderPassMetadata {
  pass?: unknown
  stateName?: unknown
  passName?: unknown
  subShaderIndex?: unknown
  passIndex?: unknown
  stage?: unknown
  platform?: unknown
  gpuProgramType?: unknown
  blobIndex?: unknown
  parameterBlobIndex?: unknown
  parameterRecordSha256?: unknown
  keywordIndices?: unknown
  keywordNames?: unknown
  programHash?: unknown
  programDataSha256?: unknown
  programDataLength?: unknown
  usesNoiseTexture?: unknown
  programRecordSha256?: unknown
  glsl?: unknown
  requiredAttributes?: unknown
  requiredUniforms?: unknown
  renderState?: {
    zWrite?: unknown; zWriteProperty?: unknown; zTest?: unknown; zTestProperty?: unknown; culling?: unknown; cullingProperty?: unknown; colorMask?: unknown; depthOnly?: unknown
    sourceBlend?: unknown; destinationBlend?: unknown; sourceBlendAlpha?: unknown; destinationBlendAlpha?: unknown
    sourceBlendProperty?: unknown; destinationBlendProperty?: unknown; sourceBlendAlphaProperty?: unknown; destinationBlendAlphaProperty?: unknown
    blendOperation?: unknown; blendOperationAlpha?: unknown; offsetFactor?: unknown; offsetFactorProperty?: unknown; offsetUnits?: unknown; offsetUnitsProperty?: unknown
  } | null
}

export interface ChibiViewerTransparentShaderPassMetadata extends ChibiViewerShaderPassMetadata {
  stateName?: 'ForwardLit' | '' | unknown
  renderState?: {
    zWrite?: unknown; zWriteProperty?: unknown; zTest?: unknown; culling?: unknown; cullingProperty?: unknown
    sourceBlend?: unknown; destinationBlend?: unknown; sourceBlendAlpha?: unknown; destinationBlendAlpha?: unknown
    blendOperation?: unknown; blendOperationAlpha?: unknown; colorMask?: unknown; depthOnly?: unknown
  } | null
}

export interface ChibiViewerTransparentShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  unityVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  passes?: {
    forward?: ChibiViewerTransparentShaderPassMetadata
    dither?: ChibiViewerTransparentShaderPassMetadata
    depth?: ChibiViewerTransparentShaderPassMetadata
  }
}

export interface ChibiViewerShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  passes?: { base?: ChibiViewerShaderPassMetadata; outline?: ChibiViewerShaderPassMetadata }
}

/**
 * Optional source extraction payload for DSFX/FX_SHADER_Additive_0.  Older
 * published GLBs only carry the verified profile identity/state, so the
 * Viewer also keeps the report-verified Forward record below as its
 * source-of-truth.  When a newer artifact includes this payload, it is
 * checked against the same exact record instead of being trusted blindly.
 */
export interface ChibiViewerDsfxShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  unityVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  shaderName?: unknown
  shaderKeywordNames?: unknown
  requiredProperties?: unknown
  requiredTextureProperties?: unknown
  shader?: { name?: unknown; sourceReference?: unknown; keywordNames?: unknown } | null
  passes?: { forward?: ChibiViewerShaderPassMetadata | null }
  selectedGles3Programs?: unknown
  gles3Programs?: unknown
  programs?: unknown
  bindings?: unknown
}

const DSFX_ADDITIVE_SHADER_NAME = 'DSFX/FX_SHADER_Additive_0'
const DSFX_ADDITIVE_SHADER_FINGERPRINT = 'e4f30af59274e0b917915212c19c6c7e8c47f2da605d04a0eb6649c5d0ff1cfc'
const DSFX_ADDITIVE_PROGRAM_BLOB_SHA256 = '90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808'
const DSFX_ADDITIVE_SOURCE_BUNDLE_SHA256 = '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c'
const DSFX_ADDITIVE_SOURCE_SERIALIZED_FILE = 'cab-428091522b4007f213bf16532c4528a1'
const DSFX_ADDITIVE_SOURCE_OBJECT_ID = '-4115771715742154417'
const DSFX_ADDITIVE_SOURCE_REFERENCE =
  DSFX_ADDITIVE_SOURCE_BUNDLE_SHA256 +
  ':' +
  DSFX_ADDITIVE_SOURCE_SERIALIZED_FILE +
  ':' +
  DSFX_ADDITIVE_SOURCE_OBJECT_ID
const DSFX_ADDITIVE_FORWARD_PROGRAM_HASH =
  '3385102c84a54b6579e34b8c667635094f353a9802770da2f58e91fbbbc60026'
const DSFX_ADDITIVE_FORWARD_PROGRAM_RECORD_SHA256 =
  'c3c0a70448fed498fee19ae556974d594a37edf16e1ac47ea2f364dc5b4a8b1d'
const DSFX_ADDITIVE_FORWARD_PARAMETER_RECORD_SHA256 =
  '619c2de6aa2781b2363fe443f77609736903c60335e25c5eaa3d2d705c9e0173'
const DSFX_ADDITIVE_REQUIRED_PROPERTIES = [
  '_Color',
  '_Texture',
  '_Custom_Data_Offset_Use',
  '_ZWrite_Mode',
  '_Cull_Mode',
  '_ZOffsetFactor',
  '_ZOffsetUnits',
  '_ZTest_Mode',
] as const
const DSFX_ADDITIVE_REQUIRED_TEXTURE_PROPERTIES = ['_Texture'] as const
const DSFX_ADDITIVE_KEYWORDS = [
  'STEREO_INSTANCING_ON',
  'UNITY_SINGLE_PASS_STEREO',
  'STEREO_MULTIVIEW_ON',
  'STEREO_CUBEMAP_RENDER_ON',
  'DEBUG_DISPLAY',
  'INSTANCING_ON',
  '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
const DSFX_ADDITIVE_ATTRIBUTES = [
  'in_POSITION0',
  'in_TEXCOORD0',
  'in_TEXCOORD1',
  'in_COLOR0',
  'vs_TEXCOORD3',
  'vs_TEXCOORD4',
  'vs_COLOR0',
] as const
const DSFX_ADDITIVE_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP',
  'hlslcc_mtx4x4unity_ObjectToWorld',
  'hlslcc_mtx4x4unity_WorldToObject',
  'unity_LODFade',
  'unity_WorldTransformParams',
  'unity_RenderingLayer',
  'unity_LightData',
  'unity_LightIndices',
  'unity_ProbesOcclusion',
  'unity_SpecCube0_HDR',
  'unity_SpecCube1_HDR',
  'unity_SpecCube0_BoxMax',
  'unity_SpecCube0_BoxMin',
  'unity_SpecCube0_ProbePosition',
  'unity_SpecCube1_BoxMax',
  'unity_SpecCube1_BoxMin',
  'unity_SpecCube1_ProbePosition',
  'unity_LightmapST',
  'unity_DynamicLightmapST',
  'unity_SHAr',
  'unity_SHAg',
  'unity_SHAb',
  'unity_SHBr',
  'unity_SHBg',
  'unity_SHBb',
  'unity_SHC',
  'hlslcc_mtx4x4unity_MatrixPreviousM',
  'hlslcc_mtx4x4unity_MatrixPreviousMI',
  'unity_MotionVectorsParams',
  '_Texture_ST',
  '_Color',
  '_ZOffsetFactor',
  '_ZOffsetUnits',
  '_ZWrite_Mode',
  '_Cull_Mode',
  '_ZTest_Mode',
  '_Custom_Data_Offset_Use',
] as const
const DSFX_ADDITIVE_GLES3_PROGRAMS = [
  {
    blobIndex: 2, offset: 2568, size: 4660, segment: 0, sourceMap: 57, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: DSFX_ADDITIVE_FORWARD_PROGRAM_HASH, programDataLength: 4618,
    recordSha256: DSFX_ADDITIVE_FORWARD_PROGRAM_RECORD_SHA256, parameterBlobIndex: 0,
    parameterRecordSha256: DSFX_ADDITIVE_FORWARD_PARAMETER_RECORD_SHA256, passIndex: 0, passName: '', stateName: 'Forward',
    playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, shaderRequirements: 227,
    keywordIndices: [], keywordNames: [], attributes: DSFX_ADDITIVE_ATTRIBUTES, uniforms: DSFX_ADDITIVE_UNIFORMS,
  },
  {
    blobIndex: 3, offset: 7228, size: 4120, segment: 0, sourceMap: 57, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: 'fa6ec097af34d57cab64d105f411ac41bde7991de417ba1c02413a4ed88baabd', programDataLength: 4060,
    recordSha256: 'b8877e78e3acacc5e0891dbfb2d43f8db989f6b1614454417e4dd5c9b972e77f',
    parameterBlobIndex: 1, parameterRecordSha256: '1fe7d3f57ddd22705f4b97fd0c5c86e2c43af931a39f3718047ae65bc4b7fcda',
    passIndex: 0, passName: '', stateName: 'Forward', playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, shaderRequirements: 2275,
    keywordIndices: [5], keywordNames: ['INSTANCING_ON'], attributes: DSFX_ADDITIVE_ATTRIBUTES,
    uniforms: ['hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'unity_Builtins0Array', '_Texture_ST', '_Color', '_ZOffsetFactor', '_ZOffsetUnits', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_Custom_Data_Offset_Use'],
  },
  {
    blobIndex: 6, offset: 13480, size: 4420, segment: 0, sourceMap: 3, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5', programDataLength: 4379,
    recordSha256: '9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4',
    parameterBlobIndex: 4, parameterRecordSha256: '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17',
    passIndex: 1, passName: '', stateName: 'ShadowCaster', playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, shaderRequirements: 227,
    keywordIndices: [], keywordNames: [], attributes: ['in_POSITION0', 'in_NORMAL0'],
    uniforms: ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', 'unity_LODFade', 'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices', 'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax', 'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin', 'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg', 'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM', 'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams'],
  },
  {
    blobIndex: 7, offset: 17900, size: 4020, segment: 0, sourceMap: 3, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: 'c398892908c135f4a88395ef710f0c25d6ba2b6da763f8850935134ac325ddc1', programDataLength: 3960,
    recordSha256: '1e7b1e587aa7e0369a0415df992f515cbde6fd63b4db544a0a3e8ea76de8abc0',
    parameterBlobIndex: 5, parameterRecordSha256: '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51',
    passIndex: 1, passName: '', stateName: 'ShadowCaster', playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, shaderRequirements: 2275,
    keywordIndices: [5], keywordNames: ['INSTANCING_ON'], attributes: ['in_POSITION0', 'in_NORMAL0'],
    uniforms: ['hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'unity_Builtins0Array'],
  },
] as const

const DSFX_ADDITIVE_FORWARD_GLSL_APPROX = [
  '#ifdef VERTEX',
  '#version 300 es',
  '',
  '#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1',
  '#if HLSLCC_ENABLE_UNIFORM_BUFFERS',
  '#define UNITY_SUPPORTS_UNIFORM_LOCATION 1',
  '#if UNITY_SUPPORTS_UNIFORM_LOCATION',
  '#define UNITY_LOCATION(x) layout(location = x)',
  '#define UNITY_BINDING(x) layout(std140) binding(x)',
  '#else',
  '#define UNITY_LOCATION(x)',
  '#define UNITY_BINDING(x) layout(std140)',
  '#endif',
  '#else',
  '#define UNITY_SUPPORTS_UNIFORM_LOCATION 0',
  '#define UNITY_LOCATION(x)',
  '#define UNITY_BINDING(x)',
  '#endif',
  'uniform mediump sampler2D _Texture;',
  '',
  'layout(std140) uniform UnityPerDraw {',
  '    mat4 hlslcc_mtx4x4unity_ObjectToWorld;',
  '    mat4 hlslcc_mtx4x4unity_WorldToObject;',
  '    vec4 unity_LODFade;',
  '    mediump vec4 unity_WorldTransformParams;',
  '    mediump vec4 unity_RenderingLayer;',
  '};',
  'layout(std140) uniform UnityPerCamera {',
  '    mat4 hlslcc_mtx4x4unity_MatrixVP;',
  '};',
  'layout(std140) uniform UnityPerFrame {',
  '    mediump vec4 unity_LightData;',
  '    mediump vec4 unity_LightIndices[2];',
  '    mediump vec4 unity_ProbesOcclusion;',
  '    mediump vec4 unity_SpecCube0_HDR;',
  '    mediump vec4 unity_SpecCube1_HDR;',
  '    mediump vec4 unity_SpecCube0_BoxMax;',
  '    mediump vec4 unity_SpecCube0_BoxMin;',
  '    mediump vec4 unity_SpecCube0_ProbePosition;',
  '    mediump vec4 unity_SpecCube1_BoxMax;',
  '    mediump vec4 unity_SpecCube1_BoxMin;',
  '    mediump vec4 unity_SpecCube1_ProbePosition;',
  '    mediump vec4 unity_LightmapST;',
  '    mediump vec4 unity_DynamicLightmapST;',
  '    mediump vec4 unity_SHAr;',
  '    mediump vec4 unity_SHAg;',
  '    mediump vec4 unity_SHAb;',
  '    mediump vec4 unity_SHBr;',
  '    mediump vec4 unity_SHBg;',
  '    mediump vec4 unity_SHBb;',
  '    mediump vec4 unity_SHC;',
  '};',
  'layout(std140) uniform UnityPerDrawRare {',
  '    mat4 hlslcc_mtx4x4unity_MatrixPreviousM;',
  '    mat4 hlslcc_mtx4x4unity_MatrixPreviousMI;',
  '    vec4 unity_MotionVectorsParams;',
  '};',
  'in highp vec4 in_POSITION0;',
  'in highp vec4 in_TEXCOORD0;',
  'in highp vec4 in_TEXCOORD1;',
  'in mediump vec4 in_COLOR0;',
  'out highp vec2 vs_TEXCOORD3;',
  'out highp vec2 vs_TEXCOORD4;',
  'out mediump vec4 vs_COLOR0;',
  'void main()',
  '{',
  '    highp vec4 u_xlat0;',
  '    u_xlat0 = hlslcc_mtx4x4unity_ObjectToWorld * in_POSITION0;',
  '    gl_Position = hlslcc_mtx4x4unity_MatrixVP * u_xlat0;',
  '    vs_TEXCOORD3.xy = in_TEXCOORD0.xy;',
  '    vs_TEXCOORD4.xy = in_TEXCOORD1.xy;',
  '    vs_COLOR0 = in_COLOR0;',
  '}',
  '#else',
  '#ifdef FRAGMENT',
  '#version 300 es',
  '',
  'precision highp float;',
  'precision highp int;',
  '#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1',
  '#if HLSLCC_ENABLE_UNIFORM_BUFFERS',
  '#define UNITY_SUPPORTS_UNIFORM_LOCATION 1',
  '#if UNITY_SUPPORTS_UNIFORM_LOCATION',
  '#define UNITY_LOCATION(x) layout(location = x)',
  '#define UNITY_BINDING(x) layout(std140) binding(x)',
  '#else',
  '#define UNITY_LOCATION(x)',
  '#define UNITY_BINDING(x) layout(std140)',
  '#endif',
  '#else',
  '#define UNITY_SUPPORTS_UNIFORM_LOCATION 0',
  '#define UNITY_LOCATION(x)',
  '#define UNITY_BINDING(x)',
  '#endif',
  'uniform mediump sampler2D _Texture;',
  'layout(std140) uniform UnityPerMaterial {',
  '    mediump vec4 _Texture_ST;',
  '    mediump vec4 _Color;',
  '    mediump float _ZOffsetFactor;',
  '    mediump float _ZOffsetUnits;',
  '    mediump float _ZWrite_Mode;',
  '    mediump float _Cull_Mode;',
  '    mediump float _ZTest_Mode;',
  '    mediump float _Custom_Data_Offset_Use;',
  '};',
  'in highp vec2 vs_TEXCOORD3;',
  'in highp vec2 vs_TEXCOORD4;',
  'in mediump vec4 vs_COLOR0;',
  'layout(location = 0) out mediump vec4 SV_Target0;',
  'void main()',
  '{',
  '    bvec4 u_xlatb0;',
  '    highp vec4 u_xlat0;',
  '    highp vec4 u_xlat1;',
  '    highp vec4 u_xlat2;',
  '    mediump vec4 u_xlat16_0;',
  '    u_xlatb0 = notEqual(vec4(0.0), vec4(_Custom_Data_Offset_Use));',
  '    u_xlat2.xy = vs_TEXCOORD3.xy * _Texture_ST.xy + _Texture_ST.zw;',
  '    u_xlat1.xy = u_xlat2.xy + vs_TEXCOORD4.xy;',
  '    u_xlat0.xy = (bool(u_xlatb0)) ? u_xlat1.xy : u_xlat2.xy;',
  '    u_xlat16_0 = texture(_Texture, u_xlat0.xy);',
  '    u_xlat0.xyz = u_xlat16_0.xyz * vs_COLOR0.xyz;',
  '    u_xlat0.xyz = u_xlat0.xyz * _Color.xyz;',
  '    u_xlat0.xyz = u_xlat0.xyz * vs_COLOR0.www;',
  '    u_xlat0.xyz = u_xlat16_0.www * u_xlat0.xyz;',
  '    SV_Target0.xyz = u_xlat0.xyz;',
  '    SV_Target0.w = 1.0;',
  '}',
  '#endif',
  '#endif',
].join('\n')

const DSFX_ADDITIVE_FORWARD_GLSL = [
  "#ifdef VERTEX",
  "#version 300 es",
  "",
  "#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1",
  "#if HLSLCC_ENABLE_UNIFORM_BUFFERS",
  "#define UNITY_UNIFORM",
  "#else",
  "#define UNITY_UNIFORM uniform",
  "#endif",
  "#define UNITY_SUPPORTS_UNIFORM_LOCATION 1",
  "#if UNITY_SUPPORTS_UNIFORM_LOCATION",
  "#define UNITY_LOCATION(x) layout(location = x)",
  "#define UNITY_BINDING(x) layout(binding = x, std140)",
  "#else",
  "#define UNITY_LOCATION(x)",
  "#define UNITY_BINDING(x) layout(std140)",
  "#endif",
  "uniform \tvec4 hlslcc_mtx4x4unity_MatrixVP[4];",
  "#if HLSLCC_ENABLE_UNIFORM_BUFFERS",
  "UNITY_BINDING(1) uniform UnityPerDraw {",
  "#endif",
  "\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_ObjectToWorld[4];",
  "\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_WorldToObject[4];",
  "\tUNITY_UNIFORM vec4 unity_LODFade;",
  "\tUNITY_UNIFORM mediump vec4 unity_WorldTransformParams;",
  "\tUNITY_UNIFORM vec4 unity_RenderingLayer;",
  "\tUNITY_UNIFORM mediump vec4 unity_LightData;",
  "\tUNITY_UNIFORM mediump vec4 unity_LightIndices[2];",
  "\tUNITY_UNIFORM mediump vec4 unity_ProbesOcclusion;",
  "\tUNITY_UNIFORM mediump vec4 unity_SpecCube0_HDR;",
  "\tUNITY_UNIFORM mediump vec4 unity_SpecCube1_HDR;",
  "\tUNITY_UNIFORM vec4 unity_SpecCube0_BoxMax;",
  "\tUNITY_UNIFORM vec4 unity_SpecCube0_BoxMin;",
  "\tUNITY_UNIFORM vec4 unity_SpecCube0_ProbePosition;",
  "\tUNITY_UNIFORM vec4 unity_SpecCube1_BoxMax;",
  "\tUNITY_UNIFORM vec4 unity_SpecCube1_BoxMin;",
  "\tUNITY_UNIFORM vec4 unity_SpecCube1_ProbePosition;",
  "\tUNITY_UNIFORM vec4 unity_LightmapST;",
  "\tUNITY_UNIFORM vec4 unity_DynamicLightmapST;",
  "\tUNITY_UNIFORM mediump vec4 unity_SHAr;",
  "\tUNITY_UNIFORM mediump vec4 unity_SHAg;",
  "\tUNITY_UNIFORM mediump vec4 unity_SHAb;",
  "\tUNITY_UNIFORM mediump vec4 unity_SHBr;",
  "\tUNITY_UNIFORM mediump vec4 unity_SHBg;",
  "\tUNITY_UNIFORM mediump vec4 unity_SHBb;",
  "\tUNITY_UNIFORM mediump vec4 unity_SHC;",
  "\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_MatrixPreviousM[4];",
  "\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_MatrixPreviousMI[4];",
  "\tUNITY_UNIFORM vec4 unity_MotionVectorsParams;",
  "#if HLSLCC_ENABLE_UNIFORM_BUFFERS",
  "};",
  "#endif",
  "in highp vec4 in_POSITION0;",
  "in highp vec4 in_TEXCOORD0;",
  "in highp vec4 in_TEXCOORD1;",
  "in highp vec4 in_COLOR0;",
  "out highp vec4 vs_TEXCOORD3;",
  "out highp vec4 vs_TEXCOORD4;",
  "out highp vec4 vs_COLOR0;",
  "vec4 u_xlat0;",
  "vec4 u_xlat1;",
  "void main()",
  "{",
  "    u_xlat0.xyz = in_POSITION0.yyy * hlslcc_mtx4x4unity_ObjectToWorld[1].xyz;",
  "    u_xlat0.xyz = hlslcc_mtx4x4unity_ObjectToWorld[0].xyz * in_POSITION0.xxx + u_xlat0.xyz;",
  "    u_xlat0.xyz = hlslcc_mtx4x4unity_ObjectToWorld[2].xyz * in_POSITION0.zzz + u_xlat0.xyz;",
  "    u_xlat0.xyz = u_xlat0.xyz + hlslcc_mtx4x4unity_ObjectToWorld[3].xyz;",
  "    u_xlat1 = u_xlat0.yyyy * hlslcc_mtx4x4unity_MatrixVP[1];",
  "    u_xlat1 = hlslcc_mtx4x4unity_MatrixVP[0] * u_xlat0.xxxx + u_xlat1;",
  "    u_xlat0 = hlslcc_mtx4x4unity_MatrixVP[2] * u_xlat0.zzzz + u_xlat1;",
  "    gl_Position = u_xlat0 + hlslcc_mtx4x4unity_MatrixVP[3];",
  "    vs_TEXCOORD3.xy = in_TEXCOORD0.xy;",
  "    vs_TEXCOORD3.zw = vec2(0.0, 0.0);",
  "    vs_TEXCOORD4 = in_TEXCOORD1;",
  "    vs_COLOR0 = in_COLOR0;",
  "    return;",
  "}",
  "",
  "#endif",
  "#ifdef FRAGMENT",
  "#version 300 es",
  "",
  "precision highp float;",
  "precision highp int;",
  "#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1",
  "#if HLSLCC_ENABLE_UNIFORM_BUFFERS",
  "#define UNITY_UNIFORM",
  "#else",
  "#define UNITY_UNIFORM uniform",
  "#endif",
  "#define UNITY_SUPPORTS_UNIFORM_LOCATION 1",
  "#if UNITY_SUPPORTS_UNIFORM_LOCATION",
  "#define UNITY_LOCATION(x) layout(location = x)",
  "#define UNITY_BINDING(x) layout(binding = x, std140)",
  "#else",
  "#define UNITY_LOCATION(x)",
  "#define UNITY_BINDING(x) layout(std140)",
  "#endif",
  "#if HLSLCC_ENABLE_UNIFORM_BUFFERS",
  "UNITY_BINDING(0) uniform UnityPerMaterial {",
  "#endif",
  "\tUNITY_UNIFORM vec4 _Texture_ST;",
  "\tUNITY_UNIFORM vec4 _Color;",
  "\tUNITY_UNIFORM float _ZOffsetFactor;",
  "\tUNITY_UNIFORM float _ZOffsetUnits;",
  "\tUNITY_UNIFORM float _ZWrite_Mode;",
  "\tUNITY_UNIFORM float _Cull_Mode;",
  "\tUNITY_UNIFORM float _ZTest_Mode;",
  "\tUNITY_UNIFORM float _Custom_Data_Offset_Use;",
  "#if HLSLCC_ENABLE_UNIFORM_BUFFERS",
  "};",
  "#endif",
  "UNITY_LOCATION(0) uniform mediump sampler2D _Texture;",
  "in highp vec4 vs_TEXCOORD3;",
  "in highp vec4 vs_TEXCOORD4;",
  "in highp vec4 vs_COLOR0;",
  "layout(location = 0) out mediump vec4 SV_Target0;",
  "vec3 u_xlat0;",
  "mediump vec4 u_xlat16_0;",
  "bool u_xlatb0;",
  "vec2 u_xlat1;",
  "vec2 u_xlat2;",
  "void main()",
  "{",
  "    u_xlatb0 = vec4(0.0, 0.0, 0.0, 0.0)!=vec4(_Custom_Data_Offset_Use);",
  "    u_xlat2.xy = vs_TEXCOORD3.xy * _Texture_ST.xy + _Texture_ST.zw;",
  "    u_xlat1.xy = u_xlat2.xy + vs_TEXCOORD4.xy;",
  "    u_xlat0.xy = (bool(u_xlatb0)) ? u_xlat1.xy : u_xlat2.xy;",
  "    u_xlat16_0 = texture(_Texture, u_xlat0.xy);",
  "    u_xlat0.xyz = u_xlat16_0.xyz * vs_COLOR0.xyz;",
  "    u_xlat0.xyz = u_xlat0.xyz * _Color.xyz;",
  "    u_xlat0.xyz = u_xlat0.xyz * vs_COLOR0.www;",
  "    u_xlat0.xyz = u_xlat16_0.www * u_xlat0.xyz;",
  "    SV_Target0.xyz = u_xlat0.xyz;",
  "    SV_Target0.w = 1.0;",
  "    return;",
  "}",
  "",
  "#endif",
].join('\n') + '\n'

export interface ChibiViewerProjectMxShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  unityVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  shaderName?: unknown
  shaderKeywordNames?: unknown
  activeVariant?: unknown
  activeKeywordNames?: unknown
  requiredProperties?: unknown
  requiredTextureProperties?: unknown
  passes?: {
    forward?: ChibiViewerShaderPassMetadata
    glow?: ChibiViewerShaderPassMetadata
    outline?: ChibiViewerShaderPassMetadata
    solidOutline?: ChibiViewerShaderPassMetadata
    shadow?: ChibiViewerShaderPassMetadata
    depth?: ChibiViewerShaderPassMetadata
  }
}

export interface ChibiViewerEStandardShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  unityVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  shaderName?: unknown
  shaderKeywordNames?: unknown
  activeVariant?: unknown
  activeKeywordNames?: unknown
  requiredProperties?: unknown
  sourceTextureProperties?: unknown
  requiredTextureProperties?: unknown
  passes?: {
    forward?: ChibiViewerShaderPassMetadata
    forwardStatic?: ChibiViewerShaderPassMetadata
    forwardDynamic?: ChibiViewerShaderPassMetadata
    shadow?: ChibiViewerShaderPassMetadata
    depth?: ChibiViewerShaderPassMetadata
    meta?: ChibiViewerShaderPassMetadata
  }
}

export interface ChibiViewerGlitchShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  unityVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  shaderName?: unknown
  shaderKeywordNames?: unknown
  requiredProperties?: unknown
  requiredTextureProperties?: unknown
  passes?: {
    forward?: ChibiViewerShaderPassMetadata
    shadow?: ChibiViewerShaderPassMetadata
  }
}

export interface ChibiViewerDsfxDistort1aShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  unityVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  shaderName?: unknown
  shaderKeywordNames?: unknown
  activeKeywordIndices?: unknown
  activeKeywordNames?: unknown
  requiredProperties?: unknown
  requiredTextureProperties?: unknown
  requiredGlobals?: unknown
  selectedVariant?: Record<string, unknown> | null
  programs?: unknown[]
  gles3Programs?: unknown[]
  bindings?: unknown[]
  chunks?: unknown[]
  shader?: {
    name?: unknown
    sourceReference?: unknown
    compressedBlobSha256?: unknown
    fingerprint?: unknown
    unityVersion?: unknown
    keywords?: unknown
    keywordNames?: unknown
    selectedVariant?: Record<string, unknown> | null
    programs?: unknown[]
    gles3Programs?: unknown[]
    bindings?: unknown[]
    chunks?: unknown[]
  } | null
  passes?: {
    forward?: ChibiViewerShaderPassMetadata | null
  } | null
}

export interface ChibiViewerMatcapShaderPassMetadata extends ChibiViewerShaderPassMetadata {
  variant?: unknown
}

export interface ChibiViewerMatcapShaderExtractionMetadata {
  schemaVersion?: unknown
  extractorVersion?: unknown
  unityVersion?: unknown
  fingerprint?: unknown
  sourceReference?: unknown
  compressedBlobSha256?: unknown
  shaderName?: unknown
  shaderKeywordNames?: unknown
  requiredProperties?: unknown
  requiredTextureProperties?: unknown
  passes?: {
    forward?: ChibiViewerMatcapShaderPassMetadata
    forwardInstanced?: ChibiViewerMatcapShaderPassMetadata
    shadow?: ChibiViewerMatcapShaderPassMetadata
    shadowInstanced?: ChibiViewerMatcapShaderPassMetadata
  }
}

const blendFactors: Record<number, THREE.BlendingDstFactor | THREE.BlendingSrcFactor> = {
  0: THREE.ZeroFactor,
  1: THREE.OneFactor,
  2: THREE.DstColorFactor,
  3: THREE.SrcColorFactor,
  4: THREE.OneMinusDstColorFactor,
  5: THREE.SrcAlphaFactor,
  6: THREE.OneMinusSrcColorFactor,
  7: THREE.DstAlphaFactor,
  8: THREE.OneMinusDstAlphaFactor,
  9: THREE.SrcAlphaSaturateFactor,
  10: THREE.OneMinusSrcAlphaFactor,
}
const destinationBlendFactors: Record<number, true> = {
  0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 10: true,
}

const blendEquations: Record<number, THREE.BlendingEquation> = {
  0: THREE.AddEquation,
  1: THREE.SubtractEquation,
  2: THREE.ReverseSubtractEquation,
  3: THREE.MinEquation,
  4: THREE.MaxEquation,
}

const depthFunctions: Record<string, number> = {
  disabled: THREE.AlwaysDepth, never: THREE.NeverDepth, less: THREE.LessDepth, equal: THREE.EqualDepth,
  'less-equal': THREE.LessEqualDepth, greater: THREE.GreaterDepth, 'not-equal': THREE.NotEqualDepth,
  'greater-equal': THREE.GreaterEqualDepth, always: THREE.AlwaysDepth,
}

const DSFX_ALPHA_BLEND_0_SOURCE_REFERENCE = '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c:cab-428091522b4007f213bf16532c4528a1:-660637482714961986'
const DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS: Record<string, { depthWrite: boolean; depthTest: boolean; depthFunction: string; cullMode: 'off' | 'front' | 'back'; doubleSided: boolean }> = {
  'static-default': { depthWrite: false, depthTest: false, depthFunction: 'disabled', cullMode: 'off', doubleSided: true },
  'depth-tested-back-cull': { depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false },
  'depth-tested-off-double-sided': { depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'off', doubleSided: true },
}

const DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE = '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c:cab-428091522b4007f213bf16532c4528a1:3898777625326355543'
const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE = '46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816:cab-0ff8a11237bb688b3a3deddb961cd2a6:1142847250617954324'
const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT = 'wakamo-eye-white-default'
const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOATS = {
  _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
  _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
  _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
  _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
  _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
  _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
} as const
const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLORS = {
  _Color: { r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 },
  _EmissionColor: { r: 0, g: 0, b: 0, a: 0 },
  _SpecColor: { r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 },
} as const
const DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES = [
  '_GlossyReflections', '_OcclusionStrength', '_SpecularHighlights', '_EmissionColor', '_SpecColor',
] as const
const DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS: Record<string, { depthWrite: boolean; depthTest: boolean; depthFunction: string; cullMode: 'off' | 'front' | 'back'; doubleSided: boolean }> = {
  'static-default': { depthWrite: false, depthTest: false, depthFunction: 'disabled', cullMode: 'off', doubleSided: true },
  'depth-tested-back-cull': { depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false },
  'depth-tested-off-double-sided': { depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'off', doubleSided: true },
}

function exactInteger(value: unknown, label: string, values: Record<number, unknown>) {
  if (typeof value !== 'number' || !Number.isInteger(value) || values[value] === undefined) {
    throw new Error(`Static DSFX viewer material has an invalid ${label} value.`)
  }
  return value
}

function exactNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Static DSFX viewer material has an invalid ${label} value.`)
  return value
}

/**
 * Apply the explicit Unity blend/depth/cull state exported by a verified
 * static DSFX profile. Returns false for native/profile adapters that do not
 * require this runtime path.
 */
export function applyChibiProfileMaterialState(material: THREE.Material, metadata: ChibiViewerMaterialMetadata): boolean {
  if (metadata?.adapterId !== 'dsfx-static') return false
  const blend = metadata.blend
  if (!blend || metadata.alphaMode !== 'BLEND') throw new Error('Static DSFX viewer material is missing its exact transparent blend state.')
  const source = exactInteger(blend.source, 'source blend factor', blendFactors)
  const destination = exactInteger(blend.destination, 'destination blend factor', destinationBlendFactors)
  const sourceAlpha = exactInteger(blend.sourceAlpha, 'source alpha blend factor', blendFactors)
  const destinationAlpha = exactInteger(blend.destinationAlpha, 'destination alpha blend factor', destinationBlendFactors)
  const operation = exactInteger(blend.operation, 'blend equation', blendEquations)
  const operationAlpha = exactInteger(blend.operationAlpha, 'alpha blend equation', blendEquations)
  material.blending = THREE.CustomBlending
  material.blendSrc = blendFactors[source] as THREE.BlendingSrcFactor
  material.blendDst = blendFactors[destination] as THREE.BlendingDstFactor
  material.blendSrcAlpha = blendFactors[sourceAlpha] as THREE.BlendingSrcFactor
  material.blendDstAlpha = blendFactors[destinationAlpha] as THREE.BlendingDstFactor
  material.blendEquation = blendEquations[operation]
  material.blendEquationAlpha = blendEquations[operationAlpha]
  material.transparent = true
  if (typeof metadata.depthWrite !== 'boolean' || typeof metadata.depthTest !== 'boolean'
    || typeof metadata.depthFunction !== 'string' || depthFunctions[metadata.depthFunction] === undefined) {
    throw new Error('Static DSFX viewer material is missing its exact depth state.')
  }
  if (metadata.cullMode !== 'off' && metadata.cullMode !== 'front' && metadata.cullMode !== 'back') {
    throw new Error('Static DSFX viewer material has an invalid cull mode.')
  }
  if (typeof metadata.doubleSided !== 'boolean' || metadata.doubleSided !== (metadata.cullMode === 'off')) {
    throw new Error('Static DSFX viewer material has an inconsistent double-sided state.')
  }
  const alphaBlend0 = profileReferenceKey(metadata.sourceShaderReference) === DSFX_ALPHA_BLEND_0_SOURCE_REFERENCE
  const alphaBlendAdd = profileReferenceKey(metadata.sourceShaderReference) === DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE
  if (alphaBlend0) {
    const variant = DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS[String(metadata.dsfxRenderStateVariant)]
    if (!variant || metadata.depthWrite !== variant.depthWrite || metadata.depthTest !== variant.depthTest
      || metadata.depthFunction !== variant.depthFunction || metadata.cullMode !== variant.cullMode
      || metadata.doubleSided !== variant.doubleSided
      || source !== 5 || destination !== 10 || sourceAlpha !== 5 || destinationAlpha !== 10
      || operation !== 0 || operationAlpha !== 0) {
      throw new Error('Static DSFX viewer material has an unverified AlphaBlend_0 render-state variant.')
    }
  }
  if (alphaBlendAdd) {
    const variant = DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS[String(metadata.dsfxRenderStateVariant)]
    if (!variant || metadata.depthWrite !== variant.depthWrite || metadata.depthTest !== variant.depthTest
      || metadata.depthFunction !== variant.depthFunction || metadata.cullMode !== variant.cullMode
      || metadata.doubleSided !== variant.doubleSided
      || source !== 1 || destination !== 10 || sourceAlpha !== 1 || destinationAlpha !== 10
      || operation !== 0 || operationAlpha !== 0) {
      throw new Error('Static DSFX viewer material has an unverified AlphaBlend_Add render-state variant.')
    }
  }
  material.depthWrite = metadata.depthWrite
  material.depthTest = metadata.depthTest
  material.depthFunc = depthFunctions[metadata.depthFunction] as THREE.DepthModes
  if (metadata.cullMode === 'off') material.side = THREE.DoubleSide
  else if (metadata.cullMode === 'front') material.side = THREE.BackSide
  else material.side = THREE.FrontSide
  const polygonOffsetFactor = metadata.polygonOffsetFactor
  const polygonOffsetUnits = metadata.polygonOffsetUnits
  if (polygonOffsetFactor !== undefined || polygonOffsetUnits !== undefined) {
    material.polygonOffset = true
    material.polygonOffsetFactor = exactNumber(polygonOffsetFactor, 'polygon offset factor')
    material.polygonOffsetUnits = exactNumber(polygonOffsetUnits, 'polygon offset units')
  }
  material.needsUpdate = true
  return true
}

function additiveExpectedProgram(source: any, expected: (typeof DSFX_ADDITIVE_GLES3_PROGRAMS)[number]) {
  const attributes = Array.isArray(source?.attributes)
    ? source.attributes.map((item: any) => typeof item === 'string' ? item : item?.name)
    : Array.isArray(source?.requiredAttributes) ? source.requiredAttributes : expected.attributes
  const uniforms = Array.isArray(source?.uniforms)
    ? source.uniforms.map((item: any) => typeof item === 'string' ? item : item?.name)
    : Array.isArray(source?.requiredUniforms) ? source.requiredUniforms : expected.uniforms
  return source?.kind === 'program'
    && source.platform === expected.platform && source.platformName === expected.platformName
    && source.gpuProgramType === expected.gpuProgramType && source.gpuProgramTypeName === expected.gpuProgramTypeName
    && source.blobIndex === expected.blobIndex && source.offset === expected.offset && source.size === expected.size
    && source.segment === expected.segment && source.sourceMap === expected.sourceMap && source.version === expected.version
    && source.programHash === expected.programHash && source.programDataSha256 === expected.programHash
    && source.programDataLength === expected.programDataLength && source.recordSha256 === expected.recordSha256
    && Array.isArray(source.keywords) && exactArray(source.keywords, expected.keywordNames)
    && Array.isArray(attributes) && exactArray(attributes, expected.attributes)
    && Array.isArray(uniforms) && exactArray(uniforms, expected.uniforms)
    && typeof source.glsl === 'string'
}

function assertDsfxAdditiveShaderExtraction(metadata: ChibiViewerMaterialMetadata) {
  const extraction = metadata.dsfxShaderExtraction as any
  const sourceReference = profileReferenceKey(metadata.sourceShaderReference)
  const extractionReference = profileReferenceKey(extraction?.shader?.sourceReference ?? extraction?.sourceReference)
  const shaderName = extraction?.shader?.name ?? extraction?.shaderName
  const shaderKeywords = extraction?.shader?.keywordNames ?? extraction?.shaderKeywordNames
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || extraction.unityVersion !== '2021.3' || extraction.fingerprint !== DSFX_ADDITIVE_SHADER_FINGERPRINT
    || String(extraction.compressedBlobSha256 ?? '').toLowerCase() !== DSFX_ADDITIVE_PROGRAM_BLOB_SHA256
    || shaderName !== DSFX_ADDITIVE_SHADER_NAME || extractionReference !== sourceReference
    || sourceReference !== DSFX_ADDITIVE_SOURCE_REFERENCE || !exactArray(shaderKeywords, DSFX_ADDITIVE_KEYWORDS)) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has no exact source extraction provenance.')
  }
  const gles3Programs = Array.isArray(extraction.gles3Programs)
    ? extraction.gles3Programs
    : extraction.selectedGles3Programs
  const programs = Array.isArray(extraction.programs) ? extraction.programs : gles3Programs
  const bindings = Array.isArray(extraction.bindings)
    ? extraction.bindings
    : Array.isArray(extraction.selectedPassVariants)
      ? extraction.selectedPassVariants.map((item: any) => item?.binding)
      : null
  if (!Array.isArray(gles3Programs) || gles3Programs.length !== DSFX_ADDITIVE_GLES3_PROGRAMS.length
    || !Array.isArray(programs) || !Array.isArray(bindings) || bindings.length !== DSFX_ADDITIVE_GLES3_PROGRAMS.length) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an incomplete GLES3 extraction record set.')
  }
  const allPrograms = programs.filter((program: any) => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
  if (allPrograms.length !== DSFX_ADDITIVE_GLES3_PROGRAMS.length) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has incomplete GLES3 program records.')
  }
  for (const [index, expected] of DSFX_ADDITIVE_GLES3_PROGRAMS.entries()) {
    const program = gles3Programs[index]
    if (!additiveExpectedProgram(program, expected)
      || profileReferenceKey(program.sourceReference) !== sourceReference
      || (expected.blobIndex === 2 && program.glsl !== DSFX_ADDITIVE_FORWARD_GLSL)
      || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
      throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has a tampered GLES3 program record.')
    }
    const record = allPrograms.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
    if (!additiveExpectedProgram(record, expected) || profileReferenceKey(record.sourceReference) !== sourceReference) {
      throw new Error('DSFX/FX_SHADER_Additive_0 viewer material is missing a verified GLES3 program record.')
    }
    const binding = bindings.find((candidate: any) => candidate?.blobIndex === expected.blobIndex)
    if (!binding || binding.subShaderIndex !== 0 || binding.passIndex !== expected.passIndex
      || binding.passName !== expected.passName || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
      || binding.playerGroupIndex !== expected.playerGroupIndex || binding.playerIndex !== expected.playerIndex
      || binding.subProgramIndex !== expected.subProgramIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
      || binding.gpuProgramTypeName !== expected.gpuProgramTypeName || binding.shaderRequirements !== expected.shaderRequirements
      || binding.platform !== expected.platform || binding.gpuProgramType !== expected.gpuProgramType
      || binding.programHash !== expected.programHash || binding.gles3ProgramHash !== expected.programHash
      || binding.programRecordSha256 !== expected.recordSha256 || binding.parameterRecordSha256 !== expected.parameterRecordSha256
      || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)
      || profileReferenceKey(binding.sourceReference) !== sourceReference) {
      throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has tampered binding metadata.')
    }
  }
  return { extraction, forward: gles3Programs[0] as any }
}

function additiveColor(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has no exact _Color source value.')
  const color = value as { r?: unknown; g?: unknown; b?: unknown; a?: unknown }
  const values = [color.r, color.g, color.b, color.a].map(Number)
  if (!values.every(Number.isFinite)) throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an invalid _Color source value.')
  return values as [number, number, number, number]
}

function assertDsfxAdditiveMaterialState(metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'dsfx-static'
    || metadata.renderPass !== null && metadata.renderPass !== undefined && metadata.renderPass !== 'forward'
    || metadata.textureProperty !== '_Texture' || metadata.unlit !== true
    || metadata.alphaMode !== 'BLEND' || metadata.drawLayer !== 'transparent'
    || metadata.depthWrite !== false || metadata.depthTest !== false || metadata.depthFunction !== 'disabled'
    || metadata.cullMode !== 'off' || metadata.doubleSided !== true
    || metadata.polygonOffsetFactor !== 0 || metadata.polygonOffsetUnits !== 0
    || metadata.dsfxRenderStateVariant !== undefined && metadata.dsfxRenderStateVariant !== null) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an unverified translated render state.')
  }
  const blend = metadata.blend
  if (!blend || blend.source !== 1 || blend.destination !== 1 || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 1
    || blend.operation !== 0 || blend.operationAlpha !== 0) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an unverified additive blend state.')
  }
  const properties = metadata.dsfxMaterialProperties as any
  if (!properties || !exactArray(properties.keywords, []) || Object.keys(properties.ints ?? {}).length !== 0) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an unverified source material property set.')
  }
  const floats = properties.floats ?? {}
  const expectedFloatNames = ['_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZOffsetFactor', '_ZOffsetUnits', '_ZTest_Mode']
  const textureNames = Array.isArray(properties.textures) ? properties.textures.map((item: any) => item?.name) : []
  const propertyNames = [...Object.keys(floats), ...Object.keys(properties.ints ?? {}), ...Object.keys(properties.colors ?? {}), ...textureNames]
  if (propertyNames.length !== DSFX_ADDITIVE_REQUIRED_PROPERTIES.length
    || new Set(propertyNames).size !== propertyNames.length
    || DSFX_ADDITIVE_REQUIRED_PROPERTIES.some(name => !propertyNames.includes(name))
    || !exactArray(Object.keys(floats), expectedFloatNames)) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an incomplete source scalar property set.')
  }
  const expectedFloats: Record<string, number> = {
    _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: Number(floats._Cull_Mode),
    _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: 4,
  }
  if (expectedFloats._Cull_Mode !== 0 && expectedFloats._Cull_Mode !== 2
    || Object.entries(expectedFloats).some(([name, value]) => Number(floats[name]) !== value)) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has invalid source scalar properties.')
  }
  const colors = properties.colors ?? {}
  const sourceColor = additiveColor(colors._Color)
  if (!exactArray(Object.keys(colors), ['_Color'])) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an incomplete source color property set.')
  }
  const textures = properties.textures
  if (!Array.isArray(textures) || !exactArray(textures.map((item: any) => item?.name), DSFX_ADDITIVE_REQUIRED_TEXTURE_PROPERTIES)) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an incomplete source texture property set.')
  }
  const sourceTexture = textures[0] as any
  const texturePointer = sourceTexture.texture, textureReference = sourceTexture.textureReference
  if (!texturePointer || String(texturePointer.pathId) === '0' || !textureReference
    || String(texturePointer.file ?? '').toLowerCase() !== String(textureReference.serializedFile ?? '').toLowerCase()
    || String(texturePointer.pathId) !== String(textureReference.objectId)
    || !Number.isFinite(Number(sourceTexture.scale?.x)) || !Number.isFinite(Number(sourceTexture.scale?.y))
    || !Number.isFinite(Number(sourceTexture.offset?.x)) || !Number.isFinite(Number(sourceTexture.offset?.y))) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an unverified _Texture source identity or transform.')
  }
  const resolved = (properties.resolvedTextures ?? []).filter((item: any) => item?.property === '_Texture')
  if (resolved.length !== 1 || profileReferenceKey(resolved[0]?.sourceReference) !== profileReferenceKey(textureReference)
    || !Number.isInteger(Number(resolved[0]?.width)) || Number(resolved[0]?.width) <= 0
    || !Number.isInteger(Number(resolved[0]?.height)) || Number(resolved[0]?.height) <= 0) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has incomplete resolved _Texture evidence.')
  }
  if (!Number.isInteger(metadata.dsfxTextures?.texture?.index)
    || Number(metadata.dsfxTextures?.texture?.index) < 0) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has no exact GLB _Texture binding.')
  }
  return { sourceColor, sourceTexture, cullMode: expectedFloats._Cull_Mode }
}

function dsfxAdditivePassGeometry(object: THREE.Mesh, baseMaterial: THREE.Material) {
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('DSFX/FX_SHADER_Additive_0 source material is not bound to its source primitive.')
  if (Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('DSFX/FX_SHADER_Additive_0 source primitive group is missing.')
    geometry.clearGroups()
    groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  const attributes: [string, string, number][] = [
    ['POSITION', 'position', 3],
    ['TEXCOORD_0', 'uv', 2],
    ['TEXCOORD_1', 'uv1', 2],
    ['COLOR_0', 'color', 4],
  ]
  for (const [semantic, sourceName, minimumItemSize] of attributes) {
    const attribute = geometry.getAttribute(sourceName)
    if (!attribute || attribute.itemSize < minimumItemSize) {
      throw new Error('DSFX/FX_SHADER_Additive_0 geometry is missing ' + semantic + ' with its source width.')
    }
    geometry.setAttribute(semantic === 'POSITION' ? 'in_POSITION0'
      : semantic === 'TEXCOORD_0' ? 'in_TEXCOORD0'
        : semantic === 'TEXCOORD_1' ? 'in_TEXCOORD1' : 'in_COLOR0', attribute)
  }
  return geometry
}

function dsfxAdditiveUniforms(texture: THREE.Texture, sourceColor: [number, number, number, number], sourceTexture: any, cullMode: number) {
  const identity = new THREE.Matrix4()
  const vector = () => new THREE.Vector4()
  return {
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_WorldToObject: { value: matrixVectorArray(identity) },
    unity_LODFade: { value: vector() }, unity_WorldTransformParams: { value: vector() },
    unity_RenderingLayer: { value: vector() }, unity_LightData: { value: vector() },
    unity_LightIndices: { value: [vector(), vector()] }, unity_ProbesOcclusion: { value: vector() },
    unity_SpecCube0_HDR: { value: vector() }, unity_SpecCube1_HDR: { value: vector() },
    unity_SpecCube0_BoxMax: { value: vector() }, unity_SpecCube0_BoxMin: { value: vector() },
    unity_SpecCube0_ProbePosition: { value: vector() }, unity_SpecCube1_BoxMax: { value: vector() },
    unity_SpecCube1_BoxMin: { value: vector() }, unity_SpecCube1_ProbePosition: { value: vector() },
    unity_LightmapST: { value: vector() }, unity_DynamicLightmapST: { value: vector() },
    unity_SHAr: { value: vector() }, unity_SHAg: { value: vector() }, unity_SHAb: { value: vector() },
    unity_SHBr: { value: vector() }, unity_SHBg: { value: vector() }, unity_SHBb: { value: vector() }, unity_SHC: { value: vector() },
    hlslcc_mtx4x4unity_MatrixPreviousM: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_MatrixPreviousMI: { value: matrixVectorArray(identity) },
    unity_MotionVectorsParams: { value: vector() },
    _Texture_ST: { value: new THREE.Vector4(Number(sourceTexture.scale.x), Number(sourceTexture.scale.y), Number(sourceTexture.offset.x), Number(sourceTexture.offset.y)) },
    _Color: { value: new THREE.Vector4(...sourceColor) }, _ZOffsetFactor: { value: 0 }, _ZOffsetUnits: { value: 0 },
    _ZWrite_Mode: { value: 0 }, _Cull_Mode: { value: cullMode }, _ZTest_Mode: { value: 4 },
    _Custom_Data_Offset_Use: { value: 0 }, _Texture: { value: texture },
  }
}

/**
 * Build the exact non-instanced Forward draw for DSFX/FX_SHADER_Additive_0.
 * The instanced and ShadowCaster records remain extraction evidence only.
 */
export function createDsfxAdditivePass(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'dsfx-static') return null
  if (profileReferenceKey(metadata.sourceShaderReference) !== DSFX_ADDITIVE_SOURCE_REFERENCE) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has an unverified source shader identity.')
  }
  const { extraction, forward } = assertDsfxAdditiveShaderExtraction(metadata)
  const { sourceColor, sourceTexture, cullMode } = assertDsfxAdditiveMaterialState(metadata)
  const texture = (baseMaterial as THREE.MeshBasicMaterial).map
  if (!(texture instanceof THREE.Texture)) {
    throw new Error('DSFX/FX_SHADER_Additive_0 viewer material has no exact _Texture runtime binding.')
  }
  const forwardGeometry = dsfxAdditivePassGeometry(object, baseMaterial)
  const uniforms = dsfxAdditiveUniforms(texture, sourceColor, sourceTexture, cullMode)
  const forwardMaterial = new THREE.RawShaderMaterial({
    name: (baseMaterial.name || object.name) + ' DSFX FX_SHADER_Additive_0',
    vertexShader: shaderStageSource(DSFX_ADDITIVE_FORWARD_GLSL, 'VERTEX'),
    fragmentShader: shaderStageSource(DSFX_ADDITIVE_FORWARD_GLSL, 'FRAGMENT'),
    uniforms, glslVersion: THREE.GLSL3, side: THREE.DoubleSide,
    depthWrite: false, depthTest: false, depthFunc: THREE.AlwaysDepth,
    transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, blendEquation: THREE.AddEquation, blendEquationAlpha: THREE.AddEquation,
    polygonOffset: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0, toneMapped: false, lights: false, fog: false,
  })
  forwardMaterial.userData.chibi = {
    adapterId: 'dsfx-static', renderPass: 'forward', sourceShaderReference: metadata.sourceShaderReference,
    sourceShaderName: DSFX_ADDITIVE_SHADER_NAME, programHash: DSFX_ADDITIVE_FORWARD_PROGRAM_HASH,
    dsfxShaderExtraction: extraction, dsfxMaterialProperties: metadata.dsfxMaterialProperties,
    dsfxTextureIndex: metadata.dsfxTextures?.texture?.index, sourceGlsl: DSFX_ADDITIVE_FORWARD_GLSL,
  }
  const previousObjectBeforeRender = object.onBeforeRender
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previousObjectBeforeRender.call(this, renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial !== forwardMaterial) return
    const materialUniforms = forwardMaterial.uniforms as Record<string, { value: unknown }>
    const viewProjection = new THREE.Matrix4().copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)
    const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
    setMatrixVectorArray(materialUniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection.multiply(object.matrixWorld))
    setMatrixVectorArray(materialUniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
    setMatrixVectorArray(materialUniforms.hlslcc_mtx4x4unity_WorldToObject.value, worldToObject)
  }
  return { forward: forwardMaterial, forwardGeometry }
}

const DSFX_ALPHA_BLEND_ADD_SHADER_NAME = 'DSFX/FX_SHADER_AlphaBlend_Add'
const DSFX_ALPHA_BLEND_ADD_FINGERPRINT = 'bdf731975748307a798ac9b06c9d2bbb0078ac1a80d02c5d790de6e85c8aceb8'
const DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256 = '44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af'
const DSFX_ALPHA_BLEND_ADD_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
const DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES = [
  '_Color', '_Multiply', '_Texture', '_RGBRGBA', '_Main_Texture_No',
  '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_ZOffsetFactor', '_ZOffsetUnits',
] as const
const DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES = ['_Texture'] as const
const DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES = [
  'in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_COLOR0',
] as const
const DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS = [
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
const DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'unity_Builtins0Array', '_Color', '_Texture_ST',
  '_ZTest_Mode', '_Cull_Mode', '_ZWrite_Mode', '_ZOffsetUnits', '_ZOffsetFactor', '_Multiply', '_RGBRGBA',
  '_Custom_Data_Offset_Use', '_Main_Texture_No', '_Texture',
] as const
const DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES = [
  'in_POSITION0', 'in_NORMAL0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD2', 'vs_COLOR0',
] as const
const DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', 'unity_LODFade',
  'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
  'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
  'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
  'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
  'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
  'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams',
] as const
const DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection',
  '_ShadowCoordModifier', 'unity_Builtins0Array',
] as const
const DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS = [
  {
    blobIndex: 2, offset: 2568, size: 5096, segment: 0, sourceMap: 57, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: 'df04b3b74a13eb8720e8c9e3dbb4adf56c4cad61c60c691a2c59cf7aa59c1659', programDataLength: 5055,
    recordSha256: '56fa177b4bc146116debfca1afab21a995b302f8e92ea27074ff53dabb7684d0',
    parameterBlobIndex: 0, passIndex: 0, passName: '', stateName: 'Forward', playerGroupIndex: 3, playerIndex: 0,
    subProgramIndex: 0, shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES, uniforms: DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS,
  },
  {
    blobIndex: 3, offset: 7664, size: 4560, segment: 0, sourceMap: 57, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: '4c734b1eddd609e21119a81d0e3cf0fb4e3c8b3ae981e741c02eeaae72ec5bd3', programDataLength: 4497,
    recordSha256: 'c6f83c938ddfd905863e50f341ba8c445568254664402ae174ac2c235af17098',
    parameterBlobIndex: 1, passIndex: 0, passName: '', stateName: 'Forward', playerGroupIndex: 3, playerIndex: 1,
    subProgramIndex: 1, shaderRequirements: 2275, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    attributes: [...DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES, 'vs_SV_InstanceID0'], uniforms: DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS,
  },
  {
    blobIndex: 6, offset: 14356, size: 4660, segment: 0, sourceMap: 59, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: '13e560d4e67cdd506232363684014b837d096c675123816d7d52d6570cfd775e', programDataLength: 4620,
    recordSha256: '1aa2a0449aa09764b09a525ed943b4b095d6ffdae1563cd2bcdfc9a037b5b713',
    parameterBlobIndex: 4, passIndex: 1, passName: '', stateName: 'ShadowCaster', playerGroupIndex: 3, playerIndex: 0,
    subProgramIndex: 0, shaderRequirements: 227, keywordIndices: [], keywordNames: [],
    attributes: DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES, uniforms: DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS,
  },
  {
    blobIndex: 7, offset: 19016, size: 4264, segment: 0, sourceMap: 59, version: 202012090,
    platform: 9, platformName: 'GLES3Plus', gpuProgramType: 4, gpuProgramTypeName: 'GLES3',
    programHash: 'a1368f654663b3060b14b33fc3228e12159327792845877575f693c1c50a6c53', programDataLength: 4201,
    recordSha256: 'b3b2b3aecc12c5fb8c248c1dd530c4e6521d43b798f1cab41ff2f81060b4d53f',
    parameterBlobIndex: 5, passIndex: 1, passName: '', stateName: 'ShadowCaster', playerGroupIndex: 3, playerIndex: 1,
    subProgramIndex: 1, shaderRequirements: 2275, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
    attributes: [...DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES, 'vs_SV_InstanceID0'], uniforms: DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS,
  },
] as const
export const DSFX_ALPHA_BLEND_ADD_FORWARD_GLSL = "#ifdef VERTEX\n#version 300 es\n\n#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1\n#if HLSLCC_ENABLE_UNIFORM_BUFFERS\n#define UNITY_UNIFORM\n#else\n#define UNITY_UNIFORM uniform\n#endif\n#define UNITY_SUPPORTS_UNIFORM_LOCATION 1\n#if UNITY_SUPPORTS_UNIFORM_LOCATION\n#define UNITY_LOCATION(x) layout(location = x)\n#define UNITY_BINDING(x) layout(binding = x, std140)\n#else\n#define UNITY_LOCATION(x)\n#define UNITY_BINDING(x) layout(std140)\n#endif\nuniform \tvec4 hlslcc_mtx4x4unity_MatrixVP[4];\n#if HLSLCC_ENABLE_UNIFORM_BUFFERS\nUNITY_BINDING(1) uniform UnityPerDraw {\n#endif\n\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_ObjectToWorld[4];\n\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_WorldToObject[4];\n\tUNITY_UNIFORM vec4 unity_LODFade;\n\tUNITY_UNIFORM mediump vec4 unity_WorldTransformParams;\n\tUNITY_UNIFORM vec4 unity_RenderingLayer;\n\tUNITY_UNIFORM mediump vec4 unity_LightData;\n\tUNITY_UNIFORM mediump vec4 unity_LightIndices[2];\n\tUNITY_UNIFORM mediump vec4 unity_ProbesOcclusion;\n\tUNITY_UNIFORM mediump vec4 unity_SpecCube0_HDR;\n\tUNITY_UNIFORM mediump vec4 unity_SpecCube1_HDR;\n\tUNITY_UNIFORM vec4 unity_SpecCube0_BoxMax;\n\tUNITY_UNIFORM vec4 unity_SpecCube0_BoxMin;\n\tUNITY_UNIFORM vec4 unity_SpecCube0_ProbePosition;\n\tUNITY_UNIFORM vec4 unity_SpecCube1_BoxMax;\n\tUNITY_UNIFORM vec4 unity_SpecCube1_BoxMin;\n\tUNITY_UNIFORM vec4 unity_SpecCube1_ProbePosition;\n\tUNITY_UNIFORM vec4 unity_LightmapST;\n\tUNITY_UNIFORM vec4 unity_DynamicLightmapST;\n\tUNITY_UNIFORM mediump vec4 unity_SHAr;\n\tUNITY_UNIFORM mediump vec4 unity_SHAg;\n\tUNITY_UNIFORM mediump vec4 unity_SHAb;\n\tUNITY_UNIFORM mediump vec4 unity_SHBr;\n\tUNITY_UNIFORM mediump vec4 unity_SHBg;\n\tUNITY_UNIFORM mediump vec4 unity_SHBb;\n\tUNITY_UNIFORM mediump vec4 unity_SHC;\n\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_MatrixPreviousM[4];\n\tUNITY_UNIFORM vec4 hlslcc_mtx4x4unity_MatrixPreviousMI[4];\n\tUNITY_UNIFORM vec4 unity_MotionVectorsParams;\n#if HLSLCC_ENABLE_UNIFORM_BUFFERS\n};\n#endif\nin highp vec4 in_POSITION0;\nin highp vec4 in_TEXCOORD0;\nin highp vec4 in_TEXCOORD1;\nin highp vec4 in_COLOR0;\nout highp vec4 vs_TEXCOORD3;\nout highp vec4 vs_COLOR0;\nvec4 u_xlat0;\nvec4 u_xlat1;\nvoid main()\n{\n    u_xlat0.xyz = in_POSITION0.yyy * hlslcc_mtx4x4unity_ObjectToWorld[1].xyz;\n    u_xlat0.xyz = hlslcc_mtx4x4unity_ObjectToWorld[0].xyz * in_POSITION0.xxx + u_xlat0.xyz;\n    u_xlat0.xyz = hlslcc_mtx4x4unity_ObjectToWorld[2].xyz * in_POSITION0.zzz + u_xlat0.xyz;\n    u_xlat0.xyz = u_xlat0.xyz + hlslcc_mtx4x4unity_ObjectToWorld[3].xyz;\n    u_xlat1 = u_xlat0.yyyy * hlslcc_mtx4x4unity_MatrixVP[1];\n    u_xlat1 = hlslcc_mtx4x4unity_MatrixVP[0] * u_xlat0.xxxx + u_xlat1;\n    u_xlat0 = hlslcc_mtx4x4unity_MatrixVP[2] * u_xlat0.zzzz + u_xlat1;\n    gl_Position = u_xlat0 + hlslcc_mtx4x4unity_MatrixVP[3];\n    vs_TEXCOORD3.xy = in_TEXCOORD0.xy;\n    vs_TEXCOORD3.zw = in_TEXCOORD1.xy;\n    vs_COLOR0 = in_COLOR0;\n    return;\n}\n\n#endif\n#ifdef FRAGMENT\n#version 300 es\n\nprecision highp float;\nprecision highp int;\n#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1\n#if HLSLCC_ENABLE_UNIFORM_BUFFERS\n#define UNITY_UNIFORM\n#else\n#define UNITY_UNIFORM uniform\n#endif\n#define UNITY_SUPPORTS_UNIFORM_LOCATION 1\n#if UNITY_SUPPORTS_UNIFORM_LOCATION\n#define UNITY_LOCATION(x) layout(location = x)\n#define UNITY_BINDING(x) layout(binding = x, std140)\n#else\n#define UNITY_LOCATION(x)\n#define UNITY_BINDING(x) layout(std140)\n#endif\n#if HLSLCC_ENABLE_UNIFORM_BUFFERS\nUNITY_BINDING(0) uniform UnityPerMaterial {\n#endif\n\tUNITY_UNIFORM vec4 _Color;\n\tUNITY_UNIFORM vec4 _Texture_ST;\n\tUNITY_UNIFORM float _ZTest_Mode;\n\tUNITY_UNIFORM float _Cull_Mode;\n\tUNITY_UNIFORM float _ZWrite_Mode;\n\tUNITY_UNIFORM float _ZOffsetUnits;\n\tUNITY_UNIFORM float _ZOffsetFactor;\n\tUNITY_UNIFORM float _Multiply;\n\tUNITY_UNIFORM float _RGBRGBA;\n\tUNITY_UNIFORM float _Custom_Data_Offset_Use;\n\tUNITY_UNIFORM float _Main_Texture_No;\n#if HLSLCC_ENABLE_UNIFORM_BUFFERS\n};\n#endif\nUNITY_LOCATION(0) uniform mediump sampler2D _Texture;\nin highp vec4 vs_TEXCOORD3;\nin highp vec4 vs_COLOR0;\nlayout(location = 0) out mediump vec4 SV_Target0;\nvec4 u_xlat0;\nvec3 u_xlat1;\nbvec2 u_xlatb1;\nvec4 u_xlat2;\nvec2 u_xlat6;\nfloat u_xlat9;\nbool u_xlatb9;\nvoid main()\n{\n    u_xlat0.xy = vs_TEXCOORD3.xy * _Texture_ST.xy + _Texture_ST.zw;\n    u_xlat6.xy = u_xlat0.xy + vs_TEXCOORD3.zw;\n    u_xlatb1.xy = notEqual(vec4(0.0, 0.0, 0.0, 0.0), vec4(_Custom_Data_Offset_Use, _RGBRGBA, _Custom_Data_Offset_Use, _Custom_Data_Offset_Use)).xy;\n    u_xlat0.xy = (u_xlatb1.x) ? u_xlat6.xy : u_xlat0.xy;\n    u_xlat0 = texture(_Texture, u_xlat0.xy);\n    u_xlat9 = (u_xlatb1.y) ? u_xlat0.w : u_xlat0.x;\n    u_xlat1.xyz = _Color.xyz * vec3(vec3(_Multiply, _Multiply, _Multiply));\n    u_xlat1.xyz = vec3(u_xlat9) * u_xlat1.xyz;\n    u_xlat9 = u_xlat9 * vs_COLOR0.w;\n    u_xlat9 = u_xlat9 * _Color.w;\n    u_xlat2.w = u_xlat9 * _Multiply;\n    u_xlat2.w = clamp(u_xlat2.w, 0.0, 1.0);\n    u_xlatb9 = vec4(0.0, 0.0, 0.0, 0.0)!=vec4(_Main_Texture_No);\n    u_xlat0.xyz = (bool(u_xlatb9)) ? vec3(1.0, 1.0, 1.0) : u_xlat0.xyz;\n    u_xlat0.xyz = u_xlat0.xyz * vs_COLOR0.xyz;\n    u_xlat2.xyz = u_xlat0.xyz * u_xlat1.xyz;\n    SV_Target0 = u_xlat2;\n    return;\n}\n\n#endif\n"

const DSFX_ALPHA_BLEND_ADD_PARAMETER_RECORD_SHA256: Record<number, string> = {
  2: 'a4e32c89ae00a77e44f772e5f50b371d34028243345b2231c8817beb0bce74d3',
  3: '5db8a8a64c9a4eb5ca694006a5f4cb90d57b6421d602cb025745d389fe67c865',
  6: '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17',
  7: '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51',
}

function alphaBlendAddGlslIdentifier(source: string, identifier: string) {
  return source.split(/[^A-Za-z0-9_]+/).includes(identifier)
}

function alphaBlendAddProgramSourceMatches(source: any, expected: (typeof DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS)[number]) {
  return typeof source?.glsl === 'string'
    && source.glsl.length === expected.programDataLength
    && source.glsl.includes('#ifdef VERTEX') && source.glsl.includes('#ifdef FRAGMENT')
    && (expected.blobIndex !== 2 || source.glsl === DSFX_ALPHA_BLEND_ADD_FORWARD_GLSL)
    && [...expected.attributes, ...expected.uniforms].every(identifier => alphaBlendAddGlslIdentifier(source.glsl, identifier))
}

function alphaBlendAddExpectedProgram(source: any, expected: (typeof DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS)[number]) {
  const attributes = Array.isArray(source?.attributes)
    ? source.attributes.map((item: any) => typeof item === 'string' ? item : item?.name)
    : Array.isArray(source?.requiredAttributes) ? source.requiredAttributes : expected.attributes
  const uniforms = Array.isArray(source?.uniforms)
    ? source.uniforms.map((item: any) => typeof item === 'string' ? item : item?.name)
    : Array.isArray(source?.requiredUniforms) ? source.requiredUniforms : expected.uniforms
  const result = source?.kind === 'program'
    && source.platform === expected.platform && source.platformName === expected.platformName
    && source.gpuProgramType === expected.gpuProgramType && source.gpuProgramTypeName === expected.gpuProgramTypeName
    && source.blobIndex === expected.blobIndex && source.offset === expected.offset && source.size === expected.size
    && source.segment === expected.segment && source.sourceMap === expected.sourceMap && source.version === expected.version
    && source.programHash === expected.programHash && source.programDataSha256 === expected.programHash
    && source.programDataLength === expected.programDataLength && source.recordSha256 === expected.recordSha256
    && Array.isArray(source.keywords) && exactArray(source.keywords, expected.keywordNames)
    && Array.isArray(attributes) && exactArray(attributes, expected.attributes)
    && Array.isArray(uniforms) && exactArray(uniforms, expected.uniforms)
    && typeof source.glsl === 'string'
  return result
}

function assertDsfxAlphaBlendAddShaderExtraction(metadata: ChibiViewerMaterialMetadata) {
  const extraction = metadata.dsfxShaderExtraction as any
  const sourceReference = profileReferenceKey(metadata.sourceShaderReference)
  const extractionReference = profileReferenceKey(extraction?.shader?.sourceReference ?? extraction?.sourceReference)
  const shaderName = extraction?.shader?.name ?? extraction?.shaderName
  const shaderKeywords = extraction?.shader?.keywordNames ?? extraction?.shaderKeywordNames
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || extraction.unityVersion !== '2021.3' || extraction.fingerprint !== DSFX_ALPHA_BLEND_ADD_FINGERPRINT
    || String(extraction.compressedBlobSha256 ?? '').toLowerCase() !== DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256
    || shaderName !== DSFX_ALPHA_BLEND_ADD_SHADER_NAME || extractionReference !== sourceReference
    || sourceReference !== DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE || !exactArray(shaderKeywords, DSFX_ALPHA_BLEND_ADD_KEYWORDS)) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has no exact source extraction provenance.')
  }
  const gles3Programs = Array.isArray(extraction.gles3Programs)
    ? extraction.gles3Programs
    : extraction.selectedGles3Programs
  const programs = Array.isArray(extraction.programs) ? extraction.programs : gles3Programs
  const bindings = Array.isArray(extraction.bindings)
    ? extraction.bindings
    : Array.isArray(extraction.selectedPassVariants)
      ? extraction.selectedPassVariants.map((item: any) => item?.binding)
      : null
  if (!Array.isArray(gles3Programs) || gles3Programs.length !== DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS.length
    || !Array.isArray(programs) || !Array.isArray(bindings)) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an incomplete GLES3 extraction record set.')
  }
  const allPrograms = programs.filter((program: any) => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
  const allBindings = bindings.filter((binding: any) => binding?.platform === 9 && binding.gpuProgramType === 4)
  if (allPrograms.length !== DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS.length
    || allBindings.length !== DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS.length) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has incomplete GLES3 program or binding records.')
  }
  for (const [index, expected] of DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS.entries()) {
    const program = gles3Programs[index]
    if (!alphaBlendAddExpectedProgram(program, expected)
      || profileReferenceKey(program.sourceReference) !== sourceReference
      || !alphaBlendAddProgramSourceMatches(program, expected)) {
      throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has a tampered GLES3 program record.')
    }
    const record = allPrograms.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
    if (!alphaBlendAddExpectedProgram(record, expected) || profileReferenceKey(record.sourceReference) !== sourceReference
      || !alphaBlendAddProgramSourceMatches(record, expected)) {
      throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material is missing a verified GLES3 program record.')
    }
    if (metadata.dsfxMaterialVariant === DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT
      && DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES.some(inert => new RegExp(`\\b${inert}\\b`).test(program.glsl))) {
      throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material declares a Wakamo inert Standard property.')
    }
    const binding = allBindings.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
    const bindingMismatch = !binding ? ['missing binding'] : [
      binding.subShaderIndex !== 0 && 'subShaderIndex', binding.passIndex !== expected.passIndex && 'passIndex',
      binding.passName !== expected.passName && 'passName', binding.stateName !== expected.stateName && 'stateName',
      binding.stage !== 'vertex' && 'stage', binding.playerGroupIndex !== expected.playerGroupIndex && 'playerGroupIndex',
      binding.playerIndex !== expected.playerIndex && 'playerIndex', binding.subProgramIndex !== expected.subProgramIndex && 'subProgramIndex',
      binding.parameterBlobIndex !== expected.parameterBlobIndex && 'parameterBlobIndex',
      binding.gpuProgramTypeName !== expected.gpuProgramTypeName && 'gpuProgramTypeName',
      binding.shaderRequirements !== expected.shaderRequirements && 'shaderRequirements',
      binding.platform !== expected.platform && 'platform', binding.gpuProgramType !== expected.gpuProgramType && 'gpuProgramType',
      binding.programHash !== expected.programHash && 'programHash', binding.gles3ProgramHash !== expected.programHash && 'gles3ProgramHash',
      binding.programRecordSha256 !== expected.recordSha256 && 'programRecordSha256',
      binding.parameterRecordSha256 !== DSFX_ALPHA_BLEND_ADD_PARAMETER_RECORD_SHA256[expected.blobIndex] && 'parameterRecordSha256',
      !exactArray(binding.keywordIndices, expected.keywordIndices) && 'keywordIndices',
      !exactArray(binding.keywordNames, expected.keywordNames) && 'keywordNames',
      binding.sourceReference !== undefined && profileReferenceKey(binding.sourceReference) !== sourceReference && 'sourceReference',
    ].filter((field): field is string => typeof field === 'string')
    if (bindingMismatch.length) {
      throw new Error(`DSFX/FX_SHADER_AlphaBlend_Add viewer material has tampered binding metadata for ${expected.blobIndex}: ${bindingMismatch.join(', ')}.`)
    }
  }
  return { extraction, forward: gles3Programs[0] as any }
}

function alphaBlendAddColor(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has no exact _Color source value.')
  const color = value as { r?: unknown; g?: unknown; b?: unknown; a?: unknown }
  const values = [color.r, color.g, color.b, color.a].map(Number)
  if (!values.every(Number.isFinite)) throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an invalid _Color source value.')
  return values as [number, number, number, number]
}

function assertDsfxAlphaBlendAddMaterialState(metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'dsfx-static'
    || metadata.renderPass !== null && metadata.renderPass !== undefined && metadata.renderPass !== 'forward'
    || metadata.textureProperty !== '_Texture' || metadata.unlit !== true
    || metadata.alphaMode !== 'BLEND' || metadata.drawLayer !== 'transparent'
    || metadata.polygonOffsetFactor !== 0 || metadata.polygonOffsetUnits !== 0) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an unverified translated render state.')
  }
  const hasWakamoWhiteDefaultSource = profileReferenceKey(metadata.sourceMaterialReference) === DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE
  const isWakamoWhiteDefault = metadata.dsfxMaterialVariant === DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT
  if (isWakamoWhiteDefault !== hasWakamoWhiteDefaultSource
    || (metadata.dsfxMaterialVariant !== undefined && metadata.dsfxMaterialVariant !== null && !isWakamoWhiteDefault)) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an unsupported source material variant.')
  }
  const variant = DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS[String(metadata.dsfxRenderStateVariant)]
  if (!variant || metadata.depthWrite !== variant.depthWrite || metadata.depthTest !== variant.depthTest
    || metadata.depthFunction !== variant.depthFunction || metadata.cullMode !== variant.cullMode
    || metadata.doubleSided !== variant.doubleSided) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an unverified render-state variant.')
  }
  const blend = metadata.blend
  if (!blend || blend.source !== 1 || blend.destination !== 10 || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 10
    || blend.operation !== 0 || blend.operationAlpha !== 0) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an unverified transparent blend state.')
  }
  const properties = metadata.dsfxMaterialProperties as any
  if (!properties || !exactArray(properties.keywords, []) || Object.keys(properties.ints ?? {}).length !== 0) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an unverified source material property set.')
  }
  const floats = properties.floats ?? {}
  const colors = properties.colors ?? {}
  const textures = properties.textures
  const textureNames = Array.isArray(textures) ? textures.map((item: any) => item?.name) : []
  const propertyNames = [...Object.keys(floats), ...Object.keys(properties.ints ?? {}), ...Object.keys(colors), ...textureNames]
  const expectedProperties = isWakamoWhiteDefault
    ? [...Object.keys(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOATS), ...Object.keys(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLORS), '_Texture']
    : DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES
  if (propertyNames.length !== expectedProperties.length
    || new Set(propertyNames).size !== propertyNames.length
    || expectedProperties.some(name => !propertyNames.includes(name))
    || !Array.isArray(textures) || !exactArray(textureNames, DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES)
    || !exactArray(Object.keys(colors), isWakamoWhiteDefault ? Object.keys(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLORS) : ['_Color'])) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an incomplete source property set.')
  }
  const cullMode = variant.cullMode === 'off' ? 0 : variant.cullMode === 'back' ? 2 : 1
  const expectedFloats: Record<string, number> = {
    _Custom_Data_Offset_Use: isWakamoWhiteDefault ? 1 : 0, _ZWrite_Mode: 0, _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: 4,
    _RGBRGBA: 0, _Main_Texture_No: isWakamoWhiteDefault ? 1 : 0, _Cull_Mode: cullMode,
  }
  if (!Number.isFinite(Number(floats._Multiply))
    || Object.entries(expectedFloats).some(([name, value]) => !Number.isFinite(Number(floats[name])) || Number(floats[name]) !== value)
    || (isWakamoWhiteDefault && (Object.keys(floats).length !== Object.keys(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOATS).length
      || Object.entries(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOATS).some(([name, value]) => Number(floats[name]) !== value)))) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has invalid source scalar properties.')
  }
  const wakamoExpectedColors: Readonly<Record<string, { r: number; g: number; b: number; a: number }>> = DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLORS
  if (isWakamoWhiteDefault && Object.entries(wakamoExpectedColors).some(([name, expected]) => {
    const actual = colors[name]
    return !actual || !(['r', 'g', 'b', 'a'] as const).every(component => Object.prototype.hasOwnProperty.call(actual, component)
      && Number(actual[component]) === expected[component])
  })) throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has tampered Wakamo eye colors.')
  const sourceColor = alphaBlendAddColor(colors._Color)
  const sourceTexture = textures[0] as any
  const texturePointer = sourceTexture.texture, textureReference = sourceTexture.textureReference
  if (isWakamoWhiteDefault) {
    if (!texturePointer || String(texturePointer.pathId) !== '0' || textureReference !== null
      || String(texturePointer.file ?? '').toLowerCase() !== 'cab-0ff8a11237bb688b3a3deddb961cd2a6'
      || sourceTexture.scale?.x !== 1 || sourceTexture.scale?.y !== 1
      || sourceTexture.offset?.x !== 0 || sourceTexture.offset?.y !== 0) {
      throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has a tampered Wakamo eye null _Texture pointer or transform.')
    }
  } else if (!texturePointer || String(texturePointer.pathId) === '0' || !textureReference
    || String(texturePointer.file ?? '').toLowerCase() !== String(textureReference.serializedFile ?? '').toLowerCase()
    || String(texturePointer.pathId) !== String(textureReference.objectId)
    || sourceTexture.scale?.x !== 1 || sourceTexture.scale?.y !== 1
    || sourceTexture.offset?.x !== 0 || sourceTexture.offset?.y !== 0) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an unverified _Texture source identity or transform.')
  }
  const resolved = properties.resolvedTextures
  if (!Array.isArray(resolved) || (isWakamoWhiteDefault ? resolved.length !== 0 : resolved.length !== 1 || resolved[0]?.property !== '_Texture'
    || profileReferenceKey(resolved[0]?.sourceReference) !== profileReferenceKey(textureReference)
    || !Number.isInteger(Number(resolved[0]?.width)) || Number(resolved[0]?.width) <= 0
    || !Number.isInteger(Number(resolved[0]?.height)) || Number(resolved[0]?.height) <= 0)) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has incomplete resolved _Texture evidence.')
  }
  if (isWakamoWhiteDefault
    ? metadata.dsfxTextures?.texture?.default !== 'unity-white' || metadata.dsfxTextures?.texture?.index !== undefined
    : !Number.isInteger(metadata.dsfxTextures?.texture?.index)
    || Number(metadata.dsfxTextures?.texture?.index) < 0) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has no exact GLB _Texture binding.')
  }
  return { sourceColor, sourceTexture, sourceFloats: floats, cullMode, variant, isWakamoWhiteDefault }
}

function dsfxAlphaBlendAddPassGeometry(object: THREE.Mesh, baseMaterial: THREE.Material, wakamoWhiteDefault: boolean) {
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('DSFX/FX_SHADER_AlphaBlend_Add source material is not bound to its source primitive.')
  if (Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('DSFX/FX_SHADER_AlphaBlend_Add source primitive group is missing.')
    geometry.clearGroups()
    groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  const attributes: [string, string, number][] = [
    ['POSITION', 'position', 3],
    ['TEXCOORD_0', 'uv', 2],
    ['TEXCOORD_1', 'uv1', 2],
    ['COLOR_0', 'color', 4],
  ]
  for (const [semantic, sourceName, minimumItemSize] of attributes) {
    const attribute = geometry.getAttribute(sourceName)
    if (semantic === 'TEXCOORD_1' && wakamoWhiteDefault) {
      if (attribute) throw new Error('DSFX/FX_SHADER_AlphaBlend_Add Wakamo source geometry unexpectedly has TEXCOORD_1.')
      continue
    }
    if (!attribute || attribute.itemSize < minimumItemSize) {
      throw new Error('DSFX/FX_SHADER_AlphaBlend_Add geometry is missing ' + semantic + ' with its source width.')
    }
    geometry.setAttribute(semantic === 'POSITION' ? 'in_POSITION0'
      : semantic === 'TEXCOORD_0' ? 'in_TEXCOORD0'
        : semantic === 'TEXCOORD_1' ? 'in_TEXCOORD1' : 'in_COLOR0', attribute)
  }
  return geometry
}

function dsfxAlphaBlendAddUniforms(
  texture: THREE.Texture,
  sourceColor: [number, number, number, number],
  sourceTexture: any,
  sourceFloats: Record<string, number | string>,
  cullMode: number,
) {
  const uniforms = dsfxAdditiveUniforms(texture, sourceColor, sourceTexture, cullMode) as Record<string, { value: unknown }>
  uniforms._Multiply = { value: Number(sourceFloats._Multiply) }
  uniforms._RGBRGBA = { value: Number(sourceFloats._RGBRGBA) }
  uniforms._Main_Texture_No = { value: Number(sourceFloats._Main_Texture_No) }
  uniforms._Custom_Data_Offset_Use = { value: Number(sourceFloats._Custom_Data_Offset_Use) }
  return uniforms
}

/**
 * Build the exact non-instanced Forward draw for DSFX/FX_SHADER_AlphaBlend_Add.
 * The instanced and ShadowCaster records remain extraction evidence only.
 */
export function createDsfxAlphaBlendAddPass(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'dsfx-static') return null
  if (profileReferenceKey(metadata.sourceShaderReference) !== DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has an unverified source shader identity.')
  }
  const { extraction, forward } = assertDsfxAlphaBlendAddShaderExtraction(metadata)
  const { sourceColor, sourceTexture, sourceFloats, cullMode, variant, isWakamoWhiteDefault } = assertDsfxAlphaBlendAddMaterialState(metadata)
  const texture = isWakamoWhiteDefault
    ? createUnityWhiteTexture('Unity white (Wakamo eye _Texture default)')
    : (baseMaterial as THREE.MeshBasicMaterial).map
  if (!(texture instanceof THREE.Texture)) {
    throw new Error('DSFX/FX_SHADER_AlphaBlend_Add viewer material has no exact _Texture runtime binding.')
  }
  const forwardGeometry = dsfxAlphaBlendAddPassGeometry(object, baseMaterial, isWakamoWhiteDefault)
  const uniforms = dsfxAlphaBlendAddUniforms(texture, sourceColor, sourceTexture, sourceFloats, cullMode)
  const side = variant.cullMode === 'off' ? THREE.DoubleSide : variant.cullMode === 'back' ? THREE.FrontSide : THREE.BackSide
  const forwardMaterial = new THREE.RawShaderMaterial({
    name: (baseMaterial.name || object.name) + ' DSFX FX_SHADER_AlphaBlend_Add',
    vertexShader: shaderStageSource(DSFX_ALPHA_BLEND_ADD_FORWARD_GLSL, 'VERTEX'),
    fragmentShader: shaderStageSource(DSFX_ALPHA_BLEND_ADD_FORWARD_GLSL, 'FRAGMENT'),
    uniforms, glslVersion: THREE.GLSL3, side,
    depthWrite: variant.depthWrite, depthTest: variant.depthTest, depthFunc: depthFunctions[variant.depthFunction] as THREE.DepthModes,
    transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation, blendEquationAlpha: THREE.AddEquation,
    polygonOffset: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0, toneMapped: false, lights: false, fog: false,
  })
  if (isWakamoWhiteDefault) {
    // The source mesh has no UV1 and this exact material samples Unity-white, so the UV offset is immaterial.
    Object.assign(forwardMaterial.defaultAttributeValues, { in_TEXCOORD1: [0, 0] })
  }
  forwardMaterial.userData.chibi = {
    adapterId: 'dsfx-static', renderPass: 'forward', sourceShaderReference: metadata.sourceShaderReference,
    sourceShaderName: DSFX_ALPHA_BLEND_ADD_SHADER_NAME, programHash: DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS[0].programHash,
    dsfxShaderExtraction: extraction, dsfxMaterialProperties: metadata.dsfxMaterialProperties,
    dsfxTextureIndex: metadata.dsfxTextures?.texture?.index, sourceGlsl: DSFX_ALPHA_BLEND_ADD_FORWARD_GLSL,
    dsfxRenderStateVariant: metadata.dsfxRenderStateVariant, dsfxMaterialVariant: metadata.dsfxMaterialVariant,
  }
  const previousObjectBeforeRender = object.onBeforeRender
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previousObjectBeforeRender.call(this, renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial !== forwardMaterial) return
    const materialUniforms = forwardMaterial.uniforms as Record<string, { value: unknown }>
    const viewProjection = new THREE.Matrix4().copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)
    const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
    setMatrixVectorArray(materialUniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection.multiply(object.matrixWorld))
    setMatrixVectorArray(materialUniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
    setMatrixVectorArray(materialUniforms.hlslcc_mtx4x4unity_WorldToObject.value, worldToObject)
  }
  if (typeof metadata.renderOrder === 'number') object.renderOrder = Math.max(object.renderOrder, metadata.renderOrder)
  return { forward: forwardMaterial, forwardGeometry }
}
const DSFX_GLITCH_TEX_SOURCE_REFERENCE = '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85:cab-38d7f184c16228480d78cd7ea10cae27:-50954330373109545'
const DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256 = 'b8f29baf75b913a1231adf3c24f8a24b179deaee5bbc03a0e145984c691a15a0'
const DSFX_GLITCH_TEX_FINGERPRINT = 'da4f6c1689e70742a01d91febca067eb0492a4121ad2fc63476323a6459f7b3e'
const DSFX_GLITCH_TEX_SHADER_NAME = 'DSFX/FX_SHADER_Glitch_Tex'
const DSFX_GLITCH_TEX_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
const DSFX_GLITCH_TEX_REQUIRED_PROPERTIES = [
  '_MainTex', '_x', '_y', '_Speed_Value', '_NoiseTex', '_Shaking', '_Glitch_value', '_Jitter', '_Cull_Mode',
] as const
const DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH = '38d23aef9f77ca1a78dfd0efb262bca0bccdafaa1b72b2da397d03bb8c8baf71'
const DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH = 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5'
const DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256 = '3bc739b0ac1bdfebdef0f55320721c38555e9e0e263a844a90287b32c3656dbc'
const DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 = '9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4'
const DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256 = '42c347357ddcd6b9365ba7a523bf05e2b4aa17076093ba172e7ac7ad313f1450'
const DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256 = '89cb58753bbfac486d044fc253235f533f9634393bd30204de277063619427ee'

function glitchProperties(metadata: ChibiViewerMaterialMetadata) {
  const properties = metadata.glitchMaterialProperties
  if (!properties || Object.keys(properties.ints ?? {}).length || Object.keys(properties.colors ?? {}).length
    || !exactArray(properties.keywords, []) || Object.keys(properties.floats ?? {}).length !== 7) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has an unverified source material state.')
  }
  const expected: Record<string, number> = {
    _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12,
  }
  for (const [name, value] of Object.entries(expected)) {
    const actual = Number(properties.floats?.[name])
    if (!Number.isFinite(actual) || actual !== value) throw new Error(`DSFX/FX_SHADER_Glitch_Tex viewer material has an invalid ${name} value.`)
  }
  const textures = properties.textures
  if (!Array.isArray(textures) || textures.length !== 2
    || !exactArray(textures.map((texture: any) => texture?.name), ['_MainTex', '_NoiseTex'])) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has an unverified source texture property set.')
  }
  const main = textures[0] as any, noise = textures[1] as any
  if (!main?.texture || String(main.texture.pathId) !== '0' || main.textureReference !== null
    || Number(main.scale?.x) !== 1 || Number(main.scale?.y) !== 1 || Number(main.offset?.x) !== 0 || Number(main.offset?.y) !== 0) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has no source-authorized Unity white _MainTex default.')
  }
  if (!noise?.texture || String(noise.texture.pathId) !== '277634516359511144'
    || String(noise.texture.file ?? '').toLowerCase() !== 'cab-39fe55e8868aab69e2cf9a8ae5dcef67'
    || profileReferenceKey(noise.textureReference) !== '1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74:cab-39fe55e8868aab69e2cf9a8ae5dcef67:277634516359511144'
    || Number(noise.scale?.x) !== 1 || Number(noise.scale?.y) !== 1 || Number(noise.offset?.x) !== 0 || Number(noise.offset?.y) !== 0) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has an unverified source _NoiseTex identity.')
  }
  const resolved = properties.resolvedTextures as Array<{ property?: unknown; width?: unknown; height?: unknown; sourceReference?: unknown }> | undefined
  if (!Array.isArray(resolved) || resolved.length !== 1 || resolved[0]?.property !== '_NoiseTex'
    || Number(resolved[0]?.width) !== 256 || Number(resolved[0]?.height) !== 256
    || profileReferenceKey(resolved[0]?.sourceReference) !== profileReferenceKey(noise.textureReference)) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has incomplete resolved _NoiseTex evidence.')
  }
  return expected
}

function assertDsfxGlitchPass(pass: ChibiViewerShaderPassMetadata | undefined, expected: {
  pass: 'forward' | 'shadow'
  stateName: 'Forward' | 'ShadowCaster'
  passIndex: number
  blobIndex: number
  parameterBlobIndex: number
  parameterRecordSha256: string
  programHash: string
  programRecordSha256: string
  programDataLength: number
  attributes: readonly string[]
  uniforms: readonly string[]
  renderState: { zWrite: number; zTest: number; culling: number; cullingProperty: string; sourceBlend: number; destinationBlend: number; sourceBlendAlpha: number; destinationBlendAlpha: number; blendOperation: number; blendOperationAlpha: number; colorMask: number; depthOnly: boolean }
}, label: string) {
  const state = pass?.renderState
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
    || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
    || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
    || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, []) || !exactArray(pass.keywordNames, [])
    || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash || pass.programDataLength !== expected.programDataLength
    || pass.programRecordSha256 !== expected.programRecordSha256 || typeof pass.glsl !== 'string'
    || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')
    || !exactArray(pass.requiredAttributes, expected.attributes) || !exactArray(pass.requiredUniforms, expected.uniforms)
    || state?.zWrite !== expected.renderState.zWrite || state.zTest !== expected.renderState.zTest || state.culling !== expected.renderState.culling
    || state.cullingProperty !== expected.renderState.cullingProperty || state.sourceBlend !== expected.renderState.sourceBlend
    || state.destinationBlend !== expected.renderState.destinationBlend || state.sourceBlendAlpha !== expected.renderState.sourceBlendAlpha
    || state.destinationBlendAlpha !== expected.renderState.destinationBlendAlpha || state.blendOperation !== expected.renderState.blendOperation
    || state.blendOperationAlpha !== expected.renderState.blendOperationAlpha || state.colorMask !== expected.renderState.colorMask
    || state.depthOnly !== expected.renderState.depthOnly) {
    throw new Error(`DSFX/FX_SHADER_Glitch_Tex viewer material has incomplete ${label} source pass metadata.`)
  }
  for (const attribute of expected.attributes) {
    const sourceName = attribute === 'POSITION' ? 'in_POSITION0' : attribute === 'NORMAL' ? 'in_NORMAL0' : 'in_TEXCOORD0'
    if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceName}\\b`).test(pass.glsl)) throw new Error(`DSFX/FX_SHADER_Glitch_Tex source is missing ${attribute}.`)
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`).test(pass.glsl)) throw new Error(`DSFX/FX_SHADER_Glitch_Tex source is missing ${uniform}.`)
  }
}

function assertDsfxGlitchShaderExtraction(metadata: ChibiViewerMaterialMetadata) {
  const extraction = metadata.glitchShaderExtraction
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== DSFX_GLITCH_TEX_FINGERPRINT || extraction.compressedBlobSha256 !== DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
    || profileReferenceKey(extraction.sourceReference) !== DSFX_GLITCH_TEX_SOURCE_REFERENCE
    || extraction.shaderName !== DSFX_GLITCH_TEX_SHADER_NAME || !exactArray(extraction.shaderKeywordNames, DSFX_GLITCH_TEX_SHADER_KEYWORDS)
    || !exactArray(extraction.requiredProperties, DSFX_GLITCH_TEX_REQUIRED_PROPERTIES)
    || !exactArray(extraction.requiredTextureProperties, ['_MainTex', '_NoiseTex'])) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has no exact source extraction metadata.')
  }
  const forward = extraction.passes?.forward, shadow = extraction.passes?.shadow
  assertDsfxGlitchPass(forward, {
    pass: 'forward', stateName: 'Forward', passIndex: 0, blobIndex: 1, parameterBlobIndex: 0,
    parameterRecordSha256: DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256, programHash: DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
    programRecordSha256: DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256, programDataLength: 5868,
    attributes: ['POSITION', 'TEXCOORD_0'], uniforms: ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', '_Time', '_Cull_Mode', '_Speed_Value', '_Shaking', '_Jitter', '_Glitch_value', '_x', '_y', '_NoiseTex', '_MainTex'],
    renderState: { zWrite: 0, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  }, 'Forward')
  assertDsfxGlitchPass(shadow, {
    pass: 'shadow', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 3, parameterBlobIndex: 2,
    parameterRecordSha256: DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256, programHash: DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH,
    programRecordSha256: DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256, programDataLength: 4379,
    attributes: ['POSITION', 'NORMAL'], uniforms: ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_ObjectToWorld'],
    renderState: { zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  }, 'ShadowCaster')
  if (metadata.glitchShadowPass !== undefined && metadata.glitchShadowPass !== null) {
    assertDsfxGlitchPass(metadata.glitchShadowPass, {
      pass: 'shadow', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 3, parameterBlobIndex: 2,
      parameterRecordSha256: DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256, programHash: DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH,
      programRecordSha256: DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256, programDataLength: 4379,
      attributes: ['POSITION', 'NORMAL'], uniforms: ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_ObjectToWorld'],
      renderState: { zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
    }, 'ShadowCaster metadata')
  }
  return { extraction, forward: forward!, shadow: shadow! }
}

function createUnityWhiteTexture(name = 'Unity white (DSFX Glitch_Tex _MainTex default)') {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.name = name
  texture.flipY = false; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; texture.needsUpdate = true
  return texture
}

function glitchUniforms(metadata: ChibiViewerMaterialMetadata, mainTex: THREE.Texture, noiseTex: THREE.Texture) {
  const properties = glitchProperties(metadata)
  return {
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(new THREE.Matrix4()) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(new THREE.Matrix4()) },
    _Time: { value: new THREE.Vector4() },
    _Cull_Mode: { value: properties._Cull_Mode }, _Speed_Value: { value: properties._Speed_Value },
    _Shaking: { value: properties._Shaking }, _Jitter: { value: properties._Jitter }, _Glitch_value: { value: properties._Glitch_value },
    _x: { value: properties._x }, _y: { value: properties._y }, _NoiseTex: { value: noiseTex }, _MainTex: { value: mainTex },
  }
}

/** Update the recovered source global `_Time.y` and Unity transform uniforms. */
export function updateDsfxGlitchTexUniforms(material: THREE.RawShaderMaterial, object: THREE.Object3D, camera: THREE.Camera, elapsedSeconds: number) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) throw new Error('DSFX/FX_SHADER_Glitch_Tex requires a finite monotonic elapsed-seconds value.')
  const last = material.userData.chibiGlitchLastTime
  if (typeof last === 'number' && elapsedSeconds < last) throw new Error('DSFX/FX_SHADER_Glitch_Tex elapsed-seconds value is not monotonic.')
  material.userData.chibiGlitchLastTime = elapsedSeconds
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const time = uniforms._Time?.value
  if (!(time instanceof THREE.Vector4)) throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has no _Time uniform.')
  time.y = elapsedSeconds
  const viewProjection = new THREE.Matrix4().copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
}

function glitchPassGeometry(object: THREE.Mesh, baseMaterial: THREE.Material) {
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('DSFX/FX_SHADER_Glitch_Tex source material is not bound to its source primitive.')
  if (Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('DSFX/FX_SHADER_Glitch_Tex source primitive group is missing.')
    geometry.clearGroups(); groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  ensureSourceAttribute(geometry, 'POSITION', 'position', 'in_POSITION0', 3)
  ensureSourceAttribute(geometry, 'TEXCOORD_0', 'uv', 'in_TEXCOORD0', 2)
  return geometry
}

/** Build the source-derived Forward draw for DSFX/FX_SHADER_Glitch_Tex. */
export function createDsfxGlitchTexPass(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'dsfx-glitch-tex') return null
  if (profileReferenceKey(metadata.sourceShaderReference) !== DSFX_GLITCH_TEX_SOURCE_REFERENCE) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has an unverified source shader identity.')
  }
  const { extraction, forward, shadow } = assertDsfxGlitchShaderExtraction(metadata)
  glitchProperties(metadata)
  const textures = metadata.glitchTextures
  if (!textures?.mainTex || textures.mainTex.default !== 'unity-white' || textures.mainTex.index !== undefined
    || !textures.noiseTex || !Number.isInteger(textures.noiseTex.index)) {
    throw new Error('DSFX/FX_SHADER_Glitch_Tex viewer material has no explicit Unity white/MainTex and NoiseTex bindings.')
  }
  const userData = baseMaterial.userData as { chibiGlitchTextures?: { mainTex?: THREE.Texture; noiseTex?: THREE.Texture } }
  const mainTex = userData.chibiGlitchTextures?.mainTex ?? createUnityWhiteTexture()
  const noiseTex = userData.chibiGlitchTextures?.noiseTex
  if (!(mainTex instanceof THREE.Texture) || !(noiseTex instanceof THREE.Texture)) throw new Error('DSFX/FX_SHADER_Glitch_Tex texture dependencies are missing.')
  const forwardGeometry = glitchPassGeometry(object, baseMaterial)
  const forwardMaterial = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} DSFX Glitch_Tex`,
    vertexShader: shaderStageSource(forward.glsl as string, 'VERTEX'), fragmentShader: shaderStageSource(forward.glsl as string, 'FRAGMENT'),
    uniforms: glitchUniforms(metadata, mainTex, noiseTex), glslVersion: THREE.GLSL3,
    side: THREE.FrontSide, depthWrite: false, depthTest: true, depthFunc: THREE.LessEqualDepth,
    transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.SrcAlphaFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation, blendEquationAlpha: THREE.AddEquation,
    polygonOffset: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0, toneMapped: false, lights: false, fog: false,
  })
  forwardMaterial.userData.chibi = {
    adapterId: 'dsfx-glitch-tex', renderPass: 'forward', sourceShaderReference: metadata.sourceShaderReference,
    programHash: forward.programHash, glitchShaderExtraction: extraction, glitchShadowPass: shadow,
    glitchMainTexDefault: 'unity-white', glitchNoiseTextureIndex: textures.noiseTex.index,
  }
  const previousObjectBeforeRender = object.onBeforeRender
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previousObjectBeforeRender.call(this, renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial !== forwardMaterial) return
    const elapsedSeconds = (scene.userData as { chibiElapsedSeconds?: unknown }).chibiElapsedSeconds
    if (typeof elapsedSeconds !== 'number') throw new Error('DSFX/FX_SHADER_Glitch_Tex has no viewer elapsed-seconds source.')
    updateDsfxGlitchTexUniforms(forwardMaterial, object, camera, elapsedSeconds)
  }
  return { forward: forwardMaterial, forwardGeometry, nonColorPasses: { shadow } }
}

const DSFX_MATCAP_SOURCE_REFERENCE = '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c:cab-428091522b4007f213bf16532c4528a1:-2917564576425350283'
const DSFX_MATCAP_MATERIAL_REFERENCE = 'd595ec49e21a44b8a9d1fb280f5e9ea00fedcda560ffc242e792b4fcd175d748:cab-ea179b2d4143f9bef81bc7cac07dcd93:-5136731906767245831'
const DSFX_MATCAP_MAIN_TEXTURE_REFERENCE = 'c0902532467f62315531c05d9e7047e6265b5021ac982cf06cdd87ecb2ffd4b4:cab-22cae0b66f2ef2c9cc2627354aa6e59d:-1931283808872943791'
const DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE = '1e293d91261dd2af2b91657dfe0e2e0512c48e246ac43ac90d99159975f5b1a7:cab-7405438e0c71de1c2ead1707d796c2fc:3221402221456861287'
const DSFX_MATCAP_PROGRAM_BLOB_SHA256 = '3da48932a17f98d5de6fc428f1ba992e824152b12be7e30a169cae5de3c1ba9d'
const DSFX_MATCAP_FINGERPRINT = '99e3d6e9cccc359cdf91cd2e7253b62b1929a522326d1291a7ae43d944e468dc'
const DSFX_MATCAP_SHADER_NAME = 'DSFX/FX_SHADER_Matcap'
const DSFX_MATCAP_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
] as const
const DSFX_MATCAP_REQUIRED_PROPERTIES = ['_Main_Color', '_Main_Tex', '_Matcap_Tex', '_ZWrite_Mode', '_Cull_Mode', '_texcoord'] as const
const DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES = ['_Main_Tex', '_Matcap_Tex'] as const
// CH0191_FoodProp_02 serializes these URP-era fields even though the linked
// DSFX Matcap shader neither declares nor references them. Keep their values
// exact: this is a material-specific residue allowlist, not a generic escape
// hatch for unknown properties.
const DSFX_MATCAP_INERT_FLOAT_PROPERTIES = {
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
const DSFX_MATCAP_INERT_COLOR_PROPERTIES = {
  _BaseColor: { r: 1, g: 1, b: 1, a: 1 },
  _Color: { r: 1, g: 1, b: 1, a: 1 },
  _EmissionColor: { r: 0, g: 0, b: 0, a: 1 },
  _SpecColor: { r: 0.5849056243896484, g: 0.5849056243896484, b: 0.5849056243896484, a: 0.032999999821186066 },
} as const
const DSFX_MATCAP_INERT_PROPERTIES = new Set([
  ...Object.keys(DSFX_MATCAP_INERT_FLOAT_PROPERTIES), ...Object.keys(DSFX_MATCAP_INERT_COLOR_PROPERTIES),
])
const DSFX_MATCAP_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0'] as const
const DSFX_MATCAP_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL', 'COLOR_0'] as const
const DSFX_MATCAP_FORWARD_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
  'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST', '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex',
] as const
const DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_WorldToObjectArray',
  'unity_Builtins0Array', 'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST', '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex',
] as const
const DSFX_MATCAP_SHADOW_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
] as const
const DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
  'hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_WorldToObjectArray', 'unity_Builtins0Array',
] as const
const DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH = 'b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e'
const DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH = '38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4'
const DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH = 'd33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67'
const DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH = '8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7'
const DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256 = 'a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e'
const DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256 = 'fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f'
const DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256 = '34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3'
const DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256 = 'd0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3'
const DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256 = '1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150'
const DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256 = '1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175'
const DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17'
const DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256 = '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51'
const DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH = 5178
const DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH = 4726
const DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH = 4923
const DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH = 4599

const dsfxMatcapPassExpected = {
  forward: {
    pass: 'forward', variant: 'static', stateName: 'Forward', passIndex: 0, blobIndex: 2, parameterBlobIndex: 0,
    parameterRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH,
    programRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH,
    attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_UNIFORMS,
    renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  forwardInstanced: {
    pass: 'forward', variant: 'instanced', stateName: 'Forward', passIndex: 0, blobIndex: 3, parameterBlobIndex: 1,
    parameterRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH,
    programRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
    attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
    renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  },
  shadow: {
    pass: 'shadow', variant: 'static', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 6, parameterBlobIndex: 4,
    parameterRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH,
    programRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH,
    attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_UNIFORMS,
    renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
  shadowInstanced: {
    pass: 'shadow', variant: 'instanced', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 7, parameterBlobIndex: 5,
    parameterRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH,
    programRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
    attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
    renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
  },
} as const

function dsfxMatcapEscaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function dsfxMatcapSourceAttributeName(attribute: string) {
  if (attribute === 'POSITION') return 'in_POSITION0'
  if (attribute === 'NORMAL') return 'in_NORMAL0'
  if (attribute === 'TEXCOORD_0') return 'in_TEXCOORD0'
  if (attribute === 'COLOR_0') return 'in_COLOR0'
  throw new Error(`DSFX/FX_SHADER_Matcap has an unknown source attribute ${attribute}.`)
}

function assertDsfxMatcapPass(pass: ChibiViewerMatcapShaderPassMetadata | undefined, expected: typeof dsfxMatcapPassExpected[keyof typeof dsfxMatcapPassExpected], label: string) {
  const state = pass?.renderState
  if (!pass || pass.pass !== expected.pass || pass.variant !== expected.variant || pass.stateName !== expected.stateName
    || pass.subShaderIndex !== 0 || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex'
    || pass.platform !== 9 || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex
    || pass.parameterBlobIndex !== expected.parameterBlobIndex || pass.parameterRecordSha256 !== expected.parameterRecordSha256
    || !exactArray(pass.keywordIndices, expected.variant === 'instanced' ? [5] : [])
    || !exactArray(pass.keywordNames, expected.variant === 'instanced' ? ['INSTANCING_ON'] : [])
    || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash
    || pass.programDataLength !== expected.programDataLength || pass.programRecordSha256 !== expected.programRecordSha256
    || typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX')
    || !pass.glsl.includes('#ifdef FRAGMENT') || !exactArray(pass.requiredAttributes, expected.attributes)
    || !exactArray(pass.requiredUniforms, expected.uniforms) || !state
    || state.zWrite !== expected.renderState.zWrite || state.zWriteProperty !== expected.renderState.zWriteProperty
    || state.zTest !== expected.renderState.zTest || state.zTestProperty !== expected.renderState.zTestProperty
    || state.culling !== expected.renderState.culling || state.cullingProperty !== expected.renderState.cullingProperty
    || state.sourceBlend !== expected.renderState.sourceBlend || state.destinationBlend !== expected.renderState.destinationBlend
    || state.sourceBlendAlpha !== expected.renderState.sourceBlendAlpha || state.destinationBlendAlpha !== expected.renderState.destinationBlendAlpha
    || state.blendOperation !== expected.renderState.blendOperation || state.blendOperationAlpha !== expected.renderState.blendOperationAlpha
    || state.colorMask !== expected.renderState.colorMask || state.depthOnly !== expected.renderState.depthOnly) {
    throw new Error(`DSFX/FX_SHADER_Matcap viewer material has incomplete or tampered ${label} source pass metadata.`)
  }
  for (const attribute of expected.attributes) {
    const sourceName = dsfxMatcapSourceAttributeName(attribute)
    if (!new RegExp(`\\bin\\s+[^;]*\\b${dsfxMatcapEscaped(sourceName)}\\b`).test(pass.glsl)) {
      throw new Error(`DSFX/FX_SHADER_Matcap ${label} source is missing ${attribute}.`)
    }
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${dsfxMatcapEscaped(uniform)}\\b`).test(pass.glsl)) {
      throw new Error(`DSFX/FX_SHADER_Matcap ${label} source is missing ${uniform}.`)
    }
  }
  if (expected.pass === 'forward' && (!/texture\s*\(\s*_Main_Tex\b/.test(pass.glsl)
    || !/texture\s*\(\s*_Matcap_Tex\b/.test(pass.glsl) || !/hlslcc_mtx4x4unity_MatrixV/.test(pass.glsl)
    || !/vs_COLOR0/.test(pass.glsl) || !/vs_TEXCOORD4/.test(pass.glsl) || !/SV_Target0/.test(pass.glsl))) {
    throw new Error('DSFX/FX_SHADER_Matcap Forward source does not preserve the view-space matcap instruction path.')
  }
}

function assertDsfxMatcapShaderExtraction(metadata: ChibiViewerMaterialMetadata) {
  const extraction = metadata.matcapShaderExtraction
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== DSFX_MATCAP_FINGERPRINT || extraction.compressedBlobSha256 !== DSFX_MATCAP_PROGRAM_BLOB_SHA256
    || profileReferenceKey(extraction.sourceReference) !== DSFX_MATCAP_SOURCE_REFERENCE || extraction.shaderName !== DSFX_MATCAP_SHADER_NAME
    || !exactArray(extraction.shaderKeywordNames, DSFX_MATCAP_SHADER_KEYWORDS)
    || !exactArray(extraction.requiredProperties, DSFX_MATCAP_REQUIRED_PROPERTIES)
    || !exactArray(extraction.requiredTextureProperties, DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES)) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has no exact source extraction metadata.')
  }
  const passes = extraction.passes
  assertDsfxMatcapPass(passes?.forward, dsfxMatcapPassExpected.forward, 'Forward')
  assertDsfxMatcapPass(passes?.forwardInstanced, dsfxMatcapPassExpected.forwardInstanced, 'Forward instanced')
  assertDsfxMatcapPass(passes?.shadow, dsfxMatcapPassExpected.shadow, 'ShadowCaster')
  assertDsfxMatcapPass(passes?.shadowInstanced, dsfxMatcapPassExpected.shadowInstanced, 'ShadowCaster instanced')
  const glsl = Object.values(passes ?? {}).map(pass => typeof pass?.glsl === 'string' ? pass.glsl : '').join('\n')
  for (const inert of DSFX_MATCAP_INERT_PROPERTIES) {
    if (new RegExp(`\\b${dsfxMatcapEscaped(inert)}\\b`).test(glsl)) {
      throw new Error(`DSFX/FX_SHADER_Matcap GLSL declares or consumes inert property ${inert}.`)
    }
  }
  return { extraction, forward: passes!.forward!, shadow: passes!.shadow! }
}

function dsfxMatcapProperties(metadata: ChibiViewerMaterialMetadata) {
  const properties = metadata.matcapMaterialProperties
  const floats = properties?.floats ?? {}
  const expectedFloats = { ...DSFX_MATCAP_INERT_FLOAT_PROPERTIES, _ZWrite_Mode: 1, _Cull_Mode: 2 }
  const exactNumber = (actual: unknown, expected: number) => (typeof actual === 'number' || typeof actual === 'string') && Number(actual) === expected
  if (!properties || Object.keys(floats).length !== Object.keys(expectedFloats).length
    || Object.entries(expectedFloats).some(([name, expected]) => !exactNumber(floats[name], expected))
    || Object.keys(properties.ints ?? {}).length || !exactArray(properties.keywords, [])) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified source material state.')
  }
  const expectedColors = {
    ...DSFX_MATCAP_INERT_COLOR_PROPERTIES,
    _Main_Color: { r: 0.30188679695129395, g: 0.055614907294511795, b: 0, a: 0.772549033164978 },
  }
  const colors = properties.colors ?? {}
  const exactColor = (actual: unknown, expected: { r: number; g: number; b: number; a: number }) => {
    if (!actual || typeof actual !== 'object') return false
    const value = actual as Record<string, unknown>
    return (['r', 'g', 'b', 'a'] as const).every(component => Object.prototype.hasOwnProperty.call(value, component)
      && exactNumber(value[component], expected[component]))
  }
  if (Object.keys(colors).length !== Object.keys(expectedColors).length
    || Object.keys(colors).some(name => !Object.prototype.hasOwnProperty.call(expectedColors, name))
    || Object.entries(expectedColors).some(([name, expected]) => !exactColor(colors[name], expected))) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified source material state.')
  }
  if (Number(floats._ZWrite_Mode) !== 1 || Number(floats._Cull_Mode) !== 2) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an invalid source render-state property.')
  }
  const color = properties.colors?._Main_Color
  const colorValues = [color?.r, color?.g, color?.b, color?.a].map(Number)
  if (!color || !colorValues.every(Number.isFinite) || !exactArray(colorValues, [0.30188679695129395, 0.055614907294511795, 0, 0.772549033164978])) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified _Main_Color value.')
  }
  const textures = properties.textures
  if (!Array.isArray(textures) || textures.length !== 3
    || !exactArray(textures.map((texture: any) => texture?.name), ['_Main_Tex', '_Matcap_Tex', '_texcoord'])) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified source texture property set.')
  }
  const expectedTextures = { _Main_Tex: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE, _Matcap_Tex: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE } as const
  for (const property of DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES) {
    const texture = textures.find((item: any) => item?.name === property) as any
    const expected = expectedTextures[property]
    if (!texture?.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
      || String(texture.texture.file ?? '').toLowerCase() !== expected.split(':')[1]
      || String(texture.texture.pathId) !== expected.split(':')[2]
      || profileReferenceKey(texture.textureReference) !== expected
      || Number(texture.scale?.x) !== 1 || Number(texture.scale?.y) !== 1
      || Number(texture.offset?.x) !== 0 || Number(texture.offset?.y) !== 0) {
      throw new Error(`DSFX/FX_SHADER_Matcap viewer material has an unverified ${property} source identity.`)
    }
  }
  const texcoord = textures.find((texture: any) => texture?.name === '_texcoord') as any
  if (!texcoord?.texture || String(texcoord.texture.pathId) !== '0' || texcoord.textureReference !== null
    || Number(texcoord.scale?.x) !== 1 || Number(texcoord.scale?.y) !== 1
    || Number(texcoord.offset?.x) !== 0 || Number(texcoord.offset?.y) !== 0) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified _texcoord default binding.')
  }
  const resolved = properties.resolvedTextures as Array<{ property?: unknown; width?: unknown; height?: unknown; sourceReference?: unknown; scale?: { x?: unknown; y?: unknown }; offset?: { x?: unknown; y?: unknown } }> | undefined
  if (!Array.isArray(resolved) || resolved.length !== 2 || !exactArray(resolved.map(texture => texture.property), DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES)
    || resolved.some(texture => Number(texture.width) !== 64 || Number(texture.height) !== 64
      || Number(texture.scale?.x ?? 1) !== 1 || Number(texture.scale?.y ?? 1) !== 1
      || Number(texture.offset?.x ?? 0) !== 0 || Number(texture.offset?.y ?? 0) !== 0)) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has incomplete resolved texture evidence.')
  }
  for (const property of DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES) {
    const resolvedTexture = resolved.find(texture => texture.property === property)
    if (profileReferenceKey(resolvedTexture?.sourceReference) !== expectedTextures[property]) {
      throw new Error(`DSFX/FX_SHADER_Matcap viewer material has an inconsistent resolved ${property} identity.`)
    }
  }
  return { color: new THREE.Vector4(...colorValues), zWrite: 1, cullMode: 2 }
}

function dsfxMatcapTextureBindings(metadata: ChibiViewerMaterialMetadata, baseMaterial: THREE.Material) {
  const bindings = metadata.matcapTextures
  const mainIndex = bindings?.mainTex?.index
  const matcapIndex = bindings?.matcapTex?.index
  if (!bindings?.mainTex || !bindings.matcapTex || !Number.isInteger(mainIndex) || !Number.isInteger(matcapIndex)
    || Number(mainIndex) < 0 || Number(matcapIndex) < 0 || mainIndex === matcapIndex) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has no exact _Main_Tex and _Matcap_Tex bindings.')
  }
  const textures = (baseMaterial.userData as { chibiMatcapTextures?: { mainTex?: unknown; matcapTex?: unknown } }).chibiMatcapTextures
  const mainTex = textures?.mainTex
  const matcapTex = textures?.matcapTex
  if (!(mainTex instanceof THREE.Texture) || !(matcapTex instanceof THREE.Texture)) {
    throw new Error('DSFX/FX_SHADER_Matcap texture dependencies are missing.')
  }
  return { mainTex, matcapTex }
}

function dsfxMatcapUniforms(metadata: ChibiViewerMaterialMetadata, mainTex: THREE.Texture, matcapTex: THREE.Texture) {
  const properties = dsfxMatcapProperties(metadata)
  const identity = new THREE.Matrix4()
  return {
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_WorldToObject: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_MatrixV: { value: matrixVectorArray(identity) },
    _Main_Color: { value: properties.color },
    _Main_Tex_ST: { value: new THREE.Vector4(mainTex.repeat.x, mainTex.repeat.y, mainTex.offset.x, mainTex.offset.y) },
    _ZWrite_Mode: { value: properties.zWrite }, _Cull_Mode: { value: properties.cullMode },
    _Matcap_Tex: { value: matcapTex }, _Main_Tex: { value: mainTex },
  }
}

/** Update source transform and view uniforms for DSFX/FX_SHADER_Matcap. */
export function updateDsfxMatcapUniforms(material: THREE.RawShaderMaterial, object: THREE.Object3D, camera: THREE.Camera) {
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
  const viewProjection = new THREE.Matrix4().copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixVP?.value, viewProjection)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_ObjectToWorld?.value, object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_WorldToObject?.value, worldToObject)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixV?.value, camera.matrixWorldInverse)
  const mainTex = uniforms._Main_Tex?.value
  if (!(mainTex instanceof THREE.Texture) || !(uniforms._Main_Tex_ST?.value instanceof THREE.Vector4)) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has no exact _Main_Tex uniform.')
  }
  ;(uniforms._Main_Tex_ST.value as THREE.Vector4).set(mainTex.repeat.x, mainTex.repeat.y, mainTex.offset.x, mainTex.offset.y)
}

function dsfxMatcapPassGeometry(object: THREE.Mesh, baseMaterial: THREE.Material) {
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('DSFX/FX_SHADER_Matcap source material is not bound to its source primitive.')
  if (Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('DSFX/FX_SHADER_Matcap source primitive group is missing.')
    geometry.clearGroups(); groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  ensureSourceAttribute(geometry, 'POSITION', 'position', 'in_POSITION0', 3)
  ensureSourceAttribute(geometry, 'NORMAL', 'normal', 'in_NORMAL0', 3)
  ensureSourceAttribute(geometry, 'TEXCOORD_0', 'uv', 'in_TEXCOORD0', 2)
  ensureSourceAttribute(geometry, 'COLOR_0', 'color', 'in_COLOR0', 4)
  return geometry
}

/** Build the source-derived Forward draw for DSFX/FX_SHADER_Matcap. */
export function createDsfxMatcapPass(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'dsfx-matcap') return null
  if (profileReferenceKey(metadata.sourceShaderReference) !== DSFX_MATCAP_SOURCE_REFERENCE
    || profileReferenceKey(metadata.sourceMaterialReference) !== DSFX_MATCAP_MATERIAL_REFERENCE) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified source identity.')
  }
  if (metadata.renderPass !== 'forward' || metadata.textureProperty !== '_Main_Tex' || metadata.unlit !== false
    || metadata.drawLayer !== 'transparent' || metadata.alphaMode !== 'BLEND' || metadata.depthWrite !== true
    || metadata.depthTest !== true || metadata.depthFunction !== 'less-equal' || metadata.cullMode !== 'back'
    || metadata.polygonOffsetFactor !== 0 || metadata.polygonOffsetUnits !== 0) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified translated render state.')
  }
  const blend = metadata.blend
  if (!blend || blend.source !== 5 || blend.destination !== 10 || blend.sourceAlpha !== 5 || blend.destinationAlpha !== 10
    || blend.operation !== 0 || blend.operationAlpha !== 0) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has an unverified transparent blend state.')
  }
  const { extraction, forward, shadow } = assertDsfxMatcapShaderExtraction(metadata)
  if (!metadata.matcapShadowPass) throw new Error('DSFX/FX_SHADER_Matcap viewer material has no exact ShadowCaster metadata.')
  assertDsfxMatcapPass(metadata.matcapShadowPass, dsfxMatcapPassExpected.shadow, 'ShadowCaster metadata')
  if (metadata.matcapShadowPass !== shadow && JSON.stringify(metadata.matcapShadowPass) !== JSON.stringify(shadow)) {
    throw new Error('DSFX/FX_SHADER_Matcap viewer material has inconsistent ShadowCaster metadata.')
  }
  const { mainTex, matcapTex } = dsfxMatcapTextureBindings(metadata, baseMaterial)
  const forwardGeometry = dsfxMatcapPassGeometry(object, baseMaterial)
  const forwardMaterial = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} DSFX Matcap`,
    vertexShader: shaderStageSource(forward.glsl as string, 'VERTEX'),
    fragmentShader: shaderStageSource(forward.glsl as string, 'FRAGMENT'),
    uniforms: dsfxMatcapUniforms(metadata, mainTex, matcapTex), glslVersion: THREE.GLSL3,
    side: THREE.FrontSide, depthWrite: true, depthTest: true, depthFunc: THREE.LessEqualDepth,
    transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.SrcAlphaFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation, blendEquationAlpha: THREE.AddEquation,
    polygonOffset: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0, toneMapped: false, lights: false, fog: false,
  })
  forwardMaterial.userData.chibi = {
    adapterId: 'dsfx-matcap', renderPass: 'forward', textureProperty: '_Main_Tex', unlit: false, drawLayer: 'transparent',
    sourceShaderReference: metadata.sourceShaderReference, sourceMaterialReference: metadata.sourceMaterialReference,
    programHash: forward.programHash, matcapShaderExtraction: extraction, matcapMaterialProperties: metadata.matcapMaterialProperties,
    matcapTextures: metadata.matcapTextures, matcapShadowPass: shadow,
  }
  const previousObjectBeforeRender = object.onBeforeRender
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previousObjectBeforeRender.call(this, renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial === forwardMaterial) updateDsfxMatcapUniforms(forwardMaterial, object, camera)
  }
  return { forward: forwardMaterial, forwardGeometry, nonColorPasses: { shadow, shadowInstanced: extraction.passes!.shadowInstanced! } }
}

const MX_UNLIT_OUTLINE_SOURCE_REFERENCE = '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85:cab-38d7f184c16228480d78cd7ea10cae27:-8748270323205728420'
const MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256 = '91f6c05f3ea2768b13f3879bff7eb56fd28bd852aca89131caa3ddfec5ecf8ce'
const MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH = '8dd437bded36c20c116d416a2a3f679deb58b3249d887cfce6fbcfeaad94a24e'
const MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH = 'cf33765ab69ff40c91202ccb8b006211246685b6be23a41636cdf9de69bffde0'
const MX_UNLIT_OUTLINE_BASE_ATTRIBUTES = ['POSITION', 'TEXCOORD_0']
const MX_UNLIT_OUTLINE_OUTLINE_ATTRIBUTES = ['POSITION', 'TANGENT', 'COLOR_0', 'TEXCOORD_0']
const MX_UNLIT_OUTLINE_BASE_UNIFORMS = ['_MainTex_ST', '_Tint', '_MainTex']
const MX_UNLIT_OUTLINE_OUTLINE_UNIFORMS = [
  '_MainTex_ST', '_OutlineTint', '_OutlineZCorrection', '_MainTex', '_MainLightColor', '_ScreenParams',
  'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV', 'hlslcc_mtx4x4unity_MatrixVP',
]

const MX_C_TRANSPARENT_ST_SOURCE_REFERENCE = '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85:cab-38d7f184c16228480d78cd7ea10cae27:-5281742850669710733'
const MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256 = 'ff279d3985ac14ecb356f9ab863bb83b3b9d18033bfe897c877f8da866e6d345'
const MX_C_TRANSPARENT_ST_FINGERPRINT = '476551579a557a660da5fa3454da6f10193c729fef20430d4c905e8df0c7d7a5'
const MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH = 'a183c161a42534139176e57679b700599f385de97243d75ef719a70c0feea253'
const MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH = '8b65ba41e0b6f12e63d7d04c8eb017ac03a7962880f76474faea12cdcde319f9'
const MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH = '4ea792966bb7d8359234279f7e000ebea5c5a4fedd7a62ed819225f5186bae98'
const MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'COLOR_0', 'TEXCOORD_0'] as const
const MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES = ['POSITION'] as const
const MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS = [
  '_WorldSpaceCameraPos', '_MxCharShadowTone', '_MxCharLightData', '_Tint', '_ShadowThreshold', '_ShadowTint',
  '_Cutoff', '_RimAreaMultiplier', '_RimStrength', '_AdditionalLightStrength', '_AdditionalLightSharpness',
  '_GrayBrightness', '_MainTex_ST', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', '_DitherThreshold',
  '_MaskRtoG', '_MaskGSensitivity', '_SeeThroughMinValue', '_SeeThroughTransparency', '_SeeThroughSmoothness',
  '_GlobalMipBias', '_MxCharLightDir', '_MxCharLightTone', '_MainTex', '_MaskTex', 'hlslcc_mtx4x4unity_MatrixVP',
] as const
const MX_C_TRANSPARENT_ST_DITHER_UNIFORMS = [...MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS, '_ProjectionParams'] as const
const MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld'] as const

const PROJECT_MX_SOURCE_REFERENCE = '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c:cab-428091522b4007f213bf16532c4528a1:-2179428789015729742'
const PROJECT_MX_PROGRAM_BLOB_SHA256 = '962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b'
const PROJECT_MX_FINGERPRINT = 'dba2503cda8be6508b161525ab1202a9187f93c8924716efe6f3d061a4ff439b'
const PROJECT_MX_SHADER_NAME = 'ProjectMX/WeaponTest1Damage'
const PROJECT_MX_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  '_ADDITIONAL_LIGHTS', 'DEBUG_DISPLAY', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2', '_DAMAGE_0', '_GLOW_0',
  '_DITHER_HORIZONTAL_LINES', 'OUTLINE_RIM_LIGHT_POINT', 'OUTLINE_RIM_LIGHT_SPOT', '_GRAYSCALE_MODE',
  '_CHAR_CUTOUT_MODE',
] as const
const PROJECT_MX_REQUIRED_PROPERTIES = [
  '_DamageON', '_Color', '_mainTex', '_sourceTex', '_NoiseTex', '_CrushScale', '_NoiseDir', '_DmgCol',
  '_NoiseColStrong', '_Damage', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_ShadowThreshold',
  '_ShadowStrong', '_LightValue', '_LightStrong', '_SpecStrong', '_ShadowTint', '_SpecColor', '_FakeLightDir',
  '_AdditionalLightStrength', '_AdditionalLightSharpness', '_UseGlow', '_GlowMaskColor0', '_GlowStrictness0',
  '_GlowTint0', '_GlowStrength0', '_OutlineTint', '_OutlineSolidColorTint', '_CodeAddColor', '_CodeMultiplyColor',
  '_CodeAddRimColor', '_GrayBrightness', '_IsDither', '_DitherThreshold',
] as const
const PROJECT_MX_REQUIRED_TEXTURE_PROPERTIES = ['_mainTex', '_sourceTex'] as const
const PROJECT_MX_FORWARD_PROGRAM_HASH = '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0'
const PROJECT_MX_GLOW_PROGRAM_HASH = '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61'
const PROJECT_MX_OUTLINE_PROGRAM_HASH = 'a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703'
const PROJECT_MX_SOLID_OUTLINE_PROGRAM_HASH = 'caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2'
const PROJECT_MX_SHADOW_PROGRAM_HASH = 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0'
const PROJECT_MX_DEPTH_PROGRAM_HASH = '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513'
const PROJECT_MX_FORWARD_PROGRAM_RECORD_SHA256 = '6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab'
const PROJECT_MX_GLOW_PROGRAM_RECORD_SHA256 = '649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199'
const PROJECT_MX_OUTLINE_PROGRAM_RECORD_SHA256 = '476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026'
const PROJECT_MX_SOLID_OUTLINE_PROGRAM_RECORD_SHA256 = 'cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f'
const PROJECT_MX_SHADOW_PROGRAM_RECORD_SHA256 = '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46'
const PROJECT_MX_DEPTH_PROGRAM_RECORD_SHA256 = '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0'
const PROJECT_MX_FORWARD_PARAMETER_RECORD_SHA256 = '1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531'
const PROJECT_MX_GLOW_PARAMETER_RECORD_SHA256 = 'eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3'
const PROJECT_MX_OUTLINE_PARAMETER_RECORD_SHA256 = '93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9'
const PROJECT_MX_SOLID_OUTLINE_PARAMETER_RECORD_SHA256 = '81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e'
const PROJECT_MX_SHADOW_PARAMETER_RECORD_SHA256 = '7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35'
const PROJECT_MX_DEPTH_PARAMETER_RECORD_SHA256 = 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532'
const PROJECT_MX_PROGRAM_DATA_LENGTHS = { forward: 9117, glow: 9679, outline: 5141, solidOutline: 5384, shadow: 4273, depth: 2766 } as const
const PROJECT_MX_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0'] as const
const PROJECT_MX_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT', 'TEXCOORD_0'] as const
const PROJECT_MX_SOLID_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT'] as const
const PROJECT_MX_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'] as const
const PROJECT_MX_DEPTH_ATTRIBUTES = ['POSITION'] as const
const PROJECT_MX_FORWARD_UNIFORMS = [
  '_WorldSpaceCameraPos', 'hlslcc_mtx4x4unity_MatrixVP', '_MxCharShadowTone', '_ShadowTint', '_mainTex_ST',
  '_FakeLightDir', '_MxCharLightTone', '_MxCharLightData', '_ShadowThreshold', '_CodeAddColor',
  '_CodeMultiplyColor', '_CodeAddRimColor', '_Color', '_ShadowStrong', '_SpecColor', '_LightValue',
  '_LightStrong', '_SpecStrong', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_mainTex', '_sourceTex',
] as const
const PROJECT_MX_GLOW_UNIFORMS = [
  ...PROJECT_MX_FORWARD_UNIFORMS, '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0',
] as const
const PROJECT_MX_OUTLINE_UNIFORMS = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_OutlineTint', '_OutlineZCorrection', '_mainTex',
] as const
const PROJECT_MX_SOLID_OUTLINE_UNIFORMS = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_AdditionalLightSharpness', '_AdditionalLightStrength', '_OutlineTint',
  '_OutlineZCorrection', '_OutlineSolidColorTint', '_DitherThreshold',
] as const
const PROJECT_MX_SHADOW_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier'] as const
const PROJECT_MX_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP'] as const

const E_STANDARD_SOURCE_REFERENCE = '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c:cab-428091522b4007f213bf16532c4528a1:-8678996592869746170'
const E_STANDARD_PROGRAM_BLOB_SHA256 = 'b3edadb8e9c86afdab206cab761a0a574ee8e0baa75183cc24147a4e02ea1288'
const E_STANDARD_FINGERPRINT = 'a9a00b4141e350c6dd7611bcaa1fbcbadfe35dff202f41bf3fe5df2ce5124019'
const E_STANDARD_SHADER_NAME = 'MX/E-Standard'
const E_STANDARD_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
  '_RECEIVE_SHADOWS_OFF', 'DEBUG_DISPLAY', '_MAIN_LIGHT_SHADOWS', '_ADDITIONAL_LIGHTS', 'LIGHTMAP_ON',
  '_BAKED_PREFAB', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2', 'INSTANCING_ON', '_ENV_CUTOUT_MODE',
  '_ENV_ALPHA_MODE', '_ENV_REFLECT_MODE', '_ENV_EMISSION_MODE', '_ENV_SPECULAR_MODE', '_DYNAMIC_LIGHTS',
  '_UNLIT_CODEADDCOLOR', '_DEBUG_LIGHTMAP', '_SPECULAR_SETUP',
] as const
const E_STANDARD_REQUIRED_PROPERTIES = [
  '_Cutoff', '_PrefabLightmapTex', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha', '_ZWrite', '_Cull',
  '_ZOffsetFactor', '_ZOffsetUnits', '_Color', '_MainTex', '_ReflectTex', '_ReflectBaseAmount', '_ReflectAnglePower',
  '_ShadowAttenRefl', '_ReflectStrength', '_EmissionTex', '_EmissionStrength', '_SpecTex', '_SpecLightDir',
  '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec', '_LightmapStrength', '_CodeAddColor', '_CodeMultiplyColor',
  '_CodeAddRimColor',
] as const
const E_STANDARD_SOURCE_TEXTURE_PROPERTIES = ['_PrefabLightmapTex', '_MainTex', '_ReflectTex', '_EmissionTex', '_SpecTex'] as const
const E_STANDARD_REQUIRED_TEXTURE_PROPERTIES = ['_MainTex'] as const
const E_STANDARD_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0'] as const
const E_STANDARD_FORWARD_STATIC_UNIFORMS = [
  '_ProjectionParams', 'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
  'unity_SHAr', 'unity_SHAg', 'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', '_MainTex_ST', '_Color',
  '_Cutoff', '_PrefabLightmapTex_ST', '_ReflectTex_ST', '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl',
  '_ReflectStrength', '_EmissionStrength', '_SpecLightDir', '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec',
  '_LightmapStrength', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', '_GlobalMipBias', '_MainTex',
] as const
const E_STANDARD_FORWARD_DYNAMIC_UNIFORMS = [
  '_MainLightPosition', '_WorldSpaceCameraPos', ...E_STANDARD_FORWARD_STATIC_UNIFORMS, '_MainLightColor',
] as const
const E_STANDARD_SHADOW_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject'] as const
const E_STANDARD_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject'] as const
const E_STANDARD_META_UNIFORMS = [
  'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', '_MainTex_ST', '_Color',
  '_Cutoff', '_PrefabLightmapTex_ST', '_ReflectTex_ST', '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl',
  '_ReflectStrength', '_EmissionStrength', '_SpecLightDir', '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec',
  '_LightmapStrength', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', 'unity_OneOverOutputBoost', 'unity_MaxOutputValue',
  'unity_MetaVertexControl', 'unity_MetaFragmentControl', 'unity_VisualizationMode', '_GlobalMipBias', '_MainTex',
] as const
const E_STANDARD_FORWARD_STATIC_PROGRAM_HASH = 'cfd7db48ce454d347374b95768908b6c27e267c7c3812643b2162cff8ccc078b'
const E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH = 'ba83d0d99dbb57507bc8fb0f423304c93b59a6c1703aa4f775f0fd6020fd3cf8'
const E_STANDARD_SHADOW_PROGRAM_HASH = 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0'
const E_STANDARD_DEPTH_PROGRAM_HASH = '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513'
const E_STANDARD_META_PROGRAM_HASH = 'f1ac8ee9712bdf61db2946f3759d2bc6bf3e3f046ee76f9f2891521f84cb4201'
const E_STANDARD_FORWARD_STATIC_RECORD_SHA256 = '6c8c8c189fa4171c300d1c23e270155b10999851bb1ab1dd6df96c5c1fb17c78'
const E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256 = '034d968d7b7778638f25e050f5ab099098afb32688543b8d41e77dd112063d6f'
const E_STANDARD_SHADOW_RECORD_SHA256 = '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46'
const E_STANDARD_DEPTH_RECORD_SHA256 = '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0'
const E_STANDARD_META_RECORD_SHA256 = '551fed3636dc25ca1923b2d081b1c2a63ce5cb129433e640a21892c6a625641f'
const E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256 = 'f88facd27e428382fd81071a1bbd4f366583363e315d520319f0a8a4bb2e0389'
const E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256 = '86bcf1ab50b14c400c719927e0ead152e358475297170daebeceadc06d46bfb6'
const E_STANDARD_SHADOW_PARAMETER_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17'
const E_STANDARD_DEPTH_PARAMETER_SHA256 = '18defb46cf7eb1e1646d318f215cc2eaa29fa06411690ba443cade9de3be4181'
const E_STANDARD_META_PARAMETER_SHA256 = 'f3597fa2708ab4924492304ff8dcfd3a7271f291c931e74d1b1a480634ac4220'

function profileReferenceKey(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const reference = value as { bundleSha256?: unknown; serializedFile?: unknown; objectId?: unknown }
  return `${String(reference.bundleSha256 ?? '').toLowerCase()}:${String(reference.serializedFile ?? '').toLowerCase()}:${String(reference.objectId ?? '')}`
}

function finiteVector4(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(component => typeof component === 'number' && Number.isFinite(component))) {
    throw new Error(`MX/Unlit Outline viewer material has an invalid ${label}.`)
  }
  return new THREE.Vector4(value[0], value[1], value[2], value[3])
}

function exactArray(value: unknown, expected: readonly unknown[]) {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index])
}

function exactHash(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
}

function assertMxUnlitOutlinePass(pass: ChibiViewerShaderPassMetadata | undefined, expected: {
  pass: 'base' | 'outline'
  stateName: 'ForwardLit' | 'Outline'
  passIndex: number
  blobIndex: number
  programHash: string
  attributes: readonly string[]
  uniforms: readonly string[]
  culling: number
}) {
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
    || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
    || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== (expected.pass === 'base' ? 0 : 4)
    || !exactArray(pass.keywordIndices, []) || !exactArray(pass.keywordNames, [])
    || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash
    || !exactHash(pass.programRecordSha256) || !exactHash(pass.parameterRecordSha256)
    || typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es')
    || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')
    || !exactArray(pass.requiredAttributes, expected.attributes) || !exactArray(pass.requiredUniforms, expected.uniforms)
    || pass.renderState?.zWrite !== 1 || pass.renderState.zTest !== 4 || pass.renderState.culling !== expected.culling) {
    throw new Error(`MX/Unlit Outline viewer material has incomplete ${expected.pass} source pass metadata.`)
  }
  for (const attribute of expected.attributes) {
    const sourceName = attribute === 'POSITION' ? 'in_POSITION0'
      : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
        : attribute === 'TANGENT' ? 'in_TANGENT0' : 'in_COLOR0'
    if (!new RegExp(`\\bin\\b[\\s\\S]*\\b${sourceName}\\b`).test(pass.glsl)) {
      throw new Error(`MX/Unlit Outline viewer material source is missing ${attribute}.`)
    }
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`).test(pass.glsl)) {
      throw new Error(`MX/Unlit Outline viewer material source is missing ${uniform}.`)
    }
  }
}

function shaderStageSource(source: string, stage: 'VERTEX' | 'FRAGMENT') {
  const marker = `#ifdef ${stage}`
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`MX/Unlit Outline source has no ${stage.toLowerCase()} stage.`)
  const bodyStart = start + marker.length
  const end = stage === 'VERTEX'
    ? source.indexOf('\n#endif\n#ifdef FRAGMENT', bodyStart)
    : source.lastIndexOf('\n#endif')
  if (end < bodyStart) throw new Error(`MX/Unlit Outline source has an incomplete ${stage.toLowerCase()} stage.`)
  // Three prepends the WebGL2 version for GLSL3 materials.  Unity's generated
  // source also uses uniform blocks and explicit locations; disabling those
  // two optional wrappers keeps the recovered instructions byte-for-byte
  // intact while exposing ordinary uniforms to Three's WebGL uploader.
  return source.slice(bodyStart, end)
    .replace(/^\s*#version 300 es\s*/m, '')
    .replace('#define HLSLCC_ENABLE_UNIFORM_BUFFERS 1', '#define HLSLCC_ENABLE_UNIFORM_BUFFERS 0')
    .replace('#define UNITY_SUPPORTS_UNIFORM_LOCATION 1', '#define UNITY_SUPPORTS_UNIFORM_LOCATION 0')
}

export function sourceAttributeName(attribute: string) {
  if (attribute === 'POSITION') return 'in_POSITION0'
  if (attribute === 'NORMAL') return 'in_NORMAL0'
  if (attribute === 'TANGENT') return 'in_TANGENT0'
  if (attribute === 'COLOR_0') return 'in_COLOR0'
  if (attribute === 'TEXCOORD_0') return 'in_TEXCOORD0'
  if (attribute === 'TEXCOORD_1') return 'in_TEXCOORD1'
  if (attribute === 'TEXCOORD_2') return 'in_TEXCOORD2'
  throw new Error(`Chibi shader has an unknown source attribute ${attribute}.`)
}

function projectMxEscaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function assertProjectMxPass(pass: ChibiViewerShaderPassMetadata | undefined, expected: {
  pass: string
  stateName: string
  passIndex: number
  blobIndex: number
  parameterBlobIndex: number
  parameterRecordSha256: string
  programHash: string
  programRecordSha256: string
  programDataLength: number
  usesNoiseTexture: boolean
  keywords: readonly string[]
  keywordIndices: readonly number[]
  attributes: readonly string[]
  uniforms: readonly string[]
  culling: number
  colorMask: number
}, label: string) {
  const state = pass?.renderState
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
    || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
    || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
    || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, expected.keywordIndices)
    || !exactArray(pass.keywordNames, expected.keywords) || pass.programHash !== expected.programHash
    || pass.programDataSha256 !== expected.programHash || pass.programDataLength !== expected.programDataLength
    || pass.usesNoiseTexture !== expected.usesNoiseTexture || pass.programRecordSha256 !== expected.programRecordSha256
    || typeof pass.glsl !== 'string' || !exactArray(pass.requiredAttributes, expected.attributes)
    || !exactArray(pass.requiredUniforms, expected.uniforms) || state?.zWrite !== 1 || state.zTest !== 4
    || state.culling !== expected.culling || state.colorMask !== expected.colorMask
    || state.sourceBlend !== 1 || state.destinationBlend !== 0
    || state.sourceBlendAlpha !== 1 || state.destinationBlendAlpha !== 0
    || state.blendOperation !== 0 || state.blendOperationAlpha !== 0) {
    throw new Error(`ProjectMX/WeaponTest1Damage viewer material has incomplete or tampered ${label} source pass metadata.`)
  }
  const glsl = pass.glsl
  if (!glsl.includes('#version 300 es') || !glsl.includes('#ifdef VERTEX') || !glsl.includes('#ifdef FRAGMENT')) {
    throw new Error(`ProjectMX/WeaponTest1Damage ${label} has no complete canonical GLES3 GLSL source.`)
  }
  for (const attribute of expected.attributes) {
    const sourceName = sourceAttributeName(attribute)
    if (!new RegExp(`\\bin\\b[\\s\\S]*\\b${projectMxEscaped(sourceName)}\\b`).test(glsl)) {
      throw new Error(`ProjectMX/WeaponTest1Damage ${label} source is missing ${attribute}.`)
    }
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${projectMxEscaped(uniform)}\\b`).test(glsl)) {
      throw new Error(`ProjectMX/WeaponTest1Damage ${label} source is missing ${uniform}.`)
    }
  }
}

function assertProjectMxShaderExtraction(metadata: ChibiViewerMaterialMetadata) {
  const extraction = metadata.projectMxShaderExtraction
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || extraction.unityVersion !== '2021.3' || extraction.fingerprint !== PROJECT_MX_FINGERPRINT
    || extraction.compressedBlobSha256 !== PROJECT_MX_PROGRAM_BLOB_SHA256
    || profileReferenceKey(extraction.sourceReference) !== PROJECT_MX_SOURCE_REFERENCE
    || extraction.shaderName !== PROJECT_MX_SHADER_NAME || !exactArray(extraction.shaderKeywordNames, PROJECT_MX_SHADER_KEYWORDS)
    || !exactArray(extraction.requiredProperties, PROJECT_MX_REQUIRED_PROPERTIES)
    || !exactArray(extraction.requiredTextureProperties, PROJECT_MX_REQUIRED_TEXTURE_PROPERTIES)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has no exact source extraction metadata.')
  }
  const activeVariant = extraction.activeVariant
  if (activeVariant !== 'forward' && activeVariant !== 'glow') {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has an unknown source keyword variant.')
  }
  const verifiedVariant: 'forward' | 'glow' = activeVariant
  const expectedActiveKeywords = verifiedVariant === 'glow' ? ['_GLOW_0'] : []
  if (!exactArray(extraction.activeKeywordNames, expectedActiveKeywords)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has an unknown source keyword variant.')
  }
  const passes = extraction.passes
  if (!passes) throw new Error('ProjectMX/WeaponTest1Damage viewer material has no source pass metadata.')
  assertProjectMxPass(passes.forward, {
    pass: 'forward', stateName: 'ForwardLit', passIndex: 0, blobIndex: 32, parameterBlobIndex: 0,
    parameterRecordSha256: PROJECT_MX_FORWARD_PARAMETER_RECORD_SHA256, programHash: PROJECT_MX_FORWARD_PROGRAM_HASH,
    programRecordSha256: PROJECT_MX_FORWARD_PROGRAM_RECORD_SHA256, programDataLength: PROJECT_MX_PROGRAM_DATA_LENGTHS.forward,
    usesNoiseTexture: false, keywords: [], keywordIndices: [],
    attributes: PROJECT_MX_FORWARD_ATTRIBUTES, uniforms: PROJECT_MX_FORWARD_UNIFORMS, culling: 2, colorMask: 15,
  }, 'ForwardLit no-keyword')
  assertProjectMxPass(passes.glow, {
    pass: 'glow', stateName: 'ForwardLit', passIndex: 0, blobIndex: 34, parameterBlobIndex: 2,
    parameterRecordSha256: PROJECT_MX_GLOW_PARAMETER_RECORD_SHA256, programHash: PROJECT_MX_GLOW_PROGRAM_HASH,
    programRecordSha256: PROJECT_MX_GLOW_PROGRAM_RECORD_SHA256, programDataLength: PROJECT_MX_PROGRAM_DATA_LENGTHS.glow,
    usesNoiseTexture: false, keywords: ['_GLOW_0'], keywordIndices: [10],
    attributes: PROJECT_MX_FORWARD_ATTRIBUTES, uniforms: PROJECT_MX_GLOW_UNIFORMS, culling: 2, colorMask: 15,
  }, 'ForwardLit _GLOW_0')
  assertProjectMxPass(passes.outline, {
    pass: 'outline', stateName: 'Outline', passIndex: 1, blobIndex: 104, parameterBlobIndex: 80,
    parameterRecordSha256: PROJECT_MX_OUTLINE_PARAMETER_RECORD_SHA256, programHash: PROJECT_MX_OUTLINE_PROGRAM_HASH,
    programRecordSha256: PROJECT_MX_OUTLINE_PROGRAM_RECORD_SHA256, programDataLength: PROJECT_MX_PROGRAM_DATA_LENGTHS.outline,
    usesNoiseTexture: false, keywords: [], keywordIndices: [],
    attributes: PROJECT_MX_OUTLINE_ATTRIBUTES, uniforms: PROJECT_MX_OUTLINE_UNIFORMS, culling: 1, colorMask: 15,
  }, 'Outline')
  assertProjectMxPass(passes.solidOutline, {
    pass: 'solidOutline', stateName: 'Solid Color Outline', passIndex: 2, blobIndex: 180, parameterBlobIndex: 176,
    parameterRecordSha256: PROJECT_MX_SOLID_OUTLINE_PARAMETER_RECORD_SHA256, programHash: PROJECT_MX_SOLID_OUTLINE_PROGRAM_HASH,
    programRecordSha256: PROJECT_MX_SOLID_OUTLINE_PROGRAM_RECORD_SHA256, programDataLength: PROJECT_MX_PROGRAM_DATA_LENGTHS.solidOutline,
    usesNoiseTexture: false, keywords: [], keywordIndices: [],
    attributes: PROJECT_MX_SOLID_OUTLINE_ATTRIBUTES, uniforms: PROJECT_MX_SOLID_OUTLINE_UNIFORMS, culling: 1, colorMask: 15,
  }, 'Solid Color Outline')
  assertProjectMxPass(passes.shadow, {
    pass: 'shadow', stateName: 'ShadowCaster', passIndex: 3, blobIndex: 193, parameterBlobIndex: 192,
    parameterRecordSha256: PROJECT_MX_SHADOW_PARAMETER_RECORD_SHA256, programHash: PROJECT_MX_SHADOW_PROGRAM_HASH,
    programRecordSha256: PROJECT_MX_SHADOW_PROGRAM_RECORD_SHA256, programDataLength: PROJECT_MX_PROGRAM_DATA_LENGTHS.shadow,
    usesNoiseTexture: false, keywords: [], keywordIndices: [],
    attributes: PROJECT_MX_SHADOW_ATTRIBUTES, uniforms: PROJECT_MX_SHADOW_UNIFORMS, culling: 2, colorMask: 15,
  }, 'ShadowCaster')
  assertProjectMxPass(passes.depth, {
    pass: 'depth', stateName: 'DepthOnly', passIndex: 4, blobIndex: 195, parameterBlobIndex: 194,
    parameterRecordSha256: PROJECT_MX_DEPTH_PARAMETER_RECORD_SHA256, programHash: PROJECT_MX_DEPTH_PROGRAM_HASH,
    programRecordSha256: PROJECT_MX_DEPTH_PROGRAM_RECORD_SHA256, programDataLength: PROJECT_MX_PROGRAM_DATA_LENGTHS.depth,
    usesNoiseTexture: false, keywords: [], keywordIndices: [],
    attributes: PROJECT_MX_DEPTH_ATTRIBUTES, uniforms: PROJECT_MX_DEPTH_UNIFORMS, culling: 2, colorMask: 0,
  }, 'DepthOnly')
  return { extraction, activeVariant: verifiedVariant, passes }
}

function assertEStandardPass(pass: ChibiViewerShaderPassMetadata | undefined, expected: {
  pass: string; stateName: string; passIndex: number; blobIndex: number; parameterBlobIndex: number
  parameterRecordSha256: string; programHash: string; programRecordSha256: string; programDataLength: number
  keywords: readonly string[]; keywordIndices: readonly number[]; attributes: readonly string[]; uniforms: readonly string[]
  state: Record<string, unknown>
}, label: string) {
  const state = pass?.renderState
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.passName !== ''
    || pass.subShaderIndex !== 0 || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9
    || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
    || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, expected.keywordIndices)
    || !exactArray(pass.keywordNames, expected.keywords) || pass.programHash !== expected.programHash
    || pass.programDataSha256 !== expected.programHash || pass.programRecordSha256 !== expected.programRecordSha256
    || pass.programDataLength !== expected.programDataLength || typeof pass.glsl !== 'string'
    || !exactArray(pass.requiredAttributes, expected.attributes) || !exactArray(pass.requiredUniforms, expected.uniforms)
    || !state || Object.entries(expected.state).some(([key, value]) => state[key as keyof typeof state] !== value)) {
    throw new Error(`MX/E-Standard viewer material has incomplete or tampered ${label} source pass metadata.`)
  }
  if (!pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')) {
    throw new Error(`MX/E-Standard ${label} has no complete canonical GLES3 GLSL source.`)
  }
  for (const attribute of expected.attributes) {
    const name = sourceAttributeName(attribute)
    if (!new RegExp(`\\bin\\b[\\s\\S]*\\b${projectMxEscaped(name)}\\b`).test(pass.glsl)) throw new Error(`MX/E-Standard ${label} source is missing ${attribute}.`)
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${projectMxEscaped(uniform)}\\b`).test(pass.glsl)) throw new Error(`MX/E-Standard ${label} source is missing ${uniform}.`)
  }
}

function eStandardPassState(pass: 'forward' | 'depth' | 'shadow' | 'meta') {
  const forward = pass === 'forward'
  return forward
    ? { zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 0, sourceBlendProperty: '_SrcBlend', destinationBlend: 0, destinationBlendProperty: '_DstBlend', sourceBlendAlpha: 0, sourceBlendAlphaProperty: '_SrcBlendAlpha', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '_DstBlendAlpha', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor', offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits' }
    : { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: pass === 'meta' ? '<noninit>' : '_Cull', sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>', sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>', blendOperation: 0, blendOperationAlpha: 0, colorMask: pass === 'depth' ? 0 : 15, depthOnly: pass === 'depth', offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>' }
}

function eStandardProperties(metadata: ChibiViewerMaterialMetadata): ChibiViewerEStandardMaterialProperties {
  const properties = metadata.eStandardMaterialProperties
  if (!properties || typeof properties !== 'object') throw new Error('MX/E-Standard viewer material has no exact source material properties.')
  return properties
}

function eStandardNumber(properties: ChibiViewerEStandardMaterialProperties, name: string, fallback = 0) {
  const raw = properties.floats?.[name] ?? properties.ints?.[name]
  const value = raw === undefined ? fallback : Number(raw)
  if (!Number.isFinite(value)) throw new Error(`MX/E-Standard viewer material is missing exact ${name}.`)
  return value
}

function eStandardVector(properties: ChibiViewerEStandardMaterialProperties, name: string, fallback?: THREE.Vector4) {
  const value = properties.colors?.[name]
  if (!value || typeof value !== 'object') {
    if (fallback) return fallback.clone()
    throw new Error(`MX/E-Standard viewer material is missing exact ${name}.`)
  }
  const components = [value.r, value.g, value.b, value.a ?? 1].map(Number)
  if (!components.every(Number.isFinite)) throw new Error(`MX/E-Standard viewer material has invalid ${name}.`)
  return new THREE.Vector4(components[0], components[1], components[2], components[3])
}

function eStandardTextureBindings(metadata: ChibiViewerMaterialMetadata, baseMaterial: THREE.Material) {
  const binding = metadata.eStandardTextures?.mainTex
  if (!binding || typeof binding.index !== 'number' || !Number.isInteger(binding.index) || binding.index < 0) throw new Error('MX/E-Standard viewer material has no exact _MainTex binding.')
  const texture = (baseMaterial.userData as { chibiEStandardTextures?: { mainTex?: unknown } }).chibiEStandardTextures?.mainTex
  if (!(texture instanceof THREE.Texture)) throw new Error('MX/E-Standard viewer material has no exact _MainTex texture.')
  return { mainTex: texture }
}

function eStandardUniforms(metadata: ChibiViewerMaterialMetadata, mainTex: THREE.Texture, activeVariant: 'static' | 'dynamic') {
  const properties = eStandardProperties(metadata)
  const color3 = (name: string) => {
    const value = eStandardVector(properties, name)
    return new THREE.Vector3(value.x, value.y, value.z)
  }
  const identity = new THREE.Matrix4()
  const uniforms: Record<string, { value: unknown }> = {
    _ProjectionParams: { value: new THREE.Vector4(1, 1, 0, 0) },
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_WorldToObject: { value: matrixVectorArray(identity) },
    unity_SHAr: { value: new THREE.Vector4() }, unity_SHAg: { value: new THREE.Vector4() }, unity_SHAb: { value: new THREE.Vector4() },
    unity_SHBr: { value: new THREE.Vector4() }, unity_SHBg: { value: new THREE.Vector4() }, unity_SHBb: { value: new THREE.Vector4() }, unity_SHC: { value: new THREE.Vector4() },
    _MainTex_ST: { value: new THREE.Vector4(mainTex.repeat.x, mainTex.repeat.y, mainTex.offset.x, mainTex.offset.y) },
    _Color: { value: eStandardVector(properties, '_Color') },
    _Cutoff: { value: eStandardNumber(properties, '_Cutoff', 0.5) },
    _PrefabLightmapTex_ST: { value: new THREE.Vector4(1, 1, 0, 0) }, _ReflectTex_ST: { value: new THREE.Vector4(1, 1, 0, 0) },
    _ReflectBaseAmount: { value: eStandardNumber(properties, '_ReflectBaseAmount') }, _ReflectAnglePower: { value: eStandardNumber(properties, '_ReflectAnglePower') },
    _ShadowAttenRefl: { value: eStandardNumber(properties, '_ShadowAttenRefl') }, _ReflectStrength: { value: eStandardNumber(properties, '_ReflectStrength') },
    _EmissionStrength: { value: eStandardNumber(properties, '_EmissionStrength') }, _SpecLightDir: { value: color3('_SpecLightDir') }, _SpecLightColor: { value: color3('_SpecLightColor') },
    _SpecPower: { value: eStandardNumber(properties, '_SpecPower') }, _ShadowAttenSpec: { value: eStandardNumber(properties, '_ShadowAttenSpec') }, _LightmapStrength: { value: eStandardNumber(properties, '_LightmapStrength') },
    _CodeAddColor: { value: color3('_CodeAddColor') }, _CodeMultiplyColor: { value: color3('_CodeMultiplyColor') }, _CodeAddRimColor: { value: color3('_CodeAddRimColor') },
    _GlobalMipBias: { value: new THREE.Vector2() }, _MainTex: { value: mainTex },
  }
  if (activeVariant === 'dynamic') {
    uniforms._MainLightPosition = { value: new THREE.Vector4(0, 0, 1, 0) }
    uniforms._WorldSpaceCameraPos = { value: new THREE.Vector3() }
    uniforms._MainLightColor = { value: new THREE.Vector4(1, 1, 1, 1) }
  }
  return uniforms
}

export function updateEStandardUniforms(material: THREE.RawShaderMaterial, object: THREE.Object3D, scene: THREE.Scene, camera: THREE.Camera) {
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const viewProjection = new THREE.Matrix4().copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)
  const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_WorldToObject.value, worldToObject)
  const projection = uniforms._ProjectionParams?.value as THREE.Vector4 | undefined
  if (projection) {
    const perspective = camera as THREE.PerspectiveCamera
    projection.set(1, camera.projectionMatrix.elements[5] >= 0 ? 1 : -1, perspective.near, perspective.far)
  }
  const cameraPosition = uniforms._WorldSpaceCameraPos?.value as THREE.Vector3 | undefined
  if (cameraPosition) camera.getWorldPosition(cameraPosition)
  let light: THREE.DirectionalLight | undefined
  scene.traverse((child) => { if (!light && child instanceof THREE.DirectionalLight) light = child })
  if (light) {
    const position = light.getWorldPosition(new THREE.Vector3())
    const objectPosition = object.getWorldPosition(new THREE.Vector3())
    const direction = uniforms._MainLightPosition?.value as THREE.Vector4 | undefined
    if (direction) direction.set(position.x - objectPosition.x, position.y - objectPosition.y, position.z - objectPosition.z, 0).normalize()
    const color = uniforms._MainLightColor?.value as THREE.Vector4 | undefined
    if (color) color.set(light.color.r, light.color.g, light.color.b, light.intensity)
  }
  const mainTex = uniforms._MainTex.value as THREE.Texture
  ;(uniforms._MainTex_ST.value as THREE.Vector4).set(mainTex.repeat.x, mainTex.repeat.y, mainTex.offset.x, mainTex.offset.y)
}

function eStandardPassGeometry(object: THREE.Mesh, baseMaterial: THREE.Material) {
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('MX/E-Standard source material is not bound to its source primitive.')
  if (Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('MX/E-Standard source primitive group is missing.')
    geometry.clearGroups(); groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  ensureSourceAttribute(geometry, 'POSITION', 'position', 'in_POSITION0', 3)
  ensureSourceAttribute(geometry, 'NORMAL', 'normal', 'in_NORMAL0', 3)
  ensureSourceAttribute(geometry, 'TEXCOORD_0', 'uv', 'in_TEXCOORD0', 2)
  return geometry
}

function assertEStandardShaderExtraction(metadata: ChibiViewerMaterialMetadata) {
  const extraction = metadata.eStandardShaderExtraction
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
    || extraction.fingerprint !== E_STANDARD_FINGERPRINT || extraction.compressedBlobSha256 !== E_STANDARD_PROGRAM_BLOB_SHA256
    || profileReferenceKey(extraction.sourceReference) !== E_STANDARD_SOURCE_REFERENCE || extraction.shaderName !== E_STANDARD_SHADER_NAME
    || !exactArray(extraction.shaderKeywordNames, E_STANDARD_SHADER_KEYWORDS) || !exactArray(extraction.requiredProperties, E_STANDARD_REQUIRED_PROPERTIES)
    || !exactArray(extraction.sourceTextureProperties, E_STANDARD_SOURCE_TEXTURE_PROPERTIES) || !exactArray(extraction.requiredTextureProperties, E_STANDARD_REQUIRED_TEXTURE_PROPERTIES)) {
    throw new Error('MX/E-Standard viewer material has no exact source extraction metadata.')
  }
  const activeVariant = extraction.activeVariant
  if (activeVariant !== 'static' && activeVariant !== 'dynamic') throw new Error('MX/E-Standard viewer material has an unknown source keyword variant.')
  const expectedKeywords = activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS'] : []
  if (!exactArray(extraction.activeKeywordNames, expectedKeywords)) throw new Error('MX/E-Standard viewer material has an invalid active source keyword set.')
  const forwardStatic = extraction.passes?.forwardStatic
  const forwardDynamic = extraction.passes?.forwardDynamic
  const forward = extraction.passes?.forward
  assertEStandardPass(forwardStatic, { pass: 'forwardStatic', stateName: 'ForwardLit', passIndex: 0, blobIndex: 160, parameterBlobIndex: 0, parameterRecordSha256: E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256, programHash: E_STANDARD_FORWARD_STATIC_PROGRAM_HASH, programRecordSha256: E_STANDARD_FORWARD_STATIC_RECORD_SHA256, programDataLength: 7132, keywords: [], keywordIndices: [], attributes: E_STANDARD_FORWARD_ATTRIBUTES, uniforms: E_STANDARD_FORWARD_STATIC_UNIFORMS, state: eStandardPassState('forward') }, 'static ForwardLit')
  assertEStandardPass(forwardDynamic, { pass: 'forwardDynamic', stateName: 'ForwardLit', passIndex: 0, blobIndex: 171, parameterBlobIndex: 4, parameterRecordSha256: E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, programHash: E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH, programRecordSha256: E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, programDataLength: 8112, keywords: ['_DYNAMIC_LIGHTS'], keywordIndices: [19], attributes: E_STANDARD_FORWARD_ATTRIBUTES, uniforms: E_STANDARD_FORWARD_DYNAMIC_UNIFORMS, state: eStandardPassState('forward') }, 'dynamic ForwardLit')
  assertEStandardPass(extraction.passes?.shadow, { pass: 'shadow', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312, parameterRecordSha256: E_STANDARD_SHADOW_PARAMETER_SHA256, programHash: E_STANDARD_SHADOW_PROGRAM_HASH, programRecordSha256: E_STANDARD_SHADOW_RECORD_SHA256, programDataLength: 4273, keywords: [], keywordIndices: [], attributes: ['POSITION', 'NORMAL'], uniforms: E_STANDARD_SHADOW_UNIFORMS, state: eStandardPassState('shadow') }, 'ShadowCaster')
  assertEStandardPass(extraction.passes?.depth, { pass: 'depth', stateName: 'DepthOnly', passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320, parameterRecordSha256: E_STANDARD_DEPTH_PARAMETER_SHA256, programHash: E_STANDARD_DEPTH_PROGRAM_HASH, programRecordSha256: E_STANDARD_DEPTH_RECORD_SHA256, programDataLength: 2766, keywords: [], keywordIndices: [], attributes: ['POSITION'], uniforms: E_STANDARD_DEPTH_UNIFORMS, state: eStandardPassState('depth') }, 'DepthOnly')
  assertEStandardPass(extraction.passes?.meta, { pass: 'meta', stateName: 'Meta', passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328, parameterRecordSha256: E_STANDARD_META_PARAMETER_SHA256, programHash: E_STANDARD_META_PROGRAM_HASH, programRecordSha256: E_STANDARD_META_RECORD_SHA256, programDataLength: 6928, keywords: [], keywordIndices: [], attributes: ['POSITION', 'TEXCOORD_0', 'TEXCOORD_1', 'TEXCOORD_2'], uniforms: E_STANDARD_META_UNIFORMS, state: eStandardPassState('meta') }, 'Meta')
  const expectedForward = activeVariant === 'dynamic' ? forwardDynamic : forwardStatic
  if (!forward || forward.programHash !== expectedForward?.programHash || forward.blobIndex !== expectedForward?.blobIndex) throw new Error('MX/E-Standard viewer material has an inconsistent active ForwardLit pass.')
  return { extraction, activeVariant, forward: expectedForward! }
}

export function isSkinCompatibleEStandardRenderer(object: THREE.Mesh) {
  if (!(object instanceof THREE.SkinnedMesh)) return false
  const geometry = object.geometry
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const uv = geometry.getAttribute('uv')
  const skinIndex = geometry.getAttribute('skinIndex')
  const skinWeight = geometry.getAttribute('skinWeight')
  const bones = object.skeleton?.bones
  if (!position || position.itemSize < 3 || !normal || normal.itemSize < 3 || !uv || uv.itemSize < 2
    || !skinIndex || skinIndex.itemSize !== 4 || !skinWeight || skinWeight.itemSize !== 4
    || skinIndex.count !== position.count || skinWeight.count !== position.count || !bones?.length
    || object.skeleton.boneInverses.length !== bones.length) {
    throw new Error('MX/E-Standard skinned renderer is missing exact source geometry, JOINTS_0/WEIGHTS_0, or skeleton data.')
  }
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    let totalWeight = 0
    for (let component = 0; component < 4; component += 1) {
      const weight = skinWeight.getComponent(vertex, component)
      const joint = skinIndex.getComponent(vertex, component)
      if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(joint)
        || weight > 0 && (!Number.isInteger(joint) || joint < 0 || joint >= bones.length)) {
        throw new Error('MX/E-Standard skinned renderer has invalid source skin influences.')
      }
      totalWeight += weight
    }
    if (!(totalWeight > 0)) throw new Error('MX/E-Standard skinned renderer has an unweighted source vertex.')
  }
  return true
}

/**
 * Build the source-selected ForwardLit draw for MX/E-Standard. ShadowCaster,
 * DepthOnly, and Meta remain exact metadata on the returned material because
 * the viewer currently has no scheduler for Unity's non-color passes.
 */
export function createMxEStandardPass(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'mx-e-standard') return null
  if (profileReferenceKey(metadata.sourceShaderReference) !== E_STANDARD_SOURCE_REFERENCE) {
    throw new Error('MX/E-Standard viewer material has an unverified source shader identity.')
  }
  const { extraction, activeVariant, forward } = assertEStandardShaderExtraction(metadata)
  const properties = eStandardProperties(metadata)
  const keywords = properties.keywords
  const expectedKeywords = activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS', '_SPECULAR_SETUP'] : ['_SPECULAR_SETUP']
  if (!exactArray(keywords, expectedKeywords)) throw new Error('MX/E-Standard viewer material has unsupported source keywords.')
  eStandardVector(properties, '_Color')
  for (const name of ['_SpecLightDir', '_SpecLightColor', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor']) {
    eStandardVector(properties, name)
  }
  for (const name of ['_Cutoff', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha', '_ZWrite', '_Cull',
    '_ZOffsetFactor', '_ZOffsetUnits', '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength',
    '_EmissionStrength', '_SpecPower', '_ShadowAttenSpec', '_LightmapStrength']) {
    eStandardNumber(properties, name, name === '_Cutoff' ? 0.5 : 0)
  }
  const textures = eStandardTextureBindings(metadata, baseMaterial)
  const nonColorPasses = { shadow: extraction.passes!.shadow!, depth: extraction.passes!.depth!, meta: extraction.passes!.meta! }
  if (isSkinCompatibleEStandardRenderer(object)) {
    return { forward: baseMaterial, forwardGeometry: object.geometry, nonColorPasses }
  }
  const forwardGeometry = eStandardPassGeometry(object, baseMaterial)
  const forwardMaterial = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} MX/E-Standard`,
    vertexShader: shaderStageSource(forward.glsl as string, 'VERTEX'),
    fragmentShader: shaderStageSource(forward.glsl as string, 'FRAGMENT'),
    uniforms: eStandardUniforms(metadata, textures.mainTex, activeVariant as 'static' | 'dynamic'),
    glslVersion: THREE.GLSL3,
    side: THREE.FrontSide,
    depthWrite: true,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    transparent: false,
    toneMapped: false,
    lights: false,
    fog: false,
  })
  forwardMaterial.userData.chibi = {
    adapterId: 'mx-e-standard',
    renderPass: 'forward',
    activeVariant,
    programHash: forward.programHash,
    sourceShaderReference: metadata.sourceShaderReference,
    eStandardShaderExtraction: extraction,
    eStandardNonColorPasses: nonColorPasses,
  }
  const previousObjectBeforeRender = object.onBeforeRender
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previousObjectBeforeRender.call(this, renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial === forwardMaterial) updateEStandardUniforms(forwardMaterial, object, scene, camera)
  }
  return { forward: forwardMaterial, forwardGeometry, nonColorPasses }
}

function ensureSourceAttribute(geometry: THREE.BufferGeometry, name: string, sourceName: string, targetName: string, minimumItemSize: number) {
  const attribute = geometry.getAttribute(sourceName)
  if (!attribute || attribute.itemSize < minimumItemSize) throw new Error(`MX/Unlit Outline geometry is missing ${name} with its source width.`)
  geometry.setAttribute(targetName, attribute)
}

function matrixVectorArray(matrix: THREE.Matrix4) {
  return new Float32Array(matrix.elements)
}

function setMatrixVectorArray(value: unknown, matrix: THREE.Matrix4) {
  if (!(value instanceof Float32Array) || value.length !== 16) throw new Error('MX/Unlit Outline viewer material has an invalid matrix uniform.')
  value.set(matrix.elements)
}

function createOutlineUniforms(texture: THREE.Texture, outlineTint: THREE.Vector4, zCorrection: number) {
  const identity = new THREE.Matrix4()
  return {
    _MainTex: { value: texture }, _MainTex_ST: { value: new THREE.Vector4(1, 1, 0, 0) },
    _Tint: { value: new THREE.Vector4(1, 1, 1, 1) }, _OutlineTint: { value: outlineTint },
    _OutlineZCorrection: { value: zCorrection }, _MainLightColor: { value: new THREE.Vector4(1, 1, 1, 1) },
    _ScreenParams: { value: new THREE.Vector4(1, 1, 1, 1) }, _GlobalMipBias: { value: new THREE.Vector2() },
    hlslcc_mtx4x4glstate_matrix_projection: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_MatrixInvV: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_WorldToObject: { value: matrixVectorArray(identity) },
  }
}

function updateOutlineUniforms(material: THREE.RawShaderMaterial, object: THREE.Object3D, renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const inverseView = camera.matrixWorldInverse
  const viewProjection = new THREE.Matrix4().copy(camera.projectionMatrix).multiply(inverseView).multiply(object.matrixWorld)
  const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4glstate_matrix_projection.value, camera.projectionMatrix)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixInvV.value, camera.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_WorldToObject.value, worldToObject)
  const size = renderer.getDrawingBufferSize(new THREE.Vector2())
  ;(uniforms._ScreenParams.value as THREE.Vector4).set(size.x, size.y, 1 + 1 / Math.max(size.x, 1), 1 + 1 / Math.max(size.y, 1))
  const map = uniforms._MainTex.value as THREE.Texture
  const st = uniforms._MainTex_ST.value as THREE.Vector4
  st.set(map.repeat.x, map.repeat.y, map.offset.x, map.offset.y)
}

function projectMxProperties(metadata: ChibiViewerMaterialMetadata) {
  const properties = metadata.projectMxMaterialProperties
  if (!properties) throw new Error('ProjectMX/WeaponTest1Damage viewer material has no exact source material properties.')
  return properties
}

function projectMxScalar(properties: ChibiViewerProjectMxMaterialProperties, name: string) {
  const raw = properties.floats?.[name] ?? properties.ints?.[name]
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`ProjectMX/WeaponTest1Damage viewer material is missing exact ${name}.`)
  return value
}

function projectMxOptionalScalar(properties: ChibiViewerProjectMxMaterialProperties, name: string) {
  const raw = properties.floats?.[name] ?? properties.ints?.[name]
  if (raw === undefined) return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`ProjectMX/WeaponTest1Damage viewer material is missing exact ${name}.`)
  return value
}

function projectMxColor(properties: ChibiViewerProjectMxMaterialProperties, name: string) {
  const value = properties.colors?.[name]
  if (!value || typeof value !== 'object') throw new Error(`ProjectMX/WeaponTest1Damage viewer material is missing exact ${name}.`)
  const components = [value.r, value.g, value.b, value.a ?? 1].map(Number)
  if (!components.every(Number.isFinite)) throw new Error(`ProjectMX/WeaponTest1Damage viewer material has invalid ${name}.`)
  return new THREE.Vector4(components[0], components[1], components[2], components[3])
}

function projectMxTextureBindings(metadata: ChibiViewerMaterialMetadata, baseMaterial: THREE.Material) {
  const bindings = metadata.projectMxTextures
  if (!bindings || typeof bindings !== 'object'
    || typeof bindings.mainTex?.index !== 'number' || !Number.isInteger(bindings.mainTex.index)
    || bindings.mainTex.index < 0
    || typeof bindings.sourceTex?.index !== 'number' || !Number.isInteger(bindings.sourceTex.index)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has incomplete exact _mainTex/_sourceTex bindings.')
  }
  if (bindings.sourceTex.index < 0) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has incomplete exact _mainTex/_sourceTex bindings.')
  }
  if (bindings.noiseTex !== undefined && bindings.noiseTex !== null
    && (typeof bindings.noiseTex.index !== 'number' || !Number.isInteger(bindings.noiseTex.index) || bindings.noiseTex.index < 0)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has an invalid inactive _NoiseTex binding.')
  }
  const textures = (baseMaterial.userData as {
    chibiProjectMxTextures?: { mainTex?: unknown; sourceTex?: unknown }
  }).chibiProjectMxTextures
  if (!(textures?.mainTex instanceof THREE.Texture)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has no exact _mainTex texture.')
  }
  if (!(textures?.sourceTex instanceof THREE.Texture)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has no exact _sourceTex texture.')
  }
  return { mainTex: textures.mainTex, sourceTex: textures.sourceTex }
}

function projectMxMatrixUniforms() {
  const identity = new THREE.Matrix4()
  return {
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_WorldToObject: { value: matrixVectorArray(identity) },
    // The recovered ForwardLit vertex stage evaluates Unity's ambient SH
    // terms.  Viewer has no source probe payload, so bind explicit neutral
    // values instead of leaving active GLSL uniforms undefined.
    unity_SHAr: { value: new THREE.Vector4() }, unity_SHAg: { value: new THREE.Vector4() }, unity_SHAb: { value: new THREE.Vector4() },
    unity_SHBr: { value: new THREE.Vector4() }, unity_SHBg: { value: new THREE.Vector4() }, unity_SHBb: { value: new THREE.Vector4() },
    unity_SHC: { value: new THREE.Vector4() },
  }
}

function projectMxUniforms(
  metadata: ChibiViewerMaterialMetadata,
  mainTex: THREE.Texture,
  sourceTex: THREE.Texture,
  activeVariant: 'forward' | 'glow',
) {
  const properties = projectMxProperties(metadata)
  const fakeLight = projectMxColor(properties, '_FakeLightDir')
  const sourceColor3 = (name: string) => {
    const color = projectMxColor(properties, name)
    return new THREE.Vector3(color.x, color.y, color.z)
  }
  const uniforms: Record<string, { value: unknown }> = {
    _WorldSpaceCameraPos: { value: new THREE.Vector3() },
    _MxCharShadowTone: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
    _ShadowTint: { value: projectMxColor(properties, '_ShadowTint') },
    _mainTex_ST: { value: new THREE.Vector4(mainTex.repeat.x, mainTex.repeat.y, mainTex.offset.x, mainTex.offset.y) },
    _FakeLightDir: { value: new THREE.Vector3(fakeLight.x, fakeLight.y, fakeLight.z) },
    _MxCharLightTone: { value: new THREE.Vector3(1, 1, 1) },
    _MxCharLightData: { value: new THREE.Vector4(1, 0, 0, 0) },
    _ShadowThreshold: { value: projectMxScalar(properties, '_ShadowThreshold') },
    _CodeAddColor: { value: sourceColor3('_CodeAddColor') },
    _CodeMultiplyColor: { value: sourceColor3('_CodeMultiplyColor') },
    _CodeAddRimColor: { value: sourceColor3('_CodeAddRimColor') },
    _Color: { value: projectMxColor(properties, '_Color') },
    _ShadowStrong: { value: projectMxScalar(properties, '_ShadowStrong') },
    _SpecColor: { value: projectMxColor(properties, '_SpecColor') },
    _LightValue: { value: projectMxScalar(properties, '_LightValue') },
    _LightStrong: { value: projectMxScalar(properties, '_LightStrong') },
    _SpecStrong: { value: projectMxScalar(properties, '_SpecStrong') },
    _FireCol: { value: projectMxColor(properties, '_FireCol') },
    _FireBackCol_Str: { value: projectMxScalar(properties, '_FireBackCol_Str') },
    _FireValue: { value: projectMxScalar(properties, '_FireValue') },
    _Fire: { value: projectMxScalar(properties, '_Fire') },
    _mainTex: { value: mainTex },
    _sourceTex: { value: sourceTex },
    ...projectMxMatrixUniforms(),
  }
  if (activeVariant === 'glow') {
    uniforms._GlowMaskColor0 = { value: sourceColor3('_GlowMaskColor0') }
    uniforms._GlowStrictness0 = { value: projectMxScalar(properties, '_GlowStrictness0') }
    uniforms._GlowTint0 = { value: sourceColor3('_GlowTint0') }
    uniforms._GlowStrength0 = { value: projectMxScalar(properties, '_GlowStrength0') }
  }
  return uniforms
}

function projectMxUpdateLightUniforms(
  uniforms: Record<string, { value: unknown }>,
  object: THREE.Object3D,
  scene: THREE.Scene,
) {
  let light: THREE.DirectionalLight | undefined
  scene.traverse((child) => { if (!light && child instanceof THREE.DirectionalLight) light = child })
  if (!light) return
  const lightPosition = light.getWorldPosition(new THREE.Vector3())
  const objectPosition = object.getWorldPosition(new THREE.Vector3())
  const direction = uniforms._MxCharLightDir?.value as THREE.Vector3 | undefined
  if (direction) direction.copy(lightPosition).sub(objectPosition).normalize()
  const tone = uniforms._MxCharLightTone?.value as THREE.Vector3 | undefined
  if (tone) tone.set(light.color.r, light.color.g, light.color.b).multiplyScalar(light.intensity)
  const main = uniforms._MainLightColor?.value as THREE.Vector4 | undefined
  if (main) main.set(light.color.r, light.color.g, light.color.b, light.intensity)
}

function updateProjectMxUniforms(
  material: THREE.RawShaderMaterial,
  object: THREE.Object3D,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
  const viewProjection = new THREE.Matrix4().copy((camera as THREE.PerspectiveCamera).projectionMatrix)
    .multiply(camera.matrixWorldInverse).multiply(object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_WorldToObject.value, worldToObject)
  camera.getWorldPosition(uniforms._WorldSpaceCameraPos.value as THREE.Vector3)
  projectMxUpdateLightUniforms(uniforms, object, scene)
  const mainTex = uniforms._mainTex.value as THREE.Texture
  ;(uniforms._mainTex_ST.value as THREE.Vector4).set(mainTex.repeat.x, mainTex.repeat.y, mainTex.offset.x, mainTex.offset.y)
}

function projectMxOutlineUniforms(mainTex: THREE.Texture, outlineTint: THREE.Vector4, zCorrection: number | undefined) {
  const uniforms: Record<string, { value: unknown }> = {
    _MainLightColor: { value: new THREE.Vector4(1, 1, 1, 1) },
    _ScreenParams: { value: new THREE.Vector4(1, 1, 1, 1) },
    hlslcc_mtx4x4glstate_matrix_projection: { value: matrixVectorArray(new THREE.Matrix4()) },
    hlslcc_mtx4x4unity_MatrixInvV: { value: matrixVectorArray(new THREE.Matrix4()) },
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(new THREE.Matrix4()) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(new THREE.Matrix4()) },
    hlslcc_mtx4x4unity_WorldToObject: { value: matrixVectorArray(new THREE.Matrix4()) },
    _OutlineTint: { value: outlineTint }, _mainTex: { value: mainTex },
  }
  // The exact ProjectMX source shader declares this uniform without a
  // corresponding source material property. Keep that source absence intact;
  // authored values are still bound when the source material contains one.
  if (zCorrection !== undefined) uniforms._OutlineZCorrection = { value: zCorrection }
  return uniforms
}

function updateProjectMxOutlineUniforms(
  material: THREE.RawShaderMaterial,
  object: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const inverseView = camera.matrixWorldInverse
  const viewProjection = new THREE.Matrix4().copy((camera as THREE.PerspectiveCamera).projectionMatrix)
    .multiply(inverseView).multiply(object.matrixWorld)
  const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4glstate_matrix_projection.value, camera.projectionMatrix)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixInvV.value, camera.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_WorldToObject.value, worldToObject)
  const size = renderer.getDrawingBufferSize(new THREE.Vector2())
  ;(uniforms._ScreenParams.value as THREE.Vector4).set(size.x, size.y, 1 + 1 / Math.max(size.x, 1), 1 + 1 / Math.max(size.y, 1))
  projectMxUpdateLightUniforms(uniforms, object, scene)
}

function projectMxPassGeometry(object: THREE.Mesh, baseMaterial: THREE.Material, attributes: readonly string[]) {
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('ProjectMX/WeaponTest1Damage source material is not bound to its source primitive.')
  if (Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('ProjectMX/WeaponTest1Damage source primitive group is missing.')
    geometry.clearGroups()
    groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  for (const attribute of attributes) {
    if (attribute === 'POSITION') ensureSourceAttribute(geometry, 'POSITION', 'position', 'in_POSITION0', 3)
    else if (attribute === 'NORMAL') ensureSourceAttribute(geometry, 'NORMAL', 'normal', 'in_NORMAL0', 3)
    else if (attribute === 'TANGENT') ensureSourceAttribute(geometry, 'TANGENT', 'tangent', 'in_TANGENT0', 4)
    else if (attribute === 'COLOR_0') ensureSourceAttribute(geometry, 'COLOR_0', 'color', 'in_COLOR0', 4)
    else if (attribute === 'TEXCOORD_0') ensureSourceAttribute(geometry, 'TEXCOORD_0', 'uv', 'in_TEXCOORD0', 2)
  }
  return geometry
}

/**
 * Build ProjectMX/WeaponTest1Damage's source-selected ForwardLit draw and
 * front-cull Outline child. Solid Color Outline, ShadowCaster, and DepthOnly
 * remain validated metadata on the forward material: Viewer has no separate
 * non-color pass scheduler, so creating visible meshes for them would change
 * source draw semantics.
 */
export function createProjectMxWeaponPasses(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'projectmx-weapon-test1-damage') return null
  const sourceReference = profileReferenceKey(metadata.sourceShaderReference)
  if (sourceReference !== PROJECT_MX_SOURCE_REFERENCE) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has an unverified source shader identity.')
  }
  const { extraction, activeVariant, passes } = assertProjectMxShaderExtraction(metadata)
  const properties = projectMxProperties(metadata)
  const keywords = properties.keywords
  const expectedKeywords = activeVariant === 'glow' ? ['_GLOW_0'] : []
  if (!exactArray(keywords, expectedKeywords)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has unsupported source keywords.')
  }
  if (projectMxScalar(properties, '_UseGlow') !== (activeVariant === 'glow' ? 1 : 0)) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has an unverified _UseGlow variant gate.')
  }
  for (const gate of ['_DamageON', '_Damage', '_Fire', '_IsDither']) {
    if (projectMxScalar(properties, gate) !== 0) {
      throw new Error(`ProjectMX/WeaponTest1Damage viewer material enables unsupported interactive ${gate} behavior.`)
    }
  }
  const textures = projectMxTextureBindings(metadata, baseMaterial)
  if (metadata.projectMxTextures?.noiseTex !== undefined && metadata.projectMxTextures.noiseTex !== null) {
    throw new Error('ProjectMX/WeaponTest1Damage viewer material has inactive _NoiseTex metadata.')
  }
  projectMxColor(properties, '_Color')
  const outlineTint = projectMxColor(properties, '_OutlineTint')
  projectMxColor(properties, '_OutlineSolidColorTint')
  const outlineZCorrection = projectMxOptionalScalar(properties, '_OutlineZCorrection')
  const forwardPass = activeVariant === 'glow' ? passes.glow! : passes.forward!
  const nonColorPasses = { solidOutline: passes.solidOutline!, shadow: passes.shadow!, depth: passes.depth! }

  // These exact ProjectMX color passes do not declare JOINTS_0/WEIGHTS_0 or
  // apply the source skin palette. Keep skinned core renderers on GLTFLoader's
  // skin-aware material/geometry rather than drawing an unposed duplicate.
  if (object instanceof THREE.SkinnedMesh) {
    return { forward: baseMaterial, outline: null, forwardGeometry: object.geometry, nonColorPasses }
  }

  const forwardGeometry = projectMxPassGeometry(object, baseMaterial, PROJECT_MX_FORWARD_ATTRIBUTES)
  const outlineGeometry = projectMxPassGeometry(object, baseMaterial, PROJECT_MX_OUTLINE_ATTRIBUTES)
  const forwardMaterial = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} ProjectMX WeaponTest1Damage`,
    vertexShader: shaderStageSource(forwardPass.glsl as string, 'VERTEX'),
    fragmentShader: shaderStageSource(forwardPass.glsl as string, 'FRAGMENT'),
    uniforms: projectMxUniforms(metadata, textures.mainTex, textures.sourceTex, activeVariant), glslVersion: THREE.GLSL3,
    side: THREE.FrontSide, depthWrite: true, depthTest: true, depthFunc: THREE.LessEqualDepth,
    transparent: false, toneMapped: false, lights: false, fog: false,
  })
  const outlineMaterial = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} ProjectMX WeaponTest1Damage Outline`,
    vertexShader: shaderStageSource(passes.outline!.glsl as string, 'VERTEX'),
    fragmentShader: shaderStageSource(passes.outline!.glsl as string, 'FRAGMENT'),
    uniforms: projectMxOutlineUniforms(textures.mainTex, outlineTint, outlineZCorrection), glslVersion: THREE.GLSL3,
    side: THREE.BackSide, depthWrite: true, depthTest: true, depthFunc: THREE.LessEqualDepth,
    transparent: false, toneMapped: false, lights: false, fog: false,
  })
  forwardMaterial.userData.chibi = {
    adapterId: 'projectmx-weapon-test1-damage', renderPass: 'forward', activeVariant,
    programHash: forwardPass.programHash, sourceShaderReference: metadata.sourceShaderReference,
    projectMxShaderExtraction: extraction, projectMxNonColorPasses: nonColorPasses,
  }
  outlineMaterial.userData.chibi = {
    adapterId: 'projectmx-weapon-test1-damage', renderPass: 'outline', activeVariant,
    programHash: passes.outline!.programHash, sourceShaderReference: metadata.sourceShaderReference,
    projectMxShaderExtraction: extraction, projectMxNonColorPasses: nonColorPasses,
  }
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial)
  outline.name = `${object.name || 'Mesh'}__ProjectMXWeaponTest1DamageOutline`
  outline.renderOrder = object.renderOrder + 0.001
  outline.frustumCulled = object.frustumCulled
  outline.layers.mask = object.layers.mask
  outline.userData.chibiOutlinePass = true
  outline.userData.chibiProjectMxOutlinePass = true
  const previousObjectBeforeRender = object.onBeforeRender
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previousObjectBeforeRender.call(this, renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial === forwardMaterial) updateProjectMxUniforms(forwardMaterial, object, scene, camera)
  }
  outline.onBeforeRender = (renderer, scene, camera) => updateProjectMxOutlineUniforms(outlineMaterial, outline, renderer, scene, camera)
  return { forward: forwardMaterial, outline, forwardGeometry, nonColorPasses }
}

/**
 * Create the source-derived second draw for MX/Unlit Outline.  The returned
 * Mesh is intentionally a child of the base Mesh: parent visibility and
 * transforms stay in lockstep, while the outline material executes after the
 * base draw with Unity's front-face culling/depth state.
 */
export function createMxUnlitOutlinePass(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'mx-unlit-outline') return null
  const sourceReference = profileReferenceKey(metadata.sourceShaderReference)
  if (sourceReference !== MX_UNLIT_OUTLINE_SOURCE_REFERENCE) throw new Error('MX/Unlit Outline viewer material has an unverified source shader identity.')
  const extraction = metadata.shaderExtraction
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || !exactHash(extraction.fingerprint) || extraction.compressedBlobSha256 !== MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256
    || profileReferenceKey(extraction.sourceReference) !== MX_UNLIT_OUTLINE_SOURCE_REFERENCE) {
    throw new Error('MX/Unlit Outline viewer material has no exact source extraction metadata.')
  }
  assertMxUnlitOutlinePass(extraction.passes?.base, {
    pass: 'base', stateName: 'ForwardLit', passIndex: 0, blobIndex: 1,
    programHash: MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, attributes: MX_UNLIT_OUTLINE_BASE_ATTRIBUTES,
    uniforms: MX_UNLIT_OUTLINE_BASE_UNIFORMS, culling: 0,
  })
  const outlinePass = extraction.passes?.outline ?? metadata.outlinePass ?? undefined
  if (!outlinePass) throw new Error('MX/Unlit Outline viewer material has no outline source pass.')
  assertMxUnlitOutlinePass(outlinePass, {
    pass: 'outline', stateName: 'Outline', passIndex: 1, blobIndex: 6,
    programHash: MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, attributes: MX_UNLIT_OUTLINE_OUTLINE_ATTRIBUTES,
    uniforms: MX_UNLIT_OUTLINE_OUTLINE_UNIFORMS, culling: 1,
  })
  const outlineTint = finiteVector4(metadata.outlineTint, '_OutlineTint')
  if (typeof metadata.outlineZCorrection !== 'number' || !Number.isFinite(metadata.outlineZCorrection)) {
    throw new Error('MX/Unlit Outline viewer material has an invalid _OutlineZCorrection.')
  }
  const map = (baseMaterial as THREE.MeshBasicMaterial).map
  if (!(map instanceof THREE.Texture)) throw new Error('MX/Unlit Outline viewer material has no exact _MainTex texture.')
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('MX/Unlit Outline base material is not bound to its source primitive.')
  if (Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('MX/Unlit Outline source primitive group is missing.')
    geometry.clearGroups()
    groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  ensureSourceAttribute(geometry, 'POSITION', 'position', 'in_POSITION0', 3)
  ensureSourceAttribute(geometry, 'TEXCOORD_0', 'uv', 'in_TEXCOORD0', 2)
  ensureSourceAttribute(geometry, 'TANGENT', 'tangent', 'in_TANGENT0', 4)
  ensureSourceAttribute(geometry, 'COLOR_0', 'color', 'in_COLOR0', 4)
  const uniforms = createOutlineUniforms(map, outlineTint, metadata.outlineZCorrection)
  const material = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} MX/Unlit Outline`,
    vertexShader: shaderStageSource(outlinePass.glsl as string, 'VERTEX'),
    fragmentShader: shaderStageSource(outlinePass.glsl as string, 'FRAGMENT'),
    uniforms,
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide,
    depthWrite: true,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    transparent: false,
  })
  material.userData.chibi = {
    adapterId: 'mx-unlit-outline', renderPass: 'outline', sourceShaderReference: metadata.sourceShaderReference,
    programHash: MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH,
  }
  const outline = new THREE.Mesh(geometry, material)
  outline.name = `${object.name || 'Mesh'}__MXUnlitOutline`
  outline.renderOrder = object.renderOrder + 0.001
  outline.frustumCulled = object.frustumCulled
  outline.layers.mask = object.layers.mask
  outline.userData.chibiOutlinePass = true
  outline.onBeforeRender = (renderer, _scene, camera) => updateOutlineUniforms(material, outline, renderer, camera)
  return outline
}

function transparentScalar(metadata: ChibiViewerMaterialMetadata, name: string) {
  const properties = metadata.transparentMaterialProperties
  const value = properties?.floats?.[name] ?? properties?.ints?.[name]
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`MX/C-Transparent-ST viewer material is missing exact ${name}.`)
  return number
}

function transparentColor(metadata: ChibiViewerMaterialMetadata, name: string) {
  const value = metadata.transparentMaterialProperties?.colors?.[name]
  if (!value) throw new Error(`MX/C-Transparent-ST viewer material is missing exact ${name}.`)
  const values = [value.r, value.g, value.b, value.a ?? 1].map(Number)
  if (!values.every(Number.isFinite)) throw new Error(`MX/C-Transparent-ST viewer material has invalid ${name}.`)
  return new THREE.Vector4(values[0], values[1], values[2], values[3])
}

function transparentSourceReference(value: unknown) {
  return profileReferenceKey(value)
}

function transparentMatrixUniforms() {
  const identity = new THREE.Matrix4()
  return {
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(identity) },
    hlslcc_mtx4x4unity_WorldToObject: { value: matrixVectorArray(identity) },
  }
}

function transparentUniforms(
  metadata: ChibiViewerMaterialMetadata,
  map: THREE.Texture,
  mask: THREE.Texture,
  dither: boolean,
) {
  const uniforms: Record<string, { value: unknown }> = {
    _WorldSpaceCameraPos: { value: new THREE.Vector3() },
    _MxCharShadowTone: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
    _MxCharLightData: { value: new THREE.Vector4(1, 0, 0, 0) },
    _Tint: { value: transparentColor(metadata, '_Tint') },
    _ShadowThreshold: { value: transparentScalar(metadata, '_ShadowThreshold') },
    _ShadowTint: { value: transparentColor(metadata, '_ShadowTint') },
    _Cutoff: { value: transparentScalar(metadata, '_Cutoff') },
    _RimAreaMultiplier: { value: transparentScalar(metadata, '_RimAreaMultiplier') },
    _RimStrength: { value: transparentScalar(metadata, '_RimStrength') },
    _AdditionalLightStrength: { value: transparentScalar(metadata, '_AdditionalLightStrength') },
    _AdditionalLightSharpness: { value: transparentScalar(metadata, '_AdditionalLightSharpness') },
    _GrayBrightness: { value: transparentScalar(metadata, '_GrayBrightness') },
    _MainTex_ST: { value: new THREE.Vector4(map.repeat.x, map.repeat.y, map.offset.x, map.offset.y) },
    _CodeAddColor: { value: transparentColor(metadata, '_CodeAddColor') },
    _CodeMultiplyColor: { value: transparentColor(metadata, '_CodeMultiplyColor') },
    _CodeAddRimColor: { value: transparentColor(metadata, '_CodeAddRimColor') },
    _DitherThreshold: { value: transparentScalar(metadata, '_DitherThreshold') },
    _MaskRtoG: { value: transparentScalar(metadata, '_MaskRtoG') },
    _MaskGSensitivity: { value: transparentScalar(metadata, '_MaskGSensitivity') },
    _SeeThroughMinValue: { value: transparentScalar(metadata, '_SeeThroughMinValue') },
    _SeeThroughTransparency: { value: transparentScalar(metadata, '_SeeThroughTransparency') },
    _SeeThroughSmoothness: { value: transparentScalar(metadata, '_SeeThroughSmoothness') },
    _GlobalMipBias: { value: new THREE.Vector2(0, 0) },
    _MxCharLightDir: { value: new THREE.Vector3(0, 1, 0) },
    _MxCharLightTone: { value: new THREE.Vector3(1, 1, 1) },
    _MainTex: { value: map },
    _MaskTex: { value: mask },
    ...transparentMatrixUniforms(),
  }
  if (dither) uniforms._ProjectionParams = { value: new THREE.Vector4(1, 0.01, 100, 0.01) }
  return uniforms
}

function updateTransparentUniforms(
  material: THREE.RawShaderMaterial,
  object: THREE.Object3D,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const worldToObject = new THREE.Matrix4().copy(object.matrixWorld).invert()
  const viewProjection = new THREE.Matrix4().copy((camera as THREE.PerspectiveCamera).projectionMatrix)
    .multiply(camera.matrixWorldInverse)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_MatrixVP.value, viewProjection)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value, object.matrixWorld)
  setMatrixVectorArray(uniforms.hlslcc_mtx4x4unity_WorldToObject.value, worldToObject)
  const cameraPosition = uniforms._WorldSpaceCameraPos.value as THREE.Vector3
  camera.getWorldPosition(cameraPosition)
  const light = scene.children.find((child): child is THREE.DirectionalLight => child instanceof THREE.DirectionalLight)
  const lightDirection = uniforms._MxCharLightDir.value as THREE.Vector3
  const lightTone = uniforms._MxCharLightTone.value as THREE.Vector3
  if (light) {
    const lightPosition = light.getWorldPosition(new THREE.Vector3())
    lightDirection.copy(lightPosition).sub(object.getWorldPosition(new THREE.Vector3())).normalize()
    lightTone.set(light.color.r, light.color.g, light.color.b).multiplyScalar(light.intensity)
  }
  if (uniforms._ProjectionParams) {
    const projection = uniforms._ProjectionParams.value as THREE.Vector4
    const perspective = camera as THREE.PerspectiveCamera
    projection.set(1, perspective.near, perspective.far, perspective.far > 0 ? 1 / perspective.far : 0)
  }
  const map = uniforms._MainTex.value as THREE.Texture
  ;(uniforms._MainTex_ST.value as THREE.Vector4).set(map.repeat.x, map.repeat.y, map.offset.x, map.offset.y)
  // The source adapter does not sample camera depth. Keep the source global
  // mip bias explicitly zero while allowing a renderer to update it later.
  ;(uniforms._GlobalMipBias.value as THREE.Vector2).set(0, 0)
  void renderer
}

function updateTransparentDepthUniforms(
  material: THREE.RawShaderMaterial,
  object: THREE.Object3D,
  camera: THREE.Camera,
) {
  const uniforms = material.uniforms as Record<string, { value: unknown }>
  const matrixVP = uniforms.hlslcc_mtx4x4unity_MatrixVP?.value
  const objectToWorld = uniforms.hlslcc_mtx4x4unity_ObjectToWorld?.value
  if (!(matrixVP instanceof Float32Array) || matrixVP.length !== 16
    || !(objectToWorld instanceof Float32Array) || objectToWorld.length !== 16) {
    throw new Error('MX/C-Transparent-ST depth pass is missing exact source matrix uniforms.')
  }
  const viewProjection = new THREE.Matrix4().copy(camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse)
  setMatrixVectorArray(matrixVP, viewProjection)
  setMatrixVectorArray(objectToWorld, object.matrixWorld)
}

function transparentSkinnedVertex(source: string, object: THREE.Mesh, normals: boolean) {
  if (!(object instanceof THREE.SkinnedMesh)) return source
  const main = source.indexOf('void main')
  const body = source.slice(main).replace(/\bin_POSITION0\b/g, 'chibiSkinnedPosition')
    .replace(/\bin_NORMAL0\b/g, 'chibiSkinnedNormal')
  return source.slice(0, main) + `
#define USE_SKINNING
in vec4 skinIndex;
in vec4 skinWeight;
#include <skinning_pars_vertex>
` + body.replace(/(void main\s*\([^)]*\)\s*\{)/, `$1
#include <skinbase_vertex>
vec3 transformed = in_POSITION0.xyz;
#include <skinning_vertex>
vec4 chibiSkinnedPosition = vec4(transformed, in_POSITION0.w);
${normals ? `vec3 objectNormal = in_NORMAL0;
#include <skinnormal_vertex>
vec3 chibiSkinnedNormal = objectNormal;` : ''}
`)
}

function transparentPassGeometry(object: THREE.Mesh, baseMaterial: THREE.Material, attributes: readonly string[], filterGroups: boolean) {
  const geometry = object.geometry.clone()
  const originalMaterial = object.material
  const materialIndex = Array.isArray(originalMaterial) ? originalMaterial.indexOf(baseMaterial) : 0
  if (materialIndex < 0) throw new Error('MX/C-Transparent-ST base material is not bound to its source primitive.')
  if (filterGroups && Array.isArray(originalMaterial)) {
    const groups = geometry.groups.filter(group => group.materialIndex === materialIndex)
    if (!groups.length) throw new Error('MX/C-Transparent-ST source primitive group is missing.')
    geometry.clearGroups()
    groups.forEach(group => geometry.addGroup(group.start, group.count, 0))
  }
  for (const attribute of attributes) {
    if (attribute === 'POSITION') ensureSourceAttribute(geometry, 'POSITION', 'position', 'in_POSITION0', 3)
    else if (attribute === 'NORMAL') ensureSourceAttribute(geometry, 'NORMAL', 'normal', 'in_NORMAL0', 3)
    else if (attribute === 'COLOR_0') ensureSourceAttribute(geometry, 'COLOR_0', 'color', 'in_COLOR0', 4)
    else if (attribute === 'TEXCOORD_0') ensureSourceAttribute(geometry, 'TEXCOORD_0', 'uv', 'in_TEXCOORD0', 2)
  }
  return geometry
}

function assertMxCTransparentPass(pass: ChibiViewerTransparentShaderPassMetadata | undefined, expected: {
  pass: string
  stateName: string
  passIndex: number
  blobIndex: number
  programHash: string
  attributes: readonly string[]
  uniforms: readonly string[]
  keywords: readonly string[]
  keywordIndices: readonly number[]
  depthOnly: boolean
  colorMask: number
}) {
  const state = pass?.renderState
  if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
    || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
    || pass.blobIndex !== expected.blobIndex || !exactHash(pass.parameterRecordSha256)
    || !exactArray(pass.keywordIndices, expected.keywordIndices) || !exactArray(pass.keywordNames, expected.keywords)
    || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash || !exactHash(pass.programRecordSha256)
    || typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX')
    || !pass.glsl.includes('#ifdef FRAGMENT') || !exactArray(pass.requiredAttributes, expected.attributes)
    || !exactArray(pass.requiredUniforms, expected.uniforms) || state?.zWrite !== 0 || state.zWriteProperty !== '_ZWrite'
    || state.zTest !== 4 || state.culling !== 0 || state.cullingProperty !== '_Cull'
    || state.colorMask !== expected.colorMask || state.depthOnly !== expected.depthOnly) {
    throw new Error(`MX/C-Transparent-ST viewer material has incomplete ${expected.pass} source pass metadata.`)
  }
  for (const attribute of expected.attributes) {
    const sourceName = attribute === 'POSITION' ? 'in_POSITION0' : attribute === 'NORMAL' ? 'in_NORMAL0'
      : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_TEXCOORD0'
    if (!new RegExp(`\\bin\\b[\\s\\S]*\\b${sourceName}\\b`).test(pass.glsl)) throw new Error(`MX/C-Transparent-ST source is missing ${attribute}.`)
  }
  for (const uniform of expected.uniforms) {
    if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`).test(pass.glsl)) throw new Error(`MX/C-Transparent-ST source is missing ${uniform}.`)
  }
}

/**
 * Build the source-derived forward draw and the real source depth-only draw
 * for MX/C-Transparent-ST.  The caller owns the returned depth mesh and must
 * add it beside the source mesh so both draws share visibility/transforms.
 */
export function createMxCTransparentPasses(object: THREE.Mesh, baseMaterial: THREE.Material, metadata: ChibiViewerMaterialMetadata) {
  if (metadata.adapterId !== 'mx-c-transparent-st') return null
  if (transparentSourceReference(metadata.sourceShaderReference) !== MX_C_TRANSPARENT_ST_SOURCE_REFERENCE) {
    throw new Error('MX/C-Transparent-ST viewer material has an unverified source shader identity.')
  }
  const extraction = metadata.transparentShaderExtraction
  if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
    || extraction.fingerprint !== MX_C_TRANSPARENT_ST_FINGERPRINT
    || extraction.compressedBlobSha256 !== MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256
    || transparentSourceReference(extraction.sourceReference) !== MX_C_TRANSPARENT_ST_SOURCE_REFERENCE) {
    throw new Error('MX/C-Transparent-ST viewer material has no exact source extraction metadata.')
  }
  const keywords = metadata.transparentVariant === 'dither' ? ['_DITHER_HORIZONTAL_LINES'] : []
  const keywordIndices = metadata.transparentVariant === 'dither' ? [9] : []
  if (metadata.transparentVariant !== 'dither' && metadata.transparentVariant !== 'forward') {
    throw new Error('MX/C-Transparent-ST viewer material has no exact source keyword variant.')
  }
  const forward = metadata.transparentVariant === 'dither' ? extraction.passes?.dither : extraction.passes?.forward
  assertMxCTransparentPass(forward, {
    pass: metadata.transparentVariant === 'dither' ? 'dither' : 'forward', stateName: 'ForwardLit', passIndex: 0,
    blobIndex: metadata.transparentVariant === 'dither' ? 8 : 6,
    programHash: metadata.transparentVariant === 'dither' ? MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH : MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH,
    attributes: MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES,
    uniforms: metadata.transparentVariant === 'dither' ? MX_C_TRANSPARENT_ST_DITHER_UNIFORMS : MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS,
    keywords, keywordIndices, depthOnly: false, colorMask: 15,
  })
  assertMxCTransparentPass(extraction.passes?.depth, {
    pass: 'depth', stateName: '', passIndex: 1, blobIndex: 31, programHash: MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH,
    attributes: MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS,
    keywords: [], keywordIndices: [], depthOnly: true, colorMask: 0,
  })
  const map = (baseMaterial as THREE.MeshBasicMaterial).map
  if (!(map instanceof THREE.Texture)) throw new Error('MX/C-Transparent-ST viewer material has no exact _MainTex texture.')
  const mask = (baseMaterial.userData as { chibiMaskTexture?: unknown }).chibiMaskTexture
  if (!(mask instanceof THREE.Texture)) throw new Error('MX/C-Transparent-ST viewer material has no exact _MaskTex texture.')
  const depthWrite = metadata.depthWrite
  if (typeof depthWrite !== 'boolean') throw new Error('MX/C-Transparent-ST viewer material has no exact _ZWrite state.')
  if (metadata.depthTest !== true || metadata.cullMode !== 'off') throw new Error('MX/C-Transparent-ST viewer material has an invalid depth/cull state.')
  const uniforms = transparentUniforms(metadata, map, mask, metadata.transparentVariant === 'dither')
  const forwardMaterial = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} MX/C-Transparent-ST`,
    vertexShader: transparentSkinnedVertex(shaderStageSource(forward!.glsl as string, 'VERTEX'), object, true),
    fragmentShader: shaderStageSource(forward!.glsl as string, 'FRAGMENT'), uniforms,
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, depthWrite, depthTest: true, depthFunc: THREE.LessEqualDepth,
    transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    blendEquationAlpha: THREE.AddEquation, toneMapped: false, lights: false, fog: false,
  })
  const depthIdentity = new THREE.Matrix4()
  const depthUniforms = {
    hlslcc_mtx4x4unity_MatrixVP: { value: matrixVectorArray(depthIdentity) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: matrixVectorArray(depthIdentity) },
  }
  const depthMaterial = new THREE.RawShaderMaterial({
    name: `${baseMaterial.name || object.name} MX/C-Transparent-ST Depth`,
    vertexShader: transparentSkinnedVertex(shaderStageSource(extraction.passes!.depth!.glsl as string, 'VERTEX'), object, false),
    fragmentShader: shaderStageSource(extraction.passes!.depth!.glsl as string, 'FRAGMENT'),
    uniforms: depthUniforms, glslVersion: THREE.GLSL3, side: THREE.DoubleSide, depthWrite, depthTest: true,
    depthFunc: THREE.LessEqualDepth, colorWrite: false, transparent: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.ZeroFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.ZeroFactor,
    blendEquation: THREE.AddEquation, blendEquationAlpha: THREE.AddEquation, toneMapped: false, lights: false, fog: false,
  })
  forwardMaterial.userData.chibi = { adapterId: 'mx-c-transparent-st', renderPass: 'forward', programHash: forward!.programHash, sourceShaderReference: metadata.sourceShaderReference }
  depthMaterial.userData.chibi = { adapterId: 'mx-c-transparent-st', renderPass: 'depth', programHash: extraction.passes!.depth!.programHash, sourceShaderReference: metadata.sourceShaderReference }
  const forwardGeometry = transparentPassGeometry(object, baseMaterial, MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, false)
  const depthGeometry = transparentPassGeometry(object, baseMaterial, MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, true)
  const depthMesh = object instanceof THREE.SkinnedMesh
    ? new THREE.SkinnedMesh(depthGeometry, depthMaterial) : new THREE.Mesh(depthGeometry, depthMaterial)
  if (depthMesh instanceof THREE.SkinnedMesh && object instanceof THREE.SkinnedMesh) {
    depthMesh.bindMode = object.bindMode
    depthMesh.bind(object.skeleton, object.bindMatrix)
  }
  depthMesh.name = `${object.name || 'Mesh'}__MXCTransparentDepth`
  depthMesh.renderOrder = object.renderOrder + 0.0001
  depthMesh.frustumCulled = object.frustumCulled
  depthMesh.layers.mask = object.layers.mask
  depthMesh.userData.chibiTransparentDepthPass = true
  const previousObjectBeforeRender = object.onBeforeRender
  object.onBeforeRender = function (renderer, scene, camera, geometry, drawnMaterial, group) {
    previousObjectBeforeRender.call(this, renderer, scene, camera, geometry, drawnMaterial, group)
    if (drawnMaterial === forwardMaterial) updateTransparentUniforms(forwardMaterial, object, renderer, scene, camera)
  }
  depthMesh.onBeforeRender = (_renderer, _scene, camera) => updateTransparentDepthUniforms(depthMaterial, depthMesh, camera)
  return { forward: forwardMaterial, depth: depthMaterial, depthMesh, forwardGeometry }
}
