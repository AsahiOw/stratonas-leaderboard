import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

import { artifactPath, chibiRoots } from './storage'
import { unityBuiltinQuadReference } from './inventory'
import type { InventoryAssembly, InventorySourceReference, SourceCandidate, SourcePart } from './inventory'
import { CHIBI_SKIN_SKELETON_METADATA_VERSION, validateFxExclusionDiagnostics, validateSkinSkeletonMetadata } from './core-cache'
import { buildChibiArrangementDefault } from './arrangement-default'
import { retainIntermediateFbx } from './intermediate-fbx-retention'
import {
  buildChibiRenderingProfile,
  isExpectedSourceAuthoredCoreGeometryWarning,
  CHIBI_RENDERING_PROFILE_VERSION,
  CHIBI_RENDERING_POLICY_VERSION,
  CHIBI_SHADER_ADAPTER_VERSION,
  MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH,
  MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH,
  MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256,
  MX_UNLIT_OUTLINE_SOURCE_REFERENCE,
  MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH,
  MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256,
  MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256,
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
  MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS,
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
  MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES,
  MX_E_STANDARD_SHADOW_ATTRIBUTES,
  MX_E_STANDARD_SHADOW_PARAMETER_SHA256,
  MX_E_STANDARD_SHADOW_PROGRAM_HASH,
  MX_E_STANDARD_SHADOW_RECORD_SHA256,
  MX_E_STANDARD_SHADOW_UNIFORMS,
  MX_E_STANDARD_SHADER_KEYWORDS,
  MX_E_STANDARD_SHADER_NAME,
  MX_E_STANDARD_SOURCE_REFERENCE,
  MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES,
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
  DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES,
  DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256,
  DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH,
  DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH,
  DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256,
  DSFX_GLITCH_TEX_SHADOW_UNIFORMS,
  DSFX_GLITCH_TEX_SHADER_KEYWORDS,
  DSFX_GLITCH_TEX_SHADER_NAME,
  DSFX_GLITCH_TEX_SOURCE_REFERENCE,
  DSFX_MATCAP_FINGERPRINT,
  DSFX_MATCAP_INERT_COLOR_PROPERTIES,
  DSFX_MATCAP_INERT_FLOAT_PROPERTIES,
  DSFX_MATCAP_MAIN_COLOR,
  DSFX_MATCAP_MAIN_TEXTURE_REFERENCE,
  DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE,
  DSFX_MATCAP_MATERIAL_REFERENCE,
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
  CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES,
  DSFX_ADDITIVE_0_FINGERPRINT,
  DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256,
  DSFX_ADDITIVE_0_REQUIRED_PROPERTIES,
  DSFX_ADDITIVE_0_REQUIRED_TEXTURE_PROPERTIES,
  DSFX_ADDITIVE_0_SHADER_KEYWORDS,
  DSFX_ADDITIVE_0_SHADER_NAME,
  DSFX_ADDITIVE_0_SOURCE_REFERENCE,
  DSFX_ADDITIVE_0_GLES3_PROGRAMS,
  DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS,
  DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS,
  DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS,
  DSFX_ALPHA_BLEND_ADD_FINGERPRINT,
  DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS,
  DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256,
  DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS,
  DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES,
  DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES,
  DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS,
  DSFX_ALPHA_BLEND_ADD_SHADER_NAME,
  DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE,
  DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLOR_PROPERTIES,
  DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOAT_PROPERTIES,
  DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES,
  DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE,
  DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT,
} from './rendering-profile'
import type { ChibiRenderingProfile } from './rendering-profile'
import type { ChibiProfile } from './types'

// ProjectMX/WeaponTest1Damage is source-selected from the GLES3 records in
// the BAAD bundle.  Keep this evidence local to the exporter validator: the
// rendering-profile worker owns the profile construction shape, while this
// module must still reject a hand-edited profile or GLB whose source program
// identity no longer matches the verified extraction.
const PROJECTMX_SHADER_SOURCE_REFERENCE = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1',
  objectId: '-2179428789015729742',
} as const
// These are the only ProjectMX source meshes currently proven to omit Unity's
// Color channel.  The profile carries this exact evidence forward so
// postprocess can materialize Unity's disabled-vertex-attribute default only
// for these source meshes.  These values come from the authoritative Unity
// Mesh objects, not from the exported GLB.  Matching is by full source mesh
// identity; a character id, material name, or shader name is not sufficient.
const PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE = {
  bundleSha256: '66025c332131b4488a04cb314b4598168f213b7df0ba6e58c8695543c7b083b8',
  serializedFile: 'CAB-ada26f5ac0ed21c4234486b090f5cf91',
  objectId: '7429403255582981804',
} as const
const PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE = {
  sourceReference: PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE,
  vertexCount: 10256,
  subMeshVertexCounts: [9392, 864],
  colorChannelDimension: 0,
  colorsPresent: false,
} as const
const PROJECTMX_COLOR_DEFAULT = [0, 0, 0, 1] as const
const PROJECTMX_COLOR_NORMALIZATION = {
  sourceMeshReference: PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE,
  sourceVertexCount: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.vertexCount,
  sourceSubMeshVertexCounts: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.subMeshVertexCounts,
  sourceColorChannelDimension: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.colorChannelDimension,
  sourceColorsPresent: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE.colorsPresent,
  defaultValue: PROJECTMX_COLOR_DEFAULT,
} as const
const PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE = {
  bundleSha256: '12145f231b3c8b093c728296b771f4ae89a1fdd9e98f3afc915668fcd77591c5',
  serializedFile: 'CAB-74b254d25a0b77afb604cb26c86ff7a2',
  objectId: '-4368492268259368080',
} as const
const PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE = {
  sourceReference: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE,
  vertexCount: 9203,
  subMeshVertexCounts: [9203],
  indexCount: 22653,
  colorChannelDimension: 0,
  colorsPresent: false,
} as const
const PROJECTMX_SENA_COLOR_NORMALIZATION = {
  sourceMeshReference: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE,
  sourceVertexCount: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.vertexCount,
  sourceSubMeshVertexCounts: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.subMeshVertexCounts,
  sourceIndexCount: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.indexCount,
  sourceColorChannelDimension: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.colorChannelDimension,
  sourceColorsPresent: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE.colorsPresent,
  defaultValue: PROJECTMX_COLOR_DEFAULT,
} as const
const PROJECTMX_COLORLESS_SOURCE_MESH_RECORDS = [
  {
    sourceReference: PROJECTMX_COLORLESS_SOURCE_MESH_REFERENCE,
    evidence: PROJECTMX_COLORLESS_SOURCE_MESH_EVIDENCE,
    normalization: PROJECTMX_COLOR_NORMALIZATION,
  },
  {
    sourceReference: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_REFERENCE,
    evidence: PROJECTMX_SENA_COLORLESS_SOURCE_MESH_EVIDENCE,
    normalization: PROJECTMX_SENA_COLOR_NORMALIZATION,
  },
] as const

function projectMxSourceReferenceKey(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const reference = value as Record<string, unknown>
  return `${String(reference.bundleSha256 ?? '').toLowerCase()}:${String(reference.serializedFile ?? '').toLowerCase()}:${String(reference.objectId ?? '')}`
}

function projectMxColorlessSourceMeshRecordForReference(value: unknown) {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== 3) return undefined
  const reference = value as Record<string, unknown>
  if (typeof reference.bundleSha256 !== 'string' || !reference.bundleSha256
    || typeof reference.serializedFile !== 'string' || !reference.serializedFile
    || typeof reference.objectId !== 'string' || !reference.objectId) return undefined
  return PROJECTMX_COLORLESS_SOURCE_MESH_RECORDS.find(record =>
    projectMxSourceReferenceKey(record.sourceReference) === projectMxSourceReferenceKey(value))
}
const PROJECTMX_SHADER_PROGRAM_BLOB_SHA256 = '962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b'
const PROJECTMX_SHADER_FINGERPRINT = 'dba2503cda8be6508b161525ab1202a9187f93c8924716efe6f3d061a4ff439b'
const PROJECTMX_SHADER_NAME = 'ProjectMX/WeaponTest1Damage'
const PROJECTMX_SHADER_KEYWORDS = [
  'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON',
  'STEREO_CUBEMAP_RENDER_ON', '_ADDITIONAL_LIGHTS', 'DEBUG_DISPLAY', 'FOG_LINEAR',
  'FOG_EXP', 'FOG_EXP2', '_DAMAGE_0', '_GLOW_0', '_DITHER_HORIZONTAL_LINES',
  'OUTLINE_RIM_LIGHT_POINT', 'OUTLINE_RIM_LIGHT_SPOT', '_GRAYSCALE_MODE',
  '_CHAR_CUTOUT_MODE',
] as const
const PROJECTMX_REQUIRED_PROPERTIES = [
  '_DamageON', '_Color', '_mainTex', '_sourceTex', '_NoiseTex', '_CrushScale', '_NoiseDir',
  '_DmgCol', '_NoiseColStrong', '_Damage', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire',
  '_ShadowThreshold', '_ShadowStrong', '_LightValue', '_LightStrong', '_SpecStrong', '_ShadowTint',
  '_SpecColor', '_FakeLightDir', '_AdditionalLightStrength', '_AdditionalLightSharpness', '_UseGlow',
  '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0', '_OutlineTint',
  '_OutlineSolidColorTint', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', '_GrayBrightness',
  '_IsDither', '_DitherThreshold',
] as const
const PROJECTMX_REQUIRED_TEXTURE_PROPERTIES = ['_mainTex', '_sourceTex'] as const
const PROJECTMX_OPAQUE_PASS_STATE = {
  sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0,
  blendOperation: 0, blendOperationAlpha: 0,
} as const
const PROJECTMX_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0'] as const
const PROJECTMX_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT', 'TEXCOORD_0'] as const
const PROJECTMX_SOLID_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT'] as const
const PROJECTMX_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'] as const
const PROJECTMX_DEPTH_ATTRIBUTES = ['POSITION'] as const
const PROJECTMX_FORWARD_UNIFORMS = [
  '_WorldSpaceCameraPos', 'hlslcc_mtx4x4unity_MatrixVP', '_MxCharShadowTone', '_ShadowTint', '_mainTex_ST',
  '_FakeLightDir', '_MxCharLightTone', '_MxCharLightData', '_ShadowThreshold', '_CodeAddColor',
  '_CodeMultiplyColor', '_CodeAddRimColor', '_Color', '_ShadowStrong', '_SpecColor', '_LightValue',
  '_LightStrong', '_SpecStrong', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_mainTex', '_sourceTex',
] as const
const PROJECTMX_GLOW_UNIFORMS = [
  ...PROJECTMX_FORWARD_UNIFORMS, '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0',
] as const
const PROJECTMX_OUTLINE_UNIFORMS = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_OutlineTint', '_OutlineZCorrection', '_mainTex',
] as const
const PROJECTMX_SOLID_OUTLINE_UNIFORMS = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_AdditionalLightSharpness', '_AdditionalLightStrength', '_OutlineTint',
  '_OutlineZCorrection', '_OutlineSolidColorTint', '_DitherThreshold',
] as const
const PROJECTMX_SHADOW_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier'] as const
const PROJECTMX_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP'] as const
const PROJECTMX_SHADER_PASSES = {
  forward: {
    pass: 'forward', stateName: 'ForwardLit', passIndex: 0, blobIndex: 32, parameterBlobIndex: 0,
    parameterRecordSha256: '1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531',
    programHash: '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0',
    programRecordSha256: '6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab',
    programDataLength: 9117, keywordIndices: [], keywordNames: [], usesNoiseTexture: false,
    requiredAttributes: PROJECTMX_FORWARD_ATTRIBUTES, requiredUniforms: PROJECTMX_FORWARD_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, ...PROJECTMX_OPAQUE_PASS_STATE },
  },
  glow: {
    pass: 'glow', stateName: 'ForwardLit', passIndex: 0, blobIndex: 34, parameterBlobIndex: 2,
    parameterRecordSha256: 'eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3',
    programHash: '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61',
    programRecordSha256: '649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199',
    programDataLength: 9679, keywordIndices: [10], keywordNames: ['_GLOW_0'], usesNoiseTexture: false,
    requiredAttributes: PROJECTMX_FORWARD_ATTRIBUTES, requiredUniforms: PROJECTMX_GLOW_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, ...PROJECTMX_OPAQUE_PASS_STATE },
  },
  outline: {
    pass: 'outline', stateName: 'Outline', passIndex: 1, blobIndex: 104, parameterBlobIndex: 80,
    parameterRecordSha256: '93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9',
    programHash: 'a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703',
    programRecordSha256: '476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026',
    programDataLength: 5141, keywordIndices: [], keywordNames: [], usesNoiseTexture: false,
    requiredAttributes: PROJECTMX_OUTLINE_ATTRIBUTES, requiredUniforms: PROJECTMX_OUTLINE_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false, ...PROJECTMX_OPAQUE_PASS_STATE },
  },
  solidOutline: {
    pass: 'solidOutline', stateName: 'Solid Color Outline', passIndex: 2, blobIndex: 180, parameterBlobIndex: 176,
    parameterRecordSha256: '81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e',
    programHash: 'caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2',
    programRecordSha256: 'cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f',
    programDataLength: 5384, keywordIndices: [], keywordNames: [], usesNoiseTexture: false,
    requiredAttributes: PROJECTMX_SOLID_OUTLINE_ATTRIBUTES, requiredUniforms: PROJECTMX_SOLID_OUTLINE_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false, ...PROJECTMX_OPAQUE_PASS_STATE },
  },
  shadow: {
    pass: 'shadow', stateName: 'ShadowCaster', passIndex: 3, blobIndex: 193, parameterBlobIndex: 192,
    parameterRecordSha256: '7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35',
    programHash: 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0',
    programRecordSha256: '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46',
    programDataLength: 4273, keywordIndices: [], keywordNames: [], usesNoiseTexture: false,
    requiredAttributes: PROJECTMX_SHADOW_ATTRIBUTES, requiredUniforms: PROJECTMX_SHADOW_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false, ...PROJECTMX_OPAQUE_PASS_STATE },
  },
  depth: {
    pass: 'depth', stateName: 'DepthOnly', passIndex: 4, blobIndex: 195, parameterBlobIndex: 194,
    parameterRecordSha256: 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532',
    programHash: '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513',
    programRecordSha256: '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0',
    programDataLength: 2766, keywordIndices: [], keywordNames: [], usesNoiseTexture: false,
    requiredAttributes: PROJECTMX_DEPTH_ATTRIBUTES, requiredUniforms: PROJECTMX_DEPTH_UNIFORMS,
    renderState: { zWrite: 1, zTest: 4, culling: 2, colorMask: 0, depthOnly: true, ...PROJECTMX_OPAQUE_PASS_STATE },
  },
} as const

export const CHIBI_EXPORTER_VERSION = 'assetstudio-0.19.0_fbx2gltf-0.13.1-render-profile-v7-policy-v7-material-claims-v2-weapon-ancestry-v1'
export const CHIBI_MATERIAL_VERSION = 'mx-materials-v65-preserve-collapsed-face-uv'
/** Bump only when conversion bytes can change; rendering policy versions stay out of this identity. */
export const CHIBI_CORE_CONVERTER_VERSION = 'assetstudio-0.19.0_fbx2gltf-0.13.1-postprocess-core-v1'

const REMOVED_MESHES: Readonly<Record<string, readonly string[]>> = {
  haruna_original: ['Haruna_Original_Fishshapedbun_Weapon', 'Haruna_Original_Orangebox', 'Haruna_Original_Weapon'],
  asuna_original: ['Box001'],
  hare_original: ['Hare_Original_Dron', 'Hare_Original_Pad'],
  ch0187: ['CH0187_B_Body', 'CH0187_Machine'],
  cherino_original: ['CherinoRoyalGuard_Body', 'CherinoRoyalGuard1_Body', 'CherinoRoyalGuard2_Body', 'CherinoRoyalGuard4_Body'],
  mashiro_original: ['plane'],
  ch0297: ['CH0297_Prop_Outline', 'CH0297_Arm01_Mesh', 'CH0297_Arm02_Mesh'],
  ch0259: ['Saori_Original_Handgun'],
  ch0180: ['CH0180_Seahouse_Outline_Bingsu'],
  utaha_original: ['Utaha_Original_Turret'],
}

// A few source weapon shaders export a uniform vertex alpha that is not part
// of the intended accessory material. Strip it only for the verified Hifumi
// swimsuit float; the texture's own alpha channel remains available for its
// designed cut-outs.
const STRIP_VERTEX_COLORS: Readonly<Record<string, readonly string[]>> = {
  ch0058: ['CH0058_BeachTube'],
}

// The swimsuit tube is authored with cut-out holes in its atlas. Preserve
// those holes with alpha testing instead of blending the entire ring.
const FORCE_MASK_MATERIALS: Readonly<Record<string, readonly string[]>> = {
  ch0058: ['CH0058_BeachTube'],
}

// CH0336's exported face UVs use the source image's top-left V origin; flip
// only this verified EyeMouth material when writing GLTF coordinates.
const FLIP_EYE_MOUTH_V: Readonly<Record<string, readonly string[]>> = {
  ch0336: ['CH0336_EyeMouth'],
}

// CH0355_02's source animator enables Face01 for the intended idle eyes even
// though its exported child-renderer state names Face02 as enabled. Keep the
// correction explicit and scoped to this source rather than changing the
// general assembly-state mapping for every multi-face rig.
const FLIP_EYE_MOUTH_U: Readonly<Record<string, readonly string[]>> = {
  ch0355_02: ['CH0355_02_EyeMouth'],
}
const FACE_RENDERER_OVERRIDES: Readonly<Record<string, Readonly<Record<number, string>>>> = {
  ch0355_02: { 3: 'CH0355_02_Face01_Mesh', 4: 'CH0355_02_Face02_Mesh' },
}

export function removedMeshesForSource(sourceIdentity: string) {
  return [...(REMOVED_MESHES[sourceIdentity.toLowerCase()] ?? [])]
}

export function stripVertexColorsForSource(sourceIdentity: string) {
  return [...(STRIP_VERTEX_COLORS[sourceIdentity.toLowerCase()] ?? [])]
}

export function forceMaskMaterialsForSource(sourceIdentity: string) {
  return [...(FORCE_MASK_MATERIALS[sourceIdentity.toLowerCase()] ?? [])]
}

export function flipEyeMouthVForSource(sourceIdentity: string) {
  return [...(FLIP_EYE_MOUTH_V[sourceIdentity.toLowerCase()] ?? [])]
}

export function flipEyeMouthUForSource(sourceIdentity: string) {
  return [...(FLIP_EYE_MOUTH_U[sourceIdentity.toLowerCase()] ?? [])]
}

export function faceRendererOverridesForSource(sourceIdentity: string) {
  return { ...(FACE_RENDERER_OVERRIDES[sourceIdentity.toLowerCase()] ?? {}) }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value)
}

export function buildFingerprint(candidate: Pick<SourceCandidate, 'fingerprint'>, _profile: ChibiProfile, overrides: unknown, classificationProfile?: unknown) {
  const exportOverrides = overrides && typeof overrides === 'object' && 'export' in overrides ? (overrides as { export: unknown }).export : {}
  const identity: Record<string, unknown> = {
    source: candidate.fingerprint, exporter: CHIBI_EXPORTER_VERSION,
    materials: CHIBI_MATERIAL_VERSION, exportOverrides,
    renderingProfile: CHIBI_RENDERING_PROFILE_VERSION, renderingPolicy: CHIBI_RENDERING_POLICY_VERSION,
    shaderAdapters: CHIBI_SHADER_ADAPTER_VERSION, skinSkeletonMetadata: CHIBI_SKIN_SKELETON_METADATA_VERSION,
  }
  if (classificationProfile !== undefined) identity.classification = classificationProfile
  return createHash('sha256').update(stable(identity)).digest('hex')
}

export function profilesEqual(left: unknown, right: unknown) {
  return stable(left) === stable(right)
}

export interface GlbValidation {
  valid: true
  incompleteImport?: { sourceComplete: false; warnings: string[] }
  byteLength: number
  meshes: number
  skins: number
  animations: string[]
  images: number
  materials: string[]
  renderingProfile?: {
    policyVersion: string
    excludedRenderers: ChibiRenderingProfile['excludedRenderers']
    excludedChildRendererEvents: ChibiRenderingProfile['excludedChildRendererEvents']
    excludedFxInstantiationEvents: ChibiRenderingProfile['excludedFxInstantiationEvents']
    fxExclusionProofs: ChibiRenderingProfile['fxExclusionProofs']
    coreRendererBlockers?: ChibiRenderingProfile['coreRendererBlockers']
    coreGeometryWarnings?: ChibiRenderingProfile['coreGeometryWarnings']
    equipmentBindingEvidence?: ChibiRenderingProfile['equipmentBindingEvidence']
    warnings?: ChibiRenderingProfile['warnings']
    skinSkeletonMetadataVersion?: string
    skinSkeletonRepairs?: ReturnType<typeof validateSkinSkeletonMetadata>
  }
}

export async function validateGlb(filePath: string): Promise<GlbValidation> {
  const buffer = await readFile(filePath)
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2) throw new Error('Artifact is not a GLB 2.0 file.')
  if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('GLB declared length differs from file size.')
  let offset = 12
  let json: Record<string, any> | undefined
  let binaryLength = -1
  let binary = Buffer.alloc(0)
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error('GLB chunk header is truncated.')
    const length = buffer.readUInt32LE(offset)
    const type = buffer.readUInt32LE(offset + 4)
    const end = offset + 8 + length
    if (end > buffer.length || length % 4 !== 0) throw new Error('GLB chunk is invalid.')
    if (type === 0x4e4f534a) json = JSON.parse(buffer.toString('utf8', offset + 8, end).trim())
    if (type === 0x004e4942) { binaryLength = length; binary = buffer.subarray(offset + 8, end) }
    offset = end
  }
  if (!json || binaryLength < 0 || json.asset?.version !== '2.0') throw new Error('GLB is missing required JSON or binary data.')
  if (!json.meshes?.some((mesh: any) => mesh.primitives?.some((primitive: any) => Number.isInteger(primitive.attributes?.POSITION)))) throw new Error('GLB has no scene mesh geometry.')
  if (!json.skins?.some((skin: any) => skin.joints?.length)) throw new Error('GLB has no populated skin.')
  if (json.buffers?.some((item: any) => item.uri) || json.images?.some((item: any) => item.uri)) throw new Error('Published GLB has external resources.')
  for (const image of json.images ?? []) {
    if (!Number.isInteger(image.bufferView) || !['image/png', 'image/jpeg'].includes(image.mimeType)) throw new Error('GLB image is not embedded with a supported MIME type.')
    const view = json.bufferViews?.[image.bufferView]
    const start = view?.byteOffset ?? 0
    const bytes = view && binary.subarray(start, start + view.byteLength)
    if (!view || bytes.length !== view.byteLength) throw new Error('Embedded GLB image exceeds the binary chunk.')
    try { const metadata = await sharp(bytes).metadata(); if (!metadata.width || !metadata.height) throw new Error('empty image') }
    catch { throw new Error('Embedded GLB image failed to decode.') }
  }
  const joints = new Set<number>((json.skins ?? []).flatMap((skin: any) => skin.joints ?? []))
  const componentSizes: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
  const components: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
  const readComponent = (componentType: number, offset: number) => componentType === 5126 ? binary.readFloatLE(offset)
    : componentType === 5125 ? binary.readUInt32LE(offset) : componentType === 5123 ? binary.readUInt16LE(offset)
      : componentType === 5122 ? binary.readInt16LE(offset) : componentType === 5121 ? binary.readUInt8(offset) : binary.readInt8(offset)
  const readAccessor = (index: number) => {
    const accessor = json!.accessors?.[index]
    const view = json!.bufferViews?.[accessor?.bufferView]
    const size = componentSizes[accessor?.componentType]
    const count = components[accessor?.type]
    if (!accessor || !view || !size || !count || accessor.sparse) throw new Error('GLB animation uses an unsupported accessor.')
    const stride = view.byteStride ?? size * count
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
    return Array.from({ length: accessor.count }, (_, row) => Array.from({ length: count }, (_, component) => readComponent(accessor.componentType, start + row * stride + component * size)))
  }
  const sceneIndex = Number.isInteger(json.scene) ? json.scene : 0
  const renderingProfile = json.scenes?.[sceneIndex]?.extras?.chibi?.renderingProfile
  const incompleteImport = json.scenes?.[sceneIndex]?.extras?.chibi?.incompleteImport
  if (incompleteImport && (incompleteImport.sourceComplete !== false || !Array.isArray(incompleteImport.warnings) || !incompleteImport.warnings.length || incompleteImport.warnings.some((warning: unknown) => typeof warning !== 'string'))) throw new Error('Invalid incomplete-import diagnostics.')
  const embeddedPolicyDiagnostics = json.scenes?.[sceneIndex]?.extras?.chibi?.renderingProfileDiagnostics
  const sameNumbers = (actual: number[], expected: number[], epsilon = 1e-6) => actual.length === expected.length
    && actual.every((value, index) => Math.abs(value - expected[index]) <= epsilon)
  const sameMatrix = (actual: number[][], expected: number[][], epsilon = 1e-6) => actual.length === expected.length
    && actual.every((row, index) => sameNumbers(row, expected[index], epsilon))
  const profileReferenceKey = (reference: any) => reference
    ? `${String(reference.bundleSha256).toLowerCase()}:${String(reference.serializedFile).toLowerCase()}:${String(reference.objectId)}` : ''
  const nodeHierarchyPaths = () => {
    const parents = new Map<number, number>()
    for (const [parent, node] of (json!.nodes ?? []).entries()) {
      for (const child of node.children ?? []) if (Number.isInteger(child)) parents.set(child, parent)
    }
    return (json!.nodes ?? []).map((_: unknown, index: number) => {
      const names: string[] = [], seen = new Set<number>()
      let current: number | undefined = index
      while (current !== undefined && !seen.has(current)) {
        seen.add(current)
        names.push(json!.nodes[current]?.name ?? `node-${current}`)
        current = parents.get(current)
      }
      names.reverse()
      if (names[0] === 'RootNode') names.shift()
      return names.join('/')
    })
  }
  const renderingProfileUsesPolicyContract = Boolean(renderingProfile && (
    renderingProfile.schemaVersion === 2 || renderingProfile.profileVersion === CHIBI_RENDERING_PROFILE_VERSION
      || renderingProfile.policyVersion !== undefined || renderingProfile.excludedRenderers !== undefined
      || renderingProfile.excludedChildRendererEvents !== undefined
      || renderingProfile.equipmentBindingEvidence !== undefined || renderingProfile.coreRendererBlockers !== undefined
  ))
  const renderingProfileDiagnostics: GlbValidation['renderingProfile'] = renderingProfile
    && typeof renderingProfile.policyVersion === 'string'
    && Array.isArray(renderingProfile.excludedRenderers)
    && Array.isArray(renderingProfile.excludedChildRendererEvents)
    && Array.isArray(renderingProfile.fxExclusionProofs)
    && Array.isArray(renderingProfile.excludedFxInstantiationEvents)
    ? {
      policyVersion: renderingProfile.policyVersion,
      excludedRenderers: renderingProfile.excludedRenderers,
      excludedChildRendererEvents: renderingProfile.excludedChildRendererEvents,
      fxExclusionProofs: renderingProfile.fxExclusionProofs,
      excludedFxInstantiationEvents: renderingProfile.excludedFxInstantiationEvents,
      ...(Array.isArray(renderingProfile.coreRendererBlockers)
        ? { coreRendererBlockers: renderingProfile.coreRendererBlockers }
        : Array.isArray(renderingProfile.validation?.coreRendererBlockers)
          ? { coreRendererBlockers: renderingProfile.validation.coreRendererBlockers } : {}),
      ...(Array.isArray(renderingProfile.coreGeometryWarnings)
        ? { coreGeometryWarnings: renderingProfile.coreGeometryWarnings }
        : Array.isArray(renderingProfile.validation?.coreGeometryWarnings)
          ? { coreGeometryWarnings: renderingProfile.validation.coreGeometryWarnings } : {}),
      ...(Array.isArray(renderingProfile.equipmentBindingEvidence)
        ? { equipmentBindingEvidence: renderingProfile.equipmentBindingEvidence }
        : Array.isArray(renderingProfile.validation?.equipmentBindingEvidence)
          ? { equipmentBindingEvidence: renderingProfile.validation.equipmentBindingEvidence } : {}),
      ...(Array.isArray(renderingProfile.warnings)
        ? { warnings: renderingProfile.warnings }
        : Array.isArray(renderingProfile.validation?.warnings)
          ? { warnings: renderingProfile.validation.warnings } : {}),
      ...(typeof embeddedPolicyDiagnostics?.skinSkeletonMetadataVersion === 'string'
        ? { skinSkeletonMetadataVersion: embeddedPolicyDiagnostics.skinSkeletonMetadataVersion } : {}),
      ...(Array.isArray(embeddedPolicyDiagnostics?.skinSkeletonRepairs)
        ? { skinSkeletonRepairs: embeddedPolicyDiagnostics.skinSkeletonRepairs } : {}),
    }
    : undefined
  const validateRenderingProfileContract = () => {
    if (!renderingProfile) {
      validateSkinSkeletonMetadata(json, embeddedPolicyDiagnostics)
      return
    }
    if (renderingProfileUsesPolicyContract && !renderingProfileDiagnostics) {
      throw new Error('Embedded rendering profile is missing its deterministic presentation-policy diagnostics.')
    }
    if (!renderingProfileDiagnostics) {
      validateSkinSkeletonMetadata(json, embeddedPolicyDiagnostics)
      return
    }
    if (renderingProfile.schemaVersion !== 2 || renderingProfile.profileVersion !== CHIBI_RENDERING_PROFILE_VERSION
      || renderingProfile.policyVersion !== CHIBI_RENDERING_POLICY_VERSION
      || renderingProfile.adapterVersion !== CHIBI_SHADER_ADAPTER_VERSION) {
      throw new Error('Embedded rendering profile version or policy identity is missing or tampered.')
    }
    const validateCoreGeometryWarningEvidence = () => {
      const warningsPresent = renderingProfile.coreGeometryWarnings !== undefined
        || renderingProfile.validation?.coreGeometryWarnings !== undefined
      const warnings = renderingProfile.coreGeometryWarnings
      const validationWarnings = renderingProfile.validation?.coreGeometryWarnings
      if (warningsPresent && (!Array.isArray(warnings) || !Array.isArray(validationWarnings)
        || stable(warnings) !== stable(validationWarnings))) {
        throw new Error('Embedded core-geometry warnings do not match their validation records.')
      }
      if (!warningsPresent || !Array.isArray(warnings) || warnings.length === 0) return
      if (warnings.length !== 1) throw new Error('Embedded rendering profile has an invalid or ambiguous core-geometry warning set.')
      const exactReferenceKey = (reference: any, label: string) => {
        if (!reference || typeof reference !== 'object'
          || typeof reference.bundleSha256 !== 'string' || !reference.bundleSha256
          || typeof reference.serializedFile !== 'string' || !reference.serializedFile
          || typeof reference.objectId !== 'string' || !reference.objectId) {
          throw new Error(`${label} has no exact full source identity.`)
        }
        return profileReferenceKey(reference)
      }
      const normalizePath = (value: unknown) => typeof value === 'string' ? value.replaceAll('\\', '/').toLowerCase() : ''
      const warning = warnings[0]
      if (!isExpectedSourceAuthoredCoreGeometryWarning(warning)) {
        throw new Error('Embedded core-geometry warning has unsupported source evidence or geometry semantics.')
      }
      const prefabKey = exactReferenceKey(warning.sourcePrefabReference, 'Embedded core-geometry warning prefab')
      const rendererKey = exactReferenceKey(warning.sourceReference, 'Embedded core-geometry warning renderer')
      const meshKey = exactReferenceKey(warning.sourceMeshReference, 'Embedded core-geometry warning mesh')
      const profilePrefabKey = exactReferenceKey(renderingProfile.sourcePrefab?.reference, 'Rendering profile source prefab')
      const assembly = renderingProfile.assembly
      const assemblyPrefabKey = exactReferenceKey(assembly?.prefabReference, 'Rendering profile assembly prefab')
      if (warning.sourcePrefabPath !== renderingProfile.sourcePrefab?.path
        || normalizePath(warning.sourcePrefabPath) !== normalizePath(assembly?.prefabPath)
        || prefabKey !== profilePrefabKey || prefabKey !== assemblyPrefabKey) {
        throw new Error('Embedded core-geometry warning does not match the exact selected source prefab and assembly.')
      }
      const profileRenderers = Array.isArray(renderingProfile.renderers) ? renderingProfile.renderers : []
      const rendererMatches = profileRenderers.filter((item: any) => profileReferenceKey(item?.sourceReference) === rendererKey)
      const assemblyMatches = Array.isArray(assembly?.renderers)
        ? assembly.renderers.filter((item: any) => profileReferenceKey(item?.sourceReference) === rendererKey) : []
      const excluded = Array.isArray(renderingProfile.excludedRenderers)
        && renderingProfile.excludedRenderers.some((item: any) => profileReferenceKey(item?.sourceReference) === rendererKey)
      const blocked = Array.isArray(renderingProfile.coreRendererBlockers)
        && renderingProfile.coreRendererBlockers.some((item: any) => profileReferenceKey(item?.sourceReference) === rendererKey)
      if (rendererMatches.length !== 1 || assemblyMatches.length !== 1 || excluded || blocked) {
        throw new Error('Embedded core-geometry warning does not identify one required core renderer.')
      }
      const renderer = rendererMatches[0]
      const assemblyRenderer = assemblyMatches[0]
      const rendererMeshKey = exactReferenceKey(renderer.sourceMesh?.sourceReference, `Core renderer ${rendererKey} mesh`)
      const assemblyMeshKey = exactReferenceKey(assemblyRenderer.meshSourceReference, `Source assembly renderer ${rendererKey} mesh`)
      const nodeIndex = renderer.glbNodeIndex
      const node = Number.isInteger(nodeIndex) ? json!.nodes?.[nodeIndex] : null
      const paths = nodeHierarchyPaths()
      const glbSource = node?.extras?.chibi?.sourceRenderer
      const mesh = node && Number.isInteger(node.mesh) ? json!.meshes?.[node.mesh] : null
      if (meshKey !== rendererMeshKey || meshKey !== assemblyMeshKey
        || warning.sourceReference.bundleSha256.toLowerCase() !== renderer.sourceReference.bundleSha256.toLowerCase()
        || warning.sourceReference.serializedFile.toLowerCase() !== renderer.sourceReference.serializedFile.toLowerCase()
        || warning.sourceReference.objectId !== renderer.sourceReference.objectId
        || warning.name !== renderer.name || warning.name !== assemblyRenderer.name
        || warning.hierarchyPath !== renderer.hierarchyPath || warning.hierarchyPath !== assemblyRenderer.hierarchyPath
        || renderer.rendererType !== 'SkinnedMeshRenderer' || renderer.rendererType !== assemblyRenderer.rendererType
        || renderer.defaultVisible !== true || assemblyRenderer.enabled === false
        || assemblyRenderer.gameObjectActive === false || assemblyRenderer.visible === false
        || !node || !mesh || !Array.isArray(mesh.primitives) || paths[nodeIndex] !== warning.hierarchyPath
        || profileReferenceKey(glbSource?.sourceReference) !== rendererKey
        || profileReferenceKey(glbSource?.sourceMeshReference) !== meshKey
        || glbSource?.defaultVisible !== true) {
        throw new Error('Embedded core-geometry warning disagrees with its exact included source renderer, mesh, or GLB binding.')
      }
      const warningSlots = warning.geometryEvidence.retainedMaterialSlots
      const rendererSlots = Array.isArray(renderer.materialSlots) ? renderer.materialSlots : []
      const assemblySlots = Array.isArray(assemblyRenderer.materialSlots) ? assemblyRenderer.materialSlots : []
      const rendererWarningSlots = rendererSlots.map((slot: any) => ({
        slot: slot.slot, sourceMaterialName: slot.sourceMaterialName, sourceMaterialReference: slot.sourceMaterialReference,
      }))
      const assemblyWarningSlots = assemblySlots.map((slot: any) => ({ slot: slot.slot, sourceMaterialReference: slot.sourceMaterialReference }))
      const retainedAssemblySlots = warningSlots.map(slot => ({ slot: slot.slot, sourceMaterialReference: slot.sourceMaterialReference }))
      if (warningSlots.length !== 5 || rendererWarningSlots.length !== 5 || assemblyWarningSlots.length !== 5
        || stable(warningSlots) !== stable(rendererWarningSlots)
        || stable(retainedAssemblySlots) !== stable(assemblyWarningSlots)) {
        throw new Error('Embedded core-geometry warning does not preserve all five ordered source material slots on the required renderer.')
      }
      for (const [slotIndex, slot] of rendererSlots.entries()) {
        const sourceMaterial = warningSlots[slotIndex].sourceMaterialReference
        const assemblyPointer = assemblySlots[slotIndex].material
        if (!assemblyPointer || assemblyPointer.pathId !== sourceMaterial.objectId
          || normalizePath(assemblyPointer.file) !== normalizePath(sourceMaterial.serializedFile)) {
          throw new Error(`Embedded core-geometry warning source slot ${slot.slot} disagrees with its exact serialized assembly material pointer.`)
        }
        const binding = slot.glb
        if (!binding || binding.nodeIndex !== nodeIndex || binding.meshIndex !== node.mesh
          || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
          || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) {
          throw new Error(`Embedded core-geometry warning source slot ${slot.slot} has no exact GLB primitive binding.`)
        }
        const expectedSlot = `${rendererKey}#${slot.slot}`
        for (const [bindingIndex, primitiveIndex] of binding.primitiveIndices.entries()) {
          const primitive = mesh.primitives[primitiveIndex]
          const materialIndex = binding.materialIndices[bindingIndex]
          const material = json!.materials?.[materialIndex]
          const materialSource = material?.extras?.chibi
          const claims = Array.isArray(materialSource?.renderingProfileSlots)
            ? materialSource.renderingProfileSlots
            : materialSource?.renderingProfileSlot ? [materialSource.renderingProfileSlot] : []
          if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex
            || material?.name !== slot.sourceMaterialName
            || profileReferenceKey(materialSource?.sourceMaterialReference) !== profileReferenceKey(slot.sourceMaterialReference)
            || !claims.includes(expectedSlot)) {
            throw new Error(`Embedded core-geometry warning source slot ${slot.slot} lost its exact GLB material binding.`)
          }
        }
      }
    }
    validateCoreGeometryWarningEvidence()
    if (renderingProfile.validation?.valid !== true || !Array.isArray(renderingProfile.validation?.unresolved)
      || renderingProfile.validation.unresolved.length) {
      throw new Error('Rendering profile validation is not marked valid.')
    }
    validateSkinSkeletonMetadata(json, embeddedPolicyDiagnostics, true)
    if (!Array.isArray(renderingProfile.renderers) || !Array.isArray(renderingProfile.childRendererEvents)) {
      throw new Error('Embedded rendering profile is missing its exact renderer or child-event records.')
    }
    if (!Array.isArray(renderingProfile.validation.excludedRenderers)
      || !Array.isArray(renderingProfile.validation.excludedChildRendererEvents)
      || stable(renderingProfile.validation.excludedRenderers) !== stable(renderingProfile.excludedRenderers)
      || stable(renderingProfile.validation.excludedChildRendererEvents) !== stable(renderingProfile.excludedChildRendererEvents)) {
      throw new Error('Embedded rendering profile exclusion diagnostics do not match its source policy records.')
    }
    validateFxExclusionDiagnostics(renderingProfile, {
      present: Object.hasOwn(embeddedPolicyDiagnostics ?? {}, 'fxExclusionProofs')
        || Object.hasOwn(embeddedPolicyDiagnostics ?? {}, 'excludedFxInstantiationEvents'),
      proofs: embeddedPolicyDiagnostics?.fxExclusionProofs,
      events: embeddedPolicyDiagnostics?.excludedFxInstantiationEvents,
    })
    const excludedRendererSort = (left: any, right: any) => profileReferenceKey(left.sourceReference).localeCompare(profileReferenceKey(right.sourceReference))
      || String(left.hierarchyPath ?? '').localeCompare(String(right.hierarchyPath ?? ''))
      || String(left.name ?? '').localeCompare(String(right.name ?? ''))
    const excludedEventSort = (left: any, right: any) => Number(left.time) - Number(right.time)
      || Number(left.order) - Number(right.order)
      || profileReferenceKey(left.sourceRendererReference).localeCompare(profileReferenceKey(right.sourceRendererReference))
    const sortedExcludedRenderers = [...renderingProfile.excludedRenderers].sort(excludedRendererSort)
    const sortedExcludedEvents = [...renderingProfile.excludedChildRendererEvents].sort(excludedEventSort)
    if (stable(renderingProfile.excludedRenderers) !== stable(sortedExcludedRenderers)
      || stable(renderingProfile.excludedChildRendererEvents) !== stable(sortedExcludedEvents)) {
      throw new Error('Embedded rendering profile exclusion records are not in deterministic source order.')
    }
    const excludedReferences = new Set<string>()
    for (const renderer of renderingProfile.excludedRenderers) {
      const key = profileReferenceKey(renderer?.sourceReference)
      if (!key || excludedReferences.has(key)
        || !['PRESENTATION_SHADER_OR_MATERIAL', 'PRESENTATION_MESH_10210_OR_HELPER'].includes(renderer?.reasonCode)
        || typeof renderer?.name !== 'string' || !renderer.name
        || (renderer.hierarchyPath !== null && typeof renderer.hierarchyPath !== 'string')
        || !Array.isArray(renderer?.evidence) || renderer.evidence.length === 0
        || renderer.evidence.some((evidence: unknown) => typeof evidence !== 'string' || !evidence)
        || !Array.isArray(renderer?.materials)
        || renderer.materials.some((material: any) => !material || typeof material.name !== 'string'
          || (material.sourceReference !== null && material.sourceReference !== undefined && !profileReferenceKey(material.sourceReference)))) {
        throw new Error('Embedded rendering profile has an invalid or ambiguous excluded renderer record.')
      }
      excludedReferences.add(key)
    }
    const includedReferences = new Set<string>()
    const includedNodes = new Set<number>()
    const paths = nodeHierarchyPaths()
    // splitProfileMouth intentionally creates a second, derived primitive for
    // the mouth atlas when an EyeMouth source primitive contains both eye and
    // mouth triangles.  That primitive is not a source-material slot (and
    // therefore cannot carry the source slot provenance), but it is still
    // required face geometry.  Keep the core primitive-coverage check strict
    // by accepting it only through the exact, source-bound mouth record.
    const profileMouth = renderingProfile.mouth
    const mouthRendererKey = profileMouth ? profileReferenceKey(profileMouth.sourceRendererReference) : ''
    let mouthRendererSeen = false
    const expectedMaterialClaims = new Map<number, Set<string>>()
    const validateMouthDerivedBinding = (renderer: any, slots: any[], mesh: any, sourceKey: string) => {
      if (!profileMouth || sourceKey !== mouthRendererKey) return new Set<number>()
      mouthRendererSeen = true
      const mouthSlot = slots.find((slot: any) => slot?.slot === profileMouth.materialSlot)
      const eyes = profileMouth.glbPrimitiveIndices?.eyes
      const mouths = profileMouth.glbPrimitiveIndices?.mouth
      const allIndices = [...(Array.isArray(eyes) ? eyes : []), ...(Array.isArray(mouths) ? mouths : [])]
      if (!mouthSlot || mouthSlot.adapterId !== 'mx-character-eyemouth'
        || !Number.isInteger(profileMouth.materialSlot) || profileMouth.materialSlot < 0
        || !Array.isArray(eyes) || !Array.isArray(mouths) || !mouths.length
        || !allIndices.every((index: unknown) => typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < mesh.primitives.length)
        || new Set(allIndices).size !== allIndices.length
        || new Set(eyes).size !== eyes.length || new Set(mouths).size !== mouths.length
        || eyes.some((index: number) => mouths.includes(index))) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} has no exact derived mouth primitive binding.`)
      }
      const slotBinding = mouthSlot.glb
      const expectedSlotIndices = eyes.length ? eyes : mouths
      if (!slotBinding || !Array.isArray(slotBinding.primitiveIndices)
        || stable(slotBinding.primitiveIndices) !== stable(expectedSlotIndices)
        || !Array.isArray(slotBinding.materialIndices)
        || slotBinding.materialIndices.length !== expectedSlotIndices.length
        || stable(slotBinding.materialIndices) !== stable(expectedSlotIndices.map(index => mesh.primitives[index]?.material))) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} mouth source slot binding disagrees with its derived primitive record.`)
      }
      if (!Number.isInteger(profileMouth.glbMaterialIndex)) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} has no exact mouth atlas material binding.`)
      }
      const mouthMaterial = json!.materials?.[profileMouth.glbMaterialIndex]
      const mouthSourceKey = (reference: any) => profileReferenceKey(reference)
      const mouthOutputBinding = mouthMaterial?.extras?.chibi?.mouthProfileBinding
      if (!mouthMaterial?.extras?.mouthAtlas || !mouthMaterial?.extras?.mouthTiles
        || mouthSourceKey(mouthOutputBinding?.sourceRendererReference) !== mouthRendererKey
        || mouthOutputBinding?.materialSlot !== profileMouth.materialSlot) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} has no exact mouth atlas provenance.`)
      }
      for (const primitiveIndex of mouths) {
        const primitive = mesh.primitives[primitiveIndex]
        if (!primitive || primitive.material !== profileMouth.glbMaterialIndex
          || !Number.isInteger(primitive.attributes?.POSITION) || !Number.isInteger(primitive.indices)) {
          throw new Error(`Core renderer ${renderer.hierarchyPath} has an invalid derived mouth primitive.`)
        }
      }
      return new Set<number>(mouths)
    }
    for (const renderer of renderingProfile.renderers) {
      const sourceKey = profileReferenceKey(renderer?.sourceReference)
      if (!sourceKey || excludedReferences.has(sourceKey) || includedReferences.has(sourceKey)
        || !renderer?.hierarchyPath || !Number.isInteger(renderer?.glbNodeIndex)) {
        throw new Error(`Core renderer ${renderer?.name ?? '(unnamed)'} has no unique exact source/GLB binding.`)
      }
      const nodeIndex = renderer.glbNodeIndex
      if (includedNodes.has(nodeIndex)) throw new Error(`Core renderer ${renderer.hierarchyPath} shares a GLB node binding.`)
      const node = json!.nodes?.[nodeIndex]
      if (!node || !Number.isInteger(node.mesh) || paths[nodeIndex] !== renderer.hierarchyPath) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} is missing its exact GLB node binding.`)
      }
      const sourceRenderer = node.extras?.chibi?.sourceRenderer
      if (profileReferenceKey(sourceRenderer?.sourceReference) !== sourceKey
        || sourceRenderer?.defaultVisible !== renderer.defaultVisible
        || profileReferenceKey(sourceRenderer?.sourceMeshReference) !== profileReferenceKey(renderer.sourceMesh?.sourceReference)
        || stable(sourceRenderer?.sourceMeshBuiltinResource ?? null) !== stable(renderer.sourceMesh?.builtinResource ?? null)) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} lost its exact source provenance.`)
      }
      const mesh = json!.meshes?.[node.mesh]
      const slots = renderer.materialSlots
      if (!mesh || !Array.isArray(mesh.primitives) || !Array.isArray(slots) || !slots.length) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} has no exact material-slot bindings.`)
      }
      const derivedMouthPrimitives = validateMouthDerivedBinding(renderer, slots, mesh, sourceKey)
      const claimedPrimitives = new Map<number, string>()
      for (const primitiveIndex of derivedMouthPrimitives) {
        claimedPrimitives.set(primitiveIndex, `mouth:${sourceKey}`)
      }
      for (const slot of slots) {
        const materialKey = profileReferenceKey(slot?.sourceMaterialReference)
        const binding = slot?.glb
        if (!materialKey || typeof slot.sourceMaterialName !== 'string' || !binding
          || binding.nodeIndex !== nodeIndex || binding.meshIndex !== node.mesh
          || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
          || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length
          || binding.materialIndex !== binding.materialIndices[0]) {
          throw new Error(`Core renderer ${renderer.hierarchyPath} slot ${slot?.slot ?? '(unnamed)'} has no exact GLB binding.`)
        }
        for (const [offset, primitiveIndex] of binding.primitiveIndices.entries()) {
          const primitive = mesh.primitives[primitiveIndex]
          const materialIndex = binding.materialIndices[offset]
          const material = json!.materials?.[materialIndex]
          if (derivedMouthPrimitives.has(primitiveIndex)) {
            if (sourceKey !== mouthRendererKey || slot.slot !== profileMouth?.materialSlot
              || primitive.material !== profileMouth?.glbMaterialIndex) {
              throw new Error(`Core renderer ${renderer.hierarchyPath} has a derived mouth primitive claimed by a non-mouth source slot.`)
            }
            const prior = claimedPrimitives.get(primitiveIndex)
            const mouthClaim = `mouth:${sourceKey}`
            if (prior && prior !== mouthClaim) throw new Error(`Core renderer ${renderer.hierarchyPath} has conflicting primitive material claims.`)
            claimedPrimitives.set(primitiveIndex, mouthClaim)
            continue
          }
          if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex
            || !material || material.name !== slot.sourceMaterialName
            || profileReferenceKey(material.extras?.chibi?.sourceMaterialReference) !== materialKey) {
            throw new Error(`Core renderer ${renderer.hierarchyPath} slot ${slot.slot} lost its exact material provenance.`)
          }
          const metadata = material.extras?.chibi
          const expectedSlotKey = `${sourceKey}#${slot.slot}`
          const materialClaims = expectedMaterialClaims.get(materialIndex) ?? new Set<string>()
          materialClaims.add(expectedSlotKey)
          expectedMaterialClaims.set(materialIndex, materialClaims)
          const embeddedClaims = Array.isArray(metadata?.renderingProfileSlots)
            ? metadata.renderingProfileSlots
            : metadata?.renderingProfileSlot ? [metadata.renderingProfileSlot] : []
          const drawRank = Math.max(0, renderingProfile.drawSequence.indexOf(sourceKey))
          if (!metadata || !embeddedClaims.includes(expectedSlotKey)
            || metadata.alphaMode !== slot.renderState?.alphaMode
            || metadata.depthWrite !== slot.renderState?.depthWrite
            || metadata.depthTest !== slot.renderState?.depthTest
            || metadata.depthFunction !== slot.renderState?.depthFunction
            || metadata.cullMode !== slot.renderState?.cullMode
            || metadata.doubleSided !== slot.renderState?.doubleSided
            || metadata.drawLayer !== slot.renderState?.layer
            || metadata.renderOrder !== (slot.renderState?.layer === 'transparent' ? 10000 : 0) + drawRank
            || metadata.polygonOffsetFactor !== slot.renderState?.polygonOffsetFactor
            || metadata.polygonOffsetUnits !== slot.renderState?.polygonOffsetUnits
            || stable(metadata.blend ?? null) !== stable(slot.renderState?.blend ?? null)
            || material.alphaMode !== slot.renderState?.alphaMode
            || material.doubleSided !== slot.renderState?.doubleSided) {
            throw new Error(`Core renderer ${renderer.hierarchyPath} slot ${slot.slot} lost its exact visibility or render-state metadata.`)
          }
          const prior = claimedPrimitives.get(primitiveIndex)
          if (prior && prior !== materialKey) throw new Error(`Core renderer ${renderer.hierarchyPath} has conflicting primitive material claims.`)
          claimedPrimitives.set(primitiveIndex, materialKey)
        }
      }
      if (claimedPrimitives.size !== mesh.primitives.length) {
        throw new Error(`Core renderer ${renderer.hierarchyPath} has omitted or unbound GLB primitives.`)
      }
      includedReferences.add(sourceKey)
      includedNodes.add(nodeIndex)
    }
    for (const [materialIndex, expectedClaims] of expectedMaterialClaims) {
      const metadata = json.materials?.[materialIndex]?.extras?.chibi
      const embeddedClaims = Array.isArray(metadata?.renderingProfileSlots)
        ? metadata.renderingProfileSlots
        : metadata?.renderingProfileSlot ? [metadata.renderingProfileSlot] : []
      const sortedExpectedClaims = [...expectedClaims].sort()
      const sortedEmbeddedClaims = [...embeddedClaims].sort()
      if (new Set(embeddedClaims).size !== embeddedClaims.length
        || stable(embeddedClaims) !== stable(sortedEmbeddedClaims)
        || stable(sortedEmbeddedClaims) !== stable(sortedExpectedClaims)) {
        throw new Error(`GLB material ${materialIndex} has incomplete or conflicting source slot claims.`)
      }
    }
    if (profileMouth && !mouthRendererSeen) {
      throw new Error('Embedded rendering profile mouth binding does not target an included core renderer.')
    }
    if (!Array.isArray(renderingProfile.drawSequence)
      || new Set(renderingProfile.drawSequence).size !== renderingProfile.drawSequence.length
      || renderingProfile.drawSequence.length !== includedReferences.size
      || renderingProfile.drawSequence.some((sourceKey: unknown) => typeof sourceKey !== 'string' || !includedReferences.has(sourceKey))) {
      throw new Error('Embedded rendering profile draw sequence does not cover exactly the core renderers.')
    }
    const expectedDrawSequence = [...renderingProfile.renderers].sort((left: any, right: any) => {
      const leftLayer = Math.max(...(left.materialSlots ?? []).map((slot: any) => slot.renderState?.layer === 'transparent' ? 1 : 0), 0)
      const rightLayer = Math.max(...(right.materialSlots ?? []).map((slot: any) => slot.renderState?.layer === 'transparent' ? 1 : 0), 0)
      return leftLayer - rightLayer || String(left.name).localeCompare(String(right.name))
    }).map((renderer: any) => profileReferenceKey(renderer.sourceReference))
    if (stable(renderingProfile.drawSequence) !== stable(expectedDrawSequence)) {
      throw new Error('Embedded rendering profile draw sequence is not deterministic for the core renderer set.')
    }
    // Equipment relations are source evidence, not presentation hints.  Keep
    // the profile/validation copies in lockstep and prove every structural
    // record against the exact core renderer and selected source assembly.
    // Older synthetic profiles do not carry this field; real v7 profiles do,
    // so the contract is strict once either copy is present.
    const equipmentEvidencePresent = renderingProfile.equipmentBindingEvidence !== undefined
      || renderingProfile.validation?.equipmentBindingEvidence !== undefined
    const blockersPresent = renderingProfile.coreRendererBlockers !== undefined
      || renderingProfile.validation?.coreRendererBlockers !== undefined
    const equipmentEvidence = renderingProfile.equipmentBindingEvidence
    const validationEquipmentEvidence = renderingProfile.validation?.equipmentBindingEvidence
    const coreBlockers = renderingProfile.coreRendererBlockers
    const validationCoreBlockers = renderingProfile.validation?.coreRendererBlockers
    const warningsPresent = renderingProfile.warnings !== undefined || renderingProfile.validation?.warnings !== undefined
    const profileWarnings = renderingProfile.warnings
    const validationWarnings = renderingProfile.validation?.warnings
    const coreGeometryWarnings = renderingProfile.coreGeometryWarnings
    const coreGeometryBlockersPresent = renderingProfile.coreGeometryBlockers !== undefined
      || renderingProfile.validation?.coreGeometryBlockers !== undefined
    const coreGeometryBlockers = renderingProfile.coreGeometryBlockers
    const validationCoreGeometryBlockers = renderingProfile.validation?.coreGeometryBlockers
    if (coreGeometryBlockersPresent && (!Array.isArray(coreGeometryBlockers) || !Array.isArray(validationCoreGeometryBlockers)
      || stable(coreGeometryBlockers) !== stable(validationCoreGeometryBlockers))) {
      throw new Error('Embedded core-geometry blockers do not match their validation records.')
    }
    if (Array.isArray(coreGeometryBlockers) && coreGeometryBlockers.length) {
      throw new Error('Embedded rendering profile contains unresolved core-geometry blockers.')
    }
    const blockerKeys = new Set((Array.isArray(coreBlockers) ? coreBlockers : [])
      .map((blocker: any) => profileReferenceKey(blocker?.sourceReference)))
    if (warningsPresent && (!Array.isArray(profileWarnings) || !Array.isArray(validationWarnings)
      || stable(profileWarnings) !== stable(validationWarnings))) {
      throw new Error('Embedded rendering profile arrangement warnings do not match their validation records.')
    }
    if (Array.isArray(profileWarnings) && profileWarnings.length
      && (!renderingProfile.assembly || !Array.isArray(renderingProfile.assembly.renderers))) {
      throw new Error('Embedded arrangement warnings have no exact source assembly renderer records.')
    }
    if (equipmentEvidencePresent) {
      if (!Array.isArray(equipmentEvidence) || !Array.isArray(validationEquipmentEvidence)
        || stable(equipmentEvidence) !== stable(validationEquipmentEvidence)) {
        throw new Error('Embedded rendering profile equipment-binding evidence does not match its validation records.')
      }
    }
    if (blockersPresent) {
      if (!Array.isArray(coreBlockers) || !Array.isArray(validationCoreBlockers)
        || stable(coreBlockers) !== stable(validationCoreBlockers)) {
        throw new Error('Embedded rendering profile core-renderer blockers do not match its validation records.')
      }
      if (coreBlockers.length || renderingProfile.validation.unresolved.length) {
        throw new Error('Embedded rendering profile contains unresolved core-renderer blockers.')
      }
    }
    if (equipmentEvidencePresent) {
      const exactReferenceKey = (reference: any, label: string) => {
        if (!reference || typeof reference !== 'object'
          || typeof reference.bundleSha256 !== 'string' || !reference.bundleSha256
          || typeof reference.serializedFile !== 'string' || !reference.serializedFile
          || typeof reference.objectId !== 'string' || !reference.objectId) {
          throw new Error(`${label} has no exact full source identity.`)
        }
        return profileReferenceKey(reference)
      }
      const referenceListKeys = (value: unknown, label: string, allowDuplicates = false) => {
        if (!Array.isArray(value)) throw new Error(`${label} is not an exact source-reference array.`)
        const keys = value.map((reference, index) => exactReferenceKey(reference, `${label}[${index}]`))
        if (!allowDuplicates && new Set(keys).size !== keys.length) throw new Error(`${label} contains duplicate source identities.`)
        return [...keys].sort()
      }
      function pointerKey(value: any, label: string): string
      function pointerKey(value: any, label: string, nullable: true): string | null
      function pointerKey(value: any, label: string, nullable = false): string | null {
        if (value === null || value === undefined) {
          if (nullable) return null
          throw new Error(`${label} is missing its exact source pointer.`)
        }
        if (typeof value !== 'object' || typeof value.file !== 'string' || !value.file
          || typeof value.pathId !== 'string' || !value.pathId || typeof value.name !== 'string' || !value.name) {
          throw new Error(`${label} is not an exact source pointer.`)
        }
        return `${value.file.replaceAll('\\', '/').toLowerCase()}:${value.pathId}:${value.name.trim()}`
      }
      const pointerListKeys = (value: unknown, label: string) => {
        if (!Array.isArray(value)) throw new Error(`${label} is not an exact source-pointer array.`)
        const keys = value.map((pointer, index) => pointerKey(pointer, `${label}[${index}]`))
        if (new Set(keys).size !== keys.length) throw new Error(`${label} contains duplicate source pointers.`)
        return keys
      }
      const exactSourcePointerKey = (value: any, label: string, expectedSourceReference?: any) => {
        const serializedPointerKey = pointerKey(value, label)
        const sourceReference = value?.sourceReference
        const sourceKey = exactReferenceKey(sourceReference, `${label} sourceReference`)
        if (expectedSourceReference
          && (sourceReference.bundleSha256.toLowerCase() !== String(expectedSourceReference.bundleSha256).toLowerCase()
            || String(sourceReference.serializedFile).replaceAll('\\', '/').toLowerCase()
              !== String(expectedSourceReference.serializedFile).replaceAll('\\', '/').toLowerCase())) {
          throw new Error(`${label} does not retain the renderer's exact source bundle/file identity.`)
        }
        if (value.file.replaceAll('\\', '/').toLowerCase()
          !== String(sourceReference.serializedFile).replaceAll('\\', '/').toLowerCase()
          || value.pathId !== sourceReference.objectId) {
          throw new Error(`${label} source identity disagrees with its serialized pointer.`)
        }
        return `${sourceKey}:${serializedPointerKey}`
      }
      const exactSourcePointerListKeys = (value: unknown, label: string, expectedSourceReference: any) => {
        if (!Array.isArray(value)) throw new Error(`${label} is not an exact full-source pointer array.`)
        const keys = value.map((pointer, index) => exactSourcePointerKey(pointer, `${label}[${index}]`, expectedSourceReference))
        if (!keys.length) throw new Error(`${label} is empty.`)
        const sourceKeys = value.map((pointer, index) => exactReferenceKey(pointer?.sourceReference, `${label}[${index}] sourceReference`))
        if (new Set(keys).size !== keys.length || new Set(sourceKeys).size !== sourceKeys.length) {
          throw new Error(`${label} contains duplicate full-source pointers.`)
        }
        return keys
      }
      const sourceScopeKey = (reference: any, label: string) => {
        exactReferenceKey(reference, label)
        return `${String(reference.bundleSha256).toLowerCase()}:${String(reference.serializedFile).replaceAll('\\', '/').toLowerCase()}`
      }
      const assemblyPointerIdentityKey = (value: any, label: string) => {
        const sourceReference = value?.sourceReference
        return sourceReference
          ? `source:${exactReferenceKey(sourceReference, `${label} sourceReference`)}`
          : `pointer:${pointerKey(value, label)}`
      }
      const attachmentKeys = new Set<string>()
      const attachmentPointers: string[] = []
      const attachments = renderingProfile.assembly?.attachments ?? {}
      for (const key of ['equipmentRendererReferences', 'weaponRendererReferences', 'mainWeaponRendererReferences', 'subWeaponRendererReferences', 'accessoryRendererReferences']) {
        const values = attachments[key]
        if (values === undefined) continue
        if (!Array.isArray(values)) throw new Error(`Embedded rendering profile attachment ${key} is not an array.`)
        for (const [index, reference] of values.entries()) attachmentKeys.add(exactReferenceKey(reference, `Attachment ${key}[${index}]`))
      }
      for (const key of ['mainWeapon', 'subWeapon']) {
        const values = attachments[key]
        if (values === undefined) continue
        attachmentPointers.push(...pointerListKeys(values, `Attachment ${key}`))
      }
      const assemblyByReference = new Map<string, any[]>()
      for (const assemblyRenderer of renderingProfile.assembly?.renderers ?? []) {
        const sourceKey = profileReferenceKey(assemblyRenderer?.sourceReference)
        if (!sourceKey) continue
        const records = assemblyByReference.get(sourceKey) ?? []
        records.push(assemblyRenderer)
        assemblyByReference.set(sourceKey, records)
      }
      const sortedEvidence = [...(equipmentEvidence as any[])].sort((left, right) =>
        profileReferenceKey(left?.sourceReference).localeCompare(profileReferenceKey(right?.sourceReference))
          || String(left?.classification ?? '').localeCompare(String(right?.classification ?? ''))
          || String(left?.reasonCode ?? '').localeCompare(String(right?.reasonCode ?? '')))
      if (stable(equipmentEvidence) !== stable(sortedEvidence)) {
        throw new Error('Embedded rendering profile equipment-binding evidence is not in deterministic source order.')
      }
      const seenEvidence = new Set<string>()
      const equipmentBlockerKeys = new Set((coreBlockers ?? []).map((blocker: any, index: number) =>
        exactReferenceKey(blocker?.sourceReference, `Core renderer blocker ${index}`)))
      const excludedKeys = new Set((renderingProfile.excludedRenderers ?? []).map((renderer: any) => profileReferenceKey(renderer?.sourceReference)))
      for (const [index, evidence] of (equipmentEvidence as any[]).entries()) {
        if (!evidence || typeof evidence !== 'object') throw new Error(`Embedded equipment-binding evidence ${index} is not a record.`)
        const sourceKey = exactReferenceKey(evidence.sourceReference, `Equipment-binding evidence ${index}`)
        if (seenEvidence.has(sourceKey)) throw new Error(`Embedded equipment-binding evidence is duplicated for ${sourceKey}.`)
        seenEvidence.add(sourceKey)
        const classification = evidence.classification
        const expectedReasonCode = classification === 'exact-equipment-renderer'
          ? ['EXACT_EQUIPMENT_RENDERER_REFERENCE']
          : classification === 'exact-main-sub-equipment'
            ? ['EXACT_MAIN_SUB_ATTACHMENT_POINTER']
            : classification === 'structurally-bound-equipment'
              ? ['STRUCTURAL_TRANSFORM_BONE_ANCESTRY', 'EXACT_SOURCE_WEAPON_ANCESTRY'] : []
        if (!expectedReasonCode.includes(evidence.reasonCode)
          || typeof evidence.reason !== 'string' || !evidence.reason
          || typeof evidence.name !== 'string' || !evidence.name
          || (evidence.hierarchyPath !== null && typeof evidence.hierarchyPath !== 'string')
          || !Array.isArray(evidence.evidence) || evidence.evidence.length === 0
          || evidence.evidence.some((item: unknown) => typeof item !== 'string' || !item)) {
          throw new Error(`Embedded equipment-binding evidence ${sourceKey} is incomplete or has an invalid classification.`)
        }
        const exactSourceWeaponAncestry = classification === 'structurally-bound-equipment'
          && evidence.reasonCode === 'EXACT_SOURCE_WEAPON_ANCESTRY'
        if (excludedKeys.has(sourceKey) || equipmentBlockerKeys.has(sourceKey) || !includedReferences.has(sourceKey)) {
          throw new Error(`Embedded equipment-binding evidence ${sourceKey} conflicts with core/excluded renderer classification.`)
        }
        const renderer = renderingProfile.renderers.find((item: any) => profileReferenceKey(item?.sourceReference) === sourceKey)
        const assemblyMatches = assemblyByReference.get(sourceKey) ?? []
        if (!renderer || assemblyMatches.length !== 1) {
          throw new Error(`Embedded equipment-binding evidence ${sourceKey} does not identify exactly one core renderer and source assembly renderer.`)
        }
        const assemblyRenderer = assemblyMatches[0]
        if (renderer.name !== evidence.name || (renderer.hierarchyPath ?? null) !== evidence.hierarchyPath
          || assemblyRenderer.name !== evidence.name || (assemblyRenderer.hierarchyPath ?? null) !== evidence.hierarchyPath) {
          throw new Error(`Embedded equipment-binding evidence ${sourceKey} disagrees with its exact renderer identity.`)
        }
        if (classification === 'structurally-bound-equipment'
          && (renderer.rendererType !== 'SkinnedMeshRenderer' || assemblyRenderer.rendererType !== 'SkinnedMeshRenderer')) {
          throw new Error(`Embedded structural equipment evidence ${sourceKey} is not backed by source/exported skinned renderers.`)
        }
        const evidenceMaterialKeys = referenceListKeys(evidence.sourceMaterialReferences, `Equipment-binding evidence ${sourceKey} source materials`, true)
        const evidenceShaderKeys = referenceListKeys(evidence.sourceShaderReferences, `Equipment-binding evidence ${sourceKey} source shaders`, true)
        const rendererMaterialKeys = referenceListKeys((renderer.materialSlots ?? []).map((slot: any) => slot?.sourceMaterialReference).filter(Boolean), `Core renderer ${sourceKey} source materials`, true)
        const rendererShaderKeys = referenceListKeys((renderer.materialSlots ?? []).map((slot: any) => slot?.sourceShaderReference).filter(Boolean), `Core renderer ${sourceKey} source shaders`, true)
        if (stable(evidenceMaterialKeys) !== stable(rendererMaterialKeys)
          || stable(evidenceShaderKeys) !== stable(rendererShaderKeys)) {
          throw new Error(`Embedded equipment evidence ${sourceKey} disagrees with core material or shader identities.`)
        }
        if (classification === 'structurally-bound-equipment'
          && (!evidenceMaterialKeys.length || !evidenceShaderKeys.length)) {
          throw new Error(`Embedded structural equipment evidence ${sourceKey} disagrees with core material or shader identities.`)
        }
        const sourceMeshKey = evidence.sourceMeshReference === null || evidence.sourceMeshReference === undefined
          ? null : exactReferenceKey(evidence.sourceMeshReference, `Equipment-binding evidence ${sourceKey} source mesh`)
        const rendererMeshKey = renderer.sourceMesh?.sourceReference
          ? exactReferenceKey(renderer.sourceMesh.sourceReference, `Core renderer ${sourceKey} source mesh`) : null
        const assemblyMeshKey = assemblyRenderer.meshSourceReference
          ? exactReferenceKey(assemblyRenderer.meshSourceReference, `Assembly renderer ${sourceKey} source mesh`) : null
        if (classification === 'structurally-bound-equipment') {
          if (!sourceMeshKey || sourceMeshKey !== rendererMeshKey || sourceMeshKey !== assemblyMeshKey) {
            throw new Error(`Embedded structural equipment evidence ${sourceKey} disagrees with source mesh identity.`)
          }
          if (!renderer.sourceMesh || !assemblyRenderer.mesh
            || assemblyRenderer.mesh.pathId !== evidence.sourceMeshReference.objectId
            || String(assemblyRenderer.mesh.file ?? '').replaceAll('\\', '/').toLowerCase()
              !== String(evidence.sourceMeshReference.serializedFile).replaceAll('\\', '/').toLowerCase()) {
            throw new Error(`Embedded structural equipment evidence ${sourceKey} disagrees with source mesh pointer identity.`)
          }
          if (attachmentKeys.has(sourceKey)) throw new Error(`Embedded structural equipment evidence ${sourceKey} duplicates an exact equipment attachment.`)
          const rootBone = pointerKey(evidence.rootBone, `Embedded structural equipment evidence ${sourceKey} rootBone`)
          const assemblyRootBone = pointerKey(assemblyRenderer.rootBone, `Assembly renderer ${sourceKey} rootBone`)
          const transformChain = pointerListKeys(evidence.transformChain, `Embedded structural equipment evidence ${sourceKey} transformChain`)
          const assemblyTransformChain = pointerListKeys(assemblyRenderer.transformChain ?? [], `Assembly renderer ${sourceKey} transformChain`)
          const boneReferences = pointerListKeys(evidence.boneReferences, `Embedded structural equipment evidence ${sourceKey} boneReferences`)
          const assemblyBoneReferences = pointerListKeys(assemblyRenderer.boneReferences ?? [], `Assembly renderer ${sourceKey} boneReferences`)
          if ((!exactSourceWeaponAncestry && (!transformChain.length || !boneReferences.length))
            || rootBone !== assemblyRootBone
            || stable(transformChain) !== stable(assemblyTransformChain)
            || stable(boneReferences) !== stable(assemblyBoneReferences)) {
            throw new Error(`Embedded structural equipment evidence ${sourceKey} disagrees with source transform/bone identities.`)
          }
          const matchedAncestors = pointerListKeys(evidence.matchedAncestorPointers, `Embedded structural equipment evidence ${sourceKey} matched ancestors`)
          const sourcePointers = new Set([rootBone, ...transformChain, ...boneReferences])
          if (!matchedAncestors.length || (!exactSourceWeaponAncestry && matchedAncestors.some(pointer => !sourcePointers.has(pointer)))) {
            throw new Error(`Embedded structural equipment evidence ${sourceKey} has an invalid matched ancestor.`)
          }
          const bodyKeys = referenceListKeys(evidence.bodyRendererReferences, `Embedded structural equipment evidence ${sourceKey} body renderers`)
          if (exactSourceWeaponAncestry) {
            const ancestry = (evidence as any).rootBoneAncestry
            const assemblyAncestry = assemblyRenderer.rootBoneAncestry
            if (!renderingProfile.assembly?.prefabReference
              || sourceScopeKey(renderingProfile.assembly.prefabReference, `Embedded exact source weapon evidence ${sourceKey} prefabReference`)
                !== sourceScopeKey(evidence.sourceReference, `Embedded exact source weapon evidence ${sourceKey} sourceReference`)) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} does not retain the selected prefab source identity.`)
            }
            if (assemblyRenderer.rootBoneAncestryComplete !== true
              || !Array.isArray(assemblyAncestry)) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} has no complete source parent chain in the assembly.`)
            }
            exactSourcePointerKey(
              assemblyRenderer.rootBone,
              `Assembly renderer ${sourceKey} rootBone`,
              evidence.sourceReference,
            )
            const ancestryKeys = exactSourcePointerListKeys(
              ancestry,
              `Embedded exact source weapon evidence ${sourceKey} rootBoneAncestry`,
              evidence.sourceReference,
            )
            const assemblyAncestryKeys = exactSourcePointerListKeys(
              assemblyAncestry,
              `Assembly renderer ${sourceKey} rootBoneAncestry`,
              evidence.sourceReference,
            )
            if (stable(ancestryKeys) !== stable(assemblyAncestryKeys)) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} disagrees with the assembly source parent chain.`)
            }
            if (matchedAncestors.length !== 1) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} does not identify one matched weapon ancestor.`)
            }
            for (const [matchedIndex, pointer] of evidence.matchedAncestorPointers.entries()) {
              if (pointer?.sourceReference) {
                exactSourcePointerKey(
                  pointer,
                  `Embedded exact source weapon evidence ${sourceKey} matched ancestor ${matchedIndex}`,
                  evidence.sourceReference,
                )
              }
            }
            const matchedAssemblyPointers = assemblyAncestry.filter((pointer: any) =>
              pointerKey(pointer, `Assembly renderer ${sourceKey} rootBoneAncestry pointer`) === matchedAncestors[0])
            if (matchedAssemblyPointers.length !== 1) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} matched ancestor is not in the exact source parent chain.`)
            }
            const matchedAssemblyPointerKey = exactSourcePointerKey(
              matchedAssemblyPointers[0],
              `Assembly renderer ${sourceKey} matched ancestor`,
              evidence.sourceReference,
            )
            const authoredPointers: Array<{ kind: string; pointer: any; key: string }> = []
            for (const kind of ['mainWeapon', 'subWeapon']) {
              const values = attachments[kind]
              if (values === undefined) continue
              if (!Array.isArray(values)) {
                throw new Error(`Embedded exact source weapon evidence ${sourceKey} attachment ${kind} is not an exact pointer array.`)
              }
              for (const [pointerIndex, pointer] of values.entries()) {
                authoredPointers.push({
                  kind,
                  pointer,
                  key: exactSourcePointerKey(pointer, `Attachment ${kind}[${pointerIndex}]`, evidence.sourceReference),
                })
              }
            }
            const authoredKeys = authoredPointers.map(item => item.key)
            const authoredSourceKeys = authoredPointers.map((item, pointerIndex) =>
              exactReferenceKey(item.pointer?.sourceReference, `Embedded exact source weapon evidence ${sourceKey} authored pointer ${pointerIndex} sourceReference`))
            if (!authoredKeys.length || new Set(authoredKeys).size !== authoredKeys.length
              || new Set(authoredSourceKeys).size !== authoredSourceKeys.length) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} has duplicate or missing authored weapon pointers.`)
            }
            const ancestryAuthoredMatches = assemblyAncestry.flatMap((pointer: any, pointerIndex: number) => {
              const ancestryPointerKey = exactSourcePointerKey(
                pointer,
                `Assembly renderer ${sourceKey} rootBoneAncestry[${pointerIndex}]`,
                evidence.sourceReference,
              )
              const matches = authoredPointers.filter(item => item.key === ancestryPointerKey)
              return matches.length ? [{ ancestryPointerKey, matches }] : []
            })
            if (ancestryAuthoredMatches.length !== 1 || ancestryAuthoredMatches[0].matches.length !== 1
              || ancestryAuthoredMatches[0].ancestryPointerKey !== matchedAssemblyPointerKey) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} does not preserve a unique authored mainWeapon/subWeapon ancestor match.`)
            }
            const exactClaim = 'body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique'
            const uniqueClaim = 'unique non-conflicting full-source weapon ancestor relation'
            if (!evidence.evidence.includes(uniqueClaim)) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} is missing its unique full-source ancestry claim.`)
            }
            if (!evidence.evidence.includes(exactClaim)) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} is missing its non-conflicting body m_Bones claim.`)
            }
            const matchedPointer = matchedAssemblyPointers[0]
            const structuralPointers = [
              assemblyRenderer.rootBone,
              ...(assemblyRenderer.transformChain ?? []),
              ...assemblyAncestry,
              ...(assemblyRenderer.boneReferences ?? []),
            ].filter(Boolean)
            const structuralPointerKeys = new Set(structuralPointers.map((pointer: any, pointerIndex: number) =>
              assemblyPointerIdentityKey(pointer, `Assembly renderer ${sourceKey} structural pointer ${pointerIndex}`)))
            const bodyOverlapCount = bodyKeys.reduce((count, bodyKey) => {
              const bodyAssembly = (assemblyByReference.get(bodyKey) ?? [])[0]
              const bodyBoneKeys = (bodyAssembly?.boneReferences ?? []).map((pointer: any, pointerIndex: number) =>
                assemblyPointerIdentityKey(pointer, `Body renderer ${bodyKey} bone pointer ${pointerIndex}`))
              return count + (bodyBoneKeys.some((key: string) => structuralPointerKeys.has(key)) ? 1 : 0)
            }, 0)
            if ((bodyKeys.length && bodyOverlapCount !== bodyKeys.length) || bodyKeys.length > 1) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} has an invalid or conflicting body m_Bones relation.`)
            }
            const matchedPointerKey = assemblyPointerIdentityKey(matchedPointer, `Assembly renderer ${sourceKey} matched ancestor`)
            const matchedSerializedPointerKey = pointerKey(matchedPointer, `Assembly renderer ${sourceKey} matched ancestor`)
            const bodyMatchedConflict = bodyKeys.some(bodyKey => {
              const bodyAssembly = (assemblyByReference.get(bodyKey) ?? [])[0]
              return (bodyAssembly?.boneReferences ?? []).some((pointer: any, pointerIndex: number) => {
                const label = `Body renderer ${bodyKey} bone pointer ${pointerIndex}`
                return assemblyPointerIdentityKey(pointer, label) === matchedPointerKey
                  || pointerKey(pointer, label) === matchedSerializedPointerKey
              })
            })
            if (bodyMatchedConflict) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} conflicts with a body m_Bones ancestor.`)
            }
            const relationPointerKeys = new Set([
              assemblyPointerIdentityKey(assemblyRenderer.rootBone, `Assembly renderer ${sourceKey} rootBone`),
              matchedPointerKey,
            ])
            const relationSerializedPointerKeys = new Set([
              pointerKey(assemblyRenderer.rootBone, `Assembly renderer ${sourceKey} rootBone`),
              matchedSerializedPointerKey,
            ])
            const competingRenderer = (renderingProfile.assembly?.renderers ?? []).find((other: any) => {
              if (other === assemblyRenderer || other?.visible === false || other?.rendererType !== 'SkinnedMeshRenderer') return false
              const otherSourceKey = profileReferenceKey(other?.sourceReference)
              if (attachmentKeys.has(otherSourceKey)) return false
              return [other.rootBone, ...(other.transformChain ?? []), ...(other.rootBoneAncestry ?? []), ...(other.boneReferences ?? [])]
                .filter(Boolean)
                .some((pointer: any, pointerIndex: number) => {
                  const label = `Competing renderer ${otherSourceKey} pointer ${pointerIndex}`
                  return relationPointerKeys.has(assemblyPointerIdentityKey(pointer, label))
                    || relationSerializedPointerKeys.has(pointerKey(pointer, label))
                })
            })
            if (competingRenderer) {
              throw new Error(`Embedded exact source weapon evidence ${sourceKey} has a conflicting renderer on its weapon ancestor.`)
            }
          }
          const noBodyOverlapClaim = evidence.evidence.includes('body m_Bones overlap: none; source hierarchy independently corroborates movement')
            || evidence.evidence.includes('body m_Bones overlap: none or non-conflicting; exact source weapon ancestry remains unique')
            || (evidence.evidence.includes('body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement')
              && evidence.evidence.includes('unique non-conflicting same-prefab shared m_Bones relation'))
          const invalidBodyRenderer = bodyKeys.some(bodyKey => {
            const bodyRenderer = renderingProfile.renderers.find((item: any) => profileReferenceKey(item?.sourceReference) === bodyKey)
            const bodyAssemblyMatches = assemblyByReference.get(bodyKey) ?? []
            return bodyKey === sourceKey || !includedReferences.has(bodyKey) || excludedKeys.has(bodyKey) || blockerKeys.has(bodyKey)
              || bodyRenderer?.rendererType !== 'SkinnedMeshRenderer'
              || bodyAssemblyMatches.length !== 1 || bodyAssemblyMatches[0]?.rendererType !== 'SkinnedMeshRenderer'
          })
          if ((!bodyKeys.length && !noBodyOverlapClaim) || invalidBodyRenderer) {
            throw new Error(`Embedded structural equipment evidence ${sourceKey} has an invalid body-renderer relation.`)
          }
        } else {
          if (sourceMeshKey !== rendererMeshKey
            || (assemblyMeshKey && assemblyMeshKey !== sourceMeshKey)) {
            throw new Error(`Embedded equipment evidence ${sourceKey} disagrees with its core source mesh identity.`)
          }
          if (sourceMeshKey && (!renderer.sourceMesh
            || renderer.sourceMesh.pathId !== evidence.sourceMeshReference.objectId
            || String(renderer.sourceMesh.file ?? '').replaceAll('\\', '/').toLowerCase()
              !== String(evidence.sourceMeshReference.serializedFile).replaceAll('\\', '/').toLowerCase()
            || (assemblyRenderer.mesh && (assemblyRenderer.mesh.pathId !== evidence.sourceMeshReference.objectId
              || String(assemblyRenderer.mesh.file ?? '').replaceAll('\\', '/').toLowerCase()
                !== String(evidence.sourceMeshReference.serializedFile).replaceAll('\\', '/').toLowerCase())))) {
            throw new Error(`Embedded equipment evidence ${sourceKey} disagrees with its source mesh pointer identity.`)
          }
        }
        if (classification === 'exact-equipment-renderer' && !attachmentKeys.has(sourceKey)) {
          throw new Error(`Embedded exact equipment evidence ${sourceKey} is not backed by an exact equipment renderer reference.`)
        }
        if (classification === 'exact-main-sub-equipment') {
          const relationPointers = [evidence.rootBone, ...(evidence.transformChain ?? []), ...(evidence.boneReferences ?? [])]
            .filter((pointer: any) => pointer !== null && pointer !== undefined)
            .map((pointer: any, pointerIndex: number) => pointerKey(pointer, `Embedded exact equipment evidence ${sourceKey} pointer ${pointerIndex}`))
          if (!relationPointers.some(pointer => attachmentPointers.includes(pointer))) {
            throw new Error(`Embedded exact main/sub equipment evidence ${sourceKey} has no exact attachment pointer relation.`)
          }
        }
      }
    }
    if (renderingProfile.assembly && Array.isArray(renderingProfile.assembly.renderers)) {
      const assemblyByReference = new Map<string, any[]>()
      for (const assemblyRenderer of renderingProfile.assembly.renderers) {
        const sourceKey = profileReferenceKey(assemblyRenderer?.sourceReference)
        if (!sourceKey) continue
        const records = assemblyByReference.get(sourceKey) ?? []
        records.push(assemblyRenderer)
        assemblyByReference.set(sourceKey, records)
      }
      const expectedRendererReferences = new Set([...includedReferences, ...excludedReferences])
      for (const sourceKey of expectedRendererReferences) {
        const matches = assemblyByReference.get(sourceKey) ?? []
        if (matches.length !== 1) throw new Error(`Rendering profile source assembly does not retain exactly one renderer for ${sourceKey}.`)
        const renderer = renderingProfile.renderers.find((item: any) => profileReferenceKey(item.sourceReference) === sourceKey)
          ?? renderingProfile.excludedRenderers.find((item: any) => profileReferenceKey(item.sourceReference) === sourceKey)
        if (!renderer || matches[0].name !== renderer.name
          || (matches[0].hierarchyPath ?? null) !== (renderer.hierarchyPath ?? null)) {
          throw new Error(`Rendering profile source assembly identity disagrees with its core/exclusion record for ${sourceKey}.`)
        }
      }
      for (const [sourceKey] of assemblyByReference) {
        if (!expectedRendererReferences.has(sourceKey)) {
          const records = assemblyByReference.get(sourceKey) ?? []
          const ownerFile = String(records[0]?.sourceReference?.serializedFile ?? '').replaceAll('\\', '/').toLowerCase()
          const nullPointer = (pointer: any) => pointer?.pathId === '0' && !pointer.externalGuid && !pointer.builtinResource
            && String(pointer.file ?? '').replaceAll('\\', '/').toLowerCase() === ownerFile
          const inert = records.length === 1 && nullPointer(records[0].mesh)
            && (!records[0].materialSlots?.length || records[0].materialSlots.every((slot: any) =>
              !slot.sourceMaterialReference && nullPointer(slot.material)))
          if (!inert) throw new Error(`Rendering profile source assembly contains an unclassified renderer ${sourceKey}.`)
        }
      }

      if (Array.isArray(coreGeometryWarnings) && coreGeometryWarnings.length) {
        for (const warning of coreGeometryWarnings) {
          const key = profileReferenceKey(warning?.sourceReference)
          if (!includedReferences.has(key) || excludedReferences.has(key) || blockerKeys.has(key)) {
            throw new Error('Embedded core-geometry warning does not identify one fully validated required core renderer.')
          }
        }
      }

      if (warningsPresent) {
        const saoriSwimsuitWarningReferences = [
          '325bc4b3f67c1fe59260ca66cb5068d109c193dc4a662e77c8c2084f56063ffd:cab-e9f5532a8838fb49b9656938014567f9:-1127309643643137231',
          '325bc4b3f67c1fe59260ca66cb5068d109c193dc4a662e77c8c2084f56063ffd:cab-e9f5532a8838fb49b9656938014567f9:-4763531541672078543',
        ]
        const isExactSaoriSwimsuitWarningPair = Array.isArray(profileWarnings)
          && profileWarnings.length === saoriSwimsuitWarningReferences.length
          && renderingProfile.sourceIdentity === 'ch0266'
          && renderingProfile.dependencyFingerprint === 'c2dda9fce74ba470a510e0cdab930844eff876ad62150254bcf3cefdfb495db9'
          && profileWarnings.every((warning: any, index: number) =>
            profileReferenceKey(warning?.blocker?.sourceReference) === saoriSwimsuitWarningReferences[index])
        const pinnedRigMountWarningConfigs = [
          {
            sourceIdentity: 'ch0268',
            dependencyFingerprint: '48bf217d3b63f6e6d1ccfd4e6b9fcbc9a92ce0704d7c503701950c850690bcb9',
            prefabPath: 'Assets/_MX/AddressableAsset/Character/CH0268/Cafe/Cafe_CH0268.prefab',
            prefabReferenceKey: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29:cab-28951afa2d0662740094a0cdb63635f7:4139133509352740713',
            anchorReferenceKey: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29:cab-28951afa2d0662740094a0cdb63635f7:3815402648570287977',
            anchorName: 'Bip001_Weapon',
            members: [
              { key: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29:cab-28951afa2d0662740094a0cdb63635f7:-7191168882773665943', name: 'CH0268_Weapon', hierarchyPath: 'Cafe_CH0268/CH0268_Weapon' },
              { key: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29:cab-28951afa2d0662740094a0cdb63635f7:-6506255981981018263', name: 'CH0268_Rocket_Outline', hierarchyPath: 'Cafe_CH0268/CH0268_Rocket_Outline' },
            ],
          },
          {
            sourceIdentity: 'mari_original',
            dependencyFingerprint: 'c4532ac79bc6e4b80b4fa30eb8343b0ac825c4c74e74917562d106131805a71d',
            prefabPath: 'Assets/_MX/AddressableAsset/Character/Mari_Original/Cafe/Cafe_Mari_Original.prefab',
            prefabReferenceKey: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39:cab-68647aee163948facee663bf2f0fe149:-8182624225047119105',
            anchorReferenceKey: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39:cab-68647aee163948facee663bf2f0fe149:-1560163874218870017',
            anchorName: 'Bip001_Weapon',
            members: [
              { key: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39:cab-68647aee163948facee663bf2f0fe149:3069063790598322943', name: 'Mari_Original_Weapon', hierarchyPath: 'Cafe_Mari_Original/Mari_Original_Weapon' },
              { key: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39:cab-68647aee163948facee663bf2f0fe149:-269010879909496065', name: 'EX', hierarchyPath: 'Cafe_Mari_Original/EX' },
            ],
          },
        ]
        const pinnedRigMountWarningConfig = pinnedRigMountWarningConfigs.find(config =>
          renderingProfile.sourceIdentity === config.sourceIdentity
          && renderingProfile.dependencyFingerprint === config.dependencyFingerprint)
        const pinnedRigMountWarning = Array.isArray(profileWarnings) && profileWarnings.length === 1 ? profileWarnings[0] : null
        const pinnedRigMountAttachmentFields = [
          'mainWeapon', 'subWeapon', 'equipmentRenderers', 'equipmentRendererReferences',
          'weaponRendererReferences', 'mainWeaponRendererReferences', 'subWeaponRendererReferences',
          'accessoryRendererReferences', 'equipmentRendererAmbiguities',
        ]
        const pinnedRigMountAttachments = renderingProfile.assembly?.attachments ?? {}
        const noPinnedRigMountAuthoredAttachments = pinnedRigMountAttachmentFields.every(key => {
          const value = pinnedRigMountAttachments[key]
          return value === undefined || (Array.isArray(value) && value.length === 0)
        })
        const structuralGroups = pinnedRigMountAttachments.equipmentRendererGroups
        const exactStructuralGroups = structuralGroups === undefined
          || (Array.isArray(structuralGroups) && structuralGroups.length === 0)
          || (Array.isArray(structuralGroups) && structuralGroups.length === 1
            && structuralGroups[0]?.kind === 'structuralWeapon'
            && Array.isArray(structuralGroups[0]?.sourceReferences)
            && stable(structuralGroups[0].sourceReferences.map((reference: any) => profileReferenceKey(reference)).sort())
              === stable(pinnedRigMountWarningConfig?.members.map(member => member.key).sort() ?? [])
            && structuralGroups[0]?.attachment?.name === pinnedRigMountWarningConfig?.anchorName
            && structuralGroups[0]?.attachment?.pathId === pinnedRigMountWarningConfig?.anchorReferenceKey.split(':').at(-1)
            && String(structuralGroups[0]?.attachment?.file ?? '').replaceAll('\\', '/').toLowerCase()
              === pinnedRigMountWarningConfig?.anchorReferenceKey.split(':')[1]
            && Array.isArray(structuralGroups[0]?.evidence)
            && structuralGroups[0].evidence.includes('no body or third renderer shares the exact anchor'))
        const pinnedRigMountEvidenceReason = pinnedRigMountWarningConfig
          ? `Exact source-pinned same-prefab rig-mount group ${pinnedRigMountWarningConfig.sourceIdentity}; attachment placement remains an arrangement warning.`
          : ''
        const pinnedRigMountEvidence = Array.isArray(equipmentEvidence) ? equipmentEvidence : []
        const pinnedRigMountEvidenceKeys = pinnedRigMountEvidence
          .filter((evidence: any) => evidence?.reason === pinnedRigMountEvidenceReason)
          .map((evidence: any) => profileReferenceKey(evidence.sourceReference)).sort()
        const exactPinnedRigMountWarning = Boolean(pinnedRigMountWarningConfig && pinnedRigMountWarning
          && pinnedRigMountWarning.reasonCode === 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT'
          && pinnedRigMountWarning.message === `Source-pinned same-prefab rig-mount group ${pinnedRigMountWarningConfig.sourceIdentity} has no authored main/sub slot; all group renderers remain included and their arrangement may need review.`
          && profileReferenceKey(pinnedRigMountWarning.blocker?.sourceReference) === pinnedRigMountWarningConfig.members[1].key
          && pinnedRigMountWarning.blocker?.name === pinnedRigMountWarningConfig.members[1].name
          && pinnedRigMountWarning.blocker?.hierarchyPath === pinnedRigMountWarningConfig.members[1].hierarchyPath
          && Array.isArray(pinnedRigMountWarning.sourceGroupReferences)
          && pinnedRigMountWarning.sourceGroupReferences.length === pinnedRigMountWarningConfig.members.length
          && stable(pinnedRigMountWarning.sourceGroupReferences.map((reference: any) => profileReferenceKey(reference)))
            === stable(pinnedRigMountWarningConfig.members.map(member => member.key))
          && renderingProfile.sourcePrefab?.path === pinnedRigMountWarningConfig.prefabPath
          && profileReferenceKey(renderingProfile.sourcePrefab?.reference) === pinnedRigMountWarningConfig.prefabReferenceKey
          && profileReferenceKey(renderingProfile.assembly?.prefabReference) === pinnedRigMountWarningConfig.prefabReferenceKey
          && Array.isArray(pinnedRigMountWarning.sourceEvidence)
          && pinnedRigMountWarning.sourceEvidence.every((item: unknown) => typeof item === 'string' && item.length > 0)
          && [
            `exact source candidate ${pinnedRigMountWarningConfig.sourceIdentity} dependency fingerprint ${pinnedRigMountWarningConfig.dependencyFingerprint}`,
            `exact selected prefab ${pinnedRigMountWarningConfig.prefabPath} at ${pinnedRigMountWarningConfig.prefabReferenceKey}`,
            `exact same-prefab rig anchor Bip001_Weapon at ${pinnedRigMountWarningConfig.anchorReferenceKey}`,
            `active renderers on the exact anchor are exactly ${pinnedRigMountWarningConfig.members.map(member => member.key).join(' and ')}`,
            'source assembly has no authored main/sub slot, equipment renderer reference/group, or ambiguity metadata; no slot was inferred',
          ].every(item => pinnedRigMountWarning.sourceEvidence.includes(item))
          && noPinnedRigMountAuthoredAttachments && exactStructuralGroups
          && pinnedRigMountEvidenceKeys.length === 2
          && stable(pinnedRigMountEvidenceKeys) === stable(pinnedRigMountWarningConfig.members.map(member => member.key).sort())
          && (() => {
            const anchorParts = pinnedRigMountWarningConfig.anchorReferenceKey.split(':')
            const usesAnchor = (renderer: any) => [renderer?.rootBone, ...(renderer?.transformChain ?? []), ...(renderer?.rootBoneAncestry ?? [])]
              .some((pointer: any) => pointer?.pathId === anchorParts.at(-1)
                && pointer?.name === pinnedRigMountWarningConfig.anchorName
                && String(pointer?.file ?? '').replaceAll('\\', '/').toLowerCase() === anchorParts[1])
            const activeAnchorKeys = (renderingProfile.assembly?.renderers ?? [])
              .filter((renderer: any) => renderer?.enabled !== false && renderer?.gameObjectActive !== false
                && renderer?.visible !== false && usesAnchor(renderer))
              .map((renderer: any) => profileReferenceKey(renderer?.sourceReference)).sort()
            return stable(activeAnchorKeys) === stable(pinnedRigMountWarningConfig.members.map(member => member.key).sort())
          })()
          && pinnedRigMountWarningConfig.members.every(member => {
            const renderers = renderingProfile.renderers.filter((renderer: any) => profileReferenceKey(renderer?.sourceReference) === member.key)
            const assemblies = assemblyByReference.get(member.key) ?? []
            const bindings = pinnedRigMountEvidence.filter((evidence: any) => profileReferenceKey(evidence?.sourceReference) === member.key)
            return includedReferences.has(member.key) && !excludedReferences.has(member.key) && !blockerKeys.has(member.key)
              && renderers.length === 1 && renderers[0]?.name === member.name
              && renderers[0]?.hierarchyPath === member.hierarchyPath
              && renderers[0]?.rendererType === 'SkinnedMeshRenderer' && renderers[0]?.defaultVisible === true
              && assemblies.length === 1 && assemblies[0]?.name === member.name
              && assemblies[0]?.hierarchyPath === member.hierarchyPath
              && assemblies[0]?.rendererType === 'SkinnedMeshRenderer'
              && bindings.length === 1 && bindings[0]?.classification === 'structurally-bound-equipment'
              && bindings[0]?.reasonCode === 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY'
              && bindings[0]?.name === member.name && bindings[0]?.hierarchyPath === member.hierarchyPath
          }))
        if (!Array.isArray(profileWarnings) || (profileWarnings.length > 1 && !isExactSaoriSwimsuitWarningPair)) {
          throw new Error('Embedded rendering profile has an invalid or ambiguous arrangement warning set.')
        }
        const exactReferenceKey = (value: any, label: string) => {
          if (!value || typeof value !== 'object'
            || typeof value.bundleSha256 !== 'string' || !value.bundleSha256
            || typeof value.serializedFile !== 'string' || !value.serializedFile
            || typeof value.objectId !== 'string' || !value.objectId) {
            throw new Error(`${label} has no exact full source identity.`)
          }
          return profileReferenceKey(value)
        }
        const referenceListKeys = (value: unknown, label: string) => {
          if (!Array.isArray(value) || !value.length) throw new Error(`${label} is not an exact source-reference array.`)
          return value.map((reference, index) => exactReferenceKey(reference, `${label}[${index}]`)).sort()
        }
        const seenWarnings = new Set<string>()
        const equipmentEvidenceKeys = new Set((equipmentEvidence ?? []).map((item: any) => profileReferenceKey(item?.sourceReference)))
        for (const [index, warning] of profileWarnings.entries()) {
          if (!warning || typeof warning !== 'object'
            || warning.reasonCode !== 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT'
            || typeof warning.message !== 'string' || !warning.message) {
            throw new Error(`Embedded arrangement warning ${index} has an unsupported reason or no diagnostic message.`)
          }
          const blocker = warning.blocker
          if (!blocker || typeof blocker !== 'object' || blocker.reasonCode !== warning.reasonCode
            || typeof blocker.name !== 'string' || !blocker.name
            || (blocker.hierarchyPath !== null && typeof blocker.hierarchyPath !== 'string')
            || !Array.isArray(blocker.evidence) || blocker.evidence.length === 0
            || blocker.evidence.some((item: unknown) => typeof item !== 'string' || !item)) {
            throw new Error(`Embedded arrangement warning ${index} has incomplete source equipment evidence.`)
          }
          const sourceKey = exactReferenceKey(blocker.sourceReference, `Embedded arrangement warning ${index} renderer`)
          const pinnedRigMountMember = Boolean(exactPinnedRigMountWarning
            && pinnedRigMountWarningConfig?.members.some(member => member.key === sourceKey))
          if (seenWarnings.has(sourceKey) || (equipmentEvidenceKeys.has(sourceKey) && !pinnedRigMountMember)
            || !includedReferences.has(sourceKey) || excludedReferences.has(sourceKey) || blockerKeys.has(sourceKey)) {
            throw new Error(`Embedded arrangement warning ${sourceKey} does not identify one unresolved core renderer.`)
          }
          seenWarnings.add(sourceKey)
          const rendererMatches = renderingProfile.renderers.filter((item: any) => profileReferenceKey(item?.sourceReference) === sourceKey)
          const assemblyMatches = assemblyByReference.get(sourceKey) ?? []
          if (rendererMatches.length !== 1 || assemblyMatches.length !== 1) {
            throw new Error(`Embedded arrangement warning ${sourceKey} does not identify exactly one source and exported renderer.`)
          }
          const renderer = rendererMatches[0]
          const assemblyRenderer = assemblyMatches[0]
          const nodeIndex = renderer.glbNodeIndex
          const node = Number.isInteger(nodeIndex) ? json!.nodes?.[nodeIndex] : null
          const glbSource = node?.extras?.chibi?.sourceRenderer
          if (!node || !Number.isInteger(node.mesh)
            || profileReferenceKey(glbSource?.sourceReference) !== sourceKey
            || renderer.defaultVisible !== true
            || renderer.name !== blocker.name || (renderer.hierarchyPath ?? null) !== (blocker.hierarchyPath ?? null)
            || renderer.rendererType !== assemblyRenderer.rendererType
            || assemblyRenderer.name !== blocker.name || (assemblyRenderer.hierarchyPath ?? null) !== (blocker.hierarchyPath ?? null)) {
            throw new Error(`Embedded arrangement warning ${sourceKey} disagrees with its exact GLB renderer identity.`)
          }
          const meshKey = exactReferenceKey(blocker.sourceMeshReference, `Embedded arrangement warning ${sourceKey} mesh`)
          const rendererMeshKey = exactReferenceKey(renderer.sourceMesh?.sourceReference, `Core renderer ${sourceKey} mesh`)
          const assemblyMeshKey = exactReferenceKey(assemblyRenderer.meshSourceReference, `Source assembly renderer ${sourceKey} mesh`)
          if (meshKey !== rendererMeshKey || meshKey !== assemblyMeshKey
            || profileReferenceKey(glbSource?.sourceMeshReference) !== meshKey) {
            throw new Error(`Embedded arrangement warning ${sourceKey} disagrees with its exact source mesh identity.`)
          }
          const materialKeys = referenceListKeys(blocker.sourceMaterialReferences, `Embedded arrangement warning ${sourceKey} materials`)
          const shaderKeys = referenceListKeys(blocker.sourceShaderReferences, `Embedded arrangement warning ${sourceKey} shaders`)
          const slots = renderer.materialSlots
          if (!Array.isArray(slots) || !slots.length) {
            throw new Error(`Embedded arrangement warning ${sourceKey} has no exact exported material slots.`)
          }
          const rendererMaterialKeys = slots.map((slot: any, slotIndex: number) =>
            exactReferenceKey(slot?.sourceMaterialReference, `Core renderer ${sourceKey} material ${slotIndex}`)).sort()
          const rendererShaderKeys = slots.map((slot: any, slotIndex: number) =>
            exactReferenceKey(slot?.sourceShaderReference, `Core renderer ${sourceKey} shader ${slotIndex}`)).sort()
          if (stable(materialKeys) !== stable(rendererMaterialKeys) || stable(shaderKeys) !== stable(rendererShaderKeys)) {
            throw new Error(`Embedded arrangement warning ${sourceKey} disagrees with its exact source material or shader identities.`)
          }
          const assemblyMaterialKeys = (assemblyRenderer.materialSlots ?? []).map((slot: any, slotIndex: number) =>
            exactReferenceKey(slot?.sourceMaterialReference, `Source assembly renderer ${sourceKey} material ${slotIndex}`)).sort()
          if (stable(materialKeys) !== stable(assemblyMaterialKeys)) {
            throw new Error(`Embedded arrangement warning ${sourceKey} disagrees with its source assembly materials.`)
          }
          const requiredEvidence = [
            `exact source renderer reference ${sourceKey}`,
            `exact source mesh reference ${meshKey}`,
            ...materialKeys.map(key => `exact source material reference ${key}`),
            ...shaderKeys.map(key => `exact source shader reference ${key}`),
          ]
          if (pinnedRigMountMember) {
            const pinnedMember = pinnedRigMountWarningConfig!.members.find(member => member.key === sourceKey)!
            const pinnedMemberEvidence = [
              `exact source renderer ${pinnedMember.name} at ${sourceKey}`,
              `exact source mesh ${meshKey}`,
              ...materialKeys.map(key => `exact source material ${key}`),
              ...shaderKeys.map(key => `exact source shader ${key} (MX/C-Weapon)`),
              'source-pinned group is core equipment, but no authored main/sub slot specifies its arrangement',
            ]
            if (pinnedMemberEvidence.some(item => !blocker.evidence.includes(item))) {
              throw new Error(`Embedded arrangement warning ${sourceKey} has incomplete exact source equipment evidence.`)
            }
          } else if (requiredEvidence.some(item => !blocker.evidence.includes(item))
            || !blocker.evidence.some((item: string) => item.startsWith('renderer name has authored equipment term(s): '))
            || !blocker.evidence.includes('selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer')) {
            throw new Error(`Embedded arrangement warning ${sourceKey} has incomplete exact source equipment evidence.`)
          }
          if ((renderingProfile.childRendererEvents ?? []).some((event: any) =>
            profileReferenceKey(event?.sourceRendererReference) === sourceKey)) {
            throw new Error(`Embedded arrangement warning ${sourceKey} is still used by an authored child-renderer event.`)
          }
        }
      }
    }
    const equipmentReferences = renderingProfile.assembly?.attachments?.equipmentRendererReferences ?? []
    for (const reference of equipmentReferences) {
      const sourceKey = profileReferenceKey(reference)
      if (!sourceKey || excludedReferences.has(sourceKey) || !includedReferences.has(sourceKey)) {
        throw new Error(`Rendering profile equipment renderer ${sourceKey || '(unidentified)'} is not preserved as core content.`)
      }
    }
    for (const event of renderingProfile.childRendererEvents) {
      const targetKey = profileReferenceKey(event?.sourceRendererReference)
      if (!targetKey || !includedReferences.has(targetKey) || excludedReferences.has(targetKey)
        || typeof event?.clip !== 'string' || !event.clip || typeof event?.time !== 'number' || !Number.isFinite(event.time)
        || !Number.isInteger(event?.order) || event.order < 0 || (event.action !== 'enable' && event.action !== 'disable')) {
        throw new Error('Embedded rendering profile has a child-renderer event targeting a non-core renderer.')
      }
    }
    for (const event of renderingProfile.excludedChildRendererEvents) {
      const targetKey = profileReferenceKey(event?.sourceRendererReference)
      if (!targetKey || !excludedReferences.has(targetKey) || event?.reasonCode !== 'PRESENTATION_CHILD_RENDERER_EVENT'
        || typeof event?.clip !== 'string' || !event.clip || typeof event?.time !== 'number' || !Number.isFinite(event.time)
        || !Number.isInteger(event?.order) || event.order < 0 || (event.action !== 'enable' && event.action !== 'disable')
        || !Array.isArray(event?.evidence) || event.evidence.length === 0
        || event.evidence.some((evidence: unknown) => typeof evidence !== 'string' || !evidence)) {
        throw new Error('Embedded rendering profile has an invalid excluded child-renderer event.')
      }
    }
    const sortedChildEvents = [...renderingProfile.childRendererEvents].sort(excludedEventSort)
    if (stable(renderingProfile.childRendererEvents) !== stable(sortedChildEvents)) {
      throw new Error('Embedded rendering profile child-renderer events are not in deterministic source order.')
    }
    const excludedMarkers = new Map<string, { nodeIndex: number; nodeName: string; hierarchyPath: string; marker: any }>()
    for (const [nodeIndex, node] of (json!.nodes ?? []).entries()) {
      const marker = node.extras?.chibi?.presentationOnlyExcluded
      if (marker) {
        const sourceKey = profileReferenceKey(marker.sourceReference)
        const exclusion = renderingProfile.excludedRenderers.find((item: any) => profileReferenceKey(item.sourceReference) === sourceKey)
        if (!exclusion || excludedMarkers.has(sourceKey) || Number.isInteger(node.mesh)
          || marker.reasonCode !== exclusion.reasonCode || stable(marker.evidence) !== stable(exclusion.evidence)) {
          throw new Error('Excluded presentation renderer provenance is missing, duplicated, or tampered.')
        }
        excludedMarkers.set(sourceKey, {
          nodeIndex, nodeName: node.name ?? '', hierarchyPath: paths[nodeIndex] ?? '', marker,
        })
      } else if (Number.isInteger(node.mesh) && !includedNodes.has(nodeIndex)) {
        throw new Error(`Unresolved unprofiled GLB geometry may be required core character or weapon content at node ${node.name ?? nodeIndex}.`)
      }
    }
    if (embeddedPolicyDiagnostics !== undefined) {
      if (embeddedPolicyDiagnostics?.schemaVersion !== 1
        || embeddedPolicyDiagnostics.policyVersion !== CHIBI_RENDERING_POLICY_VERSION
        || !Array.isArray(embeddedPolicyDiagnostics.intentionallyExcludedRenderers)
        || !Array.isArray(embeddedPolicyDiagnostics.excludedChildRendererEvents)
        || !Array.isArray(embeddedPolicyDiagnostics.fxExclusionProofs)
        || !Array.isArray(embeddedPolicyDiagnostics.excludedFxInstantiationEvents)
        || !Array.isArray(embeddedPolicyDiagnostics.unprofiledGeometry)
        || embeddedPolicyDiagnostics.unprofiledGeometry.length) {
        throw new Error('Embedded rendering-profile diagnostics are missing, tampered, or contain unresolved geometry.')
      }
      const expectedRendererDiagnostics = renderingProfile.excludedRenderers.map((exclusion: any) => {
        const sourceKey = profileReferenceKey(exclusion.sourceReference)
        const marker = excludedMarkers.get(sourceKey)
        return marker
          ? {
              sourceReference: exclusion.sourceReference, name: exclusion.name, hierarchyPath: exclusion.hierarchyPath,
              nodeIndex: marker.nodeIndex, nodeName: marker.nodeName, status: 'intentionally-excluded',
              reasonCode: exclusion.reasonCode, evidence: exclusion.evidence,
            }
          : {
              sourceReference: exclusion.sourceReference, name: exclusion.name, hierarchyPath: exclusion.hierarchyPath,
              nodeIndex: null, nodeName: null, status: 'source-node-omitted',
              reasonCode: exclusion.reasonCode, evidence: exclusion.evidence,
            }
      }).sort(excludedRendererSort)
      const actualRendererDiagnostics = [...embeddedPolicyDiagnostics.intentionallyExcludedRenderers].sort(excludedRendererSort)
      const expectedEventDiagnostics = [...renderingProfile.excludedChildRendererEvents].sort(excludedEventSort)
      const actualEventDiagnostics = [...embeddedPolicyDiagnostics.excludedChildRendererEvents].sort(excludedEventSort)
      if (stable(expectedRendererDiagnostics) !== stable(actualRendererDiagnostics)
        || stable(expectedEventDiagnostics) !== stable(actualEventDiagnostics)
        || stable(renderingProfile.fxExclusionProofs) !== stable(embeddedPolicyDiagnostics.fxExclusionProofs)
        || stable(renderingProfile.excludedFxInstantiationEvents) !== stable(embeddedPolicyDiagnostics.excludedFxInstantiationEvents)) {
        throw new Error('Embedded rendering-profile diagnostics do not preserve deterministic exclusion records.')
      }
    }
    const seenExcludedEventKeys = new Set<string>()
    for (const event of renderingProfile.excludedChildRendererEvents) {
      const key = `${event.clip}:${event.time}:${event.order}:${profileReferenceKey(event.sourceRendererReference)}`
      if (seenExcludedEventKeys.has(key)) throw new Error('Embedded rendering profile has duplicate excluded child-renderer events.')
      seenExcludedEventKeys.add(key)
    }
    for (const node of json!.nodes ?? []) {
      const sourceReference = node.extras?.chibi?.sourceRenderer?.sourceReference
      if (excludedReferences.has(profileReferenceKey(sourceReference))) {
        throw new Error('Excluded presentation renderer retained an exact GLB source binding.')
      }
    }
  }
  const outlineSourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
      : attribute === 'TANGENT' ? 'in_TANGENT0' : 'in_COLOR0'
  const normalizeOutlineIdentity = (value: unknown) => typeof value === 'string' ? value.toLowerCase().replaceAll(' ', '').replaceAll('\\', '/') : ''
  const outlineExactArray = (actual: unknown, expected: readonly unknown[]) => Array.isArray(actual)
    && actual.length === expected.length && actual.every((value, index) => value === expected[index])
  const outlineExactHash = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
  const validateOutlinePass = (pass: any, expected: {
    name: string; pass: string; passIndex: number; blobIndex: number; parameterBlobIndex: number; programHash: string
    attributes: readonly string[]; uniforms: readonly string[]; culling: number
  }) => {
    if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.name || pass.subShaderIndex !== 0
      || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9
      || pass.gpuProgramType !== 4 || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
      || !outlineExactHash(pass.parameterRecordSha256) || !outlineExactArray(pass.keywordIndices, [])
      || !outlineExactArray(pass.keywordNames, []) || pass.programHash !== expected.programHash
      || pass.programDataSha256 !== expected.programHash || !outlineExactHash(pass.programRecordSha256)
      || typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es')
      || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')
      || !outlineExactArray(pass.requiredAttributes, expected.attributes)
      || !outlineExactArray(pass.requiredUniforms, expected.uniforms)
      || pass.renderState?.zWrite !== 1 || pass.renderState?.zTest !== 4 || pass.renderState?.culling !== expected.culling) {
      throw new Error(`MX/Unlit Outline ${expected.pass} source pass metadata is incomplete or tampered.`)
    }
    for (const attribute of expected.attributes) {
      const name = outlineSourceAttribute(attribute)
      if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${name}\\b`).test(pass.glsl)) {
        throw new Error(`MX/Unlit Outline ${expected.pass} source pass is missing ${attribute}.`)
      }
    }
    for (const uniform of expected.uniforms) {
      if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`).test(pass.glsl)) {
        throw new Error(`MX/Unlit Outline ${expected.pass} source pass is missing ${uniform}.`)
      }
    }
  }
  const validateMxOutlineSlots = () => {
    for (const renderer of renderingProfile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
      if (slot.adapterId !== 'mx-unlit-outline') continue
      const label = `Profile MX/Unlit Outline material ${slot.sourceMaterialName ?? '(unnamed)'}`
      if (normalizeOutlineIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName) !== 'mx/unlitoutline'
        || profileReferenceKey(slot.sourceShaderReference) !== profileReferenceKey(MX_UNLIT_OUTLINE_SOURCE_REFERENCE)
        || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256) {
        throw new Error(`${label} has an unverified source identity or program version.`)
      }
      const extraction = slot.shaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
        || !outlineExactHash(extraction.fingerprint) || String(extraction.compressedBlobSha256 ?? '').toLowerCase() !== MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256
        || profileReferenceKey(extraction.sourceReference) !== profileReferenceKey(MX_UNLIT_OUTLINE_SOURCE_REFERENCE)
        || profileReferenceKey(extraction.sourceReference) !== profileReferenceKey(slot.sourceShaderReference)) {
        throw new Error(`${label} has no exact source extraction provenance.`)
      }
      validateOutlinePass(extraction.passes?.base, {
        name: 'ForwardLit', pass: 'base', passIndex: 0, blobIndex: 1, parameterBlobIndex: 0,
        programHash: MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, attributes: ['POSITION', 'TEXCOORD_0'],
        uniforms: ['_MainTex_ST', '_Tint', '_MainTex'], culling: 0,
      })
      validateOutlinePass(extraction.passes?.outline, {
        name: 'Outline', pass: 'outline', passIndex: 1, blobIndex: 6, parameterBlobIndex: 4,
        programHash: MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, attributes: ['POSITION', 'TANGENT', 'COLOR_0', 'TEXCOORD_0'],
        uniforms: ['_MainTex_ST', '_OutlineTint', '_OutlineZCorrection', '_MainTex', '_MainLightColor', '_ScreenParams',
          'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV', 'hlslcc_mtx4x4unity_MatrixVP'], culling: 1,
      })
      if (extraction.passes.base.programHash === extraction.passes.outline.programHash) {
        throw new Error(`${label} Forward and Outline passes unexpectedly share one program.`)
      }
      const metadata = json.materials?.[slot.glb?.materialIndex]?.extras?.chibi
      if (!metadata || metadata.adapterId !== 'mx-unlit-outline' || metadata.renderPass !== 'base'
        || profileReferenceKey(metadata.sourceShaderReference) !== profileReferenceKey(slot.sourceShaderReference)
        || metadata.shaderExtraction?.passes?.base?.programHash !== MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH
        || metadata.shaderExtraction?.passes?.outline?.programHash !== MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH
        || metadata.outlinePass?.programHash !== MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH
        || !Array.isArray(metadata.outlineTint) || metadata.outlineTint.length !== 4
        || !metadata.outlineTint.every((value: unknown) => Number.isFinite(Number(value)))
        || !Number.isFinite(Number(metadata.outlineZCorrection))) {
        throw new Error(`${label} lost its exact two-pass material metadata.`)
      }
      const binding = slot.glb
      if (!binding || binding.meshIndex !== undefined && !Number.isInteger(binding.meshIndex)
        || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
        || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) {
        throw new Error(`${label} has no exact GLB primitive binding for both passes.`)
      }
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex]
        const materialIndex = binding.materialIndices[index]
        if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) {
          throw new Error(`${label} lost its exact GLB material-slot binding.`)
        }
        const accessors = primitive.attributes ?? {}
        for (const [semantic, type] of [['POSITION', 'VEC3'], ['TEXCOORD_0', 'VEC2'], ['TANGENT', 'VEC4'], ['COLOR_0', 'VEC4']] as const) {
          const accessor = json.accessors?.[accessors[semantic]]
          if (!Number.isInteger(accessors[semantic]) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) {
            throw new Error(`${label} primitive ${primitiveIndex} does not preserve ${semantic} source data.`)
          }
        }
      }
    }
  }
  const transparentSourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_TEXCOORD0'
  const transparentExactArray = (actual: unknown, expected: readonly unknown[]) => Array.isArray(actual)
    && actual.length === expected.length && actual.every((value, index) => value === expected[index])
  const transparentExactHash = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
  const validateTransparentPass = (pass: any, expected: {
    name: string; pass: string; passIndex: number; blobIndex: number; parameterBlobIndex: number
    parameterRecordSha256: string; programHash: string; programRecordSha256: string
    keywords: readonly string[]; keywordIndices: readonly number[]; attributes: readonly string[]; uniforms: readonly string[]
    depthOnly: boolean; colorMask: number; sourceBlend: number; destinationBlend: number; sourceBlendAlpha: number; destinationBlendAlpha: number
  }) => {
    const state = pass?.renderState
    if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.name || pass.subShaderIndex !== 0
      || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
      || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
      || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !transparentExactArray(pass.keywordIndices, expected.keywordIndices)
      || !transparentExactArray(pass.keywordNames, expected.keywords) || pass.programHash !== expected.programHash
      || pass.programDataSha256 !== expected.programHash || pass.programRecordSha256 !== expected.programRecordSha256
      || typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX')
      || !pass.glsl.includes('#ifdef FRAGMENT') || !transparentExactArray(pass.requiredAttributes, expected.attributes)
      || !transparentExactArray(pass.requiredUniforms, expected.uniforms) || state?.zWrite !== 0 || state.zWriteProperty !== '_ZWrite'
      || state.zTest !== 4 || state.culling !== 0 || state.cullingProperty !== '_Cull' || state.sourceBlend !== expected.sourceBlend
      || state.destinationBlend !== expected.destinationBlend || state.sourceBlendAlpha !== expected.sourceBlendAlpha
      || state.destinationBlendAlpha !== expected.destinationBlendAlpha || state.blendOperation !== 0
      || state.blendOperationAlpha !== 0 || state.colorMask !== expected.colorMask || state.depthOnly !== expected.depthOnly) {
      throw new Error(`MX/C-Transparent-ST ${expected.pass} source pass metadata is incomplete or tampered.`)
    }
    for (const attribute of expected.attributes) {
      if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${transparentSourceAttribute(attribute)}\\b`).test(pass.glsl)) {
        throw new Error(`MX/C-Transparent-ST ${expected.pass} source pass is missing ${attribute}.`)
      }
    }
    for (const uniform of expected.uniforms) {
      if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`).test(pass.glsl)) {
        throw new Error(`MX/C-Transparent-ST ${expected.pass} source pass is missing ${uniform}.`)
      }
    }
  }
  const validateMxTransparentSlots = () => {
    for (const renderer of renderingProfile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
      if (slot.adapterId !== 'mx-c-transparent-st') continue
      const label = `Profile MX/C-Transparent-ST material ${slot.sourceMaterialName ?? '(unnamed)'}`
      if (String(slot.sourceShaderParsedName ?? slot.sourceShaderName ?? '').toLowerCase().replaceAll(' ', '').replaceAll('\\', '/') !== 'mx/c-transparent-st'
        || profileReferenceKey(slot.sourceShaderReference) !== profileReferenceKey(MX_C_TRANSPARENT_ST_SOURCE_REFERENCE)
        || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256) {
        throw new Error(`${label} has an unverified source identity or program version.`)
      }
      const extraction = slot.transparentShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
        || extraction.fingerprint !== MX_C_TRANSPARENT_ST_FINGERPRINT
        || extraction.compressedBlobSha256 !== MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256
        || profileReferenceKey(extraction.sourceReference) !== profileReferenceKey(MX_C_TRANSPARENT_ST_SOURCE_REFERENCE)) {
        throw new Error(`${label} has no exact source extraction provenance.`)
      }
      const common = {
        sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 1, destinationBlendAlpha: 10, colorMask: 15, depthOnly: false,
      }
      validateTransparentPass(extraction.passes?.forward, {
        name: 'ForwardLit', pass: 'forward', passIndex: 0, blobIndex: 6, parameterBlobIndex: 0,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256, programHash: MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH,
        programRecordSha256: MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256, keywords: [], keywordIndices: [],
        attributes: MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS, ...common,
      })
      validateTransparentPass(extraction.passes?.dither, {
        name: 'ForwardLit', pass: 'dither', passIndex: 0, blobIndex: 8, parameterBlobIndex: 1,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256, programHash: MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH,
        programRecordSha256: MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256, keywords: ['_DITHER_HORIZONTAL_LINES'], keywordIndices: [9],
        attributes: MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_DITHER_UNIFORMS, ...common,
      })
      validateTransparentPass(extraction.passes?.depth, {
        name: '', pass: 'depth', passIndex: 1, blobIndex: 31, parameterBlobIndex: 30,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256, programHash: MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH,
        programRecordSha256: MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256, keywords: [], keywordIndices: [],
        attributes: MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS,
        sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0, depthOnly: true,
      })
      const keywords = slot.materialProperties?.keywords
      const variant = Array.isArray(keywords) && keywords.length === 1 && keywords[0] === '_DITHER_HORIZONTAL_LINES' ? 'dither'
        : Array.isArray(keywords) && keywords.length === 0 ? 'forward' : null
      if (!variant || slot.adapterSettings?.transparentVariant !== variant) throw new Error(`${label} has no exact source keyword variant.`)
      const scalarNames = ['_Cull', '_ZWrite', '_MaskGSensitivity', '_MaskRtoG', '_SeeThroughMinValue', '_SeeThroughTransparency', '_SeeThroughSmoothness', '_ShadowThreshold', '_RimAreaMultiplier', '_RimStrength', '_AdditionalLightStrength', '_AdditionalLightSharpness', '_DitherThreshold', '_GrayBrightness']
      if (scalarNames.some(name => !Number.isFinite(Number(slot.materialProperties?.floats?.[name])))) throw new Error(`${label} is missing exact source scalar values.`)
      const colorNames = ['_Tint', '_ShadowTint', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor']
      for (const name of colorNames) {
        const color = slot.materialProperties?.colors?.[name]
        const values = [color?.r, color?.g, color?.b, color?.a ?? 1].map(Number)
        if (!color || values.some(value => !Number.isFinite(value))) throw new Error(`${label} is missing exact source color ${name}.`)
      }
      for (const property of ['_MainTex', '_MaskTex'] as const) {
        const texture = slot.materialProperties?.textures?.find((item: any) => item.name === property)
        const resolved = slot.materialProperties?.resolvedTextures?.find((item: any) => item.property === property)
        if (!texture?.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
          || String(texture.texture.file).toLowerCase() !== String(texture.textureReference.serializedFile).toLowerCase()
          || String(texture.texture.pathId) !== String(texture.textureReference.objectId)
          || !resolved?.sourceReference || profileReferenceKey(resolved.sourceReference) !== profileReferenceKey(texture.textureReference)
          || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
          || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0) throw new Error(`${label} has no exact ${property} identity.`)
      }
      const state = slot.renderState, blend = state?.blend
      if (state?.alphaMode !== 'BLEND' || state.layer !== 'transparent' || state.depthTest !== true || state.cullMode !== 'off'
        || state.doubleSided !== true || blend?.source !== 5 || blend.destination !== 10 || blend.sourceAlpha !== 1
        || blend.destinationAlpha !== 10 || blend.operation !== 0 || blend.operationAlpha !== 0) throw new Error(`${label} has an unverified source render state.`)
      const binding = slot.glb
      if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
        || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) throw new Error(`${label} has no exact GLB primitive binding.`)
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex]
        const materialIndex = binding.materialIndices[index]
        if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) throw new Error(`${label} lost its exact GLB material binding.`)
        for (const [semantic, type] of [['POSITION', 'VEC3'], ['NORMAL', 'VEC3'], ['COLOR_0', 'VEC4'], ['TEXCOORD_0', 'VEC2']] as const) {
          const accessor = json.accessors?.[primitive.attributes?.[semantic]]
          if (!Number.isInteger(primitive.attributes?.[semantic]) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) throw new Error(`${label} primitive ${primitiveIndex} does not preserve ${semantic} source data.`)
        }
      }
      const metadata = json.materials?.[binding.materialIndices[0]]?.extras?.chibi
      const outputMaterial = json.materials?.[binding.materialIndices[0]]
      const mainTexture = outputMaterial?.pbrMetallicRoughness?.baseColorTexture
      const activePass = metadata?.transparentShaderExtraction?.passes?.[variant]
      if (!metadata || metadata.adapterId !== 'mx-c-transparent-st' || metadata.renderPass !== 'forward'
        || metadata.transparentVariant !== variant || !activePass
        || metadata.transparentShaderExtraction.passes.depth?.programHash !== MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH
        || metadata.depthOnlyPass?.renderState?.colorMask !== 0 || !Number.isInteger(mainTexture?.index)
        || !Number.isInteger(metadata.maskTexture?.index) || metadata.maskTexture.index === mainTexture.index
        || profileReferenceKey(metadata.sourceShaderReference) !== profileReferenceKey(slot.sourceShaderReference)) throw new Error(`${label} lost its exact forward/depth material metadata or textures.`)
      validateTransparentPass(activePass, variant === 'dither' ? {
        name: 'ForwardLit', pass: 'dither', passIndex: 0, blobIndex: 8, parameterBlobIndex: 1,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256, programHash: MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH,
        programRecordSha256: MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256, keywords: ['_DITHER_HORIZONTAL_LINES'], keywordIndices: [9],
        attributes: MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_DITHER_UNIFORMS, ...common,
      } : {
        name: 'ForwardLit', pass: 'forward', passIndex: 0, blobIndex: 6, parameterBlobIndex: 0,
        parameterRecordSha256: MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256, programHash: MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH,
        programRecordSha256: MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256, keywords: [], keywordIndices: [],
        attributes: MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, uniforms: MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS, ...common,
      })
    }
  }
  const projectMxExactArray = (actual: unknown, expected: readonly unknown[]) => Array.isArray(actual)
    && actual.length === expected.length && actual.every((value, index) => value === expected[index])
  const projectMxSourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
    : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
      : attribute === 'TANGENT' ? 'in_TANGENT0' : 'in_COLOR0'
  const validateProjectMxPass = (pass: any, expected: (typeof PROJECTMX_SHADER_PASSES)[keyof typeof PROJECTMX_SHADER_PASSES], label: string) => {
    const state = pass?.renderState
    if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
      || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
      || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
      || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !projectMxExactArray(pass.keywordIndices, expected.keywordIndices)
      || !projectMxExactArray(pass.keywordNames, expected.keywordNames) || pass.programHash !== expected.programHash
      || pass.programDataSha256 !== expected.programHash || pass.programRecordSha256 !== expected.programRecordSha256
      || pass.programDataLength !== expected.programDataLength || pass.usesNoiseTexture !== expected.usesNoiseTexture
      || !state
      || state.zWrite !== expected.renderState.zWrite || state.zTest !== expected.renderState.zTest
      || state.culling !== expected.renderState.culling || state.colorMask !== expected.renderState.colorMask
      || state.sourceBlend !== PROJECTMX_OPAQUE_PASS_STATE.sourceBlend
      || state.destinationBlend !== PROJECTMX_OPAQUE_PASS_STATE.destinationBlend
      || state.sourceBlendAlpha !== PROJECTMX_OPAQUE_PASS_STATE.sourceBlendAlpha
      || state.destinationBlendAlpha !== PROJECTMX_OPAQUE_PASS_STATE.destinationBlendAlpha
      || state.blendOperation !== PROJECTMX_OPAQUE_PASS_STATE.blendOperation
      || state.blendOperationAlpha !== PROJECTMX_OPAQUE_PASS_STATE.blendOperationAlpha
      || state.depthOnly !== expected.renderState.depthOnly) {
      throw new Error(`${label} has incomplete or tampered source pass metadata.`)
    }
    if (typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es')
      || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')
      || !projectMxExactArray(pass.requiredAttributes, expected.requiredAttributes)
      || !projectMxExactArray(pass.requiredUniforms, expected.requiredUniforms)) {
      throw new Error(`${label} has incomplete or tampered source declarations.`)
    }
    for (const attribute of expected.requiredAttributes) {
      const name = projectMxSourceAttribute(attribute)
      if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${name}\\b`).test(pass.glsl)) {
        throw new Error(`${label} source is missing ${attribute} input semantics.`)
      }
    }
    for (const uniform of expected.requiredUniforms) {
      if (!new RegExp(`\\b${uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`).test(pass.glsl)) {
        throw new Error(`${label} source is missing ${uniform} uniform.`)
      }
    }
  }
  const projectMxMaterialProperty = (slot: any, name: string) => {
    const properties = slot.materialProperties ?? {}
    const floats = properties.floats ?? {}
    const ints = properties.ints ?? {}
    const value = floats[name] ?? ints[name]
    return value === undefined ? null : Number(value)
  }
  const projectMxColor = (slot: any, name: string) => {
    const color = slot.materialProperties?.colors?.[name]
    if (!color) return null
    const values = [color.r, color.g, color.b, color.a ?? 1].map(Number)
    return values.every(value => Number.isFinite(value)) ? values : null
  }
  const validateProjectMxTexture = (slot: any, property: string, required: boolean, label: string) => {
    const texture = slot.materialProperties?.textures?.find((item: any) => item.name === property)
    const resolved = slot.materialProperties?.resolvedTextures?.find((item: any) => item.property === property)
    if (!required && (!texture?.texture || String(texture.texture.pathId) === '0')) return null
    if (!texture?.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
      || String(texture.texture.file).toLowerCase() !== String(texture.textureReference.serializedFile).toLowerCase()
      || String(texture.texture.pathId) !== String(texture.textureReference.objectId)
      || !resolved?.sourceReference || profileReferenceKey(resolved.sourceReference) !== profileReferenceKey(texture.textureReference)
      || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
      || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0) {
      throw new Error(`${label} has no exact ${property} source texture identity.`)
    }
    return texture
  }
  const validateMxProjectSlots = () => {
    for (const renderer of renderingProfile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
      if (slot.adapterId !== 'projectmx-weapon-test1-damage') continue
      const label = `Profile ProjectMX/WeaponTest1Damage material ${slot.sourceMaterialName ?? '(unnamed)'}`
      const identity = normalizeOutlineIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName)
      if (identity !== 'projectmx/weapontest1damage'
        || profileReferenceKey(slot.sourceShaderReference) !== profileReferenceKey(PROJECTMX_SHADER_SOURCE_REFERENCE)
        || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== PROJECTMX_SHADER_PROGRAM_BLOB_SHA256) {
        throw new Error(`${label} has an unverified source identity or program version.`)
      }
      const extraction = (slot as any).projectMxShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
        || extraction.unityVersion !== '2021.3' || extraction.fingerprint !== PROJECTMX_SHADER_FINGERPRINT
        || extraction.compressedBlobSha256 !== PROJECTMX_SHADER_PROGRAM_BLOB_SHA256
        || profileReferenceKey(extraction.sourceReference) !== profileReferenceKey(PROJECTMX_SHADER_SOURCE_REFERENCE)
        || extraction.shaderName !== PROJECTMX_SHADER_NAME
        || !projectMxExactArray(extraction.shaderKeywordNames, PROJECTMX_SHADER_KEYWORDS)
        || !projectMxExactArray(extraction.requiredProperties, PROJECTMX_REQUIRED_PROPERTIES)
        || !projectMxExactArray(extraction.requiredTextureProperties, PROJECTMX_REQUIRED_TEXTURE_PROPERTIES)) {
        throw new Error(`${label} has no exact source extraction provenance.`)
      }
      const keywords = slot.materialProperties?.keywords
      const expectedVariant = projectMxExactArray(keywords, []) ? 'forward'
        : projectMxExactArray(keywords, ['_GLOW_0']) ? 'glow' : null
      if (!expectedVariant || extraction.activeVariant !== expectedVariant
        || !projectMxExactArray(extraction.activeKeywordNames, expectedVariant === 'glow' ? ['_GLOW_0'] : [])) {
        throw new Error(`${label} has unsupported active source keywords.`)
      }
      const useGlow = projectMxMaterialProperty(slot, '_UseGlow')
      if (!Number.isFinite(useGlow) || useGlow !== (expectedVariant === 'glow' ? 1 : 0)) {
        throw new Error(`${label} has an unverified _UseGlow variant gate.`)
      }
      for (const [passName, expected] of Object.entries(PROJECTMX_SHADER_PASSES)) {
        validateProjectMxPass(extraction.passes?.[passName], expected, `${label} ${passName} pass`)
      }
      const activePass = extraction.passes?.[expectedVariant]
      if (activePass.usesNoiseTexture !== false) throw new Error(`${label} active variant unexpectedly consumes _NoiseTex.`)
      const mainTexture = validateProjectMxTexture(slot, '_mainTex', true, label)
      const sourceTexture = validateProjectMxTexture(slot, '_sourceTex', true, label)
      const noiseTexture = validateProjectMxTexture(slot, '_NoiseTex', activePass.usesNoiseTexture === true, label)
      const colorNames = ['_Color', '_OutlineTint', '_OutlineSolidColorTint']
      if (colorNames.some(name => !projectMxColor(slot, name))) throw new Error(`${label} is missing exact source tint parameters.`)
      for (const name of ['_DamageON', '_Damage', '_Fire', '_IsDither']) {
        const value = projectMxMaterialProperty(slot, name)
        if (!Number.isFinite(value) || value !== 0) throw new Error(`${label} enables unsupported interactive ${name} behavior.`)
      }
      if (expectedVariant === 'glow') {
        for (const name of ['_GlowMaskColor0', '_GlowTint0']) {
          if (!projectMxColor(slot, name)) throw new Error(`${label} is missing exact ${name} glow tint.`)
        }
        for (const name of ['_GlowStrictness0', '_GlowStrength0']) {
          if (!Number.isFinite(projectMxMaterialProperty(slot, name))) throw new Error(`${label} is missing exact ${name} glow value.`)
        }
      }
      const state = slot.renderState
      const blend = state?.blend
      if (state?.alphaMode !== 'OPAQUE' || state.layer !== 'opaque' || state.depthWrite !== true || state.depthTest !== true
        || state.depthFunction !== 'less-equal' || state.cullMode !== 'back' || state.doubleSided !== false
        || blend?.source !== 1 || blend.destination !== 0 || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 0
        || blend.operation !== 0 || blend.operationAlpha !== 0) {
        throw new Error(`${label} has an unverified opaque depth/cull state.`)
      }
      const binding = slot.glb
      if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
        || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) {
        throw new Error(`${label} has no exact GLB primitive binding.`)
      }
      const sourceMesh = (renderer as any).sourceMesh
      const colorlessSourceRecord = projectMxColorlessSourceMeshRecordForReference(sourceMesh?.sourceReference)
      const knownColorlessSource = colorlessSourceRecord !== undefined
      const colorlessEvidence = colorlessSourceRecord?.evidence
      const colorlessNormalization = colorlessSourceRecord?.normalization
      const topologyEvidence = Number.isInteger((colorlessEvidence as any)?.indexCount)
        ? colorlessEvidence as { subMeshVertexCounts: readonly number[]; indexCount: number } : undefined
      const sourceMeshEvidence = sourceMesh?.projectMxSourceMeshEvidence
      const projectMxPassesRequireColor = PROJECTMX_OUTLINE_ATTRIBUTES.includes('COLOR_0')
        || PROJECTMX_SOLID_OUTLINE_ATTRIBUTES.includes('COLOR_0')
      if (sourceMeshEvidence !== undefined
        && (!colorlessEvidence || stable(sourceMeshEvidence) !== stable(colorlessEvidence))) {
        throw new Error(`${label} has unverified source-missing COLOR_0 evidence.`)
      }
      if (knownColorlessSource && projectMxPassesRequireColor
        && stable(sourceMeshEvidence) !== stable(colorlessEvidence)) {
        throw new Error(`${label} has no exact source-missing COLOR_0 evidence.`)
      }
      if (topologyEvidence && binding.primitiveIndices.length !== topologyEvidence.subMeshVertexCounts.length) {
        throw new Error(`${label} has a GLB primitive count that does not match exact source submesh evidence.`)
      }
      const expectedAttributes: readonly [string, string][] = [
        ['POSITION', 'VEC3'], ['NORMAL', 'VEC3'], ['TEXCOORD_0', 'VEC2'], ['TANGENT', 'VEC4'], ['COLOR_0', 'VEC4'],
      ]
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex]
        const materialIndex = binding.materialIndices[index]
        if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) throw new Error(`${label} lost its exact GLB material binding.`)
        for (const [semantic, type] of expectedAttributes) {
          const accessorIndex = primitive.attributes?.[semantic]
          const accessor = json.accessors?.[accessorIndex]
          if (!Number.isInteger(accessorIndex) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) {
            throw new Error(`${label} primitive ${primitiveIndex} does not preserve ${semantic} source data.`)
          }
        }
        if (topologyEvidence) {
          const position = json.accessors?.[primitive.attributes.POSITION]
          const indices = json.accessors?.[primitive.indices]
          if ((primitive.mode !== undefined && primitive.mode !== 4)
            || !Number.isInteger(primitive.indices) || !indices || indices.type !== 'SCALAR'
            || ![5121, 5123, 5125].includes(indices.componentType) || indices.normalized
            || !Number.isInteger(indices.count) || indices.count !== topologyEvidence.indexCount || indices.count % 3 !== 0
            || !position || !Number.isInteger(position.count) || position.count < 0) {
            throw new Error(`${label} primitive ${primitiveIndex} does not preserve the exact indexed TRIANGLES topology.`)
          }
          for (const [semantic, accessorIndex] of Object.entries(primitive.attributes ?? {})) {
            if (semantic === 'COLOR_0') continue
            const accessor = json.accessors?.[accessorIndex as number]
            if (!accessor || accessor.count !== position.count) {
              throw new Error(`${label} primitive ${primitiveIndex} has mismatched non-color attribute counts.`)
            }
          }
          const indexValues = readAccessor(primitive.indices).flat()
          if (indexValues.some(value => !Number.isInteger(value) || value < 0 || value >= position.count)) {
            throw new Error(`${label} primitive ${primitiveIndex} has an out-of-range or non-integer index.`)
          }
        }
        if (knownColorlessSource && projectMxPassesRequireColor) {
          if (!Number.isInteger(primitiveIndex) || primitiveIndex < 0
            || primitiveIndex >= colorlessEvidence!.subMeshVertexCounts.length) {
            throw new Error(`${label} primitive ${primitiveIndex} has no exact source submesh color evidence.`)
          }
          const expectedCount = topologyEvidence ? json.accessors?.[primitive.attributes.POSITION]?.count
            : colorlessEvidence!.subMeshVertexCounts[primitiveIndex]
          const position = json.accessors?.[primitive.attributes.POSITION]
          const color = json.accessors?.[primitive.attributes.COLOR_0]
          if (!position || position.count !== expectedCount || !color || color.count !== expectedCount) {
            throw new Error(`${label} primitive ${primitiveIndex} COLOR_0 vertex count does not match exact source submesh evidence.`)
          }
          if (readAccessor(primitive.attributes.COLOR_0).some(value => !sameNumbers(value, [...colorlessNormalization!.defaultValue]))) {
            throw new Error(`${label} primitive ${primitiveIndex} does not preserve the exact Unity default COLOR_0 value.`)
          }
        }
      }
      const metadata = json.materials?.[binding.materialIndices[0]]?.extras?.chibi
      const outputMaterial = json.materials?.[binding.materialIndices[0]]
      const metadataTextures = metadata?.projectMxTextures
      const metadataMain = metadataTextures?.mainTex
      const metadataSource = metadataTextures?.sourceTex
      const metadataNoise = metadataTextures?.noiseTex
      const colorNormalization = metadata?.projectMxColorNormalization
      if ((knownColorlessSource && projectMxPassesRequireColor
        && stable(colorNormalization) !== stable(colorlessNormalization))
        || (!knownColorlessSource && colorNormalization !== undefined)) {
        throw new Error(`${label} lost its exact COLOR_0 normalization provenance.`)
      }
      if (!metadata || metadata.adapterId !== 'projectmx-weapon-test1-damage' || metadata.renderPass !== 'forward'
        || metadata.projectMxShaderExtraction === undefined || stable(metadata.projectMxShaderExtraction) !== stable(extraction)
        || metadata.projectMxMaterialProperties === undefined || stable(metadata.projectMxMaterialProperties) !== stable(slot.materialProperties)
        || metadata.textureProperty !== '_mainTex' || metadata.unlit !== false
        || outputMaterial?.alphaMode !== 'OPAQUE' || outputMaterial?.doubleSided !== false
        || metadata.depthWrite !== true || metadata.depthTest !== true || metadata.depthFunction !== 'less-equal'
        || metadata.cullMode !== 'back' || metadata.drawLayer !== 'opaque'
        || metadata.blend?.source !== 1 || metadata.blend?.destination !== 0
        || metadata.blend?.sourceAlpha !== 1 || metadata.blend?.destinationAlpha !== 0
        || metadata.blend?.operation !== 0 || metadata.blend?.operationAlpha !== 0
        || profileReferenceKey(metadata.sourceMaterialReference) !== profileReferenceKey(slot.sourceMaterialReference)
        || profileReferenceKey(metadata.sourceShaderReference) !== profileReferenceKey(slot.sourceShaderReference)
        || !Number.isInteger(metadataMain?.index) || !Number.isInteger(metadataSource?.index)
        || metadataMain.index === metadataSource.index
        || outputMaterial?.pbrMetallicRoughness?.baseColorTexture?.index !== metadataMain.index
        || metadataMain.index < 0 || metadataMain.index >= (json.textures?.length ?? 0)
        || metadataSource.index < 0 || metadataSource.index >= (json.textures?.length ?? 0)
        || activePass.usesNoiseTexture !== (Number.isInteger(metadataNoise?.index))) {
        throw new Error(`${label} lost its exact source extraction, material, or texture metadata.`)
      }
      if (activePass.usesNoiseTexture && (!Number.isInteger(metadataNoise.index) || metadataNoise.index < 0 || metadataNoise.index >= (json.textures?.length ?? 0))) {
        throw new Error(`${label} lost its exact _NoiseTex texture metadata.`)
      }
      const sourceColor = projectMxColor(slot, '_Color')
      if (!sourceColor || !Array.isArray(outputMaterial?.pbrMetallicRoughness?.baseColorFactor)
        || !projectMxExactArray(outputMaterial.pbrMetallicRoughness.baseColorFactor, sourceColor)) {
        throw new Error(`${label} lost its exact _Color tint.`)
      }
      if (outputMaterial?.extensions?.KHR_materials_unlit !== undefined) throw new Error(`${label} was incorrectly marked KHR_materials_unlit.`)
      if (mainTexture && sourceTexture && noiseTexture === null && metadataNoise !== undefined) throw new Error(`${label} has inactive _NoiseTex metadata.`)
    }
  }
  const validateMxEStandardSlots = () => {
    const eStandardExactArray = (actual: unknown, expected: readonly unknown[]) => Array.isArray(actual)
      && actual.length === expected.length && actual.every((value, index) => value === expected[index])
    const eStandardSourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
      : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
        : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1' : attribute === 'TEXCOORD_2' ? 'in_TEXCOORD2' : `in_${attribute}`
    const eStandardEscaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const eStandardPasses = {
      forwardStatic: {
        pass: 'forwardStatic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 160, parameterBlobIndex: 0,
        parameterRecordSha256: MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256, programHash: MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH,
        programRecordSha256: MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256, programDataLength: 7132, keywordIndices: [], keywordNames: [],
        attributes: MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: MX_E_STANDARD_FORWARD_STATIC_UNIFORMS,
        renderState: { zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 0, sourceBlendProperty: '_SrcBlend', destinationBlend: 0, destinationBlendProperty: '_DstBlend', sourceBlendAlpha: 0, sourceBlendAlphaProperty: '_SrcBlendAlpha', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '_DstBlendAlpha', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor', offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits' },
      },
      forwardDynamic: {
        pass: 'forwardDynamic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 171, parameterBlobIndex: 4,
        parameterRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, programHash: MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
        programRecordSha256: MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, programDataLength: 8112, keywordIndices: [19], keywordNames: ['_DYNAMIC_LIGHTS'],
        attributes: MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS,
        renderState: { zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 0, sourceBlendProperty: '_SrcBlend', destinationBlend: 0, destinationBlendProperty: '_DstBlend', sourceBlendAlpha: 0, sourceBlendAlphaProperty: '_SrcBlendAlpha', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '_DstBlendAlpha', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor', offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits' },
      },
      shadow: {
        pass: 'shadow', stateName: 'ShadowCaster', passName: '', passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312,
        parameterRecordSha256: MX_E_STANDARD_SHADOW_PARAMETER_SHA256, programHash: MX_E_STANDARD_SHADOW_PROGRAM_HASH,
        programRecordSha256: MX_E_STANDARD_SHADOW_RECORD_SHA256, programDataLength: 4273, keywordIndices: [], keywordNames: [],
        attributes: MX_E_STANDARD_SHADOW_ATTRIBUTES, uniforms: MX_E_STANDARD_SHADOW_UNIFORMS,
        renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>', sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>' },
      },
      depth: {
        pass: 'depth', stateName: 'DepthOnly', passName: '', passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320,
        parameterRecordSha256: MX_E_STANDARD_DEPTH_PARAMETER_SHA256, programHash: MX_E_STANDARD_DEPTH_PROGRAM_HASH,
        programRecordSha256: MX_E_STANDARD_DEPTH_RECORD_SHA256, programDataLength: 2766, keywordIndices: [], keywordNames: [],
        attributes: MX_E_STANDARD_DEPTH_ATTRIBUTES, uniforms: MX_E_STANDARD_DEPTH_UNIFORMS,
        renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull', sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>', sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>', blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true, offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>' },
      },
      meta: {
        pass: 'meta', stateName: 'Meta', passName: '', passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328,
        parameterRecordSha256: MX_E_STANDARD_META_PARAMETER_SHA256, programHash: MX_E_STANDARD_META_PROGRAM_HASH,
        programRecordSha256: MX_E_STANDARD_META_RECORD_SHA256, programDataLength: 6928, keywordIndices: [], keywordNames: [],
        attributes: MX_E_STANDARD_META_ATTRIBUTES, uniforms: MX_E_STANDARD_META_UNIFORMS,
        renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '<noninit>', sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>', sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>', blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false, offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>' },
      },
    } as const
    const validateEStandardPass = (pass: any, expected: (typeof eStandardPasses)[keyof typeof eStandardPasses], label: string) => {
      const state = pass?.renderState
      if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.passName !== expected.passName
        || pass.subShaderIndex !== 0 || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
        || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
        || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !eStandardExactArray(pass.keywordIndices, expected.keywordIndices)
        || !eStandardExactArray(pass.keywordNames, expected.keywordNames) || pass.programHash !== expected.programHash
        || pass.programDataSha256 !== expected.programHash || pass.programRecordSha256 !== expected.programRecordSha256
        || pass.programDataLength !== expected.programDataLength || !state
        || Object.entries(expected.renderState).some(([key, value]) => state[key] !== value)
        || !eStandardExactArray(pass.requiredAttributes, expected.attributes) || !eStandardExactArray(pass.requiredUniforms, expected.uniforms)
        || typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')) {
        throw new Error(`${label} has incomplete or tampered source pass metadata.`)
      }
      for (const attribute of expected.attributes) {
        const sourceName = eStandardSourceAttribute(attribute)
        if (!new RegExp(`\\bin\\b[\\s\\S]*?\\b${eStandardEscaped(sourceName)}\\b`).test(pass.glsl)) throw new Error(`${label} source is missing ${attribute}.`)
      }
      for (const uniform of expected.uniforms) {
        if (!new RegExp(`\\b${eStandardEscaped(uniform)}\\b`).test(pass.glsl)) throw new Error(`${label} source is missing ${uniform} uniform.`)
      }
    }
    const eStandardProperty = (slot: any, name: string) => {
      const value = slot.materialProperties?.floats?.[name] ?? slot.materialProperties?.ints?.[name]
      return value === undefined ? null : Number(value)
    }
    const eStandardColor = (slot: any, name: string) => {
      const color = slot.materialProperties?.colors?.[name]
      if (!color) return null
      const values = [color.r, color.g, color.b, color.a ?? 1].map(Number)
      return values.every(value => Number.isFinite(value)) ? values : null
    }
    const validateEStandardTexture = (slot: any, property: string, required: boolean, label: string) => {
      const texture = slot.materialProperties?.textures?.find((item: any) => item.name === property)
      if (!texture) throw new Error(`${label} is missing exact ${property} material texture record.`)
      if (!required && ((!texture.texture || String(texture.texture.pathId) === '0') && !texture.textureReference)) return null
      const resolved = slot.materialProperties?.resolvedTextures?.find((item: any) => item.property === property)
      if (!texture.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
        || String(texture.texture.file).toLowerCase() !== String(texture.textureReference.serializedFile).toLowerCase()
        || String(texture.texture.pathId) !== String(texture.textureReference.objectId)
        || !resolved?.sourceReference || profileReferenceKey(resolved.sourceReference) !== profileReferenceKey(texture.textureReference)
        || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
        || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0) {
        throw new Error(`${label} has no exact ${property} source texture identity.`)
      }
      return texture
    }
    for (const renderer of renderingProfile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
      if (slot.adapterId !== 'mx-e-standard') continue
      const label = `Profile MX/E-Standard material ${slot.sourceMaterialName ?? '(unnamed)'}`
      const identity = normalizeOutlineIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName)
      if (identity !== 'mx/e-standard' || profileReferenceKey(slot.sourceShaderReference) !== profileReferenceKey(MX_E_STANDARD_SOURCE_REFERENCE)
        || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== MX_E_STANDARD_PROGRAM_BLOB_SHA256) {
        throw new Error(`${label} has an unverified source identity or program version.`)
      }
      const extraction = (slot as any).eStandardShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
        || extraction.fingerprint !== MX_E_STANDARD_FINGERPRINT || extraction.compressedBlobSha256 !== MX_E_STANDARD_PROGRAM_BLOB_SHA256
        || extraction.shaderName !== MX_E_STANDARD_SHADER_NAME || profileReferenceKey(extraction.sourceReference) !== profileReferenceKey(MX_E_STANDARD_SOURCE_REFERENCE)
        || !eStandardExactArray(extraction.shaderKeywordNames, MX_E_STANDARD_SHADER_KEYWORDS)
        || !eStandardExactArray(extraction.requiredProperties, MX_E_STANDARD_REQUIRED_PROPERTIES)
        || !eStandardExactArray(extraction.sourceTextureProperties, MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES)
        || !eStandardExactArray(extraction.requiredTextureProperties, MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES)) {
        throw new Error(`${label} has no exact source extraction provenance.`)
      }
      const keywords = slot.materialProperties?.keywords
      const expectedVariant = eStandardExactArray(keywords, ['_SPECULAR_SETUP']) ? 'static'
        : eStandardExactArray(keywords, ['_DYNAMIC_LIGHTS']) || eStandardExactArray(keywords, ['_DYNAMIC_LIGHTS', '_SPECULAR_SETUP']) ? 'dynamic' : null
      if (!expectedVariant || extraction.activeVariant !== expectedVariant
        || !eStandardExactArray(extraction.activeKeywordNames, expectedVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS'] : [])) {
        throw new Error(`${label} has unsupported active source keywords.`)
      }
      for (const [passName, expected] of Object.entries(eStandardPasses)) validateEStandardPass(extraction.passes?.[passName], expected, `${label} ${passName} pass`)
      const activePass = extraction.passes?.[expectedVariant === 'dynamic' ? 'forwardDynamic' : 'forwardStatic']
      if (!activePass || extraction.passes?.forward?.programHash !== activePass.programHash || extraction.passes?.forward?.blobIndex !== activePass.blobIndex) {
        throw new Error(`${label} has an inconsistent active ForwardLit pass.`)
      }
      const textureProperties = slot.materialProperties?.textures ?? []
      const textureNames = textureProperties.map((item: any) => item.name)
      if (textureNames.length !== MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES.length
        || new Set(textureNames).size !== textureNames.length
        || MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES.some(property => !textureNames.includes(property))) {
        throw new Error(`${label} has an unexpected source texture property set.`)
      }
      validateEStandardTexture(slot, '_MainTex', true, label)
      for (const property of MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES.filter(property => property !== '_MainTex')) validateEStandardTexture(slot, property, false, label)
      const scalarNames = ['_Cutoff', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha', '_ZWrite', '_Cull', '_ZOffsetFactor', '_ZOffsetUnits',
        '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength', '_EmissionStrength', '_SpecPower', '_ShadowAttenSpec', '_LightmapStrength']
      if (scalarNames.some(name => !Number.isFinite(eStandardProperty(slot, name)))) throw new Error(`${label} is missing exact source scalar values.`)
      for (const name of ['_Color', '_SpecLightDir', '_SpecLightColor', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor']) {
        if (!eStandardColor(slot, name)) throw new Error(`${label} is missing exact source color ${name}.`)
      }
      const state = slot.renderState, blend = state?.blend
      if (state?.alphaMode !== 'OPAQUE' || state.layer !== 'opaque' || state.depthWrite !== true || state.depthTest !== true
        || state.depthFunction !== 'less-equal' || state.cullMode !== 'back' || state.doubleSided !== false
        || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0
        || blend?.source !== 1 || blend.destination !== 0 || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 0
        || blend.operation !== 0 || blend.operationAlpha !== 0) throw new Error(`${label} has an unverified opaque depth/cull state.`)
      const binding = slot.glb
      if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
        || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) throw new Error(`${label} has no exact GLB primitive binding.`)
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex]
        const materialIndex = binding.materialIndices[index]
        if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) throw new Error(`${label} lost its exact GLB material binding.`)
        for (const [semantic, type] of [['POSITION', 'VEC3'], ['NORMAL', 'VEC3'], ['TEXCOORD_0', 'VEC2'] ] as const) {
          const accessorIndex = primitive.attributes?.[semantic]
          const accessor = json.accessors?.[accessorIndex]
          if (!Number.isInteger(accessorIndex) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) throw new Error(`${label} primitive ${primitiveIndex} does not preserve ${semantic} source data.`)
        }
      }
      const metadata = json.materials?.[binding.materialIndices[0]]?.extras?.chibi
      const outputMaterial = json.materials?.[binding.materialIndices[0]]
      const metadataMain = metadata?.eStandardTextures?.mainTex
      const sourceColor = eStandardColor(slot, '_Color')
      if (!metadata || metadata.adapterId !== 'mx-e-standard' || metadata.renderPass !== 'forward' || metadata.textureProperty !== '_MainTex'
        || metadata.unlit !== false || metadata.eStandardShaderExtraction === undefined || stable(metadata.eStandardShaderExtraction) !== stable(extraction)
        || metadata.eStandardMaterialProperties === undefined || stable(metadata.eStandardMaterialProperties) !== stable(slot.materialProperties)
        || !metadataMain || !Number.isInteger(metadataMain.index) || metadataMain.index < 0 || metadataMain.index >= (json.textures?.length ?? 0)
        || outputMaterial?.pbrMetallicRoughness?.baseColorTexture?.index !== metadataMain.index
        || outputMaterial?.alphaMode !== 'OPAQUE' || outputMaterial?.doubleSided !== false
        || metadata.depthWrite !== true || metadata.depthTest !== true || metadata.depthFunction !== 'less-equal'
        || metadata.cullMode !== 'back' || metadata.drawLayer !== 'opaque'
        || metadata.blend?.source !== 1 || metadata.blend?.destination !== 0 || metadata.blend?.sourceAlpha !== 1 || metadata.blend?.destinationAlpha !== 0
        || metadata.blend?.operation !== 0 || metadata.blend?.operationAlpha !== 0
        || profileReferenceKey(metadata.sourceMaterialReference) !== profileReferenceKey(slot.sourceMaterialReference)
        || profileReferenceKey(metadata.sourceShaderReference) !== profileReferenceKey(slot.sourceShaderReference)
        || !sourceColor || !Array.isArray(outputMaterial?.pbrMetallicRoughness?.baseColorFactor)
        || !eStandardExactArray(outputMaterial.pbrMetallicRoughness.baseColorFactor, sourceColor)
        || outputMaterial?.extensions?.KHR_materials_unlit !== undefined) {
        throw new Error(`${label} lost its exact source extraction, material, or texture metadata.`)
      }
    }
  }
  const validateDsfxGlitchSlots = () => {
    const exactArray = (actual: unknown, expected: readonly unknown[]) => Array.isArray(actual)
      && actual.length === expected.length && actual.every((value, index) => value === expected[index])
    const sourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
      : attribute === 'NORMAL' ? 'in_NORMAL0' : 'in_TEXCOORD0'
    const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const expectedPasses = {
      forward: {
        pass: 'forward', stateName: 'Forward', passIndex: 0, blobIndex: 1, parameterBlobIndex: 0,
        parameterRecordSha256: DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256, programHash: DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
        programRecordSha256: DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256, programDataLength: DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH,
        attributes: DSFX_GLITCH_TEX_FORWARD_ATTRIBUTES, uniforms: DSFX_GLITCH_TEX_FORWARD_UNIFORMS,
        renderState: { zWrite: 0, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
      },
      shadow: {
        pass: 'shadow', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 3, parameterBlobIndex: 2,
        parameterRecordSha256: DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256, programHash: DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH,
        programRecordSha256: DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256, programDataLength: DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH,
        attributes: DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES, uniforms: DSFX_GLITCH_TEX_SHADOW_UNIFORMS,
        renderState: { zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
      },
    } as const
    const validatePass = (pass: any, expected: (typeof expectedPasses)[keyof typeof expectedPasses], label: string) => {
      const state = pass?.renderState
      if (!pass || pass.pass !== expected.pass || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
        || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
        || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
        || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, []) || !exactArray(pass.keywordNames, [])
        || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash
        || pass.programDataLength !== expected.programDataLength || pass.programRecordSha256 !== expected.programRecordSha256
        || typeof pass.glsl !== 'string' || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')
        || !exactArray(pass.requiredAttributes, expected.attributes) || !exactArray(pass.requiredUniforms, expected.uniforms)
        || !state || Object.entries(expected.renderState).some(([key, value]) => state[key] !== value)) {
        throw new Error(`${label} has incomplete or tampered source pass metadata.`)
      }
      for (const attribute of expected.attributes) {
        if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceAttribute(attribute)}\\b`).test(pass.glsl)) throw new Error(`${label} source is missing ${attribute}.`)
      }
      for (const uniform of expected.uniforms) {
        if (!new RegExp(`\\b${escaped(uniform)}\\b`).test(pass.glsl)) throw new Error(`${label} source is missing ${uniform} uniform.`)
      }
    }
    const numeric = (slot: any, name: string) => Number(slot.materialProperties?.floats?.[name] ?? slot.materialProperties?.ints?.[name])
    for (const renderer of renderingProfile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
      if (slot.adapterId !== 'dsfx-glitch-tex') continue
      const label = `Profile DSFX Glitch_Tex material ${slot.sourceMaterialName ?? '(unnamed)'}`
      if (normalizeOutlineIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName) !== 'dsfx/fx_shader_glitch_tex'
        || profileReferenceKey(slot.sourceShaderReference) !== profileReferenceKey(DSFX_GLITCH_TEX_SOURCE_REFERENCE)
        || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256) throw new Error(`${label} has an unverified source identity or program version.`)
      const extraction = (slot as any).glitchShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
        || extraction.fingerprint !== DSFX_GLITCH_TEX_FINGERPRINT || extraction.compressedBlobSha256 !== DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
        || extraction.shaderName !== DSFX_GLITCH_TEX_SHADER_NAME || profileReferenceKey(extraction.sourceReference) !== profileReferenceKey(DSFX_GLITCH_TEX_SOURCE_REFERENCE)
        || !exactArray(extraction.shaderKeywordNames, DSFX_GLITCH_TEX_SHADER_KEYWORDS) || !exactArray(extraction.requiredProperties, DSFX_GLITCH_TEX_REQUIRED_PROPERTIES)
        || !exactArray(extraction.requiredTextureProperties, DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES)) throw new Error(`${label} has no exact source extraction provenance.`)
      validatePass(extraction.passes?.forward, expectedPasses.forward, `${label} Forward pass`)
      validatePass(extraction.passes?.shadow, expectedPasses.shadow, `${label} ShadowCaster pass`)
      if (!exactArray(slot.materialProperties?.keywords, [])) throw new Error(`${label} has active source shader keywords.`)
      const expectedFloats: Record<string, number> = { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 }
      const floats = slot.materialProperties?.floats ?? {}
      if (Object.keys(floats).length !== Object.keys(expectedFloats).length || Object.entries(expectedFloats).some(([name, value]) => numeric(slot, name) !== value)
        || Object.keys(slot.materialProperties?.ints ?? {}).length || Object.keys(slot.materialProperties?.colors ?? {}).length) throw new Error(`${label} has an unverified source material property state.`)
      const textures = slot.materialProperties?.textures ?? []
      if (textures.length !== 2 || !exactArray(textures.map((item: any) => item.name), DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES)) throw new Error(`${label} has an unverified source texture property set.`)
      const main = textures[0], noise = textures[1]
      if (!main.texture || String(main.texture.pathId) !== '0' || String(main.texture.file).toLowerCase() !== String(slot.sourceMaterialReference?.serializedFile).toLowerCase()
        || main.textureReference !== null || Number(main.scale?.x) !== 1 || Number(main.scale?.y) !== 1 || Number(main.offset?.x) !== 0 || Number(main.offset?.y) !== 0) throw new Error(`${label} has no explicit Unity white _MainTex default.`)
      const noiseReference = { bundleSha256: '1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74', serializedFile: 'CAB-39fe55e8868aab69e2cf9a8ae5dcef67', objectId: '277634516359511144' }
      if (!noise.texture || String(noise.texture.pathId) !== noiseReference.objectId || String(noise.texture.file).toLowerCase() !== noiseReference.serializedFile.toLowerCase()
        || profileReferenceKey(noise.textureReference) !== profileReferenceKey(noiseReference) || Number(noise.scale?.x) !== 1 || Number(noise.scale?.y) !== 1 || Number(noise.offset?.x) !== 0 || Number(noise.offset?.y) !== 0) throw new Error(`${label} has an unverified _NoiseTex source identity.`)
      const resolved = slot.materialProperties?.resolvedTextures ?? []
      if (resolved.length !== 1 || resolved[0]?.property !== '_NoiseTex' || Number(resolved[0]?.width) !== 256 || Number(resolved[0]?.height) !== 256 || profileReferenceKey(resolved[0]?.sourceReference) !== profileReferenceKey(noiseReference)) throw new Error(`${label} has incomplete resolved _NoiseTex evidence.`)
      const state = slot.renderState, blend = state?.blend
      if (state?.sourceQueue !== -1 || state?.alphaMode !== 'BLEND' || state.layer !== 'transparent' || state.depthWrite !== false || state.depthTest !== true
        || state.depthFunction !== 'less-equal' || state.cullMode !== 'back' || state.doubleSided !== false || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0
        || blend?.source !== 5 || blend.destination !== 10 || blend.sourceAlpha !== 5 || blend.destinationAlpha !== 10 || blend.operation !== 0 || blend.operationAlpha !== 0) throw new Error(`${label} has an unverified transparent source render state.`)
      const binding = slot.glb
      if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) throw new Error(`${label} has no exact GLB primitive binding.`)
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex], materialIndex = binding.materialIndices[index]
        if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) throw new Error(`${label} lost its exact GLB material binding.`)
        for (const [semantic, type] of [['POSITION', 'VEC3'], ['NORMAL', 'VEC3'], ['TEXCOORD_0', 'VEC2']] as const) {
          const accessorIndex = primitive.attributes?.[semantic], accessor = json.accessors?.[accessorIndex]
          if (!Number.isInteger(accessorIndex) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) throw new Error(`${label} primitive ${primitiveIndex} does not preserve ${semantic} source data.`)
        }
      }
      const metadata = json.materials?.[binding.materialIndices[0]]?.extras?.chibi, outputMaterial = json.materials?.[binding.materialIndices[0]]
      const noiseIndex = metadata?.glitchTextures?.noiseTex?.index
      if (!metadata || metadata.adapterId !== 'dsfx-glitch-tex' || metadata.renderPass !== 'forward' || metadata.textureProperty !== '_NoiseTex' || metadata.unlit !== true
        || stable(metadata.glitchShaderExtraction) !== stable(extraction) || stable(metadata.glitchMaterialProperties) !== stable(slot.materialProperties)
        || metadata.glitchTextures?.mainTex?.default !== 'unity-white' || metadata.glitchTextures?.mainTex?.index !== undefined
        || !Number.isInteger(noiseIndex) || noiseIndex < 0 || noiseIndex >= (json.textures?.length ?? 0)
        || metadata.glitchShadowPass?.programHash !== DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH
        || profileReferenceKey(metadata.sourceMaterialReference) !== profileReferenceKey(slot.sourceMaterialReference)
        || profileReferenceKey(metadata.sourceShaderReference) !== profileReferenceKey(slot.sourceShaderReference)
        || outputMaterial?.alphaMode !== 'BLEND' || outputMaterial?.doubleSided !== false
        || outputMaterial?.pbrMetallicRoughness?.baseColorTexture !== undefined
        || metadata.depthWrite !== false || metadata.depthTest !== true || metadata.depthFunction !== 'less-equal' || metadata.cullMode !== 'back' || metadata.drawLayer !== 'transparent'
        || metadata.blend?.source !== 5 || metadata.blend?.destination !== 10 || metadata.blend?.sourceAlpha !== 5 || metadata.blend?.destinationAlpha !== 10
        || metadata.blend?.operation !== 0 || metadata.blend?.operationAlpha !== 0) throw new Error(`${label} lost its exact source extraction, material, or texture metadata.`)
    }
  }
  const validateDsfxMatcapSlots = () => {
    const exactArray = (actual: unknown, expected: readonly unknown[]) => Array.isArray(actual)
      && actual.length === expected.length && actual.every((value, index) => value === expected[index])
    const sourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
      : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_TEXCOORD0'
    const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const expectedPasses = {
      forward: {
        pass: 'forward', variant: 'static', stateName: 'Forward', passIndex: 0, blobIndex: 2, parameterBlobIndex: 0,
        parameterRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH,
        programRecordSha256: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH,
        attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
        keywordIndices: [], keywordNames: [],
        renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
      },
      forwardInstanced: {
        pass: 'forward', variant: 'instanced', stateName: 'Forward', passIndex: 0, blobIndex: 3, parameterBlobIndex: 1,
        parameterRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH,
        programRecordSha256: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
        attributes: DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
        keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
      },
      shadow: {
        pass: 'shadow', variant: 'static', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 6, parameterBlobIndex: 4,
        parameterRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH,
        programRecordSha256: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH,
        attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
        keywordIndices: [], keywordNames: [],
        renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
      },
      shadowInstanced: {
        pass: 'shadow', variant: 'instanced', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 7, parameterBlobIndex: 5,
        parameterRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256, programHash: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH,
        programRecordSha256: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256, programDataLength: DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
        attributes: DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
        keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
      },
    } as const
    const validatePass = (pass: any, expected: (typeof expectedPasses)[keyof typeof expectedPasses], label: string) => {
      const state = pass?.renderState
      if (!pass || pass.pass !== expected.pass || pass.variant !== expected.variant || pass.stateName !== expected.stateName || pass.subShaderIndex !== 0
        || pass.passIndex !== expected.passIndex || pass.stage !== 'vertex' || pass.platform !== 9 || pass.gpuProgramType !== 4
        || pass.blobIndex !== expected.blobIndex || pass.parameterBlobIndex !== expected.parameterBlobIndex
        || pass.parameterRecordSha256 !== expected.parameterRecordSha256 || !exactArray(pass.keywordIndices, expected.keywordIndices) || !exactArray(pass.keywordNames, expected.keywordNames)
        || pass.programHash !== expected.programHash || pass.programDataSha256 !== expected.programHash || pass.programDataLength !== expected.programDataLength
        || pass.programRecordSha256 !== expected.programRecordSha256 || typeof pass.glsl !== 'string'
        || !pass.glsl.includes('#version 300 es') || !pass.glsl.includes('#ifdef VERTEX') || !pass.glsl.includes('#ifdef FRAGMENT')
        || !exactArray(pass.requiredAttributes, expected.attributes) || !exactArray(pass.requiredUniforms, expected.uniforms)
        || !state || Object.entries(expected.renderState).some(([key, value]) => state[key] !== value)) {
        throw new Error(`${label} has incomplete or tampered source pass metadata.`)
      }
      for (const attribute of expected.attributes) {
        if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceAttribute(attribute)}\\b`).test(pass.glsl)) throw new Error(`${label} source is missing ${attribute}.`)
      }
      for (const uniform of expected.uniforms) {
        if (!new RegExp(`\\b${escaped(uniform)}\\b`).test(pass.glsl)) throw new Error(`${label} source is missing ${uniform}.`)
      }
    }
    for (const renderer of renderingProfile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
      if (slot.adapterId !== 'dsfx-matcap') continue
      const label = `Profile DSFX Matcap material ${slot.sourceMaterialName ?? '(unnamed)'}`
      if (normalizeOutlineIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName) !== 'dsfx/fx_shader_matcap'
        || profileReferenceKey(slot.sourceShaderReference) !== profileReferenceKey(DSFX_MATCAP_SOURCE_REFERENCE)
        || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== DSFX_MATCAP_PROGRAM_BLOB_SHA256
        || profileReferenceKey(slot.sourceMaterialReference) !== profileReferenceKey(DSFX_MATCAP_MATERIAL_REFERENCE)) throw new Error(`${label} has an unverified source identity or program version.`)
      const extraction = slot.matcapShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
        || extraction.fingerprint !== DSFX_MATCAP_FINGERPRINT || extraction.compressedBlobSha256 !== DSFX_MATCAP_PROGRAM_BLOB_SHA256
        || extraction.shaderName !== DSFX_MATCAP_SHADER_NAME || profileReferenceKey(extraction.sourceReference) !== profileReferenceKey(DSFX_MATCAP_SOURCE_REFERENCE)
        || !exactArray(extraction.shaderKeywordNames, DSFX_MATCAP_SHADER_KEYWORDS) || !exactArray(extraction.requiredProperties, DSFX_MATCAP_REQUIRED_PROPERTIES)
        || !exactArray(extraction.requiredTextureProperties, DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES)) throw new Error(`${label} has no exact source extraction provenance.`)
      for (const [name, expected] of Object.entries(expectedPasses)) validatePass((extraction.passes as any)?.[name], expected, `${label} ${name} pass`)
      const extractionGlsl = Object.values(extraction.passes ?? {}).map((pass: any) => String(pass?.glsl ?? '')).join('\n')
      for (const inert of [...Object.keys(DSFX_MATCAP_INERT_FLOAT_PROPERTIES), ...Object.keys(DSFX_MATCAP_INERT_COLOR_PROPERTIES)]) {
        if (new RegExp(`\\b${escaped(inert)}\\b`).test(extractionGlsl)) throw new Error(`${label} source extraction declares or consumes inert Matcap property ${inert}.`)
      }
      if (!exactArray(slot.materialProperties?.keywords, [])) throw new Error(`${label} has active source shader keywords.`)
      const numeric = (name: string) => {
        const value = slot.materialProperties?.floats?.[name] ?? slot.materialProperties?.ints?.[name]
        return typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN
      }
      const expectedFloats: Record<string, number> = { ...DSFX_MATCAP_INERT_FLOAT_PROPERTIES, _ZWrite_Mode: 1, _Cull_Mode: 2 }
      const floats = slot.materialProperties?.floats ?? {}, ints = slot.materialProperties?.ints ?? {}
      if (Object.keys(floats).length !== Object.keys(expectedFloats).length
        || Object.keys(floats).some(name => !Object.prototype.hasOwnProperty.call(expectedFloats, name))
        || Object.entries(expectedFloats).some(([name, expected]) => numeric(name) !== expected)
        || Object.keys(ints).length !== 0) throw new Error(`${label} has an unverified scalar or color property set.`)
      const expectedColors = { ...DSFX_MATCAP_INERT_COLOR_PROPERTIES, _Main_Color: {
        r: DSFX_MATCAP_MAIN_COLOR[0], g: DSFX_MATCAP_MAIN_COLOR[1], b: DSFX_MATCAP_MAIN_COLOR[2], a: DSFX_MATCAP_MAIN_COLOR[3],
      } }
      const colorMatches = (actual: unknown, expected: { r: number; g: number; b: number; a: number }) => {
        if (!actual || typeof actual !== 'object') return false
        const value = actual as Record<string, unknown>
        return (['r', 'g', 'b', 'a'] as const).every(component => {
          const componentValue = value[component]
          if (!Object.prototype.hasOwnProperty.call(value, component)
            || (typeof componentValue !== 'number' && typeof componentValue !== 'string')) return false
          const number = Number(componentValue)
          return Number.isFinite(number) && number === expected[component]
        })
      }
      const colorProperties = slot.materialProperties?.colors ?? {}
      if (Object.keys(colorProperties).length !== Object.keys(expectedColors).length
        || Object.keys(colorProperties).some(name => !Object.prototype.hasOwnProperty.call(expectedColors, name))
        || Object.entries(expectedColors).some(([name, expected]) => !colorMatches(colorProperties[name], expected))) throw new Error(`${label} has an unverified scalar or color property set.`)
      const colors = slot.materialProperties?.colors?._Main_Color
      const color = colors ? [colors.r, colors.g, colors.b, colors.a].map(Number) : []
      if (!exactArray(color, DSFX_MATCAP_MAIN_COLOR)) throw new Error(`${label} has an unverified _Main_Color value.`)
      if (numeric('_ZWrite_Mode') !== 1 || numeric('_Cull_Mode') !== 2) throw new Error(`${label} has an unverified source render-state property.`)
      const textures = slot.materialProperties?.textures ?? []
      if (textures.length !== 3 || !exactArray(textures.map((item: any) => item.name), ['_Main_Tex', '_Matcap_Tex', '_texcoord'])) throw new Error(`${label} has an unverified source texture property set.`)
      const expectedTextures = { _Main_Tex: DSFX_MATCAP_MAIN_TEXTURE_REFERENCE, _Matcap_Tex: DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE } as const
      for (const property of DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES) {
        const texture = textures.find((item: any) => item.name === property)
        const expectedTexture = expectedTextures[property]
        if (!texture?.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
          || String(texture.texture.file).toLowerCase() !== expectedTexture.serializedFile.toLowerCase()
          || String(texture.texture.pathId) !== expectedTexture.objectId || profileReferenceKey(texture.textureReference) !== profileReferenceKey(expectedTexture)
          || Number(texture.scale?.x) !== 1 || Number(texture.scale?.y) !== 1 || Number(texture.offset?.x) !== 0 || Number(texture.offset?.y) !== 0) throw new Error(`${label} has an unverified ${property} source identity.`)
      }
      const texcoord = textures.find((item: any) => item.name === '_texcoord')
      if (!texcoord?.texture || String(texcoord.texture.pathId) !== '0' || texcoord.textureReference !== null
        || Number(texcoord.scale?.x) !== 1 || Number(texcoord.scale?.y) !== 1 || Number(texcoord.offset?.x) !== 0 || Number(texcoord.offset?.y) !== 0) throw new Error(`${label} has an unverified _texcoord default binding.`)
      const resolved = slot.materialProperties?.resolvedTextures ?? []
      if (resolved.length !== 2 || !exactArray(resolved.map((item: any) => item.property), ['_Main_Tex', '_Matcap_Tex'])
        || resolved.some((item: any) => Number(item.width) !== 64 || Number(item.height) !== 64)) throw new Error(`${label} has incomplete resolved texture evidence.`)
      for (const property of DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES) {
        const resolvedTexture = resolved.find((item: any) => item.property === property)
        if (profileReferenceKey(resolvedTexture?.sourceReference) !== profileReferenceKey(expectedTextures[property])) throw new Error(`${label} has an inconsistent resolved ${property} identity.`)
      }
      const state = slot.renderState, blend = state?.blend
      if (state?.sourceQueue !== -1 || state.alphaMode !== 'BLEND' || state.layer !== 'transparent' || state.depthWrite !== true || state.depthTest !== true
        || state.depthFunction !== 'less-equal' || state.cullMode !== 'back' || state.doubleSided !== false || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0
        || blend?.source !== 5 || blend.destination !== 10 || blend.sourceAlpha !== 5 || blend.destinationAlpha !== 10 || blend.operation !== 0 || blend.operationAlpha !== 0) throw new Error(`${label} has an unverified transparent source render state.`)
      const binding = slot.glb
      if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) throw new Error(`${label} has no exact GLB primitive binding.`)
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex], materialIndex = binding.materialIndices[index]
        if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) throw new Error(`${label} lost its exact GLB material binding.`)
        for (const [semantic, type] of [['POSITION', 'VEC3'], ['NORMAL', 'VEC3'], ['TEXCOORD_0', 'VEC2'], ['COLOR_0', 'VEC4']] as const) {
          const accessorIndex = primitive.attributes?.[semantic], accessor = json.accessors?.[accessorIndex]
          if (!Number.isInteger(accessorIndex) || !accessor || accessor.componentType !== 5126 || accessor.type !== type) throw new Error(`${label} primitive ${primitiveIndex} does not preserve ${semantic} source data.`)
        }
      }
      const metadata = json.materials?.[binding.materialIndices[0]]?.extras?.chibi, outputMaterial = json.materials?.[binding.materialIndices[0]]
      const mainIndex = metadata?.matcapTextures?.mainTex?.index, matcapIndex = metadata?.matcapTextures?.matcapTex?.index
      const sourceColor = DSFX_MATCAP_MAIN_COLOR
      if (!metadata || metadata.adapterId !== 'dsfx-matcap' || metadata.renderPass !== 'forward' || metadata.textureProperty !== '_Main_Tex'
        || metadata.unlit !== false || stable(metadata.matcapShaderExtraction) !== stable(extraction) || stable(metadata.matcapMaterialProperties) !== stable(slot.materialProperties)
        || !Number.isInteger(mainIndex) || !Number.isInteger(matcapIndex) || mainIndex === matcapIndex
        || mainIndex < 0 || mainIndex >= (json.textures?.length ?? 0) || matcapIndex < 0 || matcapIndex >= (json.textures?.length ?? 0)
        || outputMaterial?.pbrMetallicRoughness?.baseColorTexture?.index !== mainIndex || outputMaterial?.alphaMode !== 'BLEND' || outputMaterial?.doubleSided !== false
        || metadata.depthWrite !== true || metadata.depthTest !== true || metadata.depthFunction !== 'less-equal' || metadata.cullMode !== 'back' || metadata.drawLayer !== 'transparent'
        || metadata.blend?.source !== 5 || metadata.blend?.destination !== 10 || metadata.blend?.sourceAlpha !== 5 || metadata.blend?.destinationAlpha !== 10
        || metadata.blend?.operation !== 0 || metadata.blend?.operationAlpha !== 0 || stable(metadata.matcapShadowPass) !== stable(extraction.passes.shadow)
        || profileReferenceKey(metadata.sourceMaterialReference) !== profileReferenceKey(slot.sourceMaterialReference) || profileReferenceKey(metadata.sourceShaderReference) !== profileReferenceKey(slot.sourceShaderReference)
        || !Array.isArray(outputMaterial?.pbrMetallicRoughness?.baseColorFactor) || !sameNumbers(outputMaterial.pbrMetallicRoughness.baseColorFactor, [...sourceColor])
        || outputMaterial?.extensions?.KHR_materials_unlit !== undefined) throw new Error(`${label} lost its exact source extraction, material, or texture metadata.`)
    }
  }
  const validateDsfxStaticSlots = () => {
    const exactArray = (actual: unknown, expected: readonly unknown[]) => Array.isArray(actual)
      && actual.length === expected.length && actual.every((value, index) => value === expected[index])
    const exactHash = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
    const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const stateMatches = (state: any, expected: any) => {
      const blend = state?.blend, expectedBlend = expected?.blend
      return state?.alphaMode === expected?.alphaMode && state?.layer === expected?.layer
        && state?.depthWrite === expected?.depthWrite && state?.depthTest === expected?.depthTest
        && state?.depthFunction === expected?.depthFunction && state?.cullMode === expected?.cullMode
        && state?.doubleSided === expected?.doubleSided
        && state?.polygonOffsetFactor === expected?.polygonOffsetFactor && state?.polygonOffsetUnits === expected?.polygonOffsetUnits
        && blend?.source === expectedBlend?.source && blend?.destination === expectedBlend?.destination
        && blend?.sourceAlpha === expectedBlend?.sourceAlpha && blend?.destinationAlpha === expectedBlend?.destinationAlpha
        && blend?.operation === expectedBlend?.operation && blend?.operationAlpha === expectedBlend?.operationAlpha
    }
    const validateAlphaExtraction = (slot: any, label: string) => {
      const extraction = slot.dsfxShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
        || !/^2021\.3(?:\.|$)/.test(String(extraction.unityVersion ?? ''))
        || !exactHash(extraction.fingerprint)
        || String(extraction.compressedBlobSha256 ?? '').toLowerCase() !== CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].programBlobSha256
        || normalizeOutlineIdentity(extraction.shader?.name) !== CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].identity
        || profileReferenceKey(extraction.shader?.sourceReference) !== profileReferenceKey(CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].sourceReference)
        || !Array.isArray(extraction.shader?.keywordNames) || !Array.isArray(extraction.programs)
        || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
        throw new Error(`${label} has no exact source extraction provenance.`)
      }
      const expectedPrograms = DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS
      const gles3Programs = extraction.gles3Programs
      const allGles3Programs = extraction.programs.filter((program: any) => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
      if (gles3Programs.length !== expectedPrograms.length || allGles3Programs.length !== expectedPrograms.length) {
        throw new Error(`${label} has an incomplete GLES3 program record set.`)
      }
      for (const [index, expected] of expectedPrograms.entries()) {
        const program = gles3Programs[index]
        if (program?.kind !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
          || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
          || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
          || program.recordSha256 !== expected.recordSha256 || typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')) {
          throw new Error(`${label} has a tampered GLES3 program ${index}.`)
        }
        const record = allGles3Programs.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
        if (!record || record.programHash !== expected.programHash || record.programDataSha256 !== expected.programHash
          || record.programDataLength !== expected.programDataLength || record.recordSha256 !== expected.recordSha256) {
          throw new Error(`${label} is missing GLES3 program record ${expected.blobIndex}.`)
        }
      }
      const bindings = extraction.bindings.filter((binding: any) => binding?.platform === 9 && binding.gpuProgramType === 4)
      if (bindings.length !== expectedPrograms.length
        || expectedPrograms.some(expected => !bindings.some((binding: any) => binding.blobIndex === expected.blobIndex && binding.programHash === expected.programHash))) {
        throw new Error(`${label} has incomplete GLES3 binding evidence.`)
      }
      const glsl = [...gles3Programs, ...allGles3Programs].map((program: any) => String(program.glsl ?? '')).join('\n')
      for (const required of ['_Texture', '_Color', '_Custom_Data_Offset_Use', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_MatrixVP']) {
        if (!new RegExp(`\\b${escaped(required)}\\b`).test(glsl)) throw new Error(`${label} source extraction is missing ${required}.`)
      }
      for (const inert of ['_GlossyReflections', '_EnvironmentReflections', '_LightingEnabled', '_OcclusionStrength', '_SpecularHighlights', '_EmissionColor', '_SpecColor']) {
        if (new RegExp(`\\b${escaped(inert)}\\b`).test(glsl)) throw new Error(`${label} source extraction declares inert property ${inert}.`)
      }
    }
    const sourceAttribute = (attribute: string) => attribute === 'POSITION' ? 'in_POSITION0'
      : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
        : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1'
          : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_NORMAL0'
    const validateAdditiveExtraction = (slot: any, label: string) => {
      const extraction = slot.dsfxShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
        || extraction.unityVersion !== '2021.3' || extraction.fingerprint !== DSFX_ADDITIVE_0_FINGERPRINT
        || String(extraction.compressedBlobSha256 ?? '').toLowerCase() !== DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256
        || normalizeOutlineIdentity(extraction.shader?.name) !== normalizeOutlineIdentity(DSFX_ADDITIVE_0_SHADER_NAME)
        || profileReferenceKey(extraction.shader?.sourceReference) !== profileReferenceKey(DSFX_ADDITIVE_0_SOURCE_REFERENCE)
        || !exactArray(extraction.shader?.keywordNames, DSFX_ADDITIVE_0_SHADER_KEYWORDS)
        || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
        throw new Error(`${label} has no exact source extraction provenance.`)
      }
      const expectedPrograms = DSFX_ADDITIVE_0_GLES3_PROGRAMS
      const gles3Programs = extraction.gles3Programs
      const allGles3Programs = extraction.programs.filter((program: any) => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
      const bindings = extraction.bindings.filter((binding: any) => binding?.platform === 9 && binding.gpuProgramType === 4)
      if (gles3Programs.length !== expectedPrograms.length || allGles3Programs.length !== expectedPrograms.length || bindings.length !== expectedPrograms.length) {
        throw new Error(`${label} has an incomplete GLES3 Additive_0 program or binding set.`)
      }
      for (const [index, expected] of expectedPrograms.entries()) {
        const program = gles3Programs[index]
        const complete = allGles3Programs.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
        const binding = bindings.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
        if (!program || program.kind !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
          || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
          || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
          || program.recordSha256 !== expected.programRecordSha256 || typeof program.glsl !== 'string'
          || program.glsl.length !== expected.programDataLength || !program.glsl.includes('#version 300 es')
          || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')
          || !complete || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programHash
          || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
          || typeof complete.glsl !== 'string' || complete.glsl.length !== expected.programDataLength
          || !binding || binding.subShaderIndex !== 0 || binding.passIndex !== (expected.pass === 'forward' ? 0 : 1)
          || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
          || binding.blobIndex !== expected.blobIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
          || binding.platform !== 9 || binding.gpuProgramType !== 4
          || binding.parameterRecordSha256 !== expected.parameterRecordSha256 || binding.programHash !== expected.programHash
          || binding.gles3ProgramHash !== expected.programHash || binding.programRecordSha256 !== expected.programRecordSha256
          || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)) {
          throw new Error(`${label} has a tampered GLES3 Additive_0 program or binding ${index}.`)
        }
        const fullProgramFields = ['version', 'platformName', 'gpuProgramTypeName', 'sourceMap', 'offset', 'size', 'segment', 'keywords']
        const interfaceNames = (value: any) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : item?.name ?? '') : null
        const hasFullProgramFields = fullProgramFields.some(field => program[field] !== undefined)
          || program.attributes !== undefined || program.uniforms !== undefined
        if (hasFullProgramFields && (program.version !== expected.version || program.platformName !== expected.platformName
          || program.gpuProgramTypeName !== expected.gpuProgramTypeName || program.sourceMap !== expected.sourceMap
          || program.offset !== expected.offset || program.size !== expected.size || program.segment !== expected.segment
          || !exactArray(program.keywords, expected.keywords)
          || (program.attributes !== undefined && !exactArray(interfaceNames(program.attributes), expected.programAttributes))
          || (program.uniforms !== undefined && !exactArray(interfaceNames(program.uniforms), expected.requiredUniforms)))) {
          throw new Error(`${label} has tampered Additive_0 interface metadata ${index}.`)
        }
        if (complete && hasFullProgramFields && (complete.version !== expected.version || complete.platformName !== expected.platformName
          || complete.gpuProgramTypeName !== expected.gpuProgramTypeName || complete.sourceMap !== expected.sourceMap
          || complete.offset !== expected.offset || complete.size !== expected.size || complete.segment !== expected.segment
          || !exactArray(complete.keywords, expected.keywords)
          || (complete.attributes !== undefined && !exactArray(interfaceNames(complete.attributes), expected.programAttributes))
          || (complete.uniforms !== undefined && !exactArray(interfaceNames(complete.uniforms), expected.requiredUniforms)))) {
          throw new Error(`${label} has tampered Additive_0 complete-record metadata ${index}.`)
        }
        const sourceReferenceMatches = (value: any) => value === undefined || profileReferenceKey(value) === profileReferenceKey(DSFX_ADDITIVE_0_SOURCE_REFERENCE)
        if (!sourceReferenceMatches(program.sourceReference) || !sourceReferenceMatches(complete?.sourceReference)
          || (binding.gpuProgramTypeName !== undefined && binding.gpuProgramTypeName !== expected.gpuProgramTypeName)
          || (binding.playerGroupIndex !== undefined && binding.playerGroupIndex !== expected.playerGroupIndex)
          || (binding.playerIndex !== undefined && binding.playerIndex !== expected.playerIndex)
          || (binding.subProgramIndex !== undefined && binding.subProgramIndex !== expected.subProgramIndex)
          || (binding.shaderRequirements !== undefined && binding.shaderRequirements !== expected.shaderRequirements)
          || (binding.sourceReference !== undefined && !sourceReferenceMatches(binding.sourceReference))) {
          throw new Error(`${label} has tampered Additive_0 identity metadata ${index}.`)
        }
        for (const attribute of expected.requiredAttributes) {
          if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceAttribute(attribute)}\\b`).test(program.glsl)) throw new Error(`${label} source extraction is missing ${attribute}.`)
        }
        for (const uniform of expected.requiredUniforms) {
          if (!new RegExp(`\\b${escaped(uniform)}\\b`).test(program.glsl)) throw new Error(`${label} source extraction is missing ${uniform} uniform.`)
        }
        for (const forbidden of ['_Time', 'unity_Time', 'gl_FragCoord', 'gl_FragDepth', 'gl_FragDepthEXT', 'sampler2DShadow', 'samplerCubeShadow', 'textureProj']) {
          if (new RegExp(`\\b${escaped(forbidden)}\\b`).test(program.glsl)) throw new Error(`${label} source extraction uses forbidden dynamic/depth input ${forbidden}.`)
        }
      }
    }
    const validateAlphaBlendAddExtraction = (slot: any, label: string) => {
      const extraction = slot.dsfxShaderExtraction
      if (!extraction || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
        || extraction.unityVersion !== '2021.3' || extraction.fingerprint !== DSFX_ALPHA_BLEND_ADD_FINGERPRINT
        || String(extraction.compressedBlobSha256 ?? '').toLowerCase() !== DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256
        || normalizeOutlineIdentity(extraction.shader?.name) !== normalizeOutlineIdentity(DSFX_ALPHA_BLEND_ADD_SHADER_NAME)
        || profileReferenceKey(extraction.shader?.sourceReference) !== profileReferenceKey(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
        || !exactArray(extraction.shader?.keywordNames, DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS)
        || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
        throw new Error(`${label} has no exact AlphaBlend_Add source extraction provenance.`)
      }
      const expectedPrograms = DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS
      const gles3Programs = extraction.gles3Programs
      const allGles3Programs = extraction.programs.filter((program: any) => program?.kind === 'program' && program.platform === 9 && program.gpuProgramType === 4)
      const bindings = extraction.bindings.filter((binding: any) => binding?.platform === 9 && binding.gpuProgramType === 4)
      if (gles3Programs.length !== expectedPrograms.length || allGles3Programs.length !== expectedPrograms.length || bindings.length !== expectedPrograms.length) {
        throw new Error(`${label} has an incomplete GLES3 AlphaBlend_Add program or binding set.`)
      }
      for (const [index, expected] of expectedPrograms.entries()) {
        const program = gles3Programs[index]
        const complete = allGles3Programs.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
        const binding = bindings.find((candidate: any) => candidate.blobIndex === expected.blobIndex)
        if (!program || program.kind !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
          || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
          || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
          || program.recordSha256 !== expected.programRecordSha256 || typeof program.glsl !== 'string'
          || program.glsl.length !== expected.programDataLength || !program.glsl.includes('#version 300 es')
          || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')
          || !complete || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programHash
          || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
          || typeof complete.glsl !== 'string' || complete.glsl.length !== expected.programDataLength
          || !binding || binding.subShaderIndex !== 0 || binding.passIndex !== (expected.pass === 'forward' ? 0 : 1)
          || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
          || binding.blobIndex !== expected.blobIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
          || binding.platform !== 9 || binding.gpuProgramType !== 4 || binding.parameterRecordSha256 !== expected.parameterRecordSha256
          || binding.programHash !== expected.programHash || binding.gles3ProgramHash !== expected.programHash
          || binding.programRecordSha256 !== expected.programRecordSha256
          || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)) {
          throw new Error(`${label} has a tampered GLES3 AlphaBlend_Add program or binding ${index}.`)
        }
        const fullProgramFields = ['version', 'platformName', 'gpuProgramTypeName', 'sourceMap', 'offset', 'size', 'segment', 'keywords']
        const interfaceNames = (value: any) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : item?.name ?? '') : null
        const hasFullProgramFields = fullProgramFields.some(field => program[field] !== undefined)
          || program.attributes !== undefined || program.uniforms !== undefined
        if (hasFullProgramFields && (program.version !== expected.version || program.platformName !== expected.platformName
          || program.gpuProgramTypeName !== expected.gpuProgramTypeName || program.sourceMap !== expected.sourceMap
          || program.offset !== expected.offset || program.size !== expected.size || program.segment !== expected.segment
          || !exactArray(program.keywords, expected.keywords)
          || (program.attributes !== undefined && !exactArray(interfaceNames(program.attributes), expected.programAttributes))
          || (program.uniforms !== undefined && !exactArray(interfaceNames(program.uniforms), expected.requiredUniforms)))) {
          throw new Error(`${label} has tampered AlphaBlend_Add interface metadata ${index}.`)
        }
        if (complete && hasFullProgramFields && (complete.version !== expected.version || complete.platformName !== expected.platformName
          || complete.gpuProgramTypeName !== expected.gpuProgramTypeName || complete.sourceMap !== expected.sourceMap
          || complete.offset !== expected.offset || complete.size !== expected.size || complete.segment !== expected.segment
          || !exactArray(complete.keywords, expected.keywords)
          || (complete.attributes !== undefined && !exactArray(interfaceNames(complete.attributes), expected.programAttributes))
          || (complete.uniforms !== undefined && !exactArray(interfaceNames(complete.uniforms), expected.requiredUniforms)))) {
          throw new Error(`${label} has tampered AlphaBlend_Add complete-record metadata ${index}.`)
        }
        const sourceReferenceMatches = (value: any) => value === undefined || profileReferenceKey(value) === profileReferenceKey(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
        if (!sourceReferenceMatches(program.sourceReference) || !sourceReferenceMatches(complete?.sourceReference)
          || (binding.gpuProgramTypeName !== undefined && binding.gpuProgramTypeName !== expected.gpuProgramTypeName)
          || (binding.playerGroupIndex !== undefined && binding.playerGroupIndex !== expected.playerGroupIndex)
          || (binding.playerIndex !== undefined && binding.playerIndex !== expected.playerIndex)
          || (binding.subProgramIndex !== undefined && binding.subProgramIndex !== expected.subProgramIndex)
          || (binding.shaderRequirements !== undefined && binding.shaderRequirements !== expected.shaderRequirements)
          || (binding.sourceReference !== undefined && !sourceReferenceMatches(binding.sourceReference))) {
          throw new Error(`${label} has tampered AlphaBlend_Add identity metadata ${index}.`)
        }
        for (const attribute of expected.requiredAttributes) {
          if (!new RegExp(`\\bin\\s+[^;]*\\b${sourceAttribute(attribute)}\\b`).test(program.glsl)) throw new Error(`${label} source extraction is missing ${attribute}.`)
        }
        for (const uniform of expected.requiredUniforms) {
          if (!new RegExp(`\\b${escaped(uniform)}\\b`).test(program.glsl)) throw new Error(`${label} source extraction is missing ${uniform} uniform.`)
        }
        if (slot.dsfxMaterialVariant === DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT) {
          for (const inert of DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES) {
            if (new RegExp(`\\b${escaped(inert)}\\b`).test(program.glsl)) throw new Error(`${label} source extraction consumes Wakamo inert property ${inert}.`)
          }
        }
        for (const forbidden of ['_Time', 'unity_Time', 'gl_FragCoord', 'gl_FragDepth', 'gl_FragDepthEXT', 'sampler2DShadow', 'samplerCubeShadow', 'textureProj']) {
          if (new RegExp(`\\b${escaped(forbidden)}\\b`).test(program.glsl)) throw new Error(`${label} source extraction uses forbidden dynamic/depth input ${forbidden}.`)
        }
      }
    }
    for (const renderer of renderingProfile?.renderers ?? []) for (const slot of renderer.materialSlots ?? []) {
      if (slot.adapterId !== 'dsfx-static') continue
      const label = `Profile DSFX static material ${slot.sourceMaterialName ?? '(unnamed)'}`
      const identity = normalizeOutlineIdentity(slot.sourceShaderParsedName ?? slot.sourceShaderName)
      const rule = CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES.find(candidate => candidate.identity === identity)
      if (!rule || String(slot.shaderProgramBlobSha256 ?? '').toLowerCase() !== rule.programBlobSha256
        || profileReferenceKey(slot.sourceShaderReference) !== profileReferenceKey(rule.sourceReference)) {
        throw new Error(`${label} has an unverified source identity or program version.`)
      }
      const isAlpha = identity === 'dsfx/fx_shader_alphablend_0'
      const isAlphaAdd = identity === 'dsfx/fx_shader_alphablend_add'
      const isAdditive = identity === 'dsfx/fx_shader_additive_0'
      const hasWakamoWhiteDefaultSource = isAlphaAdd
        && profileReferenceKey(slot.sourceMaterialReference) === profileReferenceKey(DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE)
      const isWakamoWhiteDefault = slot.dsfxMaterialVariant === DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT
      if (isWakamoWhiteDefault !== hasWakamoWhiteDefaultSource
        || (slot.dsfxMaterialVariant !== undefined && slot.dsfxMaterialVariant !== null && !isWakamoWhiteDefault)) {
        throw new Error(`${label} has a DSFX material variant outside the exact Wakamo eye source.`)
      }
      const variant = isAlpha || isAlphaAdd || isAdditive ? slot.dsfxRenderStateVariant : null
      const expected = isAlpha
        ? DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS[variant as keyof typeof DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS]
        : isAlphaAdd ? DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS[variant as keyof typeof DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS]
          : isAdditive ? DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS[variant as keyof typeof DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS]
          : rule.renderState
      if (((isAlpha || isAlphaAdd || isAdditive) && !expected)
        || (!isAlpha && !isAlphaAdd && !isAdditive && slot.dsfxRenderStateVariant !== undefined && slot.dsfxRenderStateVariant !== null)
        || !stateMatches(slot.renderState, expected)) {
        throw new Error(`${label} has an unverified translated render-state variant.`)
      }
      if (isAlphaAdd && slot.renderState.sourceQueue !== (isWakamoWhiteDefault ? -1 : 3000)) throw new Error(`${label} has an unverified AlphaBlend_Add source queue.`)
      if (isAlpha) validateAlphaExtraction(slot, label)
      else if (isAlphaAdd) validateAlphaBlendAddExtraction(slot, label)
      else if (isAdditive) validateAdditiveExtraction(slot, label)
      else if (slot.dsfxShaderExtraction !== undefined && slot.dsfxShaderExtraction !== null) throw new Error(`${label} has unexpected source extraction metadata.`)
      const properties = slot.materialProperties
      if (!Array.isArray(properties?.keywords) || properties.keywords.length) throw new Error(`${label} has active source shader keywords.`)
      if (isAdditive || isAlphaAdd) {
        const floats = properties.floats ?? {}, ints = properties.ints ?? {}, colors = properties.colors ?? {}, textures = properties.textures ?? [], resolvedTextures = properties.resolvedTextures ?? []
        const propertyNames = [...Object.keys(floats), ...Object.keys(ints), ...Object.keys(colors), ...textures.map((item: any) => item.name)]
        const expectedWakamoFloats = DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOAT_PROPERTIES
        const expectedWakamoColors = DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLOR_PROPERTIES
        const expectedProperties = isWakamoWhiteDefault
          ? [...Object.keys(expectedWakamoFloats), ...Object.keys(expectedWakamoColors), '_Texture']
          : isAlphaAdd ? DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES : DSFX_ADDITIVE_0_REQUIRED_PROPERTIES
        const expectedTextureProperties = isAlphaAdd ? DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES : DSFX_ADDITIVE_0_REQUIRED_TEXTURE_PROPERTIES
        const expectedFloats: Record<string, readonly number[]> = isAlphaAdd
          ? { _Custom_Data_Offset_Use: [isWakamoWhiteDefault ? 1 : 0], _ZWrite_Mode: [0], _ZOffsetFactor: [0], _ZOffsetUnits: [0], _ZTest_Mode: [4], _Cull_Mode: isWakamoWhiteDefault ? [2] : [0, 2], _RGBRGBA: [0], _Main_Texture_No: isWakamoWhiteDefault ? [1] : [0, 1] }
          : { _Custom_Data_Offset_Use: [0], _ZWrite_Mode: [0], _ZOffsetFactor: [0], _ZOffsetUnits: [0], _ZTest_Mode: [4], _Cull_Mode: [0, 2] }
        if (propertyNames.length !== expectedProperties.length
          || new Set(propertyNames).size !== propertyNames.length
          || !expectedProperties.every(name => propertyNames.includes(name))
          || Object.keys(ints).length || Object.entries(expectedFloats).some(([name, values]) => !Number.isFinite(Number(floats[name])) || !values.includes(Number(floats[name])))
          || (isAlphaAdd && !Number.isFinite(Number(floats._Multiply)))
          || Object.keys(colors).length !== (isWakamoWhiteDefault ? Object.keys(expectedWakamoColors).length : 1)
          || Object.entries(isWakamoWhiteDefault ? expectedWakamoColors : { _Color: colors._Color }).some(([name, expected]) => {
            const actual = colors[name]
            return !actual || !['r', 'g', 'b', 'a'].every(component => Object.prototype.hasOwnProperty.call(actual, component)
              && Number(actual[component]) === expected[component])
          })
          || (isWakamoWhiteDefault && (Object.keys(floats).length !== Object.keys(expectedWakamoFloats).length
            || Object.entries(expectedWakamoFloats).some(([name, value]) => Number(floats[name]) !== value)))
          || textures.length !== expectedTextureProperties.length
          || !exactArray(textures.map((item: any) => item.name), expectedTextureProperties)
          || (isWakamoWhiteDefault ? resolvedTextures.length !== 0 : resolvedTextures.length !== 1 || resolvedTextures[0]?.property !== '_Texture')) {
          throw new Error(`${label} has an unverified ${isAlphaAdd ? 'AlphaBlend_Add' : 'Additive_0'} source material property state.`)
        }
      }
      const texture = properties.textures?.find((item: any) => item.name === '_Texture')
      if (isWakamoWhiteDefault) {
        if (!texture?.texture || String(texture.texture.pathId) !== '0' || texture.textureReference !== null
          || String(texture.texture.file ?? '').toLowerCase() !== DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE.serializedFile.toLowerCase()
          || texture.scale?.x !== 1 || texture.scale?.y !== 1 || texture.offset?.x !== 0 || texture.offset?.y !== 0) {
          throw new Error(`${label} has a tampered Wakamo eye null _Texture pointer or transform.`)
        }
      } else if (!texture?.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
        || String(texture.texture.file ?? '').toLowerCase() !== String(texture.textureReference.serializedFile ?? '').toLowerCase()
        || String(texture.texture.pathId) !== String(texture.textureReference.objectId)) throw new Error(`${label} has an unverified _Texture source identity.`)
      const resolved = properties.resolvedTextures?.find((item: any) => item.property === '_Texture')
      if (!isWakamoWhiteDefault && (!resolved?.sourceReference || profileReferenceKey(resolved.sourceReference) !== profileReferenceKey(texture.textureReference)
        || !Number.isInteger(Number(resolved.width)) || Number(resolved.width) <= 0
        || !Number.isInteger(Number(resolved.height)) || Number(resolved.height) <= 0)) throw new Error(`${label} has incomplete resolved _Texture evidence.`)
      const binding = slot.glb
      if (!binding || !Number.isInteger(binding.meshIndex) || !Array.isArray(binding.primitiveIndices) || !binding.primitiveIndices.length
        || !Array.isArray(binding.materialIndices) || binding.materialIndices.length !== binding.primitiveIndices.length) throw new Error(`${label} has no exact GLB primitive binding.`)
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = json.meshes?.[binding.meshIndex]?.primitives?.[primitiveIndex], materialIndex = binding.materialIndices[index]
        if (!primitive || !Number.isInteger(materialIndex) || primitive.material !== materialIndex) throw new Error(`${label} lost its exact GLB material binding.`)
      }
      const materialIndex = binding.materialIndices[0]
      const outputMaterial = json.materials?.[materialIndex]
      const metadata = outputMaterial?.extras?.chibi
      if (!metadata || metadata.adapterId !== 'dsfx-static'
        || profileReferenceKey(metadata.sourceMaterialReference) !== profileReferenceKey(slot.sourceMaterialReference)
        || profileReferenceKey(metadata.sourceShaderReference) !== profileReferenceKey(slot.sourceShaderReference)
        || (isAlpha && metadata.dsfxRenderStateVariant !== variant)
        || (isAlphaAdd && metadata.dsfxRenderStateVariant !== variant)
        || (isAlphaAdd && metadata.dsfxMaterialVariant !== slot.dsfxMaterialVariant)
        || (isAdditive && metadata.dsfxRenderStateVariant !== undefined && metadata.dsfxRenderStateVariant !== variant)
        || (isAdditive && stable(metadata.dsfxShaderExtraction) !== stable(slot.dsfxShaderExtraction))
        || (isAlphaAdd && stable(metadata.dsfxShaderExtraction) !== stable(slot.dsfxShaderExtraction))
        || (isAdditive && stable(metadata.dsfxMaterialProperties) !== stable(slot.materialProperties))
        || (isAlphaAdd && stable(metadata.dsfxMaterialProperties) !== stable(slot.materialProperties))
        || (isAdditive && metadata.dsfxTextures?.texture?.index !== outputMaterial?.pbrMetallicRoughness?.baseColorTexture?.index)
        || (isAlphaAdd && !isWakamoWhiteDefault && metadata.dsfxTextures?.texture?.index !== outputMaterial?.pbrMetallicRoughness?.baseColorTexture?.index)
        || (isAlphaAdd && isWakamoWhiteDefault
          && (metadata.dsfxTextures?.texture?.default !== 'unity-white' || metadata.dsfxTextures?.texture?.index !== undefined
            || outputMaterial?.pbrMetallicRoughness?.baseColorTexture !== undefined))
        || metadata.alphaMode !== slot.renderState.alphaMode || metadata.depthWrite !== slot.renderState.depthWrite
        || metadata.depthTest !== slot.renderState.depthTest || metadata.depthFunction !== slot.renderState.depthFunction
        || metadata.cullMode !== slot.renderState.cullMode || metadata.doubleSided !== slot.renderState.doubleSided
        || metadata.drawLayer !== slot.renderState.layer || !stateMatches({ ...slot.renderState, blend: metadata.blend }, slot.renderState)
        || outputMaterial.alphaMode !== slot.renderState.alphaMode || outputMaterial.doubleSided !== slot.renderState.doubleSided
        || (!isWakamoWhiteDefault && !Number.isInteger(outputMaterial.pbrMetallicRoughness?.baseColorTexture?.index))) {
        throw new Error(`${label} lost its exact output render-state metadata.`)
      }
    }
  }
  validateRenderingProfileContract()
  validateMxProjectSlots()
  validateMxEStandardSlots()
  validateDsfxStaticSlots()
  validateDsfxGlitchSlots()
  validateDsfxMatcapSlots()
  const builtinProfileRenderers = (renderingProfile?.renderers ?? []).filter((renderer: any) => {
    const sourceMesh = renderer.sourceMesh
    if (!sourceMesh) return false
    const file = typeof sourceMesh.file === 'string' ? sourceMesh.file.replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() : ''
    return sourceMesh.builtinResource !== undefined || file === 'unity default resources'
      || (!sourceMesh.sourceReference && String(sourceMesh.pathId) === '10210')
  })
  for (const renderer of builtinProfileRenderers) {
    const sourceMesh = renderer.sourceMesh
    const builtin = unityBuiltinQuadReference(sourceMesh)
    const label = `Profile renderer ${renderer.hierarchyPath ?? renderer.name ?? '(unnamed)'}`
    if (!builtin) throw new Error(`${label} has an unknown or incomplete Unity built-in mesh identity.`)
    if (sourceMesh.sourceReference) throw new Error(`${label} built-in Quad has an unexpected imported mesh source reference.`)
    if (renderer.rendererType !== 'MeshRenderer') throw new Error(`${label} built-in Quad must be an unskinned MeshRenderer.`)
    if (!Number.isInteger(renderer.glbNodeIndex)) throw new Error(`${label} built-in Quad has no exact GLB node binding.`)
    const node = json.nodes?.[renderer.glbNodeIndex]
    if (!node || !Number.isInteger(node.mesh)) throw new Error(`${label} built-in Quad has no exported mesh assignment.`)
    if (Number.isInteger(node.skin)) throw new Error(`${label} built-in Quad is skinned; built-in Quads must be unskinned.`)
    const mesh = json.meshes?.[node.mesh]
    if (!mesh) throw new Error(`${label} built-in Quad references a missing GLB mesh.`)
    const meshProvenance = mesh.extras?.chibi?.synthesizedBuiltinResource
    const nodeProvenance = node.extras?.chibi?.synthesizedBuiltinResource
    const rendererProvenance = node.extras?.chibi?.sourceRenderer?.sourceMeshBuiltinResource
    const provenanceMatches = (value: any) => value?.kind === builtin.kind && String(value.guid).toLowerCase() === builtin.guid
      && String(value.file).toLowerCase() === builtin.file && String(value.pathId) === builtin.pathId && value.name === builtin.name
    if (!provenanceMatches(meshProvenance) || !provenanceMatches(nodeProvenance) || !provenanceMatches(rendererProvenance)) {
      throw new Error(`${label} built-in Quad lost its exact source provenance.`)
    }
    if (node.extras?.chibi?.sourceRenderer?.defaultVisible !== renderer.defaultVisible) {
      throw new Error(`${label} built-in Quad lost its source default visibility.`)
    }
    const slots = renderer.materialSlots ?? []
    if (!slots.length) throw new Error(`${label} built-in Quad has no exact source material slots.`)
    const expectedPositions = [[-.5, -.5, 0], [-.5, .5, 0], [.5, .5, 0], [.5, -.5, 0]]
    const expectedNormals = [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]]
    const expectedUVs = [[0, 0], [0, 1], [1, 1], [1, 0]]
    const expectedIndices = [[0], [1], [2], [0], [2], [3]]
    for (const slot of slots) {
      const binding = slot.glb
      if (!binding || binding.meshIndex !== node.mesh || !binding.primitiveIndices?.length) throw new Error(`${label} built-in Quad slot ${slot.slot} has no exact GLB binding.`)
      for (const [offset, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = mesh.primitives?.[primitiveIndex]
        if (!primitive || primitive.mode !== undefined && primitive.mode !== 4) throw new Error(`${label} built-in Quad slot ${slot.slot} has invalid TRIANGLES topology.`)
        if (primitive.attributes?.JOINTS_0 !== undefined || primitive.attributes?.WEIGHTS_0 !== undefined) throw new Error(`${label} built-in Quad slot ${slot.slot} unexpectedly contains skinning attributes.`)
        const position = json.accessors?.[primitive.attributes?.POSITION]
        const normal = json.accessors?.[primitive.attributes?.NORMAL]
        const uv = json.accessors?.[primitive.attributes?.TEXCOORD_0]
        const index = json.accessors?.[primitive.indices]
        if (!position || !normal || !uv || !index || position.componentType !== 5126 || normal.componentType !== 5126
          || uv.componentType !== 5126 || index.componentType !== 5125 || position.type !== 'VEC3' || normal.type !== 'VEC3'
          || uv.type !== 'VEC2' || index.type !== 'SCALAR' || position.count !== 4 || normal.count !== 4 || uv.count !== 4 || index.count !== 6) {
          throw new Error(`${label} built-in Quad slot ${slot.slot} does not have canonical four-vertex geometry.`)
        }
        if (!sameMatrix(readAccessor(primitive.attributes.POSITION), expectedPositions)
          || !sameMatrix(readAccessor(primitive.attributes.NORMAL), expectedNormals)
          || !sameMatrix(readAccessor(primitive.attributes.TEXCOORD_0), expectedUVs)
          || !sameMatrix(readAccessor(primitive.indices), expectedIndices, 0)) {
          throw new Error(`${label} built-in Quad slot ${slot.slot} has incorrect coordinates, normals, UVs, or winding.`)
        }
        const expectedMaterial = binding.materialIndices?.[offset]
        if (!Number.isInteger(expectedMaterial) || primitive.material !== expectedMaterial) throw new Error(`${label} built-in Quad slot ${slot.slot} lost its exact material binding.`)
        const material = json.materials?.[primitive.material]
        if (!material || material.name !== slot.sourceMaterialName
          || profileReferenceKey(material.extras?.chibi?.sourceMaterialReference) !== profileReferenceKey(slot.sourceMaterialReference)) {
          throw new Error(`${label} built-in Quad slot ${slot.slot} lost its exact source material provenance.`)
        }
      }
    }
  }
  for (const node of json.nodes ?? []) {
    if (!Number.isInteger(node.mesh) || !Number.isInteger(node.skin)) continue
    const jointCount = json.skins?.[node.skin]?.joints?.length ?? 0
    if (!jointCount) continue
    for (const primitive of json.meshes?.[node.mesh]?.primitives ?? []) {
      const accessorIndex = primitive.attributes?.JOINTS_0
      if (!Number.isInteger(accessorIndex)) continue
      const accessor = json.accessors?.[accessorIndex]
      if (!accessor) continue
      const values = readAccessor(accessorIndex)
      if (values.some(row => row.some(value => value >= jointCount))) {
        throw new Error(`Skin index exceeds joint count on node ${node.name ?? '<unnamed>'}.`)
      }
    }
  }
  for (const animation of json.animations ?? []) {
    const deforms = animation.channels?.some((channel: any) => {
      if (!joints.has(channel.target?.node)) return false
      const sampler = animation.samplers?.[channel.sampler]
      if (!sampler) return false
      const values = readAccessor(sampler.output)
      const frames = sampler.interpolation === 'CUBICSPLINE' ? values.filter((_: unknown, index: number) => index % 3 === 1) : values
      return frames.slice(1).some((value: number[]) => value.some((component, index) => Math.abs(component - frames[0][index]) > 1e-6))
    })
    if (!deforms && !incompleteImport) throw new Error(`Animation has no skeletal deformation: ${animation.name ?? '<unnamed>'}.`)
  }
  const eyeMouthMaterials = new Set<number>((json.materials ?? []).flatMap((material: any, index: number) => /EyeMouth|EyeMoutn/i.test(material.name ?? '') ? [index] : []))
  const eyePrimitives = (json.meshes ?? []).flatMap((mesh: any) => mesh.primitives ?? []).filter((primitive: any) => eyeMouthMaterials.has(primitive.material))
  if (renderingProfile) {
    if (renderingProfile.validation?.valid !== true) throw new Error('Rendering profile validation is not marked valid.')
    validateMxOutlineSlots()
    validateMxTransparentSlots()
    const eyeMouthSlots = (renderingProfile.renderers ?? []).flatMap((renderer: any) => (renderer.materialSlots ?? [])
      .filter((slot: any) => slot.adapterId === 'mx-character-eyemouth').map((slot: any) => ({ renderer, slot })))
    if (eyePrimitives.length && !eyeMouthSlots.length) throw new Error('Named eye/mouth geometry has no exact rendering-profile material binding.')
    for (const { slot } of eyeMouthSlots) {
      const binding = slot.glb
      if (!binding || !Number.isInteger(binding.meshIndex) || !binding.primitiveIndices?.length) throw new Error('Profile eye/mouth slot has no exact GLB primitive binding.')
      const mesh = json.meshes?.[binding.meshIndex]
      if (!mesh) throw new Error('Profile eye/mouth slot references a missing GLB mesh.')
      for (const [index, primitiveIndex] of binding.primitiveIndices.entries()) {
        const primitive = mesh.primitives?.[primitiveIndex]
        if (!primitive) throw new Error('Profile eye/mouth slot references a missing GLB primitive.')
        const expectedMaterial = binding.materialIndices?.[index]
        if (!Number.isInteger(expectedMaterial) || primitive.material !== expectedMaterial) throw new Error('Profile eye/mouth primitive lost its exact material-slot binding.')
        if ((json.materials[primitive.material]?.alphaMode ?? 'OPAQUE') !== slot.renderState?.alphaMode) throw new Error('Profile eye/mouth material alpha mode differs from its source shader state.')
        if (Number.isInteger(primitive.attributes?.COLOR_0)) throw new Error('Eye geometry still uses the source shader\'s ignored vertex-color channel.')
      }
    }
    if (renderingProfile.mouth) {
      const mouth = renderingProfile.mouth
      const mouthSlot = eyeMouthSlots.find(({ renderer, slot }: any) => slot.slot === mouth.materialSlot
        && `${renderer.sourceReference?.bundleSha256}:${renderer.sourceReference?.serializedFile?.toLowerCase()}:${renderer.sourceReference?.objectId}`
          === `${mouth.sourceRendererReference?.bundleSha256}:${mouth.sourceRendererReference?.serializedFile?.toLowerCase()}:${mouth.sourceRendererReference?.objectId}`)?.slot
      const material = json.materials?.[mouth.glbMaterialIndex]
      if (!mouthSlot || !material?.extras?.mouthAtlas || !material.extras?.mouthTiles || !Number.isInteger(material.pbrMetallicRoughness?.baseColorTexture?.index)) {
        throw new Error('GLB has no mouth atlas bound to the exact source renderer/material slot.')
      }
      const outputBinding = material.extras?.chibi?.mouthProfileBinding
      const sourceKey = (reference: any) => `${reference?.bundleSha256}:${reference?.serializedFile?.toLowerCase()}:${reference?.objectId}`
      if (outputBinding?.materialSlot !== mouth.materialSlot || sourceKey(outputBinding?.sourceRendererReference) !== sourceKey(mouth.sourceRendererReference)) {
        throw new Error('Mouth atlas output does not retain its exact source renderer/material-slot binding.')
      }
      if ((material.alphaMode ?? 'OPAQUE') !== mouthSlot.renderState?.alphaMode) throw new Error('Mouth atlas alpha mode differs from its source shader state.')
    }
  } else if (eyePrimitives.length) {
    if (eyePrimitives.some((primitive: any) => !['OPAQUE', 'MASK', 'BLEND'].includes(json.materials[primitive.material]?.alphaMode ?? 'OPAQUE'))) throw new Error('Eye/mouth material has unsupported alpha mode.')
    if (!incompleteImport && eyePrimitives.some((primitive: any) => Number.isInteger(primitive.attributes?.COLOR_0))) throw new Error('Eye geometry still uses the source shader\'s ignored vertex-color channel.')
    const mouth = (json.materials ?? []).find((material: any) => material.extras?.mouthTiles && Number.isInteger(material.pbrMetallicRoughness?.baseColorTexture?.index))
    if (!mouth && !incompleteImport) throw new Error('GLB has eye geometry but no separated mouth atlas material.')
  }
  return {
    valid: true, ...(incompleteImport ? { incompleteImport } : {}), byteLength: buffer.length, meshes: json.meshes.length, skins: json.skins.length,
    animations: (json.animations ?? []).map((item: any) => item.name).filter((name: unknown): name is string => typeof name === 'string'),
    images: json.images?.length ?? 0, materials: (json.materials ?? []).map((item: any) => item.name ?? '').filter(Boolean),
    ...(renderingProfileDiagnostics ? { renderingProfile: renderingProfileDiagnostics } : {}),
  }
}

export async function publishArtifact(
  temporaryPath: string,
  dataRoot = chibiRoots().data,
  recordTiming?: (stage: 'validation' | 'artifactPublication', elapsedMs: number) => void,
) {
  const validationStartedAt = performance.now()
  let validation: GlbValidation
  try {
    try {
      validation = await validateGlb(temporaryPath)
    } catch (error) {
      throw new ChibiArtifactValidationError(error instanceof Error ? error.message : String(error), { cause: error })
    }
  } finally {
    recordTiming?.('validation', performance.now() - validationStartedAt)
  }
  const publicationStartedAt = performance.now()
  try {
    const bytes = await readFile(temporaryPath)
    const checksum = createHash('sha256').update(bytes).digest('hex')
    // A newly converted revision always receives a new immutable key. This also
    // lets a corrupt/missing prior revision be rebuilt without replacing its file.
    const fileKey = `published/${checksum}/${randomUUID()}.glb`
    const destination = artifactPath(fileKey, dataRoot)
    await mkdir(path.dirname(destination), { recursive: true })
    const stage = `${destination}.${randomUUID()}.tmp`
    await copyFile(temporaryPath, stage)
    await rename(stage, destination)
    return { checksum, fileKey, validation }
  } finally {
    recordTiming?.('artifactPublication', performance.now() - publicationStartedAt)
  }
}

/** Distinguishes a rejected GLB from failures writing an already validated artifact. */
export class ChibiArtifactValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ChibiArtifactValidationError'
  }
}

const externalTimeoutMs = Number.parseInt(process.env.CHIBI_EXTERNAL_TIMEOUT_MS ?? '', 10) > 0
  ? Number.parseInt(process.env.CHIBI_EXTERNAL_TIMEOUT_MS ?? '', 10)
  : 30 * 60 * 1000

export function run(command: string, args: string[], cwd?: string, signal?: AbortSignal, stage = 'External conversion', captureErrorOutput = false) {
  return new Promise<void>((resolve, reject) => {
    const controller = new AbortController()
    let child: ReturnType<typeof spawn> | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let timedOut = false
    let settled = false
    let capturedOutput = ''
    const stdio: ['ignore', 'pipe', 'pipe'] | ['ignore', 'inherit', 'inherit'] = captureErrorOutput
      ? ['ignore', 'pipe', 'pipe']
      : ['ignore', 'inherit', 'inherit']
    const capture = (chunk: Buffer, stream: NodeJS.WriteStream) => {
      stream.write(chunk)
      capturedOutput = `${capturedOutput}${chunk.toString()}`.slice(-16_000)
    }
    const onParentAbort = () => controller.abort(signal?.reason)
    const cleanup = () => {
      if (timer) clearTimeout(timer)
      signal?.removeEventListener('abort', onParentAbort)
    }
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      error ? reject(error) : resolve()
    }
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason)
      else signal.addEventListener('abort', onParentAbort, { once: true })
    }
    try {
      child = spawn(command, args, { cwd, stdio, windowsHide: true, signal: controller.signal })
      if (captureErrorOutput) {
        child.stdout?.on('data', chunk => capture(chunk as Buffer, process.stdout))
        child.stderr?.on('data', chunk => capture(chunk as Buffer, process.stderr))
      }
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)))
      return
    }
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
      // AssetStudio/FBX2glTF are native programs. On Windows, terminate the
      // process tree as well so a timed-out child cannot retain the work dir.
      if (process.platform === 'win32' && child?.pid) {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
        killer.unref()
      }
    }, externalTimeoutMs)
    child.once('error', error => finish(timedOut
      ? new Error(`${stage} timed out after ${externalTimeoutMs}ms.`)
      : error instanceof Error ? error : new Error(String(error))))
    child.once('close', code => {
      if (timedOut) finish(new Error(`${stage} timed out after ${externalTimeoutMs}ms.`))
      else if (code === 0) finish()
      else {
        const detail = captureErrorOutput ? capturedOutput.trim() : ''
        finish(new Error(`${path.basename(command)} exited with ${code}${detail ? `: ${detail}` : ''}`))
      }
    })
  })
}

function comparableAssetName(value: string) {
  return value.toLowerCase()
    .replace(/\.(?:prefab|fbx)$/i, '')
    .replace(/_controller$/i, '')
    .replace(/\d+/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizedAssetPath(value: string) {
  return value.replaceAll('\\', '/').replace(/^\/+/, '')
}

function parseGlbJson(buffer: Buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2) {
    throw new Error('Conversion output is not a GLB 2.0 file.')
  }
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).replace(/[\u0000 ]+$/, '')) as any
}

function inventoryReferenceKey(reference: InventorySourceReference | null | undefined) {
  return reference ? `${reference.bundleSha256.toLowerCase()}:${reference.serializedFile.toLowerCase()}:${reference.objectId}` : ''
}

export function annotateProjectMxSourceMeshEvidence(profile: ChibiRenderingProfile) {
  for (const renderer of profile.renderers) {
    if (!renderer.materialSlots.some(slot => slot.adapterId === 'projectmx-weapon-test1-damage')) continue
    const sourceMesh = renderer.sourceMesh as any
    const colorlessSourceRecord = projectMxColorlessSourceMeshRecordForReference(sourceMesh?.sourceReference)
    if (!sourceMesh || !colorlessSourceRecord) continue
    // Preserve any supplied evidence for postprocess to validate.  Only add
    // the source-verified record when the profile has no claim yet; silently
    // repairing a tampered record would weaken the fail-closed contract.
    if (sourceMesh.projectMxSourceMeshEvidence !== undefined) continue
    sourceMesh.projectMxSourceMeshEvidence = {
      sourceReference: { ...colorlessSourceRecord.evidence.sourceReference },
      vertexCount: colorlessSourceRecord.evidence.vertexCount,
      subMeshVertexCounts: [...colorlessSourceRecord.evidence.subMeshVertexCounts],
      ...(Number.isInteger((colorlessSourceRecord.evidence as any).indexCount)
        ? { indexCount: (colorlessSourceRecord.evidence as any).indexCount } : {}),
      colorChannelDimension: colorlessSourceRecord.evidence.colorChannelDimension,
      colorsPresent: colorlessSourceRecord.evidence.colorsPresent,
    }
  }
  return profile
}

export interface SourceTextureExportBinding {
  sourceMaterialName: string
  sourceMaterialReference: InventorySourceReference
  textureProperty: string
  textureReference: InventorySourceReference
}

/**
 * Find source textures that the FBX/GLTF path cannot be trusted to preserve.
 *
 * Character MainTex bindings retain the historical "only when dropped"
 * behavior. Verified static DSFX materials are different: FBX2glTF may
 * expose an unrelated base-color texture (or no texture at all), while the
 * source shader's exact `_Texture` object is authoritative. Always export
 * that identity and let postprocess replace the raw binding.
 */
export function missingSourceTextureExports(
  profile: Pick<ChibiRenderingProfile, 'renderers'>,
  glbMaterials: { name?: string; pbrMetallicRoughness?: { baseColorTexture?: unknown } }[],
) {
  const missingNames = new Set(glbMaterials
    .filter(material => !material.pbrMetallicRoughness?.baseColorTexture)
    .map(material => material.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0))
  const exports = new Map<string, SourceTextureExportBinding>()
  for (const renderer of profile.renderers) for (const slot of renderer.materialSlots) {
    if (!slot.sourceMaterialName) continue
    const projectMxExtraction = (slot as any).projectMxShaderExtraction
    const projectMxActivePass = projectMxExtraction?.activeVariant
      ? projectMxExtraction.passes?.[projectMxExtraction.activeVariant] : null
    const textureProperties = slot.adapterId === 'dsfx-static' ? ['_Texture']
      : slot.adapterId === 'dsfx-glitch-tex' ? ['_NoiseTex']
      : slot.adapterId === 'dsfx-matcap' ? ['_Main_Tex', '_Matcap_Tex']
      : slot.adapterId === 'mx-c-transparent-st' ? ['_MainTex', '_MaskTex']
        : slot.adapterId === 'projectmx-weapon-test1-damage'
          ? ['_mainTex', '_sourceTex', ...(projectMxActivePass?.usesNoiseTexture === true ? ['_NoiseTex'] : [])]
          : ['_MainTex']
    // MX/Unlit Outline samples the exact source texture in both passes.  Do
    // not trust a same-named FBX2glTF binding: an importer can preserve a
    // stale or unrelated image while still emitting a valid base-color slot.
    for (const textureProperty of textureProperties) {
      const requiresExactSourceTexture = slot.adapterId === 'mx-character-eyemouth' || slot.adapterId === 'dsfx-static' || slot.adapterId === 'mx-unlit-outline'
        || slot.adapterId === 'dsfx-glitch-tex' || slot.adapterId === 'dsfx-matcap' || slot.adapterId === 'mx-c-transparent-st' || slot.adapterId === 'projectmx-weapon-test1-damage'
        || slot.adapterId === 'mx-e-standard'
      if (textureProperty === '_MainTex' && !requiresExactSourceTexture && !missingNames.has(slot.sourceMaterialName)) continue
      const sourceTexture = slot.materialProperties.textures.find(texture => texture.name === textureProperty)
      if (!sourceTexture?.texture || String(sourceTexture.texture.pathId) === '0') {
        if (slot.adapterId === 'mx-c-transparent-st' || slot.adapterId === 'projectmx-weapon-test1-damage' || slot.adapterId === 'dsfx-glitch-tex' || slot.adapterId === 'dsfx-matcap') {
          throw new Error(`Source ${textureProperty} for ${slot.sourceMaterialName} has no exact texture identity.`)
        }
        continue
      }
      if (!slot.sourceMaterialReference || !sourceTexture.textureReference) {
        throw new Error(`Dropped source ${textureProperty} for ${slot.sourceMaterialName} has no exact material/texture identity.`)
      }
      const key = `${inventoryReferenceKey(slot.sourceMaterialReference)}:${textureProperty}:${inventoryReferenceKey(sourceTexture.textureReference)}`
      exports.set(key, {
        sourceMaterialName: slot.sourceMaterialName,
        sourceMaterialReference: slot.sourceMaterialReference,
        textureProperty,
        textureReference: sourceTexture.textureReference,
      })
    }
  }
  return [...exports.values()]
}

/** Backwards-compatible MainTex-only view used by older callers/tests. */
export function missingSourceMainTextureExports(
  profile: Pick<ChibiRenderingProfile, 'renderers'>,
  glbMaterials: { name?: string; pbrMetallicRoughness?: { baseColorTexture?: unknown } }[],
) {
  return missingSourceTextureExports(profile, glbMaterials)
    .filter(binding => binding.textureProperty === '_MainTex')
    .map(({ textureProperty: _textureProperty, ...binding }) => binding)
}

function animatorCategory(initialPose: string | null) {
  const pose = initialPose?.toLowerCase() ?? ''
  if (pose.includes('_cafe_')) return 'cafe'
  if (pose.includes('_formation_') || pose.includes('_battle_')) return 'echelon'
  if (pose.includes('_strategy_')) return 'strategy'
  return null
}

export interface AnimatorSelection {
  filterName: string | null
  expectedNames: string[]
  prefabPath: string | null
}

/**
 * Select the animator belonging to the indexed character prefab.  A source
 * candidate includes a dependency closure, so object names alone can contain
 * other characters; the AddressableAsset/Character prefab path is the
 * authoritative identity and the profile pose selects its Cafe/Echelon
 * variant when available.
 */
export function selectAnimator(candidate: Pick<SourceCandidate, 'sourceIdentity' | 'objectNames' | 'prefabPaths'>, profile: Pick<ChibiProfile, 'initialPose'>): AnimatorSelection {
  const identity = comparableAssetName(candidate.sourceIdentity)
  const paths = (candidate.prefabPaths ?? []).map(normalizedAssetPath).filter(item => item.toLowerCase().endsWith('.prefab'))
  const authoritative = paths.filter(item => {
    const parts = item.split('/')
    const characterIndex = parts.findIndex(part => part.toLowerCase() === 'character')
    return characterIndex >= 0 && comparableAssetName(parts[characterIndex + 1] ?? '') === identity
  })
  const category = animatorCategory(profile.initialPose)
  const selected = authoritative.find(item => {
    const parts = item.split('/')
    const characterIndex = parts.findIndex(part => part.toLowerCase() === 'character')
    const variantPath = parts.slice(characterIndex + 2).join('/').toLowerCase()
    return category !== null && (parts[characterIndex + 2]?.toLowerCase() === category || variantPath.includes(`_${category}`))
  }) ?? authoritative.find(item => {
    const parts = item.split('/')
    const characterIndex = parts.findIndex(part => part.toLowerCase() === 'character')
    return characterIndex >= 0 && parts.length === characterIndex + 3
  }) ?? authoritative[0] ?? null
  const prefabName = selected?.split('/').at(-1)?.replace(/\.prefab$/i, '') ?? null
  const matchingObjects = prefabName
    ? candidate.objectNames.map(name => name.replace(/_controller$/i, '')).filter(name => comparableAssetName(name) === comparableAssetName(prefabName))
    : []
  const fallbackNames = [...new Set(candidate.objectNames.map(name => name.replace(/_controller$/i, '')))]
  const expectedNames = [...new Set([...(prefabName ? [prefabName] : []), ...matchingObjects])]
  // AssetStudio names the exported animator after the authoritative prefab,
  // while some controller metadata carries a numbered child name (for
  // example Cafe_Shun01_Original).  Use the prefab basename for filtering and
  // keep both spellings in expectedNames for strict post-export selection.
  const filterName = prefabName ?? (fallbackNames.length === 1 ? fallbackNames[0] : null)
  return { filterName, expectedNames: expectedNames.length ? expectedNames : fallbackNames, prefabPath: selected }
}

export function selectMouthTextureName(materials: SourceCandidate['materialMetadata'] = []) {
  const textures = materials.filter(material => /(?:MXCharacterEyesMouth|MX\/C-EyesMouth)/i.test(`${material.shaderParsedName ?? ''} ${material.shaderName ?? ''}`))
    .flatMap(material => material.resolvedTextures)
  // Eye textures commonly inherit a character-specific `*EyeMouth` name, so
  // matching the resolved texture name first selects the 64x64 eye sheet
  // instead of the atlas. Unity's material property is the authoritative role.
  return textures.find(texture => /mouth.*tile|tile.*mouth/i.test(texture.property))?.name
    ?? textures.find(texture => /mouth/i.test(texture.property))?.name
    ?? textures.find(texture => /mouth/i.test(texture.name) && !/eyemouth/i.test(texture.name))?.name
    ?? 'Character_Mouth'
}

export function selectAssembly(candidate: Pick<SourceCandidate, 'assembly'>, prefabPath: string | null): InventoryAssembly | null {
  const assemblies = candidate.assembly ?? []
  if (!assemblies.length || !prefabPath) return null
  const normalizedPath = normalizedAssetPath(prefabPath).toLowerCase()
  const byPath = assemblies.filter(item => item.prefabPath
    && normalizedAssetPath(item.prefabPath).toLowerCase() === normalizedPath)
  if (byPath.length === 1) return byPath[0]
  if (byPath.length > 1) return null
  const prefabName = normalizedPath.split('/').at(-1)?.replace(/\.prefab$/i, '')
  const byRoot = assemblies.filter(item => item.root.toLowerCase() === prefabName)
  return byRoot.length === 1 ? byRoot[0] : null
}

export function mouthTileFromDefaultUV(uv: { x: number; y: number } | null | undefined) {
  if (!uv || !Number.isFinite(uv.x) || !Number.isFinite(uv.y)) return null
  const column = Math.max(0, Math.min(7, Math.round(uv.x * 8)))
  const row = Math.max(0, Math.min(7, Math.round(uv.y * 8)))
  return row * 100 + column
}

async function readInstallRecord(toolsRoot: string) {
  try { return JSON.parse(await readFile(path.join(toolsRoot, 'install.json'), 'utf8')) as any }
  catch { return null }
}

async function sha256File(filePath: string) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex')
}

async function hashDirectoryTree(root: string) {
  const digest = createHash('sha256')
  const pending = [root]
  const files: string[] = []
  while (pending.length) {
    const directory = pending.pop()!
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '__pycache__' || entry.name.endsWith('.pyc') || entry.name.endsWith('.pyo')) continue
      const fullPath = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`Core cache cannot verify symlinked toolchain content: ${fullPath}`)
      if (entry.isDirectory()) pending.push(fullPath)
      else if (entry.isFile()) files.push(fullPath)
      else throw new Error(`Core cache found unsupported toolchain content: ${fullPath}`)
    }
  }
  files.sort((left, right) => left.localeCompare(right))
  for (const filePath of files) {
    const relativePath = path.relative(root, filePath).replaceAll(path.sep, '/')
    digest.update(relativePath).update('\0').update(await readFile(filePath)).update('\0')
  }
  return digest.digest('hex')
}

/** Exact runtime tool and source-script identity; missing or unpinned inputs disable cache reuse. */
export async function getChibiCoreConverterIdentity() {
  const roots = chibiRoots()
  const installPath = path.join(roots.tools, 'install.json')
  const install = await readInstallRecord(roots.tools)
  if (!install || install.schemaVersion !== 1) throw new Error('Core cache requires a supported Chibi tool install record.')
  const manifestPath = path.resolve('scripts/chibi-tools/manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as any
  const required = (value: unknown, label: string) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Core cache ${label} is missing.`)
    return value
  }
  const resolveTool = async (value: unknown, label: string) => {
    const input = required(value, label)
    if (path.isAbsolute(input) || input.includes(path.sep) || input.includes('/')) {
      const resolved = path.resolve(input)
      if (!(await stat(resolved)).isFile()) throw new Error(`Core cache ${label} is not a file.`)
      return resolved
    }
    const suffixes = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : ['']
    for (const directory of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) for (const suffix of suffixes) {
      const resolved = path.join(directory, `${input}${suffix}`)
      try { if ((await stat(resolved)).isFile()) return resolved } catch { /* keep resolving the command */ }
    }
    throw new Error(`Core cache ${label} cannot be resolved to a file.`)
  }
  const assetStudioPath = await resolveTool(process.env.CHIBI_ASSETSTUDIO ?? install.assetStudioModCli?.launcher ?? install.assetStudioModCli?.assembly, 'AssetStudio executable')
  const assetStudioAssemblyPath = await resolveTool(install.assetStudioModCli?.assembly, 'AssetStudio assembly')
  const fbx2gltfPath = await resolveTool(process.env.CHIBI_FBX2GLTF ?? install.fbx2gltf?.executable, 'FBX2glTF executable')
  const pythonPath = await resolveTool(process.env.CHIBI_PYTHON ?? install.unityPy?.python, 'UnityPy Python executable')
  const assetStudioAssemblySha256 = await sha256File(assetStudioAssemblyPath)
  if (assetStudioAssemblySha256 !== manifest.animationPatch?.patchedAssemblySha256
    || install.assetStudioModCli?.patchedSha256 !== assetStudioAssemblySha256
    || install.assetStudioModCli?.version !== manifest.assetStudioModCli?.version
    || install.fbx2gltf?.version !== manifest.fbx2gltf?.version
    || install.unityPy?.version !== manifest.unityPy?.version) {
    throw new Error('Core cache toolchain version or patched AssetStudio hash does not match its pinned install manifest.')
  }
  const pythonRoot = path.dirname(path.dirname(pythonPath))
  const pythonStat = await stat(pythonPath)
  if (!pythonStat.isFile() || !(await stat(pythonRoot)).isDirectory()) throw new Error('Core cache cannot verify the installed Python runtime and packages.')
  const assetStudioDirectory = path.resolve(required(install.assetStudioModCli?.directory, 'AssetStudio installation directory'))
  if (!(await stat(assetStudioDirectory)).isDirectory()) throw new Error('Core cache AssetStudio installation directory is missing.')
  const dotnetPath = await resolveTool(process.env.CHIBI_DOTNET ?? install.dotnet?.command, 'AssetStudio .NET host')
  const dotnetRoot = path.dirname(dotnetPath)
  const runtimeRoot = path.join(dotnetRoot, 'shared', 'Microsoft.NETCore.App')
  const hostFxrRoot = path.join(dotnetRoot, 'host', 'fxr')
  // Hash resolved external executable inputs and their runtime trees, not absolute install paths.
  // In-process conversion semantics are versioned by CHIBI_CORE_CONVERTER_VERSION so
  // diagnostics-only code edits do not invalidate the converted-core cache.
  // Compute trees serially to avoid a large read burst on the worker's source/tool volume.
  const assetStudioHash = await sha256File(assetStudioPath)
  const assetStudioTreeHash = await hashDirectoryTree(assetStudioDirectory)
  const fbx2gltfHash = await sha256File(fbx2gltfPath)
  const fbx2gltfTreeHash = await hashDirectoryTree(path.dirname(fbx2gltfPath))
  const pythonTreeHash = await hashDirectoryTree(pythonRoot)
  const dotnetIdentity = {
    executableSha256: await sha256File(dotnetPath),
    hostFxrTreeSha256: await hashDirectoryTree(hostFxrRoot),
    runtimeTreeSha256: await hashDirectoryTree(runtimeRoot),
  }
  const identity = {
    schemaVersion: 1,
    converterVersion: CHIBI_CORE_CONVERTER_VERSION,
    platform: install.platform,
    versions: {
      assetStudio: install.assetStudioModCli.version,
      fbx2gltf: install.fbx2gltf.version,
      unityPy: install.unityPy.version,
    },
    assetStudio: { version: install.assetStudioModCli.version, executableSha256: assetStudioHash, assemblySha256: assetStudioAssemblySha256, installationTreeSha256: assetStudioTreeHash },
    fbx2gltf: { version: install.fbx2gltf.version, executableSha256: fbx2gltfHash, installationTreeSha256: fbx2gltfTreeHash },
    python: { version: install.unityPy.version, runtimeTreeSha256: pythonTreeHash },
    dotnet: dotnetIdentity,
  }
  return `toolchain-v1:${createHash('sha256').update(stable(identity)).digest('hex')}`
}

async function findTool(root: string, names: string[]) {
  const { readdir } = await import('node:fs/promises')
  const pending = [root]
  while (pending.length) {
    const directory = pending.shift()!
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      const item = path.join(directory, entry.name)
      if (entry.isDirectory()) pending.push(item)
      else if (names.some(name => entry.name.toLowerCase() === name.toLowerCase())) return item
    }
  }
  throw new Error(`Missing conversion tool: ${names.join(' or ')}`)
}

export function fbx2gltfToolNames(hostPlatform = process.platform) {
  if (hostPlatform === 'win32') return ['FBX2glTF.exe', 'FBX2glTF-windows-x86_64.exe']
  if (hostPlatform === 'darwin') return ['FBX2glTF-macos-x86_64', 'FBX2glTF']
  return ['FBX2glTF', 'FBX2glTF-linux-x86_64']
}

export type ChibiConversionStage = 'prepare' | 'extraction' | 'assetStudio' | 'fbx2gltf' | 'sourceTextureExport'
  | 'postprocess' | 'validation' | 'artifactPublication' | 'cleanup' | 'other'

export interface ChibiConversionTiming {
  schemaVersion: 1
  totalMs: number
  stagesMs: Record<ChibiConversionStage, number>
}

const conversionTimingStages: ChibiConversionStage[] = [
  'prepare', 'extraction', 'assetStudio', 'fbx2gltf', 'sourceTextureExport',
  'postprocess', 'validation', 'artifactPublication', 'cleanup', 'other',
]

function measuredMilliseconds(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 10) / 10) : 0
}

export function getChibiConversionTiming(value: unknown): ChibiConversionTiming | undefined {
  if (!value || typeof value !== 'object') return undefined
  const timing = (value as { chibiConversionTiming?: unknown }).chibiConversionTiming
  if (!timing || typeof timing !== 'object') return undefined
  const record = timing as { schemaVersion?: unknown; totalMs?: unknown; stagesMs?: unknown }
  if (record.schemaVersion !== 1 || !Number.isFinite(record.totalMs) || !record.stagesMs || typeof record.stagesMs !== 'object') return undefined
  const inputStages = record.stagesMs as Record<string, unknown>
  const stagesMs = Object.fromEntries(conversionTimingStages.map(stage => [stage,
    Number.isFinite(inputStages[stage]) ? measuredMilliseconds(inputStages[stage] as number) : 0,
  ])) as Record<ChibiConversionStage, number>
  return { schemaVersion: 1, totalMs: measuredMilliseconds(record.totalMs as number), stagesMs }
}

function buildChibiConversionTiming(totalMs: number, stages: Partial<Record<ChibiConversionStage, number>>): ChibiConversionTiming {
  const fixedStages = Object.fromEntries(conversionTimingStages.filter(stage => stage !== 'other').map(stage => [stage,
    measuredMilliseconds(stages[stage] ?? 0),
  ])) as Omit<Record<ChibiConversionStage, number>, 'other'>
  const measuredTotal = measuredMilliseconds(totalMs)
  const measuredStagesTotal = Object.values(fixedStages).reduce((sum, duration) => sum + duration, 0)
  return {
    schemaVersion: 1,
    totalMs: measuredTotal,
    stagesMs: { ...fixedStages, other: measuredMilliseconds(Math.max(0, measuredTotal - measuredStagesTotal)) },
  }
}

export interface ConvertOptions {
  candidate: SourceCandidate
  profile: ChibiProfile
  dependencyParts?: SourcePart[]
  dataRoot?: string
  sourceRoot?: string
  toolsRoot?: string
  python?: string
  assetStudio?: string
  fbx2gltf?: string
  diagnosticIntermediateFbxDirectory?: string
  diagnosticWorkspaceRoot?: string
  signal?: AbortSignal
}

export async function retainIntermediateFbxForDiagnostics(
  sourceFile: string,
  candidate: Pick<SourceCandidate, 'sourceIdentity'>,
  directory: string | undefined,
  roots: { sourceRoot: string; dataRoot: string; toolsRoot: string; workspaceRoot?: string; currentWorkingDirectory: string },
) {
  if (directory && !roots.workspaceRoot) {
    throw new Error('Intermediate FBX retention requires an explicit diagnostic workspace root.')
  }
  return retainIntermediateFbx({
    sourceFile,
    directory,
    sourceIdentity: candidate.sourceIdentity,
    forbiddenRoots: [roots.sourceRoot, roots.dataRoot, roots.toolsRoot, ...(roots.workspaceRoot ? [roots.workspaceRoot] : []), roots.currentWorkingDirectory],
  })
}

type ConvertCandidateResult = Awaited<ReturnType<typeof publishArtifact>> & {
  arrangementDefault: ReturnType<typeof buildChibiArrangementDefault>
  clips: string[]
  materials: {
    source: NonNullable<SourceCandidate['sourceMaterials']>
    output: string[]
    events: SourceCandidate['events']
  }
  conversionTiming: ChibiConversionTiming
}

export async function convertCandidate(options: ConvertOptions) {
  const totalStartedAt = performance.now()
  const stageDurationsMs: Partial<Record<ChibiConversionStage, number>> = {}
  const recordStage = (stage: ChibiConversionStage, elapsedMs: number) => {
    stageDurationsMs[stage] = (stageDurationsMs[stage] ?? 0) + elapsedMs
  }
  const measureStage = async <T>(stage: ChibiConversionStage, action: () => Promise<T>) => {
    const stageStartedAt = performance.now()
    try { return await action() }
    finally { recordStage(stage, performance.now() - stageStartedAt) }
  }
  let work: string | undefined
  let result: Omit<ConvertCandidateResult, 'conversionTiming'> | undefined
  let failed = false
  let failure: unknown
  try {
    const prepared = await measureStage('prepare', async () => {
      const roots = chibiRoots()
      const dataRoot = options.dataRoot ?? roots.data
      const animatorSelection = selectAnimator(options.candidate, options.profile)
      if (!animatorSelection.prefabPath) throw new Error(`No authoritative character prefab is available for ${options.candidate.sourceIdentity}.`)
      const renderingProfile = annotateProjectMxSourceMeshEvidence(
        buildChibiRenderingProfile(options.candidate, animatorSelection.prefabPath, options.profile),
      )
      const parts = [...options.candidate.parts, ...(options.dependencyParts ?? [])]
      work = path.join(dataRoot, 'work', randomUUID())
      const source = path.join(work, 'source')
      const exported = path.join(work, 'exported')
      await Promise.all([
        mkdir(source, { recursive: true }),
        mkdir(exported, { recursive: true }),
      ])
      const toolsRoot = options.toolsRoot ?? roots.tools
      const install = await readInstallRecord(toolsRoot)
      const python = options.python ?? process.env.CHIBI_PYTHON ?? install?.unityPy?.python ?? (process.platform === 'win32' ? 'python' : 'python3.12')
      const manifestPath = path.join(work, 'parts.json')
      await writeFile(manifestPath, JSON.stringify(parts))
      return { dataRoot, sourceRoot: options.sourceRoot ?? roots.source, animatorSelection, renderingProfile, parts, source, exported, toolsRoot, install, python }
    })
    const { dataRoot, sourceRoot, animatorSelection, renderingProfile, parts, source, exported, toolsRoot, install, python } = prepared

    await measureStage('extraction', () => run(python, [path.resolve('scripts/chibi/extract.py'), sourceRoot,
      path.join(work!, 'parts.json'), source], undefined, options.signal, 'UnityPy extraction'))

    const fbx = await measureStage('assetStudio', async () => {
      const recordedAssetStudio = (install?.assetStudioModCli?.launcher ?? install?.assetStudioModCli?.assembly) as string | undefined
      const assetStudio = options.assetStudio ?? process.env.CHIBI_ASSETSTUDIO ?? recordedAssetStudio ?? await findTool(toolsRoot, process.platform === 'win32' ? ['AssetStudioModCLI.exe', 'AssetStudioModCLI.dll'] : ['AssetStudioModCLI', 'AssetStudioModCLI.dll'])
      const assetStudioCommand = assetStudio.toLowerCase().endsWith('.dll') ? (process.env.CHIBI_DOTNET ?? install?.dotnet?.command ?? 'dotnet') : assetStudio
      const assetStudioPrefix = assetStudio.toLowerCase().endsWith('.dll') ? [assetStudio] : []
      const animatorArgs = [source, '-m', 'animator', '-o', exported, '-r', '--unity-version', '2021.3.56f2', '--fbx-animation', 'all', '--image-format', 'png', '--log-level', 'error', '--log-output', 'console']
      if (animatorSelection.filterName) animatorArgs.push(
        '--filter-by-name', `^${animatorSelection.filterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, '--filter-with-regex',
      )
      await run(assetStudioCommand, [...assetStudioPrefix, ...animatorArgs], undefined, options.signal, 'AssetStudio animator export')
      const { readdir } = await import('node:fs/promises')
      const locateAll = async (directory: string, suffix: string): Promise<string[]> => {
        const found: string[] = []
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const item = path.join(directory, entry.name)
          if (entry.isDirectory()) found.push(...await locateAll(item, suffix))
          else if (entry.name.toLowerCase().endsWith(suffix)) found.push(item)
        }
        return found
      }
      const exportedFbx = await locateAll(exported, '.fbx')
      const expectedNames = new Set(animatorSelection.expectedNames.map(name => name.toLowerCase()))
      const exactFbx = exportedFbx.filter(file => expectedNames.has(path.basename(file, '.fbx').toLowerCase()))
      const fbx = exactFbx.length === 1 ? exactFbx[0] : !animatorSelection.filterName && exportedFbx.length === 1 ? exportedFbx[0] : null
      if (!fbx) throw new Error(exportedFbx.length
        ? `AssetStudio exported ${exportedFbx.length} FBX candidates for ${options.candidate.sourceIdentity}; expected ${animatorSelection.expectedNames.join(', ') || 'an indexed animator'} from ${animatorSelection.prefabPath ?? 'the candidate metadata'}.`
        : animatorSelection.prefabPath || animatorSelection.expectedNames.length
          ? `AssetStudio exported no FBX for ${options.candidate.sourceIdentity}; expected ${animatorSelection.expectedNames.join(', ') || 'the indexed animator'} from ${animatorSelection.prefabPath ?? 'the candidate metadata'}.`
          : `No authoritative character prefab or animator was indexed for ${options.candidate.sourceIdentity}; AssetStudio exported no FBX.`)
      await retainIntermediateFbxForDiagnostics(fbx, options.candidate, options.diagnosticIntermediateFbxDirectory, {
        sourceRoot,
        dataRoot,
        toolsRoot,
        workspaceRoot: options.diagnosticWorkspaceRoot,
        currentWorkingDirectory: path.resolve(process.cwd()),
      })
      return fbx
    })

    const rawBase = path.join(work!, 'raw')
    await measureStage('fbx2gltf', async () => {
      const fbx2gltf = options.fbx2gltf ?? process.env.CHIBI_FBX2GLTF ?? install?.fbx2gltf?.executable ?? await findTool(toolsRoot, fbx2gltfToolNames())
      await run(fbx2gltf, ['-i', fbx, '-o', rawBase, '-b', '--khr-materials-unlit', '--compute-normals', 'missing', '--skinning-weights', '4'], undefined, options.signal, 'FBX2glTF conversion')
    })
    const rawGlb = `${rawBase}.glb`
    let sourceFaceSkinPath: string | undefined
    const faceSkins = renderingProfile.renderers.filter(renderer => renderer.rendererType === 'SkinnedMeshRenderer'
      && renderer.sourceReference && renderer.sourceMesh?.sourceReference)
      .map(renderer => ({ hierarchyPath: renderer.hierarchyPath, sourceReference: renderer.sourceReference!,
        meshReference: renderer.sourceMesh!.sourceReference! }))
    if (faceSkins.length) {
      const bundles = Object.fromEntries(parts.map(part => [part.sha256, path.join(source, path.basename(part.entryPath))]))
      const available = faceSkins.filter(renderer => bundles[renderer.sourceReference.bundleSha256] && bundles[renderer.meshReference.bundleSha256])
      if (available.length) {
        const manifest = path.join(work!, 'face-skin-manifest.json')
        const target = path.join(work!, 'face-skin.json')
        await writeFile(manifest, JSON.stringify({ bundles, renderers: available }))
        try {
          await run(python, [path.resolve('scripts/chibi/export-face-skin.py'), manifest, target], undefined, options.signal, 'Exact source skin export')
          sourceFaceSkinPath = target
        } catch (error) {
          if (options.signal?.aborted) throw error
          renderingProfile.validation.valid = false
          renderingProfile.validation.unresolved.push(`Source skin export failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }
    const output = path.join(work!, 'processed.glb')
    const config = path.join(work!, 'postprocess.json')
    const sourceTextureExports: (SourceTextureExportBinding & { path: string })[] = []
    const sourceTexturePaths = new Map<string, string>()
    const mouthTexturePath = await measureStage('sourceTextureExport', async () => {
      const rawMaterials = parseGlbJson(await readFile(rawGlb)).materials ?? []
      const sourceTextures = new Map<string, SourceTextureExportBinding>()
      for (const renderer of renderingProfile.renderers) for (const slot of renderer.materialSlots) {
        try {
          for (const binding of missingSourceTextureExports({ renderers: [{ ...renderer, materialSlots: [slot] }] }, rawMaterials)) {
            sourceTextures.set(`${inventoryReferenceKey(binding.sourceMaterialReference)}:${binding.textureProperty}`, binding)
          }
        } catch (error) {
          renderingProfile.validation.valid = false
          renderingProfile.validation.unresolved.push(error instanceof Error ? error.message : String(error))
        }
      }
      if (sourceTextures.size) await mkdir(path.join(work!, 'source-main-textures'), { recursive: true })
      for (const binding of sourceTextures.values()) {
        const referenceKey = inventoryReferenceKey(binding.textureReference)
        let texturePath = sourceTexturePaths.get(referenceKey)
        if (!texturePath) {
          const texturePart = parts.find(part => part.sha256.toLowerCase() === binding.textureReference.bundleSha256.toLowerCase())
          if (!texturePart) {
            renderingProfile.validation.valid = false
            renderingProfile.validation.unresolved.push(`Source ${binding.textureProperty} bundle ${binding.textureReference.bundleSha256} is unavailable; exported texture retained.`)
            continue
          }
          texturePath = path.join(work!, 'source-main-textures', `${createHash('sha256').update(referenceKey).digest('hex')}.png`)
          const sourceBundle = path.join(source, path.basename(texturePart.entryPath))
          try {
            await run(python, [path.resolve('scripts/chibi/export-texture.py'), sourceBundle, binding.textureReference.bundleSha256,
              binding.textureReference.serializedFile, binding.textureReference.objectId, texturePath], undefined, options.signal, `Exact source ${binding.textureProperty} export`)
          } catch (error) {
            if (options.signal?.aborted) throw error
            renderingProfile.validation.valid = false
            renderingProfile.validation.unresolved.push(`Source texture export failed for ${binding.sourceMaterialName}: ${error instanceof Error ? error.message : String(error)}`)
            continue
          }
          sourceTexturePaths.set(referenceKey, texturePath)
        }
        sourceTextureExports.push({ ...binding, path: texturePath })
      }
      let mouthTexturePath: string | undefined
      if (renderingProfile.mouth?.textureReference) {
        const reference = renderingProfile.mouth.textureReference!
        const texturePart = parts.find(part => part.sha256 === reference.bundleSha256)
        if (!texturePart) {
          renderingProfile.validation.valid = false
          renderingProfile.validation.unresolved.push(`Mouth atlas bundle ${reference.bundleSha256} is unavailable; mouth animation is omitted.`)
          return undefined
        }
        const sourceBundle = path.join(source, path.basename(texturePart.entryPath))
        mouthTexturePath = path.join(work!, 'mouth-atlas.png')
        try {
          await run(python, [path.resolve('scripts/chibi/export-texture.py'), sourceBundle, reference.bundleSha256,
            reference.serializedFile, reference.objectId, mouthTexturePath], undefined, options.signal, 'Exact source mouth atlas export')
        } catch (error) {
          if (options.signal?.aborted) throw error
          renderingProfile.validation.valid = false
          renderingProfile.validation.unresolved.push(`Mouth atlas export failed: ${error instanceof Error ? error.message : String(error)}`)
          return undefined
        }
      }
      return mouthTexturePath
    })

    const selectedClips = [options.profile.initialPose, ...Object.values(options.profile.interactions)
      .filter(interaction => interaction.state === 'available' && interaction.clip)
      .map(interaction => interaction.clip)]
      .filter((clip): clip is string => typeof clip === 'string')
    const uniqueSelectedClips = [...new Set(selectedClips)]
    const activeManifest = path.join(work!, 'renderer-active-manifest.json')
    const activeOutput = path.join(work!, 'renderer-active.json')
    await writeFile(activeManifest, JSON.stringify({
      bundles: parts.filter(part => part.family === 'animationclips').map(part => path.join(source, path.basename(part.entryPath))),
      paths: renderingProfile.renderers.map(renderer => renderer.hierarchyPath), clips: uniqueSelectedClips,
    }))
    await run(python, [path.resolve('scripts/chibi/export-renderer-active.py'), activeManifest, activeOutput], undefined, options.signal, 'Source renderer activation export')
    const rendererActive = JSON.parse(await readFile(activeOutput, 'utf8'))
    const haloManifest = path.join(work!, 'halo-follow-manifest.json')
    const haloOutput = path.join(work!, 'halo-follow.json')
    await writeFile(haloManifest, JSON.stringify({
      bundles: Object.fromEntries(parts.map(part => [part.sha256, path.join(source, path.basename(part.entryPath))])),
      renderers: renderingProfile.renderers.filter(renderer => renderer.sourceReference),
    }))
    await run(python, [path.resolve('scripts/chibi/export-halo-follow.py'), haloManifest, haloOutput], undefined, options.signal, 'Source halo follow export')
    const haloFollow = JSON.parse(await readFile(haloOutput, 'utf8'))
    const rotationManifest = path.join(work!, 'root-rotation-manifest.json')
    const rotationOutput = path.join(work!, 'root-rotations.json')
    const skinManifest = path.join(work!, 'face-skin-manifest.json')
    let rootRotations = []
    if (sourceFaceSkinPath) {
      const manifest = JSON.parse(await readFile(skinManifest, 'utf8'))
      await writeFile(rotationManifest, JSON.stringify({ ...manifest,
        animationBundles: parts.filter(part => part.family === 'animationclips').map(part => path.join(source, path.basename(part.entryPath))),
        clips: uniqueSelectedClips,
      }))
      await run(python, [path.resolve('scripts/chibi/export-root-rotations.py'), rotationManifest, rotationOutput], undefined, options.signal, 'Source root rotation export')
      rootRotations = JSON.parse(await readFile(rotationOutput, 'utf8'))
    }
    const arrangementDefault = await measureStage('postprocess', async () => {
      const incompleteSettings = () => ({
        incompleteImport: {
          warnings: [...renderingProfile.validation.unresolved, ...(options.candidate.unresolvedDependencies ?? []).map(value => `Missing dependency: ${value}`), 'Source completeness is unresolved. Exported geometry is retained; unsupported renderer events are omitted.'],
          materialSlots: renderingProfile.renderers.flatMap(renderer => renderer.materialSlots),
          renderers: renderingProfile.renderers.map(renderer => ({
            hierarchyPath: renderer.hierarchyPath, sourceReference: renderer.sourceReference, defaultVisible: renderer.defaultVisible,
            eyeMouth: renderer.materialSlots.some(slot => slot.adapterId === 'mx-character-eyemouth'),
            hairMaterial: renderer.materialSlots.some(slot => slot.adapterId === 'mx-character-hair'),
          })),
        },
        mouthDefaultTile: renderingProfile.mouth?.defaultTile,
        mouthAtlas: renderingProfile.mouth ? {
          columns: renderingProfile.mouth.columns, rows: renderingProfile.mouth.rows,
          defaultTile: renderingProfile.mouth.defaultTile,
          scaleX: renderingProfile.mouth.textureTransform.scale.x, scaleY: renderingProfile.mouth.textureTransform.scale.y,
        } : undefined,
        mouthTiles: Object.fromEntries(uniqueSelectedClips.map(clip => [clip, (renderingProfile.mouth?.events ?? [])
          .filter(event => event.clip === clip).map(event => [event.time, event.tile, event.flipX])])),
        alternateFaceEvents: options.candidate.events.filter(event => uniqueSelectedClips.includes(event.clip)),
      })
      const postprocess: Record<string, unknown> = {
        sourceIdentity: options.candidate.sourceIdentity, profile: options.profile,
        rendererActive, rootRotations, haloFollow,
        exportClips: uniqueSelectedClips,
        ...(renderingProfile.validation.valid && !options.candidate.unresolvedDependencies?.length
          ? { renderingProfile, assembly: renderingProfile.assembly } : incompleteSettings()),
      }
      if (mouthTexturePath) postprocess.mouthTexturePath = mouthTexturePath
      if (sourceFaceSkinPath) postprocess.sourceFaceSkinPath = sourceFaceSkinPath
      if (sourceTextureExports.length) postprocess.sourceTextureExports = sourceTextureExports
      const processOutput = async () => {
        await writeFile(config, JSON.stringify(postprocess))
        await run(process.execPath, [path.resolve('scripts/chibi-postprocess.mjs'), rawGlb, output, config], undefined, options.signal, 'Chibi GLB postprocess', true)
        await validateGlb(output)
      }
      try { await processOutput() } catch (error) {
        if (options.signal?.aborted || postprocess.incompleteImport) throw error
        renderingProfile.validation.unresolved.push(error instanceof Error ? error.message : String(error))
        delete postprocess.renderingProfile
        delete postprocess.assembly
        Object.assign(postprocess, incompleteSettings())
        await processOutput()
      }
      const outputJson = parseGlbJson(await readFile(output))
      const outputScene = outputJson.scenes?.[Number.isInteger(outputJson.scene) ? outputJson.scene : 0]
      const outputProfile = outputScene?.extras?.chibi?.renderingProfile
      if (!outputProfile && !outputScene?.extras?.chibi?.incompleteImport) throw new Error('The final GLB has no rendering diagnostics.')
      return buildChibiArrangementDefault(outputProfile ?? { renderers: [] }, outputJson.nodes)
    })
    const published = await publishArtifact(output, dataRoot, (stage, elapsedMs) => recordStage(stage, elapsedMs))
    result = {
      ...published, arrangementDefault, clips: published.validation.animations,
      materials: { source: options.candidate.sourceMaterials ?? [], output: published.validation.materials, events: options.candidate.events },
    }
  } catch (error) {
    failed = true
    failure = error
  } finally {
    if (work) {
      const cleanupStartedAt = performance.now()
      try { await rm(work, { recursive: true, force: true }) }
      catch (error) { failed = true; failure = error }
      finally { recordStage('cleanup', performance.now() - cleanupStartedAt) }
    }
  }
  const conversionTiming = buildChibiConversionTiming(performance.now() - totalStartedAt, stageDurationsMs)
  if (failed) {
    if (failure && (typeof failure === 'object' || typeof failure === 'function')) {
      try { Object.defineProperty(failure, 'chibiConversionTiming', { value: conversionTiming, configurable: true }) } catch { /* Preserve the original conversion error. */ }
    }
    throw failure
  }
  if (!result) throw new Error('Conversion completed without a published artifact.')
  return { ...result, conversionTiming }
}

export async function artifactIsIntact(fileKey: string, checksum: string, dataRoot = chibiRoots().data) {
  try {
    const file = artifactPath(fileKey, dataRoot)
    if ((await stat(file)).size < 20) return false
    const actual = createHash('sha256').update(await readFile(file)).digest('hex')
    if (actual !== checksum) return false
    await validateGlb(file)
    return true
  } catch { return false }
}
