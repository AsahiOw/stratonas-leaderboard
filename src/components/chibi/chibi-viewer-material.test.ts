import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import * as THREE from 'three'
import test from 'node:test'

import { DSFX_ALPHA_BLEND_ADD_FORWARD_GLSL, applyChibiProfileMaterialState, createDsfxAdditivePass, createDsfxAlphaBlendAddPass, createDsfxGlitchTexPass, createDsfxMatcapPass, createMxCTransparentPasses, createMxEStandardPass, createMxUnlitOutlinePass, createProjectMxWeaponPasses, isSkinCompatibleEStandardRenderer, patchEyebrowCameraShader, sourceAttributeName, updateDsfxGlitchTexUniforms, updateDsfxMatcapUniforms, updateEStandardUniforms } from './chibi-viewer-material'
import {
  DSFX_ALPHA_BLEND_ADD_FINGERPRINT, DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS, DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS,
  DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256, DSFX_ALPHA_BLEND_ADD_SHADER_NAME, DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE,
} from '../../lib/chibi/rendering-profile'

test('maps E-Standard Meta UV channels while rejecting unknown shader semantics', () => {
  assert.equal(sourceAttributeName('TEXCOORD_1'), 'in_TEXCOORD1')
  assert.equal(sourceAttributeName('TEXCOORD_2'), 'in_TEXCOORD2')
  assert.equal(sourceAttributeName('TEXCOORD_0'), 'in_TEXCOORD0')
  assert.throws(() => sourceAttributeName('TEXCOORD_3'), /unknown source attribute TEXCOORD_3/)
})

test('keeps verified E-Standard skinned geometry on the skin-aware GLTF path', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
  geometry.setAttribute('skinIndex', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4))
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
  mesh.bind(new THREE.Skeleton([new THREE.Bone()]))

  assert.equal(isSkinCompatibleEStandardRenderer(mesh), true)
  assert.equal(isSkinCompatibleEStandardRenderer(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())), false)
  assert.throws(() => createMxEStandardPass(mesh, mesh.material as THREE.Material, { adapterId: 'mx-e-standard' } as any), /unverified source shader identity/)

  const missingWeights = geometry.clone()
  missingWeights.deleteAttribute('skinWeight')
  const incomplete = new THREE.SkinnedMesh(missingWeights, new THREE.MeshBasicMaterial())
  incomplete.bind(new THREE.Skeleton([new THREE.Bone()]))
  assert.throws(() => isSkinCompatibleEStandardRenderer(incomplete), /missing exact source geometry, JOINTS_0\/WEIGHTS_0, or skeleton data/)

  const invalidInfluence = geometry.clone()
  invalidInfluence.setAttribute('skinIndex', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4))
  const invalid = new THREE.SkinnedMesh(invalidInfluence, new THREE.MeshBasicMaterial())
  invalid.bind(new THREE.Skeleton([new THREE.Bone()]))
  assert.throws(() => isSkinCompatibleEStandardRenderer(invalid), /invalid source skin influences/)
})

test('updates E-Standard MatrixVP as projection × view with ObjectToWorld applied once', () => {
  const geometry = new THREE.BufferGeometry()
  const object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  object.position.set(2, 3, 4)
  const holder = new THREE.Group()
  holder.position.set(-5, 1, 2)
  holder.scale.setScalar(200)
  holder.add(object)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 8)
  camera.updateMatrixWorld(true)
  holder.updateMatrixWorld(true)
  const texture = new THREE.Texture()
  const material = new THREE.RawShaderMaterial({ uniforms: {
    hlslcc_mtx4x4unity_MatrixVP: { value: new Float32Array(16) },
    hlslcc_mtx4x4unity_ObjectToWorld: { value: new Float32Array(16) },
    hlslcc_mtx4x4unity_WorldToObject: { value: new Float32Array(16) },
    _MainTex: { value: texture }, _MainTex_ST: { value: new THREE.Vector4() },
  } })

  updateEStandardUniforms(material, object, new THREE.Scene(), camera)

  const expectedViewProjection = new THREE.Matrix4().copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)
  const expectedModelViewProjection = new THREE.Matrix4()
    .fromArray(new Float32Array(expectedViewProjection.elements))
    .multiply(new THREE.Matrix4().fromArray(new Float32Array(object.matrixWorld.elements)))
  assert.deepEqual(
    Array.from(material.uniforms.hlslcc_mtx4x4unity_MatrixVP.value as Float32Array),
    Array.from(new Float32Array(expectedViewProjection.elements)),
  )
  assert.deepEqual(
    Array.from(material.uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value as Float32Array),
    Array.from(new Float32Array(object.matrixWorld.elements)),
  )
  const actualModelViewProjection = new THREE.Matrix4()
    .fromArray(material.uniforms.hlslcc_mtx4x4unity_MatrixVP.value as Float32Array)
    .multiply(new THREE.Matrix4().fromArray(material.uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value as Float32Array))
  assert.deepEqual(actualModelViewProjection.elements, expectedModelViewProjection.elements)
})

test('keeps the eyebrow camera shader variant free of duplicate adapter declarations', () => {
  const baseShader = '#include <common>\n#include <skinning_vertex>\n'
  const patchedShader = patchEyebrowCameraShader(patchEyebrowCameraShader(baseShader))
  assert.equal((patchedShader.match(/^uniform vec3 chibiCameraObject;$/gm) ?? []).length, 1)
  assert.equal((patchedShader.match(/^uniform float chibiZCorrection;$/gm) ?? []).length, 1)
  assert.equal((patchedShader.match(/^transformed \+= normalize\(chibiCameraObject - transformed\) \* \(chibiZCorrection \* 0\.01\);$/gm) ?? []).length, 1)
  assert.match(patchedShader, /#include <common>\nuniform vec3 chibiCameraObject;\nuniform float chibiZCorrection;/)
  assert.match(patchedShader, /#include <skinning_vertex>\ntransformed \+= normalize\(chibiCameraObject - transformed\) \* \(chibiZCorrection \* 0\.01\);/)
})

function metadata(blend: Partial<Record<string, number>> = {}) {
  return {
    adapterId: 'dsfx-static', alphaMode: 'BLEND', depthWrite: false, depthTest: false, depthFunction: 'disabled', cullMode: 'off', doubleSided: true,
    polygonOffsetFactor: 0, polygonOffsetUnits: 0,
    blend: { source: 1, destination: 10, sourceAlpha: 1, destinationAlpha: 10, operation: 0, operationAlpha: 0, ...blend },
  }
}

test('maps additive DSFX state to explicit Three.js custom blending', () => {
  const material = new THREE.MeshBasicMaterial()
  assert.equal(applyChibiProfileMaterialState(material, metadata({ destination: 1, destinationAlpha: 1 })), true)
  assert.equal(material.blending, THREE.CustomBlending)
  assert.equal(material.blendSrc, THREE.OneFactor)
  assert.equal(material.blendDst, THREE.OneFactor)
  assert.equal(material.blendSrcAlpha, THREE.OneFactor)
  assert.equal(material.blendDstAlpha, THREE.OneFactor)
  assert.equal(material.depthWrite, false)
  assert.equal(material.depthTest, false)
  assert.equal(material.side, THREE.DoubleSide)
  assert.equal(material.transparent, true)
})

test('maps AlphaBlend_0 source-alpha factors and keeps explicit alpha equations', () => {
  const material = new THREE.MeshBasicMaterial()
  applyChibiProfileMaterialState(material, metadata({ source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10 }))
  assert.equal(material.blendSrc, THREE.SrcAlphaFactor)
  assert.equal(material.blendDst, THREE.OneMinusSrcAlphaFactor)
  assert.equal(material.blendSrcAlpha, THREE.SrcAlphaFactor)
  assert.equal(material.blendDstAlpha, THREE.OneMinusSrcAlphaFactor)
  assert.equal(material.blendEquation, THREE.AddEquation)
  assert.equal(material.blendEquationAlpha, THREE.AddEquation)
})

const alphaBlend0SourceShaderReference = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-660637482714961986',
}

test('maps the exact AlphaBlend_0 depth-tested back-cull variant', () => {
  const material = new THREE.MeshBasicMaterial()
  applyChibiProfileMaterialState(material, {
    ...metadata({ source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10 }),
    sourceShaderReference: alphaBlend0SourceShaderReference,
    dsfxRenderStateVariant: 'depth-tested-back-cull', depthWrite: false, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'back', doubleSided: false,
  })
  assert.equal(material.depthWrite, false)
  assert.equal(material.depthTest, true)
  assert.equal(material.depthFunc, THREE.LessEqualDepth)
  assert.equal(material.side, THREE.FrontSide)
})

test('maps the exact AlphaBlend_0 depth-tested off-cull variant', () => {
  const material = new THREE.MeshBasicMaterial()
  applyChibiProfileMaterialState(material, {
    ...metadata({ source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10 }),
    sourceShaderReference: alphaBlend0SourceShaderReference,
    dsfxRenderStateVariant: 'depth-tested-off-double-sided', depthWrite: false, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'off', doubleSided: true,
  })
  assert.equal(material.depthWrite, false)
  assert.equal(material.depthTest, true)
  assert.equal(material.depthFunc, THREE.LessEqualDepth)
  assert.equal(material.side, THREE.DoubleSide)
})

test('rejects AlphaBlend_0 state variants that are missing or tampered', () => {
  const material = new THREE.MeshBasicMaterial()
  const source = {
    ...metadata({ source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10 }),
    sourceShaderReference: alphaBlend0SourceShaderReference,
    dsfxRenderStateVariant: 'depth-tested-back-cull', depthWrite: false, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'back', doubleSided: false,
  }
  assert.throws(() => applyChibiProfileMaterialState(material, { ...source, dsfxRenderStateVariant: undefined }), /AlphaBlend_0 render-state variant/)
  assert.throws(() => applyChibiProfileMaterialState(material, { ...source, cullMode: 'off', doubleSided: true }), /AlphaBlend_0 render-state variant/)
})

test('does not alter non-DSFX viewer materials', () => {
  const material = new THREE.MeshBasicMaterial()
  assert.equal(applyChibiProfileMaterialState(material, { adapterId: 'gltf-native' }), false)
  assert.equal(material.blending, THREE.NormalBlending)
})

test('rejects incomplete or unknown DSFX blend metadata', () => {
  const material = new THREE.MeshBasicMaterial()
  assert.throws(() => applyChibiProfileMaterialState(material, metadata({ source: 99 })), /invalid source blend factor/)
  assert.throws(() => applyChibiProfileMaterialState(material, { adapterId: 'dsfx-static', alphaMode: 'BLEND', blend: null }), /missing its exact transparent blend state/)
})

const mxReference = {
  bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
  serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-8748270323205728420',
}
const mxBaseHash = '8dd437bded36c20c116d416a2a3f679deb58b3249d887cfce6fbcfeaad94a24e'
const mxOutlineHash = 'cf33765ab69ff40c91202ccb8b006211246685b6be23a41636cdf9de69bffde0'
const mxBlobHash = '91f6c05f3ea2768b13f3879bff7eb56fd28bd852aca89131caa3ddfec5ecf8ce'
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
  '#endif', '#ifdef FRAGMENT',
  ...(outline ? ['uniform sampler2D _MainTex;', 'uniform vec4 _OutlineTint;'] : ['uniform vec2 _GlobalMipBias;']),
  '#endif',
].join('\n')

function mxPass(pass: 'base' | 'outline') {
  const outline = pass === 'outline'
  return {
    pass, stateName: outline ? 'Outline' : 'ForwardLit', subShaderIndex: 0, passIndex: outline ? 1 : 0,
    stage: 'vertex', platform: 9, gpuProgramType: 4, blobIndex: outline ? 6 : 1, parameterBlobIndex: outline ? 4 : 0,
    parameterRecordSha256: `${outline ? '4' : '3'}`.repeat(64), keywordIndices: [], keywordNames: [],
    programHash: outline ? mxOutlineHash : mxBaseHash, programDataSha256: outline ? mxOutlineHash : mxBaseHash,
    programRecordSha256: `${outline ? '2' : '1'}`.repeat(64), glsl: sourceGlsl(outline),
    requiredAttributes: outline ? ['POSITION', 'TANGENT', 'COLOR_0', 'TEXCOORD_0'] : ['POSITION', 'TEXCOORD_0'],
    requiredUniforms: outline
      ? ['_MainTex_ST', '_OutlineTint', '_OutlineZCorrection', '_MainTex', '_MainLightColor', '_ScreenParams',
        'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV', 'hlslcc_mtx4x4unity_MatrixVP']
      : ['_MainTex_ST', '_Tint', '_MainTex'],
    renderState: { zWrite: 1, zTest: 4, culling: outline ? 1 : 0 },
  }
}

function mxMetadata() {
  return {
    adapterId: 'mx-unlit-outline', sourceShaderReference: structuredClone(mxReference),
    outlineTint: [0.2641509175300598, 0.2641509175300598, 0.2641509175300598, 1], outlineZCorrection: 0,
    shaderExtraction: {
      schemaVersion: 1, extractorVersion: 1, fingerprint: 'a'.repeat(64), sourceReference: structuredClone(mxReference),
      compressedBlobSha256: mxBlobHash, passes: { base: mxPass('base'), outline: mxPass('outline') },
    },
  }
}

test('creates an exact MX/Unlit Outline second draw with source vertex attributes', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
  geometry.setAttribute('tangent', new THREE.Float32BufferAttribute([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1], 4))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 0.5, 0.25, 0.75, 1, 1, 1, 0.5, 0, 0, 0, 1], 4))
  const texture = new THREE.Texture()
  const base = new THREE.MeshBasicMaterial({ map: texture })
  const object = new THREE.Mesh(geometry, base)
  object.name = 'CH0204_parchment'
  object.renderOrder = 7
  const outline = createMxUnlitOutlinePass(object, base, mxMetadata())!
  assert.ok(outline instanceof THREE.Mesh)
  assert.equal(outline.renderOrder, 7.001)
  assert.equal(outline.material instanceof THREE.RawShaderMaterial, true)
  assert.equal(outline.material.side, THREE.BackSide)
  assert.equal(outline.material.depthWrite, true)
  assert.equal(outline.material.depthTest, true)
  assert.equal(outline.geometry.getAttribute('in_TANGENT0').itemSize, 4)
  assert.equal(outline.geometry.getAttribute('in_COLOR0').itemSize, 4)
  assert.equal(outline.geometry.getAttribute('in_COLOR0').array[3], 0.75)
  assert.match((outline.material as THREE.RawShaderMaterial).vertexShader, /in_TANGENT0/)
  assert.doesNotMatch((outline.material as THREE.RawShaderMaterial).vertexShader, /^\s*#version/m)
  assert.equal((outline.material as THREE.RawShaderMaterial).uniforms._OutlineTint.value.x, 0.2641509175300598)
  assert.equal(outline.userData.chibiOutlinePass, true)
})

test('rejects an MX/Unlit Outline second draw with active shader keywords or missing COLOR_0 width', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0], 2))
  geometry.setAttribute('tangent', new THREE.Float32BufferAttribute([1, 0, 0, 1], 4))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1], 3))
  const base = new THREE.MeshBasicMaterial({ map: new THREE.Texture() })
  const object = new THREE.Mesh(geometry, base)
  const keywordMetadata = mxMetadata() as any
  keywordMetadata.shaderExtraction.passes.outline.keywordNames = ['FOG_LINEAR']
  assert.throws(() => createMxUnlitOutlinePass(object, base, keywordMetadata), /incomplete outline source pass metadata/)

  assert.throws(() => createMxUnlitOutlinePass(object, base, mxMetadata()), /missing COLOR_0 with its source width/)
})

const transparentReference = {
  bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
  serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-5281742850669710733',
}
const transparentBlob = 'ff279d3985ac14ecb356f9ab863bb83b3b9d18033bfe897c877f8da866e6d345'
const transparentFingerprint = '476551579a557a660da5fa3454da6f10193c729fef20430d4c905e8df0c7d7a5'
const transparentForwardHash = 'a183c161a42534139176e57679b700599f385de97243d75ef719a70c0feea253'
const transparentDitherHash = '8b65ba41e0b6f12e63d7d04c8eb017ac03a7962880f76474faea12cdcde319f9'
const transparentDepthHash = '4ea792966bb7d8359234279f7e000ebea5c5a4fedd7a62ed819225f5186bae98'
const transparentForwardUniforms = [
  '_WorldSpaceCameraPos', '_MxCharShadowTone', '_MxCharLightData', '_Tint', '_ShadowThreshold', '_ShadowTint', '_Cutoff',
  '_RimAreaMultiplier', '_RimStrength', '_AdditionalLightStrength', '_AdditionalLightSharpness', '_GrayBrightness', '_MainTex_ST',
  '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', '_DitherThreshold', '_MaskRtoG', '_MaskGSensitivity',
  '_SeeThroughMinValue', '_SeeThroughTransparency', '_SeeThroughSmoothness', '_GlobalMipBias', '_MxCharLightDir', '_MxCharLightTone',
  '_MainTex', '_MaskTex', 'hlslcc_mtx4x4unity_MatrixVP',
]
const transparentDitherUniforms = [...transparentForwardUniforms, '_ProjectionParams']
const transparentSource = (attributes: readonly string[], uniforms: readonly string[]) => [
  '#version 300 es', '#ifdef VERTEX', ...attributes.map(attribute => `in vec4 in_${attribute === 'POSITION' ? 'POSITION0' : attribute === 'NORMAL' ? 'NORMAL0' : attribute === 'COLOR_0' ? 'COLOR0' : 'TEXCOORD0'};`),
  ...uniforms.map(uniform => `uniform float ${uniform};`), 'void main(){}', '#endif', '#ifdef FRAGMENT', ...uniforms.map(uniform => `uniform float ${uniform};`), 'void main(){}', '#endif',
].join('\n')
const transparentPass = (pass: 'forward' | 'dither' | 'depth') => {
  const dither = pass === 'dither', depth = pass === 'depth'
  const attributes = depth ? ['POSITION'] : ['POSITION', 'NORMAL', 'COLOR_0', 'TEXCOORD_0']
  const uniforms = depth ? ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld'] : dither ? transparentDitherUniforms : transparentForwardUniforms
  const programHash = depth ? transparentDepthHash : dither ? transparentDitherHash : transparentForwardHash
  const record = `${pass}record`.slice(0, 1).repeat(64)
  const parameter = `${pass}param`.slice(0, 1).repeat(64)
  return {
    pass, stateName: depth ? '' : 'ForwardLit', subShaderIndex: 0, passIndex: depth ? 1 : 0, stage: 'vertex', platform: 9,
    gpuProgramType: 4, blobIndex: depth ? 31 : dither ? 8 : 6, parameterBlobIndex: depth ? 30 : dither ? 1 : 0,
    parameterRecordSha256: parameter, keywordIndices: dither ? [9] : [], keywordNames: dither ? ['_DITHER_HORIZONTAL_LINES'] : [],
    programHash, programDataSha256: programHash, programRecordSha256: record, glsl: transparentSource(attributes, uniforms),
    requiredAttributes: attributes, requiredUniforms: uniforms,
    renderState: {
      zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
      sourceBlend: depth ? 1 : 5, destinationBlend: depth ? 0 : 10, sourceBlendAlpha: 1, destinationBlendAlpha: depth ? 0 : 10,
      blendOperation: 0, blendOperationAlpha: 0, colorMask: depth ? 0 : 15, depthOnly: depth,
    },
  }
}
const transparentMaterialMetadata = (variant: 'forward' | 'dither' = 'forward') => ({
  adapterId: 'mx-c-transparent-st', sourceShaderReference: structuredClone(transparentReference),
  transparentVariant: variant, depthWrite: true, depthTest: true, cullMode: 'off',
  transparentMaterialProperties: {
    floats: {
      _ShadowThreshold: 0.5, _Cutoff: 0.5, _RimAreaMultiplier: 1, _RimStrength: 1, _AdditionalLightStrength: 1,
      _AdditionalLightSharpness: 5, _GrayBrightness: 1, _DitherThreshold: 0, _MaskRtoG: 0, _MaskGSensitivity: 1,
      _SeeThroughMinValue: 0.5, _SeeThroughTransparency: 1, _SeeThroughSmoothness: 1,
    },
    colors: {
      _Tint: { r: 1, g: 1, b: 1, a: 1 }, _ShadowTint: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 }, _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 }, _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 },
    },
  },
  transparentShaderExtraction: {
    schemaVersion: 1, extractorVersion: 1, fingerprint: transparentFingerprint, compressedBlobSha256: transparentBlob,
    sourceReference: structuredClone(transparentReference), passes: { forward: transparentPass('forward'), dither: transparentPass('dither'), depth: transparentPass('depth') },
  },
})

test('creates exact MX/C-Transparent-ST forward and colorWrite=false depth-only draws', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 4))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
  const map = new THREE.Texture(), mask = new THREE.Texture()
  const base = new THREE.MeshBasicMaterial({ map }); (base.userData as { chibiMaskTexture?: THREE.Texture }).chibiMaskTexture = mask
  const object = new THREE.Mesh(geometry, base); object.renderOrder = 4
  const passes = createMxCTransparentPasses(object, base, transparentMaterialMetadata())!
  assert.ok(passes.forward instanceof THREE.RawShaderMaterial)
  assert.ok(passes.depth instanceof THREE.RawShaderMaterial)
  assert.ok(passes.depthMesh instanceof THREE.Mesh)
  assert.equal(passes.forward.glslVersion, THREE.GLSL3)
  assert.equal(passes.forward.blending, THREE.CustomBlending)
  assert.equal(passes.forward.blendSrc, THREE.SrcAlphaFactor)
  assert.equal(passes.forward.blendDst, THREE.OneMinusSrcAlphaFactor)
  assert.equal(passes.forward.blendSrcAlpha, THREE.OneFactor)
  assert.equal(passes.forward.blendDstAlpha, THREE.OneMinusSrcAlphaFactor)
  assert.equal(passes.forward.depthWrite, true)
  assert.equal(passes.forward.side, THREE.DoubleSide)
  assert.equal(passes.depth.glslVersion, THREE.GLSL3)
  assert.equal(passes.depth.colorWrite, false)
  assert.equal(passes.depth.blending, THREE.CustomBlending)
  assert.equal(passes.depth.blendSrc, THREE.OneFactor)
  assert.equal(passes.depth.blendDst, THREE.ZeroFactor)
  assert.equal(passes.depth.depthWrite, true)
  assert.equal(passes.depth.side, THREE.DoubleSide)
  assert.deepEqual(Object.keys(passes.depth.uniforms).sort(), [
    'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld',
  ])
  assert.equal(passes.forwardGeometry.getAttribute('in_POSITION0').itemSize, 3)
  assert.equal(passes.forwardGeometry.getAttribute('in_NORMAL0').itemSize, 3)
  assert.equal(passes.forwardGeometry.getAttribute('in_COLOR0').itemSize, 4)
  assert.match(passes.forward.vertexShader, /_MaskTex/)
  assert.match(passes.forward.fragmentShader, /_MaskGSensitivity/)
  assert.match(passes.depth.vertexShader, /in_POSITION0/)
  assert.doesNotMatch(passes.forward.vertexShader, /skinning_vertex/)
  assert.doesNotMatch(passes.depth.vertexShader, /skinning_vertex/)
})

test('skins transparent clothing in both source color and depth draws', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([1, 0, 0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1], 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1], 4))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0], 2))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0], 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0], 4))
  const base = new THREE.MeshBasicMaterial({ map: new THREE.Texture() })
  base.userData.chibiMaskTexture = new THREE.Texture()
  const bone = new THREE.Bone()
  const object = new THREE.SkinnedMesh(geometry, base)
  object.add(bone)
  object.bind(new THREE.Skeleton([bone]))
  const passes = createMxCTransparentPasses(object, base, transparentMaterialMetadata())!
  assert.ok(passes.depthMesh instanceof THREE.SkinnedMesh)
  assert.equal(passes.depthMesh.skeleton, object.skeleton)
  assert.deepEqual(passes.depthMesh.bindMatrix.elements, object.bindMatrix.elements)
  for (const material of [passes.forward, passes.depth]) {
    assert.match(material.vertexShader, /#include <skinning_pars_vertex>/)
    assert.match(material.vertexShader, /#include <skinning_vertex>/)
  }
  assert.match(passes.forward.vertexShader, /#include <skinnormal_vertex>/)
  object.geometry = passes.forwardGeometry
  object.add(passes.depthMesh)
  bone.position.y = 2
  object.updateMatrixWorld(true)
  const forwardPosition = object.applyBoneTransform(0, new THREE.Vector3(1, 0, 0))
  const depthPosition = passes.depthMesh.applyBoneTransform(0, new THREE.Vector3(1, 0, 0))
  assert.deepEqual(forwardPosition.toArray(), [1, 2, 0])
  assert.deepEqual(depthPosition.toArray(), forwardPosition.toArray())
})

test('updates only the exact source-declared matrix uniforms for the transparent depth pass', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 4))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
  const base = new THREE.MeshBasicMaterial({ map: new THREE.Texture() })
  ;(base.userData as { chibiMaskTexture?: THREE.Texture }).chibiMaskTexture = new THREE.Texture()
  const object = new THREE.Mesh(geometry, base)
  object.position.set(2, 3, 4)
  const holder = new THREE.Group()
  holder.position.set(-5, 1, 2)
  holder.scale.setScalar(200)
  holder.add(object)
  const passes = createMxCTransparentPasses(object, base, transparentMaterialMetadata())!
  object.add(passes.depthMesh)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 8)
  camera.updateMatrixWorld(true)
  holder.updateMatrixWorld(true)
  const expectedViewProjection = new THREE.Matrix4().copy(camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse)
  const expectedModelViewProjection = new THREE.Matrix4()
    .fromArray(new Float32Array(expectedViewProjection.elements))
    .multiply(new THREE.Matrix4().fromArray(new Float32Array(object.matrixWorld.elements)))

  object.onBeforeRender(
    {} as THREE.WebGLRenderer, new THREE.Scene(), camera, object.geometry, passes.forward, new THREE.Group(),
  )
  assert.deepEqual(
    Array.from(passes.forward.uniforms.hlslcc_mtx4x4unity_MatrixVP.value as Float32Array),
    Array.from(new Float32Array(expectedViewProjection.elements)),
  )
  assert.deepEqual(
    Array.from(passes.forward.uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value as Float32Array),
    Array.from(new Float32Array(object.matrixWorld.elements)),
  )
  const actualForwardModelViewProjection = new THREE.Matrix4()
    .fromArray(passes.forward.uniforms.hlslcc_mtx4x4unity_MatrixVP.value as Float32Array)
    .multiply(new THREE.Matrix4().fromArray(passes.forward.uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value as Float32Array))
  assert.deepEqual(actualForwardModelViewProjection.elements, expectedModelViewProjection.elements)

  assert.doesNotThrow(() => passes.depthMesh.onBeforeRender(
    {} as THREE.WebGLRenderer, new THREE.Scene(), camera, passes.depthMesh.geometry, passes.depth, new THREE.Group(),
  ))
  assert.deepEqual(
    Array.from(passes.depth.uniforms.hlslcc_mtx4x4unity_MatrixVP.value as Float32Array),
    Array.from(new Float32Array(expectedViewProjection.elements)),
  )
  assert.deepEqual(
    Array.from(passes.depth.uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value as Float32Array),
    Array.from(new Float32Array(object.matrixWorld.elements)),
  )
  const actualDepthModelViewProjection = new THREE.Matrix4()
    .fromArray(passes.depth.uniforms.hlslcc_mtx4x4unity_MatrixVP.value as Float32Array)
    .multiply(new THREE.Matrix4().fromArray(passes.depth.uniforms.hlslcc_mtx4x4unity_ObjectToWorld.value as Float32Array))
  assert.deepEqual(actualDepthModelViewProjection.elements, expectedModelViewProjection.elements)

  const missingMatrix = createMxCTransparentPasses(object, base, transparentMaterialMetadata())!
  delete (missingMatrix.depth.uniforms as Record<string, unknown>).hlslcc_mtx4x4unity_MatrixVP
  assert.throws(() => missingMatrix.depthMesh.onBeforeRender(
    {} as THREE.WebGLRenderer, new THREE.Scene(), camera, missingMatrix.depthMesh.geometry, missingMatrix.depth, new THREE.Group(),
  ), /MX\/C-Transparent-ST depth pass is missing exact source matrix uniforms/)
})

test('selects the exact dither variant and fails closed without the mask texture', () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1], 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1], 4))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0], 2))
  const base = new THREE.MeshBasicMaterial({ map: new THREE.Texture() })
  const object = new THREE.Mesh(geometry, base)
  assert.throws(() => createMxCTransparentPasses(object, base, transparentMaterialMetadata('dither')), /no exact _MaskTex texture/)
  ;(base.userData as { chibiMaskTexture?: THREE.Texture }).chibiMaskTexture = new THREE.Texture()
  const passes = createMxCTransparentPasses(object, base, transparentMaterialMetadata('dither'))!
  assert.match(passes.forward.fragmentShader, /_ProjectionParams/)
  assert.equal(passes.forward.userData.chibi.programHash, transparentDitherHash)
})

const projectMxReference = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-2179428789015729742',
}
const projectMxBlob = '962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b'
const projectMxFingerprint = 'dba2503cda8be6508b161525ab1202a9187f93c8924716efe6f3d061a4ff439b'
const projectMxPassSpecs = {
  forward: { stateName: 'ForwardLit', passIndex: 0, blobIndex: 32, parameterBlobIndex: 0, parameterRecordSha256: '1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531', programHash: '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0', programRecordSha256: '6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab', programDataLength: 9117, keywordIndices: [], keywordNames: [], attributes: ['POSITION', 'NORMAL', 'TEXCOORD_0'] },
  glow: { stateName: 'ForwardLit', passIndex: 0, blobIndex: 34, parameterBlobIndex: 2, parameterRecordSha256: 'eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3', programHash: '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61', programRecordSha256: '649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199', programDataLength: 9679, keywordIndices: [10], keywordNames: ['_GLOW_0'], attributes: ['POSITION', 'NORMAL', 'TEXCOORD_0'] },
  outline: { stateName: 'Outline', passIndex: 1, blobIndex: 104, parameterBlobIndex: 80, parameterRecordSha256: '93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9', programHash: 'a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703', programRecordSha256: '476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026', programDataLength: 5141, keywordIndices: [], keywordNames: [], attributes: ['POSITION', 'COLOR_0', 'TANGENT', 'TEXCOORD_0'] },
  solidOutline: { stateName: 'Solid Color Outline', passIndex: 2, blobIndex: 180, parameterBlobIndex: 176, parameterRecordSha256: '81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e', programHash: 'caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2', programRecordSha256: 'cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f', programDataLength: 5384, keywordIndices: [], keywordNames: [], attributes: ['POSITION', 'COLOR_0', 'TANGENT'] },
  shadow: { stateName: 'ShadowCaster', passIndex: 3, blobIndex: 193, parameterBlobIndex: 192, parameterRecordSha256: '7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35', programHash: 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0', programRecordSha256: '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46', programDataLength: 4273, keywordIndices: [], keywordNames: [], attributes: ['POSITION', 'NORMAL'] },
  depth: { stateName: 'DepthOnly', passIndex: 4, blobIndex: 195, parameterBlobIndex: 194, parameterRecordSha256: 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532', programHash: '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513', programRecordSha256: '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0', programDataLength: 2766, keywordIndices: [], keywordNames: [], attributes: ['POSITION'] },
} as const
const projectMxForwardUniforms = [
  '_WorldSpaceCameraPos', 'hlslcc_mtx4x4unity_MatrixVP', '_MxCharShadowTone', '_ShadowTint', '_mainTex_ST', '_FakeLightDir',
  '_MxCharLightTone', '_MxCharLightData', '_ShadowThreshold', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor',
  '_Color', '_ShadowStrong', '_SpecColor', '_LightValue', '_LightStrong', '_SpecStrong', '_FireCol', '_FireBackCol_Str',
  '_FireValue', '_Fire', '_mainTex', '_sourceTex',
]
const projectMxGlowUniforms = [...projectMxForwardUniforms, '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0']
const projectMxOutlineUniforms = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_OutlineTint', '_OutlineZCorrection', '_mainTex',
]
const projectMxSolidUniforms = [
  '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
  'hlslcc_mtx4x4unity_MatrixVP', '_AdditionalLightSharpness', '_AdditionalLightStrength', '_OutlineTint',
  '_OutlineZCorrection', '_OutlineSolidColorTint', '_DitherThreshold',
]
const projectMxPassUniforms: Record<keyof typeof projectMxPassSpecs, readonly string[]> = {
  forward: projectMxForwardUniforms, glow: projectMxGlowUniforms, outline: projectMxOutlineUniforms,
  solidOutline: projectMxSolidUniforms, shadow: ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier'],
  depth: ['hlslcc_mtx4x4unity_MatrixVP'],
}
const projectMxSourceGlsl = (pass: keyof typeof projectMxPassSpecs) => {
  const attributes = projectMxPassSpecs[pass].attributes.map(attribute => `in vec4 in_${attribute === 'POSITION' ? 'POSITION0' : attribute === 'NORMAL' ? 'NORMAL0' : attribute === 'TANGENT' ? 'TANGENT0' : attribute === 'COLOR_0' ? 'COLOR0' : 'TEXCOORD0'};`)
  const uniforms = projectMxPassUniforms[pass].map(uniform => `uniform float ${uniform};`)
  return ['#version 300 es', '#ifdef VERTEX', ...attributes, ...uniforms, 'void main(){}', '#endif', '#ifdef FRAGMENT', ...uniforms, 'void main(){}', '#endif'].join('\n')
}
function projectMxPass(pass: keyof typeof projectMxPassSpecs) {
  const spec = projectMxPassSpecs[pass]
  return {
    pass, ...spec, subShaderIndex: 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
    programDataSha256: spec.programHash, usesNoiseTexture: false, glsl: projectMxSourceGlsl(pass),
    requiredAttributes: [...spec.attributes], requiredUniforms: [...projectMxPassUniforms[pass]],
    renderState: {
      zWrite: 1, zTest: 4, culling: pass === 'outline' || pass === 'solidOutline' ? 1 : 2, colorMask: pass === 'depth' ? 0 : 15,
      sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0,
    },
  }
}
const projectMxProperties = {
  floats: {
    _ShadowThreshold: 0.5, _ShadowStrong: 30, _LightValue: 1, _LightStrong: 1, _SpecStrong: 1,
    _FireBackCol_Str: 0.1, _FireValue: 1, _Fire: 0, _DamageON: 0, _Damage: 0,
    _IsDither: 0, _UseGlow: 0, _GlowStrictness0: 1, _GlowStrength0: 1,
  },
  colors: {
    _ShadowTint: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, _FakeLightDir: { r: 0, g: 1, b: 0, a: 0 },
    _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 }, _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 },
    _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 }, _Color: { r: 1, g: 1, b: 1, a: 1 },
    _SpecColor: { r: 1, g: 1, b: 1, a: 1 }, _FireCol: { r: 1, g: 0.7, b: 0, a: 0 },
    _GlowMaskColor0: { r: 1, g: 1, b: 1, a: 1 }, _GlowTint0: { r: 1, g: 1, b: 1, a: 1 },
    _OutlineTint: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, _OutlineSolidColorTint: { r: 0, g: 0, b: 0, a: 1 },
  },
  keywords: [] as string[],
}
function projectMxMetadata(activeVariant: 'forward' | 'glow' = 'forward') {
  const requiredProperties = [
    '_DamageON', '_Color', '_mainTex', '_sourceTex', '_NoiseTex', '_CrushScale', '_NoiseDir', '_DmgCol', '_NoiseColStrong',
    '_Damage', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_ShadowThreshold', '_ShadowStrong', '_LightValue',
    '_LightStrong', '_SpecStrong', '_ShadowTint', '_SpecColor', '_FakeLightDir', '_AdditionalLightStrength',
    '_AdditionalLightSharpness', '_UseGlow', '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0',
    '_OutlineTint', '_OutlineSolidColorTint', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', '_GrayBrightness',
    '_IsDither', '_DitherThreshold',
  ]
  const extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: projectMxFingerprint,
    sourceReference: structuredClone(projectMxReference), compressedBlobSha256: projectMxBlob,
    shaderName: 'ProjectMX/WeaponTest1Damage',
    shaderKeywordNames: ['STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON', '_ADDITIONAL_LIGHTS', 'DEBUG_DISPLAY', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2', '_DAMAGE_0', '_GLOW_0', '_DITHER_HORIZONTAL_LINES', 'OUTLINE_RIM_LIGHT_POINT', 'OUTLINE_RIM_LIGHT_SPOT', '_GRAYSCALE_MODE', '_CHAR_CUTOUT_MODE'],
    activeVariant, activeKeywordNames: activeVariant === 'glow' ? ['_GLOW_0'] : [], requiredProperties, requiredTextureProperties: ['_mainTex', '_sourceTex'],
    passes: Object.fromEntries((Object.keys(projectMxPassSpecs) as (keyof typeof projectMxPassSpecs)[]).map(pass => [pass, projectMxPass(pass)])),
  }
  const properties = structuredClone(projectMxProperties)
  properties.keywords = activeVariant === 'glow' ? ['_GLOW_0'] : []
  properties.floats._UseGlow = activeVariant === 'glow' ? 1 : 0
  return {
    adapterId: 'projectmx-weapon-test1-damage', sourceShaderReference: structuredClone(projectMxReference),
    projectMxShaderExtraction: extraction, projectMxMaterialProperties: properties,
    projectMxTextures: { mainTex: { index: 2 }, sourceTex: { index: 3 } },
  }
}
function projectMxMesh() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
  geometry.setAttribute('tangent', new THREE.Float32BufferAttribute([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1], 4))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 4))
  const base = new THREE.MeshBasicMaterial({ map: new THREE.Texture() })
  const object = new THREE.Mesh(geometry, base)
  ;(base.userData as any).chibiProjectMxTextures = { mainTex: new THREE.Texture(), sourceTex: new THREE.Texture() }
  return { object, base }
}

function projectMxSkinnedMesh() {
  const { object, base } = projectMxMesh()
  const geometry = object.geometry
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4))
  const skinned = new THREE.SkinnedMesh(geometry, base)
  return { object: skinned, base }
}

test('creates ProjectMX ForwardLit no-keyword and one front-cull Outline child', () => {
  const { object, base } = projectMxMesh()
  const passes = createProjectMxWeaponPasses(object, base, projectMxMetadata())!
  assert.ok(passes.forward instanceof THREE.RawShaderMaterial)
  assert.equal(passes.forward.side, THREE.FrontSide)
  assert.equal(passes.forward.depthWrite, true)
  assert.equal(passes.forward.uniforms._mainTex.value, (base.userData as any).chibiProjectMxTextures.mainTex)
  assert.equal(passes.forward.uniforms._sourceTex.value, (base.userData as any).chibiProjectMxTextures.sourceTex)
  assert.doesNotMatch(passes.forward.vertexShader, /_GlowStrength0/)
  assert.ok(passes.outline instanceof THREE.Mesh)
  assert.equal(passes.outline.material.side, THREE.BackSide)
  assert.equal((passes.outline.material as THREE.RawShaderMaterial).uniforms._OutlineZCorrection, undefined)
  assert.equal(passes.outline.geometry.getAttribute('in_TANGENT0').itemSize, 4)
  assert.equal(passes.outline.geometry.getAttribute('in_COLOR0').itemSize, 4)
  assert.equal(passes.outline.userData.chibiOutlinePass, true)
  assert.equal(passes.nonColorPasses.solidOutline.pass, 'solidOutline')
  assert.equal(passes.nonColorPasses.shadow.pass, 'shadow')
  assert.equal(passes.nonColorPasses.depth.pass, 'depth')
})

test('keeps skinned ProjectMX core renderers on their skin-compatible GLTF material and geometry', () => {
  const { object, base } = projectMxSkinnedMesh()
  const passes = createProjectMxWeaponPasses(object, base, projectMxMetadata())!
  assert.ok(object instanceof THREE.SkinnedMesh)
  assert.ok(object.geometry.getAttribute('skinIndex'))
  assert.ok(object.geometry.getAttribute('skinWeight'))
  assert.equal(passes.forward, base)
  assert.equal(passes.forwardGeometry, object.geometry)
  assert.equal(passes.outline, null)
  assert.equal(passes.forward instanceof THREE.RawShaderMaterial, false)
})

test('still fails closed on tampered ProjectMX source metadata for skinned renderers', () => {
  const metadata = projectMxMetadata() as any
  metadata.projectMxShaderExtraction.passes.forward.programHash = 'f'.repeat(64)
  const { object, base } = projectMxSkinnedMesh()
  assert.throws(() => createProjectMxWeaponPasses(object, base, metadata), /incomplete or tampered ForwardLit no-keyword/)
})

test('selects ProjectMX verified _GLOW_0 ForwardLit source variant', () => {
  const { object, base } = projectMxMesh()
  const passes = createProjectMxWeaponPasses(object, base, projectMxMetadata('glow'))!
  assert.ok(passes.forward instanceof THREE.RawShaderMaterial)
  assert.match(passes.forward.vertexShader, /_GlowStrength0/)
  assert.equal(passes.forward.userData.chibi.activeVariant, 'glow')
  assert.ok(passes.outline instanceof THREE.Mesh)
  assert.equal(passes.outline.renderOrder, 0.001)
})

test('binds a source-authored ProjectMX outline correction when present', () => {
  const metadata = projectMxMetadata() as any
  metadata.projectMxMaterialProperties.floats._OutlineZCorrection = 0.125
  const { object, base } = projectMxMesh()
  const passes = createProjectMxWeaponPasses(object, base, metadata)!
  assert.ok(passes.outline instanceof THREE.Mesh)
  assert.equal((passes.outline.material as THREE.RawShaderMaterial).uniforms._OutlineZCorrection.value, 0.125)
})

test('fails closed on ProjectMX tamper, unknown keyword, missing texture, and missing outline attributes', () => {
  const tampered = projectMxMetadata() as any
  tampered.projectMxShaderExtraction.passes.forward.programHash = 'f'.repeat(64)
  let fixture = projectMxMesh()
  assert.throws(() => createProjectMxWeaponPasses(fixture.object, fixture.base, tampered), /incomplete or tampered ForwardLit no-keyword/)
  const unknown = projectMxMetadata() as any
  unknown.projectMxMaterialProperties.keywords = ['_DAMAGE_0']
  fixture = projectMxMesh()
  assert.throws(() => createProjectMxWeaponPasses(fixture.object, fixture.base, unknown), /unsupported source keywords/)
  const missingTexture = projectMxMetadata() as any
  fixture = projectMxMesh(); delete fixture.base.userData.chibiProjectMxTextures.sourceTex
  assert.throws(() => createProjectMxWeaponPasses(fixture.object, fixture.base, missingTexture), /no exact _sourceTex texture/)
  fixture = projectMxMesh(); fixture.object.geometry.deleteAttribute('color')
  assert.throws(() => createProjectMxWeaponPasses(fixture.object, fixture.base, projectMxMetadata()), /missing COLOR_0/)
  const invalidOutlineCorrection = projectMxMetadata() as any
  invalidOutlineCorrection.projectMxMaterialProperties.floats._OutlineZCorrection = 'not-a-number'
  fixture = projectMxMesh()
  assert.throws(() => createProjectMxWeaponPasses(fixture.object, fixture.base, invalidOutlineCorrection), /missing exact _OutlineZCorrection/)
})

test('fails closed on unsupported ProjectMX gate or inactive noise metadata', () => {
  const gated = projectMxMetadata() as any
  gated.projectMxMaterialProperties.floats._Fire = 1
  let fixture = projectMxMesh()
  assert.throws(() => createProjectMxWeaponPasses(fixture.object, fixture.base, gated), /unsupported interactive _Fire/)
  const noise = projectMxMetadata() as any
  noise.projectMxTextures.noiseTex = { index: 4 }
  fixture = projectMxMesh()
  assert.throws(() => createProjectMxWeaponPasses(fixture.object, fixture.base, noise), /inactive _NoiseTex/)
})

const glitchReference = {
  bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
  serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-50954330373109545',
}
const glitchNoiseReference = {
  bundleSha256: '1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74',
  serializedFile: 'CAB-39fe55e8868aab69e2cf9a8ae5dcef67', objectId: '277634516359511144',
}
const glitchGlsl = (shadow: boolean) => [
  '#version 300 es', '#ifdef VERTEX',
  `in highp vec4 in_POSITION0;`, ...(shadow ? ['in highp vec3 in_NORMAL0;'] : ['in highp vec2 in_TEXCOORD0;']),
  ...(!shadow ? [
    'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;', 'uniform mat4 hlslcc_mtx4x4unity_ObjectToWorld;', 'uniform vec4 _Time;',
    'uniform float _Cull_Mode;', 'uniform float _Speed_Value;', 'uniform float _Shaking;', 'uniform float _Jitter;',
    'uniform float _Glitch_value;', 'uniform float _x;', 'uniform float _y;', 'uniform sampler2D _NoiseTex;', 'uniform sampler2D _MainTex;',
  ] : [
    'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;', 'uniform vec4 _ShadowBias;', 'uniform vec3 _LightDirection;',
    'uniform vec4 _ShadowCoordModifier;', 'uniform mat4 hlslcc_mtx4x4unity_ObjectToWorld;',
  ]),
  'void main(){ gl_Position = vec4(0.0); }', '#endif', '#ifdef FRAGMENT',
  ...(!shadow ? ['uniform sampler2D _NoiseTex;', 'uniform sampler2D _MainTex;', 'out vec4 outColor;', 'void main(){ outColor = texture(_MainTex, vec2(0.0)); }'] : ['void main(){}']),
  '#endif',
].join('\n')
const glitchPass = (shadow: boolean) => ({
  pass: shadow ? 'shadow' : 'forward', stateName: shadow ? 'ShadowCaster' : 'Forward', subShaderIndex: 0,
  passIndex: shadow ? 1 : 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
  blobIndex: shadow ? 3 : 1, parameterBlobIndex: shadow ? 2 : 0,
  parameterRecordSha256: shadow ? '89cb58753bbfac486d044fc253235f533f9634393bd30204de277063619427ee' : '42c347357ddcd6b9365ba7a523bf05e2b4aa17076093ba172e7ac7ad313f1450',
  keywordIndices: [], keywordNames: [],
  programHash: shadow ? 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5' : '38d23aef9f77ca1a78dfd0efb262bca0bccdafaa1b72b2da397d03bb8c8baf71',
  programDataSha256: shadow ? 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5' : '38d23aef9f77ca1a78dfd0efb262bca0bccdafaa1b72b2da397d03bb8c8baf71',
  programDataLength: shadow ? 4379 : 5868,
  programRecordSha256: shadow ? '9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4' : '3bc739b0ac1bdfebdef0f55320721c38555e9e0e263a844a90287b32c3656dbc',
  glsl: glitchGlsl(shadow),
  requiredAttributes: shadow ? ['POSITION', 'NORMAL'] : ['POSITION', 'TEXCOORD_0'],
  requiredUniforms: shadow
    ? ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_ObjectToWorld']
    : ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', '_Time', '_Cull_Mode', '_Speed_Value', '_Shaking', '_Jitter', '_Glitch_value', '_x', '_y', '_NoiseTex', '_MainTex'],
  renderState: shadow
    ? { zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true }
    : { zWrite: 0, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
})
function glitchMetadata() {
  return {
    adapterId: 'dsfx-glitch-tex', sourceShaderReference: structuredClone(glitchReference), alphaMode: 'BLEND', depthWrite: false, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'back', polygonOffsetFactor: 0, polygonOffsetUnits: 0,
    blend: { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 },
    glitchShaderExtraction: {
      schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: 'da4f6c1689e70742a01d91febca067eb0492a4121ad2fc63476323a6459f7b3e',
      sourceReference: structuredClone(glitchReference), compressedBlobSha256: 'b8f29baf75b913a1231adf3c24f8a24b179deaee5bbc03a0e145984c691a15a0',
      shaderName: 'DSFX/FX_SHADER_Glitch_Tex', shaderKeywordNames: ['STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW'],
      requiredProperties: ['_MainTex', '_x', '_y', '_Speed_Value', '_NoiseTex', '_Shaking', '_Glitch_value', '_Jitter', '_Cull_Mode'], requiredTextureProperties: ['_MainTex', '_NoiseTex'],
      passes: { forward: glitchPass(false), shadow: glitchPass(true) },
    },
    glitchMaterialProperties: {
      floats: { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 }, ints: {}, colors: {}, keywords: [],
      textures: [
        { name: '_MainTex', texture: { file: 'CAB-7311d896d3a4d721cb5b05dd266e48cc', pathId: '0' }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { name: '_NoiseTex', texture: { file: glitchNoiseReference.serializedFile, pathId: glitchNoiseReference.objectId }, textureReference: structuredClone(glitchNoiseReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      ],
      resolvedTextures: [{ property: '_NoiseTex', name: 'FX_TEX_Noise_16', width: 256, height: 256, sourceReference: structuredClone(glitchNoiseReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }],
    },
    glitchTextures: { mainTex: { default: 'unity-white' }, noiseTex: { index: 0 } },
    glitchShadowPass: glitchPass(true),
  }
}

function glitchMesh() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
  const base = new THREE.MeshBasicMaterial()
  const object = new THREE.Mesh(geometry, base)
  ;(base.userData as any).chibiGlitchTextures = { noiseTex: new THREE.Texture() }
  return { object, base }
}

test('creates exact Glitch_Tex Forward RawShaderMaterial with explicit Unity white MainTex and source noise texture', () => {
  const fixture = glitchMesh()
  const passes = createDsfxGlitchTexPass(fixture.object, fixture.base, glitchMetadata())!
  assert.ok(passes.forward instanceof THREE.RawShaderMaterial)
  assert.equal(passes.forward.transparent, true)
  assert.equal(passes.forward.depthWrite, false)
  assert.equal(passes.forward.depthTest, true)
  assert.equal(passes.forward.side, THREE.FrontSide)
  assert.equal(((passes.forward.uniforms._MainTex.value as THREE.Texture).image as any).width, 1)
  assert.equal(((passes.forward.uniforms._MainTex.value as THREE.Texture).image as any).data[0], 255)
  assert.equal(passes.forward.uniforms._NoiseTex.value, (fixture.base.userData as any).chibiGlitchTextures.noiseTex)
  assert.equal(passes.nonColorPasses.shadow.programHash, 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5')
})

test('updates Glitch_Tex _Time.y from monotonic elapsed seconds and fails closed on tamper or reversal', () => {
  const fixture = glitchMesh()
  const metadata = glitchMetadata() as any
  const passes = createDsfxGlitchTexPass(fixture.object, fixture.base, metadata)!
  const camera = new THREE.PerspectiveCamera()
  updateDsfxGlitchTexUniforms(passes.forward, fixture.object, camera, 1.25)
  assert.equal(passes.forward.uniforms._Time.value.y, 1.25)
  assert.throws(() => updateDsfxGlitchTexUniforms(passes.forward, fixture.object, camera, 1.24), /not monotonic/)
  const tampered = glitchMetadata() as any
  tampered.glitchShaderExtraction.passes.forward.programHash = '0'.repeat(64)
  const tamperedFixture = glitchMesh()
  assert.throws(() => createDsfxGlitchTexPass(tamperedFixture.object, tamperedFixture.base, tampered), /incomplete Forward source pass metadata/)
  const missingNoise = glitchMetadata() as any
  const noNoise = glitchMesh(); delete noNoise.base.userData.chibiGlitchTextures.noiseTex
  assert.throws(() => createDsfxGlitchTexPass(noNoise.object, noNoise.base, missingNoise), /texture dependencies are missing/)
})

const matcapShaderReference = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-2917564576425350283',
}
const matcapMaterialReference = {
  bundleSha256: 'd595ec49e21a44b8a9d1fb280f5e9ea00fedcda560ffc242e792b4fcd175d748',
  serializedFile: 'CAB-ea179b2d4143f9bef81bc7cac07dcd93', objectId: '-5136731906767245831',
}
const matcapMainTextureReference = {
  bundleSha256: 'c0902532467f62315531c05d9e7047e6265b5021ac982cf06cdd87ecb2ffd4b4',
  serializedFile: 'CAB-22cae0b66f2ef2c9cc2627354aa6e59d', objectId: '-1931283808872943791',
}
const matcapTextureReference = {
  bundleSha256: '1e293d91261dd2af2b91657dfe0e2e0512c48e246ac43ac90d99159975f5b1a7',
  serializedFile: 'CAB-7405438e0c71de1c2ead1707d796c2fc', objectId: '3221402221456861287',
}
const matcapShaderBlob = '3da48932a17f98d5de6fc428f1ba992e824152b12be7e30a169cae5de3c1ba9d'
const matcapShaderFingerprint = '99e3d6e9cccc359cdf91cd2e7253b62b1929a522326d1291a7ae43d944e468dc'
const matcapInertFloats = {
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
const matcapInertColors = {
  _BaseColor: { r: 1, g: 1, b: 1, a: 1 },
  _Color: { r: 1, g: 1, b: 1, a: 1 },
  _EmissionColor: { r: 0, g: 0, b: 0, a: 1 },
  _SpecColor: { r: 0.5849056243896484, g: 0.5849056243896484, b: 0.5849056243896484, a: 0.032999999821186066 },
} as const
const matcapPassSpecs = {
  forward: { variant: 'static', passIndex: 0, blobIndex: 2, parameterBlobIndex: 0, parameterRecordSha256: '1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150', programHash: 'b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e', programRecordSha256: 'a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e', programDataLength: 5178 },
  forwardInstanced: { variant: 'instanced', passIndex: 0, blobIndex: 3, parameterBlobIndex: 1, parameterRecordSha256: '1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175', programHash: '38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4', programRecordSha256: 'fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f', programDataLength: 4726 },
  shadow: { variant: 'static', passIndex: 1, blobIndex: 6, parameterBlobIndex: 4, parameterRecordSha256: '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17', programHash: 'd33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67', programRecordSha256: '34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3', programDataLength: 4923 },
  shadowInstanced: { variant: 'instanced', passIndex: 1, blobIndex: 7, parameterBlobIndex: 5, parameterRecordSha256: '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51', programHash: '8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7', programRecordSha256: 'd0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3', programDataLength: 4599 },
} as const
const matcapForwardAttributes = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0']
const matcapShadowAttributes = ['POSITION', 'NORMAL', 'COLOR_0']
const matcapForwardUniforms = ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', 'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST', '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex']
const matcapForwardInstancedUniforms = ['hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_WorldToObjectArray', 'unity_Builtins0Array', 'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST', '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex']
const matcapShadowUniforms = ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject']
const matcapShadowInstancedUniforms = ['hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_WorldToObjectArray', 'unity_Builtins0Array']
const matcapGlsl = (shadow: boolean, instanced: boolean) => {
  const objectToWorld = instanced ? 'hlslcc_mtx4x4unity_ObjectToWorldArray' : 'hlslcc_mtx4x4unity_ObjectToWorld'
  const worldToObject = instanced ? 'hlslcc_mtx4x4unity_WorldToObjectArray' : 'hlslcc_mtx4x4unity_WorldToObject'
  return [
  '#version 300 es', '#ifdef VERTEX',
  ...(shadow ? ['in highp vec4 in_POSITION0;', 'in highp vec3 in_NORMAL0;', 'in highp vec4 in_COLOR0;'] : [
    'in highp vec4 in_POSITION0;', 'in highp vec3 in_NORMAL0;', 'in highp vec2 in_TEXCOORD0;', 'in highp vec4 in_COLOR0;',
  ]),
  ...(shadow ? [
    'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;', ...(instanced ? ['uniform int unity_BaseInstanceID;', 'uniform vec4 unity_Builtins0Array;'] : []), 'uniform vec4 _ShadowBias;', 'uniform vec3 _LightDirection;',
    'uniform vec4 _ShadowCoordModifier;', `uniform mat4 ${objectToWorld};`, `uniform mat4 ${worldToObject};`,
  ] : [
    'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;', ...(instanced ? ['uniform int unity_BaseInstanceID;', 'uniform vec4 unity_Builtins0Array;'] : []), `uniform mat4 ${objectToWorld};`, `uniform mat4 ${worldToObject};`,
    'uniform mat4 hlslcc_mtx4x4unity_MatrixV;', 'uniform vec4 _Main_Color;', 'uniform vec4 _Main_Tex_ST;',
    'uniform float _ZWrite_Mode;', 'uniform float _Cull_Mode;', 'uniform sampler2D _Matcap_Tex;', 'uniform sampler2D _Main_Tex;',
    'out highp vec4 vs_TEXCOORD3;', 'out highp vec4 vs_COLOR0;', 'out highp vec4 vs_TEXCOORD4;',
  ]),
  shadow ? `void main(){ gl_Position = hlslcc_mtx4x4unity_MatrixVP * ${objectToWorld} * in_POSITION0; }`
    : `void main(){ vs_TEXCOORD3 = vec4(in_TEXCOORD0.xy, 0.0, 0.0); vs_COLOR0 = in_COLOR0; vs_TEXCOORD4 = vec4(in_NORMAL0, 1.0); gl_Position = hlslcc_mtx4x4unity_MatrixVP * ${objectToWorld} * in_POSITION0; }`,
  '#endif', '#ifdef FRAGMENT',
  ...(shadow ? ['void main(){}'] : [
    'uniform mat4 hlslcc_mtx4x4unity_MatrixV;', 'uniform vec4 _Main_Color;', 'uniform vec4 _Main_Tex_ST;', 'uniform float _ZWrite_Mode;', 'uniform float _Cull_Mode;',
    'uniform sampler2D _Matcap_Tex;', 'uniform sampler2D _Main_Tex;', 'in highp vec4 vs_TEXCOORD3;', 'in highp vec4 vs_COLOR0;', 'in highp vec4 vs_TEXCOORD4;',
    'layout(location=0) out mediump vec4 SV_Target0;',
    'void main(){ vec4 main = texture(_Main_Tex, vs_TEXCOORD3.xy); vec4 matcap = texture(_Matcap_Tex, vs_TEXCOORD4.xy); SV_Target0 = vec4(main.rgb * _Main_Color.rgb * vs_COLOR0.rgb * matcap.rgb, matcap.a * vs_COLOR0.a * _Main_Color.a); }',
  ]),
  '#endif',
  ].join('\n')
}
const matcapPass = (name: keyof typeof matcapPassSpecs) => {
  const spec = matcapPassSpecs[name]
  const shadow = name.startsWith('shadow')
  const forward = name.startsWith('forward')
  const attributes = forward ? matcapForwardAttributes : matcapShadowAttributes
  const uniforms = forward
    ? spec.variant === 'instanced' ? matcapForwardInstancedUniforms : matcapForwardUniforms
    : spec.variant === 'instanced' ? matcapShadowInstancedUniforms : matcapShadowUniforms
  return {
    pass: shadow ? 'shadow' : 'forward', variant: spec.variant, stateName: shadow ? 'ShadowCaster' : 'Forward', subShaderIndex: 0,
    passIndex: spec.passIndex, stage: 'vertex', platform: 9, gpuProgramType: 4, blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex,
    parameterRecordSha256: spec.parameterRecordSha256, keywordIndices: spec.variant === 'instanced' ? [5] : [], keywordNames: spec.variant === 'instanced' ? ['INSTANCING_ON'] : [],
    programHash: spec.programHash, programDataSha256: spec.programHash, programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256,
    glsl: matcapGlsl(shadow, spec.variant === 'instanced'), requiredAttributes: attributes, requiredUniforms: uniforms,
    renderState: shadow
      ? { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true }
      : { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
  }
}
function matcapMetadata() {
  const extraction = {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: matcapShaderFingerprint,
    sourceReference: structuredClone(matcapShaderReference), compressedBlobSha256: matcapShaderBlob, shaderName: 'DSFX/FX_SHADER_Matcap',
    shaderKeywordNames: ['STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW'],
    requiredProperties: ['_Main_Color', '_Main_Tex', '_Matcap_Tex', '_ZWrite_Mode', '_Cull_Mode', '_texcoord'], requiredTextureProperties: ['_Main_Tex', '_Matcap_Tex'],
    passes: { forward: matcapPass('forward'), forwardInstanced: matcapPass('forwardInstanced'), shadow: matcapPass('shadow'), shadowInstanced: matcapPass('shadowInstanced') },
  }
  return {
    adapterId: 'dsfx-matcap', sourceShaderReference: structuredClone(matcapShaderReference), sourceMaterialReference: structuredClone(matcapMaterialReference),
    renderPass: 'forward', textureProperty: '_Main_Tex', unlit: false, drawLayer: 'transparent', alphaMode: 'BLEND', depthWrite: true, depthTest: true,
    depthFunction: 'less-equal', cullMode: 'back', polygonOffsetFactor: 0, polygonOffsetUnits: 0,
    blend: { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 },
    matcapShaderExtraction: extraction,
    matcapMaterialProperties: {
      floats: { ...matcapInertFloats, _ZWrite_Mode: 1, _Cull_Mode: 2 }, ints: {},
      colors: { ...structuredClone(matcapInertColors), _Main_Color: { r: 0.30188679695129395, g: 0.055614907294511795, b: 0, a: 0.772549033164978 } }, keywords: [],
      textures: [
        { name: '_Main_Tex', texture: { file: matcapMainTextureReference.serializedFile, pathId: matcapMainTextureReference.objectId }, textureReference: structuredClone(matcapMainTextureReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { name: '_Matcap_Tex', texture: { file: matcapTextureReference.serializedFile, pathId: matcapTextureReference.objectId }, textureReference: structuredClone(matcapTextureReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { name: '_texcoord', texture: { file: 'CAB-default', pathId: '0' }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      ],
      resolvedTextures: [
        { property: '_Main_Tex', width: 64, height: 64, sourceReference: structuredClone(matcapMainTextureReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { property: '_Matcap_Tex', width: 64, height: 64, sourceReference: structuredClone(matcapTextureReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
      ],
    },
    matcapTextures: { mainTex: { index: 0 }, matcapTex: { index: 1 } }, matcapShadowPass: extraction.passes.shadow,
  }
}
function matcapMesh() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 4))
  const base = new THREE.MeshBasicMaterial()
  const object = new THREE.Mesh(geometry, base)
  ;(base.userData as any).chibiMatcapTextures = { mainTex: new THREE.Texture(), matcapTex: new THREE.Texture() }
  return { object, base }
}

test('creates exact DSFX Matcap Forward RawShaderMaterial and updates view-space MatrixV', () => {
  const fixture = matcapMesh()
  const passes = createDsfxMatcapPass(fixture.object, fixture.base, matcapMetadata())!
  assert.ok(passes.forward instanceof THREE.RawShaderMaterial)
  assert.equal(passes.forward.glslVersion, THREE.GLSL3)
  assert.equal(passes.forward.side, THREE.FrontSide)
  assert.equal(passes.forward.transparent, true)
  assert.equal(passes.forward.depthWrite, true)
  assert.equal(passes.forward.depthTest, true)
  assert.equal(passes.forward.depthFunc, THREE.LessEqualDepth)
  assert.equal(passes.forward.blendSrc, THREE.SrcAlphaFactor)
  assert.equal(passes.forward.blendDst, THREE.OneMinusSrcAlphaFactor)
  assert.equal(passes.forward.uniforms._Main_Tex.value, (fixture.base.userData as any).chibiMatcapTextures.mainTex)
  assert.equal(passes.forward.uniforms._Matcap_Tex.value, (fixture.base.userData as any).chibiMatcapTextures.matcapTex)
  assert.equal((passes.forward.uniforms as any)._Metallic, undefined)
  assert.equal(Object.keys((passes.forward.userData as any).chibi.matcapMaterialProperties.floats).length, 28)
  assert.equal(Object.keys((passes.forward.userData as any).chibi.matcapMaterialProperties.colors).length, 5)
  assert.deepEqual(Array.from((passes.forward.uniforms._Main_Color.value as THREE.Vector4).toArray()), [0.30188679695129395, 0.055614907294511795, 0, 0.772549033164978])
  assert.match(passes.forward.fragmentShader, /texture\(_Matcap_Tex/)
  assert.match(passes.forward.fragmentShader, /hlslcc_mtx4x4unity_MatrixV/)
  assert.equal(passes.forwardGeometry.getAttribute('in_NORMAL0').itemSize, 3)
  assert.equal(passes.forwardGeometry.getAttribute('in_COLOR0').itemSize, 4)
  assert.equal(passes.nonColorPasses.shadowInstanced.programHash, matcapPassSpecs.shadowInstanced.programHash)
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(1, 2, 3); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
  fixture.object.updateMatrixWorld(true)
  updateDsfxMatcapUniforms(passes.forward, fixture.object, camera)
  const matrixV = Array.from(passes.forward.uniforms.hlslcc_mtx4x4unity_MatrixV.value as Float32Array)
  camera.matrixWorldInverse.elements.forEach((value, index) => assert.ok(Math.abs(matrixV[index] - value) < 1e-6))
})

test('fails closed on DSFX Matcap identity, source, blend, texture, and geometry tampering', () => {
  const hashTampered = matcapMetadata() as any
  hashTampered.matcapShaderExtraction.passes.forward.programHash = '0'.repeat(64)
  let fixture = matcapMesh()
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, hashTampered), /incomplete or tampered Forward source pass metadata/)
  const sourceTampered = matcapMetadata() as any
  sourceTampered.sourceMaterialReference.objectId = '1'
  fixture = matcapMesh()
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, sourceTampered), /unverified source identity/)
  const inertFloatTampered = matcapMetadata() as any
  inertFloatTampered.matcapMaterialProperties.floats._Metallic = 0
  fixture = matcapMesh()
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, inertFloatTampered), /unverified source material state/)
  const inertColorTampered = matcapMetadata() as any
  inertColorTampered.matcapMaterialProperties.colors._SpecColor.r = 1
  fixture = matcapMesh()
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, inertColorTampered), /unverified source material state/)
  const inertGlslTampered = matcapMetadata() as any
  inertGlslTampered.matcapShaderExtraction.passes.forward.glsl += '\nuniform float _Metallic;\n'
  fixture = matcapMesh()
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, inertGlslTampered), /GLSL declares or consumes inert property _Metallic/)
  const glslTampered = matcapMetadata() as any
  glslTampered.matcapShaderExtraction.passes.forward.glsl = glslTampered.matcapShaderExtraction.passes.forward.glsl.replace(/texture\(_Matcap_Tex/g, 'sample(_Matcap_Tex')
  fixture = matcapMesh()
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, glslTampered), /view-space matcap instruction path/)
  const stateTampered = matcapMetadata() as any
  stateTampered.blend.destination = 1
  fixture = matcapMesh()
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, stateTampered), /unverified transparent blend state/)
  const missingTexture = matcapMetadata() as any
  fixture = matcapMesh(); delete fixture.base.userData.chibiMatcapTextures.matcapTex
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, missingTexture), /texture dependencies are missing/)
  fixture = matcapMesh(); fixture.object.geometry.deleteAttribute('color')
  assert.throws(() => createDsfxMatcapPass(fixture.object, fixture.base, matcapMetadata()), /missing COLOR_0/)
})

const additiveEvidencePath = 'C:/Users/hatua/AppData/Local/Temp/stratonas-additive-extraction-20260917/additive.extraction.report.json'
const additiveEvidenceAvailable = existsSync(additiveEvidencePath)

function additiveFixture() {
  const report = JSON.parse(readFileSync(additiveEvidencePath, 'utf8'))
  const shader = report.shader
  const extraction = shader.extraction
  const selectedPrograms = extraction.selectedGles3Programs.map((program: any) => structuredClone(program))
  const extractionMetadata = {
    schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion, unityVersion: extraction.unityVersion,
    fingerprint: shader.fingerprint, compressedBlobSha256: extraction.compressedBlobSha256,
    shader: {
      name: shader.name,
      sourceReference: structuredClone(shader.sourceReference),
      keywordNames: ['STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW'],
    },
    programs: selectedPrograms, gles3Programs: structuredClone(selectedPrograms),
    bindings: extraction.selectedPassVariants.map((variant: any) => structuredClone(variant.binding)),
  }
  const textureReference = { bundleSha256: 'a'.repeat(64), serializedFile: 'CAB-additive-texture', objectId: '9' }
  const materialProperties: any = {
    floats: { _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: 2, _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: 4 },
    ints: {}, colors: { _Color: { r: 0.25, g: 0.5, b: 0.75, a: 0.8 } }, keywords: [],
    textures: [{ name: '_Texture', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId }, textureReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }],
    resolvedTextures: [{ property: '_Texture', width: 64, height: 64, sourceReference: textureReference }],
  }
  const material = new THREE.MeshBasicMaterial({ map: new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1) })
  material.map!.needsUpdate = true
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2))
  geometry.setAttribute('uv1', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 4))
  const object = new THREE.Mesh(geometry, material)
  return {
    object, material, metadata: {
      adapterId: 'dsfx-static', sourceShaderReference: structuredClone(shader.sourceReference),
      renderPass: null, textureProperty: '_Texture', unlit: true, drawLayer: 'transparent', alphaMode: 'BLEND',
      depthWrite: false, depthTest: false, depthFunction: 'disabled', cullMode: 'off', doubleSided: true,
      polygonOffsetFactor: 0, polygonOffsetUnits: 0,
      blend: { source: 1, destination: 1, sourceAlpha: 1, destinationAlpha: 1, operation: 0, operationAlpha: 0 },
      dsfxShaderExtraction: extractionMetadata, dsfxMaterialProperties: materialProperties, dsfxTextures: { texture: { index: 0 } },
    },
  }
}

test('creates the exact Additive_0 non-instanced Forward RawShaderMaterial from extraction evidence', { skip: !additiveEvidenceAvailable }, () => {
  const fixture = additiveFixture()
  const passes = createDsfxAdditivePass(fixture.object, fixture.material, fixture.metadata as any)
  assert.ok(passes)
  assert.ok(passes.forward instanceof THREE.RawShaderMaterial)
  assert.equal(passes.forward.side, THREE.DoubleSide)
  assert.equal(passes.forward.depthWrite, false)
  assert.equal(passes.forward.depthTest, false)
  assert.equal(passes.forward.blendSrc, THREE.OneFactor)
  assert.equal(passes.forward.blendDst, THREE.OneFactor)
  assert.equal(passes.forward.userData.chibi.programHash, '3385102c84a54b6579e34b8c667635094f353a9802770da2f58e91fbbbc60026')
  assert.ok(passes.forward.userData.chibi.sourceGlsl.includes('u_xlat16_0 = texture(_Texture, u_xlat0.xy);'))
  assert.ok(passes.forwardGeometry.getAttribute('in_POSITION0'))
  assert.ok(passes.forwardGeometry.getAttribute('in_TEXCOORD1'))
  assert.ok(passes.forwardGeometry.getAttribute('in_COLOR0'))
})

test('fails closed on Additive_0 extraction, blend, and geometry tampering', { skip: !additiveEvidenceAvailable }, () => {
  let fixture = additiveFixture()
  const extractionTampered = structuredClone(fixture.metadata) as any
  extractionTampered.dsfxShaderExtraction.gles3Programs[0].programHash = '0'.repeat(64)
  assert.throws(() => createDsfxAdditivePass(fixture.object, fixture.material, extractionTampered), /tampered GLES3 program record/)
  fixture = additiveFixture()
  const stateTampered = structuredClone(fixture.metadata) as any
  stateTampered.blend.destination = 10
  assert.throws(() => createDsfxAdditivePass(fixture.object, fixture.material, stateTampered), /unverified additive blend state/)
  fixture = additiveFixture()
  fixture.object.geometry.deleteAttribute('uv1')
  assert.throws(() => createDsfxAdditivePass(fixture.object, fixture.material, fixture.metadata as any), /missing TEXCOORD_1/)
})

const alphaBlendAddSourceShaderReference = {
  bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
  serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '3898777625326355543',
}

function alphaBlendAddExtractionFixture() {
  const programs = DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS.map(expected => {
    const source = expected.blobIndex === 2 ? DSFX_ALPHA_BLEND_ADD_FORWARD_GLSL : [
      '#ifdef VERTEX', '#version 300 es', ...expected.programAttributes.map(attribute => `in vec4 ${attribute};`),
      ...expected.requiredUniforms.map(uniform => `uniform float ${uniform};`), '#endif', '#ifdef FRAGMENT',
      '#version 300 es', 'void main() {}', '#endif',
    ].join('\n').padEnd(expected.programDataLength, ' ')
    return {
      kind: 'program', blobIndex: expected.blobIndex, platform: 9, gpuProgramType: 4,
      platformName: expected.platformName, gpuProgramTypeName: expected.gpuProgramTypeName,
      version: expected.version, offset: expected.offset, size: expected.size, segment: expected.segment, sourceMap: expected.sourceMap,
      programHash: expected.programHash, programDataSha256: expected.programHash,
      programDataLength: expected.programDataLength, recordSha256: expected.programRecordSha256,
      keywords: [...expected.keywordNames], attributes: [...expected.programAttributes], uniforms: [...expected.requiredUniforms],
      glsl: source, sourceReference: structuredClone(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE),
    }
  })
  return {
    schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: DSFX_ALPHA_BLEND_ADD_FINGERPRINT,
    compressedBlobSha256: DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256,
    shader: { name: DSFX_ALPHA_BLEND_ADD_SHADER_NAME, sourceReference: structuredClone(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE), keywordNames: [...DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS] },
    programs: structuredClone(programs), gles3Programs: structuredClone(programs),
    bindings: DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS.map(expected => ({
      subShaderIndex: 0, passIndex: expected.passIndex, passName: '', stateName: expected.stateName, stage: 'vertex',
      playerGroupIndex: expected.playerGroupIndex, playerIndex: expected.playerIndex, subProgramIndex: expected.subProgramIndex,
      parameterBlobIndex: expected.parameterBlobIndex, gpuProgramTypeName: expected.gpuProgramTypeName,
      shaderRequirements: expected.shaderRequirements, platform: 9, gpuProgramType: 4,
      blobIndex: expected.blobIndex, keywordIndices: [...expected.keywordIndices], keywordNames: [...expected.keywordNames],
      programHash: expected.programHash, gles3ProgramHash: expected.programHash,
      programRecordSha256: expected.programRecordSha256, parameterRecordSha256: expected.parameterRecordSha256,
      sourceReference: structuredClone(DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE),
    })),
  }
}

test('maps the exact AlphaBlend_Add static-default variant', () => {
  const material = new THREE.MeshBasicMaterial()
  applyChibiProfileMaterialState(material, {
    ...metadata({ source: 1, destination: 10, sourceAlpha: 1, destinationAlpha: 10 }),
    sourceShaderReference: alphaBlendAddSourceShaderReference,
    dsfxRenderStateVariant: 'static-default',
  })
  assert.equal(material.blendSrc, THREE.OneFactor)
  assert.equal(material.blendDst, THREE.OneMinusSrcAlphaFactor)
  assert.equal(material.blendSrcAlpha, THREE.OneFactor)
  assert.equal(material.blendDstAlpha, THREE.OneMinusSrcAlphaFactor)
  assert.equal(material.depthWrite, false)
  assert.equal(material.depthTest, false)
  assert.equal(material.side, THREE.DoubleSide)
})

function alphaBlendAddFixture(wakamoWhiteDefault = false) {
  const extraction = alphaBlendAddExtractionFixture()
  const textureReference = {
    bundleSha256: 'efe507bbc0cce8842c792ea091e442009c1914e827f496cf8fb90a052455d85f',
    serializedFile: 'CAB-5cb129b0d3e8597cc11ba43385244c60', objectId: '6977316844502959008',
  }
  const materialProperties: {
    floats: Record<string, number>
    ints: Record<string, number>
    colors: Record<string, { r: number; g: number; b: number; a: number }>
    keywords: string[]
    textures: Array<{
      name: string
      texture: { file: string; pathId: string } | null
      textureReference: typeof textureReference | null
      scale: { x: number; y: number }
      offset: { x: number; y: number }
    }>
    resolvedTextures: Array<{
      property: string
      width?: number
      height?: number
      sourceReference?: typeof textureReference
    }>
  } = {
    floats: {
      _Multiply: 1, _RGBRGBA: 0, _Main_Texture_No: 0, _Custom_Data_Offset_Use: 0,
      _ZWrite_Mode: 0, _Cull_Mode: 0, _ZTest_Mode: 4, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
    },
    ints: {},
    colors: { _Color: { r: 5.992156982421875, g: 5.992156982421875, b: 5.992156982421875, a: 1 } },
    keywords: [],
    textures: [{
      name: '_Texture',
      texture: { file: textureReference.serializedFile, pathId: textureReference.objectId },
      textureReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
    }],
    resolvedTextures: [{ property: '_Texture', width: 64, height: 64, sourceReference: textureReference }],
  }
  if (wakamoWhiteDefault) {
    materialProperties.floats = {
      _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
      _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
      _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
      _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
      _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
      _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
    }
    materialProperties.colors = {
      _Color: { r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 },
      _EmissionColor: { r: 0, g: 0, b: 0, a: 0 },
      _SpecColor: { r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 },
    }
    materialProperties.textures = [{
      name: '_Texture', texture: { file: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6', pathId: '0' }, textureReference: null,
      scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
    }]
    materialProperties.resolvedTextures = []
  }
  const material = new THREE.MeshBasicMaterial({ map: new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1) })
  material.map!.needsUpdate = true
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2))
  if (!wakamoWhiteDefault) geometry.setAttribute('uv1', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 4))
  const object = new THREE.Mesh(geometry, material)
  return {
    object, material, metadata: {
      adapterId: 'dsfx-static', sourceShaderReference: structuredClone(extraction.shader.sourceReference),
      ...(wakamoWhiteDefault ? { sourceMaterialReference: {
        bundleSha256: '46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816',
        serializedFile: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6', objectId: '1142847250617954324',
      } } : {}),
      renderPass: null, textureProperty: '_Texture', unlit: true, drawLayer: 'transparent', alphaMode: 'BLEND',
      depthWrite: false, depthTest: wakamoWhiteDefault, depthFunction: wakamoWhiteDefault ? 'less-equal' : 'disabled',
      cullMode: wakamoWhiteDefault ? 'back' : 'off', doubleSided: !wakamoWhiteDefault,
      polygonOffsetFactor: 0, polygonOffsetUnits: 0,
      blend: { source: 1, destination: 10, sourceAlpha: 1, destinationAlpha: 10, operation: 0, operationAlpha: 0 },
      dsfxRenderStateVariant: wakamoWhiteDefault ? 'depth-tested-back-cull' : 'static-default',
      ...(wakamoWhiteDefault ? { dsfxMaterialVariant: 'wakamo-eye-white-default' } : {}),
      dsfxShaderExtraction: structuredClone(extraction), dsfxMaterialProperties: materialProperties,
      dsfxTextures: wakamoWhiteDefault ? { texture: { default: 'unity-white' } } : { texture: { index: 0 } },
    },
  }
}

test('creates the exact AlphaBlend_Add non-instanced Forward RawShaderMaterial from extraction evidence', () => {
  const fixture = alphaBlendAddFixture()
  const passes = createDsfxAlphaBlendAddPass(fixture.object, fixture.material, fixture.metadata as any)
  assert.ok(passes)
  assert.ok(passes.forward instanceof THREE.RawShaderMaterial)
  assert.equal(passes.forward.side, THREE.DoubleSide)
  assert.equal(passes.forward.depthWrite, false)
  assert.equal(passes.forward.depthTest, false)
  assert.equal(passes.forward.blendSrc, THREE.OneFactor)
  assert.equal(passes.forward.blendDst, THREE.OneMinusSrcAlphaFactor)
  assert.equal(passes.forward.blendSrcAlpha, THREE.OneFactor)
  assert.equal(passes.forward.blendDstAlpha, THREE.OneMinusSrcAlphaFactor)
  assert.equal(passes.forward.uniforms._Multiply.value, 1)
  assert.equal(passes.forward.uniforms._RGBRGBA.value, 0)
  assert.equal(passes.forward.uniforms._Main_Texture_No.value, 0)
  assert.equal(passes.forward.userData.chibi.programHash, 'df04b3b74a13eb8720e8c9e3dbb4adf56c4cad61c60c691a2c59cf7aa59c1659')
  assert.equal(passes.forward.userData.chibi.sourceGlsl, (fixture.metadata as any).dsfxShaderExtraction.gles3Programs[0].glsl)
  assert.ok(passes.forwardGeometry.getAttribute('in_POSITION0'))
  assert.ok(passes.forwardGeometry.getAttribute('in_TEXCOORD1'))
  assert.ok(passes.forwardGeometry.getAttribute('in_COLOR0'))
})

test('binds a runtime white texture only for the exact Wakamo eye null-texture source variant', () => {
  const fixture = alphaBlendAddFixture(true)
  fixture.material.map = null
  const passes = createDsfxAlphaBlendAddPass(fixture.object, fixture.material, fixture.metadata as any)
  assert.ok(passes)
  assert.ok(passes.forward.uniforms._Texture.value instanceof THREE.DataTexture)
  assert.equal(passes.forward.uniforms._Texture.value.name, 'Unity white (Wakamo eye _Texture default)')
  assert.equal(passes.forward.uniforms._Custom_Data_Offset_Use.value, 1)
  assert.equal(passes.forward.uniforms._Main_Texture_No.value, 1)
  assert.equal(passes.forward.side, THREE.FrontSide)
  assert.equal(passes.forward.depthTest, true)
  assert.equal(passes.forward.userData.chibi.dsfxMaterialVariant, 'wakamo-eye-white-default')
  assert.equal(fixture.object.geometry.getAttribute('uv1'), undefined)
  assert.equal(passes.forwardGeometry.getAttribute('in_TEXCOORD1'), undefined)
  assert.deepEqual((passes.forward.defaultAttributeValues as Record<string, number[]>).in_TEXCOORD1, [0, 0])
})

test('keeps Wakamo eyes after face/body using transparent draw order, not the -1 source queue', () => {
  const fixture = alphaBlendAddFixture(true)
  const faceBody = new THREE.Mesh(fixture.object.geometry, fixture.material)
  faceBody.renderOrder = 2
  fixture.object.renderOrder = faceBody.renderOrder
  ;(fixture.metadata as any).sourceQueue = -1
  ;(fixture.metadata as any).renderOrder = 10002 // transparent layer 10000 + exact source renderer rank 2

  const passes = createDsfxAlphaBlendAddPass(fixture.object, fixture.material, fixture.metadata as any)
  assert.ok(passes)
  assert.equal(faceBody.renderOrder, 2)
  assert.equal(fixture.object.renderOrder, 10002)
  assert.ok(fixture.object.renderOrder > faceBody.renderOrder)
})

test('fails closed on Wakamo white-default material identity, gates, texture, transform, and property tampering', () => {
  const cases: [string, (metadata: any) => void][] = [
    ['source reference', metadata => { metadata.sourceMaterialReference.objectId = '1142847250617954325' }],
    ['custom offset gate', metadata => { metadata.dsfxMaterialProperties.floats._Custom_Data_Offset_Use = 0 }],
    ['main texture gate', metadata => { metadata.dsfxMaterialProperties.floats._Main_Texture_No = 0 }],
    ['null texture pointer', metadata => { metadata.dsfxMaterialProperties.textures[0].texture.pathId = '1' }],
    ['texture transform', metadata => { metadata.dsfxMaterialProperties.textures[0].scale.x = 2 }],
    ['stale scalar', metadata => { metadata.dsfxMaterialProperties.floats._BumpScale = 2 }],
    ['color property', metadata => { metadata.dsfxMaterialProperties.colors._Color.r = 6 }],
    ['default binding marker', metadata => { metadata.dsfxTextures.texture.default = 'not-white' }],
    ['inert shader field consumed', metadata => {
      const program = metadata.dsfxShaderExtraction.gles3Programs.find((item: any) => item.blobIndex === 3)
      program.glsl = program.glsl.slice(0, -'_GlossyReflections'.length) + '_GlossyReflections'
    }],
  ]
  for (const [name, mutate] of cases) {
    const fixture = alphaBlendAddFixture(true)
    const metadata = structuredClone(fixture.metadata) as any
    mutate(metadata)
    assert.throws(() => createDsfxAlphaBlendAddPass(fixture.object, fixture.material, metadata), /source material variant|source scalar|Wakamo eye|source property|binding|inert Standard property/ , name)
  }
  const generic = alphaBlendAddFixture()
  ;(generic.metadata as any).dsfxMaterialProperties.floats._Custom_Data_Offset_Use = 1
  ;(generic.metadata as any).dsfxMaterialProperties.floats._Main_Texture_No = 1
  assert.throws(() => createDsfxAlphaBlendAddPass(generic.object, generic.material, generic.metadata as any), /invalid source scalar/)
})

test('fails closed on AlphaBlend_Add extraction, binding, blend, and geometry tampering', () => {
  let fixture = alphaBlendAddFixture()
  const extractionTampered = structuredClone(fixture.metadata) as any
  extractionTampered.dsfxShaderExtraction.gles3Programs[0].glsl = extractionTampered.dsfxShaderExtraction.gles3Programs[0].glsl.replace('in_TEXCOORD1', 'in_TEXCOORD9')
  assert.throws(() => createDsfxAlphaBlendAddPass(fixture.object, fixture.material, extractionTampered), /tampered GLES3 program record|source is missing/)
  fixture = alphaBlendAddFixture()
  const bindingTampered = structuredClone(fixture.metadata) as any
  bindingTampered.dsfxShaderExtraction.bindings.find((binding: any) => binding.platform === 9 && binding.gpuProgramType === 4 && binding.blobIndex === 2).parameterRecordSha256 = '0'.repeat(64)
  assert.throws(() => createDsfxAlphaBlendAddPass(fixture.object, fixture.material, bindingTampered), /tampered binding metadata/)
  fixture = alphaBlendAddFixture()
  const blendTampered = structuredClone(fixture.metadata) as any
  blendTampered.blend.destination = 1
  assert.throws(() => createDsfxAlphaBlendAddPass(fixture.object, fixture.material, blendTampered), /unverified transparent blend state/)
  fixture = alphaBlendAddFixture()
  fixture.object.geometry.deleteAttribute('uv1')
  assert.throws(() => createDsfxAlphaBlendAddPass(fixture.object, fixture.material, fixture.metadata as any), /missing TEXCOORD_1/)
  fixture = alphaBlendAddFixture(true)
  fixture.object.geometry.setAttribute('uv1', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2))
  assert.throws(() => createDsfxAlphaBlendAddPass(fixture.object, fixture.material, fixture.metadata as any), /Wakamo source geometry unexpectedly has TEXCOORD_1/)
})
