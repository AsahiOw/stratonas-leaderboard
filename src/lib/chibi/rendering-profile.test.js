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
var strict_1 = require("node:assert/strict");
var node_test_1 = require("node:test");
var types_1 = require("./types");
var inventory_1 = require("./inventory");
var rendering_profile_1 = require("./rendering-profile");
var hash = function (char) { return char.repeat(64); };
function reference(bundleSha256, serializedFile, objectId) {
    return { bundleSha256: bundleSha256, serializedFile: serializedFile, objectId: objectId };
}
function referenceKeyForTest(sourceReference) {
    return sourceReference
        ? "".concat(sourceReference.bundleSha256.toLowerCase(), ":").concat(sourceReference.serializedFile.toLowerCase(), ":").concat(sourceReference.objectId)
        : '';
}
function makeCandidate(identity, slotNames, options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var safeName = identity.split('_').map(function (part) { return part[0].toUpperCase() + part.slice(1); }).join('_');
    var root = "Cafe_".concat(safeName);
    var prefabPath = "Assets/_MX/AddressableAsset/Character/".concat(safeName, "/Cafe/").concat(root, ".prefab");
    var rendererReference = reference(hash('a'), 'CAB-prefab', '9007199254740993');
    var prefabReference = reference(hash('a'), 'CAB-prefab', '9007199254740994');
    var meshReference = reference(hash('b'), 'CAB-mesh', '9007199254740995');
    var sourceMaterials = [];
    var shaders = [];
    var slots = slotNames.map(function (name, slot) {
        var materialReference = reference(hash('c'), 'CAB-materials', String(100 + slot));
        var shaderFamily = /eyemouth/i.test(name) ? 'EyesMouth'
            : /eyebrow/i.test(name) ? 'Eyebrow'
                : /hair/i.test(name) ? 'Hair'
                    : /weapon/i.test(name) ? 'Weapon'
                        : /face/i.test(name) ? 'Face' : 'General';
        var shaderReference = reference(hash('d'), 'CAB-shaders', String(200 + slot));
        var shaderName = shaderFamily === 'Eyebrow' && identity === 'haruna_original' ? 'MX/C-Eyebrow-OneColor'
            : shaderFamily === 'General' ? 'MX/C-General/Layer4' : "MX/C-".concat(shaderFamily);
        var shader = {
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
        };
        shaders.push(shader);
        var hasMouthAtlas = /eyemouth/i.test(name);
        var textureReference = hasMouthAtlas ? reference(hash('f'), 'CAB-textures', '300') : undefined;
        var material = {
            name: name,
            pathId: String(100 + slot),
            file: 'CAB-materials',
            sourceReference: materialReference,
            shader: { file: 'CAB-shaders', pathId: String(200 + slot) },
            shaderReference: shaderReference,
            shaderName: '',
            shaderParsedName: shaderName,
            renderQueue: /eyemouth/i.test(name) ? 2001 : 2000,
            keywords: [],
            textures: hasMouthAtlas ? [{
                    name: '_MouthTileTex', texture: { file: 'CAB-textures', pathId: '300' },
                    textureReference: textureReference,
                    scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 },
                }] : [],
            floatProperties: __assign(__assign({}, (hasMouthAtlas ? { _MouthTileCols: 8, _MouthTileRows: 8 } : {})), (shaderFamily === 'Eyebrow' ? { _ZCorrection: identity === 'haruna_original' ? 0.036 : 0.023 } : {})),
            intProperties: {},
            colorProperties: {},
            resolvedTextures: hasMouthAtlas ? [{
                    property: '_MouthTileTex', name: 'MouthAtlas', width: 1024, height: 1024, sourceReference: textureReference,
                    scale: { x: 0.5, y: 0.5 }, offset: { x: 0.5, y: 0.875 },
                }] : [],
        };
        sourceMaterials.push(material);
        return {
            slot: slot,
            material: { file: 'CAB-materials', pathId: String(100 + slot) },
            sourceMaterialReference: slot === options.missingSlotReference ? null : materialReference,
        };
    });
    var rendererPath = "".concat(root, "/").concat(safeName, "_Body");
    var assembly = {
        root: root,
        prefabPath: prefabPath,
        prefabTarget: { file: 'CAB-prefab', pathId: '9007199254740994' },
        prefabReference: prefabReference,
        rendererOrder: ["".concat(safeName, "_Body")],
        renderers: [{
                name: "".concat(safeName, "_Body"),
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
            mouthRenderer: [{ file: rendererReference.serializedFile, pathId: rendererReference.objectId, name: "".concat(safeName, "_Body"), sourceReference: rendererReference }],
            mouthMaterialIndex: options.mouthSlot,
            mouthDefaultUV: options.defaultUV,
        },
    };
    var candidate = {
        sourceIdentity: identity,
        fingerprint: hash('9'),
        conflict: (_a = options.conflict) !== null && _a !== void 0 ? _a : false,
        parts: [], families: [], revisions: [], clips: [
            "".concat(safeName, "_Cafe_Idle"),
            "".concat(safeName, "_Cafe_Walk"),
            "".concat(safeName, "_Cafe_Interaction")
        ],
        objectNames: [], materials: slotNames, dependencies: [], events: (_b = options.events) !== null && _b !== void 0 ? _b : [],
        prefabPaths: [prefabPath],
        sourceMaterials: sourceMaterials,
        shaders: shaders,
        assembly: [assembly],
    };
    return { candidate: candidate, prefabPath: prefabPath };
}
function makeSenaCoreGeometryFixture(identity) {
    if (identity === void 0) { identity = 'unrelated-source-identity'; }
    var fixture = makeCandidate(identity, ['CH0081_Body']);
    var prefabPath = 'Assets/_MX/AddressableAsset/Character/CH0081/Cafe/Cafe_CH0081.prefab';
    var assembly = fixture.candidate.assembly[0];
    var renderer = assembly.renderers[0];
    var prefabReference = reference('dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d', 'CAB-241dbfc78955d74e6aa6ee05bb096ecf', '-8585771901269975806');
    var rendererReference = reference('dcc7c60d454f92e22b6ec3ad368c1cd8c8e09cc6d191b33f6e883adb57a0923d', 'CAB-241dbfc78955d74e6aa6ee05bb096ecf', '-6903816935868408574');
    var meshReference = reference('12145f231b3c8b093c728296b771f4ae89a1fdd9e98f3afc915668fcd77591c5', 'CAB-74b254d25a0b77afb604cb26c86ff7a2', '8052939068824350260');
    assembly.root = 'Cafe_CH0081';
    assembly.prefabPath = prefabPath;
    assembly.prefabReference = prefabReference;
    assembly.prefabTarget = { file: prefabReference.serializedFile, pathId: prefabReference.objectId };
    assembly.rendererOrder = ['CH0081_Body'];
    renderer.name = 'CH0081_Body';
    renderer.pathId = rendererReference.objectId;
    renderer.sourceReference = rendererReference;
    renderer.hierarchyPath = 'Cafe_CH0081/CH0081_Body';
    renderer.rendererType = 'SkinnedMeshRenderer';
    renderer.mesh = { file: meshReference.serializedFile, pathId: meshReference.objectId };
    renderer.meshSourceReference = meshReference;
    fixture.candidate.prefabPaths = [prefabPath];
    return __assign(__assign({}, fixture), { prefabPath: prefabPath });
}
function addPolicyRenderer(fixture, options) {
    var _a, _b, _c, _d, _e;
    var assembly = fixture.candidate.assembly[0];
    var baseRenderer = assembly.renderers[0];
    var sourceReference = (_a = options.sourceReference) !== null && _a !== void 0 ? _a : reference(hash('g'), 'CAB-policy-prefab', String(600000 + assembly.renderers.length));
    var materialReference = reference(hash('h'), 'CAB-policy-materials', String(700 + assembly.renderers.length));
    var shaderReference = reference(hash('i'), 'CAB-policy-shaders', String(800 + assembly.renderers.length));
    var sourceMaterial = structuredClone(fixture.candidate.sourceMaterials[0]);
    sourceMaterial.name = (_b = options.materialName) !== null && _b !== void 0 ? _b : 'FX_MAT_Presentation';
    sourceMaterial.sourceReference = materialReference;
    sourceMaterial.pathId = materialReference.objectId;
    sourceMaterial.file = materialReference.serializedFile;
    sourceMaterial.shaderReference = shaderReference;
    sourceMaterial.shader = { file: shaderReference.serializedFile, pathId: shaderReference.objectId };
    sourceMaterial.shaderName = (_c = options.shaderName) !== null && _c !== void 0 ? _c : 'DSFX/FX_SHADER_Unsupported';
    sourceMaterial.shaderParsedName = sourceMaterial.shaderName;
    var sourceShader = structuredClone(fixture.candidate.shaders[0]);
    sourceShader.name = sourceMaterial.shaderName;
    sourceShader.parsedName = sourceMaterial.shaderName;
    sourceShader.pathId = shaderReference.objectId;
    sourceShader.file = shaderReference.serializedFile;
    sourceShader.sourceReference = shaderReference;
    sourceShader.programBlobSha256 = null;
    fixture.candidate.sourceMaterials.push(sourceMaterial);
    fixture.candidate.shaders.push(sourceShader);
    var renderer = __assign(__assign({}, structuredClone(baseRenderer)), { name: options.name, pathId: sourceReference.objectId, sourceReference: sourceReference, rendererType: (_d = options.rendererType) !== null && _d !== void 0 ? _d : 'MeshRenderer', hierarchyPath: options.hierarchyPath, mesh: (_e = options.mesh) !== null && _e !== void 0 ? _e : { file: 'CAB-policy-meshes', pathId: String(600 + assembly.renderers.length) }, meshSourceReference: options.mesh ? null : reference(hash('j'), 'CAB-policy-meshes', String(600 + assembly.renderers.length)), materialSlots: [{
                slot: 0,
                material: { file: materialReference.serializedFile, pathId: materialReference.objectId },
                sourceMaterialReference: materialReference,
            }] });
    assembly.renderers.push(renderer);
    assembly.rendererOrder.push(renderer.name);
    if (options.equipmentReference) {
        var attachments = assembly.attachments;
        attachments.equipmentRendererReferences = [sourceReference];
    }
    return { renderer: renderer, sourceReference: sourceReference };
}
var SAORI_CAB = '7ba7cca28f2476e9eb45e94fd2a1650a3283dad032cbb0b7935c4378a386ba8b';
var SAORI_CAB_FILE = 'CAB-cabd5b23b8e28f49693a21ea244a9291';
var SAORI_PREFAB = reference(SAORI_CAB, SAORI_CAB_FILE, '762141233893454283');
var SAORI_MESH_BUNDLE = '8dd6133bfa2e20b4367b71c7fcc724265bc9b24d0acb213a47e0759d7e6c040f';
var SAORI_MESH_FILE = 'CAB-9e80f5ab3212d8f6775176559faf5d5f';
var SAORI_MATERIAL = reference('785a3600756e5ede27609c590136bf727dae7a14727e2a2ccdbcf682860e7bf3', 'CAB-44ff3e38183570343e0de2bef251bb93', '-3549401849822603767');
var SAORI_SHADER = reference('08cda8ace88f2f2944784611da1c0860f810818ebf0066d4a75dda3e39c1670c', 'CAB-428091522b4007f213bf16532c4528a1', '-301851123381183171');
var SAORI_ACTIONS = {
    idle: 'Saori_Original_Cafe_Idle',
    walk: 'Saori_Original_Cafe_Walk',
    pickup: 'Saori_Original_Formation_Pickup',
    touch: 'Saori_Original_Cafe_Reaction',
};
var SAORI_SWIM_CAB = '325bc4b3f67c1fe59260ca66cb5068d109c193dc4a662e77c8c2084f56063ffd';
var SAORI_SWIM_CAB_FILE = 'CAB-e9f5532a8838fb49b9656938014567f9';
var SAORI_SWIM_PREFAB = reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-966698776056933583');
var SAORI_SWIM_MESH_BUNDLE = 'b493920b164a41237b76ab169664d48fe555d6d643a2ce02ffcfe708a77967f1';
var SAORI_SWIM_MESH_FILE = 'CAB-fb6b24084a8dc8864efbed7e547be16d';
var SAORI_SWIM_MATERIAL_BUNDLE = '17fca11c00f7e6869df3fe4ffbd2ffa0185513ee45607a2a1e32978ac916a742';
var SAORI_SWIM_MATERIAL_FILE = 'CAB-fbd047797f16a6e5ae0e213d5ef5d0f1';
var SAORI_SWIM_WEAPON_MATERIAL = reference(SAORI_SWIM_MATERIAL_BUNDLE, SAORI_SWIM_MATERIAL_FILE, '-2288669407096532286');
var SAORI_SWIM_CANNON_MATERIAL = reference(SAORI_SWIM_MATERIAL_BUNDLE, SAORI_SWIM_MATERIAL_FILE, '4428875022469246219');
var SAORI_SWIM_SHADER = SAORI_SHADER;
var SAORI_SWIM_ACTIONS = {
    idle: 'CH0266_Cafe_Idle',
    walk: 'CH0266_Cafe_Walk',
    pickup: 'CH0266_Formation_Pickup',
    touch: 'CH0266_Cafe_Reaction',
};
var PINNED_RIG_MOUNT_TEST_SOURCES = [
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
                bones: [['3815402648570287977', 'Bip001_Weapon'], ['-8757116650605914263', 'bone_magazine'], ['-239699426375248023', 'bone_rope'], ['-2583516880457181335', 'bone_rocket01']],
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
                bones: [['-1560163874218870017', 'Bip001_Weapon'], ['-1469757343611847937', 'weapon1_cos2'], ['-8600449184193217793', 'weapon1_cos1']],
            },
            {
                id: '-269010879909496065', name: 'EX', mesh: '-3964046477843091', material: '-5451212227849618331',
                transform: [['5177313602180381439', 'Cafe_Mari_Original'], ['7214943900458711807', 'EX']],
                root: ['2930884764252928767', 'Bone_weapon2'],
                ancestry: [['5177313602180381439', 'Cafe_Mari_Original'], ['-8583119856686564609', 'bone_root'], ['-3529868761828459777', 'Bip001'], ['-1560163874218870017', 'Bip001_Weapon']],
                bones: [['2930884764252928767', 'Bone_weapon2'], ['-7258084021585151233', 'weapon2_cos1'], ['-3384407438069957889', 'weapon2_cos2']],
            },
        ],
    },
];
function makeSourcePinnedRigMountFixture(source) {
    var fixture = makeCandidate(source.identity, ['Policy_Body']);
    var candidate = fixture.candidate;
    var assembly = candidate.assembly[0];
    var prefabReference = reference(source.prefab.bundle, source.prefab.file, source.prefab.id);
    var pointer = function (id, name) { return ({
        file: source.prefab.file,
        pathId: id,
        name: name,
        sourceReference: reference(source.prefab.bundle, source.prefab.file, id),
    }); };
    candidate.fingerprint = source.fingerprint;
    candidate.prefabPaths = [source.prefabPath];
    candidate.clips = Object.values(source.actions);
    candidate.parts = __spreadArray([
        { archivePath: 'source.zip', archiveSha256: hash('1'), entryPath: source.prefabEntry.path, entrySize: 1, entryCrc32: '00000000', sha256: source.prefabEntry.sha256, family: 'prefab', revision: null, sourceKind: 'bundle' }
    ], source.animationEntries.map(function (entry) { return ({ archivePath: 'source.zip', archiveSha256: hash('1'), entryPath: entry.path, entrySize: 1, entryCrc32: '00000000', sha256: entry.sha256, family: 'animation', revision: null, sourceKind: 'bundle' }); }), true);
    assembly.root = source.root;
    assembly.prefabPath = source.prefabPath;
    assembly.prefabReference = prefabReference;
    assembly.prefabTarget = { file: source.prefab.file, pathId: source.prefab.id };
    assembly.attachments = {};
    var baseRenderer = assembly.renderers[0];
    baseRenderer.hierarchyPath = "".concat(source.root, "/Policy_Body");
    baseRenderer.sourceReference = reference(source.prefab.bundle, source.prefab.file, '9000001');
    baseRenderer.pathId = baseRenderer.sourceReference.objectId;
    var pinnedShader = SAORI_SHADER;
    var memberRenderers = source.members.map(function (member) {
        var added = addPolicyRenderer(fixture, {
            name: member.name,
            hierarchyPath: "".concat(source.root, "/").concat(member.name),
            materialName: "".concat(member.name, "_Material"),
            shaderName: 'MX/C-Weapon',
            rendererType: 'SkinnedMeshRenderer',
            sourceReference: reference(source.prefab.bundle, source.prefab.file, member.id),
        });
        var renderer = added.renderer;
        var materialReference = reference(source.material.bundle, source.material.file, member.material);
        var material = candidate.sourceMaterials.find(function (item) { var _a, _b; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === ((_b = renderer.materialSlots[0].sourceMaterialReference) === null || _b === void 0 ? void 0 : _b.objectId); });
        var shader = candidate.shaders.find(function (item) { var _a, _b; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === ((_b = material.shaderReference) === null || _b === void 0 ? void 0 : _b.objectId); });
        material.name = "".concat(member.name, "_Material");
        material.pathId = materialReference.objectId;
        material.file = materialReference.serializedFile;
        material.sourceReference = materialReference;
        material.shader = { file: pinnedShader.serializedFile, pathId: pinnedShader.objectId };
        material.shaderReference = pinnedShader;
        material.shaderName = 'MX/C-Weapon';
        material.shaderParsedName = 'MX/C-Weapon';
        material.textures = [{
                name: '_MainTex', texture: { file: 'CAB-pinned-textures', pathId: '990001' },
                textureReference: reference(hash('t'), 'CAB-pinned-textures', '990001'),
            }];
        renderer.materialSlots[0].material = { file: materialReference.serializedFile, pathId: materialReference.objectId };
        renderer.materialSlots[0].sourceMaterialReference = materialReference;
        renderer.pathId = member.id;
        renderer.sourceReference = reference(source.prefab.bundle, source.prefab.file, member.id);
        renderer.enabled = true;
        renderer.gameObjectActive = true;
        renderer.visible = true;
        renderer.meshSourceReference = reference(source.mesh.bundle, source.mesh.file, member.mesh);
        renderer.mesh = { file: source.mesh.file, pathId: member.mesh };
        var toPointers = function (values) { return values.map(function (_a) {
            var id = _a[0], name = _a[1];
            return pointer(id, name);
        }); };
        renderer.rootBone = pointer.apply(void 0, member.root);
        renderer.transformChain = toPointers(member.transform);
        renderer.boneReferences = toPointers(member.bones);
        renderer.rootBoneAncestry = toPointers(member.ancestry);
        renderer.rootBoneAncestryComplete = true;
        shader.name = 'MX/C-Weapon';
        shader.parsedName = 'MX/C-Weapon';
        shader.pathId = pinnedShader.objectId;
        shader.file = pinnedShader.serializedFile;
        shader.sourceReference = pinnedShader;
        return renderer;
    });
    var uniqueByReference = function (items) {
        var key = function (sourceReference) { return sourceReference
            ? "".concat(sourceReference.bundleSha256.toLowerCase(), ":").concat(sourceReference.serializedFile.toLowerCase(), ":").concat(sourceReference.objectId)
            : ''; };
        return items.filter(function (item, index, all) { return all.findIndex(function (other) { return key(other.sourceReference) === key(item.sourceReference); }) === index; });
    };
    candidate.sourceMaterials = uniqueByReference(candidate.sourceMaterials);
    candidate.shaders = uniqueByReference(candidate.shaders);
    assembly.rendererOrder = assembly.renderers.map(function (renderer) { return renderer.name; });
    return { candidate: candidate, prefabPath: source.prefabPath, assembly: assembly, memberRenderers: memberRenderers, source: source };
}
function sourcePinnedRigMountInteraction(source) {
    var profile = (0, types_1.emptyChibiProfile)(source.identity);
    profile.initialPose = source.actions.idle;
    profile.interactions.idle = { state: 'available', clip: source.actions.idle, loop: true };
    profile.interactions.walk = { state: 'available', clip: source.actions.walk, loop: true };
    profile.interactions.pickup = { state: 'available', clip: source.actions.pickup, hold: true };
    profile.interactions.touch = { state: 'available', clip: source.actions.touch };
    return profile;
}
function makeSaoriHandgunFixture() {
    var fixture = makeCandidate('saori_original', ['Policy_Body']);
    var candidate = fixture.candidate, prefabPath = fixture.prefabPath;
    var assembly = candidate.assembly[0];
    candidate.fingerprint = 'e574e7726600205d3fdefca7d0a1571308a59dd7d835acbd7a8a65c7ffa7af18';
    candidate.clips = Object.values(SAORI_ACTIONS);
    assembly.root = 'Cafe_Saori_Original';
    assembly.prefabPath = prefabPath;
    assembly.prefabReference = SAORI_PREFAB;
    assembly.prefabTarget = { file: SAORI_CAB_FILE, pathId: SAORI_PREFAB.objectId };
    var sourcePointer = function (objectId, name) { return ({
        file: SAORI_CAB_FILE,
        pathId: objectId,
        name: name,
        sourceReference: reference(SAORI_CAB, SAORI_CAB_FILE, objectId),
    }); };
    var cafeRoot = sourcePointer('4595875760711446987', 'Cafe_Saori_Original');
    var boneRoot = sourcePointer('1676013754709553611', 'bone_root');
    var bip001 = sourcePointer('5407838024976937419', 'Bip001');
    var ancestry = [cafeRoot, boneRoot, bip001];
    var setExactWeaponMaterial = function (renderer, name) {
        var _a;
        var previousMaterialReference = (_a = renderer.materialSlots[0]) === null || _a === void 0 ? void 0 : _a.sourceMaterialReference;
        var material = candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === (previousMaterialReference === null || previousMaterialReference === void 0 ? void 0 : previousMaterialReference.objectId); });
        var previousShaderReference = material.shaderReference;
        var shader = candidate.shaders.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === (previousShaderReference === null || previousShaderReference === void 0 ? void 0 : previousShaderReference.objectId); });
        material.name = name;
        material.sourceReference = SAORI_MATERIAL;
        material.file = SAORI_MATERIAL.serializedFile;
        material.pathId = SAORI_MATERIAL.objectId;
        material.shaderReference = SAORI_SHADER;
        material.shader = { file: SAORI_SHADER.serializedFile, pathId: SAORI_SHADER.objectId };
        material.shaderName = 'MX/C-Weapon';
        material.shaderParsedName = 'MX/C-Weapon';
        shader.name = 'MX/C-Weapon';
        shader.parsedName = 'MX/C-Weapon';
        shader.file = SAORI_SHADER.serializedFile;
        shader.pathId = SAORI_SHADER.objectId;
        shader.sourceReference = SAORI_SHADER;
        renderer.materialSlots[0].material = { file: SAORI_MATERIAL.serializedFile, pathId: SAORI_MATERIAL.objectId };
        renderer.materialSlots[0].sourceMaterialReference = SAORI_MATERIAL;
    };
    var primary = addPolicyRenderer(fixture, {
        name: 'Saori_Original_Weapon',
        hierarchyPath: 'Cafe_Saori_Original/Saori_Original_Weapon',
        materialName: 'Saori_Original_Weapon_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(SAORI_CAB, SAORI_CAB_FILE, '7518749120114766283'),
    });
    setExactWeaponMaterial(primary.renderer, 'Saori_Original_Weapon_Material');
    primary.renderer.enabled = true;
    primary.renderer.gameObjectActive = true;
    primary.renderer.visible = true;
    primary.renderer.meshSourceReference = reference(SAORI_MESH_BUNDLE, SAORI_MESH_FILE, '-3011508986878861753');
    primary.renderer.mesh = { file: SAORI_MESH_FILE, pathId: '-3011508986878861753' };
    primary.renderer.rootBone = sourcePointer('2914297892506939851', 'Bip001_Weapon');
    primary.renderer.transformChain = [cafeRoot, sourcePointer('4050732926595609035', 'Saori_Original_Weapon')];
    primary.renderer.boneReferences = [
        primary.renderer.rootBone,
        sourcePointer('-7141742032385691189', 'bone_magazine'),
        sourcePointer('-6946566419896684085', 'bone_buttstock'),
    ];
    primary.renderer.rootBoneAncestry = ancestry;
    primary.renderer.rootBoneAncestryComplete = true;
    var handgun = addPolicyRenderer(fixture, {
        name: 'Saori_Original_Handgun',
        hierarchyPath: 'Cafe_Saori_Original/Saori_Original_Handgun',
        materialName: 'Saori_Original_Handgun_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(SAORI_CAB, SAORI_CAB_FILE, '6419381600630976971'),
    });
    setExactWeaponMaterial(handgun.renderer, 'Saori_Original_Handgun_Material');
    handgun.renderer.enabled = true;
    handgun.renderer.gameObjectActive = true;
    handgun.renderer.visible = true;
    handgun.renderer.meshSourceReference = reference(SAORI_MESH_BUNDLE, SAORI_MESH_FILE, '-5266263958877296907');
    handgun.renderer.mesh = { file: SAORI_MESH_FILE, pathId: '-5266263958877296907' };
    handgun.renderer.rootBone = sourcePointer('-4468891664348106293', 'bone_Weapon');
    handgun.renderer.transformChain = [cafeRoot, sourcePointer('4359557592397165003', 'Saori_Original_Handgun')];
    handgun.renderer.boneReferences = [
        handgun.renderer.rootBone,
        sourcePointer('-1446589435792870965', 'bone_magazine_02'),
    ];
    handgun.renderer.rootBoneAncestry = ancestry;
    handgun.renderer.rootBoneAncestryComplete = true;
    return __assign(__assign({}, fixture), { primary: primary, handgun: handgun });
}
function makeSaoriSwimsuitFixture() {
    var fixture = makeCandidate('ch0266', ['Policy_Body']);
    var candidate = fixture.candidate, prefabPath = fixture.prefabPath;
    var assembly = candidate.assembly[0];
    var exactPrefabPath = 'Assets/_MX/AddressableAsset/Character/CH0266/Cafe/Cafe_CH0266.prefab';
    var originalBodyMaterial = candidate.sourceMaterials[0];
    var originalBodyShader = candidate.shaders[0];
    candidate.fingerprint = 'c2dda9fce74ba470a510e0cdab930844eff876ad62150254bcf3cefdfb495db9';
    candidate.prefabPaths = [exactPrefabPath];
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
    ];
    candidate.clips = Object.values(SAORI_SWIM_ACTIONS);
    assembly.root = 'Cafe_CH0266';
    assembly.prefabPath = exactPrefabPath;
    assembly.prefabReference = SAORI_SWIM_PREFAB;
    assembly.prefabTarget = { file: SAORI_SWIM_CAB_FILE, pathId: SAORI_SWIM_PREFAB.objectId };
    var sourcePointer = function (objectId, name) { return ({
        file: SAORI_SWIM_CAB_FILE, pathId: objectId,
        name: name,
    }); };
    var cafeRoot = sourcePointer('-4935885727765736655', 'Cafe_CH0266');
    var boneRoot = sourcePointer('-3331984808089726159', 'bone_root');
    var bip001 = sourcePointer('-2444008407112264911', 'Bip001');
    var ancestry = [cafeRoot, boneRoot, bip001];
    var setExactMaterial = function (renderer, expected, name) {
        var slot = renderer.materialSlots[0];
        var oldMaterial = candidate.sourceMaterials.find(function (item) { var _a, _b; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === ((_b = slot.sourceMaterialReference) === null || _b === void 0 ? void 0 : _b.objectId); });
        var oldShader = candidate.shaders.find(function (item) { var _a, _b; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === ((_b = oldMaterial.shaderReference) === null || _b === void 0 ? void 0 : _b.objectId); });
        oldMaterial.name = name;
        oldMaterial.sourceReference = expected;
        oldMaterial.pathId = expected.objectId;
        oldMaterial.file = expected.serializedFile;
        oldMaterial.shaderReference = SAORI_SWIM_SHADER;
        oldMaterial.shader = { file: SAORI_SWIM_SHADER.serializedFile, pathId: SAORI_SWIM_SHADER.objectId };
        oldMaterial.shaderName = '';
        oldMaterial.shaderParsedName = 'MX/C-Weapon';
        oldShader.name = '';
        oldShader.parsedName = 'MX/C-Weapon';
        oldShader.sourceReference = SAORI_SWIM_SHADER;
        oldShader.pathId = SAORI_SWIM_SHADER.objectId;
        oldShader.file = SAORI_SWIM_SHADER.serializedFile;
        slot.material = { file: expected.serializedFile, pathId: expected.objectId };
        slot.sourceMaterialReference = expected;
    };
    var addRenderer = function (config) {
        var added = addPolicyRenderer(fixture, {
            name: config.name,
            hierarchyPath: "Cafe_CH0266/".concat(config.name),
            materialName: config.materialName,
            shaderName: 'MX/C-Weapon',
            rendererType: 'SkinnedMeshRenderer',
            sourceReference: reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, config.objectId),
        });
        setExactMaterial(added.renderer, config.material, config.materialName);
        added.renderer.enabled = true;
        added.renderer.gameObjectActive = true;
        added.renderer.visible = true;
        added.renderer.meshSourceReference = reference(SAORI_SWIM_MESH_BUNDLE, SAORI_SWIM_MESH_FILE, config.meshId);
        added.renderer.mesh = { file: SAORI_SWIM_MESH_FILE, pathId: config.meshId };
        added.renderer.rootBone = sourcePointer(config.rootBone.id, config.rootBone.name);
        added.renderer.transformChain = [cafeRoot, sourcePointer(config.objectIdForTransform, config.name)];
        added.renderer.boneReferences = config.bones.map(function (bone) { return sourcePointer(bone.id, bone.name); });
        added.renderer.rootBoneAncestry = config.ancestry;
        added.renderer.rootBoneAncestryComplete = true;
        return added;
    };
    var primary = addRenderer({
        name: 'Saori_Original_Weapon', objectId: '-7932837843349318863', meshId: '3018830693475326235',
        material: SAORI_SWIM_WEAPON_MATERIAL, materialName: 'CH0266_Weapon',
        objectIdForTransform: '8608833642075542321', rootBone: { id: '5129663882940535601', name: 'Bip001_Weapon' },
        ancestry: ancestry,
        bones: [
            { id: '5129663882940535601', name: 'Bip001_Weapon' },
            { id: '-4925961543699705039', name: 'bone_magazine' },
            { id: '-4529970774892129487', name: 'bone_buttstock' },
            { id: '-2098089945093549263', name: 'bone_magazine_01' },
        ],
    });
    var handgun = addRenderer({
        name: 'Saori_Original_Handgun', objectId: '-4763531541672078543', meshId: '-7008905148608425358',
        material: SAORI_SWIM_WEAPON_MATERIAL, materialName: 'CH0266_Weapon',
        objectIdForTransform: '5832696454154441521', rootBone: { id: '5850243916819223345', name: 'bone_Weapon' },
        ancestry: ancestry,
        bones: [
            { id: '5850243916819223345', name: 'bone_Weapon' },
            { id: '7297958013507949361', name: 'bone_magazine_02' },
            { id: '2629695361642615601', name: 'bone_magazine_03' },
        ],
    });
    var waterCannon = addRenderer({
        name: 'CH0266_WaterCannon_Outline', objectId: '-1127309643643137231', meshId: '-4114086136464228496',
        material: SAORI_SWIM_CANNON_MATERIAL, materialName: 'CH0266_WaterCannon',
        objectIdForTransform: '-1686778725144767695', rootBone: { id: '-8012569600188132559', name: 'bone_Watercannon' },
        ancestry: [cafeRoot, boneRoot],
        bones: [{ id: '-8012569600188132559', name: 'bone_Watercannon' }],
    });
    // The fixture reflects the one exact weapon material and shared weapon
    // shader observed in the source bundles; deduplicate their serialized refs.
    var sourceReferenceKey = function (item) { return item
        ? "".concat(item.bundleSha256.toLowerCase(), ":").concat(item.serializedFile.toLowerCase(), ":").concat(item.objectId) : ''; };
    candidate.sourceMaterials = __spreadArray([originalBodyMaterial], candidate.sourceMaterials.slice(1), true).filter(function (item, index, all) { return all.findIndex(function (other) { return sourceReferenceKey(other.sourceReference) === sourceReferenceKey(item.sourceReference); }) === index; });
    candidate.shaders = __spreadArray([originalBodyShader], candidate.shaders.slice(1), true).filter(function (item, index, all) { return all.findIndex(function (other) { return sourceReferenceKey(other.sourceReference) === sourceReferenceKey(item.sourceReference); }) === index; });
    assembly.attachments = {
        mainWeapon: [sourcePointer('5129663882940535601', 'Bip001_Weapon')],
        equipmentRendererReferences: [reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-7932837843349318863')],
    };
    return __assign(__assign({}, fixture), { primary: primary, handgun: handgun, waterCannon: waterCannon, prefabPath: exactPrefabPath });
}
function makeExactAnimatedPropFixture(identity, propName, materialName, boneName, parentBoneNames) {
    if (parentBoneNames === void 0) { parentBoneNames = []; }
    var fixture = makeCandidate(identity, ['Policy_Body']);
    var assembly = fixture.candidate.assembly[0];
    var prefabReference = assembly.prefabReference;
    var pointer = function (objectId, name) { return ({
        file: 'CAB-prefab', pathId: objectId,
        name: name,
        sourceReference: reference(hash('a'), 'CAB-prefab', objectId),
    }); };
    var rootPointer = {
        file: prefabReference.serializedFile, pathId: prefabReference.objectId, name: assembly.root,
        sourceReference: prefabReference,
    };
    var primary = addPolicyRenderer(fixture, {
        name: "".concat(identity, "_Weapon"), hierarchyPath: "".concat(assembly.root, "/").concat(identity, "_Weapon"),
        materialName: "".concat(identity, "_Weapon_Material"), shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', "".concat(identity, "-main-renderer")), equipmentReference: true,
    });
    var mainBone = pointer("".concat(identity, "-main-bone"), 'Bip001_Weapon');
    primary.renderer.rootBone = mainBone;
    primary.renderer.boneReferences = [mainBone];
    primary.renderer.rootBoneAncestry = [rootPointer];
    primary.renderer.rootBoneAncestryComplete = true;
    primary.renderer.transformChain = [rootPointer, pointer("".concat(identity, "-main-transform"), primary.renderer.name)];
    var prop = addPolicyRenderer(fixture, {
        name: propName, hierarchyPath: "".concat(assembly.root, "/").concat(propName),
        materialName: materialName,
        shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', "".concat(identity, "-prop-renderer")),
    });
    var propBone = pointer("".concat(identity, "-prop-bone"), boneName);
    prop.renderer.rootBone = propBone;
    prop.renderer.boneReferences = [propBone];
    prop.renderer.rootBoneAncestry = __spreadArray([rootPointer], parentBoneNames.map(function (name, index) { return pointer("".concat(identity, "-parent-").concat(index), name); }), true);
    prop.renderer.rootBoneAncestryComplete = true;
    prop.renderer.transformChain = [rootPointer, pointer("".concat(identity, "-prop-transform"), prop.renderer.name)];
    var attachments = assembly.attachments;
    attachments.mainWeapon = [mainBone];
    return { fixture: fixture, primary: primary, prop: prop };
}
function addStructuralEquipmentRenderer(fixture, options) {
    var _a, _b, _c;
    if (options === void 0) { options = {}; }
    var assembly = fixture.candidate.assembly[0];
    var rootBranch = (_a = options.rootBranch) !== null && _a !== void 0 ? _a : 'bone_root/Bip001/Bip001_Weapon';
    var name = (_b = options.name) !== null && _b !== void 0 ? _b : 'Maki_Original_Weapon';
    var sourceReference = (_c = options.sourceReference) !== null && _c !== void 0 ? _c : reference(hash('a'), 'CAB-prefab', String(600001 + assembly.renderers.length));
    var added = addPolicyRenderer(fixture, {
        name: name,
        hierarchyPath: "".concat(assembly.root, "/").concat(rootBranch, "/").concat(name),
        materialName: "".concat(name, "_Material"),
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: sourceReference,
    });
    var pointer = function (pathId, pointerName) { return ({ file: 'CAB-prefab', pathId: pathId, name: pointerName }); };
    var chain = __spreadArray(__spreadArray([
        pointer('1', assembly.root)
    ], rootBranch.split('/').map(function (item, index) { return pointer(String(2 + index), item); }), true), [
        pointer('20', name),
    ], false);
    var anchor = chain[chain.length - 2];
    added.renderer.rootBone = anchor;
    added.renderer.transformChain = chain;
    added.renderer.boneReferences = [anchor];
    var body = assembly.renderers[0];
    body.boneReferences = [];
    return __assign(__assign({}, added), { anchor: anchor, body: body });
}
/**
 * Hoshino Armed-shaped source fixture: the shield renderer has no authored
 * attachment constraint, but its serialized m_Bones list shares three exact
 * bullet pointers with the renderer selected by mainWeapon and retains local
 * shield bones.  The helper also supports the fail-closed mutations below.
 */
function addSharedBoneShieldRenderers(fixture, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var assembly = fixture.candidate.assembly[0];
    var pointer = function (pathId, name, file) {
        if (file === void 0) { file = 'CAB-prefab'; }
        return ({ file: file, pathId: pathId, name: name });
    };
    var root = pointer('root', assembly.root);
    var sharedBones = [
        pointer('bullet-004', 'bone_Bullet004'),
        pointer('bullet-01', 'bone_Bullet01'),
        pointer('bullet-02', 'bone_Bullet02'),
    ];
    if (options.crossPrefabShared)
        sharedBones[1] = pointer('bullet-01', 'bone_Bullet01', 'CAB-other-prefab');
    var weapon = addPolicyRenderer(fixture, {
        name: 'CH0258_Weapon',
        hierarchyPath: "".concat(assembly.root, "/CH0258_Weapon"),
        materialName: 'CH0258_Weapon_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
    });
    var weaponRoot = pointer('weapon-root', 'Bip001_Weapon');
    weapon.renderer.rootBone = weaponRoot;
    weapon.renderer.transformChain = [root, weaponRoot, pointer('weapon-renderer', weapon.renderer.name)];
    weapon.renderer.boneReferences = __spreadArray(__spreadArray([weaponRoot], sharedBones, true), [pointer('weapon-local', 'bone_Weapon_Local')], false);
    var shield = addPolicyRenderer(fixture, {
        name: 'CH0258_Shield_Weapon',
        hierarchyPath: "".concat(assembly.root, "/CH0258_Shield_Weapon"),
        materialName: 'CH0258_Shield_Weapon_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
    });
    var shieldRoot = pointer('shield-root', 'bone_Shield_00');
    var sharedCount = (_a = options.sharedCount) !== null && _a !== void 0 ? _a : sharedBones.length;
    shield.renderer.rootBone = shieldRoot;
    shield.renderer.transformChain = [root, shieldRoot, pointer('shield-renderer', shield.renderer.name)];
    shield.renderer.boneReferences = __spreadArray(__spreadArray([shieldRoot], sharedBones.slice(0, sharedCount), true), [pointer('shield-local', 'bone_Shield_T_Motionbone_00'), pointer('pistol-local', 'bone_Pistol_00')], false);
    assembly.attachments.mainWeapon = [weaponRoot];
    var body = assembly.renderers[0];
    body.boneReferences = options.bodyOverlap ? [__assign({}, sharedBones[0])] : [];
    var competing = null;
    if (options.competingRenderer) {
        competing = addPolicyRenderer(fixture, {
            name: 'CH0258_Shield_Accessory',
            hierarchyPath: "".concat(assembly.root, "/CH0258_Shield_Accessory"),
            materialName: 'CH0258_Shield_Accessory_Material',
            shaderName: 'MX/C-Weapon',
            rendererType: 'SkinnedMeshRenderer',
            sourceReference: reference(hash('a'), 'CAB-prefab', '600003'),
        });
        competing.renderer.rootBone = pointer('accessory-root', 'bone_Shield_Accessory');
        competing.renderer.transformChain = [root, competing.renderer.rootBone, pointer('accessory-renderer', competing.renderer.name)];
        competing.renderer.boneReferences = __spreadArray(__spreadArray([competing.renderer.rootBone], sharedBones, true), [pointer('accessory-local', 'bone_Shield_Accessory_Local')], false);
    }
    return { weapon: weapon, shield: shield, competing: competing, sharedBones: sharedBones };
}
function shapeBip001WeaponAnchor(fixture, added, rootBoneName) {
    var assembly = fixture.candidate.assembly[0];
    var pointer = function (pathId, name) { return ({ file: 'CAB-prefab', pathId: pathId, name: name }); };
    var rootBone = pointer('root-bone', rootBoneName);
    var anchor = pointer('bip001-weapon', 'Bip001_Weapon');
    added.renderer.hierarchyPath = "".concat(assembly.root, "/").concat(added.renderer.name);
    added.renderer.rootBone = rootBone;
    added.renderer.transformChain = [pointer('root', assembly.root), pointer('renderer', added.renderer.name)];
    added.renderer.boneReferences = [anchor];
    added.body.boneReferences = [];
    return { rootBone: rootBone, anchor: anchor };
}
var eStandardPassFixtures = [
    {
        key: 'forwardStatic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 160, parameterBlobIndex: 0,
        parameterRecordSha256: rendering_profile_1.MX_E_STANDARD_FORWARD_STATIC_PARAMETER_SHA256, programHash: rendering_profile_1.MX_E_STANDARD_FORWARD_STATIC_PROGRAM_HASH,
        programRecordSha256: rendering_profile_1.MX_E_STANDARD_FORWARD_STATIC_RECORD_SHA256, programDataLength: 7132, keywordIndices: [], keywordNames: [],
        attributes: rendering_profile_1.MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: rendering_profile_1.MX_E_STANDARD_FORWARD_STATIC_UNIFORMS,
    },
    {
        key: 'forwardDynamic', stateName: 'ForwardLit', passName: '', passIndex: 0, blobIndex: 171, parameterBlobIndex: 4,
        parameterRecordSha256: rendering_profile_1.MX_E_STANDARD_FORWARD_DYNAMIC_PARAMETER_SHA256, programHash: rendering_profile_1.MX_E_STANDARD_FORWARD_DYNAMIC_PROGRAM_HASH,
        programRecordSha256: rendering_profile_1.MX_E_STANDARD_FORWARD_DYNAMIC_RECORD_SHA256, programDataLength: 8112, keywordIndices: [19], keywordNames: ['_DYNAMIC_LIGHTS'],
        attributes: rendering_profile_1.MX_E_STANDARD_FORWARD_ATTRIBUTES, uniforms: rendering_profile_1.MX_E_STANDARD_FORWARD_DYNAMIC_UNIFORMS,
    },
    {
        key: 'shadow', stateName: 'ShadowCaster', passName: '', passIndex: 1, blobIndex: 1316, parameterBlobIndex: 1312,
        parameterRecordSha256: rendering_profile_1.MX_E_STANDARD_SHADOW_PARAMETER_SHA256, programHash: rendering_profile_1.MX_E_STANDARD_SHADOW_PROGRAM_HASH,
        programRecordSha256: rendering_profile_1.MX_E_STANDARD_SHADOW_RECORD_SHA256, programDataLength: 4273, keywordIndices: [], keywordNames: [],
        attributes: rendering_profile_1.MX_E_STANDARD_SHADOW_ATTRIBUTES, uniforms: rendering_profile_1.MX_E_STANDARD_SHADOW_UNIFORMS,
    },
    {
        key: 'depth', stateName: 'DepthOnly', passName: '', passIndex: 2, blobIndex: 1324, parameterBlobIndex: 1320,
        parameterRecordSha256: rendering_profile_1.MX_E_STANDARD_DEPTH_PARAMETER_SHA256, programHash: rendering_profile_1.MX_E_STANDARD_DEPTH_PROGRAM_HASH,
        programRecordSha256: rendering_profile_1.MX_E_STANDARD_DEPTH_RECORD_SHA256, programDataLength: 2766, keywordIndices: [], keywordNames: [],
        attributes: rendering_profile_1.MX_E_STANDARD_DEPTH_ATTRIBUTES, uniforms: rendering_profile_1.MX_E_STANDARD_DEPTH_UNIFORMS,
    },
    {
        key: 'meta', stateName: 'Meta', passName: '', passIndex: 3, blobIndex: 1331, parameterBlobIndex: 1328,
        parameterRecordSha256: rendering_profile_1.MX_E_STANDARD_META_PARAMETER_SHA256, programHash: rendering_profile_1.MX_E_STANDARD_META_PROGRAM_HASH,
        programRecordSha256: rendering_profile_1.MX_E_STANDARD_META_RECORD_SHA256, programDataLength: 6928, keywordIndices: [], keywordNames: [],
        attributes: rendering_profile_1.MX_E_STANDARD_META_ATTRIBUTES, uniforms: rendering_profile_1.MX_E_STANDARD_META_UNIFORMS,
    },
];
function makeEStandardCandidate(activeVariant) {
    if (activeVariant === void 0) { activeVariant = 'dynamic'; }
    var fixture = makeCandidate('e_standard_fixture', ['EStandard_Material']);
    var material = fixture.candidate.sourceMaterials[0];
    var shader = fixture.candidate.shaders[0];
    var mainReference = reference(hash('f'), 'CAB-e-standard-textures', '300');
    material.shaderName = rendering_profile_1.MX_E_STANDARD_SHADER_NAME;
    material.shaderParsedName = rendering_profile_1.MX_E_STANDARD_SHADER_NAME;
    material.shaderReference = structuredClone(rendering_profile_1.MX_E_STANDARD_SOURCE_REFERENCE);
    material.shader = { file: rendering_profile_1.MX_E_STANDARD_SOURCE_REFERENCE.serializedFile, pathId: rendering_profile_1.MX_E_STANDARD_SOURCE_REFERENCE.objectId };
    material.renderQueue = 2000;
    material.keywords = activeVariant === 'dynamic' ? ['_DYNAMIC_LIGHTS', '_SPECULAR_SETUP'] : ['_SPECULAR_SETUP'];
    material.floatProperties = {
        _Cutoff: 0.5, _SrcBlend: 1, _DstBlend: 0, _SrcBlendAlpha: 1, _DstBlendAlpha: 0, _ZWrite: 1, _Cull: 2,
        _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ReflectBaseAmount: 0, _ReflectAnglePower: 2, _ShadowAttenRefl: 0,
        _ReflectStrength: 0, _EmissionStrength: 0, _SpecPower: 1, _ShadowAttenSpec: 0.2, _LightmapStrength: 1,
    };
    material.intProperties = {};
    material.colorProperties = {
        _Color: { r: 1, g: 1, b: 1, a: 1 }, _SpecLightDir: { r: 0, g: 0, b: 1, a: 0 },
        _SpecLightColor: { r: 1, g: 1, b: 1, a: 1 }, _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 },
        _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 }, _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 },
    };
    material.textures = [
        { name: '_EmissionTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
        { name: '_MainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference },
        { name: '_PrefabLightmapTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
        { name: '_ReflectTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
        { name: '_SpecTex', texture: { file: mainReference.serializedFile, pathId: '0' }, textureReference: null },
    ];
    material.resolvedTextures = [{
            property: '_MainTex', name: 'EStandard_MainTex', width: 512, height: 512, sourceReference: mainReference,
        }];
    shader.name = rendering_profile_1.MX_E_STANDARD_SHADER_NAME;
    shader.parsedName = rendering_profile_1.MX_E_STANDARD_SHADER_NAME;
    shader.sourceReference = structuredClone(rendering_profile_1.MX_E_STANDARD_SOURCE_REFERENCE);
    shader.programBlobSha256 = rendering_profile_1.MX_E_STANDARD_PROGRAM_BLOB_SHA256;
    shader.properties = { m_Props: rendering_profile_1.MX_E_STANDARD_REQUIRED_PROPERTIES.map(function (m_Name) { return ({ m_Name: m_Name }); }) };
    var stateValue = function (val, name) { return ({ val: val, name: name }); };
    var sourcePassState = function (stateName, colorMask) {
        var forward = stateName === 'ForwardLit';
        var meta = stateName === 'Meta';
        var lightMode = stateName === 'ForwardLit' ? 'UniversalForward' : stateName === 'DepthOnly' ? 'DepthOnly' : stateName.toUpperCase();
        var property = function (name, value, active) { return stateValue(value, active ? name : '<noninit>'); };
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
        };
    };
    shader.subShaders = [{ passes: [
                { type: 0, name: '', state: sourcePassState('ForwardLit', 15) },
                { type: 0, name: '', state: sourcePassState('ShadowCaster', 15) },
                { type: 0, name: '', state: sourcePassState('DepthOnly', 0) },
                { type: 0, name: '', state: sourcePassState('Meta', 15) },
            ] }];
    var sourceAttributeName = function (attribute) { return attribute === 'POSITION' ? 'in_POSITION0'
        : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0'
            : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1' : 'in_TEXCOORD2'; };
    var glsl = function (attributes, uniforms) { return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        '#version 300 es', '#ifdef VERTEX'
    ], attributes.map(function (attribute) { return "in vec4 ".concat(sourceAttributeName(attribute), ";"); }), true), uniforms.map(function (uniform) { return "uniform vec4 ".concat(uniform, ";"); }), true), [
        '#endif', '#ifdef FRAGMENT'
    ], false), uniforms.map(function (uniform) { return "uniform vec4 ".concat(uniform, ";"); }), true), [
        '#endif',
    ], false).join('\n'); };
    var programs = eStandardPassFixtures.map(function (pass) { return ({
        kind: 'program', blobIndex: pass.blobIndex, platform: 9, gpuProgramType: 4,
        programHash: pass.programHash, programDataSha256: pass.programHash, programDataLength: pass.programDataLength,
        recordSha256: pass.programRecordSha256, glsl: glsl(pass.attributes, pass.uniforms),
    }); });
    shader.extraction = {
        schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: rendering_profile_1.MX_E_STANDARD_FINGERPRINT,
        compressedBlobSha256: rendering_profile_1.MX_E_STANDARD_PROGRAM_BLOB_SHA256,
        shader: { name: rendering_profile_1.MX_E_STANDARD_SHADER_NAME, sourceReference: structuredClone(rendering_profile_1.MX_E_STANDARD_SOURCE_REFERENCE), keywordNames: __spreadArray([], rendering_profile_1.MX_E_STANDARD_SHADER_KEYWORDS, true) },
        programs: programs,
        gles3Programs: structuredClone(programs),
        bindings: eStandardPassFixtures.map(function (pass) { return ({
            subShaderIndex: 0, passIndex: pass.passIndex, passName: pass.passName, stateName: pass.stateName, stage: 'vertex',
            blobIndex: pass.blobIndex, parameterBlobIndex: pass.parameterBlobIndex, platform: 9, gpuProgramType: 4,
            keywordIndices: __spreadArray([], pass.keywordIndices, true), keywordNames: __spreadArray([], pass.keywordNames, true), programHash: pass.programHash,
            gles3ProgramHash: pass.programHash, programRecordSha256: pass.programRecordSha256, parameterRecordSha256: pass.parameterRecordSha256,
        }); }),
    };
    return fixture;
}
function makeCustomShaderCandidate(rule) {
    var fixture = makeCandidate('custom_shader_fixture', ['CustomShader_Material']);
    var material = fixture.candidate.sourceMaterials[0];
    var shader = fixture.candidate.shaders[0];
    material.shaderName = rule.identity;
    material.shaderParsedName = rule.identity;
    material.shaderReference = structuredClone(rule.sourceReference);
    shader.parsedName = rule.identity;
    shader.sourceReference = structuredClone(rule.sourceReference);
    shader.programBlobSha256 = rule.programBlobSha256;
    shader.properties = { m_Props: rule.requiredProperties.map(function (m_Name) { return ({ m_Name: m_Name }); }) };
    shader.subShaders = [{ passes: rule.passSignature[0].states.map(function (states, index) {
                var _a, _b, _c, _d, _e;
                return ({
                    type: rule.passSignature[0].type,
                    state: {
                        srcBlend: { val: (_a = states.srcBlend) !== null && _a !== void 0 ? _a : 1, name: '<fixture>' }, destBlend: { val: (_b = states.destBlend) !== null && _b !== void 0 ? _b : 0, name: '<fixture>' },
                        srcBlendAlpha: { val: 1, name: '<fixture>' }, destBlendAlpha: { val: 0, name: '<fixture>' },
                        blendOp: { val: 0, name: '<fixture>' }, blendOpAlpha: { val: 0, name: '<fixture>' },
                        zWrite: { val: (_c = states.zWrite) !== null && _c !== void 0 ? _c : 1, name: '<fixture>' },
                        zTest: { val: (_d = states.zTest) !== null && _d !== void 0 ? _d : 4, name: '<fixture>' },
                        culling: { val: (_e = states.culling) !== null && _e !== void 0 ? _e : (index === 1 ? 1 : 0), name: '<fixture>' },
                        offsetFactor: { val: 0, name: '<fixture>' }, offsetUnits: { val: 0, name: '<fixture>' },
                    },
                });
            }) }];
    if (rule.id === 'mx-c-transparent-st') {
        var mainReference = reference(hash('f'), 'CAB-textures', '300');
        var maskReference = reference(hash('f'), 'CAB-textures', '301');
        material.shader = { file: rule.sourceReference.serializedFile, pathId: rule.sourceReference.objectId };
        material.floatProperties = {
            _Cull: 0, _ZWrite: 0, _ZTest: 4, _Cutoff: 0.5, _MaskGSensitivity: 1, _MaskRtoG: 0,
            _SeeThroughMinValue: 0.5, _SeeThroughTransparency: 1, _SeeThroughSmoothness: 1, _ShadowThreshold: 0.5,
            _RimAreaMultiplier: 1, _RimStrength: 1, _AdditionalLightStrength: 1, _AdditionalLightSharpness: 5,
            _DitherThreshold: 0, _GrayBrightness: 1,
        };
        material.colorProperties = {
            _Tint: { r: 1, g: 1, b: 1, a: 1 }, _ShadowTint: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
            _CodeAddColor: { r: 0, g: 0, b: 0, a: 0 }, _CodeMultiplyColor: { r: 1, g: 1, b: 1, a: 1 },
            _CodeAddRimColor: { r: 0, g: 0, b: 0, a: 0 },
        };
        material.textures = [
            { name: '_MainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
            { name: '_MaskTex', texture: { file: maskReference.serializedFile, pathId: maskReference.objectId }, textureReference: maskReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        ];
        material.resolvedTextures = [
            { property: '_MainTex', name: 'Main', width: 256, height: 256, sourceReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
            { property: '_MaskTex', name: 'Mask', width: 256, height: 256, sourceReference: maskReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        ];
        var source = function (attributes, uniforms) { return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
            '#version 300 es', '#ifdef VERTEX'
        ], attributes.map(function (attribute) { return "in vec4 in_".concat(attribute === 'POSITION' ? 'POSITION0' : attribute === 'NORMAL' ? 'NORMAL0' : attribute === 'COLOR_0' ? 'COLOR0' : 'TEXCOORD0', ";"); }), true), uniforms.map(function (uniform) { return "uniform float ".concat(uniform, ";"); }), true), [
            'void main(){}', '#endif', '#ifdef FRAGMENT'
        ], false), uniforms.map(function (uniform) { return "uniform float ".concat(uniform, ";"); }), true), [
            'void main(){}', '#endif',
        ], false).join('\n'); };
        var program = function (blobIndex, programHash, glsl, recordSha256) { return ({
            kind: 'program',
            blobIndex: blobIndex,
            platform: 9, gpuProgramType: 4,
            programHash: programHash,
            programDataSha256: programHash,
            programDataLength: 128,
            glsl: glsl,
            recordSha256: recordSha256,
        }); };
        var baseGlsl = source(rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_UNIFORMS);
        var ditherGlsl = source(rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_ATTRIBUTES, rendering_profile_1.MX_C_TRANSPARENT_ST_DITHER_UNIFORMS);
        var depthGlsl = source(rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_ATTRIBUTES, rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_UNIFORMS);
        var baseProgram = program(6, rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH, baseGlsl, rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256);
        var ditherProgram = program(8, rendering_profile_1.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH, ditherGlsl, rendering_profile_1.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256);
        var depthProgram = program(31, rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH, depthGlsl, rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256);
        var binding = function (passIndex, stateName, blobIndex, programHash, programRecordSha256, parameterBlobIndex, parameterRecordSha256, keywordIndices, keywordNames) {
            if (keywordIndices === void 0) { keywordIndices = []; }
            if (keywordNames === void 0) { keywordNames = []; }
            return ({
                subShaderIndex: 0,
                passIndex: passIndex,
                stateName: stateName,
                stage: 'vertex',
                blobIndex: blobIndex,
                parameterBlobIndex: parameterBlobIndex,
                platform: 9, gpuProgramType: 4,
                keywordIndices: keywordIndices,
                keywordNames: keywordNames,
                programHash: programHash,
                gles3ProgramHash: programHash,
                programRecordSha256: programRecordSha256,
                parameterRecordSha256: parameterRecordSha256,
            });
        };
        shader.extraction = {
            schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3.27f1', fingerprint: rendering_profile_1.MX_C_TRANSPARENT_ST_FINGERPRINT,
            compressedBlobSha256: rendering_profile_1.MX_C_TRANSPARENT_ST_PROGRAM_BLOB_SHA256,
            shader: { name: 'MX/C-Transparent-ST', sourceReference: structuredClone(rule.sourceReference), keywordNames: ['_DITHER_HORIZONTAL_LINES'] },
            programs: [], gles3Programs: [baseProgram, ditherProgram, depthProgram],
            bindings: [
                binding(0, 'ForwardLit', 6, rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH, rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_RECORD_SHA256, 0, rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_PARAMETER_RECORD_SHA256),
                binding(0, 'ForwardLit', 8, rendering_profile_1.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH, rendering_profile_1.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_RECORD_SHA256, 1, rendering_profile_1.MX_C_TRANSPARENT_ST_DITHER_PARAMETER_RECORD_SHA256, [9], ['_DITHER_HORIZONTAL_LINES']),
                binding(1, '', 31, rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH, rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_RECORD_SHA256, 30, rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_PARAMETER_RECORD_SHA256),
            ],
        };
        var transparentState = function (srcBlend, destBlend, colorMask) { return ({
            srcBlend: { val: srcBlend, name: '<fixture>' }, destBlend: { val: destBlend, name: '<fixture>' },
            srcBlendAlpha: { val: srcBlend === 5 ? 1 : 1, name: '<fixture>' }, destBlendAlpha: { val: destBlend === 10 ? 10 : 0, name: '<fixture>' },
            blendOp: { val: 0, name: '<fixture>' }, blendOpAlpha: { val: 0, name: '<fixture>' },
            colMask: { val: colorMask, name: '<fixture>' }, zWrite: { val: 0, name: '[_ZWrite]' },
            zTest: { val: 4, name: '<fixture>' }, culling: { val: 0, name: '[_Cull]' }, offsetFactor: { val: 0, name: '<fixture>' }, offsetUnits: { val: 0, name: '<fixture>' },
        }); };
        shader.subShaders = [{ passes: [
                    { type: 0, state: transparentState(5, 10, 15) }, { type: 0, state: transparentState(1, 0, 0) },
                ] }];
        material.keywords = [];
    }
    else if (rule.id === 'mx-unlit-outline') {
        var textureReference = reference(hash('f'), 'CAB-textures', '300');
        material.shader = { file: rule.sourceReference.serializedFile, pathId: rule.sourceReference.objectId };
        material.floatProperties = __assign(__assign({}, material.floatProperties), { _Cull: 0, _ZWrite: 1, _ZTest: 4, _OutlineZCorrection: 0 });
        material.colorProperties = {
            _Tint: { r: 1, g: 1, b: 1, a: 1 },
            _OutlineTint: { r: 0.2641509175300598, g: 0.2641509175300598, b: 0.2641509175300598, a: 1 },
        };
        material.textures = [{
                name: '_MainTex', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId },
                textureReference: textureReference,
                scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
            }];
        material.resolvedTextures = [{
                property: '_MainTex', name: 'CustomShader_MainTex', width: 256, height: 256,
                sourceReference: textureReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
            }];
        var baseGlsl = [
            '#version 300 es', '#ifdef VERTEX',
            'in highp vec4 in_POSITION0;', 'in highp vec2 in_TEXCOORD0;',
            'uniform vec4 _MainTex_ST;', 'uniform vec4 _Tint;', 'uniform sampler2D _MainTex;',
            '#endif', '#ifdef FRAGMENT', 'uniform vec2 _GlobalMipBias;', '#endif',
        ].join('\n');
        var outlineGlsl = [
            '#version 300 es', '#ifdef VERTEX',
            'in highp vec4 in_POSITION0;', 'in highp vec4 in_TANGENT0;', 'in mediump vec4 in_COLOR0;',
            'in highp vec2 in_TEXCOORD0;', 'uniform vec4 _MainTex_ST;', 'uniform float _OutlineZCorrection;',
            'uniform sampler2D _MainTex;', 'uniform vec4 _OutlineTint;', 'uniform vec4 _MainLightColor;',
            'uniform vec4 _ScreenParams;', 'uniform mat4 hlslcc_mtx4x4glstate_matrix_projection;',
            'uniform mat4 hlslcc_mtx4x4unity_MatrixInvV;', 'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;',
            '#endif', '#ifdef FRAGMENT', 'uniform sampler2D _MainTex;', 'uniform vec4 _OutlineTint;', '#endif',
        ].join('\n');
        var program = function (blobIndex, programHash, glsl, recordSha256) { return ({
            kind: 'program',
            blobIndex: blobIndex,
            platform: 9, gpuProgramType: 4,
            programHash: programHash,
            programDataSha256: programHash,
            programDataLength: 128,
            glsl: glsl,
            recordSha256: recordSha256,
        }); };
        var baseProgram = program(1, rendering_profile_1.MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, baseGlsl, hash('1'));
        var outlineProgram = program(6, rendering_profile_1.MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, outlineGlsl, hash('2'));
        var binding = function (passIndex, stateName, blobIndex, programHash, programRecordSha256, parameterBlobIndex, parameterRecordSha256) { return ({
            subShaderIndex: 0,
            passIndex: passIndex,
            stateName: stateName,
            stage: 'vertex',
            blobIndex: blobIndex,
            parameterBlobIndex: parameterBlobIndex,
            platform: 9, gpuProgramType: 4,
            keywordIndices: [], keywordNames: [],
            programHash: programHash,
            gles3ProgramHash: programHash,
            programRecordSha256: programRecordSha256,
            parameterRecordSha256: parameterRecordSha256,
        }); };
        shader.extraction = {
            schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3.27f1', fingerprint: hash('9'),
            compressedBlobSha256: rendering_profile_1.MX_UNLIT_OUTLINE_PROGRAM_BLOB_SHA256,
            shader: { name: 'MX/Unlit Outline', sourceReference: structuredClone(rule.sourceReference), keywordNames: [] },
            programs: [], gles3Programs: [baseProgram, outlineProgram],
            bindings: [
                binding(0, 'ForwardLit', 1, rendering_profile_1.MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, hash('1'), 0, hash('3')),
                binding(1, 'Outline', 6, rendering_profile_1.MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH, hash('2'), 4, hash('4')),
            ],
        };
    }
    return fixture;
}
function makeGlitchTexCandidate() {
    var fixture = makeCandidate('glitch_tex_fixture', ['FX_MAT_Glitch_01']);
    var material = fixture.candidate.sourceMaterials[0];
    var shader = fixture.candidate.shaders[0];
    var noiseReference = reference('1454c8ba7cc0b23065122af1ab8892f9490299c10032118abeaa13cad5488b74', 'CAB-39fe55e8868aab69e2cf9a8ae5dcef67', '277634516359511144');
    material.shaderName = rendering_profile_1.DSFX_GLITCH_TEX_SHADER_NAME;
    material.shaderParsedName = rendering_profile_1.DSFX_GLITCH_TEX_SHADER_NAME;
    material.shaderReference = structuredClone(rendering_profile_1.DSFX_GLITCH_TEX_SOURCE_REFERENCE);
    material.shader = { file: rendering_profile_1.DSFX_GLITCH_TEX_SOURCE_REFERENCE.serializedFile, pathId: rendering_profile_1.DSFX_GLITCH_TEX_SOURCE_REFERENCE.objectId };
    material.renderQueue = -1;
    material.keywords = [];
    material.floatProperties = { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 };
    material.intProperties = {};
    material.colorProperties = {};
    material.textures = [
        { name: '_MainTex', texture: { file: material.file, pathId: '0' }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { name: '_NoiseTex', texture: { file: noiseReference.serializedFile, pathId: noiseReference.objectId }, textureReference: structuredClone(noiseReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ];
    material.resolvedTextures = [{ property: '_NoiseTex', name: 'FX_TEX_Noise_16', width: 256, height: 256, sourceReference: structuredClone(noiseReference), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }];
    shader.name = rendering_profile_1.DSFX_GLITCH_TEX_SHADER_NAME;
    shader.parsedName = rendering_profile_1.DSFX_GLITCH_TEX_SHADER_NAME;
    shader.sourceReference = structuredClone(rendering_profile_1.DSFX_GLITCH_TEX_SOURCE_REFERENCE);
    shader.programBlobSha256 = rendering_profile_1.DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256;
    shader.properties = { m_Props: rendering_profile_1.DSFX_GLITCH_TEX_REQUIRED_PROPERTIES.map(function (m_Name) { return ({ m_Name: m_Name }); }) };
    var sourceGlsl = function (shadow) { return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        '#version 300 es', '#ifdef VERTEX',
        'in highp vec4 in_POSITION0;'
    ], (shadow ? ['in highp vec3 in_NORMAL0;'] : ['in highp vec2 in_TEXCOORD0;']), true), (shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_UNIFORMS : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_UNIFORMS).map(function (uniform) { return "uniform vec4 ".concat(uniform, ";"); }), true), [
        '#endif', '#ifdef FRAGMENT'
    ], false), (shadow ? [] : ['uniform sampler2D _NoiseTex;', 'uniform sampler2D _MainTex;']), true), [
        '#endif',
    ], false).join('\n'); };
    var pass = function (shadow) { return ({
        kind: 'program', platform: 9, gpuProgramType: 4, blobIndex: shadow ? 3 : 1,
        programHash: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
        programDataSha256: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
        programDataLength: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_DATA_LENGTH : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_DATA_LENGTH,
        recordSha256: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256,
        glsl: sourceGlsl(shadow),
    }); };
    var programs = [pass(false), pass(true)];
    shader.extraction = {
        schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: rendering_profile_1.DSFX_GLITCH_TEX_FINGERPRINT,
        compressedBlobSha256: rendering_profile_1.DSFX_GLITCH_TEX_PROGRAM_BLOB_SHA256,
        shader: { name: rendering_profile_1.DSFX_GLITCH_TEX_SHADER_NAME, sourceReference: structuredClone(rendering_profile_1.DSFX_GLITCH_TEX_SOURCE_REFERENCE), keywordNames: __spreadArray([], rendering_profile_1.DSFX_GLITCH_TEX_SHADER_KEYWORDS, true) },
        programs: structuredClone(programs), gles3Programs: structuredClone(programs),
        bindings: [false, true].map(function (shadow) { return ({
            subShaderIndex: 0, passIndex: shadow ? 1 : 0, passName: '', stateName: shadow ? 'ShadowCaster' : 'Forward', stage: 'vertex',
            blobIndex: shadow ? 3 : 1, parameterBlobIndex: shadow ? 2 : 0, platform: 9, gpuProgramType: 4,
            keywordIndices: [], keywordNames: [], programHash: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
            gles3ProgramHash: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH,
            programRecordSha256: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_RECORD_SHA256 : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_RECORD_SHA256,
            parameterRecordSha256: shadow ? rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PARAMETER_RECORD_SHA256 : rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PARAMETER_RECORD_SHA256,
        }); }),
    };
    var sourceState = function (name, shadow) {
        var literal = function (val, stateName) {
            if (stateName === void 0) { stateName = '<literal>'; }
            return ({ val: val, name: stateName });
        };
        return {
            m_Name: name, rtBlend0: {
                srcBlend: literal(shadow ? 1 : 5), destBlend: literal(shadow ? 0 : 10), srcBlendAlpha: literal(shadow ? 1 : 5), destBlendAlpha: literal(shadow ? 0 : 10),
                blendOp: literal(0), blendOpAlpha: literal(0), colMask: literal(shadow ? 0 : 15),
            }, zWrite: literal(shadow ? 1 : 0), zTest: literal(4), culling: literal(0, '_Cull_Mode'), offsetFactor: literal(0), offsetUnits: literal(0),
        };
    };
    shader.subShaders = [{ passes: [{ type: 0, name: '', state: sourceState('Forward', false) }, { type: 0, name: '', state: sourceState('ShadowCaster', true) }] }];
    return fixture;
}
var matcapPassFixtures = [
    {
        key: 'forward', pass: 'forward', variant: 'static', stateName: 'Forward', passIndex: 0, blobIndex: 2, parameterBlobIndex: 0,
        parameterRecordSha256: '1230f6ffd03db1548c00445789724828bc1a7f9337d3d045b19258d6e99f2150',
        programHash: 'b98d2bba4e992fe400691c433717001cad063da52877a5d4c9344af5f044581e',
        programRecordSha256: 'a6bfa89e41fbd5fd2c430cc5116ffcbe0b0a279fe3413c53a8288ee647be394e',
        programDataLength: 5178, keywordIndices: [], keywordNames: [],
        attributes: rendering_profile_1.DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: rendering_profile_1.DSFX_MATCAP_FORWARD_STATIC_UNIFORMS,
    },
    {
        key: 'forwardInstanced', pass: 'forward', variant: 'instanced', stateName: 'Forward', passIndex: 0, blobIndex: 3, parameterBlobIndex: 1,
        parameterRecordSha256: '1f57f72e922d53d408292fef50d8c2a03f8709aa7bbb4d2a476d2bcb40768175',
        programHash: '38ad3365c7eab792e89d17ef3dd20f0ad6e9247acfec18d09ce4338f8b4b25e4',
        programRecordSha256: 'fea97058aa6a206718c737ac7cc12386dca183d0a6536b345a12c75c3eaac49f',
        programDataLength: 4726, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        attributes: rendering_profile_1.DSFX_MATCAP_FORWARD_ATTRIBUTES, uniforms: rendering_profile_1.DSFX_MATCAP_FORWARD_INSTANCED_UNIFORMS,
    },
    {
        key: 'shadow', pass: 'shadow', variant: 'static', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 6, parameterBlobIndex: 4,
        parameterRecordSha256: '697aff5cd9a92112ce779cf3254dae26c8851c2a2c230d0d3adc8ecec240bc17',
        programHash: 'd33e4c0eafc7babbf55f46b18680bc921c80e888df1fe3d81e6620c9533a0b67',
        programRecordSha256: '34b37cd383e739b9b50ef5cdc0568c314480d50bd340ee778743357cc4bbfcb3',
        programDataLength: 4923, keywordIndices: [], keywordNames: [],
        attributes: rendering_profile_1.DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: rendering_profile_1.DSFX_MATCAP_SHADOW_STATIC_UNIFORMS,
    },
    {
        key: 'shadowInstanced', pass: 'shadow', variant: 'instanced', stateName: 'ShadowCaster', passIndex: 1, blobIndex: 7, parameterBlobIndex: 5,
        parameterRecordSha256: '48ebd049e2cb3f6d0bc97f984a9f394a425d4bc40dbf4a0319b1d0667221de51',
        programHash: '8adb20b2353020979dd6a7e367c803ae05111cabd4c0660265bc1810212230f7',
        programRecordSha256: 'd0ae10bc6b4deea8f8837c6f6ea86b53d82009a94bb1aa28bfb63667d09c5cb3',
        programDataLength: 4599, keywordIndices: [5], keywordNames: ['INSTANCING_ON'],
        attributes: rendering_profile_1.DSFX_MATCAP_SHADOW_ATTRIBUTES, uniforms: rendering_profile_1.DSFX_MATCAP_SHADOW_INSTANCED_UNIFORMS,
    },
];
function makeMatcapCandidate() {
    var fixture = makeCandidate('matcap_fixture', ['FX_MAT_Matcap_01']);
    var material = fixture.candidate.sourceMaterials[0];
    var shader = fixture.candidate.shaders[0];
    var assemblySlot = fixture.candidate.assembly[0].renderers[0].materialSlots[0];
    material.name = 'CH0191_Matcap';
    material.pathId = rendering_profile_1.DSFX_MATCAP_MATERIAL_REFERENCE.objectId;
    material.file = rendering_profile_1.DSFX_MATCAP_MATERIAL_REFERENCE.serializedFile;
    material.sourceReference = structuredClone(rendering_profile_1.DSFX_MATCAP_MATERIAL_REFERENCE);
    material.shaderName = rendering_profile_1.DSFX_MATCAP_SHADER_NAME;
    material.shaderParsedName = rendering_profile_1.DSFX_MATCAP_SHADER_NAME;
    material.shaderReference = structuredClone(rendering_profile_1.DSFX_MATCAP_SOURCE_REFERENCE);
    material.shader = { file: rendering_profile_1.DSFX_MATCAP_SOURCE_REFERENCE.serializedFile, pathId: rendering_profile_1.DSFX_MATCAP_SOURCE_REFERENCE.objectId };
    material.renderQueue = -1;
    material.keywords = [];
    material.floatProperties = __assign(__assign({}, rendering_profile_1.DSFX_MATCAP_INERT_FLOAT_PROPERTIES), { _ZWrite_Mode: 1, _Cull_Mode: 2 });
    material.intProperties = {};
    material.colorProperties = __assign(__assign({}, rendering_profile_1.DSFX_MATCAP_INERT_COLOR_PROPERTIES), { _Main_Color: {
            r: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[0], g: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[1], b: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[2], a: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[3],
        } });
    material.textures = [
        { name: '_Main_Tex', texture: { file: rendering_profile_1.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.serializedFile, pathId: rendering_profile_1.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.objectId }, textureReference: structuredClone(rendering_profile_1.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { name: '_Matcap_Tex', texture: { file: rendering_profile_1.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.serializedFile, pathId: rendering_profile_1.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.objectId }, textureReference: structuredClone(rendering_profile_1.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE), scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { name: '_texcoord', texture: { file: material.file, pathId: '0' }, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ];
    material.resolvedTextures = [
        { property: '_Main_Tex', name: 'CH0191_MainTex', width: 64, height: 64, sourceReference: structuredClone(rendering_profile_1.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE) },
        { property: '_Matcap_Tex', name: 'CH0191_MatcapTex', width: 64, height: 64, sourceReference: structuredClone(rendering_profile_1.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE) },
    ];
    assemblySlot.sourceMaterialReference = structuredClone(rendering_profile_1.DSFX_MATCAP_MATERIAL_REFERENCE);
    assemblySlot.material = { file: rendering_profile_1.DSFX_MATCAP_MATERIAL_REFERENCE.serializedFile, pathId: rendering_profile_1.DSFX_MATCAP_MATERIAL_REFERENCE.objectId };
    shader.name = rendering_profile_1.DSFX_MATCAP_SHADER_NAME;
    shader.parsedName = rendering_profile_1.DSFX_MATCAP_SHADER_NAME;
    shader.sourceReference = structuredClone(rendering_profile_1.DSFX_MATCAP_SOURCE_REFERENCE);
    shader.programBlobSha256 = rendering_profile_1.DSFX_MATCAP_PROGRAM_BLOB_SHA256;
    shader.properties = { m_Props: rendering_profile_1.DSFX_MATCAP_REQUIRED_PROPERTIES.map(function (m_Name) { return ({ m_Name: m_Name }); }) };
    var sourceAttributeName = function (attribute) { return attribute === 'POSITION' ? 'in_POSITION0'
        : attribute === 'NORMAL' ? 'in_NORMAL0' : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0' : 'in_COLOR0'; };
    var glsl = function (attributes, uniforms) { return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        '#version 300 es', '#ifdef VERTEX'
    ], attributes.map(function (attribute) { return "in vec4 ".concat(sourceAttributeName(attribute), ";"); }), true), uniforms.map(function (uniform) { return "uniform vec4 ".concat(uniform, ";"); }), true), [
        '#endif', '#ifdef FRAGMENT'
    ], false), uniforms.map(function (uniform) { return "uniform vec4 ".concat(uniform, ";"); }), true), [
        '#endif',
    ], false).join('\n'); };
    var programs = matcapPassFixtures.map(function (pass) { return ({
        kind: 'program', blobIndex: pass.blobIndex, platform: 9, gpuProgramType: 4,
        programHash: pass.programHash, programDataSha256: pass.programHash, programDataLength: pass.programDataLength,
        recordSha256: pass.programRecordSha256, glsl: glsl(pass.attributes, pass.uniforms),
    }); });
    shader.extraction = {
        schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: rendering_profile_1.DSFX_MATCAP_FINGERPRINT,
        compressedBlobSha256: rendering_profile_1.DSFX_MATCAP_PROGRAM_BLOB_SHA256,
        shader: { name: rendering_profile_1.DSFX_MATCAP_SHADER_NAME, sourceReference: structuredClone(rendering_profile_1.DSFX_MATCAP_SOURCE_REFERENCE), keywordNames: __spreadArray([], rendering_profile_1.DSFX_MATCAP_SHADER_KEYWORDS, true) },
        programs: structuredClone(programs), gles3Programs: structuredClone(programs),
        bindings: matcapPassFixtures.map(function (pass) { return ({
            subShaderIndex: 0, passIndex: pass.passIndex, passName: '', stateName: pass.stateName, stage: 'vertex',
            blobIndex: pass.blobIndex, parameterBlobIndex: pass.parameterBlobIndex, platform: 9, gpuProgramType: 4,
            keywordIndices: __spreadArray([], pass.keywordIndices, true), keywordNames: __spreadArray([], pass.keywordNames, true), programHash: pass.programHash,
            gles3ProgramHash: pass.programHash, programRecordSha256: pass.programRecordSha256, parameterRecordSha256: pass.parameterRecordSha256,
        }); }),
    };
    var stateValue = function (val, name) { return ({ val: val, name: name }); };
    var sourcePassState = function (shadow) {
        var name = shadow ? 'ShadowCaster' : 'Forward';
        var tags = [
            ['LIGHTMODE', shadow ? 'SHADOWCASTER' : 'UniversalForwardOnly'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'],
            ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque'],
        ];
        return {
            m_Name: name,
            rtBlend0: {
                srcBlend: stateValue(shadow ? 1 : 5, '<noninit>'), destBlend: stateValue(shadow ? 0 : 10, '<noninit>'),
                srcBlendAlpha: stateValue(shadow ? 1 : 5, '<noninit>'), destBlendAlpha: stateValue(shadow ? 0 : 10, '<noninit>'),
                blendOp: stateValue(0, '<noninit>'), blendOpAlpha: stateValue(0, '<noninit>'), colMask: stateValue(shadow ? 0 : 15, '<noninit>'),
            },
            zWrite: stateValue(shadow ? 1 : 0, shadow ? '<noninit>' : '_ZWrite_Mode'), zTest: stateValue(4, '<noninit>'),
            culling: stateValue(0, '_Cull_Mode'), offsetFactor: stateValue(0, '<noninit>'), offsetUnits: stateValue(0, '<noninit>'),
            lighting: false, m_Tags: { tags: tags },
        };
    };
    shader.subShaders = [{ passes: [
                { type: 0, name: '', state: sourcePassState(false) }, { type: 0, name: '', state: sourcePassState(true) },
            ] }];
    return fixture;
}
var projectMxPassFixtures = {
    forward: {
        pass: 'forward', stateName: 'ForwardLit', passIndex: 0, blobIndex: 32, parameterBlobIndex: 0,
        parameterRecordSha256: '1fd7d08c08cddbfd430fcce54986154a9a2a05611c22ed341936cd2d65c3f531',
        programHash: '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0',
        programRecordSha256: '6493a59384085e9600cf22bbe3577b99a8f24801a9dd14823e1eadeec6f37bab',
        programDataLength: 9117, keywordIndices: [], keywordNames: [],
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
        programDataLength: 5141, keywordIndices: [], keywordNames: [],
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
        programDataLength: 5384, keywordIndices: [], keywordNames: [],
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
        programDataLength: 4273, keywordIndices: [], keywordNames: [],
        attributes: ['POSITION', 'NORMAL'],
        uniforms: ['hlslcc_mtx4x4unity_MatrixVP', '_ShadowBias', '_LightDirection', '_ShadowCoordModifier'],
    },
    depth: {
        pass: 'depth', stateName: 'DepthOnly', passIndex: 4, blobIndex: 195, parameterBlobIndex: 194,
        parameterRecordSha256: 'd80300b6a0aaa9ed7174b7b972f8f905ec5a20392ac6ebbfe09ec4594c1c0532',
        programHash: '5d5ec4a709cff9d3168c7cc9b1884ab9ed7fbe44ec239e316d6eee5933e36513',
        programRecordSha256: '36e4eb765119d5960828f49b2c3343ec90cd544d29d932390f55a77db3cd9ca0',
        programDataLength: 2766, keywordIndices: [], keywordNames: [],
        attributes: ['POSITION'], uniforms: ['hlslcc_mtx4x4unity_MatrixVP'],
    },
};
function projectMxSourceAttributeName(attribute) {
    return attribute === 'POSITION' ? 'in_POSITION0'
        : attribute === 'NORMAL' ? 'in_NORMAL0'
            : attribute === 'TANGENT' ? 'in_TANGENT0'
                : attribute === 'COLOR_0' ? 'in_COLOR0' : 'in_TEXCOORD0';
}
function projectMxSourceGlsl(attributes, uniforms) {
    return __spreadArray(__spreadArray(__spreadArray([
        '#version 300 es', '#ifdef VERTEX'
    ], attributes.map(function (attribute) { return "in vec4 ".concat(projectMxSourceAttributeName(attribute), ";"); }), true), uniforms.map(function (uniform) { return "uniform vec4 ".concat(uniform, ";"); }), true), [
        '#endif', '#ifdef FRAGMENT', 'void main(){}', '#endif',
    ], false).join('\n');
}
function makeProjectMxCandidate(activeVariant) {
    if (activeVariant === void 0) { activeVariant = 'forward'; }
    var fixture = makeCandidate('projectmx_weapon_fixture', ['ProjectMX_Weapon']);
    var material = fixture.candidate.sourceMaterials[0];
    var shader = fixture.candidate.shaders[0];
    var mainReference = reference(hash('f'), 'CAB-textures', '300');
    var sourceReference = reference(hash('g'), 'CAB-textures', '301');
    material.shaderName = 'ProjectMX/WeaponTest1Damage';
    material.shaderParsedName = 'ProjectMX/WeaponTest1Damage';
    material.shaderReference = structuredClone(rendering_profile_1.PROJECTMX_WEAPON_SOURCE_REFERENCE);
    material.shader = { file: rendering_profile_1.PROJECTMX_WEAPON_SOURCE_REFERENCE.serializedFile, pathId: rendering_profile_1.PROJECTMX_WEAPON_SOURCE_REFERENCE.objectId };
    material.renderQueue = 2000;
    material.keywords = activeVariant === 'glow' ? ['_GLOW_0'] : [];
    material.floatProperties = {
        _DamageON: 0, _Damage: 0, _Fire: 0, _IsDither: 0, _UseGlow: activeVariant === 'glow' ? 1 : 0,
        _SrcBlend: 1, _DstBlend: 0, _ZWrite: 1, _ZTest: 4, _Cull: 2,
    };
    material.intProperties = {};
    material.colorProperties = {
        _Color: { r: 1, g: 1, b: 1, a: 1 },
        _FakeLightDir: { r: 0.1, g: 0.65, b: 0, a: 0 },
    };
    material.textures = [
        { name: '_mainTex', texture: { file: mainReference.serializedFile, pathId: mainReference.objectId }, textureReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { name: '_sourceTex', texture: { file: sourceReference.serializedFile, pathId: sourceReference.objectId }, textureReference: sourceReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ];
    material.resolvedTextures = [
        { property: '_mainTex', name: 'ProjectMX_MainTex', width: 256, height: 256, sourceReference: mainReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
        { property: '_sourceTex', name: 'ProjectMX_SourceTex', width: 256, height: 256, sourceReference: sourceReference, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
    ];
    shader.parsedName = 'ProjectMX/WeaponTest1Damage';
    shader.sourceReference = structuredClone(rendering_profile_1.PROJECTMX_WEAPON_SOURCE_REFERENCE);
    shader.programBlobSha256 = rendering_profile_1.PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256;
    shader.properties = { m_Props: rendering_profile_1.PROJECTMX_WEAPON_REQUIRED_PROPERTIES.map(function (m_Name) { return ({ m_Name: m_Name }); }) };
    var passStates = [
        ['ForwardLit', 2, 15], ['Outline', 1, 15], ['Solid Color Outline', 1, 15], ['ShadowCaster', 2, 15], ['DepthOnly', 2, 0],
    ];
    var state = function (name, culling, colorMask) { return ({
        m_Name: name,
        rtBlend0: {
            srcBlend: { val: 1 }, destBlend: { val: 0 }, srcBlendAlpha: { val: 1 }, destBlendAlpha: { val: 0 },
            blendOp: { val: 0 }, blendOpAlpha: { val: 0 }, colMask: { val: colorMask },
        },
        zWrite: { val: 1 }, zTest: { val: 4 }, culling: { val: culling }, offsetFactor: { val: 0 }, offsetUnits: { val: 0 }, lighting: false,
    }); };
    shader.subShaders = [{ passes: passStates.map(function (_a) {
                var name = _a[0], culling = _a[1], colorMask = _a[2];
                return ({ type: 0, state: state(name, culling, colorMask) });
            }) }];
    var programs = Object.values(projectMxPassFixtures).map(function (pass) { return ({
        kind: 'program', blobIndex: pass.blobIndex, platform: 9, gpuProgramType: 4,
        programHash: pass.programHash, programDataSha256: pass.programHash, programDataLength: pass.programDataLength,
        recordSha256: pass.programRecordSha256, glsl: projectMxSourceGlsl(pass.attributes, pass.uniforms),
    }); });
    shader.extraction = {
        schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: rendering_profile_1.PROJECTMX_WEAPON_FINGERPRINT,
        compressedBlobSha256: rendering_profile_1.PROJECTMX_WEAPON_PROGRAM_BLOB_SHA256,
        shader: { name: 'ProjectMX/WeaponTest1Damage', sourceReference: structuredClone(rendering_profile_1.PROJECTMX_WEAPON_SOURCE_REFERENCE), keywordNames: __spreadArray([], rendering_profile_1.PROJECTMX_WEAPON_SHADER_KEYWORDS, true) },
        programs: programs,
        gles3Programs: structuredClone(programs),
        bindings: Object.values(projectMxPassFixtures).map(function (pass) { return ({
            subShaderIndex: 0, passIndex: pass.passIndex, passName: '', stateName: pass.stateName, stage: 'vertex', blobIndex: pass.blobIndex,
            parameterBlobIndex: pass.parameterBlobIndex, platform: 9, gpuProgramType: 4,
            keywordIndices: __spreadArray([], pass.keywordIndices, true), keywordNames: __spreadArray([], pass.keywordNames, true), programHash: pass.programHash,
            gles3ProgramHash: pass.programHash, programRecordSha256: pass.programRecordSha256, parameterRecordSha256: pass.parameterRecordSha256,
        }); }),
    };
    return fixture;
}
function makeDsfxCandidate(rule, options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var fixture = makeCandidate((_a = options.identity) !== null && _a !== void 0 ? _a : 'dsfx_fixture', [(_b = options.materialName) !== null && _b !== void 0 ? _b : 'DSFX_FX']);
    var material = fixture.candidate.sourceMaterials[0];
    var shader = fixture.candidate.shaders[0];
    var textureReference = reference(hash('f'), 'CAB-textures', '300');
    var alphaBlendAdd = rule.identity === 'dsfx/fx_shader_alphablend_add';
    var alphaBlendVariant = (rule.identity === 'dsfx/fx_shader_alphablend_0' || alphaBlendAdd)
        && options.renderStateVariant !== undefined && options.renderStateVariant !== 'static-default';
    var exactDsfxSourceState = rule.identity === 'dsfx/fx_shader_additive_0' || alphaBlendAdd;
    var passState = function (pass) { return (__assign({ m_Name: pass.name, rtBlend0: {
            srcBlend: { val: pass.states.srcBlend },
            destBlend: { val: pass.states.destinationBlend },
            srcBlendAlpha: { val: pass.states.sourceBlendAlpha },
            destBlendAlpha: { val: pass.states.destinationBlendAlpha },
            blendOp: { val: pass.states.blendOperation },
            blendOpAlpha: { val: pass.states.blendOperationAlpha },
            colMask: { val: pass.name === 'Forward' ? 15 : 0 },
        }, zTest: exactDsfxSourceState
            ? { val: pass.states.zTest, name: pass.name === 'Forward' ? '_ZTest_Mode' : '<noninit>' }
            : alphaBlendVariant ? { val: pass.states.zTest, name: '_ZTest_Mode' } : { val: pass.states.zTest }, zWrite: exactDsfxSourceState
            ? { val: pass.states.zWrite, name: pass.name === 'Forward' ? '_ZWrite_Mode' : '<noninit>' }
            : { val: pass.states.zWrite }, culling: exactDsfxSourceState || alphaBlendVariant ? { val: pass.states.culling, name: '_Cull_Mode' } : { val: pass.states.culling }, offsetFactor: exactDsfxSourceState
            ? { val: pass.states.offsetFactor, name: pass.name === 'Forward' ? '_ZOffsetFactor' : '<noninit>' }
            : { val: pass.states.offsetFactor }, offsetUnits: exactDsfxSourceState
            ? { val: pass.states.offsetUnits, name: pass.name === 'Forward' ? '_ZOffsetUnits' : '<noninit>' }
            : { val: pass.states.offsetUnits }, lighting: pass.states.lighting }, (exactDsfxSourceState ? { m_Tags: { tags: pass.name === 'Forward'
                ? [['LIGHTMODE', 'UniversalForward'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'], ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque']]
                : [['LIGHTMODE', 'SHADOWCASTER'], ['PreviewType', 'Plane'], ['QUEUE', 'Transparent'], ['RenderPipeline', 'UniversalPipeline'], ['RenderType', 'Opaque']] } } : {}))); };
    material.shaderName = rule.identity;
    material.shaderParsedName = rule.identity;
    material.shaderReference = structuredClone(rule.sourceReference);
    material.shader = { file: rule.sourceReference.serializedFile, pathId: rule.sourceReference.objectId };
    material.renderQueue = 3000;
    material.keywords = [];
    material.colorProperties = { _Color: { r: 0.25, g: 0.5, b: 0.75, a: 0.8 } };
    var staticFloats = __assign(__assign({ _Custom_Data_Offset_Use: 0, _ZWrite_Mode: 0, _Cull_Mode: options.renderStateVariant === 'depth-tested-off-double-sided' ? 0 : 2, _ZOffsetFactor: 0, _ZOffsetUnits: 0, _ZTest_Mode: alphaBlendVariant ? 4 : 4 }, (rule.propertyNames.includes('_Multiply') ? { _Multiply: 1, _RGBRGBA: 0, _Main_Texture_No: alphaBlendAdd ? 0 : 1 } : {})), options.floats);
    material.floatProperties = staticFloats;
    material.intProperties = {};
    material.textures = options.missingTexture ? [{ name: '_Texture', texture: null, textureReference: null, scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } }] : [{
            name: '_Texture', texture: { file: textureReference.serializedFile, pathId: textureReference.objectId },
            textureReference: textureReference,
            scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
        }];
    material.resolvedTextures = options.missingTexture ? [] : [{
            property: '_Texture', name: 'DSFX_Texture', width: 256, height: 256, sourceReference: textureReference,
            scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
        }];
    shader.parsedName = rule.identity;
    shader.sourceReference = structuredClone(rule.sourceReference);
    shader.programBlobSha256 = rule.programBlobSha256;
    shader.properties = { m_Props: rule.propertyNames.map(function (m_Name) { return ({ m_Name: m_Name }); }) };
    shader.subShaders = [{ passes: rule.passes.map(function (pass) { return ({ type: 0, state: passState(pass) }); }) }];
    if (rule.identity === 'dsfx/fx_shader_alphablend_0') {
        var forwardGlsl_1 = [
            '#version 300 es', 'uniform vec4 _Color;', 'uniform vec4 _Custom_Data_Offset_Use;',
            'uniform vec4 _Texture_ST;', 'uniform sampler2D _Texture;',
        ].join('\n');
        var shadowGlsl_1 = [
            '#version 300 es', 'uniform vec4 _ShadowBias;', 'uniform vec3 _LightDirection;',
            'uniform vec4 _ShadowCoordModifier;', 'uniform mat4 hlslcc_mtx4x4unity_MatrixVP;',
        ].join('\n');
        var programs = rendering_profile_1.DSFX_ALPHA_BLEND_0_GLES3_PROGRAMS.map(function (program, index) { return ({
            kind: 'program', blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
            programHash: program.programHash, programDataSha256: program.programHash,
            programDataLength: program.programDataLength, recordSha256: program.recordSha256,
            glsl: index < 2 ? forwardGlsl_1 : shadowGlsl_1,
        }); });
        shader.extraction = {
            schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3', fingerprint: hash('8'),
            compressedBlobSha256: rule.programBlobSha256,
            shader: { name: 'DSFX/FX_SHADER_AlphaBlend_0', sourceReference: structuredClone(rule.sourceReference), keywordNames: [] },
            programs: programs,
            gles3Programs: programs,
            bindings: programs.map(function (program, index) { return ({
                subShaderIndex: 0, passIndex: index < 2 ? 0 : 1,
                passName: index < 2 ? 'Forward' : 'ShadowCaster', stateName: index < 2 ? 'Forward' : 'ShadowCaster',
                stage: 'vertex', blobIndex: program.blobIndex, parameterBlobIndex: index,
                platform: 9, gpuProgramType: 4, keywordIndices: [], keywordNames: [],
                programHash: program.programHash, gles3ProgramHash: program.programHash,
                programRecordSha256: program.recordSha256,
            }); }),
        };
    }
    else if (rule.identity === 'dsfx/fx_shader_additive_0' || rule.identity === 'dsfx/fx_shader_alphablend_add') {
        var attributeName_1 = function (attribute) { return attribute === 'POSITION' ? 'in_POSITION0'
            : attribute === 'TEXCOORD_0' ? 'in_TEXCOORD0' : attribute === 'TEXCOORD_1' ? 'in_TEXCOORD1'
                : attribute === 'COLOR_0' ? 'in_COLOR0' : attribute === 'NORMAL' ? 'in_NORMAL0' : "in_".concat(attribute); };
        var sourceGlsl_1 = function (attributes, uniforms, length) {
            var source = __spreadArray(__spreadArray(__spreadArray([
                '#ifdef VERTEX', '#version 300 es'
            ], attributes.map(function (attribute) { return "in vec4 ".concat(attributeName_1(attribute), ";"); }), true), uniforms.map(function (uniform) { return "uniform float ".concat(uniform, ";"); }), true), [
                '#endif', '#ifdef FRAGMENT', '#version 300 es',
                'void main() {}', '#endif',
            ], false).join('\n');
            return source.padEnd(length, ' ');
        };
        var expectedPrograms_1 = rule.identity === 'dsfx/fx_shader_alphablend_add' ? rendering_profile_1.DSFX_ALPHA_BLEND_ADD_GLES3_PROGRAMS : rendering_profile_1.DSFX_ADDITIVE_0_GLES3_PROGRAMS;
        var programs = expectedPrograms_1.map(function (program, index) { return ({
            kind: 'program', blobIndex: program.blobIndex, platform: 9, gpuProgramType: 4,
            programHash: program.programHash, programDataSha256: program.programHash, programDataLength: rule.identity === 'dsfx/fx_shader_alphablend_add' ? program.programDataLength : [
                rendering_profile_1.DSFX_ADDITIVE_0_FORWARD_PROGRAM_DATA_LENGTH, rendering_profile_1.DSFX_ADDITIVE_0_FORWARD_INSTANCED_PROGRAM_DATA_LENGTH,
                rendering_profile_1.DSFX_ADDITIVE_0_SHADOW_PROGRAM_DATA_LENGTH, rendering_profile_1.DSFX_ADDITIVE_0_SHADOW_INSTANCED_PROGRAM_DATA_LENGTH,
            ][index], recordSha256: program.programRecordSha256,
            glsl: sourceGlsl_1(program.requiredAttributes, program.requiredUniforms, program.programDataLength),
        }); });
        shader.extraction = {
            schemaVersion: 1, extractorVersion: 1, unityVersion: '2021.3',
            fingerprint: rule.identity === 'dsfx/fx_shader_alphablend_add' ? rendering_profile_1.DSFX_ALPHA_BLEND_ADD_FINGERPRINT : rendering_profile_1.DSFX_ADDITIVE_0_FINGERPRINT,
            compressedBlobSha256: rule.programBlobSha256,
            shader: {
                name: rule.identity === 'dsfx/fx_shader_alphablend_add' ? rendering_profile_1.DSFX_ALPHA_BLEND_ADD_SHADER_NAME : rendering_profile_1.DSFX_ADDITIVE_0_SHADER_NAME,
                sourceReference: structuredClone(rule.identity === 'dsfx/fx_shader_alphablend_add' ? rendering_profile_1.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE : rendering_profile_1.DSFX_ADDITIVE_0_SOURCE_REFERENCE),
                keywordNames: __spreadArray([], (rule.identity === 'dsfx/fx_shader_alphablend_add' ? rendering_profile_1.DSFX_ALPHA_BLEND_ADD_SHADER_KEYWORDS : rendering_profile_1.DSFX_ADDITIVE_0_SHADER_KEYWORDS), true),
            },
            programs: programs,
            gles3Programs: structuredClone(programs),
            bindings: programs.map(function (program, index) {
                var expected = expectedPrograms_1[index];
                return {
                    subShaderIndex: 0, passIndex: expected.pass === 'forward' ? 0 : 1, passName: '', stateName: expected.stateName, stage: 'vertex',
                    blobIndex: expected.blobIndex, parameterBlobIndex: expected.parameterBlobIndex, platform: 9, gpuProgramType: 4,
                    keywordIndices: __spreadArray([], expected.keywordIndices, true), keywordNames: __spreadArray([], expected.keywordNames, true), programHash: expected.programHash,
                    gles3ProgramHash: expected.programHash, programRecordSha256: expected.programRecordSha256, parameterRecordSha256: expected.parameterRecordSha256,
                };
            }),
        };
    }
    return fixture;
}
function makeWakamoEyeAlphaBlendAddCandidate() {
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1];
    var fixture = makeDsfxCandidate(rule, { identity: 'wakamo_original', materialName: 'Wakamo_Original_Eye', renderStateVariant: 'depth-tested-back-cull' });
    var material = fixture.candidate.sourceMaterials[0];
    var shader = fixture.candidate.shaders[0];
    material.sourceReference = {
        bundleSha256: '46acf4c44d1cfbbdbdcc20d8227397323273739b1021442ddd77c6c4e4af3816',
        serializedFile: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6', objectId: '1142847250617954324',
    };
    fixture.candidate.assembly[0].renderers[0].materialSlots[0].material = {
        file: material.sourceReference.serializedFile,
        pathId: material.sourceReference.objectId,
    };
    fixture.candidate.assembly[0].renderers[0].materialSlots[0].sourceMaterialReference = structuredClone(material.sourceReference);
    material.shaderReference = structuredClone(rendering_profile_1.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE);
    material.shader = { file: rendering_profile_1.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.serializedFile, pathId: rendering_profile_1.DSFX_ALPHA_BLEND_ADD_SOURCE_REFERENCE.objectId };
    material.renderQueue = -1;
    material.floatProperties = {
        _AlphaClip: 0, _Blend: 0, _BumpScale: 1, _Cull: 2, _Cull_Mode: 2, _Custom_Data_Offset_Use: 1,
        _Cutoff: 0.5, _DetailNormalMapScale: 1, _DstBlend: 0, _GlossMapScale: 1, _Glossiness: 0,
        _GlossyReflections: 1, _Main_Texture_No: 1, _Metallic: 0, _Multiply: 1, _OcclusionStrength: 1,
        _Parallax: 0.019999999552965164, _RGBRGBA: 0, _SmoothnessTextureChannel: 0, _SpecularHighlights: 1,
        _SrcBlend: 1, _Surface: 0, _UVSec: 0, _WorkflowMode: 1, _ZOffsetFactor: 0, _ZOffsetUnits: 0,
        _ZTest_Mode: 4, _ZWrite: 1, _ZWrite_Mode: 0,
    };
    material.intProperties = {};
    material.colorProperties = {
        _Color: { r: 6.264151096343994, g: 1.3296549320220947, b: 1.3296549320220947, a: 1 },
        _EmissionColor: { r: 0, g: 0, b: 0, a: 0 },
        _SpecColor: { r: 0.19999995827674866, g: 0.19999995827674866, b: 0.19999995827674866, a: 1 },
    };
    material.textures = [{
            name: '_Texture', texture: { file: 'CAB-0ff8a11237bb688b3a3deddb961cd2a6', pathId: '0' }, textureReference: null,
            scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
        }];
    material.resolvedTextures = [];
    shader.properties = { m_Props: rule.propertyNames.map(function (m_Name) { return (__assign({ m_Name: m_Name }, (m_Name === '_Texture' ? { m_DefTexture: { m_DefaultName: 'white', m_TexDim: 2 } } : {}))); }) };
    return fixture;
}
function makeBuiltinCandidate() {
    var fixture = makeCandidate('example', ['Example_Body']);
    var renderer = fixture.candidate.assembly[0].renderers[0];
    renderer.rendererType = 'MeshRenderer';
    renderer.mesh = {
        file: inventory_1.UNITY_BUILTIN_RESOURCES_FILE, pathId: inventory_1.UNITY_BUILTIN_QUAD_PATH_ID, externalGuid: inventory_1.UNITY_BUILTIN_RESOURCES_GUID,
        builtinResource: {
            kind: 'unity-builtin-resource', guid: inventory_1.UNITY_BUILTIN_RESOURCES_GUID,
            file: inventory_1.UNITY_BUILTIN_RESOURCES_FILE, pathId: inventory_1.UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad',
        },
    };
    renderer.meshSourceReference = null;
    return fixture;
}
function setMouthGridEvidence(candidate, options) {
    var _a, _b, _c, _d, _e, _f;
    var material = candidate.sourceMaterials.find(function (item) { return /eyemouth/i.test(item.name); });
    var shader = candidate.shaders.find(function (item) { return item.sourceReference
        && material.shaderReference
        && (0, rendering_profile_1.sourceObjectKey)(item.sourceReference) === (0, rendering_profile_1.sourceObjectKey)(material.shaderReference); });
    var atlas = material.resolvedTextures.find(function (item) { return item.property === '_MouthTileTex'; });
    material.floatProperties = __assign(__assign({}, material.floatProperties), { _MouthTileCols: options.serializedColumns, _MouthTileRows: options.serializedRows });
    atlas.width = (_a = options.width) !== null && _a !== void 0 ? _a : 512;
    atlas.height = (_b = options.height) !== null && _b !== void 0 ? _b : 512;
    shader.parsedName = (_c = options.shaderIdentity) !== null && _c !== void 0 ? _c : 'MX/C-EyesMouth';
    var properties = shader.properties;
    shader.properties = { m_Props: __spreadArray(__spreadArray([], ((_d = properties === null || properties === void 0 ? void 0 : properties.m_Props) !== null && _d !== void 0 ? _d : []), true), [
            { m_Name: '_MouthTileCols', 'm_DefValue[0]': (_e = options.shaderColumns) !== null && _e !== void 0 ? _e : 8 },
            { m_Name: '_MouthTileRows', 'm_DefValue[0]': (_f = options.shaderRows) !== null && _f !== void 0 ? _f : 8 },
        ], false) };
}
(0, node_test_1.default)('resolves shader pass literals, material properties, shader defaults, and missing properties', function () {
    var material = { name: 'fixture', pathId: '1', file: 'CAB-materials', shader: null, renderQueue: -1, keywords: [], textures: [], floatProperties: { _ZWrite: 0 }, intProperties: {} };
    var shader = { name: 'fixture', pathId: '1', file: 'CAB-shaders', properties: { m_Props: [{ m_Name: '_ZTest', 'm_DefValue[0]': 4 }] } };
    strict_1.default.deepEqual((0, rendering_profile_1.resolveShaderState)({ val: 5, name: '' }, material, shader), { value: 5, source: 'literal' });
    strict_1.default.deepEqual((0, rendering_profile_1.resolveShaderState)({ val: 1, name: '[_ZWrite]' }, material, shader), { value: 0, source: 'material', property: '_ZWrite' });
    strict_1.default.deepEqual((0, rendering_profile_1.resolveShaderState)(undefined, material, shader, '_ZTest'), { value: 4, source: 'shader-default', property: '_ZTest' });
    strict_1.default.deepEqual((0, rendering_profile_1.resolveShaderState)(undefined, material, shader, '_Unknown'), { value: null, source: 'unresolved', property: '_Unknown' });
});
(0, node_test_1.default)('recognizes the BAAD face, eye-mouth, eyebrow, hair, general, and weapon shader names', function () {
    var _a, _b;
    var _c = makeCandidate('haruna_original', [
        'Haruna_Body', 'Haruna_Face', 'Haruna_EyeMouth', 'Haruna_Hair', 'Haruna_Eyebrow', 'Haruna_Weapon',
    ], { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 } }), candidate = _c.candidate, prefabPath = _c.prefabPath;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Haruna'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal((_a = profile.assembly) === null || _a === void 0 ? void 0 : _a.prefabPath, prefabPath);
    strict_1.default.equal((_b = profile.assembly) === null || _b === void 0 ? void 0 : _b.renderers.length, 1);
    strict_1.default.deepEqual(profile.renderers[0].materialSlots.map(function (slot) { return slot.adapterId; }), [
        'mx-character-general', 'mx-character-face', 'mx-character-eyemouth', 'mx-character-hair', 'mx-character-eyebrow', 'mx-character-weapon',
    ]);
});
(0, node_test_1.default)('retains the exact typed Unity built-in Quad source identity in a valid profile', function () {
    var _a, _b;
    var _c = makeBuiltinCandidate(), candidate = _c.candidate, prefabPath = _c.prefabPath;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(profile.renderers[0].rendererType, 'MeshRenderer');
    strict_1.default.equal((_a = profile.renderers[0].sourceMesh) === null || _a === void 0 ? void 0 : _a.sourceReference, null);
    strict_1.default.deepEqual((_b = profile.renderers[0].sourceMesh) === null || _b === void 0 ? void 0 : _b.builtinResource, {
        kind: 'unity-builtin-resource', guid: inventory_1.UNITY_BUILTIN_RESOURCES_GUID,
        file: inventory_1.UNITY_BUILTIN_RESOURCES_FILE, pathId: inventory_1.UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad',
    });
});
(0, node_test_1.default)('accepts repeated built-in Quad renderer variants only with distinct exact renderer identities', function () {
    var _a = makeBuiltinCandidate(), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var assembly = candidate.assembly[0];
    var renderer = assembly.renderers[0];
    assembly.renderers.push(__assign(__assign({}, structuredClone(renderer)), { pathId: '9007199254740996', sourceReference: reference(hash('a'), 'CAB-prefab', '9007199254740996'), name: 'Example_Body_Alt', hierarchyPath: 'Cafe_Example/Example_Body_Alt' }));
    assembly.rendererOrder.push('Example_Body_Alt');
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(profile.renderers.filter(function (item) { var _a, _b; return ((_b = (_a = item.sourceMesh) === null || _a === void 0 ? void 0 : _a.builtinResource) === null || _b === void 0 ? void 0 : _b.name) === 'Quad'; }).length, 2);
});
(0, node_test_1.default)('omits exact null-mesh zero-material helpers while keeping nonzero and ambiguous meshes blocked', function () {
    var inert = makeCandidate('asuna_original', ['Asuna_Body']);
    var assembly = inert.candidate.assembly[0];
    var renderableRenderer = assembly.renderers[0];
    var inertReference = reference(hash('z'), 'CAB-prefab', '9007199254740997');
    var inertRenderer = __assign(__assign({}, structuredClone(renderableRenderer)), { name: 'Box001', pathId: inertReference.objectId, sourceReference: inertReference, hierarchyPath: 'Cafe_Asuna_Original/Box001' });
    inertRenderer.mesh = { file: inertReference.serializedFile, pathId: '0' };
    inertRenderer.meshSourceReference = null;
    inertRenderer.materialSlots = [{ slot: 0, material: { file: inertReference.serializedFile, pathId: '0' }, sourceMaterialReference: null }];
    assembly.renderers.push(inertRenderer);
    assembly.rendererOrder.push(inertRenderer.name);
    inert.candidate.events = [{
            clip: 'Asuna_Cafe_Idle', time: 0, function: 'AniEvt_EnableChildRenderer', string: '', float: 0, int: 4,
            targetReference: inertReference,
        }];
    var inertInteraction = (0, types_1.emptyChibiProfile)('Asuna');
    inertInteraction.initialPose = 'Asuna_Cafe_Idle';
    inertInteraction.interactions.idle = { state: 'available', clip: 'Asuna_Cafe_Idle', loop: true, hold: false };
    var inertProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(inert.candidate, inert.prefabPath, inertInteraction);
    strict_1.default.equal(inertProfile.validation.valid, true, inertProfile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(inertProfile.renderers.map(function (renderer) { return renderer.name; }), [renderableRenderer.name]);
    strict_1.default.deepEqual(inertProfile.childRendererEvents, []);
    strict_1.default.deepEqual(inertProfile.excludedRenderers.map(function (renderer) { return renderer.name; }), ['Box001']);
    strict_1.default.match(inertProfile.excludedRenderers[0].evidence.join(' | '), /exact null pointer/);
    strict_1.default.equal(inertProfile.excludedChildRendererEvents.length, 1);
    strict_1.default.equal(inertProfile.drawSequence.length, 1);
    var nonzero = makeCandidate('asuna_original', ['Asuna_Body']);
    nonzero.candidate.assembly[0].renderers[0].mesh = { file: 'CAB-prefab', pathId: '9007199254740995' };
    nonzero.candidate.assembly[0].renderers[0].meshSourceReference = null;
    nonzero.candidate.assembly[0].renderers[0].materialSlots = [];
    var nonzeroProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(nonzero.candidate, nonzero.prefabPath, (0, types_1.emptyChibiProfile)('Asuna'));
    strict_1.default.equal(nonzeroProfile.validation.valid, false);
    strict_1.default.match(nonzeroProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/);
    var ambiguous = makeCandidate('asuna_original', ['Asuna_Body']);
    ambiguous.candidate.assembly[0].renderers[0].mesh = { file: 'CAB-prefab', pathId: '0', externalGuid: 'f'.repeat(32) };
    ambiguous.candidate.assembly[0].renderers[0].meshSourceReference = null;
    ambiguous.candidate.assembly[0].renderers[0].materialSlots = [];
    var ambiguousProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(ambiguous.candidate, ambiguous.prefabPath, (0, types_1.emptyChibiProfile)('Asuna'));
    strict_1.default.equal(ambiguousProfile.validation.valid, false);
    strict_1.default.match(ambiguousProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/);
});
(0, node_test_1.default)('reports an exact null source mesh on a material-bearing core renderer without allowing publication', function () {
    var fixture = makeCandidate('asuna_original', ['Asuna_Body']);
    var renderer = fixture.candidate.assembly[0].renderers[0];
    var rendererReference = renderer.sourceReference;
    renderer.mesh = { file: rendererReference.serializedFile, pathId: '0' };
    renderer.meshSourceReference = null;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('Asuna'));
    strict_1.default.equal(profile.validation.valid, false);
    var diagnostic = profile.validation.unresolved.find(function (value) { return value.includes('exact null source mesh pointer'); });
    strict_1.default.ok(diagnostic);
    strict_1.default.match(diagnostic, /Core renderer Cafe_Asuna_Original\/Asuna_Original_Body/);
    strict_1.default.ok(diagnostic.includes("cab-prefab#".concat(rendererReference.objectId)));
    strict_1.default.match(diagnostic, /cab-prefab:0/);
    strict_1.default.doesNotMatch(diagnostic, /ambiguous source mesh reference/);
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === rendererReference.objectId; }), false);
});
(0, node_test_1.default)('rejects unknown built-in IDs, pathId 0, and skinned Quad renderers', function () {
    var unknown = makeBuiltinCandidate();
    unknown.candidate.assembly[0].renderers[0].mesh.externalGuid = 'f'.repeat(32);
    unknown.candidate.assembly[0].renderers[0].mesh.builtinResource = {
        kind: 'unity-builtin-resource', guid: 'f'.repeat(32),
        file: inventory_1.UNITY_BUILTIN_RESOURCES_FILE, pathId: inventory_1.UNITY_BUILTIN_QUAD_PATH_ID, name: 'Quad',
    };
    var unknownProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(unknown.candidate, unknown.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(unknownProfile.validation.valid, false);
    strict_1.default.match(unknownProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/);
    var zero = makeBuiltinCandidate();
    zero.candidate.assembly[0].renderers[0].mesh.pathId = '0';
    zero.candidate.assembly[0].renderers[0].mesh.builtinResource = {
        kind: 'unity-builtin-resource', guid: inventory_1.UNITY_BUILTIN_RESOURCES_GUID,
        file: inventory_1.UNITY_BUILTIN_RESOURCES_FILE, pathId: '0', name: 'Quad',
    };
    var zeroProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(zero.candidate, zero.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(zeroProfile.validation.valid, false);
    strict_1.default.match(zeroProfile.validation.unresolved.join(' '), /ambiguous source mesh reference/);
    var skinned = makeBuiltinCandidate();
    skinned.candidate.assembly[0].renderers[0].rendererType = 'SkinnedMeshRenderer';
    var skinnedProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(skinned.candidate, skinned.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(skinnedProfile.validation.valid, false);
    strict_1.default.match(skinnedProfile.validation.unresolved.join(' '), /must be an unskinned MeshRenderer/);
});
(0, node_test_1.default)('uses the declared shader tint and ignores stale serialized color fields', function () {
    var _a = makeCandidate('aru_original', ['Aru_Face']), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var material = candidate.sourceMaterials[0];
    material.colorProperties = {
        _Color: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
        _Tint: { r: 0.92, g: 0.81, b: 0.73, a: 1 },
    };
    candidate.shaders[0].properties = { m_Props: [
            { m_Name: '_Tint', 'm_DefValue[0]': 1, 'm_DefValue[1]': 1, 'm_DefValue[2]': 1, 'm_DefValue[3]': 1 },
        ] };
    var explicit = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Aru'));
    strict_1.default.deepEqual(explicit.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [0.92, 0.81, 0.73, 1]);
    delete material.colorProperties._Tint;
    var defaults = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Aru'));
    strict_1.default.deepEqual(defaults.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [1, 1, 1, 1]);
});
(0, node_test_1.default)('does not use a serialized tint unless the linked shader declares it', function () {
    var _a = makeCandidate('example', ['Example_Face']), candidate = _a.candidate, prefabPath = _a.prefabPath;
    candidate.sourceMaterials[0].colorProperties = { _Color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } };
    candidate.shaders[0].properties = { m_Props: [{ m_Name: '_Tint', 'm_DefValue[0]': 1, 'm_DefValue[1]': 1, 'm_DefValue[2]': 1, 'm_DefValue[3]': 1 }] };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.deepEqual(profile.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [1, 1, 1, 1]);
});
(0, node_test_1.default)('maps source-proven simple unlit shaders to native output and uses only declared color', function () {
    var _a = makeCandidate('example', ['Example_Body']), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var material = candidate.sourceMaterials[0];
    var shader = candidate.shaders[0];
    material.shaderParsedName = 'FX/General Unlit Texture';
    material.colorProperties = {
        _Color: { r: 0.2, g: 0.4, b: 0.6, a: 0.8 },
        _Tint: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
    };
    material.floatProperties = __assign(__assign({}, material.floatProperties), { _ZWrite: 1 });
    shader.parsedName = material.shaderParsedName;
    shader.properties = { m_Props: [
            { m_Name: '_SrcBlend' }, { m_Name: '_DstBlend' }, { m_Name: '_SrcBlendAlpha' }, { m_Name: '_DstBlendAlpha' },
            { m_Name: '_ZWrite' }, { m_Name: '_ZTest' }, { m_Name: '_Cull' }, { m_Name: '_ZOffsetFactor' }, { m_Name: '_ZOffsetUnits' },
            { m_Name: '_Color' }, { m_Name: '_MainTex' },
        ] };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterId, 'gltf-native');
    strict_1.default.deepEqual(profile.renderers[0].materialSlots[0].adapterSettings.baseColorTint, [0.2, 0.4, 0.6, 0.8]);
});
(0, node_test_1.default)('keeps simple-unlit mapping blocked when extracted shader properties prove a custom effect', function () {
    var _a = makeCandidate('example', ['Example_Body']), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var shader = candidate.shaders[0];
    candidate.sourceMaterials[0].shaderParsedName = 'FX/General Unlit Texture';
    shader.parsedName = 'FX/General Unlit Texture';
    shader.properties = { m_Props: [{ m_Name: '_MainTex' }, { m_Name: '_MaskTex' }] };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /Unsupported source shader FX\/General Unlit Texture/);
});
(0, node_test_1.default)('recognizes only the verified BAAD custom shader versions and blocks non-native behavior', function () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    for (var _i = 0, CHIBI_CUSTOM_SHADER_ADAPTER_RULES_1 = rendering_profile_1.CHIBI_CUSTOM_SHADER_ADAPTER_RULES; _i < CHIBI_CUSTOM_SHADER_ADAPTER_RULES_1.length; _i++) {
        var rule = CHIBI_CUSTOM_SHADER_ADAPTER_RULES_1[_i];
        if (rule.id === 'dsfx-matcap')
            continue;
        var _j = rule.id === 'mx-e-standard' ? makeEStandardCandidate() : makeCustomShaderCandidate(rule), candidate = _j.candidate, prefabPath = _j.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Custom'));
        var slot = profile.renderers[0].materialSlots[0];
        if (rule.id === 'projectmx-weapon-test1-damage')
            continue;
        if (rule.id === 'mx-e-standard') {
            strict_1.default.equal(slot.adapterId, rule.id);
            strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
            strict_1.default.equal((_a = slot.eStandardShaderExtraction) === null || _a === void 0 ? void 0 : _a.activeVariant, 'dynamic');
            continue;
        }
        strict_1.default.equal(slot.adapterId, rule.id);
        if (rule.id === 'mx-c-transparent-st') {
            strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
            strict_1.default.equal((_b = slot.transparentShaderExtraction) === null || _b === void 0 ? void 0 : _b.passes.forward.programHash, rendering_profile_1.MX_C_TRANSPARENT_ST_FORWARD_PROGRAM_HASH);
            strict_1.default.equal((_c = slot.transparentShaderExtraction) === null || _c === void 0 ? void 0 : _c.passes.dither.programHash, rendering_profile_1.MX_C_TRANSPARENT_ST_DITHER_PROGRAM_HASH);
            strict_1.default.equal((_d = slot.transparentShaderExtraction) === null || _d === void 0 ? void 0 : _d.passes.depth.programHash, rendering_profile_1.MX_C_TRANSPARENT_ST_DEPTH_PROGRAM_HASH);
            strict_1.default.equal(slot.adapterSettings.transparentVariant, 'forward');
            strict_1.default.equal(slot.renderState.depthWrite, false);
            strict_1.default.deepEqual(slot.renderState.blend, {
                source: 5, destination: 10, sourceAlpha: 1, destinationAlpha: 10, operation: 0, operationAlpha: 0,
            });
            continue;
        }
        if (rule.id === 'mx-unlit-outline') {
            strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
            strict_1.default.deepEqual((_e = slot.shaderExtraction) === null || _e === void 0 ? void 0 : _e.passes.base, {
                pass: 'base', stateName: 'ForwardLit', subShaderIndex: 0, passIndex: 0, stage: 'vertex', platform: 9,
                gpuProgramType: 4, blobIndex: 1, parameterBlobIndex: 0, parameterRecordSha256: hash('3'),
                keywordIndices: [], keywordNames: [], programHash: rendering_profile_1.MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH,
                programDataSha256: rendering_profile_1.MX_UNLIT_OUTLINE_BASE_PROGRAM_HASH, programRecordSha256: hash('1'),
                glsl: slot.shaderExtraction.passes.base.glsl,
                requiredAttributes: ['POSITION', 'TEXCOORD_0'], requiredUniforms: ['_MainTex_ST', '_Tint', '_MainTex'],
                renderState: { zWrite: 1, zTest: 4, culling: 0 },
            });
            strict_1.default.equal((_f = slot.shaderExtraction) === null || _f === void 0 ? void 0 : _f.passes.outline.programHash, rendering_profile_1.MX_UNLIT_OUTLINE_OUTLINE_PROGRAM_HASH);
            strict_1.default.equal((_g = slot.shaderExtraction) === null || _g === void 0 ? void 0 : _g.passes.outline.blobIndex, 6);
            strict_1.default.equal((_h = slot.shaderExtraction) === null || _h === void 0 ? void 0 : _h.passes.outline.renderState.culling, 1);
            strict_1.default.deepEqual(slot.adapterSettings.outlineTint, [0.2641509175300598, 0.2641509175300598, 0.2641509175300598, 1]);
            strict_1.default.equal(slot.adapterSettings.outlineZCorrection, 0);
            continue;
        }
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), new RegExp("".concat(rule.behavior, ".*glTF-native output cannot preserve")));
        strict_1.default.match(profile.validation.unresolved.join(' '), new RegExp("Viewer runtime adapter ".concat(rule.id, " is required")));
    }
});
(0, node_test_1.default)('accepts both exact E-Standard variants and rejects non-boolean source lighting state', function () {
    var _a;
    for (var _i = 0, _b = ['static', 'dynamic']; _i < _b.length; _i++) {
        var activeVariant = _b[_i];
        var _c = makeEStandardCandidate(activeVariant), candidate = _c.candidate, prefabPath = _c.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('E-Standard'));
        var slot = profile.renderers[0].materialSlots[0];
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.equal(slot.adapterId, 'mx-e-standard');
        strict_1.default.equal((_a = slot.eStandardShaderExtraction) === null || _a === void 0 ? void 0 : _a.activeVariant, activeVariant);
    }
    var tampered = makeEStandardCandidate();
    var forwardState = tampered.candidate.shaders[0].subShaders[0].passes[0].state;
    forwardState.lighting = 0;
    var blocked = (0, rendering_profile_1.buildChibiRenderingProfile)(tampered.candidate, tampered.prefabPath, (0, types_1.emptyChibiProfile)('E-Standard'));
    strict_1.default.equal(blocked.validation.valid, false);
    strict_1.default.match(blocked.validation.unresolved.join(' '), /lighting state is not false/);
});
(0, node_test_1.default)('fails closed for MX/Unlit Outline identity, pass, hash, and keyword mismatches', function () {
    var tampered = function (change, expected) {
        var rule = rendering_profile_1.CHIBI_CUSTOM_SHADER_ADAPTER_RULES.find(function (item) { return item.id === 'mx-unlit-outline'; });
        var _a = makeCustomShaderCandidate(rule), candidate = _a.candidate, prefabPath = _a.prefabPath;
        change(candidate.shaders[0]);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Custom'));
        strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterId, 'mx-unlit-outline');
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), expected);
    };
    tampered(function (shader) { shader.extraction.shader.name = 'MX/Unlit Outline/Unverified'; }, /extraction identity is not MX\/Unlit Outline/);
    tampered(function (shader) { shader.extraction.bindings[1].stateName = 'Forward'; }, /outline pass has 0 exact GLES3 no-keyword bindings/);
    tampered(function (shader) { shader.extraction.gles3Programs[0].programDataSha256 = '0'.repeat(64); }, /base pass program hash does not match/);
    tampered(function (shader) { shader.extraction.bindings[1].keywordNames = ['FOG_LINEAR']; }, /outline pass selects shader keywords/);
});
(0, node_test_1.default)('does not trust a custom shader name when its source program identity changes', function () {
    var rule = rendering_profile_1.CHIBI_CUSTOM_SHADER_ADAPTER_RULES[0];
    var _a = makeCustomShaderCandidate(rule), candidate = _a.candidate, prefabPath = _a.prefabPath;
    candidate.shaders[0].programBlobSha256 = '0'.repeat(64);
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Custom'));
    var slot = profile.renderers[0].materialSlots[0];
    strict_1.default.equal(slot.adapterId, null);
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /not verified for adapter mx-c-transparent-st.*program identity does not match/);
    strict_1.default.doesNotMatch(profile.validation.unresolved.join(' '), /gltf-native output/);
});
(0, node_test_1.default)('accepts only the exact source Glitch_Tex Forward/Shadow program pair and material state', function () {
    var _a, _b, _c;
    var _d = makeGlitchTexCandidate(), candidate = _d.candidate, prefabPath = _d.prefabPath;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Glitch'));
    var slot = profile.renderers[0].materialSlots[0];
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(slot.adapterId, 'dsfx-glitch-tex');
    strict_1.default.equal((_a = slot.glitchShaderExtraction) === null || _a === void 0 ? void 0 : _a.passes.forward.programHash, rendering_profile_1.DSFX_GLITCH_TEX_FORWARD_PROGRAM_HASH);
    strict_1.default.equal((_b = slot.glitchShaderExtraction) === null || _b === void 0 ? void 0 : _b.passes.shadow.programHash, rendering_profile_1.DSFX_GLITCH_TEX_SHADOW_PROGRAM_HASH);
    strict_1.default.deepEqual(slot.materialProperties.floats, { _Cull_Mode: 2, _Glitch_value: 0.30000001192092896, _Jitter: 0.5, _Shaking: 2, _Speed_Value: 4, _x: 3, _y: 12 });
    strict_1.default.deepEqual((_c = slot.materialProperties.textures) === null || _c === void 0 ? void 0 : _c.map(function (texture) { var _a, _b; return [texture.name, (_b = (_a = texture.textureReference) === null || _a === void 0 ? void 0 : _a.objectId) !== null && _b !== void 0 ? _b : null]; }), [['_MainTex', null], ['_NoiseTex', '277634516359511144']]);
    strict_1.default.equal(slot.renderState.depthTest, true);
    strict_1.default.equal(slot.renderState.cullMode, 'back');
    strict_1.default.deepEqual(slot.renderState.blend, { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 });
});
(0, node_test_1.default)('fails closed for Glitch_Tex blob, active-keyword, pass, and exact-noise tampering', function () {
    var tampered = function (change, expected) {
        var _a = makeGlitchTexCandidate(), candidate = _a.candidate, prefabPath = _a.prefabPath;
        change(candidate);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Glitch'));
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), expected);
    };
    tampered(function (candidate) { candidate.shaders[0].programBlobSha256 = '0'.repeat(64); }, /not verified for adapter dsfx-glitch-tex.*source extraction metadata|program identity/);
    tampered(function (candidate) { candidate.sourceMaterials[0].keywords = ['INSTANCING_ON']; }, /not verified for adapter dsfx-glitch-tex.*shader keywords are active/);
    tampered(function (candidate) { candidate.shaders[0].extraction.bindings[1].stateName = 'Forward'; }, /not verified for adapter dsfx-glitch-tex.*source extraction Glitch_Tex shadow record/);
    tampered(function (candidate) { candidate.sourceMaterials[0].textures[1].textureReference.objectId = '999'; }, /not verified for adapter dsfx-glitch-tex.*_NoiseTex does not match/);
});
(0, node_test_1.default)('accepts only the exact DSFX Matcap shader extraction and material state', function () {
    var _a, _b, _c, _d, _e, _f;
    var _g = makeMatcapCandidate(), candidate = _g.candidate, prefabPath = _g.prefabPath;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Matcap'));
    var slot = profile.renderers[0].materialSlots[0];
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(slot.adapterId, 'dsfx-matcap');
    strict_1.default.equal((_a = slot.matcapShaderExtraction) === null || _a === void 0 ? void 0 : _a.passes.forward.programHash, rendering_profile_1.DSFX_MATCAP_FORWARD_STATIC_PROGRAM_HASH);
    strict_1.default.equal((_b = slot.matcapShaderExtraction) === null || _b === void 0 ? void 0 : _b.passes.forwardInstanced.programHash, rendering_profile_1.DSFX_MATCAP_FORWARD_INSTANCED_PROGRAM_HASH);
    strict_1.default.equal((_c = slot.matcapShaderExtraction) === null || _c === void 0 ? void 0 : _c.passes.shadow.programHash, rendering_profile_1.DSFX_MATCAP_SHADOW_STATIC_PROGRAM_HASH);
    strict_1.default.equal((_d = slot.matcapShaderExtraction) === null || _d === void 0 ? void 0 : _d.passes.shadowInstanced.programHash, rendering_profile_1.DSFX_MATCAP_SHADOW_INSTANCED_PROGRAM_HASH);
    strict_1.default.deepEqual(slot.materialProperties.floats, __assign(__assign({}, rendering_profile_1.DSFX_MATCAP_INERT_FLOAT_PROPERTIES), { _ZWrite_Mode: 1, _Cull_Mode: 2 }));
    strict_1.default.deepEqual(slot.materialProperties.colors, __assign(__assign({}, rendering_profile_1.DSFX_MATCAP_INERT_COLOR_PROPERTIES), { _Main_Color: {
            r: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[0], g: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[1], b: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[2], a: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[3],
        } }));
    strict_1.default.deepEqual((_e = slot.materialProperties.colors) === null || _e === void 0 ? void 0 : _e._Main_Color, {
        r: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[0], g: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[1], b: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[2], a: rendering_profile_1.DSFX_MATCAP_MAIN_COLOR[3],
    });
    strict_1.default.deepEqual((_f = slot.materialProperties.textures) === null || _f === void 0 ? void 0 : _f.map(function (texture) { var _a, _b; return [texture.name, (_b = (_a = texture.textureReference) === null || _a === void 0 ? void 0 : _a.objectId) !== null && _b !== void 0 ? _b : null]; }), [
        ['_Main_Tex', rendering_profile_1.DSFX_MATCAP_MAIN_TEXTURE_REFERENCE.objectId], ['_Matcap_Tex', rendering_profile_1.DSFX_MATCAP_MATCAP_TEXTURE_REFERENCE.objectId], ['_texcoord', null],
    ]);
    strict_1.default.deepEqual(slot.adapterSettings.baseColorTint, __spreadArray([], rendering_profile_1.DSFX_MATCAP_MAIN_COLOR, true));
    strict_1.default.equal(slot.renderState.sourceQueue, -1);
    strict_1.default.equal(slot.renderState.depthWrite, true);
    strict_1.default.equal(slot.renderState.cullMode, 'back');
    strict_1.default.deepEqual(slot.renderState.blend, { source: 5, destination: 10, sourceAlpha: 5, destinationAlpha: 10, operation: 0, operationAlpha: 0 });
});
(0, node_test_1.default)('fails closed for DSFX Matcap extraction, material, source-state, and queue tampering', function () {
    var tampered = function (change, expected) {
        var _a = makeMatcapCandidate(), candidate = _a.candidate, prefabPath = _a.prefabPath;
        change(candidate);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Matcap'));
        strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterId, 'dsfx-matcap');
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), expected);
    };
    tampered(function (candidate) { candidate.shaders[0].extraction.gles3Programs[0].programHash = '0'.repeat(64); }, /source extraction Matcap static forward record/);
    tampered(function (candidate) {
        var extraction = candidate.shaders[0].extraction;
        for (var _i = 0, _a = [extraction.programs, extraction.gles3Programs]; _i < _a.length; _i++) {
            var programs = _a[_i];
            var pass = programs.find(function (program) { return program.blobIndex === 3; });
            if (pass === null || pass === void 0 ? void 0 : pass.glsl)
                pass.glsl = pass.glsl.replaceAll('hlslcc_mtx4x4unity_ObjectToWorldArray', 'hlslcc_mtx4x4unity_ObjectToWorld');
        }
    }, /source extraction Matcap instanced forward source is missing hlslcc_mtx4x4unity_ObjectToWorldArray/);
    tampered(function (candidate) { candidate.sourceMaterials[0].keywords = ['INSTANCING_ON']; }, /shader keywords are active/);
    tampered(function (candidate) { candidate.shaders[0].subShaders[0].passes[0].state = __assign(__assign({}, candidate.shaders[0].subShaders[0].passes[0].state), { m_Tags: { tags: [['LIGHTMODE', 'Wrong']] } }); }, /Forward render state or tags/);
    tampered(function (candidate) { candidate.sourceMaterials[0].renderQueue = 3000; }, /translated render state is not the verified Matcap state/);
    tampered(function (candidate) { candidate.sourceMaterials[0].floatProperties = { _ZWrite_Mode: 1, _Cull_Mode: 2, _Unexpected: 0 }; }, /scalar\/color properties do not match/);
    tampered(function (candidate) { candidate.sourceMaterials[0].floatProperties._Metallic = 0; }, /scalar\/color properties do not match/);
    tampered(function (candidate) { candidate.sourceMaterials[0].colorProperties._SpecColor = __assign(__assign({}, rendering_profile_1.DSFX_MATCAP_INERT_COLOR_PROPERTIES._SpecColor), { r: 0.5 }); }, /scalar\/color properties do not match/);
    tampered(function (candidate) {
        var pass = candidate.shaders[0].extraction.gles3Programs.find(function (program) { return program.blobIndex === 2; });
        if (pass === null || pass === void 0 ? void 0 : pass.glsl)
            pass.glsl += '\nuniform float _Metallic;';
    }, /source extraction GLSL declares or consumes inert Matcap property _Metallic/);
});
(0, node_test_1.default)('accepts source-exact ProjectMX WeaponTest1Damage no-keyword and glow variants', function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    for (var _i = 0, _m = ['forward', 'glow']; _i < _m.length; _i++) {
        var variant = _m[_i];
        var _o = makeProjectMxCandidate(variant), candidate = _o.candidate, prefabPath = _o.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('ProjectMX'));
        var slot = profile.renderers[0].materialSlots[0];
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.equal(slot.adapterId, 'projectmx-weapon-test1-damage');
        strict_1.default.equal((_a = slot.projectMxShaderExtraction) === null || _a === void 0 ? void 0 : _a.activeVariant, variant);
        strict_1.default.deepEqual((_b = slot.projectMxShaderExtraction) === null || _b === void 0 ? void 0 : _b.activeKeywordNames, variant === 'glow' ? ['_GLOW_0'] : []);
        strict_1.default.deepEqual((_c = slot.projectMxShaderExtraction) === null || _c === void 0 ? void 0 : _c.requiredTextureProperties, ['_mainTex', '_sourceTex']);
        strict_1.default.equal((_d = slot.projectMxShaderExtraction) === null || _d === void 0 ? void 0 : _d.passes.forward.programHash, '8c8eed21b7e337db00f09b6b9dbdbfe4651bd0c483f5bdfab642ce730fbd1eb0');
        strict_1.default.equal((_e = slot.projectMxShaderExtraction) === null || _e === void 0 ? void 0 : _e.passes.glow.programHash, '7a52de32c3c7fcd54216ed9f9b542b93d56b2cecc687d524c5d46dff772bda61');
        strict_1.default.equal((_f = slot.projectMxShaderExtraction) === null || _f === void 0 ? void 0 : _f.passes.outline.stateName, 'Outline');
        strict_1.default.equal((_g = slot.projectMxShaderExtraction) === null || _g === void 0 ? void 0 : _g.passes.solidOutline.stateName, 'Solid Color Outline');
        strict_1.default.equal((_h = slot.projectMxShaderExtraction) === null || _h === void 0 ? void 0 : _h.passes.shadow.stateName, 'ShadowCaster');
        strict_1.default.equal((_j = slot.projectMxShaderExtraction) === null || _j === void 0 ? void 0 : _j.passes.depth.stateName, 'DepthOnly');
        strict_1.default.equal((_k = slot.projectMxShaderExtraction) === null || _k === void 0 ? void 0 : _k.passes.depth.renderState.colorMask, 0);
        strict_1.default.equal((_l = slot.projectMxShaderExtraction) === null || _l === void 0 ? void 0 : _l.passes.forward.usesNoiseTexture, false);
        strict_1.default.deepEqual(slot.adapterSettings.baseColorTint, [1, 1, 1, 1]);
        strict_1.default.deepEqual(slot.renderState.blend, {
            source: 1, destination: 0, sourceAlpha: 1, destinationAlpha: 0, operation: 0, operationAlpha: 0,
        });
    }
});
(0, node_test_1.default)('fails closed for ProjectMX extraction identity, pass, hash, property, and keyword mismatches', function () {
    var tampered = function (change, expected) {
        var _a = makeProjectMxCandidate(), candidate = _a.candidate, prefabPath = _a.prefabPath;
        change(candidate);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('ProjectMX'));
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), expected);
    };
    tampered(function (candidate) { delete candidate.shaders[0].extraction; }, /source shader extraction is missing/);
    tampered(function (candidate) { candidate.shaders[0].extraction.fingerprint = hash('0'); }, /extraction fingerprint is not the verified ProjectMX version/);
    tampered(function (candidate) { candidate.shaders[0].extraction.gles3Programs[0].programDataSha256 = hash('0'); }, /forward pass program record does not match/);
    tampered(function (candidate) { candidate.shaders[0].subShaders[0].passes[1].state.culling = { val: 2 }; }, /shader pass 1 culling state is not 1/);
    tampered(function (candidate) { candidate.shaders[0].properties = { m_Props: rendering_profile_1.PROJECTMX_WEAPON_REQUIRED_PROPERTIES.slice(0, -1).map(function (m_Name) { return ({ m_Name: m_Name }); }) }; }, /shader declarations do not match the verified ProjectMX set/);
    tampered(function (candidate) { candidate.sourceMaterials[0].keywords = ['_DITHER_HORIZONTAL_LINES']; }, /unsupported shader keywords are active/);
    tampered(function (candidate) { candidate.shaders[0].extraction.bindings.find(function (binding) { return binding.blobIndex === 32; }).keywordNames = ['FOG_LINEAR']; }, /forward pass has 0 exact GLES3 source bindings/);
});
(0, node_test_1.default)('rejects ProjectMX damage, fire, and dither dynamic states', function () {
    for (var _i = 0, _a = ['_DamageON', '_Damage', '_Fire', '_IsDither']; _i < _a.length; _i++) {
        var property = _a[_i];
        var _b = makeProjectMxCandidate(), candidate = _b.candidate, prefabPath = _b.prefabPath;
        candidate.sourceMaterials[0].floatProperties[property] = 1;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('ProjectMX'));
        strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterId, 'projectmx-weapon-test1-damage');
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), new RegExp("".concat(property, " dynamic gate is active")));
    }
});
(0, node_test_1.default)('accepts the three source-proven static DSFX shader variants for Hoshino and Miyako', function () {
    var _a, _b;
    var cases = [
        { rule: rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0], identity: 'hoshino_original', materialName: 'FX_MAT_Hoshino_Logo_01' },
        { rule: rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1], identity: 'mashiro_original', materialName: 'FX_MAT_White_04' },
        { rule: rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2], identity: 'miyako_original', materialName: 'FX_MAT_Rect_Glow_01d', floats: {
                _CameraFadingEnabled: 0, _CameraFarFadeDistance: 2, _CameraNearFadeDistance: 1,
                _DistortionEnabled: 0, _DistortionStrength: 1, _DistortionStrengthScaled: 0.1,
                _SoftParticlesEnabled: 0, _SoftParticlesFarFadeDistance: 1, _SoftParticlesNearFadeDistance: 0,
                _FlipbookBlending: 0, _FlipbookMode: 0, _EmissionEnabled: 0, _LightingEnabled: 0,
            } },
    ];
    for (var _i = 0, cases_1 = cases; _i < cases_1.length; _i++) {
        var item = cases_1[_i];
        var _c = makeDsfxCandidate(item.rule, item), candidate = _c.candidate, prefabPath = _c.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)(item.identity));
        var slot = profile.renderers[0].materialSlots[0];
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.equal(slot.adapterId, 'dsfx-static');
        strict_1.default.equal((_b = (_a = slot.materialProperties.resolvedTextures) === null || _a === void 0 ? void 0 : _a[0].sourceReference) === null || _b === void 0 ? void 0 : _b.objectId, '300');
        strict_1.default.deepEqual(slot.renderState.blend, {
            source: item.rule.renderState.blend.source,
            destination: item.rule.renderState.blend.destination,
            sourceAlpha: item.rule.renderState.blend.sourceAlpha,
            destinationAlpha: item.rule.renderState.blend.destinationAlpha,
            operation: 0,
            operationAlpha: 0,
        });
    }
});
(0, node_test_1.default)('fails closed for Additive_0 extraction, material, texture, and source-state tampering', function () {
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0];
    var cases = [
        ['program', function (candidate) { candidate.shaders[0].extraction.gles3Programs[0].programHash = '0'.repeat(64); }],
        ['binding', function (candidate) { candidate.shaders[0].extraction.bindings[0].parameterRecordSha256 = '0'.repeat(64); }],
        ['glsl', function (candidate) { candidate.shaders[0].extraction.gles3Programs[0].glsl += '\nuniform float _Time;\n'; }],
        ['property', function (candidate) { candidate.sourceMaterials[0].floatProperties._Main_Texture_No = 1; }],
        ['scalar', function (candidate) { candidate.sourceMaterials[0].floatProperties._ZTest_Mode = 3; }],
        ['texture', function (candidate) { candidate.sourceMaterials[0].textures[0].texture.pathId = '6'; }],
        ['state', function (candidate) { candidate.shaders[0].subShaders[0].passes[0].state.m_Tags.tags[0][1] = 'ForwardBase'; }],
    ];
    for (var _i = 0, cases_2 = cases; _i < cases_2.length; _i++) {
        var _a = cases_2[_i], name_1 = _a[0], mutate = _a[1];
        var _b = makeDsfxCandidate(rule), candidate = _b.candidate, prefabPath = _b.prefabPath;
        mutate(candidate);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
        strict_1.default.equal(profile.validation.valid, false, "".concat(name_1, " tamper unexpectedly passed"));
        strict_1.default.match(profile.validation.unresolved.join(' '), /Additive_0|verified static adapter|source identity|texture|scalar|render state/);
    }
});
(0, node_test_1.default)('fails closed for AlphaBlend_Add identity, extraction, property, state, and variant tampering', function () {
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1];
    var cases = [
        ['identity', function (candidate) { candidate.shaders[0].sourceReference.objectId = '3898777625326355544'; }],
        ['hash', function (candidate) { candidate.shaders[0].programBlobSha256 = '0'.repeat(64); }],
        ['extraction', function (candidate) { candidate.shaders[0].extraction.gles3Programs[0].programHash = '0'.repeat(64); }],
        ['property', function (candidate) { candidate.sourceMaterials[0].floatProperties._RGBRGBA = 1; }],
        ['state', function (candidate) { candidate.shaders[0].subShaders[0].passes[0].state.rtBlend0.destBlend.val = 9; }],
        ['variant', function (candidate) { candidate.sourceMaterials[0].floatProperties._Cull_Mode = 1; }],
        ['dynamic', function (candidate) { candidate.shaders[0].extraction.gles3Programs[0].glsl += '\nuniform float _Time;\n'; }],
    ];
    for (var _i = 0, cases_3 = cases; _i < cases_3.length; _i++) {
        var _a = cases_3[_i], name_2 = _a[0], mutate = _a[1];
        var _b = makeDsfxCandidate(rule, { renderStateVariant: 'depth-tested-off-double-sided' }), candidate = _b.candidate, prefabPath = _b.prefabPath;
        mutate(candidate);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('mashiro_original'));
        strict_1.default.equal(profile.validation.valid, false, "".concat(name_2, " tamper unexpectedly passed"));
        strict_1.default.match(profile.validation.unresolved.join(' '), /AlphaBlend_Add|verified static adapter|source identity|program|property|state|variant|dynamic/);
    }
});
(0, node_test_1.default)('accepts Wakamo AlphaBlend_Add eyes only with the exact white-default source material and canceled UV-offset gate', function () {
    var _a, _b;
    var fixture = makeWakamoEyeAlphaBlendAddCandidate();
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('wakamo_original'));
    var slot = profile.renderers[0].materialSlots[0];
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(slot.dsfxMaterialVariant, 'wakamo-eye-white-default');
    strict_1.default.equal(slot.dsfxRenderStateVariant, 'depth-tested-back-cull');
    strict_1.default.deepEqual(slot.materialProperties.resolvedTextures, []);
    strict_1.default.equal((_a = slot.materialProperties.floats) === null || _a === void 0 ? void 0 : _a._Custom_Data_Offset_Use, 1);
    strict_1.default.equal((_b = slot.materialProperties.floats) === null || _b === void 0 ? void 0 : _b._Main_Texture_No, 1);
});
(0, node_test_1.default)('fails closed on Wakamo white-default material references, shader defaults, gates, texture state, and stale properties', function () {
    var cases = [
        ['material reference', function (fixture) { fixture.candidate.sourceMaterials[0].sourceReference.objectId = '1142847250617954325'; }],
        ['shader reference', function (fixture) { fixture.candidate.sourceMaterials[0].shaderReference.objectId = '3898777625326355544'; }],
        ['white default name', function (fixture) { (fixture.candidate.shaders[0].properties.m_Props[2].m_DefTexture).m_DefaultName = 'black'; }],
        ['white default dimension', function (fixture) { (fixture.candidate.shaders[0].properties.m_Props[2].m_DefTexture).m_TexDim = 3; }],
        ['extra declared material property', function (fixture) { fixture.candidate.shaders[0].properties.m_Props.push({ m_Name: '_GlossyReflections' }); }],
        ['shader consumes stale Standard property', function (fixture) {
                var _a;
                var program = fixture.candidate.shaders[0].extraction.gles3Programs[0];
                var token = '_GlossyReflections';
                program.glsl = ((_a = program.glsl) !== null && _a !== void 0 ? _a : '').slice(0, -token.length) + token;
            }],
        ['custom offset gate', function (fixture) { fixture.candidate.sourceMaterials[0].floatProperties._Custom_Data_Offset_Use = 0; }],
        ['main texture gate', function (fixture) { fixture.candidate.sourceMaterials[0].floatProperties._Main_Texture_No = 0; }],
        ['source render queue', function (fixture) { fixture.candidate.sourceMaterials[0].renderQueue = 3000; }],
        ['null pointer', function (fixture) { fixture.candidate.sourceMaterials[0].textures[0].texture.pathId = '1'; }],
        ['pointer identity', function (fixture) { fixture.candidate.sourceMaterials[0].textures[0].texture.file = 'CAB-other'; }],
        ['texture transform', function (fixture) { fixture.candidate.sourceMaterials[0].textures[0].scale.x = 2; }],
        ['stale scalar', function (fixture) { fixture.candidate.sourceMaterials[0].floatProperties._Glossiness = 1; }],
        ['stale color', function (fixture) { fixture.candidate.sourceMaterials[0].colorProperties._SpecColor.g = 0.25; }],
        ['resolved texture', function (fixture) { fixture.candidate.sourceMaterials[0].resolvedTextures = [{ property: '_Texture' }]; }],
    ];
    for (var _i = 0, cases_4 = cases; _i < cases_4.length; _i++) {
        var _a = cases_4[_i], name_3 = _a[0], mutate = _a[1];
        var fixture = makeWakamoEyeAlphaBlendAddCandidate();
        mutate(fixture);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('wakamo_original'));
        strict_1.default.equal(profile.validation.valid, false, "".concat(name_3, " tamper unexpectedly passed"));
        strict_1.default.match(profile.validation.unresolved.join(' '), /AlphaBlend_Add|source-proven Wakamo|white 2D|material scalars|material _Texture|candidate closure/);
    }
    var generic = makeDsfxCandidate(rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1]);
    generic.candidate.sourceMaterials[0].floatProperties._Custom_Data_Offset_Use = 1;
    generic.candidate.sourceMaterials[0].floatProperties._Main_Texture_No = 1;
    var genericProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(generic.candidate, generic.prefabPath, (0, types_1.emptyChibiProfile)('generic_alpha_add'));
    strict_1.default.equal(genericProfile.validation.valid, false);
    strict_1.default.match(genericProfile.validation.unresolved.join(' '), /alphablend_add.*scalar properties/i);
});
(0, node_test_1.default)('accepts only the exact AlphaBlend_0 depth-tested render-state variants', function () {
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2];
    var cases = [
        { variant: 'depth-tested-back-cull', depthTest: true, depthFunction: 'less-equal', cullMode: 'back', doubleSided: false },
        { variant: 'depth-tested-off-double-sided', depthTest: true, depthFunction: 'less-equal', cullMode: 'off', doubleSided: true },
    ];
    for (var _i = 0, cases_5 = cases; _i < cases_5.length; _i++) {
        var item = cases_5[_i];
        var _a = makeDsfxCandidate(rule, { renderStateVariant: item.variant }), candidate = _a.candidate, prefabPath = _a.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('alpha_blend_fixture'));
        var slot = profile.renderers[0].materialSlots[0];
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.equal(slot.dsfxRenderStateVariant, item.variant);
        strict_1.default.equal(slot.renderState.depthTest, item.depthTest);
        strict_1.default.equal(slot.renderState.depthFunction, item.depthFunction);
        strict_1.default.equal(slot.renderState.cullMode, item.cullMode);
        strict_1.default.equal(slot.renderState.doubleSided, item.doubleSided);
    }
});
(0, node_test_1.default)('rejects AlphaBlend_0 render-state values outside the proven variants', function () {
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2];
    var cases = [
        { _ZTest_Mode: 3 },
        { _Cull_Mode: 1 },
    ];
    for (var _i = 0, cases_6 = cases; _i < cases_6.length; _i++) {
        var floats = cases_6[_i];
        var _a = makeDsfxCandidate(rule, { renderStateVariant: 'depth-tested-back-cull', floats: floats }), candidate = _a.candidate, prefabPath = _a.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('alpha_blend_fixture'));
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), /translated render state is not a verified static state variant/);
    }
});
(0, node_test_1.default)('accepts only source-proven inert stale properties on DSFX AlphaBlend_0', function () {
    var _a, _b;
    var _c, _d;
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2];
    for (var _i = 0, _e = [
        ['_GlossyReflections', 1],
        ['_EnvironmentReflections', 1],
        ['_LightingEnabled', 1],
        ['_OcclusionStrength', 0.75],
        ['_SpecularHighlights', 1],
    ]; _i < _e.length; _i++) {
        var _f = _e[_i], property = _f[0], value = _f[1];
        var _g = makeDsfxCandidate(rule, { floats: (_a = {}, _a[property] = value, _a) }), candidate = _g.candidate, prefabPath = _g.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
        var slot = profile.renderers[0].materialSlots[0];
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.equal(slot.adapterId, 'dsfx-static');
        strict_1.default.equal((_c = slot.dsfxShaderExtraction) === null || _c === void 0 ? void 0 : _c.gles3Programs.length, 4);
    }
    for (var _h = 0, _j = [
        ['_EmissionColor', { r: 1, g: 0.5, b: 0.25, a: 1 }],
        ['_SpecColor', { r: 0.1, g: 0.2, b: 0.3, a: 1 }],
    ]; _h < _j.length; _h++) {
        var _k = _j[_h], property = _k[0], value = _k[1];
        var _l = makeDsfxCandidate(rule), candidate = _l.candidate, prefabPath = _l.prefabPath;
        candidate.sourceMaterials[0].colorProperties = __assign(__assign({}, candidate.sourceMaterials[0].colorProperties), (_b = {}, _b[property] = value, _b));
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
        var slot = profile.renderers[0].materialSlots[0];
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.equal(slot.adapterId, 'dsfx-static');
        strict_1.default.equal((_d = slot.dsfxShaderExtraction) === null || _d === void 0 ? void 0 : _d.gles3Programs.length, 4);
    }
});
(0, node_test_1.default)('fails closed when the DSFX AlphaBlend_0 extraction is missing, incomplete, or declares an inert property', function () {
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[2];
    var missing = makeDsfxCandidate(rule);
    delete missing.candidate.shaders[0].extraction;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(missing.candidate, missing.prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /source shader extraction is missing/);
    var incomplete = makeDsfxCandidate(rule);
    incomplete.candidate.shaders[0].extraction.gles3Programs.pop();
    profile = (0, rendering_profile_1.buildChibiRenderingProfile)(incomplete.candidate, incomplete.prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /has 3 GLES3 programs, expected 4/);
    for (var _i = 0, _a = [
        '_GlossyReflections', '_EnvironmentReflections', '_LightingEnabled',
        '_OcclusionStrength', '_SpecularHighlights', '_EmissionColor', '_SpecColor',
    ]; _i < _a.length; _i++) {
        var property = _a[_i];
        var declared = makeDsfxCandidate(rule);
        declared.candidate.shaders[0].extraction.gles3Programs[0].glsl += "\nuniform float ".concat(property, ";\n");
        profile = (0, rendering_profile_1.buildChibiRenderingProfile)(declared.candidate, declared.prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), new RegExp("declares or consumes inert property ".concat(property)));
    }
    var dynamic = makeDsfxCandidate(rule, { floats: { _DistortionEnabled: 1 } });
    profile = (0, rendering_profile_1.buildChibiRenderingProfile)(dynamic.candidate, dynamic.prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /_DistortionEnabled dynamic gate is active/);
});
(0, node_test_1.default)('keeps generic DSFX dynamic detection for stale color fields outside AlphaBlend_0', function () {
    var rule = rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1];
    var _a = makeDsfxCandidate(rule), candidate = _a.candidate, prefabPath = _a.prefabPath;
    candidate.sourceMaterials[0].colorProperties = __assign(__assign({}, candidate.sourceMaterials[0].colorProperties), { _SpecColor: { r: 1, g: 0.5, b: 0.25, a: 1 } });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /material texture properties do not match|not verified for static adapter/);
});
(0, node_test_1.default)('rejects dynamic or unresolved DSFX variants instead of guessing a static path', function () {
    var cases = [
        { materialName: 'Gra_FX', floats: { _DistortionEnabled: 1, _DistortionStrength: 1 } },
        { materialName: 'Noise_FX', floats: { _Custom_Data_Use: 0, _Main_Speed_X: -0.5, _Vertex_Offset: 0.1 } },
        { materialName: 'GuardTower_FX', floats: { _GlitchIntensity: 1 } },
        { materialName: 'Wakamo_Eye_FX', missingTexture: true },
    ];
    for (var _i = 0, cases_7 = cases; _i < cases_7.length; _i++) {
        var item = cases_7[_i];
        var _a = makeDsfxCandidate(rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[1], item), candidate = _a.candidate, prefabPath = _a.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
        strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterId, 'dsfx-static');
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.match(profile.validation.unresolved.join(' '), 'missingTexture' in item && item.missingTexture ? /exact _Texture reference is missing/ : /not verified for static adapter/);
    }
});
(0, node_test_1.default)('rejects a static DSFX identity when its verified program changes', function () {
    var _a = makeDsfxCandidate(rendering_profile_1.CHIBI_DSFX_STATIC_SHADER_ADAPTER_RULES[0]), candidate = _a.candidate, prefabPath = _a.prefabPath;
    candidate.shaders[0].programBlobSha256 = '0'.repeat(64);
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('dsfx_fixture'));
    strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterId, null);
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /not verified for static adapter.*program identity does not match/);
});
(0, node_test_1.default)('does not apply stale serialized color to source Unlit/Texture', function () {
    var _a = makeCandidate('example', ['Example_Body']), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var material = candidate.sourceMaterials[0];
    var shader = candidate.shaders[0];
    material.shaderParsedName = 'Unlit/Texture';
    material.colorProperties = { _Color: { r: 0.2, g: 0.4, b: 0.6, a: 1 } };
    material.floatProperties = __assign(__assign({}, material.floatProperties), { _ZWrite: 1 });
    shader.parsedName = material.shaderParsedName;
    shader.properties = { m_Props: [{ m_Name: '_MainTex' }] };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterId, 'gltf-native');
    strict_1.default.equal(profile.renderers[0].materialSlots[0].adapterSettings.baseColorTint, null);
});
(0, node_test_1.default)('keeps source object identities exact above JavaScript safe integer range', function () {
    var first = reference(hash('a'), 'CAB-prefab', '9007199254740993');
    var second = reference(hash('a'), 'CAB-prefab', '9007199254740992');
    strict_1.default.notEqual((0, rendering_profile_1.sourceObjectKey)(first), (0, rendering_profile_1.sourceObjectKey)(second));
    strict_1.default.equal((0, rendering_profile_1.sourceObjectKey)(first), "".concat(hash('a'), ":cab-prefab:9007199254740993"));
});
(0, node_test_1.default)('retains ordinary, horizontally flipped, negative-flip, and source-default mouth events', function () {
    var _a;
    var clip = 'Haruna_Original_Cafe_Idle';
    var _b = makeCandidate('haruna_original', [
        'Haruna_Body', 'Haruna_Face', 'Haruna_EyeMouth', 'Haruna_Hair', 'Haruna_Eyebrow',
    ], {
        mouthSlot: 2,
        defaultUV: { x: 0.125, y: 0.625 },
        events: [
            { clip: clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 704 },
            { clip: clip, time: 0.2, function: 'SetHorizontallyFlippedMouthTile', string: '', float: 0, int: 704 },
            { clip: clip, time: 0.3, function: 'SetMouthTile', string: '', float: 0, int: -704 },
            { clip: clip, time: 0.4, function: 'SetMouthTileToDefault', string: '', float: 0, int: 0 },
        ],
    }), candidate = _b.candidate, prefabPath = _b.prefabPath;
    var interaction = (0, types_1.emptyChibiProfile)('Haruna');
    interaction.initialPose = clip;
    interaction.interactions.idle = { state: 'available', clip: clip, loop: true, hold: false };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, interaction);
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.deepEqual((_a = profile.mouth) === null || _a === void 0 ? void 0 : _a.events, [
        { clip: clip, time: 0.1, tile: 704, flipX: false },
        { clip: clip, time: 0.2, tile: 704, flipX: true },
        { clip: clip, time: 0.3, tile: 704, flipX: true },
        { clip: clip, time: 0.4, tile: 501, flipX: false },
    ]);
});
(0, node_test_1.default)('promotes a serialized mouth grid only with exact shader, atlas, and event evidence', function () {
    var _a, _b, _c, _d;
    var clip = 'Example_Cafe_Idle';
    var _e = makeCandidate('example', ['Example_EyeMouth'], {
        mouthSlot: 0,
        defaultUV: { x: 0.25, y: 0.5 },
        events: [{ clip: clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 404 }],
    }), candidate = _e.candidate, prefabPath = _e.prefabPath;
    setMouthGridEvidence(candidate, { serializedColumns: 4, serializedRows: 4 });
    var interaction = (0, types_1.emptyChibiProfile)('Example');
    interaction.initialPose = clip;
    interaction.interactions.idle = { state: 'available', clip: clip, loop: true, hold: false };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, interaction);
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal((_a = profile.mouth) === null || _a === void 0 ? void 0 : _a.columns, 8);
    strict_1.default.equal((_b = profile.mouth) === null || _b === void 0 ? void 0 : _b.rows, 8);
    strict_1.default.equal((_c = profile.mouth) === null || _c === void 0 ? void 0 : _c.defaultTile, 402);
    strict_1.default.deepEqual((_d = profile.mouth) === null || _d === void 0 ? void 0 : _d.events, [{ clip: clip, time: 0.1, tile: 404, flipX: false }]);
});
(0, node_test_1.default)('keeps a conflicting serialized mouth grid blocked when shader declaration evidence is missing', function () {
    var _a, _b;
    var clip = 'Example_Cafe_Idle';
    var _c = makeCandidate('example', ['Example_EyeMouth'], {
        mouthSlot: 0,
        defaultUV: { x: 0.25, y: 0.5 },
        events: [{ clip: clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 404 }],
    }), candidate = _c.candidate, prefabPath = _c.prefabPath;
    setMouthGridEvidence(candidate, { serializedColumns: 4, serializedRows: 4 });
    candidate.shaders[0].properties = { m_Props: [] };
    var interaction = (0, types_1.emptyChibiProfile)('Example');
    interaction.initialPose = clip;
    interaction.interactions.idle = { state: 'available', clip: clip, loop: true, hold: false };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, interaction);
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.equal((_a = profile.mouth) === null || _a === void 0 ? void 0 : _a.columns, 4);
    strict_1.default.equal((_b = profile.mouth) === null || _b === void 0 ? void 0 : _b.rows, 4);
    strict_1.default.match(profile.validation.unresolved.join(' '), /Mouth tile 404 is outside the 4x4 source atlas/);
});
(0, node_test_1.default)('does not promote a normal material when its selected mouth values fit the serialized grid', function () {
    var _a, _b, _c;
    var clip = 'Example_Cafe_Idle';
    var _d = makeCandidate('example', ['Example_EyeMouth'], {
        mouthSlot: 0,
        defaultUV: { x: 0.25, y: 0.5 },
        events: [{ clip: clip, time: 0.1, function: 'SetMouthTile', string: '', float: 0, int: 201 }],
    }), candidate = _d.candidate, prefabPath = _d.prefabPath;
    setMouthGridEvidence(candidate, { serializedColumns: 4, serializedRows: 4 });
    var interaction = (0, types_1.emptyChibiProfile)('Example');
    interaction.initialPose = clip;
    interaction.interactions.idle = { state: 'available', clip: clip, loop: true, hold: false };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, interaction);
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal((_a = profile.mouth) === null || _a === void 0 ? void 0 : _a.columns, 4);
    strict_1.default.equal((_b = profile.mouth) === null || _b === void 0 ? void 0 : _b.rows, 4);
    strict_1.default.equal((_c = profile.mouth) === null || _c === void 0 ? void 0 : _c.defaultTile, 201);
});
(0, node_test_1.default)('binds a child-renderer event only from an exact full source reference', function () {
    var _a = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } }), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var rendererReference = candidate.assembly[0].renderers[0].sourceReference;
    candidate.events = [{
            clip: 'Example_Cafe_Idle', time: 0.25, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 99,
            targetReference: rendererReference,
        }];
    var interaction = (0, types_1.emptyChibiProfile)('Example');
    interaction.initialPose = 'Example_Cafe_Idle';
    interaction.interactions.idle = { state: 'available', clip: 'Example_Cafe_Idle', loop: true, hold: false };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, interaction);
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(profile.childRendererEvents, [{
            clip: 'Example_Cafe_Idle', time: 0.25, action: 'disable', sourceRendererReference: rendererReference, order: 0,
        }]);
});
(0, node_test_1.default)('does not match a mouth renderer by serialized file and path when its bundle hash differs', function () {
    var _a = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } }), candidate = _a.candidate, prefabPath = _a.prefabPath;
    candidate.assembly[0].attachments.mouthRenderer[0].sourceReference = reference(hash('b'), 'CAB-prefab', candidate.assembly[0].renderers[0].pathId);
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /Mouth component does not resolve to exactly one source renderer \(0 exact matches\)/);
});
(0, node_test_1.default)('rejects conflicting authoritative mouth metadata instead of selecting the first component', function () {
    var _a = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } }), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var rendererReference = candidate.assembly[0].renderers[0].sourceReference;
    candidate.assembly[0].attachments.mouthMetadata = [
        { renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId }, sourceRendererReference: rendererReference, materialIndex: 0, defaultUV: { x: 0.125, y: 0.625 } },
        { renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId }, sourceRendererReference: rendererReference, materialIndex: 1, defaultUV: { x: 0.125, y: 0.625 } },
    ];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /multiple material slot indices are authoritative/);
});
(0, node_test_1.default)('accepts a zero material slot from an exact per-component mouth metadata record', function () {
    var _a;
    var _b = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } }), candidate = _b.candidate, prefabPath = _b.prefabPath;
    var rendererReference = candidate.assembly[0].renderers[0].sourceReference;
    candidate.assembly[0].attachments = {
        mouthMetadata: [{
                renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId, name: 'Example_Body' },
                sourceRendererReference: rendererReference, materialIndex: 0, defaultUV: { x: 0.125, y: 0.625 },
            }],
    };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal((_a = profile.mouth) === null || _a === void 0 ? void 0 : _a.materialSlot, 0);
});
(0, node_test_1.default)('detects a legacy mouth pointer that conflicts with exact metadata', function () {
    var _a = makeCandidate('example', ['Example_EyeMouth'], { mouthSlot: 0, defaultUV: { x: 0.125, y: 0.625 } }), candidate = _a.candidate, prefabPath = _a.prefabPath;
    var assembly = candidate.assembly[0];
    var rendererReference = assembly.renderers[0].sourceReference;
    var otherReference = reference(hash('a'), 'CAB-prefab', '9007199254740996');
    assembly.renderers.push(__assign(__assign({}, assembly.renderers[0]), { name: 'Other_Body', pathId: otherReference.objectId, sourceReference: otherReference, hierarchyPath: 'Cafe_Example/Other_Body' }));
    assembly.rendererOrder.push('Other_Body');
    assembly.attachments = {
        mouthRenderer: [{ file: 'CAB-prefab', pathId: otherReference.objectId, name: 'Other_Body' }],
        mouthMetadata: [{
                renderer: { file: 'CAB-prefab', pathId: rendererReference.objectId, name: 'Example_Body' },
                sourceRendererReference: rendererReference, materialIndex: 0, defaultUV: { x: 0.125, y: 0.625 },
            }],
    };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /multiple source renderer identities are authoritative/);
});
(0, node_test_1.default)('preserves per-prefab slot order and different mouth defaults for pilot source profiles', function () {
    var _a, _b, _c, _d;
    var pilots = [
        { identity: 'haruna_original', slots: ['Haruna_Body', 'Haruna_Face', 'Haruna_EyeMouth', 'Haruna_Hair', 'Haruna_Eyebrow'], mouth: 2, uv: { x: 0.125, y: 0.625 }, tile: 501 },
        { identity: 'shun_original', slots: ['Shun_Body', 'Shun_Eyebrow', 'Shun_Face', 'Shun_EyeMouth', 'Shun_Hair'], mouth: 3, uv: { x: 0.5, y: 0.875 }, tile: 704 },
        { identity: 'hoshino_original', slots: ['Hoshino_Face', 'Hoshino_Eyebrow', 'Hoshino_EyeMouth', 'Hoshino_Body', 'Hoshino_Hair'], mouth: 2, uv: { x: 0.25, y: 0.5 }, tile: 402 },
        { identity: 'aris_original', slots: ['Aris_Body', 'Aris_Face', 'Aris_EyeMouth', 'Aris_Eyebrow', 'Aris_Hair'], mouth: 2, uv: { x: 0.5, y: 0.875 }, tile: 704 },
    ];
    for (var _i = 0, pilots_1 = pilots; _i < pilots_1.length; _i++) {
        var pilot = pilots_1[_i];
        var _e = makeCandidate(pilot.identity, pilot.slots, { mouthSlot: pilot.mouth, defaultUV: pilot.uv }), candidate = _e.candidate, prefabPath = _e.prefabPath;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)(pilot.identity));
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.deepEqual(profile.renderers[0].materialSlots.map(function (slot) { return slot.sourceMaterialName; }), pilot.slots);
        strict_1.default.equal((_a = profile.mouth) === null || _a === void 0 ? void 0 : _a.materialSlot, pilot.mouth);
        strict_1.default.deepEqual((_b = profile.mouth) === null || _b === void 0 ? void 0 : _b.defaultUV, pilot.uv);
        strict_1.default.equal((_c = profile.mouth) === null || _c === void 0 ? void 0 : _c.defaultTile, pilot.tile);
        strict_1.default.equal((_d = profile.renderers[0].materialSlots.find(function (slot) { return slot.adapterId === 'mx-character-eyebrow'; })) === null || _d === void 0 ? void 0 : _d.adapterId, 'mx-character-eyebrow');
    }
});
(0, node_test_1.default)('rejects conflicting dependencies, missing slot identities, invalid mouth indices, and unmapped child events', function () {
    var slots = ['Example_Body', 'Example_Face', 'Example_EyeMouth'];
    var conflict = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 }, conflict: true });
    strict_1.default.equal((0, rendering_profile_1.buildChibiRenderingProfile)(conflict.candidate, conflict.prefabPath, (0, types_1.emptyChibiProfile)('Example')).validation.valid, false);
    var missingSlot = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 }, missingSlotReference: 1 });
    var missingProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(missingSlot.candidate, missingSlot.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(missingProfile.validation.valid, false);
    strict_1.default.match(missingProfile.validation.unresolved.join(' '), /ambiguous material object reference/);
    var invalidMouth = makeCandidate('example', slots, { mouthSlot: -1, defaultUV: { x: 0.125, y: 0.625 } });
    var invalidMouthProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(invalidMouth.candidate, invalidMouth.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.match(invalidMouthProfile.validation.unresolved.join(' '), /invalid or missing material slot index/);
    var missingMesh = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 } });
    missingMesh.candidate.assembly[0].renderers[0].mesh = null;
    missingMesh.candidate.assembly[0].renderers[0].meshSourceReference = null;
    var missingMeshProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(missingMesh.candidate, missingMesh.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.match(missingMeshProfile.validation.unresolved.join(' '), /no source mesh reference/);
    var childEvent = { clip: 'Example_Cafe_Idle', time: 0, function: 'AniEvt_EnableChildRenderer', string: '', float: 0, int: 4 };
    var unmapped = makeCandidate('example', slots, { mouthSlot: 2, defaultUV: { x: 0.125, y: 0.625 }, events: [childEvent] });
    var interaction = (0, types_1.emptyChibiProfile)('Example');
    interaction.initialPose = 'Example_Cafe_Idle';
    interaction.interactions.idle = { state: 'available', clip: 'Example_Cafe_Idle', loop: true, hold: false };
    var unmappedProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(unmapped.candidate, unmapped.prefabPath, interaction);
    strict_1.default.match(unmappedProfile.validation.unresolved.join(' '), /no exact source renderer-ID binding/);
});
(0, node_test_1.default)('rejects ambiguous source assemblies instead of selecting the first match', function () {
    var ambiguous = makeCandidate('example', ['Example_Body']);
    ambiguous.candidate.assembly.push(structuredClone(ambiguous.candidate.assembly[0]));
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(ambiguous.candidate, ambiguous.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /ambiguous source renderer assemblies matched by path/);
    strict_1.default.equal(profile.assembly, null);
});
(0, node_test_1.default)('rejects duplicate source renderer identities in one selected assembly', function () {
    var duplicate = makeCandidate('example', ['Example_Body']);
    var renderer = duplicate.candidate.assembly[0].renderers[0];
    duplicate.candidate.assembly[0].renderers.push(__assign(__assign({}, structuredClone(renderer)), { hierarchyPath: "".concat(renderer.hierarchyPath, "/Duplicate") }));
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(duplicate.candidate, duplicate.prefabPath, (0, types_1.emptyChibiProfile)('Example'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /duplicate source renderer identity/);
});
(0, node_test_1.default)('excludes a source-evidenced presentation renderer before unsupported validation', function () {
    var fixture = makeCandidate('policy_fixture', ['Policy_Body']);
    var candidate = fixture.candidate, prefabPath = fixture.prefabPath;
    var fx = addPolicyRenderer(fixture, {
        name: 'FX_MESH_Flower_01',
        hierarchyPath: 'Cafe_Policy/Ex_Root/FX_Local_DM/Flower_AnimPos/Flower_01/FX_MESH_Flower_01',
        mesh: { file: inventory_1.UNITY_BUILTIN_RESOURCES_FILE, pathId: inventory_1.UNITY_BUILTIN_QUAD_PATH_ID },
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Policy'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(profile.renderers.map(function (renderer) { return renderer.name; }), ['Policy_Fixture_Body']);
    strict_1.default.equal(profile.excludedRenderers.length, 1);
    strict_1.default.equal(profile.excludedRenderers[0].sourceReference.objectId, fx.sourceReference.objectId);
    strict_1.default.equal(profile.excludedRenderers[0].reasonCode, 'PRESENTATION_MESH_10210_OR_HELPER');
    strict_1.default.match(profile.excludedRenderers[0].evidence.join(' | '), /ambiguous Unity built-in Quad|effect-scoped|effect family/);
    strict_1.default.deepEqual(profile.validation.excludedRenderers, profile.excludedRenderers);
});
(0, node_test_1.default)('keeps weak or name-only presentation hints fail-closed', function () {
    var fixture = makeCandidate('weak_policy_fixture', ['Weak_Body']);
    var candidate = fixture.candidate, prefabPath = fixture.prefabPath;
    addPolicyRenderer(fixture, {
        name: 'FX_Helper',
        hierarchyPath: 'Cafe_Weak/Characters/FX_Helper',
        materialName: 'Ordinary_Material',
        shaderName: 'Unknown/Shader',
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Weak'));
    strict_1.default.equal(profile.excludedRenderers.length, 0);
    strict_1.default.equal(profile.renderers.some(function (renderer) { return renderer.name === 'FX_Helper'; }), true);
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /Unsupported source shader Unknown\/Shader/);
});
(0, node_test_1.default)('core weapon and exact equipment evidence override presentation-looking FX evidence', function () {
    var fixture = makeCandidate('weapon_policy_fixture', ['Weapon_Body']);
    var candidate = fixture.candidate, prefabPath = fixture.prefabPath;
    var fxWeapon = addPolicyRenderer(fixture, {
        name: 'Weapon_Prop',
        hierarchyPath: 'Cafe_Weapon/Ex_Root/FX_Local/Camera/Weapon_Prop',
        equipmentReference: true,
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, (0, types_1.emptyChibiProfile)('Weapon'));
    strict_1.default.equal(profile.excludedRenderers.length, 0);
    strict_1.default.equal(profile.renderers.some(function (renderer) { var _a; return ((_a = renderer.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === fxWeapon.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /Unsupported source shader DSFX\/FX_SHADER_Unsupported/);
});
(0, node_test_1.default)('promotes the five exact-source rootBone weapon ancestor shapes only from full identity', function () {
    var cases = [
        ['10023', 'CH0064_Weapon_Can', 'bone_bottle', ['Bip001_Weapon']],
        ['16012', 'CH0192_Weapon', 'Bone_Chain_1', ['Helper_Root', 'Point022', 'Bip001_Weapon']],
        ['10145', 'CH0356_Weapon_Reload', 'bone_magazine_02', ['Bip001_Weapon']],
        ['10020', 'Koharu_Original_Weapon_Toggle', 'bone_magazine', ['Bip001_Weapon']],
        ['13013', 'FX_Momiji_Original_Weapon', 'bone_magazine_01', ['Bip001_Weapon']],
    ];
    var _loop_1 = function (id, name_4, rootBoneName, ancestorNames) {
        var fixture = makeCandidate("exact_source_weapon_ancestor_".concat(id), ['Policy_Body']);
        var sourceReference = reference(hash('a'), 'CAB-prefab', id);
        var added = addPolicyRenderer(fixture, {
            name: name_4,
            hierarchyPath: "Cafe_Exact_Source/".concat(name_4),
            materialName: "".concat(name_4, "_Material"),
            shaderName: 'MX/C-Weapon',
            rendererType: 'SkinnedMeshRenderer',
            sourceReference: sourceReference,
        });
        var renderer = added.renderer;
        var pointer = function (pathId, pointerName) { return ({
            file: 'CAB-prefab',
            pathId: pathId,
            name: pointerName,
            sourceReference: reference(hash('a'), 'CAB-prefab', pathId),
        }); };
        var rootBone = pointer("".concat(id, "-root"), rootBoneName);
        var ancestors = ancestorNames.map(function (pointerName, index) { return pointer("".concat(id, "-ancestor-").concat(index), pointerName); });
        renderer.rootBone = rootBone;
        renderer.rootBoneAncestry = ancestors;
        renderer.rootBoneAncestryComplete = true;
        renderer.transformChain = [pointer("".concat(id, "-root-transform"), fixture.candidate.assembly[0].root), pointer(id, name_4)];
        renderer.boneReferences = [rootBone];
        fixture.candidate.assembly[0].attachments.mainWeapon = [ancestors.at(-1)];
        if (id === '10023') {
            var mainReference = reference(hash('a'), 'CAB-prefab', "".concat(id, "-authored-main"));
            var main = addPolicyRenderer(fixture, {
                name: 'CH0064_Weapon',
                hierarchyPath: 'Cafe_Exact_Source/CH0064_Weapon',
                materialName: 'CH0064_Weapon_Material',
                shaderName: 'MX/C-Weapon',
                rendererType: 'SkinnedMeshRenderer',
                sourceReference: mainReference,
            });
            main.renderer.rootBone = ancestors.at(-1);
            main.renderer.boneReferences = [ancestors.at(-1)];
            fixture.candidate.assembly[0].attachments.equipmentRendererReferences = [mainReference];
        }
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)(name_4));
        var evidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === id; });
        strict_1.default.ok(evidence, name_4);
        strict_1.default.equal(evidence.reasonCode, 'EXACT_SOURCE_WEAPON_ANCESTRY');
        strict_1.default.deepEqual(evidence.rootBoneAncestry.map(function (item) { return item.name; }), ancestorNames);
        strict_1.default.deepEqual(evidence.matchedAncestorPointers.map(function (item) { return item.name; }), ['Bip001_Weapon']);
        strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    };
    for (var _i = 0, cases_8 = cases; _i < cases_8.length; _i++) {
        var _a = cases_8[_i], id = _a[0], name_4 = _a[1], rootBoneName = _a[2], ancestorNames = _a[3];
        _loop_1(id, name_4, rootBoneName, ancestorNames);
    }
});
(0, node_test_1.default)('fails closed for missing, cross-prefab, or ambiguous exact-source weapon ancestry', function () {
    var buildCase = function (suffix, mutate) {
        var fixture = makeCandidate("exact_source_weapon_ancestor_negative_".concat(suffix), ['Policy_Body']);
        var sourceReference = reference(hash('a'), 'CAB-prefab', "negative-".concat(suffix));
        var added = addPolicyRenderer(fixture, {
            name: "Negative_".concat(suffix, "_Weapon"),
            hierarchyPath: "Cafe_Negative/".concat(suffix, "/Negative_").concat(suffix, "_Weapon"),
            materialName: "Negative_".concat(suffix, "_Weapon_Material"),
            shaderName: 'MX/C-Weapon',
            rendererType: 'SkinnedMeshRenderer',
            sourceReference: sourceReference,
        });
        var pointer = function (pathId, pointerName, source) {
            if (source === void 0) { source = sourceReference; }
            return ({
                file: source.serializedFile,
                pathId: pathId,
                name: pointerName,
                sourceReference: reference(source.bundleSha256, source.serializedFile, pathId),
            });
        };
        var renderer = added.renderer;
        var rootBone = pointer("negative-".concat(suffix, "-root"), 'bone_local');
        var ancestor = pointer("negative-".concat(suffix, "-ancestor"), 'Bip001_Weapon');
        renderer.rootBone = rootBone;
        renderer.rootBoneAncestry = [ancestor];
        renderer.rootBoneAncestryComplete = true;
        renderer.transformChain = [pointer("negative-".concat(suffix, "-transform"), fixture.candidate.assembly[0].root), pointer(sourceReference.objectId, renderer.name)];
        var attachments = fixture.candidate.assembly[0].attachments;
        attachments.mainWeapon = [ancestor];
        mutate(renderer, attachments);
        return { fixture: fixture, added: added };
    };
    var missing = buildCase('missing', function (renderer) {
        renderer.rootBoneAncestry = [];
        renderer.rootBoneAncestryComplete = false;
    });
    var crossPrefab = buildCase('cross_prefab', function (renderer) {
        var other = reference(hash('z'), 'CAB-other-prefab', 'foreign');
        renderer.rootBoneAncestry = [{
                file: other.serializedFile, pathId: 'foreign-ancestor', name: 'Bip001_Weapon',
                sourceReference: reference(other.bundleSha256, other.serializedFile, 'foreign-ancestor'),
            }];
        renderer.rootBoneAncestryComplete = true;
    });
    var ambiguous = buildCase('ambiguous', function (renderer, attachments) {
        var second = reference(hash('a'), 'CAB-prefab', 'negative-ambiguous-ancestor-2');
        renderer.rootBoneAncestry = __spreadArray(__spreadArray([], renderer.rootBoneAncestry, true), [
            { file: second.serializedFile, pathId: second.objectId, name: 'Bip001_Weapon', sourceReference: second },
        ], false);
        attachments.subWeapon = [{
                file: second.serializedFile, pathId: second.objectId, name: 'Bip001_Weapon', sourceReference: second,
            }];
    });
    var _loop_2 = function (fixture, added) {
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)(added.renderer.name));
        strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
        strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
    };
    for (var _i = 0, _a = [missing, crossPrefab, ambiguous]; _i < _a.length; _i++) {
        var _b = _a[_i], fixture = _b.fixture, added = _b.added;
        _loop_2(fixture, added);
    }
});
(0, node_test_1.default)('blocks visible source-bound weapon/equipment renderers with no exact authored relation', function () {
    var fixture = makeCandidate('missing_equipment_relation_policy', ['Policy_Body']);
    var missing = [
        ['Aris_Original_Weapon', 'Bip001_Weapon'],
        ['Neru_Original_Weapon_Chain', 'bone_chain_01'],
        ['Aru_Newyear_Hagoita', 'bone_Hagoita'],
        ['Hinata_Original_Mk19_Outline', 'bone_carrier'],
    ];
    for (var _i = 0, missing_1 = missing; _i < missing_1.length; _i++) {
        var _a = missing_1[_i], name_5 = _a[0], boneName = _a[1];
        var added = addPolicyRenderer(fixture, {
            name: name_5,
            hierarchyPath: "Cafe_Missing_Equipment/".concat(name_5),
            materialName: "".concat(name_5, "_Material"),
            shaderName: 'MX/C-Weapon',
            rendererType: 'SkinnedMeshRenderer',
        });
        var bone = { file: 'CAB-policy-bones', pathId: "bone-".concat(added.sourceReference.objectId), name: boneName };
        added.renderer.rootBone = bone;
        added.renderer.boneReferences = [bone];
    }
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('MissingEquipment'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.name; }), missing.map(function (item) { return item[0]; }));
    strict_1.default.deepEqual(profile.validation.coreRendererBlockers, profile.coreRendererBlockers);
    var _loop_3 = function (blocker) {
        strict_1.default.equal(blocker.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT');
        strict_1.default.equal(blocker.sourceMeshReference !== null, true);
        strict_1.default.equal(blocker.sourceMaterialReferences.length, 1);
        strict_1.default.equal(blocker.sourceShaderReferences.length, 1);
        strict_1.default.match(blocker.evidence.join(' | '), /exact source renderer reference/);
        strict_1.default.match(blocker.evidence.join(' | '), /exact source mesh reference/);
        strict_1.default.match(blocker.evidence.join(' | '), /no authoritative equipment renderer or main\/sub-weapon attachment relation/);
        strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === blocker.sourceReference.objectId; }), false);
    };
    for (var _b = 0, _c = profile.coreRendererBlockers; _b < _c.length; _b++) {
        var blocker = _c[_b];
        _loop_3(blocker);
    }
});
(0, node_test_1.default)('publishes one otherwise exact core equipment renderer as an attachment warning', function () {
    var _a, _b;
    var fixture = makeCandidate('arrangement_only_equipment_warning', ['Policy_Body']);
    var added = addPolicyRenderer(fixture, {
        name: 'Aru_Original_Hagoita',
        hierarchyPath: 'Cafe_Aru_Original/Aru_Original_Hagoita',
        materialName: 'Aru_Original_Hagoita_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
    });
    var bone = { file: 'CAB-prefab', pathId: 'hagoita-root', name: 'bone_Hagoita' };
    added.renderer.rootBone = bone;
    added.renderer.boneReferences = [bone];
    added.renderer.rootBoneAncestry = [];
    added.renderer.rootBoneAncestryComplete = true;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('ArrangementOnly'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.equal(profile.warnings.length, 1);
    strict_1.default.equal((_a = profile.warnings[0]) === null || _a === void 0 ? void 0 : _a.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT');
    strict_1.default.equal((_b = profile.warnings[0]) === null || _b === void 0 ? void 0 : _b.blocker.sourceReference.objectId, added.sourceReference.objectId);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === added.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
});
(0, node_test_1.default)('keeps a complete no-ref renderer at a generic main weapon anchor fail-closed', function () {
    var _a;
    var fixture = makeCandidate('generic_main_anchor_attachment_policy', ['Policy_Body']);
    var added = addPolicyRenderer(fixture, {
        name: 'Aru_Original_Weapon',
        hierarchyPath: 'Cafe_Aru_Original/Aru_Original_Weapon',
        materialName: 'Aru_Original_Weapon_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
    });
    var bone = { file: 'CAB-prefab', pathId: 'weapon-root', name: 'Bip001_Weapon' };
    added.renderer.rootBone = bone;
    added.renderer.boneReferences = [bone];
    added.renderer.rootBoneAncestry = [];
    added.renderer.rootBoneAncestryComplete = true;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('GenericMainAnchor'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.deepEqual(profile.warnings, []);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
    strict_1.default.equal((_a = profile.coreRendererBlockers[0]) === null || _a === void 0 ? void 0 : _a.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT');
});
(0, node_test_1.default)('keeps a no-ref arrangement warning fail-closed when another active renderer shares its exact Bip001_Weapon ancestry', function () {
    var fixture = makeCandidate('shared_generic_weapon_anchor_policy', ['Policy_Body']);
    var added = addPolicyRenderer(fixture, {
        name: 'Aru_Original_Hagoita',
        hierarchyPath: 'Cafe_Aru_Original/Aru_Original_Hagoita',
        materialName: 'Aru_Original_Hagoita_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600005'),
    });
    var anchor = { file: 'CAB-prefab', pathId: 'shared-weapon-anchor', name: 'Bip001_Weapon' };
    var targetBone = { file: 'CAB-prefab', pathId: 'hagoita-root', name: 'bone_Hagoita' };
    added.renderer.rootBone = targetBone;
    added.renderer.boneReferences = [targetBone];
    added.renderer.rootBoneAncestry = [anchor];
    added.renderer.rootBoneAncestryComplete = true;
    var sibling = addPolicyRenderer(fixture, {
        name: 'Auxiliary_Renderer',
        hierarchyPath: 'Cafe_Aru_Original/Auxiliary_Renderer',
        materialName: 'Auxiliary_Renderer_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600006'),
    });
    var siblingBone = { file: 'CAB-prefab', pathId: 'auxiliary-root', name: 'bone_auxiliary' };
    sibling.renderer.rootBone = siblingBone;
    sibling.renderer.boneReferences = [siblingBone];
    sibling.renderer.rootBoneAncestry = [anchor];
    sibling.renderer.rootBoneAncestryComplete = true;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SharedGenericAnchor'));
    strict_1.default.deepEqual(profile.warnings, []);
    strict_1.default.equal(profile.coreRendererBlockers.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
});
function saoriInteractionProfile() {
    var profile = (0, types_1.emptyChibiProfile)('saori_original');
    profile.initialPose = SAORI_ACTIONS.idle;
    profile.interactions.idle = { state: 'available', clip: SAORI_ACTIONS.idle, loop: true };
    profile.interactions.walk = { state: 'available', clip: SAORI_ACTIONS.walk, loop: true };
    profile.interactions.pickup = { state: 'available', clip: SAORI_ACTIONS.pickup, hold: true };
    profile.interactions.touch = { state: 'available', clip: SAORI_ACTIONS.touch };
    return profile;
}
function saoriSwimsuitInteractionProfile() {
    var profile = (0, types_1.emptyChibiProfile)('ch0266');
    profile.initialPose = SAORI_SWIM_ACTIONS.idle;
    profile.interactions.idle = { state: 'available', clip: SAORI_SWIM_ACTIONS.idle, loop: true };
    profile.interactions.walk = { state: 'available', clip: SAORI_SWIM_ACTIONS.walk, loop: true };
    profile.interactions.pickup = { state: 'available', clip: SAORI_SWIM_ACTIONS.pickup, hold: true };
    profile.interactions.touch = { state: 'available', clip: SAORI_SWIM_ACTIONS.touch };
    return profile;
}
(0, node_test_1.default)('publishes only Saori original’s exact complete skinned handgun as a core arrangement warning', function () {
    var _a;
    var fixture = makeSaoriHandgunFixture();
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, saoriInteractionProfile());
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.deepEqual(profile.warnings.map(function (item) { return item.blocker.sourceReference.objectId; }), ['6419381600630976971']);
    strict_1.default.equal((_a = profile.warnings[0]) === null || _a === void 0 ? void 0 : _a.blocker.sourceMeshReference.objectId, '-5266263958877296907');
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === '6419381600630976971'; }), true);
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === '6419381600630976971'; }), false);
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === '7518749120114766283'
        && item.classification === 'structurally-bound-equipment'; }), true);
});
(0, node_test_1.default)('keeps Saori handgun attachment unresolved when source completeness or selected actions are uncertain', function () {
    var cases = __spreadArray(__spreadArray(__spreadArray([
        ['missing mesh', function (fixture) {
                fixture.handgun.renderer.meshSourceReference = null;
            }],
        ['missing material', function (fixture) {
                fixture.candidate.sourceMaterials = fixture.candidate.sourceMaterials.filter(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) !== SAORI_MATERIAL.objectId; });
            }],
        ['missing shader', function (fixture) {
                fixture.candidate.shaders = fixture.candidate.shaders.filter(function (shader) { var _a; return ((_a = shader.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) !== SAORI_SHADER.objectId; });
            }],
        ['missing bones', function (fixture) {
                fixture.handgun.renderer.rootBone = null;
                fixture.handgun.renderer.boneReferences = [];
            }],
        ['foreign prefab bone', function (fixture) {
                var foreign = reference(hash('f'), 'CAB-foreign-prefab', '-4468891664348106293');
                fixture.handgun.renderer.rootBone = {
                    file: foreign.serializedFile, pathId: foreign.objectId, name: 'bone_Weapon',
                };
            }],
        ['conflicting attachment anchors', function (fixture) {
                ;
                fixture.candidate.assembly[0].attachments.mainWeapon = [{
                        file: SAORI_CAB_FILE, pathId: 'different-weapon-anchor', name: 'Bip001_Weapon',
                    }];
            }],
        ['selected child-renderer event', function (fixture) {
                fixture.candidate.events = [{
                        clip: SAORI_ACTIONS.pickup, time: 0, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 0,
                        targetReference: fixture.handgun.sourceReference,
                    }];
            }]
    ], ['idle', 'walk', 'pickup', 'touch'].map(function (action) { return [
        "missing ".concat(action, " action"),
        function (_fixture, interaction) {
            interaction.interactions[action] = { state: 'unresolved', reason: "No verified ".concat(action, " action.") };
        },
    ]; }), true), Object.entries(SAORI_ACTIONS).map(function (_a) {
        var action = _a[0], clip = _a[1];
        return [
            "missing source ".concat(action, " clip"),
            function (fixture) {
                fixture.candidate.clips = fixture.candidate.clips.filter(function (item) { return item !== clip; });
            },
        ];
    }), true), [
        ['foreign source revision', function (fixture) {
                fixture.candidate.fingerprint = hash('f');
            }],
    ], false);
    for (var _i = 0, cases_9 = cases; _i < cases_9.length; _i++) {
        var _a = cases_9[_i], label = _a[0], mutate = _a[1];
        var fixture = makeSaoriHandgunFixture();
        var interaction = saoriInteractionProfile();
        mutate(fixture, interaction);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, interaction);
        strict_1.default.equal(profile.validation.valid, false, label);
        strict_1.default.deepEqual(profile.warnings, [], label);
        strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === '6419381600630976971'; }), false, label);
    }
});
(0, node_test_1.default)('publishes Saori swimsuit handgun and water cannon only as exact core arrangement warnings', function () {
    var fixture = makeSaoriSwimsuitFixture();
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, saoriSwimsuitInteractionProfile());
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.equal(profile.policyVersion, 'chibi-rendering-policy-v11');
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.deepEqual(profile.warnings.map(function (item) { return item.blocker.sourceReference; }), [
        reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-1127309643643137231'),
        reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-4763531541672078543'),
    ]);
    strict_1.default.deepEqual(profile.warnings.map(function (item) { return item.blocker.sourceReference.objectId; }), [
        '-1127309643643137231', '-4763531541672078543',
    ]);
    strict_1.default.deepEqual(profile.warnings.map(function (item) { return item.blocker.sourceMeshReference.objectId; }), [
        '-4114086136464228496', '-7008905148608425358',
    ]);
    strict_1.default.deepEqual(profile.warnings.map(function (item) { return item.blocker.sourceMaterialReferences[0]; }), [
        SAORI_SWIM_CANNON_MATERIAL, SAORI_SWIM_WEAPON_MATERIAL,
    ]);
    var _loop_4 = function (referenceId) {
        strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === referenceId; }), true);
        strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === referenceId; }), false);
    };
    for (var _i = 0, _a = ['-4763531541672078543', '-1127309643643137231']; _i < _a.length; _i++) {
        var referenceId = _a[_i];
        _loop_4(referenceId);
    }
});
(0, node_test_1.default)('keeps the Saori swimsuit renderer pair blocked when any source/action proof is tampered', function () {
    var cases = __spreadArray(__spreadArray([
        ['foreign candidate fingerprint', function (fixture) { fixture.candidate.fingerprint = hash('f'); }],
        ['tampered prefab bundle hash', function (fixture) { fixture.candidate.parts[0].sha256 = hash('f'); }],
        ['tampered animation bundle hash', function (fixture) { fixture.candidate.parts[1].sha256 = hash('f'); }],
        ['tampered prefab identity', function (fixture) { fixture.candidate.assembly[0].prefabReference.objectId = 'foreign-prefab'; }],
        ['tampered main weapon anchor', function (fixture) {
                fixture.candidate.assembly[0].attachments.mainWeapon[0].pathId = 'foreign-weapon';
            }],
        ['handgun mesh identity', function (fixture) { fixture.handgun.renderer.meshSourceReference = reference(hash('f'), 'CAB-foreign-mesh', '1'); }],
        ['water cannon mesh pointer', function (fixture) { fixture.waterCannon.renderer.mesh = { file: 'CAB-foreign-mesh', pathId: '1' }; }],
        ['missing water cannon material', function (fixture) {
                fixture.candidate.sourceMaterials = fixture.candidate.sourceMaterials.filter(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) !== SAORI_SWIM_CANNON_MATERIAL.objectId; });
            }],
        ['tampered handgun material name', function (fixture) {
                fixture.candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_WEAPON_MATERIAL.objectId; }).name = 'CH0266_Unrelated';
            }],
        ['missing weapon shader', function (fixture) {
                fixture.candidate.shaders = fixture.candidate.shaders.filter(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) !== SAORI_SWIM_SHADER.objectId; });
            }],
        ['incomplete water cannon ancestry', function (fixture) {
                ;
                fixture.waterCannon.renderer.rootBoneAncestryComplete = false;
            }],
        ['foreign handgun ancestry', function (fixture) {
                ;
                fixture.handgun.renderer.rootBoneAncestry[1].file = 'CAB-foreign-prefab';
            }],
        ['selected child-renderer event', function (fixture) {
                fixture.candidate.events = [{
                        clip: SAORI_SWIM_ACTIONS.pickup, time: 0, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 0,
                        targetReference: fixture.waterCannon.sourceReference,
                    }];
            }],
        ['missing pinned primary equipment reference', function (fixture) {
                fixture.candidate.assembly[0].attachments.equipmentRendererReferences = [];
            }],
        ['foreign primary equipment reference', function (fixture) {
                fixture.candidate.assembly[0].attachments.equipmentRendererReferences = [
                    reference('f'.repeat(64), 'CAB-foreign-equipment', '-7932837843349318863'),
                ];
            }],
        ['extra unresolved equipment reference', function (fixture) {
                fixture.candidate.assembly[0].attachments.equipmentRendererReferences.push(reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-4763531541672078543'));
            }],
        ['duplicate pinned primary equipment reference', function (fixture) {
                fixture.candidate.assembly[0].attachments.equipmentRendererReferences.push(reference(SAORI_SWIM_CAB, SAORI_SWIM_CAB_FILE, '-7932837843349318863'));
            }],
        ['missing primary weapon bone reference', function (fixture) {
                fixture.primary.renderer.boneReferences.pop();
            }],
        ['foreign primary weapon bone reference', function (fixture) {
                fixture.primary.renderer.boneReferences[1].pathId = 'foreign-bone';
            }],
        ['extra primary weapon bone reference', function (fixture) {
                fixture.primary.renderer.boneReferences.push({
                    file: SAORI_SWIM_CAB_FILE, pathId: 'foreign-bone', name: 'bone_foreign',
                });
            }],
        ['reordered primary weapon bone references', function (fixture) {
                var _a;
                var bones = fixture.primary.renderer.boneReferences;
                _a = [bones[2], bones[1]], bones[1] = _a[0], bones[2] = _a[1];
            }],
        ['foreign material shader reference', function (fixture) {
                fixture.candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_WEAPON_MATERIAL.objectId; }).shaderReference =
                    reference(SAORI_SWIM_SHADER.bundleSha256, SAORI_SWIM_SHADER.serializedFile, 'foreign-shader');
            }],
        ['foreign material parsed shader name', function (fixture) {
                fixture.candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_WEAPON_MATERIAL.objectId; }).shaderParsedName = 'MX/C-Foreign';
            }],
        ['missing material parsed shader name', function (fixture) {
                fixture.candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_WEAPON_MATERIAL.objectId; }).shaderParsedName = '';
            }],
        ['foreign parsed shader name', function (fixture) {
                fixture.candidate.shaders.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_SHADER.objectId; }).parsedName = 'MX/C-Foreign';
            }],
        ['missing parsed shader name', function (fixture) {
                fixture.candidate.shaders.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_SHADER.objectId; }).parsedName = '';
            }],
        ['mismatched nonempty material shader name', function (fixture) {
                fixture.candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_WEAPON_MATERIAL.objectId; }).shaderName = 'MX/C-Foreign';
            }],
        ['mismatched nonempty shader name', function (fixture) {
                fixture.candidate.shaders.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_SHADER.objectId; }).name = 'MX/C-Foreign';
            }],
        ['mixed empty and nonempty source shader names', function (fixture) {
                fixture.candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_WEAPON_MATERIAL.objectId; }).shaderName = 'MX/C-Weapon';
            }],
        ['mixed nonempty and empty source shader names', function (fixture) {
                fixture.candidate.shaders.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === SAORI_SWIM_SHADER.objectId; }).name = 'MX/C-Weapon';
            }]
    ], Object.entries(SAORI_SWIM_ACTIONS).map(function (_a) {
        var action = _a[0], clip = _a[1];
        return [
            "missing source ".concat(action, " clip"),
            function (fixture) { fixture.candidate.clips = fixture.candidate.clips.filter(function (item) { return item !== clip; }); },
        ];
    }), true), ['idle', 'walk', 'pickup', 'touch'].map(function (action) { return [
        "unresolved ".concat(action, " action"),
        function (_fixture, interaction) {
            interaction.interactions[action] = { state: 'unresolved', reason: "Missing ".concat(action, ".") };
        },
    ]; }), true);
    for (var _i = 0, cases_10 = cases; _i < cases_10.length; _i++) {
        var _a = cases_10[_i], label = _a[0], mutate = _a[1];
        var fixture = makeSaoriSwimsuitFixture();
        var interaction = saoriSwimsuitInteractionProfile();
        mutate(fixture, interaction);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, interaction);
        strict_1.default.equal(profile.validation.valid, false, label);
        strict_1.default.deepEqual(profile.warnings, [], label);
        var _loop_5 = function (referenceId) {
            strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === referenceId; }), false, label);
        };
        for (var _b = 0, _c = ['-4763531541672078543', '-1127309643643137231']; _b < _c.length; _b++) {
            var referenceId = _c[_b];
            _loop_5(referenceId);
        }
    }
});
(0, node_test_1.default)('publishes only the exact Misaki and Mari rig-mount groups as core arrangement warnings', function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var _loop_6 = function (source) {
        var fixture = makeSourcePinnedRigMountFixture(source);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, sourcePinnedRigMountInteraction(source));
        var expectedReferences = source.members.map(function (member) { return reference(source.prefab.bundle, source.prefab.file, member.id); });
        strict_1.default.equal(profile.validation.valid, true, "".concat(source.identity, ": ").concat(profile.validation.unresolved.join('; ')));
        strict_1.default.deepEqual(profile.coreRendererBlockers, [], source.identity);
        strict_1.default.equal(profile.warnings.length, 1, source.identity);
        strict_1.default.equal((_a = profile.warnings[0]) === null || _a === void 0 ? void 0 : _a.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT', source.identity);
        strict_1.default.deepEqual((_b = profile.warnings[0]) === null || _b === void 0 ? void 0 : _b.sourceGroupReferences, expectedReferences, source.identity);
        strict_1.default.match((_d = (_c = profile.warnings[0]) === null || _c === void 0 ? void 0 : _c.message) !== null && _d !== void 0 ? _d : '', /no authored main\/sub slot/);
        strict_1.default.equal((_f = (_e = profile.warnings[0]) === null || _e === void 0 ? void 0 : _e.sourceEvidence) === null || _f === void 0 ? void 0 : _f.some(function (item) { return item.includes('audited clip binding evidence'); }), true);
        strict_1.default.deepEqual(profile.equipmentBindingEvidence
            .filter(function (item) { return expectedReferences.some(function (reference) { return referenceKeyForTest(reference) === referenceKeyForTest(item.sourceReference); }); })
            .map(function (item) { return item.reasonCode; }), ['STRUCTURAL_TRANSFORM_BONE_ANCESTRY', 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY']);
        var _loop_7 = function (member) {
            var memberReference = reference(source.prefab.bundle, source.prefab.file, member.id);
            var included = profile.renderers.find(function (renderer) { return renderer.sourceReference
                && referenceKeyForTest(renderer.sourceReference) === referenceKeyForTest(memberReference); });
            strict_1.default.ok(included, "".concat(source.identity, "/").concat(member.name, " remains in the core render list"));
            strict_1.default.equal(profile.excludedRenderers.some(function (renderer) { return referenceKeyForTest(renderer.sourceReference) === referenceKeyForTest(memberReference); }), false);
            strict_1.default.equal((_h = (_g = included.materialSlots[0]) === null || _g === void 0 ? void 0 : _g.sourceMaterialReference) === null || _h === void 0 ? void 0 : _h.objectId, member.material);
            strict_1.default.ok((_k = (_j = included.materialSlots[0]) === null || _j === void 0 ? void 0 : _j.materialProperties.textures[0]) === null || _k === void 0 ? void 0 : _k.textureReference, "".concat(source.identity, "/").concat(member.name, " keeps its source texture binding"));
        };
        for (var _l = 0, _m = source.members; _l < _m.length; _l++) {
            var member = _m[_l];
            _loop_7(member);
        }
    };
    for (var _i = 0, PINNED_RIG_MOUNT_TEST_SOURCES_1 = PINNED_RIG_MOUNT_TEST_SOURCES; _i < PINNED_RIG_MOUNT_TEST_SOURCES_1.length; _i++) {
        var source = PINNED_RIG_MOUNT_TEST_SOURCES_1[_i];
        _loop_6(source);
    }
});
(0, node_test_1.default)('keeps source-pinned rig-mount warnings fail-closed for changed members, assets, and actions', function () {
    var sharedCases = [
        ['foreign dependency fingerprint', function (fixture) { fixture.candidate.fingerprint = hash('f'); }],
        ['tampered prefab source object', function (fixture) { fixture.assembly.prefabReference.objectId = 'foreign-prefab'; }],
        ['incomplete expected member', function (fixture) {
                fixture.assembly.renderers = fixture.assembly.renderers.filter(function (renderer) { var _a, _b; return ((_a = renderer.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) !== ((_b = fixture.source.members[1]) === null || _b === void 0 ? void 0 : _b.id); });
            }],
        ['tampered rig-mount bone pointer', function (fixture) {
                fixture.memberRenderers[0].boneReferences[0].pathId = 'foreign-anchor';
            }],
        ['tampered member material reference', function (fixture) {
                fixture.memberRenderers[0].materialSlots[0].sourceMaterialReference = reference(hash('f'), 'CAB-foreign-material', 'foreign-material');
            }],
        ['extra active renderer on the same anchor', function (fixture) {
                var extra = addPolicyRenderer(fixture, {
                    name: 'Extra_Weapon_Mount', hierarchyPath: "".concat(fixture.source.root, "/Extra_Weapon_Mount"),
                    materialName: 'Extra_Weapon_Mount_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
                }).renderer;
                var anchorReference = reference(fixture.source.prefab.bundle, fixture.source.prefab.file, fixture.source.anchor[0]);
                extra.enabled = true;
                extra.gameObjectActive = true;
                extra.visible = true;
                extra.rootBone = {
                    file: fixture.source.prefab.file,
                    pathId: fixture.source.anchor[0],
                    name: fixture.source.anchor[1],
                    sourceReference: anchorReference,
                };
                fixture.assembly.rendererOrder = fixture.assembly.renderers.map(function (renderer) { return renderer.name; });
            }],
        ['extra attachment metadata', function (fixture) {
                fixture.assembly.attachments.equipmentRendererGroups = [{
                        kind: 'structuralWeapon',
                        attachment: { file: fixture.source.prefab.file, pathId: fixture.source.anchor[0], name: fixture.source.anchor[1] },
                        sourceReferences: [], evidence: [],
                    }];
            }],
    ];
    var _loop_8 = function (source) {
        var cases = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], sharedCases, true), ['idle', 'walk', 'pickup', 'touch'].flatMap(function (action) { return [
            ["missing source ".concat(action, " clip"), function (fixture) {
                    fixture.candidate.clips = fixture.candidate.clips.filter(function (clip) { return clip !== source.actions[action]; });
                }],
            ["mismatched ".concat(action, " action clip"), function (_fixture, interaction) {
                    interaction.interactions[action] = { state: 'available', clip: "".concat(source.actions[action], "_mismatch") };
                }],
            ["unavailable ".concat(action, " action"), function (_fixture, interaction) {
                    interaction.interactions[action] = { state: 'unresolved', reason: "Missing ".concat(action, ".") };
                }],
        ]; }), true), [
            ['tampered prefab bundle bytes', function (fixture) {
                    fixture.candidate.parts.find(function (part) { return part.entryPath === source.prefabEntry.path; }).sha256 = hash('f');
                }]
        ], false), source.animationEntries.map(function (entry, index) { return [
            "tampered animation bundle bytes ".concat(index + 1),
            function (fixture) {
                fixture.candidate.parts.find(function (part) { return part.entryPath === entry.path; }).sha256 = hash('f');
            },
        ]; }), true);
        for (var _a = 0, cases_11 = cases; _a < cases_11.length; _a++) {
            var _b = cases_11[_a], label = _b[0], mutate = _b[1];
            var fixture = makeSourcePinnedRigMountFixture(source);
            var interaction = sourcePinnedRigMountInteraction(source);
            mutate(fixture, interaction);
            var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, interaction);
            strict_1.default.equal(profile.validation.valid, false, "".concat(source.identity, ": ").concat(label));
            strict_1.default.deepEqual(profile.warnings, [], "".concat(source.identity, ": ").concat(label));
            strict_1.default.ok(profile.validation.unresolved.length > 0, "".concat(source.identity, ": ").concat(label));
        }
    };
    for (var _i = 0, PINNED_RIG_MOUNT_TEST_SOURCES_2 = PINNED_RIG_MOUNT_TEST_SOURCES; _i < PINNED_RIG_MOUNT_TEST_SOURCES_2.length; _i++) {
        var source = PINNED_RIG_MOUNT_TEST_SOURCES_2[_i];
        _loop_8(source);
    }
});
(0, node_test_1.default)('does not generalize source-pinned same-anchor warnings to Juri or arbitrary weapon groups', function () {
    var source = PINNED_RIG_MOUNT_TEST_SOURCES[0];
    var fixture = makeSourcePinnedRigMountFixture(source);
    fixture.candidate.sourceIdentity = 'juri_original';
    fixture.candidate.fingerprint = hash('j');
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, sourcePinnedRigMountInteraction(source));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.deepEqual(profile.warnings, []);
    strict_1.default.equal(profile.coreRendererBlockers.length > 0, true);
});
(0, node_test_1.default)('relaxes a secondary prop only when an exact equipment ref binds a different main slot', function () {
    var _a, _b, _c;
    var fixture = makeCandidate('secondary_prop_attachment_policy', ['Policy_Body']);
    var primary = addPolicyRenderer(fixture, {
        name: 'Primary_Weapon',
        hierarchyPath: 'Cafe_Secondary/Primary_Weapon',
        materialName: 'Primary_Weapon_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600003'),
    });
    var primaryBone = { file: 'CAB-prefab', pathId: 'primary-root', name: 'Bip001_Weapon' };
    primary.renderer.rootBone = primaryBone;
    primary.renderer.boneReferences = [primaryBone];
    primary.renderer.rootBoneAncestry = [];
    primary.renderer.rootBoneAncestryComplete = true;
    var secondary = addPolicyRenderer(fixture, {
        name: 'Secondary_Chain_Prop',
        hierarchyPath: 'Cafe_Secondary/Secondary_Chain_Prop',
        materialName: 'Secondary_Chain_Prop_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600004'),
    });
    var secondaryBone = { file: 'CAB-prefab', pathId: 'secondary-root', name: 'bone_chain_01' };
    secondary.renderer.rootBone = secondaryBone;
    secondary.renderer.boneReferences = [secondaryBone];
    secondary.renderer.rootBoneAncestry = [];
    secondary.renderer.rootBoneAncestryComplete = true;
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.equipmentRendererReferences = [primary.sourceReference];
    attachments.mainWeapon = [primaryBone];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SecondaryProp'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.deepEqual(profile.warnings.map(function (item) { return item.blocker.sourceReference.objectId; }), [secondary.sourceReference.objectId]);
    strict_1.default.equal((_a = profile.warnings[0]) === null || _a === void 0 ? void 0 : _a.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT');
    strict_1.default.match((_c = (_b = profile.warnings[0]) === null || _b === void 0 ? void 0 : _b.blocker.evidence.join(' | ')) !== null && _c !== void 0 ? _c : '', /exact source renderer reference/);
    secondary.renderer.rootBone = primaryBone;
    secondary.renderer.boneReferences = [primaryBone];
    var pointerMatchProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SecondaryPropPointerMatch'));
    strict_1.default.deepEqual(pointerMatchProfile.warnings, []);
    strict_1.default.deepEqual(pointerMatchProfile.coreRendererBlockers, []);
    secondary.renderer.rootBone = secondaryBone;
    secondary.renderer.boneReferences = [secondaryBone];
    fixture.candidate.events = [{
            clip: fixture.candidate.clips[0], time: 0, function: 'AniEvt_DisableChildRenderer',
            string: '', float: 0, int: 0, targetReference: secondary.sourceReference,
        }];
    var eventTargetProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SecondaryPropEventTarget'));
    strict_1.default.equal(eventTargetProfile.validation.valid, false);
    strict_1.default.deepEqual(eventTargetProfile.warnings, []);
    strict_1.default.deepEqual(eventTargetProfile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [secondary.sourceReference.objectId]);
});
(0, node_test_1.default)('publishes source-complete animated Haruna fish and Koharu grenade as core arrangement warnings', function () {
    var _a;
    var cases = [
        makeExactAnimatedPropFixture('haruna_original', 'Haruna_Original_Fishshapedbun_Weapon', 'Haruna_Original_Fishshapedbun', 'Fishshapedbun_bone'),
        makeExactAnimatedPropFixture('koharu_original', 'Koharu_Original_Grenade', 'Koharu_Original_Grenade', 'bone_grenade', ['bone_root']),
    ];
    var _loop_9 = function (fixture, primary, prop) {
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)(prop.renderer.name));
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === primary.sourceReference.objectId; }), true);
        strict_1.default.deepEqual(profile.coreRendererBlockers, []);
        strict_1.default.deepEqual(profile.warnings.map(function (item) { return item.blocker.sourceReference.objectId; }), [prop.sourceReference.objectId]);
        strict_1.default.equal((_a = profile.warnings[0]) === null || _a === void 0 ? void 0 : _a.reasonCode, 'UNRESOLVED_WEAPON_EQUIPMENT_ATTACHMENT');
        strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === prop.sourceReference.objectId; }), true);
        strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === prop.sourceReference.objectId; }), false);
        strict_1.default.deepEqual(profile.validation.warnings, profile.warnings);
    };
    for (var _i = 0, cases_12 = cases; _i < cases_12.length; _i++) {
        var _b = cases_12[_i], fixture = _b.fixture, primary = _b.primary, prop = _b.prop;
        _loop_9(fixture, primary, prop);
    }
});
(0, node_test_1.default)('keeps animated standalone prop blockers fail-closed when source ancestry is incomplete or an action targets the renderer', function () {
    var ancestryTamper = makeExactAnimatedPropFixture('haruna_original', 'Haruna_Original_Fishshapedbun_Weapon', 'Haruna_Original_Fishshapedbun', 'Fishshapedbun_bone');
    ancestryTamper.prop.renderer.rootBoneAncestryComplete = false;
    var eventTamper = makeExactAnimatedPropFixture('koharu_original', 'Koharu_Original_Grenade', 'Koharu_Original_Grenade', 'bone_grenade', ['bone_root']);
    eventTamper.fixture.candidate.events = [{
            clip: eventTamper.fixture.candidate.clips[0], time: 0, function: 'AniEvt_DisableChildRenderer',
            string: '', float: 0, int: 0, targetReference: eventTamper.prop.sourceReference,
        }];
    var _loop_10 = function (fixture, prop) {
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)(prop.renderer.name));
        strict_1.default.equal(profile.validation.valid, false);
        strict_1.default.deepEqual(profile.warnings, []);
        strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [prop.sourceReference.objectId]);
        strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === prop.sourceReference.objectId; }), false);
    };
    for (var _i = 0, _a = [ancestryTamper, eventTamper]; _i < _a.length; _i++) {
        var _b = _a[_i], fixture = _b.fixture, prop = _b.prop;
        _loop_10(fixture, prop);
    }
});
(0, node_test_1.default)('does not block a meaningful equipment renderer once an exact authored relation is present', function () {
    var fixture = makeCandidate('resolved_equipment_relation_policy', ['Policy_Body']);
    var added = addPolicyRenderer(fixture, {
        name: 'Neru_Original_Weapon_01',
        hierarchyPath: 'Cafe_Resolved_Equipment/Neru_Original_Weapon_01',
        materialName: 'Neru_Original_Weapon_01_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
        equipmentReference: true,
    });
    var bone = { file: 'CAB-policy-bones', pathId: 'weapon-root', name: 'Bip001_Weapon_R' };
    added.renderer.rootBone = bone;
    added.renderer.boneReferences = [bone];
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.mainWeapon = [bone];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('ResolvedEquipment'));
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === added.sourceReference.objectId; }), true);
});
(0, node_test_1.default)('retains evidence for an exact same-prefab two-renderer mainWeapon group', function () {
    var fixture = makeCandidate('aris_maid_group_policy', ['Policy_Body']);
    var first = addPolicyRenderer(fixture, {
        name: 'Aris_Original_Weapon', hierarchyPath: 'Cafe_CH0200/Aris_Original_Weapon',
        materialName: 'Aris_Original_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
    });
    var second = addPolicyRenderer(fixture, {
        name: 'FX_Aris_Original_Weapon', hierarchyPath: 'Cafe_CH0200/FX_Aris_Original_Weapon',
        materialName: 'FX_Aris_Original_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
    });
    var unrelated = addPolicyRenderer(fixture, {
        name: 'Policy_Accessory', hierarchyPath: 'Cafe_CH0200/Policy_Accessory',
        materialName: 'Policy_Accessory_Material', shaderName: 'MX/C-General', rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600003'),
    });
    var attachment = { file: 'CAB-prefab', pathId: 'aris-weapon', name: 'Bip001_Weapon' };
    for (var _i = 0, _a = [first.renderer, second.renderer]; _i < _a.length; _i++) {
        var renderer = _a[_i];
        renderer.rootBone = attachment;
        renderer.transformChain = [{ file: 'CAB-prefab', pathId: 'root', name: fixture.candidate.assembly[0].root }, attachment, { file: 'CAB-prefab', pathId: renderer.pathId, name: renderer.name }];
        renderer.boneReferences = [attachment];
    }
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.mainWeapon = [attachment];
    attachments.equipmentRendererReferences = [first.sourceReference, second.sourceReference, unrelated.sourceReference];
    attachments.equipmentRendererGroups = [{
            kind: 'mainWeapon',
            attachment: attachment,
            sourceReferences: [first.sourceReference, second.sourceReference],
            evidence: ['exact mainWeapon pointer cab-prefab:aris-weapon', 'unique same-prefab mainWeapon renderer group'],
        }];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('ArisMaidGroup'));
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.deepEqual(profile.equipmentBindingEvidence.map(function (item) { return item.sourceReference.objectId; }).sort(), ['600001', '600002', '600003']);
    strict_1.default.ok(profile.equipmentBindingEvidence.every(function (item) { return item.classification === 'exact-equipment-renderer'; }));
    strict_1.default.match(profile.equipmentBindingEvidence[0].evidence.join(' | '), /unique same-prefab mainWeapon renderer group/);
    var unrelatedEvidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === unrelated.sourceReference.objectId; });
    strict_1.default.ok(unrelatedEvidence);
    strict_1.default.doesNotMatch(unrelatedEvidence.evidence.join(' | '), /unique same-prefab mainWeapon renderer group/);
});
(0, node_test_1.default)('retains evidence for an exact same-prefab structural Bip001_Weapon group without a slot', function () {
    var fixture = makeCandidate('non_slot_structural_group_policy', ['Policy_Body']);
    var first = addPolicyRenderer(fixture, {
        name: 'Nonomi_Weapon', hierarchyPath: 'Cafe_CH0092/Nonomi_Weapon',
        materialName: 'Nonomi_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600001'),
    });
    var second = addPolicyRenderer(fixture, {
        name: 'CH0092_Weapon', hierarchyPath: 'Cafe_CH0092/CH0092_Weapon',
        materialName: 'CH0092_Weapon_Material', shaderName: 'MX/C-Weapon', rendererType: 'SkinnedMeshRenderer',
        sourceReference: reference(hash('a'), 'CAB-prefab', '600002'),
    });
    var attachment = { file: 'CAB-prefab', pathId: 'bip001-weapon', name: 'Bip001_Weapon' };
    for (var _i = 0, _a = [first.renderer, second.renderer]; _i < _a.length; _i++) {
        var renderer = _a[_i];
        renderer.rootBone = attachment;
        renderer.transformChain = [{ file: 'CAB-prefab', pathId: 'root', name: fixture.candidate.assembly[0].root }, attachment, { file: 'CAB-prefab', pathId: renderer.pathId, name: renderer.name }];
        renderer.boneReferences = [attachment];
    }
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.equipmentRendererReferences = [first.sourceReference, second.sourceReference];
    attachments.equipmentRendererGroups = [{
            kind: 'structuralWeapon',
            attachment: attachment,
            sourceReferences: [first.sourceReference, second.sourceReference],
            evidence: ['exact same-prefab Bip001_Weapon m_Bones anchor cab-prefab:bip001-weapon', 'unique same-prefab structural Bip001_Weapon renderer group'],
        }];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('NonSlotStructuralGroup'));
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.deepEqual(profile.equipmentBindingEvidence.map(function (item) { return item.sourceReference.objectId; }).filter(function (id) { return ['600001', '600002'].includes(id); }).sort(), ['600001', '600002']);
    var _loop_11 = function (objectId) {
        var evidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === objectId; });
        strict_1.default.ok(evidence);
        strict_1.default.equal(evidence.classification, 'exact-equipment-renderer');
        strict_1.default.match(evidence.evidence.join(' | '), /unique same-prefab structural Bip001_Weapon renderer group/);
    };
    for (var _b = 0, _c = ['600001', '600002']; _b < _c.length; _b++) {
        var objectId = _c[_b];
        _loop_11(objectId);
    }
});
(0, node_test_1.default)('blocks exact source-complete core geometry with the known head/torso separation evidence', function () {
    var fixture = makeSenaCoreGeometryFixture();
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SenaCoreGeometry'));
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.deepEqual(profile.warnings, []);
    strict_1.default.deepEqual(profile.validation.coreGeometryBlockers, profile.coreGeometryBlockers);
    strict_1.default.equal(profile.coreGeometryBlockers.length, 1);
    var blocker = profile.coreGeometryBlockers[0];
    strict_1.default.equal(blocker.reasonCode, 'SOURCE_AUTHORED_CORE_GEOMETRY_SEPARATION');
    strict_1.default.equal(blocker.name, 'CH0081_Body');
    strict_1.default.equal(blocker.sourceReference.objectId, '-6903816935868408574');
    strict_1.default.equal(blocker.sourceMeshReference.objectId, '8052939068824350260');
    strict_1.default.deepEqual(blocker.geometryEvidence, {
        primitiveIndex: 0,
        components: ['Head', 'torso'],
        sourceGap: 0.1780399764,
        sourceUnit: 'Unity mesh units',
        bridgingTriangles: 0,
    });
    strict_1.default.match(profile.validation.unresolved.join(' '), /source-complete but visually unacceptable/);
    strict_1.default.match(profile.validation.unresolved.join(' '), /0\.1780399764 Unity mesh units gap, and 0 bridging triangles/);
    strict_1.default.doesNotMatch(profile.validation.unresolved.join(' '), /No exact canonical source identity/);
});
(0, node_test_1.default)('does not apply the core geometry blocker to a name/identity-only or tampered near-match', function () {
    var mutateSource = [
        function (fixture) { fixture.candidate.assembly[0].renderers[0].meshSourceReference.bundleSha256 = hash('z'); },
        function (fixture) { fixture.candidate.assembly[0].renderers[0].meshSourceReference.objectId = '8052939068824350261'; },
        function (fixture) { fixture.candidate.assembly[0].renderers[0].sourceReference.objectId = '-6903816935868408575'; },
        function (fixture) { fixture.candidate.assembly[0].prefabReference.objectId = '-8585771901269975807'; },
    ];
    for (var _i = 0, mutateSource_1 = mutateSource; _i < mutateSource_1.length; _i++) {
        var mutate = mutateSource_1[_i];
        var fixture = makeSenaCoreGeometryFixture('ch0081');
        mutate(fixture);
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SenaCoreGeometryNearMatch'));
        strict_1.default.deepEqual(profile.coreGeometryBlockers, []);
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
    }
});
(0, node_test_1.default)('classifies Sena- and Aru-shaped weapons only from an exact same-prefab Bip001_Weapon m_Bones anchor', function () {
    var shapes = [
        ['sena_shaped_structural_policy', 'CH0081_Weapon', 'bone_bag_main'],
        ['aru_newyear_shaped_structural_policy', 'Aru_Newyear_Weapon', 'bone_chain_01'],
    ];
    var _loop_12 = function (identity, name_6, rootBoneName) {
        var fixture = makeCandidate(identity, ['Policy_Body']);
        var added = addStructuralEquipmentRenderer(fixture, { name: name_6 });
        var anchor = shapeBip001WeaponAnchor(fixture, added, rootBoneName).anchor;
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)(identity));
        var evidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; });
        strict_1.default.ok(evidence);
        strict_1.default.equal(evidence.classification, 'structurally-bound-equipment');
        strict_1.default.equal(evidence.reasonCode, 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY');
        strict_1.default.deepEqual(evidence.matchedAncestorPointers.filter(function (item) { return item.name === 'Bip001_Weapon'; }), [anchor]);
        strict_1.default.deepEqual(evidence.bodyRendererReferences, []);
        strict_1.default.deepEqual(profile.coreRendererBlockers, []);
        strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
        strict_1.default.match(evidence.evidence.join(' | '), /exact source shader reference/);
        strict_1.default.match(evidence.evidence.join(' | '), /unique non-conflicting same-prefab transform\/bone relation/);
    };
    for (var _i = 0, shapes_1 = shapes; _i < shapes_1.length; _i++) {
        var _a = shapes_1[_i], identity = _a[0], name_6 = _a[1], rootBoneName = _a[2];
        _loop_12(identity, name_6, rootBoneName);
    }
});
(0, node_test_1.default)('promotes only the Aru-shaped weapon while retaining the separate Hagoita blocker', function () {
    var fixture = makeCandidate('aru_newyear_shaped_with_hagoita_policy', ['Policy_Body']);
    var weapon = addStructuralEquipmentRenderer(fixture, { name: 'Aru_Newyear_Weapon' });
    shapeBip001WeaponAnchor(fixture, weapon, 'bone_chain_01');
    var hagoita = addPolicyRenderer(fixture, {
        name: 'Aru_Newyear_Hagoita',
        hierarchyPath: 'Cafe_Aru_Newyear/Aru_Newyear_Hagoita',
        materialName: 'Aru_Newyear_Hagoita_Material',
        shaderName: 'MX/C-Weapon',
        rendererType: 'SkinnedMeshRenderer',
    });
    var hagoitaBone = { file: 'CAB-policy-bones', pathId: 'hagoita-root', name: 'bone_Handbag_01' };
    hagoita.renderer.rootBone = hagoitaBone;
    hagoita.renderer.transformChain = [
        { file: 'CAB-policy-prefab', pathId: 'root', name: fixture.candidate.assembly[0].root },
        { file: 'CAB-policy-prefab', pathId: 'hagoita', name: hagoita.renderer.name },
    ];
    hagoita.renderer.boneReferences = [hagoitaBone];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('AruNewyearHagoita'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.name; }), ['Aru_Newyear_Hagoita']);
    strict_1.default.equal(profile.validation.valid, false);
});
(0, node_test_1.default)('keeps a Sena-shaped weapon blocked when its Bip001_Weapon anchor crosses prefabs', function () {
    var fixture = makeCandidate('sena_cross_prefab_anchor_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' });
    var rootBone = shapeBip001WeaponAnchor(fixture, added, 'bone_bag_main').rootBone;
    added.renderer.boneReferences = [__assign(__assign({}, rootBone), { pathId: 'foreign-bip001-weapon', name: 'Bip001_Weapon', file: 'CAB-other-prefab' })];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SenaCrossPrefab'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps a Sena-shaped weapon blocked when the same-name root pointer collides with its exact anchor', function () {
    var fixture = makeCandidate('sena_anchor_collision_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' });
    var anchor = shapeBip001WeaponAnchor(fixture, added, 'bone_bag_main').anchor;
    added.renderer.rootBone = __assign(__assign({}, anchor), { pathId: 'different-bip001-weapon', name: 'Bip001_Weapon' });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SenaAnchorCollision'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps a Sena-shaped weapon blocked when its exact Bip001_Weapon anchor is shared by the body', function () {
    var fixture = makeCandidate('sena_anchor_body_collision_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' });
    var anchor = shapeBip001WeaponAnchor(fixture, added, 'bone_bag_main').anchor;
    added.body.boneReferences = [__assign({}, anchor)];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SenaAnchorBodyCollision'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps same-prefab structural weapons blocked when a visible competing renderer shares the exact anchor', function () {
    var fixture = makeCandidate('same_prefab_anchor_competition_policy', ['Policy_Body']);
    var first = addStructuralEquipmentRenderer(fixture, { name: 'CH0081_Weapon' });
    var second = addStructuralEquipmentRenderer(fixture, { name: 'Aru_Newyear_Weapon' });
    shapeBip001WeaponAnchor(fixture, first, 'bone_bag_main');
    shapeBip001WeaponAnchor(fixture, second, 'bone_chain_01');
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('AnchorCompetition'));
    strict_1.default.deepEqual(profile.equipmentBindingEvidence, []);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }).sort(), [first.sourceReference.objectId, second.sourceReference.objectId].sort());
});
(0, node_test_1.default)('classifies exact same-prefab Bip001 whitespace prop ancestry as structural equipment', function () {
    var fixture = makeCandidate('structural_bip001_prop1_whitespace_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture, { name: 'CH0332_Weapon' });
    var assembly = fixture.candidate.assembly[0];
    var pointer = function (pathId, name) { return ({ file: 'CAB-prefab', pathId: pathId, name: name }); };
    var rootBone = pointer('prop1', 'Bip001 Prop1');
    added.renderer.hierarchyPath = "".concat(assembly.root, "/CH0332_Weapon");
    added.renderer.rootBone = rootBone;
    added.renderer.transformChain = [pointer('root', assembly.root), pointer('renderer', added.renderer.name)];
    added.renderer.boneReferences = [rootBone, pointer('magazine', 'bone_w_magazine')];
    added.body.boneReferences = [];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralBip001Prop1'));
    var evidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; });
    strict_1.default.ok(evidence);
    strict_1.default.equal(evidence.classification, 'structurally-bound-equipment');
    strict_1.default.deepEqual(evidence.matchedAncestorPointers.map(function (item) { return item.name; }), ['Bip001 Prop1']);
    strict_1.default.deepEqual(evidence.bodyRendererReferences, []);
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
});
(0, node_test_1.default)('does not promote Bip001 whitespace prop ancestry when its pointer leaves the selected prefab', function () {
    var fixture = makeCandidate('structural_bip001_prop1_cross_prefab_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture, { name: 'CH0332_Weapon' });
    var assembly = fixture.candidate.assembly[0];
    var pointer = function (file, pathId, name) { return ({ file: file, pathId: pathId, name: name }); };
    var rootBone = pointer('CAB-other-prefab', 'prop1', 'Bip001 Prop1');
    added.renderer.hierarchyPath = "".concat(assembly.root, "/CH0332_Weapon");
    added.renderer.rootBone = rootBone;
    added.renderer.transformChain = [pointer('CAB-prefab', 'root', assembly.root), pointer('CAB-prefab', 'renderer', added.renderer.name)];
    added.renderer.boneReferences = [rootBone, pointer('CAB-other-prefab', 'magazine', 'bone_w_magazine')];
    added.body.boneReferences = [];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralBip001Prop1CrossPrefab'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
});
(0, node_test_1.default)('classifies a source-exact weapon with a unique same-prefab Bip001_Weapon m_Bones anchor as structural equipment', function () {
    var _a, _b, _c, _d, _e, _f;
    var fixture = makeCandidate('structural_weapon_relation_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture);
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralEquipment'));
    var evidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; });
    strict_1.default.ok(evidence);
    strict_1.default.equal(evidence.classification, 'structurally-bound-equipment');
    strict_1.default.equal(evidence.reasonCode, 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY');
    strict_1.default.match(evidence.reason, /no mainWeapon\/subWeapon slot was inferred/);
    strict_1.default.deepEqual(evidence.bodyRendererReferences, []);
    strict_1.default.deepEqual(evidence.matchedAncestorPointers.map(function (item) { return item.name; }), ['Bip001_Weapon']);
    strict_1.default.deepEqual(profile.validation.equipmentBindingEvidence, profile.equipmentBindingEvidence);
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.equal((_c = (_b = (_a = profile.assembly) === null || _a === void 0 ? void 0 : _a.attachments.mainWeapon) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0, 0);
    strict_1.default.equal((_f = (_e = (_d = profile.assembly) === null || _d === void 0 ? void 0 : _d.attachments.subWeapon) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0, 0);
});
(0, node_test_1.default)('classifies a Hoshino-shaped shield from a unique exact shared m_Bones relation', function () {
    var fixture = makeCandidate('hoshino_armed_shared_shield_policy', ['Policy_Body']);
    var _a = addSharedBoneShieldRenderers(fixture), weapon = _a.weapon, shield = _a.shield, sharedBones = _a.sharedBones;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('HoshinoArmedSharedShield'));
    var weaponEvidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; });
    var shieldEvidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; });
    strict_1.default.ok(weaponEvidence);
    strict_1.default.equal(weaponEvidence.classification, 'exact-main-sub-equipment');
    strict_1.default.ok(shieldEvidence);
    strict_1.default.equal(shieldEvidence.classification, 'structurally-bound-equipment');
    strict_1.default.equal(shieldEvidence.reasonCode, 'STRUCTURAL_TRANSFORM_BONE_ANCESTRY');
    strict_1.default.deepEqual(new Set(shieldEvidence.matchedAncestorPointers.map(function (item) { return item.name; })), new Set(sharedBones.map(function (item) { return item.name; })));
    strict_1.default.deepEqual(shieldEvidence.bodyRendererReferences, []);
    strict_1.default.match(shieldEvidence.reason, /unique same-prefab equipment relation/);
    strict_1.default.match(shieldEvidence.evidence.join(' | '), /exact serialized pointer\(s\)/);
    strict_1.default.ok(shieldEvidence.evidence.includes('body m_Bones overlap: none; exact authored equipment m_Bones relation independently corroborates movement'));
    strict_1.default.equal(shieldEvidence.evidence.some(function (value) { return /^body m_Bones overlap: bone_/.test(value); }), false);
    strict_1.default.match(shieldEvidence.evidence.join(' | '), /unique non-conflicting same-prefab shared m_Bones relation/);
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.equal(profile.validation.valid, true, profile.validation.unresolved.join('; '));
});
(0, node_test_1.default)('keeps a Hoshino-shaped shield blocked when fewer than three m_Bones pointers are shared', function () {
    var fixture = makeCandidate('hoshino_shared_shield_two_bones_policy', ['Policy_Body']);
    var _a = addSharedBoneShieldRenderers(fixture, { sharedCount: 2 }), weapon = _a.weapon, shield = _a.shield;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('HoshinoTwoSharedBones'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [shield.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps a Hoshino-shaped shield blocked when one shared m_Bones pointer crosses prefabs', function () {
    var fixture = makeCandidate('hoshino_shared_shield_cross_prefab_policy', ['Policy_Body']);
    var _a = addSharedBoneShieldRenderers(fixture, { crossPrefabShared: true }), weapon = _a.weapon, shield = _a.shield;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('HoshinoCrossPrefabSharedBones'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [shield.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps a Hoshino-shaped shield blocked when body m_Bones claim a shared pointer', function () {
    var fixture = makeCandidate('hoshino_shared_shield_body_overlap_policy', ['Policy_Body']);
    var _a = addSharedBoneShieldRenderers(fixture, { bodyOverlap: true }), weapon = _a.weapon, shield = _a.shield;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('HoshinoBodySharedBone'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [shield.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps Hoshino-shaped shared m_Bones renderers blocked when the relation is accessory-ambiguous', function () {
    var fixture = makeCandidate('hoshino_shared_shield_competing_policy', ['Policy_Body']);
    var _a = addSharedBoneShieldRenderers(fixture, { competingRenderer: true }), weapon = _a.weapon, shield = _a.shield, competing = _a.competing;
    strict_1.default.ok(competing);
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('HoshinoCompetingSharedBones'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
    strict_1.default.deepEqual(profile.equipmentBindingEvidence.filter(function (item) {
        return [shield.sourceReference.objectId, competing.sourceReference.objectId].includes(item.sourceReference.objectId);
    }), []);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }).sort(), [
        shield.sourceReference.objectId, competing.sourceReference.objectId,
    ].sort());
});
(0, node_test_1.default)('does not promote a Hoshino-named renderer when only its display name says shield', function () {
    var _a;
    var fixture = makeCandidate('hoshino_named_shield_without_bone_role_policy', ['Policy_Body']);
    var _b = addSharedBoneShieldRenderers(fixture), weapon = _b.weapon, shield = _b.shield, sharedBones = _b.sharedBones;
    shield.renderer.rootBone.name = 'bone_AccRoot';
    var _loop_13 = function (pointer) {
        if (!sharedBones.some(function (shared) { return shared.pathId === pointer.pathId; }))
            pointer.name = 'bone_AccLocal';
    };
    for (var _i = 0, _c = (_a = shield.renderer.boneReferences) !== null && _a !== void 0 ? _a : []; _i < _c.length; _i++) {
        var pointer = _c[_i];
        _loop_13(pointer);
    }
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('HoshinoDisplayNameOnly'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [shield.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps a shared m_Bones shield blocked when its exact mesh pointer is changed', function () {
    var fixture = makeCandidate('hoshino_shared_shield_mesh_identity_policy', ['Policy_Body']);
    var _a = addSharedBoneShieldRenderers(fixture), weapon = _a.weapon, shield = _a.shield;
    shield.renderer.mesh = { file: 'CAB-policy-meshes', pathId: 'wrong-shield-mesh' };
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('HoshinoMeshIdentity'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [shield.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps a shared m_Bones shield blocked when its exact material or shader pointer changes', function () {
    var _loop_14 = function (mutation) {
        var fixture = makeCandidate("hoshino_shared_shield_".concat(mutation, "_identity_policy"), ['Policy_Body']);
        var _b = addSharedBoneShieldRenderers(fixture), weapon = _b.weapon, shield = _b.shield;
        if (mutation === 'material') {
            shield.renderer.materialSlots[0].material = { file: 'CAB-policy-materials', pathId: 'wrong-shield-material' };
        }
        else {
            var sourceMaterialReference_1 = shield.renderer.materialSlots[0].sourceMaterialReference;
            var sourceMaterial = fixture.candidate.sourceMaterials.find(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === sourceMaterialReference_1.objectId; });
            strict_1.default.ok(sourceMaterial);
            sourceMaterial.shader = { file: 'CAB-policy-shaders', pathId: 'wrong-shield-shader' };
        }
        var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)("Hoshino".concat(mutation, "Identity")));
        strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === weapon.sourceReference.objectId; }), true);
        strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; }), false);
        strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [shield.sourceReference.objectId]);
    };
    for (var _i = 0, _a = ['material', 'shader']; _i < _a.length; _i++) {
        var mutation = _a[_i];
        _loop_14(mutation);
    }
});
(0, node_test_1.default)('keeps structural equipment unresolved when equal names point at different source bones', function () {
    var fixture = makeCandidate('structural_same_name_pointer_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture);
    added.renderer.rootBone = __assign(__assign({}, added.anchor), { pathId: '999', name: added.anchor.name });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralSameName'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
    strict_1.default.match(profile.validation.unresolved.join(' '), /without an exact authored attachment relation/);
});
(0, node_test_1.default)('keeps structural equipment unresolved when transform ancestry does not match the selected prefab hierarchy', function () {
    var fixture = makeCandidate('structural_no_ancestry_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture);
    added.renderer.hierarchyPath = "".concat(fixture.candidate.assembly[0].root, "/FX_Local/Bip001_Weapon/").concat(added.renderer.name);
    added.renderer.transformChain = [
        { file: 'CAB-prefab', pathId: '1', name: fixture.candidate.assembly[0].root },
        { file: 'CAB-prefab', pathId: '2', name: 'Unrelated_Branch' },
        { file: 'CAB-prefab', pathId: '20', name: added.renderer.name },
    ];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralNoAncestry'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
});
(0, node_test_1.default)('does not cross-bind a private/public turret renderer to the selected prefab skeleton', function () {
    var fixture = makeCandidate('structural_private_public_turret_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture, {
        name: 'Utaha_Original_Turret',
        rootBranch: 'Character_Robot/Turret',
        sourceReference: reference(hash('p'), 'CAB-prefab', '600002'),
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralPrivatePublic'));
    strict_1.default.equal(profile.equipmentBindingEvidence.some(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.coreRendererBlockers.map(function (item) { return item.sourceReference.objectId; }), [added.sourceReference.objectId]);
});
(0, node_test_1.default)('keeps a source-hierarchical weapon structural when its weapon bones have zero body m_Bones overlap', function () {
    var fixture = makeCandidate('structural_zero_body_overlap_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture);
    added.body.boneReferences = [{ file: 'CAB-prefab', pathId: '777', name: 'Bip001_Weapon' }];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralZeroOverlap'));
    var evidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; });
    strict_1.default.ok(evidence);
    strict_1.default.equal(evidence.classification, 'structurally-bound-equipment');
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.match(evidence.evidence.join(' | '), /body m_Bones overlap: none/);
});
(0, node_test_1.default)('prefers the exact equipmentRendererReferences classification over structural evidence', function () {
    var fixture = makeCandidate('structural_exact_slot_preference_policy', ['Policy_Body']);
    var added = addStructuralEquipmentRenderer(fixture);
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.equipmentRendererReferences = [added.sourceReference];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('StructuralExactSlot'));
    var evidence = profile.equipmentBindingEvidence.find(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; });
    strict_1.default.ok(evidence);
    strict_1.default.equal(evidence.classification, 'exact-equipment-renderer');
    strict_1.default.equal(evidence.reasonCode, 'EXACT_EQUIPMENT_RENDERER_REFERENCE');
    strict_1.default.equal(profile.equipmentBindingEvidence.filter(function (item) { return item.sourceReference.objectId === added.sourceReference.objectId; }).length, 1);
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
});
(0, node_test_1.default)('does not misclassify presentation FX, halos, bags, props, or no-weapon bodies as equipment blockers', function () {
    var fixture = makeCandidate('equipment_false_positive_policy', ['NoWeapon_Body']);
    var fx = addPolicyRenderer(fixture, {
        name: 'FX_Weapon_Glow',
        hierarchyPath: 'Cafe_False_Positive/FX_Camera/FX_Weapon_Glow',
        materialName: 'FX_Weapon_Glow',
        shaderName: 'DSFX/FX_SHADER_Unsupported',
        mesh: { file: inventory_1.UNITY_BUILTIN_RESOURCES_FILE, pathId: inventory_1.UNITY_BUILTIN_QUAD_PATH_ID },
    });
    var halo = addPolicyRenderer(fixture, {
        name: 'Character_Halo',
        hierarchyPath: 'Cafe_False_Positive/HaloRoot/Character_Halo',
        materialName: 'Character_Halo',
        shaderName: 'MXCharacterHaloTex',
    });
    var bag = addPolicyRenderer(fixture, {
        name: 'Handbag_Outline',
        hierarchyPath: 'Cafe_False_Positive/Accessory/Handbag_Outline',
        materialName: 'Handbag_Outline',
        shaderName: 'MX/C-General',
    });
    var prop = addPolicyRenderer(fixture, {
        name: 'SkillProp',
        hierarchyPath: 'Cafe_False_Positive/Skill/SkillProp',
        materialName: 'SkillProp',
        shaderName: 'MX/C-General',
    });
    var weakWeapon = addPolicyRenderer(fixture, {
        name: 'Weapon_Unresolved',
        hierarchyPath: 'Cafe_False_Positive/Unknown/Weapon_Unresolved',
        materialName: 'Weapon_Unresolved_Material',
        shaderName: 'MX/C-Weapon',
    });
    weakWeapon.renderer.meshSourceReference = null;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('FalsePositive'));
    strict_1.default.deepEqual(profile.coreRendererBlockers, []);
    strict_1.default.deepEqual(profile.excludedRenderers.map(function (item) { return item.sourceReference.objectId; }), [fx.sourceReference.objectId]);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === halo.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === bag.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === prop.sourceReference.objectId; }), true);
    strict_1.default.match(profile.validation.unresolved.join(' '), /ambiguous source mesh reference/);
});
(0, node_test_1.default)('excludes exact shield/phone presentation children while retaining cut-in body core', function () {
    var fixture = makeCandidate('attached_policy_fixture', ['Attached_Body']);
    addPolicyRenderer(fixture, {
        name: 'Logo',
        hierarchyPath: 'Cafe_Attached/bone_root/bone_shield_root/Point014/FX_Attached_Ex01_Logo_01/Logo',
    });
    addPolicyRenderer(fixture, {
        name: 'Light',
        hierarchyPath: 'Cafe_Attached/bone_Smartphone/FX_Attached_Phone_Light_Mesh/Light',
    });
    addPolicyRenderer(fixture, {
        name: 'CH0123_CutIn_Body',
        hierarchyPath: 'Cafe_Attached/EX_Root/CH0123_CutIn_Cam/Camera001/CH0123_CutIn_Body',
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('Attached'));
    strict_1.default.deepEqual(profile.excludedRenderers.map(function (renderer) { return renderer.name; }), ['Logo', 'Light']);
    strict_1.default.deepEqual(profile.renderers.map(function (renderer) { return renderer.name; }), ['Attached_Policy_Fixture_Body', 'CH0123_CutIn_Body']);
    strict_1.default.equal(profile.validation.valid, false);
    strict_1.default.match(profile.validation.unresolved.join(' '), /Unsupported source shader DSFX\/FX_SHADER_Unsupported/);
});
(0, node_test_1.default)('does not let a legacy equipment name promote a same-name renderer with a different exact reference', function () {
    var fixture = makeCandidate('same_name_equipment_policy', ['Policy_Body']);
    var actual = addPolicyRenderer(fixture, {
        name: 'Shared_Weapon',
        hierarchyPath: 'Cafe_Same_Name/Core/Shared_Weapon',
        equipmentReference: true,
    });
    var decoy = addPolicyRenderer(fixture, {
        name: 'Shared_Weapon',
        hierarchyPath: 'Cafe_Same_Name/FX_Camera/Shared_Weapon',
    });
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.equipmentRenderers = ['Shared_Weapon'];
    attachments.equipmentRendererReferences = [actual.sourceReference];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('SameName'));
    strict_1.default.equal(profile.renderers.some(function (renderer) { var _a; return ((_a = renderer.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === actual.sourceReference.objectId; }), true);
    strict_1.default.deepEqual(profile.excludedRenderers.map(function (renderer) { return renderer.sourceReference.objectId; }), [decoy.sourceReference.objectId]);
});
(0, node_test_1.default)('does not use a root-bone name when the exact serialized root-bone pointer collides', function () {
    var fixture = makeCandidate('root_bone_collision_policy', ['Policy_Body']);
    var renderer = addPolicyRenderer(fixture, {
        name: 'WeaponBoneEffect',
        hierarchyPath: 'Cafe_Root_Bone/FX_Camera/WeaponBoneEffect',
    }).renderer;
    renderer.rootBone = {
        file: 'CAB-policy-bones', pathId: '200', name: 'SharedWeaponBone',
        sourceReference: reference(hash('r'), 'CAB-policy-bones', '200'),
    };
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.mainWeapon = [{
            file: 'CAB-policy-bones', pathId: '200', name: 'SharedWeaponBone',
            sourceReference: reference(hash('s'), 'CAB-policy-bones', '200'),
        }];
    attachments.equipmentRenderers = ['WeaponBoneEffect'];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('RootBone'));
    strict_1.default.deepEqual(profile.excludedRenderers.map(function (item) { return item.sourceReference.objectId; }), [renderer.sourceReference.objectId]);
});
(0, node_test_1.default)('fails closed when a presentation renderer has an unknown mixed material slot', function () {
    var fixture = makeCandidate('mixed_slot_policy', ['Policy_Body']);
    var renderer = addPolicyRenderer(fixture, {
        name: 'FX_Mixed_Slots',
        hierarchyPath: 'Cafe_Mixed/FX_Camera/FX_Mixed_Slots',
    }).renderer;
    var unknownMaterialReference = reference(hash('u'), 'CAB-unknown-materials', '999');
    renderer.materialSlots.push({
        slot: 1,
        material: { file: unknownMaterialReference.serializedFile, pathId: unknownMaterialReference.objectId },
        sourceMaterialReference: unknownMaterialReference,
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('Mixed'));
    strict_1.default.equal(profile.excludedRenderers.length, 0);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === renderer.sourceReference.objectId; }), true);
    strict_1.default.match(profile.validation.unresolved.join(' '), /material .* is missing from the candidate closure/);
});
(0, node_test_1.default)('protects exact mouth and eye bindings before presentation classification', function () {
    var fixture = makeCandidate('binding_policy', ['Policy_Body']);
    var mouth = addPolicyRenderer(fixture, {
        name: 'Mouth_CutIn_Body',
        hierarchyPath: 'Cafe_Binding/Ex_Root/Cutin_Cam/Mouth_CutIn_Body',
    });
    var eyes = addPolicyRenderer(fixture, {
        name: 'FX_Eye_Binding',
        hierarchyPath: 'Cafe_Binding/FX_Camera/FX_Eye_Binding',
    });
    var attachments = fixture.candidate.assembly[0].attachments;
    attachments.mouthRenderer = [{ file: mouth.sourceReference.serializedFile, pathId: mouth.sourceReference.objectId, sourceReference: mouth.sourceReference }];
    attachments.mouthMaterialIndex = 0;
    attachments.eyes = [{ file: eyes.sourceReference.serializedFile, pathId: eyes.sourceReference.objectId, sourceReference: eyes.sourceReference }];
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('Binding'));
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === mouth.sourceReference.objectId; }), false);
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === eyes.sourceReference.objectId; }), false);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === mouth.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === eyes.sourceReference.objectId; }), true);
});
(0, node_test_1.default)('protects a mouth renderer from its exact sourceRendererReference metadata', function () {
    var fixture = makeCandidate('metadata_binding_policy', ['Policy_Body']);
    var mouth = addPolicyRenderer(fixture, {
        name: 'CH0123_CutIn_Body',
        hierarchyPath: 'Cafe_Metadata/FX_Cutin_Cam/CH0123_CutIn_Body',
    });
    var attachments = fixture.candidate.assembly[0].attachments;
    delete attachments.mouthRenderer;
    attachments.mouthMetadata = [{
            renderer: { file: mouth.sourceReference.serializedFile, pathId: mouth.sourceReference.objectId },
            sourceRendererReference: mouth.sourceReference,
            materialIndex: 0,
        }];
    attachments.mouthMaterialIndex = 0;
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('Metadata'));
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === mouth.sourceReference.objectId; }), false);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === mouth.sourceReference.objectId; }), true);
});
(0, node_test_1.default)('keeps exact core names, halo shader evidence, and equipment beside excluded children', function () {
    var fixture = makeCandidate('exact_core_policy', ['Policy_Body']);
    var shield = addPolicyRenderer(fixture, {
        name: 'Hoshino_Original_Shield_Weapon',
        hierarchyPath: 'Cafe_Exact_Core/Shield/Hoshino_Original_Shield_Weapon',
        equipmentReference: true,
    });
    var logo = addPolicyRenderer(fixture, {
        name: 'Logo (1)',
        hierarchyPath: 'Cafe_Exact_Core/bone_shield_root/FX_Attached_Ex01_Logo_01/Logo (1)',
    });
    var phone = addPolicyRenderer(fixture, {
        name: 'Miyako_Original_Smartphone_Outline',
        hierarchyPath: 'Cafe_Exact_Core/Phone/Miyako_Original_Smartphone_Outline',
        equipmentReference: true,
    });
    var light = addPolicyRenderer(fixture, {
        name: 'Light',
        hierarchyPath: 'Cafe_Exact_Core/bone_Smartphone/FX_Attached_Phone_Light_Mesh/Light',
    });
    var halo = addPolicyRenderer(fixture, {
        name: 'Character_Halo',
        hierarchyPath: 'Cafe_Exact_Core/HaloRoot/Character_Halo',
        shaderName: 'MXCharacterHaloTex',
        materialName: 'Character_Halo',
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('ExactCore'));
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === shield.sourceReference.objectId; }), false);
    strict_1.default.equal(profile.excludedRenderers.some(function (item) { return item.sourceReference.objectId === phone.sourceReference.objectId; }), false);
    strict_1.default.deepEqual(profile.excludedRenderers.map(function (item) { return item.sourceReference.objectId; }), [logo.sourceReference.objectId, light.sourceReference.objectId]);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === halo.sourceReference.objectId; }), true);
});
(0, node_test_1.default)('keeps explicitly authored Aris weapon and cut-in body core even under FX branches', function () {
    var fixture = makeCandidate('exact_named_core_policy', ['Policy_Body']);
    var weapon = addPolicyRenderer(fixture, {
        name: 'FX_Aris_Original_Weapon',
        hierarchyPath: 'Cafe_Aris/FX_Weapon_Camera/FX_Aris_Original_Weapon',
    });
    var body = addPolicyRenderer(fixture, {
        name: 'CH0123_CutIn_Body',
        hierarchyPath: 'Cafe_Aris/CH0123_CutIn_Cam/CH0123_CutIn_Body',
    });
    var profile = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('NamedCore'));
    strict_1.default.equal(profile.excludedRenderers.length, 0);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === weapon.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.renderers.some(function (item) { var _a; return ((_a = item.sourceReference) === null || _a === void 0 ? void 0 : _a.objectId) === body.sourceReference.objectId; }), true);
    strict_1.default.equal(profile.validation.valid, false);
});
(0, node_test_1.default)('records exact presentation child-renderer events but blocks unresolved targets', function () {
    var fixture = makeCandidate('event_policy_fixture', ['Event_Body']);
    var candidate = fixture.candidate, prefabPath = fixture.prefabPath;
    var fx = addPolicyRenderer(fixture, {
        name: 'FX_Focus',
        hierarchyPath: 'Cafe_Event/EX_Root/Event_Exs_Cutin_Cam/Camera001/FX_Focus',
    });
    var clip = 'Event_Fixture_Cafe_Idle';
    var interaction = (0, types_1.emptyChibiProfile)('Event');
    interaction.initialPose = clip;
    interaction.interactions.idle = { state: 'available', clip: clip, loop: true, hold: false };
    candidate.events = [{
            clip: clip,
            time: 0.5, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 3,
            targetReference: fx.sourceReference,
        }];
    var excludedEventProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, interaction);
    strict_1.default.equal(excludedEventProfile.validation.valid, true, excludedEventProfile.validation.unresolved.join('; '));
    strict_1.default.deepEqual(excludedEventProfile.childRendererEvents, []);
    strict_1.default.equal(excludedEventProfile.excludedChildRendererEvents.length, 1);
    strict_1.default.equal(excludedEventProfile.excludedChildRendererEvents[0].reasonCode, 'PRESENTATION_CHILD_RENDERER_EVENT');
    candidate.events = [{ clip: clip, time: 0.5, function: 'AniEvt_DisableChildRenderer', string: '', float: 0, int: 3 }];
    var unresolvedProfile = (0, rendering_profile_1.buildChibiRenderingProfile)(candidate, prefabPath, interaction);
    strict_1.default.equal(unresolvedProfile.excludedChildRendererEvents.length, 0);
    strict_1.default.equal(unresolvedProfile.validation.valid, false);
    strict_1.default.match(unresolvedProfile.validation.unresolved.join(' '), /no exact source renderer-ID binding/);
});
(0, node_test_1.default)('orders exclusion diagnostics deterministically and covers audited presentation evidence patterns', function () {
    var patterns = [
        ['Logo (1)', 'Cafe_Audit/FX_Hoshino_Ex01_Logo_01/Logo (1)'],
        ['glitch', 'Cafe_Audit/Ex_Root/Audit_Original_Cam/Camera/glitch'],
        ['BG_White (1)', 'Cafe_Audit/EX_Root/Audit_Exs_Cutin_Cam/Camera001/BG_White (1)'],
        ['FX_Focus', 'Cafe_Audit/EX_Root/Audit_Exs_Cutin_Cam/Camera001/FX_Focus'],
        ['FX_CH0124_Cam_Screen', 'Cafe_Audit/EX_Root/Audit_Exs_Cutin_Cam/Camera001/FX_CH0124_Cam_Screen'],
        ['Butterfly', 'Cafe_Audit/bone_root/FX_Audit_Pickup/FX_Audit_Pickup_Butterfly/Butterfly'],
        ['plane', 'Cafe_Audit/Ex_Root/Audit_Original_Exs_Cam/Camera001/plane'],
        ['FX_MESH_Flower_01', 'Cafe_Audit/Ex_Root/FX_Local_DM/Flower_AnimPos/Flower_01/FX_MESH_Flower_01'],
    ];
    var fixture = makeCandidate('audit_policy_fixture', ['Audit_Body']);
    for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
        var _a = patterns_1[_i], name_7 = _a[0], hierarchyPath = _a[1];
        addPolicyRenderer(fixture, { name: name_7, hierarchyPath: hierarchyPath });
    }
    var first = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('Audit'));
    var second = (0, rendering_profile_1.buildChibiRenderingProfile)(fixture.candidate, fixture.prefabPath, (0, types_1.emptyChibiProfile)('Audit'));
    strict_1.default.equal(first.validation.valid, true, first.validation.unresolved.join('; '));
    strict_1.default.equal(first.excludedRenderers.length, patterns.length);
    strict_1.default.deepEqual(first.excludedRenderers, second.excludedRenderers);
    strict_1.default.deepEqual(first.excludedChildRendererEvents, second.excludedChildRendererEvents);
    strict_1.default.deepEqual(first.excludedRenderers.map(function (item) { return (0, rendering_profile_1.sourceObjectKey)(item.sourceReference); }), __spreadArray([], first.excludedRenderers.map(function (item) { return (0, rendering_profile_1.sourceObjectKey)(item.sourceReference); }).sort(), true));
});
