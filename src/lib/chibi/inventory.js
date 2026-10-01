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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.unityBuiltinQuadReference = exports.UNITY_BUILTIN_QUAD_NAME = exports.UNITY_BUILTIN_QUAD_PATH_ID = exports.UNITY_BUILTIN_RESOURCES_FILE = exports.UNITY_BUILTIN_RESOURCES_GUID = void 0;
exports.inventoryDiagnosticSummary = inventoryDiagnosticSummary;
exports.parseCharacterPart = parseCharacterPart;
exports.candidatesFromFiles = candidatesFromFiles;
exports.sharedDependencyParts = sharedDependencyParts;
exports.scanSourceInventory = scanSourceInventory;
var node_crypto_1 = require("node:crypto");
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var node_child_process_1 = require("node:child_process");
var storage_1 = require("./storage");
var unity_builtin_1 = require("./unity-builtin");
Object.defineProperty(exports, "UNITY_BUILTIN_RESOURCES_GUID", { enumerable: true, get: function () { return unity_builtin_1.UNITY_BUILTIN_RESOURCES_GUID; } });
Object.defineProperty(exports, "UNITY_BUILTIN_RESOURCES_FILE", { enumerable: true, get: function () { return unity_builtin_1.UNITY_BUILTIN_RESOURCES_FILE; } });
Object.defineProperty(exports, "UNITY_BUILTIN_QUAD_PATH_ID", { enumerable: true, get: function () { return unity_builtin_1.UNITY_BUILTIN_QUAD_PATH_ID; } });
Object.defineProperty(exports, "UNITY_BUILTIN_QUAD_NAME", { enumerable: true, get: function () { return unity_builtin_1.UNITY_BUILTIN_QUAD_NAME; } });
Object.defineProperty(exports, "unityBuiltinQuadReference", { enumerable: true, get: function () { return unity_builtin_1.unityBuiltinQuadReference; } });
function inventoryDiagnosticSummary(report) {
    return {
        format: 'compact-diagnostic-v1',
        version: report.version,
        source: report.source,
        files: report.files.map(function (file) { return ({
            path: file.path, size: file.size, modifiedNs: file.modifiedNs, sha256: file.sha256, kind: file.kind, error: file.error,
            entries: file.entries.map(function (entry) { return ({
                path: entry.path, size: entry.size, compressedSize: entry.compressedSize, crc32: entry.crc32, sha256: entry.sha256, error: entry.error,
            }); }),
        }); }),
        candidates: report.candidates.map(function (candidate) {
            var _a;
            return ({
                sourceIdentity: candidate.sourceIdentity, fingerprint: candidate.fingerprint, conflict: candidate.conflict,
                parts: candidate.parts, families: candidate.families, revisions: candidate.revisions, clips: candidate.clips,
                objectNames: candidate.objectNames, materials: candidate.materials, dependencies: candidate.dependencies,
                prefabPaths: candidate.prefabPaths, unresolvedDependencies: candidate.unresolvedDependencies,
                eventCount: candidate.events.length, assembly: (_a = candidate.assembly) !== null && _a !== void 0 ? _a : [],
            });
        }),
        errors: report.errors,
    };
}
var CHARACTER_PARTS = [
    /^assets-_mx-characters-(.+?)-_mxdependency-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$/i,
    /^character-(.+?)-_mxload-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$/i,
    /^cafe-characteranimation-(.+?)-_mxload-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})_assets_all_\d+\.bundle$/i,
];
function parseCharacterPart(entryPath) {
    var _a;
    var name = (_a = entryPath.replaceAll('\\', '/').split('/').at(-1)) !== null && _a !== void 0 ? _a : '';
    var match = CHARACTER_PARTS.map(function (pattern) { return name.match(pattern); }).find(Boolean);
    return match ? { sourceIdentity: match[1].toLowerCase(), family: match[2].toLowerCase(), revision: match[3] } : null;
}
function normalizedFile(value) { var _a, _b; return (_b = (_a = value.replaceAll('\\', '/').split('/').at(-1)) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : ''; }
function familyClaim(ref) {
    var _a, _b;
    var name = normalizedFile(ref.entry.path);
    var scope = name.startsWith('assets-_mx-characters-') ? 'dependency' : name.startsWith('cafe-characteranimation-') ? 'cafe' : 'load';
    return "".concat(scope, ":").concat((_b = (_a = ref.parsed) === null || _a === void 0 ? void 0 : _a.family) !== null && _b !== void 0 ? _b : '');
}
function metadataIdentities(metadata) {
    var _a;
    var identities = new Set();
    for (var _i = 0, _b = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.containers) !== null && _a !== void 0 ? _a : []; _i < _b.length; _i++) {
        var item = _b[_i];
        var normalized = item.path.replaceAll('\\', '/');
        var match = normalized.match(/\/_MX\/(?:Characters|AddressableAsset\/Character)\/([^/]+)\/(?:[^/]+\/)*([^/]+)\.prefab$/i);
        if (!match)
            continue;
        // Effects, timelines, and shared resources live below the same Unity
        // namespace but are not character model identities.  Only treat a
        // container as an authoritative identity when its root prefab name is the
        // identity itself; cafe/formation/battle prefabs are then pulled in by
        // the dependency closure of that root model.
        var identity = canonicalSourceIdentity(match[1]);
        if (identity && canonicalSourceIdentity(match[2]) === identity)
            identities.add(identity);
    }
    return identities;
}
function canonicalSourceIdentity(value) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function sourcePart(ref, family) {
    var _a, _b, _c, _d;
    if (family === void 0) { family = (_b = (_a = ref.parsed) === null || _a === void 0 ? void 0 : _a.family) !== null && _b !== void 0 ? _b : 'dependency'; }
    return {
        archivePath: ref.file.path, archiveSha256: ref.file.sha256, entryPath: ref.entry.path,
        entrySize: ref.entry.size, entryCrc32: ref.entry.crc32, sha256: ref.entry.sha256,
        family: family,
        revision: (_d = (_c = ref.parsed) === null || _c === void 0 ? void 0 : _c.revision) !== null && _d !== void 0 ? _d : null, sourceKind: ref.file.kind === 'bundle' ? 'bundle' : 'archive',
    };
}
function dependencyName(dependency) {
    return normalizedFile(typeof dependency === 'string' ? dependency : dependency.name || dependency.path);
}
function uniqueRefs(refs) {
    var values = new Map();
    for (var _i = 0, refs_1 = refs; _i < refs_1.length; _i++) {
        var ref = refs_1[_i];
        if (ref.entry.sha256 && !values.has(ref.entry.sha256))
            values.set(ref.entry.sha256, ref);
    }
    return __spreadArray([], values.values(), true);
}
function stableAssembly(value) {
    return JSON.stringify(value);
}
function sourceReferenceKey(reference) {
    return reference
        ? "".concat(reference.bundleSha256.toLowerCase(), ":").concat(normalizedFile(reference.serializedFile), ":").concat(reference.objectId)
        : '';
}
function assemblyPointerKey(pointer) {
    var _a;
    return pointer
        ? "".concat(normalizedFile((_a = pointer.file) !== null && _a !== void 0 ? _a : ''), ":").concat(pointer.pathId)
        : '';
}
function normalizeEquipmentAttachments(attachments) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var normalized = __assign({}, attachments);
    var references = new Map();
    for (var _i = 0, _k = (_a = attachments.equipmentRendererReferences) !== null && _a !== void 0 ? _a : []; _i < _k.length; _i++) {
        var reference = _k[_i];
        var key = sourceReferenceKey(reference);
        if (!references.has(key))
            references.set(key, reference);
    }
    if (references.size)
        normalized.equipmentRendererReferences = __spreadArray([], references.values(), true).sort(function (left, right) {
            return sourceReferenceKey(left).localeCompare(sourceReferenceKey(right));
        });
    else
        delete normalized.equipmentRendererReferences;
    var groups = new Map();
    for (var _l = 0, _m = (_b = attachments.equipmentRendererGroups) !== null && _b !== void 0 ? _b : []; _l < _m.length; _l++) {
        var group = _m[_l];
        var attachmentKey = assemblyPointerKey(group.attachment);
        var sourceReferences = new Map();
        var prior = groups.get("".concat(group.kind, "\0").concat(attachmentKey));
        for (var _o = 0, _p = __spreadArray(__spreadArray([], ((_c = prior === null || prior === void 0 ? void 0 : prior.sourceReferences) !== null && _c !== void 0 ? _c : []), true), ((_d = group.sourceReferences) !== null && _d !== void 0 ? _d : []), true); _o < _p.length; _o++) {
            var reference = _p[_o];
            var key_1 = sourceReferenceKey(reference);
            if (key_1)
                sourceReferences.set(key_1, reference);
        }
        if (!attachmentKey || !sourceReferences.size)
            continue;
        var key = "".concat(group.kind, "\0").concat(attachmentKey);
        var evidence = __spreadArray([], new Set(__spreadArray(__spreadArray([], ((_e = prior === null || prior === void 0 ? void 0 : prior.evidence) !== null && _e !== void 0 ? _e : []), true), ((_f = group.evidence) !== null && _f !== void 0 ? _f : []), true)), true).sort();
        groups.set(key, {
            kind: group.kind,
            attachment: group.attachment,
            sourceReferences: __spreadArray([], sourceReferences.values(), true).sort(function (left, right) { return sourceReferenceKey(left).localeCompare(sourceReferenceKey(right)); }),
            evidence: evidence,
        });
    }
    if (groups.size)
        normalized.equipmentRendererGroups = __spreadArray([], groups.values(), true).sort(function (left, right) {
            return "".concat(left.kind, "\0").concat(assemblyPointerKey(left.attachment)).localeCompare("".concat(right.kind, "\0").concat(assemblyPointerKey(right.attachment)));
        });
    else
        delete normalized.equipmentRendererGroups;
    var ambiguities = new Map();
    for (var _q = 0, _r = (_g = attachments.equipmentRendererAmbiguities) !== null && _g !== void 0 ? _g : []; _q < _r.length; _q++) {
        var ambiguity = _r[_q];
        // Distinct authored attachment pointers with the same display name are
        // separate diagnostics.  Merging by name would erase evidence and could
        // make a later profile layer appear to have a deterministic match.
        var key = "".concat(ambiguity.name, "\0").concat(ambiguity.reasonCode, "\0").concat(assemblyPointerKey(ambiguity.attachment));
        var prior = ambiguities.get(key);
        var sourceReferences = new Map();
        for (var _s = 0, _t = __spreadArray(__spreadArray([], ((_h = prior === null || prior === void 0 ? void 0 : prior.sourceReferences) !== null && _h !== void 0 ? _h : []), true), ((_j = ambiguity.sourceReferences) !== null && _j !== void 0 ? _j : []), true); _s < _t.length; _s++) {
            var reference = _t[_s];
            var referenceKey = sourceReferenceKey(reference);
            if (!sourceReferences.has(referenceKey))
                sourceReferences.set(referenceKey, reference);
        }
        ambiguities.set(key, __assign(__assign({ name: ambiguity.name, reasonCode: ambiguity.reasonCode }, (ambiguity.attachment ? { attachment: ambiguity.attachment } : (prior === null || prior === void 0 ? void 0 : prior.attachment) ? { attachment: prior.attachment } : {})), { sourceReferences: __spreadArray([], sourceReferences.values(), true).sort(function (left, right) {
                return sourceReferenceKey(left).localeCompare(sourceReferenceKey(right));
            }) }));
    }
    if (ambiguities.size)
        normalized.equipmentRendererAmbiguities = __spreadArray([], ambiguities.values(), true).sort(function (left, right) {
            return "".concat(left.name, "\0").concat(left.reasonCode, "\0").concat(assemblyPointerKey(left.attachment)).localeCompare("".concat(right.name, "\0").concat(right.reasonCode, "\0").concat(assemblyPointerKey(right.attachment)));
        });
    else
        delete normalized.equipmentRendererAmbiguities;
    // Keep the legacy name array verbatim.  In particular, repeated names are
    // useful compatibility evidence when source metadata contains duplicate
    // renderers; the ambiguity records above prevent a name-only selection.
    if (attachments.equipmentRenderers)
        normalized.equipmentRenderers = __spreadArray([], attachments.equipmentRenderers, true);
    return normalized;
}
function rendererUsesAssemblyPointer(renderer, pointer) {
    var _a, _b;
    var key = assemblyPointerKey(pointer);
    if (!key)
        return false;
    return __spreadArray(__spreadArray([renderer.rootBone], ((_a = renderer.transformChain) !== null && _a !== void 0 ? _a : []), true), ((_b = renderer.boneReferences) !== null && _b !== void 0 ? _b : []), true).some(function (value) { return assemblyPointerKey(value) === key; });
}
function pointerMatchesSourceReference(pointer, reference) {
    return Boolean(pointer && pointer.pathId !== '0' && reference
        && normalizedFile(pointer.file) === normalizedFile(reference.serializedFile)
        && pointer.pathId === reference.objectId);
}
function rendererHasExactSourceResources(renderer, materialIndex, shaderIndex, requireWeaponToken) {
    var _a, _b;
    if (requireWeaponToken === void 0) { requireWeaponToken = true; }
    if (renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer'
        || !renderer.mesh || !renderer.meshSourceReference
        || !pointerMatchesSourceReference(renderer.mesh, renderer.meshSourceReference))
        return false;
    var slots = (_a = renderer.materialSlots) !== null && _a !== void 0 ? _a : [];
    if (!slots.length)
        return false;
    var sourceMaterialNames = [];
    for (var _i = 0, slots_1 = slots; _i < slots_1.length; _i++) {
        var slot = slots_1[_i];
        var materialReference = slot.sourceMaterialReference;
        if (!materialReference || !pointerMatchesSourceReference(slot.material, materialReference))
            return false;
        var material = materialIndex.get(sourceReferenceKey(materialReference));
        if (!(material === null || material === void 0 ? void 0 : material.shader) || !material.shaderReference
            || !pointerMatchesSourceReference(material.shader, material.shaderReference))
            return false;
        var shader = shaderIndex.get(sourceReferenceKey(material.shaderReference));
        if (!(shader === null || shader === void 0 ? void 0 : shader.sourceReference) || sourceReferenceKey(shader.sourceReference) !== sourceReferenceKey(material.shaderReference))
            return false;
        sourceMaterialNames.push(material.name);
    }
    // The exact pointer relation is authoritative.  The authored equipment
    // token is only required by the legacy mainWeapon ambiguity path; the
    // structural Bip001_Weapon path already has an exact m_Bones anchor and
    // never selects a renderer by name alone.
    return !requireWeaponToken || __spreadArray([renderer.name, (_b = renderer.hierarchyPath) !== null && _b !== void 0 ? _b : ''], sourceMaterialNames, true).some(function (value) { return /(?:^|[_/\s-])weapon(?:$|[_/\s-])/i.test(value); });
}
function isExactBip001WeaponPointer(pointer, prefabReference) {
    var _a, _b;
    return Boolean(pointer
        && pointer.pathId !== '0'
        && ((_a = pointer.name) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === 'bip001_weapon'
        && normalizedFile((_b = pointer.file) !== null && _b !== void 0 ? _b : '') === normalizedFile(prefabReference.serializedFile));
}
function rendererLooksLikeBody(renderer) {
    var _a;
    var value = "".concat(renderer.name, " ").concat((_a = renderer.hierarchyPath) !== null && _a !== void 0 ? _a : '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    return /(?:^|[_/\s-])(?:body|face|hair|head|skin|clothing|outfit|uniform|character)(?:$|[_/\s-])/.test(value);
}
function promoteStructuralBip001WeaponGroups(assembly, sourceMaterials, candidateShaders, existingReferences) {
    var _a, _b;
    var prefabReference = assembly.prefabReference;
    if (!prefabReference)
        return new Map();
    var materialIndex = new Map(sourceMaterials.flatMap(function (material) { return material.sourceReference
        ? [[sourceReferenceKey(material.sourceReference), material]] : []; }));
    var shaderIndex = new Map(candidateShaders.flatMap(function (shader) { return shader.sourceReference
        ? [[sourceReferenceKey(shader.sourceReference), shader]] : []; }));
    var grouped = new Map();
    for (var _i = 0, _c = assembly.renderers; _i < _c.length; _i++) {
        var renderer = _c[_i];
        if (renderer.visible === false || renderer.rendererType !== 'SkinnedMeshRenderer' || !renderer.sourceReference)
            continue;
        var anchors = new Map();
        for (var _d = 0, _e = (_a = renderer.boneReferences) !== null && _a !== void 0 ? _a : []; _d < _e.length; _d++) {
            var pointer = _e[_d];
            if (!isExactBip001WeaponPointer(pointer, prefabReference))
                continue;
            var key = assemblyPointerKey(pointer);
            if (key)
                anchors.set(key, pointer);
        }
        if (anchors.size !== 1)
            continue;
        for (var _f = 0, anchors_1 = anchors; _f < anchors_1.length; _f++) {
            var _g = anchors_1[_f], key = _g[0], pointer = _g[1];
            var prior = (_b = grouped.get(key)) !== null && _b !== void 0 ? _b : { attachment: __assign({}, pointer), renderers: [] };
            if (!prior.renderers.includes(renderer))
                prior.renderers.push(renderer);
            grouped.set(key, prior);
        }
    }
    var promoted = new Map();
    var _loop_1 = function (anchorKey, group) {
        if (group.renderers.length !== 2)
            return "continue";
        var matchingRenderers = assembly.renderers.filter(function (renderer) { return rendererUsesAssemblyPointer(renderer, group.attachment); });
        if (matchingRenderers.length !== 2 || matchingRenderers.some(function (renderer) { return !group.renderers.includes(renderer); }))
            return "continue";
        if (group.renderers.some(function (renderer) { return rendererLooksLikeBody(renderer); }))
            return "continue";
        var sourceReferences = new Map();
        for (var _k = 0, _l = group.renderers; _k < _l.length; _k++) {
            var renderer = _l[_k];
            var reference = renderer.sourceReference;
            if (!reference
                || reference.bundleSha256.toLowerCase() !== prefabReference.bundleSha256.toLowerCase()
                || normalizedFile(reference.serializedFile) !== normalizedFile(prefabReference.serializedFile)
                || !rendererHasExactSourceResources(renderer, materialIndex, shaderIndex, false)) {
                sourceReferences.clear();
                break;
            }
            sourceReferences.set(sourceReferenceKey(reference), reference);
        }
        if (sourceReferences.size !== 2 || __spreadArray([], sourceReferences.keys(), true).some(function (key) { return existingReferences.has(key); }))
            return "continue";
        promoted.set(anchorKey, {
            kind: 'structuralWeapon',
            attachment: __assign({}, group.attachment),
            sourceReferences: __spreadArray([], sourceReferences.values(), true).sort(function (left, right) { return sourceReferenceKey(left).localeCompare(sourceReferenceKey(right)); }),
            evidence: __spreadArray(__spreadArray([
                "exact same-prefab Bip001_Weapon m_Bones anchor ".concat(anchorKey),
                'structural group contains exactly two unique visible SkinnedMeshRenderer source identities',
                "all grouped renderer identities share the selected prefab ".concat(normalizedFile(prefabReference.serializedFile))
            ], group.renderers.map(function (renderer) { return "exact mesh/material/shader source identities verified for ".concat(sourceReferenceKey(renderer.sourceReference)); }), true), [
                'no body or third renderer shares the exact anchor',
                'unique same-prefab structural Bip001_Weapon renderer group',
            ], false),
        });
    };
    for (var _h = 0, grouped_1 = grouped; _h < grouped_1.length; _h++) {
        var _j = grouped_1[_h], anchorKey = _j[0], group = _j[1];
        _loop_1(anchorKey, group);
    }
    return promoted;
}
function promoteExactEquipmentRendererGroups(assembly, sourceMaterials, candidateShaders) {
    var _a, _b, _c, _d, _e;
    var ambiguities = (_a = assembly.attachments.equipmentRendererAmbiguities) !== null && _a !== void 0 ? _a : [];
    if (!assembly.prefabReference)
        return assembly;
    var materialIndex = new Map(sourceMaterials.flatMap(function (material) { return material.sourceReference
        ? [[sourceReferenceKey(material.sourceReference), material]] : []; }));
    var shaderIndex = new Map(candidateShaders.flatMap(function (shader) { return shader.sourceReference
        ? [[sourceReferenceKey(shader.sourceReference), shader]] : []; }));
    var promoted = new Map();
    var mainWeaponPointers = (_b = assembly.attachments.mainWeapon) !== null && _b !== void 0 ? _b : [];
    var _loop_2 = function (index, ambiguity) {
        // This promotion is deliberately narrower than the generic exact
        // equipment relation: only one source-authored mainWeapon pointer and the
        // known two-renderer Aris-style group are accepted here.
        if (ambiguity.reasonCode !== 'ambiguous-equipment-renderer-relation' || !ambiguity.attachment)
            return "continue";
        var attachmentKey = assemblyPointerKey(ambiguity.attachment);
        if (!attachmentKey || mainWeaponPointers.filter(function (pointer) { return assemblyPointerKey(pointer) === attachmentKey; }).length !== 1)
            return "continue";
        var samePointerAmbiguities = ambiguities.filter(function (item) { return assemblyPointerKey(item.attachment) === attachmentKey; });
        if (samePointerAmbiguities.length !== 1)
            return "continue";
        var sourceReferences = new Map();
        for (var _t = 0, _u = (_c = ambiguity.sourceReferences) !== null && _c !== void 0 ? _c : []; _t < _u.length; _t++) {
            var reference = _u[_t];
            sourceReferences.set(sourceReferenceKey(reference), reference);
        }
        if (sourceReferences.size !== 2)
            return "continue";
        var groupedRenderers = [];
        var valid = true;
        var _loop_3 = function (reference) {
            var matches = assembly.renderers.filter(function (renderer) { return renderer.sourceReference
                && sourceReferenceKey(renderer.sourceReference) === sourceReferenceKey(reference); });
            if (matches.length !== 1) {
                valid = false;
                return "break";
            }
            groupedRenderers.push(matches[0]);
        };
        for (var _v = 0, _w = sourceReferences.values(); _v < _w.length; _v++) {
            var reference = _w[_v];
            var state_1 = _loop_3(reference);
            if (state_1 === "break")
                break;
        }
        if (!valid || groupedRenderers.length !== 2)
            return "continue";
        var prefabReference = assembly.prefabReference;
        if (!groupedRenderers.every(function (renderer) { return renderer.sourceReference
            && renderer.sourceReference.bundleSha256.toLowerCase() === prefabReference.bundleSha256.toLowerCase()
            && normalizedFile(renderer.sourceReference.serializedFile) === normalizedFile(prefabReference.serializedFile)
            && rendererUsesAssemblyPointer(renderer, ambiguity.attachment)
            && rendererHasExactSourceResources(renderer, materialIndex, shaderIndex); }))
            return "continue";
        var matchingRenderers = assembly.renderers.filter(function (renderer) { return rendererUsesAssemblyPointer(renderer, ambiguity.attachment); });
        if (matchingRenderers.length !== groupedRenderers.length
            || matchingRenderers.some(function (renderer) { return !groupedRenderers.includes(renderer); }))
            return "continue";
        promoted.set(index, {
            kind: 'mainWeapon',
            attachment: __assign({}, ambiguity.attachment),
            sourceReferences: __spreadArray([], sourceReferences.values(), true).sort(function (left, right) { return sourceReferenceKey(left).localeCompare(sourceReferenceKey(right)); }),
            evidence: __spreadArray(__spreadArray([
                "exact mainWeapon pointer ".concat(attachmentKey),
                'one-to-many group contains exactly two unique visible SkinnedMeshRenderer source identities',
                "all grouped renderer identities share the selected prefab ".concat(normalizedFile(prefabReference.serializedFile))
            ], groupedRenderers.map(function (renderer) { return "exact mesh/material/shader source identities verified for ".concat(sourceReferenceKey(renderer.sourceReference)); }), true), [
                'no other renderer matches the exact mainWeapon pointer',
                'unique same-prefab mainWeapon renderer group',
            ], false),
        });
    };
    for (var _i = 0, _f = ambiguities.entries(); _i < _f.length; _i++) {
        var _g = _f[_i], index = _g[0], ambiguity = _g[1];
        _loop_2(index, ambiguity);
    }
    var references = new Map();
    for (var _h = 0, _j = (_d = assembly.attachments.equipmentRendererReferences) !== null && _d !== void 0 ? _d : []; _h < _j.length; _h++) {
        var reference = _j[_h];
        references.set(sourceReferenceKey(reference), reference);
    }
    for (var _k = 0, _l = promoted.values(); _k < _l.length; _k++) {
        var group = _l[_k];
        for (var _m = 0, _o = group.sourceReferences; _m < _o.length; _m++) {
            var reference = _o[_m];
            references.set(sourceReferenceKey(reference), reference);
        }
    }
    var structuralPromotions = promoteStructuralBip001WeaponGroups(assembly, sourceMaterials, candidateShaders, new Set(references.keys()));
    for (var _p = 0, _q = structuralPromotions.values(); _p < _q.length; _p++) {
        var group = _q[_p];
        for (var _r = 0, _s = group.sourceReferences; _r < _s.length; _r++) {
            var reference = _s[_r];
            references.set(sourceReferenceKey(reference), reference);
        }
    }
    if (!promoted.size && !structuralPromotions.size)
        return assembly;
    var structuralAnchorKeys = new Set(structuralPromotions.keys());
    var remainingAmbiguities = ambiguities.filter(function (_ambiguity, index) {
        if (promoted.has(index))
            return false;
        var anchorKey = assemblyPointerKey(_ambiguity.attachment);
        return !anchorKey || !structuralAnchorKeys.has(anchorKey);
    });
    var attachments = __assign(__assign(__assign({}, assembly.attachments), { equipmentRendererReferences: __spreadArray([], references.values(), true), equipmentRendererGroups: __spreadArray(__spreadArray(__spreadArray([], ((_e = assembly.attachments.equipmentRendererGroups) !== null && _e !== void 0 ? _e : []), true), promoted.values(), true), structuralPromotions.values(), true) }), (remainingAmbiguities.length ? { equipmentRendererAmbiguities: remainingAmbiguities } : {}));
    if (!remainingAmbiguities.length)
        delete attachments.equipmentRendererAmbiguities;
    return __assign(__assign({}, assembly), { attachments: normalizeEquipmentAttachments(attachments) });
}
/**
 * Resolve a legacy mouth pointer to the selected assembly's exact renderer
 * identity when possible.  A name or array position is never used as a
 * fallback: an unresolved pointer keeps its serialized file/path key and is
 * left for profile validation to reject.
 */
function mouthPointerKey(assembly, pointer) {
    var _a;
    if (pointer.sourceReference)
        return "source:".concat(sourceReferenceKey(pointer.sourceReference));
    var file = normalizedFile((_a = pointer.file) !== null && _a !== void 0 ? _a : '');
    var matches = assembly.renderers.filter(function (renderer) { return renderer.sourceReference
        && normalizedFile(renderer.sourceReference.serializedFile) === file
        && renderer.sourceReference.objectId === pointer.pathId; });
    if (matches.length === 1)
        return "source:".concat(sourceReferenceKey(matches[0].sourceReference));
    return "pointer:".concat(file, ":").concat(pointer.pathId);
}
function mergeMouthAttachments(left, right, assembly) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var leftIndex = left.mouthMaterialIndex, rightIndex = right.mouthMaterialIndex;
    if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex)
        return null;
    var leftUV = left.mouthDefaultUV, rightUV = right.mouthDefaultUV;
    if (leftUV && rightUV && (leftUV.x !== rightUV.x || leftUV.y !== rightUV.y))
        return null;
    var merged = __assign(__assign({}, left), right);
    var equipmentRendererReferences = new Map();
    for (var _i = 0, _o = __spreadArray(__spreadArray([], ((_a = left.equipmentRendererReferences) !== null && _a !== void 0 ? _a : []), true), ((_b = right.equipmentRendererReferences) !== null && _b !== void 0 ? _b : []), true); _i < _o.length; _i++) {
        var reference = _o[_i];
        var key = sourceReferenceKey(reference);
        if (!equipmentRendererReferences.has(key))
            equipmentRendererReferences.set(key, reference);
    }
    if (equipmentRendererReferences.size)
        merged.equipmentRendererReferences = __spreadArray([], equipmentRendererReferences.values(), true).sort(function (a, b) {
            return sourceReferenceKey(a).localeCompare(sourceReferenceKey(b));
        });
    else
        delete merged.equipmentRendererReferences;
    var equipmentRendererAmbiguities = normalizeEquipmentAttachments({
        equipmentRendererAmbiguities: __spreadArray(__spreadArray([], ((_c = left.equipmentRendererAmbiguities) !== null && _c !== void 0 ? _c : []), true), ((_d = right.equipmentRendererAmbiguities) !== null && _d !== void 0 ? _d : []), true),
    }).equipmentRendererAmbiguities;
    if (equipmentRendererAmbiguities === null || equipmentRendererAmbiguities === void 0 ? void 0 : equipmentRendererAmbiguities.length)
        merged.equipmentRendererAmbiguities = equipmentRendererAmbiguities;
    else
        delete merged.equipmentRendererAmbiguities;
    var mouthRenderers = new Map();
    for (var _p = 0, _q = __spreadArray(__spreadArray([], ((_e = left.mouthRenderer) !== null && _e !== void 0 ? _e : []), true), ((_f = right.mouthRenderer) !== null && _f !== void 0 ? _f : []), true); _p < _q.length; _p++) {
        var pointer = _q[_p];
        var key = mouthPointerKey(assembly, pointer);
        var prior = mouthRenderers.get(key);
        // Prefer the exact full source identity when a legacy pointer and a
        // source-referenced pointer describe the same renderer.
        if (!prior || (!prior.sourceReference && pointer.sourceReference))
            mouthRenderers.set(key, pointer);
    }
    if (mouthRenderers.size)
        merged.mouthRenderer = __spreadArray([], mouthRenderers.values(), true);
    var mouthMetadata = new Map();
    for (var _r = 0, _s = __spreadArray(__spreadArray([], ((_g = left.mouthMetadata) !== null && _g !== void 0 ? _g : []), true), ((_h = right.mouthMetadata) !== null && _h !== void 0 ? _h : []), true); _r < _s.length; _r++) {
        var metadata = _s[_r];
        var pointer = __assign(__assign({}, metadata.renderer), { sourceReference: (_j = metadata.sourceRendererReference) !== null && _j !== void 0 ? _j : null });
        var key = mouthPointerKey(assembly, pointer);
        var prior = mouthMetadata.get(key);
        if (!prior) {
            mouthMetadata.set(key, metadata);
            continue;
        }
        if (prior.materialIndex !== undefined && prior.materialIndex !== null
            && metadata.materialIndex !== undefined && metadata.materialIndex !== null
            && prior.materialIndex !== metadata.materialIndex)
            return null;
        if (prior.defaultUV && metadata.defaultUV
            && (prior.defaultUV.x !== metadata.defaultUV.x || prior.defaultUV.y !== metadata.defaultUV.y))
            return null;
        mouthMetadata.set(key, __assign(__assign({}, prior), { renderer: prior.renderer.file ? prior.renderer : metadata.renderer, sourceRendererReference: (_k = prior.sourceRendererReference) !== null && _k !== void 0 ? _k : metadata.sourceRendererReference, materialIndex: (_l = prior.materialIndex) !== null && _l !== void 0 ? _l : metadata.materialIndex, defaultUV: (_m = prior.defaultUV) !== null && _m !== void 0 ? _m : metadata.defaultUV }));
    }
    if (mouthMetadata.size)
        merged.mouthMetadata = __spreadArray([], mouthMetadata.values(), true);
    var mouthMaterialIndex = leftIndex !== null && leftIndex !== void 0 ? leftIndex : rightIndex;
    if (mouthMaterialIndex === undefined)
        delete merged.mouthMaterialIndex;
    else
        merged.mouthMaterialIndex = mouthMaterialIndex;
    var mouthDefaultUV = leftUV !== null && leftUV !== void 0 ? leftUV : rightUV;
    if (!mouthDefaultUV)
        delete merged.mouthDefaultUV;
    else
        merged.mouthDefaultUV = mouthDefaultUV;
    return merged;
}
function mergeAssemblyRecord(values, item) {
    var prefabKey = sourceReferenceKey(item.prefabReference);
    if (!prefabKey)
        return values.some(function (existing) { return stableAssembly(existing) === stableAssembly(item); }) ? values : __spreadArray(__spreadArray([], values, true), [item], false);
    var index = values.findIndex(function (existing) { return sourceReferenceKey(existing.prefabReference) === prefabKey; });
    if (index < 0)
        return __spreadArray(__spreadArray([], values, true), [item], false);
    var existing = values[index];
    var _existingAttachments = existing.attachments, existingStructure = __rest(existing, ["attachments"]);
    var _itemAttachments = item.attachments, itemStructure = __rest(item, ["attachments"]);
    if (JSON.stringify(existingStructure) !== JSON.stringify(itemStructure))
        return __spreadArray(__spreadArray([], values, true), [item], false);
    var attachments = mergeMouthAttachments(existing.attachments, item.attachments, existing);
    if (!attachments)
        return __spreadArray(__spreadArray([], values, true), [item], false);
    return values.map(function (value, valueIndex) { return valueIndex === index ? __assign(__assign({}, existing), { attachments: attachments }) : value; });
}
function candidatesFromFiles(files) {
    var _a, _b, _c, _d;
    var refs = files.flatMap(function (file) { return file.entries.map(function (entry) { return ({ file: file, entry: entry, parsed: parseCharacterPart(entry.path) }); }); }).filter(function (ref) { return Boolean(ref.entry.sha256); });
    var serializedIndex = new Map();
    for (var _i = 0, refs_2 = refs; _i < refs_2.length; _i++) {
        var ref = refs_2[_i];
        for (var _e = 0, _f = (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.serializedFiles) !== null && _b !== void 0 ? _b : []; _e < _f.length; _e++) {
            var serialized = _f[_e];
            var key = normalizedFile(serialized);
            serializedIndex.set(key, __spreadArray(__spreadArray([], ((_c = serializedIndex.get(key)) !== null && _c !== void 0 ? _c : []), true), [ref], false));
        }
    }
    var grouped = new Map();
    for (var _g = 0, refs_3 = refs; _g < refs_3.length; _g++) {
        var ref = refs_3[_g];
        var identities = ref.parsed ? [ref.parsed.sourceIdentity] : __spreadArray([], metadataIdentities(ref.entry.metadata), true);
        for (var _h = 0, identities_1 = identities; _h < identities_1.length; _h++) {
            var identity = identities_1[_h];
            grouped.set(identity, __spreadArray(__spreadArray([], ((_d = grouped.get(identity)) !== null && _d !== void 0 ? _d : []), true), [ref], false));
        }
    }
    return __spreadArray([], grouped, true).map(function (_a) {
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        var sourceIdentity = _a[0], unfiltered = _a[1];
        var latestByFamily = new Map();
        for (var _i = 0, unfiltered_1 = unfiltered; _i < unfiltered_1.length; _i++) {
            var ref = unfiltered_1[_i];
            if ((_b = ref.parsed) === null || _b === void 0 ? void 0 : _b.revision) {
                var claim = familyClaim(ref), current = latestByFamily.get(claim);
                if (!current || ref.parsed.revision > current)
                    latestByFamily.set(claim, ref.parsed.revision);
            }
        }
        var seeds = uniqueRefs(unfiltered.filter(function (ref) { var _a; return !((_a = ref.parsed) === null || _a === void 0 ? void 0 : _a.revision) || ref.parsed.revision === latestByFamily.get(familyClaim(ref)); }));
        var closure = new Map(seeds.map(function (ref) { return [ref.entry.sha256, ref]; }));
        var unresolved = new Set(), dependencyConflicts = new Set(), queue = __spreadArray([], seeds, true);
        while (queue.length) {
            var ref = queue.shift();
            for (var _z = 0, _0 = (_d = (_c = ref.entry.metadata) === null || _c === void 0 ? void 0 : _c.dependencies) !== null && _d !== void 0 ? _d : []; _z < _0.length; _z++) {
                var dependency = _0[_z];
                var name_1 = dependencyName(dependency);
                if (!name_1 || name_1 === 'unity default resources' || name_1 === 'unity_builtin_extra')
                    continue;
                var matches = uniqueRefs((_e = serializedIndex.get(name_1)) !== null && _e !== void 0 ? _e : []);
                if (!matches.length) {
                    unresolved.add(name_1);
                    continue;
                }
                if (new Set(matches.map(function (match) { return match.entry.sha256; })).size > 1)
                    dependencyConflicts.add(name_1);
                for (var _1 = 0, matches_1 = matches; _1 < matches_1.length; _1++) {
                    var match = matches_1[_1];
                    if (!closure.has(match.entry.sha256)) {
                        closure.set(match.entry.sha256, match);
                        queue.push(match);
                    }
                }
            }
        }
        var selected = __spreadArray([], closure.values(), true).sort(function (a, b) { return a.entry.path.localeCompare(b.entry.path); });
        var claims = new Map();
        for (var _2 = 0, seeds_1 = seeds; _2 < seeds_1.length; _2++) {
            var ref = seeds_1[_2];
            if (ref.parsed) {
                var key = "".concat(familyClaim(ref), ":").concat((_f = ref.parsed.revision) !== null && _f !== void 0 ? _f : ''), values = (_g = claims.get(key)) !== null && _g !== void 0 ? _g : new Set();
                values.add(ref.entry.sha256);
                claims.set(key, values);
            }
        }
        var unversionedIdentityRefs = unfiltered.filter(function (ref) { return !ref.parsed && metadataIdentities(ref.entry.metadata).has(sourceIdentity); });
        var unversionedIdentityConflict = !unfiltered.some(function (ref) { return ref.parsed; })
            && new Set(unversionedIdentityRefs.map(function (ref) { return ref.entry.sha256; })).size > 1;
        var objectIndex = new Map();
        for (var _3 = 0, selected_1 = selected; _3 < selected_1.length; _3++) {
            var ref = selected_1[_3];
            for (var _4 = 0, _5 = (_j = (_h = ref.entry.metadata) === null || _h === void 0 ? void 0 : _h.objects) !== null && _j !== void 0 ? _j : []; _4 < _5.length; _4++) {
                var object = _5[_4];
                var key = "".concat(normalizedFile((_k = object.file) !== null && _k !== void 0 ? _k : ''), ":").concat(object.pathId);
                objectIndex.set(key, __spreadArray(__spreadArray([], ((_l = objectIndex.get(key)) !== null && _l !== void 0 ? _l : []), true), [object], false));
            }
        }
        var pointerKey = function (pointer) { return pointer
            ? "".concat(normalizedFile(pointer.file), ":").concat(pointer.pathId) : ''; };
        var resolveReference = function (pointer) {
            var _a;
            var matches = (_a = objectIndex.get(pointerKey(pointer))) !== null && _a !== void 0 ? _a : [];
            var references = new Map(matches.flatMap(function (object) { return object.sourceReference ? [[sourceReferenceKey(object.sourceReference), object.sourceReference]] : []; }));
            return references.size === 1 ? __spreadArray([], references.values(), true)[0] : null;
        };
        var objectName = function (pointer) {
            var _a;
            var matches = (_a = objectIndex.get(pointerKey(pointer))) !== null && _a !== void 0 ? _a : [];
            var names = new Set(matches.map(function (object) { return object.name; }).filter(Boolean));
            return names.size === 1 ? __spreadArray([], names, true)[0] : null;
        };
        var textures = new Map();
        var rawShaders = selected.flatMap(function (ref) { var _a, _b; return (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.shaders) !== null && _b !== void 0 ? _b : []; });
        for (var _6 = 0, selected_2 = selected; _6 < selected_2.length; _6++) {
            var ref = selected_2[_6];
            for (var _7 = 0, _8 = (_o = (_m = ref.entry.metadata) === null || _m === void 0 ? void 0 : _m.textures) !== null && _o !== void 0 ? _o : []; _7 < _8.length; _7++) {
                var texture = _8[_7];
                var key = "".concat(normalizedFile(texture.file), ":").concat(texture.pathId);
                textures.set(key, __spreadArray(__spreadArray([], ((_p = textures.get(key)) !== null && _p !== void 0 ? _p : []), true), [texture], false));
            }
        }
        var shaderRecords = new Map(rawShaders.flatMap(function (shader) { return shader.sourceReference
            ? [[sourceReferenceKey(shader.sourceReference), shader]] : []; }));
        var clips = __spreadArray([], new Set(selected.flatMap(function (ref) { var _a, _b; return (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.objects.filter(function (object) { return object.type === 'AnimationClip'; }).map(function (object) { return object.name; })) !== null && _b !== void 0 ? _b : []; })), true).filter(Boolean).sort();
        var ownClips = new Set(clips.filter(function (clip) {
            var identity = canonicalSourceIdentity(clip);
            return identity === sourceIdentity || identity.startsWith("".concat(sourceIdentity, "_"));
        }));
        var assembly = selected.flatMap(function (ref) { var _a, _b; return (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.assembly) !== null && _b !== void 0 ? _b : []; })
            .map(function (item) {
            var _a;
            return (__assign(__assign({}, item), { attachments: normalizeEquipmentAttachments(item.attachments), prefabReference: (_a = item.prefabReference) !== null && _a !== void 0 ? _a : resolveReference(item.prefabTarget), renderers: item.renderers.map(function (renderer) {
                    var _a, _b;
                    return (__assign(__assign({}, renderer), { meshSourceReference: (_a = renderer.meshSourceReference) !== null && _a !== void 0 ? _a : resolveReference(renderer.mesh), materialSlots: (_b = renderer.materialSlots) === null || _b === void 0 ? void 0 : _b.map(function (slot) {
                            var _a;
                            return (__assign(__assign({}, slot), { sourceMaterialReference: (_a = slot.sourceMaterialReference) !== null && _a !== void 0 ? _a : resolveReference(slot.material) }));
                        }) }));
                }) }));
        })
            .filter(function (item) { return item.root; })
            .reduce(mergeAssemblyRecord, []);
        var assemblyRendererReferences = new Map();
        var _loop_4 = function (renderer) {
            if (!renderer.sourceReference)
                return "continue";
            var key = "".concat(normalizedFile(renderer.sourceReference.serializedFile), ":").concat(renderer.sourceReference.objectId);
            var references = (_q = assemblyRendererReferences.get(key)) !== null && _q !== void 0 ? _q : [];
            if (!references.some(function (reference) { return sourceReferenceKey(reference) === sourceReferenceKey(renderer.sourceReference); }))
                references.push(renderer.sourceReference);
            assemblyRendererReferences.set(key, references);
        };
        for (var _9 = 0, _10 = assembly.flatMap(function (item) { return item.renderers; }); _9 < _10.length; _9++) {
            var renderer = _10[_9];
            _loop_4(renderer);
        }
        var events = selected.flatMap(function (ref) { var _a, _b; return (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.events) !== null && _b !== void 0 ? _b : []; })
            .filter(function (event) { return ownClips.has(event.clip); })
            .map(function (event) {
            var _a;
            var targetKey = pointerKey(event.target);
            var references = targetKey ? (_a = assemblyRendererReferences.get(targetKey)) !== null && _a !== void 0 ? _a : [] : [];
            if (references.length === 1)
                return __assign(__assign({}, event), { targetReference: references[0] });
            return event;
        });
        var rendererMaterialReferences = new Set(assembly.flatMap(function (item) { return item.renderers.flatMap(function (renderer) { var _a, _b; return (_b = (_a = renderer.materialSlots) === null || _a === void 0 ? void 0 : _a.flatMap(function (slot) { return slot.sourceMaterialReference ? [sourceReferenceKey(slot.sourceMaterialReference)] : []; })) !== null && _b !== void 0 ? _b : []; }); }));
        // Some older character and partial-revision seed bundles reference their
        // own material declarations from the dependency closure. Keep only the
        // declarations named for this exact source so shared characters cannot
        // leak into facial shader or mouth-atlas selection.
        var materialIdentities = new Set([sourceIdentity, sourceIdentity.replace(/_\d+$/, '')]);
        var materialIndex = new Map();
        var sourceMaterials = [];
        var _loop_5 = function (material) {
            var materialName = canonicalSourceIdentity(material.name);
            var matchesCandidate = __spreadArray([], materialIdentities, true).some(function (identity) { return materialName === identity || materialName.startsWith("".concat(identity, "_")); });
            var materialReference = sourceReferenceKey(material.sourceReference);
            if (!matchesCandidate && !rendererMaterialReferences.has(materialReference))
                return "continue";
            var shaderReference = (_r = material.shaderReference) !== null && _r !== void 0 ? _r : resolveReference(material.shader);
            var shaderRecord = shaderReference ? shaderRecords.get(sourceReferenceKey(shaderReference)) : undefined;
            var shaderName = (_t = (_s = objectName(material.shader)) !== null && _s !== void 0 ? _s : shaderRecord === null || shaderRecord === void 0 ? void 0 : shaderRecord.name) !== null && _t !== void 0 ? _t : null;
            var resolvedTextureProperties = material.textures.map(function (item) {
                var _a, _b;
                if (!item.texture)
                    return item;
                var textureMatches = (_a = textures.get(pointerKey(item.texture))) !== null && _a !== void 0 ? _a : [];
                var uniqueReferences = new Map(textureMatches.flatMap(function (texture) { return texture.sourceReference
                    ? [[sourceReferenceKey(texture.sourceReference), texture.sourceReference]] : []; }));
                var texture = uniqueReferences.size === 1 ? textureMatches.find(function (item) { return item.sourceReference
                    && sourceReferenceKey(item.sourceReference) === __spreadArray([], uniqueReferences.keys(), true)[0]; })
                    : textureMatches.length === 1 ? textureMatches[0] : undefined;
                var textureReference = uniqueReferences.size === 1 ? __spreadArray([], uniqueReferences.values(), true)[0] : null;
                return __assign(__assign({}, item), { textureReference: (_b = item.textureReference) !== null && _b !== void 0 ? _b : textureReference });
            });
            var resolved = __assign(__assign({}, material), { textures: resolvedTextureProperties, shaderReference: shaderReference, shaderName: shaderName, shaderParsedName: (_u = shaderRecord === null || shaderRecord === void 0 ? void 0 : shaderRecord.parsedName) !== null && _u !== void 0 ? _u : null, resolvedTextures: resolvedTextureProperties.flatMap(function (item) {
                    var _a, _b;
                    if (!item.texture)
                        return [];
                    var textureMatches = (_a = textures.get(pointerKey(item.texture))) !== null && _a !== void 0 ? _a : [];
                    var uniqueReferences = new Map(textureMatches.flatMap(function (texture) { return texture.sourceReference
                        ? [[sourceReferenceKey(texture.sourceReference), texture.sourceReference]] : []; }));
                    var texture = uniqueReferences.size === 1 ? textureMatches.find(function (item) { return item.sourceReference
                        && sourceReferenceKey(item.sourceReference) === __spreadArray([], uniqueReferences.keys(), true)[0]; })
                        : textureMatches.length === 1 ? textureMatches[0] : undefined;
                    if (!texture)
                        return [];
                    var textureReference = (_b = item.textureReference) !== null && _b !== void 0 ? _b : (uniqueReferences.size === 1 ? texture.sourceReference : undefined);
                    return [__assign(__assign(__assign({ property: item.name, name: texture.name, width: texture.width, height: texture.height }, (textureReference ? { sourceReference: textureReference } : {})), (item.scale ? { scale: item.scale } : {})), (item.offset ? { offset: item.offset } : {}))];
                }) });
            if (matchesCandidate || rendererMaterialReferences.has(materialReference))
                sourceMaterials.push(resolved);
            if (!matchesCandidate)
                return "continue";
            var expectedShader = /eyemouth/i.test(material.name) ? /MXCharacterEyesMouth/i
                : /eyebrow/i.test(material.name) ? /MXCharacterEyebrow/i
                    : /face/i.test(material.name) ? /MXCharacterFace/i : /MXCharacter/i;
            var quality = expectedShader.test((_v = resolved.shaderName) !== null && _v !== void 0 ? _v : '') ? 2 : /MXCharacter/i.test((_w = resolved.shaderName) !== null && _w !== void 0 ? _w : '') ? 1 : 0;
            if (((_y = (_x = materialIndex.get(material.name)) === null || _x === void 0 ? void 0 : _x.quality) !== null && _y !== void 0 ? _y : -1) < quality)
                materialIndex.set(material.name, { material: resolved, quality: quality });
        };
        for (var _11 = 0, _12 = selected.flatMap(function (ref) { var _a, _b; return (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.materials) !== null && _b !== void 0 ? _b : []; }); _11 < _12.length; _11++) {
            var material = _12[_11];
            _loop_5(material);
        }
        var materialMetadata = __spreadArray([], materialIndex.values(), true).map(function (value) { return value.material; });
        var usedShaderReferences = new Set(sourceMaterials.flatMap(function (material) { return material.shaderReference ? [sourceReferenceKey(material.shaderReference)] : []; }));
        var candidateShaders = rawShaders.filter(function (shader) { return shader.sourceReference && usedShaderReferences.has(sourceReferenceKey(shader.sourceReference)); });
        var fingerprint = (0, node_crypto_1.createHash)('sha256').update(selected.map(function (ref) { return ref.entry.sha256; }).sort().join('\n')).digest('hex');
        var promotedAssembly = assembly.map(function (item) { return promoteExactEquipmentRendererGroups(item, sourceMaterials, candidateShaders); });
        return {
            sourceIdentity: sourceIdentity,
            fingerprint: fingerprint,
            parts: selected.map(function (ref) { return sourcePart(ref); }),
            conflict: unversionedIdentityConflict || dependencyConflicts.size > 0 || __spreadArray([], claims.values(), true).some(function (values) { return values.size > 1; }),
            families: __spreadArray([], new Set(seeds.map(function (ref) { var _a, _b; return (_b = (_a = ref.parsed) === null || _a === void 0 ? void 0 : _a.family) !== null && _b !== void 0 ? _b : 'internal'; })), true).sort(),
            revisions: __spreadArray([], new Set(seeds.flatMap(function (ref) { var _a; return ((_a = ref.parsed) === null || _a === void 0 ? void 0 : _a.revision) ? [ref.parsed.revision] : []; })), true).sort(),
            clips: clips,
            objectNames: __spreadArray([], new Set(selected.flatMap(function (ref) { var _a, _b; return (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.objects.filter(function (object) { return object.type === 'Animator' || object.type === 'AnimatorOverrideController'; }).map(function (object) { return object.name; })) !== null && _b !== void 0 ? _b : []; })), true).filter(Boolean).sort(),
            materials: __spreadArray([], new Set(materialMetadata.map(function (material) { return material.name; })), true).filter(Boolean).sort(),
            dependencies: __spreadArray([], new Set(selected.flatMap(function (ref) { var _a, _b; return (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.dependencies.map(function (dependency) { return typeof dependency === 'string' ? dependency : dependency.path || dependency.name; })) !== null && _b !== void 0 ? _b : []; })), true).filter(Boolean).sort(),
            events: events,
            prefabPaths: __spreadArray([], new Set(selected.flatMap(function (ref) { var _a, _b, _c; return (_c = (_b = (_a = ref.entry.metadata) === null || _a === void 0 ? void 0 : _a.containers) === null || _b === void 0 ? void 0 : _b.map(function (item) { return item.path; }).filter(function (item) { return item.toLowerCase().endsWith('.prefab'); })) !== null && _c !== void 0 ? _c : []; })), true).sort(),
            materialMetadata: materialMetadata,
            sourceMaterials: sourceMaterials,
            shaders: candidateShaders, unresolvedDependencies: __spreadArray([], unresolved, true).sort(),
            assembly: promotedAssembly.sort(function (a, b) { return a.root.localeCompare(b.root); }),
        };
    }).sort(function (a, b) { return a.sourceIdentity.localeCompare(b.sourceIdentity); });
}
function sharedDependencyParts(files) {
    var found = new Map();
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        for (var _a = 0, _b = file.entries; _a < _b.length; _a++) {
            var entry = _b[_a];
            var name_2 = entry.path.toLowerCase();
            if (!entry.sha256 || !name_2.endsWith('.bundle') || (!name_2.includes('_mxcommon') && !name_2.includes('prologdepengroup')))
                continue;
            if (!found.has(entry.sha256))
                found.set(entry.sha256, sourcePart({ file: file, entry: entry, parsed: parseCharacterPart(entry.path) }, 'shared'));
        }
    }
    return __spreadArray([], found.values(), true).sort(function (a, b) { return a.entryPath.localeCompare(b.entryPath); });
}
function run(command, args) {
    return new Promise(function (resolve, reject) {
        var child = (0, node_child_process_1.spawn)(command, args, { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
        child.once('error', reject);
        child.once('exit', function (code) { return code === 0 ? resolve() : reject(new Error("".concat(command, " exited with ").concat(code))); });
    });
}
function scanSourceInventory() {
    return __awaiter(this, arguments, void 0, function (options) {
        var roots, sourceDir, dataDir, indexDir, rawPath, recordedPython, _a, _b, _c, raw, _d, _e, report;
        var _f, _g, _h, _j, _k, _l, _m;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    roots = (0, storage_1.chibiRoots)(), sourceDir = node_path_1.default.resolve((_f = options.sourceDir) !== null && _f !== void 0 ? _f : roots.source), dataDir = node_path_1.default.resolve((_g = options.dataDir) !== null && _g !== void 0 ? _g : roots.data);
                    indexDir = node_path_1.default.join(dataDir, 'index'), rawPath = node_path_1.default.join(indexDir, 'inventory.raw.json');
                    return [4 /*yield*/, (0, promises_1.mkdir)(indexDir, { recursive: true })];
                case 1:
                    _o.sent();
                    _o.label = 2;
                case 2:
                    _o.trys.push([2, 4, , 5]);
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, (0, promises_1.readFile)(node_path_1.default.join(roots.tools, 'install.json'), 'utf8')];
                case 3:
                    recordedPython = (_j = (_h = _b.apply(_a, [_o.sent()])) === null || _h === void 0 ? void 0 : _h.unityPy) === null || _j === void 0 ? void 0 : _j.python;
                    return [3 /*break*/, 5];
                case 4:
                    _c = _o.sent();
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, run((_m = (_l = (_k = options.python) !== null && _k !== void 0 ? _k : process.env.CHIBI_PYTHON) !== null && _l !== void 0 ? _l : recordedPython) !== null && _m !== void 0 ? _m : (process.platform === 'win32' ? 'python' : 'python3.12'), [node_path_1.default.resolve('scripts/chibi/inventory.py'), sourceDir, rawPath])];
                case 6:
                    _o.sent();
                    _e = (_d = JSON).parse;
                    return [4 /*yield*/, (0, promises_1.readFile)(rawPath, 'utf8')];
                case 7:
                    raw = _e.apply(_d, [_o.sent()]);
                    report = __assign(__assign({}, raw), { candidates: candidatesFromFiles(raw.files), errors: raw.files.flatMap(function (file) { return __spreadArray(__spreadArray([], (file.error ? [{ path: file.path, error: file.error }] : []), true), file.entries.flatMap(function (entry) { return entry.error ? [{ path: "".concat(file.path, ":").concat(entry.path), error: entry.error }] : []; }), true); }) });
                    return [4 /*yield*/, (0, promises_1.writeFile)(node_path_1.default.join(indexDir, 'inventory.json'), JSON.stringify(inventoryDiagnosticSummary(report), null, 2))];
                case 8:
                    _o.sent();
                    return [2 /*return*/, report];
            }
        });
    });
}
