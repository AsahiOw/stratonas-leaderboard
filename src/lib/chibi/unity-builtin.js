"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNITY_BUILTIN_QUAD_NAME = exports.UNITY_BUILTIN_QUAD_PATH_ID = exports.UNITY_BUILTIN_RESOURCES_FILE = exports.UNITY_BUILTIN_RESOURCES_GUID = void 0;
exports.unityBuiltinQuadReference = unityBuiltinQuadReference;
exports.UNITY_BUILTIN_RESOURCES_GUID = '00000000000000000e00000000000000';
exports.UNITY_BUILTIN_RESOURCES_FILE = 'unity default resources';
exports.UNITY_BUILTIN_QUAD_PATH_ID = '10210';
exports.UNITY_BUILTIN_QUAD_NAME = 'Quad';
function normalizedBuiltinFile(value) {
    var _a, _b;
    return typeof value === 'string' ? (_b = (_a = value.replaceAll('\\', '/').split('/').at(-1)) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '' : '';
}
function normalizedBuiltinGuid(value) {
    return typeof value === 'string' ? value.replaceAll('-', '').toLowerCase() : '';
}
/**
 * Return the canonical built-in Quad identity only for the complete Unity
 * external reference. Names, array order, and partial/null pointers never
 * qualify; callers must keep those unresolved.
 */
function unityBuiltinQuadReference(pointer) {
    var _a;
    if (!pointer || normalizedBuiltinFile(pointer.file) !== exports.UNITY_BUILTIN_RESOURCES_FILE || String(pointer.pathId) !== exports.UNITY_BUILTIN_QUAD_PATH_ID)
        return null;
    var typed = pointer.builtinResource;
    if (typed && (typed.kind !== 'unity-builtin-resource'
        || normalizedBuiltinGuid(typed.guid) !== exports.UNITY_BUILTIN_RESOURCES_GUID
        || normalizedBuiltinFile(typed.file) !== exports.UNITY_BUILTIN_RESOURCES_FILE
        || String(typed.pathId) !== exports.UNITY_BUILTIN_QUAD_PATH_ID
        || typed.name !== exports.UNITY_BUILTIN_QUAD_NAME))
        return null;
    var guid = normalizedBuiltinGuid((_a = pointer.externalGuid) !== null && _a !== void 0 ? _a : typed === null || typed === void 0 ? void 0 : typed.guid);
    if (guid !== exports.UNITY_BUILTIN_RESOURCES_GUID)
        return null;
    return {
        kind: 'unity-builtin-resource', guid: exports.UNITY_BUILTIN_RESOURCES_GUID,
        file: exports.UNITY_BUILTIN_RESOURCES_FILE, pathId: exports.UNITY_BUILTIN_QUAD_PATH_ID, name: exports.UNITY_BUILTIN_QUAD_NAME,
    };
}
