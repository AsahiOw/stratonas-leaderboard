"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOAT_PROPERTIES = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE = exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES = exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES = exports.DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS = exports.DSFX_ALPHA_BLEND_ADD_SHADER_NAME = exports.DSFX_ALPHA_BLEND_ADD_FINGERPRINT = exports.DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256 = exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE = exports.DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS = exports.DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS = exports.DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS = exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES = exports.DSFX_ADDITIVE_GLES3_PROGRAMS = exports.DSFX_ADDITIVE_FINGERPRINT = exports.DSFX_ADDITIVE_PROGRAM_BLOB_SHA256 = exports.DSFX_ADDITIVE_SOURCE_REFERENCE = exports.DSFX_ADDITIVE_0_GLES3_PROGRAMS = exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH = exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH = exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH = exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH = exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_SHADOW_PARAMETER_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_FORWARD_PARAMETER_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_RECORD_SHA256 = exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_HASH = exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_HASH = exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_HASH = exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_HASH = exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_UNIFORMS = exports.DSFX_ADDITIVE_0_SHADOW_UNIFORMS = exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_UNIFORMS = exports.DSFX_ADDITIVE_0_FORWARD_UNIFORMS = exports.DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES = exports.DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES = exports.DSFX_ADDITIVE_0_REQUIRED_TEXTURE_PROPERTIES = exports.DSFX_ADDITIVE_0_REQUIRED_PROPERTIES = exports.DSFX_ADDITIVE_0_SHADER_KEYWORDS = exports.DSFX_ADDITIVE_0_SHADER_NAME = exports.DSFX_ADDITIVE_0_FINGERPRINT = exports.DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256 = exports.DSFX_ADDITIVE_0_SOURCE_REFERENCE = exports.CHIBI_SHADER_ADAPTER_VERSION = exports.CHIBI_RENDERING_POLICY_VERSION = exports.CHIBI_RENDERING_PROFILE_VERSION = void 0;
exports.DSFX_MATCAP_FORWARD_UNIFORMS = exports.DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS = exports.DSFX_MATCAP_SHADOW_STATIC_UNIFORMS = exports.DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS = exports.DSFX_MATCAP_FORWARD_STATIC_UNIFORMS = exports.DSFX_MATCAP_SHADOW_ATTRIBUTES = exports.DSFX_MATCAP_FORWARD_ATTRIBUTES = exports.DSFX_MATCAP_INERT_COLOR_PROPERTIES = exports.DSFX_MATCAP_INERT_FLOAT_PROPERTIES = exports.DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES = exports.DSFX_MATCAP_REQUIRED_PROPERTIES = exports.DSFX_MATCAP_SHADER_KEYWORDS = exports.DSFX_MATCAP_SHADER_NAME = exports.DSFX_MATCAP_FINGERPRINT = exports.DSFX_MATCAP_PROGRAM_BLOB_SHA256 = exports.DSFX_MATCAP_MAIN_COLOR = exports.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE = exports.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE = exports.DSFX_MATCAP_MATERIAL_REFERENCE = exports.DSFX_MATCAP_SOURCE_REFERENCE = exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH = exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH = exports.DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256 = exports.DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256 = exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 = exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256 = exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH = exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH = exports.DSFX_GLITCH_TEX_SHADOW_UNIFORMS = exports.DSFX_GLITCH_TEX_FORWARD_UNIFORMS = exports.DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES = exports.DSFX_GLITCH_TEX_FORWARD_ATTRIBUTES = exports.DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES = exports.DSFX_GLITCH_TEX_REQUIRED_PROPERTIES = exports.DSFX_GLITCH_TEX_SHADER_KEYWORDS = exports.DSFX_GLITCH_TEX_SHADER_NAME = exports.DSFX_GLITCH_TEX_FINGERPRINT = exports.DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256 = exports.DSFX_GLITCH_TEX_SOURCE_REFERENCE = exports.DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS = exports.DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS = exports.DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS = exports.DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS = exports.DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS = exports.DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS = exports.DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES = exports.DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLOR_PROPERTIES = void 0;
exports.MX_E_STANDARD_REQUIRED_PROPERTIES = exports.MX_E_STANDARD_SHADER_KEYWORDS = exports.MX_E_STANDARD_SHADER_NAME = exports.MX_E_STANDARD_FINGERPRINT = exports.MX_E_STANDARD_PROGRAM_BLOB_SHA256 = exports.MX_E_STANDARD_SOURCE_REFERENCE = exports.PROJECTMX_WEAPON_REQUIRED_PROPERTIES = exports.PROJECTMX_WEAPON_SHADER_KEYWORDS = exports.PROJECTMX_WEAPON_FINGERPRINT = exports.PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256 = exports.PROJECTMX_WEAPON_SOURCE_REFERENCE = exports.MX_C_TRANSPARENT_ST_REQUIRED_PROPERTIES = exports.MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS = exports.MX_C_TRANSPARENT_ST_DITHER_UNIFORMS = exports.MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS = exports.MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES = exports.MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES = exports.MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256 = exports.MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256 = exports.MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256 = exports.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256 = exports.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256 = exports.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256 = exports.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH = exports.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH = exports.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH = exports.MX_C_TRANSPARENT_ST_FINGERPRINT = exports.MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256 = exports.MX_C_TRANSPARENT_ST_SOURCE_REFERENCE = exports.MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH = exports.MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH = exports.MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256 = exports.MX_UNLIT_OUTLINE_SOURCE_REFERENCE = exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH = exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH = exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH = exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH = exports.DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256 = exports.DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256 = exports.DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256 = exports.DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256 = exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256 = exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256 = exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256 = exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256 = exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH = exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH = exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH = exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH = exports.DSFX_MATCAP_SHADOW_UNIFORMS = void 0;
exports.CHIBI_CUSTOM_SHADER_ADAPTER_RULES = exports.MX_E_STANDARD_META_PARAMETER_SHA256 = exports.MX_E_STANDARD_DEPTH_PARAMETER_SHA256 = exports.MX_E_STANDARD_SHADOW_PARAMETER_SHA256 = exports.MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256 = exports.MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256 = exports.MX_E_STANDARD_META_RECORD_SHA256 = exports.MX_E_STANDARD_DEPTH_RECORD_SHA256 = exports.MX_E_STANDARD_SHADOW_RECORD_SHA256 = exports.MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256 = exports.MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256 = exports.MX_E_STANDARD_META_PROGRAM_HASH = exports.MX_E_STANDARD_DEPTH_PROGRAM_HASH = exports.MX_E_STANDARD_SHADOW_PROGRAM_HASH = exports.MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH = exports.MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH = exports.MX_E_STANDARD_META_UNIFORMS = exports.MX_E_STANDARD_DEPTH_UNIFORMS = exports.MX_E_STANDARD_SHADOW_UNIFORMS = exports.MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS = exports.MX_E_STANDARD_FORWARD_STATIC_UNIFORMS = exports.MX_E_STANDARD_META_ATTRIBUTES = exports.MX_E_STANDARD_DEPTH_ATTRIBUTES = exports.MX_E_STANDARD_SHADOW_ATTRIBUTES = exports.MX_E_STANDARD_FORWARD_ATTRIBUTES = exports.MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES = exports.MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES = void 0;
exports.resolveMouthAtlasGrid = resolveMouthAtlasGrid;
exports.resolveShaderState = resolveShaderState;
exports.buildChibiRenderingProfile = buildChibiRenderingProfile;
exports.sourceObjectKey = sourceObjectKey;
var unity_builtin_1 = require("./unity-builtin");
exports.CHIBI_RENDERING_PROFILE_VERSION = 'chibi-rendering-profile-v9';
/**
 * Renderer-role classification is part of the serialized profile contract.
 * Bump this whenever source evidence or the fail-closed exclusion policy
 * changes so stale profiles cannot silently retain the old scope.
 */
exports.CHIBI_RENDERING_POLICY_VERSION = 'chibi-rendering-policy-v11';
exports.CHIBI_SHADER_ADAPTER_VERSION = 'mx-character-adapters-v9';
var SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE = {
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
    primitiveIndex: 0,
    components: ['Head', 'torso'],
    sourceGap: 0.1780399764,
    sourceUnit: 'Unity mesh units',
    bridgingTriangles: 0,
};
function referenceKey(reference) {
    return reference ? "".concat(reference.bundleSha256.toLowerCase(), ":").concat(reference.serializedFile.toLowerCase(), ":").concat(reference.objectId) : '';
}
function finiteNumber(value) {
    if (typeof value !== 'number' && typeof value !== 'string')
        return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
}
function positiveInteger(value) {
    var number = finiteNumber(value);
    return number !== null && Number.isInteger(number) && number > 0 ? number : null;
}
function colorVector(color) {
    var _a;
    if (!color)
        return null;
    var values = [color.r, color.g, color.b, (_a = color.a) !== null && _a !== void 0 ? _a : 1].map(finiteNumber);
    return values.every(function (value) { return value !== null; }) ? values : null;
}
function propertyValue(material, property) {
    var _a, _b, _c;
    return finiteNumber((_b = (_a = material.floatProperties) === null || _a === void 0 ? void 0 : _a[property]) !== null && _b !== void 0 ? _b : (_c = material.intProperties) === null || _c === void 0 ? void 0 : _c[property]);
}
function shaderDefault(shader, property) {
    var _a;
    var properties = shader === null || shader === void 0 ? void 0 : shader.properties;
    var declaration = (_a = properties === null || properties === void 0 ? void 0 : properties.m_Props) === null || _a === void 0 ? void 0 : _a.find(function (item) { return item.m_Name === property; });
    return finiteNumber(declaration === null || declaration === void 0 ? void 0 : declaration['m_DefValue[0]']);
}
function verifiedEyeMouthShader(shader) {
    if (!(shader === null || shader === void 0 ? void 0 : shader.sourceReference) || !shader.programBlobSha256)
        return false;
    var identities = [shader.name, shader.parsedName].map(normalizedShaderIdentity);
    return identities.some(function (identity) { return /^mx\/c-eyesmouth(?:\/|$)/.test(identity) || /^mxcharactereyesmouth(?:\/|$)/.test(identity); });
}
function mouthTileFitsGrid(tile, columns, rows) {
    return Number.isInteger(tile) && tile >= 0
        && Math.floor(tile / 100) < rows && tile % 100 < columns;
}
/**
 * Resolve a serialized EyeMouth grid without letting a shader default silently
 * reinterpret a material.  Some source materials serialize a narrower grid
 * than the verified shader default; promote only when the linked shader,
 * exact texture reference/dimensions, and every selected source tile agree.
 */
function resolveMouthAtlasGrid(options) {
    var _a, _b, _c;
    var materialColumns = positiveInteger(options.serializedColumns);
    var materialRows = positiveInteger(options.serializedRows);
    var serialized = {
        columns: materialColumns !== null && materialColumns !== void 0 ? materialColumns : 8,
        rows: materialRows !== null && materialRows !== void 0 ? materialRows : 8,
    };
    if (materialColumns === null || materialRows === null)
        return serialized;
    var shaderColumns = positiveInteger(shaderDefault(options.shader, '_MouthTileCols'));
    var shaderRows = positiveInteger(shaderDefault(options.shader, '_MouthTileRows'));
    if (!options.shaderIdentityVerified || shaderColumns === null || shaderRows === null
        || shaderColumns < materialColumns || shaderRows < materialRows
        || (shaderColumns === materialColumns && shaderRows === materialRows))
        return serialized;
    // A larger grid is only meaningful when at least one selected source value
    // actually crosses the serialized grid.  This keeps ordinary 4x4 materials
    // unchanged even when their shader declares a larger fallback grid.
    var selectedFitsSerialized = options.selectedTiles.every(function (tile) { return mouthTileFitsGrid(tile, materialColumns, materialRows); })
        && (options.defaultTile === null || mouthTileFitsGrid(options.defaultTile, materialColumns, materialRows));
    if (selectedFitsSerialized)
        return serialized;
    var resolvedReference = (_a = options.resolvedAtlas) === null || _a === void 0 ? void 0 : _a.sourceReference;
    var width = positiveInteger((_b = options.resolvedAtlas) === null || _b === void 0 ? void 0 : _b.width);
    var height = positiveInteger((_c = options.resolvedAtlas) === null || _c === void 0 ? void 0 : _c.height);
    if (!options.shaderIdentityVerified || !options.atlasTextureReference || !resolvedReference
        || referenceKey(options.atlasTextureReference) !== referenceKey(resolvedReference)
        || width === null || height === null || width % shaderColumns !== 0 || height % shaderRows !== 0)
        return serialized;
    var selectedFitsShader = options.selectedTiles.every(function (tile) { return mouthTileFitsGrid(tile, shaderColumns, shaderRows); });
    var defaultFitsShader = options.defaultTile !== null && mouthTileFitsGrid(options.defaultTile, shaderColumns, shaderRows);
    return selectedFitsShader && defaultFitsShader
        ? { columns: shaderColumns, rows: shaderRows }
        : serialized;
}
function shaderColorDefault(shader, property) {
    var _a, _b;
    var properties = shader === null || shader === void 0 ? void 0 : shader.properties;
    var declaration = (_a = properties === null || properties === void 0 ? void 0 : properties.m_Props) === null || _a === void 0 ? void 0 : _a.find(function (item) { return item.m_Name === property; });
    if (!declaration)
        return null;
    var values = [0, 1, 2, 3].map(function (index) { return finiteNumber(declaration["m_DefValue[".concat(index, "]")]); });
    if (values.slice(0, 3).some(function (value) { return value === null; }))
        return null;
    return [values[0], values[1], values[2], (_b = values[3]) !== null && _b !== void 0 ? _b : 1];
}
function materialColor(material, shader, property) {
    var _a, _b, _c;
    var properties = shader === null || shader === void 0 ? void 0 : shader.properties;
    if (!((_a = properties === null || properties === void 0 ? void 0 : properties.m_Props) === null || _a === void 0 ? void 0 : _a.some(function (item) { return item.m_Name === property; })))
        return null;
    return (_c = colorVector((_b = material.colorProperties) === null || _b === void 0 ? void 0 : _b[property])) !== null && _c !== void 0 ? _c : shaderColorDefault(shader, property);
}
var SIMPLE_UNLIT_SHADER_IDENTITIES = new Set([
    'fx/generalunlit',
    'fx/generalunlittexture',
    'unlit/texture',
    'unlit/texcolorhdr',
]);
// These four BAAD shaders have no effect-specific properties beyond the
// ordinary source state, color, and main texture declarations.  They are
// safe to carry through the FBX2glTF KHR_materials_unlit output.  Keep this
// allowlist property-gated so a future shader revision with mask, outline,
// distortion, or other custom inputs cannot silently become native output.
var SIMPLE_UNLIT_SHADER_PROPERTIES = new Set([
    '_Color', '_MainTex',
    '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha',
    '_ZWrite', '_ZTest', '_Cull', '_ZOffsetFactor', '_ZOffsetUnits',
]);
function normalizedShaderIdentity(value) {
    return typeof value === 'string' ? value.toLowerCase().replaceAll(' ', '').replaceAll('\\', '/') : '';
}
var DSFX_SHADER_SOURCE = {
    bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
    serializedFile: 'CAB-428091522b4007f213bf16532c4528a1',
};
var DSFX_FORWARD_COMMON = {
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
};
var DSFX_SHADOW_COMMON = {
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
};
var dsfxStaticRule = function (identity, objectId, programBlobSha256, propertyNames, blend) { return ({
    id: 'dsfx-static',
    identity: identity,
    programBlobSha256: programBlobSha256,
    sourceReference: __assign(__assign({}, DSFX_SHADER_SOURCE), { objectId: objectId }),
    propertyNames: propertyNames,
    passes: [
        {
            name: 'Forward',
            states: __assign(__assign({}, DSFX_FORWARD_COMMON), { srcBlend: blend.source, destinationBlend: blend.destination, sourceBlendAlpha: blend.source, destinationBlendAlpha: blend.destination }),
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
}); };
/** Exact source identity for DSFX/FX_SHADER_Additive_0. */
exports.DSFX_ADDITIVE_0_SOURCE_REFERENCE = {
    bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
    serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-4115771715742154417',
};
exports.DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256 = '90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808';
exports.DSFX_ADDITIVE_0_FINGERPRINT = 'e4f30af59274e0b917915212c19c6c7e8c47f2da605d04a0eb6649c5d0ff1cfc';
exports.DSFX_ADDITIVE_0_SHADER_NAME = 'DSFX/FX_SHADER_Additive_0';
exports.DSFX_ADDITIVE_0_SHADER_KEYWORDS = [
    'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON',
    'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
];
exports.DSFX_ADDITIVE_0_REQUIRED_PROPERTIES = [
    '_Color', '_Texture', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode',
    '_ZOffsetFactor', '_ZOffsetUnits', '_ZTest_Mode',
];
exports.DSFX_ADDITIVE_0_REQUIRED_TEXTURE_PROPERTIES = ['_Texture'];
exports.DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES = ['POSITION', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0'];
exports.DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'];
exports.DSFX_ADDITIVE_0_FORWARD_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
    'unity_LODFade', 'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
    'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
    'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
    'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
    'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
    'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams', '_Texture_ST', '_Color', '_ZOffsetFactor',
    '_ZOffsetUnits', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_Custom_Data_Offset_Use',
];
exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'unity_Builtins0Array', '_Texture_ST', '_Color',
    '_ZOffsetFactor', '_ZOffsetUnits', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_Custom_Data_Offset_Use',
];
exports.DSFX_ADDITIVE_0_SHADOW_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
    'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', 'unity_LODFade',
    'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
    'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
    'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
    'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
    'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
    'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams',
];
exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection',
    '_ShadowCoordModifier', 'unity_Builtins0Array',
];
exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_HASH = '3385102c84a54b6579e34b8c667635094f353a9802770da2f58e91fbbbc60026';
exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_HASH = 'fa6ec097af34d57cab64d105f411ac41bde7991de417ba1c02413a4ed88baabd';
exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_HASH = 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5';
exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_HASH = 'c398892908c135f4a88395ef710f0c25d6ba2b6da763f8850935134ac325ddc1';
exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_RECORD_SHA256 = 'c3c0a70448fed498fee19ae556974d594a37edf16e1ac47ea2f364dc5b4a8b1d';
exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256 = 'b8877e78e3acacc5e0891dbfb2d43f8db989f6b1614454417e4dd5c9b972e77f';
exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_RECORD_SHA256 = '9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4';
exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256 = '1e7b1e587aa7e0369a0415df992f515cbde6fd63b4db544a0a3e8ea76de8abc0';
exports.DSFX_ADDITIVE_0_FORWARD_PARAMETER_RECORD_SHA256 = '619c2de6aa2781b2363fe443f77609736903c60335e25c5eaa3d2d705c9e0173';
exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256 = '1fe7d3f57ddd22705f4b97fd0c5c86e2c43af931a39f3718047ae65bc4b7fcda';
exports.DSFX_ADDITIVE_0_SHADOW_PARAMETER_RECORD_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17';
exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256 = '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51';
exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH = 4618;
exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH = 4060;
exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH = 4379;
exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH = 3960;
exports.DSFX_ADDITIVE_0_GLES3_PROGRAMS = [
    {
        blobIndex: 2, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 0,
        passIndex: 0, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 2568, size: 4660, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
        keywords: [], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_TEXCOORD4', 'vs_COLOR0'],
        parameterRecordSha256: exports.DSFX_ADDITIVE_0_FORWARD_PARAMETER_RECORD_SHA256, keywordIndices: [], keywordNames: [],
        programHash: exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_HASH, programDataLength: exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH,
        programRecordSha256: exports.DSFX_ADDITIVE_0_FORWARD_PROGRAM_RECORD_SHA256,
        requiredAttributes: exports.DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES, requiredUniforms: exports.DSFX_ADDITIVE_0_FORWARD_UNIFORMS,
    },
    {
        blobIndex: 3, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 1,
        passIndex: 0, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 7228, size: 4120, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
        keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_TEXCOORD4', 'vs_COLOR0'],
        parameterRecordSha256: exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        programHash: exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_HASH, programDataLength: exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
        programRecordSha256: exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256,
        requiredAttributes: exports.DSFX_ADDITIVE_0_FORWARD_ATTRIBUTES, requiredUniforms: exports.DSFX_ADDITIVE_0_FORWARD_INSTANCED_UNIFORMS,
    },
    {
        blobIndex: 6, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 4,
        passIndex: 1, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 13480, size: 4420, segment: 0, sourceMap: 3, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
        keywords: [], programAttributes: ['in_POSITION0', 'in_NORMAL0'],
        parameterRecordSha256: exports.DSFX_ADDITIVE_0_SHADOW_PARAMETER_RECORD_SHA256, keywordIndices: [], keywordNames: [],
        programHash: exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_HASH, programDataLength: exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH,
        programRecordSha256: exports.DSFX_ADDITIVE_0_SHADOW_PROGRAM_RECORD_SHA256,
        requiredAttributes: exports.DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES, requiredUniforms: exports.DSFX_ADDITIVE_0_SHADOW_UNIFORMS,
    },
    {
        blobIndex: 7, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 5,
        passIndex: 1, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 17900, size: 4020, segment: 0, sourceMap: 3, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
        keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_NORMAL0'],
        parameterRecordSha256: exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        programHash: exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_HASH, programDataLength: exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
        programRecordSha256: exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256,
        requiredAttributes: exports.DSFX_ADDITIVE_0_SHADOW_ATTRIBUTES, requiredUniforms: exports.DSFX_ADDITIVE_0_SHADOW_INSTANCED_UNIFORMS,
    },
];
/** Backwards-compatible short aliases for callers that key by shader family. */
exports.DSFX_ADDITIVE_SOURCE_REFERENCE = exports.DSFX_ADDITIVE_0_SOURCE_REFERENCE;
exports.DSFX_ADDITIVE_PROGRAM_BLOB_SHA256 = exports.DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256;
exports.DSFX_ADDITIVE_FINGERPRINT = exports.DSFX_ADDITIVE_0_FINGERPRINT;
exports.DSFX_ADDITIVE_GLES3_PROGRAMS = exports.DSFX_ADDITIVE_0_GLES3_PROGRAMS;
/**
 * The three DSFX programs below are the only shader versions whose static
 * forward pass is currently reproducible by the Viewer.  The rule is keyed by
 * the complete source shader identity and bytecode hash; names alone never
 * select this adapter.
 */
exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES = [
    dsfxStaticRule('dsfx/fx_shader_additive_0', '-4115771715742154417', '90b5288cb90cc49fbe68b9b8dac5f821c125c6954b9a4e64e4d66564f7668808', ['_Color', '_Texture', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZOffsetFactor', '_ZOffsetUnits', '_ZTest_Mode'], { source: 1, destination: 1 }),
    dsfxStaticRule('dsfx/fx_shader_alphablend_add', '3898777625326355543', '44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af', ['_Color', '_Multiply', '_Texture', '_RGBRGBA', '_Main_Texture_No', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_ZOffsetFactor', '_ZOffsetUnits'], { source: 1, destination: 10 }),
    dsfxStaticRule('dsfx/fx_shader_alphablend_0', '-660637482714961986', '65b652e79bbcce530203321da335999c19212fc25807233878f6853813931576', ['_Color', '_Multiply', '_Texture', '_RGBRGBA', '_Main_Texture_No', '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_ZOffsetFactor', '_ZOffsetUnits'], { source: 5, destination: 10 }),
];
/**
 * AlphaBlend_0 has two depth-tested/culling translations in addition to the
 * original static default.  These are the only accepted state variants; the
 * full common blend, queue, layer, and offset state remains fixed below.
 */
exports.DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS = {
    'static-default': exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].renderState,
    'depth-tested-back-cull': __assign(__assign({}, exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].renderState), { depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false }),
    'depth-tested-off-double-sided': __assign(__assign({}, exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2].renderState), { depthTest: true, depthFunction: 'less-equal', cullMode: 'off', doubleSided: true }),
};
/**
 * Additive_0 source materials select the same two depth/cull combinations as
 * the verified AlphaBlend_0 state evidence.  Keep the default literal shape
 * as well for authored records whose state was serialized without material
 * property names; no other depth/cull combinations are accepted.
 */
exports.DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS = {
    'static-default': exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0].renderState,
    'depth-tested-back-cull': __assign(__assign({}, exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0].renderState), { depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false }),
    'depth-tested-off-double-sided': __assign(__assign({}, exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0].renderState), { depthTest: true, depthFunction: 'less-equal', cullMode: 'off', doubleSided: true }),
};
/**
 * The AlphaBlend_0 exception is source-exact and extraction-exact.  These
 * four GLES3 records are the complete Forward/ShadowCaster program set from
 * the verified shader object; keeping their hashes here prevents a profile
 * from accepting a same-name extraction from another shader revision.
 */
exports.DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS = [
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
];
/** Exact source identity and GLES3 interface evidence for AlphaBlend_Add. */
exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE = {
    bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
    serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '3898777625326355543',
};
exports.DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256 = '44e96adec490724b76b094666ab9533d0814f804b2698b336672025b5f9607af';
exports.DSFX_ALPHA_BLEND_ADD_FINGERPRINT = 'bdf731975748307a798ac9b06c9d2bbb0078ac1a80d02c5d790de6e85c8aceb8';
exports.DSFX_ALPHA_BLEND_ADD_SHADER_NAME = 'DSFX/FX_SHADER_AlphaBlend_Add';
exports.DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS = [
    'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON',
    'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
];
exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES = [
    '_Color', '_Multiply', '_Texture', '_RGBRGBA', '_Main_Texture_No',
    '_Custom_Data_Offset_Use', '_ZWrite_Mode', '_Cull_Mode', '_ZTest_Mode', '_ZOffsetFactor', '_ZOffsetUnits',
];
exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES = ['_Texture'];
exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE = {
    bundleSha256: '46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816',
    serializedFile: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6',
    objectId: '1142847250617954324',
};
exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOAT_PROPERTIES = {
    _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
    _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
    _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
    _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
    _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
    _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
};
exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLOR_PROPERTIES = {
    _Color: { r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 },
    _EmissionColor: { r: 0, g: 0, b: 0, a: 0 },
    _SpecColor: { r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 },
};
/** Unity's Standard-material serializer retains these fields on this exact custom-shader material. */
exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES = new Set([
    '_GlossyReflections', '_OcclusionStrength', '_SpecularHighlights', '_EmissionColor', '_SpecColor',
]);
exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT = 'wakamo-eye-white-default';
exports.DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES = ['POSITION', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0'];
exports.DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0'];
exports.DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
    'unity_LODFade', 'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
    'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
    'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
    'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
    'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
    'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams', '_Color', '_Texture_ST', '_ZTest_Mode',
    '_Cull_Mode', '_ZWrite_Mode', '_ZOffsetUnits', '_ZOffsetFactor', '_Multiply', '_RGBRGBA',
    '_Custom_Data_Offset_Use', '_Main_Texture_No', '_Texture',
];
exports.DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'unity_Builtins0Array', '_Color', '_Texture_ST',
    '_ZTest_Mode', '_Cull_Mode', '_ZWrite_Mode', '_ZOffsetUnits', '_ZOffsetFactor', '_Multiply', '_RGBRGBA',
    '_Custom_Data_Offset_Use', '_Main_Texture_No', '_Texture',
];
exports.DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
    'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject', 'unity_LODFade',
    'unity_WorldTransformParams', 'unity_RenderingLayer', 'unity_LightData', 'unity_LightIndices',
    'unity_ProbesOcclusion', 'unity_SpecCube0_HDR', 'unity_SpecCube1_HDR', 'unity_SpecCube0_BoxMax',
    'unity_SpecCube0_BoxMin', 'unity_SpecCube0_ProbePosition', 'unity_SpecCube1_BoxMax', 'unity_SpecCube1_BoxMin',
    'unity_SpecCube1_ProbePosition', 'unity_LightmapST', 'unity_DynamicLightmapST', 'unity_SHAr', 'unity_SHAg',
    'unity_SHAb', 'unity_SHBr', 'unity_SHBg', 'unity_SHBb', 'unity_SHC', 'hlslcc_mtx4x4unity_MatrixPreviousM',
    'hlslcc_mtx4x4unity_MatrixPreviousMI', 'unity_MotionVectorsParams',
];
exports.DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection',
    '_ShadowCoordModifier', 'unity_Builtins0Array',
];
exports.DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS = [
    {
        blobIndex: 2, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 0,
        passIndex: 0, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 2568, size: 5096, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
        keywords: [], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_COLOR0'],
        parameterRecordSha256: 'a4e32c89ae00a77e44f772e5f50b371d34028243345b2231c8817beb0bce74d3', keywordIndices: [], keywordNames: [],
        programHash: 'df04b3b74a13eb8720e8c9e3dbb4adf56c4cad61c60c691a2c59cf7aa59c1659', programDataLength: 5055,
        programRecordSha256: '56fa177b4bc146116debfca1afab21a995b302f8e92ea27074ff53dabb7684d0',
        requiredAttributes: exports.DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES, requiredUniforms: exports.DSFX_ALPHA_BLEND_ADD_FORWARD_UNIFORMS,
    },
    {
        blobIndex: 3, pass: 'forward', stateName: 'Forward', parameterBlobIndex: 1,
        passIndex: 0, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 7664, size: 4560, segment: 0, sourceMap: 57, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
        keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD3', 'vs_COLOR0', 'vs_SV_InstanceID0'],
        parameterRecordSha256: '5db8a8a64c9a4eb5ca694006a5f4cb90d57b6421d602cb025745d389fe67c865', keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        programHash: '4c734b1eddd609e21119a81d0e3cf0fb4e3c8b3ae981e741c02eeaae72ec5bd3', programDataLength: 4497,
        programRecordSha256: 'c6f83c938ddfd905863e50f341ba8c445568254664402ae174ac2c235af17098',
        requiredAttributes: exports.DSFX_ALPHA_BLEND_ADD_FORWARD_ATTRIBUTES, requiredUniforms: exports.DSFX_ALPHA_BLEND_ADD_FORWARD_INSTANCED_UNIFORMS,
    },
    {
        blobIndex: 6, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 4,
        passIndex: 1, playerGroupIndex: 3, playerIndex: 0, subProgramIndex: 0, offset: 14356, size: 4660, segment: 0, sourceMap: 59, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 227,
        keywords: [], programAttributes: ['in_POSITION0', 'in_NORMAL0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD2', 'vs_COLOR0'],
        parameterRecordSha256: '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17', keywordIndices: [], keywordNames: [],
        programHash: '13e560d4e67cdd506232363684014b837d096c675123816d7d52d6570cfd775e', programDataLength: 4620,
        programRecordSha256: '1aa2a0449aa09764b09a525ed943b4b095d6ffdae1563cd2bcdfc9a037b5b713',
        requiredAttributes: exports.DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES, requiredUniforms: exports.DSFX_ALPHA_BLEND_ADD_SHADOW_UNIFORMS,
    },
    {
        blobIndex: 7, pass: 'shadow', stateName: 'ShadowCaster', parameterBlobIndex: 5,
        passIndex: 1, playerGroupIndex: 3, playerIndex: 1, subProgramIndex: 1, offset: 19016, size: 4264, segment: 0, sourceMap: 59, version: 202012090, platformName: 'GLES3Plus', gpuProgramTypeName: 'GLES3', shaderRequirements: 2275,
        keywords: ['INSTANCING_ON'], programAttributes: ['in_POSITION0', 'in_NORMAL0', 'in_TEXCOORD0', 'in_TEXCOORD1', 'in_COLOR0', 'vs_TEXCOORD2', 'vs_COLOR0', 'vs_SV_InstanceID0'],
        parameterRecordSha256: '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51', keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        programHash: 'a1368f654663b3060b14b33fc3228e12159327792845877575f693c1c50a6c53', programDataLength: 4201,
        programRecordSha256: 'b3b2b3aecc12c5fb8c248c1dd530c4e6521d43b798f1cab41ff2f81060b4d53f',
        requiredAttributes: exports.DSFX_ALPHA_BLEND_ADD_SHADOW_ATTRIBUTES, requiredUniforms: exports.DSFX_ALPHA_BLEND_ADD_SHADOW_INSTANCED_UNIFORMS,
    },
];
/** AlphaBlend_Add source materials use only these exact translated states. */
exports.DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS = {
    'depth-tested-back-cull': __assign(__assign({}, exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1].renderState), { depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false }),
    'depth-tested-off-double-sided': __assign(__assign({}, exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1].renderState), { depthTest: true, depthFunction: 'less-equal', cullMode: 'off', doubleSided: true }),
};
exports.DSFX_GLITCH_TEX_SOURCE_REFERENCE = {
    bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
    serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-50954330373109545',
};
exports.DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256 = 'b8f29baf75b913a1231adf3c24f8a24b179deaee5bbc03a0e145984c691a15a0';
exports.DSFX_GLITCH_TEX_FINGERPRINT = 'da4f6c1689e70742a01d91febca067eb0492a4121ad2fc63476323a6459f7b3e';
exports.DSFX_GLITCH_TEX_SHADER_NAME = 'DSFX/FX_SHADER_Glitch_Tex';
exports.DSFX_GLITCH_TEX_SHADER_KEYWORDS = [
    'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON',
    'STEREO_CUBEMAP_RENDER_ON', 'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
];
exports.DSFX_GLITCH_TEX_REQUIRED_PROPERTIES = [
    '_MainTex', '_x', '_y', '_Speed_Value', '_NoiseTex', '_Shaking', '_Glitch_value', '_Jitter', '_Cull_Mode',
];
exports.DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES = ['_MainTex', '_NoiseTex'];
exports.DSFX_GLITCH_TEX_FORWARD_ATTRIBUTES = ['POSITION', 'TEXCOORD_0'];
exports.DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'];
exports.DSFX_GLITCH_TEX_FORWARD_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld',
    '_Time', '_Cull_Mode', '_Speed_Value', '_Shaking', '_Jitter', '_Glitch_value', '_x', '_y', '_NoiseTex', '_MainTex',
];
exports.DSFX_GLITCH_TEX_SHADOW_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
    'hlslcc_mtx4x4unity_ObjectToWorld',
];
exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH = '38d23aef9f77ca1a78dfd0efb262bca0bccdafaa1b72b2da397d03bb8c8baf71';
exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH = 'c88bb333a604478192e0294b57c1df8bd25a1782809117c674ff717f288198b5';
exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256 = '3bc739b0ac1bdfebdef0f55320721c38555e9e0e263a844a90287b32c3656dbc';
exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 = '9a7b685ae3e8c21e541ebdb39d04b7285fab786d0e409041e0251693c0e970c4';
exports.DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256 = '42c347357ddcd6b9365ba7a523bf05e2b4aa17076093ba172e7ac7ad313f1450';
exports.DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256 = '89cb58753bbfac486d044fc253235f533f9634393bd30204de277063619427ee';
exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH = 5868;
exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH = 4379;
var DSFX_GLITCH_TEX_PASS_SPECS = {
    forward: {
        pass: 'forward', stateName: 'Forward', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
        blobIndex: 1, parameterBlobIndex: 0, parameterRecordSha256: exports.DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256,
        programHash: exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH, programDataSha256: exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
        programDataLength: exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH, programRecordSha256: exports.DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.DSFX_GLITCH_TEX_FORWARD_ATTRIBUTES,
        requiredUniforms: exports.DSFX_GLITCH_TEX_FORWARD_UNIFORMS,
        renderState: { zWrite: 0, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
    },
    shadow: {
        pass: 'shadow', stateName: 'ShadowCaster', subShaderIndex: 0, passIndex: 1, stage: 'vertex', platform: 9, gpuProgramType: 4,
        blobIndex: 3, parameterBlobIndex: 2, parameterRecordSha256: exports.DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256,
        programHash: exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH, programDataSha256: exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH,
        programDataLength: exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH, programRecordSha256: exports.DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.DSFX_GLITCH_TEX_SHADOW_ATTRIBUTES,
        requiredUniforms: exports.DSFX_GLITCH_TEX_SHADOW_UNIFORMS,
        renderState: { zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
    },
};
exports.DSFX_MATCAP_SOURCE_REFERENCE = {
    bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
    serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-2917564576425350283',
};
exports.DSFX_MATCAP_MATERIAL_REFERENCE = {
    bundleSha256: 'd595ec49e21a44b8a9d1fb280f5e9ea00fedcda560ffc242e792b4fcd175d748',
    serializedFile: 'CAB-ea179b2d4143f9bef81bc7cac07dcd93', objectId: '-5136731906767245831',
};
exports.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE = {
    bundleSha256: 'c0902532467f62315531c05d9e7047e6265b5021ac982cf06cdd87ecb2ffd4b4',
    serializedFile: 'CAB-22cae0b66f2ef2c9cc2627354aa6e59d', objectId: '-1931283808872943791',
};
exports.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE = {
    bundleSha256: '1e293d91261dd2af2b91657dfe0e2e0512c48e246ac43ac90d99159975f5b1a7',
    serializedFile: 'CAB-7405438e0c71de1c2ead1707d796c2fc', objectId: '3221402221456861287',
};
exports.DSFX_MATCAP_MAIN_COLOR = [0.30188679695129395, 0.055614907294511795, 0, 0.772549033164978];
exports.DSFX_MATCAP_PROGRAM_BLOB_SHA256 = '3da48932a17f98d5de6fc428f1ba992e824152b12be7e30a169cae5de3c1ba9d';
exports.DSFX_MATCAP_FINGERPRINT = '99e3d6e9cccc359cdf91cd2e7253b62b1929a522326d1291a7ae43d944e468dc';
exports.DSFX_MATCAP_SHADER_NAME = 'DSFX/FX_SHADER_Matcap';
exports.DSFX_MATCAP_SHADER_KEYWORDS = [
    'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
    'DEBUG_DISPLAY', 'INSTANCING_ON', '_CASTING_PUNCTUAL_LIGHT_SHADOW',
];
exports.DSFX_MATCAP_REQUIRED_PROPERTIES = [
    '_Main_Color', '_Main_Tex', '_Matcap_Tex', '_ZWrite_Mode', '_Cull_Mode', '_texcoord',
];
exports.DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES = ['_Main_Tex', '_Matcap_Tex'];
/**
 * CH0191_FoodProp_02 serializes these URP-era fields even though the linked
 * DSFX Matcap shader neither declares nor references them.  Keep the source
 * values exact: this is a material-specific residue allowlist, not a generic
 * escape hatch for unknown properties.
 */
exports.DSFX_MATCAP_INERT_FLOAT_PROPERTIES = {
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
};
exports.DSFX_MATCAP_INERT_COLOR_PROPERTIES = {
    _BaseColor: { r: 1, g: 1, b: 1, a: 1 },
    _Color: { r: 1, g: 1, b: 1, a: 1 },
    _EmissionColor: { r: 0, g: 0, b: 0, a: 1 },
    _SpecColor: { r: 0.5849056243896484, g: 0.5849056243896484, b: 0.5849056243896484, a: 0.032999999821186066 },
};
exports.DSFX_MATCAP_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0'];
exports.DSFX_MATCAP_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL', 'COLOR_0'];
exports.DSFX_MATCAP_FORWARD_STATIC_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
    'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST', '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex',
];
exports.DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', 'hlslcc_mtx4x4unity_ObjectToWorldArray',
    'hlslcc_mtx4x4unity_WorldToObjectArray', 'unity_Builtins0Array', 'hlslcc_mtx4x4unity_MatrixV', '_Main_Color', '_Main_Tex_ST',
    '_ZWrite_Mode', '_Cull_Mode', '_Matcap_Tex', '_Main_Tex',
];
exports.DSFX_MATCAP_SHADOW_STATIC_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
    'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
];
exports.DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'unity_BaseInstanceID', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
    'hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_WorldToObjectArray', 'unity_Builtins0Array',
];
/** Backwards-compatible aliases for the static pass uniform sets. */
exports.DSFX_MATCAP_FORWARD_UNIFORMS = exports.DSFX_MATCAP_FORWARD_STATIC_UNIFORMS;
exports.DSFX_MATCAP_SHADOW_UNIFORMS = exports.DSFX_MATCAP_SHADOW_STATIC_UNIFORMS;
exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH = 'b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e';
exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH = '38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4';
exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH = 'd33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67';
exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH = '8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7';
exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256 = 'a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e';
exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256 = 'fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f';
exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256 = '34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3';
exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256 = 'd0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3';
exports.DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256 = '1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150';
exports.DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256 = '1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175';
exports.DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17';
exports.DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256 = '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51';
exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH = 5178;
exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH = 4726;
exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH = 4923;
exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH = 4599;
var DSFX_MATCAP_PASS_SPECS = {
    forward: {
        pass: 'forward', variant: 'static', stateName: 'Forward', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
        blobIndex: 2, parameterBlobIndex: 0, parameterRecordSha256: exports.DSFX_MATCAP_FORWARD_STATIC_PARAMETER_RECORD_SHA256,
        programHash: exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH, programDataSha256: exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH,
        programDataLength: exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_DATA_LENGTH, programRecordSha256: exports.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_RECORD_SHA256,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.DSFX_MATCAP_FORWARD_ATTRIBUTES,
        requiredUniforms: exports.DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
        renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
    },
    forwardInstanced: {
        pass: 'forward', variant: 'instanced', stateName: 'Forward', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9, gpuProgramType: 4,
        blobIndex: 3, parameterBlobIndex: 1, parameterRecordSha256: exports.DSFX_MATCAP_FORWARD_INSTANCED_PARAMETER_RECORD_SHA256,
        programHash: exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH, programDataSha256: exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH,
        programDataLength: exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH, programRecordSha256: exports.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_RECORD_SHA256,
        keywordIndices: [5], keywordNames: ['INSTANCING_ON'], requiredAttributes: exports.DSFX_MATCAP_FORWARD_ATTRIBUTES,
        requiredUniforms: exports.DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
        renderState: { zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false },
    },
    shadow: {
        pass: 'shadow', variant: 'static', stateName: 'ShadowCaster', subShaderIndex: 0, passIndex: 1, stage: 'vertex', platform: 9, gpuProgramType: 4,
        blobIndex: 6, parameterBlobIndex: 4, parameterRecordSha256: exports.DSFX_MATCAP_SHADOW_STATIC_PARAMETER_RECORD_SHA256,
        programHash: exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH, programDataSha256: exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH,
        programDataLength: exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_DATA_LENGTH, programRecordSha256: exports.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_RECORD_SHA256,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.DSFX_MATCAP_SHADOW_ATTRIBUTES,
        requiredUniforms: exports.DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
        renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
    },
    shadowInstanced: {
        pass: 'shadow', variant: 'instanced', stateName: 'ShadowCaster', subShaderIndex: 0, passIndex: 1, stage: 'vertex', platform: 9, gpuProgramType: 4,
        blobIndex: 7, parameterBlobIndex: 5, parameterRecordSha256: exports.DSFX_MATCAP_SHADOW_INSTANCED_PARAMETER_RECORD_SHA256,
        programHash: exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH, programDataSha256: exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH,
        programDataLength: exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH, programRecordSha256: exports.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_RECORD_SHA256,
        keywordIndices: [5], keywordNames: ['INSTANCING_ON'], requiredAttributes: exports.DSFX_MATCAP_SHADOW_ATTRIBUTES,
        requiredUniforms: exports.DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
        renderState: { zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true },
    },
};
var DSFX_ALPHA_BLEND_0_INERT_PROPERTIES = new Set([
    '_GlossyReflections', '_EnvironmentReflections',
    '_LightingEnabled', '_OcclusionStrength', '_SpecularHighlights',
    '_EmissionColor', '_SpecColor',
]);
var DSFX_MATCAP_INERT_PROPERTIES = new Set(__spreadArray(__spreadArray([], Object.keys(exports.DSFX_MATCAP_INERT_FLOAT_PROPERTIES), true), Object.keys(exports.DSFX_MATCAP_INERT_COLOR_PROPERTIES), true));
function dsfxStaticShaderRule(shaderName, parsedName) {
    var identities = [shaderName, parsedName].map(normalizedShaderIdentity);
    return exports.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES.find(function (rule) { return identities.includes(rule.identity); });
}
exports.MX_UNLIT_OUTLINE_SOURCE_REFERENCE = {
    bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
    serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-8748270323205728420',
};
exports.MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256 = '91f6c05f3ea2768b13f3879bff7eb56fd28bd852aca89131caa3ddfec5ecf8ce';
exports.MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH = '8dd437bded36c20c116d416a2a3f679deb58b3249d887cfce6fbcfeaad94a24e';
exports.MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH = 'cf33765ab69ff40c91202ccb8b006211246685b6be23a41636cdf9de69bffde0';
exports.MX_C_TRANSPARENT_ST_SOURCE_REFERENCE = {
    bundleSha256: '27a3970363fc51decb5d5c258f90f79c3fb139c8ced1a01724109eb47cc56c85',
    serializedFile: 'CAB-38d7f184c16228480d78cd7ea10cae27', objectId: '-5281742850669710733',
};
exports.MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256 = 'ff279d3985ac14ecb356f9ab863bb83b3b9d18033bfe897c877f8da866e6d345';
exports.MX_C_TRANSPARENT_ST_FINGERPRINT = '476551579a557a660da5fa3454da6f10193c729fef20430d4c905e8df0c7d7a5';
exports.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH = 'a183c161a42534139176e57679b700599f385de97243d75ef719a70c0feea253';
exports.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH = '8b65ba41e0b6f12e63d7d04c8eb017ac03a7962880f76474faea12cdcde319f9';
exports.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH = '4ea792966bb7d8359234279f7e000ebea5c5a4fedd7a62ed819225f5186bae98';
exports.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256 = 'e9758ef79668f2925973ee08ab66cc059609e4c2e8440fddd1c27547c9df66fe';
exports.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256 = 'f834a20f9f5d48e3b99e9c7fd896fed2162374e81d6d50112174d924401049cf';
exports.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256 = '33d45d0b45e7e4a2fd5f5fd4fe1d6b652e6d0d19de0d2a36665d344de31b7581';
exports.MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256 = 'b6901e2d32877e7c7d19a77a513f345130a90e9e3c47ff7b22a39bab3af68f65';
exports.MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256 = '23375befaf4b4f6524e364569fe388024d9df20509258ad4b64b84491eee9a5c';
exports.MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256 = 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532';
exports.MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'COLOR_0', 'TEXCOORD_0'];
exports.MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES = ['POSITION'];
exports.MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS = [
    '_WorldSpaceCameraPos', '_MxCharShadowTone', '_MxCharLightData', '_Tint', '_ShadowThreshold',
    '_ShadowTint', '_Cutoff', '_RimAreaMultiplier', '_RimStrength', '_AdditionalLightStrength',
    '_AdditionalLightSharpness', '_GrayBrightness', '_MainTex_ST', '_CodeAddColor', '_CodeMultiplyColor',
    '_CodeAddRimColor', '_DitherThreshold', '_MaskRtoG', '_MaskGSensitivity', '_SeeThroughMinValue',
    '_SeeThroughTransparency', '_SeeThroughSmoothness', '_GlobalMipBias', '_MxCharLightDir',
    '_MxCharLightTone', '_MainTex', '_MaskTex', 'hlslcc_mtx4x4unity_MatrixVP',
];
exports.MX_C_TRANSPARENT_ST_DITHER_UNIFORMS = __spreadArray(__spreadArray([], exports.MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS, true), ['_ProjectionParams'], false);
exports.MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld'];
exports.MX_C_TRANSPARENT_ST_REQUIRED_PROPERTIES = [
    '_Cull', '_ZWrite', '_Tint', '_MainTex', '_MaskTex', '_MaskGSensitivity', '_MaskRtoG',
    '_SeeThroughMinValue', '_SeeThroughTransparency', '_SeeThroughSmoothness', '_ShadowTint',
    '_ShadowThreshold', '_RimAreaMultiplier', '_RimStrength', '_AdditionalLightStrength',
    '_AdditionalLightSharpness', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor',
    '_DitherThreshold', '_GrayBrightness',
];
exports.PROJECTMX_WEAPON_SOURCE_REFERENCE = {
    bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
    serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-2179428789015729742',
};
exports.PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256 = '962e3b88b0cc42a36e31e8eb2ba538d3cc571d37f4bec4aca1b30e14a6927e0b';
exports.PROJECTMX_WEAPON_FINGERPRINT = 'dba2503cda8be6508b161525ab1202a9187f93c8924716efe6f3d061a4ff439b';
exports.PROJECTMX_WEAPON_SHADER_KEYWORDS = [
    'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
    '_ADDITIONAL_LIGHTS', 'DEBUG_DISPLAY', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2', '_DAMAGE_0', '_GLOW_0',
    '_DITHER_HORIZONTAL_LINES', 'OUTLINE_RIM_LIGHT_POINT', 'OUTLINE_RIM_LIGHT_SPOT', '_GRAYSCALE_MODE',
    '_CHAR_CUTOUT_MODE',
];
exports.PROJECTMX_WEAPON_REQUIRED_PROPERTIES = [
    '_DamageON', '_Color', '_mainTex', '_sourceTex', '_NoiseTex', '_CrushScale', '_NoiseDir',
    '_DmgCol', '_NoiseColStrong', '_Damage', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire',
    '_ShadowThreshold', '_ShadowStrong', '_LightValue', '_LightStrong', '_SpecStrong', '_ShadowTint',
    '_SpecColor', '_FakeLightDir', '_AdditionalLightStrength', '_AdditionalLightSharpness', '_UseGlow',
    '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0', '_OutlineTint',
    '_OutlineSolidColorTint', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor', '_GrayBrightness',
    '_IsDither', '_DitherThreshold',
];
exports.MX_E_STANDARD_SOURCE_REFERENCE = {
    bundleSha256: '08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c',
    serializedFile: 'CAB-428091522b4007f213bf16532c4528a1', objectId: '-8678996592869746170',
};
exports.MX_E_STANDARD_PROGRAM_BLOB_SHA256 = 'b3edadb8e9c86afdab206cab761a0a574ee8e0baa75183cc24147a4e02ea1288';
exports.MX_E_STANDARD_FINGERPRINT = 'a9a00b4141e350c6dd7611bcaa1fbcbadfe35dff202f41bf3fe5df2ce5124019';
exports.MX_E_STANDARD_SHADER_NAME = 'MX/E-Standard';
exports.MX_E_STANDARD_SHADER_KEYWORDS = [
    'STEREO_INSTANCING_ON', 'UNITY_SINGLE_PASS_STEREO', 'STEREO_MULTIVIEW_ON', 'STEREO_CUBEMAP_RENDER_ON',
    '_RECEIVE_SHADOWS_OFF', 'DEBUG_DISPLAY', '_MAIN_LIGHT_SHADOWS', '_ADDITIONAL_LIGHTS', 'LIGHTMAP_ON',
    '_BAKED_PREFAB', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2', 'INSTANCING_ON', '_ENV_CUTOUT_MODE',
    '_ENV_ALPHA_MODE', '_ENV_REFLECT_MODE', '_ENV_EMISSION_MODE', '_ENV_SPECULAR_MODE', '_DYNAMIC_LIGHTS',
    '_UNLIT_CODEADDCOLOR', '_DEBUG_LIGHTMAP', '_SPECULAR_SETUP',
];
exports.MX_E_STANDARD_REQUIRED_PROPERTIES = [
    '_Cutoff', '_PrefabLightmapTex', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha',
    '_ZWrite', '_Cull', '_ZOffsetFactor', '_ZOffsetUnits', '_Color', '_MainTex', '_ReflectTex',
    '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength', '_EmissionTex',
    '_EmissionStrength', '_SpecTex', '_SpecLightDir', '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec',
    '_LightmapStrength', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor',
];
exports.MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES = ['_PrefabLightmapTex', '_MainTex', '_ReflectTex', '_EmissionTex', '_SpecTex'];
exports.MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES = ['_MainTex'];
exports.MX_E_STANDARD_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0'];
exports.MX_E_STANDARD_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'];
exports.MX_E_STANDARD_DEPTH_ATTRIBUTES = ['POSITION'];
exports.MX_E_STANDARD_META_ATTRIBUTES = ['POSITION', 'TEXCOORD_0', 'TEXCOORD_1', 'TEXCOORD_2'];
var MX_E_STANDARD_FORWARD_MATERIAL_UNIFORMS = [
    '_MainTex_ST', '_Color', '_Cutoff', '_PrefabLightmapTex_ST', '_ReflectTex_ST', '_ReflectBaseAmount',
    '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength', '_EmissionStrength', '_SpecLightDir',
    '_SpecLightColor', '_SpecPower', '_ShadowAttenSpec', '_LightmapStrength', '_CodeAddColor',
    '_CodeMultiplyColor', '_CodeAddRimColor',
];
exports.MX_E_STANDARD_FORWARD_STATIC_UNIFORMS = __spreadArray(__spreadArray([
    '_ProjectionParams', 'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld',
    'hlslcc_mtx4x4unity_WorldToObject', 'unity_SHAr', 'unity_SHAg', 'unity_SHAb', 'unity_SHBr',
    'unity_SHBg', 'unity_SHBb', 'unity_SHC'
], MX_E_STANDARD_FORWARD_MATERIAL_UNIFORMS, true), [
    '_GlobalMipBias', '_MainTex',
], false);
exports.MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS = __spreadArray(__spreadArray([
    '_MainLightPosition', '_WorldSpaceCameraPos'
], exports.MX_E_STANDARD_FORWARD_STATIC_UNIFORMS, true), [
    '_MainLightColor',
], false);
exports.MX_E_STANDARD_SHADOW_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier',
    'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
];
exports.MX_E_STANDARD_DEPTH_UNIFORMS = [
    'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject',
];
exports.MX_E_STANDARD_META_UNIFORMS = __spreadArray(__spreadArray([
    'hlslcc_mtx4x4unity_MatrixVP', 'hlslcc_mtx4x4unity_ObjectToWorld', 'hlslcc_mtx4x4unity_WorldToObject'
], MX_E_STANDARD_FORWARD_MATERIAL_UNIFORMS, true), [
    'unity_OneOverOutputBoost', 'unity_MaxOutputValue',
    'unity_MetaVertexControl', 'unity_MetaFragmentControl', 'unity_VisualizationMode', '_GlobalMipBias', '_MainTex',
], false);
exports.MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH = 'cfd7db48ce454d347374b95768908b6c27e267c7c3812643b2162cff8ccc078b';
exports.MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH = 'ba83d0d99dbb57507bc8fb0f423304c93b59a6c1703aa4f775f0fd6020fd3cf8';
exports.MX_E_STANDARD_SHADOW_PROGRAM_HASH = 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0';
exports.MX_E_STANDARD_DEPTH_PROGRAM_HASH = '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513';
exports.MX_E_STANDARD_META_PROGRAM_HASH = 'f1ac8ee9712bdf61db2946f3759d2bc6bf3e3f046ee76f9f2891521f84cb4201';
exports.MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256 = '6c8c8c189fa4171c300d1c23e270155b10999851bb1ab1dd6df96c5c1fb17c78';
exports.MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256 = '034d968d7b7778638f25e050f5ab099098afb32688543b8d41e77dd112063d6f';
exports.MX_E_STANDARD_SHADOW_RECORD_SHA256 = '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46';
exports.MX_E_STANDARD_DEPTH_RECORD_SHA256 = '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0';
exports.MX_E_STANDARD_META_RECORD_SHA256 = '551fed3636dc25ca1923b2d081b1c2a63ce5cb129433e640a21892c6a625641f';
exports.MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256 = 'f88facd27e428382fd81071a1bbd4f366583363e315d520319f0a8a4bb2e0389';
exports.MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256 = '86bcf1ab50b14c400c719927e0ead152e358475297170daebeceadc06d46bfb6';
exports.MX_E_STANDARD_SHADOW_PARAMETER_SHA256 = '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17';
exports.MX_E_STANDARD_DEPTH_PARAMETER_SHA256 = '18defb46cf7eb1e1646d318f215cc2eaa29fa06411690ba443cade9de3be4181';
exports.MX_E_STANDARD_META_PARAMETER_SHA256 = 'f3597fa2708ab4924492304ff8dcfd3a7271f291c931e74d1b1a480634ac4220';
var MX_E_STANDARD_FORWARD_STATIC_STATE = {
    zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull',
    sourceBlend: 0, sourceBlendProperty: '_SrcBlend', destinationBlend: 0, destinationBlendProperty: '_DstBlend',
    sourceBlendAlpha: 0, sourceBlendAlphaProperty: '_SrcBlendAlpha', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '_DstBlendAlpha',
    blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
    offsetFactor: 0, offsetFactorProperty: '_ZOffsetFactor', offsetUnits: 0, offsetUnitsProperty: '_ZOffsetUnits',
};
var MX_E_STANDARD_OPAQUE_STATE = {
    zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull',
    sourceBlend: 1, sourceBlendProperty: '<noninit>', destinationBlend: 0, destinationBlendProperty: '<noninit>',
    sourceBlendAlpha: 1, sourceBlendAlphaProperty: '<noninit>', destinationBlendAlpha: 0, destinationBlendAlphaProperty: '<noninit>',
    blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
    offsetFactor: 0, offsetFactorProperty: '<noninit>', offsetUnits: 0, offsetUnitsProperty: '<noninit>',
};
var MX_E_STANDARD_DEPTH_STATE = __assign(__assign({}, MX_E_STANDARD_OPAQUE_STATE), { colorMask: 0, depthOnly: true });
var MX_E_STANDARD_META_STATE = __assign(__assign({}, MX_E_STANDARD_OPAQUE_STATE), { cullingProperty: '<noninit>' });
var MX_E_STANDARD_PASS_SPECS = {
    forwardStatic: {
        pass: 'forwardStatic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 160, parameterBlobIndex: 0,
        parameterRecordSha256: exports.MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256, programHash: exports.MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH,
        programRecordSha256: exports.MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256, programDataLength: 7132,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.MX_E_STANDARD_FORWARD_ATTRIBUTES,
        requiredUniforms: exports.MX_E_STANDARD_FORWARD_STATIC_UNIFORMS, renderState: MX_E_STANDARD_FORWARD_STATIC_STATE,
    },
    forwardDynamic: {
        pass: 'forwardDynamic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 171, parameterBlobIndex: 4,
        parameterRecordSha256: exports.MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, programHash: exports.MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
        programRecordSha256: exports.MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, programDataLength: 8112,
        keywordIndices: [19], keywordNames: ['_DYNAMIC_LIGHTS'], requiredAttributes: exports.MX_E_STANDARD_FORWARD_ATTRIBUTES,
        requiredUniforms: exports.MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS, renderState: MX_E_STANDARD_FORWARD_STATIC_STATE,
    },
    shadow: {
        pass: 'shadow', stateName: 'ShadowCaster', passName: '', passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312,
        parameterRecordSha256: exports.MX_E_STANDARD_SHADOW_PARAMETER_SHA256, programHash: exports.MX_E_STANDARD_SHADOW_PROGRAM_HASH,
        programRecordSha256: exports.MX_E_STANDARD_SHADOW_RECORD_SHA256, programDataLength: 4273,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.MX_E_STANDARD_SHADOW_ATTRIBUTES,
        requiredUniforms: exports.MX_E_STANDARD_SHADOW_UNIFORMS, renderState: MX_E_STANDARD_OPAQUE_STATE,
    },
    depth: {
        pass: 'depth', stateName: 'DepthOnly', passName: '', passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320,
        parameterRecordSha256: exports.MX_E_STANDARD_DEPTH_PARAMETER_SHA256, programHash: exports.MX_E_STANDARD_DEPTH_PROGRAM_HASH,
        programRecordSha256: exports.MX_E_STANDARD_DEPTH_RECORD_SHA256, programDataLength: 2766,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.MX_E_STANDARD_DEPTH_ATTRIBUTES,
        requiredUniforms: exports.MX_E_STANDARD_DEPTH_UNIFORMS, renderState: MX_E_STANDARD_DEPTH_STATE,
    },
    meta: {
        pass: 'meta', stateName: 'Meta', passName: '', passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328,
        parameterRecordSha256: exports.MX_E_STANDARD_META_PARAMETER_SHA256, programHash: exports.MX_E_STANDARD_META_PROGRAM_HASH,
        programRecordSha256: exports.MX_E_STANDARD_META_RECORD_SHA256, programDataLength: 6928,
        keywordIndices: [], keywordNames: [], requiredAttributes: exports.MX_E_STANDARD_META_ATTRIBUTES,
        requiredUniforms: exports.MX_E_STANDARD_META_UNIFORMS, renderState: MX_E_STANDARD_META_STATE,
    },
};
var PROJECTMX_WEAPON_PASS_STATE = {
    sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0,
    blendOperation: 0, blendOperationAlpha: 0,
};
var PROJECTMX_WEAPON_FORWARD_ATTRIBUTES = ['POSITION', 'NORMAL', 'TEXCOORD_0'];
var PROJECTMX_WEAPON_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT', 'TEXCOORD_0'];
var PROJECTMX_WEAPON_SOLID_OUTLINE_ATTRIBUTES = ['POSITION', 'COLOR_0', 'TANGENT'];
var PROJECTMX_WEAPON_SHADOW_ATTRIBUTES = ['POSITION', 'NORMAL'];
var PROJECTMX_WEAPON_DEPTH_ATTRIBUTES = ['POSITION'];
var PROJECTMX_WEAPON_FORWARD_UNIFORMS = [
    '_WorldSpaceCameraPos', 'hlslcc_mtx4x4unity_MatrixVP', '_MxCharShadowTone', '_ShadowTint', '_mainTex_ST',
    '_FakeLightDir', '_MxCharLightTone', '_MxCharLightData', '_ShadowThreshold', '_CodeAddColor',
    '_CodeMultiplyColor', '_CodeAddRimColor', '_Color', '_ShadowStrong', '_SpecColor', '_LightValue',
    '_LightStrong', '_SpecStrong', '_FireCol', '_FireBackCol_Str', '_FireValue', '_Fire', '_mainTex', '_sourceTex',
];
var PROJECTMX_WEAPON_GLOW_UNIFORMS = __spreadArray(__spreadArray([], PROJECTMX_WEAPON_FORWARD_UNIFORMS, true), [
    '_GlowMaskColor0', '_GlowStrictness0', '_GlowTint0', '_GlowStrength0',
], false);
var PROJECTMX_WEAPON_OUTLINE_UNIFORMS = [
    '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
    'hlslcc_mtx4x4unity_MatrixVP', '_OutlineTint', '_OutlineZCorrection', '_mainTex',
];
var PROJECTMX_WEAPON_SOLID_OUTLINE_UNIFORMS = [
    '_MainLightColor', '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
    'hlslcc_mtx4x4unity_MatrixVP', '_AdditionalLightSharpness', '_AdditionalLightStrength', '_OutlineTint',
    '_OutlineZCorrection', '_OutlineSolidColorTint', '_DitherThreshold',
];
var PROJECTMX_WEAPON_SHADOW_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier'];
var PROJECTMX_WEAPON_DEPTH_UNIFORMS = ['hlslcc_mtx4x4unity_MatrixVP'];
var PROJECTMX_WEAPON_PASS_SPECS = {
    forward: {
        stateName: 'ForwardLit', passIndex: 0, blobIndex: 32, parameterBlobIndex: 0,
        parameterRecordSha256: '1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531',
        programHash: '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0',
        programRecordSha256: '6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab',
        programDataLength: 9117, keywordIndices: [], keywordNames: [],
        requiredAttributes: PROJECTMX_WEAPON_FORWARD_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_FORWARD_UNIFORMS,
        renderState: __assign({ zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false }, PROJECTMX_WEAPON_PASS_STATE),
    },
    glow: {
        stateName: 'ForwardLit', passIndex: 0, blobIndex: 34, parameterBlobIndex: 2,
        parameterRecordSha256: 'eee4f7d62f87181a65c432811bc8f70278611bde7cdb34db471b2f71f39872a3',
        programHash: '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61',
        programRecordSha256: '649300d147f68a8028da9cdf7518e59b06f18bb1bec00870e9d4c42cc28d4199',
        programDataLength: 9679, keywordIndices: [10], keywordNames: ['_GLOW_0'],
        requiredAttributes: PROJECTMX_WEAPON_FORWARD_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_GLOW_UNIFORMS,
        renderState: __assign({ zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false }, PROJECTMX_WEAPON_PASS_STATE),
    },
    outline: {
        stateName: 'Outline', passIndex: 1, blobIndex: 104, parameterBlobIndex: 80,
        parameterRecordSha256: '93e5c67bd74028d7dcc658e2ef1b6e8fdd5a335b14ba86a64a0f49751658c1e9',
        programHash: 'a277ed38c25399804b406db92436fa1f6e174e14cd520e80ad93c5af0fa6b703',
        programRecordSha256: '476574cf56ad6f44e2f032e4f2168940da9aaa05d0bf508374e84433794ca026',
        programDataLength: 5141, keywordIndices: [], keywordNames: [],
        requiredAttributes: PROJECTMX_WEAPON_OUTLINE_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_OUTLINE_UNIFORMS,
        renderState: __assign({ zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false }, PROJECTMX_WEAPON_PASS_STATE),
    },
    solidOutline: {
        stateName: 'Solid Color Outline', passIndex: 2, blobIndex: 180, parameterBlobIndex: 176,
        parameterRecordSha256: '81b579f997a0f2ebcbafe8cfee65f85e80daec6676a2a8539acb2f28d5c1841e',
        programHash: 'caddccda8439d960e4fc999a1e985816425f4bf71f6c5c7d5f39b23a3151b5a2',
        programRecordSha256: 'cde8f0a6c8770da24e241fcba0b378f97a8b2fee1ac85636b4f812e33f4e095f',
        programDataLength: 5384, keywordIndices: [], keywordNames: [],
        requiredAttributes: PROJECTMX_WEAPON_SOLID_OUTLINE_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_SOLID_OUTLINE_UNIFORMS,
        renderState: __assign({ zWrite: 1, zTest: 4, culling: 1, colorMask: 15, depthOnly: false }, PROJECTMX_WEAPON_PASS_STATE),
    },
    shadow: {
        stateName: 'ShadowCaster', passIndex: 3, blobIndex: 193, parameterBlobIndex: 192,
        parameterRecordSha256: '7776e03ce4d1ca4c97c6cfb57ed3ee6bf5800c7ad7c62f29f0b68e8d93f10b35',
        programHash: 'c9c5bac96db04b48197aacbd959c1560ef06e8c6d607dba24edc70bc1f6b1ff0',
        programRecordSha256: '52c5e893ada24d0ed61bb3b97d981bb03a5ca357724c6d5e22f7ce9b18930e46',
        programDataLength: 4273, keywordIndices: [], keywordNames: [],
        requiredAttributes: PROJECTMX_WEAPON_SHADOW_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_SHADOW_UNIFORMS,
        renderState: __assign({ zWrite: 1, zTest: 4, culling: 2, colorMask: 15, depthOnly: false }, PROJECTMX_WEAPON_PASS_STATE),
    },
    depth: {
        stateName: 'DepthOnly', passIndex: 4, blobIndex: 195, parameterBlobIndex: 194,
        parameterRecordSha256: 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532',
        programHash: '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513',
        programRecordSha256: '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0',
        programDataLength: 2766, keywordIndices: [], keywordNames: [],
        requiredAttributes: PROJECTMX_WEAPON_DEPTH_ATTRIBUTES, requiredUniforms: PROJECTMX_WEAPON_DEPTH_UNIFORMS,
        renderState: __assign({ zWrite: 1, zTest: 4, culling: 2, colorMask: 0, depthOnly: true }, PROJECTMX_WEAPON_PASS_STATE),
    },
};
var MX_UNLIT_OUTLINE_BASE_ATTRIBUTES = ['POSITION', 'TEXCOORD_0'];
var MX_UNLIT_OUTLINE_OUTLINE_ATTRIBUTES = ['POSITION', 'TANGENT', 'COLOR_0', 'TEXCOORD_0'];
var MX_UNLIT_OUTLINE_BASE_UNIFORMS = ['_MainTex_ST', '_Tint', '_MainTex'];
var MX_UNLIT_OUTLINE_OUTLINE_UNIFORMS = [
    '_MainTex_ST', '_OutlineTint', '_OutlineZCorrection', '_MainTex', '_MainLightColor',
    '_ScreenParams', 'hlslcc_mtx4x4glstate_matrix_projection', 'hlslcc_mtx4x4unity_MatrixInvV',
    'hlslcc_mtx4x4unity_MatrixVP',
];
// These identities and bytecode hashes are taken from the current BAAD
// source inventory.  The rules deliberately describe the shader version and
// its pass shape, not a student or material-name exception.  Each rule is
// either validated by a source-selected profile below or remains a
// publication blocker until its Viewer runtime adapter exists.
exports.CHIBI_CUSTOM_SHADER_ADAPTER_RULES = [
    {
        id: 'mx-c-transparent-st', identity: 'mx/c-transparent-st',
        programBlobSha256: exports.MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256,
        sourceReference: exports.MX_C_TRANSPARENT_ST_SOURCE_REFERENCE,
        requiredProperties: __spreadArray([], exports.MX_C_TRANSPARENT_ST_REQUIRED_PROPERTIES, true),
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
        programBlobSha256: exports.PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256,
        sourceReference: exports.PROJECTMX_WEAPON_SOURCE_REFERENCE,
        requiredProperties: __spreadArray([], exports.PROJECTMX_WEAPON_REQUIRED_PROPERTIES, true),
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
        programBlobSha256: exports.DSFX_MATCAP_PROGRAM_BLOB_SHA256,
        sourceReference: exports.DSFX_MATCAP_SOURCE_REFERENCE,
        requiredProperties: __spreadArray([], exports.DSFX_MATCAP_REQUIRED_PROPERTIES, true),
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
        programBlobSha256: exports.MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256,
        sourceReference: exports.MX_UNLIT_OUTLINE_SOURCE_REFERENCE,
        requiredProperties: ['_Cull', '_Tint', '_MainTex', '_OutlineTint', '_OutlineZCorrection'],
        passSignature: [
            { type: 0, states: [
                    { zWrite: 1, zTest: 4, culling: 0 },
                    { zWrite: 1, zTest: 4, culling: 1 },
                ] },
        ],
        behavior: 'the second outline pass',
    },
];
function customShaderAdapterRule(shaderName, parsedName) {
    var identities = [shaderName, parsedName].map(normalizedShaderIdentity);
    return exports.CHIBI_CUSTOM_SHADER_ADAPTER_RULES.find(function (rule) { return identities.includes(rule.identity); });
}
function shaderPropertyNames(shader) {
    var _a, _b;
    return ((_b = (_a = shader === null || shader === void 0 ? void 0 : shader.properties) === null || _a === void 0 ? void 0 : _a.m_Props) !== null && _b !== void 0 ? _b : [])
        .map(function (property) { return property.m_Name; })
        .filter(function (name) { return typeof name === 'string'; });
}
function dsfxGlitchShaderRule(shaderName, parsedName) {
    var identities = [shaderName, parsedName].map(normalizedShaderIdentity);
    return identities.includes(normalizedShaderIdentity(exports.DSFX_GLITCH_TEX_SHADER_NAME)) ? exports.DSFX_GLITCH_TEX_SOURCE_REFERENCE : undefined;
}
function dsfxGlitchSourcePass(extraction, expected) {
    var _a, _b, _c, _d, _e;
    var program = extraction.gles3Programs.find(function (item) { return item.kind === 'program' && item.blobIndex === expected.blobIndex; });
    var binding = extraction.bindings.find(function (item) { return item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
    if (!program || !binding || typeof program.glsl !== 'string')
        return null;
    return __assign(__assign({}, expected), { parameterRecordSha256: (_a = binding.parameterRecordSha256) !== null && _a !== void 0 ? _a : '', keywordIndices: __spreadArray([], binding.keywordIndices, true), keywordNames: __spreadArray([], binding.keywordNames, true), programHash: (_b = program.programHash) !== null && _b !== void 0 ? _b : '', programDataSha256: (_c = program.programDataSha256) !== null && _c !== void 0 ? _c : '', programDataLength: (_d = program.programDataLength) !== null && _d !== void 0 ? _d : -1, programRecordSha256: (_e = program.recordSha256) !== null && _e !== void 0 ? _e : '', requiredAttributes: __spreadArray([], expected.requiredAttributes, true), requiredUniforms: __spreadArray([], expected.requiredUniforms, true), glsl: program.glsl });
}
function dsfxGlitchShaderExtractionEvidence(shader) {
    var _a, _b, _c, _d, _e, _f;
    if (!(shader === null || shader === void 0 ? void 0 : shader.extraction))
        return { error: (shader === null || shader === void 0 ? void 0 : shader.extractionError) ? "source extraction failed: ".concat(shader.extractionError) : 'source shader extraction is missing' };
    var extraction = shader.extraction;
    var sourceReference = (_a = extraction.shader) === null || _a === void 0 ? void 0 : _a.sourceReference;
    if (((_b = shader.programBlobSha256) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== exports.DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
        || referenceKey(shader.sourceReference) !== referenceKey(exports.DSFX_GLITCH_TEX_SOURCE_REFERENCE)
        || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
        || extraction.fingerprint !== exports.DSFX_GLITCH_TEX_FINGERPRINT
        || extraction.compressedBlobSha256 !== exports.DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256
        || referenceKey(sourceReference) !== referenceKey(exports.DSFX_GLITCH_TEX_SOURCE_REFERENCE)
        || normalizedShaderIdentity((_c = extraction.shader) === null || _c === void 0 ? void 0 : _c.name) !== normalizedShaderIdentity(exports.DSFX_GLITCH_TEX_SHADER_NAME)
        || !exactArray((_d = extraction.shader) === null || _d === void 0 ? void 0 : _d.keywordNames, exports.DSFX_GLITCH_TEX_SHADER_KEYWORDS)
        || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
        return { error: 'source extraction metadata is incomplete or does not match the verified Glitch_Tex shader object' };
    }
    var expectedPrograms = Object.values(DSFX_GLITCH_TEX_PASS_SPECS);
    if (extraction.gles3Programs.length !== expectedPrograms.length
        || extraction.programs.filter(function (item) { return item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4; }).length !== expectedPrograms.length) {
        return { error: 'source extraction does not contain the complete GLES3 Glitch_Tex program set' };
    }
    var _loop_1 = function (expected) {
        var program = extraction.gles3Programs.find(function (item) { return item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
        var complete = extraction.programs.find(function (item) { return item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
        var binding = extraction.bindings.find(function (item) { return item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
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
            return { value: { error: "source extraction Glitch_Tex ".concat(expected.pass, " record does not match the verified source") } };
        }
        for (var _k = 0, _l = expected.requiredAttributes; _k < _l.length; _k++) {
            var attribute = _l[_k];
            var sourceName = attribute === 'POSITION' ? 'in_POSITION0' : attribute === 'NORMAL' ? 'in_NORMAL0' : 'in_TEXCOORD0';
            if (!new RegExp("\\bin\\s+[^;]*\\b".concat(sourceName, "\\b")).test(program.glsl))
                return { value: { error: "source extraction Glitch_Tex ".concat(expected.pass, " source is missing ").concat(attribute) } };
        }
        for (var _m = 0, _o = expected.requiredUniforms; _m < _o.length; _m++) {
            var uniform = _o[_m];
            if (!new RegExp("\\b".concat(uniform.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), "\\b")).test(program.glsl))
                return { value: { error: "source extraction Glitch_Tex ".concat(expected.pass, " source is missing ").concat(uniform) } };
        }
    };
    for (var _i = 0, expectedPrograms_1 = expectedPrograms; _i < expectedPrograms_1.length; _i++) {
        var expected = expectedPrograms_1[_i];
        var state_1 = _loop_1(expected);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    var passes = (_f = (_e = shader.subShaders) === null || _e === void 0 ? void 0 : _e.flatMap(function (subShader) { var _a; return (_a = subShader.passes) !== null && _a !== void 0 ? _a : []; })) !== null && _f !== void 0 ? _f : [];
    if (passes.length !== 2)
        return { error: "shader pass count is ".concat(passes.length, ", expected 2") };
    var expectedSourceStates = [
        { name: 'Forward', type: 0, zWrite: 0, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, colorMask: 15 },
        { name: 'ShadowCaster', type: 0, zWrite: 1, zTest: 4, culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0 },
    ];
    for (var _g = 0, _h = expectedSourceStates.entries(); _g < _h.length; _g++) {
        var _j = _h[_g], index = _j[0], expected = _j[1];
        var pass = passes[index], blend = sourceStateRecord(pass === null || pass === void 0 ? void 0 : pass.state, 'rtBlend0');
        if ((pass === null || pass === void 0 ? void 0 : pass.type) !== expected.type || pass.name !== '' || sourceStateName(pass.state, 'm_Name') !== expected.name
            || sourceStateValue(pass.state, 'zWrite') !== expected.zWrite || sourceStateValue(pass.state, 'zTest') !== expected.zTest
            || sourceStateValue(pass.state, 'culling') !== expected.culling || sourceStateName(pass.state, 'culling') !== expected.cullingProperty
            || !blend || sourceStateValue(blend, 'srcBlend') !== expected.sourceBlend || sourceStateValue(blend, 'destBlend') !== expected.destinationBlend
            || sourceStateValue(blend, 'srcBlendAlpha') !== expected.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== expected.destinationBlendAlpha
            || sourceStateValue(blend, 'blendOp') !== 0 || sourceStateValue(blend, 'blendOpAlpha') !== 0 || sourceStateValue(blend, 'colMask') !== expected.colorMask
            || sourceStateValue(pass.state, 'offsetFactor') !== 0 || sourceStateValue(pass.state, 'offsetUnits') !== 0) {
            return { error: "shader ".concat(expected.name, " render state is not the verified source state") };
        }
    }
    var forward = dsfxGlitchSourcePass(extraction, DSFX_GLITCH_TEX_PASS_SPECS.forward);
    var shadow = dsfxGlitchSourcePass(extraction, DSFX_GLITCH_TEX_PASS_SPECS.shadow);
    if (!forward || !shadow)
        return { error: 'source extraction Glitch_Tex pass metadata is incomplete' };
    return {
        source: {
            schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion, unityVersion: extraction.unityVersion,
            fingerprint: extraction.fingerprint, sourceReference: exports.DSFX_GLITCH_TEX_SOURCE_REFERENCE,
            compressedBlobSha256: extraction.compressedBlobSha256, shaderName: exports.DSFX_GLITCH_TEX_SHADER_NAME,
            shaderKeywordNames: __spreadArray([], exports.DSFX_GLITCH_TEX_SHADER_KEYWORDS, true), requiredProperties: __spreadArray([], exports.DSFX_GLITCH_TEX_REQUIRED_PROPERTIES, true),
            requiredTextureProperties: __spreadArray([], exports.DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES, true), passes: { forward: forward, shadow: shadow },
        },
    };
}
function dsfxMatcapSourcePass(extraction, expected) {
    var _a, _b, _c, _d, _e;
    var program = extraction.gles3Programs.find(function (item) { return item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
    var binding = extraction.bindings.find(function (item) { return item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
    if (!program || !binding || typeof program.glsl !== 'string')
        return null;
    return __assign(__assign({}, expected), { parameterRecordSha256: (_a = binding.parameterRecordSha256) !== null && _a !== void 0 ? _a : '', keywordIndices: __spreadArray([], binding.keywordIndices, true), keywordNames: __spreadArray([], binding.keywordNames, true), programHash: (_b = program.programHash) !== null && _b !== void 0 ? _b : '', programDataSha256: (_c = program.programDataSha256) !== null && _c !== void 0 ? _c : '', programDataLength: (_d = program.programDataLength) !== null && _d !== void 0 ? _d : -1, programRecordSha256: (_e = program.recordSha256) !== null && _e !== void 0 ? _e : '', requiredAttributes: __spreadArray([], expected.requiredAttributes, true), requiredUniforms: __spreadArray([], expected.requiredUniforms, true), glsl: program.glsl });
}
function dsfxMatcapShaderExtractionEvidence(shader) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!(shader === null || shader === void 0 ? void 0 : shader.extraction))
        return { error: (shader === null || shader === void 0 ? void 0 : shader.extractionError) ? "source extraction failed: ".concat(shader.extractionError) : 'source shader extraction is missing' };
    var extraction = shader.extraction;
    var sourceReference = (_a = extraction.shader) === null || _a === void 0 ? void 0 : _a.sourceReference;
    if (((_b = shader.programBlobSha256) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== exports.DSFX_MATCAP_PROGRAM_BLOB_SHA256
        || referenceKey(shader.sourceReference) !== referenceKey(exports.DSFX_MATCAP_SOURCE_REFERENCE)
        || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
        || extraction.fingerprint !== exports.DSFX_MATCAP_FINGERPRINT
        || extraction.compressedBlobSha256 !== exports.DSFX_MATCAP_PROGRAM_BLOB_SHA256
        || referenceKey(sourceReference) !== referenceKey(exports.DSFX_MATCAP_SOURCE_REFERENCE)
        || normalizedShaderIdentity((_c = extraction.shader) === null || _c === void 0 ? void 0 : _c.name) !== normalizedShaderIdentity(exports.DSFX_MATCAP_SHADER_NAME)
        || !exactArray((_d = extraction.shader) === null || _d === void 0 ? void 0 : _d.keywordNames, exports.DSFX_MATCAP_SHADER_KEYWORDS)
        || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
        return { error: 'source extraction metadata is incomplete or does not match the verified Matcap shader object' };
    }
    var expectedPrograms = Object.values(DSFX_MATCAP_PASS_SPECS);
    if (extraction.gles3Programs.length !== expectedPrograms.length
        || extraction.programs.filter(function (item) { return item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4; }).length !== expectedPrograms.length) {
        return { error: 'source extraction does not contain the complete GLES3 Matcap program set' };
    }
    var _loop_2 = function (expected) {
        var program = extraction.gles3Programs.find(function (item) { return item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
        var complete = extraction.programs.find(function (item) { return item.kind === 'program' && item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
        var binding = extraction.bindings.find(function (item) { return item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
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
            return { value: { error: "source extraction Matcap ".concat(expected.variant, " ").concat(expected.pass, " record does not match the verified source") } };
        }
        for (var _l = 0, _m = expected.requiredAttributes; _l < _m.length; _l++) {
            var attribute = _m[_l];
            if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute)))
                return { value: { error: "source extraction Matcap ".concat(expected.variant, " ").concat(expected.pass, " source is missing ").concat(attribute) } };
        }
        for (var _o = 0, _p = expected.requiredUniforms; _o < _p.length; _o++) {
            var uniform = _p[_o];
            if (!new RegExp("\\b".concat(uniform.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), "\\b")).test(program.glsl))
                return { value: { error: "source extraction Matcap ".concat(expected.variant, " ").concat(expected.pass, " source is missing ").concat(uniform) } };
        }
    };
    for (var _i = 0, expectedPrograms_2 = expectedPrograms; _i < expectedPrograms_2.length; _i++) {
        var expected = expectedPrograms_2[_i];
        var state_2 = _loop_2(expected);
        if (typeof state_2 === "object")
            return state_2.value;
    }
    var passes = (_f = (_e = shader.subShaders) === null || _e === void 0 ? void 0 : _e.flatMap(function (subShader) { var _a; return (_a = subShader.passes) !== null && _a !== void 0 ? _a : []; })) !== null && _f !== void 0 ? _f : [];
    if (((_g = shader.subShaders) === null || _g === void 0 ? void 0 : _g.length) !== 1 || passes.length !== 2)
        return { error: "shader pass count is ".concat(passes.length, ", expected 2") };
    var expectedSourceStates = [
        { name: 'Forward', zWrite: 0, zWriteProperty: '_ZWrite_Mode', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 5, destinationBlendAlpha: 10, colorMask: 15 },
        { name: 'ShadowCaster', zWrite: 1, zWriteProperty: '<noninit>', zTest: 4, zTestProperty: '<noninit>', culling: 0, cullingProperty: '_Cull_Mode', sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0, colorMask: 0 },
    ];
    var _loop_3 = function (index, expected) {
        var pass = passes[index], blend = sourceStateRecord(pass === null || pass === void 0 ? void 0 : pass.state, 'rtBlend0');
        var tagsValue = findState(pass === null || pass === void 0 ? void 0 : pass.state, ['m_Tags']);
        var tags = tagsValue && typeof tagsValue === 'object' && Array.isArray(tagsValue.tags)
            ? new Map((tagsValue.tags).filter(function (item) { return Array.isArray(item) && item.length >= 2; }).map(function (item) { return [String(item[0]), String(item[1])]; }))
            : new Map();
        var expectedTags = new Map([
            ['LIGHTMODE', index === 0 ? 'UniversalForwardOnly' : 'SHADOWCASTER'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'],
            ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque'],
        ]);
        if ((pass === null || pass === void 0 ? void 0 : pass.type) !== 0 || pass.name !== '' || sourceStateName(pass.state, 'm_Name') !== expected.name
            || sourceStateValue(pass.state, 'zWrite') !== expected.zWrite || sourceStateName(pass.state, 'zWrite') !== expected.zWriteProperty
            || sourceStateValue(pass.state, 'zTest') !== expected.zTest || sourceStateName(pass.state, 'zTest') !== expected.zTestProperty
            || sourceStateValue(pass.state, 'culling') !== expected.culling || sourceStateName(pass.state, 'culling') !== expected.cullingProperty
            || !blend || sourceStateValue(blend, 'srcBlend') !== expected.sourceBlend || sourceStateValue(blend, 'destBlend') !== expected.destinationBlend
            || sourceStateValue(blend, 'srcBlendAlpha') !== expected.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== expected.destinationBlendAlpha
            || sourceStateValue(blend, 'blendOp') !== 0 || sourceStateValue(blend, 'blendOpAlpha') !== 0 || sourceStateValue(blend, 'colMask') !== expected.colorMask
            || sourceStateValue(pass.state, 'offsetFactor') !== 0 || sourceStateValue(pass.state, 'offsetUnits') !== 0
            || findState(pass.state, ['lighting']) !== false || tags.size !== expectedTags.size
            || __spreadArray([], expectedTags, true).some(function (_a) {
                var key = _a[0], value = _a[1];
                return tags.get(key) !== value;
            })) {
            return { value: { error: "shader ".concat(expected.name, " render state or tags are not the verified Matcap source state") } };
        }
    };
    for (var _h = 0, _j = expectedSourceStates.entries(); _h < _j.length; _h++) {
        var _k = _j[_h], index = _k[0], expected = _k[1];
        var state_3 = _loop_3(index, expected);
        if (typeof state_3 === "object")
            return state_3.value;
    }
    var forward = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.forward);
    var forwardInstanced = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.forwardInstanced);
    var shadow = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.shadow);
    var shadowInstanced = dsfxMatcapSourcePass(extraction, DSFX_MATCAP_PASS_SPECS.shadowInstanced);
    if (!forward || !forwardInstanced || !shadow || !shadowInstanced)
        return { error: 'source extraction Matcap pass metadata is incomplete' };
    return {
        source: {
            schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion, unityVersion: extraction.unityVersion,
            fingerprint: extraction.fingerprint, sourceReference: exports.DSFX_MATCAP_SOURCE_REFERENCE,
            compressedBlobSha256: extraction.compressedBlobSha256, shaderName: exports.DSFX_MATCAP_SHADER_NAME,
            shaderKeywordNames: __spreadArray([], exports.DSFX_MATCAP_SHADER_KEYWORDS, true), requiredProperties: __spreadArray([], exports.DSFX_MATCAP_REQUIRED_PROPERTIES, true),
            requiredTextureProperties: __spreadArray([], exports.DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES, true),
            passes: { forward: forward, forwardInstanced: forwardInstanced, shadow: shadow, shadowInstanced: shadowInstanced },
        },
    };
}
function dsfxGlitchMaterialEvidence(material, shader, state, extractionEvidence) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    if ('error' in extractionEvidence)
        return extractionEvidence.error;
    var names = shaderPropertyNames(shader);
    if (!exactArray(names, exports.DSFX_GLITCH_TEX_REQUIRED_PROPERTIES))
        return 'shader declarations do not match the verified Glitch_Tex property set';
    if (!exactArray((_a = material.keywords) !== null && _a !== void 0 ? _a : [], []))
        return 'shader keywords are active';
    var expectedFloats = { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 };
    var actualFloats = (_b = material.floatProperties) !== null && _b !== void 0 ? _b : {};
    if (Object.keys(actualFloats).length !== Object.keys(expectedFloats).length
        || Object.entries(expectedFloats).some(function (_a) {
            var name = _a[0], value = _a[1];
            return finiteNumber(actualFloats[name]) !== value;
        })
        || Object.keys((_c = material.intProperties) !== null && _c !== void 0 ? _c : {}).length || Object.keys((_d = material.colorProperties) !== null && _d !== void 0 ? _d : {}).length)
        return 'material scalar/color properties do not match the verified Glitch_Tex state';
    var textures = (_e = material.textures) !== null && _e !== void 0 ? _e : [];
    if (textures.length !== 2 || !exactArray(textures.map(function (texture) { return texture.name; }), exports.DSFX_GLITCH_TEX_REQUIRED_TEXTURE_PROPERTIES))
        return 'material texture properties do not match the verified Glitch_Tex state';
    var main = textures[0], noise = textures[1];
    if (!main.texture || main.texture.pathId !== '0' || main.texture.file.toLowerCase() !== material.file.toLowerCase()
        || main.textureReference !== null || ((_f = main.scale) === null || _f === void 0 ? void 0 : _f.x) !== 1 || ((_g = main.scale) === null || _g === void 0 ? void 0 : _g.y) !== 1 || ((_h = main.offset) === null || _h === void 0 ? void 0 : _h.x) !== 0 || ((_j = main.offset) === null || _j === void 0 ? void 0 : _j.y) !== 0)
        return 'Glitch_Tex _MainTex is not the source-authorized Unity white default binding';
    if (!noise.texture || noise.texture.pathId !== '277634516359511144' || noise.texture.file.toLowerCase() !== 'cab-39fe55e8868aab69e2cf9a8ae5dcef67'
        || referenceKey(noise.textureReference) !== '1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74:cab-39fe55e8868aab69e2cf9a8ae5dcef67:277634516359511144'
        || ((_k = noise.scale) === null || _k === void 0 ? void 0 : _k.x) !== 1 || ((_l = noise.scale) === null || _l === void 0 ? void 0 : _l.y) !== 1 || ((_m = noise.offset) === null || _m === void 0 ? void 0 : _m.x) !== 0 || ((_o = noise.offset) === null || _o === void 0 ? void 0 : _o.y) !== 0)
        return 'Glitch_Tex _NoiseTex does not match the verified source texture identity';
    var resolvedNoise = (_p = material.resolvedTextures) === null || _p === void 0 ? void 0 : _p.find(function (item) { return item.property === '_NoiseTex'; });
    if (!resolvedNoise || resolvedNoise.width !== 256 || resolvedNoise.height !== 256
        || referenceKey(resolvedNoise.sourceReference) !== referenceKey(noise.textureReference)
        || ((_q = material.resolvedTextures) === null || _q === void 0 ? void 0 : _q.some(function (item) { return item.property !== '_NoiseTex'; })))
        return 'Glitch_Tex resolved _NoiseTex dimensions or identity are not exact';
    var expectedState = { alphaMode: 'BLEND', layer: 'transparent', depthWrite: false, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, sourceQueue: -1, polygonOffsetFactor: 0, polygonOffsetUnits: 0 };
    if (!state || state.alphaMode !== expectedState.alphaMode || state.layer !== expectedState.layer || state.depthWrite !== expectedState.depthWrite
        || state.depthTest !== expectedState.depthTest || state.depthFunction !== expectedState.depthFunction || state.cullMode !== expectedState.cullMode
        || state.doubleSided !== expectedState.doubleSided || state.sourceQueue !== expectedState.sourceQueue
        || state.polygonOffsetFactor !== expectedState.polygonOffsetFactor || state.polygonOffsetUnits !== expectedState.polygonOffsetUnits
        || state.blend.source !== 5 || state.blend.destination !== 10 || state.blend.sourceAlpha !== 5 || state.blend.destinationAlpha !== 10
        || state.blend.operation !== 0 || state.blend.operationAlpha !== 0)
        return 'translated render state is not the verified Glitch_Tex state';
    return null;
}
function dsfxMatcapMaterialEvidence(material, shader, state, extractionEvidence) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    if ('error' in extractionEvidence)
        return extractionEvidence.error;
    if (referenceKey(material.sourceReference) !== referenceKey(exports.DSFX_MATCAP_MATERIAL_REFERENCE))
        return 'material object identity does not match the verified CH0191 Matcap material';
    if (!exactArray(shaderPropertyNames(shader), exports.DSFX_MATCAP_REQUIRED_PROPERTIES))
        return 'shader declarations do not match the verified Matcap property set';
    if (!exactArray((_a = material.keywords) !== null && _a !== void 0 ? _a : [], []))
        return 'shader keywords are active';
    var glsl = Object.values(extractionEvidence.source.passes).map(function (pass) { return pass.glsl; }).join('\n');
    for (var _i = 0, DSFX_MATCAP_INERT_PROPERTIES_1 = DSFX_MATCAP_INERT_PROPERTIES; _i < DSFX_MATCAP_INERT_PROPERTIES_1.length; _i++) {
        var inert = DSFX_MATCAP_INERT_PROPERTIES_1[_i];
        if (dsfxGlslIdentifier(glsl, inert))
            return "source extraction GLSL declares or consumes inert Matcap property ".concat(inert);
    }
    var expectedFloats = __assign(__assign({}, exports.DSFX_MATCAP_INERT_FLOAT_PROPERTIES), { _ZWrite_Mode: 1, _Cull_Mode: 2 });
    var actualFloats = (_b = material.floatProperties) !== null && _b !== void 0 ? _b : {};
    if (Object.keys(actualFloats).length !== Object.keys(expectedFloats).length
        || Object.entries(expectedFloats).some(function (_a) {
            var name = _a[0], value = _a[1];
            return finiteNumber(actualFloats[name]) !== value;
        })
        || Object.keys((_c = material.intProperties) !== null && _c !== void 0 ? _c : {}).length)
        return 'material scalar/color properties do not match the verified Matcap state';
    var expectedColors = __assign(__assign({}, exports.DSFX_MATCAP_INERT_COLOR_PROPERTIES), { _Main_Color: {
            r: exports.DSFX_MATCAP_MAIN_COLOR[0], g: exports.DSFX_MATCAP_MAIN_COLOR[1], b: exports.DSFX_MATCAP_MAIN_COLOR[2], a: exports.DSFX_MATCAP_MAIN_COLOR[3],
        } });
    var colorMatches = function (actual, expected) {
        if (!actual || typeof actual !== 'object')
            return false;
        var value = actual;
        return ['r', 'g', 'b', 'a'].every(function (component) { return Object.prototype.hasOwnProperty.call(value, component)
            && finiteNumber(value[component]) === expected[component]; });
    };
    var actualColors = (_d = material.colorProperties) !== null && _d !== void 0 ? _d : {};
    if (Object.keys(actualColors).length !== Object.keys(expectedColors).length
        || Object.keys(actualColors).some(function (name) { return !Object.prototype.hasOwnProperty.call(expectedColors, name); })
        || Object.entries(expectedColors).some(function (_a) {
            var name = _a[0], value = _a[1];
            return !colorMatches(actualColors[name], value);
        }))
        return 'material scalar/color properties do not match the verified Matcap state';
    var mainColor = (_e = material.colorProperties) === null || _e === void 0 ? void 0 : _e._Main_Color;
    var color = mainColor ? [mainColor.r, mainColor.g, mainColor.b, mainColor.a].map(Number) : [];
    if (color.length !== 4 || !color.every(Number.isFinite) || !exactArray(color, exports.DSFX_MATCAP_MAIN_COLOR))
        return 'material _Main_Color is missing or invalid';
    var zWrite = finiteNumber((_f = material.floatProperties) === null || _f === void 0 ? void 0 : _f._ZWrite_Mode);
    var culling = finiteNumber((_g = material.floatProperties) === null || _g === void 0 ? void 0 : _g._Cull_Mode);
    if (zWrite !== 1 || culling !== 2)
        return 'material _ZWrite_Mode or _Cull_Mode is missing or invalid';
    var textures = (_h = material.textures) !== null && _h !== void 0 ? _h : [];
    if (textures.length !== 3 || !exactArray(textures.map(function (texture) { return texture.name; }), ['_Main_Tex', '_Matcap_Tex', '_texcoord']))
        return 'material texture properties do not match the verified Matcap state';
    var expectedTextureReferences = { _Main_Tex: exports.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE, _Matcap_Tex: exports.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE };
    var _loop_4 = function (index, property) {
        var texture = textures.find(function (item) { return item.name === index; });
        if (!(texture === null || texture === void 0 ? void 0 : texture.texture) || String(texture.texture.pathId) === '0') {
            if (property)
                return { value: "Matcap ".concat(index, " source texture reference is missing") };
            if ((texture === null || texture === void 0 ? void 0 : texture.textureReference) !== null)
                return { value: 'Matcap _texcoord default binding is not the source null pointer' };
            return "continue";
        }
        if (!property || !texture.textureReference
            || texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
            || String(texture.texture.pathId) !== texture.textureReference.objectId
            || referenceKey(texture.textureReference) !== referenceKey(expectedTextureReferences[index]))
            return { value: "Matcap ".concat(index, " source texture identity is not exact") };
        if (((_j = texture.scale) === null || _j === void 0 ? void 0 : _j.x) !== 1 || ((_k = texture.scale) === null || _k === void 0 ? void 0 : _k.y) !== 1 || ((_l = texture.offset) === null || _l === void 0 ? void 0 : _l.x) !== 0 || ((_m = texture.offset) === null || _m === void 0 ? void 0 : _m.y) !== 0)
            return { value: "Matcap ".concat(index, " texture transform is not the authored identity") };
    };
    for (var _t = 0, _u = [['_Main_Tex', true], ['_Matcap_Tex', true], ['_texcoord', false]]; _t < _u.length; _t++) {
        var _v = _u[_t], index = _v[0], property = _v[1];
        var state_4 = _loop_4(index, property);
        if (typeof state_4 === "object")
            return state_4.value;
    }
    var texcoord = textures.find(function (texture) { return texture.name === '_texcoord'; });
    if (!texcoord || ((_o = texcoord.scale) === null || _o === void 0 ? void 0 : _o.x) !== 1 || ((_p = texcoord.scale) === null || _p === void 0 ? void 0 : _p.y) !== 1 || ((_q = texcoord.offset) === null || _q === void 0 ? void 0 : _q.x) !== 0 || ((_r = texcoord.offset) === null || _r === void 0 ? void 0 : _r.y) !== 0)
        return 'Matcap _texcoord transform is not the authored identity';
    var resolved = (_s = material.resolvedTextures) !== null && _s !== void 0 ? _s : [];
    if (resolved.length !== 2 || !exactArray(resolved.map(function (texture) { return texture.property; }), ['_Main_Tex', '_Matcap_Tex'])
        || resolved.some(function (texture) { return !texture.sourceReference || positiveInteger(texture.width) === null || positiveInteger(texture.height) === null; }))
        return 'resolved Matcap texture identities or dimensions are incomplete';
    var _loop_5 = function (property) {
        var source = textures.find(function (texture) { return texture.name === property; });
        var resolvedTexture = resolved.find(function (texture) { return texture.property === property; });
        if (!(source === null || source === void 0 ? void 0 : source.textureReference) || !(resolvedTexture === null || resolvedTexture === void 0 ? void 0 : resolvedTexture.sourceReference) || referenceKey(source.textureReference) !== referenceKey(resolvedTexture.sourceReference)
            || resolvedTexture.width !== 64 || resolvedTexture.height !== 64)
            return { value: "resolved ".concat(property, " identity does not match the serialized source reference") };
    };
    for (var _w = 0, DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES_1 = exports.DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES; _w < DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES_1.length; _w++) {
        var property = DSFX_MATCAP_REQUIRED_TEXTURE_PROPERTIES_1[_w];
        var state_5 = _loop_5(property);
        if (typeof state_5 === "object")
            return state_5.value;
    }
    var expectedState = { alphaMode: 'BLEND', layer: 'transparent', depthWrite: true, depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false, sourceQueue: -1, polygonOffsetFactor: 0, polygonOffsetUnits: 0 };
    if (!state || state.alphaMode !== expectedState.alphaMode || state.layer !== expectedState.layer || state.depthWrite !== expectedState.depthWrite
        || state.depthTest !== expectedState.depthTest || state.depthFunction !== expectedState.depthFunction || state.cullMode !== expectedState.cullMode
        || state.doubleSided !== expectedState.doubleSided || state.sourceQueue !== expectedState.sourceQueue
        || state.polygonOffsetFactor !== expectedState.polygonOffsetFactor || state.polygonOffsetUnits !== expectedState.polygonOffsetUnits
        || state.blend.source !== 5 || state.blend.destination !== 10 || state.blend.sourceAlpha !== 5 || state.blend.destinationAlpha !== 10
        || state.blend.operation !== 0 || state.blend.operationAlpha !== 0)
        return 'translated render state is not the verified Matcap state';
    return null;
}
function dsfxStaticPassEvidence(rule, shader) {
    var _a, _b;
    if (!(shader === null || shader === void 0 ? void 0 : shader.programBlobSha256))
        return 'shader program identity is missing';
    if (shader.programBlobSha256.toLowerCase() !== rule.programBlobSha256)
        return 'shader program identity does not match the verified BAAD version';
    if (referenceKey(shader.sourceReference) !== referenceKey(rule.sourceReference))
        return 'shader source reference does not match the verified BAAD object';
    var names = shaderPropertyNames(shader);
    var expectedNames = __spreadArray([], rule.propertyNames, true);
    if (names.length !== expectedNames.length || new Set(names).size !== names.length
        || expectedNames.some(function (name) { return !names.includes(name); })) {
        var missing = expectedNames.filter(function (name) { return !names.includes(name); });
        var extra = names.filter(function (name) { return !expectedNames.includes(name); });
        return "shader declarations do not match the verified static set".concat(missing.length ? "; missing ".concat(missing.join(', ')) : '').concat(extra.length ? "; unexpected ".concat(extra.join(', ')) : '');
    }
    var passes = (_b = (_a = shader.subShaders) === null || _a === void 0 ? void 0 : _a.flatMap(function (subShader) { var _a; return (_a = subShader.passes) !== null && _a !== void 0 ? _a : []; })) !== null && _b !== void 0 ? _b : [];
    if (passes.length !== rule.passes.length)
        return "shader pass count is ".concat(passes.length, ", expected ").concat(rule.passes.length);
    for (var _i = 0, _c = rule.passes.entries(); _i < _c.length; _i++) {
        var _d = _c[_i], index = _d[0], expected = _d[1];
        var pass = passes[index];
        var actualName = findState(pass === null || pass === void 0 ? void 0 : pass.state, ['m_Name']);
        if (actualName !== expected.name)
            return "shader pass ".concat(index, " is not the verified ").concat(expected.name, " pass");
        var expectedState = expected.states;
        var values = {
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
        };
        for (var _e = 0, _f = Object.entries(values); _e < _f.length; _e++) {
            var _g = _f[_e], key = _g[0], value = _g[1];
            if (sourceStateValue(pass === null || pass === void 0 ? void 0 : pass.state, key) !== value)
                return "shader pass ".concat(index, " ").concat(key, " state is not ").concat(value);
        }
        if (findState(pass === null || pass === void 0 ? void 0 : pass.state, ['lighting']) !== expectedState.lighting)
            return "shader pass ".concat(index, " lighting state is not ").concat(expectedState.lighting);
    }
    return null;
}
var DSFX_STATIC_STATE_PROPERTIES = new Set([
    '_AlphaClip', '_Blend', '_BlendOp', '_ColorMode', '_Cull', '_Cull_Mode', '_Cutoff', '_DstBlend',
    '_DstBlendAlpha', '_Main_Texture_No', '_Mode', '_Multiply', '_QueueOffset', '_RGBRGBA', '_SrcBlend',
    '_SrcBlendAlpha', '_Surface', '_ZOffsetFactor', '_ZOffsetUnits', '_ZTest', '_ZTest_Mode', '_ZWrite',
    '_ZWrite_Mode',
]);
// These names are serialized on many DSFX materials even when the linked
// shader does not declare them.  A nonzero gate is still proof that the
// material is asking for a dynamic path, so it must never become static output.
var DSFX_DYNAMIC_GATE_PATTERN = /(?:custom.*(?:use|enabled|mode)$|(?:distortion|softparticles|camera.*fad(?:e|ing)|emission|lighting|flipbook|glitch|step|disappear).*(?:use|enabled|mode|blending)$)/i;
var DSFX_DYNAMIC_VALUE_PATTERN = /(?:custom|distort|^_dis_|speed|power|strength|camera.*fade|softparticle|flipbook|emission|lighting|step|disappear|glitch|vertex|reflect|spec|environment|glossy|radius|intensity|time)/i;
function dsfxGlslIdentifier(glsl, name) {
    return new RegExp("\\b".concat(name, "\\b")).test(glsl);
}
function dsfxStaticSourceStateEvidence(shader, forwardDestinationBlend, shaderLabel) {
    var _a, _b, _c, _d;
    var passes = (_b = (_a = shader === null || shader === void 0 ? void 0 : shader.subShaders) === null || _a === void 0 ? void 0 : _a.flatMap(function (subShader) { var _a; return (_a = subShader.passes) !== null && _a !== void 0 ? _a : []; })) !== null && _b !== void 0 ? _b : [];
    if (((_c = shader === null || shader === void 0 ? void 0 : shader.subShaders) === null || _c === void 0 ? void 0 : _c.length) !== 1 || passes.length !== 2)
        return "shader pass count is ".concat(passes.length, ", expected 2");
    var expected = [
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
    ];
    var _loop_6 = function (index, source) {
        var pass = passes[index];
        var blend = sourceStateRecord(pass === null || pass === void 0 ? void 0 : pass.state, 'rtBlend0');
        var tagsValue = findState(pass === null || pass === void 0 ? void 0 : pass.state, ['m_Tags']);
        var tags = tagsValue && typeof tagsValue === 'object' && Array.isArray(tagsValue.tags)
            ? new Map((tagsValue.tags).filter(function (item) { return Array.isArray(item) && item.length >= 2; }).map(function (item) { return [String(item[0]), String(item[1])]; }))
            : new Map();
        if ((pass === null || pass === void 0 ? void 0 : pass.type) !== 0 || ((_d = pass.name) !== null && _d !== void 0 ? _d : '') !== '' || sourceStateName(pass.state, 'm_Name') !== source.name
            || sourceStateValue(pass.state, 'zWrite') !== source.zWrite || sourceStateName(pass.state, 'zWrite') !== source.zWriteProperty
            || sourceStateValue(pass.state, 'zTest') !== source.zTest || sourceStateName(pass.state, 'zTest') !== source.zTestProperty
            || sourceStateValue(pass.state, 'culling') !== source.culling || sourceStateName(pass.state, 'culling') !== source.cullingProperty
            || sourceStateValue(pass.state, 'offsetFactor') !== source.offsetFactor || sourceStateName(pass.state, 'offsetFactor') !== source.offsetFactorProperty
            || sourceStateValue(pass.state, 'offsetUnits') !== source.offsetUnits || sourceStateName(pass.state, 'offsetUnits') !== source.offsetUnitsProperty
            || !blend || sourceStateValue(blend, 'srcBlend') !== source.sourceBlend || sourceStateValue(blend, 'destBlend') !== source.destinationBlend
            || sourceStateValue(blend, 'srcBlendAlpha') !== source.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== source.destinationBlend
            || sourceStateValue(blend, 'blendOp') !== 0 || sourceStateValue(blend, 'blendOpAlpha') !== 0 || sourceStateValue(blend, 'colMask') !== source.colorMask
            || findState(pass.state, ['lighting']) !== false || tags.size !== Object.keys(source.tags).length
            || Object.entries(source.tags).some(function (_a) {
                var key = _a[0], value = _a[1];
                return tags.get(key) !== value;
            })) {
            return { value: "shader ".concat(source.name, " render state or tags are not the verified ").concat(shaderLabel, " source state") };
        }
    };
    for (var _i = 0, _e = expected.entries(); _i < _e.length; _i++) {
        var _f = _e[_i], index = _f[0], source = _f[1];
        var state_6 = _loop_6(index, source);
        if (typeof state_6 === "object")
            return state_6.value;
    }
    return null;
}
function dsfxAdditiveSourceStateEvidence(shader) {
    return dsfxStaticSourceStateEvidence(shader, 1, 'Additive_0');
}
function dsfxAlphaBlendAddSourceStateEvidence(shader) {
    return dsfxStaticSourceStateEvidence(shader, 10, 'AlphaBlend_Add');
}
function dsfxAdditiveShaderExtractionEvidence(shader) {
    var _a, _b, _c, _d, _e;
    if (!(shader === null || shader === void 0 ? void 0 : shader.extraction))
        return { error: (shader === null || shader === void 0 ? void 0 : shader.extractionError) ? "source extraction failed: ".concat(shader.extractionError) : 'source shader extraction is missing' };
    var extraction = shader.extraction;
    var sourceReference = (_a = extraction.shader) === null || _a === void 0 ? void 0 : _a.sourceReference;
    if (((_b = shader.programBlobSha256) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== exports.DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256) {
        return { error: 'shader program identity does not match the verified Additive_0 source' };
    }
    if (referenceKey(shader.sourceReference) !== referenceKey(exports.DSFX_ADDITIVE_0_SOURCE_REFERENCE)
        || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
        || extraction.fingerprint !== exports.DSFX_ADDITIVE_0_FINGERPRINT
        || ((_c = extraction.compressedBlobSha256) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== exports.DSFX_ADDITIVE_0_PROGRAM_BLOB_SHA256
        || referenceKey(sourceReference) !== referenceKey(exports.DSFX_ADDITIVE_0_SOURCE_REFERENCE)
        || normalizedShaderIdentity((_d = extraction.shader) === null || _d === void 0 ? void 0 : _d.name) !== normalizedShaderIdentity(exports.DSFX_ADDITIVE_0_SHADER_NAME)
        || !exactArray((_e = extraction.shader) === null || _e === void 0 ? void 0 : _e.keywordNames, exports.DSFX_ADDITIVE_0_SHADER_KEYWORDS)
        || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
        return { error: 'source extraction metadata is incomplete or does not match the verified Additive_0 shader object' };
    }
    var expectedPrograms = exports.DSFX_ADDITIVE_0_GLES3_PROGRAMS;
    var gles3Programs = extraction.gles3Programs;
    var allGles3Programs = extraction.programs.filter(function (program) { return (program === null || program === void 0 ? void 0 : program.kind) === 'program' && program.platform === 9 && program.gpuProgramType === 4; });
    if (gles3Programs.length !== expectedPrograms.length || allGles3Programs.length !== expectedPrograms.length) {
        return { error: 'source extraction does not contain the complete GLES3 Additive_0 program set' };
    }
    var escape = function (value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var fullProgramFields = ['version', 'platformName', 'gpuProgramTypeName', 'sourceMap', 'offset', 'size', 'segment', 'keywords'];
    var interfaceNames = function (value) { return Array.isArray(value)
        ? value.map(function (item) { return typeof item === 'string' ? item : item && typeof item === 'object' && 'name' in item ? String(item.name) : ''; })
        : null; };
    var _loop_7 = function (index, expected) {
        var program = gles3Programs[index];
        var complete = allGles3Programs.find(function (item) { return item.blobIndex === expected.blobIndex; });
        var binding = extraction.bindings.find(function (item) { return item.platform === 9 && item.gpuProgramType === 4 && item.blobIndex === expected.blobIndex; });
        var fullProgram = program;
        var fullComplete = complete;
        var fullBinding = binding;
        var hasFullProgramFields = fullProgramFields.some(function (field) { return (fullProgram === null || fullProgram === void 0 ? void 0 : fullProgram[field]) !== undefined; })
            || (fullProgram === null || fullProgram === void 0 ? void 0 : fullProgram.attributes) !== undefined || (fullProgram === null || fullProgram === void 0 ? void 0 : fullProgram.uniforms) !== undefined;
        var fullProgramMatch = !hasFullProgramFields
            || fullProgram.version === expected.version && fullProgram.platformName === expected.platformName
                && fullProgram.gpuProgramTypeName === expected.gpuProgramTypeName && fullProgram.sourceMap === expected.sourceMap
                && fullProgram.offset === expected.offset && fullProgram.size === expected.size && fullProgram.segment === expected.segment
                && exactArray(fullProgram.keywords, expected.keywords)
                && (fullProgram.attributes === undefined || exactArray(interfaceNames(fullProgram.attributes), expected.programAttributes))
                && (fullProgram.uniforms === undefined || exactArray(interfaceNames(fullProgram.uniforms), expected.requiredUniforms));
        var fullCompleteMatch = !fullComplete || !hasFullProgramFields
            || fullComplete.version === expected.version && fullComplete.platformName === expected.platformName
                && fullComplete.gpuProgramTypeName === expected.gpuProgramTypeName && fullComplete.sourceMap === expected.sourceMap
                && fullComplete.offset === expected.offset && fullComplete.size === expected.size && fullComplete.segment === expected.segment
                && exactArray(fullComplete.keywords, expected.keywords)
                && (fullComplete.attributes === undefined || exactArray(interfaceNames(fullComplete.attributes), expected.programAttributes))
                && (fullComplete.uniforms === undefined || exactArray(interfaceNames(fullComplete.uniforms), expected.requiredUniforms));
        var sourceReferencesMatch = function (value) { return value === undefined || referenceKey(value) === referenceKey(exports.DSFX_ADDITIVE_0_SOURCE_REFERENCE); };
        if ((program === null || program === void 0 ? void 0 : program.kind) !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
            || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
            || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
            || program.recordSha256 !== expected.programRecordSha256 || typeof program.glsl !== 'string'
            || program.glsl.length !== expected.programDataLength || !program.glsl.includes('#version 300 es')
            || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')
            || !complete || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programHash
            || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
            || typeof complete.glsl !== 'string' || complete.glsl.length !== expected.programDataLength
            || !fullProgramMatch || !fullCompleteMatch || !sourceReferencesMatch(fullProgram.sourceReference) || !sourceReferencesMatch(fullComplete === null || fullComplete === void 0 ? void 0 : fullComplete.sourceReference)
            || !binding || binding.subShaderIndex !== 0 || binding.passIndex !== (expected.pass === 'forward' ? 0 : 1)
            || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
            || binding.blobIndex !== expected.blobIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
            || binding.platform !== 9 || binding.gpuProgramType !== 4
            || binding.parameterRecordSha256 !== expected.parameterRecordSha256
            || binding.programHash !== expected.programHash || binding.gles3ProgramHash !== expected.programHash
            || binding.programRecordSha256 !== expected.programRecordSha256
            || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.gpuProgramTypeName) !== undefined && fullBinding.gpuProgramTypeName !== 'GLES3')
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.playerGroupIndex) !== undefined && fullBinding.playerGroupIndex !== 3)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.playerIndex) !== undefined && fullBinding.playerIndex !== (expected.keywordNames.length ? 1 : 0))
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.subProgramIndex) !== undefined && fullBinding.subProgramIndex !== (expected.keywordNames.length ? 1 : 0))
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.shaderRequirements) !== undefined && fullBinding.shaderRequirements !== expected.shaderRequirements)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.sourceReference) !== undefined && !sourceReferencesMatch(fullBinding.sourceReference))) {
            return { value: { error: "source extraction Additive_0 ".concat(expected.pass, " record ").concat(index, " does not match the verified source") } };
        }
        var glsl = program.glsl;
        for (var _h = 0, _j = expected.requiredAttributes; _h < _j.length; _h++) {
            var attribute = _j[_h];
            if (!hasGlslDeclaration(glsl, 'in', sourceAttributeName(attribute)))
                return { value: { error: "source extraction Additive_0 ".concat(expected.pass, " source is missing ").concat(attribute) } };
        }
        for (var _k = 0, _l = expected.requiredUniforms; _k < _l.length; _k++) {
            var uniform = _l[_k];
            if (!new RegExp("\\b".concat(escape(uniform), "\\b")).test(glsl))
                return { value: { error: "source extraction Additive_0 ".concat(expected.pass, " source is missing ").concat(uniform) } };
        }
        for (var _m = 0, _o = ['_Time', 'unity_Time', 'gl_FragCoord', 'gl_FragDepth', 'gl_FragDepthEXT', 'sampler2DShadow', 'samplerCubeShadow', 'textureProj']; _m < _o.length; _m++) {
            var forbidden = _o[_m];
            if (dsfxGlslIdentifier(glsl, forbidden))
                return { value: { error: "source extraction Additive_0 GLSL uses forbidden dynamic/depth input ".concat(forbidden) } };
        }
    };
    for (var _i = 0, _f = expectedPrograms.entries(); _i < _f.length; _i++) {
        var _g = _f[_i], index = _g[0], expected = _g[1];
        var state_7 = _loop_7(index, expected);
        if (typeof state_7 === "object")
            return state_7.value;
    }
    return { source: extraction };
}
function dsfxAlphaBlendAddShaderExtractionEvidence(shader) {
    var _a, _b, _c, _d, _e;
    if (!(shader === null || shader === void 0 ? void 0 : shader.extraction))
        return { error: (shader === null || shader === void 0 ? void 0 : shader.extractionError) ? "source extraction failed: ".concat(shader.extractionError) : 'source shader extraction is missing' };
    var extraction = shader.extraction;
    var sourceReference = (_a = extraction.shader) === null || _a === void 0 ? void 0 : _a.sourceReference;
    if (((_b = shader.programBlobSha256) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== exports.DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256) {
        return { error: 'shader program identity does not match the verified AlphaBlend_Add source' };
    }
    if (referenceKey(shader.sourceReference) !== referenceKey(exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
        || extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3'
        || extraction.fingerprint !== exports.DSFX_ALPHA_BLEND_ADD_FINGERPRINT
        || ((_c = extraction.compressedBlobSha256) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== exports.DSFX_ALPHA_BLEND_ADD_PROGRAM_BLOB_SHA256
        || referenceKey(sourceReference) !== referenceKey(exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
        || normalizedShaderIdentity((_d = extraction.shader) === null || _d === void 0 ? void 0 : _d.name) !== normalizedShaderIdentity(exports.DSFX_ALPHA_BLEND_ADD_SHADER_NAME)
        || !exactArray((_e = extraction.shader) === null || _e === void 0 ? void 0 : _e.keywordNames, exports.DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS)
        || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs) || !Array.isArray(extraction.bindings)) {
        return { error: 'source extraction metadata is incomplete or does not match the verified AlphaBlend_Add shader object' };
    }
    var expectedPrograms = exports.DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS;
    var gles3Programs = extraction.gles3Programs;
    var allGles3Programs = extraction.programs.filter(function (program) { return (program === null || program === void 0 ? void 0 : program.kind) === 'program' && program.platform === 9 && program.gpuProgramType === 4; });
    var bindings = extraction.bindings.filter(function (binding) { return (binding === null || binding === void 0 ? void 0 : binding.platform) === 9 && binding.gpuProgramType === 4; });
    if (gles3Programs.length !== expectedPrograms.length || allGles3Programs.length !== expectedPrograms.length || bindings.length !== expectedPrograms.length) {
        return { error: 'source extraction does not contain the complete GLES3 AlphaBlend_Add program or binding set' };
    }
    var escape = function (value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var fullProgramFields = ['version', 'platformName', 'gpuProgramTypeName', 'sourceMap', 'offset', 'size', 'segment', 'keywords'];
    var interfaceNames = function (value) { return Array.isArray(value)
        ? value.map(function (item) { return typeof item === 'string' ? item : item && typeof item === 'object' && 'name' in item ? String(item.name) : ''; })
        : null; };
    var _loop_8 = function (index, expected) {
        var program = gles3Programs[index];
        var complete = allGles3Programs.find(function (item) { return item.blobIndex === expected.blobIndex; });
        var binding = bindings.find(function (item) { return item.blobIndex === expected.blobIndex; });
        var fullProgram = program;
        var fullComplete = complete;
        var fullBinding = binding;
        var hasFullProgramFields = fullProgramFields.some(function (field) { return (fullProgram === null || fullProgram === void 0 ? void 0 : fullProgram[field]) !== undefined; })
            || (fullProgram === null || fullProgram === void 0 ? void 0 : fullProgram.attributes) !== undefined || (fullProgram === null || fullProgram === void 0 ? void 0 : fullProgram.uniforms) !== undefined;
        var fullProgramMatch = !hasFullProgramFields
            || fullProgram.version === expected.version && fullProgram.platformName === expected.platformName
                && fullProgram.gpuProgramTypeName === expected.gpuProgramTypeName && fullProgram.sourceMap === expected.sourceMap
                && fullProgram.offset === expected.offset && fullProgram.size === expected.size && fullProgram.segment === expected.segment
                && exactArray(fullProgram.keywords, expected.keywords)
                && (fullProgram.attributes === undefined || exactArray(interfaceNames(fullProgram.attributes), expected.programAttributes))
                && (fullProgram.uniforms === undefined || exactArray(interfaceNames(fullProgram.uniforms), expected.requiredUniforms));
        var fullCompleteMatch = !fullComplete || !hasFullProgramFields
            || fullComplete.version === expected.version && fullComplete.platformName === expected.platformName
                && fullComplete.gpuProgramTypeName === expected.gpuProgramTypeName && fullComplete.sourceMap === expected.sourceMap
                && fullComplete.offset === expected.offset && fullComplete.size === expected.size && fullComplete.segment === expected.segment
                && exactArray(fullComplete.keywords, expected.keywords)
                && (fullComplete.attributes === undefined || exactArray(interfaceNames(fullComplete.attributes), expected.programAttributes))
                && (fullComplete.uniforms === undefined || exactArray(interfaceNames(fullComplete.uniforms), expected.requiredUniforms));
        var sourceReferencesMatch = function (value) { return value === undefined || referenceKey(value) === referenceKey(exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE); };
        if ((program === null || program === void 0 ? void 0 : program.kind) !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
            || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
            || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
            || program.recordSha256 !== expected.programRecordSha256 || typeof program.glsl !== 'string'
            || program.glsl.length !== expected.programDataLength || !program.glsl.includes('#version 300 es')
            || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')
            || !complete || complete.programHash !== expected.programHash || complete.programDataSha256 !== expected.programHash
            || complete.programDataLength !== expected.programDataLength || complete.recordSha256 !== expected.programRecordSha256
            || typeof complete.glsl !== 'string' || complete.glsl.length !== expected.programDataLength
            || !fullProgramMatch || !fullCompleteMatch || !sourceReferencesMatch(fullProgram.sourceReference) || !sourceReferencesMatch(fullComplete === null || fullComplete === void 0 ? void 0 : fullComplete.sourceReference)
            || !binding || binding.subShaderIndex !== 0 || binding.passIndex !== (expected.pass === 'forward' ? 0 : 1)
            || binding.passName !== '' || binding.stateName !== expected.stateName || binding.stage !== 'vertex'
            || binding.blobIndex !== expected.blobIndex || binding.parameterBlobIndex !== expected.parameterBlobIndex
            || binding.platform !== 9 || binding.gpuProgramType !== 4 || binding.parameterRecordSha256 !== expected.parameterRecordSha256
            || binding.programHash !== expected.programHash || binding.gles3ProgramHash !== expected.programHash
            || binding.programRecordSha256 !== expected.programRecordSha256
            || !exactArray(binding.keywordIndices, expected.keywordIndices) || !exactArray(binding.keywordNames, expected.keywordNames)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.gpuProgramTypeName) !== undefined && fullBinding.gpuProgramTypeName !== expected.gpuProgramTypeName)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.playerGroupIndex) !== undefined && fullBinding.playerGroupIndex !== expected.playerGroupIndex)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.playerIndex) !== undefined && fullBinding.playerIndex !== expected.playerIndex)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.subProgramIndex) !== undefined && fullBinding.subProgramIndex !== expected.subProgramIndex)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.shaderRequirements) !== undefined && fullBinding.shaderRequirements !== expected.shaderRequirements)
            || ((fullBinding === null || fullBinding === void 0 ? void 0 : fullBinding.sourceReference) !== undefined && !sourceReferencesMatch(fullBinding.sourceReference))) {
            return { value: { error: "source extraction AlphaBlend_Add ".concat(expected.pass, " record ").concat(index, " does not match the verified source") } };
        }
        for (var _h = 0, _j = expected.requiredAttributes; _h < _j.length; _h++) {
            var attribute = _j[_h];
            if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute)))
                return { value: { error: "source extraction AlphaBlend_Add ".concat(expected.pass, " source is missing ").concat(attribute) } };
        }
        for (var _k = 0, _l = expected.requiredUniforms; _k < _l.length; _k++) {
            var uniform = _l[_k];
            if (!new RegExp("\\b".concat(escape(uniform), "\\b")).test(program.glsl))
                return { value: { error: "source extraction AlphaBlend_Add ".concat(expected.pass, " source is missing ").concat(uniform) } };
        }
        for (var _m = 0, DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES_1 = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES; _m < DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES_1.length; _m++) {
            var inert = DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES_1[_m];
            if (dsfxGlslIdentifier(program.glsl, inert))
                return { value: { error: "source extraction AlphaBlend_Add GLSL declares or consumes Wakamo inert property ".concat(inert) } };
        }
        for (var _o = 0, _p = ['_Time', 'unity_Time', 'gl_FragCoord', 'gl_FragDepth', 'gl_FragDepthEXT', 'sampler2DShadow', 'samplerCubeShadow', 'textureProj']; _o < _p.length; _o++) {
            var forbidden = _p[_o];
            if (dsfxGlslIdentifier(program.glsl, forbidden))
                return { value: { error: "source extraction AlphaBlend_Add GLSL uses forbidden dynamic/depth input ".concat(forbidden) } };
        }
    };
    for (var _i = 0, _f = expectedPrograms.entries(); _i < _f.length; _i++) {
        var _g = _f[_i], index = _g[0], expected = _g[1];
        var state_8 = _loop_8(index, expected);
        if (typeof state_8 === "object")
            return state_8.value;
    }
    return { source: extraction };
}
function dsfxStaticShaderExtractionEvidence(rule, shader) {
    var _a, _b, _c, _d, _e, _f;
    if (rule.identity === 'dsfx/fx_shader_additive_0') {
        var names = shaderPropertyNames(shader);
        if (!exactArray(names, exports.DSFX_ADDITIVE_0_REQUIRED_PROPERTIES))
            return { error: 'shader declarations do not match the verified Additive_0 property set' };
        var extractionEvidence = dsfxAdditiveShaderExtractionEvidence(shader);
        if ('error' in extractionEvidence)
            return extractionEvidence;
        var stateError = dsfxAdditiveSourceStateEvidence(shader);
        return stateError ? { error: stateError } : extractionEvidence;
    }
    if (rule.identity === 'dsfx/fx_shader_alphablend_add') {
        var names = shaderPropertyNames(shader);
        if (!exactArray(names, exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES))
            return { error: 'shader declarations do not match the verified AlphaBlend_Add property set' };
        var extractionEvidence = dsfxAlphaBlendAddShaderExtractionEvidence(shader);
        if ('error' in extractionEvidence)
            return extractionEvidence;
        var stateError = dsfxAlphaBlendAddSourceStateEvidence(shader);
        return stateError ? { error: stateError } : extractionEvidence;
    }
    if (rule.identity !== 'dsfx/fx_shader_alphablend_0')
        return { source: null };
    var extraction = shader === null || shader === void 0 ? void 0 : shader.extraction;
    if (!extraction)
        return { error: (shader === null || shader === void 0 ? void 0 : shader.extractionError) ? "source extraction failed: ".concat(shader.extractionError) : 'source shader extraction is missing' };
    var extractionReference = (_a = extraction.shader) === null || _a === void 0 ? void 0 : _a.sourceReference;
    if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1
        || !/^2021\.3(?:\.|$)/.test(String((_b = extraction.unityVersion) !== null && _b !== void 0 ? _b : ''))
        || !/^[0-9a-f]{64}$/i.test(String((_c = extraction.fingerprint) !== null && _c !== void 0 ? _c : ''))
        || String((_d = extraction.compressedBlobSha256) !== null && _d !== void 0 ? _d : '').toLowerCase() !== rule.programBlobSha256
        || !extractionReference
        || typeof extractionReference.bundleSha256 !== 'string'
        || typeof extractionReference.serializedFile !== 'string'
        || typeof extractionReference.objectId !== 'string'
        || referenceKey(extractionReference) !== referenceKey(rule.sourceReference)
        || normalizedShaderIdentity((_e = extraction.shader) === null || _e === void 0 ? void 0 : _e.name) !== rule.identity
        || !Array.isArray((_f = extraction.shader) === null || _f === void 0 ? void 0 : _f.keywordNames)
        || !Array.isArray(extraction.programs) || !Array.isArray(extraction.gles3Programs)
        || !Array.isArray(extraction.bindings)) {
        return { error: 'source extraction metadata is incomplete or does not match the verified shader object' };
    }
    var expectedPrograms = exports.DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS;
    var gles3Programs = extraction.gles3Programs;
    if (gles3Programs.length !== expectedPrograms.length)
        return { error: "source extraction has ".concat(gles3Programs.length, " GLES3 programs, expected ").concat(expectedPrograms.length) };
    var allGles3Programs = extraction.programs.filter(function (program) { return (program === null || program === void 0 ? void 0 : program.kind) === 'program' && program.platform === 9 && program.gpuProgramType === 4; });
    if (allGles3Programs.length !== expectedPrograms.length)
        return { error: 'source extraction does not contain the complete GLES3 program records' };
    var _loop_9 = function (index, expected) {
        var program = gles3Programs[index];
        if ((program === null || program === void 0 ? void 0 : program.kind) !== 'program' || program.platform !== 9 || program.gpuProgramType !== 4
            || program.blobIndex !== expected.blobIndex || program.programHash !== expected.programHash
            || program.programDataSha256 !== expected.programHash || program.programDataLength !== expected.programDataLength
            || program.recordSha256 !== expected.recordSha256 || typeof program.glsl !== 'string'
            || !program.glsl.includes('#version 300 es')) {
            return { value: { error: "source extraction GLES3 program ".concat(index, " does not match the verified source record") } };
        }
        var record = allGles3Programs.find(function (item) { return item.blobIndex === expected.blobIndex; });
        if (!record || record.programHash !== expected.programHash || record.programDataSha256 !== expected.programHash
            || record.programDataLength !== expected.programDataLength || record.recordSha256 !== expected.recordSha256
            || typeof record.glsl !== 'string' || !record.glsl.includes('#version 300 es')) {
            return { value: { error: "source extraction GLES3 program ".concat(expected.blobIndex, " is not present in the complete record set") } };
        }
    };
    for (var _i = 0, _g = expectedPrograms.entries(); _i < _g.length; _i++) {
        var _h = _g[_i], index = _h[0], expected = _h[1];
        var state_9 = _loop_9(index, expected);
        if (typeof state_9 === "object")
            return state_9.value;
    }
    var gles3Bindings = extraction.bindings.filter(function (binding) { return (binding === null || binding === void 0 ? void 0 : binding.platform) === 9 && binding.gpuProgramType === 4; });
    if (gles3Bindings.length !== expectedPrograms.length
        || expectedPrograms.some(function (expected) { return !gles3Bindings.some(function (binding) { return binding.blobIndex === expected.blobIndex && binding.programHash === expected.programHash; }); })) {
        return { error: 'source extraction does not contain the complete GLES3 binding set' };
    }
    var glsl = __spreadArray(__spreadArray([], gles3Programs, true), allGles3Programs, true).map(function (program) { var _a; return (_a = program.glsl) !== null && _a !== void 0 ? _a : ''; }).join('\n');
    for (var _j = 0, _k = [
        '_Texture', '_Color', '_Custom_Data_Offset_Use',
        '_ShadowBias', '_LightDirection', '_ShadowCoordModifier', 'hlslcc_mtx4x4unity_MatrixVP',
    ]; _j < _k.length; _j++) {
        var required = _k[_j];
        if (!dsfxGlslIdentifier(glsl, required))
            return { error: "source extraction GLSL is missing required ".concat(required) };
    }
    for (var _l = 0, DSFX_ALPHA_BLEND_0_INERT_PROPERTIES_1 = DSFX_ALPHA_BLEND_0_INERT_PROPERTIES; _l < DSFX_ALPHA_BLEND_0_INERT_PROPERTIES_1.length; _l++) {
        var inert = DSFX_ALPHA_BLEND_0_INERT_PROPERTIES_1[_l];
        if (dsfxGlslIdentifier(glsl, inert))
            return { error: "source extraction GLSL declares or consumes inert property ".concat(inert) };
    }
    return { source: extraction };
}
function numericMaterialProperties(material) {
    var _a, _b;
    return new Map(__spreadArray(__spreadArray([], Object.entries((_a = material.floatProperties) !== null && _a !== void 0 ? _a : {}), true), Object.entries((_b = material.intProperties) !== null && _b !== void 0 ? _b : {}), true).flatMap(function (_a) {
        var name = _a[0], value = _a[1];
        var number = finiteNumber(value);
        return number === null ? [] : [[name, number]];
    }));
}
function dynamicGateNames(name, names) {
    var normalized = name.toLowerCase();
    if (normalized.includes('custom') || normalized.includes('disappear'))
        return names.filter(function (candidate) { return /custom|disappear/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    if (normalized.includes('distort') || normalized.startsWith('_dis_'))
        return names.filter(function (candidate) { return /distort|^_dis_/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    if (normalized.includes('camera') || normalized.includes('fade'))
        return names.filter(function (candidate) { return /camera.*fad(?:e|ing)/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    if (normalized.includes('softparticle'))
        return names.filter(function (candidate) { return /softparticle/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    if (normalized.includes('flipbook'))
        return names.filter(function (candidate) { return /flipbook/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    if (normalized.includes('emission'))
        return names.filter(function (candidate) { return /emission/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    if (normalized.includes('lighting'))
        return names.filter(function (candidate) { return /lighting/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    if (normalized.includes('step'))
        return names.filter(function (candidate) { return /step/i.test(candidate) && DSFX_DYNAMIC_GATE_PATTERN.test(candidate); });
    return [];
}
function dsfxStaticDynamicEvidence(material, shader, inertProperties) {
    var _a, _b, _c;
    if (inertProperties === void 0) { inertProperties = new Set(); }
    var serializedValues = __spreadArray(__spreadArray([], Object.entries((_a = material.floatProperties) !== null && _a !== void 0 ? _a : {}), true), Object.entries((_b = material.intProperties) !== null && _b !== void 0 ? _b : {}), true);
    for (var _i = 0, serializedValues_1 = serializedValues; _i < serializedValues_1.length; _i++) {
        var _d = serializedValues_1[_i], name_1 = _d[0], value = _d[1];
        if ((DSFX_DYNAMIC_VALUE_PATTERN.test(name_1) || DSFX_DYNAMIC_GATE_PATTERN.test(name_1)) && finiteNumber(value) === null) {
            return "".concat(name_1, " dynamic value is unresolved");
        }
    }
    var values = numericMaterialProperties(material);
    var names = __spreadArray([], values.keys(), true);
    var declared = new Set(shaderPropertyNames(shader));
    for (var _e = 0, values_1 = values; _e < values_1.length; _e++) {
        var _f = values_1[_e], name_2 = _f[0], value = _f[1];
        if (DSFX_STATIC_STATE_PROPERTIES.has(name_2))
            continue;
        if (inertProperties.has(name_2))
            continue;
        if (DSFX_DYNAMIC_GATE_PATTERN.test(name_2)) {
            if (value !== 0)
                return "".concat(name_2, " dynamic gate is active (").concat(value, ")");
            continue;
        }
        if (!DSFX_DYNAMIC_VALUE_PATTERN.test(name_2) || value === 0)
            continue;
        var gates = dynamicGateNames(name_2, names);
        if (gates.length && gates.every(function (gate) { return values.get(gate) === 0; }))
            continue;
        // A few Unity material serializers retain an unused scalar such as
        // _Step_Power after the linked shader has dropped that feature.  Ignore
        // those only when the shader does not declare the value and no gate exists;
        // all other dynamic controls remain fail-closed regardless of declaration.
        if (name_2 === '_Step_Power' && !gates.length && !declared.has(name_2))
            continue;
        return "".concat(name_2, " dynamic value is active (").concat(value, ")");
    }
    for (var _g = 0, _h = Object.entries((_c = material.colorProperties) !== null && _c !== void 0 ? _c : {}); _g < _h.length; _g++) {
        var _j = _h[_g], name_3 = _j[0], color = _j[1];
        if (name_3 === '_Color' || !DSFX_DYNAMIC_VALUE_PATTERN.test(name_3))
            continue;
        if (inertProperties.has(name_3))
            continue;
        var components = [color === null || color === void 0 ? void 0 : color.r, color === null || color === void 0 ? void 0 : color.g, color === null || color === void 0 ? void 0 : color.b, color === null || color === void 0 ? void 0 : color.a].map(finiteNumber);
        var active = components.some(function (value) { return value === null || value !== 0; });
        if (!active)
            continue;
        var gates = dynamicGateNames(name_3, names);
        if (gates.length && gates.every(function (gate) { return values.get(gate) === 0; }))
            continue;
        return "".concat(name_3, " dynamic color is active");
    }
    return null;
}
function dsfxStaticTextureEvidence(material) {
    var _a;
    var texture = material.textures.find(function (item) { return item.name === '_Texture'; });
    if (!(texture === null || texture === void 0 ? void 0 : texture.texture) || String(texture.texture.pathId) === '0')
        return 'exact _Texture reference is missing';
    if (!texture.textureReference)
        return 'exact _Texture source identity is missing';
    if (texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
        || String(texture.texture.pathId) !== texture.textureReference.objectId)
        return 'serialized _Texture pointer does not match its exact source identity';
    var resolved = (_a = material.resolvedTextures) === null || _a === void 0 ? void 0 : _a.find(function (item) { return item.property === '_Texture'; });
    if (!(resolved === null || resolved === void 0 ? void 0 : resolved.sourceReference) || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)) {
        return 'resolved _Texture identity does not match the serialized source reference';
    }
    if (positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null)
        return 'resolved _Texture dimensions are missing';
    var unsupported = material.textures.filter(function (item) { return item.name !== '_Texture' && item.texture && String(item.texture.pathId) !== '0'; });
    if (unsupported.length)
        return "unsupported texture properties are bound: ".concat(unsupported.map(function (item) { return item.name; }).join(', '));
    return null;
}
function sameNumber(actual, expected) {
    return actual === expected;
}
function dsfxStaticRenderStateVariant(rule, state) {
    if (!state)
        return null;
    var variants = rule.identity === 'dsfx/fx_shader_alphablend_0'
        ? exports.DSFX_ALPHA_BLEND_0_RENDER_STATE_VARIANTS
        : rule.identity === 'dsfx/fx_shader_additive_0'
            ? exports.DSFX_ADDITIVE_0_RENDER_STATE_VARIANTS
            : rule.identity === 'dsfx/fx_shader_alphablend_add'
                ? exports.DSFX_ALPHA_BLEND_ADD_RENDER_STATE_VARIANTS
                : { 'static-default': rule.renderState };
    var matches = function (expected) {
        if (state.alphaMode !== expected.alphaMode || state.layer !== expected.layer
            || state.depthWrite !== expected.depthWrite || state.depthTest !== expected.depthTest
            || state.depthFunction !== expected.depthFunction || state.cullMode !== expected.cullMode
            || state.doubleSided !== expected.doubleSided || state.polygonOffsetFactor !== expected.polygonOffsetFactor
            || state.polygonOffsetUnits !== expected.polygonOffsetUnits)
            return false;
        var blend = expected.blend;
        return sameNumber(state.blend.source, blend.source) && sameNumber(state.blend.destination, blend.destination)
            && sameNumber(state.blend.sourceAlpha, blend.sourceAlpha) && sameNumber(state.blend.destinationAlpha, blend.destinationAlpha)
            && sameNumber(state.blend.operation, blend.operation) && sameNumber(state.blend.operationAlpha, blend.operationAlpha);
    };
    for (var _i = 0, _a = Object.entries(variants); _i < _a.length; _i++) {
        var _b = _a[_i], variant = _b[0], expected = _b[1];
        if (matches(expected))
            return variant;
    }
    return null;
}
function dsfxStaticRenderStateEvidence(rule, state) {
    if (!state)
        return 'translated render state is missing';
    return dsfxStaticRenderStateVariant(rule, state) ? null : 'translated render state is not a verified static state variant';
}
function dsfxAdditiveMaterialEvidence(rule, material, shader, state, extractionEvidence) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    if ('error' in extractionEvidence)
        return extractionEvidence.error;
    if (!exactArray((_a = material.keywords) !== null && _a !== void 0 ? _a : [], []))
        return 'shader keywords are active';
    var floats = (_b = material.floatProperties) !== null && _b !== void 0 ? _b : {};
    var expectedFloats = {
        _Custom_Data_Offset_Use: [0], _ZWrite_Mode: [0], _ZOffsetFactor: [0], _ZOffsetUnits: [0], _ZTest_Mode: [4], _Cull_Mode: [0, 2],
    };
    if (Object.entries(expectedFloats).some(function (_a) {
        var name = _a[0], values = _a[1];
        var value = finiteNumber(floats[name]);
        return value === null || !values.includes(value);
    }))
        return 'material scalar properties do not match the verified Additive_0 state';
    if (Object.keys((_c = material.intProperties) !== null && _c !== void 0 ? _c : {}).length)
        return 'material integer properties are not part of the verified Additive_0 state';
    if (!colorVector((_d = material.colorProperties) === null || _d === void 0 ? void 0 : _d._Color))
        return 'material _Color is missing or invalid';
    var textures = (_e = material.textures) !== null && _e !== void 0 ? _e : [];
    var propertyNames = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], Object.keys(floats), true), Object.keys((_f = material.intProperties) !== null && _f !== void 0 ? _f : {}), true), Object.keys((_g = material.colorProperties) !== null && _g !== void 0 ? _g : {}), true), textures.map(function (texture) { return texture.name; }), true);
    if (propertyNames.length !== exports.DSFX_ADDITIVE_0_REQUIRED_PROPERTIES.length
        || new Set(propertyNames).size !== propertyNames.length
        || exports.DSFX_ADDITIVE_0_REQUIRED_PROPERTIES.some(function (name) { return !propertyNames.includes(name); })
        || textures.length !== 1 || !exactArray(textures.map(function (texture) { return texture.name; }), exports.DSFX_ADDITIVE_0_REQUIRED_TEXTURE_PROPERTIES)) {
        return 'material texture properties do not match the verified Additive_0 state';
    }
    if (((_h = textures[0].scale) === null || _h === void 0 ? void 0 : _h.x) !== 1 || ((_j = textures[0].scale) === null || _j === void 0 ? void 0 : _j.y) !== 1 || ((_k = textures[0].offset) === null || _k === void 0 ? void 0 : _k.x) !== 0 || ((_l = textures[0].offset) === null || _l === void 0 ? void 0 : _l.y) !== 0) {
        return 'material _Texture transform is not the verified Additive_0 state';
    }
    var textureError = dsfxStaticTextureEvidence(material);
    if (textureError)
        return textureError;
    if (((_m = material.resolvedTextures) !== null && _m !== void 0 ? _m : []).length !== 1 || ((_p = (_o = material.resolvedTextures) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.property) !== '_Texture') {
        return 'resolved Additive_0 texture properties do not match the verified source state';
    }
    return (_q = dsfxStaticDynamicEvidence(material, shader)) !== null && _q !== void 0 ? _q : dsfxStaticRenderStateEvidence(rule, state);
}
function dsfxWakamoEyeWhiteDefaultMaterialEvidence(rule, material, shader, state, extractionEvidence) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    if ('error' in extractionEvidence)
        return extractionEvidence.error;
    if (referenceKey(material.sourceReference) !== referenceKey(exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE)
        || referenceKey(material.shaderReference) !== referenceKey(exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE)
        || ((_a = material.shader) === null || _a === void 0 ? void 0 : _a.file.toLowerCase()) !== exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.serializedFile.toLowerCase()
        || String(material.shader.pathId) !== exports.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.objectId) {
        return 'material and shader references do not match the source-proven Wakamo eye material';
    }
    var shaderProperties = (_c = (_b = shader === null || shader === void 0 ? void 0 : shader.properties) === null || _b === void 0 ? void 0 : _b.m_Props) !== null && _c !== void 0 ? _c : [];
    var textureShaderProperty = shaderProperties.find(function (property) { return property.m_Name === '_Texture'; });
    var defaultTexture = textureShaderProperty === null || textureShaderProperty === void 0 ? void 0 : textureShaderProperty.m_DefTexture;
    if ((defaultTexture === null || defaultTexture === void 0 ? void 0 : defaultTexture.m_DefaultName) !== 'white' || finiteNumber(defaultTexture.m_TexDim) !== 2) {
        return 'shader _Texture property does not declare the source white 2D default';
    }
    if (material.renderQueue !== -1 || !exactArray((_d = material.keywords) !== null && _d !== void 0 ? _d : [], []))
        return 'material queue or keywords differ from the source-proven Wakamo eye material';
    var floats = (_e = material.floatProperties) !== null && _e !== void 0 ? _e : {};
    var expectedFloats = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_FLOAT_PROPERTIES;
    if (Object.keys(floats).length !== Object.keys(expectedFloats).length
        || Object.entries(expectedFloats).some(function (_a) {
            var name = _a[0], expected = _a[1];
            return finiteNumber(floats[name]) !== expected;
        })) {
        return 'material scalars differ from the source-proven Wakamo eye material';
    }
    if (Object.keys((_f = material.intProperties) !== null && _f !== void 0 ? _f : {}).length)
        return 'material integer properties differ from the source-proven Wakamo eye material';
    var colors = (_g = material.colorProperties) !== null && _g !== void 0 ? _g : {};
    var expectedColors = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_COLOR_PROPERTIES;
    if (Object.keys(colors).length !== Object.keys(expectedColors).length
        || Object.entries(expectedColors).some(function (_a) {
            var name = _a[0], expected = _a[1];
            var color = colors[name];
            if (!color || !['r', 'g', 'b', 'a'].every(function (component) { return Object.prototype.hasOwnProperty.call(color, component); }))
                return true;
            var actual = colorVector(color);
            return !actual || !exactArray(actual, [expected.r, expected.g, expected.b, expected.a]);
        }))
        return 'material colors differ from the source-proven Wakamo eye material';
    var textures = (_h = material.textures) !== null && _h !== void 0 ? _h : [];
    var texture = textures[0];
    if (textures.length !== 1 || (texture === null || texture === void 0 ? void 0 : texture.name) !== '_Texture' || !texture.texture
        || texture.texture.file.toLowerCase() !== exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE.serializedFile.toLowerCase()
        || String(texture.texture.pathId) !== '0' || texture.texture.externalGuid !== undefined && texture.texture.externalGuid !== null
        || texture.textureReference !== null || ((_j = texture.scale) === null || _j === void 0 ? void 0 : _j.x) !== 1 || ((_k = texture.scale) === null || _k === void 0 ? void 0 : _k.y) !== 1
        || ((_l = texture.offset) === null || _l === void 0 ? void 0 : _l.x) !== 0 || ((_m = texture.offset) === null || _m === void 0 ? void 0 : _m.y) !== 0 || ((_o = material.resolvedTextures) !== null && _o !== void 0 ? _o : []).length !== 0) {
        return 'material _Texture is not the source-proven null pointer with identity transform';
    }
    if (dsfxStaticRenderStateVariant(rule, state) !== 'depth-tested-back-cull')
        return 'render state differs from the source-proven Wakamo eye material';
    return (_p = dsfxStaticDynamicEvidence(material, shader, new Set(__spreadArray(__spreadArray([], exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_INERT_PROPERTIES, true), [
        '_Custom_Data_Offset_Use',
    ], false)))) !== null && _p !== void 0 ? _p : dsfxStaticRenderStateEvidence(rule, state);
}
function dsfxAlphaBlendAddMaterialEvidence(rule, material, shader, state, extractionEvidence) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    if ('error' in extractionEvidence)
        return extractionEvidence.error;
    if (referenceKey(material.sourceReference) === referenceKey(exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE)) {
        return dsfxWakamoEyeWhiteDefaultMaterialEvidence(rule, material, shader, state, extractionEvidence);
    }
    if (!exactArray((_a = material.keywords) !== null && _a !== void 0 ? _a : [], []))
        return 'shader keywords are active';
    var floats = (_b = material.floatProperties) !== null && _b !== void 0 ? _b : {};
    var expectedFloats = {
        _Custom_Data_Offset_Use: [0], _ZWrite_Mode: [0], _ZOffsetFactor: [0], _ZOffsetUnits: [0], _ZTest_Mode: [4],
        _Cull_Mode: [0, 2], _RGBRGBA: [0], _Main_Texture_No: [0],
    };
    if (Object.entries(expectedFloats).some(function (_a) {
        var name = _a[0], values = _a[1];
        var value = finiteNumber(floats[name]);
        return value === null || !values.includes(value);
    }) || finiteNumber(floats._Multiply) === null)
        return 'material scalar properties do not match the verified AlphaBlend_Add state';
    if (Object.keys((_c = material.intProperties) !== null && _c !== void 0 ? _c : {}).length)
        return 'material integer properties are not part of the verified AlphaBlend_Add state';
    if (!colorVector((_d = material.colorProperties) === null || _d === void 0 ? void 0 : _d._Color))
        return 'material _Color is missing or invalid';
    var textures = (_e = material.textures) !== null && _e !== void 0 ? _e : [];
    var propertyNames = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], Object.keys(floats), true), Object.keys((_f = material.intProperties) !== null && _f !== void 0 ? _f : {}), true), Object.keys((_g = material.colorProperties) !== null && _g !== void 0 ? _g : {}), true), textures.map(function (texture) { return texture.name; }), true);
    if (propertyNames.length !== exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES.length
        || new Set(propertyNames).size !== propertyNames.length
        || exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_PROPERTIES.some(function (name) { return !propertyNames.includes(name); })
        || textures.length !== 1 || !exactArray(textures.map(function (texture) { return texture.name; }), exports.DSFX_ALPHA_BLEND_ADD_REQUIRED_TEXTURE_PROPERTIES)) {
        return 'material texture properties do not match the verified AlphaBlend_Add state';
    }
    if (((_h = textures[0].scale) === null || _h === void 0 ? void 0 : _h.x) !== 1 || ((_j = textures[0].scale) === null || _j === void 0 ? void 0 : _j.y) !== 1 || ((_k = textures[0].offset) === null || _k === void 0 ? void 0 : _k.x) !== 0 || ((_l = textures[0].offset) === null || _l === void 0 ? void 0 : _l.y) !== 0) {
        return 'material _Texture transform is not the verified AlphaBlend_Add state';
    }
    if ((state === null || state === void 0 ? void 0 : state.sourceQueue) !== 3000)
        return 'material queue is not the verified AlphaBlend_Add state';
    var textureError = dsfxStaticTextureEvidence(material);
    if (textureError)
        return textureError;
    if (((_m = material.resolvedTextures) !== null && _m !== void 0 ? _m : []).length !== 1 || ((_p = (_o = material.resolvedTextures) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.property) !== '_Texture') {
        return 'resolved AlphaBlend_Add texture properties do not match the verified source state';
    }
    return (_q = dsfxStaticDynamicEvidence(material, shader)) !== null && _q !== void 0 ? _q : dsfxStaticRenderStateEvidence(rule, state);
}
function dsfxStaticMaterialEvidence(rule, material, shader, state, extractionEvidence) {
    var _a, _b, _c, _d;
    if (extractionEvidence === void 0) { extractionEvidence = dsfxStaticShaderExtractionEvidence(rule, shader); }
    if ('error' in extractionEvidence)
        return extractionEvidence.error;
    if (rule.identity === 'dsfx/fx_shader_additive_0')
        return dsfxAdditiveMaterialEvidence(rule, material, shader, state, extractionEvidence);
    if (rule.identity === 'dsfx/fx_shader_alphablend_add')
        return dsfxAlphaBlendAddMaterialEvidence(rule, material, shader, state, extractionEvidence);
    var inertProperties = extractionEvidence.source ? DSFX_ALPHA_BLEND_0_INERT_PROPERTIES : undefined;
    return (_d = (_c = (_b = (_a = dsfxStaticPassEvidence(rule, shader)) !== null && _a !== void 0 ? _a : dsfxStaticTextureEvidence(material)) !== null && _b !== void 0 ? _b : (material.keywords.length ? "shader keywords are active: ".concat(material.keywords.join(', ')) : null)) !== null && _c !== void 0 ? _c : dsfxStaticDynamicEvidence(material, shader, inertProperties)) !== null && _d !== void 0 ? _d : dsfxStaticRenderStateEvidence(rule, state);
}
function sourceStateValue(pass, key) {
    var value = findState(pass, [key]);
    if (value && typeof value === 'object' && 'val' in value)
        return finiteNumber(value.val);
    return finiteNumber(value);
}
function sourceStateName(pass, key) {
    var _a;
    var value = findState(pass, [key]);
    if (typeof value === 'string')
        return value;
    return value && typeof value === 'object' && 'name' in value ? String((_a = value.name) !== null && _a !== void 0 ? _a : '') : null;
}
function sourceStateRecord(pass, key) {
    var value = findState(pass, [key]);
    return value && typeof value === 'object' ? value : null;
}
function eStandardSourceStateEvidence(pass, expected) {
    var _a;
    if (pass.type !== 0 || ((_a = pass.name) !== null && _a !== void 0 ? _a : '') !== '' || sourceStateName(pass.state, 'm_Name') !== expected.stateName) {
        return 'pass type/name/state identity does not match the verified E-Standard source';
    }
    var state = expected.renderState;
    var values = {
        zWrite: state.zWrite, zTest: state.zTest, culling: state.culling, offsetFactor: state.offsetFactor, offsetUnits: state.offsetUnits,
        blendOp: state.blendOperation, blendOpAlpha: state.blendOperationAlpha,
    };
    for (var _i = 0, _b = Object.entries(values); _i < _b.length; _i++) {
        var _c = _b[_i], key = _c[0], value = _c[1];
        if (sourceStateValue(pass.state, key) !== value)
            return "".concat(expected.stateName, " ").concat(key, " state is not ").concat(value);
    }
    var blend = sourceStateRecord(pass.state, 'rtBlend0');
    if (!blend || sourceStateValue(blend, 'srcBlend') !== state.sourceBlend || sourceStateValue(blend, 'destBlend') !== state.destinationBlend
        || sourceStateValue(blend, 'srcBlendAlpha') !== state.sourceBlendAlpha || sourceStateValue(blend, 'destBlendAlpha') !== state.destinationBlendAlpha
        || sourceStateValue(blend, 'blendOp') !== state.blendOperation || sourceStateValue(blend, 'blendOpAlpha') !== state.blendOperationAlpha
        || sourceStateValue(blend, 'colMask') !== state.colorMask)
        return "".concat(expected.stateName, " blend state is not the verified source state");
    var nameChecks = [
        ['zWrite', state.zWriteProperty], ['zTest', state.zTestProperty], ['culling', state.cullingProperty],
        ['offsetFactor', state.offsetFactorProperty], ['offsetUnits', state.offsetUnitsProperty],
    ];
    for (var _d = 0, nameChecks_1 = nameChecks; _d < nameChecks_1.length; _d++) {
        var _e = nameChecks_1[_d], key = _e[0], name_4 = _e[1];
        if (sourceStateName(pass.state, key) !== name_4)
            return "".concat(expected.stateName, " ").concat(key, " source property is not ").concat(name_4);
    }
    var blendNameChecks = [
        ['srcBlend', state.sourceBlendProperty], ['destBlend', state.destinationBlendProperty],
        ['srcBlendAlpha', state.sourceBlendAlphaProperty], ['destBlendAlpha', state.destinationBlendAlphaProperty],
    ];
    for (var _f = 0, blendNameChecks_1 = blendNameChecks; _f < blendNameChecks_1.length; _f++) {
        var _g = blendNameChecks_1[_f], key = _g[0], name_5 = _g[1];
        if (sourceStateName(blend, key) !== name_5)
            return "".concat(expected.stateName, " ").concat(key, " source property is not ").concat(name_5);
    }
    var tagsValue = findState(pass.state, ['m_Tags']);
    var tags = tagsValue && typeof tagsValue === 'object' && Array.isArray(tagsValue.tags)
        ? new Map((tagsValue.tags).filter(function (item) { return Array.isArray(item) && item.length >= 2; }).map(function (item) { return [String(item[0]), String(item[1])]; }))
        : new Map();
    var expectedTags = {
        IGNOREPROJECTOR: 'true', RenderPipeline: 'UniversalPipeline', RenderType: 'Opaque',
        LIGHTMODE: expected.stateName === 'ForwardLit' ? 'UniversalForward' : expected.stateName.toUpperCase(),
    };
    if (expected.stateName === 'ShadowCaster')
        expectedTags.LIGHTMODE = 'SHADOWCASTER';
    if (expected.stateName === 'DepthOnly')
        expectedTags.LIGHTMODE = 'DepthOnly';
    if (expected.stateName === 'Meta')
        expectedTags.LIGHTMODE = 'META';
    if (Object.keys(expectedTags).some(function (key) { return tags.get(key) !== expectedTags[key]; }))
        return "".concat(expected.stateName, " tags do not match the verified source");
    if (findState(pass.state, ['lighting']) !== false)
        return "".concat(expected.stateName, " lighting state is not false");
    return null;
}
function eStandardShaderStructureEvidence(shader) {
    var _a, _b, _c;
    var passes = (_b = (_a = shader === null || shader === void 0 ? void 0 : shader.subShaders) === null || _a === void 0 ? void 0 : _a.flatMap(function (subShader) { var _a; return (_a = subShader.passes) !== null && _a !== void 0 ? _a : []; })) !== null && _b !== void 0 ? _b : [];
    if (((_c = shader === null || shader === void 0 ? void 0 : shader.subShaders) === null || _c === void 0 ? void 0 : _c.length) !== 1 || passes.length !== 4)
        return "shader pass count is ".concat(passes.length, ", expected 4");
    // ForwardLit has two extracted keyword variants but is one serialized source
    // pass.  Validate the four source passes once, then validate both variants
    // independently from their GLES3 extraction records.
    for (var _i = 0, _d = ['forwardStatic', 'shadow', 'depth', 'meta'].entries(); _i < _d.length; _i++) {
        var _e = _d[_i], index = _e[0], key = _e[1];
        var error = eStandardSourceStateEvidence(passes[index], MX_E_STANDARD_PASS_SPECS[key]);
        if (error)
            return "shader pass ".concat(index, " ").concat(error);
    }
    return null;
}
function customShaderEvidence(rule, shader) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    if (!(shader === null || shader === void 0 ? void 0 : shader.programBlobSha256))
        return 'shader program identity is missing';
    if (shader.programBlobSha256.toLowerCase() !== rule.programBlobSha256)
        return 'shader program identity does not match the verified BAAD version';
    if (referenceKey(shader.sourceReference) !== referenceKey(rule.sourceReference))
        return 'shader source reference does not match the verified BAAD object';
    var declaredPropertyNames = ((_b = (_a = shader.properties) === null || _a === void 0 ? void 0 : _a.m_Props) !== null && _b !== void 0 ? _b : [])
        .map(function (property) { return property.m_Name; }).filter(function (name) { return typeof name === 'string'; });
    var propertyNames = new Set(declaredPropertyNames);
    var missingProperties = rule.requiredProperties.filter(function (property) { return !propertyNames.has(property); });
    if (rule.id === 'projectmx-weapon-test1-damage') {
        var unexpectedProperties = __spreadArray([], propertyNames, true).filter(function (property) { return !rule.requiredProperties.includes(property); });
        if (declaredPropertyNames.length !== rule.requiredProperties.length || propertyNames.size !== rule.requiredProperties.length
            || missingProperties.length || unexpectedProperties.length) {
            return "shader declarations do not match the verified ProjectMX set".concat(missingProperties.length ? "; missing ".concat(missingProperties.join(', ')) : '').concat(unexpectedProperties.length ? "; unexpected ".concat(unexpectedProperties.join(', ')) : '');
        }
    }
    else if (missingProperties.length)
        return "shader declarations are missing ".concat(missingProperties.join(', '));
    if (rule.id === 'mx-e-standard') {
        var names_1 = __spreadArray([], new Set(declaredPropertyNames), true);
        if (declaredPropertyNames.length !== rule.requiredProperties.length || names_1.length !== rule.requiredProperties.length
            || rule.requiredProperties.some(function (property) { return !names_1.includes(property); }) || names_1.some(function (property) { return !rule.requiredProperties.includes(property); })) {
            return 'shader declarations do not match the verified E-Standard set';
        }
        return eStandardShaderStructureEvidence(shader);
    }
    if (rule.id === 'projectmx-weapon-test1-damage') {
        var allPasses = (_d = (_c = shader.subShaders) === null || _c === void 0 ? void 0 : _c.flatMap(function (subShader) { var _a; return (_a = subShader.passes) !== null && _a !== void 0 ? _a : []; })) !== null && _d !== void 0 ? _d : [];
        if (allPasses.length !== ((_e = rule.passSignature[0]) === null || _e === void 0 ? void 0 : _e.states.length) || allPasses.some(function (pass) { var _a; return pass.type !== ((_a = rule.passSignature[0]) === null || _a === void 0 ? void 0 : _a.type); })) {
            return "shader pass count is ".concat(allPasses.length, ", expected ").concat((_f = rule.passSignature[0]) === null || _f === void 0 ? void 0 : _f.states.length);
        }
    }
    var passes = (_g = shader.subShaders) === null || _g === void 0 ? void 0 : _g.flatMap(function (subShader) { var _a; return (_a = subShader.passes) !== null && _a !== void 0 ? _a : []; }).filter(function (pass) { var _a; return pass.type === ((_a = rule.passSignature[0]) === null || _a === void 0 ? void 0 : _a.type); });
    if ((passes === null || passes === void 0 ? void 0 : passes.length) !== ((_h = rule.passSignature[0]) === null || _h === void 0 ? void 0 : _h.states.length))
        return "shader pass count is ".concat((_j = passes === null || passes === void 0 ? void 0 : passes.length) !== null && _j !== void 0 ? _j : 0, ", expected ").concat((_k = rule.passSignature[0]) === null || _k === void 0 ? void 0 : _k.states.length);
    var expectedStates = (_m = (_l = rule.passSignature[0]) === null || _l === void 0 ? void 0 : _l.states) !== null && _m !== void 0 ? _m : [];
    for (var _i = 0, _o = expectedStates.entries(); _i < _o.length; _i++) {
        var _p = _o[_i], index = _p[0], expected = _p[1];
        var pass = passes === null || passes === void 0 ? void 0 : passes[index];
        for (var _q = 0, _r = Object.entries(expected); _q < _r.length; _q++) {
            var _s = _r[_q], key = _s[0], value = _s[1];
            if (sourceStateValue(pass === null || pass === void 0 ? void 0 : pass.state, key) !== value)
                return "shader pass ".concat(index, " ").concat(key, " state is not ").concat(value);
        }
        if (rule.id === 'projectmx-weapon-test1-damage') {
            var expectedNames = ['ForwardLit', 'Outline', 'Solid Color Outline', 'ShadowCaster', 'DepthOnly'];
            if (findState(pass === null || pass === void 0 ? void 0 : pass.state, ['m_Name']) !== expectedNames[index])
                return "shader pass ".concat(index, " is not the verified ").concat(expectedNames[index], " pass");
            var expectedColorMask = index === 4 ? 0 : 15;
            for (var _t = 0, _u = Object.entries({
                srcBlend: 1, destBlend: 0, srcBlendAlpha: 1, destBlendAlpha: 0,
                blendOp: 0, blendOpAlpha: 0, colMask: expectedColorMask, offsetFactor: 0, offsetUnits: 0,
            }); _t < _u.length; _t++) {
                var _v = _u[_t], key = _v[0], value = _v[1];
                if (sourceStateValue(pass === null || pass === void 0 ? void 0 : pass.state, key) !== value)
                    return "shader pass ".concat(index, " ").concat(key, " state is not ").concat(value);
            }
            if (findState(pass === null || pass === void 0 ? void 0 : pass.state, ['lighting']) !== false)
                return "shader pass ".concat(index, " lighting state is not false");
        }
    }
    return null;
}
function hasGlslDeclaration(source, kind, name) {
    // The extracted GLES3 source uses both plain declarations and std140 blocks.
    // Matching a complete identifier prevents a similarly named uniform from
    // satisfying an exact source contract.
    return new RegExp("\\b".concat(kind, "\\b[\\s\\S]*?\\b").concat(name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), "\\b")).test(source);
}
function sourceAttributeName(attribute) {
    return attribute === 'POSITION' ? 'in_POSITION0'
        : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
            : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1'
                : attribute === 'TEXCOORD_2' ? 'in_TEXCOORD2'
                    : attribute === 'TANGENT' ? 'in_TANGENT0'
                        : attribute === 'COLOR_0' ? 'in_COLOR0'
                            : attribute === 'NORMAL' ? 'in_NORMAL0' : "in_".concat(attribute);
}
function outlineExtractionPass(extraction, pass, stateName, blobIndex, programHash, requiredAttributes, requiredUniforms) {
    if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs)) {
        return { error: "".concat(pass, " pass extraction records are missing") };
    }
    var bindings = extraction.bindings.filter(function (binding) { return binding.platform === 9
        && binding.gpuProgramType === 4 && binding.stage === 'vertex'
        && binding.subShaderIndex === 0 && binding.stateName === stateName
        && binding.blobIndex === blobIndex; });
    if (bindings.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(bindings.length, " exact GLES3 no-keyword bindings; expected one") };
    var binding = bindings[0];
    if (binding.keywordNames.length !== 0 || binding.keywordIndices.length !== 0) {
        return { error: "".concat(pass, " pass selects shader keywords instead of the verified no-keyword variant") };
    }
    var programs = extraction.gles3Programs.filter(function (program) { return program.kind === 'program'
        && program.platform === 9 && program.gpuProgramType === 4 && program.blobIndex === blobIndex; });
    if (programs.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(programs.length, " exact GLES3 program records; expected one") };
    var program = programs[0];
    if (program.programHash !== programHash || program.programDataSha256 !== programHash
        || binding.programHash !== programHash || binding.gles3ProgramHash !== programHash) {
        return { error: "".concat(pass, " pass program hash does not match the verified source program") };
    }
    if (typeof program.programDataLength !== 'number' || !Number.isInteger(program.programDataLength) || program.programDataLength <= 0) {
        return { error: "".concat(pass, " pass has no exact source program length") };
    }
    if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es'))
        return { error: "".concat(pass, " pass has no canonical GLES3 GLSL source") };
    for (var _i = 0, requiredAttributes_1 = requiredAttributes; _i < requiredAttributes_1.length; _i++) {
        var attribute = requiredAttributes_1[_i];
        if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) {
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(attribute, " input semantics") };
        }
    }
    for (var _a = 0, requiredUniforms_1 = requiredUniforms; _a < requiredUniforms_1.length; _a++) {
        var uniform = requiredUniforms_1[_a];
        if (!new RegExp("\\b".concat(uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), "\\b")).test(program.glsl)) {
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(uniform, " uniform") };
        }
    }
    if (typeof binding.programRecordSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(binding.programRecordSha256)
        || binding.programRecordSha256 !== program.recordSha256) {
        return { error: "".concat(pass, " pass has no exact program-record fingerprint") };
    }
    if (typeof binding.parameterBlobIndex !== 'number' || !Number.isInteger(binding.parameterBlobIndex)
        || typeof binding.parameterRecordSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(binding.parameterRecordSha256)) {
        return { error: "".concat(pass, " pass has no exact parameter-record fingerprint") };
    }
    var source = {
        pass: pass,
        stateName: stateName,
        subShaderIndex: binding.subShaderIndex, passIndex: binding.passIndex,
        stage: 'vertex', platform: binding.platform, gpuProgramType: binding.gpuProgramType, blobIndex: binding.blobIndex,
        parameterBlobIndex: binding.parameterBlobIndex,
        parameterRecordSha256: binding.parameterRecordSha256,
        keywordIndices: __spreadArray([], binding.keywordIndices, true), keywordNames: __spreadArray([], binding.keywordNames, true),
        programHash: programHash,
        programDataSha256: program.programDataSha256, programRecordSha256: binding.programRecordSha256, glsl: program.glsl,
        requiredAttributes: __spreadArray([], requiredAttributes, true), requiredUniforms: __spreadArray([], requiredUniforms, true),
        renderState: pass === 'base'
            ? { zWrite: 1, zTest: 4, culling: 0 }
            : { zWrite: 1, zTest: 4, culling: 1 },
    };
    return { source: source };
}
function outlineShaderExtractionEvidence(shader) {
    var _a, _b;
    var extraction = shader === null || shader === void 0 ? void 0 : shader.extraction;
    if (!extraction)
        return { error: (_a = shader === null || shader === void 0 ? void 0 : shader.extractionError) !== null && _a !== void 0 ? _a : 'source shader extraction is missing' };
    if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1)
        return { error: 'source shader extractor version is not the verified version' };
    if (!/^[0-9a-f]{64}$/i.test(extraction.fingerprint))
        return { error: 'source shader extraction fingerprint is missing or malformed' };
    if (!/^[0-9a-f]{64}$/i.test(extraction.compressedBlobSha256)
        || extraction.compressedBlobSha256.toLowerCase() !== exports.MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256) {
        return { error: 'source shader extraction compressed-blob identity is not the verified version' };
    }
    if (!((_b = extraction.shader) === null || _b === void 0 ? void 0 : _b.sourceReference) || !shader.sourceReference
        || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)) {
        return { error: 'source shader extraction reference differs from the Shader object' };
    }
    if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'mx/unlitoutline') {
        return { error: 'source shader extraction identity is not MX/Unlit Outline' };
    }
    var base = outlineExtractionPass(extraction, 'base', 'ForwardLit', 1, exports.MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, MX_UNLIT_OUTLINE_BASE_ATTRIBUTES, MX_UNLIT_OUTLINE_BASE_UNIFORMS);
    if ('error' in base)
        return base;
    var outline = outlineExtractionPass(extraction, 'outline', 'Outline', 6, exports.MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, MX_UNLIT_OUTLINE_OUTLINE_ATTRIBUTES, MX_UNLIT_OUTLINE_OUTLINE_UNIFORMS);
    if ('error' in outline)
        return outline;
    return {
        source: {
            schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion,
            unityVersion: extraction.unityVersion, fingerprint: extraction.fingerprint,
            sourceReference: extraction.shader.sourceReference,
            compressedBlobSha256: extraction.compressedBlobSha256,
            passes: { base: base.source, outline: outline.source },
        },
    };
}
function transparentExtractionPass(extraction, pass, stateName, passIndex, blobIndex, parameterBlobIndex, parameterRecordSha256, programHash, programRecordSha256, keywords, keywordIndices, requiredAttributes, requiredUniforms, renderState) {
    if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs)) {
        return { error: "".concat(pass, " pass extraction records are missing") };
    }
    var bindings = extraction.bindings.filter(function (binding) {
        var _a;
        return binding.platform === 9
            && binding.gpuProgramType === 4 && binding.stage === 'vertex'
            && binding.subShaderIndex === 0 && ((_a = binding.stateName) !== null && _a !== void 0 ? _a : '') === stateName
            && binding.passIndex === passIndex && binding.blobIndex === blobIndex;
    });
    if (bindings.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(bindings.length, " exact GLES3 bindings; expected one") };
    var binding = bindings[0];
    if (binding.parameterBlobIndex !== parameterBlobIndex
        || binding.parameterRecordSha256 !== parameterRecordSha256
        || binding.programHash !== programHash || binding.gles3ProgramHash !== programHash
        || !Array.isArray(binding.keywordIndices) || !Array.isArray(binding.keywordNames)
        || binding.keywordIndices.length !== keywordIndices.length || binding.keywordNames.length !== keywords.length
        || binding.keywordIndices.some(function (value, index) { return value !== keywordIndices[index]; })
        || binding.keywordNames.some(function (value, index) { return value !== keywords[index]; })) {
        return { error: "".concat(pass, " pass keyword, parameter, or binding program identity does not match the verified source") };
    }
    var programs = extraction.gles3Programs.filter(function (program) { return program.kind === 'program'
        && program.platform === 9 && program.gpuProgramType === 4 && program.blobIndex === blobIndex; });
    if (programs.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(programs.length, " exact GLES3 program records; expected one") };
    var program = programs[0];
    if (program.programHash !== programHash || program.programDataSha256 !== programHash
        || program.recordSha256 !== programRecordSha256) {
        return { error: "".concat(pass, " pass program hash does not match the verified source") };
    }
    if (typeof program.programDataLength !== 'number' || !Number.isInteger(program.programDataLength) || program.programDataLength <= 0) {
        return { error: "".concat(pass, " pass has no exact source program length") };
    }
    if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')
        || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
        return { error: "".concat(pass, " pass has no canonical GLES3 GLSL source") };
    }
    for (var _i = 0, requiredAttributes_2 = requiredAttributes; _i < requiredAttributes_2.length; _i++) {
        var attribute = requiredAttributes_2[_i];
        if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) {
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(attribute, " input semantics") };
        }
    }
    for (var _a = 0, requiredUniforms_2 = requiredUniforms; _a < requiredUniforms_2.length; _a++) {
        var uniform = requiredUniforms_2[_a];
        if (!new RegExp("\\b".concat(uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&'), "\\b")).test(program.glsl)) {
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(uniform, " uniform") };
        }
    }
    if (typeof binding.programRecordSha256 !== 'string' || binding.programRecordSha256 !== programRecordSha256
        || typeof binding.parameterRecordSha256 !== 'string' || binding.parameterRecordSha256 !== parameterRecordSha256) {
        return { error: "".concat(pass, " pass has no exact program or parameter-record fingerprint") };
    }
    return {
        source: {
            pass: pass,
            stateName: stateName,
            subShaderIndex: binding.subShaderIndex,
            passIndex: passIndex,
            stage: 'vertex',
            platform: binding.platform, gpuProgramType: binding.gpuProgramType,
            blobIndex: blobIndex,
            parameterBlobIndex: parameterBlobIndex,
            parameterRecordSha256: parameterRecordSha256,
            keywordIndices: __spreadArray([], keywordIndices, true), keywordNames: __spreadArray([], keywords, true),
            programHash: programHash,
            programDataSha256: program.programDataSha256,
            programRecordSha256: programRecordSha256,
            glsl: program.glsl,
            requiredAttributes: __spreadArray([], requiredAttributes, true), requiredUniforms: __spreadArray([], requiredUniforms, true),
            renderState: renderState,
        },
    };
}
function transparentShaderExtractionEvidence(shader) {
    var _a, _b;
    var extraction = shader === null || shader === void 0 ? void 0 : shader.extraction;
    if (!extraction)
        return { error: (_a = shader === null || shader === void 0 ? void 0 : shader.extractionError) !== null && _a !== void 0 ? _a : 'source shader extraction is missing' };
    if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1)
        return { error: 'source shader extractor version is not the verified version' };
    if (extraction.fingerprint.toLowerCase() !== exports.MX_C_TRANSPARENT_ST_FINGERPRINT)
        return { error: 'source shader extraction fingerprint is not the verified BAAD version' };
    if (extraction.compressedBlobSha256.toLowerCase() !== exports.MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256)
        return { error: 'source shader extraction compressed-blob identity is not the verified version' };
    if (!((_b = extraction.shader) === null || _b === void 0 ? void 0 : _b.sourceReference) || !shader.sourceReference
        || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)
        || referenceKey(extraction.shader.sourceReference) !== referenceKey(exports.MX_C_TRANSPARENT_ST_SOURCE_REFERENCE)) {
        return { error: 'source shader extraction reference differs from the verified Shader object' };
    }
    if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'mx/c-transparent-st') {
        return { error: 'source shader extraction identity is not MX/C-Transparent-ST' };
    }
    var forward = transparentExtractionPass(extraction, 'forward', 'ForwardLit', 0, 6, 0, exports.MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256, exports.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH, exports.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256, [], [], exports.MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, exports.MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS, {
        zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
        sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 1, destinationBlendAlpha: 10,
        blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
    });
    if ('error' in forward)
        return forward;
    var dither = transparentExtractionPass(extraction, 'dither', 'ForwardLit', 0, 8, 1, exports.MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256, exports.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH, exports.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256, ['_DITHER_HORIZONTAL_LINES'], [9], exports.MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, exports.MX_C_TRANSPARENT_ST_DITHER_UNIFORMS, {
        zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
        sourceBlend: 5, destinationBlend: 10, sourceBlendAlpha: 1, destinationBlendAlpha: 10,
        blendOperation: 0, blendOperationAlpha: 0, colorMask: 15, depthOnly: false,
    });
    if ('error' in dither)
        return dither;
    var depth = transparentExtractionPass(extraction, 'depth', '', 1, 31, 30, exports.MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256, exports.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH, exports.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256, [], [], exports.MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, exports.MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS, {
        zWrite: 0, zWriteProperty: '_ZWrite', zTest: 4, culling: 0, cullingProperty: '_Cull',
        sourceBlend: 1, destinationBlend: 0, sourceBlendAlpha: 1, destinationBlendAlpha: 0,
        blendOperation: 0, blendOperationAlpha: 0, colorMask: 0, depthOnly: true,
    });
    if ('error' in depth)
        return depth;
    return {
        source: {
            schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion,
            unityVersion: extraction.unityVersion, fingerprint: extraction.fingerprint,
            sourceReference: extraction.shader.sourceReference, compressedBlobSha256: extraction.compressedBlobSha256,
            passes: { forward: forward.source, dither: dither.source, depth: depth.source },
        },
    };
}
function exactArray(actual, expected) {
    return Array.isArray(actual) && actual.length === expected.length
        && actual.every(function (value, index) { return value === expected[index]; });
}
function projectMxExtractionPass(extraction, pass) {
    var spec = PROJECTMX_WEAPON_PASS_SPECS[pass];
    if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs)) {
        return { error: "".concat(pass, " pass extraction records are missing") };
    }
    var bindings = extraction.bindings.filter(function (binding) { return binding.platform === 9
        && binding.gpuProgramType === 4 && binding.stage === 'vertex'
        && binding.subShaderIndex === 0 && binding.passIndex === spec.passIndex
        && binding.passName === ''
        && binding.stateName === spec.stateName && binding.blobIndex === spec.blobIndex
        && exactArray(binding.keywordIndices, spec.keywordIndices)
        && exactArray(binding.keywordNames, spec.keywordNames); });
    if (bindings.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(bindings.length, " exact GLES3 source bindings; expected one") };
    var binding = bindings[0];
    if (binding.parameterBlobIndex !== spec.parameterBlobIndex
        || binding.parameterRecordSha256 !== spec.parameterRecordSha256
        || binding.programHash !== spec.programHash
        || binding.gles3ProgramHash !== spec.programHash
        || binding.programRecordSha256 !== spec.programRecordSha256) {
        return { error: "".concat(pass, " pass binding does not match the verified source record") };
    }
    var programs = extraction.gles3Programs.filter(function (program) { return program.kind === 'program'
        && program.platform === 9 && program.gpuProgramType === 4 && program.blobIndex === spec.blobIndex; });
    if (programs.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(programs.length, " exact GLES3 program records; expected one") };
    var program = programs[0];
    if (program.programHash !== spec.programHash || program.programDataSha256 !== spec.programHash
        || program.recordSha256 !== spec.programRecordSha256 || program.programDataLength !== spec.programDataLength) {
        return { error: "".concat(pass, " pass program record does not match the verified source") };
    }
    if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')
        || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
        return { error: "".concat(pass, " pass has no canonical GLES3 GLSL source") };
    }
    // None of the currently authored static variants consumes the damage-noise
    // sampler.  Keep this derived fact in the compact profile and reject a
    // changed source record instead of silently accepting a missing _NoiseTex.
    var usesNoiseTexture = /\b_NoiseTex\b/.test(program.glsl);
    if (usesNoiseTexture)
        return { error: "".concat(pass, " pass unexpectedly consumes _NoiseTex") };
    for (var _i = 0, _a = spec.requiredAttributes; _i < _a.length; _i++) {
        var attribute = _a[_i];
        if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute))) {
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(attribute, " input semantics") };
        }
    }
    for (var _b = 0, _c = spec.requiredUniforms; _b < _c.length; _b++) {
        var uniform = _c[_b];
        if (!new RegExp("\\b".concat(uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&'), "\\b")).test(program.glsl)) {
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(uniform, " uniform") };
        }
    }
    var source = {
        pass: pass,
        stateName: spec.stateName, subShaderIndex: binding.subShaderIndex, passIndex: spec.passIndex,
        stage: 'vertex', platform: binding.platform, gpuProgramType: binding.gpuProgramType,
        blobIndex: spec.blobIndex, parameterBlobIndex: spec.parameterBlobIndex,
        parameterRecordSha256: spec.parameterRecordSha256,
        keywordIndices: __spreadArray([], spec.keywordIndices, true), keywordNames: __spreadArray([], spec.keywordNames, true),
        programHash: spec.programHash, programDataSha256: spec.programHash,
        programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256,
        usesNoiseTexture: usesNoiseTexture,
        glsl: program.glsl,
        requiredAttributes: __spreadArray([], spec.requiredAttributes, true), requiredUniforms: __spreadArray([], spec.requiredUniforms, true),
        renderState: __assign({}, spec.renderState),
    };
    return { source: source };
}
function projectMxShaderExtractionEvidence(shader, activeVariant) {
    var _a, _b;
    var extraction = shader === null || shader === void 0 ? void 0 : shader.extraction;
    if (!extraction)
        return { error: (_a = shader === null || shader === void 0 ? void 0 : shader.extractionError) !== null && _a !== void 0 ? _a : 'source shader extraction is missing' };
    if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1)
        return { error: 'source shader extractor version is not the verified version' };
    if (extraction.unityVersion !== '2021.3')
        return { error: 'source shader extraction Unity version is not the verified version' };
    if (typeof extraction.fingerprint !== 'string' || extraction.fingerprint.toLowerCase() !== exports.PROJECTMX_WEAPON_FINGERPRINT)
        return { error: 'source shader extraction fingerprint is not the verified ProjectMX version' };
    if (typeof extraction.compressedBlobSha256 !== 'string' || extraction.compressedBlobSha256.toLowerCase() !== exports.PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256)
        return { error: 'source shader extraction compressed-blob identity is not the verified ProjectMX version' };
    if (!((_b = extraction.shader) === null || _b === void 0 ? void 0 : _b.sourceReference) || !shader.sourceReference
        || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)
        || referenceKey(extraction.shader.sourceReference) !== referenceKey(exports.PROJECTMX_WEAPON_SOURCE_REFERENCE)) {
        return { error: 'source shader extraction reference differs from the verified ProjectMX Shader object' };
    }
    if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'projectmx/weapontest1damage') {
        return { error: 'source shader extraction identity is not ProjectMX/WeaponTest1Damage' };
    }
    if (!exactArray(extraction.shader.keywordNames, exports.PROJECTMX_WEAPON_SHADER_KEYWORDS)) {
        return { error: 'source shader extraction keyword declarations are not the verified ProjectMX set' };
    }
    var forward = projectMxExtractionPass(extraction, 'forward');
    if ('error' in forward)
        return forward;
    var glow = projectMxExtractionPass(extraction, 'glow');
    if ('error' in glow)
        return glow;
    var outline = projectMxExtractionPass(extraction, 'outline');
    if ('error' in outline)
        return outline;
    var solidOutline = projectMxExtractionPass(extraction, 'solidOutline');
    if ('error' in solidOutline)
        return solidOutline;
    var shadow = projectMxExtractionPass(extraction, 'shadow');
    if ('error' in shadow)
        return shadow;
    var depth = projectMxExtractionPass(extraction, 'depth');
    if ('error' in depth)
        return depth;
    return {
        source: {
            schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion,
            unityVersion: extraction.unityVersion, fingerprint: extraction.fingerprint,
            sourceReference: extraction.shader.sourceReference,
            compressedBlobSha256: extraction.compressedBlobSha256,
            shaderName: extraction.shader.name,
            shaderKeywordNames: __spreadArray([], extraction.shader.keywordNames, true),
            activeVariant: activeVariant,
            activeKeywordNames: __spreadArray([], (activeVariant === 'glow' ? PROJECTMX_WEAPON_PASS_SPECS.glow.keywordNames : PROJECTMX_WEAPON_PASS_SPECS.forward.keywordNames), true),
            requiredProperties: __spreadArray([], exports.PROJECTMX_WEAPON_REQUIRED_PROPERTIES, true),
            requiredTextureProperties: ['_mainTex', '_sourceTex'],
            passes: {
                forward: forward.source, glow: glow.source, outline: outline.source,
                solidOutline: solidOutline.source, shadow: shadow.source, depth: depth.source,
            },
        },
    };
}
function eStandardExtractionPass(extraction, pass) {
    var spec = MX_E_STANDARD_PASS_SPECS[pass];
    if (!Array.isArray(extraction.bindings) || !Array.isArray(extraction.gles3Programs))
        return { error: "".concat(pass, " pass extraction records are missing") };
    var bindings = extraction.bindings.filter(function (binding) {
        var _a;
        return binding.platform === 9 && binding.gpuProgramType === 4
            && binding.stage === 'vertex' && binding.subShaderIndex === 0 && binding.passIndex === spec.passIndex
            && ((_a = binding.passName) !== null && _a !== void 0 ? _a : '') === spec.passName && binding.stateName === spec.stateName
            && binding.blobIndex === spec.blobIndex && exactArray(binding.keywordIndices, spec.keywordIndices)
            && exactArray(binding.keywordNames, spec.keywordNames);
    });
    if (bindings.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(bindings.length, " exact GLES3 source bindings; expected one") };
    var binding = bindings[0];
    if (binding.parameterBlobIndex !== spec.parameterBlobIndex || binding.parameterRecordSha256 !== spec.parameterRecordSha256
        || binding.programHash !== spec.programHash || binding.gles3ProgramHash !== spec.programHash
        || binding.programRecordSha256 !== spec.programRecordSha256)
        return { error: "".concat(pass, " pass binding does not match the verified source record") };
    var programs = extraction.gles3Programs.filter(function (program) { return program.kind === 'program' && program.platform === 9
        && program.gpuProgramType === 4 && program.blobIndex === spec.blobIndex; });
    if (programs.length !== 1)
        return { error: "".concat(pass, " pass has ").concat(programs.length, " exact GLES3 program records; expected one") };
    var program = programs[0];
    if (program.programHash !== spec.programHash || program.programDataSha256 !== spec.programHash
        || program.recordSha256 !== spec.programRecordSha256 || program.programDataLength !== spec.programDataLength) {
        return { error: "".concat(pass, " pass program record does not match the verified source") };
    }
    if (typeof program.glsl !== 'string' || !program.glsl.includes('#version 300 es')
        || !program.glsl.includes('#ifdef VERTEX') || !program.glsl.includes('#ifdef FRAGMENT')) {
        return { error: "".concat(pass, " pass has no canonical GLES3 GLSL source") };
    }
    for (var _i = 0, _a = spec.requiredAttributes; _i < _a.length; _i++) {
        var attribute = _a[_i];
        if (!hasGlslDeclaration(program.glsl, 'in', sourceAttributeName(attribute)))
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(attribute, " input semantics") };
    }
    for (var _b = 0, _c = spec.requiredUniforms; _b < _c.length; _b++) {
        var uniform = _c[_b];
        if (!new RegExp("\\b".concat(uniform.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&'), "\\b")).test(program.glsl))
            return { error: "".concat(pass, " pass GLSL is missing required ").concat(uniform, " uniform") };
    }
    return {
        source: {
            pass: pass,
            stateName: spec.stateName, passName: spec.passName, subShaderIndex: binding.subShaderIndex, passIndex: spec.passIndex,
            stage: 'vertex', platform: binding.platform, gpuProgramType: binding.gpuProgramType, blobIndex: spec.blobIndex,
            parameterBlobIndex: spec.parameterBlobIndex, parameterRecordSha256: spec.parameterRecordSha256,
            keywordIndices: __spreadArray([], spec.keywordIndices, true), keywordNames: __spreadArray([], spec.keywordNames, true), programHash: spec.programHash,
            programDataSha256: spec.programHash, programDataLength: spec.programDataLength, programRecordSha256: spec.programRecordSha256,
            glsl: program.glsl, requiredAttributes: __spreadArray([], spec.requiredAttributes, true), requiredUniforms: __spreadArray([], spec.requiredUniforms, true),
            renderState: __assign({}, spec.renderState),
        },
    };
}
function eStandardShaderExtractionEvidence(shader, activeVariant) {
    var _a, _b;
    var extraction = shader === null || shader === void 0 ? void 0 : shader.extraction;
    if (!extraction)
        return { error: (_a = shader === null || shader === void 0 ? void 0 : shader.extractionError) !== null && _a !== void 0 ? _a : 'source shader extraction is missing' };
    if (extraction.schemaVersion !== 1 || extraction.extractorVersion !== 1 || extraction.unityVersion !== '2021.3')
        return { error: 'source shader extraction metadata is not the verified E-Standard version' };
    if (typeof extraction.fingerprint !== 'string' || extraction.fingerprint.toLowerCase() !== exports.MX_E_STANDARD_FINGERPRINT)
        return { error: 'source shader extraction fingerprint is not the verified E-Standard version' };
    if (typeof extraction.compressedBlobSha256 !== 'string' || extraction.compressedBlobSha256.toLowerCase() !== exports.MX_E_STANDARD_PROGRAM_BLOB_SHA256)
        return { error: 'source shader extraction compressed-blob identity is not the verified E-Standard version' };
    if (!((_b = extraction.shader) === null || _b === void 0 ? void 0 : _b.sourceReference) || !shader.sourceReference
        || referenceKey(extraction.shader.sourceReference) !== referenceKey(shader.sourceReference)
        || referenceKey(extraction.shader.sourceReference) !== referenceKey(exports.MX_E_STANDARD_SOURCE_REFERENCE))
        return { error: 'source shader extraction reference differs from the verified E-Standard Shader object' };
    if (typeof extraction.shader.name !== 'string' || normalizedShaderIdentity(extraction.shader.name) !== 'mx/e-standard')
        return { error: 'source shader extraction identity is not MX/E-Standard' };
    if (!exactArray(extraction.shader.keywordNames, exports.MX_E_STANDARD_SHADER_KEYWORDS))
        return { error: 'source shader extraction keyword declarations are not the verified E-Standard set' };
    var forwardStatic = eStandardExtractionPass(extraction, 'forwardStatic');
    if ('error' in forwardStatic)
        return forwardStatic;
    var forwardDynamic = eStandardExtractionPass(extraction, 'forwardDynamic');
    if ('error' in forwardDynamic)
        return forwardDynamic;
    var shadow = eStandardExtractionPass(extraction, 'shadow');
    if ('error' in shadow)
        return shadow;
    var depth = eStandardExtractionPass(extraction, 'depth');
    if ('error' in depth)
        return depth;
    var meta = eStandardExtractionPass(extraction, 'meta');
    if ('error' in meta)
        return meta;
    return {
        source: {
            schemaVersion: extraction.schemaVersion, extractorVersion: extraction.extractorVersion, unityVersion: extraction.unityVersion,
            fingerprint: extraction.fingerprint, sourceReference: extraction.shader.sourceReference,
            compressedBlobSha256: extraction.compressedBlobSha256, shaderName: extraction.shader.name,
            shaderKeywordNames: __spreadArray([], extraction.shader.keywordNames, true),
            activeVariant: activeVariant,
            activeKeywordNames: activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS'] : [],
            requiredProperties: __spreadArray([], exports.MX_E_STANDARD_REQUIRED_PROPERTIES, true), sourceTextureProperties: __spreadArray([], exports.MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES, true),
            requiredTextureProperties: __spreadArray([], exports.MX_E_STANDARD_REQUIRED_TEXTURE_PROPERTIES, true),
            passes: {
                forward: activeVariant === 'dynamic' ? forwardDynamic.source : forwardStatic.source,
                forwardStatic: forwardStatic.source, forwardDynamic: forwardDynamic.source,
                shadow: shadow.source, depth: depth.source, meta: meta.source,
            },
        },
    };
}
function eStandardTextureEvidence(material) {
    var _a, _b;
    var textures = (_a = material.textures) !== null && _a !== void 0 ? _a : [];
    if (textures.length !== exports.MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES.length
        || textures.some(function (item) { return !exports.MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES.includes(item.name); })) {
        return 'source texture property set is not the verified E-Standard set';
    }
    var _loop_10 = function (property) {
        var texture = textures.find(function (item) { return item.name === property; });
        if (!texture)
            return { value: "exact ".concat(property, " material record is missing") };
        if (property === '_MainTex') {
            if (!texture.texture || String(texture.texture.pathId) === '0' || !texture.textureReference
                || texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
                || String(texture.texture.pathId) !== texture.textureReference.objectId)
                return { value: 'exact _MainTex reference is missing' };
            var resolved = (_b = material.resolvedTextures) === null || _b === void 0 ? void 0 : _b.find(function (item) { return item.property === property; });
            if (!(resolved === null || resolved === void 0 ? void 0 : resolved.sourceReference) || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)
                || positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null)
                return { value: 'resolved _MainTex identity or dimensions are missing' };
        }
        else if (texture.texture && String(texture.texture.pathId) !== '0')
            return { value: "unsupported ".concat(property, " texture is bound") };
        else if (texture.textureReference)
            return { value: "inactive ".concat(property, " texture has an unexpected source identity") };
        if (texture.scale && texture.offset) {
            var values = [texture.scale.x, texture.scale.y, texture.offset.x, texture.offset.y].map(finiteNumber);
            if (values.some(function (value) { return value === null; }))
                return { value: "".concat(property, " texture transform is unresolved") };
        }
    };
    for (var _i = 0, MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES_1 = exports.MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES; _i < MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES_1.length; _i++) {
        var property = MX_E_STANDARD_SOURCE_TEXTURE_PROPERTIES_1[_i];
        var state_10 = _loop_10(property);
        if (typeof state_10 === "object")
            return state_10.value;
    }
    return null;
}
function eStandardRenderStateEvidence(state) {
    if (!state || state.layer !== 'opaque' || state.alphaMode !== 'OPAQUE' || state.depthWrite !== true || state.depthTest !== true
        || state.depthFunction !== 'less-equal' || state.cullMode !== 'back' || state.doubleSided !== false
        || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0)
        return 'translated render state is not the verified opaque E-Standard state';
    var blend = state.blend;
    return blend.source !== 1 || blend.destination !== 0 || blend.sourceAlpha !== 1 || blend.destinationAlpha !== 0
        || blend.operation !== 0 || blend.operationAlpha !== 0 ? 'translated blend state is not the verified opaque E-Standard state' : null;
}
function eStandardMaterialEvidence(material, shader, state, extraction) {
    var _a, _b, _c, _d;
    var keywords = (_a = material.keywords) !== null && _a !== void 0 ? _a : [];
    var activeVariant = keywords.length === 1 && keywords[0] === '_DYNAMIC_LIGHTS'
        || keywords.length === 2 && keywords[0] === '_DYNAMIC_LIGHTS' && keywords[1] === '_SPECULAR_SETUP' ? 'dynamic'
        : keywords.length === 1 && keywords[0] === '_SPECULAR_SETUP' ? 'static' : null;
    if (!activeVariant)
        return "unsupported shader keywords are active: ".concat(keywords.join(', '));
    if (!extraction || extraction.activeVariant !== activeVariant || !exactArray(extraction.activeKeywordNames, activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS'] : []))
        return 'active keyword variant is not the verified E-Standard variant';
    var scalarProperties = ['_Cutoff', '_SrcBlend', '_DstBlend', '_SrcBlendAlpha', '_DstBlendAlpha', '_ZWrite', '_Cull',
        '_ZOffsetFactor', '_ZOffsetUnits', '_ReflectBaseAmount', '_ReflectAnglePower', '_ShadowAttenRefl', '_ReflectStrength',
        '_EmissionStrength', '_SpecPower', '_ShadowAttenSpec', '_LightmapStrength'];
    for (var _i = 0, scalarProperties_1 = scalarProperties; _i < scalarProperties_1.length; _i++) {
        var property = scalarProperties_1[_i];
        if (propertyValue(material, property) === null && shaderDefault(shader, property) === null)
            return "".concat(property, " source scalar is unresolved");
    }
    var colors = ['_Color', '_SpecLightDir', '_SpecLightColor', '_CodeAddColor', '_CodeMultiplyColor', '_CodeAddRimColor'];
    for (var _e = 0, colors_1 = colors; _e < colors_1.length; _e++) {
        var name_6 = colors_1[_e];
        var value = (_c = colorVector((_b = material.colorProperties) === null || _b === void 0 ? void 0 : _b[name_6])) !== null && _c !== void 0 ? _c : shaderColorDefault(shader, name_6);
        if (!value)
            return "".concat(name_6, " source color is unresolved");
    }
    return (_d = eStandardTextureEvidence(material)) !== null && _d !== void 0 ? _d : eStandardRenderStateEvidence(state);
}
function customShaderRuntimeBlocker(rule) {
    return "Source shader ".concat(rule.identity, " uses ").concat(rule.behavior, " behavior that glTF-native output cannot preserve; Viewer runtime adapter ").concat(rule.id, " is required.");
}
function transparentTextureEvidence(material, property) {
    var _a;
    var texture = material.textures.find(function (item) { return item.name === property; });
    if (!(texture === null || texture === void 0 ? void 0 : texture.texture) || String(texture.texture.pathId) === '0')
        return "exact ".concat(property, " reference is missing");
    if (!texture.textureReference)
        return "exact ".concat(property, " source identity is missing");
    if (texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
        || String(texture.texture.pathId) !== texture.textureReference.objectId)
        return "serialized ".concat(property, " pointer does not match its exact source identity");
    var resolved = (_a = material.resolvedTextures) === null || _a === void 0 ? void 0 : _a.find(function (item) { return item.property === property; });
    if (!(resolved === null || resolved === void 0 ? void 0 : resolved.sourceReference) || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)) {
        return "resolved ".concat(property, " identity does not match the serialized source reference");
    }
    if (positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null)
        return "resolved ".concat(property, " dimensions are missing");
    return null;
}
function projectMxTextureEvidence(material, property) {
    var _a, _b;
    var texture = ((_a = material.textures) !== null && _a !== void 0 ? _a : []).find(function (item) { return item.name === property; });
    if (!(texture === null || texture === void 0 ? void 0 : texture.texture) || String(texture.texture.pathId) === '0')
        return "exact ".concat(property, " reference is missing");
    if (!texture.textureReference)
        return "exact ".concat(property, " source identity is missing");
    if (texture.texture.file.toLowerCase() !== texture.textureReference.serializedFile.toLowerCase()
        || String(texture.texture.pathId) !== texture.textureReference.objectId)
        return "serialized ".concat(property, " pointer does not match its exact source identity");
    var resolved = (_b = material.resolvedTextures) === null || _b === void 0 ? void 0 : _b.find(function (item) { return item.property === property; });
    if (!(resolved === null || resolved === void 0 ? void 0 : resolved.sourceReference) || referenceKey(resolved.sourceReference) !== referenceKey(texture.textureReference)) {
        return "resolved ".concat(property, " identity does not match the serialized source reference");
    }
    if (positiveInteger(resolved.width) === null || positiveInteger(resolved.height) === null)
        return "resolved ".concat(property, " dimensions are missing");
    return null;
}
function projectMxRenderStateEvidence(state) {
    if (!state)
        return 'translated render state is missing';
    if (state.layer !== 'opaque' || state.alphaMode !== 'OPAQUE'
        || state.depthWrite !== true || state.depthTest !== true || state.depthFunction !== 'less-equal'
        || state.cullMode !== 'back' || state.doubleSided !== false
        || state.polygonOffsetFactor !== 0 || state.polygonOffsetUnits !== 0) {
        return 'translated render state is not the verified opaque ProjectMX state';
    }
    if (state.blend.source !== 1 || state.blend.destination !== 0
        || state.blend.sourceAlpha !== 1 || state.blend.destinationAlpha !== 0
        || state.blend.operation !== 0 || state.blend.operationAlpha !== 0) {
        return 'translated blend state is not the verified opaque ProjectMX state';
    }
    return null;
}
function projectMxMaterialEvidence(material, state, extraction) {
    var _a, _b, _c, _d;
    var keywords = (_a = material.keywords) !== null && _a !== void 0 ? _a : [];
    var activeVariant = keywords.length === 0
        ? 'forward'
        : keywords.length === 1 && keywords[0] === '_GLOW_0' ? 'glow' : null;
    if (!activeVariant)
        return "unsupported shader keywords are active: ".concat(keywords.join(', '));
    if (!extraction)
        return 'source shader extraction is missing';
    if (extraction.activeVariant !== activeVariant)
        return "active keyword variant is ".concat(activeVariant, ", not ").concat(extraction.activeVariant);
    for (var _i = 0, _e = ['_DamageON', '_Damage', '_Fire', '_IsDither']; _i < _e.length; _i++) {
        var property = _e[_i];
        var value = propertyValue(material, property);
        if (value === null)
            return "".concat(property, " dynamic gate is unresolved");
        if (value !== 0)
            return "".concat(property, " dynamic gate is active (").concat(value, ")");
    }
    var useGlow = propertyValue(material, '_UseGlow');
    var expectedUseGlow = activeVariant === 'glow' ? 1 : 0;
    if (useGlow === null)
        return '_UseGlow variant gate is unresolved';
    if (useGlow !== expectedUseGlow)
        return "_UseGlow variant gate is ".concat(useGlow, ", expected ").concat(expectedUseGlow);
    return (_d = (_c = (_b = projectMxTextureEvidence(material, '_mainTex')) !== null && _b !== void 0 ? _b : projectMxTextureEvidence(material, '_sourceTex')) !== null && _c !== void 0 ? _c : (extraction.requiredTextureProperties.includes('_NoiseTex') ? projectMxTextureEvidence(material, '_NoiseTex') : null)) !== null && _d !== void 0 ? _d : projectMxRenderStateEvidence(state);
}
function transparentMaterialEvidence(material, state) {
    var _a, _b, _c, _d, _e;
    var keywords = (_a = material.keywords) !== null && _a !== void 0 ? _a : [];
    if (!(keywords.length === 0 || (keywords.length === 1 && keywords[0] === '_DITHER_HORIZONTAL_LINES'))) {
        return "unsupported shader keywords are active: ".concat(keywords.join(', '));
    }
    return (_e = (_d = (_c = (_b = transparentTextureEvidence(material, '_MainTex')) !== null && _b !== void 0 ? _b : transparentTextureEvidence(material, '_MaskTex')) !== null && _c !== void 0 ? _c : (!state || state.alphaMode !== 'BLEND' || state.layer !== 'transparent' ? 'translated state is not transparent blend' : null)) !== null && _d !== void 0 ? _d : (!state || state.depthTest !== true || state.cullMode !== 'off' || state.doubleSided !== true ? 'translated depth/cull state is not zTest4/cull-off' : null)) !== null && _e !== void 0 ? _e : (!state || state.blend.source !== 5 || state.blend.destination !== 10 || state.blend.sourceAlpha !== 1 || state.blend.destinationAlpha !== 10
        || state.blend.operation !== 0 || state.blend.operationAlpha !== 0 ? 'translated blend state is not source (5,10)/(1,10)' : null);
}
function isSimpleUnlitShader(shaderName, parsedName, shader) {
    var _a;
    var identities = [normalizedShaderIdentity(shaderName), normalizedShaderIdentity(parsedName)];
    if (!identities.some(function (identity) { return SIMPLE_UNLIT_SHADER_IDENTITIES.has(identity); }))
        return false;
    if (!(shader === null || shader === void 0 ? void 0 : shader.programBlobSha256))
        return false;
    var properties = (_a = shader.properties) === null || _a === void 0 ? void 0 : _a.m_Props;
    if (!(properties === null || properties === void 0 ? void 0 : properties.length))
        return false;
    return properties.every(function (property) { return typeof property.m_Name === 'string' && SIMPLE_UNLIT_SHADER_PROPERTIES.has(property.m_Name); });
}
function sourceBaseColorTint(material, shader, adapterId) {
    var _a, _b;
    var property = adapterId === 'mx-character-weapon' || adapterId === 'projectmx-weapon-test1-damage' || adapterId === 'mx-e-standard' ? '_Color'
        : adapterId === 'gltf-native' && isSimpleUnlitShader((_a = material.shaderName) !== null && _a !== void 0 ? _a : null, (_b = material.shaderParsedName) !== null && _b !== void 0 ? _b : null, shader) ? '_Color'
            : adapterId === 'dsfx-static' ? '_Color'
                : adapterId === 'dsfx-matcap' ? '_Main_Color'
                    : adapterId === 'mx-unlit-outline' ? '_Tint'
                        : adapterId === 'mx-c-transparent-st' ? '_Tint'
                            : ['mx-character-face', 'mx-character-eyebrow', 'mx-character-hair', 'mx-character-general'].includes(adapterId !== null && adapterId !== void 0 ? adapterId : '') ? '_Tint'
                                : null;
    return property ? materialColor(material, shader, property) : null;
}
function referencedProperty(name) {
    var _a, _b;
    if (typeof name !== 'string')
        return null;
    return (_b = (_a = name.match(/^\[?(_[A-Za-z0-9_]+)\]?$/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : null;
}
/** Resolve ShaderLab's property-or-literal state values without guessing. */
function resolveShaderState(value, material, shader, defaultProperty) {
    var _a, _b;
    var record = value && typeof value === 'object' ? value : null;
    var property = (_b = (_a = referencedProperty(record === null || record === void 0 ? void 0 : record.name)) !== null && _a !== void 0 ? _a : (value === undefined ? defaultProperty : null)) !== null && _b !== void 0 ? _b : null;
    if (property) {
        var materialValue = propertyValue(material, property);
        if (materialValue !== null)
            return { value: materialValue, source: 'material', property: property };
        var defaultValue = shaderDefault(shader, property);
        if (defaultValue !== null)
            return { value: defaultValue, source: 'shader-default', property: property };
        return { value: null, source: 'unresolved', property: property };
    }
    var literal = finiteNumber(record ? record.val : value);
    return literal === null
        ? { value: null, source: 'unresolved' }
        : { value: literal, source: 'literal' };
}
function allRecords(value) {
    if (!value || typeof value !== 'object')
        return [];
    var records = [value];
    for (var _i = 0, _a = Object.values(value); _i < _a.length; _i++) {
        var item = _a[_i];
        records.push.apply(records, allRecords(item));
    }
    return records;
}
function findState(pass, keys) {
    var wanted = new Set(keys.map(function (key) { return key.toLowerCase(); }));
    for (var _i = 0, _a = allRecords(pass); _i < _a.length; _i++) {
        var record = _a[_i];
        for (var _b = 0, _c = Object.entries(record); _b < _c.length; _b++) {
            var _d = _c[_b], key = _d[0], value = _d[1];
            if (wanted.has(key.toLowerCase()))
                return value;
        }
    }
    return undefined;
}
function passFor(shader) {
    var _a, _b, _c, _d, _e;
    return (_b = (_a = shader === null || shader === void 0 ? void 0 : shader.subShaders) === null || _a === void 0 ? void 0 : _a.flatMap(function (item) { var _a; return (_a = item.passes) !== null && _a !== void 0 ? _a : []; }).find(function (item) { return item.type === 0; })) !== null && _b !== void 0 ? _b : (_e = (_d = (_c = shader === null || shader === void 0 ? void 0 : shader.subShaders) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.passes) === null || _e === void 0 ? void 0 : _e[0];
}
function adapterFor(shaderName, parsedName, shader) {
    var name = "".concat(parsedName !== null && parsedName !== void 0 ? parsedName : '', " ").concat(shaderName !== null && shaderName !== void 0 ? shaderName : '').toLowerCase().replaceAll(' ', '');
    if (isSimpleUnlitShader(shaderName, parsedName, shader))
        return 'gltf-native';
    if (dsfxGlitchShaderRule(shaderName, parsedName))
        return 'dsfx-glitch-tex';
    var dsfxRule = dsfxStaticShaderRule(shaderName, parsedName);
    if (dsfxRule && !dsfxStaticPassEvidence(dsfxRule, shader))
        return 'dsfx-static';
    var customRule = customShaderAdapterRule(shaderName, parsedName);
    if (customRule && !customShaderEvidence(customRule, shader))
        return customRule.id;
    if (/mx\/c-face(?:\/|$)/.test(name) || /mxcharacterface/.test(name))
        return 'mx-character-face';
    if (/mx\/c-eyesmouth(?:\/|$)/.test(name) || /mxcharactereyesmouth/.test(name))
        return 'mx-character-eyemouth';
    if (/mx\/c-eyebrow/.test(name) || /mxcharactereyebrow/.test(name))
        return 'mx-character-eyebrow';
    if (/mx\/c-hair/.test(name) || /mxcharacterhair/.test(name))
        return 'mx-character-hair';
    if (/mx\/c-(?:general|simple|halo)/.test(name) || /mxcharacter(?:general|simple|halo)/.test(name))
        return 'mx-character-general';
    if (/mx\/c-weapon(?:\/|$)/.test(name))
        return 'mx-character-weapon';
    return null;
}
function sourceRendererReference(renderer) {
    var _a;
    return (_a = renderer.sourceReference) !== null && _a !== void 0 ? _a : null;
}
function normalizedSerializedFile(value) {
    return value.replaceAll('\\', '/').toLowerCase();
}
function isExactNullPointer(pointer, ownerFile) {
    return Boolean(pointer
        && pointer.pathId === '0'
        && !pointer.externalGuid
        && !pointer.builtinResource
        && normalizedSerializedFile(pointer.file) === normalizedSerializedFile(ownerFile));
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
function inertSourceRendererEvidence(renderer) {
    var _a, _b;
    var ownerFile = (_a = renderer.sourceReference) === null || _a === void 0 ? void 0 : _a.serializedFile;
    if (!ownerFile || renderer.meshSourceReference || !isExactNullPointer(renderer.mesh, ownerFile))
        return null;
    var slots = (_b = renderer.materialSlots) !== null && _b !== void 0 ? _b : [];
    if (!slots.every(function (slot) { return !slot.sourceMaterialReference && isExactNullPointer(slot.material, ownerFile); }))
        return null;
    return [
        "exact source renderer reference ".concat(referenceKey(renderer.sourceReference)),
        "source mesh is the exact null pointer ".concat(normalizedSerializedFile(ownerFile), ":0"),
        slots.length === 0
            ? 'source renderer has no material slots (exact null material set)'
            : "every source material slot is the exact null pointer ".concat(normalizedSerializedFile(ownerFile), ":0"),
    ];
}
function sourceReferenceFromUnknown(value) {
    var _a;
    if (!value || typeof value !== 'object')
        return null;
    var record = value;
    var referenceValue = (_a = record.sourceReference) !== null && _a !== void 0 ? _a : record.sourceRendererReference;
    var nested = referenceValue && typeof referenceValue === 'object'
        ? referenceValue
        : record;
    return typeof nested.bundleSha256 === 'string'
        && typeof nested.serializedFile === 'string'
        && typeof nested.objectId === 'string'
        ? { bundleSha256: nested.bundleSha256, serializedFile: nested.serializedFile, objectId: nested.objectId }
        : null;
}
function recordArray(value) {
    return Array.isArray(value) ? value : [];
}
function pointerFilePathKey(value) {
    if (!value || typeof value !== 'object')
        return null;
    var record = value;
    return typeof record.file === 'string' && typeof record.pathId === 'string'
        ? "".concat(normalizedSerializedFile(record.file), ":").concat(record.pathId)
        : null;
}
/**
 * Compare source pointers without falling back from a full source identity to
 * a file/path collision.  A relation is authoritative only when both sides
 * carry the same full identity, or when both sides are the same serialized
 * pointer and neither side carries a bundle identity.
 */
function exactAssemblyPointerMatch(left, right) {
    var leftReference = sourceReferenceFromUnknown(left);
    var rightReference = sourceReferenceFromUnknown(right);
    if (leftReference || rightReference) {
        return Boolean(leftReference && rightReference
            && referenceKey(leftReference) === referenceKey(rightReference));
    }
    var leftKey = pointerFilePathKey(left);
    var rightKey = pointerFilePathKey(right);
    return Boolean(leftKey && rightKey && leftKey === rightKey);
}
// When one side carries a full source identity and the other side only has a
// serialized file/path, the relation is not exact enough to prove ownership,
// but it is too close to ignore for body/accessory ambiguity checks.  Treat it
// as a conflict (rather than as a match) so the shared-bone rule stays
// fail-closed.
function ambiguousAssemblyPointerCollision(left, right) {
    if (exactAssemblyPointerMatch(left, right))
        return false;
    var leftKey = pointerFilePathKey(left);
    var rightKey = pointerFilePathKey(right);
    return Boolean(leftKey && rightKey && leftKey === rightKey
        && (sourceReferenceFromUnknown(left) || sourceReferenceFromUnknown(right)));
}
function rendererAttachmentEvidence(assembly, renderer) {
    var _a, _b, _c;
    var attachments = ((_a = assembly === null || assembly === void 0 ? void 0 : assembly.attachments) !== null && _a !== void 0 ? _a : {});
    var exactRendererReferences = new Set();
    var ambiguousRendererReferences = new Set();
    // New inventories may carry exact renderer identities.  Read the optional
    // shape without making old inventories opt into name-based trust.
    for (var _i = 0, _d = [
        'equipmentRendererReferences', 'weaponRendererReferences',
        'mainWeaponRendererReferences', 'subWeaponRendererReferences',
        'accessoryRendererReferences',
    ]; _i < _d.length; _i++) {
        var key = _d[_i];
        for (var _e = 0, _f = recordArray(attachments[key]); _e < _f.length; _e++) {
            var item = _f[_e];
            var reference = sourceReferenceFromUnknown(item);
            if (reference)
                exactRendererReferences.add(referenceKey(reference));
        }
    }
    for (var _g = 0, _h = recordArray(attachments.equipmentRendererAmbiguities); _g < _h.length; _g++) {
        var ambiguity = _h[_g];
        if (!ambiguity || typeof ambiguity !== 'object')
            continue;
        for (var _j = 0, _k = recordArray(ambiguity.sourceReferences); _j < _k.length; _j++) {
            var item = _k[_j];
            var reference = sourceReferenceFromUnknown(item);
            if (reference)
                ambiguousRendererReferences.add(referenceKey(reference));
        }
    }
    var exactGroupEvidence = recordArray(attachments.equipmentRendererGroups)
        .filter(function (group) { return group && typeof group === 'object'; })
        .flatMap(function (group) {
        var record = group;
        var references = recordArray(record.sourceReferences)
            .map(sourceReferenceFromUnknown)
            .filter(function (value) { return Boolean(value); });
        var evidence = recordArray(record.evidence).filter(function (value) { return typeof value === 'string'; });
        return renderer.sourceReference && references.some(function (reference) { return referenceKey(reference) === referenceKey(renderer.sourceReference); })
            ? evidence : [];
    });
    var ambiguousEquipmentNames = new Set(recordArray(attachments.equipmentRendererAmbiguities)
        .flatMap(function (value) { return value && typeof value === 'object' && typeof value.name === 'string'
        ? [value.name.toLowerCase()] : []; }));
    var attachmentBones = [];
    for (var _l = 0, _m = ['mainWeapon', 'subWeapon']; _l < _m.length; _l++) {
        var key = _m[_l];
        for (var _o = 0, _p = recordArray(attachments[key]); _o < _p.length; _o++) {
            var item = _p[_o];
            if (!item || typeof item !== 'object')
                continue;
            attachmentBones.push(item);
        }
    }
    var rootBone = renderer.rootBone;
    var rendererBones = __spreadArray(__spreadArray([rootBone], ((_b = renderer.transformChain) !== null && _b !== void 0 ? _b : []), true), ((_c = renderer.boneReferences) !== null && _c !== void 0 ? _c : []), true).filter(function (item) { return Boolean(item); });
    var exactReference = renderer.sourceReference ? referenceKey(renderer.sourceReference) : null;
    return {
        exactRenderer: Boolean(exactReference && exactRendererReferences.has(exactReference)),
        ambiguousEquipment: Boolean(exactReference && ambiguousRendererReferences.has(exactReference)),
        ambiguousName: ambiguousEquipmentNames.has(renderer.name.toLowerCase()),
        exactGroupEvidence: exactGroupEvidence,
        // A legacy equipment name is intentionally ignored.  Only the complete
        // renderer reference (or an exact serialized bone pointer) can protect a
        // renderer from presentation exclusion.
        // The source extractor now preserves the complete transform chain and
        // m_Bones list.  Any exact main/sub-weapon pointer match is an authored
        // relation; names alone are deliberately never used here.
        attachedBone: attachmentBones.some(function (attachment) { return rendererBones.some(function (pointer) { return exactAssemblyPointerMatch(pointer, attachment); }); }),
    };
}
function coreShaderIdentity(value) {
    var identity = normalizedShaderIdentity(value);
    return /^mx\/(?:c-(?:face|eyesmouth|eyebrow|hair|general|simple|halo|weapon|transparent-st)|e-(?:standard|water-v2)|unlit-outline)(?:\/|$)/.test(identity)
        || /^projectmx\/(?:weapontest1damage|weapon)/.test(identity)
        || identity.includes('mxcharacterface') || identity.includes('mxcharactereyesmouth')
        || identity.includes('mxcharacterhair') || identity.includes('mxcharacterweapon')
        || identity.includes('mxcharacterhalo') || identity.includes('mxcharactergeneral');
}
/**
 * These names are source-role exceptions, not a general name classifier.
 * They cover authored core renderers that deliberately live under cut-in/FX
 * branches and can therefore not be identified from hierarchy hints alone.
 */
function exactCoreRendererName(name) {
    var normalized = name.trim().toLowerCase().replaceAll(' ', '_');
    return normalized === 'ch0123_cutin_body' || normalized === 'fx_aris_original_weapon';
}
function presentationMaterialName(name) {
    var _a;
    var value = (_a = name === null || name === void 0 ? void 0 : name.trim().replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()) !== null && _a !== void 0 ? _a : '';
    if (!value)
        return false;
    return /(?:^|[_\/.\-\s])fx(?:[_\/.\-\s]|$)/.test(value)
        || /(?:^|[_\/.\-\s])(?:effect|effects|glow|fire|distort|focus|aura|flower|leaf|logo|light|screen|overlay|transition|background|bg|butterfly|glitch|plane|cutin)(?:$|[_\/.\-\s])/.test(value);
}
function presentationShaderIdentity(value) {
    var identity = normalizedShaderIdentity(value);
    return /^dsfx\/(?:fx[_/]shader[_/]|shader[_/])/.test(identity)
        || /^fx[_/]shader[_/]/.test(identity);
}
function exactCoreRendererReferences(assembly) {
    var _a;
    var references = new Set();
    var attachments = ((_a = assembly === null || assembly === void 0 ? void 0 : assembly.attachments) !== null && _a !== void 0 ? _a : {});
    for (var _i = 0, _b = [
        'coreRendererReferences', 'bodyRendererReferences', 'faceRendererReferences',
        'eyeRendererReferences', 'mouthRendererReferences', 'weaponRendererReferences',
        'equipmentRendererReferences', 'mainWeaponRendererReferences', 'subWeaponRendererReferences',
        'accessoryRendererReferences',
    ]; _i < _b.length; _i++) {
        var key = _b[_i];
        for (var _c = 0, _d = recordArray(attachments[key]); _c < _d.length; _c++) {
            var item = _d[_c];
            var reference = sourceReferenceFromUnknown(item);
            if (reference)
                references.add(referenceKey(reference));
        }
    }
    for (var _e = 0, _f = ['mouthRenderer', 'eyes']; _e < _f.length; _e++) {
        var key = _f[_e];
        for (var _g = 0, _h = recordArray(attachments[key]); _g < _h.length; _g++) {
            var item = _h[_g];
            var reference = sourceReferenceFromUnknown(item);
            if (reference)
                references.add(referenceKey(reference));
        }
    }
    for (var _j = 0, _k = recordArray(attachments.mouthMetadata); _j < _k.length; _j++) {
        var item = _k[_j];
        var reference = sourceReferenceFromUnknown(item);
        if (reference)
            references.add(referenceKey(reference));
    }
    return references;
}
function presentationPathEvidence(renderer) {
    var _a;
    var hierarchy = ((_a = renderer.hierarchyPath) !== null && _a !== void 0 ? _a : '').replaceAll('\\', '/').toLowerCase();
    var value = "".concat(hierarchy, "/").concat(renderer.name);
    var branch = /(?:^|[\/_\-])(?:fx(?:[\/_\-]|$)|effect(?:s)?(?:[\/_\-]|$)|camera\d*(?:[\/_\-]|$)|cam(?:era)?(?:[\/_\-]|$)|cutin(?:[\/_\-]|$)|cut[_-]in(?:[\/_\-]|$)|ex[_-]?root(?:[\/_\-]|$)|overlay(?:[\/_\-]|$)|transition(?:[\/_\-]|$)|presentation(?:[\/_\-]|$))/.test(value)
        || /(?:^|[\/_\-])cutin(?:root|cam|branch)?(?:[\/_\-]|$)/.test(hierarchy);
    var role = /(?:^|[\/_\-])(?:logo|background|bg(?:[\/_\-]|$)|screen|plane|glitch|black|white|glow|fire|distort|focus|aura|butterfly|flower|leaf|light|transition|overlay)(?:$|[\/_\-])/.test(value);
    return { branch: branch, role: role, value: value };
}
/**
 * These are deliberately specific authored equipment terms.  Generic words
 * such as `prop`, `bag`, `outline`, `accessory`, and `equipment` are omitted:
 * they occur on presentation helpers and ordinary skill props.  A renderer
 * must still carry exact source mesh/material/shader identities and a second
 * independent source-semantic signal before it can become a blocker.
 */
var MEANINGFUL_EQUIPMENT_TOKENS = new Set([
    'weapon', 'weapons', 'handgun', 'pistol', 'rifle', 'railgun', 'machinegun', 'shotgun', 'sniper',
    'cannon', 'launcher', 'bazooka', 'sword', 'blade', 'knife', 'dagger', 'bow', 'staff', 'spear',
    'lance', 'shield', 'turret', 'drone', 'chain', 'hagoita', 'mk19', 'grenade', 'hammer', 'scythe',
    'axe', 'mace', 'crossbow', 'smartphone', 'phone', 'tablet', 'microphone', 'guitar', 'umbrella',
    'robot', 'mechanical', 'vehicle', 'toggle',
]);
var SPECIFIC_EQUIPMENT_TOKENS = new Set([
    'handgun', 'pistol', 'rifle', 'railgun', 'machinegun', 'shotgun', 'sniper', 'cannon', 'launcher',
    'bazooka', 'sword', 'blade', 'knife', 'dagger', 'bow', 'staff', 'spear', 'lance', 'shield',
    'turret', 'drone', 'chain', 'hagoita', 'mk19', 'grenade', 'hammer', 'scythe', 'axe', 'mace',
    'crossbow', 'smartphone', 'phone', 'tablet', 'microphone', 'guitar', 'umbrella',
]);
function sourceSemanticTokens(value) {
    return new Set((value !== null && value !== void 0 ? value : '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean));
}
function meaningfulEquipmentTokens(value) {
    return __spreadArray([], sourceSemanticTokens(value), true).filter(function (token) { return MEANINGFUL_EQUIPMENT_TOKENS.has(token); });
}
// Unity source uses both underscore and whitespace separators for Bip001
// ancestry (for example Bip001_Weapon and Bip001 Prop1).  This is only a
// semantic ancestry label; exact source pointer, prefab, skin, mesh, material,
// shader, and conflict checks still gate structural evidence below.
function isBip001AncestryName(value) {
    var _a;
    var normalized = (_a = value === null || value === void 0 ? void 0 : value.trim().toLowerCase()) !== null && _a !== void 0 ? _a : '';
    return normalized === 'bip001' || /^bip001(?:[\s_-]|$)/.test(normalized);
}
var STRUCTURAL_EQUIPMENT_ANCHOR_NAME = 'bip001_weapon';
function meaningfulRendererNameTokens(renderer) {
    var tokens = sourceSemanticTokens(renderer.name);
    // A fixture/body material can contain a weapon shader or a character name
    // containing "weapon" without the renderer itself being equipment.  Do not
    // turn a body/face/hair renderer into a weapon blocker from that substring.
    if (['body', 'face', 'hair', 'head', 'eye', 'mouth', 'eyebrow', 'skin', 'clothing', 'outfit', 'uniform']
        .some(function (token) { return tokens.has(token); }))
        return [];
    return __spreadArray([], tokens, true).filter(function (token) { return MEANINGFUL_EQUIPMENT_TOKENS.has(token); });
}
function weaponShaderIdentity(value) {
    var identity = normalizedShaderIdentity(value);
    return /^mx\/c-weapon(?:\/|$)/.test(identity)
        || /^projectmx\/(?:weapon|weapontest1damage)(?:\/|$)/.test(identity)
        || identity.includes('mxcharacterweapon');
}
function exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex) {
    var _a, _b, _c;
    if (!renderer.sourceReference || !renderer.meshSourceReference)
        return null;
    var slots = (_a = renderer.materialSlots) !== null && _a !== void 0 ? _a : [];
    if (!slots.length)
        return null;
    var records = [];
    for (var _i = 0, slots_1 = slots; _i < slots_1.length; _i++) {
        var slot = slots_1[_i];
        var materialReference = (_b = slot.sourceMaterialReference) !== null && _b !== void 0 ? _b : null;
        if (!materialReference)
            return null;
        var material = materialIndex.get(referenceKey(materialReference));
        if (!(material === null || material === void 0 ? void 0 : material.sourceReference) || referenceKey(material.sourceReference) !== referenceKey(materialReference))
            return null;
        var shaderReference = (_c = material.shaderReference) !== null && _c !== void 0 ? _c : null;
        if (!shaderReference)
            return null;
        var shader = shaderIndex.get(referenceKey(shaderReference));
        if (!(shader === null || shader === void 0 ? void 0 : shader.sourceReference) || referenceKey(shader.sourceReference) !== referenceKey(shaderReference))
            return null;
        records.push({ material: material, shader: shader, materialReference: materialReference, shaderReference: shaderReference });
    }
    return records;
}
function completeAssemblyPointer(value) {
    if (!value || typeof value !== 'object')
        return false;
    var pointer = value;
    return typeof pointer.file === 'string' && pointer.file.length > 0
        && typeof pointer.pathId === 'string' && pointer.pathId !== '0'
        && typeof pointer.name === 'string' && pointer.name.trim().length > 0;
}
function rootBoneAncestry(renderer) {
    var _a, _b;
    var extended = renderer;
    var value = (_b = (_a = extended.rootBoneAncestry) !== null && _a !== void 0 ? _a : extended.rootBoneParentChain) !== null && _b !== void 0 ? _b : extended.rootBoneTransformChain;
    return Array.isArray(value) ? value : null;
}
function rootBoneAncestryComplete(renderer) {
    return renderer.rootBoneAncestryComplete !== false;
}
function exactSourcePointerIdentity(pointer, sourceReference) {
    if (!completeAssemblyPointer(pointer))
        return false;
    var pointerReference = sourceReferenceFromUnknown(pointer);
    return Boolean(pointerReference
        && pointerReference.bundleSha256.toLowerCase() === sourceReference.bundleSha256.toLowerCase()
        && normalizedSerializedFile(pointerReference.serializedFile) === normalizedSerializedFile(sourceReference.serializedFile)
        && pointerReference.objectId === pointer.pathId
        && normalizedSerializedFile(pointer.file) === normalizedSerializedFile(sourceReference.serializedFile));
}
function pointerKey(value) {
    if (!value || !completeAssemblyPointer(value))
        return null;
    var sourceReference = sourceReferenceFromUnknown(value);
    return sourceReference ? "reference:".concat(referenceKey(sourceReference)) : pointerFilePathKey(value);
}
function pointerName(value) {
    return value && completeAssemblyPointer(value) ? value.name.trim().toLowerCase() : null;
}
function pointerMatchesSourceFile(value, serializedFile, bundleSha256) {
    if (!value || !completeAssemblyPointer(value)
        || normalizedSerializedFile(value.file) !== normalizedSerializedFile(serializedFile))
        return false;
    var sourceReference = sourceReferenceFromUnknown(value);
    return !sourceReference || (normalizedSerializedFile(sourceReference.serializedFile) === normalizedSerializedFile(value.file)
        && sourceReference.objectId === value.pathId
        && (!bundleSha256 || sourceReference.bundleSha256.toLowerCase() === bundleSha256.toLowerCase()));
}
function pointerMatchesSourceReference(value, sourceReference) {
    if (!value || typeof value !== 'object')
        return false;
    var pointer = value;
    if (typeof pointer.file !== 'string' || typeof pointer.pathId !== 'string'
        || normalizedSerializedFile(pointer.file) !== normalizedSerializedFile(sourceReference.serializedFile)
        || pointer.pathId !== sourceReference.objectId)
        return false;
    var pointerReference = sourceReferenceFromUnknown(value);
    return !pointerReference || referenceKey(pointerReference) === referenceKey(sourceReference);
}
function cloneAssemblyPointer(value) {
    return value && completeAssemblyPointer(value)
        ? { file: value.file, pathId: value.pathId, name: value.name }
        : null;
}
function cloneAssemblyPointers(values) {
    return (values !== null && values !== void 0 ? values : []).filter(completeAssemblyPointer).map(function (value) { return ({
        file: value.file, pathId: value.pathId, name: value.name,
    }); });
}
function cloneAssemblyPointersWithSource(values) {
    return (values !== null && values !== void 0 ? values : []).filter(completeAssemblyPointer).map(function (value) { return (__assign({ file: value.file, pathId: value.pathId, name: value.name }, (sourceReferenceFromUnknown(value) ? { sourceReference: sourceReferenceFromUnknown(value) } : {}))); });
}
function normalizedHierarchySegments(value) {
    return (value !== null && value !== void 0 ? value : '').replaceAll('\\', '/').split('/').map(function (item) { return item.trim().toLowerCase(); }).filter(Boolean);
}
function namesMatchHierarchyPrefix(hierarchyPath, root, chain) {
    var hierarchy = normalizedHierarchySegments(hierarchyPath);
    var names = chain.map(pointerName);
    if (!hierarchy.length || hierarchy[0] !== root.trim().toLowerCase() || names.some(function (value) { return !value; }))
        return false;
    if (names.length > hierarchy.length)
        return false;
    return names.every(function (name, index) { return name === hierarchy[index]; });
}
var MIN_SHARED_EQUIPMENT_BONES = 3;
function exactSourceWeaponAncestorEvidence(assembly, renderer) {
    var _a, _b, _c, _d, _e, _f;
    var sourceReference = (_a = renderer.sourceReference) !== null && _a !== void 0 ? _a : null;
    var prefabReference = (_b = assembly.prefabReference) !== null && _b !== void 0 ? _b : null;
    var rootBone = (_c = renderer.rootBone) !== null && _c !== void 0 ? _c : null;
    var ancestry = rootBoneAncestry(renderer);
    if (!sourceReference || !prefabReference || !rootBone || !(ancestry === null || ancestry === void 0 ? void 0 : ancestry.length)
        || !rootBoneAncestryComplete(renderer))
        return null;
    if (prefabReference.bundleSha256.toLowerCase() !== sourceReference.bundleSha256.toLowerCase()
        || normalizedSerializedFile(prefabReference.serializedFile) !== normalizedSerializedFile(sourceReference.serializedFile))
        return null;
    if (!exactSourcePointerIdentity(rootBone, sourceReference))
        return null;
    if (ancestry.some(function (pointer) { return !exactSourcePointerIdentity(pointer, sourceReference); }))
        return null;
    var ancestryKeys = ancestry.map(function (pointer) { return pointerKey(pointer); });
    if (ancestryKeys.some(function (key, index) { return !key || ancestryKeys.indexOf(key) !== index; }))
        return null;
    var attachments = ((_d = assembly.attachments) !== null && _d !== void 0 ? _d : {});
    var authoredAttachments = ['mainWeapon', 'subWeapon'].flatMap(function (kind) {
        return recordArray(attachments[kind]).map(function (pointer) { return ({ kind: kind, pointer: pointer }); });
    });
    // Every authored weapon pointer must carry a full source identity.  A
    // missing identity is not allowed to sit beside an otherwise matching
    // ancestor and silently change the one-to-one conclusion.
    if (!authoredAttachments.length || authoredAttachments.some(function (item) {
        return !exactSourcePointerIdentity(item.pointer, sourceReference);
    }))
        return null;
    var matches = ancestry.flatMap(function (pointer) {
        var pointerMatches = authoredAttachments.filter(function (item) { return exactAssemblyPointerMatch(pointer, item.pointer); });
        return pointerMatches.length ? [{ pointer: pointer, attachments: pointerMatches }] : [];
    });
    // Exactly one authored mainWeapon/subWeapon pointer must be reached.  This
    // rejects duplicate slots, multiple weapon ancestors, and same-name decoys.
    if (matches.length !== 1 || matches[0].attachments.length !== 1)
        return null;
    var matchedAncestor = matches[0].pointer;
    return {
        rootBone: rootBone,
        transformChain: (_e = renderer.transformChain) !== null && _e !== void 0 ? _e : [],
        rootBoneAncestry: ancestry,
        boneReferences: (_f = renderer.boneReferences) !== null && _f !== void 0 ? _f : [],
        matchedAncestorPointers: [matchedAncestor],
        equipmentAnchor: null,
        equipmentTokens: [],
        sourceReference: sourceReference,
        sharedBonePointers: [],
        relationKind: 'exact-source-weapon-ancestry',
    };
}
function structuralEquipmentHierarchyEvidence(assembly, renderer) {
    var _a, _b, _c, _d;
    var rootBone = (_a = renderer.rootBone) !== null && _a !== void 0 ? _a : null;
    var transformChain = (_b = renderer.transformChain) !== null && _b !== void 0 ? _b : [];
    var boneReferences = (_c = renderer.boneReferences) !== null && _c !== void 0 ? _c : [];
    var sourceReference = (_d = renderer.sourceReference) !== null && _d !== void 0 ? _d : null;
    if (!sourceReference || !renderer.hierarchyPath || !renderer.meshSourceReference || !renderer.mesh)
        return null;
    if (renderer.pathId !== sourceReference.objectId)
        return null;
    if (!completeAssemblyPointer(rootBone)
        || !transformChain.length || transformChain.some(function (pointer) { return !completeAssemblyPointer(pointer); })
        || !boneReferences.length || boneReferences.some(function (pointer) { return !completeAssemblyPointer(pointer); }))
        return null;
    var hierarchySegments = normalizedHierarchySegments(renderer.hierarchyPath);
    var chainNames = transformChain.map(pointerName).filter(function (value) { return Boolean(value); });
    var rootBoneName = pointerName(rootBone);
    var authoredAncestryNames = __spreadArray(__spreadArray([], (rootBoneName ? [rootBoneName] : []), true), chainNames, true);
    var rootBoneKey = pointerKey(rootBone);
    var hierarchyPrefixMatch = namesMatchHierarchyPrefix(renderer.hierarchyPath, assembly.root, transformChain);
    var equipmentAnchorCandidates = boneReferences.filter(function (pointer) { return pointerName(pointer) === STRUCTURAL_EQUIPMENT_ANCHOR_NAME; });
    // The anchor is an exact serialized m_Bones pointer, not a name-only hint.
    // Keep it optional for the older structural cases already proven by their
    // rooted transform ancestry, but reject an ambiguous same-name relation.
    if (equipmentAnchorCandidates.length > 1)
        return null;
    var equipmentAnchor = equipmentAnchorCandidates.length === 1 ? equipmentAnchorCandidates[0] : null;
    var equipmentAnchorKey = pointerKey(equipmentAnchor);
    var sameNameAnchorCollision = __spreadArray([rootBone], transformChain, true).filter(function (pointer) { return pointerName(pointer) === STRUCTURAL_EQUIPMENT_ANCHOR_NAME; })
        .some(function (pointer) { return pointerKey(pointer) !== equipmentAnchorKey; });
    if (sameNameAnchorCollision)
        return null;
    var sourceBoneChainMatch = chainNames.includes('bone_root')
        && chainNames.some(function (value) { return isBip001AncestryName(value); })
        && chainNames.some(function (value) { return value.includes('weapon') || value.includes('turret') || value.includes('grenade') || value.includes('toggle') || value.includes('robot'); })
        && hierarchySegments[0] === assembly.root.trim().toLowerCase();
    var sameNamedChainBones = rootBoneName
        ? transformChain.filter(function (pointer) { return pointerName(pointer) === rootBoneName; })
        : [];
    if (sameNamedChainBones.length && !sameNamedChainBones.some(function (pointer) { return pointerKey(pointer) === rootBoneKey; }))
        return null;
    if (!hierarchyPrefixMatch && !sourceBoneChainMatch)
        return null;
    var serializedFile = sourceReference.serializedFile;
    var allPointers = __spreadArray(__spreadArray([rootBone], transformChain, true), boneReferences, true);
    if (!allPointers.every(function (pointer) { return pointerMatchesSourceFile(pointer, serializedFile, sourceReference.bundleSha256); }))
        return null;
    if (!assembly.prefabReference
        || normalizedSerializedFile(assembly.prefabReference.serializedFile) !== normalizedSerializedFile(sourceReference.serializedFile)
        || assembly.prefabReference.bundleSha256.toLowerCase() !== sourceReference.bundleSha256.toLowerCase())
        return null;
    if (!pointerMatchesSourceReference(renderer.mesh, renderer.meshSourceReference))
        return null;
    var chainTokens = new Set(transformChain.flatMap(function (pointer) { return meaningfulEquipmentTokens(pointer.name); }));
    var hierarchyTokens = new Set(hierarchySegments
        .flatMap(function (value) { return meaningfulEquipmentTokens(value); }));
    var rendererTokens = meaningfulEquipmentTokens(renderer.name);
    // A source shader is intentionally not consulted here.  The equipment role
    // must be corroborated by authored renderer/mesh/transform names and exact
    // pointer identity, never by shader family or export order alone.
    var equipmentTokens = __spreadArray([], new Set(__spreadArray(__spreadArray(__spreadArray([], rendererTokens, true), chainTokens, true), hierarchyTokens, true)), true);
    if (!equipmentTokens.length)
        return null;
    var hasSkeletonAncestry = hierarchySegments.includes('bone_root')
        && hierarchySegments.some(function (value) { return isBip001AncestryName(value); })
        || authoredAncestryNames.some(function (value) { return isBip001AncestryName(value); })
        || sourceBoneChainMatch
        // Sena/Aru-shaped prefabs root the renderer at a prop/chain bone, while
        // their exact source m_Bones list still carries Bip001_Weapon.  The
        // source file/path identity and all conflict checks below remain required.
        || Boolean(equipmentAnchor);
    var hasRobotAncestry = hierarchySegments.some(function (value) { return value.includes('robot'); })
        || chainNames.some(function (value) { return value.includes('robot'); })
        || Boolean(rootBoneName === null || rootBoneName === void 0 ? void 0 : rootBoneName.includes('robot'));
    if (!hasSkeletonAncestry && !hasRobotAncestry)
        return null;
    var matchedAncestorPointers = __spreadArray(__spreadArray([rootBone], transformChain, true), (equipmentAnchor ? [equipmentAnchor] : []), true).filter(function (pointer, index, values) {
        if (!completeAssemblyPointer(pointer))
            return false;
        if (pointerName(pointer) === renderer.name.trim().toLowerCase())
            return false;
        if (pointerName(pointer) === assembly.root.trim().toLowerCase())
            return false;
        if (values.findIndex(function (value) { return pointerKey(value) === pointerKey(pointer); }) !== index)
            return false;
        var tokens = meaningfulEquipmentTokens(pointer.name);
        var isRootBone = pointerKey(pointer) === rootBoneKey;
        return tokens.length > 0 || (isRootBone && isBip001AncestryName(pointerName(pointer)));
    });
    if (!matchedAncestorPointers.length)
        return null;
    return {
        rootBone: rootBone,
        transformChain: transformChain,
        rootBoneAncestry: [],
        boneReferences: boneReferences,
        matchedAncestorPointers: matchedAncestorPointers,
        equipmentAnchor: equipmentAnchor,
        equipmentTokens: equipmentTokens,
        sourceReference: sourceReference,
        sharedBonePointers: [],
        relationKind: 'transform-ancestry',
    };
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
function sharedEquipmentBoneEvidence(assembly, renderer, materialIndex, shaderIndex) {
    var _a, _b, _c, _d, _e;
    var sourceReference = (_a = renderer.sourceReference) !== null && _a !== void 0 ? _a : null;
    var prefabReference = (_b = assembly.prefabReference) !== null && _b !== void 0 ? _b : null;
    var rootBone = (_c = renderer.rootBone) !== null && _c !== void 0 ? _c : null;
    var transformChain = (_d = renderer.transformChain) !== null && _d !== void 0 ? _d : [];
    var boneReferences = (_e = renderer.boneReferences) !== null && _e !== void 0 ? _e : [];
    if (!sourceReference || !prefabReference || !renderer.hierarchyPath || !renderer.meshSourceReference || !renderer.mesh
        || renderer.pathId !== sourceReference.objectId
        || !completeAssemblyPointer(rootBone)
        || transformChain.some(function (pointer) { return !completeAssemblyPointer(pointer); })
        || boneReferences.length < MIN_SHARED_EQUIPMENT_BONES
        || boneReferences.some(function (pointer) { return !completeAssemblyPointer(pointer); }))
        return null;
    if (normalizedSerializedFile(sourceReference.serializedFile) !== normalizedSerializedFile(prefabReference.serializedFile)
        || sourceReference.bundleSha256.toLowerCase() !== prefabReference.bundleSha256.toLowerCase())
        return null;
    if (!pointerMatchesSourceReference(renderer.mesh, renderer.meshSourceReference))
        return null;
    var sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex);
    if (!sourceEvidence)
        return null;
    var allRendererPointers = __spreadArray(__spreadArray([rootBone], transformChain, true), boneReferences, true);
    if (!allRendererPointers.every(function (pointer) { return pointerMatchesSourceFile(pointer, sourceReference.serializedFile, sourceReference.bundleSha256); }))
        return null;
    var attachment = rendererAttachmentEvidence(assembly, renderer);
    if (attachment.ambiguousEquipment || attachment.ambiguousName)
        return null;
    if (isLikelyBodyRenderer(renderer))
        return null;
    // The candidate must carry an authored equipment term in its own source
    // renderer/hierarchy/bone identity.  This is a semantic corroboration only;
    // no character name or renderer ID is accepted as a rule key.
    var rendererSemanticValues = __spreadArray(__spreadArray([
        renderer.name,
        renderer.hierarchyPath,
        rootBone.name
    ], transformChain.map(function (pointer) { return pointer.name; }), true), boneReferences.map(function (pointer) { return pointer.name; }), true);
    var equipmentTokens = __spreadArray([], new Set(rendererSemanticValues.flatMap(function (value) { return meaningfulEquipmentTokens(value); })), true);
    // Do not let a display name or character ID be the only role signal.  The
    // specific token must also occur in serialized bone/root evidence; Hoshino's
    // shield supplies bone_Shield_00 and several bone_Shield_* descendants.
    var sourceSpecificEquipmentTokens = __spreadArray([], new Set(__spreadArray([
        rootBone.name
    ], boneReferences.map(function (pointer) { return pointer.name; }), true).flatMap(function (value) { return meaningfulEquipmentTokens(value); })), true).filter(function (token) { return SPECIFIC_EQUIPMENT_TOKENS.has(token); });
    if (!sourceSpecificEquipmentTokens.length)
        return null;
    var bodyRenderers = assembly.renderers.filter(isLikelyBodyRenderer);
    var candidateBoneKeys = new Set(boneReferences
        .map(function (pointer) { return pointerKey(pointer); }).filter(function (key) { return Boolean(key); }));
    // A shared m_Bones relation must not reuse a body-owned pointer.  Unlike the
    // older ancestry rule, zero body overlap is required because there is no
    // explicit attachment constraint to break the accessory/body ambiguity.
    if (bodyRenderers.some(function (body) {
        var _a;
        return __spreadArray([body.rootBone], ((_a = body.boneReferences) !== null && _a !== void 0 ? _a : []), true).filter(completeAssemblyPointer)
            .some(function (pointer) {
            var _a;
            return candidateBoneKeys.has((_a = pointerKey(pointer)) !== null && _a !== void 0 ? _a : '')
                || exactAssemblyPointerMatch(pointer, rootBone)
                || ambiguousAssemblyPointerCollision(pointer, rootBone)
                || boneReferences.some(function (candidatePointer) { return ambiguousAssemblyPointerCollision(pointer, candidatePointer); });
        });
    }))
        return null;
    var seedCandidates = assembly.renderers.filter(function (seed) {
        var _a, _b;
        if (seed === renderer || seed.visible === false || seed.rendererType !== 'SkinnedMeshRenderer'
            || isLikelyBodyRenderer(seed) || !seed.sourceReference || !seed.rootBone)
            return false;
        if (seed.pathId !== seed.sourceReference.objectId)
            return false;
        if (normalizedSerializedFile(seed.sourceReference.serializedFile) !== normalizedSerializedFile(prefabReference.serializedFile)
            || seed.sourceReference.bundleSha256.toLowerCase() !== prefabReference.bundleSha256.toLowerCase())
            return false;
        var seedEvidence = exactEquipmentBindingEvidence(assembly, seed, materialIndex, shaderIndex);
        if (!seedEvidence || (seedEvidence.classification !== 'exact-equipment-renderer'
            && seedEvidence.classification !== 'exact-main-sub-equipment'))
            return false;
        if (!seed.mesh || !seed.meshSourceReference || !pointerMatchesSourceReference(seed.mesh, seed.meshSourceReference))
            return false;
        var seedBones = (_a = seed.boneReferences) !== null && _a !== void 0 ? _a : [];
        var seedTransformChain = (_b = seed.transformChain) !== null && _b !== void 0 ? _b : [];
        return completeAssemblyPointer(seed.rootBone)
            && seedBones.length >= MIN_SHARED_EQUIPMENT_BONES
            && seedBones.every(function (pointer) { return completeAssemblyPointer(pointer); })
            && seedTransformChain.every(function (pointer) { return completeAssemblyPointer(pointer); })
            && __spreadArray(__spreadArray([seed.rootBone], seedTransformChain, true), seedBones, true).every(function (pointer) {
                return pointerMatchesSourceFile(pointer, seed.sourceReference.serializedFile, seed.sourceReference.bundleSha256);
            });
    });
    if (!seedCandidates.length)
        return null;
    var relations = seedCandidates.map(function (seed) {
        var _a;
        var seedBones = (_a = seed.boneReferences) !== null && _a !== void 0 ? _a : [];
        var sharedPointers = boneReferences.filter(function (pointer) {
            return seedBones.some(function (seedPointer) { return exactAssemblyPointerMatch(pointer, seedPointer); });
        })
            .filter(function (pointer, index, values) {
            var key = pointerKey(pointer);
            return Boolean(key) && values.findIndex(function (value) { return pointerKey(value) === key; }) === index;
        });
        return { seed: seed, sharedPointers: sharedPointers };
    }).filter(function (relation) { return relation.sharedPointers.length >= MIN_SHARED_EQUIPMENT_BONES; });
    // Multiple exact authored seeds would make the shared relation ambiguous.
    if (relations.length !== 1)
        return null;
    var _f = relations[0], seed = _f.seed, sharedPointers = _f.sharedPointers;
    if (exactAssemblyPointerMatch(rootBone, seed.rootBone)
        || ambiguousAssemblyPointerCollision(rootBone, seed.rootBone))
        return null;
    var sharedKeys = new Set(sharedPointers
        .map(function (pointer) { return pointerKey(pointer); }).filter(function (key) { return Boolean(key); }));
    var localBonePointers = boneReferences.filter(function (pointer) { var _a; return !sharedKeys.has((_a = pointerKey(pointer)) !== null && _a !== void 0 ? _a : ''); });
    if (!localBonePointers.length)
        return null;
    // A second visible SkinnedMeshRenderer with the same exact relation would
    // leave body/accessory ownership unresolved, so keep both candidates blocked.
    var competingRelations = assembly.renderers.filter(function (other) {
        var _a;
        return other !== renderer && other !== seed
            && other.visible !== false
            && other.rendererType === 'SkinnedMeshRenderer'
            && !isLikelyBodyRenderer(other)
            && ((_a = other.boneReferences) !== null && _a !== void 0 ? _a : []).filter(completeAssemblyPointer)
                .some(function (pointer) { var _a; return sharedKeys.has((_a = pointerKey(pointer)) !== null && _a !== void 0 ? _a : ''); })
            && sharedPointers.every(function (pointer) {
                var _a;
                return ((_a = other.boneReferences) !== null && _a !== void 0 ? _a : [])
                    .filter(completeAssemblyPointer)
                    .some(function (otherPointer) { return exactAssemblyPointerMatch(pointer, otherPointer)
                    || ambiguousAssemblyPointerCollision(pointer, otherPointer); });
            });
    });
    if (competingRelations.length > 0)
        return null;
    var matchedAncestorPointers = __spreadArray([], sharedPointers, true).sort(function (left, right) { var _a, _b; return ((_a = pointerKey(left)) !== null && _a !== void 0 ? _a : '').localeCompare((_b = pointerKey(right)) !== null && _b !== void 0 ? _b : ''); });
    return {
        rootBone: rootBone,
        transformChain: transformChain,
        rootBoneAncestry: [],
        boneReferences: boneReferences,
        matchedAncestorPointers: matchedAncestorPointers,
        equipmentAnchor: null,
        equipmentTokens: equipmentTokens,
        sourceReference: sourceReference,
        sharedBonePointers: matchedAncestorPointers,
        relationKind: 'shared-equipment-mBones',
    };
}
function rendererUsesExactAssemblyPointer(renderer, pointer) {
    var _a, _b, _c;
    var key = pointerKey(pointer);
    return Boolean(key && __spreadArray(__spreadArray(__spreadArray([renderer.rootBone], ((_a = renderer.transformChain) !== null && _a !== void 0 ? _a : []), true), ((_b = rootBoneAncestry(renderer)) !== null && _b !== void 0 ? _b : []), true), ((_c = renderer.boneReferences) !== null && _c !== void 0 ? _c : []), true).filter(completeAssemblyPointer)
        .some(function (value) { return pointerKey(value) === key; }));
}
function rendererUsesExactRigMountPointer(renderer, pointer) {
    var _a, _b;
    var key = pointerKey(pointer);
    return Boolean(key && __spreadArray(__spreadArray([renderer.rootBone], ((_a = renderer.transformChain) !== null && _a !== void 0 ? _a : []), true), ((_b = rootBoneAncestry(renderer)) !== null && _b !== void 0 ? _b : []), true).filter(completeAssemblyPointer)
        .some(function (value) { return pointerKey(value) === key; }));
}
function rendererUsesExactAttachmentPointer(renderer, pointer) {
    var _a, _b, _c;
    return __spreadArray(__spreadArray(__spreadArray([renderer.rootBone], ((_a = renderer.transformChain) !== null && _a !== void 0 ? _a : []), true), ((_b = rootBoneAncestry(renderer)) !== null && _b !== void 0 ? _b : []), true), ((_c = renderer.boneReferences) !== null && _c !== void 0 ? _c : []), true).filter(completeAssemblyPointer)
        .some(function (value) { return exactAssemblyPointerMatch(value, pointer); });
}
function rendererSourcePointerKeys(renderer) {
    var _a;
    // Transform/ancestry pointers identify the shared prefab hierarchy and are
    // expected to overlap between a primary weapon and a secondary prop.  Only
    // the renderer's root and bound skeleton pointers establish an interaction
    // claim that can make the secondary renderer ambiguous.
    return new Set(__spreadArray([
        renderer.rootBone
    ], ((_a = renderer.boneReferences) !== null && _a !== void 0 ? _a : []), true).filter(completeAssemblyPointer).map(pointerKey).filter(function (key) { return Boolean(key); }));
}
function isLikelyBodyRenderer(renderer) {
    var _a;
    if (renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer')
        return false;
    var nameTokens = sourceSemanticTokens(renderer.name);
    var bodyName = ['body', 'face', 'hair', 'head', 'skin', 'clothing', 'outfit', 'uniform', 'character']
        .some(function (token) { return nameTokens.has(token); });
    if (bodyName)
        return true;
    var hierarchyTokens = sourceSemanticTokens((_a = renderer.hierarchyPath) !== null && _a !== void 0 ? _a : '');
    if (__spreadArray([], hierarchyTokens, true).some(function (token) { return MEANINGFUL_EQUIPMENT_TOKENS.has(token); }))
        return false;
    return ['body', 'face', 'hair', 'head', 'skin', 'clothing', 'outfit', 'uniform', 'character']
        .some(function (token) { return hierarchyTokens.has(token); });
}
function structuralEquipmentBindingEvidence(assembly, renderer, materialIndex, shaderIndex) {
    var _a, _b, _c, _d, _e, _f;
    if (!assembly || renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer')
        return null;
    var attachment = rendererAttachmentEvidence(assembly, renderer);
    if (attachment.ambiguousEquipment || attachment.ambiguousName)
        return null;
    var sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex);
    if (!sourceEvidence || !renderer.meshSourceReference)
        return null;
    // Verify the serialized mesh/material/shader pointers as well as their full
    // source identities.  A source reference copied onto a different pointer is
    // not structural proof.
    if (!renderer.mesh || renderer.mesh.pathId !== renderer.meshSourceReference.objectId
        || normalizedSerializedFile(renderer.mesh.file) !== normalizedSerializedFile(renderer.meshSourceReference.serializedFile))
        return null;
    var _loop_11 = function (item) {
        var slot = ((_a = renderer.materialSlots) !== null && _a !== void 0 ? _a : []).find(function (value) { return value.sourceMaterialReference
            && referenceKey(value.sourceMaterialReference) === referenceKey(item.materialReference); });
        if (!(slot === null || slot === void 0 ? void 0 : slot.material) || !pointerMatchesSourceReference(slot.material, item.materialReference)
            || !item.material.shader || !item.material.shaderReference
            || !pointerMatchesSourceReference(item.material.shader, item.shaderReference))
            return { value: null };
    };
    for (var _i = 0, sourceEvidence_1 = sourceEvidence; _i < sourceEvidence_1.length; _i++) {
        var item = sourceEvidence_1[_i];
        var state_11 = _loop_11(item);
        if (typeof state_11 === "object")
            return state_11.value;
    }
    var sourceWeaponAncestorEvidence = exactSourceWeaponAncestorEvidence(assembly, renderer);
    var hierarchyEvidence = sourceWeaponAncestorEvidence ? null
        : structuralEquipmentHierarchyEvidence(assembly, renderer);
    var sharedBoneEvidence = sourceWeaponAncestorEvidence || hierarchyEvidence ? null
        : sharedEquipmentBoneEvidence(assembly, renderer, materialIndex, shaderIndex);
    var relationEvidence = (_b = sourceWeaponAncestorEvidence !== null && sourceWeaponAncestorEvidence !== void 0 ? sourceWeaponAncestorEvidence : hierarchyEvidence) !== null && _b !== void 0 ? _b : sharedBoneEvidence;
    if (!relationEvidence)
        return null;
    var bodyRenderers = assembly.renderers.filter(isLikelyBodyRenderer);
    var rendererStructuralPointers = __spreadArray(__spreadArray(__spreadArray([
        relationEvidence.rootBone
    ], relationEvidence.transformChain, true), relationEvidence.rootBoneAncestry, true), relationEvidence.boneReferences, true).filter(completeAssemblyPointer);
    var rendererPointerKeys = new Set(rendererStructuralPointers.map(function (pointer) { return pointerKey(pointer); }).filter(function (key) { return Boolean(key); }));
    var bodyOverlaps = bodyRenderers.map(function (body) {
        var _a;
        var overlap = ((_a = body.boneReferences) !== null && _a !== void 0 ? _a : []).filter(completeAssemblyPointer)
            .filter(function (pointer) { var _a; return rendererPointerKeys.has((_a = pointerKey(pointer)) !== null && _a !== void 0 ? _a : ''); });
        return { body: body, overlap: overlap };
    }).filter(function (item) { return item.overlap.length > 0; });
    // A Bip001_Weapon m_Bones anchor is usable only when no body or competing
    // renderer claims that exact serialized pointer.  Compare file/path (or a
    // complete source identity when present), never the transform name alone.
    if (relationEvidence.equipmentAnchor) {
        var bodySharingAnchor = bodyRenderers.filter(function (body) { return body !== renderer
            && rendererUsesExactAssemblyPointer(body, relationEvidence.equipmentAnchor); });
        var competingSharingAnchor = assembly.renderers.filter(function (other) { return other !== renderer
            && other.visible !== false
            && rendererUsesExactAssemblyPointer(other, relationEvidence.equipmentAnchor); });
        if (bodySharingAnchor.length > 0 || competingSharingAnchor.length > 0)
            return null;
    }
    // A body m_Bones overlap is useful corroboration when present, but it is
    // not required: Maki/Hibiki's authored weapon skins have a distinct bone
    // list even though their root/transform ancestry is inside the same prefab
    // rig.  Multiple overlapping body rigs remain a conflict; zero overlap is
    // safe only when the source hierarchy proof above is complete.
    if (bodyOverlaps.length > 1
        || (relationEvidence.relationKind === 'shared-equipment-mBones' && bodyOverlaps.length > 0))
        return null;
    if (relationEvidence.relationKind === 'exact-source-weapon-ancestry'
        && relationEvidence.matchedAncestorPointers.some(function (pointer) { return bodyRenderers.some(function (body) { return rendererUsesExactAssemblyPointer(body, pointer); }); }))
        return null;
    var structuralAnchorPointers = __spreadArray([
        relationEvidence.rootBone
    ], relationEvidence.matchedAncestorPointers, true).filter(function (pointer) { return completeAssemblyPointer(pointer)
        && (relationEvidence.relationKind === 'shared-equipment-mBones'
            || relationEvidence.relationKind === 'exact-source-weapon-ancestry'
            || meaningfulEquipmentTokens(pointer.name).length > 0); });
    var structuralAnchorKeys = new Set(structuralAnchorPointers
        .map(function (pointer) { return pointerKey(pointer); }).filter(function (key) { return Boolean(key); }));
    var relationPointers = relationEvidence.relationKind === 'shared-equipment-mBones'
        ? []
        : (_d = (_c = bodyOverlaps[0]) === null || _c === void 0 ? void 0 : _c.overlap.filter(function (pointer) { var _a; return structuralAnchorKeys.has((_a = pointerKey(pointer)) !== null && _a !== void 0 ? _a : ''); })) !== null && _d !== void 0 ? _d : [];
    var relationKeys = new Set(structuralAnchorKeys);
    // A secondary weapon renderer may share the exact authored mainWeapon
    // ancestor with the primary weapon renderer.  That is one source anchor,
    // not an ambiguous second relation; only a separately exact renderer
    // reference is exempted.  Name-only or partial-identity siblings remain
    // competing claims and fail closed.
    var competingRenderers = assembly.renderers.filter(function (other) {
        var _a, _b;
        return other !== renderer
            && other.visible !== false
            && other.rendererType === 'SkinnedMeshRenderer'
            && (relationEvidence.relationKind === 'exact-source-weapon-ancestry' || !isLikelyBodyRenderer(other))
            && __spreadArray(__spreadArray([other.rootBone], ((_a = other.transformChain) !== null && _a !== void 0 ? _a : []), true), ((_b = rootBoneAncestry(other)) !== null && _b !== void 0 ? _b : []), true).some(function (pointer) { var _a; return completeAssemblyPointer(pointer) && relationKeys.has((_a = pointerKey(pointer)) !== null && _a !== void 0 ? _a : ''); })
            && !(relationEvidence.relationKind === 'exact-source-weapon-ancestry'
                && rendererAttachmentEvidence(assembly, other).exactRenderer
                && relationEvidence.matchedAncestorPointers.some(function (pointer) { return rendererUsesExactAssemblyPointer(other, pointer); }));
    });
    if (competingRenderers.length > 0)
        return null;
    var sourceMaterialReferences = sourceEvidence.map(function (item) { return item.materialReference; });
    var sourceShaderReferences = sourceEvidence.map(function (item) { return item.shaderReference; });
    var sourceName = (_e = renderer.hierarchyPath) !== null && _e !== void 0 ? _e : renderer.name;
    var matchedAncestorPointers = __spreadArray([], relationEvidence.matchedAncestorPointers, true).sort(function (left, right) { var _a, _b; return ((_a = pointerKey(left)) !== null && _a !== void 0 ? _a : '').localeCompare((_b = pointerKey(right)) !== null && _b !== void 0 ? _b : ''); });
    var bodyRendererReferences = bodyOverlaps.length === 1 && bodyOverlaps[0].body.sourceReference
        ? [bodyOverlaps[0].body.sourceReference] : [];
    var evidence = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "exact source renderer reference ".concat(referenceKey(renderer.sourceReference)),
        "exact source mesh reference ".concat(referenceKey(renderer.meshSourceReference))
    ], sourceMaterialReferences.map(function (value) { return "exact source material reference ".concat(referenceKey(value)); }), true), sourceShaderReferences.map(function (value) { return "exact source shader reference ".concat(referenceKey(value)); }), true), [
        relationEvidence.relationKind === 'shared-equipment-mBones'
            ? "source m_Bones shares ".concat(relationEvidence.sharedBonePointers.length, " exact serialized pointer(s) with the authored equipment renderer")
            : relationEvidence.relationKind === 'exact-source-weapon-ancestry'
                ? 'source rootBone.m_Father ancestry reaches exactly one authored mainWeapon/subWeapon pointer'
                : "source transform ancestry is rooted at ".concat(assembly.root),
        "source transform/rootBone/bones share the selected prefab serialized file ".concat(normalizedSerializedFile(renderer.sourceReference.serializedFile))
    ], false), (relationEvidence.equipmentAnchor
        ? ["exact same-prefab Bip001_Weapon m_Bones anchor ".concat(pointerKey(relationEvidence.equipmentAnchor))]
        : []), true), [
        relationEvidence.relationKind === 'shared-equipment-mBones'
            ? "shared equipment m_Bones pointer(s): ".concat(matchedAncestorPointers.map(function (pointer) { return "".concat(pointer.name, " (").concat(pointerKey(pointer), ")"); }).join(', '))
            : relationEvidence.relationKind === 'exact-source-weapon-ancestry'
                ? "exact authored weapon ancestor: ".concat(matchedAncestorPointers.map(function (pointer) { return "".concat(pointer.name, " (").concat(pointerKey(pointer), ")"); }).join(', '))
                : "equipment ancestor pointer(s): ".concat(matchedAncestorPointers.map(function (pointer) { return "".concat(pointer.name, " (").concat(pointerKey(pointer), ")"); }).join(', ')),
        relationPointers.length
            ? "body m_Bones overlap: ".concat(relationPointers.map(function (pointer) { return "".concat(pointer.name, " (").concat(pointerKey(pointer), ")"); }).join(', '))
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
    ], false);
    return {
        classification: 'structurally-bound-equipment',
        reasonCode: relationEvidence.relationKind === 'exact-source-weapon-ancestry'
            ? 'EXACT_SOURCE_WEAPON_ANCESTRY'
            : 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY',
        reason: relationEvidence.relationKind === 'exact-source-weapon-ancestry'
            ? "Source rootBone.m_Father ancestry reaches exactly one full-identity mainWeapon/subWeapon pointer for ".concat(sourceName, ".")
            : relationEvidence.relationKind === 'shared-equipment-mBones'
                ? "Source-authored m_Bones prove a unique same-prefab equipment relation for ".concat(sourceName, "; no mainWeapon/subWeapon slot was inferred.")
                : "Source-authored transform/rootBone/bones prove a unique same-prefab equipment ancestry for ".concat(sourceName, "; no mainWeapon/subWeapon slot was inferred."),
        sourceReference: renderer.sourceReference,
        name: renderer.name,
        hierarchyPath: (_f = renderer.hierarchyPath) !== null && _f !== void 0 ? _f : null,
        sourceMeshReference: renderer.meshSourceReference,
        sourceMaterialReferences: sourceMaterialReferences,
        sourceShaderReferences: sourceShaderReferences,
        rootBone: cloneAssemblyPointer(relationEvidence.rootBone),
        transformChain: cloneAssemblyPointers(relationEvidence.transformChain),
        rootBoneAncestry: cloneAssemblyPointersWithSource(relationEvidence.rootBoneAncestry),
        boneReferences: cloneAssemblyPointers(relationEvidence.boneReferences),
        matchedAncestorPointers: cloneAssemblyPointers(matchedAncestorPointers),
        bodyRendererReferences: bodyRendererReferences,
        evidence: __spreadArray([], new Set(evidence), true),
    };
}
function exactEquipmentBindingEvidence(assembly, renderer, materialIndex, shaderIndex) {
    var _a, _b, _c, _d;
    if (!renderer.sourceReference)
        return null;
    var attachment = rendererAttachmentEvidence(assembly, renderer);
    if (!attachment.exactRenderer && !attachment.attachedBone)
        return null;
    var sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex);
    var sourceMaterialReferences = (_a = sourceEvidence === null || sourceEvidence === void 0 ? void 0 : sourceEvidence.map(function (item) { return item.materialReference; })) !== null && _a !== void 0 ? _a : [];
    var sourceShaderReferences = (_b = sourceEvidence === null || sourceEvidence === void 0 ? void 0 : sourceEvidence.map(function (item) { return item.shaderReference; })) !== null && _b !== void 0 ? _b : [];
    var exactRenderer = attachment.exactRenderer;
    var classification = exactRenderer ? 'exact-equipment-renderer' : 'exact-main-sub-equipment';
    var reasonCode = exactRenderer
        ? 'EXACT_EQUIPMENT_RENDERER_REFERENCE'
        : 'EXACT_MAIN_SUB_ATTACHMENT_POINTER';
    var reason = exactRenderer
        ? 'Exact equipmentRendererReferences source identity selects this renderer.'
        : 'Exact mainWeapon/subWeapon source pointer selects this renderer; no slot was fabricated.';
    var evidence = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "exact source renderer reference ".concat(referenceKey(renderer.sourceReference))
    ], (renderer.meshSourceReference ? ["exact source mesh reference ".concat(referenceKey(renderer.meshSourceReference))] : []), true), sourceMaterialReferences.map(function (value) { return "exact source material reference ".concat(referenceKey(value)); }), true), sourceShaderReferences.map(function (value) { return "exact source shader reference ".concat(referenceKey(value)); }), true), attachment.exactGroupEvidence, true), [
        reason,
    ], false);
    return {
        classification: classification,
        reasonCode: reasonCode,
        reason: reason,
        sourceReference: renderer.sourceReference,
        name: renderer.name,
        hierarchyPath: (_c = renderer.hierarchyPath) !== null && _c !== void 0 ? _c : null,
        sourceMeshReference: (_d = renderer.meshSourceReference) !== null && _d !== void 0 ? _d : null,
        sourceMaterialReferences: sourceMaterialReferences,
        sourceShaderReferences: sourceShaderReferences,
        rootBone: cloneAssemblyPointer(renderer.rootBone),
        transformChain: cloneAssemblyPointers(renderer.transformChain),
        rootBoneAncestry: [],
        boneReferences: cloneAssemblyPointers(renderer.boneReferences),
        matchedAncestorPointers: [],
        bodyRendererReferences: [],
        evidence: __spreadArray([], new Set(evidence), true),
    };
}
function missingEquipmentRelationBlocker(assembly, renderer, materialIndex, shaderIndex, bindingEvidence) {
    var _a, _b, _c, _d, _e, _f;
    if (renderer.visible === false || !renderer.sourceReference)
        return null;
    var attachment = rendererAttachmentEvidence(assembly, renderer);
    // An exact renderer or source-bone relation is authoritative.  Ambiguity is
    // already emitted by the inventory attachment diagnostics and must remain a
    // blocker, but does not need a duplicate semantic blocker here.
    if (attachment.exactRenderer || attachment.attachedBone || attachment.ambiguousEquipment || attachment.ambiguousName
        || ((bindingEvidence === null || bindingEvidence === void 0 ? void 0 : bindingEvidence.classification) === 'structurally-bound-equipment'
            && !isSourcePinnedRigMountEvidence(bindingEvidence)))
        return null;
    if (bindingEvidence && isSourcePinnedRigMountEvidence(bindingEvidence)
        && bindingEvidence.sourceMeshReference) {
        return {
            sourceReference: bindingEvidence.sourceReference,
            name: bindingEvidence.name,
            hierarchyPath: bindingEvidence.hierarchyPath,
            reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
            evidence: __spreadArray(__spreadArray([], bindingEvidence.evidence, true), ['source-pinned group is core equipment, but no authored main/sub slot specifies its arrangement'], false),
            sourceMeshReference: bindingEvidence.sourceMeshReference,
            sourceMaterialReferences: bindingEvidence.sourceMaterialReferences,
            sourceShaderReferences: bindingEvidence.sourceShaderReferences,
        };
    }
    var sourceMaterials = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex);
    if (!sourceMaterials)
        return null;
    var semanticSignals = [];
    var rendererTokens = meaningfulRendererNameTokens(renderer);
    if (rendererTokens.length)
        semanticSignals.push("renderer name has authored equipment term(s): ".concat(rendererTokens.join(', ')));
    var materialTokens = __spreadArray([], new Set(sourceMaterials.flatMap(function (item) { return meaningfulEquipmentTokens(item.material.name); })), true);
    if (materialTokens.length)
        semanticSignals.push("source material name has authored equipment term(s): ".concat(materialTokens.join(', ')));
    var shaderTokens = __spreadArray([], new Set(sourceMaterials
        .filter(function (item) { var _a; return weaponShaderIdentity((_a = item.shader.parsedName) !== null && _a !== void 0 ? _a : item.shader.name); })
        .map(function (item) { var _a; return (_a = item.shader.parsedName) !== null && _a !== void 0 ? _a : item.shader.name; })
        .filter(function (value) { return Boolean(value); })), true);
    if (shaderTokens.length)
        semanticSignals.push("source shader is an authored weapon family: ".concat(shaderTokens.join(', ')));
    var namedPointers = __spreadArray(__spreadArray([renderer.rootBone], ((_a = renderer.transformChain) !== null && _a !== void 0 ? _a : []), true), ((_b = renderer.boneReferences) !== null && _b !== void 0 ? _b : []), true).map(function (pointer) { var _a; return (_a = pointer === null || pointer === void 0 ? void 0 : pointer.name) !== null && _a !== void 0 ? _a : null; })
        .filter(function (value) { return Boolean(value); });
    var pointerTokens = __spreadArray([], new Set(namedPointers.flatMap(function (value) { return meaningfulEquipmentTokens(value); })), true);
    if (pointerTokens.length)
        semanticSignals.push("source attachment/bone names have authored equipment term(s): ".concat(pointerTokens.join(', ')));
    var meshTokens = meaningfulEquipmentTokens((_c = renderer.mesh) === null || _c === void 0 ? void 0 : _c.name);
    if (meshTokens.length)
        semanticSignals.push("source mesh name has authored equipment term(s): ".concat(meshTokens.join(', ')));
    var specificName = __spreadArray([], new Set(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], rendererTokens, true), materialTokens, true), pointerTokens, true), meshTokens, true)), true).some(function (token) { return SPECIFIC_EQUIPMENT_TOKENS.has(token); });
    var hasIndependentSemanticSignal = semanticSignals.length >= 2
        || (specificName && renderer.rendererType === 'SkinnedMeshRenderer'
            && ((_e = (_d = renderer.boneReferences) === null || _d === void 0 ? void 0 : _d.length) !== null && _e !== void 0 ? _e : 0) > 0);
    if (!rendererTokens.length || !hasIndependentSemanticSignal)
        return null;
    var sourceMaterialReferences = sourceMaterials.map(function (item) { return item.materialReference; });
    var sourceShaderReferences = sourceMaterials.map(function (item) { return item.shaderReference; });
    var evidence = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
        "exact source renderer reference ".concat(referenceKey(renderer.sourceReference)),
        "exact source mesh reference ".concat(referenceKey(renderer.meshSourceReference))
    ], sourceMaterialReferences.map(function (value) { return "exact source material reference ".concat(referenceKey(value)); }), true), sourceShaderReferences.map(function (value) { return "exact source shader reference ".concat(referenceKey(value)); }), true), semanticSignals, true), [
        'selected assembly has no authoritative equipment renderer or main/sub-weapon attachment relation for this renderer',
    ], false);
    return {
        sourceReference: renderer.sourceReference,
        name: renderer.name,
        hierarchyPath: (_f = renderer.hierarchyPath) !== null && _f !== void 0 ? _f : null,
        reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
        evidence: __spreadArray([], new Set(evidence), true),
        sourceMeshReference: renderer.meshSourceReference,
        sourceMaterialReferences: sourceMaterialReferences,
        sourceShaderReferences: sourceShaderReferences,
    };
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
function arrangementOnlyAttachmentEvidence(candidate, assembly, renderer, blocker, interaction, equipmentBindingEvidence) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (!assembly || !renderer || renderer.visible === false || !renderer.sourceReference)
        return false;
    // An authored child-renderer event makes the renderer part of an action's
    // interaction contract.  It is core even when the event itself is benign;
    // only presentation renderers already excluded above may be event targets.
    if (candidate.events.some(function (event) { return event.targetReference
        && referenceKey(event.targetReference) === referenceKey(blocker.sourceReference); }))
        return false;
    var attachments = assembly.attachments;
    var exactEquipmentReferences = new Set(((_a = attachments.equipmentRendererReferences) !== null && _a !== void 0 ? _a : []).map(referenceKey));
    var exactGroups = (_b = attachments.equipmentRendererGroups) !== null && _b !== void 0 ? _b : [];
    var ambiguities = (_c = attachments.equipmentRendererAmbiguities) !== null && _c !== void 0 ? _c : [];
    var mainSubPointers = __spreadArray(__spreadArray([], ((_d = attachments.mainWeapon) !== null && _d !== void 0 ? _d : []), true), ((_e = attachments.subWeapon) !== null && _e !== void 0 ? _e : []), true).filter(completeAssemblyPointer);
    var ancestry = rootBoneAncestry(renderer);
    // Source-extracted renderers carry an explicit ancestry array.  Hand-built
    // name-only/partial fixtures do not, and must remain fail-closed.
    if (!ancestry || !rootBoneAncestryComplete(renderer))
        return false;
    var prefabReference = assembly.prefabReference;
    if (!prefabReference
        || prefabReference.bundleSha256.toLowerCase() !== renderer.sourceReference.bundleSha256.toLowerCase()
        || normalizedSerializedFile(prefabReference.serializedFile) !== normalizedSerializedFile(renderer.sourceReference.serializedFile))
        return false;
    var rendererPointers = __spreadArray(__spreadArray(__spreadArray([
        renderer.rootBone
    ], ((_f = renderer.transformChain) !== null && _f !== void 0 ? _f : []), true), ancestry, true), ((_g = renderer.boneReferences) !== null && _g !== void 0 ? _g : []), true).filter(completeAssemblyPointer);
    if (!rendererPointers.every(function (pointer) { return pointerMatchesSourceFile(pointer, renderer.sourceReference.serializedFile, renderer.sourceReference.bundleSha256); }))
        return false;
    var ancestryKeys = ancestry.map(pointerKey).filter(function (key) { return Boolean(key); });
    if (new Set(ancestryKeys).size !== ancestryKeys.length)
        return false;
    if (exactEquipmentReferences.size === 0) {
        // Keep the previously accepted sole-arrangement case, but require the
        // extractor's complete ancestry evidence so an arbitrary named renderer
        // cannot be relaxed into a warning.
        if (exactGroups.length > 0 || ambiguities.length > 0 || mainSubPointers.length > 0)
            return false;
        // A shared exact Bip001_Weapon mount is a renderer group, not a sole prop.
        var sharedRigMountAnchors = __spreadArray(__spreadArray([renderer.rootBone], ((_h = renderer.boneReferences) !== null && _h !== void 0 ? _h : []), true), (ancestry !== null && ancestry !== void 0 ? ancestry : []), true).filter(function (pointer) { return completeAssemblyPointer(pointer)
            && pointerName(pointer) === STRUCTURAL_EQUIPMENT_ANCHOR_NAME; });
        if (sharedRigMountAnchors.some(function (anchor) { return assembly.renderers.some(function (other) { return other !== renderer
            && other.rendererType === 'SkinnedMeshRenderer' && !isLikelyBodyRenderer(other)
            && other.enabled !== false && other.gameObjectActive !== false && other.visible !== false
            && rendererUsesExactRigMountPointer(other, anchor); }); }))
            return false;
        // A complete source ancestry rooted at the generic Bip001 weapon slot is
        // still compatible with the missing primary attachment itself.  Keep it
        // fail-closed unless a second, source-exact semantic signal identifies a
        // distinct prop/equipment role in the exact root/m_Bones pointers.  A
        // display name alone is never sufficient, even when accompanied by exact
        // mesh/material/shader evidence in the blocker.
        if (candidate.sourceIdentity === SAORI_HANDGUN_SOURCE.identity
            && referenceKey(blocker.sourceReference) === referenceKey(saoriSourceReference(SAORI_HANDGUN_SOURCE.renderer))) {
            return exactSaoriHandgunArrangementEvidence(candidate, assembly, renderer, blocker, interaction, equipmentBindingEvidence);
        }
        var rootName = (_j = pointerName(renderer.rootBone)) !== null && _j !== void 0 ? _j : '';
        var genericWeaponAnchor = /^(?:bip001[_\s-]*)?weapon\d*$/.test(rootName)
            || /^bone[_\s-]*weapon\d*$/.test(rootName);
        var sourceRoleTokens = new Set(__spreadArray([], __spreadArray([renderer.rootBone], ((_k = renderer.boneReferences) !== null && _k !== void 0 ? _k : []), true).flatMap(function (pointer) { return meaningfulEquipmentTokens(pointer === null || pointer === void 0 ? void 0 : pointer.name); }), true));
        if (genericWeaponAnchor && __spreadArray([], sourceRoleTokens, true).every(function (token) { return token === 'weapon'; })) {
            return false;
        }
        return true;
    }
    // Competing evidence is safe to relax only when all exact equipment refs
    // resolve to renderers selected by authored main/sub pointers.  This also
    // rejects an unrelated exact equipment renderer, promoted group, or
    // ambiguity from changing the unresolved renderer's role.
    if (exactGroups.length > 0 || ambiguities.length > 0 || mainSubPointers.length === 0)
        return false;
    var primaryRenderers = assembly.renderers.filter(function (item) { return item.sourceReference
        && exactEquipmentReferences.has(referenceKey(item.sourceReference))
        && mainSubPointers.some(function (pointer) { return rendererUsesExactAttachmentPointer(item, pointer); }); });
    if (primaryRenderers.length !== exactEquipmentReferences.size)
        return false;
    if (primaryRenderers.some(function (item) {
        var _a, _b, _c;
        var itemPointers = __spreadArray(__spreadArray(__spreadArray([
            item.rootBone
        ], ((_a = item.transformChain) !== null && _a !== void 0 ? _a : []), true), ((_b = rootBoneAncestry(item)) !== null && _b !== void 0 ? _b : []), true), ((_c = item.boneReferences) !== null && _c !== void 0 ? _c : []), true).filter(completeAssemblyPointer);
        var valid = itemPointers.every(function (pointer) { return pointerMatchesSourceFile(pointer, renderer.sourceReference.serializedFile, renderer.sourceReference.bundleSha256); });
        return !valid;
    }))
        return false;
    // The unresolved renderer must be outside every authored main/sub slot and
    // outside the exact source pointer set claimed by the selected renderer.
    var unresolvedUsesSlot = mainSubPointers.some(function (pointer) { return rendererUsesExactAttachmentPointer(renderer, pointer); });
    if (unresolvedUsesSlot)
        return false;
    var primaryPointerKeys = new Set(primaryRenderers.flatMap(function (item) { return __spreadArray([], rendererSourcePointerKeys(item), true); }));
    var unresolvedPointerKeys = rendererSourcePointerKeys(renderer);
    var sharedPointer = __spreadArray([], unresolvedPointerKeys, true).some(function (key) { return primaryPointerKeys.has(key); });
    if (sharedPointer)
        return false;
    return true;
}
var SAORI_HANDGUN_SOURCE = {
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
};
var SAORI_SWIMSUIT_SOURCE = {
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
};
function saoriSourceReference(reference) {
    return { bundleSha256: reference.bundle, serializedFile: reference.file, objectId: reference.id };
}
function saoriPointerMatches(value, expected) {
    return exactSourcePointerIdentity(value, saoriSourceReference(SAORI_HANDGUN_SOURCE.prefab))
        && completeAssemblyPointer(value)
        && value.pathId === expected.id
        && pointerName(value) === expected.name.toLowerCase();
}
function saoriPointerArrayMatches(values, expected) {
    return Array.isArray(values) && values.length === expected.length
        && expected.every(function (pointer) { return values.filter(function (value) { return saoriPointerMatches(value, pointer); }).length === 1; });
}
function saoriSourcePointerMatches(value, source) {
    var expected = saoriSourceReference(source);
    return pointerMatchesSourceReference(value, expected)
        && Boolean(value && typeof value === 'object'
            && normalizedSerializedFile(value.file) === normalizedSerializedFile(expected.serializedFile)
            && String(value.pathId) === expected.objectId);
}
function saoriRendererMaterialMatches(renderer) {
    var _a, _b;
    var slot = (_a = renderer.materialSlots) === null || _a === void 0 ? void 0 : _a[0];
    var material = saoriSourceReference(SAORI_HANDGUN_SOURCE.material);
    return ((_b = renderer.materialSlots) === null || _b === void 0 ? void 0 : _b.length) === 1
        && (slot === null || slot === void 0 ? void 0 : slot.slot) === 0
        && referenceKey(slot.sourceMaterialReference) === referenceKey(material)
        && saoriSourcePointerMatches(slot.material, SAORI_HANDGUN_SOURCE.material);
}
function exactSaoriHandgunArrangementEvidence(candidate, assembly, renderer, blocker, interaction, equipmentBindingEvidence) {
    var source = SAORI_HANDGUN_SOURCE;
    var expectedRendererReference = saoriSourceReference(source.renderer);
    var expectedMeshReference = saoriSourceReference(source.mesh);
    var expectedMaterialReference = saoriSourceReference(source.material);
    var expectedShaderReference = saoriSourceReference(source.shader);
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
        || renderer.rootBoneAncestryComplete !== true
        || !saoriPointerArrayMatches(renderer.boneReferences, [source.handgunRoot, source.handgunMagazine]))
        return false;
    var primaryReference = saoriSourceReference(source.primary.renderer);
    var primaryMatches = assembly.renderers.filter(function (item) { return referenceKey(item.sourceReference) === referenceKey(primaryReference); });
    if (primaryMatches.length !== 1 || assembly.renderers.filter(function (item) {
        return referenceKey(item.sourceReference) === referenceKey(expectedRendererReference);
    }).length !== 1)
        return false;
    var primary = primaryMatches[0];
    var anchorKey = referenceKey(saoriSourceReference(source.primary.bone));
    var binding = equipmentBindingEvidence.filter(function (item) { return referenceKey(item.sourceReference) === referenceKey(primaryReference); });
    var structuralAnchorProof = binding.length === 1
        && binding[0].classification === 'structurally-bound-equipment'
        && binding[0].reasonCode === 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY'
        && binding[0].evidence.includes("exact same-prefab Bip001_Weapon m_Bones anchor reference:".concat(anchorKey))
        && binding[0].evidence.includes('unique non-conflicting same-prefab transform/bone relation');
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
        || primary.rootBoneAncestryComplete !== true
        || !saoriPointerArrayMatches(primary.boneReferences, [
            { id: source.primary.bone.id, name: 'Bip001_Weapon' }, source.primaryMagazine, source.primaryButtstock,
        ]))
        return false;
    if (interaction.initialPose !== source.actions.idle
        || interaction.interactions.idle.state !== 'available' || interaction.interactions.idle.clip !== source.actions.idle
        || interaction.interactions.walk.state !== 'available' || interaction.interactions.walk.clip !== source.actions.walk
        || interaction.interactions.pickup.state !== 'available' || interaction.interactions.pickup.clip !== source.actions.pickup
        || interaction.interactions.touch.state !== 'available' || interaction.interactions.touch.clip !== source.actions.touch
        || Object.values(source.actions).some(function (clip) { return !candidate.clips.includes(clip); }))
        return false;
    return true;
}
var SOURCE_PINNED_RIG_MOUNT_GROUPS = [
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
                    { source: { bundle: 'ebfd334c1aac3ac04427cf77f0a366b150a9bc3a534f7b7d03fdba4d433d9f29', file: 'CAB-28951afa2d0662740094a0cdb63635f7', id: '-239699426375248023' }, name: 'bone_rope' },
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
                    { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-1469757343611847937' }, name: 'weapon1_cos2' },
                    { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-8600449184193217793' }, name: 'weapon1_cos1' },
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
                    { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-7258084021585151233' }, name: 'weapon2_cos1' },
                    { source: { bundle: 'd371974b37af5c67054ba26c44db824e03491dd569144c03a35d942478adbb39', file: 'CAB-68647aee163948facee663bf2f0fe149', id: '-3384407438069957889' }, name: 'weapon2_cos2' },
                ],
            },
        ],
        clipEvidence: 'the three café clips bind Bip001_Weapon; Formation_Pickup also binds both weapon1 and Bone_weapon2/cos bones',
    },
];
function sourcePinnedRigMountReference(reference) {
    return { bundleSha256: reference.bundle, serializedFile: reference.file, objectId: reference.id };
}
function sourcePinnedRigMountPointer(pointer) {
    return {
        file: pointer.source.file,
        pathId: pointer.source.id,
        name: pointer.name,
        sourceReference: sourcePinnedRigMountReference(pointer.source),
    };
}
function sourcePinnedRigMountPointerMatches(value, expected) {
    return completeAssemblyPointer(value)
        && pointerMatchesSourceReference(value, sourcePinnedRigMountReference(expected.source))
        && pointerName(value) === expected.name.toLowerCase();
}
function sourcePinnedRigMountPointerArrayMatches(values, expected) {
    return Array.isArray(values) && values.length === expected.length
        && expected.every(function (item, index) { return sourcePinnedRigMountPointerMatches(values[index], item); });
}
function isSourcePinnedRigMountEvidence(evidence) {
    return (evidence === null || evidence === void 0 ? void 0 : evidence.classification) === 'structurally-bound-equipment'
        && evidence.reasonCode === 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY'
        && evidence.reason.startsWith('Exact source-pinned same-prefab rig-mount group ');
}
function sourcePinnedRigMountPartMatches(candidate, expected) {
    var _a;
    var matches = ((_a = candidate.parts) !== null && _a !== void 0 ? _a : []).filter(function (part) { return part.entryPath === expected.path; });
    return matches.length === 1 && matches[0].sha256.toLowerCase() === expected.sha256;
}
function exactSourcePinnedRigMountMember(candidate, assembly, member, anchor, materialIndex, shaderIndex) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var rendererReference = sourcePinnedRigMountReference(member.renderer);
    var meshReference = sourcePinnedRigMountReference(member.mesh);
    var materialReference = sourcePinnedRigMountReference(member.material);
    var matches = assembly.renderers.filter(function (renderer) { return renderer.sourceReference
        && referenceKey(renderer.sourceReference) === referenceKey(rendererReference); });
    if (matches.length !== 1)
        return null;
    var renderer = matches[0];
    var ancestry = rootBoneAncestry(renderer);
    var sourceEvidence = exactSourceMaterialShaderEvidence(renderer, materialIndex, shaderIndex);
    var exactMaterials = (_b = (_a = candidate.sourceMaterials) === null || _a === void 0 ? void 0 : _a.filter(function (material) { return material.sourceReference
        && referenceKey(material.sourceReference) === referenceKey(materialReference); })) !== null && _b !== void 0 ? _b : [];
    var exactShaders = (sourceEvidence === null || sourceEvidence === void 0 ? void 0 : sourceEvidence.length) === 1
        ? (_d = (_c = candidate.shaders) === null || _c === void 0 ? void 0 : _c.filter(function (shader) { return shader.sourceReference
            && referenceKey(shader.sourceReference) === referenceKey(sourceEvidence[0].shaderReference); })) !== null && _d !== void 0 ? _d : []
        : [];
    if (renderer.pathId !== member.renderer.id
        || renderer.name !== member.name
        || renderer.hierarchyPath !== member.hierarchyPath
        || renderer.rendererType !== 'SkinnedMeshRenderer'
        || renderer.enabled !== true || renderer.gameObjectActive !== true || renderer.visible !== true
        || !renderer.meshSourceReference || referenceKey(renderer.meshSourceReference) !== referenceKey(meshReference)
        || !renderer.mesh || !pointerMatchesSourceReference(renderer.mesh, meshReference)
        || ((_e = renderer.materialSlots) === null || _e === void 0 ? void 0 : _e.length) !== 1 || ((_f = renderer.materialSlots[0]) === null || _f === void 0 ? void 0 : _f.slot) !== 0
        || !((_g = renderer.materialSlots[0]) === null || _g === void 0 ? void 0 : _g.sourceMaterialReference)
        || referenceKey(renderer.materialSlots[0].sourceMaterialReference) !== referenceKey(materialReference)
        || !renderer.materialSlots[0].material
        || !pointerMatchesSourceReference(renderer.materialSlots[0].material, materialReference)
        || !sourcePinnedRigMountPointerMatches(renderer.rootBone, member.rootBone)
        || !sourcePinnedRigMountPointerArrayMatches(renderer.transformChain, member.transformChain)
        || !ancestry || renderer.rootBoneAncestryComplete !== true
        || !sourcePinnedRigMountPointerArrayMatches(ancestry, member.ancestry)
        || !sourcePinnedRigMountPointerArrayMatches(renderer.boneReferences, member.bones)
        || !rendererUsesExactRigMountPointer(renderer, sourcePinnedRigMountPointer(anchor))
        || !sourceEvidence || sourceEvidence.length !== 1
        || referenceKey(sourceEvidence[0].materialReference) !== referenceKey(materialReference)
        || exactMaterials.length !== 1
        || exactShaders.length !== 1
        || !weaponShaderIdentity((_h = sourceEvidence[0].shader.parsedName) !== null && _h !== void 0 ? _h : sourceEvidence[0].shader.name))
        return null;
    var sourceMaterial = sourceEvidence[0].material;
    if (!sourceMaterial.sourceReference || referenceKey(sourceMaterial.sourceReference) !== referenceKey(materialReference))
        return null;
    var structuralPointers = __spreadArray(__spreadArray(__spreadArray([
        renderer.rootBone
    ], ((_j = renderer.transformChain) !== null && _j !== void 0 ? _j : []), true), ancestry, true), ((_k = renderer.boneReferences) !== null && _k !== void 0 ? _k : []), true).filter(completeAssemblyPointer);
    var structuralKeys = new Set(structuralPointers.map(pointerKey).filter(function (key) { return Boolean(key); }));
    var bodyOverlaps = assembly.renderers.map(function (body) {
        var _a;
        return ({
            body: body,
            overlaps: ((_a = body.boneReferences) !== null && _a !== void 0 ? _a : []).filter(completeAssemblyPointer)
                .filter(function (pointer) { var _a; return structuralKeys.has((_a = pointerKey(pointer)) !== null && _a !== void 0 ? _a : ''); }),
        });
    }).filter(function (item) { return item.overlaps.length > 0 && isLikelyBodyRenderer(item.body); });
    if (bodyOverlaps.length > 1 || bodyOverlaps.some(function (item) { return !item.body.sourceReference; }))
        return null;
    return {
        renderer: renderer,
        sourceEvidence: sourceEvidence[0],
        bodyRendererReferences: bodyOverlaps.flatMap(function (item) { return item.body.sourceReference ? [item.body.sourceReference] : []; }),
    };
}
function sourcePinnedRigMountAssessment(candidate, selectedPrefabPath, assembly, interaction, materialIndex, shaderIndex) {
    var _a, _b, _c, _d, _e, _f;
    var group = SOURCE_PINNED_RIG_MOUNT_GROUPS.find(function (item) { return item.identity === candidate.sourceIdentity; });
    if (!group)
        return null;
    var sourceReferences = group.members.map(function (member) { return sourcePinnedRigMountReference(member.renderer); });
    var targetKeys = new Set(sourceReferences.map(referenceKey));
    var evidenceByReference = new Map();
    var prefabReference = sourcePinnedRigMountReference(group.prefab);
    var anchorReference = sourcePinnedRigMountReference(group.anchor.source);
    var attachments = ((_a = assembly === null || assembly === void 0 ? void 0 : assembly.attachments) !== null && _a !== void 0 ? _a : {});
    var equipmentAttachmentKeys = [
        'mainWeapon', 'subWeapon', 'equipmentRenderers', 'equipmentRendererReferences',
        'weaponRendererReferences', 'mainWeaponRendererReferences', 'subWeaponRendererReferences',
        'accessoryRendererReferences', 'equipmentRendererGroups', 'equipmentRendererAmbiguities',
    ];
    var hasNoAuthoredAttachmentMetadata = equipmentAttachmentKeys.every(function (key) {
        var value = attachments[key];
        return value === undefined || (Array.isArray(value) && value.length === 0);
    });
    var actions = group.actions;
    var expectedActionEntries = [
        ['idle', actions.idle], ['walk', actions.walk], ['pickup', actions.pickup], ['touch', actions.touch],
    ];
    var interactionMatches = interaction.initialPose === actions.idle
        && expectedActionEntries.every(function (_a) {
            var action = _a[0], clip = _a[1];
            return interaction.interactions[action].state === 'available'
                && interaction.interactions[action].clip === clip;
        });
    var partProofMatches = sourcePinnedRigMountPartMatches(candidate, group.prefabEntry)
        && group.animationEntries.every(function (entry) { return sourcePinnedRigMountPartMatches(candidate, entry); })
        && Object.values(actions).every(function (clip) { return candidate.clips.includes(clip); })
        && interactionMatches;
    var activeAnchorRenderers = (_b = assembly === null || assembly === void 0 ? void 0 : assembly.renderers.filter(function (renderer) { return renderer.enabled !== false
        && renderer.gameObjectActive !== false && renderer.visible !== false
        && rendererUsesExactRigMountPointer(renderer, sourcePinnedRigMountPointer(group.anchor)); })) !== null && _b !== void 0 ? _b : [];
    var activeAnchorKeys = activeAnchorRenderers.flatMap(function (renderer) { return renderer.sourceReference
        ? [referenceKey(renderer.sourceReference)] : []; }).sort();
    var expectedAnchorKeys = __spreadArray([], targetKeys, true).sort();
    var renderedMembers = group.members.map(function (member) { return assembly
        ? exactSourcePinnedRigMountMember(candidate, assembly, member, group.anchor, materialIndex, shaderIndex)
        : null; });
    var membersMatch = renderedMembers.every(Boolean);
    var eventsAreUnambiguous = candidate.events.every(function (event) { return !event.targetReference
        || !targetKeys.has(referenceKey(event.targetReference)); });
    var commonMatches = Boolean(assembly
        && !candidate.conflict
        && selectedPrefabPath === group.prefabPath
        && ((_c = candidate.prefabPaths) === null || _c === void 0 ? void 0 : _c.filter(function (path) { return path === group.prefabPath; }).length) === 1
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
        && activeAnchorKeys.every(function (key, index) { return key === expectedAnchorKeys[index]; }));
    var valid = Boolean(commonMatches && membersMatch);
    var sourceEvidence = [
        "exact source candidate ".concat(group.identity, " dependency fingerprint ").concat(group.fingerprint),
        "exact selected prefab ".concat(group.prefabPath, " at ").concat(referenceKey(prefabReference)),
        "source prefab and animation bundle SHA-256 pins match ".concat(group.prefabEntry.path, " and ").concat(group.animationEntries.map(function (entry) { return entry.path; }).join(', ')),
        "audited clip binding evidence: ".concat(group.clipEvidence),
        "exact same-prefab rig anchor ".concat(group.anchor.name, " at ").concat(referenceKey(anchorReference)),
        "active renderers on the exact anchor are exactly ".concat(sourceReferences.map(referenceKey).join(' and ')),
        'source assembly has no authored main/sub slot, equipment renderer reference/group, or ambiguity metadata; no slot was inferred',
    ];
    if (valid) {
        for (var _i = 0, _g = group.members.entries(); _i < _g.length; _i++) {
            var _h = _g[_i], index = _h[0], member = _h[1];
            var verified = renderedMembers[index];
            var renderer = verified.renderer;
            var memberEvidence = __spreadArray(__spreadArray(__spreadArray([], sourceEvidence, true), [
                "exact source renderer ".concat(renderer.name, " at ").concat(referenceKey(renderer.sourceReference)),
                "exact source mesh ".concat(referenceKey(renderer.meshSourceReference)),
                "exact source material ".concat(referenceKey(verified.sourceEvidence.materialReference)),
                "exact source shader ".concat(referenceKey(verified.sourceEvidence.shaderReference), " (").concat((_d = verified.sourceEvidence.shader.parsedName) !== null && _d !== void 0 ? _d : verified.sourceEvidence.shader.name, ")")
            ], false), (verified.bodyRendererReferences.length
                ? ["exact body-renderer m_Bones overlap references ".concat(verified.bodyRendererReferences.map(referenceKey).join(', '))]
                : ['body m_Bones overlap: none; source hierarchy independently corroborates movement']), true);
            evidenceByReference.set(referenceKey(renderer.sourceReference), {
                classification: 'structurally-bound-equipment',
                reasonCode: 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY',
                reason: "Exact source-pinned same-prefab rig-mount group ".concat(group.identity, "; attachment placement remains an arrangement warning."),
                sourceReference: renderer.sourceReference,
                name: renderer.name,
                hierarchyPath: (_e = renderer.hierarchyPath) !== null && _e !== void 0 ? _e : null,
                sourceMeshReference: (_f = renderer.meshSourceReference) !== null && _f !== void 0 ? _f : null,
                sourceMaterialReferences: [verified.sourceEvidence.materialReference],
                sourceShaderReferences: [verified.sourceEvidence.shaderReference],
                rootBone: cloneAssemblyPointer(renderer.rootBone),
                transformChain: cloneAssemblyPointers(renderer.transformChain),
                rootBoneAncestry: cloneAssemblyPointers(rootBoneAncestry(renderer)),
                boneReferences: cloneAssemblyPointers(renderer.boneReferences),
                matchedAncestorPointers: [cloneAssemblyPointer(renderer.rootBone)],
                bodyRendererReferences: verified.bodyRendererReferences,
                evidence: __spreadArray([], new Set(memberEvidence), true),
            });
        }
    }
    return {
        group: group,
        valid: valid,
        sourceReferences: sourceReferences,
        evidenceByReference: evidenceByReference,
        warningEvidence: sourceEvidence,
    };
}
function saoriSwimsuitReference(source) {
    return { bundleSha256: source.bundle, serializedFile: source.file, objectId: source.id };
}
function saoriSwimsuitPointerMatches(value, source, name) {
    return completeAssemblyPointer(value)
        && pointerMatchesSourceReference(value, saoriSwimsuitReference(source))
        && pointerName(value) === name.toLowerCase();
}
function saoriSwimsuitPointerArrayMatches(values, expected) {
    return Array.isArray(values) && values.length === expected.length
        && expected.every(function (item, index) { return saoriSwimsuitPointerMatches(values[index], item.source, item.name); });
}
function exactSaoriSwimsuitMaterial(candidate, renderer, expected) {
    var _a, _b, _c;
    var materialReference = saoriSwimsuitReference(expected.reference);
    var shaderReference = saoriSwimsuitReference(SAORI_SWIMSUIT_SOURCE.shader);
    var slots = (_a = renderer.materialSlots) !== null && _a !== void 0 ? _a : [];
    var materials = ((_b = candidate.sourceMaterials) !== null && _b !== void 0 ? _b : []).filter(function (item) { return referenceKey(item.sourceReference) === referenceKey(materialReference); });
    var shaders = ((_c = candidate.shaders) !== null && _c !== void 0 ? _c : []).filter(function (item) { return referenceKey(item.sourceReference) === referenceKey(shaderReference); });
    var material = materials[0];
    var shader = shaders[0];
    var slot = slots[0];
    var parsedShaderNamesMatch = (material === null || material === void 0 ? void 0 : material.shaderParsedName) === 'MX/C-Weapon'
        && (shader === null || shader === void 0 ? void 0 : shader.parsedName) === 'MX/C-Weapon';
    var rawShaderNamesMatch = ((material === null || material === void 0 ? void 0 : material.shaderName) === 'MX/C-Weapon' && (shader === null || shader === void 0 ? void 0 : shader.name) === 'MX/C-Weapon')
        || ((material === null || material === void 0 ? void 0 : material.shaderName) === '' && (shader === null || shader === void 0 ? void 0 : shader.name) === '');
    var checks = {
        materialCount: materials.length === 1, shaderCount: shaders.length === 1,
        slots: slots.length === 1 && (slot === null || slot === void 0 ? void 0 : slot.slot) === 0,
        slotMaterialReference: referenceKey(slot === null || slot === void 0 ? void 0 : slot.sourceMaterialReference) === referenceKey(materialReference),
        slotMaterialPointer: pointerMatchesSourceReference(slot === null || slot === void 0 ? void 0 : slot.material, materialReference),
        materialName: (material === null || material === void 0 ? void 0 : material.name) === expected.name,
        materialShaderRef: referenceKey(material === null || material === void 0 ? void 0 : material.shaderReference) === referenceKey(shaderReference),
        materialShaderPointer: pointerMatchesSourceReference(material === null || material === void 0 ? void 0 : material.shader, shaderReference),
        materialShaderName: parsedShaderNamesMatch,
        shaderParsedName: parsedShaderNamesMatch, shaderName: rawShaderNamesMatch && parsedShaderNamesMatch,
    };
    return Object.values(checks).every(Boolean);
}
function exactSaoriSwimsuitRenderer(candidate, renderer, blocker, source) {
    var rendererReference = saoriSwimsuitReference(source.reference);
    var meshReference = saoriSwimsuitReference(source.mesh);
    var materialReference = saoriSwimsuitReference(source.material);
    var blockerMatches = !blocker || (referenceKey(blocker.sourceReference) === referenceKey(rendererReference)
        && referenceKey(blocker.sourceMeshReference) === referenceKey(meshReference)
        && blocker.sourceMaterialReferences.length === 1
        && referenceKey(blocker.sourceMaterialReferences[0]) === referenceKey(materialReference)
        && blocker.sourceShaderReferences.length === 1
        && referenceKey(blocker.sourceShaderReferences[0]) === referenceKey(saoriSwimsuitReference(SAORI_SWIMSUIT_SOURCE.shader)));
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
        && renderer.rootBoneAncestryComplete === true
        && saoriSwimsuitPointerArrayMatches(renderer.boneReferences, source.bones));
}
function exactSaoriSwimsuitArrangementEvidence(candidate, assembly, blockers, interaction) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var source = SAORI_SWIMSUIT_SOURCE;
    if (!assembly || candidate.conflict
        || candidate.sourceIdentity !== source.identity || candidate.fingerprint !== source.fingerprint
        || assembly.root !== 'Cafe_CH0266' || assembly.prefabPath !== source.prefabPath
        || referenceKey(assembly.prefabReference) !== referenceKey(saoriSwimsuitReference({
            bundle: source.prefabBundle, file: source.prefabFile, id: source.prefabId,
        }))
        || !((_a = candidate.prefabPaths) !== null && _a !== void 0 ? _a : []).includes(source.prefabPath))
        return false;
    var _loop_12 = function (entry) {
        var matches = candidate.parts.filter(function (part) { return part.entryPath === entry.path; });
        if (matches.length !== 1 || matches[0].sha256.toLowerCase() !== entry.sha256)
            return { value: false };
    };
    // The exact candidate fingerprint pins the selected prefab and animation
    // dependencies. Source audit confirmed transform-path bindings in every
    // one of these four clips for bone_Weapon (759696596) and bone_Watercannon
    // (1951667232), so these renderers are animated core equipment, not inert
    // presentation meshes.
    for (var _i = 0, _j = [source.prefabEntry, source.animationEntry]; _i < _j.length; _i++) {
        var entry = _j[_i];
        var state_12 = _loop_12(entry);
        if (typeof state_12 === "object")
            return state_12.value;
    }
    if (Object.values(source.actions).some(function (clip) { return !candidate.clips.includes(clip); })
        || interaction.initialPose !== source.actions.idle
        || interaction.interactions.idle.state !== 'available' || interaction.interactions.idle.clip !== source.actions.idle
        || interaction.interactions.walk.state !== 'available' || interaction.interactions.walk.clip !== source.actions.walk
        || interaction.interactions.pickup.state !== 'available' || interaction.interactions.pickup.clip !== source.actions.pickup
        || interaction.interactions.touch.state !== 'available' || interaction.interactions.touch.clip !== source.actions.touch)
        return false;
    var sourceReference = function (bundle, file, id) { return ({ bundle: bundle, file: file, id: id }); };
    var prefabBone = function (bone) { return ({
        source: sourceReference(source.prefabBundle, source.prefabFile, bone.id), name: bone.name,
    }); };
    var prefabSource = function (id) { return sourceReference(source.prefabBundle, source.prefabFile, id); };
    var rendererSources = [
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
    ];
    if (blockers.length !== rendererSources.length
        || blockers.some(function (blocker) { return blocker.reasonCode !== 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT'; }))
        return false;
    var assemblies = assembly.renderers;
    var blockerByReference = new Map(blockers.map(function (blocker) { return [referenceKey(blocker.sourceReference), blocker]; }));
    var _loop_13 = function (expected) {
        var expectedReference = saoriSwimsuitReference(expected.reference);
        var matches = assemblies.filter(function (renderer) { return referenceKey(renderer.sourceReference) === referenceKey(expectedReference); });
        var blocker = blockerByReference.get(referenceKey(expectedReference));
        if (matches.length !== 1 || !blocker
            || !exactSaoriSwimsuitRenderer(candidate, matches[0], blocker, expected))
            return { value: false };
    };
    for (var _k = 0, rendererSources_1 = rendererSources; _k < rendererSources_1.length; _k++) {
        var expected = rendererSources_1[_k];
        var state_13 = _loop_13(expected);
        if (typeof state_13 === "object")
            return state_13.value;
    }
    var attachments = assembly.attachments;
    var primarySource = saoriSwimsuitReference(prefabSource(source.primary.renderer));
    var equipmentRendererReferences = (_b = attachments.equipmentRendererReferences) !== null && _b !== void 0 ? _b : [];
    if (!saoriSwimsuitPointerArrayMatches(attachments.mainWeapon, [prefabBone(source.primary.bone)])
        || ((_d = (_c = attachments.subWeapon) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0) > 0
        || equipmentRendererReferences.length !== 1
        || referenceKey(equipmentRendererReferences[0]) !== referenceKey(primarySource)
        || ((_f = (_e = attachments.equipmentRendererGroups) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0) > 0
        || ((_h = (_g = attachments.equipmentRendererAmbiguities) === null || _g === void 0 ? void 0 : _g.length) !== null && _h !== void 0 ? _h : 0) > 0)
        return false;
    var primaryMatches = assemblies.filter(function (renderer) { return referenceKey(renderer.sourceReference) === referenceKey(primarySource); });
    var primary = primaryMatches[0];
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
        }))
        return false;
    if (candidate.events.some(function (event) { return event.targetReference && blockers.some(function (blocker) {
        return referenceKey(event.targetReference) === referenceKey(blocker.sourceReference);
    }); }))
        return false;
    return true;
}
function classifyRenderer(assembly, renderer, materialIndex, shaderIndex, protectedRendererReferences) {
    var _a, _b, _c, _d, _e, _f;
    var sourceReference = sourceRendererReference(renderer);
    // Exclusion requires a canonical renderer identity.  A missing identity is
    // therefore always retained and handled by the normal unresolved checks.
    if (!sourceReference)
        return { kind: 'core', sourceRenderer: renderer };
    var attachment = rendererAttachmentEvidence(assembly, renderer);
    var exactReferenceKey = referenceKey(sourceReference);
    var exactCoreBinding = protectedRendererReferences.has(exactReferenceKey)
        || attachment.ambiguousName
        || exactCoreRendererName(renderer.name);
    var inertEvidence = inertSourceRendererEvidence(renderer);
    // Exact mouth/eye/core/equipment bindings are authoritative, even when the
    // renderer happens to live below a cut-in or FX hierarchy.
    if (exactCoreBinding)
        return { kind: 'core', sourceRenderer: renderer };
    if (inertEvidence) {
        var sourceMesh_1 = renderer.mesh
            ? __assign(__assign({}, renderer.mesh), { sourceReference: (_a = renderer.meshSourceReference) !== null && _a !== void 0 ? _a : null }) : null;
        return {
            kind: 'excluded',
            sourceRenderer: renderer,
            excluded: {
                sourceReference: sourceReference,
                name: renderer.name,
                hierarchyPath: (_b = renderer.hierarchyPath) !== null && _b !== void 0 ? _b : null,
                reasonCode: 'PRESENTATION_MESH_10210_OR_HELPER',
                evidence: inertEvidence,
                sourceMesh: sourceMesh_1,
                materials: ((_c = renderer.materialSlots) !== null && _c !== void 0 ? _c : []).map(function (slot) {
                    var _a;
                    return ({
                        name: '(exact null material pointer)',
                        sourceReference: (_a = slot.sourceMaterialReference) !== null && _a !== void 0 ? _a : null,
                        shaderName: null,
                        shaderReference: null,
                    });
                }),
            },
        };
    }
    var materials = ((_d = renderer.materialSlots) !== null && _d !== void 0 ? _d : []).map(function (slot) {
        var _a, _b, _c, _d, _e, _f;
        var material = slot.sourceMaterialReference ? materialIndex.get(referenceKey(slot.sourceMaterialReference)) : undefined;
        var shaderReference = (_a = material === null || material === void 0 ? void 0 : material.shaderReference) !== null && _a !== void 0 ? _a : null;
        var shader = shaderReference ? shaderIndex.get(referenceKey(shaderReference)) : undefined;
        return {
            slot: slot,
            material: material,
            shader: shader,
            evidence: {
                name: (_b = material === null || material === void 0 ? void 0 : material.name) !== null && _b !== void 0 ? _b : '(unresolved)',
                sourceReference: (_d = (_c = material === null || material === void 0 ? void 0 : material.sourceReference) !== null && _c !== void 0 ? _c : slot.sourceMaterialReference) !== null && _d !== void 0 ? _d : null,
                shaderName: (_f = (_e = material === null || material === void 0 ? void 0 : material.shaderParsedName) !== null && _e !== void 0 ? _e : material === null || material === void 0 ? void 0 : material.shaderName) !== null && _f !== void 0 ? _f : null,
                shaderReference: shaderReference,
            },
        };
    });
    var pathEvidence = presentationPathEvidence(renderer);
    var coreShaderMaterials = materials.filter(function (item) {
        var _a, _b;
        return coreShaderIdentity((_a = item.material) === null || _a === void 0 ? void 0 : _a.shaderParsedName)
            || coreShaderIdentity((_b = item.material) === null || _b === void 0 ? void 0 : _b.shaderName);
    });
    var effectMaterials = materials.filter(function (item) {
        var _a, _b, _c, _d, _e, _f, _g;
        return presentationMaterialName((_a = item.material) === null || _a === void 0 ? void 0 : _a.name)
            && presentationShaderIdentity((_c = (_b = item.material) === null || _b === void 0 ? void 0 : _b.shaderParsedName) !== null && _c !== void 0 ? _c : (_d = item.material) === null || _d === void 0 ? void 0 : _d.shaderName)
            && Boolean((_e = item.material) === null || _e === void 0 ? void 0 : _e.sourceReference)
            && Boolean(((_f = item.material) === null || _f === void 0 ? void 0 : _f.shaderReference) && ((_g = item.shader) === null || _g === void 0 ? void 0 : _g.sourceReference)
                && referenceKey(item.material.shaderReference) === referenceKey(item.shader.sourceReference));
    });
    var builtinResource = (0, unity_builtin_1.unityBuiltinQuadReference)(renderer.mesh);
    // A source inventory can preserve the canonical file/path while lacking the
    // Unity GUID.  That is an ambiguous Quad for ordinary rendering, but it is
    // still useful exclusion evidence when the exact hierarchy/material context
    // proves a presentation helper.  The path alone is never sufficient.
    var ambiguousBuiltinQuad = Boolean(renderer.mesh
        && normalizedSerializedFile(renderer.mesh.file) === normalizedSerializedFile(unity_builtin_1.UNITY_BUILTIN_RESOURCES_FILE)
        && String(renderer.mesh.pathId) === unity_builtin_1.UNITY_BUILTIN_QUAD_PATH_ID);
    var sourceMesh = renderer.mesh
        ? __assign(__assign(__assign({}, renderer.mesh), { sourceReference: (_e = renderer.meshSourceReference) !== null && _e !== void 0 ? _e : null }), (builtinResource ? { builtinResource: builtinResource } : {})) : null;
    var evidence = ["exact source renderer reference ".concat(referenceKey(sourceReference))];
    if (renderer.hierarchyPath)
        evidence.push("source hierarchy ".concat(renderer.hierarchyPath));
    if (pathEvidence.branch)
        evidence.push('source renderer is in an FX/camera/cutin/presentation branch');
    if (pathEvidence.role)
        evidence.push('source hierarchy identifies a presentation role');
    if (builtinResource)
        evidence.push("source mesh is the exact Unity built-in ".concat(builtinResource.name));
    else if (ambiguousBuiltinQuad)
        evidence.push('source mesh is an ambiguous Unity built-in Quad pointer');
    for (var _i = 0, effectMaterials_1 = effectMaterials; _i < effectMaterials_1.length; _i++) {
        var item = effectMaterials_1[_i];
        evidence.push("source material is explicitly effect-scoped: ".concat(item.evidence.name));
        if (item.evidence.sourceReference)
            evidence.push("exact source material reference ".concat(referenceKey(item.evidence.sourceReference)));
        if (item.evidence.shaderName)
            evidence.push("source shader is an effect family: ".concat(item.evidence.shaderName));
        if (item.evidence.shaderReference)
            evidence.push("exact source shader reference ".concat(referenceKey(item.evidence.shaderReference)));
    }
    if (renderer.meshSourceReference)
        evidence.push("exact source mesh reference ".concat(referenceKey(renderer.meshSourceReference)));
    var completePresentationMaterials = materials.length > 0 && effectMaterials.length === materials.length;
    var exactMeshEvidence = Boolean(renderer.mesh && (renderer.meshSourceReference || builtinResource || ambiguousBuiltinQuad));
    var coreEvidence = attachment.exactRenderer || attachment.ambiguousEquipment || attachment.ambiguousName || attachment.attachedBone
        || coreShaderMaterials.length > 0;
    // Every material slot must carry an exact source material + shader identity
    // proving presentation scope. Unknown, missing, or core slots fail closed.
    var presentationEvidence = pathEvidence.branch
        && (pathEvidence.role || effectMaterials.length > 0)
        && completePresentationMaterials
        && exactMeshEvidence;
    // Core/equipment evidence always wins over presentation hints.  This is
    // deliberately conservative for mixed renderers and weapon materials.
    if (coreEvidence || !presentationEvidence)
        return { kind: 'core', sourceRenderer: renderer };
    var reasonCode = ambiguousBuiltinQuad
        ? 'PRESENTATION_MESH_10210_OR_HELPER'
        : 'PRESENTATION_SHADER_OR_MATERIAL';
    return {
        kind: 'excluded',
        sourceRenderer: renderer,
        excluded: {
            sourceReference: sourceReference,
            name: renderer.name,
            hierarchyPath: (_f = renderer.hierarchyPath) !== null && _f !== void 0 ? _f : null,
            reasonCode: reasonCode,
            evidence: __spreadArray([], new Set(evidence), true),
            sourceMesh: sourceMesh,
            materials: materials.map(function (item) { return item.evidence; }),
        },
    };
}
function numberState(pass, material, shader, stateNames, property) {
    return resolveShaderState(findState(pass === null || pass === void 0 ? void 0 : pass.state, stateNames), material, shader, property);
}
function optionalNumberState(pass, material, shader, stateNames, property) {
    var raw = findState(pass === null || pass === void 0 ? void 0 : pass.state, stateNames);
    return raw === undefined ? { value: null, source: 'literal' } : resolveShaderState(raw, material, shader, property);
}
function renderState(material, shader) {
    var _a, _b, _c;
    var pass = passFor(shader);
    var sourceBlend = numberState(pass, material, shader, ['srcBlend', 'sourceBlend'], '_SrcBlend');
    var destinationBlend = numberState(pass, material, shader, ['destBlend', 'dstBlend', 'destinationBlend'], '_DstBlend');
    var sourceBlendAlpha = optionalNumberState(pass, material, shader, ['srcBlendAlpha', 'sourceBlendAlpha'], '_SrcBlendAlpha');
    var destinationBlendAlpha = optionalNumberState(pass, material, shader, ['destBlendAlpha', 'destinationBlendAlpha'], '_DstBlendAlpha');
    var blendOperation = optionalNumberState(pass, material, shader, ['blendOp', 'blendOperation'], '_BlendOp');
    var blendOperationAlpha = optionalNumberState(pass, material, shader, ['blendOpAlpha', 'blendOperationAlpha'], '_BlendOpAlpha');
    var depthWrite = numberState(pass, material, shader, ['zWrite', 'depthWrite'], '_ZWrite');
    var depthTest = numberState(pass, material, shader, ['zTest', 'depthTest'], '_ZTest');
    var cull = numberState(pass, material, shader, ['culling', 'cull'], '_Cull');
    var offsetFactor = numberState(pass, material, shader, ['offsetFactor'], '_OffsetFactor');
    var offsetUnits = numberState(pass, material, shader, ['offsetUnits'], '_OffsetUnits');
    var depthFunction = (_b = new Map([[0, 'disabled'], [1, 'never'], [2, 'less'], [3, 'equal'], [4, 'less-equal'], [5, 'greater'], [6, 'not-equal'], [7, 'greater-equal'], [8, 'always']]).get((_a = depthTest.value) !== null && _a !== void 0 ? _a : -1)) !== null && _b !== void 0 ? _b : null;
    var blend = sourceBlend.value !== null && destinationBlend.value !== null
        && (sourceBlend.value !== 1 || destinationBlend.value !== 0);
    var alphaClip = (_c = propertyValue(material, '_AlphaClip')) !== null && _c !== void 0 ? _c : shaderDefault(shader, '_AlphaClip');
    var alphaMode = alphaClip === 1 ? 'MASK' : blend ? 'BLEND' : 'OPAQUE';
    var cullMode = cull.value === 0 ? 'off' : cull.value === 1 ? 'front' : cull.value === 2 ? 'back' : null;
    return {
        state: {
            sourceQueue: material.renderQueue,
            layer: alphaMode === 'BLEND' ? 'transparent' : 'opaque',
            alphaMode: alphaMode,
            depthWrite: depthWrite.value === null ? null : depthWrite.value !== 0,
            depthTest: depthTest.value === null ? null : depthTest.value !== 0,
            depthFunction: depthFunction,
            cullMode: cullMode,
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
            depthWrite, depthTest, cull, offsetFactor, offsetUnits].filter(function (value) { return value.source === 'unresolved'; }),
    };
}
function selectedAssembly(candidate, prefabPath) {
    var _a, _b, _c, _d, _e;
    var normalized = prefabPath.replaceAll('\\', '/').toLowerCase();
    var basename = (_a = normalized.split('/').at(-1)) === null || _a === void 0 ? void 0 : _a.replace(/\.prefab$/i, '');
    var byPath = (_c = (_b = candidate.assembly) === null || _b === void 0 ? void 0 : _b.filter(function (item) { var _a; return ((_a = item.prefabPath) === null || _a === void 0 ? void 0 : _a.replaceAll('\\', '/').toLowerCase()) === normalized; })) !== null && _c !== void 0 ? _c : [];
    if (byPath.length === 1)
        return byPath[0];
    if (byPath.length > 1)
        return undefined;
    var byRoot = (_e = (_d = candidate.assembly) === null || _d === void 0 ? void 0 : _d.filter(function (item) { return item.root.toLowerCase() === basename; })) !== null && _e !== void 0 ? _e : [];
    return byRoot.length === 1 ? byRoot[0] : undefined;
}
function matchingAssemblies(candidate, prefabPath) {
    var _a, _b, _c, _d, _e;
    var normalized = prefabPath.replaceAll('\\', '/').toLowerCase();
    var basename = (_a = normalized.split('/').at(-1)) === null || _a === void 0 ? void 0 : _a.replace(/\.prefab$/i, '');
    var byPath = (_c = (_b = candidate.assembly) === null || _b === void 0 ? void 0 : _b.filter(function (item) { var _a; return ((_a = item.prefabPath) === null || _a === void 0 ? void 0 : _a.replaceAll('\\', '/').toLowerCase()) === normalized; })) !== null && _c !== void 0 ? _c : [];
    if (byPath.length)
        return { kind: 'path', matches: byPath };
    return {
        kind: 'root',
        matches: (_e = (_d = candidate.assembly) === null || _d === void 0 ? void 0 : _d.filter(function (item) { return item.root.toLowerCase() === basename; })) !== null && _e !== void 0 ? _e : [],
    };
}
function sourceAuthoredCoreGeometryBlocker(prefabPath, assembly, decision) {
    var _a;
    var known = SOURCE_AUTHORED_CORE_GEOMETRY_EVIDENCE;
    var renderer = decision.sourceRenderer;
    var rendererReference = sourceRendererReference(renderer);
    var meshReference = renderer.meshSourceReference;
    var normalizedPath = function (value) { return value.replaceAll('\\', '/').toLowerCase(); };
    if (decision.kind !== 'core'
        || normalizedPath(prefabPath) !== normalizedPath(known.prefabPath)
        || normalizedPath((_a = assembly === null || assembly === void 0 ? void 0 : assembly.prefabPath) !== null && _a !== void 0 ? _a : '') !== normalizedPath(known.prefabPath)
        || referenceKey(assembly === null || assembly === void 0 ? void 0 : assembly.prefabReference) !== referenceKey(known.prefabReference)
        || referenceKey(rendererReference) !== referenceKey(known.renderer.sourceReference)
        || renderer.name !== known.renderer.name
        || renderer.hierarchyPath !== known.renderer.hierarchyPath
        || renderer.rendererType !== known.renderer.rendererType
        || referenceKey(meshReference) !== referenceKey(known.sourceMeshReference)
        || !renderer.mesh
        || normalizedSerializedFile(renderer.mesh.file) !== normalizedSerializedFile(known.sourceMeshReference.serializedFile)
        || renderer.mesh.pathId !== known.sourceMeshReference.objectId)
        return null;
    var evidence = [
        "exact source prefab reference ".concat(referenceKey(known.prefabReference)),
        "exact core renderer reference ".concat(referenceKey(known.renderer.sourceReference)),
        "exact source mesh reference ".concat(referenceKey(known.sourceMeshReference)),
        "Unity source primitive ".concat(known.primitiveIndex, " has disconnected ").concat(known.components.join(' and '), " components with a ").concat(known.sourceGap, " ").concat(known.sourceUnit, " gap"),
        "Unity source primitive ".concat(known.primitiveIndex, " has ").concat(known.bridgingTriangles, " bridging triangles between Head and torso"),
        'The matching outline body repeats this separation; no source-authored neck bridge exists in the indexed CH0081 body variants.',
    ];
    return {
        sourcePrefabPath: known.prefabPath,
        sourcePrefabReference: __assign({}, known.prefabReference),
        sourceReference: __assign({}, known.renderer.sourceReference),
        name: known.renderer.name,
        hierarchyPath: known.renderer.hierarchyPath,
        reasonCode: 'SOURCE_AUTHORED_CORE_GEOMETRY_SEPARATION',
        sourceMeshReference: __assign({}, known.sourceMeshReference),
        geometryEvidence: {
            primitiveIndex: known.primitiveIndex,
            components: __spreadArray([], known.components, true),
            sourceGap: known.sourceGap,
            sourceUnit: known.sourceUnit,
            bridgingTriangles: known.bridgingTriangles,
        },
        evidence: evidence,
    };
}
function buildChibiRenderingProfile(candidate, prefabPath, interaction) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    var unresolved = [];
    var assemblyMatches = matchingAssemblies(candidate, prefabPath);
    var assembly = selectedAssembly(candidate, prefabPath);
    if (assemblyMatches.matches.length > 1)
        unresolved.push("Selected prefab ".concat(prefabPath, " has ").concat(assemblyMatches.matches.length, " ambiguous source renderer assemblies matched by ").concat(assemblyMatches.kind, "."));
    else if (!assembly)
        unresolved.push("No source renderer assembly matches selected prefab ".concat(prefabPath, "."));
    else if (!assembly.prefabReference)
        unresolved.push("Selected prefab ".concat(prefabPath, " has no exact source object identity."));
    if (candidate.conflict)
        unresolved.push("Source dependency identities conflict for ".concat(candidate.sourceIdentity, "."));
    for (var _i = 0, _v = (_a = assembly === null || assembly === void 0 ? void 0 : assembly.attachments.equipmentRendererAmbiguities) !== null && _a !== void 0 ? _a : []; _i < _v.length; _i++) {
        var ambiguity = _v[_i];
        unresolved.push("Equipment renderer attachment ".concat(ambiguity.name, " is ambiguous (").concat(ambiguity.reasonCode, "); exact renderer identity is required."));
    }
    var sourceMaterials = (_b = candidate.sourceMaterials) !== null && _b !== void 0 ? _b : [];
    var shaderIndex = new Map(((_c = candidate.shaders) !== null && _c !== void 0 ? _c : []).flatMap(function (shader) { return shader.sourceReference ? [[referenceKey(shader.sourceReference), shader]] : []; }));
    var materialIndex = new Map(sourceMaterials.flatMap(function (material) { return material.sourceReference ? [[referenceKey(material.sourceReference), material]] : []; }));
    var pinnedRigMountAssessment = sourcePinnedRigMountAssessment(candidate, prefabPath, assembly, interaction, materialIndex, shaderIndex);
    if (pinnedRigMountAssessment && !pinnedRigMountAssessment.valid) {
        unresolved.push("Source-pinned rig-mount group proof is incomplete for ".concat(pinnedRigMountAssessment.group.identity, "; exact source evidence is required."));
    }
    var selectedClips = new Set(__spreadArray([interaction.initialPose], Object.values(interaction.interactions)
        .filter(function (action) { return action.state === 'available' && action.clip; }).map(function (action) { return action.clip; }), true).filter(function (clip) { return typeof clip === 'string'; }));
    var seenRendererReferences = new Set();
    var seenHierarchyPaths = new Set();
    var pinnedRigMountKeys = new Set((_d = pinnedRigMountAssessment === null || pinnedRigMountAssessment === void 0 ? void 0 : pinnedRigMountAssessment.sourceReferences.map(referenceKey)) !== null && _d !== void 0 ? _d : []);
    var equipmentBindingEvidence = ((_e = assembly === null || assembly === void 0 ? void 0 : assembly.renderers) !== null && _e !== void 0 ? _e : [])
        .map(function (renderer) {
        var _a, _b;
        var rendererReference = sourceRendererReference(renderer);
        var rendererKey = rendererReference ? referenceKey(rendererReference) : null;
        if (rendererKey && pinnedRigMountKeys.has(rendererKey)) {
            return (pinnedRigMountAssessment === null || pinnedRigMountAssessment === void 0 ? void 0 : pinnedRigMountAssessment.valid)
                ? (_a = pinnedRigMountAssessment.evidenceByReference.get(rendererKey)) !== null && _a !== void 0 ? _a : null
                : null;
        }
        return (_b = exactEquipmentBindingEvidence(assembly, renderer, materialIndex, shaderIndex)) !== null && _b !== void 0 ? _b : structuralEquipmentBindingEvidence(assembly, renderer, materialIndex, shaderIndex);
    })
        .filter(function (value) { return value !== null; })
        .sort(function (left, right) { return referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference))
        || left.classification.localeCompare(right.classification)
        || left.reasonCode.localeCompare(right.reasonCode); });
    var equipmentEvidenceByReference = new Map(equipmentBindingEvidence.map(function (value) { return [referenceKey(value.sourceReference), value]; }));
    var protectedRendererReferences = exactCoreRendererReferences(assembly);
    for (var _w = 0, pinnedRigMountKeys_1 = pinnedRigMountKeys; _w < pinnedRigMountKeys_1.length; _w++) {
        var key = pinnedRigMountKeys_1[_w];
        protectedRendererReferences.add(key);
    }
    for (var _z = 0, equipmentBindingEvidence_1 = equipmentBindingEvidence; _z < equipmentBindingEvidence_1.length; _z++) {
        var evidence = equipmentBindingEvidence_1[_z];
        protectedRendererReferences.add(referenceKey(evidence.sourceReference));
    }
    var rendererDecisions = ((_f = assembly === null || assembly === void 0 ? void 0 : assembly.renderers) !== null && _f !== void 0 ? _f : []).map(function (sourceRenderer) {
        return classifyRenderer(assembly, sourceRenderer, materialIndex, shaderIndex, protectedRendererReferences);
    });
    var coreGeometryBlockers = rendererDecisions
        .map(function (decision) { return sourceAuthoredCoreGeometryBlocker(prefabPath, assembly, decision); })
        .filter(function (value) { return value !== null; })
        .sort(function (left, right) { return referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference)); });
    var coreRendererBlockers = rendererDecisions
        .map(function (decision) { return decision.kind === 'core'
        ? missingEquipmentRelationBlocker(assembly, decision.sourceRenderer, materialIndex, shaderIndex, sourceRendererReference(decision.sourceRenderer)
            ? equipmentEvidenceByReference.get(referenceKey(sourceRendererReference(decision.sourceRenderer)))
            : undefined)
        : null; })
        .filter(function (value) { return value !== null; })
        .sort(function (left, right) {
        var _a, _b;
        return referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference))
            || String((_a = left.hierarchyPath) !== null && _a !== void 0 ? _a : '').localeCompare(String((_b = right.hierarchyPath) !== null && _b !== void 0 ? _b : ''))
            || left.name.localeCompare(right.name);
    });
    for (var _0 = 0, coreRendererBlockers_1 = coreRendererBlockers; _0 < coreRendererBlockers_1.length; _0++) {
        var blocker = coreRendererBlockers_1[_0];
        unresolved.push("Core renderer ".concat((_g = blocker.hierarchyPath) !== null && _g !== void 0 ? _g : blocker.name, " is a source-bound weapon/equipment renderer without an exact authored attachment relation (").concat(blocker.reasonCode, ")."));
    }
    for (var _1 = 0, coreGeometryBlockers_1 = coreGeometryBlockers; _1 < coreGeometryBlockers_1.length; _1++) {
        var blocker = coreGeometryBlockers_1[_1];
        unresolved.push("Core geometry ".concat(blocker.hierarchyPath, " is source-complete but visually unacceptable: source primitive ").concat(blocker.geometryEvidence.primitiveIndex, " has disconnected Head and torso components, a ").concat(blocker.geometryEvidence.sourceGap, " ").concat(blocker.geometryEvidence.sourceUnit, " gap, and ").concat(blocker.geometryEvidence.bridgingTriangles, " bridging triangles (").concat(blocker.reasonCode, ")."));
    }
    var decisionByReference = new Map();
    for (var _2 = 0, rendererDecisions_1 = rendererDecisions; _2 < rendererDecisions_1.length; _2++) {
        var decision = rendererDecisions_1[_2];
        var reference = sourceRendererReference(decision.sourceRenderer);
        if (!reference)
            continue;
        var key = referenceKey(reference);
        var values = (_h = decisionByReference.get(key)) !== null && _h !== void 0 ? _h : [];
        values.push(decision);
        decisionByReference.set(key, values);
    }
    // A duplicated source identity is already a profile blocker.  Never let a
    // duplicate be silently removed merely because one occurrence looks like
    // presentation and another occurrence looks core.
    for (var _3 = 0, decisionByReference_1 = decisionByReference; _3 < decisionByReference_1.length; _3++) {
        var _4 = decisionByReference_1[_3], key = _4[0], decisions = _4[1];
        if (decisions.length > 1 && decisions.some(function (item) { return item.kind === 'excluded'; })) {
            unresolved.push("Selected assembly contains duplicate source renderer identity ".concat(key, "; presentation exclusion is not safe."));
            for (var _5 = 0, decisions_1 = decisions; _5 < decisions_1.length; _5++) {
                var decision = decisions_1[_5];
                if (decision.kind === 'excluded')
                    decision.kind = 'core';
            }
        }
    }
    var excludedRenderers = rendererDecisions
        .filter(function (decision) { return decision.kind === 'excluded' && Boolean(decision.excluded); })
        .map(function (decision) { return decision.excluded; })
        .sort(function (left, right) { return referenceKey(left.sourceReference).localeCompare(referenceKey(right.sourceReference)); });
    var excludedRendererReferences = new Map(excludedRenderers.map(function (renderer) { return [referenceKey(renderer.sourceReference), renderer]; }));
    var renderers = ((_j = assembly === null || assembly === void 0 ? void 0 : assembly.renderers) !== null && _j !== void 0 ? _j : [])
        .filter(function (sourceRenderer) {
        var decision = sourceRendererReference(sourceRenderer)
            ? rendererDecisions.find(function (item) { return sourceRendererReference(item.sourceRenderer)
                && referenceKey(sourceRendererReference(item.sourceRenderer)) === referenceKey(sourceRendererReference(sourceRenderer)); })
            : undefined;
        return (decision === null || decision === void 0 ? void 0 : decision.kind) !== 'excluded';
    })
        .map(function (sourceRenderer) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        var builtinResource = (0, unity_builtin_1.unityBuiltinQuadReference)(sourceRenderer.mesh);
        var rendererLabel = (_a = sourceRenderer.hierarchyPath) !== null && _a !== void 0 ? _a : sourceRenderer.name;
        var reference = sourceRendererReference(sourceRenderer);
        if (!reference)
            unresolved.push("Renderer ".concat((_b = sourceRenderer.hierarchyPath) !== null && _b !== void 0 ? _b : sourceRenderer.name, " has no source object identity."));
        else {
            var key = referenceKey(reference);
            if (seenRendererReferences.has(key))
                unresolved.push("Selected assembly contains duplicate source renderer identity ".concat(key, "."));
            seenRendererReferences.add(key);
        }
        if (!sourceRenderer.hierarchyPath)
            unresolved.push("Renderer ".concat(sourceRenderer.name, " has no exact source hierarchy path."));
        else if (seenHierarchyPaths.has(sourceRenderer.hierarchyPath))
            unresolved.push("Selected assembly contains duplicate renderer hierarchy path ".concat(sourceRenderer.hierarchyPath, "."));
        else
            seenHierarchyPaths.add(sourceRenderer.hierarchyPath);
        var materialSlots = ((_c = sourceRenderer.materialSlots) !== null && _c !== void 0 ? _c : []).map(function (slot) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21;
            var materialReference = (_a = slot.sourceMaterialReference) !== null && _a !== void 0 ? _a : null;
            var sourceMaterial = materialReference ? materialIndex.get(referenceKey(materialReference)) : undefined;
            if (slot.material && slot.material.pathId !== '0' && !materialReference)
                unresolved.push("Renderer ".concat((_b = sourceRenderer.hierarchyPath) !== null && _b !== void 0 ? _b : sourceRenderer.name, " slot ").concat(slot.slot, " has an ambiguous material object reference."));
            if (materialReference && !sourceMaterial)
                unresolved.push("Renderer ".concat((_c = sourceRenderer.hierarchyPath) !== null && _c !== void 0 ? _c : sourceRenderer.name, " slot ").concat(slot.slot, " material ").concat(referenceKey(materialReference), " is missing from the candidate closure."));
            var sourceShaderReference = (_d = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.shaderReference) !== null && _d !== void 0 ? _d : null;
            var shader = sourceShaderReference ? shaderIndex.get(referenceKey(sourceShaderReference)) : undefined;
            if (sourceMaterial && sourceMaterial.shader && !sourceShaderReference)
                unresolved.push("Material ".concat(sourceMaterial.name, " has an ambiguous shader object reference."));
            if (sourceMaterial && sourceShaderReference && !shader)
                unresolved.push("Shader ".concat((_e = sourceMaterial.shaderName) !== null && _e !== void 0 ? _e : referenceKey(sourceShaderReference), " is missing from the candidate closure."));
            var shaderName = (_g = (_f = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.shaderParsedName) !== null && _f !== void 0 ? _f : sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.shaderName) !== null && _g !== void 0 ? _g : '(unnamed)';
            var customRule = sourceMaterial ? customShaderAdapterRule((_h = sourceMaterial.shaderName) !== null && _h !== void 0 ? _h : null, (_j = sourceMaterial.shaderParsedName) !== null && _j !== void 0 ? _j : null) : undefined;
            var glitchRule = sourceMaterial ? dsfxGlitchShaderRule((_k = sourceMaterial.shaderName) !== null && _k !== void 0 ? _k : null, (_l = sourceMaterial.shaderParsedName) !== null && _l !== void 0 ? _l : null) : undefined;
            var dsfxRule = sourceMaterial ? dsfxStaticShaderRule((_m = sourceMaterial.shaderName) !== null && _m !== void 0 ? _m : null, (_o = sourceMaterial.shaderParsedName) !== null && _o !== void 0 ? _o : null) : undefined;
            var adapterId = sourceMaterial ? adapterFor((_p = sourceMaterial.shaderName) !== null && _p !== void 0 ? _p : null, (_q = sourceMaterial.shaderParsedName) !== null && _q !== void 0 ? _q : null, shader) : null;
            var translated = sourceMaterial ? renderState(sourceMaterial, shader) : null;
            var shaderExtraction = null;
            var transparentShaderExtraction = null;
            var projectMxShaderExtraction = null;
            var eStandardShaderExtraction = null;
            var dsfxShaderExtraction = null;
            var dsfxRenderStateVariant = null;
            var dsfxMaterialVariant = null;
            var glitchShaderExtraction = null;
            var matcapShaderExtraction = null;
            if (sourceMaterial && glitchRule) {
                var extractionEvidence = dsfxGlitchShaderExtractionEvidence(shader);
                var materialError = dsfxGlitchMaterialEvidence(sourceMaterial, shader, (_r = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _r !== void 0 ? _r : null, extractionEvidence);
                if (materialError)
                    unresolved.push("Source shader ".concat(shaderName, " is not verified for adapter dsfx-glitch-tex: ").concat(materialError, "."));
                else if ('source' in extractionEvidence)
                    glitchShaderExtraction = extractionEvidence.source;
            }
            else if (sourceMaterial && customRule) {
                var evidenceError = customShaderEvidence(customRule, shader);
                if (evidenceError)
                    unresolved.push("Source shader ".concat(shaderName, " is not verified for adapter ").concat(customRule.id, ": ").concat(evidenceError, "."));
                else if (customRule.id === 'mx-unlit-outline') {
                    var extractionEvidence = outlineShaderExtractionEvidence(shader);
                    if ('error' in extractionEvidence)
                        unresolved.push("Source shader ".concat(shaderName, " is not verified for adapter ").concat(customRule.id, ": ").concat(extractionEvidence.error, "."));
                    else
                        shaderExtraction = extractionEvidence.source;
                }
                else if (customRule.id === 'mx-c-transparent-st') {
                    var extractionEvidence = transparentShaderExtractionEvidence(shader);
                    if ('error' in extractionEvidence)
                        unresolved.push("Source shader ".concat(shaderName, " is not verified for adapter ").concat(customRule.id, ": ").concat(extractionEvidence.error, "."));
                    else
                        transparentShaderExtraction = extractionEvidence.source;
                    var materialError = transparentMaterialEvidence(sourceMaterial, (_s = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _s !== void 0 ? _s : null);
                    if (materialError)
                        unresolved.push("Source material ".concat(sourceMaterial.name, " is not verified for adapter ").concat(customRule.id, ": ").concat(materialError, "."));
                }
                else if (customRule.id === 'projectmx-weapon-test1-damage') {
                    var activeVariant = ((_t = sourceMaterial.keywords) === null || _t === void 0 ? void 0 : _t.length) === 1
                        && sourceMaterial.keywords[0] === '_GLOW_0' ? 'glow' : 'forward';
                    var extractionEvidence = projectMxShaderExtractionEvidence(shader, activeVariant);
                    if ('error' in extractionEvidence)
                        unresolved.push("Source shader ".concat(shaderName, " is not verified for adapter ").concat(customRule.id, ": ").concat(extractionEvidence.error, "."));
                    else
                        projectMxShaderExtraction = extractionEvidence.source;
                    var materialError = projectMxMaterialEvidence(sourceMaterial, (_u = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _u !== void 0 ? _u : null, projectMxShaderExtraction);
                    if (materialError)
                        unresolved.push("Source material ".concat(sourceMaterial.name, " is not verified for adapter ").concat(customRule.id, ": ").concat(materialError, "."));
                }
                else if (customRule.id === 'mx-e-standard') {
                    var activeVariant = ((_v = sourceMaterial.keywords) === null || _v === void 0 ? void 0 : _v.includes('_DYNAMIC_LIGHTS')) ? 'dynamic' : 'static';
                    var extractionEvidence = eStandardShaderExtractionEvidence(shader, activeVariant);
                    if ('error' in extractionEvidence)
                        unresolved.push("Source shader ".concat(shaderName, " is not verified for adapter ").concat(customRule.id, ": ").concat(extractionEvidence.error, "."));
                    else
                        eStandardShaderExtraction = extractionEvidence.source;
                    var materialError = eStandardMaterialEvidence(sourceMaterial, shader, (_w = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _w !== void 0 ? _w : null, eStandardShaderExtraction);
                    if (materialError)
                        unresolved.push("Source material ".concat(sourceMaterial.name, " is not verified for adapter ").concat(customRule.id, ": ").concat(materialError, "."));
                }
                else if (customRule.id === 'dsfx-matcap') {
                    var extractionEvidence = dsfxMatcapShaderExtractionEvidence(shader);
                    if ('error' in extractionEvidence)
                        unresolved.push("Source shader ".concat(shaderName, " is not verified for adapter ").concat(customRule.id, ": ").concat(extractionEvidence.error, "."));
                    else
                        matcapShaderExtraction = extractionEvidence.source;
                    var materialError = dsfxMatcapMaterialEvidence(sourceMaterial, shader, (_z = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _z !== void 0 ? _z : null, extractionEvidence);
                    if (materialError)
                        unresolved.push("Source material ".concat(sourceMaterial.name, " is not verified for adapter ").concat(customRule.id, ": ").concat(materialError, "."));
                }
                else
                    unresolved.push(customShaderRuntimeBlocker(customRule));
            }
            else if (sourceMaterial && dsfxRule) {
                var extractionEvidence = dsfxStaticShaderExtractionEvidence(dsfxRule, shader);
                var evidenceError = dsfxStaticMaterialEvidence(dsfxRule, sourceMaterial, shader, (_0 = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _0 !== void 0 ? _0 : null, extractionEvidence);
                if (evidenceError)
                    unresolved.push("Source shader ".concat(shaderName, " is not verified for static adapter: ").concat(evidenceError, "."));
                else if ('source' in extractionEvidence && extractionEvidence.source) {
                    dsfxShaderExtraction = extractionEvidence.source;
                    if (dsfxRule.identity === 'dsfx/fx_shader_alphablend_0' || dsfxRule.identity === 'dsfx/fx_shader_alphablend_add' || dsfxRule.identity === 'dsfx/fx_shader_additive_0') {
                        dsfxRenderStateVariant = dsfxStaticRenderStateVariant(dsfxRule, (_1 = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _1 !== void 0 ? _1 : null);
                    }
                    if (dsfxRule.identity === 'dsfx/fx_shader_alphablend_add'
                        && referenceKey(materialReference) === referenceKey(exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_REFERENCE)) {
                        dsfxMaterialVariant = exports.DSFX_WAKAMO_EYE_ALPHA_BLEND_ADD_MATERIAL_VARIANT;
                    }
                }
            }
            else if (sourceMaterial && !adapterId) {
                unresolved.push("Unsupported source shader ".concat(shaderName, " on ").concat(sourceMaterial.name, "."));
            }
            if (sourceMaterial && translated) {
                if (translated.state.depthWrite === null)
                    unresolved.push("Depth-write state is unresolved for material ".concat(sourceMaterial.name, "."));
                if (translated.state.depthTest === null)
                    unresolved.push("Depth-test state is unresolved for material ".concat(sourceMaterial.name, "."));
                if (translated.state.cullMode === null)
                    unresolved.push("Cull state is unresolved for material ".concat(sourceMaterial.name, "."));
                for (var _i = 0, _22 = translated.unresolved; _i < _22.length; _i++) {
                    var state = _22[_i];
                    unresolved.push("Shader pass state is unresolved for material ".concat(sourceMaterial.name, "."));
                }
            }
            if (adapterId === 'mx-character-eyemouth') {
                var mouthTexture = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.textures.find(function (texture) { return texture.name === '_MouthTileTex'; });
                if (!(shader === null || shader === void 0 ? void 0 : shader.programBlobSha256))
                    unresolved.push("EyeMouth shader bytecode evidence is missing for ".concat((_2 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.name) !== null && _2 !== void 0 ? _2 : 'a material slot', "."));
                if (!(mouthTexture === null || mouthTexture === void 0 ? void 0 : mouthTexture.textureReference) && ((_3 = mouthTexture === null || mouthTexture === void 0 ? void 0 : mouthTexture.texture) === null || _3 === void 0 ? void 0 : _3.pathId) !== '0')
                    unresolved.push("Mouth atlas reference is unresolved for ".concat((_4 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.name) !== null && _4 !== void 0 ? _4 : 'a material slot', "."));
            }
            if (adapterId === 'mx-character-eyebrow') {
                var correction = (_5 = propertyValue(sourceMaterial, '_ZCorrection')) !== null && _5 !== void 0 ? _5 : shaderDefault(shader, '_ZCorrection');
                if (!(shader === null || shader === void 0 ? void 0 : shader.programBlobSha256) || correction === null)
                    unresolved.push("Eyebrow camera correction is unresolved for ".concat((_6 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.name) !== null && _6 !== void 0 ? _6 : 'a material slot', "."));
            }
            return __assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign({ slot: slot.slot, sourceMaterialReference: materialReference, sourceMaterialName: (_7 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.name) !== null && _7 !== void 0 ? _7 : null, sourceShaderReference: sourceShaderReference, sourceShaderName: (_8 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.shaderName) !== null && _8 !== void 0 ? _8 : null, sourceShaderParsedName: (_9 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.shaderParsedName) !== null && _9 !== void 0 ? _9 : null, shaderProgramBlobSha256: (_10 = shader === null || shader === void 0 ? void 0 : shader.programBlobSha256) !== null && _10 !== void 0 ? _10 : null }, (shaderExtraction ? { shaderExtraction: shaderExtraction } : {})), (transparentShaderExtraction ? { transparentShaderExtraction: transparentShaderExtraction } : {})), (projectMxShaderExtraction ? { projectMxShaderExtraction: projectMxShaderExtraction } : {})), (eStandardShaderExtraction ? { eStandardShaderExtraction: eStandardShaderExtraction } : {})), (dsfxShaderExtraction ? { dsfxShaderExtraction: dsfxShaderExtraction } : {})), (dsfxRenderStateVariant ? { dsfxRenderStateVariant: dsfxRenderStateVariant } : {})), (dsfxMaterialVariant ? { dsfxMaterialVariant: dsfxMaterialVariant } : {})), (glitchShaderExtraction ? { glitchShaderExtraction: glitchShaderExtraction } : {})), (matcapShaderExtraction ? { matcapShaderExtraction: matcapShaderExtraction } : {})), { adapterId: adapterId, materialProperties: __assign({ floats: sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.floatProperties, ints: sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.intProperties, colors: sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.colorProperties, keywords: (_11 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.keywords) !== null && _11 !== void 0 ? _11 : [], textures: (_12 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.textures) !== null && _12 !== void 0 ? _12 : [] }, (sourceMaterial ? { resolvedTextures: sourceMaterial.resolvedTextures } : {})), adapterSettings: __assign(__assign(__assign({ zCorrection: sourceMaterial && adapterId === 'mx-character-eyebrow'
                        ? (_13 = propertyValue(sourceMaterial, '_ZCorrection')) !== null && _13 !== void 0 ? _13 : shaderDefault(shader, '_ZCorrection') : null, eyeTint: sourceMaterial && adapterId === 'mx-character-eyemouth'
                        ? colorVector((_14 = sourceMaterial.colorProperties) === null || _14 === void 0 ? void 0 : _14._EyeTint) : null, mouthTint: sourceMaterial && adapterId === 'mx-character-eyemouth'
                        ? colorVector((_15 = sourceMaterial.colorProperties) === null || _15 === void 0 ? void 0 : _15._MouthTint) : null, baseColorTint: sourceMaterial ? sourceBaseColorTint(sourceMaterial, shader, adapterId) : null }, (sourceMaterial && adapterId === 'mx-unlit-outline'
                    ? {
                        outlineTint: materialColor(sourceMaterial, shader, '_OutlineTint'),
                        outlineZCorrection: (_16 = propertyValue(sourceMaterial, '_OutlineZCorrection')) !== null && _16 !== void 0 ? _16 : shaderDefault(shader, '_OutlineZCorrection'),
                    }
                    : {})), (sourceMaterial && adapterId === 'mx-c-transparent-st'
                    ? { transparentVariant: ((_17 = sourceMaterial.keywords) === null || _17 === void 0 ? void 0 : _17.length) === 1 && sourceMaterial.keywords[0] === '_DITHER_HORIZONTAL_LINES' ? 'dither' : ((_18 = sourceMaterial.keywords) === null || _18 === void 0 ? void 0 : _18.length) === 0 ? 'forward' : null }
                    : {})), (sourceMaterial && adapterId === 'dsfx-static'
                    ? { dsfxMultiply: (_19 = propertyValue(sourceMaterial, '_Multiply')) !== null && _19 !== void 0 ? _19 : shaderDefault(shader, '_Multiply') }
                    : {})), renderState: (_20 = translated === null || translated === void 0 ? void 0 : translated.state) !== null && _20 !== void 0 ? _20 : {
                    sourceQueue: (_21 = sourceMaterial === null || sourceMaterial === void 0 ? void 0 : sourceMaterial.renderQueue) !== null && _21 !== void 0 ? _21 : -1, layer: 'opaque', alphaMode: 'OPAQUE', depthWrite: null,
                    depthTest: null, depthFunction: null, cullMode: null, doubleSided: null, blend: { source: null, destination: null },
                    polygonOffsetFactor: null, polygonOffsetUnits: null,
                }, glb: null });
        });
        if (sourceRenderer.visible !== false && materialSlots.length === 0)
            unresolved.push("Visible renderer ".concat((_d = sourceRenderer.hierarchyPath) !== null && _d !== void 0 ? _d : sourceRenderer.name, " has no indexed material slots."));
        if (sourceRenderer.visible !== false && !sourceRenderer.mesh)
            unresolved.push("Visible renderer ".concat((_e = sourceRenderer.hierarchyPath) !== null && _e !== void 0 ? _e : sourceRenderer.name, " has no source mesh reference."));
        else if (sourceRenderer.mesh && builtinResource) {
            if (sourceRenderer.meshSourceReference)
                unresolved.push("Renderer ".concat(rendererLabel, " built-in Quad has an unexpected imported mesh source reference."));
            if (sourceRenderer.rendererType !== 'MeshRenderer')
                unresolved.push("Renderer ".concat(rendererLabel, " built-in Quad must be an unskinned MeshRenderer."));
        }
        else if (sourceRenderer.mesh && !sourceRenderer.meshSourceReference) {
            var ownerFile = (_f = reference === null || reference === void 0 ? void 0 : reference.serializedFile) !== null && _f !== void 0 ? _f : sourceRenderer.mesh.file;
            if (ownerFile && isExactNullPointer(sourceRenderer.mesh, ownerFile)) {
                var sourceIdentity = reference
                    ? "".concat(normalizedSerializedFile(reference.serializedFile), "#").concat(reference.objectId)
                    : 'identity unresolved';
                unresolved.push("Core renderer ".concat(rendererLabel, " (").concat(sourceIdentity, ") has an exact null source mesh pointer (").concat(normalizedSerializedFile(ownerFile), ":0); no core geometry is assigned."));
            }
            else {
                unresolved.push("Renderer ".concat(rendererLabel, " has an ambiguous source mesh reference."));
            }
        }
        var sourceMesh = sourceRenderer.mesh
            ? __assign(__assign(__assign({}, sourceRenderer.mesh), { sourceReference: (_g = sourceRenderer.meshSourceReference) !== null && _g !== void 0 ? _g : null }), (builtinResource ? { builtinResource: builtinResource } : {})) : null;
        return {
            sourceReference: reference,
            name: sourceRenderer.name,
            hierarchyPath: (_h = sourceRenderer.hierarchyPath) !== null && _h !== void 0 ? _h : null,
            rendererType: (_j = sourceRenderer.rendererType) !== null && _j !== void 0 ? _j : null,
            defaultVisible: (_k = sourceRenderer.visible) !== null && _k !== void 0 ? _k : (sourceRenderer.enabled && sourceRenderer.gameObjectActive !== false),
            sourceMesh: sourceMesh,
            glbNodeIndex: null,
            materialSlots: materialSlots,
        };
    });
    var childRendererEvents = [];
    var excludedChildRendererEvents = [];
    candidate.events.forEach(function (event, order) {
        var _a;
        if (!selectedClips.has(event.clip)
            || (event.function !== 'AniEvt_DisableChildRenderer' && event.function !== 'AniEvt_EnableChildRenderer'))
            return;
        var targetReference = (_a = event.targetReference) !== null && _a !== void 0 ? _a : null;
        if (!targetReference) {
            unresolved.push("Selected child-renderer event ".concat(event.clip, " at ").concat(event.time, " has no exact source renderer-ID binding; BAAD supplied index ").concat(event.int, " without a source object reference."));
            return;
        }
        var excludedRenderer = excludedRendererReferences.get(referenceKey(targetReference));
        if (excludedRenderer) {
            excludedChildRendererEvents.push({
                clip: event.clip,
                time: event.time,
                action: event.function === 'AniEvt_EnableChildRenderer' ? 'enable' : 'disable',
                sourceRendererReference: targetReference,
                order: order,
                reasonCode: 'PRESENTATION_CHILD_RENDERER_EVENT',
                evidence: __spreadArray([
                    "event target exactly matches excluded renderer ".concat(referenceKey(targetReference))
                ], excludedRenderer.evidence.filter(function (value) { return value !== "exact source renderer reference ".concat(referenceKey(targetReference)); }), true),
            });
            return;
        }
        var matches = renderers.filter(function (renderer) { return renderer.sourceReference
            && referenceKey(renderer.sourceReference) === referenceKey(targetReference); });
        if (matches.length !== 1) {
            unresolved.push("Selected child-renderer event ".concat(event.clip, " at ").concat(event.time, " target ").concat(referenceKey(targetReference), " resolves to ").concat(matches.length, " selected source renderers."));
            return;
        }
        childRendererEvents.push({
            clip: event.clip,
            time: event.time,
            action: event.function === 'AniEvt_EnableChildRenderer' ? 'enable' : 'disable',
            sourceRendererReference: matches[0].sourceReference,
            order: order,
        });
    });
    childRendererEvents.sort(function (left, right) { return left.time - right.time || left.order - right.order; });
    excludedChildRendererEvents.sort(function (left, right) { return left.time - right.time || left.order - right.order
        || referenceKey(left.sourceRendererReference).localeCompare(referenceKey(right.sourceRendererReference)); });
    var mouth = null;
    var mouthMetadata = (_k = assembly === null || assembly === void 0 ? void 0 : assembly.attachments.mouthMetadata) !== null && _k !== void 0 ? _k : [];
    var legacyMouthPointers = (_l = assembly === null || assembly === void 0 ? void 0 : assembly.attachments.mouthRenderer) !== null && _l !== void 0 ? _l : [];
    // Fresh inventories retain one exact metadata record per source component;
    // older inventories may only have the legacy attachment fields.  Keep both
    // shapes in the authority set so a duplicate or conflicting component is
    // detected instead of being hidden by preferring the newer shape.
    var mouthPointers = __spreadArray(__spreadArray([], mouthMetadata.map(function (metadata) {
        var _a;
        return (__assign(__assign({}, metadata.renderer), { sourceReference: (_a = metadata.sourceRendererReference) !== null && _a !== void 0 ? _a : null }));
    }), true), legacyMouthPointers, true);
    var mouthPointerIdentity = function (pointer) {
        var _a, _b;
        var exactRenderer = pointer.sourceReference ? null : renderers.filter(function (renderer) {
            var _a;
            return renderer.sourceReference
                && renderer.sourceReference.serializedFile.toLowerCase() === ((_a = pointer.file) !== null && _a !== void 0 ? _a : '').replaceAll('\\', '/').toLowerCase()
                && renderer.sourceReference.objectId === pointer.pathId;
        });
        var sourceReference = (_a = pointer.sourceReference) !== null && _a !== void 0 ? _a : ((exactRenderer === null || exactRenderer === void 0 ? void 0 : exactRenderer.length) === 1 ? exactRenderer[0].sourceReference : null);
        return sourceReference
            ? "reference:".concat(referenceKey(sourceReference))
            : "pointer:".concat(((_b = pointer.file) !== null && _b !== void 0 ? _b : '').replaceAll('\\', '/').toLowerCase(), ":").concat(pointer.pathId);
    };
    var mouthPointerIdentities = new Set(mouthPointers.map(mouthPointerIdentity));
    if (mouthPointerIdentities.size > 1)
        unresolved.push('Mouth component metadata conflicts: multiple source renderer identities are authoritative.');
    var metadataMaterialIndices = mouthMetadata.flatMap(function (metadata) { return Number.isInteger(metadata.materialIndex) ? [metadata.materialIndex] : []; });
    var metadataMaterialIndexSet = new Set(metadataMaterialIndices);
    var legacyMaterialIndex = assembly === null || assembly === void 0 ? void 0 : assembly.attachments.mouthMaterialIndex;
    if (metadataMaterialIndexSet.size > 1 || (metadataMaterialIndices.length && Number.isInteger(legacyMaterialIndex)
        && metadataMaterialIndices.some(function (index) { return index !== legacyMaterialIndex; }))) {
        unresolved.push('Mouth component metadata conflicts: multiple material slot indices are authoritative.');
    }
    var metadataDefaultUVs = mouthMetadata.flatMap(function (metadata) { return metadata.defaultUV ? [metadata.defaultUV] : []; });
    var metadataUVKeys = new Set(metadataDefaultUVs.map(function (uv) { return "".concat(uv.x, ":").concat(uv.y); }));
    var legacyDefaultUV = assembly === null || assembly === void 0 ? void 0 : assembly.attachments.mouthDefaultUV;
    if (metadataUVKeys.size > 1 || (metadataDefaultUVs.length && legacyDefaultUV
        && metadataDefaultUVs.some(function (uv) { return uv.x !== legacyDefaultUV.x || uv.y !== legacyDefaultUV.y; }))) {
        unresolved.push('Mouth component metadata conflicts: multiple default UV coordinates are authoritative.');
    }
    var mouthRendererPointer = mouthPointers[0];
    if (mouthRendererPointer) {
        var sourceRendererMatches = mouthRendererPointer.sourceReference
            ? renderers.filter(function (renderer) { return renderer.sourceReference
                && referenceKey(renderer.sourceReference) === referenceKey(mouthRendererPointer.sourceReference); })
            : renderers.filter(function (renderer) {
                var _a;
                return renderer.sourceReference
                    && renderer.sourceReference.serializedFile.toLowerCase() === ((_a = mouthRendererPointer.file) !== null && _a !== void 0 ? _a : '').toLowerCase()
                    && renderer.sourceReference.objectId === mouthRendererPointer.pathId;
            });
        var sourceRenderer = sourceRendererMatches.length === 1 ? sourceRendererMatches[0] : undefined;
        if (sourceRendererMatches.length !== 1)
            unresolved.push("Mouth component does not resolve to exactly one source renderer (".concat(sourceRendererMatches.length, " exact matches)."));
        var slotIndex_1 = (_m = metadataMaterialIndices[0]) !== null && _m !== void 0 ? _m : legacyMaterialIndex;
        if (!Number.isInteger(slotIndex_1) || (slotIndex_1 !== null && slotIndex_1 !== void 0 ? slotIndex_1 : -1) < 0)
            unresolved.push('Mouth component has an invalid or missing material slot index.');
        var boundRenderer = sourceRenderer;
        var slot = boundRenderer === null || boundRenderer === void 0 ? void 0 : boundRenderer.materialSlots.find(function (material) { return material.slot === slotIndex_1; });
        if (sourceRenderer && Number.isInteger(slotIndex_1) && !slot)
            unresolved.push("Mouth material slot ".concat(slotIndex_1, " does not exist on ").concat(sourceRenderer.name, "."));
        var eyeMaterial = (slot === null || slot === void 0 ? void 0 : slot.sourceMaterialReference) ? materialIndex.get(referenceKey(slot.sourceMaterialReference)) : undefined;
        var adapter = slot === null || slot === void 0 ? void 0 : slot.adapterId;
        if (slot && adapter !== 'mx-character-eyemouth')
            unresolved.push("Mouth material slot ".concat(slotIndex_1, " is not bound to a verified EyeMouth shader."));
        var atlas = eyeMaterial === null || eyeMaterial === void 0 ? void 0 : eyeMaterial.textures.find(function (texture) { return texture.name === '_MouthTileTex'; });
        var resolvedAtlas = eyeMaterial === null || eyeMaterial === void 0 ? void 0 : eyeMaterial.resolvedTextures.find(function (texture) { return texture.property === '_MouthTileTex'; });
        var mouthShader = (eyeMaterial === null || eyeMaterial === void 0 ? void 0 : eyeMaterial.shaderReference) ? shaderIndex.get(referenceKey(eyeMaterial.shaderReference)) : undefined;
        var defaultUV = (_o = metadataDefaultUVs[0]) !== null && _o !== void 0 ? _o : legacyDefaultUV;
        var transformScale = atlas === null || atlas === void 0 ? void 0 : atlas.scale, transformOffset = atlas === null || atlas === void 0 ? void 0 : atlas.offset;
        var serializedColumns = finiteNumber((_p = eyeMaterial === null || eyeMaterial === void 0 ? void 0 : eyeMaterial.floatProperties) === null || _p === void 0 ? void 0 : _p._MouthTileCols);
        var serializedRows = finiteNumber((_q = eyeMaterial === null || eyeMaterial === void 0 ? void 0 : eyeMaterial.floatProperties) === null || _q === void 0 ? void 0 : _q._MouthTileRows);
        var x = finiteNumber(defaultUV === null || defaultUV === void 0 ? void 0 : defaultUV.x), y = finiteNumber(defaultUV === null || defaultUV === void 0 ? void 0 : defaultUV.y);
        if (x === null || y === null)
            unresolved.push('Mouth default UV coordinates are missing or non-finite.');
        var scaleX = finiteNumber(transformScale === null || transformScale === void 0 ? void 0 : transformScale.x), scaleY = finiteNumber(transformScale === null || transformScale === void 0 ? void 0 : transformScale.y);
        var offsetX = finiteNumber(transformOffset === null || transformOffset === void 0 ? void 0 : transformOffset.x), offsetY = finiteNumber(transformOffset === null || transformOffset === void 0 ? void 0 : transformOffset.y);
        if (scaleX === null || scaleY === null || offsetX === null || offsetY === null)
            unresolved.push('Mouth atlas texture transform is missing or non-finite.');
        var serializedGrid = {
            columns: (_r = positiveInteger(serializedColumns)) !== null && _r !== void 0 ? _r : 8,
            rows: (_s = positiveInteger(serializedRows)) !== null && _s !== void 0 ? _s : 8,
        };
        var serializedTileX = x === null ? 0 : Math.max(0, Math.min(serializedGrid.columns - 1, Math.round(x * serializedGrid.columns)));
        var serializedTileY = y === null ? 0 : Math.max(0, Math.min(serializedGrid.rows - 1, Math.round(y * serializedGrid.rows)));
        var serializedDefaultTile = x === null || y === null ? null : serializedTileY * 100 + serializedTileX;
        var sourceMouthEvents = candidate.events.filter(function (event) { return selectedClips.has(event.clip)
            && ['SetMouthTile', 'SetHorizontallyFlippedMouthTile', 'SetMouthTileToDefault'].includes(event.function); })
            .map(function (event, order) {
            var rawTile = event.function === 'SetMouthTileToDefault' ? null : event.int !== 0 ? event.int : Number(event.string);
            return { event: event, order: order, rawTile: rawTile };
        });
        var selectedMouthTiles = sourceMouthEvents
            .filter(function (item) { return item.event.function !== 'SetMouthTileToDefault'; })
            .map(function (item) { var _a; return Math.abs((_a = item.rawTile) !== null && _a !== void 0 ? _a : Number.NaN); });
        var mouthGrid = resolveMouthAtlasGrid({
            serializedColumns: serializedColumns,
            serializedRows: serializedRows,
            shader: mouthShader,
            shaderIdentityVerified: adapter === 'mx-character-eyemouth' && verifiedEyeMouthShader(mouthShader),
            atlasTextureReference: atlas === null || atlas === void 0 ? void 0 : atlas.textureReference,
            resolvedAtlas: resolvedAtlas,
            selectedTiles: selectedMouthTiles,
            defaultTile: serializedDefaultTile,
        });
        var columns = mouthGrid.columns, rows = mouthGrid.rows;
        var tileX = x === null ? 0 : Math.max(0, Math.min(columns - 1, Math.round(x * columns)));
        var tileY = y === null ? 0 : Math.max(0, Math.min(rows - 1, Math.round(y * rows)));
        var defaultTile_1 = tileY * 100 + tileX;
        var events = sourceMouthEvents.map(function (_a) {
            var event = _a.event, order = _a.order, rawTile = _a.rawTile;
            return ({
                event: {
                    clip: event.clip, time: event.time,
                    tile: event.function === 'SetMouthTileToDefault' ? defaultTile_1 : Math.abs(rawTile !== null && rawTile !== void 0 ? rawTile : Number.NaN),
                    flipX: event.function === 'SetMouthTileToDefault' ? false
                        : event.function === 'SetHorizontallyFlippedMouthTile' || (rawTile !== null && rawTile !== void 0 ? rawTile : Number.NaN) < 0,
                },
                order: order,
            });
        })
            .filter(function (item) { return Number.isFinite(item.event.tile) && Number.isFinite(item.event.time); })
            .sort(function (left, right) { return left.event.time - right.event.time || left.order - right.order; })
            .map(function (item) { return item.event; });
        for (var _6 = 0, events_1 = events; _6 < events_1.length; _6++) {
            var event_1 = events_1[_6];
            if (Math.floor(event_1.tile / 100) >= rows || event_1.tile % 100 >= columns) {
                unresolved.push("Mouth tile ".concat(event_1.tile, " is outside the ").concat(columns, "x").concat(rows, " source atlas for ").concat(event_1.clip, "."));
            }
        }
        if ((sourceRenderer === null || sourceRenderer === void 0 ? void 0 : sourceRenderer.sourceReference) && Number.isInteger(slotIndex_1) && x !== null && y !== null
            && (atlas === null || atlas === void 0 ? void 0 : atlas.textureReference) && scaleX !== null && scaleY !== null && offsetX !== null && offsetY !== null) {
            mouth = {
                sourceRendererReference: sourceRenderer.sourceReference,
                materialSlot: slotIndex_1,
                defaultUV: { x: x, y: y },
                defaultTile: defaultTile_1,
                columns: columns,
                rows: rows,
                textureProperty: '_MouthTileTex',
                textureReference: atlas.textureReference,
                textureTransform: { scale: { x: scaleX, y: scaleY }, offset: { x: offsetX, y: offsetY } },
                shaderUvRule: { xLessEqual: 0.25, yLessEqual: 0.25, glbVInverted: true },
                events: events,
                glbPrimitiveIndices: { eyes: [], mouth: [] }, glbMaterialIndex: null,
            };
        }
    }
    if (mouth && !mouth.textureReference)
        unresolved.push('Mouth atlas has no exact source object identity.');
    var drawSequence = __spreadArray([], renderers, true).sort(function (left, right) {
        var layerLeft = Math.max.apply(Math, __spreadArray(__spreadArray([], left.materialSlots.map(function (slot) { return slot.renderState.layer === 'transparent' ? 1 : 0; }), false), [0], false));
        var layerRight = Math.max.apply(Math, __spreadArray(__spreadArray([], right.materialSlots.map(function (slot) { return slot.renderState.layer === 'transparent' ? 1 : 0; }), false), [0], false));
        return layerLeft - layerRight || left.name.localeCompare(right.name);
    }).flatMap(function (renderer) { return renderer.sourceReference ? [referenceKey(renderer.sourceReference)] : []; });
    // An unresolved attachment relation is allowed to remain a warning only
    // when it is the sole unresolved item.  The renderer remains in the core
    // export and the complete source blocker evidence is retained in the
    // warning; it is never reclassified as presentation-only.  Any additional
    // unresolved core/mouth/material/event evidence stays fail-closed.
    var soleArrangementBlocker = coreRendererBlockers.length === 1
        && unresolved.length === 1
        && ((_t = unresolved[0]) === null || _t === void 0 ? void 0 : _t.endsWith("(".concat(coreRendererBlockers[0].reasonCode, ").")))
        && (function () {
            var blocker = coreRendererBlockers[0];
            var renderer = assembly === null || assembly === void 0 ? void 0 : assembly.renderers.find(function (item) { return sourceRendererReference(item)
                && referenceKey(sourceRendererReference(item)) === referenceKey(blocker.sourceReference); });
            return arrangementOnlyAttachmentEvidence(candidate, assembly, renderer, blocker, interaction, equipmentBindingEvidence);
        })();
    var swimsuitBlockerMessages = coreRendererBlockers.map(function (blocker) { var _a; return "Core renderer ".concat((_a = blocker.hierarchyPath) !== null && _a !== void 0 ? _a : blocker.name, " is a source-bound weapon/equipment renderer without an exact authored attachment relation (").concat(blocker.reasonCode, ")."); });
    var swimsuitPairIsSoleUncertainty = coreRendererBlockers.length === 2
        && unresolved.length === 2
        && new Set(unresolved).size === 2
        && swimsuitBlockerMessages.every(function (message) { return unresolved.includes(message); })
        && exactSaoriSwimsuitArrangementEvidence(candidate, assembly, coreRendererBlockers, interaction);
    var pinnedRigMountBlockerMessages = coreRendererBlockers.map(function (blocker) { var _a; return "Core renderer ".concat((_a = blocker.hierarchyPath) !== null && _a !== void 0 ? _a : blocker.name, " is a source-bound weapon/equipment renderer without an exact authored attachment relation (").concat(blocker.reasonCode, ")."); });
    var pinnedRigMountGroupIsSoleUncertainty = Boolean(pinnedRigMountAssessment === null || pinnedRigMountAssessment === void 0 ? void 0 : pinnedRigMountAssessment.valid)
        && coreGeometryBlockers.length === 0
        && coreRendererBlockers.length === pinnedRigMountAssessment.sourceReferences.length
        && unresolved.length === pinnedRigMountAssessment.sourceReferences.length
        && new Set(unresolved).size === unresolved.length
        && pinnedRigMountBlockerMessages.every(function (message) { return unresolved.includes(message); })
        && pinnedRigMountAssessment.sourceReferences.every(function (reference) { return coreRendererBlockers.some(function (blocker) {
            return referenceKey(blocker.sourceReference) === referenceKey(reference);
        }); });
    var pinnedRigMountWarning = pinnedRigMountGroupIsSoleUncertainty
        ? {
            reasonCode: 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT',
            message: "Source-pinned same-prefab rig-mount group ".concat(pinnedRigMountAssessment.group.identity, " has no authored main/sub slot; all group renderers remain included and their arrangement may need review."),
            blocker: coreRendererBlockers[0],
            sourceGroupReferences: pinnedRigMountAssessment.sourceReferences,
            sourceEvidence: __spreadArray([], new Set(__spreadArray(__spreadArray([], pinnedRigMountAssessment.warningEvidence, true), pinnedRigMountAssessment.sourceReferences.flatMap(function (reference) { var _a, _b; return (_b = (_a = pinnedRigMountAssessment.evidenceByReference.get(referenceKey(reference))) === null || _a === void 0 ? void 0 : _a.evidence) !== null && _b !== void 0 ? _b : []; }), true)), true),
        }
        : null;
    var swimsuitArrangementWarnings = swimsuitPairIsSoleUncertainty
        ? coreRendererBlockers.map(function (blocker, index) { return ({
            reasonCode: blocker.reasonCode,
            message: swimsuitBlockerMessages[index],
            blocker: blocker,
        }); })
        : [];
    var warnings = pinnedRigMountWarning
        ? [pinnedRigMountWarning]
        : swimsuitPairIsSoleUncertainty
            ? swimsuitArrangementWarnings
            : soleArrangementBlocker
                ? [{ reasonCode: coreRendererBlockers[0].reasonCode, message: unresolved[0], blocker: coreRendererBlockers[0] }]
                : [];
    var arrangementWarningPublished = warnings.length > 0;
    var publishedCoreRendererBlockers = arrangementWarningPublished ? [] : coreRendererBlockers;
    var publishedUnresolved = arrangementWarningPublished ? [] : __spreadArray([], new Set(unresolved), true);
    return {
        schemaVersion: 2,
        profileVersion: exports.CHIBI_RENDERING_PROFILE_VERSION,
        adapterVersion: exports.CHIBI_SHADER_ADAPTER_VERSION,
        sourceIdentity: candidate.sourceIdentity,
        dependencyFingerprint: candidate.fingerprint,
        sourcePrefab: { path: prefabPath, reference: (_u = assembly === null || assembly === void 0 ? void 0 : assembly.prefabReference) !== null && _u !== void 0 ? _u : null },
        assembly: assembly !== null && assembly !== void 0 ? assembly : null,
        renderers: renderers,
        childRendererEvents: childRendererEvents,
        excludedRenderers: excludedRenderers,
        excludedChildRendererEvents: excludedChildRendererEvents,
        coreRendererBlockers: publishedCoreRendererBlockers,
        coreGeometryBlockers: coreGeometryBlockers,
        equipmentBindingEvidence: equipmentBindingEvidence,
        warnings: warnings,
        mouth: mouth,
        drawSequence: drawSequence,
        policyVersion: exports.CHIBI_RENDERING_POLICY_VERSION,
        validation: {
            valid: publishedUnresolved.length === 0,
            unresolved: publishedUnresolved,
            excludedRenderers: excludedRenderers,
            excludedChildRendererEvents: excludedChildRendererEvents,
            coreRendererBlockers: publishedCoreRendererBlockers,
            coreGeometryBlockers: coreGeometryBlockers,
            equipmentBindingEvidence: equipmentBindingEvidence,
            warnings: warnings,
        },
    };
}
function sourceObjectKey(reference) {
    return referenceKey(reference);
}
